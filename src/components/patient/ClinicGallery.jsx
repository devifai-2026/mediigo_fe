import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { Icon } from '../ui/Icon.jsx';

/**
 * Photos of the clinic, inside and out.
 *
 * Outside photos answer "which building is it?" for a patient arriving for the
 * first time; inside photos answer "what is it like?". Both matter more to a
 * patient choosing a doctor than a stock hero image, so they sit right after
 * the About section.
 *
 * photo: { url, kind: 'INSIDE' | 'OUTSIDE', caption, credit? }
 * credit (licensed sample photos only): { author, license, sourceUrl }
 */
const TABS = [
  { value: 'ALL', label: 'All' },
  { value: 'OUTSIDE', label: 'Outside' },
  { value: 'INSIDE', label: 'Inside' },
];

function Credit({ credit, className = '' }) {
  if (!credit) return null;
  return (
    <a
      href={credit.sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={clsx('hover:underline', className)}
    >
      Photo: {credit.author} · {credit.license}
    </a>
  );
}

function Lightbox({ photos, index, onClose, onMove }) {
  const photo = photos[index];

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onMove(1);
      if (e.key === 'ArrowLeft') onMove(-1);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, onMove]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Clinic photos"
      className="fixed inset-0 z-50 bg-slate-950/95 flex flex-col animate-fade-in"
      onClick={onClose}
    >
      <div className="flex items-center justify-between px-4 py-3 text-white/80 text-sm">
        <span>{index + 1} / {photos.length}</span>
        <button type="button" aria-label="Close" onClick={onClose} className="w-10 h-10 grid place-items-center rounded-full hover:bg-white/10">
          <Icon name="cross" className="w-5 h-5" />
        </button>
      </div>
      <div className="relative flex-1 min-h-0 flex items-center justify-center px-4 sm:px-16">
        <img
          src={photo.url}
          alt={photo.caption || (photo.kind === 'OUTSIDE' ? 'Clinic exterior' : 'Clinic interior')}
          onClick={(e) => e.stopPropagation()}
          className="max-h-full max-w-full object-contain rounded-lg"
        />
        {photos.length > 1 && (
          <>
            <button
              type="button" aria-label="Previous photo"
              onClick={(e) => { e.stopPropagation(); onMove(-1); }}
              className="absolute left-2 sm:left-4 w-11 h-11 grid place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <Icon name="chevronLeft" className="w-5 h-5" />
            </button>
            <button
              type="button" aria-label="Next photo"
              onClick={(e) => { e.stopPropagation(); onMove(1); }}
              className="absolute right-2 sm:right-4 w-11 h-11 grid place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <Icon name="chevronRight" className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
      <div className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
        <p className="text-white text-sm">
          <span className="text-white/60 uppercase text-xs tracking-wider mr-2">{photo.kind === 'OUTSIDE' ? 'Outside' : 'Inside'}</span>
          {photo.caption}
        </p>
        <Credit credit={photo.credit} className="mt-1 inline-block text-[11px] text-white/50" />
      </div>
    </div>,
    document.body,
  );
}

export function ClinicGallery({ id, clinicName, photos }) {
  const [tab, setTab] = useState('ALL');
  const [open, setOpen] = useState(null); // index into `shown`

  const counts = {
    ALL: photos.length,
    INSIDE: photos.filter((p) => p.kind === 'INSIDE').length,
    OUTSIDE: photos.filter((p) => p.kind === 'OUTSIDE').length,
  };
  const shown = tab === 'ALL' ? photos : photos.filter((p) => p.kind === tab);

  const move = useCallback((dir) => {
    setOpen((i) => (i == null ? i : (i + dir + shown.length) % shown.length));
  }, [shown.length]);
  const close = useCallback(() => setOpen(null), []);

  if (!photos.length) return null;

  const [lead, ...rest] = shown;
  const thumbs = rest.slice(0, 4);
  const more = shown.length - 1 - thumbs.length;

  const Tile = ({ photo, index, big = false, overlay = null }) => (
    <button
      type="button"
      onClick={() => setOpen(index)}
      className="group relative overflow-hidden rounded-lg bg-slate-100 text-left w-full aspect-[4/3] sm:aspect-auto sm:h-full"
    >
      <img
        src={photo.url}
        alt={photo.caption || ''}
        loading="lazy"
        className="w-full h-full object-cover transition duration-300 group-hover:scale-[1.03]"
      />
      {/* Too cramped to label the small mobile thumbnails; the viewer says. */}
      <span className={clsx(
        'absolute left-2 top-2 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white',
        !big && 'hidden sm:block',
      )}
      >
        {photo.kind === 'OUTSIDE' ? 'Outside' : 'Inside'}
      </span>
      {big && photo.caption && (
        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2.5 pt-8 text-sm font-medium text-white">
          {photo.caption}
        </span>
      )}
      {overlay}
    </button>
  );

  return (
    <section id={id} className="scroll-mt-28 mt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Inside &amp; outside the clinic</h2>
          {clinicName && <p className="mt-1 text-sm text-slate-500">{clinicName}</p>}
        </div>
        <div className="inline-flex rounded-lg bg-slate-100 p-1">
          {TABS.filter((t) => t.value === 'ALL' || counts[t.value]).map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              aria-pressed={tab === t.value}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition',
                tab === t.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800',
              )}
            >
              {t.label} <span className="text-slate-400">({counts[t.value]})</span>
            </button>
          ))}
        </div>
      </div>

      {/* One lead photo and up to four beside it; the last tile says how many
          more there are rather than silently dropping them. */}
      <div className={clsx(
        'mt-5 grid gap-2',
        thumbs.length ? 'sm:grid-cols-4 sm:grid-rows-2 sm:h-[340px]' : 'sm:h-[340px]',
      )}
      >
        <div className={clsx(thumbs.length && 'sm:col-span-2 sm:row-span-2', 'h-full')}>
          <Tile photo={lead} index={0} big />
        </div>
        <div className="grid grid-cols-4 sm:contents gap-2">
          {thumbs.map((p, i) => (
            <Tile
              key={p.url}
              photo={p}
              index={i + 1}
              overlay={i === thumbs.length - 1 && more > 0 ? (
                <span className="absolute inset-0 grid place-items-center bg-black/55 text-white text-lg font-semibold">+{more}</span>
              ) : null}
            />
          ))}
        </div>
      </div>

      {shown.some((p) => p.credit) && (
        <p className="mt-2 text-[11px] text-slate-400">
          Sample photos from Wikimedia Commons, credited in the viewer.
        </p>
      )}

      {open != null && shown[open] && (
        <Lightbox photos={shown} index={open} onClose={close} onMove={move} />
      )}
    </section>
  );
}
