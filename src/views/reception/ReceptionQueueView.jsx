import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useConfirm } from '../../context/ConfirmContext.jsx';
import { useQueueSnapshot } from '../../hooks/useQueueSnapshot.js';
import { useAudioUnlock } from '../../hooks/useAudioUnlock.js';
import { useSocketEvent } from '../../hooks/useSocketEvent.js';
import { announce } from '../../lib/audio.js';
import { EVENTS } from '../../lib/socketEvents.js';
import { api } from '../../lib/api.js';
import { Select } from '../../components/ui/Field.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { StatCard } from '../../components/ui/StatCard.jsx';
import { QueueRoster, SkippedDrawer } from '../../components/queue/QueueRoster.jsx';
import { AvailabilityManager } from '../../components/doctor/AvailabilityManager.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { token } from '../../lib/format.js';

export default function ReceptionQueueView() {
  const { data: doctors } = useApi('/api/doctors');
  const toast = useToast();
  const confirm = useConfirm();
  const [doctorId, setDoctorId] = useState('');
  const [bookingBusy, setBookingBusy] = useState(false);
  const { snapshot, refetch } = useQueueSnapshot(doctorId || null);
  const { ready: audioReady, unlock } = useAudioUnlock();

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
        title: 'Close bookings?',
        message: `No new tokens can be issued for ${name}, in the app or at this desk.`,
        detail: 'Patients already in the queue keep their tokens and are unaffected.',
        confirmLabel: 'Close bookings',
      });
      if (!ok) return;
    }
    setBookingBusy(true);
    try {
      await api.post(`/api/queue/${doctorId}/booking`, { isOpen });
      toast.success(isOpen ? `Bookings opened for ${name}` : `Bookings closed for ${name}`);
      refetch();
    } catch (e) {
      toast.error(e?.response?.data?.error?.message || e.message);
    } finally {
      setBookingBusy(false);
    }
  };

  const onAction = async (action, t) => {
    try {
      if (action === 'RESTORE') await api.post(`/api/queue/tokens/${t.tokenId}/restore`);
      else await api.post(`/api/queue/tokens/${t.tokenId}/status`, { status: action });
      refetch();
    } catch (e) {
      toast.error(e.message);
    }
  };

  if (!doctors?.length) {
    return <EmptyState icon="users" title="No doctors at this clinic yet" hint="Ask your district admin to add doctors." />;
  }

  const s = snapshot;

  return (
    <div className="space-y-5">
      {!audioReady && (
        <button type="button" onClick={unlock} className="w-full p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center justify-center gap-2">
          <Icon name="megaphone" className="w-4 h-4" /> Tap to enable waiting-room announcements
        </button>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-xl font-bold text-slate-900">Live queue</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} className="w-auto min-w-[220px]">
            {doctors.map((d) => <option key={d._id} value={d._id}>{d.name} — {d.specialty}</option>)}
          </Select>
          {/* Disabled while on a break: a break already halts the queue, and
              offering a second, differently-named switch for the same outcome
              is how a desk ends up unsure which one actually did it. */}
          <Button
            variant={s?.session?.isBookingOpen ? 'secondary' : 'primary'}
            size="sm"
            disabled={bookingBusy || !doctorId || s?.session?.isOnBreak}
            title={s?.session?.isOnBreak ? 'Resume the doctor from their break first' : undefined}
            onClick={() => toggleBooking(!s?.session?.isBookingOpen)}
          >
            {s?.session?.isBookingOpen ? 'Close bookings' : 'Open bookings'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Now serving" value={token(s?.currentToken ?? 0)} icon="megaphone" tone="teal" />
        <StatCard label="Waiting" value={s?.counts?.waiting ?? 0} icon="clock" tone="warn" />
        <StatCard label="Completed" value={s?.counts?.completed ?? 0} icon="check" tone="cash" />
        <StatCard
          label="Status"
          value={s?.session?.isOnBreak ? 'On break' : s?.session?.isBookingOpen ? 'Open' : 'Closed'}
          icon="info"
          tone={s?.session?.isOnBreak ? 'warn' : s?.session?.isBookingOpen ? 'cash' : 'slate'}
          hint={s?.session?.isOnBreak ? s.session.breakReason : undefined}
        />
      </div>

      <SkippedDrawer tokens={s?.tokens ?? []} onRestore={(t) => onAction('RESTORE', t)} />

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <QueueRoster tokens={s?.tokens ?? []} onAction={onAction} />
      </div>

      {/* The desk fields the phone call when a doctor cannot come in, so it
          needs to close a sitting without waiting for the doctor to log in. */}
      {doctorId && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <AvailabilityManager doctorId={doctorId} />
        </div>
      )}
    </div>
  );
}
