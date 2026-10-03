import { useState } from 'react';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../lib/api.js';
import { Button } from '../ui/Button.jsx';
import { Select } from '../ui/Field.jsx';
import { Icon } from '../ui/Icon.jsx';

/**
 * The QR standee on this doctor's door.
 *
 * A doctor is the one who notices their QR is pointing at the wrong chamber,
 * so they can re-point it here rather than raising a ticket and waiting for a
 * field visit. Claiming a brand-new standee is still an agent's job — this
 * only moves one that is already on the wall.
 */
export function StandeePanel({ doctorId }) {
  const { data: standees, loading, refetch } = useApi('/api/standees/mine');
  const { data: doctors } = useApi('/api/doctors');
  const [busy, setBusy] = useState(null);
  const toast = useToast();

  if (loading) return null;
  const rows = standees || [];

  const reassign = async (serialId, nextDoctorId) => {
    setBusy(serialId);
    try {
      await api.post(`/api/standees/${serialId}/reassign`, { doctorId: nextDoctorId || null });
      toast.success(nextDoctorId ? 'Standee re-pointed' : 'Standee now shows the whole clinic');
      refetch();
    } catch (e) {
      toast.error(e?.response?.data?.error?.message || e.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-bold text-slate-900">Waiting-room QR</h4>
        <p className="text-[11px] text-slate-500">
          Patients scan this to see the live queue. Re-point it if it is on the wrong door.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-[11px] text-slate-400 rounded-lg bg-slate-50 p-3">
          No QR standee is deployed here yet — your field agent sets one up.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.serialId} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 flex-wrap">
              <span className="w-9 h-9 rounded-lg bg-slate-900 text-white grid place-items-center shrink-0">
                <Icon name="qr" className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 font-mono">{r.serialId}</p>
                <p className="text-[10px] text-slate-400">
                  {r.doctorId ? 'Points at one doctor' : 'Shows the whole clinic'}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Select
                  value={r.doctorId || ''}
                  disabled={busy === r.serialId}
                  onChange={(e) => reassign(r.serialId, e.target.value)}
                  className="w-auto min-w-[180px] text-xs"
                >
                  <option value="">Whole clinic</option>
                  {(doctors || []).map((d) => (
                    <option key={d._id} value={d._id}>{d.name}</option>
                  ))}
                </Select>
                <a
                  href={`/display/${r.serialId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold text-mg-teal hover:text-mg-tealDark whitespace-nowrap"
                >
                  Preview
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
