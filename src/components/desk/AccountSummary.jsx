import { useAuth } from '../../context/AuthContext.jsx';
import { useApi } from '../../hooks/useApi.js';
import { ROLE_LABEL } from '../../lib/constants.js';
import { phone as fmtPhone } from '../../lib/format.js';
import { Avatar, DeskCard } from './ui.jsx';

/**
 * Who is signed in: name, role, the number and email they sign in with, and
 * the clinic or district they work for. Read-only — a change of number or
 * name goes through Mediigo support, as it is also the login.
 */
export function AccountSummary({ me: given }) {
  const { user, role } = useAuth();
  // The session user lacks the clinic and district names; /me has them.
  const { data: fetched } = useApi(given ? null : '/api/auth/me', { skip: Boolean(given) });
  const who = given ?? fetched ?? user;
  if (!who) return null;
  const place = who.clinic?.name || who.district?.name || '';
  const rows = [
    ['Mobile (sign-in)', who.phone ? `+91 ${fmtPhone(who.phone)}` : '—'],
    ['Email', who.email || '—'],
    [who.clinic ? 'Clinic' : 'District', place || '—'],
  ];
  return (
    <DeskCard className="p-4 sm:p-5">
      <div className="flex items-center gap-4">
        <Avatar name={who.name} src={who.photo?.url} className="w-14 h-14 !rounded-full text-base" tone="teal" />
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-slate-900 truncate">{who.name}</h2>
          <p className="text-xs font-medium text-mg-teal">{ROLE_LABEL[who.role || role] || who.role}</p>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {rows.map(([k, v]) => (
          <div key={k} className="rounded-lg bg-mg-surface px-3 py-2.5 min-w-0">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{k}</dt>
            <dd className="mt-0.5 text-sm font-medium text-slate-800 truncate">{v}</dd>
          </div>
        ))}
      </dl>
    </DeskCard>
  );
}
