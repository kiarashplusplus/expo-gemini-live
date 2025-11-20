# Pipecat Gemini Live Architecture

## Overview

We are building an end-to-end voice assistant that couples a FastAPI backend, Pipecat's realtime orchestration layer, and an Expo/React Native client. The flow looks like this:

1. The mobile user taps **Connect**.
2. The app calls a FastAPI endpoint to start an RTVI session.
3. The backend provisions/join Daily room credentials, spins up a Pipecat pipeline that talks to Gemini Live, and tracks the session.
4. The backend returns the RTC credentials and session metadata to the mobile app.
5. The React Native client uses the Pipecat RN SDK + Daily transport to join the same room, subscribes to RTVI signals, and begins the conversation.
6. Either side can end the session, which tears down the pipeline, closes transports, and frees resources.

## Runtime Components

| Layer | Responsibilities |
| --- | --- |
| FastAPI backend | Configuration, REST API, Daily REST helper, Pipecat session manager, Gemini Live LLM wiring, RTVI Processor bridging, metrics/logging. |
| Pipecat pipeline | Daily WebRTC transport (audio I/O), RTVIProcessor + observer, GeminiLiveLLMService, LLMContextAggregator, PipelineRunner per session. |
| React Native app | Device permissions, PipecatClient creation, Daily transport, session UI (pre-join + in-call), telemetry (bot status, transcripts, audio levels). Implemented via `VoiceSessionProvider`, Zustand store, and Expo screens (`PreJoinScreen`, `SessionScreen`). |

## Backend Modules

```
server/app/
├── main.py            # FastAPI app factory + lifespan
├── config.py          # Pydantic settings + dependency override for tests
├── models.py          # Request/response DTOs shared across routers
├── services/
│   ├── daily.py       # Async DailyRESTHelper + token/room helpers
│   ├── sessions.py    # Session registry, start/stop orchestration
│   └── bot.py         # Pipecat pipeline builder + runner utilities
├── api/
│   ├── deps.py        # FastAPI dependencies (settings, session manager)
│   └── routes.py      # `/health`, `/api/rtvi/start`, `/api/rtvi/{id}` endpoints
└── tests/
    ├── conftest.py    # Fixtures (app, client, fake Daily helper)
    └── test_api.py    # FastAPI endpoint coverage
```

## FastAPI Endpoints

| Route | Description | Notes |
| --- | --- | --- |
| `GET /health` | Basic readiness/liveness check. | Returns `{status:"ok"}`. |
| `POST /api/rtvi/start` | Creates or reuses a Daily room, issues a user token, starts a Pipecat session. | Request supports `createDailyRoom`, `dailyRoomProperties`, `user`, and `metadata`. Response contains `sessionId`, `room`, `token`, `expiresAt`, and `rtvi`. |
| `POST /api/rtvi/{sessionId}/stop` | Stops a running pipeline and releases transport resources. | Safe to call multiple times. |
| `GET /api/rtvi/{sessionId}` | (Optional) Returns current session state (active, error, completed). | Useful for mobile reconnect flows/logging. |

### Request/Response Contracts

```ts
// POST /api/rtvi/start
interface StartSessionRequest {
  createDailyRoom?: boolean;      // default true
  roomUrl?: string;               // reuse existing room when provided
  dailyRoomProperties?: object;   // passed to Daily
  user?: { id?: string; name?: string; locale?: string };
  metadata?: Record<string, any>; // forwarded to Pipecat context
}

interface StartSessionResponse {
  sessionId: string;
  room: { url: string; name: string };
  token: string;
  expiresAt: string;               // ISO8601
  rtvi: { startEndpoint: string; wsEndpoint: string };
}
```

The RN client only _needs_ `sessionId`, `room.url`, `token`, and the backend `endpoint` it already called. We include `wsEndpoint` in case we later expose a websocket for custom events.

## Pipecat Pipeline Design

**Inputs:** audio/video frames from Daily + RTVI control events.  
**Outputs:** synthesized audio/video from Gemini Live delivered back through Daily + RTVI state updates.

The per-session runner assembles:

1. `DailyTransport` — configured with mic/speaker enabling, VAD (`SileroVADAnalyzer`), and transcription.
2. `RTVIProcessor` + `RTVIObserver` — handles `bot_ready`, transcripts, client events.
3. `LLMContext` — seeds persona/system prompts using metadata (e.g., `user.name` or requested scenario).
4. `GeminiLiveLLMService` — configured with `GOOGLE_API_KEY`, `conversation=f"session-{id}"`, `voice=settings.default_voice`, `language=settings.default_language`.
5. `Pipeline` & `PipelineTask` — wires `transport.input -> rtvi -> aggregator.user -> llm -> transport.output -> aggregator.assistant`.
6. `PipelineRunner` — started via `asyncio.create_task`, stored in `SessionManager`, cancelled when user disconnects or stop endpoint called.

Edge cases handled:

- **Client disconnects before bot ready:** `DailyTransport` emits `on_client_disconnected`; we cancel the task and purge the session.
- **Gemini errors:** caught, logged, bubbled to RTVI as `error` event, and session transitions to `failed` state.
- **Room/token expiry:** `SessionManager` tracks `expires_at`; background cleanup coroutine periodically removes expired sessions.

## Session Lifecycle

1. `POST /api/rtvi/start`
   - Validate request, merge defaults.
   - Acquire room + token via `DailyService` (create or reuse).
   - Build `SessionConfig` (ids, user metadata, context prompts).
   - Launch `PipecatBotRunner.start(config)` (async task) and store handle + credentials in `SessionStore`.
   - Return credentials to caller.
2. Client calls `startBotAndConnect` with returned endpoint + credentials.
3. During the call, `PipecatClient` exchanges RTC media with `DailyTransport` while RTVI events flow through FastAPI -> Pipecat -> client.
4. When user ends call, `POST /api/rtvi/{id}/stop` or transport disconnect triggers cleanup.

## React Native Responsibilities

- **State manager (`VoiceClientContext`)**: wraps `PipecatClient` from `@pipecat-ai/client-react-native`. Manages permissions, connect/disconnect, event callbacks (bot ready, transcripts, audio level, errors).
- **Transport**: `RNDailyTransport` seeded with `startBotAndConnect({ endpoint: API_BASE_URL + "/api/rtvi/start" })`.
- **Views**:
  - `PreJoinScreen`: collects server URL + optional auth token, requests mic permission, kicks off start.
  - `SessionScreen`: shows bot avatar/video, waveform, push-to-talk toggle, transcript list, hangup button.
- **Utilities**: `SettingsManager` for persisting backend URL/token, `useVoiceClientNavigation` to switch screens on connection state.
- **Error handling**: Toast-based notifications plus inline status cards.

## Configuration & Secrets

Environment variables consumed by FastAPI:

| Var | Purpose |
| --- | --- |
| `GOOGLE_API_KEY` | Gemini Live access. |
| `GOOGLE_REGION` | (Optional) Multi-region selection. |
| `DAILY_API_KEY` | Create rooms & tokens. |
| `DAILY_SAMPLE_ROOM_URL` | Shortcut to reuse an existing room locally. |
| `BOT_NAME` | Display name for the bot inside Daily. |
| `DEFAULT_VOICE` | Gemini voice ID (e.g., `"Puck"`). |
| `DEFAULT_LANGUAGE` | BCP-47 locale passed to Gemini Live. |
| `ALLOWED_ORIGINS` | CORS list for RS clients / Expo dev server. |

A `.env` file (not committed) provides local defaults; `Settings` class reads it automatically via `pydantic-settings`.

## Testing Strategy

- **Unit tests** for Daily helper (mock Daily API), session manager (lifecycle transitions), and API validation.
- **Integration tests** using `httpx.AsyncClient` against FastAPI app to ensure start/stop flows succeed when Pipecat runner is monkeypatched.
- **React Native tests** (Jest) for context reducer/utility functions and UI components (snapshot + permission edge cases).

## Next Steps

1. Scaffold backend modules + tests following the layout above.
2. Wire `.env`-driven configuration and add sample `.env.example`.
3. Implement Pipecat runner + Gemini Live integration using real transports.
4. Upgrade Expo app with Pipecat RN dependencies, context/provider, and UI states.
5. Document setup/run commands and automate lint/test steps in CI.
