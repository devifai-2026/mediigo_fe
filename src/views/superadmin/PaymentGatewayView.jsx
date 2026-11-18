import { useState, useEffect } from 'react';
import clsx from 'clsx';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import { api, unwrap } from '../../lib/api.js';
import { Button } from '../../components/ui/Button.jsx';
import { Field, Input } from '../../components/ui/Field.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { SkeletonRows } from '../../components/ui/Skeleton.jsx';
import { AdminPageHeader } from '../../components/superadmin/AdminKpi.jsx';
import { asList } from '../../lib/list.js';
import { inr } from '../../lib/format.js';

const MODES = [
  { key: 'sandbox', label: 'Sandbox (test)', hint: 'Test keys from the Cashfree sandbox dashboard. No real money moves.' },
  { key: 'production', label: 'Production (live)', hint: 'Live keys. Patients are charged real money.' },
];

const STATUS_TONE = {
  BOOKED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REFUNDED: 'bg-sky-50 text-sky-700 border-sky-200',
  REFUND_FAILED: 'bg-rose-50 text-rose-700 border-rose-200',
  PROCESSING: 'bg-amber-50 text-amber-700 border-amber-200',
  CREATED: 'bg-slate-50 text-slate-500 border-slate-200',
  EXPIRED: 'bg-slate-50 text-slate-400 border-slate-200',
};

const emptyKeys = { sandbox: { appId: '', secretKey: '' }, production: { appId: '', secretKey: '' } };

/**
 * Online booking fee and the Cashfree keys that collect it.
 *
 * Keys are write-only from here: the server stores them encrypted and only
 * ever sends back whether one is saved and its last four characters. Leaving a
 * key field blank on save keeps the saved one.
 */
export default function PaymentGatewayView() {
  const { data, loading, refetch } = useApi('/api/superadmin/payment-settings');
  const recent = useApi('/api/superadmin/payment-settings/payments');
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [keys, setKeys] = useState(emptyKeys);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(null);

  useEffect(() => {
    if (data) setForm({ enabled: data.enabled, mode: data.mode, feeRupees: String(data.bookingFeePaise / 100) });
  }, [data]);

  if (loading || !form || !data) return <SkeletonRows rows={5} />;

  const setKey = (mode, k, v) => setKeys({ ...keys, [mode]: { ...keys[mode], [k]: v } });

  const save = async () => {
    const fee = Number(form.feeRupees);
    if (!Number.isFinite(fee) || fee < 1) { toast.error('Booking fee must be at least ₹1'); return; }
    if (form.mode === 'production' && form.enabled && data.mode !== 'production'
      && !window.confirm('Switch to PRODUCTION? Patients will be charged real money from the next booking.')) return;
    setBusy(true);
    try {
      const body = { enabled: form.enabled, mode: form.mode, bookingFeePaise: Math.round(fee * 100) };
      for (const m of ['sandbox', 'production']) {
        const appId = keys[m].appId.trim();
        const secretKey = keys[m].secretKey.trim();
        if (appId || secretKey) body[m] = { ...(appId ? { appId } : {}), ...(secretKey ? { secretKey } : {}) };
      }
      await api.put('/api/superadmin/payment-settings', body);
      setKeys(emptyKeys);
      toast.success('Payment settings saved');
      refetch();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  const test = async (mode) => {
    setTesting(mode);
    try {
      const r = unwrap(await api.post('/api/superadmin/payment-settings/test', { mode }));
      if (r.ok) toast.success(`Cashfree accepted the saved ${mode} keys`);
      else toast.error(r.message || 'Cashfree rejected these keys');
    } catch (e) { toast.error(e.message); } finally { setTesting(null); }
  };

  const live = data.enabled && data[data.mode]?.configured;

  return (
    <div className="space-y-5">
      <AdminPageHeader icon="fa-credit-card" title="Payment Gateway" subtitle="Cashfree keys and the online booking fee patients pay" />
      <div className="max-w-3xl space-y-5">

        {!data.encryptionReady && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
            <p className="font-semibold">Keys cannot be saved yet</p>
            <p className="mt-1">Set <code className="font-mono">PAYMENT_KEYS_SECRET</code> (32+ random characters) in the server environment and restart it. It encrypts the keys stored here.</p>
          </div>
        )}

        {/* ── Booking fee ─────────────────────────────────────────── */}
        <div className="glass-card rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Online booking fee</h3>
              <p className="text-[11px] text-slate-500">Paid by the patient to Mediigo when booking in the app. The consultation fee is still paid at the clinic.</p>
            </div>
            <span className={clsx('text-[10px] font-semibold px-2 py-1 rounded-md border shrink-0',
              live ? (data.mode === 'production' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200')
                : 'bg-slate-100 text-slate-500 border-slate-200')}
            >
              {live ? (data.mode === 'production' ? 'Live · charging' : 'Sandbox · test payments') : 'Off · booking is free'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Fee per booking (₹)" hint="Default ₹10">
              <Input inputMode="decimal" value={form.feeRupees} onChange={(e) => setForm({ ...form, feeRupees: e.target.value.replace(/[^\d.]/g, '') })} />
            </Field>
            <Field label="Collect the fee">
              <div className="grid grid-cols-2 gap-2">
                {[true, false].map((on) => (
                  <button
                    key={String(on)}
                    type="button"
                    onClick={() => setForm({ ...form, enabled: on })}
                    className={clsx('h-10 rounded-lg border text-xs font-semibold transition',
                      form.enabled === on ? 'bg-mg-teal text-white border-mg-teal' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300')}
                  >
                    {on ? 'On' : 'Off'}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </div>

        {/* ── Environment ─────────────────────────────────────────── */}
        <div className="glass-card rounded-xl p-6 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Environment</h3>
            <p className="text-[11px] text-slate-500">Which key set new payments use. Payments already in progress finish on the set they started with.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {MODES.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setForm({ ...form, mode: m.key })}
                className={clsx('text-left p-3 rounded-lg border transition',
                  form.mode === m.key
                    ? (m.key === 'production' ? 'bg-emerald-50 border-emerald-300' : 'bg-amber-50 border-amber-300')
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300')}
              >
                <span className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800">{m.label}</span>
                  {form.mode === m.key && <Icon name="check" className="w-4 h-4 text-mg-teal" />}
                </span>
                <span className="block text-[11px] text-slate-500 mt-0.5">{m.hint}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Keys, one card per environment ──────────────────────── */}
        {MODES.map((m) => {
          const saved = data[m.key];
          return (
            <div key={m.key} className="glass-card rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-900">Cashfree {m.label.split(' ')[0].toLowerCase()} keys</h3>
                <span className={clsx('text-[10px] font-semibold px-2 py-1 rounded-md border',
                  saved.configured ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200')}
                >
                  {saved.configured ? `Saved · App ID ${saved.appIdHint}` : 'Not set'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="App ID (x-client-id)" hint={saved.appIdHint ? 'Leave blank to keep the saved one' : undefined}>
                  <Input
                    autoComplete="off"
                    value={keys[m.key].appId}
                    placeholder={saved.appIdHint ? `•••••••• ${saved.appIdHint}` : 'Paste the App ID'}
                    onChange={(e) => setKey(m.key, 'appId', e.target.value)}
                  />
                </Field>
                <Field label="Secret Key (x-client-secret)" hint={saved.secretKeySet ? 'Leave blank to keep the saved one' : undefined}>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={keys[m.key].secretKey}
                    placeholder={saved.secretKeySet ? '••••••••••••' : 'Paste the Secret Key'}
                    onChange={(e) => setKey(m.key, 'secretKey', e.target.value)}
                  />
                </Field>
              </div>
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <p className="text-[11px] text-slate-400">
                  {saved.updatedAt ? `Updated ${new Date(saved.updatedAt).toLocaleString('en-IN')}` : 'Stored encrypted — never shown again after saving.'}
                </p>
                <Button size="sm" variant="secondary" onClick={() => test(m.key)} loading={testing === m.key} disabled={!saved.configured}>
                  Test saved keys
                </Button>
              </div>
            </div>
          );
        })}

        <div className="glass-card rounded-xl p-6 space-y-2">
          <h3 className="text-sm font-semibold text-slate-900">Webhook</h3>
          <p className="text-[11px] text-slate-500">
            Sent with every order automatically when the server URL is https. Optionally also add it in the Cashfree dashboard
            (Developers → Webhooks) for Payment success events, so a token is issued even if the patient closes the app mid-payment.
          </p>
          <code className="block text-[11px] font-mono bg-slate-50 border border-slate-200 rounded-md p-2 break-all">{data.webhookUrl}</code>
        </div>

        <Button onClick={save} loading={busy} className="w-full" size="lg" disabled={!data.encryptionReady}>
          <Icon name="check" className="w-4 h-4" /> Save payment settings
        </Button>

        {/* ── Recent payments ─────────────────────────────────────── */}
        <div className="glass-card rounded-xl p-6 space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">Recent booking-fee payments</h3>
          {recent.loading ? <SkeletonRows rows={3} /> : asList(recent.data).length === 0 ? (
            <p className="text-xs text-slate-400">None yet.</p>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wide text-slate-400">
                    <th className="px-2 py-1.5">When</th>
                    <th className="px-2 py-1.5">Patient</th>
                    <th className="px-2 py-1.5">Amount</th>
                    <th className="px-2 py-1.5">Status</th>
                    <th className="px-2 py-1.5">Order</th>
                  </tr>
                </thead>
                <tbody>
                  {asList(recent.data).map((p) => (
                    <tr key={p._id} className="border-t border-slate-100">
                      <td className="px-2 py-1.5 whitespace-nowrap">{new Date(p.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</td>
                      <td className="px-2 py-1.5">{p.patientId?.name || '—'}<span className="block text-[10px] text-slate-400">{p.patientId?.phone}</span></td>
                      <td className="px-2 py-1.5">{inr(p.amountPaise / 100)}{p.mode === 'sandbox' && <span className="ml-1 text-[9px] text-amber-600">TEST</span>}</td>
                      <td className="px-2 py-1.5">
                        <span className={clsx('px-1.5 py-0.5 rounded border text-[10px] font-semibold', STATUS_TONE[p.status])}>{p.status.replace('_', ' ')}</span>
                        {p.failureReason && <span className="block text-[10px] text-slate-400 mt-0.5">{p.failureReason}</span>}
                      </td>
                      <td className="px-2 py-1.5 font-mono text-[10px] text-slate-500">{p.orderId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
