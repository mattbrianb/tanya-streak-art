// Puts Tanya's own words and contact details (Portal > Website words) into every page as it is served,
// so visitors never see the old wording flash first. Pages without her changes pass through untouched.
import { TEXT_FIELDS, CONTACT_FIELDS, loadSiteText, paragraphs, oneLine, waNumber, esc } from '../lib/sitetext.js';

const MULTI = new Set(TEXT_FIELDS.filter(f => f.multi).map(f => f.key));
const DEF = Object.fromEntries(CONTACT_FIELDS.map(f => [f.key, f.def]));
let cache = { at: 0, v: null };   // per isolate; a save shows up within ~15 seconds

async function siteText(env) {
  if (cache.v && Date.now() - cache.at < 15000) return cache.v;
  cache = { at: Date.now(), v: await loadSiteText(env.DB) };
  return cache.v;
}

const HOME = 'https://www.tanyastreakart.co.za';

export async function onRequest(ctx) {
  const url = new URL(ctx.request.url);
  // The old Cloudflare address (and its /portal) forwards to the real domain, path and query kept.
  if (url.hostname === 'tanya-streak-art.pages.dev' && (ctx.request.method === 'GET' || ctx.request.method === 'HEAD')) {
    return Response.redirect(HOME + url.pathname + url.search, 301);
  }
  const res = await ctx.next();
  const type = res.headers.get('content-type') || '';
  if (ctx.request.method !== 'GET' || !type.includes('text/html') || /^\/(portal|_options|api)\b/.test(url.pathname)) return res;

  let s;
  try { s = await siteText(ctx.env); } catch { return res; }
  const v = k => s[k] || DEF[k] || '';
  const phone = v('site_phone');
  const cfg = {
    announce: s.site_announce || null, phone, wa: waNumber(phone) || '27792763413',
    instagram: v('site_instagram'), facebook: v('site_facebook'), location: v('site_location')
  };
  const links = { instagram: cfg.instagram, facebook: cfg.facebook };

  return new HTMLRewriter()
    .on('head', { element(el) { el.append(`<script>window.SITE_CFG=${JSON.stringify(cfg).replace(/</g, '\\u003c')}</script>`, { html: true }); } })
    .on('[data-edit]', {
      element(el) {
        const k = el.getAttribute('data-edit');
        if (!s[k]) return;
        el.setInnerContent(MULTI.has(k) ? paragraphs(s[k]) : oneLine(s[k]), { html: true });
      }
    })
    .on('[data-link]', { element(el) { const u = links[el.getAttribute('data-link')]; if (u) el.setAttribute('href', u); } })
    .on('[data-contact="phone"]', { element(el) { el.setInnerContent(esc(phone), { html: true }); } })
    .on('[data-contact="location"]', { element(el) { el.setInnerContent(esc(cfg.location), { html: true }); } })
    .transform(res);
}
