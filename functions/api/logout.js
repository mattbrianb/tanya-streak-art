// POST /api/logout
import { json } from '../../lib/util.js';
import { clearCookie } from '../../lib/auth.js';

export async function onRequestPost() {
  return json({ ok: true }, { headers: { 'set-cookie': clearCookie() } });
}
