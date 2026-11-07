// GET /api/admin/settings, PUT /api/admin/settings { commission_tiers?, popup_enabled?, popup_heading?, popup_text? }
import { json, error, readJson, setSetting, cleanText } from '../../../lib/util.js';

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare("SELECT key, value FROM settings WHERE key != 'password_hash'").all();
  const out = {};
  for (const r of results) out[r.key] = r.key === 'commission_tiers' ? JSON.parse(r.value) : r.value;
  out.popup_enabled = out.popup_enabled !== '0';
  return json(out);
}

export async function onRequestPut({ request, env }) {
  const b = await readJson(request);
  if (!b) return error(400, 'Nothing was sent.');
  if ('commission_tiers' in b) {
    const tiers = Array.isArray(b.commission_tiers) ? b.commission_tiers : [];
    const ids = ['small', 'medium', 'large'];
    const clean = ids.map((id, i) => {
      const t = tiers.find(x => x && x.id === id) || {};
      const price = Math.round(Number(String(t.price ?? '').replace(/[\sR,]/gi, '')));
      const longEdge = Math.round(Number(t.longEdge));
      return { id, label: id[0].toUpperCase() + id.slice(1), longEdge, price };
    });
    if (clean.some(t => !(t.price > 0) || !(t.longEdge > 0 && t.longEdge <= 500))) {
      return error(400, 'Each commission size needs a size in cm and a price in rand.');
    }
    await setSetting(env.DB, 'commission_tiers', JSON.stringify(clean));
  }
  if ('popup_enabled' in b) await setSetting(env.DB, 'popup_enabled', b.popup_enabled ? '1' : '0');
  if ('popup_heading' in b) {
    const h = cleanText(b.popup_heading, 80).trim();
    if (!h) return error(400, 'The sign-up box needs a heading.');
    await setSetting(env.DB, 'popup_heading', h);
  }
  if ('popup_text' in b) await setSetting(env.DB, 'popup_text', cleanText(b.popup_text, 300).trim());
  return onRequestGet({ env });
}
