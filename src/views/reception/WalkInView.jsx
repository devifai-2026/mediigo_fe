import { useState } from 'react';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import { api, unwrap } from '../../lib/api.js';
import { Button } from '../../components/ui/Button.jsx';
import { Field, Input, Select } from '../../components/ui/Field.jsx';
import { SplitPaymentModal } from '../../components/payment/SplitPaymentModal.jsx';
import { ReceiptPrintable } from '../../components/payment/ReceiptPrintable.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { inr, token } from '../../lib/format.js';
import { VISIT_LABEL } from '../../lib/constants.js';
import clsx from 'clsx';

export default function WalkInView() {
  const { data: doctors } = useApi('/api/doctors');
  const toast = useToast();

  const [form, setForm] = useState({ name: '', phone: '', age: '', gender: 'M', complaint: '' });
  const [doctorId, setDoctorId] = useState('');
  const [visitType, setVisitType] = useState('fresh');
  const [payOpen, setPayOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState(null);

  const doctor = (doctors || []).find((d) => d._id === doctorId);
  const fee = doctor?.fees?.[visitType] ?? 0;
  const ready = form.name.trim() && doctorId;

  const collect = async (payment) => {
    setSubmitting(true);
    try {
      const result = unwrap(await api.post('/api/pos/walkin', {
        doctorId,
        patient: {
          name: form.name.trim(),
          phone: form.phone || undefined,
          age: form.age ? Number(form.age) : undefined,
          gender: form.gender,
          complaint: form.complaint || undefined,
        },
        visitType,
        discount: 0,
        ...payment,
      }));

      toast.success(`Token ${token(result.token.tokenNumber)} issued · ${result.transaction.receiptNumber}`);
      setPayOpen(false);
      setReceipt({
        transaction: result.transaction,
        token: result.token,
        doctor,
        hospital: doctor?.hospital,
      });
      setForm({ name: '', phone: '', age: '', gender: 'M', complaint: '' });
    } catch (e) {
      // The server re-asserts the tender invariant; surface its exact message.
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Walk-in registration</h2>
        <p className="text-xs text-slate-500">Register a patient, take payment and issue a token</p>
      </div>

      <div className="glass-card rounded-3xl p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Patient name" required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Rajesh Kumar" />
          </Field>
          <Field label="Mobile number">
            <Input inputMode="numeric" maxLength={10} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })} placeholder="9876543210" />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Age">
            <Input inputMode="numeric" maxLength={3} value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value.replace(/\D/g, '') })} placeholder="34" />
          </Field>
          <Field label="Gender">
            <Select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
              <option value="M">Male</option><option value="F">Female</option><option value="O">Other</option>
            </Select>
          </Field>
          <Field label="Complaint">
            <Input value={form.complaint} onChange={(e) => setForm({ ...form, complaint: e.target.value })} placeholder="Fever, cough" />
          </Field>
        </div>

        <Field label="Assign doctor" required>
          <Select value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
            <option value="">Select a doctor…</option>
            {(doctors || []).map((d) => (
              <option key={d._id} value={d._id} disabled={!d.session?.isBookingOpen}>
                {d.name} — {d.specialty}{d.session?.isBookingOpen ? '' : ' (bookings closed)'}
              </option>
            ))}
          </Select>
        </Field>

        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">Visit type</p>
          <div className="grid grid-cols-3 gap-2">
            {['fresh', 'followup', 'emergency'].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVisitType(v)}
                disabled={!doctor}
                className={clsx('p-3 rounded-2xl border-2 text-center transition disabled:opacity-50',
                  visitType === v ? 'border-teal-600 bg-teal-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300')}
              >
                <span className={clsx('block text-[11px] font-extrabold', visitType === v ? 'text-teal-700' : 'text-slate-700')}>
                  {VISIT_LABEL[v]}
                </span>
                <span className="block text-sm font-black text-slate-900 mt-1">
                  {doctor ? inr(doctor.fees[v]) : '—'}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-slate-900 text-white rounded-2xl">
          <span className="text-xs font-semibold text-slate-300">Total payable</span>
          <span className="text-2xl font-black">{inr(fee)}</span>
        </div>

        <Button onClick={() => setPayOpen(true)} disabled={!ready} className="w-full" size="lg">
          <Icon name="wallet" className="w-4 h-4" /> Collect payment &amp; issue token
        </Button>
      </div>

      <SplitPaymentModal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        totalFee={fee}
        patientName={form.name}
        onConfirm={collect}
        submitting={submitting}
      />

      <ReceiptPrintable receipt={receipt} onDone={() => setReceipt(null)} />
    </div>
  );
}
