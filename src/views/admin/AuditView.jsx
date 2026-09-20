import { useApi } from '../../hooks/useApi.js';
import { DataTable } from '../../components/ui/DataTable.jsx';
import { SkeletonRows } from '../../components/ui/Skeleton.jsx';
import { timeOf, shortDate } from '../../lib/format.js';

const TONE = {
  HOSPITAL_DEBOARDED: 'text-rose-700 bg-rose-50 border-rose-200',
  HOSPITAL_SUSPENDED: 'text-amber-700 bg-amber-50 border-amber-200',
  DEBOARD_REQUESTED: 'text-amber-700 bg-amber-50 border-amber-200',
  HOSPITAL_APPROVED: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  HOSPITAL_REACTIVATED: 'text-emerald-700 bg-emerald-50 border-emerald-200',
};

export default function AuditView() {
  const { data, loading } = useApi('/api/admin/audit?limit=200');
  if (loading) return <SkeletonRows rows={6} />;

  const columns = [
    { key: 'createdAt', label: 'When', render: (r) => (
      <div><p className="text-slate-700">{shortDate(r.createdAt)}</p><p className="text-[10px] text-slate-400">{timeOf(r.createdAt)}</p></div>
    ) },
    { key: 'action', label: 'Action', render: (r) => (
      <span className={`text-[10px] font-bold px-2 py-1 rounded border ${TONE[r.action] || 'text-slate-600 bg-slate-50 border-slate-200'}`}>
        {r.action.replace(/_/g, ' ')}
      </span>
    ) },
    { key: 'actor', label: 'By', sortValue: (r) => r.actorId?.name, render: (r) => (
      <div><p className="font-semibold text-slate-800">{r.actorId?.name ?? 'System'}</p><p className="text-[10px] text-slate-400">{r.actorRole}</p></div>
    ) },
    { key: 'entityType', label: 'Entity' },
    { key: 'reason', label: 'Reason', sortable: false, render: (r) => (
      <span className="text-slate-600 text-[11px]">{r.reason || '—'}</span>
    ) },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Audit trail</h2>
        <p className="text-xs text-slate-500">Every lifecycle action, retained for two years</p>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <DataTable columns={columns} rows={data || []} exportName="mediigo-audit" pageSize={20} />
      </div>
    </div>
  );
}
