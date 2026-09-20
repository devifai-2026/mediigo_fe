import { useConsole } from '../../context/AdminConsoleContext.jsx';
import { AdminPageHeader } from '../../components/superadmin/AdminKpi.jsx';
import { useConsoleActions } from '../../components/superadmin/consoleActions.js';
import { inr } from '../../lib/format.js';
import clsx from 'clsx';

export default function AgentsView() {
  const { agents } = useConsole();
  const { openAddAgent } = useConsoleActions();

  return (
    <section className="space-y-6">
      <AdminPageHeader
        title="Field Agents Command & Tracking"
        subtitle="Monitor field activity, assigned territories, onboarding productivity, and cash collection logs."
      >
        <button
          type="button"
          onClick={openAddAgent}
          className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md flex items-center gap-2"
        >
          <i className="fa-solid fa-user-plus" /> Register Field Agent
        </button>
      </AdminPageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {agents.map((a) => (
          <div key={a.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 font-black flex items-center justify-center">
                  <i className="fa-solid fa-user-tie" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{a.name}</h4>
                  <p className="text-[11px] text-slate-500">{a.cluster} • Badge: <strong>{a.phone}</strong></p>
                </div>
              </div>
              <span className={clsx(
                'px-2.5 py-1 rounded-full text-[10px] font-bold',
                a.status === 'Active Duty' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800',
              )}>
                {a.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px]">Onboarded Clinics</span>
                <span className="font-black text-slate-900 text-base">{a.totalOnboarded}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px]">Total Cash Logged</span>
                <span className="font-black text-emerald-700 text-base">{inr(a.cashCollected)}</span>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-bold text-slate-700 mb-1.5">Assigned Network Clinics:</p>
              <div className="space-y-1.5 max-h-28 overflow-y-auto custom-scrollbar">
                {a.clinics.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">No assigned clinics yet.</p>
                ) : a.clinics.map((c, i) => (
                  <div key={i} className="text-[11px] p-2 bg-slate-50 rounded-lg flex justify-between items-center border border-slate-100">
                    <span className="font-medium text-slate-800 truncate">{c.clinicName}</span>
                    <span className="font-bold text-emerald-700">{inr(c.totalCash)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
