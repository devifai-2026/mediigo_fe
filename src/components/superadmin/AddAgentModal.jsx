import { useState, useEffect } from 'react';
import { api } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useApi } from '../../hooks/useApi.js';

/** Field agent registration — the prototype's modal-new-agent, wired to real user creation. */
export function AddAgentModal({ open, onClose, onDone }) {
  const toast = useToast();
  const { data: districts } = useApi(open ? '/api/superadmin/districts' : null, { skip: !open });
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', districtId: '', password: '' });

  useEffect(() => {
    if (districts?.length && !form.districtId) setForm((f) => ({ ...f, districtId: districts[0]._id }));
  }, [districts, form.districtId]);

  if (!open) return null;

  const INPUT = 'w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-teal-600';
  const LABEL = 'block font-bold text-slate-700 mb-1';

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/api/superadmin/users', {
        name: form.name.trim(),
        phone: form.phone.replace(/\D/g, '').slice(-10),
        role: 'FIELD_AGENT',
        districtId: form.districtId,
        password: form.password,
      });
      toast.success(`Field Agent "${form.name}" registered`);
      setForm({ name: '', phone: '', districtId: districts?.[0]?._id ?? '', password: '' });
      onDone?.();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-100">
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <i className="fa-solid fa-user-plus text-teal-600" /> Register New Field Agent
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4 text-xs">
          <div>
            <label className={LABEL}>Agent Full Name *</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Suresh Raina" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Contact Number *</label>
            <input
              required maxLength={10} value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })}
              placeholder="9812345678" className={INPUT}
            />
          </div>
          <div>
            <label className={LABEL}>Assigned Operational Cluster *</label>
            <select value={form.districtId} onChange={(e) => setForm({ ...form, districtId: e.target.value })} className={`${INPUT} font-semibold`}>
              {(districts || []).map((d) => <option key={d._id} value={d._id}>{d.name} ({d.code})</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Temporary Password *</label>
            <input
              required minLength={8} value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="At least 8 characters" className={INPUT}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2.5 border rounded-xl text-slate-600 font-semibold hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="px-5 py-2.5 bg-teal-600 text-white font-bold rounded-xl shadow-lg hover:bg-teal-700 disabled:opacity-50">
              {busy ? 'Registering…' : 'Register Agent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
