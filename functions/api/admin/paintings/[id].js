// GET    /api/admin/paintings/:id
// PUT    /api/admin/paintings/:id   (any subset of fields; e.g. { status: 'sold' })
// DELETE /api/admin/paintings/:id   (removes its photos too)
import { json, error, readJson, uniqueSlug, loadPaintings } from '../../../../lib/util.js';
import { validatePainting, deleteImages } from '../../../../lib/paintings.js';

async function byId(env, id) {
  const row = await env.DB.prepare('SELECT * FROM paintings WHERE id = ?').bind(id).first();
  if (!row) return null;
  const [p] = await loadPaintings(env.DB, { includeHidden: true, slug: row.slug, kind: null });
  return p;
}

export async function onRequestGet({ env, params }) {
  const p = await byId(env, Number(params.id));
  return p ? json({ painting: p }) : error(404, 'That painting no longer exists.');
}

export async function onRequestPut({ request, env, params }) {
  const id = Number(params.id);
  const current = await env.DB.prepare('SELECT * FROM paintings WHERE id = ?').bind(id).first();
  if (!current) return error(404, 'That painting no longer exists.');
  const { values: v, error: msg } = validatePainting({ kind: current.kind, ...(await readJson(request)) }, true);
  if (msg) return error(400, msg);
  if (v.kind === current.kind) delete v.kind;
  if (!Object.keys(v).length) return json({ painting: await byId(env, id) });

  if (v.title && v.title !== current.title) v.slug = await uniqueSlug(env.DB, v.title, id);
  const sets = Object.keys(v).map(k => `${k} = ?`);
  const args = Object.values(v);
  sets.push("updated_at = datetime('now')");
  if (v.status === 'sold' && current.status !== 'sold') sets.push("sold_at = datetime('now')");
  if (v.status && v.status !== 'sold') sets.push('sold_at = NULL');
  await env.DB.prepare(`UPDATE paintings SET ${sets.join(', ')} WHERE id = ?`).bind(...args, id).run();
  return json({ painting: await byId(env, id) });
}

export async function onRequestDelete({ env, params }) {
  const id = Number(params.id);
  const { results } = await env.DB.prepare('SELECT key_lg, key_md FROM images WHERE painting_id = ?').bind(id).all();
  await deleteImages(env, results);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM images WHERE painting_id = ?').bind(id),
    env.DB.prepare('DELETE FROM paintings WHERE id = ?').bind(id)
  ]);
  return json({ ok: true });
}
