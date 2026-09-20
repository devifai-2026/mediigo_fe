import { ROLES } from './constants.js';

/**
 * Each dev port serves one portal, so you can keep four windows open without
 * them logging each other out. Sessions are per-origin, so a login on 5174
 * genuinely does not disturb the one on 5173 — that isolation is the point.
 *
 * VITE_PORTAL names which portal this build serves. Unset (or "all") means
 * every role is allowed, which is how a single-port dev server behaves.
 */
export const PORTALS = {
  clinic: {
    key: 'clinic',
    label: 'Patient & Clinic Desk',
    port: 5173,
    // Patients and the clinic side share this port, so its login keeps the
    // Patient / Clinic-Staff tab switcher. They also share one session: signing
    // in as the doctor signs the patient out.
    roles: [ROLES.PATIENT, ROLES.DOCTOR, ROLES.RECEPTIONIST],
  },
  district: {
    key: 'district',
    label: 'District Operations',
    port: 5174,
    roles: [ROLES.EXEC_ADMIN, ROLES.FIELD_AGENT],
  },
  super: {
    key: 'super',
    label: 'Super Admin HQ',
    port: 5175,
    roles: [ROLES.SUPER_ADMIN],
  },
};

const configured = import.meta.env?.VITE_PORTAL;

export const ACTIVE_PORTAL = configured && PORTALS[configured] ? PORTALS[configured] : null;

/** With no portal configured, every role is allowed (single-port dev). */
export const portalAllows = (role) => !ACTIVE_PORTAL || ACTIVE_PORTAL.roles.includes(role);

/** Which portal a role belongs to — used to point someone at the right port. */
export const portalForRole = (role) => Object.values(PORTALS).find((p) => p.roles.includes(role)) ?? null;

export const portalUrl = (portal, path = '/') =>
  `${window.location.protocol}//${window.location.hostname}:${portal.port}${path}`;
