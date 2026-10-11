import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Field, Input } from '../ui/Field.jsx';
import { MoneyInput } from '../ui/MoneyInput.jsx';
import { api } from '../../lib/api.js';
import { inr, timeOf } from '../../lib/format.js';

const QUICK_CATEGORIES = ['Gloves & masks', 'Cleaning', 'Stationery', 'Tea & water', 'Courier', 'Repairs'];

/**
 * Cash paid out of the drawer. Recorded, never edited: a mistake is voided
 * from the ledger, which keeps the original entry visible.
 */
export function PettyExpenseModal({ open, onClose, onSaved, toast }) {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAmount('');
    setCategory('');
    setNote('');
  }, [open]);

  const valid = Number(amount) >= 1 && category.trim().length >= 2;

  const save = async () => {
    setBusy(true);
    try {
      await api.post('/api/pos/expenses', { amount: Number(amount), category: category.trim(), note: note.trim() || undefined });
      toast.success(`Logged ${inr(amount)} petty expense — deducted from cash in hand`);
      onSaved?.();
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.error?.message || e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;
  return (
    <Modal open onClose={onClose} title="Log petty cash expense" subtitle="Cash paid out of the desk drawer today" size="sm">
      <div className="space-y-4">
        <Field label="Expense amount" required>
          <MoneyInput value={amount} onChange={setAmount} placeholder="250" />
        </Field>
        <Field label="Category / purpose" required>
          <Input value={category} maxLength={120} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Chamber cleaning / medical gloves" />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {QUICK_CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={clsx(
                  'px-2 py-0.5 rounded-full border text-[11px] transition',
                  category === c ? 'bg-mg-teal text-white border-mg-teal' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300',
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Note (optional)">
          <Input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="Shop name, bill number…" />
        </Field>
        <p className="text-[11px] text-slate-500">
          <i className="fa-solid fa-circle-info mr-1" aria-hidden="true" />
          This reduces today’s expected cash in hand. It can be voided later, but not edited or deleted.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="danger" onClick={save} loading={busy} disabled={!valid}>Deduct expense</Button>
        </div>
      </div>
    </Modal>
  );
}

export function VoidExpenseModal({ expense, onClose, onSaved, toast }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { setReason(''); }, [expense?.id]);
  if (!expense) return null;

  const save = async () => {
    setBusy(true);
    try {
      await api.post(`/api/pos/expenses/${expense.id}/void`, { reason: reason.trim() });
      toast.success('Expense voided — cash in hand restored');
      onSaved?.();
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.error?.message || e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Void this expense?" subtitle={`${inr(expense.originalAmount)} · ${expense.category}`} size="sm">
      <div className="space-y-4">
        <Field label="Reason" required hint="Kept in the ledger and the audit log.">
          <Input value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Entered twice" />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>Keep it</Button>
          <Button variant="danger" onClick={save} loading={busy} disabled={reason.trim().length < 3}>Void expense</Button>
        </div>
      </div>
    </Modal>
  );
}

/** End-of-day shift report, printed on A4. */
export function ShiftReport({ clinicName, dayClose, ledger, byDoctor = [], preparedBy }) {
  if (!dayClose) return null;
  const e = dayClose.expected;
  const petty = dayClose.pettyCash ?? { total: 0, count: 0 };
  const expenses = (ledger?.items ?? []).filter((i) => i.kind === 'EXPENSE' && i.date === dayClose.date);
  const row = (label, value, strong) => (
    <div className={clsx('flex justify-between py-1 border-b border-gray-200', strong && 'font-semibold')}>
      <span>{label}</span><span>{value}</span>
    </div>
  );
  return (
    <div className="space-y-4">
      <div className="border-b-2 border-[#1E3FA0] pb-2 flex justify-between items-end">
        <div>
          <p className="text-lg font-bold text-[#1E3A8A]">End-of-Day Shift Report</p>
          <p>{clinicName}</p>
        </div>
        <div className="text-right text-[11px]">
          <p>Date: {dayClose.date}</p>
          <p>Printed {timeOf(new Date())}{preparedBy ? ` by ${preparedBy}` : ''}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="text-[10px] uppercase text-gray-500 mb-1">Collections (completed consultations)</p>
          {row('Consultations', e.count)}
          {row('Cash', inr(e.cash))}
          {row('UPI', inr(e.upi))}
          {row('Card', inr(e.card))}
          {row('Gross revenue', inr(e.total), true)}
        </div>
        <div>
          <p className="text-[10px] uppercase text-gray-500 mb-1">Cash drawer</p>
          {row('Cash collected', inr(e.cash))}
          {row(`Petty cash (${petty.count})`, `- ${inr(petty.total)}`)}
          {row('Expected cash in hand', inr(dayClose.cashInHand ?? e.cash - petty.total), true)}
          {row('Billed incl. not yet seen', inr(dayClose.billedIncludingIncomplete?.total ?? 0))}
        </div>
      </div>

      {dayClose.byCollector?.length > 0 && (
        <div>
          <p className="text-[10px] uppercase text-gray-500 mb-1">By collector</p>
          <table className="w-full text-[11px] border-collapse">
            <thead><tr className="border-b border-gray-400 text-left"><th className="py-1">Staff</th><th>Cash</th><th>UPI</th><th>Card</th><th className="text-right">Total</th></tr></thead>
            <tbody>
              {dayClose.byCollector.map((c) => (
                <tr key={c.collectorId} className="border-b border-gray-200">
                  <td className="py-1">{c.collectorName}</td><td>{inr(c.cash)}</td><td>{inr(c.upi)}</td><td>{inr(c.card)}</td>
                  <td className="text-right font-semibold">{inr(c.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {byDoctor.length > 0 && (
        <div>
          <p className="text-[10px] uppercase text-gray-500 mb-1">By doctor</p>
          {byDoctor.map((d) => row(`${d.name}${d.chamberNumber ? ` (Ch. ${d.chamberNumber})` : ''} — ${d.completed} seen`, inr(d.revenue)))}
        </div>
      )}

      {expenses.length > 0 && (
        <div>
          <p className="text-[10px] uppercase text-gray-500 mb-1">Petty cash entries</p>
          {expenses.map((x) => row(
            `${timeOf(x.at)} · ${x.category}${x.status === 'VOID' ? ' (void)' : ''}${x.by ? ` · ${x.by}` : ''}`,
            x.status === 'VOID' ? '—' : `- ${inr(x.originalAmount)}`,
          ))}
        </div>
      )}

      <div className="pt-12 grid grid-cols-2 gap-10 text-center text-[11px]">
        <div><div className="border-b border-gray-500 mb-1 h-6" />Prepared by</div>
        <div><div className="border-b border-gray-500 mb-1 h-6" />Verified by</div>
      </div>
    </div>
  );
}
