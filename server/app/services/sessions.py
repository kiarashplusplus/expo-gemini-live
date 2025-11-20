"""Session lifecycle management utilities."""

from __future__ import annotations

import asyncio
import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional

from fastapi import HTTPException, status

from ..config import Settings
from ..models import (
    RoomInfo,
    RTVIInfo,
    SessionStatus,
    SessionSummary,
    StartSessionRequest,
    StartSessionResponse,
)
from .bot import BotSessionConfig, PipecatBotRunner
from .daily import DailyService, RoomCredentials

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class SessionRecord:
    """Tracks runtime metadata for an active session."""

    session_id: str
    room: RoomCredentials
    token: str
    created_at: datetime
    expires_at: datetime
    status: SessionStatus = SessionStatus.PENDING
    metadata: Dict[str, object] = field(default_factory=dict)
    user_name: str | None = None
    task: asyncio.Task | None = None
    room_released: bool = False


class SessionManager:
    """Coordinates Daily provisioning, Pipecat runners, and cleanup."""

    def __init__(
        self,
        settings: Settings,
        daily_service: DailyService,
        bot_runner: PipecatBotRunner,
    ) -> None:
        self._settings = settings
        self._daily = daily_service
        self._bot_runner = bot_runner
        self._sessions: Dict[str, SessionRecord] = {}
        self._lock = asyncio.Lock()
        self._cleanup_task: asyncio.Task | None = None

    def start_background_tasks(self) -> None:
        if not self._cleanup_task:
            self._cleanup_task = asyncio.create_task(self._cleanup_loop(), name="session-cleanup")

    async def shutdown(self) -> None:
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:  # pragma: no cover - expected on shutdown
                pass
            self._cleanup_task = None

        sessions = list(self._sessions.values())
        for record in sessions:
            await self.stop_session(record.session_id)

    async def start_session(self, payload: StartSessionRequest) -> StartSessionResponse:
        async with self._lock:
            room = await self._daily.prepare_room(payload)
            session_id = uuid.uuid4().hex
            now = datetime.now(timezone.utc)
            expires = now + timedelta(seconds=self._settings.session_ttl_seconds)
            record = SessionRecord(
                session_id=session_id,
                room=room,
                token=room.token,
                created_at=now,
                expires_at=expires,
                status=SessionStatus.ACTIVE,
                metadata=payload.metadata or {},
                user_name=payload.user.name if payload.user else None,
            )
            self._sessions[session_id] = record

            config = BotSessionConfig(
                session_id=session_id,
                room_url=room.room_url,
                token=room.token,
                metadata=record.metadata,
                user_name=record.user_name,
            )
            record.task = self._bot_runner.build_task(config)
            if record.task:
                record.task.add_done_callback(lambda _: self._mark_completed(session_id))

        return self._build_start_response(record)

    async def stop_session(self, session_id: str) -> SessionSummary:
        record = self._sessions.get(session_id)
        if not record:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Session not found")

        task = record.task
        if task and not task.done():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

        record.status = SessionStatus.STOPPED
        await self._daily.release_room(record.room.room_url)
        record.room_released = True
        summary = self._to_summary(record)
        self._sessions.pop(session_id, None)
        return summary

    def get_session(self, session_id: str) -> SessionSummary:
        record = self._sessions.get(session_id)
        if not record:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Session not found")
        return self._to_summary(record)

    async def _cleanup_loop(self) -> None:
        while True:
            try:
                await asyncio.sleep(self._settings.cleanup_interval_seconds)
                await self._purge_expired()
            except asyncio.CancelledError:  # pragma: no cover - shutdown path
                break
            except Exception as exc:  # pragma: no cover - diagnostic only
                logger.exception("Session cleanup loop errored: %s", exc)

    async def _purge_expired(self) -> None:
        now = datetime.now(timezone.utc)
        expired = [s_id for s_id, rec in self._sessions.items() if rec.expires_at <= now]
        for session_id in expired:
            record = self._sessions.get(session_id)
            if not record:
                continue
            logger.info("Session %s expired; stopping", session_id)
            await self.stop_session(session_id)

    def _mark_completed(self, session_id: str) -> None:
        record = self._sessions.get(session_id)
        if not record or record.status in (SessionStatus.STOPPED, SessionStatus.ERROR):
            return
        record.status = SessionStatus.STOPPED
        if not record.room_released:
            record.room_released = True
            asyncio.create_task(self._daily.release_room(record.room.room_url))

    def _build_start_response(self, record: SessionRecord) -> StartSessionResponse:
        room = RoomInfo(url=record.room.room_url, name=record.room.room_name)
        rtvi = RTVIInfo(
            startEndpoint=f"{self._settings.api_prefix}/rtvi/start",
            wsEndpoint=None,
        )
        return StartSessionResponse(
            sessionId=record.session_id,
            room=room,
            token=record.token,
            dailyRoom=record.room.room_url,
            dailyToken=record.token,
            room_url=record.room.room_url,
            expiresAt=record.expires_at,
            rtvi=rtvi,
        )

    def _to_summary(self, record: SessionRecord) -> SessionSummary:
        return SessionSummary(
            sessionId=record.session_id,
            status=record.status,
            room=RoomInfo(url=record.room.room_url, name=record.room.room_name),
            token=record.token,
            createdAt=record.created_at,
            expiresAt=record.expires_at,
            metadata=record.metadata or None,
        )
