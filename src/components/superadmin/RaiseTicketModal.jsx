import { useState } from 'react';
import { api, unwrap } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Field, Input, Textarea, Select } from '../ui/Field.jsx';
import { CATEGORY, PRIORITY } from '../../lib/tickets.js';

/** Any signed-in role can raise a ticket; scope is derived server-side. */
export function RaiseTicketModal({ open, onClose, onDone }) {
  const toast = useToast();
  const [form, setForm] = useState({ title: '', body: '', category: 'TECHNICAL', priority: 'MEDIUM' });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const t = unwrap(await api.post('/api/tickets', form));
      toast.success(`${t.ref} raised`);
      setForm({ title: '', body: '', category: 'TECHNICAL', priority: 'MEDIUM' });
      onDone?.();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Raise a ticket" subtitle="Goes to your district's administrators" size="md">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Summary" required>
          <Input
            required minLength={4} value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Voice announcement not audible in chamber"
          />
        </Field>
        <Field label="What happened" required hint="At least 10 characters — include what you expected and what you saw">
          <Textarea
            required minLength={10} rows={5} value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            placeholder="The call-next chime plays but the speech is too quiet to hear from the corridor."
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {Object.entries(CATEGORY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          <Field label="Priority">
            <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              {Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
          </Field>
        </div>
        <Button type="submit" loading={busy} className="w-full" size="lg">Submit ticket</Button>
      </form>
    </Modal>
  );
}
