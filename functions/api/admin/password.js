// POST /api/admin/password { current, next } → changes the signed-in person's own password
// (Tanya's or Matt's) and signs out their other devices.
import { json, error, readJson } from '../../../lib/util.js';
import { checkPassword, setPassword, sessionCookie, USERS } from '../../../lib/auth.js';

export async function onRequestPost({ request, env, data }) {
  const user = data.user || 'tanya';
  const b = await readJson(request);
  if (!(await checkPassword(env, b?.current, user))) return error(400, 'Your current password is not right.');
  const next = String(b?.next || '');
  if (next.length < 8) return error(400, 'Choose a new password of at least 8 characters.');
  // the password says who is signing in, so two people can't share one
  for (const other of Object.keys(USERS)) {
    if (other !== user && await checkPassword(env, next, other)) return error(400, 'Please choose a different password.');
  }
  await setPassword(env, next, user);
  // Re-issue this device's cookie against the new password version.
  return json({ ok: true }, { headers: { 'set-cookie': await sessionCookie(env, request, user) } });
}
