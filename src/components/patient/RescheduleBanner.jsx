import { useState } from 'react';
import clsx from 'clsx';
import { api, unwrap } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Icon } from '../ui/Icon.jsx';

const DAY_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SHIFT_LABEL = { MORNING: 'Morning', AFTERNOON: 'Afternoon', EVENING: 'Evening' };

/**
 * Shown against a booking whose doctor has gone off.
 *
 * The token is held, not cancelled, so this is an invitation to pick a new
 * slot rather than a notice that they have lost their place. Nobody is moved
 * for them — a system-chosen time is as likely to be wrong as right.
 */
export function RescheduleBanner({ token, onDone }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState(null);
  const [picked, setPicked] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setOpen(true);
    try {
      const d = unwrap(await api.get(`/api/queue/tokens/${token.tokenId || token._id}/reschedule-options`));
      setOptions(d);
      const first = d.days?.[0];
      const firstShift = first?.shifts.find((s) => s.isBookable);
      if (first && firstShift) setPicked({ date: first.date, shift: firstShift.shift });
    } catch (e) {
      toast.error(e.message);
      setOpen(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    try {
      const t = unwrap(await api.post(`/api/queue/tokens/${token.tokenId || token._id}/reschedule`, picked));
      toast.success(`Moved to ${t.date} — token #${String(t.tokenNumber).padStart(2, '0')}`);
      setOpen(false);
      onDone?.();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="p-3 rounded-2xl bg-amber-50 border border-amber-300 flex items-start gap-2.5">
        <Icon name="pause" className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
        <div className="flex-grow min-w-0">
          <p className="text-xs font-bold text-amber-900">
            {token.rescheduleReason || 'Your doctor is unavailable'}
          </p>
          <p className="text-[11px] text-amber-800 mt-0.5">
            Your place is held. Pick a new time that suits you.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="shrink-0 text-[11px] font-bold text-amber-900 bg-amber-200 hover:bg-amber-300 px-3 py-1.5 rounded-lg transition"
        >
          Choose a new time
        </button>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Pick a new time" size="md">
        {!options ? (
          <p className="text-xs text-slate-400">Loading open slots…</p>
        ) : !options.days?.length ? (
          <div className="space-y-3">
            <p className="text-xs text-slate-600">
              {options.doctorName} has no open sittings in the next 7 days. The clinic will be in touch,
              or you can book a different doctor.
            </p>
            <Button variant="secondary" className="w-full" onClick={() => setOpen(false)}>Close</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              {options.doctorName} · {options.clinicName}
            </p>

            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {options.days.map((d) => (
                <button
                  key={d.date}
                  type="button"
                  onClick={() => {
                    const first = d.shifts.find((s) => s.isBookable);
                    setPicked({ date: d.date, shift: first?.shift });
                  }}
                  className={clsx(
                    'shrink-0 w-14 py-2 rounded-xl border-2 text-center transition',
                    picked?.date === d.date ? 'border-teal-600 bg-teal-50' : 'border-slate-200 bg-white hover:border-teal-300',
                  )}
                >
                  <span className="block text-[9px] font-bold uppercase text-slate-400">
                    {d.isToday ? 'Today' : DAY_LABEL[d.dayOfWeek]}
                  </span>
                  <span className="block text-base font-black text-slate-800">{Number(d.date.slice(8, 10))}</span>
                </button>
              ))}
            </div>

            {(() => {
              const day = options.days.find((d) => d.date === picked?.date);
              if (!day) return null;
              return (
                <div className="grid grid-cols-2 gap-2">
                  {day.shifts.filter((s) => s.isBookable).map((s) => (
                    <button
                      key={s.shift}
                      type="button"
                      onClick={() => setPicked({ date: day.date, shift: s.shift })}
                      className={clsx(
                        'p-2.5 rounded-xl border-2 text-left transition',
                        picked?.shift === s.shift ? 'border-teal-600 bg-teal-50' : 'border-slate-200 bg-slate-50 hover:border-teal-300',
                      )}
                    >
                      <span className="block text-[11px] font-bold text-slate-800">{SHIFT_LABEL[s.shift] || s.shift}</span>
                      <span className="block text-[10px] text-slate-500">{s.startTime}–{s.endTime}</span>
                    </button>
                  ))}
                </div>
              );
            })()}

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              <Button loading={busy} disabled={!picked?.shift} onClick={confirm}>Confirm new time</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
