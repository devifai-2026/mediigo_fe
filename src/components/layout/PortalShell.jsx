import { Outlet } from 'react-router-dom';
import { GlassHeader } from './GlassHeader.jsx';
import { PatientHeader } from './PatientHeader.jsx';
import { BottomDock, TopTabs } from './BottomDock.jsx';
import { PortalThemeProvider } from '../../context/PortalTheme.jsx';

// One shell for every role; the nav items differ, the chrome does not — except
// the patient portal, which follows the public Mediigo homepage design.
export function PortalShell({ items, subtitle, headerRight, maxWidth = 'max-w-7xl', variant }) {
  if (variant === 'patient') {
    return (
      <PortalThemeProvider value="patient">
      <div className="min-h-screen flex flex-col bg-white font-display">
        <PatientHeader items={items} />
        <main className="flex-1 w-full mx-auto px-4 py-8 pb-28 md:pb-12 max-w-6xl">
          <Outlet />
        </main>
        <BottomDock items={items} brand />
      </div>
      </PortalThemeProvider>
    );
  }

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
