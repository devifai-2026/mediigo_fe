import { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useConfirm } from '../../context/ConfirmContext.jsx';
import { inr } from '../../lib/format.js';
import { get as lsGet, set as lsSet } from '../../lib/storage.js';

/**
 * Super Admin console shell, in the patient portal's design: the white brand
 * bar, and the portal's blue carried into the sidebar the way the patient and
 * desk portals carry it in their tab strip.
 */

const NAV_BASE = 'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-xs transition min-w-0';
const NAV_ACTIVE = `${NAV_BASE} bg-white text-mg-blue shadow-sm`;
const NAV_IDLE = `${NAV_BASE} text-white/75 hover:text-white hover:bg-white/10`;

const CORE = [
  { to: '/super', end: true, icon: 'fa-chart-line', label: 'Global Analytics' },
  { to: '/super/live', icon: 'fa-tower-broadcast', label: 'Live OPD Monitor', badge: 'liveWaiting' },
  { to: '/super/patients', icon: 'fa-hospital-user', label: 'Patients Master', badge: 'patientsToday' },
  { to: '/super/attendance', icon: 'fa-chart-simple', label: 'OPD Attendance' },
  { to: '/super/clinics', icon: 'fa-hospital', label: 'Clinics Master', badge: 'clinics' },
  { to: '/super/specialties', icon: 'fa-stethoscope', label: 'Specialties' },
  { to: '/super/billing', icon: 'fa-indian-rupee-sign', label: 'Billing' },
  { to: '/super/reviews', icon: 'fa-star', label: 'Reviews' },
  { to: '/super/agents', icon: 'fa-users-gear', label: 'Field Agents', badge: 'agents' },
  { to: '/super/executives', icon: 'fa-user-tie', label: 'Executive Managers' },
  { to: '/super/staff', icon: 'fa-id-badge', label: 'Staff Administration' },
  { to: '/super/approvals', icon: 'fa-check-double', label: 'Master Approvals', badge: 'pending' },
];

const AUDITS = [
  { to: '/super/financials', icon: 'fa-vault', label: 'Financial Audit' },
  { to: '/super/complaints', icon: 'fa-triangle-exclamation', label: 'Issue Tracker', badge: 'unreadTickets' },
  { to: '/super/security', icon: 'fa-shield-halved', label: 'Security & Messaging' },
];

const BADGE_CLASS = {
  patientsToday: 'bg-mg-mint/25 text-white',
  liveWaiting: 'bg-mg-mint/25 text-white',
  clinics: 'bg-white/15 text-white',
  agents: 'bg-white/15 text-white',
  pending: 'bg-amber-400 text-amber-950',
  unreadTickets: 'bg-rose-500 text-white',
};

// Badges that signal something needing attention: shown only when non-zero,
// so a quiet day does not read as an alarm.
const ALERT_BADGES = new Set(['pending', 'unreadTickets']);

function NavItem({ item, badges, collapsed }) {
  const value = item.badge ? badges?.[item.badge] : null;
  const badgeText = item.badge === 'patientsToday' ? `${value ?? 0} Today`
    : item.badge === 'liveWaiting' ? `${value ?? 0} waiting` : String(value ?? 0);

  return (
    <NavLink
      to={item.to}
      end={item.end}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) => clsx(isActive ? NAV_ACTIVE : NAV_IDLE, collapsed && 'justify-center px-0')}
    >
      {({ isActive }) => (
      <>
      <span className="relative shrink-0">
        <i className={`fa-solid ${item.icon} text-base min-w-[20px] text-center`} />
        {/* Collapsed, the badge rides the icon as a dot so the count is still visible. */}
        {collapsed && item.badge && value > 0 && (
          <span className={clsx(
            'absolute -top-1.5 -right-1.5 min-w-[15px] h-[15px] px-1 rounded-full text-[10px] font-semibold grid place-items-center',
            BADGE_CLASS[item.badge],
          )}>
            {value}
          </span>
        )}
      </span>

      {!collapsed && (
        <>
          {/* truncate + min-w-0 keeps a long label on one line; shrink-0 stops
              the badge being squeezed into a two-line pill. */}
          <span className="flex-1 min-w-0 truncate">{item.label}</span>
          {item.badge && !(ALERT_BADGES.has(item.badge) && !value) && (
            <span className={clsx(
              'shrink-0 whitespace-nowrap font-medium px-2 py-0.5 rounded-full text-[10px]',
              isActive && !ALERT_BADGES.has(item.badge) ? 'bg-blue-50 text-mg-blue' : BADGE_CLASS[item.badge],
            )}>
              {badgeText}
            </span>
          )}
        </>
      )}
      </>
      )}
    </NavLink>
  );
}

export function AdminShell({ badges, headerStats, onAddClinic }) {
  const { user, logout } = useAuth();
  const confirm = useConfirm();
  // Remembered per browser so the console opens the way you left it.
  const [collapsed, setCollapsed] = useState(() => lsGet('admin:sidebarCollapsed', false));

  useEffect(() => { lsSet('admin:sidebarCollapsed', collapsed); }, [collapsed]);

  const signOut = async () => {
    const ok = await confirm({
      title: 'Log out of HQ?',
      message: 'You will be signed out of the Super Admin console on this device.',
      confirmLabel: 'Log out',
    });
    if (ok) logout();
  };

  return (
    <div className="h-screen flex flex-col bg-[#F7F9FC] text-slate-800 antialiased font-display">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="px-4 lg:px-6 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <img src="/logo-mark.png" alt="" className="w-9 h-auto" />
            <div className="min-w-0 leading-none">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-mg-navy tracking-tight">Mediigo</span>
                <span className="hidden sm:inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full bg-teal-50 text-mg-teal border border-teal-200">
                  Super Admin HQ
                </span>
              </div>
              <span className="block text-[10px] text-slate-600 mt-0.5 truncate">Cross-platform governance &amp; network analytics</span>
            </div>
          </div>

          <div className="hidden xl:flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Network live sync
            </span>
            <div className="px-3 py-1 rounded-lg bg-mg-surface text-right">
              <p className="text-[10px] uppercase text-slate-500">Total network cash</p>
              <p className="font-semibold text-mg-blue text-sm leading-tight">{inr(headerStats?.totalRevenue ?? 0)}</p>
            </div>
            <div className="px-3 py-1 rounded-lg bg-mg-surface text-right">
              <p className="text-[10px] uppercase text-slate-500">Online clinics</p>
              <p className="font-semibold text-mg-teal text-sm leading-tight">
                {headerStats?.online ?? 0} / {headerStats?.approved ?? 0}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onAddClinic}
              className="bg-mg-teal hover:bg-mg-tealDark text-white font-medium text-xs px-3.5 py-2 rounded-lg transition flex items-center gap-2"
            >
              <i className="fa-solid fa-plus text-xs" aria-hidden="true" />
              <span className="hidden sm:inline">Add Clinic</span>
            </button>
            <div className="h-8 w-px bg-slate-200" />
            <div className="hidden sm:block text-right">
              <p className="text-xs font-semibold text-slate-900 leading-tight">{user?.name || 'Super Administrator'}</p>
              <p className="text-[10px] font-medium text-mg-teal">Global system control</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-mg-teal text-white grid place-items-center text-xs font-semibold ring-2 ring-white shadow">
              SA
            </div>
            <button
              type="button"
              onClick={signOut}
              title="Log out"
              aria-label="Log out"
              className="w-9 h-9 grid place-items-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
            >
              <i className="fa-solid fa-arrow-right-from-bracket text-sm" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside
          className={clsx(
            'bg-mg-blue flex flex-col justify-between shrink-0 transition-[width] duration-300',
            collapsed ? 'w-[68px]' : 'w-[68px] lg:w-64',
          )}
        >
          <nav className="p-3 space-y-1 custom-scrollbar overflow-y-auto overflow-x-hidden">
            {!collapsed && (
              <p className="hidden lg:block text-[10px] font-medium text-white/55 uppercase tracking-wider px-3 my-2">Core command</p>
            )}
            {collapsed && <div className="h-2" />}
            {CORE.map((item) => <NavItem key={item.to} item={item} badges={badges} collapsed={collapsed} />)}

            {!collapsed ? (
              <p className="hidden lg:block text-[10px] font-medium text-white/55 uppercase tracking-wider px-3 pt-4 pb-1">Audits &amp; health</p>
            ) : (
              <div className="my-2 mx-2 border-t border-white/15" />
            )}
            {AUDITS.map((item) => <NavItem key={item.to} item={item} badges={badges} collapsed={collapsed} />)}
          </nav>

          <div className="p-3 border-t border-white/15 space-y-2">
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className={clsx(
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium',
                'text-white/75 hover:text-white hover:bg-white/10 transition',
                collapsed && 'justify-center px-0',
              )}
            >
              <i className={clsx('fa-solid text-base min-w-[20px] text-center', collapsed ? 'fa-angles-right' : 'fa-angles-left')} aria-hidden="true" />
              {!collapsed && <span className="hidden lg:inline">Collapse</span>}
            </button>

            {!collapsed && (
              <div className="bg-white/10 p-3 rounded-lg text-[11px] text-white/70 space-y-1 hidden lg:block">
                <div className="flex justify-between items-center">
                  <span>System status</span>
                  <span className="font-medium text-mg-mint">Optimal</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Version</span>
                  <span className="font-mono text-white/90">v2026.10 HQ</span>
                </div>
              </div>
            )}
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-8 space-y-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
