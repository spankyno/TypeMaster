import { fetchTests, insertTests, trimTests } from './_db.js';
import { prepareApi, parseBody, requireValidSession, serverError } from './_http.js';
import { sanitizeTest, type CleanTest } from './_validate.js';
import { rateLimitShared } from './_rateLimit.js';

const MAX_BATCH = 20;
/** Escrituras de tests por usuario y ventana (un test cada 15 s ≈ 60 / 15 min; margen para sincronizar historial). */
const WRITES_PER_WINDOW = 120;
const WINDOW = 15 * 60 * 1000;

export default async function handler(req: any, res: any) {
  if (!prepareApi(req, res, ['GET', 'POST'])) return;

  try {
    const auth = await requireValidSession(req);
    if (!auth) return res.status(401).json({ error: 'Debes iniciar sesión para sincronizar el historial' });

    if (req.method === 'GET') {
      return res.status(200).json(await fetchTests(auth.sub));
    }

    // Límite por usuario (compartido entre instancias): frena el relleno masivo de la base de datos
    const wl = await rateLimitShared(`tests-w:${auth.sub}`, WRITES_PER_WINDOW, WINDOW);
    if (!wl.ok) {
      res.setHeader('Retry-After', String(wl.retryAfterSec || 60));
      return res.status(429).json({ error: 'Demasiados tests enviados. Espera un momento.' });
    }

    // POST: un test (objeto) o varios (array / { tests: [...] }) — p. ej. historial de invitado al registrarse
    const body = await parseBody(req);
    const raw = Array.isArray(body) ? body : Array.isArray(body?.tests) ? body.tests : [body];
    if (raw.length > MAX_BATCH) {
      return res.status(413).json({ error: `Máximo ${MAX_BATCH} tests por petición` });
    }

    const clean = raw.map((t: unknown) => sanitizeTest(t)).filter((t: CleanTest | null): t is CleanTest => t !== null);
    if (clean.length === 0) {
      return res.status(400).json({ error: 'Datos de test inválidos' });
    }

    // La propiedad siempre es la del token: se ignora cualquier userId del cliente
    const saved = await insertTests(auth.sub, clean);
    // Tope de historial por usuario: se descartan los tests más antiguos
    if (saved > 0) await trimTests(auth.sub);
    return res.status(201).json({
      success: true,
      saved,
      rejected: raw.length - clean.length,
      test: clean.length === 1 ? { ...clean[0], userId: auth.sub } : undefined,
    });
  } catch (error: any) {
    return serverError(res, 'tests', error);
  }
}
