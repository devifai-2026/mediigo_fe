import { useRef, useEffect } from 'react';

// Auto-advancing boxes with paste support — pasting a 4-digit code from an SMS
// should just work rather than dropping every digit but the first.
export function OtpInput({ length = 4, value, onChange, onComplete }) {
  const refs = useRef([]);

  useEffect(() => { refs.current[0]?.focus(); }, []);

  const setAt = (i, char) => {
    const next = value.padEnd(length, ' ').split('');
    next[i] = char;
    const joined = next.join('').replace(/\s/g, '');
    onChange(joined);
    if (joined.length === length) onComplete?.(joined);
  };

  const handleKey = (i) => (e) => {
    if (e.key === 'Backspace' && !value[i]) refs.current[i - 1]?.focus();
  };

  const handleChange = (i) => (e) => {
    const digits = e.target.value.replace(/\D/g, '');
    if (!digits) { setAt(i, ''); return; }
    if (digits.length > 1) {
      // Pasted: fill forward from here.
      const merged = (value.slice(0, i) + digits).slice(0, length);
      onChange(merged);
      refs.current[Math.min(merged.length, length - 1)]?.focus();
      if (merged.length === length) onComplete?.(merged);
      return;
    }
    setAt(i, digits);
    if (i < length - 1) refs.current[i + 1]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          inputMode="numeric"
          maxLength={length}
          value={value[i] ?? ''}
          onChange={handleChange(i)}
          onKeyDown={handleKey(i)}
          aria-label={`Digit ${i + 1}`}
          className="w-12 h-14 text-center text-xl font-black bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 focus:bg-white transition"
        />
      ))}
    </div>
  );
}
