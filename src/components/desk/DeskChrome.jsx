import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSocket } from '../../context/SocketContext.jsx';
import { useConfirm } from '../../context/ConfirmContext.jsx';
import { useApi } from '../../hooks/useApi.js';
import { ROLES, ROLE_HOME } from '../../lib/constants.js';
import { RaiseTicketModal } from '../superadmin/RaiseTicketModal.jsx';
import { TrialPill } from '../layout/TrialPill.jsx';
import { Avatar } from './ui.jsx';

/**
 * OPD Desk chrome for doctors and the front desk, in the patient portal's
 * design: a white brand bar over the blue tab strip, and a docked tab bar on
 * phones.
 *
 * The line under the user's name tells a shared desk machine whose session it
 * is: a doctor sees their specialty and chamber, the desk sees the clinic.
 */
export function DeskHeader({ items, badge }) {
  const { user, role, logout } = useAuth();
  const { connected } = useSocket();
  const confirm = useConfirm();
  const [raising, setRaising] = useState(false);
  const isDoctor = role === ROLES.DOCTOR && user?.doctorId;
  const { data: doctor } = useApi(isDoctor ? `/api/doctors/${user.doctorId}` : null, { skip: !isDoctor });

  const context = isDoctor
    ? [doctor?.specialty, doctor?.chamberNumber && `Chamber ${doctor.chamberNumber}`].filter(Boolean).join(' • ')
    : role === ROLES.FIELD_AGENT
      ? ['Field Agent', user?.district?.name].filter(Boolean).join(' • ')
      : ['Front Desk', user?.clinic?.name].filter(Boolean).join(' • ');

  const endShift = async () => {
    const ok = await confirm({
      title: 'End shift session?',
      message: role === ROLES.FIELD_AGENT ? 'You will be signed out on this device.' : 'You will be signed out of the OPD desk on this device.',
      confirmLabel: 'Log out',
    });
    if (ok) logout();
  };

  return (
    <header className="sticky top-0 z-40 font-display">
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          <Link to={role ? ROLE_HOME[role] : '/'} className="flex items-center gap-2.5 min-w-0">
            <img src="/logo-mark.png" alt="" className="w-9 h-auto" />
            <div className="min-w-0 leading-none">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-mg-navy tracking-tight">Mediigo</span>
                {badge && (
                  <span className="hidden sm:inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full bg-teal-50 text-mg-teal border border-teal-200">
                    {badge}
                  </span>
                )}
              </div>
              <span className="block text-[9px] text-slate-600 mt-0.5 truncate">Smart Clinic Operations Engine</span>
            </div>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <TrialPill />
            <span
              title={connected ? 'Live updates connected' : 'Reconnecting…'}
              className={clsx(
                'hidden md:inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-full border',
                connected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200',
              )}
            >
              <span className={clsx('w-1.5 h-1.5 rounded-full', connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500')} />
              {connected ? 'Live' : 'Offline'}
            </span>
            <button
              type="button"
              onClick={() => setRaising(true)}
              title="Report an issue"
              aria-label="Report an issue"
              className="w-9 h-9 grid place-items-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            >
              <i className="fa-regular fa-circle-question text-[15px]" aria-hidden="true" />
            </button>

            {user && (
              <>
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-semibold text-slate-900 leading-tight">{user.name}</p>
                  {context && <p className="text-[10px] font-medium text-mg-teal leading-tight mt-0.5">{context}</p>}
                </div>
                <Avatar name={user.name} src={doctor?.photo?.url} className="w-9 h-9 !rounded-full ring-2 ring-white shadow" tone="teal" />
                <button
                  type="button"
                  onClick={endShift}
                  title="Log out"
                  aria-label="Log out"
                  className="w-9 h-9 grid place-items-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                >
                  <i className="fa-solid fa-arrow-right-from-bracket text-sm" aria-hidden="true" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <nav className="hidden md:block bg-mg-blue">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-8 lg:gap-12 overflow-x-auto no-scrollbar">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => clsx(
                'py-3 text-sm inline-flex items-center gap-2 border-b-2 transition-colors text-white whitespace-nowrap',
                isActive ? 'border-white font-medium' : 'border-transparent opacity-80 hover:opacity-100',
              )}
            >
              <i className={clsx('fa-solid text-[13px]', item.fa)} aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
      <RaiseTicketModal open={raising} onClose={() => setRaising(false)} />
    </header>
  );
}

/** Phones: the same tabs, docked to the bottom. */
export function DeskDock({ items }) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200 shadow-lg font-display">
      <div className="grid px-1 py-1.5" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => clsx(
              'flex flex-col items-center gap-1 py-1.5 rounded-lg transition-colors',
              isActive ? 'text-mg-blue bg-blue-50' : 'text-slate-400 hover:text-slate-700',
            )}
          >
            <i className={clsx('fa-solid text-base', item.fa)} aria-hidden="true" />
            <span className="text-[9px] font-medium whitespace-nowrap">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
