"""HTTP routes for the RTVI backend."""

from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import ValidationError

from ..models import (
    ErrorResponse,
    SessionSummary,
    StartSessionRequest,
    StartSessionResponse,
    StopSessionResponse,
)
from ..services.sessions import SessionManager
from .deps import get_session_manager

router = APIRouter(prefix="/rtvi", tags=["rtvi"])


@router.post(
    "/start",
    response_model=StartSessionResponse,
    status_code=status.HTTP_201_CREATED,
    responses={status.HTTP_400_BAD_REQUEST: {"model": ErrorResponse}},
)
async def start_session(
    request: Request,
    sessions: SessionManager = Depends(get_session_manager),
) -> StartSessionResponse:
    """Provision Daily credentials and kick off a Pipecat session."""

    try:
        raw_body = await request.body()
        data = json.loads(raw_body.decode("utf-8") or "{}")
    except json.JSONDecodeError as exc:  # pragma: no cover - defensive
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    try:
        payload = StartSessionRequest.model_validate(data)
    except ValidationError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=json.loads(exc.json())) from exc

    return await sessions.start_session(payload)


@router.post(
    "/{session_id}/stop",
    response_model=StopSessionResponse,
    responses={status.HTTP_404_NOT_FOUND: {"model": ErrorResponse}},
)
async def stop_session(
    session_id: str,
    sessions: SessionManager = Depends(get_session_manager),
) -> StopSessionResponse:
    """Stop a running session and release resources."""

    summary = await sessions.stop_session(session_id)
    return StopSessionResponse(session=summary)


@router.get(
    "/{session_id}",
    response_model=SessionSummary,
    responses={status.HTTP_404_NOT_FOUND: {"model": ErrorResponse}},
)
async def get_session(
    session_id: str,
    sessions: SessionManager = Depends(get_session_manager),
) -> SessionSummary:
    """Return the current state of a session."""

    return sessions.get_session(session_id)
