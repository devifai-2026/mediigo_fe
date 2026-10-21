import { useState } from 'react';
import clsx from 'clsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useApi } from '../../hooks/useApi.js';
import { inr, timeOf } from '../../lib/format.js';
import { Button } from '../../components/ui/Button.jsx';
import { DeskCard, EmptyNote, LoadError, PageHeader, Pill, RefreshButton, StatTile } from '../../components/desk/ui.jsx';
import { PettyExpenseModal, VoidExpenseModal } from '../../components/desk/CashTools.jsx';
import { DateRangePicker, isoToday, rangeLabel } from '../../components/desk/DateRangePicker.jsx';

/**
 * Petty cash: money paid out of the desk drawer, each entry with a mandatory
 * remark. Entries are logged against today and are never edited — a mistake
 * is voided, which keeps the original visible in this list and the audit log.
 */
export default function PettyCashView() {
  const toast = useToast();
  const [range, setRange] = useState(() => ({ from: isoToday(), to: isoToday() }));
  const { data, error, refetch } = useApi(`/api/pos/ledger?from=${range.from}&to=${range.to}`);
  const [adding, setAdding] = useState(false);
  const [voiding, setVoiding] = useState(null);

  const entries = (data?.items ?? []).filter((i) => i.kind === 'EXPENSE');
  const active = entries.filter((e) => e.status === 'ACTIVE');
  const total = active.reduce((a, e) => a + e.originalAmount, 0);
  const multiDay = range.from !== range.to;

  return (
    <div className="space-y-5">
      <PageHeader
        icon="fa-wallet"
        tone="rose"
        title="Petty Cash"
        subtitle="Small expenses paid out of the desk drawer — every entry needs a remark"
      >
        <DateRangePicker value={range} onChange={setRange} />
        <RefreshButton onRefresh={refetch} />
        <Button onClick={() => setAdding(true)}>
          <i className="fa-solid fa-plus" aria-hidden="true" /> Add petty cash entry
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatTile label="Spent" value={inr(total)} icon="fa-receipt" tone="rose" hint={rangeLabel(range)} />
        <StatTile label="Entries" value={active.length} icon="fa-list" tone="blue" hint={`${entries.length - active.length} voided`} />
        <StatTile label="Largest entry" value={active.length ? inr(Math.max(...active.map((e) => e.originalAmount))) : '—'} icon="fa-arrow-up" tone="amber" />
      </div>

      {error && !data ? (
        <LoadError error={error} onRetry={refetch} what="petty cash entries" />
      ) : (
        <DeskCard className="overflow-hidden">
          {!data ? (
            <div className="h-40 animate-pulse bg-slate-50" />
          ) : !entries.length ? (
            <EmptyNote icon="fa-wallet" title={`No petty cash entries ${rangeLabel(range).toLowerCase()}`} hint="Entries are logged against today." />
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="bg-mg-surface/70 border-b border-slate-200 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-3 px-5">{multiDay ? 'Date & time' : 'Time'}</th>
                    <th className="py-3 px-4">Purpose</th>
                    <th className="py-3 px-4">Remark</th>
                    <th className="py-3 px-4">Logged by</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 align-top">
                  {entries.map((e) => {
                    const isVoid = e.status !== 'ACTIVE';
                    return (
                      <tr key={e.id} className={clsx(isVoid && 'bg-slate-50 text-slate-400')}>
                        <td className="py-3 px-5 font-mono whitespace-nowrap">{multiDay && <span className="font-sans mr-1.5">{e.date}</span>}{timeOf(e.at)}</td>
                        <td className={clsx('py-3 px-4 font-medium', isVoid ? 'line-through' : 'text-slate-900')}>{e.category}</td>
                        <td className="py-3 px-4">
                          {e.note || <span className="italic text-slate-400">No remark (logged before remarks were required)</span>}
                          {isVoid && <p className="text-[11px] text-rose-500 mt-0.5">Voided{e.voidReason ? ` — ${e.voidReason}` : ''}</p>}
                        </td>
                        <td className="py-3 px-4">{e.by || '—'}</td>
                        <td className={clsx('py-3 px-4 text-right font-semibold', isVoid ? 'line-through' : 'text-rose-600')}>{inr(e.originalAmount)}</td>
                        <td className="py-3 px-5 text-right">
                          {isVoid ? <Pill tone="slate">Void</Pill> : (
                            <button type="button" onClick={() => setVoiding(e)} className="text-[11px] font-medium text-rose-600 hover:underline">
                              Void
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </DeskCard>
      )}

      <PettyExpenseModal open={adding} onClose={() => setAdding(false)} onSaved={refetch} toast={toast} />
      <VoidExpenseModal expense={voiding} onClose={() => setVoiding(null)} onSaved={refetch} toast={toast} />
    </div>
  );
}
