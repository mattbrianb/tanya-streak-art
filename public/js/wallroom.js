/* Wallroom: hangs a painting at true scale on a lit gallery wall.
   Usage (after art.js):
     Wallroom.init({ base: '../../', wallName: 'Mustard', frame: 'salon' });
   Any element with data-wallroom="<painting id>" opens it (optional data-size="small|medium|large").
   Wallroom.open(id, sizeId) opens it from script. #wall/<id> in the URL opens it on load. */
(function () {
  var T = window.TANYA;
  var FRAME_CM = 6.5;         // the deepest frame (timber & mat) reaches this far past the canvas
  var GAP_CM = 20;            // the painting hangs this far above the table
  var BOARD_W = 110, BOARD_H = 78;   // console table under the painting: the size reference
  var ICONS = {
    prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M15 4l-8 8 8 8"/></svg>',
    next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M9 4l8 8-8 8"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg>',
    wa: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18.2a8.2 8.2 0 01-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1112 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 01-3.3-2.9c-.3-.4.3-.4.7-1.4a.5.5 0 000-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 00-.7.3 3 3 0 00-.9 2.2 5.2 5.2 0 001.1 2.7 11.8 11.8 0 004.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 001.8-1.2 2.2 2.2 0 00.1-1.2c0-.1-.2-.2-.5-.3z"/></svg>'
  };

  var opts = { base: '', wallName: 'Theme wall', frame: 'canvas', frameName: null, tone: 'theme', textures: '/static/walls/' };
  var el, stage, piece, img, label, state = { i: 0, size: 'medium', view: 'room', open: false, busy: false };
  var lastFocus = null, hintTimer = null;

  function $(sel, root) { return (root || el).querySelector(sel); }

  function build() {
    el = document.createElement('div');
    el.className = 'wr';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'wr-title');
    el.dataset.open = 'false';
    el.dataset.tone = opts.tone;
    el.dataset.frame = opts.frame;
    el.dataset.view = 'room';
    el.dataset.lit = 'false';

    var tones = [['theme', opts.wallName, 'var(--wr-wall, #ECE7DF)'], ['white', 'Gallery white', '#F1EFEA'], ['plaster', 'Warm plaster', '#E3D3BD'], ['sage', 'Sage', '#B9C2AE'], ['charcoal', 'Charcoal', '#34322F']];
    var textures = [['brick', 'Exposed brick'], ['brick-white', 'Painted brick'], ['concrete', 'Concrete'], ['oak', 'Oak panelling'], ['limewash', 'Limewash']];
    textures.forEach(function (t) { t.push('url(' + opts.textures + t[0] + '-s.jpg) center / cover', true); });
    var swatchBtn = function (t) { return '<button type="button" class="wr-chip wr-tone" data-tone="' + t[0] + '" data-name="' + t[1] + '"' + (t[3] ? ' data-tex' : '') + ' aria-pressed="false" aria-label="' + t[1] + ' wall" title="' + t[1] + '"><i class="wr-swatch" style="background:' + t[2] + '"></i></button>'; };
    var frames = [['canvas', 'Canvas edge'], ['float', 'Black float'], ['oak', 'Oak']];
    if (opts.frameName) frames.unshift([opts.frame, opts.frameName]);

    el.innerHTML =
      '<div class="wr-stage">' +
        '<div class="wr-wall"></div><div class="wr-skirting"></div><div class="wr-floor"></div>' +
        '<div class="wr-beam"></div>' +
        '<figure class="wr-piece"><div class="wr-canvas"><img alt="" decoding="async"></div></figure>' +
        '<div class="wr-board" aria-hidden="true"><i class="wr-leg"></i><i class="wr-leg wr-leg-r"></i><i class="wr-board-apron"></i><i class="wr-board-top"></i><i class="wr-books"></i></div>' +
        '<div class="wr-vignette"></div>' +
        '<section class="wr-label" aria-live="polite">' +
          '<h2 class="wr-title" id="wr-title"></h2>' +
          '<p class="wr-meta"></p>' +
          '<fieldset class="wr-sizes"><legend>Canvas size</legend></fieldset>' +
          '<p class="wr-price"></p>' +
          '<a class="wr-order" target="_blank" rel="noopener">' + ICONS.wa + '<span>Order on WhatsApp</span></a>' +
          '<p class="wr-note"><span class="wr-note-t"></span> <a class="wr-custom" target="_blank" rel="noopener">Ask about a commission</a>.</p>' +
        '</section>' +
      '</div>' +
      '<div class="wr-top">' +
        '<span class="wr-brand">' + T.name + '</span>' +
        '<div class="wr-controls">' +
          '<div class="wr-group wr-walls" role="group" aria-label="Wall"><span class="wr-gl">Wall</span><span class="wr-wall-name" aria-hidden="true"></span>' +
            tones.map(swatchBtn).join('') + '<i class="wr-div" aria-hidden="true"></i>' + textures.map(swatchBtn).join('') +
          '</div>' +
          '<div class="wr-group" role="group" aria-label="Frame"><span class="wr-gl">Frame</span>' +
            frames.map(function (f) { return '<button type="button" class="wr-chip" data-frame="' + f[0] + '" aria-pressed="false">' + f[1] + '</button>'; }).join('') +
          '</div>' +
        '</div>' +
        '<span class="wr-count" aria-live="polite"></span>' +
        '<button type="button" class="wr-close" aria-label="Close the wallroom">' + ICONS.close + '</button>' +
      '</div>' +
      '<button type="button" class="wr-arrow wr-prev" aria-label="Previous painting">' + ICONS.prev + '</button>' +
      '<button type="button" class="wr-arrow wr-next" aria-label="Next painting">' + ICONS.next + '</button>' +
      '<div class="wr-hint">Click the painting to step closer · use ← → to walk the wall</div>';
    document.body.appendChild(el);

    stage = $('.wr-stage'); piece = $('.wr-piece'); img = $('.wr-piece img'); label = $('.wr-label');

    $('.wr-close').addEventListener('click', close);
    $('.wr-prev').addEventListener('click', function () { go(-1); });
    $('.wr-next').addEventListener('click', function () { go(1); });
    el.querySelectorAll('[data-tone]').forEach(function (b) {
      if (b === el) return;
      b.addEventListener('click', function () { el.dataset.tone = b.dataset.tone; syncChips(); });
      // start fetching a texture as soon as someone points at or touches its swatch, so it's ready by the tap
      if (b.hasAttribute('data-tex')) ['pointerenter', 'focus', 'touchstart'].forEach(function (ev) {
        b.addEventListener(ev, function () { warmTexture(b.dataset.tone); }, { passive: true });
      });
    });
    el.querySelectorAll('.wr-chip[data-frame]').forEach(function (b) {
      b.addEventListener('click', function () { el.dataset.frame = b.dataset.frame; syncChips(); });
    });
    piece.addEventListener('click', function () { if (!moved) toggleView(); });
    el.addEventListener('keydown', onKey);
    window.addEventListener('resize', function () { if (state.open) layout(); });

    // swipe
    var sx = 0, sy = 0, moved = false, down = false;
    stage.addEventListener('pointerdown', function (e) { down = true; moved = false; sx = e.clientX; sy = e.clientY; });
    stage.addEventListener('pointermove', function (e) {
      if (down && Math.abs(e.clientX - sx) > 10) moved = true;
      if (state.view === 'close' && e.pointerType === 'mouse') pan(e);
    });
    stage.addEventListener('pointerup', function (e) {
      down = false;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) go(dx < 0 ? 1 : -1);
      setTimeout(function () { moved = false; }, 0);
    });
  }

  var warmed = {};
  function warmTexture(tone) {
    if (warmed[tone]) return;
    warmed[tone] = true;
    new Image().src = opts.textures + tone + '.jpg';
  }

  function syncChips() {
    el.querySelectorAll('.wr-chip[data-tone]').forEach(function (b) {
      var on = b.dataset.tone === el.dataset.tone;
      b.setAttribute('aria-pressed', String(on));
      if (on) $('.wr-wall-name').textContent = b.dataset.name;
    });
    el.querySelectorAll('.wr-chip[data-frame]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.frame === el.dataset.frame)); });
  }

  function current() { return T.paintings[state.i]; }
  function currentSize() {
    var sizes = T.sizesFor(current());
    return sizes.filter(function (s) { return s.id === state.size; })[0] || sizes[Math.min(1, sizes.length - 1)];
  }

  // Framed like a photo of the painting hung above a console table: close enough to enjoy the painting,
  // with the table (and the bricks or boards of a textured wall) showing its real size.
  function layout() {
    var vw = window.innerWidth, vh = window.innerHeight, phone = vw <= 760, narrow = vw < 1180;
    var size = currentSize();
    var all = T.sizesFor(current()), largest = all[all.length - 1];
    var fw = largest.w + FRAME_CM * 2, fh = largest.h + FRAME_CM * 2;
    // fill a good share of the screen, but cap the zoom so a small painting still looks small next to the table
    var ppc = Math.min(phone ? 7 : 10, (vw * (phone ? 0.74 : 0.38)) / fw, (vh * (phone ? 0.32 : 0.44)) / fh);
    var pw = size.w * ppc, ph = size.h * ppc, fr = FRAME_CM * ppc;
    var px = phone ? vw / 2 : vw * 0.42;
    var py = vh * (phone ? 0.44 : 0.42);
    var topClear = (phone ? 158 : narrow ? 128 : 92) + fr;
    if (py - ph / 2 < topClear) py = topClear + ph / 2;
    var boardTop = py + ph / 2 + GAP_CM * ppc;
    var floorY = boardTop + BOARD_H * ppc;
    var s = el.style;
    s.setProperty('--floor-y', floorY + 'px');
    s.setProperty('--ppc', ppc + 'px');
    s.setProperty('--pw', pw + 'px');
    s.setProperty('--ph', ph + 'px');
    s.setProperty('--px', px + 'px');
    s.setProperty('--py', py + 'px');
    s.setProperty('--spot-x', (px / vw * 100) + '%');
    s.setProperty('--skirt-h', Math.max(6, 9 * ppc) + 'px');
    s.setProperty('--label-gap', (fr + 40) + 'px');
    s.setProperty('--label-top', Math.max(topClear - fr, py - ph / 2) + 'px');
    s.setProperty('--board-top', boardTop + 'px');
    s.setProperty('--bw', BOARD_W * ppc + 'px');
    state.geo = { vw: vw, vh: vh, px: px, py: py, pw: pw, ph: ph };
    applyView();
  }

  function applyView(panX, panY) {
    var g = state.geo; if (!g) return;
    if (state.view === 'close') {
      var sc = Math.min(g.vw * 0.88 / g.pw, g.vh * 0.84 / g.ph);
      var tx = g.vw / 2 - sc * g.px + (panX || 0), ty = g.vh / 2 - sc * g.py + (panY || 0);
      stage.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + sc + ')';
    } else {
      stage.style.transform = 'none';
    }
  }

  function pan(e) {
    var g = state.geo;
    var nx = (e.clientX / g.vw - .5), ny = (e.clientY / g.vh - .5);
    stage.style.transition = 'transform .5s cubic-bezier(.16,1,.3,1)';
    applyView(-nx * g.vw * 0.08, -ny * g.vh * 0.08);
  }

  function toggleView() {
    state.view = state.view === 'close' ? 'room' : 'close';
    el.dataset.view = state.view;
    stage.style.transition = '';
    applyView();
    hideHint();
  }

  function render() {
    var p = current(), sizes = T.sizesFor(p), size = currentSize();
    // Tanya's choice for this painting (Portal > How it's shown); otherwise keep whatever is showing
    var wb = p.wall && el.querySelector('.wr-tone[data-tone="' + p.wall + '"]');
    if (wb) { el.dataset.tone = p.wall; if (wb.hasAttribute('data-tex')) warmTexture(p.wall); }
    if (p.frame && el.querySelector('.wr-chip[data-frame="' + p.frame + '"]')) el.dataset.frame = p.frame;
    syncChips();
    img.src = T.imgSrc(p, 'lg');
    img.alt = p.title + ', ' + p.medium.toLowerCase() + ' by Tanya Streak';
    $('.wr-title').textContent = p.title;
    $('.wr-meta').textContent = p.medium + (p.blurb ? ' · ' + p.blurb : '');
    var fs = $('.wr-sizes');
    fs.hidden = sizes.length < 2;
    fs.innerHTML = '<legend>Canvas size</legend>' + sizes.map(function (s) {
      return '<button type="button" class="wr-size" data-size="' + s.id + '" aria-pressed="' + (s.id === size.id) + '">' + s.label + '<small>' + s.dims + '</small></button>';
    }).join('');
    fs.querySelectorAll('.wr-size').forEach(function (b) {
      b.addEventListener('click', function () { state.size = b.dataset.size; render(); layout(); });
    });
    var sold = p.status === 'sold', order = $('.wr-order');
    $('.wr-price').textContent = sold ? 'Sold' : T.priceText(size);
    order.href = sold ? T.similarLink(p) : T.orderLink(p, size);
    order.querySelector('span').textContent = sold ? 'Ask for one like it' : 'Order on WhatsApp';
    order.setAttribute('aria-label', sold ? 'Ask Tanya on WhatsApp for a painting like ' + p.title : 'Order ' + p.title + ', ' + size.dims + ', ' + T.priceText(size) + ', on WhatsApp');
    $('.wr-note-t').textContent = sold ? 'This one has found a home.' : (sizes.length < 2 ? 'Original, ' + size.dims + '. One of a kind.' : 'Painted to order in your size.');
    $('.wr-custom').href = T.waLink('Hi Tanya! I love "' + p.title + '". Could you paint a custom piece like it?');
    $('.wr-count').textContent = String(state.i + 1).padStart(2, '0') + ' / ' + String(T.paintings.length).padStart(2, '0');
    // warm the neighbours
    [-1, 1].forEach(function (d) {
      var n = T.paintings[(state.i + d + T.paintings.length) % T.paintings.length];
      var pre = new Image(); pre.src = T.imgSrc(n, 'lg');
    });
    if (state.open) history.replaceState(null, '', '#wall/' + p.id);
  }

  function go(dir) {
    if (state.busy) return;
    state.busy = true;
    var out = dir > 0 ? 'is-leaving-l' : 'is-leaving-r';
    var inn = dir > 0 ? 'is-entering-l' : 'is-entering-r';
    piece.classList.add(out); label.classList.add('is-swapping');
    if (state.view === 'close') { state.view = 'room'; el.dataset.view = 'room'; }
    setTimeout(function () {
      state.i = (state.i + dir + T.paintings.length) % T.paintings.length;
      piece.classList.remove(out); piece.classList.add(inn);
      render(); layout();
      void piece.offsetWidth;
      piece.classList.remove(inn); label.classList.remove('is-swapping');
      state.busy = false;
    }, 300);
  }

  function open(id, sizeId) {
    if (!el) build();
    var idx = T.paintings.findIndex(function (p) { return p.id === id; });
    state.i = idx < 0 ? 0 : idx;
    if (sizeId) state.size = sizeId;
    state.view = 'room'; el.dataset.view = 'room';
    lastFocus = document.activeElement;
    state.open = true;
    el.dataset.open = 'true';
    el.dataset.lit = 'false';
    document.documentElement.style.overflow = 'hidden';
    syncChips(); render(); layout();
    piece.classList.add('is-hanging');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { el.dataset.lit = 'true'; piece.classList.remove('is-hanging'); });
    });
    $('.wr-close').focus({ preventScroll: true });
    var hint = $('.wr-hint'); hint.style.opacity = '1';
    clearTimeout(hintTimer); hintTimer = setTimeout(hideHint, 4500);
  }

  function hideHint() { if (el) $('.wr-hint').style.opacity = '0'; }

  function close() {
    state.open = false;
    el.dataset.open = 'false';
    document.documentElement.style.overflow = '';
    history.replaceState(null, '', location.pathname + location.search);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  function onKey(e) {
    if (e.key === 'Escape') { if (state.view === 'close') toggleView(); else close(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    else if (e.key === 'Tab') {
      var f = Array.prototype.filter.call(el.querySelectorAll('button, a[href]'), function (n) { return n.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  function init(o) {
    T = window.TANYA;
    for (var k in o) opts[k] = o[k];
    document.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('[data-wallroom]');
      if (!t) return;
      e.preventDefault();
      open(t.getAttribute('data-wallroom'), t.getAttribute('data-size'));
    });
    function fromHash() {
      var m = location.hash.match(/^#wall\/([\w-]+)/);
      if (m && !(state.open && current().id === m[1])) open(m[1]);
    }
    window.addEventListener('hashchange', fromHash);
    fromHash();
  }

  window.Wallroom = { init: init, open: open, close: close };
})();
