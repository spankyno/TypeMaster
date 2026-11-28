/** Fusión del progreso (estadísticas por tecla + logros) entre este dispositivo y la nube. Funciones puras. */
import type { KeyRecord } from './adaptive/adaptiveEngine';

export interface Progress {
  keyStats: Record<string, KeyRecord>;
  achievements: string[];
}

const num = (v: unknown, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

/** Fuerza tipos numéricos (Neon devuelve NUMERIC como string) y descarta claves no válidas. */
export function normalizeKeyStats(raw: any): Record<string, KeyRecord> {
  const out: Record<string, KeyRecord> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries<any>(raw)) {
    const key = String(v?.key ?? k).toLowerCase();
    if (!/^[a-zñ]$/.test(key) || !v) continue;
    out[key] = {
      key,
      samples: Math.max(0, Math.round(num(v.samples))),
      avgMs: num(v.avgMs),
      emaMs: num(v.emaMs, 300),
      errors: Math.max(0, Math.round(num(v.errors))),
      confidence: Math.min(1, Math.max(0, num(v.confidence))),
      unlocked: v.unlocked === true,
    };
  }
  return out;
}

/** Por tecla gana el registro con más muestras; "desbloqueada" es una unión (nunca se vuelve a bloquear). */
export function mergeKeyStats(
  local: Record<string, KeyRecord>,
  cloud: Record<string, KeyRecord>
): Record<string, KeyRecord> {
  const merged: Record<string, KeyRecord> = {};
  for (const key of new Set([...Object.keys(local), ...Object.keys(cloud)])) {
    const a = local[key];
    const b = cloud[key];
    if (!a || !b) {
      merged[key] = { ...(a ?? b) };
      continue;
    }
    const richer = b.samples > a.samples ? b : a;
    merged[key] = { ...richer, unlocked: a.unlocked || b.unlocked };
  }
  return merged;
}

/** ¿Tiene este dispositivo algo que la nube no tiene? (el estado "virgen" no cuenta) */
export function progressNeedsUpload(local: Progress, cloud: Progress): boolean {
  const cloudAch = new Set(cloud.achievements);
  if (local.achievements.some((id) => !cloudAch.has(id))) return true;
  return Object.values(local.keyStats).some((l) => {
    const c = cloud.keyStats[l.key];
    return l.samples > (c?.samples ?? 0) || (l.samples > 0 && l.unlocked && !c?.unlocked);
  });
}

export function mergeProgress(local: Progress, cloud: Progress) {
  return {
    merged: {
      keyStats: mergeKeyStats(local.keyStats, cloud.keyStats),
      achievements: [...new Set([...local.achievements, ...cloud.achievements])],
    } as Progress,
    needsUpload: progressNeedsUpload(local, cloud),
  };
}

/** Lo que se envía a la nube: solo teclas con datos reales. */
export function uploadablePayload(p: Progress) {
  return {
    keyStats: Object.fromEntries(Object.entries(p.keyStats).filter(([, r]) => r.samples > 0)),
    achievements: p.achievements,
  };
}
