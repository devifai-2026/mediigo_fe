/**
 * Cookie consent and the optional trackers it gates.
 *
 * Mediigo itself only uses strictly necessary storage (the sign-in cookie and
 * a few local preferences — see the Cookie Policy), which needs no consent.
 * Ad and analytics tags (Meta Pixel for Instagram/Facebook ads, Google
 * Analytics) are different: they load only after the visitor accepts, and
 * only when their IDs are configured at build time:
 *
 *   VITE_META_PIXEL_ID=1234567890
 *   VITE_GA_MEASUREMENT_ID=G-XXXXXXX
 *
 * With neither set, no banner is shown — there is nothing to consent to.
 */

const KEY = 'mediigo:cookie-consent';
export const CONSENT_EVENT = 'mediigo:cookie-settings';

const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID || '';
const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || '';

export const trackersConfigured = () => Boolean(PIXEL_ID || GA_ID);

export const getConsent = () => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    return v?.choice === 'all' || v?.choice === 'necessary' ? v.choice : null;
  } catch {
    return null;
  }
};

export const setConsent = (choice) => {
  try { localStorage.setItem(KEY, JSON.stringify({ choice, at: new Date().toISOString() })); } catch { /* blocked */ }
  if (choice === 'all') loadTrackers();
};

/** Reopen the banner — from the "Cookie settings" link in the footer. */
export const openCookieSettings = () => window.dispatchEvent(new Event(CONSENT_EVENT));

let loaded = false;
export function loadTrackers() {
  if (loaded || getConsent() !== 'all') return;
  loaded = true;

  if (PIXEL_ID) {
    /* eslint-disable */
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    window.fbq('init', PIXEL_ID);
    window.fbq('track', 'PageView');
  }

  if (GA_ID) {
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() { window.dataLayer.push(arguments); }; // eslint-disable-line prefer-rest-params
    window.gtag('js', new Date());
    // No ad personalisation signals from health pages; page views only.
    window.gtag('config', GA_ID, { anonymize_ip: true, allow_google_signals: false, allow_ad_personalization_signals: false });
  }
}

/** Single-page navigation: tell the trackers a new page was viewed. */
export function trackPageView(path) {
  if (!loaded) return;
  window.fbq?.('track', 'PageView');
  if (GA_ID) window.gtag?.('event', 'page_view', { page_path: path });
}
