# TypeMaster Pro ⌨️

**TypeMaster Pro** es una aplicación web moderna de alto rendimiento para el entrenamiento de mecanografía al tacto (touch typing), optimizada para teclados físicos con distribución **QWERTY Español**. Incluye un motor de progresión adaptativa, análisis en tiempo real, sintetizador de audio para teclas y persistencia en la nube con **Neon PostgreSQL** y **Vercel**.

---

## ✨ Características Principales

- **Múltiples Modos de Práctica:**
  - ⏱️ **Tiempo**: Tests de 15, 30, 60 y 120 segundos.
  - 📝 **Palabras**: Pruebas de 10, 25, 50 y 100 palabras seleccionadas.
  - 💬 **Citas**: Frases célebres y proverbios en español.
  - 🎯 **Entrenamiento Adaptativo**: Progresión algorítmica estilo Keybr que evalúa la confianza y latencia (EMA) por cada letra del abecedario, desbloqueando progresivamente nuevas teclas conforme alcanzas el dominio necesario.
  - ✏️ **Texto Personalizado**: Carga y practica con fragmentos propios o código.
- **Teclado Virtual Interactivo (QWERTY ES):**
  - Mapeo físico visual en tiempo real.
  - Mapa de calor dinámico según tasa de acierto y velocidad por tecla.
- **Métricas Profesionales y Gráficos:**
  - PPM Neto (WPM), PPM Bruto (Raw WPM), Precisión (%) y Consistencia de ritmo.
  - Evolución de velocidad segundo a segundo mediante gráficos interactivos.
  - Exportación de historial de sesiones a formato **JSON** y **CSV**.
- **Motor de Sonido Sintetizado (Web Audio API):**
  - Efectos de sonido mecánicos, máquina de escribir y burbuja sin necesidad de descargar archivos de audio externos.
- **Gamificación y Constancia:**
  - Sistema de experiencia (XP), niveles, rachas diarias y medallas de logros.
- **Arquitectura Serverless y Persistencia:**
  - Compatible con almacenamiento local en navegador (`localStorage`) y sincronización remota con base de datos serverless **Neon PostgreSQL**.

---

## 🛠️ Tecnologías Utilizadas

- **Frontend:** [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS v4](https://tailwindcss.com/)
- **Empaquetador:** [Vite](https://vite.dev/) (con partición optimizada de chunks)
- **Gestión de Estado:** [Zustand](https://github.com/pmndrs/zustand)
- **Visualización de Datos:** [Recharts](https://recharts.org/)
- **Iconografía e Interfaz:** [Lucide React](https://lucide.dev/), [Canvas Confetti](https://www.npmjs.com/package/canvas-confetti)
- **Base de Datos & Backend Serverless:** [Neon Database](https://neon.tech/) (PostgreSQL serverless con `@neondatabase/serverless`) y [Vercel](https://vercel.com/) Functions.

---

## 🚀 Ejecución Local

### Prerrequisitos
- Node.js (versión 18 o superior)
- npm o pnpm

### Pasos

1. Clona el repositorio e instala las dependencias:
   ```bash
   npm install
   ```

2. *(Opcional)* Configura la base de datos Neon:
   Copia el archivo `.env.example` como `.env`:
   ```bash
   cp .env.example .env
   ```
   Configura tu variable `DATABASE_URL` con tu cadena de conexión de Neon. Si no la configuras, la aplicación funcionará de manera local en memoria y mediante `localStorage`.

3. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

4. Abre tu navegador en `http://localhost:3000`.

---

## ☁️ Despliegue en Producción (Vercel + Neon)

Para desplegar la aplicación completa y preparar la base de datos PostgreSQL en Neon utilizando **únicamente las plataformas web** (sin comandos de consola), consulta la guía detallada:

👉 **[Guía Paso a Paso de Despliegue en Vercel y Neon](./GUIA_DESPLIEGUE_VERCEL_NEON.md)**

El esquema SQL listo para ejecutar se encuentra en [schema.sql](./schema.sql).

---

## 📜 Licencia

Distribuido bajo licencia MIT.
