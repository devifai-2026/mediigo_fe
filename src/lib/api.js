import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  withCredentials: true, // carries the httpOnly refresh cookie
  headers: { 'Content-Type': 'application/json' },
});

// Access token lives in memory only — never localStorage, where XSS could read it.
let accessToken = null;
let onAuthFailure = null;

export const setAccessToken = (t) => { accessToken = t; };
export const getAccessToken = () => accessToken;
export const setAuthFailureHandler = (fn) => { onAuthFailure = fn; };

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// Single-flight refresh: concurrent 401s queue onto ONE refresh promise rather
// than firing N parallel refreshes that would rotate each other's tokens.
let refreshPromise = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    if (status !== 401 || original?._retried || original?.url?.includes('/api/auth/')) {
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
      onAuthFailure?.();
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

export const unwrap = (res) => res.data?.data ?? res.data;
