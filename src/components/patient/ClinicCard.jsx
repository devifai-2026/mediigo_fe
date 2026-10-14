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
      className="group bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.06)] hover:shadow-lg hover:shadow-slate-900/5 hover:border-mg-teal/40 transition p-4 flex flex-col font-display cursor-pointer text-left"
    >
      <div className="flex items-start gap-3">
        <div className={clsx('w-12 h-12 rounded-xl shrink-0 grid place-items-center', tintFor(clinic.id))}>
          <Icon name="building" className="w-6 h-6" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-base font-semibold text-slate-900 leading-snug line-clamp-2">{clinic.name}</h4>
            <span className={clsx(
              'shrink-0 mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full',
              open ? 'bg-emerald-50 text-emerald-700' : anyOnBreak ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500',
            )}
            >
              <span className={clsx('w-1.5 h-1.5 rounded-full', open ? 'bg-emerald-500' : anyOnBreak ? 'bg-amber-500' : 'bg-slate-400')} />
              {open ? 'Open' : anyOnBreak ? 'On break' : 'Closed'}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span className="px-1.5 py-px rounded-md bg-slate-100 text-slate-600 font-medium">{clinicKind(clinic)}</span>
            {clinic.distanceKm != null && <span className="font-medium text-slate-700">{km(clinic.distanceKm)}</span>}
            {clinic.etaMinutes != null && <span>· {clinic.etaMinutes} min drive</span>}
          </p>
        </div>
      </div>

      {/* Where it is, and the way there, as one row: the address alone is a
          dead end on a phone, and an 8px link was too small to tap. */}
      <div className="mt-3.5 rounded-xl bg-mg-surface p-3 flex items-center gap-3">
        <Icon name="location" className="w-4 h-4 text-mg-teal shrink-0" />
        <p className="min-w-0 flex-1 text-xs text-slate-700 leading-snug line-clamp-2">{clinicAddress(clinic)}</p>
        <a
          href={clinicDirections(clinic)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          aria-label={`Get directions to ${clinic.name}`}
          className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white border border-mg-teal/40 text-xs font-semibold text-mg-tealDark hover:bg-mg-teal hover:text-white hover:border-mg-teal transition"
        >
          <Icon name="navigate" className="w-3.5 h-3.5 rotate-45" />
          Directions
        </a>
      </div>

      {specialties.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {specialties.slice(0, CHIPS).map((s) => (
            <span key={s} className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-teal-50 text-mg-tealDark">{s}</span>
          ))}
          {specialties.length > CHIPS && (
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">+{specialties.length - CHIPS} more</span>
          )}
        </div>
      )}

      {/* Who practises here, at a glance, before opening the clinic. */}
      <div className="mt-3 flex items-center gap-2.5">
        <div className="flex -space-x-2">
          {doctors.slice(0, AVATARS).map((d) => (
            <PhotoOrFallback
              key={d.doctorId}
              src={d.photoUrl}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-white"
              fallback={(
                <span className={clsx('w-8 h-8 rounded-full ring-2 ring-white grid place-items-center text-[10px] font-bold', tintFor(d.doctorId))}>
                  {initialsOf(d.name)}
                </span>
              )}
            />
          ))}
          {doctors.length > AVATARS && (
            <span className="w-8 h-8 rounded-full ring-2 ring-white bg-slate-100 text-slate-600 grid place-items-center text-[10px] font-bold">
              +{doctors.length - AVATARS}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-600 leading-tight">
          <span className="font-semibold text-slate-800">{doctors.length} doctor{doctors.length === 1 ? '' : 's'}</span>
          <span className="block mt-0.5">
            {open ? <span className="text-mg-tealDark font-medium">{clinic.openCount} taking tokens now</span> : 'None taking tokens now'}
          </span>
        </p>
      </div>

      <div className="mt-auto pt-4">
        <div className="pt-3 border-t border-slate-100 flex items-baseline justify-between gap-2">
          <span className="text-xs text-slate-500">Consultation fee</span>
          <span className="text-lg font-bold text-mg-navy leading-tight">{fee ?? '—'}</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpen(clinic); }}
            className="h-11 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:border-mg-teal hover:text-mg-tealDark transition"
          >
            View doctors
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onBook(clinic); }}
            disabled={!open}
            title={open ? undefined : 'No doctor here is taking tokens right now'}
            className={clsx(
              'h-11 rounded-lg text-sm font-semibold transition',
              open
                ? 'bg-mg-teal text-white hover:bg-mg-tealDark shadow-sm shadow-mg-teal/30'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed',
            )}
          >
            {open ? 'Book token' : 'Closed now'}
          </button>
        </div>
      </div>
    </div>
  );
}
