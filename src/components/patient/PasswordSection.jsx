import { useState } from 'react';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../lib/api.js';
import { Field, PasswordInput } from '../ui/Field.jsx';
import { Icon } from '../ui/Icon.jsx';

const BLANK = { current: '', next: '', confirm: '' };

/**
 * The patient's own password.
 *
 * Patients signed in by OTP only until now, so most arrive here with none —
 * `hasPassword` from /api/auth/me is what decides whether this is "set a
 * password" or "change" one, and whether the current one is asked for. Getting
 * that wrong would demand a password they have never had.
 *
 * Setting one is optional and adds a second way in; it never removes the code.
 * Nobody is made to invent a password to keep using an app they already use.
 */
export function PasswordSection() {
  const { data: me, refetch } = useApi('/api/auth/me');
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [error, setError] = useState({});
  const [busy, setBusy] = useState(false);

  const hasPassword = me?.hasPassword === true;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    const next = {};
    if (hasPassword && !form.current) next.current = 'Enter your current password';
    if (form.next.length < 8) next.next = 'Use at least 8 characters';
    if (form.next !== form.confirm) next.confirm = 'These do not match';
    setError(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      await api.post('/api/auth/password', {
        ...(hasPassword ? { currentPassword: form.current } : {}),
        newPassword: form.next,
      });
      toast.success(hasPassword ? 'Password changed' : 'Password set — you can now sign in with it');
      setForm(BLANK);
      setOpen(false);
      refetch();
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err.message;
      // The server names the offending field; put the message on that input
      // rather than in a toast the person has to map back themselves.
      const details = err?.response?.data?.error?.details?.issues;
      const onCurrent = details?.some((i) => String(i.path).includes('currentPassword'));
      if (onCurrent) setError({ current: msg }); else toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  if (!me) return null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h4 className="text-base font-semibold text-slate-900">
            {hasPassword ? 'Password' : 'Set a password'}
          </h4>
          <p className="mt-1 text-sm text-slate-600">
            {hasPassword
              ? 'Sign in with your password, or keep using a one-time code.'
              : 'Optional — add one and you can sign in without waiting for a code.'}
          </p>
        </div>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="shrink-0 h-10 px-4 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:border-mg-teal hover:text-mg-teal transition inline-flex items-center gap-2"
          >
            <Icon name="shieldCheck" className="w-4 h-4" />
            {hasPassword ? 'Change' : 'Set password'}
          </button>
        )}
      </div>

      {open && (
        <form onSubmit={save} className="mt-5 space-y-4 animate-fade-in">
          {hasPassword && (
            <Field label="Current password" error={error.current} required>
              <PasswordInput value={form.current} onChange={set('current')} autoComplete="current-password" />
            </Field>
          )}
          <Field label="New password" error={error.next} hint="At least 8 characters" required>
            <PasswordInput value={form.next} onChange={set('next')} autoComplete="new-password" />
          </Field>
          <Field label="Confirm new password" error={error.confirm} required>
            <PasswordInput value={form.confirm} onChange={set('confirm')} autoComplete="new-password" />
          </Field>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="h-10 px-5 rounded-lg bg-mg-teal text-white text-sm font-semibold hover:bg-mg-tealDark disabled:opacity-60 transition"
            >
              {busy ? 'Saving…' : hasPassword ? 'Change password' : 'Set password'}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setForm(BLANK); setError({}); }}
              disabled={busy}
              className="h-10 px-4 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-600"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
