import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { api, unwrap } from '../../lib/api.js';
import { useApi } from '../../hooks/useApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { BookingSheet } from '../../components/patient/BookingSheet.jsx';
import { ClinicGallery } from '../../components/patient/ClinicGallery.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { PhotoOrFallback } from '../../components/ui/PhotoOrFallback.jsx';
import { inr, initialsOf, phone, token, time12 as t12, relativeDay } from '../../lib/format.js';
import { nextAvailableText } from '../../lib/clinics.js';
import { RatingBadge } from '../../components/patient/RatingBadge.jsx';
import { directionsUrl } from '../../lib/maps.js';
import { demoProfilesEnabled, demoProfileFor } from '../../lib/demoProfiles.js';
import { useSeo } from '../../lib/seo.js';
import { SITE } from '../../lib/site.js';

/**
 * A doctor's public profile: who they are, what they treat, what patients say,
 * when they sit, and a booking card that stays in view while you read.
 *
 * Reads GET /api/doctors/:id. The card that links here passes its /nearby row
 * in router state, so the header, photo, distance and live queue render
 * immediately instead of after a second round-trip; the detail call then adds
 * the schedule and anything else the row lacks.
 *
 * Profile fields beyond the booking basics, all optional:
 *   about, experienceYears | experience, languages[], qualifications[],
 *   conditionsTreated[], proceduresPerformed[], education[], memberships[],
 *   registration { council, number, year } | councilRegNo, trainings[], awards[],
 *   publications[], videos[{ title, url, thumbnailUrl }]
 * List fields accept strings or objects; see `line()` for the object shapes.
 *
 * Reviews: GET /api/doctors/:id/reviews →
 *   { summary: { average, count, recommendPct }, items: [{ id, patientName,
 *     rating, comment, tag, createdAt }] } — approved ones only, this is public.
 *
 * A section with no data is not drawn, and its jump-pill goes with it. With
 * VITE_DEMO_PROFILES=true, missing fields are filled from lib/demoProfiles.js
 * and the page says so.
 */

const DAY_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHIFT_LABEL = { MORNING: 'Morning', AFTERNOON: 'Afternoon', EVENING: 'Evening' };
const SHIFT_ORDER = { MORNING: 0, AFTERNOON: 1, EVENING: 2 };

const LIST_LIMIT = 15;
const REVIEW_LIMIT = 5;

// A field may arrive as an array, a comma-separated string, or not at all.
const list = (v) => {
  if (Array.isArray(v)) return v.filter(Boolean);
  if (typeof v === 'string' && v.trim()) return v.split(/\s*[,;\n]\s*/).filter(Boolean);
  return [];
};

// One display line for an education / membership / award / publication entry,
// whether it was stored as plain text or as a structured record.
const line = (item) => {
  if (typeof item === 'string') return item;
  const head = item.degree || item.title || item.name || item.organisation || item.organization || '';
  const tail = [item.institution || item.issuer || item.journal, item.role, item.year].filter(Boolean).join(', ');
  return [head, tail].filter(Boolean).join(' — ');
};

const yearsOf = (d) => {
  if (d.experienceYears != null) return Number(d.experienceYears);
  const m = String(d.experience || '').match(/\d+/);
  return m ? Number(m[0]) : null;
};

const ago = (iso) => {
  if (!iso) return '';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days < 1) return 'Today';
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? '' : 's'} ago`;
};

// The detail endpoint carries GeoJSON and contactPhone; the /nearby row carries
// {lat,lng} and may carry phone. One shape for the page.
const normalizeHospital = (h = {}) => {
  const coordinates = h.coordinates
    ?? (Array.isArray(h.location?.coordinates)
      ? { lng: h.location.coordinates[0], lat: h.location.coordinates[1] }
      : null);
  const cityParts = String(h.address?.city || '').split(',').map((s) => s.trim()).filter(Boolean);
  return {
    ...h,
    coordinates,
    phone: h.phone || h.contactPhone || '',
    city: cityParts[cityParts.length - 1] || '',
    locality: cityParts.length > 1 ? cityParts[0] : '',
    fullAddress: h.address?.formatted
      || [h.address?.line1, h.address?.city, h.address?.state, h.address?.pincode].filter(Boolean).join(', '),
  };
};

const Stars = ({ n, className = 'w-3.5 h-3.5' }) => (
  <span className="inline-flex items-center gap-0.5" aria-label={`${n} out of 5`}>
    {[1, 2, 3, 4, 5].map((i) => (
      <svg key={i} viewBox="0 0 24 24" className={clsx(className, i <= n ? 'text-amber-400' : 'text-slate-200')} fill="currentColor" aria-hidden="true">
        <path d="M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6-5.9-3.2-5.9 3.2 1.2-6.6L2.5 9.5l6.6-.9L12 2.5z" />
      </svg>
    ))}
  </span>
);

function Section({ id, icon, title, children }) {
  return (
    <section id={id} className="py-6 sm:py-8 border-t border-slate-200 first:border-t-0 first:pt-2">
      <h2 className="flex items-center gap-2.5 text-lg sm:text-2xl md:text-xl lg:text-2xl font-semibold text-slate-900">
        {icon && <Icon name={icon} className="w-5 h-5 sm:w-6 sm:h-6 text-mg-teal shrink-0" strokeWidth={1.5} />}
        {title}
      </h2>
      <div className="mt-4 sm:mt-5 sm:pl-9 md:pl-0 lg:pl-9">{children}</div>
    </section>
  );
}

/** A list that folds after `limit` items. */
function Folding({ items, limit = LIST_LIMIT, columns = false, more = 'View More' }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, limit);
  return (
    <>
      <ul className={clsx(
        'text-sm sm:text-[15px] text-slate-700',
        columns
          ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-2.5 list-disc pl-5 marker:text-slate-400'
          : 'space-y-4',
      )}
      >
        {shown.map((it, i) => <li key={i} className="leading-snug">{line(it)}</li>)}
      </ul>
      {items.length > limit && (
        <button type="button" onClick={() => setAll((v) => !v)} className="mt-4 text-sm sm:text-[15px] font-semibold text-mg-teal hover:underline">
          {all ? 'View Less' : more}
        </button>
      )}
    </>
  );
}

/** Two lists side by side, each under its own heading — Memberships | Registration. */
function Pair({ id, cells }) {
  const shown = cells.filter((c) => c.items.length);
  if (!shown.length) return null;
  return (
    <section id={id} className="py-6 sm:py-8 border-t border-slate-200">
      <div className={clsx('grid gap-8', shown.length === 2 && 'sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2')}>
        {shown.map((c) => (
          <div key={c.title}>
            <h2 className="flex items-center gap-2.5 text-lg sm:text-2xl md:text-xl lg:text-2xl font-semibold text-slate-900">
              <Icon name={c.icon} className="w-5 h-5 sm:w-6 sm:h-6 text-mg-teal shrink-0" strokeWidth={1.5} />
              {c.title}
            </h2>
            <div className="mt-4 sm:mt-5 sm:pl-9 md:pl-0 lg:pl-9">
              <Folding items={c.items} limit={3} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Height of the portal's sticky header, so this page's sticky parts sit just under it. */
function useHeaderHeight() {
  const [h, setH] = useState(64);
  useEffect(() => {
    const el = document.querySelector('header.sticky');
    if (!el) return undefined;
    const update = () => setH(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return h;
}

function Faq({ q, a }) {
  return (
    <details className="group border-b border-slate-200">
      <summary className="flex items-center justify-between gap-4 py-3.5 sm:py-4 cursor-pointer list-none text-[15px] sm:text-lg text-slate-800 [&::-webkit-details-marker]:hidden">
        {q}
        <Icon name="chevronDown" className="w-5 h-5 text-slate-700 shrink-0 transition group-open:rotate-180" />
      </summary>
      <p className="pb-4 -mt-1 text-sm sm:text-[15px] text-slate-600 leading-relaxed">{a}</p>
    </details>
  );
}

export default function DoctorDetailView() {
  const { doctorId } = useParams();
  const { isAuthed, status: authStatus } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  // A guest who tapped Book was sent to sign in and comes back here with
  // ?book=1 and the sitting they had picked, so booking carries on from where
  // they left it instead of from the search page.
  const resumeRef = useRef(searchParams.get('book')
    ? { date: searchParams.get('date'), shift: searchParams.get('shift') }
    : null);
  const [daysReady, setDaysReady] = useState(false);

  // The /nearby row the card handed over, if we came from one.
  const row = location.state?.doctor?.doctorId === doctorId ? location.state.doctor : null;

  const { data: detail, loading, error } = useApi(`/api/doctors/${doctorId}`);
  const [reviews, setReviews] = useState(null);
  const [days, setDays] = useState([]);
  const [slot, setSlot] = useState(null); // { date, shift }
  const [booking, setBooking] = useState(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [others, setOthers] = useState([]);
  const stripRef = useRef(null);
  const headerH = useHeaderHeight();
  const tabsBarRef = useRef(null);
  const tabsStripRef = useRef(null);
  const tabIdsRef = useRef([]);
  const bookingRef = useRef(null);
  const [activeTab, setActiveTab] = useState(null);
  const [bookingInView, setBookingInView] = useState(false);
  const offsetRef = useRef(0);
  offsetRef.current = headerH + (tabsBarRef.current?.offsetHeight ?? 52) + 8;

  useEffect(() => { window.scrollTo(0, 0); }, [doctorId]);

  // Scroll-spy: the section whose top has passed under the sticky tabs.
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        let current = null;
        for (const id of tabIdsRef.current) {
          const el = document.getElementById(id);
          if (el && el.getBoundingClientRect().top - offsetRef.current <= 4) current = id;
        }
        setActiveTab(current);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', onScroll); };
  }, []);

  // Keep the active pill in view inside its own strip, without moving the page.
  useEffect(() => {
    const strip = tabsStripRef.current;
    const pill = strip?.querySelector(`[data-tab="${activeTab}"]`);
    if (pill) strip.scrollTo({ left: pill.offsetLeft - strip.clientWidth / 2 + pill.clientWidth / 2, behavior: 'smooth' });
  }, [activeTab]);

  // The phone booking bar steps aside while the booking card itself is on screen.
  const hasProfile = Boolean(detail || row);
  useEffect(() => {
    const el = bookingRef.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([e]) => setBookingInView(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, [hasProfile]);

  // Reviews and the schedule are extras: a profile is still worth reading if
  // either call fails, so neither failure blocks the page or raises a toast.
  useEffect(() => {
    let alive = true;
    setReviews(null);
    setDaysReady(false);
    api.get(`/api/doctors/${doctorId}/reviews`)
      .then((res) => { if (alive) setReviews(unwrap(res)); })
      .catch(() => {});
    api.get(`/api/doctors/${doctorId}/availability`)
      .then((res) => {
        if (!alive) return;
        const week = unwrap(res)?.days ?? [];
        setDays(week);
        const firstOpen = week.find((x) => x.shifts.some((sh) => sh.isBookable));
        const firstShift = firstOpen?.shifts.find((sh) => sh.isBookable);
        // The sitting picked before signing in, while it still has room.
        const wanted = resumeRef.current;
        const stillOpen = wanted?.date && week.some((x) => x.date === wanted.date
          && x.shifts.some((sh) => sh.shift === wanted.shift && sh.isBookable));
        if (stillOpen) setSlot({ date: wanted.date, shift: wanted.shift });
        else setSlot(firstOpen && firstShift ? { date: firstOpen.date, shift: firstShift.shift } : null);
      })
      .catch(() => { if (alive) setDays([]); })
      .finally(() => { if (alive) setDaysReady(true); });
    return () => { alive = false; };
  }, [doctorId]);

  const d = useMemo(() => {
    if (!detail && !row) return null;
    const merged = { ...(row || {}), ...(detail || {}) };
    merged.hospital = normalizeHospital({ ...(row?.hospital || {}), ...(detail?.hospital || {}) });
    merged.photoUrl = detail?.photo?.url ?? detail?.photoUrl ?? row?.photoUrl ?? null;
    return merged;
  }, [detail, row]);

  // Open the booking sheet once the profile and the sitting are known. The
  // params are dropped first, so a reload or Back does not open it again.
  useEffect(() => {
    if (!resumeRef.current || !d || !daysReady || authStatus === 'loading') return;
    resumeRef.current = null;
    navigate(location.pathname, { replace: true, state: location.state });
    if (isAuthed) setBooking({ ...d, doctorId, queue: row?.queue ?? {} });
  }, [d, daysReady, authStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  const demo = useMemo(
    () => (d && demoProfilesEnabled() ? demoProfileFor(d, doctorId) : null),
    [d, doctorId],
  );

  // Search and link previews: "Dr. Ananya Roy, Cardiology in Kolkata". Built
  // from the real record only — demo-mode filler never reaches structured data.
  const seoH = d?.hospital;
  const seoCity = seoH?.city;
  const seoAddr = seoH?.address ?? {};
  useSeo({
    title: d ? `${d.name}${d.specialty ? `, ${d.specialty}` : ''}${seoCity ? ` in ${seoCity}` : ''} — Book OPD Token` : 'Doctor profile',
    description: d
      ? `Book an OPD token with ${d.name}${d.specialty ? ` (${d.specialty})` : ''}${seoH?.name ? ` at ${seoH.name}` : ''}${seoCity ? `, ${seoCity}` : ''}.${d.fees?.fresh != null ? ` Consultation fee ${inr(d.fees.fresh)}.` : ''} See OPD timings, reviews and the live queue on Mediigo.`
      : undefined,
    path: `/p/doctors/${doctorId}`,
    image: d?.photoUrl || undefined,
    type: 'profile',
    jsonLd: d ? [
      {
        '@context': 'https://schema.org',
        '@type': 'Physician',
        name: d.name,
        url: `${SITE.url}/p/doctors/${doctorId}`,
        ...(d.photoUrl ? { image: d.photoUrl } : {}),
        ...(d.specialty ? { medicalSpecialty: d.specialty } : {}),
        ...(list(d.qualifications).length ? { hasCredential: list(d.qualifications).map((q) => ({ '@type': 'EducationalOccupationalCredential', name: q })) } : {}),
        ...(seoH?.name ? {
          hospitalAffiliation: { '@type': 'MedicalClinic', name: seoH.name },
          address: {
            '@type': 'PostalAddress',
            streetAddress: [seoAddr.line1, seoAddr.line2].filter(Boolean).join(', '),
            addressLocality: seoCity || seoAddr.city,
            addressRegion: seoAddr.state,
            postalCode: seoAddr.pincode,
            addressCountry: 'IN',
          },
        } : {}),
        ...(seoH?.coordinates ? { geo: { '@type': 'GeoCoordinates', latitude: seoH.coordinates.lat, longitude: seoH.coordinates.lng } } : {}),
        ...(d.rating?.count > 0 ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: Number(d.rating.average).toFixed(1), reviewCount: d.rating.count, bestRating: 5 } } : {}),
        ...(d.fees?.fresh != null ? { priceRange: `₹${d.fees.fresh}` } : {}),
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Doctors', item: `${SITE.url}/p/explore` },
          ...(d.specialty ? [{ '@type': 'ListItem', position: 2, name: d.specialty, item: `${SITE.url}/p/explore` }] : []),
          { '@type': 'ListItem', position: d.specialty ? 3 : 2, name: d.name, item: `${SITE.url}/p/doctors/${doctorId}` },
        ],
      },
    ] : undefined,
  });

  // Other doctors of the same specialty around this clinic — a dead end for a
  // patient who finds this doctor fully booked otherwise.
  const coordKey = d?.hospital?.coordinates ? `${d.hospital.coordinates.lat},${d.hospital.coordinates.lng}` : '';
  useEffect(() => {
    if (!coordKey || !d?.specialty) return undefined;
    let alive = true;
    const [lat, lng] = coordKey.split(',');
    const params = new URLSearchParams({ lat, lng, radiusKm: 25, specialty: d.specialty });
    api.get(`/api/doctors/nearby?${params}`)
      .then((res) => {
        if (alive) setOthers((res.data?.data ?? []).filter((x) => x.doctorId !== doctorId).slice(0, 6));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [coordKey, d?.specialty, doctorId]);

  if (!d && loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-48" />
        <div className="grid md:grid-cols-[minmax(0,1fr)_300px] lg:grid-cols-[minmax(0,1fr)_340px] gap-5 lg:gap-8">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!d) {
    return (
      <EmptyState
        icon="user"
        title={error?.status === 404 ? 'Doctor not found' : 'Could not load this profile'}
        hint={error?.status === 404 ? 'This profile may have been removed.' : error?.message}
        action="Back to doctors"
        onAction={() => navigate('/p/explore')}
      />
    );
  }

  // Real data first; sample content only fills gaps, and only in demo mode.
  let usedDemo = false;
  const pick = (real, key) => {
    const r = list(real);
    if (r.length || !demo) return r;
    const fallback = list(demo[key]);
    if (fallback.length) usedDemo = true;
    return fallback;
  };

  const { hospital } = d;
  let years = yearsOf(d);
  if (years == null && demo) { years = demo.experienceYears; usedDemo = true; }
  const qualifications = list(d.qualifications);
  const languages = list(d.languages);
  const conditions = pick(d.conditionsTreated ?? d.conditions, 'conditionsTreated');
  const procedures = pick(d.proceduresPerformed ?? d.procedures, 'proceduresPerformed');
  const education = pick(d.education, 'education');
  const memberships = pick(d.memberships, 'memberships');
  const trainings = pick(d.trainings ?? d.certifications, 'trainings');
  const awards = pick(d.awards, 'awards');
  const publications = pick(d.publications, 'publications');
  const videos = Array.isArray(d.videos) ? d.videos.filter((v) => v?.url) : [];
  // Real clinic photos from the hospital record; sample ones only in demo mode.
  let clinicPhotos = Array.isArray(hospital.photos) ? hospital.photos.filter((p) => p?.url) : [];
  if (!clinicPhotos.length && demo?.clinicPhotos?.length) { clinicPhotos = demo.clinicPhotos; usedDemo = true; }
  const registration = d.registration
    ? [d.registration.council, d.registration.number, d.registration.year].filter(Boolean).join(' ')
    : d.councilRegNo || d.regNo || '';

  let reviewData = reviews?.items?.length ? reviews : null;
  if (!reviewData && demo) { reviewData = demo.reviews; usedDemo = true; }
  const reviewItems = reviewData?.items ?? [];
  const reviewCount = reviewData?.summary?.count ?? reviewItems.length;
  const average = reviewData?.summary?.average;
  const recommendPct = reviewData?.summary?.recommendPct
    ?? (reviewItems.length ? Math.round((reviewItems.filter((r) => r.rating >= 4).length / reviewItems.length) * 100) : null);

  const schedule = (d.schedule || []).filter((s) => s.isActive !== false);
  const weekly = [1, 2, 3, 4, 5, 6, 0].map((day) => ({
    day,
    shifts: schedule.filter((s) => s.day === day).sort((a, b) => (SHIFT_ORDER[a.shift] ?? 9) - (SHIFT_ORDER[b.shift] ?? 9)),
  }));

  const anyBookableDay = days.some((x) => x.shifts.some((sh) => sh.isBookable));
  const bookable = days.length ? anyBookableDay : d.session?.isBookingOpen !== false;
  const fees = d.fees || {};
  const queue = row?.queue;
  const selectedDay = days.find((x) => x.date === slot?.date);
  // The stored rating covers every approved review; the reviews call may be
  // paged or fail, so it is only preferred when it actually answered.
  const rating = reviews?.summary?.count
    ? { average: reviews.summary.average, count: reviews.summary.count }
    : { average: d.rating?.average ?? 0, count: d.rating?.count ?? 0 };
  // Next sitting with room: the live row says it directly; otherwise the
  // 7-day calendar's first bookable shift.
  const firstOpenDay = days.find((x) => x.shifts.some((sh) => sh.isBookable));
  const firstOpenShift = firstOpenDay?.shifts.find((sh) => sh.isBookable);
  const nextText = nextAvailableText(row?.nextAvailable, d.session)
    ?? (firstOpenShift ? `${relativeDay(firstOpenDay.date)} · ${t12(firstOpenShift.startTime)}` : null);
  const education0 = education.length ? education.map(line) : qualifications;
  const where = [hospital.locality, hospital.city].filter(Boolean).join(', ');

  const directions = hospital.coordinates
    ? directionsUrl(hospital.coordinates)
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([hospital.name, hospital.fullAddress].filter(Boolean).join(', '))}`;

  // About, in the same factual bullets Apollo uses, built from the record.
  const aboutBullets = [
    `${d.name} is a ${d.specialty || 'doctor'}${hospital.name ? ` at ${hospital.name}` : ''}${hospital.city ? ` in ${hospital.city}` : ''}.${qualifications.length ? ` Holding ${qualifications.join(', ')},` : ''}${conditions.length ? ` ${d.name} diagnoses and treats a wide range of ${d.specialty || ''} conditions, including ${conditions.slice(0, 5).map(line).join(', ')}, and more.` : ''}`,
    (years != null || languages.length) && `${d.name}${years != null ? ` has over ${years} years of experience` : ''}${years != null && languages.length ? ' and' : ''}${languages.length ? ` is fluent in ${languages.join(', ')}` : ''}.`,
    reviewCount > 0 && recommendPct != null && `Recommended by ${reviewCount} patients, ${d.name} holds a recommendation score of ${recommendPct}%.`,
    registration && `Registered with the medical council under registration number ${registration}.`,
  ].filter(Boolean);

  const tabs = [
    clinicPhotos.length && ['clinic-photos', 'Clinic Photos'],
    videos.length && ['stories', 'Doctor Stories'],
    reviewItems.length && ['reviews', 'Patient Reviews'],
    ['timings', 'Timings & Fees'],
    (conditions.length || procedures.length) && ['conditions', 'Conditions & Procedures'],
    (education.length || qualifications.length) && ['education', 'Education & Work Experience'],
    (memberships.length || registration) && ['memberships', 'Memberships & Registration'],
    (trainings.length || awards.length) && ['certifications', 'Certifications & Awards'],
    publications.length && ['publications', 'Publications & Articles'],
  ].filter(Boolean);
  tabIdsRef.current = tabs.map(([id]) => id);

  const faqs = [
    hospital.name && [`Where does ${d.name} practise?`, `${d.name} consults at ${hospital.name}${hospital.fullAddress ? `, ${hospital.fullAddress}` : ''}.`],
    [`How can I book an appointment with ${d.name}?`, 'Choose a date and sitting in the booking card on this page and tap Book Token. You get a digital token and can follow the live queue, so you only need to arrive when your turn is close.'],
    reviewCount > 0 && average != null && [`What do patients say about ${d.name}?`, `${d.name} has an average rating of ${Number(average).toFixed(1)} out of 5 from ${reviewCount} patient reviews${recommendPct != null ? `, and ${recommendPct}% of patients recommend them` : ''}.`],
    (qualifications.length || education.length) && [`What is ${d.name}'s educational qualification?`, (qualifications.length ? qualifications : education.map(line)).join(', ')],
    years != null && [`How many years of experience does ${d.name} have?`, `${d.name} has ${years}+ years of experience as a ${d.specialty || 'doctor'}.`],
    d.specialty && [`What is ${d.name}'s medical specialty?`, `${d.name} is a ${d.specialty}.`],
    conditions.length && [`What conditions does ${d.name} treat?`, `${d.name} treats ${conditions.slice(0, 8).map(line).join(', ')}${conditions.length > 8 ? ', and more' : ''}.`],
    fees.fresh != null && [`What is the consultation fee for ${d.name}?`, `A new consultation is ${inr(fees.fresh)}${fees.followup != null ? `, a follow-up ${inr(fees.followup)}${d.followupWindowDays ? ` (within ${d.followupWindowDays} days)` : ''}` : ''}${fees.emergency != null ? `, and an emergency visit ${inr(fees.emergency)}` : ''}. Fees are paid at the clinic's front desk.`],
    schedule.length > 0 && [`What are ${d.name}'s OPD timings?`, weekly.filter((w) => w.shifts.length).map((w) => `${DAY_LABEL[w.day]} ${w.shifts.map((s) => `${t12(s.startTime)}–${t12(s.endTime)}`).join(', ')}`).join('; ')],
    languages.length && [`Which languages does ${d.name} speak?`, languages.join(', ')],
  ].filter(Boolean);

  const onBook = () => {
    if (!isAuthed) {
      toast.push('Sign in to book a token');
      const picked = slot ? `&date=${slot.date}&shift=${slot.shift}` : '';
      navigate('/login', { state: { from: `${location.pathname}?book=1${picked}` } });
      return;
    }
    // BookingSheet expects the shape /api/doctors/nearby returns.
    setBooking({ ...d, doctorId, queue: queue ?? {} });
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: d.name, text: `${d.name} · ${d.specialty}`, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success('Profile link copied');
      }
    } catch { /* the user closed the share sheet */ }
  };

  const jump = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offsetRef.current + 2, behavior: 'smooth' });
  };
  const slotText = selectedDay && slot?.shift
    ? `${selectedDay.isToday ? 'Today' : relativeDay(selectedDay.date)} · ${SHIFT_LABEL[slot.shift] || slot.shift}`
    : nextText;

  return (
    <div className="text-slate-900">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs sm:text-sm text-mg-teal mb-4 sm:mb-6 overflow-x-auto no-scrollbar whitespace-nowrap">
        <Link to="/p/explore" className="hover:underline">Home</Link>
        <Icon name="chevronRight" className="w-3 h-3 text-slate-700" strokeWidth={3} />
        <Link to="/p/explore" className="hover:underline">Doctors</Link>
        {d.specialty && (
          <>
            <Icon name="chevronRight" className="w-3 h-3 text-slate-700" strokeWidth={3} />
            <span>{d.specialty}</span>
          </>
        )}
        {hospital.city && (
          <>
            <Icon name="chevronRight" className="w-3 h-3 text-slate-700" strokeWidth={3} />
            <span>{hospital.city}</span>
          </>
        )}
      </nav>

      <div className="grid gap-5 md:gap-6 lg:gap-8 grid-cols-[minmax(0,1fr)] md:grid-cols-[minmax(0,1fr)_300px] lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* ── Header card ─────────────────────────────────────────────── */}
        {/* Phone first: who they are on top, then the facts a patient compares
            doctors on — fee, rating, experience, registration — as a grid that
            reads at a glance, then where they sit. */}
        <div className="md:col-start-1 md:row-start-1 min-w-0 rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="relative p-4 sm:p-6 md:p-4 lg:p-6 bg-gradient-to-br from-mg-surface via-white to-white">
            <button
              type="button"
              onClick={share}
              aria-label="Share this profile"
              className="absolute top-3 right-3 sm:top-4 sm:right-4 w-10 h-10 grid place-items-center rounded-full bg-white border border-slate-200 text-slate-700 hover:border-mg-teal hover:text-mg-teal transition"
            >
              <Icon name="share" className="w-5 h-5" strokeWidth={1.75} />
            </button>

            <div className="flex items-start gap-4 sm:gap-6">
              <div className="relative shrink-0">
                <PhotoOrFallback
                  src={d.photoUrl}
                  alt={d.name}
                  className="w-20 h-20 sm:w-32 sm:h-32 md:w-24 md:h-24 lg:w-36 lg:h-36 rounded-xl object-cover bg-slate-50 ring-4 ring-white shadow-md"
                  fallback={(
                    <div aria-hidden="true" className="w-20 h-20 sm:w-32 sm:h-32 md:w-24 md:h-24 lg:w-36 lg:h-36 rounded-xl bg-teal-50 text-teal-700 grid place-items-center text-2xl sm:text-4xl md:text-3xl lg:text-4xl font-bold ring-4 ring-white shadow-md">
                      {initialsOf(d.name)}
                    </div>
                  )}
                />
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-white border border-mg-teal/30 px-2 py-0.5 text-[10px] font-semibold text-mg-teal shadow-sm">
                  <Icon name="shieldCheck" className="w-3 h-3" /> Verified
                </span>
              </div>

              <div className="min-w-0 flex-1 pr-10 sm:pr-12">
                <h1 className="text-xl sm:text-3xl md:text-2xl lg:text-3xl leading-tight font-bold break-words">{d.name}</h1>
                {d.specialty && <p className="mt-1 text-sm sm:text-lg md:text-base lg:text-lg font-semibold text-mg-teal">{d.specialty}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <RatingBadge rating={rating} size="lg" />
                  {recommendPct != null && (
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600">
                      <Icon name="thumbUp" className="w-4 h-4" /> {recommendPct}%
                    </span>
                  )}
                </div>
              </div>
            </div>

            {d.specialtyDescription && (
              <p className="mt-5 text-sm text-slate-600 leading-relaxed">
                <span className="font-semibold text-slate-800">{d.specialty}: </span>
                {d.specialtyDescription}
              </p>
            )}
          </div>

          {/* gap-px over a tinted grid draws the hairlines in both layouts. */}
          <dl className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-2 lg:grid-cols-4 gap-px bg-slate-100 border-y border-slate-100 [&>div]:bg-white [&>div]:p-3.5 sm:[&>div]:p-4">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Consultation</dt>
              <dd className="mt-1 text-lg font-bold text-mg-navy">{fees.fresh != null ? inr(fees.fresh) : '—'}</dd>
              {fees.followup != null && <dd className="text-[11px] text-slate-500">Follow-up {inr(fees.followup)}</dd>}
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Experience</dt>
              <dd className="mt-1 text-lg font-bold text-slate-900">{years != null ? `${years}+ yrs` : '—'}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Reg. number</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900 break-words">{registration || '—'}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Patients rated</dt>
              <dd className="mt-1 text-lg font-bold text-slate-900">{rating.count || '—'}</dd>
            </div>
          </dl>

          <div className="p-4 sm:p-6 md:p-4 lg:p-6 space-y-3">
            {education0.length > 0 && (
              <div className="flex items-start gap-3">
                <span className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 grid place-items-center shrink-0">
                  <Icon name="academic" className="w-5 h-5" strokeWidth={1.5} />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Education</p>
                  <p className="text-sm text-slate-800 leading-snug">{education0.slice(0, 3).join(' · ')}</p>
                </div>
              </div>
            )}
            {languages.length > 0 && (
              <div className="flex items-start gap-3">
                <span className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 grid place-items-center shrink-0">
                  <Icon name="chat" className="w-5 h-5" strokeWidth={1.5} />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Speaks</p>
                  <p className="text-sm text-slate-800">{languages.join(', ')}</p>
                </div>
              </div>
            )}

            {/* Live today: who is in the chamber, and when this doctor next has room. */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="rounded-xl bg-mg-surface px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Now serving</p>
                <p className="mt-0.5 text-sm font-semibold text-mg-navy">
                  {d.session?.isOnBreak ? 'On a break' : queue?.currentToken ? token(queue.currentToken) : d.session?.isBookingOpen ? 'Not started' : 'OPD closed'}
                </p>
              </div>
              <div className="rounded-xl bg-teal-50 px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-mg-teal/80">Next available</p>
                <p className="mt-0.5 text-sm font-semibold text-mg-tealDark truncate">{nextText ?? 'No sittings this week'}</p>
              </div>
            </div>

            {hospital.name && (
              <div className="rounded-xl border border-slate-200 p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <p className="flex items-center gap-1.5 text-sm font-semibold min-w-0">
                    <Icon name="building" className="w-4 h-4 text-mg-teal shrink-0" strokeWidth={1.75} />
                    <span className="truncate">{hospital.name}</span>
                  </p>
                  {hospital.distanceKm != null && (
                    <span className="text-xs font-semibold text-slate-600 shrink-0 px-2 py-0.5 rounded-full bg-slate-100">
                      {Number(hospital.distanceKm).toFixed(1).replace(/\.0$/, '')} km
                    </span>
                  )}
                </div>
                {hospital.fullAddress && <p className="mt-1 text-xs text-slate-600 leading-snug line-clamp-2">{hospital.fullAddress}</p>}
                <div className={clsx('mt-3 grid gap-2', hospital.phone ? 'grid-cols-2' : 'grid-cols-1')}>
                  <a
                    href={directions}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-10 inline-flex items-center justify-center gap-1.5 rounded-lg border border-mg-teal/40 text-sm font-semibold text-mg-tealDark hover:bg-mg-teal hover:text-white transition"
                  >
                    <Icon name="navigate" className="w-4 h-4 rotate-45" /> Directions
                  </a>
                  {hospital.phone && (
                    <a
                      href={`tel:${hospital.phone}`}
                      className="h-10 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:border-mg-teal transition"
                    >
                      <Icon name="phone" className="w-4 h-4 text-mg-teal" /> Call
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Booking card ─────────────────────────────────────────────── */}
        <aside className="min-w-0 md:col-start-2 md:row-start-1 md:row-span-2">
          <div className="md:sticky space-y-5" style={{ top: headerH + 16 }}>
            <div id="book" ref={bookingRef} className="rounded-xl border border-slate-200 bg-white p-4 lg:p-5 shadow-[0_1px_4px_rgba(15,23,42,0.04)]">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-semibold">Book a clinic visit</h2>
                {fees.fresh != null && <span className="text-xl font-bold">{inr(fees.fresh)}</span>}
              </div>

              {queue && (
                <div className="mt-3 rounded-lg bg-mg-surface px-3 py-2 text-xs text-slate-700 flex items-center justify-between gap-2">
                  {d.session?.isOnBreak ? (
                    <span className="text-amber-700 font-medium">Queue paused — doctor is on a break</span>
                  ) : (
                    <>
                      <span>{queue.currentToken ? <>Now serving <strong className="text-mg-navy">{token(queue.currentToken)}</strong></> : 'Nobody called yet'}</span>
                      <span>{queue.waiting} waiting{queue.estimatedWaitMinutes ? ` · ~${queue.estimatedWaitMinutes} min` : ''}</span>
                    </>
                  )}
                </div>
              )}

              {/* Without a schedule, booking is same-day — a date strip would be a lie. */}
              {days.length > 0 ? (
                <>
                  <div className="mt-4 flex items-center gap-1">
                    <button type="button" aria-label="Earlier dates" onClick={() => stripRef.current?.scrollBy({ left: -160, behavior: 'smooth' })} className="hidden sm:grid shrink-0 w-8 h-8 place-items-center rounded-full text-slate-700 hover:bg-mg-surface hover:text-mg-teal">
                      <Icon name="chevronLeft" className="w-5 h-5" />
                    </button>
                    <div ref={stripRef} className="flex-1 min-w-0 flex gap-1.5 overflow-x-auto no-scrollbar py-0.5 snap-x snap-mandatory">
                      {days.map((x) => {
                        const open = x.shifts.some((sh) => sh.isBookable);
                        const active = slot?.date === x.date;
                        return (
                          <button
                            key={x.date}
                            type="button"
                            disabled={!open}
                            onClick={() => setSlot({ date: x.date, shift: x.shifts.find((sh) => sh.isBookable)?.shift })}
                            className={clsx(
                              'shrink-0 snap-start w-[54px] py-2 rounded-lg border text-center transition',
                              active ? 'border-mg-teal bg-mg-teal/10'
                                : open ? 'border-slate-200 hover:border-mg-teal/50'
                                  : 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed',
                            )}
                          >
                            <span className={clsx('block text-xs', active ? 'text-mg-teal font-semibold' : 'text-slate-700')}>
                              {x.isToday ? 'Today' : DAY_LABEL[x.dayOfWeek]}
                            </span>
                            <span className={clsx('block text-xl font-semibold', active ? 'text-mg-teal' : 'text-slate-800')}>
                              {Number(x.date.slice(8, 10))}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <button type="button" aria-label="Later dates" onClick={() => stripRef.current?.scrollBy({ left: 160, behavior: 'smooth' })} className="hidden sm:grid shrink-0 w-8 h-8 place-items-center rounded-full text-slate-700 hover:bg-mg-surface hover:text-mg-teal">
                      <Icon name="chevronRight" className="w-5 h-5" />
                    </button>
                  </div>

                  {selectedDay && (
                    selectedDay.shifts.length ? (
                      <div className="mt-4 grid grid-cols-2 md:grid-cols-1 lg:grid-cols-2 gap-2">
                        {selectedDay.shifts.map((sh) => {
                          const active = slot?.shift === sh.shift && sh.isBookable;
                          return (
                            <button
                              key={sh.shift}
                              type="button"
                              disabled={!sh.isBookable}
                              onClick={() => setSlot({ date: selectedDay.date, shift: sh.shift })}
                              className={clsx(
                                'p-3 rounded-lg border text-left transition',
                                active ? 'border-mg-teal bg-mg-teal/10'
                                  : sh.isBookable ? 'border-slate-200 hover:border-mg-teal/50'
                                    : 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed',
                              )}
                            >
                              <span className={clsx('block text-sm sm:text-[15px] font-semibold', active ? 'text-mg-teal' : 'text-slate-800')}>
                                {SHIFT_LABEL[sh.shift] || sh.shift}
                              </span>
                              <span className="block text-xs text-slate-600 mt-0.5">{t12(sh.startTime)} – {t12(sh.endTime)}</span>
                              <span className="block text-[11px] mt-1">
                                {sh.endedToday ? <span className="text-slate-400">Ended for today</span>
                                  : sh.isFull ? <span className="text-amber-600 font-semibold">Fully booked</span>
                                    : sh.remaining != null ? <span className="text-mg-teal font-semibold">{sh.remaining} tokens left</span>
                                      : <span className="text-emerald-600">Tokens available</span>}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-slate-500 italic">{selectedDay.closureReason || 'No OPD this day'}</p>
                    )
                  )}
                </>
              ) : (
                <p className="mt-4 text-sm text-slate-500">
                  {bookable ? 'Book a token for today’s OPD.' : 'Bookings are closed right now.'}
                </p>
              )}

              <button
                type="button"
                onClick={onBook}
                disabled={!bookable}
                className={clsx(
                  'mt-5 w-full h-12 rounded-lg text-base font-semibold transition',
                  bookable ? 'bg-mg-teal text-white hover:bg-mg-tealDark shadow-sm shadow-mg-teal/30' : 'bg-slate-200 text-slate-500 cursor-not-allowed',
                )}
              >
                {bookable ? 'Book Token' : 'Bookings closed'}
              </button>
              <p className="mt-2 text-center text-[11px] text-slate-500">Pay at the clinic · No booking charges</p>
            </div>

          </div>
        </aside>

        {/* ── Profile body ─────────────────────────────────────────────── */}
        <div className="md:col-start-1 md:row-start-2 min-w-0">
          <section>
            <h2 className="text-xl sm:text-3xl md:text-2xl lg:text-3xl leading-tight font-bold">About {d.name}</h2>
            <div className="relative mt-4 bg-mg-surface rounded-xl px-4 py-3">
              <div className={clsx('overflow-hidden', !aboutOpen && 'max-h-[13rem]')}>
                <ul className="list-disc pl-5 space-y-1.5 text-sm sm:text-base text-slate-800 leading-relaxed marker:text-slate-400">
                  {aboutBullets.map((b) => <li key={b}>{b}</li>)}
                  {fees.fresh != null && (
                    <li>
                      Book a token with {d.name} on Mediigo today. Fees for consultation:
                      <ul className="list-[circle] pl-6 mt-0.5 space-y-0.5">
                        <li>New consultation: {inr(fees.fresh)}</li>
                        {fees.followup != null && <li>Follow-up{d.followupWindowDays ? ` (within ${d.followupWindowDays} days)` : ''}: {inr(fees.followup)}</li>}
                        {fees.emergency != null && <li>Emergency: {inr(fees.emergency)}</li>}
                      </ul>
                    </li>
                  )}
                </ul>
                {(d.about || d.bio) && (
                  <p className="mt-3 text-sm sm:text-[15px] text-slate-700 leading-relaxed whitespace-pre-line">{d.about || d.bio}</p>
                )}
              </div>
            </div>
            <button type="button" onClick={() => setAboutOpen((v) => !v)} className="mt-3 text-sm sm:text-base font-semibold text-mg-teal hover:underline">
              {aboutOpen ? 'Read Less' : 'Read More'}
            </button>
            {usedDemo && (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-dashed border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] text-amber-800">
                <Icon name="info" className="w-3.5 h-3.5" /> Demo mode: some details on this page are sample content.
              </p>
            )}
          </section>

          <ClinicGallery id="clinic-photos" clinicName={hospital.name} photos={clinicPhotos} />

          {/* Sticky under the portal header, so any section is one tap away while reading. */}
          <nav
            ref={tabsBarRef}
            aria-label="Profile sections"
            className="sticky z-20 mt-6 -mx-4 px-4 md:mx-0 md:px-0 bg-white/95 backdrop-blur border-y border-slate-200 md:border-t-0"
            style={{ top: headerH }}
          >
            <div ref={tabsStripRef} className="flex gap-2 overflow-x-auto no-scrollbar py-2.5">
              {tabs.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  data-tab={id}
                  onClick={() => jump(id)}
                  aria-current={activeTab === id ? 'true' : undefined}
                  className={clsx(
                    'shrink-0 h-9 px-3.5 rounded-full border text-[13px] sm:text-sm font-semibold transition whitespace-nowrap',
                    activeTab === id ? 'border-mg-teal bg-mg-teal text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-mg-teal hover:text-mg-teal',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </nav>

          <div className="mt-4 sm:mt-6">
            {videos.length > 0 && (
              <Section id="stories" title="Doctor Stories">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {videos.map((v) => (
                    <a key={v.url} href={v.url} target="_blank" rel="noopener noreferrer" className="group rounded-lg border border-slate-200 p-3 hover:shadow-md transition">
                      <div className="relative aspect-video bg-slate-100 rounded-md overflow-hidden">
                        {v.thumbnailUrl && <img src={v.thumbnailUrl} alt="" loading="lazy" className="w-full h-full object-cover" />}
                        <span className="absolute inset-0 grid place-items-center">
                          <span className="w-12 h-12 rounded-full bg-white/90 grid place-items-center shadow group-hover:scale-110 transition">
                            <svg viewBox="0 0 24 24" className="w-5 h-5 text-slate-800 ml-0.5" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
                          </span>
                        </span>
                      </div>
                      {v.title && <p className="mt-3 text-sm sm:text-[15px] font-medium line-clamp-2">{v.title}</p>}
                    </a>
                  ))}
                </div>
              </Section>
            )}

            {reviewItems.length > 0 && (
              <section id="reviews" className="py-6 sm:py-8 border-t border-slate-200 first:border-t-0 first:pt-2">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <h2 className="text-lg sm:text-2xl md:text-xl lg:text-2xl font-bold">Patient Reviews for {d.name}</h2>
                  {average != null && (
                    <p className="flex items-center gap-2 text-sm text-slate-600">
                      <span className="text-2xl font-bold text-slate-900">{Number(average).toFixed(1)}</span>
                      <Stars n={Math.round(average)} className="w-4 h-4" />
                      <span>({reviewCount})</span>
                    </p>
                  )}
                </div>
                <ul className="mt-4 divide-y divide-slate-200">
                  {(reviewsOpen ? reviewItems : reviewItems.slice(0, REVIEW_LIMIT)).map((r) => (
                    <li key={r.id ?? r._id} className="py-4 sm:py-5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2.5 text-sm sm:text-base text-slate-700 min-w-0">
                          <span className="w-7 h-7 rounded-full bg-slate-400 text-white grid place-items-center shrink-0">
                            <Icon name="user" className="w-4 h-4" />
                          </span>
                          <span className="truncate">{r.patientName || 'Verified patient'}</span>
                        </span>
                        <span className="text-sm sm:text-[15px] text-slate-500 shrink-0">{ago(r.createdAt)}</span>
                      </div>
                      {r.rating != null && <div className="mt-2.5"><Stars n={r.rating} /></div>}
                      {r.comment && <p className="mt-2 text-sm sm:text-[15px] text-slate-600 leading-relaxed">{r.comment}</p>}
                      {r.tag && <span className="mt-3 inline-block px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-sm font-semibold">{r.tag}</span>}
                    </li>
                  ))}
                </ul>
                {reviewItems.length > REVIEW_LIMIT && (
                  <button type="button" onClick={() => setReviewsOpen((v) => !v)} className="text-base font-semibold text-mg-teal hover:underline">
                    {reviewsOpen ? 'Show Less' : 'Show More'}
                  </button>
                )}
              </section>
            )}

            <Section id="timings" icon="clock" title="OPD Timings and Fees">
              <div className="grid gap-6 sm:gap-8 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold mb-3">{hospital.name || 'Clinic'}</h3>
                  {schedule.length ? (
                    <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm sm:text-[15px]">
                      {weekly.map((w) => (
                        <div key={w.day} className="flex items-start justify-between gap-4 px-3 sm:px-4 py-2.5">
                          <dt className="text-slate-700">{DAY_FULL[w.day]}</dt>
                          <dd className={clsx('text-right', w.shifts.length ? 'text-slate-900 font-medium' : 'text-slate-400')}>
                            {w.shifts.length
                              ? w.shifts.map((s) => <span key={s._id ?? s.shift} className="block">{t12(s.startTime)} – {t12(s.endTime)}</span>)
                              : 'Closed'}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="text-sm sm:text-[15px] text-slate-600">Same-day OPD. Book a token while bookings are open.</p>
                  )}
                  {/* What the clinic offers, as captured at onboarding. */}
                  {hospital.facilities?.length > 0 && (
                    <div className="mt-5">
                      <h4 className="text-sm font-semibold text-slate-900 mb-2">Clinic facilities</h4>
                      <ul className="flex flex-wrap gap-2">
                        {hospital.facilities.map((f) => (
                          <li key={f} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-50 border border-teal-100 text-xs text-teal-800">
                            <Icon name="check" className="w-3 h-3" strokeWidth={3} /> {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold mb-3">Consultation fees</h3>
                  <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm sm:text-[15px]">
                    {[
                      ['New consultation', fees.fresh],
                      [`Follow-up${d.followupWindowDays ? ` (${d.followupWindowDays} days)` : ''}`, fees.followup],
                      ['Emergency', fees.emergency],
                    ].filter(([, v]) => v != null).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between gap-4 px-3 sm:px-4 py-2.5">
                        <dt className="text-slate-700">{k}</dt>
                        <dd className="font-semibold">{inr(v)}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-2 text-xs text-slate-500">Paid at the clinic's front desk on arrival.</p>
                </div>
              </div>
            </Section>

            {(conditions.length > 0 || procedures.length > 0) && (
              <Section id="conditions" icon="heart" title="Conditions and Procedures">
                {conditions.length > 0 && (
                  <>
                    <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Top Conditions Treated</h3>
                    <Folding items={conditions} columns more="Read More" />
                  </>
                )}
                {procedures.length > 0 && (
                  <div className={conditions.length ? 'mt-8' : ''}>
                    <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Top Procedures Performed</h3>
                    <Folding items={procedures} columns more="Read More" />
                  </div>
                )}
              </Section>
            )}

            {(education.length > 0 || qualifications.length > 0) && (
              <Section id="education" icon="academic" title="Education & Work Experience">
                <ul className="space-y-4 text-sm sm:text-[15px] text-slate-700">
                  {(education.length ? education : [qualifications.join(', ')]).map((e, i) => (
                    <li key={i} className="leading-snug">{line(e)}</li>
                  ))}
                  {hospital.name && (
                    <li className="leading-snug">
                      <span className="font-medium text-slate-900">Consultant {d.specialty}</span> — {hospital.name}{where ? `, ${where}` : ''} (Present)
                    </li>
                  )}
                </ul>
              </Section>
            )}

            <Pair
              id="memberships"
              cells={[
                { icon: 'users', title: 'Memberships', items: memberships },
                { icon: 'shieldCheck', title: 'Registration', items: registration ? [registration] : [] },
              ]}
            />

            <Pair
              id="certifications"
              cells={[
                { icon: 'doc', title: 'Trainings and Certifications', items: trainings },
                { icon: 'trophy', title: 'Awards and Recognitions', items: awards },
              ]}
            />

            {publications.length > 0 && (
              <Section id="publications" icon="book" title="Publications">
                <ol className="space-y-4 text-sm sm:text-[15px] text-slate-700">
                  {publications.slice(0, LIST_LIMIT).map((p, i) => (
                    <li key={i} className="leading-snug">{i + 1}. {line(p)}</li>
                  ))}
                </ol>
              </Section>
            )}
          </div>
        </div>
      </div>

      <section className="mt-8 pt-8 sm:mt-10 sm:pt-10 border-t-8 border-slate-100 -mx-4 px-4 sm:mx-0 sm:px-0">
        <h2 className="text-xl sm:text-2xl font-semibold">FAQs</h2>
        <div className="mt-4">
          {faqs.map(([q, a]) => <Faq key={q} q={q} a={a} />)}
        </div>
      </section>

      {others.length > 0 && (
        <section className="mt-10 sm:mt-12">
          <h2 className="text-lg sm:text-xl font-semibold">
            More {d.specialty ? `${d.specialty} doctors` : 'doctors'}{hospital.city ? ` in ${hospital.city}` : ' nearby'}
          </h2>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {others.map((o) => (
              <Link
                key={o.doctorId}
                to={`/p/doctors/${o.doctorId}`}
                state={{ doctor: o }}
                className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 hover:border-mg-teal hover:shadow-sm transition"
              >
                <PhotoOrFallback
                  src={o.photoUrl}
                  className="w-14 h-14 rounded-full object-cover shrink-0"
                  fallback={(
                    <span className="w-14 h-14 rounded-full bg-teal-50 text-teal-700 grid place-items-center font-bold shrink-0">
                      {initialsOf(o.name)}
                    </span>
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold truncate">{o.name}</span>
                  <span className="block text-xs text-mg-teal truncate">{o.specialty} · {(o.qualifications || []).join(', ')}</span>
                  <span className="block text-xs text-slate-500 truncate">{o.hospital?.name}</span>
                </span>
                <span className="text-sm font-bold text-mg-navy shrink-0">{inr(o.fees?.fresh)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Phones: the booking action stays one tap away above the bottom dock,
          and steps aside while the full booking card is on screen. */}
      <div
        className={clsx(
          'md:hidden fixed inset-x-0 bottom-16 z-30 border-t border-slate-200 bg-white/95 backdrop-blur px-4 py-2.5 shadow-[0_-4px_12px_rgba(15,23,42,0.06)] transition duration-200',
          bookingInView || booking ? 'translate-y-4 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100',
        )}
        aria-hidden={bookingInView || Boolean(booking)}
      >
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => document.getElementById('book')?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="min-w-0 flex-1 text-left">
            <span className="block text-base font-bold leading-tight">{fees.fresh != null ? inr(fees.fresh) : 'Book a token'}</span>
            <span className="block text-[11px] text-slate-500 truncate">
              {bookable ? (slotText ? `${slotText} · change` : 'Pick a date and sitting') : 'Bookings closed'}
            </span>
          </button>
          <button
            type="button"
            onClick={onBook}
            disabled={!bookable}
            tabIndex={bookingInView ? -1 : 0}
            className={clsx(
              'shrink-0 h-11 px-5 rounded-lg text-sm font-semibold transition',
              bookable ? 'bg-mg-teal text-white hover:bg-mg-tealDark shadow-sm shadow-mg-teal/30' : 'bg-slate-200 text-slate-500',
            )}
          >
            {bookable ? 'Book Token' : 'Closed'}
          </button>
        </div>
      </div>
      <div className="h-16 md:hidden" aria-hidden="true" />

      <BookingSheet doctor={booking} initialSlot={slot} onClose={() => setBooking(null)} />
    </div>
  );
}
