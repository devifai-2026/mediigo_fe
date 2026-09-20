import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useQueueSnapshot } from '../../hooks/useQueueSnapshot.js';
import { api } from '../../lib/api.js';
import { QueueRoster } from '../../components/queue/QueueRoster.jsx';
import { FilterPills } from '../../components/ui/FilterPills.jsx';
import { TOKEN_STATUS } from '../../lib/constants.js';

export default function DoctorQueueView() {
  const { user } = useAuth();
  const toast = useToast();
  const { snapshot, refetch } = useQueueSnapshot(user?.doctorId);
  const [filter, setFilter] = useState('ALL');

  const onAction = async (action, t) => {
    try {
      if (action === 'RESTORE') await api.post(`/api/queue/tokens/${t.tokenId}/restore`);
      else await api.post(`/api/queue/tokens/${t.tokenId}/status`, { status: action });
      refetch();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const counts = snapshot?.counts ?? {};

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-xl font-bold text-slate-900">Queue roster</h2>
        <FilterPills
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'ALL', label: 'All', count: counts.total },
            { value: TOKEN_STATUS.WAITING, label: 'Waiting', count: counts.waiting },
            { value: TOKEN_STATUS.COMPLETED, label: 'Done', count: counts.completed },
            { value: TOKEN_STATUS.SKIPPED, label: 'Skipped', count: counts.skipped },
          ]}
        />
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <QueueRoster tokens={snapshot?.tokens ?? []} onAction={onAction} filter={filter} />
      </div>
    </div>
  );
}
