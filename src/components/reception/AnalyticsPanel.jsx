import clsx from 'clsx';
import { useApi } from '../../hooks/useApi.js';
import { StatCard } from '../ui/StatCard.jsx';
import { SkeletonRows } from '../ui/Skeleton.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';
import { inr } from '../../lib/format.js';

/**
 * Accounts and patients over a window.
 *
 * One request serves both tabs, so the money and the headcount can never
 * disagree about which days they cover — two endpoints with their own date
 * maths is how a report ends up showing 40 consultations and 38 receipts and
 * nobody can say which is wrong.
 */

export const PERIODS = [
  ['day', 'Today'],
  ['week', 'Week'],
  ['month', 'Month'],
  ['6month', '6 months'],
  ['year', 'Year'],
];

const fmtLabel = (label, bucket) => {
  if (bucket === 'month') {
    const [y, m] = String(label).split('-');
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
  }
  return new Date(`${label}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

/** A plain bar row — proportional, labelled, readable without a chart library. */
function Bars({ rows, valueOf, format, tone = 'teal' }) {
  const max = Math.max(1, ...rows.map(valueOf));
  if (!rows.length) return <EmptyState icon="revenue" title="Nothing in this period" />;
  return (
    <div className="space-y-1.5">
      {rows.map((r) => {
        const v = valueOf(r);
        return (
          <div key={r.label} className="flex items-center gap-3">
            <span className="text-[10px] text-slate-400 w-16 shrink-0 text-right">{r.display}</span>
            <div className="flex-1 h-5 bg-slate-100 rounded overflow-hidden">
              <div
                className={clsx('h-full rounded transition-all', tone === 'teal' ? 'bg-teal-500' : 'bg-indigo-500')}
                style={{ width: `${Math.max(v > 0 ? 2 : 0, (v / max) * 100)}%` }}
              />
            </div>
            <span className="text-[11px] font-bold text-slate-700 w-20 shrink-0">{format(v)}</span>
          </div>
        );
      })}
    </div>
  );
}

export function AnalyticsPanel({ tab, period }) {
  const { data, loading } = useApi(`/api/pos/analytics?period=${period}`, { deps: [period] });

  if (loading) return <SkeletonRows rows={5} />;
  if (!data) return null;

  const decorate = (series) => series.map((r) => ({ ...r, display: fmtLabel(r.label, data.bucket) }));

  if (tab === 'accounts') {
    const t = data.accounts.totals;
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Collected" value={inr(t.total)} icon="revenue" tone="teal" hint={`${t.count} receipts`} />
          <StatCard label="Cash" value={inr(t.cash)} icon="cash" tone="cash" />
          <StatCard label="UPI" value={inr(t.upi)} icon="qr" tone="upi" />
          <StatCard label="Card" value={inr(t.card)} icon="wallet" tone="slate" />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h4 className="text-sm font-bold text-slate-900 mb-3">Collections</h4>
          <Bars rows={decorate(data.accounts.series)} valueOf={(r) => r.total} format={inr} />
        </div>

        {data.accounts.byVisitType.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h4 className="text-sm font-bold text-slate-900 mb-3">By visit type</h4>
            <div className="grid sm:grid-cols-3 gap-3">
              {data.accounts.byVisitType.map((v) => (
                <div key={v.visitType} className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{v.visitType}</p>
                  <p className="text-lg font-black text-slate-900">{inr(v.total)}</p>
                  <p className="text-[10px] text-slate-400">{v.count} consultations</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const p = data.patients.totals;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Booked" value={p.booked} icon="ticket" tone="teal" hint={`${p.unique} unique patients`} />
        <StatCard label="Seen" value={p.completed} icon="check" tone="cash" />
        <StatCard label="Cancelled" value={p.cancelled} icon="cross" tone="warn" hint={`${p.skipped} skipped`} />
        <StatCard label="Online booked" value={p.online} icon="compass" tone="upi" hint={`${p.walkin} at the desk`} />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h4 className="text-sm font-bold text-slate-900 mb-3">Patients seen</h4>
        <Bars rows={decorate(data.patients.series)} valueOf={(r) => r.completed} format={(v) => String(v)} tone="indigo" />
      </div>
    </div>
  );
}
