import { useApi } from '../../hooks/useApi.js';
import { StatCard } from '../../components/ui/StatCard.jsx';
import { SkeletonRows } from '../../components/ui/Skeleton.jsx';
import { StatusBadge } from '../../components/ui/StatusBadge.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { inr } from '../../lib/format.js';

export default function ExecDashboardView() {
  const { data, loading } = useApi('/api/admin/dashboard');
  if (loading) return <SkeletonRows rows={5} />;
  if (!data) return null;

  const { counts, totals, byHospital } = data;

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-slate-900">District dashboard</h2>
          <p className="text-xs text-slate-500">{data.date} · revenue counts completed consultations only</p>
        </div>
        {counts.pendingApprovals > 0 && (
          <a href="/admin/approvals" className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
            {counts.pendingApprovals} awaiting approval →
          </a>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active clinics" value={counts.active} icon="building" tone="teal" hint={`${counts.hospitals} total in district`} />
        <StatCard label="Doctors" value={counts.doctors} icon="users" tone="slate" />
        <StatCard label="Tokens today" value={totals.tokensIssued} icon="ticket" tone="upi" hint={`${totals.consultations} completed`} />
        <StatCard
          label="Collection today"
          value={inr(totals.total)}
          icon="revenue"
          tone="cash"
          footer={
            <div className="mt-2 flex justify-between text-[10px] font-bold">
              <span className="text-emerald-600">Cash {inr(totals.cash)}</span>
              <span className="text-blue-600">UPI {inr(totals.upi)}</span>
            </div>
          }
        />
      </div>

      {(counts.suspended > 0 || counts.deboarded > 0) && (
        <div className="flex gap-3 flex-wrap">
          {counts.suspended > 0 && (
            <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5">
              <Icon name="alert" className="w-3.5 h-3.5" /> {counts.suspended} suspended
            </span>
          )}
          {counts.deboarded > 0 && (
            <span className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-300 px-3 py-1.5 rounded-xl">
              {counts.deboarded} deboarded
            </span>
          )}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Collection by clinic</h3>
            <p className="text-xs text-slate-500">Cash, UPI and card split across the district</p>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Clinic</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Tokens</th>
                <th className="py-3 px-4 text-right">Cash</th>
                <th className="py-3 px-4 text-right">UPI</th>
                <th className="py-3 px-4 text-right">Card</th>
                <th className="py-3 px-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {byHospital.map((h) => (
                <tr key={h.hospitalId} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4">
                    {/* An inner flex div, not a flex <td> — the prototype put flex
                        directly on the cell, which breaks table layout. */}
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0" />
                      <span className="font-bold text-slate-900">{h.name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4"><StatusBadge status={h.networkState} className="mx-auto" /></td>
                  <td className="py-3.5 px-4 text-center text-slate-600">{h.tokensIssued}</td>
                  <td className="py-3.5 px-4 text-right font-bold text-emerald-600">{inr(h.cash)}</td>
                  <td className="py-3.5 px-4 text-right font-bold text-blue-600">{inr(h.upi)}</td>
                  <td className="py-3.5 px-4 text-right font-bold text-slate-700">{inr(h.card)}</td>
                  <td className="py-3.5 px-4 text-right font-black text-teal-700 text-sm">{inr(h.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-200">
              <tr>
                <td className="py-3.5 px-4 text-slate-900 uppercase">All clinics</td>
                <td />
                <td className="py-3.5 px-4 text-center text-slate-900">{totals.tokensIssued}</td>
                <td className="py-3.5 px-4 text-right text-emerald-700">{inr(totals.cash)}</td>
                <td className="py-3.5 px-4 text-right text-blue-700">{inr(totals.upi)}</td>
                <td className="py-3.5 px-4 text-right text-slate-700">{inr(totals.card)}</td>
                <td className="py-3.5 px-4 text-right text-teal-800 text-sm">{inr(totals.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
