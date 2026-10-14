import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useApi } from '../../hooks/useApi.js';
import { useQueueSnapshot } from '../../hooks/useQueueSnapshot.js';
import { api, unwrap } from '../../lib/api.js';
import { ROLES, TOKEN_STATUS } from '../../lib/constants.js';
import { phone, token } from '../../lib/format.js';
import { Button } from '../../components/ui/Button.jsx';
import { Field, Input, Select, Textarea } from '../../components/ui/Field.jsx';
import { DeskCard, DoctorPicker, EmptyNote, IconTile, LoadError, PageHeader, Pill, PrintPortal, SectionHead } from '../../components/desk/ui.jsx';
import { RxPrint } from '../../components/desk/RxPrint.jsx';
import { patientLine } from '../../components/desk/deskFormat.js';

const blankMed = () => ({ name: '', dosage: '1-0-1', duration: '5 Days', instruction: 'After meals' });

const STATUS_LABEL = {
  [TOKEN_STATUS.IN_CHAMBER]: 'In chamber',
  [TOKEN_STATUS.WAITING]: 'Waiting',
  [TOKEN_STATUS.COMPLETED]: 'Seen',
  [TOKEN_STATUS.SKIPPED]: 'Skipped',
};

const visitDate = (iso) => (iso
  ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  : '');

/**
 * Rx / EMR.
 *
 * The doctor writes a prescription for a patient from today's list; it is
 * saved to that patient's record and printed. The patient's earlier
 * prescriptions at this clinic sit beside the pad, so the doctor sees what
 * was given last time before writing this time.
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

  const { snapshot } = useQueueSnapshot(doctorId || null);
  const patients = useMemo(
    () => (snapshot?.tokens ?? []).filter((t) => STATUS_LABEL[t.status]),
    [snapshot],
  );

  const wanted = params.get('token');
  const fallback = patients.find((t) => t.status === TOKEN_STATUS.IN_CHAMBER) ?? patients[0];
  const patient = patients.find((t) => t.tokenId === wanted) ?? fallback ?? null;
  const pick = (tokenId) => setParams(tokenId ? { token: tokenId } : {}, { replace: true });

  const emrUrl = patient?.patientId ? `/api/prescriptions?patientId=${patient.patientId}` : null;
  const { data: history, loading: historyLoading, error: historyError, refetch: refetchHistory } = useApi(emrUrl, { skip: !emrUrl });

  const [printing, setPrinting] = useState(null);
  const clinicName = user?.clinic?.name || '';

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
      />

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
            <EmrTimeline
              patient={patient}
              history={history}
              loading={historyLoading}
              onPrint={setPrinting}
            />
          </div>
        </div>
      )}

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

function RxWriter({ patients, patient, onPick, onSaved, toast }) {
  const [diagnosis, setDiagnosis] = useState('');
  const [meds, setMeds] = useState([blankMed()]);
  const [advice, setAdvice] = useState('');
  const [reviewDate, setReviewDate] = useState('');
  const [saving, setSaving] = useState(false);

  // A fresh pad for every patient: one patient's medicines must never be
  // saved or printed under the next one's name.
  useEffect(() => {
    setDiagnosis(patient?.complaint || '');
    setMeds([blankMed()]);
    setAdvice('');
    setReviewDate('');
  }, [patient?.tokenId]); // eslint-disable-line react-hooks/exhaustive-deps

  const setMed = (i, patch) => setMeds((m) => m.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const filled = meds.filter((m) => m.name.trim());
  const canSave = patient && diagnosis.trim() && filled.length > 0;

  const save = async (print) => {
    if (!canSave) return;
    setSaving(true);
    try {
      const rx = unwrap(await api.post('/api/prescriptions', {
        tokenId: patient.tokenId,
        diagnosis: diagnosis.trim(),
        medicines: filled.map((m) => ({ ...m, name: m.name.trim() })),
        advice: advice.trim(),
        reviewDate: reviewDate || null,
      }));
      toast.success(`Prescription saved to ${patient.name}’s record`);
      onSaved(rx, print);
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

      <Field label="Diagnosis & clinical symptoms" required>
        <Input value={diagnosis} maxLength={300} onChange={(e) => setDiagnosis(e.target.value)} placeholder="e.g. Viral fever & cough / Acute gastritis" />
      </Field>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-slate-700">
            <i className="fa-solid fa-pills text-mg-teal mr-1.5" aria-hidden="true" />Prescribed medicines
          </span>
          <button
            type="button"
            onClick={() => setMeds((m) => [...m, blankMed()])}
            disabled={meds.length >= 30}
            className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-mg-teal text-xs font-medium transition"
          >
            <i className="fa-solid fa-plus text-[10px] mr-1" aria-hidden="true" />Add medicine
          </button>
        </div>

        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="hidden sm:grid grid-cols-12 gap-2 px-3 py-2 bg-mg-surface text-[10px] font-medium uppercase text-slate-500">
            <span className="col-span-5">Medicine name</span>
            <span className="col-span-2">Dosage</span>
            <span className="col-span-2">Duration</span>
            <span className="col-span-3">Timing / notes</span>
          </div>
          <div className="divide-y divide-slate-100">
            {meds.map((m, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <div key={i} className="grid grid-cols-12 gap-2 p-2 items-center">
                <input
                  className="col-span-12 sm:col-span-5 rx-input font-medium" placeholder="e.g. Tab Paracetamol 650mg"
                  value={m.name} maxLength={120} list="rx-medicine-hints" aria-label="Medicine name"
                  onChange={(e) => setMed(i, { name: e.target.value })}
                />
                <input
                  className="col-span-4 sm:col-span-2 rx-input" placeholder="1-0-1" value={m.dosage} maxLength={40}
                  list="rx-dosage-hints" aria-label="Dosage" onChange={(e) => setMed(i, { dosage: e.target.value })}
                />
                <input
                  className="col-span-4 sm:col-span-2 rx-input" placeholder="5 Days" value={m.duration} maxLength={40}
                  list="rx-duration-hints" aria-label="Duration" onChange={(e) => setMed(i, { duration: e.target.value })}
                />
                <div className="col-span-4 sm:col-span-3 flex items-center gap-1">
                  <input
                    className="rx-input min-w-0" placeholder="After meals" value={m.instruction} maxLength={120}
                    list="rx-timing-hints" aria-label="Timing or notes" onChange={(e) => setMed(i, { instruction: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setMeds((x) => (x.length > 1 ? x.filter((_, j) => j !== i) : [blankMed()]))}
                    className="p-1.5 text-slate-400 hover:text-rose-600 shrink-0"
                    aria-label="Remove medicine"
                  >
                    <i className="fa-solid fa-trash-can text-xs" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <datalist id="rx-dosage-hints">{['1-0-1', '1-1-1', '1-0-0', '0-0-1', '0-1-0', '1-1-1-1', 'SOS'].map((v) => <option key={v} value={v} />)}</datalist>
        <datalist id="rx-duration-hints">{['1 Day', '3 Days', '5 Days', '7 Days', '10 Days', '14 Days', '1 Month', 'Continue'].map((v) => <option key={v} value={v} />)}</datalist>
        <datalist id="rx-timing-hints">{['After meals', 'Before meals', 'Before breakfast', 'At bedtime', 'With food', 'Empty stomach'].map((v) => <option key={v} value={v} />)}</datalist>
        <datalist id="rx-medicine-hints">{['Tab Paracetamol 650mg', 'Tab Pantoprazole 40mg', 'Tab Cetirizine 10mg', 'Tab Azithromycin 500mg', 'Syr Benadryl 10ml', 'ORS Sachet'].map((v) => <option key={v} value={v} />)}</datalist>
      </div>

      <Field label="Doctor advice & lab directives">
        <Textarea rows={2} value={advice} maxLength={1000} onChange={(e) => setAdvice(e.target.value)} placeholder="e.g. Rest for 3 days, warm fluids. CBC if fever persists." />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
        <Field label="Review date (printed on the pad)" hint="To hold a token for the patient, book a follow-up when you finish the consultation.">
          <Input type="date" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} />
        </Field>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => save(false)} disabled={!canSave || saving} className="flex-1">
            Save only
          </Button>
          <Button onClick={() => save(true)} loading={saving} disabled={!canSave} className="flex-[2]">
            <i className="fa-solid fa-file-signature" aria-hidden="true" /> Save to EMR &amp; Print
          </Button>
        </div>
      </div>
    </DeskCard>
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

function EmrTimeline({ patient, history, loading, onPrint }) {
  return (
    <DeskCard className="p-4 sm:p-5 space-y-4">
      <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
        <IconTile icon="fa-folder-open" tone="blue" />
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900">Patient EMR Medical Record</h2>
          <p className="text-xs text-slate-500 truncate">
            {patient ? `${patient.name} — prescriptions at this clinic` : 'Historical prescriptions & visit log'}
          </p>
        </div>
      </div>

      {loading && !history ? (
        <div className="space-y-3">
          {[0, 1].map((i) => <div key={i} className="h-28 rounded-lg bg-slate-100 animate-pulse" />)}
        </div>
      ) : !history?.length ? (
        <div className="bg-mg-surface rounded-lg">
          <EmptyNote
            icon="fa-notes-medical"
            title="No previous prescriptions"
            hint="Saving a prescription starts this patient’s record."
          />
        </div>
      ) : (
        <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1 custom-scrollbar">
          {history.map((rx) => (
            <article key={rx._id} className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-2.5 hover:border-mg-teal transition">
              <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-mg-blue">{rx.diagnosis}</p>
                  <p className="text-[11px] text-slate-500">
                    {rx.doctorSnapshot?.name} • {visitDate(rx.date)}{rx.tokenNumber != null && ` • ${token(rx.tokenNumber)}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onPrint(rx)}
                  className="shrink-0 px-2.5 py-1 rounded-lg border border-mg-teal text-mg-teal hover:bg-mg-teal hover:text-white text-[11px] font-medium transition"
                >
                  <i className="fa-solid fa-print mr-1" aria-hidden="true" />Print Rx
                </button>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Medicines ({rx.medicines.length})</p>
                {rx.medicines.map((m, i) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <div key={i} className="flex items-center justify-between gap-2 text-xs bg-mg-surface px-2.5 py-1.5 rounded-md">
                    <span className="font-medium text-slate-800 truncate">{m.name}</span>
                    <span className="text-[11px] text-mg-teal shrink-0">{[m.dosage, m.duration && `(${m.duration})`].filter(Boolean).join(' ')}</span>
                  </div>
                ))}
              </div>
              {rx.advice && (
                <p className="text-[11px] text-slate-600 bg-teal-50/60 p-2 rounded-md border border-teal-100">
                  <strong className="font-medium">Advice:</strong> {rx.advice}
                </p>
              )}
              {rx.reviewDate && <p className="text-[11px] text-slate-500">Review on {visitDate(rx.reviewDate)}</p>}
            </article>
          ))}
        </div>
      )}
    </DeskCard>
  );
}
