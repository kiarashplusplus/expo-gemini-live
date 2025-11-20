# Gemini Live Video Integration Plan

> _Context: Expo (React Native) client streaming via Daily transport, FastAPI backend orchestrating Pipecat 0.0.94. Goal: enable video-in to Gemini Live models such as `gemini-live-2.5-flash` while keeping the system resilient to restarts or connection resets._

## 1. Reference Pipecat Multimodal Pipeline (based on `26-gemini-multimodal-live.py`)

Although the example script is not bundled with the installed wheel, we can mirror its structure using the APIs already in the repo. Key building blocks:

```python
from pipecat.audio.turn.smart_turn.local_smart_turn_v3 import LocalSmartTurnAnalyzerV3
from pipecat.audio.turn.smart_turn.base_smart_turn import SmartTurnParams
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.audio.vad.vad_analyzer import VADParams
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import LLMContextAggregatorPair
from pipecat.services.google.gemini_live.llm import GeminiLiveLLMService, InputParams
from pipecat.transports.daily.transport import DailyParams, DailyTransport

transport_params = DailyParams(
    api_key=settings.daily_api_key,
    audio_in_enabled=True,
    audio_out_enabled=True,
    vad_analyzer=SileroVADAnalyzer(params=VADParams(stop_secs=0.2)),
    turn_analyzer=LocalSmartTurnAnalyzerV3(params=SmartTurnParams()),
)
transport = DailyTransport(
    room_url=config.room_url,
    token=config.token,
    bot_name=settings.bot_name,
    params=transport_params,
)

llm = GeminiLiveLLMService(
    api_key=settings.google_api_key,
    model=settings.google_model,
    voice_id=settings.google_voice_id,
    system_instruction=settings.system_instruction,
    params=InputParams(
        language=settings.google_language,
        # enable video once supported by setting modalities/extra
    ),
)

context = LLMContext()
if settings.system_instruction:
    context.add_message({"role": "system", "content": settings.system_instruction})
aggregators = LLMContextAggregatorPair(context)

pipeline = Pipeline([
    transport.input(),
    aggregators.user(),
    llm,
    aggregators.assistant(),
    transport.output(),
])

task = PipelineTask(
    pipeline,
    params=PipelineParams(enable_metrics=True, enable_usage_metrics=True),
)

> **Official reference (`26-gemini-multimodal-live.py`)** – now mirrored locally for posterity:

```python
#
# Copyright (c) 2024–2025, Daily
#
# SPDX-License-Identifier: BSD 2-Clause License
#

import argparse
import os

from dotenv import load_dotenv
from loguru import logger

from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.audio.vad.vad_analyzer import VADParams
from pipecat.frames.frames import LLMMessagesAppendFrame
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.services.gemini_multimodal_live.gemini import GeminiMultimodalLiveLLMService
from pipecat.transports.base_transport import BaseTransport, TransportParams
from pipecat.transports.network.fastapi_websocket import FastAPIWebsocketParams
from pipecat.transports.services.daily import DailyParams

# Load environment variables
load_dotenv(override=True)


# We store functions so objects (e.g. SileroVADAnalyzer) don't get
# instantiated. The function will be called when the desired transport gets
# selected.
transport_params = {
    "daily": lambda: DailyParams(
        audio_in_enabled=True,
        audio_out_enabled=True,
        # set stop_secs to something roughly similar to the internal setting
        # of the Multimodal Live api, just to align events.
        vad_analyzer=SileroVADAnalyzer(params=VADParams(stop_secs=0.5)),
    ),
    "twilio": lambda: FastAPIWebsocketParams(
        audio_in_enabled=True,
        audio_out_enabled=True,
        # set stop_secs to something roughly similar to the internal setting
        # of the Multimodal Live api, just to align events.
        vad_analyzer=SileroVADAnalyzer(params=VADParams(stop_secs=0.5)),
    ),
    "webrtc": lambda: TransportParams(
        audio_in_enabled=True,
        audio_out_enabled=True,
        # set stop_secs to something roughly similar to the internal setting
        # of the Multimodal Live api, just to align events.
        vad_analyzer=SileroVADAnalyzer(params=VADParams(stop_secs=0.5)),
    ),
}


async def run_example(transport: BaseTransport, _: argparse.Namespace, handle_sigint: bool):
    logger.info(f"Starting bot")

    # Create the Gemini Multimodal Live LLM service
    system_instruction = f"""
    You are a helpful AI assistant.
    Your goal is to demonstrate your capabilities in a helpful and engaging way.
    Your output will be converted to audio so don't include special characters in your answers.
    Respond to what the user said in a creative and helpful way.
    """

    llm = GeminiMultimodalLiveLLMService(
        api_key=os.getenv("GOOGLE_API_KEY"),
        system_instruction=system_instruction,
        voice_id="Puck",  # Aoede, Charon, Fenrir, Kore, Puck
    )

    # Build the pipeline
    pipeline = Pipeline(
        [
            transport.input(),
            llm,
            transport.output(),
        ]
    )

    # Configure the pipeline task
    task = PipelineTask(
        pipeline,
        params=PipelineParams(
            enable_metrics=True,
            enable_usage_metrics=True,
        ),
    )

    # Handle client connection event
    @transport.event_handler("on_client_connected")
    async def on_client_connected(transport, client):
        logger.info(f"Client connected")
        # Kick off the conversation.
        await task.queue_frames(
            [
                LLMMessagesAppendFrame(
                    messages=[
                        {
                            "role": "user",
                            "content": f"Greet the user and introduce yourself.",
                        }
                    ]
                )
            ]
        )

    # Handle client disconnection events
    @transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(transport, client):
        logger.info(f"Client disconnected")
        await task.cancel()

    # Run the pipeline
    runner = PipelineRunner(handle_sigint=handle_sigint)
    await runner.run(task)


if __name__ == "__main__":
    from pipecat.examples.run import main

    main(run_example, transport_params=transport_params)
```

This mirrors our FastAPI backend’s `PipecatBotRunner`:

- Swap `GeminiMultimodalLiveLLMService` for `GeminiLiveLLMService` (already wrapped in `bot.py`).
- Keep the `transport.input() -> llm -> transport.output()` stage order; our context aggregators sit between input and LLM for transcript capture.
- Use the same `LLMMessagesAppendFrame` pattern (or seed `LLMContext`) inside Daily’s `onConnected` hook so Pipecat greets immediately.
- Map the lambda-based `transport_params` to our lazily constructed `DailyTransport` (we already pass `SileroVADAnalyzer` + `LocalSmartTurnAnalyzerV3`).
```

**Video-specific pointer:** In the original example, Pipecat registers `transport.input()` with webcam capture enabled. When the Daily bot joins, Pipecat captures participant camera frames automatically (see `DailyTransport.capture_participant_video`). Ensure `transport_params.camera_out_enabled` remains `True` and the server logs show `Starting to capture [camera] video...` after a participant joins.

If the camera capture helper introduced in v0.0.95 (`maybe_capture_participant_camera`) is required, keep an eye on upgrading to that release.

## 2. Checklist for dealing with connection resets

1. **Server restarts** – always run `uvicorn server.app.main:create_app --factory --reload` from repo root. The Pipecat runner now constructs a `PipelineRunner` instance per session (`PipecatBotRunner.run`).
2. **Mobile client reconnect** – after Expo refresh, ensure `Active Base URL` points at the correct FastAPI tunnel and call `connect()` again. The RN transport will request a fresh Daily token via `/api/rtvi/start`.
3. **Daily room cleanup** – verify `sessions.stop_session` executes (call `/api/rtvi/{session_id}/stop`) when a reconnect fails, preventing orphaned rooms.
4. **Gemini Live model version** – if changing `.env` while the server is running, restart the FastAPI process so the new `GOOGLE_MODEL` is loaded via `Settings` cache.

## 3. Pending work items (mirrors active to-do list)

- [x] Capture exact Pipecat example snippet once we have a local copy of `26-gemini-multimodal-live.py` (embedded above for quick reference).
- [x] Document env overrides for switching to `gemini-live-2.5-flash` (`GOOGLE_MODEL`, `GOOGLE_API_VERSION=v1alpha`, `GOOGLE_MODALITIES=AUDIO`, `ENABLE_VIDEO_PIPELINE=true`).
- [x] Ensure the Expo app pins `@pipecat-ai/react-native-daily-transport` ≥ the version that forwards video frames (package.json now locks `@pipecat-ai/client-js@1.4.1` and `@pipecat-ai/react-native-daily-transport@1.4.0`).
- [x] Extend `server/app/services/bot.py` to toggle video-specific InputParams once Gemini Live video is available (gated behind `ENABLE_VIDEO_PIPELINE`, adds `VideoDebugProcessor`, and enriches `InputParams.extra`).
- [x] Define a verification script (pytest + Expo instructions) to run after every config change (`scripts/verify-video.sh`).

Refer back to this file whenever the dev tunnel resets or the workspace reloads.

## 4. Gemini Live models & required config flags

| Model name | Launch stage | Video support | Notes / required flags |
|------------|--------------|---------------|------------------------|
| `gemini-live-2.5-flash` | Private GA | Yes (low-latency audio + video) | Requires access approval. When used through Pipecat’s `google-genai` client, specify `http_options=HttpOptions(api_version="v1alpha")` for proactivity/affective dialog. Set `InputParams.modalities` to include `GeminiModalities.AUDIO` and future `VIDEO` once exposed. |
| `gemini-live-2.5-flash-preview-native-audio` (and dated preview variants) | Public preview | Primarily audio, but Live API still accepts multimodal context frames | Ideal for testing proactivity/audio improvements. Same `http_options` guidance. |
| `gemini-2.5-flash-s2st-exp-11-2025` | Experimental | Supports speech-to-speech pipelines; limited Live features | Use only for targeted S2ST flows. Confirm Google flags before enabling video capture. |

**Environment updates when switching models**

1. Edit `.env` (or deployment secrets):

   ```env
   GOOGLE_MODEL=gemini-live-2.5-flash
   GOOGLE_REGION="us-east5"  # match region from allowlist if required
   ```

2. Update Pipecat service configuration (example in `bot.py`):

   ```python
   from google.genai.types import HttpOptions

   llm = GeminiLiveLLMService(
       api_key=settings.google_api_key,
       model=settings.google_model,
       params=InputParams(
           language=settings.google_language,
           # TODO: switch to combined audio+video modality when SDK exposes enum
           extra={
               "http_options": HttpOptions(api_version="v1alpha"),
               "proactivity": {"enabled": True},
           },
       ),
   )
   ```

3. Restart FastAPI so `Settings` reloads environment variables.

4. Run `/Users/home/Documents/Live/.venv/bin/python -m pytest server` and a manual Expo call to confirm the new model handshake succeeds.

**Available env overrides**

- `GOOGLE_MODEL` – switch between `gemini-live-2.5-flash`, preview SKUs, or fall back to `models/gemini-2.0-flash-live-001`.
- `GOOGLE_API_VERSION` – sets `HttpOptions(api_version=...)` so features like affective dialog/proactivity can be enabled (use `v1alpha` for current Gemini Live private GA requirements).
- `GOOGLE_MODALITIES` – optional override for Pipecat `InputParams.modalities` (accepts `TEXT` or `AUDIO`).
- `ENABLE_VIDEO_PIPELINE` – flips the server-side feature flag that enriches `InputParams` with `GeminiMediaResolution.MEDIUM` and inserts the `VideoDebugProcessor`.

## 5. Mobile (Expo / React Native) video capture plan

1. **Dependencies**
    - Lock `@pipecat-ai/client-js` and `@pipecat-ai/react-native-daily-transport` to the latest release compatible with Pipecat 0.0.94+. Add them to `mobile/package.json` if not already present or bump with `npx expo install`.
    - Ensure `@daily-co/react-native-webrtc` stays in sync; the RN transport depends on it for camera tracks.

2. **Transport wiring** (`VoiceSessionProvider`)
    - `enableCam: true` is already passed to `PipecatClient`. Added explicit `await transport.initDevices()` before `client.startBotAndConnect` plus a permission gate so the camera initializes prior to joining the room.
    - Subscribe to `transport.tracks()` changes via `onTrackStarted` / `onTrackStopped` (already implemented) and confirm `tracks.local.video` is non-null. The provider now stores track snapshots immediately after device init so the UI can render a preview tile before the bot joins.

3. **UI updates** (`SessionScreen`)
    - Split the `VoiceClientVideoView` into two panes: local preview (using `tracks.local.video`) and remote bot track. This makes it obvious whether the camera stream is active.
    - Add state badges that reflect `transportState` (e.g., `initializing`, `ready`) so it is easier to debug connection resets. A `Restart Session` control now calls `disconnect()` then `connect()` to recover transport issues without leaving the screen.

4. **Testing checklist**
    - Run `npx expo start --clear` and launch on iOS Simulator/physical device.
    - Verify the platform permission dialog appears; if not, call `useDevicePermissions()` earlier in the flow.
    - Watch the Metro logs for `MediaDevices => mediaDevicesOnDeviceChange` and confirm a `track-started` event for the local camera.

5. **Fallback plan if camera capture fails**
    - Log `transport.tracks()` snapshots after join; persist to Sentry/console for remote debugging.
    - Provide a manual toggle in the UI to restart the transport (call `disconnect()` then `connect()`) so testers can recover without restarting Expo.

## 6. Backend staging for video frames (FastAPI + Pipecat)

1. **Upgrade guard** – stay on Pipecat 0.0.94 until a release explicitly exposes video modalities. Track GitHub releases for `maybe_capture_participant_camera` in `DailyTransport`.
2. **Feature flag** – add `ENABLE_VIDEO_PIPELINE` to `Settings`; gate any new logic so we can deploy incrementally.
3. **`bot.py` hooks**
    - After constructing `DailyTransport`, leave a TODO hook where we will invoke the future camera capture helper once available.
    - When `ENABLE_VIDEO_PIPELINE` is true, enrich `InputParams` with `extra={"media_resolution": "MEDIA_RESOLUTION_MEDIUM"}` (or enum once exported) and optional `proactivity` block.
4. **Custom processor stub** – implement a no-op `VideoDebugProcessor` class that logs when a `UserImageRawFrame` is seen. Insert it before `llm`. For now it will simply pass frames through so we are ready when Pipecat starts emitting them.
5. **Telemetry + errors** – wrap `runner.run(task)` in `try/except TransportStartError` to include the current `GOOGLE_MODEL` in logs, helping diagnose model-specific issues when we flip to `gemini-live-2.5-flash`.
6. **Tests** – extend `server/tests/test_api.py` with a regression test asserting `/api/rtvi/start` returns the currently configured model and feature flag state. ✅ Added `test_start_session_returns_credentials` assertions for `pipeline.model` + `pipeline.videoPipelineEnabled`.

## 7. Verification checklist (run after any config/model change)

1. **Backend unit tests**

    ```bash
    /Users/home/Documents/Live/.venv/bin/python -m pytest server
    ```

2. **FastAPI smoke test**
    - Start the server: `source .venv/bin/activate && uvicorn server.app.main:create_app --factory --reload`
    - Run `curl -s https://<tunnel>/api/rtvi/start -d '{"createDailyRoom":false}'` with mock creds to ensure JSON schema hasn’t changed.

3. **Expo client**
    - `cd mobile && npx expo start --clear`
    - Connect from iOS/Android, verify local video preview + remote bot track while speaking to confirm audio remains intact.

4. **End-to-end session teardown**
    - Use the Hang Up button (or call `/api/rtvi/{session}/stop`) and confirm server logs show `Pipeline task ... has finished`.

5. **Log capture**
    - Archive the FastAPI + Expo logs after every test run so regressions can be compared when connection resets occur.

> Shortcut: run `./scripts/verify-video.sh` from the repo root to automate steps 1–3 (backend tests + Expo type check) before doing the manual device run.
