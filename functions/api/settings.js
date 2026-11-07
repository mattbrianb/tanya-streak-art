// GET /api/settings → public settings (popup wording, commission prices).
import { json } from '../../lib/util.js';

const PUBLIC = ['commission_tiers', 'popup_enabled', 'popup_heading', 'popup_text'];

export async function onRequestGet({ env }) {
  const { results } = await env.DB
    .prepare(`SELECT key, value FROM settings WHERE key IN (${PUBLIC.map(() => '?').join(',')})`)
    .bind(...PUBLIC).all();
  const out = {};
  for (const r of results) out[r.key] = r.key === 'commission_tiers' ? JSON.parse(r.value) : r.value;
  out.popup_enabled = out.popup_enabled !== '0';
  return json(out, { headers: { 'cache-control': 'public, max-age=0, s-maxage=30' } });
}
