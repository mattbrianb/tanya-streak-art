/* Tanya Streak Art: shared site script (Blush & Linen).
   Loads live paintings from /api, renders the header, footer, painting cards, sign-up forms
   and pop-up, and feeds the Wallroom. */
(function () {
  var WHATSAPP = '27792763413', PHONE = '079 276 3413', IG = 'https://www.instagram.com/tanyastreakart/';

  /* ---------- formatting & links ---------- */
  function rand(n) { return 'R' + Math.round(n).toLocaleString('en-ZA').replace(/\s| /g, ','); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(n) { return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10); }
  function waLink(text) { return 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(text); }

  /* ---------- data ---------- */
  function shape(p) {
    var cover = p.images[0] || {};
    var ratio = p.width_cm && p.height_cm ? p.width_cm / p.height_cm : (cover.width && cover.height ? cover.width / cover.height : 1);
    return {
      id: p.slug, dbId: p.id, title: p.title, medium: p.medium, description: p.description,
      blurb: (p.description || '').split(/(?<=[.!?])\s/)[0],
      status: p.status, price: p.price, w: p.width_cm, h: p.height_cm, ratio: ratio,
      images: p.images, url: '/painting/' + p.slug
    };
  }
  function dims(p) { return p.w && p.h ? num(p.w) + ' × ' + num(p.h) + ' cm' : ''; }
  function sizesFor(p) {
    if (p.w && p.h) return [{ id: 'original', label: 'Original', w: p.w, h: p.h, price: p.price, dims: dims(p) }];
    // Size not entered yet: show it at a modest 30 cm long edge on the wall.
    var w = p.ratio >= 1 ? 30 : 30 * p.ratio, h = p.ratio >= 1 ? 30 / p.ratio : 30;
    return [{ id: 'original', label: 'Original', w: w, h: h, price: p.price, dims: 'Size on request' }];
  }
  function priceText(size) { return size.price ? rand(size.price) : 'Price on request'; }
  function orderLink(p, size) {
    size = size || sizesFor(p)[0];
    return waLink('Hi Tanya! I would love to buy "' + p.title + '"' +
      (p.w ? ' (' + size.dims + (size.price ? ', ' + rand(size.price) : '') + ')' : '') +
      ' from your website. Is it still available?');
  }
  function similarLink(p) { return waLink('Hi Tanya! I saw "' + p.title + '" on your website. Could you paint something like it for me?'); }
  function imgSrc(p, v) { var c = p.images[0]; return c ? (v === 'md' ? c.md : c.lg) : ''; }

  var dataPromise = null;
  function load() {
    if (!dataPromise) dataPromise = fetch('/api/paintings').then(function (r) {
      if (!r.ok) throw new Error('api');
      return r.json();
    }).then(function (d) {
      window.TANYA = {
        name: 'Tanya Streak Art', tiers: d.commission_tiers || [],
        paintings: d.paintings.filter(function (p) { return p.images.length; }).map(shape),
        commissions: (d.commissions || []).filter(function (p) { return p.images.length; }).map(function (p) {
          var c = shape(p); c.url = '/commissions/completed/#' + p.slug; return c;
        }),
        sizesFor: sizesFor, rand: rand, priceText: priceText, waLink: waLink,
        orderLink: orderLink, similarLink: similarLink, imgSrc: imgSrc
      };
      return window.TANYA;
    });
    return dataPromise;
  }

  /* ---------- pieces ---------- */
  var ICON = {
    wa: '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#wa"/></svg>',
    wall: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2.5" y="2" width="11" height="8.5"/><path d="M1 14h14M5 14v-1.5h6V14"/></svg>'
  };

  // A painting in a timber frame with an ivory mat, title, size, price and actions.
  function cardHTML(p, opts) {
    opts = opts || {};
    var z = sizesFor(p)[0], sold = p.status === 'sold';
    return '<article class="card" data-status="' + p.status + '">' +
      '<a class="frame" data-pid="' + p.id + '" href="' + p.url + '" aria-label="' + esc(p.title) + (sold ? ', sold' : '') + '">' +
        (sold ? '<span class="pill">Sold</span>' : '') +
        '<span class="mat"><img src="' + esc(imgSrc(p, 'md')) + '" alt="' + esc(p.title) + ', ' + esc(p.medium.toLowerCase()) + ', by Tanya Streak"' + (opts.eager ? '' : ' loading="lazy"') + '></span></a>' +
      '<h3><a href="' + p.url + '">' + esc(p.title) + '</a></h3>' +
      '<p class="meta">' + esc(p.medium) + (p.w ? ' · ' + esc(z.dims) : '') + '</p>' +
      '<p class="price' + (sold ? ' sold' : '') + '">' + (sold ? 'Sold' : priceText(z)) + '</p>' +
      '<div class="acts"><button type="button" class="wall" data-wallroom="' + p.id + '">' + ICON.wall + 'View on a wall</button>' +
      (sold ? '' : '<a class="wall" href="' + orderLink(p, z) + '" target="_blank" rel="noopener">Order on WhatsApp</a>') +
      '</div></article>';
  }

  function logoHTML() {
    return '<a class="logo" href="/"><img src="/static/logo.png" width="613" height="245" alt="Tanya Streak Art, home"></a>';
  }

  var LS = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

  /* ---------- chrome ---------- */
  var NAV = [['/shop/', 'Shop'], ['/gallery/', 'Gallery'], ['/commissions/', 'Commissions'], ['/about/', 'About']];
  var DONE = '/commissions/completed/';
  var CARET = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1.5 3.5L5 7l3.5-3.5"/></svg>';
  function navLink(n, active) {
    return '<a href="' + n[0] + '"' + (active === n[0] ? ' aria-current="page"' : '') + '>' + n[1] + '</a>';
  }
  // "Commissions" becomes a small menu once there is at least one finished commission to show.
  function comNavHTML(active) {
    var cur = active === '/commissions/' || active === DONE;
    return '<div class="nav-drop">' +
      '<button type="button" class="nav-drop-btn' + (cur ? ' is-current' : '') + '" aria-expanded="false" aria-controls="nav-com">Commissions' + CARET + '</button>' +
      '<div class="nav-menu" id="nav-com">' +
        navLink(['/commissions/', 'Commission a painting'], active) + navLink([DONE, 'Completed commissions'], active) +
      '</div></div>';
  }
  function header(active) {
    var drop = LS.get('tsa_com') === '1';
    return '<a class="skip" href="#main">Skip to content</a>' +
      '<div class="announce">Collect in Durban North · Courier across South Africa</div>' +
      '<header class="site">' + logoHTML() +
      '<nav class="main" aria-label="Main">' + NAV.map(function (n) {
        return n[0] === '/commissions/' && drop ? comNavHTML(active) : navLink(n, active);
      }).join('') +
      '<a class="wa" href="' + waLink('Hi Tanya! I found your website and have a question.') + '" target="_blank" rel="noopener">' + ICON.wa + '<span>WhatsApp</span></a>' +
      '</nav></header>';
  }

  function subForm(id, source) {
    return '<form class="subform" id="' + id + '" data-source="' + source + '" novalidate>' +
      '<label class="sr" for="' + id + '-e">Your email</label>' +
      '<input class="field" type="email" id="' + id + '-e" name="email" autocomplete="email" inputmode="email" placeholder="Your email address" required>' +
      '<input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<button class="btn" type="submit">Join the list</button>' +
      '<p class="msg" role="status" aria-live="polite"></p>' +
      '</form>';
  }

  function footer() {
    return '<section class="signup band" aria-labelledby="sub-h"><div class="wrap">' +
      '<h2 id="sub-h">Be first to see new work</h2>' +
      '<p>New paintings, studio sales and when commissions open. A few emails a year, never spam.</p>' +
      subForm('sub-foot', 'footer') +
      '<small class="fine">Unsubscribe any time. Tanya never shares your address.</small></div></section>' +
      '<footer class="site"><div class="wrap">' + logoHTML() +
      '<nav class="links" aria-label="Footer">' + NAV.map(function (n) { return '<a href="' + n[0] + '">' + n[1] + '</a>'; }).join('') +
      '<a href="' + DONE + '" data-done hidden>Completed commissions</a>' +
      '<a href="' + IG + '" target="_blank" rel="noopener">Instagram</a></nav>' +
      '<p class="contact">WhatsApp <a href="' + waLink('Hi Tanya!') + '" target="_blank" rel="noopener">' + PHONE + '</a> · Durban North, KwaZulu-Natal</p>' +
      '<p class="copy">© ' + new Date().getFullYear() + ' Tanya Streak Art · <a href="/unsubscribe/">Unsubscribe</a></p>' +
      '</div></footer>' +
      '<a class="wa-float" href="' + waLink('Hi Tanya! I found your website and have a question.') + '" target="_blank" rel="noopener" aria-label="Message Tanya on WhatsApp">' + ICON.wa + '</a>';
  }

  var SYMBOLS = '<svg class="defs" aria-hidden="true" focusable="false">' +
    '<symbol id="wa" viewBox="0 0 24 24"><path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18.2a8.2 8.2 0 01-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1112 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 01-3.3-2.9c-.3-.4.3-.4.7-1.4a.5.5 0 000-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 00-.7.3 3 3 0 00-.9 2.2 5.2 5.2 0 001.1 2.7 11.8 11.8 0 004.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 001.8-1.2 2.2 2.2 0 00.1-1.2c0-.1-.2-.2-.5-.3z"/></symbol></svg>';

  /* ---------- email sign-up ---------- */
  function bindSubForms(root) {
    (root || document).querySelectorAll('form.subform').forEach(function (f) {
      if (f.dataset.bound) return; f.dataset.bound = '1';
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var msg = f.querySelector('.msg'), btn = f.querySelector('button[type=submit]'), email = f.email.value.trim();
        msg.className = 'msg';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { msg.className = 'msg bad'; msg.textContent = 'Please enter a full email address, like name@gmail.com.'; f.email.focus(); return; }
        btn.disabled = true; btn.textContent = 'Joining…';
        fetch('/api/subscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: email, website: f.website.value, source: f.dataset.source }) })
          .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
          .then(function (x) {
            if (!x.ok) throw new Error(x.d.error || 'Something went wrong.');
            LS.set('tsa_sub', '1');
            msg.className = 'msg ok'; msg.textContent = 'You’re on the list. Thank you!';
            f.email.value = ''; btn.textContent = 'Joined';
            if (f.closest('.overlay')) setTimeout(closePop, 2000);
          })
          .catch(function (err) {
            msg.className = 'msg bad'; msg.textContent = err.message === 'Failed to fetch' ? 'Couldn’t connect. Please check your internet and try again.' : err.message;
            btn.disabled = false; btn.textContent = 'Join the list';
          });
      });
    });
  }

  var pop = null, popLast = null;
  function closePop() {
    if (!pop) return;
    pop.classList.remove('open');
    LS.set('tsa_pop', String(Date.now()));
    var p = pop; pop = null;
    setTimeout(function () { p.remove(); }, 350);
    document.removeEventListener('keydown', popKeys);
    if (popLast && popLast.focus) popLast.focus({ preventScroll: true });
  }
  function popKeys(e) {
    if (e.key === 'Escape') closePop();
    if (e.key === 'Tab' && pop) {
      var f = pop.querySelectorAll('button, input:not(.hp), a[href]'), a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  }
  function showPop(cfg) {
    if (pop || document.querySelector('.wr[data-open="true"]')) return;
    popLast = document.activeElement;
    pop = document.createElement('div');
    pop.className = 'overlay';
    pop.innerHTML = '<div class="pop" role="dialog" aria-modal="true" aria-labelledby="pop-h">' +
      '<button type="button" class="close" aria-label="Close"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg></button>' +
      '<h2 id="pop-h">' + esc(cfg.popup_heading) + '</h2><p class="sub">' + esc(cfg.popup_text) + '</p>' + subForm('sub-pop', 'popup') +
      '<small class="fine">Unsubscribe any time.</small></div>';
    document.body.appendChild(pop);
    pop.querySelector('.close').addEventListener('click', closePop);
    pop.addEventListener('click', function (e) { if (e.target === pop) closePop(); });
    document.addEventListener('keydown', popKeys);
    bindSubForms(pop);
    requestAnimationFrame(function () { pop.classList.add('open'); pop.querySelector('input[type=email]').focus({ preventScroll: true }); });
  }
  // Shown once: after 15 s or half-way down a page, not again for 30 days after closing, never after joining.
  function schedulePop() {
    var force = /[?&]popup=1\b/.test(location.search);
    if (!force && (LS.get('tsa_sub') || /[?&]nopopup\b/.test(location.search))) return;
    if (!force && Date.now() - (+LS.get('tsa_pop') || 0) < 30 * 864e5) return;
    fetch('/api/settings').then(function (r) { return r.json(); }).then(function (cfg) {
      if (!cfg.popup_enabled && !force) return;
      if (force) return showPop(cfg);
      var fired = false;
      function fire() { if (fired) return; fired = true; window.removeEventListener('scroll', onScroll); showPop(cfg); }
      function onScroll() { if (window.scrollY > (document.body.scrollHeight - innerHeight) * .5 && window.scrollY > 600) fire(); }
      setTimeout(fire, 15000);
      window.addEventListener('scroll', onScroll, { passive: true });
    }).catch(function () {});
  }

  /* ---------- room previews on cards ---------- */
  function watchRooms(T) {
    if (!window.Rooms) return;
    var byId = {}; T.paintings.forEach(function (p) { byId[p.id] = p; });
    function scan(root) {
      (root.querySelectorAll ? root : document).querySelectorAll('.frame[data-pid]:not(.has-room)').forEach(function (f) {
        var p = byId[f.dataset.pid], img = f.querySelector('.mat img');
        if (p && img) Rooms.attach(f, p, img);
      });
    }
    scan(document);
    new MutationObserver(function (ms) { ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) scan(n); }); }); })
      .observe(document.body, { childList: true, subtree: true });
  }

  /* ---------- commissions menu ---------- */
  function bindDrop() {
    var d = document.querySelector('nav.main .nav-drop');
    if (!d || d.dataset.bound) return;
    d.dataset.bound = '1';
    var b = d.querySelector('.nav-drop-btn');
    function set(open) { d.classList.toggle('open', open); b.setAttribute('aria-expanded', String(open)); }
    b.addEventListener('click', function () { set(!d.classList.contains('open')); });
    document.addEventListener('click', function (e) { if (!d.contains(e.target)) set(false); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && d.classList.contains('open')) { set(false); b.focus(); } });
    d.addEventListener('focusout', function (e) { if (e.relatedTarget && !d.contains(e.relatedTarget)) set(false); });
  }
  // Match the menu to what's live (the first visit guesses from the last one, so there's rarely a jump).
  function syncCommissions(T, active) {
    var has = T.commissions.length > 0;
    LS.set('tsa_com', has ? '1' : '0');
    var nav = document.querySelector('nav.main'), drop = nav && nav.querySelector('.nav-drop');
    if (nav && has && !drop) {
      var a = nav.querySelector('a[href="/commissions/"]');
      if (a) a.outerHTML = comNavHTML(active);
    } else if (nav && !has && drop) {
      drop.outerHTML = navLink(['/commissions/', 'Commissions'], active);
    }
    bindDrop();
    var f = document.querySelector('footer.site [data-done]');
    if (f) f.hidden = !has;
  }

  /* ---------- completed commissions showcase (home + gallery) ----------
     A slow, endless strip of framed paintings. It eases to a stop under the mouse or keyboard focus, can be
     dragged or flicked, has a Pause button, and only fetches each photo as it is about to slide into view.
     With reduced motion it becomes a plain row you scroll yourself. */
  var PAUSE_I = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3.5" y="2.5" width="3" height="11" rx="1"/><rect x="9.5" y="2.5" width="3" height="11" rx="1"/></svg>';
  var PLAY_I = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 2.8v10.4a.8.8 0 0 0 1.2.7l8.4-5.2a.8.8 0 0 0 0-1.4L5.7 2.1a.8.8 0 0 0-1.2.7z"/></svg>';
  function showcase(el, list) {
    if (!el || !list || !list.length) return;
    var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var moving = !reduced && list.length > 2;
    function itemHTML(c, copy) {
      var im = c.images[0], ar = im.width && im.height ? im.width / im.height : 1;
      return '<a class="sc-item" href="' + c.url + '" draggable="false" style="--ar:' + ar.toFixed(4) + '"' + (copy ? ' aria-hidden="true" tabindex="-1"' : '') + '>' +
        '<span class="sc-art"><span class="sc-frame"><img ' + (moving ? 'data-src' : 'loading="lazy" src') + '="' + esc(im.md) + '" alt="" draggable="false" decoding="async"></span></span>' +
        '<span class="sc-t">' + esc(c.title) + '</span></a>';
    }
    // enough copies of the list to fill a wide screen, then the same again so the loop is seamless
    var est = list.reduce(function (s, c) { var im = c.images[0]; return s + Math.min(240 * (im.width / im.height || 1), 440) + 90; }, 0);
    var reps = moving ? Math.max(1, Math.ceil(innerWidth * 1.4 / est)) : 1, base = '';
    for (var r = 0; r < reps; r++) base += list.map(function (c) { return itemHTML(c, r > 0); }).join('');
    var copies = moving ? list.map(function (c) { return itemHTML(c, true); }).join('').repeat(reps) : '';

    el.innerHTML =
      '<div class="wrap section-head"><h2 id="sc-h">Completed commissions</h2><p>Paintings that have found their homes. Tap one to see it up close.</p></div>' +
      '<div class="sc' + (moving ? '' : ' is-static') + '"><div class="sc-track">' + base + copies + '</div></div>' +
      '<div class="wrap sc-foot">' +
        (moving ? '<button type="button" class="sc-toggle" aria-label="Pause the moving paintings">' + PAUSE_I + '<span>Pause</span></button>' : '') +
        '<a class="btn ghost" href="/commissions/completed/">See all completed commissions</a></div>';
    el.setAttribute('aria-labelledby', 'sc-h');
    el.hidden = false;
    if (!moving) return;

    var vp = el.querySelector('.sc'), track = el.querySelector('.sc-track'), btn = el.querySelector('.sc-toggle');
    var items = [].slice.call(track.children), m = items.length / 2;
    var period = 0, offs = [], vw = 0, x = 0, v = 0, fling = 0, raf = 0, last = 0, lastLoad = 0;
    var SPEED = innerWidth < 761 ? 26 : 34;  // px per second
    var paused = false, hover = false, focus = false, drag = null, visible = false, justDragged = false;

    function measure() {
      period = items[m].offsetLeft - items[0].offsetLeft;
      vw = vp.clientWidth;
      offs = items.map(function (it) { return [it.offsetLeft, it.offsetWidth]; });
    }
    function wrap() { x = ((x % period) - period) % period; }  // keep x in (-period, 0]
    function loadNear() {
      items.forEach(function (it, i) {
        var img = it.querySelector('img[data-src]'); if (!img) return;
        var left = offs[i][0] + x;
        if (left < vw * 2 && left + offs[i][1] > -vw * 0.5) { img.src = img.dataset.src; img.removeAttribute('data-src'); }
      });
    }
    function frame(t) {
      var dt = last ? Math.min(0.05, (t - last) / 1000) : 0; last = t;
      if (!drag) {
        if (Math.abs(fling) > 8) { x += fling * dt; fling *= Math.pow(0.04, dt); }
        else {
          fling = 0;
          var target = paused || hover || focus ? 0 : SPEED;
          v += (target - v) * Math.min(1, dt * 3);  // ease to a stop or back up to speed
          x -= v * dt;
        }
      }
      wrap();
      track.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
      if (t - lastLoad > 250) { lastLoad = t; loadNear(); }
      raf = visible ? requestAnimationFrame(frame) : 0;
    }
    function start() { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }

    measure();
    // nothing is fetched or animated until the strip is about to scroll into view
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (visible) { loadNear(); start(); }
    }, { rootMargin: '500px 0px' }).observe(vp);
    var rt; addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { measure(); wrap(); loadNear(); }, 150); });

    btn.addEventListener('click', function () {
      paused = !paused;
      btn.innerHTML = (paused ? PLAY_I : PAUSE_I) + '<span>' + (paused ? 'Play' : 'Pause') + '</span>';
      btn.setAttribute('aria-label', (paused ? 'Play' : 'Pause') + ' the moving paintings');
    });
    vp.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') hover = true; });
    vp.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') hover = false; });
    // keyboard: stop, and bring the focused painting into view
    vp.addEventListener('focusin', function (e) {
      focus = true;
      var i = items.indexOf(e.target.closest('.sc-item')); if (i < 0) return;
      var left = offs[i][0] + x;
      if (left < 40 || left + offs[i][1] > vw - 40) { x = -(offs[i][0] - (vw - offs[i][1]) / 2); wrap(); loadNear(); }
    });
    vp.addEventListener('focusout', function () { focus = false; });

    // drag or flick it along (a sideways move; up-and-down still scrolls the page)
    vp.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      drag = null; fling = 0;
      var sx = e.clientX, sy = e.clientY, x0 = x, lx = sx, lt = performance.now(), vel = 0, id = e.pointerId;
      function move(ev) {
        if (ev.pointerId !== id) return;
        var dx = ev.clientX - sx;
        if (!drag) {
          if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(ev.clientY - sy)) return;
          drag = true; vp.classList.add('is-drag');
          try { vp.setPointerCapture(id); } catch (err) {}
        }
        var now = performance.now(), dt = Math.max(1, now - lt);
        vel = vel * 0.6 + ((ev.clientX - lx) / dt * 1000) * 0.4; lx = ev.clientX; lt = now;
        x = x0 + dx; wrap(); x0 = x - dx;
      }
      function up(ev) {
        if (ev.pointerId !== id) return;
        removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
        if (drag) {
          justDragged = true; setTimeout(function () { justDragged = false; }, 0);
          fling = performance.now() - lt < 80 ? Math.max(-2400, Math.min(2400, vel)) : 0;
          v = 0;
        }
        drag = null; vp.classList.remove('is-drag');
      }
      addEventListener('pointermove', move); addEventListener('pointerup', up); addEventListener('pointercancel', up);
    });
    vp.addEventListener('click', function (e) { if (justDragged) { e.preventDefault(); e.stopPropagation(); } }, true);
    vp.addEventListener('dragstart', function (e) { e.preventDefault(); });
  }

  /* ---------- boot ---------- */
  function boot(active) {
    document.body.insertAdjacentHTML('afterbegin', SYMBOLS);
    var h = document.getElementById('site-header'), f = document.getElementById('site-footer');
    if (h) h.outerHTML = header(active);
    if (f) f.outerHTML = footer();
    bindDrop();
    bindSubForms();
    schedulePop();
    document.querySelectorAll('[data-wa]').forEach(function (a) { a.href = waLink(a.dataset.wa); a.target = '_blank'; a.rel = 'noopener'; });
    return load().then(function (T) {
      syncCommissions(T, active);
      Wallroom.init({ base: '', wallName: 'Blush white', frame: 'timber', frameName: 'Timber & mat' });
      watchRooms(T);
      return T;
    });
  }

  window.Site = {
    boot: boot, load: load, esc: esc, rand: rand, num: num, dims: dims, waLink: waLink, phone: PHONE, instagram: IG,
    cardHTML: cardHTML, icon: ICON, bindSubForms: bindSubForms, showcase: showcase,
    sizesFor: sizesFor, priceText: priceText, orderLink: orderLink, similarLink: similarLink
  };
})();
