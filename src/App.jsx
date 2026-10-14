import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { RequireAuth, RequireRole, RedirectHome, PublicOrRoleHome } from './components/guards/Guards.jsx';
import { PortalShell } from './components/layout/PortalShell.jsx';
import { ROLES } from './lib/constants.js';

import LoginView from './views/public/LoginView.jsx';
import NotFoundView from './views/public/NotFoundView.jsx';
import ForbiddenView from './views/public/ForbiddenView.jsx';

import ExploreView from './views/patient/ExploreView.jsx';
import DoctorDetailView from './views/patient/DoctorDetailView.jsx';
import TrackerView from './views/patient/TrackerView.jsx';
import BookingsView from './views/patient/BookingsView.jsx';
import ProfileView from './views/patient/ProfileView.jsx';

import DoctorChamberView from './views/doctor/DoctorChamberView.jsx';
import DoctorFollowUpsView from './views/doctor/DoctorFollowUpsView.jsx';

import ReceptionQueueView from './views/reception/ReceptionQueueView.jsx';
import WalkInView from './views/reception/WalkInView.jsx';

import RxView from './views/desk/RxView.jsx';
import RosterView from './views/desk/RosterView.jsx';
import AnalyticsView from './views/desk/AnalyticsView.jsx';
import DeskProfileView from './views/desk/DeskProfileView.jsx';

import AgentOnboardView from './views/agent/AgentOnboardView.jsx';
import AgentSubmissionsView from './views/agent/AgentSubmissionsView.jsx';
import AgentFollowUpsView from './views/agent/AgentFollowUpsView.jsx';
import AgentPerformanceView from './views/agent/AgentPerformanceView.jsx';

import ExecDashboardView from './views/admin/ExecDashboardView.jsx';
import ClinicsView from './views/admin/ClinicsView.jsx';
import ApprovalsView from './views/admin/ApprovalsView.jsx';
import AuditView from './views/admin/AuditView.jsx';

import { AdminConsoleLayout } from './components/superadmin/AdminConsoleLayout.jsx';
import SuperDashboardView from './views/superadmin/SuperDashboardView.jsx';
import LiveMonitorView from './views/superadmin/LiveMonitorView.jsx';
import PatientsView from './views/superadmin/PatientsView.jsx';
import PatientsMasterView from './views/superadmin/PatientsMasterView.jsx';
import PatientProfileView from './views/superadmin/PatientProfileView.jsx';
import ClinicsMasterView from './views/superadmin/ClinicsMasterView.jsx';
import SpecialtiesView from './views/superadmin/SpecialtiesView.jsx';
import BillingView from './views/superadmin/BillingView.jsx';
import ReviewsView from './views/superadmin/ReviewsView.jsx';
import AgentsView from './views/superadmin/AgentsView.jsx';
import ExecutivesView from './views/superadmin/ExecutivesView.jsx';
import StaffView from './views/superadmin/StaffView.jsx';
import StaffProfileView from './views/superadmin/StaffProfileView.jsx';
import MasterApprovalsView from './views/superadmin/MasterApprovalsView.jsx';
import FinancialAuditView from './views/superadmin/FinancialAuditView.jsx';
import ComplaintsView from './views/superadmin/ComplaintsView.jsx';
import SecurityPolicyView from './views/superadmin/SecurityPolicyView.jsx';

import DisplayView from './views/public/DisplayView.jsx';
import TrackTokenView from './views/public/TrackTokenView.jsx';

const PATIENT_NAV = [
  { to: '/p/explore', label: 'Explore', icon: 'compass' },
  { to: '/p/tracker', label: 'Tracker', icon: 'clock' },
  { to: '/p/bookings', label: 'Bookings', icon: 'ticket' },
  { to: '/p/profile', label: 'Profile', icon: 'user' },
];

// The patient portal used to live at the bare root while every other role was
// already namespaced (/d, /r, /a). These keep old links, bookmarks and anything
// already shared working after the move to /p.
const PATIENT_LEGACY = ['explore', 'tracker', 'bookings', 'profile'];

// The OPD Desk: the same six tabs for doctors and the front desk. What each
// role may DO on a tab is still decided by the server. `fa` is the
// FontAwesome glyph the desk navigation uses.
const deskNav = (base) => [
  { to: `${base}/${base === '/d' ? 'chamber' : 'queue'}`, label: 'Queue', icon: 'list', fa: 'fa-list-check' },
  { to: `${base}/rx`, label: 'Rx / EMR', icon: 'doc', fa: 'fa-file-prescription' },
  { to: `${base}/walkin`, label: 'Walk-In', icon: 'plus', fa: 'fa-user-plus' },
  { to: `${base}/roster`, label: 'Roster', icon: 'clock', fa: 'fa-calendar-days' },
  { to: `${base}/analytics`, label: 'Analytics', icon: 'revenue', fa: 'fa-chart-line' },
  { to: `${base}/profile`, label: 'Profile', icon: 'user', fa: 'fa-user-doctor' },
];
const DOCTOR_NAV = deskNav('/d');
const RECEPTION_NAV = deskNav('/r');

const AGENT_NAV = [
  { to: '/a/followups', label: 'Follow-ups', icon: 'clock', fa: 'fa-route' },
  { to: '/a/onboard', label: 'Onboard', icon: 'plus', fa: 'fa-hospital' },
  { to: '/a/submissions', label: 'Approvals', icon: 'doc', fa: 'fa-clipboard-check' },
  { to: '/a/performance', label: 'Performance', icon: 'revenue', fa: 'fa-chart-line' },
];

const ADMIN_NAV = [
  { to: '/admin', label: 'Dashboard', icon: 'revenue', fa: 'fa-chart-line' },
  { to: '/admin/clinics', label: 'Clinics', icon: 'building', fa: 'fa-hospital' },
  { to: '/admin/approvals', label: 'Approvals', icon: 'check', fa: 'fa-clipboard-check' },
  { to: '/admin/audit', label: 'Audit', icon: 'doc', fa: 'fa-list-check' },
];

export default function App() {
  const { user } = useAuth();

  /**
   * Remount the whole routed tree when the signed-in identity changes.
   *
   * Without this React reconciles by position: the district-admin and
   * super-admin trees share PortalShell-shaped layouts, so signing out and
   * back in as a different role REUSED the same component instances, and with
   * them the data useApi had already fetched for the previous user. The new
   * role saw the old role's dashboard until a manual reload tore everything
   * down. Keying on the user id forces a genuine unmount/remount, which is the
   * same teardown a reload gives — without the reload.
   */
  const identity = user?._id ?? user?.id ?? 'guest';

  return (
    <Routes key={identity}>
      <Route path="/" element={<RedirectHome />} />
      <Route path="/login" element={<LoginView />} />
      <Route path="/403" element={<ForbiddenView />} />
      {/* Unauthed by design: a waiting-room screen cannot hold an expiring
          session, so it authenticates with a signed standee credential. */}
      <Route path="/display/:serialId" element={<DisplayView />} />
      {/* A walk-in's paper slip carries this link: no app, no login, just
          their own token's live position. */}
      <Route path="/t/:tokenId" element={<TrackTokenView />} />

      {/* Patient — /p/explore is browsable as a guest.
          PublicOrRoleHome is what stops a doctor who signed in while sitting on
          /p/explore from being served the patient shell: the route is public,
          so nothing else would move them off it. */}
      <Route
        element={(
          <PublicOrRoleHome roles={[ROLES.PATIENT]}>
            <PortalShell items={PATIENT_NAV} subtitle="Patient OPD Portal" variant="patient" />
          </PublicOrRoleHome>
        )}
      >
        <Route path="/p/explore" element={<ExploreView />} />
        {/* Public like Explore: a profile is worth reading before signing in. */}
        <Route path="/p/doctors/:doctorId" element={<DoctorDetailView />} />
        <Route path="/p/tracker" element={<RequireAuth><TrackerView /></RequireAuth>} />
        <Route path="/p/bookings" element={<RequireAuth><BookingsView /></RequireAuth>} />
        <Route path="/p/profile" element={<RequireAuth><ProfileView /></RequireAuth>} />
      </Route>

      {/* Old bare-root patient urls, preserved as redirects. */}
      {PATIENT_LEGACY.map((seg) => (
        <Route key={seg} path={`/${seg}`} element={<Navigate to={`/p/${seg}`} replace />} />
      ))}

      <Route
        element={
          <RequireRole roles={[ROLES.DOCTOR]}>
            <PortalShell items={DOCTOR_NAV} subtitle="OPD Desk" variant="desk" />
          </RequireRole>
        }
      >
        <Route path="/d/chamber" element={<DoctorChamberView />} />
        <Route path="/d/rx" element={<RxView />} />
        <Route path="/d/walkin" element={<WalkInView />} />
        <Route path="/d/roster" element={<RosterView />} />
        <Route path="/d/analytics" element={<AnalyticsView />} />
        <Route path="/d/profile" element={<DeskProfileView />} />
        <Route path="/d/followups" element={<DoctorFollowUpsView />} />
        {/* The old roster page; the queue tab carries the full roster now. */}
        <Route path="/d/queue" element={<Navigate to="/d/chamber" replace />} />
      </Route>

      <Route
        element={
          <RequireRole roles={[ROLES.RECEPTIONIST]}>
            <PortalShell items={RECEPTION_NAV} subtitle="Front Desk" variant="desk" />
          </RequireRole>
        }
      >
        <Route path="/r/queue" element={<ReceptionQueueView />} />
        <Route path="/r/rx" element={<RxView />} />
        <Route path="/r/walkin" element={<WalkInView />} />
        <Route path="/r/roster" element={<RosterView />} />
        <Route path="/r/analytics" element={<AnalyticsView />} />
        <Route path="/r/profile" element={<DeskProfileView />} />
        {/* Revenue was renamed Analytics; keep old links working. */}
        <Route path="/r/revenue" element={<Navigate to="/r/analytics" replace />} />
      </Route>

      <Route
        element={
          <RequireRole roles={[ROLES.FIELD_AGENT]}>
            <PortalShell items={AGENT_NAV} subtitle="Field Agent" variant="desk" />
          </RequireRole>
        }
      >
        <Route path="/a/followups" element={<AgentFollowUpsView />} />
        <Route path="/a/onboard" element={<AgentOnboardView />} />
        <Route path="/a/performance" element={<AgentPerformanceView />} />
        <Route path="/a/submissions" element={<AgentSubmissionsView />} />
      </Route>

      {/* Exec Admin and Super Admin share this tree; the server enforces the
          district scope from the JWT, so the client never sends a districtId. */}
      <Route
        element={
          <RequireRole roles={[ROLES.EXEC_ADMIN, ROLES.SUPER_ADMIN]}>
            <PortalShell items={ADMIN_NAV} subtitle="District Operations" variant="desk" />
          </RequireRole>
        }
      >
        <Route path="/admin" element={<ExecDashboardView />} />
        <Route path="/admin/clinics" element={<ClinicsView />} />
        <Route path="/admin/approvals" element={<ApprovalsView />} />
        <Route path="/admin/audit" element={<AuditView />} />
      </Route>

      {/* Super Admin console — its own dark-sidebar shell, matching the
          Admin.html command centre rather than the portal chrome. */}
      <Route
        element={
          <RequireRole roles={[ROLES.SUPER_ADMIN]}>
            <AdminConsoleLayout />
          </RequireRole>
        }
      >
        <Route path="/super" element={<SuperDashboardView />} />
        <Route path="/super/live" element={<LiveMonitorView />} />
        <Route path="/super/attendance" element={<PatientsView />} />
        <Route path="/super/patients" element={<PatientsMasterView />} />
        <Route path="/super/patients/:key" element={<PatientProfileView />} />
        <Route path="/super/clinics" element={<ClinicsMasterView />} />
        <Route path="/super/specialties" element={<SpecialtiesView />} />
        <Route path="/super/billing" element={<BillingView />} />
        <Route path="/super/reviews" element={<ReviewsView />} />
        <Route path="/super/agents" element={<AgentsView />} />
        <Route path="/super/executives" element={<ExecutivesView />} />
        <Route path="/super/staff" element={<StaffView />} />
        <Route path="/super/staff/:id" element={<StaffProfileView />} />
        <Route path="/super/approvals" element={<MasterApprovalsView />} />
        <Route path="/super/financials" element={<FinancialAuditView />} />
        <Route path="/super/complaints" element={<ComplaintsView />} />
        <Route path="/super/security" element={<SecurityPolicyView />} />
      </Route>

      <Route path="*" element={<NotFoundView />} />
    </Routes>
  );
}
