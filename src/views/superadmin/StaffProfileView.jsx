import { useParams, useNavigate, Link } from 'react-router-dom';
import clsx from 'clsx';
import { useApi } from '../../hooks/useApi.js';
import { api, unwrap } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useConfirm } from '../../context/ConfirmContext.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { StatusBadge } from '../../components/ui/StatusBadge.jsx';
import { SkeletonRows } from '../../components/ui/Skeleton.jsx';
import { ROLES, ROLE_LABEL } from '../../lib/constants.js';
import { phone as fmtPhone, shortDate, timeOf, initials } from '../../lib/format.js';

const ROLE_CHIP = {
  EXEC_ADMIN: 'bg-purple-50 text-purple-700 border-purple-200',
  FIELD_AGENT: 'bg-amber-50 text-amber-700 border-amber-200',
  RECEPTIONIST: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  SUPER_ADMIN: 'bg-slate-900 text-white border-slate-700',
};

// Audit actions are stored as verbs; the profile reads better as plain English.
const ACTION_LABEL = {
  HOSPITAL_APPROVED: 'Approved a clinic',
  HOSPITAL_REJECTED: 'Rejected a clinic',
  HOSPITAL_SUSPENDED: 'Suspended a clinic',
  HOSPITAL_REACTIVATED: 'Reactivated a clinic',
  HOSPITAL_DEBOARDED: 'Deboarded a clinic',
  DEBOARD_REQUESTED: 'Requested a deboard',
  DOCTOR_DEBOARDED: 'Deboarded a doctor',
  STANDEE_DEPLOYED: 'Deployed a standee',
  STANDEE_RECLAIMED: 'Reclaimed a standee',
  WALKIN_BOOKED: 'Booked a walk-in',
  TOKEN_PAID: 'Took a payment',
  TOKEN_REFUNDED: 'Issued a refund',
  USER_CREATED: 'Created a staff account',
  USER_DEACTIVATED: 'Deactivated a staff account',
  WA_SETTINGS_UPDATED: 'Updated WhatsApp settings',
  SECURITY_POLICY_UPDATED: 'Updated the security policy',
};

const Stat = ({ label, value, tone = 'text-slate-900' }) => (
  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
    <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-bold">{label}</span>
    <span className={clsx('text-base font-black', tone)}>{value}</span>
  </div>
);

const Section = ({ title, children, empty }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-3">{title}</p>
    {empty ? <p className="text-xs text-slate-400 italic">{empty}</p> : children}
  </div>
);

export default function StaffProfileView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { data: user, loading, error, refetch } = useApi(`/api/superadmin/staff/${id}`);

  const resetPassword = async () => {
    try {
      const out = unwrap(await api.post(`/api/superadmin/staff/${id}/password`, { viaWhatsapp: false }));
      toast.success(`New temporary password for ${user.name}: ${out.temporaryPassword}`);
    } catch (e) {
      toast.error(e.message);
    }
  };

  const reactivate = async () => {
    if (!(await confirm({
      title: 'Reactivate this account?',
      message: `${user.name} will be able to sign in again.`,
      confirmLabel: 'Reactivate',
    }))) return;
    try {
      await api.post(`/api/superadmin/staff/${id}/reactivate`, {});
      toast.success(`${user.name} reactivated`);
      refetch();
    } catch (e) {
      toast.error(e.message);
    }
  };

  if (loading) return <SkeletonRows rows={6} />;

  if (error || !user) {
    return (
      <section className="space-y-4">
        <Link to="/super/staff" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">
          <i className="fa-solid fa-arrow-left mr-1.5" /> Back to Staff Administration
        </Link>
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <p className="text-sm font-bold text-slate-800">This staff member could not be loaded</p>
          <p className="text-xs text-slate-500 mt-1">{error?.message || 'They may have been deleted.'}</p>
        </div>
      </section>
    );
  }

  const isExec = user.role === ROLES.EXEC_ADMIN;
  const isAgent = user.role === ROLES.FIELD_AGENT;

  return (
    <section className="space-y-5">
      <Link to="/super/staff" className="inline-block text-xs font-bold text-indigo-600 hover:text-indigo-700">
        <i className="fa-solid fa-arrow-left mr-1.5" /> Back to Staff Administration
      </Link>

      {/* ---- Identity ---- */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white grid place-items-center text-lg font-black shrink-0">
            {initials(user.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">{user.name}</h1>
              <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded border uppercase', ROLE_CHIP[user.role])}>
                {ROLE_LABEL[user.role]}
              </span>
              <span className={clsx(
                'px-2.5 py-1 rounded-full text-[10px] font-bold',
                user.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600',
              )}>
                {user.isActive ? 'ACTIVE' : 'DEACTIVATED'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-1">{fmtPhone(user.phone)}</p>
            {user.email && <p className="text-[11px] text-slate-400">{user.email}</p>}
            <p className="text-[11px] text-slate-500 mt-1">
              {user.districtName
                ? <>{user.districtName}{user.districtCode ? ` (${user.districtCode})` : ''} district</>
                : <span className="italic text-slate-400">No district assigned</span>}
              {user.hospitalName && <> · {user.hospitalName}</>}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button variant="secondary" onClick={resetPassword}>
              <i className="fa-solid fa-key" /> Reset password
            </Button>
            {user.isActive ? (
              <Button variant="secondary" onClick={() => navigate('/super/staff')}>
                <i className="fa-solid fa-pen" /> Manage
              </Button>
            ) : (
              <Button onClick={reactivate}>
                <i className="fa-solid fa-user-check" /> Reactivate
              </Button>
            )}
          </div>
        </div>

        {user.deactivation && (
          <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
            <span className="font-bold">Deactivated</span>
            {user.deactivation.at && <> on {shortDate(user.deactivation.at)}</>}
            {user.deactivation.byName && <> by {user.deactivation.byName}</>}
            {user.deactivation.reason && <> — “{user.deactivation.reason}”</>}
          </div>
        )}
      </div>

      {/* ---- Workload ---- */}
      {isExec && user.load && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <Stat label="Clinics" value={user.load.hospitals} tone="text-indigo-600" />
          <Stat label="Doctors" value={user.load.doctors} />
          <Stat label="Field agents" value={user.load.agents} />
          <Stat label="Pending approvals" value={user.load.pendingSubmissions} tone="text-amber-600" />
        </div>
      )}

      {isAgent && user.load && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <Stat label="Submissions" value={user.load.submissions} tone="text-indigo-600" />
          <Stat label="Pending" value={user.load.pendingSubmissions} tone="text-amber-600" />
          <Stat label="Approved" value={user.load.approved} tone="text-emerald-600" />
          <Stat label="Rejected" value={user.load.rejected} tone="text-rose-600" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ---- Role-specific detail ---- */}
        {isExec && (
          <Section
            title={`Clinics in ${user.districtName || 'their district'}`}
            empty={!user.clinics?.length ? 'No clinics in this district yet.' : null}
          >
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {(user.clinics || []).map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-slate-100 bg-slate-50">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{c.name}</p>
                    {c.code && <p className="text-[10px] text-slate-400 font-mono">{c.code}</p>}
                  </div>
                  <StatusBadge status={c.networkState} />
                </div>
              ))}
            </div>
          </Section>
        )}

        {isExec && (
          <Section title="Field agents reporting in" empty={!user.agents?.length ? 'No agents in this district.' : null}>
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {(user.agents || []).map((a) => (
                <Link
                  key={a.id}
                  to={`/super/staff/${a.id}`}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-indigo-200 transition"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{a.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{fmtPhone(a.phone)}</p>
                  </div>
                  <span className={clsx(
                    'text-[10px] font-bold px-2 py-0.5 rounded-full',
                    a.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600',
                  )}>
                    {a.isActive ? 'ACTIVE' : 'OFF'}
                  </span>
                </Link>
              ))}
            </div>
          </Section>
        )}

        {isAgent && (
          <Section title="Clinics onboarded" empty={!user.submissions?.length ? 'No submissions filed yet.' : null}>
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {(user.submissions || []).map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-slate-100 bg-slate-50">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{s.clinicName}</p>
                    <p className="text-[10px] text-slate-400">{shortDate(s.at)}</p>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ---- Account ---- */}
        <Section title="Account">
          <dl className="space-y-2 text-xs">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-400 font-semibold">Created</dt>
              <dd className="text-slate-700 font-medium text-right">{user.createdAt ? shortDate(user.createdAt) : '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-400 font-semibold">Created by</dt>
              <dd className="text-slate-700 font-medium text-right">{user.createdByName || '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-400 font-semibold">Last signed in</dt>
              <dd className="text-slate-700 font-medium text-right">
                {user.lastLoginAt ? `${shortDate(user.lastLoginAt)}, ${timeOf(user.lastLoginAt)}` : 'Never'}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-400 font-semibold">Status</dt>
              <dd className="text-slate-700 font-medium text-right">{user.isActive ? 'Active' : 'Deactivated'}</dd>
            </div>
          </dl>
        </Section>

        {/* ---- Activity ---- */}
        <Section title="Recent activity" empty={!user.activity?.length ? 'Nothing recorded yet.' : null}>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {(user.activity || []).map((a, i) => (
              <div key={`${a.at}-${i}`} className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-700 font-medium">
                    {ACTION_LABEL[a.action] || a.action.replace(/_/g, ' ').toLowerCase()}
                  </p>
                  {a.reason && <p className="text-[10px] text-slate-400 truncate">“{a.reason}”</p>}
                </div>
                <span className="text-[10px] text-slate-400 shrink-0">{shortDate(a.at)}</span>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </section>
  );
}
