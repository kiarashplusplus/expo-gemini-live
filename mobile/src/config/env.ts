import Constants from 'expo-constants';

const DEFAULT_BASE_URL = 'http://127.0.0.1:8000';

const sanitizeUrl = (value?: string | null) => {
  if (!value) {
    return '';
  }
  return value.replace(/\/$/, '');
};

export const getApiBaseUrl = () => {
  const envValue = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (envValue && envValue.length > 0) {
    return sanitizeUrl(envValue);
  }

  const extra = (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl;
  return sanitizeUrl(extra ?? DEFAULT_BASE_URL);
};
