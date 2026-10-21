import { useEffect } from 'react';
import { SITE, absoluteUrl } from './site.js';

/**
 * Per-page <head> tags for the single-page app.
 *
 * The production host (server.js) writes the same tags into the HTML before
 * it is sent, so crawlers and link previews (WhatsApp, Instagram, Facebook)
 * that do not run JavaScript still see the right title and image. This hook
 * keeps them right as the visitor moves between pages without a reload.
 */

const DEFAULT_IMAGE = '/og/mediigo-og.png';

const upsertMeta = (attr, key, content) => {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (content == null || content === '') { el?.remove(); return; }
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
};

const upsertLink = (rel, href) => {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!href) { el?.remove(); return; }
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
};

export const pageTitle = (title) => (title ? `${title} | ${SITE.name}` : `${SITE.name} — ${SITE.tagline}`);

/**
 * @param {object} o
 * @param {string} [o.title]        Page title, without the brand suffix.
 * @param {string} [o.description]
 * @param {string} [o.path]         Canonical path (defaults to the current one, without query).
 * @param {string} [o.image]        Absolute or site-relative OG image.
 * @param {boolean} [o.noindex]     Private pages: dashboards, sign-in, bookings.
 * @param {object|object[]} [o.jsonLd] schema.org structured data.
 */
export function useSeo({ title, description, path, image, noindex = false, jsonLd, type = 'website' } = {}) {
  const ld = jsonLd ? JSON.stringify(jsonLd) : '';
  useEffect(() => {
    const fullTitle = pageTitle(title);
    const desc = description || SITE.description;
    const canonical = absoluteUrl(path ?? window.location.pathname);
    const img = image ? (image.startsWith('http') ? image : absoluteUrl(image)) : absoluteUrl(DEFAULT_IMAGE);

    document.title = fullTitle;
    upsertMeta('name', 'description', desc);
    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');
    upsertLink('canonical', noindex ? null : canonical);
    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', desc);
    upsertMeta('property', 'og:url', canonical);
    upsertMeta('property', 'og:image', img);
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('name', 'twitter:description', desc);
    upsertMeta('name', 'twitter:image', img);

    let script = document.head.querySelector('script[data-seo="page"]');
    if (ld) {
      if (!script) {
        script = document.createElement('script');
        script.type = 'application/ld+json';
        script.dataset.seo = 'page';
        document.head.appendChild(script);
      }
      script.textContent = ld;
    } else {
      script?.remove();
    }
  }, [title, description, path, image, noindex, ld, type]);
}

/** Pages nobody should find in a search engine. */
export function useNoIndex(title) {
  useSeo({ title, noindex: true });
}
