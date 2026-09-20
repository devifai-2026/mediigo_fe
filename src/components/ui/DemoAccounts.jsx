import clsx from 'clsx';
import { ROLE_LABEL } from '../../lib/constants.js';
import { DEMO_PASSWORD, DEMO_OTP, accountsFor } from '../../lib/demoAccounts.js';
import { phone as fmtPhone } from '../../lib/format.js';

const ROLE_CHIP = {
  PATIENT: 'bg-teal-50 text-teal-700 border-teal-200',
  DOCTOR: 'bg-blue-50 text-blue-700 border-blue-200',
  RECEPTIONIST: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  FIELD_AGENT: 'bg-amber-50 text-amber-700 border-amber-200',
  EXEC_ADMIN: 'bg-purple-50 text-purple-700 border-purple-200',
  SUPER_ADMIN: 'bg-slate-900 text-white border-slate-700',
};

/**
 * Seeded demo logins, listed on the sign-in screen. Clicking one fills the
 * form rather than signing in outright — you still see which account you are
 * about to use.
 */
export function DemoAccounts({ roles, kind, onPick }) {
  const list = accountsFor(roles).filter((a) => !kind || a.kind === kind);
  if (!list.length) return null;

  return (
    <div className="mt-6 pt-5 border-t border-slate-200">
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Demo accounts</p>
        <span className="text-[10px] font-bold text-slate-400">
          {kind === 'otp' ? `OTP ${DEMO_OTP}` : DEMO_PASSWORD}
        </span>
      </div>

      <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar -mx-1 px-1">
        {list.map((a) => (
          <button
            key={a.phone}
            type="button"
            onClick={() => onPick?.(a)}
            className="w-full flex items-center justify-between gap-3 p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-teal-300 transition text-left"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-slate-800 truncate">{a.name}</span>
                <span className={clsx('text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase', ROLE_CHIP[a.role])}>
                  {ROLE_LABEL[a.role]}
                </span>
              </div>
              {a.note && <p className="text-[10px] text-slate-400 truncate">{a.note}</p>}
            </div>
            <span className="text-xs font-mono font-bold text-teal-700 shrink-0">{fmtPhone(a.phone)}</span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-slate-400">Tap an account to fill the form.</p>
    </div>
  );
}
