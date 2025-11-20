"""API tests for the FastAPI backend."""

from __future__ import annotations

import pytest
import pytest_asyncio
from asgi_lifespan import LifespanManager
from httpx import ASGITransport, AsyncClient
from typing import AsyncGenerator

from app.config import Settings
from app.main import create_app


@pytest_asyncio.fixture()
async def api_client() -> AsyncGenerator[AsyncClient, None]:
    settings = Settings(
        allow_origins=["*"],
        mock_daily=True,
        bot_runner_enabled=False,
        session_ttl_seconds=120,
        enable_video_pipeline=True,
        google_model="models/test-video",
    )
    app = create_app(settings)
    async with LifespanManager(app):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            yield client


@pytest.mark.asyncio
async def test_start_session_returns_credentials(api_client: AsyncClient):
    payload = {"createDailyRoom": True}

    response = await api_client.post("/api/rtvi/start", json=payload)

    assert response.status_code == 201
    body = response.json()
    assert body["sessionId"]
    assert body["room"]["url"].startswith("https://mock.daily.co/")
    assert body["token"]
    assert body["pipeline"]["model"] == "models/test-video"
    assert body["pipeline"]["videoPipelineEnabled"] is True


@pytest.mark.asyncio
async def test_stop_session(api_client: AsyncClient):
    start_resp = await api_client.post("/api/rtvi/start", json={"createDailyRoom": True})
    session_id = start_resp.json()["sessionId"]

    stop_resp = await api_client.post(f"/api/rtvi/{session_id}/stop")
    assert stop_resp.status_code == 200
    assert stop_resp.json()["session"]["sessionId"] == session_id

    # Session should now be gone
    status_resp = await api_client.get(f"/api/rtvi/{session_id}")
    assert status_resp.status_code == 404
