import { useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { useApi } from '../../hooks/useApi.js';
import { api, unwrap } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useConfirm } from '../../context/ConfirmContext.jsx';
import { AdminPageHeader } from '../../components/superadmin/AdminKpi.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Field, Input, Select } from '../../components/ui/Field.jsx';
import { SkeletonRows } from '../../components/ui/Skeleton.jsx';
import { FilterPills } from '../../components/ui/FilterPills.jsx';
import { ROLES, ROLE_LABEL } from '../../lib/constants.js';
import { phone as fmtPhone, shortDate } from '../../lib/format.js';

const ROLE_CHIP = {
  EXEC_ADMIN: 'bg-purple-50 text-purple-700 border-purple-200',
  FIELD_AGENT: 'bg-amber-50 text-amber-700 border-amber-200',
  RECEPTIONIST: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  SUPER_ADMIN: 'bg-slate-900 text-white border-slate-700',
};

const loadSummary = (u) => {
  if (!u.load) return null;
  if (u.role === ROLES.EXEC_ADMIN) {
    return `${u.load.hospitals} clinic${u.load.hospitals === 1 ? '' : 's'} · ${u.load.agents} agent${u.load.agents === 1 ? '' : 's'}`;
  }
  return `${u.load.submissions} submission${u.load.submissions === 1 ? '' : 's'}`;
};

export default function StaffView() {
  const { data: staff, loading, refetch } = useApi('/api/superadmin/staff');
  const { data: districts } = useApi('/api/superadmin/districts');
  const toast = useToast();
  const confirm = useConfirm();

  const [filter, setFilter] = useState('ALL');
  const [dialog, setDialog] = useState(null); // {mode, user}
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [transfer, setTransfer] = useState(null); // pending handover after a blocked deactivate

  const rows = (staff || []).filter((u) => filter === 'ALL' || u.role === filter);
  // A successor must hold no district of their own, or theirs would be orphaned.
  const freeAdmins = (staff || []).filter(
    (u) => u.role === ROLES.EXEC_ADMIN && u.isActive && !u.districtId && u.id !== dialog?.user?.id,
  );

  const open = (mode, user = null) => {
    setTransfer(null);
    setDialog({ mode, user });
    setForm(
      mode === 'create'
        ? { name: '', phone: '', role: ROLES.FIELD_AGENT, email: '', districtId: '', password: '' }
        : { name: user?.name ?? '', phone: user?.phone ?? '', email: user?.email ?? '', districtId: user?.districtId ?? '' },
    );
  };

  const run = async (fn, okMsg) => {
    setBusy(true);
    try {
      const out = await fn();
      if (okMsg) toast.success(typeof okMsg === 'function' ? okMsg(out) : okMsg);
      setDialog(null);
      setTransfer(null);
      refetch();
      return out;
    } catch (e) {
      // The server blocks removal until the district is handed over, and tells
      // us so — surface the picker instead of just an error.
      if (e.details?.requiresTransfer) {
        setTransfer({ load: e.details.load, message: e.message });
      } else {
        toast.error(e.message);
      }
      return null;
    } finally {
      setBusy(false);
    }
  };

  const create = () => run(
    async () => unwrap(await api.post('/api/superadmin/staff', {
      ...form,
      districtId: form.districtId || undefined,
      password: form.password || undefined,
      email: form.email || undefined,
    })),
    (out) => out.temporaryPassword
      ? `${out.user.name} created — temporary password: ${out.temporaryPassword}`
      : `${out.user.name} created`,
  );

  const save = () => run(
    () => api.patch(`/api/superadmin/staff/${dialog.user.id}`, {
      name: form.name, phone: form.phone, email: form.email || '', districtId: form.districtId || '',
    }),
    'Details updated',
  );

  const resetPassword = (user, viaWhatsapp) => run(
    async () => unwrap(await api.post(`/api/superadmin/staff/${user.id}/password`, { viaWhatsapp })),
    (out) => viaWhatsapp
      ? `Reset code sent to ${out.phone}`
      : `New temporary password for ${user.name}: ${out.temporaryPassword}`,
  );

  const deactivate = (user, transferToUserId) => run(
    () => api.post(`/api/superadmin/staff/${user.id}/deactivate`, {
      reason: form.reason || 'Removed by Super Admin',
      transferToUserId: transferToUserId || undefined,
    }),
    `${user.name} deactivated`,
  );

  const reactivate = async (user) => {
    if (!(await confirm({ title: 'Reactivate this account?', message: `${user.name} will be able to sign in again.`, confirmLabel: 'Reactivate' }))) return;
    run(() => api.post(`/api/superadmin/staff/${user.id}/reactivate`, {}), `${user.name} reactivated`);
  };

  const hardDelete = async (user) => {
    const ok = await confirm({
      title: 'Delete permanently?',
      message: `${user.name}'s record will be removed entirely. This cannot be undone.`,
      detail: 'Only possible for accounts with no history. Anyone who has filed or approved anything stays deactivated so the audit trail keeps naming a real person.',
      danger: true,
      confirmPhrase: user.name,
      confirmLabel: 'Delete permanently',
    });
    if (!ok) return;
    run(() => api.delete(`/api/superadmin/staff/${user.id}`), `${user.name} deleted`);
  };

  if (loading) return <SkeletonRows rows={6} />;

  return (
    <section className="space-y-6">
      <AdminPageHeader
        title="Staff Administration"
        subtitle="Create, edit, reset and retire Executive Managers, Field Agents and desk accounts."
      >
        <button
          type="button"
          onClick={() => open('create')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md flex items-center gap-2"
        >
          <i className="fa-solid fa-user-plus" /> Add Staff
        </button>
      </AdminPageHeader>

      <FilterPills
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'ALL', label: 'All', count: staff?.length },
          { value: ROLES.EXEC_ADMIN, label: 'Executive Managers', count: staff?.filter((u) => u.role === ROLES.EXEC_ADMIN).length },
          { value: ROLES.FIELD_AGENT, label: 'Field Agents', count: staff?.filter((u) => u.role === ROLES.FIELD_AGENT).length },
          { value: ROLES.RECEPTIONIST, label: 'Front Desk', count: staff?.filter((u) => u.role === ROLES.RECEPTIONIST).length },
        ]}
      />

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Name &amp; Contact</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">District</th>
                <th className="py-3.5 px-4">Workload</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {rows.map((u) => (
                <tr key={u.id} className={clsx('hover:bg-slate-50 transition', !u.isActive && 'opacity-60')}>
                  <td className="py-3 px-4">
                    {/* Only the name links: the row also carries action buttons,
                        so making the whole row clickable would swallow them. */}
                    <Link to={`/super/staff/${u.id}`} className="font-bold text-slate-900 hover:text-indigo-600 hover:underline">
                      {u.name}
                    </Link>
                    <p className="text-[11px] text-slate-500 font-mono">{fmtPhone(u.phone)}</p>
                    {u.email && <p className="text-[10px] text-slate-400">{u.email}</p>}
                  </td>
                  <td className="py-3 px-4">
                    <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded border uppercase', ROLE_CHIP[u.role])}>
                      {ROLE_LABEL[u.role]}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-700">
                    {u.districtName || <span className="text-slate-400 italic">unassigned</span>}
                    {u.hospitalName && <span className="block text-[10px] text-slate-400">{u.hospitalName}</span>}
                  </td>
                  <td className="py-3 px-4 text-slate-600">{loadSummary(u) ?? '—'}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={clsx(
                      'px-2.5 py-1 rounded-full text-[10px] font-bold',
                      u.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600',
                    )}>
                      {u.isActive ? 'ACTIVE' : 'DEACTIVATED'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1">
                      <Link to={`/super/staff/${u.id}`} title="View profile"
                        className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg inline-block">
                        <i className="fa-solid fa-id-card text-xs" />
                      </Link>
                      <button type="button" title="Edit details" onClick={() => open('edit', u)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
                        <i className="fa-solid fa-pen text-xs" />
                      </button>
                      <button type="button" title="Reset password" onClick={() => open('password', u)}
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg">
                        <i className="fa-solid fa-key text-xs" />
                      </button>
                      {u.isActive ? (
                        <button type="button" title="Deactivate" onClick={() => open('deactivate', u)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg">
                          <i className="fa-solid fa-user-slash text-xs" />
                        </button>
                      ) : (
                        <>
                          <button type="button" title="Reactivate" onClick={() => reactivate(u)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg">
                            <i className="fa-solid fa-user-check text-xs" />
                          </button>
                          <button type="button" title="Delete permanently" onClick={() => hardDelete(u)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg">
                            <i className="fa-solid fa-trash text-xs" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---- Create / Edit ---- */}
      <Modal
        open={dialog?.mode === 'create' || dialog?.mode === 'edit'}
        onClose={() => setDialog(null)}
        title={dialog?.mode === 'create' ? 'Add staff account' : `Edit ${dialog?.user?.name}`}
        size="md"
      >
        <div className="space-y-4">
          <Field label="Full name" required>
            <Input value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Kabir Roy" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Mobile" required hint="Used to sign in">
              <Input maxLength={10} value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })} placeholder="9000000013" />
            </Field>
            <Field label="Email">
              <Input value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="kabir@mediigo.com" />
            </Field>
          </div>

          {dialog?.mode === 'create' && (
            <Field label="Role" required>
              <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {[ROLES.FIELD_AGENT, ROLES.EXEC_ADMIN, ROLES.RECEPTIONIST, ROLES.SUPER_ADMIN].map((r) => (
                  <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                ))}
              </Select>
            </Field>
          )}

          {[ROLES.EXEC_ADMIN, ROLES.FIELD_AGENT].includes(dialog?.mode === 'create' ? form.role : dialog?.user?.role) && (
            <Field
              label="District"
              required={form.role === ROLES.FIELD_AGENT}
              hint={form.role === ROLES.EXEC_ADMIN || dialog?.user?.role === ROLES.EXEC_ADMIN
                ? 'Leave unassigned to create a successor before handing a district over'
                : undefined}
            >
              <Select value={form.districtId ?? ''} onChange={(e) => setForm({ ...form, districtId: e.target.value })}>
                <option value="">Unassigned</option>
                {(districts || []).map((d) => <option key={d._id} value={d._id}>{d.name} ({d.code})</option>)}
              </Select>
            </Field>
          )}

          {dialog?.mode === 'create' && (
            <Field label="Password" hint="Leave blank to generate one — it is shown once">
              <Input value={form.password ?? ''} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Auto-generate" />
            </Field>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setDialog(null)}>Cancel</Button>
            <Button loading={busy} onClick={dialog?.mode === 'create' ? create : save}>
              {dialog?.mode === 'create' ? 'Create account' : 'Save changes'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ---- Password reset ---- */}
      <Modal open={dialog?.mode === 'password'} onClose={() => setDialog(null)} title={`Reset password — ${dialog?.user?.name}`} size="sm">
        <div className="space-y-4">
          <p className="text-xs text-slate-600">Choose how they get a new password.</p>
          <Button className="w-full" loading={busy} onClick={() => resetPassword(dialog.user, false)}>
            <i className="fa-solid fa-key" /> Generate a temporary password
          </Button>
          <p className="text-[11px] text-slate-400 text-center">Shown once — pass it on yourself.</p>
          <div className="border-t border-slate-100 pt-4">
            <Button variant="secondary" className="w-full" loading={busy} onClick={() => resetPassword(dialog.user, true)}>
              <i className="fa-brands fa-whatsapp" /> Send a reset code on WhatsApp
            </Button>
            <p className="text-[11px] text-slate-400 text-center mt-2">
              Needs WABridge configured; while demo mode is on the code is the fixed demo one.
            </p>
          </div>
        </div>
      </Modal>

      {/* ---- Deactivate, with handover when the server demands one ---- */}
      <Modal open={dialog?.mode === 'deactivate'} onClose={() => setDialog(null)} title={`Deactivate ${dialog?.user?.name}?`} size="md">
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            They will be signed out and unable to log in. The record stays, so audit entries and
            onboarded clinics keep naming a real person. You can reactivate them later.
          </p>

          {transfer && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 space-y-3">
              <p className="text-xs font-bold text-amber-900">
                <i className="fa-solid fa-triangle-exclamation mr-1.5" />
                {transfer.message}
              </p>
              <p className="text-[11px] text-amber-800">
                {transfer.load.hospitals} clinic{transfer.load.hospitals === 1 ? '' : 's'} ·{' '}
                {transfer.load.agents} agent{transfer.load.agents === 1 ? '' : 's'} ·{' '}
                {transfer.load.pendingSubmissions} pending approval{transfer.load.pendingSubmissions === 1 ? '' : 's'}
              </p>
              <Field label="Hand the district to" required>
                <Select value={form.transferTo ?? ''} onChange={(e) => setForm({ ...form, transferTo: e.target.value })}>
                  <option value="">Select an Executive Manager…</option>
                  {freeAdmins.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </Select>
              </Field>
              {freeAdmins.length === 0 && (
                <p className="text-[11px] text-rose-700 font-semibold">
                  Every Executive Manager already holds a district. Create an unassigned one first — one admin can only hold one district.
                </p>
              )}
            </div>
          )}

          <Field label="Reason" hint="Recorded in the audit trail">
            <Input value={form.reason ?? ''} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Left the company" />
          </Field>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDialog(null)}>Cancel</Button>
            <Button
              variant="danger"
              loading={busy}
              disabled={Boolean(transfer) && !form.transferTo}
              onClick={() => deactivate(dialog.user, form.transferTo)}
            >
              {transfer ? 'Transfer & deactivate' : 'Deactivate'}
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
