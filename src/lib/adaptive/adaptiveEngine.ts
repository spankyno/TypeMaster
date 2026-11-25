import { SPANISH_WORDS } from '../../data/spanishWords';

export interface KeyRecord {
  key: string;
  samples: number;
  avgMs: number;
  emaMs: number;
  errors: number;
  confidence: number;
  unlocked: boolean;
}

const INITIAL_UNLOCKED_LETTERS = ['e', 's', 'a', 'r', 'n', 'i'];
const ALL_LETTERS = ['e', 's', 'a', 'r', 'n', 'i', 't', 'o', 'l', 'c', 'd', 'u', 'm', 'p', 'b', 'g', 'v', 'y', 'q', 'h', 'f', 'z', 'j', 'ñ', 'x', 'k', 'w'];

export class AdaptiveEngine {
  private keyStats: Record<string, KeyRecord> = {};
  private problemWords: Record<string, { seen: number; errors: number; avgMs: number }> = {};

  constructor(savedKeyStats?: Record<string, KeyRecord>, savedProblemWords?: Record<string, any>) {
    // Initialize key stats
    for (const letter of ALL_LETTERS) {
      if (savedKeyStats && savedKeyStats[letter]) {
        this.keyStats[letter] = savedKeyStats[letter];
      } else {
        this.keyStats[letter] = {
          key: letter,
          samples: 0,
          avgMs: 0,
          emaMs: 300,
          errors: 0,
          confidence: INITIAL_UNLOCKED_LETTERS.includes(letter) ? 0.5 : 0.0,
          unlocked: INITIAL_UNLOCKED_LETTERS.includes(letter)
        };
      }
    }
    if (savedProblemWords) {
      this.problemWords = savedProblemWords;
    }
  }

  public getUnlockedLetters(): string[] {
    return Object.values(this.keyStats)
      .filter((k) => k.unlocked)
      .map((k) => k.key);
  }

  public getNextLetterToUnlock(): string | null {
    const locked = Object.values(this.keyStats).filter((k) => !k.unlocked);
    if (locked.length === 0) return null;
    return locked[0].key;
  }

  public recordKeyStroke(key: string, latencyMs: number, isError: boolean) {
    const lowerKey = key.toLowerCase();
    if (!this.keyStats[lowerKey]) return;

    const stat = this.keyStats[lowerKey];
    stat.samples++;
    stat.errors += isError ? 1 : 0;

    // EMA latency update
    const alpha = 0.2;
    stat.emaMs = stat.emaMs ? stat.emaMs * (1 - alpha) + latencyMs * alpha : latencyMs;
    stat.avgMs = (stat.avgMs * (stat.samples - 1) + latencyMs) / stat.samples;

    // Confidence calculation (0 to 1) based on low error rate and good speed (< 250ms per key is ~40wpm)
    const errorRate = stat.errors / stat.samples;
    const speedScore = Math.max(0, Math.min(1, (400 - stat.emaMs) / 300));
    const accuracyScore = Math.max(0, 1 - errorRate * 2);
    stat.confidence = Math.min(1, Math.max(0, speedScore * 0.5 + accuracyScore * 0.5));

    // Check unlock condition for next locked letter
    this.checkUnlocks();
  }

  private checkUnlocks() {
    const unlocked = Object.values(this.keyStats).filter((k) => k.unlocked);
    // If all currently unlocked letters have confidence > 0.75 and samples > 30, unlock next
    const readyToUnlockMore = unlocked.every((k) => k.confidence >= 0.75 && k.samples >= 25);
    if (readyToUnlockMore) {
      const nextLocked = Object.values(this.keyStats).find((k) => !k.unlocked);
      if (nextLocked) {
        nextLocked.unlocked = true;
        nextLocked.confidence = 0.3; // initial confidence
      }
    }
  }

  public recordWord(word: string, errors: number, avgMs: number) {
    const clean = word.toLowerCase().trim();
    if (!clean) return;
    if (!this.problemWords[clean]) {
      this.problemWords[clean] = { seen: 0, errors: 0, avgMs: 200 };
    }
    const pw = this.problemWords[clean];
    pw.seen++;
    pw.errors += errors;
    pw.avgMs = (pw.avgMs * (pw.seen - 1) + avgMs) / pw.seen;
  }

  public generateAdaptiveText(wordCount: number = 25): string {
    const unlockedLetters = this.getUnlockedLetters();
    // Find weakest unlocked letter to bias generation
    const sortedUnlocked = [...Object.values(this.keyStats)]
      .filter((k) => k.unlocked)
      .sort((a, b) => a.confidence - b.confidence);
    const focusLetter = sortedUnlocked.length > 0 ? sortedUnlocked[0].key : 'e';

    // Filter Spanish words that can be formed mostly with unlocked letters, biasing towards focus letter
    const validWords = SPANISH_WORDS.filter((w) => {
      const chars = w.split('');
      return chars.every((c) => unlockedLetters.includes(c));
    });

    const pool = validWords.length >= 10 ? validWords : SPANISH_WORDS;
    const resultWords: string[] = [];

    // Include some problem words if available
    const problemWordKeys = Object.entries(this.problemWords)
      .sort((a, b) => b[1].errors - a[1].errors)
      .slice(0, 5)
      .map(([w]) => w);

    for (let i = 0; i < wordCount; i++) {
      if (i % 4 === 0 && problemWordKeys.length > 0) {
        const pw = problemWordKeys[Math.floor(Math.random() * problemWordKeys.length)];
        resultWords.push(pw);
      } else if (i % 2 === 0) {
        // Bias towards word containing focus letter
        const matching = pool.filter((w) => w.includes(focusLetter));
        const chosen = matching.length > 0 ? matching[Math.floor(Math.random() * matching.length)] : pool[Math.floor(Math.random() * pool.length)];
        resultWords.push(chosen);
      } else {
        const chosen = pool[Math.floor(Math.random() * pool.length)];
        resultWords.push(chosen);
      }
    }

    return resultWords.join(' ');
  }

  public getKeyStats() {
    return this.keyStats;
  }

  exportState() {
    return {
      keyStats: this.keyStats,
      problemWords: this.problemWords
    };
  }
}
