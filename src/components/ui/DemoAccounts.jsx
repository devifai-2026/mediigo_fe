import { useState } from 'react';
import clsx from 'clsx';
import { ROLE_LABEL, ROLES } from '../../lib/constants.js';
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

// Most-privileged first: whoever is demoing usually wants Super Admin, and
// hunting for it at the bottom of a scroll box is the whole problem here.
const ROLE_ORDER = [
  ROLES.SUPER_ADMIN, ROLES.EXEC_ADMIN, ROLES.FIELD_AGENT,
  ROLES.DOCTOR, ROLES.RECEPTIONIST, ROLES.PATIENT,
];

/**
 * Seeded demo logins, listed on the sign-in screen. Clicking one fills the
 * form rather than signing in outright — you still see which account you are
 * about to use.
 *
 * Grouped by role and collapsible: a flat list of fourteen accounts in a short
 * scroll box meant picking the wrong one was easy, and a mistyped or
 * misremembered number reads as "login is broken" rather than "wrong account".
 */
export function DemoAccounts({ roles, kind, onPick }) {
  const list = accountsFor(roles).filter((a) => !kind || a.kind === kind);
  const [copied, setCopied] = useState(false);
  // Which role groups are open. Everything starts collapsed except the first,
  // so the list is scannable at a glance instead of a wall of numbers.
  const [open, setOpen] = useState(null);

  if (!list.length) return null;

  const secret = kind === 'otp' ? DEMO_OTP : DEMO_PASSWORD;

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard is blocked in some embedded webviews; the value is visible
      // on screen anyway, so failing silently is better than an error toast.
    }
  };

  // Group, preserving ROLE_ORDER and dropping roles this portal does not serve.
  const groups = ROLE_ORDER
    .map((role) => ({ role, items: list.filter((a) => a.role === role) }))
    .filter((g) => g.items.length);

  const activeRole = open ?? groups[0]?.role;

  return (
    <div className="mt-6 pt-5 border-t border-slate-200">
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
          Demo accounts
        </p>
        <button
          type="button"
          onClick={copySecret}
          title={`Copy ${kind === 'otp' ? 'OTP' : 'password'}`}
          className={clsx(
            'group flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-lg border transition',
            copied
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-teal-300 hover:text-teal-700',
          )}
        >
          <span className="uppercase tracking-wide text-slate-400 group-hover:text-teal-600">
            {kind === 'otp' ? 'OTP' : 'Pass'}
          </span>
          <span className="font-mono">{secret}</span>
          <i className={clsx('fa-solid text-[9px]', copied ? 'fa-check' : 'fa-copy')} />
        </button>
      </div>

      <div className="space-y-1.5">
        {groups.map(({ role, items }) => {
          const isOpen = activeRole === role;
          return (
            <div key={role} className="rounded-xl border border-slate-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? '__none__' : role)}
                className={clsx(
                  'w-full flex items-center justify-between gap-2 px-2.5 py-2 text-left transition',
                  isOpen ? 'bg-white' : 'bg-slate-50 hover:bg-white',
                )}
              >
                <span className="flex items-center gap-1.5">
                  <span className={clsx('text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase', ROLE_CHIP[role])}>
                    {ROLE_LABEL[role]}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    {items.length} {items.length === 1 ? 'account' : 'accounts'}
                  </span>
                </span>
                <i className={clsx(
                  'fa-solid text-[10px] text-slate-400 transition-transform',
                  isOpen ? 'fa-chevron-up' : 'fa-chevron-down',
                )} />
              </button>

              {isOpen && (
                <div className="divide-y divide-slate-100 border-t border-slate-100">
                  {items.map((a) => (
                    <button
                      key={a.phone}
                      type="button"
                      onClick={() => onPick?.(a)}
                      className="w-full flex items-center justify-between gap-3 px-2.5 py-2 bg-white hover:bg-teal-50/60 transition text-left"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{a.name}</p>
                        {a.note && <p className="text-[10px] text-slate-400 truncate">{a.note}</p>}
                      </div>
                      <span className="text-xs font-mono font-bold text-teal-700 shrink-0">
                        {fmtPhone(a.phone)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-2.5 text-[10px] text-slate-400">
        Tap an account to fill the form — these are the only seeded logins, and the
        numbers are not sequential.
      </p>
    </div>
  );
}
