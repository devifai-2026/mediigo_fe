import { useState, useEffect } from 'react';
import { api, unwrap } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useApi } from '../../hooks/useApi.js';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Field, Input } from '../ui/Field.jsx';
import { SpecialtyPicker } from '../ui/SpecialtyPicker.jsx';
import { PhotoField } from '../ui/PhotoCropper.jsx';

/**
 * Add a doctor to an existing clinic.
 *
 * Creates the onboarding submission and approves it in one step, the same
 * shape the seed script uses, so a doctor added here is indistinguishable from
 * one onboarded by an agent.
 *
 * The photo is uploaded AFTER approval, because the doctor id it attaches to
 * does not exist until then. That is also why a failed photo upload does not
 * fail the whole flow — the doctor is already created, and losing them over an
 * optional image would be worse than an admin retrying the upload.
 */

const BLANK = {
  name: '', phone: '', councilRegNo: '', qualifications: '',
  experienceYears: '', chamberNumber: '',
  feeFresh: 500, feeFollowup: 250, feeEmergency: 900,
};

export function AddDoctorModal({ open, onClose, onDone, hospitalId, hospitalName, districtId }) {
  const toast = useToast();
  const { data: specialties } = useApi(open ? '/api/specialties' : null, { skip: !open });
  const [form, setForm] = useState(BLANK);
  const [specialtyIds, setSpecialtyIds] = useState([]);
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);

  // Clear on close, or the next doctor inherits this one's registration number
  // — which the unique index would then reject with a confusing error.
  useEffect(() => {
    if (!open) { setForm(BLANK); setSpecialtyIds([]); setPhoto(null); }
  }, [open]);

  if (!open) return null;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const options = specialties ?? [];
  const primary = options.find((o) => o.id === specialtyIds[0]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Doctor name is required'); return; }
    if (!/^\d{10}$/.test(form.phone.replace(/\D/g, '').slice(-10))) {
      toast.error('Enter a valid 10-digit mobile number');
      return;
    }
    if (!specialtyIds.length) { toast.error('Pick at least one specialty'); return; }
    if (!form.councilRegNo.trim()) { toast.error('Council registration number is required'); return; }

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
          // The primary is what the card leads with; the rest ride on
          // specialtyIds below.
          specialty: primary?.name ?? '',
          councilRegNo: form.councilRegNo.trim(),
          qualifications: form.qualifications.split(',').map((q) => q.trim()).filter(Boolean),
          experienceYears: Number(form.experienceYears) || 0,
          chamberNumber: form.chamberNumber.trim(),
          fees: {
            fresh: Number(form.feeFresh) || 0,
            followup: Number(form.feeFollowup) || 0,
            emergency: Number(form.feeEmergency) || 0,
          },
        },
      }));
      await api.post(`/api/onboarding/submissions/${sub._id}/submit`);
      const approved = unwrap(await api.post(`/api/admin/submissions/${sub._id}/approve`, {}));
      const doctorId = approved?.doctor?._id;

      // Every selected specialty, now that the doctor exists.
      if (doctorId && specialtyIds.length) {
        await api.patch(`/api/doctors/${doctorId}`, { specialtyIds }).catch(() => {
          toast.warn('Doctor created, but the extra specialties did not save. Edit them from the clinic.');
        });
      }

      if (doctorId && photo) {
        const body = new FormData();
        body.append('photo', photo);
        await api.put(`/api/doctors/${doctorId}/photo`, body, { headers: { 'Content-Type': undefined } })
          .catch(() => toast.warn('Doctor created, but the photo did not upload. Add it from their profile.'));
      }

      toast.success(
        approved?.tempPassword
          ? `Dr. ${form.name.trim()} added — temporary password ${approved.tempPassword}`
          : `Dr. ${form.name.trim()} added`,
        { duration: 9000 },
      );
      onDone?.();
      onClose?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={() => !busy && onClose?.()} title="Add doctor" subtitle={hospitalName} size="lg">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Doctor name" required hint="Do not type “Dr.” — it is added automatically">
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

          <Field label="Mobile" required hint="Becomes their login">
            <Input value={form.phone} onChange={set('phone')} placeholder="9000000101" inputMode="numeric" />
          </Field>
        </div>

        <SpecialtyPicker
          options={options}
          value={specialtyIds}
          onChange={setSpecialtyIds}
          required
          hint="The first is the primary and leads on the patient card. Only published specialties appear here."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Council registration no." required>
            <Input value={form.councilRegNo} onChange={set('councilRegNo')} placeholder="MMC-20001" />
          </Field>
          <Field label="Qualifications" hint="Comma separated">
            <Input value={form.qualifications} onChange={set('qualifications')} placeholder="MBBS, MD" />
          </Field>
          <Field label="Years of experience">
            <Input value={form.experienceYears} onChange={set('experienceYears')} placeholder="8" inputMode="numeric" />
          </Field>
          <Field label="Chamber number">
            <Input value={form.chamberNumber} onChange={set('chamberNumber')} placeholder="204" />
          </Field>
        </div>

        {/* Fees are per doctor, never per specialty: two paediatricians at the
            same clinic routinely charge differently. */}
        <div>
          <p className="text-[11px] font-semibold text-slate-600 mb-1.5">Consultation fees (₹)</p>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Fresh"><Input value={form.feeFresh} onChange={set('feeFresh')} inputMode="numeric" /></Field>
            <Field label="Follow-up"><Input value={form.feeFollowup} onChange={set('feeFollowup')} inputMode="numeric" /></Field>
            <Field label="Emergency"><Input value={form.feeEmergency} onChange={set('feeEmergency')} inputMode="numeric" /></Field>
          </div>
        </div>

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
