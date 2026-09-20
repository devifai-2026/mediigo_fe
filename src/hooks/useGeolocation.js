import { useState, useCallback } from 'react';

// Fallback centre: Kolkata. The prototype's handler hardcoded a city in BOTH
// the success and error branches and never read position.coords, so "Near Me"
// did nothing. Here success genuinely uses the device coordinates.
const FALLBACK = { lat: 22.5726, lng: 88.3639, label: 'Kolkata' };

export const useGeolocation = () => {
  const [coords, setCoords] = useState(FALLBACK);
  const [status, setStatus] = useState('idle'); // idle | locating | located | denied | unsupported
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
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const next = { lat: position.coords.latitude, lng: position.coords.longitude, label: 'Your location' };
            setCoords(next);
            setAccuracy(position.coords.accuracy);
            setStatus('located');
            resolve(next);
          },
          () => {
            // Genuinely distinct from success: we keep the fallback and say so.
            setStatus('denied');
            setCoords(FALLBACK);
            resolve(FALLBACK);
          },
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
        );
      }),
    [],
  );

  return { coords, accuracy, status, locate, setCoords, isFallback: status !== 'located' };
};
