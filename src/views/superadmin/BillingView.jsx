import { useState, useEffect } from 'react';
import clsx from 'clsx';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../lib/api.js';
import { Button } from '../../components/ui/Button.jsx';
import { Field, Input, Select } from '../../components/ui/Field.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { SkeletonRows } from '../../components/ui/Skeleton.jsx';

/**
 * Platform billing: what Mediigo charges clinics, and where every clinic
 * stands against its free trial.
 *
 * Rates are held in paise on the wire and shown in rupees here — the server
 * never sees a float, and the admin never types one.
 */

const rupees = (p) => (Number(p || 0) / 100);
const inr = (p) => `₹${rupees(p).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const STATUS_TONE = {
  ON_TRIAL: 'bg-teal-50 text-teal-700 border-teal-200',
  BILLABLE: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  NO_TRIAL: 'bg-slate-50 text-slate-500 border-slate-200',
};

function Stat({ label, value, tone = 'slate', hint }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={clsx('text-2xl font-black mt-1', `text-${tone}-600`)}>{value}</p>
      {hint && <p className="text-[10px] text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );
}

export default function BillingView() {
  const { data, loading, refetch } = useApi('/api/superadmin/billing/overview');
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => { if (data?.settings) setForm(data.settings); }, [data]);

  if (loading || !form) return <SkeletonRows rows={6} />;

  const set = (k, v) => setForm({ ...form, [k]: v });
  const { buckets, totals, rows } = data;

  const save = async () => {
    setBusy(true);
    try {
      await api.put('/api/superadmin/billing/settings', {
        onlineRatePaise: Math.round(Number(form.onlineRatePaise) || 0),
        offlineRatePaise: Math.round(Number(form.offlineRatePaise) || 0),
        chargeMode: form.chargeMode,
        percentBps: Math.round(Number(form.percentBps) || 0),
        maxTrialDays: Math.round(Number(form.maxTrialDays) || 0),
        defaultTrialDays: Math.round(Number(form.defaultTrialDays) || 0),
        maxMonthlyChargePaise: Math.round(Number(form.maxMonthlyChargePaise) || 0),
        arrearsFlagPaise: Math.round(Number(form.arrearsFlagPaise) || 0),
      });
      toast.success('Billing settings saved');
      refetch();
    } catch (e) {
      toast.error(e?.response?.data?.error?.message || 'Could not save');
    } finally {
      setBusy(false);
    }
  };

  const setTrial = async (row) => {
    const input = window.prompt(
      `Trial days for ${row.name} (0 to end it, max ${form.maxTrialDays}):`,
      String(row.trialDays ?? form.defaultTrialDays),
    );
    if (input === null) return;
    try {
      await api.post(`/api/admin/hospitals/${row.id}/trial`, { days: Number(input) });
      toast.success(`Trial updated for ${row.name}`);
      refetch();
    } catch (e) {
      toast.error(e?.response?.data?.error?.message || 'Could not set trial');
    }
  };

  const visible = rows.filter((r) => {
    if (filter === 'ALL') return true;
    if (filter === 'FLAGGED') return r.flagged;
    if (filter === 'EXPIRING') return r.status === 'ON_TRIAL' && r.daysLeft !== null && r.daysLeft <= 7;
    return r.status === filter;
  });

  const FILTERS = [
    ['ALL', `All (${rows.length})`],
    ['ON_TRIAL', `On trial (${buckets.onTrial})`],
    ['EXPIRING', `Expiring ≤7d (${buckets.expiringInWeek})`],
    ['BILLABLE', `Billing (${buckets.billable})`],
    ['NO_TRIAL', `No trial (${buckets.noTrial})`],
    ['FLAGGED', `Flagged (${buckets.flagged})`],
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="On trial" value={buckets.onTrial} tone="teal" hint={`${buckets.expiringInMonth} end within 30d`} />
        <Stat label="Expiring in a week" value={buckets.expiringInWeek} tone="amber" />
        <Stat label="Billing this month" value={inr(totals.monthToDatePaise)} tone="indigo" hint={`${buckets.billable} clinics`} />
        <Stat label="Outstanding" value={inr(totals.outstandingPaise)} tone="rose" hint={`${buckets.flagged} past the flag`} />
      </div>

      {/* --- Rates and limits --- */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-black text-slate-900 mb-1">Platform charges</h3>
        <p className="text-[11px] text-slate-500 mb-4">
          Charged per token once a clinic&apos;s free trial ends. Online means the patient booked it
          themselves — in the app or by scanning a clinic QR. Offline means the desk keyed it in.
          <strong className="text-slate-700"> Service is never interrupted for non-payment.</strong>
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label="Online rate (₹ per token)">
            <Input
              type="number" min="0" step="0.01" value={rupees(form.onlineRatePaise)}
              onChange={(e) => set('onlineRatePaise', Math.round(Number(e.target.value) * 100))}
            />
          </Field>
          <Field label="Offline rate (₹ per token)">
            <Input
              type="number" min="0" step="0.01" value={rupees(form.offlineRatePaise)}
              onChange={(e) => set('offlineRatePaise', Math.round(Number(e.target.value) * 100))}
            />
          </Field>
          <Field label="Charge mode">
            <Select value={form.chargeMode} onChange={(e) => set('chargeMode', e.target.value)}>
              <option value="RUPEES">Flat rupees per token</option>
              <option value="PERCENT">Percentage of consultation fee</option>
              <option value="CUSTOM">Custom (per-clinic overrides)</option>
            </Select>
          </Field>
          <Field label="Percentage (%)" hint={form.chargeMode === 'PERCENT' ? undefined : 'Used in percentage mode'}>
            <Input
              type="number" min="0" max="100" step="0.01"
              disabled={form.chargeMode !== 'PERCENT'}
              value={(Number(form.percentBps) || 0) / 100}
              onChange={(e) => set('percentBps', Math.round(Number(e.target.value) * 100))}
            />
          </Field>
          <Field label="Max trial (days)" hint="Ceiling a district admin cannot exceed">
            <Input type="number" min="0" value={form.maxTrialDays} onChange={(e) => set('maxTrialDays', e.target.value)} />
          </Field>
          <Field label="Default trial (days)">
            <Input type="number" min="0" value={form.defaultTrialDays} onChange={(e) => set('defaultTrialDays', e.target.value)} />
          </Field>
          <Field label="Max charge per clinic / month (₹)" hint="0 means uncapped">
            <Input
              type="number" min="0" step="1" value={rupees(form.maxMonthlyChargePaise)}
              onChange={(e) => set('maxMonthlyChargePaise', Math.round(Number(e.target.value) * 100))}
            />
          </Field>
          <Field label="Flag arrears above (₹)" hint="Surfaces the clinic here. Never blocks it.">
            <Input
              type="number" min="0" step="1" value={rupees(form.arrearsFlagPaise)}
              onChange={(e) => set('arrearsFlagPaise', Math.round(Number(e.target.value) * 100))}
            />
          </Field>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</Button>
        </div>
      </div>

      {/* --- Per-clinic --- */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 pt-4 pb-3 flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-black text-slate-900 mr-auto">Clinics</h3>
          {FILTERS.map(([k, label]) => (
            <button
              key={k} type="button" onClick={() => setFilter(k)}
              className={clsx(
                'text-[10px] font-bold px-2.5 py-1 rounded-full border transition',
                filter === k ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="text-left py-2.5 px-4 font-bold">Clinic</th>
                <th className="text-center py-2.5 px-3 font-bold">Status</th>
                <th className="text-center py-2.5 px-3 font-bold">Trial ends</th>
                <th className="text-right py-2.5 px-3 font-bold">This month</th>
                <th className="text-right py-2.5 px-3 font-bold">Outstanding</th>
                <th className="text-right py-2.5 px-4 font-bold">Trial</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((r) => (
                <tr key={r.id} className={clsx('hover:bg-slate-50', r.flagged && 'bg-rose-50/40')}>
                  <td className="py-2.5 px-4">
                    <p className="font-bold text-slate-900">{r.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {r.code}
                      {r.hasOverride && <span className="ml-1.5 text-indigo-500 font-sans font-bold">· custom terms</span>}
                    </p>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={clsx('text-[9px] font-bold px-2 py-0.5 rounded-full border', STATUS_TONE[r.status])}>
                      {r.status === 'ON_TRIAL' ? `${r.daysLeft}d left` : r.status === 'BILLABLE' ? 'Billing' : 'No trial'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-500">
                    {r.trialEndsAt ? new Date(r.trialEndsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold text-slate-700">
                    {r.monthToDateCount ? inr(r.monthToDatePaise) : '—'}
                  </td>
                  <td className={clsx('py-2.5 px-3 text-right font-bold', r.flagged ? 'text-rose-600' : 'text-slate-700')}>
                    {r.outstandingPaise ? inr(r.outstandingPaise) : '—'}
                    {r.flagged && <Icon name="alert" className="w-3 h-3 inline ml-1 -mt-0.5" />}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <button
                      type="button" onClick={() => setTrial(r)}
                      className="text-[10px] font-bold text-teal-700 hover:text-teal-900 underline underline-offset-2"
                    >
                      {r.trialEndsAt ? 'Change' : 'Grant'}
                    </button>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr><td colSpan={6} className="py-10 text-center text-slate-400 text-xs">No clinics in this view</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
