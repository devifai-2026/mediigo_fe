import { useState, useEffect } from 'react';
import { api } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useApi } from '../../hooks/useApi.js';
import { unwrap } from '../../lib/api.js';
import { CredentialsModal } from '../onboarding/CredentialsModal.jsx';
import { PasswordInput } from '../ui/Field.jsx';
import { nameError, phoneError, passwordError, requiredError, collect, serverFieldErrors } from '../../lib/validators.js';
import { asList } from '../../lib/list.js';

/** Field agent registration — the prototype's modal-new-agent, wired to real user creation. */
export function AddAgentModal({ open, onClose, onDone }) {
  const toast = useToast();
  const { data: districts } = useApi(open ? '/api/superadmin/districts' : null, { skip: !open });
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', districtId: '', password: '' });
  const [errors, setErrors] = useState({});
  const [issued, setIssued] = useState(null);

  useEffect(() => {
    if (districts?.length && !form.districtId) setForm((f) => ({ ...f, districtId: districts[0]._id }));
  }, [districts, form.districtId]);

  if (issued) return <CredentialsModal title="Field agent registered" result={issued} onClose={() => { setIssued(null); onClose(); }} />;
  if (!open) return null;

  const INPUT = 'w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-mg-teal';
  const LABEL = 'block font-semibold text-slate-700 mb-1';
  const cls = (k) => `${INPUT} ${errors[k] ? 'border-rose-300 bg-rose-50/40' : ''}`;
  const Err = ({ k }) => (errors[k] ? <p className="mt-1 text-[11px] font-medium text-rose-600">{errors[k]}</p> : null);
  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErrors(({ [k]: _, ...rest }) => rest); };

  const submit = async (e) => {
    e.preventDefault();
    const problems = collect({
      name: nameError(form.name),
      phone: phoneError(form.phone),
      districtId: requiredError(form.districtId, 'District'),
      password: passwordError(form.password, { required: false }),
    });
    setErrors(problems);
    if (Object.keys(problems).length) return;
    setBusy(true);
    try {
      // The staff endpoint, which checks the number, duplicates and the
      // district; the old /users route did none of that.
      const out = unwrap(await api.post('/api/superadmin/staff', {
        name: form.name.trim(),
        phone: form.phone.replace(/\D/g, '').slice(-10),
        role: 'FIELD_AGENT',
        districtId: form.districtId,
        password: form.password || undefined,
      }));
      toast.success(`Field Agent "${out.user.name}" registered`);
      setForm({ name: '', phone: '', districtId: districts?.[0]?._id ?? '', password: '' });
      onDone?.();
      setIssued({
        credentials: [{
          role: 'FIELD_AGENT', name: out.user.name, phone: out.user.phone,
          tempPassword: out.temporaryPassword ?? form.password, signIn: 'TEMP_PASSWORD',
        }],
      });
    } catch (err) {
      setErrors(serverFieldErrors(err));
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-100">
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <i className="fa-solid fa-user-plus text-mg-teal" /> Register New Field Agent
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 font-semibold">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4 text-xs" noValidate>
          <div>
            <label className={LABEL}>Agent Full Name *</label>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Suresh Raina" className={cls('name')} />
            <Err k="name" />
          </div>
          <div>
            <label className={LABEL}>Contact Number *</label>
            <input
              inputMode="numeric" maxLength={10} value={form.phone}
              onChange={(e) => set('phone', e.target.value.replace(/\D/g, ''))}
              placeholder="9812345678" className={cls('phone')}
            />
            <Err k="phone" />
          </div>
          <div>
            <label className={LABEL}>Assigned Operational Cluster *</label>
            <select value={form.districtId} onChange={(e) => set('districtId', e.target.value)} className={`${cls('districtId')} font-semibold`}>
              {(asList(districts)).map((d) => <option key={d._id} value={d._id}>{d.name} ({d.code})</option>)}
            </select>
            <Err k="districtId" />
          </div>
          <div>
            <label className={LABEL}>Password</label>
            <PasswordInput
              value={form.password} autoComplete="new-password" error={errors.password}
              onChange={(e) => set('password', e.target.value)}
              placeholder="Leave blank to generate one"
            />
            <Err k="password" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2.5 border rounded-lg text-slate-600 font-semibold hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="px-5 py-2.5 bg-mg-teal text-white font-semibold rounded-lg shadow-lg hover:bg-mg-tealDark disabled:opacity-50">
              {busy ? 'Registering…' : 'Register Agent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
