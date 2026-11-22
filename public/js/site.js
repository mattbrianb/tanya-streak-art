/* Tanya Streak Art: shared site script (Blush & Linen).
   Loads live paintings from /api, renders the header, footer, painting cards, sign-up forms
   and pop-up, and feeds the Wallroom. */
(function () {
  // Contact details and the top strip: Tanya sets them in Portal > Website words (served as SITE_CFG).
  var CFG = window.SITE_CFG || {};
  var WHATSAPP = CFG.wa || '27792763413', PHONE = CFG.phone || '079 276 3413',
    IG = CFG.instagram || 'https://www.instagram.com/tanyastreakart/', FB = CFG.facebook || 'https://www.facebook.com/tanyastreakart',
    PLACE = CFG.location || 'Durban North, KwaZulu-Natal', ANNOUNCE = CFG.announce || 'Collect in Durban North · Courier across South Africa';

  /* ---------- formatting & links ---------- */
  function rand(n) { return 'R' + Math.round(n).toLocaleString('en-ZA').replace(/\s| /g, ','); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(n) { return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10); }
  function waLink(text) { return 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(text); }

  /* ---------- data ---------- */
  function shape(p) {
    var cover = p.images[0] || {}, w = p.width_cm, h = p.height_cm;
    // Width and height typed the wrong way round (a landscape photo entered as 18 × 24, say):
    // the photo shows which way the painting really sits, so follow it.
    var pr = cover.width && cover.height ? cover.width / cover.height : 0;
    if (w && h && pr && ((pr > 1.08 && w < h) || (pr < 0.92 && w > h))) { var t = w; w = h; h = t; }
    var ratio = w && h ? w / h : (pr || 1);
    return {
      id: p.slug, dbId: p.id, title: p.title, medium: p.medium, description: p.description,
      blurb: (p.description || '').split(/(?<=[.!?])\s/)[0],
      status: p.status, price: p.price, w: w, h: h, ratio: ratio,
      images: p.images, url: '/painting/' + p.slug, christmas: !!p.christmas, created: p.created_at,
      room: p.room || null, wall: p.wall || null, frame: p.frame || null
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
        christmas: d.christmas || { on: false }, feature: d.feature || null,
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
    ig: '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#ig"/></svg>',
    fb: '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#fb"/></svg>',
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
      '<div class="announce">' + esc(ANNOUNCE) + '</div>' +
      '<header class="site">' + logoHTML() +
      '<nav class="main" aria-label="Main">' + NAV.map(function (n) {
        return n[0] === '/commissions/' && drop ? comNavHTML(active) : navLink(n, active);
      }).join('') +
      (LS.get('tsa_xmas') === '1' ? xmasNavHTML() : '') +
      '<a class="wa" href="' + waLink('Hi Tanya! I found your website and have a question.') + '" target="_blank" rel="noopener">' + ICON.wa + '<span>WhatsApp</span></a>' +
      '<span class="social">' + socialLinks('') + '</span>' +
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
      '<a href="' + DONE + '" data-done hidden>Completed commissions</a></nav>' +
      '<div class="follow"><p>Follow Tanya for new work and studio news</p><div class="follow-links">' + socialLinks('labels') + '</div></div>' +
      '<p class="contact">WhatsApp <a href="' + waLink('Hi Tanya!') + '" target="_blank" rel="noopener">' + PHONE + '</a> · ' + esc(PLACE) + '</p>' +
      '<p class="copy">© ' + new Date().getFullYear() + ' Tanya Streak Art · <a href="/unsubscribe/">Unsubscribe</a></p>' +
      '</div></footer>' +
      '<a class="wa-float" href="' + waLink('Hi Tanya! I found your website and have a question.') + '" target="_blank" rel="noopener" aria-label="Message Tanya on WhatsApp">' + ICON.wa + '</a>';
  }

  // Instagram + Facebook. With labels in the footer; icon-only (named for screen readers) in the header.
  function socialLinks(labels) {
    return [[IG, 'ig', 'Instagram'], [FB, 'fb', 'Facebook']].map(function (s) {
      return '<a class="soc soc-' + s[1] + '" href="' + s[0] + '" target="_blank" rel="noopener"' + (labels ? '' : ' aria-label="Tanya on ' + s[2] + '" title="' + s[2] + '"') + '>' +
        ICON[s[1]] + (labels ? '<span>' + s[2] + '</span>' : '') + '</a>';
    }).join('');
  }

  var SYMBOLS = '<svg class="defs" aria-hidden="true" focusable="false">' +
    '<symbol id="wa" viewBox="0 0 24 24"><path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18.2a8.2 8.2 0 01-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1112 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 01-3.3-2.9c-.3-.4.3-.4.7-1.4a.5.5 0 000-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 00-.7.3 3 3 0 00-.9 2.2 5.2 5.2 0 001.1 2.7 11.8 11.8 0 004.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 001.8-1.2 2.2 2.2 0 00.1-1.2c0-.1-.2-.2-.5-.3z"/></symbol>' +
    '<symbol id="ig" viewBox="0 0 24 24"><path d="M7.8 2h8.4A5.8 5.8 0 0122 7.8v8.4a5.8 5.8 0 01-5.8 5.8H7.8A5.8 5.8 0 012 16.2V7.8A5.8 5.8 0 017.8 2zm0 1.9A3.9 3.9 0 003.9 7.8v8.4a3.9 3.9 0 003.9 3.9h8.4a3.9 3.9 0 003.9-3.9V7.8a3.9 3.9 0 00-3.9-3.9H7.8zM12 7a5 5 0 110 10 5 5 0 010-10zm0 1.9a3.1 3.1 0 100 6.2 3.1 3.1 0 000-6.2zm5.3-3.4a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"/></symbol>' +
    '<symbol id="fb" viewBox="0 0 24 24"><path d="M22 12a10 10 0 10-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7A10 10 0 0022 12z"/></symbol></svg>';

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

  /* ---------- Christmas collection ----------
     While Tanya has the collection switched on, the header gets a "Christmas" link and the home page
     shows the minis gift-wrapped at the top, unwrapping one by one as they come into view. */
  var STAR = '<svg class="star" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 .8l1.55 4.6a1.6 1.6 0 0 0 1.05 1.05L15.2 8l-4.6 1.55a1.6 1.6 0 0 0-1.05 1.05L8 15.2l-1.55-4.6a1.6 1.6 0 0 0-1.05-1.05L.8 8l4.6-1.55A1.6 1.6 0 0 0 6.45 5.4z"/></svg>';
  function xmasNavHTML() { return '<a class="nav-xmas" href="/#christmas">' + STAR + '<span>Christmas</span></a>'; }
  function syncChristmas(T) {
    var on = !!(T.christmas && T.christmas.on && (T.paintings.some(function (p) { return p.christmas; }) || T.christmas.wrapped));
    LS.set('tsa_xmas', on ? '1' : '0');
    var nav = document.querySelector('nav.main'), a = nav && nav.querySelector('.nav-xmas');
    if (nav && on && !a) { var wa = nav.querySelector('a.wa'); wa ? wa.insertAdjacentHTML('beforebegin', xmasNavHTML()) : nav.insertAdjacentHTML('beforeend', xmasNavHTML()); }
    else if (a && !on) a.remove();
    T.christmasOn = on;
  }
  function dayLabel(iso) {
    var d = new Date(iso), opts = { timeZone: 'Africa/Johannesburg' };
    var day = d.toLocaleDateString('en-ZA', Object.assign({ weekday: 'long', day: 'numeric', month: 'long' }, opts));
    var t = d.toLocaleTimeString('en-ZA', Object.assign({ hour: 'numeric', minute: '2-digit', hour12: true }, opts)).replace(':00', '').replace(/\s/g, '').toLowerCase();
    return day.replace(',', '') + ', ' + t;
  }
  var BOW = '<svg class="xg-bow" viewBox="0 0 66 40" aria-hidden="true"><path d="M33 20C22 4 4 2 4 12s16 12 29 8zM33 20c11-16 29-18 29-8s-16 12-29 8z"/><path d="M28 15h10v10H28zM30 24l-9 15 6-2 6 2zM36 24l9 15-6-2-6 2z"/></svg>';
  function wrapHTML() { return '<span class="xg-paper l"></span><span class="xg-paper r"></span><span class="xg-rib v"></span><span class="xg-rib h"></span>' + BOW; }
  // el: the empty <section id="christmas">. Returns true when it was filled.
  function christmas(el, T) {
    var X = T.christmas || {};
    var L = T.paintings.filter(function (p) { return p.christmas; });
    if (!T.christmasOn || !el) return false;
    var newest = L.slice().sort(function (a, b) { return a.created < b.created ? 1 : -1; }).slice(0, 2).map(function (p) { return p.id; });
    var gifts = L.map(function (p) {
      var sold = p.status === 'sold', z = sizesFor(p)[0], img = p.images[0];
      var ar = img && img.width && img.height ? img.width / img.height : (p.ratio || .75), h = p.h || 21;
      return '<article class="xg-gift" style="--h:' + h + ';--w:' + (h * ar).toFixed(2) + ';--ar:' + ar.toFixed(4) + '">' +
        '<a class="xg-box" href="' + p.url + '" aria-label="' + esc(p.title) + '"><img src="' + esc(imgSrc(p, 'md')) + '" alt="' + esc(p.title) + ', ' + esc(p.medium.toLowerCase()) + ', by Tanya Streak" loading="lazy">' + wrapHTML() + '</a>' +
        '<div class="xg-txt"><h3><a href="' + p.url + '">' + esc(p.title) + '</a>' + (newest.indexOf(p.id) > -1 && !sold ? ' <span class="tag-new">' + STAR + 'New</span>' : '') + '</h3>' +
        '<p class="m">' + esc(p.medium) + (p.w ? ' · ' + esc(z.dims) : '') + '</p>' +
        '<p class="p' + (sold ? ' sold' : '') + '">' + (sold ? 'Sold' : priceText(z)) + '</p>' +
        '<div class="acts">' + (sold ? '' : '<a class="btn" href="' + orderLink(p, z) + '" target="_blank" rel="noopener">' + ICON.wa + 'Order</a>') +
        '<button type="button" class="btn ghost" data-wallroom="' + p.id + '">' + ICON.wall + 'On a wall</button></div></div></article>';
    });
    var waiting = Math.min(X.wrapped || 0, 3);
    for (var i = 0; i < waiting; i++) {
      gifts.push('<article class="xg-gift soon" style="--h:20;--w:15;--ar:.75"><div class="xg-box" role="img" aria-label="A wrapped painting, opening ' + esc(dayLabel(X.opens)) + '"><span class="xg-under"></span>' + wrapHTML() +
        '<span class="xg-tagline">Opens ' + esc(dayLabel(X.opens)) + '</span></div>' +
        (i === 0 ? '<div class="xg-txt"><h3>Still under wraps</h3><p class="m">' + (waiting > 1 ? waiting + ' more minis open' : 'The next mini opens') + ' at the next drop</p></div>' : '') + '</article>');
    }
    el.innerHTML = '<canvas class="xg-fx" aria-hidden="true"></canvas><svg class="xg-string" aria-hidden="true"></svg>' +
      '<div class="wrap xg-head"><h1 id="xg-h">' + esc(X.title) + '</h1>' + (X.text ? '<p>' + esc(X.text) + '</p>' : '') + '</div>' +
      '<div class="wrap xg-grid">' + gifts.join('') + '</div>';
    el.setAttribute('aria-labelledby', 'xg-h');
    el.hidden = false;
    var opened = [].slice.call(el.querySelectorAll('.xg-gift:not(.soon)'));
    var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    stringLights(el.querySelector('.xg-string'));
    var fx = sparkle(el, el.querySelector('.xg-fx'), still);
    function open() {
      opened.forEach(function (g, i) {
        setTimeout(function () { g.classList.add('open'); fx.burst(g.querySelector('.xg-box')); }, still ? 0 : 350 + i * 480);
      });
    }
    if (!('IntersectionObserver' in window)) open();
    else { var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { open(); io.disconnect(); } }, { threshold: .3 }); io.observe(el.querySelector('.xg-grid')); }
    return true;
  }

  /* Fairy lights draped across the top of the Christmas section, in swags, each bulb twinkling on its own. */
  function stringLights(svg) {
    var W = 1440, H = 120, swags = 4, d = 'M-20 14', i, out = '';
    for (i = 0; i < swags; i++) { var a = -20 + i * (W + 40) / swags, b = a + (W + 40) / swags; d += ' Q' + (a + b) / 2 + ' ' + (70 + (i % 2) * 12) + ' ' + b + ' 14'; }
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('preserveAspectRatio', 'xMidYMin slice');
    svg.innerHTML = '<defs><radialGradient id="xgb"><stop offset="0" stop-color="#FFF6DD"/><stop offset=".3" stop-color="#F7CF84"/><stop offset=".6" stop-color="rgba(246,190,110,.3)"/><stop offset="1" stop-color="rgba(246,190,110,0)"/></radialGradient></defs><path class="wire" d="' + d + '"/>';
    var path = svg.querySelector('path'), len = path.getTotalLength(), n = 38;
    for (i = 1; i < n; i++) {
      var q = path.getPointAtLength(len * i / n);
      out += '<g><rect class="cap" x="' + (q.x - 2.5).toFixed(1) + '" y="' + (q.y - 1).toFixed(1) + '" width="5" height="6" rx="1"/>' +
        '<ellipse class="glow" cx="' + q.x.toFixed(1) + '" cy="' + (q.y + 10).toFixed(1) + '" rx="12" ry="14" fill="url(#xgb)" style="--d:' + (.2 + i * .035).toFixed(2) + 's;--d2:' + (1.6 + Math.random() * 2.4).toFixed(2) + 's;--tw:' + (2 + Math.random() * 2.6).toFixed(2) + 's"/></g>';
    }
    svg.insertAdjacentHTML('beforeend', out);
    requestAnimationFrame(function () { svg.classList.add('lit'); });
  }

  /* Soft golden lights drifting up behind the presents, and a burst of gold sparkles when one opens.
     One canvas for both; it sleeps when the section is off screen or the tab is hidden. Reduced motion:
     the lights are drawn once and stay still, and there is no burst. */
  function sparkle(section, cv, still) {
    var ctx = cv.getContext('2d'), dpr = Math.min(window.devicePixelRatio || 1, 2), W = 0, H = 0, raf = 0, seen = true;
    var dots = [], bits = [], small = innerWidth < 760;
    for (var i = 0; i < (small ? 12 : 22); i++) dots.push({ x: Math.random(), y: Math.random(), r: 8 + Math.pow(Math.random(), 2) * (small ? 24 : 38), a: .16 + Math.random() * .26, s: .4 + Math.random() * .8, p: Math.random() * 6.3, v: .004 + Math.random() * .01 });
    function size() { var b = cv.getBoundingClientRect(); W = b.width; H = b.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); if (still) draw(0, 0); }
    function star(x, y, r, rot) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.beginPath();
      for (var k = 0; k < 8; k++) { var rr = k % 2 ? r * .38 : r, t = k * Math.PI / 4; ctx.lineTo(Math.cos(t) * rr, Math.sin(t) * rr); }
      ctx.closePath(); ctx.fill(); ctx.restore();
    }
    var last = 0;
    function draw(now, dt) {
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
      for (var i = 0; i < dots.length; i++) {
        var d = dots[i];
        if (!still) { d.y -= d.v * dt / 1000; if (d.y < -.1) { d.y = 1.08; d.x = Math.random(); } }
        var tw = still ? 1 : .7 + .3 * Math.sin(now / 1000 * d.s + d.p), x = d.x * W, y = d.y * H, a = d.a * tw;
        var g = ctx.createRadialGradient(x, y, 0, x, y, d.r);
        g.addColorStop(0, 'rgba(255,236,190,' + a + ')'); g.addColorStop(.45, 'rgba(244,201,120,' + a * .55 + ')'); g.addColorStop(1, 'rgba(244,190,110,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, d.r, 0, 6.283); ctx.fill();
      }
      for (var j = bits.length - 1; j >= 0; j--) {
        var b = bits[j]; b.t += dt / 1000;
        if (b.t > b.life) { bits.splice(j, 1); continue; }
        b.vy += 260 * dt / 1000; b.vx *= .98; b.x += b.vx * dt / 1000; b.y += b.vy * dt / 1000; b.rot += b.spin * dt / 1000;
        ctx.globalAlpha = Math.max(0, 1 - Math.pow(b.t / b.life, 2)); ctx.fillStyle = b.c; ctx.shadowColor = 'rgba(255,214,140,.9)'; ctx.shadowBlur = 10;
        if (b.star) star(b.x, b.y, b.r, b.rot); else { ctx.beginPath(); ctx.arc(b.x, b.y, b.r * .5, 0, 6.283); ctx.fill(); }
      }
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    }
    function loop(now) {
      var dt = last ? Math.min(50, now - last) : 16; last = now;
      draw(now, dt);
      raf = seen && !document.hidden ? requestAnimationFrame(loop) : (last = 0, 0);
    }
    function wake() { if (!still && !raf && seen && !document.hidden) raf = requestAnimationFrame(loop); }
    size();
    if ('ResizeObserver' in window) new ResizeObserver(size).observe(cv);
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { seen = e[0].isIntersecting; wake(); }).observe(section);
    document.addEventListener('visibilitychange', wake);
    wake();
    var COLORS = ['#E8C06A', '#F4D58C', '#C9962F', '#FFF1CF', '#B9716A'];
    return {
      burst: function (box) {
        if (still || !box) return;
        var a = box.getBoundingClientRect(), c = cv.getBoundingClientRect();
        var x = a.left - c.left + a.width / 2, y = a.top - c.top + a.height * .44;
        for (var k = 0; k < 44; k++) {
          var ang = -Math.PI / 2 + (Math.random() - .5) * Math.PI * 1.6, sp = 180 + Math.random() * 320;
          bits.push({ x: x, y: y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: 5 + Math.random() * 7, t: 0, life: 1.3 + Math.random() * .9,
            c: COLORS[k % COLORS.length], star: k % 3 !== 0, rot: Math.random() * 3, spin: (Math.random() - .5) * 8 });
        }
        wake();
      }
    };
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
      syncChristmas(T);
      Wallroom.init({ base: '', wallName: 'Blush white', frame: 'timber', frameName: 'Timber & mat' });
      watchRooms(T);
      return T;
    });
  }

  window.Site = {
    boot: boot, load: load, esc: esc, rand: rand, num: num, dims: dims, waLink: waLink, phone: PHONE, instagram: IG, facebook: FB,
    cardHTML: cardHTML, christmas: christmas, icon: ICON, bindSubForms: bindSubForms, showcase: showcase,
    sizesFor: sizesFor, priceText: priceText, orderLink: orderLink, similarLink: similarLink
  };
})();
