# Guía de Despliegue en Vercel y Configuración de Neon Database (100% Entorno Web)

Esta guía detalla paso a paso cómo preparar la base de datos PostgreSQL en **Neon** y desplegar la aplicación **TypeMaster** en **Vercel**, realizando todas las operaciones directamente desde el navegador web (sin necesidad de terminal ni herramientas locales).

---

## Índice
1. [Requisitos Previos](#1-requisitos-previos)
2. [Paso 1: Creación de la Base de Datos en Neon](#paso-1-creación-de-la-base-de-datos-en-neon)
3. [Paso 2: Ejecución del Esquema SQL en el SQL Editor de Neon](#paso-2-ejecución-del-esquema-sql-en-el-sql-editor-de-neon)
4. [Paso 3: Obtención de la Cadena de Conexión (`DATABASE_URL`)](#paso-3-obtención-de-la-cadena-de-conexión-database_url)
5. [Paso 4: Repositorio en GitHub (Entorno Web)](#paso-4-repositorio-en-github-entorno-web)
6. [Paso 5: Importación y Build en Vercel](#paso-5-importación-y-build-en-vercel)
7. [Paso 6: Verificación del Despliegue](#paso-6-verificación-del-despliegue)
8. [Resolución de Problemas Frecuentes](#resolución-de-problemas-frecuentes)

---

## 1. Requisitos Previos

Para completar este despliegue desde el navegador sólo necesitas:
- Una cuenta gratuita en [Neon Console](https://console.neon.tech).
- Una cuenta gratuita en [Vercel](https://vercel.com).
- Una cuenta en [GitHub](https://github.com) donde alojar el repositorio del proyecto.

---

## Paso 1: Creación de la Base de Datos en Neon

1. Abre tu navegador e inicia sesión en [https://console.neon.tech](https://console.neon.tech).
2. En el panel principal, haz clic en el botón **"New Project"** (o **"Create Project"**).
3. Configura los datos del proyecto:
   - **Project name**: `typemaster-db` (o el nombre que prefieras).
   - **Postgres version**: `16` o `17` (la versión por defecto recomendada).
   - **Cloud provider / Region**: Selecciona la región geográfica más cercana a tus usuarios (por ejemplo, `Frankfurt (eu-central-1)` para Europa, o `N. Virginia (us-east-1)` para América).
4. Haz clic en **"Create project"**.
5. Neon creará tu cluster PostgreSQL serverless en unos segundos y te mostrará la pantalla de bienvenida.

---

## Paso 2: Ejecución del Esquema SQL en el SQL Editor de Neon

1. En el menú lateral izquierdo de tu proyecto en Neon, haz clic en **"SQL Editor"**.
2. Asegúrate de que en el selector superior de base de datos esté seleccionada `neondb` (la base de datos principal por defecto).
3. Abre una nueva pestaña en el editor y copia el siguiente script SQL (también disponible en el archivo `schema.sql` del proyecto):

```sql
-- 1. Tabla de Usuarios / Perfiles
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  username VARCHAR(255) NOT NULL DEFAULT 'Mecanógrafo Invitado',
  email VARCHAR(255) DEFAULT '',
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  streak INTEGER NOT NULL DEFAULT 1,
  max_streak INTEGER NOT NULL DEFAULT 1,
  last_active_date DATE NOT NULL DEFAULT CURRENT_DATE,
  daily_goal_minutes INTEGER NOT NULL DEFAULT 10,
  minutes_today INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Resultados de Tests
CREATE TABLE IF NOT EXISTS tests (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL DEFAULT 'guest' REFERENCES users(id) ON DELETE CASCADE,
  mode VARCHAR(50) NOT NULL,
  sub_mode VARCHAR(50) NOT NULL,
  wpm INTEGER NOT NULL,
  raw_wpm INTEGER NOT NULL,
  accuracy INTEGER NOT NULL,
  consistency INTEGER NOT NULL,
  chars_correct INTEGER NOT NULL DEFAULT 0,
  chars_wrong INTEGER NOT NULL DEFAULT 0,
  chars_extra INTEGER NOT NULL DEFAULT 0,
  chars_missed INTEGER NOT NULL DEFAULT 0,
  duration_seconds NUMERIC(6, 2) NOT NULL,
  wpm_series JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla de Estadísticas de Teclas (Entrenamiento Adaptativo)
CREATE TABLE IF NOT EXISTS key_stats (
  user_id VARCHAR(255) NOT NULL DEFAULT 'guest' REFERENCES users(id) ON DELETE CASCADE,
  key_char VARCHAR(10) NOT NULL,
  samples INTEGER NOT NULL DEFAULT 0,
  avg_ms NUMERIC(8, 2) NOT NULL DEFAULT 0,
  ema_ms NUMERIC(8, 2) NOT NULL DEFAULT 300,
  errors INTEGER NOT NULL DEFAULT 0,
  confidence NUMERIC(4, 3) NOT NULL DEFAULT 0.0,
  unlocked BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, key_char)
);

-- 4. Tabla de Logros Desbloqueados
CREATE TABLE IF NOT EXISTS achievements (
  user_id VARCHAR(255) NOT NULL DEFAULT 'guest' REFERENCES users(id) ON DELETE CASCADE,
  achievement_id VARCHAR(100) NOT NULL,
  unlocked BOOLEAN NOT NULL DEFAULT TRUE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, achievement_id)
);

-- Índices de Rendimiento
CREATE INDEX IF NOT EXISTS idx_tests_user_id ON tests(user_id);
CREATE INDEX IF NOT EXISTS idx_tests_created_at ON tests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_key_stats_user ON key_stats(user_id);

-- Usuario Inicial por defecto (Invitado)
INSERT INTO users (id, username, email, xp, level, streak, max_streak, last_active_date, daily_goal_minutes, minutes_today)
VALUES ('guest', 'Mecanógrafo Invitado', 'guest@typemaster.pro', 0, 1, 1, 1, CURRENT_DATE, 10, 0)
ON CONFLICT (id) DO NOTHING;
```

4. Haz clic en el botón verde **"Run"** (o pulsa `Ctrl + Enter` / `Cmd + Enter`).
5. Comprueba en la parte inferior que el mensaje indique `Query executed successfully`.
6. En el menú lateral izquierdo, haz clic en **"Tables"** para confirmar que aparecen las 4 tablas creadas (`users`, `tests`, `key_stats`, `achievements`).

---

## Paso 3: Obtención de la Cadena de Conexión (`DATABASE_URL`)

1. En la consola de Neon, ve al menú **"Dashboard"** (o la vista principal del proyecto).
2. Localiza el bloque **"Connection Details"**:
   - En el desplegable de base de datos, confirma que está seleccionada `neondb`.
   - En el desplegable de rol/usuario, confirma que está seleccionado tu usuario (ej. `neondb_owner`).
   - Activa la casilla o selector **"Connection pooling"** (recomendado para despliegues serverless como Vercel) o usa la URL directa.
   - En el formato de conexión, selecciona **"postgres"** o **"Connection string"**.
3. Haz clic en el icono de copiar al portapapeles.
   - Tendrá un aspecto similar a:
     ```text
     postgresql://neondb_owner:npg_AbCdEf123456@ep-cool-fog-123456-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require
     ```
4. Guarda esta cadena en un lugar seguro temporalmente; la necesitaremos en el paso 5.

---

## Paso 4: Repositorio en GitHub (Entorno Web)

Si el proyecto no está aún en GitHub:
1. Accede a [https://github.com/new](https://github.com/new).
2. Asigna un nombre a tu repositorio (por ejemplo `typemaster`).
3. Elige visibilidad pública o privada y pulsa **"Create repository"**.
4. Sube los archivos del proyecto al repositorio.

---

## Paso 5: Importación y Build en Vercel

1. Inicia sesión en [https://vercel.com](https://vercel.com).
2. En tu panel de control (Dashboard), haz clic en el botón **"Add New..."** (arriba a la derecha) y selecciona **"Project"**.
3. En la lista **"Import Git Repository"**, busca tu repositorio de GitHub `typemaster` y haz clic en **"Import"**.
4. En la pantalla de configuración del proyecto (**Configure Project**):
   - **Project Name**: `typemaster` (o el que desees).
   - **Framework Preset**: Vercel detectará automáticamente `Vite`. Si no lo hiciera, selecciónalo en el desplegable.
   - **Root Directory**: Déjalo en `./`.
   - **Build and Output Settings**:
     - *Build Command*: `npm run build` (o déjalo automático).
     - *Output Directory*: `dist` (o déjalo automático).
     - *Install Command*: `npm install` (o déjalo automático).
5. Despliega la sección **"Environment Variables"**:
   - En el campo **Key** (Nombre), escribe exactamente:
     ```
     DATABASE_URL
     ```
   - En el campo **Value** (Valor), pega la cadena de conexión completa que copiaste de Neon en el [Paso 3](#paso-3-obtención-de-la-cadena-de-conexión-database_url).
   - Haz clic en **"Add"**.
6. Haz clic en el botón **"Deploy"**.
7. Vercel comenzará el proceso de compilación:
   - Descargará las dependencias.
   - Ejecutará Vite build empaquetando los activos estáticos y optimizando los chunks.
   - Configurará las funciones Serverless de `/api` (`/api/tests`, `/api/user`, `/api/health`).
   - El proceso tarda aproximadamente 30 a 50 segundos.

---

## Paso 6: Verificación del Despliegue

1. Al finalizar con éxito, verás la pantalla de felicitación con confeti de Vercel y una captura en miniatura de tu app.
2. Haz clic en el enlace o botón **"Continue to Dashboard"** o visita directamente el dominio `.vercel.app` asignado (por ejemplo, `https://typemaster-tu-usuario.vercel.app`).
3. **Verificación del API y Base de Datos**:
   - Abre en otra pestaña la URL `/api/health` de tu despliegue (ej. `https://tu-app.vercel.app/api/health`).
   - Deberás ver una respuesta JSON similar a:
     ```json
     {
       "status": "ok",
       "service": "TypeMaster API",
       "timestamp": "2026-..."
     }
     ```
4. **Verificación de la Aplicación**:
   - En la interfaz principal de TypeMaster, realiza un test corto (ej. Modo Tiempo 15s o Palabras 10).
   - Al finalizar el test, comprueba que se registran las métricas (PPM, Precisión, XP).
   - Ve a la pestaña **"Estadísticas"** y comprueba que el historial muestra el test completado.
   - Si quieres verificarlo en Neon: abre la consola de Neon, ve a **"Tables"** -> tabla `tests` -> pulsa en los datos y verás el registro insertado en tiempo real.

---

## Arquitectura Serverless en Vercel

```
[ Navegador del Usuario ]
          │
          ├──> Rutas Frontend (/) ───────────> [ Vercel Edge Network / dist ]
          │
          └──> Peticiones API (/api/*) ───────> [ Vercel Serverless Functions ]
                                                              │
                                                              └──> (Driver HTTP @neondatabase/serverless)
                                                                             │
                                                                             ▼
                                                                  [ Neon PostgreSQL Cloud ]
```

---

## Resolución de Problemas Frecuentes

### 1. Error de conexión a la base de datos (`DATABASE_URL` no encontrada o inválida)
- **Causa**: No se definió la variable de entorno en Vercel o la cadena tiene caracteres incompletos.
- **Solución**: En Vercel, ve a tu proyecto -> pestaña **Settings** -> **Environment Variables**. Comprueba que existe `DATABASE_URL` para todos los entornos (Production, Preview, Development). Si hiciste algún cambio, ve a **Deployments** y selecciona **Redeploy**.

### 2. Tablas no existen (`relation "tests" does not exist`)
- **Causa**: No se ejecutó el script `schema.sql` en Neon.
- **Solución**: Entra en [https://console.neon.tech](https://console.neon.tech), entra a **SQL Editor**, pega el contenido de `schema.sql` y pulsa **Run**.

### 3. Error 404 al recargar páginas secundarias
- **Solución**: Ya está resuelto mediante el archivo `vercel.json` incluido en el repositorio, el cual redirige las rutas al punto de entrada SPA (`index.html`) manteniendo las rutas `/api/*` operativas.
