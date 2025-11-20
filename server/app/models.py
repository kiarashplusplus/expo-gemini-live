"""Shared Pydantic models for the Pipecat backend."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict, Field, HttpUrl


class SessionUser(BaseModel):
    """Minimal information about the end user joining an RTVI session."""

    model_config = ConfigDict(populate_by_name=True)

    id: str | None = Field(default=None, alias="id")
    name: str | None = Field(default=None, alias="name")
    locale: str | None = Field(default=None, alias="locale")


class StartSessionRequest(BaseModel):
    """Request payload accepted at /api/rtvi/start."""

    model_config = ConfigDict(populate_by_name=True)

    create_daily_room: bool = Field(default=True, alias="createDailyRoom")
    room_url: HttpUrl | None = Field(default=None, alias="roomUrl")
    daily_room_properties: Dict[str, Any] | None = Field(default=None, alias="dailyRoomProperties")
    daily_meeting_token_properties: Dict[str, Any] | None = Field(
        default=None, alias="dailyMeetingTokenProperties"
    )
    user: SessionUser | None = None
    metadata: Dict[str, Any] | None = None


class SessionStatus(str, Enum):
    """Lifecycle states tracked for RTVI sessions."""

    PENDING = "pending"
    ACTIVE = "active"
    STOPPED = "stopped"
    ERROR = "error"


class RTVIInfo(BaseModel):
    """Endpoints returned to the client for RTVI interactions."""

    start_endpoint: str = Field(alias="startEndpoint")
    websocket_endpoint: str | None = Field(default=None, alias="wsEndpoint")


class RoomInfo(BaseModel):
    """Minimal metadata about a Daily room."""

    url: HttpUrl
    name: str


class PipelineDiagnostics(BaseModel):
    """Surface server-side pipeline configuration to clients for debugging."""

    model: str
    video_pipeline_enabled: bool = Field(alias="videoPipelineEnabled")


class StartSessionResponse(BaseModel):
    """Successful response from /api/rtvi/start."""

    session_id: str = Field(alias="sessionId")
    room: RoomInfo
    token: str
    daily_room: HttpUrl = Field(alias="dailyRoom")
    daily_token: str = Field(alias="dailyToken")
    room_url_compat: HttpUrl = Field(alias="room_url")
    expires_at: datetime = Field(alias="expiresAt")
    rtvi: RTVIInfo
    pipeline: PipelineDiagnostics


class SessionSummary(BaseModel):
    """Snapshot of a session's current state."""

    session_id: str = Field(alias="sessionId")
    status: SessionStatus
    room: RoomInfo
    token: str
    created_at: datetime = Field(alias="createdAt")
    expires_at: datetime = Field(alias="expiresAt")
    metadata: Dict[str, Any] | None = None


class StopSessionResponse(BaseModel):
    """Response returned when a session is stopped."""

    session: SessionSummary


class ErrorResponse(BaseModel):
    """Generic error message payload."""

    detail: str
