import { fetchProgress, saveProgress, resetKeyStats } from './_db.js';
import { prepareApi, parseBody, requireValidSession, serverError } from './_http.js';
import { sanitizeAchievementIds, sanitizeKeyStats } from './_validate.js';

/**
 * Progreso sincronizable entre dispositivos: estadísticas por tecla (modo adaptativo) y logros.
 *   GET    → estado en la nube
 *   POST   → fusiona { keyStats, achievements } (nunca retrocede) y devuelve el estado fusionado
 *   DELETE → reinicia el entrenamiento adaptativo (borra key_stats; los logros se conservan)
 */
export default async function handler(req: any, res: any) {
  if (!prepareApi(req, res, ['GET', 'POST', 'DELETE'])) return;

  try {
    const auth = await requireValidSession(req);
    if (!auth) return res.status(401).json({ error: 'No autenticado' });

    if (req.method === 'DELETE') {
      await resetKeyStats(auth.sub);
    } else if (req.method === 'POST') {
      const body = await parseBody(req);
      await saveProgress(auth.sub, sanitizeKeyStats(body?.keyStats), sanitizeAchievementIds(body?.achievements));
    }

    return res.status(200).json(await fetchProgress(auth.sub));
  } catch (error: any) {
    return serverError(res, 'progress', error);
  }
}
