// Loads Tanya's Instagram paintings into a fresh site through the portal API.
// Usage: node scripts/seed.mjs <site-url> <portal-password>
//   e.g. node scripts/seed.mjs http://127.0.0.1:8788 "$(grep ADMIN_PASSWORD .dev.vars | cut -d= -f2)"
// Sizes/prices marked "placeholder" must be confirmed by Tanya (she can fix them in the portal).
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const [base, password] = process.argv.slice(2);
if (!base || !password) { console.error('Usage: node scripts/seed.mjs <site-url> <password>'); process.exit(1); }
const ART = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../assets/art');

const PAINTINGS = [
  { file: 'blue-hydrangeas', title: 'Blue Hydrangeas', width_cm: 40, height_cm: 28, price: 1800, status: 'available', // placeholder size + price
    description: 'A low glass bowl of hydrangeas in every blue from periwinkle to cobalt, caught in late afternoon light. Painted with a loaded brush so the petals sit up off the canvas.' },
  { file: 'wild-sunflowers', title: 'Wild Sunflowers in Glass', medium: 'Oil on canvas board', width_cm: 30, height_cm: 43, price: 1000, status: 'sold',
    description: 'Sunflowers laid on with thick, buttery strokes of cadmium and ochre, leaning out of a clear glass jar.' },
  { file: 'garden-roses', title: 'Garden Roses & a Cherry', medium: 'Oil on panel board', width_cm: 20, height_cm: 20, status: 'sold',
    description: 'Loose pink and coral garden roses in a glass jar on a cool blue ground, with one red cherry for luck. Came with a small display easel.' },
  { file: 'sweet-peas', title: 'Sweet Peas in a Mason Jar', medium: 'Oil on panel board', width_cm: 20, height_cm: 20, status: 'sold',
    description: 'Violet, white and blush sweet peas tumbling out of a mason jar against warm peach light. Came with a small display easel.' },
  { file: 'green-jug', title: 'Pink Blooms, Green Jug', medium: 'Oil on canvas board', status: 'sold',
    description: 'Palette-knife blossoms you can almost touch, piled high in an apple-green jug.' },
  { file: 'miami-vibes', title: 'Miami Vibes', medium: 'Acrylic, gold leaf & Posca on canvas', width_cm: 100, height_cm: 100, status: 'sold',
    description: 'Strelitzias and a sunbird on hot pink, with a disc of real gold leaf. Big, loud and joyful.' }
];

let cookie = '';
async function api(method, url, body, isForm) {
  const res = await fetch(base + url, {
    method,
    headers: { cookie, 'x-requested-with': 'portal', ...(isForm ? {} : { 'content-type': 'application/json' }) },
    body: isForm ? body : body && JSON.stringify(body)
  });
  const set = res.headers.get('set-cookie');
  if (set) cookie = set.split(';')[0];
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${url} → ${res.status} ${data.error || ''}`);
  return data;
}

await api('POST', '/api/login', { password });
const { paintings: existing } = await api('GET', '/api/admin/paintings');
const have = new Set(existing.map(p => p.title));

// Insert in reverse so the first listed ends up at the top.
for (const p of [...PAINTINGS].reverse()) {
  if (have.has(p.title)) { console.log('skip (exists):', p.title); continue; }
  const { file, ...fields } = p;
  const { painting } = await api('POST', '/api/admin/paintings', fields);
  const form = new FormData();
  form.append('lg', new Blob([await readFile(path.join(ART, `${file}.jpg`))], { type: 'image/jpeg' }), `${file}.jpg`);
  form.append('md', new Blob([await readFile(path.join(ART, `${file}-md.jpg`))], { type: 'image/jpeg' }), `${file}-md.jpg`);
  const dims = { 'blue-hydrangeas': [2200, 1554], 'wild-sunflowers': [1650, 2200], 'miami-vibes': [902, 904] }[file] || [2200, 2200];
  form.append('width', String(dims[0])); form.append('height', String(dims[1]));
  await api('POST', `/api/admin/paintings/${painting.id}/images`, form, true);
  console.log('added:', p.title);
}
console.log('Done.');
