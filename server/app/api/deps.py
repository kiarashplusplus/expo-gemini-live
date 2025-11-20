"""FastAPI dependencies for shared state."""

from __future__ import annotations

from fastapi import Request

from ..config import Settings, get_settings
from ..services.sessions import SessionManager


def get_settings_dep() -> Settings:
    return get_settings()


def get_session_manager(request: Request) -> SessionManager:
    manager: SessionManager = request.app.state.session_manager
    return manager
