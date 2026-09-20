import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useApi } from '../../hooks/useApi.js';
import { AdminKpi, AdminPageHeader } from '../../components/superadmin/AdminKpi.jsx';
import {
  PatientFlowChart, FreshVsRepeatChart, VisitMixChart,
  TopClinicsChart, TopDoctorsChart, AgeBandChart, BookingSourceChart,
} from '../../components/superadmin/AdminCharts.jsx';
import { SkeletonRows } from '../../components/ui/Skeleton.jsx';
import { FilterPills } from '../../components/ui/FilterPills.jsx';
import { inr, phone as fmtPhone, shortDate, initials } from '../../lib/format.js';

/**
 * Patients Master — every patient the network has ever seen, with the graphs
 * that explain the table sitting directly above it.
 *
 * The filter bar drives both: change the clinic and the charts redraw for that
 * clinic, so what you are reading at the top is always a description of the
 * rows underneath. That is why this page does not reuse the console payload —
 * it needs a filter-aware query of its own.
 */

const SEGMENTS = [
  { value: 'all', label: 'All patients' },
  { value: 'fresh', label: 'Fresh only' },
  { value: 'repeat', label: 'Repeat' },
  { value: 'followup', label: 'Follow-ups' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'multiclinic', label: 'Multi-clinic' },
];

const SOURCE_LABEL = { APP: 'App', WALKIN: 'Walk-in', QR_SCAN: 'QR', PHONE: 'Phone' };

const GENDER_LABEL = { M: 'Male', F: 'Female', O: 'Other' };

const VISIT_CHIP = {
  fresh: 'bg-emerald-50 text-emerald-700',
  followup: 'bg-blue-50 text-blue-700',
  emergency: 'bg-rose-50 text-rose-700',
};

// The last 90 days is the useful default: long enough for a follow-up cycle to
// show up, short enough that the roster is not the entire history of the network.
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

const Panel = ({ title, hint, children, className, chip }) => (
  <div className={clsx('bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3', className)}>
    <div className="flex justify-between items-start gap-2">
      <div>
        <h3 className="font-bold text-slate-900 text-sm">{title}</h3>
        {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
      </div>
      {chip}
    </div>
    {children}
  </div>
);

export default function PatientsMasterView() {
  const navigate = useNavigate();

  const [filters, setFilters] = useState({
    q: '', segment: 'all', from: '', to: '',
    hospitalId: '', doctorId: '', visitType: '', source: '',
    sort: 'recent', page: 1,
  });

  const set = (patch) => setFilters((f) => ({ ...f, ...patch, page: patch.page ?? 1 }));

  // Serialised once and reused as the query string for both endpoints, so the
  // table and the charts can never drift apart.
  const qs = useMemo(() => {
    const p = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v !== '' && v != null) p.set(k, v); });
    p.set('limit', '50');
    return p.toString();
  }, [filters]);

  const { data: master, loading } = useApi(`/api/superadmin/patients?${qs}`);
  const { data: analytics } = useApi(`/api/superadmin/patients/analytics?${qs}`);
  const { data: options } = useApi('/api/superadmin/patients/filters');

  const rows = master?.rows ?? [];
  const total = master?.total ?? 0;
  const k = analytics?.kpis ?? {};
  const charts = analytics?.charts ?? {};

  // Only the doctors at the selected clinic, so the two dropdowns cannot be
  // set to a contradictory pair.
  const doctorOptions = (options?.doctors ?? []).filter(
    (d) => !filters.hospitalId || d.hospitalId === filters.hospitalId,
  );

  const pages = Math.max(1, Math.ceil(total / 50));
  const activeFilters = ['hospitalId', 'doctorId', 'visitType', 'source', 'from', 'to']
    .filter((key) => filters[key]).length;

  return (
    <section className="space-y-6">
      <AdminPageHeader
        title="Patients Master"
        subtitle="Every patient across the network — fresh, repeat and follow-up histories against the clinics and doctors they were seen by."
      >
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500 bg-white border border-slate-200 px-3 py-2 rounded-xl">
            <i className="fa-solid fa-users mr-1.5 text-indigo-500" />
            {total.toLocaleString('en-IN')} patients in view
          </span>
        </div>
      </AdminPageHeader>

      {/* ---- KPI band ---- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminKpi
          label="Unique Patients" value={(k.uniquePatients ?? 0).toLocaleString('en-IN')}
          icon="fa-hospital-user" accent="indigoSlate"
          footer={<>{(k.totalVisits ?? 0).toLocaleString('en-IN')} visits · {k.visitsPerPatient ?? 0} avg per patient</>}
        />
        <AdminKpi
          label="Fresh Patients" value={(k.freshPatients ?? 0).toLocaleString('en-IN')}
          icon="fa-user-plus" accent="emeraldSlate"
          footer="Seen exactly once — first contact with the network"
        />
        <AdminKpi
          label="Repeat Patients" value={(k.repeatPatients ?? 0).toLocaleString('en-IN')}
          icon="fa-repeat" accent="teal"
          footer={<><span className="font-bold text-teal-600">{k.repeatRate ?? 0}% retention</span> · {k.loyalPatients ?? 0} with 5+ visits</>}
        />
        <AdminKpi
          label="Attended Today" value={(k.attendedToday ?? 0).toLocaleString('en-IN')}
          icon="fa-calendar-check" accent="amberSlate"
          footer={<>{(k.attendedWeek ?? 0).toLocaleString('en-IN')} this week · {(k.attendedMonth ?? 0).toLocaleString('en-IN')} this month</>}
        />
      </div>

      {/* ---- Graphs ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Panel
          className="lg:col-span-2"
          title="Daily Patient Flow — Last 30 Days"
          hint="Footfall split by visit type, so a rise in follow-ups is never mistaken for new demand."
          chip={<span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full">Live OPD</span>}
        >
          <div className="h-64">
            <PatientFlowChart
              labels={charts.labels ?? []} fresh={charts.fresh ?? []}
              followup={charts.followup ?? []} emergency={charts.emergency ?? []}
            />
          </div>
        </Panel>

        <Panel title="Fresh vs Repeat" hint="Whether the network is acquiring patients or keeping them.">
          <div className="h-48">
            <FreshVsRepeatChart fresh={k.freshPatients ?? 0} repeat={k.repeatPatients ?? 0} />
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
              <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Multi-clinic</span>
              <span className="text-base font-black text-indigo-600">{k.multiClinicPatients ?? 0}</span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
              <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Registered</span>
              <span className="text-base font-black text-teal-600">{(k.registeredPatients ?? 0).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Panel title="Visit Mix" hint="Across every visit in view.">
          <div className="h-52">
            <VisitMixChart
              fresh={charts.visitMix?.fresh ?? 0}
              followup={charts.visitMix?.followup ?? 0}
              emergency={charts.visitMix?.emergency ?? 0}
            />
          </div>
        </Panel>

        <Panel title="Booking Source" hint="How the visit reached us.">
          <div className="h-52"><BookingSourceChart sources={charts.sources ?? {}} /></div>
        </Panel>

        <Panel className="lg:col-span-2" title="Top Clinics by Footfall" hint="Visits against the unique patients behind them.">
          <div className="h-52"><TopClinicsChart clinics={(charts.topClinics ?? []).slice(0, 6)} /></div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Top Doctors by Patients Seen" hint="Who is actually carrying the consultation load.">
          <div className="h-56"><TopDoctorsChart doctors={(charts.topDoctors ?? []).slice(0, 6)} /></div>
        </Panel>
        <Panel title="Patient Age Profile" hint="Distinct patients by age band, from what was captured at booking.">
          <div className="h-56"><AgeBandChart bands={charts.ageBands ?? {}} /></div>
        </Panel>
      </div>

      {/* ---- Filter bar ---- */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <FilterPills
            value={filters.segment}
            onChange={(v) => set({ segment: v })}
            options={SEGMENTS}
          />
          <div className="w-full lg:w-80 relative">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-3 text-slate-400 text-xs" />
            <input
              type="text" value={filters.q} onChange={(e) => set({ q: e.target.value })}
              placeholder="Search patient name or phone…"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-4 py-2 text-xs font-medium text-slate-800 outline-none focus:border-indigo-600 focus:bg-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 pt-1 border-t border-slate-100">
          <select
            value={filters.hospitalId}
            onChange={(e) => set({ hospitalId: e.target.value, doctorId: '' })}
            className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-600"
          >
            <option value="">All clinics</option>
            {(options?.clinics ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.name}{c.city ? ` · ${c.city}` : ''}</option>
            ))}
          </select>

          <select
            value={filters.doctorId} onChange={(e) => set({ doctorId: e.target.value })}
            className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-600"
          >
            <option value="">All doctors</option>
            {doctorOptions.map((d) => (
              <option key={d.id} value={d.id}>{d.name} · {d.specialty}</option>
            ))}
          </select>

          <select
            value={filters.visitType} onChange={(e) => set({ visitType: e.target.value })}
            className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-600"
          >
            <option value="">Any visit type</option>
            <option value="fresh">Fresh</option>
            <option value="followup">Follow-up</option>
            <option value="emergency">Emergency</option>
          </select>

          <select
            value={filters.source} onChange={(e) => set({ source: e.target.value })}
            className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-600"
          >
            <option value="">Any source</option>
            <option value="APP">Patient app</option>
            <option value="WALKIN">Walk-in desk</option>
            <option value="QR_SCAN">QR standee</option>
            <option value="PHONE">Phone</option>
          </select>

          <input
            type="date" value={filters.from} max={filters.to || undefined}
            onChange={(e) => set({ from: e.target.value })}
            className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-600"
          />
          <input
            type="date" value={filters.to} min={filters.from || undefined}
            onChange={(e) => set({ to: e.target.value })}
            className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-600"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500">Quick range:</span>
            {[['Today', 0], ['7 days', 6], ['30 days', 29], ['90 days', 89]].map(([label, n]) => (
              <button
                key={label} type="button"
                onClick={() => set({ from: daysAgo(n), to: daysAgo(0) })}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
              >
                {label}
              </button>
            ))}
            {activeFilters > 0 && (
              <button
                type="button"
                onClick={() => set({ hospitalId: '', doctorId: '', visitType: '', source: '', from: '', to: '' })}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 transition"
              >
                <i className="fa-solid fa-xmark mr-1" />Clear {activeFilters}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500">Sort:</span>
            <select
              value={filters.sort} onChange={(e) => set({ sort: e.target.value })}
              className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-600"
            >
              <option value="recent">Most recent visit</option>
              <option value="visits">Most visits</option>
              <option value="spend">Highest spend</option>
              <option value="name">Name A–Z</option>
            </select>
          </div>
        </div>
      </div>

      {/* ---- Roster ---- */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-4"><SkeletonRows rows={8} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Patient</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4 text-center">Type</th>
                  <th className="py-3.5 px-4 text-center">Visits</th>
                  <th className="py-3.5 px-4">Seen At</th>
                  <th className="py-3.5 px-4">Last Visit</th>
                  <th className="py-3.5 px-4 text-right">Spend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400 font-medium">
                      No patients match these filters.
                    </td>
                  </tr>
                ) : rows.map((p) => (
                  <tr
                    key={p.key}
                    onClick={() => navigate(`/super/patients/${encodeURIComponent(p.key)}`)}
                    className="hover:bg-slate-50 transition cursor-pointer"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 font-black text-[11px] grid place-items-center shrink-0">
                          {initials(p.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">{p.name}</p>
                          <p className="text-[10px] text-slate-500">
                            {p.age != null ? `${p.age}y` : 'age n/a'}
                            {p.gender ? ` · ${GENDER_LABEL[p.gender] ?? p.gender}` : ''}
                            {!p.registered && <span className="ml-1 text-amber-600 font-bold">· walk-in</span>}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-mono font-semibold text-slate-700">{fmtPhone(p.phone) || '—'}</p>
                      {p.location
                        ? <p className="text-[10px] text-teal-600 font-semibold truncate max-w-[160px]">
                            <i className="fa-solid fa-location-dot mr-1" />{p.location.label || 'Location on file'}
                          </p>
                        : <p className="text-[10px] text-slate-400">No location shared</p>}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={clsx(
                        'font-bold px-2 py-0.5 rounded text-[10px]',
                        p.isRepeat ? 'bg-teal-50 text-teal-700' : 'bg-indigo-50 text-indigo-700',
                      )}>
                        {p.isRepeat ? 'REPEAT' : 'FRESH'}
                      </span>
                      {p.followup > 0 && (
                        <span className="block mt-1 text-[10px] font-bold text-blue-600">{p.followup} follow-up</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-black text-slate-900 text-sm">{p.totalVisits}</span>
                      <div className="flex items-center justify-center gap-1 mt-1">
                        {p.fresh > 0 && <span className={clsx('px-1 rounded text-[9px] font-bold', VISIT_CHIP.fresh)}>{p.fresh}F</span>}
                        {p.followup > 0 && <span className={clsx('px-1 rounded text-[9px] font-bold', VISIT_CHIP.followup)}>{p.followup}U</span>}
                        {p.emergency > 0 && <span className={clsx('px-1 rounded text-[9px] font-bold', VISIT_CHIP.emergency)}>{p.emergency}E</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-800 truncate max-w-[180px]">{p.lastClinicName}</p>
                      <p className="text-[10px] text-slate-500 truncate max-w-[180px]">
                        <i className="fa-solid fa-user-doctor text-indigo-400 mr-1" />{p.lastDoctorName}
                        {p.lastSpecialty ? ` · ${p.lastSpecialty}` : ''}
                      </p>
                      {p.clinicCount > 1 && (
                        <p className="text-[10px] text-amber-600 font-bold">{p.clinicCount} clinics · {p.doctorCount} doctors</p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-800">{shortDate(p.lastVisit)}</p>
                      <p className="text-[10px] text-slate-400">since {shortDate(p.firstVisit)}</p>
                      {p.sources?.length > 0 && (
                        <p className="text-[10px] text-slate-400">
                          {p.sources.map((s) => SOURCE_LABEL[s] ?? s).join(', ')}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <p className="font-black text-slate-900">{inr(p.totalSpend)}</p>
                      {p.cancelled > 0 && <p className="text-[10px] text-rose-500 font-bold">{p.cancelled} cancelled</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100">
          <p className="text-[11px] text-slate-400">
            Showing {rows.length ? (filters.page - 1) * 50 + 1 : 0}–{(filters.page - 1) * 50 + rows.length} of{' '}
            {total.toLocaleString('en-IN')} · click a row to open the full patient file.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button" disabled={filters.page <= 1}
              onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <i className="fa-solid fa-chevron-left mr-1" />Previous
            </button>
            <span className="text-[11px] font-bold text-slate-600">Page {filters.page} / {pages}</span>
            <button
              type="button" disabled={filters.page >= pages}
              onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Next<i className="fa-solid fa-chevron-right ml-1" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
