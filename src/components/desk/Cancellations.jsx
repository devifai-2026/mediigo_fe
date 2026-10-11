import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Field, Textarea } from '../ui/Field.jsx';
import { api } from '../../lib/api.js';
import { inr, timeOf, token } from '../../lib/format.js';
import { DeskCard, Pill } from './ui.jsx';

const QUICK_REASONS = [
  'Patient called to cancel',
  'Patient did not turn up',
  'Duplicate booking',
  'Doctor unavailable for this patient',
  'Booked with the wrong doctor',
];

const errMsg = (e) => e?.response?.data?.error?.details?.[0]?.message || e?.response?.data?.error?.message || e.message;

/**
 * The desk cancelling a patient's token. A reason is required: the patient
 * sees it in their bookings and the doctor is flagged with it. The fee is
 * never refunded, and the desk is told so before confirming.
 */
export function CancelTokenModal({ target, onClose, onDone, toast }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { setReason(''); }, [target?.tokenId]);
  if (!target) return null;

  const paid = target.fee != null && target.fee > 0;
  const valid = reason.trim().length >= 5;

  const confirm = async () => {
    setBusy(true);
    try {
      await api.delete(`/api/queue/tokens/${target.tokenId}`, { data: { reason: reason.trim() } });
      toast.success(`${token(target.tokenNumber)} cancelled — the doctor has been notified`);
      onDone?.();
      onClose();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Cancel this token?" subtitle={`${token(target.tokenNumber)} · ${target.name || 'Patient'}`} size="sm">
      <div className="space-y-4">
        <Field label="Reason for cancelling" required hint="Shown to the patient and to the doctor.">
          <Textarea rows={2} maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Patient called to say they cannot come" />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {QUICK_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className={clsx(
                  'px-2 py-0.5 rounded-full border text-[11px] transition',
                  reason === r ? 'bg-mg-teal text-white border-mg-teal' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300',
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </Field>

        <div className={clsx('rounded-lg border p-3 text-xs space-y-1', paid ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-mg-surface border-slate-200 text-slate-600')}>
          {paid ? (
            <p><i className="fa-solid fa-triangle-exclamation mr-1.5" aria-hidden="true" />
              Paid {inr(target.fee)}. Cancelling does <strong className="font-semibold">not</strong> refund the fee.
            </p>
          ) : (
            <p>Not paid yet — nothing to refund.</p>
          )}
          <p><i className="fa-solid fa-bell mr-1.5" aria-hidden="true" />The doctor is flagged and the patient sees the reason in their bookings.</p>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>Keep token</Button>
          <Button variant="danger" onClick={confirm} loading={busy} disabled={!valid} title={!valid ? 'Give a reason (at least 5 characters)' : undefined}>
            Cancel token
          </Button>
        </div>
      </div>
    </Modal>
  );
}

const BY = {
  PATIENT: { label: 'Patient cancelled', tone: 'slate', icon: 'fa-user' },
  DESK: { label: 'Front desk', tone: 'amber', icon: 'fa-headset' },
  DOCTOR: { label: 'You', tone: 'blue', icon: 'fa-user-doctor' },
  ADMIN: { label: 'Admin', tone: 'rose', icon: 'fa-shield-halved' },
};

/**
 * Today's cancellations for one doctor. On the doctor's screen, the ones
 * someone else made are flagged until acknowledged; on the desk it is a log.
 */
export function CancellationsPanel({ cancellations = [], forDoctor = false, onChanged, toast }) {
  const [open, setOpen] = useState(false);
  const [acking, setAcking] = useState(null);
  if (!cancellations.length) return null;

  const pending = forDoctor ? cancellations.filter((c) => c.needsAck) : [];
  const rest = forDoctor ? cancellations.filter((c) => !c.needsAck) : cancellations;

  const ack = async (c) => {
    setAcking(c.tokenId);
    try {
      await api.post(`/api/queue/tokens/${c.tokenId}/cancel-ack`);
      onChanged?.();
    } catch (e) {
      toast?.error(errMsg(e));
    } finally {
      setAcking(null);
    }
  };

  const row = (c, flagged) => {
    const by = BY[c.byRole] ?? BY.PATIENT;
    return (
      <div key={c.tokenId} className={clsx('flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border', flagged ? 'bg-rose-50/70 border-rose-200' : 'bg-white border-slate-200')}>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900">
            <span className="text-mg-navy font-semibold">{token(c.tokenNumber)}</span> · {c.name}
            {c.wasPaid && <span className="ml-2 text-[10px] font-medium text-amber-700">PAID · NOT REFUNDED</span>}
          </p>
          <p className="text-xs text-slate-600 mt-0.5">
            <i className="fa-solid fa-quote-left text-[9px] text-slate-400 mr-1" aria-hidden="true" />{c.reason || 'No reason given'}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            <i className={clsx('fa-solid mr-1', by.icon)} aria-hidden="true" />
            {c.byRole === 'PATIENT' ? 'Cancelled by the patient' : `Cancelled by ${c.byName || by.label}`}
            {c.at && ` · ${timeOf(c.at)}`}
            {c.acknowledgedAt && ' · seen'}
          </p>
        </div>
        {flagged && (
          <Button size="sm" variant="secondary" loading={acking === c.tokenId} onClick={() => ack(c)} className="shrink-0">
            <i className="fa-solid fa-check" aria-hidden="true" /> Got it
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {pending.length > 0 && (
        <DeskCard className="p-4 border-rose-200 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[15px] font-semibold text-rose-800 flex items-center gap-2">
              <i className="fa-solid fa-bell" aria-hidden="true" />
              {pending.length === 1 ? 'A patient was taken off your list' : `${pending.length} patients were taken off your list`}
            </h3>
            {pending.length > 1 && (
              <Button size="sm" variant="secondary" onClick={() => pending.forEach(ack)}>Mark all seen</Button>
            )}
          </div>
          <div className="space-y-2">{pending.map((c) => row(c, true))}</div>
        </DeskCard>
      )}

      {rest.length > 0 && (
        <DeskCard className="p-4">
          <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between gap-2 text-left">
            <span className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <i className="fa-solid fa-ban text-slate-400" aria-hidden="true" />
              Cancelled today
              <Pill tone="slate">{rest.length}</Pill>
            </span>
            <i className={clsx('fa-solid fa-chevron-down text-xs text-slate-400 transition', open && 'rotate-180')} aria-hidden="true" />
          </button>
          {open && <div className="space-y-2 mt-3">{rest.map((c) => row(c, false))}</div>}
        </DeskCard>
      )}
    </div>
  );
}
