import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Button } from '../ui/Button.jsx';

/**
 * Date helpers in the clinic's day. Every report is filed under a
 * clinic-local 'YYYY-MM-DD', so "today" must be the clinic's today, not
 * whatever the browser's clock says it is in UTC.
 */
const TZ = 'Asia/Kolkata';
export const isoToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());

export const shiftIso = (iso, delta) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
};

const monthStart = (iso) => `${iso.slice(0, 7)}-01`;
const prevMonth = (iso) => {
  const d = new Date(`${monthStart(iso)}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - 1);
  const from = d.toISOString().slice(0, 10);
  return { from, to: shiftIso(monthStart(iso), -1) };
};

const fmt = (iso, withYear = true) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', {
  day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}),
});

export const daysIn = ({ from, to }) => Math.round((new Date(`${to}T00:00:00Z`) - new Date(`${from}T00:00:00Z`)) / 86400000) + 1;

/** "Today", "11 Oct 2026", or "1 Oct – 12 Oct 2026". */
export const rangeLabel = ({ from, to }) => {
  const today = isoToday();
  if (from === to) {
    if (from === today) return 'Today';
    if (from === shiftIso(today, -1)) return 'Yesterday';
    return fmt(from);
  }
  return `${fmt(from, from.slice(0, 4) !== to.slice(0, 4))} – ${fmt(to)}`;
};

export const PRESETS = [
  { key: 'today', label: 'Today', range: (t) => ({ from: t, to: t }) },
  { key: 'yesterday', label: 'Yesterday', range: (t) => ({ from: shiftIso(t, -1), to: shiftIso(t, -1) }) },
  { key: 'week', label: 'Last 7 days', range: (t) => ({ from: shiftIso(t, -6), to: t }) },
  { key: 'month', label: 'Last 30 days', range: (t) => ({ from: shiftIso(t, -29), to: t }) },
  { key: 'thisMonth', label: 'This month', range: (t) => ({ from: monthStart(t), to: t }) },
  { key: 'lastMonth', label: 'Last month', range: (t) => prevMonth(t) },
];

/** The preset a range corresponds to, if any. */
export const presetOf = (range) => {
  const t = isoToday();
  return PRESETS.find((p) => {
    const r = p.range(t);
    return r.from === range.from && r.to === range.to;
  })?.key ?? null;
};

const MAX_DAYS = 366;

/**
 * Calendar button for reports: pick one day, or a range of up to a year.
 * Nothing changes until Apply, so a half-picked range never fires a request.
 */
export function DateRangePicker({ value, onChange, className }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState(value.from === value.to ? 'day' : 'range');
  const [draft, setDraft] = useState(value);
  const ref = useRef(null);
  const today = isoToday();

  useEffect(() => {
    if (!open) return undefined;
    setDraft(value);
    setMode(value.from === value.to ? 'day' : 'range');
    const away = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const span = draft.from && draft.to ? daysIn(draft) : 0;
  const error = !draft.from || !draft.to
    ? 'Pick a date'
    : draft.from > draft.to
      ? 'Start date is after the end date'
      : draft.to > today
        ? 'That date has not happened yet'
        : span > MAX_DAYS ? `Pick up to ${MAX_DAYS} days` : null;

  const apply = (r) => {
    onChange(r);
    setOpen(false);
  };

  const input = 'w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-xs text-slate-900 focus:outline-none focus:border-mg-teal focus:ring-1 focus:ring-mg-teal';

  return (
    <div className={clsx('relative', className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={clsx(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition',
          open ? 'border-mg-blue bg-blue-50 text-mg-blue' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
        )}
      >
        <i className="fa-regular fa-calendar text-mg-teal" aria-hidden="true" />
        <span className="whitespace-nowrap">{rangeLabel(value)}</span>
        <i className={clsx('fa-solid fa-chevron-down text-[10px] text-slate-400 transition', open && 'rotate-180')} aria-hidden="true" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose dates"
          className="absolute left-0 sm:left-auto sm:right-0 mt-2 z-30 w-[min(300px,calc(100vw-2rem))] sm:w-[440px] bg-white rounded-xl border border-slate-200 shadow-xl p-4 animate-fade-in"
        >
          <div className="sm:flex gap-4">
            <div className="hidden sm:flex flex-col gap-0.5 w-32 shrink-0 border-r border-slate-100 pr-3">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 mb-1">Quick pick</span>
              {PRESETS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => apply(p.range(today))}
                  className={clsx(
                    'text-left px-2 py-1.5 rounded-lg text-xs transition',
                    presetOf(value) === p.key ? 'bg-blue-50 text-mg-blue font-medium' : 'text-slate-600 hover:bg-slate-50',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex-1 space-y-3">
              <div className="flex gap-0.5 p-1 rounded-lg bg-mg-surface">
                {[['day', 'Single day'], ['range', 'Date range']].map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      setMode(k);
                      if (k === 'day') setDraft((d) => ({ from: d.to || d.from, to: d.to || d.from }));
                    }}
                    className={clsx('flex-1 py-1.5 rounded-lg text-xs font-medium transition',
                      mode === k ? 'bg-mg-blue text-white shadow-sm' : 'text-slate-600 hover:text-slate-900')}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {mode === 'day' ? (
                <label className="block">
                  <span className="block text-[11px] font-medium text-slate-700 mb-1">Date</span>
                  <input
                    type="date" className={input} max={today} value={draft.from}
                    onChange={(e) => setDraft({ from: e.target.value, to: e.target.value })}
                  />
                </label>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="block text-[11px] font-medium text-slate-700 mb-1">From</span>
                    <input
                      type="date" className={input} max={draft.to || today} value={draft.from}
                      onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
                    />
                  </label>
                  <label className="block">
                    <span className="block text-[11px] font-medium text-slate-700 mb-1">To</span>
                    <input
                      type="date" className={input} min={draft.from} max={today} value={draft.to}
                      onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
                    />
                  </label>
                </div>
              )}

              {/* Phones: the quick picks as chips under the inputs. */}
              <div className="flex flex-wrap gap-1.5 sm:hidden">
                {PRESETS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => apply(p.range(today))}
                    className="px-2 py-1 rounded-full border border-slate-200 text-[11px] text-slate-600"
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <p className={clsx('text-[11px]', error ? 'text-rose-600' : 'text-slate-500')}>
                {error || (span === 1 ? `Showing ${rangeLabel(draft)}` : `${span} days selected`)}
              </p>

              <div className="flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
                <Button size="sm" disabled={Boolean(error)} onClick={() => apply(draft)}>Apply</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
