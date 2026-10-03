import { useState, useMemo } from 'react';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useConfirm } from '../../context/ConfirmContext.jsx';
import { api } from '../../lib/api.js';
import { FilterPills } from '../../components/ui/FilterPills.jsx';
import { StatusBadge } from '../../components/ui/StatusBadge.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { SkeletonRows } from '../../components/ui/Skeleton.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { token, relativeDay, inr } from '../../lib/format.js';
import { TOKEN_STATUS } from '../../lib/constants.js';
import { Icon } from '../../components/ui/Icon.jsx';
import { RescheduleBanner } from '../../components/patient/RescheduleBanner.jsx';
import { BookingPass } from '../../components/patient/BookingPass.jsx';

/**
 * The bookings list the prototype declared but never implemented — its
 * #bookings-list container had no renderer at all, and activeBooking was a
 * single object rather than a history.
 */
export default function BookingsView() {
  const { data: tokens, loading, refetch } = useApi('/api/patients/me/tokens');
  const [tab, setTab] = useState('upcoming');
  const [pass, setPass] = useState(null);
  const toast = useToast();
  const confirm = useConfirm();

  const groups = useMemo(() => {
    const all = tokens || [];
    return {
      // RESCHEDULE_NEEDED sits in Upcoming: the booking is still alive and
      // needs the patient to act, which they will not do if it is filed away.
      upcoming: all.filter((t) => [TOKEN_STATUS.WAITING, TOKEN_STATUS.IN_CHAMBER, 'RESCHEDULE_NEEDED'].includes(t.status)),
      completed: all.filter((t) => t.status === TOKEN_STATUS.COMPLETED),
      cancelled: all.filter((t) => [TOKEN_STATUS.SKIPPED, 'CANCELLED'].includes(t.status)),
    };
  }, [tokens]);

  const cancel = async (t) => {
    const okToCancel = await confirm({
      title: 'Cancel this token?',
      message: `Token ${token(t.tokenNumber)} with ${t.doctorId?.name} will be released. You will need to book again.`,
      confirmLabel: 'Cancel token',
      danger: true,
    });
    if (!okToCancel) return;
    try {
      await api.delete(`/api/queue/tokens/${t._id}`);
      toast.success('Token cancelled');
      refetch();
    } catch (e) {
      toast.error(e.message);
    }
  };

  if (loading) return <SkeletonRows rows={4} />;

  const rows = groups[tab];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mg-title">My Bookings</h2>
        <p className="text-xs text-slate-500 mt-1">Current and past OPD consultations</p>
      </div>

      <FilterPills
        value={tab}
        onChange={setTab}
        options={[
          { value: 'upcoming', label: 'Upcoming', count: groups.upcoming.length },
          { value: 'completed', label: 'Completed', count: groups.completed.length },
          { value: 'cancelled', label: 'Cancelled', count: groups.cancelled.length },
        ]}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon="ticket"
          title={`No ${tab} bookings`}
          hint={tab === 'upcoming' ? 'Book a consultation and it will appear here.' : `You have no ${tab} consultations yet.`}
          action={tab === 'upcoming' ? 'Find a doctor' : undefined}
          onAction={() => { window.location.href = '/p/explore'; }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {rows.map((t) => (
            <div key={t._id} className="mg-card p-4 space-y-3">
              {t.status === 'RESCHEDULE_NEEDED' && (
                <RescheduleBanner token={{ ...t, tokenId: t._id }} onDone={refetch} />
              )}
              <div className="flex items-center gap-4">
              <div className="w-16 h-16 mg-panel grid place-items-center shrink-0 text-center">
                <span className="block text-[9px] font-medium text-slate-600 leading-none">Token</span>
                <span className="block text-xl font-bold text-mg-navy leading-none -mt-3">{token(t.tokenNumber)}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-slate-900 text-[15px] truncate">{t.doctorId?.name}</p>
                  <StatusBadge status={t.status} />
                </div>
                <p className="text-[11px] truncate">
                  <span className="text-mg-teal">{t.doctorId?.specialty}</span>
                  <span className="text-slate-500"> · {t.hospitalId?.name}</span>
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {relativeDay(t.date)} · {t.patientSnapshot?.name}
                  {t.isPaid ? <span className="text-mg-teal font-medium"> · Paid</span> : <span className="text-amber-600 font-medium"> · Pay at desk</span>}
                </p>
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                {/* Available paid or unpaid: an unpaid pass is what gets the
                    patient past the front desk, so it has to be printable. */}
                <Button variant="secondary" size="sm" onClick={() => setPass(t)}>
                  <Icon name="doc" className="w-3.5 h-3.5" /> Pass
                </Button>
                {t.status === TOKEN_STATUS.WAITING && !t.isPaid && (
                  <Button variant="secondary" size="sm" onClick={() => cancel(t)}>Cancel</Button>
                )}
              </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <BookingPass token={pass} onDone={() => setPass(null)} />
    </div>
  );
}
