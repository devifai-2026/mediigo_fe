import { createContext, useContext } from 'react';

/**
 * Which visual language the surrounding portal speaks. The patient portal
 * follows the public Mediigo homepage design; every staff portal keeps the
 * original console look. Shared primitives (Button, Modal, Field…) read this
 * so one component serves both without every call site passing a variant.
 */
const PortalThemeContext = createContext('default');

export const PortalThemeProvider = PortalThemeContext.Provider;
export const usePortalTheme = () => useContext(PortalThemeContext);
export const useIsBrandTheme = () => useContext(PortalThemeContext) === 'patient';
