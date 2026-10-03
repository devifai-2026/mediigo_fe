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
        onAction={() => { window.location.href = '/p/explore'; }}
      />
    );
  }

  const doc = active.doctorId;
  const hosp = active.hospitalId;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mg-title">Live Tracker</h2>
        <p className="text-xs text-slate-500 mt-1">Your place in the queue, updated as the doctor calls each token</p>
      </div>

      <DarkHero>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <LivePill>Live queue telemetry</LivePill>
            <h3 className="text-2xl sm:text-3xl font-semibold mt-4">{active.patientSnapshot?.name}</h3>
            <p className="text-xs sm:text-sm text-white/85 mt-1">{doc?.name} · {hosp?.name}</p>
          </div>
          <div className="bg-white/15 px-4 py-2 rounded-md text-right">
            <span className="text-[10px] text-white/80 block">Chamber</span>
            <span className="text-sm font-semibold">{doc?.chamberNumber || '—'}</span>
          </div>
        </div>

        {view.onBreak && (
          <div className="mt-5 p-3 rounded-md bg-amber-400/20 text-white text-xs font-medium flex items-center gap-2">
            <Icon name="pause" className="w-4 h-4 shrink-0" />
            Doctor is on a break{view.breakReason ? ` (${view.breakReason})` : ''} — the queue is paused.
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6 text-center text-slate-900">
          <div className="bg-white rounded-md py-4">
            <span className="text-[11px] font-medium text-slate-700 block">Current OPD Token</span>
            <span className="block text-3xl font-bold text-mg-navy mt-1.5">{token(view.current)}</span>
          </div>
          <div className="bg-white rounded-md py-4">
            <span className="text-[11px] font-medium text-slate-700 block">Your Token</span>
            <span className="block text-3xl font-bold text-mg-teal mt-1.5">{token(view.mine)}</span>
          </div>
          <div className="col-span-2 sm:col-span-1 bg-white rounded-md py-4">
            <span className="text-[11px] font-medium text-slate-700 block">Approx. Wait</span>
            <span className="block text-2xl font-bold text-mg-navy mt-2">
              {view.wait == null ? 'Paused' : `~ ${duration(view.wait)}`}
            </span>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <div className="flex justify-between text-xs text-white/85">
            <span>Queue progress</span>
            <span>{view.ahead} {view.ahead === 1 ? 'patient' : 'patients'} ahead</span>
          </div>
          <div className="w-full h-2.5 bg-white/25 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${view.pct}%` }}
            />
          </div>
        </div>

        {(hosp?.contactPhone || hosp?.location?.coordinates) && (
          <div className="mt-6 flex flex-wrap gap-2 justify-end">
            {hosp?.contactPhone && (
              <a href={`tel:${hosp.contactPhone}`} className="px-4 py-2 bg-white hover:bg-white/90 text-mg-teal rounded-md text-xs font-medium inline-flex items-center gap-1.5">
                <Icon name="phone" className="w-3.5 h-3.5" /> Call reception
              </a>
            )}
            {hosp?.location?.coordinates && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${hosp.location.coordinates[1]},${hosp.location.coordinates[0]}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-white hover:bg-white/90 text-mg-teal rounded-md text-xs font-medium inline-flex items-center gap-1.5"
              >
                <Icon name="location" className="w-3.5 h-3.5" /> Get Direction
              </a>
            )}
          </div>
        )}
      </DarkHero>

      <Link to="/bookings" className="block text-center text-xs font-medium text-mg-teal hover:text-mg-tealDark">
        View all my bookings →
      </Link>
    </div>
  );
}
