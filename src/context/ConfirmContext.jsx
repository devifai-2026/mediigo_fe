import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { Modal } from '../components/ui/Modal.jsx';
import { Button } from '../components/ui/Button.jsx';

const ConfirmContext = createContext(null);
export const useConfirm = () => useContext(ConfirmContext);

/**
 * Imperative confirm() that returns a Promise, replacing window.confirm.
 * Supports a typed-confirmation phrase for irreversible actions like deboarding.
 */
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const [typed, setTyped] = useState('');
  const resolver = useRef(null);

  const confirm = useCallback((options) => {
    setTyped('');
    setState(typeof options === 'string' ? { message: options } : options);
    return new Promise((resolve) => { resolver.current = resolve; });
  }, []);

  const close = (result) => {
    resolver.current?.(result);
    resolver.current = null;
    setState(null);
    setTyped('');
  };

  const needsPhrase = Boolean(state?.confirmPhrase);
  const phraseOk = !needsPhrase || typed.trim() === state.confirmPhrase;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal open={Boolean(state)} onClose={() => close(false)} title={state?.title || 'Please confirm'} size="sm">
        <p className="text-xs text-slate-600 leading-relaxed">{state?.message}</p>

        {state?.detail && (
          <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
            {state.detail}
          </div>
        )}

        {needsPhrase && (
          <div className="mt-4">
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
              Type <span className="font-mono text-slate-700">{state.confirmPhrase}</span> to confirm
            </label>
            <input
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-teal-600 focus:bg-white"
            />
          </div>
        )}

        <div className="mt-5 flex gap-2 justify-end">
          <Button variant="secondary" onClick={() => close(false)}>
            {state?.cancelLabel || 'Cancel'}
          </Button>
          <Button
            variant={state?.danger ? 'danger' : 'primary'}
            disabled={!phraseOk}
            onClick={() => close(true)}
          >
            {state?.confirmLabel || 'Confirm'}
          </Button>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}
