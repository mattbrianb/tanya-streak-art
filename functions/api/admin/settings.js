// GET /api/admin/settings, PUT /api/admin/settings { commission_tiers?, popup_enabled?, popup_heading?, popup_text?,
//   christmas_enabled?, christmas_title?, christmas_text?, christmas_until? (YYYY-MM-DD), christmas_drop? (Durban 'YYYY-MM-DDTHH:MM' or '') }
import { json, error, readJson, setSetting, cleanText, NOW_SQL } from '../../../lib/util.js';
import { TEXT_FIELDS, CONTACT_FIELDS, waNumber, isLink } from '../../../lib/sitetext.js';

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare("SELECT key, value FROM settings WHERE key != 'password_hash'").all();
  const out = {};
  for (const r of results) out[r.key] = r.key === 'commission_tiers' ? JSON.parse(r.value) : r.value;
  out.popup_enabled = out.popup_enabled !== '0';
  out.christmas_enabled = out.christmas_enabled === '1';
  // the drop time is stored in UTC; the portal shows and edits it in Durban time (SAST, UTC+2)
  out.christmas_drop = out.christmas_drop_at ? new Date(Date.parse(out.christmas_drop_at) + 2 * 3600e3).toISOString().slice(0, 16) : '';
  const c = await env.DB.prepare("SELECT COUNT(*) AS n FROM paintings WHERE christmas = 1 AND kind = 'painting' AND status != 'hidden'").first();
  out.christmas_count = c ? c.n : 0;
  // website words and contact details: what is on the site now (her version, or the built-in wording)
  out.site = {};
  for (const f of [...TEXT_FIELDS, ...CONTACT_FIELDS]) out.site[f.key] = (out[f.key] && String(out[f.key]).trim()) ? out[f.key] : f.def;
  out.site_fields = { text: TEXT_FIELDS, contact: CONTACT_FIELDS };
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

  // Website words and contact details. Saving the built-in wording again just clears her version.
  if (b.site && typeof b.site === 'object') {
    for (const f of TEXT_FIELDS) {
      if (!(f.key in b.site)) continue;
      const t = cleanText(b.site[f.key], f.max).replace(/\r/g, '').trim();
      await setSetting(env.DB, f.key, !t || t === f.def ? '' : t);
    }
    for (const f of CONTACT_FIELDS) {
      if (!(f.key in b.site)) continue;
      const t = cleanText(b.site[f.key], 200).trim();
      if (f.key === 'site_phone' && t && !waNumber(t)) return error(400, 'That WhatsApp number doesn’t look right. Type it like 079 276 3413.');
      if ((f.key === 'site_instagram' || f.key === 'site_facebook') && t && !isLink(t)) return error(400, `The ${f.label.toLowerCase()} should start with https://`);
      await setSetting(env.DB, f.key, !t || t === f.def ? '' : t);
    }
  }

  // Christmas collection
  if ('christmas_enabled' in b) await setSetting(env.DB, 'christmas_enabled', b.christmas_enabled ? '1' : '0');
  if ('christmas_title' in b) {
    const t = cleanText(b.christmas_title, 80).trim();
    if (!t) return error(400, 'The Christmas collection needs a name.');
    await setSetting(env.DB, 'christmas_title', t);
  }
  if ('christmas_text' in b) await setSetting(env.DB, 'christmas_text', cleanText(b.christmas_text, 300).trim());
  if ('christmas_until' in b) {
    const d = String(b.christmas_until || '');
    if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) return error(400, 'Choose the date to take the Christmas collection down.');
    await setSetting(env.DB, 'christmas_until', d);
  }
  if ('christmas_drop' in b) {
    const d = String(b.christmas_drop || '');
    let at = '';
    if (d) {
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(d)) return error(400, 'Choose a date and a time for the next drop.');
      at = new Date(Date.parse(d + ':00Z') - 2 * 3600e3).toISOString().slice(0, 19) + 'Z';
    }
    await setSetting(env.DB, 'christmas_drop_at', at);
    // paintings still waiting for a drop move with it (or open now, if the drop is cleared)
    await env.DB.prepare(`UPDATE paintings SET reveal_at = ? WHERE reveal_at > ${NOW_SQL}`).bind(at || null).run();
  }
  return onRequestGet({ env });
}
