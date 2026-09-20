import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useQueueSnapshot } from '../../hooks/useQueueSnapshot.js';
import { useAudioUnlock } from '../../hooks/useAudioUnlock.js';
import { useSocketEvent } from '../../hooks/useSocketEvent.js';
import { announce } from '../../lib/audio.js';
import { EVENTS } from '../../lib/socketEvents.js';
import { api } from '../../lib/api.js';
import { Select } from '../../components/ui/Field.jsx';
import { StatCard } from '../../components/ui/StatCard.jsx';
import { QueueRoster, SkippedDrawer } from '../../components/queue/QueueRoster.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { token } from '../../lib/format.js';

export default function ReceptionQueueView() {
  const { data: doctors } = useApi('/api/doctors');
  const toast = useToast();
  const [doctorId, setDoctorId] = useState('');
  const { snapshot, refetch } = useQueueSnapshot(doctorId || null);
  const { ready: audioReady, unlock } = useAudioUnlock();

  useEffect(() => {
    if (!doctorId && doctors?.length) setDoctorId(doctors[0]._id);
  }, [doctors, doctorId]);

  // The front desk is usually where the speaker lives.
  useSocketEvent(EVENTS.EXECUTE_AUDIO_ANNOUNCEMENT, (p) => {
    announce({ announcementId: p.announcementId, text: p.text?.en, lang: p.lang });
  });

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
        <Select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} className="w-auto min-w-[220px]">
          {doctors.map((d) => <option key={d._id} value={d._id}>{d.name} — {d.specialty}</option>)}
        </Select>
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
    </div>
  );
}
