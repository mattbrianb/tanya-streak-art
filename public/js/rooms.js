/* "In a room" previews: each painting is hung, at true scale, in a room photo that suits it.
   Room photos: Unsplash (free licence), see /static/rooms/CREDITS.txt.
   Each room records where a painting hangs (x, y as fractions of the photo), how big a centimetre is
   (s = fraction of photo width per cm), the largest painting that wall takes, the size that looks best
   there (ideal, long edge in cm), its light and its warmth. minL: the smallest long edge that doesn't look
   lost there (a mini alone on a big fireplace reads as a mistake, even at true scale). */
(function () {
  var ROOMS = [
    { id: 'bright-white-room', name: 'Bright white room', a: 1.4995, x: .44,  y: .30,  align: 'center', s: .0019,  maxW: 140, maxH: 100, temp: 0,  sx: -1,  tint: 'rgba(255,250,240,.0)', ideal: 80, bright: 1.02 },
    { id: 'beige-vases', name: 'Beige wall with vases',       a: 1.4401, x: .36,  y: .38,  align: 'center', s: .0022,  maxW: 110, maxH: 100, temp: 1,  sx: 0,   tint: 'rgba(214,196,160,.10)', ideal: 60, bright: .97 },
    { id: 'grey-fireplace', name: 'Grey wall over a brick fireplace',    a: 1.5023, x: .465, y: .262, align: 'bottom', s: .00337, maxW: 110, maxH: 42,  minL: 35, temp: -1, sx: .6,  tint: 'rgba(120,130,140,.08)', ideal: 45, bright: .96 },
    { id: 'panelled-dining', name: 'Panelled dining room',   a: 1.3344, x: .337, y: .40,  align: 'center', s: .00281, maxW: 62,  maxH: 90,  temp: 1,  sx: .5,  tint: 'rgba(230,200,170,.10)', ideal: 50, bright: .97 },
    { id: 'sunlit-dining', name: 'Sunlit dining room',     a: 1.3333, x: .22,  y: .576, align: 'bottom', s: .0027,  maxW: 120, maxH: 110, temp: 1,  sx: -1,  tint: 'rgba(150,110,60,.22)',  ideal: 75, bright: .82 },
    { id: 'grey-sofa', name: 'Above a grey sofa',         a: 1.7778, x: .36,  y: .34,  align: 'bottom', s: .0032,  maxW: 150, maxH: 58,  temp: -1, sx: 0,   tint: 'rgba(200,205,210,.06)', ideal: 100, bright: 1 },
    { id: 'oak-sideboard', name: 'Above an oak sideboard',     a: 1.7778, x: .24,  y: .47,  align: 'bottom', s: .0033,  maxW: 120, maxH: 75,  temp: 0,  sx: 0,   tint: 'rgba(240,230,215,.06)', ideal: 65, bright: 1 },
    { id: 'sofa-corner', name: 'Sofa corner',       a: 1.4995, x: .30,  y: .30,  align: 'center', s: .0026,  maxW: 110, maxH: 100, temp: 0,  sx: -.5, tint: 'rgba(240,235,225,.04)', ideal: 75, bright: 1 },
    { id: 'sage-cabinet', name: 'On a sage cabinet',      a: 1.4995, x: .63,  y: .57,   align: 'bottom', s: .0049,  maxW: 120, maxH: 48,  temp: -1, sx: 1,   tint: 'rgba(170,185,170,.10)', ideal: 40, bright: .97 },
    { id: 'fluted-dresser', name: 'Above a fluted dresser',    a: 1.7778, x: .67,  y: .466, align: 'bottom', s: .0030,  maxW: 150, maxH: 85,  temp: 1,  sx: 1,   tint: 'rgba(235,215,185,.10)', ideal: 80, bright: .98 },
    { id: 'cream-mantel', name: 'Cream mantelpiece',      a: 1.7563, x: .67,  y: .79,  align: 'bottom', s: .0055,  maxW: 72,  maxH: 70,  temp: 1,  sx: 1,   tint: 'rgba(235,220,195,.10)', ideal: 45, bright: .98 },
    { id: 'sunlit-shelf', name: 'Sunlit shelf',      a: 1.3093, x: .77,  y: .40,  align: 'center', s: .009,   maxW: 34,  maxH: 45,  temp: 1,  sx: 1,   tint: 'rgba(240,180,110,.18)', ideal: 25, bright: .95 },
    { id: 'white-shelf', name: 'White shelf',       a: 1.4995, x: .48,  y: .55,  align: 'bottom', s: .0043,  maxW: 150, maxH: 80,  minL: 30, temp: -1, sx: 1,   tint: 'rgba(235,235,235,.04)', ideal: 55, bright: 1 },
    { id: 'sofa-wall',         name: 'Above a pale sofa',          a: 1.7778, x: .353, y: .47,  align: 'bottom', s: .00375, maxW: 160, maxH: 60, minL: 25, temp: 0,  sx: 0,   tint: 'rgba(240,235,225,.04)', ideal: 90, bright: 1 },
    { id: 'oak-dresser',       name: 'Over a pale oak dresser',    a: 1.7778, x: .206, y: .489, align: 'bottom', s: .00298, maxW: 90,  maxH: 85,  temp: 0,  sx: 0,   tint: 'rgba(240,235,225,.04)', ideal: 55, bright: 1 },
    { id: 'console-desk',      name: 'Over a console desk',        a: 1.7778, x: .273, y: .333, align: 'bottom', s: .00378, maxW: 100, maxH: 48,  temp: 0,  sx: 0,   tint: 'rgba(240,235,225,.04)', ideal: 45, bright: 1 },
    { id: 'linen-bed',         name: 'Above a low linen bed',      a: 1.4995, x: .52,  y: .2025, align: 'bottom', s: .0026, maxW: 110, maxH: 48, minL: 30, temp: 1,  sx: 0,   tint: 'rgba(235,220,195,.06)', ideal: 70, bright: 1 },
    { id: 'sunlit-nightstand', name: 'Over a sunlit nightstand',   a: 1.4967, x: .29,  y: .318, align: 'bottom', s: .00456, maxW: 70,  maxH: 38,  temp: 1,  sx: 1,   tint: 'rgba(240,200,150,.10)', ideal: 35, bright: .97 },
    { id: 'twin-beds',         name: 'Between lamps over twin beds', a: 1.4995, x: .494, y: .272, align: 'bottom', s: .00215, maxW: 150, maxH: 80, minL: 25, temp: 0, sx: 0, tint: 'rgba(240,235,225,.04)', ideal: 80, bright: 1 }
  ];
  var FRAME_CM = 2.5;             // thin timber float frame around the canvas

  // Warmth of a painting from a tiny downscale of its photo: >0 warm (reds/yellows), <0 cool (blues).
  var tempCache = {};
  function warmth(img) {
    if (tempCache[img.src] != null) return tempCache[img.src];
    try {
      var c = document.createElement('canvas'); c.width = c.height = 12;
      var g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, 12, 12);
      var d = g.getImageData(0, 0, 12, 12).data, r = 0, b = 0, n = 0;
      for (var i = 0; i < d.length; i += 4) { r += d[i]; b += d[i + 2]; n++; }
      return (tempCache[img.src] = (r - b) / n / 255);    // roughly -.4 … +.4
    } catch (e) { return 0; }
  }
  function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }

  function sizeOf(p) {
    if (p.w && p.h) return { w: p.w, h: p.h };
    var r = p.ratio || 1; return r >= 1 ? { w: 40, h: 40 / r } : { w: 40 * r, h: 40 };
  }

  // Pick the room: it must fit the painting; prefer contrast in warmth and a wall that suits its size.
  // The choice depends only on the painting, so it gets the same room on every page.
  function fits(r, z) { return !(z.w > r.maxW || z.h > r.maxH); }
  // How much of the photo the framed painting covers (its bigger side, as a fraction), and the zoom limits.
  // The room is only a backdrop if you can still see the room, so the view never steps in further than ZMAX;
  // a painting goes only into rooms where, at that zoom, it still covers at least SEEN of the picture.
  var ZMAX = 1.6, SEEN = .2;
  function cover(r, z) { return Math.max((z.h + 2 * FRAME_CM) * r.s * r.a, (z.w + 2 * FRAME_CM) * r.s); }
  // Pick the room. Tanya's own choice wins (if the painting fits that wall). Otherwise every room the
  // painting fits is scored on: a wall that suits its size, a wall that suits its shape (landscape over
  // sofas and sideboards, tall works in narrower spots), and a gentle warm/cool contrast. One of the best
  // few is then chosen per painting, so a collection spreads across rooms instead of all landing in one;
  // rooms already used on this page count against a repeat.
  var used = {};
  function pick(p, warm) {
    var z = sizeOf(p);
    var own = p.room && ROOMS.filter(function (r) { return r.id === p.room; })[0];
    if (own && fits(own, z)) return own;
    var long = Math.max(z.w, z.h), aspect = z.w / z.h, cands = [];
    ROOMS.forEach(function (r) {
      if (r.auto === false) return;                              // Tanya's photo, kept for paintings she picks it for
      if (!fits(r, z) || (r.minL && long < r.minL)) return;
      if (cover(r, z) * ZMAX < SEEN) return;                     // it would be a speck in this room
      var ratio = long / r.ideal;
      if (ratio < .36) return;                                   // would look lost on that wall
      var wall = r.maxW / r.maxH;                                 // >1: a wide wall, <1: a tall spot
      var shape = -Math.abs(Math.log(aspect) - Math.log(wall) * .6);
      var score = -Math.abs(Math.log(ratio)) * 1.1               // the size this wall suits
        + shape * .7                                             // the shape this wall suits
        - warm * 1.5 * r.temp                                    // warm art → cooler room, gently
        - (used[r.id] || 0) * .45;                               // fewer repeats on one page
      cands.push({ r: r, score: score });
    });
    if (!cands.length) return null;
    cands.sort(function (a, b) { return b.score - a.score; });
    var top = cands.filter(function (c) { return c.score > cands[0].score - 1.4; }).slice(0, 5);
    var r = top[hash(p.id) % top.length].r;                      // stable for each painting
    used[r.id] = (used[r.id] || 0) + 1;
    return r;
  }

  // Markup for the room layer. Positions are % of the photo; the layer is cropped to its box by CSS.
  // Small paintings would be a speck in a whole room, so the view steps closer: the photo is zoomed
  // around the painting until it fills a fair share of the picture (furniture grows with it, so the
  // size comparison stays true), and the zoom drifts the painting toward the middle without ever
  // showing past the photo's edges. full = the big view on a painting page; otherwise a square card.
  function html(p, r, src, full) {
    var z = sizeOf(p), fw = (z.w + 2 * FRAME_CM) * r.s, fh = (z.h + 2 * FRAME_CM) * r.s * r.a;   // fractions of photo w / h
    var left = r.x - fw / 2, top = r.align === 'bottom' ? r.y - fh : r.y - fh / 2;
    var cx = r.x, cy = top + fh / 2;
    // step in just enough for the painting's bigger side to cover ~26% of the big view (~34% of a square
    // card, which already shows only a slice of the room), never more than ZMAX so the room stays in view
    var k = full ? .26 / Math.max(fh, fw) : .34 / Math.max(fh, fw * r.a);
    k = Math.max(1, Math.min(k, ZMAX));
    // zoom origin o (fixed point): pick it so the painting lands near the middle, kept inside 0..1
    // (vertically it aims a little above the middle, so the sofa, shelf or bed under the painting stays in view)
    function origin(c, t) { if (k <= 1.001) return c; var o = (k * c - t) / (k - 1); return Math.max(0, Math.min(1, o)); }
    var ox = origin(cx, .5), oy = origin(cy, .36), nx = ox + k * (cx - ox);
    return '<span class="room" style="--a:' + r.a + ';--px:' + nx.toFixed(4) + ';--sx:' + r.sx + '" aria-hidden="true">' +
      '<span class="room-in"><span class="room-z" style="transform-origin:' + (ox * 100).toFixed(2) + '% ' + (oy * 100).toFixed(2) + '%;transform:scale(' + k.toFixed(3) + ')">' +
      '<img class="room-bg" src="' + (r.src || '/static/rooms/' + r.id + '.jpg') + '" alt="" loading="lazy" decoding="async" onload="Rooms.light(this)">' +
      '<span class="room-art" style="left:' + (left * 100).toFixed(2) + '%;top:' + (top * 100).toFixed(2) + '%;width:' + (fw * 100).toFixed(2) + '%;height:' + (fh * 100).toFixed(2) + '%;padding:' + (FRAME_CM * r.s * 100).toFixed(3) + '%">' +
      '<img src="' + src + '" alt="" style="filter:brightness(' + r.bright + ')"><span class="room-tint" style="background:' + r.tint + '"></span></span>' +
      '</span></span></span>';
  }

  // Attach a room layer to an element once its painting photo has loaded.
  function attach(el, p, img) {
    if (!el || el.querySelector('.room')) return;
    function go() {
      var r = pick(p, warmth(img));
      if (!r) return;
      el.insertAdjacentHTML('beforeend', html(p, r, img.currentSrc || img.src));
      el.classList.add('has-room');
    }
    if (img.complete && img.naturalWidth) go(); else img.addEventListener('load', go, { once: true });
  }

  // For the painting page: a full room view as a standalone element.
  function scene(p, img) {
    var r = pick(p, warmth(img));
    if (!r) return '';
    return '<div class="room-scene" style="aspect-ratio:' + r.a + '">' + html(p, r, img.currentSrc || img.src, true).replace('class="room"', 'class="room full"') + '</div>';
  }

  // ---------- light the painting like the room ----------
  // Reads the wall around the painting in the room photo: how bright it is, the colour of the light, and
  // which side is brighter. The painting and its frame then get the same brightness and colour cast, a soft
  // light-to-shade gradient across them, and a shadow falling away from the light, so they sit in the photo
  // instead of floating on top of it. Works for Tanya's own room photos too. Measured once per photo spot.
  var lightCache = {};
  function avg(d, W, H, x0, y0, x1, y1) {
    x0 = Math.max(0, Math.floor(x0 * W)); x1 = Math.min(W, Math.ceil(x1 * W));
    y0 = Math.max(0, Math.floor(y0 * H)); y1 = Math.min(H, Math.ceil(y1 * H));
    var r = 0, g = 0, b = 0, n = 0;
    for (var y = y0; y < y1; y++) for (var x = x0; x < x1; x++) {
      var i = (y * W + x) * 4; r += d[i]; g += d[i + 1]; b += d[i + 2]; n++;
    }
    return n ? [r / n / 255, g / n / 255, b / n / 255] : null;
  }
  var lum = function (c) { return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
  function measure(bg, box) {
    var key = bg.currentSrc + '|' + box.join(',');
    if (lightCache[key]) return lightCache[key];
    var W = 96, H = Math.max(8, Math.round(96 * bg.naturalHeight / bg.naturalWidth));
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    var g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(bg, 0, 0, W, H);
    var d = g.getImageData(0, 0, W, H).data;
    var L = box[0], T = box[1], w = box[2], h = box[3], m = Math.max(w, h) * .55;
    var left = avg(d, W, H, L - m, T, L, T + h), right = avg(d, W, H, L + w, T, L + w + m, T + h);
    var top = avg(d, W, H, L - m * .5, T - m, L + w + m * .5, T);
    var parts = [left, right, top].filter(Boolean);
    if (!parts.length) return null;
    var wall = [0, 1, 2].map(function (k) { return parts.reduce(function (t, p) { return t + p[k]; }, 0) / parts.length; });
    var Lw = lum(wall), Ll = left ? lum(left) : Lw, Lr = right ? lum(right) : Lw, mx = Math.max(Ll, Lr, .01);
    var out = {
      bright: Math.max(.5, Math.min(1.06, Lw / .86)),                       // a well-lit white wall ≈ 0.86
      cast: wall.map(function (v) { return 1 - (1 - v / Math.max(wall[0], wall[1], wall[2], .01)) * .75; }),
      shadeL: Math.min(.35, (1 - Ll / mx) * 1.1), shadeR: Math.min(.35, (1 - Lr / mx) * 1.1),
      sx: Math.max(-1, Math.min(1, (Ll - Lr) * 9))                          // brighter left → shadow falls right
    };
    return (lightCache[key] = out);
  }
  function light(bg) {
    var z = bg.parentNode, art = z && z.querySelector('.room-art'), room = z && z.closest('.room');
    if (!art || !bg.naturalWidth) return;
    var st = art.style, box = [st.left, st.top, st.width, st.height].map(function (v) { return parseFloat(v) / 100; });
    var L;
    try { L = measure(bg, box); } catch (e) { return; }                        // photo from another site: leave as is
    if (!L) return;
    var img = art.querySelector('img'), tint = art.querySelector('.room-tint');
    art.style.filter = 'brightness(' + L.bright.toFixed(3) + ') contrast(.96) saturate(.94)';
    if (img) img.style.filter = '';
    if (tint) {
      var c = L.cast.map(function (v) { return Math.round(v * 255); }).join(',');
      tint.style.background = 'linear-gradient(to right, rgba(0,0,0,' + L.shadeL.toFixed(3) + '), rgba(0,0,0,0) 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,' + L.shadeR.toFixed(3) + ')), rgb(' + c + ')';
    }
    if (room) room.style.setProperty('--sx', L.sx.toFixed(2));
  }

  // Tanya's own room photos (from the API) join the stock ones.
  function add(list) {
    (list || []).forEach(function (r) { if (!ROOMS.some(function (x) { return x.id === r.id; })) ROOMS.push(r); });
  }
  window.Rooms = { attach: attach, scene: scene, list: ROOMS, fits: fits, add: add, light: light };
})();
