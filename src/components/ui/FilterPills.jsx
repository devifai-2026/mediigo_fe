import clsx from 'clsx';

export function FilterPills({ options, value, onChange, className }) {
  return (
    <div className={clsx('inline-flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl text-xs font-bold', className)}>
      {options.map((o) => {
        const val = typeof o === 'string' ? o : o.value;
        const label = typeof o === 'string' ? o : o.label;
        const count = typeof o === 'object' ? o.count : undefined;
        return (
          <button
            key={val}
            type="button"
            onClick={() => onChange(val)}
            className={clsx(
              'px-3 py-1 rounded-lg transition-all whitespace-nowrap',
              value === val ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900',
            )}
          >
            {label}
            {count != null && <span className="ml-1 text-slate-400">({count})</span>}
          </button>
        );
      })}
    </div>
  );
}
