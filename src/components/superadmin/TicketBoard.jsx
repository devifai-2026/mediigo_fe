import clsx from 'clsx';
import { COLUMNS, PRIORITY, ROLE_TONE, CATEGORY } from '../../lib/tickets.js';
import { ROLE_LABEL } from '../../lib/constants.js';
import { shortDate, timeOf } from '../../lib/format.js';

/**
 * Kanban board. Admins can drag a card between columns; everyone else gets a
 * read-only view of their own tickets.
 */
export function TicketBoard({ tickets, onOpen, onMove, canTriage }) {
  const onDrop = (status) => (e) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (id) onMove?.(id, status);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {COLUMNS.map((col) => {
        const items = tickets.filter((t) => t.status === col.key);
        return (
          <div
            key={col.key}
            onDragOver={canTriage ? (e) => e.preventDefault() : undefined}
            onDrop={canTriage ? onDrop(col.key) : undefined}
            className={clsx('bg-slate-50 rounded-2xl border border-slate-200 border-t-4 p-3 min-h-[240px]', col.accent)}
          >
            <div className="flex items-center justify-between px-1 pb-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600">{col.label}</h3>
              <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded-full', col.chip)}>{items.length}</span>
            </div>

            <div className="space-y-2">
              {items.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic px-1 py-6 text-center">Nothing here.</p>
              ) : items.map((t) => {
                const p = PRIORITY[t.priority] ?? PRIORITY.MEDIUM;
                return (
                  <button
                    key={t.id}
                    type="button"
                    draggable={canTriage}
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', t.id)}
                    onClick={() => onOpen(t)}
                    className={clsx(
                      'w-full text-left bg-white rounded-xl border p-3 shadow-sm hover:shadow-md transition',
                      t.unread ? 'border-indigo-300 ring-1 ring-indigo-100' : 'border-slate-200',
                      canTriage && 'cursor-grab active:cursor-grabbing',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-mono font-bold text-slate-400">{t.ref}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {t.unread && <span className="w-2 h-2 rounded-full bg-indigo-500" title="Unread" />}
                        <span className={clsx('text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase', p.chip)}>
                          {p.label}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs font-bold text-slate-900 mt-1.5 leading-snug">{t.title}</p>

                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <span className={clsx('text-[9px] font-bold px-1.5 py-0.5 rounded', ROLE_TONE[t.raisedByRole] ?? 'bg-slate-100 text-slate-600')}>
                        {ROLE_LABEL[t.raisedByRole] ?? t.raisedByRole}
                      </span>
                      <span className="text-[10px] text-slate-400">{t.raisedByName}</span>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                      <span>{CATEGORY[t.category] ?? t.category}</span>
                      <span className="flex items-center gap-2">
                        {t.commentCount > 0 && (
                          <span><i className="fa-solid fa-comment mr-0.5" />{t.commentCount}</span>
                        )}
                        {shortDate(t.createdAt)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
