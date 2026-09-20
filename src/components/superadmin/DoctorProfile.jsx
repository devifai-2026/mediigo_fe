import clsx from 'clsx';
import { Modal } from '../ui/Modal.jsx';
import { ClinicMap } from './ClinicMap.jsx';
import { inr } from '../../lib/format.js';

const Stat = ({ label, value, tone = 'text-slate-900' }) => (
  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
    <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-bold">{label}</span>
    <span className={clsx('text-base font-black', tone)}>{value}</span>
  </div>
);

export function DoctorProfile({ doctor, clinic, open, onClose }) {
  if (!open || !doctor) return null;

  return (
    <Modal open={open} onClose={onClose} title={doctor.doctorName} subtitle={`${doctor.specialty} · ${doctor.clinicName}`} size="lg">
      <div className="space-y-5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={clsx(
            'text-[10px] font-bold px-2 py-0.5 rounded-full',
            doctor.isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600',
          )}>
            {doctor.isOnline ? 'ACCEPTING BOOKINGS' : 'BOOKINGS CLOSED'}
          </span>
          {doctor.isOnBreak && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">ON BREAK</span>
          )}
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">{doctor.specialty}</span>
          <span className="text-[10px] text-slate-400">Reg {doctor.regNo}</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <Stat label="Today" value={doctor.patientsToday} tone="text-emerald-600" />
          <Stat label="This week" value={doctor.patientsWeek} />
          <Stat label="This month" value={doctor.patientsMonth} />
          <Stat label="All time" value={doctor.patientsTotal} tone="text-indigo-600" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Qualifications</p>
              <p className="text-xs text-slate-700">{doctor.education || '—'}</p>
              <p className="text-[11px] text-slate-500">{doctor.experience}</p>
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Clinic</p>
              <p className="text-xs font-bold text-slate-800">{doctor.clinicName}</p>
              <p className="text-[11px] text-slate-500">{doctor.address}</p>
              <p className="text-[11px] text-slate-500">{doctor.district} district</p>
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Collections</p>
              <div className="flex gap-3 text-[11px] font-bold">
                <span className="text-emerald-600">Fresh {inr(doctor.cashFresh)}</span>
                <span className="text-blue-600">F/U {inr(doctor.cashFollowup)}</span>
                <span className="text-rose-600">Emg {inr(doctor.cashEmergency)}</span>
              </div>
              <p className="text-sm font-black text-teal-700 mt-1">{inr(doctor.totalCash)} total</p>
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Onboarded by</p>
              <p className="text-xs text-slate-700">{doctor.agentName}</p>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Clinic location</p>
            <ClinicMap coordinates={clinic?.coordinates} name={doctor.clinicName} />
          </div>
        </div>
      </div>
    </Modal>
  );
}
