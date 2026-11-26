import React from 'react';
import { QWERTY_ES_KEYS } from '../data/spanishWords';
import { KeyRecord } from '../lib/adaptive/adaptiveEngine';
import { baseKey } from '../lib/typing';

interface VirtualKeyboardProps {
  activeKey: string | null;
  expectedKey: string | null;
  keyStats?: Record<string, KeyRecord>;
}

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({
  activeKey,
  expectedKey,
  keyStats
}) => {
  // á → a, ü → u…: la tecla física a resaltar es la letra base (la ñ se conserva)
  const norm = (k: string | null) => (k ? baseKey(k).toLowerCase() : null);
  const expectedNorm = norm(expectedKey);
  const activeNorm = norm(activeKey);

  return (
    <div className="w-full max-w-3xl mx-auto bg-neutral-900/60 dark:bg-neutral-950/80 backdrop-blur-md p-4 rounded-3xl border border-neutral-800 shadow-xl select-none flex flex-col gap-1.5 items-center">
      <div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1 font-semibold">
        Teclado QWERTY ES (Distribución Física)
      </div>
      {QWERTY_ES_KEYS.map((row, rowIndex) => (
        <div key={rowIndex} className="flex gap-1.5 justify-center w-full">
          {row.map((item, keyIndex) => {
            const isExpected = expectedNorm !== null && item.key.toLowerCase() === expectedNorm;
            const isActive = activeNorm !== null && item.key.toLowerCase() === activeNorm;
            const stat = keyStats ? keyStats[item.key.toLowerCase()] : null;

            // Heatmap color based on error rate or speed if stat available
            let heatBg = '';
            if (stat && stat.samples > 5) {
              const errorRate = stat.errors / stat.samples;
              if (errorRate > 0.15) heatBg = 'bg-rose-500/20 border-rose-500/50 text-rose-300';
              else if (stat.confidence > 0.7) heatBg = 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300';
            }

            let widthClass = 'w-10 h-10';
            if (item.key === ' ') widthClass = 'w-72 h-10';
            else if (['Tab', 'Bloq Mayús', 'Enter', 'Shift'].includes(item.key)) widthClass = 'w-14 h-10';

            return (
              <div
                key={keyIndex}
                className={`${widthClass} rounded-xl border flex flex-col items-center justify-center text-xs font-mono transition-all duration-75 relative ${
                  isActive
                    ? 'bg-amber-500 border-amber-400 text-black scale-95 shadow-lg shadow-amber-500/20'
                    : isExpected
                    ? 'bg-indigo-500/30 border-indigo-400 text-indigo-200 ring-2 ring-indigo-500/50'
                    : heatBg || 'bg-neutral-800 border-neutral-700 text-neutral-300'
                }`}
              >
                <span className="font-semibold">{item.key}</span>
                {item.shift && item.shift !== item.key && (
                  <span className="absolute top-1 right-1.5 text-[8px] text-neutral-500">{item.shift}</span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};
