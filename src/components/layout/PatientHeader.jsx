import { useState, useEffect, useRef } from 'react';
import { Link, NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { Icon } from '../ui/Icon.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { initials } from '../../lib/format.js';
import { RaiseTicketModal } from '../superadmin/RaiseTicketModal.jsx';
import { PhotoOrFallback } from '../ui/PhotoOrFallback.jsx';

/**
 * Patient chrome from the Mediigo homepage design: a white brand bar over a
 * blue tab strip. The strip carries the primary tabs; the rest live under the
 * avatar so the bar stays as uncluttered as the design.
 */
export function PatientHeader({ items, primaryCount = 3 }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [raising, setRaising] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onClickAway = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, [menuOpen]);

  const primary = items.slice(0, primaryCount);
  const secondary = items.slice(primaryCount);

  return (
    <header className="sticky top-0 z-40 font-display">
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          <Link to="/p/explore" className="flex items-center gap-2 min-w-0">
            <img src="/logo-mark.png" alt="" className="w-9 h-auto" />
            <div className="min-w-0 leading-none">
              <span className="block text-lg font-bold text-mg-navy tracking-tight">Mediigo</span>
              <span className="block text-[9px] text-slate-600 mt-0.5">Book Doctor Easily</span>
            </div>
          </Link>

          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Account menu"
                aria-expanded={menuOpen}
                className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-white shadow bg-mg-teal text-white grid place-items-center text-xs font-bold"
              >
                <PhotoOrFallback
                  src={user.photoUrl}
                  className="w-full h-full object-cover"
                  fallback={initials(user.name)}
                />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl border border-slate-200 shadow-lg py-1.5 text-sm animate-fade-in">
                  <p className="px-4 py-2 text-xs font-semibold text-slate-800 truncate border-b border-slate-100">{user.name}</p>
                  {secondary.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-50"
                    >
                      <Icon name={item.icon} className="w-4 h-4 text-slate-400" /> {item.label}
                    </Link>
                  ))}
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); setRaising(true); }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-50"
                  >
                    <Icon name="alert" className="w-4 h-4 text-slate-400" /> Get help
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); logout(); }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-rose-600 hover:bg-rose-50"
                  >
                    <Icon name="logout" className="w-4 h-4" /> Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="text-xs font-semibold px-5 py-2 rounded-md bg-mg-teal hover:bg-mg-tealDark text-white transition"
            >
              Login
            </Link>
          )}
        </div>
      </div>

      <nav className="hidden md:block bg-mg-blue">
        <div className="max-w-6xl mx-auto px-4 flex items-center gap-14">
          {primary.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx('py-3 text-sm inline-flex items-center gap-2 border-b-2 transition-colors text-white',
                  isActive ? 'border-white font-medium' : 'border-transparent opacity-85 hover:opacity-100')
              }
            >
              <Icon name={item.icon} className="w-4 h-4" strokeWidth={1.75} />
              {item.label}
              {item.badge > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 bg-amber-500 text-white text-[10px] font-bold rounded-full grid place-items-center">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
      <RaiseTicketModal open={raising} onClose={() => setRaising(false)} />
    </header>
  );
}
