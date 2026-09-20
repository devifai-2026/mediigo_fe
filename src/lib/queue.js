// The prototype's telemetry formulas, preserved exactly.
export const MINUTES_PER_CONSULT = 8;

export const patientsAhead = (yourToken, currentToken) => Math.max(0, (yourToken ?? 0) - (currentToken ?? 0));

export const waitMinutes = (ahead, perConsult = MINUTES_PER_CONSULT) => ahead * perConsult;

// Floor of 10% so a queue that has not started still shows a visible bar.
export const progressPct = (currentToken, yourToken) => {
  if (!yourToken) return 10;
  return Math.min(100, Math.max(10, ((currentToken ?? 0) / yourToken) * 100));
};

/**
 * While a doctor is on break the queue is not advancing, so any countdown we
 * showed would be a lie. Return null and let the UI say "Paused" instead.
 */
export const estimateWait = ({ yourToken, currentToken, isOnBreak, perConsult = MINUTES_PER_CONSULT }) => {
  if (isOnBreak) return null;
  return waitMinutes(patientsAhead(yourToken, currentToken), perConsult);
};
