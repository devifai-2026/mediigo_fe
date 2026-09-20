import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useConfirm } from '../../context/ConfirmContext.jsx';
import { api, unwrap } from '../../lib/api.js';
import { Button } from '../../components/ui/Button.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { Field, Input, Select } from '../../components/ui/Field.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { initials, phone as fmtPhone, ageOf, shortDate } from '../../lib/format.js';
import { useGeolocation } from '../../hooks/useGeolocation.js';

export default function ProfileView() {
  const { user, refreshUser, logout } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', relation: 'CHILD', gender: 'M', dob: '' });
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const { locate } = useGeolocation();
  const loc = user?.lastKnownLocation?.coordinates ? user.lastKnownLocation : null;

  const updateLocation = async () => {
    setLocating(true);
    try {
      const c = await locate();
      // locate() resolves to the Kolkata fallback when permission is refused;
      // saving that would be worse than saving nothing.
      if (!c || c.label === 'Kolkata') {
        toast.warn('Could not get your location — check that location access is allowed');
        return;
      }
      await api.patch('/api/patients/me/location', { lat: c.lat, lng: c.lng });
      await refreshUser();
      toast.success('Location updated');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLocating(false);
    }
  };

  // Bound to the live user object — the prototype's profile name and phone were
  // static HTML that diverged from state after login.
  const members = user?.familyMembers ?? [];

  const addMember = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/api/patients/me/family', form);
      await refreshUser();
      setAdding(false);
      setForm({ name: '', relation: 'CHILD', gender: 'M', dob: '' });
      toast.success('Family member added');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const removeMember = async (m) => {
    if (!(await confirm({ title: 'Remove family member?', message: `${m.name} will no longer appear when booking.`, danger: true, confirmLabel: 'Remove' }))) return;
    try {
      await api.delete(`/api/patients/me/family/${m._id}`);
      await refreshUser();
      toast.success('Removed');
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="glass-card rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-4 border-b border-slate-200 pb-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-700 to-teal-600 text-white grid place-items-center text-xl font-black">
            {initials(user?.name)}
          </div>
          <div className="flex-grow min-w-0">
            <h3 className="text-lg font-bold text-slate-900 truncate">{user?.name}</h3>
            <p className="text-xs text-slate-500">+91 {fmtPhone(user?.phone)}</p>
            <span className="inline-block mt-1 text-[9px] font-extrabold uppercase tracking-widest bg-teal-100 text-teal-800 px-2 py-0.5 rounded border border-teal-200">
              Verified patient
            </span>
          </div>
          <Button variant="secondary" size="sm" onClick={() => logout()}>
            <Icon name="logout" className="w-3.5 h-3.5" /> Log out
          </Button>
        </div>

        {/* What nearby search measures from. Shown so a patient can tell at a
            glance whether the distances they see are actually theirs. */}
        <div className="border-b border-slate-200 pb-5">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-bold text-slate-900">Your location</h4>
            <button
              type="button"
              onClick={updateLocation}
              disabled={locating}
              className="text-xs text-teal-700 font-bold hover:underline disabled:opacity-50"
            >
              {locating ? 'Locating…' : loc ? 'Update' : 'Set location'}
            </button>
          </div>
          {loc ? (
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Icon name="location" className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                {loc.label || 'Saved location'}
              </p>
              {loc.formatted && <p className="text-[10px] text-slate-500 mt-0.5">{loc.formatted}</p>}
              <p className="text-[10px] text-slate-400 mt-1">
                Updated {loc.updatedAt ? shortDate(loc.updatedAt) : '—'}
                {loc.accuracy != null && <> · accurate to about {Math.round(loc.accuracy)}m</>}
              </p>
            </div>
          ) : (
            <p className="text-[11px] text-slate-500">
              Not set — clinic distances are measured from Kolkata city centre until you share it.
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-slate-900">Family profiles</h4>
            <button type="button" onClick={() => setAdding(true)} className="text-xs text-teal-700 font-bold hover:underline">
              + Add member
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {members.map((m) => (
              <div key={m._id} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{m.name}</p>
                  <p className="text-[10px] text-slate-500 capitalize">
                    {m.relation?.toLowerCase()}
                    {ageOf(m.dob) != null && <> · {ageOf(m.dob)}y</>}
                    {m.gender && <> · {m.gender}</>}
                  </p>
                  {/* Members added before age and gender were required still
                      exist; prompt rather than block them from being booked. */}
                  {(!m.dob || !m.gender) && (
                    <p className="text-[10px] text-amber-600 font-semibold">Add age and gender</p>
                  )}
                </div>
                {m.relation !== 'SELF' && (
                  <button type="button" onClick={() => removeMember(m)} className="text-slate-400 hover:text-rose-600 p-1 shrink-0">
                    <Icon name="cross" className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal open={adding} onClose={() => setAdding(false)} title="Add a family member" size="sm">
        <form onSubmit={addMember} className="space-y-4">
          <Field label="Full name" required>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Sunita Kumar" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Relation">
              <Select value={form.relation} onChange={(e) => setForm({ ...form, relation: e.target.value })}>
                {['SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'OTHER'].map((r) => (
                  <option key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</option>
                ))}
              </Select>
            </Field>
            <Field label="Gender" required>
              <Select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="M">Male</option><option value="F">Female</option><option value="O">Other</option>
              </Select>
            </Field>
          </div>
          {/* Date of birth rather than age, so it stays right next year. The
              doctor's roster is close to useless without age and gender. */}
          <Field label="Date of birth" required hint="Shown to the doctor as an age on their roster">
            <Input
              type="date"
              required
              max={new Date().toISOString().slice(0, 10)}
              value={form.dob}
              onChange={(e) => setForm({ ...form, dob: e.target.value })}
            />
          </Field>
          <Button type="submit" loading={busy} className="w-full">Add member</Button>
        </form>
      </Modal>
    </div>
  );
}
