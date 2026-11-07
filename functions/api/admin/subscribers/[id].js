// DELETE /api/admin/subscribers/:id
import { json } from '../../../../lib/util.js';

export async function onRequestDelete({ env, params }) {
  await env.DB.prepare('DELETE FROM subscribers WHERE id = ?').bind(Number(params.id)).run();
  return json({ ok: true });
}
