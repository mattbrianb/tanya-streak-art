// POST /api/unsubscribe { email } → removes the address from the list.
import { json, error, readJson, isEmail, clientIp, limited } from '../../lib/util.js';

export async function onRequestPost({ request, env }) {
  const body = await readJson(request);
  const email = String(body?.email || '').trim().toLowerCase();
  if (!isEmail(email)) return error(400, 'Please enter the email address you signed up with.');
  if (await limited(env.IMAGES, `unsub:${clientIp(request)}`, 20, 3600)) {
    return error(429, 'Too many tries. Please try again in an hour.');
  }
  await env.DB.prepare('DELETE FROM subscribers WHERE email = ?').bind(email).run();
  // Same answer whether or not the address was on the list, so the list can't be probed.
  return json({ ok: true });
}
