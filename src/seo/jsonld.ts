import { AUTHOR, FEATURES, OG_IMAGE, SITE_LANG, SITE_NAME, SITE_URL } from './site';
import { ROUTES, absoluteUrl, type SeoRoute } from './routes';

/** @id estables: permiten referenciar entidades entre sí en el grafo (sin duplicar datos). */
export const IDS = {
  website: `${SITE_URL}/#website`,
  webapp: `${SITE_URL}/#webapp`,
  image: `${SITE_URL}/#primaryimage`,
  person: `${AUTHOR.blogUrl}/#person`,
  blog: `${AUTHOR.blogUrl}/#website`,
  hub: `${AUTHOR.hubUrl}/#website`,
  contact: `${AUTHOR.contactUrl}#contactpage`,
} as const;

const home = ROUTES[0];

/** Entidades comunes a todas las páginas. */
function baseGraph(): Record<string, unknown>[] {
  return [
    {
      '@type': 'WebSite',
      '@id': IDS.website,
      url: `${SITE_URL}/`,
      name: SITE_NAME,
      alternateName: 'TypeMaster',
      description: home.description,
      inLanguage: SITE_LANG,
      publisher: { '@id': IDS.person },
      author: { '@id': IDS.person },
      isPartOf: { '@id': IDS.hub },
    },
    {
      '@type': 'WebApplication',
      '@id': IDS.webapp,
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      description: home.description,
      applicationCategory: 'EducationalApplication',
      applicationSubCategory: 'Mecanografía',
      operatingSystem: 'Windows, macOS, Linux (navegador web de escritorio)',
      browserRequirements: 'Requiere JavaScript y un teclado físico',
      inLanguage: SITE_LANG,
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR', availability: 'https://schema.org/InStock' },
      featureList: [...FEATURES],
      image: { '@id': IDS.image },
      author: { '@id': IDS.person },
      creator: { '@id': IDS.person },
      publisher: { '@id': IDS.person },
      copyrightHolder: { '@id': IDS.person },
      copyrightYear: 2026,
      isPartOf: { '@id': IDS.website },
    },
    {
      '@type': 'ImageObject',
      '@id': IDS.image,
      url: OG_IMAGE.url,
      contentUrl: OG_IMAGE.url,
      width: OG_IMAGE.width,
      height: OG_IMAGE.height,
      encodingFormat: OG_IMAGE.type,
      caption: OG_IMAGE.alt,
      inLanguage: SITE_LANG,
    },
    {
      '@type': 'Person',
      '@id': IDS.person,
      name: AUTHOR.name,
      url: AUTHOR.blogUrl,
      sameAs: [AUTHOR.blogUrl, AUTHOR.hubUrl],
      mainEntityOfPage: { '@id': IDS.blog },
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        url: AUTHOR.contactUrl,
        availableLanguage: ['es'],
      },
    },
    {
      '@type': 'WebSite',
      '@id': IDS.blog,
      url: AUTHOR.blogUrl,
      name: `Blog de ${AUTHOR.name}`,
      author: { '@id': IDS.person },
      publisher: { '@id': IDS.person },
    },
    {
      '@type': 'WebSite',
      '@id': IDS.hub,
      url: AUTHOR.hubUrl,
      name: 'Aitor Hub',
      author: { '@id': IDS.person },
      publisher: { '@id': IDS.person },
    },
    {
      '@type': 'ContactPage',
      '@id': IDS.contact,
      url: AUTHOR.contactUrl,
      name: `Contacto — ${AUTHOR.name}`,
      about: { '@id': IDS.person },
      isPartOf: { '@id': IDS.blog },
    },
  ];
}

/** Grafo JSON-LD completo de una página (Google lo lee de forma agregada con un solo <script>). */
export function buildJsonLd(route: SeoRoute): Record<string, unknown> {
  const url = absoluteUrl(route.path);
  const isHome = route.path === '/';

  const page: Record<string, unknown> = {
    '@type': route.id === 'about' ? 'AboutPage' : 'WebPage',
    '@id': isHome ? `${SITE_URL}/#webpage` : `${url}#webpage`,
    url,
    name: route.title,
    description: route.description,
    inLanguage: SITE_LANG,
    isPartOf: { '@id': IDS.website },
    about: { '@id': IDS.webapp },
    primaryImageOfPage: { '@id': IDS.image },
    dateModified: route.lastmod,
    author: { '@id': IDS.person },
  };

  const graph = [...baseGraph(), page];

  if (!isHome) {
    page.breadcrumb = { '@id': `${url}#breadcrumb` };
    graph.push({
      '@type': 'BreadcrumbList',
      '@id': `${url}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: SITE_NAME, item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: route.label, item: url },
      ],
    });
  } else {
    // La home es el WebPage "principal" del WebApplication (solo aquí: en subpáginas ese nodo no existe)
    page.mainEntity = { '@id': IDS.webapp };
    const app = graph.find((n) => n['@id'] === IDS.webapp)!;
    app.mainEntityOfPage = { '@id': page['@id'] };
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}
