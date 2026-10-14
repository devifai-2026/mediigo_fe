import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, unwrap } from '../../lib/api.js';
import { useGeolocation } from '../../hooks/useGeolocation.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { ClinicCard } from '../../components/patient/ClinicCard.jsx';
import { ClinicSheet } from '../../components/patient/ClinicSheet.jsx';
import { groupByClinic } from '../../lib/clinics.js';
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
  // The clinic sheet: { clinic, choosing } — choosing when opened from
  // "Book Token", so it leads with picking a doctor.
  const [sheet, setSheet] = useState(null);
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
  // What the patient is typing into the location box. Empty shows the city
  // list; two or more characters searches cities, localities and pincodes.
  const [cityQuery, setCityQuery] = useState('');
  const [places, setPlaces] = useState([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const locRef = useRef(null);
  const locInputRef = useRef(null);
  // The query we last warned about, so one dead end produces one toast.
  const warnedFor = useRef(null);
  const searchBoxRef = useRef(null);
  const listRef = useRef(null);
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
  const useCity = (c) => usePlace({ label: c.city, lat: c.lat, lng: c.lng });

  /** Search from any picked place: a city, a locality or a pincode. */
  const usePlace = (p) => {
    setLocOpen(false);
    setCityQuery('');
    setCityName(p.label);
    locInputRef.current?.blur();
    load({ lat: p.lat, lng: p.lng, label: p.label });
  };

  // Place type-ahead, debounced like the doctor suggestions.
  useEffect(() => {
    const term = cityQuery.trim();
    if (term.length < 2) { setPlaces([]); setPlacesLoading(false); return undefined; }
    let alive = true;
    setPlacesLoading(true);
    const id = setTimeout(async () => {
      try {
        const res = await api.get(`/api/doctors/places?q=${encodeURIComponent(term)}`);
        if (alive) setPlaces(res.data.data || []);
      } catch {
        if (alive) setPlaces([]);
      } finally {
        if (alive) setPlacesLoading(false);
      }
    }, 200);
    return () => { alive = false; clearTimeout(id); };
  }, [cityQuery]);

  // The browser's permission prompt can sit open for seconds; everything that
  // needs to show progress reads this one flag.
  const locating = geoStatus === 'locating';

  // The location box shows where we are measuring from until it is focused,
  // then becomes a search over cities, localities and pincodes.
  const placeTyping = cityQuery.trim().length >= 2;
  const locationLabel = locating
    ? 'Finding you…'
    : cityName || (isFallback ? '' : (coords?.label || ''));

  // All Clinics always leads, then the admin's order.
  const allTiles = [ALL_TILE, ...tiles];
  const visibleTiles = showAllTiles ? allTiles : allTiles.slice(0, TILE_LIMIT + 1);
  const hiddenTileCount = Math.max(0, allTiles.length - (TILE_LIMIT + 1));

  // The city with the most clinics — where an empty result is most likely to
  // find something, and a far better offer than "widen your radius".
  const biggestCity = cities[0] ?? null;


  // Patients browse clinics; each search row is a doctor with its clinic, so
  // the list is those rows grouped, nearest clinic first.
  const clinics = useMemo(() => groupByClinic(rows), [rows]);

  const onBook = (doctor) => {
    setSheet(null);
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
      {/* On a phone a left-to-right blue→mint sweep runs out of width: the
          mint lands behind the copy and washes out the white text. A diagonal
          that stays deep blue under the text, with the mint as a corner glow,
          keeps the brand colours and the contrast. */}
      <section className="relative overflow-hidden rounded-xl sm:rounded-xl bg-gradient-to-br sm:bg-gradient-to-r from-mg-blue via-[#2552A8] to-mg-tealDark sm:to-mg-mint text-white">
        <div aria-hidden="true" className="sm:hidden absolute -right-20 -bottom-24 w-64 h-64 rounded-full bg-mg-mint/30 blur-3xl pointer-events-none" />
        <img
          src="/assets/herobanner.png"
          alt=""
          className="hidden md:block absolute right-0 bottom-0 w-[44%] max-w-[460px] pointer-events-none select-none"
        />
        <div className="relative p-5 sm:px-7 sm:py-10 md:w-[62%]">
          <LivePill className="px-2.5 py-1 rounded-full bg-white/10 ring-1 ring-white/15 sm:p-0 sm:bg-transparent sm:ring-0">
            Live queue updates
          </LivePill>
          <h2 className="mt-4 sm:mt-10 text-[28px] leading-[1.15] sm:text-4xl sm:leading-tight font-semibold tracking-tight">Find &amp; Book Doctors Nearby</h2>
          <p className="mt-2.5 sm:mt-3 text-sm text-white/85 sm:text-white/90 max-w-lg leading-relaxed">
            Skip the crowded waiting room. Get a digital token, real-time wait estimates and an alert when your turn is close.
          </p>

          {/* Results update as you type; the button just skips the 350ms wait.
              Below sm every field is a full-height (48px) row at 16px text —
              anything smaller and iOS Safari zooms the page on focus. */}
          <form
            onSubmit={(e) => { e.preventDefault(); load(); }}
            className="mt-6 sm:mt-10 bg-white rounded-xl sm:rounded-md p-1.5 sm:p-1 flex flex-col sm:flex-row sm:items-stretch text-slate-900 shadow-xl shadow-slate-900/20 sm:shadow-lg"
          >
            {/* Where to search from. Shows the current place until focused,
                then searches cities, localities and pincodes as they type;
                "Use my location" stays first so GPS is one tap away. */}
            <div ref={locRef} className="relative sm:w-[30%] min-w-0 flex items-center gap-3 sm:gap-1.5 px-3 sm:px-2 border-b sm:border-b-0 sm:border-r border-slate-100">
              {/* A spinner while the browser's permission prompt is open:
                  tapping and seeing nothing change reads as a dead control. */}
              {locating ? (
                <span className="order-first sm:order-none w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0 rounded-full border-2 border-mg-teal border-t-transparent animate-spin" />
              ) : (
                <Icon name="location" className="order-first sm:order-none w-4 h-4 sm:w-3.5 sm:h-3.5 text-mg-teal shrink-0" />
              )}
              <input
                ref={locInputRef}
                value={locOpen ? cityQuery : locationLabel}
                onChange={(e) => { setCityQuery(e.target.value); setLocOpen(true); }}
                onFocus={() => { setCityQuery(''); setLocOpen(true); }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') { setLocOpen(false); e.currentTarget.blur(); }
                  // Enter picks the top match instead of submitting the form
                  // with a half-typed place.
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (placeTyping && places[0]) usePlace(places[0]);
                  }
                }}
                placeholder={locOpen ? (locationLabel || 'City, area or pincode') : 'Your location'}
                aria-label="Location: city, area or pincode"
                autoComplete="off"
                role="combobox"
                aria-expanded={locOpen}
                aria-controls="explore-places"
                className="order-1 sm:order-first w-full min-w-0 py-3 sm:py-2 text-base sm:text-[11px] bg-transparent text-slate-700 focus:outline-none placeholder:text-slate-400 truncate"
              />
              {locOpen && cityQuery && (
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); setCityQuery(''); }}
                  className="order-2 -mr-1.5 p-1.5 sm:m-0 sm:p-0 text-slate-400 hover:text-slate-600"
                  aria-label="Clear location search"
                >
                  <Icon name="cross" className="w-4 h-4 sm:w-3 sm:h-3" />
                </button>
              )}

              <AnchoredMenu anchorRef={locRef} open={locOpen} onClose={() => setLocOpen(false)} minWidth={260}>
                <div id="explore-places" role="listbox">
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); locInputRef.current?.blur(); useMyLocation(); }}
                    disabled={locating}
                    className="w-full flex items-center gap-2.5 px-3 py-3 sm:py-2.5 text-left hover:bg-slate-50 transition disabled:opacity-60"
                  >
                    <span className="w-8 h-8 sm:w-7 sm:h-7 rounded-full bg-teal-50 grid place-items-center shrink-0">
                      <Icon name="compass" className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-mg-teal" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm sm:text-[11px] font-semibold text-mg-tealDark">
                        {locating ? 'Finding you…' : 'Use my current location'}
                      </span>
                      <span className="block text-xs sm:text-[10px] text-slate-400">Nearest clinics first</span>
                    </span>
                  </button>

                  <p className="px-3 pt-2.5 pb-1 text-[10px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 border-t border-slate-100">
                    {placeTyping ? 'Places' : 'Cities on Mediigo'}
                  </p>

                  {placeTyping ? (
                    placesLoading && places.length === 0 ? (
                      <p className="px-3 py-3 text-sm sm:text-[11px] text-slate-400">Searching…</p>
                    ) : places.length === 0 ? (
                      <p className="px-3 py-3 text-sm sm:text-[11px] text-slate-400">
                        No place matches “{cityQuery.trim()}”. Try a city, area or pincode.
                      </p>
                    ) : places.map((pl) => (
                      <button
                        key={`${pl.kind}-${pl.label}-${pl.sublabel}`}
                        type="button"
                        role="option"
                        aria-selected={cityName === pl.label}
                        onMouseDown={(e) => { e.preventDefault(); usePlace(pl); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 sm:py-2 text-left hover:bg-slate-50 transition"
                      >
                        <Icon name={pl.kind === 'city' ? 'building' : 'location'} className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-slate-400 shrink-0" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm sm:text-[11px] font-semibold text-slate-800 truncate">{pl.label}</span>
                          {pl.sublabel && <span className="block text-xs sm:text-[10px] text-slate-400 truncate">{pl.sublabel}</span>}
                        </span>
                      </button>
                    ))
                  ) : cities.length === 0 ? (
                    <p className="px-3 py-3 text-sm sm:text-[11px] text-slate-400">Type a city, area or pincode.</p>
                  ) : cities.map((c) => (
                    <button
                      key={c.city}
                      type="button"
                      role="option"
                      aria-selected={cityName === c.city}
                      onMouseDown={(e) => { e.preventDefault(); useCity(c); }}
                      className={clsx(
                        'w-full flex items-center justify-between gap-2 px-3 py-2.5 sm:py-2 text-left hover:bg-slate-50 transition',
                        cityName === c.city && 'bg-mg-teal/5',
                      )}
                    >
                      <span className="text-sm sm:text-[11px] font-semibold text-slate-800 truncate">{c.city}</span>
                      <span className="text-xs sm:text-[10px] text-slate-400 shrink-0">
                        {c.clinics} {c.clinics === 1 ? 'clinic' : 'clinics'}
                      </span>
                    </button>
                  ))}
                </div>
              </AnchoredMenu>
            </div>

            {/* Speciality second: "where, then what kind of doctor" is how
                patients narrow down; a name is the optional last step. */}
            <div className="relative sm:w-[30%] flex items-center gap-3 sm:gap-1 pl-3 sm:pl-2 min-w-0 border-b sm:border-b-0 sm:border-r border-slate-100">
              <Icon name="heart" className="sm:hidden w-4 h-4 text-slate-400 shrink-0" />
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
                  'flex-1 min-w-0 py-3 sm:py-2 pr-1 text-base sm:text-[11px] bg-transparent focus:outline-none cursor-pointer',
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
                className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0 text-slate-400 pointer-events-none -ml-1 mr-3 sm:mr-2"
              >
                <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <div ref={searchBoxRef} className="relative flex-1 flex items-center gap-3 sm:gap-1 px-3 sm:pl-2 sm:pr-0 min-w-0">
              <Icon name="search" className="sm:hidden w-4 h-4 text-slate-400 shrink-0" />
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
                className="w-full py-3 sm:py-2 text-base sm:text-[11px] bg-transparent focus:outline-none placeholder:text-slate-400"
              />
              {search && (
                <button type="button" onClick={() => { setSearch(''); setSuggestOpen(false); }} className="-mr-1.5 p-1.5 sm:m-0 sm:p-0 sm:mr-1 text-slate-400 hover:text-slate-600" aria-label="Clear search">
                  <Icon name="cross" className="w-4 h-4 sm:w-3 sm:h-3" />
                </button>
              )}
              <button
                type="submit"
                aria-label="Search"
                className="hidden sm:grid w-8 h-8 shrink-0 place-items-center rounded-lg bg-mg-mint hover:bg-mg-teal text-slate-800 transition"
              >
                <Icon name="search" className="w-4 h-4" />
              </button>

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
                        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-300 shrink-0">
                          {row.kind}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </AnchoredMenu>
            </div>
            {/* A 32px icon squeezed into the last field is a missable target
                on a phone; there the primary action gets its own full row. */}
            <button
              type="submit"
              className="sm:hidden mt-1.5 h-12 rounded-lg bg-mg-tealDark active:bg-mg-teal text-white text-[15px] font-semibold flex items-center justify-center gap-2 transition"
            >
              <Icon name="search" className="w-4 h-4" />
              Find doctors
            </button>
          </form>

          {/* Distances measured from a default point are not distances. Say so
              plainly rather than presenting "7.7 km" as if it were theirs. */}
          {/* Once they pick a place, distances ARE from where they chose. */}
          {isFallback && !cityName && geoStatus !== 'locating' && (
            <p className="mt-3 text-xs sm:text-[11px] leading-relaxed text-white/85">
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
                'flex items-center gap-3 p-2.5 min-h-[76px] rounded-lg border bg-white text-left transition hover:shadow-sm',
                specialty === c.value ? 'border-mg-teal ring-1 ring-mg-teal' : 'border-slate-100',
              )}
            >
              {c.img ? (
                <img src={c.img} alt="" className="w-14 h-14 object-cover rounded-md shrink-0" />
              ) : (
                // A specialty an admin added but has not given artwork yet.
                // A neutral placeholder beats a broken-image icon.
                <span className="w-14 h-14 rounded-md shrink-0 bg-mg-teal/10 text-mg-teal grid place-items-center">
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
              className="flex items-center gap-3 p-2.5 min-h-[76px] rounded-lg border border-dashed border-slate-200 bg-white text-left transition hover:border-mg-teal hover:shadow-sm"
            >
              <span className="w-14 h-14 rounded-md shrink-0 bg-slate-50 text-slate-400 grid place-items-center">
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
        <h3 className="text-lg sm:text-xl font-semibold text-slate-900">Clinics &amp; Hospitals Near You</h3>
        <p className="mt-1 text-xs text-slate-500">
          {loading
            ? 'Searching…'
            : `${clinics.length} ${clinics.length === 1 ? 'clinic' : 'clinics'} · ${rows.length} ${rows.length === 1 ? 'doctor' : 'doctors'}`}
          {meta?.distanceSource === 'HAVERSINE' && !loading && (
            <span className="ml-1 text-slate-400" title="Add a Google Maps key for road distance">· straight-line distance</span>
          )}
        </p>

        {/* The radius is the filter patients reach for most, so it sits in the
            open as a chip row rather than behind a "Filters" menu. On a phone
            it scrolls sideways instead of wrapping into a block. */}
        <div className="mt-4 -mx-4 px-4 sm:mx-0 sm:px-0 flex items-center gap-2 overflow-x-auto no-scrollbar" role="group" aria-label="Search radius">
          <span className="shrink-0 inline-flex items-center gap-1.5 pr-1 text-xs font-semibold text-slate-700">
            <Icon name="location" className="w-4 h-4 text-mg-teal" /> Within
          </span>
          {[5, 10, 15, 25, 50].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRadius(r)}
              aria-pressed={radius === r}
              className={clsx(
                'shrink-0 h-9 px-4 rounded-full border-2 text-sm font-semibold transition',
                radius === r
                  ? 'bg-mg-teal border-mg-teal text-white shadow-sm shadow-mg-teal/30'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-mg-teal hover:text-mg-tealDark',
              )}
            >
              {r} km
            </button>
          ))}
          {specialty && (
            <button
              type="button"
              onClick={() => setSpecialty('')}
              className="shrink-0 h-9 pl-3.5 pr-2.5 inline-flex items-center gap-1.5 rounded-full border-2 border-mg-navy/20 bg-mg-navy/5 text-sm font-semibold text-mg-navy hover:border-mg-navy/40 transition"
              aria-label={`Clear ${specialty} filter`}
            >
              {specialty}
              <Icon name="cross" className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="mt-5">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
            </div>
          ) : clinics.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clinics.map((c) => (
                <ClinicCard
                  key={c.id}
                  clinic={c}
                  onOpen={(clinic) => setSheet({ clinic, choosing: false })}
                  onBook={(clinic) => setSheet({ clinic, choosing: true })}
                />
              ))}
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

      {sheet && (
        <ClinicSheet
          clinic={sheet.clinic}
          choosing={sheet.choosing}
          filtered={Boolean(specialty || search.trim())}
          onClose={() => setSheet(null)}
          onBook={onBook}
        />
      )}
      <BookingSheet doctor={booking} onClose={() => setBooking(null)} />
    </div>
  );
}
