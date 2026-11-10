/**
 * 3D lesson: lightning — flash to bang.
 *
 * A jetty at dusk with a storm building over the sea. Each round a bolt
 * strikes; a stopwatch runs from the flash until the thunder arrives (sped
 * up, and labelled so). The learner works out the distance (seconds ÷ 3 = km)
 * and decides what to do, using the 30-30 rule.
 */

import { createWater } from '../stage.js';

export const meta = {
  id: 'storm',
  title: 'Lightning: when to leave',
  subtitle: 'Flash-to-bang and the 30-30 rule',
  minutes: 6,
  lessonId: 'b7-lightning',
  stage: { skyTop: '#1a2230', skyHorizon: '#56606e', fogNear: 30, fogFar: 120, exposure: 0.9 },
  goal: 'Make the safe call in all four rounds.',
  steps: [
    { title: 'A storm on the horizon', text: 'You are on a jetty. Watch for the flash, then count the seconds until you hear thunder. Every 3 seconds is about 1 km.' },
    { title: 'Closer now', text: 'Another flash. Count again — is the storm coming towards you?' },
    { title: 'Right on top of you', text: 'The flash and the bang are almost together. What now?' },
    { title: 'It seems to be over', text: 'The rain has eased and the last thunder was a while ago. Can you go back out?' },
  ],
};

const OPTIONS = {
  keep: 'Keep fishing, but watch it and check the NEA lightning alerts',
  leave: 'Pack up now and get into a building or a hard-top car',
  open: 'Shelter under the jetty roof, a tree or an umbrella',
  back: 'Go back out now — the rain has stopped',
  wait: 'Wait until 30 minutes have passed since the last thunder',
};
const ROUNDS = [
  { secs: 45, dist: 15, choices: ['keep', 'leave', 'open'], best: 'keep', ok: ['leave'],
    why: { keep: '45 seconds ÷ 3 ≈ 15 km away. That is outside the 30-second danger line, so you can keep fishing for now — but keep counting and have your gear ready.', leave: 'Leaving early is never wrong — 15 km away is outside the 30-second line, so you could also stay and keep counting.', open: 'Open shelters, trees and umbrellas do not protect you from lightning. At 15 km you can keep fishing for now and keep counting.' } },
  { secs: 24, dist: 8, choices: ['keep', 'open', 'leave'], best: 'leave', ok: [],
    why: { leave: '24 seconds ≈ 8 km. Under 30 seconds means you are within reach of the next strike. Leave now — lightning can hit well ahead of the rain.', keep: 'Under 30 seconds is the danger line. Lightning can strike 10 km or more ahead of a storm — leave now.', open: 'Jetty shelters, trees and umbrellas are not safe. Get into a proper building or a hard-top car.' } },
  { secs: 3, dist: 1, choices: ['open', 'leave', 'keep'], best: 'leave', ok: [],
    why: { leave: 'About 1 km away — very dangerous. Drop your rod, get off the jetty and into a building or car straight away. Do not wait to pack neatly.', open: 'An open shelter is not safe, and standing on a jetty over water is one of the worst places to be. Get off it now.', keep: 'The storm is overhead. A rod is the tallest thing on a jetty. Leave immediately.' } },
  { secs: null, dist: null, mins: 18, choices: ['back', 'wait'], best: 'wait', ok: [],
    why: { wait: 'Right. Wait 30 minutes after the last thunder before you go back out. Storms can strike again as they move away.', back: 'Too soon. It has only been 18 minutes. Wait 30 minutes after the last thunder — the storm can still reach you.' } },
];
const SPEED = 3; // stopwatch speed-up for the simulation

export async function create(stage, api) {
  const { THREE, scene, mat } = stage;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  stage.camera.position.set(-6, 4.2, 12);
  stage.controls.target.set(6, 3, -10);
  stage.controls.maxDistance = 40;
  stage.sun.intensity = 0.6;
  stage.hemi.intensity = 0.35;

  const water = createWater(stage, { width: 200, depth: 200, segX: 100, segZ: 100, z: -60, color: '#22454f', opacity: 0.95, amp: 1.6 });
  void water;

  /* ---------- Jetty ---------- */
  const jetty = new THREE.Group();
  const deck = new THREE.Mesh(new THREE.BoxGeometry(3, 0.25, 26), mat('#6f563c', { roughness: 0.9 }));
  deck.position.set(0, 1.6, 2);
  jetty.add(deck);
  for (let z = -10; z <= 14; z += 3) [-1.3, 1.3].forEach((x) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 4, 8), mat('#3e2e20')); p.position.set(x, -0.3, z); jetty.add(p); });
  const roof = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.12, 3), mat('#2f3b48'));
  roof.position.set(0, 4.1, 8);
  jetty.add(roof);
  [[-1.5, 6.7], [1.5, 6.7], [-1.5, 9.3], [1.5, 9.3]].forEach(([x, z]) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6), mat('#9aa5b1', { metalness: 0.6 })); p.position.set(x, 2.9, z); jetty.add(p); });
  // Rod leaning on the rail — tallest thing around
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.05, 3.6, 6), mat('#1b1b1b'));
  rod.position.set(1.1, 3.3, -6);
  rod.rotation.z = -0.35;
  jetty.add(rod);
  stage.shadowAll(jetty);
  scene.add(jetty);
  stage.addLabel('Open jetty shelter', V(0, 4.7, 8), 'is-plain');

  /* ---------- Storm clouds ---------- */
  const clouds = new THREE.Group();
  const cm = mat('#3b4452', { roughness: 1, transparent: true, opacity: 0.95 });
  for (let i = 0; i < 46; i += 1) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(3 + Math.random() * 4, 12, 10), cm);
    s.position.set((Math.random() - 0.5) * 60, 16 + Math.random() * 6, (Math.random() - 0.5) * 14);
    s.scale.y = 0.55;
    clouds.add(s);
  }
  scene.add(clouds);

  /* ---------- Lightning ---------- */
  const boltMat = new THREE.LineBasicMaterial({ color: '#e9f2ff', transparent: true, opacity: 0 });
  const boltGeo = new THREE.BufferGeometry();
  const bolt = new THREE.Line(boltGeo, boltMat);
  scene.add(bolt);
  const flashLight = new THREE.PointLight('#cfe2ff', 0, 400, 1.2);
  scene.add(flashLight);
  function makeBolt(x, z) {
    const pts = [];
    let px = x, py = 17;
    pts.push(V(px, py, z));
    while (py > 0.2) { py -= 0.8 + Math.random() * 1.4; px += (Math.random() - 0.5) * 2.2; pts.push(V(px, Math.max(0, py), z + (Math.random() - 0.5))); }
    boltGeo.setFromPoints(pts);
    flashLight.position.set(x, 12, z);
  }

  const st = { round: 0, answers: [], flash: 0, t: 0, phase: 'idle', counted: 0, shake: 0 };
  // Storm distance in scene units for each round (scaled: 1 km ≈ 4 units)
  const zFor = (km) => -(6 + km * 4.2);

  function strike() {
    const r = ROUNDS[st.round];
    if (r.secs == null) { st.phase = 'after'; panel(); return; }
    const z = zFor(r.dist);
    clouds.position.z += (z - 4 - clouds.position.z);
    makeBolt((Math.random() - 0.5) * 16, z);
    st.flash = 1;
    st.t = 0;
    st.phase = 'counting';
    panel();
  }

  function panel() {
    const r = ROUNDS[st.round];
    const ans = st.answers[st.round];
    const score = st.answers.reduce((n, a) => n + (a ? a.s : 0), 0);
    let body = '';
    if (r.secs == null) {
      body = `<div class="storm-clock"><b>${r.mins} min</b><span>since the last thunder</span></div>`;
    } else if (st.phase === 'idle') {
      body = '<p class="small muted">Watch the horizon. Press <b>Start</b> to see the next flash.</p><button class="btn btn-primary btn-block" type="button" id="sm-go">Start</button>';
    } else {
      const secs = Math.min(st.t, r.secs);
      body = `<div class="storm-clock"><b id="sm-secs">${secs.toFixed(1)} s</b><span id="sm-note">${st.phase === 'heard' ? `Thunder! ${r.secs} s ÷ 3 ≈ <b>${r.dist} km</b> away` : 'Counting from the flash… (sped up ×3)'}</span></div>`;
    }
    const ready = r.secs == null || st.phase === 'heard';
    const choices = ready && !ans ? `<div class="storm-opts">${r.choices.map((c) => `<button class="btn btn-secondary btn-sm" type="button" data-pick="${c}">${OPTIONS[c]}</button>`).join('')}</div>` : '';
    const fb = ans ? `<div class="notice notice-${ans.s === 2 ? 'teal' : ans.s ? 'amber' : 'red'}" style="margin-top:.6rem"><div><strong>${ans.s === 2 ? 'Safe call +2' : ans.s ? 'Safe, but not needed yet +1' : 'Unsafe — 0'}</strong><br>${ans.msg}</div></div>
      ${st.round < 3 ? '<button class="btn btn-primary btn-block" type="button" id="sm-next" style="margin-top:.6rem">Next round</button>' : ''}` : '';
    api.setPanel(`
      <h3 class="p3d-panel-title">Round ${st.round + 1} of 4</h3>
      <p class="small">${meta.steps[st.round].text}</p>
      ${body}${choices}${fb}
      <div class="score-row"><span>Score</span><b>${score} / 8</b><span class="muted small">30 s or less = leave</span></div>
      ${st.answers.filter(Boolean).length === 4 ? '<button class="btn btn-secondary btn-block btn-sm" type="button" id="sm-again">Play again</button>' : ''}`,
    (el) => {
      el.querySelector('#sm-go')?.addEventListener('click', strike);
      el.querySelectorAll('[data-pick]').forEach((b) => b.addEventListener('click', () => pick(b.dataset.pick)));
      el.querySelector('#sm-next')?.addEventListener('click', () => go(st.round + 1));
      el.querySelector('#sm-again')?.addEventListener('click', restart);
    });
  }

  function pick(c) {
    const r = ROUNDS[st.round];
    const s = c === r.best ? 2 : r.ok.includes(c) ? 1 : 0;
    st.answers[st.round] = { s, msg: r.why[c] };
    if (st.answers.filter(Boolean).length === 4) api.complete({ score: st.answers.reduce((n, a) => n + a.s, 0), max: 8 });
    panel();
  }

  function go(i) {
    st.round = Math.max(0, Math.min(3, i));
    api.setStep(st.round);
    const r = ROUNDS[st.round];
    st.phase = st.answers[st.round] ? (r.secs == null ? 'after' : 'heard') : (r.secs == null ? 'after' : 'idle');
    st.t = r.secs || 0;
    clouds.position.z = r.secs == null ? -70 : zFor(r.dist) - 4;
    stage.hemi.intensity = r.secs == null ? 0.55 : 0.35;
    panel();
  }
  function restart() { st.answers = []; go(0); }

  stage.onFrame((dt, t) => {
    // Flash decay with a flicker
    if (st.flash > 0) {
      st.flash = Math.max(0, st.flash - dt * 2.4);
      const f = st.flash > 0.5 ? (Math.sin(t * 90) > 0 ? 1 : 0.4) : st.flash;
      boltMat.opacity = f;
      flashLight.intensity = f * 900;
      stage.hemi.intensity = 0.35 + f * 1.5;
    }
    if (st.phase === 'counting') {
      const r = ROUNDS[st.round];
      st.t += dt * SPEED;
      const el = document.querySelector('#sm-secs');
      if (el) el.textContent = `${Math.min(st.t, r.secs).toFixed(1)} s`;
      if (st.t >= r.secs) { st.phase = 'heard'; st.shake = 1; panel(); }
    }
    if (st.shake > 0) {
      st.shake = Math.max(0, st.shake - dt * 1.6);
      stage.camera.position.x += Math.sin(t * 70) * 0.03 * st.shake;
      stage.camera.position.y += Math.cos(t * 63) * 0.03 * st.shake;
    }
    clouds.children.forEach((c, i) => { c.position.x += Math.sin(t * 0.2 + i) * 0.004; });
  });

  go(0);

  const CAMS = {
    jetty: { label: 'On the jetty', pos: [-6, 4.2, 12], target: [6, 3, -10] },
    wide: { label: 'Wide', pos: [-26, 12, 26], target: [0, 4, -20] },
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
