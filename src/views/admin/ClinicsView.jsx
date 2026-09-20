import { useState } from 'react';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useConfirm } from '../../context/ConfirmContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../lib/api.js';
import { DataTable } from '../../components/ui/DataTable.jsx';
import { StatusBadge } from '../../components/ui/StatusBadge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { Field, Textarea, Input } from '../../components/ui/Field.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { SkeletonRows } from '../../components/ui/Skeleton.jsx';
import { FilterPills } from '../../components/ui/FilterPills.jsx';
import { NETWORK_STATE, ROLES } from '../../lib/constants.js';

export default function ClinicsView() {
  const { data, loading, refetch } = useApi('/api/admin/hospitals');
  const { role } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [filter, setFilter] = useState('ALL');
  const [action, setAction] = useState(null); // {type, hospital}
  const [reason, setReason] = useState('');
  const [typedName, setTypedName] = useState('');
  const [busy, setBusy] = useState(false);
  const [inFlight, setInFlight] = useState(null);

  const rows = (data || []).filter((h) => filter === 'ALL' || h.networkState === filter);

  const open = (type, hospital) => { setAction({ type, hospital }); setReason(''); setTypedName(''); setInFlight(null); };

  const run = async (force = false) => {
    setBusy(true);
    const { type, hospital } = action;
    try {
      if (type === 'suspend') {
        await api.post(`/api/admin/hospitals/${hospital._id}/suspend`, { reason });
        toast.success(`${hospital.name} suspended — new bookings stopped, today's queue will drain`);
      } else if (type === 'reactivate') {
        await api.post(`/api/admin/hospitals/${hospital._id}/reactivate`);
        toast.success(`${hospital.name} reactivated — doctors must reopen bookings themselves`);
      } else if (type === 'deboard') {
        const r = await api.post(`/api/admin/hospitals/${hospital._id}/deboard`, { reason, force });
        if (r.data?.data?.requiresSuperAdmin) {
          toast.warn('Deboard requested — a Super Admin must confirm this permanently');
        } else {
          const i = r.data?.data?.impact;
          toast.success(`${hospital.name} deboarded · ${i.tokensSkipped} tokens released, ${i.standeesReclaimed} standees reclaimed`);
        }
      }
      setAction(null);
      refetch();
    } catch (e) {
      // The guard you specified: refuse while patients are still in the queue,
      // and tell the admin exactly how many.
      if (e.code === 'IN_FLIGHT_TOKENS') {
        setInFlight(e.details);
      } else {
        toast.error(e.message);
      }
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <SkeletonRows rows={5} />;

  const columns = [
    { key: 'name', label: 'Clinic', render: (h) => (
      <div><p className="font-bold text-slate-900">{h.name}</p><p className="text-[10px] text-slate-400">{h.code}</p></div>
    ) },
    { key: 'city', label: 'Location', sortValue: (h) => h.address?.city, render: (h) => (
      <div><p className="text-slate-700">{h.address?.city}</p><p className="text-[10px] text-slate-400">PIN {h.address?.pincode}</p></div>
    ) },
    { key: 'licenseNumber', label: 'Licence' },
    { key: 'subscriptionPlan', label: 'Plan', align: 'center' },
    { key: 'networkState', label: 'Status', align: 'center', render: (h) => <StatusBadge status={h.networkState} className="mx-auto" /> },
    { key: 'actions', label: '', align: 'right', sortable: false, render: (h) => (
      <div className="flex gap-1.5 justify-end">
        {h.networkState === NETWORK_STATE.ACTIVE && (
          <Button size="sm" variant="outline" onClick={() => open('suspend', h)}>Suspend</Button>
        )}
        {h.networkState === NETWORK_STATE.SUSPENDED && (
          <Button size="sm" variant="secondary" onClick={() => open('reactivate', h)}>Reactivate</Button>
        )}
        {h.networkState !== NETWORK_STATE.DEBOARDED && (
          <Button size="sm" variant="outline" className="text-rose-600 hover:bg-rose-50" onClick={() => open('deboard', h)}>
            Deboard
          </Button>
        )}
      </div>
    ) },
  ];

  const a = action;
  const canDeboard = reason.trim().length >= 10 && typedName.trim() === a?.hospital?.name;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Clinics</h2>
          <p className="text-xs text-slate-500">{data?.length ?? 0} in your district</p>
        </div>
        <FilterPills
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'ALL', label: 'All' },
            { value: NETWORK_STATE.ACTIVE, label: 'Active' },
            { value: NETWORK_STATE.SUSPENDED, label: 'Suspended' },
            { value: NETWORK_STATE.PENDING_APPROVAL, label: 'Pending' },
            { value: NETWORK_STATE.DEBOARDED, label: 'Deboarded' },
          ]}
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <DataTable columns={columns} rows={rows} exportName="mediigo-clinics" />
      </div>

      <Modal
        open={Boolean(a)}
        onClose={() => setAction(null)}
        title={a?.type === 'suspend' ? 'Suspend this clinic' : a?.type === 'reactivate' ? 'Reactivate this clinic' : 'Deboard permanently'}
        subtitle={a?.hospital?.name}
        size="md"
      >
        {a?.type === 'reactivate' ? (
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              {a.hospital.name} will become visible to patients again. Doctors must reopen their own bookings —
              we do not do that automatically, since a doctor who is not in the building would start selling tokens for an empty chamber.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setAction(null)}>Cancel</Button>
              <Button onClick={() => run()} loading={busy}>Reactivate</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {a?.type === 'suspend' ? (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
                Suspension is reversible. New bookings stop immediately and the clinic disappears from patient search,
                but today's queue is left alone so the patients already in the waiting room can be seen.
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-700 space-y-1">
                <p><strong>This cannot be undone.</strong> Deboarding will:</p>
                <ul className="list-disc list-inside space-y-0.5 ml-1">
                  <li>Release every token still in today's queue</li>
                  <li>Reclaim all deployed QR standees for reuse</li>
                  <li>Deactivate every doctor and front-desk login at this clinic</li>
                </ul>
                <p className="pt-1">Paid tokens are listed for manual refund — no money is reversed automatically.</p>
              </div>
            )}

            {inFlight && (
              <div className="p-3 rounded-xl bg-amber-100 border border-amber-300 text-xs text-amber-900">
                <p className="font-bold flex items-center gap-1.5">
                  <Icon name="alert" className="w-4 h-4" />
                  {inFlight.inFlightTokens} patient{inFlight.inFlightTokens === 1 ? ' is' : 's are'} still in today's queue
                </p>
                <p className="mt-1 text-[11px]">
                  Tokens {inFlight.tokenNumbers?.join(', ')}. Deboarding now will release them.
                </p>
              </div>
            )}

            <Field label="Reason" required hint="At least 10 characters — this is a permanent audit record">
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Clinic has closed permanently and returned its equipment." />
            </Field>

            {a?.type === 'deboard' && (
              <Field label={`Type "${a.hospital.name}" to confirm`} required>
                <Input value={typedName} onChange={(e) => setTypedName(e.target.value)} placeholder={a.hospital.name} />
              </Field>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setAction(null)}>Cancel</Button>
              {a?.type === 'suspend' ? (
                <Button variant="warn" onClick={() => run()} loading={busy} disabled={reason.trim().length < 10}>
                  Suspend clinic
                </Button>
              ) : (
                <Button variant="danger" onClick={() => run(Boolean(inFlight))} loading={busy} disabled={!canDeboard}>
                  {inFlight ? 'Deboard anyway' : role === ROLES.SUPER_ADMIN ? 'Deboard permanently' : 'Request deboard'}
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
