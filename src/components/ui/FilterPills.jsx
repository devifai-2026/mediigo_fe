import clsx from 'clsx';

export function FilterPills({ options, value, onChange, className }) {
  return (
    <div className={clsx('inline-flex items-center gap-1 p-1 text-xs font-medium bg-mg-surface rounded-full max-w-full overflow-x-auto no-scrollbar', className)}>
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
              'transition-all whitespace-nowrap',
              'px-4 py-1.5 rounded-full',
              value === val ? 'bg-mg-blue text-white' : 'text-slate-600 hover:text-slate-900',
            )}
          >
            {label}
            {count != null && <span className={clsx('ml-1', value === val ? 'text-white/70' : 'text-slate-400')}>({count})</span>}
          </button>
        );
      })}
    </div>
  );
}
