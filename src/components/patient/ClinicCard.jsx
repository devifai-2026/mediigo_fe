import clsx from 'clsx';
import { Icon } from '../ui/Icon.jsx';
import { PhotoOrFallback } from '../ui/PhotoOrFallback.jsx';
import { inr, initialsOf } from '../../lib/format.js';
import { clinicAddress, clinicDirections, clinicKind, km } from '../../lib/clinics.js';

const TINTS = [
  'bg-teal-50 text-teal-700', 'bg-indigo-50 text-indigo-700', 'bg-amber-50 text-amber-700',
  'bg-rose-50 text-rose-700', 'bg-purple-50 text-purple-700', 'bg-sky-50 text-sky-700',
];

// Same clinic, same colour, every visit.
const tintFor = (key) => {
  let h = 0;
  const s = String(key || '');
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
};

const AVATARS = 4;
const CHIPS = 3;

/**
 * One clinic or hospital in the Explore list. Booking starts here but never
 * ends here: a clinic has several doctors, so both buttons open the clinic,
 * and the patient picks the doctor there.
 */
export function ClinicCard({ clinic, onOpen, onBook }) {
  const { doctors, specialties } = clinic;
  const open = clinic.openCount > 0;
  const anyOnBreak = doctors.some((d) => d.session?.isOnBreak);
  const fee = clinic.feeMin == null ? null
    : clinic.feeMin === clinic.feeMax ? inr(clinic.feeMin) : `${inr(clinic.feeMin)}–${inr(clinic.feeMax)}`;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(clinic)}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen(clinic); }}
      className="relative bg-white rounded-lg border border-slate-100 shadow-[0_1px_4px_rgba(15,23,42,0.06)] hover:shadow-md hover:border-mg-teal/30 transition p-3 flex flex-col font-display cursor-pointer text-left"
    >
      <span className={clsx(
        'absolute top-3 right-3 text-[9px] font-medium px-3 py-0.5 rounded-full text-white',
        open ? 'bg-mg-blue' : anyOnBreak ? 'bg-amber-500' : 'bg-slate-400',
      )}
      >
        {open ? 'Open' : anyOnBreak ? 'On break' : 'Closed'}
      </span>

      <div className="flex items-start gap-3 px-1 pt-1">
        <div className={clsx('w-14 h-14 rounded-lg shrink-0 grid place-items-center', tintFor(clinic.id))}>
          <Icon name="building" className="w-6 h-6" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1 pr-12">
          <h4 className="text-[15px] font-medium text-slate-900 leading-tight line-clamp-2">{clinic.name}</h4>
          <p className="mt-0.5 text-[10px] text-slate-500 flex items-center gap-1.5">
            <span className="px-1.5 py-px rounded bg-slate-100 text-slate-600 font-medium">{clinicKind(clinic)}</span>
            {clinic.distanceKm != null && <span>{km(clinic.distanceKm)} away</span>}
            {clinic.etaMinutes != null && <span>· {clinic.etaMinutes} min</span>}
          </p>
        </div>
      </div>

      <div className="mt-3 bg-mg-surface rounded px-2 py-1.5 flex items-center justify-between gap-2">
        <p className="min-w-0 text-[9px] text-slate-600 line-clamp-2">{clinicAddress(clinic)}</p>
        <a
          href={clinicDirections(clinic)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 inline-flex items-center gap-1 bg-white rounded px-2 py-1 text-[8px] text-slate-700 border border-slate-100 hover:border-mg-teal hover:text-mg-teal transition"
        >
          <Icon name="location" className="w-2.5 h-2.5 text-mg-teal" />
          Get Direction
        </a>
      </div>

      {specialties.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1 px-1">
          {specialties.slice(0, CHIPS).map((s) => (
            <span key={s} className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-teal-50 text-mg-teal">{s}</span>
          ))}
          {specialties.length > CHIPS && (
            <span className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">+{specialties.length - CHIPS} more</span>
          )}
        </div>
      )}

      {/* Who practises here, at a glance, before opening the clinic. */}
      <div className="mt-3 px-1 flex items-center gap-2">
        <div className="flex -space-x-2">
          {doctors.slice(0, AVATARS).map((d) => (
            <PhotoOrFallback
              key={d.doctorId}
              src={d.photoUrl}
              className="w-7 h-7 rounded-full object-cover ring-2 ring-white"
              fallback={(
                <span className={clsx('w-7 h-7 rounded-full ring-2 ring-white grid place-items-center text-[9px] font-bold', tintFor(d.doctorId))}>
                  {initialsOf(d.name)}
                </span>
              )}
            />
          ))}
          {doctors.length > AVATARS && (
            <span className="w-7 h-7 rounded-full ring-2 ring-white bg-slate-100 text-slate-600 grid place-items-center text-[9px] font-bold">
              +{doctors.length - AVATARS}
            </span>
          )}
        </div>
        <p className="text-[10px] text-slate-600 leading-tight">
          <span className="font-semibold text-slate-800">{doctors.length} doctor{doctors.length === 1 ? '' : 's'}</span>
          {' · '}
          {open ? <span className="text-mg-teal">{clinic.openCount} taking tokens now</span> : 'none taking tokens now'}
        </p>
      </div>

      <div className="mt-auto pt-4 px-1 flex items-end justify-between gap-2">
        <div>
          <span className="block text-[10px] font-medium text-slate-800">Consultation Fee</span>
          <span className="block text-lg font-bold text-mg-navy leading-tight">{fee ?? '—'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpen(clinic); }}
            className="text-[10px] px-5 py-1.5 rounded-sm border border-mg-teal text-mg-teal hover:bg-mg-teal/5 transition"
          >
            Details
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onBook(clinic); }}
            disabled={!open}
            title={open ? undefined : 'No doctor here is taking tokens right now'}
            className={clsx(
              'text-[10px] px-2.5 py-1.5 rounded-sm border transition',
              open
                ? 'bg-mg-teal border-mg-teal text-white hover:bg-mg-tealDark'
                : 'bg-slate-200 border-slate-200 text-slate-500 cursor-not-allowed',
            )}
          >
            {open ? 'Book Token' : 'Closed'}
          </button>
        </div>
      </div>
    </div>
  );
}
