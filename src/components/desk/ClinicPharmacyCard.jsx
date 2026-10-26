import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useConfirm } from '../../context/ConfirmContext.jsx';
import { useApi } from '../../hooks/useApi.js';
import { api, unwrap } from '../../lib/api.js';
import { phone as fmtPhone } from '../../lib/format.js';
import { Button } from '../ui/Button.jsx';
import { Field, Input } from '../ui/Field.jsx';
import { CredentialsModal } from '../onboarding/CredentialsModal.jsx';
import { DeskCard, EmptyNote, Pill, SectionHead } from './ui.jsx';

const errMsg = (e) => e?.response?.data?.error?.message || e.message;
const lastSeen = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : 'Never signed in');

/**
 * The clinic's pharmacy logins. The clinic admin adds them here; the
 * temporary password is shown once, to hand over on WhatsApp or in person.
 * Every other doctor sees who is at the pharmacy, read-only.
 */
export function ClinicPharmacyCard() {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const { data, refetch } = useApi('/api/pharmacy/staff');
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(null);
  const [creds, setCreds] = useState(null);

  if (!data) return <div className="h-40 rounded-xl bg-white border border-slate-200 animate-pulse" />;
  const { canManage, pharmacists } = data;

  const handOver = (res) => setCreds({
    hospital: { name: user?.clinic?.name },
    credentials: [{ role: 'PHARMACIST', name: res.pharmacist.name, phone: res.pharmacist.phone, tempPassword: res.temporaryPassword }],
  });

  const create = async (e) => {
    e.preventDefault();
    setBusy('create');
    try {
      const res = unwrap(await api.post('/api/pharmacy/staff', {
        name: form.name.trim(), phone: form.phone, ...(form.email.trim() ? { email: form.email.trim() } : {}),
      }));
      setForm({ name: '', phone: '', email: '' });
      setAdding(false);
      handOver(res);
      refetch();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(null);
    }
  };

  const reset = async (p) => {
    const ok = await confirm({
      title: `Reset ${p.name}’s password?`,
      message: 'Their current password stops working. You will get a new temporary one to share.',
      confirmLabel: 'Reset password',
    });
    if (!ok) return;
    setBusy(p.id);
    try {
      handOver(unwrap(await api.post(`/api/pharmacy/staff/${p.id}/reset-password`)));
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(null); }
  };

  const setActive = async (p, isActive) => {
    if (!isActive) {
      const ok = await confirm({
        title: `Remove ${p.name}’s access?`,
        message: 'They are signed out and can no longer see prescriptions. You can restore access later.',
        confirmLabel: 'Remove access',
      });
      if (!ok) return;
    }
    setBusy(p.id);
    try {
      await api.patch(`/api/pharmacy/staff/${p.id}`, { isActive });
      toast.success(isActive ? `${p.name} can sign in again` : `${p.name} no longer has access`);
      refetch();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(null); }
  };

  return (
    <DeskCard className="p-4 sm:p-6 space-y-4">
      <SectionHead
        icon="fa-prescription-bottle-medical"
        title="Clinic pharmacy"
        subtitle="Pharmacy logins see the prescriptions you send and mark them dispensed"
        right={canManage && !adding && (
          <Button size="sm" onClick={() => setAdding(true)}>
            <i className="fa-solid fa-plus" aria-hidden="true" /> Add pharmacist
          </Button>
        )}
      />

      {adding && (
        <form onSubmit={create} className="rounded-lg border border-slate-200 bg-mg-surface p-3 sm:p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Name" required>
              <Input required minLength={2} maxLength={80} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Kunal Shah" />
            </Field>
            <Field label="Mobile number" required hint="Used to sign in">
              <Input required inputMode="numeric" maxLength={10} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))} placeholder="9876543210" />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="Optional" />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setAdding(false)}>Cancel</Button>
            <Button type="submit" size="sm" loading={busy === 'create'} disabled={form.phone.length !== 10 || form.name.trim().length < 2}>
              Create login
            </Button>
          </div>
        </form>
      )}

      {!pharmacists.length ? (
        <div className="bg-mg-surface rounded-lg">
          <EmptyNote
            icon="fa-prescription-bottle-medical"
            title="No pharmacy login yet"
            hint={canManage
              ? 'Add your pharmacist to start sending prescriptions straight from the Rx pad.'
              : 'Your clinic admin can add the pharmacist from their Profile page.'}
          />
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
          {pharmacists.map((p) => (
            <li key={p.id} className="px-3.5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {p.name}
                  <Pill tone={p.isActive ? 'emerald' : 'slate'} className="ml-2 align-middle">{p.isActive ? 'Active' : 'No access'}</Pill>
                </p>
                <p className="text-xs text-slate-500">+91 {fmtPhone(p.phone)} · {p.isActive ? `Last sign-in: ${lastSeen(p.lastLoginAt)}` : 'Access removed'}</p>
              </div>
              {canManage && (
                <div className="flex gap-2 shrink-0">
                  {p.isActive && (
                    <Button size="sm" variant="secondary" onClick={() => reset(p)} disabled={busy === p.id}>
                      <i className="fa-solid fa-key" aria-hidden="true" /> Reset password
                    </Button>
                  )}
                  <Button size="sm" variant={p.isActive ? 'danger' : 'primary'} onClick={() => setActive(p, !p.isActive)} loading={busy === p.id}>
                    {p.isActive ? 'Remove access' : 'Restore access'}
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <CredentialsModal result={creds} onClose={() => setCreds(null)} />
    </DeskCard>
  );
}
