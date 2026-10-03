import { useState, useEffect } from 'react';
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
  const listedFee = doctor?.fees?.[visitType] ?? 0;
  const [overrideOn, setOverrideOn] = useState(false);
  const [customFee, setCustomFee] = useState('');
  // An empty or negative override falls back to the listed fee rather than
  // billing zero by typo.
  const parsed = Number(customFee);
  const fee = overrideOn && Number.isFinite(parsed) && parsed >= 0 ? parsed : listedFee;

  // Switching doctor or visit type changes which fee applies, so an override
  // typed against the previous one must not silently carry over and bill the
  // next patient at a rate nobody chose for them.
  useEffect(() => {
    setOverrideOn(false);
    setCustomFee('');
  }, [doctorId, visitType]);
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

        {/* The doctor's listed fee is the starting point, not the last word:
            the desk routinely adjusts at the counter — a concession, a camp
            rate, a round-off. Overriding is explicit so the listed fee is
            never changed by accident, and the original stays on screen so
            anyone can see what was altered and by how much. */}
        <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">Total payable</span>
            <span className="text-2xl font-black">{inr(fee)}</span>
          </div>

          {overrideOn ? (
            <div className="flex items-center gap-2 animate-fade-in">
              <span className="text-[11px] text-slate-400 shrink-0">₹</span>
              <input
                type="number" min="0" step="1" value={customFee}
                onChange={(e) => setCustomFee(e.target.value)}
                aria-label="Consultation charge"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-bold text-white outline-none focus:border-teal-500"
              />
              <button
                type="button"
                onClick={() => { setOverrideOn(false); setCustomFee(''); }}
                className="text-[11px] font-bold text-slate-400 hover:text-white shrink-0"
              >
                Reset
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => { setOverrideOn(true); setCustomFee(String(listedFee)); }}
              className="text-[11px] font-bold text-teal-400 hover:text-teal-300"
            >
              Change consultation charge
            </button>
          )}

          {overrideOn && Number(customFee) !== listedFee && (
            <p className="text-[10px] text-amber-300">
              Listed fee is {inr(listedFee)} — this visit is being charged {inr(fee)}.
            </p>
          )}
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
