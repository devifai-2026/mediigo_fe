import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { api } from '../../lib/api.js';
import { Modal } from '../ui/Modal.jsx';
import { Icon } from '../ui/Icon.jsx';
import { PhotoOrFallback } from '../ui/PhotoOrFallback.jsx';
import { inr, initialsOf, phone, token } from '../../lib/format.js';
import { clinicAddress, clinicDirections, clinicKind, km } from '../../lib/clinics.js';

/**
 * A clinic and every doctor in it. Opened from a clinic card: "Details" to
 * look, "Book Token" to book — which is the same list, headed "Choose a
 * doctor", because a clinic token is always a token with someone.
 *
 * The card only carries the doctors that matched the patient's search. When a
 * filter hid some, this offers the clinic's full list, fetched around the
 * clinic's own pin so distance filters cannot drop anyone.
 */
function DoctorRow({ doctor, onBook, onView }) {
  const { session, queue } = doctor;
  const bookable = session?.isBookingOpen && !session?.isOnBreak;
  const status = session?.isOnBreak
    ? { text: 'On a break', tone: 'text-amber-600' }
    : !session?.isBookingOpen
      ? { text: 'Not taking tokens now', tone: 'text-slate-400' }
      : queue?.currentToken
        ? { text: `Token ${token(queue.currentToken)} active`, tone: 'text-amber-600' }
        : { text: 'You’d be first', tone: 'text-mg-teal' };

  return (
    <div className="rounded-xl border border-slate-200 p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <PhotoOrFallback
          src={doctor.photoUrl}
          className="w-14 h-14 rounded-lg object-cover shrink-0 bg-slate-50"
          fallback={(
            <span className="w-14 h-14 rounded-lg bg-indigo-900 text-white grid place-items-center text-sm font-bold shrink-0">
              {initialsOf(doctor.name)}
            </span>
          )}
        />
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-slate-900 truncate">{doctor.name}</p>
          <p className="text-xs font-semibold text-mg-teal truncate">{doctor.specialty}</p>
          {doctor.qualifications?.length > 0 && (
            <p className="text-[11px] text-slate-500 truncate">{doctor.qualifications.join(', ')}</p>
          )}
          <p className="mt-1 text-xs flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <span className="font-semibold text-slate-900">Fee: {inr(doctor.fees?.fresh)}</span>
            <span className={clsx('font-medium', status.tone)}>{status.text}</span>
            {bookable && queue?.waiting > 0 && (
              <span className="text-slate-500">{queue.waiting} waiting · ~{queue.estimatedWaitMinutes} min</span>
            )}
          </p>
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          type="button"
          onClick={() => onView(doctor)}
          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition"
        >
          <Icon name="user" className="w-3.5 h-3.5 text-mg-teal" /> View Details
        </button>
        <button
          type="button"
          onClick={() => onBook(doctor)}
          disabled={!bookable}
          className={clsx(
            'flex-1 sm:flex-none inline-flex items-center justify-center gap-1 px-4 py-2 rounded-lg text-xs font-semibold transition',
            bookable ? 'bg-mg-teal text-white hover:bg-mg-tealDark' : 'bg-slate-200 text-slate-500 cursor-not-allowed',
          )}
        >
          Book Token <Icon name="chevronRight" className="w-3.5 h-3.5" />
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
        <div className="rounded-xl border border-slate-200 bg-mg-surface/60 p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <p className="flex items-start gap-2 text-sm text-slate-700 min-w-0">
              <Icon name="location" className="w-4 h-4 text-mg-teal shrink-0 mt-0.5" />
              <span>{clinicAddress(clinic)}</span>
            </p>
            {clinic.distanceKm != null && (
              <span className="shrink-0 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-xs font-semibold text-slate-700">
                {km(clinic.distanceKm)} away
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-200">
            {clinic.contactPhone && (
              <a
                href={`tel:${clinic.contactPhone}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800 hover:border-mg-teal"
              >
                <Icon name="phone" className="w-3.5 h-3.5 text-mg-teal" /> Call {kind}
                <span className="font-normal text-slate-500">{phone(clinic.contactPhone)}</span>
              </a>
            )}
            <a
              href={clinicDirections(clinic)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800 hover:border-mg-teal"
            >
              <Icon name="location" className="w-3.5 h-3.5 text-mg-teal" /> Get Directions
            </a>
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
