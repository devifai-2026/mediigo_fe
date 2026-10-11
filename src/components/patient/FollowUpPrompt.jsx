import { useState } from 'react';
import { api } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useConfirm } from '../../context/ConfirmContext.jsx';
import { Button } from '../ui/Button.jsx';
import { Icon } from '../ui/Icon.jsx';
import {
  FOLLOWUP_STATUS, isOverdue, longDate, replyBy, SHIFT_LABEL, t12,
} from '../../lib/followUps.js';

/**
 * The patient's side of a doctor-booked follow-up, shown on that booking.
 *
 * The doctor chose the date, so the patient is asked rather than assumed: a
 * "yes" keeps the place, a "no" gives it straight back to the clinic. Saying
 * nothing is the worst outcome for everyone, so the deadline is stated plainly.
 */
export function FollowUpPrompt({ token: t, onDone }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(null);
  const f = t.followUp;
  if (!f?.status) return null;

  const when = `${longDate(t.date)}, ${SHIFT_LABEL[t.shift] || t.shift || ''}${t.startTime ? ` (${t12(t.startTime)}–${t12(t.endTime)})` : ''}`;

  const respond = async (attending) => {
    if (!attending) {
      const ok = await confirm({
        title: 'Can’t make the follow-up?',
        message: `Your follow-up with ${t.doctorId?.name} on ${when} will be cancelled and the slot given to another patient.`,
        detail: 'You can book a new visit any time from Explore.',
        confirmLabel: 'Yes, cancel it',
        danger: true,
      });
      if (!ok) return;
    }
    setBusy(attending ? 'yes' : 'no');
    try {
      await api.post(`/api/queue/tokens/${t._id}/followup/respond`, { attending });
      toast.success(attending ? 'Thanks — your follow-up is confirmed' : 'Follow-up cancelled. The slot has been freed.');
      onDone?.();
    } catch (e) {
      toast.error(e.message);
      onDone?.();
    } finally {
      setBusy(null);
    }
  };

  if (f.status === FOLLOWUP_STATUS.PENDING && t.status === 'WAITING') {
    const late = isOverdue(f.status, f.respondBy);
    return (
      <div className="rounded-lg border border-mg-teal/40 bg-teal-50/60 p-3 space-y-2.5">
        <div className="flex items-start gap-2.5">
          <span className="w-8 h-8 rounded-full bg-mg-teal text-white grid place-items-center shrink-0">
            <Icon name="refresh" className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">Follow-up booked by {t.doctorId?.name}</p>
            <p className="text-xs text-slate-700 mt-0.5">{when}</p>
            {f.note && <p className="text-xs text-slate-600 mt-0.5">For: {f.note}</p>}
            <p className={`text-[11px] mt-1 ${late ? 'text-rose-600 font-semibold' : 'text-slate-500'}`}>
              {late
                ? 'Please reply now — the clinic may give this slot to someone else.'
                : `Please reply by ${replyBy(f.respondBy)}, or the clinic may release the slot.`}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" onClick={() => respond(true)} loading={busy === 'yes'} disabled={Boolean(busy)}>
            Yes, I’ll come
          </Button>
          <Button size="sm" variant="secondary" onClick={() => respond(false)} loading={busy === 'no'} disabled={Boolean(busy)}>
            Can’t make it
          </Button>
        </div>
      </div>
    );
  }

  if (f.status === FOLLOWUP_STATUS.CONFIRMED && t.status === 'WAITING') {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
        <p className="text-xs text-emerald-800 flex items-center gap-1.5">
          <Icon name="check" className="w-3.5 h-3.5" /> Follow-up confirmed{f.note ? ` · ${f.note}` : ''}
        </p>
        <button
          type="button"
          onClick={() => respond(false)}
          disabled={Boolean(busy)}
          className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 shrink-0"
        >
          Can’t make it now?
        </button>
      </div>
    );
  }

  if (f.status === FOLLOWUP_STATUS.RELEASED) {
    return (
      <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
        This follow-up was released because the clinic did not hear back. Book a new visit any time.
      </p>
    );
  }
  if (f.status === FOLLOWUP_STATUS.DECLINED) {
    return (
      <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
        You let the clinic know you could not attend this follow-up.
      </p>
    );
  }
  return null;
}
