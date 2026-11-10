/**
 * FishWise SG — motion engine.
 *
 * Boot hand-off, page leave/enter transitions, scroll reveals with stagger,
 * count-ups, smooth wheel scrolling, pinned horizontal "slides", parallax,
 * cursor-reactive word fields (spot and fish names that decode around the
 * pointer), swimming-fish layers, the cursor ring/tag, nav indicator and
 * scroll progress. Everything degrades to no motion under reduced motion.
 */

const html = document.documentElement;
const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
const fineMQ = matchMedia('(hover: hover) and (pointer: fine)');

export const motionOK = () => !reduceMQ.matches;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let resolveBoot;
export const bootDone = new Promise((r) => { resolveBoot = r; });
if (!document.getElementById('boot')) {
  html.classList.remove('is-booting');
  resolveBoot();
}

/* ------------------------------------------------------------------
   Boot hand-off (scene lives in src/boot.js)
   ------------------------------------------------------------------ */

export async function finishBoot() {
  const boot = document.getElementById('boot');
  if (!boot) return;
  const minMs = !motionOK() ? 250 : (window.__bootMin || 6800);
  let skip;
  const skipped = new Promise((r) => { skip = r; });
  boot.addEventListener('click', skip, { once: true });
  document.getElementById('boot-skip')?.addEventListener('click', skip, { once: true });
  document.addEventListener('keydown', skip, { once: true });
  const fonts = document.fonts?.ready ? Promise.race([document.fonts.ready, wait(2000)]) : Promise.resolve();
  const since = performance.now() - (window.__bootStart || 0);
  await Promise.race([Promise.all([fonts, wait(Math.max(0, minMs - since))]), skipped]);
  window.__boot?.set(1, 'Ready to fish');
  await wait(motionOK() ? 380 : 0);
  boot.classList.add('is-out');
  setTimeout(() => {
    html.classList.remove('is-booting');
    requestAnimationFrame(() => html.style.setProperty('--vw', `${html.clientWidth / 100}px`));
    resolveBoot();
    placeIndicators();
    refreshScrollFx();
  }, motionOK() ? 420 : 0);
  setTimeout(() => boot.remove(), motionOK() ? 1700 : 50);
}

/* ------------------------------------------------------------------
   Page transitions + reveals
   ------------------------------------------------------------------ */

const BLOCKS = [
  '.dash-hero', '.stats-band', '.dsec', '.resp-strip', '.page-head', '.card', '.loc-card', '.track-card', '.hub-card',
  '.species-card', '.reward', '.cl-card', '.session', '.notice', '.toolbar', '.filter-row', '.p3d', '.map-wrap',
  '.learn-summary', '.wx-cell', '.result-card', '.post', '.segmented', '.sec-head', '.quiz-band', '.fod',
  '.qlinks', '.collection', '.wx-now', '.wx-verdict', '.wx-panel', '.wx-map-card', '.edu-grid', '.todo-wrap', '.days4',
  '.regions', '.advisor', '.kit-card', '.products', '.shops', '.species-hero', '.col-progress', '.cat-tabs', '.reveal',
].join(',');
const ROWS = '.row, .trip-card, .lesson-row, .spot-row, .leader, .alt-row, .link-row, .st-row, .wx-tr, .reminder-list li, .guide-list li, .path-steps li, .expect-list li, .todo-table tr';

let io = null;

export function leave(viewEl) {
  if (!viewEl || !motionOK()) return 0;
  viewEl.classList.add('is-leaving');
  return 200;
}

export function enter(root, { animate = true } = {}) {
  // A new page can add or remove the scrollbar: keep full-bleed sections exact.
  html.style.setProperty('--vw', `${html.clientWidth / 100}px`);
  requestAnimationFrame(() => html.style.setProperty('--vw', `${html.clientWidth / 100}px`));
  io?.disconnect();
  io = null;
  root.querySelectorAll('.ring-fg').forEach((c) => c.style.setProperty('--c', c.getAttribute('stroke-dasharray') || 0));
  root.querySelectorAll('.chart .bar').forEach((b, i) => b.style.setProperty('--bi', i));
  const head = root.querySelector('.page-head');
  if (head && !head.querySelector('.fx-field')) {
    const c = document.createElement('canvas');
    c.className = 'fx-field';
    c.dataset.field = 'words';
    c.setAttribute('aria-hidden', 'true');
    head.prepend(c);
  }
  root.querySelectorAll('canvas.fx-field').forEach(startField);
  root.querySelectorAll('canvas.fx-fish').forEach(startFishLayer);
  initScrollFx(root);
  if (!animate || !motionOK() || !('IntersectionObserver' in window)) return;
  observeReveals(root);
}

/** Reveal blocks added after the first render (e.g. live weather panels). */
export function observeReveals(root) {
  if (!motionOK() || !('IntersectionObserver' in window)) return;
  const blocks = [];
  root.querySelectorAll(BLOCKS).forEach((el) => {
    if (el.classList.contains('rv')) return;
    const anc = el.parentElement?.closest(BLOCKS);
    if (anc && root.contains(anc) && !anc.classList.contains('rv-in')) return;
    if (anc && anc.classList.contains('rv-in')) return;
    if (blocks.length < 90) blocks.push(el);
  });
  for (const el of blocks) {
    el.classList.add('rv');
    el.querySelectorAll(ROWS).forEach((r, j) => {
      if (j > 16) return;
      r.classList.add('rv-row');
      r.style.setProperty('--ri', j);
    });
    prepCounters(el);
  }
  if (!io) {
    io = new IntersectionObserver((entries) => {
      let k = 0;
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        const el = en.target;
        io?.unobserve(el);
        const delay = Math.min(k++, 9) * 70;
        el.style.setProperty('--d', `${delay}ms`);
        el.classList.add('rv-in');
        runCounters(el, delay);
      }
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.01 });
  }
  blocks.forEach((b) => io.observe(b));
}

/* ------------------------------------------------------------------
   Count-ups
   ------------------------------------------------------------------ */

const counters = new WeakMap();

function prepCounters(scope) {
  scope.querySelectorAll('.stat-value, [data-count]').forEach((el) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const m = node.nodeValue.match(/^(\s*)(\d+(?:\.\d+)?)(\s*)$/);
      if (!m) continue;
      const target = Number(m[2]);
      if (!target) return;
      const decimals = (m[2].split('.')[1] || '').length;
      counters.set(el, { node, target, decimals, pre: m[1], post: m[3] });
      node.nodeValue = `${m[1]}${(0).toFixed(decimals)}${m[3]}`;
      return;
    }
  });
}

async function runCounters(scope, delay) {
  const list = [...scope.querySelectorAll('.stat-value, [data-count]')].filter((el) => counters.has(el));
  if (scope.matches?.('.stat-value, [data-count]') && counters.has(scope)) list.push(scope);
  if (!list.length) return;
  await bootDone;
  await wait(delay + 220);
  for (const el of list) {
    const c = counters.get(el);
    counters.delete(el);
    const t0 = performance.now();
    const dur = 1200 + Math.min(c.target, 400) * 2;
    const tick = (now) => {
      if (!c.node.isConnected) return;
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 4);
      c.node.nodeValue = `${c.pre}${(c.target * e).toFixed(c.decimals)}${c.post}`;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}

/* ------------------------------------------------------------------
   Nav indicator
   ------------------------------------------------------------------ */

export function placeIndicators() {
  const nav = document.getElementById('top-nav');
  const ind = nav?.querySelector('.tn-ind');
  if (!ind) return;
  const target = nav.querySelector(':scope > .tn-link[aria-current="page"]')
    || nav.querySelector('.tn-group.is-active > .tn-trigger');
  if (target && target.offsetWidth) {
    const n = nav.getBoundingClientRect();
    const r = target.getBoundingClientRect();
    ind.style.transform = `translateX(${(r.left - n.left + 10).toFixed(1)}px)`;
    ind.style.width = `${Math.max(0, r.width - 20).toFixed(1)}px`;
    ind.classList.add('is-on');
    if (!ind.classList.contains('is-ready')) requestAnimationFrame(() => requestAnimationFrame(() => ind.classList.add('is-ready')));
  } else ind.classList.remove('is-on');
}

/* ------------------------------------------------------------------
   Word field: spot names, fish names and "FishWise SG" that decode
   and light up around the pointer.
   ------------------------------------------------------------------ */

export const FIELD_WORDS = ['FishWise SG', 'Bedok Jetty', 'Barramundi', 'Lower Seletar', 'Peacock bass', 'Changi Beach', 'Mangrove jack',
  'Woodlands Jetty', 'Snakehead', 'Pandan Reservoir', 'Javelin grunter', 'Sembawang Jetty', 'Tilapia', 'Kranji Reservoir',
  'Goatee croaker', 'Punggol Point', 'Pufferfish', 'Marina Reservoir', 'Scorpionfish', 'Jurong Lake', 'Stingray', 'Pasir Ris',
  'Sea catfish', 'East Coast', 'MacRitchie', 'Upper Seletar', 'Pulau Ubin', 'Catch & release', 'Tight lines', 'Blue railings',
  'Micro-barb hooks', 'Bedok Reservoir', 'Lower Peirce', 'Serangoon Reservoir', 'Geylang River', 'Pelton Canal', 'Rochor Canal'];
const SCR = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const pointer = { x: -9999, y: -9999 };

export function startField(canvas) {
  if (canvas.dataset.on) return;
  canvas.dataset.on = '1';
  const ctx = canvas.getContext('2d');
  const dense = canvas.dataset.field !== 'words-light';
  let w = 0, h = 0, words = [], visible = true, raf = 0;
  const local = { x: -9999, y: -9999, a: 0 };
  const font = '500 11.5px "JetBrains Mono", ui-monospace, Consolas, monospace';

  const resize = () => {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    // Cap to the viewport so a missing stylesheet can never feed a resize loop.
    w = Math.min(r.width, html.clientWidth * 1.05); h = Math.min(r.height, html.clientHeight * 1.5);
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = font;
    ctx.textBaseline = 'middle';
    words = [];
    const lh = dense ? 28 : 34;
    for (let y = 16; y < h + lh; y += lh) {
      let x = -Math.random() * 120;
      while (x < w + 40) {
        const t = FIELD_WORDS[(Math.random() * FIELD_WORDS.length) | 0].toUpperCase();
        const tw = ctx.measureText(t).width;
        words.push({ t, shown: t, x, y, w: tw, s: Math.random(), on: Math.random() < (dense ? 0.6 : 0.45), until: 0 });
        x += tw + 26 + Math.random() * 40;
      }
    }
  };

  const draw = (t) => {
    ctx.clearRect(0, 0, w, h);
    ctx.font = font;
    const r = canvas.getBoundingClientRect();
    const inside = pointer.x >= r.left && pointer.x <= r.right && pointer.y >= r.top && pointer.y <= r.bottom;
    const tx = pointer.x - r.left;
    const ty = pointer.y - r.top;
    if (inside && local.x < -999) { local.x = tx; local.y = ty; }
    local.a += ((inside ? 1 : 0) - local.a) * 0.08;
    if (inside) { local.x += (tx - local.x) * 0.22; local.y += (ty - local.y) * 0.22; }
    for (const wd of words) {
      const cx = wd.x + wd.w / 2;
      const wave = 0.5 + 0.5 * Math.sin(t * 0.0007 + wd.x * 0.006 + wd.y * 0.015 + wd.s * 6.28);
      const near = Math.max(0, 1 - Math.hypot(cx - local.x, wd.y - local.y) / 200) * local.a;
      if (near > 0.35 && t > wd.until) wd.until = t + 600;
      if (Math.random() < 0.0006) wd.until = t + 600;
      if (t < wd.until) {
        const k = 1 - (wd.until - t) / 600;
        let out = '';
        for (let c = 0; c < wd.t.length; c++) out += (c / wd.t.length < k || wd.t[c] === ' ') ? wd.t[c] : SCR[(Math.random() * 26) | 0];
        wd.shown = out;
      } else wd.shown = wd.t;
      const a = (wd.on ? 0.05 + 0.07 * wave : 0.02) + near * 0.85;
      if (a < 0.025) continue;
      ctx.fillStyle = near > 0.3 ? `rgba(140,204,255,${a.toFixed(3)})` : `rgba(190,212,240,${a.toFixed(3)})`;
      ctx.fillText(wd.shown, wd.x, wd.y);
    }
  };

  runCanvas(canvas, resize, draw);
}

/** Shared rAF loop that only runs while the canvas is on screen. */
function runCanvas(canvas, resize, draw) {
  let visible = true, raf = 0, ro = null, vo = null;
  const loop = (t) => {
    raf = 0;
    if (!canvas.isConnected) { ro?.disconnect(); vo?.disconnect(); return; }
    draw(t);
    if (visible && motionOK() && document.visibilityState === 'visible') raf = requestAnimationFrame(loop);
  };
  const kick = () => { if (!raf && visible && canvas.isConnected) raf = requestAnimationFrame(loop); };
  ro = new ResizeObserver(() => { resize(); kick(); });
  vo = new IntersectionObserver(([e]) => { visible = e.isIntersecting; kick(); });
  ro.observe(canvas);
  vo.observe(canvas);
  document.addEventListener('visibilitychange', kick);
  resize();
  if (!motionOK()) draw(0);
}

/* ------------------------------------------------------------------
   Swimming fish layer (uses the renderer from boot.js)
   ------------------------------------------------------------------ */

export function startFishLayer(canvas) {
  if (canvas.dataset.on || !window.FWFish) return;
  canvas.dataset.on = '1';
  const ctx = canvas.getContext('2d');
  const kinds = ['barra', 'peacock', 'jack', 'grunter', 'snake', 'tilapia', 'catfish'];
  let w = 0, h = 0, fish = [], last = 0;
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    // Cap to the viewport so a missing stylesheet can never feed a resize loop.
    w = Math.min(r.width, html.clientWidth * 1.05); h = Math.min(r.height, html.clientHeight * 1.5);
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = w < 700 ? 5 : 9;
    const base = Math.max(80, Math.min(170, w * 0.1));
    fish = Array.from({ length: n }, (_, i) => {
      const layer = i % 3;
      return {
        kind: kinds[i % kinds.length], layer, dir: Math.random() < 0.5 ? 1 : -1,
        L: base * (layer === 0 ? 0.5 : layer === 1 ? 0.8 : 1.15), x: Math.random() * w, y: h * (0.2 + Math.random() * 0.7),
        sp: layer === 0 ? 0.15 : layer === 1 ? 0.25 : 0.38, ph: Math.random() * 6.28, bob: Math.random() * 6.28,
        fog: layer === 0 ? 0.7 : layer === 1 ? 0.45 : 0.22,
      };
    }).sort((a, b) => a.layer - b.layer);
  };
  const draw = (t) => {
    const dt = last ? Math.min(48, t - last) : 16;
    last = t;
    ctx.clearRect(0, 0, w, h);
    const r = canvas.getBoundingClientRect();
    const px = pointer.x - r.left, py = pointer.y - r.top;
    for (const f of fish) {
      // fish drift away from the cursor
      const dx = f.x - px, dy = f.y - py, d = Math.hypot(dx, dy);
      const flee = d < 160 ? (1 - d / 160) : 0;
      f.x += f.dir * f.sp * dt * 0.06 * (1 + flee * 4);
      f.y += (dy / (d || 1)) * flee * 1.2;
      f.bob += dt * 0.0009;
      if (f.dir > 0 && f.x > w + f.L) { f.x = -f.L; f.y = h * (0.2 + Math.random() * 0.7); }
      if (f.dir < 0 && f.x < -f.L) { f.x = w + f.L; f.y = h * (0.2 + Math.random() * 0.7); }
      f.y = Math.max(f.L * 0.2, Math.min(h - f.L * 0.2, f.y));
      f.ph += dt * (0.006 + f.sp * 0.006) * (1 + flee * 2);
      ctx.globalAlpha = f.layer === 0 ? 0.35 : f.layer === 1 ? 0.55 : 0.75;
      window.FWFish.drawFish(ctx, f.kind, f.x, f.y + Math.sin(f.bob) * 8, f.L, f.dir, Math.cos(f.bob) * 0.05, f.ph, f.fog, [6, 22, 52]);
    }
    ctx.globalAlpha = 1;
  };
  runCanvas(canvas, resize, draw);
}

/* ------------------------------------------------------------------
   Scroll-linked motion: pinned horizontal slides + parallax
   ------------------------------------------------------------------ */

let scrollTargets = [];

function initScrollFx(root) {
  scrollTargets = [];
  root.querySelectorAll('[data-hscroll]').forEach((sec) => {
    const track = sec.querySelector('.sc-track');
    if (track) scrollTargets.push({ kind: 'h', sec, track });
  });
  root.querySelectorAll('[data-parallax]').forEach((el) => scrollTargets.push({ kind: 'p', el, k: Number(el.dataset.parallax) || 0.15 }));
  refreshScrollFx();
}

function wideEnough() { return window.innerWidth > 760 && motionOK(); }

export function refreshScrollFx() {
  for (const s of scrollTargets) {
    if (s.kind !== 'h') continue;
    if (!wideEnough()) { s.sec.style.removeProperty('--hs-h'); s.track.style.transform = ''; continue; }
    const extra = Math.max(0, s.track.scrollWidth - window.innerWidth);
    s.extra = extra;
    s.sec.style.setProperty('--hs-h', `${Math.round(window.innerHeight + extra * 0.8)}px`);
  }
  applyScrollFx();
}

function applyScrollFx() {
  const vh = window.innerHeight;
  for (const s of scrollTargets) {
    if (s.kind === 'h') {
      if (!wideEnough() || !s.extra) continue;
      const r = s.sec.getBoundingClientRect();
      const total = r.height - vh;
      const p = Math.max(0, Math.min(1, total > 0 ? -r.top / total : 0));
      s.track.style.transform = `translate3d(${(-p * s.extra).toFixed(1)}px,0,0)`;
      s.sec.style.setProperty('--hs-p', p.toFixed(4));
    } else if (motionOK()) {
      const r = s.el.getBoundingClientRect();
      const c = (r.top + r.height / 2 - vh / 2) / vh;
      s.el.style.transform = `translate3d(0,${(c * s.k * -100).toFixed(1)}px,0)`;
    }
  }
}

/* ------------------------------------------------------------------
   Smooth wheel scrolling (desktop mouse wheels only)
   ------------------------------------------------------------------ */

function initSmoothScroll() {
  if (!fineMQ.matches || !motionOK()) return;
  let target = window.scrollY, current = window.scrollY, raf = 0, active = false;
  const maxY = () => document.documentElement.scrollHeight - window.innerHeight;
  const step = () => {
    raf = 0;
    current += (target - current) * 0.11;
    if (Math.abs(target - current) < 0.4) { current = target; active = false; }
    window.scrollTo(0, current);
    if (active) raf = requestAnimationFrame(step);
  };
  const scrollableParent = (el, dy) => {
    for (let n = el; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
      if (n.matches?.('.leaflet-container, .maplibregl-map, .s3d, .modal, .overlay, .p3d-stage, canvas.three, [data-native-scroll]')) return true;
      const st = getComputedStyle(n);
      if (/(auto|scroll)/.test(st.overflowY) && n.scrollHeight > n.clientHeight + 1) {
        if ((dy > 0 && n.scrollTop + n.clientHeight < n.scrollHeight - 1) || (dy < 0 && n.scrollTop > 0)) return true;
      }
    }
    return false;
  };
  window.addEventListener('wheel', (e) => {
    if (e.defaultPrevented || e.ctrlKey || html.classList.contains('is-booting')) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    if (scrollableParent(e.target, e.deltaY)) return;
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? window.innerHeight : 1;
    if (!active) { target = window.scrollY; current = window.scrollY; }
    target = Math.max(0, Math.min(maxY(), target + e.deltaY * unit));
    active = true;
    if (!raf) raf = requestAnimationFrame(step);
  }, { passive: false });
  // Keyboard, scrollbar or anchor scrolling: follow it.
  window.addEventListener('scroll', () => { if (!active) { target = window.scrollY; current = window.scrollY; } }, { passive: true });
  window.addEventListener('hashchange', () => { active = false; cancelAnimationFrame(raf); raf = 0; });
}

/* ------------------------------------------------------------------
   Cursor: ring, dot, and a word tag on interactive elements
   ------------------------------------------------------------------ */

function initCursor() {
  if (!fineMQ.matches || !motionOK()) return;
  const ring = document.createElement('div');
  ring.className = 'cursor-ring';
  const dot = document.createElement('div');
  dot.className = 'cursor-dot';
  const tag = document.createElement('div');
  tag.className = 'cursor-tag';
  [ring, dot, tag].forEach((el) => { el.setAttribute('aria-hidden', 'true'); document.body.appendChild(el); });
  let x = -100, y = -100, tx = -100, ty = -100, raf = 0;
  const step = () => {
    raf = 0;
    x += (tx - x) * 0.2;
    y += (ty - y) * 0.2;
    ring.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    tag.style.transform = `translate3d(${x.toFixed(1)}px, ${(y + 34).toFixed(1)}px, 0) translateX(-50%)`;
    if (Math.abs(tx - x) > 0.2 || Math.abs(ty - y) > 0.2) raf = requestAnimationFrame(step);
  };
  let lastLabel = '';
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    tx = e.clientX;
    ty = e.clientY;
    dot.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
    if (!ring.classList.contains('is-on')) { x = tx; y = ty; ring.classList.add('is-on'); dot.classList.add('is-on'); }
    const hot = e.target.closest?.('a, button, [role="button"], input, select, textarea, label, summary, .leaflet-interactive, .leaflet-marker-icon, [data-cursor]');
    ring.classList.toggle('is-hot', Boolean(hot));
    const labelEl = e.target.closest?.('[data-cursor]');
    const label = labelEl?.dataset.cursor || '';
    if (label !== lastLabel) { tag.textContent = label; lastLabel = label; }
    tag.classList.toggle('is-on', Boolean(label));
    if (!raf) raf = requestAnimationFrame(step);
  }, { passive: true });
  document.addEventListener('pointerdown', () => ring.classList.add('is-down'));
  document.addEventListener('pointerup', () => ring.classList.remove('is-down'));
  html.addEventListener('mouseleave', () => { ring.classList.remove('is-on'); dot.classList.remove('is-on'); tag.classList.remove('is-on'); });
}

/* ------------------------------------------------------------------
   Global listeners
   ------------------------------------------------------------------ */

const RIPPLE = '.btn, .seg, .tn-link, .mm-link, .qb-opt, .adv-quick button';

export function initFx() {
  document.addEventListener('pointerdown', (e) => {
    if (!motionOK() || e.button !== 0) return;
    const t = e.target.closest(RIPPLE);
    if (!t || t.disabled) return;
    const r = t.getBoundingClientRect();
    const s = Math.max(r.width, r.height) * 2.4;
    const sp = document.createElement('fx-ripple');
    sp.setAttribute('aria-hidden', 'true');
    sp.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
    t.appendChild(sp);
    setTimeout(() => sp.remove(), 700);
  }, { passive: true });

  window.addEventListener('pointermove', (e) => { pointer.x = e.clientX; pointer.y = e.clientY; }, { passive: true });
  html.addEventListener('mouseleave', () => { pointer.x = -9999; pointer.y = -9999; });
  initCursor();
  initSmoothScroll();

  const setVw = () => html.style.setProperty('--vw', `${html.clientWidth / 100}px`);
  setVw();
  // The scrollbar appears after the intro; keep full-bleed sections exact.
  if ('ResizeObserver' in window) new ResizeObserver(() => { setVw(); placeIndicators(); }).observe(html);

  const prog = document.querySelector('.scroll-prog');
  let sRaf = 0;
  const onScroll = () => {
    sRaf = 0;
    const y = window.scrollY;
    html.classList.toggle('is-scrolled', y > 6);
    const bar = prog || document.querySelector('.scroll-prog');
    if (bar) {
      const max = html.scrollHeight - window.innerHeight;
      bar.style.transform = `scaleX(${max > 40 ? Math.min(1, y / max).toFixed(4) : 0})`;
    }
    applyScrollFx();
  };
  window.addEventListener('scroll', () => { if (!sRaf) sRaf = requestAnimationFrame(onScroll); }, { passive: true });
  window.addEventListener('hashchange', () => setTimeout(onScroll, 220));

  let rT = 0;
  window.addEventListener('resize', () => {
    setVw();
    clearTimeout(rT);
    rT = setTimeout(() => { placeIndicators(); refreshScrollFx(); }, 120);
  });
  document.fonts?.ready?.then(() => { placeIndicators(); refreshScrollFx(); });
}
