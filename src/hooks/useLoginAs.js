import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useConfirm } from '../context/ConfirmContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { ROLE_HOME, ROLE_LABEL } from '../lib/constants.js';

/**
 * Super Admin "Login as". Confirms, swaps to a short session as the target
 * and lands on their home screen. The banner at the top of every portal is
 * the way back.
 */
export function useLoginAs() {
  const { impersonate } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const navigate = useNavigate();

  return useCallback(async ({ userId, name, role }) => {
    if (!userId) {
      toast.error('This person has no login yet');
      return;
    }
    const ok = await confirm({
      title: `Sign in as ${name}?`,
      message: `You will see Mediigo exactly as this ${ROLE_LABEL[role] ?? 'user'} does, for up to 30 minutes. Everything you do is recorded against your account.`,
      confirmLabel: 'Sign in as them',
    });
    if (!ok) return;
    try {
      const target = await impersonate(userId);
      navigate(ROLE_HOME[target.role] || '/', { replace: true });
    } catch (err) {
      toast.error(err.message);
    }
  }, [impersonate, confirm, toast, navigate]);
}
