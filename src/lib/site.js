/**
 * Who runs the website, in one place. The legal pages, the footer, SEO tags
 * and structured data all read from here.
 *
 * Anything still in [square brackets] is a placeholder that MUST be replaced
 * with the real company details before mediigo.com goes live — Indian law
 * (IT Rules 2021, Consumer Protection (E-Commerce) Rules 2020, DPDP Act 2023)
 * requires the legal entity, its address and a named Grievance Officer to be
 * published. In development, the legal pages list whatever is still missing.
 */
export const SITE = {
  name: 'Mediigo',
  url: (import.meta.env.VITE_SITE_URL || 'https://mediigo.com').replace(/\/$/, ''),
  tagline: 'Find & book doctors near you',
  description: 'Find doctors and clinics near you, book an OPD token in seconds and track the live queue from your phone — no waiting in crowded waiting rooms.',

  legalName: '[Registered company name] Private Limited',
  cin: '[Corporate Identification Number]',
  address: '[Registered office address, City, State, PIN]',
  jurisdictionCity: '[City]',

  supportEmail: 'support@mediigo.com',
  privacyEmail: 'privacy@mediigo.com',
  grievanceEmail: 'grievance@mediigo.com',
  supportPhone: '[Support phone number]',
  supportHours: 'Monday to Saturday, 10:00 AM – 7:00 PM IST',

  grievanceOfficer: {
    name: '[Name of Grievance Officer]',
    designation: 'Grievance Officer',
  },

  // Shown on every legal page; change it whenever a policy changes.
  effectiveDate: '20 October 2026',

  social: {
    instagram: '', // e.g. https://www.instagram.com/mediigo
    facebook: '',
    linkedin: '',
    x: '',
  },
};

/** Placeholders still waiting for real details (used by the dev-only banner). */
export const missingSiteDetails = () => {
  const out = [];
  const walk = (obj, path) => {
    for (const [k, v] of Object.entries(obj)) {
      if (v && typeof v === 'object') walk(v, `${path}${k}.`);
      else if (typeof v === 'string' && v.includes('[')) out.push(`${path}${k}`);
    }
  };
  walk(SITE, '');
  return out;
};

export const absoluteUrl = (path = '/') => `${SITE.url}${path.startsWith('/') ? path : `/${path}`}`;
