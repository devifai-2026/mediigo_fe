import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { Icon } from '../ui/Icon.jsx';

export function BottomDock({ items }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200 px-4 py-2 shadow-lg md:hidden">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              clsx('flex flex-col items-center gap-1 p-1 relative transition-colors',
                isActive ? 'text-teal-600' : 'text-slate-400 hover:text-teal-600')
            }
          >
            {item.badge > 0 && (
              <span className="absolute -top-0.5 right-1 min-w-[16px] h-4 px-1 bg-amber-500 text-white text-[9px] font-extrabold rounded-full grid place-items-center">
                {item.badge}
              </span>
            )}
            <Icon name={item.icon} className="w-5 h-5" />
            <span className="text-[10px] font-bold">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

// Desktop equivalent: a horizontal tab strip under the header.
export function TopTabs({ items }) {
  return (
    <div className="hidden md:block border-b border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              clsx('px-4 py-3 text-xs font-bold border-b-2 transition-colors inline-flex items-center gap-2',
                isActive ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-900')
            }
          >
            <Icon name={item.icon} className="w-4 h-4" />
            {item.label}
            {item.badge > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 bg-amber-500 text-white text-[10px] font-extrabold rounded-full grid place-items-center">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
