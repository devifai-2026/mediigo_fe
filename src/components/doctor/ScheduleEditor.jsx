import { useState, useEffect } from 'react';
import clsx from 'clsx';
import { api } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Button } from '../ui/Button.jsx';
import { Icon } from '../ui/Icon.jsx';

const DAYS = [
  { value: 1, short: 'Mon' }, { value: 2, short: 'Tue' }, { value: 3, short: 'Wed' },
  { value: 4, short: 'Thu' }, { value: 5, short: 'Fri' }, { value: 6, short: 'Sat' },
  { value: 0, short: 'Sun' },
];

const SHIFTS = [
  { value: 'MORNING', label: 'Morning' },
  { value: 'AFTERNOON', label: 'Afternoon' },
  { value: 'EVENING', label: 'Evening' },
];

const blankRow = () => ({ days: [1], shift: 'MORNING', startTime: '10:00', endTime: '13:00', maxTokens: '' });

/**
 * Weekly sitting pattern.
 *
 * Edited as "these days, this time" rather than one row per day — a doctor who
 * sits Mon/Wed/Fri 10-1 thinks of that as one sitting, not three. It is
 * expanded to per-day rows on save, which is what the API stores.
 */
export function ScheduleEditor({ doctorId, schedule, onSaved }) {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);

  // Collapse the stored per-day rows back into groups, so reopening the editor
  // shows what was entered rather than an exploded list.
  useEffect(() => {
    if (!schedule) return;
    const groups = new Map();
    schedule.forEach((s) => {
      const key = `${s.shift}|${s.startTime}|${s.endTime}|${s.maxTokens ?? ''}`;
      if (!groups.has(key)) {
        groups.set(key, {
          days: [], shift: s.shift || 'MORNING', startTime: s.startTime,
          endTime: s.endTime, maxTokens: s.maxTokens ?? '',
        });
      }
      groups.get(key).days.push(s.day);
    });
    setRows(groups.size ? [...groups.values()] : [blankRow()]);
  }, [schedule]);

  const update = (i, patch) => setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  const toggleDay = (i, day) => update(i, {
    days: rows[i].days.includes(day) ? rows[i].days.filter((d) => d !== day) : [...rows[i].days, day],
  });

  const save = async () => {
    // Expand each group to one row per day — the shape the API stores.
    const flat = rows.flatMap((r) => r.days.map((day) => ({
      day,
      shift: r.shift,
      startTime: r.startTime,
      endTime: r.endTime,
      // Empty means uncapped, which is not the same as zero.
      maxTokens: r.maxTokens === '' || r.maxTokens == null ? null : Number(r.maxTokens),
    })));

    const bad = flat.find((s) => s.startTime >= s.endTime);
    if (bad) { toast.error('A sitting must end after it starts'); return; }
    if (rows.some((r) => !r.days.length)) { toast.error('Pick at least one day for every sitting'); return; }

    setBusy(true);
    try {
      await api.put(`/api/doctors/${doctorId}/schedule`, { schedule: flat });
      toast.success(flat.length ? `${flat.length} sittings saved` : 'Schedule cleared');
      onSaved?.();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-bold text-slate-900">Weekly sittings</h4>
        <p className="text-[11px] text-slate-500">
          Patients can book up to 7 days ahead. Leave the cap empty for no limit on a sitting.
        </p>
      </div>

      <div className="space-y-3">
        {rows.map((row, i) => (
          <div key={i} className="p-3 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1">
                {DAYS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleDay(i, d.value)}
                    className={clsx(
                      'w-10 py-1.5 text-[11px] font-bold rounded-lg border transition',
                      row.days.includes(d.value)
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300',
                    )}
                  >
                    {d.short}
                  </button>
                ))}
              </div>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => setRows((r) => r.filter((_, idx) => idx !== i))}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg shrink-0"
                  title="Remove this sitting"
                >
                  <Icon name="cross" className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sitting</span>
                <select
                  value={row.shift}
                  onChange={(e) => update(i, { shift: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold"
                >
                  {SHIFTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">From</span>
                <input
                  type="time"
                  value={row.startTime}
                  onChange={(e) => update(i, { startTime: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">To</span>
                <input
                  type="time"
                  value={row.endTime}
                  onChange={(e) => update(i, { endTime: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cap</span>
                <input
                  type="number"
                  min="1"
                  value={row.maxTokens}
                  onChange={(e) => update(i, { maxTokens: e.target.value })}
                  placeholder="No limit"
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold"
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setRows((r) => [...r, blankRow()])}
          className="text-xs font-bold text-teal-700 hover:underline"
        >
          + Add another sitting
        </button>
        <div className="flex gap-2">
          {rows.length > 0 && (
            <Button variant="secondary" onClick={() => setRows([])} disabled={busy}>Clear all</Button>
          )}
          <Button onClick={save} loading={busy}>Save schedule</Button>
        </div>
      </div>

      {rows.length === 0 && (
        <p className="text-[11px] text-amber-600 font-semibold">
          With no sittings saved, patients can only book for today while the queue is open.
        </p>
      )}
    </div>
  );
}
