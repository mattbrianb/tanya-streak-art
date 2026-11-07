/* "In a room" previews: each painting is hung, at true scale, in a room photo that suits it.
   Room photos: Unsplash (free licence), see /static/rooms/CREDITS.txt.
   Each room records where a painting hangs (x, y as fractions of the photo), how big a centimetre is
   (s = fraction of photo width per cm), the largest painting that wall takes, the size that looks best
   there (ideal, long edge in cm), its light and its warmth. */
(function () {
  var ROOMS = [
    { id: 'bright-white-room', a: 1.4995, x: .44,  y: .30,  align: 'center', s: .0019,  maxW: 140, maxH: 100, temp: 0,  sx: -1,  tint: 'rgba(255,250,240,.0)', ideal: 80, bright: 1.02 },
    { id: 'beige-vases',       a: 1.4401, x: .36,  y: .38,  align: 'center', s: .0022,  maxW: 110, maxH: 100, temp: 1,  sx: 0,   tint: 'rgba(214,196,160,.10)', ideal: 60, bright: .97 },
    { id: 'grey-fireplace',    a: 1.5023, x: .465, y: .262, align: 'bottom', s: .00283, maxW: 120, maxH: 50,  temp: -1, sx: .6,  tint: 'rgba(120,130,140,.08)', ideal: 45, bright: .96 },
    { id: 'panelled-dining',   a: 1.3344, x: .337, y: .40,  align: 'center', s: .00281, maxW: 62,  maxH: 90,  temp: 1,  sx: .5,  tint: 'rgba(230,200,170,.10)', ideal: 50, bright: .97 },
    { id: 'sunlit-dining',     a: 1.3333, x: .22,  y: .576, align: 'bottom', s: .0027,  maxW: 120, maxH: 110, temp: 1,  sx: -1,  tint: 'rgba(150,110,60,.22)',  ideal: 75, bright: .82 },
    { id: 'grey-sofa',         a: 1.7778, x: .36,  y: .34,  align: 'bottom', s: .0032,  maxW: 150, maxH: 58,  temp: -1, sx: 0,   tint: 'rgba(200,205,210,.06)', ideal: 100, bright: 1 },
    { id: 'oak-sideboard',     a: 1.7778, x: .24,  y: .47,  align: 'bottom', s: .0033,  maxW: 120, maxH: 75,  temp: 0,  sx: 0,   tint: 'rgba(240,230,215,.06)', ideal: 65, bright: 1 },
    { id: 'sofa-corner',       a: 1.4995, x: .30,  y: .30,  align: 'center', s: .0026,  maxW: 110, maxH: 100, temp: 0,  sx: -.5, tint: 'rgba(240,235,225,.04)', ideal: 75, bright: 1 },
    { id: 'sage-cabinet',      a: 1.4995, x: .545, y: .37,  align: 'bottom', s: .0049,  maxW: 120, maxH: 48,  temp: -1, sx: 1,   tint: 'rgba(170,185,170,.10)', ideal: 40, bright: .97 },
    { id: 'fluted-dresser',    a: 1.7778, x: .67,  y: .466, align: 'bottom', s: .0030,  maxW: 150, maxH: 85,  temp: 1,  sx: 1,   tint: 'rgba(235,215,185,.10)', ideal: 80, bright: .98 },
    { id: 'cream-mantel',      a: 1.7563, x: .67,  y: .79,  align: 'bottom', s: .0055,  maxW: 72,  maxH: 70,  temp: 1,  sx: 1,   tint: 'rgba(235,220,195,.10)', ideal: 45, bright: .98 },
    { id: 'sunlit-shelf',      a: 1.3093, x: .77,  y: .40,  align: 'center', s: .009,   maxW: 34,  maxH: 45,  temp: 1,  sx: 1,   tint: 'rgba(240,180,110,.18)', ideal: 25, bright: .95 },
    { id: 'white-shelf',       a: 1.4995, x: .48,  y: .55,  align: 'bottom', s: .0043,  maxW: 150, maxH: 80,  temp: -1, sx: 1,   tint: 'rgba(235,235,235,.04)', ideal: 55, bright: 1 }
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
  function pick(p, warm) {
    var z = sizeOf(p), best = null, bestScore = -1e9;
    ROOMS.forEach(function (r) {
      if (z.w > r.maxW || z.h > r.maxH) return;
      var fit = Math.abs(Math.log(Math.max(z.w, z.h) / r.ideal)); // 0 = the size this wall suits best
      var score = -(warm * 4) * r.temp                            // warm art → cool room and vice versa
        - fit * 1.6                                               // small works on shelves, big ones over sofas
        + ((hash(p.id + r.id) % 100) / 100) * .6;                 // stable per-painting variety
      if (score > bestScore) { bestScore = score; best = r; }
    });
    return best;
  }

  // Markup for the room layer. Positions are % of the photo; the layer is cropped to its box by CSS.
  function html(p, r, src) {
    var z = sizeOf(p), fw = (z.w + 2 * FRAME_CM) * r.s, fh = (z.h + 2 * FRAME_CM) * r.s * r.a;   // fractions of photo w / h
    var left = r.x - fw / 2, top = r.align === 'bottom' ? r.y - fh : r.y - fh / 2;
    return '<span class="room" style="--a:' + r.a + ';--px:' + r.x + ';--sx:' + r.sx + '" aria-hidden="true">' +
      '<span class="room-in"><img class="room-bg" src="/static/rooms/' + r.id + '.jpg" alt="" loading="lazy" decoding="async">' +
      '<span class="room-art" style="left:' + (left * 100).toFixed(2) + '%;top:' + (top * 100).toFixed(2) + '%;width:' + (fw * 100).toFixed(2) + '%;height:' + (fh * 100).toFixed(2) + '%;padding:' + (FRAME_CM * r.s * 100).toFixed(3) + '%">' +
      '<img src="' + src + '" alt="" style="filter:brightness(' + r.bright + ')"><span class="room-tint" style="background:' + r.tint + '"></span></span>' +
      '</span></span>';
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
    return '<div class="room-scene" style="aspect-ratio:' + r.a + '">' + html(p, r, img.currentSrc || img.src).replace('class="room"', 'class="room full"') + '</div>';
  }

  window.Rooms = { attach: attach, scene: scene, list: ROOMS };
})();
