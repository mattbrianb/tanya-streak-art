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
    { id: 'sage-cabinet', name: 'On a sage cabinet',      a: 1.4995, x: .545, y: .37,  align: 'bottom', s: .0049,  maxW: 120, maxH: 48,  temp: -1, sx: 1,   tint: 'rgba(170,185,170,.10)', ideal: 40, bright: .97 },
    { id: 'fluted-dresser', name: 'Above a fluted dresser',    a: 1.7778, x: .67,  y: .466, align: 'bottom', s: .0030,  maxW: 150, maxH: 85,  temp: 1,  sx: 1,   tint: 'rgba(235,215,185,.10)', ideal: 80, bright: .98 },
    { id: 'cream-mantel', name: 'Cream mantelpiece',      a: 1.7563, x: .67,  y: .79,  align: 'bottom', s: .0055,  maxW: 72,  maxH: 70,  temp: 1,  sx: 1,   tint: 'rgba(235,220,195,.10)', ideal: 45, bright: .98 },
    { id: 'sunlit-shelf', name: 'Sunlit shelf',      a: 1.3093, x: .77,  y: .40,  align: 'center', s: .009,   maxW: 34,  maxH: 45,  temp: 1,  sx: 1,   tint: 'rgba(240,180,110,.18)', ideal: 25, bright: .95 },
    { id: 'white-shelf', name: 'White shelf',       a: 1.4995, x: .48,  y: .55,  align: 'bottom', s: .0043,  maxW: 150, maxH: 80,  temp: -1, sx: 1,   tint: 'rgba(235,235,235,.04)', ideal: 55, bright: 1 },
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
    // the painting's bigger side should fill ~28% of the big view, ~38% of a square card
    var k = full ? .28 / Math.max(fh, fw) : .38 / Math.max(fh, fw * r.a);
    k = Math.max(1, Math.min(k, 2.6));
    // zoom origin o (fixed point): pick it so the painting lands near the middle, kept inside 0..1
    function origin(c) { if (k <= 1.001) return c; var o = (k * c - .5) / (k - 1); return Math.max(0, Math.min(1, o)); }
    var ox = origin(cx), oy = origin(cy), nx = ox + k * (cx - ox);
    return '<span class="room" style="--a:' + r.a + ';--px:' + nx.toFixed(4) + ';--sx:' + r.sx + '" aria-hidden="true">' +
      '<span class="room-in"><span class="room-z" style="transform-origin:' + (ox * 100).toFixed(2) + '% ' + (oy * 100).toFixed(2) + '%;transform:scale(' + k.toFixed(3) + ')">' +
      '<img class="room-bg" src="' + (r.src || '/static/rooms/' + r.id + '.jpg') + '" alt="" loading="lazy" decoding="async">' +
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

  // Tanya's own room photos (from the API) join the stock ones.
  function add(list) {
    (list || []).forEach(function (r) { if (!ROOMS.some(function (x) { return x.id === r.id; })) ROOMS.push(r); });
  }
  window.Rooms = { attach: attach, scene: scene, list: ROOMS, fits: fits, add: add };
})();
