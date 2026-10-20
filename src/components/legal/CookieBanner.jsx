import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CONSENT_EVENT, getConsent, loadTrackers, setConsent, trackersConfigured, trackPageView } from '../../lib/consent.js';

// Staff dashboards and token screens are not where anyone should be asked.
const QUIET = /^\/(d|r|a|admin|super|display|t)(\/|$)/;

/**
 * Asks once, only if an ad/analytics tag is configured, and never on staff
 * screens. "Only necessary" is as easy as "Accept" — one tap either way.
 */
export function CookieBanner() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!trackersConfigured()) return undefined;
    if (getConsent() === 'all') loadTrackers();
    else if (getConsent() == null) setOpen(true);
    const reopen = () => setOpen(true);
    window.addEventListener(CONSENT_EVENT, reopen);
    return () => window.removeEventListener(CONSENT_EVENT, reopen);
  }, []);

  useEffect(() => { trackPageView(pathname); }, [pathname]);

  if (!open || QUIET.test(pathname)) return null;

  const choose = (c) => { setConsent(c); setOpen(false); };

  return (
    <div role="dialog" aria-live="polite" aria-label="Cookie preferences" className="fixed inset-x-3 bottom-3 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:max-w-sm z-[60] mg-card p-4 shadow-xl font-display">
      <p className="text-sm font-semibold text-slate-900">Cookies on Mediigo</p>
      <p className="mt-1 text-xs text-slate-600 leading-relaxed">
        We use essential cookies to keep you signed in. With your permission we also use analytics and advertising cookies to measure our ads. They never see your health information.{' '}
        <Link to="/cookie-policy" className="font-medium text-mg-teal hover:underline">Cookie Policy</Link>
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => choose('necessary')} className="h-9 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-mg-surface">Only necessary</button>
        <button type="button" onClick={() => choose('all')} className="h-9 rounded-lg bg-mg-blue hover:bg-mg-navy text-xs font-semibold text-white">Accept all</button>
      </div>
    </div>
  );
}
