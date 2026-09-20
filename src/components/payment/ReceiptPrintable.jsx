import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { QrCode } from '../ui/QrCode.jsx';
import { inr, token, timeOf } from '../../lib/format.js';
import { VISIT_LABEL } from '../../lib/constants.js';

/**
 * Renders into the #print-root portal, outside the SPA tree, then triggers the
 * print dialog. Printing straight from the app tree fights sticky headers and
 * breaks if the router unmounts mid-print.
 */
export function ReceiptPrintable({ receipt, onDone }) {
  useEffect(() => {
    if (!receipt) return undefined;
    // One frame so the QR canvas has actually painted before the dialog opens.
    const id = requestAnimationFrame(() => {
      const after = () => {
        window.removeEventListener('afterprint', after);
        onDone?.();
      };
      window.addEventListener('afterprint', after);
      window.print();
    });
    return () => cancelAnimationFrame(id);
  }, [receipt, onDone]);

  if (!receipt) return null;
  const { transaction, token: tok, hospital, doctor } = receipt;

  return createPortal(
    <div className="p-4 font-mono text-[11px] text-black leading-relaxed" style={{ width: '72mm' }}>
      <div className="text-center border-b border-dashed border-black pb-2 mb-2">
        <p className="text-sm font-black tracking-wide">{hospital?.name || 'MEDIIGO CLINIC'}</p>
        <p>{hospital?.address?.line1}</p>
        <p>{hospital?.address?.city} {hospital?.address?.pincode}</p>
        {hospital?.contactPhone && <p>Ph: {hospital.contactPhone}</p>}
      </div>

      <div className="flex justify-between"><span>Receipt</span><span className="font-bold">{transaction.receiptNumber}</span></div>
      <div className="flex justify-between"><span>Date</span><span>{transaction.date} {timeOf(transaction.createdAt)}</span></div>
      <div className="flex justify-between"><span>Token</span><span className="font-black text-sm">{token(tok.tokenNumber)}</span></div>

      <div className="border-t border-dashed border-black my-2 pt-2">
        <div className="flex justify-between"><span>Patient</span><span className="font-bold">{tok.patientSnapshot?.name}</span></div>
        <div className="flex justify-between"><span>Doctor</span><span>{doctor?.name}</span></div>
        <div className="flex justify-between"><span>Chamber</span><span>{doctor?.chamberNumber || '—'}</span></div>
        <div className="flex justify-between"><span>Visit</span><span>{VISIT_LABEL[transaction.visitType]}</span></div>
      </div>

      <div className="border-t border-dashed border-black my-2 pt-2">
        <div className="flex justify-between"><span>Consultation</span><span>{inr(transaction.baseFee)}</span></div>
        {transaction.discount > 0 && <div className="flex justify-between"><span>Discount</span><span>-{inr(transaction.discount)}</span></div>}
        <div className="flex justify-between font-black text-sm border-t border-black mt-1 pt-1">
          <span>TOTAL</span><span>{inr(transaction.totalFee)}</span>
        </div>
      </div>

      <div className="border-t border-dashed border-black my-2 pt-2">
        {transaction.tender.cash > 0 && <div className="flex justify-between"><span>Cash</span><span>{inr(transaction.tender.cash)}</span></div>}
        {transaction.tender.upi > 0 && <div className="flex justify-between"><span>UPI</span><span>{inr(transaction.tender.upi)}</span></div>}
        {transaction.tender.card > 0 && <div className="flex justify-between"><span>Card</span><span>{inr(transaction.tender.card)}</span></div>}
      </div>

      <div className="text-center mt-3">
        <QrCode value={`MEDIIGO:${transaction.receiptNumber}`} size={80} className="inline-block" />
        <p className="mt-2">Track your queue at mediigo.app</p>
        <p className="mt-1 font-bold">Thank you</p>
      </div>
    </div>,
    document.getElementById('print-root'),
  );
}
