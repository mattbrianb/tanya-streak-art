/* Tanya Streak Art: owner portal. Vanilla JS, hash routes, no build step. */
(() => {
  'use strict';

  // ---------- Small helpers ----------

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const app = $('#app');
  const bar = $('#bar');
  const toastsEl = $('#toasts');

  const NET = "Couldn't reach the website. Check your internet and try again.";
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MEDIUMS = ['Oil on canvas', 'Oil on canvas board', 'Oil on panel board', 'Acrylic on canvas', 'Mixed media on canvas'];
  const STATUS = {
    available: { label: 'For sale', cls: 'pill-sale' },
    sold: { label: 'Sold', cls: 'pill-sold' },
    hidden: { label: 'Hidden', cls: 'pill-hidden' }
  };
  const MAX_PHOTOS = 12;

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const commas = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const money = n => (n === null || n === undefined || n === '') ? 'Price on request' : 'R' + commas(Math.round(Number(n)));
  const cm = n => String(Math.round(Number(n) * 10) / 10);
  const sizeText = p => (p.width_cm && p.height_cm) ? `${cm(p.width_cm)} × ${cm(p.height_cm)} cm` : '';
  const plural = (n, one, many) => `${commas(n)} ${n === 1 ? one : many}`;
  let uidN = 0;
  const uid = () => 'k' + (++uidN);

  function parseDate(s) {
    if (!s) return null;
    const d = new Date(/[T]/.test(s) ? s : String(s).replace(' ', 'T') + 'Z');
    return isNaN(d) ? null : d;
  }
  const niceDate = s => { const d = parseDate(s); return d ? `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` : ''; };

  const store = {
    get(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch { /* private mode */ } },
    del(k) { try { sessionStorage.removeItem(k); } catch { /* private mode */ } }
  };

  // ---------- Icons ----------

  const svg = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" ${extra}>${d}</svg>`;
  const XSTAR = '<svg class="xm-star" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 .8l1.55 4.6a1.6 1.6 0 0 0 1.05 1.05L15.2 8l-4.6 1.55a1.6 1.6 0 0 0-1.05 1.05L8 15.2l-1.55-4.6a1.6 1.6 0 0 0-1.05-1.05L.8 8l4.6-1.55A1.6 1.6 0 0 0 6.45 5.4z"/></svg>';
  // 'YYYY-MM-DDTHH:MM' in Durban time → "Friday 20 November, 7pm"
  function dropLabel(local) {
    const [d, t] = local.split('T'), [y, mo, da] = d.split('-').map(Number), [h, mi] = t.split(':').map(Number);
    const day = new Date(Date.UTC(y, mo - 1, da)).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).replace(',', '');
    return `${day}, ${(h % 12) || 12}${mi ? ':' + String(mi).padStart(2, '0') : ''}${h < 12 ? 'am' : 'pm'}`;
  }
  const I = {
    back: svg('<path d="m15 18-6-6 6-6"/>'),
    chev: svg('<path d="m9 18 6-6-6-6"/>', 'class="chev"'),
    plus: svg('<path d="M12 5v14M5 12h14"/>'),
    camera: svg('<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3.5"/>'),
    frame: svg('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>'),
    people: svg('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>'),
    gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'),
    globe: svg('<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>'),
    external: svg('<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>'),
    trash: svg('<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/>'),
    check: svg('<path d="M20 6 9 17l-5-5"/>'),
    copy: svg('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'),
    download: svg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>'),
    alert: svg('<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>'),
    x: svg('<path d="M18 6 6 18M6 6l12 12"/>'),
    mail: svg('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>'),
    book: svg('<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>')
  };

  // ---------- Talking to the website ----------

  class AuthError extends Error {}

  async function handle(status, readBody, path) {
    let data = null;
    try { data = await readBody(); } catch { /* not JSON */ }
    if (status === 401 && path !== '/api/login') { toLogin(); throw new AuthError('Please sign in again.'); }
    if (status < 200 || status >= 300) {
      const e = new Error((data && data.error) || (status >= 500
        ? 'Something went wrong on the website. Please try again in a minute.'
        : 'Something went wrong. Please try again.'));
      e.status = status;
      throw e;
    }
    return data || {};
  }

  async function api(method, path, body) {
    const opts = { method, credentials: 'same-origin', headers: { Accept: 'application/json' }, cache: 'no-store' };
    if (method !== 'GET') opts.headers['X-Requested-With'] = 'portal';
    if (body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    let res;
    try { res = await fetch(path, opts); } catch { throw new Error(NET); }
    return handle(res.status, () => res.json(), path);
  }

  // Upload with progress (fetch can't report upload progress).
  function upload(path, formData, onProgress) {
    return new Promise((resolve, reject) => {
      const x = new XMLHttpRequest();
      x.open('POST', path);
      x.withCredentials = true;
      x.setRequestHeader('X-Requested-With', 'portal');
      x.setRequestHeader('Accept', 'application/json');
      x.timeout = 180000;
      x.upload.onprogress = e => { if (e.lengthComputable) onProgress(Math.min(99, Math.round(e.loaded / e.total * 100))); };
      x.onload = () => handle(x.status, async () => JSON.parse(x.responseText), path).then(resolve, reject);
      x.onerror = x.ontimeout = x.onabort = () => reject(new Error(NET));
      x.send(formData);
    });
  }

  const quiet = e => e instanceof AuthError;

  // ---------- Photo resizing (in the browser, before upload) ----------

  async function decodeImage(file) {
    if (typeof createImageBitmap === 'function') {
      try {
        const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
        return { src: bmp, w: bmp.width, h: bmp.height, done: () => bmp.close && bmp.close() };
      } catch { /* fall back below */ }
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    try {
      if (img.decode) await img.decode();
      else await new Promise((ok, bad) => { img.onload = ok; img.onerror = bad; });
    } catch (e) { URL.revokeObjectURL(url); throw e; }
    // Browsers apply the photo's EXIF rotation to <img> by default.
    return { src: img, w: img.naturalWidth, h: img.naturalHeight, done: () => URL.revokeObjectURL(url) };
  }

  function drawScaled(src, sw, sh, maxEdge) {
    const scale = Math.min(1, maxEdge / Math.max(sw, sh));
    const w = Math.max(1, Math.round(sw * scale)), h = Math.max(1, Math.round(sh * scale));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(src, 0, 0, w, h);
    return c;
  }

  const canvasToJpeg = (c, q) => new Promise((ok, bad) =>
    c.toBlob(b => (b ? ok(b) : bad(new Error('Could not make the photo.'))), 'image/jpeg', q));

  async function resizePhoto(file) {
    const { src, w, h, done } = await decodeImage(file);
    try {
      if (!w || !h) throw new Error('empty');
      const lg = drawScaled(src, w, h, 2000);
      const md = drawScaled(lg, lg.width, lg.height, 1000);
      const width = lg.width, height = lg.height;
      const [lgBlob, mdBlob] = await Promise.all([canvasToJpeg(lg, 0.85), canvasToJpeg(md, 0.82)]);
      lg.width = lg.height = md.width = md.height = 0; // free memory on phones
      return { lg: lgBlob, md: mdBlob, width, height };
    } finally { done(); }
  }

  // ---------- Toasts ----------

  let toastTimer = null;
  function hideToast() { clearTimeout(toastTimer); toastsEl.innerHTML = ''; }
  function toast(msg, { action, onAction, error, ms } = {}) {
    clearTimeout(toastTimer);
    toastsEl.innerHTML = `<div class="toast${error ? ' toast-error' : ''}">
      <span class="toast-msg">${esc(msg)}</span>
      ${action ? `<button type="button" class="toast-btn">${esc(action)}</button>` : ''}
      <button type="button" class="toast-x" aria-label="Close message">${I.x}</button>
    </div>`;
    const el = toastsEl.firstElementChild;
    const start = () => { clearTimeout(toastTimer); toastTimer = setTimeout(hideToast, ms || (action ? 8000 : error ? 7000 : 4000)); };
    $('.toast-x', el).addEventListener('click', hideToast);
    if (action) $('.toast-btn', el).addEventListener('click', () => { hideToast(); onAction(); });
    el.addEventListener('focusin', () => clearTimeout(toastTimer));
    el.addEventListener('focusout', start);
    el.addEventListener('pointerenter', () => clearTimeout(toastTimer));
    el.addEventListener('pointerleave', start);
    start();
  }

  // ---------- Confirm dialog ----------

  const dlg = $('#dialog');
  function confirmBox({ title, body = '', ok = 'OK', cancel = 'Cancel', danger = false }) {
    if (!dlg || typeof dlg.showModal !== 'function') {
      return Promise.resolve(window.confirm(body ? `${title}\n\n${body}` : title));
    }
    const opener = document.activeElement;
    $('#dlg-title').textContent = title;
    $('#dlg-body').textContent = body;
    $('#dlg-body').hidden = !body;
    const okBtn = $('#dlg-ok'), cancelBtn = $('#dlg-cancel');
    okBtn.textContent = ok;
    cancelBtn.textContent = cancel;
    okBtn.className = 'btn ' + (danger ? 'btn-danger-solid' : 'btn-primary');
    dlg.returnValue = '';
    dlg.showModal();
    (danger ? cancelBtn : okBtn).focus();
    // Resolve straight from the button clicks rather than waiting for the
    // dialog's own 'close' event, which some browsers deliver late.
    return new Promise(resolve => {
      let settled = false;
      const finish = yes => {
        if (settled) return;
        settled = true;
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
        dlg.removeEventListener('cancel', onCancel);
        dlg.removeEventListener('close', onClose);
        if (dlg.open) dlg.close(yes ? 'ok' : 'cancel');
        if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
        resolve(yes);
      };
      const onOk = e => { e.preventDefault(); finish(true); };
      const onCancel = e => { e.preventDefault(); finish(false); };
      const onClose = () => finish(dlg.returnValue === 'ok');
      okBtn.addEventListener('click', onOk);
      cancelBtn.addEventListener('click', onCancel);
      dlg.addEventListener('cancel', onCancel);
      dlg.addEventListener('close', onClose);
    });
  }

  // ---------- Router ----------

  let current = location.hash || '#/';
  let guard = null;        // returns a message when leaving would lose something
  let renderId = 0;
  let firstRender = true;
  let meCache = null;

  const routes = [
    [/^#\/login$/, viewLogin],
    [/^(#\/?)?$/, viewHome],
    [/^#\/paintings$/, viewPaintings],
    [/^#\/paintings\/new$/, viewEditor],
    [/^#\/paintings\/(\d+)$/, viewEditor],
    [/^#\/commissions$/, viewCommissions],
    [/^#\/commissions\/new$/, viewCommissionEditor],
    [/^#\/commissions\/(\d+)$/, viewCommissionEditor],
    [/^#\/subscribers$/, viewSubscribers],
    [/^#\/settings$/, viewSettings]
  ];

  function go(hash) {
    if (location.hash === hash) route();
    else location.hash = hash;
  }

  function toLogin() {
    const h = location.hash || '#/';
    if (/^#\/login/.test(h)) return;
    store.set('tsa_return', h);
    guard = null;
    location.hash = '#/login';
  }

  function route() {
    current = location.hash || '#/';
    guard = null;
    document.body.classList.remove('has-savebar');
    const id = ++renderId;
    const alive = () => id === renderId;
    let match = null, view = null;
    for (const [re, fn] of routes) { match = current.match(re); if (match) { view = fn; break; } }
    if (!view) { location.replace('#/'); return; }
    window.scrollTo(0, 0);
    view(match, alive);
  }

  window.addEventListener('hashchange', async () => {
    const target = location.hash || '#/';
    if (target === current) return;
    const msg = guard && guard();
    if (msg) {
      history.replaceState(null, '', current);
      const leave = await confirmBox({ title: 'Leave without saving?', body: msg, ok: 'Leave without saving', cancel: 'Keep editing', danger: true });
      if (leave) { guard = null; location.hash = target; }
      return;
    }
    route();
  });

  window.addEventListener('beforeunload', e => {
    if (guard && guard()) { e.preventDefault(); e.returnValue = ''; }
  });

  // Page furniture
  function setBar(back) {
    bar.hidden = false;
    bar.innerHTML = `<div class="bar-inner">${back
      ? `<a class="back" href="${back.href}">${I.back}<span>${esc(back.label)}</span></a>`
      : `<span class="brand"><img src="/static/logo.png" width="613" height="245" alt="Tanya Streak Art"></span>`}</div>`;
  }

  function mount(html, title) {
    app.innerHTML = html;
    document.title = `${title} · Tanya Streak Art`;
    if (!firstRender) { const h = $('h1', app); if (h) h.focus({ preventScroll: true }); }
    firstRender = false;
  }

  function loading(title, extra = '') {
    mount(`<h1 tabindex="-1">${esc(title)}</h1>${extra}
      <p class="loading-text" role="status">Loading…</p>
      <div class="skel-list" aria-hidden="true"><div class="skel"></div><div class="skel"></div><div class="skel"></div></div>`, title);
  }

  function failed(title, err, retry, back) {
    mount(`<h1 tabindex="-1">${esc(title)}</h1>
      <div class="notice notice-error" role="alert">
        <p>${esc(err.message || NET)}</p>
        <div class="stack">
          <button type="button" class="btn btn-primary" id="retry">Try again</button>
          ${back ? `<a class="btn btn-secondary" href="${back.href}">${esc(back.label)}</a>` : ''}
        </div>
      </div>`, title);
    $('#retry').addEventListener('click', retry);
  }

  // ---------- Sign in ----------

  function viewLogin(m, alive) {
    bar.hidden = true;
    mount(`<div class="login"><div class="login-card">
      <h1 tabindex="-1" class="login-logo"><img src="/static/logo.png" width="613" height="245" alt="Tanya Streak Art"></h1>
      <p class="login-sub">Sign in to your website</p>
      <form id="login-form" novalidate>
        <input type="text" name="username" autocomplete="username" value="Tanya" class="visually-hidden" tabindex="-1" aria-hidden="true">
        <div class="field">
          <label for="pw">Password</label>
          <div class="pw-wrap">
            <input id="pw" name="password" type="password" autocomplete="current-password" autocapitalize="off" autocorrect="off" spellcheck="false" required aria-describedby="login-error">
            <button type="button" class="pw-toggle" aria-controls="pw" aria-pressed="false">Show</button>
          </div>
          <p class="field-error" id="login-error" role="alert" hidden></p>
        </div>
        <button class="btn btn-primary btn-block" type="submit" id="login-btn">Sign in</button>
      </form>
      <p class="login-help">Forgot it? WhatsApp Matt.</p>
    </div></div>`, 'Sign in');

    const form = $('#login-form'), pw = $('#pw'), err = $('#login-error'), btn = $('#login-btn');
    const toggle = $('.pw-toggle');
    toggle.addEventListener('click', () => {
      const show = pw.type === 'password';
      pw.type = show ? 'text' : 'password';
      toggle.textContent = show ? 'Hide' : 'Show';
      toggle.setAttribute('aria-pressed', String(show));
      toggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    });
    toggle.setAttribute('aria-label', 'Show password');

    const showErr = msg => {
      err.innerHTML = `${I.alert}<span>${esc(msg)}</span>`;
      err.hidden = false;
      pw.setAttribute('aria-invalid', 'true');
    };

    form.addEventListener('submit', async e => {
      e.preventDefault();
      err.hidden = true; pw.removeAttribute('aria-invalid');
      if (!pw.value) { showErr('Please type your password.'); pw.focus(); return; }
      btn.disabled = true; btn.textContent = 'Signing in…';
      try {
        await api('POST', '/api/login', { password: pw.value });
        meCache = null;
        const back = store.get('tsa_return');
        store.del('tsa_return');
        go(back && !/^#\/login/.test(back) ? back : '#/');
      } catch (ex) {
        if (!alive()) return;
        btn.disabled = false; btn.textContent = 'Sign in';
        showErr(ex.message);
        pw.select();
      }
    });

    // Already signed in (e.g. she opened the bookmark twice)? Skip ahead.
    fetch('/api/admin/me', { credentials: 'same-origin', cache: 'no-store' })
      .then(r => { if (r.ok && alive()) go('#/'); })
      .catch(() => {});
    setTimeout(() => { if (alive() && matchMedia('(hover: hover)').matches) pw.focus(); }, 50);
  }

  // ---------- Home ----------

  function countsText(c) {
    if (!c) return { paint: '<span class="skel-line"></span>', subs: '<span class="skel-line"></span>', com: '<span class="skel-line"></span>' };
    let paint = `${commas(c.available)} for sale · ${commas(c.sold)} sold`;
    if (c.hidden) paint += ` · ${commas(c.hidden)} hidden`;
    let subs = plural(c.subscribers, 'person', 'people');
    if (c.new_subscribers) subs += ` · +${commas(c.new_subscribers)} this week`;
    let com = c.commissions ? `${commas(c.commissions)} on your website` : 'None yet: add your first';
    if (c.commissions_hidden) com += ` · ${commas(c.commissions_hidden)} hidden`;
    return { paint: esc(paint), subs: esc(subs), com: esc(com) };
  }

  function viewHome(m, alive) {
    setBar(null);
    const t = countsText(meCache);
    mount(`<h1 tabindex="-1">Hi Tanya</h1>
      <p class="lede">What would you like to do today?</p>
      <a class="action-hero" href="#/paintings/new">
        <span class="hero-icon">${I.camera}</span>
        <span><strong>Add a new painting</strong><span class="hero-sub">Take or choose photos, then add the details</span></span>
      </a>
      <div id="home-err"></div>
      <ul class="tiles">
        <li><a class="tile" href="#/paintings"><span class="tile-icon">${I.frame}</span>
          <span class="tile-text"><strong>My paintings</strong><span id="c-paint">${t.paint}</span></span>${I.chev}</a></li>
        <li><a class="tile" href="#/commissions"><span class="tile-icon">${I.book}</span>
          <span class="tile-text"><strong>Finished commissions</strong><span id="c-com">${t.com}</span></span>${I.chev}</a></li>
        <li><a class="tile" href="#/subscribers"><span class="tile-icon">${I.people}</span>
          <span class="tile-text"><strong>Subscribers</strong><span id="c-subs">${t.subs}</span></span>${I.chev}</a></li>
        <li><a class="tile" href="#/settings"><span class="tile-icon">${I.gear}</span>
          <span class="tile-text"><strong>Settings</strong><span>Prices to order, sign-up box, password</span></span>${I.chev}</a></li>
        <li><a class="tile" href="/" target="_blank" rel="noopener"><span class="tile-icon">${I.globe}</span>
          <span class="tile-text"><strong>View my website</strong><span>Opens in a new tab</span></span>${I.external.replace('<svg', '<svg class="chev"')}</a></li>
      </ul>
      <div class="signout-wrap"><button type="button" class="btn-link" id="signout">Sign out</button></div>`, 'Home');

    $('#signout').addEventListener('click', async () => {
      try { await api('POST', '/api/logout', {}); } catch (e) { if (!quiet(e)) { toast(e.message, { error: true }); return; } }
      meCache = null;
      store.del('tsa_return');
      go('#/login');
      toast('You are signed out.');
    });

    api('GET', '/api/admin/me').then(r => {
      meCache = r.counts;
      if (!alive()) return;
      const t2 = countsText(r.counts);
      $('#c-paint').innerHTML = t2.paint;
      $('#c-subs').innerHTML = t2.subs;
      $('#c-com').innerHTML = t2.com;
    }).catch(e => {
      if (!alive() || quiet(e)) return;
      $('#home-err').innerHTML = `<div class="notice notice-error" role="alert" style="margin-top:18px"><p>${esc(e.message)}</p>
        <button type="button" class="btn btn-secondary" id="home-retry">Try again</button></div>`;
      $('#home-retry').addEventListener('click', () => route());
      if (!meCache) { $('#c-paint').textContent = 'See all'; $('#c-subs').textContent = 'See the list'; $('#c-com').textContent = 'See all'; }
    });
  }

  // ---------- My paintings ----------

  let paintingsCache = null;     // paintings and finished commissions together, as the admin API returns them

  const LIST = {
    painting: {
      title: 'My paintings', base: '#/paintings', filterKey: 'tsa_filter', loadingText: 'Loading your paintings…',
      tabs: [['all', 'All'], ['available', 'For sale'], ['sold', 'Sold'], ['hidden', 'Hidden']],
      emptyH: 'No paintings yet', emptyP: 'Add your first painting and it will appear on your website straight away.', emptyBtn: 'Add a new painting',
      none: { available: 'None of your paintings are for sale right now.', sold: 'None of your paintings are marked as sold right now.', hidden: 'None of your paintings are hidden right now.' },
      showAll: 'Show all paintings'
    },
    commission: {
      title: 'Finished commissions', base: '#/commissions', filterKey: 'tsa_cfilter', loadingText: 'Loading your commissions…',
      tabs: [['all', 'All'], ['available', 'On website'], ['hidden', 'Hidden']],
      emptyH: 'No finished commissions yet',
      emptyP: 'Add photos of paintings you’ve made for people. They appear on your website’s “Completed commissions” page.',
      emptyBtn: 'Add a finished commission',
      none: { available: 'None of your commissions are on your website right now.', hidden: 'None of your commissions are hidden right now.' },
      showAll: 'Show all commissions'
    }
  };
  const kindOf = p => p.kind || 'painting';

  function viewPaintings(m, alive) { listView(m, alive, 'painting'); }
  function viewCommissions(m, alive) { listView(m, alive, 'commission'); }

  function listView(m, alive, kind) {
    const L = LIST[kind], isCom = kind === 'commission';
    const mine = () => (paintingsCache || []).filter(p => kindOf(p) === kind);
    setBar({ href: '#/', label: 'Home' });
    const head = `<div class="list-head"><h1 tabindex="-1">${L.title}</h1>
      <a class="btn btn-primary btn-small" href="${L.base}/new">${I.plus}Add new</a></div>`;
    let mounted = false;
    const draw = list => render(list, alive);
    if (paintingsCache) draw(paintingsCache); else loadingWithHead();
    function loadingWithHead() {
      mount(`${head}<p class="loading-text" role="status">${L.loadingText}</p>
        <div class="skel-list" aria-hidden="true"><div class="skel"></div><div class="skel"></div><div class="skel"></div></div>`, L.title);
    }
    api('GET', '/api/admin/paintings').then(r => {
      paintingsCache = r.paintings;
      if (alive()) render(r.paintings, alive);
    }).catch(e => {
      if (!alive() || quiet(e)) return;
      if (paintingsCache) toast(e.message, { error: true });
      else failed(L.title, e, () => route(), { href: '#/', label: 'Back to home' });
    });

    function render(list, alive) {
      if (!alive()) return;
      if (!mounted) {
        mount(`${head}
          <div class="tabs" role="group" aria-label="Show">
            ${L.tabs.map(([v, l]) =>
              `<button type="button" class="tab" data-filter="${v}" aria-pressed="false">${l} <span class="tab-n" data-n="${v}"></span></button>`).join('')}
          </div>
          <div id="plist-wrap"></div>`, L.title);
        mounted = true;
        $('.tabs').addEventListener('click', e => {
          const b = e.target.closest('[data-filter]');
          if (!b) return;
          store.set(L.filterKey, b.dataset.filter);
          paint();
        });
        $('#plist-wrap').addEventListener('click', onToggle);
      }
      paint();
    }

    function paint(focusId) {
      const list = mine();
      let filter = store.get(L.filterKey) || 'all';
      if (!L.tabs.some(t => t[0] === filter)) filter = 'all';
      $$('.tab').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === filter)));
      const n = { all: list.length, available: 0, sold: 0, hidden: 0 };
      list.forEach(p => { n[p.status] = (n[p.status] || 0) + 1; });
      $$('[data-n]').forEach(s => { s.textContent = n[s.dataset.n]; });
      const shown = filter === 'all' ? list : list.filter(p => p.status === filter);
      const wrap = $('#plist-wrap');
      if (!list.length) {
        wrap.innerHTML = `<div class="empty">${isCom ? I.book : I.frame}<h2>${L.emptyH}</h2>
          <p>${L.emptyP}</p>
          <a class="btn btn-primary" href="${L.base}/new">${I.plus}${L.emptyBtn}</a></div>`;
        return;
      }
      if (!shown.length) {
        wrap.innerHTML = `<div class="empty"><h2>Nothing here</h2><p>${L.none[filter]}</p>
          <button type="button" class="btn btn-secondary" data-show-all>${L.showAll}</button></div>`;
        $('[data-show-all]', wrap).addEventListener('click', () => { store.set(L.filterKey, 'all'); paint(); });
        return;
      }
      wrap.innerHTML = `<ul class="plist">${shown.map(card).join('')}</ul>`;
      if (focusId) {
        const b = $(`[data-toggle="${focusId}"]`, wrap);
        if (b) b.focus({ preventScroll: true });
      }
    }

    function card(p) {
      const cover = p.images && p.images[0];
      const s = isCom ? (p.status === 'hidden' ? STATUS.hidden : { label: 'On website', cls: 'pill-sale' }) : (STATUS[p.status] || STATUS.available);
      const meta = [sizeText(p), p.medium].filter(Boolean).join(' · ');
      const toggleLabel = isCom ? (p.status === 'hidden' ? 'Show on website' : 'Hide from website')
        : p.status === 'sold' ? 'Put back on sale' : p.status === 'hidden' ? 'Put on sale' : 'Mark as sold';
      return `<li class="pcard">
        <a class="pcard-main" href="${L.base}/${p.id}">
          <span class="pcard-img">${cover ? `<img src="${esc(cover.md)}" alt="" loading="lazy" decoding="async">` : 'No photo yet'}</span>
          <span class="pcard-body">
            <span class="pills"><span class="pill ${s.cls}">${s.label}</span>${p.christmas ? `<span class="pill pill-xmas">${p.reveal_at && p.reveal_at > new Date().toISOString() ? 'Christmas · wrapped' : 'Christmas'}</span>` : ''}</span>
            <span class="pcard-title">${esc(p.title)}</span>
            ${meta ? `<span class="pcard-meta">${esc(meta)}</span>` : ''}
            ${isCom ? '' : `<span class="pcard-price">${esc(money(p.price))}</span>`}
          </span>
        </a>
        <div class="pcard-actions">
          <button type="button" class="btn btn-secondary btn-small" data-toggle="${p.id}">${toggleLabel}</button>
          <a class="btn btn-ghost btn-small btn-edit" href="${L.base}/${p.id}" aria-label="Edit ${esc(p.title)}">Edit</a>
        </div>
      </li>`;
    }

    async function setStatus(id, status) {
      const r = await api('PUT', `/api/admin/paintings/${id}`, { status });
      paintingsCache = (paintingsCache || []).map(p => (p.id === id ? r.painting : p));
      meCache = null;
      return r.painting;
    }

    async function onToggle(e) {
      const btn = e.target.closest('[data-toggle]');
      if (!btn) return;
      const id = Number(btn.dataset.toggle);
      const p = (paintingsCache || []).find(x => x.id === id);
      if (!p) return;
      const prev = p.status;
      const next = isCom ? (prev === 'hidden' ? 'available' : 'hidden') : prev === 'sold' ? 'available' : prev === 'hidden' ? 'available' : 'sold';
      btn.disabled = true;
      btn.textContent = 'Saving…';
      try {
        const updated = await setStatus(id, next);
        if (!alive()) return;
        paint(id);
        const msg = isCom ? (next === 'hidden' ? `“${updated.title}” is hidden from your website.` : `“${updated.title}” is on your website.`)
          : next === 'sold' ? `“${updated.title}” is marked as sold.` : `“${updated.title}” is for sale again.`;
        toast(msg, {
          action: 'Undo',
          onAction: async () => {
            try {
              await setStatus(id, prev);
              if (alive()) paint(id);
              toast('Undone.');
            } catch (ex) { if (!quiet(ex)) toast(ex.message, { error: true }); }
          }
        });
      } catch (ex) {
        if (quiet(ex) || !alive()) return;
        paint(id);
        toast(ex.message, { error: true });
      }
    }
  }

  // ---------- Add / edit a painting ----------

  const ED = {
    painting: {
      base: '#/paintings', back: 'My paintings', newTitle: 'Add a new painting', editTitle: 'Edit painting',
      lede: 'Start with photos, then fill in the details and tap Save.',
      photosHint: 'The first photo is the cover people see in your shop. A close-up of the paint is lovely as a second photo.',
      namePh: 'For example: Pink roses in a blue jug',
      descLabel: 'Description', descPh: 'A few friendly sentences: what you painted, the colours, what inspired it, or where it would look lovely.',
      legend: 'Is it for sale?',
      choices: [['available', 'For sale', 'On your website with its price'], ['sold', 'Sold', 'On your website, marked “Sold”'], ['hidden', 'Hidden', 'Hidden from your website']],
      save: 'Save painting', another: 'Add another painting', backTo: 'Back to my paintings', keep: 'Keep editing this painting',
      delH: 'Delete this painting', delBtn: 'Delete painting',
      where: { available: 'It’s on your website now, marked “For sale”.', sold: 'It’s on your website, marked “Sold”.', hidden: 'It’s saved, but hidden from your website.' },
      link: p => `/painting/${encodeURIComponent(p.slug)}`
    },
    commission: {
      base: '#/commissions', back: 'Finished commissions', newTitle: 'Add a finished commission', editTitle: 'Edit commission',
      lede: 'Add photos of a painting you made for someone, then a few details. It goes on the “Completed commissions” page of your website.',
      photosHint: 'The first photo is the one people see first. A photo of it hanging in its new home is a lovely second photo.',
      namePh: 'For example: Roses for Sarah’s new home',
      descLabel: 'The story', descPh: 'Who it was for or the occasion. For example: “A wedding bouquet for Sarah and James, painted from their photos.” First names only is best.',
      legend: 'Show it on your website?',
      choices: [['available', 'Show it', 'In “Completed commissions” on your website'], ['hidden', 'Hide it', 'Saved here, but not on your website']],
      save: 'Save commission', another: 'Add another commission', backTo: 'Back to finished commissions', keep: 'Keep editing this commission',
      delH: 'Delete this commission', delBtn: 'Delete commission',
      where: { available: 'It’s in “Completed commissions” on your website now.', hidden: 'It’s saved, but hidden from your website.' },
      link: p => `/commissions/completed/#${encodeURIComponent(p.slug)}`
    }
  };

  function viewEditor(m, alive) { openEditor(m, alive, 'painting'); }
  function viewCommissionEditor(m, alive) { openEditor(m, alive, 'commission'); }

  async function openEditor(m, alive, kind) {
    const id = m[1] ? Number(m[1]) : null;
    setBar({ href: ED[kind].base, label: ED[kind].back });
    if (!id) { editor(null, alive, kind); return; }
    loading(ED[kind].editTitle);
    try {
      const { painting } = await api('GET', `/api/admin/paintings/${id}`);
      if (alive()) editor(painting, alive, kindOf(painting));
    } catch (e) {
      if (!alive() || quiet(e)) return;
      failed(ED[kind].editTitle, e, () => route(), { href: ED[kind].base, label: ED[kind].backTo });
    }
  }

  function editor(p, alive, kind) {
    let painting = p;
    const isNew = !p;
    const E = ED[kind], isCom = kind === 'commission';
    const photos = (p ? p.images : []).map(im => ({ key: uid(), id: im.id, url: im.md, status: 'done' }));
    let chain = Promise.resolve();
    let orderDirty = false;
    let saving = false;

    const v = p || { title: '', medium: 'Oil on canvas', description: '', width_cm: null, height_cm: null, price: null, status: 'available' };
    const knownMedium = !v.medium || MEDIUMS.includes(v.medium);
    const xmWaiting = !!(v.reveal_at && v.reveal_at > new Date().toISOString());
    const title = isNew ? E.newTitle : E.editTitle;

    mount(`<h1 tabindex="-1">${title}</h1>
      ${isNew ? `<p class="lede">${E.lede}</p>` : ''}
      <form id="ed" novalidate>
        <section class="card" aria-labelledby="h-photos">
          <h2 id="h-photos">Photos</h2>
          <p class="section-hint">${E.photosHint}</p>
          <ul class="photos" id="photos"></ul>
          <input type="file" id="file" accept="image/*" multiple class="visually-hidden" tabindex="-1" aria-hidden="true">
        </section>

        <section class="card" aria-labelledby="h-details">
          <h2 id="h-details">Details</h2>
          <div class="field">
            <label for="f-title">Name of painting</label>
            <input type="text" id="f-title" maxlength="120" autocapitalize="sentences" autocomplete="off" required
              value="${esc(v.title)}" placeholder="${E.namePh}" aria-describedby="e-title">
            <p class="field-error" id="e-title" hidden></p>
          </div>

          <fieldset class="field" aria-describedby="e-size">
            <legend class="label">Size <span class="opt">(optional)</span></legend>
            <div class="size-row">
              <div>
                <label for="f-w">Width</label>
                <div class="affix suffix"><input type="number" id="f-w" inputmode="decimal" min="1" max="1000" step="any" value="${v.width_cm ?? ''}"><span>cm</span></div>
              </div>
              <span class="times" aria-hidden="true">×</span>
              <div>
                <label for="f-h">Height</label>
                <div class="affix suffix"><input type="number" id="f-h" inputmode="decimal" min="1" max="1000" step="any" value="${v.height_cm ?? ''}"><span>cm</span></div>
              </div>
            </div>
            <p class="field-error" id="e-size" hidden></p>
          </fieldset>

          <div class="field">
            <label for="f-medium">Medium</label>
            <select id="f-medium">
              ${MEDIUMS.map(o => `<option${knownMedium && v.medium === o ? ' selected' : ''}>${esc(o)}</option>`).join('')}
              <option value="__other"${knownMedium ? '' : ' selected'}>Other…</option>
            </select>
            <div id="other-wrap" ${knownMedium ? 'hidden' : ''} style="margin-top:10px">
              <label for="f-medium-other" class="visually-hidden">Type the medium</label>
              <input type="text" id="f-medium-other" maxlength="120" placeholder="For example: Oil and gold leaf on canvas" value="${knownMedium ? '' : esc(v.medium)}" aria-describedby="e-medium">
              <p class="field-error" id="e-medium" hidden></p>
            </div>
          </div>

          ${isCom ? '' : `<div class="field">
            <label for="f-price">Price</label>
            <div class="affix prefix"><span>R</span><input type="number" id="f-price" inputmode="numeric" min="0" step="1" value="${v.price ?? ''}" aria-describedby="h-price e-price"></div>
            <p class="hint" id="h-price">Leave blank to show “Price on request”.</p>
            <p class="field-error" id="e-price" hidden></p>
          </div>`}

          <div class="field">
            <label for="f-desc">${E.descLabel} <span class="opt">(optional)</span></label>
            <textarea id="f-desc" maxlength="2000" rows="5" placeholder="${E.descPh}">${esc(v.description)}</textarea>
          </div>
        </section>

        ${isCom ? '' : `<section class="card xm-card${v.christmas ? ' xm-on' : ''}" id="xm" aria-labelledby="h-xm">
          <h2 id="h-xm">${XSTAR}Christmas collection</h2>
          <div class="switch-row">
            <label for="f-xmas"><strong>Part of the Christmas collection</strong><span class="switch-sub" id="f-xmas-sub">Shows gift-wrapped at the top of your home page, in its own Christmas section.</span></label>
            <input type="checkbox" role="switch" id="f-xmas" class="switch"${v.christmas ? ' checked' : ''} aria-describedby="f-xmas-sub">
          </div>
          <div class="xm-peek"><div>
            <fieldset class="xm-when">
              <legend class="label">When should it appear?</legend>
              <div class="choices">
                <label class="choice"><input type="radio" name="reveal" value="now"${xmWaiting ? '' : ' checked'}><span class="choice-dot" aria-hidden="true"></span>
                  <span><strong>Straight away</strong><span class="choice-sub">As soon as you save</span></span></label>
                <label class="choice"><input type="radio" name="reveal" value="drop"${xmWaiting ? ' checked' : ''}><span class="choice-dot" aria-hidden="true"></span>
                  <span><strong>At the next drop</strong><span class="choice-sub" id="xm-drop">Set the date and time of the next drop in Settings first.</span></span></label>
              </div>
            </fieldset>
          </div></div>
        </section>`}

        <section class="card">
          <fieldset>
            <legend class="legend-h2">${E.legend}</legend>
            <div class="choices" style="margin-top:10px">
              ${E.choices.map(([val, l, d]) => `
                <label class="choice"><input type="radio" name="status" value="${val}"${v.status === val ? ' checked' : ''}>
                  <span class="choice-dot" aria-hidden="true"></span>
                  <span><strong>${l}</strong><span class="choice-sub">${d}</span></span></label>`).join('')}
            </div>
          </fieldset>
        </section>

        <div class="savebar">
          <p class="save-status" id="save-status" role="status" aria-live="polite"></p>
          <button type="submit" class="btn btn-primary btn-block" id="save-btn">${isNew ? E.save : 'Save changes'}</button>
        </div>
      </form>
      ${isNew ? '' : `<section class="danger-zone" aria-labelledby="h-del">
        <h2 id="h-del">${E.delH}</h2>
        <p>This takes it off your website for good, with all its photos.</p>
        <button type="button" class="btn btn-danger btn-block" id="del-btn">${I.trash}${E.delBtn}</button>
      </section>`}`, title);

    document.body.classList.add('has-savebar');

    const f = {
      title: $('#f-title'), w: $('#f-w'), h: $('#f-h'), medium: $('#f-medium'), other: $('#f-medium-other'),
      otherWrap: $('#other-wrap'), price: $('#f-price'), desc: $('#f-desc')
    };
    const fileInput = $('#file');
    const listEl = $('#photos');
    const saveBtn = $('#save-btn');
    const saveStatus = $('#save-status');

    function readFields() {
      const st = $('input[name="status"]:checked');
      return {
        title: f.title.value.trim(),
        width_cm: f.w.value,
        height_cm: f.h.value,
        medium: f.medium.value === '__other' ? f.other.value.trim() : f.medium.value,
        price: f.price ? f.price.value : '',
        description: f.desc.value.trim(),
        status: st ? st.value : 'available',
        kind,
        ...(isCom ? {} : { christmas: $('#f-xmas').checked, reveal: ($('input[name="reveal"]:checked') || {}).value || 'now' })
      };
    }
    let initial = JSON.stringify(readFields());

    const pending = () => photos.some(ph => ph.status === 'preparing' || ph.status === 'uploading');
    const unsent = () => photos.some(ph => ph.status === 'ready' || ph.status === 'error');
    guard = () => {
      if (saving || pending()) return 'Your photos are still being saved. If you leave now, some may not be saved.';
      if (JSON.stringify(readFields()) !== initial || unsent()) return 'You have changes that are not saved yet.';
      return '';
    };

    if (!isCom) {
      const xm = $('#xm'), xs = $('#f-xmas');
      xs.addEventListener('change', () => xm.classList.toggle('xm-on', xs.checked));
      // say when the next drop is, so "At the next drop" means something
      api('GET', '/api/admin/settings').then(st => {
        const el = $('#xm-drop'); if (!el) return;
        const drop = $('input[name="reveal"][value="drop"]');
        if (st.christmas_drop) el.textContent = `${dropLabel(st.christmas_drop)}. Until then it stays wrapped on your home page.`;
        else if (!drop.checked) drop.disabled = true;
      }).catch(() => {});
    }

    f.medium.addEventListener('change', () => {
      const other = f.medium.value === '__other';
      f.otherWrap.hidden = !other;
      if (other) f.other.focus();
    });

    // ----- Photos -----

    function stateHtml(ph) {
      switch (ph.status) {
        case 'preparing': return { cls: 'preparing', html: 'Getting photo ready…' };
        case 'ready': return { cls: 'waiting', html: isNew && !painting ? 'Not saved yet' : 'Waiting…' };
        case 'uploading': return { cls: '', html: `Uploading ${ph.progress || 0}%<div class="progress" role="progressbar" aria-label="Uploading photo" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${ph.progress || 0}"><i style="width:${ph.progress || 0}%"></i></div>` };
        case 'error': return { cls: 'failed', html: `<span>${esc(ph.error || 'This photo did not upload.')}</span><button type="button" class="btn btn-small" data-retry="${ph.key}">Try again</button>` };
        case 'bad': return { cls: 'failed', html: '<span>This photo could not be opened. Please remove it and try another.</span>' };
        default: return ph.justSaved ? { cls: 'saved', html: '✓ Saved' } : { cls: '', html: '' };
      }
    }

    function renderPhotos() {
      const room = photos.length < MAX_PHOTOS;
      listEl.innerHTML = photos.map((ph, i) => {
        const s = stateHtml(ph);
        const busy = ph.status === 'preparing' || ph.status === 'uploading';
        return `<li class="ph" data-key="${ph.key}">
          <div class="ph-img">
            ${ph.url ? `<img src="${esc(ph.url)}" alt="Photo ${i + 1}${i === 0 ? ', the cover' : ''}">` : ''}
            ${i === 0 ? '<span class="ph-badge">Cover</span>' : ''}
            <div class="ph-state ${s.cls}">${s.html}</div>
          </div>
          <div class="ph-actions">
            ${i === 0 ? '<span class="ph-cover-note" aria-hidden="true"></span>'
              : `<button type="button" class="btn btn-secondary btn-small" data-cover="${ph.key}" aria-label="Make photo ${i + 1} the cover">Make cover</button>`}
            <button type="button" class="btn btn-small btn-icon btn-remove" data-remove="${ph.key}" aria-label="Remove photo ${i + 1}"${busy ? ' disabled' : ''}>${I.trash}</button>
          </div>
        </li>`;
      }).join('') + (room ? `<li class="ph-add-li${photos.length ? '' : ' big'}">
          <button type="button" class="ph-add${photos.length ? '' : ' big'}" id="add-photos">
            ${I.camera}<strong>${photos.length ? 'Add more' : 'Add photos'}</strong>
            <span>${photos.length ? `Up to ${MAX_PHOTOS} photos` : 'Take a photo, or choose from your phone'}</span>
          </button></li>` : '');
    }

    function updateState(ph) {
      const li = $(`[data-key="${ph.key}"]`, listEl);
      if (!li) return;
      const s = stateHtml(ph);
      const el = $('.ph-state', li);
      el.className = 'ph-state ' + s.cls;
      el.innerHTML = s.html;
      const rm = $('[data-remove]', li);
      if (rm) rm.disabled = ph.status === 'preparing' || ph.status === 'uploading';
    }

    const enqueue = fn => { chain = chain.then(fn).catch(() => {}); return chain; };
    async function settle() { let c; do { c = chain; await c; } while (c !== chain); }

    async function prepare(ph) {
      if (!photos.includes(ph)) return;
      try {
        const r = await resizePhoto(ph.file);
        Object.assign(ph, r);
        ph.url = URL.createObjectURL(r.md);
        ph.file = null;
        ph.status = 'ready';
      } catch {
        ph.status = 'bad';
      }
      if (alive()) renderPhotos();
      if (painting && ph.status === 'ready') await uploadOne(ph);
    }

    async function uploadOne(ph) {
      if (!photos.includes(ph) || !painting || !ph.lg) return;
      ph.status = 'uploading'; ph.progress = 0; ph.error = '';
      updateState(ph);
      const fd = new FormData();
      fd.append('lg', ph.lg, 'photo-large.jpg');
      fd.append('md', ph.md, 'photo-medium.jpg');
      fd.append('width', String(ph.width));
      fd.append('height', String(ph.height));
      try {
        const { image } = await upload(`/api/admin/paintings/${painting.id}/images`, fd, pct => { ph.progress = pct; updateState(ph); });
        ph.id = image.id;
        ph.status = 'done';
        ph.lg = ph.md = null;
        ph.justSaved = true;
        paintingsCache = null; meCache = null;
        updateState(ph);
        setTimeout(() => { ph.justSaved = false; updateState(ph); }, 2500);
        if (!saving) await syncOrder();
      } catch (e) {
        if (quiet(e)) return;
        ph.status = 'error';
        ph.error = e.message === NET ? 'Did not upload. Check your internet.' : e.message;
        updateState(ph);
      }
    }

    async function syncOrder(force) {
      if (!painting || (!orderDirty && !force)) return false;
      if (photos.some(ph => ph.status !== 'done' && ph.status !== 'bad' && ph.status !== 'error')) return false;
      const ids = photos.filter(ph => ph.id).map(ph => ph.id);
      if (ids.length < 2) { orderDirty = false; return false; }
      orderDirty = false;
      try {
        await api('PUT', `/api/admin/paintings/${painting.id}/images`, { order: ids });
        paintingsCache = null;
        return true;
      } catch (e) {
        orderDirty = true;
        if (!quiet(e)) toast(e.message, { error: true });
        return false;
      }
    }

    function addFiles(files) {
      const room = MAX_PHOTOS - photos.length;
      if (!files.length) return;
      if (files.length > room) {
        toast(room ? `A painting can have up to ${MAX_PHOTOS} photos, so only the first ${room} were added.` : `A painting can have up to ${MAX_PHOTOS} photos. Remove one first.`, { error: true });
      }
      files.slice(0, room).forEach(file => {
        const ph = { key: uid(), status: 'preparing', file };
        photos.push(ph);
        enqueue(() => prepare(ph));
      });
      renderPhotos();
    }

    fileInput.addEventListener('change', () => {
      const files = Array.from(fileInput.files || []);
      fileInput.value = '';
      addFiles(files);
    });

    listEl.addEventListener('click', async e => {
      if (e.target.closest('#add-photos')) { fileInput.click(); return; }

      const retry = e.target.closest('[data-retry]');
      if (retry) {
        const ph = photos.find(x => x.key === retry.dataset.retry);
        if (ph && painting) enqueue(() => uploadOne(ph));
        else if (ph) { ph.status = 'ready'; updateState(ph); }
        return;
      }

      const cov = e.target.closest('[data-cover]');
      if (cov) {
        const i = photos.findIndex(x => x.key === cov.dataset.cover);
        if (i < 1) return;
        const [ph] = photos.splice(i, 1);
        photos.unshift(ph);
        orderDirty = true;
        renderPhotos();
        const first = $('.ph-cover-note', listEl);
        const firstRemove = $('[data-remove]', listEl);
        if (firstRemove) firstRemove.focus({ preventScroll: true });
        void first;
        if (!isNew || painting) {
          if (await syncOrder()) toast('Cover photo changed. Your website is updated.');
          else if (pending()) toast('Cover photo changed. It will update once the photos finish uploading.');
        } else {
          toast('Cover photo changed.');
        }
        return;
      }

      const rm = e.target.closest('[data-remove]');
      if (rm && !rm.disabled) {
        const idx = photos.findIndex(x => x.key === rm.dataset.remove);
        const ph = photos[idx];
        if (!ph) return;
        const ok = await confirmBox({
          title: 'Remove this photo?',
          body: ph.id ? 'It will be taken off your website.' : 'It has not been saved yet, so it will just be removed from this page.',
          ok: 'Remove photo', cancel: 'Keep it', danger: true
        });
        if (!ok || !photos.includes(ph)) return;
        if (ph.id) {
          rm.disabled = true;
          try {
            await api('DELETE', `/api/admin/images/${ph.id}`);
            paintingsCache = null;
          } catch (ex) {
            if (quiet(ex)) return;
            rm.disabled = false;
            toast(ex.message, { error: true });
            return;
          }
        }
        photos.splice(photos.indexOf(ph), 1);
        if (ph.url && ph.url.startsWith('blob:')) URL.revokeObjectURL(ph.url);
        renderPhotos();
        toast(ph.id ? 'Photo removed from your website.' : 'Photo removed.');
        const next = $$('[data-remove]', listEl)[Math.min(idx, photos.length - 1)] || $('#add-photos');
        if (next) next.focus({ preventScroll: true });
      }
    });

    renderPhotos();

    // ----- Delete -----

    const delBtn = $('#del-btn');
    if (delBtn) delBtn.addEventListener('click', async () => {
      const name = painting.title;
      const ok = await confirmBox({
        title: `Delete “${name}”?`,
        body: 'It will be removed from your website, with all its photos. This can’t be undone.',
        ok: 'Yes, delete it', cancel: 'Keep it', danger: true
      });
      if (!ok) return;
      delBtn.disabled = true;
      delBtn.lastChild.textContent = 'Deleting…';
      try {
        await api('DELETE', `/api/admin/paintings/${painting.id}`);
        paintingsCache = null; meCache = null;
        guard = null;
        go(E.base);
        toast(`“${name}” was deleted.`);
      } catch (e) {
        if (quiet(e)) return;
        delBtn.disabled = false;
        delBtn.lastChild.textContent = E.delBtn;
        toast(e.message, { error: true });
      }
    });

    // ----- Save -----

    function fieldError(input, errEl, msg) {
      errEl.innerHTML = `${I.alert}<span>${esc(msg)}</span>`;
      errEl.hidden = false;
      input.setAttribute('aria-invalid', 'true');
    }
    function clearErrors() {
      $$('.field-error', app).forEach(el => { el.hidden = true; });
      $$('[aria-invalid]', app).forEach(el => el.removeAttribute('aria-invalid'));
      saveStatus.textContent = ''; saveStatus.className = 'save-status';
    }

    function validate(vals) {
      let first = null;
      const bad = (input, errEl, msg) => { fieldError(input, errEl, msg); first = first || input; };
      if (!vals.title) bad(f.title, $('#e-title'), 'Please give the painting a name.');
      for (const inp of [f.w, f.h]) {
        const n = Number(inp.value);
        if ((inp.validity && inp.validity.badInput) || (inp.value !== '' && !(n >= 1 && n <= 1000))) {
          bad(inp, $('#e-size'), 'Sizes should be numbers in centimetres, for example 40.');
        }
      }
      if ((f.w.value === '') !== (f.h.value === '') && !first) {
        bad(f.w.value === '' ? f.w : f.h, $('#e-size'), 'Please fill in both the width and the height, or leave both blank.');
      }
      if (f.medium.value === '__other' && !vals.medium) bad(f.other, $('#e-medium'), 'Please type the medium, or pick one from the list.');
      if (f.price && ((f.price.validity && f.price.validity.badInput) || (f.price.value !== '' && !(Number(f.price.value) >= 0)))) {
        bad(f.price, $('#e-price'), 'The price should be a number in rand, for example 2500.');
      }
      if (first) {
        first.focus();
        first.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      }
      return !first;
    }

    function setBusy(text) {
      saveStatus.className = 'save-status busy';
      saveStatus.textContent = text;
    }

    $('#ed').addEventListener('submit', async e => {
      e.preventDefault();
      if (saving) return;
      clearErrors();
      const vals = readFields();
      if (!validate(vals)) return;
      const body = {
        ...vals,
        width_cm: vals.width_cm === '' ? null : Number(vals.width_cm),
        height_cm: vals.height_cm === '' ? null : Number(vals.height_cm),
        price: vals.price === '' ? null : Math.round(Number(vals.price))
      };
      saving = true;
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving…';
      setBusy('Saving the details…');
      try {
        if (!painting) {
          painting = (await api('POST', '/api/admin/paintings', body)).painting;
          const h = `${E.base}/${painting.id}`;
          history.replaceState(null, '', h);
          current = h;
        } else {
          painting = (await api('PUT', `/api/admin/paintings/${painting.id}`, body)).painting;
        }
        paintingsCache = null; meCache = null;
        initial = JSON.stringify(readFields());

        photos.filter(ph => ph.status === 'ready' || ph.status === 'error').forEach(ph => {
          if (ph.lg) enqueue(() => uploadOne(ph));
        });
        if (pending() || photos.some(ph => ph.status === 'ready')) {
          const n = photos.filter(ph => ph.status !== 'done' && ph.status !== 'bad').length;
          setBusy(`Saving ${plural(n, 'photo', 'photos')}… please keep this page open.`);
        }
        await settle();
        if (!alive()) return;
        if (isNew && photos.filter(ph => ph.id).length > 1) orderDirty = true;
        await syncOrder();

        const failedN = photos.filter(ph => ph.status === 'error').length;
        if (failedN) {
          saveStatus.className = 'save-status err';
          saveStatus.textContent = `The details are saved, but ${plural(failedN, 'photo', 'photos')} did not upload. Tap “Try again” on ${failedN === 1 ? 'it' : 'them'}, then Save.`;
          return;
        }
        guard = null;
        showSuccess();
      } catch (ex) {
        if (quiet(ex) || !alive()) return;
        saveStatus.className = 'save-status err';
        saveStatus.textContent = ex.message;
        toast(ex.message, { error: true });
      } finally {
        saving = false;
        if (alive() && document.contains(saveBtn)) {
          saveBtn.disabled = false;
          saveBtn.textContent = painting ? 'Save changes' : E.save;
        }
      }
    });

    function showSuccess() {
      document.body.classList.remove('has-savebar');
      const pnt = painting;
      const cover = photos.find(ph => ph.id && ph.url);
      const where = E.where[pnt.status] || '';
      mount(`<div class="success">
        <div class="success-mark">${I.check}</div>
        <h1 tabindex="-1">Saved!</h1>
        <p class="lede">“${esc(pnt.title)}”. ${where}</p>
        ${cover ? `<img class="success-img" src="${esc(cover.url)}" alt="">` : ''}
        <div class="stack">
          ${pnt.status !== 'hidden' ? `<a class="btn btn-primary btn-block" href="${E.link(pnt)}" target="_blank" rel="noopener">${I.external}View on website</a>` : ''}
          <a class="btn btn-secondary btn-block" href="${E.base}/new">${I.plus}${E.another}</a>
          <a class="btn btn-ghost btn-block" href="${E.base}">${E.backTo}</a>
          <button type="button" class="btn-link" id="keep-editing">${E.keep}</button>
        </div>
      </div>`, 'Saved');
      const h1 = $('h1', app);
      if (h1) h1.focus({ preventScroll: true });
      window.scrollTo(0, 0);
      $('#keep-editing').addEventListener('click', () => route());
    }
  }

  // ---------- Subscribers ----------

  async function viewSubscribers(m, alive) {
    setBar({ href: '#/', label: 'Home' });
    loading('Subscribers');
    let subs;
    try { subs = (await api('GET', '/api/admin/subscribers')).subscribers; }
    catch (e) {
      if (!alive() || quiet(e)) return;
      failed('Subscribers', e, () => route(), { href: '#/', label: 'Back to home' });
      return;
    }
    if (!alive()) return;
    render();

    function render(focusIdx) {
      const n = subs.length;
      mount(`<h1 tabindex="-1">Subscribers</h1>
        <p class="lede"><span class="big-count">${commas(n)}</span>${n === 1 ? 'person has' : 'people have'} signed up for your emails.</p>
        ${n ? `<section class="card" aria-label="Send them an email">
            <div class="stack">
              <button type="button" class="btn btn-primary btn-block" id="copy">${I.copy}<span>Copy all emails</span></button>
              <p class="hint" style="margin:0">Paste into the BCC box in Gmail so people can't see each other's addresses.</p>
              <div id="copy-fallback"></div>
              <a class="btn btn-secondary btn-block" href="/api/admin/subscribers?format=csv" download>${I.download}Download spreadsheet</a>
            </div>
          </section>
          <section class="card" aria-labelledby="h-list">
            <h2 id="h-list">Everyone on your list</h2>
            <ul class="subs">${subs.map(s => `<li class="sub">
              <div class="sub-text">
                <span class="sub-email">${esc(s.email)}</span>
                <span class="sub-meta">${s.name ? `${esc(s.name)} · ` : ''}Joined ${esc(niceDate(s.created_at))}</span>
              </div>
              <button type="button" class="btn btn-secondary btn-small" data-remove="${s.id}" aria-label="Remove ${esc(s.email)}">Remove</button>
            </li>`).join('')}</ul>
          </section>`
        : `<div class="empty">${I.mail}<h2>No one yet</h2>
            <p>When people join from the sign-up box on your website, they will appear here.</p></div>`}`, 'Subscribers');

      if (!n) return;
      const copyBtn = $('#copy');
      copyBtn.addEventListener('click', async () => {
        const text = subs.map(s => s.email).join(', ');
        const ok = await copyText(text);
        if (ok) {
          copyBtn.innerHTML = `${I.check}<span>Copied!</span>`;
          toast(`Copied ${plural(subs.length, 'email address', 'email addresses')}. Now paste them into the BCC box.`);
          setTimeout(() => { if (document.contains(copyBtn)) copyBtn.innerHTML = `${I.copy}<span>Copy all emails</span>`; }, 3000);
        } else {
          $('#copy-fallback').innerHTML = `<label for="copy-box" class="label">Your phone didn't let us copy. Press and hold in the box below, choose Select All, then Copy.</label>
            <textarea id="copy-box" readonly rows="4">${esc(text)}</textarea>`;
          const box = $('#copy-box');
          box.focus(); box.select();
        }
      });

      $('.subs').addEventListener('click', async e => {
        const b = e.target.closest('[data-remove]');
        if (!b) return;
        const id = Number(b.dataset.remove);
        const idx = subs.findIndex(s => s.id === id);
        const s = subs[idx];
        if (!s) return;
        const ok = await confirmBox({
          title: `Remove ${s.email}?`,
          body: 'They will no longer get your emails. They can always sign up again.',
          ok: 'Remove', cancel: 'Keep', danger: true
        });
        if (!ok) return;
        b.disabled = true; b.textContent = 'Removing…';
        try {
          await api('DELETE', `/api/admin/subscribers/${id}`);
          subs = subs.filter(x => x.id !== id);
          meCache = null;
          if (!alive()) return;
          render(idx);
          toast(`${s.email} was removed.`);
        } catch (ex) {
          if (quiet(ex)) return;
          b.disabled = false; b.textContent = 'Remove';
          toast(ex.message, { error: true });
        }
      });

      if (focusIdx !== undefined) {
        const btns = $$('.subs [data-remove]');
        const t = btns[Math.min(focusIdx, btns.length - 1)];
        if (t) t.focus({ preventScroll: true });
      }
    }
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; }
    } catch { /* fall through */ }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.opacity = '0'; ta.style.top = '0';
      document.body.appendChild(ta);
      ta.select(); ta.setSelectionRange(0, text.length);
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch { return false; }
  }

  // ---------- Settings ----------

  async function viewSettings(m, alive) {
    setBar({ href: '#/', label: 'Home' });
    loading('Settings');
    let s;
    try { s = await api('GET', '/api/admin/settings'); }
    catch (e) {
      if (!alive() || quiet(e)) return;
      failed('Settings', e, () => route(), { href: '#/', label: 'Back to home' });
      return;
    }
    if (!alive()) return;

    const tiers = ['small', 'medium', 'large'].map(id =>
      (s.commission_tiers || []).find(t => t.id === id) || { id, label: id[0].toUpperCase() + id.slice(1), longEdge: '', price: '' });

    mount(`<h1 tabindex="-1">Settings</h1>
      <p class="lede">Each box saves on its own.</p>

      <section class="card" aria-labelledby="h-comm">
        <h2 id="h-comm">Prices for paintings to order</h2>
        <p class="section-hint">What a painting made to order costs in each size. The size is the longest side, in cm.</p>
        <form id="f-comm" novalidate>
          ${tiers.map(t => `<fieldset class="tier">
            <legend>${esc(t.label)}</legend>
            <div class="tier-row">
              <div><label for="t-${t.id}-size">Longest side</label>
                <div class="affix suffix"><input type="number" id="t-${t.id}-size" data-tier="${t.id}" data-k="longEdge" inputmode="numeric" min="1" max="500" step="1" value="${esc(t.longEdge)}"><span>cm</span></div></div>
              <div><label for="t-${t.id}-price">Price</label>
                <div class="affix prefix"><span>R</span><input type="number" id="t-${t.id}-price" data-tier="${t.id}" data-k="price" inputmode="numeric" min="1" step="1" value="${esc(t.price)}"></div></div>
            </div>
          </fieldset>`).join('')}
          <p class="form-msg" id="m-comm" role="status" aria-live="polite"></p>
          <button type="submit" class="btn btn-primary btn-block">Save prices</button>
        </form>
      </section>

      <section class="card" aria-labelledby="h-pop">
        <h2 id="h-pop">Email sign-up box</h2>
        <p class="section-hint">A small box on your website that invites visitors to join your email list.</p>
        <form id="f-pop" novalidate>
          <div class="switch-row">
            <label for="p-on"><strong>Show it on my website</strong><span class="switch-sub" id="p-on-state"></span></label>
            <input type="checkbox" role="switch" id="p-on" class="switch"${s.popup_enabled ? ' checked' : ''}>
          </div>
          <div class="field">
            <label for="p-head">Heading</label>
            <input type="text" id="p-head" maxlength="80" value="${esc(s.popup_heading || '')}" placeholder="For example: Be first to see new paintings">
          </div>
          <div class="field">
            <label for="p-text">Message</label>
            <textarea id="p-text" maxlength="300" rows="3" placeholder="For example: I send a short email when new work is ready, about once a month.">${esc(s.popup_text || '')}</textarea>
          </div>
          <p class="form-msg" id="m-pop" role="status" aria-live="polite"></p>
          <button type="submit" class="btn btn-primary btn-block">Save sign-up box</button>
        </form>
      </section>

      <section class="card xm-card" aria-labelledby="h-xs">
        <h2 id="h-xs">${XSTAR}Christmas collection</h2>
        <p class="section-hint">Paintings you mark as “Christmas collection” open gift-wrapped at the top of your home page while this is on.</p>
        <form id="f-xs" novalidate>
          <div class="switch-row">
            <label for="x-on"><strong>Show the Christmas collection</strong><span class="switch-sub" id="x-on-state"></span></label>
            <input type="checkbox" role="switch" id="x-on" class="switch"${s.christmas_enabled ? ' checked' : ''}>
          </div>
          <div class="field">
            <label for="x-title">Name of the collection</label>
            <input type="text" id="x-title" maxlength="80" value="${esc(s.christmas_title || '')}" placeholder="For example: The Mantelpiece Miniatures">
          </div>
          <div class="field">
            <label for="x-text">A line about it</label>
            <textarea id="x-text" maxlength="300" rows="3">${esc(s.christmas_text || '')}</textarea>
          </div>
          <fieldset class="field">
            <legend class="label">Next drop <span class="opt">(optional)</span></legend>
            <div class="date-row">
              <div><label for="x-drop-d" class="visually-hidden">Date of the next drop</label><input type="date" id="x-drop-d" value="${esc((s.christmas_drop || '').slice(0, 10))}"></div>
              <div><label for="x-drop-t" class="visually-hidden">Time of the next drop</label><input type="time" id="x-drop-t" value="${esc((s.christmas_drop || '').slice(11, 16) || '19:00')}"></div>
            </div>
            <p class="hint">Paintings set to “At the next drop” stay wrapped until then and open by themselves. Leave the date empty for no drop.</p>
          </fieldset>
          <div class="field">
            <label for="x-until">Take it down after</label>
            <input type="date" id="x-until" value="${esc(s.christmas_until || '')}" aria-describedby="x-until-h">
            <p class="hint" id="x-until-h">After this day your home page goes back to normal by itself. The paintings stay in your shop.</p>
          </div>
          <p class="form-msg" id="m-xs" role="status" aria-live="polite"></p>
          <button type="submit" class="btn btn-primary btn-block">Save Christmas collection</button>
        </form>
      </section>

      <section class="card" aria-labelledby="h-pw">
        <h2 id="h-pw">Change password</h2>
        <p class="section-hint">You'll use the new password next time you sign in. Other phones or computers will be signed out.</p>
        <form id="f-pw" novalidate>
          <input type="text" name="username" autocomplete="username" value="Tanya" class="visually-hidden" tabindex="-1" aria-hidden="true">
          <div class="field">
            <label for="pw-cur">Current password</label>
            <input type="password" id="pw-cur" autocomplete="current-password" autocapitalize="off" autocorrect="off" spellcheck="false">
          </div>
          <div class="field">
            <label for="pw-new">New password</label>
            <input type="password" id="pw-new" autocomplete="new-password" autocapitalize="off" autocorrect="off" spellcheck="false" minlength="8" aria-describedby="pw-hint">
            <p class="hint" id="pw-hint">At least 8 characters. A short phrase is easy to remember.</p>
          </div>
          <label class="check-row"><input type="checkbox" id="pw-show"> Show passwords</label>
          <p class="form-msg" id="m-pw" role="status" aria-live="polite"></p>
          <button type="submit" class="btn btn-primary btn-block">Change password</button>
        </form>
      </section>`, 'Settings');

    const snap = form => JSON.stringify($$('input, textarea, select', form).map(el => (el.type === 'checkbox' ? el.checked : el.value)));
    const forms = { comm: $('#f-comm'), pop: $('#f-pop'), xs: $('#f-xs'), pw: $('#f-pw') };
    const base = { comm: snap(forms.comm), pop: snap(forms.pop), xs: snap(forms.xs) };
    guard = () => {
      if (snap(forms.comm) !== base.comm || snap(forms.pop) !== base.pop || snap(forms.xs) !== base.xs || $('#pw-cur').value || $('#pw-new').value) {
        return 'You have changes in Settings that are not saved yet.';
      }
      return '';
    };

    const msg = (id, kind, text) => {
      const el = $(id);
      el.className = 'form-msg ' + kind;
      el.innerHTML = text ? `${kind === 'ok' ? I.check : I.alert}<span>${esc(text)}</span>` : '';
    };

    async function saving(form, fn) {
      const btn = $('button[type="submit"]', form);
      const label = btn.textContent;
      btn.disabled = true; btn.textContent = 'Saving…';
      try { await fn(); }
      finally { if (document.contains(btn)) { btn.disabled = false; btn.textContent = label; } }
    }

    // Commission prices
    forms.comm.addEventListener('submit', e => {
      e.preventDefault();
      msg('#m-comm', '', '');
      $$('[aria-invalid]', forms.comm).forEach(el => el.removeAttribute('aria-invalid'));
      const out = tiers.map(t => ({ id: t.id, label: t.label, longEdge: '', price: '' }));
      let bad = null;
      $$('[data-tier]', forms.comm).forEach(inp => {
        const t = out.find(x => x.id === inp.dataset.tier);
        const n = Number(inp.value);
        const ok = inp.value !== '' && n > 0 && (inp.dataset.k !== 'longEdge' || n <= 500);
        if (!ok) { inp.setAttribute('aria-invalid', 'true'); bad = bad || inp; }
        t[inp.dataset.k] = Math.round(n);
      });
      if (bad) { msg('#m-comm', 'err', 'Each size needs a longest side in cm (up to 500) and a price in rand.'); bad.focus(); return; }
      saving(forms.comm, async () => {
        try {
          const r = await api('PUT', '/api/admin/settings', { commission_tiers: out });
          (r.commission_tiers || []).forEach(t => {
            const a = $(`#t-${t.id}-size`), b = $(`#t-${t.id}-price`);
            if (a) a.value = t.longEdge;
            if (b) b.value = t.price;
          });
          base.comm = snap(forms.comm);
          msg('#m-comm', 'ok', 'Saved. Your website shows the new prices.');
        } catch (ex) { if (!quiet(ex)) msg('#m-comm', 'err', ex.message); }
      });
    });

    // Sign-up box
    const sw = $('#p-on');
    const swText = () => { $('#p-on-state').textContent = sw.checked ? 'On: visitors will see it' : 'Off: visitors won’t see it'; };
    swText();
    sw.addEventListener('change', swText);
    forms.pop.addEventListener('submit', e => {
      e.preventDefault();
      msg('#m-pop', '', '');
      const head = $('#p-head');
      head.removeAttribute('aria-invalid');
      if (!head.value.trim()) { head.setAttribute('aria-invalid', 'true'); msg('#m-pop', 'err', 'The sign-up box needs a heading.'); head.focus(); return; }
      saving(forms.pop, async () => {
        try {
          const r = await api('PUT', '/api/admin/settings', { popup_enabled: sw.checked, popup_heading: head.value.trim(), popup_text: $('#p-text').value.trim() });
          sw.checked = !!r.popup_enabled;
          head.value = r.popup_heading || '';
          $('#p-text').value = r.popup_text || '';
          swText();
          base.pop = snap(forms.pop);
          msg('#m-pop', 'ok', r.popup_enabled ? 'Saved. The sign-up box is on your website.' : 'Saved. The sign-up box is switched off.');
        } catch (ex) { if (!quiet(ex)) msg('#m-pop', 'err', ex.message); }
      });
    });

    // Christmas collection
    const xsw = $('#x-on');
    let xCount = s.christmas_count || 0;
    const xText = () => { $('#x-on-state').textContent = xsw.checked ? `On · ${xCount === 1 ? '1 painting' : xCount + ' paintings'} in it` : 'Off: your home page looks as usual'; };
    xText();
    xsw.addEventListener('change', xText);
    forms.xs.addEventListener('submit', e => {
      e.preventDefault();
      msg('#m-xs', '', '');
      const title = $('#x-title');
      title.removeAttribute('aria-invalid');
      if (!title.value.trim()) { title.setAttribute('aria-invalid', 'true'); msg('#m-xs', 'err', 'The collection needs a name.'); title.focus(); return; }
      const d = $('#x-drop-d').value, t = $('#x-drop-t').value || '19:00';
      saving(forms.xs, async () => {
        try {
          const r = await api('PUT', '/api/admin/settings', {
            christmas_enabled: xsw.checked, christmas_title: title.value.trim(), christmas_text: $('#x-text').value.trim(),
            christmas_until: $('#x-until').value, christmas_drop: d ? `${d}T${t}` : ''
          });
          xsw.checked = !!r.christmas_enabled; xCount = r.christmas_count || 0;
          title.value = r.christmas_title || ''; $('#x-text').value = r.christmas_text || '';
          $('#x-drop-d').value = (r.christmas_drop || '').slice(0, 10); $('#x-drop-t').value = (r.christmas_drop || '').slice(11, 16) || '19:00';
          $('#x-until').value = r.christmas_until || '';
          xText();
          base.xs = snap(forms.xs);
          paintingsCache = null;
          msg('#m-xs', 'ok', r.christmas_enabled ? 'Saved. The Christmas collection is on your home page.' : 'Saved. The Christmas collection is switched off.');
        } catch (ex) { if (!quiet(ex)) msg('#m-xs', 'err', ex.message); }
      });
    });

    // Password
    $('#pw-show').addEventListener('change', e => {
      ['#pw-cur', '#pw-new'].forEach(sel => { $(sel).type = e.target.checked ? 'text' : 'password'; });
    });
    forms.pw.addEventListener('submit', e => {
      e.preventDefault();
      msg('#m-pw', '', '');
      const cur = $('#pw-cur'), nxt = $('#pw-new');
      [cur, nxt].forEach(el => el.removeAttribute('aria-invalid'));
      if (!cur.value) { cur.setAttribute('aria-invalid', 'true'); msg('#m-pw', 'err', 'Please type your current password.'); cur.focus(); return; }
      if (nxt.value.length < 8) { nxt.setAttribute('aria-invalid', 'true'); msg('#m-pw', 'err', 'Choose a new password of at least 8 characters.'); nxt.focus(); return; }
      saving(forms.pw, async () => {
        try {
          await api('POST', '/api/admin/password', { current: cur.value, next: nxt.value });
          cur.value = ''; nxt.value = '';
          msg('#m-pw', 'ok', 'Password changed. Use the new one next time you sign in.');
        } catch (ex) { if (!quiet(ex)) msg('#m-pw', 'err', ex.message); }
      });
    });
  }

  // ---------- Start ----------

  async function boot() {
    if (!location.hash) history.replaceState(null, '', '#/');
    current = location.hash;
    if (/^#\/login/.test(current)) { route(); return; }
    try {
      const r = await api('GET', '/api/admin/me');
      meCache = r.counts;
      route();
    } catch (e) {
      if (quiet(e)) return; // toLogin() has already moved to the sign-in screen
      bar.hidden = true;
      app.innerHTML = `<div class="notice notice-error" role="alert" style="margin-top:24px"><p>${esc(e.message)}</p>
        <button type="button" class="btn btn-primary" id="boot-retry">Try again</button></div>`;
      $('#boot-retry').addEventListener('click', () => { app.innerHTML = '<p class="loading-text" role="status">Loading…</p>'; boot(); });
    }
  }

  // Exposed for testing in the browser console only.
  window.__portal = { resizePhoto, money, niceDate };

  boot();
})();
