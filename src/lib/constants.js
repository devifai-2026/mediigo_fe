export const ROLES = {
  PATIENT: 'PATIENT',
  DOCTOR: 'DOCTOR',
  RECEPTIONIST: 'RECEPTIONIST',
  FIELD_AGENT: 'FIELD_AGENT',
  EXEC_ADMIN: 'EXEC_ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
};

export const ROLE_HOME = {
  [ROLES.PATIENT]: '/explore',
  [ROLES.DOCTOR]: '/d/chamber',
  [ROLES.RECEPTIONIST]: '/r/queue',
  [ROLES.FIELD_AGENT]: '/a/onboard',
  [ROLES.EXEC_ADMIN]: '/admin',
  [ROLES.SUPER_ADMIN]: '/super',
};

export const ROLE_LABEL = {
  [ROLES.PATIENT]: 'Patient',
  [ROLES.DOCTOR]: 'Doctor',
  [ROLES.RECEPTIONIST]: 'Front Desk',
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
