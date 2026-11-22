// POST /api/login { password } → sets the session cookie.
import { json, error, readJson, clientIp } from '../../lib/util.js';
import { checkPassword, sessionCookie } from '../../lib/auth.js';

export async function onRequestPost({ request, env }) {
  if (!env.SESSION_SECRET) return error(500, 'The site is missing its SESSION_SECRET setting. Ask Matt to add it.');
  const bucket = `rl:login:${clientIp(request)}`;
  const fails = parseInt(await env.IMAGES.get(bucket) || '0', 10);
  if (fails >= 8) return error(429, 'Too many wrong tries. Please wait 15 minutes and try again.');
  const body = await readJson(request);
  const user = await checkPassword(env, body?.password);
  if (!user) {
    await env.IMAGES.put(bucket, String(fails + 1), { expirationTtl: 900 });
    return error(401, 'That password is not right. Please try again.');
  }
  if (fails) await env.IMAGES.delete(bucket);
  return json({ ok: true, user }, { headers: { 'set-cookie': await sessionCookie(env, request, user) } });
}
