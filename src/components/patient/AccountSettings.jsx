import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { api, unwrap } from '../../lib/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Field, Input, Select } from '../ui/Field.jsx';
import { Icon } from '../ui/Icon.jsx';
import { OtpInput } from '../ui/OtpInput.jsx';
import { PhotoCropper, ACCEPT_MIME, ACCEPT_ATTR, MAX_MB } from '../ui/PhotoCropper.jsx';
import { initials, phone as fmtPhone } from '../../lib/format.js';

/**
 * The patient's own account: photo, personal details, mobile number, and
 * deleting the account. Each lives in its own small dialog so the profile
 * page stays a read-first summary.
 */

/** Avatar with a camera button: pick, crop to a square, upload. */
export function AvatarEditor({ className = 'w-20 h-20' }) {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const inputRef = useRef(null);
  const [picked, setPicked] = useState(null);
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(false);
  const url = user?.photo?.url;

  const choose = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!ACCEPT_MIME.includes(f.type)) { toast.error('Please choose a JPEG or PNG photo.'); return; }
    if (f.size > MAX_MB * 1024 * 1024) { toast.error(`Please choose a photo under ${MAX_MB}MB.`); return; }
    setPicked(f);
  };

  const upload = async (file) => {
    setBusy(true);
    try {
      const body = new FormData();
      body.append('photo', file);
      // Let the browser set the multipart boundary.
      await api.put('/api/patients/me/photo', body, { headers: { 'Content-Type': undefined } });
      await refreshUser();
      toast.success('Photo updated');
      setPicked(null);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setMenu(false);
    setBusy(true);
    try {
      await api.delete('/api/patients/me/photo');
      await refreshUser();
      toast.success('Photo removed');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative shrink-0">
      <div className={clsx(className, 'rounded-full overflow-hidden bg-white ring-4 ring-white/30 grid place-items-center')}>
        {url
          ? <img src={url} alt="" className="w-full h-full object-cover" />
          : <span className="text-2xl font-bold text-mg-navy">{initials(user?.name)}</span>}
        {busy && <span className="absolute inset-0 rounded-full bg-slate-900/40 grid place-items-center"><span className="w-6 h-6 rounded-full border-2 border-white border-t-transparent animate-spin" /></span>}
      </div>
      <button
        type="button"
        onClick={() => (url ? setMenu((v) => !v) : inputRef.current?.click())}
        aria-label={url ? 'Change or remove photo' : 'Add a photo'}
        className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-mg-teal text-white grid place-items-center ring-2 ring-white shadow hover:bg-mg-tealDark transition"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
      {menu && (
        <div className="absolute left-0 top-full mt-2 z-20 w-44 rounded-xl bg-white text-slate-800 shadow-lg ring-1 ring-slate-900/5 py-1 text-sm animate-fade-in">
          <button type="button" onClick={() => { setMenu(false); inputRef.current?.click(); }} className="w-full px-3 py-2.5 text-left hover:bg-slate-50">Change photo</button>
          <button type="button" onClick={remove} className="w-full px-3 py-2.5 text-left text-rose-600 hover:bg-rose-50">Remove photo</button>
        </div>
      )}
      <input ref={inputRef} type="file" accept={ACCEPT_ATTR} hidden onChange={choose} />
      <PhotoCropper open={Boolean(picked)} file={picked} busy={busy} onCancel={() => setPicked(null)} onDone={upload} title="Crop your photo" />
    </div>
  );
}

/** Name, email, date of birth and gender. */
export function EditDetailsModal({ open, onClose }) {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  // Seed from the live user each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm({
      name: user?.name ?? '',
      email: user?.email ?? '',
      dob: user?.dob ? String(user.dob).slice(0, 10) : '',
      gender: user?.gender ?? '',
    });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const close = () => onClose();
  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setErrors((x) => ({ ...x, [k]: undefined })); };

  const save = async (e) => {
    e.preventDefault();
    const errs = {};
    if (form.name.trim().length < 2) errs.name = 'Enter your full name';
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) errs.email = 'Enter a valid email address';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await api.patch('/api/patients/me', {
        name: form.name.trim(),
        email: form.email.trim(),
        ...(form.dob ? { dob: form.dob } : {}),
        ...(form.gender ? { gender: form.gender } : {}),
      });
      await refreshUser();
      toast.success('Profile updated');
      close();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={close} title="Edit personal details" size="sm" variant="sheet">
      {form && (
        <form onSubmit={save} noValidate className="space-y-4">
          <Field label="Full name" error={errors.name}>
            <Input autoFocus value={form.name} onChange={set('name')} maxLength={80} error={errors.name} autoComplete="name" />
          </Field>
          <Field label="Email" hint="For receipts and account notices. Optional." error={errors.email}>
            <Input type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" error={errors.email} autoComplete="email" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date of birth">
              <Input type="date" max={new Date().toISOString().slice(0, 10)} value={form.dob} onChange={set('dob')} />
            </Field>
            <Field label="Gender">
              <Select value={form.gender} onChange={set('gender')}>
                <option value="" disabled>Select</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="O">Other</option>
              </Select>
            </Field>
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2">
            <Button variant="secondary" onClick={close}>Cancel</Button>
            <Button type="submit" loading={busy}>Save changes</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

/** New number → code sent to it → verified and switched. */
export function ChangePhoneModal({ open, onClose }) {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [step, setStep] = useState('number');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpLength, setOtpLength] = useState(4);
  const [hint, setHint] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const digits = phone.replace(/\D/g, '').slice(-10);

  const close = () => { setStep('number'); setPhone(''); setOtp(''); setHint(''); setError(''); onClose(); };

  const send = async (e) => {
    e?.preventDefault();
    if (!/^[6-9]\d{9}$/.test(digits)) { setError('Enter a valid 10-digit mobile number'); return; }
    setBusy(true);
    setError('');
    try {
      const res = unwrap(await api.post('/api/patients/me/phone/request', { phone: digits }));
      setOtpLength(res?.otpLength ?? 4);
      setHint(res?.debugCode ? `Demo mode — your code is ${res.debugCode}` : `We sent a code to +91 ${fmtPhone(digits)} on WhatsApp`);
      setOtp('');
      setStep('code');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const verify = async (code = otp) => {
    if (code.length < otpLength) return;
    setBusy(true);
    setError('');
    try {
      await api.post('/api/patients/me/phone/verify', { phone: digits, otp: code });
      await refreshUser();
      toast.success('Mobile number updated — use it to sign in from now on');
      close();
    } catch (err) {
      setError(err.message);
      setOtp('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={close} title="Change mobile number" size="sm" variant="sheet">
      {step === 'number' ? (
        <form onSubmit={send} noValidate className="space-y-4">
          <p className="text-sm text-slate-600">
            You sign in with your mobile number. We’ll send a code to the new number to confirm it’s yours.
          </p>
          <div className="rounded-lg bg-mg-surface px-3 py-2.5 text-sm">
            <span className="text-slate-500">Current: </span>
            <span className="font-medium text-slate-900">+91 {fmtPhone(user?.phone)}</span>
          </div>
          <Field label="New mobile number" error={error}>
            <div className={clsx('flex items-center rounded-lg border bg-white focus-within:border-mg-teal focus-within:ring-2 focus-within:ring-mg-teal/20', error ? 'border-rose-300' : 'border-slate-300')}>
              <span className="pl-3 pr-2 text-base sm:text-sm text-slate-500 border-r border-slate-200">+91</span>
              <input
                autoFocus
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => { setPhone(e.target.value.replace(/[^\d\s]/g, '').slice(0, 11)); setError(''); }}
                placeholder="98765 43210"
                className="flex-1 min-w-0 h-10 px-3 bg-transparent rounded-r-lg text-base sm:text-sm focus:outline-none"
              />
            </div>
          </Field>
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2">
            <Button variant="secondary" onClick={close}>Cancel</Button>
            <Button type="submit" loading={busy}>Send code</Button>
          </div>
        </form>
      ) : (
        <div className="space-y-5">
          <p className="text-sm text-slate-600">
            Enter the {otpLength}-digit code sent to <span className="font-medium text-slate-900">+91 {fmtPhone(digits)}</span>.
          </p>
          <OtpInput length={otpLength} value={otp} onChange={(v) => { setOtp(v); setError(''); }} onComplete={verify} />
          {error ? <p className="text-center text-xs font-medium text-rose-600">{error}</p> : hint && <p className="text-center text-xs text-slate-500">{hint}</p>}
          <div className="flex items-center justify-between text-sm">
            <button type="button" onClick={() => { setStep('number'); setError(''); }} className="font-medium text-slate-600 hover:text-slate-900">Change number</button>
            <button type="button" onClick={send} disabled={busy} className="font-medium text-mg-teal hover:underline disabled:opacity-50">Resend code</button>
          </div>
          <Button className="w-full" loading={busy} disabled={otp.length < otpLength} onClick={() => verify()}>Verify &amp; update</Button>
        </div>
      )}
    </Modal>
  );
}

/** Spells out what goes and what the clinic keeps, then asks for the word. */
export function DeleteAccountModal({ open, onClose }) {
  const { logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const ok = typed.trim().toUpperCase() === 'DELETE';

  const close = () => { setTyped(''); onClose(); };

  const destroy = async () => {
    setBusy(true);
    try {
      const res = unwrap(await api.delete('/api/patients/me', { data: { confirm: 'DELETE' } }));
      // Leave the signed-in page first, and clear the session only after the
      // route has changed: in the same render, the profile page's sign-in
      // guard would see a guest and bounce to the login screen instead.
      // The server has already ended the account; this only clears the device.
      navigate('/p/explore', { replace: true });
      setTimeout(() => logout({ silent: true }), 0);
      toast.success(res?.cancelledBookings
        ? `Your account has been deleted and ${res.cancelledBookings} upcoming booking${res.cancelledBookings === 1 ? ' was' : 's were'} cancelled.`
        : 'Your account has been deleted.');
    } catch (err) {
      toast.error(err.message);
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={close} title="Delete your account?" size="sm" variant="sheet">
      <div className="space-y-4 text-sm">
        <div>
          <p className="font-medium text-slate-900">This permanently removes:</p>
          <ul className="mt-2 space-y-1.5 text-slate-600">
            {['Your name, mobile number, email and photo', 'Your family members and saved location', 'All upcoming bookings — they will be cancelled'].map((t) => (
              <li key={t} className="flex gap-2"><Icon name="cross" className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />{t}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg bg-mg-surface p-3 text-slate-600">
          <p className="font-medium text-slate-800">What clinics keep</p>
          <p className="mt-1 text-xs leading-relaxed">
            Records of consultations you’ve already had stay with the clinic that saw you, as medical and billing law requires.
            Your reviews stay up, shown as “Former patient”.
          </p>
        </div>
        <p className="text-slate-600">You can sign up again with the same number later, but you’ll start with a new, empty account.</p>
        <Field label={<>Type <span className="font-mono font-semibold text-rose-600">DELETE</span> to confirm</>}>
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoCapitalize="characters" placeholder="DELETE" />
        </Field>
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-1">
          <Button variant="secondary" onClick={close}>Keep my account</Button>
          <Button variant="danger" disabled={!ok} loading={busy} onClick={destroy}>Delete account</Button>
        </div>
      </div>
    </Modal>
  );
}
