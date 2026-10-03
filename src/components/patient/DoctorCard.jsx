import { useState } from 'react';
import clsx from 'clsx';
import { Icon } from '../ui/Icon.jsx';
import { inr, token, initialsOf } from '../../lib/format.js';
import { directionsUrl } from '../../lib/maps.js';

// A doctor with no uploaded photo shows their initials, not a stand-in face.
// Stock portraits made every card look populated, but they put a stranger's
// face against a named, bookable doctor — which is worse than an honest blank.
// Tinted by a stable hash of the id so the same doctor keeps the same colour.
const TINTS = [
  'bg-teal-50 text-teal-700', 'bg-indigo-50 text-indigo-700', 'bg-amber-50 text-amber-700',
  'bg-rose-50 text-rose-700', 'bg-purple-50 text-purple-700', 'bg-sky-50 text-sky-700',
];

function tintFor(doctor) {
  const key = String(doctor.doctorId ?? doctor.name ?? '');
  let h = 0;
  for (let i = 0; i < key.length; i += 1) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}

const km = (d) => (d == null ? '' : `${Number(d) < 10 ? Number(d).toFixed(1).replace(/\.0$/, '') : Math.round(d)} km away`);

export function DoctorCard({ doctor, onBook }) {
  const { session, queue, hospital } = doctor;
  const bookable = session.isBookingOpen;
  const [details, setDetails] = useState(false);
  // A photoUrl only promises a URL exists, not that it loads. Storage drivers
  // get switched, buckets get rotated, CDNs go down — and a doctor who looked
  // fine yesterday renders as a torn-image glyph against their own name. Fall
  // back to the same initials a photoless doctor gets, so the card degrades to
  // the designed state instead of a broken one.
  const [photoFailed, setPhotoFailed] = useState(false);
  const showPhoto = Boolean(doctor.photoUrl) && !photoFailed;

  // Two different emptinesses, and conflating them is what produced "#00".
  // notStarted: nobody has been CALLED yet, so there is no current token to
  // name — true even when people are already queued behind the first slot.
  // firstUp: nobody called and nobody waiting, so the next token really is
  // this patient's — but only while the session can actually take them.
  const notStarted = !queue.currentToken;
  const firstUp = notStarted && !queue.waiting && bookable && !session.isOnBreak;

  // Links to the exact pin when we have one, so the patient is not relying on
  // Google matching a clinic name it may not know.
  const directions = hospital.coordinates
    ? directionsUrl(hospital.coordinates)
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      [hospital.name, hospital.address?.line1, hospital.address?.city].filter(Boolean).join(', '),
    )}`;

  return (
    <div className="relative bg-white rounded-lg border border-slate-100 shadow-[0_1px_4px_rgba(15,23,42,0.06)] hover:shadow-md transition p-3 flex flex-col font-display">
      {session.isOnBreak ? (
        <span className="absolute top-3 right-3 text-[9px] font-medium px-3 py-0.5 rounded-full bg-amber-500 text-white">On break</span>
      ) : bookable ? (
        <span className="absolute top-3 right-3 text-[9px] font-medium px-3 py-0.5 rounded-full bg-mg-blue text-white">Open</span>
      ) : (
        <span className="absolute top-3 right-3 text-[9px] font-medium px-3 py-0.5 rounded-full bg-slate-400 text-white">Closed</span>
      )}

      <div className="flex items-center gap-3 px-1 pt-1">
        {showPhoto ? (
          <img
            src={doctor.photoUrl}
            alt=""
            loading="lazy"
            onError={() => setPhotoFailed(true)}
            className="w-16 h-16 rounded-full object-cover shrink-0 bg-slate-50"
          />
        ) : (
          <div
            aria-hidden="true"
            className={clsx('w-16 h-16 rounded-full shrink-0 grid place-items-center font-bold text-lg', tintFor(doctor))}
          >
            {initialsOf(doctor.name)}
          </div>
        )}
        <div className="min-w-0 flex-1 pt-3">
          <h4 className="text-[15px] font-medium text-slate-900 leading-tight truncate pr-12">{doctor.name}</h4>
          <p className="text-[11px] text-mg-teal mt-0.5 truncate">{doctor.specialty}</p>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[9px] font-medium text-slate-700 truncate uppercase">
              {(doctor.qualifications || []).join(', ')}
            </p>
            <span className="text-[9px] text-slate-600 whitespace-nowrap shrink-0">{km(hospital.distanceKm)}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 bg-mg-surface rounded px-2 py-1.5 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[9px] font-medium text-slate-800 truncate">{hospital.name}</p>
          <p className="text-[9px] text-slate-500 truncate">
            {[hospital.address?.line1, hospital.address?.city].filter(Boolean).join(', ')}
          </p>
        </div>
        <a
          href={directions}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 inline-flex items-center gap-1 bg-white rounded px-2 py-1 text-[8px] text-slate-700 border border-slate-100 hover:border-mg-teal hover:text-mg-teal transition"
        >
          <Icon name="location" className="w-2.5 h-2.5 text-mg-teal" />
          Get Direction
        </a>
      </div>

      {/* An empty queue used to render as "#00" — a token number that can never
          exist, so the best case for a patient looked like a broken field.
          Nobody called and nobody waiting means the next token is theirs, and
          the cells say so. Only when booking is open: on a closed session the
          same emptiness means "come back later", not "walk in". */}
      <div className="mt-2 bg-mg-surface rounded grid grid-cols-2 text-center py-2.5">
        <div>
          <span className="block text-[10px] font-medium text-slate-700">
            {notStarted ? 'In chamber' : 'Current OPD Token'}
          </span>
          {notStarted ? (
            <span className="block text-[13px] font-medium text-slate-500 mt-[7px] leading-tight animate-slide-in">
              Nobody yet
            </span>
          ) : (
            <span className="block text-lg font-bold text-mg-navy mt-1.5">{token(queue.currentToken)}</span>
          )}
        </div>
        <div className="relative">
          <span
            className={clsx(
              'text-[10px] font-medium',
              firstUp
                ? 'text-mg-teal flex items-center justify-center gap-1 animate-slide-in'
                : 'block text-slate-700',
            )}
          >
            {firstUp && <Icon name="sparkle" className="w-3 h-3 shrink-0" strokeWidth={1.75} />}
            {firstUp ? "You'd be first" : 'Next Available'}
          </span>
          <span
            className={clsx(
              'block text-lg font-bold text-mg-teal mt-1',
              firstUp && 'animate-first-up',
            )}
          >
            {token(queue.nextToken)}
          </span>
        </div>
      </div>

      {details && (
        <div className="mt-2 rounded border border-slate-100 px-3 py-2 text-[11px] text-slate-600 space-y-1 animate-fade-in">
          {/* Null while on break: a countdown for a queue that is not advancing
              would be a lie. */}
          {session.isOnBreak
            ? <p className="text-amber-700 font-medium">Queue paused — doctor is on a break</p>
            : <p>{queue.waiting} waiting · about <strong className="text-slate-800">{queue.estimatedWaitMinutes} min</strong></p>}
          {hospital.etaMinutes != null && <p>{hospital.etaMinutes} min to reach the clinic</p>}
          {doctor.fees?.followUp != null && <p>Follow-up fee {inr(doctor.fees.followUp)}</p>}
        </div>
      )}

      <div className="mt-auto pt-4 px-1 flex items-end justify-between gap-2">
        <div>
          <span className="block text-[10px] font-medium text-slate-800">Consultation Fee</span>
          <span className="block text-lg font-bold text-mg-navy leading-tight">{inr(doctor.fees.fresh)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setDetails((v) => !v)}
            aria-expanded={details}
            className="text-[10px] px-5 py-1.5 rounded-sm border border-mg-teal text-mg-teal hover:bg-mg-teal/5 transition"
          >
            Details
          </button>
          <button
            type="button"
            onClick={() => onBook(doctor)}
            disabled={!bookable}
            title={bookable ? undefined : 'Bookings are closed'}
            className={clsx(
              'text-[10px] px-2.5 py-1.5 rounded-sm border transition',
              bookable
                ? 'bg-mg-teal border-mg-teal text-white hover:bg-mg-tealDark'
                : 'bg-slate-200 border-slate-200 text-slate-500 cursor-not-allowed',
            )}
          >
            {bookable ? 'Book Token' : 'Closed'}
          </button>
        </div>
      </div>
    </div>
  );
}
