import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useApi } from '../../hooks/useApi.js';
import { useQueueSnapshot } from '../../hooks/useQueueSnapshot.js';
import { useSocketEvent } from '../../hooks/useSocketEvent.js';
import { EVENTS } from '../../lib/socketEvents.js';
import * as storage from '../../lib/storage.js';
import { api, unwrap } from '../../lib/api.js';
import { PHARMACY_STATUS, ROLES, TOKEN_STATUS } from '../../lib/constants.js';
import { inr, phone, token } from '../../lib/format.js';
import { Button } from '../../components/ui/Button.jsx';
import { Field, INPUT, Input, Select, Textarea } from '../../components/ui/Field.jsx';
import { DeskCard, DoctorPicker, EmptyNote, IconTile, LoadError, PageHeader, Pill, PrintPortal, RefreshButton, SectionHead } from '../../components/desk/ui.jsx';
import { RxHeader, RxPrint, RxViewModal } from '../../components/desk/RxPrint.jsx';
import { isoToday } from '../../components/desk/DateRangePicker.jsx';
import { patientLine } from '../../components/desk/deskFormat.js';
import { SuggestInput } from '../../components/desk/rx/SuggestInput.jsx';
import { MedicineRows, blankMed, clearMedicineCache, isBlank, resolveSpoken } from '../../components/desk/rx/MedicineRows.jsx';
import { DictationBar } from '../../components/desk/rx/DictationBar.jsx';
import { parseDictation, useDictation } from '../../components/desk/rx/dictation.js';

const STATUS_LABEL = {
  [TOKEN_STATUS.IN_CHAMBER]: 'In chamber',
  [TOKEN_STATUS.WAITING]: 'Waiting',
  [TOKEN_STATUS.COMPLETED]: 'Seen',
  [TOKEN_STATUS.SKIPPED]: 'Skipped',
};

// Mirrors the server's symptomsOf(): the complaint plus declared conditions.
const symptomsOf = (p) => [p?.complaint, ...(p?.conditions ?? []).map((c) => `k/c/o ${c}`)].filter(Boolean).join('; ');

const VISIT_STATUS = { COMPLETED: 'Seen', IN_CHAMBER: 'In chamber', WAITING: 'Waiting', SKIPPED: 'Skipped', RESCHEDULE_NEEDED: 'Rescheduling' };

const visitDate = (iso) => (iso
  ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  : '');

/**
 * Rx / EMR.
 *
 * The doctor writes a prescription for a patient from today's list; it is
 * saved to that patient's record and printed. Beside the pad, the EMR looks
 * the patient up by mobile number and shows their last three visits at this
 * clinic — the full history is in the footfall register.
 *
 * The front desk sees the same record, read-only, to reprint a pad or answer
 * "what was I given?" at the counter.
 */
export default function RxView() {
  const { user, role } = useAuth();
  const toast = useToast();
  const isDoctor = role === ROLES.DOCTOR;
  const [params, setParams] = useSearchParams();

  const { data: doctors } = useApi(isDoctor ? null : '/api/doctors', { skip: isDoctor });
  const [pickedDoctor, setPickedDoctor] = useState('');
  useEffect(() => {
    if (!isDoctor && !pickedDoctor && doctors?.length) setPickedDoctor(doctors[0]._id);
  }, [doctors, pickedDoctor, isDoctor]);
  const doctorId = isDoctor ? user?.doctorId : pickedDoctor;

  const { snapshot, refetch: refetchQueue } = useQueueSnapshot(doctorId || null);
  // The doctor's record: header details and fees for the Total Due default.
  const { data: doctorRec } = useApi(doctorId ? `/api/doctors/${doctorId}` : null, { skip: !doctorId });
  const patients = useMemo(
    () => (snapshot?.tokens ?? []).filter((t) => STATUS_LABEL[t.status]),
    [snapshot],
  );

  const wanted = params.get('token');
  const fallback = patients.find((t) => t.status === TOKEN_STATUS.IN_CHAMBER) ?? patients[0];
  const patient = patients.find((t) => t.tokenId === wanted) ?? fallback ?? null;
  const pick = (tokenId) => setParams(tokenId ? { token: tokenId } : {}, { replace: true });

  // EMR lookup is by mobile number, starting from the selected patient's.
  const [phoneQuery, setPhoneQuery] = useState('');
  useEffect(() => { setPhoneQuery(patient?.phone || ''); }, [patient?.tokenId]); // eslint-disable-line react-hooks/exhaustive-deps
  const digits = phoneQuery.replace(/\D/g, '').slice(-10);
  const lookupUrl = digits.length === 10 ? `/api/prescriptions/lookup?phone=${digits}&visits=30` : null;
  const { data: history, loading: historyLoading, error: historyError, refetch: refetchHistory } = useApi(lookupUrl, { skip: !lookupUrl });

  // This patient's previous prescription here, for "Repeat last Rx". Matched on
  // the name too: a family sharing one phone shares the lookup.
  const lastRx = useMemo(() => {
    const visit = (history?.visits ?? []).find((v) => v.tokenId !== patient?.tokenId
      && v.prescriptions.length && (!patient?.name || v.patientName === patient.name));
    return visit ? { ...visit.prescriptions[0], date: visit.date } : null;
  }, [history, patient?.tokenId, patient?.name]);

  // Whether this clinic has a pharmacy login to send prescriptions to.
  const { data: pharmacy } = useApi('/api/pharmacy/status');
  const hasPharmacy = Boolean(pharmacy?.hasPharmacy);
  // The pharmacy dispensing one of this doctor's pads updates the EMR live.
  useSocketEvent(EVENTS.PHARMACY_RX_UPDATED, () => { if (lookupUrl) refetchHistory(); }, [lookupUrl]);

  const sendLater = async (rx) => {
    try {
      await api.post(`/api/prescriptions/${rx._id}/send-to-pharmacy`);
      toast.success(`Sent to the pharmacy for ${rx.patientSnapshot?.name || 'the patient'}`);
      refetchHistory();
    } catch (e) {
      toast.error(e?.response?.data?.error?.message || e.message);
    }
  };

  const [printing, setPrinting] = useState(null);
  const [viewing, setViewing] = useState(null);
  const clinicName = doctorRec?.hospital?.name || user?.clinic?.name || '';
  const footfallPath = `${isDoctor ? '/d' : '/r'}/analytics`;

  return (
    <div className="space-y-5">
      <PageHeader
        icon="fa-file-prescription"
        title={isDoctor ? 'Digital Rx & Prescription Writer' : 'Patient EMR & Prescriptions'}
        subtitle={isDoctor
          ? 'Write chamber prescriptions and keep each patient’s medical record'
          : 'Look up a patient’s prescriptions and reprint a pad'}
        badge={patient && (
          <Pill tone="teal">
            {patient.status === TOKEN_STATUS.IN_CHAMBER ? 'In Chamber' : 'Selected'}: <strong className="font-semibold">{token(patient.tokenNumber)}</strong>
          </Pill>
        )}
      >
        <RefreshButton onRefresh={() => { refetchQueue(); if (lookupUrl) refetchHistory(); }} />
      </PageHeader>

      {!isDoctor && doctors?.length > 0 && (
        <DeskCard className="p-3 sm:p-4">
          <DoctorPicker doctors={doctors} value={pickedDoctor} onChange={(id) => { setPickedDoctor(id); pick(null); }} />
        </DeskCard>
      )}

      {!patients.length ? (
        <DeskCard>
          <EmptyNote icon="fa-user-clock" title="No patients today yet" hint="Patients registered for today appear here to prescribe for." />
        </DeskCard>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-7">
            {isDoctor ? (
              <RxWriter
                patients={patients}
                patient={patient}
                doctor={doctorRec}
                clinicName={clinicName}
                lastRx={lastRx}
                hasPharmacy={hasPharmacy}
                onPick={pick}
                onSaved={(rx, print) => {
                  refetchHistory();
                  if (print) setPrinting(rx);
                }}
                toast={toast}
              />
            ) : (
              <PatientList patients={patients} selected={patient} onPick={pick} />
            )}
          </div>

          <div className="lg:col-span-5">
            {historyError && !history && <LoadError error={historyError} onRetry={refetchHistory} what="this patient’s records" className="mb-4" />}
            <EmrLookup
              phoneQuery={phoneQuery}
              onPhone={setPhoneQuery}
              valid={Boolean(lookupUrl)}
              history={lookupUrl ? history : null}
              loading={historyLoading}
              onView={setViewing}
              onPrint={setPrinting}
              onSend={isDoctor && hasPharmacy ? sendLater : null}
              myDoctorId={isDoctor ? user?.doctorId : null}
              isDoctor={isDoctor}
              patientName={patient?.name}
              footfallPath={footfallPath}
            />
          </div>
        </div>
      )}

      <RxViewModal rx={viewing} clinicName={clinicName} onClose={() => setViewing(null)} onPrint={(rx) => { setViewing(null); setPrinting(rx); }} />

      <PrintPortal active={Boolean(printing)} onDone={() => setPrinting(null)}>
        <RxPrint rx={printing} clinicName={clinicName} />
      </PrintPortal>
    </div>
  );
}

function PatientSummary({ patient }) {
  if (!patient) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-mg-surface p-3.5 rounded-lg text-xs">
      <div>
        <span className="block text-[10px] uppercase text-slate-400">Patient details</span>
        <span className="font-medium text-slate-800">
          {patient.name}{patientLine(patient) && ` (${patientLine(patient)})`}
        </span>
      </div>
      <div>
        <span className="block text-[10px] uppercase text-slate-400">Contact &amp; visit type</span>
        <span className="font-medium text-slate-700 capitalize">
          {[patient.phone && `+91 ${phone(patient.phone)}`, `${patient.visitType || 'fresh'} visit`].filter(Boolean).join(' • ')}
        </span>
      </div>
      {patient.conditions?.length > 0 && (
        <div className="sm:col-span-2 flex flex-wrap gap-1">
          {patient.conditions.map((c) => <Pill key={c} tone="amber">{c}</Pill>)}
        </div>
      )}
    </div>
  );
}

/**
 * What the patient still owes, as a starting point for the pad: nothing if the
 * visit was paid at the desk, otherwise the doctor's fee for this visit type.
 */
const defaultDue = (patient, doctor) => {
  if (!patient) return '';
  if (patient.paymentMode) return '0';
  const fee = patient.fee ?? doctor?.fees?.[patient.visitType || 'fresh'];
  return fee != null ? String(fee) : '';
};

// Starting points for a doctor with no history yet; their own diagnoses rank first.
const COMMON_DIAGNOSES = [
  'Viral fever', 'Upper respiratory tract infection', 'Acute pharyngitis', 'Acute bronchitis', 'Allergic rhinitis',
  'Acute gastritis', 'Acute gastroenteritis', 'Dyspepsia', 'Urinary tract infection', 'Hypertension',
  'Type 2 diabetes mellitus', 'Hypothyroidism', 'Migraine', 'Vertigo', 'Myalgia', 'Low back pain',
  'Tinea corporis', 'Contact dermatitis', 'Acne vulgaris', 'Conjunctivitis', 'Acute otitis media', 'Iron deficiency anaemia',
  'Dengue fever (suspected)', 'Enteric fever (suspected)',
];

const prefixMatch = (q, text) => {
  const qw = q.toLowerCase().split(/\s+/).filter(Boolean);
  const tw = text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  return qw.every((w) => tw.some((t) => t.startsWith(w)));
};

const shortDate = (iso) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '');

function RxWriter({ patients, patient, doctor, clinicName, lastRx, hasPharmacy, onPick, onSaved, toast }) {
  const [symptoms, setSymptoms] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [totalDue, setTotalDue] = useState('');
  const [meds, setMeds] = useState([blankMed()]);
  const [advice, setAdvice] = useState('');
  const [reviewDate, setReviewDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastHeard, setLastHeard] = useState('');
  // Remembered per browser: a doctor whose patients mostly buy here leaves it on.
  const [sendRx, setSendRx] = useState(() => storage.get('rx.sendToPharmacy', true));
  const toggleSend = () => setSendRx((v) => { storage.set('rx.sendToPharmacy', !v); return !v; });
  const sending = hasPharmacy && sendRx;
  const { data: patterns, refetch: refetchPatterns } = useApi('/api/prescriptions/patterns');

  const dictation = useDictation({ onPhrase: (text) => handlePhrase(text) });

  // A fresh pad for every patient: one patient's medicines must never be
  // saved or printed under the next one's name — which is also why the mic
  // switches off when the patient changes.
  useEffect(() => {
    dictation.stop();
    setLastHeard('');
    // Symptoms come straight from the booking; the diagnosis is the doctor's.
    setSymptoms(symptomsOf(patient));
    setDiagnosis('');
    setTotalDue(defaultDue(patient, doctor));
    setMeds([blankMed()]);
    setAdvice('');
    setReviewDate('');
  }, [patient?.tokenId, Boolean(doctor)]); // eslint-disable-line react-hooks/exhaustive-deps

  const filled = meds.filter((m) => !isBlank(m));
  const unchecked = filled.filter((m) => m.check).length;
  const canSave = patient && diagnosis.trim() && filled.length > 0;

  /** Add medicines below what is already on the pad, skipping repeats, keeping one blank row last. */
  const addMeds = (list) => setMeds((m) => {
    const have = m.filter((x) => !isBlank(x));
    const names = new Set(have.map((x) => x.name.trim().toLowerCase()));
    const fresh = list.filter((x) => !names.has(x.name.trim().toLowerCase()));
    return [...have, ...fresh, blankMed()].slice(0, 30);
  });

  async function handlePhrase(text) {
    setLastHeard(text);
    for (const action of parseDictation(text)) {
      if (action.kind === 'diagnosis') setDiagnosis(action.text);
      else if (action.kind === 'advice') setAdvice((v) => [v.trim(), action.text].filter(Boolean).join('. '));
      else if (action.kind === 'symptoms') setSymptoms((v) => [v.trim(), action.text].filter(Boolean).join('; '));
      else if (action.kind === 'stop') dictation.stop();
      else if (action.kind === 'undo') {
        setMeds((m) => [...m.filter((x) => !isBlank(x)).slice(0, -1), blankMed()]);
      } else {
        // eslint-disable-next-line no-await-in-loop
        addMeds([await resolveSpoken(action.med)]);
      }
    }
  }

  const myDiagnoses = patterns?.diagnoses ?? [];
  const loadDiagnoses = (q) => {
    const mine = myDiagnoses.filter((d) => !q.trim() || prefixMatch(q, d.diagnosis));
    const taken = new Set(mine.map((d) => d.diagnosis.toLowerCase()));
    const common = q.trim()
      ? COMMON_DIAGNOSES.filter((d) => !taken.has(d.toLowerCase()) && prefixMatch(q, d)).map((d) => ({ diagnosis: d }))
      : [];
    return [...mine, ...common].slice(0, 8);
  };
  // The doctor's last pad for this diagnosis, offered while the pad is empty.
  const usual = myDiagnoses.find((d) => d.medicines?.length && d.diagnosis.trim().toLowerCase() === diagnosis.trim().toLowerCase());

  const repeatLast = () => {
    addMeds(lastRx.medicines.map(({ name, dosage, duration, instruction }) => ({ name, dosage, duration, instruction })));
    if (!diagnosis.trim()) setDiagnosis(lastRx.diagnosis);
  };

  const save = async (print) => {
    if (!canSave) return;
    dictation.stop();
    setSaving(true);
    try {
      const rx = unwrap(await api.post('/api/prescriptions', {
        tokenId: patient.tokenId,
        symptoms: symptoms.trim(),
        diagnosis: diagnosis.trim(),
        medicines: filled.map(({ name, dosage, duration, instruction }) => ({ name: name.trim(), dosage, duration, instruction })),
        advice: advice.trim(),
        reviewDate: reviewDate || null,
        totalDue: totalDue === '' ? null : Number(totalDue),
        sendToPharmacy: sending,
      }));
      toast.success(sending
        ? `Saved to ${patient.name}’s record and sent to the pharmacy`
        : `Prescription saved to ${patient.name}’s record`);
      onSaved(rx, print);
      // What this doctor "usually" writes has just changed.
      clearMedicineCache();
      refetchPatterns();
      setMeds([blankMed()]);
      setAdvice('');
      setReviewDate('');
    } catch (e) {
      toast.error(e?.response?.data?.error?.message || e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DeskCard className="p-4 sm:p-5 space-y-4">
      <RxHeader
        hospitalName={clinicName}
        doctor={doctor || {}}
        date={isoToday()}
        tokenNumber={patient?.tokenNumber}
      />

      <Field label="Select patient to prescribe" required>
        <Select value={patient?.tokenId || ''} onChange={(e) => onPick(e.target.value)}>
          {patients.map((p) => (
            <option key={p.tokenId} value={p.tokenId}>
              {token(p.tokenNumber)} – {p.name}{p.complaint ? ` (${p.complaint})` : ''} · {STATUS_LABEL[p.status]}
            </option>
          ))}
        </Select>
      </Field>

      <PatientSummary patient={patient} />

      <DictationBar
        listening={dictation.listening}
        interim={dictation.interim}
        lastHeard={lastHeard}
        error={dictation.error}
        onStart={dictation.start}
        onStop={dictation.stop}
      />

      <Field label="Clinical symptoms" hint="Filled in automatically from the booking — edit if needed">
        <Input value={symptoms} maxLength={500} onChange={(e) => setSymptoms(e.target.value)} placeholder="e.g. Fever for 3 days, dry cough" />
      </Field>

      <Field label="Diagnosis" required>
        <SuggestInput
          className={INPUT}
          value={diagnosis}
          maxLength={300}
          onChange={setDiagnosis}
          onPick={(d) => setDiagnosis(d.diagnosis)}
          load={loadDiagnoses}
          itemKey={(d) => d.diagnosis}
          heading={(q) => (q.trim() ? 'Diagnoses' : 'Your frequent diagnoses')}
          renderItem={(d) => (
            <span className="flex items-center justify-between gap-3">
              <span className="text-[13px] text-slate-900 truncate">{d.diagnosis}</span>
              {d.count && <span className="shrink-0 text-[10px] text-slate-400">{d.count}×</span>}
            </span>
          )}
          placeholder="e.g. Viral fever / Acute gastritis"
        />
      </Field>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-slate-700">
            <i className="fa-solid fa-pills text-mg-teal mr-1.5" aria-hidden="true" />Prescribed medicines
            {filled.length > 0 && <span className="ml-1 text-slate-400">({filled.length})</span>}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {lastRx && (
              <button
                type="button"
                onClick={repeatLast}
                title={`${lastRx.diagnosis}: ${lastRx.medicines.map((m) => m.name).join(', ')}`}
                className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-mg-blue text-xs font-medium transition"
              >
                <i className="fa-solid fa-rotate-left text-[10px] mr-1" aria-hidden="true" />Repeat last Rx ({shortDate(lastRx.date)})
              </button>
            )}
            <button
              type="button"
              onClick={() => setMeds((m) => [...m, blankMed()])}
              disabled={meds.length >= 30}
              className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-mg-teal text-xs font-medium transition"
            >
              <i className="fa-solid fa-plus text-[10px] mr-1" aria-hidden="true" />Add medicine
            </button>
          </div>
        </div>

        {usual && filled.length === 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-teal-200 bg-teal-50/60 px-3 py-2.5">
            <p className="text-xs text-slate-700 min-w-0">
              <strong className="font-semibold text-mg-teal">Your usual for {usual.diagnosis}:</strong>{' '}
              {usual.medicines.map((m) => m.name).join(', ')}
            </p>
            <button
              type="button"
              onClick={() => {
                addMeds(usual.medicines.map(({ name, dosage, duration, instruction }) => ({ name, dosage, duration, instruction })));
                if (!advice.trim() && usual.advice) setAdvice(usual.advice);
              }}
              className="shrink-0 px-3 py-1 rounded-lg bg-mg-teal hover:bg-mg-tealDark text-white text-xs font-medium transition"
            >
              Use these
            </button>
          </div>
        )}

        <MedicineRows meds={meds} setMeds={setMeds} />
        <p className="text-[11px] text-slate-400">
          {unchecked > 0
            ? <span className="text-amber-700"><i className="fa-solid fa-circle-exclamation mr-1" aria-hidden="true" />{unchecked} medicine{unchecked === 1 ? '' : 's'} added by voice (highlighted) — check before saving.</span>
            : 'Pick a suggestion with Enter to fill the row and jump to the next. Tap the chips to change dose, days or timing.'}
        </p>
      </div>

      <Field label="Doctor advice & lab directives">
        <Textarea rows={2} value={advice} maxLength={1000} onChange={(e) => setAdvice(e.target.value)} placeholder="e.g. Rest for 3 days, warm fluids. CBC if fever persists." />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
        <Field label="Review date (printed on the pad)" hint="To hold a token for the patient, book a follow-up when you finish the consultation.">
          <Input type="date" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} />
        </Field>
        <Field label="Total due (₹)" hint={patient?.paymentMode ? `Consultation paid at the desk (${patient.paymentMode}) — add tests or procedures` : 'Printed on the pad; collect it at the desk'}>
          <Input inputMode="decimal" value={totalDue} onChange={(e) => setTotalDue(e.target.value.replace(/[^\d.]/g, ''))} placeholder="0" />
        </Field>
      </div>
      {hasPharmacy && (
        <label className={clsx(
          'flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition',
          sendRx ? 'border-emerald-200 bg-emerald-50/70' : 'border-slate-200 bg-white',
        )}
        >
          <span className="flex items-center gap-2.5 min-w-0">
            <i className={clsx('fa-solid fa-prescription-bottle-medical', sendRx ? 'text-emerald-600' : 'text-slate-400')} aria-hidden="true" />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-slate-900">Send to clinic pharmacy</span>
              <span className="block text-[11px] text-slate-500">
                {sendRx ? 'The pharmacy gets this pad the moment you save' : 'Off — the patient will buy medicines elsewhere'}
              </span>
            </span>
          </span>
          <input type="checkbox" role="switch" checked={sendRx} onChange={toggleSend} className="w-4 h-4 accent-[#3E9A92] shrink-0" />
        </label>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-xs text-slate-500">{totalDue !== '' && <>Patient to pay <strong className="font-semibold text-slate-800">{inr(Number(totalDue) || 0)}</strong></>}</p>
        {/* Sent to the pharmacy, the pad needs no paper: saving is the main
            action and printing is the exception. */}
        {sending ? (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => save(true)} disabled={!canSave || saving} className="flex-1">
              <i className="fa-solid fa-print" aria-hidden="true" /> Save &amp; print
            </Button>
            <Button onClick={() => save(false)} loading={saving} disabled={!canSave} className="flex-[2]">
              <i className="fa-solid fa-paper-plane" aria-hidden="true" /> Save &amp; send to pharmacy
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => save(false)} disabled={!canSave || saving} className="flex-1">
              Save only
            </Button>
            <Button onClick={() => save(true)} loading={saving} disabled={!canSave} className="flex-[2]">
              <i className="fa-solid fa-file-signature" aria-hidden="true" /> Save &amp; print
            </Button>
          </div>
        )}
      </div>
    </DeskCard>
  );
}

const PHARMACY_PILL = {
  [PHARMACY_STATUS.PENDING]: { tone: 'amber', label: 'At pharmacy' },
  [PHARMACY_STATUS.DISPENSED]: { tone: 'emerald', label: 'Dispensed' },
  [PHARMACY_STATUS.PARTIAL]: { tone: 'blue', label: 'Partly dispensed' },
};

/** Where this pad stands at the clinic pharmacy, or a way to send it there. */
function PharmacyLine({ rx, onSend }) {
  const p = rx.pharmacy;
  if (!p) {
    return onSend ? (
      <button type="button" onClick={onSend} className="text-[11px] font-medium text-mg-teal hover:underline">
        <i className="fa-solid fa-paper-plane text-[10px] mr-1" aria-hidden="true" />Send to pharmacy
      </button>
    ) : null;
  }
  const pill = PHARMACY_PILL[p.status];
  const at = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
      <Pill tone={pill.tone}>{pill.label}</Pill>
      <span>{p.status === PHARMACY_STATUS.PENDING ? `sent ${at(p.sentAt)}` : `${at(p.dispensedAt)}${p.dispensedByName ? ` · ${p.dispensedByName}` : ''}`}</span>
      {p.unavailable?.length > 0 && <span className="text-rose-700">Not given: {p.unavailable.join(', ')}</span>}
      {p.note && <span className="text-slate-500">· {p.note}</span>}
    </div>
  );
}

function PatientList({ patients, selected, onPick }) {
  return (
    <DeskCard className="p-4 sm:p-5 space-y-3">
      <SectionHead icon="fa-users" title="Today’s patients" subtitle="Pick a patient to see their prescriptions" />
      <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
        {patients.map((p) => (
          <button
            key={p.tokenId}
            type="button"
            onClick={() => onPick(p.tokenId)}
            className={clsx(
              'w-full flex items-center justify-between gap-3 px-3.5 py-3 text-left transition',
              selected?.tokenId === p.tokenId ? 'bg-blue-50' : 'hover:bg-slate-50',
            )}
          >
            <span className="flex items-center gap-3 min-w-0">
              <span className="text-sm font-semibold text-mg-navy w-9 shrink-0">{token(p.tokenNumber)}</span>
              <span className="min-w-0">
                <span className="block text-[13px] font-medium text-slate-900 truncate">{p.name}</span>
                <span className="block text-[11px] text-slate-500 truncate">{[patientLine(p), p.complaint].filter(Boolean).join(' • ')}</span>
              </span>
            </span>
            <Pill tone={p.status === TOKEN_STATUS.IN_CHAMBER ? 'teal' : p.status === TOKEN_STATUS.COMPLETED ? 'emerald' : 'slate'}>
              {STATUS_LABEL[p.status]}
            </Pill>
          </button>
        ))}
      </div>
    </DeskCard>
  );
}

/**
 * The selected patient's history, in the app rather than on paper: every
 * visit with its prescription readable in place. A doctor sees only the
 * consultations they gave (the server enforces it); the desk sees the clinic's.
 * A family sharing one phone is split by name, starting on today's patient.
 */
function EmrLookup({ phoneQuery, onPhone, valid, history, loading, onView, onPrint, onSend, myDoctorId, isDoctor, patientName, footfallPath }) {
  const all = history?.visits ?? [];
  const more = history ? history.totalVisits - all.length : 0;
  const names = [...new Set(all.map((v) => v.patientName).filter(Boolean))];
  const [who, setWho] = useState(null);
  const [openId, setOpenId] = useState(null);
  // Back to today's patient whenever the number changes.
  useEffect(() => { setWho(null); setOpenId(null); }, [history?.phone]);
  const person = who ?? (names.includes(patientName) ? patientName : 'ALL');
  const visits = person === 'ALL' ? all : all.filter((v) => v.patientName === person);
  // The newest visit that has a prescription opens by itself.
  const expanded = openId ?? visits.find((v) => v.prescriptions.length)?.tokenId;

  return (
    <DeskCard className="p-4 sm:p-5 space-y-4">
      <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
        <IconTile icon="fa-folder-open" tone="blue" />
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900">Patient history</h2>
          <p className="text-xs text-slate-500">
            {isDoctor ? 'Your previous consultations with this patient' : 'Visits and prescriptions at this clinic'}
          </p>
        </div>
      </div>

      <Field label="Patient mobile number">
        <div className="relative">
          <i className="fa-solid fa-mobile-screen absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" aria-hidden="true" />
          <Input
            inputMode="numeric"
            value={phoneQuery}
            onChange={(e) => onPhone(e.target.value.replace(/[^\d+ ]/g, ''))}
            placeholder="10-digit mobile number"
            className="pl-8"
          />
        </div>
      </Field>

      {valid && names.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {['ALL', ...names].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => { setWho(n); setOpenId(null); }}
              className={clsx(
                'px-2.5 py-1 rounded-full border text-[11px] font-medium transition',
                person === n ? 'bg-mg-blue border-mg-blue text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-mg-blue',
              )}
            >
              {n === 'ALL' ? 'Everyone on this number' : n}
            </button>
          ))}
        </div>
      )}

      {!valid ? (
        <div className="bg-mg-surface rounded-lg">
          <EmptyNote icon="fa-magnifying-glass" title="Enter a mobile number" hint="Every visit booked with that number is fetched — family members sharing a phone included." />
        </div>
      ) : loading && !history ? (
        <div className="space-y-3">
          {[0, 1].map((i) => <div key={i} className="h-28 rounded-lg bg-slate-100 animate-pulse" />)}
        </div>
      ) : !visits.length ? (
        <div className="bg-mg-surface rounded-lg">
          <EmptyNote
            icon="fa-notes-medical"
            title={isDoctor ? 'No earlier consultations with you' : 'No visits for this number'}
            hint={isDoctor
              ? 'Only visits you consulted on are shown here. Saving a prescription starts this patient’s record.'
              : 'Saving a prescription starts this patient’s record.'}
          />
        </div>
      ) : (
        <ol className="relative space-y-3 max-h-[720px] overflow-y-auto pr-1 custom-scrollbar">
          {visits.map((v) => {
            const isOpen = v.tokenId === expanded;
            return (
              <li key={v.tokenId} className="rounded-lg border border-slate-200 bg-white">
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? '' : v.tokenId)}
                  aria-expanded={isOpen}
                  className="w-full text-left p-3.5 flex items-start justify-between gap-2"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-900">{visitDate(v.date)} · {token(v.tokenNumber)}</span>
                    <span className="block text-[11px] text-slate-500 truncate">
                      {[v.patientName, patientLine(v), !isDoctor && v.doctorName].filter(Boolean).join(' • ')}
                    </span>
                    {!isOpen && v.prescriptions[0] && (
                      <span className="block text-xs font-medium text-mg-blue truncate mt-0.5">{v.prescriptions[0].diagnosis}</span>
                    )}
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    <Pill tone={v.status === 'COMPLETED' ? 'emerald' : 'slate'}>{VISIT_STATUS[v.status] || v.status}</Pill>
                    <i className={clsx('fa-solid fa-chevron-down text-[10px] text-slate-400 transition-transform', isOpen && 'rotate-180')} aria-hidden="true" />
                  </span>
                </button>

                {isOpen && (
                  <div className="px-3.5 pb-3.5 space-y-2.5 border-t border-slate-100 pt-2.5">
                    {v.symptoms && <p className="text-[11px] text-slate-600"><strong className="font-medium">Symptoms:</strong> {v.symptoms}</p>}
                    {v.prescriptions.length ? v.prescriptions.map((rx) => (
                      <div key={rx._id} className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs"><span className="text-slate-400">Diagnosis:</span> <strong className="font-semibold text-mg-blue">{rx.diagnosis}</strong></p>
                          <div className="flex gap-1 shrink-0">
                            <button type="button" onClick={() => onView(rx)} className="px-2 py-0.5 rounded-md text-slate-500 hover:text-slate-800 text-[11px]" aria-label="Open as pad">
                              <i className="fa-solid fa-up-right-from-square" aria-hidden="true" />
                            </button>
                            <button type="button" onClick={() => onPrint(rx)} className="px-2 py-0.5 rounded-md text-slate-500 hover:text-slate-800 text-[11px]" aria-label="Print prescription">
                              <i className="fa-solid fa-print" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                        <ul className="rounded-md bg-mg-surface divide-y divide-white">
                          {rx.medicines.map((m) => (
                            <li key={m.name} className="px-2.5 py-1.5 text-[11px]">
                              <span className="font-medium text-slate-900">{m.name}</span>
                              <span className="text-slate-500"> — {[m.dosage, m.duration, m.instruction].filter(Boolean).join(' · ')}</span>
                            </li>
                          ))}
                        </ul>
                        {rx.advice && <p className="text-[11px] text-slate-600"><span className="text-slate-400">Advice:</span> {rx.advice}</p>}
                        <PharmacyLine rx={rx} onSend={onSend && String(rx.doctorId) === String(myDoctorId) ? () => onSend(rx) : null} />
                      </div>
                    )) : <p className="text-[11px] italic text-slate-400">No prescription for this visit</p>}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {valid && history && (
        <Link
          to={`${footfallPath}?view=FOOTFALL&range=year&q=${encodeURIComponent(history.phone)}`}
          className="block text-center text-xs font-medium text-mg-teal hover:underline"
        >
          {more > 0 ? `${more} older visit${more === 1 ? '' : 's'} — ` : ''}See every visit in the footfall register →
        </Link>
      )}
    </DeskCard>
  );
}
