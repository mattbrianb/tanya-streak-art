// GET  /api/admin/paintings → every painting and finished commission, hidden ones included.
// POST /api/admin/paintings → create one; returns it (add photos next).
import { json, error, readJson, uniqueSlug, loadPaintings } from '../../../../lib/util.js';
import { validatePainting, resolveReveal } from '../../../../lib/paintings.js';

export async function onRequestGet({ env }) {
  return json({ paintings: await loadPaintings(env.DB, { includeHidden: true, kind: null }) });
}

export async function onRequestPost({ request, env }) {
  const { values: v, error: msg } = validatePainting(await readJson(request));
  if (msg) return error(400, msg);
  await resolveReveal(env, v);
  const slug = await uniqueSlug(env.DB, v.title);
  // New work goes to the top of the list.
  const top = await env.DB.prepare('SELECT COALESCE(MIN(sort), 0) - 1 AS s FROM paintings').first();
  const res = await env.DB.prepare(
    `INSERT INTO paintings (slug, title, medium, description, width_cm, height_cm, price, status, sort, kind, christmas, reveal_at, sold_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 'sold' THEN datetime('now') END)`
  ).bind(slug, v.title, v.medium, v.description, v.width_cm, v.height_cm, v.price, v.status, top.s, v.kind, v.christmas, v.reveal_at, v.status).run();
  const [painting] = await loadPaintings(env.DB, { includeHidden: true, slug, kind: null });
  return json({ painting }, { status: 201, headers: { 'x-id': String(res.meta.last_row_id) } });
}
