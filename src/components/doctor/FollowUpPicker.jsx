import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { api, unwrap } from '../../lib/api.js';
import { SHIFT_LABEL, t12 } from '../../lib/followUps.js';

const DAY_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "Come back in…" — the way doctors actually phrase it. Each jumps to the first
// sitting on or after that day, since the exact day is rarely a sitting.
const PRESETS = [
  { label: '3 days', days: 3 },
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '1 month', days: 30 },
  { label: '3 months', days: 90 },
];

const plusDays = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return new Intl.DateTimeFormat('en-CA').format(d);
};

/**
 * Pick a date and sitting for a follow-up, from the doctor's own schedule over
 * the next 90 days. `value` is { date, shift } or null.
 */
export function FollowUpPicker({ doctorId, value, onChange }) {
  const [days, setDays] = useState(null);
  const [error, setError] = useState(null);
  const stripRef = useRef(null);

  useEffect(() => {
    let alive = true;
    api.get(`/api/queue/${doctorId}/followup-options`)
      .then((res) => { if (alive) setDays(unwrap(res)?.days ?? []); })
      .catch((e) => { if (alive) { setDays([]); setError(e.message); } });
    return () => { alive = false; };
  }, [doctorId]);

  // Keep the chosen date in view when a preset jumps weeks ahead.
  useEffect(() => {
    if (!value?.date) return;
    stripRef.current?.querySelector(`[data-date="${value.date}"]`)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [value?.date]);

  const openDays = (days || []).filter((d) => d.shifts.some((s) => s.isBookable));

  const pick = (day, shift) => {
    const sh = shift ?? day.shifts.find((s) => s.isBookable)?.shift;
    onChange(sh ? { date: day.date, shift: sh } : null);
  };

  const preset = (n) => {
    const target = plusDays(n);
    const day = openDays.find((d) => d.date >= target) ?? openDays[openDays.length - 1];
    if (day) pick(day);
  };

  if (days === null) return <p className="text-xs text-slate-400 py-3">Loading your sittings…</p>;
  if (error) return <p className="text-xs text-rose-600 py-3">{error}</p>;
  if (!openDays.length) {
    return <p className="text-xs text-slate-500 py-3">No open sittings in the next 90 days. Add sittings in Settings first.</p>;
  }

  const selected = days.find((d) => d.date === value?.date);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => preset(p.days)}
            className="px-2.5 py-1 rounded-full border border-slate-200 text-[11px] font-semibold text-slate-600 hover:border-mg-teal hover:text-mg-teal"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div ref={stripRef} className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {days.map((d) => {
          const open = d.shifts.some((s) => s.isBookable);
          const active = value?.date === d.date;
          const [, m, dd] = d.date.split('-').map(Number);
          return (
            <button
              key={d.date}
              type="button"
              data-date={d.date}
              disabled={!open}
              onClick={() => pick(d)}
              className={clsx(
                'shrink-0 w-12 py-1.5 rounded-lg border text-center transition',
                active ? 'border-mg-teal bg-mg-teal/10'
                  : open ? 'border-slate-200 hover:border-mg-teal/50'
                    : 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed',
              )}
            >
              <span className="block text-[9px] font-bold uppercase text-slate-400">{DAY_LABEL[d.dayOfWeek]}</span>
              <span className={clsx('block text-base font-bold leading-tight', active ? 'text-mg-teal' : 'text-slate-800')}>{dd}</span>
              <span className="block text-[9px] text-slate-400">{MONTH[m - 1]}</span>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {selected.shifts.map((s) => (
            <button
              key={s.shift}
              type="button"
              disabled={!s.isBookable}
              onClick={() => pick(selected, s.shift)}
              className={clsx(
                'p-2 rounded-lg border text-left transition',
                value?.shift === s.shift && s.isBookable ? 'border-mg-teal bg-mg-teal/10'
                  : s.isBookable ? 'border-slate-200 hover:border-mg-teal/50'
                    : 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed',
              )}
            >
              <span className="block text-xs font-bold text-slate-800">{SHIFT_LABEL[s.shift] || s.shift}</span>
              <span className="block text-[10px] text-slate-500">{t12(s.startTime)}–{t12(s.endTime)}</span>
              {s.isFull ? <span className="block text-[10px] text-amber-600 font-semibold">Full</span>
                : s.remaining != null && <span className="block text-[10px] text-mg-teal">{s.remaining} left</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
