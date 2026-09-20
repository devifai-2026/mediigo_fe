import clsx from 'clsx';
import { Icon } from './Icon.jsx';

const TONES = {
  slate: { value: 'text-slate-900', chip: 'bg-teal-50 text-teal-600 border-teal-100' },
  teal: { value: 'text-teal-700', chip: 'bg-teal-50 text-teal-600 border-teal-100' },
  cash: { value: 'text-emerald-600', chip: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  upi: { value: 'text-blue-600', chip: 'bg-blue-50 text-blue-600 border-blue-100' },
  warn: { value: 'text-amber-600', chip: 'bg-amber-50 text-amber-600 border-amber-100' },
  alert: { value: 'text-rose-600', chip: 'bg-rose-50 text-rose-600 border-rose-100' },
};

export function StatCard({ label, value, hint, icon, tone = 'slate', footer, className }) {
  const t = TONES[tone] ?? TONES.slate;
  return (
    <div className={clsx('bg-white border border-slate-200 rounded-2xl p-5 shadow-sm', className)}>
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
          <h3 className={clsx('text-2xl font-black mt-1 truncate', t.value)}>{value}</h3>
        </div>
        {icon && (
          <div className={clsx('p-2.5 rounded-xl border shrink-0', t.chip)}>
            <Icon name={icon} className="w-5 h-5" />
          </div>
        )}
      </div>
      {hint && <p className="mt-2 text-[11px] text-slate-500 font-medium">{hint}</p>}
      {footer}
    </div>
  );
}
