"use strict";

export let TransportStateEnum = /*#__PURE__*/function (TransportStateEnum) {
  TransportStateEnum["DISCONNECTED"] = "disconnected";
  TransportStateEnum["INITIALIZING"] = "initializing";
  TransportStateEnum["INITIALIZED"] = "initialized";
  TransportStateEnum["AUTHENTICATING"] = "authenticating";
  TransportStateEnum["AUTHENTICATED"] = "authenticated";
  TransportStateEnum["CONNECTING"] = "connecting";
  TransportStateEnum["CONNECTED"] = "connected";
  TransportStateEnum["READY"] = "ready";
  TransportStateEnum["DISCONNECTING"] = "disconnecting";
  TransportStateEnum["ERROR"] = "error";
  return TransportStateEnum;
}({});
/**
 * Copyright (c) 2024, Daily.
 *
 * SPDX-License-Identifier: BSD-2-Clause
 */
export class RTVIError extends Error {}
export class ConnectionTimeoutError extends RTVIError {}
export class StartBotError extends RTVIError {}
export class TransportStartError extends RTVIError {}
export class InvalidTransportParamsError extends RTVIError {}
export class BotNotReadyError extends RTVIError {}
export class BotAlreadyStartedError extends RTVIError {}
export class UnsupportedFeatureError extends RTVIError {}
export class DeviceError extends RTVIError {}
export const RTVI_PROTOCOL_VERSION = '1.0.0';
export const RTVI_MESSAGE_LABEL = 'rtvi-ai';
/**
 * Messages the corresponding server-side client expects to receive about
 * our client-side state.
 */
export let RTVIMessageType = /*#__PURE__*/function (RTVIMessageType) {
  RTVIMessageType["CLIENT_READY"] = "client-ready";
  RTVIMessageType["DISCONNECT_BOT"] = "disconnect-bot";
  RTVIMessageType["CLIENT_MESSAGE"] = "client-message";
  RTVIMessageType["SEND_TEXT"] = "send-text";
  RTVIMessageType["APPEND_TO_CONTEXT"] = "append-to-context";
  RTVIMessageType["BOT_READY"] = "bot-ready";
  RTVIMessageType["ERROR"] = "error";
  RTVIMessageType["METRICS"] = "metrics";
  RTVIMessageType["SERVER_MESSAGE"] = "server-message";
  RTVIMessageType["SERVER_RESPONSE"] = "server-response";
  RTVIMessageType["ERROR_RESPONSE"] = "error-response";
  RTVIMessageType["APPEND_TO_CONTEXT_RESULT"] = "append-to-context-result";
  RTVIMessageType["USER_TRANSCRIPTION"] = "user-transcription";
  RTVIMessageType["BOT_TRANSCRIPTION"] = "bot-transcription";
  RTVIMessageType["USER_STARTED_SPEAKING"] = "user-started-speaking";
  RTVIMessageType["USER_STOPPED_SPEAKING"] = "user-stopped-speaking";
  RTVIMessageType["BOT_STARTED_SPEAKING"] = "bot-started-speaking";
  RTVIMessageType["BOT_STOPPED_SPEAKING"] = "bot-stopped-speaking";
  RTVIMessageType["USER_LLM_TEXT"] = "user-llm-text";
  RTVIMessageType["BOT_LLM_TEXT"] = "bot-llm-text";
  RTVIMessageType["BOT_LLM_STARTED"] = "bot-llm-started";
  RTVIMessageType["BOT_LLM_STOPPED"] = "bot-llm-stopped";
  RTVIMessageType["LLM_FUNCTION_CALL"] = "llm-function-call";
  RTVIMessageType["LLM_FUNCTION_CALL_RESULT"] = "llm-function-call-result";
  RTVIMessageType["BOT_LLM_SEARCH_RESPONSE"] = "bot-llm-search-response";
  RTVIMessageType["BOT_TTS_TEXT"] = "bot-tts-text";
  RTVIMessageType["BOT_TTS_STARTED"] = "bot-tts-started";
  RTVIMessageType["BOT_TTS_STOPPED"] = "bot-tts-stopped";
  return RTVIMessageType;
}({});

/** DEPRECATED */

/** DEPRECATED */

export class RTVIMessage {}
export let RTVIEvent = /*#__PURE__*/function (RTVIEvent) {
  RTVIEvent["Connected"] = "connected";
  RTVIEvent["Disconnected"] = "disconnected";
  RTVIEvent["TransportStateChanged"] = "transportStateChanged";
  RTVIEvent["BotStarted"] = "botStarted";
  RTVIEvent["BotConnected"] = "botConnected";
  RTVIEvent["BotReady"] = "botReady";
  RTVIEvent["BotDisconnected"] = "botDisconnected";
  RTVIEvent["Error"] = "error";
  RTVIEvent["ServerMessage"] = "serverMessage";
  RTVIEvent["ServerResponse"] = "serverResponse";
  RTVIEvent["MessageError"] = "messageError";
  RTVIEvent["Metrics"] = "metrics";
  RTVIEvent["BotStartedSpeaking"] = "botStartedSpeaking";
  RTVIEvent["BotStoppedSpeaking"] = "botStoppedSpeaking";
  RTVIEvent["UserStartedSpeaking"] = "userStartedSpeaking";
  RTVIEvent["UserStoppedSpeaking"] = "userStoppedSpeaking";
  RTVIEvent["UserTranscript"] = "userTranscript";
  RTVIEvent["BotTranscript"] = "botTranscript";
  RTVIEvent["BotLlmText"] = "botLlmText";
  RTVIEvent["BotLlmStarted"] = "botLlmStarted";
  RTVIEvent["BotLlmStopped"] = "botLlmStopped";
  RTVIEvent["LLMFunctionCall"] = "llmFunctionCall";
  RTVIEvent["BotLlmSearchResponse"] = "botLlmSearchResponse";
  RTVIEvent["BotTtsText"] = "botTtsText";
  RTVIEvent["BotTtsStarted"] = "botTtsStarted";
  RTVIEvent["BotTtsStopped"] = "botTtsStopped";
  RTVIEvent["ParticipantConnected"] = "participantConnected";
  RTVIEvent["ParticipantLeft"] = "participantLeft";
  RTVIEvent["TrackStarted"] = "trackStarted";
  RTVIEvent["TrackStopped"] = "trackStopped";
  RTVIEvent["ScreenTrackStarted"] = "screenTrackStarted";
  RTVIEvent["ScreenTrackStopped"] = "screenTrackStopped";
  RTVIEvent["ScreenShareError"] = "screenShareError";
  RTVIEvent["LocalAudioLevel"] = "localAudioLevel";
  RTVIEvent["RemoteAudioLevel"] = "remoteAudioLevel";
  RTVIEvent["AvailableCamsUpdated"] = "availableCamsUpdated";
  RTVIEvent["AvailableMicsUpdated"] = "availableMicsUpdated";
  RTVIEvent["AvailableSpeakersUpdated"] = "availableSpeakersUpdated";
  RTVIEvent["CamUpdated"] = "camUpdated";
  RTVIEvent["MicUpdated"] = "micUpdated";
  RTVIEvent["SpeakerUpdated"] = "speakerUpdated";
  RTVIEvent["DeviceError"] = "deviceError";
  return RTVIEvent;
}({});
/**
 * Copyright (c) 2024, Daily.
 *
 * SPDX-License-Identifier: BSD-2-Clause
 */
export let LogLevel = /*#__PURE__*/function (LogLevel) {
  LogLevel[LogLevel["NONE"] = 0] = "NONE";
  LogLevel[LogLevel["ERROR"] = 1] = "ERROR";
  LogLevel[LogLevel["WARN"] = 2] = "WARN";
  LogLevel[LogLevel["INFO"] = 3] = "INFO";
  LogLevel[LogLevel["DEBUG"] = 4] = "DEBUG";
  return LogLevel;
}({});
export const logger = Logger.getInstance();
export class MessageDispatcher {}
export class Transport {}
export class TransportWrapper {}
export class PipecatClient extends RTVIEventEmitter {}
//# sourceMappingURL=typeOverrides.d.js.map