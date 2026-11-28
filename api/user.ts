import { fetchUser, saveUser, toPublicUser } from './_db.js';
import { rateLimit } from './_authHelpers.js';
import { prepareApi, parseBody, requireValidSession, serverError } from './_http.js';
import { sanitizeProfile } from './_validate.js';

export default async function handler(req: any, res: any) {
  if (!prepareApi(req, res, ['GET', 'POST'])) return;

  try {
    const auth = await requireValidSession(req);
    if (!auth) return res.status(401).json({ error: 'No autenticado' });

    // Estas escrituras no hacen crecer la base de datos (se sobrescriben filas acotadas):
    // basta un tope por usuario en memoria contra bucles descontrolados.
    if (req.method !== 'GET') {
      const rl = rateLimit(`user-w:${auth.sub}`, 60, 15 * 60 * 1000);
      if (!rl.ok) {
        res.setHeader('Retry-After', String(rl.retryAfterSec || 60));
        return res.status(429).json({ error: 'Demasiadas peticiones. Espera un momento.' });
      }
    }

    if (req.method === 'POST') {
      // Solo campos válidos y presentes; id/email/contraseña nunca se aceptan del cliente
      await saveUser(auth.sub, sanitizeProfile(await parseBody(req)));
    }

    const user = await fetchUser(auth.sub);
    if (!user) return res.status(401).json({ error: 'No autenticado' });
    const pub = toPublicUser(user);
    return res.status(200).json(req.method === 'POST' ? { success: true, user: pub } : pub);
  } catch (error: any) {
    return serverError(res, 'user', error);
  }
}
