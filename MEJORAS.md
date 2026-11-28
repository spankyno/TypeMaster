# Mejoras aplicadas

## Ronda 4 — SEO y Core Web Vitals
**Resultado (Lighthouse móvil simulado, mediana de 5 ejecuciones con Brotli, home):** Rendimiento 88 → 93 · LCP 2,59 → 1,92 s · TBT 395 → 300 ms · transferido 204 → 99 KiB · CLS 0. Auditoría completa final en las 4 páginas indexables: **SEO 100, Accesibilidad 100** (antes 92 y 87), Rendimiento 96–99, Buenas prácticas 96 (único aviso: el tracker no resuelve DNS en el sandbox).

- **Etiqueta `google-site-verification`** añadida (exactamente como indicaste) en todas las páginas.
- **Imagen `og-image.png` 1200×630** (31 KB) + variantes WebP 1200/600 para «Acerca de», donde se muestra adaptada al contenedor con `width`/`height` (sin CLS) y `srcset`. Open Graph completo (`og:image`, `secure_url`, `type`, `width`, `height`, `alt`, `og:locale`, `og:site_name`…) y Twitter `summary_large_image`.
- **URLs reales por vista** (`/adaptativo`, `/acerca-de`, `/privacidad`; `/estadisticas` es `noindex`) con History API, enlaces `<a href>` rastreables, `<h1>` único por vista, canonical/hreflang por página y **prerender estático por ruta** (los rastreadores ven el `<head>` correcto sin ejecutar JS). `sitemap.xml`, `robots.txt` (bloquea `/api/`), `manifest.webmanifest`, favicon SVG/ICO y `apple-touch-icon`. 404 real.
- **JSON-LD** (`@graph` con `@id` enlazados): `WebSite`, `WebApplication` (gratuita, EUR 0), `ImageObject`, `Person` (**Aitor Sánchez Gutiérrez**, con `sameAs` a tu blog y Aitor Hub y `contactPoint` a `/contacto`), `WebSite` del blog y de **Aitor Hub**, `ContactPage`, `AboutPage`/`WebPage` y `BreadcrumbList` en subpáginas. Un test verifica que ninguna referencia `@id` quede rota (detectó y corregí un error mío).
- **Core Web Vitals / cuota:**
  - `manualChunks` arrastraba React al chunk de recharts y anulaba el lazy-loading → eliminado; vistas y modales con `React.lazy`, `canvas-confetti` bajo demanda.
  - `/api/health` se llamaba en **cada visita** (bots incluidos) y hacía `SELECT 1` a Neon → ahora superficial, `?deep=1` solo al abrir el panel de cuenta, caché CDN de 60 s. Los invitados no consultan la BD.
  - Tracker de terceros diferido a tras `load` + ocio y excluido para rastreadores.
  - Fuentes: no se cargan fuentes web (pila del sistema). Imágenes: solo la de «Acerca de», con dimensiones explícitas.
  - **Middleware**: no existe (cero invocaciones de Edge); se documenta el matcher recomendado por si se añade.
  - Cabeceras de caché por tipo de recurso en `vercel.json`; `cleanUrls`, `trailingSlash: false` y sin rewrite general (404 reales).
- **Accesibilidad / usabilidad móvil:** contrastes corregidos (modos de práctica, teclado, tarjetas de teclas bloqueadas, botón «Iniciar sesión» sin `animate-pulse` infinito), botón sin nombre accesible, y **desbordamiento horizontal arreglado** (ya existía en el original) en 360–1440 px.
- Política de privacidad: nueva URL propia `/privacidad`.
- 11 tests nuevos (43 en total): longitud de títulos/descripciones, integridad del grafo JSON-LD, escapado, sitemap, rutas. `npm run check:seo` valida el HTML generado.

> **Verifica en un deploy de preview de Vercel** (no he podido probarlo allí): `curl -I /acerca-de` → 200, `/no-existe` → 404, y las cabeceras de `vercel.json`. Checklist en la guía de despliegue.
> **Limitaciones:** no he podido ejecutar el *Rich Results Test* ni los depuradores de Facebook/LinkedIn/X (sin red); el JSON-LD se validó estructuralmente con tests. Si tu tracker mide páginas vistas, comprueba que registra las navegaciones del lado cliente (History API).

## Ronda 3
- **Sincronización del progreso adaptativo y los logros** (tablas `key_stats` y `achievements`, que ya existían: **no requiere migración**). Nuevo endpoint `/api/progress`. Se sincroniza al abrir la app, al iniciar sesión/registrarse y tras cada test.
  - Fusión entre dispositivos: logros = unión; por tecla gana el registro con más muestras; "desbloqueada" nunca se pierde.
  - El progreso hecho como invitado se sube al registrarse o entrar.
  - Al cerrar sesión se limpia el progreso local (ya está en la nube) para no mezclarlo con otra cuenta.
  - "Reiniciar progreso adaptativo" con sesión iniciada también borra `key_stats` en la nube (los logros se conservan).
  - Limitación conocida: si reinicias en un dispositivo y otro dispositivo aún guarda progreso local antiguo, al sincronizarse lo volvería a subir.
  - `problemWords` (palabras difíciles) sigue siendo solo local.
- **Política de privacidad**: los enlaces ya no resaltan (mismo color que el texto, sin subrayado; subrayan solo al pasar el ratón). Además se actualizó el apartado 2 (datos recogidos) y la fecha de "última actualización" porque ahora se guardan en la nube estadísticas por tecla y logros: revisa que el texto te encaje.
- La guía de despliegue recoge ya las columnas `kpm`/`keystrokes` y el endpoint `/api/progress`.


## Ronda 2
- **"Tiempo practicado = NaNh"**: Neon devuelve `NUMERIC` como string (`"30.00"`), así que `reduce` concatenaba cadenas en vez de sumar. Corregido en tres capas: el servidor castea a `float8`, el cliente normaliza todos los tests (también los ya guardados en `localStorage`, que arrastraban strings) y el total se muestra como `45 s` / `13 min` / `1,5 h`.
- **Pulsaciones por minuto (KPM)**: se registran `kpm` y `keystrokes` (todas las teclas pulsadas, aciertos y errores, sin Retroceso). Aparece en vivo, en el resultado, en las estadísticas (tarjeta, tabla, gráfica conmutable PPM/KPM), en el CSV y en la base de datos. Los tests antiguos se estiman como PPM bruto × 5.
- **Prosa sin scroll vertical**: ya no hay `overflow-y-auto`. Los textos de hasta ~700 caracteres se muestran enteros en el cuadro; los más largos (modo Tiempo, prosa de 3–5 párrafos…) usan una ventana de 4 líneas que avanza sola dejando la línea actual como segunda, de modo que siempre ves las siguientes. La letra se reduce en textos largos.
- **Longitud de prosa configurable**: 1, 2, 3 o 5 párrafos (≈50 / 100 / 140 / 235 palabras), guardada en las preferencias.
- Etiquetas de modo legibles en el historial ("Prosa · 2 párr.", "Tiempo · 30 s").
- Verificado en Chromium (Playwright) y con 25 tests unitarios, incluida la regresión del `NaN`.

> **Migración de BD (hazla antes de desplegar):** ejecuta las 3 sentencias `ALTER/UPDATE` de `schema.sql` (sección "Migración segura"). Son idempotentes y el código antiguo sigue funcionando con las columnas nuevas.


## Bugs corregidos
| Problema | Solución |
|---|---|
| **Modo Tiempo**: solo se generaban 25 palabras; al terminarlas todo lo tecleado contaba como "extra" | Texto inicial de 60 palabras que se amplía automáticamente antes de agotarse |
| **PPM final obsoleto**: se calculaba en la última pulsación, no al acabar el test | Cálculo con el reloj real (`performance.now`) en el tick y al finalizar; el PPM en vivo baja si dejas de teclear |
| **Temporizador por ticks**: se desfasa en pestañas en segundo plano | Tiempo medido por timestamp (tick cada 250 ms) |
| **Racha y minutos de hoy nunca se actualizaban** (el logro "Constancia" era imposible) | Racha diaria con fecha local, `maxStreak`, reinicio de minutos y racha rota al abrir la app |
| XP mostrado en el resultado ≠ XP concedido | `lastXpEarned` única fuente de verdad |
| Logro "Cirujano del Teclado": descripción 25 palabras / código 20 caracteres | Alineado (125 caracteres) |
| **Modo estricto** no contaba errores (precisión siempre 100 %) | Errores contabilizados en precisión y en el motor adaptativo |
| Palabras partidas entre líneas; re-render de todos los caracteres en cada pulsación | Render por palabras + `Char` memoizado; cursor sin saltos de layout |
| Texto personalizado con saltos de línea imposible de teclear | Se normalizan espacios/saltos (máx. 5000) |
| Teclado virtual no resaltaba letras con tilde | Mapeo a la tecla base (`á`→`a`, conserva `ñ`) |
| `problemWords` del modo adaptativo era código muerto | Se registran por palabra, se persisten (acotado) y se usan |
| Barajado sesgado (`sort(() => 0.5 - Math.random())`) y sin repetición controlada | Fisher–Yates, sin duplicados consecutivos |
| Historial de invitado se perdía/quedaba solo en local al registrarse o iniciar sesión | Fusión por id y subida automática (más XP de invitado) |
| Export CSV sin escapar (rompía con `#`, comas) | Blob + escape + BOM UTF-8 |
| Error `tsc` en `TypingArea` | Corregido (`npm run lint` limpio) |

## Backend y seguridad
- `server.ts` (dev) ya **no** reimplementa una API insegura sin auth: monta los handlers reales de `api/`.
- Validación y saneado de todo lo que llega del cliente (`api/_validate.ts`): rangos, PPM neto ≤ bruto, ids y fechas.
- `saveUser` hace *merge* (antes reseteaba a valores por defecto los campos omitidos) y XP/nivel/maxStreak no retroceden.
- Tokens de cuentas inexistentes ya no son válidos; errores de BD ya no se interpretan como "versión 0".
- PBKDF2 600 000 iteraciones **asíncrono** (no bloquea) con rehash transparente; contraseña mín. 8 / máx. 200.
- Hash señuelo en login para no revelar por tiempo qué correos existen.
- Token solo por cabecera (no query/body); CORS `*` eliminado (same-origin); `Cache-Control: no-store`.
- Inserción de tests idempotente (`ON CONFLICT DO NOTHING`) y por lote; ids de usuario/test con UUID.
- Errores internos ya no se filtran al cliente; `/api/health` no expone el mensaje de la BD.
- Email duplicado protegido también por la restricción única (carreras).
- Cabeceras de seguridad y caché inmutable para `/assets` en `vercel.json`.

## Otros
- `index.html`: favicon, `theme-color`, canonical/OG, tema aplicado antes del primer pintado (sin parpadeo).
- 19 tests unitarios (`npm test`): PPM, racha, validación, hash, JWT.
- Eliminado `src/lib/db.ts` (reexportaba código de servidor al bundle del cliente).

## Pendiente / recomendaciones (no aplicado)
1. **Migrar a Neon**: ejecuta de nuevo `schema.sql` (añade el índice compuesto `idx_tests_user_created`). No hay cambios de columnas.
2. **Definir `JWT_SECRET`** en Vercel si aún no existe (obligatorio en producción).
3. Rate-limit compartido (Upstash/Vercel KV) para garantías reales entre instancias.
4. JWT en `localStorage` es vulnerable a XSS; la alternativa es cookie `HttpOnly` + CSRF. Añadir una CSP (requiere permitir el script del tracker de Cloudflare).
6. La app solo funciona con teclado físico; el soporte móvil requeriría otro enfoque de captura de entrada.
7. Las pruebas de la capa Neon no pudieron ejecutarse aquí (sin `DATABASE_URL`); se probó el camino en memoria. Revisa un registro/login/test en el preview de Vercel antes de promocionar.
