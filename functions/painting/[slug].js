// /painting/<slug> → the painting page template, with the title, description and photo
// written into the <head> so WhatsApp, Facebook and Google show a proper preview.
import { loadPaintings } from '../../lib/util.js';

function rand(n) { return 'R' + Number(n).toLocaleString('en-US'); }

export async function onRequestGet({ request, env, params }) {
  const url = new URL(request.url);
  const page = await env.ASSETS.fetch(new URL('/painting/', url));
  const [p] = await loadPaintings(env.DB, { slug: String(params.slug) });
  if (!p) return new Response(page.body, { status: 404, headers: page.headers });

  const size = p.width_cm && p.height_cm ? `${p.width_cm} × ${p.height_cm} cm` : '';
  const price = p.status === 'sold' ? 'Sold' : p.price ? rand(p.price) : '';
  const desc = [p.medium, size, price].filter(Boolean).join(' · ') + (p.description ? `. ${p.description}` : '');
  const title = `${p.title} · Tanya Streak Art`;
  const image = p.images[0] ? new URL(p.images[0].lg, url).href : new URL('/static/og.jpg', url).href;

  const setContent = (v) => ({ element(el) { el.setAttribute('content', v); } });
  return new HTMLRewriter()
    .on('title', { element(el) { el.setInnerContent(title); } })
    .on('meta[name="description"]', setContent(desc.slice(0, 300)))
    .on('meta[property="og:title"]', setContent(title))
    .on('meta[property="og:description"]', setContent(desc.slice(0, 300)))
    .on('meta[property="og:image"]', setContent(image))
    .on('head', { element(el) { el.append(`<link rel="canonical" href="${url.origin}/painting/${p.slug}">`, { html: true }); } })
    .transform(new Response(page.body, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=0, s-maxage=60' } }));
}
