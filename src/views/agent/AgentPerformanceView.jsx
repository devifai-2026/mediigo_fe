import { useState } from 'react';
import clsx from 'clsx';
import { useApi } from '../../hooks/useApi.js';
import { inr } from '../../lib/format.js';
import { DeskCard, EmptyNote, PageHeader, Pill, SectionHead, StatTile } from '../../components/desk/ui.jsx';
import { OUTCOMES } from '../../components/agent/LeadModals.jsx';
import { span, hoursLabel } from './approvalStatus.js';

const thisMonth = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date()).slice(0, 7);
const shiftMonth = (m, d) => {
  const [y, mo] = m.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1 + d, 1)).toISOString().slice(0, 7);
};
const monthName = (m, short = false) => new Date(`${m}-01T00:00:00`).toLocaleDateString('en-IN', short ? { month: 'short' } : { month: 'long', year: 'numeric' });

function FunnelRow({ label, value, max, tone, note }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-700 font-medium">{label}</span>
        <span className="text-slate-900 font-medium">{value}{note && <span className="text-slate-400 font-normal"> · {note}</span>}</span>
      </div>
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={clsx('h-full rounded-full', tone)} style={{ width: `${max ? Math.max(value ? 3 : 0, (value / max) * 100) : 0}%` }} />
      </div>
    </div>
  );
}

/**
 * A field agent's month: clinics onboarded and approved, how long approval
 * took, the field work behind it, and what those clinics have done since.
 */
export default function AgentPerformanceView() {
  const [month, setMonth] = useState(thisMonth);
  const { data: p, loading } = useApi(`/api/onboarding/performance?month=${month}`);
  const isCurrent = month === thisMonth();

  const o = p?.onboarding;
  const f = p?.field;
  const maxTrend = p ? Math.max(1, ...p.trend.map((t) => Math.max(t.submitted, t.approved))) : 1;

  return (
    <div className="space-y-5">
      <PageHeader
        icon="fa-chart-line"
        tone="blue"
        title="My Performance"
        subtitle={p?.agent ? `${p.agent.name}${p.agent.district ? ` · ${p.agent.district} district` : ''}` : 'Your onboarding and field work, month by month'}
      >
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setMonth((m) => shiftMonth(m, -1))} className="w-8 h-8 grid place-items-center rounded-md border border-slate-200 text-slate-500 hover:text-mg-blue" aria-label="Previous month">
            <i className="fa-solid fa-chevron-left text-xs" aria-hidden="true" />
          </button>
          <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700">
            <i className="fa-regular fa-calendar text-mg-teal" aria-hidden="true" />
            <input
              type="month"
              value={month}
              max={thisMonth()}
              onChange={(e) => e.target.value && setMonth(e.target.value)}
              className="bg-transparent focus:outline-none"
              aria-label="Month"
            />
          </label>
          <button
            type="button"
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
            disabled={isCurrent}
            className="w-8 h-8 grid place-items-center rounded-md border border-slate-200 text-slate-500 hover:text-mg-blue disabled:opacity-40"
            aria-label="Next month"
          >
            <i className="fa-solid fa-chevron-right text-xs" aria-hidden="true" />
          </button>
        </div>
      </PageHeader>

      {!p ? (
        <div className="h-64 rounded-xl bg-white border border-slate-200 animate-pulse" />
      ) : (
        <>
          <div className={clsx('rounded-xl bg-hero-desk text-white p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5', loading && 'opacity-70')}>
            <div>
              <p className="text-xs uppercase tracking-wider text-white/70">Clinics onboarded · {monthName(month)}</p>
              <p className="text-5xl font-semibold text-mg-mint mt-1">{o.approved}</p>
              <p className="text-xs text-white/75 mt-1">
                approved by your district admin · {o.allTimeApproved} all time
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                ['Submitted', o.submitted],
                ['Rejected', o.rejected],
                ['Approval rate', o.approvalRate == null ? '—' : `${o.approvalRate}%`],
              ].map(([label, v]) => (
                <div key={label} className="bg-white/10 border border-white/15 rounded-lg px-3 py-2.5 min-w-[96px]">
                  <p className="text-[10px] text-white/70">{label}</p>
                  <p className="text-lg font-semibold">{v}</p>
                </div>
              ))}
            </div>
            {p.rank && (
              <div className="text-center md:text-right">
                <p className="text-[10px] uppercase tracking-wider text-white/70">District rank</p>
                <p className="text-3xl font-semibold">
                  #{p.rank.position}<span className="text-base text-white/60"> of {p.rank.of}</span>
                </p>
                <p className="text-[11px] text-white/70">
                  {p.rank.position === 1 ? 'Leading your district' : `Leader has ${p.rank.leaderApprovals} approval${p.rank.leaderApprovals === 1 ? '' : 's'}`}
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatTile label="Awaiting Approval" value={o.pendingNow} icon="fa-hourglass-half" tone="amber" hint={o.oldestPendingSince ? `Oldest waiting ${span(o.oldestPendingSince)}` : 'Nothing waiting now'} />
            <StatTile label="Avg Approval Time" value={hoursLabel(o.avgApprovalHours)} icon="fa-stopwatch" tone="blue" hint="Submission to approval" />
            <StatTile label="Clinic Visits" value={f.visits} icon="fa-person-walking" tone="teal" hint={`${f.clinicsVisited} clinics · ${f.newLeads} new`} />
            <StatTile label="Conversion" value={f.conversionRate == null ? '—' : `${f.conversionRate}%`} icon="fa-filter" tone="emerald" hint="Clinics visited → submitted" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
            <DeskCard className="p-4 sm:p-5 space-y-4">
              <SectionHead title="Onboarding Funnel" subtitle={monthName(month)} />
              <div className="space-y-3">
                <FunnelRow label="Clinics visited" value={f.clinicsVisited} max={Math.max(f.clinicsVisited, o.submitted)} tone="bg-mg-blue" note={`${f.visits} visits`} />
                <FunnelRow label="Submitted for approval" value={o.submitted} max={Math.max(f.clinicsVisited, o.submitted)} tone="bg-mg-teal" />
                <FunnelRow label="Approved & live" value={o.approved} max={Math.max(f.clinicsVisited, o.submitted)} tone="bg-emerald-500" />
                <FunnelRow label="Rejected" value={o.rejected} max={Math.max(f.clinicsVisited, o.submitted)} tone="bg-rose-400" />
              </div>
              <div className="pt-3 border-t border-slate-100">
                <p className="text-[11px] uppercase text-slate-400 mb-2">Visit outcomes</p>
                {f.visits ? (
                  <div className="flex flex-wrap gap-1.5">
                    {OUTCOMES.filter((x) => f.outcomes[x.value]).map((x) => (
                      <Pill key={x.value} tone="slate"><i className={clsx('fa-solid', x.icon)} aria-hidden="true" /> {x.label}: {f.outcomes[x.value]}</Pill>
                    ))}
                  </div>
                ) : <p className="text-xs text-slate-400">No visits logged this month.</p>}
              </div>
            </DeskCard>

            <DeskCard className="p-4 sm:p-5 space-y-4">
              <SectionHead title="Last 6 Months" subtitle="Submitted vs approved, with visits logged" />
              <div className="flex items-end gap-3 h-44 pt-2">
                {p.trend.map((t) => (
                  <div key={t.month} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                    <div className="w-full flex items-end justify-center gap-1 h-32">
                      <div className="w-1/3 bg-mg-teal/70 rounded-t" style={{ height: `${(t.submitted / maxTrend) * 100}%` }} title={`${t.submitted} submitted`} />
                      <div className="w-1/3 bg-emerald-500 rounded-t" style={{ height: `${(t.approved / maxTrend) * 100}%` }} title={`${t.approved} approved`} />
                    </div>
                    <span className={clsx('text-[11px]', t.month === month ? 'font-semibold text-mg-blue' : 'text-slate-500')}>{monthName(t.month, true)}</span>
                    <span className="text-[10px] text-slate-400">{t.approved}/{t.submitted} · {t.visits}v</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 text-[11px] text-slate-500">
                <span><span className="inline-block w-2.5 h-2.5 rounded-sm bg-mg-teal/70 mr-1" />Submitted</span>
                <span><span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-500 mr-1" />Approved</span>
                <span>v = visits</span>
              </div>
            </DeskCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
            <DeskCard className="p-4 sm:p-5 space-y-4">
              <SectionHead icon="fa-hospital" title="Impact of Your Clinics" subtitle={`What the clinics you onboarded did in ${monthName(month)}`} />
              {o.allTimeApproved ? (
                <div className="grid grid-cols-3 gap-2.5 text-center">
                  {[
                    ['Live clinics', p.impact.liveClinics, 'text-mg-blue'],
                    ['Patients booked', p.impact.patientsBooked, 'text-mg-teal'],
                    ['OPD revenue', inr(p.impact.revenue), 'text-emerald-600'],
                  ].map(([label, v, tone]) => (
                    <div key={label} className="rounded-lg bg-mg-surface p-3">
                      <p className={clsx('text-lg font-semibold', tone)}>{v}</p>
                      <p className="text-[10px] uppercase text-slate-500">{label}</p>
                    </div>
                  ))}
                </div>
              ) : <EmptyNote icon="fa-hospital" title="No approved clinics yet" hint="Once a clinic you onboard is approved, its activity shows here." />}
            </DeskCard>

            <DeskCard className="p-4 sm:p-5 space-y-4">
              <SectionHead icon="fa-route" title="Follow-up Health" subtitle="Right now, across all your open clinics" />
              <div className="grid grid-cols-3 gap-2.5 text-center">
                {[
                  ['Open clinics', f.openLeads, 'text-mg-blue'],
                  ['Due today', f.dueToday, 'text-amber-600'],
                  ['Overdue', f.overdue, f.overdue ? 'text-rose-600' : 'text-slate-400'],
                ].map(([label, v, tone]) => (
                  <div key={label} className="rounded-lg bg-mg-surface p-3">
                    <p className={clsx('text-lg font-semibold', tone)}>{v}</p>
                    <p className="text-[10px] uppercase text-slate-500">{label}</p>
                  </div>
                ))}
              </div>
              {f.overdue > 0 && (
                <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                  <i className="fa-solid fa-triangle-exclamation mr-1.5" aria-hidden="true" />
                  {f.overdue} follow-up{f.overdue === 1 ? ' is' : 's are'} past the date you agreed with the clinic.
                </p>
              )}
            </DeskCard>
          </div>
        </>
      )}
    </div>
  );
}
