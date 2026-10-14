import { useState } from 'react';
import clsx from 'clsx';
import { api, unwrap } from '../../lib/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Icon } from '../ui/Icon.jsx';

const RELATIONS = [
  ['SPOUSE', 'Spouse'], ['CHILD', 'Child'], ['PARENT', 'Parent'], ['SIBLING', 'Sibling'], ['OTHER', 'Other'],
];
const GENDERS = [['M', 'Male'], ['F', 'Female'], ['O', 'Other']];

// 16px text below sm: anything smaller and iOS Safari zooms the page on focus.
const INPUT = 'w-full h-12 sm:h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-mg-teal focus:ring-1 focus:ring-mg-teal transition';

const Label = ({ children, optional }) => (
  <span className="block text-xs font-semibold text-slate-700 mb-1.5">
    {children}
    {optional && <span className="ml-1 font-normal text-slate-400">(optional)</span>}
  </span>
);

function Chips({ options, value, onChange, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={clsx(
            'h-10 px-4 rounded-full border text-sm font-medium transition',
            value === v ? 'bg-mg-teal border-mg-teal text-white' : 'bg-white border-slate-200 text-slate-700 hover:border-mg-teal',
          )}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

/**
 * Add a family member — inline in the booking sheet or on the Profile page,
 * so registering someone never means leaving what you were doing.
 *
 * Their mobile number is asked for everyone but a child: it is how this
 * person is tied to their own Mediigo account, now or when they sign up.
 * Calls onSaved with the new member once the account has been refreshed.
 */
export function FamilyMemberForm({ onSaved, onCancel, submitLabel = 'Save member' }) {
  const { refreshUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ name: '', relation: 'PARENT', gender: '', dob: '', phone: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const set = (k) => (v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };
  const phoneRequired = form.relation !== 'CHILD';
  const digits = form.phone.replace(/\D/g, '').slice(-10);

  const check = () => {
    const e = {};
    if (form.name.trim().length < 2) e.name = 'Enter their full name';
    if (!form.gender) e.gender = 'Choose a gender';
    if (!form.dob) e.dob = 'Enter their date of birth';
    if (phoneRequired && !digits) e.phone = 'Enter their mobile number';
    else if (digits && !/^[6-9]\d{9}$/.test(digits)) e.phone = 'Enter a valid 10-digit mobile number';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!check()) return;
    setBusy(true);
    try {
      const list = unwrap(await api.post('/api/patients/me/family', {
        name: form.name.trim(),
        relation: form.relation,
        gender: form.gender,
        dob: form.dob,
        ...(digits ? { phone: digits } : {}),
      }));
      await refreshUser();
      const added = list[list.length - 1];
      toast.success(added?.linkedUserId
        ? `${added.name} added — linked to their Mediigo account`
        : `${form.name.trim()} added`);
      onSaved?.(added);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <label className="block">
        <Label>Full name</Label>
        <input
          autoFocus
          value={form.name}
          onChange={(e) => set('name')(e.target.value)}
          placeholder="e.g. Sunita Kumar"
          autoComplete="off"
          className={clsx(INPUT, errors.name && 'border-rose-300')}
        />
        {errors.name && <span className="block mt-1 text-xs text-rose-600">{errors.name}</span>}
      </label>

      <div>
        <Label>Relation</Label>
        <Chips label="Relation" options={RELATIONS} value={form.relation} onChange={set('relation')} />
      </div>

      <div>
        <Label>Gender</Label>
        <Chips label="Gender" options={GENDERS} value={form.gender} onChange={set('gender')} />
        {errors.gender && <span className="block mt-1 text-xs text-rose-600">{errors.gender}</span>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Date of birth rather than age, so it stays right next year. */}
        <label className="block">
          <Label>Date of birth</Label>
          <input
            type="date"
            max={new Date().toISOString().slice(0, 10)}
            value={form.dob}
            onChange={(e) => set('dob')(e.target.value)}
            className={clsx(INPUT, errors.dob && 'border-rose-300')}
          />
          {errors.dob && <span className="block mt-1 text-xs text-rose-600">{errors.dob}</span>}
        </label>

        <label className="block">
          <Label optional={!phoneRequired}>Mobile number</Label>
          <div className={clsx('flex items-center rounded-xl border bg-white focus-within:border-mg-teal focus-within:ring-1 focus-within:ring-mg-teal transition', errors.phone ? 'border-rose-300' : 'border-slate-200')}>
            <span className="pl-3.5 pr-2 text-base sm:text-sm text-slate-500 border-r border-slate-200">+91</span>
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="off"
              value={form.phone}
              onChange={(e) => set('phone')(e.target.value.replace(/[^\d\s]/g, '').slice(0, 11))}
              placeholder="98765 43210"
              className="flex-1 min-w-0 h-12 sm:h-11 px-3 rounded-r-lg bg-transparent text-base sm:text-sm focus:outline-none"
            />
          </div>
          {errors.phone
            ? <span className="block mt-1 text-xs text-rose-600">{errors.phone}</span>
            : (
              <span className="mt-1 flex items-start gap-1 text-[11px] text-slate-500">
                <Icon name="info" className="w-3.5 h-3.5 shrink-0 mt-px" />
                Links them to their own Mediigo account on this number.
              </span>
            )}
        </label>
      </div>

      <div className="flex gap-2 pt-1">
        {onCancel && (
          <button type="button" onClick={onCancel} className="h-11 px-5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:border-slate-300">
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={busy}
          className="flex-1 h-11 rounded-lg bg-mg-teal text-white text-sm font-semibold hover:bg-mg-tealDark disabled:opacity-60 transition"
        >
          {busy ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
