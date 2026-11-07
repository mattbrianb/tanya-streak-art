// POST /api/subscribe  { email, name?, source?, website? }  (website is a honeypot)
import { json, error, readJson, isEmail, cleanText, clientIp, limited } from '../../lib/util.js';

export async function onRequestPost({ request, env }) {
  const body = await readJson(request);
  if (!body) return error(400, 'Please enter your email address.');
  if (body.website) return json({ ok: true }); // bots fill hidden fields; pretend it worked
  const email = String(body.email || '').trim().toLowerCase();
  if (!isEmail(email)) return error(400, 'That email address does not look right. Please check it and try again.');
  if (await limited(env.IMAGES, `sub:${clientIp(request)}`, 10, 3600)) {
    return error(429, 'Too many tries from this connection. Please try again in an hour.');
  }
  await env.DB.prepare(
    'INSERT INTO subscribers (email, name, source) VALUES (?, ?, ?) ON CONFLICT(email) DO NOTHING'
  ).bind(email, cleanText(body.name, 80).trim() || null, cleanText(body.source, 40) || null).run();
  return json({ ok: true });
}
