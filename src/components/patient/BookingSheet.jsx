import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { api, unwrap } from '../../lib/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Icon } from '../ui/Icon.jsx';
import { QrCode } from '../ui/QrCode.jsx';
import { ConditionsField } from './ConditionsField.jsx';
import { FamilyMemberForm } from './FamilyMemberForm.jsx';
import { inr, token, time12, ageOf, initials } from '../../lib/format.js';
import { VISIT_LABEL } from '../../lib/constants.js';

const DAY_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SHIFT_LABEL = { MORNING: 'Morning', AFTERNOON: 'Afternoon', EVENING: 'Evening' };
const VISIT_HINT = { fresh: 'First visit for this problem', followup: 'Coming back after a visit', emergency: 'Needs urgent attention' };
const RELATION_LABEL = { SELF: 'You', SPOUSE: 'Spouse', CHILD: 'Child', PARENT: 'Parent', SIBLING: 'Sibling', OTHER: 'Family' };

// "2026-10-19" → "Mon, 19 Oct"
const longDate = (iso) => (iso
  ? new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`))
  : '');

function Step({ n, title, aside, children }) {
  return (
    <section>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h4 className="flex items-center gap-2.5 text-[15px] font-semibold text-slate-900">
          <span className="w-6 h-6 rounded-full bg-mg-navy text-white grid place-items-center text-xs font-bold shrink-0">{n}</span>
          {title}
        </h4>
        {aside}
      </div>
      {children}
    </section>
  );
}

/**
 * Booking bottom-sheet: who, when, which token, what kind of visit, and why —
 * all on one sheet, so nothing sends the patient off to another page and back.
 *
 * Every booking made here is an online booking: the patient books it
 * themselves and is seen in the clinic. Tokens are offered as numbered slots
 * with the time each is expected, worked out from the doctor's own average
 * consultation length.
 *
 * Selection state is reset per open rather than held across bookings — the
 * prototype leaked the previously chosen patient and date into the next one.
 */
export function BookingSheet({ doctor, initialSlot = null, onClose }) {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const members = useMemo(() => {
    const list = user?.familyMembers ?? [];
    return [...list].sort((a, b) => (a.relation === 'SELF' ? -1 : b.relation === 'SELF' ? 1 : 0));
  }, [user]);

  const [memberId, setMemberId] = useState('');
  const [adding, setAdding] = useState(false);
  const [visitType, setVisitType] = useState('fresh');
  const [busy, setBusy] = useState(false);
  const [ticket, setTicket] = useState(null);
  const [days, setDays] = useState([]);
  const [daysLoaded, setDaysLoaded] = useState(false);
  const [slot, setSlot] = useState(null); // { date, shift }
  const [grid, setGrid] = useState(null);
  const [gridLoading, setGridLoading] = useState(false);
  const [gridVersion, setGridVersion] = useState(0);
  const [tokenNumber, setTokenNumber] = useState(null);
  const [complaint, setComplaint] = useState('');
  const [conditions, setConditions] = useState([]);
  const stripRef = useRef(null);

  // Reset every time the sheet opens for a different doctor.
  useEffect(() => {
    if (doctor) {
      setMemberId(members[0]?._id ?? '');
      setAdding(false);
      setVisitType('fresh');
      setComplaint('');
      setSlot(null);
      setGrid(null);
      setTokenNumber(null);
      setTicket(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctor]);

  // Pre-fill the chosen person's own history, so a returning patient does not
  // retype it — and a child's history is never their parent's.
  const member = members.find((m) => m._id === memberId) ?? null;
  useEffect(() => { setConditions(member?.conditions ?? []); }, [member?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  // The doctor's real sittings for the next 7 days. Without a schedule the
  // response is simply empty, and booking falls back to same-day, in order.
  useEffect(() => {
    if (!doctor?.doctorId) return undefined;
    let alive = true;
    setDaysLoaded(false);
    (async () => {
      try {
        const d = unwrap(await api.get(`/api/doctors/${doctor.doctorId}/availability`));
        if (!alive) return;
        const week = d.days ?? [];
        setDays(week);
        // Keep a sitting already chosen on the doctor's profile page, if it is
        // still bookable; otherwise preselect the first one a patient could take.
        const kept = initialSlot && week.some((x) => x.date === initialSlot.date
          && x.shifts.some((sh) => sh.shift === initialSlot.shift && sh.isBookable));
        if (kept) { setSlot(initialSlot); return; }
        const firstOpen = week.find((x) => x.shifts.some((sh) => sh.isBookable));
        const firstShift = firstOpen?.shifts.find((sh) => sh.isBookable);
        if (firstOpen && firstShift) setSlot({ date: firstOpen.date, shift: firstShift.shift });
      } catch {
        if (alive) setDays([]);
      } finally {
        if (alive) setDaysLoaded(true);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctor]);

  // The first open date can be days out; bring it into view rather than
  // leaving a row of "Off" days as the first thing the patient sees.
  useEffect(() => {
    const el = stripRef.current?.querySelector('[aria-pressed="true"]');
    if (el) stripRef.current.scrollTo({ left: el.offsetLeft - 20, behavior: 'smooth' });
  }, [slot?.date, daysLoaded]);

  // The token grid for the chosen sitting. Keeps the patient's pick if it is
  // still free, otherwise moves them to the first free number.
  useEffect(() => {
    if (!doctor?.doctorId || !slot?.date || !slot?.shift) { setGrid(null); return undefined; }
    let alive = true;
    setGridLoading(true);
    api.get(`/api/doctors/${doctor.doctorId}/slots?date=${slot.date}&shift=${slot.shift}`)
      .then((res) => {
        if (!alive) return;
        const g = unwrap(res);
        setGrid(g);
        setTokenNumber((cur) => (g.slots.some((x) => x.number === cur && x.status === 'free') ? cur : g.suggested));
      })
      .catch(() => { if (alive) { setGrid(null); setTokenNumber(null); } })
      .finally(() => { if (alive) setGridLoading(false); });
    return () => { alive = false; };
  }, [doctor?.doctorId, slot?.date, slot?.shift, gridVersion]);

  if (!doctor && !ticket) return null;

  const fee = doctor?.fees?.[visitType] ?? ticket?.fee ?? 0;
  const scheduled = days.length > 0;
  const chosen = grid?.slots.find((x) => x.number === tokenNumber) ?? null;
  const selectedDay = days.find((d) => d.date === slot?.date);
  const ready = Boolean(memberId || !members.length) && (!scheduled || (slot?.shift && tokenNumber));

  const confirm = async () => {
    setBusy(true);
    try {
      const created = unwrap(await api.post('/api/queue/book', {
        doctorId: doctor.doctorId,
        familyMemberId: memberId || null,
        visitType,
        // Omitted when the doctor keeps no schedule: the server then books today.
        ...(slot ? { date: slot.date, shift: slot.shift } : {}),
        ...(scheduled && tokenNumber ? { tokenNumber } : {}),
        ...(complaint.trim() ? { complaint: complaint.trim() } : {}),
        ...(conditions.length ? { conditions } : {}),
      }));
      setTicket({ ...created, doctor, fee, expectedAt: chosen?.time ?? null });
      toast.success(`Token ${token(created.tokenNumber)} confirmed`);
    } catch (e) {
      toast.error(e.message);
      // Most likely someone took the number first: show the grid as it is now.
      setGridVersion((v) => v + 1);
    } finally {
      setBusy(false);
    }
  };

  if (ticket) {
    const close = () => { setTicket(null); onClose(); };
    return (
      <Modal open onClose={close} variant="sheet" size="sm">
        <div className="text-center -m-5">
          <div className="mg-hero rounded-none rounded-t-xl p-6 pt-8">
            <div className="w-12 h-12 rounded-full bg-white grid place-items-center mx-auto mb-2">
              <Icon name="check" className="w-6 h-6 text-mg-teal" strokeWidth={2.5} />
            </div>
            <p className="text-sm font-medium">Booking confirmed</p>
            <h3 className="text-5xl font-bold mt-1 tracking-tight">{token(ticket.tokenNumber)}</h3>
            <p className="text-sm text-white/90 mt-1">{ticket.patientSnapshot?.name}</p>
            <span className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 text-[11px] font-semibold">
              <Icon name="check" className="w-3 h-3" /> Online booking · visit the clinic
            </span>
          </div>

          <div className="p-5 space-y-3 text-left">
            <dl className="grid grid-cols-2 gap-px rounded-xl overflow-hidden bg-slate-200 border border-slate-200">
              <div className="bg-white p-3">
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Date</dt>
                <dd className="mt-0.5 text-sm font-semibold text-slate-900">{longDate(ticket.date)}</dd>
              </div>
              <div className="bg-white p-3">
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Expected around</dt>
                <dd className="mt-0.5 text-sm font-semibold text-slate-900">
                  {ticket.expectedAt ? time12(ticket.expectedAt) : 'In arrival order'}
                </dd>
              </div>
            </dl>

            <div className="mg-panel p-3 text-xs space-y-0.5">
              <p className="font-semibold text-slate-900">{ticket.doctor.name}</p>
              <p className="text-mg-teal">{ticket.doctor.specialty} · Chamber {ticket.doctor.chamberNumber || '—'}</p>
              <p className="text-slate-500">{ticket.doctor.hospital.name}</p>
              <p className="text-[11px] text-slate-400">{ticket.doctor.hospital.address?.line1}</p>
            </div>

            <div className="text-center">
              <div className="bg-slate-100 p-3 rounded-md inline-block border border-slate-200">
                <QrCode value={`MEDIIGO:${ticket._id}`} size={128} />
              </div>
              <p className="text-[10px] font-mono font-bold text-slate-500">{ticket._id}</p>
            </div>

            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
              Reach 10 minutes early and pay {inr(ticket.fee)} at the front desk. The live tracker tells you when your turn is close.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={close}>Close</Button>
              <Button onClick={() => navigate('/p/tracker')}>Track live queue</Button>
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={Boolean(doctor)}
      onClose={onClose}
      variant="sheet"
      title={doctor.name}
      subtitle={`${doctor.specialty} · ${doctor.hospital.name}`}
    >
      <div className="space-y-7">
        <p className="flex items-start gap-2 rounded-xl bg-mg-surface px-3 py-2.5 text-xs text-slate-600">
          <Icon name="info" className="w-4 h-4 text-mg-teal shrink-0" />
          <span><span className="font-semibold text-slate-800">Online booking.</span> The consultation is at the clinic — pay at the front desk when you arrive.</span>
        </p>

        {/* ── 1. Who ─────────────────────────────────────────────────── */}
        <Step
          n={1}
          title="Who is visiting?"
          aside={!adding && (
            <button type="button" onClick={() => setAdding(true)} className="text-xs font-semibold text-mg-teal hover:underline">
              + Add member
            </button>
          )}
        >
          {adding ? (
            <div className="rounded-xl border border-mg-teal/40 bg-teal-50/40 p-4">
              <p className="text-sm font-semibold text-slate-900 mb-3">Add a family member</p>
              <FamilyMemberForm
                submitLabel="Save & book for them"
                onCancel={() => setAdding(false)}
                onSaved={(m) => { setAdding(false); if (m?._id) setMemberId(m._id); }}
              />
            </div>
          ) : (
            <div className="-mx-5 px-5 flex gap-2 overflow-x-auto no-scrollbar pb-1" role="radiogroup" aria-label="Patient">
              {members.map((m) => {
                const active = memberId === m._id;
                const age = ageOf(m.dob);
                return (
                  <button
                    key={m._id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setMemberId(m._id)}
                    className={clsx(
                      'shrink-0 w-36 p-3 rounded-xl border-2 text-left transition',
                      active ? 'border-mg-teal bg-teal-50/60' : 'border-slate-200 bg-white hover:border-slate-300',
                    )}
                  >
                    <span className="flex items-center justify-between">
                      <span className={clsx('w-9 h-9 rounded-full grid place-items-center text-xs font-bold', active ? 'bg-mg-teal text-white' : 'bg-slate-100 text-slate-600')}>
                        {initials(m.name)}
                      </span>
                      {active && <Icon name="check" className="w-4 h-4 text-mg-teal" strokeWidth={3} />}
                    </span>
                    <span className="mt-2 block text-sm font-semibold text-slate-900 truncate">{m.name}</span>
                    <span className="block text-[11px] text-slate-500">
                      {RELATION_LABEL[m.relation] ?? 'Family'}{age != null ? ` · ${age}y` : ''}{m.gender ? ` · ${m.gender}` : ''}
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="shrink-0 w-36 p-3 rounded-xl border-2 border-dashed border-slate-300 text-left text-slate-500 hover:border-mg-teal hover:text-mg-teal transition"
              >
                <span className="w-9 h-9 rounded-full bg-slate-50 grid place-items-center">
                  <Icon name="plus" className="w-4 h-4" />
                </span>
                <span className="mt-2 block text-sm font-semibold">Add member</span>
                <span className="block text-[11px] text-slate-400">Parent, child, spouse</span>
              </button>
            </div>
          )}
        </Step>

        {/* ── 2. When ────────────────────────────────────────────────── */}
        <Step n={2} title="Choose date & sitting">
          {!daysLoaded ? (
            <div className="h-20 rounded-xl bg-slate-100 animate-pulse" />
          ) : scheduled ? (
            <>
              <div ref={stripRef} className="relative -mx-5 px-5 flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {days.map((d) => {
                  const open = d.shifts.some((sh) => sh.isBookable);
                  const active = slot?.date === d.date;
                  return (
                    <button
                      key={d.date}
                      type="button"
                      disabled={!open}
                      aria-pressed={active}
                      onClick={() => setSlot({ date: d.date, shift: d.shifts.find((sh) => sh.isBookable)?.shift })}
                      className={clsx(
                        'shrink-0 w-[60px] py-2.5 rounded-lg border-2 text-center transition',
                        active ? 'border-mg-teal bg-mg-teal text-white'
                          : open ? 'border-slate-200 bg-white hover:border-mg-teal/60'
                            : 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed',
                      )}
                    >
                      <span className={clsx('block text-[11px] font-medium', active ? 'text-white/85' : open ? 'text-slate-500' : '')}>
                        {d.isToday ? 'Today' : DAY_LABEL[d.dayOfWeek]}
                      </span>
                      <span className={clsx('block text-lg font-bold leading-tight', !active && open && 'text-slate-900')}>
                        {Number(d.date.slice(8, 10))}
                      </span>
                      <span className={clsx('block text-[10px] font-semibold uppercase', active ? 'text-white/80' : open ? 'text-emerald-600' : 'text-slate-300')}>
                        {open ? 'Open' : 'Off'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {selectedDay && (
                selectedDay.shifts.length ? (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {selectedDay.shifts.map((sh) => {
                      const active = slot?.shift === sh.shift && sh.isBookable;
                      return (
                        <button
                          key={sh.shift}
                          type="button"
                          disabled={!sh.isBookable}
                          onClick={() => setSlot({ date: selectedDay.date, shift: sh.shift })}
                          className={clsx(
                            'p-3 rounded-lg border-2 text-left transition',
                            active ? 'border-mg-teal bg-teal-50/60'
                              : sh.isBookable ? 'border-slate-200 bg-white hover:border-mg-teal/60'
                                : 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed',
                          )}
                        >
                          <span className={clsx('block text-sm font-semibold', active ? 'text-mg-tealDark' : 'text-slate-800')}>
                            {SHIFT_LABEL[sh.shift] || sh.shift}
                          </span>
                          <span className="block text-xs text-slate-500">{time12(sh.startTime)} – {time12(sh.endTime)}</span>
                          <span className="block text-[11px] mt-1 font-medium">
                            {sh.endedToday ? <span className="text-slate-400">Ended for today</span>
                              : sh.isFull ? <span className="text-amber-600">Fully booked</span>
                                : sh.remaining != null ? <span className="text-mg-teal">{sh.remaining} tokens left</span>
                                  : <span className="text-emerald-600">Tokens available</span>}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-slate-500 italic">{selectedDay.closureReason}</p>
                )
              )}
              {!slot && <p className="mt-3 text-xs text-amber-700">No open sittings in the next 7 days.</p>}
            </>
          ) : (
            <p className="rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
              <span className="font-semibold">Today</span> · this doctor sees patients in arrival order.
            </p>
          )}
        </Step>

        {/* ── 3. Token ───────────────────────────────────────────────── */}
        <Step
          n={3}
          title="Pick your token"
          aside={grid && (
            <span className="text-[11px] text-slate-500">~{grid.avgConsultMinutes} min each</span>
          )}
        >
          {!scheduled ? (
            <div className="flex items-center justify-between rounded-xl bg-mg-surface p-3">
              <span className="text-sm text-slate-700">Your token will be</span>
              <span className="text-xl font-bold text-mg-teal">
                {doctor.queue?.nextToken != null ? token(doctor.queue.nextToken) : 'Next in line'}
              </span>
            </div>
          ) : gridLoading && !grid ? (
            <div className="h-32 rounded-xl bg-slate-100 animate-pulse" />
          ) : !grid ? (
            <p className="text-xs text-slate-500">Choose a sitting to see its tokens.</p>
          ) : (
            <>
              <div className={clsx('grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-64 overflow-y-auto custom-scrollbar p-0.5', gridLoading && 'opacity-60')}>
                {grid.slots.map((x) => {
                  const active = x.number === tokenNumber;
                  const free = x.status === 'free';
                  return (
                    <button
                      key={x.number}
                      type="button"
                      disabled={!free}
                      onClick={() => setTokenNumber(x.number)}
                      aria-pressed={active}
                      aria-label={`Token ${x.number} at ${time12(x.time)}${free ? '' : `, ${x.status}`}`}
                      className={clsx(
                        'py-2 rounded-lg border-2 text-center transition',
                        active ? 'border-mg-teal bg-mg-teal text-white shadow-sm shadow-mg-teal/30'
                          : free ? 'border-slate-200 bg-white hover:border-mg-teal/60'
                            : 'border-transparent bg-slate-100 text-slate-300 cursor-not-allowed',
                      )}
                    >
                      <span className={clsx('block text-sm font-bold', !active && free && 'text-slate-900', !free && 'line-through')}>
                        {token(x.number)}
                      </span>
                      <span className={clsx('block text-[10px]', active ? 'text-white/85' : free ? 'text-slate-500' : '')}>
                        {time12(x.time).replace(':00 ', ' ')}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 flex items-center gap-4 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-md border-2 border-slate-200 bg-white" />Free</span>
                <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-slate-100" />Booked</span>
                <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-mg-teal" />Yours</span>
              </div>
              {grid.suggested == null && (
                <p className="mt-2 text-xs text-amber-700">Every token in this sitting is taken — try another sitting.</p>
              )}
              <p className="mt-2 text-[11px] text-slate-400">
                Times are estimates from the doctor’s average consultation time; the live tracker keeps you updated.
              </p>
            </>
          )}
        </Step>

        {/* ── 4. Visit type ──────────────────────────────────────────── */}
        <Step n={4} title="Visit type">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" role="radiogroup" aria-label="Visit type">
            {['fresh', 'followup', 'emergency'].map((v) => {
              const active = visitType === v;
              return (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setVisitType(v)}
                  className={clsx(
                    'flex sm:flex-col items-center sm:items-start justify-between gap-2 p-3 rounded-lg border-2 text-left transition',
                    active ? 'border-mg-teal bg-teal-50/60' : 'border-slate-200 bg-white hover:border-slate-300',
                  )}
                >
                  <span className="min-w-0">
                    <span className={clsx('block text-sm font-semibold', active ? 'text-mg-tealDark' : 'text-slate-800')}>{VISIT_LABEL[v]}</span>
                    <span className="block text-[11px] text-slate-500">{VISIT_HINT[v]}</span>
                  </span>
                  <span className="text-base font-bold text-mg-navy shrink-0">{inr(doctor.fees?.[v])}</span>
                </button>
              );
            })}
          </div>
        </Step>

        {/* ── 5. About the visit ─────────────────────────────────────── */}
        <Step n={5} title="About the visit">
          <label className="block">
            <span className="block text-xs font-semibold text-slate-700 mb-1.5">
              Reason for visit <span className="font-normal text-slate-400">(optional)</span>
            </span>
            <textarea
              value={complaint}
              onChange={(e) => setComplaint(e.target.value.slice(0, 300))}
              rows={2}
              placeholder="e.g. Fever and sore throat for 3 days"
              className="w-full rounded-lg border border-slate-200 bg-white p-3 text-base sm:text-sm resize-none focus:outline-none focus:border-mg-teal focus:ring-1 focus:ring-mg-teal"
            />
            <span className="flex justify-between text-[11px] text-slate-400 mt-1">
              <span>Only the clinic and your doctor can see this.</span>
              <span>{complaint.length}/300</span>
            </span>
          </label>

          {/* Declared per booking, not pulled silently from the profile: these
              travel to the doctor with THIS visit, and the patient should see
              what they are sending. */}
          <div className="mt-4">
            <ConditionsField
              value={conditions}
              onChange={setConditions}
              hint={member && member.relation !== 'SELF'
                ? `${member.name}’s conditions — shown to the doctor before the consultation.`
                : 'Shown to the doctor before your consultation.'}
            />
          </div>
        </Step>

        {/* ── Summary + confirm, always in reach ─────────────────────── */}
        <div className="sticky -bottom-5 -mx-5 -mb-5 px-5 pt-3 pb-4 bg-white/95 backdrop-blur border-t border-slate-200">
          <div className="flex items-end justify-between gap-3 mb-3">
            <div className="min-w-0 text-xs text-slate-600">
              <p className="font-semibold text-slate-900 truncate">
                {member?.name ?? user?.name}
                {scheduled && tokenNumber ? <> · Token {token(tokenNumber)}</> : null}
              </p>
              <p className="truncate">
                {slot ? `${longDate(slot.date)}${chosen ? ` · ~${time12(chosen.time)}` : ''}` : 'Today'} · {VISIT_LABEL[visitType]}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Pay at clinic</p>
              <p className="text-lg font-bold text-mg-navy leading-tight">{inr(fee)}</p>
            </div>
          </div>
          <Button onClick={confirm} loading={busy} disabled={!ready || adding} className="w-full h-12 !text-base !rounded-xl" size="lg">
            {adding ? 'Save the new member first' : 'Confirm booking'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
