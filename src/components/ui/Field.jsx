import clsx from 'clsx';
import { useIsBrandTheme } from '../../context/PortalTheme.jsx';

const INPUT = 'w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-teal-600 focus:bg-white transition disabled:opacity-60';
const BRAND_INPUT = 'w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-md text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-mg-teal focus:ring-1 focus:ring-mg-teal transition disabled:opacity-60';
const useInputClass = () => (useIsBrandTheme() ? BRAND_INPUT : INPUT);

export function Field({ label, error, hint, required, children, className }) {
  const brand = useIsBrandTheme();
  return (
    <div className={className}>
      {label && (
        <label className={brand
          ? 'block text-[11px] font-medium text-slate-700 mb-1'
          : 'block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1'}
        >
          {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="mt-1 text-[10px] text-slate-400">{hint}</p>}
      {error && <p className="mt-1 text-[10px] font-semibold text-rose-600">{error}</p>}
    </div>
  );
}

export function Input({ className, error, ...rest }) {
  return <input className={clsx(useInputClass(), error && 'border-rose-300 bg-rose-50/40', className)} {...rest} />;
}

export function Select({ className, children, ...rest }) {
  return (
    <select className={clsx(useInputClass(), 'cursor-pointer', className)} {...rest}>
      {children}
    </select>
  );
}

export function Textarea({ className, rows = 3, ...rest }) {
  return <textarea rows={rows} className={clsx(useInputClass(), 'resize-none', className)} {...rest} />;
}
