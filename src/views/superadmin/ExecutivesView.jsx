import { useConsole } from '../../context/AdminConsoleContext.jsx';
import { AdminPageHeader } from '../../components/superadmin/AdminKpi.jsx';

export default function ExecutivesView() {
  const { executives } = useConsole();

  return (
    <section className="space-y-6">
      <AdminPageHeader
        title="Executive Managers Governance"
        subtitle="Corporate operations personnel, regional cluster control, and corporate onboarding oversight."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {executives.map((e) => (
          <div key={e.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-start space-x-4">
            <div className="flex items-start space-x-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center text-lg shadow-sm">
                <i className="fa-solid fa-user-shield" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 text-sm">{e.name}</h4>
                <p className="text-xs font-semibold text-indigo-600">{e.role}</p>
                <p className="text-[11px] text-slate-500"><i className="fa-solid fa-map-pin mr-1" /> Scope: {e.territory}</p>
                <p className="text-[11px] text-slate-500"><i className="fa-solid fa-envelope mr-1" /> {e.email}</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">{e.status}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
