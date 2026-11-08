/* Walk the gallery: Tanya's paintings hung at true size in a bright 3D room (Blush & Linen).
   Three.js (r160, from the import map) is loaded on demand so the page shell, header and the
   no-WebGL fallback work even if the CDN or GPU is unavailable.
   Units are metres. Lighting is faked: vertex-colour gradients, soft "shadow" quads and an
   additive light pool behind each painting, so everything renders unlit and cheaply. */

const $ = (s) => document.querySelector(s);
const stage = $('#wk'), canvas = $('#wk-canvas');
const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
let THREE, T;

/* ---------- page shell ---------- */
function setTop() {
  if (stage.classList.contains('is-fs')) return;
  stage.style.setProperty('--wk-top', Math.round(stage.getBoundingClientRect().top + scrollY) + 'px');
}
function fail(msg) {
  stage.dataset.state = 'error';
  if (msg) $('#wk-fallback-t').textContent = msg;
  $('#wk-fallback').hidden = false;
}
function hasGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) { return false; }
}

setTop();
addEventListener('load', setTop);
addEventListener('resize', setTop);
Site.boot('/gallery/').then((t) => { T = t; setTop(); return start(); }).catch((err) => {
  console.error(err);
  fail('The paintings didn’t load. Please refresh the page, or browse the gallery instead.');
});

async function start() {
  if (!hasGL()) return fail();
  try { THREE = await import('three'); } catch (e) {
    return fail('The 3D room couldn’t load. Please check your connection and refresh, or browse the gallery instead.');
  }
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); } catch (e) { return fail(); }
  if (!T.paintings.length) return fail('There are no paintings hanging yet. New work is on the easel.');
  run(renderer);
}

/* ---------- small helpers ---------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
function rng(seed) { return function () { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

/* ====================================================================== */
function run(renderer) {
  const EYE = 1.6, RADIUS = 0.28, H = 3.3, CENTRE = 1.5, LABEL_Y = 1.4, MIN_VIEW = 0.55, VIEW_FILL = 0.6;
  const LABEL_W = 0.2, LABEL_H = 0.1125, LABEL_GAP = 0.09;
  const n = T.paintings.length;
  let dirty = true, glide = null;

  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  let pixelRatio = Math.min(devicePixelRatio || 1, 2);
  renderer.setPixelRatio(pixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0xF2EAE3);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 60);
  camera.rotation.order = 'YXZ';

  /* ---------- hang plan: order, frames, room size ---------- */
  const order = T.paintings.filter((p) => p.status !== 'sold').concat(T.paintings.filter((p) => p.status === 'sold'));
  const works = order.map((p) => {
    const z = T.sizesFor(p)[0];
    const w = z.w / 100, h = z.h / 100, long = Math.max(w, h);
    const mat = clamp(long * 0.12, 0.035, 0.1), mould = clamp(long * 0.05, 0.028, 0.055);
    const fw = w + 2 * (mat + mould), fh = h + 2 * (mat + mould);
    const foot = fw + LABEL_GAP + LABEL_W;            // painting + label footprint along the wall
    return { p, size: z, w, h, mat, mould, fw, fh, foot, slot: Math.max(1.5, foot + 0.95) };
  });
  const L = works.reduce((s, x) => s + x.slot, 0);
  const M = 0.9; // keep paintings this far from corners

  let D = 7.2, W;
  for (; D <= 16; D += 0.4) { W = Math.round(D * 1.15 * 10) / 10; if (2 * (D - 2 * M) + (W - 2 * M) >= L * 1.05) break; }
  D = Math.min(D, 16); W = Math.round(D * 1.15 * 10) / 10;
  const PW = clamp(W * 0.4, 2.8, 5.2), PH = 2.7, PD = 0.24, ZP = -D * 0.04;
  const ZB = ZP + PD / 2 + 1.35, BW = 1.6, BD = 0.42;
  const DOOR_W = 1.3, DOOR_H = 2.35;

  // wall segments in tour order: origin on the floor, run direction, normal into the room
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const walls = [
    { name: 'left', o: V(-W / 2, 0, D / 2), dir: V(0, 0, -1), n: V(1, 0, 0), len: D, a: M, b: D - M },
    { name: 'back', o: V(-W / 2, 0, -D / 2), dir: V(1, 0, 0), n: V(0, 0, 1), len: W, a: M, b: W - M },
    { name: 'right', o: V(W / 2, 0, -D / 2), dir: V(0, 0, 1), n: V(-1, 0, 0), len: D, a: M, b: D - M }
  ];
  const cap = () => walls.reduce((s, w) => s + (w.b - w.a), 0);
  if (cap() < L) { // big collection: use the back of the partition and the front wall either side of the door
    walls.push({ name: 'partition', o: V(PW / 2, 0, ZP - PD / 2), dir: V(-1, 0, 0), n: V(0, 0, -1), len: PW, a: 0.25, b: PW - 0.25 });
    walls.push({ name: 'front-r', o: V(W / 2, 0, D / 2), dir: V(-1, 0, 0), n: V(0, 0, -1), len: W, a: M, b: W / 2 - DOOR_W / 2 - 0.5 });
    walls.push({ name: 'front-l', o: V(W / 2, 0, D / 2), dir: V(-1, 0, 0), n: V(0, 0, -1), len: W, a: W / 2 + DOOR_W / 2 + 0.5, b: W - M });
  }
  const spacing = Math.min(1, cap() / L);
  // share paintings out in proportion to each wall's usable length (largest remainder), in hanging order
  {
    const total = cap(), exact = walls.map((w) => (w.b - w.a) / total * n), counts = exact.map(Math.floor);
    exact.map((e, i) => [e - counts[i], i]).sort((a, b) => b[0] - a[0]).slice(0, n - counts.reduce((a, b) => a + b, 0)).forEach(([, i]) => counts[i]++);
    let k = 0; walls.forEach((w, i) => { w.items = works.slice(k, k + counts[i]); k += counts[i]; });
    // if a wall is over-full, push its last painting on to the next wall
    walls.forEach((w, i) => {
      while (i < walls.length - 1 && w.items.length > 1 && w.items.reduce((s, x) => s + x.slot * spacing, 0) > (w.b - w.a)) walls[i + 1].items.unshift(w.items.pop());
    });
    walls.forEach((w) => {
      if (!w.items.length) return;
      const used = w.items.reduce((s, x) => s + x.foot, 0), gap = Math.max(0.2, ((w.b - w.a) - used) / w.items.length);
      let t = w.a + gap / 2;
      w.items.forEach((x) => {
        x.wall = w; x.t = t + x.fw / 2; t += x.foot + gap;
        x.cy = Math.max(CENTRE, x.fh / 2 + 0.4);
        x.basis = new THREE.Matrix4().makeBasis(w.dir, V(0, 1, 0), w.n).setPosition(w.o.clone().addScaledVector(w.dir, x.t));
        x.centre = V(0, x.cy, 0).applyMatrix4(x.basis);
      });
    });
  }

  /* ---------- colour + geometry builder (one merged, vertex-coloured mesh) ---------- */
  const col = (hex) => new THREE.Color(hex);
  function Builder(withAlpha) {
    const pos = [], cols = [], uvs = [], v = new THREE.Vector3(), nv = new THREE.Vector3();
    this.add = (geo, m, fn) => {
      const g = geo.index ? geo.toNonIndexed() : geo.clone();
      if (m) g.applyMatrix4(m);
      const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
      for (let i = 0; i < P.count; i++) {
        v.fromBufferAttribute(P, i); nv.fromBufferAttribute(N, i);
        const c = fn(v, nv, U ? U.getX(i) : 0, U ? U.getY(i) : 0);
        pos.push(v.x, v.y, v.z); cols.push(c[0], c[1], c[2]); if (withAlpha) cols.push(c[3]);
        if (U) uvs.push(U.getX(i), U.getY(i)); else uvs.push(0, 0);
      }
      g.dispose();
    };
    this.build = () => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(cols, withAlpha ? 4 : 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      g.computeBoundingSphere();
      return g;
    };
  }
  const box = (sx, sy, sz) => new THREE.BoxGeometry(sx, sy, sz);
  const at = (base, x, y, z) => base.clone().multiply(new THREE.Matrix4().makeTranslation(x, y, z));
  // flat colour lit from above and the front
  function lit(hex, front) {
    const c = col(hex);
    return (p, nn) => {
      let f = 0.88 + 0.2 * nn.y;
      if (front) { const d = nn.dot(front); f += d > 0 ? 0.12 * d : 0.06 * d; }
      return [c.r * f, c.g * f, c.b * f];
    };
  }
  const flat = (hex, f = 1) => { const c = col(hex); return () => [c.r * f, c.g * f, c.b * f]; };

  const stat = new Builder(false);

  /* walls: warm white, warmer near the floor, soft corner and junction shading */
  const WALL = col('#F7F1EC'), WALL_LOW = col('#F4E6DA'), WALL_HIGH = col('#ECE7E3');
  function wallShade(p, nn, roomCorners) {
    const c = WALL.clone();
    if (p.y < 1.1) c.lerp(WALL_LOW, (1.1 - p.y) / 1.1);
    if (p.y > 2.2) c.lerp(WALL_HIGH, Math.min(1, (p.y - 2.2) / (H - 2.2)));
    let f = 0.975;
    if (nn.x > 0.5) f *= 0.97; else if (nn.z > 0.5) f *= 0.985; else if (nn.z < -0.5) f *= 0.95;
    f *= 1 - 0.12 * Math.exp(-p.y / 0.22);
    f *= 1 - 0.08 * Math.exp(-Math.max(0, H - p.y) / 0.3);
    if (roomCorners) f *= 1 - 0.13 * Math.exp(-Math.max(W / 2 - Math.abs(p.x), D / 2 - Math.abs(p.z)) / 0.4);
    return [c.r * f, c.g * f, c.b * f];
  }
  const roomWalls = [
    { o: V(-W / 2, 0, D / 2), dir: V(0, 0, -1), n: V(1, 0, 0), len: D },
    { o: V(-W / 2, 0, -D / 2), dir: V(1, 0, 0), n: V(0, 0, 1), len: W },
    { o: V(W / 2, 0, -D / 2), dir: V(0, 0, 1), n: V(-1, 0, 0), len: D },
    { o: V(W / 2, 0, D / 2), dir: V(-1, 0, 0), n: V(0, 0, -1), len: W }
  ];
  const SKIRT = col('#FBF8F4');
  roomWalls.forEach((w) => {
    const m = new THREE.Matrix4().makeBasis(w.dir, V(0, 1, 0), w.n).setPosition(w.o);
    const g = new THREE.PlaneGeometry(w.len, H, Math.ceil(w.len / 0.35), 16); g.translate(w.len / 2, H / 2, 0);
    stat.add(g, m, (p, nn) => wallShade(p, nn, true));
    stat.add(box(w.len, 0.1, 0.016), at(m, w.len / 2, 0.05, 0.008), (p, nn) => {
      const f = nn.y > 0.5 ? 1.02 : 0.93 * (1 - 0.1 * Math.exp(-Math.max(W / 2 - Math.abs(p.x), D / 2 - Math.abs(p.z)) / 0.4));
      return [SKIRT.r * f, SKIRT.g * f, SKIRT.b * f];
    });
  });

  /* doorway behind the starting point: a glimpse of a brighter room beyond */
  {
    const m = new THREE.Matrix4().makeBasis(V(-1, 0, 0), V(0, 1, 0), V(0, 0, -1)).setPosition(0, 0, D / 2);
    const g = new THREE.PlaneGeometry(DOOR_W, DOOR_H, 4, 8); g.translate(0, DOOR_H / 2, 0.004);
    const hi = col('#FFFDFB'), lo = col('#F1E6DE');
    stat.add(g, m, (p) => { const c = lo.clone().lerp(hi, clamp(p.y / DOOR_H, 0, 1) ** 0.7); return [c.r, c.g, c.b]; });
    const arch = lit('#FBF8F4', V(0, 0, -1));
    stat.add(box(0.08, DOOR_H + 0.08, 0.025), at(m, -DOOR_W / 2 - 0.04, (DOOR_H + 0.08) / 2, 0.012), arch);
    stat.add(box(0.08, DOOR_H + 0.08, 0.025), at(m, DOOR_W / 2 + 0.04, (DOOR_H + 0.08) / 2, 0.012), arch);
    stat.add(box(DOOR_W + 0.16, 0.08, 0.025), at(m, 0, DOOR_H + 0.04, 0.012), arch);
  }

  /* ceiling: white, brightest round the skylight */
  const SKY_W = Math.min(W * 0.42, 4), SKY_D = Math.min(D * 0.36, 3), SKY_Z = (ZP - D / 2) / 2 + 0.6;
  const skyGlow = (x, z) => Math.exp(-((x / (W * 0.4)) ** 2 + ((z - SKY_Z) / (D * 0.4)) ** 2));
  {
    const g = new THREE.PlaneGeometry(W, D, 24, 24); g.rotateX(Math.PI / 2); g.translate(0, H, 0);
    const c = col('#FBF9F6');
    stat.add(g, null, (p) => {
      let f = 0.84 + 0.14 * skyGlow(p.x, p.z);
      f *= 1 - 0.12 * Math.exp(-Math.min(W / 2 - Math.abs(p.x), D / 2 - Math.abs(p.z)) / 0.45);
      return [c.r * f, c.g * f, c.b * f];
    });
    // skylight well rim
    const rim = flat('#E9E3DD');
    stat.add(box(SKY_W + 0.16, 0.06, 0.08), new THREE.Matrix4().makeTranslation(0, H - 0.03, SKY_Z - SKY_D / 2 - 0.04), rim);
    stat.add(box(SKY_W + 0.16, 0.06, 0.08), new THREE.Matrix4().makeTranslation(0, H - 0.03, SKY_Z + SKY_D / 2 + 0.04), rim);
    stat.add(box(0.08, 0.06, SKY_D), new THREE.Matrix4().makeTranslation(-SKY_W / 2 - 0.04, H - 0.03, SKY_Z), rim);
    stat.add(box(0.08, 0.06, SKY_D), new THREE.Matrix4().makeTranslation(SKY_W / 2 + 0.04, H - 0.03, SKY_Z), rim);
  }

  /* track lighting: a slim black rail loop with a can aimed at every painting */
  const TRACK = '#221D1B', RAIL_IN = 1.2, RAIL_Y = H - 0.025;
  {
    const r = lit(TRACK), rx = W / 2 - RAIL_IN, rz = D / 2 - RAIL_IN;
    stat.add(box(2 * rx + 0.03, 0.03, 0.03), new THREE.Matrix4().makeTranslation(0, RAIL_Y, -rz), r);
    stat.add(box(2 * rx + 0.03, 0.03, 0.03), new THREE.Matrix4().makeTranslation(0, RAIL_Y, rz), r);
    stat.add(box(0.03, 0.03, 2 * rz), new THREE.Matrix4().makeTranslation(-rx, RAIL_Y, 0), r);
    stat.add(box(0.03, 0.03, 2 * rz), new THREE.Matrix4().makeTranslation(rx, RAIL_Y, 0), r);
    if (walls.some((w) => w.name === 'partition' && w.items.length)) {
      stat.add(box(PW, 0.03, 0.03), new THREE.Matrix4().makeTranslation(0, RAIL_Y, ZP - PD / 2 - RAIL_IN), r);
    }
  }
  const lens = flat('#FFF4DC', 1.1);
  function trackCan(x) {
    const wallPt = x.centre.clone().setY(0);
    const head = wallPt.addScaledVector(x.wall.n, x.wall.name === 'partition' ? RAIL_IN : RAIL_IN).setY(RAIL_Y - 0.06);
    const target = x.centre.clone();
    const m = new THREE.Matrix4().lookAt(head, target, V(0, 1, 0)).setPosition(head);
    stat.add(box(0.012, 0.07, 0.012), new THREE.Matrix4().makeTranslation(head.x, head.y + 0.035, head.z), flat(TRACK));
    stat.add(new THREE.CylinderGeometry(0.036, 0.03, 0.15, 12).rotateX(Math.PI / 2), at(m, 0, 0, -0.05), lit(TRACK));
    stat.add(new THREE.CircleGeometry(0.026, 12).rotateY(Math.PI), at(m, 0, 0, -0.126), lens);
  }

  /* partition (title wall) */
  {
    const m = new THREE.Matrix4().makeTranslation(0, PH / 2, ZP);
    const g = new THREE.BoxGeometry(PW, PH, PD, Math.ceil(PW / 0.35), 14, 1);
    stat.add(g, m, (p, nn) => {
      const c = wallShade(p, nn, false);
      if (Math.abs(nn.x) > 0.5) { c[0] *= 0.93; c[1] *= 0.93; c[2] *= 0.93; }
      if (nn.y > 0.5) { c[0] *= 1.02; c[1] *= 1.02; c[2] *= 1.02; }
      return c;
    });
    const sk = lit('#FBF8F4');
    stat.add(box(PW + 0.032, 0.1, PD + 0.032), new THREE.Matrix4().makeTranslation(0, 0.05, ZP), sk);
  }

  /* bench: pale oak with a blush linen cushion */
  {
    const oak = lit('#D9BE98'), cush = lit('#EBD3CA');
    stat.add(box(BW, 0.05, BD), new THREE.Matrix4().makeTranslation(0, 0.4, ZB), oak);
    stat.add(box(BW - 0.06, 0.06, BD - 0.05), new THREE.Matrix4().makeTranslation(0, 0.455, ZB), cush);
    stat.add(box(0.05, 0.375, BD - 0.02), new THREE.Matrix4().makeTranslation(-BW / 2 + 0.1, 0.1875, ZB), oak);
    stat.add(box(0.05, 0.375, BD - 0.02), new THREE.Matrix4().makeTranslation(BW / 2 - 0.1, 0.1875, ZB), oak);
    stat.add(box(BW - 0.25, 0.04, 0.04), new THREE.Matrix4().makeTranslation(0, 0.12, ZB), oak);
  }

  /* frames, mats, labels backing, cans */
  const FRAME = '#C9A27A', MAT = '#FBF7EF';
  works.forEach((x) => {
    const b = at(x.basis, 0, x.cy, 0), fr = lit(FRAME, x.wall.n), mt = lit(MAT, x.wall.n);
    const iw = x.fw - 2 * x.mould, ih = x.fh - 2 * x.mould, d = 0.042;
    stat.add(box(x.fw, x.mould, d), at(b, 0, x.fh / 2 - x.mould / 2, d / 2), fr);
    stat.add(box(x.fw, x.mould, d), at(b, 0, -x.fh / 2 + x.mould / 2, d / 2), fr);
    stat.add(box(x.mould, ih, d), at(b, -x.fw / 2 + x.mould / 2, 0, d / 2), fr);
    stat.add(box(x.mould, ih, d), at(b, x.fw / 2 - x.mould / 2, 0, d / 2), fr);
    stat.add(box(iw, ih, 0.022), at(b, 0, 0, 0.011), mt);
    // label board
    x.labelX = x.fw / 2 + LABEL_GAP + LABEL_W / 2;
    stat.add(box(LABEL_W, LABEL_H, 0.004), at(x.basis, x.labelX, LABEL_Y, 0.002), lit('#FFFDF8', x.wall.n));
    trackCan(x);
  });

  const staticMesh = new THREE.Mesh(stat.build(), new THREE.MeshBasicMaterial({ vertexColors: true }));
  scene.add(staticMesh);

  /* ---------- textures drawn on canvases ---------- */
  function canvasTex(c, opts = {}) {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso;
    if (opts.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(opts.repeat[0], opts.repeat[1]); }
    return t;
  }
  function plankTexture() {
    const S = 1024, c = mkCanvas(S, S), x = c.getContext('2d'), R = rng(7), planks = 10, pw = S / planks;
    x.fillStyle = '#E4D2B8'; x.fillRect(0, 0, S, S);
    for (let i = 0; i < planks; i++) {
      let y = -R() * S;
      while (y < S) {
        const len = S * (0.45 + R() * 0.5), l = 76 + R() * 9, hue = 30 + R() * 6, sat = 32 + R() * 12;
        for (const off of [0, S]) {
          const yy = y - off;
          if (yy + len < 0 || yy > S) continue;
          x.fillStyle = `hsl(${hue} ${sat}% ${l}%)`; x.fillRect(i * pw, yy, pw, len);
          // grain
          for (let k = 0; k < 14; k++) {
            x.strokeStyle = `rgba(${120 + R() * 40},${85 + R() * 30},${50 + R() * 20},${0.05 + R() * 0.08})`;
            x.lineWidth = 0.6 + R() * 1.4; x.beginPath();
            const gx = i * pw + 3 + R() * (pw - 6), amp = 1 + R() * 3, fr = 0.004 + R() * 0.01, ph = R() * 6;
            for (let s = 0; s <= len; s += 16) x.lineTo(gx + Math.sin(s * fr + ph) * amp, yy + s);
            x.stroke();
          }
          x.fillStyle = 'rgba(110,80,50,.28)'; x.fillRect(i * pw, yy, pw, 1.5);
        }
        y += len;
      }
      x.fillStyle = 'rgba(110,80,50,.3)'; x.fillRect(i * pw, 0, 1.5, S);
      x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(i * pw + 1.5, 0, 1, S);
    }
    return c;
  }
  function softRect(S = 128, edge = 0.38) {
    const c = mkCanvas(S, S), x = c.getContext('2d'), img = x.createImageData(S, S);
    const sm = (e) => { const t = clamp(e / edge, 0, 1); return t * t * (3 - 2 * t); };
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const u = (i + 0.5) / S, v = (j + 0.5) / S, a = sm(Math.min(u, 1 - u)) * sm(Math.min(v, 1 - v)), k = (j * S + i) * 4;
      img.data[k] = img.data[k + 1] = img.data[k + 2] = 255; img.data[k + 3] = Math.round(a * 255);
    }
    x.putImageData(img, 0, 0); return c;
  }
  function radial(S = 128) {
    const c = mkCanvas(S, S), x = c.getContext('2d'), img = x.createImageData(S, S);
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const dx = (i + 0.5) / S * 2 - 1, dy = (j + 0.5) / S * 2 - 1, r = Math.min(1, Math.hypot(dx, dy)), k = (j * S + i) * 4;
      const a = Math.pow(1 - r, 1.6) * (1 - 0.25 * Math.max(0, dy)); // a little stronger at the top, like a wall-washer scallop
      img.data[k] = img.data[k + 1] = img.data[k + 2] = 255; img.data[k + 3] = Math.round(clamp(a, 0, 1) * 255);
    }
    x.putImageData(img, 0, 0); return c;
  }
  function skylightTexture() {
    const c = mkCanvas(512, 512), x = c.getContext('2d');
    const g = x.createRadialGradient(256, 256, 30, 256, 256, 360);
    g.addColorStop(0, '#FFFFFF'); g.addColorStop(1, '#EEF2F3'); x.fillStyle = g; x.fillRect(0, 0, 512, 512);
    x.strokeStyle = '#E2DDD7'; x.lineWidth = 7;
    for (let i = 1; i < 4; i++) { x.beginPath(); x.moveTo(i * 128, 0); x.lineTo(i * 128, 512); x.stroke(); }
    x.beginPath(); x.moveTo(0, 256); x.lineTo(512, 256); x.stroke();
    x.lineWidth = 16; x.strokeRect(0, 0, 512, 512);
    return c;
  }

  /* floor */
  const floorTex = canvasTex(plankTexture(), { repeat: [W / 1.6, D / 1.6] });
  {
    const g = new THREE.PlaneGeometry(W, D, 36, 32); g.rotateX(-Math.PI / 2);
    const fb = new Builder(false);
    fb.add(g, null, (p) => {
      let f = 0.9 + 0.12 * skyGlow(p.x, p.z);
      f *= 1 - 0.24 * Math.exp(-Math.min(W / 2 - Math.abs(p.x), D / 2 - Math.abs(p.z)) / 0.3);
      const dpx = Math.max(0, Math.abs(p.x) - PW / 2), dpz = Math.max(0, Math.abs(p.z - ZP) - PD / 2);
      f *= 1 - 0.32 * Math.exp(-Math.hypot(dpx, dpz) / 0.22);
      return [f, f, f];
    });
    const geo = fb.build();
    var floor = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: floorTex, vertexColors: true }));
    scene.add(floor);
  }

  /* skylight */
  {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(SKY_W, SKY_D).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ map: canvasTex(skylightTexture()) }));
    m.position.set(0, H - 0.004, SKY_Z); scene.add(m);
  }

  /* soft shadows (multiply-ish dark quads) and light pools (additive), each one draw call */
  {
    const sb = new Builder(true), pb = new Builder(true);
    const quad = (w, h) => new THREE.PlaneGeometry(w, h);
    works.forEach((x) => {
      sb.add(quad(x.fw + 0.07, x.fh + 0.09), at(x.basis, 0.006, x.cy - 0.028, 0.004), () => [0.22, 0.16, 0.12, 0.34]);
      sb.add(quad(LABEL_W + 0.02, LABEL_H + 0.024), at(x.basis, x.labelX, LABEL_Y - 0.006, 0.0035), () => [0.2, 0.15, 0.12, 0.2]);
      const pwid = Math.max(x.fw * 1.8, x.fw + 0.8), phei = x.fh + 1.2;
      pb.add(quad(pwid, phei), at(x.basis, 0, x.cy + 0.18, 0.006), () => [0.11, 0.085, 0.05, 1]);
    });
    sb.add(quad(BW + 0.5, BD + 0.5).rotateX(-Math.PI / 2), new THREE.Matrix4().makeTranslation(0, 0.003, ZB), () => [0.25, 0.18, 0.12, 0.42]);
    sb.add(quad(PW + 0.5, PD + 0.6).rotateX(-Math.PI / 2), new THREE.Matrix4().makeTranslation(0, 0.003, ZP), () => [0.25, 0.18, 0.12, 0.3]);
    const smat = new THREE.MeshBasicMaterial({ map: canvasTex(softRect()), vertexColors: true, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
    const pmat = new THREE.MeshBasicMaterial({ map: canvasTex(radial()), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
    const pools = new THREE.Mesh(pb.build(), pmat); pools.renderOrder = 1; scene.add(pools);
    const shadows = new THREE.Mesh(sb.build(), smat); shadows.renderOrder = 2; scene.add(shadows);
  }

  /* paintings (one textured plane each, md first, lg when viewed close) */
  const loader = new THREE.TextureLoader();
  const pMats = [];
  works.forEach((x, i) => {
    const mat = new THREE.MeshBasicMaterial({ color: 0xF1EADF, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(x.w, x.h), mat);
    mesh.matrixAutoUpdate = false; mesh.matrix.copy(at(x.basis, 0, x.cy, 0.0232));
    scene.add(mesh); x.mesh = mesh; pMats.push(mat);
  });
  function fitTexture(tex, x) {
    const img = tex.image, ia = img.width / img.height, pa = x.w / x.h;
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = maxAniso;
    if (ia > pa) { tex.repeat.set(pa / ia, 1); tex.offset.set((1 - pa / ia) / 2, 0); }
    else { tex.repeat.set(1, ia / pa); tex.offset.set(0, (1 - ia / pa) / 2); }
  }

  /* invisible hit targets: frame + label for each painting (raycast only, never drawn) */
  const hitMesh = (() => {
    const hb = new Builder(false);
    works.forEach((x) => {
      hb.add(new THREE.PlaneGeometry(x.fw + 0.04, x.fh + 0.04), at(x.basis, 0, x.cy, 0.05), () => [0, 0, 0]);
      hb.add(new THREE.PlaneGeometry(LABEL_W + 0.04, LABEL_H + 0.04), at(x.basis, x.labelX, LABEL_Y, 0.05), () => [0, 0, 0]);
    });
    const m = new THREE.Mesh(hb.build(), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
    m.updateMatrixWorld(); return m;
  })();

  /* floor ring: where a click will take you */
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.17, 0.205, 48).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x9C5A54, transparent: true, opacity: 0.85, depthWrite: false }));
  ring.renderOrder = 3; ring.visible = false; scene.add(ring);

  /* title + labels need the web fonts */
  async function fontsReady() {
    const want = ['400 120px "Mrs Saint Delafield"', '500 60px Figtree', '600 40px Figtree', '400 40px Figtree'];
    await Promise.race([Promise.all(want.map((f) => document.fonts.load(f))), new Promise((r) => setTimeout(r, 4000))]).catch(() => {});
  }
  function drawTracked(x, text, cx, y, track) {
    const widths = [...text].map((ch) => x.measureText(ch).width), total = widths.reduce((a, b) => a + b, 0) + track * (text.length - 1);
    let px = cx - total / 2;
    [...text].forEach((ch, i) => { x.fillText(ch, px, y); px += widths[i] + track; });
  }
  function buildTitle() {
    const c = mkCanvas(2048, 1024), x = c.getContext('2d');
    x.textAlign = 'left'; x.textBaseline = 'alphabetic';
    let fs = 330; x.font = `400 ${fs}px "Mrs Saint Delafield", cursive`;
    const tw = x.measureText(T.name).width; if (tw > 1880) { fs *= 1880 / tw; x.font = `400 ${fs}px "Mrs Saint Delafield", cursive`; }
    x.fillStyle = '#3A2E2A'; x.textAlign = 'center'; x.fillText(T.name, 1024, 520);
    x.fillStyle = '#B9716A'; x.fillRect(1024 - 70, 640, 140, 3);
    x.textAlign = 'left'; x.fillStyle = '#9C5A54'; x.font = '500 64px Figtree, sans-serif';
    drawTracked(x, 'THE COLLECTION', 1024, 760, 22);
    x.fillStyle = '#66574F'; x.font = '400 44px Figtree, sans-serif';
    drawTracked(x, 'Oil paintings · Durban North', 1024, 850, 3);
    const tw3 = Math.min(PW * 0.8, 2.4);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(tw3, tw3 / 2), new THREE.MeshBasicMaterial({ map: canvasTex(c), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }));
    m.position.set(0, 1.62, ZP + PD / 2 + 0.003); m.renderOrder = 2; scene.add(m);
  }
  function wrap(x, text, maxW, maxLines) {
    const words = text.split(/\s+/), lines = []; let line = '';
    words.forEach((w) => { const t = line ? line + ' ' + w : w; if (x.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; });
    if (line) lines.push(line);
    if (lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '') + '…'; }
    return lines;
  }
  function buildLabels() {
    const CW = 512, CH = 288, cols = 4, rows = Math.ceil(n / cols);
    const c = mkCanvas(CW * cols, CH * rows), x = c.getContext('2d');
    const lb = new Builder(false);
    works.forEach((w, i) => {
      const ox = (i % cols) * CW, oy = Math.floor(i / cols) * CH, sold = w.p.status === 'sold';
      x.fillStyle = '#FFFDF8'; x.fillRect(ox, oy, CW, CH);
      x.fillStyle = '#3A2E2A'; x.font = '600 38px Figtree, sans-serif'; x.textBaseline = 'alphabetic'; x.textAlign = 'left';
      const lines = wrap(x, w.p.title, CW - 72, 2);
      let y = oy + 34 + 38;
      lines.forEach((l) => { x.fillText(l, ox + 36, y); y += 44; });
      x.fillStyle = '#66574F'; x.font = '400 28px Figtree, sans-serif';
      x.fillText(wrap(x, w.p.medium, CW - 72, 1)[0], ox + 36, y + 4); y += 38;
      x.fillText(w.size.dims, ox + 36, y + 4);
      const py = oy + CH - 36;
      if (sold) {
        x.fillStyle = '#9C5A54'; x.beginPath(); x.arc(ox + 36 + 11, py - 11, 11, 0, Math.PI * 2); x.fill();
        x.font = '600 30px Figtree, sans-serif'; x.fillText('Sold', ox + 36 + 34, py);
      } else {
        x.fillStyle = '#3A2E2A'; x.font = '600 32px Figtree, sans-serif'; x.fillText(T.priceText(w.size), ox + 36, py);
      }
      const g = new THREE.PlaneGeometry(LABEL_W, LABEL_H), uv = g.attributes.uv;
      for (let k = 0; k < uv.count; k++) uv.setXY(k, (i % cols + uv.getX(k)) / cols, 1 - (Math.floor(i / cols) + 1 - uv.getY(k)) / rows);
      lb.add(g, at(w.basis, w.labelX, LABEL_Y, 0.0052), () => [1, 1, 1]);
    });
    const tex = canvasTex(c); tex.generateMipmaps = true;
    const m = new THREE.Mesh(lb.build(), new THREE.MeshBasicMaterial({ map: tex, vertexColors: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }));
    scene.add(m);
  }

  /* ---------- loading ---------- */
  let done = 0; const total = n + 1;
  const pctEl = $('#wk-pct'), barEl = $('#wk-bar');
  function tick() {
    done++;
    const pct = Math.round(done / total * 100);
    pctEl.textContent = pct + '%'; barEl.style.width = pct + '%';
    dirty = true;
    if (done >= total) ready();
  }
  works.forEach((x, i) => {
    const url = T.imgSrc(x.p, 'md');
    if (!url) return tick();
    loader.load(url, (tex) => { fitTexture(tex, x); x.md = tex; pMats[i].map = tex; pMats[i].color.set(0xffffff); pMats[i].needsUpdate = true; tick(); },
      undefined, () => tick());
  });
  fontsReady().then(() => { buildTitle(); buildLabels(); tick(); });

  /* ---------- camera state & movement ---------- */
  const cam = { x: 0, z: D / 2 - 0.38, yaw: 0, pitch: -0.07 };
  const obstacles = [
    { x0: -PW / 2, x1: PW / 2, z0: ZP - PD / 2, z1: ZP + PD / 2 },
    { x0: -BW / 2, x1: BW / 2, z0: ZB - BD / 2, z1: ZB + BD / 2 }
  ];
  function resolve(p) {
    p.x = clamp(p.x, -W / 2 + RADIUS, W / 2 - RADIUS);
    p.z = clamp(p.z, -D / 2 + RADIUS, D / 2 - RADIUS);
    obstacles.forEach((o) => {
      const cx = clamp(p.x, o.x0, o.x1), cz = clamp(p.z, o.z0, o.z1), dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz);
      if (d >= RADIUS) return;
      if (d > 1e-6) { p.x = cx + dx / d * RADIUS; p.z = cz + dz / d * RADIUS; return; }
      const pen = [[p.x - o.x0, -1, 0], [o.x1 - p.x, 1, 0], [p.z - o.z0, 0, -1], [o.z1 - p.z, 0, 1]].sort((a, b) => a[0] - b[0])[0];
      if (pen[1]) p.x = pen[1] < 0 ? o.x0 - RADIUS : o.x1 + RADIUS; else p.z = pen[2] < 0 ? o.z0 - RADIUS : o.z1 + RADIUS;
    });
    return p;
  }
  function segHits(a, b, o, pad) {
    let t0 = 0, t1 = 1; const dx = b.x - a.x, dz = b.z - a.z;
    const test = (p, q) => { if (Math.abs(p) < 1e-9) return q >= 0; const r = q / p; if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; } return true; };
    return test(-dx, a.x - (o.x0 - pad)) && test(dx, (o.x1 + pad) - a.x) && test(-dz, a.z - (o.z0 - pad)) && test(dz, (o.z1 + pad) - a.z);
  }
  const clear = (a, b) => obstacles.every((o) => !segHits(a, b, o, RADIUS - 0.01));
  function findPath(a, b) {
    if (clear(a, b)) return [a, b];
    const nodes = [a, b]; const pad = RADIUS + 0.15;
    obstacles.forEach((o) => [[o.x0 - pad, o.z0 - pad], [o.x1 + pad, o.z0 - pad], [o.x0 - pad, o.z1 + pad], [o.x1 + pad, o.z1 + pad]].forEach(([x, z]) => {
      const p = { x, z }; const r = resolve({ x, z });
      if (Math.hypot(r.x - x, r.z - z) < 0.02) nodes.push(p);
    }));
    const dist = nodes.map(() => Infinity), prev = nodes.map(() => -1), seen = nodes.map(() => false); dist[0] = 0;
    for (;;) {
      let u = -1; dist.forEach((d, i) => { if (!seen[i] && d < Infinity && (u < 0 || d < dist[u])) u = i; });
      if (u < 0 || u === 1) break; seen[u] = true;
      nodes.forEach((v, i) => {
        if (seen[i] || i === u || !clear(nodes[u], v)) return;
        const d = dist[u] + Math.hypot(v.x - nodes[u].x, v.z - nodes[u].z);
        if (d < dist[i]) { dist[i] = d; prev[i] = u; }
      });
    }
    if (prev[1] < 0) return [a, b];
    const path = []; for (let i = 1; i >= 0; i = prev[i]) { path.unshift(nodes[i]); if (i === 0) break; }
    return path;
  }

  function glideTo(target, yaw, pitch, onDone) {
    const from = { x: cam.x, z: cam.z };
    const pts = findPath(from, target);
    const lens = []; let len = 0;
    for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z); lens.push(l); len += l; }
    const y0 = cam.yaw, dy = yaw == null ? 0 : angDiff(cam.yaw, yaw), p0 = cam.pitch, dp = pitch == null ? 0 : pitch - cam.pitch;
    const dur = reduceMQ.matches ? 0 : clamp(Math.max(len / 1.9, Math.abs(dy) / 1.8, 0.45), 0.45, 3.2) * 1000;
    glide = { pts, lens, len, y0, dy, p0, dp, t0: performance.now(), dur, onDone };
    if (!dur) stepGlide(performance.now());
  }
  function stepGlide(now) {
    const g = glide, t = g.dur ? clamp((now - g.t0) / g.dur, 0, 1) : 1, e = ease(t);
    let s = e * g.len, i = 0;
    while (i < g.lens.length - 1 && s > g.lens[i]) { s -= g.lens[i]; i++; }
    const a = g.pts[i], b = g.pts[i + 1] || a, k = g.lens[i] ? clamp(s / g.lens[i], 0, 1) : 1;
    cam.x = a.x + (b.x - a.x) * k; cam.z = a.z + (b.z - a.z) * k;
    cam.yaw = g.y0 + g.dy * e; cam.pitch = g.p0 + g.dp * e;
    if (t >= 1) { glide = null; ring.visible = false; if (g.onDone) g.onDone(); }
  }

  /* ---------- view offset: keep the painting clear of the info card ---------- */
  const offset = { x: 0, y: 0, tx: 0, ty: 0 };
  let vw = 1, vh = 1;
  function panelSpace() {
    if (sel < 0) return { x: 0, y: 0, w: vw, h: vh };
    if (vw > 760) { const pw = Math.min(470, vw * 0.5); /* room for the card and the next arrow beside it */ return { x: pw / 2, y: 64, w: vw - pw, h: vh - 128 }; }
    const sh = info.offsetHeight; return { x: 0, y: sh / 2 - 28, w: vw, h: Math.max(160, vh - sh - 56) };
  }
  function applyOffset() {
    if (Math.abs(offset.x) < 0.5 && Math.abs(offset.y) < 0.5 && !offset.tx && !offset.ty) camera.clearViewOffset();
    else camera.setViewOffset(vw, vh, offset.x, offset.y, vw, vh);
  }

  /* ---------- selection ---------- */
  const info = $('#wk-info');
  let sel = -1, tour = -1, lgIdx = -1, selDrop = 0;
  // pixels to shift the view so a painting below (or above) eye level sits centred, like a shift lens
  const dropPx = () => sel < 0 ? 0 : selDrop / Math.tan(camera.fov * Math.PI / 360) * vh / 2;
  function viewPose(i) {
    const x = works[i], sp = panelSpace(), t30 = Math.tan(camera.fov * Math.PI / 360);
    const th = t30 * sp.h / vh, tw = t30 * sp.w / vh;
    // step close enough that the framed painting fills about 60% of the space beside the card
    let dist = Math.max(MIN_VIEW, x.fw / (2 * tw * VIEW_FILL), x.fh / (2 * th * VIEW_FILL));
    const wn = x.wall.n, base = x.centre.clone().setY(0);
    const room = x.wall.name === 'partition' ? (ZP - PD / 2) - (-D / 2) - 0.4 : (Math.abs(wn.x) > 0.5 ? W : D) - 0.6;
    dist = Math.min(dist, room);
    let p;
    for (;;) {
      p = { x: base.x + wn.x * dist, z: base.z + wn.z * dist };
      const r = resolve({ ...p });
      if (Math.hypot(r.x - p.x, r.z - p.z) < 0.01 || dist <= MIN_VIEW) { p = r; break; }
      dist -= 0.1;
    }
    // look straight at the wall so the frame stays square; the image is shifted to centre the painting instead
    return { p, yaw: Math.atan2(wn.x, wn.z), pitch: 0, drop: (EYE - x.cy) / dist, sp };
  }
  function select(i, via) {
    sel = i; tour = i;
    fillInfo(works[i]);
    info.dataset.open = 'true'; info.inert = false; stage.classList.add('has-info');
    const pose = viewPose(i);
    selDrop = pose.drop;
    offset.tx = pose.sp.x; offset.ty = pose.sp.y + dropPx();
    glideTo(pose.p, pose.yaw, pose.pitch);
    loadLarge(i);
    updateCount();
    $('#wk-live').textContent = 'Now viewing ' + works[i].p.title + ', ' + (works[i].p.status === 'sold' ? 'sold' : T.priceText(works[i].size)) + '.';
    hideHint();
  }
  function deselect() {
    if (sel < 0) return;
    const hadFocus = info.contains(document.activeElement);
    sel = -1; info.dataset.open = 'false'; info.inert = true; stage.classList.remove('has-info');
    offset.tx = 0; offset.ty = 0; dirty = true;
    if (hadFocus) canvas.focus({ preventScroll: true });
  }
  function loadLarge(i) {
    if (lgIdx === i) return;
    if (lgIdx >= 0) { const o = works[lgIdx]; if (o.lg) { pMats[lgIdx].map = o.md || null; o.lg.dispose(); o.lg = null; pMats[lgIdx].needsUpdate = true; } }
    lgIdx = i;
    const x = works[i], url = T.imgSrc(x.p, 'lg');
    if (!url) return;
    loader.load(url, (tex) => {
      if (lgIdx !== i) { tex.dispose(); return; }
      fitTexture(tex, x); x.lg = tex; pMats[i].map = tex; pMats[i].color.set(0xffffff); pMats[i].needsUpdate = true; dirty = true;
    });
  }
  const WA = '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#wa"/></svg>';
  function fillInfo(x) {
    const p = x.p, sold = p.status === 'sold';
    $('#wk-i-status').innerHTML = sold ? '<span class="dot" aria-hidden="true"></span>Sold' : 'Available';
    $('#wk-i-title').textContent = p.title;
    $('#wk-i-meta').textContent = p.medium + ' · ' + x.size.dims;
    const pr = $('#wk-i-price'); pr.textContent = sold ? 'Sold' : T.priceText(x.size); pr.classList.toggle('sold', sold);
    $('#wk-i-blurb').textContent = p.blurb || '';
    const o = $('#wk-i-order');
    o.href = sold ? T.similarLink(p) : T.orderLink(p);
    o.innerHTML = WA + '<span>' + (sold ? 'Ask for one like it' : 'Order on WhatsApp') + '</span>';
    o.setAttribute('aria-label', sold ? 'Ask Tanya on WhatsApp for a painting like ' + p.title : 'Order ' + p.title + ' on WhatsApp');
    $('#wk-i-details').href = p.url;
    $('#wk-i-details').setAttribute('aria-label', 'View details of ' + p.title);
  }
  function updateCount() { $('#wk-count').textContent = tour >= 0 ? (tour + 1) + ' / ' + n : n + (n === 1 ? ' painting' : ' paintings'); }
  function step(dir) {
    const i = tour < 0 ? (dir > 0 ? 0 : n - 1) : (tour + dir + n) % n;
    select(i, 'tour');
  }

  /* ---------- input: drag to look, tap to walk / open ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    ndc.set((clientX - r.left) / r.width * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    camera.updateMatrixWorld(); ray.setFromCamera(ndc, camera);
    const wallHit = ray.intersectObject(staticMesh, false)[0];
    const wd = wallHit ? wallHit.distance : Infinity;
    const art = ray.intersectObject(hitMesh, false)[0];
    if (art && art.distance < wd + 0.02) return { art: Math.floor(art.faceIndex / 4) };
    const fl = ray.intersectObject(floor, false)[0];
    if (fl && fl.distance < wd + 0.01) return { floor: fl.point };
    if (wallHit && wallHit.point.y < 0.6) return { floor: wallHit.point }; // the bench or skirting: walk up to it
    return {};
  }
  function freeTarget(pt) {
    const p = resolve({ x: pt.x, z: pt.z });
    return resolve(p);
  }
  function walkTo(pt) {
    deselect();
    const t = freeTarget(pt);
    ring.position.set(t.x, 0.004, t.z); ring.visible = true; ring.material.opacity = 0.85;
    glideTo(t, null, null);
  }

  let drag = null, hintGone = false;
  const hint = $('#wk-hint');
  function hideHint() { if (hintGone) return; hintGone = true; hint.classList.add('is-gone'); }
  canvas.addEventListener('pointerdown', (e) => {
    if (drag || (e.pointerType === 'mouse' && e.button !== 0)) return;
    hideHint();
    if (document.activeElement && document.activeElement !== document.body && !stage.contains(document.activeElement)) document.activeElement.blur();
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), moved: false };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (drag && e.pointerId === drag.id) {
      if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6) { drag.moved = true; canvas.classList.add('is-dragging'); ring.visible = false; }
      if (drag.moved) {
        const k = (Math.PI / 3) / Math.max(300, vh);
        cam.yaw += (e.clientX - drag.x) * k; cam.pitch = clamp(cam.pitch + (e.clientY - drag.y) * k, -0.6, 0.45);
        if (glide) { glide.y0 = cam.yaw; glide.dy = 0; glide.p0 = cam.pitch; glide.dp = 0; }
        dirty = true;
      }
      drag.x = e.clientX; drag.y = e.clientY;
    } else if (e.pointerType === 'mouse' && !drag) hover(e);
  });
  function endDrag(e, cancelled) {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag; drag = null; canvas.classList.remove('is-dragging');
    if (cancelled || d.moved || performance.now() - d.t > 700) return;
    const h = pick(e.clientX, e.clientY);
    if (h.art != null) select(h.art, 'tap');
    else if (h.floor) walkTo(h.floor);
  }
  canvas.addEventListener('pointerup', (e) => endDrag(e, false));
  canvas.addEventListener('pointercancel', (e) => endDrag(e, true));
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  let hoverQueued = null;
  function hover(e) {
    if (hoverQueued) { hoverQueued = e; return; }
    hoverQueued = e;
    requestAnimationFrame(() => {
      const ev = hoverQueued; hoverQueued = null;
      const h = pick(ev.clientX, ev.clientY);
      canvas.classList.toggle('is-art', h.art != null);
      canvas.classList.toggle('is-floor', !!h.floor);
      if (!glide) {
        const show = !!h.floor;
        if (show) { const t = freeTarget(h.floor); ring.position.set(t.x, 0.004, t.z); ring.material.opacity = 0.45; }
        if (ring.visible !== show || show) dirty = true;
        ring.visible = show;
      }
    });
  }
  canvas.addEventListener('pointerleave', () => { if (!glide && ring.visible) { ring.visible = false; dirty = true; } });

  /* keys + pad: held = continuous movement; keyboard "click" on a pad button = one step */
  const held = new Set();
  const KEYS = { ArrowUp: 'fwd', KeyW: 'fwd', ArrowDown: 'back', KeyS: 'back', ArrowLeft: 'turnL', KeyQ: 'turnL', ArrowRight: 'turnR', KeyE: 'turnR', KeyA: 'left', KeyD: 'right' };
  function wrInOpen() { return !!document.querySelector('.wr[data-open="true"]'); }
  // keys drive the room while focus is inside it, or after the visitor last clicked/tapped in it
  let engaged = false;
  document.addEventListener('pointerdown', (e) => { engaged = stage.contains(e.target); }, true);
  const ours = (e) => stage.contains(e.target) || (engaged && (e.target === document.body || e.target === document.documentElement));
  document.addEventListener('keydown', (e) => {
    if (!ours(e) || wrInOpen() || e.altKey || e.ctrlKey || e.metaKey) return;
    if (info.contains(e.target)) return;
    const mv = KEYS[e.code];
    if (mv) { e.preventDefault(); hideHint(); held.add('k:' + mv); return; }
    if ((e.key === 'Enter' || e.key === ' ') && (e.target === canvas || !stage.contains(e.target))) { e.preventDefault(); const i = facing(); if (i >= 0) select(i, 'key'); }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || wrInOpen() || document.querySelector('.overlay')) return;
    if (sel >= 0) { e.preventDefault(); deselect(); } else if (fsFallback) toggleFs();
  });
  document.addEventListener('keyup', (e) => { const mv = KEYS[e.code]; if (mv) held.delete('k:' + mv); });
  addEventListener('blur', () => held.clear());
  function facing() {
    let best = -1, score = Infinity;
    const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw);
    works.forEach((x, i) => {
      const dx = x.centre.x - cam.x, dz = x.centre.z - cam.z, d = Math.hypot(dx, dz);
      const ang = Math.acos(clamp((dx * fx + dz * fz) / d, -1, 1));
      if (ang < 0.45 && ang * 3 + d * 0.15 < score && clear({ x: cam.x, z: cam.z }, { x: x.centre.x + x.wall.n.x * 0.3, z: x.centre.z + x.wall.n.z * 0.3 })) { score = ang * 3 + d * 0.15; best = i; }
    });
    return best;
  }
  document.querySelectorAll('#wk-pad button').forEach((b) => {
    const mv = b.dataset.move;
    b.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse' && e.button !== 0) return; e.preventDefault(); hideHint(); b.setPointerCapture(e.pointerId); held.add('p:' + mv); b.classList.add('is-held'); });
    const up = () => { held.delete('p:' + mv); b.classList.remove('is-held'); };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
    b.addEventListener('click', (e) => { if (e.detail !== 0) return; nudge(mv); });
  });
  function nudge(mv) {
    deselect();
    if (mv === 'turnL' || mv === 'turnR') { glideTo({ x: cam.x, z: cam.z }, cam.yaw + (mv === 'turnL' ? 0.35 : -0.35), null); return; }
    const a = cam.yaw + ({ fwd: 0, back: Math.PI, left: Math.PI / 2, right: -Math.PI / 2 })[mv];
    glideTo(resolve({ x: cam.x - Math.sin(a) * 0.6, z: cam.z - Math.cos(a) * 0.6 }), null, null);
  }
  const vel = { f: 0, s: 0, t: 0 };
  function applyHeld(dt) {
    const on = (m) => held.has('k:' + m) || held.has('p:' + m);
    const tf = (on('fwd') ? 1 : 0) - (on('back') ? 1 : 0), ts = (on('right') ? 1 : 0) - (on('left') ? 1 : 0), tt = (on('turnL') ? 1 : 0) - (on('turnR') ? 1 : 0);
    if ((tf || ts || tt) && (glide || sel >= 0)) { glide = null; deselect(); ring.visible = false; }
    const k = Math.min(1, dt * (reduceMQ.matches ? 60 : 9));
    vel.f += (tf * 1.5 - vel.f) * k; vel.s += (ts * 1.2 - vel.s) * k; vel.t += (tt * 1.6 - vel.t) * k;
    if (Math.abs(vel.f) < 0.005 && Math.abs(vel.s) < 0.005 && Math.abs(vel.t) < 0.005) { vel.f = vel.s = vel.t = 0; return false; }
    cam.yaw += vel.t * dt;
    const sy = Math.sin(cam.yaw), cy = Math.cos(cam.yaw);
    const p = resolve({ x: cam.x - sy * vel.f * dt + cy * vel.s * dt, z: cam.z - cy * vel.f * dt - sy * vel.s * dt });
    cam.x = p.x; cam.z = p.z;
    return true;
  }

  /* ---------- buttons ---------- */
  $('#wk-prev').addEventListener('click', () => step(-1));
  $('#wk-next').addEventListener('click', () => step(1));
  $('#wk-close').addEventListener('click', deselect);
  $('#wk-i-wall').addEventListener('click', () => {
    const p = works[sel] && works[sel].p; if (!p) return;
    const go = () => Wallroom.open(p.id);
    if (document.fullscreenElement) document.exitFullscreen().then(go, go);
    else { if (fsFallback) toggleFs(); go(); }
  });
  const fsBtn = $('#wk-fs');
  let fsFallback = false; // iPhone Safari has no element full screen: fill the window instead
  function setFs(on) {
    stage.classList.toggle('is-fs', on);
    fsBtn.setAttribute('aria-pressed', String(on)); fsBtn.setAttribute('aria-label', on ? 'Exit full screen' : 'Enter full screen');
    document.documentElement.style.overflow = on && fsFallback ? 'hidden' : '';
    if (!on) setTop();
  }
  function toggleFs() {
    if (document.fullscreenElement) { document.exitFullscreen(); return; }
    if (fsFallback) { fsFallback = false; setFs(false); return; }
    if (document.fullscreenEnabled && stage.requestFullscreen) stage.requestFullscreen().catch(() => { fsFallback = true; setFs(true); });
    else { fsFallback = true; setFs(true); }
  }
  fsBtn.addEventListener('click', toggleFs);
  document.addEventListener('fullscreenchange', () => setFs(document.fullscreenElement === stage));

  /* ---------- size + render loop ---------- */
  function resize() {
    const r = stage.getBoundingClientRect();
    vw = Math.max(1, Math.round(r.width)); vh = Math.max(1, Math.round(r.height));
    renderer.setSize(vw, vh, false);
    // 60° vertical; on tall phone screens widen it so at least ~50° shows across
    camera.aspect = vw / vh; camera.fov = Math.max(60, 2 * Math.atan(Math.tan(25 * Math.PI / 180) / camera.aspect) * 180 / Math.PI);
    camera.updateProjectionMatrix();
    if (sel >= 0) { const sp = panelSpace(); offset.tx = sp.x; offset.ty = sp.y + dropPx(); }
    applyOffset(); dirty = true;
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  let visible = true;
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) dirty = true; }).observe(stage);
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); fail('The 3D room was interrupted. Please refresh the page to step back in.'); });

  let last = performance.now(), slow = 0, frames = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    let moving = false;
    if (glide) { stepGlide(now); moving = true; }
    if (applyHeld(dt)) moving = true;
    const k = reduceMQ.matches ? 1 : Math.min(1, dt * 6);
    if (Math.abs(offset.tx - offset.x) > 0.5 || Math.abs(offset.ty - offset.y) > 0.5) {
      offset.x += (offset.tx - offset.x) * k; offset.y += (offset.ty - offset.y) * k; applyOffset(); moving = true;
    } else if (offset.x !== offset.tx || offset.y !== offset.ty) { offset.x = offset.tx; offset.y = offset.ty; applyOffset(); moving = true; }
    if ((moving || dirty) && visible) {
      camera.position.set(cam.x, EYE, cam.z); camera.rotation.set(cam.pitch, cam.yaw, 0);
      renderer.render(scene, camera); dirty = false;
      // adaptive resolution: if motion runs slower than ~45 fps, render fewer pixels
      if (moving) { frames++; if (dt > 0.022) slow++; if (frames >= 45) { if (slow > 30 && pixelRatio > 1) { pixelRatio = Math.max(1, pixelRatio - 0.25); renderer.setPixelRatio(pixelRatio); resize(); } frames = slow = 0; } }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  function ready() {
    stage.dataset.state = 'ready';
    updateCount();
    setTimeout(hideHint, 7000);
  }
}
