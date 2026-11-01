import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  withCredentials: true, // carries the httpOnly refresh cookie
  headers: { 'Content-Type': 'application/json' },
  // fetch with cache: 'no-store', so the browser never revalidates an API
  // answer from its HTTP cache. A revalidation came back as a bare 304 that
  // the page saw as a failure (the onboarding specialty list never loaded).
  adapter: 'fetch',
  fetchOptions: { cache: 'no-store' },
});

// Access token lives in memory only — never localStorage, where XSS could read it.
let accessToken = null;
let onAuthFailure = null;
// While a Super Admin is signed in as someone else, a 401 means that borrowed
// session ran out. Refreshing would quietly swap in the admin's own token under
// the other user's screens, so it ends the impersonation instead.
let onImpersonationExpired = null;

export const setAccessToken = (t) => { accessToken = t; };
export const getAccessToken = () => accessToken;
export const setAuthFailureHandler = (fn) => { onAuthFailure = fn; };
export const setImpersonationExpiredHandler = (fn) => { onImpersonationExpired = fn; };

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// Single-flight refresh: concurrent 401s queue onto ONE refresh promise rather
// than firing N parallel refreshes that would rotate each other's tokens.
let refreshPromise = null;

api.interceptors.response.use(
  (res) => {
    // Every API answer is JSON. Anything else with a 2xx — a host's HTML
    // "busy" or error page while the backend is slow — is a failed request,
    // not data: passed on, a component got a string and crashed on .map.
    if (typeof res.data === 'string' && res.data.trim()) {
      const e = new Error('The server is busy right now — please try again in a moment.');
      e.code = 'BAD_RESPONSE';
      e.status = res.status;
      return Promise.reject(e);
    }
    return res;
  },
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    if (status !== 401 || original?._retried || original?.url?.includes('/api/auth/')) {
      return Promise.reject(normalizeError(error));
    }

    if (onImpersonationExpired) {
      onImpersonationExpired();
      return Promise.reject(normalizeError(error));
    }

    original._retried = true;
    try {
      if (!refreshPromise) {
        refreshPromise = axios
          .post('/api/auth/refresh', {}, { withCredentials: true, baseURL: import.meta.env.VITE_API_URL || '' })
          .then((r) => r.data?.data?.accessToken ?? null)
          .finally(() => { setTimeout(() => { refreshPromise = null; }, 0); });
      }
      const fresh = await refreshPromise;
      if (!fresh) throw new Error('refresh failed');
      setAccessToken(fresh);
      original.headers.Authorization = `Bearer ${fresh}`;
      return api(original);
    } catch (e) {
      // Sign out only when the server rejected the refresh cookie. A refresh
      // that failed in transit (offline, 5xx, the host's busy page) says
      // nothing about the session, and logging out on it lost a valid one.
      const refreshStatus = e?.response?.status;
      if (refreshStatus === 401 || refreshStatus === 403 || e?.message === 'refresh failed') onAuthFailure?.();
      return Promise.reject(normalizeError(error));
    }
  },
);

// One error shape for the whole app, so components never parse two formats.
export const normalizeError = (error) => {
  const payload = error.response?.data?.error;
  const e = new Error(payload?.message || error.message || 'Something went wrong');
  e.code = payload?.code || 'NETWORK_ERROR';
  e.status = error.response?.status ?? 0;
  e.details = payload?.details;
  return e;
};

// The payload of an { ok, data } answer, exactly as sent — `data: null`
// included. The old `res.data?.data ?? res.data` turned a null payload into
// the whole envelope object, which then reached .map and .slots.
export const unwrap = (res) => {
  const body = res?.data;
  return body && typeof body === 'object' && !Array.isArray(body) && 'data' in body ? body.data : body;
};
