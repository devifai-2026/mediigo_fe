import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Field, Input, PasswordInput } from '../../components/ui/Field.jsx';
import { phoneError, nameError, passwordError, collect } from '../../lib/validators.js';
import { OtpInput } from '../../components/ui/OtpInput.jsx';
import { LivePill } from '../../components/layout/DarkHero.jsx';
import { useNoIndex } from '../../lib/seo.js';

/**
 * Patient sign-up. The number is always verified with a WhatsApp code — that
 * is what creates the account — and the person chooses whether to also set a
 * password for next time, or keep signing in with a code.
 */
export default function SignupView() {
  const navigate = useNavigate();
  const toast = useToast();
  const { requestOtp, signUp } = useAuth();
  useNoIndex('Create your account');

  const [step, setStep] = useState('details');   // details | otp
  const [method, setMethod] = useState('password'); // password | otp
  const [form, setForm] = useState({ name: '', phone: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [otp, setOtp] = useState('');
  const [otpLength, setOtpLength] = useState(4);
  const [hint, setHint] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const sendCode = async (e) => {
    e?.preventDefault();
    const problems = collect({
      name: nameError(form.name),
      phone: phoneError(form.phone),
      password: method === 'password' ? passwordError(form.password) : '',
      confirm: method === 'password' && form.password && form.password !== form.confirm ? 'Does not match the password' : '',
    });
    setErrors(problems);
    if (Object.keys(problems).length) return;
    setBusy(true);
    try {
      const res = await requestOtp(form.phone);
      if (res?.otpLength) setOtpLength(res.otpLength);
      setHint(res?.debugCode ? `Demo mode — your code is ${res.debugCode}` : `Sent to ${form.phone} on WhatsApp`);
      setOtp('');
      setStep('otp');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const verify = async (code) => {
    setBusy(true);
    try {
      const { user, isNew, passwordSet } = await signUp({
        phone: form.phone,
        otp: code || otp,
        name: form.name.trim(),
        password: method === 'password' ? form.password : undefined,
      });
      if (!isNew) {
        toast.success(`Welcome back, ${user.name} — this number already had an account, so we signed you in`);
      } else {
        toast.success(`Account created. Welcome, ${user.name}!`);
      }
      if (method === 'password' && !passwordSet) {
        toast.push('Your existing password is unchanged. You can change it from your account.');
      }
      navigate('/p/explore', { replace: true });
    } catch (err) {
      toast.error(err.message);
      setOtp('');
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
          <Link to="/p/explore" className="text-xs text-mg-teal hover:text-mg-tealDark font-medium">
            Browse clinics →
          </Link>
        </div>
      </header>
      <div className="h-2 bg-mg-blue" />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8 sm:py-12 grid lg:grid-cols-2 gap-8 items-stretch">
        <section className="mg-hero hidden lg:flex flex-col p-8 min-h-[560px]">
          <LivePill />
          <h2 className="mt-8 text-4xl font-semibold tracking-tight leading-tight">
            Book tokens.<br />Skip the wait.
          </h2>
          <p className="mt-3 text-sm text-white/90 max-w-sm leading-relaxed">
            One account for you and your family — digital tokens, live queue tracking and your records in one place.
          </p>
          <img
            src="/assets/herobanner.png"
            alt=""
            className="mt-auto -mb-8 w-full max-w-[520px] self-center pointer-events-none select-none"
          />
        </section>

        <section className="mg-card p-6 sm:p-8 w-full max-w-md mx-auto lg:max-w-none">
          <div className="mb-6">
            <h1 className="mg-title">{step === 'otp' ? 'Verify your number' : 'Create your account'}</h1>
            <p className="text-xs text-mg-teal mt-1">Free for patients · takes under a minute</p>
          </div>

          {step === 'details' && (
            <form onSubmit={sendCode} className="space-y-4" noValidate>
              <Field label="Full name" required error={errors.name}>
                <Input error={errors.name} value={form.name} onChange={set('name')} placeholder="Rajesh Kumar" autoComplete="name" />
              </Field>
              <Field label="Mobile number" required error={errors.phone} hint="We will send a code on WhatsApp to verify it">
                <Input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  error={errors.phone}
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))}
                  placeholder="9876543210"
                />
              </Field>

              <div>
                <p className="text-xs font-medium text-slate-700 mb-2">How do you want to sign in next time?</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ['password', 'With a password', 'shield'],
                    ['otp', 'With a WhatsApp code', 'chat'],
                  ].map(([key, label, icon]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => { setMethod(key); setErrors((e) => ({ ...e, password: undefined, confirm: undefined })); }}
                      className={clsx(
                        'flex items-center gap-2 p-3 rounded-xl border text-left text-xs font-medium transition',
                        method === key ? 'border-mg-blue bg-mg-blue/5 text-mg-navy ring-2 ring-mg-blue/20' : 'border-slate-200 text-slate-600 hover:border-slate-300',
                      )}
                    >
                      <Icon name={icon} className="w-4 h-4 shrink-0" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {method === 'password' ? (
                <>
                  <Field label="Password" required error={errors.password} hint="At least 8 characters">
                    <PasswordInput autoComplete="new-password" error={errors.password} value={form.password} onChange={set('password')} />
                  </Field>
                  <Field label="Confirm password" required error={errors.confirm}>
                    <PasswordInput autoComplete="new-password" error={errors.confirm} value={form.confirm} onChange={set('confirm')} />
                  </Field>
                </>
              ) : (
                <p className="text-[11px] text-slate-500 bg-mg-surface rounded-lg p-3 leading-relaxed">
                  No password to remember — each time you sign in we send a code to your WhatsApp. You can add a password later from your account.
                </p>
              )}

              <Button type="submit" loading={busy} className="w-full" size="lg">
                Send verification code
              </Button>
              <p className="text-[11px] text-slate-500 text-center leading-relaxed">
                By continuing you agree to our <Link to="/terms" className="underline hover:text-mg-blue">Terms of Use</Link> and <Link to="/privacy-policy" className="underline hover:text-mg-blue">Privacy Policy</Link>.
              </p>
              <div className="pt-3 border-t border-slate-100 text-center text-xs text-slate-500">
                Already have an account? <Link to="/login" className="font-medium text-mg-blue hover:underline">Sign in</Link>
              </div>
            </form>
          )}

          {step === 'otp' && (
            <div className="space-y-5">
              <div className="text-center">
                <p className="text-sm font-medium text-slate-900">Enter the verification code</p>
                {hint && <p className="text-[11px] text-slate-500 mt-1">{hint}</p>}
              </div>
              <OtpInput length={otpLength} value={otp} onChange={setOtp} onComplete={verify} />
              <Button loading={busy} disabled={otp.length < otpLength} onClick={() => verify()} className="w-full" size="lg">
                Verify &amp; create account
              </Button>
              <div className="flex justify-between text-xs font-medium">
                <button type="button" onClick={() => { setStep('details'); setHint(null); }} className="text-mg-teal hover:text-mg-tealDark">
                  ← Edit details
                </button>
                <button type="button" disabled={busy} onClick={() => sendCode()} className="text-mg-blue hover:underline disabled:opacity-50">
                  Resend code
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
