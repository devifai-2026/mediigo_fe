import { useState } from 'react';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useConfirm } from '../../context/ConfirmContext.jsx';
import { api } from '../../lib/api.js';
import { Button } from '../../components/ui/Button.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { Field, Textarea } from '../../components/ui/Field.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { SkeletonRows } from '../../components/ui/Skeleton.jsx';
import { Icon } from '../../components/ui/Icon.jsx';

export default function ApprovalsView() {
  const { data, loading, refetch } = useApi('/api/admin/approvals');
  const toast = useToast();
  const confirm = useConfirm();
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const approve = async (s) => {
    const okToApprove = await confirm({
      title: 'Approve and publish?',
      message: `${s.payload?.name} will go live and become visible to patients searching nearby.`,
      detail: 'A front-desk login is created for the listed contact.',
      confirmLabel: 'Approve & publish',
    });
    if (!okToApprove) return;
    setBusy(true);
    try {
      const r = await api.post(`/api/admin/submissions/${s._id}/approve`);
      const temp = r.data?.data?.tempPassword;
      toast.success(temp ? `Approved — front desk temp password: ${temp}` : 'Approved and published');
      refetch();
    } catch (e) {
      toast.error(e.message);
    } finally { setBusy(false); }
  };

  const reject = async () => {
    setBusy(true);
    try {
      await api.post(`/api/admin/submissions/${rejecting._id}/reject`, { reason });
      toast.success('Submission rejected — the agent has been notified');
      setRejecting(null); setReason(''); refetch();
    } catch (e) {
      toast.error(e.message);
    } finally { setBusy(false); }
  };

  if (loading) return <SkeletonRows rows={3} />;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Pending approvals</h2>
        <p className="text-xs text-slate-500">Verify licence numbers and the map location before publishing</p>
      </div>

      {!data?.length ? (
        <EmptyState icon="check" title="All caught up" hint="No submissions are waiting for review." />
      ) : (
        <div className="space-y-4">
          {data.map((s) => (
            <div key={s._id} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-slate-900 text-sm">{s.payload?.name}</span>
                  <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">{s.payload?.code}</span>
                  <span className="text-[10px] font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200">
                    Licence {s.payload?.licenseNumber}
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-800">
                  {s.payload?.address?.line1}
                  <span className="text-slate-500 font-normal"> · {s.payload?.address?.city} {s.payload?.address?.pincode}</span>
                </p>
                <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                  <span>Agent: <strong className="text-teal-700">{s.agentId?.name}</strong></span>
                  <span>Contact: <strong className="text-slate-800">{s.payload?.primaryContact?.name} · {s.payload?.primaryContact?.phone}</strong></span>
                </div>
                {s.geocodeResult?.lat ? (
                  <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                    <Icon name="location" className="w-3 h-3" />
                    Located · {s.geocodeResult.accuracy || 'verified'}
                  </p>
                ) : (
                  <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1">
                    <Icon name="alert" className="w-3 h-3" />
                    No coordinates — cannot publish until the address is geocoded
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button variant="outline" onClick={() => { setRejecting(s); setReason(''); }} className="text-rose-600 hover:bg-rose-50">
                  Reject
                </Button>
                <Button onClick={() => approve(s)} loading={busy} disabled={!s.geocodeResult?.lat}>
                  Approve &amp; publish
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={Boolean(rejecting)} onClose={() => setRejecting(null)} title="Reject this submission" size="sm">
        <div className="space-y-4">
          <p className="text-xs text-slate-600">{rejecting?.payload?.name} will be returned to {rejecting?.agentId?.name}.</p>
          <Field label="Reason" required hint="At least 10 characters — this is a permanent audit record">
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Licence number could not be verified with the council registry." />
          </Field>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setRejecting(null)}>Cancel</Button>
            <Button variant="danger" onClick={reject} loading={busy} disabled={reason.trim().length < 10}>
              Reject submission
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
