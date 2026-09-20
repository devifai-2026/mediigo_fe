import clsx from 'clsx';

// Five-way map. The prototype used a two-way ternary, so a Rejected clinic
// rendered in the amber "pending" style — visually claiming it was still under
// review.
const STYLES = {
  WAITING: 'bg-amber-50 text-amber-700 border-amber-200',
  IN_CHAMBER: 'bg-teal-50 text-teal-700 border-teal-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  SKIPPED: 'bg-rose-50 text-rose-700 border-rose-200',

  PENDING_APPROVAL: 'bg-amber-50 text-amber-700 border-amber-200',
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  SUSPENDED: 'bg-amber-50 text-amber-800 border-amber-300',
  DEBOARDED: 'bg-slate-200 text-slate-600 border-slate-300',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',

  DRAFT: 'bg-slate-100 text-slate-600 border-slate-200',
  SUBMITTED: 'bg-blue-50 text-blue-700 border-blue-200',
  UNDER_REVIEW: 'bg-blue-50 text-blue-700 border-blue-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CHANGES_REQUESTED: 'bg-amber-50 text-amber-700 border-amber-200',

  UNASSIGNED: 'bg-slate-100 text-slate-600 border-slate-200',
  DEPLOYED: 'bg-teal-50 text-teal-700 border-teal-200',
  RECLAIMED: 'bg-slate-200 text-slate-600 border-slate-300',
};

const LABELS = {
  IN_CHAMBER: 'In Chamber',
  PENDING_APPROVAL: 'Pending',
  CHANGES_REQUESTED: 'Changes Requested',
  UNDER_REVIEW: 'Under Review',
};

export function StatusBadge({ status, className, pulse = false }) {
  if (!status) return null;
  const label = LABELS[status] || status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ');
  return (
    <span
      className={clsx(
        'px-2.5 py-1 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 w-max',
        STYLES[status] || 'bg-slate-100 text-slate-600 border-slate-200',
        className,
      )}
    >
      {pulse && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
      {label}
    </span>
  );
}
