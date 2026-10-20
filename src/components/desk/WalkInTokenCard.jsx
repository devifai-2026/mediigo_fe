import { QrCode } from '../ui/QrCode.jsx';
import { Button } from '../ui/Button.jsx';
import { inr, phone, token } from '../../lib/format.js';
import { VISIT_LABEL } from '../../lib/constants.js';
import { patientLine } from './deskFormat.js';

const longDate = (iso) => (iso
  ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  : '');

/**
 * The token just issued at the desk, in one standard layout: token number
 * first, then who, with whom, when and what was paid. It stays on screen after
 * the receipt prints so the desk can read it back to the patient, reprint it,
 * or hand over the tracking QR.
 */
export function WalkInTokenCard({ receipt, clinicName, onPrint, onClose }) {
  if (!receipt) return null;
  const { token: t, transaction: tx, doctor } = receipt;
  const p = t.patientSnapshot || {};
  const trackUrl = `${window.location.origin}/t/${t._id}`;

  return (
    <section className="rounded-xl border-2 border-mg-teal bg-white shadow-sm overflow-hidden" aria-label="Issued token">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 bg-mg-surface border-b border-slate-200">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-mg-teal">OPD Token · Walk-in</p>
          <p className="text-sm font-semibold text-slate-900 truncate">{clinicName || 'Clinic'}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <img src="/logo-mark.png" alt="" className="w-6 h-auto" />
          <span className="text-xs font-bold text-mg-navy">Mediigo</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr_auto] gap-4 sm:gap-6 p-4 sm:p-5 items-center">
        <div className="text-center sm:text-left">
          <p className="text-[10px] uppercase tracking-wider text-slate-400">Token no.</p>
          <p className="text-6xl font-bold leading-none text-mg-navy">{token(t.tokenNumber)}</p>
          <p className="text-[11px] text-slate-500 mt-1.5">{longDate(t.date)}</p>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs min-w-0">
          <div className="col-span-2">
            <dt className="text-[10px] uppercase text-slate-400">Patient</dt>
            <dd className="font-semibold text-slate-900 text-sm truncate">{p.name}</dd>
            <dd className="text-slate-500">{[patientLine(p), p.phone && `+91 ${phone(p.phone)}`].filter(Boolean).join(' • ') || '—'}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase text-slate-400">Doctor</dt>
            <dd className="font-medium text-slate-800 truncate">{doctor?.name}</dd>
            <dd className="text-slate-500 truncate">{[doctor?.specialty, doctor?.chamberNumber && `Chamber ${doctor.chamberNumber}`].filter(Boolean).join(' • ')}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase text-slate-400">Visit</dt>
            <dd className="font-medium text-slate-800">{VISIT_LABEL[tx?.visitType] || 'OPD'}</dd>
            {t.shift && <dd className="text-slate-500 capitalize">{String(t.shift).toLowerCase()} sitting</dd>}
          </div>
          <div>
            <dt className="text-[10px] uppercase text-slate-400">Receipt</dt>
            <dd className="font-mono text-slate-800">{tx?.receiptNumber}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase text-slate-400">Paid</dt>
            <dd className="font-semibold text-mg-blue">{inr(tx?.totalFee ?? 0)}</dd>
          </div>
          {p.complaint && (
            <div className="col-span-2">
              <dt className="text-[10px] uppercase text-slate-400">Symptoms</dt>
              <dd className="text-slate-700">{p.complaint}</dd>
            </div>
          )}
        </dl>

        <div className="flex flex-col items-center gap-1">
          <QrCode value={trackUrl} size={92} />
          <span className="text-[10px] text-slate-400">Scan to track queue</span>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2 px-4 sm:px-5 py-3 border-t border-slate-100">
        <Button variant="ghost" size="sm" onClick={onClose}>Register next patient</Button>
        <Button variant="secondary" size="sm" onClick={onPrint}>
          <i className="fa-solid fa-print" aria-hidden="true" /> Print again
        </Button>
      </div>
    </section>
  );
}
