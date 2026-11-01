import { useState } from 'react';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../lib/api.js';
import { Button } from '../../components/ui/Button.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { Field, Textarea } from '../../components/ui/Field.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { SkeletonRows } from '../../components/ui/Skeleton.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { directionsUrl } from '../../lib/maps.js';
import { CredentialsModal } from '../../components/onboarding/CredentialsModal.jsx';
import { ApproveDialog } from '../../components/onboarding/ApproveDialog.jsx';
import { openPrivateDocument } from '../../lib/documents.js';
import { asList } from '../../lib/list.js';

const DOC_LABEL = { AADHAAR: 'Aadhaar', PAN: 'PAN', REG_CERT: 'Reg. certificate' };

export default function ApprovalsView() {
  const { data, loading, refetch } = useApi('/api/admin/approvals');
  const toast = useToast();
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState(null);

  const [approving, setApproving] = useState(null);

  const approve = async ({ trialDays, password }) => {
    setBusy(true);
    try {
      const r = await api.post(`/api/admin/submissions/${approving._id}/approve`, { trialDays, ...(password ? { password } : {}) });
      const trialNote = trialDays > 0 ? ` · ${trialDays}-day free trial` : ' · no trial';
      toast.success(`Approved and published${trialNote}`);
      setApproving(null);
      // Every login it created, with the one-time passwords to hand over.
      if (r.data?.data?.credentials?.length) setIssued(r.data.data);
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
            <div key={s._id} className="p-5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-slate-900 text-sm">{s.payload?.name}</span>
                  <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md">{s.payload?.code}</span>
                  <span className="text-[10px] font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md border border-purple-200">
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
                    Located · {s.geocodeResult.accuracy === 'MAP_PIN' ? 'pinned on map by the agent' : (s.geocodeResult.accuracy || 'verified')}
                    <a href={directionsUrl(s.geocodeResult)} target="_blank" rel="noreferrer" className="ml-1.5 font-medium text-mg-teal hover:underline">
                      Check on map →
                    </a>
                  </p>
                ) : (
                  <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1">
                    <Icon name="alert" className="w-3 h-3" />
                    No coordinates — cannot publish until the address is geocoded
                  </p>
                )}
                {s.payload?.photos?.length > 0 && (
                  <div className="flex gap-1.5 overflow-x-auto pt-1">
                    {s.payload.photos.map((ph) => (
                      <a key={ph.url} href={ph.url} target="_blank" rel="noreferrer" title={ph.kind === 'INSIDE' ? 'Inside' : 'Outside'}>
                        <img src={ph.url} alt="" className="w-16 h-12 object-cover rounded-md border border-slate-200 shrink-0" />
                      </a>
                    ))}
                  </div>
                )}
                {/* Each doctor's papers, to check before publishing. */}
                {asList(s.payload?.doctors).length > 0 && (
                  <ul className="pt-2 space-y-1">
                    {asList(s.payload.doctors).map((d) => (
                      <li key={d.phone || d.councilRegNo} className="text-[11px] text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="font-semibold text-slate-800">{d.name}</span>
                        <span className="text-slate-400">{d.councilRegNo}</span>
                        {asList(d.documents).length ? asList(d.documents).map((doc) => (
                          <button
                            key={doc.type}
                            type="button"
                            onClick={() => openPrivateDocument(`/api/onboarding/documents/file?path=${encodeURIComponent(doc.objectPath)}`).catch((e) => toast.error(e.message))}
                            className="inline-flex items-center gap-1 font-semibold text-mg-blue hover:underline"
                          >
                            <i className="fa-solid fa-file-image" aria-hidden="true" />{DOC_LABEL[doc.type] ?? doc.type}
                          </button>
                        )) : <span className="text-amber-700 font-semibold">No documents</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button variant="outline" onClick={() => { setRejecting(s); setReason(''); }} className="text-rose-600 hover:bg-rose-50">
                  Reject
                </Button>
                <Button onClick={() => setApproving(s)} loading={busy && approving?._id === s._id} disabled={!s.geocodeResult?.lat}>
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
      <ApproveDialog submission={approving} busy={busy} onCancel={() => setApproving(null)} onApprove={approve} />
      <CredentialsModal result={issued} onClose={() => setIssued(null)} />
    </div>
  );
}
