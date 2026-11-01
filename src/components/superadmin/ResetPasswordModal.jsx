import { useState } from 'react';
import { api, unwrap } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Field, PasswordInput } from '../ui/Field.jsx';
import { CredentialsModal } from '../onboarding/CredentialsModal.jsx';
import { passwordError } from '../../lib/validators.js';

/**
 * Super Admin resets anyone's password: one they type, a generated one, or a
 * WhatsApp code the person redeems on "Forgot password?". A password comes
 * back exactly once, so it opens in the credentials dialog (copy / WhatsApp)
 * rather than a toast that vanishes before it can be copied.
 *
 * `user` needs { id, name }; the id is the User id, not a Doctor id.
 */
export function ResetPasswordModal({ user, onClose }) {
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState(null);

  if (!user) return null;

  const submit = async (viaWhatsapp) => {
    if (!viaWhatsapp && password) {
      const e = passwordError(password);
      if (e) { setError(e); return; }
    }
    setBusy(true);
    try {
      const out = unwrap(await api.post(`/api/superadmin/staff/${user.id}/password`, viaWhatsapp
        ? { viaWhatsapp: true }
        : { viaWhatsapp: false, password }));
      if (viaWhatsapp) {
        toast.success(`Reset code sent to ${out.phone}. They enter it on "Forgot password?"`);
        onClose();
        return;
      }
      setIssued({
        credentials: [{
          role: out.user?.role, name: out.user?.name ?? user.name, phone: out.user?.phone ?? user.phone,
          tempPassword: out.temporaryPassword, signIn: 'TEMP_PASSWORD',
        }],
      });
    } catch (err) {
      if (err.details?.issues?.length) setError(err.message);
      else toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (issued) {
    return <CredentialsModal title="Password reset" result={issued} onClose={onClose} />;
  }

  return (
    <Modal open onClose={onClose} title={`Reset password — ${user.name}`} size="sm">
      <div className="space-y-4">
        <p className="text-xs text-slate-600">
          They are signed out everywhere and asked to choose their own password after signing in.
        </p>
        <Field label="New password" hint="Leave blank to generate one" error={error}>
          <PasswordInput
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            placeholder="Auto-generate"
            autoComplete="new-password"
          />
        </Field>
        <Button className="w-full" loading={busy} onClick={() => submit(false)}>
          <i className="fa-solid fa-key" /> {password ? 'Set this password' : 'Generate a temporary password'}
        </Button>
        <div className="border-t border-slate-100 pt-4">
          <Button variant="secondary" className="w-full" loading={busy} onClick={() => submit(true)}>
            <i className="fa-brands fa-whatsapp" /> Send a reset code on WhatsApp
          </Button>
          <p className="text-[11px] text-slate-400 text-center mt-2">
            Needs WABridge configured; while demo mode is on the code is the fixed demo one.
          </p>
        </div>
      </div>
    </Modal>
  );
}
