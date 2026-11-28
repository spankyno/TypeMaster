import fs from 'fs';
import path from 'path';
import type { Plugin } from 'vite';
import { ROUTES, HOME_ROUTE, absoluteUrl, routeFromPath, type SeoRoute } from '../src/seo/routes';
import { buildHead, renderHeadHtml, renderNoscriptHtml, renderStaticHeadHtml } from '../src/seo/head';

const HEAD_RE = /<!--seo:head:start-->[\s\S]*?<!--seo:head:end-->/;
const NOSCRIPT_RE = /<!--seo:noscript:start-->[\s\S]*?<!--seo:noscript:end-->/;

const headBlock = (route: SeoRoute) =>
  `<!--seo:head:start-->\n    ${renderHeadHtml(buildHead(route))}\n    <!--seo:head:end-->`;
const noscriptBlock = (route: SeoRoute) =>
  `<!--seo:noscript:start-->\n    ${renderNoscriptHtml(route, ROUTES)}\n    <!--seo:noscript:end-->`;

/** Rellena los marcadores de la plantilla para una ruta concreta. */
function applyRoute(html: string, route: SeoRoute): string {
  return html.replace(HEAD_RE, () => headBlock(route)).replace(NOSCRIPT_RE, () => noscriptBlock(route));
}

export function renderSitemap(): string {
  const urls = ROUTES.filter((r) => r.indexable)
    .map((r) => `  <url>\n    <loc>${absoluteUrl(r.path)}</loc>\n    <lastmod>${r.lastmod}</lastmod>\n  </url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

/**
 * SEO sin SSR ni dependencias:
 *  - Inyecta metadatos / JSON-LD / <noscript> en la plantilla (también en `vite dev`, según la ruta pedida).
 *  - En el build escribe una página HTML estática por ruta (dist/acerca-de.html, …) con su <head> propio,
 *    de modo que los rastreadores y los bots de redes sociales ven los metadatos correctos SIN ejecutar JS.
 *  - Genera sitemap.xml a partir de la misma lista de rutas.
 */
export function seoPlugin(): Plugin {
  let outDir = 'dist';
  return {
    name: 'typemaster-seo',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const route = routeFromPath(ctx.originalUrl ?? ctx.path ?? '/') ?? HOME_ROUTE;
        return applyRoute(html.replace('<!--seo:static-->', renderStaticHeadHtml()), route);
      },
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: renderSitemap() });
    },
    closeBundle() {
      const indexPath = path.join(outDir, 'index.html');
      if (!fs.existsSync(indexPath)) return;
      const template = fs.readFileSync(indexPath, 'utf8');
      for (const route of ROUTES) {
        if (route.path === '/') continue;
        fs.writeFileSync(path.join(outDir, `${route.path.slice(1)}.html`), applyRoute(template, route));
      }
    },
  };
}
