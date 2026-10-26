import { useState, useEffect } from 'react';
import clsx from 'clsx';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useConfirm } from '../../context/ConfirmContext.jsx';
import { useQueueSnapshot } from '../../hooks/useQueueSnapshot.js';
import { useAudioUnlock } from '../../hooks/useAudioUnlock.js';
import { useSocketEvent } from '../../hooks/useSocketEvent.js';
import { useDeskActions } from '../../hooks/useDeskActions.js';
import { announce } from '../../lib/audio.js';
import { EVENTS } from '../../lib/socketEvents.js';
import { api } from '../../lib/api.js';
import { AvailabilityManager } from '../../components/doctor/AvailabilityManager.jsx';
import { BreakStateManager } from '../../components/doctor/BreakStateManager.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { ChamberHero } from '../../components/desk/ChamberHero.jsx';
import { DeskStats, SkippedPanel, DeskRoster } from '../../components/desk/DeskPanels.jsx';
import { AudioUnlockBanner, DeskCard, DoctorPicker, Pill, RefreshButton } from '../../components/desk/ui.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { CancelTokenModal, CancellationsPanel } from '../../components/desk/Cancellations.jsx';

export default function ReceptionQueueView() {
  const { data: doctors } = useApi('/api/doctors');
  const toast = useToast();
  const confirm = useConfirm();
  const [doctorId, setDoctorId] = useState('');
  const [bookingBusy, setBookingBusy] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const { snapshot: s, refetch } = useQueueSnapshot(doctorId || null);
  const { ready: audioReady, unlock } = useAudioUnlock();
  const desk = useDeskActions(doctorId, refetch);
  const [cancelling, setCancelling] = useState(null);

  useEffect(() => {
    if (!doctorId && doctors?.length) setDoctorId(doctors[0]._id);
  }, [doctors, doctorId]);

  // The front desk is usually where the speaker lives.
  useSocketEvent(EVENTS.EXECUTE_AUDIO_ANNOUNCEMENT, (p) => {
    announce({ announcementId: p.announcementId, text: p.text?.en, lang: p.lang });
  });

  /**
   * Open or close a doctor's bookings from the front desk.
   *
   * The same endpoint the doctor's own portal uses — the server has always
   * allowed a receptionist to do this for any doctor in THEIR clinic
   * (assertDoctorScope), so this adds no permission, only the control that was
   * missing. Closing is confirmed because it is immediately visible to every
   * patient searching nearby; opening is not, because it only restores the
   * normal state.
   */
  const toggleBooking = async (isOpen) => {
    const name = doctors?.find((d) => d._id === doctorId)?.name || 'this doctor';
    if (!isOpen) {
      const ok = await confirm({
        title: 'Close online bookings?',
        message: `Patients can no longer book ${name} from the app. Walk-ins can still be registered at this desk.`,
        detail: 'Patients already in the queue keep their tokens and are unaffected.',
        confirmLabel: 'Close online bookings',
      });
      if (!ok) return;
    }
    setBookingBusy(true);
    try {
      await api.post(`/api/queue/${doctorId}/booking`, { isOpen });
      toast.success(isOpen ? `Online bookings opened for ${name}` : `Online bookings closed for ${name}`);
      refetch();
    } catch (e) {
      toast.error(e?.response?.data?.error?.message || e.message);
    } finally {
      setBookingBusy(false);
    }
  };

  if (!doctors?.length) {
    return <EmptyState icon="users" title="No doctors at this clinic yet" hint="Ask your district admin to add doctors." />;
  }

  const current = s?.tokens?.find((t) => t.status === 'IN_CHAMBER');
  const bookingOpen = Boolean(s?.session?.isBookingOpen);

  return (
    <div className="space-y-5 sm:space-y-6">
      {!audioReady && <AudioUnlockBanner onUnlock={unlock}>Tap to enable waiting-room announcements</AudioUnlockBanner>}

      {/* Which doctor's chamber this desk is driving. A pill per doctor rather
          than a dropdown: a clinic has a handful, and the desk switches often. */}
      <DeskCard className="p-3 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <DoctorPicker doctors={doctors} value={doctorId} onChange={setDoctorId} className="min-w-0" />

        {/* Disabled while on a break: a break already halts the queue, and
            offering a second, differently-named switch for the same outcome
            is how a desk ends up unsure which one actually did it. */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:shrink-0">
          <Pill dot tone={s?.session?.isOnBreak ? 'amber' : bookingOpen ? 'emerald' : 'slate'}>
            {s?.session?.isOnBreak ? 'On break' : bookingOpen ? 'Online bookings open' : 'Online bookings closed'}
          </Pill>
          <Button
            size="sm"
            variant={bookingOpen ? 'secondary' : 'primary'}
            disabled={bookingBusy || !doctorId || s?.session?.isOnBreak}
            title={s?.session?.isOnBreak ? 'Resume the doctor from their break first' : undefined}
            onClick={() => toggleBooking(!bookingOpen)}
            className="whitespace-nowrap order-last w-full sm:order-none sm:w-auto"
          >
            <i className={clsx('fa-solid', bookingOpen ? 'fa-ban' : 'fa-lock-open')} aria-hidden="true" />
            {bookingOpen ? 'Close online booking' : 'Open online booking'}
          </Button>
          <span className="ml-auto sm:ml-0"><RefreshButton onRefresh={refetch} /></span>
        </div>
      </DeskCard>

      {/* The desk calls straight through: the outcome of a consultation is the
          doctor's to record, so it is not asked here. */}
      <ChamberHero
        snapshot={s}
        current={current}
        hasCalled={s?.chamberState === 'DONE'}
        busy={desk.busy}
        onCallNext={() => desk.callNext()}
        onRecall={desk.recall}
        onComplete={() => current && desk.complete(current)}
        onSkip={() => current && desk.skip(current)}
        onOutcome={(o) => current && desk.complete(current, o)}
        footer={doctorId && <BreakStateManager doctorId={doctorId} session={s?.session} onChanged={refetch} />}
      />

      <DeskStats counts={s?.counts} />

      <SkippedPanel tokens={s?.tokens} onRestore={desk.restore} busy={desk.busy} />

      <DeskRoster
        snapshot={s}
        filter={filter}
        onFilter={setFilter}
        busy={desk.busy}
        onRefresh={refetch}
        canCancel
        onAction={(action, t) => (action === 'CANCEL' ? setCancelling(t) : desk.onRowAction(action, t))}
      />

      <CancellationsPanel cancellations={s?.cancellations} />
      <CancelTokenModal target={cancelling} onClose={() => setCancelling(null)} onDone={refetch} toast={toast} />

      {/* The desk fields the phone call when a doctor cannot come in, so it
          needs to close a sitting without waiting for the doctor to log in. */}
      {doctorId && (
        <DeskCard className="p-5">
          <AvailabilityManager doctorId={doctorId} />
        </DeskCard>
      )}
    </div>
  );
}
