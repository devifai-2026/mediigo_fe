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
