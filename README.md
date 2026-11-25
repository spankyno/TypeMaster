# TypeMaster Pro ⌨️

Aplicación web de **entrenamiento de mecanografía al tacto** (touch typing) optimizada para teclados **QWERTY Español**. Incluye progresión adaptativa, métricas en tiempo real, autenticación con email/contraseña y sincronización opcional en **Neon PostgreSQL** (Vercel).

---

## Características

- **Modos de práctica**
  - ⏱️ **Tiempo**: 15 / 30 / 60 / 120 segundos
  - 📝 **Palabras**: 10 / 25 / 50 / 100 palabras
  - 💬 **Citas**: frases breves
  - 📖 **Prosa**: párrafos coherentes en español
  - 🎯 **Adaptativo**: desbloqueo progresivo de letras (estilo Keybr)
  - ✏️ **Personalizado**: pega tu propio texto
- **Teclado virtual QWERTY ES** con mapa de calor
- **Métricas**: PPM neto/bruto, precisión, consistencia, gráfico WPM
- **Sonidos** sintetizados (Web Audio API)
- **Cuentas**: invitados (solo local) vs registrados (sync en nube)
- **Gamificación**: XP, niveles, rachas, logros

---

## Invitado vs registrado

| Función | Invitado | Registrado |
|--------|----------|------------|
| Practicar todos los modos | ✅ | ✅ |
| Historial en este navegador | ✅ | ✅ |
| Export CSV / JSON | ✅ | ✅ |
| Guardar / cargar historial en Neon | ❌ | ✅ |
| Sincronizar XP y perfil entre dispositivos | ❌ | ✅ |

Al terminar un test como invitado se muestra un aviso para crear cuenta y no perder el progreso en la nube.

---

## Autenticación

- **Registro / login** con **email + contraseña** (sin verificación de correo en esta versión).
- Contraseñas: **PBKDF2-SHA256** (100 000 iteraciones) en el servidor.
- Sesión: **JWT** (30 días) en `localStorage`.
- **Rate limit** en `/api/auth` (por IP y, en login, por IP+email).
- **Cerrar sesión en todos los dispositivos**: incrementa `token_version` en la base de datos e invalida JWT antiguos.
- En **producción** es **obligatorio** definir `JWT_SECRET` (mín. 16 caracteres).

### Variables de entorno (Vercel)

```bash
DATABASE_URL=postgresql://...   # Neon
JWT_SECRET=una-cadena-larga-y-aleatoria
```

---

## Stack

- React 19, TypeScript, Vite 6, Tailwind CSS v4
- Zustand, Recharts, Lucide
- Neon (PostgreSQL serverless) + Vercel Functions
- Analítica propia (Cloudflare Workers tracker)

---

## Desarrollo local

```bash
npm install
cp .env.example .env   # opcional: DATABASE_URL y JWT_SECRET
npm run dev            # API + frontend (tsx server.ts)
# o solo frontend:
npm run dev:vite
```

Abre `http://localhost:3000` (o el puerto que indique Vite).

Sin `DATABASE_URL` la app funciona en **modo local** (memoria + `localStorage`).

---

## Base de datos (Neon)

Ejecuta el contenido de [`schema.sql`](./schema.sql) en el SQL Editor de Neon. Incluye:

- Tabla `users` con `password_hash` y `token_version`
- Tablas `tests`, `key_stats`, `achievements`
- Índice único de email (cuando no está vacío)

Migración mínima si ya tenías el esquema antiguo:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique
  ON users (LOWER(email))
  WHERE email IS NOT NULL AND email <> '';
```

Guía detallada de despliegue: [`GUIA_DESPLIEGUE_VERCEL_NEON.md`](./GUIA_DESPLIEGUE_VERCEL_NEON.md).

---

## API (resumen)

| Ruta | Método | Auth | Descripción |
|------|--------|------|-------------|
| `/api/auth` | POST `action=register\|login\|logout-all` | logout-all: JWT | Registro, login, revocar sesiones |
| `/api/auth` | GET | JWT | Sesión actual |
| `/api/tests` | GET / POST | JWT | Historial / guardar test |
| `/api/user` | GET / POST | JWT | Perfil |
| `/api/health` | GET | — | Estado de Neon |

---

## Scripts

```bash
npm run dev       # servidor de desarrollo integrado
npm run build     # build de producción
npm run preview   # previsualizar build
npm run lint      # tsc --noEmit
```

---

## Autor y licencia

**Autor:** Aitor Sánchez Gutiérrez. © 2026 — Todos los derechos reservados.

- Blog: https://aitorsanchez.pages.dev/
- Hub: https://aitorhub.vercel.app/
- Contacto: https://aitorsanchez.pages.dev/contacto/

La política de privacidad está en la app (pestaña **Acerca de → Privacidad**).

Distribuido bajo licencia MIT salvo que se indique lo contrario en el repositorio.
