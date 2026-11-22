// PUT    /api/admin/rooms/:id { name?, x?, y?, s?, auto? } → change a room photo's name or placement.
// DELETE /api/admin/rooms/:id → removes it (paintings that used it go back to automatic rooms).
import { json, error, readJson, cleanText } from '../../../../lib/util.js';
import { loadRooms, validPlacement } from '../../../../lib/rooms.js';

export async function onRequestPut({ request, env, params }) {
  const id = Number(params.id);
  const cur = await env.DB.prepare('SELECT * FROM rooms WHERE id = ?').bind(id).first();
  if (!cur) return error(404, 'That room photo no longer exists.');
  const b = (await readJson(request)) || {};
  const next = { x: 'x' in b ? b.x : cur.x, y: 'y' in b ? b.y : cur.y, s: 's' in b ? b.s : cur.s };
  const bad = validPlacement(next);
  if (bad) return error(400, bad);
  const name = 'name' in b ? (cleanText(b.name, 60).trim() || cur.name) : cur.name;
  const auto = 'auto' in b ? (b.auto ? 1 : 0) : cur.auto;
  await env.DB.prepare('UPDATE rooms SET name = ?, x = ?, y = ?, s = ?, auto = ? WHERE id = ?')
    .bind(name, Number(next.x), Number(next.y), Number(next.s), auto, id).run();
  return json({ room: (await loadRooms(env.DB)).find(r => r.id === 'c' + id) });
}

export async function onRequestDelete({ env, params }) {
  const id = Number(params.id);
  const cur = await env.DB.prepare('SELECT * FROM rooms WHERE id = ?').bind(id).first();
  if (!cur) return json({ ok: true });
  await Promise.all([cur.key_lg, cur.key_th].filter(Boolean).map(k => env.IMAGES.delete(k)));
  await env.DB.batch([
    env.DB.prepare('DELETE FROM rooms WHERE id = ?').bind(id),
    env.DB.prepare('UPDATE paintings SET room = NULL WHERE room = ?').bind('c' + id)
  ]);
  return json({ ok: true });
}
