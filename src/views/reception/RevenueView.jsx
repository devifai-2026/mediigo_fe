import { useState } from 'react';
import { useApi } from '../../hooks/useApi.js';
import { StatCard } from '../../components/ui/StatCard.jsx';
import { MoneyInput } from '../../components/ui/MoneyInput.jsx';
import { Field } from '../../components/ui/Field.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { SkeletonRows } from '../../components/ui/Skeleton.jsx';
import { inr } from '../../lib/format.js';
import clsx from 'clsx';

/**
 * Day close.
 *
 * Revenue counts COMPLETED consultations only, and there is deliberately NO
 * petty-cash field anywhere: the rule is zero desk deductions, and leaving the
 * affordance in the UI is how that rule quietly stops being true.
 */
export default function RevenueView() {
  const { data, loading } = useApi('/api/pos/day-close');
  const [actual, setActual] = useState({ cash: '', upi: '', card: '' });

  if (loading) return <SkeletonRows rows={4} />;
  if (!data) return null;

  const e = data.expected;
  const variance = {
    cash: (actual.cash === '' ? e.cash : Number(actual.cash)) - e.cash,
    upi: (actual.upi === '' ? e.upi : Number(actual.upi)) - e.upi,
    card: (actual.card === '' ? e.card : Number(actual.card)) - e.card,
  };
  const totalVariance = variance.cash + variance.upi + variance.card;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Day close &amp; reconciliation</h2>
        <p className="text-xs text-slate-500">
          {data.hospitalName} · {data.date} · counting completed consultations only
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total collected" value={inr(e.total)} icon="revenue" tone="teal" hint={`${e.count} consultations`} />
        <StatCard label="Cash" value={inr(e.cash)} icon="cash" tone="cash" />
        <StatCard label="UPI" value={inr(e.upi)} icon="qr" tone="upi" />
        <StatCard label="Card" value={inr(e.card)} icon="wallet" tone="slate" />
      </div>

      {data.billedIncludingIncomplete.total > e.total && (
        <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 text-[11px] text-blue-800 flex items-start gap-2">
          <Icon name="info" className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            {inr(data.billedIncludingIncomplete.total)} has been billed today across{' '}
            {data.billedIncludingIncomplete.count} tokens, but only {inr(e.total)} is counted as revenue —
            the difference is for patients who have not completed their consultation yet.
          </span>
        </div>
      )}

      <div className="glass-card rounded-3xl p-6 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Reconcile against actual deposits</h3>
          <p className="text-[11px] text-slate-500">Enter what is physically in the drawer and in the bank</p>
        </div>

        {[['cash', 'Cash in drawer', 'cash'], ['upi', 'UPI settled', 'upi'], ['card', 'Card settled', 'slate']].map(([key, label, tone]) => (
          <div key={key} className="grid grid-cols-3 gap-3 items-center">
            <span className="text-xs font-bold text-slate-700">{label}</span>
            <MoneyInput value={actual[key]} onChange={(v) => setActual({ ...actual, [key]: v })} tone={tone} placeholder={String(e[key])} />
            <span className={clsx('text-xs font-bold text-right',
              variance[key] === 0 ? 'text-slate-400' : variance[key] > 0 ? 'text-blue-600' : 'text-rose-600')}
            >
              {variance[key] === 0 ? 'Matches' : `${variance[key] > 0 ? '+' : ''}${inr(variance[key])}`}
            </span>
          </div>
        ))}

        <div className={clsx('rounded-2xl border p-4 flex items-center justify-between text-sm font-bold',
          totalVariance === 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700')}
        >
          <span>Variance</span>
          <span>{totalVariance === 0 ? 'Balanced' : `${totalVariance > 0 ? '+' : ''}${inr(totalVariance)}`}</span>
        </div>
      </div>

      {data.byCollector.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100"><h3 className="text-sm font-bold text-slate-900">By collector</h3></div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Staff</th>
                <th className="py-3 px-4 text-right">Cash</th>
                <th className="py-3 px-4 text-right">UPI</th>
                <th className="py-3 px-4 text-right">Card</th>
                <th className="py-3 px-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {data.byCollector.map((c) => (
                <tr key={c.collectorId}>
                  <td className="py-3 px-4 font-bold text-slate-900">{c.collectorName}</td>
                  <td className="py-3 px-4 text-right text-emerald-600 font-bold">{inr(c.cash)}</td>
                  <td className="py-3 px-4 text-right text-blue-600 font-bold">{inr(c.upi)}</td>
                  <td className="py-3 px-4 text-right text-slate-700 font-bold">{inr(c.card)}</td>
                  <td className="py-3 px-4 text-right text-teal-700 font-black">{inr(c.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
