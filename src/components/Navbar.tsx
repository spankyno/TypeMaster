import React from 'react';
import { useTypingStore } from '../store/useTypingStore';
import { NavLink } from './NavLink';
import type { RouteId } from '../seo/routes';
import { Keyboard, BarChart2, Flame, Award, Volume2, VolumeX, Moon, Sun, User, Database, LogIn, Info } from 'lucide-react';

interface NavbarProps {
  currentTab: 'test' | 'stats' | 'adaptive' | 'about';
  onNavigate: (id: RouteId) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  onOpenAchievements: () => void;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onNavigate,
  darkMode,
  setDarkMode,
  onOpenAchievements,
  onOpenAuth,
}) => {
  const { settings, updateSettings, profile, dbStatus } = useTypingStore();
  const isGuest = profile.id === 'guest' || profile.isGuest;

  return (
    <header className="w-full max-w-6xl mx-auto px-6 py-6 flex flex-col min-[1160px]:flex-row items-center justify-between gap-4 select-none">
      {/* Logo & Brand */}
      <NavLink to="test" onNavigate={onNavigate} className="flex items-center gap-3 group">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-400/10 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform shadow-sm">
          <Keyboard className="w-6 h-6" aria-hidden="true" />
        </div>
        <div>
          <p className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
            TypeMaster <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400">PRO</span>
          </p>
          <p className="text-xs text-neutral-600 dark:text-neutral-400">Entrenamiento de mecanografía de alta precisión</p>
        </div>
      </NavLink>

      {/* Navigation Tabs */}
      <nav aria-label="Navegación principal" className="flex flex-wrap md:flex-nowrap md:shrink-0 justify-center items-center gap-1 max-w-full bg-neutral-100 dark:bg-neutral-900 p-1.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
        <NavLink
          to="test"
          onNavigate={onNavigate}
          active={currentTab === 'test'}
          className={`px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 ${
            currentTab === 'test'
              ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <Keyboard className="w-4 h-4" />
          Práctica
        </NavLink>
        <NavLink
          to="stats"
          onNavigate={onNavigate}
          active={currentTab === 'stats'}
          className={`px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 ${
            currentTab === 'stats'
              ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          Estadísticas
        </NavLink>
        <NavLink
          to="adaptive"
          onNavigate={onNavigate}
          active={currentTab === 'adaptive'}
          className={`px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 ${
            currentTab === 'adaptive'
              ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <Flame className="w-4 h-4 text-amber-500" />
          Adaptativo
        </NavLink>
        <NavLink
          to="about"
          onNavigate={onNavigate}
          active={currentTab === 'about'}
          className={`px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 ${
            currentTab === 'about'
              ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <Info className="w-4 h-4" />
          Acerca de
        </NavLink>
      </nav>

      {/* User Status, Auth & Quick Actions */}
      <div className="flex items-center gap-2.5">
        {/* User Account / Login Button */}
        <button
          onClick={onOpenAuth}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border text-xs font-semibold transition-all cursor-pointer shadow-xs ${
            isGuest
              ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30 ring-1 ring-amber-500/20'
              : 'bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-900 dark:text-white border-neutral-200 dark:border-neutral-800'
          }`}
          title={isGuest ? 'Iniciar sesión para guardar en Neon DB' : 'Ver perfil de usuario'}
        >
          {isGuest ? (
            <>
              <LogIn className="w-3.5 h-3.5" />
              <span>Iniciar Sesión</span>
            </>
          ) : (
            <>
              <div className="w-5 h-5 rounded-full bg-amber-500 text-neutral-950 text-[10px] font-black flex items-center justify-center">
                {profile.username.charAt(0).toUpperCase()}
              </div>
              <span className="max-w-[100px] truncate">{profile.username}</span>
            </>
          )}

          {/* Database indicator dot */}
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              dbStatus === 'connected'
                ? 'bg-emerald-500'
                : dbStatus === 'checking'
                ? 'bg-amber-500 animate-ping'
                : 'bg-neutral-400'
            }`}
            title={
              dbStatus === 'connected'
                ? 'Neon DB: Conectada'
                : 'Neon DB: Modo Local / Offline'
            }
          />
        </button>

        {/* Streak & Level */}
        <div 
          onClick={onOpenAchievements}
          className="flex items-center gap-2.5 bg-neutral-100 dark:bg-neutral-900 px-3 py-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 cursor-pointer hover:border-amber-500/50 transition-colors"
          title="Ver Logros y Nivel"
        >
          <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
            <Flame className="w-3.5 h-3.5 fill-amber-500" />
            <span>{profile.streak}d</span>
          </div>
          <div className="w-[1px] h-3.5 bg-neutral-300 dark:bg-neutral-700" />
          <div className="flex items-center gap-1 text-neutral-700 dark:text-neutral-300 text-xs font-medium">
            <Award className="w-3.5 h-3.5 text-indigo-500" />
            <span>Nv.{profile.level}</span>
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
