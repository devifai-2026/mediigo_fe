import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { RequireAuth, RequireRole, RedirectHome } from './components/guards/Guards.jsx';
import { PortalShell } from './components/layout/PortalShell.jsx';
import { ROLES } from './lib/constants.js';

import LoginView from './views/public/LoginView.jsx';
import NotFoundView from './views/public/NotFoundView.jsx';
import ForbiddenView from './views/public/ForbiddenView.jsx';

import ExploreView from './views/patient/ExploreView.jsx';
import TrackerView from './views/patient/TrackerView.jsx';
import BookingsView from './views/patient/BookingsView.jsx';
import VaultView from './views/patient/VaultView.jsx';
import ProfileView from './views/patient/ProfileView.jsx';

import DoctorChamberView from './views/doctor/DoctorChamberView.jsx';
import DoctorQueueView from './views/doctor/DoctorQueueView.jsx';
import DoctorProfileView from './views/doctor/DoctorProfileView.jsx';

import ReceptionQueueView from './views/reception/ReceptionQueueView.jsx';
import WalkInView from './views/reception/WalkInView.jsx';
import RevenueView from './views/reception/RevenueView.jsx';

import AgentOnboardView from './views/agent/AgentOnboardView.jsx';
import AgentSubmissionsView from './views/agent/AgentSubmissionsView.jsx';

import ExecDashboardView from './views/admin/ExecDashboardView.jsx';
import ClinicsView from './views/admin/ClinicsView.jsx';
import ApprovalsView from './views/admin/ApprovalsView.jsx';
import AuditView from './views/admin/AuditView.jsx';

import { AdminConsoleLayout } from './components/superadmin/AdminConsoleLayout.jsx';
import SuperDashboardView from './views/superadmin/SuperDashboardView.jsx';
import PatientsView from './views/superadmin/PatientsView.jsx';
import PatientsMasterView from './views/superadmin/PatientsMasterView.jsx';
import PatientProfileView from './views/superadmin/PatientProfileView.jsx';
import ClinicsMasterView from './views/superadmin/ClinicsMasterView.jsx';
import AgentsView from './views/superadmin/AgentsView.jsx';
import ExecutivesView from './views/superadmin/ExecutivesView.jsx';
import StaffView from './views/superadmin/StaffView.jsx';
import StaffProfileView from './views/superadmin/StaffProfileView.jsx';
import MasterApprovalsView from './views/superadmin/MasterApprovalsView.jsx';
import FinancialAuditView from './views/superadmin/FinancialAuditView.jsx';
import ComplaintsView from './views/superadmin/ComplaintsView.jsx';
import SecurityPolicyView from './views/superadmin/SecurityPolicyView.jsx';

import DisplayView from './views/public/DisplayView.jsx';

const PATIENT_NAV = [
  { to: '/explore', label: 'Explore', icon: 'compass' },
  { to: '/tracker', label: 'Tracker', icon: 'clock' },
  { to: '/bookings', label: 'Bookings', icon: 'ticket' },
  { to: '/vault', label: 'Vault', icon: 'shieldCheck' },
  { to: '/profile', label: 'Profile', icon: 'user' },
];

const DOCTOR_NAV = [
  { to: '/d/chamber', label: 'Chamber', icon: 'megaphone' },
  { to: '/d/queue', label: 'Queue', icon: 'list' },
  { to: '/d/profile', label: 'Settings', icon: 'settings' },
];

const RECEPTION_NAV = [
  { to: '/r/queue', label: 'Queue', icon: 'list' },
  { to: '/r/walkin', label: 'Walk-in', icon: 'plus' },
  { to: '/r/revenue', label: 'Revenue', icon: 'wallet' },
];

const AGENT_NAV = [
  { to: '/a/onboard', label: 'Onboard', icon: 'plus' },
  { to: '/a/submissions', label: 'Submissions', icon: 'doc' },
];

const ADMIN_NAV = [
  { to: '/admin', label: 'Dashboard', icon: 'revenue' },
  { to: '/admin/clinics', label: 'Clinics', icon: 'building' },
  { to: '/admin/approvals', label: 'Approvals', icon: 'check' },
  { to: '/admin/audit', label: 'Audit', icon: 'doc' },
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

      {/* Patient — /explore is browsable as a guest */}
      <Route element={<PortalShell items={PATIENT_NAV} subtitle="Patient OPD Portal" />}>
        <Route path="/explore" element={<ExploreView />} />
        <Route path="/tracker" element={<RequireAuth><TrackerView /></RequireAuth>} />
        <Route path="/bookings" element={<RequireAuth><BookingsView /></RequireAuth>} />
        <Route path="/vault" element={<RequireAuth><VaultView /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><ProfileView /></RequireAuth>} />
      </Route>

      <Route
        element={
          <RequireRole roles={[ROLES.DOCTOR]}>
            <PortalShell items={DOCTOR_NAV} subtitle="Doctor Chamber" maxWidth="max-w-6xl" />
          </RequireRole>
        }
      >
        <Route path="/d/chamber" element={<DoctorChamberView />} />
        <Route path="/d/queue" element={<DoctorQueueView />} />
        <Route path="/d/profile" element={<DoctorProfileView />} />
      </Route>

      <Route
        element={
          <RequireRole roles={[ROLES.RECEPTIONIST]}>
            <PortalShell items={RECEPTION_NAV} subtitle="Front Desk" />
          </RequireRole>
        }
      >
        <Route path="/r/queue" element={<ReceptionQueueView />} />
        <Route path="/r/walkin" element={<WalkInView />} />
        <Route path="/r/revenue" element={<RevenueView />} />
      </Route>

      <Route
        element={
          <RequireRole roles={[ROLES.FIELD_AGENT]}>
            <PortalShell items={AGENT_NAV} subtitle="Field Agent" maxWidth="max-w-4xl" />
          </RequireRole>
        }
      >
        <Route path="/a/onboard" element={<AgentOnboardView />} />
        <Route path="/a/submissions" element={<AgentSubmissionsView />} />
      </Route>

      {/* Exec Admin and Super Admin share this tree; the server enforces the
          district scope from the JWT, so the client never sends a districtId. */}
      <Route
        element={
          <RequireRole roles={[ROLES.EXEC_ADMIN, ROLES.SUPER_ADMIN]}>
            <PortalShell items={ADMIN_NAV} subtitle="District Operations" />
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
        <Route path="/super/attendance" element={<PatientsView />} />
        <Route path="/super/patients" element={<PatientsMasterView />} />
        <Route path="/super/patients/:key" element={<PatientProfileView />} />
        <Route path="/super/clinics" element={<ClinicsMasterView />} />
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
