import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { api, unwrap } from '../../lib/api.js';
import { Button } from '../../components/ui/Button.jsx';
import { Field, Input, Select } from '../../components/ui/Field.jsx';
import { SplitPaymentModal } from '../../components/payment/SplitPaymentModal.jsx';
import { ReceiptPrintable } from '../../components/payment/ReceiptPrintable.jsx';
import { inr, token } from '../../lib/format.js';
import { ROLES, VISIT_LABEL } from '../../lib/constants.js';
import { DeskCard, PageHeader, Pill } from '../../components/desk/ui.jsx';
import { WalkInTokenCard } from '../../components/desk/WalkInTokenCard.jsx';
import clsx from 'clsx';

const VISIT_HINT = { fresh: 'Standard first visit', followup: 'Returning patient', emergency: 'Priority token' };

export default function WalkInView() {
  const { data: doctors } = useApi('/api/doctors');
  const toast = useToast();
  const { user, role } = useAuth();
  const rosterPath = role === ROLES.DOCTOR ? '/d/roster' : '/r/roster';

  const [form, setForm] = useState({ name: '', phone: '', age: '', gender: 'M', complaint: '' });
  const [doctorId, setDoctorId] = useState('');
  const [visitType, setVisitType] = useState('fresh');
  const [payOpen, setPayOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // `issued` stays on screen as the token card; `receipt` is only set while printing.
  const [issued, setIssued] = useState(null);
  const [receipt, setReceipt] = useState(null);

  // A doctor registering at their own desk is almost always registering for
  // themselves, so their name is the starting choice.
  useEffect(() => {
    if (!doctorId && role === ROLES.DOCTOR && user?.doctorId && doctors?.some((d) => d._id === user.doctorId)) {
      setDoctorId(user.doctorId);
    }
  }, [doctors, doctorId, role, user?.doctorId]);

  const doctor = (doctors || []).find((d) => d._id === doctorId);
  // "Close booking" stops app bookings only; the desk can always register.
  const onlineClosed = doctor && !doctor.session?.isBookingOpen;
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
      const slip = {
        transaction: result.transaction,
        token: result.token,
        doctor,
        // The doctors list carries no hospital; the desk user's clinic is it.
        hospital: doctor?.hospital ?? { name: user?.clinic?.name },
      };
      setIssued(slip);
      setReceipt(slip);
      setForm({ name: '', phone: '', age: '', gender: 'M', complaint: '' });
    } catch (e) {
      // The server re-asserts the tender invariant; surface its exact message.
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <PageHeader
        icon="fa-user-plus"
        title="Walk-In Patient Registration"
        subtitle="Register a patient at the desk, take payment and issue a serial token"
        badge={doctor && <Pill tone="blue">{doctor.name}</Pill>}
      />

      {onlineClosed && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs text-amber-900">
            <i className="fa-solid fa-circle-info text-amber-500 mr-1.5" aria-hidden="true" />
            Online bookings are closed for {doctor.name}. Walk-ins can still be registered here.
          </p>
          <Link to={rosterPath} className="shrink-0 text-xs font-medium text-amber-800 hover:underline">
            Manage on roster
          </Link>
        </div>
      )}

      <WalkInTokenCard
        receipt={issued}
        clinicName={user?.clinic?.name}
        onPrint={() => setReceipt(issued)}
        onClose={() => setIssued(null)}
      />

      <DeskCard className="p-4 sm:p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Full patient name" required className="sm:col-span-2">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Rajesh Khanna" />
          </Field>
          <Field label="Mobile number">
            <Input inputMode="numeric" maxLength={10} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })} placeholder="10-digit phone" />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Age (years)">
            <Input inputMode="numeric" maxLength={3} value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value.replace(/\D/g, '') })} placeholder="e.g. 42" />
          </Field>
          <Field label="Gender">
            <Select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
              <option value="M">Male</option><option value="F">Female</option><option value="O">Other</option>
            </Select>
          </Field>
          <Field label="Assign doctor" required>
            <Select value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
              <option value="">Select a doctor…</option>
              {(doctors || []).map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}{d.specialty ? ` (${d.specialty})` : ''}{d.session?.isBookingOpen ? '' : ' — online closed'}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Disease / symptoms / chief complaint">
          <Input value={form.complaint} onChange={(e) => setForm({ ...form, complaint: e.target.value })} placeholder="e.g. Viral fever, body ache, joint pain" />
        </Field>

        <div>
          <p className="text-[11px] font-medium text-slate-700 mb-2">Visit type</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {['fresh', 'followup', 'emergency'].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVisitType(v)}
                disabled={!doctor}
                aria-pressed={visitType === v}
                className={clsx('p-3.5 rounded-lg border text-left transition disabled:opacity-50',
                  visitType === v ? 'border-mg-teal bg-teal-50/60 ring-1 ring-mg-teal' : 'border-slate-200 bg-white hover:border-slate-300')}
              >
                <span className={clsx('block text-xs font-semibold', visitType === v ? 'text-mg-teal' : 'text-slate-900')}>
                  {VISIT_LABEL[v]}
                </span>
                <span className="block text-[11px] text-slate-500 mt-0.5">{VISIT_HINT[v]}</span>
                <span className="block text-sm font-semibold text-mg-blue mt-2">
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
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <span className="text-xs text-slate-500">Total collection amount</span>
            <p className="text-2xl font-semibold text-mg-blue">{inr(fee)}</p>
            {overrideOn ? (
              <div className="flex items-center gap-2 animate-fade-in">
                <span className="text-xs text-slate-400">₹</span>
                <input
                  type="number" min="0" step="1" value={customFee}
                  onChange={(e) => setCustomFee(e.target.value)}
                  aria-label="Consultation charge"
                  className="w-28 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm font-medium outline-none focus:border-mg-teal focus:ring-1 focus:ring-mg-teal"
                />
                <button type="button" onClick={() => { setOverrideOn(false); setCustomFee(''); }} className="text-[11px] font-medium text-slate-500 hover:text-slate-800">
                  Reset
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={!doctor}
                onClick={() => { setOverrideOn(true); setCustomFee(String(listedFee)); }}
                className="text-[11px] font-medium text-mg-teal hover:underline disabled:opacity-50"
              >
                Change consultation charge
              </button>
            )}
            {overrideOn && Number(customFee) !== listedFee && (
              <p className="text-[11px] text-amber-600">
                Listed fee is {inr(listedFee)} — this visit is being charged {inr(fee)}.
              </p>
            )}
          </div>

          <Button onClick={() => setPayOpen(true)} disabled={!ready} size="lg">
            <i className="fa-solid fa-print" aria-hidden="true" /> Collect payment &amp; issue token
          </Button>
        </div>
      </DeskCard>

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
