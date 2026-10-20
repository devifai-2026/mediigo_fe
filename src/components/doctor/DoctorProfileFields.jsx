import { Field, Input, Textarea } from '../ui/Field.jsx';
import { LIST_FIELDS } from '../../lib/doctorProfile.js';

/**
 * The profile inputs shared by the add-doctor form and the clinic's profile
 * editor. Form state is the shape lib/doctorProfile.js builds; `set(key)`
 * returns an input change handler.
 */

const digits = (max) => (e) => ({ target: { value: e.target.value.replace(/\D/g, '').slice(0, max) } });

/** Qualifications, experience, languages, chamber, consult timing. */
export function DoctorBasicsFields({ form, set, disabled }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Field label="Qualifications" hint="Comma separated, e.g. MBBS, MD">
        <Input value={form.qualifications} disabled={disabled} onChange={set('qualifications')} placeholder="MBBS, MD (General Medicine)" />
      </Field>
      <Field label="Years of experience">
        <Input value={form.experienceYears} disabled={disabled} inputMode="numeric" onChange={(e) => set('experienceYears')(digits(2)(e))} placeholder="8" />
      </Field>
      <Field label="Languages spoken" hint="Comma separated">
        <Input value={form.languages} disabled={disabled} onChange={set('languages')} placeholder="English, Hindi, Marathi" />
      </Field>
      <Field label="Chamber / room" hint="Read out in every voice announcement">
        <Input value={form.chamberNumber} disabled={disabled} maxLength={20} onChange={set('chamberNumber')} placeholder="104" />
      </Field>
      <Field label="Average consult (minutes)" hint="Sets online token slot times and wait estimates">
        <Input value={form.avgConsultMinutes} disabled={disabled} inputMode="numeric" onChange={(e) => set('avgConsultMinutes')(digits(3)(e))} placeholder="8" />
      </Field>
      <Field label="Follow-up window (days)" hint="A revisit within this many days is charged the follow-up fee">
        <Input value={form.followupWindowDays} disabled={disabled} inputMode="numeric" onChange={(e) => set('followupWindowDays')(digits(2)(e))} placeholder="14" />
      </Field>
    </div>
  );
}

/** About and the list sections of the patient-facing doctor page. */
export function DoctorPublicProfileFields({ form, set, disabled }) {
  return (
    <div className="space-y-3">
      <Field label="About the doctor" hint="A short introduction shown at the top of the doctor's page">
        <Textarea rows={4} maxLength={2000} value={form.about} disabled={disabled} onChange={set('about')} />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {LIST_FIELDS.map(([key, label, placeholder]) => (
          <Field key={key} label={label} hint="One per line">
            <Textarea rows={3} value={form[key]} disabled={disabled} onChange={set(key)} placeholder={placeholder} />
          </Field>
        ))}
      </div>
    </div>
  );
}

/**
 * Council, number and year. Editable at onboarding (and by a super admin);
 * everywhere else shown read-only, with why.
 */
export function RegistrationFields({ form, set, locked }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Medical council" required={!locked}>
          <Input value={form.registrationCouncil} disabled={locked} onChange={set('registrationCouncil')} placeholder="Maharashtra Medical Council" />
        </Field>
        <Field label="Registration no." required={!locked}>
          <Input value={form.councilRegNo} disabled={locked} onChange={set('councilRegNo')} placeholder="MMC-20001" />
        </Field>
        <Field label="Year of registration">
          <Input value={form.registrationYear} disabled={locked} inputMode="numeric" onChange={(e) => set('registrationYear')(digits(4)(e))} placeholder="2010" />
        </Field>
      </div>
      <p className="text-xs text-slate-500">
        <i className="fa-solid fa-lock mr-1.5" aria-hidden="true" />
        {locked
          ? 'Registration details are locked after onboarding. Contact Mediigo support to correct them.'
          : 'These cannot be changed by the clinic after onboarding, so check them against the certificate.'}
      </p>
    </div>
  );
}
