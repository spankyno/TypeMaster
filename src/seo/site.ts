/** Constantes del sitio: única fuente para metadatos, JSON-LD, sitemap y plugin de prerenderizado. Sin dependencias de React/DOM. */
export const SITE_URL = 'https://typemaster-chi.vercel.app';
export const SITE_NAME = 'TypeMaster Pro';
export const SITE_LOCALE = 'es_ES';
export const SITE_LANG = 'es-ES';

export const AUTHOR = {
  name: 'Aitor Sánchez Gutiérrez',
  blogUrl: 'https://aitorsanchez.pages.dev',
  contactUrl: 'https://aitorsanchez.pages.dev/contacto',
  hubUrl: 'https://aitorhub.vercel.app',
} as const;

export const GOOGLE_SITE_VERIFICATION = 'MEiDmnJOvnWITHUi0HCLxuoulOEm0oTM4fwQMugxoyY';

/** Imagen para Open Graph / Twitter Cards. 1200×630 (relación 1,91:1). */
export const OG_IMAGE = {
  url: `${SITE_URL}/og-image.png`,
  width: 1200,
  height: 630,
  type: 'image/png',
  alt: 'TypeMaster Pro: entrenamiento de mecanografía al tacto en español con estadísticas de PPM, KPM y precisión',
} as const;

export const THEME_COLOR_DARK = '#0a0a0a';
export const THEME_COLOR_LIGHT = '#fafafa';

export const FEATURES = [
  'Modos de práctica: tiempo, palabras, citas, prosa y texto personalizado',
  'Entrenamiento adaptativo que desbloquea letras de forma progresiva',
  'Métricas de PPM (palabras por minuto), KPM (pulsaciones por minuto), precisión y consistencia',
  'Teclado virtual QWERTY español con mapa de calor',
  'Estadísticas, historial y logros sincronizados con tu cuenta',
] as const;
