"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.logger = exports.UnsupportedFeatureError = exports.TransportWrapper = exports.TransportStateEnum = exports.TransportStartError = exports.Transport = exports.StartBotError = exports.RTVI_PROTOCOL_VERSION = exports.RTVI_MESSAGE_LABEL = exports.RTVIMessageType = exports.RTVIMessage = exports.RTVIEvent = exports.RTVIError = exports.PipecatClient = exports.MessageDispatcher = exports.LogLevel = exports.InvalidTransportParamsError = exports.DeviceError = exports.ConnectionTimeoutError = exports.BotNotReadyError = exports.BotAlreadyStartedError = void 0;
let TransportStateEnum = exports.TransportStateEnum = /*#__PURE__*/function (TransportStateEnum) {
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
class RTVIError extends Error {}
exports.RTVIError = RTVIError;
class ConnectionTimeoutError extends RTVIError {}
exports.ConnectionTimeoutError = ConnectionTimeoutError;
class StartBotError extends RTVIError {}
exports.StartBotError = StartBotError;
class TransportStartError extends RTVIError {}
exports.TransportStartError = TransportStartError;
class InvalidTransportParamsError extends RTVIError {}
exports.InvalidTransportParamsError = InvalidTransportParamsError;
class BotNotReadyError extends RTVIError {}
exports.BotNotReadyError = BotNotReadyError;
class BotAlreadyStartedError extends RTVIError {}
exports.BotAlreadyStartedError = BotAlreadyStartedError;
class UnsupportedFeatureError extends RTVIError {}
exports.UnsupportedFeatureError = UnsupportedFeatureError;
class DeviceError extends RTVIError {}
exports.DeviceError = DeviceError;
const RTVI_PROTOCOL_VERSION = exports.RTVI_PROTOCOL_VERSION = '1.0.0';
const RTVI_MESSAGE_LABEL = exports.RTVI_MESSAGE_LABEL = 'rtvi-ai';
/**
 * Messages the corresponding server-side client expects to receive about
 * our client-side state.
 */
let RTVIMessageType = exports.RTVIMessageType = /*#__PURE__*/function (RTVIMessageType) {
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
class RTVIMessage {}
exports.RTVIMessage = RTVIMessage;
let RTVIEvent = exports.RTVIEvent = /*#__PURE__*/function (RTVIEvent) {
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
let LogLevel = exports.LogLevel = /*#__PURE__*/function (LogLevel) {
  LogLevel[LogLevel["NONE"] = 0] = "NONE";
  LogLevel[LogLevel["ERROR"] = 1] = "ERROR";
  LogLevel[LogLevel["WARN"] = 2] = "WARN";
  LogLevel[LogLevel["INFO"] = 3] = "INFO";
  LogLevel[LogLevel["DEBUG"] = 4] = "DEBUG";
  return LogLevel;
}({});
const logger = exports.logger = Logger.getInstance();
class MessageDispatcher {}
exports.MessageDispatcher = MessageDispatcher;
class Transport {}
exports.Transport = Transport;
class TransportWrapper {}
exports.TransportWrapper = TransportWrapper;
class PipecatClient extends RTVIEventEmitter {}
exports.PipecatClient = PipecatClient;
//# sourceMappingURL=typeOverrides.d.js.map