import { Link } from 'react-router-dom';
import { useConsole } from '../../context/AdminConsoleContext.jsx';
import { AdminKpi, AdminPageHeader } from '../../components/superadmin/AdminKpi.jsx';
import {
  OnboardingTrendChart, RevenueBreakdownChart, AgentPerformanceChart, SpecialtyDistributionChart,
} from '../../components/superadmin/AdminCharts.jsx';
import { inr } from '../../lib/format.js';

export default function SuperDashboardView() {
  const { metrics: m, charts, agents, clinics, refetch, loading } = useConsole();

  return (
    <section className="space-y-6">
      <AdminPageHeader
        title="Executive Command & Analytics"
        subtitle="Real-time cross-platform metrics combining Executive Operations, Field Agent Onboardings, and Clinic OPD Collections."
      >
        <select
          className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 shadow-sm outline-none focus:border-indigo-600"
          defaultValue="all"
        >
          <option value="all">All-Time Cumulative</option>
          <option value="today">Today&apos;s Performance</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>
        <button
          type="button"
          onClick={refetch}
          className="p-2 bg-white border border-slate-300 rounded-xl text-slate-600 hover:text-indigo-600 shadow-sm"
          title="Refresh Live Data"
        >
          <i className={`fa-solid fa-rotate text-xs ${loading ? 'animate-spin' : ''}`} />
        </button>
      </AdminPageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminKpi
          label="Total Clinics Network" value={m.totalClinics} icon="fa-hospital" accent="indigo"
          footer={<><span className="font-bold text-emerald-600">{m.approved}</span> Approved Active</>}
        />
        <AdminKpi
          label="Total Network Revenue" value={inr(m.grandTotal)} icon="fa-indian-rupee-sign" accent="emerald"
          footer="Combined OPD & Onboarding Collections"
        />
        <AdminKpi
          label="Online OPD System Ratio" value={`${m.onlineRatio}%`} icon="fa-signal" accent="teal"
          footer={<><span className="font-bold text-teal-600">{m.online}</span> Online vs <span className="font-bold text-slate-600">{m.offline}</span> Offline</>}
        />
        <AdminKpi
          label="Pending Approvals Queue" value={m.pendingApprovals} icon="fa-clock-rotate-left" accent="amber"
          footer={<span className="text-amber-700 font-medium">Requires Corporate Verification</span>}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Clinic Onboarding Velocity &amp; Revenue Growth</h3>
              <p className="text-xs text-slate-500">Cumulative weekly onboarding trend and revenue growth trajectory.</p>
            </div>
            <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full">Real-time Analytics</span>
          </div>
          <div className="h-64">
            <OnboardingTrendChart labels={charts.labels} onboarded={charts.onboarded} revenueHundreds={charts.revenueHundreds} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Collections Breakdown</h3>
            <p className="text-xs text-slate-500">Fresh Consult, Follow-Up, and Emergency collections distribution.</p>
          </div>
          <div className="h-64 flex items-center justify-center">
            <RevenueBreakdownChart fresh={m.freshTotal} followup={m.followupTotal} emergency={m.emergencyTotal} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-900 text-sm">
              <i className="fa-solid fa-trophy text-amber-500 mr-2" />Field Agent Performance Leaderboard
            </h3>
            <Link to="/super/agents" className="text-xs font-bold text-indigo-600 hover:underline">View All Agents</Link>
          </div>
          <div className="h-56">
            <AgentPerformanceChart agents={agents} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-900 text-sm">
              <i className="fa-solid fa-map-location-dot text-teal-600 mr-2" />Clinic Specialty &amp; Zone Distribution
            </h3>
            <span className="text-xs text-slate-400">Across all districts</span>
          </div>
          <div className="h-56 flex items-center justify-center">
            <SpecialtyDistributionChart clinics={clinics} />
          </div>
        </div>
      </div>
    </section>
  );
}
