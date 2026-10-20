import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { SITE } from '../../lib/site.js';
import { COMPANY_LINKS, LEGAL_LINKS } from '../../content/legal.jsx';
import { openCookieSettings, trackersConfigured } from '../../lib/consent.js';

/**
 * The public website footer: company pages, every legal page, and the
 * company identity the IT and e-commerce rules ask us to publish.
 */
export function SiteFooter({ className }) {
  const social = Object.entries(SITE.social).filter(([, url]) => url);
  return (
    <footer className={clsx('border-t border-slate-200 bg-white font-display', className)}>
      <div className="max-w-6xl mx-auto px-4 py-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr] text-sm">
        <div>
          <Link to="/p/explore" className="inline-flex items-center gap-2">
            <img src="/logo-mark.png" alt="" className="w-9 h-auto" />
            <span className="text-lg font-bold text-mg-navy">{SITE.name}</span>
          </Link>
          <p className="mt-3 text-slate-500 max-w-xs leading-relaxed">{SITE.tagline}. Book an OPD token and track the live queue from your phone.</p>
          <p className="mt-3 text-slate-500">
            <a href={`mailto:${SITE.supportEmail}`} className="hover:text-mg-blue">{SITE.supportEmail}</a>
          </p>
          {social.length > 0 && (
            <div className="mt-4 flex gap-3">
              {social.map(([k, url]) => (
                <a key={k} href={url} target="_blank" rel="noopener noreferrer" aria-label={k} className="w-9 h-9 grid place-items-center rounded-full border border-slate-200 text-slate-500 hover:text-mg-blue hover:border-mg-blue">
                  <i className={`fa-brands fa-${k === 'x' ? 'x-twitter' : k}`} aria-hidden="true" />
                </a>
              ))}
            </div>
          )}
        </div>
        <nav aria-label="Company">
          <p className="font-semibold text-slate-900">Mediigo</p>
          <ul className="mt-3 space-y-2 text-slate-600">
            {COMPANY_LINKS.map(([to, l]) => <li key={to}><Link to={to} className="hover:text-mg-blue">{l}</Link></li>)}
          </ul>
        </nav>
        <nav aria-label="Legal">
          <p className="font-semibold text-slate-900">Legal</p>
          <ul className="mt-3 space-y-2 text-slate-600">
            {LEGAL_LINKS.map(([to, l]) => <li key={to}><Link to={to} className="hover:text-mg-blue">{l}</Link></li>)}
            {trackersConfigured() && (
              <li><button type="button" onClick={openCookieSettings} className="hover:text-mg-blue">Cookie settings</button></li>
            )}
          </ul>
        </nav>
      </div>
      <div className="border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-4 py-5 flex flex-col sm:flex-row gap-2 justify-between text-xs text-slate-500">
          <p>© {new Date().getFullYear()} {SITE.legalName}. All rights reserved.</p>
          <p>Mediigo is not for medical emergencies — call 112 or 108.</p>
        </div>
      </div>
    </footer>
  );
}
