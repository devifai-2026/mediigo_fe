import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { api } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Button } from '../ui/Button.jsx';
import { Input, Select } from '../ui/Field.jsx';

const DAYS = [1, 2, 3, 4, 5, 6, 0];
const DAY_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SHIFTS = [['MORNING', 'Morning'], ['AFTERNOON', 'Afternoon'], ['EVENING', 'Evening']];
const DEFAULT_TIMES = { MORNING: ['10:00', '13:00'], AFTERNOON: ['14:00', '17:00'], EVENING: ['18:00', '21:00'] };

/**
 * The server stores one row per day per sitting. People think in "Mon–Sat,
 * 10 to 1", so rows with identical timings are grouped into one sitting with
 * a set of days, and expanded back on save.
 */
const group = (schedule = []) => {
  const byKey = new Map();
  for (const s of schedule) {
    const key = [s.shift, s.startTime, s.endTime, s.maxTokens ?? '', s.isActive !== false].join('|');
    if (!byKey.has(key)) {
      byKey.set(key, {
        id: key, days: [], shift: s.shift || 'MORNING', startTime: s.startTime, endTime: s.endTime,
        maxTokens: s.maxTokens ?? '', isActive: s.isActive !== false,
      });
    }
    byKey.get(key).days.push(s.day);
  }
  return [...byKey.values()];
};

const expand = (sittings) => sittings.flatMap((s) => s.days.map((day) => ({
  day,
  shift: s.shift,
  startTime: s.startTime,
  endTime: s.endTime,
  maxTokens: s.maxTokens === '' ? null : Number(s.maxTokens),
  isActive: s.isActive,
})));

/** Everything wrong with the sittings, in words the desk can act on. */
const problems = (sittings) => {
  const out = [];
  const seen = new Map();
  sittings.forEach((s, i) => {
    const n = i + 1;
    if (!s.days.length) out.push(`Sitting ${n}: pick at least one day`);
    if (!s.startTime || !s.endTime || s.startTime >= s.endTime) out.push(`Sitting ${n}: it must end after it starts`);
    s.days.forEach((d) => {
      const k = `${d}:${s.shift}`;
      if (seen.has(k)) out.push(`${DAY_LABEL[d]} has two ${s.shift.toLowerCase()} sittings (${seen.get(k)} and ${n}) — use different shifts`);
      else seen.set(k, n);
    });
  });
  return out;
};

let uid = 0;

/**
 * The doctor's recurring weekly sittings: which days, which shift, what
 * hours, and an optional token cap. Date-specific leave is the availability
 * manager's job; this is the pattern it applies to.
 */
export function WeeklyScheduleEditor({ doctorId, schedule, onSaved }) {
  const toast = useToast();
  const [sittings, setSittings] = useState(() => group(schedule));
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  // A refetch after some other save on the page must not wipe edits in progress.
  useEffect(() => { if (!dirty) setSittings(group(schedule)); }, [schedule]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (i, patch) => {
    setSittings((all) => all.map((s, j) => (j === i ? { ...s, ...patch } : s)));
    setDirty(true);
  };
  const toggleDay = (i, day) => {
    const s = sittings[i];
    update(i, { days: s.days.includes(day) ? s.days.filter((d) => d !== day) : [...s.days, day] });
  };
  const add = () => {
    const used = new Set(sittings.map((s) => s.shift));
    const shift = SHIFTS.map(([k]) => k).find((k) => !used.has(k)) || 'MORNING';
    setSittings((all) => [...all, {
      id: `new-${uid += 1}`, days: [1, 2, 3, 4, 5, 6], shift,
      startTime: DEFAULT_TIMES[shift][0], endTime: DEFAULT_TIMES[shift][1], maxTokens: '', isActive: true,
    }]);
    setDirty(true);
  };
  const remove = (i) => { setSittings((all) => all.filter((_, j) => j !== i)); setDirty(true); };

  const issues = problems(sittings);

  const save = async () => {
    setBusy(true);
    try {
      await api.put(`/api/doctors/${doctorId}/schedule`, { schedule: expand(sittings) });
      toast.success('Sitting days & timings saved — patients now book against them');
      setDirty(false);
      onSaved?.();
    } catch (e) {
      toast.error(e?.response?.data?.error?.message || e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-bold text-slate-900">Weekly sitting days &amp; timings</h4>
        <p className="text-[11px] text-slate-500">The regular pattern patients book against. Leave and one-off closures go in the 7-day planner below.</p>
      </div>

      {!sittings.length && (
        <p className="text-xs text-slate-500 bg-mg-surface rounded-lg p-3">
          No sittings set. Without them patients can only book same-day while bookings are open.
        </p>
      )}

      {sittings.map((s, i) => (
        <div key={s.id} className={clsx('rounded-lg border p-3 space-y-3', s.isActive ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50 opacity-75')}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-700">Sitting {i + 1}</span>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer">
                <input type="checkbox" checked={s.isActive} onChange={(e) => update(i, { isActive: e.target.checked })} />
                Active
              </label>
              <button type="button" onClick={() => remove(i)} className="text-[11px] font-medium text-rose-600 hover:underline">Remove</button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Days for sitting ${i + 1}`}>
            {DAYS.map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={s.days.includes(d)}
                onClick={() => toggleDay(i, d)}
                className={clsx(
                  'w-11 py-1.5 rounded-md border text-[11px] font-semibold transition',
                  s.days.includes(d) ? 'bg-mg-teal text-white border-mg-teal' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300',
                )}
              >
                {DAY_LABEL[d]}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <label className="text-[11px] text-slate-500">Shift
              <Select value={s.shift} onChange={(e) => update(i, { shift: e.target.value })} className="mt-1">
                {SHIFTS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </Select>
            </label>
            <label className="text-[11px] text-slate-500">Starts
              <Input type="time" value={s.startTime} onChange={(e) => update(i, { startTime: e.target.value })} className="mt-1" />
            </label>
            <label className="text-[11px] text-slate-500">Ends
              <Input type="time" value={s.endTime} onChange={(e) => update(i, { endTime: e.target.value })} className="mt-1" />
            </label>
            <label className="text-[11px] text-slate-500">Max tokens
              <Input inputMode="numeric" placeholder="No limit" value={s.maxTokens} onChange={(e) => update(i, { maxTokens: e.target.value.replace(/\D/g, '').slice(0, 3) })} className="mt-1" />
            </label>
          </div>
        </div>
      ))}

      {issues.length > 0 && (
        <ul className="text-[11px] text-rose-600 space-y-0.5">
          {issues.map((m) => <li key={m}><i className="fa-solid fa-circle-exclamation mr-1" aria-hidden="true" />{m}</li>)}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={add} disabled={sittings.length >= 6}>
          <i className="fa-solid fa-plus" aria-hidden="true" /> Add sitting
        </Button>
        <Button size="sm" onClick={save} loading={busy} disabled={!dirty || issues.length > 0}>
          Save days &amp; timings
        </Button>
      </div>
    </div>
  );
}
