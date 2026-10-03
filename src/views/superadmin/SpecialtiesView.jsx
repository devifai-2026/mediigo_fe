import { useState } from 'react';
import clsx from 'clsx';
import { useApi } from '../../hooks/useApi.js';
import { api } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useConfirm } from '../../context/ConfirmContext.jsx';
import { AdminPageHeader } from '../../components/superadmin/AdminKpi.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Field, Input } from '../../components/ui/Field.jsx';
import { PhotoField } from '../../components/ui/PhotoCropper.jsx';
import { SkeletonRows } from '../../components/ui/Skeleton.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { PhotoOrFallback } from '../../components/ui/PhotoOrFallback.jsx';

/**
 * Specialties Master.
 *
 * The browse tiles patients see on Explore. Hiding is the normal way to take a
 * tile down: it removes it from the patient grid while leaving the doctors
 * behind it bookable, so tidying the grid never orphans anyone. Deleting is
 * refused by the API while any doctor still practises the specialty.
 */

const BLANK = { name: '', tileLabel: '', description: '' };

export default function SpecialtiesView() {
  const toast = useToast();
  const confirm = useConfirm();
  const { data, loading, refetch } = useApi('/api/specialties/all');

  const [editing, setEditing] = useState(null); // row being edited, or BLANK for new
  const [form, setForm] = useState(BLANK);
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(null);

  const rows = data ?? [];
  const visible = rows.filter((r) => r.isActive).length;
  const withoutArt = rows.filter((r) => !r.photoUrl).length;
  const orphaned = rows.filter((r) => r.doctorCount === 0).length;

  const openNew = () => { setForm(BLANK); setEditing({ id: null }); };
  const openEdit = (row) => {
    setForm({ name: row.name, tileLabel: row.tileLabel === row.name ? '' : row.tileLabel, description: row.description });
    setEditing(row);
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setBusy(true);
    try {
      const body = {
        name: form.name.trim(),
        tileLabel: form.tileLabel.trim(),
        description: form.description.trim(),
      };
      if (editing.id) await api.patch(`/api/specialties/${editing.id}`, body);
      else await api.post('/api/specialties', body);
      toast.success(editing.id ? 'Specialty updated' : `${body.name} added`);
      setEditing(null);
      refetch();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (row) => {
    // Hiding a tile that patients are actively using is worth a confirmation;
    // showing one again is not.
    if (row.isActive && row.doctorCount > 0) {
      const ok = await confirm({
        title: `Hide ${row.name}?`,
        message: `Patients will no longer see this tile on Explore.`,
        detail: `${row.doctorCount} ${row.doctorCount === 1 ? 'doctor' : 'doctors'} will stay bookable — they just will not be reachable from the browse grid.`,
        confirmLabel: 'Hide tile',
      });
      if (!ok) return;
    }
    try {
      await api.patch(`/api/specialties/${row.id}`, { isActive: !row.isActive });
      toast.success(`${row.name} ${row.isActive ? 'hidden' : 'visible'}`);
      refetch();
    } catch (e) { toast.error(e.message); }
  };

  const remove = async (row) => {
    const ok = await confirm({
      title: `Delete ${row.name}?`,
      message: 'This removes the specialty and its artwork permanently.',
      detail: row.doctorCount > 0
        ? `${row.doctorCount} doctors practise this — the server will refuse. Hide it instead.`
        : 'No doctors practise this, so nothing will be orphaned.',
      danger: true,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await api.delete(`/api/specialties/${row.id}`);
      toast.success(`${row.name} deleted`);
      refetch();
    } catch (e) { toast.error(e.message); }
  };

  /** Move a tile one place in the grid, then persist the whole order. */
  const move = async (index, delta) => {
    const next = [...rows];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    try {
      await api.put('/api/specialties/reorder', { ids: next.map((r) => r.id) });
      refetch();
    } catch (e) { toast.error(e.message); }
  };

  const uploadPhoto = async (row, file) => {
    setPhotoBusy(row.id);
    try {
      const body = new FormData();
      body.append('photo', file);
      // Let the browser set the multipart boundary — forcing a Content-Type
      // here omits it and the server rejects the body.
      await api.put(`/api/specialties/${row.id}/photo`, body, { headers: { 'Content-Type': undefined } });
      toast.success('Artwork updated');
      refetch();
    } catch (e) { toast.error(e.message); } finally { setPhotoBusy(null); }
  };

  const removePhoto = async (row) => {
    setPhotoBusy(row.id);
    try {
      await api.delete(`/api/specialties/${row.id}/photo`);
      toast.success('Artwork removed');
      refetch();
    } catch (e) { toast.error(e.message); } finally { setPhotoBusy(null); }
  };

  return (
    <section className="space-y-6">
      <AdminPageHeader
        title="Specialties Master"
        subtitle="The browse tiles patients see on Explore — their artwork, their order, and whether each is shown."
      >
        <button
          type="button"
          onClick={openNew}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md flex items-center gap-2"
        >
          <i className="fa-solid fa-plus" /> Add specialty
        </button>
      </AdminPageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Published', value: visible, hint: 'Visible to patients', tone: 'text-emerald-600' },
          { label: 'Hidden', value: rows.length - visible, hint: 'Still assignable', tone: 'text-slate-500' },
          { label: 'No artwork', value: withoutArt, hint: 'Showing a placeholder', tone: withoutArt ? 'text-amber-600' : 'text-slate-500' },
          { label: 'No doctors yet', value: orphaned, hint: 'Tile leads nowhere', tone: orphaned ? 'text-amber-600' : 'text-slate-500' },
        ].map((k) => (
          <div key={k.label} className="bg-white p-4 rounded-2xl border border-slate-200">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{k.label}</p>
            <p className={clsx('text-2xl font-black mt-0.5', k.tone)}>{k.value}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{k.hint}</p>
          </div>
        ))}
      </div>

      {loading ? <SkeletonRows rows={6} /> : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4 w-20">Order</th>
                <th className="py-3.5 px-4">Specialty</th>
                <th className="py-3.5 px-4 text-center">Doctors</th>
                <th className="py-3.5 px-4 text-center">Visible</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {rows.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-slate-400">No specialties yet. Add the first one.</td></tr>
              ) : rows.map((row, i) => (
                <tr key={row.id} className={clsx('hover:bg-slate-50 transition', !row.isActive && 'opacity-60')}>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-0.5">
                      <button type="button" onClick={() => move(i, -1)} disabled={i === 0}
                        aria-label="Move up"
                        className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-400">
                        <Icon name="chevronDown" className="w-3 h-3 rotate-180" />
                      </button>
                      <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1}
                        aria-label="Move down"
                        className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-400">
                        <Icon name="chevronDown" className="w-3 h-3" />
                      </button>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <PhotoOrFallback
                        src={row.photoUrl}
                        className="w-11 h-11 rounded-lg object-cover shrink-0 bg-slate-50"
                        fallback={(
                          <span className="w-11 h-11 rounded-lg shrink-0 bg-amber-50 text-amber-500 grid place-items-center">
                            <Icon name="heart" className="w-4 h-4" />
                          </span>
                        )}
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900">{row.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{row.slug}</p>
                        {row.tileLabel !== row.name && (
                          <p className="text-[10px] text-slate-400">tile: {row.tileLabel.replace(/\n/g, ' / ')}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4 text-center">
                    <span className={clsx('font-black text-sm', row.doctorCount ? 'text-slate-900' : 'text-amber-600')}>
                      {row.doctorCount}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => toggleActive(row)}
                      role="switch"
                      aria-checked={row.isActive}
                      className={clsx(
                        'mx-auto flex w-10 h-5 rounded-full p-0.5 transition',
                        row.isActive ? 'bg-emerald-500' : 'bg-slate-300',
                      )}
                    >
                      <span className={clsx(
                        'w-4 h-4 rounded-full bg-white shadow transition-transform',
                        row.isActive && 'translate-x-5',
                      )} />
                    </button>
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1">
                      <label className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer" title="Upload artwork">
                        <i className={clsx('fa-solid text-xs', photoBusy === row.id ? 'fa-spinner fa-spin' : 'fa-image')} />
                        <input
                          type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" hidden disabled={photoBusy === row.id}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            e.target.value = '';
                            if (!f) return;
                            // Same contract as PhotoField: fail here rather
                            // than after a pointless round trip.
                            if (!['image/jpeg', 'image/png'].includes(f.type)) {
                              toast.error(`${f.type ? f.type.replace('image/', '').toUpperCase() : 'That file type'} is not supported. Please choose a JPEG or PNG.`);
                              return;
                            }
                            if (f.size > 8 * 1024 * 1024) {
                              toast.error(`That image is ${(f.size / (1024 * 1024)).toFixed(1)}MB. Please choose one under 8MB.`);
                              return;
                            }
                            uploadPhoto(row, f);
                          }}
                        />
                      </label>
                      {row.photoUrl && (
                        <button type="button" onClick={() => removePhoto(row)} title="Remove artwork"
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg">
                          <i className="fa-solid fa-eraser text-xs" />
                        </button>
                      )}
                      <button type="button" onClick={() => openEdit(row)} title="Edit"
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
                        <i className="fa-solid fa-pen text-xs" />
                      </button>
                      <button type="button" onClick={() => remove(row)} title="Delete"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg">
                        <i className="fa-solid fa-trash text-xs" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-4 py-3 text-[11px] text-slate-400 border-t border-slate-100">
            Hiding a tile removes it from the patient grid but keeps its doctors bookable. Deleting is refused while any doctor still practises it.
          </p>
        </div>
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => !busy && setEditing(null)}
        title={editing?.id ? `Edit ${editing.name}` : 'Add specialty'}
        size="md"
      >
        <div className="space-y-4">
          <Field label="Name" required hint="What it is called everywhere except the tile">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Cardiology" />
          </Field>
          <Field label="Tile label" hint="Optional. Use line breaks to wrap a long name, e.g. Ear / Throat / Nose">
            <Input
              value={form.tileLabel}
              onChange={(e) => setForm({ ...form, tileLabel: e.target.value })}
              placeholder="Leave blank to use the name"
            />
          </Field>
          <Field label="Description" hint="Optional. Not shown to patients yet.">
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>

          {editing?.id && (
            <PhotoField
              value={editing.photoUrl}
              name={editing.name}
              busy={photoBusy === editing.id}
              onUpload={(f) => uploadPhoto(editing, f)}
              onRemove={() => removePhoto(editing)}
          onReject={(m) => toast.error(m)}
              label="Tile artwork"
              hint="Square. Shown on the Explore browse grid."
            />
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setEditing(null)} disabled={busy}>Cancel</Button>
            <Button onClick={save} disabled={busy}>{busy ? 'Saving…' : editing?.id ? 'Save changes' : 'Add specialty'}</Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
