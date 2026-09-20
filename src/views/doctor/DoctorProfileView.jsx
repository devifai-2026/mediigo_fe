import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useApi } from '../../hooks/useApi.js';
import { api } from '../../lib/api.js';
import { Button } from '../../components/ui/Button.jsx';
import { Field, Input } from '../../components/ui/Field.jsx';
import { MoneyInput } from '../../components/ui/MoneyInput.jsx';
import { Icon } from '../../components/ui/Icon.jsx';

export default function DoctorProfileView() {
  const { user } = useAuth();
  const toast = useToast();
  const doctorId = user?.doctorId;
  const { data: doctor, refetch } = useApi(doctorId ? `/api/doctors/${doctorId}` : null);

  const [fees, setFees] = useState({ fresh: '', followup: '', emergency: '' });
  const [chamber, setChamber] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (doctor) {
      setFees(doctor.fees);
      setChamber(doctor.chamberNumber || '');
    }
  }, [doctor]);

  const saveFees = async () => {
    setBusy(true);
    try {
      await api.patch(`/api/doctors/${doctorId}/fees`, fees);
      toast.success('Consultation fees updated');
      refetch();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  const saveProfile = async () => {
    setBusy(true);
    try {
      await api.patch(`/api/doctors/${doctorId}`, { chamberNumber: chamber });
      toast.success('Chamber updated — announcements will use the new number');
      refetch();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  const toggleBooking = async (isOpen) => {
    try {
      await api.post(`/api/queue/${doctorId}/booking`, { isOpen });
      toast.success(isOpen ? 'Bookings opened' : 'Bookings closed');
      refetch();
    } catch (e) { toast.error(e.message); }
  };

  if (!doctor) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="glass-card rounded-3xl p-6 space-y-5">
        <div>
          <h3 className="text-lg font-bold text-slate-900">{doctor.name}</h3>
          <p className="text-xs text-slate-500">{doctor.specialty} · {doctor.hospital?.name}</p>
        </div>

        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
          <div>
            <p className="text-xs font-bold text-slate-800">Accepting bookings</p>
            <p className="text-[11px] text-slate-500">Turn this off to stop new tokens being issued</p>
          </div>
          <Button
            variant={doctor.session?.isBookingOpen ? 'secondary' : 'primary'}
            size="sm"
            onClick={() => toggleBooking(!doctor.session?.isBookingOpen)}
          >
            {doctor.session?.isBookingOpen ? 'Close bookings' : 'Open bookings'}
          </Button>
        </div>

        <Field label="Chamber number" hint="Read out in every voice announcement">
          <div className="flex gap-2">
            <Input value={chamber} onChange={(e) => setChamber(e.target.value)} placeholder="104" />
            <Button onClick={saveProfile} loading={busy}>Save</Button>
          </div>
        </Field>
      </div>

      <div className="glass-card rounded-3xl p-6 space-y-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900">Consultation fees</h4>
          <p className="text-[11px] text-slate-500">Applied at the front desk when a patient registers</p>
        </div>
        {[['fresh', 'Fresh visit'], ['followup', 'Follow-up'], ['emergency', 'Emergency']].map(([k, label]) => (
          <div key={k} className="flex items-center gap-3">
            <span className="w-28 text-xs font-bold text-slate-700 shrink-0">{label}</span>
            <MoneyInput value={fees[k]} onChange={(v) => setFees({ ...fees, [k]: v })} className="flex-1" />
          </div>
        ))}
        <Button onClick={saveFees} loading={busy} className="w-full">
          <Icon name="check" className="w-4 h-4" /> Save fees
        </Button>
      </div>
    </div>
  );
}
