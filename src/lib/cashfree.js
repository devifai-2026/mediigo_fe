import { api, unwrap } from './api.js';

/**
 * Cashfree Checkout, loaded on demand: only patients who actually pay the
 * booking fee download it. Docs: https://www.cashfree.com/docs/payments/online/web/redirect
 */
const SDK_URL = 'https://sdk.cashfree.com/js/v3/cashfree.js';
let sdkPromise = null;

const loadSdk = () => {
  if (window.Cashfree) return Promise.resolve(window.Cashfree);
  if (!sdkPromise) {
    sdkPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SDK_URL;
      s.async = true;
      s.onload = () => (window.Cashfree ? resolve(window.Cashfree) : reject(new Error('Payment page failed to load')));
      s.onerror = () => { sdkPromise = null; reject(new Error('Could not load the payment page — check your connection')); };
      document.head.appendChild(s);
    });
  }
  return sdkPromise;
};

/**
 * Opens Cashfree's checkout as a modal over the app. Resolves when the
 * patient finishes or closes it. Whatever it reports, the server is asked
 * afterwards — the browser's word is never what issues a token.
 */
export const openCheckout = async ({ paymentSessionId, mode }) => {
  const Cashfree = await loadSdk();
  const cashfree = Cashfree({ mode: mode === 'production' ? 'production' : 'sandbox' });
  return cashfree.checkout({ paymentSessionId, redirectTarget: '_modal' });
};

const DONE = ['BOOKED', 'REFUNDED', 'REFUND_FAILED', 'EXPIRED'];

/**
 * Ask the server whether the order is paid and the token issued. A UPI payment
 * can take a few seconds to settle after the modal closes, so this retries
 * briefly while the order is still open or being processed.
 */
export const confirmBookingPayment = async (orderId, { attempts = 6, delayMs = 2000 } = {}) => {
  let last = null;
  for (let i = 0; i < attempts; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    last = unwrap(await api.post(`/api/payments/booking/${encodeURIComponent(orderId)}/confirm`));
    if (DONE.includes(last.status)) return last;
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return last;
};
