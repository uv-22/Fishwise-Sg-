/**
 * First-visit welcome tour (3 steps): your level, your area, your start.
 * Shown once per browser after the intro; remembered in localStorage.
 */

import { icon } from './icons.js';
import { esc, openModal, closeModal } from './ui.js';
import { TRACKS } from './data/courses.js';
import { SPOTS } from './data/spots.js';
import { getLearning } from './progress.js';
import { distanceKm } from './services/weather.js';

const KEY = 'fishwise.welcome';
const LEVELS = [
  ['beginner', 'Never fished', 'Rules, gear, a knot and a first cast'],
  ['amateur', 'Fished a few times', 'Read the water, rigs and landing fish'],
  ['advanced', 'I fish often', 'Targeting species, tides and conditions'],
];
const AREAS = [
  ['North', 1.435, 103.80], ['North-East', 1.39, 103.90], ['East', 1.34, 103.95],
  ['West', 1.35, 103.72], ['Central', 1.33, 103.84], ['South', 1.28, 103.83],
];

export function welcomeDone() {
  try { return Boolean(localStorage.getItem(KEY)); } catch { return true; }
}

function save(v) {
  try { localStorage.setItem(KEY, JSON.stringify({ ...v, at: new Date().toISOString() })); } catch { /* storage blocked */ }
}

function firstLesson(level) {
  const done = getLearning().completed || {};
  const track = TRACKS.find((t) => t.id === level) || TRACKS[0];
  return track.lessons.find((l) => !done[l.id]) || track.lessons[0];
}

function nearestSpot(area) {
  const a = AREAS.find((x) => x[0] === area) || AREAS[4];
  return SPOTS.filter((s) => s.status === 'listed')
    .map((s) => ({ s, km: distanceKm(a[1], a[2], s.lat, s.lng) }))
    .sort((x, y) => x.km - y.km)[0].s;
}

/** Wait for the intro to finish, then show the tour once. */
export function maybeWelcome() {
  if (welcomeDone()) return;
  const t0 = performance.now();
  const tick = () => {
    if (welcomeDone()) return;
    if (document.documentElement.classList.contains('is-booting') || document.getElementById('boot')) {
      if (performance.now() - t0 < 20000) setTimeout(tick, 400);
      return;
    }
    const h = location.hash.replace(/^#\/?/, '');
    if (h && !h.startsWith('dashboard')) return;
    openWelcome();
  };
  setTimeout(tick, 600);
}

export function openWelcome() {
  const v = { level: null, area: null };
  const steps = (n) => `<div class="wt-steps" aria-hidden="true">${[0, 1, 2].map((i) => `<i class="${i <= n ? 'is-on' : ''}"></i>`).join('')}</div>`;
  const step1 = () => `${steps(0)}
    <h2 id="wt-title">Welcome to FishWise SG</h2>
    <p class="muted">Three quick questions and we will point you to the right spot, lesson and gear. How much have you fished?</p>
    <div class="wt-opts">${LEVELS.map(([k, l, d]) => `<button type="button" class="wt-opt" data-level="${k}"><b>${l}</b><span>${d}</span></button>`).join('')}</div>`;
  const step2 = () => `${steps(1)}
    <h2 id="wt-title">Where in Singapore are you?</h2>
    <p class="muted">We will suggest a legal spot near you. Nothing is shared — it stays on this device.</p>
    <div class="wt-opts is-grid">${AREAS.map(([a]) => `<button type="button" class="wt-opt" data-area="${a}"><b>${a}</b></button>`).join('')}</div>
    <button type="button" class="link-btn" data-back="1">${icon('arrowLeft', 14)} Back</button>`;
  const step3 = () => {
    const spot = nearestSpot(v.area);
    const lesson = firstLesson(v.level);
    v.spot = spot.id;
    return `${steps(2)}
    <h2 id="wt-title">Here is your start</h2>
    <div class="wt-cards">
      <a class="wt-card" href="#/plan?spot=${spot.id}" data-go><span>${icon('locations', 18)}</span><div><p class="eyebrow">Your first spot</p><b>${esc(spot.name)}</b><small>Listed on the official page · check if today is a good day</small></div>${icon('chevronRight', 16)}</a>
      <a class="wt-card" href="#/academy/${lesson.id}" data-go><span>${icon(lesson.kind === '3d' ? 'cube' : 'academy', 18)}</span><div><p class="eyebrow">Your first lesson</p><b>${esc(lesson.title)}</b><small>${lesson.minutes} min${lesson.kind === '3d' ? ' · interactive 3D' : ''} · earns points</small></div>${icon('chevronRight', 16)}</a>
      <a class="wt-card" href="#/store?spot=${spot.id}" data-go><span>${icon('bag', 18)}</span><div><p class="eyebrow">Your gear list</p><b>Build a legal kit for ${esc(spot.name)}</b><small>We match you to gear and tell you where to buy it</small></div>${icon('chevronRight', 16)}</a>
    </div>
    <div class="wt-foot"><button type="button" class="link-btn" data-back="2">${icon('arrowLeft', 14)} Back</button><a class="btn btn-primary" href="#/plan?spot=${spot.id}" data-go>${icon('route', 16)} Should I go today?</a></div>`;
  };

  openModal({
    labelledBy: 'wt-title',
    html: `<div class="modal-body wt" id="wt-body">${step1()}</div>
      <div class="modal-foot"><button class="btn btn-ghost btn-sm" type="button" data-skip>Skip for now</button></div>`,
    onClose() { save(v); },
    onMount(panel) {
      const body = panel.querySelector('#wt-body');
      const show = (html) => { body.innerHTML = html; body.querySelector('button, a')?.focus({ preventScroll: true }); };
      panel.addEventListener('click', (e) => {
        const lv = e.target.closest('[data-level]');
        const ar = e.target.closest('[data-area]');
        const back = e.target.closest('[data-back]');
        if (lv) { v.level = lv.dataset.level; show(step2()); }
        else if (ar) { v.area = ar.dataset.area; show(step3()); }
        else if (back) show(back.dataset.back === '1' ? step1() : step2());
        else if (e.target.closest('[data-go]')) { save(v); closeModal({ silent: true }); }
        else if (e.target.closest('[data-skip]')) { save(v); closeModal(); }
      });
    },
  });
}
