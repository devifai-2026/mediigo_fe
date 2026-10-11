/**
 * Doctor-booked follow-ups: the token's followUp.status, and how each reads to
 * staff and to the patient. Mirrors FOLLOWUP_STATUS on the server.
 */
export const FOLLOWUP_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  DECLINED: 'DECLINED',
  RELEASED: 'RELEASED',
};

/** Past the reply deadline with no answer — the case "Release slot" is for. */
export const isOverdue = (status, respondBy) =>
  status === FOLLOWUP_STATUS.PENDING && Boolean(respondBy) && new Date(respondBy).getTime() < Date.now();

/** Staff-facing label and colour for a follow-up's state. */
export const followUpBadge = (status, respondBy) => {
  if (isOverdue(status, respondBy)) return { label: 'No response', className: 'bg-rose-50 text-rose-700 border-rose-200' };
  switch (status) {
    case FOLLOWUP_STATUS.PENDING: return { label: 'Awaiting reply', className: 'bg-amber-50 text-amber-700 border-amber-200' };
    case FOLLOWUP_STATUS.CONFIRMED: return { label: 'Confirmed', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case FOLLOWUP_STATUS.DECLINED: return { label: 'Not coming', className: 'bg-slate-100 text-slate-600 border-slate-200' };
    case FOLLOWUP_STATUS.RELEASED: return { label: 'Slot released', className: 'bg-slate-100 text-slate-500 border-slate-200' };
    default: return null;
  }
};

/** "Reply by Sun, 11 Oct, 9:00 PM" — in the viewer's clock. */
export const replyBy = (iso) => (iso
  ? new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso))
  : '');

export const SHIFT_LABEL = { MORNING: 'Morning', AFTERNOON: 'Afternoon', EVENING: 'Evening' };

// '14:00' -> '2:00 PM'
export const t12 = (hhmm) => {
  const [h, m] = String(hhmm || '').split(':').map(Number);
  if (!Number.isFinite(h)) return hhmm || '';
  return `${((h + 11) % 12) + 1}:${String(m || 0).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

export const longDate = (dateStr) => (dateStr
  ? new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${dateStr}T00:00:00Z`))
  : '');
