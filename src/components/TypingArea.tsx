import React, { useEffect, useRef, useState } from 'react';
import { useTypingStore } from '../store/useTypingStore';
import { VirtualKeyboard } from './VirtualKeyboard';
import { TestResultModal } from './TestResultModal';
import { CustomTextModal } from './CustomTextModal';
import { Clock, Hash, AlignLeft, Sparkles, RefreshCw, Edit3 } from 'lucide-react';

export const TypingArea: React.FC = () => {
  const {
    settings,
    updateSettings,
    status,
    targetText,
    typedChars,
    currentIndex,
    timeRemaining,
    wpm,
    accuracy,
    activeKey,
    processKey,
    backspace,
    initTest,
    tickTimer,
    adaptiveEngine,
    isAuthModalOpen
  } = useTypingStore();

  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isAnyModalOpen = isAuthModalOpen || isCustomModalOpen;

  // Focus hidden input on mount and click ONLY when not inside modal or another input
  useEffect(() => {
    const focusInput = (e?: MouseEvent) => {
      if (isAnyModalOpen) return;

      if (e) {
        const target = e.target as HTMLElement | null;
        if (target && target.closest('input, textarea, select, button, [role="dialog"]')) {
          return;
        }
      }

      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return;
      }

      inputRef.current?.focus();
    };

    if (!isAnyModalOpen) {
      focusInput();
    }

    window.addEventListener('click', focusInput);
    return () => window.removeEventListener('click', focusInput);
  }, [isAnyModalOpen]);

  // Timer interval for time mode
  useEffect(() => {
    let interval: any = null;
    if (status === 'running') {
      interval = setInterval(() => {
        tickTimer();
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status, tickTimer]);

  // Keyboard shortcut listener (Tab = restart, Enter when finished = next test, Esc = restart)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAnyModalOpen) return;

      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        initTest();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        initTest();
      } else if (e.key === 'Enter' && status === 'finished') {
        e.preventDefault();
        initTest();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [initTest, status, isAnyModalOpen]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isAnyModalOpen) return;

    if (e.key === 'Backspace') {
      e.preventDefault();
      backspace();
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      processKey(e.key);
    }
  };

  const expectedKey = currentIndex < targetText.length ? targetText[currentIndex] : null;
  const keyStats = adaptiveEngine.getKeyStats();

  return (
    <div className="w-full max-w-5xl mx-auto px-6 py-4 flex flex-col items-center justify-center min-h-[75vh]">
      {/* Hidden input for high performance keystroke capture */}
      <input
        ref={inputRef}
        type="text"
        className="opacity-0 absolute w-0 h-0 pointer-events-none"
        onKeyDown={handleInputKeyDown}
        autoFocus={!isAnyModalOpen}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck="false"
        disabled={isAnyModalOpen}
      />

      {/* Results View if Finished */}
      {status === 'finished' ? (
        <TestResultModal onRetry={() => initTest()} onNextTest={() => initTest()} />
      ) : (
        <div className="w-full flex flex-col items-center gap-8">
          {/* Mode Selector Toolbar */}
          <div className={`transition-opacity duration-300 flex flex-wrap items-center justify-center gap-3 bg-neutral-100 dark:bg-neutral-900/80 backdrop-blur-md p-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 ${
            status === 'running' ? 'opacity-20 hover:opacity-100' : 'opacity-100'
          }`}>
            {/* Modes */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => { updateSettings({ mode: 'time' }); initTest(); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  settings.mode === 'time' ? 'bg-amber-500 text-neutral-950 font-bold' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" /> Tiempo
              </button>
              <button
                onClick={() => { updateSettings({ mode: 'words' }); initTest(); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  settings.mode === 'words' ? 'bg-amber-500 text-neutral-950 font-bold' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <Hash className="w-3.5 h-3.5" /> Palabras
              </button>
              <button
                onClick={() => { updateSettings({ mode: 'quote' }); initTest(); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  settings.mode === 'quote' ? 'bg-amber-500 text-neutral-950 font-bold' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <AlignLeft className="w-3.5 h-3.5" /> Citas
              </button>
              <button
                onClick={() => { updateSettings({ mode: 'adaptive' }); initTest(); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  settings.mode === 'adaptive' ? 'bg-amber-500 text-neutral-950 font-bold' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Adaptativo
              </button>
              <button
                onClick={() => setIsCustomModalOpen(true)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  settings.mode === 'custom' ? 'bg-amber-500 text-neutral-950 font-bold' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" /> Personalizado
              </button>
            </div>

            <div className="w-[1px] h-5 bg-neutral-300 dark:bg-neutral-700" />

            {/* Submodes (Time / Words) */}
            {settings.mode === 'time' && (
              <div className="flex items-center gap-1 text-xs">
                {[15, 30, 60, 120].map((t) => (
                  <button
                    key={t}
                    onClick={() => { updateSettings({ timeSubMode: t as any }); initTest(); }}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                      settings.timeSubMode === t ? 'text-amber-500 bg-amber-500/10' : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                    }`}
                  >
                    {t}s
                  </button>
                ))}
              </div>
            )}

            {settings.mode === 'words' && (
              <div className="flex items-center gap-1 text-xs">
                {[10, 25, 50, 100].map((w) => (
                  <button
                    key={w}
                    onClick={() => { updateSettings({ wordsSubMode: w as any }); initTest(); }}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                      settings.wordsSubMode === w ? 'text-amber-500 bg-amber-500/10' : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Live WPM & Timer Header */}
          <div className="w-full flex items-center justify-between px-2 font-mono text-xl font-bold">
            <div className="text-amber-500 flex items-center gap-2">
              {settings.mode === 'time' ? `${timeRemaining}s` : `${currentIndex} / ${targetText.length}`}
            </div>
            {settings.liveWpm && (
              <div className="text-neutral-400 text-sm flex items-center gap-4">
                <span>{wpm} PPM</span>
                <span>{accuracy}% prec</span>
              </div>
            )}
          </div>

          {/* Main Text Display */}
          <div 
            className="w-full bg-white dark:bg-neutral-900/40 p-8 md:p-12 rounded-3xl border border-neutral-200 dark:border-neutral-800/80 shadow-sm relative overflow-hidden select-none cursor-text min-h-[220px] flex items-center"
            onClick={() => {
              if (!isAnyModalOpen) {
                inputRef.current?.focus();
              }
            }}
          >
            <div className="font-mono text-2xl md:text-3xl leading-relaxed tracking-wide flex flex-wrap gap-y-3 whitespace-pre">
              {targetText.split('').map((char, idx) => {
                const typed = typedChars[idx];
                let statusClass = 'text-neutral-400 dark:text-neutral-600';
                if (typed) {
                  statusClass = typed.correct
                    ? 'text-neutral-900 dark:text-white'
                    : 'text-rose-500 bg-rose-500/10 underline decoration-rose-500';
                }
                const isCurrent = idx === currentIndex;

                return (
                  <span
                    key={idx}
                    className={`relative transition-colors duration-75 inline-block min-w-[0.5em] text-center ${statusClass} ${
                      isCurrent ? 'border-l-2 border-amber-500 animate-pulse' : ''
                    }`}
                  >
                    {char === ' ' ? '\u00A0' : char}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Controls Hint & Restart */}
          <div className="flex items-center justify-between w-full px-2">
            <div className="text-xs text-neutral-400 flex items-center gap-3">
              <span>Pulsa <kbd className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-md font-mono text-neutral-800 dark:text-neutral-200">Tab</kbd> para reiniciar</span>
              <span>•</span>
              <span><kbd className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-md font-mono text-neutral-800 dark:text-neutral-200">Esc</kbd> para menú</span>
            </div>

            <button
              onClick={() => initTest()}
              className="p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors"
              title="Reiniciar test (Tab)"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Virtual Keyboard Helper */}
          {settings.showVirtualKeyboard && (
            <VirtualKeyboard
              activeKey={activeKey}
              expectedKey={expectedKey}
              keyStats={keyStats}
            />
          )}
        </div>
      )}

      <CustomTextModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
      />
    </div>
  );
};
