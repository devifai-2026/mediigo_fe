import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { QrCode } from '../ui/QrCode.jsx';
import { inr, token, relativeDay, ageOf } from '../../lib/format.js';
import { VISIT_LABEL } from '../../lib/constants.js';

const SHIFT_LABEL = { MORNING: 'Morning', AFTERNOON: 'Afternoon', EVENING: 'Evening' };

/**
 * The patient's own copy of a booking, on the same 72mm thermal stationery the
 * front desk prints receipts on. Print-to-PDF in the browser saves it.
 *
 * Works paid or unpaid, because the unpaid pass is what actually gets someone
 * past the desk. An unpaid one must never read like proof of payment, so it
 * says PAY AT DESK where a receipt would show a receipt number.
 */
export function BookingPass({ token: t, onDone }) {
  useEffect(() => {
    if (!t) return undefined;
    // One frame so the QR canvas has painted before the dialog opens.
    const id = requestAnimationFrame(() => {
      const after = () => {
        window.removeEventListener('afterprint', after);
        onDone?.();
      };
      window.addEventListener('afterprint', after);
      window.print();
    });
    return () => cancelAnimationFrame(id);
  }, [t, onDone]);

  if (!t) return null;

  const doctor = t.doctorId ?? {};
  const hospital = t.hospitalId ?? {};
  const age = t.patientSnapshot?.age ?? ageOf(t.patientSnapshot?.dob);
  // Each booking carries its own QR so the desk can pull it up by scan.
  const qrPayload = JSON.stringify({ t: t._id, n: t.tokenNumber, d: t.date });

  return createPortal(
    <div className="p-4 font-mono text-[11px] text-black leading-relaxed" style={{ width: '72mm' }}>
      <div className="text-center border-b border-dashed border-black pb-2 mb-2">
        <p className="text-sm font-black tracking-wide">{hospital.name || 'MEDIIGO CLINIC'}</p>
        {hospital.address?.line1 && <p>{hospital.address.line1}</p>}
        <p>{hospital.address?.city} {hospital.address?.pincode}</p>
        {hospital.contactPhone && <p>Ph: {hospital.contactPhone}</p>}
      </div>

      <p className="text-center font-black tracking-widest text-[10px] mb-2">OPD TOKEN PASS</p>

      <div className="text-center border border-black rounded py-2 mb-2">
        <p className="text-[9px] tracking-widest">TOKEN</p>
        <p className="text-2xl font-black leading-none">{token(t.tokenNumber)}</p>
        {t.shift && (
          <p className="text-[10px] mt-1">
            {SHIFT_LABEL[t.shift] || t.shift}
            {t.startTime && <> · {t.startTime}–{t.endTime}</>}
          </p>
        )}
      </div>

      <div className="flex justify-between"><span>Date</span><span className="font-bold">{relativeDay(t.date)} ({t.date})</span></div>
      <div className="flex justify-between"><span>Patient</span><span className="font-bold">{t.patientSnapshot?.name}</span></div>
      {(age != null || t.patientSnapshot?.gender) && (
        <div className="flex justify-between">
          <span>Age / Sex</span>
          <span>{age != null ? `${age}y` : '—'} / {t.patientSnapshot?.gender || '—'}</span>
        </div>
      )}
      <div className="flex justify-between"><span>Doctor</span><span>{doctor.name}</span></div>
      {doctor.specialty && <div className="flex justify-between"><span>Dept</span><span>{doctor.specialty}</span></div>}
      {doctor.chamberNumber && <div className="flex justify-between"><span>Chamber</span><span>{doctor.chamberNumber}</span></div>}
      <div className="flex justify-between"><span>Visit</span><span>{VISIT_LABEL[t.visitType] || t.visitType}</span></div>

      {t.patientSnapshot?.complaint && (
        <div className="border-t border-dashed border-black mt-2 pt-2">
          <p className="text-[10px]">Reason: {t.patientSnapshot.complaint}</p>
        </div>
      )}

      <div className="border-t border-dashed border-black my-2 pt-2">
        <div className="flex justify-between text-sm">
          <span className="font-bold">{t.isPaid ? 'PAID' : 'AMOUNT DUE'}</span>
          <span className="font-black">{inr(doctor.fees?.[t.visitType] ?? 0)}</span>
        </div>
        {!t.isPaid && (
          <p className="text-center text-[10px] font-black tracking-widest border border-black mt-2 py-1">
            PAY AT DESK — NOT A RECEIPT
          </p>
        )}
      </div>

      <div className="flex justify-center my-3">
        <QrCode value={qrPayload} size={96} />
      </div>

      <p className="text-center text-[9px] border-t border-dashed border-black pt-2">
        Show this pass at the front desk.<br />
        Track your live queue position in the Mediigo app.
      </p>
    </div>,
    document.getElementById('print-root') ?? document.body,
  );
}
