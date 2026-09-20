import { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { inr } from '../../lib/format.js';
import { get as lsGet, set as lsSet } from '../../lib/storage.js';

/**
 * Super Admin console shell — dark sidebar + global header.
 *
 * Markup and class strings are carried over verbatim from the Admin.html
 * prototype so the console looks identical; only the data binding is new.
 */

// Exact strings from the prototype's switchTab().
const NAV_BASE = 'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-xs transition min-w-0';
const NAV_ACTIVE = `${NAV_BASE} bg-indigo-600 text-white shadow-md shadow-indigo-600/20`;
const NAV_IDLE = `${NAV_BASE} text-slate-400 hover:text-white hover:bg-slate-800`;

const CORE = [
  { to: '/super', end: true, icon: 'fa-chart-line', label: 'Global Analytics' },
  { to: '/super/patients', icon: 'fa-hospital-user', label: 'Patient Attendance', badge: 'patientsToday' },
  { to: '/super/clinics', icon: 'fa-hospital', label: 'Clinics Master', badge: 'clinics' },
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
  patientsToday: 'bg-emerald-500/20 text-emerald-400',
  clinics: 'bg-slate-800 text-indigo-400',
  agents: 'bg-slate-800 text-teal-400',
  pending: 'bg-amber-500/20 text-amber-400',
  unreadTickets: 'bg-rose-500/20 text-rose-400',
};

function NavItem({ item, badges, collapsed }) {
  const value = item.badge ? badges?.[item.badge] : null;
  const badgeText = item.badge === 'patientsToday' ? `${value ?? 0} Today` : String(value ?? 0);

  return (
    <NavLink
      to={item.to}
      end={item.end}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) => clsx(isActive ? NAV_ACTIVE : NAV_IDLE, collapsed && 'justify-center px-0')}
    >
      <span className="relative shrink-0">
        <i className={`fa-solid ${item.icon} text-base min-w-[20px] text-center`} />
        {/* Collapsed, the badge rides the icon as a dot so the count is still visible. */}
        {collapsed && item.badge && value > 0 && (
          <span className={clsx(
            'absolute -top-1.5 -right-1.5 min-w-[15px] h-[15px] px-1 rounded-full text-[9px] font-bold grid place-items-center',
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
          {item.badge && (
            <span className={clsx(
              'shrink-0 whitespace-nowrap font-bold px-2 py-0.5 rounded-full text-[10px]',
              BADGE_CLASS[item.badge],
            )}>
              {badgeText}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

export function AdminShell({ badges, headerStats, onAddClinic }) {
  const { logout } = useAuth();
  // Remembered per browser so the console opens the way you left it.
  const [collapsed, setCollapsed] = useState(() => lsGet('admin:sidebarCollapsed', false));

  useEffect(() => { lsSet('admin:sidebarCollapsed', collapsed); }, [collapsed]);

  return (
    <div className="h-screen flex flex-col bg-slate-100 text-slate-800 antialiased selection:bg-indigo-500 selection:text-white">
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-lg">
        <div className="px-4 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-teal-400 text-white flex items-center justify-center font-black text-xl shadow-md shadow-indigo-500/20">
                M
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-lg tracking-tight text-white">Mediigo</span>
                  <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Super Admin HQ
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">Cross-Platform Governance &amp; Multi-Portal Analytics</p>
              </div>
            </div>
          </div>

          <div className="hidden xl:flex items-center space-x-6 text-xs">
            <div className="flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-slate-300 font-semibold">Network Live Sync</span>
            </div>
            <div className="text-right">
              <p className="text-slate-400 text-[10px] uppercase font-bold">Total Network Cash</p>
              <p className="font-black text-emerald-400 text-sm">{inr(headerStats?.totalRevenue ?? 0)}</p>
            </div>
            <div className="text-right border-l border-slate-800 pl-6">
              <p className="text-slate-400 text-[10px] uppercase font-bold">Online Clinics</p>
              <p className="font-black text-teal-300 text-sm">
                {headerStats?.online ?? 0} / {headerStats?.approved ?? 0}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onAddClinic}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-md shadow-indigo-600/30 transition flex items-center gap-2"
            >
              <i className="fa-solid fa-plus text-xs" />
              <span className="hidden sm:inline">Add Clinic</span>
            </button>
            <div className="h-8 w-[1px] bg-slate-800" />
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 text-amber-400 font-bold flex items-center justify-center text-xs">
                SA
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-white leading-tight">Super Administrator</p>
                <p className="text-[10px] text-slate-400">Global System Control</p>
              </div>
              <button
                type="button"
                onClick={() => logout()}
                title="Log out"
                className="p-2 text-slate-400 hover:text-rose-400 transition-colors"
              >
                <i className="fa-solid fa-arrow-right-from-bracket text-sm" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside
          className={clsx(
            'bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 transition-[width] duration-300',
            collapsed ? 'w-[68px]' : 'w-[68px] lg:w-64',
          )}
        >
          <nav className="p-3 space-y-1.5 custom-scrollbar overflow-y-auto overflow-x-hidden">
            {!collapsed && (
              <p className="hidden lg:block text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 my-2">Core Command</p>
            )}
            {collapsed && <div className="h-2" />}
            {CORE.map((item) => <NavItem key={item.to} item={item} badges={badges} collapsed={collapsed} />)}

            {!collapsed ? (
              <p className="hidden lg:block text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 pt-4 pb-1">Audits &amp; Health</p>
            ) : (
              <div className="my-2 mx-2 border-t border-slate-800" />
            )}
            {AUDITS.map((item) => <NavItem key={item.to} item={item} badges={badges} collapsed={collapsed} />)}
          </nav>

          <div className="p-3 border-t border-slate-800 space-y-2">
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className={clsx(
                'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold',
                'text-slate-400 hover:text-white hover:bg-slate-800 transition',
                collapsed && 'justify-center px-0',
              )}
            >
              <i className={clsx('fa-solid text-base min-w-[20px] text-center', collapsed ? 'fa-angles-right' : 'fa-angles-left')} />
              {!collapsed && <span className="hidden lg:inline">Collapse</span>}
            </button>

            {!collapsed && (
              <div className="bg-slate-800/60 p-3 rounded-xl text-[11px] text-slate-400 space-y-1 border border-slate-700/50 hidden lg:block">
                <div className="flex justify-between items-center">
                  <span>System Status:</span>
                  <span className="font-bold text-emerald-400">Optimal</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Version:</span>
                  <span className="font-mono text-slate-300">v2026.4 HQ</span>
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
