import clsx from 'clsx';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { ClinicMap } from '../superadmin/ClinicMap.jsx';
import { asList } from '../../lib/list.js';
import { openPrivateDocument } from '../../lib/documents.js';
import { inr, phone as fmtPhone } from '../../lib/format.js';
import { directionsUrl } from '../../lib/maps.js';

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DOC_LABEL = { AADHAAR: 'Aadhaar card', PAN: 'PAN card', REG_CERT: 'Registration certificate' };
const t12 = (hhmm) => {
  const [h, m] = String(hhmm || '').split(':').map(Number);
  return Number.isFinite(h) ? `${((h + 11) % 12) + 1}:${String(m || 0).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}` : '—';
};

function Section({ title, icon, children, aside }) {
  return (
    <section className="rounded-xl border border-slate-200 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          <i className={clsx('fa-solid mr-1.5 text-mg-teal', icon)} aria-hidden="true" />{title}
        </h4>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Row({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="text-sm text-slate-900 break-words">{value || <span className="text-slate-400">—</span>}</dd>
    </div>
  );
}

/**
 * Everything a field agent captured for one clinic, for the approver to
 * check before publishing: the clinic and its pin, contacts, photos, OPD
 * timings, facilities, the front desk, and every doctor with their papers.
 */
export function SubmissionDetails({ submissionId, onClose, onApprove, onReject, busy }) {
  const toast = useToast();
  const { data: s, loading, error } = useApi(submissionId ? `/api/onboarding/submissions/${submissionId}` : null, { skip: !submissionId });
  if (!submissionId) return null;
  const p = s?.payload ?? {};
  const a = p.address ?? {};
  const pin = s?.geocodeResult?.lat ? { lat: s.geocodeResult.lat, lng: s.geocodeResult.lng } : p.geocode?.lat ? { lat: p.geocode.lat, lng: p.geocode.lng } : null;
  const doctors = asList(p.doctors);
  const opd = p.opd;
  const open = (path) => openPrivateDocument(`/api/onboarding/documents/file?path=${encodeURIComponent(path)}`).catch((e) => toast.error(e.message));

  return (
    <Modal open onClose={onClose} title={p.name || 'Onboarding details'} subtitle={[p.code, p.type, p.licenseNumber && `Licence ${p.licenseNumber}`].filter(Boolean).join(' · ')} size="xl">
      {loading && !s ? (
        <div className="h-64 rounded-xl bg-slate-100 animate-pulse" />
      ) : error ? (
        <p className="text-sm text-rose-600">{error.message}</p>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Submitted by <strong className="text-slate-700">{s.agentId?.name ?? 'agent'}</strong>
            {s.agentId?.phone ? ` (+91 ${fmtPhone(s.agentId.phone)})` : ''}
            {s.submittedAt ? ` on ${new Date(s.submittedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}` : ''}
          </p>

          <Section title="Clinic" icon="fa-hospital">
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Row label="Name" value={p.name} />
              <Row label="Code" value={p.code} />
              <Row label="Type" value={p.type} />
              <Row label="Licence no." value={p.licenseNumber} />
              <Row label="Contact phone" value={p.contactPhone && `+91 ${fmtPhone(p.contactPhone)}`} />
              <Row label="Contact email" value={p.contactEmail} />
              <Row label="Consultation rooms" value={p.consultationRooms} />
              <Row label="QR standee" value={p.standeeSerial} />
            </dl>
            {asList(p.facilities).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {asList(p.facilities).map((f) => <span key={f} className="px-2 py-0.5 rounded-full bg-teal-50 text-mg-tealDark text-[11px] font-medium">{f}</span>)}
              </div>
            )}
          </Section>

          <Section
            title="Address & location"
            icon="fa-location-dot"
            aside={pin && <a href={directionsUrl(pin)} target="_blank" rel="noreferrer" className="text-xs font-semibold text-mg-blue hover:underline">Open in Maps</a>}
          >
            <p className="text-sm text-slate-900">{[a.line1, a.line2, a.city, a.district, a.state, a.pincode].filter(Boolean).join(', ')}</p>
            {pin
              ? <ClinicMap coordinates={pin} name={p.name} height="h-48" />
              : <p className="text-xs font-semibold text-rose-600">No pin — cannot publish until the location is set</p>}
          </Section>

          {asList(p.photos).length > 0 && (
            <Section title={`Photos (${asList(p.photos).length})`} icon="fa-images">
              <div className="flex gap-2 overflow-x-auto">
                {asList(p.photos).map((ph) => (
                  <a key={ph.url} href={ph.url} target="_blank" rel="noreferrer" className="shrink-0">
                    <img src={ph.url} alt="" className="w-32 h-24 object-cover rounded-lg border border-slate-200" />
                    <span className="block text-[10px] text-slate-500 mt-0.5">{ph.kind === 'INSIDE' ? 'Inside' : 'Outside'}</span>
                  </a>
                ))}
              </div>
            </Section>
          )}

          {opd && (
            <Section title="OPD timings" icon="fa-clock">
              <dl className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Row label="Days" value={asList(opd.days).map((d) => DAY[d]).join(', ')} />
                <Row label="Morning" value={opd.morning?.enabled ? `${t12(opd.morning.startTime)} – ${t12(opd.morning.endTime)}` : 'Off'} />
                <Row label="Evening" value={opd.evening?.enabled ? `${t12(opd.evening.startTime)} – ${t12(opd.evening.endTime)}` : 'Off'} />
                <Row label="Avg consult" value={opd.avgConsultMinutes && `${opd.avgConsultMinutes} min · max ${opd.maxTokensPerShift ?? 'no limit'} / shift`} />
              </dl>
            </Section>
          )}

          <Section title="Front desk" icon="fa-user-tie">
            <dl className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Row label="Name" value={p.primaryContact?.name} />
              <Row label="Mobile (login)" value={p.primaryContact?.phone && `+91 ${fmtPhone(p.primaryContact.phone)}`} />
              <Row label="Email" value={p.receptionistEmail} />
            </dl>
            <p className="text-[11px] text-slate-500">Sign-in: {s.loginMethod === 'OTP' ? 'WhatsApp OTP' : 'password set with the agent'}</p>
          </Section>

          <Section title={`Doctors (${doctors.length})`} icon="fa-user-doctor">
            {!doctors.length ? <p className="text-sm text-slate-500">No doctors captured.</p> : (
              <div className="space-y-3">
                {doctors.map((d, i) => (
                  <div key={d.phone || i} className={clsx('rounded-lg border p-3 space-y-2', d.isClinicAdmin ? 'border-amber-200 bg-amber-50/40' : 'border-slate-200')}>
                    <div className="flex flex-wrap items-center gap-2">
                      {d.photo?.url && <img src={d.photo.url} alt="" className="w-9 h-9 rounded-full object-cover" />}
                      <p className="text-sm font-semibold text-slate-900">{d.name}</p>
                      {d.isClinicAdmin && <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-semibold">Clinic admin</span>}
                      <span className="text-xs text-mg-teal font-medium">{d.specialty}</span>
                    </div>
                    <dl className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <Row label="Mobile (login)" value={d.phone && `+91 ${fmtPhone(d.phone)}`} />
                      <Row label="Email" value={d.email} />
                      <Row label="Council" value={d.registrationCouncil} />
                      <Row label="Registration no." value={d.councilRegNo} />
                      <Row label="Qualifications" value={asList(d.qualifications).join(', ')} />
                      <Row label="Designation" value={d.designation} />
                      <Row label="Experience" value={d.experienceYears != null && `${d.experienceYears} years`} />
                      <Row label="Fees (new / follow-up / emergency)" value={d.fees && `${inr(d.fees.fresh)} / ${inr(d.fees.followup)} / ${inr(d.fees.emergency)}`} />
                    </dl>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {['AADHAAR', 'PAN', 'REG_CERT'].map((type) => {
                        const doc = asList(d.documents).find((x) => x.type === type);
                        return doc ? (
                          <button key={type} type="button" onClick={() => open(doc.objectPath)}
                            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-semibold hover:bg-emerald-100">
                            <i className="fa-solid fa-file-image" aria-hidden="true" /> {DOC_LABEL[type]}
                          </button>
                        ) : (
                          <span key={type} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-dashed border-rose-300 text-rose-600 text-xs font-semibold">
                            <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> {DOC_LABEL[type]} missing
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {(onApprove || onReject) && (
            <div className="sticky bottom-0 -mx-1 px-1 pt-3 pb-1 bg-white border-t border-slate-100 flex justify-end gap-2">
              {onReject && <Button variant="secondary" onClick={onReject} disabled={busy} className="text-rose-600">Reject</Button>}
              {onApprove && <Button onClick={onApprove} loading={busy} disabled={!pin}>Approve &amp; publish</Button>}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
