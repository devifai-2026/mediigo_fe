/**
 * Download rows as a CSV file. `columns` is [[header, row => value], ...].
 *
 * Every cell is quoted, and a value starting with = + - or @ is prefixed with
 * an apostrophe: a clinic or patient name like "=HYPERLINK(...)" would
 * otherwise run as a formula when the file is opened in Excel.
 */
export const downloadCsv = (filename, columns, rows) => {
  const cell = (v) => {
    let s = v == null ? '' : String(v);
    // Numbers stay numbers; only text can smuggle a formula.
    if (typeof v !== 'number' && /^[=+\-@]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  };
  const lines = [
    columns.map(([h]) => cell(h)).join(','),
    ...rows.map((r) => columns.map(([, get]) => cell(get(r))).join(',')),
  ];
  // BOM so Excel reads ₹ and other non-ASCII text correctly.
  const blob = new Blob([`﻿${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
