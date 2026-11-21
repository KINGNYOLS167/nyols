// POST /api/subscribe  { email, lang, website }  ->  stores a newsletter sign-up.
import { HttpError, clientIp, fail, getDb, json, readJson } from './core';

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;

export default async function handler(req: Request): Promise<Response> {
  try {
    if (req.method !== 'POST') throw new HttpError(405, 'method_not_allowed');
    const body = await readJson<{ email?: string; lang?: string; website?: string }>(req, 4_000);
    if (body.website) return json({ ok: true }); // honeypot: quietly ignore bots
    const email = String(body.email ?? '').trim().toLowerCase();
    if (!EMAIL.test(email)) throw new HttpError(400, 'invalid_email');
    const db = await getDb();
    const ip = clientIp(req);
    const recent = await db.query(`SELECT count(*)::int AS n FROM login_attempts WHERE ip = $1 AND at > now() - interval '1 hour'`, [`sub:${ip}`]);
    if (Number(recent[0]?.n ?? 0) >= 10) throw new HttpError(429, 'too_many_requests');
    await db.query(`INSERT INTO login_attempts (ip) VALUES ($1)`, [`sub:${ip}`]);
    await db.query(`INSERT INTO subscribers (email, lang) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING`, [email, body.lang === 'en' ? 'en' : 'id']);
    return json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
