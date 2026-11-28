import test from 'node:test';
import assert from 'node:assert/strict';
import { ROUTES, routeFromPath, absoluteUrl, type SeoRoute } from './routes.ts';
import { buildJsonLd, IDS } from './jsonld.ts';
import { buildHead, renderHeadHtml, renderNoscriptHtml, renderStaticHeadHtml, safeJson } from './head.ts';
import { AUTHOR, GOOGLE_SITE_VERIFICATION, OG_IMAGE, SITE_URL } from './site.ts';
import { renderSitemap } from '../../vite-plugins/seo.ts';

test('rutas: títulos y descripciones con longitud adecuada y sin duplicados', () => {
  for (const r of ROUTES) {
    assert.ok(r.title.length >= 25 && r.title.length <= 65, `título ${r.id}: ${r.title.length} caracteres`);
    assert.ok(r.description.length >= 70 && r.description.length <= 165, `descripción ${r.id}: ${r.description.length} caracteres`);
  }
  for (const key of ['title', 'description', 'path', 'h1'] as const) {
    assert.equal(new Set(ROUTES.map((r) => r[key])).size, ROUTES.length, `${key} duplicado`);
  }
});

test('routeFromPath normaliza barra final, mayúsculas, query y hash; desconocida → undefined', () => {
  assert.equal(routeFromPath('/')?.id, 'test');
  assert.equal(routeFromPath('/acerca-de/')?.id, 'about');
  assert.equal(routeFromPath('/ACERCA-DE?utm=1#x')?.id, 'about');
  assert.equal(routeFromPath('/privacidad')?.id, 'privacy');
  assert.equal(routeFromPath('/no-existe'), undefined);
  assert.equal(routeFromPath(''), routeFromPath('/'));
});

test('head: canonical absoluto, og:url coincide y robots según indexable', () => {
  for (const r of ROUTES) {
    const h = buildHead(r);
    assert.match(h.canonical, /^https:\/\/typemaster-chi\.vercel\.app\//);
    assert.equal(h.canonical, absoluteUrl(r.path));
    const get = (k: string) => h.meta.find((m) => m.key === k)!.content;
    assert.equal(get('og:url'), h.canonical);
    assert.equal(get('og:title'), r.title);
    assert.equal(get('twitter:description'), r.description);
    assert.match(get('robots'), r.indexable ? /^index, follow/ : /^noindex/);
  }
  const nf = buildHead(ROUTES[0], { notFound: true });
  assert.match(nf.meta.find((m) => m.key === 'robots')!.content, /^noindex/);
  assert.equal(nf.canonical, `${SITE_URL}/`);
});

test('head estático: verificación de Google exacta, OG 1200×630, Twitter summary_large_image', () => {
  const html = renderStaticHeadHtml();
  assert.ok(
    html.includes('<meta name="google-site-verification" content="MEiDmnJOvnWITHUi0HCLxuoulOEm0oTM4fwQMugxoyY" />')
  );
  assert.equal(GOOGLE_SITE_VERIFICATION, 'MEiDmnJOvnWITHUi0HCLxuoulOEm0oTM4fwQMugxoyY');
  assert.ok(html.includes(`<meta property="og:image" content="${SITE_URL}/og-image.png" />`));
  assert.ok(html.includes('<meta property="og:image:width" content="1200" />'));
  assert.ok(html.includes('<meta property="og:image:height" content="630" />'));
  assert.ok(html.includes('<meta name="twitter:card" content="summary_large_image" />'));
  assert.ok(/og:image:alt/.test(html) && /twitter:image:alt/.test(html));
  assert.equal(OG_IMAGE.width / OG_IMAGE.height > 1.9 && OG_IMAGE.width / OG_IMAGE.height < 1.92, true);
});

test('JSON-LD: todas las referencias @id resuelven y no hay @id duplicados', () => {
  for (const r of ROUTES) {
    const ld = buildJsonLd(r) as any;
    assert.equal(ld['@context'], 'https://schema.org');
    const nodes: any[] = ld['@graph'];
    const ids = nodes.map((n) => n['@id']);
    assert.equal(new Set(ids).size, ids.length, `@id duplicado en ${r.id}`);
    const idSet = new Set(ids);
    const walk = (v: any) => {
      if (Array.isArray(v)) return v.forEach(walk);
      if (v && typeof v === 'object') {
        const keys = Object.keys(v);
        if (keys.length === 1 && keys[0] === '@id') assert.ok(idSet.has(v['@id']), `referencia rota ${v['@id']} en ${r.id}`);
        else Object.values(v).forEach(walk);
      }
    };
    nodes.forEach((n) => Object.entries(n).filter(([k]) => k !== '@id').forEach(([, v]) => walk(v)));
    assert.ok(!JSON.stringify(ld).includes('undefined'));
  }
});

test('JSON-LD: entidades y URLs pedidas (app, blog, Aitor Hub, contacto, autor)', () => {
  const ld = buildJsonLd(ROUTES[0]) as any;
  const byId = (id: string) => ld['@graph'].find((n: any) => n['@id'] === id);

  const app = byId(IDS.webapp);
  assert.equal(app['@type'], 'WebApplication');
  assert.equal(app.url, 'https://typemaster-chi.vercel.app/');
  assert.equal(app.offers.price, '0');
  assert.equal(app.isAccessibleForFree, true);
  assert.deepEqual(app.author, { '@id': IDS.person });

  const person = byId(IDS.person);
  assert.equal(person['@type'], 'Person');
  assert.equal(person.name, 'Aitor Sánchez Gutiérrez');
  assert.equal(person.url, 'https://aitorsanchez.pages.dev');
  assert.deepEqual(person.sameAs, ['https://aitorsanchez.pages.dev', 'https://aitorhub.vercel.app']);
  assert.equal(person.contactPoint.url, 'https://aitorsanchez.pages.dev/contacto');

  assert.equal(byId(IDS.hub).url, 'https://aitorhub.vercel.app');
  assert.equal(byId(IDS.hub).name, 'Aitor Hub');
  assert.equal(byId(IDS.blog).url, AUTHOR.blogUrl);
  assert.equal(byId(IDS.contact)['@type'], 'ContactPage');
  assert.equal(byId(IDS.contact).url, 'https://aitorsanchez.pages.dev/contacto');
  assert.equal(byId(IDS.image).width, 1200);
  assert.equal(byId(IDS.image).height, 630);
});

test('JSON-LD: subpáginas con BreadcrumbList; /acerca-de es AboutPage; la home no lleva migas', () => {
  const about = (buildJsonLd(routeFromPath('/acerca-de')!) as any)['@graph'];
  assert.ok(about.some((n: any) => n['@type'] === 'AboutPage'));
  const bc = about.find((n: any) => n['@type'] === 'BreadcrumbList');
  assert.equal(bc.itemListElement.length, 2);
  assert.equal(bc.itemListElement[1].item, `${SITE_URL}/acerca-de`);
  assert.ok(!(buildJsonLd(ROUTES[0]) as any)['@graph'].some((n: any) => n['@type'] === 'BreadcrumbList'));
});

test('safeJson no permite cerrar el <script> ni inyectar HTML', () => {
  const out = safeJson({ a: '</script><script>alert(1)</script>', b: '&' });
  assert.ok(!out.includes('</script>') && !out.includes('<'));
  assert.deepEqual(JSON.parse(out), { a: '</script><script>alert(1)</script>', b: '&' });
});

test('renderHeadHtml escapa atributos y el JSON-LD es parseable desde el HTML', () => {
  const evil: SeoRoute = { ...ROUTES[0], title: 'A "cita" <b>', description: 'x & y "z"' };
  const html = renderHeadHtml(buildHead(evil));
  assert.ok(html.includes('<title>A &quot;cita&quot; &lt;b&gt;</title>'));
  assert.ok(html.includes('content="x &amp; y &quot;z&quot;"'));
  const m = html.match(/<script type="application\/ld\+json" id="seo-jsonld">([\s\S]*?)<\/script>/)!;
  assert.equal(JSON.parse(m[1])['@context'], 'https://schema.org');
});

test('sitemap: solo rutas indexables, URLs absolutas, lastmod con formato fecha', () => {
  const xml = renderSitemap();
  assert.ok(xml.startsWith('<?xml'));
  const locs = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  assert.deepEqual(locs, ROUTES.filter((r) => r.indexable).map((r) => absoluteUrl(r.path)));
  assert.ok(!xml.includes('/estadisticas'));
  assert.ok([...xml.matchAll(/<lastmod>(.*?)<\/lastmod>/g)].every((m) => /^\d{4}-\d{2}-\d{2}$/.test(m[1])));
});

test('noscript: enlaces rastreables solo a páginas indexables', () => {
  const html = renderNoscriptHtml(ROUTES[0], ROUTES);
  assert.ok(html.includes('<h1>') && html.includes('href="/acerca-de"') && html.includes('href="/privacidad"'));
  assert.ok(!html.includes('/estadisticas'));
});
