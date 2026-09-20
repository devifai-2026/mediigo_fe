import { useState } from 'react';
import { useConsole } from '../../context/AdminConsoleContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useConfirm } from '../../context/ConfirmContext.jsx';
import { api } from '../../lib/api.js';
import { AdminPageHeader } from '../../components/superadmin/AdminKpi.jsx';
import { inr } from '../../lib/format.js';

export default function MasterApprovalsView() {
  const { approvals, refetch } = useConsole();
  const toast = useToast();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(null);

  const approve = async (c) => {
    setBusy(c.id);
    try {
      const r = await api.post(`/api/admin/submissions/${c.id}/approve`);
      const temp = r.data?.data?.tempPassword;
      toast.success(temp ? `Approved — front desk temp password: ${temp}` : 'Clinic approved and published');
      refetch();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  };

  const reject = async (c) => {
    const ok = await confirm({
      title: 'Reject this submission?',
      message: `${c.clinicName} will be returned to ${c.agentName}.`,
      danger: true,
      confirmLabel: 'Reject submission',
    });
    if (!ok) return;
    setBusy(c.id);
    try {
      await api.post(`/api/admin/submissions/${c.id}/reject`, {
        reason: 'Rejected by Super Admin from the master approvals queue.',
      });
      toast.success('Submission rejected');
      refetch();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Master Authorizations Queue</h1>
        <p className="text-xs text-slate-500 font-medium">Unified approval center for field agent submissions and high-priority clinic onboarding requests.</p>
      </div>

      <div className="space-y-4">
        {approvals.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs font-medium">
            All pending onboarding requests have been authorized. System queue is clear!
          </div>
        ) : approvals.map((c) => (
          <div
            key={c.id}
            className="bg-white p-5 rounded-2xl shadow-sm border border-amber-200 border-l-4 border-l-amber-500 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Authorization Pending</span>
                <span className="text-xs text-slate-400">Agent: <strong className="text-slate-600">{c.agentName}</strong></span>
                <span className="text-slate-300">•</span>
                <span className="text-xs text-slate-400">
                  Exec Admin: <strong className="text-indigo-600">{c.execAdminName}</strong>
                </span>
                {c.districtName && c.districtName !== '—' && (
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                    {c.districtName}
                  </span>
                )}
              </div>
              <h4 className="font-bold text-slate-900 text-base">{c.clinicName} — {c.doctorName}</h4>
              <p className="text-xs text-slate-600">{c.specialty} • Licence: {c.regNo}</p>
              <p className="text-xs text-slate-500"><i className="fa-solid fa-location-dot mr-1" /> {c.address}</p>
              {c.hasGeocode ? (
                <div className="text-xs font-bold text-emerald-700 mt-1">
                  <i className="fa-solid fa-location-crosshairs mr-1" /> Location verified — ready to publish
                </div>
              ) : (
                <div className="text-xs font-bold text-rose-600 mt-1">
                  <i className="fa-solid fa-triangle-exclamation mr-1" /> No coordinates — cannot publish until geocoded
                </div>
              )}
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <button
                type="button"
                disabled={busy === c.id || !c.hasGeocode}
                onClick={() => approve(c)}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition disabled:opacity-50"
              >
                Approve Clinic
              </button>
              <button
                type="button"
                disabled={busy === c.id}
                onClick={() => reject(c)}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold text-xs rounded-xl transition disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
