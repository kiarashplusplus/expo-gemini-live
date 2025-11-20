"""FastAPI application entrypoint."""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Any, AsyncIterator

import aiohttp
import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from .api.routes import router as rtvi_router
from .config import Settings, get_settings
from .services.bot import PipecatBotRunner
from .services.daily import DailyService
from .services.sessions import SessionManager


def _build_error_payload(detail: Any, status_code: int, default_error: str = "request-error") -> dict[str, Any]:
    """Normalize error payloads so clients always see error/info fields."""

    error_code = default_error
    info: Any = None
    extra: dict[str, Any] = {}

    if isinstance(detail, dict):
        error_code = str(detail.get("error") or default_error)
        info = detail.get("info") or detail.get("detail")
        extra = {k: v for k, v in detail.items() if k not in {"error", "info"}}
    elif isinstance(detail, list):
        info = detail
    elif detail is not None:
        info = detail

    if info is None:
        info = "Request failed"
    elif isinstance(info, str):
        info = info.strip() or "Request failed"

    payload: dict[str, Any] = {"error": error_code, "info": info, "status": status_code}
    if extra:
        payload.update(extra)
    return payload


def _build_lifespan(settings: Settings):
    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        http_session = aiohttp.ClientSession()
        daily_service = DailyService(settings, http_session)
        bot_runner = PipecatBotRunner(settings)
        session_manager = SessionManager(settings, daily_service, bot_runner)
        session_manager.start_background_tasks()

        app.state.http_session = http_session
        app.state.daily_service = daily_service
        app.state.session_manager = session_manager

        try:
            yield
        finally:
            await session_manager.shutdown()
            await http_session.close()

    return lifespan


def create_app(override_settings: Settings | None = None) -> FastAPI:
    settings = override_settings or get_settings()
    app = FastAPI(title="Pipecat Gemini Live Server", lifespan=_build_lifespan(settings))

    logger = logging.getLogger("pipecat.api")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.cors_origins),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(rtvi_router, prefix=settings.api_prefix)

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request, exc: HTTPException):
        logger.error(
            "Request failed for %s %s: status=%s detail=%s",
            request.method,
            request.url,
            exc.status_code,
            exc.detail,
        )
        content = _build_error_payload(exc.detail, exc.status_code)
        return JSONResponse(status_code=exc.status_code, content=content)

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request, exc: RequestValidationError):
        errors = exc.errors()
        for item in errors:
            raw_input = item.get("input")
            if isinstance(raw_input, bytes):
                item["input"] = raw_input.decode("utf-8", errors="replace")
        logger.error(
            "Request validation failed for %s %s: errors=%s",
            request.method,
            request.url,
            errors,
        )
        content = _build_error_payload(errors, status_code=422, default_error="validation-error")
        return JSONResponse(status_code=422, content=content)

    @app.middleware("http")
    async def log_start_payload(request, call_next):  # type: ignore[override]
        if request.url.path == f"{settings.api_prefix}/rtvi/start":
            body_bytes = await request.body()
            preview = body_bytes.decode("utf-8", errors="replace")[:2000]
            logger.warning(
                "Received /rtvi/start payload (content-type=%s): %s",
                request.headers.get("content-type"),
                preview,
            )
        response = await call_next(request)
        return response

    @app.get("/health", tags=["system"])
    async def health_check() -> dict[str, str]:
        """Simple readiness endpoint."""

        return {"status": "ok"}

    return app


app = create_app()
