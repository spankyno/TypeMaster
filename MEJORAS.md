# Mejoras aplicadas

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
5. Las tablas `key_stats` y `achievements` existen pero no se usan: el progreso adaptativo y los logros no se sincronizan entre dispositivos.
6. La app solo funciona con teclado físico; el soporte móvil requeriría otro enfoque de captura de entrada.
7. Las pruebas de la capa Neon no pudieron ejecutarse aquí (sin `DATABASE_URL`); se probó el camino en memoria. Revisa un registro/login/test en el preview de Vercel antes de promocionar.
