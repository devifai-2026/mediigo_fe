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
        <p className="text-sm text-slate-600 leading-relaxed">{state?.message}</p>

        {state?.detail && (
          <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
            {state.detail}
          </div>
        )}

        {needsPhrase && (
          <div className="mt-4">
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Type <span className="font-mono text-slate-700">{state.confirmPhrase}</span> to confirm
            </label>
            <input
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-base sm:text-sm focus:outline-none focus:border-mg-teal focus:ring-2 focus:ring-mg-teal/20"
            />
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
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
