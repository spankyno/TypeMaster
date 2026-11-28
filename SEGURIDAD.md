# Seguridad — pasos de despliegue

Cambios de esta revisión: rate limit compartido en Neon, límite por cuenta, cuotas de almacenamiento,
CSP, `/api/health` protegido y GET de sesión fuera del límite de login. Todo en planes gratuitos.

## 1. Migración de la base de datos (OBLIGATORIO, antes de desplegar)

Ejecuta esto en el SQL Editor de Neon (también está al final de `schema.sql`):

```sql
CREATE TABLE IF NOT EXISTS rate_limits (
  key      TEXT PRIMARY KEY,
  count    INTEGER NOT NULL DEFAULT 0,
  reset_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset ON rate_limits(reset_at);
```

Si no existe la tabla, la API NO falla: avisa en los logs y usa el limitador en memoria (menos eficaz).

## 2. Regla de rate limit de Vercel (panel, sin código)

Proyecto → **Firewall** → añadir regla personalizada:
- Condición: *Request Path* **starts with** `/api/`
- Acción: **Rate Limit**, clave **IP**, por ejemplo 60 peticiones por minuto (usa la ventana más cercana que ofrezca el panel).

El plan Hobby permite una regla de rate limit. Es la primera barrera (ráfagas por IP, spam a `/api/health` o `/api/tests`);
el código añade los límites finos (por cuenta, por usuario, registros globales).

## 3. Variables de entorno (Vercel → Settings → Environment Variables)

| Variable | Obligatoria | Para qué |
|---|---|---|
| `JWT_SECRET` | sí | ≥ 32 caracteres aleatorios (`openssl rand -base64 48`) |
| `HEALTH_KEY` | no | Si la defines (≥ 16 caracteres), `GET /api/health?deep=1` con la cabecera `x-health-key: <valor>` comprueba la BD. Sin ella, `deep` queda desactivado |
| `REGISTER_GLOBAL_PER_HOUR` | no | Tope de cuentas nuevas por hora en todo el sitio (por defecto 100) |

## 4. Límites aplicados

| Qué | Límite |
|---|---|
| Login por IP + cuenta | 10 / 15 min (compartido, en Neon) |
| Login por cuenta (cualquier IP) | 20 / 15 min — se reinicia con un login correcto |
| Escrituras de auth por IP | 40 / 15 min (GET de sesión no cuenta) |
| Registros por IP | 5 / hora |
| Registros globales | 100 / hora (`REGISTER_GLOBAL_PER_HOUR`) |
| `POST /api/tests` por usuario | 120 / 15 min, 20 tests por petición |
| Tests guardados por usuario | 5.000 (se borran los más antiguos) |
| Serie PPM por test | ≤ 600 puntos (se reduce por muestreo) |
| `POST /api/user` y `/api/progress` por usuario | 60 / 15 min (memoria) |

Limitación conocida: un atacante podría gastar a propósito el cupo por cuenta (20 intentos) y bloquear 15 min
el inicio de sesión de una víctima concreta; es el precio de frenar la fuerza bruta distribuida sin servicios externos.
Igual con el tope global de registros: puede agotarse a propósito (se recupera en una hora).

## 5. CSP

Está en `vercel.json` (cabecera `Content-Security-Policy`). Los dos scripts inline se movieron a
`public/theme-init.js` y `public/tracker-loader.js`, así que `script-src` no necesita `'unsafe-inline'`.

Después de desplegar, abre la web con la consola del navegador (F12) y recorre las pestañas, el modal de
cuenta, un test completo y el sonido. Si ves errores "Refused to …":
- Si el bloqueo viene del host del tracker, añade el dominio que indique el error a `script-src`/`connect-src`/`img-src`.
- Para desactivarla sin quitarla, cambia la clave `Content-Security-Policy` por `Content-Security-Policy-Report-Only`
  (solo avisa en consola, no bloquea).

Si cambias el host del tracker, actualízalo en `public/tracker-loader.js` **y** en la CSP.
