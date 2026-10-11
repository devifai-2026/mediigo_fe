import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { useConsole } from '../../context/AdminConsoleContext.jsx';
import { AdminKpi, AdminPageHeader } from '../../components/superadmin/AdminKpi.jsx';
import { Avatar, DeskCard, EmptyNote, Pill, Segmented } from '../../components/desk/ui.jsx';
import { token, timeOf } from '../../lib/format.js';

const STATE = {
  CONSULTING: { label: 'Consulting', tone: 'teal', order: 0 },
  WAITING: { label: 'Patients waiting', tone: 'amber', order: 1 },
  BREAK: { label: 'On break', tone: 'amber', order: 2 },
  IDLE: { label: 'Open · no queue', tone: 'emerald', order: 3 },
  CLOSED: { label: 'Bookings closed', tone: 'slate', order: 4 },
  OFF: { label: 'Off today', tone: 'slate', order: 5 },
};

const FILTERS = [
  { value: 'ALL', label: 'All' },
  { value: 'CONSULTING', label: 'Consulting' },
  { value: 'WAITING', label: 'Waiting' },
  { value: 'BREAK', label: 'On break' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'OFF', label: 'Off today' },
];

/** "4 min" since an ISO time, ticking. */
function useSince(iso) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!iso) return undefined;
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, [iso]);
  if (!iso) return null;
  const m = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

/** A break past its end time is the thing HQ most needs to notice. */
function BreakNote({ d }) {
  const over = d.breakUntil && new Date(d.breakUntil) < new Date();
  const mins = over ? Math.round((Date.now() - new Date(d.breakUntil)) / 60000) : 0;
  return (
    <div className={clsx('rounded-lg px-3 py-2 text-xs border flex items-center justify-between gap-2',
      over ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-amber-50 border-amber-200 text-amber-800')}
    >
      <span>{d.breakReason || 'Break'}{d.breakUntil && ` · ${over ? 'was due back' : 'back'} ${timeOf(d.breakUntil)}`}</span>
      {over && <span className="font-semibold whitespace-nowrap">{mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`} over</span>}
    </div>
  );
}

function DoctorTile({ d }) {
  const s = STATE[d.state] ?? STATE.IDLE;
  const since = useSince(d.inChamber?.since);
  return (
    <DeskCard className={clsx('p-4 space-y-3', d.emergencyWaiting > 0 && 'ring-1 ring-rose-300')}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={d.name} src={d.photoUrl} className="w-10 h-10" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{d.name}</p>
            <p className="text-[11px] text-mg-teal truncate">{[d.specialty, d.chamberNumber && `Ch. ${d.chamberNumber}`].filter(Boolean).join(' • ')}</p>
          </div>
        </div>
        <Pill tone={s.tone} dot className="shrink-0">{s.label}</Pill>
      </div>

      <p className="text-[11px] text-slate-500 truncate">
        <i className="fa-solid fa-hospital mr-1 text-slate-400" aria-hidden="true" />
        {[d.clinicName, d.city].filter(Boolean).join(', ')}
      </p>

      {d.inChamber ? (
        <div className="flex items-center justify-between rounded-lg bg-teal-50 border border-teal-100 px-3 py-2">
          <span className="text-xs text-mg-tealDark">Now consulting <strong className="font-semibold">{token(d.inChamber.tokenNumber)}</strong></span>
          {since && <span className="text-[11px] text-mg-teal">{since} in chamber</span>}
        </div>
      ) : d.state === 'BREAK' ? (
        <BreakNote d={d} />
      ) : d.state === 'OFF' ? (
        <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-600">
          <i className="fa-solid fa-calendar-xmark mr-1.5" aria-hidden="true" />On leave today{d.offReason && ` · ${d.offReason}`}
        </div>
      ) : null}

      <div className="grid grid-cols-4 gap-1.5 text-center">
        {[
          ['Booked', d.booked, 'text-slate-900'],
          ['Waiting', d.waiting, d.waiting ? 'text-amber-600' : 'text-slate-400'],
          ['Seen', d.completed, 'text-emerald-600'],
          ['Skipped', d.skipped, d.skipped ? 'text-rose-600' : 'text-slate-400'],
        ].map(([label, v, tone]) => (
          <div key={label} className="rounded-md bg-mg-surface py-1.5">
            <p className={clsx('text-sm font-semibold', tone)}>{v}</p>
            <p className="text-[9px] uppercase text-slate-400">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-[11px]">
        <span className="text-slate-400">
          {d.estimatedWaitMinutes != null && d.waiting > 0 ? `About ${d.estimatedWaitMinutes} min wait for the last in line` : d.district}
        </span>
        {d.emergencyWaiting > 0 && (
          <span className="font-semibold text-rose-600">
            <i className="fa-solid fa-truck-medical mr-1" aria-hidden="true" />{d.emergencyWaiting} emergency
          </span>
        )}
      </div>
    </DeskCard>
  );
}

/**
 * Every doctor on the network, live. HQ watches it to see where queues are
 * building, who is on a long break, and where an emergency is waiting.
 */
export default function LiveMonitorView() {
  const { live, liveLoading, refetchLive } = useConsole();
  const [filter, setFilter] = useState('ALL');
  const [q, setQ] = useState('');

  const doctors = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (live?.doctors ?? [])
      .filter((d) => filter === 'ALL' || d.state === filter)
      .filter((d) => !s || [d.name, d.clinicName, d.city, d.district, d.specialty].some((v) => String(v || '').toLowerCase().includes(s)))
      // Emergencies first, then whoever has the longest queue.
      .sort((a, b) => (b.emergencyWaiting - a.emergencyWaiting)
        || (STATE[a.state].order - STATE[b.state].order)
        || (b.waiting - a.waiting));
  }, [live, filter, q]);

  const t = live?.totals;
  const counts = { ALL: t?.doctors, CONSULTING: t?.consulting, WAITING: t?.waitingDoctors, BREAK: t?.onBreak, CLOSED: t?.closed, OFF: t?.off };

  return (
    <section className="space-y-6">
      <AdminPageHeader
        icon="fa-tower-broadcast"
        title="Live OPD Monitor"
        subtitle={live ? `Every doctor on the network, right now · updated ${timeOf(live.at)}` : 'Every doctor on the network, right now'}
      >
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Auto-refresh 30s
        </span>
        <button
          type="button"
          onClick={() => refetchLive()}
          className="w-9 h-9 grid place-items-center bg-white border border-slate-200 rounded-md text-slate-500 hover:text-mg-blue"
          aria-label="Refresh now"
          title="Refresh now"
        >
          <i className={clsx('fa-solid fa-rotate text-xs', liveLoading && 'animate-spin')} aria-hidden="true" />
        </button>
      </AdminPageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <AdminKpi accent="teal" label="Consulting Now" value={t?.consulting ?? 0} icon="fa-user-doctor" footer={`of ${t?.doctors ?? 0} doctors`} />
        <AdminKpi accent="amber" label="Patients Waiting" value={t?.patientsWaiting ?? 0} icon="fa-user-clock" footer={`${t?.waitingDoctors ?? 0} chamber${t?.waitingDoctors === 1 ? '' : 's'} empty with a queue`} />
        <AdminKpi accent="rose" label="Emergencies Waiting" value={t?.emergencyWaiting ?? 0} icon="fa-truck-medical" footer="Priority tokens in queue" />
        <AdminKpi accent="amberSlate" label="On Break" value={t?.onBreak ?? 0} icon="fa-mug-hot" footer={`${t?.closed ?? 0} closed · ${t?.off ?? 0} on leave`} />
        <AdminKpi accent="emerald" label="Seen Today" value={t?.patientsSeen ?? 0} icon="fa-circle-check" footer="Completed consultations" className="col-span-2 lg:col-span-1" />
      </div>

      <DeskCard className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Segmented value={filter} onChange={setFilter} options={FILTERS.map((f) => ({ ...f, count: counts[f.value] ?? 0 }))} />
        <div className="relative">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" aria-hidden="true" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search doctor, clinic, city…"
            aria-label="Search doctors"
            className="pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-md text-xs w-full sm:w-64 focus:outline-none focus:border-mg-teal focus:ring-1 focus:ring-mg-teal"
          />
        </div>
      </DeskCard>

      {!live ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => <div key={i} className="h-52 rounded-xl bg-white border border-slate-200 animate-pulse" />)}
        </div>
      ) : !doctors.length ? (
        <DeskCard><EmptyNote icon="fa-user-doctor" title="No doctors match" hint={q ? 'Try a different search.' : 'Nobody is in this state right now.'} /></DeskCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {doctors.map((d) => <DoctorTile key={d.doctorId} d={d} />)}
        </div>
      )}
    </section>
  );
}
