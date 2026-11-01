import { useRef, useState } from 'react';
import clsx from 'clsx';
import { api } from '../../lib/api.js';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import { asList } from '../../lib/list.js';
import { openPrivateDocument } from '../../lib/documents.js';

const ICON = { AADHAAR: 'fa-id-card', PAN: 'fa-address-card', REG_CERT: 'fa-file-medical' };

/**
 * A doctor's Aadhaar, PAN and registration certificate: what is on file,
 * and — for the doctor themselves or a Super Admin — a way to replace one.
 * The files are private; viewing fetches them with the session.
 */
export function DoctorDocuments({ doctorId, canReplace = false, className }) {
  const toast = useToast();
  const { data, loading, error, refetch } = useApi(doctorId ? `/api/doctors/${doctorId}/documents` : null, { skip: !doctorId });
  const docs = asList(data);
  const input = useRef(null);
  const [replacing, setReplacing] = useState(null);

  const upload = async (file) => {
    if (!file || !replacing) return;
    try {
      const body = new FormData();
      body.append('photo', file);
      await api.put(`/api/doctors/${doctorId}/documents/${replacing}`, body, { headers: { 'Content-Type': undefined } });
      toast.success('Document updated');
      refetch();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setReplacing(null);
    }
  };

  if (error) return null; // not this viewer's to see
  const missing = docs.filter((d) => !d.uploaded).length;

  return (
    <div className={clsx('space-y-2', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-700">
          <i className="fa-solid fa-shield-halved text-mg-teal mr-1.5" aria-hidden="true" />Verification documents
        </p>
        {missing > 0 && <span className="text-[11px] font-semibold text-amber-700">{missing} missing</span>}
      </div>
      {loading && !data ? (
        <div className="h-14 rounded-lg bg-slate-100 animate-pulse" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {docs.map((d) => (
            <div key={d.type} className={clsx('rounded-lg border p-2.5 flex items-center gap-2.5 bg-white', d.uploaded ? 'border-emerald-200' : 'border-dashed border-amber-300')}>
              <span className={clsx('w-9 h-9 rounded-lg grid place-items-center shrink-0', d.uploaded ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600')}>
                <i className={clsx('fa-solid', d.uploaded ? 'fa-circle-check' : ICON[d.type])} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold text-slate-800 truncate">{d.label}</span>
                <span className="block text-[11px] text-slate-500">
                  {d.uploaded ? `Uploaded ${d.uploadedAt ? new Date(d.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}` : 'Not uploaded'}
                </span>
              </span>
              {d.uploaded && (
                <button type="button" onClick={() => openPrivateDocument(`/api/doctors/${doctorId}/documents/${d.type}/file`).catch((e) => toast.error(e.message))}
                  className="text-[11px] font-semibold text-mg-blue hover:underline shrink-0">View</button>
              )}
              {canReplace && (
                <button type="button" onClick={() => { setReplacing(d.type); input.current?.click(); }}
                  className="text-[11px] font-semibold text-mg-teal hover:underline shrink-0">{d.uploaded ? 'Replace' : 'Upload'}</button>
              )}
            </div>
          ))}
        </div>
      )}
      <input ref={input} type="file" accept="image/jpeg,image/png" className="hidden"
        onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ''; }} />
    </div>
  );
}
