import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useSocketEvent } from '../../hooks/useSocketEvent.js';
import { EVENTS } from '../../lib/socketEvents.js';
import { ROLES } from '../../lib/constants.js';

const SAID = {
  APPROVED: ['success', 'approved and is now live'],
  REJECTED: ['error', 'was rejected'],
  CHANGES_REQUESTED: ['warn', 'needs changes'],
  UNDER_REVIEW: ['push', 'is being reviewed'],
};

/**
 * A field agent hears about their submissions wherever they are in the app,
 * not only when they happen to open "My Submissions".
 */
export function SubmissionStatusToasts() {
  const { role } = useAuth();
  const toast = useToast();
  useSocketEvent(role === ROLES.FIELD_AGENT ? EVENTS.SUBMISSION_STATUS_CHANGED : null, (e) => {
    const said = SAID[e?.to];
    if (!said) return;
    const [kind, text] = said;
    const what = e.kind === 'DOCTOR' ? 'Your doctor submission' : 'Your clinic submission';
    const notes = e.reviewNotes ? ` — ${e.reviewNotes}` : '';
    toast[kind](`${what} ${text}${notes}`, { key: `submission-${e.submissionId}`, duration: 8000 });
  }, [role]);
  return null;
}
