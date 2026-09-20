import { useState, useEffect } from 'react';
import { api, unwrap } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useApi } from '../../hooks/useApi.js';

/**
 * Super Admin direct onboarding. Layout follows the prototype's
 * modal-new-clinic, but it creates a real submission and approves it in one
 * step rather than pushing an object into an in-memory array.
 */
export function AddClinicModal({ open, onClose, onDone }) {
  const toast = useToast();
  const { data: districts } = useApi(open ? '/api/superadmin/districts' : null, { skip: !open });
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    doctorName: '', clinicName: '', code: '', specialty: '', education: '',
    regNo: '', phone: '', districtId: '', isOnline: 'true',
    line1: '', city: '', pincode: '', state: 'West Bengal',
    feeFresh: 500, feeFollowup: 300, feeEmergency: 800,
  });

  useEffect(() => {
    if (districts?.length && !form.districtId) setForm((f) => ({ ...f, districtId: districts[0]._id }));
  }, [districts, form.districtId]);

  if (!open) return null;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      // Create the clinic submission, then immediately authorize it — the
      // prototype's "Add & Authorize" in one action.
      const sub = unwrap(await api.post('/api/onboarding/submissions', {
        kind: 'HOSPITAL',
        districtId: form.districtId,
        payload: {
          name: form.clinicName.trim(),
          code: form.code.trim().toUpperCase(),
          licenseNumber: form.regNo.trim(),
          type: 'CLINIC',
          subscriptionPlan: 'BASIC',
          address: { line1: form.line1, city: form.city, state: form.state, pincode: form.pincode },
          primaryContact: { name: form.doctorName, phone: form.phone.replace(/\D/g, '').slice(-10) },
        },
      }));
      await api.post(`/api/onboarding/submissions/${sub._id}/submit`);
      await api.post(`/api/admin/submissions/${sub._id}/approve`);

      toast.success(`Clinic "${form.clinicName}" onboarded and activated`);
      onDone?.();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const INPUT = 'w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-indigo-600';
  const LABEL = 'block font-bold text-slate-700 mb-1';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 my-8 border border-slate-100">
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <i className="fa-solid fa-hospital text-indigo-600" /> Super Admin Clinic Onboarding
            </h3>
            <p className="text-xs text-slate-500">Directly add and approve a new clinic into the active network.</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg font-bold">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Front Desk Contact Name *</label>
              <input required value={form.doctorName} onChange={set('doctorName')} placeholder="Dr. Sameer Roy" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Clinic Name *</label>
              <input required value={form.clinicName} onChange={set('clinicName')} placeholder="Apollo Care Center" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Clinic Code *</label>
              <input required value={form.code} onChange={set('code')} placeholder="MG-KOL-010" className={`${INPUT} uppercase`} />
            </div>
            <div>
              <label className={LABEL}>Medical Licence No. *</label>
              <input required value={form.regNo} onChange={set('regNo')} placeholder="WB-CLIN-100010" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Contact Phone *</label>
              <input required value={form.phone} onChange={set('phone')} placeholder="9876543210" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>District *</label>
              <select value={form.districtId} onChange={set('districtId')} className={`${INPUT} font-medium`}>
                {(districts || []).map((d) => <option key={d._id} value={d._id}>{d.name} ({d.code})</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className={LABEL}>Street Address *</label>
              <input required value={form.line1} onChange={set('line1')} placeholder="DD-12, Sector 1, Salt Lake" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>PIN Code *</label>
              <input required maxLength={6} value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, '') })} placeholder="700064" className={INPUT} />
            </div>
          </div>

          <div>
            <label className={LABEL}>City *</label>
            <input required value={form.city} onChange={set('city')} placeholder="Kolkata" className={INPUT} />
          </div>

          <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl space-y-3">
            <h4 className="font-bold text-indigo-900 text-xs uppercase tracking-wider">Default Consultation Fees</h4>
            <div className="grid grid-cols-3 gap-3">
              {[['feeFresh', 'Fresh Consult (₹)'], ['feeFollowup', 'Follow-Up (₹)'], ['feeEmergency', 'Emergency (₹)']].map(([k, label]) => (
                <div key={k}>
                  <label className="block font-semibold text-slate-700 mb-1">{label}</label>
                  <input
                    type="number" min="0" value={form[k]}
                    onChange={(e) => setForm({ ...form, [k]: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 font-bold text-slate-800"
                  />
                </div>
              ))}
            </div>
            <p className="text-[10px] text-indigo-800">
              A front-desk login is created on approval and its temporary password is shown once.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2.5 border rounded-xl text-slate-600 font-semibold hover:bg-slate-50">
              Cancel
            </button>
            <button
              type="submit" disabled={busy}
              className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {busy ? 'Onboarding…' : 'Add & Authorize Clinic'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
