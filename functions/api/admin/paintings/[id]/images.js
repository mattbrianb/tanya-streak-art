// POST /api/admin/paintings/:id/images  multipart: lg (file), md (file), width, height
//      The portal resizes photos in the browser first, so uploads stay small.
// PUT  /api/admin/paintings/:id/images  { order: [imageId, ...] }  first = cover photo
import { json, error, readJson } from '../../../../../lib/util.js';

const MAX_BYTES = 6 * 1024 * 1024;
const TYPES = { 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/png': 'png' };

export async function onRequestPost({ request, env, params }) {
  const id = Number(params.id);
  const painting = await env.DB.prepare('SELECT id FROM paintings WHERE id = ?').bind(id).first();
  if (!painting) return error(404, 'That painting no longer exists.');
  const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM images WHERE painting_id = ?').bind(id).first();
  if (count.n >= 12) return error(400, 'A painting can have up to 12 photos. Remove one first.');

  let form;
  try { form = await request.formData(); } catch { return error(400, 'The photo did not arrive. Please try again.'); }
  const lg = form.get('lg'), md = form.get('md');
  if (!(lg instanceof File) || !(md instanceof File)) return error(400, 'The photo did not arrive. Please try again.');
  for (const f of [lg, md]) {
    if (!TYPES[f.type]) return error(400, 'Please choose a photo (JPG, PNG or WebP).');
    if (f.size > MAX_BYTES) return error(400, 'That photo is too large. Please try a smaller one.');
  }

  const stamp = Date.now().toString(36) + crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
  const keyLg = `p${id}/${stamp}-lg.${TYPES[lg.type]}`;
  const keyMd = `p${id}/${stamp}-md.${TYPES[md.type]}`;
  await Promise.all([
    env.IMAGES.put(keyLg, await lg.arrayBuffer(), { metadata: { type: lg.type } }),
    env.IMAGES.put(keyMd, await md.arrayBuffer(), { metadata: { type: md.type } })
  ]);
  const w = parseInt(form.get('width'), 10) || null, h = parseInt(form.get('height'), 10) || null;
  const res = await env.DB.prepare(
    'INSERT INTO images (painting_id, key_lg, key_md, width, height, position) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, keyLg, keyMd, w, h, count.n).run();
  await env.DB.prepare("UPDATE paintings SET updated_at = datetime('now') WHERE id = ?").bind(id).run();
  return json({ image: { id: res.meta.last_row_id, lg: `/img/${keyLg}`, md: `/img/${keyMd}`, width: w, height: h } }, { status: 201 });
}

export async function onRequestPut({ request, env, params }) {
  const id = Number(params.id);
  const body = await readJson(request);
  const order = Array.isArray(body?.order) ? body.order.map(Number) : null;
  if (!order) return error(400, 'Nothing to reorder.');
  const { results } = await env.DB.prepare('SELECT id FROM images WHERE painting_id = ?').bind(id).all();
  const have = results.map(r => r.id).sort((a, b) => a - b).join();
  if ([...order].sort((a, b) => a - b).join() !== have) return error(400, 'The photo list is out of date. Please refresh and try again.');
  await env.DB.batch(order.map((imgId, i) =>
    env.DB.prepare('UPDATE images SET position = ? WHERE id = ? AND painting_id = ?').bind(i, imgId, id)));
  return json({ ok: true });
}
