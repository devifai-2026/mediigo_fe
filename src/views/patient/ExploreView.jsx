import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, unwrap } from '../../lib/api.js';
import { useGeolocation } from '../../hooks/useGeolocation.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { DoctorCard } from '../../components/patient/DoctorCard.jsx';
import { BookingSheet } from '../../components/patient/BookingSheet.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { SkeletonCard } from '../../components/ui/Skeleton.jsx';
import { SPECIALTIES } from '../../lib/constants.js';
import clsx from 'clsx';

// Tiles for the "Browse by Specialities" grid. `value` is what the API
// filters on; the label is what the design shows.
const CATEGORIES = [
  { label: 'All Clinics', value: '', img: '/categories/AllClinics.png' },
  { label: 'General\nMedicine', value: 'General Medicine', img: '/categories/GeneralMedicine.png' },
  { label: 'Pediatrics', value: 'Pediatrics', img: '/categories/Pediatrics.png' },
  { label: 'Cardiology', value: 'Cardiology', img: '/categories/Group%2023.png' },
  { label: 'Orthopedics', value: 'Orthopedics', img: '/categories/Orthopedics.png' },
  { label: 'Dermatology', value: 'Dermatology', img: '/categories/Dermatology.png' },
  { label: 'Ear\nThroat\nNose', value: 'ENT', img: '/categories/EarThroatNose.png' },
  { label: 'Gynaecology', value: 'Gynecology', img: '/categories/Gynaecology.png' },
  { label: 'Dentistry', value: 'Dentistry', img: '/categories/Dentistry.png' },
];

export default function ExploreView() {
  const { isAuthed, user } = useAuth();
  // A location saved on the profile beats the city centre and survives a new
  // device, so seed from it before asking the browser again.
  const saved = user?.lastKnownLocation?.coordinates
    ? {
        lat: user.lastKnownLocation.coordinates[1],
        lng: user.lastKnownLocation.coordinates[0],
        label: user.lastKnownLocation.label || 'Your location',
      }
    : null;
  const { coords, locate, locateOnce, status: geoStatus, accuracy, isFallback } = useGeolocation({ initial: saved });
  const toast = useToast();
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [specialty, setSpecialty] = useState('');
  const [search, setSearch] = useState('');
  const [radius, setRadius] = useState(15);
  const [booking, setBooking] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Specialties come from the network, not a constant: the hardcoded list held
  // eight while only four had doctors, so half the dropdown returned nothing
  // and read as a broken filter. Falls back to the constant if the call fails,
  // so the filter is never empty.
  const [specialties, setSpecialties] = useState(SPECIALTIES);
  const listRef = useRef(null);
  const filtersRef = useRef(null);
  const specialtyRef = useRef(null);

  useEffect(() => {
    let alive = true;
    api.get('/api/doctors/specialties')
      .then((res) => { if (alive && res.data?.data?.length) setSpecialties(res.data.data); })
      .catch(() => { /* keep the fallback list */ });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!filtersOpen) return undefined;
    const onClickAway = (e) => { if (filtersRef.current && !filtersRef.current.contains(e.target)) setFiltersOpen(false); };
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, [filtersOpen]);

  const load = useCallback(async (c = coords) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ lng: c.lng, lat: c.lat, radiusKm: radius });
      if (specialty) params.set('specialty', specialty);
      if (search.trim()) params.set('search', search.trim());
      const res = await api.get(`/api/doctors/nearby?${params}`);
      const found = res.data.data || [];
      setRows(found);
      setMeta(res.data.meta);

      // An empty list is the one result that needs explaining: say which filter
      // to relax rather than leaving a blank page. Only for a deliberate
      // search or filter — an empty first load is just "nothing nearby", which
      // the empty state already covers.
      if (!found.length && (search.trim() || specialty)) {
        const bits = [];
        if (search.trim()) bits.push(`"${search.trim()}"`);
        if (specialty) bits.push(specialty);
        toast.warn(`No doctors match ${bits.join(' in ')} within ${radius} km — try a wider radius or clear the filters.`);
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [coords, radius, specialty, search, toast]);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [specialty, radius]);

  // Debounced live search: the list updates as you type rather than only on
  // Enter. 350ms matches the address autocomplete, and the first render is
  // skipped so this does not duplicate the mount load above.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return undefined; }
    const id = setTimeout(() => load(), 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  /** Remember where they are, so the next visit does not start from scratch. */
  const persist = useCallback(async (c) => {
    if (!isAuthed || !c?.lat) return;
    try {
      await api.patch('/api/patients/me/location', { lat: c.lat, lng: c.lng, accuracy });
    } catch {
      // Not worth interrupting a search over — the location still works today.
    }
  }, [isAuthed, accuracy]);

  // Ask once, on the first Explore visit. Until they answer, every distance on
  // screen is measured from the city centre rather than from them.
  useEffect(() => {
    let alive = true;
    (async () => {
      const c = await locateOnce();
      if (!alive || !c) return;
      load(c);
      persist(c);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const useMyLocation = async () => {
    const c = await locate();
    if (geoStatus === 'denied') toast.warn('Location permission denied — showing Kolkata city centre');
    else persist(c);
    load(c);
  };

  const onBook = (doctor) => {
    if (!isAuthed) {
      toast.push('Sign in to book a token');
      navigate('/login', { state: { from: '/explore' } });
      return;
    }
    setBooking(doctor);
  };

  const pickSpecialty = (value) => {
    setSpecialty(value);
    listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-xl bg-gradient-to-r from-mg-blue via-[#2552A8] to-mg-mint text-white">
        <img
          src="/assets/herobanner.png"
          alt=""
          className="hidden md:block absolute right-0 bottom-0 w-[44%] max-w-[460px] pointer-events-none select-none"
        />
        <div className="relative px-6 py-8 sm:px-7 sm:py-10 md:w-[62%]">
          <p className="flex items-center gap-2 text-xs sm:text-sm">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Real time queue telemetry
          </p>
          <h2 className="mt-10 text-3xl sm:text-4xl font-semibold tracking-tight">Find &amp; Book Doctors Nearby</h2>
          <p className="mt-3 text-xs sm:text-sm text-white/90 max-w-lg leading-relaxed">
            Skip the crowded waiting room. Get a digital token, real-time wait estimates and a alert when your turn is close.
          </p>

          {/* Results update as you type; the button just skips the 350ms wait. */}
          <form
            onSubmit={(e) => { e.preventDefault(); load(); }}
            className="mt-10 bg-white rounded-md p-1 flex flex-col sm:flex-row sm:items-stretch text-slate-900 shadow-lg"
          >
            {/* The city is wherever we are measuring from; tapping it asks
                the browser for the patient's real position. */}
            <button
              type="button"
              onClick={useMyLocation}
              title="Use my location"
              className="sm:w-[30%] flex items-center gap-1.5 px-2 py-2 text-left text-[11px] min-w-0 border-b sm:border-b-0 sm:border-r border-slate-100"
            >
              <span className={clsx('truncate flex-1', isFallback ? 'text-slate-400' : 'text-slate-700')}>
                {geoStatus === 'locating' ? 'Locating…' : isFallback ? 'City' : (coords?.label || 'Your location')}
              </span>
              <Icon name="location" className="w-3.5 h-3.5 text-mg-teal shrink-0" />
            </button>
            <div className="sm:w-[35%] flex items-center px-2 min-w-0 border-b sm:border-b-0 sm:border-r border-slate-100">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Dr. Name or Clinic"
                aria-label="Doctor name or clinic"
                className="w-full py-2 text-[11px] bg-transparent focus:outline-none placeholder:text-slate-400"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600" aria-label="Clear search">
                  <Icon name="cross" className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="flex-1 flex items-center gap-1 pl-2 min-w-0">
              <select
                ref={specialtyRef}
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                aria-label="Speciality"
                /* appearance-none matters on macOS: without it Safari and Chrome
                   render their own dark native menu, which ignores these styles
                   and visibly breaks out of the search bar. The chevron beside
                   this select is the replacement affordance. */
                className={clsx(
                  'flex-1 min-w-0 py-2 pr-1 text-[11px] bg-transparent focus:outline-none cursor-pointer',
                  'appearance-none bg-none',
                  !specialty && 'text-slate-400',
                )}
              >
                <option value="">Speciality</option>
                {specialties.map((s) => <option key={s} value={s} className="text-slate-900">{s}</option>)}
              </select>
              {/* Replaces the native arrow that appearance-none removes, so the
                  control still reads as a dropdown. */}
              <svg
                aria-hidden="true" viewBox="0 0 20 20" fill="none"
                className="w-3.5 h-3.5 shrink-0 text-slate-400 pointer-events-none -ml-1 mr-1"
              >
                <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <button
                type="submit"
                aria-label="Search"
                className="w-8 h-8 shrink-0 grid place-items-center rounded bg-mg-mint hover:bg-mg-teal text-slate-800 transition"
              >
                <Icon name="search" className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Distances measured from a default point are not distances. Say so
              plainly rather than presenting "7.7 km" as if it were theirs. */}
          {isFallback && geoStatus !== 'locating' && (
            <p className="mt-3 text-[11px] text-white/85">
              {geoStatus === 'denied'
                ? 'Location is blocked, so distances are from Kolkata city centre. '
                : 'Distances are from Kolkata city centre until you share your location. '}
              <button type="button" onClick={useMyLocation} className="font-semibold underline underline-offset-2 hover:text-white">
                Use my location
              </button>
            </p>
          )}
        </div>
      </section>

      <section>
        <h3 className="text-lg sm:text-xl font-semibold text-slate-900">Browse by Specialities</h3>
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {CATEGORIES.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => pickSpecialty(c.value)}
              aria-pressed={specialty === c.value}
              className={clsx(
                'flex items-center gap-3 p-2.5 min-h-[76px] rounded-md border bg-white text-left transition hover:shadow-sm',
                specialty === c.value ? 'border-mg-teal ring-1 ring-mg-teal' : 'border-slate-100',
              )}
            >
              <img src={c.img} alt="" className="w-14 h-14 object-cover rounded shrink-0" />
              <span className="text-xs text-slate-800 leading-snug whitespace-pre-line">{c.label}</span>
            </button>
          ))}
          {/* Every speciality has a tile already, so "more" opens the full list. */}
          <button
            type="button"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
              const el = specialtyRef.current;
              el?.focus();
              try { el?.showPicker?.(); } catch { /* not supported everywhere */ }
            }}
            className="flex items-center justify-center p-2.5 text-xs text-slate-800 hover:text-mg-teal"
          >
            more
          </button>
        </div>
      </section>

      <section ref={listRef} className="scroll-mt-32">
        <div className="flex items-center justify-between">
          <h3 className="text-lg sm:text-xl font-semibold text-slate-900">Available OPD Doctors</h3>
          <div className="relative" ref={filtersRef}>
            <button
              type="button"
              onClick={() => setFiltersOpen((o) => !o)}
              aria-expanded={filtersOpen}
              className="inline-flex items-center gap-1.5 text-[11px] text-slate-800 hover:text-mg-teal"
            >
              <Icon name="filter" className="w-3.5 h-3.5" strokeWidth={1.5} /> Filters
            </button>
            {filtersOpen && (
              <div className="absolute right-0 mt-2 w-56 z-20 bg-white rounded-lg border border-slate-200 shadow-lg p-3 text-xs animate-fade-in">
                <p className="font-semibold text-slate-800 mb-2">Search radius</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {[5, 10, 15, 25, 50].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => { setRadius(r); setFiltersOpen(false); }}
                      className={clsx('py-1.5 rounded border transition',
                        radius === r ? 'bg-mg-teal border-mg-teal text-white' : 'border-slate-200 text-slate-700 hover:border-mg-teal')}
                    >
                      {r} km
                    </button>
                  ))}
                </div>
                {specialty && (
                  <button
                    type="button"
                    onClick={() => { setSpecialty(''); setFiltersOpen(false); }}
                    className="mt-3 w-full text-left text-mg-teal hover:underline"
                  >
                    Clear “{specialty}”
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        <p className="mt-1 text-[11px] text-slate-500">
          {loading ? 'Searching…' : `${rows.length} found within ${radius} km`}
          {specialty && !loading && ` · ${specialty}`}
          {meta?.distanceSource === 'HAVERSINE' && !loading && (
            <span className="ml-1 text-slate-400" title="Add a Google Maps key for road distance">· straight-line</span>
          )}
        </p>

        <div className="mt-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
            </div>
          ) : rows.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rows.map((d) => <DoctorCard key={d.doctorId} doctor={d} onBook={onBook} />)}
            </div>
          ) : (
            <EmptyState
              icon="search"
              title="No clinics found nearby"
              hint="Try a wider radius, clear the specialty filter, or search by a doctor's name."
              action="Reset filters"
              onAction={() => { setSpecialty(''); setSearch(''); setRadius(25); }}
            />
          )}
        </div>
      </section>

      <BookingSheet doctor={booking} onClose={() => setBooking(null)} />
    </div>
  );
}
