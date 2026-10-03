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
import { initialsOf } from '../../lib/format.js';
import { LivePill } from '../../components/layout/DarkHero.jsx';
import { AnchoredMenu } from '../../components/ui/AnchoredMenu.jsx';
import clsx from 'clsx';
import { PhotoOrFallback } from '../../components/ui/PhotoOrFallback.jsx';

// "All Clinics" is not a specialty — it is the absence of a filter — so it
// stays in code rather than the admin-managed list, where it could be hidden
// and leave patients no way to clear the filter.
const ALL_TILE = { label: 'All Clinics', value: '', img: '/categories/AllClinics.png' };

// How many specialty tiles show before "more". Two rows on the widest grid.
const TILE_LIMIT = 8;

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
  // Type-ahead. `picked` suppresses the fetch that the setSearch in onPick
  // would otherwise trigger, so choosing a row does not reopen the list.
  const [suggestions, setSuggestions] = useState([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const picked = useRef(false);
  // Location picker: GPS or a city. A city keeps the search usable for anyone
  // who declines the permission prompt, which is otherwise a dead end.
  const [cities, setCities] = useState([]);
  const [cityName, setCityName] = useState(null);
  const [locOpen, setLocOpen] = useState(false);
  // Filters the city list. A network covering dozens of cities makes a plain
  // scrolling list unusable, and the city you want is rarely the first four.
  const [cityQuery, setCityQuery] = useState('');
  const locRef = useRef(null);
  // The query we last warned about, so one dead end produces one toast.
  const warnedFor = useRef(null);
  const searchBoxRef = useRef(null);
  const listRef = useRef(null);
  const filtersRef = useRef(null);
  const specialtyRef = useRef(null);

  // The browse tiles, as an admin has arranged them. Falls back to nothing
  // rather than a stale hardcoded list: showing a tile an admin has hidden
  // would be worse than showing none.
  const [tiles, setTiles] = useState([]);
  const [showAllTiles, setShowAllTiles] = useState(false);

  useEffect(() => {
    let alive = true;
    api.get('/api/specialties')
      .then((res) => {
        if (!alive) return;
        setTiles((res.data?.data ?? []).map((t) => ({
          label: t.tileLabel || t.name,
          value: t.name,
          img: t.photoUrl,
          doctorCount: t.doctorCount,
        })));
      })
      .catch(() => { /* the search and dropdown still work without tiles */ });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    api.get('/api/doctors/cities')
      .then((res) => { if (alive) setCities(res.data?.data ?? []); })
      .catch(() => { /* the GPS option still works without this */ });
    return () => { alive = false; };
  }, []);

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

  // load() is declared before persist(), and naming persist in its dependency
  // list would rebuild load whenever accuracy changed — which re-fires the
  // search effects keyed on it. A ref keeps the call current without that.
  const persistRef = useRef(null);

  const load = useCallback(async (c = coords) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ lng: c.lng, lat: c.lat, radiusKm: radius });
      if (specialty) params.set('specialty', specialty);
      if (search.trim()) params.set('search', search.trim());
      const res = await api.get(`/api/doctors/nearby?${params}`);
      const found = res.data.data || [];
      // Searching from here means this is where they are now. persist()
      // ignores a point that has not meaningfully moved, so the debounce does
      // not turn this into one write per keystroke.
      persistRef.current?.(c);
      setRows(found);
      setMeta(res.data.meta);

      // An empty list needs explaining, but only ONCE per settled query: the
      // debounce fires a request per keystroke, and warning on each produced a
      // stack of identical toasts while the user was still typing. Keyed on the
      // exact query so retyping the same thing stays quiet too.
      const term = search.trim();
      const key = `${term}|${specialty}|${radius}`;
      // Warning on every keystroke meant "ca" and "care" each produced their
      // own toast seconds apart. A single toast keyed to the search REPLACES
      // the previous one, so the user sees the current state rather than a
      // pile of stale near-identical warnings. Short fragments are skipped
      // entirely: "ca" on the way to "care" is not a dead end worth reporting.
      const worthWarning = term.length >= 3 || Boolean(specialty);
      if (!found.length && worthWarning) {
        if (warnedFor.current !== key) {
          warnedFor.current = key;
          const away = res.data.meta?.elsewhere;
          const opts = { key: 'explore-empty' };
          if (away) {
            // Far more useful than "widen your radius" when the doctor is in
            // another city and no radius would ever reach them.
            toast.warn(`${away.name} practises at ${away.clinicName}${away.city ? `, ${away.city}` : ''} — not within ${radius} km of you.`, opts);
          } else {
            const bits = [];
            if (term) bits.push(`"${term}"`);
            if (specialty) bits.push(specialty);
            toast.warn(`No doctors match ${bits.join(' in ')} within ${radius} km — try a wider radius or clear the filters.`, opts);
          }
        }
      } else if (found.length) {
        // A successful search re-arms the warning for the next dead end.
        warnedFor.current = null;
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

  // Type-ahead, on its own shorter debounce: a suggestion list that lags the
  // keystrokes is worse than none, and /suggest is far cheaper than /nearby.
  useEffect(() => {
    // Picking a row sets `search`, which would otherwise immediately refetch
    // and reopen the list under the user's cursor.
    if (picked.current) { picked.current = false; return undefined; }
    const term = search.trim();
    if (term.length < 2) { setSuggestions([]); setSuggestOpen(false); return undefined; }

    let alive = true;
    const id = setTimeout(async () => {
      try {
        const res = await api.get(`/api/doctors/suggest?q=${encodeURIComponent(term)}`);
        if (!alive) return;
        setSuggestions(res.data.data || []);
        setSuggestOpen(true);
      } catch {
        // A failed suggestion is not worth a toast — the search itself still
        // works, and the user is mid-keystroke.
        if (alive) { setSuggestions([]); setSuggestOpen(false); }
      }
    }, 180);
    return () => { alive = false; clearTimeout(id); };
  }, [search]);

  const pickSuggestion = (row) => {
    picked.current = true;
    setSearch(row.value);
    setSuggestOpen(false);
    setSuggestions([]);
    // Search immediately on the chosen value rather than waiting for a debounce
    // the picked-guard has just suppressed.
    setTimeout(() => load(), 0);
  };

  /**
   * Remember where they are, so the next visit does not start from scratch.
   *
   * De-duplicated against the last saved point: a search runs on every
   * keystroke, and the stored address must not be rewritten once per letter.
   * ~50m is below consumer GPS accuracy, so anything closer is jitter, not
   * movement. The server reverse-geocodes, which is what refreshes the saved
   * address itself rather than only its coordinates.
   */
  const lastSaved = useRef(null);
  const persist = useCallback(async (c) => {
    if (!isAuthed || !c?.lat) return;
    const prev = lastSaved.current;
    if (prev) {
      const dLat = Math.abs(prev.lat - c.lat);
      const dLng = Math.abs(prev.lng - c.lng);
      if (dLat < 0.0005 && dLng < 0.0005) return;
    }
    lastSaved.current = { lat: c.lat, lng: c.lng };
    try {
      await api.patch('/api/patients/me/location', { lat: c.lat, lng: c.lng, accuracy });
    } catch {
      // Not worth interrupting a search over — the location still works today.
      lastSaved.current = prev;
    }
  }, [isAuthed, accuracy]);

  useEffect(() => { persistRef.current = persist; }, [persist]);

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
    setLocOpen(false);
    setCityName(null);
    const c = await locate();
    if (geoStatus === 'denied') toast.warn('Location permission denied — pick a city instead', { key: 'explore-location' });
    else persist(c);
    load(c);
  };

  /** Search from a city centre — no permission prompt, no dead end. */
  const useCity = (c) => {
    setLocOpen(false);
    setCityName(c.city);
    load({ lat: c.lat, lng: c.lng, label: c.city });
  };

  // The browser's permission prompt can sit open for seconds; everything that
  // needs to show progress reads this one flag.
  const locating = geoStatus === 'locating';

  // All Clinics always leads, then the admin's order.
  const allTiles = [ALL_TILE, ...tiles];
  const visibleTiles = showAllTiles ? allTiles : allTiles.slice(0, TILE_LIMIT + 1);
  const hiddenTileCount = Math.max(0, allTiles.length - (TILE_LIMIT + 1));

  // The city with the most clinics — where an empty result is most likely to
  // find something, and a far better offer than "widen your radius".
  const biggestCity = cities[0] ?? null;

  const visibleCities = cityQuery.trim()
    ? cities.filter((c) => c.city.toLowerCase().includes(cityQuery.trim().toLowerCase()))
    : cities;

  const onBook = (doctor) => {
    if (!isAuthed) {
      toast.push('Sign in to book a token');
      navigate('/login', { state: { from: '/p/explore' } });
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
          <LivePill />
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
            <div ref={locRef} className="relative sm:w-[30%] min-w-0 border-b sm:border-b-0 sm:border-r border-slate-100">
              <button
                type="button"
                onClick={() => { setLocOpen((v) => !v); setCityQuery(''); }}
                title="Choose where to search from"
                aria-expanded={locOpen}
                className="w-full flex items-center gap-1.5 px-2 py-2 text-left text-[11px] min-w-0"
              >
                <span className={clsx('truncate flex-1', cityName || !isFallback ? 'text-slate-700' : 'text-slate-400')}>
                  {locating ? 'Finding you…' : cityName || (isFallback ? 'Your location' : (coords?.label || 'Your location'))}
                </span>
                {/* A spinner while the browser's permission prompt is open:
                    tapping and seeing nothing change reads as a dead button,
                    which is exactly how this felt before. */}
                {locating ? (
                  <span className="w-3.5 h-3.5 shrink-0 rounded-full border-2 border-mg-teal border-t-transparent animate-spin" />
                ) : (
                  <Icon name="location" className="w-3.5 h-3.5 text-mg-teal shrink-0" />
                )}
              </button>

              <AnchoredMenu anchorRef={locRef} open={locOpen} onClose={() => setLocOpen(false)} minWidth={240}>
                <div>
                  <button
                    type="button"
                    onClick={useMyLocation}
                    disabled={locating}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-slate-50 transition disabled:opacity-60"
                  >
                    <Icon name="location" className="w-3.5 h-3.5 text-mg-teal shrink-0" />
                    <span className="min-w-0">
                      <span className="block text-[11px] font-semibold text-slate-800">
                        {locating ? 'Finding you…' : 'Use my location'}
                      </span>
                      <span className="block text-[10px] text-slate-400">Nearest clinics first</span>
                    </span>
                  </button>

                  {cities.length > 0 && (
                    <>
                      <p className="px-3 pt-2 pb-1 text-[9px] font-bold uppercase tracking-wider text-slate-400 border-t border-slate-100">
                        Or browse a city
                      </p>

                      {/* Only worth a filter once scanning the list is slower
                          than typing. Below that it is just another control. */}
                      {cities.length > 6 && (
                        <div className="px-2 pb-1">
                          <input
                            value={cityQuery}
                            onChange={(e) => setCityQuery(e.target.value)}
                            placeholder="Search city…"
                            aria-label="Search city"
                            autoComplete="off"
                            className="w-full px-2.5 py-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-mg-teal placeholder:text-slate-400"
                          />
                        </div>
                      )}

                      {visibleCities.length === 0 ? (
                        <p className="px-3 py-3 text-[11px] text-slate-400">No city matches “{cityQuery}”.</p>
                      ) : visibleCities.map((c) => (
                        <button
                          key={c.city}
                          type="button"
                          onClick={() => useCity(c)}
                          className={clsx(
                            'w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-slate-50 transition',
                            cityName === c.city && 'bg-mg-teal/5',
                          )}
                        >
                          <span className="text-[11px] font-semibold text-slate-800 truncate">{c.city}</span>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {c.clinics} {c.clinics === 1 ? 'clinic' : 'clinics'}
                          </span>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </AnchoredMenu>
            </div>
            <div ref={searchBoxRef} className="relative sm:w-[35%] flex items-center px-2 min-w-0 border-b sm:border-b-0 sm:border-r border-slate-100">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => { if (suggestions.length) setSuggestOpen(true); }}
                onKeyDown={(e) => { if (e.key === 'Escape') setSuggestOpen(false); }}
                placeholder="Dr. Name or Clinic"
                aria-label="Doctor name or clinic"
                autoComplete="off"
                role="combobox"
                aria-expanded={suggestOpen}
                aria-controls="explore-suggestions"
                className="w-full py-2 text-[11px] bg-transparent focus:outline-none placeholder:text-slate-400"
              />
              {search && (
                <button type="button" onClick={() => { setSearch(''); setSuggestOpen(false); }} className="text-slate-400 hover:text-slate-600" aria-label="Clear search">
                  <Icon name="cross" className="w-3 h-3" />
                </button>
              )}

              <AnchoredMenu
                anchorRef={searchBoxRef}
                open={suggestOpen && suggestions.length > 0}
                onClose={() => setSuggestOpen(false)}
                minWidth={260}
              >
                <ul id="explore-suggestions" role="listbox">
                  {suggestions.map((row) => (
                    <li key={`${row.kind}-${row.doctorId ?? row.hospitalId}`} role="option" aria-selected="false">
                      <button
                        type="button"
                        // onMouseDown, not onClick: the input's blur would close
                        // the list before a click ever landed.
                        onMouseDown={(e) => { e.preventDefault(); pickSuggestion(row); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50 transition"
                      >
                        <span className={clsx(
                          'w-7 h-7 rounded-full shrink-0 grid place-items-center text-[10px] font-bold',
                          row.kind === 'doctor' ? 'bg-teal-50 text-teal-700' : 'bg-indigo-50 text-indigo-700',
                        )}>
                          {row.kind === 'doctor'
                            ? (
                              <PhotoOrFallback
                                src={row.photoUrl}
                                className="w-full h-full rounded-full object-cover"
                                fallback={initialsOf(row.label)}
                              />
                            )
                            : <Icon name="building" className="w-3.5 h-3.5" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[11px] font-semibold text-slate-800 truncate">{row.label}</span>
                          <span className="block text-[10px] text-slate-400 truncate">{row.sublabel}</span>
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-wide text-slate-300 shrink-0">
                          {row.kind}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </AnchoredMenu>
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
          {visibleTiles.map((c) => (
            <button
              key={c.value || 'all'}
              type="button"
              onClick={() => pickSpecialty(c.value)}
              aria-pressed={specialty === c.value}
              className={clsx(
                'flex items-center gap-3 p-2.5 min-h-[76px] rounded-md border bg-white text-left transition hover:shadow-sm',
                specialty === c.value ? 'border-mg-teal ring-1 ring-mg-teal' : 'border-slate-100',
              )}
            >
              {c.img ? (
                <img src={c.img} alt="" className="w-14 h-14 object-cover rounded shrink-0" />
              ) : (
                // A specialty an admin added but has not given artwork yet.
                // A neutral placeholder beats a broken-image icon.
                <span className="w-14 h-14 rounded shrink-0 bg-mg-teal/10 text-mg-teal grid place-items-center">
                  <Icon name="heart" className="w-6 h-6" />
                </span>
              )}
              <span className="text-xs text-slate-800 leading-snug whitespace-pre-line">{c.label}</span>
            </button>
          ))}

          {/* A real tile rather than bare text: as the odd one out it read like
              a broken card. It says how many it hides, and toggles back. */}
          {hiddenTileCount > 0 && (
            <button
              type="button"
              onClick={() => setShowAllTiles((v) => !v)}
              className="flex items-center gap-3 p-2.5 min-h-[76px] rounded-md border border-dashed border-slate-200 bg-white text-left transition hover:border-mg-teal hover:shadow-sm"
            >
              <span className="w-14 h-14 rounded shrink-0 bg-slate-50 text-slate-400 grid place-items-center">
                <Icon name={showAllTiles ? 'chevronDown' : 'plus'} className={clsx('w-5 h-5', showAllTiles && 'rotate-180')} />
              </span>
              <span className="text-xs text-slate-800 leading-snug">
                {showAllTiles ? 'Show less' : `${hiddenTileCount} more`}
              </span>
            </button>
          )}
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
              // Widening the radius is useless advice when the whole network is
              // in another state, so when we know a city that HAS clinics, offer
              // to go there instead of suggesting a filter change that cannot help.
              hint={biggestCity
                ? `The nearest clinics are in ${biggestCity.city}. Browse there, or search by a doctor's name.`
                : 'Try a wider radius, clear the specialty filter, or search by a doctor\'s name.'}
              action={biggestCity ? `Browse ${biggestCity.city}` : 'Reset filters'}
              onAction={() => {
                setSpecialty('');
                setSearch('');
                if (biggestCity) useCity(biggestCity);
                else setRadius(25);
              }}
            />
          )}
        </div>
      </section>

      <BookingSheet doctor={booking} onClose={() => setBooking(null)} />
    </div>
  );
}
