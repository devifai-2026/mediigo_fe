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
import { WeeklyScheduleEditor } from '../../components/doctor/WeeklyScheduleEditor.jsx';
import { DoctorBasicsFields, DoctorPublicProfileFields, RegistrationFields } from '../../components/doctor/DoctorProfileFields.jsx';
import { SpecialtyPicker } from '../../components/ui/SpecialtyPicker.jsx';
import { toProfileForm, toProfilePayload } from '../../lib/doctorProfile.js';
import { StandeePanel } from '../../components/doctor/StandeePanel.jsx';
import { ClinicPharmacyCard } from '../../components/desk/ClinicPharmacyCard.jsx';
import { ChangePasswordCard } from '../../components/desk/ChangePasswordCard.jsx';
import { AccountSummary } from '../../components/desk/AccountSummary.jsx';
import { Avatar, DeskCard, DoctorPicker, EmptyNote, PageHeader, Pill, RefreshButton, SectionHead } from '../../components/desk/ui.jsx';

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
 * A doctor manages their own profile; the front desk picks one of the
 * clinic's doctors and manages theirs — details, public profile, fees, photo,
 * bookings and availability. Registration details are shown but locked: only
 * Mediigo support can correct them.
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
      {/* The profile icon leads here, so the desk's own account comes first. */}
      {!isDoctor && <AccountSummary />}
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
        ? <DoctorSettings key={doctorId} doctorId={doctorId} />
        : doctors && <DeskCard><EmptyNote icon="fa-user-doctor" title="No doctors at this clinic yet" /></DeskCard>}
      {isDoctor && <ClinicPharmacyCard />}
      <ChangePasswordCard />
    </div>
  );
}

function DoctorSettings({ doctorId }) {
  const toast = useToast();
  const confirm = useConfirm();
  const { data: doctor, refetch } = useApi(`/api/doctors/${doctorId}`);
  const { snapshot } = useQueueSnapshot(doctorId);
  const { data: specialtyOptions } = useApi('/api/specialties');

  const [fees, setFees] = useState({ fresh: '', followup: '', emergency: '' });
  const [details, setDetails] = useState(null);
  const [specialtyIds, setSpecialtyIds] = useState([]);
  const [busy, setBusy] = useState(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  useEffect(() => {
    if (!doctor || !details) return;
    setFees(doctor.fees);
    setDetails({ ...toProfileForm(doctor), name: doctor.name || '' });
    setSpecialtyIds((doctor.specialtyIds || []).map(String));
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
        title: 'Close online bookings?',
        message: `Patients can no longer book ${doctor.name} from the app. Walk-ins can still be registered at the desk.`,
        detail: 'Patients already in the queue keep their tokens.',
        confirmLabel: 'Close online bookings',
      });
      if (!ok) return;
    }
    run('booking', () => api.post(`/api/queue/${doctorId}/booking`, { isOpen: open }), open ? 'Online bookings re-opened' : 'Online bookings closed');
  };

  const setDetail = (k) => (e) => setDetails((d) => ({ ...d, [k]: e.target.value }));

  const saveDetails = () => run('details', () => api.patch(`/api/doctors/${doctorId}`, {
    name: details.name.trim(),
    ...(specialtyIds.length ? { specialtyIds } : {}),
    ...toProfilePayload(details),
  }), 'Profile updated');

  const saveFees = () => run('fees', () => api.patch(`/api/doctors/${doctorId}/fees`, fees), 'Consultation fees updated');

  if (!doctor || !details) return <div className="h-64 rounded-xl bg-white border border-slate-200 animate-pulse" />;

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
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <RefreshButton onRefresh={refetch} />
            <Pill dot tone={onBreak ? 'amber' : open ? 'emerald' : 'rose'}>
              {onBreak ? 'On break' : open ? 'Online bookings open' : 'Online bookings closed'}
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
              {open ? 'Close online booking' : 'Open online booking'}
            </Button>
          </div>
        </div>
      </DeskCard>

      {/* Set up in this order: who the doctor is, when they sit, then how the
          day is going. */}
      <StepCard step={1} icon="fa-user-pen" title="Profile Details" subtitle="Shown to patients and read out in announcements">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="space-y-4">
            <PhotoField
              value={doctor.photo?.url ?? null}
              name={doctor.name}
              busy={photoBusy}
              onUpload={uploadPhoto}
              onRemove={removePhoto}
              onReject={(m) => toast.error(m)}
              hint="Shown to patients on the doctor card. JPEG, PNG or WebP · up to 8MB."
            />
            <Field label="Doctor name" hint="“Dr.” is added automatically">
              <Input value={details.name} maxLength={80} onChange={setDetail('name')} />
            </Field>
            <SpecialtyPicker
              options={specialtyOptions ?? []}
              value={specialtyIds}
              onChange={setSpecialtyIds}
              hint="The first is the primary and leads on the patient card."
            />
            <RegistrationFields form={details} set={setDetail} locked />
          </div>
          <DoctorBasicsFields form={details} set={setDetail} />
        </div>
        <details className="rounded-lg border border-slate-200 p-3">
          <summary className="cursor-pointer text-xs font-semibold text-slate-700">
            Public profile — about, conditions, education, memberships, awards
          </summary>
          <div className="pt-3">
            <DoctorPublicProfileFields form={details} set={setDetail} />
          </div>
        </details>
        <Button onClick={saveDetails} loading={busy === 'details'} disabled={details.name.trim().length < 2} className="w-full sm:w-auto">
          <i className="fa-solid fa-check" aria-hidden="true" /> Save profile
        </Button>
      </StepCard>

      <StepCard
        step={2}
        icon="fa-calendar-days"
        title="Availability"
        subtitle="Weekly sitting days & timings, plus leave for specific dates"
        right={<Pill dot tone={open ? 'emerald' : 'rose'}>{open ? 'Online bookings open' : 'Online bookings closed'}</Pill>}
      >
        {!open && (
          <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs font-medium text-rose-800">
              <i className="fa-solid fa-triangle-exclamation text-rose-600 mr-1.5" aria-hidden="true" />
              Online bookings are closed — patients cannot book from the app. Walk-ins are still registered at the desk.
            </p>
            <Button size="sm" variant="danger" onClick={toggleBooking} loading={busy === 'booking'} disabled={onBreak}>
              <i className="fa-solid fa-lock-open" aria-hidden="true" /> Re-open online bookings
            </Button>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-lg border border-slate-200 p-4">
            <WeeklyScheduleEditor doctorId={doctorId} schedule={doctor.schedule} onSaved={refetch} />
          </div>
          <div className="rounded-lg border border-slate-200 p-4">
            <AvailabilityManager key={JSON.stringify(doctor.schedule ?? [])} doctorId={doctorId} />
          </div>
        </div>
      </StepCard>

      <StepCard step={3} icon="fa-stopwatch" title="Shift Performance" subtitle="Today’s consultations, measured from the queue — and the fees charged for them">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 text-center">
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
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <SectionHead icon="fa-indian-rupee-sign" title="OPD Consultation Fees" subtitle="Applied at the front desk when a patient registers" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[['fresh', 'Fresh consultation'], ['followup', 'Follow-up'], ['emergency', 'Emergency / urgent']].map(([k, label]) => (
              <div key={k} className="p-3 rounded-lg bg-mg-surface space-y-1.5">
                <span className="block text-[11px] font-medium text-slate-600">{label}</span>
                <MoneyInput value={fees[k]} onChange={(v) => setFees({ ...fees, [k]: v })} />
              </div>
            ))}
          </div>
          <Button onClick={saveFees} loading={busy === 'fees'} className="w-full sm:w-auto">
            <i className="fa-solid fa-check" aria-hidden="true" /> Save fee changes
          </Button>
        </div>
      </StepCard>

      <DeskCard className="p-4 sm:p-5">
        <StandeePanel doctorId={doctorId} />
      </DeskCard>
    </div>
  );
}

/** One numbered step of the profile setup. */
function StepCard({ step, icon, title, subtitle, right, children }) {
  return (
    <DeskCard className="p-4 sm:p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 shrink-0 grid place-items-center rounded-full bg-mg-teal text-white text-xs font-bold">{step}</span>
          <SectionHead icon={icon} title={title} subtitle={subtitle} />
        </div>
        {right}
      </div>
      {children}
    </DeskCard>
  );
}
