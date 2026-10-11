// Small display helpers shared by the OPD Desk components.

const GENDER = { m: 'Male', male: 'Male', f: 'Female', female: 'Female', o: 'Other', other: 'Other' };

export const genderLabel = (g) => (g ? GENDER[String(g).toLowerCase()] || g : null);

/** "Male, 34 Yrs" — whichever parts are known. */
export const patientLine = (t, { yrs = 'Yrs' } = {}) =>
  [genderLabel(t?.gender), t?.age != null ? `${t.age} ${yrs}` : null].filter(Boolean).join(', ');

export const OUTCOME_LABEL = { DONE: 'Consulted', TESTS: 'Sent for tests', ADMITTED: 'Admitted' };

/** Two-digit counters, as the desk board shows them ("04", not "4"). */
export const pad2 = (n) => String(n ?? 0).padStart(2, '0');
