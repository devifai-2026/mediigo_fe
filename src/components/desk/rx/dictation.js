import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Voice dictation for the prescription pad.
 *
 * Uses the browser's own speech recognition (Chrome, Edge, Safari), so there is
 * nothing to install and no key to manage. In Indian English, so "Dolo six
 * fifty, one zero one, five days, after food" comes through as written.
 */

const Recognition = typeof window !== 'undefined'
  ? window.SpeechRecognition || window.webkitSpeechRecognition
  : null;

export const dictationSupported = Boolean(Recognition);

export function useDictation({ onPhrase, lang = 'en-IN' }) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState(null);
  const rec = useRef(null);
  const wanted = useRef(false);
  const handler = useRef(onPhrase);
  handler.current = onPhrase;

  const stop = useCallback(() => {
    wanted.current = false;
    rec.current?.stop();
    setInterim('');
  }, []);

  const start = useCallback(() => {
    if (!Recognition || wanted.current) return;
    const r = new Recognition();
    r.lang = lang;
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let live = '';
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        const text = e.results[i][0].transcript;
        if (e.results[i].isFinal) handler.current(text.trim());
        else live += text;
      }
      setInterim(live);
    };
    r.onerror = (e) => {
      // Silence is normal in a consultation; anything else ends the session.
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      wanted.current = false;
      setError(e.error === 'not-allowed' || e.error === 'service-not-allowed'
        ? 'Microphone access is blocked. Allow it from the address bar and try again.'
        : 'Voice input stopped. Tap the mic to start again.');
    };
    // Chrome ends a session after a stretch of silence; keep listening until
    // the doctor turns it off.
    r.onend = () => {
      if (wanted.current) {
        try { r.start(); return; } catch { /* fall through to stopped */ }
      }
      wanted.current = false;
      setListening(false);
      setInterim('');
    };
    rec.current = r;
    wanted.current = true;
    setError(null);
    setListening(true);
    r.start();
  }, [lang]);

  useEffect(() => () => { wanted.current = false; rec.current?.abort(); }, []);

  return { listening, interim, error, start, stop };
}

// ---- turning a spoken line into pad entries --------------------------------

const UNITS = { zero: 0, nil: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9 };
const TEENS = { ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 };
const TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const NUMBER_RUN = new RegExp(`\\b(?:(?:${[...Object.keys(UNITS), ...Object.keys(TEENS), ...Object.keys(TENS), 'hundred', 'half'].join('|')})\\b\\s*)+`, 'g');

/**
 * Spoken numbers → digits, the way strengths and doses are said:
 * "six fifty" → 650, "six twenty five" → 625, "five hundred" → 500,
 * "twenty one" → 21, but "one zero one" stays 1 0 1.
 */
const spokenNumbers = (run) => {
  const w = run.trim().split(/\s+/);
  const out = [];
  // A tens word, with the unit that may follow it ("twenty five").
  const twoDigit = (i) => {
    if (w[i] in TEENS) return [TEENS[w[i]], i + 1];
    if (w[i] in TENS) {
      const u = UNITS[w[i + 1]];
      // "fifty one zero one" is 50 then a dose, not 51: a unit followed by
      // more digits starts the dose.
      const startsDose = w[i + 2] in UNITS || w[i + 2] === 'half';
      return u && !startsDose ? [TENS[w[i]] + u, i + 2] : [TENS[w[i]], i + 1];
    }
    return null;
  };
  let i = 0;
  while (i < w.length) {
    const word = w[i];
    if (word === 'half') { out.push('½'); i += 1; continue; }
    if (word in UNITS && UNITS[word] > 0 && w[i + 1] === 'hundred') {
      let val = UNITS[word] * 100;
      i += 2;
      const rest = twoDigit(i) ?? (w[i] in UNITS ? [UNITS[w[i]], i + 1] : null);
      if (rest) { val += rest[0]; [, i] = rest; }
      out.push(val);
      continue;
    }
    if (word in UNITS && UNITS[word] > 0 && twoDigit(i + 1)) {
      const [tail, next] = twoDigit(i + 1);
      out.push(UNITS[word] * 100 + tail);
      i = next;
      continue;
    }
    const two = twoDigit(i);
    if (two) { out.push(two[0]); [, i] = two; continue; }
    out.push(word === 'hundred' ? 100 : UNITS[word]);
    i += 1;
  }
  return ` ${out.join(' ')} `;
};

const FREQ_SHORT = { '1-0-1': 'BD', '1-1-1': 'TDS', '1-0-0': 'OD', '0-0-1': 'HS', '1-1-1-1': 'QID', SOS: 'SOS' };

const FORMS = [
  [/\b(tablets?|tabs?)\b/, 'Tab'], [/\b(capsules?|caps?)\b/, 'Cap'], [/\b(syrups?|syp)\b/, 'Syr'],
  [/\b(injections?|inj)\b/, 'Inj'], [/\bsuspension\b/, 'Susp'], [/\bointment\b/, 'Oint'],
];

const FREQUENCY = [
  [/\b(four times( a day| daily)?|qid)\b/, '1-1-1-1'],
  [/\b(three times( a day| daily)?|thrice( a day| daily)?|tds|tid)\b/, '1-1-1'],
  [/\b(two times( a day| daily)?|twice( a day| daily)?|bd|bid)\b/, '1-0-1'],
  [/\b(once a day|once daily|od)\b/, '1-0-0'],
  [/\b(sos|when needed|if needed|as needed|when required)\b/, 'SOS'],
];

const TIMING = [
  [/\b(after (food|meals?|eating|lunch|dinner|breakfast))\b/, 'After meals'],
  [/\b(before (food|meals?|eating))\b/, 'Before meals'],
  [/\b(before breakfast)\b/, 'Before breakfast'],
  [/\b(empty stomach)\b/, 'Empty stomach'],
  [/\b(at bed ?time|bedtime|at night|night time|hs)\b/, 'At bedtime'],
  [/\b(with (food|milk))\b/, 'With food'],
  [/\b(apply locally|local application)\b/, 'Apply locally'],
];

const DOSE_DIGIT = '([012½])';
const DOSE_SEP = '\\s*[-–\\s]\\s*';
const DOSE_RE = new RegExp(`(?<![\\d.])${DOSE_DIGIT}${DOSE_SEP}${DOSE_DIGIT}${DOSE_SEP}${DOSE_DIGIT}(?:${DOSE_SEP}${DOSE_DIGIT}(?!\\s*(?:days?|weeks?|months?)))?(?![\\d.])`);

const unit = (n, u) => {
  const base = u.replace(/s$/, '');
  const word = base[0].toUpperCase() + base.slice(1);
  return `${n} ${word}${Number(n) === 1 ? '' : 's'}`;
};

// Units stay lower case; two-letter suffixes are brand codes (LC, LS, SR, CV).
const titleCase = (s) => s.replace(/\b([a-z])([a-z]*)/g, (m, a, b) => {
  if (/^(mg|mcg|ml|g|iu)$/.test(m)) return m;
  if (m.length === 2 && !/^(of|in|to|on|at|by|or|an)$/.test(m)) return m.toUpperCase();
  return a.toUpperCase() + b;
});

/** One spoken medicine → { name, dosage, duration, instruction }; blank fields are left to the formulary. */
export const parseMedicine = (raw) => {
  let t = ` ${raw.toLowerCase()} `;
  t = t.replace(NUMBER_RUN, spokenNumbers);
  // The recogniser sometimes writes "six fifty" as "6 50".
  t = t.replace(/\b([1-9]) ([1-9]0)\b(?!\s*(days?|weeks?|months?))/g, '$1$2');
  const out = { dosage: '', duration: '', instruction: '' };
  const take = (re, fn) => { const m = t.match(re); if (m) { fn(m); t = t.replace(m[0], ' '); } };

  take(/\b(?:for\s+)?(\d+)\s*(days?|weeks?|months?)\b/, (m) => { out.duration = unit(m[1], m[2]); });
  if (!out.duration) take(/\b(?:for\s+)?(?:a|an)\s+(week|month)\b/, (m) => { out.duration = unit(1, m[1]); });
  take(DOSE_RE, (m) => { out.dosage = [m[1], m[2], m[3], m[4]].filter(Boolean).join('-'); });
  if (!out.dosage) {
    // "101" only counts as a dose once the strength has been said, or "Dolo 100" would read as 1-0-0.
    const m = t.match(/\b([01])([01])([01])\b/);
    if (m && /\d/.test(t.slice(0, m.index))) { out.dosage = `${m[1]}-${m[2]}-${m[3]}`; t = t.replace(m[0], ' '); }
  }
  for (const [re, v] of TIMING) if (!out.instruction) take(re, () => { out.instruction = v; });
  for (const [re, v] of FREQUENCY) if (!out.dosage) take(re, () => { out.dosage = v; });
  if (!out.dosage && out.instruction === 'At bedtime') out.dosage = '0-0-1';
  // Liquids: "2 teaspoons thrice a day" → "2 tsp TDS".
  take(/(\d+(?:\.\d)?|½)\s*(teaspoons?|tsp|spoons?|ml)\b/, (m) => {
    const amount = `${m[1]} ${m[2] === 'ml' ? 'ml' : 'tsp'}`;
    out.dosage = [amount, FREQ_SHORT[out.dosage] ?? out.dosage].filter(Boolean).join(' ');
  });

  let form = '';
  for (const [re, v] of FORMS) if (!form) take(re, () => { form = v; });
  const name = t
    .replace(/\b(\d+)\s*(mg|mcg|ml|g)\b/g, '$1$2')
    .replace(/\b(and|then|for|of|the|give|take|start|medicine|dose|dosage|daily|days?|times?)\b/g, ' ')
    .replace(/[,.;:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return { ...out, name: [form, titleCase(name)].filter(Boolean).join(' ') };
};

/**
 * A final transcript → pad actions. Each phrase is one medicine unless it
 * starts with a command word; "next" separates medicines said in one breath.
 */
export const parseDictation = (transcript) => {
  const text = transcript.trim();
  const lower = text.toLowerCase();
  let m;
  if ((m = lower.match(/^(?:diagnosis|diagnosed with|impression)\b[\s:,-]*/))) return [{ kind: 'diagnosis', text: titleCase(text.slice(m[0].length).trim()) }];
  if ((m = lower.match(/^(?:advice|advise)\b[\s:,-]*/))) return [{ kind: 'advice', text: text.slice(m[0].length).trim() }];
  if (/^(?:symptoms?|complaints?)\b/.test(lower)) return [{ kind: 'symptoms', text: text.replace(/^\S+[\s:,-]*/, '') }];
  if (/^(?:undo|delete last|remove last|scratch that)\b/.test(lower)) return [{ kind: 'undo' }];
  if (/^(?:stop|stop listening|stop dictation)\b/.test(lower)) return [{ kind: 'stop' }];
  return lower
    .split(/\bnext(?: medicine)?\b|\bnew line\b|;|\.(?!\d)/)
    .map((s) => s.trim())
    .filter((s) => /[a-z]/.test(s))
    .map((s) => ({ kind: 'medicine', med: parseMedicine(s) }))
    .filter((a) => a.med.name);
};
