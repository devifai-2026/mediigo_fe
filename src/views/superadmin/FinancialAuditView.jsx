import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { useApi } from '../../hooks/useApi.js';
import { AdminKpi, AdminPageHeader } from '../../components/superadmin/AdminKpi.jsx';
import { DeskCard, EmptyNote, Pill, SectionHead, Segmented } from '../../components/desk/ui.jsx';
import { DateRangePicker, PRESETS, isoToday, presetOf, rangeLabel } from '../../components/desk/DateRangePicker.jsx';
import { inr, timeOf } from '../../lib/format.js';
import { downloadCsv } from '../../lib/csv.js';

const QUICK = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: '7 Days' },
  { value: 'thisMonth', label: 'This Month' },
];

const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);
const day = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

function ExportButton({ onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:border-mg-teal hover:text-mg-teal disabled:opacity-50 transition"
    >
      <i className="fa-solid fa-file-csv" aria-hidden="true" /> Export CSV
    </button>
  );
}

/**
 * Financial audit across the network for any day or range: what each clinic
 * collected, how it was paid, what left the drawer as petty cash, and the
 * cash each drawer should therefore hold.
 */
export default function FinancialAuditView() {
  const [range, setRange] = useState(() => {
    const t = isoToday();
    return PRESETS.find((p) => p.key === 'thisMonth').range(t);
  });
  const q = `from=${range.from}&to=${range.to}`;
  const { data: net } = useApi(`/api/superadmin/network?${q}`);
  const { data: petty } = useApi(`/api/superadmin/petty-cash?${q}`);
  const when = rangeLabel(range);
  const t = net?.totals;

  const [clinicSearch, setClinicSearch] = useState('');
  const clinics = useMemo(() => {
    const s = clinicSearch.trim().toLowerCase();
    return (net?.byClinic ?? []).filter((c) => !s || [c.name, c.city, c.district].some((v) => String(v || '').toLowerCase().includes(s)));
  }, [net, clinicSearch]);

  const [pettyFilter, setPettyFilter] = useState('ALL');
  const pettyRows = useMemo(
    () => (petty?.items ?? []).filter((r) => pettyFilter === 'ALL' || r.status === pettyFilter),
    [petty, pettyFilter],
  );
  const voided = (petty?.items ?? []).filter((r) => r.status === 'VOID');

  const exportClinics = () => downloadCsv(`mediigo-financial-audit_${range.from}_${range.to}.csv`, [
    ['Clinic', (c) => c.name], ['City', (c) => c.city], ['District', (c) => c.district],
    ['Revenue', (c) => c.revenue], ['Cash', (c) => c.cash], ['UPI', (c) => c.upi], ['Card', (c) => c.card],
    ['Receipts', (c) => c.receipts], ['Petty cash', (c) => c.pettyCash], ['Cash in hand', (c) => c.cashInHand],
    ['Patients booked', (c) => c.booked], ['Patients seen', (c) => c.completed], ['Prescriptions', (c) => c.prescriptions],
  ], clinics);

  const exportPetty = () => downloadCsv(`mediigo-petty-cash_${range.from}_${range.to}.csv`, [
    ['Date', (r) => r.date], ['Time', (r) => timeOf(r.at)], ['Clinic', (r) => r.clinicName], ['Category', (r) => r.category],
    ['Note', (r) => r.note], ['Amount', (r) => r.amount], ['Status', (r) => r.status], ['Logged by', (r) => r.by],
    ['Void reason', (r) => r.voidReason], ['Voided by', (r) => r.voidedBy],
  ], pettyRows);

  return (
    <section className="space-y-6">
      <AdminPageHeader
        icon="fa-vault"
        title="Financial & Cash Collection Audit"
        subtitle="Collections by clinic and payment channel, petty cash paid out, and what each drawer should hold."
      >
        <Segmented
          value={presetOf(range) ?? ''}
          onChange={(k) => setRange(PRESETS.find((p) => p.key === k).range(isoToday()))}
          options={QUICK}
        />
        <DateRangePicker value={range} onChange={setRange} />
      </AdminPageHeader>

      <div className="rounded-xl bg-hero-desk text-white p-6 flex flex-col lg:flex-row justify-between gap-6 shadow-lg shadow-blue-950/10">
        <div className="space-y-1">
          <p className="text-xs text-white/70 font-medium uppercase tracking-wider">Consolidated collections · {when}</p>
          <p className="text-4xl font-semibold text-mg-mint">{inr(t?.revenue ?? 0)}</p>
          <p className="text-xs text-white/70">
            {t?.receipts ?? 0} receipt{t?.receipts === 1 ? '' : 's'} across {t?.clinicsWithActivity ?? 0} clinic{t?.clinicsWithActivity === 1 ? '' : 's'} · average ticket {inr(t?.avgTicket ?? 0)}
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto text-center text-xs">
          {[
            ['Cash', t?.cash, 'text-emerald-200'],
            ['UPI', t?.upi, 'text-teal-100'],
            ['Card', t?.card, 'text-blue-100'],
            ['Petty cash out', t?.pettyCash, 'text-rose-200'],
          ].map(([label, v, tone]) => (
            <div key={label} className="bg-white/10 border border-white/15 p-3 rounded-lg min-w-[110px]">
              <span className="text-white/70 block text-[10px]">{label}</span>
              <span className={clsx('font-semibold text-sm', tone)}>{inr(v ?? 0)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminKpi accent="emerald" label="Network Cash in Hand" value={inr((t?.cash ?? 0) - (t?.pettyCash ?? 0))} icon="fa-money-bill-wave" footer="Cash collected minus petty cash" />
        <AdminKpi accent="indigo" label="Digital Share" value={`${pct((t?.upi ?? 0) + (t?.card ?? 0), t?.revenue)}%`} icon="fa-qrcode" footer={`${inr((t?.upi ?? 0) + (t?.card ?? 0))} via UPI & card`} />
        <AdminKpi accent="rose" label="Petty Cash Entries" value={t?.pettyCount ?? 0} icon="fa-receipt" footer={`${voided.length} voided in this window`} />
        <AdminKpi accent="teal" label="Paid Consultations" value={t?.receipts ?? 0} icon="fa-file-invoice" footer={`${t?.completed ?? 0} patients seen`} />
      </div>

      <DeskCard className="overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-mg-surface/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <SectionHead title="Clinic-wise Collections" subtitle={`By payment channel, with petty cash · ${when}`} />
          <div className="flex items-center gap-2">
            <input
              value={clinicSearch}
              onChange={(e) => setClinicSearch(e.target.value)}
              placeholder="Search clinic, city…"
              aria-label="Search clinics"
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs w-full sm:w-48 focus:outline-none focus:border-mg-teal focus:ring-1 focus:ring-mg-teal"
            />
            <ExportButton onClick={exportClinics} disabled={!clinics.length} />
          </div>
        </div>
        {!net ? <div className="h-40 animate-pulse bg-slate-50" /> : !clinics.length ? (
          <EmptyNote icon="fa-hospital" title="No clinics match" />
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full min-w-[920px] text-left text-xs">
              <thead className="bg-mg-surface/70 border-b border-slate-200 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3 px-5">Clinic</th>
                  <th className="py-3 px-3 text-right">Cash</th>
                  <th className="py-3 px-3 text-right">UPI</th>
                  <th className="py-3 px-3 text-right">Card</th>
                  <th className="py-3 px-3 text-right">Revenue</th>
                  <th className="py-3 px-3 text-right">Petty cash</th>
                  <th className="py-3 px-3 text-right">Cash in hand</th>
                  <th className="py-3 px-5 text-right">Seen / receipts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clinics.map((c) => (
                  <tr key={c.hospitalId} className="hover:bg-slate-50/70">
                    <td className="py-3 px-5">
                      <p className="font-medium text-slate-900">{c.name}</p>
                      <p className="text-[11px] text-slate-400">{[c.city, c.district].filter((x) => x && x !== '—').join(' · ')}</p>
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-700">{inr(c.cash)}</td>
                    <td className="py-3 px-3 text-right text-mg-teal">{inr(c.upi)}</td>
                    <td className="py-3 px-3 text-right text-mg-blue">{inr(c.card)}</td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-900">{inr(c.revenue)}</td>
                    <td className={clsx('py-3 px-3 text-right', c.pettyCash ? 'text-rose-600' : 'text-slate-400')}>
                      {c.pettyCash ? `- ${inr(c.pettyCash)}` : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-emerald-700">{inr(c.cashInHand)}</td>
                    <td className="py-3 px-5 text-right text-slate-600">
                      {c.completed} / {c.receipts}
                      {c.receipts > c.completed && (
                        <span className="block text-[10px] text-amber-600" title="Paid tokens not yet seen — revenue taken ahead of the consultation">
                          {c.receipts - c.completed} paid, not seen
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-mg-surface/70 border-t border-slate-200 font-semibold text-slate-900">
                <tr>
                  <td className="py-3 px-5">Network total</td>
                  <td className="py-3 px-3 text-right">{inr(t.cash)}</td>
                  <td className="py-3 px-3 text-right">{inr(t.upi)}</td>
                  <td className="py-3 px-3 text-right">{inr(t.card)}</td>
                  <td className="py-3 px-3 text-right">{inr(t.revenue)}</td>
                  <td className="py-3 px-3 text-right text-rose-600">{t.pettyCash ? `- ${inr(t.pettyCash)}` : '—'}</td>
                  <td className="py-3 px-3 text-right text-emerald-700">{inr(t.cash - t.pettyCash)}</td>
                  <td className="py-3 px-5 text-right">{t.completed} / {t.receipts}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        <p className="px-5 py-3 text-[11px] text-slate-400 border-t border-slate-100">
          Revenue here is every paid receipt in the window. A clinic’s own day close counts completed consultations only, so the two can differ while patients who have paid are still waiting.
        </p>
      </DeskCard>

      <DeskCard className="overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-mg-surface/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <SectionHead
            icon="fa-money-bill-transfer"
            title="Petty Cash Audit Log"
            subtitle={`Every expense paid from a desk drawer, voided ones included · ${when}`}
          />
          <div className="flex items-center gap-2">
            <Segmented
              size="sm"
              value={pettyFilter}
              onChange={setPettyFilter}
              options={[
                { value: 'ALL', label: 'All', count: petty?.items?.length ?? 0 },
                { value: 'ACTIVE', label: 'Standing' },
                { value: 'VOID', label: 'Voided', count: voided.length },
              ]}
            />
            <ExportButton onClick={exportPetty} disabled={!pettyRows.length} />
          </div>
        </div>
        {!petty ? <div className="h-32 animate-pulse bg-slate-50" /> : !pettyRows.length ? (
          <EmptyNote icon="fa-receipt" title="No petty cash in this window" hint="Expenses logged at any clinic desk appear here." />
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full min-w-[820px] text-left text-xs">
              <thead className="bg-mg-surface/70 border-b border-slate-200 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3 px-5">When</th>
                  <th className="py-3 px-4">Clinic</th>
                  <th className="py-3 px-4">Purpose</th>
                  <th className="py-3 px-4">Logged by</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pettyRows.map((r) => (
                  <tr key={r.id} className={clsx('hover:bg-slate-50/70', r.status === 'VOID' && 'bg-slate-50/60')}>
                    <td className="py-3 px-5 text-slate-500 whitespace-nowrap">{day(r.date)}, {timeOf(r.at)}</td>
                    <td className="py-3 px-4 font-medium text-slate-900">{r.clinicName}</td>
                    <td className="py-3 px-4">
                      <p className="text-slate-800">{r.category}</p>
                      {r.note && <p className="text-[11px] text-slate-400">{r.note}</p>}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{r.by || '—'}</td>
                    <td className="py-3 px-4">
                      {r.status === 'VOID' ? (
                        <>
                          <Pill tone="slate">Voided</Pill>
                          <p className="text-[10px] text-slate-400 mt-0.5">{[r.voidReason, r.voidedBy && `by ${r.voidedBy}`].filter(Boolean).join(' · ')}</p>
                        </>
                      ) : <Pill tone="rose">Deducted</Pill>}
                    </td>
                    <td className={clsx('py-3 px-5 text-right font-semibold', r.status === 'VOID' ? 'text-slate-400 line-through' : 'text-rose-600')}>
                      - {inr(r.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {petty?.truncated && <p className="px-5 py-3 text-[11px] text-amber-600 border-t border-slate-100">Showing the latest 1,000 entries — narrow the dates to see the rest.</p>}
      </DeskCard>
    </section>
  );
}
