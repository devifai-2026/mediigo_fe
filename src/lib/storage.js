// Per-viewer conveniences only. Every accessor is guarded: storage throws in
// private windows and with site data blocked, and must never break a render.
const NS = 'mediigo:';

export const get = (key, fallback = null) => {
  try {
    const raw = localStorage.getItem(NS + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

export const set = (key, value) => {
  try {
    localStorage.setItem(NS + key, JSON.stringify(value));
  } catch {
    /* quota or blocked — non-fatal */
  }
};

export const remove = (key) => {
  try {
    localStorage.removeItem(NS + key);
  } catch {
    /* non-fatal */
  }
};

export const clearAll = () => {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(NS))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* non-fatal */
  }
};
