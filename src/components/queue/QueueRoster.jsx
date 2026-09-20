import clsx from 'clsx';
import { StatusBadge } from '../ui/StatusBadge.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';
import { Icon } from '../ui/Icon.jsx';
import { token } from '../../lib/format.js';
import { TOKEN_STATUS } from '../../lib/constants.js';

export function QueueRoster({ tokens = [], onAction, readOnly = false, filter = 'ALL' }) {
  const rows = filter === 'ALL' ? tokens : tokens.filter((t) => t.status === filter);

  if (!rows.length) {
    return <EmptyState icon="list" title="No tokens here" hint="Registered patients will appear in this list." />;
  }

  return (
    <div className="overflow-x-auto custom-scrollbar">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
          <tr>
            <th className="py-3 px-4">Token</th>
            <th className="py-3 px-4">Patient</th>
            <th className="py-3 px-4 text-center">Status</th>
            {!readOnly && <th className="py-3 px-4 text-right">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
          {rows.map((t) => (
            <tr key={t.tokenId} className="hover:bg-slate-50/80 transition-colors">
              <td className="py-3.5 px-4 font-black text-teal-700 text-sm">{token(t.tokenNumber)}</td>
              <td className="py-3.5 px-4">
                <p className="font-bold text-slate-900">{t.name}</p>
                {t.skipReason && <p className="text-[10px] text-rose-500">{t.skipReason}</p>}
              </td>
              <td className="py-3.5 px-4 text-center">
                <StatusBadge status={t.status} pulse={t.status === TOKEN_STATUS.IN_CHAMBER} className="mx-auto" />
              </td>
              {!readOnly && (
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-1.5 justify-end">
                    {t.status === TOKEN_STATUS.WAITING && (
                      <>
                        <button
                          type="button" title="Call into chamber"
                          onClick={() => onAction?.('IN_CHAMBER', t)}
                          className="p-2 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-lg"
                        >
                          <Icon name="megaphone" className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button" title="Skip"
                          onClick={() => onAction?.('SKIPPED', t)}
                          className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg"
                        >
                          <Icon name="chevronRight" className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    {t.status === TOKEN_STATUS.IN_CHAMBER && (
                      <button
                        type="button" title="Mark complete"
                        onClick={() => onAction?.('COMPLETED', t)}
                        className="p-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg"
                      >
                        <Icon name="check" className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {t.status === TOKEN_STATUS.SKIPPED && (
                      <button
                        type="button" title="Recall into the queue"
                        onClick={() => onAction?.('RESTORE', t)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold"
                      >
                        Recall
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SkippedDrawer({ tokens = [], onRestore }) {
  const skipped = tokens.filter((t) => t.status === TOKEN_STATUS.SKIPPED);
  if (!skipped.length) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-900">Skipped patients</h3>
        <span className="text-xs bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full font-bold border border-amber-200">
          {skipped.length} on hold
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {skipped.map((t) => (
          <div key={t.tokenId} className="flex items-center justify-between p-3 bg-amber-50/60 border border-amber-200 rounded-xl gap-2">
            <div className="min-w-0">
              <span className="font-black text-amber-800 text-sm">{token(t.tokenNumber)}</span>
              <p className="font-bold text-slate-900 text-xs truncate">{t.name}</p>
            </div>
            <button
              type="button"
              onClick={() => onRestore?.(t)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold shadow-sm shrink-0"
            >
              Recall
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
