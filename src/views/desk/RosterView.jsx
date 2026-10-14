import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useConfirm } from '../../context/ConfirmContext.jsx';
import { useApi } from '../../hooks/useApi.js';
import { api } from '../../lib/api.js';
import { ROLES } from '../../lib/constants.js';
import { Button } from '../../components/ui/Button.jsx';
import { Avatar, DeskCard, EmptyNote, LoadError, PageHeader, Pill } from '../../components/desk/ui.jsx';
import { pad2 } from '../../components/desk/deskFormat.js';

const SHIFT_LABEL = { MORNING: 'Morning', AFTERNOON: 'Afternoon', EVENING: 'Evening' };

// "14:00" → "2:00 PM"
const t12 = (hhmm) => {
  const [h, m] = String(hhmm || '').split(':').map(Number);
  if (Number.isNaN(h)) return hhmm || '';
  return `${((h + 11) % 12) + 1}:${String(m || 0).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

const minutesNow = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};
const toMin = (hhmm) => {
  const [h, m] = String(hhmm || '0:0').split(':').map(Number);
  return h * 60 + (m || 0);
};

/** Where a sitting is in the day, for its badge. */
const shiftPhase = (s) => {
  const now = minutesNow();
  if (now < toMin(s.startTime)) return 'upcoming';
  if (now > toMin(s.endTime)) return 'ended';
  return 'live';
};

/**
 * One headline for a doctor, in order of what matters to the desk: are they
 * here today, are they on a break, and can a patient still get a token.
 */
const doctorState = (d) => {
  if (!d.shifts.length) return { label: d.offReason ? `Off · ${d.offReason}` : 'No sitting today', tone: 'slate' };
  if (d.session.isOnBreak) return { label: `On break${d.session.breakReason ? ` · ${d.session.breakReason}` : ''}`, tone: 'amber' };
  const live = d.shifts.find((s) => shiftPhase(s) === 'live');
  if (live) return { label: 'Active shift', tone: 'emerald' };
  const next = d.shifts.find((s) => shiftPhase(s) === 'upcoming');
  if (next) return { label: `Starting ${t12(next.startTime)}`, tone: 'amber' };
  return { label: 'Shifts ended', tone: 'slate' };
};

export default function RosterView() {
  const { user, role } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const isDoctor = role === ROLES.DOCTOR;
  const { data, loading, error, refetch } = useApi('/api/queue/roster/today');
  const [busyId, setBusyId] = useState(null);

  // Occupancy moves all day; a quiet refresh keeps the board honest without
  // anyone having to remember to reload it.
  useEffect(() => {
    const id = setInterval(() => refetch(), 30000);
    return () => clearInterval(id);
  }, [refetch]);

  const toggle = async (d) => {
    const opening = !d.session.isBookingOpen;
    if (!opening) {
      const ok = await confirm({
        title: `Close bookings for ${d.name}?`,
        message: 'No new tokens can be issued, in the app or at the desk.',
        detail: 'Patients already in the queue keep their tokens.',
        confirmLabel: 'Close bookings',
      });
      if (!ok) return;
    }
    setBusyId(d.doctorId);
    try {
      await api.post(`/api/queue/${d.doctorId}/booking`, { isOpen: opening });
      toast.success(opening ? `Bookings opened for ${d.name}` : `Bookings closed for ${d.name}`);
      refetch();
    } catch (e) {
      toast.error(e?.response?.data?.error?.message || e.message);
    } finally {
      setBusyId(null);
    }
  };

  const doctors = data?.doctors ?? [];
  const today = data?.date
    ? new Date(`${data.date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  return (
    <div className="space-y-5">
      <PageHeader
        icon="fa-calendar-days"
        tone="blue"
        title="Doctor Roster & OPD Slots"
        subtitle="Today’s sittings, slot capacity and who is taking bookings"
        badge={today && <Pill tone="slate">Today: {today}</Pill>}
      >
        {isDoctor && (
          <Link to="/d/followups" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-mg-teal text-mg-teal hover:bg-teal-50 text-xs font-medium transition">
            <i className="fa-solid fa-rotate" aria-hidden="true" /> My follow-ups
          </Link>
        )}
        <Button variant="secondary" size="sm" onClick={() => refetch()} disabled={loading}>
          <i className={clsx('fa-solid fa-rotate-right', loading && 'animate-spin')} aria-hidden="true" /> Refresh
        </Button>
      </PageHeader>

      {error && !data ? (
        <LoadError error={error} onRetry={refetch} what="today’s roster" />
      ) : loading && !data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0, 1].map((i) => <div key={i} className="h-56 rounded-xl bg-white border border-slate-200 animate-pulse" />)}
        </div>
      ) : !doctors.length ? (
        <DeskCard><EmptyNote icon="fa-user-doctor" title="No doctors at this clinic yet" /></DeskCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {doctors.map((d) => {
            const state = doctorState(d);
            const canToggle = !isDoctor || d.doctorId === user?.doctorId;
            const booked = d.shifts.reduce((a, s) => a + s.booked, 0);
            return (
              <DeskCard key={d.doctorId} className={clsx('p-4 sm:p-5 space-y-4', isDoctor && d.doctorId === user?.doctorId && 'ring-1 ring-mg-teal/40')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={d.name} src={d.photoUrl} className="w-11 h-11" />
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900 truncate">{d.name}</h3>
                      <p className="text-xs text-mg-teal truncate">
                        {[d.specialty, d.chamberNumber && `Chamber ${d.chamberNumber}`].filter(Boolean).join(' • ')}
                      </p>
                    </div>
                  </div>
                  <Pill tone={state.tone} className="uppercase !text-[10px] !font-semibold">{state.label}</Pill>
                </div>

                {d.shifts.length ? (
                  <div className="space-y-2.5">
                    {d.shifts.map((s) => {
                      const phase = shiftPhase(s);
                      const pct = s.maxTokens ? Math.min(100, Math.round((s.booked / s.maxTokens) * 100)) : null;
                      const full = s.maxTokens != null && s.booked >= s.maxTokens;
                      return (
                        <div key={`${s.shift}-${s.startTime}`} className="rounded-lg bg-mg-surface p-3 space-y-2">
                          <div className="grid grid-cols-3 gap-2 text-center text-xs">
                            <div className="bg-white rounded-md p-2 border border-slate-200">
                              <span className="block text-[10px] text-slate-400">{SHIFT_LABEL[s.shift] || 'Shift'} slot</span>
                              <span className="font-medium text-slate-800">{t12(s.startTime)} – {t12(s.endTime)}</span>
                            </div>
                            <div className="bg-white rounded-md p-2 border border-slate-200">
                              <span className="block text-[10px] text-slate-400">Slot capacity</span>
                              <span className="font-medium text-slate-800">{s.maxTokens ? `${s.maxTokens} patients` : 'No limit'}</span>
                            </div>
                            <div className="bg-white rounded-md p-2 border border-slate-200">
                              <span className="block text-[10px] text-slate-400">Occupied</span>
                              <span className={clsx('font-semibold', full ? 'text-rose-600' : 'text-mg-blue')}>
                                {pad2(s.booked)}{s.maxTokens ? ` / ${s.maxTokens}` : ''}
                              </span>
                            </div>
                          </div>
                          {pct != null && (
                            <div className="h-1.5 rounded-full bg-white overflow-hidden" aria-hidden="true">
                              <div className={clsx('h-full rounded-full', full ? 'bg-rose-500' : pct > 75 ? 'bg-amber-500' : 'bg-mg-teal')} style={{ width: `${pct}%` }} />
                            </div>
                          )}
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span>{s.waiting} waiting · {s.completed} seen{s.inChamber ? ' · 1 in chamber' : ''}</span>
                            <span className={clsx('font-medium', phase === 'live' ? 'text-emerald-600' : 'text-slate-400')}>
                              {phase === 'live' ? 'In progress' : phase === 'upcoming' ? 'Upcoming' : 'Ended'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 bg-mg-surface rounded-lg p-3">
                    {d.offReason ? `Not sitting today — ${d.offReason}.` : 'No sitting scheduled for today.'}
                  </p>
                )}

                <div className="flex items-center justify-between gap-3 pt-1 text-xs">
                  <span className="text-slate-500">
                    Slot state:{' '}
                    <strong className={clsx('font-medium', d.session.isBookingOpen ? 'text-emerald-700' : 'text-rose-600')}>
                      {d.session.isBookingOpen ? 'Open for walk-ins & app' : 'Bookings on hold'}
                    </strong>
                    {booked > 0 && <span className="text-slate-400"> · {booked} booked today</span>}
                  </span>
                  {canToggle && (
                    <Button
                      size="sm"
                      variant={d.session.isBookingOpen ? 'secondary' : 'primary'}
                      onClick={() => toggle(d)}
                      loading={busyId === d.doctorId}
                      disabled={d.session.isOnBreak}
                      title={d.session.isOnBreak ? 'End the break first — a break already pauses the queue' : undefined}
                    >
                      {d.session.isBookingOpen ? 'Hold slot' : 'Open slot'}
                    </Button>
                  )}
                </div>
              </DeskCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
