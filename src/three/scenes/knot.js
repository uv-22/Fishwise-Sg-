/**
 * 3D lesson: tying an improved clinch knot.
 *
 * The line is two tubes (standing line + tag end) whose paths morph between
 * hand-authored key shapes for each step, around a modelled hook.
 */

const TURNS = 6;

export const meta = {
  id: 'knot',
  title: 'Improved clinch knot',
  subtitle: 'The first knot every angler learns',
  minutes: 5,
  lessonId: 'b3-knot',
  goal: 'Step through all six stages of the knot.',
  steps: [
    { title: 'Thread the eye', text: 'Pass about 15 cm of line through the hook eye. The loose end is the “tag end”; the line back to your reel is the “standing line”.' },
    { title: 'Wrap 5–7 times', text: 'Twist the tag end around the standing line five to seven times, working away from the hook.' },
    { title: 'Through the small loop', text: 'Bring the tag end back and pass it through the small loop that formed just above the eye.' },
    { title: 'Back through the big loop', text: 'Now pass the tag end through the big loop you just created. This is the “improved” part.' },
    { title: 'Wet and tighten', text: 'Wet the knot with water, then pull the standing line slowly. The wraps slide down and bed neatly against the eye.' },
    { title: 'Trim the tag', text: 'Trim the tag end, leaving about 3 mm. Put the offcut in your bag — never on the ground or in the water.' },
  ],
};

export async function create(stage, api) {
  const { THREE, scene, mat } = stage;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  stage.camera.position.set(-1.2, 1.4, 6.2);
  stage.controls.target.set(-0.7, -0.3, 0);
  stage.controls.minDistance = 2.5;
  stage.controls.maxDistance = 14;
  stage.controls.maxPolarAngle = Math.PI;

  // Soft studio floor so the hook casts a readable shadow
  const floor = new THREE.Mesh(new THREE.CircleGeometry(14, 48), mat('#e8efe9', { roughness: 1 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -5.2;
  floor.receiveShadow = true;
  scene.add(floor);
  stage.sun.position.set(-4, 10, 6);
  stage.sun.shadow.camera.left = -8;
  stage.sun.shadow.camera.right = 8;
  stage.sun.shadow.camera.top = 8;
  stage.sun.shadow.camera.bottom = -8;
  stage.sun.shadow.camera.updateProjectionMatrix();

  /* ---------- Hook ---------- */
  const steel = mat('#8e979f', { metalness: 0.9, roughness: 0.22 });
  const hook = new THREE.Group();
  const eye = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.055, 16, 48), steel);
  eye.rotation.y = Math.PI / 2; // ring faces along x so the line passes through it
  hook.add(eye);
  const hookCurve = new THREE.CatmullRomCurve3([
    V(0, -0.27, 0), V(0, -1.4, 0), V(0, -2.7, 0), V(0.12, -3.35, 0), V(0.6, -3.72, 0),
    V(1.15, -3.6, 0), V(1.42, -3.1, 0), V(1.45, -2.45, 0),
  ]);
  hook.add(new THREE.Mesh(new THREE.TubeGeometry(hookCurve, 80, 0.06, 12, false), steel));
  const point = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.32, 12), steel);
  point.position.set(1.45, -2.3, 0);
  hook.add(point);
  const barb = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.22, 8), steel);
  barb.position.set(1.36, -2.55, 0);
  barb.rotation.z = 0.9;
  hook.add(barb);
  stage.shadowAll(hook);
  scene.add(hook);

  /* ---------- Key shapes ---------- */
  const helix = (x0, x1, r, turns, phase = 0, yOff = 0) => {
    const pts = [];
    const n = turns * 24;
    for (let i = 0; i <= n; i += 1) {
      const u = i / n;
      const a = phase + u * turns * Math.PI * 2;
      pts.push(V(x0 + (x1 - x0) * u, Math.cos(a) * r + yOff, Math.sin(a) * r));
    }
    return pts;
  };
  const standing = (end) => [V(-9, 0, 0), V(-5, 0, 0), V(-1, 0, 0), V(end, 0, 0)];

  // Each key shape: { s: standing-line points, t: tag points }
  const SHAPES = [
    // 0 — before threading: tag is a stub approaching the eye
    { s: standing(-1.4), t: [V(-1.4, 0, 0), V(-1.2, 0, 0), V(-1.0, 0, 0)] },
    // 1 — threaded: through the eye, U-turn, tag lying back along the standing line
    { s: standing(0.55), t: [V(0.55, 0, 0), V(0.8, 0.2, 0), V(0.55, 0.42, 0), V(0.0, 0.45, 0), V(-1.5, 0.45, 0), V(-3.4, 0.5, 0)] },
    // 2 — wrapped around the standing line
    { s: standing(0.55), t: [V(0.55, 0, 0), V(0.8, 0.2, 0), V(0.55, 0.38, 0), V(0.15, 0.32, 0), ...helix(-0.1, -2.5, 0.3, TURNS, 0), V(-2.75, 0.55, 0.1), V(-3.3, 1.0, 0.2)] },
    // 3 — back to the eye and through the small loop (crosses z = 0 inside the U-turn)
    { s: standing(0.55), t: [V(0.55, 0, 0), V(0.8, 0.2, 0), V(0.55, 0.38, 0), V(0.15, 0.32, 0), ...helix(-0.1, -2.5, 0.3, TURNS, 0), V(-2.7, 0.55, 0.45), V(-1.6, 0.75, 0.75), V(0.1, 0.4, 0.7), V(0.35, 0.18, 0.25), V(0.38, 0.16, -0.3), V(0.1, 0.25, -0.9)] },
    // 4 — back through the big loop
    { s: standing(0.55), t: [V(0.55, 0, 0), V(0.8, 0.2, 0), V(0.55, 0.38, 0), V(0.15, 0.32, 0), ...helix(-0.1, -2.5, 0.3, TURNS, 0), V(-2.7, 0.55, 0.45), V(-1.6, 0.75, 0.75), V(0.1, 0.4, 0.7), V(0.35, 0.18, 0.25), V(0.38, 0.16, -0.3), V(0.0, 0.5, -0.75), V(-0.7, 1.0, -0.25), V(-1.0, 0.85, 0.45), V(-1.3, 0.2, 1.25), V(-1.9, -0.3, 1.7)] },
    // 5 — tightened: wraps bed down against the eye
    { s: standing(0.32), t: [V(0.32, 0, 0), V(0.42, 0.08, 0), V(0.3, 0.14, 0), V(0.12, 0.12, 0), ...helix(0.02, -0.75, 0.1, TURNS, 0), V(-0.82, 0.12, 0.06), V(-0.6, 0.15, 0.1), V(-0.2, 0.13, 0.1), V(0.12, 0.1, 0.05), V(0.13, 0.08, -0.05), V(0.0, 0.14, -0.08), V(-0.3, 0.16, -0.02), V(-0.45, 0.12, 0.08), V(-0.8, 0.2, 0.5), V(-1.6, 0.5, 1.2)] },
    // 6 — trimmed
    { s: standing(0.32), t: [V(0.32, 0, 0), V(0.42, 0.08, 0), V(0.3, 0.14, 0), V(0.12, 0.12, 0), ...helix(0.02, -0.75, 0.1, TURNS, 0), V(-0.82, 0.12, 0.06), V(-0.6, 0.15, 0.1), V(-0.2, 0.13, 0.1), V(0.12, 0.1, 0.05), V(0.13, 0.08, -0.05), V(0.0, 0.14, -0.08), V(-0.3, 0.16, -0.02), V(-0.45, 0.12, 0.08), V(-0.52, 0.15, 0.13)] },
  ];

  const S_N = 120;
  const T_N = 420;
  const resample = (pts, n) => {
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
    return curve.getSpacedPoints(n - 1);
  };
  const keyS = SHAPES.map((sh) => resample(sh.s, S_N));
  const keyT = SHAPES.map((sh) => resample(sh.t, T_N));

  const lineMatS = new THREE.MeshStandardMaterial({ color: '#d8f05a', roughness: 0.35, emissive: '#3b4a00', emissiveIntensity: 0.25 });
  const lineMatT = new THREE.MeshStandardMaterial({ color: '#ff8a3d', roughness: 0.35, emissive: '#4a1a00', emissiveIntensity: 0.25 });
  let meshS = null;
  let meshT = null;
  const curS = keyS[0].map((p) => p.clone());
  const curT = keyT[0].map((p) => p.clone());

  function rebuild(radius) {
    if (meshS) { meshS.geometry.dispose(); scene.remove(meshS); }
    if (meshT) { meshT.geometry.dispose(); scene.remove(meshT); }
    meshS = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curS), 160, radius, 8, false), lineMatS);
    meshT = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curT), 520, radius, 8, false), lineMatT);
    meshS.castShadow = meshT.castShadow = true;
    scene.add(meshS, meshT);
  }

  const lblStanding = stage.addLabel('Standing line', V(-4.5, 0.25, 0), 'is-plain');
  const lblTag = stage.addLabel('Tag end', () => curT[curT.length - 1].clone().add(V(0, 0.2, 0)), 'is-amber');
  const lblSmall = stage.addLabel('Small loop', V(0.7, 0.55, 0), 'is-teal');
  const lblBig = stage.addLabel('Big loop', V(-1.1, 1.05, 0.5), 'is-teal');
  const lblEye = stage.addLabel('Hook eye', V(0, -0.55, 0.3), 'is-plain');

  const st = { from: 0, to: 0, k: 1, playing: true, speed: 1, autoTimer: 0, step: 0, rotate: false, seen: new Set([0]) };

  function goto(step) {
    st.step = Math.max(0, Math.min(meta.steps.length - 1, step));
    st.from = st.to;
    st.to = st.step + 1; // shape index: step i ends at shape i+1
    st.k = 0;
    st.autoTimer = 0;
    st.seen.add(st.step);
    api.setStep(st.step);
    lblSmall.visible = st.step >= 1 && st.step <= 2;
    lblBig.visible = st.step === 3;
    lblEye.visible = st.step <= 1;
    if (st.seen.size === meta.steps.length) api.complete({ steps: meta.steps.length });
  }

  stage.onFrame((dt) => {
    if (st.rotate) {
      const t = stage.controls.target;
      const p = stage.camera.position.clone().sub(t);
      p.applyAxisAngle(V(0, 1, 0), dt * 0.35);
      stage.camera.position.copy(t).add(p);
    }
    if (st.k < 1) {
      st.k = Math.min(1, st.k + dt * st.speed / 2.2);
      const e = st.k < 0.5 ? 2 * st.k * st.k : 1 - (-2 * st.k + 2) ** 2 / 2;
      const A = keyS[st.from]; const B = keyS[st.to];
      for (let i = 0; i < S_N; i += 1) curS[i].lerpVectors(A[i], B[i], e);
      const C = keyT[st.from]; const D = keyT[st.to];
      for (let i = 0; i < T_N; i += 1) curT[i].lerpVectors(C[i], D[i], e);
      rebuild(st.to >= 5 ? 0.05 - 0.01 * e : 0.05);
    } else if (st.playing) {
      st.autoTimer += dt * st.speed;
      if (st.autoTimer > 2.6 && st.step < meta.steps.length - 1) goto(st.step + 1);
    }
  });

  rebuild(0.05);
  goto(0);

  api.setPanel(`
    <h3 class="p3d-panel-title">Knot tips</h3>
    <ul class="guide-list small">
      <li><span>●</span><span><b style="color:#9cb800">Green</b> is the standing line back to your reel; <b style="color:#e8661a">orange</b> is the tag end you work with.</span></li>
      <li><span>●</span><span>Use 5 wraps for thicker line, up to 7 for thin line.</span></li>
      <li><span>●</span><span>Always wet the knot before pulling it tight — friction heat weakens line.</span></li>
      <li><span>●</span><span>Test every knot with a firm pull before you cast.</span></li>
    </ul>
    <div class="p3d-toggles">
      <label class="switch"><input type="checkbox" id="knot-rotate" /><span>Auto-rotate</span></label>
      <label class="switch"><input type="checkbox" id="knot-labels" checked /><span>Labels</span></label>
    </div>`, (panel) => {
    panel.querySelector('#knot-rotate').addEventListener('change', (e) => { st.rotate = e.target.checked; });
    panel.querySelector('#knot-labels').addEventListener('change', (e) => {
      const on = e.target.checked;
      lblStanding.visible = on;
      lblTag.visible = on;
      if (!on) { lblSmall.visible = false; lblBig.visible = false; lblEye.visible = false; } else goto(st.step);
    });
  });

  const CAMS = {
    front: { label: 'Front', pos: [-1.2, 1.4, 6.2], target: [-0.7, -0.3, 0] },
    close: { label: 'Close-up', pos: [0.6, 0.9, 2.6], target: [-0.3, 0.1, 0] },
    top: { label: 'Top', pos: [-0.8, 6.5, 0.6], target: [-0.8, 0, 0] },
  };

  return {
    cameras: CAMS,
    setCamera(id) { const c = CAMS[id]; if (c) stage.moveCamera(c.pos, c.target, 0.9); },
    goto(i) {
      // replaying from an earlier shape keeps the morph continuous
      st.to = Math.max(0, Math.min(SHAPES.length - 1, i));
      goto(i);
      st.from = i === 0 ? 0 : i;
      st.to = i + 1;
      st.k = 0;
    },
    setPlaying(on) { st.playing = on; },
    setSpeed(s) { st.speed = s; },
    restart() {
      st.to = 0;
      for (let i = 0; i < S_N; i += 1) curS[i].copy(keyS[0][i]);
      for (let i = 0; i < T_N; i += 1) curT[i].copy(keyT[0][i]);
      goto(0);
      st.from = 0;
    },
  };
}
