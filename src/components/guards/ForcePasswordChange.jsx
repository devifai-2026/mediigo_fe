import { useAuth } from '../../context/AuthContext.jsx';
import { Modal } from '../ui/Modal.jsx';
import { ChangePasswordCard } from '../desk/ChangePasswordCard.jsx';

/**
 * After an admin issues a password, its owner picks their own before doing
 * anything else: the admin has seen the issued one. Not shown to a Super Admin
 * signed in as this person — that session cannot change their password anyway.
 */
export function ForcePasswordChange() {
  const { user, isImpersonating, refreshUser, logout } = useAuth();
  if (!user?.mustChangePassword || isImpersonating) return null;

  return (
    <Modal
      open
      onClose={() => {}}
      closeOnBackdrop={false}
      title="Choose your own password"
      subtitle="Your password was reset by an administrator. Enter it as the current password, then pick a new one."
      size="lg"
    >
      <div className="space-y-3">
        <ChangePasswordCard me={{ ...user, hasPassword: true }} onChanged={() => { refreshUser().catch(() => {}); }} />
        <div className="flex justify-end">
          <button type="button" onClick={() => logout()} className="text-xs font-semibold text-slate-500 hover:text-slate-800">
            Sign out instead
          </button>
        </div>
      </div>
    </Modal>
  );
}
