import { useState } from 'react';
import clsx from 'clsx';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useConfirm } from '../../context/ConfirmContext.jsx';
import { api } from '../../lib/api.js';
import { Button } from '../../components/ui/Button.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { SkeletonRows } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';

/**
 * Review moderation.
 *
 * Nothing a patient writes is public until it passes through here, so the
 * queue has to be fast to work: the pending tab is the default, and approve
 * is one tap. Editing is for stripping a phone number or a named third
 * party — the rating itself is never editable, because a published average
 * built from scores an admin adjusted would be a number nobody gave.
 */

const Stars = ({ n }) => (
  <span className="inline-flex items-center gap-0.5" aria-label={`${n} out of 5`}>
    {[1, 2, 3, 4, 5].map((i) => (
      <svg key={i} viewBox="0 0 24 24" className={clsx('w-3.5 h-3.5', i <= n ? 'text-amber-400' : 'text-slate-200')} fill="currentColor" aria-hidden="true">
        <path d="M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6-5.9-3.2-5.9 3.2 1.2-6.6L2.5 9.5l6.6-.9L12 2.5z" />
      </svg>
    ))}
  </span>
);

const TABS = [
  ['PENDING', 'Pending'],
  ['APPROVED', 'Published'],
  ['REJECTED', 'Rejected'],
  ['', 'All'],
];

export default function ReviewsView() {
  const [tab, setTab] = useState('PENDING');
  const { data, loading, refetch } = useApi(`/api/reviews/moderation${tab ? `?status=${tab}` : ''}`, { deps: [tab] });
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();

  const act = async (row, action, comment) => {
    setBusy(true);
    try {
      await api.post(`/api/reviews/${row.id}/moderate`, { action, ...(comment !== undefined ? { comment } : {}) });
      toast.success(
        action === 'APPROVE' ? 'Review published'
          : action === 'REJECT' ? 'Review rejected — it stays hidden'
            : 'Review deleted',
      );
      setEditing(null);
      refetch();
    } catch (e) {
      toast.error(e?.response?.data?.error?.message || e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row) => {
    const ok = await confirm({
      title: 'Delete this review?',
      message: `${row.rating}★ for ${row.doctorName} will be removed permanently.`,
      detail: 'Rejecting hides it instead, and can be undone. Deleting cannot.',
      confirmLabel: 'Delete permanently',
      danger: true,
    });
    if (ok) act(row, 'DELETE');
  };

  const rows = data || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <h2 className="text-lg font-black text-slate-900 mr-auto">Patient reviews</h2>
        {TABS.map(([k, label]) => (
          <button
            key={k || 'all'} type="button" onClick={() => setTab(k)}
            className={clsx(
              'text-[11px] font-bold px-3 py-1.5 rounded-full border transition',
              tab === k ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? <SkeletonRows rows={4} /> : rows.length === 0 ? (
        <EmptyState
          icon="check"
          title={tab === 'PENDING' ? 'Nothing waiting' : 'No reviews here'}
          hint={tab === 'PENDING' ? 'Every review has been looked at.' : undefined}
        />
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Stars n={r.rating} />
                    <span className="text-sm font-bold text-slate-900">{r.doctorName}</span>
                    {r.rating <= 2 && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                        Low rating
                      </span>
                    )}
                    {r.edited && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                        Edited
                      </span>
                    )}
                    <span className={clsx(
                      'text-[9px] font-bold px-2 py-0.5 rounded-full border',
                      r.status === 'APPROVED' ? 'bg-teal-50 text-teal-700 border-teal-200'
                        : r.status === 'REJECTED' ? 'bg-slate-100 text-slate-500 border-slate-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200',
                    )}>
                      {r.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {r.patientName || 'Patient'} · visited {r.visitDate}
                  </p>

                  {editing === r.id ? (
                    <textarea
                      rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={1000}
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-mg-teal"
                    />
                  ) : (
                    <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">
                      {r.comment || <span className="text-slate-400 italic">No comment — rating only</span>}
                    </p>
                  )}

                  {r.edited && editing !== r.id && (
                    <details className="mt-1.5">
                      <summary className="text-[10px] text-slate-400 cursor-pointer hover:text-slate-600">
                        Show what the patient originally wrote
                      </summary>
                      <p className="text-[11px] text-slate-500 mt-1 pl-2 border-l-2 border-slate-200 whitespace-pre-wrap">
                        {r.originalComment}
                      </p>
                    </details>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {editing === r.id ? (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => setEditing(null)} disabled={busy}>Cancel</Button>
                      <Button size="sm" onClick={() => act(r, 'APPROVE', draft)} disabled={busy}>Save &amp; publish</Button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button" title="Edit the wording"
                        onClick={() => { setEditing(r.id); setDraft(r.comment); }}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:border-slate-400"
                      >
                        <Icon name="doc" className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button" title="Delete permanently" onClick={() => remove(r)}
                        className="p-1.5 rounded-lg border border-slate-200 text-rose-500 hover:border-rose-400"
                      >
                        <Icon name="cross" className="w-3.5 h-3.5" />
                      </button>
                      {r.status !== 'REJECTED' && (
                        <Button size="sm" variant="secondary" onClick={() => act(r, 'REJECT')} disabled={busy}>Reject</Button>
                      )}
                      {r.status !== 'APPROVED' && (
                        <Button size="sm" onClick={() => act(r, 'APPROVE')} disabled={busy}>Approve</Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
