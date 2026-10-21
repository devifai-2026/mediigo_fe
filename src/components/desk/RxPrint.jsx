import { useAuth } from '../../context/AuthContext.jsx';
import { inr, token } from '../../lib/format.js';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { patientLine } from './deskFormat.js';

const longDate = (iso) => (iso
  ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  : '');

/**
 * The prescription header every pad carries: clinic, doctor, date and the
 * Mediigo mark. Shared by the writing pad on screen and the rendered record,
 * so what the doctor writes under is what the patient reads.
 */
export function RxHeader({ hospitalName, doctor = {}, date, tokenNumber }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b-2 border-[#1E3FA0] pb-2.5">
      <div className="min-w-0">
        <p className="text-base font-bold text-[#1E3A8A] leading-tight">{hospitalName || 'Clinic'}</p>
        <p className="text-sm font-semibold text-slate-900 mt-1">{doctor.name}</p>
        {doctor.qualifications?.length > 0 && <p className="text-[11px] text-slate-600">{doctor.qualifications.join(', ')}</p>}
        <p className="text-[11px] text-[#2F7F78]">{[doctor.specialty, doctor.chamberNumber && `Chamber ${doctor.chamberNumber}`].filter(Boolean).join(' • ')}</p>
      </div>
      <div className="text-right shrink-0">
        <div className="flex items-center justify-end gap-1.5">
          <img src="/logo-mark.png" alt="" className="w-6 h-auto" />
          <span className="text-sm font-bold text-[#1E3A8A] tracking-tight">Mediigo</span>
        </div>
        <p className="text-[11px] text-slate-700 mt-1">Date: <strong className="font-semibold">{longDate(date)}</strong></p>
        {tokenNumber != null && <p className="text-[11px] text-slate-700">Token {token(tokenNumber)}</p>}
      </div>
    </div>
  );
}

/**
 * One prescription as a readable document — on screen in the EMR and the
 * footfall register, and the same markup when printed. No PDF involved.
 */
export function RxDocument({ rx, clinicName }) {
  // Prescriptions written before the clinic name was stored on them fall back
  // to the signed-in desk's clinic, which is the only clinic it can read.
  const { user } = useAuth();
  if (!rx) return null;
  const d = rx.doctorSnapshot || {};
  const p = rx.patientSnapshot || {};
  return (
    <div className="space-y-3 text-[12px] text-slate-900">
      <RxHeader hospitalName={rx.hospitalName || clinicName || user?.clinic?.name} doctor={d} date={rx.date} tokenNumber={rx.tokenNumber} />

      <div className="grid grid-cols-2 gap-2 border border-gray-300 rounded-md p-2">
        <div>
          <p className="text-[10px] uppercase text-gray-500">Patient name</p>
          <p className="font-semibold">{p.name}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-gray-500">Age / Gender / Contact</p>
          <p>{[patientLine(p), p.phone && `+91 ${p.phone}`].filter(Boolean).join(' • ') || '—'}</p>
        </div>
      </div>

      {rx.symptoms && (
        <div>
          <p className="text-[10px] uppercase text-gray-500">Symptoms / chief complaint</p>
          <p>{rx.symptoms}</p>
        </div>
      )}
      <div>
        <p className="text-[10px] uppercase text-gray-500">Clinical diagnosis</p>
        <p className="font-semibold">{rx.diagnosis}</p>
      </div>

      <div>
        <p className="text-2xl font-serif font-bold text-[#1E3FA0]">℞</p>
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="border-b border-gray-400 text-left text-[10px] uppercase text-gray-600">
              <th className="py-1 pr-2 w-5">#</th>
              <th className="py-1 pr-2">Medicine</th>
              <th className="py-1 pr-2">Dosage</th>
              <th className="py-1 pr-2">Duration</th>
              <th className="py-1">Instructions</th>
            </tr>
          </thead>
          <tbody>
            {(rx.medicines || []).map((m, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <tr key={i} className="border-b border-gray-200 align-top">
                <td className="py-1.5 pr-2">{i + 1}</td>
                <td className="py-1.5 pr-2 font-semibold">{m.name}</td>
                <td className="py-1.5 pr-2">{m.dosage}</td>
                <td className="py-1.5 pr-2">{m.duration}</td>
                <td className="py-1.5">{m.instruction}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rx.advice && (
        <div className="border border-gray-300 rounded-md p-2">
          <p className="text-[10px] uppercase text-gray-500">Advice &amp; instructions</p>
          <p className="whitespace-pre-line">{rx.advice}</p>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {rx.reviewDate ? <p><strong>Review on:</strong> {longDate(rx.reviewDate)}</p> : <span />}
        {rx.totalDue != null && (
          <p className="text-sm"><span className="text-gray-500">Total due:</span> <strong className="font-bold">{inr(rx.totalDue)}</strong></p>
        )}
      </div>

      <div className="pt-8 flex items-end justify-between">
        <p className="text-[10px] text-gray-400">Issued via Mediigo EMR</p>
        <div className="text-center">
          <div className="border-b border-gray-500 w-36 mb-1" />
          <p className="text-[11px] font-semibold">{d.name}</p>
        </div>
      </div>
    </div>
  );
}

/** The printed pad (A5), rendered through PrintPortal. */
export function RxPrint({ rx, clinicName }) {
  return <RxDocument rx={rx} clinicName={clinicName} />;
}

/** A prescription opened in place, ready to read, with a print option. */
export function RxViewModal({ rx, clinicName, onClose, onPrint }) {
  if (!rx) return null;
  return (
    <Modal open onClose={onClose} title="Prescription" subtitle={rx.patientSnapshot?.name} size="lg">
      <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
        <RxDocument rx={rx} clinicName={clinicName} />
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="secondary" onClick={onClose}>Close</Button>
        {onPrint && (
          <Button onClick={() => onPrint(rx)}>
            <i className="fa-solid fa-print" aria-hidden="true" /> Print
          </Button>
        )}
      </div>
    </Modal>
  );
}
