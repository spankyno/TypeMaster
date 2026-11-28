import { create } from 'zustand';
import { TestSettings, TestResult, UserProfile, Achievement, DbConnectionStatus } from '../types';
import { SPANISH_WORDS, SPANISH_QUOTES, SPANISH_PROSE } from '../data/spanishWords';
import { AdaptiveEngine, KeyRecord } from '../lib/adaptive/adaptiveEngine';
import { soundEngine } from '../lib/engine/soundEngine';

import { mergeProgress, normalizeKeyStats, uploadablePayload, type Progress } from '../lib/progress';
import {
  calcWpm,
  calcKpm,
  normalizeTest,
  shuffle,
  calcAccuracy,
  calculateConsistency,
  computeXp,
  levelFromXp,
  localDateStr,
  normalizeProfileDay,
  registerActivity,
  randomWords,
  decorateWords,
} from '../lib/typing';

type ProblemWords = Record<string, { seen: number; errors: number; avgMs: number }>;

const newTestId = () =>
  `test_${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`}`;

function safeSet(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // cuota / modo privado
  }
}

interface TypingState {
  settings: TestSettings;
  status: 'idle' | 'running' | 'paused' | 'finished';
  targetText: string;
  typedChars: { char: string; correct: boolean; extra: boolean }[];
  currentIndex: number;
  startTime: number | null;
  elapsedSeconds: number;
  timeRemaining: number;
  wpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  charsCorrect: number;
  charsWrong: number;
  charsExtra: number;
  charsMissed: number;
  wpmSeries: number[];
  /** Errores en modo estricto (pulsaciones erróneas que no avanzan el cursor) */
  strictMisses: number;
  /** Pulsaciones totales del test (aciertos + errores, sin Retroceso) y su ritmo por minuto */
  keystrokes: number;
  kpm: number;
  /** XP ganada en el último test (la misma cifra que se suma al perfil) */
  lastXpEarned: number;

  // Profile & Gamification
  profile: UserProfile;
  achievements: Achievement[];
  testHistory: TestResult[];
  adaptiveEngine: AdaptiveEngine;
  activeKey: string | null;
  lastKeyError: boolean;
  lastKeyTime: number | null;

  // Database and Auth State
  dbStatus: DbConnectionStatus;
  isAuthModalOpen: boolean;
  isAchievementsModalOpen: boolean;

  // Actions
  setIsAuthModalOpen: (open: boolean) => void;
  setIsAchievementsModalOpen: (open: boolean) => void;
  updateSettings: (newSettings: Partial<TestSettings>) => void;
  initTest: (customText?: string) => void;
  startTest: () => void;
  pauseTest: () => void;
  resumeTest: () => void;
  processKey: (key: string) => void;
  backspace: () => void;
  tickTimer: () => void;
  finishTest: () => void;
  loadSavedData: () => Promise<void>;
  /** Descarga el progreso de la nube, lo fusiona con el local y sube lo que falte */
  syncProgress: () => Promise<void>;
  /** Sube el progreso local (el servidor fusiona sin retroceder) */
  pushProgress: () => Promise<void>;
  /** Login with email + password */
  loginUser: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  /** Register with username, email + password */
  registerUser: (
    username: string,
    email: string,
    password: string,
    /** Campo trampa anti-bots: el formulario real lo envía siempre vacío */
    website?: string
  ) => Promise<{ success: boolean; error?: string }>;
  logoutUser: () => void;
  checkDbConnection: () => Promise<void>;
  resetAdaptiveProgress: () => void;
  /** JWT for authenticated API calls (null if guest) */
  authToken: string | null;
}

const DEFAULT_SETTINGS: TestSettings = {
  mode: 'time',
  timeSubMode: 30,
  wordsSubMode: 25,
  proseLength: 1,
  language: 'es',
  layout: 'qwerty-es',
  includePunctuation: false,
  includeNumbers: false,
  errorMode: 'normal',
  soundEnabled: false,
  soundTheme: 'mechanical',
  showVirtualKeyboard: true,
  liveWpm: true
};

const INITIAL_ACHIEVEMENTS: Achievement[] = [
  { id: 'first_test', title: 'Primeros Pasos', description: 'Completa tu primer test de mecanografía.', icon: 'Flag', unlocked: false },
  { id: 'wpm_50', title: 'Velocidad Estándar', description: 'Alcanza 50 PPM en cualquier test.', icon: 'Zap', unlocked: false },
  { id: 'wpm_80', title: 'Dedos de Fuego', description: 'Alcanza 80 PPM.', icon: 'Flame', unlocked: false },
  { id: 'accuracy_100', title: 'Cirujano del Teclado', description: 'Completa un test con 100% de precisión y al menos 25 palabras.', icon: 'Target', unlocked: false },
  { id: 'streak_3', title: 'Constancia', description: 'Mantén una racha de 3 días consecutivos.', icon: 'Calendar', unlocked: false }
];

/**
 * Fusiona el historial local (de invitado) con el de la nube sin duplicar por id,
 * y devuelve los tests locales que aún no existen en el servidor.
 */
function mergeHistories(local: TestResult[], cloud: TestResult[], userId: string) {
  const cloudIds = new Set(cloud.map((t) => t.id));
  const toUpload = local.filter((t) => !cloudIds.has(t.id)).slice(0, 100);
  const merged = [...cloud, ...toUpload.map((t) => ({ ...t, userId }))].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return { merged, toUpload };
}

const authJson = (token: string) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

/** El servidor acepta como máximo 20 tests por petición: se envían por tandas, en orden. */
const UPLOAD_BATCH = 20;
/** Tope del historial local (coincide con el tope por usuario del servidor). */
const MAX_LOCAL_HISTORY = 5000;

function uploadTests(token: string, tests: TestResult[]) {
  if (tests.length === 0) return;
  void (async () => {
    for (let i = 0; i < tests.length; i += UPLOAD_BATCH) {
      try {
        const res = await fetch('/api/tests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(tests.slice(i, i + UPLOAD_BATCH)),
        });
        if (!res.ok) return; // 401 / 429 / error: se reintentará en la siguiente sincronización
      } catch {
        return;
      }
    }
  })();
}

export const useTypingStore = create<TypingState>((set, get) => {
  let savedKeyStats: Record<string, KeyRecord> | undefined = undefined;
  let savedProblemWords: ProblemWords | undefined = undefined;
  let savedHistory: TestResult[] = [];
  let savedSettings: TestSettings = { ...DEFAULT_SETTINGS };
  let savedAchievements: Achievement[] = INITIAL_ACHIEVEMENTS.map((a) => ({ ...a }));
  let savedProfile: UserProfile = {
    id: 'guest',
    username: 'Mecanógrafo Invitado',
    email: 'guest@typemaster.pro',
    xp: 0,
    level: 1,
    streak: 1,
    maxStreak: 1,
    lastActiveDate: localDateStr(),
    dailyGoalMinutes: 10,
    minutesToday: 0,
    isGuest: true
  };
  /** Prevents double-recording the same finished test */
  let isRecordingResult = false;

  try {
    const lsHistory = localStorage.getItem('typemaster_history');
    if (lsHistory) savedHistory = (JSON.parse(lsHistory) as unknown[]).map(normalizeTest);

    const lsProfile = localStorage.getItem('typemaster_profile');
    if (lsProfile) savedProfile = JSON.parse(lsProfile);
    const lsToken = localStorage.getItem('typemaster_token');
    if (lsToken && savedProfile.id !== 'guest') {
      savedProfile = { ...savedProfile, isGuest: false };
    } else if (!lsToken) {
      // Sin JWT: siempre invitado (invalidar perfiles legacy sin contraseña)
      savedProfile = {
        ...savedProfile,
        id: 'guest',
        username: savedProfile.username || 'Mecanógrafo Invitado',
        isGuest: true,
      };
    }

    const lsProblem = localStorage.getItem('typemaster_problemwords');
    if (lsProblem) savedProblemWords = JSON.parse(lsProblem);

    const lsKeyStats = localStorage.getItem('typemaster_keystats');
    if (lsKeyStats) savedKeyStats = JSON.parse(lsKeyStats);

    const lsSettings = localStorage.getItem('typemaster_settings');
    if (lsSettings) {
      const parsed = JSON.parse(lsSettings);
      savedSettings = { ...DEFAULT_SETTINGS, ...parsed };
    }

    const lsAchievements = localStorage.getItem('typemaster_achievements');
    if (lsAchievements) {
      const parsed: Achievement[] = JSON.parse(lsAchievements);
      // Merge with INITIAL so new achievement definitions are kept
      savedAchievements = INITIAL_ACHIEVEMENTS.map((def) => {
        const found = parsed.find((p) => p.id === def.id);
        return found ? { ...def, unlocked: !!found.unlocked, progress: found.progress, maxProgress: found.maxProgress } : { ...def };
      });
    }
  } catch (e) {
    // fallback
  }

  // Racha rota / minutos de hoy: se normaliza al abrir la app
  savedProfile = normalizeProfileDay(savedProfile, localDateStr());

  const adaptive = new AdaptiveEngine(savedKeyStats, savedProblemWords);

  // Seguimiento por palabra para el motor adaptativo
  let wordStartIdx = 0;
  let wordErrors = 0;
  let wordStartTime = 0;
  const resetWordTracking = () => {
    wordStartIdx = 0;
    wordErrors = 0;
    wordStartTime = 0;
  };

  // Apply saved sound prefs on boot
  soundEngine.setEnabled(savedSettings.soundEnabled);
  soundEngine.setTheme(savedSettings.soundTheme);

  const generateText = (settings: TestSettings, adaptiveEngine: AdaptiveEngine): string => {
    if (settings.mode === 'adaptive') {
      const count = settings.wordsSubMode || 25;
      return adaptiveEngine.generateAdaptiveText(count);
    }
    if (settings.mode === 'quote') {
      const q = SPANISH_QUOTES[Math.floor(Math.random() * SPANISH_QUOTES.length)];
      return q;
    }
    if (settings.mode === 'prose') {
      // Longitud configurable: 1, 2, 3 o 5 párrafos distintos encadenados
      const paragraphs = Math.min(settings.proseLength || 1, SPANISH_PROSE.length);
      return shuffle(SPANISH_PROSE).slice(0, paragraphs).join(' ');
    }
    if (settings.mode === 'custom') {
      return ''; // custom text is supplied via initTest(customText)
    }
    // Modo tiempo: texto inicial largo; processKey lo amplía antes de que se acabe
    const count = settings.mode === 'time' ? 60 : settings.wordsSubMode || 25;
    return decorateWords(randomWords(SPANISH_WORDS, count), {
      punctuation: settings.includePunctuation,
      numbers: settings.includeNumbers,
    }).join(' ');
  };

  const generateMoreText = (settings: TestSettings): string =>
    decorateWords(randomWords(SPANISH_WORDS, 30), {
      punctuation: settings.includePunctuation,
      numbers: settings.includeNumbers,
    }).join(' ');

  const CONTENT_SETTING_KEYS: (keyof TestSettings)[] = [
    'mode',
    'timeSubMode',
    'wordsSubMode',
    'proseLength',
    'includePunctuation',
    'includeNumbers',
    'language',
  ];

  const initialSettings = savedSettings;
  const initialText = generateText(initialSettings, adaptive);

  return {
    settings: initialSettings,
    status: 'idle',
    targetText: initialText,
    typedChars: [],
    currentIndex: 0,
    startTime: null,
    elapsedSeconds: 0,
    timeRemaining: initialSettings.timeSubMode,
    wpm: 0,
    rawWpm: 0,
    accuracy: 100,
    consistency: 100,
    charsCorrect: 0,
    charsWrong: 0,
    charsExtra: 0,
    charsMissed: 0,
    wpmSeries: [],
    strictMisses: 0,
    keystrokes: 0,
    kpm: 0,
    lastXpEarned: 0,

    profile: savedProfile,
    achievements: savedAchievements,
    testHistory: savedHistory,
    adaptiveEngine: adaptive,
    activeKey: null,
    lastKeyError: false,
    lastKeyTime: null,

    // Los invitados usan solo localStorage: no se consulta la BD (cada consulta despierta Neon y gasta cuota)
    dbStatus: savedProfile.isGuest ? 'offline' : 'checking',
    isAuthModalOpen: false,
    isAchievementsModalOpen: false,
    authToken: (() => {
      try {
        return localStorage.getItem('typemaster_token');
      } catch {
        return null;
      }
    })(),

    setIsAuthModalOpen: (open: boolean) => set({ isAuthModalOpen: open }),
    setIsAchievementsModalOpen: (open: boolean) => set({ isAchievementsModalOpen: open }),

    checkDbConnection: async () => {
      try {
        // Comprobación superficial (no toca la BD, se cachea en el CDN). El estado real de la
        // nube lo confirman las propias peticiones autenticadas de datos.
        const res = await fetch('/api/health');
        if (res.ok) {
          const data = await res.json();
          if (data?.database?.configured) {
            set({ dbStatus: 'connected' });
            return;
          }
        }
        set({ dbStatus: 'offline' });
      } catch {
        set({ dbStatus: 'offline' });
      }
    },

    resetAdaptiveProgress: () => {
      const state = get();
      state.adaptiveEngine.resetProgress();
      try {
        localStorage.setItem(
          'typemaster_keystats',
          JSON.stringify(state.adaptiveEngine.exportState().keyStats)
        );
        localStorage.removeItem('typemaster_problemwords');
      } catch {
        // ignore
      }
      // Si hay sesión, el reinicio también se aplica en la nube (si no, la siguiente sincronización lo restauraría)
      const token = get().authToken;
      if (token && !state.profile.isGuest) {
        fetch('/api/progress', { method: 'DELETE', headers: authJson(token) }).catch(() => {});
      }
      // Trigger subscribers (engine is mutated in place)
      set({ adaptiveEngine: state.adaptiveEngine });
      if (state.settings.mode === 'adaptive') {
        get().initTest();
      }
    },

    loadSavedData: async () => {
      const state = get();
      // Sin llamada a /api/health aquí: lo hace AuthModal al abrirse. Para usuarios con sesión,
      // las propias peticiones de datos (abajo) determinan el estado de la conexión.

      const token = state.authToken || localStorage.getItem('typemaster_token');
      // Guests only use localStorage — no cloud sync
      if (!token || state.profile.isGuest || state.profile.id === 'guest') {
        return;
      }

      const authHeaders = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      try {
        const testsRes = await fetch('/api/tests', { headers: authHeaders });
        if (testsRes.ok) {
          set({ dbStatus: 'connected' });
          const apiTests = ((await testsRes.json()) as unknown[]).map(normalizeTest);
          if (apiTests.length > 0) {
            set((currentState) => {
              const existingIds = new Set(currentState.testHistory.map((t) => t.id));
              const newTests = apiTests.filter((t: TestResult) => !existingIds.has(t.id));
              const merged = [...currentState.testHistory, ...newTests].sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              );
              localStorage.setItem('typemaster_history', JSON.stringify(merged));
              return { testHistory: merged };
            });
          }
        } else if (testsRes.status === 401) {
          // Token expired
          get().logoutUser();
          return;
        }

        const userRes = await fetch('/api/user', { headers: authHeaders });
        if (userRes.ok) {
          const apiUser = await userRes.json();
          if (apiUser && apiUser.id) {
            set((currentState) => {
              const updatedProfile = normalizeProfileDay(
                {
                  ...currentState.profile,
                  ...apiUser,
                  isGuest: false,
                  xp: Math.max(currentState.profile.xp, apiUser.xp || 0),
                  level: Math.max(currentState.profile.level, apiUser.level || 1),
                },
                localDateStr()
              );
              localStorage.setItem('typemaster_profile', JSON.stringify(updatedProfile));
              return { profile: updatedProfile, authToken: token };
            });
          }
        }

        // Progreso adaptativo y logros
        await get().syncProgress();
      } catch (e) {
        // Fallback local
        set({ dbStatus: 'offline' });
      }
    },

    loginUser: async (email: string, password: string) => {
      try {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'login', email, password }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          return { success: false, error: data.error || 'Error al iniciar sesión' };
        }

        const guest = get().profile;
        const guestWasLocal = guest.id === 'guest' || !!guest.isGuest;
        const token: string = data.token;
        const cloudTests: TestResult[] = Array.isArray(data.tests) ? data.tests.map(normalizeTest) : [];
        const { merged, toUpload } = mergeHistories(
          guestWasLocal ? get().testHistory : [],
          cloudTests,
          data.user.id
        );
        // El progreso hecho como invitado (XP) no se pierde al iniciar sesión
        const user: UserProfile = normalizeProfileDay(
          {
            ...data.user,
            isGuest: false,
            xp: Math.max(data.user.xp ?? 0, guestWasLocal && toUpload.length > 0 ? guest.xp : 0),
            level: Math.max(data.user.level ?? 1, guestWasLocal && toUpload.length > 0 ? guest.level : 1),
          },
          localDateStr()
        );

        set({ profile: user, testHistory: merged, dbStatus: 'connected', authToken: token });
        safeSet('typemaster_profile', user);
        safeSet('typemaster_history', merged);
        try {
          localStorage.setItem('typemaster_token', token);
        } catch {
          // ignore
        }

        uploadTests(token, toUpload);
        void get().syncProgress();
        if (toUpload.length > 0) {
          fetch('/api/user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(user),
          }).catch(() => {});
        }

        return { success: true };
      } catch (err: any) {
        return {
          success: false,
          error: 'No se pudo conectar con el servidor. Comprueba tu conexión.',
        };
      }
    },

    registerUser: async (username: string, email: string, password: string, website = '') => {
      try {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'register', username, email, password, website }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          return { success: false, error: data.error || 'Error al registrarse' };
        }

        const guest = get().profile;
        const token: string = data.token;
        const { merged, toUpload } = mergeHistories(get().testHistory, [], data.user.id);

        // La cuenta nueva hereda XP/nivel/racha ganados como invitado
        const user: UserProfile = {
          ...data.user,
          isGuest: false,
          xp: guest.xp,
          level: guest.level,
          streak: Math.max(data.user.streak ?? 1, guest.streak),
          maxStreak: Math.max(data.user.maxStreak ?? 1, guest.maxStreak),
          lastActiveDate: guest.lastActiveDate,
          minutesToday: guest.minutesToday,
        };

        set({ profile: user, testHistory: merged, dbStatus: 'connected', authToken: token });
        safeSet('typemaster_profile', user);
        safeSet('typemaster_history', merged);
        try {
          localStorage.setItem('typemaster_token', token);
        } catch {
          // ignore
        }

        // Subir el historial y el progreso que ya tenías en este navegador
        uploadTests(token, toUpload);
        void get().syncProgress();
        fetch('/api/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(user),
        }).catch(() => {});

        return { success: true };
      } catch (err: any) {
        return {
          success: false,
          error: 'No se pudo conectar con el servidor. Comprueba tu conexión.',
        };
      }
    },

    syncProgress: async () => {
      const token = get().authToken || localStorage.getItem('typemaster_token');
      const profile = get().profile;
      if (!token || profile.isGuest || profile.id === 'guest') return;

      try {
        const res = await fetch('/api/progress', { headers: authJson(token) });
        if (res.status === 401) {
          get().logoutUser();
          return;
        }
        if (!res.ok) return;
        const data = await res.json();
        const cloud: Progress = {
          keyStats: normalizeKeyStats(data?.keyStats),
          achievements: Array.isArray(data?.achievements)
            ? data.achievements.filter((x: unknown): x is string => typeof x === 'string')
            : [],
        };

        const state = get();
        const local: Progress = {
          keyStats: state.adaptiveEngine.exportState().keyStats,
          achievements: state.achievements.filter((a) => a.unlocked).map((a) => a.id),
        };
        const { merged, needsUpload } = mergeProgress(local, cloud);

        // Aplica el resultado fusionado en este dispositivo
        state.adaptiveEngine.loadKeyStats(merged.keyStats);
        const achievements = state.achievements.map((a) =>
          merged.achievements.includes(a.id) ? { ...a, unlocked: true } : a
        );
        safeSet('typemaster_keystats', state.adaptiveEngine.exportState().keyStats);
        safeSet('typemaster_achievements', achievements);
        set({ adaptiveEngine: state.adaptiveEngine, achievements });
        if (get().settings.mode === 'adaptive' && get().status === 'idle') get().initTest();

        if (needsUpload) {
          await fetch('/api/progress', {
            method: 'POST',
            headers: authJson(token),
            body: JSON.stringify(uploadablePayload(merged)),
          });
        }
      } catch {
        // sin conexión: el progreso local se sincroniza en la próxima ocasión
      }
    },

    pushProgress: async () => {
      const token = get().authToken;
      const state = get();
      if (!token || state.profile.isGuest || state.profile.id === 'guest') return;
      try {
        await fetch('/api/progress', {
          method: 'POST',
          headers: authJson(token),
          body: JSON.stringify(
            uploadablePayload({
              keyStats: state.adaptiveEngine.exportState().keyStats,
              achievements: state.achievements.filter((a) => a.unlocked).map((a) => a.id),
            })
          ),
        });
      } catch {
        // se reintentará con el siguiente test
      }
    },

    logoutUser: () => {
      const guestUser: UserProfile = {
        id: 'guest',
        username: 'Mecanógrafo Invitado',
        email: 'guest@typemaster.pro',
        xp: 0,
        level: 1,
        streak: 1,
        maxStreak: 1,
        lastActiveDate: localDateStr(),
        dailyGoalMinutes: 10,
        minutesToday: 0,
        isGuest: true,
      };
      // El progreso pertenece a la cuenta (ya está en la nube): se limpia para no mezclarlo con otra cuenta
      const engine = get().adaptiveEngine;
      engine.resetProgress();
      const freshAchievements = INITIAL_ACHIEVEMENTS.map((a) => ({ ...a }));
      set({
        profile: guestUser,
        testHistory: [],
        authToken: null,
        adaptiveEngine: engine,
        achievements: freshAchievements,
      });
      if (get().settings.mode === 'adaptive') get().initTest();
      try {
        ['typemaster_keystats', 'typemaster_problemwords', 'typemaster_achievements'].forEach((k) =>
          localStorage.removeItem(k)
        );
        localStorage.removeItem('typemaster_token');
        localStorage.setItem('typemaster_profile', JSON.stringify(guestUser));
        localStorage.setItem('typemaster_history', JSON.stringify([]));
      } catch {
        // ignore
      }
    },

    updateSettings: (newSettings) => {
      set((state) => {
        const updated = { ...state.settings, ...newSettings };
        soundEngine.setEnabled(updated.soundEnabled);
        soundEngine.setTheme(updated.soundTheme);

        try {
          localStorage.setItem('typemaster_settings', JSON.stringify(updated));
        } catch {
          // ignore quota / private mode
        }

        const shouldRegen = CONTENT_SETTING_KEYS.some((k) => k in newSettings);
        if (!shouldRegen) {
          return { settings: updated };
        }

        isRecordingResult = false;
        resetWordTracking();
        const newText =
          updated.mode === 'custom' && state.settings.mode === 'custom' && state.targetText
            ? state.targetText
            : generateText(updated, state.adaptiveEngine);

        return {
          settings: updated,
          targetText: newText,
          status: 'idle',
          typedChars: [],
          currentIndex: 0,
          startTime: null,
          elapsedSeconds: 0,
          timeRemaining: updated.timeSubMode,
          wpm: 0,
          rawWpm: 0,
          accuracy: 100,
          consistency: 100,
          charsCorrect: 0,
          charsWrong: 0,
          charsExtra: 0,
          charsMissed: 0,
          wpmSeries: [],
          strictMisses: 0,
          keystrokes: 0,
          kpm: 0,
          lastXpEarned: 0,
          activeKey: null,
          lastKeyError: false,
          lastKeyTime: null,
        };
      });
    },

    initTest: (customText) => {
      isRecordingResult = false;
      resetWordTracking();
      set((state) => {
        const text =
          customText !== undefined
            ? customText
            : state.settings.mode === 'custom' && state.targetText
              ? state.targetText
              : generateText(state.settings, state.adaptiveEngine);
        return {
          status: 'idle',
          targetText: text,
          typedChars: [],
          currentIndex: 0,
          startTime: null,
          elapsedSeconds: 0,
          timeRemaining: state.settings.timeSubMode,
          wpm: 0,
          rawWpm: 0,
          accuracy: 100,
          consistency: 100,
          charsCorrect: 0,
          charsWrong: 0,
          charsExtra: 0,
          charsMissed: 0,
          wpmSeries: [],
          strictMisses: 0,
          keystrokes: 0,
          kpm: 0,
          lastXpEarned: 0,
          activeKey: null,
          lastKeyError: false,
          lastKeyTime: null,
        };
      });
    },

    startTest: () => {
      set({
        status: 'running',
        startTime: performance.now(),
        elapsedSeconds: 0
      });
    },

    pauseTest: () => {
      set({ status: 'paused' });
    },

    resumeTest: () => {
      set({ status: 'running' });
    },

    processKey: (key: string) => {
      const state = get();
      if (state.status === 'finished') return;

      if (state.status === 'idle') {
        state.startTest();
      }

      set((currentState) => {
        let target = currentState.targetText;
        const index = currentState.currentIndex;
        const typedChars = [...currentState.typedChars];
        let correctCount = currentState.charsCorrect;
        let wrongCount = currentState.charsWrong;
        let extraCount = currentState.charsExtra;
        let strictMisses = currentState.strictMisses;
        const mode = currentState.settings.mode;

        const now = performance.now();
        const isError = index < target.length ? key !== target[index] : true;
        const keystrokes = currentState.keystrokes + 1;

        soundEngine.playKeySound(isError);

        // Latencia real de esta pulsación (para el motor adaptativo)
        let latencyMs = 150;
        if (currentState.lastKeyTime) {
          latencyMs = Math.min(1000, Math.max(30, Math.round(now - currentState.lastKeyTime)));
        }
        if (!wordStartTime) wordStartTime = now;

        // Las estadísticas por letra se registran en todos los modos
        if (index < target.length && /[a-zñáéíóúüA-ZÑÁÉÍÓÚÜ]/.test(target[index])) {
          currentState.adaptiveEngine.recordKeyStroke(target[index], latencyMs, isError);
        }
        if (isError) wordErrors++;

        // Modo estricto: el error no avanza el cursor, pero SÍ cuenta para la precisión
        if (currentState.settings.errorMode === 'strict' && isError) {
          strictMisses++;
          const start = currentState.startTime || now;
          return {
            strictMisses,
            keystrokes,
            kpm: calcKpm(keystrokes, now - start),
            accuracy: calcAccuracy(correctCount, typedChars.length, strictMisses),
            wpm: calcWpm(correctCount, now - start),
            activeKey: key,
            lastKeyError: true,
            lastKeyTime: now,
          };
        }

        if (index < target.length) {
          const correct = key === target[index];
          typedChars.push({ char: key, correct, extra: false });
          if (correct) correctCount++;
          else wrongCount++;
        } else {
          typedChars.push({ char: key, correct: false, extra: true });
          extraCount++;
        }

        const newIndex = index + 1;
        const accuracy = calcAccuracy(correctCount, typedChars.length, strictMisses);
        const elapsedMs = now - (currentState.startTime || now);
        const wpm = calcWpm(correctCount, elapsedMs);
        const rawWpm = calcWpm(typedChars.length, elapsedMs);

        // Fin de palabra → alimentar "palabras problemáticas" del modo adaptativo
        const endsWord = index < target.length && (target[index] === ' ' || newIndex >= target.length);
        if (endsWord) {
          const word = target.slice(wordStartIdx, endsWord && target[index] === ' ' ? index : newIndex).trim();
          if (word.length > 1) {
            currentState.adaptiveEngine.recordWord(word, wordErrors, (now - wordStartTime) / word.length);
          }
          wordStartIdx = newIndex;
          wordErrors = 0;
          wordStartTime = now;
        }

        // Modo tiempo: nunca debe acabarse el texto (antes eran solo 25 palabras)
        if (mode === 'time' && target.length - newIndex < 150) {
          target = `${target} ${generateMoreText(currentState.settings)}`;
        }

        const finishesByText =
          mode !== 'time' && mode !== 'zen' && newIndex >= target.length;

        return {
          targetText: target,
          typedChars,
          currentIndex: newIndex,
          charsCorrect: correctCount,
          charsWrong: wrongCount,
          charsExtra: extraCount,
          strictMisses,
          keystrokes,
          kpm: calcKpm(keystrokes, elapsedMs),
          accuracy,
          wpm,
          rawWpm,
          activeKey: key,
          lastKeyError: isError,
          lastKeyTime: now,
          status: finishesByText ? ('finished' as const) : currentState.status,
        };
      });

      if (get().status === 'finished') {
        get().finishTest();
      }
    },

    backspace: () => {
      set((state) => {
        if (state.currentIndex <= 0 || state.status === 'finished') return {};
        const typedChars = [...state.typedChars];
        const removed = typedChars.pop();
        let correctCount = state.charsCorrect;
        let wrongCount = state.charsWrong;
        let extraCount = state.charsExtra;

        if (removed) {
          if (removed.extra) extraCount--;
          else if (removed.correct) correctCount--;
          else wrongCount--;
        }

        // Si se borra hacia una palabra anterior, el seguimiento de palabra se reinicia
        const newIndex = state.currentIndex - 1;
        if (newIndex < wordStartIdx) {
          wordStartIdx = Math.max(0, state.targetText.lastIndexOf(' ', newIndex - 1) + 1);
          wordErrors = 0;
        }

        return {
          typedChars,
          currentIndex: newIndex,
          charsCorrect: correctCount,
          charsWrong: wrongCount,
          charsExtra: extraCount,
          accuracy: calcAccuracy(correctCount, typedChars.length, state.strictMisses),
        };
      });
    },

    tickTimer: () => {
      const state = get();
      if (state.status !== 'running' || state.startTime === null) return;

      // El tiempo se mide con el reloj, no contando ticks: los navegadores
      // ralentizan los setInterval en pestañas en segundo plano.
      const elapsedMs = performance.now() - state.startTime;
      const limitMs = state.settings.timeSubMode * 1000;

      if (state.settings.mode === 'time' && elapsedMs >= limitMs) {
        set({ elapsedSeconds: state.settings.timeSubMode, timeRemaining: 0, status: 'finished' });
        get().finishTest();
        return;
      }

      const sec = Math.floor(elapsedMs / 1000);
      // El PPM en vivo también baja si dejas de teclear
      const liveWpm = calcWpm(state.charsCorrect, elapsedMs);
      const liveKpm = calcKpm(state.keystrokes, elapsedMs);
      if (sec === state.elapsedSeconds) {
        if (liveWpm !== state.wpm || liveKpm !== state.kpm) set({ wpm: liveWpm, kpm: liveKpm });
        return;
      }

      set({
        elapsedSeconds: sec,
        timeRemaining: Math.max(0, state.settings.timeSubMode - sec),
        wpm: liveWpm,
        kpm: liveKpm,
        wpmSeries: [...state.wpmSeries, liveWpm],
      });
    },

    finishTest: () => {
      if (isRecordingResult) return;
      isRecordingResult = true;

      const state = get();
      const now = performance.now();
      const isTime = state.settings.mode === 'time';

      // Cifras finales calculadas sobre el tiempo REAL (en modo tiempo, exactamente el límite)
      const elapsedMs = isTime
        ? state.settings.timeSubMode * 1000
        : Math.max(1000, now - (state.startTime ?? now));
      const durationSeconds = Math.max(1, Math.round((elapsedMs / 1000) * 100) / 100);
      const wpm = calcWpm(state.charsCorrect, elapsedMs);
      const rawWpm = calcWpm(state.typedChars.length, elapsedMs);
      const kpm = calcKpm(state.keystrokes, elapsedMs);
      const accuracy = calcAccuracy(state.charsCorrect, state.typedChars.length, state.strictMisses);

      const wpmSeries = [...state.wpmSeries];
      if (wpmSeries.length === 0 || (!isTime && wpmSeries.length < Math.floor(durationSeconds))) {
        wpmSeries.push(wpm);
      }
      const consistency = calculateConsistency(wpmSeries);
      const charsMissed = isTime ? 0 : Math.max(0, state.targetText.length - state.currentIndex);

      const result: TestResult = {
        id: newTestId(),
        userId: state.profile.id || 'guest',
        mode: state.settings.mode,
        subMode: isTime
          ? state.settings.timeSubMode
          : state.settings.mode === 'prose'
            ? state.settings.proseLength
            : state.settings.wordsSubMode,
        wpm,
        rawWpm,
        kpm,
        keystrokes: state.keystrokes,
        accuracy,
        consistency,
        charsCorrect: state.charsCorrect,
        charsWrong: state.charsWrong,
        charsExtra: state.charsExtra,
        charsMissed,
        durationSeconds,
        wpmSeries,
        createdAt: new Date().toISOString(),
      };

      const previousBestWpm =
        state.testHistory.length > 0 ? Math.max(...state.testHistory.map((t) => t.wpm)) : 0;
      const isPersonalBest = wpm > previousBestWpm && wpm > 0;

      const newHistory = [result, ...state.testHistory].slice(0, MAX_LOCAL_HISTORY);
      const xpEarned = computeXp(wpm, accuracy, state.charsCorrect);
      const newXp = state.profile.xp + xpEarned;

      // Racha diaria + minutos practicados hoy
      const withActivity = registerActivity(state.profile, localDateStr());
      const newProfile = {
        ...withActivity,
        xp: newXp,
        level: levelFromXp(newXp),
        minutesToday: withActivity.minutesToday + Math.max(1, Math.round(durationSeconds / 60)),
      };

      const newlyUnlocked: string[] = [];
      const updatedAchievements = state.achievements.map((ach) => {
        if (ach.unlocked) return ach;
        let unlock = false;
        if (ach.id === 'first_test') unlock = true;
        if (ach.id === 'wpm_50' && wpm >= 50) unlock = true;
        if (ach.id === 'wpm_80' && wpm >= 80) unlock = true;
        // 25 palabras ≈ 125 caracteres (coincide con la descripción del logro)
        if (ach.id === 'accuracy_100' && accuracy === 100 && state.charsCorrect >= 125) unlock = true;
        if (ach.id === 'streak_3' && newProfile.streak >= 3) unlock = true;
        if (unlock) {
          newlyUnlocked.push(ach.id);
          return { ...ach, unlocked: true };
        }
        return ach;
      });

      set({
        wpm,
        rawWpm,
        kpm,
        accuracy,
        consistency,
        charsMissed,
        wpmSeries,
        status: 'finished',
        lastXpEarned: xpEarned,
        testHistory: newHistory,
        profile: newProfile,
        achievements: updatedAchievements,
      });

      if (isPersonalBest || newlyUnlocked.length > 0) {
        // Carga diferida: la librería de confeti (solo se usa al batir récord) no pesa en la carga inicial
        void import('canvas-confetti')
          .then((m) =>
            m.default({
            particleCount: isPersonalBest ? 120 : 70,
            spread: 70,
            origin: { y: 0.65 },
            colors: ['#f59e0b', '#6366f1', '#10b981', '#f43f5e'],
          })
          )
          .catch(() => {
            // el confeti es opcional
          });
      }

      const engineState = state.adaptiveEngine.exportState();
      safeSet('typemaster_history', newHistory);
      safeSet('typemaster_profile', newProfile);
      safeSet('typemaster_keystats', engineState.keyStats);
      safeSet('typemaster_problemwords', engineState.problemWords);
      safeSet('typemaster_achievements', updatedAchievements);

      // Sincronización en la nube solo para usuarios registrados
      const token = get().authToken;
      if (token && newProfile.id !== 'guest' && !newProfile.isGuest) {
        const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

        fetch('/api/tests', { method: 'POST', headers: authHeaders, body: JSON.stringify(result) })
          .then(async (res) => {
            if (res.ok) {
              set({ dbStatus: 'connected' });
            } else if (res.status === 401) {
              get().logoutUser(); // sesión revocada o expirada
            } else {
              console.error('[TypeMaster] Error guardando test:', await res.json().catch(() => ({})));
            }
          })
          .catch((err) => console.warn('[TypeMaster] Backend no alcanzable:', err));

        fetch('/api/user', { method: 'POST', headers: authHeaders, body: JSON.stringify(newProfile) }).catch(() => {});
        void get().pushProgress();
      }
    },
  };
});
