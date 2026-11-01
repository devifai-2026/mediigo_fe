import { api } from './api.js';

/**
 * Open a private document (Aadhaar, PAN, certificate) in a new tab.
 *
 * These have no public URL: the bytes come through an authenticated route,
 * so they are fetched with the session and shown from a short-lived object
 * URL. The tab is opened first, synchronously, so pop-up blockers allow it.
 */
export const openPrivateDocument = async (url) => {
  const tab = window.open('', '_blank');
  try {
    const res = await api.get(url, { responseType: 'blob' });
    const objectUrl = URL.createObjectURL(res.data);
    if (tab) tab.location.href = objectUrl;
    else window.location.href = objectUrl;
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  } catch (e) {
    tab?.close();
    throw e;
  }
};
