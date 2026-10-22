import { useState } from 'react';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { phone as fmtPhone } from '../../lib/format.js';

const ROLE_LABEL = { RECEPTIONIST: 'Front desk', DOCTOR: 'Doctor', PHARMACIST: 'Pharmacy' };

const message = (c, clinicName) => [
  `Your Mediigo login${clinicName ? ` for ${clinicName}` : ''} is ready.`,
  `Sign in at ${window.location.origin}/clinic/login`,
  `Mobile: ${c.phone}`,
  `Temporary password: ${c.tempPassword}`,
  'Please change it after your first sign-in.',
].join('\n');

/**
 * Every login an approval just created, with its one-time password. Shown
 * once — the passwords are not stored anywhere readable — so each row can be
 * copied or sent straight to the person on WhatsApp from the approver's phone.
 */
export function CredentialsModal({ result, onClose }) {
  const [copied, setCopied] = useState(null);
  const creds = result?.credentials ?? [];
  if (!result || !creds.length) return null;
  const clinicName = result.hospital?.name || '';

  const copy = async (c, i) => {
    try { await navigator.clipboard.writeText(message(c, clinicName)); setCopied(i); } catch { /* clipboard blocked */ }
  };

  return (
    <Modal open onClose={onClose} title="Logins created" subtitle={clinicName} size="lg" closeOnBackdrop={false}>
      <div className="space-y-4">
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <i className="fa-solid fa-triangle-exclamation mr-1.5" aria-hidden="true" />
          These temporary passwords are shown only now. Send each one to its owner before closing.
        </p>
        <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
          {creds.map((c, i) => (
            <li key={c.phone} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {c.name}
                  <span className="ml-2 text-[10px] font-semibold uppercase text-slate-500">{ROLE_LABEL[c.role] || c.role}{c.isClinicAdmin ? ' · clinic admin' : ''}</span>
                </p>
                <p className="text-xs text-slate-500">
                  +91 {fmtPhone(c.phone)} · password <span className="font-mono font-semibold text-slate-900">{c.tempPassword}</span>
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="secondary" onClick={() => copy(c, i)}>
                  <i className={copied === i ? 'fa-solid fa-check' : 'fa-regular fa-copy'} aria-hidden="true" /> {copied === i ? 'Copied' : 'Copy'}
                </Button>
                <a
                  href={`https://wa.me/91${c.phone}?text=${encodeURIComponent(message(c, clinicName))}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium"
                >
                  <i className="fa-brands fa-whatsapp" aria-hidden="true" /> WhatsApp
                </a>
              </div>
            </li>
          ))}
        </ul>
        <div className="flex justify-end">
          <Button onClick={onClose}>Done — all shared</Button>
        </div>
      </div>
    </Modal>
  );
}
