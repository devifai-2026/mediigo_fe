import { useState, useMemo } from 'react';
import clsx from 'clsx';
import { Line, Bar } from 'react-chartjs-2';
import { useApi } from '../../hooks/useApi.js';
import { api } from '../../lib/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { AdminKpi, AdminPageHeader } from '../../components/superadmin/AdminKpi.jsx';
import { TicketBoard } from '../../components/superadmin/TicketBoard.jsx';
import { TicketDetail } from '../../components/superadmin/TicketDetail.jsx';
import { RaiseTicketModal } from '../../components/superadmin/RaiseTicketModal.jsx';
import { SkeletonRows } from '../../components/ui/Skeleton.jsx';
import { FilterPills } from '../../components/ui/FilterPills.jsx';
import { shortDate, timeOf } from '../../lib/format.js';
import { ROLES } from '../../lib/constants.js';
import '../../components/superadmin/AdminCharts.jsx'; // registers Chart.js elements

const LOG_TONE = {
  HOSPITAL_DEBOARDED: 'bg-rose-100 text-rose-800',
  DOCTOR_DEBOARDED: 'bg-rose-100 text-rose-800',
  DEBOARD_REQUESTED: 'bg-amber-100 text-amber-800',
  HOSPITAL_SUSPENDED: 'bg-amber-100 text-amber-800',
  HOSPITAL_REJECTED: 'bg-amber-100 text-amber-800',
  USER_DEACTIVATED: 'bg-amber-100 text-amber-800',
  USER_DELETED: 'bg-rose-100 text-rose-800',
  HOSPITAL_APPROVED: 'bg-emerald-100 text-emerald-800',
  HOSPITAL_REACTIVATED: 'bg-emerald-100 text-emerald-800',
  USER_CREATED: 'bg-emerald-100 text-emerald-800',
  TICKET_RAISED: 'bg-indigo-100 text-indigo-800',
  TICKET_MOVED: 'bg-indigo-100 text-indigo-800',
  WALKIN_BOOKED: 'bg-slate-100 text-slate-600',
};

export default function ComplaintsView() {
  const { role } = useAuth();
  const toast = useToast();
  const canTriage = [ROLES.SUPER_ADMIN, ROLES.EXEC_ADMIN].includes(role);

  const [tab, setTab] = useState('board');
  const [priority, setPriority] = useState('');
  const [openId, setOpenId] = useState(null);
  const [raising, setRaising] = useState(false);

  const { data: tickets, loading, refetch } = useApi('/api/tickets');
  const { data: summary, refetch: refetchSummary } = useApi('/api/tickets/summary');
  const { data: log, loading: logLoading } = useApi(canTriage ? '/api/tickets/system-log?limit=200' : null, { skip: !canTriage });

  const reload = () => { refetch(); refetchSummary(); };

  const rows = useMemo(
    () => (tickets || []).filter((t) => !priority || t.priority === priority),
    [tickets, priority],
  );

  const move = async (id, to) => {
    try {
      await api.post(`/api/tickets/${id}/move`, { to });
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  };

  if (loading) return <SkeletonRows rows={6} />;

  const c = summary?.counts ?? {};
  const trend = summary?.trend ?? [];
  const logTrend = log?.trend ?? [];

  return (
    <section className="space-y-6">
      <AdminPageHeader
        title="System Logs & Issue Tracker"
        subtitle="Escalations from every role, plus the platform's own audit activity."
      >
        <button
          type="button"
          onClick={() => setRaising(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md flex items-center gap-2"
        >
          <i className="fa-solid fa-plus" /> Raise Ticket
        </button>
      </AdminPageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminKpi label="Open (To Do)" value={c.todo ?? 0} icon="fa-inbox" accent="amber" footer="Awaiting triage" />
        <AdminKpi label="In Progress" value={c.inProgress ?? 0} icon="fa-spinner" accent="indigoSlate" footer="Being worked on" />
        <AdminKpi label="Resolved" value={c.done ?? 0} icon="fa-circle-check" accent="emeraldSlate" footer="Closed tickets" />
        <AdminKpi
          label="Unread"
          value={summary?.unread ?? 0}
          icon="fa-bell"
          accent={summary?.unread > 0 ? 'amber' : 'teal'}
          footer={summary?.unread > 0 ? 'Never opened by you' : 'You are up to date'}
        />
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <FilterPills
          value={tab}
          onChange={setTab}
          options={[
            { value: 'board', label: 'Issue Tracker', count: c.total },
            ...(canTriage ? [{ value: 'logs', label: 'System Logs' }] : []),
            { value: 'analytics', label: 'Analytics' },
          ]}
        />
        {tab === 'board' && (
          <FilterPills
            value={priority}
            onChange={setPriority}
            options={[
              { value: '', label: 'All priorities' },
              { value: 'CRITICAL', label: 'Critical', count: summary?.byPriority?.CRITICAL },
              { value: 'HIGH', label: 'High', count: summary?.byPriority?.HIGH },
              { value: 'MEDIUM', label: 'Medium', count: summary?.byPriority?.MEDIUM },
              { value: 'LOW', label: 'Low', count: summary?.byPriority?.LOW },
            ]}
          />
        )}
      </div>

      {tab === 'board' && (
        <>
          {canTriage && (
            <p className="text-[11px] text-slate-400">
              <i className="fa-solid fa-arrows-up-down-left-right mr-1" /> Drag a card between columns, or open it to move and reply.
            </p>
          )}
          <TicketBoard tickets={rows} onOpen={(t) => setOpenId(t.id)} onMove={move} canTriage={canTriage} />
        </>
      )}

      {tab === 'logs' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Platform activity, last 14 days</h3>
              <p className="text-xs text-slate-500">Audited events per day — approvals, suspensions, bookings and ticket moves.</p>
            </div>
            <div className="h-56">
              <Line
                data={{
                  labels: logTrend.map((t) => t.date.slice(5)),
                  datasets: [{
                    label: 'Audited events',
                    data: logTrend.map((t) => t.count),
                    borderColor: '#4F46E5',
                    backgroundColor: 'rgba(79,70,229,0.1)',
                    fill: true,
                    tension: 0.35,
                    pointRadius: 3,
                  }],
                }}
                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }}
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Event log</h3>
            </div>
            {logLoading ? <div className="p-4"><SkeletonRows rows={5} /></div> : (
              <div className="overflow-x-auto max-h-[520px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0">
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">When</th>
                      <th className="py-3 px-4">Event</th>
                      <th className="py-3 px-4">Actor</th>
                      <th className="py-3 px-4">Entity</th>
                      <th className="py-3 px-4">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {(log?.rows ?? []).map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span className="text-slate-700">{shortDate(r.createdAt)}</span>
                          <span className="block text-[10px] text-slate-400">{timeOf(r.createdAt)}</span>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded', LOG_TONE[r.action] ?? 'bg-slate-100 text-slate-600')}>
                            {r.action.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="font-semibold text-slate-800">{r.actorName}</span>
                          <span className="block text-[10px] text-slate-400">{r.actorRole ?? '—'}</span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-500">{r.entityType ?? '—'}</td>
                        <td className="py-2.5 px-4 text-slate-500 max-w-xs truncate">{r.reason ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Tickets raised per day</h3>
              <p className="text-xs text-slate-500">Escalation volume across every role.</p>
            </div>
            <div className="h-56">
              <Line
                data={{
                  labels: trend.map((t) => t.date.slice(5)),
                  datasets: [{
                    label: 'Tickets',
                    data: trend.map((t) => t.count),
                    borderColor: '#0D9488',
                    backgroundColor: 'rgba(13,148,136,0.12)',
                    fill: true,
                    tension: 0.35,
                    pointRadius: 3,
                  }],
                }}
                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }}
              />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Most frequent events</h3>
              <p className="text-xs text-slate-500">What the platform spends its time doing.</p>
            </div>
            <div className="h-56">
              <Bar
                data={{
                  labels: (log?.byAction ?? []).map((a) => a.action.replace(/_/g, ' ').toLowerCase()),
                  datasets: [{
                    label: 'Events',
                    data: (log?.byAction ?? []).map((a) => a.count),
                    backgroundColor: '#4F46E5',
                    borderRadius: 6,
                  }],
                }}
                options={{
                  indexAxis: 'y',
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                }}
              />
            </div>
          </div>
        </div>
      )}

      <TicketDetail
        ticketId={openId}
        open={Boolean(openId)}
        onClose={() => { setOpenId(null); reload(); }}
        onChanged={reload}
        canTriage={canTriage}
      />
      <RaiseTicketModal open={raising} onClose={() => setRaising(false)} onDone={reload} />
    </section>
  );
}
