// GET  /api/admin/rooms → Tanya's own room photos.
// POST /api/admin/rooms   multipart: lg (file), th (file), name, x, y, s, auto, width, height → adds one.
import { json, error, cleanText } from '../../../../lib/util.js';
import { loadRooms, validPlacement } from '../../../../lib/rooms.js';

const TYPES = { 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/png': 'png' };
const MAX_BYTES = 6 * 1024 * 1024;

export async function onRequestGet({ env }) {
  return json({ rooms: await loadRooms(env.DB) });
}

export async function onRequestPost({ request, env }) {
  const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM rooms').first();
  if (n.n >= 30) return error(400, 'You can have up to 30 room photos. Delete one first.');
  let form;
  try { form = await request.formData(); } catch { return error(400, 'The photo did not arrive. Please try again.'); }
  const lg = form.get('lg'), th = form.get('th');
  if (!(lg instanceof File) || !(th instanceof File)) return error(400, 'The photo did not arrive. Please try again.');
  for (const f of [lg, th]) {
    if (!TYPES[f.type]) return error(400, 'Please choose a photo (JPG, PNG or WebP).');
    if (f.size > MAX_BYTES) return error(400, 'That photo is too large. Please try a smaller one.');
  }
  const b = Object.fromEntries(['name', 'x', 'y', 's', 'auto', 'width', 'height'].map(k => [k, form.get(k)]));
  const bad = validPlacement(b);
  if (bad) return error(400, bad);
  const name = cleanText(b.name, 60).trim() || 'My room';
  const res = await env.DB.prepare(
    "INSERT INTO rooms (name, key_lg, key_th, width, height, x, y, s, auto) VALUES (?, '', '', ?, ?, ?, ?, ?, ?)"
  ).bind(name, parseInt(b.width, 10) || null, parseInt(b.height, 10) || null, Number(b.x), Number(b.y), Number(b.s), b.auto === '0' ? 0 : 1).run();
  const id = res.meta.last_row_id;
  const stamp = Date.now().toString(36);
  const keyLg = `r${id}/${stamp}-lg.${TYPES[lg.type]}`, keyTh = `r${id}/${stamp}-th.${TYPES[th.type]}`;
  await Promise.all([
    env.IMAGES.put(keyLg, await lg.arrayBuffer(), { metadata: { type: lg.type } }),
    env.IMAGES.put(keyTh, await th.arrayBuffer(), { metadata: { type: th.type } })
  ]);
  await env.DB.prepare('UPDATE rooms SET key_lg = ?, key_th = ? WHERE id = ?').bind(keyLg, keyTh, id).run();
  const room = (await loadRooms(env.DB)).find(r => r.id === 'c' + id);
  return json({ room }, { status: 201 });
}
