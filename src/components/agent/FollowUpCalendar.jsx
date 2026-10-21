import { useMemo } from 'react';
import clsx from 'clsx';
import { DeskCard } from '../desk/ui.jsx';

const OPEN = new Set(['NEW', 'FOLLOW_UP', 'INTERESTED']);
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];



export const KIND = {
  PLANNED: { label: 'Scheduled', dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-800 border-amber-200' },
  OVERDUE: { label: 'Overdue', dot: 'bg-rose-500', chip: 'bg-rose-50 text-rose-800 border-rose-200' },
  DONE: { label: 'Visited', dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
};

/** Local-date key, so a 11:30 PM visit doesn't drift into the next day via UTC. */
export const dayKey = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

/**
 * Every dated thing on a lead becomes a calendar event: the next scheduled
 * visit (Scheduled, or Overdue once it has passed) and each visit already logged.
 */
export function followUpEvents(leads) {
  const now = new Date();
  const out = [];
  for (const lead of leads) {
    if (OPEN.has(lead.stage) && lead.nextVisitAt) {
      out.push({ lead, at: new Date(lead.nextVisitAt), kind: new Date(lead.nextVisitAt) < now ? 'OVERDUE' : 'PLANNED' });
    }
    for (const v of lead.visits ?? []) out.push({ lead, at: new Date(v.at), kind: 'DONE', visit: v });
  }
  return out.sort((a, b) => a.at - b.at);
}

const time = (d) => d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

/**
 * Month grid of follow-ups: each day shows what is scheduled, overdue or
 * already visited, so the agent can see exactly which date a clinic is due.
 */
export function FollowUpCalendar({ events, month, onMonth, selected, onSelect }) {
  const byDay = useMemo(() => {
    const m = new Map();
    for (const e of events) {
      const k = dayKey(e.at);
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(e);
    }
    return m;
  }, [events]);

  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const gridStart = new Date(first);
  gridStart.setDate(1 - first.getDay());
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
  // Drop a trailing week that belongs entirely to the next month.
  const weeks = cells[35].getMonth() !== month.getMonth() ? 5 : 6;

  const todayKey = dayKey(new Date());
  const monthEvents = events.filter((e) => e.at.getMonth() === month.getMonth() && e.at.getFullYear() === month.getFullYear());
  const totals = Object.keys(KIND).reduce((acc, k) => ({ ...acc, [k]: monthEvents.filter((e) => e.kind === k).length }), {});
  const shift = (n) => onMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));

  return (
    <DeskCard className="p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => shift(-1)} aria-label="Previous month" className="w-8 h-8 rounded-lg text-slate-500 hover:bg-mg-surface hover:text-slate-900">
            <i className="fa-solid fa-chevron-left text-xs" aria-hidden="true" />
          </button>
          <h3 className="text-sm font-semibold text-slate-900 min-w-[8.5rem] text-center">
            {month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
          </h3>
          <button type="button" onClick={() => shift(1)} aria-label="Next month" className="w-8 h-8 rounded-lg text-slate-500 hover:bg-mg-surface hover:text-slate-900">
            <i className="fa-solid fa-chevron-right text-xs" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => { const t = new Date(); onMonth(new Date(t.getFullYear(), t.getMonth(), 1)); onSelect(dayKey(t)); }}
            className="ml-1 px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-medium text-slate-700 hover:border-mg-teal hover:text-mg-teal"
          >
            Today
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
          {Object.entries(KIND).map(([k, v]) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <span className={clsx('w-2 h-2 rounded-full', v.dot)} />
              {v.label} <span className="text-slate-400">{totals[k]}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-7 text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
        {WEEKDAYS.map((w) => <div key={w} className="px-1.5 py-1">{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden">
        {cells.slice(0, weeks * 7).map((d) => {
          const k = dayKey(d);
          const list = byDay.get(k) ?? [];
          const inMonth = d.getMonth() === month.getMonth();
          const isSel = k === selected;
          const isToday = k === todayKey;
          return (
            <button
              key={k}
              type="button"
              onClick={() => onSelect(k)}
              aria-pressed={isSel}
              aria-label={`${d.toDateString()}: ${list.length} follow-up${list.length === 1 ? '' : 's'}`}
              className={clsx(
                'relative text-left min-h-[64px] sm:min-h-[96px] p-1 sm:p-1.5 flex flex-col gap-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-mg-teal',
                inMonth ? 'bg-white hover:bg-mg-surface' : 'bg-slate-50 text-slate-400',
                isSel && '!bg-blue-50 ring-2 ring-inset ring-mg-blue',
              )}
            >
              <span className={clsx(
                'text-[11px] font-semibold w-6 h-6 inline-flex items-center justify-center rounded-full',
                isToday ? 'bg-mg-blue text-white' : inMonth ? 'text-slate-700' : 'text-slate-400',
              )}>
                {d.getDate()}
              </span>
              {/* Phones: just dots. Wider screens: clinic names, a few per day. */}
              {list.length > 0 && (
                <div className="flex flex-wrap gap-0.5 sm:hidden">
                  {list.slice(0, 6).map((e, i) => <span key={i} className={clsx('w-1.5 h-1.5 rounded-full', KIND[e.kind].dot)} />)}
                </div>
              )}
              <div className="hidden sm:flex flex-col gap-0.5 min-w-0 w-full">
                {list.slice(0, 3).map((e, i) => (
                  <span key={i} className={clsx('truncate rounded border px-1 py-px text-[10px] leading-tight', KIND[e.kind].chip)}>
                    <span className="font-medium">{time(e.at)}</span> {e.lead.clinicName}
                  </span>
                ))}
                {list.length > 3 && <span className="text-[10px] text-slate-500 px-1">+{list.length - 3} more</span>}
              </div>
            </button>
          );
        })}
      </div>
    </DeskCard>
  );
}

/** The selected day's agenda, in time order. */
export function DayAgenda({ date, events }) {
  return (
    <DeskCard className="p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-semibold text-slate-900">
          <i className="fa-regular fa-calendar mr-1.5 text-mg-blue" aria-hidden="true" />
          {date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </h3>
        <span className="text-[11px] text-slate-500">{events.length} follow-up{events.length === 1 ? '' : 's'}</span>
      </div>
      {!events.length ? (
        <p className="text-xs text-slate-400 italic py-4 text-center">Nothing on this day.</p>
      ) : (
        <ol className="space-y-1.5">
          {events.map((e, i) => (
            <li key={i} className="flex items-center gap-3 rounded-lg bg-mg-surface px-3 py-2 text-xs">
              <span className="w-16 shrink-0 font-semibold text-slate-700">{time(e.at)}</span>
              <span className={clsx('w-2 h-2 rounded-full shrink-0', KIND[e.kind].dot)} />
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-slate-900 truncate">{e.lead.clinicName}</span>
                {e.lead.contactName && <span className="block text-[11px] text-slate-500 truncate">{e.lead.contactName}</span>}
              </span>
              <span className={clsx('shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium', KIND[e.kind].chip)}>{KIND[e.kind].label}</span>
            </li>
          ))}
        </ol>
      )}
    </DeskCard>
  );
}
