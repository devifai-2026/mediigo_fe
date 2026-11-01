import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api, setAccessToken, setAuthFailureHandler, setImpersonationExpiredHandler, unwrap } from '../lib/api.js';
import { clearAll } from '../lib/storage.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // 'loading' gates the whole app on first paint. Without it the router would
  // briefly render the login screen for an already-signed-in user.
  const [status, setStatus] = useState('loading');
  // Set while a Super Admin is signed in as someone else: { admin, expiresAt }.
  // Held in memory only, so a reload simply returns to the admin's own session
  // (the admin's refresh cookie is never touched by impersonation).
  const [impersonation, setImpersonation] = useState(null);
  const bootstrapped = useRef(false);
  // Read by logout, which is defined before exitImpersonation exists.
  const exitRef = useRef(null);

  const applySession = useCallback((accessToken, nextUser) => {
    setAccessToken(accessToken);
    setUser(nextUser);
    setStatus('authed');
  }, []);

  const logout = useCallback(async ({ silent = false } = {}) => {
    // Signing out of a borrowed session goes back to the admin. Calling the
    // server's logout here would clear the ADMIN's refresh cookie instead.
    if (!silent && exitRef.current) {
      await exitRef.current();
      return;
    }
    if (!silent) await api.post('/api/auth/logout').catch(() => {});
    // Full teardown. The prototype's logout flipped a boolean and left booking
    // and family state behind for the next user of the device.
    setAccessToken(null);
    setUser(null);
    setImpersonation(null);
    setImpersonationExpiredHandler(null);
    clearAll();
    setStatus('guest');
  }, []);

  // Silent restore from the httpOnly refresh cookie.
  //
  // Only the server saying "no session" (401/403) makes this a guest. Anything
  // else — offline, a 5xx or the host's HTML page while the Node app wakes up
  // or restarts — used to land here too, so a page refresh at the wrong moment
  // signed people out although their cookie was fine. Those now retry, with
  // the splash saying so, until the server answers either way.
  const [bootError, setBootError] = useState(null);
  const retryBoot = useRef(null);
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    let attempt = 0;
    const restore = async () => {
      clearTimeout(retryBoot.current?.timer);
      try {
        const r = await api.post('/api/auth/refresh');
        const accessToken = unwrap(r)?.accessToken;
        if (!accessToken) throw Object.assign(new Error('no session'), { status: 401 });
        setAccessToken(accessToken);
        const me = unwrap(await api.get('/api/auth/me'));
        setUser(me);
        setBootError(null);
        setStatus('authed');
      } catch (err) {
        if (err?.status === 401 || err?.status === 403) {
          setAccessToken(null);
          setBootError(null);
          setStatus('guest');
          return;
        }
        attempt += 1;
        setBootError(err?.message || 'Could not reach Mediigo');
        const delay = Math.min(1000 * 2 ** (attempt - 1), 15000);
        retryBoot.current = { timer: setTimeout(restore, delay), now: restore };
      }
    };
    retryBoot.current = { now: restore };
    restore();
    return () => clearTimeout(retryBoot.current?.timer);
  }, []);
  const retryRestore = useCallback(() => retryBoot.current?.now?.(), []);

  useEffect(() => {
    setAuthFailureHandler(() => logout({ silent: true }));
  }, [logout]);

  const requestOtp = useCallback(async (phone, purpose) => unwrap(await api.post('/api/auth/otp/request', { phone, purpose })), []);

  const verifyOtp = useCallback(async ({ phone, otp, name, purpose }) => {
    const data = unwrap(await api.post('/api/auth/otp/verify', { phone, otp, name, purpose }));
    applySession(data.accessToken, data.user);
    return data.user;
  }, [applySession]);

  /**
   * Patient sign-up: the same OTP verify (which creates the account), then an
   * optional first password. isNew is false when the number was already
   * registered — the page says so instead of claiming it made an account.
   */
  const signUp = useCallback(async ({ phone, otp, name, password }) => {
    const data = unwrap(await api.post('/api/auth/otp/verify', { phone, otp, name }));
    applySession(data.accessToken, data.user);
    let passwordSet = false;
    if (password) {
      try {
        await api.post('/api/auth/password', { newPassword: password });
        passwordSet = true;
      } catch {
        // An existing account that already has a password: keep it. The page
        // tells the person to use it or change it from their account.
      }
    }
    return { user: data.user, isNew: Boolean(data.isNew), passwordSet };
  }, [applySession]);

  const staffLogin = useCallback(async ({ identifier, password }) => {
    const data = unwrap(await api.post('/api/auth/staff/login', { identifier, password }));
    // The server decides whether 2FA applies, from the Super Admin's role
    // policy. The client never holds that rule.
    // verifyPhone is the account's real number, which the OTP was issued
    // against; `phone` is only the masked copy for display.
    if (data.requires2fa) return { requires2fa: true, phone: data.phone, verifyPhone: data.verifyPhone, purpose: data.purpose, otpLength: data.otpLength };
    applySession(data.accessToken, data.user);
    return { requires2fa: false, user: data.user };
  }, [applySession]);

  /** Forgot password: the PASSWORD_RESET code plus a new password. */
  const resetPassword = useCallback(async ({ phone, otp, newPassword }) =>
    unwrap(await api.post('/api/auth/password/reset', { phone, otp, newPassword })), []);

  const refreshUser = useCallback(async () => {
    const me = unwrap(await api.get('/api/auth/me'));
    setUser(me);
    return me;
  }, []);

  /** Back to the Super Admin's own session, from their untouched refresh cookie. */
  const exitImpersonation = useCallback(async () => {
    setImpersonationExpiredHandler(null);
    setImpersonation(null);
    try {
      const accessToken = unwrap(await api.post('/api/auth/refresh'))?.accessToken;
      if (!accessToken) throw new Error('no session');
      setAccessToken(accessToken);
      setUser(unwrap(await api.get('/api/auth/me')));
      setStatus('authed');
      return true;
    } catch {
      await logout({ silent: true });
      return false;
    }
  }, [logout]);

  /** Super Admin: sign in as another user, keeping the way back. */
  const impersonate = useCallback(async (userId) => {
    const admin = user;
    const data = unwrap(await api.post(`/api/superadmin/impersonate/${userId}`));
    setAccessToken(data.accessToken);
    setImpersonationExpiredHandler(() => { exitImpersonation(); });
    setImpersonation({ admin: { id: admin?.id ?? admin?._id, name: admin?.name }, expiresAt: Date.now() + data.expiresInMinutes * 60_000 });
    // /me rather than the trimmed session user, so the target's portal gets the
    // same profile shape (clinic, district, flags) a real sign-in would load.
    setUser(unwrap(await api.get('/api/auth/me')));
    setStatus('authed');
    return data.user;
  }, [user, exitImpersonation]);

  useEffect(() => {
    exitRef.current = impersonation ? exitImpersonation : null;
  }, [impersonation, exitImpersonation]);

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role ?? null,
        status,
        isAuthed: status === 'authed',
        requestOtp,
        verifyOtp,
        signUp,
        bootError,
        retryRestore,
        staffLogin,
        logout,
        refreshUser,
        resetPassword,
        impersonation,
        isImpersonating: Boolean(impersonation),
        impersonate,
        exitImpersonation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
