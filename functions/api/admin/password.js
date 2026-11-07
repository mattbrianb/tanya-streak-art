// POST /api/admin/password { current, next } → changes the portal password, signs out other devices.
import { json, error, readJson } from '../../../lib/util.js';
import { checkPassword, setPassword, sessionCookie } from '../../../lib/auth.js';

export async function onRequestPost({ request, env }) {
  const b = await readJson(request);
  if (!(await checkPassword(env, b?.current))) return error(400, 'Your current password is not right.');
  const next = String(b?.next || '');
  if (next.length < 8) return error(400, 'Choose a new password of at least 8 characters.');
  await setPassword(env, next);
  // Re-issue this device's cookie against the new password version.
  return json({ ok: true }, { headers: { 'set-cookie': await sessionCookie(env, request) } });
}
