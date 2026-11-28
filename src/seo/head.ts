import { AUTHOR, GOOGLE_SITE_VERIFICATION, OG_IMAGE, SITE_LOCALE, SITE_NAME } from './site';
import { HOME_ROUTE, absoluteUrl, type SeoRoute } from './routes';
import { buildJsonLd } from './jsonld';

export interface HeadMeta {
  attr: 'name' | 'property';
  key: string;
  content: string;
}

export interface HeadModel {
  title: string;
  canonical: string;
  meta: HeadMeta[];
  jsonLd: Record<string, unknown>;
}

const ROBOTS_INDEX = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
const ROBOTS_NOINDEX = 'noindex, follow';

/** Todo lo que cambia de una página a otra (lo demás vive en la plantilla index.html). */
export function buildHead(route: SeoRoute, opts: { notFound?: boolean } = {}): HeadModel {
  if (opts.notFound) {
    const title = `Página no encontrada | ${SITE_NAME}`;
    const description = 'La página que buscas no existe. Vuelve al inicio de TypeMaster Pro.';
    const canonical = absoluteUrl(HOME_ROUTE.path);
    return {
      title,
      canonical,
      meta: [
        { attr: 'name', key: 'description', content: description },
        { attr: 'name', key: 'robots', content: ROBOTS_NOINDEX },
        { attr: 'property', key: 'og:title', content: title },
        { attr: 'property', key: 'og:description', content: description },
        { attr: 'property', key: 'og:url', content: canonical },
        { attr: 'name', key: 'twitter:title', content: title },
        { attr: 'name', key: 'twitter:description', content: description },
      ],
      jsonLd: buildJsonLd(HOME_ROUTE),
    };
  }

  const url = absoluteUrl(route.path);
  return {
    title: route.title,
    canonical: url,
    meta: [
      { attr: 'name', key: 'description', content: route.description },
      { attr: 'name', key: 'robots', content: route.indexable ? ROBOTS_INDEX : ROBOTS_NOINDEX },
      { attr: 'property', key: 'og:title', content: route.title },
      { attr: 'property', key: 'og:description', content: route.description },
      { attr: 'property', key: 'og:url', content: url },
      { attr: 'name', key: 'twitter:title', content: route.title },
      { attr: 'name', key: 'twitter:description', content: route.description },
    ],
    jsonLd: buildJsonLd(route),
  };
}

export const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** JSON seguro dentro de <script>: evita cerrar la etiqueta con "</script>" o romper el parseo HTML. */
export const safeJson = (obj: unknown) =>
  JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');

/** HTML de las etiquetas variables (se inyecta en build y se re-escribe por ruta al prerenderizar). */
export function renderHeadHtml(model: HeadModel): string {
  const lines = [
    `<title>${escapeHtml(model.title)}</title>`,
    ...model.meta.map((m) => `<meta ${m.attr}="${m.key}" content="${escapeHtml(m.content)}" data-seo />`),
    `<link rel="canonical" href="${escapeHtml(model.canonical)}" data-seo />`,
    `<link rel="alternate" hreflang="es" href="${escapeHtml(model.canonical)}" data-seo />`,
    `<link rel="alternate" hreflang="x-default" href="${escapeHtml(model.canonical)}" data-seo />`,
    `<script type="application/ld+json" id="seo-jsonld">${safeJson(model.jsonLd)}</script>`,
  ];
  return lines.join('\n    ');
}

/** Etiquetas iguales en todas las páginas, derivadas de las constantes del sitio. */
export function renderStaticHeadHtml(): string {
  const e = escapeHtml;
  return [
    `<meta name="google-site-verification" content="${e(GOOGLE_SITE_VERIFICATION)}" />`,
    `<meta name="author" content="${e(AUTHOR.name)}" />`,
    `<link rel="author" href="${e(AUTHOR.blogUrl)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${e(SITE_NAME)}" />`,
    `<meta property="og:locale" content="${SITE_LOCALE}" />`,
    `<meta property="og:image" content="${e(OG_IMAGE.url)}" />`,
    `<meta property="og:image:secure_url" content="${e(OG_IMAGE.url)}" />`,
    `<meta property="og:image:type" content="${OG_IMAGE.type}" />`,
    `<meta property="og:image:width" content="${OG_IMAGE.width}" />`,
    `<meta property="og:image:height" content="${OG_IMAGE.height}" />`,
    `<meta property="og:image:alt" content="${e(OG_IMAGE.alt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:image" content="${e(OG_IMAGE.url)}" />`,
    `<meta name="twitter:image:alt" content="${e(OG_IMAGE.alt)}" />`,
  ].join('\n    ');
}

/** Contenido para <noscript>: texto y enlaces rastreables (los rastreadores sin JS siguen viendo la estructura del sitio). */
export function renderNoscriptHtml(route: SeoRoute, routes: readonly SeoRoute[]): string {
  const links = routes
    .filter((r) => r.indexable)
    .map((r) => `<li><a href="${r.path}">${escapeHtml(r.label)}</a></li>`)
    .join('');
  return `<noscript>
      <h1>${escapeHtml(route.h1)}</h1>
      <p>${escapeHtml(route.noscript)}</p>
      <nav aria-label="Navegación principal"><ul>${links}</ul></nav>
    </noscript>`;
}

export { OG_IMAGE };
