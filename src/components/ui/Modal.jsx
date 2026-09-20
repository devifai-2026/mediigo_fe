import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { useFocusTrap } from '../../hooks/useFocusTrap.js';
import { Icon } from './Icon.jsx';

const SIZES = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

/**
 * Accessible dialog. The prototypes had no Escape handling, no focus trap, no
 * scroll lock and no aria attributes; all four are here.
 *
 * variant="sheet" gives the mobile bottom-sheet treatment the patient booking
 * flow uses, becoming a centred dialog at sm and up.
 */
export function Modal({ open, onClose, title, subtitle, children, size = 'md', variant = 'center', closeOnBackdrop = true }) {
  const panelRef = useRef(null);
  useFocusTrap(panelRef, open);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className={clsx(
        'fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center p-4 animate-fade-in',
        variant === 'sheet' ? 'items-end sm:items-center' : 'items-center',
      )}
      onMouseDown={(e) => { if (closeOnBackdrop && e.target === e.currentTarget) onClose?.(); }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Dialog'}
        className={clsx(
          'bg-white w-full shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]',
          SIZES[size],
          variant === 'sheet' ? 'rounded-t-3xl sm:rounded-3xl animate-slide-up' : 'rounded-3xl',
        )}
      >
        {title && (
          <div className="flex items-start justify-between gap-3 p-5 pb-3 border-b border-slate-100 shrink-0">
            <div>
              <h3 className="font-bold text-slate-900 text-base leading-tight">{title}</h3>
              {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
            >
              <Icon name="cross" className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="p-5 overflow-y-auto custom-scrollbar">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
