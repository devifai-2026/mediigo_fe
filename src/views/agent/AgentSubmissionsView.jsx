import { useApi } from '../../hooks/useApi.js';
import { StatusBadge } from '../../components/ui/StatusBadge.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { SkeletonRows } from '../../components/ui/Skeleton.jsx';
import { shortDate } from '../../lib/format.js';

/**
 * My submissions. The server scopes this to the signed-in agent — the prototype
 * showed every clinic in the network here, including other agents' work.
 */
export default function AgentSubmissionsView() {
  const { data, loading } = useApi('/api/onboarding/submissions');

  if (loading) return <SkeletonRows rows={3} />;
  if (!data?.length) {
    return <EmptyState icon="doc" title="No submissions yet" hint="Clinics you onboard will appear here with their approval status." />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900">My submissions</h2>
        <p className="text-xs text-slate-500">{data.length} clinic{data.length === 1 ? '' : 's'} submitted by you</p>
      </div>

      <div className="space-y-3">
        {data.map((s) => (
          <div key={s._id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-slate-900 text-sm">{s.payload?.name}</p>
                <p className="text-[11px] text-slate-500">
                  {s.payload?.code} · {s.payload?.address?.city} {s.payload?.address?.pincode}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Submitted {shortDate(s.createdAt)}</p>
              </div>
              <StatusBadge status={s.status} />
            </div>
            {s.rejectionReason && (
              <p className="mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-700">
                <strong>Rejected:</strong> {s.rejectionReason}
              </p>
            )}
            {s.geocodeResult?.lat && (
              <p className="mt-2 text-[10px] text-slate-400">
                Located at {s.geocodeResult.lat.toFixed(4)}, {s.geocodeResult.lng.toFixed(4)}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
