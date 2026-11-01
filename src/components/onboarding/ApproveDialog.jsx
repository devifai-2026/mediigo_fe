import { useEffect, useState } from 'react';
import { useApi } from '../../hooks/useApi.js';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Field, Input, PasswordInput } from '../ui/Field.jsx';
import { intRangeError, passwordError, collect } from '../../lib/validators.js';

/**
 * Approve & publish, for both the district and Super Admin queues.
 *
 * Asks for the free-trial length (bounded by the platform maximum, read from
 * the server) and, optionally, the password for the logins this approval
 * creates. Left blank, each login keeps the password its field agent set, or
 * gets a generated one — shown once in the credentials dialog afterwards.
 */
export function ApproveDialog({ submission, busy, onCancel, onApprove }) {
  const { data: limits } = useApi(submission ? '/api/admin/trial-limits' : null, { skip: !submission });
  const maxDays = limits?.maxTrialDays ?? 90;
  const [trialDays, setTrialDays] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (submission) {
      setTrialDays(String(limits?.defaultTrialDays ?? 30));
      setPassword('');
      setErrors({});
    }
  }, [submission, limits?.defaultTrialDays]);

  if (!submission) return null;
  const name = submission.payload?.name ?? submission.clinicName ?? 'This clinic';
  const doctors = submission.payload?.doctors?.length ?? 0;

  const submit = (e) => {
    e.preventDefault();
    const problems = collect({
      trialDays: intRangeError(trialDays, { label: 'Free trial', min: 0, max: maxDays, required: true }),
      password: passwordError(password, { required: false }),
    });
    setErrors(problems);
    if (Object.keys(problems).length) return;
    onApprove({ trialDays: Number(trialDays), ...(password ? { password } : {}) });
  };

  return (
    <Modal open onClose={() => !busy && onCancel()} title="Approve and publish?" subtitle={name} size="sm">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <p className="text-xs text-slate-600">
          {name} will go live and become visible to patients searching nearby.{' '}
          {doctors
            ? `Logins are created for the front desk and ${doctors} doctor${doctors === 1 ? '' : 's'}.`
            : 'A login is created for the listed contact.'}
        </p>
        <Field label="Free trial (days)" required hint={`0 for none, up to ${maxDays}`} error={errors.trialDays}>
          <Input
            inputMode="numeric" error={errors.trialDays} value={trialDays}
            onChange={(e) => { setTrialDays(e.target.value.replace(/\D/g, '').slice(0, 4)); setErrors({}); }}
          />
        </Field>
        <Field
          label="Login password"
          hint="Optional. Applies to the new logins; blank keeps the agent's password or generates one."
          error={errors.password}
        >
          <PasswordInput
            error={errors.password} value={password} autoComplete="new-password" placeholder="Keep / auto-generate"
            onChange={(e) => { setPassword(e.target.value); setErrors({}); }}
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button type="submit" loading={busy}>Approve &amp; publish</Button>
        </div>
      </form>
    </Modal>
  );
}
