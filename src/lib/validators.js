/**
 * Field checks shared by every form. Each returns an error message, or '' when
 * the value is fine, so a form builds its errors map as
 *
 *   const errors = collect({ phone: phoneError(form.phone), name: nameError(form.name) });
 *
 * and renders them through <Field error={errors.phone}>. They mirror the
 * server's zod rules so the two never disagree about what is valid; the server
 * still checks everything, this only saves the round-trip.
 */

const digits = (v) => String(v ?? '').replace(/\D/g, '');

export const requiredError = (v, label = 'This field') =>
  (String(v ?? '').trim() ? '' : `${label} is required`);

export const nameError = (v, label = 'Name') => {
  const s = String(v ?? '').trim();
  if (!s) return `${label} is required`;
  if (s.length < 2) return `${label} must be at least 2 characters`;
  if (s.length > 80) return `${label} must be at most 80 characters`;
  if (!/[a-z]/i.test(s)) return `${label} must contain letters`;
  return '';
};

/** Indian mobile: 10 digits starting 6-9, with or without +91 / 0 in front. */
export const phoneError = (v, { required = true } = {}) => {
  const d = digits(v);
  if (!d) return required ? 'Mobile number is required' : '';
  const ten = d.length > 10 ? d.slice(-10) : d;
  if (d.length !== 10 && !(d.length === 12 && d.startsWith('91')) && !(d.length === 11 && d.startsWith('0'))) {
    return 'Enter a valid 10-digit mobile number';
  }
  if (!/^[6-9]\d{9}$/.test(ten)) return 'Enter a valid 10-digit mobile number';
  return '';
};

export const emailError = (v, { required = false } = {}) => {
  const s = String(v ?? '').trim();
  if (!s) return required ? 'Email is required' : '';
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) ? '' : 'Enter a valid email address';
};

export const pincodeError = (v, { required = true } = {}) => {
  const s = String(v ?? '').trim();
  if (!s) return required ? 'Pincode is required' : '';
  return /^[1-9]\d{5}$/.test(s) ? '' : 'Enter a valid 6-digit pincode';
};

/** Same 8-72 bound the server applies to every password. */
export const passwordError = (v, { required = true } = {}) => {
  const s = String(v ?? '');
  if (!s) return required ? 'Password is required' : '';
  if (s.length < 8) return 'Password must be at least 8 characters';
  if (s.length > 72) return 'Password must be at most 72 characters';
  return '';
};

export const moneyError = (v, { label = 'Amount', required = true, min = 0, max = 1_000_000 } = {}) => {
  if (v === '' || v == null) return required ? `${label} is required` : '';
  const n = Number(v);
  if (!Number.isFinite(n)) return `${label} must be a number`;
  if (n < min) return `${label} cannot be less than ₹${min}`;
  if (n > max) return `${label} is too large`;
  if (Math.round(n * 100) !== n * 100) return `${label} can have at most 2 decimal places`;
  return '';
};

export const intRangeError = (v, { label, min, max, required = false }) => {
  if (v === '' || v == null) return required ? `${label} is required` : '';
  const n = Number(v);
  if (!Number.isInteger(n)) return `${label} must be a whole number`;
  if (n < min || n > max) return `${label} must be between ${min} and ${max}`;
  return '';
};

/** 'HH:MM' strings compare correctly as text. */
export const timeRangeError = (start, end) => (start && end && start >= end ? 'End time must be after start time' : '');

export const lengthError = (v, { label, min = 0, max }) => {
  const s = String(v ?? '').trim();
  if (min && s.length < min) return `${label} must be at least ${min} characters`;
  if (max && s.length > max) return `${label} must be at most ${max} characters`;
  return '';
};

/** Drop the empty entries, so `Object.keys(errors).length` means "invalid". */
export const collect = (map) => Object.fromEntries(Object.entries(map).filter(([, e]) => e));

/**
 * A server 422 (details.issues = [{ path: 'body.phone', message }]) as a
 * field → message map, keyed by the last path segment.
 */
export const serverFieldErrors = (err) =>
  Object.fromEntries((err?.details?.issues ?? []).map((d) => [String(d.path ?? '').split('.').pop(), d.message]));
