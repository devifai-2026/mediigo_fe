import { useState, useEffect } from 'react';
import clsx from 'clsx';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../lib/api.js';
import { Button } from '../../components/ui/Button.jsx';
import { Field, Input, Select } from '../../components/ui/Field.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { SkeletonRows } from '../../components/ui/Skeleton.jsx';
import { ROLES, ROLE_LABEL } from '../../lib/constants.js';

const TOGGLEABLE = [ROLES.DOCTOR, ROLES.RECEPTIONIST, ROLES.FIELD_AGENT, ROLES.EXEC_ADMIN, ROLES.SUPER_ADMIN];

/**
 * WhatsApp / OTP runtime configuration. This is the one place the 2FA rule is
 * authored — the login screen only reacts to what the server tells it.
 */
export default function SecurityPolicyView() {
  const { data, loading, refetch } = useApi('/api/superadmin/wa-settings');
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [testPhone, setTestPhone] = useState('');

  useEffect(() => { if (data) setForm(data); }, [data]);

  if (loading || !form) return <SkeletonRows rows={5} />;

  const set = (k, v) => setForm({ ...form, [k]: v });

  const toggleRole = (role) => {
    const list = new Set(form.require2faRoles || []);
    if (list.has(role)) list.delete(role); else list.add(role);
    set('require2faRoles', [...list]);
  };

  const save = async () => {
    setBusy(true);
    try {
      const { wabridgeAuthKeySet, _id, createdAt, updatedAt, updatedBy, ...patch } = form;
      await api.put('/api/superadmin/wa-settings', patch);
      toast.success('Settings saved — applies to the next login');
      refetch();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  const sendTest = async () => {
    try {
      const r = await api.post('/api/superadmin/wa-settings/test', { phone: testPhone });
      toast.success(`Sent via ${r.data.data.provider} · ${r.data.data.messageId}`);
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Security &amp; messaging</h2>
        <p className="text-xs text-slate-500">WhatsApp delivery, OTP behaviour and two-factor policy</p>
      </div>

      <div className="glass-card rounded-3xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900">OTP behaviour</h3>

        <div className={clsx('flex items-center justify-between p-4 rounded-2xl border',
          form.otpDemo ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200')}
        >
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-800">Demo mode</p>
            <p className="text-[11px] text-slate-600 mt-0.5">
              {form.otpDemo
                ? `Every login accepts the fixed code ${form.otpDemoCode} and nothing is sent. Turn this off before real patients use the app.`
                : 'Real codes are generated and delivered over WhatsApp.'}
            </p>
          </div>
          <Button
            size="sm"
            variant={form.otpDemo ? 'warn' : 'secondary'}
            onClick={() => set('otpDemo', !form.otpDemo)}
            className="shrink-0"
          >
            {form.otpDemo ? 'Demo ON' : 'Demo off'}
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="Demo code"><Input value={form.otpDemoCode} onChange={(e) => set('otpDemoCode', e.target.value)} /></Field>
          <Field label="Code length"><Input inputMode="numeric" value={form.otpLength} onChange={(e) => set('otpLength', Number(e.target.value) || 6)} /></Field>
          <Field label="Valid for (min)"><Input inputMode="numeric" value={form.otpTtlMinutes} onChange={(e) => set('otpTtlMinutes', Number(e.target.value) || 5)} /></Field>
          <Field label="Max attempts"><Input inputMode="numeric" value={form.otpMaxAttempts} onChange={(e) => set('otpMaxAttempts', Number(e.target.value) || 5)} /></Field>
        </div>
      </div>

      <div className="glass-card rounded-3xl p-6 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Two-factor authentication</h3>
          <p className="text-[11px] text-slate-500">Roles that must confirm a WhatsApp code after their password</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {TOGGLEABLE.map((r) => {
            const on = (form.require2faRoles || []).includes(r);
            return (
              <button
                key={r}
                type="button"
                onClick={() => toggleRole(r)}
                className={clsx('flex items-center justify-between p-3 rounded-2xl border transition text-left',
                  on ? 'bg-teal-50 border-teal-300' : 'bg-slate-50 border-slate-200 hover:border-slate-300')}
              >
                <span className="text-xs font-bold text-slate-800">{ROLE_LABEL[r]}</span>
                <span className={clsx('text-[10px] font-extrabold px-2 py-0.5 rounded',
                  on ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-500')}
                >
                  {on ? '2FA ON' : 'OFF'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="glass-card rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">WhatsApp delivery (WABridge)</h3>
          <span className={clsx('text-[10px] font-bold px-2 py-1 rounded border',
            form.enabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200')}
          >
            {form.enabled ? 'Live' : 'Console only'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Provider">
            <Select value={form.provider} onChange={(e) => set('provider', e.target.value)}>
              <option value="console">Console (log only)</option>
              <option value="wabridge">WABridge</option>
            </Select>
          </Field>
          <Field label="Enabled">
            <Select value={form.enabled ? '1' : '0'} onChange={(e) => set('enabled', e.target.value === '1')}>
              <option value="0">No — log to server console</option>
              <option value="1">Yes — send real messages</option>
            </Select>
          </Field>
        </div>

        <Field label="Base URL"><Input value={form.wabridgeBaseUrl || ''} onChange={(e) => set('wabridgeBaseUrl', e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="App key"><Input value={form.wabridgeAppKey || ''} onChange={(e) => set('wabridgeAppKey', e.target.value)} /></Field>
          <Field label="Device id"><Input value={form.wabridgeDeviceId || ''} onChange={(e) => set('wabridgeDeviceId', e.target.value)} /></Field>
        </div>
        <Field label="Auth key" hint={form.wabridgeAuthKeySet ? 'A key is saved — leave blank to keep it' : 'Not set'}>
          <Input type="password" placeholder={form.wabridgeAuthKeySet ? '••••••••' : 'Paste the auth key'} onChange={(e) => set('wabridgeAuthKey', e.target.value)} />
        </Field>
        <Field label="OTP template id"><Input value={form.templateOtp || ''} onChange={(e) => set('templateOtp', e.target.value)} /></Field>

        <div className="flex gap-2 items-end pt-2 border-t border-slate-100">
          <Field label="Send a test message" className="flex-1">
            <Input inputMode="numeric" maxLength={10} value={testPhone} onChange={(e) => setTestPhone(e.target.value.replace(/\D/g, ''))} placeholder="9876543210" />
          </Field>
          <Button variant="secondary" onClick={sendTest} disabled={testPhone.length !== 10}>Send test</Button>
        </div>
      </div>

      <Button onClick={save} loading={busy} className="w-full" size="lg">
        <Icon name="check" className="w-4 h-4" /> Save settings
      </Button>
    </div>
  );
}
