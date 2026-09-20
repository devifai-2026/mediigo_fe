import clsx from 'clsx';
import { Modal } from '../ui/Modal.jsx';
import { StatusBadge } from '../ui/StatusBadge.jsx';
import { ClinicMap } from './ClinicMap.jsx';
import { inr, shortDate } from '../../lib/format.js';

const Stat = ({ label, value, tone = 'text-slate-900' }) => (
  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
    <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-bold">{label}</span>
    <span className={clsx('text-base font-black', tone)}>{value}</span>
  </div>
);

export function ClinicProfile({ clinic, open, onClose, onOpenDoctor }) {
  if (!open || !clinic) return null;
  const a = clinic.address ?? {};

  return (
    <Modal open={open} onClose={onClose} title={clinic.name} subtitle={`${clinic.code} · ${clinic.type}`} size="lg">
      <div className="space-y-5">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={clinic.networkState} />
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">{clinic.subscriptionPlan}</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">{clinic.district}</span>
          <span className="text-[10px] text-slate-400">Licence {clinic.licenseNumber}</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <Stat label="Doctors" value={clinic.doctorCount} />
          <Stat label="Online now" value={clinic.onlineDoctors} tone="text-emerald-600" />
          <Stat label="Patients today" value={clinic.patientsToday} tone="text-indigo-600" />
          <Stat label="Collections" value={inr(clinic.totalCash)} tone="text-teal-700" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Address</p>
              <p className="text-xs text-slate-700">{a.line1}</p>
              {a.line2 && <p className="text-xs text-slate-700">{a.line2}</p>}
              <p className="text-xs text-slate-500">{a.city} {a.pincode}, {a.state}</p>
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Contact</p>
              <p className="text-xs text-slate-700 font-mono">{clinic.contactPhone || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Onboarded by</p>
              <p className="text-xs text-slate-700">{clinic.agentName}</p>
              <p className="text-[10px] text-slate-400">{shortDate(clinic.createdAt)}</p>
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Collections split</p>
              <div className="flex gap-3 text-[11px] font-bold">
                <span className="text-emerald-600">Fresh {inr(clinic.cashFresh)}</span>
                <span className="text-blue-600">F/U {inr(clinic.cashFollowup)}</span>
                <span className="text-rose-600">Emg {inr(clinic.cashEmergency)}</span>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Location</p>
            <ClinicMap coordinates={clinic.coordinates} name={clinic.name} />
            {clinic.geocodeAccuracy && (
              <p className="text-[10px] text-slate-400 mt-1">Geocode accuracy: {clinic.geocodeAccuracy}</p>
            )}
          </div>
        </div>

        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
            Doctors at this clinic ({clinic.doctorCount})
          </p>
          {clinic.doctors.length === 0 ? (
            <p className="text-[11px] text-slate-400 italic">No doctors attached yet.</p>
          ) : (
            <div className="space-y-2">
              {clinic.doctors.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => onOpenDoctor?.(d)}
                  className="w-full flex items-center justify-between gap-3 p-3 bg-slate-50 hover:bg-white hover:border-teal-300 border border-slate-200 rounded-xl transition text-left"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900">{d.doctorName}</p>
                    <p className="text-[11px] text-slate-500">{d.specialty} · Reg {d.regNo}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {d.isOnBreak && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">ON BREAK</span>
                    )}
                    <span className={clsx(
                      'text-[9px] font-bold px-2 py-0.5 rounded-full',
                      d.isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600',
                    )}>
                      {d.isOnline ? 'ONLINE' : 'OFFLINE'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
