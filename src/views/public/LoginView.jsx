import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Field, Input, PasswordInput } from '../../components/ui/Field.jsx';
import { OtpInput } from '../../components/ui/OtpInput.jsx';
import { LivePill } from '../../components/layout/DarkHero.jsx';
import { ROLE_HOME, ROLES } from '../../lib/constants.js';
import { ACTIVE_PORTAL } from '../../lib/portals.js';
import { useNoIndex } from '../../lib/seo.js';

/**
 * `audience` splits the one sign-in screen by route, the way a consumer app
 * keeps its partner login apart: /login is for patients (OTP), /clinic/login
 * for doctors, the front desk and Mediigo staff (password). Without it, both
 * tabs show — which is also what a single-portal dev build falls back to.
 */
export default function LoginView({ audience }) {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { requestOtp, verifyOtp, staffLogin } = useAuth();
  useNoIndex(audience === 'staff' ? 'Clinic & staff sign in' : 'Sign in');

  /**
   * The tabs choose a METHOD, not an audience.
   *
   * They used to ask whether you were a patient or staff, and the method
   * followed from the answer — which meant a patient who picked the wrong tab
   * met a password field they had no password for, and a staff member on an
   * OTP-only login had to find a text link nested inside the other tab.
   *
   * Now the account decides the role, server-side, and the person only says
   * how they want to prove who they are. Password is the default because most
   * accounts now have one.
   */
  const portalPatient = !ACTIVE_PORTAL || ACTIVE_PORTAL.roles.includes(ROLES.PATIENT);
  const portalStaff = !ACTIVE_PORTAL || ACTIVE_PORTAL.roles.some((r) => r !== ROLES.PATIENT);
  // Still used to decide which ROLES this port will admit after sign-in, and
  // whether to offer the name field for first-time patient registration.
  let servesPatient = portalPatient && audience !== 'staff';
  let servesStaff = portalStaff && audience !== 'patient';
  if (!servesPatient && !servesStaff) { servesPatient = portalPatient; servesStaff = portalStaff; }

  const [method, setMethod] = useState('password');   // password | otp
  const [step, setStep] = useState('entry');          // entry | otp
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
      // PATIENT_LOGIN is the only purpose that creates an account when none
      // exists, so it is what a port offering patient sign-up must send.
      // Everywhere else the account must already exist, and STAFF_LOGIN says
      // so — the server rejects an unknown number rather than inventing one.
      const purpose = servesPatient ? undefined : 'STAFF_LOGIN';
      const res = await requestOtp(phone, purpose);
      setOtpPurpose(purpose);
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

  const submitPassword = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await staffLogin({ identifier, password });
      if (res.requires2fa) {
        // The 2FA requirement is the server's decision, from the Super Admin's
        // role policy — the client only reacts to it.
        //
        // The code goes to the account's registered phone, which is not
        // necessarily what was typed: signing in by email and storing that as
        // the phone made the verify lookup miss, because the OTP was written
        // against the account's number. Prefer what the server echoed back.
        setPhone(res.verifyPhone || identifier);
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
    <div className="min-h-screen flex flex-col bg-white font-display">
      <header className="bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          <Link to="/p/explore" className="flex items-center gap-2 min-w-0">
            <img src="/logo-mark.png" alt="" className="w-9 h-auto" />
            <div className="min-w-0 leading-none">
              <span className="block text-lg font-bold text-mg-navy tracking-tight">Mediigo</span>
              <span className="block text-[10px] text-slate-600 mt-0.5">Book Doctor Easily</span>
            </div>
          </Link>
          {servesPatient ? (
            <Link to="/p/explore" className="text-xs text-mg-teal hover:text-mg-tealDark font-medium">
              Browse clinics →
            </Link>
          ) : (
            <Link to="/clinic" className="text-xs text-mg-teal hover:text-mg-tealDark font-medium">
              Mediigo for clinics →
            </Link>
          )}
        </div>
      </header>
      <div className="h-2 bg-mg-blue" />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8 sm:py-12 grid lg:grid-cols-2 gap-8 items-stretch">
        {/* The homepage hero, so signing in feels like the same product. */}
        <section className="mg-hero hidden lg:flex flex-col p-8 min-h-[560px]">
          <LivePill />
          {servesPatient ? (
            <>
              <h2 className="mt-8 text-4xl font-semibold tracking-tight leading-tight">
                Find &amp; Book<br />Doctors Nearby
              </h2>
              <p className="mt-3 text-sm text-white/90 max-w-sm leading-relaxed">
                Skip the crowded waiting room. Get a digital token, real-time wait estimates and an alert when your turn is close.
              </p>
            </>
          ) : (
            <>
              <h2 className="mt-8 text-4xl font-semibold tracking-tight leading-tight">
                Your OPD,<br />running on time
              </h2>
              <p className="mt-3 text-sm text-white/90 max-w-sm leading-relaxed">
                Live queue, digital tokens, prescriptions and the day’s collection — for doctors, the front desk and the Mediigo team.
              </p>
            </>
          )}
          <img
            src="/assets/herobanner.png"
            alt=""
            className="mt-auto -mb-8 w-full max-w-[520px] self-center pointer-events-none select-none"
          />
        </section>

        <section className="mg-card p-6 sm:p-8 w-full max-w-md mx-auto lg:max-w-none">
          <div className="mb-6">
            <h1 className="mg-title">
              {step === 'otp' ? 'Verify your number' : audience === 'staff' ? 'Clinic & staff sign in' : 'Sign in to Mediigo'}
            </h1>
            <p className="text-xs text-mg-teal mt-1">
              {ACTIVE_PORTAL ? ACTIVE_PORTAL.label : 'Healthcare OPD & Clinic Network'}
            </p>
          </div>

        {step === 'entry' && (
          <>
            {/* Method, not audience. Password first: most accounts have one,
                and the ones that do not are told plainly where to go. */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-mg-surface rounded-full mb-6">
              {[['password', 'Login with password'], ['otp', 'Login with OTP']].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMethod(key)}
                  className={clsx(
                    'py-2 text-[11px] font-medium rounded-full transition-all',
                    method === key ? 'bg-mg-blue text-white' : 'text-slate-600 hover:text-slate-900',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {method === 'password' ? (
              <form onSubmit={submitPassword} className="space-y-4">
                <Field label="Phone or email" required>
                  <Input required value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="Phone number or email" />
                </Field>
                <Field label="Password" required>
                  <PasswordInput required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" />
                </Field>
                <Button type="submit" loading={busy} className="w-full" size="lg">
                  <Icon name="shield" className="w-4 h-4" /> Sign in
                </Button>
                {/* The escape hatch. An account created for OTP sign-in has no
                    password at all, and its owner has no way to know that from
                    a form that only asks for one. */}
                <button type="button" onClick={() => setMethod('otp')} className="w-full text-xs font-medium text-mg-teal hover:text-mg-tealDark">
                  No password yet? Sign in with a code instead
                </button>
                <p className="text-[11px] text-slate-500 text-center leading-relaxed">
                  By continuing you agree to our <Link to="/terms" className="underline hover:text-mg-blue">Terms of Use</Link> and <Link to="/privacy-policy" className="underline hover:text-mg-blue">Privacy Policy</Link>.
                </p>
              </form>
            ) : (
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
                {/* Only a port that registers patients can create an account
                    from a code, so only that port asks for a name. */}
                {servesPatient && (
                  <Field label="Your name" hint="Only needed the first time you sign in">
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Rajesh Kumar" />
                  </Field>
                )}
                <Button type="submit" loading={busy} className="w-full" size="lg">
                  Send OTP on WhatsApp
                </Button>
                <button type="button" onClick={() => setMethod('password')} className="w-full text-xs font-medium text-mg-teal hover:text-mg-tealDark">
                  \u2190 Sign in with password
                </button>
                <p className="text-[11px] text-slate-500 text-center leading-relaxed">
                  By continuing you agree to our <Link to="/terms" className="underline hover:text-mg-blue">Terms of Use</Link> and <Link to="/privacy-policy" className="underline hover:text-mg-blue">Privacy Policy</Link>.
                </p>
              </form>
            )}

            <div className="pt-3 mt-1 border-t border-slate-100 text-center text-xs text-slate-500">
              {servesPatient && (
                <Link to="/p/explore" className="font-medium text-mg-teal hover:underline">Browse clinics without signing in \u2192</Link>
              )}
              {!servesPatient && (
                <>
                  New to Mediigo? <Link to="/clinic#enquire" className="font-medium text-mg-blue hover:underline">Get your clinic on board</Link>
                  <span className="mx-1.5 text-slate-300">\u00b7</span>
                  <Link to="/p/explore" className="font-medium text-mg-teal hover:underline">Book a doctor</Link>
                </>
              )}
            </div>
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
  );
}
