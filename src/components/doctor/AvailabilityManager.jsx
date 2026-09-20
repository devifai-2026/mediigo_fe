import { useState } from 'react';
import clsx from 'clsx';
import { api, unwrap } from '../../lib/api.js';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useConfirm } from '../../context/ConfirmContext.jsx';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Field, Input } from '../ui/Field.jsx';
import { Icon } from '../ui/Icon.jsx';

const DAY_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SHIFT_LABEL = { MORNING: 'Morning', AFTERNOON: 'Afternoon', EVENING: 'Evening' };

const dayNumber = (iso) => Number(iso.slice(8, 10));
const monthShort = (iso) =>
  new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(new Date(`${iso}T12:00:00`));

/**
 * The next 7 days for one doctor, and the controls to close any of them.
 *
 * Used by the doctor and by the front desk — a clinic marks a doctor off at
 * least as often as the doctor does. Closing a sitting that already has
 * patients in it is stated up front, not discovered afterwards.
 */
export function AvailabilityManager({ doctorId, canEdit = true }) {
  const toast = useToast();
  const confirm = useConfirm();
  const { data, loading, refetch } = useApi(doctorId ? `/api/doctors/${doctorId}/availability` : null);
  const [dialog, setDialog] = useState(null); // { date, shift|null, booked }
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const days = data?.days ?? [];

  const markOff = async () => {
    setBusy(true);
    try {
      const out = unwrap(await api.post(`/api/doctors/${doctorId}/off`, {
        date: dialog.date,
        shift: dialog.shift ?? null,
        reason: reason.trim(),
      }));
      toast.success(
        out.affectedCount
          ? `Marked off — ${out.affectedCount} patient${out.affectedCount === 1 ? '' : 's'} asked to rebook`
          : 'Marked off',
      );
      setDialog(null);
      setReason('');
      refetch();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const clearOff = async (date, shift) => {
    if (!(await confirm({
      title: 'Reopen this sitting?',
      message: 'New bookings will be accepted again. Patients already asked to rebook keep their new slots.',
      confirmLabel: 'Reopen',
    }))) return;
    try {
      await api.post(`/api/doctors/${doctorId}/off/clear`, { date, shift: shift ?? null });
      toast.success('Reopened');
      refetch();
    } catch (e) {
      toast.error(e.message);
    }
  };

  if (loading) return <p className="text-xs text-slate-400">Loading availability…</p>;

  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-bold text-slate-900">Next 7 days</h4>
        <p className="text-[11px] text-slate-500">
          Close a day or a single sitting. Anyone already booked is asked to pick a new slot.
        </p>
      </div>

      <div className="space-y-2">
        {days.map((d) => (
          <div
            key={d.date}
            className={clsx(
              'p-3 rounded-2xl border flex items-start gap-3',
              d.isOpen ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-200',
            )}
          >
            <div className={clsx(
              'w-12 shrink-0 text-center rounded-xl py-1.5 border',
              d.isToday ? 'bg-teal-600 text-white border-teal-600' : 'bg-slate-50 text-slate-700 border-slate-200',
            )}>
              <p className="text-[9px] font-bold uppercase leading-none">{DAY_LABEL[d.dayOfWeek]}</p>
              <p className="text-base font-black leading-tight">{dayNumber(d.date)}</p>
              <p className="text-[9px] leading-none opacity-75">{monthShort(d.date)}</p>
            </div>

            <div className="flex-grow min-w-0">
              {d.shifts.length === 0 ? (
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-slate-500 italic">{d.closureReason}</p>
                  {canEdit && d.closureReason !== 'Not a sitting day' && (
                    <button type="button" onClick={() => clearOff(d.date, null)}
                      className="text-[11px] font-bold text-teal-700 hover:underline shrink-0">
                      Reopen
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {d.shifts.map((s) => (
                    <div key={s.shift} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800">
                          {SHIFT_LABEL[s.shift] || s.shift}
                          <span className="font-medium text-slate-500"> · {s.startTime}–{s.endTime}</span>
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {s.booked} booked
                          {s.maxTokens != null && <> of {s.maxTokens}</>}
                          {s.isFull && <span className="text-amber-600 font-bold"> · full</span>}
                          {s.endedToday && <span className="text-slate-400"> · ended</span>}
                        </p>
                      </div>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => { setDialog({ date: d.date, shift: s.shift, booked: s.booked }); setReason(''); }}
                          className="text-[11px] font-bold text-rose-600 hover:underline shrink-0"
                        >
                          Mark off
                        </button>
                      )}
                    </div>
                  ))}
                  {canEdit && d.shifts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const booked = d.shifts.reduce((a, s) => a + s.booked, 0);
                        setDialog({ date: d.date, shift: null, booked });
                        setReason('');
                      }}
                      className="text-[10px] font-bold text-slate-400 hover:text-rose-600"
                    >
                      Close the whole day
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={Boolean(dialog)}
        onClose={() => setDialog(null)}
        title={dialog?.shift ? `Close the ${(SHIFT_LABEL[dialog.shift] || '').toLowerCase()} sitting?` : 'Close this whole day?'}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            {dialog?.date} — new bookings will be refused.
          </p>

          {dialog?.booked > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-300">
              <p className="text-xs font-bold text-amber-900">
                <i className="fa-solid fa-triangle-exclamation mr-1.5" />
                {dialog.booked} patient{dialog.booked === 1 ? ' is' : 's are'} already booked
              </p>
              <p className="text-[11px] text-amber-800 mt-1">
                They keep their place and are asked to choose a new slot. Nobody is cancelled or moved without being told.
              </p>
            </div>
          )}

          <Field label="Reason" hint="Shown to the patient when they rebook">
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Doctor unavailable" />
          </Field>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDialog(null)}>Cancel</Button>
            <Button variant="danger" loading={busy} onClick={markOff}>
              <Icon name="pause" className="w-3.5 h-3.5" /> Mark off
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
