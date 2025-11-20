import axios from 'axios';

import { ConnectFormValues, SessionSummary, StartSessionRequest } from '@/types/rtvi';

const sanitizeBaseUrl = (value: string) => value.replace(/\/+$/, '');

export const buildStartPayload = (values: ConnectFormValues): StartSessionRequest => {
  return {
    createDailyRoom: values.createDailyRoom,
    user: values.displayName ? { name: values.displayName } : undefined,
    metadata: values.prompt ? { prompt: values.prompt } : undefined,
  };
};

export const getStartEndpoint = (baseUrl: string) => `${sanitizeBaseUrl(baseUrl)}/api/rtvi/start`;

export const stopSession = async (sessionId: string, baseUrl: string) => {
  const endpoint = `${sanitizeBaseUrl(baseUrl)}/api/rtvi/${sessionId}/stop`;
  const { data } = await axios.post<{ session: SessionSummary }>(endpoint);
  return data.session;
};
