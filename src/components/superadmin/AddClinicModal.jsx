import { useState, useEffect } from 'react';
import { api, unwrap } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useApi } from '../../hooks/useApi.js';
import { AddressAutocomplete } from '../onboarding/AddressAutocomplete.jsx';
import { MapPicker } from '../onboarding/MapPicker.jsx';
import { ClinicPhotosField } from '../onboarding/ClinicPhotosField.jsx';
import { CredentialsModal } from '../onboarding/CredentialsModal.jsx';
import { PasswordInput } from '../ui/Field.jsx';
import {
  nameError, phoneError, pincodeError, passwordError, requiredError, lengthError, collect, serverFieldErrors,
} from '../../lib/validators.js';

/**
 * Super Admin direct onboarding. Layout follows the prototype's
 * modal-new-clinic, but it creates a real submission and approves it in one
 * step rather than pushing an object into an in-memory array.
 */
const BLANK = {
  doctorName: '', clinicName: '', code: '', specialty: '', education: '',
  regNo: '', phone: '', districtId: '', isOnline: 'true',
  line1: '', city: '', pincode: '', state: 'West Bengal',
  lat: null, lng: null, placeId: '', formatted: '', pinSource: '',
  photos: [],
  password: '',
};

const validate = (f) => collect({
  doctorName: nameError(f.doctorName, 'Contact name'),
  clinicName: nameError(f.clinicName, 'Clinic name'),
  code: requiredError(f.code, 'Clinic code') || (/^[A-Z0-9-]{3,20}$/i.test(f.code.trim()) ? '' : 'Use 3-20 letters, digits or dashes'),
  regNo: requiredError(f.regNo, 'Licence number') || lengthError(f.regNo, { label: 'Licence number', min: 3, max: 40 }),
  phone: phoneError(f.phone),
  districtId: requiredError(f.districtId, 'District'),
  line1: requiredError(f.line1, 'Street address') || lengthError(f.line1, { label: 'Street address', min: 5, max: 200 }),
  pincode: pincodeError(f.pincode),
  city: nameError(f.city, 'City'),
  password: passwordError(f.password, { required: false }),
  pin: f.lat == null ? 'Drop a pin on the map for the clinic location' : '',
});

export function AddClinicModal({ open, onClose, onDone }) {
  const toast = useToast();
  const { data: districts } = useApi(open ? '/api/superadmin/districts' : null, { skip: !open });
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [errors, setErrors] = useState({});
  const [issued, setIssued] = useState(null);

  useEffect(() => {
    if (districts?.length && !form.districtId) setForm((f) => ({ ...f, districtId: districts[0]._id }));
  }, [districts, form.districtId]);

  // Clear on close, or the next clinic inherits this one's details — including
  // its map pin, which would put two clinics at the same coordinates.
  useEffect(() => {
    if (!open) { setForm(BLANK); setErrors({}); }
  }, [open]);

  // The logins outlive the form: show them even after it has closed.
  if (issued) {
    return <CredentialsModal result={issued} onClose={() => { setIssued(null); onClose(); }} />;
  }
  if (!open) return null;

  const set = (k) => (e) => {
    setForm({ ...form, [k]: e.target.value });
    if (errors[k]) setErrors(({ [k]: _, ...rest }) => rest);
  };

  const submit = async (e) => {
    e.preventDefault();
    // Approval needs coordinates — a clinic with none never shows in search.
    const problems = validate(form);
    setErrors(problems);
    if (Object.keys(problems).length) {
      toast.error(Object.values(problems)[0]);
      return;
    }
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
          // Pass the Places pin through so the server trusts it instead of
          // re-geocoding the typed address to a slightly different spot.
          ...(form.lat != null && form.lng != null
            ? { geocode: { lat: form.lat, lng: form.lng, placeId: form.placeId, formatted: form.formatted, source: form.pinSource } }
            : {}),
          photos: form.photos,
          primaryContact: { name: form.doctorName, phone: form.phone.replace(/\D/g, '').slice(-10) },
        },
      }));
      await api.post(`/api/onboarding/submissions/${sub._id}/submit`);
      // The password, when typed, becomes the front desk's; otherwise one is
      // generated. Either way it comes back once, in `credentials`.
      const approved = unwrap(await api.post(`/api/admin/submissions/${sub._id}/approve`, form.password ? { password: form.password } : {}));

      toast.success(`Clinic "${form.clinicName}" onboarded and activated`);
      onDone?.();
      if (approved?.credentials?.length) {
        setIssued(approved);
      } else {
        // The contact number already signs someone in, so no desk login was made.
        toast.warn(`No front-desk login was created — ${form.phone} already has a Mediigo account.`, { duration: 9000 });
        onClose();
      }
    } catch (err) {
      setErrors(serverFieldErrors(err));
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const INPUT = 'w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-mg-blue';
  const LABEL = 'block font-semibold text-slate-700 mb-1';
  const inputCls = (k) => `${INPUT} ${errors[k] ? 'border-rose-300 bg-rose-50/40' : ''}`;
  const Err = ({ k }) => (errors[k] ? <p className="mt-1 text-[11px] font-medium text-rose-600">{errors[k]}</p> : null);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 my-8 border border-slate-100">
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <i className="fa-solid fa-hospital text-mg-blue" /> Super Admin Clinic Onboarding
            </h3>
            <p className="text-xs text-slate-500">Directly add and approve a new clinic into the active network.</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg font-semibold">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4 text-xs" noValidate>
          {/* Searching Places fills the address, PIN and coordinates. A clinic
              that is not listed on Google is normal — every field below stays
              editable, so typing the whole thing by hand still works. */}
          {/* Keyed on open: the search box holds its own query text, which
              would otherwise still show the previous clinic on reopen. */}
          <AddressAutocomplete
            key={String(open)}
            onResolved={(r) => setForm((f) => ({
              ...f,
              // Only fill the clinic name if it has not been typed already.
              clinicName: f.clinicName || r.name || '',
              line1: r.line1 || f.line1,
              city: r.city || f.city,
              state: r.state || f.state,
              pincode: r.pincode || f.pincode,
              lat: r.lat, lng: r.lng, placeId: r.placeId, formatted: r.formatted, pinSource: 'PLACES',
            }))}
          />

          <MapPicker
            key={`map-${open}`}
            height="h-60"
            value={form.lat != null ? { lat: form.lat, lng: form.lng } : null}
            onChange={({ lat, lng }) => setForm((f) => ({ ...f, lat, lng, placeId: '', pinSource: 'MAP_PIN' }))}
          />
          <Err k="pin" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Front Desk Contact Name *</label>
              <input value={form.doctorName} onChange={set('doctorName')} placeholder="Dr. Sameer Roy" className={inputCls('doctorName')} />
              <Err k="doctorName" />
            </div>
            <div>
              <label className={LABEL}>Clinic Name *</label>
              <input value={form.clinicName} onChange={set('clinicName')} placeholder="Apollo Care Center" className={inputCls('clinicName')} />
              <Err k="clinicName" />
            </div>
            <div>
              <label className={LABEL}>Clinic Code *</label>
              <input value={form.code} onChange={set('code')} placeholder="MG-KOL-010" className={`${inputCls('code')} uppercase`} />
              <Err k="code" />
            </div>
            <div>
              <label className={LABEL}>Medical Licence No. *</label>
              <input value={form.regNo} onChange={set('regNo')} placeholder="WB-CLIN-100010" className={inputCls('regNo')} />
              <Err k="regNo" />
            </div>
            <div>
              <label className={LABEL}>Contact Phone *</label>
              <input value={form.phone} onChange={(e) => set('phone')({ target: { value: e.target.value.replace(/[^\d+]/g, '') } })} inputMode="numeric" maxLength={13} placeholder="9876543210" className={inputCls('phone')} />
              <Err k="phone" />
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
              <input value={form.line1} onChange={set('line1')} placeholder="DD-12, Sector 1, Salt Lake" className={inputCls('line1')} />
              <Err k="line1" />
            </div>
            <div>
              <label className={LABEL}>PIN Code *</label>
              <input maxLength={6} inputMode="numeric" value={form.pincode} onChange={(e) => set('pincode')({ target: { value: e.target.value.replace(/\D/g, '') } })} placeholder="700064" className={inputCls('pincode')} />
              <Err k="pincode" />
            </div>
          </div>

          <div>
            <label className={LABEL}>City *</label>
            <input value={form.city} onChange={set('city')} placeholder="Kolkata" className={inputCls('city')} />
              <Err k="city" />
          </div>

          <ClinicPhotosField
            value={form.photos}
            onChange={(photos) => setForm((f) => ({ ...f, photos }))}
            onError={(m) => toast.error(m)}
          />

          {/* Fees belong to each doctor, set when the doctor is added — the
              clinic itself has none, so they are not asked for here. */}
          <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-xl space-y-2">
            <h4 className="font-semibold text-mg-navy text-xs uppercase tracking-wider">Front-desk login</h4>
            <p className="text-[11px] text-mg-navy">
              Signs in with the contact phone above. Set a password, or leave it blank and one is generated — either way it is shown once, to copy or send on WhatsApp.
            </p>
            <PasswordInput
              value={form.password}
              onChange={set('password')}
              placeholder="Auto-generate"
              autoComplete="new-password"
              error={errors.password}
            />
            <Err k="password" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2.5 border rounded-lg text-slate-600 font-semibold hover:bg-slate-50">
              Cancel
            </button>
            <button
              type="submit" disabled={busy}
              className="px-5 py-2.5 bg-mg-blue text-white font-semibold rounded-lg shadow-lg hover:bg-mg-navy disabled:opacity-50"
            >
              {busy ? 'Onboarding…' : 'Add & Authorize Clinic'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
