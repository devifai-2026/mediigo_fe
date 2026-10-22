import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useApi } from '../../hooks/useApi.js';
import { useSocketEvent } from '../../hooks/useSocketEvent.js';
import { useAudioUnlock } from '../../hooks/useAudioUnlock.js';
import { api, unwrap } from '../../lib/api.js';
import { chime } from '../../lib/audio.js';
import { EVENTS } from '../../lib/socketEvents.js';
import { PHARMACY_STATUS } from '../../lib/constants.js';
import { phone, token } from '../../lib/format.js';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Field.jsx';
import { AudioUnlockBanner, DeskCard, EmptyNote, LoadError, PageHeader, Pill, PrintPortal, RefreshButton } from '../../components/desk/ui.jsx';
import { RxPrint } from '../../components/desk/RxPrint.jsx';
import { isoToday } from '../../components/desk/DateRangePicker.jsx';
import { patientLine } from '../../components/desk/deskFormat.js';

const errMsg = (e) => e?.response?.data?.error?.message || e.message;

const time = (d) => (d ? new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : '');
const dayTime = (d) => (d
  ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
  : '');

export const STATUS_PILL = {
  [PHARMACY_STATUS.PENDING]: { tone: 'amber', label: 'To dispense' },
  [PHARMACY_STATUS.DISPENSED]: { tone: 'emerald', label: 'Dispensed' },
  [PHARMACY_STATUS.PARTIAL]: { tone: 'blue', label: 'Partly dispensed' },
};

const VIEW_COPY = {
  PENDING: {
    title: 'Prescriptions to dispense',
    subtitle: 'Sent by the clinic’s doctors — new ones appear here as they are saved',
    empty: ['fa-mug-hot', 'All caught up', 'New prescriptions from the doctors will appear here with a chime.'],
  },
  DONE: {
    title: 'Dispensed prescriptions',
    subtitle: 'What was given, and what the patient was told to buy elsewhere',
    empty: ['fa-clock-rotate-left', 'Nothing dispensed for this filter', 'Try another date, or clear the search.'],
  },
};

/**
 * The clinic pharmacy's counter.
 *
 * Prescriptions arrive live from the doctors' pads. The pharmacist opens one,
 * ticks off what they hand over, and the single button records it as fully or
 * partly dispensed from those ticks — the doctor sees the result in their EMR.
 */
export default function PharmacyView({ view }) {
  const { user } = useAuth();
  const toast = useToast();
  const { ready: audioReady, unlock } = useAudioUnlock();
  const copy = VIEW_COPY[view];

  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);
  const [date, setDate] = useState(view === 'DONE' ? isoToday() : '');

  const params = new URLSearchParams({ view, ...(q ? { q } : {}), ...(date ? { date } : {}) });
  const { data, error, loading, refetch, setData } = useApi(`/api/pharmacy/prescriptions?${params}`);
  const items = useMemo(() => data?.items ?? [], [data]);

  const [selectedId, setSelectedId] = useState(null);
  const selected = items.find((r) => r._id === selectedId) ?? items[0] ?? null;
  const [printing, setPrinting] = useState(null);

  // Live: a new pad lands at the top of the queue with a chime.
  useSocketEvent(EVENTS.PHARMACY_RX_NEW, ({ prescription: rx }) => {
    setData((d) => {
      if (!d) return d;
      const pending = d.pending + 1;
      if (view !== 'PENDING' || q || date || d.items.some((r) => r._id === rx._id)) return { ...d, pending };
      return { ...d, pending, items: [rx, ...d.items] };
    });
    chime();
    toast.push(`New prescription · ${rx.patientSnapshot?.name} (${rx.doctorSnapshot?.name})`);
  }, [view, q, date]);

  // Another counter (or this one) dispensed something: keep both lists honest.
  useSocketEvent(EVENTS.PHARMACY_RX_UPDATED, () => { refetch(); });

  const onUpdated = (rx) => {
    setData((d) => {
      if (!d) return d;
      const stillHere = (view === 'PENDING') === (rx.pharmacy.status === PHARMACY_STATUS.PENDING);
      const list = stillHere ? d.items.map((r) => (r._id === rx._id ? rx : r)) : d.items.filter((r) => r._id !== rx._id);
      const delta = rx.pharmacy.status === PHARMACY_STATUS.PENDING ? 1 : -1;
      return { ...d, items: list, pending: Math.max(0, d.pending + delta) };
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        icon="fa-prescription-bottle-medical"
        tone="teal"
        title={copy.title}
        subtitle={copy.subtitle}
        badge={data && <Pill tone={data.pending ? 'amber' : 'emerald'} dot>{data.pending} to dispense</Pill>}
      >
        <RefreshButton onRefresh={refetch} />
      </PageHeader>

      {!audioReady && view === 'PENDING' && (
        <AudioUnlockBanner onUnlock={unlock}>Tap to turn on the chime for new prescriptions</AudioUnlockBanner>
      )}

      <DeskCard className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" aria-hidden="true" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search patient name or mobile number" className="pl-8" />
          </div>
          <div className="flex gap-2">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="sm:w-44" aria-label="Visit date" />
            {date && (
              <Button variant="secondary" onClick={() => setDate('')} title="Show all dates">All dates</Button>
            )}
          </div>
        </div>
      </DeskCard>

      {error && !data && <LoadError error={error} onRetry={refetch} what="prescriptions" />}

      {loading && !data ? (
        <div className="grid lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-20 rounded-xl bg-slate-100 animate-pulse" />)}</div>
          <div className="lg:col-span-7 h-80 rounded-xl bg-slate-100 animate-pulse" />
        </div>
      ) : !items.length ? (
        <DeskCard><EmptyNote icon={copy.empty[0]} title={copy.empty[1]} hint={copy.empty[2]} /></DeskCard>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <DeskCard className="lg:col-span-5 overflow-hidden">
            <ul className="divide-y divide-slate-100 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {items.map((rx) => (
                <li key={rx._id}>
                  <RxListItem rx={rx} active={selected?._id === rx._id} onClick={() => setSelectedId(rx._id)} />
                </li>
              ))}
            </ul>
          </DeskCard>
          <div className="lg:col-span-7 lg:sticky lg:top-4">
            {selected && (
              <DispensePanel
                key={`${selected._id}:${selected.pharmacy?.status}`}
                rx={selected}
                onUpdated={onUpdated}
                onPrint={() => setPrinting(selected)}
                toast={toast}
              />
            )}
          </div>
        </div>
      )}

      <PrintPortal active={Boolean(printing)} onDone={() => setPrinting(null)}>
        <RxPrint rx={printing} clinicName={printing?.hospitalName || user?.clinic?.name || ''} />
      </PrintPortal>
    </div>
  );
}

function RxListItem({ rx, active, onClick }) {
  const status = STATUS_PILL[rx.pharmacy?.status];
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx('w-full text-left px-4 py-3 transition flex items-start justify-between gap-3', active ? 'bg-teal-50' : 'hover:bg-slate-50')}
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-slate-900 truncate">
          {rx.patientSnapshot?.name}
          {rx.tokenNumber != null && <span className="ml-1.5 text-xs font-medium text-mg-navy">{token(rx.tokenNumber)}</span>}
        </span>
        <span className="block text-[11px] text-slate-500 truncate">
          {[rx.doctorSnapshot?.name, `${rx.medicines.length} medicine${rx.medicines.length === 1 ? '' : 's'}`].filter(Boolean).join(' • ')}
        </span>
        <span className="block text-[11px] text-slate-400">Sent {dayTime(rx.pharmacy?.sentAt)}</span>
      </span>
      {status && <Pill tone={status.tone} className="shrink-0">{status.label}</Pill>}
    </button>
  );
}

function DispensePanel({ rx, onUpdated, onPrint, toast }) {
  const p = rx.pharmacy;
  const pending = p.status === PHARMACY_STATUS.PENDING;
  // Ticked = handed over. Starts all ticked: most pads are filled in full.
  const [given, setGiven] = useState(() => new Set(rx.medicines.map((m) => m.name).filter((n) => !p.unavailable?.includes(n))));
  const [note, setNote] = useState(p.note || '');
  const [busy, setBusy] = useState(false);

  const missing = rx.medicines.filter((m) => !given.has(m.name)).map((m) => m.name);
  const toggle = (name) => setGiven((s) => {
    const next = new Set(s);
    if (next.has(name)) next.delete(name); else next.add(name);
    return next;
  });

  const submit = async (status) => {
    setBusy(true);
    try {
      const out = unwrap(await api.post(`/api/pharmacy/prescriptions/${rx._id}/dispense`, {
        status,
        unavailable: status === PHARMACY_STATUS.PARTIAL ? missing : [],
        note: note.trim(),
      }));
      toast.success(status === PHARMACY_STATUS.PENDING
        ? 'Moved back to “to dispense”'
        : `${rx.patientSnapshot?.name}: ${status === PHARMACY_STATUS.PARTIAL ? 'partly dispensed' : 'dispensed'}`);
      onUpdated(out);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const status = STATUS_PILL[p.status];
  const nothingGiven = given.size === 0;

  return (
    <DeskCard className="p-4 sm:p-5 space-y-4">
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-slate-900">{rx.patientSnapshot?.name}</h2>
          <p className="text-xs text-slate-500">
            {[patientLine(rx.patientSnapshot), rx.patientSnapshot?.phone && `+91 ${phone(rx.patientSnapshot.phone)}`, rx.tokenNumber != null && `Token ${token(rx.tokenNumber)}`].filter(Boolean).join(' • ')}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {rx.doctorSnapshot?.name}{rx.doctorSnapshot?.specialty ? ` · ${rx.doctorSnapshot.specialty}` : ''} · sent {time(p.sentAt)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {status && <Pill tone={status.tone}>{status.label}</Pill>}
          <button type="button" onClick={onPrint} className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100" aria-label="Print prescription">
            <i className="fa-solid fa-print" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="text-xs space-y-1">
        <p><span className="text-slate-400">Diagnosis:</span> <strong className="font-semibold text-slate-800">{rx.diagnosis}</strong></p>
        {rx.advice && <p><span className="text-slate-400">Advice:</span> <span className="text-slate-700">{rx.advice}</span></p>}
      </div>

      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-mg-surface text-[10px] font-medium uppercase text-slate-500">
          <span className="col-span-6">{pending ? 'Give' : 'Medicine'}</span>
          <span className="col-span-2">Dose</span>
          <span className="col-span-2">For</span>
          <span className="col-span-2">When</span>
        </div>
        <ul className="divide-y divide-slate-100">
          {rx.medicines.map((m) => {
            const out = !given.has(m.name);
            return (
              <li key={m.name}>
                <label className={clsx('grid grid-cols-12 gap-2 px-3 py-2.5 items-center text-xs', pending && 'cursor-pointer hover:bg-slate-50', out && 'bg-rose-50/60')}>
                  <span className="col-span-6 flex items-center gap-2 min-w-0">
                    {pending ? (
                      <input type="checkbox" checked={!out} onChange={() => toggle(m.name)} className="w-4 h-4 accent-[#3E9A92] shrink-0" />
                    ) : (
                      <i className={clsx('fa-solid w-4 text-center shrink-0', out ? 'fa-xmark text-rose-500' : 'fa-check text-emerald-600')} aria-hidden="true" />
                    )}
                    <span className={clsx('font-medium truncate', out ? 'text-rose-700 line-through decoration-rose-300' : 'text-slate-900')}>{m.name}</span>
                  </span>
                  <span className="col-span-2 text-slate-700">{m.dosage}</span>
                  <span className="col-span-2 text-slate-700">{m.duration}</span>
                  <span className="col-span-2 text-slate-500 truncate">{m.instruction}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>

      {pending ? (
        <>
          <Input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional) — e.g. substitute given, buy Betadine outside" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              {missing.length
                ? <span className="text-rose-700">{missing.length} not given — the patient buys {missing.length === 1 ? 'it' : 'them'} elsewhere</span>
                : 'Untick anything out of stock before you confirm.'}
            </p>
            <Button
              onClick={() => submit(missing.length ? PHARMACY_STATUS.PARTIAL : PHARMACY_STATUS.DISPENSED)}
              loading={busy}
              disabled={nothingGiven}
              title={nothingGiven ? 'Nothing ticked — leave it to dispense' : undefined}
            >
              <i className="fa-solid fa-check" aria-hidden="true" />
              {missing.length ? `Mark partly dispensed (${given.size}/${rx.medicines.length})` : 'Mark dispensed'}
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg bg-mg-surface p-3">
          <p className="text-xs text-slate-600">
            {status?.label} by <strong className="font-medium text-slate-800">{p.dispensedByName || 'pharmacy'}</strong> at {dayTime(p.dispensedAt)}
            {p.note && <span className="block text-slate-500 mt-0.5">Note: {p.note}</span>}
          </p>
          <Button variant="secondary" size="sm" onClick={() => submit(PHARMACY_STATUS.PENDING)} loading={busy}>
            <i className="fa-solid fa-rotate-left" aria-hidden="true" /> Undo
          </Button>
        </div>
      )}
    </DeskCard>
  );
}
