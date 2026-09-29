import clsx from 'clsx';
import { useIsBrandTheme } from '../../context/PortalTheme.jsx';

export function FilterPills({ options, value, onChange, className }) {
  const brand = useIsBrandTheme();
  return (
    <div className={clsx('inline-flex items-center gap-1 p-1 text-xs',
      brand ? 'bg-mg-surface rounded-full font-medium' : 'bg-slate-200/70 rounded-xl font-bold', className)}
    >
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
              brand ? 'px-4 py-1.5 rounded-full' : 'px-3 py-1 rounded-lg',
              value === val
                ? (brand ? 'bg-mg-blue text-white' : 'bg-white text-slate-900 shadow-sm')
                : 'text-slate-600 hover:text-slate-900',
            )}
          >
            {label}
            {count != null && <span className={clsx('ml-1', brand && value === val ? 'text-white/70' : 'text-slate-400')}>({count})</span>}
          </button>
        );
      })}
    </div>
  );
}
