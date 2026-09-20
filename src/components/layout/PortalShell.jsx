import { Outlet } from 'react-router-dom';
import { GlassHeader } from './GlassHeader.jsx';
import { BottomDock, TopTabs } from './BottomDock.jsx';

// One shell for every role; the nav items differ, the chrome does not.
export function PortalShell({ items, subtitle, headerRight, maxWidth = 'max-w-7xl' }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <GlassHeader subtitle={subtitle} right={headerRight} />
      {items?.length > 0 && <TopTabs items={items} />}
      <main className={`flex-1 w-full mx-auto px-4 py-5 pb-28 md:pb-8 ${maxWidth}`}>
        <Outlet />
      </main>
      {items?.length > 0 && <BottomDock items={items} />}
    </div>
  );
}
