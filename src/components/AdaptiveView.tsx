import React from 'react';
import { useTypingStore } from '../store/useTypingStore';
import { Flame, CheckCircle2, Lock, Sparkles, Target, RotateCcw } from 'lucide-react';

export const AdaptiveView: React.FC = () => {
  const { adaptiveEngine, updateSettings, initTest, resetAdaptiveProgress } = useTypingStore();
  const keyStats = adaptiveEngine.getKeyStats();
  const unlockedLetters = adaptiveEngine.getUnlockedLetters();
  const nextLetter = adaptiveEngine.getNextLetterToUnlock();

  const handleStartAdaptive = () => {
    updateSettings({ mode: 'adaptive' });
    initTest();
  };

  const handleReset = () => {
    if (
      window.confirm(
        '¿Reiniciar el progreso adaptativo? Se bloquearán de nuevo todas las letras excepto las iniciales (e, s, a, r, n, i).'
      )
    ) {
      resetAdaptiveProgress();
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-6 py-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-3">
            <Flame className="w-8 h-8 text-amber-500 fill-amber-500" />
            Entrenamiento Adaptativo (Estilo Keybr)
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Progresión adaptativa basada en confianza por letra. Las estadísticas se actualizan en todos los modos de práctica.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="px-4 py-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold text-sm transition-all flex items-center gap-2 border border-neutral-200 dark:border-neutral-700"
            title="Reiniciar progreso de letras"
          >
            <RotateCcw className="w-4 h-4" />
            Reiniciar
          </button>
          <button
            onClick={handleStartAdaptive}
            className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Iniciar Sesión Adaptativa
          </button>
        </div>
      </div>

      {/* Progress Status Card */}
      <div className="bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-purple-500/10 p-8 rounded-3xl border border-amber-500/20 mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/20 px-3 py-1 rounded-full">
            Algoritmo Activo
          </span>
          <h3 className="text-2xl font-black text-neutral-900 dark:text-white mt-3">
            Letras Desbloqueadas: {unlockedLetters.length} / {Object.keys(keyStats).length}
          </h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            {nextLetter ? `Siguiente letra a desbloquear: "${nextLetter.toUpperCase()}" (requiere 75% de confianza)` : '¡Has desbloqueado todas las letras del teclado!'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unlockedLetters.map((l) => (
            <div key={l} className="w-10 h-10 rounded-xl bg-neutral-900 text-white font-mono font-bold flex items-center justify-center border border-neutral-800 shadow-sm">
              {l.toUpperCase()}
            </div>
          ))}
          {nextLetter && (
            <div className="w-10 h-10 rounded-xl bg-neutral-800/40 text-neutral-500 font-mono font-bold flex items-center justify-center border border-dashed border-neutral-700">
              {nextLetter.toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* Letter Stats Grid */}
      <div className="bg-white dark:bg-neutral-900 p-8 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
        <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-6 flex items-center gap-2">
          <Target className="w-5 h-5 text-indigo-500" />
          Confianza y Velocidad por Letra
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Object.values(keyStats).map((stat) => (
            <div
              key={stat.key}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                stat.unlocked
                  ? 'bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700'
                  : 'bg-neutral-100/50 dark:bg-neutral-950/50 border-neutral-200 dark:border-neutral-800 opacity-50'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg font-mono font-bold uppercase text-neutral-900 dark:text-white">{stat.key}</span>
                {stat.unlocked ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Lock className="w-4 h-4 text-neutral-400" />
                )}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-neutral-500">
                  <span>Confianza</span>
                  <span className="font-semibold text-neutral-900 dark:text-white">{Math.round(stat.confidence * 100)}%</span>
                </div>
                <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 transition-all duration-300"
                    style={{ width: `${stat.confidence * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-neutral-400 mt-2">
                  <span>Muestras: {stat.samples}</span>
                  <span>{Math.round(stat.emaMs)}ms</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
