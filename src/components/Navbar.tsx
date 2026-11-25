import React from 'react';
import { useTypingStore } from '../store/useTypingStore';
import { Keyboard, BarChart2, Flame, Award, Settings, Volume2, VolumeX, Moon, Sun } from 'lucide-react';

interface NavbarProps {
  currentTab: 'test' | 'stats' | 'adaptive' | 'settings';
  setCurrentTab: (tab: 'test' | 'stats' | 'adaptive' | 'settings') => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  onOpenAchievements: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  darkMode,
  setDarkMode,
  onOpenAchievements
}) => {
  const { settings, updateSettings, profile } = useTypingStore();

  return (
    <header className="w-full max-w-6xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4 select-none">
      {/* Logo & Brand */}
      <div 
        className="flex items-center gap-3 cursor-pointer group"
        onClick={() => setCurrentTab('test')}
      >
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-400/10 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform shadow-sm">
          <Keyboard className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
            TypeMaster <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">PRO</span>
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Entrenamiento de mecanografía de alta precisión</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-900 p-1.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
        <button
          onClick={() => setCurrentTab('test')}
          className={`px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 ${
            currentTab === 'test'
              ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <Keyboard className="w-4 h-4" />
          Práctica
        </button>
        <button
          onClick={() => setCurrentTab('stats')}
          className={`px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 ${
            currentTab === 'stats'
              ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          Estadísticas
        </button>
        <button
          onClick={() => setCurrentTab('adaptive')}
          className={`px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 ${
            currentTab === 'adaptive'
              ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <Flame className="w-4 h-4 text-amber-500" />
          Adaptativo
        </button>
      </nav>

      {/* User Status & Quick Actions */}
      <div className="flex items-center gap-3">
        {/* Streak & Level */}
        <div 
          onClick={onOpenAchievements}
          className="flex items-center gap-3 bg-neutral-100 dark:bg-neutral-900 px-3.5 py-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 cursor-pointer hover:border-amber-500/50 transition-colors"
          title="Ver Logros y Nivel"
        >
          <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
            <Flame className="w-4 h-4 fill-amber-500 animate-pulse" />
            <span>{profile.streak}d</span>
          </div>
          <div className="w-[1px] h-4 bg-neutral-300 dark:bg-neutral-700" />
          <div className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300 text-xs font-medium">
            <Award className="w-4 h-4 text-indigo-500" />
            <span>Nivel {profile.level}</span>
          </div>
        </div>

        {/* Sound Toggle */}
        <button
          onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
          className={`p-2.5 rounded-xl border transition-colors ${
            settings.soundEnabled
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
              : 'bg-neutral-100 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
          }`}
          title={settings.soundEnabled ? 'Desactivar sonidos' : 'Activar sonidos de teclado'}
        >
          {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
          title="Cambiar tema"
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
