import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Logo, Icon } from '../../components/ui/Icon.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Field, Input } from '../../components/ui/Field.jsx';
import { OtpInput } from '../../components/ui/OtpInput.jsx';
import { ROLE_HOME, ROLES } from '../../lib/constants.js';
import { ACTIVE_PORTAL } from '../../lib/portals.js';
import { DemoAccounts } from '../../components/ui/DemoAccounts.jsx';

export default function LoginView() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { requestOtp, verifyOtp, staffLogin } = useAuth();

  // A port that serves no patient role opens straight on the staff tab.
  const servesPatient = !ACTIVE_PORTAL || ACTIVE_PORTAL.roles.includes(ROLES.PATIENT);
  const servesStaff = !ACTIVE_PORTAL || ACTIVE_PORTAL.roles.some((r) => r !== ROLES.PATIENT);
  const [mode, setMode] = useState(servesPatient ? 'patient' : 'staff');
  const [step, setStep] = useState('entry');   // entry | otp
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [otpPurpose, setOtpPurpose] = useState(undefined);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState(null);

  const goHome = (role) => navigate(location.state?.from || ROLE_HOME[role] || '/explore', { replace: true });

  const sendOtp = async (e) => {
    e?.preventDefault();
    setBusy(true);
    try {
      const res = await requestOtp(phone);
      setStep('otp');
      // The server returns the code only in development demo mode.
      setHint(res?.debugCode ? `Demo mode — your code is ${res.debugCode}` : `Sent to ${phone} on WhatsApp`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const submitOtp = async (code) => {
    setBusy(true);
    try {
      const user = await verifyOtp({ phone, otp: code || otp, name: name || undefined, purpose: otpPurpose });
      toast.success(`Welcome, ${user.name}`);
      goHome(user.role);
    } catch (err) {
      toast.error(err.message);
      setOtp('');
    } finally {
      setBusy(false);
    }
  };

  const submitStaff = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await staffLogin({ identifier, password });
      if (res.requires2fa) {
        // The 2FA requirement is the server's decision, from the Super Admin's
        // role policy — the client only reacts to it.
        setPhone(identifier);
        setOtpPurpose(res.purpose);
        setStep('otp');
        setHint(`Two-factor is enabled for your role. Code sent to ${res.phone}`);
        toast.push('Enter the code sent on WhatsApp');
      } else {
        toast.success(`Welcome, ${res.user.name}`);
        goHome(res.user.role);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/95 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-700/40">
        <div className="text-center mb-6">
          <Logo className="w-16 h-16 mx-auto mb-3 shadow-lg shadow-teal-500/20" rounded="rounded-2xl" />
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Medi<span className="text-teal-600">igo</span>
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            {ACTIVE_PORTAL ? ACTIVE_PORTAL.label : 'Healthcare OPD & Clinic Network'}
          </p>
        </div>

        {step === 'entry' && (
          <>
            {servesPatient && servesStaff && (
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-2xl mb-6 border border-slate-200">
              {[['patient', 'Patient'], ['staff', 'Clinic / Staff']].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMode(key)}
                  className={clsx(
                    'py-2.5 text-xs font-bold rounded-xl transition-all',
                    mode === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            )}

            {mode === 'patient' ? (
              <form onSubmit={sendOtp} className="space-y-4">
                <Field label="Mobile number" required>
                  <Input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="9876543210"
                  />
                </Field>
                <Field label="Your name" hint="Only needed the first time you sign in">
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Rajesh Kumar" />
                </Field>
                <Button type="submit" loading={busy} className="w-full" size="lg">
                  Send OTP on WhatsApp
                </Button>
                <Link to="/explore" className="block text-center text-xs font-bold text-slate-500 hover:text-teal-700 pt-1">
                  Browse clinics without signing in →
                </Link>

                <DemoAccounts
                  roles={ACTIVE_PORTAL?.roles}
                  kind="otp"
                  onPick={(a) => { setPhone(a.phone); setName(a.name); }}
                />
              </form>
            ) : (
              <form onSubmit={submitStaff} className="space-y-4">
                <Field label="Phone or email" required>
                  <Input required value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="9000000101" />
                </Field>
                <Field label="Password" required>
                  <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                </Field>
                <Button type="submit" loading={busy} className="w-full" size="lg">
                  <Icon name="shield" className="w-4 h-4" /> Sign in
                </Button>

                <DemoAccounts
                  roles={ACTIVE_PORTAL?.roles}
                  kind="password"
                  onPick={(a) => { setIdentifier(a.phone); setPassword('Mediigo@123'); }}
                />
              </form>
            )}
          </>
        )}

        {step === 'otp' && (
          <div className="space-y-5">
            <div className="text-center">
              <p className="text-sm font-bold text-slate-900">Enter the verification code</p>
              {hint && <p className="text-[11px] text-slate-500 mt-1">{hint}</p>}
            </div>
            <OtpInput length={4} value={otp} onChange={setOtp} onComplete={submitOtp} />
            <Button loading={busy} disabled={otp.length < 4} onClick={() => submitOtp()} className="w-full" size="lg">
              Verify &amp; continue
            </Button>
            <button
              type="button"
              onClick={() => { setStep('entry'); setOtp(''); setHint(null); }}
              className="w-full text-xs font-bold text-slate-500 hover:text-slate-800"
            >
              ← Use a different number
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
