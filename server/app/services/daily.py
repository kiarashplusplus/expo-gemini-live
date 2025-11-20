"""Wrapper utilities around Daily's REST API."""

from __future__ import annotations

import asyncio
import logging
import secrets
import string
from dataclasses import dataclass
from typing import Any, Dict
from urllib.parse import urlparse

import aiohttp
from fastapi import HTTPException, status

from pipecat.transports.daily.utils import (
    DailyMeetingTokenParams,
    DailyMeetingTokenProperties,
    DailyRESTHelper,
    DailyRoomObject,
    DailyRoomParams,
    DailyRoomProperties,
)

from ..config import Settings
from ..models import StartSessionRequest

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class RoomCredentials:
    """Daily room metadata returned to callers."""

    room_url: str
    room_name: str
    token: str


class DailyService:
    """High-level helper that manages Daily rooms and meeting tokens."""

    def __init__(self, settings: Settings, http_session: aiohttp.ClientSession):
        self._settings = settings
        self._http_session = http_session
        self._helper: DailyRESTHelper | None = None
        if not settings.use_mock_daily:
            self._helper = DailyRESTHelper(
                daily_api_key=settings.daily_api_key or "",
                daily_api_url=settings.daily_api_url,
                aiohttp_session=http_session,
            )
        self._lock = asyncio.Lock()

    async def prepare_room(self, payload: StartSessionRequest) -> RoomCredentials:
        """Ensure we have a room + token ready for a session."""

        if payload.room_url:
            return await self._use_existing_room(str(payload.room_url), payload)

        if not payload.create_daily_room:
            fallback = self._settings.daily_sample_room_url
            if fallback:
                logger.info("Using DAILY_SAMPLE_ROOM_URL for session")
                return await self._use_existing_room(fallback, payload)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "room-url-missing",
                    "info": "roomUrl is required when createDailyRoom is false",
                },
            )

        if self._settings.use_mock_daily:
            return self._mock_room()

        return await self._create_room(payload)

    async def release_room(self, room_url: str) -> None:
        """Delete an ephemeral room when the session completes."""

        if self._settings.use_mock_daily:
            return

        helper = self._helper
        if not helper:
            return

        try:
            await helper.delete_room_by_url(room_url)
        except Exception as exc:  # pragma: no cover - informational only
            logger.warning("Failed to delete Daily room %s: %s", room_url, exc)

    async def _use_existing_room(self, room_url: str, payload: StartSessionRequest) -> RoomCredentials:
        token = await self._issue_token(room_url, payload.daily_meeting_token_properties)
        name = self._extract_room_name(room_url)
        return RoomCredentials(room_url=room_url, room_name=name, token=token)

    async def _create_room(self, payload: StartSessionRequest) -> RoomCredentials:
        helper = self._helper
        if not helper:
            raise HTTPException(
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={
                    "error": "daily-helper-missing",
                    "info": "Daily helper not configured",
                },
            )

        async with self._lock:
            try:
                room_properties = (
                    DailyRoomProperties(**payload.daily_room_properties)
                    if payload.daily_room_properties
                    else DailyRoomProperties()
                )
                room_obj: DailyRoomObject = await helper.create_room(
                    DailyRoomParams(properties=room_properties)
                )
            except Exception as exc:  # pragma: no cover - network failure
                logger.exception("Unable to create Daily room")
                raise HTTPException(
                    status.HTTP_502_BAD_GATEWAY,
                    detail={
                        "error": "daily-room-error",
                        "info": f"Daily room creation failed: {exc}",
                    },
                ) from exc

        token = await self._issue_token(str(room_obj.url), payload.daily_meeting_token_properties)
        return RoomCredentials(room_url=str(room_obj.url), room_name=room_obj.name, token=token)

    async def _issue_token(
        self, room_url: str, overrides: Dict[str, Any] | None
    ) -> str:
        if self._settings.use_mock_daily:
            return self._generate_fake_token()

        helper = self._helper
        if not helper:
            raise HTTPException(
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={
                    "error": "daily-helper-missing",
                    "info": "Daily helper not available",
                },
            )

        expiry_seconds = self._settings.daily_token_exp_minutes * 60
        params = None
        if overrides:
            try:
                params = DailyMeetingTokenParams(
                    properties=DailyMeetingTokenProperties(**overrides)
                )
            except Exception as exc:
                raise HTTPException(
                    status.HTTP_400_BAD_REQUEST,
                    detail={
                        "error": "invalid-token-properties",
                        "info": f"Invalid dailyMeetingTokenProperties payload: {exc}",
                    },
                ) from exc

        try:
            return await helper.get_token(room_url, expiry_time=expiry_seconds, params=params)
        except Exception as exc:  # pragma: no cover - network failure
            message = str(exc)
            if "exp was" in message and "in the past" in message:
                fallback_expiry = max(expiry_seconds + 600, 600)
                logger.warning(
                    "Daily token expiration rejected (likely clock skew). Retrying with %s-second expiry",
                    fallback_expiry,
                )
                try:
                    return await helper.get_token(room_url, expiry_time=fallback_expiry, params=params)
                except Exception as retry_exc:  # pragma: no cover - network failure
                    logger.exception("Daily token retry after clock-skew hint also failed")
                    raise HTTPException(
                        status.HTTP_502_BAD_GATEWAY,
                        detail={
                            "error": "daily-token-error",
                            "info": "Daily token creation failed even after retry. Please verify system clock and DAILY_TOKEN_EXP_MINUTES.",
                        },
                    ) from retry_exc

            logger.exception("Unable to create Daily meeting token")
            raise HTTPException(
                status.HTTP_502_BAD_GATEWAY,
                detail={
                    "error": "daily-token-error",
                    "info": f"Daily token creation failed: {exc}",
                },
            ) from exc

    def _extract_room_name(self, room_url: str) -> str:
        if self._helper and not self._settings.use_mock_daily:
            try:
                return self._helper.get_name_from_url(room_url)
            except Exception:
                pass
        parsed = urlparse(room_url)
        return parsed.path.strip("/") or "room"

    def _mock_room(self) -> RoomCredentials:
        suffix = "".join(secrets.choice(string.ascii_lowercase) for _ in range(6))
        room_url = f"https://mock.daily.co/{suffix}"
        token = self._generate_fake_token()
        return RoomCredentials(room_url=room_url, room_name=suffix, token=token)

    @staticmethod
    def _generate_fake_token() -> str:
        return secrets.token_urlsafe(32)
