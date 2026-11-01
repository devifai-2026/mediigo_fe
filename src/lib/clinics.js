import { directionsUrl } from './maps.js';
import { relativeDay, time12 } from './format.js';

/**
 * Patients browse clinics, not doctors: one clinic or hospital, many doctors.
 *
 * /api/doctors/nearby returns one row per doctor with its clinic attached and
 * already sorted nearest-first, so grouping those rows by clinic gives the
 * clinic list in the same order without a second endpoint. Search and the
 * specialty filter keep working unchanged: a clinic appears when any of its
 * doctors matches, carrying the doctors that matched.
 */
export const groupByClinic = (rows = []) => {
  const byId = new Map();
  for (const row of rows) {
    const h = row.hospital || {};
    const id = String(h.id ?? h._id ?? h.name);
    if (!byId.has(id)) byId.set(id, { ...h, id, doctors: [] });
    byId.get(id).doctors.push(row);
  }
  return [...byId.values()].map((c) => {
    const fees = c.doctors.map((d) => d.fees?.fresh).filter((f) => f != null);
    const bookable = c.doctors.filter(isLiveNow);
    return {
      ...c,
      // Open doctors first, so the one a patient can actually book leads.
      doctors: [...c.doctors].sort((a, b) => rank(a) - rank(b)),
      specialties: [...new Set(c.doctors.map((d) => d.specialty).filter(Boolean))],
      feeMin: fees.length ? Math.min(...fees) : null,
      feeMax: fees.length ? Math.max(...fees) : null,
      openCount: bookable.length,
    };
  });
};

const rank = (d) => (isLiveNow(d) ? 0 : d.session?.isOnBreak ? 1 : 2);

/**
 * Is this doctor seeing patients right now? The server's isLiveNow knows the
 * timetable; the bookings switch alone stays on overnight. The fallback keeps
 * an older API (without the field) working as before.
 */
export const isLiveNow = (d) => d?.session?.isLiveNow
  ?? Boolean(d?.session?.isBookingOpen && !d?.session?.isOnBreak);

export const clinicKind = (c) => (String(c?.type || '').toUpperCase() === 'HOSPITAL' ? 'Hospital' : 'Clinic');

export const clinicAddress = (c) =>
  c?.address?.formatted || [c?.address?.line1, c?.address?.city, c?.address?.state, c?.address?.pincode].filter(Boolean).join(', ');

/** Exact pin when we have one, so Google is not guessing from a clinic name. */
export const clinicDirections = (c) => (c?.coordinates
  ? directionsUrl(c.coordinates)
  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([c?.name, c?.address?.line1, c?.address?.city].filter(Boolean).join(', '))}`);

export const km = (d) => (d == null ? '' : `${Number(d) < 10 ? Number(d).toFixed(1).replace(/\.0$/, '') : Math.round(d)} km`);

/**
 * When a doctor next sits, from the /nearby row's `nextAvailable`:
 * "Now · till 1:00 PM", "Today · 6:00 PM", "Tomorrow · 10:00 AM", "17 Oct · …".
 * A sitting under way reads "Now"; otherwise the next sitting's day and
 * time. A doctor with no weekly schedule is "Now" while taking tokens. Null
 * when nothing in the booking horizon has room. (The bookings switch used to
 * win outright, so a clinic closed for the night still read "Now".)
 */
export const nextAvailableText = (n, session) => {
  if (n?.inProgress) return `Now · till ${time12(n.endTime)}`;
  if (n) return `${relativeDay(n.date)} · ${time12(n.startTime)}`;
  return isLiveNow({ session }) ? 'Now' : null;
};
