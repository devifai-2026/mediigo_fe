import { useRef, useState } from 'react';
import clsx from 'clsx';
import { api, unwrap } from '../../lib/api.js';

const MAX = 8;
const KINDS = [['OUTSIDE', 'Outside / entrance'], ['INSIDE', 'Inside / waiting area']];

/**
 * Optional photos of the premises, uploaded as they are picked so a slow
 * connection on site does not hold up the submit. Patients see them on the
 * doctor's page once the clinic is approved; a clinic without them simply
 * shows none.
 *
 * `value` is [{ url, objectPath, kind }].
 */
export function ClinicPhotosField({ value = [], onChange, onError }) {
  const input = useRef(null);
  const [kind, setKind] = useState('OUTSIDE');
  const [uploading, setUploading] = useState(0);

  const pick = async (files) => {
    const room = MAX - value.length;
    const list = [...files].slice(0, room);
    if (!list.length) return;
    setUploading(list.length);
    let next = [...value];
    for (const file of list) {
      try {
        const body = new FormData();
        body.append('photo', file);
        // eslint-disable-next-line no-await-in-loop
        const stored = unwrap(await api.post('/api/onboarding/uploads', body, { headers: { 'Content-Type': undefined } }));
        next = [...next, { url: stored.url, objectPath: stored.objectPath, kind }];
        onChange(next);
      } catch (e) {
        onError?.(`${file.name}: ${e.message}`);
      } finally {
        setUploading((n) => n - 1);
      }
    }
  };

  const setPhotoKind = (i, k) => onChange(value.map((p, j) => (j === i ? { ...p, kind: k } : p)));
  const remove = (i) => onChange(value.filter((_, j) => j !== i));

  return (
    <div className="space-y-2">
      <div>
        <p className="text-xs font-medium text-slate-700">Clinic photos <span className="font-normal text-slate-400">(optional)</span></p>
        <p className="text-[11px] text-slate-500">The entrance helps patients find the building; the waiting area shows what to expect. Up to {MAX}, JPEG or PNG.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50" role="group" aria-label="Photo type">
          {KINDS.map(([k, label]) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
              className={clsx('px-2.5 py-1 rounded-md text-[11px] font-medium transition', kind === k ? 'bg-white shadow-sm text-mg-teal' : 'text-slate-500')}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={value.length >= MAX || uploading > 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-mg-teal text-mg-teal hover:bg-teal-50 text-[11px] font-medium disabled:opacity-50"
        >
          <i className={uploading ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-camera'} aria-hidden="true" />
          {uploading ? `Uploading ${uploading}…` : 'Add photos'}
        </button>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png"
          multiple
          className="hidden"
          onChange={(e) => { pick(e.target.files); e.target.value = ''; }}
        />
      </div>

      {value.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {value.map((p, i) => (
            <figure key={p.url} className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
              <img src={p.url} alt="" className="w-full h-24 object-cover" />
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label="Remove photo"
                className="absolute top-1 right-1 w-6 h-6 grid place-items-center rounded-full bg-black/60 text-white text-[11px] hover:bg-black/80"
              >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
              <select
                value={p.kind}
                onChange={(e) => setPhotoKind(i, e.target.value)}
                aria-label="Photo type"
                className="w-full text-[10px] px-1.5 py-1 bg-white border-t border-slate-200 focus:outline-none"
              >
                {KINDS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
