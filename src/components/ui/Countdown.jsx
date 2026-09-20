import clsx from 'clsx';
import { useCountdown } from '../../hooks/useCountdown.js';

export function Countdown({ until, className, overdueLabel = 'overdue' }) {
  const { label, overdue } = useCountdown(until);
  if (!until) return null;
  return (
    <span className={clsx('font-mono font-bold tabular-nums', overdue ? 'text-rose-600' : 'text-amber-700', className)}>
      {label}{overdue && <span className="ml-1 font-sans text-[10px] uppercase">{overdueLabel}</span>}
    </span>
  );
}
