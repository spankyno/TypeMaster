import React, { useState } from 'react';
import { normalizeTest, formatDuration, describeTest } from '../lib/typing';
import { useTypingStore } from '../store/useTypingStore';
import { BarChart2, TrendingUp, Award, Clock, Download, Keyboard } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

export const StatsView: React.FC = () => {
  const { testHistory: rawHistory } = useTypingStore();
  const [metric, setMetric] = useState<'wpm' | 'kpm'>('wpm');
  // Defensa extra: fuerza tipos numéricos (Neon devuelve NUMERIC como string → antes salía NaN)
  const testHistory = React.useMemo(() => rawHistory.map(normalizeTest), [rawHistory]);

  const totalTests = testHistory.length;
  const bestWpm = testHistory.length > 0 ? Math.max(...testHistory.map((t) => t.wpm)) : 0;
  const avgWpm = totalTests > 0 ? Math.round(testHistory.reduce((acc, t) => acc + t.wpm, 0) / totalTests) : 0;
  const avgAccuracy = totalTests > 0 ? Math.round(testHistory.reduce((acc, t) => acc + t.accuracy, 0) / totalTests) : 0;
  const avgKpm = totalTests > 0 ? Math.round(testHistory.reduce((acc, t) => acc + t.kpm, 0) / totalTests) : 0;
  const bestKpm = testHistory.length > 0 ? Math.max(...testHistory.map((t) => t.kpm)) : 0;
  const totalSeconds = testHistory.reduce((acc, t) => acc + t.durationSeconds, 0);
  const totalTime = formatDuration(totalSeconds);

  const chartData = [...testHistory].reverse().map((t, idx) => ({
    index: idx + 1,
    wpm: t.wpm,
    kpm: t.kpm,
    accuracy: t.accuracy,
    date: new Date(t.createdAt).toLocaleDateString()
  }));

  const download = (content: string, mime: string, ext: string) => {
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `typemaster_stats_${new Date().toISOString().slice(0, 10)}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportToJson = () => download(JSON.stringify(testHistory, null, 2), 'application/json', 'json');

  const exportToCsv = () => {
    if (testHistory.length === 0) return;
    const esc = (v: unknown) => {
      const str = String(v ?? '');
      return /[",\n;]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };
    const headers = ['ID', 'Modo', 'Submodo', 'PPM', 'PPM bruto', 'KPM (pulsaciones/min)', 'Pulsaciones', 'Precisión', 'Consistencia', 'Duración (s)', 'Fecha'];
    const rows = testHistory.map((t) =>
      [t.id, t.mode, t.subMode, t.wpm, t.rawWpm, t.kpm, t.keystrokes, t.accuracy, t.consistency, t.durationSeconds, t.createdAt].map(esc).join(',')
    );
    // BOM para que Excel respete los acentos en UTF-8
    download('\uFEFF' + [headers.join(','), ...rows].join('\n'), 'text/csv', 'csv');
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-6 py-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-3">
            <BarChart2 className="w-8 h-8 text-amber-500" />
            Panel de Estadísticas y Analítica
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Revisa tu progreso histórico, evolución de velocidad y registros personales.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportToCsv}
            className="px-4 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
          <button
            onClick={exportToJson}
            className="px-4 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" /> Exportar JSON
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Mejor PPM</span>
            <Award className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-4xl font-black text-neutral-900 dark:text-white tracking-tight">{bestWpm}</div>
          <div className="text-xs text-neutral-400 mt-1">Récord personal</div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">PPM Medio</span>
            <TrendingUp className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="text-4xl font-black text-neutral-900 dark:text-white tracking-tight">{avgWpm}</div>
          <div className="text-xs text-neutral-400 mt-1">En {totalTests} tests totales</div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Pulsaciones/min</span>
            <Keyboard className="w-5 h-5 text-sky-500" />
          </div>
          <div className="text-4xl font-black text-neutral-900 dark:text-white tracking-tight">{avgKpm}</div>
          <div className="text-xs text-neutral-400 mt-1">KPM medio · mejor {bestKpm}</div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Precisión Media</span>
            <Award className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-4xl font-black text-neutral-900 dark:text-white tracking-tight">{avgAccuracy}%</div>
          <div className="text-xs text-neutral-400 mt-1">Calidad de tecleo</div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Tiempo Practicado</span>
            <Clock className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-4xl font-black text-neutral-900 dark:text-white tracking-tight">{totalTime}</div>
          <div className="text-xs text-neutral-400 mt-1">Total acumulado</div>
        </div>
      </div>

      {/* Historical Chart */}
      <div className="bg-white dark:bg-neutral-900 p-8 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm mb-8">
        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
            Evolución histórica: {metric === 'wpm' ? 'palabras por minuto (PPM)' : 'pulsaciones por minuto (KPM)'}
          </h3>
          <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl text-xs font-semibold">
            {(['wpm', 'kpm'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  metric === m ? 'bg-amber-500 text-neutral-950' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {m === 'wpm' ? 'PPM' : 'KPM'}
              </button>
            ))}
          </div>
        </div>
        {chartData.length > 0 ? (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorWpm" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#737373" fontSize={11} tickLine={false} />
                <YAxis stroke="#737373" fontSize={11} tickLine={false} domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ backgroundColor: '#171717', border: '1px solid #262626', borderRadius: '12px', color: '#fff' }} />
                <Area type="monotone" dataKey={metric} name={metric === 'wpm' ? 'PPM' : 'KPM'} stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorWpm)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="py-16 text-center text-neutral-400">
            Aún no hay tests registrados. ¡Completa tu primer test para ver las gráficas!
          </div>
        )}
      </div>

      {/* Test History Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Historial de Tests Recientes</h3>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">{totalTests} tests guardados</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 dark:text-neutral-400 uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">Modo</th>
                <th className="px-6 py-4">PPM (WPM)</th>
                <th className="px-6 py-4">Bruto</th>
                <th className="px-6 py-4">KPM</th>
                <th className="px-6 py-4">Precisión</th>
                <th className="px-6 py-4">Duración</th>
                <th className="px-6 py-4">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {testHistory.slice(0, 15).map((t) => (
                <tr key={t.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-neutral-900 dark:text-white">{describeTest(t.mode, t.subMode)}</td>
                  <td className="px-6 py-4 font-bold text-amber-500 text-sm">{t.wpm}</td>
                  <td className="px-6 py-4 text-neutral-600 dark:text-neutral-400">{t.rawWpm}</td>
                  <td className="px-6 py-4 font-semibold text-sky-500">{t.kpm}</td>
                  <td className="px-6 py-4 font-semibold text-emerald-500">{t.accuracy}%</td>
                  <td className="px-6 py-4 text-neutral-500 dark:text-neutral-400">{Math.round(t.durationSeconds)}s</td>
                  <td className="px-6 py-4 text-neutral-500 dark:text-neutral-400">{new Date(t.createdAt).toLocaleString()}</td>
                </tr>
              ))}
              {testHistory.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-neutral-400">
                    No hay registros de tests todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
