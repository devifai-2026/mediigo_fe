import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { api, unwrap } from '../../../lib/api.js';
import { SuggestInput } from './SuggestInput.jsx';

export const blankMed = () => ({ name: '', dosage: '1-0-1', duration: '5 Days', instruction: 'After meals' });
export const isBlank = (m) => !m.name.trim();

const DOSE_CHIPS = ['1-0-1', '1-0-0', '0-0-1', '1-1-1', '0-1-0', '½-0-½', 'SOS'];
const DAYS_CHIPS = ['3 Days', '5 Days', '7 Days', '10 Days', '15 Days', '1 Month', 'Continue'];
const WHEN_CHIPS = ['After meals', 'Before meals', 'Before breakfast', 'At bedtime', 'Empty stomach'];

// Suggestions per query, for the life of the page. Cleared after a save, since
// that changes what the doctor "usually" writes.
const cache = new Map();
export const clearMedicineCache = () => cache.clear();
export const loadMedicines = async (q) => {
  const key = q.trim().toLowerCase();
  if (!cache.has(key)) {
    cache.set(key, api.get('/api/prescriptions/medicines', { params: { q: key } }).then(unwrap).catch((e) => {
      cache.delete(key);
      throw e;
    }));
  }
  return cache.get(key);
};

const words = (s) => s.toLowerCase().split(/[^a-z0-9.½%/]+/).filter(Boolean);
const FORM_WORDS = new Set(['tab', 'cap', 'syr']);

/**
 * A spoken name → the formulary entry it means, or the words as heard.
 * Only an entry whose own name contains every spoken word counts, so "Dolo
 * 650" becomes "Tab Dolo 650" but "Paracetamol 650" never turns into a brand.
 */
export const resolveSpoken = async (spoken) => {
  const list = await loadMedicines(spoken.name).catch(() => []);
  const said = words(spoken.name).filter((w) => !FORM_WORDS.has(w));
  const hit = said.length ? list.find((item) => said.every((q) => words(item.name).some((t) => t.startsWith(q)))) : null;
  const base = hit ? fromSuggestion(hit) : { ...blankMed(), name: spoken.name };
  const heard = Object.fromEntries(['dosage', 'duration', 'instruction'].filter((k) => spoken[k]).map((k) => [k, spoken[k]]));
  return { ...base, ...heard, check: true };
};

/** A suggestion → a pad row, keeping the defaults where it has no opinion. */
export const fromSuggestion = (item) => {
  const blank = blankMed();
  return {
    name: item.name,
    dosage: item.dosage || blank.dosage,
    duration: item.duration ?? blank.duration,
    instruction: item.instruction || blank.instruction,
  };
};

function MedicineSuggestion({ item }) {
  const how = [item.dosage, item.duration, item.instruction].filter(Boolean).join(' · ');
  return (
    <span className="flex items-start justify-between gap-3">
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-slate-900 truncate">{item.name}</span>
        {item.generic && <span className="block text-[11px] text-slate-500 truncate">{item.generic}</span>}
      </span>
      <span className="shrink-0 text-right max-w-[45%]">
        {item.source === 'mine' && (
          <span className="block text-[10px] font-semibold text-mg-teal">
            <i className="fa-solid fa-star text-[8px] mr-0.5" aria-hidden="true" />Your usual{item.count > 1 ? ` · ${item.count}×` : ''}
          </span>
        )}
        {how && <span className="block text-[10px] text-slate-500 truncate">{how}</span>}
      </span>
    </span>
  );
}

function ChipRow({ label, options, value, onPick }) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
      <span className="w-12 shrink-0 text-[10px] font-medium uppercase text-slate-400">{label}</span>
      {options.map((v) => (
        <button
          key={v}
          type="button"
          // mousedown + preventDefault: tapping a chip must not pull focus off
          // the row the doctor is typing in.
          onMouseDown={(e) => { e.preventDefault(); onPick(v); }}
          className={clsx(
            'shrink-0 px-2 py-0.5 rounded-full border text-[11px] transition',
            value === v ? 'bg-mg-teal border-mg-teal text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-mg-teal hover:text-mg-teal',
          )}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

/**
 * The medicine table. Typing a name suggests from the doctor's history and the
 * formulary; picking one fills the whole row and moves to a fresh row, so a
 * routine pad is a few letters and Enter per medicine. Dose, course and timing
 * are one tap each on the chips under the row being edited.
 */
export function MedicineRows({ meds, setMeds }) {
  const listRef = useRef(null);
  const [activeRow, setActiveRow] = useState(null);
  const [focusRow, setFocusRow] = useState(null);

  useEffect(() => {
    if (focusRow == null) return;
    listRef.current?.querySelector(`[data-med-name="${focusRow}"]`)?.focus();
    setFocusRow(null);
  }, [focusRow, meds.length]);

  // Any edit by hand means the doctor has looked at the row.
  const setMed = (i, patch) => setMeds((m) => m.map((x, j) => (j === i ? { ...x, ...patch, check: false } : x)));

  const goToRow = (i) => {
    setMeds((m) => (i >= m.length ? [...m, blankMed()] : m));
    setFocusRow(i);
  };

  const pick = (i, item) => {
    setMeds((m) => {
      const next = m.map((x, j) => (j === i ? fromSuggestion(item) : x));
      return i === next.length - 1 && next.length < 30 ? [...next, blankMed()] : next;
    });
    // Chips stay on the medicine just picked; the cursor waits on the next.
    setActiveRow(i);
    setFocusRow(i + 1);
  };

  const remove = (i) => {
    setMeds((x) => (x.length > 1 ? x.filter((_, j) => j !== i) : [blankMed()]));
    setActiveRow(null);
  };

  const onFieldKey = (i) => (e) => {
    if (e.key === 'Enter') { e.preventDefault(); goToRow(i + 1); }
  };

  return (
    <div ref={listRef} className="border border-slate-200 rounded-lg overflow-hidden">
      <div className="hidden sm:grid grid-cols-12 gap-2 px-3 py-2 bg-mg-surface text-[10px] font-medium uppercase text-slate-500">
        <span className="col-span-5">Medicine name</span>
        <span className="col-span-2">Dosage</span>
        <span className="col-span-2">Duration</span>
        <span className="col-span-3">Timing / notes</span>
      </div>
      <div className="divide-y divide-slate-100">
        {meds.map((m, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <div key={i} className={clsx('transition-colors', m.check && 'bg-amber-50')} onFocus={() => { if (!isBlank(m)) setActiveRow(i); }}>
            <div className="grid grid-cols-12 gap-2 p-2 items-center">
              <SuggestInput
                data-med-name={i}
                className="col-span-12 sm:col-span-5 rx-input font-medium"
                placeholder={i === 0 ? 'Type 2–3 letters, e.g. dol, pan, azi' : 'Next medicine…'}
                value={m.name}
                maxLength={120}
                aria-label="Medicine name"
                onChange={(v) => setMed(i, { name: v })}
                onPick={(item) => pick(i, item)}
                onEnter={() => { if (!isBlank(m)) goToRow(i + 1); }}
                load={loadMedicines}
                itemKey={(item) => `${item.source}:${item.name}`}
                heading={(q) => (q.trim() ? 'Suggestions' : 'Your most-written medicines')}
                renderItem={(item) => <MedicineSuggestion item={item} />}
                minWidth={360}
              />
              <input
                className="col-span-4 sm:col-span-2 rx-input" placeholder="1-0-1" value={m.dosage} maxLength={40}
                list="rx-dosage-hints" aria-label="Dosage" onChange={(e) => setMed(i, { dosage: e.target.value })} onKeyDown={onFieldKey(i)}
              />
              <input
                className="col-span-4 sm:col-span-2 rx-input" placeholder="5 Days" value={m.duration} maxLength={40}
                list="rx-duration-hints" aria-label="Duration" onChange={(e) => setMed(i, { duration: e.target.value })} onKeyDown={onFieldKey(i)}
              />
              <div className="col-span-4 sm:col-span-3 flex items-center gap-1">
                <input
                  className="rx-input min-w-0" placeholder="After meals" value={m.instruction} maxLength={120}
                  list="rx-timing-hints" aria-label="Timing or notes" onChange={(e) => setMed(i, { instruction: e.target.value })} onKeyDown={onFieldKey(i)}
                />
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 shrink-0"
                  aria-label="Remove medicine"
                >
                  <i className="fa-solid fa-trash-can text-xs" aria-hidden="true" />
                </button>
              </div>
            </div>
            {activeRow === i && !isBlank(m) && (
              <div className="px-3 pb-2.5 space-y-1.5">
                <ChipRow label="Dose" options={DOSE_CHIPS} value={m.dosage} onPick={(v) => setMed(i, { dosage: v })} />
                <ChipRow label="For" options={DAYS_CHIPS} value={m.duration} onPick={(v) => setMed(i, { duration: v })} />
                <ChipRow label="When" options={WHEN_CHIPS} value={m.instruction} onPick={(v) => setMed(i, { instruction: v })} />
              </div>
            )}
          </div>
        ))}
      </div>
      <datalist id="rx-dosage-hints">{['1-0-1', '1-1-1', '1-0-0', '0-0-1', '0-1-0', '1-1-1-1', 'SOS'].map((v) => <option key={v} value={v} />)}</datalist>
      <datalist id="rx-duration-hints">{['1 Day', '3 Days', '5 Days', '7 Days', '10 Days', '14 Days', '1 Month', 'Continue'].map((v) => <option key={v} value={v} />)}</datalist>
      <datalist id="rx-timing-hints">{['After meals', 'Before meals', 'Before breakfast', 'At bedtime', 'With food', 'Empty stomach'].map((v) => <option key={v} value={v} />)}</datalist>
    </div>
  );
}
