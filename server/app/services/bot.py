"""Pipecat pipeline orchestration and helpers."""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from typing import Any, Dict

from ..config import Settings

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class BotSessionConfig:
    """Parameters required to start a Pipecat pipeline."""

    session_id: str
    room_url: str
    token: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    user_name: str | None = None


class PipecatBotRunner:
    """Builds and executes Pipecat pipelines per session."""

    def __init__(self, settings: Settings):
        self._settings = settings

    async def run(self, config: BotSessionConfig) -> None:
        """Start a Gemini Live session routed through Daily."""

        if not self._settings.bot_runner_enabled:
            logger.info("Bot runner disabled, skipping pipeline for %s", config.session_id)
            return

        if not self._settings.google_api_key:
            logger.warning("GOOGLE_API_KEY missing; cannot start Pipecat pipeline")
            return

        if not self._settings.daily_api_key and not self._settings.use_mock_daily:
            logger.warning("DAILY_API_KEY missing; cannot start Pipecat pipeline")
            return

        try:
            pipeline, runner = self._build_pipeline(config)
        except Exception as exc:  # pragma: no cover - import/config failures
            logger.exception("Failed to build Pipecat pipeline")
            raise

        logger.info("Starting Pipecat runner for %s", config.session_id)
        await runner.run()
        logger.info("Pipecat runner finished for %s", config.session_id)

    def _build_pipeline(self, config: BotSessionConfig):
        """Instantiate the Pipecat pipeline components lazily."""

        from pipecat.audio.turn.smart_turn.local_smart_turn_v3 import (
            LocalSmartTurnAnalyzerV3,
        )
        from pipecat.audio.turn.smart_turn.base_smart_turn import SmartTurnParams
        from pipecat.audio.vad.silero import SileroVADAnalyzer
        from pipecat.audio.vad.vad_analyzer import VADParams
        from pipecat.pipeline.pipeline import Pipeline
        from pipecat.pipeline.runner import PipelineRunner
        from pipecat.pipeline.task import PipelineParams, PipelineTask
        from pipecat.processors.aggregators.llm_context import LLMContext
        from pipecat.processors.aggregators.llm_response_universal import (
            LLMContextAggregatorPair,
        )
        from pipecat.services.google.gemini_live.llm import GeminiLiveLLMService, InputParams
        from pipecat.transports.daily.transport import DailyParams, DailyTransport

        transport_params = DailyParams(
            api_key=self._settings.daily_api_key or "",
            audio_in_enabled=True,
            audio_out_enabled=True,
            vad_analyzer=SileroVADAnalyzer(params=VADParams(stop_secs=0.2)),
            turn_analyzer=LocalSmartTurnAnalyzerV3(params=SmartTurnParams()),
        )
        transport = DailyTransport(
            room_url=config.room_url,
            token=config.token,
            bot_name=self._settings.bot_name,
            params=transport_params,
        )

        llm = GeminiLiveLLMService(
            api_key=self._settings.google_api_key or "",
            model=self._settings.google_model,
            voice_id=self._settings.google_voice_id,
            system_instruction=self._settings.system_instruction,
            params=InputParams(language=self._settings.google_language),
        )

        context = LLMContext()
        if self._settings.system_instruction:
            context.add_message({"role": "system", "content": self._settings.system_instruction})
        aggregators = LLMContextAggregatorPair(context)

        pipeline = Pipeline(
            [
                transport.input(),
                aggregators.user(),
                llm,
                aggregators.assistant(),
                transport.output(),
            ]
        )

        task = PipelineTask(
            pipeline,
            params=PipelineParams(enable_metrics=True, enable_usage_metrics=True),
        )

        runner = PipelineRunner(task)
        return pipeline, runner

    def build_task(self, config: BotSessionConfig) -> asyncio.Task:
        """Convenience helper for spawning the pipeline in the background."""

        return asyncio.create_task(self.run(config), name=f"pipecat-session-{config.session_id}")
