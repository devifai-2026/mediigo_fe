import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useConfirm } from '../../context/ConfirmContext.jsx';
import { useApi } from '../../hooks/useApi.js';
import { api, unwrap } from '../../lib/api.js';
import { ROLES } from '../../lib/constants.js';
import { Button } from '../../components/ui/Button.jsx';
import { Avatar, DeskCard, EmptyNote, LoadError, PageHeader, Pill } from '../../components/desk/ui.jsx';
import { pad2 } from '../../components/desk/deskFormat.js';
import { asList } from '../../lib/list.js';

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
const shiftPhase = (s, isToday = true) => {
  // Another day's sittings have not begun, whatever the clock says now.
  if (!isToday) return 'upcoming';
  const now = minutesNow();
  if (now < toMin(s.startTime)) return 'upcoming';
  if (now > toMin(s.endTime)) return 'ended';
  return 'live';
};

/**
 * One headline for a doctor, in order of what matters to the desk: are they
 * here today, are they on a break, and can a patient still get a token.
 */
const doctorState = (d, isToday = true) => {
  if (!d.shifts.length) return { label: d.offReason ? `Off · ${d.offReason}` : `No sitting ${isToday ? 'today' : 'this day'}`, tone: 'slate' };
  if (isToday && d.session.isOnBreak) return { label: `On break${d.session.breakReason ? ` · ${d.session.breakReason}` : ''}`, tone: 'amber' };
  const live = d.shifts.find((s) => shiftPhase(s, isToday) === 'live');
  if (live) return { label: 'Active shift', tone: 'emerald' };
  const next = d.shifts.find((s) => shiftPhase(s, isToday) === 'upcoming');
  if (next) return { label: `Starting ${t12(next.startTime)}`, tone: 'amber' };
  return { label: 'Shifts ended', tone: 'slate' };
};

export default function RosterView() {
  const { user, role } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const isDoctor = role === ROLES.DOCTOR;
  // Which day the board shows: today by default, or any day patients can
  // already book into — so tomorrow's list can be read the evening before.
  const [day, setDay] = useState(null);
  const { data, loading, error, refetch } = useApi(`/api/queue/roster/today${day ? `?date=${day}` : ''}`);
  const days = asList(data?.dates);
  const isToday = !day || day === days[0];
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
        title: `Close online bookings for ${d.name}?`,
        message: 'Patients can no longer book from the app. Walk-ins can still be registered at the desk.',
        detail: 'Patients already in the queue keep their tokens.',
        confirmLabel: 'Close online bookings',
      });
      if (!ok) return;
    }
    setBusyId(d.doctorId);
    try {
      await api.post(`/api/queue/${d.doctorId}/booking`, { isOpen: opening });
      toast.success(opening ? `Online bookings opened for ${d.name}` : `Online bookings closed for ${d.name}`);
      refetch();
    } catch (e) {
      toast.error(e?.response?.data?.error?.message || e.message);
    } finally {
      setBusyId(null);
    }
  };

  /** Keep today's sitting open longer, or undo it. */
  const extend = async (d, s, minutes) => {
    setBusyId(`${d.doctorId}:${s.shift}`);
    try {
      const out = unwrap(await api.post(`/api/doctors/${d.doctorId}/extend`, { shift: s.shift, minutes }));
      toast.success(`${SHIFT_LABEL[s.shift] ?? 'Sitting'} now runs till ${t12(out.endTime)}`);
      refetch();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusyId(null);
    }
  };
  const undoExtend = async (d, s) => {
    setBusyId(`${d.doctorId}:${s.shift}`);
    try {
      await api.post(`/api/doctors/${d.doctorId}/extend/clear`, { shift: s.shift });
      toast.success(`${SHIFT_LABEL[s.shift] ?? 'Sitting'} is back to its usual time`);
      refetch();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const doctors = asList(data?.doctors);
  const today = data?.date
    ? new Date(`${data.date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  const dayLabel = (iso, i) => (i === 0 ? 'Today' : i === 1 ? 'Tomorrow'
    : new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }));

  return (
    <div className="space-y-5">
      <PageHeader
        icon="fa-calendar-days"
        tone="blue"
        title="Doctor Roster & OPD Slots"
        subtitle="Sittings, slot capacity and who is booked — today and the days ahead"
        badge={today && <Pill tone="slate">{isToday ? 'Today' : 'Showing'}: {today}</Pill>}
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

      {days.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar" role="group" aria-label="Day">
          {days.map((iso, i) => (
            <button
              key={iso}
              type="button"
              onClick={() => setDay(i === 0 ? null : iso)}
              aria-pressed={(data?.date ?? days[0]) === iso}
              className={clsx(
                'shrink-0 h-9 px-4 rounded-full border text-xs font-semibold transition',
                (data?.date ?? days[0]) === iso ? 'bg-mg-navy border-mg-navy text-white' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300',
              )}
            >
              {dayLabel(iso, i)}
            </button>
          ))}
        </div>
      )}

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
            const state = doctorState(d, isToday);
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
                      const phase = shiftPhase(s, isToday);
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
                          {/* Running late: keep today's sitting open for bookings
                              a little longer. Today only; the weekly timetable
                              is unchanged. */}
                          {isToday && canToggle && s.shift && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-white">
                              <span className="text-[11px] text-slate-500 mr-1">
                                {s.extended ? <>Extended to <strong className="text-slate-700">{t12(s.endTime)}</strong></> : 'Need more time?'}
                              </span>
                              {[[15, '+15 min'], [30, '+30 min'], [60, '+1 hr']].map(([m, label]) => (
                                <button
                                  key={m}
                                  type="button"
                                  disabled={busyId === `${d.doctorId}:${s.shift}`}
                                  onClick={() => extend(d, s, m)}
                                  className="h-7 px-2.5 rounded-md border border-slate-200 bg-white text-[11px] font-semibold text-mg-tealDark hover:border-mg-teal disabled:opacity-50"
                                >
                                  {label}
                                </button>
                              ))}
                              {s.extended && (
                                <button
                                  type="button"
                                  disabled={busyId === `${d.doctorId}:${s.shift}`}
                                  onClick={() => undoExtend(d, s)}
                                  className="h-7 px-2 text-[11px] font-semibold text-slate-500 hover:text-rose-600 disabled:opacity-50"
                                >
                                  Undo
                                </button>
                              )}
                            </div>
                          )}
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
                      {d.session.isBookingOpen ? 'Open for app bookings & walk-ins' : 'App bookings closed · walk-ins only'}
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
                      {d.session.isBookingOpen ? 'Close online booking' : 'Open online booking'}
                    </Button>
                  )}
                </div>
              </DeskCard>
            );
          })}
        </div>
      )}

      {doctors.length > 0 && (
        <BookedPatients
          date={data?.date}
          doctors={isDoctor ? doctors.filter((d) => d.doctorId === user?.doctorId) : doctors}
          fixedDoctor={isDoctor}
        />
      )}
    </div>
  );
}

const STATUS_TONE = {
  WAITING: 'bg-amber-50 text-amber-700 border-amber-200',
  IN_CHAMBER: 'bg-teal-50 text-mg-tealDark border-teal-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  SKIPPED: 'bg-rose-50 text-rose-700 border-rose-200',
};
const STATUS_TEXT = { WAITING: 'Booked', IN_CHAMBER: 'In chamber', COMPLETED: 'Seen', SKIPPED: 'Skipped' };
const VISIT_TEXT = { fresh: 'Fresh', followup: 'Follow-up', emergency: 'Emergency' };

/**
 * Who is booked with a doctor on the chosen day — today's live list, or
 * tomorrow's (and later) bookings read ahead of time. A doctor sees their
 * own; the front desk picks the doctor.
 */
function BookedPatients({ date, doctors, fixedDoctor }) {
  const [doctorId, setDoctorId] = useState(doctors[0]?.doctorId ?? '');
  useEffect(() => {
    if (!doctors.some((d) => d.doctorId === doctorId)) setDoctorId(doctors[0]?.doctorId ?? '');
  }, [doctors, doctorId]);
  const { data, loading } = useApi(doctorId && date ? `/api/queue/${doctorId}?date=${date}` : null, { skip: !doctorId || !date });
  const tokens = asList(data?.tokens);
  const doctor = doctors.find((d) => d.doctorId === doctorId);

  // Split by sitting, in the order the day runs.
  const order = { MORNING: 0, AFTERNOON: 1, EVENING: 2 };
  const groups = tokens.reduce((acc, t) => {
    const key = t.shift || 'NONE';
    (acc[key] ||= []).push(t);
    return acc;
  }, {});
  const keys = Object.keys(groups).sort((a, b) => (order[a] ?? 9) - (order[b] ?? 9));

  return (
    <DeskCard className="p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            <i className="fa-solid fa-list-ol text-mg-teal mr-2" aria-hidden="true" />Booked patients
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {doctor ? `${doctor.name} · ` : ''}{tokens.length} booked
          </p>
        </div>
        {!fixedDoctor && doctors.length > 1 && (
          <select
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-mg-teal"
          >
            {doctors.map((d) => <option key={d.doctorId} value={d.doctorId}>{d.name}</option>)}
          </select>
        )}
      </div>

      {loading && !data ? (
        <div className="h-24 rounded-lg bg-slate-100 animate-pulse" />
      ) : !tokens.length ? (
        <EmptyNote icon="fa-calendar-check" title="No bookings for this day yet" />
      ) : keys.map((k) => (
        <div key={k} className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {k === 'NONE' ? 'In arrival order' : `${SHIFT_LABEL[k] ?? k} sitting`}
            {groups[k][0]?.startTime ? ` · ${t12(groups[k][0].startTime)} – ${t12(groups[k][0].endTime)}` : ''}
            <span className="text-slate-400 font-medium"> · {groups[k].length}</span>
          </p>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 overflow-hidden">
            {groups[k].map((t) => (
              <li key={t.tokenId} className="flex items-center gap-3 px-3 py-2.5 bg-white">
                <span className="w-11 shrink-0 text-center text-sm font-bold text-mg-navy">#{pad2(t.tokenNumber)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-slate-900 truncate">{t.name || 'Patient'}</span>
                  <span className="block text-[11px] text-slate-500 truncate">
                    {[VISIT_TEXT[t.visitType] ?? 'Visit', t.bookedOnline ? 'Booked online' : 'At the desk', t.age != null ? `${t.age} yrs` : null, t.complaint || null].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <span className={clsx('shrink-0 px-2 py-0.5 rounded-full border text-[10px] font-semibold', STATUS_TONE[t.status] ?? 'bg-slate-50 text-slate-600 border-slate-200')}>
                  {STATUS_TEXT[t.status] ?? t.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </DeskCard>
  );
}
