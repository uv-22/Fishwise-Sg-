/**
 * 3D lesson: fish the tide.
 *
 * A jetty over a sloping shore. Drag through a day of Singapore's mixed,
 * semi-diurnal tide (two highs and two lows of different heights) and watch
 * the water rise and fall on the pylons while the current speeds up and
 * slows down. Three rounds: find high tide, find the strongest current,
 * pick the best window for a jetty predator.
 */

import { createWater } from '../stage.js';

export const meta = {
  id: 'tide',
  title: 'Fish the tide',
  subtitle: 'Read a tide chart like a local',
  minutes: 7,
  lessonId: 'x7-tides',
  goal: 'Answer all three rounds by dragging the clock to the right time and locking it in.',
  steps: [
    { title: 'Find high tide', text: 'Singapore usually has two high and two low tides a day, about six hours apart, and the two highs are not the same height. Drag the clock to the higher high tide.' },
    { title: 'When is the current strongest?', text: 'The current is weakest at high and low tide (slack water) and strongest halfway between. Drag to a time when the water is moving fastest.' },
    { title: 'Pick the barramundi window', text: 'Jetty predators often feed on a rising tide as moving water carries bait past the pylons, through to the turn at high. Pick a time in the last couple of hours before high tide.' },
  ],
};

// Mixed semi-diurnal tide in metres above chart datum (illustrative).
const level = (h) => 1.65 + 0.95 * Math.cos((2 * Math.PI * (h - 4.2)) / 12.42) + 0.3 * Math.cos((2 * Math.PI * (h - 6)) / 24.84);
const slope = (h) => (level(h + 0.05) - level(h - 0.05)) / 0.1;

function extremes() {
  const out = [];
  for (let h = 0.05; h < 24; h += 0.05) {
    const a = slope(h - 0.05), b = slope(h);
    if (a > 0 && b <= 0) out.push({ h, kind: 'high', v: level(h) });
    if (a < 0 && b >= 0) out.push({ h, kind: 'low', v: level(h) });
  }
  return out;
}
const EXT = extremes();
const HIGHS = EXT.filter((e) => e.kind === 'high');
const TOP = HIGHS.reduce((a, b) => (b.v > a.v ? b : a));
const fmt = (h) => { const hh = Math.floor(h) % 24; const mm = Math.round((h - Math.floor(h)) * 60); return `${String(hh).padStart(2, '0')}:${String(mm === 60 ? 0 : mm).padStart(2, '0')}`; };

const ROUNDS = [
  { check: (h) => Math.abs(h - TOP.h) <= 0.6, partial: (h) => HIGHS.some((e) => Math.abs(h - e.h) <= 0.6),
    good: 'Yes — that is the higher high tide. The water is at its highest and about to turn.', part: 'That is a high tide, but the other one is higher. Singapore’s two daily highs are not the same.', bad: 'Not quite. High tide is a peak on the curve: the water stops rising and starts to fall.' },
  { check: (h) => Math.abs(slope(h)) >= 0.42, partial: (h) => Math.abs(slope(h)) >= 0.3,
    good: 'Right. Halfway between high and low the water moves fastest — the “rule of twelfths” says the middle two hours move half the water.', part: 'The water is moving, but there are faster times. Look for the steepest part of the curve.', bad: 'The curve is flat here — that is slack water, when the current almost stops.' },
  { check: (h) => HIGHS.some((e) => h >= e.h - 2.6 && h <= e.h + 0.3), partial: (h) => slope(h) > 0.1,
    good: 'Good call. The last hours of the rising tide into high water push bait along the pylons — prime time for barramundi and jacks.', part: 'The tide is rising, which helps, but the best window is closer to high tide.', bad: 'The tide is falling or slack here. For jetty predators, aim for the last couple of hours of the rising tide.' },
];

export async function create(stage, api) {
  const { THREE, scene, mat } = stage;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  stage.camera.position.set(-14, 7, 16);
  stage.controls.target.set(0, 0.6, 0);
  stage.controls.maxDistance = 45;

  /* ---------- Sloping shore + seabed ---------- */
  const bedGeo = new THREE.PlaneGeometry(60, 40, 90, 60);
  bedGeo.rotateX(-Math.PI / 2);
  const bp = bedGeo.attributes.position;
  const col = [];
  const sand = new THREE.Color('#d6c393'), mud = new THREE.Color('#5f5a43'), grass = new THREE.Color('#4f7d3a');
  for (let i = 0; i < bp.count; i += 1) {
    const x = bp.getX(i), z = bp.getZ(i);
    const y = -2.6 + 0.24 * (-x) + Math.sin(z * 0.4) * 0.15; // shore rises to the west (-x)
    const yy = Math.min(4.2, y);
    bp.setY(i, yy);
    const c = yy > 3.4 ? grass : yy > 0 ? sand.clone().lerp(mud, 0.15) : mud.clone().lerp(sand, Math.max(0, (yy + 2.6) / 4));
    col.push(c.r, c.g, c.b);
  }
  bedGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  bedGeo.computeVertexNormals();
  const bed = new THREE.Mesh(bedGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
  bed.receiveShadow = true;
  scene.add(bed);

  const water = createWater(stage, { width: 60, depth: 40, segX: 80, segZ: 50, color: '#2a8f95', opacity: 0.6, amp: 0.7 });

  /* ---------- Jetty with a tide gauge ---------- */
  const jetty = new THREE.Group();
  const deck = new THREE.Mesh(new THREE.BoxGeometry(22, 0.25, 2.4), mat('#8b6a48', { roughness: 0.9 }));
  deck.position.set(1, 4.4, 0);
  jetty.add(deck);
  for (let x = -9; x <= 11; x += 2.5) {
    [-1, 1].forEach((z) => {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 8, 10), mat('#4c3826'));
      p.position.set(x, 0.4, z);
      jetty.add(p);
    });
  }
  // Gauge board on the end pylon, marked every 0.5 m
  const gauge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 4, 0.5), mat('#f4f1ea'));
  gauge.position.set(11.25, 1.8, 1);
  jetty.add(gauge);
  for (let m = 0; m <= 3.5; m += 0.5) {
    const tick = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, m % 1 === 0 ? 0.5 : 0.28), mat('#1b2a3a'));
    tick.position.set(11.29, -0.2 + m, 1 + (m % 1 === 0 ? 0 : 0.11));
    jetty.add(tick);
  }
  stage.shadowAll(jetty);
  scene.add(jetty);
  const gaugeLabel = stage.addLabel('', V(11.6, 3.9, 1.2), 'is-plain');

  /* ---------- Current particles ---------- */
  const N = 360;
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i += 1) { pos[i * 3] = -6 + Math.random() * 26; pos[i * 3 + 2] = -14 + Math.random() * 28; }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const flow = new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 0.1, transparent: true, opacity: 0.85 }));
  scene.add(flow);

  /* ---------- State ---------- */
  const st = { h: 9, shown: 9, round: 0, answers: [], playing: false };
  const H = (h) => level(h) - 1.6; // map chart datum to scene height (y = 0 ≈ mean level)

  function chartSVG() {
    const W = 300, Hh = 110;
    const pts = [];
    for (let h = 0; h <= 24; h += 0.25) pts.push(`${(h / 24) * W},${Hh - 8 - (level(h) / 3.2) * (Hh - 20)}`);
    const x = (st.h / 24) * W, y = Hh - 8 - (level(st.h) / 3.2) * (Hh - 20);
    const marks = EXT.map((e) => `<text x="${(e.h / 24) * W}" y="${e.kind === 'high' ? Hh - 8 - (e.v / 3.2) * (Hh - 20) - 6 : Hh - 8 - (e.v / 3.2) * (Hh - 20) + 14}" text-anchor="middle" font-size="9" fill="#8FA0BA">${e.kind === 'high' ? 'H' : 'L'} ${e.v.toFixed(1)}</text>`).join('');
    return `<svg viewBox="0 0 ${W} ${Hh}" style="width:100%;height:auto;display:block" aria-hidden="true">
      ${[0, 6, 12, 18, 24].map((h) => `<line x1="${(h / 24) * W}" x2="${(h / 24) * W}" y1="0" y2="${Hh - 8}" stroke="rgba(124,196,255,.12)"/><text x="${Math.min(W - 10, Math.max(8, (h / 24) * W))}" y="${Hh}" text-anchor="middle" font-size="8" fill="#5F7090">${String(h).padStart(2, '0')}:00</text>`).join('')}
      <polyline points="${pts.join(' ')}" fill="none" stroke="#7CC4FF" stroke-width="2"/>
      ${marks}
      <line x1="${x}" x2="${x}" y1="0" y2="${Hh - 8}" stroke="#F5B455" stroke-width="1.5"/>
      <circle cx="${x}" cy="${y}" r="4.5" fill="#F5B455"/>
    </svg>`;
  }

  function stateText(h) {
    const s = slope(h);
    const dir = Math.abs(s) < 0.08 ? 'Slack water' : s > 0 ? 'Rising (flood tide)' : 'Falling (ebb tide)';
    const speed = Math.abs(s) >= 0.42 ? 'strong current' : Math.abs(s) >= 0.2 ? 'moderate current' : 'little current';
    return `${dir} · ${speed}`;
  }

  function panel() {
    const r = ROUNDS[st.round];
    const ans = st.answers[st.round];
    const score = st.answers.reduce((n, a) => n + (a ? a.s : 0), 0);
    api.setPanel(`
      <h3 class="p3d-panel-title">Round ${st.round + 1} of 3</h3>
      <p class="small">${meta.steps[st.round].text}</p>
      <div class="tide-chart">${chartSVG()}</div>
      <div class="tide-read"><b id="td-time">${fmt(st.h)}</b><span id="td-lvl">${level(st.h).toFixed(2)} m</span><span id="td-state">${stateText(st.h)}</span></div>
      <label class="sr-only" for="td-h">Time of day</label>
      <input type="range" id="td-h" min="0" max="23.9" step="0.1" value="${st.h}" style="width:100%" ${ans ? 'disabled' : ''} />
      ${ans ? `<div class="notice notice-${ans.s === 2 ? 'teal' : ans.s ? 'amber' : 'red'}" style="margin-top:.6rem"><div><strong>${ans.s === 2 ? 'Correct! +2' : ans.s ? 'Close — +1' : 'Not this time — 0'}</strong><br>${ans.msg}</div></div>
        ${st.round < 2 ? '<button class="btn btn-primary btn-block" type="button" id="td-next" style="margin-top:.6rem">Next round</button>' : ''}`
        : '<button class="btn btn-primary btn-block" type="button" id="td-lock" style="margin-top:.5rem">Lock in this time</button>'}
      <div class="score-row"><span>Score</span><b>${score} / 6</b><span class="muted small">${st.answers.filter(Boolean).length}/3 rounds</span></div>
      ${st.answers.filter(Boolean).length === 3 ? '<button class="btn btn-secondary btn-block btn-sm" type="button" id="td-again">Play again</button>' : ''}`,
    (el) => {
      el.querySelector('#td-h')?.addEventListener('input', (e) => { st.h = Number(e.target.value); soft(el); });
      el.querySelector('#td-lock')?.addEventListener('click', () => lock(r));
      el.querySelector('#td-next')?.addEventListener('click', () => go(st.round + 1));
      el.querySelector('#td-again')?.addEventListener('click', restart);
    });
  }
  function soft(el) {
    el.querySelector('.tide-chart').innerHTML = chartSVG();
    el.querySelector('#td-time').textContent = fmt(st.h);
    el.querySelector('#td-lvl').textContent = `${level(st.h).toFixed(2)} m`;
    el.querySelector('#td-state').textContent = stateText(st.h);
  }
  function lock(r) {
    const s = r.check(st.h) ? 2 : r.partial(st.h) ? 1 : 0;
    st.answers[st.round] = { s, msg: s === 2 ? r.good : s ? r.part : r.bad, h: st.h };
    if (st.answers.filter(Boolean).length === 3) api.complete({ score: st.answers.reduce((n, a) => n + a.s, 0), max: 6 });
    panel();
  }
  function go(i) {
    st.round = Math.max(0, Math.min(2, i));
    api.setStep(st.round);
    const a = st.answers[st.round];
    if (a) st.h = a.h;
    panel();
  }
  function restart() { st.answers = []; st.h = 9; go(0); }

  stage.onFrame((dt) => {
    st.shown += (st.h - st.shown) * Math.min(1, dt * 3);
    const y = H(st.shown);
    water.position.y = y;
    gaugeLabel.setText(`${level(st.shown).toFixed(2)} m`);
    const s = slope(st.shown);
    const sp = s * 5; // + flood to the west (toward shore), − ebb
    const p = g.attributes.position.array;
    for (let i = 0; i < N; i += 1) {
      p[i * 3] -= sp * dt * (0.7 + (i % 5) * 0.12);
      p[i * 3 + 1] = y + 0.09;
      if (p[i * 3] < -6) p[i * 3] = 20;
      if (p[i * 3] > 20) p[i * 3] = -6;
    }
    g.attributes.position.needsUpdate = true;
    flow.material.opacity = 0.25 + Math.min(0.7, Math.abs(s) * 1.4);
  });

  go(0);

  const CAMS = {
    overview: { label: 'Overview', pos: [-14, 7, 16], target: [0, 0.6, 0] },
    gauge: { label: 'Tide gauge', pos: [15, 2.5, 6], target: [11, 1.4, 1] },
    shore: { label: 'Shoreline', pos: [-16, 5, 4], target: [-6, 1, 0] },
  };
  return {
    cameras: CAMS,
    setCamera(id) { const c = CAMS[id]; if (c) stage.moveCamera(c.pos, c.target, 1); },
    goto(i) { go(i); },
    setPlaying() {},
    setSpeed() {},
    restart,
    interactive: true,
  };
}
