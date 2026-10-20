import clsx from 'clsx';
import { inr, token } from '../../lib/format.js';
import { TOKEN_STATUS } from '../../lib/constants.js';
import { followUpBadge, FOLLOWUP_STATUS } from '../../lib/followUps.js';
import { OUTCOME_LABEL, pad2, patientLine } from './deskFormat.js';
import { DeskCard, Pill, Segmented, StatTile, EmptyNote, RefreshButton } from './ui.jsx';

export { DeskCard, AudioUnlockBanner } from './ui.jsx';

/** The four counters under the chamber hero. */
export function DeskStats({ counts = {} }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <StatTile label="Total Registered" value={pad2(counts.total)} icon="fa-user-group" tone="blue" tag="All Patients" tagTone="blue" />
      <StatTile label="Completed Today" value={pad2(counts.completed)} icon="fa-circle-check" tone="emerald" tag="Finished" tagTone="emerald" />
      <StatTile label="Waiting Queue" value={pad2(counts.waiting)} icon="fa-user-clock" tone="amber" tag="In Queue" tagTone="amber" />
      <StatTile label="Skipped Tokens" value={pad2(counts.skipped)} icon="fa-user-minus" tone="rose" tag="On Hold" />
    </div>
  );
}

/** Patients skipped today, each one tap from going back into the queue. */
export function SkippedPanel({ tokens = [], onRestore, busy }) {
  const skipped = tokens.filter((t) => t.status === TOKEN_STATUS.SKIPPED);

  return (
    <DeskCard className="p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <h3 className="flex items-center gap-2 text-[15px] font-semibold text-slate-900">
          <i className="fa-solid fa-triangle-exclamation text-amber-500" aria-hidden="true" />
          Skipped Tokens Quick Management Menu
        </h3>
        <Pill tone="amber">{pad2(skipped.length)} Skipped</Pill>
      </div>
      {skipped.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3">
          {skipped.map((t) => (
            <div key={t.tokenId} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50/60">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-amber-900 truncate">{token(t.tokenNumber)} – {t.name}</p>
                <p className="text-[11px] text-amber-700 truncate mt-0.5">{t.skipReason || t.complaint || 'Missed their call'}</p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => onRestore?.(t)}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium shadow-sm transition disabled:opacity-50"
              >
                Recall Now
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="pt-3 text-xs italic text-slate-400">No skipped tokens on hold.</p>
      )}
    </DeskCard>
  );
}

const STATUS_PILL = {
  [TOKEN_STATUS.IN_CHAMBER]: ['In Chamber', 'teal'],
  [TOKEN_STATUS.WAITING]: ['Waiting', 'amber'],
  [TOKEN_STATUS.SKIPPED]: ['Skipped', 'rose'],
  [TOKEN_STATUS.COMPLETED]: ['Completed', 'emerald'],
};

export const ROSTER_FILTERS = [
  { value: 'ALL', label: 'All' },
  { value: TOKEN_STATUS.WAITING, label: 'Waiting' },
  { value: TOKEN_STATUS.IN_CHAMBER, label: 'In Chamber' },
  { value: TOKEN_STATUS.COMPLETED, label: 'Done' },
  { value: TOKEN_STATUS.SKIPPED, label: 'Skipped' },
];

function ActionButton({ children, tone = 'plain', ...rest }) {
  return (
    <button
      type="button"
      className={clsx(
        'px-2.5 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap disabled:opacity-50',
        tone === 'plain' && 'bg-slate-100 hover:bg-slate-200 text-slate-700',
        tone === 'teal' && 'bg-mg-teal hover:bg-mg-tealDark text-white',
        tone === 'tealSoft' && 'bg-teal-50 hover:bg-teal-100 text-mg-teal',
        tone === 'rose' && 'bg-rose-50 hover:bg-rose-100 text-rose-700',
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/**
 * The day's full queue, with per-row actions.
 *
 * Actions: IN_CHAMBER (call), SKIPPED, COMPLETED, RECALL (re-announce the
 * patient already inside), RESTORE (skipped → back in the queue),
 * RECALL_COMPLETED (bring a finished patient back), RELEASE_FOLLOWUP (free a
 * follow-up slot nobody confirmed) and RX (open the
 * prescription pad for that patient — doctors only).
 */
export function DeskRoster({ snapshot: s, filter, onFilter, onAction, onRefresh, busy, canPrescribe = false, canCancel = false }) {
  const tokens = s?.tokens ?? [];
  const rows = filter === 'ALL' ? tokens : tokens.filter((t) => t.status === filter);
  const counts = {
    ALL: tokens.length,
    [TOKEN_STATUS.WAITING]: s?.counts?.waiting ?? 0,
    [TOKEN_STATUS.IN_CHAMBER]: tokens.filter((t) => t.status === TOKEN_STATUS.IN_CHAMBER).length,
    [TOKEN_STATUS.COMPLETED]: s?.counts?.completed ?? 0,
    [TOKEN_STATUS.SKIPPED]: s?.counts?.skipped ?? 0,
  };

  return (
    <DeskCard className="overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-4 bg-mg-surface/50 border-b border-slate-200">
        <div>
          <h3 className="text-base font-semibold text-slate-900">OPD Queue Roster</h3>
          <p className="text-xs text-slate-500">Real-time status management &amp; sequence controller</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented value={filter} onChange={onFilter} options={ROSTER_FILTERS.map((o) => ({ ...o, count: counts[o.value] }))} />
          {onRefresh && <RefreshButton onRefresh={onRefresh} />}
        </div>
      </div>

      {!rows.length ? (
        <EmptyNote icon="fa-list-check" title="No tokens here" hint="Registered patients will appear in this list." />
      ) : (
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full min-w-[880px] text-left">
            <thead className="bg-mg-surface/70 border-b border-slate-200 text-[11px] font-medium uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 px-5 w-[84px]">Token</th>
                <th className="py-3 px-4">Patient Name &amp; Disease</th>
                <th className="py-3 px-4">Assigned Doctor</th>
                <th className="py-3 px-4">Visit &amp; Fee</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-5 text-right">Queue Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {rows.map((t) => {
                const [statusLabel, statusTone] = STATUS_PILL[t.status] ?? [t.status, 'slate'];
                const urgent = t.isEmergency && t.status !== TOKEN_STATUS.COMPLETED;
                const fu = t.followUpStatus ? followUpBadge(t.followUpStatus, t.followUpRespondBy) : null;
                return (
                  <tr key={t.tokenId} className={clsx('transition-colors', urgent ? 'bg-rose-50/60 hover:bg-rose-50' : 'hover:bg-slate-50/70')}>
                    <td className={clsx('py-3.5 px-5 text-sm font-semibold', urgent ? 'text-rose-700' : 'text-mg-navy')}>
                      {token(t.tokenNumber)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[13px] font-medium text-slate-900">{t.name}</p>
                        {/* Online = the patient booked it themselves; In-clinic =
                            booked here at the desk. Both are seen in person. */}
                        <span className={clsx(
                          'text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full border',
                          t.bookedOnline ? 'bg-blue-50 text-mg-blue border-blue-200' : 'bg-slate-50 text-slate-500 border-slate-200',
                        )}>
                          {t.bookedOnline ? 'Online' : 'In-clinic'}
                        </span>
                        {t.isEmergency && (
                          <span className={clsx(
                            'text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full',
                            urgent ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-500',
                          )}>
                            Emergency
                          </span>
                        )}
                        {fu && (
                          <span className={clsx('px-1.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border', fu.className)}>
                            Follow-up · {fu.label}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {[patientLine(t, { yrs: 'yrs' }), t.complaint].filter(Boolean).join(' • ') || '—'}
                      </p>
                      {t.conditions?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {t.conditions.map((c) => (
                            <span key={c} className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">{c}</span>
                          ))}
                        </div>
                      )}
                      {t.skipReason && t.status === TOKEN_STATUS.SKIPPED && (
                        <p className="text-[10px] text-rose-500 mt-0.5">{t.skipReason}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-[13px] text-slate-700">{s?.doctorName || '—'}</td>
                    <td className="py-3.5 px-4">
                      <p className="text-[13px] font-semibold text-mg-blue">{t.fee != null ? inr(t.fee) : '—'}</p>
                      <p className="text-[10px] font-medium uppercase text-slate-400 mt-0.5">
                        {[t.visitType || 'fresh', t.paymentMode || (t.fee == null ? 'Unbilled' : null)].filter(Boolean).join(' • ')}
                      </p>
                    </td>
                    <td className="py-3.5 px-4">
                      <Pill tone={statusTone} className="!text-[10px] !font-semibold uppercase">
                        {t.status === TOKEN_STATUS.IN_CHAMBER && <span className="w-1.5 h-1.5 rounded-full bg-mg-teal animate-pulse" />}
                        {statusLabel}
                      </Pill>
                      {t.status === TOKEN_STATUS.COMPLETED && t.outcome && t.outcome !== 'DONE' && (
                        <p className="text-[10px] font-medium text-mg-blue mt-1">{OUTCOME_LABEL[t.outcome]}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center justify-end gap-1.5">
                        {t.status === TOKEN_STATUS.WAITING && (
                          <>
                            {t.followUpStatus === FOLLOWUP_STATUS.PENDING && (
                              <ActionButton tone="rose" disabled={busy} title="Patient has not confirmed — free this slot" onClick={() => onAction('RELEASE_FOLLOWUP', t)}>
                                Release
                              </ActionButton>
                            )}
                            <ActionButton disabled={busy} title="Skip this token" onClick={() => onAction('SKIPPED', t)}>
                              <i className="fa-solid fa-forward" aria-hidden="true" />
                              <span className="sr-only">Skip</span>
                            </ActionButton>
                            <ActionButton tone="teal" disabled={busy} title="Call into the chamber" onClick={() => onAction('IN_CHAMBER', t)}>
                              Call
                            </ActionButton>
                            {canCancel && (
                              <ActionButton tone="rose" disabled={busy} title="Cancel this token" onClick={() => onAction('CANCEL', t)}>
                                <i className="fa-solid fa-ban" aria-hidden="true" />
                                <span className="sr-only">Cancel</span>
                              </ActionButton>
                            )}
                          </>
                        )}
                        {t.status === TOKEN_STATUS.IN_CHAMBER && (
                          <>
                            <ActionButton disabled={busy} title="Re-announce this patient" onClick={() => onAction('RECALL', t)}>
                              Recall
                            </ActionButton>
                            <ActionButton tone="tealSoft" disabled={busy} title="Mark complete" onClick={() => onAction('COMPLETED', t)}>
                              <i className="fa-solid fa-check" aria-hidden="true" />
                              <span className="sr-only">Mark complete</span>
                            </ActionButton>
                          </>
                        )}
                        {t.status === TOKEN_STATUS.SKIPPED && (
                          <>
                            <ActionButton disabled={busy} title="Put back into the queue" onClick={() => onAction('RESTORE', t)}>
                              Recall / Call
                            </ActionButton>
                            {canCancel && (
                              <ActionButton tone="rose" disabled={busy} title="Cancel — the patient is not coming back" onClick={() => onAction('CANCEL', t)}>
                                <i className="fa-solid fa-ban" aria-hidden="true" />
                                <span className="sr-only">Cancel</span>
                              </ActionButton>
                            )}
                          </>
                        )}
                        {canPrescribe && [TOKEN_STATUS.IN_CHAMBER, TOKEN_STATUS.COMPLETED].includes(t.status) && (
                          <ActionButton tone="tealSoft" title="Write a prescription" onClick={() => onAction('RX', t)}>
                            <i className="fa-solid fa-file-prescription" aria-hidden="true" /> Rx
                          </ActionButton>
                        )}
                        {t.status === TOKEN_STATUS.COMPLETED && (
                          <ActionButton disabled={busy} title="Bring this patient back — into the chamber if it is free" onClick={() => onAction('RECALL_COMPLETED', t)}>
                            <i className="fa-solid fa-rotate-left" aria-hidden="true" /> Recall
                          </ActionButton>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </DeskCard>
  );
}
