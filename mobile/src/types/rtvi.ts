export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type SessionUser = {
  id?: string;
  name?: string;
  locale?: string;
};

export type StartSessionRequest = {
  createDailyRoom?: boolean;
  roomUrl?: string;
  dailyRoomProperties?: Record<string, JsonValue>;
  dailyMeetingTokenProperties?: Record<string, JsonValue>;
  user?: SessionUser;
  metadata?: Record<string, JsonValue>;
};

export type RoomInfo = {
  url: string;
  name: string;
};

export type StartSessionResponse = {
  sessionId: string;
  room: RoomInfo;
  token: string;
  dailyRoom: string;
  dailyToken: string;
  room_url: string;
  expiresAt: string;
  rtvi: {
    startEndpoint: string;
    wsEndpoint?: string | null;
  };
};

export type SessionStatus = 'pending' | 'active' | 'stopped' | 'error';

export type SessionSummary = {
  sessionId: string;
  status: SessionStatus;
  room: RoomInfo;
  token: string;
  createdAt: string;
  expiresAt: string;
  metadata?: Record<string, JsonValue> | null;
};

export type TranscriptMessage = {
  id: string;
  role: 'user' | 'bot';
  text: string;
  timestamp: string;
  final: boolean;
};

export type ConnectFormValues = {
  apiBaseUrl: string;
  displayName: string;
  prompt: string;
  createDailyRoom: boolean;
};
