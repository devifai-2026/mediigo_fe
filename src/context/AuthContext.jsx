import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api, setAccessToken, setAuthFailureHandler, unwrap } from '../lib/api.js';
import { clearAll } from '../lib/storage.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // 'loading' gates the whole app on first paint. Without it the router would
  // briefly render the login screen for an already-signed-in user.
  const [status, setStatus] = useState('loading');
  const bootstrapped = useRef(false);

  const applySession = useCallback((accessToken, nextUser) => {
    setAccessToken(accessToken);
    setUser(nextUser);
    setStatus('authed');
  }, []);

  const logout = useCallback(async ({ silent = false } = {}) => {
    if (!silent) await api.post('/api/auth/logout').catch(() => {});
    // Full teardown. The prototype's logout flipped a boolean and left booking
    // and family state behind for the next user of the device.
    setAccessToken(null);
    setUser(null);
    clearAll();
    setStatus('guest');
  }, []);

  // Silent restore from the httpOnly refresh cookie.
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    (async () => {
      try {
        const r = await api.post('/api/auth/refresh');
        const accessToken = unwrap(r)?.accessToken;
        if (!accessToken) throw new Error('no session');
        setAccessToken(accessToken);
        const me = unwrap(await api.get('/api/auth/me'));
        setUser(me);
        setStatus('authed');
      } catch {
        setStatus('guest');
      }
    })();
  }, []);

  useEffect(() => {
    setAuthFailureHandler(() => logout({ silent: true }));
  }, [logout]);

  const requestOtp = useCallback(async (phone, purpose) => unwrap(await api.post('/api/auth/otp/request', { phone, purpose })), []);

  const verifyOtp = useCallback(async ({ phone, otp, name, purpose }) => {
    const data = unwrap(await api.post('/api/auth/otp/verify', { phone, otp, name, purpose }));
    applySession(data.accessToken, data.user);
    return data.user;
  }, [applySession]);

  const staffLogin = useCallback(async ({ identifier, password }) => {
    const data = unwrap(await api.post('/api/auth/staff/login', { identifier, password }));
    // The server decides whether 2FA applies, from the Super Admin's role
    // policy. The client never holds that rule.
    if (data.requires2fa) return { requires2fa: true, phone: data.phone, purpose: data.purpose };
    applySession(data.accessToken, data.user);
    return { requires2fa: false, user: data.user };
  }, [applySession]);

  const refreshUser = useCallback(async () => {
    const me = unwrap(await api.get('/api/auth/me'));
    setUser(me);
    return me;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role ?? null,
        status,
        isAuthed: status === 'authed',
        requestOtp,
        verifyOtp,
        staffLogin,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
