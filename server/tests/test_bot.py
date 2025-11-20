"""Unit tests for Pipecat bot helpers."""

from __future__ import annotations

import pytest

from app.config import Settings
from app.services.bot import PipecatBotRunner


class DummyTransport:
    def __init__(self):
        self.handlers = {}

    def event_handler(self, event_name):
        def decorator(func):
            self.handlers[event_name] = func
            return func

        return decorator


class DummyTask:
    def __init__(self):
        self.queued = []

    async def queue_frames(self, frames):
        self.queued.append(frames)


class FakeFrame:
    def __init__(self, *, messages):
        self.messages = messages


@pytest.mark.asyncio
async def test_system_instruction_hook_enqueues_message():
    settings = Settings(system_instruction="Stay concise")
    runner = PipecatBotRunner(settings)
    transport = DummyTransport()
    task = DummyTask()

    runner._register_system_instruction_hook(transport, task, "session-1", FakeFrame)

    handler = transport.handlers.get("on_client_connected")
    assert handler is not None

    await handler(None, None)

    assert len(task.queued) == 1
    frame = task.queued[0][0]
    assert frame.messages[0]["role"] == "system"
    assert frame.messages[0]["content"] == "Stay concise"


@pytest.mark.asyncio
async def test_system_instruction_hook_skips_when_blank():
    settings = Settings(system_instruction="   ")
    runner = PipecatBotRunner(settings)
    transport = DummyTransport()
    task = DummyTask()

    runner._register_system_instruction_hook(transport, task, "session-2", FakeFrame)

    assert "on_client_connected" not in transport.handlers
    assert task.queued == []
