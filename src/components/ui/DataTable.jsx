import { useState, useMemo } from 'react';
import clsx from 'clsx';
import { EmptyState } from './EmptyState.jsx';
import { Icon } from './Icon.jsx';

/**
 * Sortable, paginated table with CSV export — all three absent from the
 * prototype's directory, which rendered an unbounded unsorted list.
 */
export function DataTable({ columns, rows, keyField = '_id', onRowClick, pageSize = 25, empty, exportName }) {
  const [sort, setSort] = useState({ key: null, dir: 'asc' });
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sort.key) return rows;
    const col = columns.find((c) => c.key === sort.key);
    const get = col?.sortValue || ((r) => r[sort.key]);
    return [...rows].sort((a, b) => {
      const av = get(a); const bv = get(b);
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [rows, sort, columns]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pages - 1);
  const slice = sorted.slice(current * pageSize, (current + 1) * pageSize);

  const toggleSort = (key) =>
    setSort((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }));

  const exportCsv = () => {
    const header = columns.map((c) => `"${c.label}"`).join(',');
    const body = sorted
      .map((r) => columns.map((c) => `"${String(c.csv ? c.csv(r) : (c.sortValue ? c.sortValue(r) : r[c.key]) ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exportName || 'export'}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!rows.length) return empty || <EmptyState title="Nothing here yet" />;

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto custom-scrollbar -mx-1 px-1">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={clsx('py-3 px-4 whitespace-nowrap', c.align === 'right' && 'text-right', c.align === 'center' && 'text-center', c.sortable !== false && 'cursor-pointer select-none hover:text-slate-700')}
                  onClick={c.sortable === false ? undefined : () => toggleSort(c.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {c.label}
                    {sort.key === c.key && <span className="text-teal-600">{sort.dir === 'asc' ? '↑' : '↓'}</span>}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {slice.map((row) => (
              <tr
                key={row[keyField]}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={clsx('hover:bg-slate-50/80 transition-colors', onRowClick && 'cursor-pointer')}
              >
                {columns.map((c) => (
                  <td key={c.key} className={clsx('py-3.5 px-4', c.align === 'right' && 'text-right', c.align === 'center' && 'text-center', c.cellClass)}>
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-3 text-[11px] text-slate-500 font-semibold">
        <span>
          {current * pageSize + 1}–{Math.min((current + 1) * pageSize, sorted.length)} of {sorted.length}
        </span>
        <div className="flex items-center gap-2">
          {exportName && (
            <button type="button" onClick={exportCsv} className="px-2.5 py-1 rounded-lg hover:bg-slate-100 text-teal-700 font-bold">
              Export CSV
            </button>
          )}
          {pages > 1 && (
            <>
              <button type="button" disabled={current === 0} onClick={() => setPage(current - 1)} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40">
                <Icon name="chevronRight" className="w-3.5 h-3.5 rotate-180" />
              </button>
              <span>{current + 1} / {pages}</span>
              <button type="button" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40">
                <Icon name="chevronRight" className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
