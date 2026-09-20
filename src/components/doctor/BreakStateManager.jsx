import { useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { api } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Button } from '../ui/Button.jsx';
import { Icon } from '../ui/Icon.jsx';
import { Countdown } from '../ui/Countdown.jsx';
import { BREAK_REASONS, BREAK_DURATIONS } from '../../lib/constants.js';

/**
 * Break control.
 *
 * A popover rather than a modal: this is a three-second interaction between
 * patients, not a form. breakUntil is computed SERVER-side from the chosen
 * duration — client clocks drift, and this value drives the estimate every
 * waiting patient sees.
 *
 * The countdown never auto-ends the break. Expiry shows "overdue" instead,
 * because silently resuming the queue for a doctor still in surgery would start
 * calling patients into an empty chamber.
 */
export function BreakStateManager({ doctorId, session, onChanged }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(BREAK_REASONS[0]);
  const [minutes, setMinutes] = useState(BREAK_DURATIONS[0]);
  const [busy, setBusy] = useState(false);
  const anchorRef = useRef(null);
  const [pos, setPos] = useState({ left: 0, top: 0, width: 280 });

  // Measure the trigger so the portalled popover lines up with it.
  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    const POPOVER_H = 230;
    const above = r.top - POPOVER_H - 8;
    setPos({ left: r.left, width: r.width, top: above > 8 ? above : r.bottom + 8 });
  }, [open]);

  const start = async () => {
    setBusy(true);
    try {
      await api.post(`/api/queue/${doctorId}/break`, { reason, minutes });
      toast.success(`On break — ${reason}, ${minutes} min`);
      setOpen(false);
      onChanged?.();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const end = async () => {
    setBusy(true);
    try {
      await api.post(`/api/queue/${doctorId}/resume`);
      toast.success('Break ended — queue resumed');
      onChanged?.();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (session?.isOnBreak) {
    return (
      <div className="bg-amber-500/20 border border-amber-400/40 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Icon name="pause" className="w-5 h-5 text-amber-300 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-amber-100">On break — {session.breakReason}</p>
              <p className="text-[11px] text-amber-200/80">
                Patients see the queue as paused ·{' '}
                <Countdown until={session.breakUntil} className="text-amber-100" overdueLabel="over" />
              </p>
            </div>
          </div>
        </div>
        <Button variant="warn" onClick={end} loading={busy} className="w-full">
          End break &amp; resume queue
        </Button>
      </div>
    );
  }

  return (
    <div className="relative" ref={anchorRef}>
      <Button variant="warn" onClick={() => setOpen((v) => !v)} className="w-full">
        <Icon name="pause" className="w-4 h-4" /> Take a break
      </Button>

      {/* Rendered in a portal: the chamber banner needs overflow-hidden for its
          rounded gradient, which would otherwise clip this popover entirely. */}
      {open && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            style={{ position: 'fixed', left: pos.left, top: pos.top, width: pos.width }}
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-4 z-50 space-y-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Reason</p>
            <div className="flex gap-1.5">
              {BREAK_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={clsx('flex-1 py-2 rounded-xl text-[11px] font-bold border transition',
                    reason === r ? 'bg-amber-500 text-white border-amber-500' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300')}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Duration</p>
            <div className="flex gap-1.5">
              {BREAK_DURATIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMinutes(m)}
                  className={clsx('flex-1 py-2 rounded-xl text-[11px] font-bold border transition',
                    minutes === m ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300')}
                >
                  {m} min
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="secondary" size="sm" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" className="flex-1" loading={busy} onClick={start}>Start break</Button>
          </div>
          </div>
        </>,
        document.body,
      )}
    </div>
  );
}
