import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useQueueSnapshot } from '../../hooks/useQueueSnapshot.js';
import { useSocketEvent } from '../../hooks/useSocketEvent.js';
import { useAudioUnlock } from '../../hooks/useAudioUnlock.js';
import { useDeskActions } from '../../hooks/useDeskActions.js';
import { api } from '../../lib/api.js';
import { announce } from '../../lib/audio.js';
import { EVENTS } from '../../lib/socketEvents.js';
import { token } from '../../lib/format.js';
import { BreakStateManager } from '../../components/doctor/BreakStateManager.jsx';
import { OutcomeDialog } from '../../components/doctor/OutcomeDialog.jsx';
import { CancellationsPanel } from '../../components/desk/Cancellations.jsx';
import { ChamberHero } from '../../components/desk/ChamberHero.jsx';
import { AudioUnlockBanner, DeskStats, SkippedPanel, DeskRoster } from '../../components/desk/DeskPanels.jsx';
import { RefreshButton } from '../../components/desk/ui.jsx';

export default function DoctorChamberView() {
  const { user } = useAuth();
  const toast = useToast();
  const doctorId = user?.doctorId;
  const { snapshot: s, refetch } = useQueueSnapshot(doctorId);
  const navigate = useNavigate();
  const { ready: audioReady, unlock } = useAudioUnlock();
  const desk = useDeskActions(doctorId, refetch);
  const [outcomeOpen, setOutcomeOpen] = useState(false);
  const [filter, setFilter] = useState('ALL');

  // The server sends the announcement as a separate command from the state
  // change, so a recall re-announces without moving the queue.
  useSocketEvent(EVENTS.EXECUTE_AUDIO_ANNOUNCEMENT, (p) => {
    announce({ announcementId: p.announcementId, text: p.text?.en, lang: p.lang });
  });

  // Someone else took a patient off this doctor's list: say so now, not only
  // in the panel the doctor may not be looking at.
  useSocketEvent(EVENTS.TOKEN_CANCELLED, (p) => {
    if (p.doctorId !== doctorId) return;
    const who = p.byRole === 'PATIENT' ? 'The patient' : (p.byName || 'The front desk');
    toast.warn(`${token(p.tokenNumber)} ${p.patientName} cancelled by ${who}${p.reason ? ` — ${p.reason}` : ''}`, { duration: 9000, key: `cancel-${p.tokenId}` });
  });

  const current = s?.tokens?.find((t) => t.status === 'IN_CHAMBER');
  // The server states this outright rather than leaving each client to infer
  // it from an absent IN_CHAMBER row.
  const hasCalled = s?.chamberState === 'DONE';

  const nextUp = s?.tokens?.find((t) => t.status === 'WAITING');

  /**
   * Finish the patient inside: the outcome (and any follow-up) is asked in
   * one dialog, which also offers to call the next patient in the same tap.
   * With nobody in the chamber there is nothing to finish, so "Call next"
   * goes straight to the call.
   */
  const finish = async ({ followUp, andCallNext, ...payload } = {}) => {
    // Booked BEFORE finishing: if the follow-up cannot be booked (the sitting
    // just filled), the doctor is still with the patient and can pick another
    // date, instead of discovering it after they have left the room.
    if (followUp && current) {
      try {
        await api.post(`/api/queue/tokens/${current.tokenId}/followup`, followUp);
        toast.success('Follow-up booked — the patient has been asked to confirm');
      } catch (e) {
        toast.error(e?.response?.data?.error?.message || e.message);
        return;
      }
    }
    if (andCallNext || !current) await desk.callNext(payload);
    else await desk.complete(current, payload.outcome, payload.outcomeNotes);
    setOutcomeOpen(false);
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {!audioReady && (
        <AudioUnlockBanner onUnlock={unlock}>Tap to enable the call chime and voice announcements</AudioUnlockBanner>
      )}

      <div className="flex items-center justify-between gap-3">
        <h1 className="text-base font-semibold text-slate-900">Today’s OPD Queue</h1>
        <RefreshButton onRefresh={refetch} label="Refresh queue" />
      </div>

      <ChamberHero
        snapshot={s}
        current={current}
        hasCalled={hasCalled}
        busy={desk.busy}
        onCallNext={() => (current ? setOutcomeOpen(true) : finish())}
        onRecall={desk.recall}
        onComplete={() => current && setOutcomeOpen(true)}
        onSkip={() => current && desk.skip(current)}
        onOutcome={(o) => current && desk.complete(current, o)}
        onWriteRx={() => current && navigate(`/d/rx?token=${current.tokenId}`)}
        footer={<BreakStateManager doctorId={doctorId} session={s?.session} onChanged={refetch} />}
      />

      <DeskStats counts={s?.counts} />

      <CancellationsPanel cancellations={s?.cancellations} forDoctor onChanged={refetch} toast={toast} />

      <SkippedPanel tokens={s?.tokens} onRestore={desk.restore} busy={desk.busy} />

      <DeskRoster
        snapshot={s}
        filter={filter}
        onFilter={setFilter}
        busy={desk.busy}
        onRefresh={refetch}
        canPrescribe
        onAction={(action, t) => {
          if (action === 'RX') navigate(`/d/rx?token=${t.tokenId}`);
          // Finishing from the list asks the same outcome as the main button.
          else if (action === 'COMPLETED') setOutcomeOpen(true);
          else desk.onRowAction(action, t);
        }}
      />

      <OutcomeDialog
        open={outcomeOpen}
        doctorId={doctorId}
        hasFollowUp={Boolean(current?.hasFollowUp)}
        patientName={current?.name}
        tokenNumber={current ? token(current.tokenNumber) : ''}
        nextLabel={nextUp ? token(nextUp.tokenNumber) : ''}
        busy={desk.busy}
        onClose={() => setOutcomeOpen(false)}
        onConfirm={finish}
      />
    </div>
  );
}
