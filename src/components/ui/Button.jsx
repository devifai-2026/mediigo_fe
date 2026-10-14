import clsx from 'clsx';

/**
 * The one button. Every portal uses the same shapes so the product reads as
 * one system: controls are rounded-lg (8px), cards rounded-xl, dialogs
 * rounded-2xl, pills rounded-full.
 */
const VARIANTS = {
  primary: 'bg-mg-teal hover:bg-mg-tealDark text-white shadow-sm shadow-mg-teal/20',
  secondary: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300',
  danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm',
  ghost: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
  dark: 'bg-mg-blue hover:bg-mg-navy text-white',
  warn: 'bg-amber-500 hover:bg-amber-600 text-white',
  outline: 'bg-white hover:bg-mg-teal/5 text-mg-tealDark border border-mg-teal',
};

const SIZES = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
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
        'font-semibold rounded-lg transition-all inline-flex items-center justify-center gap-1.5',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mg-teal focus-visible:ring-offset-2',
        'active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
        VARIANTS[variant], SIZES[size], className,
      )}
      {...rest}
    >
      {loading && (
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
