import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useConfirm } from '../../context/ConfirmContext.jsx';
import { useApi } from '../../hooks/useApi.js';
import { useQueueSnapshot } from '../../hooks/useQueueSnapshot.js';
import { api } from '../../lib/api.js';
import { ROLES } from '../../lib/constants.js';
import { pad2 } from '../../components/desk/deskFormat.js';
import { Button } from '../../components/ui/Button.jsx';
import { Field, Input } from '../../components/ui/Field.jsx';
import { MoneyInput } from '../../components/ui/MoneyInput.jsx';
import { PhotoField } from '../../components/ui/PhotoCropper.jsx';
import { AvailabilityManager } from '../../components/doctor/AvailabilityManager.jsx';
import { StandeePanel } from '../../components/doctor/StandeePanel.jsx';
import { Avatar, DeskCard, DoctorPicker, EmptyNote, PageHeader, Pill, SectionHead } from '../../components/desk/ui.jsx';

const errMsg = (e) => e?.response?.data?.error?.message || e.message;

const hm = (minutes) => {
  if (!minutes) return '0m';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h ? `${pad2(h)}h ${pad2(m)}m` : `${m}m`;
};

/**
 * Profile & settings.
 *
 * A doctor manages their own profile. The front desk picks a doctor and
 * manages what the server lets it: fees, photo, bookings and availability —
 * name, qualifications and chamber stay the doctor's to change.
 */
export default function DeskProfileView() {
  const { user, role } = useAuth();
  const isDoctor = role === ROLES.DOCTOR;
  const { data: doctors } = useApi(isDoctor ? null : '/api/doctors', { skip: isDoctor });
  const [picked, setPicked] = useState('');
  useEffect(() => {
    if (!isDoctor && !picked && doctors?.length) setPicked(doctors[0]._id);
  }, [doctors, picked, isDoctor]);
  const doctorId = isDoctor ? user?.doctorId : picked;

  return (
    <div className="space-y-5">
      {!isDoctor && (
        <>
          <PageHeader
            icon="fa-user-doctor"
            title="Doctor Profiles & Settings"
            subtitle="Fees, photo, bookings and leave for the doctors at this clinic"
            badge={user?.clinic?.name && <Pill tone="teal">{user.clinic.name}</Pill>}
          />
          {doctors?.length > 0 && (
            <DeskCard className="p-3 sm:p-4">
              <DoctorPicker doctors={doctors} value={picked} onChange={setPicked} />
            </DeskCard>
          )}
        </>
      )}
      {doctorId
        ? <DoctorSettings key={doctorId} doctorId={doctorId} canEditDetails={isDoctor} />
        : doctors && <DeskCard><EmptyNote icon="fa-user-doctor" title="No doctors at this clinic yet" /></DeskCard>}
    </div>
  );
}

function DoctorSettings({ doctorId, canEditDetails }) {
  const toast = useToast();
  const confirm = useConfirm();
  const { data: doctor, refetch } = useApi(`/api/doctors/${doctorId}`);
  const { snapshot } = useQueueSnapshot(doctorId);

  const [fees, setFees] = useState({ fresh: '', followup: '', emergency: '' });
  const [details, setDetails] = useState({ name: '', qualifications: '', chamberNumber: '', avgConsultMinutes: '' });
  const [busy, setBusy] = useState(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  useEffect(() => {
    if (!doctor) return;
    setFees(doctor.fees);
    setDetails({
      name: doctor.name || '',
      qualifications: (doctor.qualifications || []).join(', '),
      chamberNumber: doctor.chamberNumber || '',
      avgConsultMinutes: doctor.avgConsultMinutes ?? '',
    });
  }, [doctor]);

  const run = async (key, fn, msg) => {
    setBusy(key);
    try {
      await fn();
      if (msg) toast.success(msg);
      refetch();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(null);
    }
  };

  const uploadPhoto = async (file) => {
    setPhotoBusy(true);
    try {
      const body = new FormData();
      body.append('photo', file);
      // Let the browser set the multipart boundary; forcing a Content-Type here
      // would omit it and the server would reject the body.
      await api.put(`/api/doctors/${doctorId}/photo`, body, { headers: { 'Content-Type': undefined } });
      toast.success('Photo updated');
      refetch();
    } catch (e) { toast.error(errMsg(e)); } finally { setPhotoBusy(false); }
  };

  const removePhoto = async () => {
    setPhotoBusy(true);
    try {
      await api.delete(`/api/doctors/${doctorId}/photo`);
      toast.success('Photo removed');
      refetch();
    } catch (e) { toast.error(errMsg(e)); } finally { setPhotoBusy(false); }
  };

  const toggleBooking = async () => {
    const open = !doctor.session?.isBookingOpen;
    if (!open) {
      const ok = await confirm({
        title: 'Pause OPD bookings?',
        message: `No new tokens can be issued for ${doctor.name}, in the app or at the desk.`,
        detail: 'Patients already in the queue keep their tokens.',
        confirmLabel: 'Pause bookings',
      });
      if (!ok) return;
    }
    run('booking', () => api.post(`/api/queue/${doctorId}/booking`, { isOpen: open }), open ? 'Bookings re-opened' : 'Bookings paused');
  };

  const saveDetails = () => run('details', () => api.patch(`/api/doctors/${doctorId}`, {
    name: details.name.trim(),
    chamberNumber: details.chamberNumber.trim(),
    qualifications: details.qualifications.split(',').map((q) => q.trim()).filter(Boolean).slice(0, 10),
    ...(details.avgConsultMinutes !== '' ? { avgConsultMinutes: Number(details.avgConsultMinutes) } : {}),
  }), 'Profile updated — announcements use the new chamber number');

  const saveFees = () => run('fees', () => api.patch(`/api/doctors/${doctorId}/fees`, fees), 'Consultation fees updated');

  if (!doctor) return <div className="h-64 rounded-xl bg-white border border-slate-200 animate-pulse" />;

  const open = Boolean(doctor.session?.isBookingOpen);
  const onBreak = Boolean(doctor.session?.isOnBreak);

  // Today's shift, measured from the queue itself.
  const tokens = snapshot?.tokens ?? [];
  const consults = tokens
    .filter((t) => t.enteredChamberAt && t.completedAt)
    .map((t) => (new Date(t.completedAt) - new Date(t.enteredChamberAt)) / 60000)
    .filter((m) => m >= 0);
  const totalMinutes = consults.reduce((a, b) => a + b, 0);
  const avgMinutes = consults.length ? totalMinutes / consults.length : null;

  return (
    <div className="space-y-5">
      <DeskCard className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Avatar name={doctor.name} src={doctor.photo?.url} className="w-16 h-16 !rounded-xl text-lg" />
            <div className="min-w-0">
              <h2 className="text-xl font-semibold text-slate-900">{doctor.name}</h2>
              {(doctor.qualifications?.length > 0 || doctor.registration?.number) && (
                <p className="text-xs font-medium text-mg-teal">
                  {[doctor.qualifications?.join(', '), doctor.registration?.number && `Reg: ${doctor.registration.number}`].filter(Boolean).join(' • ')}
                </p>
              )}
              <p className="text-xs text-slate-500 mt-0.5">
                {[doctor.specialty, doctor.hospital?.name, doctor.chamberNumber && `Chamber ${doctor.chamberNumber}`].filter(Boolean).join(' • ')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Pill dot tone={onBreak ? 'amber' : open ? 'emerald' : 'rose'}>
              {onBreak ? 'On break' : open ? 'Chamber active' : 'Bookings paused'}
            </Pill>
            <Button
              size="sm"
              variant={open ? 'danger' : 'primary'}
              onClick={toggleBooking}
              loading={busy === 'booking'}
              disabled={onBreak}
              title={onBreak ? 'End the break first — a break already pauses the queue' : undefined}
            >
              <i className={clsx('fa-solid', open ? 'fa-ban' : 'fa-lock-open')} aria-hidden="true" />
              {open ? 'Close booking' : 'Re-open booking'}
            </Button>
          </div>
        </div>
      </DeskCard>

      <DeskCard className="p-4 sm:p-5 space-y-4">
        <SectionHead
          icon="fa-calendar-xmark"
          title="Availability & Leave Manager"
          subtitle="Pause bookings instantly, or close dates and sittings in advance"
          right={<Pill dot tone={open ? 'emerald' : 'rose'}>{open ? 'Bookings active' : 'Bookings paused'}</Pill>}
        />
        {!open && (
          <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs font-medium text-rose-800">
              <i className="fa-solid fa-triangle-exclamation text-rose-600 mr-1.5" aria-hidden="true" />
              OPD bookings are currently closed — patients cannot get a token.
            </p>
            <Button size="sm" variant="danger" onClick={toggleBooking} loading={busy === 'booking'} disabled={onBreak}>
              <i className="fa-solid fa-lock-open" aria-hidden="true" /> Re-open bookings now
            </Button>
          </div>
        )}
        <div className="rounded-lg border border-slate-200 p-4">
          <AvailabilityManager doctorId={doctorId} />
        </div>
      </DeskCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <DeskCard className="p-4 sm:p-5 space-y-4">
          <SectionHead icon="fa-user-pen" title="Profile Details" subtitle={canEditDetails ? 'Shown to patients and read out in announcements' : 'Only the doctor can change these'} />
          <PhotoField
            value={doctor.photo?.url ?? null}
            name={doctor.name}
            busy={photoBusy}
            onUpload={uploadPhoto}
            onRemove={removePhoto}
            onReject={(m) => toast.error(m)}
            hint="Shown to patients on the doctor card. JPEG, PNG or WebP · up to 8MB."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Doctor name">
              <Input value={details.name} disabled={!canEditDetails} maxLength={80} onChange={(e) => setDetails({ ...details, name: e.target.value })} />
            </Field>
            <Field label="Chamber / room" hint="Read out in every voice announcement">
              <Input value={details.chamberNumber} disabled={!canEditDetails} maxLength={20} onChange={(e) => setDetails({ ...details, chamberNumber: e.target.value })} placeholder="104" />
            </Field>
            <Field label="Qualifications" hint="Comma separated, e.g. MBBS, MD">
              <Input value={details.qualifications} disabled={!canEditDetails} onChange={(e) => setDetails({ ...details, qualifications: e.target.value })} placeholder="MBBS, MD (General Medicine)" />
            </Field>
            <Field label="Average consult (minutes)" hint="Drives the waiting-time estimate patients see">
              <Input inputMode="numeric" maxLength={3} value={details.avgConsultMinutes} disabled={!canEditDetails} onChange={(e) => setDetails({ ...details, avgConsultMinutes: e.target.value.replace(/\D/g, '') })} placeholder="8" />
            </Field>
          </div>
          {canEditDetails && (
            <Button onClick={saveDetails} loading={busy === 'details'} disabled={details.name.trim().length < 2} className="w-full">
              Update profile
            </Button>
          )}
        </DeskCard>

        <DeskCard className="p-4 sm:p-5 space-y-4">
          <SectionHead icon="fa-indian-rupee-sign" title="OPD Consultation Fees" subtitle="Applied at the front desk when a patient registers" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[['fresh', 'Fresh consultation'], ['followup', 'Follow-up'], ['emergency', 'Emergency / urgent']].map(([k, label]) => (
              <div key={k} className="p-3 rounded-lg bg-mg-surface space-y-1.5">
                <span className="block text-[11px] font-medium text-slate-600">{label}</span>
                <MoneyInput value={fees[k]} onChange={(v) => setFees({ ...fees, [k]: v })} />
              </div>
            ))}
          </div>
          <Button onClick={saveFees} loading={busy === 'fees'} className="w-full">
            <i className="fa-solid fa-check" aria-hidden="true" /> Save fee changes
          </Button>

          <div className="pt-4 border-t border-slate-100 space-y-3">
            <SectionHead icon="fa-stopwatch" title="Today’s Shift Performance" subtitle="Measured from today’s queue" />
            <div className="grid grid-cols-2 gap-2.5 text-center">
              {[
                ['Time in consultations', hm(totalMinutes), 'text-mg-blue'],
                ['Average per patient', avgMinutes != null ? `${avgMinutes.toFixed(1)} mins` : '—', 'text-slate-900'],
                ['Patients attended', `${pad2(snapshot?.counts?.completed)} patients`, 'text-slate-900'],
                ['Patient rating', doctor.rating?.count ? `★ ${doctor.rating.average.toFixed(1)} / 5` : 'No reviews yet', 'text-amber-500'],
              ].map(([label, value, tone]) => (
                <div key={label} className="p-3 rounded-lg bg-mg-surface">
                  <span className="block text-[10px] uppercase text-slate-400">{label}</span>
                  <span className={clsx('text-sm font-semibold', tone)}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </DeskCard>
      </div>

      <DeskCard className="p-4 sm:p-5">
        <StandeePanel doctorId={doctorId} />
      </DeskCard>
    </div>
  );
}
