import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useConfirm } from '../../context/ConfirmContext.jsx';
import { api } from '../../lib/api.js';
import { Modal } from '../../components/ui/Modal.jsx';
import { FamilyMemberForm } from '../../components/patient/FamilyMemberForm.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { initials, phone as fmtPhone, ageOf, shortDate } from '../../lib/format.js';
import { useGeolocation } from '../../hooks/useGeolocation.js';
import { AvatarEditor, EditDetailsModal, ChangePhoneModal, DeleteAccountModal } from '../../components/patient/AccountSettings.jsx';
import { useNoIndex } from '../../lib/seo.js';

export default function ProfileView() {
  useNoIndex('My profile');
  const { user, refreshUser, logout } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [adding, setAdding] = useState(false);
  // Which account dialog is open: 'details' | 'phone' | 'delete' | null.
  const [dialog, setDialog] = useState(null);
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
    <div className="max-w-3xl mx-auto space-y-6">
      <h2 className="mg-title">My Profile</h2>

      <div className="mg-hero p-5 sm:p-6 flex items-center gap-4">
        <AvatarEditor className="w-16 h-16 sm:w-20 sm:h-20" />
        <div className="flex-grow min-w-0">
          <h3 className="text-xl font-semibold truncate">{user?.name}</h3>
          <p className="text-sm text-white/85">+91 {fmtPhone(user?.phone)}</p>
          <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-white text-mg-blue">
            <Icon name="shieldCheck" className="w-3 h-3" /> Verified patient
          </span>
        </div>
        <button
          type="button"
          onClick={() => logout()}
          className="shrink-0 hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-medium transition"
        >
          <Icon name="logout" className="w-3.5 h-3.5" /> Log out
        </button>
      </div>

      {/* Personal details: read here, edited in a dialog. */}
      <section className="mg-card">
        <div className="flex items-center justify-between px-5 sm:px-6 pt-5 pb-3">
          <h4 className="text-base font-semibold text-slate-900">Personal details</h4>
          <button type="button" onClick={() => setDialog('details')} className="h-9 px-3 -mr-2 rounded-lg text-sm font-medium text-mg-teal hover:bg-mg-teal/5">
            Edit
          </button>
        </div>
        <dl className="divide-y divide-slate-100 text-sm">
          {[
            ['Name', user?.name],
            ['Email', user?.email || <span className="text-slate-400">Not added</span>],
            ['Date of birth', user?.dob ? `${shortDate(user.dob)} ${new Date(user.dob).getFullYear()} · ${ageOf(user.dob)} yrs` : <span className="text-slate-400">Not added</span>],
            ['Gender', ({ M: 'Male', F: 'Female', O: 'Other' })[user?.gender] ?? <span className="text-slate-400">Not added</span>],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4 px-5 sm:px-6 py-3">
              <dt className="text-slate-500">{k}</dt>
              <dd className="font-medium text-slate-900 text-right truncate">{v}</dd>
            </div>
          ))}
          <div className="flex items-center justify-between gap-4 px-5 sm:px-6 py-3">
            <dt className="text-slate-500">Mobile</dt>
            <dd className="flex items-center gap-3">
              <span className="font-medium text-slate-900">+91 {fmtPhone(user?.phone)}</span>
              <button type="button" onClick={() => setDialog('phone')} className="text-sm font-medium text-mg-teal hover:underline">Change</button>
            </dd>
          </div>
        </dl>
      </section>

      <div className="mg-card p-5 sm:p-6 space-y-6">

        {/* What nearby search measures from. Shown so a patient can tell at a
            glance whether the distances they see are actually theirs. */}
        <div className="border-b border-slate-100 pb-5">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-base font-semibold text-slate-900">Your location</h4>
            <button
              type="button"
              onClick={updateLocation}
              disabled={locating}
              className="text-xs text-mg-teal font-medium hover:underline disabled:opacity-50"
            >
              {locating ? 'Locating…' : loc ? 'Update' : 'Set location'}
            </button>
          </div>
          {loc ? (
            <div className="p-3 mg-panel">
              <p className="text-xs font-medium text-slate-800 flex items-center gap-1.5">
                <Icon name="location" className="w-3.5 h-3.5 text-mg-teal shrink-0" />
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
            <h4 className="text-base font-semibold text-slate-900">Family profiles</h4>
            <button type="button" onClick={() => setAdding(true)} className="text-xs text-mg-teal font-medium hover:underline">
              + Add member
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {members.map((m) => (
              <div key={m._id} className="p-3 mg-panel flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-white text-mg-navy grid place-items-center text-[11px] font-bold shrink-0">
                  {initials(m.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-900 truncate">{m.name}</p>
                  <p className="text-[10px] text-mg-teal capitalize">
                    {m.relation?.toLowerCase()}
                    {ageOf(m.dob) != null && <> · {ageOf(m.dob)}y</>}
                    {m.gender && <> · {m.gender}</>}
                  </p>
                  {/* Members added before age and gender were required still
                      exist; prompt rather than block them from being booked. */}
                  {m.relation !== 'SELF' && m.phone && (
                    <p className="text-[10px] text-slate-500">
                      +91 {fmtPhone(m.phone)}
                      {m.linkedUserId && <span className="ml-1 font-semibold text-emerald-600">· Mediigo account</span>}
                    </p>
                  )}
                  {(!m.dob || !m.gender) && (
                    <p className="text-[10px] text-amber-600 font-medium">Add age and gender</p>
                  )}
                </div>
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

      <button
        type="button"
        onClick={() => logout()}
        className="sm:hidden w-full h-11 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 inline-flex items-center justify-center gap-2"
      >
        <Icon name="logout" className="w-4 h-4" /> Log out
      </button>

      {/* Deleting the account is in the app itself — no email to support. */}
      <section className="rounded-xl border border-rose-200 bg-rose-50/40 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-base font-semibold text-slate-900">Delete account</h4>
          <p className="mt-1 text-sm text-slate-600">Permanently remove your profile, family members and upcoming bookings.</p>
        </div>
        <button
          type="button"
          onClick={() => setDialog('delete')}
          className="shrink-0 h-10 px-4 rounded-lg border border-rose-300 bg-white text-sm font-semibold text-rose-600 hover:bg-rose-600 hover:text-white hover:border-rose-600 transition"
        >
          Delete account
        </button>
      </section>

      <EditDetailsModal open={dialog === 'details'} onClose={() => setDialog(null)} />
      <ChangePhoneModal open={dialog === 'phone'} onClose={() => setDialog(null)} />
      <DeleteAccountModal open={dialog === 'delete'} onClose={() => setDialog(null)} />

      <Modal open={adding} onClose={() => setAdding(false)} title="Add a family member" size="sm">
        <FamilyMemberForm submitLabel="Add member" onSaved={() => setAdding(false)} />
      </Modal>
    </div>
  );
}
