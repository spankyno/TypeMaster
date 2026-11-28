import type { HeadModel } from './head';

/** Actualiza <head> en navegaciones del lado cliente (History API). Solo toca los nodos marcados con data-seo. */
export function applyHead(model: HeadModel): void {
  if (typeof document === 'undefined') return;
  document.title = model.title;

  for (const m of model.meta) {
    let el = document.head.querySelector<HTMLMetaElement>(`meta[${m.attr}="${m.key}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(m.attr, m.key);
      el.setAttribute('data-seo', '');
      document.head.appendChild(el);
    }
    el.setAttribute('content', m.content);
  }

  document.head
    .querySelectorAll<HTMLLinkElement>('link[rel="canonical"], link[rel="alternate"][hreflang]')
    .forEach((el) => el.setAttribute('href', model.canonical));

  const ld = document.getElementById('seo-jsonld');
  if (ld) ld.textContent = JSON.stringify(model.jsonLd);
}
