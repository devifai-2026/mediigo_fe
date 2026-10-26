export const ROLES = {
  PATIENT: 'PATIENT',
  DOCTOR: 'DOCTOR',
  RECEPTIONIST: 'RECEPTIONIST',
  PHARMACIST: 'PHARMACIST',
  FIELD_AGENT: 'FIELD_AGENT',
  EXEC_ADMIN: 'EXEC_ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
};

export const ROLE_HOME = {
  [ROLES.PATIENT]: '/p/explore',
  [ROLES.DOCTOR]: '/d/chamber',
  [ROLES.RECEPTIONIST]: '/r/queue',
  [ROLES.PHARMACIST]: '/ph/queue',
  [ROLES.FIELD_AGENT]: '/a/followups',
  [ROLES.EXEC_ADMIN]: '/admin',
  [ROLES.SUPER_ADMIN]: '/super',
};

// Where the profile icon in each portal's header leads: the signed-in
// person's own details. Doctors and the front desk keep theirs on the
// existing Profile tab.
export const PROFILE_PATH = {
  [ROLES.PATIENT]: '/p/profile',
  [ROLES.DOCTOR]: '/d/profile',
  [ROLES.RECEPTIONIST]: '/r/profile',
  [ROLES.PHARMACIST]: '/ph/account',
  [ROLES.FIELD_AGENT]: '/a/account',
  [ROLES.EXEC_ADMIN]: '/admin/account',
  [ROLES.SUPER_ADMIN]: '/super/account',
};

export const ROLE_LABEL = {
  [ROLES.PATIENT]: 'Patient',
  [ROLES.DOCTOR]: 'Doctor',
  [ROLES.RECEPTIONIST]: 'Front Desk',
  [ROLES.PHARMACIST]: 'Pharmacy',
  [ROLES.FIELD_AGENT]: 'Field Agent',
  [ROLES.EXEC_ADMIN]: 'District Admin',
  [ROLES.SUPER_ADMIN]: 'Super Admin',
};

export const TOKEN_STATUS = {
  WAITING: 'WAITING',
  IN_CHAMBER: 'IN_CHAMBER',
  COMPLETED: 'COMPLETED',
  SKIPPED: 'SKIPPED',
};

export const NETWORK_STATE = {
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  DEBOARDED: 'DEBOARDED',
};

export const VISIT_TYPE = { FRESH: 'fresh', FOLLOWUP: 'followup', EMERGENCY: 'emergency' };
export const VISIT_LABEL = { fresh: 'Fresh Visit', followup: 'Follow-up', emergency: 'Emergency' };

export const BREAK_REASONS = ['Lunch', 'Ward Round', 'Emergency'];
export const BREAK_DURATIONS = [30, 45, 60];

export const SPECIALTIES = [
  'General Medicine', 'Cardiology', 'Pediatrics', 'Orthopedics',
  'Dermatology', 'ENT', 'Gynecology', 'Dentistry',
];

export const PHARMACY_STATUS = {
  PENDING: 'PENDING',
  DISPENSED: 'DISPENSED',
  PARTIAL: 'PARTIAL',
};
