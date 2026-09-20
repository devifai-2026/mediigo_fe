import { Line, Doughnut, Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

/**
 * The five Admin.html charts. Every colour, tension, fill and legend position
 * is carried over from the prototype's Chart.js configs unchanged — only the
 * datasets are now live instead of hard-coded.
 */
const BASE = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } } };

export function OnboardingTrendChart({ labels, onboarded, revenueHundreds }) {
  return (
    <Line
      data={{
        labels,
        datasets: [
          {
            label: 'Clinics Onboarded',
            data: onboarded,
            borderColor: '#4F46E5',
            backgroundColor: 'rgba(79, 70, 229, 0.1)',
            fill: true,
            tension: 0.4,
          },
          {
            label: 'Revenue Generated (₹100s)',
            data: revenueHundreds,
            borderColor: '#0D9488',
            backgroundColor: 'rgba(13, 148, 136, 0.1)',
            fill: true,
            tension: 0.4,
          },
        ],
      }}
      options={BASE}
    />
  );
}

export function PatientTrendChart({ labels, patients }) {
  return (
    <Line
      data={{
        labels,
        datasets: [{
          label: 'Network Patient Attendance Volume',
          data: patients,
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#059669',
          pointRadius: 4,
        }],
      }}
      options={BASE}
    />
  );
}

export function RevenueBreakdownChart({ fresh, followup, emergency }) {
  return (
    <Doughnut
      data={{
        labels: ['Fresh Consult', 'Follow-Up', 'Emergency'],
        datasets: [{ data: [fresh, followup, emergency], backgroundColor: ['#059669', '#2563EB', '#E11D48'] }],
      }}
      options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }}
    />
  );
}

export function AgentPerformanceChart({ agents }) {
  return (
    <Bar
      data={{
        labels: agents.map((a) => a.name),
        datasets: [{
          label: 'Onboarded Clinics Count',
          data: agents.map((a) => a.clinicCount),
          backgroundColor: '#0D9488',
          borderRadius: 8,
        }],
      }}
      options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }}
    />
  );
}

export function SpecialtyDistributionChart({ clinics }) {
  // The prototype hard-coded five specialties; this derives them from the live
  // network so a new specialty shows up on its own.
  const counts = new Map();
  clinics.forEach((c) => counts.set(c.specialty, (counts.get(c.specialty) || 0) + 1));
  const labels = [...counts.keys()];
  const palette = ['#4F46E5', '#0D9488', '#D97706', '#E11D48', '#64748B', '#2563EB', '#059669', '#7C3AED'];

  return (
    <Pie
      data={{
        labels,
        datasets: [{ data: labels.map((l) => counts.get(l)), backgroundColor: labels.map((_, i) => palette[i % palette.length]) }],
      }}
      options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }}
    />
  );
}

/* ------------------------------------------------------------------ *
 * Patients Master charts.
 *
 * These read the /patients/analytics payload rather than the console one,
 * because the master's filters (clinic, doctor, date range, visit type) have
 * to move the graphs as well as the table.
 * ------------------------------------------------------------------ */

const NO_LEGEND = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };
const BOTTOM_LEGEND = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } };

/** Daily footfall over the last 30 days, split by visit type. */
export function PatientFlowChart({ labels, fresh, followup, emergency }) {
  return (
    <Line
      data={{
        labels,
        datasets: [
          {
            label: 'Fresh', data: fresh, borderColor: '#059669',
            backgroundColor: 'rgba(5, 150, 105, 0.12)', fill: true, tension: 0.35, pointRadius: 0, borderWidth: 2,
          },
          {
            label: 'Follow-up', data: followup, borderColor: '#2563EB',
            backgroundColor: 'rgba(37, 99, 235, 0.12)', fill: true, tension: 0.35, pointRadius: 0, borderWidth: 2,
          },
          {
            label: 'Emergency', data: emergency, borderColor: '#E11D48',
            backgroundColor: 'rgba(225, 29, 72, 0.12)', fill: true, tension: 0.35, pointRadius: 0, borderWidth: 2,
          },
        ],
      }}
      options={{
        ...BASE,
        interaction: { mode: 'index', intersect: false },
        scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { precision: 0 } } },
      }}
    />
  );
}

/** Fresh vs repeat patients — the retention question, as a doughnut. */
export function FreshVsRepeatChart({ fresh, repeat }) {
  return (
    <Doughnut
      data={{
        labels: ['Fresh (first visit)', 'Repeat'],
        datasets: [{ data: [fresh, repeat], backgroundColor: ['#6366F1', '#0D9488'], borderWidth: 0 }],
      }}
      options={{ ...BOTTOM_LEGEND, cutout: '62%' }}
    />
  );
}

/** Visit-type mix across every visit in the current filter. */
export function VisitMixChart({ fresh, followup, emergency }) {
  return (
    <Doughnut
      data={{
        labels: ['Fresh', 'Follow-up', 'Emergency'],
        datasets: [{ data: [fresh, followup, emergency], backgroundColor: ['#059669', '#2563EB', '#E11D48'], borderWidth: 0 }],
      }}
      options={{ ...BOTTOM_LEGEND, cutout: '62%' }}
    />
  );
}

/** Which clinics carry the footfall. Horizontal so long names stay readable. */
export function TopClinicsChart({ clinics }) {
  return (
    <Bar
      data={{
        labels: clinics.map((c) => c.name),
        datasets: [
          { label: 'Visits', data: clinics.map((c) => c.visits), backgroundColor: '#4F46E5', borderRadius: 6 },
          { label: 'Unique patients', data: clinics.map((c) => c.uniquePatients), backgroundColor: '#A5B4FC', borderRadius: 6 },
        ],
      }}
      options={{
        ...BASE,
        indexAxis: 'y',
        scales: { x: { beginAtZero: true, ticks: { precision: 0 } }, y: { grid: { display: false } } },
      }}
    />
  );
}

/** Same question for doctors. */
export function TopDoctorsChart({ doctors }) {
  return (
    <Bar
      data={{
        labels: doctors.map((d) => d.name),
        datasets: [
          { label: 'Visits', data: doctors.map((d) => d.visits), backgroundColor: '#0D9488', borderRadius: 6 },
          { label: 'Unique patients', data: doctors.map((d) => d.uniquePatients), backgroundColor: '#5EEAD4', borderRadius: 6 },
        ],
      }}
      options={{
        ...BASE,
        indexAxis: 'y',
        scales: { x: { beginAtZero: true, ticks: { precision: 0 } }, y: { grid: { display: false } } },
      }}
    />
  );
}

/** Who the patients are, by age band. */
export function AgeBandChart({ bands }) {
  const LABEL = {
    '0-12': 'Child 0-12', '13-25': 'Youth 13-25', '26-40': 'Adult 26-40',
    '41-60': 'Mid 41-60', '60+': 'Senior 60+', unknown: 'Not stated',
  };
  const keys = Object.keys(LABEL).filter((k) => (bands?.[k] ?? 0) > 0);
  return (
    <Bar
      data={{
        labels: keys.map((k) => LABEL[k]),
        datasets: [{ label: 'Patients', data: keys.map((k) => bands[k]), backgroundColor: '#D97706', borderRadius: 6 }],
      }}
      options={{ ...NO_LEGEND, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { precision: 0 } } } }}
    />
  );
}

/** How the booking reached us — app, walk-in, QR standee or phone. */
export function BookingSourceChart({ sources }) {
  const LABEL = { APP: 'Patient app', WALKIN: 'Walk-in desk', QR_SCAN: 'QR standee', PHONE: 'Phone', UNKNOWN: 'Unknown' };
  const keys = Object.keys(sources ?? {}).filter((k) => sources[k] > 0);
  const palette = { APP: '#4F46E5', WALKIN: '#D97706', QR_SCAN: '#0D9488', PHONE: '#64748B', UNKNOWN: '#CBD5E1' };
  return (
    <Pie
      data={{
        labels: keys.map((k) => LABEL[k] ?? k),
        datasets: [{ data: keys.map((k) => sources[k]), backgroundColor: keys.map((k) => palette[k] ?? '#94A3B8'), borderWidth: 0 }],
      }}
      options={BOTTOM_LEGEND}
    />
  );
}
