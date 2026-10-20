import { useState } from 'react';
import clsx from 'clsx';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useConsole } from '../../context/AdminConsoleContext.jsx';
import { api } from '../../lib/api.js';
import { SkeletonRows } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { AdminPageHeader } from '../../components/superadmin/AdminKpi.jsx';
import { phone as fmtPhone } from '../../lib/format.js';

/**
 * Enquiries from the /clinic landing page.
 *
 * Most are already in a field agent's follow-ups — the city matched a district
 * with an agent. The rest (a city nobody covers yet) wait here for someone to
 * be assigned, which creates the follow-up. Campaign shows which ad sent them.
 */

const TABS = [['UNASSIGNED', 'Needs an agent'], ['ASSIGNED', 'With an agent'], ['SPAM', 'Spam'], ['', 'All']];
const STATUS_TONE = {
  ASSIGNED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  UNASSIGNED: 'bg-amber-50 text-amber-800 border-amber-200',
  SPAM: 'bg-slate-100 text-slate-500 border-slate-200',
};
const STAGE_LABEL = { NEW: 'Not contacted', FOLLOW_UP: 'Follow-up', INTERESTED: 'Interested', NOT_INTERESTED: 'Not interested', SUBMITTED: 'Onboarding submitted' };

const when = (iso) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export default function EnquiriesView() {
  const [tab, setTab] = useState('UNASSIGNED');
  const [q, setQ] = useState('');
  const query = new URLSearchParams({ ...(tab ? { status: tab } : {}), ...(q.trim() ? { q: q.trim() } : {}) }).toString();
  const { data, loading, refetch } = useApi(`/api/enquiries/admin${query ? `?${query}` : ''}`, { deps: [tab, q] });
  const { agents = [] } = useConsole();
  const toast = useToast();
  const [busyId, setBusyId] = useState(null);
  const [pick, setPick] = useState({});

  const items = data?.items ?? [];
  const counts = data?.counts ?? {};

  const act = async (row, path, body, msg) => {
    setBusyId(row.id);
    try {
      await api.post(`/api/enquiries/admin/${row.id}/${path}`, body);
      toast.success(msg);
      refetch();
    } catch (e) {
      toast.error(e?.response?.data?.error?.message || e.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="space-y-6">
      <AdminPageHeader
        title="Clinic Enquiries"
        subtitle="Doctors who asked about Mediigo on the /clinic page. Each one becomes a follow-up for the field agent in their city."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap gap-1 p-1 rounded-lg bg-white border border-slate-200">
          {TABS.map(([v, l]) => (
            <button
              key={l}
              type="button"
              onClick={() => setTab(v)}
              className={clsx('px-3 py-1.5 rounded-md text-xs font-semibold transition', tab === v ? 'bg-mg-blue text-white' : 'text-slate-600 hover:text-slate-900')}
            >
              {l}{v && counts[v] != null && <span className={clsx('ml-1.5', tab === v ? 'text-white/70' : 'text-slate-400')}>{counts[v]}</span>}
            </button>
          ))}
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, clinic, phone, city, campaign…"
          aria-label="Search enquiries"
          className="h-9 w-full sm:w-72 px-3 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:border-mg-teal focus:ring-2 focus:ring-mg-teal/20"
        />
      </div>

      {loading && !data ? (
        <SkeletonRows rows={5} />
      ) : !items.length ? (
        <EmptyState icon="doc" title={tab === 'UNASSIGNED' ? 'Every enquiry has an agent' : 'No enquiries here'} hint="New ones from the /clinic page appear as they come in." />
      ) : (
        <div className="space-y-3">
          {items.map((e) => (
            <article key={e.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900">
                    {e.name}{e.clinicName && <span className="font-normal text-slate-500"> · {e.clinicName}</span>}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    <a href={`tel:${e.phone}`} className="font-medium text-mg-blue hover:underline">+91 {fmtPhone(e.phone)}</a>
                    {e.email && <> · {e.email}</>} · {e.city}{e.specialty && ` · ${e.specialty}`}{e.doctorsCount && ` · ${e.doctorsCount} doctor${e.doctorsCount === '1' ? '' : 's'}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {e.submissions > 1 && <span className="text-[11px] text-slate-500">Sent {e.submissions}×</span>}
                  <span className={clsx('px-2 py-0.5 rounded-full border text-[11px] font-semibold', STATUS_TONE[e.status])}>{e.status === 'UNASSIGNED' ? 'Needs an agent' : e.status === 'ASSIGNED' ? 'With agent' : 'Spam'}</span>
                </div>
              </div>

              {e.message && <p className="mt-3 text-sm text-slate-700 bg-mg-surface rounded-lg px-3 py-2">{e.message}</p>}

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                <span><i className="fa-regular fa-clock mr-1" aria-hidden="true" />{when(e.createdAt)}</span>
                {e.preferredTime && <span>Call: {e.preferredTime}</span>}
                {(e.utm?.source || e.utm?.campaign) && (
                  <span><i className="fa-solid fa-bullhorn mr-1" aria-hidden="true" />{[e.utm.source, e.utm.medium, e.utm.campaign].filter(Boolean).join(' / ')}</span>
                )}
                {e.district && <span><i className="fa-solid fa-map-pin mr-1" aria-hidden="true" />{e.district.name}</span>}
                {e.agent && (
                  <span className="text-slate-700">
                    <i className="fa-solid fa-user-tie mr-1" aria-hidden="true" />{e.agent.name}
                    {e.lead && ` · ${STAGE_LABEL[e.lead.stage] ?? e.lead.stage}`}
                  </span>
                )}
              </div>

              {e.status !== 'SPAM' && (
                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
                  <select
                    value={pick[e.id] ?? ''}
                    onChange={(ev) => setPick((p) => ({ ...p, [e.id]: ev.target.value }))}
                    aria-label="Field agent"
                    className="h-9 min-w-[200px] px-2.5 rounded-lg border border-slate-300 bg-white text-xs focus:outline-none focus:border-mg-teal"
                  >
                    <option value="">{e.agent ? 'Reassign to…' : 'Assign to field agent…'}</option>
                    {agents.map((a) => <option key={a.id} value={a.id}>{a.name}{a.cluster ? ` — ${a.cluster}` : ''}</option>)}
                  </select>
                  <button
                    type="button"
                    disabled={!pick[e.id] || busyId === e.id}
                    onClick={() => act(e, 'assign', { agentId: pick[e.id] }, 'Added to the agent’s follow-ups')}
                    className="h-9 px-3 rounded-lg bg-mg-teal hover:bg-mg-tealDark text-white text-xs font-semibold disabled:opacity-50"
                  >
                    {e.agent ? 'Reassign' : 'Assign'}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === e.id}
                    onClick={() => act(e, 'spam', {}, 'Marked as spam')}
                    className="ml-auto h-9 px-3 rounded-lg text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                  >
                    Mark as spam
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
