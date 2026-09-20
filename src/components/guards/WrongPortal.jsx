import { useAuth } from '../../context/AuthContext.jsx';
import { ACTIVE_PORTAL, portalForRole, portalUrl } from '../../lib/portals.js';
import { ROLE_HOME, ROLE_LABEL } from '../../lib/constants.js';
import { Logo } from '../ui/Icon.jsx';
import { Button } from '../ui/Button.jsx';

/**
 * Shown when someone signs in with a role this port does not serve. Rather
 * than silently misbehaving, we name the right port and link to it. The
 * session does not carry across — cookies are per-origin — so they log in
 * again on arrival, which is exactly the isolation these ports exist for.
 */
export function WrongPortal({ role }) {
  const { logout } = useAuth();
  const target = portalForRole(role);
  const href = target ? portalUrl(target, ROLE_HOME[role] ?? '/') : null;

  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-8 text-center">
        <Logo className="w-14 h-14 mx-auto mb-4" rounded="rounded-2xl" />
        <h1 className="text-xl font-black text-slate-900">Wrong portal for this account</h1>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          This window serves the <strong className="text-slate-700">{ACTIVE_PORTAL?.label}</strong>, but you signed in as a{' '}
          <strong className="text-slate-700">{ROLE_LABEL[role] ?? role}</strong>.
        </p>

        {target ? (
          <>
            <div className="mt-5 p-4 rounded-2xl bg-teal-50 border border-teal-200 text-left">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-teal-700">Open instead</p>
              <p className="text-sm font-bold text-slate-900 mt-1">{target.label}</p>
              <a href={href} className="text-xs font-mono font-bold text-teal-700 hover:underline break-all">
                localhost:{target.port}
              </a>
            </div>
            <a href={href}>
              <Button className="w-full mt-4" size="lg">Go to {target.label}</Button>
            </a>
          </>
        ) : (
          <p className="mt-5 text-xs text-rose-600">No portal is configured for this role.</p>
        )}

        <button
          type="button"
          onClick={() => logout()}
          className="mt-3 text-xs font-bold text-slate-500 hover:text-slate-800"
        >
          Sign out and use a different account
        </button>
      </div>
    </div>
  );
}
