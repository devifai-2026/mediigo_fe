import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import clsx from 'clsx';
import { useApi } from '../../hooks/useApi.js';
import { ClinicMap } from '../../components/superadmin/ClinicMap.jsx';
import { VisitMixChart } from '../../components/superadmin/AdminCharts.jsx';
import { FilterPills } from '../../components/ui/FilterPills.jsx';
import { SkeletonRows } from '../../components/ui/Skeleton.jsx';
import { inr, phone as fmtPhone, shortDate, timeOf, initials } from '../../lib/format.js';
import { VISIT_LABEL } from '../../lib/constants.js';

/**
 * One patient's complete file.
 *
 * Two maps matter here and they answer different questions: where the patient
 * told us they are, and where the clinics they actually attend are. Showing
 * only the second would hide how far someone is travelling for care.
 */

const GENDER_LABEL = { M: 'Male', F: 'Female', O: 'Other' };

const STATUS_CHIP = {
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  WAITING: 'bg-amber-100 text-amber-800',
  IN_CHAMBER: 'bg-indigo-100 text-indigo-800',
  SKIPPED: 'bg-orange-100 text-orange-800',
  CANCELLED: 'bg-rose-100 text-rose-800',
  RESCHEDULE_NEEDED: 'bg-purple-100 text-purple-800',
};

const VISIT_CHIP = {
  fresh: 'bg-emerald-50 text-emerald-700',
  followup: 'bg-blue-50 text-blue-700',
  emergency: 'bg-rose-50 text-rose-700',
};

const SOURCE_LABEL = { APP: 'Patient app', WALKIN: 'Walk-in desk', QR_SCAN: 'QR standee', PHONE: 'Phone' };

const Stat = ({ label, value, tone = 'text-slate-900' }) => (
  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
    <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-bold">{label}</span>
    <span className={clsx('text-base font-black', tone)}>{value}</span>
  </div>
);

const Section = ({ title, hint, children, className }) => (
  <div className={clsx('bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-3', className)}>
    <div>
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{title}</p>
      {hint && <p className="text-[11px] text-slate-500 mt-0.5">{hint}</p>}
    </div>
    {children}
  </div>
);

export default function PatientProfileView() {
  const { key } = useParams();
  const { data: p, loading, error } = useApi(`/api/superadmin/patients/${encodeURIComponent(key)}`);
  const [tab, setTab] = useState('history');
  // Which clinic's pin the map is showing. Defaults to the patient's own
  // location when we have one, so the page opens on where they are.
  const [mapClinic, setMapClinic] = useState(null);

  if (loading) return <SkeletonRows rows={8} />;

  if (error || !p) {
    return (
      <section className="space-y-4">
        <Link to="/super/patients" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">
          <i className="fa-solid fa-arrow-left mr-1" />Back to Patients Master
        </Link>
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <i className="fa-solid fa-user-slash text-slate-300 text-3xl" />
          <p className="text-sm font-bold text-slate-700 mt-3">{error?.message ?? 'Patient not found'}</p>
        </div>
      </section>
    );
  }

  const s = p.stats;
  const shown = mapClinic ?? p.clinics.find((c) => c.coordinates) ?? null;
  const mapCoords = mapClinic?.coordinates ?? (p.location ? { lat: p.location.lat, lng: p.location.lng } : shown?.coordinates ?? null);
  const mapLabel = mapClinic
    ? mapClinic.name
    : (p.location ? `${p.name} — last known location` : shown?.name ?? p.name);

  const history = p.history;

  return (
    <section className="space-y-6">
      <Link to="/super/patients" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 inline-block">
        <i className="fa-solid fa-arrow-left mr-1" />Back to Patients Master
      </Link>

      {/* ---- Identity header ---- */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-teal-400 text-white font-black text-lg grid place-items-center shadow-md shrink-0">
              {initials(p.name)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">{p.name}</h1>
                <span className={clsx(
                  'text-[10px] font-bold px-2 py-0.5 rounded-full',
                  s.isRepeat ? 'bg-teal-100 text-teal-800' : 'bg-indigo-100 text-indigo-800',
                )}>
                  {s.isRepeat ? 'REPEAT PATIENT' : 'FRESH PATIENT'}
                </span>
                {!p.registered && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    WALK-IN · NO ACCOUNT
                  </span>
                )}
                {p.aadhaarLinked && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    <i className="fa-solid fa-id-card mr-1" />AADHAAR LINKED
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {p.age != null ? `${p.age} years` : 'Age not on file'}
                {p.gender ? ` · ${GENDER_LABEL[p.gender] ?? p.gender}` : ''}
                {p.registeredAt ? ` · Registered ${shortDate(p.registeredAt)}` : ''}
              </p>
              <div className="flex items-center gap-4 mt-1.5 text-xs">
                <a href={`tel:${p.phone}`} className="font-mono font-bold text-slate-800 hover:text-indigo-600">
                  <i className="fa-solid fa-phone text-slate-400 mr-1.5" />{fmtPhone(p.phone) || '—'}
                </a>
                {p.email && (
                  <a href={`mailto:${p.email}`} className="text-slate-600 hover:text-indigo-600 truncate">
                    <i className="fa-solid fa-envelope text-slate-400 mr-1.5" />{p.email}
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 shrink-0">
            <Stat label="Visits" value={s.totalVisits} />
            <Stat label="Fresh" value={s.fresh} tone="text-emerald-600" />
            <Stat label="Follow-up" value={s.followup} tone="text-blue-600" />
            <Stat label="Emergency" value={s.emergency} tone="text-rose-600" />
            <Stat label="Spend" value={inr(s.totalSpend)} tone="text-teal-700" />
          </div>
        </div>
      </div>

      {/* ---- Location + summary ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Section
          className="lg:col-span-2"
          title="Location"
          hint={
            mapClinic
              ? `Showing ${mapClinic.name}. Pick "Patient location" to go back to where they are.`
              : p.location
                ? `Last shared by the patient${p.location.updatedAt ? ` on ${shortDate(p.location.updatedAt)}` : ''}. Tap a clinic to see where they travel for care.`
                : 'This patient has not shared a location. The map shows the clinic they attend.'
          }
        >
          <div className="flex flex-wrap gap-1.5">
            {p.location && (
              <button
                type="button" onClick={() => setMapClinic(null)}
                className={clsx('px-2.5 py-1 rounded-lg text-[11px] font-bold transition',
                  !mapClinic ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}
              >
                <i className="fa-solid fa-house-user mr-1" />Patient location
              </button>
            )}
            {p.clinics.filter((c) => c.coordinates).map((c) => (
              <button
                key={c.id} type="button" onClick={() => setMapClinic(c)}
                className={clsx('px-2.5 py-1 rounded-lg text-[11px] font-bold transition',
                  mapClinic?.id === c.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}
              >
                <i className="fa-solid fa-hospital mr-1" />{c.name}
              </button>
            ))}
          </div>

          <ClinicMap coordinates={mapCoords} name={mapLabel} height="h-72" />

          {(p.location?.formatted || p.location?.label) && !mapClinic && (
            <p className="text-[11px] text-slate-600">
              <i className="fa-solid fa-location-dot text-teal-600 mr-1" />
              {p.location.formatted || p.location.label}
              {p.location.accuracy != null && (
                <span className="text-slate-400"> · ±{Math.round(p.location.accuracy)}m</span>
              )}
            </p>
          )}
          {mapClinic && (
            <p className="text-[11px] text-slate-600">
              <i className="fa-solid fa-location-dot text-indigo-600 mr-1" />
              {[mapClinic.address?.line1, mapClinic.address?.city, mapClinic.address?.pincode].filter(Boolean).join(', ')}
              {mapClinic.contactPhone && <span className="text-slate-400"> · {fmtPhone(mapClinic.contactPhone)}</span>}
            </p>
          )}
        </Section>

        <div className="space-y-6">
          <Section title="Visit Mix" hint="Across every attended visit on file.">
            <div className="h-44">
              <VisitMixChart fresh={s.fresh} followup={s.followup} emergency={s.emergency} />
            </div>
          </Section>

          <Section title="Attendance Pattern">
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Clinics" value={s.clinicCount} tone="text-indigo-600" />
              <Stat label="Doctors" value={s.doctorCount} tone="text-indigo-600" />
              <Stat label="Cancelled" value={s.cancelled} tone={s.cancelled ? 'text-rose-600' : 'text-slate-900'} />
              <Stat label="Skipped" value={s.skipped} tone={s.skipped ? 'text-amber-600' : 'text-slate-900'} />
            </div>
            <div className="space-y-2 pt-1">
              <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[11px] font-semibold text-slate-600">First visit</span>
                <span className="text-[11px] font-black text-slate-900">{shortDate(s.firstVisit) || '—'}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[11px] font-semibold text-slate-600">Last visit</span>
                <span className="text-[11px] font-black text-slate-900">{shortDate(s.lastVisit) || '—'}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[11px] font-semibold text-slate-600">Average gap</span>
                <span className="text-[11px] font-black text-teal-700">
                  {s.avgGapDays != null ? `${s.avgGapDays} days` : 'Single visit'}
                </span>
              </div>
            </div>
          </Section>
        </div>
      </div>

      {/* ---- Tabs ---- */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <FilterPills
            value={tab} onChange={setTab}
            options={[
              { value: 'history', label: 'Visit History', count: history.length },
              { value: 'clinics', label: 'Clinics', count: p.clinics.length },
              { value: 'doctors', label: 'Doctors', count: p.doctors.length },
              { value: 'payments', label: 'Payments', count: p.transactions.length },
              { value: 'family', label: 'Family', count: p.familyMembers.length },
            ]}
          />
          <p className="text-[11px] text-slate-400">
            {s.totalBookings} bookings on file · {s.totalVisits} attended
          </p>
        </div>

        {/* ---- Visit history ---- */}
        {tab === 'history' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Date &amp; Token</th>
                  <th className="py-3.5 px-4">Clinic</th>
                  <th className="py-3.5 px-4">Doctor</th>
                  <th className="py-3.5 px-4">Complaint</th>
                  <th className="py-3.5 px-4 text-center">Visit Type</th>
                  <th className="py-3.5 px-4 text-center">Booked For</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {history.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-slate-400 font-medium">No visits on file.</td></tr>
                ) : history.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{shortDate(h.date)}</p>
                      <p className="text-[10px] text-slate-500">
                        Token #{String(h.tokenNumber).padStart(2, '0')} · {h.shift?.toLowerCase()}
                      </p>
                      {h.completedAt && <p className="text-[10px] text-slate-400">Seen {timeOf(h.completedAt)}</p>}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-800">{h.clinicName}</p>
                      <p className="text-[10px] text-slate-400">
                        {[h.clinicCity, h.district].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-800">
                        <i className="fa-solid fa-user-doctor text-indigo-400 mr-1" />{h.doctorName}
                      </p>
                      {h.specialty && (
                        <span className="bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded text-[10px]">{h.specialty}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-slate-600 max-w-[200px] truncate" title={h.complaint ?? ''}>
                        {h.complaint || <span className="text-slate-300 italic">not recorded</span>}
                      </p>
                      <p className="text-[10px] text-slate-400">{SOURCE_LABEL[h.source] ?? h.source}</p>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={clsx('font-bold px-2 py-0.5 rounded text-[10px]', VISIT_CHIP[h.visitType] ?? 'bg-slate-100 text-slate-700')}>
                        {(VISIT_LABEL[h.visitType] ?? h.visitType ?? '—').toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded',
                        h.isSelf ? 'bg-slate-100 text-slate-700' : 'bg-purple-50 text-purple-700')}>
                        {h.bookedFor}
                      </span>
                      {h.isPaid && <span className="block mt-1 text-[10px] font-bold text-emerald-600">Paid</span>}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={clsx('px-2.5 py-1 rounded-full text-[10px] font-bold', STATUS_CHIP[h.status] ?? 'bg-slate-100 text-slate-700')}>
                        {h.status.replace(/_/g, ' ')}
                      </span>
                      {(h.skipReason || h.rescheduleReason) && (
                        <p className="text-[10px] text-slate-400 mt-1 max-w-[140px] truncate" title={h.skipReason ?? h.rescheduleReason}>
                          {h.skipReason ?? h.rescheduleReason}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ---- Clinics ---- */}
        {tab === 'clinics' && (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {p.clinics.length === 0 ? (
              <p className="text-xs text-slate-400 italic p-4">No attended visits yet.</p>
            ) : p.clinics.map((c) => (
              <button
                key={c.id} type="button" onClick={() => { setMapClinic(c); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="text-left p-4 bg-slate-50 hover:bg-white hover:border-indigo-300 border border-slate-200 rounded-xl transition"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900">{c.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {[c.city, c.district].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </div>
                  <span className="text-base font-black text-indigo-600 shrink-0">{c.visits}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {c.fresh > 0 && <span className={clsx('px-1.5 py-0.5 rounded text-[10px] font-bold', VISIT_CHIP.fresh)}>{c.fresh} fresh</span>}
                  {c.followup > 0 && <span className={clsx('px-1.5 py-0.5 rounded text-[10px] font-bold', VISIT_CHIP.followup)}>{c.followup} follow-up</span>}
                  {c.emergency > 0 && <span className={clsx('px-1.5 py-0.5 rounded text-[10px] font-bold', VISIT_CHIP.emergency)}>{c.emergency} emergency</span>}
                </div>
                <p className="text-[10px] text-slate-400 mt-2">
                  {shortDate(c.firstVisit)} → {shortDate(c.lastVisit)}
                  {c.coordinates && <span className="text-teal-600 font-bold ml-2"><i className="fa-solid fa-map-location-dot mr-1" />Show on map</span>}
                </p>
              </button>
            ))}
          </div>
        )}

        {/* ---- Doctors ---- */}
        {tab === 'doctors' && (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {p.doctors.length === 0 ? (
              <p className="text-xs text-slate-400 italic p-4">No attended visits yet.</p>
            ) : p.doctors.map((d) => (
              <div key={d.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900">
                      <i className="fa-solid fa-user-doctor text-indigo-500 mr-1.5" />{d.name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {d.specialty ?? '—'}{d.regNo ? ` · Reg ${d.regNo}` : ''}
                    </p>
                    {d.clinicName && <p className="text-[10px] text-slate-400">{d.clinicName}</p>}
                  </div>
                  <span className="text-base font-black text-teal-600 shrink-0">{d.visits}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {d.fresh > 0 && <span className={clsx('px-1.5 py-0.5 rounded text-[10px] font-bold', VISIT_CHIP.fresh)}>{d.fresh} fresh</span>}
                  {d.followup > 0 && <span className={clsx('px-1.5 py-0.5 rounded text-[10px] font-bold', VISIT_CHIP.followup)}>{d.followup} follow-up</span>}
                  {d.emergency > 0 && <span className={clsx('px-1.5 py-0.5 rounded text-[10px] font-bold', VISIT_CHIP.emergency)}>{d.emergency} emergency</span>}
                </div>
                <p className="text-[10px] text-slate-400 mt-2">{shortDate(d.firstVisit)} → {shortDate(d.lastVisit)}</p>
              </div>
            ))}
          </div>
        )}

        {/* ---- Payments ---- */}
        {tab === 'payments' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Receipt</th>
                  <th className="py-3.5 px-4">Clinic &amp; Doctor</th>
                  <th className="py-3.5 px-4 text-center">Visit Type</th>
                  <th className="py-3.5 px-4">Tender</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {p.transactions.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-slate-400 font-medium">No payments recorded.</td></tr>
                ) : p.transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4">
                      <p className="font-mono font-bold text-slate-900">{t.receiptNumber}</p>
                      <p className="text-[10px] text-slate-400">{shortDate(t.date)}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-800">{t.clinicName}</p>
                      <p className="text-[10px] text-slate-500">{t.doctorName}</p>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={clsx('font-bold px-2 py-0.5 rounded text-[10px]', VISIT_CHIP[t.visitType] ?? 'bg-slate-100 text-slate-700')}>
                        {(VISIT_LABEL[t.visitType] ?? t.visitType ?? '—').toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[10px] text-slate-500">
                      {[
                        t.tender?.cash ? `Cash ${inr(t.tender.cash)}` : null,
                        t.tender?.upi ? `UPI ${inr(t.tender.upi)}` : null,
                        t.tender?.card ? `Card ${inr(t.tender.card)}` : null,
                      ].filter(Boolean).join(' · ') || '—'}
                      {t.discount > 0 && <p className="text-amber-600 font-bold">Discount {inr(t.discount)}</p>}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={clsx('px-2.5 py-1 rounded-full text-[10px] font-bold',
                        t.status === 'PAID' ? 'bg-emerald-100 text-emerald-800'
                          : t.status === 'REFUNDED' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700')}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-900">{inr(t.totalFee)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {s.refunded > 0 && (
              <p className="px-4 py-3 text-[11px] text-rose-600 font-bold border-t border-slate-100">
                <i className="fa-solid fa-rotate-left mr-1" />{inr(s.refunded)} refunded across this patient's history.
              </p>
            )}
          </div>
        )}

        {/* ---- Family ---- */}
        {tab === 'family' && (
          <div className="p-4 space-y-3">
            {p.familyMembers.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                No family members on this account. Bookings made for others would appear in the visit history as "Family member".
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {p.familyMembers.map((m) => (
                  <div key={m.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <p className="text-xs font-bold text-slate-900">{m.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {m.relation}{m.age != null ? ` · ${m.age}y` : ''}{m.gender ? ` · ${GENDER_LABEL[m.gender] ?? m.gender}` : ''}
                    </p>
                    {m.phone && <p className="text-[10px] font-mono text-slate-400 mt-1">{fmtPhone(m.phone)}</p>}
                  </div>
                ))}
              </div>
            )}

            {p.policies.length > 0 && (
              <div className="pt-3 border-t border-slate-100">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">Insurance on file</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {p.policies.map((pol) => (
                    <div key={pol.id} className="p-3 bg-teal-50 border border-teal-100 rounded-xl">
                      <p className="text-xs font-bold text-teal-900">{pol.insurer}</p>
                      <p className="text-[11px] text-teal-700 font-mono">{pol.policyNumber}</p>
                      <p className="text-[10px] text-teal-600">
                        {pol.planType}{pol.sumInsured ? ` · Sum insured ${inr(pol.sumInsured)}` : ''}
                        {pol.validTill ? ` · valid to ${shortDate(pol.validTill)}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
