import React, { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTypingStore } from '../store/useTypingStore';
import { VirtualKeyboard } from './VirtualKeyboard';
import { TestResultModal, preloadResult } from '../lazyViews';
import { CustomTextModal } from './CustomTextModal';
import {
  Clock,
  Hash,
  AlignLeft,
  Sparkles,
  RefreshCw,
  Edit3,
  BookOpen,
  Keyboard,
  CaseSensitive,
  Binary,
  ShieldAlert,
} from 'lucide-react';

type CharState = 'untyped' | 'correct' | 'wrong';

const CHAR_CLASS: Record<CharState, string> = {
  untyped: 'text-neutral-400 dark:text-neutral-600',
  correct: 'text-neutral-900 dark:text-white',
  wrong: 'text-rose-500 bg-rose-500/10 underline decoration-rose-500',
};

/** Memoizado: en cada pulsación solo se re-renderizan los 2–3 caracteres que cambian. */
const Char = React.memo(function Char({ char, state, isCurrent }: { char: string; state: CharState; isCurrent: boolean }) {
  return (
    <span
      data-caret={isCurrent ? 'true' : undefined}
      className={`relative inline-block min-w-[0.5em] text-center ${CHAR_CLASS[state]} ${
        isCurrent
          ? 'before:content-[""] before:absolute before:left-0 before:top-[0.15em] before:bottom-[0.15em] before:w-0.5 before:bg-amber-500 before:animate-pulse'
          : ''
      }`}
    >
      {char === ' ' ? '\u00A0' : char}
    </span>
  );
});

/** Divide el texto en "palabra + espacio" para que el salto de línea nunca parta una palabra. */
function tokenize(text: string): { start: number; text: string }[] {
  const tokens: { start: number; text: string }[] = [];
  const re = /\S+\s*|\s+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) tokens.push({ start: m.index, text: m[0] });
  return tokens;
}

/** A partir de aquí el texto se muestra en una ventana de 4 líneas que avanza sola */
const WINDOW_THRESHOLD = 700;

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
    kpm,
    accuracy,
    activeKey,
    processKey,
    backspace,
    initTest,
    tickTimer,
    adaptiveEngine,
    isAuthModalOpen,
    isAchievementsModalOpen,
  } = useTypingStore();

  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isAnyModalOpen = isAuthModalOpen || isCustomModalOpen || isAchievementsModalOpen;

  /** Bring focus to the hidden typing input (skips when a modal is open). */
  const focusTypingInput = () => {
    if (isAnyModalOpen) return;
    requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
    });
  };

  // Keep focus on the typing input whenever a test is ready or modals close.
  useEffect(() => {
    if (!isAnyModalOpen && status !== 'finished') {
      focusTypingInput();
    }
  }, [status, targetText, isAnyModalOpen]);

  // Click anywhere (except real form fields / dialogs) → refocus typing input.
  useEffect(() => {
    const onWindowClick = (e: MouseEvent) => {
      if (isAnyModalOpen) return;

      const target = e.target as HTMLElement | null;
      if (target?.closest('input:not([data-typing-input]), textarea, select, [role="dialog"]')) {
        return;
      }

      focusTypingInput();
    };

    window.addEventListener('click', onWindowClick);
    return () => window.removeEventListener('click', onWindowClick);
  }, [isAnyModalOpen]);

  // Reclaim focus if the hidden input blurs while a test is active/ready.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    const onBlur = () => {
      if (isAnyModalOpen || status === 'finished') return;

      setTimeout(() => {
        const active = document.activeElement as HTMLElement | null;
        if (
          active &&
          (active.tagName === 'INPUT' ||
            active.tagName === 'TEXTAREA' ||
            active.tagName === 'SELECT' ||
            active.closest('[role="dialog"]'))
        ) {
          return;
        }
        inputRef.current?.focus({ preventScroll: true });
      }, 0);
    };

    el.addEventListener('blur', onBlur);
    return () => el.removeEventListener('blur', onBlur);
  }, [isAnyModalOpen, status]);

  // Textos largos (modo Tiempo o > 700 caracteres): ventana de 4 líneas SIN barra de scroll.
  // La línea actual se mantiene como 2ª línea, así siempre ves las siguientes antes de llegar a ellas.
  // Textos cortos/medios (p. ej. prosa): se muestran enteros en el cuadro, sin scroll.
  const windowed = settings.mode === 'time' || targetText.length > WINDOW_THRESHOLD;
  const viewportRef = useRef<HTMLDivElement>(null);

  // Mientras el usuario escribe, el navegador descarga (en ocio) el chunk del resultado + gráfica
  useEffect(() => {
    if (status === 'running') preloadResult();
  }, [status]);

  useLayoutEffect(() => {
    const vp = viewportRef.current;
    if (!vp || !windowed) return;
    const caret = vp.querySelector<HTMLElement>('[data-caret="true"]');
    if (!caret) return;
    const lineH = parseFloat(getComputedStyle(vp).lineHeight) || 48;
    const top = Math.max(0, caret.offsetTop - lineH);
    if (Math.abs(vp.scrollTop - top) > 1) {
      vp.scrollTo({ top, behavior: currentIndex === 0 ? 'auto' : 'smooth' });
    }
  }, [currentIndex, targetText, windowed]);

  // Timer interval for time mode
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (status === 'running') {
      // 250 ms: el tiempo real se calcula con el reloj en tickTimer, así el fin del test es preciso
      interval = setInterval(() => {
        tickTimer();
      }, 250);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status, tickTimer]);

  // Keyboard shortcuts (Tab / Esc = restart, Enter when finished = next test)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAnyModalOpen) return;

      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') &&
        target !== inputRef.current
      ) {
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

  /**
   * Captura de teclas con soporte de teclas muertas (acentos ´ ` ¨ ^) e IME.
   * En Linux (y a veces macOS) la secuencia es: Dead → composición → carácter final.
   * Si hacemos preventDefault durante la composición, el acento nunca llega (falla típica
   * que en Windows no se reproduce). compositionend entrega el carácter ya compuesto.
   */
  const composingRef = useRef(false);
  /** Si compositionend y keydown emiten el mismo carácter, ignorar el keydown duplicado. */
  const skipKeyRef = useRef<string | null>(null);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isAnyModalOpen) return;

    // No interceptar teclas muertas ni eventos mientras el IME está componiendo
    if (e.nativeEvent.isComposing || e.key === 'Dead' || e.key === 'Process' || composingRef.current) {
      return;
    }

    if (e.key === 'Backspace') {
      e.preventDefault();
      backspace();
      return;
    }

    // Ctrl/Cmd = atajos del sistema; no consumir. AltGr (Ctrl+Alt) se deja pasar
    // solo si llega un carácter imprimible (algunos layouts lo usan).
    if (e.ctrlKey || e.metaKey) {
      if (!(e.altKey && e.key.length === 1)) return;
    }

    if (e.key.length === 1) {
      // Duplicado tras compositionend: solo se omite si coincide el carácter
      if (skipKeyRef.current !== null) {
        const skip = skipKeyRef.current === e.key;
        skipKeyRef.current = null;
        if (skip) {
          e.preventDefault();
          return;
        }
      }
      e.preventDefault();
      processKey(e.key);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleCompositionStart = () => {
    composingRef.current = true;
  };

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
    composingRef.current = false;
    if (isAnyModalOpen) return;

    const data = e.data ?? '';
    for (const ch of data) {
      processKey(ch);
    }
    // Algunos navegadores emiten también un keydown con el carácter compuesto
    if (data.length === 1) {
      skipKeyRef.current = data;
      // Por si no llega ese keydown, no bloquear la siguiente letra real
      window.setTimeout(() => {
        if (skipKeyRef.current === data) skipKeyRef.current = null;
      }, 0);
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  const tokens = useMemo(() => tokenize(targetText), [targetText]);
  const expectedKey = currentIndex < targetText.length ? targetText[currentIndex] : null;
  const keyStats = adaptiveEngine.getKeyStats();

  const toggleBtn = (active: boolean) =>
    active
      ? 'bg-amber-500 text-neutral-950 font-bold'
      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white';

  return (
    <div className="w-full max-w-5xl mx-auto px-6 py-4 flex flex-col items-center justify-center min-h-[75vh]">
      {/* Input oculto para capturar pulsaciones. No usar w-0/h-0 ni pointer-events-none:
          en Linux eso rompe teclas muertas (acentos) e IME. Tamaño mínimo + opacity 0. */}
      <input
        ref={inputRef}
        data-typing-input
        type="text"
        className="absolute opacity-0 w-px h-px overflow-hidden border-0 p-0 m-0"
        style={{ caretColor: 'transparent' }}
        onKeyDown={handleInputKeyDown}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        autoFocus={!isAnyModalOpen}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck="false"
        disabled={isAnyModalOpen}
        tabIndex={0}
        aria-label="Área de escritura del test"
      />

      {/* Results View if Finished */}
      {status === 'finished' ? (
        <Suspense fallback={<div className="w-full min-h-[480px]" aria-busy="true" />}>
          <TestResultModal onRetry={() => initTest()} onNextTest={() => initTest()} />
        </Suspense>
      ) : (
        <div className="w-full flex flex-col items-center gap-8">
          {/* Mode Selector Toolbar */}
          <div
            className={`transition-opacity duration-300 flex flex-wrap items-center justify-center gap-3 bg-neutral-100 dark:bg-neutral-900/80 backdrop-blur-md p-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 ${
              status === 'running' ? 'opacity-20 hover:opacity-100' : 'opacity-100'
            }`}
          >
            {/* Modes — updateSettings already regenerates text; no extra initTest */}
            <div className="flex flex-wrap items-center justify-center gap-1">
              <button
                onClick={() => updateSettings({ mode: 'time' })}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  settings.mode === 'time' ? 'bg-amber-500 text-neutral-950 font-bold' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" /> Tiempo
              </button>
              <button
                onClick={() => updateSettings({ mode: 'words' })}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  settings.mode === 'words' ? 'bg-amber-500 text-neutral-950 font-bold' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <Hash className="w-3.5 h-3.5" /> Palabras
              </button>
              <button
                onClick={() => updateSettings({ mode: 'quote' })}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  settings.mode === 'quote' ? 'bg-amber-500 text-neutral-950 font-bold' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <AlignLeft className="w-3.5 h-3.5" /> Citas
              </button>
              <button
                onClick={() => updateSettings({ mode: 'prose' })}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  settings.mode === 'prose' ? 'bg-amber-500 text-neutral-950 font-bold' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" /> Prosa
              </button>
              <button
                onClick={() => updateSettings({ mode: 'adaptive' })}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  settings.mode === 'adaptive' ? 'bg-amber-500 text-neutral-950 font-bold' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Adaptativo
              </button>
              <button
                onClick={() => setIsCustomModalOpen(true)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  settings.mode === 'custom' ? 'bg-amber-500 text-neutral-950 font-bold' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
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
                    onClick={() => updateSettings({ timeSubMode: t as 15 | 30 | 60 | 120 })}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                      settings.timeSubMode === t
                        ? 'text-amber-500 bg-amber-500/10'
                        : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                    }`}
                  >
                    {t}s
                  </button>
                ))}
              </div>
            )}

            {(settings.mode === 'words' || settings.mode === 'adaptive') && (
              <div className="flex items-center gap-1 text-xs">
                {[10, 25, 50, 100].map((w) => (
                  <button
                    key={w}
                    onClick={() => updateSettings({ wordsSubMode: w as 10 | 25 | 50 | 100 })}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                      settings.wordsSubMode === w
                        ? 'text-amber-500 bg-amber-500/10'
                        : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            )}

            {settings.mode === 'prose' && (
              <div className="flex items-center gap-1 text-xs" title="Longitud de la prosa (párrafos)">
                {([1, 2, 3, 5] as const).map((n) => (
                  <button
                    key={n}
                    onClick={() => updateSettings({ proseLength: n })}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                      settings.proseLength === n
                        ? 'text-amber-500 bg-amber-500/10'
                        : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                    }`}
                  >
                    {n} {n === 1 ? 'párr.' : 'párrs.'}
                  </button>
                ))}
              </div>
            )}

            <div className="w-[1px] h-5 bg-neutral-300 dark:bg-neutral-700" />

            {/* Option toggles: punctuation, numbers, keyboard, strict */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => updateSettings({ includePunctuation: !settings.includePunctuation })}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${toggleBtn(settings.includePunctuation)}`}
                title="Incluir puntuación (, .)"
              >
                <CaseSensitive className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">,@</span>
              </button>
              <button
                onClick={() => updateSettings({ includeNumbers: !settings.includeNumbers })}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${toggleBtn(settings.includeNumbers)}`}
                title="Incluir números"
              >
                <Binary className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">123</span>
              </button>
              <button
                onClick={() => updateSettings({ showVirtualKeyboard: !settings.showVirtualKeyboard })}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${toggleBtn(settings.showVirtualKeyboard)}`}
                title="Mostrar teclado virtual"
              >
                <Keyboard className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() =>
                  updateSettings({
                    errorMode: settings.errorMode === 'strict' ? 'normal' : 'strict',
                  })
                }
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${toggleBtn(settings.errorMode === 'strict')}`}
                title={
                  settings.errorMode === 'strict'
                    ? 'Modo estricto: no avanza con error'
                    : 'Activar modo estricto'
                }
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Strict</span>
              </button>
            </div>
          </div>

          {/* Live WPM & Timer Header */}
          <div className="w-full flex items-center justify-between px-2 font-mono text-xl font-bold" aria-live="off">
            <div className="text-amber-500 flex items-center gap-2">
              {settings.mode === 'time' ? `${timeRemaining}s` : `${currentIndex} / ${targetText.length}`}
            </div>
            {settings.liveWpm && (
              <div className="text-neutral-400 text-sm flex items-center gap-4">
                <span>{wpm} PPM</span>
                <span title="Pulsaciones por minuto">{kpm} KPM</span>
                <span>{accuracy}% prec</span>
              </div>
            )}
          </div>

          {/* Main Text Display — texto completo, o ventana de 4 líneas sin scroll manual */}
          <div
            className="w-full bg-white dark:bg-neutral-900/40 p-8 md:p-12 rounded-3xl border border-neutral-200 dark:border-neutral-800/80 shadow-sm select-none cursor-text min-h-[220px] flex items-start"
            onClick={focusTypingInput}
          >
            <div
              ref={viewportRef}
              data-testid="text-viewport"
              className={`font-mono ${
                targetText.length > 300 ? 'text-xl md:text-2xl' : 'text-2xl md:text-3xl'
              } leading-[1.9] tracking-wide w-full ${windowed ? 'overflow-hidden' : ''}`}
              style={windowed ? { height: '7.6em' } : undefined}
            >
              <div className="relative">
                {tokens.map((tok) => (
                  <span key={tok.start} className="inline-block whitespace-pre">
                    {tok.text.split('').map((char, i) => {
                      const idx = tok.start + i;
                      const typed = typedChars[idx];
                      const state: CharState = typed ? (typed.correct ? 'correct' : 'wrong') : 'untyped';
                      return <Char key={idx} char={char} state={state} isCurrent={idx === currentIndex} />;
                    })}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Controls Hint & Restart */}
          <div className="flex items-center justify-between w-full px-2">
            <div className="text-xs text-neutral-400 flex items-center gap-3 flex-wrap">
              <span>
                Pulsa{' '}
                <kbd className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-md font-mono text-neutral-800 dark:text-neutral-200">
                  Tab
                </kbd>{' '}
                o{' '}
                <kbd className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-md font-mono text-neutral-800 dark:text-neutral-200">
                  Esc
                </kbd>{' '}
                para reiniciar
              </span>
              {settings.errorMode === 'strict' && (
                <>
                  <span>•</span>
                  <span className="text-rose-400">Modo estricto activo</span>
                </>
              )}
            </div>

            <button
              onClick={() => initTest()}
              aria-label="Reiniciar test"
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
