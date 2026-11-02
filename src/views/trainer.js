/**
 * 3D lessons
 *   #/trainer          hub: the four interactive 3D lessons and your progress
 *   #/trainer/<scene>  full-size player
 */

import { icon } from '../icons.js';
import { esc, toast } from '../ui.js';
import { POINTS, findLesson } from '../data/courses.js';
import { recordScene, getLearning } from '../progress.js';
import { pageHead } from '../components.js';
import { SCENE_ORDER, sceneMeta, playerHTML, mountPlayer } from '../three/player.js';

const ART = {
  knot: `<svg viewBox="0 0 120 70" aria-hidden="true"><circle cx="86" cy="22" r="8" fill="none" stroke="#9aa5b1" stroke-width="3"/><path d="M86 30v18c0 10 14 10 14 0v-6" fill="none" stroke="#9aa5b1" stroke-width="3" stroke-linecap="round"/><path d="M8 22h70" stroke="#d8f05a" stroke-width="3"/><path d="M78 22c8 0 8-8 0-8" fill="none" stroke="#ff8a3d" stroke-width="3"/>${[0, 1, 2, 3, 4, 5].map((i) => `<ellipse cx="${70 - i * 7}" cy="22" rx="3" ry="6" fill="none" stroke="#ff8a3d" stroke-width="2.5"/>`).join('')}<path d="M30 16c-6-6-14-2-16 4" fill="none" stroke="#ff8a3d" stroke-width="3" stroke-linecap="round"/></svg>`,
  cast: `<svg viewBox="0 0 120 70" aria-hidden="true"><rect x="0" y="50" width="120" height="20" fill="#1d7480"/><rect x="0" y="44" width="38" height="5" fill="#8b6a48"/><circle cx="22" cy="28" r="4" fill="#c48e66"/><rect x="19" y="32" width="6" height="12" rx="3" fill="#123449"/><path d="M24 34 L52 6" stroke="#1a1a1a" stroke-width="2.5" stroke-linecap="round"/><path d="M52 6 Q80 0 104 50" fill="none" stroke="#f6f3e6" stroke-width="1.5" stroke-dasharray="3 2"/><circle cx="104" cy="50" r="3" fill="#e2683c"/><path d="M8 22 A26 26 0 0 1 40 12" fill="none" stroke="#2dd4bf" stroke-width="1.5" stroke-dasharray="2 2"/></svg>`,
  water: `<svg viewBox="0 0 120 70" aria-hidden="true"><path d="M0 18h120v52H0z" fill="#2a8f95" opacity=".55"/><path d="M0 40 Q30 42 50 46 T120 62 V70 H0z" fill="#6e6a4c" opacity=".8"/><path d="M0 34 Q20 34 40 38 T70 44 L70 70 H0z" fill="#d8c597" opacity=".85"/>${[12, 18, 24, 30].map((x) => `<path d="M${x} 40 q2 -10 0 -18" stroke="#4c7a2c" stroke-width="2" fill="none"/>`).join('')}<rect x="66" y="10" width="54" height="4" fill="#8b6a48"/>${[70, 84, 98, 112].map((x) => `<rect x="${x}" y="14" width="2.5" height="40" fill="#4c3826"/>`).join('')}<circle cx="92" cy="40" r="10" fill="none" stroke="#16c79a" stroke-width="2"/></svg>`,
  handling: `<svg viewBox="0 0 120 70" aria-hidden="true"><rect x="8" y="50" width="104" height="8" rx="2" fill="#f1ead9"/><ellipse cx="58" cy="34" rx="34" ry="12" fill="#7d8a93"/><path d="M24 34 l-14 -10 v20z" fill="#6c7880"/><path d="M66 22 l6 -14" stroke="#e8d9b5" stroke-width="3" stroke-linecap="round"/><path d="M90 30 q10 4 14 12" stroke="#4c555c" stroke-width="1.5" fill="none"/><circle cx="72" cy="8" r="4" fill="#e5484d"/><circle cx="80" cy="38" r="4" fill="#e5484d"/><circle cx="84" cy="30" r="2.5" fill="#111"/></svg>`,
};

function hub() {
  const learning = getLearning();
  return `
  ${pageHead({
    eyebrow: '3D lessons',
    title: 'Learn by doing, in 3D',
    lede: 'Interactive lessons you can rotate, replay and practise. Each one is part of an Academy track and counts as a completed lesson when you finish its activity.',
    actions: `<a class="btn btn-secondary" href="#/academy">${icon('academy', 16)} Academy</a>`,
  })}
  <div class="hub-grid">
    ${SCENE_ORDER.map((id) => {
      const m = sceneMeta(id);
      const lesson = findLesson(m.lessonId);
      const done = !!learning.scenes[id] || !!learning.completed[m.lessonId];
      const r = learning.scenes[id]?.result || {};
      const best = r.score !== undefined ? `Best score ${r.score}/${r.max}` : r.distance !== undefined ? `Best cast ${r.distance} m` : '';
      return `
      <a class="card hub-card" href="#/trainer/${id}">
        <div class="hub-art">${ART[id]}</div>
        <div class="hub-body">
          <div class="badge-row">
            <span class="badge badge-planned">${esc(lesson?.track.title || '')}</span>
            ${done ? `<span class="badge badge-completed">${icon('checkCircle', 12)} Complete</span>` : ''}
          </div>
          <h2>${esc(m.title)}</h2>
          <p class="small muted">${esc(m.subtitle)} · ${m.steps.length} steps · ${m.minutes} min</p>
          <p class="small">${esc(m.goal)}</p>
          ${best ? `<p class="small muted">${esc(best)}</p>` : ''}
          <span class="loc-open">${done ? 'Play again' : 'Start lesson'} ${icon('arrowRight', 14)}</span>
        </div>
      </a>`;
    }).join('')}
  </div>
  <p class="small muted" style="margin-top:1rem">Tip: use the camera buttons in the top-left of each scene, drag to orbit, scroll or pinch to zoom, and press ← → to move between steps.</p>`;
}

export function render(ctx, param) {
  if (!param || !sceneMeta(param)) return hub();
  const m = sceneMeta(param);
  const lesson = findLesson(m.lessonId);
  return `
  <nav class="crumbs small" aria-label="Breadcrumb"><a href="#/trainer">3D lessons</a> ${icon('chevronRight', 12)} <span aria-current="page">${esc(m.title)}</span></nav>
  <header class="lesson-top">
    <div>
      <p class="eyebrow">3D lesson · ${esc(lesson?.track.title || '')} · ${m.minutes} min</p>
      <h1 id="page-title" tabindex="-1">${esc(m.title)}</h1>
    </div>
    <a class="btn btn-secondary btn-sm" href="#/academy/${m.lessonId}">${icon('book', 15)} Lesson & quiz</a>
  </header>
  ${playerHTML(param)}`;
}

export function mount(root, ctx, param) {
  if (!param || !sceneMeta(param)) return undefined;
  const m = sceneMeta(param);
  return mountPlayer(root, param, {
    completed: !!getLearning().scenes[param],
    onComplete(sceneId, result) {
      const wasDone = !!getLearning().completed[m.lessonId];
      recordScene(sceneId, m.lessonId, result);
      if (!wasDone) toast(`3D lesson complete · +${POINTS.lesson} points`, 'cube');
      ctx.refreshChrome();
    },
  });
}
