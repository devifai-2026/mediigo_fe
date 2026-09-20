import { useState, useCallback } from 'react';

// Fallback centre: Kolkata. The prototype's handler hardcoded a city in BOTH
// the success and error branches and never read position.coords, so "Near Me"
// did nothing. Here success genuinely uses the device coordinates.
const FALLBACK = { lat: 22.5726, lng: 88.3639, label: 'Kolkata' };

// Remembering the answer matters: browsers only show the permission dialog on a
// genuine visit, and re-asking someone who already said no is just noise.
const ASKED_KEY = 'mediigo.locationAsked';
const COORDS_KEY = 'mediigo.coords';
// A day-old fix is fine for ranking clinics by distance; older than that and a
// patient who has travelled would get a stale list.
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

const readCached = () => {
  try {
    const raw = localStorage.getItem(COORDS_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw);
    if (!c?.lat || !c?.lng || Date.now() - (c.at ?? 0) > MAX_AGE_MS) return null;
    return c;
  } catch {
    // Private windows and blocked site data both throw here.
    return null;
  }
};

const writeCached = (c) => {
  try {
    localStorage.setItem(COORDS_KEY, JSON.stringify({ ...c, at: Date.now() }));
  } catch { /* storage unavailable — the location still works this session */ }
};

export const useGeolocation = ({ initial = null } = {}) => {
  const cached = readCached();
  // A location saved on the patient's profile beats the city centre, and beats
  // a cached fix from a different device.
  const seed = initial || cached;
  const [coords, setCoords] = useState(seed ? { lat: seed.lat, lng: seed.lng, label: seed.label || 'Your location' } : FALLBACK);
  const [status, setStatus] = useState(seed ? 'located' : 'idle'); // idle | locating | located | denied | unsupported
  const [accuracy, setAccuracy] = useState(null);

  const locate = useCallback(
    () =>
      new Promise((resolve) => {
        if (!navigator.geolocation) {
          setStatus('unsupported');
          resolve(FALLBACK);
          return;
        }
        setStatus('locating');

        /**
         * watchPosition rather than getCurrentPosition, because the first fix a
         * device returns is usually the coarse wifi/cell estimate — often a
         * kilometre or more out — and GPS only sharpens it a few seconds later.
         * A one-shot read takes that first rough answer and calls it done.
         *
         * So: keep the best fix seen, stop as soon as it is good enough, and
         * give up after a deadline with whatever we have. maximumAge is 0
         * because a cached fix is exactly what we are trying to avoid.
         */
        const GOOD_ENOUGH_METRES = 50;
        const DEADLINE_MS = 12_000;
        let best = null;
        let watchId = null;
        let timer = null;

        const finish = () => {
          if (watchId != null) navigator.geolocation.clearWatch(watchId);
          if (timer) clearTimeout(timer);
          if (!best) {
            setStatus('denied');
            setCoords(FALLBACK);
            resolve(FALLBACK);
            return;
          }
          const next = { lat: best.latitude, lng: best.longitude, label: 'Your location' };
          setCoords(next);
          setAccuracy(best.accuracy);
          setStatus('located');
          writeCached({ ...next, accuracy: best.accuracy });
          resolve(next);
        };

        watchId = navigator.geolocation.watchPosition(
          (position) => {
            const c = position.coords;
            // Only keep a reading that is actually tighter than what we have.
            if (!best || (c.accuracy ?? Infinity) < (best.accuracy ?? Infinity)) best = c;
            if ((best.accuracy ?? Infinity) <= GOOD_ENOUGH_METRES) finish();
          },
          () => {
            // A later error after a good fix should not discard it.
            if (best) finish();
            else {
              if (watchId != null) navigator.geolocation.clearWatch(watchId);
              if (timer) clearTimeout(timer);
              setStatus('denied');
              setCoords(FALLBACK);
              resolve(FALLBACK);
            }
          },
          { enableHighAccuracy: true, timeout: DEADLINE_MS, maximumAge: 0 },
        );

        timer = setTimeout(finish, DEADLINE_MS);
      }),
    [],
  );

  /**
   * Ask once, on the first visit that needs it. Browsers only surface the
   * native dialog on a real page load, and this is the moment the answer
   * actually changes what the patient sees.
   */
  const locateOnce = useCallback(async () => {
    let asked = false;
    try { asked = localStorage.getItem(ASKED_KEY) === '1'; } catch { /* no storage */ }
    if (asked || seed) return null;
    try { localStorage.setItem(ASKED_KEY, '1'); } catch { /* no storage */ }
    return locate();
  }, [locate, seed]);

  return {
    coords,
    accuracy,
    status,
    locate,
    locateOnce,
    setCoords,
    // True whenever the distances on screen are measured from the city centre
    // rather than from the patient. The UI must say so rather than imply
    // precision it does not have.
    isFallback: status !== 'located',
  };
};
