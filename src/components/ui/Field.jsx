import clsx from 'clsx';

const INPUT = 'w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-teal-600 focus:bg-white transition disabled:opacity-60';

export function Field({ label, error, hint, required, children, className }) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
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
  return <input className={clsx(INPUT, error && 'border-rose-300 bg-rose-50/40', className)} {...rest} />;
}

export function Select({ className, children, ...rest }) {
  return (
    <select className={clsx(INPUT, 'cursor-pointer', className)} {...rest}>
      {children}
    </select>
  );
}

export function Textarea({ className, rows = 3, ...rest }) {
  return <textarea rows={rows} className={clsx(INPUT, 'resize-none', className)} {...rest} />;
}
