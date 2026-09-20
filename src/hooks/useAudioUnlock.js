import { useState, useEffect, useCallback } from 'react';
import { unlock, isUnlocked } from '../lib/audio.js';

/**
 * Browsers block audio and speech until a user gesture. We listen once for any
 * interaction anywhere in the app and prime both engines then.
 */
export const useAudioUnlock = ({ auto = true } = {}) => {
  const [ready, setReady] = useState(() => isUnlocked());

  const doUnlock = useCallback(async () => {
    const okNow = await unlock();
    setReady(okNow);
    return okNow;
  }, []);

  useEffect(() => {
    if (!auto || ready) return undefined;
    const handler = async () => {
      const okNow = await unlock();
      if (okNow) setReady(true);
    };
    window.addEventListener('pointerdown', handler, { once: true });
    window.addEventListener('keydown', handler, { once: true });
    return () => {
      window.removeEventListener('pointerdown', handler);
      window.removeEventListener('keydown', handler);
    };
  }, [auto, ready]);

  return { ready, unlock: doUnlock };
};
