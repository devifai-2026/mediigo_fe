import clsx from 'clsx';

/**
 * Integer rupees only. OPD cash has no paise, and allowing decimals here is how
 * a float-drift bug reaches the tender assertion.
 */
export function MoneyInput({ value, onChange, tone = 'slate', placeholder = '0', disabled, className, ...rest }) {
  const tones = {
    cash: 'focus:border-emerald-500 text-emerald-700',
    upi: 'focus:border-blue-500 text-blue-700',
    slate: 'focus:border-slate-500 text-slate-800',
  };

  const handle = (e) => {
    const raw = e.target.value.replace(/[^\d]/g, '');
    onChange(raw === '' ? '' : Number(raw));
  };

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold pointer-events-none">₹</span>
      <input
        inputMode="numeric"
        value={value === '' || value == null ? '' : value}
        onChange={handle}
        placeholder={placeholder}
        disabled={disabled}
        className={clsx(
          'w-full pl-7 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold',
          'focus:outline-none transition disabled:opacity-60 disabled:bg-slate-50',
          tones[tone], className,
        )}
        {...rest}
      />
    </div>
  );
}
