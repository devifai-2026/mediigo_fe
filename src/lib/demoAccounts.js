import { ROLES } from './constants.js';

/**
 * Seeded demo logins, shown on the sign-in screen so nobody has to dig the
 * numbers out of the seed script. Kept in one place next to the portal map so
 * each port can show only the accounts it actually serves.
 *
 * These mirror scripts/seed.js. If the seed changes (or the database is
 * reseeded with seed-pune.js instead), change this too — a stale entry here is
 * worse than no entry, because it sends whoever is testing into a 401 on a
 * number that was never seeded.
 */
export const DEMO_PASSWORD = 'Mediigo@123';
export const DEMO_OTP = '1234';

export const DEMO_ACCOUNTS = [
  { role: ROLES.PATIENT, name: 'Rajesh Kumar', phone: '9876543210', note: 'Bookings and vault', kind: 'otp' },
  { role: ROLES.PATIENT, name: 'Priya Sharma', phone: '9876543211', kind: 'otp' },
  // Two doctors per clinic, so whoever is testing a booking can also sign in as
  // the doctor they just booked.
  { role: ROLES.DOCTOR, name: 'Dr. Sandeep Dhore', phone: '9000000101', note: 'General Medicine · Sunrise Multispeciality', kind: 'password' },
  { role: ROLES.DOCTOR, name: 'Dr. Ananya Roy', phone: '9000000102', note: 'Cardiology · Sunrise Multispeciality', kind: 'password' },
  { role: ROLES.DOCTOR, name: 'Dr. Priya Nair', phone: '9000000104', note: 'Pediatrics · CareWell Polyclinic', kind: 'password' },
  { role: ROLES.DOCTOR, name: 'Dr. Sunita Rao', phone: '9000000105', note: 'Dermatology · CareWell Polyclinic', kind: 'password' },
  { role: ROLES.RECEPTIONIST, name: 'Riya Sen', phone: '9000000031', note: 'Sunrise Multispeciality', kind: 'password' },
  { role: ROLES.RECEPTIONIST, name: 'Arjun Ghosh', phone: '9000000032', note: 'CareWell Polyclinic', kind: 'password' },
  { role: ROLES.PHARMACIST, name: 'Kunal Shah', phone: '9000000051', note: 'Pharmacy · Sunrise Multispeciality', kind: 'password' },
  { role: ROLES.FIELD_AGENT, name: 'Suresh Kumar', phone: '9000000021', note: 'Kolkata', kind: 'password' },
  { role: ROLES.FIELD_AGENT, name: 'Meera Iyer', phone: '9000000022', note: 'Howrah', kind: 'password' },
  { role: ROLES.EXEC_ADMIN, name: 'Ananya Das', phone: '9000000011', note: 'Kolkata district', kind: 'password' },
  { role: ROLES.EXEC_ADMIN, name: 'Rahul Verma', phone: '9000000012', note: 'Howrah district', kind: 'password' },
  { role: ROLES.SUPER_ADMIN, name: 'Mediigo Super Admin', phone: '9000000001', note: 'Global control', kind: 'password' },
];

export const accountsFor = (roles) =>
  roles?.length ? DEMO_ACCOUNTS.filter((a) => roles.includes(a.role)) : DEMO_ACCOUNTS;
