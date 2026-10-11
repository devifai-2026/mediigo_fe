import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useApi } from '../../hooks/useApi.js';
import { useReleaseFollowUp } from '../../hooks/useReleaseFollowUp.js';
import { FilterPills } from '../../components/ui/FilterPills.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { SkeletonRows } from '../../components/ui/Skeleton.jsx';
import { StatCard } from '../../components/ui/StatCard.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { token, phone } from '../../lib/format.js';
import {
  FOLLOWUP_STATUS, followUpBadge, longDate, replyBy, SHIFT_LABEL, t12,
} from '../../lib/followUps.js';

/**
 * Every follow-up this doctor has booked from today on, sorted by what needs
 * doing: the ones past their reply deadline come first, because each is a
 * place another patient could be using.
 */
const TABS = [
  { value: 'action', label: 'No response' },
  { value: 'pending', label: 'Awaiting reply' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'closed', label: 'Not coming' },
];

export default function DoctorFollowUpsView() {
  const { user } = useAuth();
  const doctorId = user?.doctorId;
  const { data, loading, refetch } = useApi(doctorId ? `/api/queue/${doctorId}/followups` : null);
  const release = useReleaseFollowUp();
  const [tab, setTab] = useState(null);

  const groups = useMemo(() => {
    const rows = data || [];
    return {
      action: rows.filter((r) => r.overdue),
      pending: rows.filter((r) => r.status === FOLLOWUP_STATUS.PENDING && !r.overdue),
      confirmed: rows.filter((r) => r.status === FOLLOWUP_STATUS.CONFIRMED),
      closed: rows.filter((r) => [FOLLOWUP_STATUS.DECLINED, FOLLOWUP_STATUS.RELEASED].includes(r.status)),
    };
  }, [data]);

  // Open on whatever needs attention, rather than always on an empty first tab.
  const active = tab ?? (groups.action.length ? 'action' : groups.pending.length ? 'pending' : 'confirmed');
  const rows = groups[active];

  const onRelease = async (r) => {
    if (await release(r)) refetch();
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Follow-ups</h2>
        <p className="text-xs text-slate-500 mt-1">
          Follow-ups you booked, and whether each patient is coming. Release a slot nobody has confirmed so another patient can book it.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="No response" value={groups.action.length} icon="alert" tone="alert" hint="Past the reply deadline" />
        <StatCard label="Awaiting reply" value={groups.pending.length} icon="clock" tone="warn" />
        <StatCard label="Confirmed" value={groups.confirmed.length} icon="check" tone="cash" />
        <StatCard label="Not coming" value={groups.closed.length} icon="cross" tone="teal" hint="Declined or released" />
      </div>

      <FilterPills
        value={active}
        onChange={setTab}
        options={TABS.map((t) => ({ ...t, count: groups[t.value].length }))}
      />

      {loading && !data ? (
        <SkeletonRows rows={4} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="clock"
          title={active === 'action' ? 'Nothing overdue' : 'No follow-ups here'}
          hint="Book a follow-up from the chamber when you finish a consultation."
        />
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const badge = followUpBadge(r.status, r.respondBy);
            const open = r.tokenStatus === 'WAITING';
            return (
              <div
                key={r.tokenId}
                className={clsx(
                  'bg-white rounded-2xl border shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-4',
                  r.overdue ? 'border-rose-200' : 'border-slate-200',
                )}
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="w-16 shrink-0 text-center rounded-xl bg-slate-50 border border-slate-100 py-2">
                    <span className="block text-[10px] font-bold uppercase text-slate-400">{longDate(r.date).split(',')[0]}</span>
                    <span className="block text-lg font-black text-slate-900 leading-tight">{Number(r.date.slice(8, 10))}</span>
                    <span className="block text-[10px] font-bold text-teal-700">{token(r.tokenNumber)}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-slate-900 truncate">{r.patient?.name}</p>
                      {(r.patient?.age != null || r.patient?.gender) && (
                        <span className="text-[11px] text-slate-500">{[r.patient.age, r.patient.gender].filter((x) => x != null).join(' ')}</span>
                      )}
                      {badge && (
                        <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-bold border', badge.className)}>{badge.label}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {longDate(r.date)} · {SHIFT_LABEL[r.shift] || r.shift}
                      {r.startTime && ` (${t12(r.startTime)}–${t12(r.endTime)})`}
                    </p>
                    {r.note && <p className="text-xs text-slate-500 mt-0.5">“{r.note}”</p>}
                    <p className="text-[11px] text-slate-400 mt-1">
                      {r.status === FOLLOWUP_STATUS.PENDING
                        ? `${r.overdue ? 'Reply was due' : 'Reply by'} ${replyBy(r.respondBy)}`
                        : r.status === FOLLOWUP_STATUS.CONFIRMED ? `Confirmed ${replyBy(r.respondedAt)}`
                          : r.status === FOLLOWUP_STATUS.RELEASED ? `Released ${replyBy(r.releasedAt)}`
                            : `Declined ${replyBy(r.respondedAt)}`}
                      {r.source && ` · from the ${longDate(r.source.date)} visit`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 sm:justify-end">
                  {r.patient?.phone && (
                    <a
                      href={`tel:${r.patient.phone}`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:border-mg-teal hover:text-mg-teal"
                    >
                      <Icon name="phone" className="w-3.5 h-3.5" /> {phone(r.patient.phone)}
                    </a>
                  )}
                  {r.status === FOLLOWUP_STATUS.PENDING && open && (
                    <button
                      type="button"
                      onClick={() => onRelease(r)}
                      className={clsx(
                        'px-3 py-2 rounded-lg text-xs font-bold transition',
                        r.overdue ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-rose-50 text-rose-700 hover:bg-rose-100',
                      )}
                    >
                      Release slot
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
