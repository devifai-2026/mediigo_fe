import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { PhotoOrFallback } from '../ui/PhotoOrFallback.jsx';
import { initialsOf } from '../../lib/format.js';

/**
 * OPD Desk primitives, in the patient portal's visual language: white cards
 * with a hairline border, navy headings, teal actions, blue accents.
 */

export function DeskCard({ className, children, as: Tag = 'section' }) {
  return (
    <Tag className={clsx('bg-white rounded-xl border border-slate-200 shadow-[0_1px_4px_rgba(15,23,42,0.05)]', className)}>
      {children}
    </Tag>
  );
}

const TILE = {
  teal: 'bg-teal-50 text-mg-teal border-teal-100',
  blue: 'bg-blue-50 text-mg-blue border-blue-100',
  amber: 'bg-amber-50 text-amber-600 border-amber-100',
  rose: 'bg-rose-50 text-rose-600 border-rose-100',
  emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
};

export function IconTile({ icon, tone = 'teal', size = 'md' }) {
  return (
    <span className={clsx(
      'shrink-0 grid place-items-center rounded-lg border',
      size === 'lg' ? 'w-11 h-11 text-lg' : 'w-10 h-10 text-base',
      TILE[tone],
    )}>
      <i className={clsx('fa-solid', icon)} aria-hidden="true" />
    </span>
  );
}

/** The heading row every desk page opens with. */
/**
 * The desk's one Refresh control. Live updates arrive over the socket, but a
 * flaky clinic connection is common enough that staff need a way to be sure.
 */
export function RefreshButton({ onRefresh, label = 'Refresh', className }) {
  const [spinning, setSpinning] = useState(false);
  const run = async () => {
    setSpinning(true);
    try { await onRefresh?.(); } finally { setTimeout(() => setSpinning(false), 400); }
  };
  return (
    <button
      type="button"
      onClick={run}
      disabled={spinning}
      className={clsx(
        'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition disabled:opacity-60',
        className,
      )}
    >
      <i className={clsx('fa-solid fa-rotate-right', spinning && 'animate-spin')} aria-hidden="true" /> {label}
    </button>
  );
}

export function PageHeader({ icon, tone, title, subtitle, badge, children }) {
  return (
    <DeskCard className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        {icon && <IconTile icon={icon} tone={tone} size="lg" />}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-xl font-semibold text-slate-900">{title}</h1>
            {badge}
          </div>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </DeskCard>
  );
}

export function SectionHead({ icon, title, subtitle, right, className }) {
  return (
    <div className={clsx('flex flex-col sm:flex-row sm:items-center justify-between gap-3', className)}>
      <div>
        <h3 className="flex items-center gap-2 text-[15px] font-semibold text-slate-900">
          {icon && <i className={clsx('fa-solid text-mg-teal', icon)} aria-hidden="true" />}
          {title}
        </h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
    </div>
  );
}

const PILL = {
  teal: 'bg-teal-50 text-mg-teal border-teal-200',
  blue: 'bg-blue-50 text-mg-blue border-blue-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  rose: 'bg-rose-50 text-rose-600 border-rose-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  slate: 'bg-slate-100 text-slate-600 border-slate-200',
};

export function Pill({ tone = 'slate', dot = false, className, children }) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full border whitespace-nowrap', PILL[tone], className)}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function Segmented({ value, onChange, options, className, size = 'md' }) {
  return (
    <div className={clsx('inline-flex items-center gap-0.5 p-1 rounded-lg bg-mg-surface max-w-full overflow-x-auto no-scrollbar', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={clsx(
            'rounded-lg font-medium whitespace-nowrap transition',
            size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs',
            value === o.value ? 'bg-mg-blue text-white shadow-sm' : 'text-slate-600 hover:text-slate-900',
          )}
        >
          {o.label}
          {o.count != null && <span className={clsx('ml-1', value === o.value ? 'text-white/70' : 'text-slate-400')}>{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

const STAT_ICON = { blue: 'text-mg-blue', teal: 'text-mg-teal', amber: 'text-amber-500', rose: 'text-rose-500', emerald: 'text-emerald-500' };

/** A counter tile: label, icon, big number, and a small tag under it. */
export function StatTile({ label, value, icon, tone = 'blue', tag, tagTone, hint, dark = false }) {
  return (
    <DeskCard className={clsx('px-4 py-4', dark && '!bg-mg-navy !border-mg-navy text-white')}>
      <div className="flex items-start justify-between gap-2">
        <p className={clsx('text-[11px] font-medium uppercase tracking-wide', dark ? 'text-white/70' : 'text-slate-500')}>{label}</p>
        {icon && <i className={clsx('fa-solid text-sm', icon, dark ? 'text-mg-mint' : STAT_ICON[tone])} aria-hidden="true" />}
      </div>
      <div className="flex items-end justify-between gap-2 mt-2">
        <p className={clsx('text-2xl font-semibold leading-none tracking-tight', dark ? 'text-mg-mint' : 'text-slate-900')}>{value}</p>
        {tag && <Pill tone={tagTone || 'slate'}>{tag}</Pill>}
      </div>
      {hint && <p className={clsx('text-[11px] mt-2', dark ? 'text-white/60' : 'text-slate-400')}>{hint}</p>}
    </DeskCard>
  );
}

export function Avatar({ name, src, className = 'w-10 h-10', tone = 'blue' }) {
  return (
    <span className={clsx(
      'shrink-0 rounded-lg overflow-hidden grid place-items-center text-xs font-semibold text-white',
      tone === 'teal' ? 'bg-mg-teal' : 'bg-mg-blue',
      className,
    )}>
      <PhotoOrFallback src={src} className="w-full h-full object-cover" fallback={initialsOf(name)} />
    </span>
  );
}

/**
 * Which doctor a front-desk page is looking at. Chips rather than a dropdown:
 * a clinic has a handful of doctors and the desk switches between them often.
 */
export function DoctorPicker({ doctors = [], value, onChange, allowAll = false, className }) {
  const chips = allowAll ? [{ _id: '', name: 'All doctors' }, ...doctors] : doctors;
  return (
    <div className={clsx('flex items-center gap-2 overflow-x-auto no-scrollbar', className)}>
      {chips.map((d) => {
        const active = (value || '') === d._id;
        return (
          <button
            key={d._id || 'all'}
            type="button"
            onClick={() => onChange(d._id)}
            aria-pressed={active}
            className={clsx(
              'shrink-0 flex items-center gap-2.5 pl-1.5 pr-3.5 py-1.5 rounded-lg border text-left transition',
              active ? 'bg-blue-50 border-mg-blue ring-1 ring-mg-blue/30' : 'bg-white border-slate-200 hover:border-slate-300',
            )}
          >
            {d._id ? (
              <Avatar name={d.name} src={d.photo?.url} className="w-8 h-8" tone={active ? 'blue' : 'teal'} />
            ) : (
              <span className="w-8 h-8 rounded-lg grid place-items-center bg-slate-100 text-slate-500 text-xs">
                <i className="fa-solid fa-users" aria-hidden="true" />
              </span>
            )}
            <span className="min-w-0">
              <span className="block text-[13px] font-medium text-slate-900 leading-tight">{d.name}</span>
              {d._id && (
                <span className="block text-[11px] text-slate-500 leading-tight">
                  {[d.specialty, d.chamberNumber && `Chamber ${d.chamberNumber}`].filter(Boolean).join(' • ')}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Browsers block audio until a tap; this is that tap. */
export function AudioUnlockBanner({ onUnlock, children }) {
  return (
    <button
      type="button"
      onClick={onUnlock}
      className="w-full p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-center justify-center gap-2"
    >
      <i className="fa-solid fa-volume-high" aria-hidden="true" />
      {children}
    </button>
  );
}

export function EmptyNote({ icon = 'fa-folder-open', title, hint }) {
  return (
    <div className="py-10 text-center">
      <i className={clsx('fa-solid text-2xl text-slate-300', icon)} aria-hidden="true" />
      <p className="text-sm font-medium text-slate-700 mt-3">{title}</p>
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

/**
 * Print `children` on their own, outside the app tree, then call onDone.
 * Pages default to A5 (a prescription pad); the 80mm receipt roll is the
 * stylesheet default and is left alone for receipts.
 */
export function PrintPortal({ active, onDone, page = 'A5', children }) {
  useEffect(() => {
    if (!active) return undefined;
    const id = requestAnimationFrame(() => {
      const after = () => {
        window.removeEventListener('afterprint', after);
        onDone?.();
      };
      window.addEventListener('afterprint', after);
      window.print();
    });
    return () => cancelAnimationFrame(id);
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!active) return null;
  return createPortal(
    <div className="text-black font-display text-[12px] leading-relaxed">
      <style>{`@page { size: ${page}; margin: 12mm; }`}</style>
      {children}
    </div>,
    document.getElementById('print-root'),
  );
}

/**
 * What a desk section shows when its data could not be loaded, instead of a
 * skeleton that never resolves. A 404 almost always means the server is
 * running an older build than this page, so it says that plainly.
 */
export function LoadError({ error, onRetry, what = 'this section', className }) {
  if (!error) return null;
  const outdated = error.status === 404;
  return (
    <DeskCard className={clsx('p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-rose-200 bg-rose-50/40', className)}>
      <div className="flex items-start gap-3 min-w-0">
        <i className="fa-solid fa-triangle-exclamation text-rose-500 mt-0.5" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900">Couldn’t load {what}</p>
          <p className="text-xs text-slate-600 mt-0.5">
            {outdated
              ? 'The server does not have this feature yet — the backend needs to be updated to the latest version.'
              : error.message || 'Something went wrong. Check your connection and try again.'}
          </p>
        </div>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:border-mg-teal hover:text-mg-teal"
        >
          <i className="fa-solid fa-rotate-right" aria-hidden="true" /> Try again
        </button>
      )}
    </DeskCard>
  );
}
