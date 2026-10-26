// Server-side SEO for the production host (server.js).
//
// The app is a single-page React app, so without this every URL would be sent
// with the same <title> and preview image. Search engines that run JavaScript
// would eventually see the right tags, but WhatsApp, Instagram, Facebook and
// LinkedIn previews never run it — and those are where clinic and doctor
// links get shared. So the first response for each page carries its own tags.
//
// Keep the titles here in step with the useSeo() calls in src/.

const BRAND = 'Mediigo';
const DEFAULT_DESC = 'Find doctors and clinics near you, book an OPD token in seconds and track the live queue from your phone — no waiting in crowded waiting rooms.';
const DEFAULT_IMAGE = '/og/mediigo-og.png';

const PAGES = {
  '/p/explore': {
    title: 'Find & Book Doctors Near You — OPD Tokens & Live Queue | Mediigo',
    description: 'Find doctors and clinics near you by specialty, see fees and OPD timings, and book a token online. Track the live queue and skip the crowded waiting room with Mediigo.',
    priority: '1.0', changefreq: 'daily',
  },
  '/clinic': {
    title: 'Clinic Management Software — Digital Tokens, Live Queue & Online Bookings | Mediigo',
    description: 'Mediigo helps clinics in India run their OPD on time: digital tokens, a live patient queue, online bookings, QR walk-ins, prescriptions and collections. Free trial, no setup fee.',
    image: '/og/mediigo-clinic-og.png',
    priority: '0.9', changefreq: 'weekly',
  },
  '/about': { title: 'About Mediigo', description: 'Mediigo helps patients skip crowded waiting rooms and helps clinics run their OPD on time with digital tokens and a live queue.', priority: '0.5' },
  '/contact': { title: 'Contact Us | Mediigo', description: 'Contact Mediigo for help with bookings, your account or getting your clinic on Mediigo.', priority: '0.5' },
  '/privacy-policy': { title: 'Privacy Policy | Mediigo', description: 'How Mediigo collects, uses, stores, shares and protects your personal and medical information, and the privacy rights available to you.', priority: '0.3', changefreq: 'yearly' },
  '/terms': { title: 'Terms of Use | Mediigo', description: 'The terms that apply when patients use Mediigo to find doctors and clinics, book OPD tokens, follow the queue and access digital prescriptions.', priority: '0.3', changefreq: 'yearly' },
  '/cookie-policy': { title: 'Cookie Policy | Mediigo', description: 'The cookies and browser storage Mediigo uses, why, and how you can control them.', priority: '0.2', changefreq: 'yearly' },
  '/clinic-terms': { title: 'Clinic & Doctor Terms | Mediigo', description: 'Terms for clinics, hospitals, doctors and staff who use Mediigo to manage their OPD.', priority: '0.3', changefreq: 'yearly' },
  '/refund-policy': { title: 'Cancellation & Refund Policy | Mediigo', description: 'How booking cancellations work on Mediigo and how refunds are handled for patients and clinics.', priority: '0.3', changefreq: 'yearly' },
  '/medical-disclaimer': { title: 'Medical Disclaimer | Mediigo', description: 'Mediigo is a booking and queue platform, not a healthcare provider.', priority: '0.2', changefreq: 'yearly' },
  '/grievance-redressal': { title: 'Grievance Redressal | Mediigo', description: 'How to raise a complaint with Mediigo, our Grievance Officer’s details and response timelines.', priority: '0.3', changefreq: 'yearly' },
};
// The bare domain opens the patient portal, so it shares its page.
PAGES['/'] = { ...PAGES['/p/explore'], canonical: '/p/explore' };

// Signed-in areas, sign-in screens and one-off token links: never indexed.
const PRIVATE = /^\/(d|r|a|admin|super|staff|t|display)(\/|$)|^\/(login|403)$|^\/clinic\/login$|^\/p\/(tracker|bookings|profile)(\/|$)/;

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// JSON inside <script>: stop a "</script>" in data from ending the tag.
const ldJson = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c');

export function renderHead(html, m) {
  const tags = [
    `<title>${esc(m.title)}</title>`,
    `<meta name="description" content="${esc(m.description)}" />`,
    `<meta name="robots" content="${esc(m.robots)}" />`,
    m.canonical ? `<link rel="canonical" href="${esc(m.canonical)}" />` : '',
    `<meta property="og:site_name" content="${BRAND}" />`,
    '<meta property="og:locale" content="en_IN" />',
    `<meta property="og:type" content="${esc(m.type || 'website')}" />`,
    `<meta property="og:title" content="${esc(m.title)}" />`,
    `<meta property="og:description" content="${esc(m.description)}" />`,
    m.canonical ? `<meta property="og:url" content="${esc(m.canonical)}" />` : '',
    `<meta property="og:image" content="${esc(m.image)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${esc(m.title)}" />`,
    `<meta name="twitter:description" content="${esc(m.description)}" />`,
    `<meta name="twitter:image" content="${esc(m.image)}" />`,
    ...(m.jsonLd ?? []).map((o) => `<script type="application/ld+json">${ldJson(o)}</script>`),
  ].filter(Boolean).join('\n    ');
  return html.replace(/<!--SEO:START[\s\S]*?<!--SEO:END-->/, tags);
}

const organization = (siteUrl) => ({
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'Organization', '@id': `${siteUrl}/#org`, name: BRAND, url: `${siteUrl}/`, logo: `${siteUrl}/logo-mark.png`, email: 'support@mediigo.com' },
    { '@type': 'WebSite', '@id': `${siteUrl}/#website`, name: BRAND, url: `${siteUrl}/`, publisher: { '@id': `${siteUrl}/#org` }, inLanguage: 'en-IN' },
  ],
});

/** Doctor profile tags, from the public doctor API, cached for ten minutes. */
function doctorFetcher(apiTarget) {
  const cache = new Map();
  const TTL = 10 * 60 * 1000;
  return async (id) => {
    const hit = cache.get(id);
    if (hit && Date.now() - hit.at < TTL) return hit.data;
    let data = null;
    try {
      const res = await fetch(`${apiTarget.replace(/\/$/, '')}/api/doctors/${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(2500) });
      if (res.ok) data = (await res.json())?.data ?? null;
    } catch { /* slow or down: fall back to the generic tags */ }
    if (cache.size > 2000) cache.clear();
    cache.set(id, { at: Date.now(), data });
    return data;
  };
}

export function createMetaResolver({ siteUrl, apiTarget, noindexAll }) {
  const getDoctor = doctorFetcher(apiTarget);
  const abs = (p) => (p?.startsWith('http') ? p : `${siteUrl}${p}`);
  const base = (over = {}) => ({
    title: `${BRAND} — Find & Book Doctors Near You | OPD Tokens & Live Queue`,
    description: DEFAULT_DESC,
    image: abs(DEFAULT_IMAGE),
    robots: 'index, follow, max-image-preview:large',
    jsonLd: [organization(siteUrl)],
    ...over,
  });

  return async (rawPath) => {
    const p = rawPath.length > 1 ? rawPath.replace(/\/+$/, '') : rawPath;
    let m;
    if (PRIVATE.test(p)) {
      m = base({ title: `${BRAND}`, robots: 'noindex, nofollow', canonical: null, jsonLd: [] });
    } else if (PAGES[p]) {
      const pg = PAGES[p];
      m = base({ title: pg.title, description: pg.description, image: abs(pg.image || DEFAULT_IMAGE), canonical: abs(pg.canonical || p) });
    } else {
      const doc = p.match(/^\/p\/doctors\/([a-f0-9]{24})$/i);
      const d = doc ? await getDoctor(doc[1]) : null;
      if (d) {
        const h = d.hospital || {};
        const cityParts = String(h.address?.city || '').split(',').map((s) => s.trim()).filter(Boolean);
        const city = cityParts[cityParts.length - 1] || '';
        const url = `${siteUrl}/p/doctors/${doc[1]}`;
        const fee = d.fees?.fresh != null ? ` Consultation fee ₹${d.fees.fresh}.` : '';
        const coords = Array.isArray(h.location?.coordinates) ? h.location.coordinates : null;
        m = base({
          title: `${d.name}${d.specialty ? `, ${d.specialty}` : ''}${city ? ` in ${city}` : ''} — Book OPD Token | ${BRAND}`,
          description: `Book an OPD token with ${d.name}${d.specialty ? ` (${d.specialty})` : ''}${h.name ? ` at ${h.name}` : ''}${city ? `, ${city}` : ''}.${fee} See OPD timings, reviews and the live queue on Mediigo.`,
          image: d.photo?.url ? abs(d.photo.url) : abs(DEFAULT_IMAGE),
          canonical: url,
          type: 'profile',
          jsonLd: [{
            '@context': 'https://schema.org',
            '@type': 'Physician',
            name: d.name,
            url,
            ...(d.photo?.url ? { image: abs(d.photo.url) } : {}),
            ...(d.specialty ? { medicalSpecialty: d.specialty } : {}),
            ...(h.name ? {
              hospitalAffiliation: { '@type': 'MedicalClinic', name: h.name },
              address: { '@type': 'PostalAddress', streetAddress: [h.address?.line1, h.address?.line2].filter(Boolean).join(', '), addressLocality: city, addressRegion: h.address?.state, postalCode: h.address?.pincode, addressCountry: 'IN' },
            } : {}),
            ...(coords ? { geo: { '@type': 'GeoCoordinates', latitude: coords[1], longitude: coords[0] } } : {}),
            ...(d.rating?.count > 0 ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: Number(d.rating.average).toFixed(1), reviewCount: d.rating.count, bestRating: 5 } } : {}),
          }],
        });
      } else if (doc) {
        m = base({ title: `Doctor profile | ${BRAND}`, robots: 'noindex, follow', canonical: null });
      } else {
        // Unknown URL: the app shows its own not-found page.
        m = base({ robots: 'noindex, follow', canonical: null });
      }
    }
    if (noindexAll) m.robots = 'noindex, nofollow';
    return m;
  };
}

export function robotsTxt({ siteUrl, noindexAll }) {
  if (noindexAll) return 'User-agent: *\nDisallow: /\n';
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    'Disallow: /d/',
    'Disallow: /r/',
    'Disallow: /a/',
    'Disallow: /admin',
    'Disallow: /super',
    'Disallow: /staff/',
    'Disallow: /login',
    'Disallow: /clinic/login',
    'Disallow: /t/',
    'Disallow: /display/',
    'Disallow: /p/tracker',
    'Disallow: /p/bookings',
    'Disallow: /p/profile',
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
    '',
  ].join('\n');
}

let sitemapCache = { at: 0, xml: '' };
export async function sitemapXml({ siteUrl, apiTarget }) {
  if (sitemapCache.xml && Date.now() - sitemapCache.at < 60 * 60 * 1000) return sitemapCache.xml;
  const today = new Date().toISOString().slice(0, 10);
  const urls = Object.entries(PAGES)
    .filter(([p, pg]) => p !== '/' && !pg.canonical)
    .map(([p, pg]) => ({ loc: `${siteUrl}${p}`, lastmod: today, changefreq: pg.changefreq || 'monthly', priority: pg.priority || '0.5' }));
  try {
    const res = await fetch(`${apiTarget.replace(/\/$/, '')}/api/doctors/sitemap`, { signal: AbortSignal.timeout(5000) });
    const doctors = res.ok ? (await res.json())?.data ?? [] : [];
    for (const d of doctors) {
      urls.push({ loc: `${siteUrl}/p/doctors/${d.id}`, lastmod: String(d.updatedAt || today).slice(0, 10), changefreq: 'weekly', priority: '0.8' });
    }
  } catch { /* API unreachable: still serve the static pages */ }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${esc(u.loc)}</loc><lastmod>${u.lastmod}</lastmod><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join('\n')}\n</urlset>\n`;
  sitemapCache = { at: Date.now(), xml };
  return xml;
}
