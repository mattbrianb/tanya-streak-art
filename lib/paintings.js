// Validation and deletion shared by the admin painting routes.
import { cleanText } from './util.js';

const STATUSES = ['available', 'sold', 'hidden'];
const KINDS = ['painting', 'commission'];

function num(v, { min, max, int = false }) {
  if (v === '' || v === null || v === undefined) return null;
  let t = String(v).replace(/[\sR]/gi, '');
  t = /^\d+,\d{1,2}$/.test(t) ? t.replace(',', '.') : t.replace(/,/g, '');  // 40,5 is a decimal; 2,500 is thousands
  const n = Number(t);
  if (!Number.isFinite(n) || n < min || n > max) return NaN;
  return int ? Math.round(n) : Math.round(n * 10) / 10;
}

// Returns { values } or { error }. `partial` allows updating only some fields.
export function validatePainting(body, partial = false) {
  if (!body || typeof body !== 'object') return { error: 'Nothing was sent.' };
  const v = {};
  if (!partial || 'title' in body) {
    v.title = cleanText(body.title, 120).trim();
    if (!v.title) return { error: 'Give the painting a name.' };
  }
  if (!partial || 'medium' in body) v.medium = cleanText(body.medium, 120).trim() || 'Oil on canvas';
  if (!partial || 'description' in body) v.description = cleanText(body.description, 2000).trim();
  for (const k of ['width_cm', 'height_cm']) {
    if (!partial || k in body) {
      v[k] = num(body[k], { min: 1, max: 1000 });
      if (Number.isNaN(v[k])) return { error: 'Sizes should be numbers in centimetres, for example 40.' };
    }
  }
  if (!partial || 'price' in body) {
    v.price = num(body.price, { min: 0, max: 10000000, int: true });
    if (Number.isNaN(v.price)) return { error: 'The price should be a number in rand, for example 2500.' };
  }
  if (!partial || 'status' in body) {
    v.status = STATUSES.includes(body.status) ? body.status : 'available';
  }
  if (!partial || 'kind' in body) v.kind = KINDS.includes(body.kind) ? body.kind : 'painting';
  // a finished commission has no price and is either shown or hidden
  if (v.kind === 'commission') {
    if ('price' in v) v.price = null;
    if (v.status === 'sold') v.status = 'available';
  }
  // Christmas collection: in or out, and whether it shows now or waits for the next drop.
  if (!partial || 'christmas' in body) v.christmas = body.christmas ? 1 : 0;
  if (!partial || 'reveal' in body) v.reveal = body.reveal === 'drop' ? 'drop' : 'now';
  if (v.kind === 'commission') { v.christmas = 0; v.reveal = 'now'; }
  if ('sort' in body) {
    v.sort = num(body.sort, { min: -100000, max: 100000, int: true });
    if (Number.isNaN(v.sort) || v.sort === null) v.sort = 0;
  }
  return { values: v };
}

export async function deleteImages(env, rows) {
  await Promise.all(rows.flatMap(r => [env.IMAGES.delete(r.key_lg), env.IMAGES.delete(r.key_md)]));
}

// Turns the editor's reveal choice into the reveal_at column. 'drop' uses the next drop time from
// Settings, if one is set and still ahead; otherwise the painting shows straight away.
export async function resolveReveal(env, v) {
  if (!('reveal' in v) && !('christmas' in v)) return;
  let at = null;
  if (v.christmas !== 0 && v.reveal === 'drop') {
    const row = await env.DB.prepare("SELECT value FROM settings WHERE key = 'christmas_drop_at'").first();
    const drop = row && row.value;
    if (drop && drop > new Date().toISOString().slice(0, 19) + 'Z') at = drop;
  }
  if ('reveal' in v || v.christmas === 0) v.reveal_at = at;
  delete v.reveal;
}
