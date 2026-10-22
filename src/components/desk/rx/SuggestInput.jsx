import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import clsx from 'clsx';
import { AnchoredMenu } from '../../ui/AnchoredMenu.jsx';

/**
 * A text input with a keyboard-driven suggestion list.
 *
 * `load(query)` returns the suggestions (sync or async) and is called as the
 * user types, and on focus with whatever is already there — so an empty
 * medicine row opens on the doctor's most-written medicines. The text stays
 * free: nothing has to come from the list.
 *
 * ↑/↓ move, Enter picks, Esc closes. Enter with the list closed is passed on
 * to `onEnter`, which the pad uses to jump to the next row.
 */
export const SuggestInput = forwardRef(function SuggestInput(
  { value, onChange, onPick, onEnter, load, renderItem, itemKey, heading, minWidth = 320, className, onFocus, ...rest },
  ref,
) {
  const inputRef = useRef(null);
  useImperativeHandle(ref, () => inputRef.current);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  // The query `items` answer — they lag the input by the debounce.
  const [itemsFor, setItemsFor] = useState(null);
  const [active, setActive] = useState(0);
  const seq = useRef(0);

  const refresh = (q) => {
    const mine = ++seq.current;
    Promise.resolve(load(q)).then((list) => {
      if (mine !== seq.current) return;
      setItems(list || []);
      setItemsFor(q);
      setActive(0);
    }).catch(() => {});
  };

  // Debounced while typing; the list only follows what the user typed.
  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(() => refresh(value), 120);
    return () => clearTimeout(t);
  }, [value, open]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (item) => {
    setOpen(false);
    onPick(item);
  };

  const onKeyDown = (e) => {
    const showing = open && items.length > 0;
    if (e.key === 'ArrowDown' && showing) { e.preventDefault(); setActive((a) => (a + 1) % items.length); return; }
    if (e.key === 'ArrowUp' && showing) { e.preventDefault(); setActive((a) => (a - 1 + items.length) % items.length); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (showing && itemsFor === value) pick(items[active]);
      else if (open && value.trim()) {
        // Typed faster than the list refreshed: answer for what is in the box
        // now, never for the stale list on screen.
        const mine = ++seq.current;
        Promise.resolve(load(value)).then((list) => {
          if (mine !== seq.current) return;
          if (list?.length) pick(list[0]); else onEnter?.();
        }).catch(() => onEnter?.());
      } else onEnter?.();
      return;
    }
    if (e.key === 'Escape') setOpen(false);
  };

  return (
    <>
      <input
        ref={inputRef}
        value={value}
        autoComplete="off"
        className={className}
        role="combobox"
        aria-expanded={open && items.length > 0}
        aria-autocomplete="list"
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        {...rest}
        onFocus={(e) => { setOpen(true); onFocus?.(e); }}
        onKeyDown={onKeyDown}
        // Tabbing away must close it too; picks use mousedown, so never blur first.
        onBlur={() => setOpen(false)}
      />
      <AnchoredMenu anchorRef={inputRef} open={open && items.length > 0} onClose={() => setOpen(false)} minWidth={minWidth} className="py-1 max-h-80">
        {heading && <p className="px-3 pt-1.5 pb-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">{heading(value)}</p>}
        <ul role="listbox">
          {items.map((item, i) => (
            <li key={itemKey(item)} role="option" aria-selected={i === active}>
              <button
                type="button"
                // mousedown so the pick lands before the input's blur.
                onMouseDown={(e) => { e.preventDefault(); pick(item); }}
                onMouseEnter={() => setActive(i)}
                className={clsx('w-full text-left px-3 py-2 transition', i === active ? 'bg-teal-50' : 'hover:bg-slate-50')}
              >
                {renderItem(item)}
              </button>
            </li>
          ))}
        </ul>
      </AnchoredMenu>
    </>
  );
});
