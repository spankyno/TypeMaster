// Verifica el SEO del HTML ya construido (dist/). Uso: npm run build && npm run check:seo
import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
const pages = { 'index.html': '/', 'adaptativo.html': '/adaptativo', 'estadisticas.html': '/estadisticas', 'acerca-de.html': '/acerca-de', 'privacidad.html': '/privacidad' };
const SITE = 'https://typemaster-chi.vercel.app';
let failures = 0;
const check = (ok, msg) => { if (!ok) { failures++; console.error('✗', msg); } };
const count = (html, re) => (html.match(re) || []).length;

for (const [file, route] of Object.entries(pages)) {
  const f = path.join(dist, file);
  if (!fs.existsSync(f)) { check(false, `${file} no existe`); continue; }
  const html = fs.readFileSync(f, 'utf8');
  const tag = (s) => `${file}: ${s}`;
  check(count(html, /<title>/g) === 1, tag('debe haber exactamente 1 <title>'));
  check(count(html, /name="description"/g) === 1, tag('1 meta description'));
  check(count(html, /rel="canonical"/g) === 1, tag('1 canonical'));
  check(html.includes(`rel="canonical" href="${SITE}${route === '/' ? '/' : route}"`), tag('canonical correcto'));
  check(count(html, /property="og:title"/g) === 1 && count(html, /property="og:image"/g) === 1, tag('Open Graph completo, sin duplicados'));
  check(count(html, /name="twitter:card" content="summary_large_image"/g) === 1, tag('Twitter card'));
  check(html.includes('name="google-site-verification" content="MEiDmnJOvnWITHUi0HCLxuoulOEm0oTM4fwQMugxoyY"'), tag('google-site-verification'));
  check(count(html, /<h1>/g) === 1, tag('1 <h1> en <noscript>'));
  const ld = html.match(/<script type="application\/ld\+json" id="seo-jsonld">([\s\S]*?)<\/script>/);
  check(!!ld, tag('JSON-LD presente'));
  if (ld) { try { JSON.parse(ld[1]); } catch { check(false, tag('JSON-LD no es JSON válido')); } }
  check(/<script type="module"[^>]*src="\/assets\//.test(html), tag('script de la app enlazado'));
}
for (const f of ['robots.txt', 'sitemap.xml', 'manifest.webmanifest', 'og-image.png', 'favicon.ico', '404.html']) check(fs.existsSync(path.join(dist, f)), `${f} falta en dist/`);
const robots = fs.readFileSync(path.join(dist, 'robots.txt'), 'utf8');
check(robots.includes(`Sitemap: ${SITE}/sitemap.xml`) && robots.includes('Disallow: /api/'), 'robots.txt: sitemap y Disallow /api/');
const og = fs.readFileSync(path.join(dist, 'og-image.png'));
check(og.readUInt32BE(16) === 1200 && og.readUInt32BE(20) === 630, 'og-image.png debe medir 1200×630');
check(og.length < 300 * 1024, `og-image.png pesa ${(og.length / 1024).toFixed(0)} KB (límite 300 KB)`);
const stats = fs.readFileSync(path.join(dist, 'estadisticas.html'), 'utf8');
check(/name="robots" content="noindex/.test(stats), 'estadisticas.html debe ser noindex');
check(!fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8').includes('estadisticas'), 'sitemap no debe incluir /estadisticas');

console.log(failures === 0 ? '✓ SEO de dist/ correcto' : `\n${failures} problema(s)`);
process.exit(failures ? 1 : 0);
