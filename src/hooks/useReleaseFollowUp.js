import { useCallback } from 'react';
import { api } from '../lib/api.js';
import { useConfirm } from '../context/ConfirmContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { isOverdue, longDate } from '../lib/followUps.js';

/**
 * Free an unconfirmed follow-up slot so another patient can book it.
 *
 * Asks first: the patient loses the place, and is messaged that it went.
 * Works on a roster row ({ tokenId, name, followUpRespondBy }) or a follow-up
 * list row ({ tokenId, patient.name, respondBy, date }). Resolves true when
 * the slot was released.
 */
export const useReleaseFollowUp = () => {
  const confirm = useConfirm();
  const toast = useToast();

  return useCallback(async (row) => {
    const name = row.patient?.name ?? row.name ?? 'this patient';
    const respondBy = row.respondBy ?? row.followUpRespondBy;
    const ok = await confirm({
      title: 'Release this follow-up slot?',
      message: `${name}'s follow-up${row.date ? ` on ${longDate(row.date)}` : ''} will be cancelled and the place opened to other patients.`,
      detail: isOverdue('PENDING', respondBy)
        ? 'They did not reply by the deadline. They will get a message that the slot was released.'
        : 'They have not replied yet and the reply deadline has not passed. Release only if you know they are not coming.',
      confirmLabel: 'Release slot',
      danger: true,
    });
    if (!ok) return false;
    try {
      await api.post(`/api/queue/tokens/${row.tokenId}/followup/release`, {});
      toast.success('Slot released — it is open for booking again');
      return true;
    } catch (e) {
      toast.error(e.message);
      return false;
    }
  }, [confirm, toast]);
};
