import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCountdown } from '../../hooks/useCountdown.js';
import { ROLE_HOME, ROLE_LABEL, ROLES } from '../../lib/constants.js';

/** Shown on every screen while a Super Admin is signed in as someone else. */
export function ImpersonationBanner() {
  const { impersonation, user, exitImpersonation } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const { label: left, overdue } = useCountdown(impersonation?.expiresAt ?? null);

  if (!impersonation) return null;

  const back = async () => {
    setBusy(true);
    const ok = await exitImpersonation();
    setBusy(false);
    navigate(ok ? ROLE_HOME[ROLES.SUPER_ADMIN] : '/clinic/login', { replace: true });
  };

  return (
    <div className="sticky top-0 z-[60] bg-amber-400 text-slate-900 text-xs sm:text-sm">
      <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 truncate">
          <i className="fa-solid fa-user-secret mr-1.5" />
          Viewing as <strong>{user?.name}</strong> ({ROLE_LABEL[user?.role] ?? user?.role})
          {left && !overdue ? <span className="ml-2 opacity-70">· ends in {left}</span> : null}
        </p>
        <button
          type="button"
          onClick={back}
          disabled={busy}
          className="shrink-0 h-8 px-3 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-700 disabled:opacity-60"
        >
          {busy ? 'Returning…' : 'Return to Super Admin'}
        </button>
      </div>
    </div>
  );
}
