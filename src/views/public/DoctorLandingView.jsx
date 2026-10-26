import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { api, unwrap } from '../../lib/api.js';
import { useApi } from '../../hooks/useApi.js';
import { inr } from '../../lib/format.js';
import { SiteFooter } from '../../components/legal/SiteFooter.jsx';
import { useSeo } from '../../lib/seo.js';
import { SITE } from '../../lib/site.js';

/**
 * Mediigo for clinics — the page doctors land on from an ad (mediigo.in/clinic).
 *
 * One job: explain what Mediigo does for a clinic and collect an enquiry. The
 * form posts to /api/enquiries, which files it as a follow-up for the field
 * agent covering the doctor's city (or for the super admin to hand out).
 * utm_* parameters from the ad link are kept for the whole visit and sent
 * with the enquiry, so each campaign's leads can be told apart.
 *
 * Testimonials stay empty until there are real ones: a made-up quote on a
 * page we pay to send doctors to is a claim we cannot stand behind.
 */

const TESTIMONIALS = [
  // { quote: '…', name: 'Dr. …', role: 'Pediatrician, … Clinic, Pune' },
];

const UTM_KEY = 'mg-utm';
const readUtm = (search) => {
  const p = new URLSearchParams(search);
  const fresh = { source: p.get('utm_source'), medium: p.get('utm_medium'), campaign: p.get('utm_campaign'), content: p.get('utm_content') };
  if (Object.values(fresh).some(Boolean)) {
    const clean = Object.fromEntries(Object.entries(fresh).map(([k, v]) => [k, (v || '').slice(0, 120)]));
    try { sessionStorage.setItem(UTM_KEY, JSON.stringify(clean)); } catch { /* private mode */ }
    return clean;
  }
  try { return JSON.parse(sessionStorage.getItem(UTM_KEY) || 'null'); } catch { return null; }
};

const FEATURES = [
  { icon: 'fa-ticket', title: 'Digital tokens & live queue', body: 'Patients get a token on their phone and see exactly where the queue is. No crowd at the reception, no “how long, doctor?”.' },
  { icon: 'fa-mobile-screen', title: 'Online bookings from the Mediigo app', body: 'Patients nearby find you, see your timings and fees, and book a token for today or later in the week.' },
  { icon: 'fa-qrcode', title: 'QR standee for walk-ins', body: 'Walk-in patients scan the standee at your door and join the same queue — no app download needed.' },
  { icon: 'fa-brands fa-whatsapp', title: 'WhatsApp alerts', body: 'Booking confirmations and “your turn is close” messages go out automatically, so patients arrive on time.' },
  { icon: 'fa-file-prescription', title: 'Prescriptions & patient history', body: 'Write the Rx in the chamber, print or share it, and see every past visit before the patient sits down.' },
  { icon: 'fa-chart-line', title: 'Collections & analytics', body: 'Cash, UPI and card collections, petty cash and footfall by doctor — the day closes itself.' },
];

const STEPS = [
  ['fa-paper-plane', 'Tell us about your clinic', 'Fill the short form at the top of this page. It takes a minute.'],
  ['fa-user-tie', 'We visit and set you up', 'A Mediigo field agent meets you, adds your doctors, OPD timings and fees, and installs your QR standee.'],
  ['fa-circle-check', 'Go live', 'Once approved, your clinic appears to patients nearby and your front desk starts issuing digital tokens.'],
];

const FAQS = [
  ['Do my patients need to install an app?', 'No. Patients who book online use Mediigo, but walk-ins simply scan your QR standee or get a token from your front desk, and can follow their turn from a link.'],
  ['What do I need at the clinic?', 'A phone or computer at the front desk and an internet connection. We bring the QR standee.'],
  ['How long does setup take?', 'Usually one visit. Our field agent captures your clinic details, doctors and timings on the spot; you go live once it is approved.'],
  ['Can I run more than one doctor or a polyclinic?', 'Yes. Each doctor gets their own queue and login, one doctor can be the clinic admin with the full revenue view, and the front desk sees every queue.'],
  ['How is Mediigo priced?', 'There is no setup fee. After the free trial you pay per token issued — see Pricing above. A clinic group or hospital can ask us for a custom plan.'],
];

const SPECIALTY_FALLBACK = ['General Medicine', 'Pediatrics', 'Gynecology', 'Orthopedics', 'Dermatology', 'Cardiology', 'ENT', 'Dentistry'];

const INPUT = 'w-full h-11 px-3 rounded-lg border border-slate-300 bg-white text-base sm:text-sm text-slate-900 placeholder:text-slate-400 transition focus:outline-none focus:border-mg-teal focus:ring-2 focus:ring-mg-teal/20';

function Eyebrow({ children, light }) {
  return <p className={clsx('text-sm font-semibold uppercase tracking-[0.14em]', light ? 'text-mg-mint' : 'text-mg-teal')}>{children}</p>;
}

function SectionHead({ eyebrow, title, children }) {
  return (
    <div className="max-w-3xl mx-auto text-center">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-3 text-2xl sm:text-4xl font-semibold tracking-tight text-slate-900 leading-tight">{title}</h2>
      {children && <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">{children}</p>}
    </div>
  );
}

/** The OPD desk, drawn in the page's own markup — what the clinic actually gets. */
function DeskMock() {
  const queue = [
    ['T-21', 'Asha Patil', 'In chamber', 'bg-teal-50 text-mg-tealDark'],
    ['T-22', 'Rohan Mehta', 'Next', 'bg-blue-50 text-mg-blue'],
    ['T-23', 'Sunita Kale', 'Waiting · 8 min', 'bg-slate-100 text-slate-600'],
    ['T-24', 'Imran Shaikh', 'Waiting · 16 min', 'bg-slate-100 text-slate-600'],
  ];
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-[0_20px_60px_-20px_rgba(30,63,160,0.35)] overflow-hidden text-left">
      <div className="flex items-center gap-1.5 px-4 h-9 bg-mg-surface border-b border-slate-200">
        <span className="w-2.5 h-2.5 rounded-full bg-rose-300" /><span className="w-2.5 h-2.5 rounded-full bg-amber-300" /><span className="w-2.5 h-2.5 rounded-full bg-emerald-300" />
        <span className="ml-3 text-[11px] text-slate-400 truncate">mediigo.in/r/queue</span>
      </div>
      <div className="grid grid-cols-[150px_minmax(0,1fr)] max-sm:grid-cols-1">
        <aside className="max-sm:hidden bg-mg-navy text-white/80 p-3 space-y-1 text-xs">
          {[['fa-list-check', 'Queue', true], ['fa-file-prescription', 'Rx / EMR'], ['fa-user-plus', 'Walk-In'], ['fa-calendar-days', 'Roster'], ['fa-chart-line', 'Analytics'], ['fa-wallet', 'Petty Cash']].map(([ic, l, on]) => (
            <p key={l} className={clsx('flex items-center gap-2 px-2.5 py-2 rounded-lg', on && 'bg-white/15 text-white font-semibold')}>
              <i className={clsx('fa-solid w-4 text-center', ic)} aria-hidden="true" /> {l}
            </p>
          ))}
        </aside>
        <div className="p-3 sm:p-4 space-y-3">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {[['Tokens today', '48', 'text-mg-blue'], ['Waiting', '6', 'text-amber-600'], ['Avg. wait', '14 min', 'text-mg-tealDark'], ['Collected', inr(18400), 'text-emerald-600']].map(([k, v, c]) => (
              <div key={k} className="rounded-lg border border-slate-200 p-2.5">
                <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">{k}</p>
                <p className={clsx('mt-0.5 text-base sm:text-lg font-bold', c)}>{v}</p>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
            {queue.map(([t, n, s, tone]) => (
              <div key={t} className="flex items-center gap-3 px-3 py-2 text-xs sm:text-sm">
                <span className="w-12 font-bold text-mg-navy">{t}</span>
                <span className="flex-1 min-w-0 truncate text-slate-800">{n}</span>
                <span className={clsx('shrink-0 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold', tone)}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function EnquiryForm({ formRef, prefill }) {
  const location = useLocation();
  const { data: specialtyList } = useApi('/api/specialties');
  const specialties = (specialtyList ?? []).map((s) => s.name);
  const [f, setF] = useState({ name: '', phone: '', clinicName: '', city: '', specialty: '', doctorsCount: '', preferredTime: '', email: '', message: '', website: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [failure, setFailure] = useState('');
  // Phones see the four fields that matter first; the rest is one tap away.
  const [more, setMore] = useState(false);

  useEffect(() => { if (prefill) setF((x) => ({ ...x, message: x.message || prefill })); }, [prefill]);

  const set = (k, fn = (v) => v) => (e) => setF((x) => ({ ...x, [k]: fn(e.target.value) }));

  const submit = async (e) => {
    e.preventDefault();
    const err = {};
    if (f.name.trim().length < 2) err.name = 'Please tell us your name';
    if (!/^[6-9]\d{9}$/.test(f.phone)) err.phone = 'Enter a valid 10-digit mobile number';
    if (f.city.trim().length < 2) err.city = 'Which city is your clinic in?';
    if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) err.email = 'Enter a valid email';
    if (err.email) setMore(true);
    setErrors(err);
    if (Object.keys(err).length) return;
    setBusy(true);
    setFailure('');
    try {
      unwrap(await api.post('/api/enquiries', {
        ...f,
        utm: readUtm(location.search) ?? undefined,
        referrer: document.referrer.slice(0, 300),
      }));
      setDone({ name: f.name.trim(), phone: f.phone });
      // Ad platforms count this as a lead if their pixel is on the page; harmless otherwise.
      window.fbq?.('track', 'Lead');
      window.gtag?.('event', 'generate_lead');
    } catch (ex) {
      setFailure(ex.message || 'Could not send right now — please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div ref={formRef} className="scroll-mt-20 mg-card p-5 sm:p-8 text-center shadow-[0_20px_60px_-24px_rgba(30,63,160,0.35)]">
        <span className="mx-auto w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 grid place-items-center text-xl ring-8 ring-emerald-50/50">
          <i className="fa-solid fa-check" aria-hidden="true" />
        </span>
        <h3 className="mt-5 text-xl font-semibold text-slate-900">Thank you, {done.name.split(' ').slice(0, 2).join(' ')}</h3>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          We have your details. Someone from the Mediigo team will call you on <strong className="text-slate-900">+91 {done.phone}</strong> to set up a time that suits you.
        </p>
        <Link to="/p/explore" className="mt-5 inline-flex text-sm font-medium text-mg-teal hover:underline">See how patients find doctors on Mediigo →</Link>
      </div>
    );
  }

  const label = 'block text-xs font-medium text-slate-700 mb-1.5';
  const errorText = (k) => errors[k] && <p className="mt-1 text-xs font-medium text-rose-600">{errors[k]}</p>;

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="relative scroll-mt-20 mg-card p-4 sm:p-7 space-y-4 shadow-[0_20px_60px_-24px_rgba(30,63,160,0.35)]" aria-labelledby="enquire-title">
      <div>
        <h2 id="enquire-title" className="text-lg sm:text-xl font-semibold text-slate-900">Get a free demo for your clinic</h2>
        <p className="mt-1 text-sm text-slate-500">We will call you back — no obligation.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <label htmlFor="enq-name" className={label}>Your name <span className="text-rose-500">*</span></label>
          <input id="enq-name" autoComplete="name" value={f.name} onChange={set('name')} placeholder="Dr. Rajesh Sharma" className={clsx(INPUT, errors.name && 'border-rose-300 bg-rose-50/40')} />
          {errorText('name')}
        </div>
        <div>
          <label htmlFor="enq-phone" className={label}>Mobile number <span className="text-rose-500">*</span></label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">+91</span>
            <input id="enq-phone" type="tel" inputMode="numeric" autoComplete="tel-national" value={f.phone} onChange={set('phone', (v) => v.replace(/\D/g, '').slice(0, 10))} placeholder="98220 11223" className={clsx(INPUT, 'pl-11', errors.phone && 'border-rose-300 bg-rose-50/40')} />
          </div>
          {errorText('phone')}
        </div>
        <div>
          <label htmlFor="enq-clinic" className={label}>Clinic name</label>
          <input id="enq-clinic" autoComplete="organization" value={f.clinicName} onChange={set('clinicName')} placeholder="Sunrise Multispeciality Clinic" className={INPUT} />
        </div>
        <div>
          <label htmlFor="enq-city" className={label}>City <span className="text-rose-500">*</span></label>
          <input id="enq-city" autoComplete="address-level2" value={f.city} onChange={set('city')} placeholder="Pune" className={clsx(INPUT, errors.city && 'border-rose-300 bg-rose-50/40')} />
          {errorText('city')}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setMore((m) => !m)}
        aria-expanded={more}
        aria-controls="enq-more"
        className="sm:hidden w-full flex items-center justify-between text-sm font-medium text-mg-teal"
      >
        {more ? 'Fewer details' : 'Add more details (optional)'}
        <i className={clsx('fa-solid fa-chevron-down text-xs transition', more && 'rotate-180')} aria-hidden="true" />
      </button>

      <div id="enq-more" className={clsx('space-y-4', !more && 'max-sm:hidden')}>
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div>
          <label htmlFor="enq-spec" className={label}>Specialty</label>
          <select id="enq-spec" value={f.specialty} onChange={set('specialty')} className={clsx(INPUT, 'cursor-pointer')}>
            <option value="">Select…</option>
            {(specialties.length ? specialties : SPECIALTY_FALLBACK).map((s) => <option key={s}>{s}</option>)}
            <option>Other</option>
          </select>
        </div>
        <div>
          <label htmlFor="enq-docs" className={label}>Doctors at the clinic</label>
          <select id="enq-docs" value={f.doctorsCount} onChange={set('doctorsCount')} className={clsx(INPUT, 'cursor-pointer')}>
            <option value="">Select…</option>
            <option value="1">Just me</option>
            <option value="2-5">2–5</option>
            <option value="6-10">6–10</option>
            <option value="10+">More than 10</option>
          </select>
        </div>
      </div>

      <fieldset>
        <legend className={label}>Best time to call</legend>
        <div className="grid grid-cols-3 gap-2">
          {['Morning', 'Afternoon', 'Evening'].map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={f.preferredTime === t}
              onClick={() => setF((x) => ({ ...x, preferredTime: x.preferredTime === t ? '' : t }))}
              className={clsx('h-10 rounded-lg border text-sm font-medium transition', f.preferredTime === t ? 'border-mg-teal bg-mg-teal/10 text-mg-tealDark' : 'border-slate-300 text-slate-600 hover:border-slate-400')}
            >
              {t}
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="enq-email" className={label}>Email</label>
        <input id="enq-email" type="email" autoComplete="email" value={f.email} onChange={set('email')} placeholder="you@clinic.com" className={clsx(INPUT, errors.email && 'border-rose-300 bg-rose-50/40')} />
        {errorText('email')}
      </div>
      <div>
        <label htmlFor="enq-msg" className={label}>Anything we should know?</label>
        <textarea id="enq-msg" rows={3} value={f.message} onChange={set('message')} placeholder="e.g. we see 60 patients a day across two shifts" className={clsx(INPUT, 'h-auto py-2.5 resize-none')} />
      </div>
      </div>

      {/* Honeypot: hidden from people and screen readers; bots fill it in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
        <label htmlFor="enq-website">Website</label>
        <input id="enq-website" tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} />
      </div>

      {failure && <p className="text-sm font-medium text-rose-600">{failure}</p>}
      <button type="submit" disabled={busy} className="w-full h-12 rounded-lg bg-mg-blue hover:bg-mg-navy text-white text-base font-semibold shadow-sm transition disabled:opacity-60 inline-flex items-center justify-center gap-2">
        {busy ? <><i className="fa-solid fa-circle-notch fa-spin" aria-hidden="true" /> Sending…</> : <>Request a call back <i className="fa-solid fa-arrow-right" aria-hidden="true" /></>}
      </button>
      <p className="text-[11px] text-slate-500 text-center">By submitting, you agree that Mediigo may contact you about its services. See our <Link to="/privacy-policy" className="underline hover:text-mg-blue">Privacy Policy</Link>.</p>
    </form>
  );
}

export default function DoctorLandingView() {
  const location = useLocation();
  const { data: pricing } = useApi('/api/enquiries/pricing');
  const formRef = useRef(null);
  const [formInView, setFormInView] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [prefill, setPrefill] = useState('');

  useEffect(() => { readUtm(location.search); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useSeo({
    title: 'Clinic Management Software — Digital Tokens, Live Queue & Online Bookings',
    description: 'Mediigo helps clinics in India run their OPD on time: digital tokens, a live patient queue, online bookings, QR walk-ins, prescriptions and collections. Free trial, no setup fee.',
    path: '/clinic',
    image: '/og/mediigo-clinic-og.png',
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'Mediigo for Clinics',
        applicationCategory: 'BusinessApplication',
        applicationSubCategory: 'Clinic management software',
        operatingSystem: 'Web',
        url: `${SITE.url}/clinic`,
        description: 'Digital tokens, live OPD queue, online bookings, prescriptions and collections for clinics.',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR', description: 'Free trial, then pay per token' },
        publisher: { '@type': 'Organization', name: SITE.name, url: SITE.url },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQS.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
      },
    ],
  });

  // /clinic#enquire (from ads or the staff login) opens on the form.
  useEffect(() => {
    if (location.hash === '#enquire') setTimeout(() => document.getElementById('enquire')?.scrollIntoView({ behavior: 'smooth' }), 150);
  }, [location.hash]);

  useEffect(() => {
    const el = formRef.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([e]) => setFormInView(e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const toForm = (note) => {
    if (note) setPrefill(note);
    setMenuOpen(false);
    // The form itself, not the section: on a phone the headline above it
    // would otherwise fill the screen.
    (formRef.current ?? document.getElementById('enquire'))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    formRef.current?.querySelector('input')?.focus({ preventScroll: true });
  };

  const trialDays = pricing?.trialDays ?? 30;
  const perToken = pricing
    ? pricing.chargeMode === 'PERCENT'
      ? { big: `${pricing.percent}%`, unit: 'of the consultation fee', line: 'Charged only on tokens your clinic issues' }
      : { big: inr(pricing.onlineRate), unit: 'per online booking', line: `${inr(pricing.offlineRate)} per token issued at your front desk` }
    : { big: '—', unit: '', line: '' };

  const nav = [['#features', 'Features'], ['#how', 'How it works'], ['#pricing', 'Pricing'], ['#faq', 'FAQ']];

  return (
    <div className="min-h-screen bg-white font-display text-slate-900">
      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link to="/clinic" className="flex items-center gap-2 min-w-0">
            <img src="/logo-mark.png" alt="" className="w-9 h-auto" />
            <span className="leading-none">
              <span className="block text-lg font-bold text-mg-navy tracking-tight">Mediigo</span>
              <span className="block text-[10px] text-slate-500 mt-0.5">for Clinics</span>
            </span>
          </Link>
          <nav aria-label="Sections" className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            {nav.map(([href, l]) => <a key={href} href={href} className="hover:text-mg-blue">{l}</a>)}
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/clinic/login" className="hidden sm:inline-flex h-10 items-center px-3 rounded-lg text-sm font-medium text-mg-blue hover:bg-blue-50">Sign in</Link>
            <button type="button" onClick={() => toForm()} className="h-10 px-3 sm:px-4 rounded-lg bg-mg-blue hover:bg-mg-navy text-white text-sm font-semibold shadow-sm transition whitespace-nowrap">Get a demo</button>
            <button type="button" onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen} aria-label="Menu" className="md:hidden w-10 h-10 grid place-items-center rounded-lg text-slate-600 hover:bg-mg-surface">
              <i className={clsx('fa-solid', menuOpen ? 'fa-xmark' : 'fa-bars')} aria-hidden="true" />
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav aria-label="Sections" className="md:hidden border-t border-slate-100 bg-white px-4 py-2">
            {nav.map(([href, l]) => <a key={href} href={href} onClick={() => setMenuOpen(false)} className="block py-2.5 text-sm font-medium text-slate-700">{l}</a>)}
            <Link to="/clinic/login" className="block py-2.5 text-sm font-medium text-mg-blue">Sign in to your clinic</Link>
          </nav>
        )}
      </header>

      {/* ── Hero: the enquiry comes first ─────────────────────────────── */}
      {/* One grid, three blocks: on a phone the pitch, then the form, then
          what happens next; on a desktop the form sits beside both. */}
      <section id="enquire" className="relative overflow-hidden scroll-mt-16">
        <div aria-hidden="true" className="absolute -top-32 right-[-10%] w-[640px] h-[640px] rounded-full bg-gradient-to-br from-mg-mint/30 via-blue-100/40 to-transparent blur-2xl" />
        <div className="relative max-w-6xl mx-auto px-4 pt-6 sm:pt-12 lg:pt-16 pb-10 sm:pb-16 grid lg:grid-cols-2 lg:grid-rows-[auto_1fr] gap-x-12 gap-y-6 lg:items-start">
          <div className="lg:col-start-1 lg:row-start-1 lg:pt-4">
            <Eyebrow>Tokens · Live queue · Online bookings</Eyebrow>
            <h1 className="mt-3 sm:mt-4 text-[28px] leading-[1.15] sm:text-5xl lg:text-[52px] font-semibold tracking-tight">
              <span className="text-mg-blue">Clinic management</span> that keeps your OPD running on time
            </h1>
            <p className="hidden sm:block mt-5 text-lg text-slate-600 leading-relaxed max-w-xl">
              Digital tokens, a live queue for patients, new bookings from nearby and the day’s collection — from one simple desk.
            </p>
          </div>

          <div className="lg:col-start-2 lg:row-start-1 lg:row-span-2">
            <EnquiryForm formRef={formRef} prefill={prefill} />
          </div>

          <div className="lg:col-start-1 lg:row-start-2">
            <ul className="grid gap-2.5 sm:gap-3 text-sm sm:text-base text-slate-700">
              {['A short call at the time you choose', 'A free demo at your clinic', 'Doctors, timings and fees set up for you', `${trialDays} days free before you pay anything`].map((t) => (
                <li key={t} className="flex gap-3"><i className="fa-solid fa-circle-check text-mg-teal mt-1" aria-hidden="true" />{t}</li>
              ))}
            </ul>
            <a href="#product" className="mt-6 inline-flex items-center gap-2 text-sm sm:text-base font-medium text-mg-blue hover:text-mg-navy">
              <i className="fa-regular fa-circle-play text-mg-teal" aria-hidden="true" /> See how it works
            </a>
          </div>
        </div>
      </section>

      {/* ── Product ────────────────────────────────────────────────────── */}
      <section id="product" className="scroll-mt-20 bg-mg-surface/60 py-14 sm:py-20">
        <div className="max-w-6xl mx-auto px-4">
          <SectionHead eyebrow="Product" title="See your OPD on one screen">
            The front desk issues tokens, the doctor calls the next patient, and patients watch the queue move on their phones — while every payment lands in the day’s report.
          </SectionHead>
          <div className="mt-10 sm:mt-14 max-w-4xl mx-auto"><DeskMock /></div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────── */}
      <section id="features" className="scroll-mt-20 py-14 sm:py-20">
        <div className="max-w-6xl mx-auto px-4">
          <SectionHead eyebrow="Features" title="Everything a busy clinic needs, nothing it doesn’t" />
          <div className="mt-10 sm:mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {FEATURES.map((ft) => (
              <article key={ft.title} className="mg-card p-5 sm:p-6">
                <span className="w-11 h-11 rounded-lg bg-mg-teal/10 text-mg-teal grid place-items-center text-lg">
                  <i className={clsx(ft.icon.startsWith('fa-brands') ? ft.icon : `fa-solid ${ft.icon}`)} aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-base sm:text-lg font-semibold text-slate-900">{ft.title}</h3>
                <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{ft.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────── */}
      <section id="how" className="scroll-mt-20 bg-mg-surface/60 py-14 sm:py-20">
        <div className="max-w-6xl mx-auto px-4">
          <SectionHead eyebrow="How it works" title="Live in one visit" />
          <ol className="mt-10 sm:mt-14 grid md:grid-cols-3 gap-4 sm:gap-5">
            {STEPS.map(([ic, t, b], i) => (
              <li key={t} className="mg-card p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-full bg-mg-blue text-white grid place-items-center text-sm font-bold">{i + 1}</span>
                  <i className={clsx('fa-solid text-mg-teal text-lg', ic)} aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-base sm:text-lg font-semibold">{t}</h3>
                <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{b}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Testimonials (real ones only) ──────────────────────────────── */}
      {TESTIMONIALS.length > 0 && (
        <section className="py-14 sm:py-20">
          <div className="max-w-6xl mx-auto px-4">
            <SectionHead eyebrow="Testimonials" title="What doctors say" />
            <div className="mt-10 sm:mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {TESTIMONIALS.map((t) => (
                <figure key={t.name} className="mg-card p-6">
                  <blockquote className="text-[15px] text-slate-700 leading-relaxed">“{t.quote}”</blockquote>
                  <figcaption className="mt-4 text-sm"><span className="font-semibold text-slate-900">{t.name}</span><span className="block text-slate-500">{t.role}</span></figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Pricing ────────────────────────────────────────────────────── */}
      <section id="pricing" className="scroll-mt-20 py-14 sm:py-20">
        <div className="max-w-6xl mx-auto px-4">
          <SectionHead eyebrow="Pricing" title="Simple pricing that grows with your OPD">
            No setup fee and no monthly subscription. Try everything free, then pay only for the tokens your clinic issues.
          </SectionHead>
          <div className="mt-10 sm:mt-14 grid md:grid-cols-3 gap-4 sm:gap-5 items-stretch">
            {[
              { name: 'Free trial', big: inr(0), unit: `for ${trialDays} days`, body: 'Every feature, for every doctor at your clinic.', points: ['Digital tokens & live queue', 'Online bookings on Mediigo', 'QR standee installed by us'], cta: 'Start free trial', note: 'I would like to start the free trial.' },
              { name: 'Pay per token', big: perToken.big, unit: perToken.unit, body: perToken.line, points: ['No monthly fee — quiet days cost less', 'Unlimited doctors and front-desk logins', 'Prescriptions, analytics & petty cash', ...(pricing?.monthlyCap ? [`Never more than ${inr(pricing.monthlyCap)} a month`] : [])], cta: 'Get started', note: 'Interested in pay-per-token pricing.', featured: true },
              { name: 'Hospitals & groups', big: 'Custom', unit: '', body: 'For multi-branch clinics and hospitals with many departments.', points: ['Several branches under one account', 'Dedicated onboarding support', 'Pricing agreed with you'], cta: 'Talk to us', note: 'We are a hospital / clinic group — please share custom pricing.' },
            ].map((p) => (
              <article key={p.name} className={clsx('rounded-xl border p-6 flex flex-col', p.featured ? 'border-mg-blue bg-white shadow-[0_20px_50px_-24px_rgba(30,63,160,0.45)] md:-my-3' : 'border-slate-200 bg-white')}>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-semibold text-slate-700">{p.name}</h3>
                  {p.featured && <span className="px-2 py-0.5 rounded-full bg-mg-blue/10 text-mg-blue text-[11px] font-semibold">Most clinics</span>}
                </div>
                <p className="mt-3"><span className="text-3xl sm:text-4xl font-bold text-slate-900">{p.big}</span>{p.unit && <span className="ml-1.5 text-sm text-slate-500">{p.unit}</span>}</p>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed min-h-[2.5rem]">{p.body}</p>
                <ul className="mt-5 space-y-2.5 text-sm text-slate-700 flex-1">
                  {p.points.map((pt) => <li key={pt} className="flex gap-2.5"><i className="fa-regular fa-circle-check text-mg-teal mt-0.5" aria-hidden="true" />{pt}</li>)}
                </ul>
                <button
                  type="button"
                  onClick={() => toForm(p.note)}
                  className={clsx('mt-6 h-11 rounded-lg text-sm font-semibold transition inline-flex items-center justify-center gap-2', p.featured ? 'bg-mg-blue hover:bg-mg-navy text-white' : 'border border-mg-blue/40 text-mg-blue hover:bg-blue-50')}
                >
                  {p.cta} <i className="fa-solid fa-arrow-right text-xs" aria-hidden="true" />
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why clinics switch (the hero's old picture) ─────────────────── */}
      <section className="bg-mg-surface/60 py-14 sm:py-20 overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-2 gap-10 lg:gap-12 items-center">
          <div className="relative mx-auto w-full max-w-[340px] sm:max-w-[440px]">
            <div aria-hidden="true" className="absolute inset-x-[8%] bottom-0 top-[14%] rounded-full bg-gradient-to-b from-blue-50 to-mg-mint/20" />
            <img
              src="/landing/hero-doctor.webp"
              alt="A doctor holding a clipboard"
              width="1400"
              height="1559"
              loading="lazy"
              className="relative w-full h-auto [mask-image:linear-gradient(to_bottom,black_82%,transparent)]"
            />
            <div className="absolute left-0 top-[12%] mg-card px-3 py-2.5 sm:px-3.5 sm:py-3 w-[46%] shadow-lg">
              <p className="text-[11px] text-slate-500">Now serving</p>
              <p className="mt-0.5 text-lg sm:text-xl font-bold text-mg-navy">T-21</p>
              <p className="mt-1 text-[10px] sm:text-[11px] text-mg-tealDark font-medium"><i className="fa-solid fa-users mr-1" aria-hidden="true" />6 waiting · ~14 min</p>
            </div>
            <div className="absolute right-0 top-[44%] mg-card px-3 py-2.5 sm:px-3.5 sm:py-3 w-[46%] shadow-lg">
              <p className="text-[11px] text-slate-500">Today’s collection</p>
              <p className="mt-0.5 text-lg sm:text-xl font-bold text-slate-900">{inr(18400)}</p>
              <p className="mt-1 text-[10px] sm:text-[11px] text-emerald-600 font-medium"><i className="fa-solid fa-arrow-trend-up mr-1" aria-hidden="true" />48 tokens issued</p>
            </div>
          </div>
          <div className="text-center md:text-left">
            <Eyebrow>Get started</Eyebrow>
            <h2 className="mt-3 text-2xl sm:text-4xl font-semibold tracking-tight leading-tight">Bring your clinic on Mediigo</h2>
            <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">Leave your number and a Mediigo team member will call you, answer your questions and set up a visit at your clinic.</p>
            <ul className="mt-6 inline-flex flex-col gap-2 text-left text-sm sm:text-base text-slate-700">
              {['No setup fee', `${trialDays}-day free trial`, 'Pay only per token'].map((t) => (
                <li key={t} className="flex gap-3"><i className="fa-solid fa-circle-check text-mg-teal mt-1" aria-hidden="true" />{t}</li>
              ))}
            </ul>
            <div className="mt-7">
              <button type="button" onClick={() => toForm()} className="w-full sm:w-auto h-12 px-7 rounded-lg bg-mg-blue hover:bg-mg-navy text-white text-base font-semibold shadow-sm transition">
                Get a free demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────── */}
      <section id="faq" className="scroll-mt-20 py-14 sm:py-20">
        <div className="max-w-3xl mx-auto px-4">
          <SectionHead eyebrow="FAQ" title="Questions doctors ask us" />
          <div className="mt-8 divide-y divide-slate-200 border-y border-slate-200">
            {FAQS.map(([q, a]) => (
              <details key={q} className="group">
                <summary className="flex items-center justify-between gap-4 py-4 cursor-pointer list-none text-[15px] sm:text-base font-medium text-slate-800 [&::-webkit-details-marker]:hidden">
                  {q}
                  <i className="fa-solid fa-chevron-down text-xs text-slate-500 transition group-open:rotate-180" aria-hidden="true" />
                </summary>
                <p className="pb-4 -mt-1 text-sm sm:text-[15px] text-slate-600 leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA band ───────────────────────────────────────────────────── */}
      <section className="px-4 pb-14 sm:pb-20">
        <div className="mg-hero max-w-6xl mx-auto px-5 py-10 sm:px-6 sm:py-16 text-center">
          <h2 className="text-2xl sm:text-4xl font-semibold tracking-tight">Ready for a calmer waiting room?</h2>
          <p className="mt-3 text-sm sm:text-lg text-white/90 max-w-2xl mx-auto">Start with a {trialDays}-day free trial. We set everything up for you.</p>
          <button type="button" onClick={() => toForm()} className="mt-7 w-full sm:w-auto h-12 px-7 rounded-lg bg-white text-mg-blue hover:bg-blue-50 text-base font-semibold shadow-sm transition">
            Get a free demo
          </button>
        </div>
      </section>

      <SiteFooter className="pb-24 md:pb-0" />

      {/* Phones: the form is one tap away while reading, and gets out of the way once on screen. */}
      <div className={clsx('md:hidden fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur p-3 transition', formInView ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0')}>
        <button type="button" onClick={() => toForm()} tabIndex={formInView ? -1 : 0} className="w-full h-12 rounded-lg bg-mg-blue text-white text-base font-semibold shadow-sm">
          Get a free demo
        </button>
      </div>
    </div>
  );
}
