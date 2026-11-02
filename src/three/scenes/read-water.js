/**
 * 3D lesson: reading the water.
 *
 * A cut-away reservoir bank (see-through water over a shaped bed) with the
 * structure types from the Amateur track. Each round names a species and
 * conditions; the learner taps where that fish is most likely holding.
 */

import { createWater } from '../stage.js';

export const meta = {
  id: 'water',
  title: 'Read the water',
  subtitle: 'Where would the fish be?',
  minutes: 6,
  lessonId: 'a1-water',
  goal: 'Answer all four rounds by tapping the zone where each fish is most likely holding.',
  steps: [
    { title: 'Peacock bass at midday', text: 'A bright, hot midday at a reservoir. Peacock bass are ambush predators that hate direct sun. Where is one most likely holding?' },
    { title: 'Snakehead at dawn', text: 'First light, calm water. Snakehead hunt from cover in shallow water. Tap where you would cast a weedless frog.' },
    { title: 'Tilapia on a calm morning', text: 'A sunny, still morning. Tilapia school and graze in warm, shallow water. Where do you look?' },
    { title: 'Barramundi on a rising tide', text: 'A coastal jetty as the tide rises. Barramundi wait where moving water carries food past structure. Tap the spot.' },
  ],
};

const ZONES = [
  { id: 'pylons', name: 'Jetty pylons (shade)', pos: [5, 6], r: 2.3 },
  { id: 'rocks', name: 'Rock pile on the drop-off', pos: [3, -5], r: 2.4 },
  { id: 'weeds', name: 'Weed bed & lily pads', pos: [-5.5, -6], r: 2.8 },
  { id: 'flat', name: 'Sunny sandy flat', pos: [-4.5, 2.2], r: 2.8 },
  { id: 'seam', name: 'Current seam off the jetty end', pos: [10.2, 6.2], r: 2.0 },
  { id: 'deep', name: 'Open deep water', pos: [14, -3.5], r: 3.2 },
];

const ROUNDS = [
  {
    species: 'Peacock bass', color: '#7a8f2a', best: 'pylons', partial: ['rocks'],
    why: {
      pylons: 'Spot on. At midday the shade and cover under the jetty is prime ambush territory for peacock bass.',
      rocks: 'Good thinking — rocks on a drop-off do hold peacock bass, especially early and late. At midday, the shade under the jetty is better.',
      weeds: 'Weed edges can hold fish, but in bright midday sun peacock bass prefer hard structure with shade.',
      flat: 'The open flat is hot and exposed at midday — predators avoid it.',
      seam: 'Moving water matters more on the coast. In a reservoir, look for shade and structure.',
      deep: 'Open deep water has no cover to ambush from. Fish relate to structure.',
    },
  },
  {
    species: 'Snakehead', color: '#3d4a2e', best: 'weeds', partial: [],
    why: {
      weeds: 'Exactly. Snakehead lurk under lily pads and weed in the shallows — perfect for a weedless frog.',
      pylons: 'Possible, but snakehead are classic weed-bed hunters. The lily pads are the better bet.',
      rocks: 'Snakehead prefer soft cover like weed and lily pads to rocky drop-offs.',
      flat: 'Too open — snakehead want overhead cover.',
      seam: 'Snakehead avoid current. Look for still, weedy shallows.',
      deep: 'Snakehead hunt the shallows, especially at dawn.',
    },
  },
  {
    species: 'Tilapia', color: '#8a9aa3', best: 'flat', partial: ['weeds'],
    why: {
      flat: 'Yes. Tilapia graze and school over warm, shallow, sunny flats.',
      weeds: 'Close — tilapia do feed along weed edges. The open sunny flat is where schools gather in the morning.',
      pylons: 'Tilapia can sit in shade later in the day, but in the morning they move up onto warm shallows.',
      rocks: 'Not their favourite — tilapia like soft, shallow bottoms.',
      seam: 'Tilapia avoid moving water.',
      deep: 'Tilapia feed in the shallows, not open deep water.',
    },
  },
  {
    species: 'Barramundi', color: '#b9c4c9', best: 'seam', partial: ['pylons'],
    why: {
      seam: 'Perfect. Where fast and slow water meet off the jetty end, barramundi wait for food to be swept past.',
      pylons: 'Good — barramundi do shelter by pylons. On a rising tide, the current seam at the jetty end is the hot spot.',
      rocks: 'Structure helps, but on a moving tide the current seam is where the feeding happens.',
      weeds: 'Barramundi are more about current and structure than weed beds.',
      flat: 'Too shallow and still for a feeding barramundi on a rising tide.',
      deep: 'Open water without structure or current edges rarely holds barramundi.',
    },
  },
];

export async function create(stage, api) {
  const { THREE, scene, mat } = stage;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  stage.camera.position.set(-3, 15, 21);
  stage.controls.target.set(2.5, -1, 0);
  stage.controls.maxDistance = 45;
  stage.sun.shadow.camera.left = -22;
  stage.sun.shadow.camera.right = 22;
  stage.sun.shadow.camera.top = 22;
  stage.sun.shadow.camera.bottom = -22;
  stage.sun.shadow.camera.updateProjectionMatrix();

  /* ---------- Bed with drop-off ---------- */
  const depthAt = (x, z) => {
    const shelf = -0.55 - 0.03 * (x + 10);
    const drop = -0.6 - 3.4 / (1 + Math.exp(-(x - 2) * 1.4));
    // grassy bank rises gently behind x = -9
    let d = x < -9 ? 0.35 + (-9 - x) * 0.05 : Math.min(shelf, drop);
    d += Math.sin(x * 0.7 + z * 0.4) * 0.12 + Math.cos(z * 0.9) * 0.08;
    return d;
  };
  const bedGeo = new THREE.PlaneGeometry(64, 46, 128, 92);
  bedGeo.rotateX(-Math.PI / 2);
  const bp = bedGeo.attributes.position;
  const colors = [];
  const sand = new THREE.Color('#d8c597');
  const mud = new THREE.Color('#6e6a4c');
  const deepC = new THREE.Color('#25403f');
  const grass = new THREE.Color('#5d8a3f');
  for (let i = 0; i < bp.count; i += 1) {
    const x = bp.getX(i) + 2;
    const z = bp.getZ(i);
    const y = depthAt(x, z);
    bp.setY(i, y);
    bp.setX(i, x);
    let c;
    if (y > 0.05) c = grass.clone();
    else if (y > -1.1) c = sand.clone().lerp(mud, Math.min(1, (-y) / 1.1) * 0.5);
    else c = mud.clone().lerp(deepC, Math.min(1, (-y - 1.1) / 2.6));
    colors.push(c.r, c.g, c.b);
  }
  bedGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  bedGeo.computeVertexNormals();
  const bed = new THREE.Mesh(bedGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
  bed.receiveShadow = true;
  scene.add(bed);

  createWater(stage, { width: 64, depth: 46, segX: 96, segZ: 70, x: 2, color: '#2a8f95', opacity: 0.5, amp: 0.6 });

  /* ---------- Jetty ---------- */
  const jetty = new THREE.Group();
  const deck = new THREE.Mesh(new THREE.BoxGeometry(19, 0.18, 2.2), mat('#8b6a48', { roughness: 0.9 }));
  deck.position.set(-1.5, 0.9, 6);
  jetty.add(deck);
  for (let x = -10; x <= 8; x += 2.2) {
    [5.1, 6.9].forEach((z) => {
      const y = depthAt(x, z);
      const h = 0.9 - y;
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, h, 10), mat('#4c3826'));
      p.position.set(x, y + h / 2, z);
      jetty.add(p);
    });
  }
  const railMat = mat('#1f5fbf', { metalness: 0.2, roughness: 0.45 });
  const rail = new THREE.Mesh(new THREE.BoxGeometry(19, 0.05, 0.05), railMat);
  rail.position.set(-1.5, 1.85, 5.0);
  jetty.add(rail);
  stage.shadowAll(jetty);
  scene.add(jetty);

  /* ---------- Rock pile ---------- */
  const rockMat = mat('#6d6a63', { roughness: 0.95 });
  for (let i = 0; i < 16; i += 1) {
    const r = 0.4 + Math.random() * 0.6;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), rockMat);
    const x = 3 + (Math.random() - 0.5) * 3.4;
    const z = -5 + (Math.random() - 0.5) * 3.4;
    rock.position.set(x, depthAt(x, z) + r * 0.5, z);
    rock.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    rock.castShadow = rock.receiveShadow = true;
    scene.add(rock);
  }

  /* ---------- Weed bed + lily pads ---------- */
  const blades = [];
  const bladeMat = mat('#4c7a2c', { roughness: 0.8, side: THREE.DoubleSide });
  for (let i = 0; i < 140; i += 1) {
    const x = -5.5 + (Math.random() - 0.5) * 5.2;
    const z = -6 + (Math.random() - 0.5) * 5.2;
    const base = depthAt(x, z);
    const h = -base - 0.05;
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.05, h, 4), bladeMat);
    blade.position.set(x, base + h / 2, z);
    blade.userData.phase = Math.random() * Math.PI * 2;
    blades.push(blade);
    scene.add(blade);
  }
  const padMat = mat('#3f8a3a', { roughness: 0.6, side: THREE.DoubleSide });
  for (let i = 0; i < 26; i += 1) {
    const pad = new THREE.Mesh(new THREE.CircleGeometry(0.35 + Math.random() * 0.3, 18, 0.3, Math.PI * 2 - 0.3), padMat);
    pad.rotation.x = -Math.PI / 2;
    pad.rotation.z = Math.random() * Math.PI * 2;
    pad.position.set(-5.5 + (Math.random() - 0.5) * 5, 0.06, -6 + (Math.random() - 0.5) * 5);
    pad.receiveShadow = true;
    scene.add(pad);
    if (i % 6 === 0) {
      const flower = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), mat('#f2a7c3'));
      flower.position.copy(pad.position).add(V(0, 0.08, 0));
      scene.add(flower);
    }
  }

  /* ---------- Bank trees and sun patch on the flat ---------- */
  const treeMat = mat('#2f5a33', { roughness: 1 });
  for (let i = 0; i < 14; i += 1) {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 2.2, 8), mat('#5b4532'));
    trunk.position.y = 1.1;
    const crown = new THREE.Mesh(new THREE.SphereGeometry(1.2 + Math.random() * 0.6, 12, 10), treeMat);
    crown.position.y = 2.6;
    tree.add(trunk, crown);
    tree.position.set(-13 - Math.random() * 6, 0.4, -20 + i * 3);
    stage.shadowAll(tree);
    scene.add(tree);
  }

  /* ---------- Current seam particles ---------- */
  const N = 260;
  const flowGeo = new THREE.BufferGeometry();
  const flowPos = new Float32Array(N * 3);
  const flowSpeed = new Float32Array(N);
  for (let i = 0; i < N; i += 1) {
    flowPos[i * 3] = 8.6 + Math.random() * 3.4;
    flowPos[i * 3 + 1] = 0.08;
    flowPos[i * 3 + 2] = -2 + Math.random() * 16;
    const lane = flowPos[i * 3] - 8.6;
    flowSpeed[i] = lane > 1.4 ? 2.6 + Math.random() : 0.5 + Math.random() * 0.4;
  }
  flowGeo.setAttribute('position', new THREE.BufferAttribute(flowPos, 3));
  const flow = new THREE.Points(flowGeo, new THREE.PointsMaterial({ color: '#ffffff', size: 0.09, transparent: true, opacity: 0.8 }));
  scene.add(flow);

  /* ---------- Zones ---------- */
  const zoneMeshes = [];
  const zoneLabels = new Map();
  ZONES.forEach((z) => {
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(z.r, 40),
      new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.0, depthWrite: false, side: THREE.DoubleSide }),
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(z.pos[0], 0.12, z.pos[1]);
    disc.userData.zone = z.id;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(z.r - 0.08, z.r, 48),
      new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(disc.position).add(V(0, 0.01, 0));
    disc.userData.ring = ring;
    scene.add(disc, ring);
    zoneMeshes.push(disc);
    zoneLabels.set(z.id, stage.addLabel(z.name, V(z.pos[0], 1.3 + (z.id === 'pylons' ? 0.9 : 0), z.pos[1]), 'is-plain'));
  });

  /* ---------- Fish that swims to the answer ---------- */
  const fish = new THREE.Group();
  const fishBody = new THREE.Mesh(new THREE.SphereGeometry(0.35, 18, 12), mat('#888', { roughness: 0.4, metalness: 0.2 }));
  fishBody.scale.set(2.1, 0.8, 0.6);
  const fishTail = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.45, 4), fishBody.material);
  fishTail.rotation.z = Math.PI / 2;
  fishTail.position.x = -0.85;
  fish.add(fishBody, fishTail);
  fish.visible = false;
  scene.add(fish);
  let fishTarget = null;

  /* ---------- State ---------- */
  const st = { round: 0, answered: new Map(), score: 0 };
  const scoreOf = (round, zone) => (zone === ROUNDS[round].best ? 2 : ROUNDS[round].partial.includes(zone) ? 1 : 0);

  function resetHighlights() {
    zoneMeshes.forEach((m) => {
      m.material.opacity = 0;
      m.userData.ring.material.color.set('#ffffff');
      m.userData.ring.material.opacity = 0.45;
    });
  }

  function showRound(i) {
    st.round = Math.max(0, Math.min(ROUNDS.length - 1, i));
    api.setStep(st.round);
    resetHighlights();
    const prev = st.answered.get(st.round);
    if (prev) reveal(st.round, prev, false);
    else {
      fish.visible = false;
      renderPanel();
    }
  }

  function reveal(round, zone, fresh) {
    const r = ROUNDS[round];
    const best = zoneMeshes.find((m) => m.userData.zone === r.best);
    const picked = zoneMeshes.find((m) => m.userData.zone === zone);
    best.material.color.set('#16c79a');
    best.material.opacity = 0.32;
    best.userData.ring.material.color.set('#16c79a');
    best.userData.ring.material.opacity = 0.95;
    if (picked !== best) {
      const s = scoreOf(round, zone);
      picked.material.color.set(s ? '#f2a541' : '#e5484d');
      picked.material.opacity = 0.3;
      picked.userData.ring.material.color.set(s ? '#f2a541' : '#e5484d');
      picked.userData.ring.material.opacity = 0.95;
    }
    fishBody.material.color.set(r.color);
    const z = ZONES.find((q) => q.id === r.best);
    fishTarget = { x: z.pos[0], z: z.pos[1], y: Math.max(depthAt(z.pos[0], z.pos[1]) + 0.6, -1.4) };
    if (fresh) fish.position.set(z.pos[0] + 8, fishTarget.y, z.pos[1] + 4);
    fish.visible = true;
    renderPanel(zone);
  }

  stage.onPick((ray) => {
    if (st.answered.has(st.round)) return;
    const hit = ray.intersectObjects(zoneMeshes, false)[0];
    if (!hit) return;
    const zone = hit.object.userData.zone;
    st.answered.set(st.round, zone);
    st.score = [...st.answered.entries()].reduce((n, [rd, zn]) => n + scoreOf(rd, zn), 0);
    reveal(st.round, zone, true);
    if (st.answered.size === ROUNDS.length) api.complete({ score: st.score, max: ROUNDS.length * 2 });
  });

  stage.onHover((ray) => {
    if (st.answered.has(st.round)) return;
    const hit = ray.intersectObjects(zoneMeshes, false)[0];
    zoneMeshes.forEach((m) => { m.material.color.set('#ffffff'); m.material.opacity = m === hit?.object ? 0.22 : 0; });
    stage.renderer.domElement.style.cursor = hit ? 'pointer' : '';
  });

  stage.onFrame((dt, t) => {
    blades.forEach((b) => { b.rotation.z = Math.sin(t * 1.3 + b.userData.phase) * 0.12; b.rotation.x = Math.cos(t * 1.1 + b.userData.phase) * 0.08; });
    const p = flowGeo.attributes.position.array;
    for (let i = 0; i < N; i += 1) {
      p[i * 3 + 2] += flowSpeed[i] * dt;
      if (p[i * 3 + 2] > 14) p[i * 3 + 2] = -2;
    }
    flowGeo.attributes.position.needsUpdate = true;
    if (fish.visible && fishTarget) {
      const ang = t * 0.9;
      const tx = fishTarget.x + Math.cos(ang) * 1.0;
      const tz = fishTarget.z + Math.sin(ang) * 0.8;
      const dx = tx - fish.position.x;
      const dz = tz - fish.position.z;
      fish.position.x += dx * Math.min(1, dt * 1.6);
      fish.position.z += dz * Math.min(1, dt * 1.6);
      fish.position.y += (fishTarget.y - fish.position.y) * Math.min(1, dt * 2);
      fish.rotation.y = Math.atan2(-dz, dx);
      fishTail.rotation.y = Math.sin(t * 9) * 0.5;
    }
  });

  function renderPanel(picked) {
    const r = ROUNDS[st.round];
    const done = st.answered.size;
    let feedback = '';
    if (picked) {
      const s = scoreOf(st.round, picked);
      const tone = s === 2 ? 'teal' : s === 1 ? 'amber' : 'red';
      feedback = `<div class="notice notice-${tone}" style="margin-top:.7rem"><div><strong>${s === 2 ? 'Correct! +2' : s === 1 ? 'Close — +1' : 'Not this time — 0'}</strong><br>${r.why[picked]}</div></div>
        ${st.round < ROUNDS.length - 1 ? '<button class="btn btn-primary btn-block" type="button" id="rw-next" style="margin-top:.7rem">Next round</button>' : ''}`;
    }
    api.setPanel(`
      <h3 class="p3d-panel-title">Round ${st.round + 1} of ${ROUNDS.length}: ${r.species}</h3>
      <p class="small">${meta.steps[st.round].text}</p>
      ${picked ? '' : '<p class="small muted">Tap a circled zone on the water. Drag to look around first.</p>'}
      ${feedback}
      <div class="score-row"><span>Score</span><b>${st.score} / ${ROUNDS.length * 2}</b><span class="muted small">${done}/${ROUNDS.length} rounds</span></div>
      ${done === ROUNDS.length ? `<button class="btn btn-secondary btn-block btn-sm" type="button" id="rw-again">Play again</button>` : ''}
    `, (panel) => {
      panel.querySelector('#rw-next')?.addEventListener('click', () => showRound(st.round + 1));
      panel.querySelector('#rw-again')?.addEventListener('click', () => { st.answered.clear(); st.score = 0; showRound(0); });
    });
  }

  showRound(0);

  const CAMS = {
    overview: { label: 'Overview', pos: [-3, 15, 21], target: [2.5, -1, 0] },
    low: { label: 'Water level', pos: [-12, 2.2, 12], target: [3, -0.5, 0] },
    top: { label: 'Top down', pos: [2.5, 30, 0.1], target: [2.5, 0, 0] },
  };
  return {
    cameras: CAMS,
    setCamera(id) { const c = CAMS[id]; if (c) stage.moveCamera(c.pos, c.target, 1); },
    goto(i) { showRound(i); },
    setPlaying() {},
    setSpeed() {},
    restart() { st.answered.clear(); st.score = 0; showRound(0); },
    interactive: true,
  };
}
