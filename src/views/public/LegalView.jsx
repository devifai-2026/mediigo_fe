import { Link, Navigate, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { LEGAL_DOCS, legalDoc } from '../../content/legal.jsx';
import { SITE, missingSiteDetails } from '../../lib/site.js';
import { useSeo } from '../../lib/seo.js';
import { SiteFooter } from '../../components/legal/SiteFooter.jsx';

const COMPANY = ['about', 'contact'];

/**
 * Every legal and company page, at its own top-level URL (/privacy-policy,
 * /terms, …). One layout: the page, its sections, and the other documents.
 */
export default function LegalView() {
  const { pathname } = useLocation();
  const slug = pathname.replace(/^\/+|\/+$/g, '');
  const doc = legalDoc(slug);
  const isCompany = COMPANY.includes(slug);

  useSeo({
    title: doc?.title,
    description: doc?.description,
    path: `/${slug}`,
    jsonLd: doc && {
      '@context': 'https://schema.org',
      '@type': slug === 'about' ? 'AboutPage' : slug === 'contact' ? 'ContactPage' : 'WebPage',
      name: doc.title,
      description: doc.description,
      url: `${SITE.url}/${slug}`,
      isPartOf: { '@type': 'WebSite', name: SITE.name, url: SITE.url },
    },
  });

  if (!doc) return <Navigate to="/p/explore" replace />;
  const missing = import.meta.env.DEV ? missingSiteDetails() : [];
  const others = LEGAL_DOCS.filter((d) => COMPANY.includes(d.slug) === isCompany);

  return (
    <div className="min-h-screen flex flex-col bg-white font-display text-slate-900">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <Link to="/p/explore" className="flex items-center gap-2 min-w-0">
            <img src="/logo-mark.png" alt="" className="w-9 h-auto" />
            <span className="leading-none">
              <span className="block text-lg font-bold text-mg-navy tracking-tight">{SITE.name}</span>
              <span className="block text-[10px] text-slate-500 mt-0.5">Book Doctor Easily</span>
            </span>
          </Link>
          <nav className="flex items-center gap-1 text-sm font-medium">
            <Link to="/p/explore" className="h-10 inline-flex items-center px-3 rounded-lg text-slate-600 hover:text-mg-blue">Find a doctor</Link>
            <Link to="/clinic" className="hidden sm:inline-flex h-10 items-center px-3 rounded-lg text-slate-600 hover:text-mg-blue">For clinics</Link>
          </nav>
        </div>
      </header>
      <div className="h-1.5 bg-mg-blue" />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8 sm:py-12 grid lg:grid-cols-[240px_minmax(0,1fr)] gap-8 lg:gap-12">
        <aside className="lg:sticky lg:top-24 lg:self-start order-2 lg:order-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{isCompany ? 'Company' : 'Legal'}</p>
          <nav aria-label={isCompany ? 'Company pages' : 'Legal documents'} className="mt-3 flex lg:flex-col flex-wrap gap-1.5">
            {others.map((d) => (
              <Link
                key={d.slug}
                to={`/${d.slug}`}
                aria-current={d.slug === slug ? 'page' : undefined}
                className={clsx('px-3 py-2 rounded-lg text-sm transition', d.slug === slug ? 'bg-mg-blue/10 text-mg-blue font-semibold' : 'text-slate-600 hover:bg-mg-surface hover:text-slate-900')}
              >
                {d.title}
              </Link>
            ))}
          </nav>
        </aside>

        <article className="order-1 lg:order-2 min-w-0 max-w-3xl">
          {missing.length > 0 && (
            <div className="mb-6 rounded-lg border border-dashed border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
              <strong>Development only:</strong> fill these in <code>src/lib/site.js</code> before launch — {missing.join(', ')}.
            </div>
          )}
          <h1 className="text-2xl sm:text-4xl font-semibold tracking-tight">{doc.title}</h1>
          {!isCompany && <p className="mt-2 text-sm text-slate-500">Last updated: {SITE.effectiveDate}</p>}

          {doc.sections.length > 3 && (
            <nav aria-label="On this page" className="mt-6 rounded-xl border border-slate-200 bg-mg-surface/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">On this page</p>
              <ol className="mt-2 grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm list-decimal pl-5 marker:text-slate-400">
                {doc.sections.map((s) => <li key={s.id}><a href={`#${s.id}`} className="text-mg-tealDark hover:underline">{s.heading}</a></li>)}
              </ol>
            </nav>
          )}

          <div className="legal-prose mt-8">
            {doc.sections.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-24">
                <h2>{doc.sections.length > 3 ? `${i + 1}. ` : ''}{s.heading}</h2>
                {s.body}
              </section>
            ))}
          </div>
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}
