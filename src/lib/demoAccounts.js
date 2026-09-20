import { ROLES } from './constants.js';

/**
 * Seeded demo logins, shown on the sign-in screen so nobody has to dig the
 * numbers out of the seed script. Kept in one place next to the portal map so
 * each port can show only the accounts it actually serves.
 *
 * These mirror scripts/seed.js. If the seed changes, change this too.
 */
export const DEMO_PASSWORD = 'Mediigo@123';
export const DEMO_OTP = '1234';

export const DEMO_ACCOUNTS = [
  { role: ROLES.PATIENT, name: 'Rajesh Kumar', phone: '9876543210', note: '3 policies in the vault', kind: 'otp' },
  { role: ROLES.PATIENT, name: 'Priya Sharma', phone: '9876543211', kind: 'otp' },
  { role: ROLES.DOCTOR, name: 'Dr. Sandeep Dhore', phone: '9000000101', note: 'General Medicine · Chamber 104', kind: 'password' },
  { role: ROLES.DOCTOR, name: 'Dr. Ananya Roy', phone: '9000000102', note: 'Cardiology · Chamber 201', kind: 'password' },
  { role: ROLES.RECEPTIONIST, name: 'Riya Sen', phone: '9000000031', note: 'Sunrise Multispeciality', kind: 'password' },
  { role: ROLES.RECEPTIONIST, name: 'Arjun Ghosh', phone: '9000000032', note: 'CareWell Polyclinic', kind: 'password' },
  { role: ROLES.FIELD_AGENT, name: 'Suresh Kumar', phone: '9000000021', note: 'Kolkata cluster', kind: 'password' },
  { role: ROLES.FIELD_AGENT, name: 'Meera Iyer', phone: '9000000022', note: 'Howrah cluster', kind: 'password' },
  { role: ROLES.EXEC_ADMIN, name: 'Ananya Das', phone: '9000000011', note: 'Kolkata district', kind: 'password' },
  { role: ROLES.EXEC_ADMIN, name: 'Rahul Verma', phone: '9000000012', note: 'Howrah district', kind: 'password' },
  { role: ROLES.SUPER_ADMIN, name: 'Mediigo Super Admin', phone: '9000000001', note: 'Global control', kind: 'password' },
];

export const accountsFor = (roles) =>
  roles?.length ? DEMO_ACCOUNTS.filter((a) => roles.includes(a.role)) : DEMO_ACCOUNTS;
