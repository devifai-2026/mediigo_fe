/**
 * Call-chime and voice announcement.
 *
 * One module-level AudioContext. The prototype created a fresh one on every
 * call, which leaks — browsers cap you at roughly six before new ones fail
 * silently, so a busy chamber would go mute partway through the morning.
 */
let ctx = null;
let unlocked = false;
let voicesReady = null;

const getCtx = () => {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
};

export const isUnlocked = () => unlocked && ctx?.state === 'running';

/**
 * Browsers require a user gesture before audio OR speech will play. Chrome
 * needs one for each independently, so we prime both here.
 */
export const unlock = async () => {
  const c = getCtx();
  if (!c) return false;
  try {
    if (c.state === 'suspended') await c.resume();
    // Silent one-frame blip: satisfies the gesture requirement inaudibly.
    const osc = c.createOscillator();
    const gain = c.createGain();
    gain.gain.setValueAtTime(0, c.currentTime);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + 0.01);

    if ('speechSynthesis' in window) {
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
    }
    unlocked = true;
    return true;
  } catch {
    return false;
  }
};

/** Two-note chime: D5 -> A5, exactly as the clinic prototype defined it. */
export const chime = () => {
  const c = getCtx();
  if (!c) return;
  try {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, c.currentTime);
    osc.frequency.setValueAtTime(880, c.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + 0.4);
  } catch {
    /* audio is a nicety, never fail a render over it */
  }
};

// getVoices() is empty until the engine loads; resolve once and cache.
const loadVoices = () => {
  if (voicesReady) return voicesReady;
  voicesReady = new Promise((resolve) => {
    const existing = window.speechSynthesis?.getVoices?.() ?? [];
    if (existing.length) return resolve(existing);
    const handler = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', handler);
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis?.addEventListener?.('voiceschanged', handler);
    setTimeout(() => resolve(window.speechSynthesis?.getVoices?.() ?? []), 1500);
  });
  return voicesReady;
};

export const speak = async (text, { lang = 'en-IN', rate = 0.9, pitch = 1.0 } = {}) => {
  if (!('speechSynthesis' in window)) return;
  try {
    const voices = await loadVoices();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    utter.rate = rate;
    utter.pitch = pitch;
    // Prefer an Indian English voice, then any English, then the default.
    const pick =
      voices.find((v) => v.lang === lang) ||
      voices.find((v) => v.lang?.startsWith('en-IN')) ||
      voices.find((v) => v.lang?.startsWith('en-GB')) ||
      voices.find((v) => v.lang?.startsWith('en'));
    if (pick) utter.voice = pick;
    window.speechSynthesis.speak(utter);
  } catch {
    /* non-fatal */
  }
};

// Announcement ids we have already played. A reconnect can redeliver the same
// event, and a waiting room must not hear the same token shouted twice.
const played = new Set();

export const announce = async ({ announcementId, text, lang = 'en-IN' }) => {
  if (announcementId) {
    if (played.has(announcementId)) return;
    played.add(announcementId);
    if (played.size > 200) played.delete(played.values().next().value);
  }
  chime();
  setTimeout(() => speak(text, { lang }), 450);
};
