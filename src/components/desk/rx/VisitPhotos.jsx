import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { api } from '../../../lib/api.js';
import { useAuth } from '../../../context/AuthContext.jsx';
import { useToast } from '../../../context/ToastContext.jsx';
import { useConfirm } from '../../../context/ConfirmContext.jsx';
import { token as fmtToken } from '../../../lib/format.js';
import { Button } from '../../ui/Button.jsx';
import { Modal } from '../../ui/Modal.jsx';
import { useFocusTrap } from '../../../hooks/useFocusTrap.js';

export const KIND_LABEL = { PRESCRIPTION: 'Prescription', HEALTH: 'Health photo' };
const KIND_ICON = { PRESCRIPTION: 'fa-file-prescription', HEALTH: 'fa-heart-pulse' };
// Matches the server's document size: legible small print at about half the
// bytes of a full camera frame, so uploads are quick on mobile data.
const MAX_EDGE = 1600;

/**
 * A phone photo is 3–12MB; the server keeps 1600px at most. Shrinking here
 * first saves the clinic's mobile data and keeps uploads under the size
 * limit. Anything the browser cannot draw goes up as it is, for the server
 * to accept or explain.
 */
const shrink = async (file) => {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.8));
    return blob ? new File([blob], 'photo.jpg', { type: 'image/jpeg' }) : file;
  } catch {
    return file;
  }
};

// Medical photos have no public URL: each is fetched with the session and
// shown from memory. Cached per photo, so the thumbnail and the viewer share
// one download.
const blobUrls = new Map();
const loadPhoto = (id) => {
  if (!blobUrls.has(id)) {
    const p = api.get(`/api/prescriptions/photos/${id}/file`, { responseType: 'blob' })
      .then((res) => URL.createObjectURL(res.data))
      .catch((e) => { blobUrls.delete(id); throw e; });
    blobUrls.set(id, p);
  }
  return blobUrls.get(id);
};
const forget = (id) => {
  blobUrls.get(id)?.then((u) => URL.revokeObjectURL(u)).catch(() => {});
  blobUrls.delete(id);
};

function SecureImg({ id, alt, className }) {
  const [src, setSrc] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    loadPhoto(id).then((u) => { if (alive) setSrc(u); }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [id]);
  if (failed) {
    return <span className={clsx(className, 'grid place-items-center bg-slate-100 text-slate-400')}><i className="fa-solid fa-image" aria-hidden="true" /></span>;
  }
  if (!src) return <span className={clsx(className, 'block bg-slate-100 animate-pulse')} />;
  return <img src={src} alt={alt} className={className} />;
}

function PhotoStrip({ photos, onOpen, size }) {
  const box = size === 'sm' ? 'w-16 h-16' : 'w-20 h-20 sm:w-24 sm:h-24';
  return (
    <ul className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
      {photos.map((p, i) => (
        <li key={p.id} className="shrink-0">
          <button
            type="button"
            onClick={() => onOpen(p)}
            className={clsx('block rounded-lg overflow-hidden border border-slate-200 hover:ring-2 hover:ring-mg-teal/40 transition', box)}
            aria-label={`Open ${KIND_LABEL[p.kind]?.toLowerCase() || 'photo'} ${i + 1} of ${photos.length}${p.caption ? `: ${p.caption}` : ''}`}
          >
            <SecureImg id={p.id} alt="" className="w-full h-full object-cover" />
          </button>
        </li>
      ))}
    </ul>
  );
}

const KIND_TONE = { PRESCRIPTION: 'text-mg-blue', HEALTH: 'text-rose-500' };
const KIND_PLURAL = { PRESCRIPTION: 'Prescriptions', HEALTH: 'Health photos' };
const KIND_SHORT = { PRESCRIPTION: 'Rx', HEALTH: 'Health' };

/**
 * A visit's photos, prescriptions and health photos each in their own row,
 * so a doctor looking for the old pad does not have to pick it out from
 * among wound pictures. Tap any one to open the gallery there.
 */
export function PhotoGroups({ photos, onOpen, size = 'md' }) {
  if (!photos?.length) return null;
  return (
    <div className="space-y-2.5">
      {Object.keys(KIND_LABEL).map((k) => {
        const list = photos.filter((p) => p.kind === k);
        if (!list.length) return null;
        return (
          <div key={k}>
            <p className="mb-1.5 text-[11px] font-semibold text-slate-600">
              <i className={clsx('fa-solid mr-1.5', KIND_ICON[k], KIND_TONE[k])} aria-hidden="true" />
              {KIND_PLURAL[k]} <span className="font-normal text-slate-400">({list.length})</span>
            </p>
            <PhotoStrip photos={list} onOpen={onOpen} size={size} />
          </div>
        );
      })}
    </div>
  );
}

/**
 * Full-screen gallery for one visit's photos. Prescriptions and health photos
 * are separate tabs; within one, swipe, the arrow buttons or the keyboard's
 * arrow keys move between photos, and the thumbnails jump straight to one.
 */
export function PhotoGallery({ photos, startId, onClose, onRemoved }) {
  const toast = useToast();
  const confirm = useConfirm();
  const { user, role } = useAuth();
  const panelRef = useRef(null);
  const thumbsRef = useRef(null);
  const touchX = useRef(null);
  const start = photos?.find((p) => p.id === startId);
  const [kind, setKind] = useState(start?.kind ?? 'PRESCRIPTION');
  const [currentId, setCurrentId] = useState(startId);
  const [lastIndex, setLastIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const open = Boolean(startId && photos?.length);
  useFocusTrap(panelRef, open);

  const list = (photos ?? []).filter((p) => p.kind === kind);
  let index = list.findIndex((p) => p.id === currentId);
  // The photo on screen was just removed: stay at the same place in the row.
  if (index === -1 && list.length) index = Math.min(lastIndex, list.length - 1);
  const photo = list[index];

  useEffect(() => { if (photo) setLastIndex(index); }, [index, photo]);
  // A tab emptied by a removal hands over to the other kind, or closes.
  useEffect(() => {
    if (!open || list.length) return;
    const other = Object.keys(KIND_LABEL).find((k) => photos.some((p) => p.kind === k));
    if (other) { setKind(other); setCurrentId(null); setLastIndex(0); } else onClose();
  }, [open, list.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (step) => {
    const next = list[index + step];
    if (next) setCurrentId(next.id);
  };

  useEffect(() => {
    if (!open) return undefined;
    // Caught on the way down and stopped there: opened from inside a dialog,
    // Escape closes the gallery only, not the dialog underneath too.
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); } else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey, true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey, true); document.body.style.overflow = prev; };
  });

  // The neighbours load while this one is looked at, so the next swipe is instant.
  useEffect(() => {
    [list[index - 1], list[index + 1]].forEach((p) => { if (p) loadPhoto(p.id).catch(() => {}); });
    thumbsRef.current?.querySelector(`[data-id="${photo?.id}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [photo?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open || !photo) return null;

  // Mirrors the server: whoever added it, or the doctor (who only ever sees
  // their own patients' visits).
  const mayRemove = role === 'DOCTOR' || role === 'SUPER_ADMIN' || (user?._id ?? user?.id) === photo.uploadedBy;
  const remove = async () => {
    const ok = await confirm({
      title: 'Remove this photo?',
      message: 'It is taken off the patient’s record for good.',
      confirmLabel: 'Remove photo',
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await api.delete(`/api/prescriptions/photos/${photo.id}`);
      forget(photo.id);
      toast.success('Photo removed');
      onRemoved?.(photo);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const kinds = Object.keys(KIND_LABEL).filter((k) => photos.some((p) => p.kind === k));
  const when = new Date(photo.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  const arrow = 'absolute top-1/2 -translate-y-1/2 w-11 h-11 grid place-items-center rounded-full bg-black/50 hover:bg-black/70 text-white transition disabled:opacity-0 disabled:pointer-events-none';

  return createPortal(
    <div ref={panelRef} role="dialog" aria-modal="true" aria-label="Photo gallery" className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col font-display animate-fade-in">
      <div className="flex items-center justify-between gap-3 px-3 sm:px-5 py-3 shrink-0">
        <div role="tablist" aria-label="Photo type" className="flex gap-1 p-1 rounded-lg bg-white/10 min-w-0 overflow-x-auto no-scrollbar">
          {kinds.map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={kind === k}
              aria-label={`${KIND_PLURAL[k]} (${photos.filter((p) => p.kind === k).length})`}
              onClick={() => { setKind(k); setCurrentId(null); setLastIndex(0); }}
              className={clsx('h-8 px-2.5 sm:px-3 rounded-md text-xs font-medium whitespace-nowrap transition', kind === k ? 'bg-white text-slate-900' : 'text-white/80 hover:text-white')}
            >
              <i className={clsx('fa-solid mr-1.5', KIND_ICON[k])} aria-hidden="true" />
              <span className="hidden sm:inline">{KIND_PLURAL[k]}</span>
              <span className="sm:hidden">{KIND_SHORT[k]}</span>
              {' '}({photos.filter((p) => p.kind === k).length})
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm tabular-nums text-white/70" aria-live="polite">{index + 1} / {list.length}</span>
          <button type="button" onClick={onClose} aria-label="Close gallery" className="w-10 h-10 grid place-items-center rounded-full hover:bg-white/10">
            <i className="fa-solid fa-xmark text-lg" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div
        className="relative flex-1 min-h-0 px-2 sm:px-16 select-none"
        onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (touchX.current == null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          touchX.current = null;
          if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        }}
      >
        <SecureImg key={photo.id} id={photo.id} alt={photo.caption || KIND_LABEL[photo.kind]} className="w-full h-full object-contain" />
        <button type="button" onClick={() => go(-1)} disabled={index === 0} aria-label="Previous photo" className={clsx(arrow, 'left-2 sm:left-4')}>
          <i className="fa-solid fa-chevron-left" aria-hidden="true" />
        </button>
        <button type="button" onClick={() => go(1)} disabled={index === list.length - 1} aria-label="Next photo" className={clsx(arrow, 'right-2 sm:right-4')}>
          <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        </button>
      </div>

      <div className="shrink-0 px-3 sm:px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-3 bg-gradient-to-t from-black/60 to-transparent">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {photo.caption && <p className="text-sm font-medium text-white break-words">{photo.caption}</p>}
            <p className="text-xs text-white/60">Added {when}{photo.uploadedByName ? ` by ${photo.uploadedByName}` : ''}</p>
          </div>
          {mayRemove && (
            <button type="button" onClick={remove} disabled={busy} className="shrink-0 h-9 px-3 rounded-lg text-xs font-medium text-rose-300 hover:text-rose-200 hover:bg-white/10 disabled:opacity-50">
              <i className={clsx('fa-solid mr-1.5', busy ? 'fa-circle-notch fa-spin' : 'fa-trash-can')} aria-hidden="true" />Remove
            </button>
          )}
        </div>
        {list.length > 1 && (
          <ul ref={thumbsRef} className="flex gap-2 overflow-x-auto no-scrollbar justify-start sm:justify-center">
            {list.map((p, i) => (
              <li key={p.id} data-id={p.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setCurrentId(p.id)}
                  aria-label={`Show photo ${i + 1}`}
                  aria-current={p.id === photo.id}
                  className={clsx('block w-14 h-14 rounded-md overflow-hidden transition', p.id === photo.id ? 'ring-2 ring-white opacity-100' : 'opacity-50 hover:opacity-90')}
                >
                  <SecureImg id={p.id} alt="" className="w-full h-full object-cover" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>,
    document.body,
  );
}

/**
 * Upload a paper prescription or a health photo onto the selected patient's
 * visit. On a phone the camera opens straight away; each shot is previewed
 * first, so a blurred page can be retaken before it joins the record.
 *
 * `bare` drops the card's own frame and heading, for use inside a dialog
 * that already names the visit.
 */
export function VisitPhotos({ patient, photos, onChanged, bare = false }) {
  const toast = useToast();
  const { role } = useAuth();
  // The front desk uploads prescriptions only; health photos are the doctor's.
  const prescriptionsOnly = role === 'RECEPTIONIST';
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const [kind, setKind] = useState('PRESCRIPTION');
  const [pending, setPending] = useState([]); // [{ file, url }]
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState(null);

  const clear = () => {
    pending.forEach((p) => URL.revokeObjectURL(p.url));
    setPending([]);
    setCaption('');
  };
  // A new patient starts with nothing half-uploaded from the last one.
  useEffect(() => { clear(); }, [patient?.tokenId]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (e) => {
    const files = [...(e.target.files ?? [])].filter((f) => f.type.startsWith('image/')).slice(0, 10);
    e.target.value = '';
    if (!files.length) return;
    setPending((cur) => [...cur, ...files.map((file) => ({ file, url: URL.createObjectURL(file) }))].slice(0, 10));
  };

  const upload = async () => {
    if (!pending.length || !patient) return;
    setBusy(true);
    let done = 0;
    try {
      for (const p of pending) {
        // eslint-disable-next-line no-await-in-loop
        const file = await shrink(p.file);
        const body = new FormData();
        body.append('photo', file);
        body.append('tokenId', patient.tokenId);
        body.append('kind', kind);
        if (caption.trim()) body.append('caption', caption.trim());
        // eslint-disable-next-line no-await-in-loop
        await api.post('/api/prescriptions/photos', body, { headers: { 'Content-Type': undefined } });
        done += 1;
      }
      toast.success(`${done} photo${done === 1 ? '' : 's'} saved to ${patient.name}’s history`);
      clear();
    } catch (e) {
      toast.error(done ? `${done} saved, then: ${e.message}` : e.message);
      // Keep only what did not go up, so a retry does not duplicate.
      setPending((cur) => { cur.slice(0, done).forEach((p) => URL.revokeObjectURL(p.url)); return cur.slice(done); });
    } finally {
      setBusy(false);
      if (done) onChanged?.();
    }
  };

  if (!patient) return null;

  return (
    <section
      className={bare ? 'space-y-4' : 'rounded-xl border-2 border-dashed border-mg-blue/25 bg-blue-50/40 p-4 sm:p-5 space-y-4'}
      aria-labelledby={bare ? undefined : 'visit-photos-title'}
      aria-label={bare ? 'Visit photos' : undefined}
    >
      {!bare && (
      <div className="text-center">
        <h2 id="visit-photos-title" className="text-sm font-bold uppercase tracking-wide text-mg-navy">
          <i className="fa-solid fa-camera mr-1.5 text-mg-blue" aria-hidden="true" />{prescriptionsOnly ? 'Upload prescription photo' : 'Upload prescription / health photo'}
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-500">
          For <strong className="font-semibold text-slate-700">{patient.name}</strong> · {fmtToken(patient.tokenNumber)} — saved to their history.
        </p>
      </div>
      )}

      {!prescriptionsOnly && (
      <div role="radiogroup" aria-label="Photo type" className="grid grid-cols-2 gap-1 p-1 bg-white rounded-lg border border-slate-200 max-w-sm mx-auto">
        {Object.entries(KIND_LABEL).map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => setKind(k)}
            className={clsx('h-9 rounded-md text-xs sm:text-sm font-medium transition', kind === k ? 'bg-mg-blue text-white' : 'text-slate-600 hover:bg-slate-50')}
          >
            <i className={clsx('fa-solid mr-1.5', KIND_ICON[k])} aria-hidden="true" />{label}
          </button>
        ))}
      </div>
      )}

      {pending.length > 0 ? (
        <div className="space-y-3">
          <ul className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {pending.map((p, i) => (
              <li key={p.url} className="relative shrink-0">
                <img src={p.url} alt={`Selected photo ${i + 1}`} className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg object-cover border border-slate-200 bg-white" />
                <button
                  type="button"
                  onClick={() => { URL.revokeObjectURL(p.url); setPending((cur) => cur.filter((x) => x !== p)); }}
                  disabled={busy}
                  aria-label={`Remove selected photo ${i + 1}`}
                  className="absolute -top-1.5 -right-1.5 w-6 h-6 grid place-items-center rounded-full bg-slate-900 text-white text-[10px]"
                >
                  <i className="fa-solid fa-xmark" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          <input
            value={caption}
            maxLength={200}
            onChange={(e) => setCaption(e.target.value)}
            placeholder={kind === 'PRESCRIPTION' ? 'Note (optional), e.g. from Dr. Mehta, March' : 'Note (optional), e.g. rash on left arm'}
            className="w-full h-11 px-3 rounded-lg border border-slate-300 bg-white text-base sm:text-sm focus:outline-none focus:border-mg-teal focus:ring-2 focus:ring-mg-teal/20"
          />
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <Button variant="secondary" onClick={() => galleryRef.current?.click()} disabled={busy}>
              <i className="fa-solid fa-plus" aria-hidden="true" /> Add more
            </Button>
            <Button variant="ghost" onClick={clear} disabled={busy}>Cancel</Button>
            <Button variant="dark" onClick={upload} loading={busy}>
              <i className="fa-solid fa-cloud-arrow-up" aria-hidden="true" /> Save {pending.length} to history
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          {/* The camera button is for phones and tablets; a desk computer has
              no camera to open, so it gets the one picker button. */}
          <Button variant="dark" size="lg" onClick={() => cameraRef.current?.click()} className="md:hidden">
            <i className="fa-solid fa-camera" aria-hidden="true" /> Take photo
          </Button>
          <Button variant="secondary" size="lg" onClick={() => galleryRef.current?.click()} className="md:bg-mg-blue md:text-white md:border-0 md:hover:bg-mg-navy">
            <i className="fa-regular fa-image" aria-hidden="true" /> <span className="md:hidden">Choose from gallery</span><span className="hidden md:inline">Choose image</span>
          </Button>
        </div>
      )}

      {/* image/jpeg,image/png makes iPhones convert HEIC on the way out. */}
      <input ref={cameraRef} type="file" accept="image/jpeg,image/png" capture="environment" className="hidden" onChange={pick} />
      <input ref={galleryRef} type="file" accept="image/jpeg,image/png" multiple className="hidden" onChange={pick} />

      {photos?.length > 0 && (
        <div className="pt-3 border-t border-mg-blue/10">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Added to this visit ({photos.length})</p>
          <PhotoGroups photos={photos} onOpen={(p) => setViewing(p.id)} />
        </div>
      )}

      {viewing && <PhotoGallery photos={photos} startId={viewing} onClose={() => setViewing(null)} onRemoved={() => onChanged?.()} />}
    </section>
  );
}

const visitDay = (iso) => (iso
  ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  : '');

/**
 * Add photos to any visit after the fact: a prescription pad photographed at
 * the end of the day, or a report the patient brings back next week. `visit`
 * is { tokenId, tokenNumber, name, date }; `photos` are those already on it.
 */
export function AddVisitPhotosModal({ visit, photos, onClose, onChanged }) {
  const { role } = useAuth();
  if (!visit) return null;
  return (
    <Modal
      open
      onClose={onClose}
      title={role === 'RECEPTIONIST' ? 'Add prescription photo' : 'Add prescription / health photo'}
      subtitle={[visit.name, fmtToken(visit.tokenNumber), visitDay(visit.date)].filter(Boolean).join(' · ')}
      size="md"
    >
      <VisitPhotos bare patient={visit} photos={photos} onChanged={onChanged} />
    </Modal>
  );
}
