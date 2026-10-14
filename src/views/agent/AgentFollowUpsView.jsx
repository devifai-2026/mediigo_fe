import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { DeskCard, EmptyNote, PageHeader, Pill, Segmented, StatTile } from '../../components/desk/ui.jsx';
import { AddLeadModal, LogVisitModal, OUTCOMES } from '../../components/agent/LeadModals.jsx';
import { APPROVAL } from './approvalStatus.js';

const STAGE = {
  NEW: { label: 'New', tone: 'slate' },
  FOLLOW_UP: { label: 'Follow-up', tone: 'blue' },
  INTERESTED: { label: 'Interested', tone: 'emerald' },
  NOT_INTERESTED: { label: 'Not interested', tone: 'rose' },
  SUBMITTED: { label: 'Submitted', tone: 'teal' },
};
const OPEN = new Set(['NEW', 'FOLLOW_UP', 'INTERESTED']);

const dayStart = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

/** "Today, 5:00 PM" · "Tomorrow, 11:00 AM" · "Mon 14 Oct, 11:00 AM" */
const whenLabel = (iso) => {
  const d = new Date(iso);
  const t = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  const today = dayStart();
  if (d >= today && d < addDays(today, 1)) return `Today, ${t}`;
  if (d >= addDays(today, 1) && d < addDays(today, 2)) return `Tomorrow, ${t}`;
  if (d >= addDays(today, -1) && d < today) return `Yesterday, ${t}`;
  return `${d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}, ${t}`;
};
const overdueBy = (iso) => {
  const days = Math.floor((dayStart() - dayStart(new Date(iso))) / 86400000);
  return days >= 1 ? `${days} day${days === 1 ? '' : 's'} overdue` : 'Overdue';
};

function LeadCard({ lead, onLog }) {
  const [open, setOpen] = useState(false);
  const now = new Date();
  const stage = STAGE[lead.stage] ?? STAGE.NEW;
  const isOpen = OPEN.has(lead.stage);
  const late = isOpen && lead.nextVisitAt && new Date(lead.nextVisitAt) < now;
  const approval = lead.submission ? APPROVAL[lead.submission.status] : null;
  const rejected = lead.submission?.status === 'REJECTED';
  const last = [...lead.visits].reverse().find((v) => v.outcome !== 'ONBOARDED') ?? lead.visits[lead.visits.length - 1];
  const lastOutcome = last && OUTCOMES.find((o) => o.value === last.outcome);
  const address = [lead.address?.line1, lead.address?.city, lead.address?.pincode].filter(Boolean).join(', ');

  return (
    <DeskCard className={clsx('p-4 space-y-3', late && 'ring-1 ring-rose-300')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900 truncate">{lead.clinicName}</h3>
          <p className="text-[11px] text-slate-500 truncate">
            {[lead.contactName, lead.specialty].filter(Boolean).join(' • ') || 'No contact noted'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Pill tone={stage.tone}>{stage.label}</Pill>
          {approval && <Pill tone={approval.tone} dot>{approval.short}</Pill>}
        </div>
      </div>

      {isOpen && lead.nextVisitAt && (
        <div className={clsx(
          'flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs',
          late ? 'bg-rose-50 border border-rose-200 text-rose-800' : 'bg-blue-50 border border-blue-100 text-mg-navy',
        )}>
          <span><i className="fa-regular fa-calendar mr-1.5" aria-hidden="true" />Next visit: <strong className="font-medium">{whenLabel(lead.nextVisitAt)}</strong></span>
          {late && <span className="font-semibold">{overdueBy(lead.nextVisitAt)}</span>}
        </div>
      )}
      {lead.submission && (
        <div className={clsx('rounded-lg px-3 py-2 text-xs border', rejected ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-teal-50/60 border-teal-100 text-mg-tealDark')}>
          {approval?.long}
          {rejected && lead.submission.rejectionReason && <span className="block mt-0.5">Reason: {lead.submission.rejectionReason}</span>}
        </div>
      )}

      {last && (
        <div className="text-xs text-slate-600 bg-mg-surface rounded-lg px-3 py-2">
          <p className="text-[10px] uppercase text-slate-400 mb-0.5">
            Last visit · {whenLabel(last.at)}{lastOutcome && ` · ${lastOutcome.label}`}
          </p>
          {last.note ? <p className="line-clamp-2">{last.note}</p> : <p className="italic text-slate-400">No note</p>}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-xs">
        {lead.contactPhone && (
          <a href={`tel:${lead.contactPhone}`} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:border-mg-teal hover:text-mg-teal">
            <i className="fa-solid fa-phone" aria-hidden="true" /> Call
          </a>
        )}
        {address && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lead.clinicName}, ${address}`)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:border-mg-teal hover:text-mg-teal"
          >
            <i className="fa-solid fa-location-arrow" aria-hidden="true" /> Directions
          </a>
        )}
        {lead.visits.length > 0 && (
          <button type="button" onClick={() => setOpen((o) => !o)} className="px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-800">
            {open ? 'Hide' : 'History'} ({lead.visits.length})
          </button>
        )}
        <div className="ml-auto flex gap-2">
          {(isOpen || rejected) && (
            <Button size="sm" variant="secondary" onClick={() => onLog(lead)}>
              <i className="fa-solid fa-pen-to-square" aria-hidden="true" /> Log visit
            </Button>
          )}
          {(isOpen || rejected) && (
            <Link
              to={`/a/onboard?lead=${lead._id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-mg-teal hover:bg-mg-tealDark text-white text-[11px] font-medium"
            >
              <i className="fa-solid fa-hospital" aria-hidden="true" /> {rejected ? 'Resubmit' : 'Onboard now'}
            </Link>
          )}
        </div>
      </div>

      {open && (
        <ol className="border-l-2 border-slate-200 ml-1.5 pl-4 space-y-3 pt-1">
          {[...lead.visits].reverse().map((v) => {
            const o = OUTCOMES.find((x) => x.value === v.outcome);
            return (
              <li key={v._id} className="relative text-xs">
                <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-mg-teal ring-2 ring-white" />
                <p className="text-slate-800 font-medium">{o?.label || (v.outcome === 'ONBOARDED' ? 'Submitted for approval' : v.outcome)}</p>
                <p className="text-[11px] text-slate-400">{whenLabel(v.at)}{v.nextVisitAt && ` · next: ${whenLabel(v.nextVisitAt)}`}</p>
                {v.note && <p className="text-slate-600 mt-0.5">{v.note}</p>}
              </li>
            );
          })}
        </ol>
      )}
    </DeskCard>
  );
}

const FILTERS = [
  { value: 'DUE', label: 'Due now' },
  { value: 'UPCOMING', label: 'Upcoming' },
  { value: 'INTERESTED', label: 'Interested' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'NOT_INTERESTED', label: 'Not interested' },
  { value: 'ALL', label: 'All' },
];

/**
 * The field agent's follow-ups: every clinic visited but not yet onboarded,
 * when to go back, and what was said last time.
 */
export default function AgentFollowUpsView() {
  const toast = useToast();
  const { data, loading, setData } = useApi('/api/onboarding/leads');
  const [filter, setFilter] = useState('DUE');
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const [logging, setLogging] = useState(null);

  const leads = data ?? [];
  const now = new Date();
  const tomorrow = addDays(dayStart(), 1);
  const weekOut = addDays(dayStart(), 8);

  const groups = useMemo(() => {
    const open = leads.filter((l) => OPEN.has(l.stage));
    return {
      DUE: open.filter((l) => !l.nextVisitAt || new Date(l.nextVisitAt) < tomorrow),
      UPCOMING: open.filter((l) => l.nextVisitAt && new Date(l.nextVisitAt) >= tomorrow),
      INTERESTED: leads.filter((l) => l.stage === 'INTERESTED'),
      SUBMITTED: leads.filter((l) => l.stage === 'SUBMITTED'),
      NOT_INTERESTED: leads.filter((l) => l.stage === 'NOT_INTERESTED'),
      ALL: leads,
    };
  }, [leads]); // eslint-disable-line react-hooks/exhaustive-deps

  const overdue = leads.filter((l) => OPEN.has(l.stage) && l.nextVisitAt && new Date(l.nextVisitAt) < now).length;
  const today = leads.filter((l) => OPEN.has(l.stage) && l.nextVisitAt && new Date(l.nextVisitAt) >= now && new Date(l.nextVisitAt) < tomorrow).length;
  const week = leads.filter((l) => OPEN.has(l.stage) && l.nextVisitAt && new Date(l.nextVisitAt) >= tomorrow && new Date(l.nextVisitAt) < weekOut).length;
  const awaiting = leads.filter((l) => ['SUBMITTED', 'UNDER_REVIEW'].includes(l.submission?.status)).length;

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = groups[filter] ?? [];
    const filtered = s ? list.filter((l) => [l.clinicName, l.contactName, l.contactPhone, l.address?.city, l.address?.line1].some((v) => String(v || '').toLowerCase().includes(s))) : list;
    // Overdue first, then soonest; clinics with no date at the end.
    return [...filtered].sort((a, b) => (a.nextVisitAt ? new Date(a.nextVisitAt) : Infinity) - (b.nextVisitAt ? new Date(b.nextVisitAt) : Infinity));
  }, [groups, filter, q]);

  const replace = (lead) => setData((rows) => {
    const list = rows ?? [];
    return list.some((r) => r._id === lead._id) ? list.map((r) => (r._id === lead._id ? lead : r)) : [lead, ...list];
  });

  return (
    <div className="space-y-5">
      <PageHeader
        icon="fa-route"
        title="Clinic Visits & Follow-ups"
        subtitle="Clinics you have met but not onboarded yet — when to go back, and what they said last time"
      >
        <Button onClick={() => setAdding(true)}>
          <i className="fa-solid fa-plus" aria-hidden="true" /> Add clinic visit
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Overdue" value={overdue} icon="fa-triangle-exclamation" tone="rose" hint="Missed follow-up dates" />
        <StatTile label="Due Today" value={today} icon="fa-calendar-day" tone="amber" hint="Still to visit today" />
        <StatTile label="Next 7 Days" value={week} icon="fa-calendar-week" tone="blue" hint="Upcoming meetings" />
        <StatTile label="Awaiting Approval" value={awaiting} icon="fa-hourglass-half" tone="teal" hint="With the district admin" />
      </div>

      <DeskCard className="p-3 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <Segmented value={filter} onChange={setFilter} options={FILTERS.map((f) => ({ ...f, count: groups[f.value]?.length ?? 0 }))} />
        <div className="relative">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" aria-hidden="true" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search clinic, doctor, area…"
            aria-label="Search clinics"
            className="pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs w-full lg:w-64 focus:outline-none focus:border-mg-teal focus:ring-1 focus:ring-mg-teal"
          />
        </div>
      </DeskCard>

      {loading && !data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0, 1].map((i) => <div key={i} className="h-48 rounded-xl bg-white border border-slate-200 animate-pulse" />)}
        </div>
      ) : !shown.length ? (
        <DeskCard>
          <EmptyNote
            icon="fa-route"
            title={leads.length ? 'Nothing here' : 'No clinic visits yet'}
            hint={leads.length
              ? (filter === 'DUE' ? 'No follow-ups due — check Upcoming.' : 'Try another filter.')
              : 'Add a clinic after your first visit and set when to go back.'}
          />
        </DeskCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          {shown.map((l) => <LeadCard key={l._id} lead={l} onLog={setLogging} />)}
        </div>
      )}

      <AddLeadModal open={adding} onClose={() => setAdding(false)} onSaved={replace} toast={toast} />
      <LogVisitModal lead={logging} onClose={() => setLogging(null)} onSaved={replace} toast={toast} />
    </div>
  );
}
