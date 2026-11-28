import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { NavLink } from './components/NavLink';
import { TypingArea } from './components/TypingArea';
import { DesktopWarning } from './components/DesktopWarning';
import {
  AboutView,
  AchievementsModal,
  AdaptiveView,
  AuthModal,
  StatsView,
} from './lazyViews';
import { useTypingStore } from './store/useTypingStore';
import { Database } from 'lucide-react';
import { getRoute, routeFromPath, type RouteId } from './seo/routes';
import { buildHead } from './seo/head';
import { applyHead } from './seo/applyHead';
import { AUTHOR } from './seo/site';

function loadDarkMode(): boolean {
  try {
    const stored = localStorage.getItem('typemaster_darkmode');
    if (stored !== null) return stored === 'true';
  } catch {
    // ignore
  }
  return true;
}

/** Reserva altura mientras se descarga una vista (evita saltos de layout / CLS). */
const ViewFallback = () => <div className="w-full min-h-[70vh]" aria-busy="true" />;

type Tab = 'test' | 'stats' | 'adaptive' | 'about';
const tabOf = (id: RouteId): Tab => (id === 'privacy' ? 'about' : id);

export default function App() {
  const initial = routeFromPath(window.location.pathname);
  const [routeId, setRouteId] = useState<RouteId>(initial?.id ?? 'test');
  const [notFound, setNotFound] = useState<boolean>(!initial);
  const [aboutSection, setAboutSection] = useState<'about' | 'features' | 'contact'>('about');
  const [darkMode, setDarkMode] = useState<boolean>(loadDarkMode);
  const {
    loadSavedData,
    isAuthModalOpen,
    setIsAuthModalOpen,
    isAchievementsModalOpen,
    setIsAchievementsModalOpen,
    dbStatus,
  } = useTypingStore();

  /** Navegación del lado cliente con URL real (History API): cada vista tiene su propia URL indexable. */
  const navigate = useCallback((id: RouteId) => {
    const route = getRoute(id);
    if (window.location.pathname !== route.path) window.history.pushState({}, '', route.path);
    setNotFound(false);
    setRouteId(id);
    window.scrollTo(0, 0);
  }, []);

  // Botones atrás/adelante del navegador
  useEffect(() => {
    const onPop = () => {
      const route = routeFromPath(window.location.pathname);
      setNotFound(!route);
      setRouteId(route?.id ?? 'test');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // <title>, description, canonical, robots, Open Graph, Twitter y JSON-LD acordes a la vista actual
  useEffect(() => {
    applyHead(buildHead(getRoute(routeId), { notFound }));
  }, [routeId, notFound]);

  useEffect(() => {
    loadSavedData();
  }, [loadSavedData]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem('typemaster_darkmode', String(darkMode));
    } catch {
      // ignore
    }
  }, [darkMode]);

  const route = getRoute(routeId);
  const currentTab = tabOf(routeId);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans flex flex-col justify-between transition-colors selection:bg-amber-500 selection:text-neutral-950">
      <div>
        <Navbar
          currentTab={currentTab}
          onNavigate={navigate}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          onOpenAchievements={() => setIsAchievementsModalOpen(true)}
          onOpenAuth={() => setIsAuthModalOpen(true)}
        />

        <main className="w-full">
          {/* Un único H1 por vista, útil para lectores de pantalla y rastreadores */}
          <h1 className="sr-only">{notFound ? 'Página no encontrada' : route.h1}</h1>

          <Suspense fallback={<ViewFallback />}>
            {currentTab === 'test' && <TypingArea />}
            {currentTab === 'stats' && <StatsView />}
            {currentTab === 'adaptive' && <AdaptiveView />}
            {currentTab === 'about' && (
              <AboutView
                section={routeId === 'privacy' ? 'privacy' : aboutSection}
                onSectionChange={(s) => {
                  if (s === 'privacy') {
                    navigate('privacy');
                  } else {
                    setAboutSection(s);
                    if (routeId !== 'about') navigate('about');
                  }
                }}
              />
            )}
          </Suspense>
        </main>
      </div>

      <Suspense fallback={null}>
        {isAchievementsModalOpen && (
          <AchievementsModal isOpen onClose={() => setIsAchievementsModalOpen(false)} />
        )}
        {isAuthModalOpen && <AuthModal isOpen onClose={() => setIsAuthModalOpen(false)} />}
      </Suspense>

      <DesktopWarning />

      <footer className="w-full max-w-6xl mx-auto px-6 py-6 border-t border-neutral-200 dark:border-neutral-900 flex flex-col lg:flex-row items-center justify-between text-xs text-neutral-600 dark:text-neutral-400 gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-x-3 gap-y-1">
          <span>TypeMaster Pro © 2026</span>
          <span className="hidden sm:inline" aria-hidden="true">•</span>
          <span>
            Autor:{' '}
            <a
              href={AUTHOR.blogUrl}
              rel="author noopener"
              target="_blank"
              className="hover:text-neutral-900 dark:hover:text-white"
            >
              {AUTHOR.name}
            </a>{' '}
            ·{' '}
            <a
              href={AUTHOR.hubUrl}
              rel="noopener"
              target="_blank"
              className="hover:text-neutral-900 dark:hover:text-white"
            >
              Aitor Hub
            </a>
          </span>
        </div>

        <nav aria-label="Pie de página" className="flex items-center gap-4">
          {(['test', 'adaptive', 'about', 'privacy'] as RouteId[]).map((id) => (
            <NavLink
              key={id}
              to={id}
              onNavigate={navigate}
              active={routeId === id}
              className="hover:text-neutral-900 dark:hover:text-white aria-[current=page]:text-neutral-900 dark:aria-[current=page]:text-white aria-[current=page]:font-semibold"
            >
              {getRoute(id).label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="flex items-center gap-1.5 hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors"
            title="Ver estado de base de datos"
          >
            <Database className="w-3.5 h-3.5" aria-hidden="true" />
            <span>
              Neon DB:{' '}
              {dbStatus === 'connected' ? (
                <strong className="text-emerald-600 dark:text-emerald-500">Conectada</strong>
              ) : (
                <strong className="text-amber-700 dark:text-amber-500">Modo Local</strong>
              )}
            </span>
          </button>
        </div>
      </footer>
    </div>
  );
}
