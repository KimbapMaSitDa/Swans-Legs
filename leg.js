(() => {
  /* ------------------------------------------------------------------
     14 images – data in leg-data.js (names, content type, [OBJECT], [MARK]).
     Large frame  : the image as it is.
     Small frame  : the same image + the recognition graphic drawn from the data.
     [BOUNDARY] and [STATUS] are calculated below, not typed in.
     ------------------------------------------------------------------ */
  const IMG = window.LEG_IMAGE_SIZE;
  const ITEMS = window.LEG_ITEMS.map((d) => ({ ...d, src: `images/${d.name}.jpg` }));

  const CONTENT = { A: 'Human', B: 'Animal', C: 'Object', D: 'Scene', E: 'Mixed' };
  const COLORS = { Ob: '#faf741', Hd: '#f20000', Fc: '#0044ed', LE: '#4bd969', RE: '#4bd969', Ns: '#ffa02b', Mt: '#f825b9' };

  /* ---- judging rules ---- */
  const EDGE = 2;               // px: a box this close to the image edge "touches" it
  const BLUR_LIMIT = 40;        // sharpness score (0–100, in leg-data.js) below this → Blurred
  const xs = (pts) => pts.map((p) => p[0]), ys = (pts) => pts.map((p) => p[1]);
  const rectOf = (pts) => ({ x1: Math.min(...xs(pts)), y1: Math.min(...ys(pts)), x2: Math.max(...xs(pts)), y2: Math.max(...ys(pts)) });

  // [BOUNDARY]: does any object box touch the top / bottom / left / right edge? (1 / 0)
  function boundaryOf(it) {
    const b = { TOP: 0, BOTTOM: 0, LEFT: 0, RIGHT: 0 };
    Object.values(it.object).forEach((pts) => {
      const r = rectOf(pts);
      if (r.y1 <= EDGE) b.TOP = 1;
      if (r.y2 >= IMG.h - EDGE) b.BOTTOM = 1;
      if (r.x1 <= EDGE) b.LEFT = 1;
      if (r.x2 >= IMG.w - EDGE) b.RIGHT = 1;
    });
    return b;
  }

  // Distorted: landmark proportions far from a normal face
  function isDistorted(m) {
    if (!(m.LE && m.RE && m.Ns && m.Mt && m.Fc)) return false;
    const [LE, RE, Ns, Mt] = [m.LE, m.RE, m.Ns, m.Mt];
    const face = rectOf(m.Fc), faceW = face.x2 - face.x1;
    const eyeD = Math.hypot(RE[0] - LE[0], RE[1] - LE[1]);
    const ratio = eyeD / faceW;                                                 // eye distance ÷ face width
    const tilt = Math.abs(Math.atan2(RE[1] - LE[1], RE[0] - LE[0]) * 180 / Math.PI); // eye line angle
    const eyeMidY = (LE[1] + RE[1]) / 2, eyeMinX = Math.min(LE[0], RE[0]), eyeMaxX = Math.max(LE[0], RE[0]);
    return ratio < 0.15 || ratio > 0.75 || tilt > 25
      || Ns[0] < eyeMinX - 0.6 * eyeD || Ns[0] > eyeMaxX + 0.6 * eyeD || Ns[1] <= eyeMidY   // nose between & below the eyes
      || Mt[1] <= Ns[1] || Math.abs(Mt[0] - Ns[0]) > Math.max(0.5 * eyeD, 0.15 * faceW);  // mouth below & under the nose
  }

  // [STATUS] for one item → values for the info panel
  function statusOf(it) {
    const detected = Object.keys(it.object).length > 0;
    if (!detected) return { con: CONTENT[it.code], obj: 'Undetected', vis: '-', qua: '-' };
    const b = boundaryOf(it);
    const cropped = b.TOP || b.BOTTOM || b.LEFT || b.RIGHT;
    let qua = 'Normal';
    if (isDistorted(it.mark)) qua = 'Distorted';
    else if (it.sharpness != null && it.sharpness < BLUR_LIMIT) qua = 'Blurred';
    return { con: CONTENT[it.code], obj: 'Detected', vis: cropped ? 'Cropped' : 'Normal', qua };
  }

  // the same data written out in the report format (open the browser console to read it)
  function reportOf(it) {
    const pt = (p) => `(${Math.round(p[0])},${Math.round(p[1])})`;
    const b = boundaryOf(it), s = statusOf(it);
    const obj = Object.entries(it.object).map(([k, v]) => `${k} : ${v.map(pt).join(', ')}`).join('\n') || '-';
    const mark = Object.entries(it.mark).map(([k, v]) => `${k} : ${Array.isArray(v[0]) ? v.map(pt).join(',') : pt(v)}`).join(' ') || '-';
    return `${it.name}\n[OBJECT]\n${obj}\n[MARK]\n${mark}\n[BOUNDARY] TOP : ${b.TOP}  BOTTOM : ${b.BOTTOM}  LEFT : ${b.LEFT}  RIGHT : ${b.RIGHT}\n`
      + `[STATUS] CONTENT TYPE : (${it.code})${s.con}  IMAGE STATUS : ${s.obj === 'Undetected' ? 'UNDETECTED' : [s.vis, s.qua].filter((v) => v !== 'Normal').join(', ') || 'Normal'}`
      + (it.sharpness != null ? `  (sharpness ${it.sharpness})` : '');
  }
  window.legReport = () => ITEMS.forEach((it) => console.log(reportOf(it)));

  // load all 14 images while the Loading screen is up
  const analysisReady = Promise.all(ITEMS.map((it) => new Promise((done) => {
    const img = new Image();
    img.onload = img.onerror = done;
    img.src = it.src;
  })));
  const AD_IMAGE = 10;   // pop-up ads appear on this image (1-based), once per flow

  const $ = (id) => document.getElementById(id);
  const root = document.documentElement;
  let scale = 1;

  /* Fill the window: the smaller ratio keeps the 1920×1053 design fully visible */
  const fit = () => {
    scale = Math.min(innerWidth / 1920, innerHeight / 1053);
    root.style.setProperty('--s', scale.toFixed(4));
  };
  addEventListener('resize', fit);
  fit();

  /* Left / Right leg */
  const leg = new URLSearchParams(location.search).get('leg') === 'left' ? 'left' : 'right';
  const legName = leg === 'left' ? 'Left Leg' : 'Right Leg';
  $('leg-name').textContent = legName;
  document.title = `Swan's Legs — ${legName}`;

  /* Timer – keeps running, also behind the modals */
  const p2 = (n) => String(n).padStart(2, '0');
  let tick = null;
  const startTimer = () => {
    if (tick) return;
    const t0 = Date.now();
    tick = setInterval(() => {
      const s = Math.floor((Date.now() - t0) / 1000);
      $('timer').textContent = `${p2(Math.floor(s / 3600))}:${p2(Math.floor(s / 60) % 60)}:${p2(s % 60)}`;
    }, 1000);
  };

  /* Modals */
  const MODALS = ['info', 'complete', 'leave', 'share-card'];
  const openModal = () => MODALS.find((m) => !$(m).hidden) || null;
  const show = (id) => { $('scrim').hidden = false; MODALS.forEach((m) => { $(m).hidden = m !== id; }); };
  const hideModals = () => { $('scrim').hidden = true; MODALS.forEach((m) => { $(m).hidden = true; }); };

  /* ---------------- Review ---------------- */
  // checking aid: leg.html?leg=right&page=5 opens on image 5
  const startPage = parseInt(new URLSearchParams(location.search).get('page'), 10);
  let idx = startPage >= 1 && startPage <= 14 ? startPage - 1 : 0, shownIdx = -1;
  const picks = Array(ITEMS.length).fill(null);
  const last = ITEMS.length - 1;

  ['original', 'cctv'].forEach((id) => { $(id).dataset.placeholder = $(id).innerHTML; });
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function setShot(el, src, alt, overlay) {
    el.classList.toggle('has-img', !!src);
    if (!src) { el.innerHTML = el.dataset.placeholder; return; }
    el.innerHTML = `<img src="${esc(src)}" alt="${esc(alt)}">` + (overlay || '');
  }

  // recognition graphic for the small frame (Figma 459:266): boxes with the label inside
  // the top-left corner, points as a label above an ✕ whose centre is the landmark
  const PANEL = { w: 477 - 4, h: 267 - 4 };       // inside the 2px border
  const LABEL_GAP_X = 12, LABEL_GAP_Y = 8, LABEL_H = 16;   // box ↔ label spacing (px), label line height
  const measureCtx = document.createElement('canvas').getContext('2d');
  const labelWidth = (t) => { measureCtx.font = '700 12px input-mono, monospace'; return Math.ceil(measureCtx.measureText(t).width); };
  function overlayHTML(it) {
    const sx = PANEL.w / IMG.w, sy = PANEL.h / IMG.h;
    const box = (label, color, pts) => {
      const r = rectOf(pts);
      const x = r.x1 * sx, y = r.y1 * sy, w = (r.x2 - r.x1) * sx, h = (r.y2 - r.y1) * sy;
      // label: fixed 12px font, 12px from the box's left edge, 8px from its top edge.
      // If the label doesn't fit inside the box, it sits ABOVE the box (12px in, 8px gap).
      const tw = labelWidth(label);
      const fits = w >= LABEL_GAP_X + tw + LABEL_GAP_X && h >= LABEL_GAP_Y + LABEL_H + LABEL_GAP_Y;
      const ly = fits ? y + LABEL_GAP_Y : Math.max(0, y - LABEL_GAP_Y - LABEL_H);
      return `<div class="det-box" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-color:${color}"></div>`
        + `<span class="det-label" style="left:${x + LABEL_GAP_X}px;top:${ly}px;color:${color}">${label}</span>`;
    };
    const point = (label, color, p) =>
      // ✕ only (no index text), centred on the landmark – always 12×12 px, 2px stroke
      `<div class="det-point" role="img" aria-label="${label}" style="left:${p[0] * sx - 12}px;top:${p[1] * sy - 12}px">`
      + `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6 18 18M18 6 6 18" fill="none" stroke="${color}" stroke-width="2"/></svg></div>`;
    const obs = Object.entries(it.object);
    const ob = obs.map(([k, pts], i) => box(obs.length > 1 ? `Ob${i + 1}` : 'Ob', COLORS.Ob, pts)).join('');
    const m = it.mark;
    const areas = ['Hd', 'Fc'].filter((k) => m[k]).map((k) => box(k, COLORS[k], m[k])).join('');
    const pts = ['LE', 'RE', 'Ns', 'Mt'].filter((k) => m[k]).map((k) => point(k, COLORS[k], m[k])).join('');
    return `<div class="det-layer">${ob}${areas}${pts}</div>`;
  }

  function render() {
    const it = ITEMS[idx];
    if (shownIdx !== idx) {                       // redraw the images only when the page changes
      shownIdx = idx;
      setShot($('original'), it.src, it.name);
      setShot($('cctv'), it.src, `${it.name} – recognition`, overlayHTML(it));
    }
    const s = statusOf(it);
    $('m-name').textContent = it.name;
    $('m-code').textContent = `(${it.code})`;
    $('m-con').textContent = s.con;
    $('m-obj').textContent = s.obj;
    $('m-vis').textContent = s.vis;
    $('m-qua').textContent = s.qua;
    $('count').textContent = `${p2(idx + 1)}/${ITEMS.length}`;
    document.querySelectorAll('#choices .btn').forEach((b) => {
      const on = picks[idx] === b.dataset.v;
      b.classList.toggle('sky01', on);
      b.classList.toggle('gray01', !on);
      b.setAttribute('aria-pressed', String(on));
    });
    $('prev').style.visibility = idx === 0 ? 'hidden' : 'visible';
    $('next').style.visibility = idx === last ? 'hidden' : 'visible';   // no "Next >" on the last image
    $('next').disabled = !picks[idx] || adsActive();   // ads still open → Next stays locked
    if (idx === AD_IMAGE - 1 && !adsShown) showAds();
  }

  /* ---------------- Pop-up ads (Figma 460:512) ----------------
     Listed bottom → top. x/y = position in the 1920×1053 frame.
     The ✕ sits at the same spot for every copy of the same ad image (CLOSE_AT). */
  const CLOSE_AT = { news: { cx: 559, cy: 8 }, huge: { cx: 747, cy: 3 }, health: { cx: 709, cy: 10 } };
  const ADS = [
    { kind: 'news',   src: 'figma/ad-news.png',          x: 1149, y: 32,  w: 594, h: 334 },
    { kind: 'huge',   src: 'figma/ad-huge-chance.png',   x: 410,  y: 396, w: 779, h: 438 },
    { kind: 'huge',   src: 'figma/ad-huge-chance.png',   x: 297,  y: 287, w: 779, h: 438 },
    { kind: 'huge',   src: 'figma/ad-huge-chance.png',   x: 166,  y: 127, w: 779, h: 438 },
    { kind: 'health', src: 'figma/ad-health-check.png',  x: 915,  y: 608, w: 745, h: 419 },
    { kind: 'health', src: 'figma/ad-health-check.png',  x: 1021, y: 486, w: 745, h: 419 },
  ].map((a, i) => ({ ...a, ...CLOSE_AT[a.kind], order: i }));
  let adsPending = 0;           // ads scheduled to pop in but not on screen yet
  const adsActive = () => adsPending > 0 || $('ads').querySelector('.ad') !== null;
  const NEWS_WAIT = 5;          // seconds before the News ad can be closed
  let adsShown = false;         // the whole pop-up moment happens once per flow
  let hugeRespawned = false;    // the "Huge Chance comes back" trick happens once

  function closeBtn(ad, el) {
    const b = document.createElement('button');
    b.className = 'ad-x';
    b.type = 'button';
    b.setAttribute('aria-label', 'Close ad');
    b.style.left = `${ad.cx}px`; b.style.top = `${ad.cy}px`;
    b.innerHTML = '<img src="figma/ad-close.svg" alt="">';
    b.addEventListener('click', () => closeAd(el));
    return b;
  }

  function newsTimer(ad, el) {
    const R = 11, C = 2 * Math.PI * R;
    const t = document.createElement('div');
    t.className = 'ad-timer';
    t.setAttribute('role', 'timer');
    t.style.left = `${ad.cx}px`; t.style.top = `${ad.cy}px`;          // exactly the ✕ button's box (24×24)
    t.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle class="track" cx="12" cy="12" r="${R}"/>`
      + `<circle class="bar" cx="12" cy="12" r="${R}" stroke-dasharray="${C}" stroke-dashoffset="0"/></svg><span>${NEWS_WAIT}</span>`;
    el.appendChild(t);
    const bar = t.querySelector('.bar'), num = t.querySelector('span');
    const t0 = performance.now();
    const step = (now) => {
      const left = Math.max(0, NEWS_WAIT * 1000 - (now - t0));
      bar.style.strokeDashoffset = String(C * (1 - left / (NEWS_WAIT * 1000)));   // ring empties as time runs out
      num.textContent = String(Math.ceil(left / 1000));
      if (left > 0 && el.isConnected) requestAnimationFrame(step);
      else if (el.isConnected) { t.remove(); el.appendChild(closeBtn(ad, el)); }
    };
    requestAnimationFrame(step);
  }

  function makeAd(ad) {
    const el = document.createElement('div');
    el.className = 'ad';
    el.dataset.kind = ad.kind;
    Object.assign(el.style, { left: `${ad.x}px`, top: `${ad.y}px`, width: `${ad.w}px`, height: `${ad.h}px` });
    el.innerHTML = `<img class="ad-img" src="${ad.src}" alt="Advertisement">`;
    el._ad = ad;
    if (ad.kind === 'health') {
      // "VIEW MY RESULTS" opens our website again in a new tab
      const cta = document.createElement('a');
      cta.className = 'ad-cta';
      cta.href = new URL('index.html#overview', location.href).href;
      cta.target = '_blank';
      cta.rel = 'noopener';
      cta.setAttribute('aria-label', 'View my results (opens Swan’s Legs in a new window)');
      // open the Overview in a separate browser window; this page stays where it is
      cta.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const w = Math.round(screen.availWidth * 0.8), h = Math.round(screen.availHeight * 0.8);
        const l = Math.round((screen.availWidth - w) / 2), t = Math.round((screen.availHeight - h) / 2);
        const win = window.open(cta.href, 'swanslegs-overview', `popup,width=${w},height=${h},left=${l},top=${t}`);
        if (win) win.opener = null;
        else window.open(cta.href, '_blank', 'noopener');          // pop-up blocked → new tab instead
      });
      el.appendChild(cta);
    }
    if (ad.kind === 'huge') {
      // Huge Chance: a real e-mail field + Subscribe button over the drawn ones (sending comes later)
      const form = document.createElement('form');
      form.className = 'ad-form';
      form.noValidate = true;
      form.innerHTML = '<input class="ad-email" type="email" name="email" autocomplete="email" aria-label="Email" spellcheck="false">'
        + '<button class="ad-sub" type="submit" aria-label="Subscribe"></button>'
        + '<p class="ad-msg" role="status" aria-live="polite"></p>';
      const input = form.querySelector('.ad-email'), msg = form.querySelector('.ad-msg');
      const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const v = input.value.trim();
        if (!v) msg.textContent = 'Fill your email address';
        else if (!EMAIL.test(v)) msg.textContent = 'Format of the email address isn’t correct';
        else msg.textContent = 'You’re already using Swan’s Legs, so you don’t have to fill in the blanks.';
      });
      // deleting text (Backspace / Delete / cut) clears the message
      input.addEventListener('input', (e) => { if (!e.inputType || e.inputType.startsWith('delete')) msg.textContent = ''; });
      el.appendChild(form);
    }
    if (ad.kind !== 'news') el.appendChild(closeBtn(ad, el));
    return el;
  }

  // put an ad back at its original depth (bottom → top order of ADS)
  function placeAd(layer, el) {
    const above = [...layer.querySelectorAll('.ad')].find((n) => n._ad.order > el._ad.order);
    layer.insertBefore(el, above || null);
  }

  // ads open one by one ("다라라락")
  const AD_STAGGER = 140;   // ms between windows
  function popIn(list, layer) {
    adsPending += list.length;
    list.forEach((ad, i) => setTimeout(() => {
      adsPending--;
      const el = makeAd(ad);
      el.classList.add('pop');
      placeAd(layer, el);
      if (ad.kind === 'news') newsTimer(ad, el);              // countdown starts when the News ad appears
      render();
    }, i * AD_STAGGER));
  }

  function showAds() {
    adsShown = true;
    const layer = $('ads');
    layer.innerHTML = '';
    popIn(ADS, layer);
  }

  const closedHuge = [];
  function closeAd(el) {
    const layer = $('ads');
    el.remove();
    if (el.dataset.kind === 'huge' && !hugeRespawned) {
      closedHuge.push(el._ad);
      if (closedHuge.length === 2) {
        // closing the 2nd "Huge Chance" brings back the two that were closed;
        // the one still open stays as it is – only once per flow
        hugeRespawned = true;
        popIn(closedHuge.slice().sort((a, b) => a.order - b.order), layer);
      }
    }
    render();   // all ads closed → Next unlocks (if a choice was made)
  }

  const finish = () => { $('done-count').textContent = ITEMS.length; show('complete'); };

  // Images 1–11: a choice moves straight on to the next image (the pick flashes blue for a moment).
  // Image 12: a choice opens the completion screen.
  let advancing = false;
  document.querySelectorAll('#choices .btn').forEach((b) => b.addEventListener('click', () => {
    if (advancing) return;
    picks[idx] = b.dataset.v;
    render();
    if (adsActive()) return;   // ads still open: the choice is kept, Next is pressed after closing them
    if (idx === last) { finish(); return; }
    advancing = true;
    setTimeout(() => { idx++; advancing = false; render(); }, 250);
  }));
  $('prev').addEventListener('click', () => { if (idx > 0) { idx--; render(); } });
  $('next').addEventListener('click', () => {
    if (!picks[idx] || adsActive()) return;
    if (idx < last) { idx++; render(); } else finish();
  });

  $('help').addEventListener('click', () => show('info'));
  $('got-it').addEventListener('click', hideModals);

  /* ---------------- Leave alert (✕) ---------------- */
  let beforeLeave = null;
  $('close').addEventListener('click', () => { beforeLeave = openModal(); closeVolume(); show('leave'); });
  $('keep-going').addEventListener('click', () => { if (beforeLeave) show(beforeLeave); else hideModals(); });

  /* ---------------- End of flow ---------------- */
  // Share: copy the Swan's Legs homepage link, then show "Spread to the world"
  const HOME_URL = new URL('index.html', location.href).href;
  async function copyHome() {
    try { await navigator.clipboard.writeText(HOME_URL); return true; } catch {
      const ta = Object.assign(document.createElement('textarea'), { value: HOME_URL });
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand('copy'); ta.remove(); return ok;
    }
  }
  $('share').addEventListener('click', () => { copyHome(); show('share-card'); });
  $('keep-scrolling').addEventListener('click', () => {
    hideModals();
    closeVolume();
    bgm.pause();                                  // the music stops…
    const sfx = $('sfx');                         // …and the buzz plays over the black screen
    sfx.volume = 1;                               // always audible, whatever the music volume/mute was
    sfx.muted = false;
    sfx.currentTime = 0;
    sfx.play().catch(() => {});
    $('keep-screen').hidden = false;
    setTimeout(() => { location.href = 'index.html#overview'; }, 5000);
  });

  addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!$('vol-panel').hidden) closeVolume();
    else if (!$('info').hidden) hideModals();
    else if (!$('leave').hidden) $('keep-going').click();
  });

  /* ---------------- Music + volume ---------------- */
  const bgm = $('bgm');
  // knob top (px) at 100 % … 0 %: the knob touches the track's top end (16) and bottom end (191 − 20)
  const KNOB_MIN = 16, KNOB_MAX = 171;
  let volume = 1, muted = false;

  const tryPlay = () => { if (!muted && volume > 0 && bgm.paused) bgm.play().catch(() => {}); };

  function syncAudio() {
    bgm.volume = volume;
    bgm.muted = muted || volume === 0;
    const silent = bgm.muted;
    const low = volume <= 0.3;                        // ≤ 30 % → one sound wave
    ['sound', 'vol-mute'].forEach((id) => {
      $(id).classList.toggle('is-muted', silent);
      $(id).classList.toggle('is-low', low);
    });
    $('vol-mute').setAttribute('aria-pressed', String(silent));
    $('vol-mute').setAttribute('aria-label', silent ? 'Unmute music' : 'Mute music');
    $('vol-knob').style.top = `${KNOB_MAX - volume * (KNOB_MAX - KNOB_MIN)}px`;
    $('vol-knob').setAttribute('aria-valuenow', String(Math.round(volume * 100)));
    if (!silent) tryPlay();
  }

  const openVolume = () => { $('vol-panel').hidden = false; $('sound').setAttribute('aria-expanded', 'true'); };
  function closeVolume() { $('vol-panel').hidden = true; $('sound').setAttribute('aria-expanded', 'false'); }
  $('sound').addEventListener('click', (e) => { e.stopPropagation(); $('vol-panel').hidden ? openVolume() : closeVolume(); });
  addEventListener('pointerdown', (e) => {
    if (!$('vol-panel').hidden && !$('vol-panel').contains(e.target) && !$('sound').contains(e.target)) closeVolume();
  });

  $('vol-mute').addEventListener('click', () => {
    if (muted || volume === 0) { muted = false; if (volume === 0) volume = 0.5; }
    else muted = true;
    syncAudio();
  });

  // drag / click on the track
  const setFromPointer = (clientY) => {
    const rect = $('vol-panel').getBoundingClientRect();
    const y = (clientY - rect.top) / scale - 10;                 // knob is 20px tall
    const top = Math.min(KNOB_MAX, Math.max(KNOB_MIN, y));
    volume = Math.round((1 - (top - KNOB_MIN) / (KNOB_MAX - KNOB_MIN)) * 100) / 100;
    if (volume > 0) muted = false;
    syncAudio();
  };
  let dragging = false;
  ['vol-knob', 'vol-hit'].forEach((id) => $(id).addEventListener('pointerdown', (e) => {
    dragging = true;
    $('vol-knob').setPointerCapture?.(e.pointerId);
    setFromPointer(e.clientY);
    e.preventDefault();
  }));
  $('vol-knob').addEventListener('pointermove', (e) => { if (dragging) setFromPointer(e.clientY); });
  addEventListener('pointerup', () => { dragging = false; });
  $('vol-knob').addEventListener('keydown', (e) => {
    const step = { ArrowUp: 0.05, ArrowRight: 0.05, ArrowDown: -0.05, ArrowLeft: -0.05 }[e.key];
    if (step === undefined) return;
    volume = Math.min(1, Math.max(0, Math.round((volume + step) * 100) / 100));
    if (volume > 0) muted = false;
    syncAudio();
    e.preventDefault();
  });

  syncAudio();
  // Browsers only allow sound after a click: if autoplay is refused, start on the first click.
  addEventListener('pointerdown', tryPlay, { capture: true });

  /* ---------------- Loading → Info → task ---------------- */
  render();
  const pageLoaded = new Promise((r) => (document.readyState === 'complete' ? r() : addEventListener('load', r, { once: true })));
  const musicReady = new Promise((r) => {
    if (bgm.readyState >= 3) return r();
    bgm.addEventListener('canplaythrough', r, { once: true });
    bgm.addEventListener('error', r, { once: true });
    setTimeout(r, 20000);
  });
  const minTime = new Promise((r) => setTimeout(r, 1500));
  // fonts used only inside hidden screens (modals) are fetched now, so they never appear late
  const fontsReady = Promise.all([
    '500 80px rocky-extra-condensed', '500 34px rocky-condensed', '700 34px rocky-condensed',
    '900 53px rocky-compressed', '500 24px input-mono', '700 21px input-mono',
  ].map((f) => document.fonts.load(f).catch(() => {}))).then(() => document.fonts.ready);
  Promise.all([pageLoaded, musicReady, fontsReady, analysisReady, minTime]).then(() => {
    render();                                     // sharpness scores are in → refresh [QUA]
    $('loading').classList.add('hide');
    if (!(startPage >= 1)) show('info');        // check mode (?page=N) skips the intro
    startTimer();
    tryPlay();
  });
})();
