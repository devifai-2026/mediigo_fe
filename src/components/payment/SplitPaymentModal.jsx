import { useState, useMemo, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { MoneyInput } from '../ui/MoneyInput.jsx';
import { Field, Input } from '../ui/Field.jsx';
import { Icon } from '../ui/Icon.jsx';
import { inr } from '../../lib/format.js';

const num = (v) => (v === '' || v == null ? 0 : Number(v));

/**
 * Split tender.
 *
 * The prototype only had a single mutually-exclusive CASH|UPI|CARD radio; this
 * is designed from scratch to satisfy the invariant cash + upi + card ===
 * totalFee, which the server re-asserts in integer paise.
 *
 * Two deliberate affordances:
 *  - An "Exact" chip per row fills the outstanding remainder, so the common
 *    single-tender case stays one tap and the split UI costs nothing.
 *  - When submit is disabled the button says WHY ("₹340 short") rather than
 *    sitting there as an inert grey rectangle.
 */
export function SplitPaymentModal({ open, onClose, totalFee, patientName, onConfirm, submitting }) {
  const [cash, setCash] = useState('');
  const [upi, setUpi] = useState('');
  const [card, setCard] = useState('');
  const [upiRef, setUpiRef] = useState('');
  const [cardLast4, setCardLast4] = useState('');
  // Held for the modal's lifetime so a double-tap or a retry-after-timeout can
  // never bill the patient twice.
  const idempotencyKey = useRef(null);

  useEffect(() => {
    if (open) {
      setCash(''); setUpi(''); setCard(''); setUpiRef(''); setCardLast4('');
      idempotencyKey.current = `pos-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }
  }, [open]);

  const { tendered, remaining, balanced } = useMemo(() => {
    const t = num(cash) + num(upi) + num(card);
    return { tendered: t, remaining: totalFee - t, balanced: t === totalFee };
  }, [cash, upi, card, totalFee]);

  const needsUpiRef = num(upi) > 0 && !upiRef.trim();
  const needsCardLast4 = num(card) > 0 && !/^\d{4}$/.test(cardLast4);
  const canSubmit = balanced && !needsUpiRef && !needsCardLast4 && !submitting;

  const fillExact = (setter, currentValue) => () => {
    // Give this row whatever is still outstanding, on top of what it already holds.
    setter(Math.max(0, num(currentValue) + remaining));
  };

  const rows = [
    { key: 'cash', label: 'Cash', tone: 'cash', value: cash, set: setCash, icon: 'cash' },
    { key: 'upi', label: 'UPI', tone: 'upi', value: upi, set: setUpi, icon: 'qr' },
    { key: 'card', label: 'Card', tone: 'slate', value: card, set: setCard, icon: 'wallet' },
  ];

  const submit = () => {
    if (!canSubmit) return;
    onConfirm({
      tender: { cash: num(cash), upi: num(upi), card: num(card) },
      upiRef: upiRef.trim() || undefined,
      cardLast4: cardLast4 || undefined,
      idempotencyKey: idempotencyKey.current,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Collect payment" subtitle={patientName} variant="sheet" size="md">
      <div className="space-y-4">
        <div className="bg-slate-900 text-white rounded-2xl p-4 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300">Total due</span>
          <span className="text-2xl font-black">{inr(totalFee)}</span>
        </div>

        <div className="space-y-2.5">
          {rows.map((r) => (
            <div key={r.key} className="flex items-center gap-2">
              <div className="w-20 shrink-0 flex items-center gap-1.5">
                <Icon name={r.icon} className={clsx('w-4 h-4', r.tone === 'cash' ? 'text-emerald-600' : r.tone === 'upi' ? 'text-blue-600' : 'text-slate-500')} />
                <span className="text-xs font-bold text-slate-700">{r.label}</span>
              </div>
              <MoneyInput value={r.value} onChange={r.set} tone={r.tone} className="flex-1" />
              <button
                type="button"
                onClick={fillExact(r.set, r.value)}
                disabled={remaining === 0}
                className="px-2.5 py-2 text-[10px] font-extrabold uppercase tracking-wide rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-40 shrink-0"
                title="Fill the outstanding amount into this row"
              >
                Exact
              </button>
            </div>
          ))}
        </div>

        {num(upi) > 0 && (
          <Field label="UPI reference" required error={needsUpiRef ? 'Required when UPI is tendered' : undefined}>
            <Input value={upiRef} onChange={(e) => setUpiRef(e.target.value)} placeholder="UTR / transaction id" />
          </Field>
        )}
        {num(card) > 0 && (
          <Field label="Card last 4 digits" required error={needsCardLast4 ? 'Enter exactly 4 digits' : undefined}>
            <Input inputMode="numeric" maxLength={4} value={cardLast4} onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, ''))} placeholder="4242" />
          </Field>
        )}

        {/* Running tally, always visible above the CTA. */}
        <div
          className={clsx(
            'rounded-2xl border p-3 flex items-center justify-between text-xs font-bold transition-colors',
            balanced && 'bg-emerald-50 border-emerald-200 text-emerald-700',
            remaining > 0 && 'bg-amber-50 border-amber-200 text-amber-800',
            remaining < 0 && 'bg-rose-50 border-rose-200 text-rose-700',
          )}
        >
          <span>Tendered {inr(tendered)}</span>
          <span>
            {balanced && <><Icon name="check" className="w-4 h-4 inline mr-1" />Balanced</>}
            {remaining > 0 && `${inr(remaining)} short`}
            {remaining < 0 && `${inr(Math.abs(remaining))} over`}
          </span>
        </div>

        <Button onClick={submit} disabled={!canSubmit} loading={submitting} className="w-full" size="lg">
          {balanced
            ? `Collect ${inr(totalFee)} & issue token`
            : remaining > 0
              ? `${inr(remaining)} still to collect`
              : `Remove ${inr(Math.abs(remaining))} — over-tendered`}
        </Button>
      </div>
    </Modal>
  );
}
