import { useState, useEffect } from 'react';

/**
 * An <img> that steps aside when it cannot load.
 *
 * A photo URL only promises that a string exists, not that it resolves. Storage
 * drivers get switched, buckets rotate, a CDN goes down — and a record that
 * rendered fine yesterday shows a torn-image glyph next to a person's name.
 * Every call site here already had a designed fallback (initials, an icon); it
 * was simply unreachable, because the branch tested the URL rather than the
 * load. This keeps that fallback and makes a failed load reach it.
 */
export function PhotoOrFallback({ src, fallback, className = '', alt = '' }) {
  const [failed, setFailed] = useState(false);

  // A new src deserves its own attempt: without this, one broken photo would
  // poison the slot for whoever the component is reused for next (a search
  // list recycles rows as the query changes).
  useEffect(() => { setFailed(false); }, [src]);

  if (!src || failed) return fallback;
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
