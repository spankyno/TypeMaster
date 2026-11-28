import React from 'react';
import { AUTHOR, OG_IMAGE } from '../seo/site';
import {
  Info,
  Code2,
  Shield,
  Mail,
  ExternalLink,
  Check,
  X,
  BookOpen,
} from 'lucide-react';

export type AboutSection = 'about' | 'features' | 'privacy' | 'contact';
type Section = AboutSection;

interface AboutViewProps {
  section: Section;
  /** La privacidad tiene URL propia (/privacidad), así que el cambio de sección lo gestiona App */
  onSectionChange: (section: Section) => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ section, onSectionChange }) => {

  const tabs: { id: Section; label: string; icon: React.ReactNode }[] = [
    { id: 'about', label: 'Acerca de', icon: <Info className="w-3.5 h-3.5" /> },
    { id: 'features', label: 'Funciones', icon: <Code2 className="w-3.5 h-3.5" /> },
    { id: 'privacy', label: 'Privacidad', icon: <Shield className="w-3.5 h-3.5" /> },
    { id: 'contact', label: 'Contacto', icon: <Mail className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-6 py-8 animate-in fade-in duration-300">
      <h2 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-3 mb-2">
        <BookOpen className="w-8 h-8 text-amber-500" />
        Acerca de TypeMaster Pro
      </h2>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
        Entrenamiento de mecanografía de alta precisión · QWERTY Español
      </p>

      <div className="flex flex-wrap gap-2 mb-8">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => onSectionChange(t.id)}
            aria-pressed={section === t.id}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
              section === t.id
                ? 'bg-amber-500 text-neutral-950'
                : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white border border-neutral-200 dark:border-neutral-800'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {section === 'about' && (
        <div className="space-y-6 text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
          {/*
            Imagen social (Open Graph) adaptada al contenedor. width/height explícitos → el navegador reserva
            la proporción 1200:630 antes de descargar (sin CLS); WebP responsive (17 KB / 36 KB) con PNG de respaldo.
          */}
          <figure className="overflow-hidden rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-neutral-900">
            <picture>
              <source
                type="image/webp"
                srcSet="/og-image-600.webp 600w, /og-image-1200.webp 1200w"
                sizes="(min-width: 896px) 848px, calc(100vw - 48px)"
              />
              <img
                src="/og-image.png"
                width={OG_IMAGE.width}
                height={OG_IMAGE.height}
                alt={OG_IMAGE.alt}
                decoding="async"
                fetchPriority="high"
                className="block w-full h-auto"
              />
            </picture>
          </figure>

          <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-6">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-3">
              ¿Qué es TypeMaster?
            </h3>
            <p>
              TypeMaster Pro es una aplicación web de entrenamiento de mecanografía al tacto
              (touch typing), optimizada para teclados físicos con distribución{' '}
              <strong>QWERTY Español</strong>. Incluye modos de tiempo, palabras, citas, texto
              personalizado y un motor de progresión adaptativa estilo Keybr.
            </p>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-6">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-3">
              Stack tecnológico
            </h3>
            <ul className="grid sm:grid-cols-2 gap-2 list-none">
              {[
                'React 19 + TypeScript',
                'Vite 6',
                'Tailwind CSS v4',
                'Zustand (estado)',
                'Recharts (gráficos)',
                'Web Audio API (sonidos)',
                'Neon PostgreSQL (serverless)',
                'Vercel Functions (API)',
                'JWT + PBKDF2 (auth propia)',
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/50"
                >
                  <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-neutral-600 dark:text-neutral-400 text-center pt-4">
            Autor: Aitor Sánchez Gutiérrez. © 2026 — Todos los derechos reservados.
          </p>
        </div>
      )}

      {section === 'features' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-6 overflow-x-auto">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">
              Funciones según tipo de usuario
            </h3>
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400">
                  <th className="py-2 pr-4 font-semibold">Función</th>
                  <th className="py-2 px-2 font-semibold text-center">Invitado</th>
                  <th className="py-2 px-2 font-semibold text-center">Registrado</th>
                </tr>
              </thead>
              <tbody className="text-neutral-700 dark:text-neutral-300">
                {[
                  ['Practicar (tiempo, palabras, citas, custom)', true, true],
                  ['Modo adaptativo (progreso local)', true, true],
                  ['Teclado virtual y sonidos', true, true],
                  ['Estadísticas y export CSV/JSON (local)', true, true],
                  ['Guardar historial en Neon (nube)', false, true],
                  ['Sincronizar perfil y XP entre dispositivos', false, true],
                  ['Cargar historial desde la nube', false, true],
                ].map(([label, guest, reg]) => (
                  <tr
                    key={label as string}
                    className="border-b border-neutral-100 dark:border-neutral-800/80"
                  >
                    <td className="py-2.5 pr-4">{label as string}</td>
                    <td className="py-2.5 text-center">
                      {guest ? (
                        <Check className="w-4 h-4 text-emerald-500 inline" />
                      ) : (
                        <X className="w-4 h-4 text-rose-400 inline" />
                      )}
                    </td>
                    <td className="py-2.5 text-center">
                      {reg ? (
                        <Check className="w-4 h-4 text-emerald-500 inline" />
                      ) : (
                        <X className="w-4 h-4 text-rose-400 inline" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-4">
              La cuenta registrada usa email y contraseña (sin verificación de correo en esta
              versión). La sesión se gestiona con un token JWT almacenado en tu navegador.
            </p>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-6 text-sm text-neutral-700 dark:text-neutral-300">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-3">
              Funciones principales
            </h3>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Modos: tiempo (15–120 s), palabras, citas, prosa (párrafos coherentes), adaptativo y texto personalizado.</li>
              <li>Métricas: PPM neto/bruto, precisión, consistencia, serie temporal de WPM.</li>
              <li>Entrenamiento adaptativo con desbloqueo progresivo de letras.</li>
              <li>Teclado virtual QWERTY ES con mapa de calor.</li>
              <li>Sonidos sintetizados (mecánico, máquina de escribir, burbuja).</li>
              <li>Gamificación: XP, niveles, rachas y logros.</li>
            </ul>
          </div>
        </div>
      )}

      {section === 'privacy' && (
        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8 text-sm text-neutral-700 dark:text-neutral-300 space-y-5 leading-relaxed max-h-[70vh] overflow-y-auto">
          <div>
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white">
              Política de Privacidad
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">Última actualización: 26/11/2026</p>
          </div>

          <section>
            <h4 className="font-bold text-neutral-900 dark:text-white mb-1">
              1. Responsable del tratamiento
            </h4>
            <p>
              <strong>Aitor Sánchez Gutiérrez</strong>
              <br />
              Correo:{' '}
              <a
                className="text-inherit no-underline hover:underline underline-offset-2"
                href="mailto:blog.cottage627@passinbox.com"
              >
                blog.cottage627@passinbox.com
              </a>
              <br />
              Web:{' '}
              <a
                className="text-inherit no-underline hover:underline underline-offset-2"
                href="https://aitorsanchez.pages.dev/contacto"
                target="_blank"
                rel="noreferrer"
              >
                aitorsanchez.pages.dev/contacto
              </a>
            </p>
          </section>

          <section>
            <h4 className="font-bold text-neutral-900 dark:text-white mb-1">
              2. Datos que recogemos
            </h4>
            <p className="mb-2">
              <strong>Analítica (Cloudflare Workers):</strong> dirección IP, navegador y sistema
              operativo (User-Agent), URL visitada, fecha/hora, identificador de sesión (hash
              SHA-256 de app_id + IP + User-Agent).
            </p>
            <p className="mb-2">
              <strong>Cuenta registrada (opcional):</strong> nombre de usuario, correo electrónico
              y hash de contraseña (PBKDF2; la contraseña en claro no se almacena). Historial de
              tests (con sus métricas de velocidad y pulsaciones), XP, estadísticas por tecla del
              entrenamiento adaptativo, logros desbloqueados y preferencias asociadas a tu cuenta
              en Neon PostgreSQL.
            </p>
            <p>
              Los invitados solo conservan datos en el almacenamiento local del navegador
              (localStorage).
            </p>
          </section>

          <section>
            <h4 className="font-bold text-neutral-900 dark:text-white mb-1">
              3. Finalidad del tratamiento
            </h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>Estadísticas de uso del sitio (visitas, páginas, navegadores, SO).</li>
              <li>Detectar y prevenir abusos.</li>
              <li>Mejorar el funcionamiento y la experiencia.</li>
              <li>Si te registras: sincronizar progreso de mecanografía entre sesiones.</li>
            </ul>
            <p className="mt-2">No se utilizan con fines publicitarios ni se venden a terceros.</p>
          </section>

          <section>
            <h4 className="font-bold text-neutral-900 dark:text-white mb-1">4. Base legal</h4>
            <p>
              Interés legítimo (art. 6.1.f RGPD) para analítica básica. Ejecución de medidas
              precontractuales / contrato (art. 6.1.b) cuando creas una cuenta para usar la
              sincronización en la nube.
            </p>
          </section>

          <section>
            <h4 className="font-bold text-neutral-900 dark:text-white mb-1">
              5. Conservación
            </h4>
            <p>
              Datos de visitas: como máximo <strong>24 meses</strong> desde la última actividad.
              Datos de cuenta: mientras la cuenta exista o hasta que solicites su eliminación.
            </p>
          </section>

          <section>
            <h4 className="font-bold text-neutral-900 dark:text-white mb-1">
              6. Destinatarios
            </h4>
            <p>
              Analítica: <strong>Cloudflare, Inc.</strong> (Workers / D1). Persistencia de cuenta:{' '}
              <strong>Neon, Inc.</strong> (PostgreSQL) y alojamiento en <strong>Vercel</strong>.
              Actúan como encargados del tratamiento con garantías adecuadas (incl. CCT).
            </p>
          </section>

          <section>
            <h4 className="font-bold text-neutral-900 dark:text-white mb-1">
              7. Transferencias internacionales
            </h4>
            <p>
              Cloudflare, Neon y Vercel pueden procesar datos en EE. UU. u otros países bajo
              Cláusulas Contractuales Tipo y medidas complementarias del RGPD.
            </p>
          </section>

          <section>
            <h4 className="font-bold text-neutral-900 dark:text-white mb-1">
              8. Derechos
            </h4>
            <p>
              Acceso, rectificación, supresión, limitación, oposición y portabilidad. Escríbenos a{' '}
              <a
                className="text-inherit no-underline hover:underline underline-offset-2"
                href="mailto:blog.cottage627@passinbox.com"
              >
                blog.cottage627@passinbox.com
              </a>
              . También puedes reclamar ante la AEPD (
              <a
                className="text-inherit no-underline hover:underline underline-offset-2"
                href="https://www.aepd.es"
                target="_blank"
                rel="noreferrer"
              >
                www.aepd.es
              </a>
              ).
            </p>
          </section>

          <section>
            <h4 className="font-bold text-neutral-900 dark:text-white mb-1">
              9. Cookies y tecnologías similares
            </h4>
            <p>
              Se usa un script de seguimiento propio cargado desde el dominio del panel de
              analítica. No instala cookies de terceros ni realiza seguimiento publicitario. La
              sesión de cuenta usa localStorage (token JWT), no cookies de terceros.
            </p>
          </section>

          <section>
            <h4 className="font-bold text-neutral-900 dark:text-white mb-1">10. Seguridad</h4>
            <p>
              Medidas técnicas y organizativas adecuadas: hashing de contraseñas (PBKDF2), tokens
              firmados, sentencias preparadas, rate limiting donde aplica y cabeceras de seguridad.
            </p>
          </section>

          <section>
            <h4 className="font-bold text-neutral-900 dark:text-white mb-1">
              11. Cambios
            </h4>
            <p>
              Esta política puede actualizarse. La versión vigente se publica en esta página con
              la fecha de la última revisión.
            </p>
          </section>
        </div>
      )}

      {section === 'contact' && (
        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-6 space-y-4">
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Contacto y enlaces</h3>
          <ul className="space-y-3 text-sm">
            {[
              {
                label: 'Blog',
                href: AUTHOR.blogUrl,
              },
              {
                label: 'Aitor Hub',
                href: AUTHOR.hubUrl,
              },
              {
                label: 'Contacto',
                href: AUTHOR.contactUrl,
              },
              {
                label: 'Email',
                href: 'mailto:blog.cottage627@passinbox.com',
              },
            ].map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  target="_blank"
                  rel={link.label === 'Blog' ? 'author noopener' : 'noopener'}
                  className="flex items-center gap-2 text-amber-700 dark:text-amber-400 hover:underline font-medium"
                >
                  <ExternalLink className="w-4 h-4" />
                  {link.label}
                  <span className="text-neutral-400 font-normal text-xs truncate">
                    {link.href.replace('mailto:', '')}
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 pt-4 border-t border-neutral-200 dark:border-neutral-800">
            Autor: Aitor Sánchez Gutiérrez. © 2026 — Todos los derechos reservados.
          </p>
        </div>
      )}
    </div>
  );
};
