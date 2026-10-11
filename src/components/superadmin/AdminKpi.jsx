import clsx from 'clsx';

/**
 * Console KPI card in the patient portal's style: a white hairline card, a
 * small label, a semibold value, and a tinted icon tile. The accent names are
 * kept from the console's original vocabulary so every call site still works.
 */
const ACCENT = {
  indigo: { tile: 'bg-blue-50 text-mg-blue', value: 'text-slate-900', bar: 'bg-mg-blue' },
  emerald: { tile: 'bg-emerald-50 text-emerald-600', value: 'text-emerald-700', bar: 'bg-emerald-500' },
  teal: { tile: 'bg-teal-50 text-mg-teal', value: 'text-slate-900', bar: 'bg-mg-teal' },
  amber: { tile: 'bg-amber-50 text-amber-600', value: 'text-amber-600', bar: 'bg-amber-500' },
  rose: { tile: 'bg-rose-50 text-rose-600', value: 'text-rose-600', bar: 'bg-rose-500' },
  emeraldSlate: { tile: 'bg-emerald-50 text-emerald-600', value: 'text-slate-900', bar: 'bg-emerald-500' },
  indigoSlate: { tile: 'bg-blue-50 text-mg-blue', value: 'text-slate-900', bar: 'bg-mg-blue' },
  amberSlate: { tile: 'bg-amber-50 text-amber-600', value: 'text-slate-900', bar: 'bg-amber-500' },
  navy: { tile: 'bg-white/10 text-mg-mint', value: 'text-mg-mint', bar: 'bg-mg-mint', dark: true },
};

export function AdminKpi({ label, value, icon, accent = 'indigo', footer, className }) {
  const a = ACCENT[accent] ?? ACCENT.indigo;
  return (
    <div className={clsx(
      'relative overflow-hidden p-4 sm:p-5 rounded-xl border shadow-[0_1px_4px_rgba(15,23,42,0.05)]',
      a.dark ? 'bg-mg-navy border-mg-navy text-white' : 'bg-white border-slate-200',
      className,
    )}>
      <span aria-hidden="true" className={clsx('absolute left-0 top-4 bottom-4 w-1 rounded-r-full', a.bar)} />
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0">
          <p className={clsx('text-[11px] font-medium uppercase tracking-wide', a.dark ? 'text-white/70' : 'text-slate-500')}>{label}</p>
          <p className={clsx('text-2xl font-semibold mt-1 tracking-tight truncate', a.value)}>{value}</p>
        </div>
        <div className={clsx('w-10 h-10 shrink-0 rounded-lg grid place-items-center', a.tile)}>
          <i className={`fa-solid ${icon} text-base`} aria-hidden="true" />
        </div>
      </div>
      {footer && <p className={clsx('text-[11px] mt-2', a.dark ? 'text-white/60' : 'text-slate-500')}>{footer}</p>}
    </div>
  );
}

export function AdminPageHeader({ title, subtitle, icon, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_4px_rgba(15,23,42,0.05)] p-4 sm:p-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <span className="w-11 h-11 shrink-0 rounded-lg bg-blue-50 border border-blue-100 text-mg-blue grid place-items-center text-lg">
            <i className={`fa-solid ${icon}`} aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-semibold text-slate-900 tracking-tight">{title}</h1>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
