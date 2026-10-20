import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Kolkata — the default onboarding state — until a pin or a search moves it.
const DEFAULT_CENTER = [22.5726, 88.3639];

// A div icon rather than Leaflet's image markers: those resolve their PNGs by
// URL relative to the CSS, which a bundler rewrites, and render as broken images.
const pinIcon = L.divIcon({
  className: '',
  html: '<i class="fa-solid fa-location-dot" style="font-size:34px;color:#0f766e;filter:drop-shadow(0 2px 2px rgba(0,0,0,.35))"></i>',
  iconSize: [26, 34],
  iconAnchor: [13, 34],
});

/**
 * Pick the clinic's exact location on a map: tap to drop the pin, drag it to
 * adjust, or use the device's GPS while standing at the clinic.
 *
 * OpenStreetMap tiles via Leaflet, so it works with no API key — the pin, not
 * the map provider, is what patient search uses. `value` is { lat, lng } or
 * null; a value set from outside (an address search) re-centres the map.
 */
export function MapPicker({ value, onChange, height = 'h-72' }) {
  const box = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState('');

  const place = (lat, lng) => {
    const pos = [lat, lng];
    if (!marker.current) {
      marker.current = L.marker(pos, { icon: pinIcon, draggable: true }).addTo(map.current);
      marker.current.on('dragend', () => {
        const p = marker.current.getLatLng();
        onChangeRef.current?.({ lat: p.lat, lng: p.lng });
      });
    } else {
      marker.current.setLatLng(pos);
    }
  };

  useEffect(() => {
    map.current = L.map(box.current, { zoomControl: true }).setView(
      value ? [value.lat, value.lng] : DEFAULT_CENTER,
      value ? 17 : 12,
    );
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map.current);
    if (value) place(value.lat, value.lng);
    map.current.on('click', (e) => {
      place(e.latlng.lat, e.latlng.lng);
      onChangeRef.current?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    });
    // Inside a modal or a step that just became visible, the container's size
    // was unknown at construction; re-measure once it has laid out.
    const t = setTimeout(() => map.current?.invalidateSize(), 200);
    return () => { clearTimeout(t); map.current?.remove(); map.current = null; marker.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Follow a pin set from outside (address search), without fighting a drag.
  useEffect(() => {
    if (!map.current || !value) return;
    const cur = marker.current?.getLatLng();
    if (cur && Math.abs(cur.lat - value.lat) < 1e-7 && Math.abs(cur.lng - value.lng) < 1e-7) return;
    place(value.lat, value.lng);
    map.current.setView([value.lat, value.lng], Math.max(map.current.getZoom(), 17));
  }, [value?.lat, value?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  const useMyLocation = () => {
    if (!navigator.geolocation) { setGeoError('This device cannot share its location'); return; }
    setLocating(true);
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        onChange?.({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        setLocating(false);
        setGeoError(err.code === 1 ? 'Location permission was denied — tap the map instead' : 'Could not get a GPS fix — tap the map instead');
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-700">
          Clinic location on map <span className="text-rose-500">*</span>
        </p>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-mg-teal text-mg-teal hover:bg-teal-50 text-[11px] font-medium disabled:opacity-60"
        >
          <i className={locating ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-location-crosshairs'} aria-hidden="true" />
          {locating ? 'Locating…' : 'Use my current location'}
        </button>
      </div>
      <div ref={box} className={`${height} w-full rounded-lg border border-slate-200 overflow-hidden z-0`} />
      <p className="text-[11px] text-slate-500">
        {value
          ? <>Pinned at <span className="font-mono">{value.lat.toFixed(6)}, {value.lng.toFixed(6)}</span> — drag the pin to the clinic’s entrance if it is off.</>
          : 'Tap the map at the clinic’s entrance, or use your current location if you are there now.'}
      </p>
      {geoError && <p className="text-[11px] text-rose-600">{geoError}</p>}
    </div>
  );
}
