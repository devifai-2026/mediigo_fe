/** How a submission's district approval reads to the field agent. */
export const APPROVAL = {
  DRAFT: { short: 'Draft', long: 'Saved, not yet sent for approval', tone: 'slate' },
  SUBMITTED: { short: 'Awaiting approval', long: 'Submitted — waiting for the district admin', tone: 'amber' },
  UNDER_REVIEW: { short: 'Under review', long: 'The district admin is reviewing it', tone: 'blue' },
  CHANGES_REQUESTED: { short: 'Changes requested', long: 'The district admin asked for changes', tone: 'amber' },
  APPROVED: { short: 'Approved', long: 'Approved — the clinic is live on Mediigo', tone: 'emerald' },
  REJECTED: { short: 'Rejected', long: 'Rejected by the district admin', tone: 'rose' },
};

/** "45 min", "3h", "2 days" for a number of hours. */
export const hoursLabel = (h) => {
  if (h == null) return '—';
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
  if (h < 48) return `${Math.round(h)}h`;
  return `${Math.round(h / 24)} days`;
};

/** "3h", "2 days" — how long something has been waiting or took. */
export const span = (from, to = new Date()) => {
  if (!from) return null;
  const h = Math.max(0, (new Date(to) - new Date(from)) / 3600000);
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
  if (h < 48) return `${Math.round(h)}h`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? '' : 's'}`;
};
