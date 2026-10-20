/**
 * A doctor's profile as form state, and back.
 *
 * Shared by the add-doctor form and the clinic's profile editor so both send
 * exactly the fields the patient's doctor page reads (see DoctorDetailView).
 * The server's counterpart is mediigo_be/src/modules/doctors/profileFields.js.
 *
 * Short lists (qualifications, languages) are comma separated; long ones are
 * one entry per line, because entries such as "MD, AIIMS Delhi, 2012" contain
 * commas themselves.
 */

export const LIST_FIELDS = [
  ['conditionsTreated', 'Conditions treated', 'Diabetes\nHypertension\nThyroid disorders'],
  ['proceduresPerformed', 'Procedures performed', 'ECG\nNebulisation'],
  ['education', 'Education & work experience', 'MBBS — B.J. Medical College, Pune, 2008\nMD (Medicine) — KEM Hospital, Mumbai, 2012'],
  ['memberships', 'Memberships', 'Indian Medical Association (IMA), Member'],
  ['trainings', 'Trainings & certifications', 'ACLS — Advanced Cardiac Life Support'],
  ['awards', 'Awards & recognitions', 'Best Physician Award, Pune Medical Forum, 2021'],
  ['publications', 'Publications & articles', ''],
];

// Changeable only by Mediigo support once the doctor is onboarded.
export const LOCKED_FIELDS = ['councilRegNo', 'registrationCouncil', 'registrationYear'];

const commas = (v) => String(v || '').split(',').map((s) => s.trim()).filter(Boolean);
const perLine = (v) => String(v || '').split('\n').map((s) => s.trim()).filter(Boolean);
const num = (v) => (v === '' || v == null ? undefined : Number(v));

export const BLANK_PROFILE = {
  chamberNumber: '',
  qualifications: '',
  experienceYears: '',
  languages: 'English',
  avgConsultMinutes: '',
  followupWindowDays: '14',
  about: '',
  ...Object.fromEntries(LIST_FIELDS.map(([k]) => [k, ''])),
  councilRegNo: '',
  registrationCouncil: '',
  registrationYear: '',
};

/** A doctor record from the API → form strings. */
export const toProfileForm = (d = {}) => ({
  chamberNumber: d.chamberNumber || '',
  qualifications: (d.qualifications || []).join(', '),
  experienceYears: d.experienceYears ?? '',
  languages: (d.languages || []).join(', '),
  avgConsultMinutes: d.avgConsultMinutes ?? '',
  followupWindowDays: d.followupWindowDays ?? '',
  about: d.about || '',
  ...Object.fromEntries(LIST_FIELDS.map(([k]) => [k, (d[k] || []).join('\n')])),
  councilRegNo: d.councilRegNo || '',
  registrationCouncil: d.registrationCouncil || '',
  registrationYear: d.registrationYear ?? '',
});

/**
 * Form strings → the API's profile fields. Locked fields are left out unless
 * asked for: at onboarding, or when a super admin corrects them.
 */
export const toProfilePayload = (f, { includeLocked = false } = {}) => {
  const out = {
    chamberNumber: f.chamberNumber.trim(),
    qualifications: commas(f.qualifications).slice(0, 10),
    languages: commas(f.languages).slice(0, 10),
    about: f.about.trim(),
    ...Object.fromEntries(LIST_FIELDS.map(([k]) => [k, perLine(f[k])])),
  };
  const years = num(f.experienceYears);
  if (years !== undefined) out.experienceYears = years;
  const consult = num(f.avgConsultMinutes);
  if (consult !== undefined) out.avgConsultMinutes = consult;
  const window = num(f.followupWindowDays);
  if (window !== undefined) out.followupWindowDays = window;
  if (includeLocked) {
    out.councilRegNo = f.councilRegNo.trim();
    out.registrationCouncil = f.registrationCouncil.trim();
    const year = num(f.registrationYear);
    if (year !== undefined) out.registrationYear = year;
  }
  return out;
};
