import { useState } from 'react';
import { AdminConsoleProvider, useConsole } from '../../context/AdminConsoleContext.jsx';
import { AdminShell } from './AdminShell.jsx';
import { AddClinicModal } from './AddClinicModal.jsx';
import { AddAgentModal } from './AddAgentModal.jsx';
import { ConsoleActionsContext } from './consoleActions.js';

function Inner() {
  const { badges, headerStats, refetch } = useConsole();
  const [clinicOpen, setClinicOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);

  return (
    <ConsoleActionsContext.Provider value={{ openAddClinic: () => setClinicOpen(true), openAddAgent: () => setAgentOpen(true) }}>
      <AdminShell badges={badges} headerStats={headerStats} onAddClinic={() => setClinicOpen(true)} />
      <AddClinicModal open={clinicOpen} onClose={() => setClinicOpen(false)} onDone={refetch} />
      <AddAgentModal open={agentOpen} onClose={() => setAgentOpen(false)} onDone={refetch} />
    </ConsoleActionsContext.Provider>
  );
}

export function AdminConsoleLayout() {
  return (
    <AdminConsoleProvider>
      <Inner />
    </AdminConsoleProvider>
  );
}
