import { useState } from 'react';
import clsx from 'clsx';
import { useConsole } from '../../context/AdminConsoleContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useConfirm } from '../../context/ConfirmContext.jsx';
import { useConsoleActions } from '../../components/superadmin/consoleActions.js';
import { api } from '../../lib/api.js';
import { AdminPageHeader } from '../../components/superadmin/AdminKpi.jsx';
import { ClinicProfile } from '../../components/superadmin/ClinicProfile.jsx';
import { DoctorProfile } from '../../components/superadmin/DoctorProfile.jsx';
import { StatusBadge } from '../../components/ui/StatusBadge.jsx';
import { FilterPills } from '../../components/ui/FilterPills.jsx';
import { inr } from '../../lib/format.js';
import { NETWORK_STATE } from '../../lib/constants.js';

export default function ClinicsMasterView() {
  const { data, clinics, refetch } = useConsole();
  const { openAddClinic } = useConsoleActions();
  const toast = useToast();
  const confirm = useConfirm();

  // Clinics is the primary view; Doctors is the flat per-practitioner list.
  const [tab, setTab] = useState('clinics');
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [openClinic, setOpenClinic] = useState(null);
  const [openDoctor, setOpenDoctor] = useState(null);
  const [busy, setBusy] = useState(null);

  const rollup = data?.clinicRollup ?? [];
  const q = query.toLowerCase();

  const clinicRows = rollup.filter((c) => {
    const match = c.name.toLowerCase().includes(q)
      || c.code.toLowerCase().includes(q)
      || (c.address?.city ?? '').toLowerCase().includes(q)
      || c.specialties.some((s) => s.toLowerCase().includes(q));
    if (!match) return false;
    if (filter === 'active') return c.networkState === NETWORK_STATE.ACTIVE;
    if (filter === 'pending') return c.networkState === NETWORK_STATE.PENDING_APPROVAL;
    if (filter === 'suspended') return c.networkState === NETWORK_STATE.SUSPENDED;
    return true;
  });

  const doctorRows = clinics.filter((d) => {
    const match = d.doctorName.toLowerCase().includes(q)
      || d.clinicName.toLowerCase().includes(q)
      || (d.regNo ?? '').toLowerCase().includes(q)
      || d.specialty.toLowerCase().includes(q);
    if (!match) return false;
    if (filter === 'online') return d.isOnline;
    if (filter === 'offline') return !d.isOnline && d.status === 'Approved';
    if (filter === 'pending') return d.status === 'Pending';
    return true;
  });

  const clinicOf = (doctor) => rollup.find((c) => c.id === doctor.hospitalId) ?? null;

  const toggleOnline = async (d) => {
    setBusy(d.id);
    try {
      await api.post(`/api/queue/${d.id}/booking`, { isOpen: !d.isOnline });
      toast.success(`${d.doctorName} is now ${d.isOnline ? 'offline' : 'online'}`);
      refetch();
    } catch (e) { toast.error(e.message); } finally { setBusy(null); }
  };

  const deboardDoctor = async (d) => {
    const ok = await confirm({
      title: 'Deboard this doctor?',
      message: `${d.doctorName} at ${d.clinicName} will be removed from the network and their login deactivated.`,
      detail: 'Any patients still in their queue today will be released.',
      danger: true, confirmLabel: 'Deboard doctor',
    });
    if (!ok) return;
    try {
      await api.post(`/api/admin/doctors/${d.id}/deboard`, { reason: 'Removed from network by Super Admin.' });
      toast.success('Doctor deboarded');
      refetch();
    } catch (e) { toast.error(e.message); }
  };

  return (
    <section className="space-y-6">
      <AdminPageHeader
        title="Clinics Master Directory"
        subtitle="Clinics, the doctors attached to each, connectivity status and financial cash audits."
      >
        <button
          type="button"
          onClick={openAddClinic}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md flex items-center gap-2"
        >
          <i className="fa-solid fa-plus" /> Onboard New Clinic
        </button>
      </AdminPageHeader>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <FilterPills
            value={tab}
            onChange={(v) => { setTab(v); setFilter('all'); }}
            options={[
              { value: 'clinics', label: 'Clinics', count: rollup.length },
              { value: 'doctors', label: 'Doctors', count: clinics.length },
            ]}
          />
        </div>

        <div className="w-full md:w-80 relative">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-3 text-slate-400 text-xs" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tab === 'clinics' ? 'Search clinic, code, city or specialty…' : 'Search doctor, clinic, reg no…'}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-4 py-2 text-xs font-medium text-slate-800 outline-none focus:border-indigo-600 focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Filter:</span>
          {(tab === 'clinics'
            ? [['all', 'All'], ['active', '🟢 Active'], ['suspended', '⏸ Suspended'], ['pending', '⌛ Pending']]
            : [['all', 'All'], ['online', '🟢 Online'], ['offline', '⚪ Offline'], ['pending', '⌛ Pending']]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={clsx('px-3 py-1.5 rounded-lg text-xs font-bold transition',
                filter === key ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ---- CLINICS ---- */}
      {tab === 'clinics' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Clinic</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4 text-center">Doctors</th>
                  <th className="py-3.5 px-4">Specialties</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Collections</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {clinicRows.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-slate-400 font-medium">No clinics match your query.</td></tr>
                ) : clinicRows.map((c) => (
                  <tr key={c.id} onClick={() => setOpenClinic(c)} className="hover:bg-slate-50 transition cursor-pointer">
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{c.name}</p>
                      <p className="text-[11px] text-slate-500">{c.code} · Licence {c.licenseNumber}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-slate-700">{c.address?.city} {c.address?.pincode}</p>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1">
                        <i className={clsx('fa-solid fa-location-dot', c.coordinates ? 'text-teal-600' : 'text-rose-400')} />
                        {c.coordinates ? c.district : 'not geocoded'}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-black text-slate-900 text-sm">{c.doctorCount}</span>
                      {c.doctorCount > 0 && (
                        <span className="block text-[10px] text-emerald-600 font-bold">{c.onlineDoctors} online</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {c.specialties.length === 0
                          ? <span className="text-[11px] text-slate-400 italic">none yet</span>
                          : c.specialties.slice(0, 3).map((s) => (
                            <span key={s} className="bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded text-[10px]">{s}</span>
                          ))}
                        {c.specialties.length > 3 && (
                          <span className="text-[10px] text-slate-400">+{c.specialties.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4"><StatusBadge status={c.networkState} className="mx-auto" /></td>
                    <td className="py-3 px-4 text-right">
                      <p className="font-bold text-slate-900">{inr(c.totalCash)}</p>
                      <p className="text-[10px] text-slate-400">{c.patientsTotal} patients</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-4 py-3 text-[11px] text-slate-400 border-t border-slate-100">
            Click a clinic to see its profile, map location and attached doctors.
          </p>
        </div>
      )}

      {/* ---- DOCTORS ---- */}
      {tab === 'doctors' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Doctor</th>
                  <th className="py-3.5 px-4">Attached Clinic</th>
                  <th className="py-3.5 px-4">Specialty &amp; Reg No</th>
                  <th className="py-3.5 px-4 text-center">Connectivity</th>
                  <th className="py-3.5 px-4 text-right">Collections</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {doctorRows.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-slate-400 font-medium">No doctors match your query.</td></tr>
                ) : doctorRows.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 cursor-pointer" onClick={() => setOpenDoctor(d)}>
                      <p className="font-bold text-slate-900">
                        <i className="fa-solid fa-user-doctor text-indigo-500 mr-1.5" />{d.doctorName}
                      </p>
                      <p className="text-[11px] text-slate-500">{d.education}</p>
                    </td>
                    <td className="py-3 px-4 cursor-pointer" onClick={() => setOpenClinic(clinicOf(d))}>
                      <p className="font-semibold text-slate-800">{d.clinicName}</p>
                      <p className="text-[10px] text-slate-400">{d.district}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded text-[10px]">{d.specialty}</span>
                      <p className="text-[11px] text-slate-500 mt-0.5">Reg: <strong>{d.regNo}</strong></p>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {d.status === 'Pending' ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">⌛ Pending</span>
                      ) : (
                        <button
                          type="button" disabled={busy === d.id} onClick={() => toggleOnline(d)}
                          className={clsx(
                            'px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1.5 transition disabled:opacity-50',
                            d.isOnline ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-slate-200 text-slate-800 hover:bg-slate-300',
                          )}
                        >
                          <span className={clsx('w-2 h-2 rounded-full', d.isOnline ? 'bg-emerald-600 animate-pulse' : 'bg-slate-500')} />
                          {d.isOnline ? 'ONLINE' : 'OFFLINE'}
                        </button>
                      )}
                      {d.isOnBreak && <span className="block mt-1 text-[10px] font-bold text-amber-700">On break</span>}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <p className="font-bold text-slate-900">{inr(d.totalCash)}</p>
                      <p className="text-[10px] text-slate-400">{d.patientsTotal} patients</p>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button type="button" title="View profile" onClick={() => setOpenDoctor(d)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
                          <i className="fa-solid fa-id-card text-xs" />
                        </button>
                        <button type="button" title="Deboard doctor" onClick={() => deboardDoctor(d)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg">
                          <i className="fa-solid fa-trash text-xs" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ClinicProfile
        clinic={openClinic}
        open={Boolean(openClinic)}
        onClose={() => setOpenClinic(null)}
        onOpenDoctor={(d) => { setOpenClinic(null); setOpenDoctor(d); }}
      />
      <DoctorProfile
        doctor={openDoctor}
        clinic={openDoctor ? clinicOf(openDoctor) : null}
        open={Boolean(openDoctor)}
        onClose={() => setOpenDoctor(null)}
      />
    </section>
  );
}
