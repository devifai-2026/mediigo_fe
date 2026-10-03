import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { ROLE_HOME } from '../../lib/constants.js';
import { portalAllows } from '../../lib/portals.js';
import { WrongPortal } from './WrongPortal.jsx';
import { Logo } from '../ui/Icon.jsx';

// Shown while the session is restored from the refresh cookie. Without this
// gate the router would flash the login screen at an already-signed-in user.
export function AuthSplash() {
  return (
    <div className="min-h-screen grid place-items-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <Logo className="w-14 h-14 animate-pulse" rounded="rounded-2xl" />
        <p className="text-xs font-semibold text-slate-400">Loading Mediigo…</p>
      </div>
    </div>
  );
}

export function RequireAuth({ children }) {
  const { status, role } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <AuthSplash />;
  if (status !== 'authed') return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (!portalAllows(role)) return <WrongPortal role={role} />;
  return children;
}

export function RequireRole({ roles, children }) {
  const { status, role } = useAuth();
  if (status === 'loading') return <AuthSplash />;
  if (status !== 'authed') return <Navigate to="/login" replace />;
  // A role this port does not serve gets told where to go, not bounced into a
  // redirect loop against a home route that also isn't served here.
  if (!portalAllows(role)) return <WrongPortal role={role} />;
  // Send someone to their own home rather than a dead end.
  if (!roles.includes(role)) return <Navigate to={ROLE_HOME[role] || '/login'} replace />;
  return children;
}

/**
 * A route that a guest may browse, but that belongs to one role once signed in.
 *
 * /explore is the only patient route open to guests, and that is what made a
 * role switch look like a caching bug: signing out left you on /explore (still
 * valid, you were now a guest), and signing in as a doctor remounted the tree
 * onto the SAME url — which the patient shell still legitimately serves. The
 * doctor got the patient UI until a manual reload, because only a fresh boot
 * re-ran RedirectHome. Nothing was cached; the url simply never moved.
 *
 * A guest still browses freely. A signed-in user whose role does not own this
 * route is sent to their own home instead.
 */
export function PublicOrRoleHome({ roles, children }) {
  const { status, role } = useAuth();
  if (status === 'loading') return <AuthSplash />;
  if (status === 'authed' && !roles.includes(role)) {
    return <Navigate to={ROLE_HOME[role] || '/login'} replace />;
  }
  return children;
}

export function RedirectHome() {
  const { status, role } = useAuth();
  if (status === 'loading') return <AuthSplash />;
  if (status !== 'authed') return <Navigate to="/login" replace />;
  if (!portalAllows(role)) return <WrongPortal role={role} />;
  return <Navigate to={ROLE_HOME[role] || '/p/explore'} replace />;
}
