import { useState } from 'react';
import { useToast } from '../../context/ToastContext.jsx';
import { api, unwrap } from '../../lib/api.js';
import { Button } from '../../components/ui/Button.jsx';
import { Field, Input, Select } from '../../components/ui/Field.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { AddressAutocomplete } from '../../components/onboarding/AddressAutocomplete.jsx';
import clsx from 'clsx';

const STEPS = ['Clinic', 'Address', 'Contact', 'Review'];

export default function AgentOnboardView() {
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: '', code: '', licenseNumber: '', type: 'CLINIC', subscriptionPlan: 'BASIC',
    line1: '', line2: '', city: '', state: 'West Bengal', pincode: '',
    lat: null, lng: null, placeId: '', formatted: '',
    contactName: '', contactPhone: '', standeeSerial: '',
  });

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const canAdvance = [
    form.name.trim() && form.licenseNumber.trim() && form.code.trim(),
    form.line1.trim() && form.city.trim() && /^\d{6}$/.test(form.pincode),
    form.contactName.trim() && /^\d{10}$/.test(form.contactPhone),
    true,
  ][step];

  const submit = async () => {
    setBusy(true);
    try {
      const created = unwrap(await api.post('/api/onboarding/submissions', {
        kind: 'HOSPITAL',
        payload: {
          name: form.name.trim(), code: form.code.trim().toUpperCase(), type: form.type,
          licenseNumber: form.licenseNumber.trim(), subscriptionPlan: form.subscriptionPlan,
          address: { line1: form.line1, line2: form.line2, city: form.city, state: form.state, pincode: form.pincode },
          // Already pinned by Places — approval reuses this instead of re-geocoding.
          ...(form.lat ? { geocode: { lat: form.lat, lng: form.lng, placeId: form.placeId, formatted: form.formatted } } : {}),
          primaryContact: { name: form.contactName, phone: form.contactPhone },
          standeeSerial: form.standeeSerial || undefined,
        },
      }));
      // Geocoding happens on submit so the reviewing admin sees a real pin.
      await api.post(`/api/onboarding/submissions/${created._id}/submit`);
      toast.success('Sent to your district admin for verification');
      setForm({
        name: '', code: '', licenseNumber: '', type: 'CLINIC', subscriptionPlan: 'BASIC',
        line1: '', line2: '', city: '', state: 'West Bengal', pincode: '',
    lat: null, lng: null, placeId: '', formatted: '',
        contactName: '', contactPhone: '', standeeSerial: '',
      });
      setStep(0);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Onboard a clinic</h2>
        <p className="text-xs text-slate-500">Capture the details on site — your district admin verifies before it goes live</p>
      </div>

      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => (
          <div key={s} className="flex-1 flex items-center gap-1">
            <div className={clsx('flex-1 h-1.5 rounded-full transition-colors', i <= step ? 'bg-teal-600' : 'bg-slate-200')} />
          </div>
        ))}
      </div>
      <p className="text-[11px] font-bold text-teal-700 uppercase tracking-wider">
        Step {step + 1} of {STEPS.length} · {STEPS[step]}
      </p>

      <div className="glass-card rounded-3xl p-6 space-y-4">
        {step === 0 && (
          <>
            <Field label="Clinic name" required>
              <Input value={form.name} onChange={set('name')} placeholder="Sunrise Multispeciality" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Clinic code" required hint="Short unique code">
                <Input value={form.code} onChange={set('code')} placeholder="MG-KOL-010" className="uppercase" />
              </Field>
              <Field label="Type">
                <Select value={form.type} onChange={set('type')}>
                  <option value="CLINIC">Clinic</option><option value="POLYCLINIC">Polyclinic</option><option value="HOSPITAL">Hospital</option>
                </Select>
              </Field>
            </div>
            <Field label="Medical licence number" required>
              <Input value={form.licenseNumber} onChange={set('licenseNumber')} placeholder="WB-CLIN-100010" />
            </Field>
            <Field label="Subscription plan">
              <Select value={form.subscriptionPlan} onChange={set('subscriptionPlan')}>
                <option value="FREE">Trial (Free)</option><option value="BASIC">Basic</option>
                <option value="PRO">Pro</option><option value="ENTERPRISE">Enterprise</option>
              </Select>
            </Field>
          </>
        )}

        {step === 1 && (
          <>
            <AddressAutocomplete
              onResolved={(r) => setForm((f) => ({
                ...f,
                // Only overwrite the clinic name if the agent has not typed one.
                name: f.name || r.name || '',
                line1: r.line1 || f.line1,
                line2: r.line2 || '',
                city: r.city || f.city,
                state: r.state || f.state,
                pincode: r.pincode || f.pincode,
                lat: r.lat, lng: r.lng, placeId: r.placeId, formatted: r.formatted,
              }))}
            />

            {form.lat && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 flex items-start gap-2">
                <Icon name="location" className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>
                  Location pinned at {form.lat.toFixed(5)}, {form.lng.toFixed(5)} — this clinic will appear
                  correctly in patient search. Edit any field below if Google got it wrong.
                </span>
              </div>
            )}

            <Field label="Address line 1" required>
              <Input value={form.line1} onChange={set('line1')} placeholder="DD-12, Sector 1, Salt Lake" />
            </Field>
            <Field label="Address line 2">
              <Input value={form.line2} onChange={set('line2')} placeholder="Near the community hall" />
            </Field>
            <div className="grid grid-cols-3 gap-4">
              <Field label="City" required><Input value={form.city} onChange={set('city')} placeholder="Kolkata" /></Field>
              <Field label="State" required><Input value={form.state} onChange={set('state')} placeholder="West Bengal" /></Field>
              <Field label="PIN code" required error={form.pincode && !/^\d{6}$/.test(form.pincode) ? 'Must be 6 digits' : undefined}>
                <Input inputMode="numeric" maxLength={6} value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, '') })} placeholder="700064" />
              </Field>
            </div>
            <p className="text-[11px] text-slate-500 flex items-start gap-1.5">
              <Icon name="location" className="w-3.5 h-3.5 mt-0.5 shrink-0 text-teal-600" />
              We geocode this address when you submit, so the clinic appears correctly on the patient map.
            </p>
          </>
        )}

        {step === 2 && (
          <>
            <Field label="Front desk contact name" required>
              <Input value={form.contactName} onChange={set('contactName')} placeholder="Riya Sen" />
            </Field>
            <Field label="Front desk mobile" required hint="A receptionist login is created on approval">
              <Input inputMode="numeric" maxLength={10} value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value.replace(/\D/g, '') })} placeholder="9000000041" />
            </Field>
            <Field label="QR standee serial" hint="Optional — if you are deploying one today">
              <Input value={form.standeeSerial} onChange={set('standeeSerial')} placeholder="MG-STD-000007" className="uppercase" />
            </Field>
          </>
        )}

        {step === 3 && (
          <div className="space-y-3 text-xs">
            {[
              ['Clinic', `${form.name} (${form.code})`],
              ['Licence', form.licenseNumber],
              ['Address', `${form.line1}, ${form.city} ${form.pincode}`],
              ['Contact', `${form.contactName} · ${form.contactPhone}`],
              ['Plan', form.subscriptionPlan],
              ...(form.standeeSerial ? [['Standee', form.standeeSerial]] : []),
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 py-2 border-b border-slate-100">
                <span className="text-slate-500">{k}</span>
                <span className="font-bold text-slate-900 text-right">{v}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          {step > 0 && <Button variant="secondary" onClick={() => setStep(step - 1)} className="flex-1">Back</Button>}
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canAdvance} className="flex-1">Continue</Button>
          ) : (
            <Button onClick={submit} loading={busy} className="flex-1">Submit for verification</Button>
          )}
        </div>
      </div>
    </div>
  );
}
