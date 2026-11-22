// Shared helpers for Pages Functions.

export function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('content-type', 'application/json; charset=utf-8');
  if (!headers.has('cache-control')) headers.set('cache-control', 'no-store');
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function error(status, message) {
  return json({ error: message }, { status });
}

export async function readJson(request) {
  try { return await request.json(); } catch { return null; }
}

export function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'painting';
}

export async function uniqueSlug(db, title, exceptId = null) {
  const base = slugify(title);
  let slug = base, n = 2;
  for (;;) {
    const row = await db.prepare('SELECT id FROM paintings WHERE slug = ?').bind(slug).first();
    if (!row || row.id === exceptId) return slug;
    slug = `${base}-${n++}`;
  }
}

export async function getSetting(db, key, fallback = null) {
  const row = await db.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first();
  return row ? row.value : fallback;
}

export async function setSetting(db, key, value) {
  await db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .bind(key, String(value)).run();
}

export function imageUrl(key) {
  return key ? `/img/${key}` : null;
}

// Current UTC time in the same text form as reveal_at, for comparisons inside SQL.
export const NOW_SQL = "strftime('%Y-%m-%dT%H:%M:%SZ','now')";

// Today's date in Durban (SAST, UTC+2), as YYYY-MM-DD.
export function todaySAST() {
  return new Date(Date.now() + 2 * 3600e3).toISOString().slice(0, 10);
}

// The Christmas collection as the public site sees it: on/off, its wording, and how many
// paintings are still wrapped (waiting for the next drop) and when they open.
export async function christmasInfo(db) {
  const { results } = await db.prepare("SELECT key, value FROM settings WHERE key LIKE 'christmas_%'").all();
  const s = {}; for (const r of results) s[r.key] = r.value;
  const until = s.christmas_until || '';
  const on = s.christmas_enabled === '1' && (!until || todaySAST() <= until);
  if (!on) return { on: false };
  const w = await db.prepare(
    `SELECT COUNT(*) AS n, MIN(reveal_at) AS next FROM paintings
     WHERE christmas = 1 AND kind = 'painting' AND status != 'hidden' AND reveal_at > ${NOW_SQL}`).first();
  return {
    on: true, title: s.christmas_title || 'The Mantelpiece Miniatures', text: s.christmas_text || '',
    wrapped: w ? w.n : 0, opens: w && w.n ? w.next : null
  };
}

// Paintings with their images, shaped for the browser.
// kind: 'painting' (default), 'commission', or null for both (the portal).
export async function loadPaintings(db, { includeHidden = false, slug = null, kind = 'painting' } = {}) {
  let sql = 'SELECT * FROM paintings';
  const where = [], args = [];
  if (!includeHidden) where.push("status != 'hidden'", `(reveal_at IS NULL OR reveal_at <= ${NOW_SQL})`);
  if (kind) { where.push('kind = ?'); args.push(kind); }
  if (slug) { where.push('slug = ?'); args.push(slug); }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += " ORDER BY CASE status WHEN 'available' THEN 0 WHEN 'sold' THEN 1 ELSE 2 END, sort ASC, id DESC";
  const { results: rows } = await db.prepare(sql).bind(...args).all();
  if (!rows.length) return [];
  const ids = rows.map(r => r.id);
  const { results: imgs } = await db
    .prepare(`SELECT * FROM images WHERE painting_id IN (${ids.map(() => '?').join(',')}) ORDER BY position ASC, id ASC`)
    .bind(...ids).all();
  const byPainting = {};
  for (const im of imgs) (byPainting[im.painting_id] ||= []).push({
    id: im.id, lg: imageUrl(im.key_lg), md: imageUrl(im.key_md), width: im.width, height: im.height
  });
  return rows.map(r => ({
    id: r.id, slug: r.slug, title: r.title, medium: r.medium, description: r.description,
    width_cm: r.width_cm, height_cm: r.height_cm, price: r.price, status: r.status, sort: r.sort,
    created_at: r.created_at, sold_at: r.sold_at, kind: r.kind || 'painting',
    christmas: !!r.christmas, reveal_at: r.reveal_at || null,
    room: r.room || null, wall: r.wall || null, frame: r.frame || null,
    images: byPainting[r.id] || []
  }));
}

export function cleanText(v, max) {
  return String(v ?? '').replace(/\s+$/g, '').slice(0, max);
}

export function isEmail(s) {
  return typeof s === 'string' && s.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
}

export function clientIp(request) {
  return request.headers.get('cf-connecting-ip') || 'local';
}

// Simple fixed-window rate limit on KV. Returns true when the caller is over the limit.
export async function limited(kv, bucket, max, windowSec) {
  const key = `rl:${bucket}`;
  const n = parseInt(await kv.get(key) || '0', 10);
  if (n >= max) return true;
  await kv.put(key, String(n + 1), { expirationTtl: Math.max(60, windowSec) });
  return false;
}
