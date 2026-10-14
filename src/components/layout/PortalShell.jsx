import { Outlet } from 'react-router-dom';
import { GlassHeader } from './GlassHeader.jsx';
import { PatientHeader } from './PatientHeader.jsx';
import { BottomDock, TopTabs } from './BottomDock.jsx';
import { DeskHeader, DeskDock } from '../desk/DeskChrome.jsx';

// One shell for every role; the nav items differ, the chrome does not — except
// the patient portal, which follows the public Mediigo homepage design.
export function PortalShell({ items, subtitle, headerRight, maxWidth = 'max-w-7xl', variant }) {
  if (variant === 'patient') {
    return (
      <div className="min-h-screen flex flex-col bg-white font-display">
        <PatientHeader items={items} />
        <main className="flex-1 w-full mx-auto px-4 py-8 pb-28 md:pb-12 max-w-6xl">
          <Outlet />
        </main>
        <BottomDock items={items} brand />
      </div>
    );
  }

  // Doctor and front desk: the "OPD Desk", in the patient portal's design so
  // the product reads as one system. The brand theme makes the shared Button,
  // Field and Modal primitives follow it too.
  if (variant === 'desk') {
    return (
        <div className="min-h-screen flex flex-col bg-[#F7F9FC] font-display">
          <DeskHeader items={items} badge={subtitle} />
          <main className={`flex-1 w-full mx-auto px-4 sm:px-6 py-5 sm:py-6 pb-28 md:pb-10 ${maxWidth}`}>
            <Outlet />
          </main>
          {items?.length > 0 && <DeskDock items={items} />}
        </div>
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
