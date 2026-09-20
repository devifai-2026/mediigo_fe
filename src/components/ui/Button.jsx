import clsx from 'clsx';

const VARIANTS = {
  primary: 'bg-teal-600 hover:bg-teal-700 text-white shadow-sm shadow-teal-600/20',
  secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200',
  danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm',
  ghost: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
  dark: 'bg-slate-900 hover:bg-slate-800 text-white',
  warn: 'bg-amber-500 hover:bg-amber-600 text-white',
  outline: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-[11px]',
  md: 'px-4 py-2.5 text-xs',
  lg: 'px-6 py-3 text-sm',
};

export function Button({
  variant = 'primary', size = 'md', loading = false, disabled = false,
  className, children, type = 'button', ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={clsx(
        'font-bold rounded-xl transition-all inline-flex items-center justify-center gap-1.5',
        'active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
        VARIANTS[variant], SIZES[size], className,
      )}
      {...rest}
    >
      {loading && (
        <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
