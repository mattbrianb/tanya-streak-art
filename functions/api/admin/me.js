// GET /api/admin/me → 200 when signed in (the middleware returns 401 otherwise), plus dashboard counts.
import { json } from '../../../lib/util.js';

export async function onRequestGet({ env }) {
  const counts = await env.DB.prepare(`SELECT
    (SELECT COUNT(*) FROM paintings WHERE kind = 'painting' AND status = 'available') AS available,
    (SELECT COUNT(*) FROM paintings WHERE kind = 'painting' AND status = 'sold')      AS sold,
    (SELECT COUNT(*) FROM paintings WHERE kind = 'painting' AND status = 'hidden')    AS hidden,
    (SELECT COUNT(*) FROM paintings WHERE kind = 'commission' AND status != 'hidden') AS commissions,
    (SELECT COUNT(*) FROM paintings WHERE kind = 'commission' AND status = 'hidden')  AS commissions_hidden,
    (SELECT COUNT(*) FROM subscribers)                          AS subscribers,
    (SELECT COUNT(*) FROM subscribers WHERE created_at >= datetime('now', '-7 days')) AS new_subscribers`).first();
  return json({ ok: true, counts });
}
