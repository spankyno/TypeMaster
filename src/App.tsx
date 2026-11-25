import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { TypingArea } from './components/TypingArea';
import { StatsView } from './components/StatsView';
import { AdaptiveView } from './components/AdaptiveView';
import { AchievementsModal } from './components/AchievementsModal';
import { AuthModal } from './components/AuthModal';
import { DesktopWarning } from './components/DesktopWarning';
import { useTypingStore } from './store/useTypingStore';
import { Database } from 'lucide-react';

function loadDarkMode(): boolean {
  try {
    const stored = localStorage.getItem('typemaster_darkmode');
    if (stored !== null) return stored === 'true';
  } catch {
    // ignore
  }
  return true;
}

export default function App() {
  const [currentTab, setCurrentTab] = useState<'test' | 'stats' | 'adaptive' | 'settings'>('test');
  const [darkMode, setDarkMode] = useState<boolean>(loadDarkMode);
  const {
    loadSavedData,
    isAuthModalOpen,
    setIsAuthModalOpen,
    isAchievementsModalOpen,
    setIsAchievementsModalOpen,
    dbStatus,
  } = useTypingStore();

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

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans flex flex-col justify-between transition-colors selection:bg-amber-500 selection:text-neutral-950">
      <div>
        <Navbar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          onOpenAchievements={() => setIsAchievementsModalOpen(true)}
          onOpenAuth={() => setIsAuthModalOpen(true)}
        />

        <main className="w-full">
          {currentTab === 'test' && <TypingArea />}
          {currentTab === 'stats' && <StatsView />}
          {currentTab === 'adaptive' && <AdaptiveView />}
        </main>
      </div>

      <AchievementsModal
        isOpen={isAchievementsModalOpen}
        onClose={() => setIsAchievementsModalOpen(false)}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <DesktopWarning />

      <footer className="w-full max-w-6xl mx-auto px-6 py-6 border-t border-neutral-200 dark:border-neutral-900 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 gap-3">
        <div>TypeMaster Pro • Alta velocidad y precisión de tecleo</div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="flex items-center gap-1.5 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
            title="Ver estado de base de datos"
          >
            <Database className="w-3.5 h-3.5" />
            <span>
              Neon DB:{' '}
              {dbStatus === 'connected' ? (
                <strong className="text-emerald-500">Conectada</strong>
              ) : (
                <strong className="text-amber-500">Modo Local</strong>
              )}
            </span>
          </button>
          <span>•</span>
          <span>Diseño optimizado para escritorio (QWERTY ES)</span>
        </div>
      </footer>
    </div>
  );
}
