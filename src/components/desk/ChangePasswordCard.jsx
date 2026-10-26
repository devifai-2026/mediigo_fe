import { useState } from 'react';
import { useToast } from '../../context/ToastContext.jsx';
import { useApi } from '../../hooks/useApi.js';
import { api } from '../../lib/api.js';
import { Button } from '../ui/Button.jsx';
import { Field, PasswordInput } from '../ui/Field.jsx';
import { DeskCard, SectionHead } from './ui.jsx';

const BLANK = { current: '', next: '', confirm: '' };

/**
 * The signed-in person's own password. Logins made at onboarding start with
 * the password the field agent set, or none at all for OTP sign-in — this is
 * where they make it their own. Reads /me rather than the session user,
 * because only /me says whether there is a current password to ask for.
 */
export function ChangePasswordCard({ me: given, onChanged }) {
  const toast = useToast();
  // A parent that already loaded /me passes it in; otherwise fetch it here.
  const { data: fetched, setData: setFetched } = useApi(given ? null : '/api/auth/me', { skip: Boolean(given) });
  const me = given ?? fetched;
  const setMe = given ? () => onChanged?.() : setFetched;
  const [form, setForm] = useState(BLANK);
  const [error, setError] = useState({});
  const [busy, setBusy] = useState(false);
  const hasPassword = me?.hasPassword !== false;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    const problems = {};
    if (hasPassword && !form.current) problems.current = 'Enter your current password';
    if (form.next.length < 8) problems.next = 'At least 8 characters';
    else if (form.next !== form.confirm) problems.confirm = 'Does not match the new password';
    setError(problems);
    if (Object.keys(problems).length) return;
    setBusy(true);
    try {
      await api.post('/api/auth/password', {
        ...(hasPassword ? { currentPassword: form.current } : {}),
        newPassword: form.next,
      });
      toast.success(hasPassword ? 'Password changed' : 'Password set — you can now sign in with it');
      setForm(BLANK);
      setMe((m) => (m ? { ...m, hasPassword: true } : m));
    } catch (err) {
      const field = err.details?.issues?.[0]?.path;
      if (field === 'currentPassword') setError({ current: err.message });
      else toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <DeskCard className="p-4 sm:p-5 space-y-4">
      <SectionHead
        icon="fa-key"
        title={hasPassword ? 'Change password' : 'Set a password'}
        subtitle={hasPassword
          ? 'For your own sign-in. Other logins at this clinic are not affected.'
          : 'You sign in with a WhatsApp code today. Set a password to sign in with it as well.'}
      />
      <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
        {hasPassword && (
          <Field label="Current password" required error={error.current}>
            <PasswordInput autoComplete="current-password" value={form.current} onChange={set('current')} />
          </Field>
        )}
        <Field label="New password" required error={error.next} hint="At least 8 characters">
          <PasswordInput autoComplete="new-password" value={form.next} onChange={set('next')} />
        </Field>
        <Field label="Confirm new password" required error={error.confirm}>
          <PasswordInput autoComplete="new-password" value={form.confirm} onChange={set('confirm')} />
        </Field>
        <div className="sm:col-span-3 flex justify-end">
          <Button type="submit" loading={busy}>
            <i className="fa-solid fa-check" aria-hidden="true" /> {hasPassword ? 'Change password' : 'Set password'}
          </Button>
        </div>
      </form>
    </DeskCard>
  );
}
