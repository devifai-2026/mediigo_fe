import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { inr, phone, token } from '../../lib/format.js';
import { patientLine } from './deskFormat.js';

/** mm:ss since `since`, ticking once a second; h:mm:ss past the hour. */
function useElapsed(since) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!since) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [since]);
  if (!since) return null;
  const total = Math.max(0, Math.floor((now - new Date(since).getTime()) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

function PanelButton({ icon, children, tone = 'glass', className, ...rest }) {
  return (
    <button
      type="button"
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-lg text-[13px] font-medium transition-all',
        'active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
        tone === 'green' && 'bg-mg-teal hover:bg-mg-tealDark text-white shadow-lg shadow-black/15',
        tone === 'greenDark' && 'bg-emerald-600/90 hover:bg-emerald-600 text-white',
        tone === 'outline' && 'bg-mg-mint/10 hover:bg-mg-mint/20 text-mg-mint border border-mg-mint/40',
        tone === 'glass' && 'bg-white/10 hover:bg-white/[0.16] text-white border border-white/10',
        className,
      )}
      {...rest}
    >
      {icon && <i className={clsx('fa-solid', icon)} aria-hidden="true" />}
      {children}
    </button>
  );
}

/**
 * The live chamber: who is with the doctor, and every action on them.
 *
 * Shared by the doctor's chamber and the front desk. The desk passes no
 * `onWriteRx`, since only the doctor prescribes.
 */
export function ChamberHero({
  snapshot: s, current, hasCalled, busy,
  onCallNext, onRecall, onComplete, onSkip, onOutcome, onWriteRx,
  footer,
}) {
  const elapsed = useElapsed(current?.enteredChamberAt);
  const nextUp = s?.tokens?.find((t) => t.status === 'WAITING');
  const onBreak = Boolean(s?.session?.isOnBreak);
  const noOne = !current;

  const sessionLabel = onBreak
    ? `Session paused — ${s.session.breakReason || 'on break'}`
    : s?.session?.isBookingOpen ? 'Live OPD session active' : 'Bookings closed';

  return (
    <section className="relative overflow-hidden rounded-xl bg-hero-desk text-white shadow-lg shadow-blue-950/10">
      <i aria-hidden="true" className="fa-solid fa-stethoscope pointer-events-none absolute -left-6 -bottom-10 text-[200px] text-white/[0.05]" />

      <div className="relative z-10 grid lg:grid-cols-[1fr_minmax(0,460px)] gap-6 lg:gap-10 p-5 sm:p-6 lg:p-6 lg:pl-6 items-center">
        <div className="min-w-0 lg:pl-0 py-1 lg:py-6">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              {!onBreak && <span className="animate-ping absolute h-full w-full rounded-full bg-mg-mint opacity-60" />}
              <span className={clsx('relative rounded-full h-3 w-3', onBreak ? 'bg-amber-400' : 'bg-mg-mint')} />
            </span>
            <span className={clsx('text-xs font-medium tracking-[0.14em] uppercase', onBreak ? 'text-amber-300' : 'text-mg-mint')}>
              {sessionLabel}
            </span>
          </div>

          <div className="flex items-end gap-4 sm:gap-5 mt-3">
            <span className="text-[11px] sm:text-xs font-medium uppercase tracking-wide text-white/75 pb-3 sm:pb-4">
              {current ? 'Now consulting:' : hasCalled ? 'Last seen:' : 'Next up:'}
            </span>
            <h2 className={clsx(
              'text-6xl sm:text-7xl font-bold tracking-tight leading-none',
              current ? 'text-mg-mint' : 'text-white/40',
            )}>
              {token(current ? current.tokenNumber : (s?.currentToken || nextUp?.tokenNumber || 0))}
            </h2>
            {!current && hasCalled && (
              <span className="mb-3 text-[11px] font-medium uppercase tracking-wider text-mg-mint">
                <i className="fa-solid fa-check mr-1" aria-hidden="true" />Done
              </span>
            )}
          </div>

          {current ? (
            <div className="mt-4">
              <p className="text-2xl sm:text-[28px] font-semibold leading-tight truncate">{current.name}</p>
              <p className="text-[13px] text-white/80 mt-1">
                {[
                  patientLine(current),
                  current.phone && `+91 ${phone(current.phone)}`,
                  `${(current.visitType || 'fresh').toUpperCase()} Visit${current.fee != null ? ` (${inr(current.fee)})` : ''}`,
                ].filter(Boolean).join(' • ')}
              </p>
              <p className="text-[13px] text-teal-100 mt-1.5 flex items-center gap-1.5">
                <i className="fa-solid fa-notes-medical text-xs" aria-hidden="true" />
                Disease/Symptoms: {current.complaint || <span className="text-white/50">Not stated</span>}
              </p>
              {current.conditions?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {current.conditions.map((c) => (
                    <span key={c} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-200 border border-amber-300/30">
                      {c}
                    </span>
                  ))}
                </div>
              )}
              {current.isEmergency && (
                <span className="inline-flex mt-2.5 items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-full bg-rose-500 text-white">
                  <i className="fa-solid fa-truck-medical" aria-hidden="true" /> Emergency
                </span>
              )}
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-xl font-semibold text-white/90">
                {nextUp ? `${nextUp.name} is next` : 'Chamber is free'}
              </p>
              <p className="text-[13px] text-white/60 mt-1">
                {hasCalled
                  ? (s?.counts?.waiting ? 'Consultation finished — call the next patient.' : 'Consultation finished — no one waiting.')
                  : (s?.counts?.waiting ? 'Nobody in the chamber yet — call the first patient.' : 'No patients in the queue yet.')}
              </p>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-white/15 bg-white/10 backdrop-blur-md p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 text-[13px]">
            <span className="flex items-center gap-2 text-white/70">
              <i className="fa-regular fa-clock" aria-hidden="true" /> Time in Chamber
            </span>
            <span className="font-mono font-semibold text-mg-mint tracking-wide">
              {elapsed ? `${elapsed} Mins` : '--:--'}
            </span>
          </div>

          <PanelButton
            tone="green" icon="fa-volume-high" className="w-full py-3.5 text-[15px]"
            onClick={onCallNext} disabled={busy || onBreak}
            title={onBreak ? 'End the break to resume calling' : undefined}
          >
            Call Next (Voice Announcement)
          </PanelButton>

          {onWriteRx && (
            <PanelButton tone="outline" icon="fa-file-prescription" className="w-full py-2.5" onClick={onWriteRx} disabled={noOne}>
              Write Rx / Prescription for Chamber Patient
            </PanelButton>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <PanelButton tone="greenDark" icon="fa-check-double" className="py-2.5" onClick={onComplete} disabled={noOne || busy}>
              Mark Complete
            </PanelButton>
            <PanelButton icon="fa-forward" className="py-2.5" onClick={onSkip} disabled={noOne || busy}>
              Skip Token
            </PanelButton>
            <PanelButton icon="fa-flask-vial" className="py-2.5" onClick={() => onOutcome('TESTS')} disabled={noOne || busy}>
              <span className="sm:hidden">For Test</span><span className="hidden sm:inline truncate">Proceeded for Test</span>
            </PanelButton>
            <PanelButton icon="fa-bed-pulse" className="py-2.5" onClick={() => onOutcome('ADMITTED')} disabled={noOne || busy}>
              <span className="sm:hidden">For Admit</span><span className="hidden sm:inline truncate">Proceeded for Admit</span>
            </PanelButton>
          </div>

          {/* The break card is taller than a button, so while on a break it
              takes the full row instead of squeezing in beside Re-announce. */}
          <div className={clsx('gap-2.5 pt-1', onBreak ? 'flex flex-col' : 'grid grid-cols-2')}>
            <PanelButton icon="fa-bullhorn" className="py-2.5" onClick={onRecall} disabled={noOne || busy}>
              Re-announce
            </PanelButton>
            {footer && <div className="min-w-0">{footer}</div>}
          </div>
        </div>
      </div>
    </section>
  );
}
