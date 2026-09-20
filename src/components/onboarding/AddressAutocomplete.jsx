import { useState, useEffect, useRef } from 'react';
import { api, unwrap } from '../../lib/api.js';
import { Field, Input } from '../ui/Field.jsx';

/**
 * Address search backed by Google Places, proxied through our own API so the
 * key stays server-side.
 *
 * Picking a suggestion fills city, state, PIN and coordinates from Google
 * rather than from the agent's memory — a mistyped PIN otherwise survives all
 * the way to an admin's review queue. Fields stay editable for the cases
 * Google gets wrong, and typing an address by hand still works if Places is
 * unavailable.
 */
export function AddressAutocomplete({ onResolved, disabled }) {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const boxRef = useRef(null);
  const timer = useRef(null);

  useEffect(() => {
    const onClickAway = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, []);

  useEffect(() => {
    if (query.trim().length < 3) { setItems([]); return undefined; }
    // Debounced: Places bills per keystroke otherwise.
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const d = unwrap(await api.get(`/api/onboarding/address/suggest?q=${encodeURIComponent(query)}`));
        setEnabled(d.enabled);
        setItems(d.suggestions ?? []);
        setOpen(true);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(timer.current);
  }, [query]);

  const pick = async (s) => {
    setOpen(false);
    setQuery(s.description);
    setLoading(true);
    try {
      const r = unwrap(await api.get(`/api/onboarding/address/resolve?placeId=${s.placeId}`));
      if (r) onResolved?.(r);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={boxRef} className="relative">
      <Field
        label="Search the clinic on Google"
        hint={enabled
          ? 'Pick a result to fill the address, PIN and map location automatically'
          : 'Address search unavailable — fill the fields below by hand'}
      >
        <div className="relative">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-3 text-slate-400 text-xs" />
          <Input
            value={query}
            disabled={disabled || !enabled}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => items.length && setOpen(true)}
            placeholder="e.g. Apollo Multispeciality Hospital, Kolkata"
            className="pl-9"
          />
          {loading && (
            <i className="fa-solid fa-circle-notch fa-spin absolute right-3 top-3 text-teal-600 text-xs" />
          )}
        </div>
      </Field>

      {open && items.length > 0 && (
        <div className="absolute z-30 left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
          {items.map((s) => (
            <button
              key={s.placeId}
              type="button"
              onClick={() => pick(s)}
              className="w-full text-left px-3 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition"
            >
              <p className="text-xs font-bold text-slate-800 truncate">{s.main}</p>
              <p className="text-[11px] text-slate-500 truncate">{s.secondary}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
