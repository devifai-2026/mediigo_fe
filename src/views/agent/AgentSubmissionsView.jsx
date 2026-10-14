import { useMemo, useState } from 'react';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../lib/api.js';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { useApi } from '../../hooks/useApi.js';
import { Button } from '../../components/ui/Button.jsx';
import { DeskCard, EmptyNote, PageHeader, Pill, Segmented, StatTile } from '../../components/desk/ui.jsx';
import { APPROVAL, span, hoursLabel } from './approvalStatus.js';

const fmt = (d) => (d
  ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
  : '');

/** Submitted → district review → approved / rejected, with how long each took. */
function Timeline({ s }) {
  const sent = s.submittedAt || (s.status !== 'DRAFT' ? s.createdAt : null);
  const decided = ['APPROVED', 'REJECTED'].includes(s.status);
  const steps = [
    { key: 'sent', label: 'Submitted', done: Boolean(sent), at: sent },
    {
      key: 'review',
      label: 'District admin review',
      done: decided,
      active: !decided && Boolean(sent),
      at: decided ? s.reviewedAt : null,
      note: !decided && sent ? `Waiting ${span(sent)}` : null,
    },
    {
      key: 'result',
      label: s.status === 'REJECTED' ? 'Rejected' : 'Approved & live',
      done: decided,
      bad: s.status === 'REJECTED',
      at: decided ? s.reviewedAt : null,
      note: decided && sent ? `Decided in ${span(sent, s.reviewedAt)}${s.reviewedBy?.name ? ` by ${s.reviewedBy.name}` : ''}` : null,
    },
  ];
  return (
    <ol className="flex items-start">
      {steps.map((st, i) => (
        <li key={st.key} className="flex-1 min-w-0">
          <div className="flex items-center">
            <span className={clsx(
              'w-6 h-6 shrink-0 rounded-full grid place-items-center text-[10px] text-white',
              st.bad ? 'bg-rose-500' : st.done ? 'bg-mg-teal' : st.active ? 'bg-amber-500' : 'bg-slate-200',
            )}>
              <i className={clsx('fa-solid', st.bad ? 'fa-xmark' : st.done ? 'fa-check' : st.active ? 'fa-hourglass-half' : 'fa-circle text-[6px]')} aria-hidden="true" />
            </span>
            {i < steps.length - 1 && (
              <span className={clsx('flex-1 h-0.5 mx-2', steps[i + 1].done || steps[i + 1].active ? 'bg-mg-teal' : 'bg-slate-200')} aria-hidden="true" />
            )}
          </div>
          <p className={clsx('text-[11px] font-medium leading-tight mt-1.5 pr-2', st.done || st.active ? 'text-slate-800' : 'text-slate-400')}>{st.label}</p>
          {(st.at || st.note) && (
            <p className="text-[10px] text-slate-400 mt-0.5 pr-2 leading-snug">
              {st.at && fmt(st.at)}{st.at && st.note && <br />}{st.note}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}

const FILTERS = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'Awaiting approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'DRAFT', label: 'Not sent' },
];
// Drafts are not with the district admin yet, so they are not "awaiting".
const PENDING = new Set(['SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED']);

/**
 * The agent's onboarding submissions and where each one is in district
 * approval. Scoped by the server to the signed-in agent.
 */
export default function AgentSubmissionsView() {
  const toast = useToast();
  const { data, loading, refetch } = useApi('/api/onboarding/submissions');
  const [sending, setSending] = useState(null);

  // A draft is left behind when sending failed (a licence clash, a dropped
  // connection); sending it again is one tap rather than re-entering the form.
  const send = async (s) => {
    setSending(s._id);
    try {
      await api.post(`/api/onboarding/submissions/${s._id}/submit`);
      toast.success('Sent to your district admin for approval');
      refetch();
    } catch (e) {
      toast.error(e?.response?.data?.error?.message || e.message);
    } finally {
      setSending(null);
    }
  };
  const [filter, setFilter] = useState('ALL');
  const subs = data ?? [];

  const counts = {
    ALL: subs.length,
    PENDING: subs.filter((s) => PENDING.has(s.status)).length,
    APPROVED: subs.filter((s) => s.status === 'APPROVED').length,
    REJECTED: subs.filter((s) => s.status === 'REJECTED').length,
    DRAFT: subs.filter((s) => s.status === 'DRAFT').length,
  };
  const shown = useMemo(() => subs.filter((s) => filter === 'ALL'
    || (filter === 'PENDING' ? PENDING.has(s.status) : s.status === filter)), [subs, filter]);

  const decided = subs.filter((s) => ['APPROVED', 'REJECTED'].includes(s.status) && s.reviewedAt);
  const avgHours = decided.length
    ? decided.reduce((a, s) => a + (new Date(s.reviewedAt) - new Date(s.submittedAt || s.createdAt)) / 3600000, 0) / decided.length
    : null;
  const oldest = subs.filter((s) => ['SUBMITTED', 'UNDER_REVIEW'].includes(s.status))
    .map((s) => s.submittedAt || s.createdAt).sort()[0];

  return (
    <div className="space-y-5">
      <PageHeader
        icon="fa-clipboard-check"
        title="Onboarding Approvals"
        subtitle="Every clinic you submitted, and where it is in your district admin’s approval"
      >
        <Button variant="secondary" size="sm" onClick={() => refetch()} disabled={loading}>
          <i className={clsx('fa-solid fa-rotate-right', loading && 'animate-spin')} aria-hidden="true" /> Refresh
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Awaiting Approval" value={counts.PENDING} icon="fa-hourglass-half" tone="amber" hint={oldest ? `Oldest waiting ${span(oldest)}` : 'Nothing waiting'} />
        <StatTile label="Approved" value={counts.APPROVED} icon="fa-circle-check" tone="emerald" hint="Live on Mediigo" />
        <StatTile label="Rejected" value={counts.REJECTED} icon="fa-circle-xmark" tone="rose" hint="Fix and resubmit from Follow-ups" />
        <StatTile label="Avg Approval Time" value={hoursLabel(avgHours)} icon="fa-stopwatch" tone="blue" hint="From submission to decision" />
      </div>

      <DeskCard className="p-3 sm:p-4">
        <Segmented
          value={filter}
          onChange={setFilter}
          options={FILTERS.filter((f) => f.value !== 'DRAFT' || counts.DRAFT).map((f) => ({ ...f, count: counts[f.value] }))}
        />
      </DeskCard>

      {loading && !data ? (
        <div className="space-y-3">{[0, 1].map((i) => <div key={i} className="h-36 rounded-xl bg-white border border-slate-200 animate-pulse" />)}</div>
      ) : !shown.length ? (
        <DeskCard>
          <EmptyNote
            icon="fa-clipboard-check"
            title={subs.length ? 'Nothing in this filter' : 'No submissions yet'}
            hint={subs.length ? undefined : 'Clinics you onboard appear here with their approval status.'}
          />
          {!subs.length && (
            <div className="pb-8 text-center">
              <Link to="/a/onboard" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-mg-teal hover:bg-mg-tealDark text-white text-xs font-medium">
                <i className="fa-solid fa-hospital" aria-hidden="true" /> Onboard a clinic
              </Link>
            </div>
          )}
        </DeskCard>
      ) : (
        <div className="space-y-3">
          {shown.map((s) => {
            const a = APPROVAL[s.status] ?? APPROVAL.SUBMITTED;
            return (
              <DeskCard key={s._id} className="p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{s.payload?.name || 'Unnamed clinic'}</p>
                    <p className="text-[11px] text-slate-500">
                      {[s.payload?.code, [s.payload?.address?.city, s.payload?.address?.pincode].filter(Boolean).join(' '), s.payload?.primaryContact?.name].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {s.leadId && <Pill tone="slate"><i className="fa-solid fa-route" aria-hidden="true" /> From follow-up</Pill>}
                    <Pill tone={a.tone} dot>{a.short}</Pill>
                  </div>
                </div>

                <Timeline s={s} />

                {s.status === 'REJECTED' && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span><strong className="font-medium">Reason:</strong> {s.rejectionReason || 'No reason given'}</span>
                    {s.leadId && (
                      <Link to={`/a/onboard?lead=${s.leadId}`} className="shrink-0 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-medium text-center">
                        Fix &amp; resubmit
                      </Link>
                    )}
                  </div>
                )}
                {s.status === 'DRAFT' && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span>Saved but not sent — your district admin cannot see this yet.</span>
                    <Button size="sm" onClick={() => send(s)} loading={sending === s._id}>
                      <i className="fa-solid fa-paper-plane" aria-hidden="true" /> Send for approval
                    </Button>
                  </div>
                )}
                {s.reviewNotes && s.status !== 'REJECTED' && (
                  <p className="p-3 rounded-lg bg-mg-surface text-xs text-slate-600"><strong className="font-medium">Admin note:</strong> {s.reviewNotes}</p>
                )}
                {PENDING.has(s.status) && !s.geocodeResult?.lat && (
                  <p className="text-[11px] text-amber-700">
                    <i className="fa-solid fa-location-crosshairs mr-1" aria-hidden="true" />
                    No map location yet — the district admin cannot approve a clinic patients would not find on the map.
                  </p>
                )}
              </DeskCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
