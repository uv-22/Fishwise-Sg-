/**
 * 3D lesson player — wraps a scene with step navigation, playback, camera
 * presets, a results overlay and completion tracking. Used by the 3D lessons
 * hub (#/trainer/<scene>) and embedded inside Academy lessons.
 */

import { icon } from '../icons.js';
import { esc } from '../ui.js';
import { loadThree, createStage, webglAvailable } from './stage.js';
import * as cast from './scenes/cast.js';
import * as knot from './scenes/knot.js';
import * as water from './scenes/read-water.js';
import * as handling from './scenes/handling.js';

export const SCENES = { cast, knot, water, handling };
export const SCENE_ORDER = ['knot', 'cast', 'water', 'handling'];

export function sceneMeta(id) {
  return SCENES[id]?.meta || null;
}

export function playerHTML(sceneId, { embedded = false } = {}) {
  const m = sceneMeta(sceneId);
  if (!m) return '';
  return `
  <section class="p3d ${embedded ? 'is-embedded' : ''}" id="p3d" aria-label="3D lesson: ${esc(m.title)}" tabindex="-1">
    <div class="p3d-main">
      <div class="p3d-stage" id="p3d-stage">
        <div class="p3d-labels" id="p3d-labels" aria-hidden="true"></div>
        <div class="p3d-hud" id="p3d-hud"></div>
        <div class="p3d-cams" id="p3d-cams" role="group" aria-label="Camera views"></div>
        <div class="p3d-result" id="p3d-result" role="status" hidden></div>
        <div class="p3d-loading" id="p3d-loading"><span class="spinner"></span> Loading 3D lesson…</div>
        <button class="p3d-fs" type="button" id="p3d-fs" aria-label="Full screen">${icon('expand', 17)}</button>
      </div>
      <div class="p3d-bar">
        <button class="btn-icon" type="button" id="p3d-prev" aria-label="Previous step">${icon('skipBack', 18)}</button>
        <button class="btn btn-primary btn-sm" type="button" id="p3d-play">${icon('pause', 15)} Pause</button>
        <button class="btn-icon" type="button" id="p3d-next" aria-label="Next step">${icon('skipForward', 18)}</button>
        <div class="p3d-dots" id="p3d-dots">${m.steps.map((s, i) => `<button type="button" data-step="${i}" aria-label="Step ${i + 1}: ${esc(s.title)}"></button>`).join('')}</div>
        <label class="small muted p3d-speed">Speed
          <select class="select select-sm" id="p3d-speed"><option value="0.25">¼×</option><option value="0.5">½×</option><option value="1" selected>1×</option><option value="1.5">1½×</option></select>
        </label>
        <button class="btn btn-ghost btn-sm" type="button" id="p3d-restart">${icon('rotate', 15)} Restart</button>
      </div>
    </div>
    <aside class="p3d-side">
      <div class="p3d-stepcard">
        <p class="eyebrow" id="p3d-count">Step 1 of ${m.steps.length}</p>
        <h2 id="p3d-title">${esc(m.steps[0].title)}</h2>
        <p id="p3d-text">${esc(m.steps[0].text)}</p>
      </div>
      <ol class="p3d-steps" id="p3d-steps">
        ${m.steps.map((s, i) => `<li><button type="button" data-step="${i}"><span>${i + 1}</span>${esc(s.title)}</button></li>`).join('')}
      </ol>
      <div class="p3d-panel" id="p3d-panel"></div>
      <div class="p3d-goal" id="p3d-goal">${icon('target', 15)} <span><b>Goal:</b> ${esc(m.goal)}</span></div>
    </aside>
  </section>`;
}

/**
 * @param {HTMLElement} root   element containing playerHTML output
 * @param {string} sceneId
 * @param {{ onComplete?: (sceneId: string, result: object) => void, completed?: boolean }} opts
 * @returns {() => void} cleanup
 */
export function mountPlayer(root, sceneId, { onComplete, completed = false } = {}) {
  const mod = SCENES[sceneId];
  const m = mod.meta;
  const $ = (sel) => root.querySelector(sel);
  const el = {
    player: $('#p3d'), stage: $('#p3d-stage'), labels: $('#p3d-labels'), hud: $('#p3d-hud'), cams: $('#p3d-cams'),
    result: $('#p3d-result'), loading: $('#p3d-loading'), play: $('#p3d-play'), count: $('#p3d-count'),
    title: $('#p3d-title'), text: $('#p3d-text'), steps: $('#p3d-steps'), dots: $('#p3d-dots'), panel: $('#p3d-panel'), goal: $('#p3d-goal'),
  };
  let stage = null;
  let instance = null;
  let disposed = false;
  let playing = true;
  let done = completed;
  let current = 0;

  const markDone = () => {
    el.goal.classList.add('is-done');
    el.goal.innerHTML = `${icon('checkCircle', 15)} <span><b>Lesson complete.</b> ${esc(m.goal)}</span>`;
  };
  if (done) markDone();

  const setPlayingUI = (on) => {
    playing = on;
    el.play.innerHTML = on ? `${icon('pause', 15)} Pause` : `${icon('play', 15)} Play`;
  };

  const api = {
    setStep(i) {
      current = i;
      const s = m.steps[i];
      el.count.textContent = `Step ${i + 1} of ${m.steps.length}`;
      el.title.textContent = s.title;
      el.text.textContent = s.text;
      el.steps.querySelectorAll('button').forEach((b, k) => b.classList.toggle('is-on', k === i));
      el.dots.querySelectorAll('button').forEach((b, k) => {
        b.classList.toggle('is-on', k === i);
        b.classList.toggle('is-past', k < i);
      });
    },
    setHud(html) { el.hud.innerHTML = html; },
    setPanel(html, onMount) {
      el.panel.innerHTML = html;
      if (onMount) onMount(el.panel);
    },
    result(v, info) {
      el.result.className = `p3d-result tone-${v.tone}`;
      el.result.textContent = v.text + (info?.fromTarget !== undefined && v.grade === 'good' && info.fromTarget < 2 ? ' Bullseye on the buoy!' : '');
      el.result.hidden = false;
      instance?.recordCast?.(v, info);
      if (info?.practice && v.grade === 'good') api.complete({ distance: Math.round(info.distance * 10) / 10, release: info.release });
    },
    clearResult() { el.result.hidden = true; },
    complete(result) {
      if (!done) {
        done = true;
        markDone();
      }
      onComplete?.(sceneId, result || {});
    },
    setPlaying(on) { setPlayingUI(on); },
  };

  // Controls
  el.play.addEventListener('click', () => {
    setPlayingUI(!playing);
    instance?.setPlaying(playing);
  });
  $('#p3d-prev').addEventListener('click', () => instance?.goto(Math.max(0, current - 1)));
  $('#p3d-next').addEventListener('click', () => instance?.goto(Math.min(m.steps.length - 1, current + 1)));
  $('#p3d-restart').addEventListener('click', () => instance?.restart());
  $('#p3d-speed').addEventListener('change', (e) => instance?.setSpeed(Number(e.target.value)));
  root.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => instance?.goto(Number(b.dataset.step))));
  $('#p3d-fs').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else el.player.requestFullscreen?.().catch(() => {});
  });
  el.player.addEventListener('keydown', (e) => {
    if (e.target.closest('input, select, textarea')) return;
    if (e.key === 'ArrowRight') { instance?.goto(Math.min(m.steps.length - 1, current + 1)); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { instance?.goto(Math.max(0, current - 1)); e.preventDefault(); }
    if (e.key === ' ') { el.play.click(); e.preventDefault(); }
  });

  if (!webglAvailable()) {
    el.loading.innerHTML = `${icon('alert', 16)} 3D needs WebGL, which this browser has turned off. The steps on the right still walk you through the lesson.`;
    api.setStep(0);
    return () => {};
  }

  loadThree()
    .then(async () => {
      if (disposed || !root.isConnected) return;
      stage = createStage(el.stage, el.labels, sceneId === 'knot' || sceneId === 'handling'
        ? { skyTop: '#cfe0e6', skyHorizon: '#f3f1ea', fog: false, exposure: 1.05 }
        : {});
      instance = await mod.create(stage, api);
      if (disposed) return;
      if (new URLSearchParams(location.search).has('debug3d')) window.__p3d = { stage, instance, api };
      el.loading.remove();
      if (instance.cameras) {
        el.cams.innerHTML = Object.entries(instance.cameras)
          .map(([id, c], i) => `<button type="button" data-cam="${id}" aria-pressed="${i === 0}">${esc(c.label)}</button>`).join('');
        el.cams.querySelectorAll('[data-cam]').forEach((b) => b.addEventListener('click', () => {
          el.cams.querySelectorAll('[data-cam]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
          instance.setCamera(b.dataset.cam);
        }));
      }
      if (instance.interactive) {
        el.play.hidden = true;
        $('.p3d-speed').hidden = true;
      }
      if (stage.reduced && !instance.interactive) {
        setPlayingUI(false);
        instance.setPlaying(false);
      }
    })
    .catch((err) => {
      console.error(err);
      if (el.loading.isConnected) el.loading.innerHTML = `${icon('alert', 16)} The 3D library could not load. Check your connection and refresh.`;
    });

  return () => {
    disposed = true;
    if (document.fullscreenElement === el.player) document.exitFullscreen?.();
    stage?.dispose();
  };
}
