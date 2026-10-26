import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { useApi } from '../../hooks/useApi.js';
import { FilterPills } from '../../components/ui/FilterPills.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { SkeletonRows } from '../../components/ui/Skeleton.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { useNoIndex } from '../../lib/seo.js';

const longDate = (iso) => (iso
  ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  : '');

const PHARMACY_NOTE = {
  DISPENSED: 'Medicines given at the clinic pharmacy',
  PARTIAL: 'Partly given at the clinic pharmacy',
  PENDING: 'Sent to the clinic pharmacy',
};

/**
 * The patient's own health records: every prescription from a visit they
 * booked through Mediigo, for themselves and their family, at any clinic.
 *
 * Visits registered at a clinic desk are not here — the patient did not book
 * them through the app — and the page says so, rather than leaving someone
 * wondering why last month's walk-in is missing.
 */
export default function RecordsView() {
  useNoIndex('Health records');
  const { data, loading } = useApi('/api/prescriptions/mine');
  const records = useMemo(() => data ?? [], [data]);
  const people = useMemo(() => [...new Set(records.map((r) => r.patientName).filter(Boolean))], [records]);
  const [who, setWho] = useState('ALL');
  const [open, setOpen] = useState(null);

  if (loading && !data) return <SkeletonRows rows={4} />;

  const shown = who === 'ALL' ? records : records.filter((r) => r.patientName === who);
  const openId = open ?? shown[0]?.id;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mg-title">Health Records</h2>
        <p className="text-xs text-slate-500 mt-1">Prescriptions from the visits you booked on Mediigo</p>
      </div>

      {people.length > 1 && (
        <div className="overflow-x-auto no-scrollbar">
          <FilterPills
            options={[{ value: 'ALL', label: 'Everyone' }, ...people.map((p) => ({ value: p, label: p }))]}
            value={who}
            onChange={setWho}
          />
        </div>
      )}

      {!shown.length ? (
        <EmptyState
          icon="doc"
          title="No records yet"
          hint="After a consultation you booked on Mediigo, the doctor’s prescription appears here."
        />
      ) : (
        <ol className="space-y-3">
          {shown.map((r) => (
            <li key={r.id}>
              <RecordCard rx={r} open={r.id === openId} onToggle={() => setOpen(r.id === openId ? '' : r.id)} />
            </li>
          ))}
        </ol>
      )}

      <p className="flex items-start gap-2 text-[11px] text-slate-500 leading-relaxed">
        <Icon name="info" className="w-4 h-4 shrink-0 text-slate-400" />
        Visits registered at a clinic’s front desk are kept by that clinic and are not shown here.
      </p>
    </div>
  );
}

function RecordCard({ rx, open, onToggle }) {
  return (
    <article className="mg-card overflow-hidden">
      <button type="button" onClick={onToggle} aria-expanded={open} className="w-full text-left p-4 flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="block text-[11px] font-medium text-mg-teal">{longDate(rx.date)}{rx.patientName ? ` · ${rx.patientName}` : ''}</span>
          <span className="block text-base font-semibold text-slate-900 mt-0.5">{rx.diagnosis}</span>
          <span className="block text-xs text-slate-500 truncate">
            {[rx.doctor?.name, rx.doctor?.specialty, rx.clinicName].filter(Boolean).join(' · ')}
          </span>
        </span>
        <Icon name="chevronDown" className={clsx('w-5 h-5 text-slate-400 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
          {rx.symptoms && <p className="text-xs text-slate-600"><span className="text-slate-400">Symptoms:</span> {rx.symptoms}</p>}

          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {rx.medicines.map((m) => (
              <li key={m.name} className="px-3 py-2.5">
                <p className="text-sm font-medium text-slate-900">{m.name}</p>
                <p className="text-xs text-slate-500">{[m.dosage, m.duration, m.instruction].filter(Boolean).join(' · ')}</p>
              </li>
            ))}
          </ul>

          {rx.advice && <p className="text-xs text-slate-700"><span className="text-slate-400">Advice:</span> {rx.advice}</p>}
          {rx.reviewDate && <p className="text-xs text-slate-700"><span className="text-slate-400">Review on:</span> {longDate(rx.reviewDate)}</p>}
          {rx.pharmacy && (
            <p className="text-xs text-emerald-700">
              {PHARMACY_NOTE[rx.pharmacy.status]}
              {rx.pharmacy.unavailable?.length > 0 && <span className="text-slate-500"> — buy separately: {rx.pharmacy.unavailable.join(', ')}</span>}
            </p>
          )}
        </div>
      )}
    </article>
  );
}
