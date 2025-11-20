import { create } from 'zustand';

import { getApiBaseUrl, getDefaultUserName } from '@/config/env';
import { ConnectFormValues, StartSessionResponse, TranscriptMessage } from '@/types/rtvi';
import { TransportState } from '@pipecat-ai/client-js';

export type VoiceStatus = 'idle' | 'connecting' | 'connected' | 'ready' | 'error';

export type VoiceSessionStore = {
  status: VoiceStatus;
  error?: string;
  botReady: boolean;
  transportState?: TransportState;
  session?: StartSessionResponse;
  activeBaseUrl?: string;
  localLevel: number;
  remoteLevel: number;
  transcripts: TranscriptMessage[];
  form: ConnectFormValues;
  setStatus: (status: VoiceStatus) => void;
  setError: (error?: string) => void;
  setBotReady: (value: boolean) => void;
  setTransportState: (state?: TransportState) => void;
  setSession: (session?: StartSessionResponse) => void;
  setActiveBaseUrl: (value?: string) => void;
  setLevels: (levels: { local?: number; remote?: number }) => void;
  upsertTranscript: (entry: TranscriptMessage) => void;
  resetTranscripts: () => void;
  updateForm: (values: Partial<ConnectFormValues>) => void;
};

const defaultForm: ConnectFormValues = {
  apiBaseUrl: getApiBaseUrl(),
  displayName: getDefaultUserName(),
  prompt: 'You are a helpful AI guide who loves discussing travel and creative ideas.',
  createDailyRoom: true,
};

export const useVoiceStore = create<VoiceSessionStore>((set, get) => ({
  status: 'idle',
  error: undefined,
  botReady: false,
  transportState: undefined,
  session: undefined,
  activeBaseUrl: undefined,
  localLevel: 0,
  remoteLevel: 0,
  transcripts: [],
  form: defaultForm,
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error }),
  setBotReady: (value) => set({ botReady: value }),
  setTransportState: (transportState) => set({ transportState }),
  setSession: (session) => set({ session }),
  setActiveBaseUrl: (activeBaseUrl) => set({ activeBaseUrl }),
  setLevels: ({ local, remote }) =>
    set((state) => ({
      localLevel: typeof local === 'number' ? local : state.localLevel,
      remoteLevel: typeof remote === 'number' ? remote : state.remoteLevel,
    })),
  upsertTranscript: (entry) =>
    set((state) => {
      const idx = state.transcripts.findIndex(
        (existing) => existing.timestamp === entry.timestamp && existing.role === entry.role,
      );
      if (idx >= 0) {
        const next = [...state.transcripts];
        next[idx] = { ...next[idx], ...entry };
        return { transcripts: next };
      }
      return { transcripts: [...state.transcripts, entry] };
    }),
  resetTranscripts: () => set({ transcripts: [] }),
  updateForm: (values) =>
    set((state) => ({
      form: {
        ...state.form,
        ...values,
      },
    })),
}));
