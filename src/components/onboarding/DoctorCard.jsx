import { useRef, useState } from 'react';
import clsx from 'clsx';
import { api, unwrap } from '../../lib/api.js';
import { initialsOf } from '../../lib/format.js';
import { Badge, W_INPUT, WField, WInput, WSection } from './WizardUi.jsx';
import { openPrivateDocument } from '../../lib/documents.js';

const DOCS = [
  ['AADHAAR', 'Aadhaar card', 'fa-id-card'],
  ['PAN', 'PAN card', 'fa-address-card'],
  ['REG_CERT', 'Registration certificate', 'fa-file-medical'],
];

const digits = (v, n) => String(v ?? '').replace(/\D/g, '').slice(0, n);

/**
 * One doctor in the clinic's onboarding — the details a patient sees, the
 * credentials the council issued, and what the doctor charges. The first
 * doctor defaults to clinic admin (whole-clinic revenue); the rest see their
 * own queue and numbers only.
 */
export function DoctorCard({ index, doctor, errors = {}, specialties, specialtiesFailed, onRetrySpecialties, askPassword = false, onChange, onRemove, onMakeAdmin, canRemove, onError }) {
  const set = (k) => (e) => onChange({ ...doctor, [k]: e.target.value });
  const setFee = (k) => (e) => onChange({ ...doctor, fees: { ...(doctor.fees ?? {}), [k]: digits(e.target.value, 5) } });
  // Tolerate a draft or a server reply in an unexpected shape rather than
  // taking the whole wizard down with it.
  const specialtyOptions = Array.isArray(specialties) ? specialties : [];
  const photoInput = useRef(null);
  const [uploading, setUploading] = useState(false);
  const admin = doctor.isClinicAdmin;

  const uploadPhoto = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.append('photo', file);
      const stored = unwrap(await api.post('/api/onboarding/uploads?kind=avatar', body, { headers: { 'Content-Type': undefined } }));
      onChange({ ...doctor, photo: { url: stored.url, objectPath: stored.objectPath } });
    } catch (e) {
      onError?.(e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <WSection tone={admin ? 'admin' : 'plain'} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200/70">
        <h3 className={clsx('text-[13px] sm:text-sm font-semibold uppercase tracking-wide', admin ? 'text-amber-800' : 'text-slate-900')}>
          Doctor {index + 1} {admin ? '(Clinic admin – full revenue view)' : '(Standard – own queue only)'}
        </h3>
        <div className="flex items-center gap-2">
          {admin ? <Badge tone="amber">Admin permission</Badge> : (
            <>
              <Badge>Restricted access</Badge>
              <button type="button" onClick={onMakeAdmin} className="text-[11px] font-medium text-amber-700 hover:underline">
                Make clinic admin
              </button>
            </>
          )}
          {canRemove && (
            <button type="button" onClick={onRemove} aria-label={`Remove doctor ${index + 1}`} className="w-7 h-7 grid place-items-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50">
              <i className="fa-solid fa-trash-can text-xs" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <WInput label="Full name" required value={doctor.name} onChange={set('name')} placeholder="Dr. Rajesh Sharma" error={errors.name} />
        <WInput label="Mobile (login)" required inputMode="numeric" value={doctor.phone} onChange={(e) => onChange({ ...doctor, phone: digits(e.target.value, 10) })} placeholder="9822011223" error={errors.phone} />
        <WInput label="Email" type="email" value={doctor.email} onChange={set('email')} placeholder="dr.rajesh@clinic.com" error={errors.email} inputClassName="font-mono text-[13px]" />
        <WInput label="Council reg. no." required value={doctor.councilRegNo} onChange={set('councilRegNo')} placeholder="MMC-88210" error={errors.councilRegNo} inputClassName="font-mono text-[13px] uppercase" />
        <WInput label="Medical council" required value={doctor.registrationCouncil} onChange={set('registrationCouncil')} placeholder="Maharashtra Medical Council" error={errors.registrationCouncil} />
        <WInput label="Qualifications" value={doctor.qualifications} onChange={set('qualifications')} placeholder="MBBS, MD (Cardiology)" hint="Comma separated" />
        <WInput label="Designation" value={doctor.designation ?? ''} onChange={set('designation')} placeholder="Chief Cardiologist" />
        <WInput label="Experience (years)" inputMode="numeric" value={doctor.experienceYears} onChange={(e) => onChange({ ...doctor, experienceYears: digits(e.target.value, 2) })} placeholder="14" />
        {askPassword && (
          <WInput
            label="Login password"
            required
            type="password"
            autoComplete="new-password"
            value={doctor.password ?? ''}
            onChange={set('password')}
            placeholder="At least 8 characters"
            hint="This doctor's own sign-in. Not saved on this device."
            error={errors.password}
            inputClassName="font-mono"
          />
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_2fr_auto] gap-3 lg:gap-4 items-end">
        <div>
        <WField
          label="Specialty"
          required
          error={specialtiesFailed ? 'Could not load the specialty list' : errors.specialtyId}
        >
          {(id) => (
            <select id={id} value={doctor.specialtyId} onChange={set('specialtyId')} className={clsx(W_INPUT, 'cursor-pointer', errors.specialtyId && 'border-rose-300 bg-rose-50/40')}>
              <option value="">Select specialty…</option>
              {specialtyOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
        </WField>
        {/* Outside WField on purpose: it renders its children as a function
            only when the function is the sole child. */}
        {specialtiesFailed && (
          <button type="button" onClick={onRetrySpecialties} className="mt-1 text-[11px] font-semibold text-mg-teal hover:underline">
            <i className="fa-solid fa-rotate-right mr-1" aria-hidden="true" /> Try again
          </button>
        )}
        </div>
        <div>
          <p className="text-xs font-medium text-slate-700 mb-1.5">Consultation fees (₹) <span className="text-rose-500">*</span></p>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[['fresh', 'New'], ['followup', 'Follow-up'], ['emergency', 'Emergency']].map(([k, label]) => (
              <label key={k} className="block">
                <span className="block text-[11px] text-slate-500 mb-1">{label}</span>
                <input inputMode="numeric" value={doctor.fees?.[k] ?? ''} onChange={setFee(k)} className={clsx(W_INPUT, errors[`fees.${k}`] && 'border-rose-300')} />
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-1">
          <span className="w-10 h-10 shrink-0 rounded-full overflow-hidden bg-slate-100 border border-slate-200 grid place-items-center text-sm font-semibold text-slate-500">
            {doctor.photo?.url ? <img src={doctor.photo.url} alt="" className="w-full h-full object-cover" /> : initialsOf(doctor.name || 'Dr')}
          </span>
          <div className="flex flex-col items-start">
            <button
              type="button"
              onClick={() => photoInput.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-mg-teal hover:underline disabled:opacity-60"
            >
              <i className={uploading ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-camera'} aria-hidden="true" />
              {doctor.photo?.url ? 'Change photo' : 'Add photo'}
            </button>
            {doctor.photo?.url
              ? <button type="button" onClick={() => onChange({ ...doctor, photo: null })} className="text-[11px] text-slate-400 hover:text-rose-600">Remove</button>
              : <span className="text-[11px] text-slate-400">Optional</span>}
          </div>
          <input ref={photoInput} type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => { uploadPhoto(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
      </div>

      {/* Identity and registration papers: all three, before review. Stored
          privately — the card only ever holds a storage key. */}
      <div>
        <p className="text-xs font-medium text-slate-700 mb-1.5">Verification documents <span className="text-rose-500">*</span></p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {DOCS.map(([type, label, icon]) => (
            <DocTile
              key={type}
              label={label}
              icon={icon}
              objectPath={doctor.documents?.[type] ?? null}
              error={errors[`documents.${type}`]}
              onUploaded={(objectPath) => onChange({ ...doctor, documents: { ...(doctor.documents ?? {}), [type]: objectPath } })}
              onError={onError}
              type={type}
            />
          ))}
        </div>
      </div>
    </WSection>
  );
}

/** One required document: upload a photo, then view or replace it. */
function DocTile({ type, label, icon, objectPath, error, onUploaded, onError }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const body = new FormData();
      body.append('photo', file);
      const out = unwrap(await api.post(`/api/onboarding/documents?type=${type}`, body, { headers: { 'Content-Type': undefined } }));
      onUploaded(out.objectPath);
    } catch (e) {
      onError?.(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={clsx(
      'rounded-lg border p-2.5 flex items-center gap-2.5 bg-white',
      error ? 'border-rose-300 bg-rose-50/40' : objectPath ? 'border-emerald-200' : 'border-dashed border-slate-300',
    )}>
      <span className={clsx('w-9 h-9 rounded-lg grid place-items-center shrink-0', objectPath ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400')}>
        <i className={clsx('fa-solid', objectPath ? 'fa-circle-check' : icon)} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-slate-800 truncate">{label}</span>
        {error
          ? <span className="block text-[11px] font-medium text-rose-600">{error}</span>
          : <span className="block text-[11px] text-slate-500">{busy ? 'Uploading…' : objectPath ? 'Uploaded' : 'Photo required'}</span>}
      </span>
      {objectPath && (
        <button type="button" onClick={() => openPrivateDocument(`/api/onboarding/documents/file?path=${encodeURIComponent(objectPath)}`).catch((e) => onError?.(e.message))}
          className="text-[11px] font-semibold text-mg-blue hover:underline shrink-0">View</button>
      )}
      <button type="button" onClick={() => input.current?.click()} disabled={busy}
        className="text-[11px] font-semibold text-mg-teal hover:underline shrink-0 disabled:opacity-50">
        {objectPath ? 'Replace' : 'Upload'}
      </button>
      <input ref={input} type="file" accept="image/jpeg,image/png" className="hidden"
        onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ''; }} />
    </div>
  );
}
