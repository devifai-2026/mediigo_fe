import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import clsx from 'clsx';
import { api, unwrap } from '../../lib/api.js';
import { Logo, Icon } from '../../components/ui/Icon.jsx';
import { token as fmtToken } from '../../lib/format.js';

/**
 * Live queue pass for a patient with no app and no account.
 *
 * A walk-in is handed a paper slip with a QR on it; this is what that QR
 * opens. It must work on a borrowed phone, on a bad connection, with the
 * screen locked for ten minutes at a time — so it polls rather than holding
 * a socket, and every number on it is readable at arm's length across a
 * waiting room.
 */
const POLL_MS = 20000;

export default function TrackTokenView() {
  const { tokenId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setData(unwrap(await api.get(`/api/queue/track/${tokenId}`)));
      setUpdatedAt(new Date());
      setError(null);
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Could not reach the clinic');
    } finally {
      setRefreshing(false);
    }
  }, [tokenId]);

  useEffect(() => { load(); }, [load]);

  // Polling, not a socket: this tab sits forgotten in a pocket for long
  // stretches, and a dropped socket that never reconnects would quietly
  // freeze the number the patient is relying on.
  useEffect(() => {
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 grid place-items-center p-6 font-display">
        <div className="text-center max-w-xs">
          <Logo className="w-12 h-12 mx-auto" rounded="rounded-2xl" />
          <p className="mt-4 text-sm font-bold text-slate-900">{error}</p>
          <p className="mt-1 text-xs text-slate-500">Please ask at the reception desk.</p>
          <button type="button" onClick={load} className="mt-4 text-xs font-bold text-mg-teal">Try again</button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 grid place-items-center">
        <Logo className="w-12 h-12 animate-pulse" rounded="rounded-2xl" />
      </div>
    );
  }

  const done = ['COMPLETED', 'CANCELLED', 'SKIPPED'].includes(data.status);
  const inChamber = data.status === 'IN_CHAMBER';
  const total = Math.max(1, data.totalWaiting + 1);
  const progress = Math.min(100, Math.max(4, ((total - data.ahead) / total) * 100));

  return (
    <div className="min-h-screen bg-slate-50 font-display">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-md mx-auto px-5 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Logo className="w-9 h-9 shrink-0" rounded="rounded-xl" />
            <div className="min-w-0">
              <p className="text-sm font-black tracking-tight text-slate-900 leading-none">
                Medi<span className="text-teal-600">igo</span>
              </p>
              <p className="text-[8px] uppercase font-bold tracking-widest text-teal-700 mt-0.5">Live queue pass</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-teal-700 border border-teal-200 bg-teal-50 rounded-full px-2.5 py-1 shrink-0">
            <span className={clsx('mg-live-dot w-1.5 h-1.5 rounded-full bg-teal-500', refreshing && 'opacity-50')} />
            Live
          </span>
        </div>
      </header>

      <main className="max-w-md mx-auto px-5 py-6 space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest text-teal-700">Consultation OPD</p>
          <h1 className="text-lg font-bold text-slate-900 mt-1">{data.doctorName}</h1>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {data.hospitalName}
            {data.chamberNumber && ` · Chamber ${data.chamberNumber}`}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5">
          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Your queue / serial token</p>
            <p className={clsx('text-6xl font-black leading-none mt-2', done ? 'text-slate-300' : 'text-teal-600')}>
              {fmtToken(data.tokenNumber)}
            </p>
            {data.patientName && (
              <span className="inline-block mt-3 text-[11px] text-slate-600 bg-slate-100 rounded-full px-3 py-1">
                Patient: {data.patientName}
              </span>
            )}
          </div>

          {inChamber ? (
            <div className="rounded-xl bg-teal-50 border border-teal-200 p-4 text-center">
              <p className="text-sm font-black text-teal-800">It is your turn — please go in</p>
            </div>
          ) : done ? (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-center">
              <p className="text-sm font-bold text-slate-600">
                {data.status === 'COMPLETED' ? 'This consultation is complete'
                  : data.status === 'CANCELLED' ? 'This token was cancelled'
                    : 'This token was skipped — please see the desk'}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-teal-50/70 border border-teal-100 p-3 text-center">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Estimated wait</p>
                  <p className="text-xl font-black text-teal-700 mt-1">
                    {data.isOnBreak ? 'Paused' : `~ ${data.estimatedWaitMinutes} min`}
                  </p>
                  <p className="text-[9px] text-slate-400 mt-0.5">
                    {data.isOnBreak ? 'Doctor is on a break' : 'Updated live'}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-center">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Now consulting</p>
                  <p className="text-xl font-black text-amber-600 mt-1">{fmtToken(data.nowServing)}</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">Active in chamber</p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] mb-1.5">
                  <span className="text-slate-500">Queue status</span>
                  <span className="font-bold text-teal-700">
                    {data.ahead === 0 ? 'You are next' : `${data.ahead} ahead of you`}
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </>
          )}

          <button
            type="button"
            onClick={load}
            disabled={refreshing}
            className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl py-3 transition inline-flex items-center justify-center gap-2"
          >
            <Icon name="refresh" className={clsx('w-4 h-4', refreshing && 'animate-spin')} />
            {refreshing ? 'Updating…' : 'Refresh'}
          </button>
        </div>

        <div className="flex items-center justify-between text-[11px] px-1">
          <span className="text-slate-400">Need assistance?</span>
          {data.contactPhone && (
            <a href={`tel:${data.contactPhone}`} className="font-bold text-teal-700 inline-flex items-center gap-1.5">
              <Icon name="phone" className="w-3.5 h-3.5" /> Call reception
            </a>
          )}
        </div>

        <p className="text-center text-[10px] text-slate-400 pt-2">
          Keep this page open — it updates on its own
          {updatedAt && ` · last checked ${updatedAt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`}
        </p>
      </main>
    </div>
  );
}
