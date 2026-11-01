import { useState, useEffect } from 'react';
import { api, unwrap } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useApi } from '../../hooks/useApi.js';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Field, Input, PasswordInput } from '../ui/Field.jsx';
import { CredentialsModal } from '../onboarding/CredentialsModal.jsx';
import { nameError, phoneError, passwordError, collect, serverFieldErrors } from '../../lib/validators.js';
import { SpecialtyPicker } from '../ui/SpecialtyPicker.jsx';
import { PhotoField } from '../ui/PhotoCropper.jsx';
import { DoctorBasicsFields, DoctorPublicProfileFields, RegistrationFields } from '../doctor/DoctorProfileFields.jsx';
import { BLANK_PROFILE, toProfilePayload, doctorProfileErrors, feeErrors } from '../../lib/doctorProfile.js';

/**
 * Add a doctor to an existing clinic.
 *
 * Creates the onboarding submission and approves it in one step, the same
 * shape the seed script uses, so a doctor added here is indistinguishable from
 * one onboarded by an agent.
 *
 * Collects every field the patient's doctor page shows, through the same
 * mapping the clinic's profile editor uses. Registration details are checked
 * here because nobody but Mediigo support can change them afterwards.
 *
 * The photo is uploaded AFTER approval, because the doctor id it attaches to
 * does not exist until then. That is also why a failed photo upload does not
 * fail the whole flow — the doctor is already created, and losing them over an
 * optional image would be worse than an admin retrying the upload.
 */

const BLANK = {
  ...BLANK_PROFILE,
  name: '', phone: '', password: '',
  feeFresh: 500, feeFollowup: 250, feeEmergency: 900,
};

export function AddDoctorModal({ open, onClose, onDone, hospitalId, hospitalName, districtId }) {
  const toast = useToast();
  const { data: specialties } = useApi(open ? '/api/specialties' : null, { skip: !open });
  const [form, setForm] = useState(BLANK);
  const [specialtyIds, setSpecialtyIds] = useState([]);
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  // The new login, shown once after the doctor is created.
  const [issued, setIssued] = useState(null);

  // Clear on close, or the next doctor inherits this one's registration number
  // — which the unique index would then reject with a confusing error.
  useEffect(() => {
    if (!open) { setForm(BLANK); setSpecialtyIds([]); setPhoto(null); setErrors({}); }
  }, [open]);

  if (issued) {
    return <CredentialsModal result={issued} onClose={() => { setIssued(null); onClose?.(); }} />;
  }
  if (!open) return null;

  const set = (k) => (e) => {
    const { value } = e.target;
    setForm((f) => ({ ...f, [k]: value }));
    setErrors(({ [k]: _, ...rest }) => rest);
  };
  const options = specialties ?? [];
  const primary = options.find((o) => o.id === specialtyIds[0]);

  const submit = async (e) => {
    e.preventDefault();
    const problems = {
      ...collect({
        name: nameError(form.name.replace(/^\s*dr\.?\s*/i, ''), 'Doctor name'),
        phone: phoneError(form.phone),
        password: passwordError(form.password, { required: false }),
        specialty: specialtyIds.length ? '' : 'Pick at least one specialty',
      }),
      ...doctorProfileErrors(form, { includeLocked: true }),
      ...feeErrors(form),
    };
    setErrors(problems);
    if (Object.keys(problems).length) {
      toast.error(Object.values(problems)[0]);
      return;
    }

    setBusy(true);
    try {
      const sub = unwrap(await api.post('/api/onboarding/submissions', {
        kind: 'DOCTOR',
        districtId,
        payload: {
          hospitalId,
          // The server prefixes "Dr." itself, so the admin never types it and
          // it can never end up doubled.
          name: form.name.trim(),
          phone: form.phone.replace(/\D/g, '').slice(-10),
          // The primary is what the card leads with; specialtyIds is all of them.
          specialty: primary?.name ?? '',
          specialtyIds,
          ...toProfilePayload(form, { includeLocked: true }),
          fees: {
            fresh: Number(form.feeFresh) || 0,
            followup: Number(form.feeFollowup) || 0,
            emergency: Number(form.feeEmergency) || 0,
          },
        },
      }));
      await api.post(`/api/onboarding/submissions/${sub._id}/submit`);
      const approved = unwrap(await api.post(`/api/admin/submissions/${sub._id}/approve`, form.password ? { password: form.password } : {}));
      const doctorId = approved?.doctor?._id;

      if (doctorId && photo) {
        const body = new FormData();
        body.append('photo', photo);
        await api.put(`/api/doctors/${doctorId}/photo`, body, { headers: { 'Content-Type': undefined } })
          .catch(() => toast.warn('Doctor created, but the photo did not upload. Add it from their profile.'));
      }

      toast.success(`Dr. ${form.name.trim()} added`);
      onDone?.();
      // The password is shown once, where it can be copied or sent on
      // WhatsApp — a toast vanished before anyone could write it down.
      if (approved?.credentials?.length) setIssued(approved);
      else onClose?.();
    } catch (err) {
      setErrors(serverFieldErrors(err));
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={() => !busy && onClose?.()} title="Add doctor" subtitle={hospitalName} size="lg">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Doctor name" required hint="Do not type “Dr.” — it is added automatically" error={errors.name}>
            {/* The prefix is shown as fixed text so nobody types it twice. */}
            <div className="flex items-center rounded-lg border border-slate-300 bg-white focus-within:border-mg-teal overflow-hidden">
              <span className="px-2.5 py-2 text-[11px] font-semibold text-slate-500 bg-slate-50 border-r border-slate-200 shrink-0">
                Dr.
              </span>
              <input
                value={form.name}
                onChange={set('name')}
                placeholder="Aditi Deshmukh"
                className="flex-1 min-w-0 px-2.5 py-2 text-[11px] focus:outline-none"
              />
            </div>
          </Field>

          <Field label="Mobile" required hint="Becomes their login" error={errors.phone}>
            <Input error={errors.phone} value={form.phone} onChange={set('phone')} placeholder="9000000101" inputMode="numeric" maxLength={13} />
          </Field>

          <Field label="Login password" hint="Leave blank to generate one — shown once after adding" error={errors.password} className="sm:col-span-2">
            <PasswordInput error={errors.password} value={form.password} onChange={set('password')} placeholder="Auto-generate" autoComplete="new-password" />
          </Field>
        </div>

        <SpecialtyPicker
          options={options}
          value={specialtyIds}
          onChange={setSpecialtyIds}
          required
          hint="The first is the primary and leads on the patient card. Only published specialties appear here."
        />
        {errors.specialty && <p className="-mt-2 text-xs font-medium text-rose-600">{errors.specialty}</p>}

        <RegistrationFields form={form} set={set} errors={errors} />

        <DoctorBasicsFields form={form} set={set} errors={errors} />

        {/* Fees are per doctor, never per specialty: two paediatricians at the
            same clinic routinely charge differently. */}
        <div>
          <p className="text-[11px] font-semibold text-slate-600 mb-1.5">Consultation fees (₹)</p>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Fresh" error={errors.feeFresh}><Input error={errors.feeFresh} value={form.feeFresh} onChange={set('feeFresh')} inputMode="decimal" /></Field>
            <Field label="Follow-up" error={errors.feeFollowup}><Input error={errors.feeFollowup} value={form.feeFollowup} onChange={set('feeFollowup')} inputMode="decimal" /></Field>
            <Field label="Emergency" error={errors.feeEmergency}><Input error={errors.feeEmergency} value={form.feeEmergency} onChange={set('feeEmergency')} inputMode="decimal" /></Field>
          </div>
        </div>

        <details className="rounded-lg border border-slate-200 p-3">
          <summary className="cursor-pointer text-[11px] font-semibold text-slate-600">
            Public profile — about, conditions, education, memberships (optional, the clinic can add these later)
          </summary>
          <div className="pt-3">
            <DoctorPublicProfileFields form={form} set={set} />
          </div>
        </details>

        <PhotoField
          value={photo ? URL.createObjectURL(photo) : null}
          name={form.name || 'New doctor'}
          onUpload={async (f) => setPhoto(f)}
          onRemove={() => setPhoto(null)}
          onReject={(m) => toast.error(m)}
          hint="Optional. Initials are shown if you skip it."
        />

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" disabled={busy}>{busy ? 'Adding…' : 'Add doctor'}</Button>
        </div>
      </form>
    </Modal>
  );
}
