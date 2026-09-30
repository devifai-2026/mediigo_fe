import { createContext, useContext, useState, useCallback, useRef } from 'react';
import clsx from 'clsx';

const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

// Replaces the ~10 alert() calls scattered through the prototypes.
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  /**
   * `key` makes a toast REPLACE the previous one carrying that key instead of
   * stacking beside it. Repeated feedback about the same thing — a search that
   * keeps finding nothing as the user types — should read as one message being
   * updated, not a pile of near-identical warnings.
   */
  const push = useCallback((message, { type = 'info', duration = 4000, key } = {}) => {
    const id = ++idRef.current;
    setToasts((t) => [...(key ? t.filter((x) => x.key !== key) : t), { id, message, type, key }]);
    if (duration) setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  const api = {
    push,
    success: (m, o) => push(m, { ...o, type: 'success' }),
    error: (m, o) => push(m, { ...o, type: 'error', duration: 6000 }),
    warn: (m, o) => push(m, { ...o, type: 'warn' }),
    dismiss,
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed bottom-24 md:bottom-6 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => dismiss(t.id)}
            className={clsx(
              'pointer-events-auto max-w-sm text-left px-4 py-3 rounded-2xl shadow-lg border text-xs font-semibold animate-slide-up',
              t.type === 'success' && 'bg-emerald-50 border-emerald-200 text-emerald-800',
              t.type === 'error' && 'bg-rose-50 border-rose-200 text-rose-700',
              t.type === 'warn' && 'bg-amber-50 border-amber-200 text-amber-800',
              t.type === 'info' && 'bg-slate-900 border-slate-700 text-white',
            )}
          >
            {t.message}
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
