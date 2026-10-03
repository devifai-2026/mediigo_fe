import { useState } from 'react';
import clsx from 'clsx';
import { Icon } from '../ui/Icon.jsx';

/**
 * Pre-existing conditions, as chips.
 *
 * Common ones are one tap because almost everybody who has one has one of
 * these; anything else is free text, because a fixed list is wrong the first
 * time someone needs to declare what it omits, and "other" helps no doctor.
 */
const COMMON = ['Diabetes', 'Hypertension', 'Asthma', 'Thyroid', 'Heart disease', 'Kidney disease'];

export function ConditionsField({ value = [], onChange, label = 'Pre-existing conditions', hint }) {
  const [draft, setDraft] = useState('');
  const list = value || [];

  const toggle = (c) => {
    onChange(list.includes(c) ? list.filter((x) => x !== c) : [...list, c]);
  };

  const addDraft = () => {
    const v = draft.trim();
    // Case-insensitive match, so "diabetes" typed by hand does not sit beside
    // the "Diabetes" chip as a second, separate condition.
    if (!v || list.some((x) => x.toLowerCase() === v.toLowerCase())) { setDraft(''); return; }
    onChange([...list, v]);
    setDraft('');
  };

  return (
    <div>
      <p className="block text-[11px] font-semibold text-slate-700 mb-1.5">
        {label} <span className="font-normal text-slate-400">(optional)</span>
      </p>
      {hint && <p className="text-[10px] text-slate-400 mb-2">{hint}</p>}

      <div className="flex flex-wrap gap-1.5 mb-2">
        {COMMON.map((c) => (
          <button
            key={c} type="button" onClick={() => toggle(c)} aria-pressed={list.includes(c)}
            className={clsx(
              'text-[11px] font-medium px-2.5 py-1 rounded-full border transition',
              list.includes(c)
                ? 'bg-mg-teal text-white border-mg-teal'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400',
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {list.filter((c) => !COMMON.includes(c)).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {list.filter((c) => !COMMON.includes(c)).map((c) => (
            <span key={c} className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-mg-teal text-white">
              {c}
              <button type="button" onClick={() => toggle(c)} aria-label={`Remove ${c}`} className="hover:opacity-70">
                <Icon name="cross" className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text" value={draft} maxLength={60}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDraft(); } }}
          placeholder="Something else? Type and press Enter"
          className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-mg-teal"
        />
        <button
          type="button" onClick={addDraft} disabled={!draft.trim()}
          className="text-[11px] font-bold text-mg-teal disabled:text-slate-300 px-2"
        >
          Add
        </button>
      </div>
    </div>
  );
}
