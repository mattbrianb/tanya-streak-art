// GET /api/paintings  → everything visible on the site (for sale + sold), with images,
//                       plus the finished commissions for /commissions/completed/,
//                       and the Christmas collection's state (on/off, wording, wrapped count).
// GET /api/paintings?slug=x → one painting.
import { json, error, loadPaintings, getSetting, christmasInfo } from '../../lib/util.js';

export async function onRequestGet({ request, env }) {
  const slug = new URL(request.url).searchParams.get('slug');
  const paintings = await loadPaintings(env.DB, { slug });
  if (slug && !paintings.length) return error(404, 'Painting not found');
  const commissions = slug ? [] : await loadPaintings(env.DB, { kind: 'commission' });
  const tiers = JSON.parse(await getSetting(env.DB, 'commission_tiers', '[]'));
  const christmas = slug ? null : await christmasInfo(env.DB);
  return json({ paintings, commissions, commission_tiers: tiers, christmas }, {
    headers: { 'cache-control': 'public, max-age=0, s-maxage=30' }
  });
}
