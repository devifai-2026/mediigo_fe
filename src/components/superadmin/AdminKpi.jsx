import clsx from 'clsx';

/**
 * KPI card from Admin.html: white card with a left accent bar, a small
 * uppercase label, a font-black value, an icon chip, and a footnote.
 */
const ACCENT = {
  indigo: { bar: 'border-l-indigo-600', chip: 'bg-indigo-50 text-indigo-600', label: 'text-slate-400', value: 'text-slate-900' },
  emerald: { bar: 'border-l-emerald-500', chip: 'bg-emerald-50 text-emerald-600', label: 'text-emerald-600', value: 'text-emerald-700' },
  teal: { bar: 'border-l-teal-500', chip: 'bg-teal-50 text-teal-600', label: 'text-teal-600', value: 'text-slate-900' },
  amber: { bar: 'border-l-amber-500', chip: 'bg-amber-50 text-amber-600', label: 'text-amber-600', value: 'text-amber-600' },
  emeraldSlate: { bar: 'border-l-emerald-500', chip: 'bg-emerald-50 text-emerald-600', label: 'text-emerald-600', value: 'text-slate-900' },
  indigoSlate: { bar: 'border-l-indigo-600', chip: 'bg-indigo-50 text-indigo-600', label: 'text-indigo-600', value: 'text-slate-900' },
  amberSlate: { bar: 'border-l-amber-500', chip: 'bg-amber-50 text-amber-600', label: 'text-amber-600', value: 'text-slate-900' },
};

export function AdminKpi({ label, value, icon, accent = 'indigo', footer }) {
  const a = ACCENT[accent] ?? ACCENT.indigo;
  return (
    <div className={clsx('bg-white p-5 rounded-2xl shadow-sm border border-slate-200 border-l-4', a.bar)}>
      <div className="flex justify-between items-start">
        <div>
          <p className={clsx('text-[11px] font-bold uppercase tracking-wider', a.label)}>{label}</p>
          <p className={clsx('text-2xl font-black mt-1', a.value)}>{value}</p>
        </div>
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center font-bold', a.chip)}>
          <i className={`fa-solid ${icon} text-lg`} />
        </div>
      </div>
      {footer && <p className="text-[11px] text-slate-500 mt-2">{footer}</p>}
    </div>
  );
}

export function AdminPageHeader({ title, subtitle, children }) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h1>
        <p className="text-xs text-slate-500 font-medium">{subtitle}</p>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
