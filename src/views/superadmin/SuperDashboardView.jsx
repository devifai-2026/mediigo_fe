import { useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { useConsole } from '../../context/AdminConsoleContext.jsx';
import { useApi } from '../../hooks/useApi.js';
import { AdminKpi, AdminPageHeader } from '../../components/superadmin/AdminKpi.jsx';
import {
  OnboardingTrendChart, RevenueBreakdownChart, AgentPerformanceChart, SpecialtyDistributionChart,
} from '../../components/superadmin/AdminCharts.jsx';
import { DeskCard, Pill, Segmented, SectionHead, EmptyNote } from '../../components/desk/ui.jsx';
import { DateRangePicker, PRESETS, isoToday, presetOf, rangeLabel } from '../../components/desk/DateRangePicker.jsx';
import { inr } from '../../lib/format.js';

const QUICK = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: '7 Days' },
  { value: 'month', label: '30 Days' },
];

const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);
const bucketLabel = (label, bucket) => (bucket === 'month'
  ? new Date(`${label}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
  : new Date(`${label}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }));

function Meter({ label, value, max, display, tone = 'bg-mg-blue' }) {
  return (
    <div>
      <div className="flex justify-between gap-3 text-xs mb-1">
        <span className="text-slate-700 font-medium">{label}</span>
        <span className="text-slate-900 font-medium">{display}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={clsx('h-full rounded-full', tone)} style={{ width: `${max > 0 ? Math.max(value > 0 ? 2 : 0, (value / max) * 100) : 0}%` }} />
      </div>
    </div>
  );
}

export default function SuperDashboardView() {
  const { metrics: m, charts, agents, clinics, refetch, loading, live } = useConsole();
  const [range, setRange] = useState(() => ({ from: isoToday(), to: isoToday() }));
  const { data: net, loading: netLoading, refetch: refetchNet } = useApi(`/api/superadmin/network?from=${range.from}&to=${range.to}`);
  const when = rangeLabel(range);
  const t = net?.totals;

  const refreshAll = () => { refetch(); refetchNet(); };

  return (
    <section className="space-y-6">
      <AdminPageHeader
        icon="fa-chart-line"
        title="Executive Command & Analytics"
        subtitle="Network-wide OPD collections, patient footfall and clinic performance — for any day or range."
      >
        <Segmented
          value={presetOf(range) ?? ''}
          onChange={(k) => setRange(PRESETS.find((p) => p.key === k).range(isoToday()))}
          options={QUICK}
        />
        <DateRangePicker value={range} onChange={setRange} />
        <button
          type="button"
          onClick={refreshAll}
          className="w-9 h-9 grid place-items-center bg-white border border-slate-200 rounded-md text-slate-500 hover:text-mg-blue"
          title="Refresh live data"
          aria-label="Refresh"
        >
          <i className={`fa-solid fa-rotate text-xs ${loading || netLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
        </button>
      </AdminPageHeader>

      {/* ---- Performance over the chosen dates ---- */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <AdminKpi accent="navy" label="Network Revenue" value={inr(t?.revenue ?? 0)} icon="fa-indian-rupee-sign" footer={`${t?.receipts ?? 0} receipts · ${when}`} />
        <AdminKpi accent="teal" label="Patients Seen" value={t?.completed ?? 0} icon="fa-user-check" footer={`of ${t?.booked ?? 0} booked (${pct(t?.completed, t?.booked)}%)`} />
        <AdminKpi accent="indigo" label="Unique Patients" value={t?.uniquePatients ?? 0} icon="fa-hospital-user" footer={`${pct(t?.walkin, (t?.walkin ?? 0) + (t?.online ?? 0))}% walk-in · ${t?.online ?? 0} online`} />
        <AdminKpi accent="emeraldSlate" label="Avg Ticket" value={inr(t?.avgTicket ?? 0)} icon="fa-receipt" footer="Per paid consultation" />
        <AdminKpi accent="indigoSlate" label="Prescriptions Issued" value={t?.prescriptions ?? 0} icon="fa-file-prescription" footer={`${pct(t?.prescriptions, t?.completed)}% of seen patients`} />
        <AdminKpi accent="rose" label="Petty Cash Out" value={inr(t?.pettyCash ?? 0)} icon="fa-money-bill-transfer" footer={`${t?.pettyCount ?? 0} entr${t?.pettyCount === 1 ? 'y' : 'ies'} across clinics`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DeskCard className="lg:col-span-2 p-5 space-y-4">
          <SectionHead
            title={net?.days > 1 ? `Revenue & Patients per ${net?.bucket === 'month' ? 'Month' : 'Day'}` : 'Payment Channels'}
            subtitle={net?.days > 1 ? `Collections and patients seen · ${when}` : `How patients paid · ${when}`}
            right={<Pill tone="blue">{t?.clinicsWithActivity ?? 0} of {t?.activeClinics ?? 0} clinics active</Pill>}
          />
          {!net ? <div className="h-48 rounded-lg bg-slate-50 animate-pulse" /> : net.days > 1 ? (
            net.series.length ? (
              <div className="space-y-2.5 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                {net.series.map((r) => (
                  <div key={r.label} className="grid grid-cols-[64px_1fr_1fr] gap-3 items-center text-xs">
                    <span className="text-slate-500">{bucketLabel(r.label, net.bucket)}</span>
                    <Meter label="" value={r.revenue} max={Math.max(...net.series.map((x) => x.revenue))} display={inr(r.revenue)} />
                    <Meter label="" value={r.completed} max={Math.max(...net.series.map((x) => x.booked))} display={`${r.completed} / ${r.booked} seen`} tone="bg-mg-teal" />
                  </div>
                ))}
              </div>
            ) : <EmptyNote icon="fa-chart-column" title={`No activity · ${when}`} />
          ) : (
            <div className="space-y-3">
              <Meter label="Cash" value={t.cash} max={t.revenue} display={`${inr(t.cash)} (${pct(t.cash, t.revenue)}%)`} tone="bg-emerald-500" />
              <Meter label="UPI / QR" value={t.upi} max={t.revenue} display={`${inr(t.upi)} (${pct(t.upi, t.revenue)}%)`} tone="bg-mg-teal" />
              <Meter label="Card" value={t.card} max={t.revenue} display={`${inr(t.card)} (${pct(t.card, t.revenue)}%)`} />
              <div className="grid grid-cols-3 gap-2 pt-2">
                {['fresh', 'followup', 'emergency'].map((k) => {
                  const v = net.byVisitType.find((x) => x.visitType === k);
                  return (
                    <div key={k} className="rounded-lg bg-mg-surface p-3">
                      <p className="text-[10px] uppercase text-slate-500">{k === 'followup' ? 'Follow-up' : k}</p>
                      <p className={clsx('text-base font-semibold', k === 'emergency' ? 'text-rose-600' : k === 'followup' ? 'text-mg-teal' : 'text-mg-blue')}>{inr(v?.total ?? 0)}</p>
                      <p className="text-[10px] text-slate-400">{v?.count ?? 0} visits</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </DeskCard>

        <DeskCard className="p-5 space-y-4">
          <SectionHead
            title="Live OPD Right Now"
            subtitle="Across every active clinic"
            right={<Link to="/super/live" className="text-xs font-medium text-mg-blue hover:underline">Open monitor</Link>}
          />
          {!live ? <div className="h-40 rounded-lg bg-slate-50 animate-pulse" /> : (
            <>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  ['Consulting', live.totals.consulting, 'text-mg-teal', 'fa-user-doctor'],
                  ['Patients waiting', live.totals.patientsWaiting, 'text-amber-600', 'fa-user-clock'],
                  ['On break', live.totals.onBreak, 'text-amber-600', 'fa-mug-hot'],
                  ['Seen today', live.totals.patientsSeen, 'text-emerald-600', 'fa-circle-check'],
                ].map(([label, v, tone, icon]) => (
                  <div key={label} className="rounded-lg bg-mg-surface p-3">
                    <p className="text-[10px] uppercase text-slate-500"><i className={clsx('fa-solid mr-1', icon, tone)} aria-hidden="true" />{label}</p>
                    <p className={clsx('text-xl font-semibold', tone)}>{v}</p>
                  </div>
                ))}
              </div>
              {live.totals.emergencyWaiting > 0 && (
                <p className="text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                  <i className="fa-solid fa-truck-medical mr-1.5" aria-hidden="true" />
                  {live.totals.emergencyWaiting} emergency patient{live.totals.emergencyWaiting === 1 ? '' : 's'} waiting
                </p>
              )}
              <p className="text-[11px] text-slate-400">
                {live.totals.doctors} doctors on the network · {live.totals.closed} with bookings closed · updates every 30s
              </p>
            </>
          )}
        </DeskCard>
      </div>

      <DeskCard className="overflow-hidden">
        <div className="p-5 border-b border-slate-200">
          <SectionHead
            title="Clinic Performance League"
            subtitle={`Ranked by revenue · ${when}`}
            right={<Link to="/super/financials" className="text-xs font-medium text-mg-blue hover:underline">Full financial audit</Link>}
          />
        </div>
        {!net ? <div className="h-40 animate-pulse bg-slate-50" /> : !net.byClinic.length ? (
          <EmptyNote icon="fa-hospital" title="No clinics yet" />
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="bg-mg-surface/70 border-b border-slate-200 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3 px-5 w-10">#</th>
                  <th className="py-3 px-4">Clinic</th>
                  <th className="py-3 px-4 text-right">Revenue</th>
                  <th className="py-3 px-4">Share</th>
                  <th className="py-3 px-4 text-right">Seen / Booked</th>
                  <th className="py-3 px-4 text-right">Rx issued</th>
                  <th className="py-3 px-5 text-right">Walk-in</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {net.byClinic.slice(0, 10).map((c, i) => (
                  <tr key={c.hospitalId} className="hover:bg-slate-50/70">
                    <td className="py-3 px-5 font-semibold text-slate-400">{i + 1}</td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-900">{c.name}</p>
                      <p className="text-[11px] text-slate-400">{[c.city, c.district].filter((x) => x && x !== '—').join(' · ')}</p>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-mg-blue">{inr(c.revenue)}</td>
                    <td className="py-3 px-4 w-40">
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-mg-teal rounded-full" style={{ width: `${pct(c.revenue, t.revenue)}%` }} />
                      </div>
                      <span className="text-[10px] text-slate-400">{pct(c.revenue, t.revenue)}%</span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700">{c.completed} / {c.booked}</td>
                    <td className="py-3 px-4 text-right text-slate-700">{c.prescriptions}</td>
                    <td className="py-3 px-5 text-right text-slate-500">{pct(c.walkin, c.walkin + c.online)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DeskCard>

      {/* ---- Network structure (not date-bound) ---- */}
      <div className="pt-2">
        <SectionHead title="Network Structure" subtitle="Clinics, onboarding and coverage — cumulative, not affected by the dates above" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminKpi
          label="Total Clinics Network" value={m.totalClinics} icon="fa-hospital" accent="indigo"
          footer={<><span className="font-semibold text-emerald-600">{m.approved}</span> approved &amp; active</>}
        />
        <AdminKpi
          label="All-Time Revenue" value={inr(m.grandTotal)} icon="fa-vault" accent="emerald"
          footer="Completed consultations, since launch"
        />
        <AdminKpi
          label="Online OPD Ratio" value={`${m.onlineRatio}%`} icon="fa-signal" accent="teal"
          footer={<><span className="font-semibold text-mg-teal">{m.online}</span> online vs <span className="font-semibold text-slate-600">{m.offline}</span> offline</>}
        />
        <AdminKpi
          label="Pending Approvals" value={m.pendingApprovals} icon="fa-clock-rotate-left" accent="amber"
          footer={<Link to="/super/approvals" className="text-amber-700 font-medium hover:underline">Review the queue</Link>}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DeskCard className="lg:col-span-2 p-5 space-y-4">
          <SectionHead
            title="Clinic Onboarding Velocity & Revenue Growth"
            subtitle="Weekly onboarding trend and revenue trajectory"
            right={<Pill tone="blue">Last 7 days</Pill>}
          />
          <div className="h-64">
            <OnboardingTrendChart labels={charts.labels} onboarded={charts.onboarded} revenueHundreds={charts.revenueHundreds} />
          </div>
        </DeskCard>

        <DeskCard className="p-5 space-y-4">
          <SectionHead title="Collections Breakdown" subtitle="Fresh, follow-up and emergency — all time" />
          <div className="h-64 flex items-center justify-center">
            <RevenueBreakdownChart fresh={m.freshTotal} followup={m.followupTotal} emergency={m.emergencyTotal} />
          </div>
        </DeskCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DeskCard className="p-5 space-y-4">
          <SectionHead
            icon="fa-trophy"
            title="Field Agent Performance Leaderboard"
            right={<Link to="/super/agents" className="text-xs font-medium text-mg-blue hover:underline">View all agents</Link>}
          />
          <div className="h-56">
            <AgentPerformanceChart agents={agents} />
          </div>
        </DeskCard>

        <DeskCard className="p-5 space-y-4">
          <SectionHead icon="fa-map-location-dot" title="Clinic Specialty & Zone Distribution" right={<span className="text-xs text-slate-400">Across all districts</span>} />
          <div className="h-56 flex items-center justify-center">
            <SpecialtyDistributionChart clinics={clinics} />
          </div>
        </DeskCard>
      </div>
    </section>
  );
}
