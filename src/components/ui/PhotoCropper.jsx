import { useState, useRef, useCallback, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { Modal } from './Modal.jsx';
import { Button } from './Button.jsx';
import { initialsOf } from '../../lib/format.js';

/**
 * Square photo cropper, built on react-easy-crop.
 *
 * The contract is a square image, because that is what the doctor card renders.
 * Cropping server-side instead would pick the subject for the uploader, often
 * badly — a head ends up half out of frame. Here they see exactly what will be
 * stored before it is stored.
 */

// Matches the server's AVATAR_PIXELS: cropping to anything larger would only be
// thrown away by the re-encode on the way into the bucket.
const OUTPUT = 512;
const MAX_ZOOM = 4;

/**
 * Render the chosen crop at full output resolution.
 *
 * Drawn from the ORIGINAL image rather than the on-screen preview, so a small
 * crop window still produces a sharp 512px result instead of an upscaled blur.
 */
const renderCrop = (imageSrc, pixelCrop) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    // The blob: URL is same-origin, but setting this keeps the canvas untainted
    // if the source ever becomes a remote URL.
    image.crossOrigin = 'anonymous';
    image.onerror = () => reject(new Error('Could not read that image'));
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT;
      canvas.height = OUTPUT;
      const ctx = canvas.getContext('2d');
      // White rather than transparent: the output is JPEG, and transparency
      // would otherwise flatten to black.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, OUTPUT, OUTPUT);
      ctx.drawImage(
        image,
        pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
        0, 0, OUTPUT, OUTPUT,
      );
      canvas.toBlob(
        (blob) => (blob ? resolve(new File([blob], 'photo.jpg', { type: 'image/jpeg' })) : reject(new Error('Could not process that image'))),
        'image/jpeg',
        0.9,
      );
    };
    image.src = imageSrc;
  });

export function PhotoCropper({ open, file, onCancel, onDone, busy = false, title = 'Crop photo' }) {
  const [src, setSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPixels, setAreaPixels] = useState(null);
  const [error, setError] = useState(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!file) { setSrc(null); return undefined; }
    setError(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    const url = URL.createObjectURL(file);
    setSrc(url);
    // Revoked on unmount so the blob does not leak for the page's lifetime.
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onCropComplete = useCallback((_area, pixels) => setAreaPixels(pixels), []);

  const confirm = async () => {
    if (!src || !areaPixels) return;
    setWorking(true);
    try {
      onDone?.(await renderCrop(src, areaPixels));
    } catch (e) {
      setError(e.message);
    } finally {
      setWorking(false);
    }
  };

  const disabled = busy || working;

  return (
    <Modal open={open} onClose={disabled ? () => {} : onCancel} title={title} size="md">
      <div className="space-y-4">
        {error ? (
          <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3">{error}</p>
        ) : (
          <>
            <p className="text-[11px] text-slate-500">
              Drag to reposition and pinch or scroll to zoom. The circle is what patients will see.
            </p>

            <div className="relative w-full h-72 rounded-2xl overflow-hidden bg-slate-900">
              {src && (
                <Cropper
                  image={src}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  maxZoom={MAX_ZOOM}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Zoom</span>
              <input
                type="range" min="1" max={MAX_ZOOM} step="0.01" value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 accent-teal-600"
                aria-label="Zoom"
              />
              <button
                type="button"
                onClick={() => { setZoom(1); setCrop({ x: 0, y: 0 }); }}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-800"
              >
                Reset
              </button>
            </div>
          </>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onCancel} disabled={disabled}>Cancel</Button>
          <Button onClick={confirm} disabled={disabled || !areaPixels || Boolean(error)}>
            {disabled ? 'Uploading…' : 'Save photo'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Picker + cropper + current photo.
 *
 * A photo is optional everywhere it appears: with none, the avatar falls back
 * to initials taken from the name WITHOUT its title, so every doctor does not
 * share a leading "D".
 */
export function PhotoField({ value, name, onUpload, onRemove, busy, label = 'Profile photo', hint }) {
  const inputRef = useRef(null);
  const [picked, setPicked] = useState(null);

  const choose = (e) => {
    const f = e.target.files?.[0];
    // Reset so picking the SAME file twice still fires a change event.
    e.target.value = '';
    if (f) setPicked(f);
  };

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
        {label} <span className="text-slate-300 font-bold normal-case tracking-normal">· optional</span>
      </p>
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-100 border border-slate-200 grid place-items-center shrink-0">
          {value
            ? <img src={value} alt="" className="w-full h-full object-cover" />
            : <span className="text-lg font-black text-slate-400">{initialsOf(name)}</span>}
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => inputRef.current?.click()} disabled={busy}>
              {value ? 'Change' : 'Upload'}
            </Button>
            {value && <Button variant="ghost" onClick={onRemove} disabled={busy}>Remove</Button>}
          </div>
          <p className="text-[10px] text-slate-400">
            {hint ?? 'JPEG, PNG or WebP · up to 8MB · cropped to a square. Initials are shown if you skip it.'}
          </p>
        </div>
      </div>

      <input ref={inputRef} type="file" accept="image/*" hidden onChange={choose} />

      <PhotoCropper
        open={Boolean(picked)}
        file={picked}
        busy={busy}
        onCancel={() => setPicked(null)}
        onDone={async (f) => { await onUpload?.(f); setPicked(null); }}
      />
    </div>
  );
}
