import { useConsole } from '../../context/AdminConsoleContext.jsx';
import { inr } from '../../lib/format.js';
import clsx from 'clsx';

export default function FinancialAuditView() {
  const { clinics, metrics: m } = useConsole();

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Financial &amp; Cash Collection Audit</h1>
        <p className="text-xs text-slate-500 font-medium">Itemized cash collections breakdown across Fresh Consultations, Follow-Ups, and Emergency Services.</p>
      </div>

      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Consolidated Cash Audit Balance</p>
          <p className="text-4xl font-black text-amber-400">{inr(m.grandTotal)}</p>
          <p className="text-xs text-slate-300">Verified collections across all registered network clinics and field agents.</p>
        </div>
        <div className="grid grid-cols-3 gap-3 w-full md:w-auto text-center text-xs">
          <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
            <span className="text-slate-400 block text-[10px]">Fresh Consults</span>
            <span className="font-bold text-emerald-400 text-sm">{inr(m.freshTotal)}</span>
          </div>
          <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
            <span className="text-slate-400 block text-[10px]">Follow-Up Visits</span>
            <span className="font-bold text-blue-400 text-sm">{inr(m.followupTotal)}</span>
          </div>
          <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
            <span className="text-slate-400 block text-[10px]">Emergency Services</span>
            <span className="font-bold text-rose-400 text-sm">{inr(m.emergencyTotal)}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Clinic &amp; Doctor</th>
                <th className="py-3.5 px-4">Fresh Consult (₹)</th>
                <th className="py-3.5 px-4">Follow-Up (₹)</th>
                <th className="py-3.5 px-4">Emergency (₹)</th>
                <th className="py-3.5 px-4 text-right">Total Cash (₹)</th>
                <th className="py-3.5 px-4 text-center">Audit Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {clinics.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-bold text-slate-900">
                    {c.clinicName}
                    <span className="block text-[11px] font-normal text-slate-500">{c.doctorName}</span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-emerald-700">{inr(c.cashFresh)}</td>
                  <td className="py-3 px-4 font-semibold text-blue-700">{inr(c.cashFollowup)}</td>
                  <td className="py-3 px-4 font-semibold text-rose-700">{inr(c.cashEmergency)}</td>
                  <td className="py-3 px-4 text-right font-black text-slate-900">{inr(c.totalCash)}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={clsx(
                      'px-2 py-0.5 rounded text-[10px] font-bold',
                      c.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800',
                    )}>
                      {c.status === 'Approved' ? 'AUDITED' : 'PENDING'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="px-4 py-3 text-[11px] text-slate-400 border-t border-slate-100">
          Figures count completed consultations only — a token that was skipped or is still waiting is not counted as revenue.
        </p>
      </div>
    </section>
  );
}
