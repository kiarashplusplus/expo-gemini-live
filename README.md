# Pipecat Gemini Live Demo

End-to-end starter kit for building a realtime Pipecat experience that pairs a FastAPI backend with an Expo/React Native client. The backend provisions Daily rooms + tokens, runs a Pipecat pipeline that talks to Gemini Live, and exposes RTVI-friendly endpoints. The mobile app (currently the Expo blank TypeScript scaffold) will host the Pipecat RN SDK integration.

## Repository Layout

```
.
├── server/          # FastAPI app, services, and API tests
├── mobile/          # Expo/React Native project (TypeScript)
├── docs/            # Architecture notes and design references
└── .github/         # Copilot instructions + automation hooks
```

## Requirements

- macOS or Linux with Homebrew (recommended)  
- Python **3.11** (backend)  
- Node.js 18+ and `npm` (Expo CLI)  
- Xcode Simulator or Android emulator / physical device for testing the app

## Backend Setup

1. **Create / activate the virtual environment**
   ```bash
   python3.11 -m venv .venv
   source .venv/bin/activate
   ```
2. **Install dependencies**
   ```bash
   pip install -e "./server[dev]"
   ```
3. **Copy the sample environment and fill in secrets**
   ```bash
   cp .env.example .env
   # edit .env with your Daily + Google credentials
   ```

> The backend reads configuration via `pydantic-settings`, so any variable defined in `.env` automatically flows into `Settings`.

### Running the API locally

```bash
source .venv/bin/activate
uvicorn server.app.main:app --factory --reload
```

- Default port: `http://127.0.0.1:8000`
- Health check: `GET /health`
- Session endpoints: `POST /api/rtvi/start`, `POST /api/rtvi/{sessionId}/stop`, `GET /api/rtvi/{sessionId}`

### Running the backend tests

```bash
source .venv/bin/activate
pytest server/tests -q
```

### Key environment variables

| Variable | Purpose |
| --- | --- |
| `GOOGLE_API_KEY` | Gemini Live API key for the Pipecat pipeline. |
| `GOOGLE_MODEL`, `GOOGLE_VOICE_ID`, `GOOGLE_LANGUAGE` | Voice + locale tuning for Gemini Live. |
| `DAILY_API_KEY` | Allows the backend to create Daily rooms and issue meeting tokens. |
| `DAILY_SAMPLE_ROOM_URL` | Optional fixed room URL for local testing when `createDailyRoom=false`. |
| `MOCK_DAILY` | Set to `true` to bypass Daily REST calls and generate mock tokens. |
| `ALLOW_ORIGINS` | JSON array (e.g., `["http://localhost:8081"]`) of Expo dev server URLs for CORS. |
| `BOT_RUNNER_ENABLED` | Toggle to disable the Pipecat runner during tests. |
| `ENABLE_VIDEO_PIPELINE` | Gates Gemini Live video InputParams + debug processors so you can stage the flow before Pipecat emits webcam frames. |

See `.env.example` for the complete list with defaults.

## Mobile (Expo) Setup

The Expo client now includes:

- A **Pre-Join** experience where you can set the FastAPI base URL, choose your display name, and provide a short system prompt.
- A **Session** screen with split Daily-powered video panes (local preview + Gemini remote feed), live transcripts, audio meters, and controls to send text prompts, restart the transport, or hang up.
- A reusable `VoiceSessionProvider` that wraps the Pipecat RN SDK + Daily transport, handles camera/mic permissions, primes devices via `transport.initDevices()`, and streams transcripts/audio levels through Zustand state.

Because Pipecat relies on native Daily modules, this project uses the [@daily-co/config-plugin-rn-daily-js](https://github.com/daily-co/rn-daily-js-expo-config-plugin) plugin. You need to generate development builds (Expo Go will not load the native modules).

1. **Configure environment variables**
   ```bash
   cd mobile
   cp .env.example .env
   # update EXPO_PUBLIC_API_BASE_URL so devices can reach your FastAPI server
   ```
2. **Install project dependencies**
   ```bash
   npm install
   ```
3. **Prebuild native projects and install pods** (first run or after native dependency changes):
   ```bash
   npx expo prebuild --clean
   ```
4. **Run on a simulator / device**
   ```bash
   npm run ios   # or: npm run android
   ```
   > Tip: use `npx expo start --dev-client --tunnel` if running on a physical device that needs to reach your local backend.

Inside the app, tap **Start Conversation** on the Pre-Join screen. The provider will request camera/mic permissions up front, call `POST /api/rtvi/start`, join the Daily room via `RNDailyTransport`, and render the conversation with Gemini Live. Use the new **Restart Session** button on the session screen if you need to cycle the transport without leaving the call.

## Additional Documentation

- `docs/architecture.md` – high-level system overview, runtime flow, and component responsibilities.
- `.github/copilot-instructions.md` – workspace-specific automation guardrails.

## Troubleshooting

- **Missing Python packages**: Ensure the virtual environment is active (`which python` should point inside `.venv`).
- **Module import errors in tests**: Confirm `pip install -e "./server[dev]"` ran successfully and you're using Python 3.11+.
- **Daily API failures**: Toggle `MOCK_DAILY=true` locally or set `DAILY_SAMPLE_ROOM_URL` to reuse a test room until you have your API key ready.
