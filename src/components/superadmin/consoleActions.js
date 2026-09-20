import { createContext, useContext } from 'react';

// Lets a section open the shell's modals without prop-drilling through Outlet.
export const ConsoleActionsContext = createContext({ openAddClinic: () => {}, openAddAgent: () => {} });
export const useConsoleActions = () => useContext(ConsoleActionsContext);
