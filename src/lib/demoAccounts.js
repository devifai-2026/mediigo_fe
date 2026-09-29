import { ROLES } from './constants.js';

/**
 * Seeded demo logins, shown on the sign-in screen so nobody has to dig the
 * numbers out of the seed script. Kept in one place next to the portal map so
 * each port can show only the accounts it actually serves.
 *
 * These mirror scripts/seed-pune.js. If the seed changes, change this too —
 * a stale entry here is worse than no entry, because it sends whoever is
 * testing into a 401 on a number that was never seeded.
 *
 * Doctor numbers are NOT contiguous: the Pune seed assigns each clinic a block
 * and skips within it, so 9000000102/103/104 do not exist. Copy from the live
 * database rather than guessing the next number up.
 */
export const DEMO_PASSWORD = 'Mediigo@123';
export const DEMO_OTP = '1234';

export const DEMO_ACCOUNTS = [
  { role: ROLES.PATIENT, name: 'Rajesh Kulkarni', phone: '9876543210', note: 'Bookings and vault', kind: 'otp' },
  { role: ROLES.PATIENT, name: 'Priya Joshi', phone: '9876543211', kind: 'otp' },
  // Two doctors per clinic, so whoever is testing a booking can also sign in as
  // the doctor they just booked.
  { role: ROLES.DOCTOR, name: 'Dr. Aditi Deshmukh', phone: '9000000101', note: 'General Medicine · Kothrud Care Multispeciality', kind: 'password' },
  { role: ROLES.DOCTOR, name: 'Dr. Prachi Joshi', phone: '9000000105', note: 'Pediatrics · Kothrud Care Multispeciality', kind: 'password' },
  { role: ROLES.DOCTOR, name: 'Dr. Manasi Joshi', phone: '9000000107', note: 'Pediatrics · Baner Life Clinic', kind: 'password' },
  { role: ROLES.DOCTOR, name: 'Dr. Shruti Jadhav', phone: '9000000111', note: 'Dermatology · Baner Life Clinic', kind: 'password' },
  { role: ROLES.DOCTOR, name: 'Dr. Rupali Jadhav', phone: '9000000113', note: 'Dermatology · Aundh Wellness Centre', kind: 'password' },
  { role: ROLES.DOCTOR, name: 'Dr. Anjali Gokhale', phone: '9000000117', note: 'Gynecology · Aundh Wellness Centre', kind: 'password' },
  { role: ROLES.RECEPTIONIST, name: 'Meera Joshi', phone: '9020000001', note: 'Kothrud Care Multispeciality', kind: 'password' },
  { role: ROLES.RECEPTIONIST, name: 'Rohit Deshpande', phone: '9020000002', note: 'Baner Life Clinic', kind: 'password' },
  { role: ROLES.RECEPTIONIST, name: 'Sneha Kulkarni', phone: '9020000003', note: 'Aundh Wellness Centre', kind: 'password' },
  { role: ROLES.FIELD_AGENT, name: 'Rupali Jadhav', phone: '9000000021', note: 'Pune City cluster', kind: 'password' },
  { role: ROLES.FIELD_AGENT, name: 'Yogesh Sawant', phone: '9000000022', note: 'Pimpri-Chinchwad cluster', kind: 'password' },
  { role: ROLES.EXEC_ADMIN, name: 'Nikhil Kulkarni', phone: '9000000011', note: 'Pune City district', kind: 'password' },
  { role: ROLES.EXEC_ADMIN, name: 'Manasi Joshi', phone: '9000000012', note: 'Pimpri-Chinchwad district', kind: 'password' },
  { role: ROLES.SUPER_ADMIN, name: 'Mediigo Super Admin', phone: '9000000001', note: 'Global control', kind: 'password' },
];

export const accountsFor = (roles) =>
  roles?.length ? DEMO_ACCOUNTS.filter((a) => roles.includes(a.role)) : DEMO_ACCOUNTS;
