// Words and contact details Tanya can change in Portal > Website words.
// Each text field matches an element marked data-edit="<key>" in the site's HTML; the HTML holds the
// default, so nothing changes until she saves her own version. Multi-paragraph fields separate
// paragraphs with a blank line and may contain simple links written as [text](/path or https://...).

export const TEXT_FIELDS = [
  { key: 'site_announce', page: 'Every page', label: 'The strip at the very top', max: 120,
    def: 'Collect in Durban North · Courier across South Africa' },
  { key: 'home_title', page: 'Home page', label: 'Big heading', max: 90,
    def: 'Original oil paintings, made in Durban North' },
  { key: 'home_intro', page: 'Home page', label: 'Line under the heading', max: 300,
    def: 'Garden flowers painted from life with a loaded brush and a palette knife. Each painting is a one-off original, signed and ready to hang.' },
  { key: 'home_meet', page: 'Home page', label: '“Meet Tanya”', max: 1200, multi: true,
    def: 'Tanya Streak paints florals in oils from her home studio in Durban North: roses in jam jars, hydrangeas, sweet peas and sunflowers, picked from the garden and the market.\n\nSmall pieces can come with a little display easel; larger ones arrive ready to hang. New work shows up first here, on [Instagram](https://www.instagram.com/tanyastreakart/) and on [Facebook](https://www.facebook.com/tanyastreakart).' },
  { key: 'about_story', page: 'About page', label: 'Your story', max: 2000, multi: true,
    def: 'Tanya Streak paints florals in oils from her home studio in Durban North: roses in jam jars, hydrangeas, sweet peas and sunflowers, picked from the garden and the market.\n\nShe paints with a loaded brush and a palette knife, so the petals stand up off the canvas. Now and then she goes big, with mixed-media botanicals in acrylic, Posca and real gold leaf, like [Miami Vibes](/painting/miami-vibes) at a full metre square.\n\nSmall pieces can come with a little display easel; larger ones arrive ready to hang.' },
  { key: 'about_studio', page: 'About page', label: '“From the studio”', max: 400,
    def: 'Photos flatten oil paint a little. Up close, this is what hangs on your wall: thick, buttery strokes you can see from across the room.' },
  { key: 'commissions_intro', page: 'Commissions page', label: 'Line under the heading', max: 300,
    def: 'Your favourite flowers, the colours of one room, a size for one particular wall. Tanya paints it in oils, just for you.' }
];

export const CONTACT_FIELDS = [
  { key: 'site_phone', label: 'WhatsApp number', def: '079 276 3413', hint: 'The “Order on WhatsApp” buttons send messages to this number.' },
  { key: 'site_instagram', label: 'Instagram link', def: 'https://www.instagram.com/tanyastreakart/' },
  { key: 'site_facebook', label: 'Facebook link', def: 'https://www.facebook.com/tanyastreakart' },
  { key: 'site_location', label: 'Where you are', def: 'Durban North, KwaZulu-Natal' }
];

export const SITE_KEYS = [...TEXT_FIELDS, ...CONTACT_FIELDS].map(f => f.key);

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ESC[c]);

// "079 276 3413" or "+27 79 276 3413" → "27792763413" (for wa.me links); null if it doesn't look like a number
export function waNumber(s) {
  let d = String(s || '').replace(/\D/g, '');
  if (d.startsWith('0')) d = '27' + d.slice(1);
  return d.length >= 10 && d.length <= 15 ? d : null;
}

export function isLink(u) { return /^https:\/\/[^\s<>"]+$/i.test(String(u || '')); }

// One paragraph of Tanya's text → safe HTML, with [text](url) turned into links.
function inline(s) {
  return esc(s).replace(/\[([^\]]{1,120})\]\(((?:https:\/\/|\/)[^\s)<>"]{0,300})\)/g, (m, t, u) => {
    const ext = u.startsWith('http');
    return `<a class="link" href="${u}"${ext ? ' target="_blank" rel="noopener"' : ''}>${t}</a>`;
  });
}
export function paragraphs(s) {
  return String(s || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean).map(p => `<p>${inline(p).replace(/\n/g, '<br>')}</p>`).join('');
}
export function oneLine(s) { return inline(String(s || '').replace(/\s+/g, ' ').trim()); }

// Settings rows → { key: value } for the site keys that Tanya has actually set.
export async function loadSiteText(db) {
  const { results } = await db.prepare(`SELECT key, value FROM settings WHERE key IN (${SITE_KEYS.map(() => '?').join(',')})`).bind(...SITE_KEYS).all();
  const out = {};
  for (const r of results) if (String(r.value).trim()) out[r.key] = r.value;
  return out;
}
