import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { api } from '../../lib/api.js';
import { Modal } from '../ui/Modal.jsx';
import { Icon } from '../ui/Icon.jsx';
import { PhotoOrFallback } from '../ui/PhotoOrFallback.jsx';
import { inr, initialsOf, phone, token } from '../../lib/format.js';
import { clinicAddress, clinicDirections, clinicKind, km, nextAvailableText } from '../../lib/clinics.js';
import { RatingBadge } from './RatingBadge.jsx';

/**
 * A clinic and every doctor in it. Opened from a clinic card: "Details" to
 * look, "Book Token" to book — which is the same list, headed "Choose a
 * doctor", because a clinic token is always a token with someone.
 *
 * The card only carries the doctors that matched the patient's search. When a
 * filter hid some, this offers the clinic's full list, fetched around the
 * clinic's own pin so distance filters cannot drop anyone.
 */
function Stat({ label, value, tone = 'text-slate-900' }) {
  return (
    <div className="min-w-0 px-2.5 py-2">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap">{label}</dt>
      <dd className={clsx('mt-0.5 text-[13px] font-semibold leading-snug break-words', tone)}>{value}</dd>
    </div>
  );
}

function DoctorRow({ doctor, onBook, onView }) {
  const { session, queue } = doctor;
  const bookable = session?.isBookingOpen && !session?.isOnBreak;
  const next = nextAvailableText(doctor.nextAvailable, session);
  // The live line under the stats: why it is or is not bookable right now.
  const status = session?.isOnBreak
    ? { text: 'Doctor is on a break — queue paused', tone: 'text-amber-700 bg-amber-50' }
    : !session?.isBookingOpen
      ? { text: 'Not taking tokens right now', tone: 'text-slate-500 bg-slate-50' }
      : queue?.waiting > 0
        ? { text: `${queue.waiting} waiting · about ${queue.estimatedWaitMinutes} min`, tone: 'text-mg-tealDark bg-teal-50' }
        : { text: 'No queue — you’d be next', tone: 'text-emerald-700 bg-emerald-50' };

  return (
    <div className="rounded-xl border border-slate-200 p-3.5 sm:p-4">
      <button type="button" onClick={() => onView(doctor)} className="w-full flex items-start gap-3 text-left">
        <PhotoOrFallback
          src={doctor.photoUrl}
          className="w-14 h-14 rounded-xl object-cover shrink-0 bg-slate-50"
          fallback={(
            <span className="w-14 h-14 rounded-xl bg-mg-navy text-white grid place-items-center text-sm font-bold shrink-0">
              {initialsOf(doctor.name)}
            </span>
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[15px] font-semibold text-slate-900 leading-snug">{doctor.name}</p>
            <RatingBadge rating={doctor.rating} className="shrink-0" />
          </div>
          <p className="text-xs font-semibold text-mg-teal truncate">{doctor.specialty}</p>
          {doctor.qualifications?.length > 0 && (
            <p className="text-[11px] text-slate-500 truncate">{doctor.qualifications.join(', ')}</p>
          )}
        </div>
      </button>

      {/* The three things a patient decides on, side by side. */}
      <dl className="mt-3 grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,0.8fr)] divide-x divide-slate-200 rounded-xl bg-mg-surface">
        <Stat
          label="Now serving"
          value={session?.isOnBreak ? 'Paused' : queue?.currentToken ? token(queue.currentToken) : session?.isBookingOpen ? 'None yet' : '—'}
          tone={queue?.currentToken && !session?.isOnBreak ? 'text-mg-navy' : 'text-slate-500'}
        />
        <Stat label="Next available" value={next ?? 'No sittings'} tone={next === 'Now' ? 'text-emerald-700' : next ? 'text-slate-900' : 'text-slate-400'} />
        <Stat label="Fee" value={doctor.fees?.fresh != null ? inr(doctor.fees.fresh) : '—'} />
      </dl>

      <p className={clsx('mt-2 px-2.5 py-1.5 rounded-lg text-xs font-medium', status.tone)}>{status.text}</p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onView(doctor)}
          className="h-11 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:border-mg-teal hover:text-mg-tealDark transition"
        >
          View profile
        </button>
        <button
          type="button"
          onClick={() => onBook(doctor)}
          disabled={!bookable}
          className={clsx(
            'h-11 inline-flex items-center justify-center gap-1 rounded-lg text-sm font-semibold transition',
            bookable ? 'bg-mg-teal text-white hover:bg-mg-tealDark shadow-sm shadow-mg-teal/30' : 'bg-slate-100 text-slate-400 cursor-not-allowed',
          )}
        >
          Book token <Icon name="chevronRight" className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function ClinicSheet({ clinic, choosing = false, filtered = false, onClose, onBook }) {
  const navigate = useNavigate();
  const [allDoctors, setAllDoctors] = useState(null);
  const [loadingAll, setLoadingAll] = useState(false);

  useEffect(() => { setAllDoctors(null); }, [clinic?.id]);

  if (!clinic) return null;

  const doctors = allDoctors ?? clinic.doctors;
  const openCount = doctors.filter((d) => d.session?.isBookingOpen && !d.session?.isOnBreak).length;
  const kind = clinicKind(clinic);

  const showAll = async () => {
    if (!clinic.coordinates) return;
    setLoadingAll(true);
    try {
      const params = new URLSearchParams({ lat: clinic.coordinates.lat, lng: clinic.coordinates.lng, radiusKm: 1 });
      const res = await api.get(`/api/doctors/nearby?${params}`);
      const here = (res.data?.data ?? []).filter((d) => String(d.hospital?.id) === String(clinic.id));
      setAllDoctors(here.length ? here : clinic.doctors);
    } catch {
      setAllDoctors(clinic.doctors);
    } finally {
      setLoadingAll(false);
    }
  };

  const view = (d) => {
    onClose();
    navigate(`/p/doctors/${d.doctorId}`, { state: { doctor: d } });
  };

  return (
    <Modal
      open
      onClose={onClose}
      eyebrow={`${kind} profile`}
      title={clinic.name}
      subtitle={choosing ? 'Choose a doctor to book your token' : undefined}
      size="lg"
      variant="sheet"
    >
      <div className="space-y-5">
        <div className="rounded-xl border border-slate-200 bg-mg-surface/60 p-4">
          <div className="flex items-start gap-3">
            <span className="w-9 h-9 rounded-xl bg-white border border-slate-200 grid place-items-center shrink-0">
              <Icon name="location" className="w-4 h-4 text-mg-teal" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-800 leading-snug">{clinicAddress(clinic)}</p>
              {clinic.distanceKm != null && (
                <p className="mt-0.5 text-xs text-slate-500">
                  {km(clinic.distanceKm)} away{clinic.etaMinutes != null ? ` · ${clinic.etaMinutes} min drive` : ''}
                </p>
              )}
            </div>
          </div>
          <div className={clsx('mt-4 grid gap-2', clinic.contactPhone ? 'grid-cols-2' : 'grid-cols-1')}>
            <a
              href={clinicDirections(clinic)}
              target="_blank"
              rel="noopener noreferrer"
              className="h-11 inline-flex items-center justify-center gap-2 rounded-lg bg-mg-teal text-white text-sm font-semibold hover:bg-mg-tealDark transition"
            >
              <Icon name="navigate" className="w-4 h-4 rotate-45" /> Get directions
            </a>
            {clinic.contactPhone && (
              <a
                href={`tel:${clinic.contactPhone}`}
                aria-label={`Call ${kind} on ${phone(clinic.contactPhone)}`}
                className="h-11 inline-flex items-center justify-center gap-2 rounded-lg bg-white border border-slate-200 text-sm font-semibold text-slate-800 hover:border-mg-teal transition"
              >
                <Icon name="phone" className="w-4 h-4 text-mg-teal" /> Call {kind.toLowerCase()}
              </a>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <h4 className="text-base font-semibold text-slate-900">
              {choosing ? 'Choose a doctor' : 'Available Doctors'}
            </h4>
            <span className={clsx(
              'px-2.5 py-1 rounded-full text-xs font-semibold border',
              openCount ? 'bg-teal-50 text-mg-teal border-mg-teal/30' : 'bg-slate-50 text-slate-500 border-slate-200',
            )}
            >
              {openCount} of {doctors.length} taking tokens
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {doctors.map((d) => (
              <DoctorRow key={d.doctorId} doctor={d} onBook={onBook} onView={view} />
            ))}
          </div>

          {filtered && !allDoctors && clinic.coordinates && (
            <button
              type="button"
              onClick={showAll}
              disabled={loadingAll}
              className="mt-3 text-xs font-semibold text-mg-teal hover:underline disabled:opacity-60"
            >
              {loadingAll ? 'Loading…' : `Your search is filtering this list — show every doctor at this ${kind.toLowerCase()}`}
            </button>
          )}
          <p className="mt-3 text-[11px] text-slate-400">
            Doctors not taking tokens now may still have sittings later this week — open their details to book ahead.
          </p>
        </div>
      </div>
    </Modal>
  );
}
