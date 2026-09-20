import clsx from 'clsx';
import { Icon } from '../ui/Icon.jsx';
import { Button } from '../ui/Button.jsx';
import { inr, token } from '../../lib/format.js';

export function DoctorCard({ doctor, onBook }) {
  const { session, queue, hospital } = doctor;
  const bookable = session.isBookingOpen;

  return (
    <div className="glass-card rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-teal-500/40 transition space-y-4 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 text-[11px] mb-3">
          <span className="inline-flex items-center gap-1 font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
            <Icon name="location" className="w-3 h-3" />
            {hospital.distanceKm} km
            {hospital.etaMinutes != null && <span className="text-slate-400">· {hospital.etaMinutes} min</span>}
          </span>

          {session.isOnBreak ? (
            <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
              <Icon name="pause" className="w-3 h-3" /> On break
            </span>
          ) : bookable ? (
            <span className="inline-flex items-center gap-1 font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" /> Open OPD
            </span>
          ) : (
            <span className="font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
              Closed
            </span>
          )}
        </div>

        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-blue-700 text-white grid place-items-center font-black text-sm shrink-0">
            {doctor.name.replace(/^Dr\.?\s*/i, '').slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-slate-900 text-sm leading-snug truncate">{doctor.name}</h4>
            <p className="text-xs font-bold text-teal-700">{doctor.specialty}</p>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">{(doctor.qualifications || []).join(', ')}</p>
          </div>
        </div>

        <div className="mt-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
          <p className="font-semibold text-slate-800 truncate">{hospital.name}</p>
          <p className="text-[11px] text-slate-500 truncate">{hospital.address?.line1}, {hospital.address?.city}</p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center text-xs">
          <div>
            <span className="text-[10px] text-slate-400 block">Now serving</span>
            <span className="text-base font-black text-amber-600">{token(queue.currentToken)}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">Your token</span>
            <span className="text-base font-black text-teal-700">{token(queue.nextToken)}</span>
          </div>
        </div>

        <p className="mt-2 text-[11px] text-slate-500 text-center">
          {/* Null while on break: a countdown for a queue that is not advancing
              would be a lie. */}
          {session.isOnBreak
            ? <span className="text-amber-700 font-bold">Queue paused — doctor is on a break</span>
            : <>{queue.waiting} waiting · about <strong className="text-slate-700">{queue.estimatedWaitMinutes} min</strong></>}
        </p>
      </div>

      <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
        <div>
          <span className="text-[10px] text-slate-400 block">Consultation</span>
          <span className="text-sm font-black text-slate-900">{inr(doctor.fees.fresh)}</span>
        </div>
        <Button onClick={() => onBook(doctor)} disabled={!bookable} title={bookable ? undefined : 'Bookings are closed'}>
          {bookable ? 'Book token' : 'Closed'}
        </Button>
      </div>
    </div>
  );
}
