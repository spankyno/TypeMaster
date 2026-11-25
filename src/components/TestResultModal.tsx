import React from 'react';
import { useTypingStore } from '../store/useTypingStore';
import { Trophy, Zap, Target, Activity, RotateCcw, ArrowRight, UserPlus, Cloud } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

interface TestResultModalProps {
  onRetry: () => void;
  onNextTest: () => void;
}

export const TestResultModal: React.FC<TestResultModalProps> = ({ onRetry, onNextTest }) => {
  const {
    wpm,
    rawWpm,
    accuracy,
    consistency,
    charsCorrect,
    charsWrong,
    charsExtra,
    wpmSeries,
    testHistory,
    profile,
    setIsAuthModalOpen,
  } = useTypingStore();
  const latestResult = testHistory[0];
  const isGuest = profile.id === 'guest' || !!profile.isGuest;

  const chartData = wpmSeries.map((val, idx) => ({ second: idx + 1, wpm: val }));

  return (
    <div className="w-full max-w-4xl mx-auto bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
            <Trophy className="w-7 h-7 text-amber-500" />
            ¡Test Completado con Éxito!
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Resumen de rendimiento y métricas clave de tu sesión.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-amber-500/10 dark:bg-amber-400/10 px-4 py-2 rounded-2xl border border-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold text-sm">
          <Zap className="w-4 h-4 fill-amber-500" />
          <span>+{Math.round(wpm * 2 + accuracy * 0.5)} XP</span>
        </div>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-neutral-50 dark:bg-neutral-800/50 p-5 rounded-2xl border border-neutral-100 dark:border-neutral-800">
          <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">PPM Neto (WPM)</div>
          <div className="text-4xl font-black text-amber-500 tracking-tight">{wpm}</div>
          <div className="text-xs text-neutral-400 mt-1">Bruto: {rawWpm} PPM</div>
        </div>

        <div className="bg-neutral-50 dark:bg-neutral-800/50 p-5 rounded-2xl border border-neutral-100 dark:border-neutral-800">
          <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Precisión</div>
          <div className="text-4xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">{accuracy}%</div>
          <div className="text-xs text-neutral-400 mt-1">Objetivo: &gt;95%</div>
        </div>

        <div className="bg-neutral-50 dark:bg-neutral-800/50 p-5 rounded-2xl border border-neutral-100 dark:border-neutral-800">
          <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Consistencia</div>
          <div className="text-4xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">{consistency}%</div>
          <div className="text-xs text-neutral-400 mt-1">Ritmo uniforme</div>
        </div>

        <div className="bg-neutral-50 dark:bg-neutral-800/50 p-5 rounded-2xl border border-neutral-100 dark:border-neutral-800">
          <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Caracteres</div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight mt-1">
            <span className="text-emerald-500">{charsCorrect}</span> / <span className="text-rose-500">{charsWrong}</span> / <span className="text-amber-500">{charsExtra}</span>
          </div>
          <div className="text-xs text-neutral-400 mt-1">Correctos / Errores / Extras</div>
        </div>
      </div>

      {/* WPM Chart Timeline */}
      {chartData.length > 1 && (
        <div className="bg-neutral-50 dark:bg-neutral-800/30 p-6 rounded-2xl border border-neutral-100 dark:border-neutral-800 mb-8">
          <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-500" />
            Evolución de PPM por Segundo
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="second" stroke="#737373" fontSize={11} tickLine={false} />
                <YAxis stroke="#737373" fontSize={11} tickLine={false} domain={['auto', 'auto']} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#171717', border: '1px solid #262626', borderRadius: '12px', color: '#fff' }}
                />
                <Line type="monotone" dataKey="wpm" stroke="#f59e0b" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Guest CTA: save progress */}
      {isGuest && (
        <div className="mb-6 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-neutral-900 dark:text-white">
                Guarda tu progreso creando una cuenta
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                Como invitado, este resultado solo está en este navegador. Regístrate con email y
                contraseña para sincronizar historial, XP y logros en la nube.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsAuthModalOpen(true)}
            className="shrink-0 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs flex items-center gap-2 shadow-md shadow-amber-500/20"
          >
            <UserPlus className="w-4 h-4" />
            Crear cuenta / Entrar
          </button>
        </div>
      )}

      {/* Action Buttons & Shortcuts */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-4">
          <span>Atajos: <kbd className="px-2 py-1 bg-neutral-200 dark:bg-neutral-800 rounded-md font-mono text-neutral-800 dark:text-neutral-200">Tab</kbd> Repetir test</span>
          <span><kbd className="px-2 py-1 bg-neutral-200 dark:bg-neutral-800 rounded-md font-mono text-neutral-800 dark:text-neutral-200">Tab + Enter</kbd> Siguiente test</span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={onRetry}
            className="flex-1 sm:flex-none px-6 py-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Repetir Test (Tab)
          </button>
          <button
            onClick={onNextTest}
            className="flex-1 sm:flex-none px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
          >
            Siguiente Test
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
