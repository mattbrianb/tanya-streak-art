// Room photos Tanya uploads in the portal, for the "in a room" previews.
// She taps where a painting hangs (x, y: its middle, as fractions of the photo) and marks something
// whose real width she knows, which gives the scale (s: fraction of the photo's width per cm).

export function shapeRoom(r) {
  const a = r.width && r.height ? r.width / r.height : 1.5;
  // the biggest painting that still fits inside the photo around that spot, with a little margin
  const maxW = Math.max(10, Math.floor((2 * Math.min(r.x, 1 - r.x) / r.s) * 0.9));
  const maxH = Math.max(10, Math.floor((2 * Math.min(r.y, 1 - r.y) / (r.s * a)) * 0.9));
  return {
    id: 'c' + r.id, name: r.name, custom: true, auto: !!r.auto,
    src: `/img/${r.key_lg}`, thumb: `/img/${r.key_th}`,
    a: Math.round(a * 10000) / 10000, x: r.x, y: r.y, align: 'center', s: r.s,
    maxW, maxH, ideal: Math.round(Math.min(maxW, maxH * 1.3) * 0.55),
    temp: 0, sx: 0, tint: 'rgba(0,0,0,0)', bright: 1
  };
}

export async function loadRooms(db) {
  try {
    const { results } = await db.prepare('SELECT * FROM rooms ORDER BY id ASC').all();
    return results.map(shapeRoom);
  } catch { return []; }   // table not created yet
}

// x, y in 0.03..0.97; s from a real-world width between 5 cm and 10 m
export function validPlacement(b) {
  const x = Number(b.x), y = Number(b.y), s = Number(b.s);
  if (!(x > 0.02 && x < 0.98 && y > 0.02 && y < 0.98)) return 'Tap the wall where a painting should hang.';
  if (!(s > 0.0001 && s < 0.2)) return 'Mark something in the photo and type how wide it is, so the website knows the size.';
  return null;
}
