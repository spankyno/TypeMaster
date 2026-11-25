import { create } from 'zustand';
import { TestSettings, TestResult, UserProfile, Achievement, DbConnectionStatus } from '../types';
import { SPANISH_WORDS, SPANISH_QUOTES } from '../data/spanishWords';
import { AdaptiveEngine, KeyRecord } from '../lib/adaptive/adaptiveEngine';
import { soundEngine } from '../lib/engine/soundEngine';

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

  // Actions
  setIsAuthModalOpen: (open: boolean) => void;
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
  loginUser: (username: string, email?: string) => Promise<{ success: boolean; error?: string }>;
  logoutUser: () => void;
  checkDbConnection: () => Promise<void>;
}

const DEFAULT_SETTINGS: TestSettings = {
  mode: 'time',
  timeSubMode: 30,
  wordsSubMode: 25,
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

export const useTypingStore = create<TypingState>((set, get) => {
  let savedKeyStats: Record<string, KeyRecord> | undefined = undefined;
  let savedHistory: TestResult[] = [];
  let savedProfile: UserProfile = {
    id: 'guest',
    username: 'Mecanógrafo Invitado',
    email: 'guest@typemaster.pro',
    xp: 0,
    level: 1,
    streak: 1,
    maxStreak: 1,
    lastActiveDate: new Date().toISOString().split('T')[0],
    dailyGoalMinutes: 10,
    minutesToday: 0,
    isGuest: true
  };

  try {
    const lsHistory = localStorage.getItem('typemaster_history');
    if (lsHistory) savedHistory = JSON.parse(lsHistory);

    const lsProfile = localStorage.getItem('typemaster_profile');
    if (lsProfile) savedProfile = JSON.parse(lsProfile);

    const lsKeyStats = localStorage.getItem('typemaster_keystats');
    if (lsKeyStats) savedKeyStats = JSON.parse(lsKeyStats);
  } catch (e) {
    // fallback
  }

  const adaptive = new AdaptiveEngine(savedKeyStats);

  const generateText = (settings: TestSettings, adaptiveEngine: AdaptiveEngine): string => {
    if (settings.mode === 'adaptive') {
      const count = settings.wordsSubMode || 25;
      return adaptiveEngine.generateAdaptiveText(count);
    }
    if (settings.mode === 'quote') {
      const q = SPANISH_QUOTES[Math.floor(Math.random() * SPANISH_QUOTES.length)];
      return q;
    }
    const count = settings.wordsSubMode || 25;
    const shuffled = [...SPANISH_WORDS].sort(() => 0.5 - Math.random());
    let words = shuffled.slice(0, count);

    if (settings.includePunctuation) {
      words = words.map((w, i) => {
        if (i > 0 && i % 4 === 0) return w + ',';
        if (i > 0 && i % 8 === 0) return w + '.';
        return w;
      });
    }

    if (settings.includeNumbers) {
      words = words.map((w, i) => {
        if (i % 6 === 0) return `${Math.floor(Math.random() * 90) + 10}`;
        return w;
      });
    }

    return words.join(' ');
  };

  const initialSettings = DEFAULT_SETTINGS;
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

    profile: savedProfile,
    achievements: INITIAL_ACHIEVEMENTS,
    testHistory: savedHistory,
    adaptiveEngine: adaptive,
    activeKey: null,
    lastKeyError: false,
    lastKeyTime: null,

    dbStatus: 'checking',
    isAuthModalOpen: false,

    setIsAuthModalOpen: (open: boolean) => set({ isAuthModalOpen: open }),

    checkDbConnection: async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          const data = await res.json();
          if (data?.database?.connected) {
            set({ dbStatus: 'connected' });
            return;
          }
        }
        set({ dbStatus: 'offline' });
      } catch {
        set({ dbStatus: 'offline' });
      }
    },

    loadSavedData: async () => {
      const state = get();
      state.checkDbConnection();

      try {
        const userId = state.profile.id || 'guest';
        // Cargar tests desde la base de datos (Neon)
        const testsRes = await fetch(`/api/tests?userId=${encodeURIComponent(userId)}`);
        if (testsRes.ok) {
          const apiTests = await testsRes.json();
          if (Array.isArray(apiTests) && apiTests.length > 0) {
            set((currentState) => {
              const existingIds = new Set(currentState.testHistory.map((t) => t.id));
              const newTests = apiTests.filter((t: TestResult) => !existingIds.has(t.id));
              const merged = [...currentState.testHistory, ...newTests].sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              );
              localStorage.setItem('typemaster_history', JSON.stringify(merged));
              return { testHistory: merged };
            });
          }
        }

        // Cargar usuario desde la base de datos (Neon)
        const userRes = await fetch(`/api/user?id=${encodeURIComponent(userId)}`);
        if (userRes.ok) {
          const apiUser = await userRes.json();
          if (apiUser && apiUser.id) {
            set((currentState) => {
              const updatedProfile = {
                ...currentState.profile,
                ...apiUser,
                xp: Math.max(currentState.profile.xp, apiUser.xp || 0),
                level: Math.max(currentState.profile.level, apiUser.level || 1),
              };
              localStorage.setItem('typemaster_profile', JSON.stringify(updatedProfile));
              return { profile: updatedProfile };
            });
          }
        }
      } catch (e) {
        // Fallback local
      }
    },

    loginUser: async (username: string, email: string = '') => {
      try {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          return { success: false, error: data.error || 'Error al iniciar sesión' };
        }

        const user: UserProfile = { ...data.user, isGuest: false };
        const tests: TestResult[] = Array.isArray(data.tests) ? data.tests : [];

        set({
          profile: user,
          testHistory: tests,
          dbStatus: 'connected'
        });

        localStorage.setItem('typemaster_profile', JSON.stringify(user));
        localStorage.setItem('typemaster_history', JSON.stringify(tests));

        return { success: true };
      } catch (err: any) {
        // Fallback local en caso de que esté offline
        const localId = 'usr_' + username.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const localProfile: UserProfile = {
          id: localId,
          username: username.trim(),
          email: email.trim(),
          xp: 0,
          level: 1,
          streak: 1,
          maxStreak: 1,
          lastActiveDate: new Date().toISOString().split('T')[0],
          dailyGoalMinutes: 10,
          minutesToday: 0,
          isGuest: false
        };

        set({ profile: localProfile, dbStatus: 'offline' });
        localStorage.setItem('typemaster_profile', JSON.stringify(localProfile));

        return { success: true };
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
        lastActiveDate: new Date().toISOString().split('T')[0],
        dailyGoalMinutes: 10,
        minutesToday: 0,
        isGuest: true
      };
      set({ profile: guestUser, testHistory: [] });
      localStorage.setItem('typemaster_profile', JSON.stringify(guestUser));
      localStorage.setItem('typemaster_history', JSON.stringify([]));
    },

    updateSettings: (newSettings) => {
      set((state) => {
        const updated = { ...state.settings, ...newSettings };
        soundEngine.setEnabled(updated.soundEnabled);
        soundEngine.setTheme(updated.soundTheme);
        const newText = generateText(updated, state.adaptiveEngine);
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
          activeKey: null,
          lastKeyError: false,
          lastKeyTime: null
        };
      });
    },

    initTest: (customText) => {
      set((state) => {
        const text = customText || generateText(state.settings, state.adaptiveEngine);
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
          activeKey: null,
          lastKeyError: false,
          lastKeyTime: null
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
        const target = currentState.targetText;
        const index = currentState.currentIndex;
        let typedChars = [...currentState.typedChars];
        let correctCount = currentState.charsCorrect;
        let wrongCount = currentState.charsWrong;
        let extraCount = currentState.charsExtra;

        // Highlight active key on virtual keyboard
        const isError = index < target.length ? key !== target[index] : true;
        
        soundEngine.playKeySound(isError);

        if (currentState.settings.errorMode === 'strict' && isError) {
          return { activeKey: key, lastKeyError: true, lastKeyTime: performance.now() };
        }

        if (index < target.length) {
          const expected = target[index];
          const correct = key === expected;
          typedChars.push({ char: key, correct, extra: false });
          if (correct) correctCount++;
          else wrongCount++;
        } else {
          // Extra chars beyond target length
          typedChars.push({ char: key, correct: false, extra: true });
          extraCount++;
        }

        const newIndex = index + 1;
        const totalTyped = typedChars.length;
        const accuracy = totalTyped > 0 ? Math.round((correctCount / totalTyped) * 100) : 100;

        // Calculate WPM
        const now = performance.now();
        const start = currentState.startTime || now;
        const minutes = Math.max(0.001, (now - start) / 60000);
        const wpm = Math.round((correctCount / 5) / minutes);
        const rawWpm = Math.round((totalTyped / 5) / minutes);

        // Calculate actual latency for this keystroke
        let latencyMs = 150;
        if (currentState.lastKeyTime) {
          latencyMs = Math.min(1000, Math.max(30, Math.round(now - currentState.lastKeyTime)));
        }

        // Update adaptive engine if mode is adaptive
        if (currentState.settings.mode === 'adaptive' && index < target.length) {
          const expectedKey = target[index];
          currentState.adaptiveEngine.recordKeyStroke(expectedKey, latencyMs, isError);
        }

        // Check if words mode, quote mode, adaptive or custom mode is finished
        let newStatus = currentState.status;
        if (currentState.settings.mode === 'words' && newIndex >= target.length) {
          newStatus = 'finished';
        } else if (currentState.settings.mode === 'quote' && newIndex >= target.length) {
          newStatus = 'finished';
        } else if (currentState.settings.mode === 'adaptive' && newIndex >= target.length) {
          newStatus = 'finished';
        } else if (currentState.settings.mode === 'custom' && newIndex >= target.length) {
          newStatus = 'finished';
        }

        return {
          typedChars,
          currentIndex: newIndex,
          charsCorrect: correctCount,
          charsWrong: wrongCount,
          charsExtra: extraCount,
          accuracy,
          wpm: Math.max(0, wpm),
          rawWpm: Math.max(0, rawWpm),
          activeKey: key,
          lastKeyError: isError,
          lastKeyTime: now,
          status: newStatus
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

        const newIndex = state.currentIndex - 1;
        const totalTyped = typedChars.length;
        const accuracy = totalTyped > 0 ? Math.round((correctCount / totalTyped) * 100) : 100;

        return {
          typedChars,
          currentIndex: newIndex,
          charsCorrect: correctCount,
          charsWrong: wrongCount,
          charsExtra: extraCount,
          accuracy
        };
      });
    },

    tickTimer: () => {
      const state = get();
      if (state.status !== 'running') return;

      const elapsed = state.elapsedSeconds + 1;
      const timeRem = state.settings.timeSubMode - elapsed;

      // Update WPM series for chart
      const series = [...state.wpmSeries, state.wpm];

      if (state.settings.mode === 'time' && timeRem <= 0) {
        set({ elapsedSeconds: elapsed, timeRemaining: 0, wpmSeries: series, status: 'finished' });
        get().finishTest();
        return;
      }

      set({
        elapsedSeconds: elapsed,
        timeRemaining: Math.max(0, timeRem),
        wpmSeries: series
      });
    },

    finishTest: () => {
      const state = get();
      if (state.status === 'finished' && state.startTime) {
        // Already recorded
      }
      set({ status: 'finished' });

      const result: TestResult = {
        id: 'test_' + Date.now(),
        userId: state.profile.id || 'guest',
        mode: state.settings.mode,
        subMode: state.settings.mode === 'time' ? state.settings.timeSubMode : state.settings.wordsSubMode,
        wpm: state.wpm,
        rawWpm: state.rawWpm,
        accuracy: state.accuracy,
        consistency: state.consistency,
        charsCorrect: state.charsCorrect,
        charsWrong: state.charsWrong,
        charsExtra: state.charsExtra,
        charsMissed: state.charsMissed,
        durationSeconds: Math.max(1, state.elapsedSeconds || 1),
        wpmSeries: state.wpmSeries,
        createdAt: new Date().toISOString()
      };

      const newHistory = [result, ...state.testHistory];
      const xpEarned = Math.round(state.wpm * 2 + state.accuracy * 0.5 + (state.charsCorrect / 5));
      const newXp = state.profile.xp + xpEarned;
      const newLevel = Math.floor(newXp / 500) + 1;

      const newProfile = {
        ...state.profile,
        xp: newXp,
        level: newLevel,
        minutesToday: state.profile.minutesToday + Math.ceil(state.elapsedSeconds / 60)
      };

      // Check achievements
      const updatedAchievements = state.achievements.map((ach) => {
        if (ach.id === 'first_test') return { ...ach, unlocked: true };
        if (ach.id === 'wpm_50' && state.wpm >= 50) return { ...ach, unlocked: true };
        if (ach.id === 'wpm_80' && state.wpm >= 80) return { ...ach, unlocked: true };
        if (ach.id === 'accuracy_100' && state.accuracy === 100 && state.charsCorrect >= 20) return { ...ach, unlocked: true };
        return ach;
      });

      set({
        testHistory: newHistory,
        profile: newProfile,
        achievements: updatedAchievements
      });

      try {
        localStorage.setItem('typemaster_history', JSON.stringify(newHistory));
        localStorage.setItem('typemaster_profile', JSON.stringify(newProfile));
        localStorage.setItem('typemaster_keystats', JSON.stringify(state.adaptiveEngine.exportState().keyStats));

        // Sync with backend API (Neon Database)
        fetch('/api/tests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(result)
        })
        .then(async (res) => {
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            console.error('[TypeMaster] Error guardando test en servidor/Neon:', err);
          } else {
            console.log('[TypeMaster] Test guardado con éxito en Neon Database');
            set({ dbStatus: 'connected' });
          }
        })
        .catch((err) => {
          console.warn('[TypeMaster] Backend no alcanzable para persistir test:', err);
        });

        // Sync user profile
        fetch(`/api/user?id=${encodeURIComponent(newProfile.id)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newProfile)
        }).catch(() => {});
      } catch (e) {
        console.error('[TypeMaster] Error en almacenamiento:', e);
      }
    }
  };
});
