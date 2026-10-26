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
    // 'click', not 'pointerdown': unlocking hides the banner above the page,
    // and on pointerdown the content jumps up mid-tap, so the tap lands on
    // whatever slid under the finger. A click has already been delivered.
    window.addEventListener('click', handler, { once: true });
    window.addEventListener('keydown', handler, { once: true });
    return () => {
      window.removeEventListener('click', handler);
      window.removeEventListener('keydown', handler);
    };
  }, [auto, ready]);

  return { ready, unlock: doUnlock };
};
