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
```

**Video-specific pointer:** In the original example, Pipecat registers `transport.input()` with webcam capture enabled. When the Daily bot joins, Pipecat captures participant camera frames automatically (see `DailyTransport.capture_participant_video`). Ensure `transport_params.camera_out_enabled` remains `True` and the server logs show `Starting to capture [camera] video...` after a participant joins.

If the camera capture helper introduced in v0.0.95 (`maybe_capture_participant_camera`) is required, keep an eye on upgrading to that release.

## 2. Checklist for dealing with connection resets

1. **Server restarts** – always run `uvicorn server.app.main:create_app --factory --reload` from repo root. The Pipecat runner now constructs a `PipelineRunner` instance per session (`PipecatBotRunner.run`).
2. **Mobile client reconnect** – after Expo refresh, ensure `Active Base URL` points at the correct FastAPI tunnel and call `connect()` again. The RN transport will request a fresh Daily token via `/api/rtvi/start`.
3. **Daily room cleanup** – verify `sessions.stop_session` executes (call `/api/rtvi/{session_id}/stop`) when a reconnect fails, preventing orphaned rooms.
4. **Gemini Live model version** – if changing `.env` while the server is running, restart the FastAPI process so the new `GOOGLE_MODEL` is loaded via `Settings` cache.

## 3. Pending work items (mirrors active to-do list)

- [ ] Capture exact Pipecat example snippet once we have a local copy of `26-gemini-multimodal-live.py` (track GitHub release or vendor files).
- [ ] Document env overrides for switching to `gemini-live-2.5-flash` (`http_options=HttpOptions(api_version="v1alpha")`, `InputParams.modalities`).
- [ ] Ensure the Expo app pins `@pipecat-ai/react-native-daily-transport` ≥ the version that forwards video frames.
- [ ] Extend `server/app/services/bot.py` to toggle video-specific InputParams once Gemini Live video is available.
- [ ] Define a verification script (pytest + manual Expo call) to run after every config change.

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

## 5. Mobile (Expo / React Native) video capture plan

1. **Dependencies**
    - Lock `@pipecat-ai/client-js` and `@pipecat-ai/react-native-daily-transport` to the latest release compatible with Pipecat 0.0.94+. Add them to `mobile/package.json` if not already present or bump with `npx expo install`.
    - Ensure `@daily-co/react-native-webrtc` stays in sync; the RN transport depends on it for camera tracks.

2. **Transport wiring** (`VoiceSessionProvider`)
    - `enableCam: true` is already passed to `PipecatClient`. Add explicit `await transport.initDevices()` before `client.startBotAndConnect` to prompt camera permissions and ensure a track exists before join.
    - Subscribe to `transport.tracks()` changes via `onTrackStarted` / `onTrackStopped` (already implemented) and confirm `tracks.local.video` is non-null. Surface this in the UI so testers can see their preview before the bot joins.

3. **UI updates** (`SessionScreen`)
    - Split the `VoiceClientVideoView` into two panes: local preview (using `tracks.local.video`) and remote bot track. This makes it obvious whether the camera stream is active.
    - Add state badges that reflect `transportState` (e.g., `initializing`, `ready`) so it is easier to debug connection resets.

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
6. **Tests** – extend `server/tests/test_api.py` with a regression test asserting `/api/rtvi/start` returns the currently configured model and feature flag state.

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
