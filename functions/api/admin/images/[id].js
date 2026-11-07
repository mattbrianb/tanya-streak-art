// DELETE /api/admin/images/:id → removes one photo and closes the gap in the order.
import { json, error } from '../../../../lib/util.js';
import { deleteImages } from '../../../../lib/paintings.js';

export async function onRequestDelete({ env, params }) {
  const row = await env.DB.prepare('SELECT * FROM images WHERE id = ?').bind(Number(params.id)).first();
  if (!row) return error(404, 'That photo is already gone.');
  await deleteImages(env, [row]);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM images WHERE id = ?').bind(row.id),
    env.DB.prepare('UPDATE images SET position = position - 1 WHERE painting_id = ? AND position > ?').bind(row.painting_id, row.position)
  ]);
  return json({ ok: true });
}
