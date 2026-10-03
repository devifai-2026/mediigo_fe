import { useState, useEffect } from 'react';
import clsx from 'clsx';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { api } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';

/**
 * Rate a finished consultation.
 *
 * Stars are required, words are not: most people will tap four stars and
 * leave, and demanding a sentence from them is how you end up with no
 * ratings at all rather than better ones.
 *
 * It says plainly that the review is checked before publishing. A patient
 * who writes something honest and never sees it appear would reasonably
 * conclude it was suppressed; telling them up front is the difference
 * between moderation and censorship.
 */
const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

export function RatingDialog({ token, existing, onDone }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  useEffect(() => {
    setRating(existing?.rating ?? 0);
    setComment(existing?.comment ?? '');
    setHover(0);
  }, [token, existing]);

  if (!token) return null;

  const submit = async () => {
    if (!rating) return;
    setBusy(true);
    try {
      await api.post('/api/reviews', { tokenId: token._id, rating, comment });
      toast.success('Thank you — your review is with our team for checking');
      onDone?.(true);
    } catch (e) {
      toast.error(e?.response?.data?.error?.message || e.message);
    } finally {
      setBusy(false);
    }
  };

  const shown = hover || rating;

  return (
    <Modal open onClose={() => onDone?.(false)} title={existing ? 'Edit your review' : 'How was your visit?'}>
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-slate-900">{token.doctorId?.name}</p>
          <p className="text-[11px] text-slate-500">
            {token.doctorId?.specialty} · {token.hospitalId?.name}
          </p>
        </div>

        <div className="flex flex-col items-center gap-2 py-2">
          <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} star${n === 1 ? '' : 's'}`}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(n)}
                className="p-1 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-mg-teal rounded"
              >
                <svg viewBox="0 0 24 24" className={clsx('w-9 h-9 transition-colors', n <= shown ? 'text-amber-400' : 'text-slate-200')} fill="currentColor" aria-hidden="true">
                  <path d="M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6-5.9-3.2-5.9 3.2 1.2-6.6L2.5 9.5l6.6-.9L12 2.5z" />
                </svg>
              </button>
            ))}
          </div>
          <p className={clsx('text-xs font-semibold h-4', shown ? 'text-slate-700' : 'text-transparent')}>
            {LABELS[shown] || ' '}
          </p>
        </div>

        <div>
          <label htmlFor="review-comment" className="block text-[11px] font-semibold text-slate-700 mb-1">
            Anything to add? <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            id="review-comment"
            rows={3}
            maxLength={1000}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What went well, or what could have been better?"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-mg-teal focus:ring-1 focus:ring-mg-teal outline-none resize-none"
          />
        </div>

        <p className="text-[10px] text-slate-400 leading-relaxed">
          Reviews are checked by our team before they appear, usually within a day.
          Your rating is never changed — only the wording may be edited if it
          identifies someone else.
        </p>

        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={() => onDone?.(false)} disabled={busy}>Not now</Button>
          <Button onClick={submit} disabled={!rating || busy}>
            {busy ? 'Sending…' : existing ? 'Update review' : 'Submit review'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
