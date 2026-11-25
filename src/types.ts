export type TestMode = 'time' | 'words' | 'quote' | 'zen' | 'custom' | 'adaptive';
export type TimeSubMode = 15 | 30 | 60 | 120;
export type WordsSubMode = 10 | 25 | 50 | 100;

export interface TestSettings {
  mode: TestMode;
  timeSubMode: TimeSubMode;
  wordsSubMode: WordsSubMode;
  language: 'es';
  layout: 'qwerty-es';
  includePunctuation: boolean;
  includeNumbers: boolean;
  errorMode: 'normal' | 'strict'; // normal = allow backspace, strict = stop on error
  soundEnabled: boolean;
  soundTheme: 'mechanical' | 'bubble' | 'typewriter';
  showVirtualKeyboard: boolean;
  liveWpm: boolean;
}

export interface KeyStats {
  key: string;
  samples: number;
  avgMs: number;
  emaMs: number;
  errors: number;
  confidence: number; // 0 to 1
  unlocked: boolean;
}

export interface TestResult {
  id: string;
  userId?: string;
  mode: string;
  subMode: string | number;
  wpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  charsCorrect: number;
  charsWrong: number;
  charsExtra: number;
  charsMissed: number;
  durationSeconds: number;
  wpmSeries: number[];
  createdAt: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  xp: number;
  level: number;
  streak: number;
  maxStreak: number;
  lastActiveDate: string;
  dailyGoalMinutes: number;
  minutesToday: number;
  isGuest?: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress?: number;
  maxProgress?: number;
}

export type DbConnectionStatus = 'connected' | 'offline' | 'checking' | 'error';
