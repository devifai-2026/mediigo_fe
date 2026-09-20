import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi.js';
import { useQueueSnapshot } from '../../hooks/useQueueSnapshot.js';
import { DarkHero, LivePill } from '../../components/layout/DarkHero.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { SkeletonRows } from '../../components/ui/Skeleton.jsx';
import { token, duration } from '../../lib/format.js';
import { patientsAhead, progressPct } from '../../lib/queue.js';
import { TOKEN_STATUS } from '../../lib/constants.js';

export default function TrackerView() {
  const { data: tokens, loading } = useApi('/api/patients/me/tokens?status=WAITING');
  const active = tokens?.[0] ?? null;
  const doctorId = active?.doctorId?._id ?? active?.doctorId;

  const { snapshot } = useQueueSnapshot(doctorId);

  const view = useMemo(() => {
    if (!active) return null;
    const current = snapshot?.currentToken ?? 0;
    const mine = active.tokenNumber;
    const onBreak = snapshot?.session?.isOnBreak;
    const ahead = patientsAhead(mine, current);
    return {
      current,
      mine,
      ahead,
      onBreak,
      breakReason: snapshot?.session?.breakReason,
      // Paused rather than a countdown that would be wrong.
      wait: onBreak ? null : ahead * (snapshot?.avgConsultMinutes ?? 8),
      pct: progressPct(current, mine),
    };
  }, [active, snapshot]);

  if (loading) return <SkeletonRows rows={3} />;

  if (!active) {
    return (
      <EmptyState
        icon="ticket"
        title="No active token right now"
        hint="Book a consultation and your live queue position will show up here."
        action="Find a doctor"
        onAction={() => { window.location.href = '/explore'; }}
      />
    );
  }

  const doc = active.doctorId;
  const hosp = active.hospitalId;

  return (
    <div className="space-y-5">
      <DarkHero>
        <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-white/10">
          <div>
            <LivePill>Live queue telemetry</LivePill>
            <h3 className="text-lg font-bold mt-2">{active.patientSnapshot?.name}</h3>
            <p className="text-xs text-slate-300">{hosp?.name} · {doc?.name}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15 text-right">
            <span className="text-[10px] uppercase text-slate-300 block">Chamber</span>
            <span className="text-xs font-bold">{doc?.chamberNumber || '—'}</span>
          </div>
        </div>

        {view.onBreak && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/15 border border-amber-400/30 text-amber-200 text-xs font-semibold flex items-center gap-2">
            <Icon name="pause" className="w-4 h-4 shrink-0" />
            Doctor is on a break{view.breakReason ? ` (${view.breakReason})` : ''} — the queue is paused.
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 my-6 text-center">
          <div className="bg-white/5 backdrop-blur-md p-4 rounded-xl border border-white/10">
            <span className="text-xs text-slate-300 block mb-1">Now consulting</span>
            <span className="text-3xl font-extrabold text-amber-400">{token(view.current)}</span>
          </div>
          <div className="bg-teal-500/20 backdrop-blur-md p-4 rounded-xl border border-teal-400/30">
            <span className="text-xs text-teal-200 block mb-1">Your token</span>
            <span className="text-3xl font-extrabold text-teal-300">{token(view.mine)}</span>
          </div>
          <div className="col-span-2 sm:col-span-1 bg-white/5 backdrop-blur-md p-4 rounded-xl border border-white/10 grid place-content-center">
            <span className="text-xs text-slate-300 block mb-1">Approx. wait</span>
            <span className="text-xl font-bold text-emerald-400">
              {view.wait == null ? 'Paused' : `~ ${duration(view.wait)}`}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-slate-300">
            <span>Queue progress</span>
            <span>{view.ahead} {view.ahead === 1 ? 'patient' : 'patients'} ahead</span>
          </div>
          <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${view.pct}%` }}
            />
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap gap-2 justify-end">
          {hosp?.contactPhone && (
            <a href={`tel:${hosp.contactPhone}`} className="px-3.5 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5">
              <Icon name="phone" className="w-3.5 h-3.5 text-teal-400" /> Call reception
            </a>
          )}
          {hosp?.location?.coordinates && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${hosp.location.coordinates[1]},${hosp.location.coordinates[0]}`}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Icon name="location" className="w-3.5 h-3.5 text-teal-400" /> Directions
            </a>
          )}
        </div>
      </DarkHero>

      <Link to="/bookings" className="block text-center text-xs font-bold text-teal-700 hover:text-teal-800">
        View all my bookings →
      </Link>
    </div>
  );
}
