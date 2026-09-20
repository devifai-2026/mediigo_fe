import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { api, unwrap } from '../../lib/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { QrCode } from '../ui/QrCode.jsx';
import { inr, token } from '../../lib/format.js';
import { VISIT_LABEL } from '../../lib/constants.js';

const DAY_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SHIFT_LABEL = { MORNING: 'Morning', AFTERNOON: 'Afternoon', EVENING: 'Evening' };

/**
 * Booking bottom-sheet. Selection state is derived per-open rather than held
 * across bookings — the prototype leaked the previously chosen patient and date
 * into the next booking because those lived in module scope.
 */
export function BookingSheet({ doctor, onClose }) {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [memberId, setMemberId] = useState('');
  const [visitType, setVisitType] = useState('fresh');
  const [busy, setBusy] = useState(false);
  const [ticket, setTicket] = useState(null);
  const [days, setDays] = useState([]);
  const [slot, setSlot] = useState(null); // { date, shift }
  const [complaint, setComplaint] = useState('');

  // Reset every time the sheet opens for a different doctor.
  useEffect(() => {
    if (doctor) {
      setMemberId(user?.familyMembers?.[0]?._id ?? '');
      setVisitType('fresh');
      setComplaint('');
      setSlot(null);
      setTicket(null);
    }
  }, [doctor, user]);

  // The doctor's real sittings for the next 7 days. Without a schedule the
  // response is simply empty, and the sheet falls back to same-day booking.
  useEffect(() => {
    if (!doctor?.doctorId) return undefined;
    let alive = true;
    (async () => {
      try {
        const d = unwrap(await api.get(`/api/doctors/${doctor.doctorId}/availability`));
        if (!alive) return;
        setDays(d.days ?? []);
        // Preselect the first sitting a patient could actually take.
        const firstOpen = (d.days ?? []).find((x) => x.shifts.some((sh) => sh.isBookable));
        const firstShift = firstOpen?.shifts.find((sh) => sh.isBookable);
        if (firstOpen && firstShift) setSlot({ date: firstOpen.date, shift: firstShift.shift });
      } catch {
        setDays([]);
      }
    })();
    return () => { alive = false; };
  }, [doctor]);

  if (!doctor && !ticket) return null;

  const fee = doctor?.fees?.[visitType] ?? 0;

  const confirm = async () => {
    setBusy(true);
    try {
      const created = unwrap(await api.post('/api/queue/book', {
        doctorId: doctor.doctorId,
        familyMemberId: memberId || null,
        visitType,
        // Omitted when the doctor keeps no schedule: the server then books today.
        ...(slot ? { date: slot.date, shift: slot.shift } : {}),
        ...(complaint.trim() ? { complaint: complaint.trim() } : {}),
      }));
      setTicket({ ...created, doctor });
      toast.success(`Token ${token(created.tokenNumber)} confirmed`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (ticket) {
    return (
      <Modal open onClose={() => { setTicket(null); onClose(); }} variant="sheet" size="sm">
        <div className="text-center -m-5">
          <div className="bg-hero-chamber text-white p-6 pt-8 rounded-t-3xl sm:rounded-t-3xl">
            <div className="w-12 h-12 rounded-full bg-teal-500/20 border border-teal-400/40 grid place-items-center mx-auto mb-2">
              <svg className="w-6 h-6 text-teal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-xs font-bold text-teal-300 uppercase tracking-wider">Booking confirmed</p>
            <h3 className="text-3xl font-black mt-1">{token(ticket.tokenNumber)}</h3>
            <p className="text-xs text-slate-300 mt-1">{ticket.patientSnapshot?.name}</p>
          </div>

          <div className="p-5 space-y-3">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-left text-xs space-y-1">
              <p className="font-bold text-slate-900">{ticket.doctor.name}</p>
              <p className="text-slate-500">{ticket.doctor.specialty} · Chamber {ticket.doctor.chamberNumber || '—'}</p>
              <p className="text-slate-500">{ticket.doctor.hospital.name}</p>
              <p className="text-[11px] text-slate-400">{ticket.doctor.hospital.address?.line1}</p>
            </div>

            <div className="bg-slate-100 p-3 rounded-xl inline-block border border-slate-200">
              <QrCode value={`MEDIIGO:${ticket._id}`} size={128} />
            </div>
            <p className="text-[10px] font-mono font-bold text-slate-500">{ticket._id}</p>

            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
              Pay {inr(fee)} at the front desk when you arrive.
            </p>

            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => { setTicket(null); onClose(); }}>
                Close
              </Button>
              <Button className="flex-1" onClick={() => navigate('/tracker')}>
                Track live queue
              </Button>
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
      <div className="space-y-5">
        {user?.familyMembers?.length > 0 && (
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">Booking for</p>
            <div className="grid grid-cols-2 gap-2">
              {user.familyMembers.map((m) => (
                <button
                  key={m._id}
                  type="button"
                  onClick={() => setMemberId(m._id)}
                  className={clsx('p-2.5 rounded-xl text-xs text-left border-2 transition',
                    memberId === m._id ? 'border-teal-600 bg-teal-50 text-teal-900 font-bold' : 'border-slate-200 bg-slate-50 text-slate-600')}
                >
                  <span className="block truncate">{m.name}</span>
                  <span className="text-[10px] text-slate-400 capitalize">{m.relation?.toLowerCase()}</span>
                </button>
              ))}
              {/* Registering someone mid-booking used to mean abandoning the
                  sheet, going to Profile, and starting again. */}
              <button
                type="button"
                onClick={() => { onClose(); navigate('/profile'); }}
                className="p-2.5 rounded-xl text-xs text-left border-2 border-dashed border-slate-300 text-slate-500 hover:border-teal-400 hover:text-teal-700 transition"
              >
                <span className="block font-bold">+ Add someone</span>
                <span className="text-[10px] text-slate-400">Child, parent, spouse</span>
              </button>
            </div>
          </div>
        )}

        {/* 7-day picker. Only rendered when the doctor keeps a schedule — with
            none, booking is same-day and a date strip would be a lie. */}
        {days.length > 0 && (
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">Choose a date</p>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {days.map((d) => {
                const open = d.shifts.some((sh) => sh.isBookable);
                const active = slot?.date === d.date;
                return (
                  <button
                    key={d.date}
                    type="button"
                    disabled={!open}
                    onClick={() => {
                      const first = d.shifts.find((sh) => sh.isBookable);
                      setSlot({ date: d.date, shift: first?.shift });
                    }}
                    className={clsx(
                      'shrink-0 w-14 py-2 rounded-xl border-2 text-center transition',
                      active ? 'border-teal-600 bg-teal-50'
                        : open ? 'border-slate-200 bg-white hover:border-teal-300'
                          : 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed',
                    )}
                  >
                    <span className="block text-[9px] font-bold uppercase text-slate-400">
                      {d.isToday ? 'Today' : DAY_LABEL[d.dayOfWeek]}
                    </span>
                    <span className={clsx('block text-base font-black', active ? 'text-teal-700' : 'text-slate-800')}>
                      {Number(d.date.slice(8, 10))}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Which sitting, once a date is chosen. */}
            {(() => {
              const day = days.find((d) => d.date === slot?.date);
              if (!day) return null;
              if (!day.shifts.length) {
                return <p className="mt-2 text-[11px] text-slate-500 italic">{day.closureReason}</p>;
              }
              return (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {day.shifts.map((sh) => (
                    <button
                      key={sh.shift}
                      type="button"
                      disabled={!sh.isBookable}
                      onClick={() => setSlot({ date: day.date, shift: sh.shift })}
                      className={clsx(
                        'p-2.5 rounded-xl border-2 text-left transition',
                        slot?.shift === sh.shift && sh.isBookable ? 'border-teal-600 bg-teal-50'
                          : sh.isBookable ? 'border-slate-200 bg-slate-50 hover:border-teal-300'
                            : 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed',
                      )}
                    >
                      <span className="block text-[11px] font-bold text-slate-800">
                        {SHIFT_LABEL[sh.shift] || sh.shift}
                      </span>
                      <span className="block text-[10px] text-slate-500">{sh.startTime}–{sh.endTime}</span>
                      <span className="block text-[10px] mt-0.5">
                        {sh.endedToday ? <span className="text-slate-400">Ended for today</span>
                          : sh.isFull ? <span className="text-amber-600 font-bold">Fully booked</span>
                            : sh.remaining != null ? <span className="text-teal-700 font-semibold">{sh.remaining} left</span>
                              : <span className="text-slate-400">{sh.booked} booked</span>}
                      </span>
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">Visit type</p>
          <div className="grid grid-cols-3 gap-2">
            {['fresh', 'followup', 'emergency'].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVisitType(v)}
                className={clsx('p-3 rounded-2xl border-2 text-center transition',
                  visitType === v ? 'border-teal-600 bg-teal-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300')}
              >
                <span className={clsx('block text-[11px] font-extrabold', visitType === v ? 'text-teal-700' : 'text-slate-700')}>
                  {VISIT_LABEL[v]}
                </span>
                <span className="block text-sm font-black text-slate-900 mt-1">{inr(doctor.fees[v])}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">
            Reason for the visit <span className="font-semibold normal-case tracking-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            value={complaint}
            onChange={(e) => setComplaint(e.target.value.slice(0, 300))}
            rows={2}
            placeholder="e.g. Fever and sore throat for 3 days"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs resize-none focus:outline-none focus:border-teal-500"
          />
          <p className="text-[10px] text-slate-400 mt-1">Only the clinic and your doctor can see this.</p>
        </div>

        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-2 text-xs">
          <div className="flex justify-between"><span className="text-slate-500">Consultation</span><span className="font-bold">{inr(fee)}</span></div>
          <div className="flex justify-between text-slate-400"><span>Pay at desk</span><span>on arrival</span></div>
          <div className="flex justify-between pt-2 border-t border-slate-200">
            <span className="font-bold text-slate-700">Next available token</span>
            <span className="font-black text-teal-700 text-sm">{token(doctor.queue.nextToken)}</span>
          </div>
        </div>

        <Button onClick={confirm} loading={busy} className="w-full" size="lg">
          Confirm booking
        </Button>
      </div>
    </Modal>
  );
}
