import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useApi } from '../../hooks/useApi.js';
import { api, unwrap } from '../../lib/api.js';
import { phone as fmtPhone } from '../../lib/format.js';
import { AddressAutocomplete } from '../../components/onboarding/AddressAutocomplete.jsx';
import { MapPicker } from '../../components/onboarding/MapPicker.jsx';
import { ClinicPhotosField } from '../../components/onboarding/ClinicPhotosField.jsx';
import { DoctorCard } from '../../components/onboarding/DoctorCard.jsx';
import { Badge, SectionTitle, StepTabs, W_INPUT, WField, WInput, WSection } from '../../components/onboarding/WizardUi.jsx';

const STEPS = ['Clinic Infrastructure', 'OPD Timings & Rules', 'Doctor Profiles', 'Submitted'];

// Must match FACILITIES in mediigo_be/src/modules/doctors/profileFields.js.
const FACILITIES = [
  'In-house Pharmacy', 'Pathology / Blood Lab', 'Digital X-Ray / ECG', 'AC Waiting Lounge',
  'Ambulance Service', 'Free Wi-Fi for Patients', 'Wheelchair Accessible', 'Power Backup (Generator)',
  'Parking', 'Cashless / Insurance',
];
const DAYS = [[1, 'Mon'], [2, 'Tue'], [3, 'Wed'], [4, 'Thu'], [5, 'Fri'], [6, 'Sat'], [0, 'Sun']];
const SLOT_OPTIONS = [5, 8, 10, 12, 15, 20, 30];

const DRAFT_KEY = 'mg-onboard-draft-v2';

const blankDoctor = (council = '', admin = false) => ({
  name: '', phone: '', email: '', councilRegNo: '', registrationCouncil: council,
  qualifications: '', designation: '', specialtyId: '', experienceYears: '',
  fees: { fresh: '500', followup: '250', emergency: '900' },
  photo: null, isClinicAdmin: admin,
});

const BLANK = {
  name: '', code: '', licenseNumber: '', type: 'CLINIC', subscriptionPlan: 'BASIC',
  contactPhone: '', contactEmail: '',
  line1: '', line2: '', city: '', district: '', state: '', pincode: '',
  lat: null, lng: null, placeId: '', formatted: '', pinSource: '',
  consultationRooms: '', facilities: [], photos: [], standeeSerial: '',
  opd: {
    days: [1, 2, 3, 4, 5, 6],
    morning: { enabled: true, startTime: '09:00', endTime: '13:30' },
    evening: { enabled: true, startTime: '17:00', endTime: '21:00' },
    avgConsultMinutes: '10',
    maxTokensPerShift: '',
  },
  reception: { name: '', phone: '', email: '' },
  doctors: [blankDoctor('', true)],
  // How every login below signs in. OTP needs WhatsApp messaging to be live,
  // so a password the agent agrees with the clinic is the default.
  login: { method: 'PASSWORD', password: '' },
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const minutesOf = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const t12 = (t) => { const [h, m] = t.split(':').map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
// "Maharashtra" → "Maharashtra Medical Council": the usual council for the state.
const councilFor = (state) => (state.trim() ? `${state.trim()} Medical Council` : '');

/**
 * Dev-only: a complete, valid clinic like the reference screens, for demos.
 * Phones, licence and registration numbers are random so it can be submitted
 * again and again without tripping the duplicate checks.
 */
const demoForm = (specialties) => {
  const rnd = (n) => String(Math.floor(Math.random() * 10 ** n)).padStart(n, '0');
  const tag = rnd(4);
  const used = new Set();
  const mobile = () => { let m; do { m = `9${'6789'[Math.floor(Math.random() * 4)]}${rnd(8)}`; } while (used.has(m)); used.add(m); return m; };
  const spec = (re) => (specialties.find((x) => re.test(x.name)) ?? specialties[0])?.id ?? '';
  const doc = (name, re, quals, designation, years, admin) => ({
    ...blankDoctor('Maharashtra Medical Council', admin),
    name, phone: mobile(), email: `${name.toLowerCase().replace(/^dr\.\s*/, 'dr.').split(' ')[0]}@sunrise${tag}.com`,
    councilRegNo: `MMC-${rnd(5)}`, qualifications: quals, designation, specialtyId: spec(re), experienceYears: String(years),
  });
  return {
    ...BLANK,
    name: `Sunrise Multispeciality Clinic ${tag}`,
    code: `MG-PUN-${tag}`, licenseNumber: `MH-CLIN-${rnd(6)}`, type: 'POLYCLINIC', subscriptionPlan: 'BASIC',
    contactPhone: mobile(), contactEmail: `contact@sunrise${tag}.com`,
    line1: 'Plot 42, Main Commercial Road', line2: 'Near Central Hospital',
    city: 'Pune', district: 'Pune', state: 'Maharashtra', pincode: '411001',
    lat: 18.5204, lng: 73.8567, placeId: '', formatted: 'Camp, Pune, Maharashtra 411001', pinSource: 'MAP_PIN',
    consultationRooms: '4', facilities: FACILITIES.filter((f) => f !== 'Ambulance Service'), photos: [], standeeSerial: '',
    reception: { name: 'Priya Sharma', phone: mobile(), email: `reception@sunrise${tag}.com` },
    login: { method: 'PASSWORD', password: 'Mediigo@2026' },
    doctors: [
      doc('Dr. Rajesh Sharma', /cardio/i, 'MBBS, MD (Cardiology)', 'Chief Cardiologist', 14, true),
      doc('Dr. Amit Patil', /general|medicine/i, 'MBBS, DNB', 'General Physician', 8, false),
      doc('Dr. Sneha Deshmukh', /ortho/i, 'MBBS, MS (Ortho)', 'Orthopedic Surgeon', 11, false),
      doc('Dr. Rahul Joshi', /pediat|paediat/i, 'MBBS, DCH', 'Pediatrician', 7, false),
    ],
  };
};

const readDraft = () => {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch { return null; }
};

/** Every problem with one step, keyed by field, in words the agent can act on. */
const validate = (step, f) => {
  const e = {};
  if (step === 0) {
    if (f.name.trim().length < 2) e.name = 'Clinic name is required';
    if (!/^\d{10}$/.test(f.contactPhone)) e.contactPhone = 'Enter the clinic’s 10-digit number';
    if (f.contactEmail && !EMAIL_RE.test(f.contactEmail)) e.contactEmail = 'Enter a valid email';
    if (f.code.trim().length < 3) e.code = 'A short unique code is required';
    if (f.licenseNumber.trim().length < 3) e.licenseNumber = 'Licence number is required';
    if (!f.line1.trim()) e.line1 = 'Street address is required';
    if (!f.city.trim()) e.city = 'City is required';
    if (!f.state.trim()) e.state = 'State is required';
    if (!/^\d{6}$/.test(f.pincode)) e.pincode = 'PIN code is 6 digits';
    if (f.lat == null) e.pin = 'Drop a pin on the map — without it patients cannot find the clinic';
  }
  if (step === 1) {
    const { opd } = f;
    if (!opd.days.length) e.days = 'Pick at least one OPD day';
    if (!opd.morning.enabled && !opd.evening.enabled) e.shifts = 'Turn on at least one shift';
    if (opd.morning.enabled && minutesOf(opd.morning.startTime) >= minutesOf(opd.morning.endTime)) e.morning = 'Morning shift must end after it starts';
    if (opd.evening.enabled && minutesOf(opd.evening.startTime) >= minutesOf(opd.evening.endTime)) e.evening = 'Evening shift must end after it starts';
    if (opd.morning.enabled && opd.evening.enabled && minutesOf(opd.morning.endTime) > minutesOf(opd.evening.startTime)) {
      e.evening = 'Evening shift must start after the morning shift ends';
    }
  }
  if (step === 2) {
    if (f.reception.name.trim().length < 2) e['reception.name'] = 'Receptionist name is required';
    if (!/^\d{10}$/.test(f.reception.phone)) e['reception.phone'] = 'Enter a 10-digit mobile';
    if (f.reception.email && !EMAIL_RE.test(f.reception.email)) e['reception.email'] = 'Enter a valid email';
    const phones = [f.reception.phone, ...f.doctors.map((d) => d.phone)];
    const regs = f.doctors.map((d) => d.councilRegNo.trim().toUpperCase());
    f.doctors.forEach((d, i) => {
      const k = (x) => `doctors.${i}.${x}`;
      if (d.name.trim().length < 2) e[k('name')] = 'Name is required';
      if (!/^\d{10}$/.test(d.phone)) e[k('phone')] = '10-digit mobile';
      else if (phones.indexOf(d.phone) !== i + 1) e[k('phone')] = 'Already used above — each login needs its own number';
      if (d.email && !EMAIL_RE.test(d.email)) e[k('email')] = 'Invalid email';
      if (d.councilRegNo.trim().length < 3) e[k('councilRegNo')] = 'Required';
      else if (regs.indexOf(regs[i]) !== i) e[k('councilRegNo')] = 'Same number as another doctor';
      if (d.registrationCouncil.trim().length < 2) e[k('registrationCouncil')] = 'Required';
      if (!d.specialtyId) e[k('specialtyId')] = 'Pick a specialty';
      ['fresh', 'followup', 'emergency'].forEach((fee) => { if (d.fees[fee] === '') e[k(`fees.${fee}`)] = 'Required'; });
    });
    if (!f.doctors.length) e.doctors = 'Add at least one doctor';
    if (f.login.method === 'PASSWORD' && f.login.password.length < 8) e['login.password'] = 'Set a password of at least 8 characters';
  }
  return e;
};

/**
 * Field agent onboarding: the clinic, its OPD timings, its front desk and
 * every doctor, in one submission. Nothing goes live here — the district
 * admin approves it, and that is when every login is created. Progress is
 * kept on this device, so a dropped connection on site loses nothing.
 */
export default function AgentOnboardView() {
  const toast = useToast();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const leadId = params.get('lead');
  const { data: leads } = useApi(leadId ? '/api/onboarding/leads' : null, { skip: !leadId });
  const { data: specialtyList } = useApi('/api/specialties');
  const specialties = specialtyList ?? [];
  const lead = leads?.find((l) => l._id === leadId) ?? null;

  const [draft] = useState(() => (leadId ? null : readDraft()));
  // Spread over BLANK so a draft saved before a field existed still has it.
  const [form, setForm] = useState(() => (draft?.form ? { ...BLANK, ...draft.form } : BLANK));
  const [step, setStep] = useState(() => Math.min(draft?.step ?? 0, 2));
  const [reached, setReached] = useState(() => Math.min(draft?.reached ?? 0, 2));
  const [attempted, setAttempted] = useState({});
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [restoredNote, setRestoredNote] = useState(Boolean(draft));

  // Start from what the agent already noted on the follow-up.
  useEffect(() => {
    if (!lead) return;
    setForm((f) => ({
      ...f,
      name: f.name || lead.clinicName || '',
      line1: f.line1 || lead.address?.line1 || '',
      city: f.city || lead.address?.city || '',
      pincode: f.pincode || lead.address?.pincode || '',
      contactPhone: f.contactPhone || lead.contactPhone || '',
      reception: { ...f.reception, name: f.reception.name || lead.contactName || '' },
    }));
  }, [lead?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Autosave, so a dead battery or a dropped tab does not cost the visit.
  useEffect(() => {
    if (submitted) return;
    // The password stays out of the draft: this device may be shared.
    const kept = { ...form, login: { ...form.login, password: '' } };
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ form: kept, step, reached, at: Date.now() })); } catch { /* private mode */ }
  }, [form, step, reached, submitted]);

  const errors = useMemo(() => (attempted[step] ? validate(step, form) : {}), [attempted, step, form]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setOpd = (patch) => setForm((f) => ({ ...f, opd: { ...f.opd, ...patch } }));
  const setShift = (which, patch) => setForm((f) => ({ ...f, opd: { ...f.opd, [which]: { ...f.opd[which], ...patch } } }));

  const go = (next) => {
    if (next > step) {
      setAttempted((a) => ({ ...a, [step]: true }));
      const problems = validate(step, form);
      if (Object.keys(problems).length) {
        toast.error(Object.values(problems)[0]);
        return;
      }
    }
    // The usual council follows the clinic's state; prefill any doctor without one.
    if (step === 0 && next > 0) {
      setForm((f) => ({ ...f, doctors: f.doctors.map((d) => (d.registrationCouncil ? d : { ...d, registrationCouncil: councilFor(f.state) })) }));
    }
    setStep(next);
    setReached((r) => Math.max(r, next));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const discardDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    setForm(BLANK); setStep(0); setReached(0); setAttempted({}); setRestoredNote(false);
  };

  const suggestCode = () => {
    const city = (form.city || form.name || 'CLN').replace(/[^a-z]/gi, '').slice(0, 3).toUpperCase().padEnd(3, 'X');
    setForm((f) => ({ ...f, code: `MG-${city}-${String(Math.floor(1000 + Math.random() * 9000))}` }));
  };

  const updateDoctor = (i, d) => setForm((f) => ({ ...f, doctors: f.doctors.map((x, j) => (j === i ? d : x)) }));
  const makeAdmin = (i) => setForm((f) => ({ ...f, doctors: f.doctors.map((x, j) => ({ ...x, isClinicAdmin: j === i })) }));
  const removeDoctor = (i) => setForm((f) => {
    const doctors = f.doctors.filter((_, j) => j !== i);
    // Someone must stay admin: the next doctor inherits it.
    if (doctors.length && !doctors.some((d) => d.isClinicAdmin)) doctors[0] = { ...doctors[0], isClinicAdmin: true };
    return { ...f, doctors };
  });
  const addDoctor = () => setForm((f) => ({ ...f, doctors: [...f.doctors, blankDoctor(councilFor(f.state), f.doctors.length === 0)] }));

  const submit = async () => {
    setAttempted((a) => ({ ...a, 2: true }));
    for (const s of [0, 1, 2]) {
      const problems = validate(s, form);
      if (Object.keys(problems).length) {
        setStep(s);
        setAttempted((a) => ({ ...a, [s]: true }));
        toast.error(Object.values(problems)[0]);
        return;
      }
    }
    const byId = new Map(specialties.map((s) => [s.id, s]));
    const { opd } = form;
    setBusy(true);
    try {
      const created = unwrap(await api.post('/api/onboarding/submissions', {
        kind: 'HOSPITAL',
        ...(lead ? { leadId: lead._id } : {}),
        credentials: form.login.method === 'OTP'
          ? { method: 'OTP' }
          : { method: 'PASSWORD', password: form.login.password },
        payload: {
          name: form.name.trim(),
          code: form.code.trim().toUpperCase(),
          type: form.type,
          licenseNumber: form.licenseNumber.trim(),
          subscriptionPlan: form.subscriptionPlan,
          contactPhone: form.contactPhone,
          contactEmail: form.contactEmail.trim(),
          address: { line1: form.line1.trim(), line2: form.line2.trim(), city: form.city.trim(), district: (form.district ?? '').trim(), state: form.state.trim(), pincode: form.pincode },
          geocode: { lat: form.lat, lng: form.lng, placeId: form.placeId, formatted: form.formatted, source: form.pinSource },
          photos: form.photos,
          consultationRooms: form.consultationRooms === '' ? undefined : Number(form.consultationRooms),
          facilities: form.facilities,
          standeeSerial: form.standeeSerial.trim() || undefined,
          opd: {
            days: opd.days,
            morning: opd.morning,
            evening: opd.evening,
            avgConsultMinutes: Number(opd.avgConsultMinutes),
            maxTokensPerShift: opd.maxTokensPerShift === '' ? null : Number(opd.maxTokensPerShift),
          },
          primaryContact: { name: form.reception.name.trim(), phone: form.reception.phone },
          receptionistEmail: form.reception.email.trim(),
          doctors: form.doctors.map((d) => ({
            name: d.name.trim(),
            phone: d.phone,
            email: d.email.trim(),
            councilRegNo: d.councilRegNo.trim().toUpperCase(),
            registrationCouncil: d.registrationCouncil.trim(),
            qualifications: d.qualifications.split(',').map((q) => q.trim()).filter(Boolean),
            designation: (d.designation ?? '').trim(),
            specialty: byId.get(d.specialtyId)?.name ?? '',
            specialtyIds: d.specialtyId ? [d.specialtyId] : [],
            ...(d.experienceYears !== '' ? { experienceYears: Number(d.experienceYears) } : {}),
            fees: { fresh: Number(d.fees.fresh), followup: Number(d.fees.followup), emergency: Number(d.fees.emergency) },
            isClinicAdmin: d.isClinicAdmin,
            photo: d.photo,
          })),
        },
      }));
      await api.post(`/api/onboarding/submissions/${created._id}/submit`);
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      setSubmitted({ form, code: form.code.trim().toUpperCase() });
      setStep(3);
      setReached(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const restart = () => { setSubmitted(null); discardDraft(); };

  // Rough capacity, so the agent can sanity-check the timings with the clinic.
  const perShift = (s) => (s.enabled ? Math.floor((minutesOf(s.endTime) - minutesOf(s.startTime)) / Math.max(1, Number(form.opd.avgConsultMinutes) || 10)) : 0);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mg-card p-4 sm:p-6 space-y-5 sm:space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 sm:pb-5 border-b border-slate-100">
          <div>
            <h1 className="mg-title">Field Agent Onboarding Wizard</h1>
            <p className="text-sm text-slate-500 mt-1">Capture complete clinic infrastructure and every doctor’s credentials in one visit.</p>
          </div>
          <div className="self-start flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-medium whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
            Active Agent: {user?.name}{user?.district?.name ? ` (${user.district.name})` : ''}
          </span>
          {import.meta.env.DEV && !submitted && (
            <button
              type="button"
              onClick={() => { setForm(demoForm(specialties)); setAttempted({}); setRestoredNote(false); toast.success('Demo clinic filled in — click through the steps'); }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-dashed border-slate-300 text-xs font-medium text-slate-500 hover:border-mg-teal hover:text-mg-teal"
              title="Development only — not shown in production builds"
            >
              <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" /> Fill demo data
            </button>
          )}
          </div>
        </header>

        <StepTabs steps={STEPS} current={step} reached={submitted ? 3 : reached} onPick={submitted ? null : (i) => i < 3 && go(i)} />

        {restoredNote && !submitted && (
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-blue-50 border border-blue-100 text-xs text-mg-navy">
            <span><i className="fa-solid fa-floppy-disk mr-1.5" aria-hidden="true" />Restored the onboarding you had in progress on this device.</span>
            <span className="flex gap-3">
              <button type="button" onClick={() => setRestoredNote(false)} className="font-medium hover:underline">Keep going</button>
              <button type="button" onClick={discardDraft} className="font-medium text-rose-600 hover:underline">Start fresh</button>
            </span>
          </div>
        )}
        {lead && !submitted && <Badge tone="blue">From follow-up · {lead.clinicName}</Badge>}

        {step === 0 && (
          <div className="space-y-5">
            <SectionTitle icon="fa-hospital">Step 1: Clinic &amp; facility information</SectionTitle>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <WInput label="Clinic name" required value={form.name} onChange={set('name')} placeholder="Sunrise Multispeciality Clinic" error={errors.name} />
              <WInput label="Clinic contact number" required inputMode="numeric" value={form.contactPhone} onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value.replace(/\D/g, '').slice(0, 10) }))} placeholder="9822144556" error={errors.contactPhone} />
              <WInput label="Clinic official email" type="email" value={form.contactEmail} onChange={set('contactEmail')} placeholder="contact@sunriseclinic.com" error={errors.contactEmail} hint="Optional" inputClassName="font-mono sm:text-[13px]" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <WField label="Clinic code" required error={errors.code} hint="Short and unique">
                {(id) => (
                  <div className="flex gap-2">
                    <input id={id} value={form.code} onChange={set('code')} placeholder="MG-PUN-1001" className={clsx(W_INPUT, 'uppercase font-mono sm:text-[13px]', errors.code && 'border-rose-300')} />
                    <button type="button" onClick={suggestCode} className="shrink-0 px-3 rounded-lg border border-slate-300 text-xs font-medium text-mg-blue hover:bg-blue-50">Suggest</button>
                  </div>
                )}
              </WField>
              <WInput label="Medical licence no." required value={form.licenseNumber} onChange={set('licenseNumber')} placeholder="MH-CLIN-100010" error={errors.licenseNumber} />
              <WField label="Type">
                {(id) => (
                  <select id={id} value={form.type} onChange={set('type')} className={clsx(W_INPUT, 'cursor-pointer')}>
                    <option value="CLINIC">Clinic</option><option value="POLYCLINIC">Polyclinic</option><option value="HOSPITAL">Hospital</option>
                  </select>
                )}
              </WField>
              <WField label="Subscription plan">
                {(id) => (
                  <select id={id} value={form.subscriptionPlan} onChange={set('subscriptionPlan')} className={clsx(W_INPUT, 'cursor-pointer')}>
                    <option value="FREE">Trial (Free)</option><option value="BASIC">Basic</option>
                    <option value="PRO">Pro</option><option value="ENTERPRISE">Enterprise</option>
                  </select>
                )}
              </WField>
            </div>

            <AddressAutocomplete
              onResolved={(r) => setForm((f) => ({
                ...f,
                name: f.name || r.name || '',
                line1: r.line1 || f.line1,
                line2: r.line2 || f.line2,
                city: r.city || f.city,
                district: r.district || f.district || '',
                state: r.state || f.state,
                pincode: r.pincode || f.pincode,
                lat: r.lat, lng: r.lng, placeId: r.placeId, formatted: r.formatted, pinSource: 'PLACES',
              }))}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <WInput className="md:col-span-2" label="Clinic street address" required value={form.line1} onChange={set('line1')} placeholder="Plot 42, Main Commercial Road" error={errors.line1} />
              <WInput label="Landmark" value={form.line2} onChange={set('line2')} placeholder="Near Central Hospital" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <WInput label="City" required value={form.city} onChange={set('city')} placeholder="Pune" error={errors.city} />
              <WInput label="District" value={form.district ?? ''} onChange={set('district')} placeholder="Pune" />
              <WInput label="State" required value={form.state} onChange={set('state')} placeholder="Maharashtra" error={errors.state} />
              <WInput label="PIN code" required inputMode="numeric" value={form.pincode} onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) }))} placeholder="411001" error={errors.pincode} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-4">
              <CoordsField
                className="sm:col-span-2 lg:col-span-1"
                lat={form.lat}
                lng={form.lng}
                error={errors.pin}
                onChange={({ lat, lng }) => setForm((f) => ({ ...f, lat, lng, placeId: '', pinSource: 'MAP_PIN' }))}
              />
              <WInput label="Doctors working at clinic" value={form.doctors.length} disabled hint="From step 3" />
              <WInput label="Consultation rooms" inputMode="numeric" value={form.consultationRooms} onChange={(e) => setForm((f) => ({ ...f, consultationRooms: e.target.value.replace(/\D/g, '').slice(0, 3) }))} placeholder="4" />
              <WInput label="QR standee serial" value={form.standeeSerial} onChange={set('standeeSerial')} placeholder="MG-STD-000007" hint="If deploying one today" inputClassName="uppercase font-mono sm:text-[13px]" />
            </div>

            <MapPicker
              value={form.lat != null ? { lat: form.lat, lng: form.lng } : null}
              onChange={({ lat, lng }) => setForm((f) => ({ ...f, lat, lng, placeId: '', pinSource: 'MAP_PIN' }))}
            />

            <fieldset className="rounded-xl border border-slate-200 bg-mg-surface/60 p-4 sm:p-5">
              <legend className="sr-only">Available clinic facilities</legend>
              <p className="text-xs sm:text-[13px] font-semibold uppercase tracking-wide text-slate-800 mb-3">Available clinic facilities</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-2.5">
                {FACILITIES.map((fac) => (
                  <label key={fac} className="flex items-center gap-2.5 text-sm text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-mg-blue"
                      checked={form.facilities.includes(fac)}
                      onChange={(e) => setForm((f) => ({ ...f, facilities: e.target.checked ? [...f.facilities, fac] : f.facilities.filter((x) => x !== fac) }))}
                    />
                    {fac}
                  </label>
                ))}
              </div>
            </fieldset>

            <ClinicPhotosField value={form.photos} onChange={(photos) => setForm((f) => ({ ...f, photos }))} onError={(m) => toast.error(m)} />

            <Footer onNext={() => go(1)} nextLabel="Next: OPD timings & rules" />
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <SectionTitle icon="fa-clock" tone="text-emerald-600">Step 2: Operational schedule &amp; token rules</SectionTitle>

            <WField label="OPD days" required error={errors.days}>
              <div className="flex flex-wrap gap-2">
                {DAYS.map(([d, label]) => {
                  const on = form.opd.days.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setOpd({ days: on ? form.opd.days.filter((x) => x !== d) : [...form.opd.days, d] })}
                      className={clsx('w-14 h-10 rounded-lg border text-sm font-medium transition', on ? 'bg-mg-blue text-white border-mg-blue' : 'bg-white text-slate-500 border-slate-300 hover:border-slate-400')}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </WField>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[['morning', 'Morning shift timing'], ['evening', 'Evening shift timing']].map(([key, label]) => {
                const s = form.opd[key];
                return (
                  <WField key={key} label={label} error={errors[key] || (key === 'morning' ? errors.shifts : undefined)}>
                    <div className={clsx('h-10 rounded-lg border px-2 flex items-center gap-2 transition focus-within:border-mg-teal focus-within:ring-2 focus-within:ring-mg-teal/20', s.enabled ? 'border-slate-300 bg-white' : 'border-dashed border-slate-300 bg-slate-50')}>
                      <label className="flex items-center gap-1.5 pl-1 text-xs font-medium text-slate-600 cursor-pointer shrink-0">
                        <input type="checkbox" className="w-4 h-4 accent-mg-blue" checked={s.enabled} onChange={(e) => setShift(key, { enabled: e.target.checked })} />
                        On
                      </label>
                      <input type="time" aria-label={`${label} start`} disabled={!s.enabled} value={s.startTime} onChange={(e) => setShift(key, { startTime: e.target.value })} className="flex-1 min-w-0 h-7 px-1.5 rounded-md bg-transparent text-sm font-medium focus:outline-none focus:bg-mg-surface disabled:opacity-40" />
                      <span className="text-slate-400 text-xs">to</span>
                      <input type="time" aria-label={`${label} end`} disabled={!s.enabled} value={s.endTime} onChange={(e) => setShift(key, { endTime: e.target.value })} className="flex-1 min-w-0 h-7 px-1.5 rounded-md bg-transparent text-sm font-medium focus:outline-none focus:bg-mg-surface disabled:opacity-40" />
                    </div>
                  </WField>
                );
              })}
              <WField label="Avg consultation slot" required>
                {(id) => (
                  <select id={id} value={form.opd.avgConsultMinutes} onChange={(e) => setOpd({ avgConsultMinutes: e.target.value })} className={clsx(W_INPUT, 'cursor-pointer')}>
                    {SLOT_OPTIONS.map((m) => <option key={m} value={String(m)}>{m} minutes per patient</option>)}
                  </select>
                )}
              </WField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <WInput label="Max tokens per shift" inputMode="numeric" value={form.opd.maxTokensPerShift} onChange={(e) => setOpd({ maxTokensPerShift: e.target.value.replace(/\D/g, '').slice(0, 3) })} placeholder="No limit" hint="Optional cap per doctor per sitting" />
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm text-slate-700 space-y-1.5">
              <p className="font-semibold text-slate-900"><i className="fa-solid fa-lightbulb text-amber-500 mr-1.5" aria-hidden="true" />Automated queue configuration</p>
              <p>
                Every doctor starts with this pattern as their weekly schedule
                {form.opd.morning.enabled && ` — morning ${t12(form.opd.morning.startTime)}–${t12(form.opd.morning.endTime)} (about ${perShift(form.opd.morning)} patients)`}
                {form.opd.evening.enabled && `${form.opd.morning.enabled ? ',' : ' —'} evening ${t12(form.opd.evening.startTime)}–${t12(form.opd.evening.endTime)} (about ${perShift(form.opd.evening)} patients)`}.
                Mediigo generates digital tokens and live queue boards from it. Each doctor can adjust their own days later under Profile → Availability.
              </p>
            </div>

            <Footer onBack={() => go(0)} onNext={() => go(2)} nextLabel="Next: doctor profiles" />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <SectionTitle icon="fa-user-group" tone="text-amber-500">Step 3: Doctor credentials &amp; front desk</SectionTitle>

            <WSection tone="muted" className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-[13px] sm:text-sm font-semibold uppercase tracking-wide text-slate-900">
                  <i className="fa-solid fa-user-tie text-mg-blue mr-2" aria-hidden="true" />Front-desk receptionist (1 shared login)
                </h3>
                <Badge tone="blue">All-queues access</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <WInput label="Name" required value={form.reception.name} onChange={(e) => setForm((f) => ({ ...f, reception: { ...f.reception, name: e.target.value } }))} placeholder="Priya Sharma" error={errors['reception.name']} />
                <WInput label="Mobile (login)" required inputMode="numeric" value={form.reception.phone} onChange={(e) => setForm((f) => ({ ...f, reception: { ...f.reception, phone: e.target.value.replace(/\D/g, '').slice(0, 10) } }))} placeholder="9876543210" error={errors['reception.phone']} />
                <WInput label="Email" type="email" value={form.reception.email} onChange={(e) => setForm((f) => ({ ...f, reception: { ...f.reception, email: e.target.value } }))} placeholder="reception@clinic.com" error={errors['reception.email']} hint="Optional — can also be used to sign in" inputClassName="font-mono sm:text-[13px]" />
              </div>
            </WSection>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-[13px] sm:text-sm font-semibold uppercase tracking-wide text-slate-900">
                <i className="fa-solid fa-user-doctor text-emerald-600 mr-2" aria-hidden="true" />
                Doctor panel ({form.doctors.length} doctor{form.doctors.length === 1 ? '' : 's'} · 1 clinic admin)
              </h3>
              <Badge tone="yellow">Role-based access enforced</Badge>
            </div>
            {errors.doctors && <p className="text-xs font-medium text-rose-600">{errors.doctors}</p>}

            {form.doctors.map((d, i) => (
              <DoctorCard
                // eslint-disable-next-line react/no-array-index-key
                key={i}
                index={i}
                doctor={d}
                specialties={specialties}
                errors={Object.fromEntries(Object.entries(errors).filter(([k]) => k.startsWith(`doctors.${i}.`)).map(([k, v]) => [k.slice(`doctors.${i}.`.length), v]))}
                onChange={(next) => updateDoctor(i, next)}
                onRemove={() => removeDoctor(i)}
                onMakeAdmin={() => makeAdmin(i)}
                canRemove={form.doctors.length > 1}
                onError={(m) => toast.error(m)}
              />
            ))}

            <button
              type="button"
              onClick={addDoctor}
              disabled={form.doctors.length >= 15}
              className="w-full h-11 rounded-xl border border-dashed border-slate-300 text-sm font-medium text-mg-teal hover:border-mg-teal hover:bg-teal-50/50 transition disabled:opacity-50"
            >
              <i className="fa-solid fa-plus mr-1.5" aria-hidden="true" /> Add another doctor
            </button>

            <LoginMethodSection
              login={form.login}
              error={errors['login.password']}
              onChange={(login) => setForm((f) => ({ ...f, login }))}
            />

            <Footer
              onBack={() => go(1)}
              onNext={submit}
              busy={busy}
              nextLabel="Submit for district approval"
              nextIcon="fa-circle-check"
              tone="green"
            />
          </div>
        )}

        {step === 3 && submitted && (
          <SuccessPanel submitted={submitted} onRestart={restart} />
        )}
      </div>
    </div>
  );
}

/**
 * How the clinic's logins sign in. A password works today; OTP waits on
 * WhatsApp messaging being live, so it is offered but not the default.
 */
function LoginMethodSection({ login, error, onChange }) {
  const [shown, setShown] = useState(false);
  const options = [
    ['PASSWORD', 'fa-key', 'Password', 'You set one password now for every login above. Each person can change it after signing in.'],
    ['OTP', 'fa-brands fa-whatsapp', 'WhatsApp OTP', 'No password — each login signs in with a code sent to its mobile. Needs WhatsApp messaging to be live.'],
  ];
  return (
    <WSection tone="muted" className="space-y-4">
      <h3 className="text-[13px] sm:text-sm font-semibold uppercase tracking-wide text-slate-900">
        <i className="fa-solid fa-lock text-mg-blue mr-2" aria-hidden="true" />How these logins sign in
      </h3>
      <div role="radiogroup" aria-label="Sign-in method" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map(([value, icon, label, hint]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={login.method === value}
            onClick={() => onChange({ ...login, method: value })}
            className={clsx(
              'text-left p-3 rounded-lg border transition',
              login.method === value ? 'border-mg-teal bg-teal-50/60 ring-2 ring-mg-teal/20' : 'border-slate-200 bg-white hover:border-slate-300',
            )}
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <i className={clsx(icon.startsWith('fa-brands') ? icon : `fa-solid ${icon}`, 'text-mg-teal')} aria-hidden="true" />{label}
            </span>
            <span className="block mt-1 text-xs text-slate-500">{hint}</span>
          </button>
        ))}
      </div>
      {login.method === 'PASSWORD' && (
        <WField label="Password for every login" required error={error} hint="At least 8 characters. Not saved on this device." className="sm:max-w-sm">
          {(id) => (
            <div className="relative">
              <input
                id={id}
                type={shown ? 'text' : 'password'}
                autoComplete="new-password"
                value={login.password}
                onChange={(e) => onChange({ ...login, password: e.target.value })}
                className={clsx(W_INPUT, 'pr-10 font-mono', error && 'border-rose-300 bg-rose-50/40')}
              />
              <button
                type="button"
                onClick={() => setShown((v) => !v)}
                aria-label={shown ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 px-3 text-slate-400 hover:text-slate-600"
              >
                <i className={shown ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'} aria-hidden="true" />
              </button>
            </div>
          )}
        </WField>
      )}
    </WSection>
  );
}

/**
 * Reads "18.5204, 73.8567", "18.5204° N, 73.8567° E" or a pasted Google Maps
 * link. Null when it cannot find a plausible pair.
 */
const parseCoords = (raw) => {
  const t = raw.trim();
  const fromUrl = t.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || t.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || t.match(/[?&](?:q|query|ll)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
  let lat; let lng;
  if (fromUrl) {
    lat = Number(fromUrl[1]); lng = Number(fromUrl[2]);
  } else {
    const m = t.match(/^(-?\d+(?:\.\d+)?)\s*°?\s*([NS])?\s*[,\s]\s*(-?\d+(?:\.\d+)?)\s*°?\s*([EW])?$/i);
    if (!m) return null;
    lat = Number(m[1]) * (m[2]?.toUpperCase() === 'S' ? -1 : 1);
    lng = Number(m[3]) * (m[4]?.toUpperCase() === 'W' ? -1 : 1);
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
};

/** The pin as text: follows the map, and moves the map when typed or pasted into. */
function CoordsField({ lat, lng, onChange, error, className }) {
  const shown = lat != null ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : '';
  const [text, setText] = useState(shown);
  const [bad, setBad] = useState(false);
  useEffect(() => { setText(shown); setBad(false); }, [shown]);

  const commit = () => {
    if (!text.trim() || text === shown) { setText(shown); setBad(false); return; }
    const c = parseCoords(text);
    if (!c) { setBad(true); return; }
    setBad(false);
    onChange(c);
  };

  return (
    <WField
      className={className}
      label="Google Maps location / coordinates"
      required
      error={bad ? 'Use “lat, lng” (e.g. 18.5204, 73.8567) or paste a Google Maps link' : error}
      hint={lat != null ? 'Pin dropped — drag it on the map to fine-tune' : 'Paste from Google Maps, or drop the pin on the map below'}
    >
      {(id) => (
        <div className="relative">
          <i className={clsx('fa-solid fa-location-dot absolute left-3 top-1/2 -translate-y-1/2 text-xs', lat != null ? 'text-mg-teal' : 'text-slate-400')} aria-hidden="true" />
          <input
            id={id}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } }}
            placeholder="18.5204, 73.8567"
            className={clsx(W_INPUT, 'pl-8 font-mono sm:text-[13px]', (bad || error) && 'border-rose-300 bg-rose-50/40')}
          />
        </div>
      )}
    </WField>
  );
}

function Footer({ onBack, onNext, nextLabel, nextIcon = 'fa-arrow-right', busy, tone = 'navy' }) {
  return (
    <div className="flex items-center justify-between gap-3 pt-3">
      {onBack ? (
        <button type="button" onClick={onBack} className="h-10 sm:h-11 px-4 sm:px-5 rounded-lg border border-slate-300 bg-white hover:bg-mg-surface text-sm font-medium text-slate-700">
          <i className="fa-solid fa-arrow-left mr-2" aria-hidden="true" />Back
        </button>
      ) : <span />}
      <button
        type="button"
        onClick={onNext}
        disabled={busy}
        className={clsx(
          'h-10 sm:h-11 px-4 sm:px-6 rounded-lg text-sm font-semibold text-white shadow-sm transition disabled:opacity-60 inline-flex items-center gap-2',
          tone === 'green' ? 'bg-mg-teal hover:bg-mg-tealDark' : 'bg-mg-blue hover:bg-mg-navy',
        )}
      >
        {busy ? <i className="fa-solid fa-circle-notch fa-spin" aria-hidden="true" /> : tone === 'green' && <i className={clsx('fa-solid', nextIcon)} aria-hidden="true" />}
        {busy ? 'Submitting…' : nextLabel}
        {!busy && tone !== 'green' && <i className={clsx('fa-solid', nextIcon)} aria-hidden="true" />}
      </button>
    </div>
  );
}

/**
 * Honest about what happened: the submission is with the district admin.
 * Logins exist only once it is approved, and the approver hands each one over.
 */
function SuccessPanel({ submitted, onRestart }) {
  const { form, code } = submitted;
  const rows = [
    { key: 'r', label: `Receptionist: ${form.reception.name}`, login: form.reception.phone, email: form.reception.email, admin: false },
    ...form.doctors.map((d, i) => {
      const role = [d.isClinicAdmin && 'Clinic admin', d.designation?.trim()].filter(Boolean).join(' – ');
      return { key: `d${i}`, label: `${d.name}${role ? ` (${role})` : ''}`, login: d.phone, email: d.email, admin: d.isClinicAdmin };
    }),
  ];
  return (
    <div className="py-4 sm:py-8 flex flex-col items-center text-center space-y-5">
      <span className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 grid place-items-center text-xl ring-8 ring-emerald-50/50">
        <i className="fa-solid fa-check" aria-hidden="true" />
      </span>
      <div>
        <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Clinic &amp; doctor profiles submitted</h2>
        <p className="text-sm text-slate-500 mt-2 max-w-lg">
          <strong className="text-slate-800">{form.name}</strong> ({code}) and {form.doctors.length} doctor
          {form.doctors.length === 1 ? '' : 's'} are with your district admin for approval. Every login below is created the
          moment it is approved{form.login.method === 'OTP'
            ? ' and signs in with a WhatsApp code sent to its mobile.'
            : ' and signs in with the password you set. Share it with the clinic — each person can change it from their profile.'}
        </p>
      </div>

      <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-mg-surface/60 p-4 text-left">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Accounts to be created on approval</p>
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.key} className={clsx('flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border text-sm', r.admin ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200')}>
              <span className="min-w-0">
                <span className="block font-medium text-slate-800 truncate">{r.label}</span>
                {r.email && <span className="block font-mono text-[11px] text-slate-500 truncate">{r.email}</span>}
              </span>
              <span className="font-mono text-[13px] text-mg-blue shrink-0">+91 {fmtPhone(r.login)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" onClick={onRestart} className="h-10 sm:h-11 px-5 rounded-lg border border-slate-300 bg-white hover:bg-mg-surface text-sm font-medium text-slate-700">
          Onboard another clinic
        </button>
        <Link to="/a/submissions" className="h-10 sm:h-11 px-5 rounded-lg bg-mg-blue hover:bg-mg-navy text-sm font-semibold text-white shadow-sm inline-flex items-center gap-2">
          Track approval <i className="fa-solid fa-arrow-right" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
