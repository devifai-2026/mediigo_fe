import { useState, useEffect } from 'react';
import clsx from 'clsx';
import { api, unwrap } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Field, Textarea, Select } from '../ui/Field.jsx';
import { PRIORITY, CATEGORY, ROLE_TONE, COLUMNS } from '../../lib/tickets.js';
import { ROLE_LABEL } from '../../lib/constants.js';
import { shortDate, timeOf } from '../../lib/format.js';

export function TicketDetail({ ticketId, open, onClose, onChanged, canTriage }) {
  const toast = useToast();
  const [ticket, setTicket] = useState(null);
  const [comment, setComment] = useState('');
  const [internal, setInternal] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !ticketId) return;
    setTicket(null);
    setComment('');
    // Fetching also marks it read for this viewer, clearing the badge.
    api.get(`/api/tickets/${ticketId}`)
      .then((r) => setTicket(unwrap(r)))
      .catch((e) => toast.error(e.message));
  }, [open, ticketId, toast]);

  const act = async (fn, msg) => {
    setBusy(true);
    try {
      await fn();
      const fresh = unwrap(await api.get(`/api/tickets/${ticketId}`));
      setTicket(fresh);
      setComment('');
      if (msg) toast.success(msg);
      onChanged?.();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  const p = ticket ? (PRIORITY[ticket.priority] ?? PRIORITY.MEDIUM) : null;

  return (
    <Modal open={open} onClose={onClose} title={ticket?.title ?? 'Loading…'} subtitle={ticket?.ref} size="lg">
      {!ticket ? (
        <p className="text-xs text-slate-400 py-8 text-center">Loading ticket…</p>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded border uppercase', p.chip)}>{p.label}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
              {CATEGORY[ticket.category] ?? ticket.category}
            </span>
            <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded', ROLE_TONE[ticket.raisedByRole] ?? 'bg-slate-100')}>
              {ROLE_LABEL[ticket.raisedByRole] ?? ticket.raisedByRole}
            </span>
            {ticket.districtName && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">{ticket.districtName}</span>
            )}
          </div>

          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
            <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{ticket.body}</p>
            <p className="text-[10px] text-slate-400 mt-3">
              Raised by {ticket.raisedByName} · {shortDate(ticket.createdAt)} {timeOf(ticket.createdAt)}
              {ticket.hospitalName ? ` · ${ticket.hospitalName}` : ''}
            </p>
          </div>

          {canTriage && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Move to</span>
              {COLUMNS.map((c) => (
                <Button
                  key={c.key}
                  size="sm"
                  variant={ticket.status === c.key ? 'primary' : 'secondary'}
                  disabled={busy || ticket.status === c.key}
                  onClick={() => act(() => api.post(`/api/tickets/${ticket.id}/move`, { to: c.key }), `Moved to ${c.label}`)}
                >
                  {c.label}
                </Button>
              ))}
            </div>
          )}

          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
              Conversation ({ticket.comments?.length ?? 0})
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
              {(ticket.comments ?? []).length === 0 ? (
                <p className="text-[11px] text-slate-400 italic">No replies yet.</p>
              ) : ticket.comments.map((c, i) => (
                <div
                  key={i}
                  className={clsx(
                    'p-3 rounded-xl border text-xs',
                    c.internal ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200',
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-slate-800">{c.authorName}</span>
                    <span className={clsx('text-[9px] font-bold px-1.5 py-0.5 rounded', ROLE_TONE[c.authorRole] ?? 'bg-slate-100')}>
                      {ROLE_LABEL[c.authorRole] ?? c.authorRole}
                    </span>
                    {c.internal && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-200 text-amber-900">INTERNAL</span>
                    )}
                    <span className="text-[10px] text-slate-400 ml-auto">{shortDate(c.createdAt)} {timeOf(c.createdAt)}</span>
                  </div>
                  <p className="text-slate-700 whitespace-pre-wrap">{c.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write a reply…" rows={3} />
            <div className="flex items-center justify-between">
              {canTriage ? (
                <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-600 cursor-pointer">
                  <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} className="accent-amber-500 w-3.5 h-3.5" />
                  Internal note — hidden from whoever raised this
                </label>
              ) : <span />}
              <Button
                size="sm"
                loading={busy}
                disabled={!comment.trim()}
                onClick={() => act(() => api.post(`/api/tickets/${ticket.id}/comments`, { body: comment, internal }), 'Reply posted')}
              >
                Post reply
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
