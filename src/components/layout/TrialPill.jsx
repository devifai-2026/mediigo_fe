import clsx from 'clsx';
import { Icon } from '../ui/Icon.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

/**
 * Clinic trial countdown, shown in the staff navbar.
 *
 * Urgency is earned, not constant: a clinic with seven weeks left sees a quiet
 * slate chip, and only the last fortnight turns amber then rose. A banner that
 * shouts from day one is a banner people stop reading by the week it matters.
 *
 * It never says "expired" alone, because expiry is not a failure the clinic
 * must fix to keep working — service continues exactly as before, and the only
 * change is that tokens now bill. The wording says that plainly.
 */
export function TrialPill() {
  const { user } = useAuth();
  const clinic = user?.clinic;
  if (!clinic?.trialEndsAt) return null;

  const days = clinic.trialDaysLeft;
  const billing = clinic.isBillable;

  const tone = billing
    ? 'bg-slate-100 text-slate-600 border-slate-200'
    : days <= 7
      ? 'bg-rose-50 text-rose-700 border-rose-200'
      : days <= 14
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-slate-50 text-slate-600 border-slate-200';

  const label = billing
    ? 'Trial ended · billing active'
    : days <= 0
      ? 'Trial ends today'
      : `Trial ends in ${days} day${days === 1 ? '' : 's'}`;

  const ends = new Date(clinic.trialEndsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <span
      title={billing ? `Free trial ended ${ends}. Service continues as normal.` : `Free trial ends ${ends}`}
      className={clsx(
        'hidden sm:inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap',
        tone,
      )}
    >
      <Icon name="clock" className="w-3 h-3 shrink-0" strokeWidth={2.2} />
      {label}
    </span>
  );
}
