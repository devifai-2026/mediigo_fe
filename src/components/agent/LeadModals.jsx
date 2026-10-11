import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Field, Input, Textarea } from '../ui/Field.jsx';
import { api, unwrap } from '../../lib/api.js';

export const OUTCOMES = [
  { value: 'MET', label: 'Met, still deciding', icon: 'fa-handshake', tone: 'blue', needsNext: true },
  { value: 'RESCHEDULED', label: 'Asked to reschedule', icon: 'fa-calendar-plus', tone: 'amber', needsNext: true },
  { value: 'NOT_AVAILABLE', label: 'Doctor not available', icon: 'fa-user-clock', tone: 'slate', needsNext: true },
  { value: 'INTERESTED', label: 'Interested — ready to onboard', icon: 'fa-thumbs-up', tone: 'emerald', needsNext: false },
  { value: 'NOT_INTERESTED', label: 'Not interested', icon: 'fa-circle-xmark', tone: 'rose', needsNext: false },
];

const TONE = {
  blue: 'border-mg-blue bg-blue-50 text-mg-blue',
  amber: 'border-amber-500 bg-amber-50 text-amber-700',
  slate: 'border-slate-400 bg-slate-50 text-slate-700',
  emerald: 'border-emerald-500 bg-emerald-50 text-emerald-700',
  rose: 'border-rose-500 bg-rose-50 text-rose-700',
};

// <input type="datetime-local"> speaks local wall-clock time with no zone.
const toLocalInput = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const at = (daysAhead, hour) => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(hour, 0, 0, 0);
  return toLocalInput(d);
};
const QUICK_NEXT = [
  { label: 'Tomorrow 11 AM', value: () => at(1, 11) },
  { label: 'Tomorrow 5 PM', value: () => at(1, 17) },
  { label: 'In 3 days', value: () => at(3, 11) },
  { label: 'Next week', value: () => at(7, 11) },
];

function OutcomePicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {OUTCOMES.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={clsx(
            'flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-xs transition',
            value === o.value ? `${TONE[o.tone]} ring-1 ring-current font-medium` : 'border-slate-200 text-slate-700 hover:border-slate-300',
          )}
        >
          <i className={clsx('fa-solid w-4 text-center', o.icon)} aria-hidden="true" />
          {o.label}
        </button>
      ))}
    </div>
  );
}

function NextVisit({ value, onChange, required }) {
  const now = toLocalInput(new Date());
  return (
    <Field label={required ? 'Next visit' : 'Next visit (optional)'} required={required} hint={required ? 'When the clinic asked you to come back' : 'If you agreed to come back with the forms'}>
      <Input type="datetime-local" min={now} value={value} onChange={(e) => onChange(e.target.value)} />
      <div className="flex flex-wrap gap-1.5 mt-2">
        {QUICK_NEXT.map((q) => (
          <button key={q.label} type="button" onClick={() => onChange(q.value())} className="px-2 py-0.5 rounded-full border border-slate-200 text-[11px] text-slate-600 hover:border-mg-teal hover:text-mg-teal">
            {q.label}
          </button>
        ))}
      </div>
    </Field>
  );
}

const errMsg = (e) => e?.response?.data?.error?.details?.[0]?.message || e?.response?.data?.error?.message || e.message;

/** Log what happened at a visit, and when to go back. */
export function LogVisitModal({ lead, onClose, onSaved, toast }) {
  const [outcome, setOutcome] = useState('MET');
  const [note, setNote] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { setOutcome('MET'); setNote(''); setNext(''); }, [lead?._id]);
  if (!lead) return null;

  const needsNext = OUTCOMES.find((o) => o.value === outcome)?.needsNext;
  const valid = !needsNext || next;

  const save = async () => {
    setBusy(true);
    try {
      const updated = unwrap(await api.post(`/api/onboarding/leads/${lead._id}/visits`, {
        outcome, note: note.trim() || undefined, nextVisitAt: next ? new Date(next).toISOString() : null,
      }));
      toast.success(outcome === 'NOT_INTERESTED' ? 'Visit logged — clinic closed' : 'Visit logged');
      onSaved(updated);
      onClose();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Log a visit" subtitle={lead.clinicName}>
      <div className="space-y-4">
        <Field label="How did it go?" required>
          <OutcomePicker value={outcome} onChange={setOutcome} />
        </Field>
        <Field label="Feedback note" hint="What the doctor said, objections, who to ask for next time">
          <Textarea rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Doctor wants to see the patient app first; asked to come after 5 PM" />
        </Field>
        {outcome !== 'NOT_INTERESTED' && <NextVisit value={next} onChange={setNext} required={needsNext} />}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={save} loading={busy} disabled={!valid} title={!valid ? 'Set when to go back' : undefined}>Save visit</Button>
        </div>
      </div>
    </Modal>
  );
}

const BLANK = { clinicName: '', contactName: '', contactPhone: '', specialty: '', line1: '', city: '', pincode: '', notes: '' };

/** A clinic the agent has just visited for the first time. */
export function AddLeadModal({ open, onClose, onSaved, toast }) {
  const [f, setF] = useState(BLANK);
  const [outcome, setOutcome] = useState('MET');
  const [note, setNote] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setF(BLANK); setOutcome('MET'); setNote(''); setNext('');
  }, [open]);
  if (!open) return null;

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const needsNext = OUTCOMES.find((o) => o.value === outcome)?.needsNext;
  const phoneBad = f.contactPhone && !/^\d{10}$/.test(f.contactPhone);
  const pinBad = f.pincode && !/^\d{6}$/.test(f.pincode);
  const valid = f.clinicName.trim().length >= 2 && !phoneBad && !pinBad && (!needsNext || next);

  const save = async () => {
    setBusy(true);
    try {
      const created = unwrap(await api.post('/api/onboarding/leads', {
        clinicName: f.clinicName.trim(),
        contactName: f.contactName.trim() || undefined,
        contactPhone: f.contactPhone || undefined,
        specialty: f.specialty.trim() || undefined,
        address: { line1: f.line1.trim(), city: f.city.trim(), pincode: f.pincode },
        notes: f.notes.trim() || undefined,
        visit: { outcome, note: note.trim() || undefined, nextVisitAt: next ? new Date(next).toISOString() : null },
      }));
      toast.success(`${created.clinicName} added to your follow-ups`);
      onSaved(created);
      onClose();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Add a clinic visit" subtitle="A clinic you met that is not onboarded yet" size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Clinic name" required className="sm:col-span-2">
            <Input value={f.clinicName} maxLength={120} onChange={set('clinicName')} placeholder="e.g. Shanti Polyclinic" />
          </Field>
          <Field label="Doctor / contact person">
            <Input value={f.contactName} maxLength={80} onChange={set('contactName')} placeholder="Dr. A. Banerjee" />
          </Field>
          <Field label="Mobile" error={phoneBad ? 'Enter 10 digits' : undefined}>
            <Input inputMode="numeric" maxLength={10} value={f.contactPhone} onChange={(e) => setF({ ...f, contactPhone: e.target.value.replace(/\D/g, '') })} placeholder="98xxxxxxxx" />
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <Input value={f.line1} maxLength={200} onChange={set('line1')} placeholder="Street, area, landmark" />
          </Field>
          <Field label="City">
            <Input value={f.city} maxLength={60} onChange={set('city')} placeholder="Kolkata" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="PIN" error={pinBad ? '6 digits' : undefined}>
              <Input inputMode="numeric" maxLength={6} value={f.pincode} onChange={(e) => setF({ ...f, pincode: e.target.value.replace(/\D/g, '') })} placeholder="700064" />
            </Field>
            <Field label="Specialty">
              <Input value={f.specialty} maxLength={60} onChange={set('specialty')} placeholder="ENT" />
            </Field>
          </div>
        </div>

        <Field label="How did the first visit go?" required>
          <OutcomePicker value={outcome} onChange={setOutcome} />
        </Field>
        <Field label="Feedback note">
          <Textarea rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What the doctor said, what they need to decide" />
        </Field>
        {outcome !== 'NOT_INTERESTED' && <NextVisit value={next} onChange={setNext} required={needsNext} />}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={save} loading={busy} disabled={!valid}>Add clinic</Button>
        </div>
      </div>
    </Modal>
  );
}
