import { useState } from 'react';
import { useConsole } from '../../context/AdminConsoleContext.jsx';
import { AdminKpi, AdminPageHeader } from '../../components/superadmin/AdminKpi.jsx';
import { PatientTrendChart } from '../../components/superadmin/AdminCharts.jsx';

export default function PatientsView() {
  const { metrics: m, charts, clinics, refetch } = useConsole();
  const [query, setQuery] = useState('');

  const q = query.toLowerCase();
  const rows = clinics.filter(
    (c) =>
      c.clinicName.toLowerCase().includes(q) ||
      c.doctorName.toLowerCase().includes(q) ||
      c.specialty.toLowerCase().includes(q),
  );

  // Busiest specialty by today's footfall, rather than the prototype's
  // hard-coded "Cardiology Hub".
  const bySpecialty = new Map();
  clinics.forEach((c) => bySpecialty.set(c.specialty, (bySpecialty.get(c.specialty) || 0) + c.patientsTotal));
  const busiest = [...bySpecialty.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

  return (
    <section className="space-y-6">
      <AdminPageHeader
        title="Patient Attendance & OPD Footfall"
        subtitle="Real-time patient attendance volume, daily footfall metrics, and historical attendance trends across clinics."
      >
        <button
          type="button"
          onClick={refetch}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-md flex items-center gap-2"
        >
          <i className="fa-solid fa-rotate" /> Sync Attendance Data
        </button>
      </AdminPageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminKpi
          label="Attended Today" value={m.patientsToday.toLocaleString('en-IN')} icon="fa-user-check" accent="emeraldSlate"
          footer={<><span className="font-bold text-emerald-600"><i className="fa-solid fa-arrow-trend-up" /> Active Today</span> across network</>}
        />
        <AdminKpi
          label="Attended This Week" value={m.patientsWeek.toLocaleString('en-IN')} icon="fa-calendar-week" accent="indigoSlate"
          footer="Current 7-day rolling total"
        />
        <AdminKpi
          label="Attended This Month" value={m.patientsMonth.toLocaleString('en-IN')} icon="fa-calendar-days" accent="teal"
          footer="Monthly OPD patient volume"
        />
        <AdminKpi
          label="Total Patient Visits" value={m.patientsTotal.toLocaleString('en-IN')} icon="fa-hospital-user" accent="amberSlate"
          footer="Cumulative network attendance"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Daily Patient Attendance Trajectory</h3>
              <p className="text-xs text-slate-500">Weekly breakdown of OPD patient visits across network clinics.</p>
            </div>
            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">Live OPD Counter</span>
          </div>
          <div className="h-64">
            <PatientTrendChart labels={charts.labels} patients={charts.patients} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              <i className="fa-solid fa-lightbulb text-amber-500 mr-2" />Attendance Summary
            </h3>
            <p className="text-xs text-slate-500 mt-1">Footfall density highlights across primary medical specialties.</p>

            <div className="mt-4 space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-700">Highest Daily OPD</span>
                <span className="text-xs font-black text-indigo-600">{busiest}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-700">Average Daily / Clinic</span>
                <span className="text-xs font-black text-emerald-600">{m.avgPerClinic} Patients</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-700">Peak Hours</span>
                <span className="text-xs font-black text-slate-800">10:00 AM - 01:00 PM</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-[11px] text-emerald-800 font-medium">
            <i className="fa-solid fa-circle-info mr-1" /> Data updates dynamically as doctors complete patient consultations in the clinic system.
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden space-y-3 p-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Clinic-Wise Patient Attendance Master Log</h3>
            <p className="text-xs text-slate-500">Detailed break-up of patients attended Today, This Week, This Month, and Cumulative Total per clinic.</p>
          </div>
          <div className="w-full md:w-72 relative">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-3 text-slate-400 text-xs" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Clinic or Doctor..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-4 py-2 text-xs font-medium text-slate-800 outline-none focus:border-indigo-600 focus:bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Clinic &amp; Doctor</th>
                <th className="py-3.5 px-4">Specialty</th>
                <th className="py-3.5 px-4 text-center">Attended Today</th>
                <th className="py-3.5 px-4 text-center">This Week</th>
                <th className="py-3.5 px-4 text-center">This Month</th>
                <th className="py-3.5 px-4 text-right">Total Cumulative</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400 font-medium">
                    No patient attendance records match your query.
                  </td>
                </tr>
              ) : rows.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-900">{c.clinicName}</p>
                    <p className="text-[11px] text-slate-500">
                      <i className="fa-solid fa-user-doctor text-indigo-500 mr-1" /> {c.doctorName}
                    </p>
                  </td>
                  <td className="py-3 px-4">
                    <span className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded text-[10px]">{c.specialty}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                      {c.patientsToday.toLocaleString('en-IN')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-slate-800">{c.patientsWeek.toLocaleString('en-IN')}</td>
                  <td className="py-3 px-4 text-center font-bold text-slate-800">{c.patientsMonth.toLocaleString('en-IN')}</td>
                  <td className="py-3 px-4 text-right font-black text-slate-900">{c.patientsTotal.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
