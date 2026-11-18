import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '../../components/ui/Icon.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { confirmBookingPayment } from '../../lib/cashfree.js';
import { inr, token } from '../../lib/format.js';

/**
 * Where Cashfree sends the browser back after a payment method that leaves the
 * app (some UPI apps, netbanking). Most payments finish inside the checkout
 * modal and never come here. Asks the server for the outcome — which also
 * issues the token if the webhook has not done so yet.
 */
export default function PaymentReturnView() {
  const [params] = useSearchParams();
  const orderId = params.get('order_id');
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    if (!orderId) { setState({ loading: false, error: 'No payment reference in the link.' }); return; }
    let alive = true;
    confirmBookingPayment(orderId)
      .then((r) => { if (alive) setState({ loading: false, result: r }); })
      .catch((e) => { if (alive) setState({ loading: false, error: e.message }); });
    return () => { alive = false; };
  }, [orderId]);

  const r = state.result;
  const fee = r ? inr(r.amountPaise / 100) : '';
  let tone = 'amber';
  let title = 'Payment not completed';
  let body = 'No money was taken for this attempt and no token was booked. You can book again from the doctor’s page.';
  if (state.loading) { tone = 'slate'; title = 'Confirming your payment…'; body = 'This takes a few seconds.'; }
  else if (state.error) { body = state.error; }
  else if (r?.status === 'BOOKED') {
    tone = 'emerald';
    title = `Token ${token(r.token?.tokenNumber)} confirmed`;
    body = `Booking fee of ${fee} paid. Pay the consultation fee at the clinic’s front desk.`;
  } else if (r?.status === 'REFUNDED') {
    title = 'Booking could not be completed';
    body = `${r.failureReason || 'The slot was no longer available'}. Your ${fee} booking fee has been refunded — banks usually take 5–7 working days to show it.`;
  } else if (r?.status === 'REFUND_FAILED') {
    title = 'We need to refund you';
    body = `The booking could not be completed and the automatic refund failed. Contact support with reference ${orderId} and we will return your ${fee}.`;
  } else if (r?.status === 'PROCESSING' || r?.status === 'CREATED') {
    title = 'Still confirming your payment';
    body = 'If money was taken, your token will appear in My bookings shortly. You will not be charged twice.';
  }

  const toneClass = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    amber: 'bg-amber-50 border-amber-200 text-amber-900',
    slate: 'bg-slate-50 border-slate-200 text-slate-700',
  }[tone];

  return (
    <div className="max-w-md mx-auto py-10 px-4">
      <div className={`rounded-xl border p-5 ${toneClass}`}>
        <div className="flex items-center gap-2">
          <Icon name={tone === 'emerald' ? 'check' : 'info'} className="w-5 h-5 shrink-0" />
          <h1 className="text-base font-semibold">{title}</h1>
        </div>
        <p className="text-sm mt-2">{body}</p>
        {orderId && <p className="text-[11px] font-mono mt-3 opacity-70">Ref: {orderId}</p>}
      </div>
      {!state.loading && (
        <div className="grid grid-cols-2 gap-2 mt-4">
          <Link to="/p/explore"><Button variant="secondary" className="w-full">Find doctors</Button></Link>
          <Link to={r?.status === 'BOOKED' ? '/p/tracker' : '/p/bookings'}>
            <Button className="w-full">{r?.status === 'BOOKED' ? 'Track live queue' : 'My bookings'}</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
