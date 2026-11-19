(() => {
  const FRAME_H = 1053;                       // Figma frame height
  const PAGES = ['overview', 'about', 'store', 'purchased', 'mypage', 'support'];
  const KEY = 'swanslegs.purchased';
  const root = document.documentElement;
  const scroller = document.getElementById('scroller');

  /* ------------------------------------------------------------------
     Responsive layout
     - Header: logo left/top, tabs centre/top, timer right/top (CSS).
     - Content box of each page (design px, relative to the content area
       under the 94px header). It keeps MARGIN px on the left and right.
       · 'scroll' pages are wider than a screen: they scroll sideways.
       · 'fit' pages: centred on both axes.
     - Scale: grows with the window to keep the 371px margins, but never
       so much that the 1053px-tall design no longer fits the window height.
     ------------------------------------------------------------------ */
  const HEADER = 94, MARGIN = 371, REF_W = 1920;
  const BOXES = {
    overview:  { mode: 'scroll', x1: 371, x2: 4013, y1: 67,  y2: 914 },
    about:     { mode: 'scroll', x1: 370, x2: 6192, y1: 72,  y2: 919 },
    store:     { mode: 'scroll', x1: 370, x2: 2546, y1: 72,  y2: 919 },
    support:   { mode: 'scroll', x1: 370, x2: 2870, y1: 72,  y2: 919 },
    // title + character card pages (1920px Figma frame, 1180px column 370–1550, card ends at y=924);
    // they centre the same 72–919 band as the other pages so the title sits at the same Y everywhere.
    purchased: { mode: 'fit', x1: 370, x2: 1550, y1: 72, y2: 919 },
  };
  function boxOf(page) {
    if (page !== 'mypage') return BOXES[page];
    return BOXES.purchased;   // empty ("Your purchase is nowhere") or list: title at the shared Y like every page
  }
  let current = 'overview';
  function layout() {
    const box = boxOf(current);
    const W = innerWidth, H = innerHeight;
    // page width with side margins: 371px for wide scroll pages, the Figma frame's own margin (370px → 1920px) otherwise
    const natural = box.x2 - box.x1 + 2 * (box.mode === 'scroll' ? MARGIN : box.x1);
    const s = Math.min(H / FRAME_H, W / (box.mode === 'scroll' ? REF_W : natural));
    root.style.setProperty('--s', s.toFixed(4));
    const vw = W / s, vh = H / s;                                    // window size in design px
    const pageW = Math.max(natural, vw);
    const areaH = vh - HEADER;                                       // height under the header
    const ox = natural > vw ? MARGIN - box.x1                        // wider than the window → scroll, 371 on the left
                            : (pageW - (box.x2 - box.x1)) / 2 - box.x1;   // otherwise centred
    const oy = (areaH - (box.y2 - box.y1)) / 2 - box.y1;           // centred vertically
    const page = document.getElementById('page-' + current), inner = page.querySelector('.page-inner');
    page.style.width = `${pageW * s}px`;
    inner.style.width = `${pageW}px`;
    inner.style.height = `${vh}px`;
    const c = inner.querySelector('.contents');
    c.style.left = `${ox}px`;
    c.style.top = `${HEADER + oy}px`;
  }
  addEventListener('resize', () => layout());

  /* Mouse wheel scrolls the wide frames sideways */
  scroller.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { scroller.scrollLeft += e.deltaY; e.preventDefault(); }
  }, { passive: false });

  /* Purchases (kept in this browser) */
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
  let owned = load();
  const save = (list) => { owned = list; try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {} };

  function renderMyPage() {
    document.getElementById('mp-empty').hidden = owned.length > 0;
    document.getElementById('mp-list').hidden = owned.length === 0;
    const rows = [...document.querySelectorAll('.mp-row')];
    rows.forEach((r) => { r.hidden = !owned.includes(r.dataset.leg); });
    document.getElementById('mp-divider').hidden = owned.length < 2;
    // 2 legs: the card fills the band under the title (top 190 → 919, as in Figma).
    // 1 leg: centre the card in the content area (the 72–919 band's middle = window middle), rather than
    // keeping it right under the title.
    const card = document.querySelector('.mp-card');
    const BAND_MID = (72 + 919) / 2;
    card.style.top = owned.length >= 2 ? '190px' : `${BAND_MID - card.offsetHeight / 2}px`;
  }

  /* Buy now → "Purchased" (disabled) once that leg is owned – Overview + Store */
  function renderBuyButtons() {
    document.querySelectorAll('.buy').forEach((b) => {
      const has = owned.includes(b.dataset.leg);
      b.disabled = has;
      b.classList.toggle('purchased', has);
      b.classList.toggle('sky01', !has);
      b.textContent = has ? 'Purchased' : 'Buy now';
    });
  }
  document.querySelectorAll('.buy').forEach((b) => b.addEventListener('click', () => {
    if (owned.includes(b.dataset.leg)) return;
    save([...owned, b.dataset.leg].sort());
    renderBuyButtons();
    location.hash = '#purchased';
  }));
  renderBuyButtons();

  /* "Use" → show the loading screen immediately, then open the leg page */
  const loading = document.getElementById('loading');
  document.querySelectorAll('.use').forEach((b) => b.addEventListener('click', () => {
    video.pause();
    loading.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => { location.href = `leg.html?leg=${b.dataset.leg}`; }));
  }));
  addEventListener('pageshow', () => { loading.hidden = true; });   // coming back with the Back button

  /* Overview video: hover shows state, click toggles sound */
  const mov = document.getElementById('mov');
  const video = document.getElementById('mov-video');
  const toggle = document.getElementById('mov-toggle');
  const syncSound = () => {
    mov.classList.toggle('unmuted', !video.muted);
    toggle.setAttribute('aria-pressed', String(!video.muted));
    toggle.setAttribute('aria-label', video.muted ? 'Unmute video' : 'Mute video');
  };
  toggle.addEventListener('click', () => {
    video.muted = !video.muted;
    if (video.paused) video.play().catch(() => {});
    syncSound();
  });
  syncSound();

  /* Overview video: seek bar (click / drag / arrow keys) */
  const seek = document.getElementById('mov-seek');
  const seekFill = document.getElementById('mov-seek-fill');
  const paintSeek = () => {
    const p = video.duration ? video.currentTime / video.duration : 0;
    seekFill.style.width = (p * 100) + '%';
    seek.setAttribute('aria-valuenow', String(Math.round(p * 100)));
  };
  let seekRaf = 0;
  const seekLoop = () => { paintSeek(); seekRaf = requestAnimationFrame(seekLoop); };
  video.addEventListener('play', () => { cancelAnimationFrame(seekRaf); seekLoop(); });
  video.addEventListener('pause', () => { cancelAnimationFrame(seekRaf); paintSeek(); });
  ['loadedmetadata', 'seeked', 'timeupdate'].forEach((ev) => video.addEventListener(ev, paintSeek));
  const seekTo = (e) => {
    if (!video.duration) return;
    const r = seek.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    video.currentTime = p * video.duration;
    paintSeek();
  };
  seek.addEventListener('pointerdown', (e) => {
    seek.setPointerCapture(e.pointerId);
    seek.classList.add('dragging');
    seekTo(e);
  });
  seek.addEventListener('pointermove', (e) => { if (seek.classList.contains('dragging')) seekTo(e); });
  const endDrag = () => seek.classList.remove('dragging');
  seek.addEventListener('pointerup', endDrag);
  seek.addEventListener('pointercancel', endDrag);
  seek.addEventListener('keydown', (e) => {
    if (!video.duration) return;
    if (e.key === 'ArrowRight') video.currentTime = Math.min(video.duration, video.currentTime + 5);
    else if (e.key === 'ArrowLeft') video.currentTime = Math.max(0, video.currentTime - 5);
    else return;
    e.preventDefault();
    paintSeek();
  });

  /* Support: click the e-mail to copy it */
  document.querySelectorAll('.copy-mail').forEach((btn) => btn.addEventListener('click', async () => {
    const text = btn.dataset.mail;
    try { await navigator.clipboard.writeText(text); }
    catch {
      const ta = Object.assign(document.createElement('textarea'), { value: text });
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
    }
    btn.textContent = 'Copied!';
    clearTimeout(btn._t);
    btn._t = setTimeout(() => { btn.textContent = text; }, 1500);
  }));

  /* Routing: #overview, #about, #store, #purchased, #mypage, #support */
  function route() {
    const id = location.hash.slice(1);
    const page = PAGES.includes(id) ? id : 'overview';
    let tab = page;
    document.querySelectorAll('.page').forEach((p) => {
      const on = p.id === 'page-' + page;
      p.classList.toggle('active', on);
      if (on) tab = p.dataset.tab;
    });
    document.querySelectorAll('.menu-btn').forEach((t) => t.classList.toggle('active', t.dataset.tab === tab));
    if (page === 'mypage') renderMyPage();
    current = page;
    layout();
    // the video keeps playing (and sounding) while hidden, so pause it off the Overview page
    if (page === 'overview') video.play().catch(() => {}); else video.pause();
    scroller.scrollLeft = 0;
  }
  addEventListener('hashchange', route);
  route();

  /* Timer: time spent on the site */
  const el = document.getElementById('timer');
  const t0 = Date.now();
  const p2 = (n) => String(n).padStart(2, '0');
  setInterval(() => {
    const s = Math.floor((Date.now() - t0) / 1000);
    el.textContent = `${p2(Math.floor(s / 3600))}:${p2(Math.floor(s / 60) % 60)}:${p2(s % 60)}`;
  }, 1000);
})();
