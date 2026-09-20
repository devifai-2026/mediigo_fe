import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useQueueSnapshot } from '../../hooks/useQueueSnapshot.js';
import { useSocketEvent } from '../../hooks/useSocketEvent.js';
import { useAudioUnlock } from '../../hooks/useAudioUnlock.js';
import { api } from '../../lib/api.js';
import { announce } from '../../lib/audio.js';
import { EVENTS } from '../../lib/socketEvents.js';
import { Button } from '../../components/ui/Button.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { StatCard } from '../../components/ui/StatCard.jsx';
import { BreakStateManager } from '../../components/doctor/BreakStateManager.jsx';
import { QueueRoster, SkippedDrawer } from '../../components/queue/QueueRoster.jsx';
import { token } from '../../lib/format.js';

export default function DoctorChamberView() {
  const { user } = useAuth();
  const toast = useToast();
  const doctorId = user?.doctorId;
  const { snapshot, refetch } = useQueueSnapshot(doctorId);
  const { ready: audioReady, unlock } = useAudioUnlock();
  const [busy, setBusy] = useState(false);

  // The server sends the announcement as a separate command from the state
  // change, so a recall re-announces without moving the queue.
  useSocketEvent(EVENTS.EXECUTE_AUDIO_ANNOUNCEMENT, (p) => {
    announce({ announcementId: p.announcementId, text: p.text?.en, lang: p.lang });
  });

  const act = async (fn, successMsg) => {
    setBusy(true);
    try {
      await fn();
      if (successMsg) toast.success(successMsg);
      refetch();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const callNext = () => act(async () => {
    const r = await api.post(`/api/queue/${doctorId}/call-next`);
    const called = r.data?.data?.called;
    if (called) toast.success(`Called ${token(called.tokenNumber)}`);
  });

  const recall = () => act(() => api.post(`/api/queue/${doctorId}/recall`), 'Re-announced');

  const onRowAction = (action, t) => {
    if (action === 'RESTORE') return act(() => api.post(`/api/queue/tokens/${t.tokenId}/restore`), 'Recalled to the queue');
    return act(() => api.post(`/api/queue/tokens/${t.tokenId}/status`, { status: action }));
  };

  const s = snapshot;
  const current = s?.tokens?.find((t) => t.status === 'IN_CHAMBER');

  return (
    <div className="space-y-5">
      {!audioReady && (
        <button
          type="button"
          onClick={unlock}
          className="w-full p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center justify-center gap-2"
        >
          <Icon name="megaphone" className="w-4 h-4" />
          Tap to enable the call chime and voice announcements
        </button>
      )}

      <div className="bg-hero-chamber rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute h-full w-full rounded-full bg-teal-400 opacity-75" />
                <span className="relative rounded-full h-3 w-3 bg-teal-500" />
              </span>
              <span className={`text-xs font-bold tracking-widest uppercase ${s?.session?.isOnBreak ? 'text-amber-300' : 'text-teal-300'}`}>
                {s?.session?.isOnBreak ? 'Session paused — on break' : s?.session?.isBookingOpen ? 'Live OPD session active' : 'Bookings closed'}
              </span>
            </div>
            <div className="flex items-baseline gap-4 mt-2">
              <span className="text-xs text-slate-300">Now consulting</span>
              <h1 className="text-5xl sm:text-6xl font-black text-teal-400 tracking-tight">
                {token(s?.currentToken ?? 0)}
              </h1>
            </div>
            {current && <p className="text-sm text-slate-300 mt-1">{current.name}</p>}
            <p className="text-xs text-slate-400 mt-2">
              Chamber {s?.chamberNumber || '—'} · {s?.counts?.waiting ?? 0} waiting
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/15 space-y-3 max-w-md w-full">
            <Button onClick={callNext} loading={busy} disabled={s?.session?.isOnBreak} size="lg" className="w-full">
              <Icon name="megaphone" className="w-4 h-4" /> Call next (voice announcement)
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={recall} disabled={!current || busy} className="bg-white/15 hover:bg-white/25 text-white border-white/10">
                Re-announce
              </Button>
              <Button
                variant="secondary"
                disabled={!current || busy}
                onClick={() => onRowAction('COMPLETED', { tokenId: current?.tokenId })}
                className="bg-emerald-600/90 hover:bg-emerald-600 text-white border-none"
              >
                Mark complete
              </Button>
            </div>
            <BreakStateManager doctorId={doctorId} session={s?.session} onChanged={refetch} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Waiting" value={s?.counts?.waiting ?? 0} icon="clock" tone="warn" />
        <StatCard label="Completed" value={s?.counts?.completed ?? 0} icon="check" tone="cash" />
        <StatCard label="Skipped" value={s?.counts?.skipped ?? 0} icon="cross" tone="alert" />
        <StatCard
          label="Est. wait"
          value={s?.estimatedWaitMinutes == null ? 'Paused' : `${s.estimatedWaitMinutes} min`}
          icon="clock"
          tone="teal"
          hint={s?.session?.isOnBreak ? 'Queue is paused during a break' : undefined}
        />
      </div>

      <SkippedDrawer tokens={s?.tokens ?? []} onRestore={(t) => onRowAction('RESTORE', t)} />

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Today's roster</h3>
        </div>
        <QueueRoster tokens={s?.tokens ?? []} onAction={onRowAction} />
      </div>
    </div>
  );
}
