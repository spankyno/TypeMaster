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
const ALL_LETTERS = [
  'e', 's', 'a', 'r', 'n', 'i', 't', 'o', 'l', 'c', 'd', 'u', 'm', 'p',
  'b', 'g', 'v', 'y', 'q', 'h', 'f', 'z', 'j', 'ñ', 'x', 'k', 'w',
];

/** Map accented / uppercase characters to the base letter tracked by the engine. */
function normalizeLetter(ch: string): string {
  const lower = ch.toLowerCase();
  const map: Record<string, string> = {
    á: 'a',
    é: 'e',
    í: 'i',
    ó: 'o',
    ú: 'u',
    ü: 'u',
    à: 'a',
    è: 'e',
    ì: 'i',
    ò: 'o',
    ù: 'u',
  };
  return map[lower] || lower;
}

/** True if every letter in the word is among the unlocked set (accents → base). */
function wordFitsUnlocked(word: string, unlocked: Set<string>): boolean {
  for (const ch of word) {
    if (ch === ' ' || ch === '-' || ch === "'") continue;
    const base = normalizeLetter(ch);
    if (!/^[a-zñ]$/.test(base)) continue; // ignore digits / punctuation in filter
    if (!unlocked.has(base)) return false;
  }
  return true;
}

export class AdaptiveEngine {
  private keyStats: Record<string, KeyRecord> = {};
  private problemWords: Record<string, { seen: number; errors: number; avgMs: number }> = {};

  constructor(
    savedKeyStats?: Record<string, KeyRecord>,
    savedProblemWords?: Record<string, { seen: number; errors: number; avgMs: number }>
  ) {
    for (const letter of ALL_LETTERS) {
      if (savedKeyStats && savedKeyStats[letter]) {
        this.keyStats[letter] = { ...savedKeyStats[letter] };
      } else {
        this.keyStats[letter] = {
          key: letter,
          samples: 0,
          avgMs: 0,
          emaMs: 300,
          errors: 0,
          confidence: INITIAL_UNLOCKED_LETTERS.includes(letter) ? 0.5 : 0.0,
          unlocked: INITIAL_UNLOCKED_LETTERS.includes(letter),
        };
      }
    }
    if (savedProblemWords) {
      this.problemWords = { ...savedProblemWords };
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
    // Preserve curriculum order from ALL_LETTERS
    for (const letter of ALL_LETTERS) {
      if (!this.keyStats[letter].unlocked) return letter;
    }
    return locked[0].key;
  }

  public recordKeyStroke(key: string, latencyMs: number, isError: boolean) {
    const lowerKey = normalizeLetter(key);
    if (!this.keyStats[lowerKey]) return;

    const stat = this.keyStats[lowerKey];
    stat.samples++;
    stat.errors += isError ? 1 : 0;

    const alpha = 0.2;
    const clampedLatency = Math.min(1500, Math.max(20, latencyMs));
    stat.emaMs = stat.emaMs
      ? stat.emaMs * (1 - alpha) + clampedLatency * alpha
      : clampedLatency;
    stat.avgMs = (stat.avgMs * (stat.samples - 1) + clampedLatency) / stat.samples;

    const errorRate = stat.errors / stat.samples;
    const speedScore = Math.max(0, Math.min(1, (400 - stat.emaMs) / 300));
    const accuracyScore = Math.max(0, 1 - errorRate * 2);
    stat.confidence = Math.min(1, Math.max(0, speedScore * 0.5 + accuracyScore * 0.5));

    this.checkUnlocks();
  }

  private checkUnlocks() {
    const unlocked = Object.values(this.keyStats).filter((k) => k.unlocked);
    const readyToUnlockMore = unlocked.every(
      (k) => k.confidence >= 0.75 && k.samples >= 25
    );
    if (!readyToUnlockMore) return;

    const next = this.getNextLetterToUnlock();
    if (next && this.keyStats[next]) {
      this.keyStats[next].unlocked = true;
      this.keyStats[next].confidence = 0.3;
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

  /**
   * Build short pseudo-words from unlocked letters when the real dictionary
   * does not yet yield enough candidates (early adaptive stages).
   */
  private synthesizeWords(
    unlocked: string[],
    count: number,
    focusLetter: string
  ): string[] {
    const vowels = unlocked.filter((c) => 'aeiou'.includes(c));
    const consonants = unlocked.filter((c) => !'aeiou'.includes(c));
    const vPool = vowels.length > 0 ? vowels : ['e', 'a'];
    const cPool = consonants.length > 0 ? consonants : unlocked;

    const words: string[] = [];
    for (let i = 0; i < count; i++) {
      const len = 3 + Math.floor(Math.random() * 3); // 3–5 letters
      let w = '';
      for (let j = 0; j < len; j++) {
        if (j % 2 === 0) {
          // Prefer focus letter on some consonant slots
          if (
            focusLetter &&
            cPool.includes(focusLetter) &&
            Math.random() < 0.35
          ) {
            w += focusLetter;
          } else {
            w += cPool[Math.floor(Math.random() * cPool.length)];
          }
        } else {
          w += vPool[Math.floor(Math.random() * vPool.length)];
        }
      }
      // Ensure focus letter appears at least sometimes
      if (i % 3 === 0 && focusLetter && !w.includes(focusLetter) && unlocked.includes(focusLetter)) {
        const pos = Math.floor(Math.random() * w.length);
        w = w.slice(0, pos) + focusLetter + w.slice(pos + 1);
      }
      words.push(w);
    }
    return words;
  }

  public generateAdaptiveText(wordCount: number = 25): string {
    const unlockedList = this.getUnlockedLetters();
    const unlockedSet = new Set(unlockedList);

    const sortedUnlocked = [...Object.values(this.keyStats)]
      .filter((k) => k.unlocked)
      .sort((a, b) => a.confidence - b.confidence);
    const focusLetter = sortedUnlocked.length > 0 ? sortedUnlocked[0].key : 'e';

    // Prefer real Spanish words that only use unlocked letters
    const validWords = SPANISH_WORDS.filter((w) =>
      wordFitsUnlocked(w, unlockedSet)
    );

    // Soft filter: words that are mostly unlocked (≥80% of letters)
    const mostlyValid =
      validWords.length >= 8
        ? validWords
        : SPANISH_WORDS.filter((w) => {
            const letters = w.split('').filter((c) => /[a-zñáéíóúü]/i.test(c));
            if (letters.length === 0) return false;
            const ok = letters.filter((c) =>
              unlockedSet.has(normalizeLetter(c))
            ).length;
            return ok / letters.length >= 0.8;
          });

    const useSynthetic = mostlyValid.length < 8;
    const dictPool = mostlyValid.length >= 8 ? mostlyValid : validWords;
    const syntheticPool = useSynthetic
      ? this.synthesizeWords(unlockedList, Math.max(wordCount * 2, 20), focusLetter)
      : [];

    const pool =
      dictPool.length >= 8
        ? dictPool
        : [...dictPool, ...syntheticPool];

    const resultWords: string[] = [];

    const problemWordKeys = Object.entries(this.problemWords)
      .filter(([w]) => wordFitsUnlocked(w, unlockedSet))
      .sort((a, b) => b[1].errors - a[1].errors)
      .slice(0, 5)
      .map(([w]) => w);

    for (let i = 0; i < wordCount; i++) {
      if (i % 5 === 0 && problemWordKeys.length > 0) {
        resultWords.push(
          problemWordKeys[Math.floor(Math.random() * problemWordKeys.length)]
        );
        continue;
      }

      if (i % 2 === 0) {
        const matching = pool.filter((w) => w.includes(focusLetter));
        const source = matching.length > 0 ? matching : pool;
        resultWords.push(source[Math.floor(Math.random() * source.length)]);
      } else {
        resultWords.push(pool[Math.floor(Math.random() * pool.length)]);
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
      problemWords: this.problemWords,
    };
  }

  /** Reset adaptive progress (keys locked again except starters). */
  public resetProgress() {
    for (const letter of ALL_LETTERS) {
      this.keyStats[letter] = {
        key: letter,
        samples: 0,
        avgMs: 0,
        emaMs: 300,
        errors: 0,
        confidence: INITIAL_UNLOCKED_LETTERS.includes(letter) ? 0.5 : 0.0,
        unlocked: INITIAL_UNLOCKED_LETTERS.includes(letter),
      };
    }
    this.problemWords = {};
  }
}
