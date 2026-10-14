import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useApi } from '../../hooks/useApi.js';
import { ROLES, VISIT_LABEL } from '../../lib/constants.js';
import { inr, timeOf, token } from '../../lib/format.js';
import { Button } from '../../components/ui/Button.jsx';
import { Select } from '../../components/ui/Field.jsx';
import { MoneyInput } from '../../components/ui/MoneyInput.jsx';
import {
  Avatar, DeskCard, EmptyNote, IconTile, LoadError, PageHeader, Pill, PrintPortal, SectionHead, Segmented, StatTile,
} from '../../components/desk/ui.jsx';
import { PettyExpenseModal, VoidExpenseModal, ShiftReport } from '../../components/desk/CashTools.jsx';
import { pad2, patientLine } from '../../components/desk/deskFormat.js';
import {
  DateRangePicker, PRESETS, isoToday, presetOf, rangeLabel,
} from '../../components/desk/DateRangePicker.jsx';

// One-tap shortcuts beside the calendar; anything else is picked from it.
const QUICK = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Last 7 Days' },
  { value: 'month', label: 'Last 30 Days' },
];

/** The window in a sentence: "today", "11 Oct 2026", "1 Oct – 12 Oct 2026". */
const rangeText = (r) => {
  const l = rangeLabel(r);
  return l === 'Today' ? 'today' : l === 'Yesterday' ? 'yesterday' : l;
};

const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

const dayLabel = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

// A chart bucket: a day ('2026-10-11') or, over long ranges, a month ('2026-10').
const bucketLabel = (label, bucket) => (bucket === 'month'
  ? new Date(`${label}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
  : dayLabel(label));

function Bar({ label, value, max, display, tone = 'teal', note }) {
  const width = max > 0 ? Math.max(value > 0 ? 3 : 0, (value / max) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between gap-3 text-xs mb-1">
        <span className="text-slate-700 font-medium">{label}{note}</span>
        <span className="text-slate-900 font-medium shrink-0">{display}</span>
      </div>
      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all', {
            teal: 'bg-mg-teal', blue: 'bg-mg-blue', emerald: 'bg-emerald-500', slate: 'bg-slate-300', amber: 'bg-amber-500',
          }[tone])}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Analytics: Revenue and Patient Footfall over a window, for the clinic or one
 * doctor. A doctor sees their own numbers only — the server enforces that, the
 * picker is simply not shown to them.
 */
export default function AnalyticsView() {
  const { user, role } = useAuth();
  const toast = useToast();
  const isDoctor = role === ROLES.DOCTOR;
  const [view, setView] = useState('REVENUE');
  const [range, setRange] = useState(() => ({ from: isoToday(), to: isoToday() }));
  const single = range.from === range.to;
  const viewingToday = single && range.from === isoToday();
  const preset = presetOf(range);
  const [doctorId, setDoctorId] = useState('');

  const { data: doctors } = useApi(isDoctor ? null : '/api/doctors', { skip: isDoctor });
  const doc = doctorId ? `&doctorId=${doctorId}` : '';
  const q = `from=${range.from}&to=${range.to}${doc}`;
  const { data: analytics, error: analyticsError, refetch: refetchAnalytics } = useApi(`/api/pos/analytics?${q}`);
  const { data: ledger, error: ledgerError, refetch: refetchLedger } = useApi(`/api/pos/ledger?${q}`);
  // Day close reconciles one drawer on one day, so it only exists for a single date.
  const dayCloseUrl = single ? `/api/pos/day-close?date=${range.from}${doc}` : null;
  const { data: dayCloseData, error: dayCloseError, refetch: refetchDayClose } = useApi(dayCloseUrl, { skip: !single });
  const dayClose = single ? dayCloseData : null;
  const { data: footfall, error: footfallError, refetch: refetchFootfall } = useApi(`/api/pos/footfall?${q}`);

  // An older server ignores the chosen dates and answers for its own default
  // window. Showing those figures under the chosen dates would be wrong, so
  // say so instead.
  const rangeMismatch = analytics && analytics.from && (analytics.from !== range.from || analytics.to !== range.to);

  const [pettyOpen, setPettyOpen] = useState(false);
  const [voiding, setVoiding] = useState(null);
  const [printing, setPrinting] = useState(false);

  const refreshMoney = () => { refetchAnalytics(); refetchLedger(); if (single) refetchDayClose(); };
  const footfallView = view === 'FOOTFALL';
  const doctorName = doctors?.find((d) => d._id === doctorId)?.name;

  return (
    <div className="space-y-5">
      <PageHeader
        icon={footfallView ? 'fa-users' : 'fa-indian-rupee-sign'}
        tone="blue"
        title={footfallView ? 'Patient Footfall Analytics' : 'Revenue Analytics'}
        subtitle={footfallView
          ? 'Patient traffic volume, peak hours & OPD density'
          : 'Collection metrics, payment channels & the financial ledger'}
        badge={<Pill tone="emerald">Real-Time Audit</Pill>}
      >
        <label className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-mg-surface text-xs">
          <span className="text-slate-500"><i className="fa-solid fa-chart-pie text-mg-teal mr-1" aria-hidden="true" />View:</span>
          <select
            value={view}
            onChange={(e) => setView(e.target.value)}
            className="bg-transparent font-medium text-slate-900 focus:outline-none cursor-pointer"
            aria-label="Analytics view"
          >
            <option value="REVENUE">Revenue Analytics</option>
            <option value="FOOTFALL">Patient Footfall Analytics</option>
          </select>
        </label>
        <Segmented
          value={preset ?? ''}
          onChange={(k) => setRange(PRESETS.find((p) => p.key === k).range(isoToday()))}
          options={QUICK}
        />
        <DateRangePicker value={range} onChange={setRange} />
        {!isDoctor && doctors?.length > 1 && (
          <Select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} className="!w-auto !py-1.5" aria-label="Doctor">
            <option value="">All doctors</option>
            {doctors.map((d) => <option key={d._id} value={d._id}>{d.name}{d.specialty ? ` (${d.specialty})` : ''}</option>)}
          </Select>
        )}
        <Button
          variant="secondary" size="sm" onClick={() => setPrinting(true)} disabled={!dayClose}
          title={single ? `Print the shift report for ${rangeText(range)}` : 'The shift report is for a single day — pick one date'}
        >
          <i className="fa-solid fa-print" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">Report</span>
        </Button>
      </PageHeader>

      {rangeMismatch && (
        <DeskCard className="p-4 border-amber-200 bg-amber-50/60 text-xs text-amber-900 flex items-start gap-3">
          <i className="fa-solid fa-triangle-exclamation text-amber-500 mt-0.5" aria-hidden="true" />
          <span>
            The server returned figures for <strong className="font-medium">{analytics.from} – {analytics.to}</strong>, not the dates you picked
            ({range.from} – {range.to}). It is running an older version — update the backend for date filtering to work.
          </span>
        </DeskCard>
      )}

      {footfallView ? (
        <FootfallSection
          analytics={analytics} footfall={footfall} range={range}
          analyticsError={analyticsError} footfallError={footfallError}
          onRetry={() => { refetchAnalytics(); refetchFootfall(); }}
        />
      ) : (
        <RevenueSection
          analytics={analytics}
          ledger={ledger}
          dayClose={dayClose}
          errors={{ analytics: analyticsError, ledger: ledgerError, dayClose: single ? dayCloseError : null }}
          onRetry={refreshMoney}
          range={range}
          canManageCash={!isDoctor && !doctorId}
          canLogExpense={viewingToday}
          onLogExpense={() => setPettyOpen(true)}
          onVoid={setVoiding}
          onReport={() => setPrinting(true)}
        />
      )}

      <PettyExpenseModal open={pettyOpen} onClose={() => setPettyOpen(false)} onSaved={refreshMoney} toast={toast} />
      <VoidExpenseModal expense={voiding} onClose={() => setVoiding(null)} onSaved={refreshMoney} toast={toast} />

      <PrintPortal active={printing} onDone={() => setPrinting(false)} page="A4">
        <ShiftReport
          clinicName={[dayClose?.hospitalName, isDoctor ? user?.name : doctorName].filter(Boolean).join(' — ')}
          dayClose={dayClose}
          ledger={ledger}
          byDoctor={single ? (analytics?.byDoctor ?? []) : []}
          preparedBy={user?.name}
        />
      </PrintPortal>
    </div>
  );
}

// ---- Revenue ---------------------------------------------------------------

function RevenueSection({ analytics, ledger, dayClose, range, canManageCash, canLogExpense, onLogExpense, onVoid, onReport, errors = {}, onRetry }) {
  const single = range.from === range.to;
  if (errors.analytics && !analytics) {
    return (
      <div className="space-y-5">
        <LoadError error={errors.analytics} onRetry={onRetry} what="revenue analytics" />
        {errors.ledger ? <LoadError error={errors.ledger} onRetry={onRetry} what="the ledger" /> : <LedgerTable ledger={ledger} canVoid={canManageCash} onVoid={onVoid} range={range} />}
      </div>
    );
  }
  if (!analytics) return <div className="h-64 rounded-xl bg-white border border-slate-200 animate-pulse" />;

  const t = analytics.accounts.totals;
  const petty = analytics.pettyCash ?? { total: 0, count: 0 };
  const digital = t.upi + t.card;
  const avg = t.count ? t.total / t.count : 0;
  const visit = Object.fromEntries(analytics.accounts.byVisitType.map((v) => [v.visitType, v]));
  const series = analytics.accounts.series;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatTile dark label="Gross Revenue" value={inr(t.total)} icon="fa-indian-rupee-sign" hint={`${t.count} receipts · ${rangeText(range)}`} />
        <StatTile label="Cash-in-Hand" value={inr(t.cash - petty.total)} icon="fa-money-bill-wave" tone="emerald" hint={petty.total ? `After ${inr(petty.total)} petty cash` : 'No petty cash spent'} />
        <StatTile label="Digital (UPI/Card)" value={inr(digital)} icon="fa-qrcode" tone="blue" hint="Directly deposited" />
        <StatTile label="Petty Cash Spent" value={inr(petty.total)} icon="fa-receipt" tone="rose" hint={`${petty.count} entr${petty.count === 1 ? 'y' : 'ies'} · from cash`} />
        <div className="col-span-2 lg:col-span-1">
          <StatTile label="Avg Rev / Patient" value={inr(Math.round(avg))} icon="fa-calculator" tone="teal" hint={t.count ? 'Per paid consultation' : 'No receipts yet'} />
        </div>
      </div>

      <DeskCard className="p-4 sm:p-5 space-y-4">
        <SectionHead
          title="Payment Channels & Revenue Streams"
          subtitle="How patients paid, and which visit types the money came from"
          right={<Pill tone="blue">{t.count} paid visits</Pill>}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Bar label={<><i className="fa-solid fa-money-bill-wave text-emerald-600 mr-1.5" aria-hidden="true" />Cash collection</>} value={t.cash} max={t.total} display={`${inr(t.cash)} (${pct(t.cash, t.total)}%)`} tone="emerald" />
            <Bar label={<><i className="fa-solid fa-qrcode text-mg-teal mr-1.5" aria-hidden="true" />UPI / QR scan</>} value={t.upi} max={t.total} display={`${inr(t.upi)} (${pct(t.upi, t.total)}%)`} tone="teal" />
            <Bar label={<><i className="fa-solid fa-credit-card text-mg-blue mr-1.5" aria-hidden="true" />Card terminal</>} value={t.card} max={t.total} display={`${inr(t.card)} (${pct(t.card, t.total)}%)`} tone="blue" />
          </div>
          <div className="space-y-2 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-6">
            <span className="text-[11px] font-medium uppercase text-slate-400 tracking-wider">Visit category share</span>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {['fresh', 'followup', 'emergency'].map((k) => (
                <div key={k} className="bg-mg-surface p-3 rounded-lg">
                  <span className="block text-[10px] text-slate-500">{VISIT_LABEL[k]}</span>
                  <strong className={clsx('block text-base font-semibold', k === 'emergency' ? 'text-rose-600' : k === 'followup' ? 'text-mg-teal' : 'text-mg-blue')}>
                    {inr(visit[k]?.total ?? 0)}
                  </strong>
                  <span className="block text-[10px] text-slate-400">{visit[k]?.count ?? 0} visits</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DeskCard>

      {!single && (
        <DeskCard className="p-4 sm:p-5 space-y-3">
          <SectionHead
            title={analytics.bucket === 'month' ? 'Monthly Collections' : 'Daily Collections'}
            subtitle={`Receipts per ${analytics.bucket === 'month' ? 'month' : 'day'} · ${rangeText(range)}`}
          />
          {series.length ? (
            <div className="space-y-2">
              {series.map((r) => (
                <Bar key={r.label} label={bucketLabel(r.label, analytics.bucket)} value={r.total} max={Math.max(...series.map((x) => x.total))} display={`${inr(r.total)} · ${r.count}`} tone="blue" />
              ))}
            </div>
          ) : <EmptyNote icon="fa-chart-column" title="No collections in this period" />}
        </DeskCard>
      )}

      {(analytics.byDoctor ?? []).length > 0 && (
        <DeskCard className="p-4 sm:p-5 space-y-4">
          <SectionHead
            title="Doctor & Specialty Revenue Contribution"
            subtitle="Each practitioner’s share of collections"
            right={<Pill tone="slate">Active roster: {(analytics.byDoctor ?? []).length} doctor{(analytics.byDoctor ?? []).length === 1 ? '' : 's'}</Pill>}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(analytics.byDoctor ?? []).map((d) => (
              <div key={d.doctorId} className="p-4 bg-mg-surface rounded-lg flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={d.name} src={d.photoUrl} className="w-11 h-11" />
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-slate-900 truncate">{d.name}</h4>
                    <p className="text-xs text-mg-teal truncate">{[d.specialty, d.chamberNumber && `Chamber ${d.chamberNumber}`].filter(Boolean).join(' • ')}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="block text-[10px] uppercase text-slate-400">Gross generated</span>
                  <p className={clsx('text-lg font-semibold', d.revenue ? 'text-mg-blue' : 'text-slate-400')}>{inr(d.revenue)}</p>
                  <Pill tone={d.revenue ? 'emerald' : 'slate'}>{pct(d.revenue, t.total)}% share</Pill>
                </div>
              </div>
            ))}
          </div>
        </DeskCard>
      )}

      {canManageCash && (
        <DeskCard className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <IconTile icon="fa-vault" tone="emerald" />
            <div>
              <h4 className="text-sm font-semibold text-slate-900">Cash Register &amp; Shift Reconciliation</h4>
              <p className="text-xs text-slate-500">
                {canLogExpense
                  ? 'Log petty clinic expenses or print the shift report'
                  : 'Petty expenses are logged against today — switch to today to add one'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="dark" size="sm" onClick={onLogExpense} disabled={!canLogExpense}>
              <i className="fa-solid fa-circle-minus text-rose-300" aria-hidden="true" /> Log petty expense
            </Button>
            <Button size="sm" onClick={onReport} disabled={!dayClose} title={single ? undefined : 'Pick a single day to print its report'}>
              <i className="fa-solid fa-file-invoice-dollar" aria-hidden="true" /> End-of-day report
            </Button>
          </div>
        </DeskCard>
      )}

      {errors.ledger
        ? <LoadError error={errors.ledger} onRetry={onRetry} what="the financial ledger" />
        : <LedgerTable ledger={ledger} canVoid={canManageCash} onVoid={onVoid} range={range} />}

      {errors.dayClose && <LoadError error={errors.dayClose} onRetry={onRetry} what="day close & reconciliation" />}
      {dayClose ? <Reconciliation dayClose={dayClose} /> : !single && (
        <DeskCard className="p-4 text-xs text-slate-500 flex items-center gap-2">
          <i className="fa-solid fa-scale-balanced text-slate-400" aria-hidden="true" />
          Day close &amp; reconciliation is done one day at a time — pick a single date to reconcile it.
        </DeskCard>
      )}
    </div>
  );
}

const METHOD_TONE = { CASH: 'emerald', UPI: 'teal', CARD: 'blue', SPLIT: 'amber', FREE: 'slate' };

function LedgerTable({ ledger, canVoid, onVoid, range }) {
  const [search, setSearch] = useState('');
  const [method, setMethod] = useState('ALL');
  const items = ledger?.items ?? [];

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    return items.filter((i) => {
      if (method === 'EXPENSE' && i.kind !== 'EXPENSE') return false;
      if (!['ALL', 'EXPENSE'].includes(method) && (i.kind !== 'RECEIPT' || i.method !== method)) return false;
      if (!s) return true;
      return [i.patientName, i.doctorName, i.category, i.receiptNumber, i.tokenNumber != null ? token(i.tokenNumber) : '']
        .some((v) => String(v || '').toLowerCase().includes(s));
    });
  }, [items, search, method]);

  return (
    <DeskCard className="overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-mg-surface/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold text-slate-900">Financial Collection Audit Ledger</h3>
          <p className="text-xs text-slate-500">Every receipt and petty expense · {rangeText(range)}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:flex-none">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" aria-hidden="true" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patient, token, receipt…"
              aria-label="Search the ledger"
              className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs w-full sm:w-56 focus:outline-none focus:border-mg-teal focus:ring-1 focus:ring-mg-teal"
            />
          </div>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            aria-label="Payment method"
            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-mg-teal"
          >
            <option value="ALL">All methods</option>
            <option value="CASH">Cash</option>
            <option value="UPI">UPI</option>
            <option value="CARD">Card</option>
            <option value="SPLIT">Split</option>
            <option value="EXPENSE">Expenses only</option>
          </select>
        </div>
      </div>

      {!ledger ? (
        <div className="h-40 animate-pulse bg-slate-50" />
      ) : !rows.length ? (
        <EmptyNote icon="fa-receipt" title="No matching records" hint={items.length ? 'Try a different search or method.' : 'Receipts appear here as patients pay.'} />
      ) : (
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full min-w-[820px] text-left text-xs">
            <thead className="bg-mg-surface/70 border-b border-slate-200 text-[11px] font-medium uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 px-5">Date &amp; time</th>
                <th className="py-3 px-4">Description / patient</th>
                <th className="py-3 px-4">Doctor &amp; chamber</th>
                <th className="py-3 px-4">Visit category</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((i) => {
                const expense = i.kind === 'EXPENSE';
                const voided = i.status === 'VOID' || i.status === 'REFUNDED';
                return (
                  <tr key={i.id} className={clsx('hover:bg-slate-50/70', voided && 'opacity-60')}>
                    <td className="py-3 px-5 text-slate-500 whitespace-nowrap">{dayLabel(i.date)}, {timeOf(i.at)}</td>
                    <td className="py-3 px-4">
                      {expense ? (
                        <>
                          <p className="font-medium text-slate-900">Petty expense: {i.category}</p>
                          <p className="text-[11px] text-slate-400">{[i.note, i.by && `by ${i.by}`, voided && `voided — ${i.voidReason}`].filter(Boolean).join(' · ')}</p>
                        </>
                      ) : (
                        <>
                          <p className="font-medium text-slate-900">{i.patientName || 'Patient'}{i.tokenNumber != null && ` (${token(i.tokenNumber)})`}</p>
                          <p className="text-[11px] text-slate-400">{[i.receiptNumber, i.by && `by ${i.by}`, i.status !== 'PAID' && i.status.toLowerCase()].filter(Boolean).join(' · ')}</p>
                        </>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {expense ? 'Clinic expense' : [i.doctorName, i.chamberNumber && `Ch. ${i.chamberNumber}`].filter(Boolean).join(' · ')}
                    </td>
                    <td className="py-3 px-4">
                      <Pill tone={expense ? 'rose' : 'blue'}>{expense ? 'Expense' : VISIT_LABEL[i.visitType] || i.visitType}</Pill>
                    </td>
                    <td className="py-3 px-4"><Pill tone={METHOD_TONE[i.method] || 'slate'}>{i.method}</Pill></td>
                    <td className="py-3 px-5 text-right whitespace-nowrap">
                      <span className={clsx('font-semibold', expense ? 'text-rose-600' : 'text-emerald-600', voided && 'line-through')}>
                        {expense ? `- ${inr(i.originalAmount)}` : inr(i.originalAmount)}
                      </span>
                      {expense && canVoid && i.status === 'ACTIVE' && (
                        <button type="button" onClick={() => onVoid(i)} className="ml-2 text-[11px] text-slate-400 hover:text-rose-600" title="Void this expense">
                          <i className="fa-solid fa-ban" aria-hidden="true" /><span className="sr-only">Void</span>
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
  );
}

/**
 * Count the drawer and the bank against what the system expects. Revenue
 * counts completed consultations only; petty cash comes off the cash figure.
 */
function Reconciliation({ dayClose }) {
  const [actual, setActual] = useState({ cash: '', upi: '', card: '' });
  const e = dayClose.expected;
  const expected = { cash: dayClose.cashInHand ?? e.cash, upi: e.upi, card: e.card };
  const variance = Object.fromEntries(Object.keys(expected).map((k) => [k, (actual[k] === '' ? expected[k] : Number(actual[k])) - expected[k]]));
  const total = variance.cash + variance.upi + variance.card;

  return (
    <DeskCard className="p-4 sm:p-5 space-y-4">
      <SectionHead
        icon="fa-scale-balanced"
        title="Day Close & Reconciliation"
        subtitle={`${dayClose.hospitalName} · ${dayClose.date} · completed consultations only`}
      />
      {dayClose.billedIncludingIncomplete.total > e.total && (
        <p className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-[11px] text-blue-800">
          <i className="fa-solid fa-circle-info mr-1.5" aria-hidden="true" />
          {inr(dayClose.billedIncludingIncomplete.total)} billed across {dayClose.billedIncludingIncomplete.count} tokens,
          but only {inr(e.total)} counts as revenue — the rest is for patients not seen yet.
        </p>
      )}
      <div className="space-y-2.5">
        {[['cash', 'Cash in drawer', 'cash', dayClose.pettyCash?.total ? `expected after ${inr(dayClose.pettyCash.total)} petty cash` : null],
          ['upi', 'UPI settled', 'upi'], ['card', 'Card settled', 'slate']].map(([key, label, tone, note]) => (
            <div key={key} className="grid grid-cols-3 gap-3 items-center">
              <span className="text-xs font-medium text-slate-700">
                {label}
                <span className="block text-[10px] font-normal text-slate-400">Expected {inr(expected[key])}{note ? `, ${note}` : ''}</span>
              </span>
              <MoneyInput value={actual[key]} onChange={(v) => setActual({ ...actual, [key]: v })} tone={tone} placeholder={String(expected[key])} />
              <span className={clsx('text-xs font-medium text-right',
                variance[key] === 0 ? 'text-slate-400' : variance[key] > 0 ? 'text-mg-blue' : 'text-rose-600')}
              >
                {variance[key] === 0 ? 'Matches' : `${variance[key] > 0 ? '+' : ''}${inr(variance[key])}`}
              </span>
            </div>
        ))}
      </div>
      <div className={clsx('rounded-lg border p-3.5 flex items-center justify-between text-sm font-semibold',
        total === 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700')}
      >
        <span>Variance</span>
        <span>{total === 0 ? 'Balanced' : `${total > 0 ? '+' : ''}${inr(total)}`}</span>
      </div>
    </DeskCard>
  );
}

// ---- Footfall --------------------------------------------------------------

const hourLabel = (h) => `${((h + 11) % 12) + 1}:00 ${h < 12 ? 'AM' : 'PM'}`;

function FootfallSection({ analytics, footfall, range, analyticsError, footfallError, onRetry }) {
  const rows = footfall?.rows ?? [];
  const single = range.from === range.to;

  // Check-ins per hour, today. Built from the register itself so the bars and
  // the table below can never disagree.
  const hourly = useMemo(() => {
    const m = new Map();
    for (const r of rows) {
      const h = new Date(r.checkInAt).getHours();
      m.set(h, (m.get(h) || 0) + 1);
    }
    if (!m.size) return [];
    const hours = [...m.keys()];
    const lo = Math.min(...hours);
    const hi = Math.max(...hours);
    // Across a normal OPD day the empty hours are information (a lunch gap);
    // across a wider spread they are just a wall of zeros, so skip them.
    if (hi - lo > 12) return hours.sort((x, y) => x - y).map((h) => ({ hour: h, count: m.get(h) }));
    const out = [];
    for (let h = lo; h <= hi; h += 1) out.push({ hour: h, count: m.get(h) || 0 });
    return out;
  }, [rows]);
  const peak = hourly.reduce((best, h) => (h.count > (best?.count ?? 0) ? h : best), null);

  const consults = rows
    .filter((r) => r.enteredChamberAt && r.completedAt)
    .map((r) => (new Date(r.completedAt) - new Date(r.enteredChamberAt)) / 60000);
  const avgConsult = consults.length ? consults.reduce((a, b) => a + b, 0) / consults.length : null;

  if (analyticsError && !analytics) {
    return (
      <div className="space-y-5">
        <LoadError error={analyticsError} onRetry={onRetry} what="footfall analytics" />
        {footfallError ? <LoadError error={footfallError} onRetry={onRetry} what="the footfall register" /> : <FootfallRegister footfall={footfall} range={range} />}
      </div>
    );
  }
  if (!analytics) return <div className="h-64 rounded-xl bg-white border border-slate-200 animate-pulse" />;
  const p = analytics.patients.totals;
  const series = analytics.patients.series;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Total Footfall" value={`${pad2(p.booked)} Patients`} icon="fa-users" tone="blue" hint={`${p.unique} unique · ${rangeText(range)}`} />
        <StatTile label={single ? 'Peak Hour' : 'Busiest Hour'} value={peak ? hourLabel(peak.hour) : '—'} icon="fa-fire-flame-curved" tone="teal" hint={peak ? `${peak.count} check-in${peak.count === 1 ? '' : 's'}` : 'No check-ins yet'} />
        <StatTile label="Walk-In vs Online" value={`${pct(p.walkin, p.walkin + p.online)}% Walk-In`} icon="fa-street-view" tone="emerald" hint={`${p.walkin} desk · ${p.online} app / QR`} />
        <StatTile label="Seen / Booked" value={`${pct(p.completed, p.booked)}%`} icon="fa-chart-pie" tone="amber" hint={`${p.completed} seen · ${p.skipped} skipped · ${p.cancelled} cancelled`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <DeskCard className="p-4 sm:p-5 space-y-4">
          <SectionHead
            title="Hourly Patient Footfall"
            subtitle={single ? `Check-ins through the day · ${rangeText(range)}` : `Check-ins by hour, all days combined · ${rangeText(range)}`}
            right={peak && <Pill tone="teal"><i className="fa-regular fa-clock" aria-hidden="true" /> Peak: {hourLabel(peak.hour)}</Pill>}
          />
          {hourly.length ? (
            <div className="space-y-2.5">
              {hourly.map((h) => (
                <Bar
                  key={h.hour}
                  label={`${hourLabel(h.hour)} – ${hourLabel(h.hour + 1)}`}
                  note={peak?.hour === h.hour && <span className="ml-1.5 text-[10px] font-semibold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-md">PEAK</span>}
                  value={h.count}
                  max={peak.count}
                  display={`${h.count} patient${h.count === 1 ? '' : 's'}`}
                  tone={peak?.hour === h.hour ? 'teal' : 'blue'}
                />
              ))}
            </div>
          ) : <EmptyNote icon="fa-clock" title={`No check-ins ${rangeText(range)}`} />}
          <p className="pt-2 border-t border-slate-100 text-xs text-slate-500">
            <i className="fa-solid fa-circle-info mr-1 text-slate-400" aria-hidden="true" />
            Average consultation{single ? '' : ' over this range'}: <strong className="font-medium text-slate-700">{avgConsult != null ? `${avgConsult.toFixed(1)} mins` : '—'}</strong>
          </p>
        </DeskCard>

        <DeskCard className="p-4 sm:p-5 space-y-4">
          <SectionHead
            title={single ? 'Patients by Status' : `Patients Seen per ${analytics.bucket === 'month' ? 'Month' : 'Day'}`}
            subtitle={single ? `Where the day’s patients ended up · ${rangeText(range)}` : `Seen / booked · ${rangeText(range)}`}
          />
          {single ? (
            <div className="space-y-2.5">
              <Bar label="Booked" value={p.booked} max={p.booked} display={p.booked} tone="blue" />
              <Bar label="Seen" value={p.completed} max={p.booked} display={p.completed} tone="emerald" />
              <Bar label="Skipped" value={p.skipped} max={p.booked} display={p.skipped} tone="amber" />
              <Bar label="Cancelled" value={p.cancelled} max={p.booked} display={p.cancelled} tone="slate" />
            </div>
          ) : series.length ? (
            <div className="space-y-2">
              {series.map((r) => (
                <Bar key={r.label} label={bucketLabel(r.label, analytics.bucket)} value={r.completed} max={Math.max(...series.map((x) => x.booked))} display={`${r.completed} / ${r.booked}`} tone="teal" />
              ))}
            </div>
          ) : <EmptyNote icon="fa-chart-column" title="No patients in this period" />}
        </DeskCard>
      </div>

      {(analytics.byDoctor ?? []).length > 0 && (
        <DeskCard className="p-4 sm:p-5 space-y-4">
          <SectionHead title="Doctor Footfall & Patient Traffic Share" subtitle="Each practitioner’s patient volume" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(analytics.byDoctor ?? []).map((d) => (
              <div key={d.doctorId} className="p-4 bg-mg-surface rounded-lg flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={d.name} src={d.photoUrl} className="w-11 h-11" />
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-slate-900 truncate">{d.name}</h4>
                    <p className="text-xs text-mg-teal truncate">{[d.specialty, d.chamberNumber && `Chamber ${d.chamberNumber}`].filter(Boolean).join(' • ')}</p>
                    <p className="text-[11px] text-slate-500">{pad2(d.completed)} seen of {pad2(d.booked)} booked</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="block text-[10px] uppercase text-slate-400">Traffic share</span>
                  <p className={clsx('text-lg font-semibold', d.booked ? 'text-mg-blue' : 'text-slate-400')}>{pct(d.booked, p.booked)}%</p>
                  <Pill tone={d.booked ? 'emerald' : 'slate'}>{d.booked} / {p.booked} patients</Pill>
                </div>
              </div>
            ))}
          </div>
        </DeskCard>
      )}

      {footfallError
        ? <LoadError error={footfallError} onRetry={onRetry} what="the footfall register" />
        : <FootfallRegister footfall={footfall} range={range} />}
    </div>
  );
}

const STATUS_TONE = { WAITING: 'amber', IN_CHAMBER: 'teal', COMPLETED: 'emerald', SKIPPED: 'rose', CANCELLED: 'slate', RESCHEDULE_NEEDED: 'slate' };

function FootfallRegister({ footfall, range }) {
  const multiDay = range.from !== range.to;
  const [search, setSearch] = useState('');
  const rows = footfall?.rows ?? [];
  const shown = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => [
      r.patientName, r.phone, token(r.tokenNumber), r.complaint, r.doctorName,
      ...r.prescriptions.flatMap((x) => [x.diagnosis, ...x.medicines.map((m) => m.name)]),
    ].some((v) => String(v || '').toLowerCase().includes(s)));
  }, [rows, search]);

  return (
    <DeskCard className="overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-mg-surface/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold text-slate-900">Patient Footfall Register &amp; Prescriptions</h3>
          <p className="text-xs text-slate-500">
            Check-ins and what each patient was prescribed · {rangeText(range)}
            {footfall?.truncated && ' (first 2,000 shown — narrow the dates to see the rest)'}
          </p>
        </div>
        <div className="relative">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" aria-hidden="true" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, diagnosis, medicine…"
            aria-label="Search the footfall register"
            className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs w-full sm:w-72 focus:outline-none focus:border-mg-teal focus:ring-1 focus:ring-mg-teal"
          />
        </div>
      </div>
      {!footfall ? (
        <div className="h-40 animate-pulse bg-slate-50" />
      ) : !shown.length ? (
        <EmptyNote icon="fa-user-clock" title={rows.length ? 'No matching patients' : `No check-ins ${rangeText(range)}`} />
      ) : (
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="bg-mg-surface/70 border-b border-slate-200 text-[11px] font-medium uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 px-5">Check-in</th>
                <th className="py-3 px-4">Token &amp; patient</th>
                <th className="py-3 px-4">Assigned doctor</th>
                <th className="py-3 px-4">Visit type</th>
                <th className="py-3 px-4">Queue status</th>
                <th className="py-3 px-5">Prescribed medicines</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 align-top">
              {shown.map((r) => (
                <tr key={r.tokenId} className="hover:bg-slate-50/70">
                  <td className="py-3 px-5 font-mono text-slate-500 whitespace-nowrap">
                    {multiDay && <span className="block font-sans text-[11px] text-slate-700">{dayLabel(r.date)}</span>}
                    {timeOf(r.checkInAt)}
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-medium text-slate-900">{token(r.tokenNumber)} – {r.patientName}</p>
                    <p className="text-[11px] text-slate-400">{[r.phone && `+91 ${r.phone}`, patientLine(r, { yrs: 'Y' })].filter(Boolean).join(' • ')}</p>
                  </td>
                  <td className="py-3 px-4 text-slate-700">{r.doctorName}</td>
                  <td className="py-3 px-4"><Pill tone={r.visitType === 'emergency' ? 'rose' : 'teal'}>{VISIT_LABEL[r.visitType] || r.visitType}</Pill></td>
                  <td className="py-3 px-4"><Pill tone={STATUS_TONE[r.status] || 'slate'}>{r.status.replace('_', ' ').toLowerCase()}</Pill></td>
                  <td className="py-3 px-5">
                    {r.prescriptions.length ? r.prescriptions.map((x) => (
                      <div key={x.id} className="mb-1.5 last:mb-0 p-2 bg-mg-surface rounded-md space-y-1">
                        <p className="text-[11px] font-medium text-mg-blue">{x.diagnosis}</p>
                        <div className="flex flex-wrap gap-1">
                          {x.medicines.map((m, i) => (
                            // eslint-disable-next-line react/no-array-index-key
                            <span key={i} className="px-1.5 py-0.5 bg-teal-50 text-mg-teal text-[10px] rounded-md border border-teal-100">
                              <i className="fa-solid fa-pills mr-1 text-[10px]" aria-hidden="true" />{m.name}{m.dosage && ` (${m.dosage})`}
                            </span>
                          ))}
                        </div>
                      </div>
                    )) : <span className="text-[11px] italic text-slate-400">No prescription yet</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DeskCard>
  );
}
