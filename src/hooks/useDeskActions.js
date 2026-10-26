import { useState } from 'react';
import { api } from '../lib/api.js';
import { token } from '../lib/format.js';
import { useToast } from '../context/ToastContext.jsx';
import { useReleaseFollowUp } from './useReleaseFollowUp.js';
import { OUTCOME_LABEL } from '../components/desk/deskFormat.js';

/**
 * Every queue mutation the OPD Desk offers, shared by the doctor's chamber and
 * the front desk so both drive the queue through exactly the same calls.
 * Each one refetches on success; the socket snapshot usually lands first.
 */
export function useDeskActions(doctorId, refetch) {
  const toast = useToast();
  const releaseFollowUp = useReleaseFollowUp();
  const [busy, setBusy] = useState(false);

  const act = async (fn, successMsg) => {
    setBusy(true);
    try {
      const r = await fn();
      if (successMsg) toast.success(successMsg);
      refetch?.();
      return r;
    } catch (e) {
      toast.error(e?.response?.data?.error?.message || e.message);
      return undefined;
    } finally {
      setBusy(false);
    }
  };

  const callNext = (payload) => act(async () => {
    const r = await api.post(`/api/queue/${doctorId}/call-next`, payload);
    const { called, completed } = r.data?.data ?? {};
    toast.success(called
      ? `Called ${token(called.tokenNumber)}`
      : `${completed ? `${token(completed.tokenNumber)} complete — ` : ''}no one left waiting`);
    return r;
  });

  const recall = () => act(() => api.post(`/api/queue/${doctorId}/recall`), 'Re-announced');

  const setStatus = (t, status, extra = {}) =>
    act(() => api.post(`/api/queue/tokens/${t.tokenId}/status`, { status, ...extra }));

  /** Finish the patient in the chamber with how the consultation ended. */
  const complete = (t, outcome = 'DONE', outcomeNotes) =>
    act(
      () => api.post(`/api/queue/tokens/${t.tokenId}/status`, { status: 'COMPLETED', outcome, ...(outcomeNotes ? { outcomeNotes } : {}) }),
      `${token(t.tokenNumber)} — ${outcome === 'DONE' ? 'consultation complete' : OUTCOME_LABEL[outcome].toLowerCase()}`,
    );

  const skip = (t) => act(
    () => api.post(`/api/queue/tokens/${t.tokenId}/status`, { status: 'SKIPPED' }),
    `${token(t.tokenNumber)} skipped — recall them any time`,
  );

  const restore = (t) => act(() => api.post(`/api/queue/tokens/${t.tokenId}/restore`), `${token(t.tokenNumber)} is back in the queue`);

  /** Bring a completed patient back: into the chamber if free, else next in line. */
  const recallCompleted = (t) => act(async () => {
    const r = await api.post(`/api/queue/tokens/${t.tokenId}/recall-completed`);
    const into = r.data?.data?.status === 'IN_CHAMBER';
    toast.success(into ? `${token(t.tokenNumber)} recalled into the chamber` : `${token(t.tokenNumber)} recalled — next in line after the current patient`);
    return r;
  });

  const onRowAction = async (action, t) => {
    if (action === 'RECALL_COMPLETED') return recallCompleted(t);
    if (action === 'RELEASE_FOLLOWUP') {
      if (await releaseFollowUp(t)) refetch?.();
      return;
    }
    if (action === 'RESTORE') return restore(t);
    if (action === 'RECALL') return recall();
    if (action === 'SKIPPED') return skip(t);
    if (action === 'COMPLETED') return complete(t);
    return setStatus(t, action);
  };

  return { busy, callNext, recall, complete, skip, restore, recallCompleted, onRowAction };
}
