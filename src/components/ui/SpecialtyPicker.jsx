import { useState, useMemo, useRef } from 'react';
import clsx from 'clsx';
import { Icon } from './Icon.jsx';
import { AnchoredMenu } from './AnchoredMenu.jsx';

/**
 * Multi-select over the specialty master.
 *
 * A doctor is frequently more than one thing — a physician who also does
 * paediatrics — so this returns a list. The FIRST selected is the primary: it
 * is what the patient card leads with and what the existing `specialty` string
 * stores, so the order is meaningful rather than incidental and the UI says so.
 *
 * Hidden specialties are absent by design. The picker is fed the public list,
 * so an admin cannot assign a doctor to a tile patients can no longer see.
 */
export function SpecialtyPicker({
  options = [],
  value = [],
  onChange,
  label = 'Specialties',
  hint,
  required = false,
  disabled = false,
  max = 6,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const anchorRef = useRef(null);

  const byId = useMemo(() => new Map(options.map((o) => [o.id, o])), [options]);
  const selected = value.map((id) => byId.get(id)).filter(Boolean);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.name.toLowerCase().includes(q));
  }, [options, query]);

  const toggle = (id) => {
    if (value.includes(id)) {
      onChange(value.filter((x) => x !== id));
      return;
    }
    // A doctor listing every specialty is not a doctor with a specialty, so the
    // cap keeps the card meaningful rather than being an arbitrary limit.
    if (value.length >= max) return;
    onChange([...value, id]);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label className="text-[11px] font-semibold text-slate-600">
          {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>
        {selected.length > 1 && (
          <span className="text-[10px] text-slate-400">
            <strong className="text-slate-500">{selected[0].name}</strong> is primary
          </span>
        )}
      </div>

      <div
        ref={anchorRef}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-expanded={open}
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen((v) => !v); }
        }}
        className={clsx(
          'w-full min-h-[38px] flex items-center gap-1.5 flex-wrap px-2 py-1.5 rounded-lg border bg-white text-left transition',
          disabled ? 'opacity-60 cursor-not-allowed border-slate-200' : 'cursor-pointer border-slate-300 hover:border-mg-teal',
        )}
      >
        {selected.length === 0 ? (
          <span className="text-[11px] text-slate-400">Select one or more…</span>
        ) : selected.map((s, i) => (
          <span
            key={s.id}
            className={clsx(
              'inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded text-[10px] font-semibold',
              i === 0 ? 'bg-mg-teal/10 text-mg-teal' : 'bg-slate-100 text-slate-600',
            )}
          >
            {s.name}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); toggle(s.id); }}
              aria-label={`Remove ${s.name}`}
              className="hover:text-rose-600"
            >
              <Icon name="cross" className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
        <Icon name="chevronDown" className={clsx('w-3 h-3 text-slate-400 ml-auto shrink-0 transition', open && 'rotate-180')} />
      </div>

      {hint && <p className="text-[10px] text-slate-400">{hint}</p>}

      <AnchoredMenu anchorRef={anchorRef} open={open} onClose={() => setOpen(false)} minWidth={260}>
        {options.length > 6 && (
          <div className="p-2 border-b border-slate-100">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search specialty…"
              autoComplete="off"
              className="w-full px-2.5 py-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-mg-teal"
            />
          </div>
        )}

        {filtered.length === 0 ? (
          <p className="px-3 py-3 text-[11px] text-slate-400">
            {options.length === 0 ? 'No specialties published yet.' : `Nothing matches “${query}”.`}
          </p>
        ) : filtered.map((o) => {
          const checked = value.includes(o.id);
          const atCap = !checked && value.length >= max;
          return (
            <button
              key={o.id}
              type="button"
              disabled={atCap}
              onMouseDown={(e) => { e.preventDefault(); toggle(o.id); }}
              className={clsx(
                'w-full flex items-center gap-2.5 px-3 py-2 text-left transition',
                atCap ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-50',
              )}
            >
              <span className={clsx(
                'w-4 h-4 rounded border shrink-0 grid place-items-center',
                checked ? 'bg-mg-teal border-mg-teal text-white' : 'border-slate-300',
              )}>
                {checked && <Icon name="check" className="w-2.5 h-2.5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-semibold text-slate-800 truncate">{o.name}</span>
                {o.doctorCount != null && (
                  <span className="block text-[10px] text-slate-400">
                    {o.doctorCount} {o.doctorCount === 1 ? 'doctor' : 'doctors'}
                  </span>
                )}
              </span>
              {checked && value[0] === o.id && (
                <span className="text-[9px] font-bold uppercase text-mg-teal shrink-0">Primary</span>
              )}
            </button>
          );
        })}

        {value.length >= max && (
          <p className="px-3 py-2 text-[10px] text-amber-700 bg-amber-50 border-t border-amber-100">
            Up to {max} specialties. Remove one to add another.
          </p>
        )}
      </AnchoredMenu>
    </div>
  );
}
