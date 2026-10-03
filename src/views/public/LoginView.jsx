import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Field, Input } from '../../components/ui/Field.jsx';
import { OtpInput } from '../../components/ui/OtpInput.jsx';
import { LivePill } from '../../components/layout/DarkHero.jsx';
import { ROLE_HOME, ROLES } from '../../lib/constants.js';
import { ACTIVE_PORTAL } from '../../lib/portals.js';
import { DemoAccounts } from '../../components/ui/DemoAccounts.jsx';
import { PortalThemeProvider } from '../../context/PortalTheme.jsx';

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

  // "Where you were headed" is only honoured when the role that actually
  // signed in owns that area. A guest stopped at /p/vault who then signs in as
  // a doctor was not headed to the patient vault — sending them there is the
  // same wrong-portal landing the /p namespace exists to prevent.
  const goHome = (role) => {
    const home = ROLE_HOME[role] || '/p/explore';
    const from = location.state?.from;
    const prefix = home.startsWith('/p/') ? '/p/' : `/${home.split('/')[1]}/`;
    const target = from && (from.startsWith(prefix) || from === home) ? from : home;
    navigate(target, { replace: true });
  };

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
    <PortalThemeProvider value="patient">
    <div className="min-h-screen flex flex-col bg-white font-display">
      <header className="bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          <Link to="/p/explore" className="flex items-center gap-2 min-w-0">
            <img src="/logo-mark.png" alt="" className="w-9 h-auto" />
            <div className="min-w-0 leading-none">
              <span className="block text-lg font-bold text-mg-navy tracking-tight">Mediigo</span>
              <span className="block text-[9px] text-slate-600 mt-0.5">Book Doctor Easily</span>
            </div>
          </Link>
          {servesPatient && (
            <Link to="/p/explore" className="text-xs text-mg-teal hover:text-mg-tealDark font-medium">
              Browse clinics →
            </Link>
          )}
        </div>
      </header>
      <div className="h-2 bg-mg-blue" />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8 sm:py-12 grid lg:grid-cols-2 gap-8 items-stretch">
        {/* The homepage hero, so signing in feels like the same product. */}
        <section className="mg-hero hidden lg:flex flex-col p-8 min-h-[560px]">
          <LivePill />
          <h2 className="mt-8 text-4xl font-semibold tracking-tight leading-tight">
            Find &amp; Book<br />Doctors Nearby
          </h2>
          <p className="mt-3 text-sm text-white/90 max-w-sm leading-relaxed">
            Skip the crowded waiting room. Get a digital token, real-time wait estimates and a alert when your turn is close.
          </p>
          <img
            src="/assets/herobanner.png"
            alt=""
            className="mt-auto -mb-8 w-full max-w-[520px] self-center pointer-events-none select-none"
          />
        </section>

        <section className="mg-card p-6 sm:p-8 w-full max-w-md mx-auto lg:max-w-none">
          <div className="mb-6">
            <h1 className="mg-title">
              {step === 'otp' ? 'Verify your number' : mode === 'staff' ? 'Clinic & staff sign in' : 'Sign in to Mediigo'}
            </h1>
            <p className="text-xs text-mg-teal mt-1">
              {ACTIVE_PORTAL ? ACTIVE_PORTAL.label : 'Healthcare OPD & Clinic Network'}
            </p>
          </div>

        {step === 'entry' && (
          <>
            {servesPatient && servesStaff && (
            <div className="grid grid-cols-2 gap-1 p-1 bg-mg-surface rounded-full mb-6">
              {[['patient', 'Patient'], ['staff', 'Clinic / Staff']].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMode(key)}
                  className={clsx(
                    'py-2 text-xs font-medium rounded-full transition-all',
                    mode === key ? 'bg-mg-blue text-white' : 'text-slate-600 hover:text-slate-900',
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
                <Link to="/p/explore" className="block text-center text-xs font-medium text-mg-teal hover:text-mg-tealDark pt-1">
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
              <p className="text-sm font-medium text-slate-900">Enter the verification code</p>
              {hint && <p className="text-[11px] text-slate-500 mt-1">{hint}</p>}
            </div>
            <OtpInput length={4} value={otp} onChange={setOtp} onComplete={submitOtp} />
            <Button loading={busy} disabled={otp.length < 4} onClick={() => submitOtp()} className="w-full" size="lg">
              Verify &amp; continue
            </Button>
            <button
              type="button"
              onClick={() => { setStep('entry'); setOtp(''); setHint(null); }}
              className="w-full text-xs font-medium text-mg-teal hover:text-mg-tealDark"
            >
              ← Use a different number
            </button>
          </div>
        )}
        </section>
      </main>
    </div>
    </PortalThemeProvider>
  );
}
