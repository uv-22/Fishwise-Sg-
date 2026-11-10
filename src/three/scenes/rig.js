/**
 * 3D lesson: build a running float rig, then set its depth.
 *
 * Round 1 — tap the parts in the order they go on the line (top to bottom).
 * Round 2 — drag the float stopper so the bait sits just above the bottom.
 * Round 3 — watch the float: when the depth is right, a fish takes the bait.
 */

import { createWater } from '../stage.js';

export const meta = {
  id: 'rig',
  title: 'Build a float rig',
  subtitle: 'Parts, order and depth',
  minutes: 7,
  lessonId: 'a7-rig',
  goal: 'Put the seven parts on in the right order, then set the depth so the bait hangs just above the bottom.',
  steps: [
    { title: 'Build it top to bottom', text: 'A running float rig slides on your main line. Tap each part in the order it is threaded on, starting at the top.' },
    { title: 'Set the depth', text: 'The float stopper sets how deep your bait hangs. Fish here feed near the bottom, 3.2 m down. Move the stopper until the hook sits 20–50 cm above the bottom.' },
    { title: 'Watch the float', text: 'Cast out and watch the float. A clean dip, or the float lying flat or sliding away, means a bite. Lift the rod smoothly to set the hook.' },
  ],
};

const PARTS = [
  { id: 'stopper', name: 'Float stopper', why: 'A small rubber stopper (or stopper knot) sits at the top. Where you put it sets the fishing depth — the float slides up to it and stops.' },
  { id: 'bead', name: 'Bead', why: 'A small bead stops the stopper slipping through the float’s eye and protects the knot.' },
  { id: 'float', name: 'Sliding float', why: 'The float slides freely on the line between the bead and the sinker. It holds your bait at depth and shows you the bite.' },
  { id: 'sinker', name: 'Bean sinker', why: 'The sinker cocks the float upright and takes the bait down. Match its weight to the float — too heavy and the float sinks.' },
  { id: 'swivel', name: 'Swivel', why: 'The swivel stops the sinker sliding onto the hook and stops line twist. It joins the main line to the leader.' },
  { id: 'leader', name: 'Leader (40 cm)', why: 'A short leader of slightly lighter or tougher line goes below the swivel. If you snag, you lose only the hook.' },
  { id: 'hook', name: 'Hook', why: 'Last of all: the hook, tied with an improved clinch knot. Use micro-barb or barbless hooks where NParks asks for them.' },
];
const BED = -3.2; // depth below the float position

export async function create(stage, api) {
  const { THREE, scene, mat } = stage;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  stage.camera.position.set(5.5, 3.2, 10);
  stage.controls.target.set(1.6, 1.6, 0);

  /* ---------- Seabed, water, jetty edge, rod ---------- */
  const bedGeo = new THREE.PlaneGeometry(40, 30, 60, 40);
  bedGeo.rotateX(-Math.PI / 2);
  const bp = bedGeo.attributes.position;
  for (let i = 0; i < bp.count; i += 1) {
    const x = bp.getX(i), z = bp.getZ(i);
    bp.setY(i, BED - 0.25 + Math.sin(x * 0.6) * 0.12 + Math.cos(z * 0.5) * 0.1 + (x < -2 ? (-2 - x) * 0.35 : 0));
  }
  bedGeo.computeVertexNormals();
  const bed = new THREE.Mesh(bedGeo, mat('#7c7356', { roughness: 1 }));
  bed.receiveShadow = true;
  scene.add(bed);
  createWater(stage, { width: 40, depth: 30, segX: 60, segZ: 40, color: '#2a7f8a', opacity: 0.42, amp: 0.5 });

  const deck = new THREE.Mesh(new THREE.BoxGeometry(6, 0.25, 6), mat('#8b6a48', { roughness: 0.9 }));
  deck.position.set(-5, 1.6, 0);
  scene.add(deck);
  for (const [x, z] of [[-2.3, -2.6], [-2.3, 2.6], [-7.6, -2.6], [-7.6, 2.6]]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 5, 10), mat('#4c3826'));
    p.position.set(x, -0.9, z);
    scene.add(p);
  }
  const tip = V(2.6, 4.6, 0);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.06, 4.6, 8), mat('#1b2a3a', { roughness: 0.4 }));
  rod.position.copy(V(-2.4, 2.4, 0)).lerp(tip, 0.5);
  rod.lookAt(tip);
  rod.rotateX(Math.PI / 2);
  scene.add(rod);
  stage.shadowAll(scene);

  /* ---------- Rig parts ---------- */
  const red = mat('#e5484d', { roughness: 0.4 });
  const make = {
    stopper: () => new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.1, 10), mat('#16c79a')),
    bead: () => new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), red),
    float: () => {
      const g = new THREE.Group();
      const top = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 14), mat('#ff7a1a', { roughness: 0.35 }));
      top.scale.set(1, 1.7, 1);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8), mat('#f4f1ea'));
      stem.position.y = 0.5;
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), mat('#ffef5a', { emissive: '#ffcf00', emissiveIntensity: 0.4 }));
      cap.position.y = 0.78;
      g.add(top, stem, cap);
      return g;
    },
    sinker: () => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), mat('#6c727a', { metalness: 0.5, roughness: 0.4 })); m.scale.set(0.8, 1.3, 0.8); return m; },
    swivel: () => { const g = new THREE.Group(); [0.07, -0.07].forEach((y) => { const r = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.015, 8, 16), mat('#202020', { metalness: 0.8 })); r.position.y = y; g.add(r); }); return g; },
    leader: () => new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1, 6), mat('#d8f2ff', { transparent: true, opacity: 0.8 })),
    hook: () => {
      const g = new THREE.Group();
      const shank = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 6), mat('#c9ced6', { metalness: 0.9, roughness: 0.25 }));
      const bend = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 6, 16, Math.PI), shank.material);
      bend.rotation.z = Math.PI;
      bend.position.set(0.07, -0.11, 0);
      const bait = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), mat('#f2c6a0'));
      bait.position.set(0.14, -0.08, 0);
      g.add(shank, bend, bait);
      return g;
    },
  };
  const parts = new Map();
  // Line from the rod tip: a dynamic tube rebuilt from points.
  const lineMat = new THREE.LineBasicMaterial({ color: '#f4f8ff', transparent: true, opacity: 0.9 });
  const lineGeo = new THREE.BufferGeometry();
  const line = new THREE.Line(lineGeo, lineMat);
  scene.add(line);

  const st = { phase: 0, next: 0, wrong: 0, depth: 1.4, deployed: 0, bite: 0, done: false, fishT: 0 };
  const castPos = V(5.2, 0, 0);

  // Positions on the line, measured down from the float position when deployed.
  function layout(k) {
    // k: 0 = hanging from the rod tip to dry it, 1 = cast and fishing
    const hangTop = V(tip.x, tip.y - 0.4, 0);
    const pos = {};
    // Deployed: the float sits at the surface under the stopper; the hook hangs `depth` below.
    const floatY = 0.02 + Math.sin(stage.elapsed * 1.6) * 0.03 - st.bite * 0.35;
    const hookDepth = floatY - st.depth;
    const dep = {
      stopper: V(castPos.x, floatY + 0.9, 0), bead: V(castPos.x, floatY + 0.82, 0), float: V(castPos.x, floatY - 0.2, 0),
      sinker: V(castPos.x, hookDepth + 0.95, 0), swivel: V(castPos.x, hookDepth + 0.55, 0), leader: V(castPos.x, hookDepth + 0.3, 0), hook: V(castPos.x, hookDepth + 0.05, 0),
    };
    const hang = {
      stopper: V(hangTop.x, hangTop.y - 0.2, 0), bead: V(hangTop.x, hangTop.y - 0.35, 0), float: V(hangTop.x, hangTop.y - 1.0, 0),
      sinker: V(hangTop.x, hangTop.y - 1.6, 0), swivel: V(hangTop.x, hangTop.y - 1.95, 0), leader: V(hangTop.x, hangTop.y - 2.3, 0), hook: V(hangTop.x, hangTop.y - 2.6, 0),
    };
    for (const p of PARTS) pos[p.id] = hang[p.id].clone().lerp(dep[p.id], k);
    return pos;
  }

  function place() {
    const k = st.deployed;
    const pos = layout(k);
    for (const [id, m] of parts) {
      m.position.copy(pos[id]);
      if (id === 'leader') { m.scale.y = 0.5; }
    }
    // Line: tip → (sag) → top part → down through the parts
    const pts = [tip.clone()];
    const lowest = PARTS.filter((p) => parts.has(p.id)).map((p) => pos[p.id]);
    const first = lowest[0] || V(tip.x, tip.y - 2.8, 0);
    const mid = tip.clone().lerp(first, 0.5);
    mid.y -= 0.5 * k;
    pts.push(mid, first);
    const bottom = parts.has('hook') ? pos.hook : V(first.x, (lowest[lowest.length - 1] || first).y - 0.3, 0);
    pts.push(bottom);
    lineGeo.setFromPoints(pts);
  }

  /* ---------- A fish near the bottom ---------- */
  const fish = new THREE.Group();
  const fb = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), mat('#b9c4c9', { metalness: 0.3, roughness: 0.4 }));
  fb.scale.set(2.2, 0.85, 0.55);
  const ft = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.4, 4), fb.material);
  ft.rotation.z = Math.PI / 2;
  ft.position.x = -0.85;
  fish.add(fb, ft);
  fish.position.set(castPos.x - 3, BED + 0.35, 1.2);
  scene.add(fish);

  const depthLabel = stage.addLabel('', () => V(castPos.x + 0.9, (0.02 - st.depth) / 2, 0), 'is-plain');
  depthLabel.visible = false;
  const bedLabel = stage.addLabel('Bottom · 3.2 m', V(castPos.x + 1.6, BED - 0.1, 0), 'is-plain');

  function hookAbove() { return Math.round((0.07 - st.depth - BED) * 100); }

  function panel() {
    if (st.phase === 0) {
      const order = ['hook', 'float', 'swivel', 'stopper', 'leader', 'bead', 'sinker'];
      const fb = st.feedback ? `<div class="notice notice-${st.feedbackTone}" style="margin-top:.6rem"><div>${st.feedback}</div></div>` : '';
      api.setPanel(`
        <h3 class="p3d-panel-title">Part ${Math.min(st.next + 1, PARTS.length)} of ${PARTS.length}: what goes on next?</h3>
        <div class="rig-parts">${order.map((id) => { const p = PARTS.find((q) => q.id === id); const on = parts.has(id); return `<button type="button" class="btn btn-sm ${on ? 'btn-ghost' : 'btn-secondary'}" data-part="${id}" ${on ? 'disabled' : ''}>${on ? '✓ ' : ''}${p.name}</button>`; }).join('')}</div>
        ${fb}
        <div class="score-row"><span>Mistakes</span><b>${st.wrong}</b><span class="muted small">top to bottom</span></div>`,
      (el) => el.querySelectorAll('[data-part]').forEach((b) => b.addEventListener('click', () => pick(b.dataset.part))));
    } else if (st.phase === 1) {
      const a = hookAbove();
      const ok = a >= 20 && a <= 50;
      api.setPanel(`
        <h3 class="p3d-panel-title">Set the depth</h3>
        <label class="small" for="rig-depth">Stopper to hook: <b id="rig-d">${st.depth.toFixed(2)} m</b></label>
        <input type="range" id="rig-depth" min="0.6" max="3.6" step="0.05" value="${st.depth}" style="width:100%" />
        <p class="small" id="rig-msg">${a < 0 ? 'Too deep — your hook is lying on the bottom and will snag.' : ok ? 'Spot on: the bait hangs just above the bottom, right where the fish feed.' : `The hook is ${a} cm above the bottom — too shallow for fish feeding on the bottom.`}</p>
        <button class="btn btn-primary btn-block" type="button" id="rig-go" ${ok ? '' : 'disabled'}>Watch the float</button>`,
      (el) => {
        el.querySelector('#rig-depth').addEventListener('input', (e) => { st.depth = Number(e.target.value); panelSoft(); });
        el.querySelector('#rig-go').addEventListener('click', () => go(2));
      });
    } else {
      api.setPanel(`
        <h3 class="p3d-panel-title">${st.done ? 'Fish on!' : 'Watch the float…'}</h3>
        <p class="small">${st.done ? 'The float dipped and slid away — that is a bite. Lift the rod smoothly to set the hook, then keep the line tight.' : 'Keep your eyes on the float tip. Do not strike at tiny taps; wait for a clear dip.'}</p>
        <div class="score-row"><span>Mistakes</span><b>${st.wrong}</b><span class="muted small">depth ${st.depth.toFixed(2)} m</span></div>
        ${st.done ? '<button class="btn btn-secondary btn-block btn-sm" type="button" id="rig-again">Build it again</button>' : ''}`,
      (el) => el.querySelector('#rig-again')?.addEventListener('click', restart));
    }
  }
  function panelSoft() {
    const a = hookAbove();
    const ok = a >= 20 && a <= 50;
    const el = document.querySelector('#rig-d');
    if (!el) return panel();
    el.textContent = `${st.depth.toFixed(2)} m`;
    document.querySelector('#rig-msg').textContent = a < 0 ? 'Too deep — your hook is lying on the bottom and will snag.' : ok ? 'Spot on: the bait hangs just above the bottom, right where the fish feed.' : `The hook is ${a} cm above the bottom — too shallow for fish feeding on the bottom.`;
    document.querySelector('#rig-go').disabled = !ok;
  }

  function pick(id) {
    const want = PARTS[st.next];
    if (id !== want.id) {
      st.wrong += 1;
      const p = PARTS.find((q) => q.id === id);
      st.feedback = `<strong>Not yet.</strong> The ${p.name.toLowerCase()} goes on later. Next is something that sits ${st.next === 0 ? 'at the very top' : `just below the ${PARTS[st.next - 1].name.toLowerCase()}`}.`;
      st.feedbackTone = 'red';
      return panel();
    }
    const m = make[id]();
    stage.shadowAll(m);
    parts.set(id, m);
    scene.add(m);
    st.feedback = `<strong>${want.name}.</strong> ${want.why}`;
    st.feedbackTone = 'teal';
    st.next += 1;
    place();
    if (st.next === PARTS.length) { setTimeout(() => go(1), 900); }
    panel();
  }

  function go(i) {
    if (i >= 1 && st.next < PARTS.length) i = 0;
    st.phase = i;
    api.setStep(i);
    depthLabel.visible = i >= 1;
    if (i === 0) stage.moveCamera([5.5, 3.2, 10], [1.6, 1.6, 0], 1);
    else stage.moveCamera([9, 0.5, 9], [4.5, -1.4, 0], 1.2);
    panel();
  }

  function restart() {
    for (const m of parts.values()) scene.remove(m);
    parts.clear();
    Object.assign(st, { phase: 0, next: 0, wrong: 0, depth: 1.4, deployed: 0, bite: 0, done: false, fishT: 0, feedback: '' });
    fish.position.set(castPos.x - 3, BED + 0.35, 1.2);
    go(0);
    place();
  }

  stage.onFrame((dt, t) => {
    const target = st.phase >= 1 ? 1 : 0;
    st.deployed += (target - st.deployed) * Math.min(1, dt * 2.2);
    // Fish cruises near the bottom; in phase 2 with the right depth it takes the bait.
    const a = hookAbove();
    const good = a >= 20 && a <= 50;
    if (st.phase === 2 && good && !st.done) {
      st.fishT += dt;
      const hx = castPos.x + 0.14, hy = 0.02 - st.depth;
      const tx = st.fishT > 2.2 ? hx - 0.6 : castPos.x - 2.5 + st.fishT;
      fish.position.x += (tx - fish.position.x) * Math.min(1, dt * 1.5);
      fish.position.y += (hy - fish.position.y) * Math.min(1, dt * 1.2);
      fish.position.z += (0 - fish.position.z) * Math.min(1, dt * 1.2);
      fish.rotation.y = 0;
      if (st.fishT > 3.6) { st.done = true; api.complete({ score: Math.max(0, 7 - st.wrong), max: 7 }); panel(); }
    } else if (!st.done) {
      fish.position.x = castPos.x - 3 + Math.sin(t * 0.4) * 1.6;
      fish.position.z = 1.2 + Math.cos(t * 0.4) * 0.8;
      fish.rotation.y = Math.cos(t * 0.4) > 0 ? 0 : Math.PI;
    }
    st.bite += ((st.done ? 1 : 0) - st.bite) * Math.min(1, dt * 3);
    if (st.done) fish.position.x += Math.sin(t * 6) * 0.01;
    ft.rotation.y = Math.sin(t * 8) * 0.5;
    if (st.deployed > 0.02 || parts.size) place();
    depthLabel.setText(`Hook ${a >= 0 ? `${a} cm above the bottom` : 'on the bottom'}`);
    bedLabel.visible = st.phase >= 1;
  });

  place();
  go(0);

  const CAMS = {
    rig: { label: 'The rig', pos: [5.5, 3.2, 10], target: [1.6, 1.6, 0] },
    under: { label: 'Under water', pos: [9, -1.2, 7], target: [4.5, -1.8, 0] },
    side: { label: 'Side on', pos: [5, 0.5, 13], target: [4, -0.5, 0] },
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
