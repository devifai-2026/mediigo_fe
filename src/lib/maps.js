/**
 * Google Maps JS loader — memoised, so the ~200kB script is fetched once and
 * only on pages that actually render a map.
 *
 * VITE_GMAPS_KEY is inlined into the bundle and therefore public; the real
 * protection is an HTTP-referrer restriction in the Google Cloud console.
 */
let promise = null;

const PLACEHOLDER = /^x+$/i;

export const mapsKey = () => {
  const k = (import.meta.env.VITE_GMAPS_KEY || '').trim();
  // XXXX is the documented placeholder — treat it as unset so the UI shows the
  // coordinate fallback instead of firing a doomed request at Google.
  return PLACEHOLDER.test(k) ? '' : k;
};
export const mapsConfigured = () => Boolean(mapsKey());

export const loadGoogleMaps = () => {
  if (!mapsConfigured()) return Promise.reject(new Error('No Maps key configured'));
  if (promise) return promise;

  promise = new Promise((resolve, reject) => {
    const ready = () => {
      // With loading=async the constructors are not on window.google.maps
      // until importLibrary resolves — reading them straight off it yields
      // "maps.Map is not a constructor".
      window.google.maps
        .importLibrary('maps')
        .then((mapsLib) =>
          window.google.maps.importLibrary('marker').then((markerLib) => resolve({ ...mapsLib, ...markerLib })),
        )
        .catch(reject);
    };

    if (window.google?.maps?.importLibrary) return ready();

    // With loading=async the script's onload can fire a tick before
    // google.maps.importLibrary is attached, so poll briefly rather than
    // failing on the first look.
    const waitForApi = (tries = 0) => {
      if (window.google?.maps?.importLibrary) return ready();
      if (tries > 60) return reject(new Error('Maps failed to load'));
      return setTimeout(() => waitForApi(tries + 1), 50);
    };

    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${mapsKey()}&loading=async&libraries=maps,marker&v=weekly`;
    s.async = true;
    s.onload = () => waitForApi();
    s.onerror = () => reject(new Error('Maps script blocked or key rejected'));
    document.head.appendChild(s);
  });
  return promise;
};

export const directionsUrl = ({ lat, lng }) =>
  `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
