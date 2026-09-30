// Indian lakh/crore grouping, which toLocaleString('en-IN') handles natively.
export const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

// Token display is always zero-padded to two digits, matching the prototypes.
export const token = (n) => `#${String(n ?? 0).padStart(2, '0')}`;

export const phone = (p) => {
  const d = String(p || '').replace(/\D/g, '').slice(-10);
  return d.length === 10 ? `${d.slice(0, 5)} ${d.slice(5)}` : p || '';
};

export const shortDate = (d) =>
  d ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(d)) : '';

export const timeOf = (d) =>
  d ? new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(d)) : '';

export const relativeDay = (dateStr) => {
  if (!dateStr) return '';
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  if (dateStr === today) return 'Today';
  const d = new Date(dateStr);
  const diff = Math.round((d - new Date(today)) / 86400000);
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return shortDate(dateStr);
};

export const duration = (minutes) => {
  if (minutes == null) return '—';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
};

export const initials = (name) =>
  String(name || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

// Age from a date of birth. Stored as dob rather than a number so it stays
// correct as time passes.
export const ageOf = (dob) => {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (365.2425 * 24 * 60 * 60 * 1000));
};

// Honorifics a doctor's name may carry. Stripped before deriving initials so
// "Dr. Aditi Deshmukh" reads as AD, not DA — every doctor would otherwise share
// a leading D and the initials would stop distinguishing anyone.
const HONORIFICS = /^(dr|doctor|prof|professor|mr|mrs|ms|miss|shri|smt)\.?\s+/i;

export const stripHonorific = (name) => String(name || '').replace(HONORIFICS, '').trim();

/** Initials for an avatar fallback, ignoring any leading title. */
export const initialsOf = (name) => {
  const bare = stripHonorific(name);
  if (!bare) return '?';
  return bare
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};
