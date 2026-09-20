import { createContext, useContext, useMemo } from 'react';
import { useApi } from '../hooks/useApi.js';

const AdminConsoleContext = createContext(null);
export const useConsole = () => useContext(AdminConsoleContext);

/**
 * Holds the single console payload plus every derived metric the eight
 * sections need. The prototype recomputed all of this inside refreshData();
 * this is the same arithmetic, memoised.
 */
export function AdminConsoleProvider({ children }) {
  const { data, loading, error, refetch } = useApi('/api/superadmin/console');
  // Unread tickets drive the sidebar badge on Issue Tracker.
  const { data: tickets, refetch: refetchTickets } = useApi('/api/tickets/summary');

  const value = useMemo(() => {
    const clinics = data?.clinics ?? [];
    const agents = data?.agents ?? [];

    const approved = clinics.filter((c) => c.status === 'Approved');
    const pending = clinics.filter((c) => c.status === 'Pending');
    const online = approved.filter((c) => c.isOnline);
    const offline = approved.filter((c) => !c.isOnline);

    const sum = (fn) => clinics.reduce((a, c) => a + Number(fn(c) || 0), 0);
    const freshTotal = sum((c) => c.cashFresh);
    const followupTotal = sum((c) => c.cashFollowup);
    const emergencyTotal = sum((c) => c.cashEmergency);
    const grandTotal = freshTotal + followupTotal + emergencyTotal;

    const patientsToday = sum((c) => c.patientsToday);
    const patientsWeek = sum((c) => c.patientsWeek);
    const patientsMonth = sum((c) => c.patientsMonth);
    const patientsTotal = sum((c) => c.patientsTotal);

    // The approvals queue counts real pending submissions, not just clinics
    // whose parent hospital is unapproved.
    const pendingApprovals = (data?.approvals ?? []).length;

    return {
      data,
      loading,
      error,
      refetch,
      clinics,
      agents,
      executives: data?.executives ?? [],
      approvals: data?.approvals ?? [],
      charts: data?.charts ?? { labels: [], onboarded: [], revenueHundreds: [], patients: [] },
      metrics: {
        totalClinics: clinics.length,
        approved: approved.length,
        pending: pending.length,
        online: online.length,
        offline: offline.length,
        onlineRatio: approved.length ? Math.round((online.length / approved.length) * 100) : 0,
        freshTotal, followupTotal, emergencyTotal, grandTotal,
        patientsToday, patientsWeek, patientsMonth, patientsTotal,
        avgPerClinic: clinics.length ? Math.round(patientsToday / clinics.length) : 0,
        pendingApprovals,
      },
      badges: {
        patientsToday,
        clinics: approved.length,
        agents: agents.length,
        pending: pendingApprovals,
        unreadTickets: tickets?.unread ?? 0,
      },
      refetchTickets,
      headerStats: { totalRevenue: grandTotal, online: online.length, approved: approved.length },
    };
  }, [data, loading, error, refetch, tickets]);

  return <AdminConsoleContext.Provider value={value}>{children}</AdminConsoleContext.Provider>;
}
