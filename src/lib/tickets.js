export const TICKET_STATUS = { TODO: 'TODO', IN_PROGRESS: 'IN_PROGRESS', DONE: 'DONE' };

export const COLUMNS = [
  { key: TICKET_STATUS.TODO, label: 'To Do', accent: 'border-t-amber-500', chip: 'bg-amber-100 text-amber-800' },
  { key: TICKET_STATUS.IN_PROGRESS, label: 'In Progress', accent: 'border-t-indigo-500', chip: 'bg-indigo-100 text-indigo-800' },
  { key: TICKET_STATUS.DONE, label: 'Done', accent: 'border-t-emerald-500', chip: 'bg-emerald-100 text-emerald-800' },
];

export const PRIORITY = {
  CRITICAL: { label: 'Critical', chip: 'bg-rose-100 text-rose-800 border-rose-200', dot: 'bg-rose-500' },
  HIGH: { label: 'High', chip: 'bg-amber-100 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
  MEDIUM: { label: 'Medium', chip: 'bg-blue-100 text-blue-800 border-blue-200', dot: 'bg-blue-500' },
  LOW: { label: 'Low', chip: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
};

export const CATEGORY = {
  TECHNICAL: 'Technical',
  BILLING: 'Billing',
  ONBOARDING: 'Onboarding',
  QUEUE: 'Queue',
  ACCOUNT: 'Account',
  OTHER: 'Other',
};

export const ROLE_TONE = {
  PATIENT: 'bg-teal-50 text-teal-700',
  DOCTOR: 'bg-blue-50 text-blue-700',
  RECEPTIONIST: 'bg-indigo-50 text-indigo-700',
  FIELD_AGENT: 'bg-amber-50 text-amber-700',
  EXEC_ADMIN: 'bg-purple-50 text-purple-700',
  SUPER_ADMIN: 'bg-slate-800 text-white',
};
