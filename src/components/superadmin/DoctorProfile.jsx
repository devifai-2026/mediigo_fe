import { useState, useEffect } from 'react';
import clsx from 'clsx';
import { api } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { PhotoField } from '../ui/PhotoCropper.jsx';
import { Modal } from '../ui/Modal.jsx';
import { ClinicMap } from './ClinicMap.jsx';
import { inr } from '../../lib/format.js';

const Stat = ({ label, value, tone = 'text-slate-900' }) => (
  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
    <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-bold">{label}</span>
    <span className={clsx('text-base font-black', tone)}>{value}</span>
  </div>
);

export function DoctorProfile({ doctor, clinic, open, onClose, onChanged }) {
  const toast = useToast();
  const [photoBusy, setPhotoBusy] = useState(false);
  // The console's doctor rows carry photoUrl; keep a local copy so the drawer
  // updates the moment an upload lands rather than waiting for a console refetch.
  const [photoUrl, setPhotoUrl] = useState(doctor?.photoUrl ?? null);

  useEffect(() => { setPhotoUrl(doctor?.photoUrl ?? null); }, [doctor]);

  if (!open || !doctor) return null;

  const uploadPhoto = async (file) => {
    setPhotoBusy(true);
    try {
      const body = new FormData();
      body.append('photo', file);
      // Let the browser set the multipart boundary; forcing a Content-Type here
      // omits it and the server rejects the body.
      const res = await api.put(`/api/doctors/${doctor.id}/photo`, body, { headers: { 'Content-Type': undefined } });
      setPhotoUrl(res.data?.data?.photo?.url ?? null);
      toast.success('Photo updated');
      onChanged?.();
    } catch (e) { toast.error(e.message); } finally { setPhotoBusy(false); }
  };

  const removePhoto = async () => {
    setPhotoBusy(true);
    try {
      await api.delete(`/api/doctors/${doctor.id}/photo`);
      setPhotoUrl(null);
      toast.success('Photo removed');
      onChanged?.();
    } catch (e) { toast.error(e.message); } finally { setPhotoBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={doctor.doctorName} subtitle={`${doctor.specialty} · ${doctor.clinicName}`} size="lg">
      <div className="space-y-5">
        <PhotoField
          value={photoUrl}
          name={doctor.doctorName}
          busy={photoBusy}
          onUpload={uploadPhoto}
          onRemove={removePhoto}
          hint="Shown to patients on the doctor's card. Square, up to 8MB."
        />

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
