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

  // Reset every time the sheet opens for a different doctor.
  useEffect(() => {
    if (doctor) {
      setMemberId(user?.familyMembers?.[0]?._id ?? '');
      setVisitType('fresh');
      setTicket(null);
    }
  }, [doctor, user]);

  if (!doctor && !ticket) return null;

  const fee = doctor?.fees?.[visitType] ?? 0;

  const confirm = async () => {
    setBusy(true);
    try {
      const created = unwrap(await api.post('/api/queue/book', {
        doctorId: doctor.doctorId,
        familyMemberId: memberId || null,
        visitType,
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
            </div>
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
