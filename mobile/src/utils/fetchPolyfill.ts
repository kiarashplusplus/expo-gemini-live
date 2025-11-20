let hasPatchedFetch = false;

type FetchErrorInfo = {
  status: number;
  message: string;
  timestamp: number;
};

let lastFetchError: FetchErrorInfo | null = null;

const formatErrorPayload = (payload: unknown): string => {
  if (!payload) {
    return 'Request failed with an empty error payload.';
  }

  if (typeof payload === 'string') {
    return payload;
  }

  if (Array.isArray(payload)) {
    return payload
      .map((item) => {
        if (typeof item === 'object' && item !== null) {
          const rawLoc = (item as { loc?: unknown }).loc;
          const loc = Array.isArray(rawLoc)
            ? rawLoc.map((segment: unknown) => String(segment)).join(' · ')
            : undefined;
          const msg = (item as { msg?: unknown }).msg;
          const suffix = typeof msg === 'string' ? msg : JSON.stringify(msg);
          return loc ? `${loc}: ${suffix}` : suffix;
        }
        return JSON.stringify(item);
      })
      .join('; ');
  }

  if (typeof payload === 'object') {
    const detail = (payload as { detail?: unknown }).detail;
    if (typeof detail === 'string') {
      return detail;
    }
    if (Array.isArray(detail)) {
      return formatErrorPayload(detail);
    }
    if (detail && typeof detail === 'object') {
      return JSON.stringify(detail);
    }
    return JSON.stringify(payload);
  }

  return String(payload);
};

export const ensureFetchErrorCaching = () => {
  if (hasPatchedFetch || typeof globalThis.fetch !== 'function') {
    hasPatchedFetch = true;
    return;
  }

  const originalFetch = globalThis.fetch.bind(globalThis);

  type ExtendedResponse = Response & {
    __patched?: boolean;
    __friendlyMessage?: Promise<string>;
  };

  const patchErrorResponse = (response: Response): Response => {
    if (response.ok || typeof response.clone !== 'function' || (response as ExtendedResponse).__patched) {
      return response;
    }

    const clone = response.clone();
    let cachedTextPromise: Promise<string> | null = null;
    let cachedJsonPromise: Promise<unknown> | null = null;

    const readText = () => {
      if (!cachedTextPromise) {
        cachedTextPromise = clone
          .text()
          .then((text) => text)
          .catch(() => '');
      }
      return cachedTextPromise;
    };

    const readJson = () => {
      if (!cachedJsonPromise) {
        cachedJsonPromise = readText().then((text) => {
          if (!text) {
            return null;
          }
          try {
            return JSON.parse(text);
          } catch (error) {
            return text;
          }
        });
      }
      return cachedJsonPromise;
    };

    const originalJson = response.json.bind(response);
    const originalText = response.text.bind(response);

    response.json = async () => {
      if (!response.ok) {
        return readJson();
      }
      return originalJson();
    };

    response.text = async () => {
      if (!response.ok) {
        return readText();
      }
      return originalText();
    };

    const friendlyMessage = readJson().then(formatErrorPayload);

    friendlyMessage
      .then((message) => {
        lastFetchError = {
          status: response.status,
          message,
          timestamp: Date.now(),
        };
      })
      .catch(() => {
        lastFetchError = null;
      });

    (response as ExtendedResponse).__patched = true;
    (response as ExtendedResponse).__friendlyMessage = friendlyMessage;

    return response;
  };

  globalThis.fetch = (async (...args) => {
    const response = await originalFetch(...args);
    return patchErrorResponse(response);
  }) as typeof fetch;

  hasPatchedFetch = true;
};

export const extractFriendlyErrorMessage = async (responseError: unknown): Promise<string | null> => {
  if (!responseError || typeof responseError !== 'object') {
    return null;
  }

  type MaybeFriendly = {
    __friendlyMessage?: Promise<string>;
  };

  const friendly = (responseError as MaybeFriendly).__friendlyMessage;
  if (friendly && typeof friendly === 'object' && 'then' in friendly && typeof friendly.then === 'function') {
    try {
      const resolved = await (friendly as Promise<string>);
      return resolved;
    } catch (
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _error
    ) {
      return null;
    }
  }

  return null;
};

export const getLastFetchErrorInfo = () => lastFetchError;
