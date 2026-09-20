import { useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { Logo, Icon } from '../ui/Icon.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSocket } from '../../context/SocketContext.jsx';
import { ROLE_LABEL, ROLE_HOME } from '../../lib/constants.js';
import { initials } from '../../lib/format.js';
import { RaiseTicketModal } from '../superadmin/RaiseTicketModal.jsx';

const ROLE_CHIP = {
  PATIENT: 'bg-teal-50 text-teal-700 border-teal-200',
  DOCTOR: 'bg-blue-50 text-blue-700 border-blue-200',
  RECEPTIONIST: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  FIELD_AGENT: 'bg-amber-50 text-amber-700 border-amber-200',
  EXEC_ADMIN: 'bg-purple-50 text-purple-700 border-purple-200',
  SUPER_ADMIN: 'bg-slate-900 text-white border-slate-700',
};

export function GlassHeader({ subtitle, right }) {
  const { user, role, logout } = useAuth();
  const { connected } = useSocket();
  // Any signed-in role can escalate an issue; it lands in their district's queue.
  const [raising, setRaising] = useState(false);

  return (
    <header className="sticky top-0 z-40 glass-header shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <Link to={role ? ROLE_HOME[role] : '/explore'} className="flex items-center gap-3 min-w-0">
          <Logo className="w-10 h-10" rounded="rounded-2xl" />
          <div className="min-w-0">
            <h1 className="text-lg font-black tracking-tight text-slate-900 leading-none">
              Medi<span className="text-teal-600">igo</span>
            </h1>
            <span className="text-[9px] uppercase font-bold tracking-widest text-teal-700 block mt-0.5 truncate">
              {subtitle || (role ? ROLE_LABEL[role] : 'Healthcare Platform')}
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2 shrink-0">
          {right}

          {user && (
            <button
              type="button"
              onClick={() => setRaising(true)}
              title="Report an issue"
              className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition"
            >
              <Icon name="alert" className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Get help</span>
            </button>
          )}

          {role && role !== 'PATIENT' && (
            <span
              title={connected ? 'Live updates connected' : 'Reconnecting…'}
              className={clsx(
                'hidden sm:inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full border',
                connected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200',
              )}
            >
              <span className={clsx('w-1.5 h-1.5 rounded-full', connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500')} />
              {connected ? 'Live' : 'Offline'}
            </span>
          )}

          {user ? (
            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-800 leading-tight">{user.name}</p>
                <span className={clsx('text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase', ROLE_CHIP[role])}>
                  {ROLE_LABEL[role]}
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-teal-600 text-white grid place-items-center text-[11px] font-black">
                {initials(user.name)}
              </div>
              <button
                type="button"
                onClick={() => logout()}
                title="Log out"
                aria-label="Log out"
                className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 transition-colors"
              >
                <Icon name="logout" className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="text-xs font-bold px-4 py-2 rounded-full bg-teal-600 hover:bg-teal-700 text-white transition shadow-sm"
            >
              Login
            </Link>
          )}
        </div>
      </div>
      <RaiseTicketModal open={raising} onClose={() => setRaising(false)} />
    </header>
  );
}
