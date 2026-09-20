import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps, mapsConfigured, directionsUrl } from '../../lib/maps.js';

/**
 * Location panel. Renders a real Google map when a key is configured, and
 * degrades to coordinates plus an "open in Maps" link when it is not — so the
 * profile is useful before the key exists.
 */
export function ClinicMap({ coordinates, name, height = 'h-56' }) {
  const ref = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!coordinates || !mapsConfigured() || !ref.current) return;
    let cancelled = false;

    loadGoogleMaps()
      .then((lib) => {
        if (cancelled || !ref.current) return;
        const center = { lat: coordinates.lat, lng: coordinates.lng };
        const map = new lib.Map(ref.current, {
          center,
          zoom: 15,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          // AdvancedMarkerElement needs a mapId; DEMO_MAP_ID is Google's
          // no-setup default and works without a Cloud-configured style.
          mapId: 'DEMO_MAP_ID',
        });
        if (lib.AdvancedMarkerElement) {
          new lib.AdvancedMarkerElement({ position: center, map, title: name });
        } else if (lib.Marker) {
          new lib.Marker({ position: center, map, title: name });
        }
      })
      .catch((e) => !cancelled && setError(e.message));

    return () => { cancelled = true; };
  }, [coordinates, name]);

  if (!coordinates) {
    return (
      <div className={`${height} rounded-2xl bg-slate-50 border border-dashed border-slate-300 grid place-items-center`}>
        <div className="text-center px-4">
          <i className="fa-solid fa-location-dot text-slate-300 text-2xl" />
          <p className="text-xs font-bold text-slate-500 mt-2">No coordinates on file</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            This clinic cannot appear in patient search until it is geocoded.
          </p>
        </div>
      </div>
    );
  }

  const link = directionsUrl(coordinates);

  if (!mapsConfigured() || error) {
    return (
      <div className={`${height} rounded-2xl bg-slate-50 border border-slate-200 grid place-items-center`}>
        <div className="text-center px-4">
          <i className="fa-solid fa-map-location-dot text-teal-600 text-2xl" />
          <p className="text-xs font-mono font-bold text-slate-700 mt-2">
            {coordinates.lat.toFixed(5)}, {coordinates.lng.toFixed(5)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {error ? `Map unavailable — ${error}` : 'Add VITE_GMAPS_KEY to show the map inline'}
          </p>
          <a
            href={link} target="_blank" rel="noreferrer"
            className="inline-block mt-3 text-[11px] font-bold text-teal-700 hover:underline"
          >
            Open in Google Maps →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div ref={ref} className={`${height} rounded-2xl border border-slate-200 overflow-hidden`} />
      <a href={link} target="_blank" rel="noreferrer" className="text-[11px] font-bold text-teal-700 hover:underline">
        Open in Google Maps →
      </a>
    </div>
  );
}
