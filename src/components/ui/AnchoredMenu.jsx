import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';

/**
 * A dropdown that escapes its container's clipping.
 *
 * The Explore hero needs `overflow-hidden` to clip its gradient and banner
 * image, but that also clips any absolutely-positioned child — so the location
 * and suggestion menus were cut off at the hero's edge and the options below
 * the fold were simply invisible.
 *
 * Rendering into a portal at document.body sidesteps the clip entirely. The
 * cost is that position has to be computed rather than inherited, which is what
 * everything below does: measure the anchor, follow it on scroll and resize.
 */
export function AnchoredMenu({ anchorRef, open, onClose, children, className, minWidth = 200 }) {
  const [rect, setRect] = useState(null);

  const measure = useCallback(() => {
    const el = anchorRef?.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ top: r.bottom + 4, left: r.left, width: r.width });
  }, [anchorRef]);

  useEffect(() => {
    if (!open) return undefined;
    measure();

    // `true` captures scrolls on ANY ancestor, not just the window — the menu
    // would otherwise detach from its anchor inside a scrollable panel.
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [open, measure]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    // mousedown, not click: a click listener fires after the input's blur has
    // already closed the menu, so the selection never registers.
    const onAway = (e) => {
      if (anchorRef?.current?.contains(e.target)) return;
      if (e.target.closest?.('[data-anchored-menu]')) return;
      onClose?.();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onAway);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onAway);
    };
  }, [open, onClose, anchorRef]);

  if (!open || !rect) return null;

  return createPortal(
    <div
      data-anchored-menu=""
      style={{
        position: 'fixed',
        top: rect.top,
        left: rect.left,
        width: Math.max(rect.width, minWidth),
        // Never taller than the space left below the anchor, so the last option
        // is always reachable instead of running off the viewport.
        maxHeight: `calc(100vh - ${rect.top}px - 16px)`,
      }}
      className={clsx(
        'z-50 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden overflow-y-auto',
        className,
      )}
    >
      {children}
    </div>,
    document.body,
  );
}
