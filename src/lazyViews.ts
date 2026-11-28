import { lazy } from 'react';
import type { RouteId } from './seo/routes';

/**
 * Carga diferida de vistas y modales pesados. La home solo descarga lo necesario para escribir;
 * recharts (~113 KB gz) únicamente se pide al abrir Estadísticas o al terminar un test.
 */
const loaders = {
  stats: () => import('./components/StatsView'),
  adaptive: () => import('./components/AdaptiveView'),
  about: () => import('./components/AboutView'),
  achievements: () => import('./components/AchievementsModal'),
  auth: () => import('./components/AuthModal'),
  result: () => import('./components/TestResultModal'),
};

export const StatsView = lazy(() => loaders.stats().then((m) => ({ default: m.StatsView })));
export const AdaptiveView = lazy(() => loaders.adaptive().then((m) => ({ default: m.AdaptiveView })));
export const AboutView = lazy(() => loaders.about().then((m) => ({ default: m.AboutView })));
export const AchievementsModal = lazy(() => loaders.achievements().then((m) => ({ default: m.AchievementsModal })));
export const AuthModal = lazy(() => loaders.auth().then((m) => ({ default: m.AuthModal })));
export const TestResultModal = lazy(() => loaders.result().then((m) => ({ default: m.TestResultModal })));

/** Precarga (hover/focus en un enlace, o mientras el usuario escribe) para que la navegación sea instantánea. */
export function preloadRoute(id: RouteId): void {
  if (id === 'stats') void loaders.stats();
  else if (id === 'adaptive') void loaders.adaptive();
  else if (id === 'about' || id === 'privacy') void loaders.about();
}
export const preloadResult = () => void loaders.result();
export const preloadAuth = () => void loaders.auth();
export const preloadAchievements = () => void loaders.achievements();
