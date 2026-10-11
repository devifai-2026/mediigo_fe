import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { FollowUpPicker } from './FollowUpPicker.jsx';
import { longDate, SHIFT_LABEL } from '../../lib/followUps.js';

/**
 * How the consultation ended, asked as the doctor finishes a patient.
 *
 * Defaulted to "Consultation done" and dismissible in one tap, because the
 * common case is the common case and a doctor seeing forty patients should
 * not be made to answer a question thirty-eight of them do not need.
 *
 * The queue advances either way: a patient sent for tests has finished with
 * the doctor, whatever happens next.
 */
const OPTIONS = [
  { value: 'DONE', label: 'Consultation done', hint: 'Nothing further needed today', icon: 'M5 13l4 4L19 7' },
  { value: 'TESTS', label: 'Proceed for tests', hint: 'Sent for labs or imaging', icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M3 9h2m-2 6h2m14-6h2m-2 6h2M7 7h10v10H7z' },
  { value: 'ADMITTED', label: 'Admitted', hint: 'Taken in as an inpatient', icon: 'M3 21h18M5 21V7l7-4 7 4v14M9 9h6M9 13h6M9 17h6' },
];

export function OutcomeDialog({ open, doctorId, patientName, tokenNumber, hasFollowUp = false, onConfirm, onClose, busy }) {
  const [outcome, setOutcome] = useState('DONE');
  const [notes, setNotes] = useState('');
  // Follow-up is opt-in per patient and must never carry over to the next
  // one, so it resets whenever the dialog opens for a different token.
  const [followUpOn, setFollowUpOn] = useState(false);
  const [slot, setSlot] = useState(null);
  const [followUpNote, setFollowUpNote] = useState('');

  useEffect(() => {
    if (!open) return;
    setFollowUpOn(false);
    setSlot(null);
    setFollowUpNote('');
  }, [open, tokenNumber]);

  if (!open) return null;

  const needsSlot = followUpOn && !slot;

  return (
    <Modal open onClose={onClose} title="Finish this consultation" subtitle={`${tokenNumber} · ${patientName || 'Patient'}`}>
      <div className="space-y-4">
        <div className="space-y-2">
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setOutcome(o.value)}
              aria-pressed={outcome === o.value}
              className={clsx(
                'w-full flex items-center gap-3 rounded-xl border p-3 text-left transition',
                outcome === o.value
                  ? 'border-mg-teal bg-teal-50/60 ring-1 ring-mg-teal'
                  : 'border-slate-200 hover:border-slate-300',
              )}
            >
              <span className={clsx(
                'w-9 h-9 rounded-lg grid place-items-center shrink-0',
                outcome === o.value ? 'bg-mg-teal text-white' : 'bg-slate-100 text-slate-500',
              )}>
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={o.icon} />
                </svg>
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-900">{o.label}</span>
                <span className="block text-[11px] text-slate-500">{o.hint}</span>
              </span>
            </button>
          ))}
        </div>

        {outcome !== 'DONE' && (
          <div className="animate-fade-in">
            <label htmlFor="outcome-notes" className="block text-[11px] font-semibold text-slate-700 mb-1">
              Notes <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              id="outcome-notes" rows={2} maxLength={500} value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={outcome === 'TESTS' ? 'Which tests, and where to return…' : 'Ward, reason for admission…'}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-mg-teal resize-none"
            />
          </div>
        )}

        {/* Booked now, while the patient is still in the room — the token is
            held for them and they confirm it from their phone. */}
        {hasFollowUp ? (
          <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            A follow-up is already booked for this patient.
          </p>
        ) : (
          <div className={clsx('rounded-xl border transition', followUpOn ? 'border-mg-teal/40 bg-teal-50/30' : 'border-slate-200')}>
            <label className="flex items-center justify-between gap-3 p-3 cursor-pointer">
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-900">Book a follow-up</span>
                <span className="block text-[11px] text-slate-500">The patient gets a token and is asked to confirm</span>
              </span>
              <input
                type="checkbox"
                checked={followUpOn}
                onChange={(e) => setFollowUpOn(e.target.checked)}
                className="w-5 h-5 accent-teal-600 shrink-0"
              />
            </label>
            {followUpOn && (
              <div className="px-3 pb-3 space-y-3 animate-fade-in">
                <FollowUpPicker doctorId={doctorId} value={slot} onChange={setSlot} />
                <input
                  value={followUpNote}
                  onChange={(e) => setFollowUpNote(e.target.value.slice(0, 300))}
                  placeholder="Reason, e.g. Review blood reports (optional)"
                  aria-label="Follow-up reason"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-mg-teal"
                />
                {slot && (
                  <p className="text-[11px] text-slate-600">
                    Follow-up on <strong>{longDate(slot.date)}</strong>, {SHIFT_LABEL[slot.shift] || slot.shift}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose} disabled={busy}>Back</Button>
          <Button
            onClick={() => onConfirm({
              outcome,
              outcomeNotes: notes,
              followUp: followUpOn && slot ? { ...slot, note: followUpNote.trim() } : null,
            })}
            disabled={busy || needsSlot}
            title={needsSlot ? 'Pick a follow-up date first' : undefined}
          >
            {busy ? 'Saving…' : followUpOn ? 'Book follow-up & call next' : 'Finish & call next'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
