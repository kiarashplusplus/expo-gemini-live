"""Pipecat pipeline orchestration and helpers."""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from typing import Any, Dict

try:  # pragma: no cover - optional dependency
    from google.genai.types import HttpOptions
except ModuleNotFoundError:  # pragma: no cover - google extras not installed
    HttpOptions = None

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
            pipeline, task = self._build_pipeline(config)
        except Exception as exc:  # pragma: no cover - import/config failures
            logger.exception("Failed to build Pipecat pipeline")
            raise

        logger.info("Starting Pipecat runner for %s", config.session_id)
        from pipecat.pipeline.runner import PipelineRunner

        runner = PipelineRunner(name=f"pipecat-runner-{config.session_id}")
        try:
            await runner.run(task)
        except Exception as exc:
            logger.error(
                "Pipecat runner failed for session %s using model %s: %s",
                config.session_id,
                self._settings.google_model,
                exc,
            )
            raise
        logger.info("Pipecat runner finished for %s", config.session_id)

    def _build_pipeline(self, config: BotSessionConfig):
        """Instantiate the Pipecat pipeline components lazily."""

        from pipecat.audio.turn.smart_turn.local_smart_turn_v3 import (
            LocalSmartTurnAnalyzerV3,
        )
        from pipecat.audio.turn.smart_turn.base_smart_turn import SmartTurnParams
        from pipecat.audio.vad.silero import SileroVADAnalyzer
        from pipecat.audio.vad.vad_analyzer import VADParams
        from pipecat.frames.frames import Frame, UserImageRawFrame
        from pipecat.pipeline.pipeline import Pipeline
        from pipecat.pipeline.task import PipelineParams, PipelineTask
        from pipecat.processors.aggregators.llm_context import LLMContext
        from pipecat.processors.aggregators.llm_response_universal import (
            LLMContextAggregatorPair,
        )
        from pipecat.processors.frame_processor import FrameDirection, FrameProcessor
        from pipecat.services.google.gemini_live.llm import (
            GeminiLiveLLMService,
            GeminiMediaResolution,
            GeminiModalities,
            InputParams,
        )
        from pipecat.transports.daily.transport import DailyParams, DailyTransport

        class VideoDebugProcessor(FrameProcessor):
            """Logs when Pipecat encounters video frames while forwarding them."""

            async def process_frame(self, frame: Frame, direction: FrameDirection):
                if isinstance(frame, UserImageRawFrame):
                    logger.debug(
                        "VideoDebugProcessor observed frame (participant=%s, frame_size=%s)",
                        getattr(frame, "participant_id", "unknown"),
                        getattr(frame.image, "size", "n/a") if hasattr(frame, "image") else "n/a",
                    )
                await self.push_frame(frame, direction)

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

        input_params_kwargs: Dict[str, Any] = {"language": self._settings.google_language}

        if self._settings.google_modalities:
            try:
                input_params_kwargs["modalities"] = GeminiModalities[
                    self._settings.google_modalities.upper()
                ]
            except KeyError:
                logger.warning(
                    "Unknown GOOGLE_MODALITIES value '%s'", self._settings.google_modalities
                )

        if self._settings.enable_video_pipeline:
            input_params_kwargs["media_resolution"] = GeminiMediaResolution.MEDIUM
            extra = input_params_kwargs.setdefault("extra", {})
            extra.update(
                {
                    "media_resolution": GeminiMediaResolution.MEDIUM.value,
                    "staging": "Video pipeline flag enabled",
                }
            )

        http_options = None
        if self._settings.google_api_version:
            if HttpOptions is None:
                logger.warning(
                    "GOOGLE_API_VERSION set but google.genai HttpOptions unavailable."
                )
            else:
                http_options = HttpOptions(api_version=self._settings.google_api_version)

        llm = GeminiLiveLLMService(
            api_key=self._settings.google_api_key or "",
            model=self._settings.google_model,
            voice_id=self._settings.google_voice_id,
            system_instruction=self._settings.system_instruction,
            params=InputParams(**input_params_kwargs),
            http_options=http_options,
        )

        context = LLMContext()
        if self._settings.system_instruction:
            context.add_message({"role": "system", "content": self._settings.system_instruction})
        aggregators = LLMContextAggregatorPair(context)

        pipeline_stages = [transport.input(), aggregators.user()]
        if self._settings.enable_video_pipeline:
            pipeline_stages.append(VideoDebugProcessor())
            logger.debug("Video pipeline staging enabled for session %s", config.session_id)

        pipeline_stages.extend([llm, aggregators.assistant(), transport.output()])

        pipeline = Pipeline(pipeline_stages)

        task = PipelineTask(
            pipeline,
            params=PipelineParams(enable_metrics=True, enable_usage_metrics=True),
        )

        return pipeline, task

    def build_task(self, config: BotSessionConfig) -> asyncio.Task:
        """Convenience helper for spawning the pipeline in the background."""

        return asyncio.create_task(self.run(config), name=f"pipecat-session-{config.session_id}")
