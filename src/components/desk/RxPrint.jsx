import { token } from '../../lib/format.js';
import { patientLine } from './deskFormat.js';

const longDate = (iso) => (iso
  ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  : '');

/** The printed prescription pad (A5), rendered through PrintPortal. */
export function RxPrint({ rx, clinicName }) {
  if (!rx) return null;
  const d = rx.doctorSnapshot || {};
  const p = rx.patientSnapshot || {};
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between border-b-2 border-[#1E3FA0] pb-2">
        <div>
          <p className="text-lg font-bold text-[#1E3A8A]">{d.name}</p>
          {d.qualifications?.length > 0 && <p className="text-[11px]">{d.qualifications.join(', ')}</p>}
          <p className="text-[11px] text-[#2F7F78]">{[d.specialty, d.chamberNumber && `Chamber ${d.chamberNumber}`].filter(Boolean).join(' • ')}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold">{clinicName}</p>
          <p className="text-[11px]">Date: {longDate(rx.date)}</p>
          {rx.tokenNumber != null && <p className="text-[11px]">Token {token(rx.tokenNumber)}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 border border-gray-300 rounded p-2">
        <div>
          <p className="text-[9px] uppercase text-gray-500">Patient name</p>
          <p className="font-semibold">{p.name}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase text-gray-500">Age / Gender / Contact</p>
          <p>{[patientLine(p), p.phone && `+91 ${p.phone}`].filter(Boolean).join(' • ') || '—'}</p>
        </div>
      </div>

      <div>
        <p className="text-[9px] uppercase text-gray-500">Clinical diagnosis</p>
        <p className="font-semibold">{rx.diagnosis}</p>
      </div>

      <div>
        <p className="text-2xl font-serif font-bold text-[#1E3FA0]">℞</p>
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="border-b border-gray-400 text-left text-[9px] uppercase text-gray-600">
              <th className="py-1 pr-2 w-5">#</th>
              <th className="py-1 pr-2">Medicine</th>
              <th className="py-1 pr-2">Dosage</th>
              <th className="py-1 pr-2">Duration</th>
              <th className="py-1">Instructions</th>
            </tr>
          </thead>
          <tbody>
            {rx.medicines.map((m, i) => (
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
        <div className="border border-gray-300 rounded p-2">
          <p className="text-[9px] uppercase text-gray-500">Advice &amp; instructions</p>
          <p>{rx.advice}</p>
        </div>
      )}
      {rx.reviewDate && <p><strong>Review on:</strong> {longDate(rx.reviewDate)}</p>}

      <div className="pt-10 flex items-end justify-between">
        <p className="text-[9px] text-gray-400">Issued via Mediigo EMR</p>
        <div className="text-center">
          <div className="border-b border-gray-500 w-36 mb-1" />
          <p className="text-[11px] font-semibold">{d.name}</p>
        </div>
      </div>
    </div>
  );
}
