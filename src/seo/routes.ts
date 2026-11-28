import { SITE_URL } from './site';

export type RouteId = 'test' | 'adaptive' | 'stats' | 'about' | 'privacy';

export interface SeoRoute {
  id: RouteId;
  /** Ruta pública sin barra final (la home es '/') */
  path: string;
  title: string;
  description: string;
  /** H1 visible para lectores de pantalla y rastreadores */
  h1: string;
  /** Nombre corto para migas de pan y enlaces */
  label: string;
  /** false → <meta robots noindex> y fuera del sitemap (contenido personal/vacío para un rastreador) */
  indexable: boolean;
  /** Fecha de la última modificación REAL del contenido de la página (YYYY-MM-DD). Actualizar al cambiarlo. */
  lastmod: string;
  /** Texto para <noscript> / navegadores sin JS */
  noscript: string;
}

export const ROUTES: readonly SeoRoute[] = [
  {
    id: 'test',
    path: '/',
    title: 'TypeMaster Pro — Aprende mecanografía al tacto en español',
    description:
      'Practica mecanografía al tacto con teclado QWERTY español: tiempo, palabras, prosa y entrenamiento adaptativo. Mide tus PPM, KPM y precisión. Gratis.',
    h1: 'TypeMaster Pro: entrenamiento de mecanografía al tacto en español',
    label: 'Práctica',
    indexable: true,
    lastmod: '2026-11-27',
    noscript:
      'TypeMaster Pro es una aplicación web gratuita para aprender y mejorar la mecanografía al tacto con teclado QWERTY español. Incluye modos de tiempo, palabras, citas y prosa, entrenamiento adaptativo y estadísticas de PPM, KPM y precisión. Necesita JavaScript para funcionar.',
  },
  {
    id: 'adaptive',
    path: '/adaptativo',
    title: 'Entrenamiento adaptativo de mecanografía | TypeMaster Pro',
    description:
      'Desbloquea letras de forma progresiva y practica tus teclas más lentas o con más errores. Entrenamiento adaptativo de mecanografía al tacto en español.',
    h1: 'Entrenamiento adaptativo de mecanografía',
    label: 'Adaptativo',
    indexable: true,
    lastmod: '2026-11-27',
    noscript:
      'El modo adaptativo de TypeMaster Pro empieza con unas pocas letras y desbloquea el resto cuando dominas las anteriores, generando palabras que refuerzan tus teclas más lentas o con más errores. Necesita JavaScript para funcionar.',
  },
  {
    id: 'stats',
    path: '/estadisticas',
    title: 'Estadísticas de mecanografía | TypeMaster Pro',
    description: 'Consulta tu historial de PPM, KPM, precisión y consistencia en TypeMaster Pro.',
    h1: 'Estadísticas de mecanografía',
    label: 'Estadísticas',
    indexable: false,
    lastmod: '2026-11-27',
    noscript: 'Tus estadísticas de mecanografía (PPM, KPM, precisión y consistencia). Necesita JavaScript para funcionar.',
  },
  {
    id: 'about',
    path: '/acerca-de',
    title: 'Acerca de TypeMaster Pro — Funciones, privacidad y contacto',
    description:
      'Conoce TypeMaster Pro, la app gratuita de mecanografía al tacto creada por Aitor Sánchez Gutiérrez: funciones, política de privacidad y contacto.',
    h1: 'Acerca de TypeMaster Pro',
    label: 'Acerca de',
    indexable: true,
    lastmod: '2026-11-27',
    noscript:
      'TypeMaster Pro es una aplicación web de entrenamiento de mecanografía al tacto, creada por Aitor Sánchez Gutiérrez. Conoce sus funciones, la política de privacidad y cómo contactar con el autor.',
  },
  {
    id: 'privacy',
    path: '/privacidad',
    title: 'Política de privacidad | TypeMaster Pro',
    description:
      'Política de privacidad de TypeMaster Pro: qué datos se recogen, para qué se usan, cuánto tiempo se conservan y cómo ejercer tus derechos RGPD.',
    h1: 'Política de privacidad de TypeMaster Pro',
    label: 'Privacidad',
    indexable: true,
    lastmod: '2026-11-27',
    noscript:
      'Política de privacidad de TypeMaster Pro: responsable del tratamiento, datos recogidos, finalidad, base legal, conservación, destinatarios y derechos RGPD.',
  },
];

export const HOME_ROUTE = ROUTES[0];

export const absoluteUrl = (path: string) => (path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path}`);

export const getRoute = (id: RouteId): SeoRoute => ROUTES.find((r) => r.id === id) ?? HOME_ROUTE;

/** Normaliza (sin query/hash, sin barra final, minúsculas) y busca la ruta. undefined → no existe (404 en cliente). */
export function routeFromPath(pathname: string): SeoRoute | undefined {
  const clean = (pathname.split(/[?#]/)[0] || '/').replace(/\/+$/, '').toLowerCase() || '/';
  return ROUTES.find((r) => r.path === clean);
}
