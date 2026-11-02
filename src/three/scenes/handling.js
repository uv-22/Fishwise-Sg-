/**
 * 3D lesson: handling fish safely.
 *
 * Four modelled fish. For each, the learner taps the fish to find its danger
 * points (spines, barb, beak) or its safe holding points. Hotspots stay
 * hidden until found, so the learner has to look.
 */

export const meta = {
  id: 'handling',
  title: 'Handle fish safely',
  subtitle: 'Spines, barbs and safe grips',
  minutes: 6,
  lessonId: 'a4-release',
  goal: 'Find every marked point on all four fish.',
  steps: [
    { title: 'Peacock bass — safe grip', text: 'An easy fish to handle. Tap the two places you should hold it: where your thumb goes, and where you support its weight.' },
    { title: 'Marine catfish — find the spines', text: 'Catfish carry serrated, venomous spines that lock upright. Tap all three before you go near it.' },
    { title: 'Stingray — find the barb', text: 'Never lift a ray by its tail. Tap the part that makes it dangerous.' },
    { title: 'Pufferfish — find the dangers', text: 'A notorious bait thief. Tap what can hurt your fingers, then what makes it dangerous to eat.' },
  ],
};

export async function create(stage, api) {
  const { THREE, scene, mat } = stage;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  stage.camera.position.set(1.2, 2.4, 5.6);
  stage.controls.target.set(0, 0.55, 0);
  stage.controls.minDistance = 2.2;
  stage.controls.maxDistance = 12;
  stage.sun.position.set(-3, 9, 5);
  stage.sun.shadow.camera.left = -5;
  stage.sun.shadow.camera.right = 5;
  stage.sun.shadow.camera.top = 5;
  stage.sun.shadow.camera.bottom = -5;
  stage.sun.shadow.camera.updateProjectionMatrix();

  // Studio: wet deck boards and a measuring board
  const floor = new THREE.Mesh(new THREE.CircleGeometry(9, 48), mat('#7d6248', { roughness: 0.55 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const board = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.08, 1.6), mat('#f1ead9', { roughness: 0.7 }));
  board.position.y = 0.04;
  board.receiveShadow = true;
  scene.add(board);
  for (let x = -2; x <= 2.01; x += 0.25) {
    const tick = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.005, x % 1 === 0 ? 0.25 : 0.12), mat('#333'));
    tick.position.set(x, 0.085, -0.72);
    scene.add(tick);
  }

  /* ---------- helpers ---------- */
  const paintBody = (geo, fn) => {
    const pos = geo.attributes.position;
    const cols = [];
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i += 1) {
      fn(pos.getX(i), pos.getY(i), pos.getZ(i), c);
      cols.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  };
  const finShape = (pts) => {
    const s = new THREE.Shape();
    s.moveTo(pts[0][0], pts[0][1]);
    pts.slice(1).forEach(([x, y]) => s.lineTo(x, y));
    s.closePath();
    return new THREE.ShapeGeometry(s);
  };
  const eyeFor = (group, x, y, z, r = 0.07) => {
    [z, -z].forEach((zz) => {
      const white = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), mat('#f4e9b0', { roughness: 0.2 }));
      white.position.set(x, y, zz);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(r * 0.55, 12, 8), mat('#0b0b0b', { roughness: 0.1 }));
      pupil.position.set(x + r * 0.25, y, zz + Math.sign(zz) * r * 0.55);
      group.add(white, pupil);
    });
  };

  /* ---------- Peacock bass ---------- */
  function buildBass() {
    const g = new THREE.Group();
    const geo = new THREE.SphereGeometry(0.5, 48, 32);
    geo.scale(2.2, 0.95, 0.55);
    paintBody(geo, (x, y, _z, c) => {
      const base = new THREE.Color('#b9a83a').lerp(new THREE.Color('#e9dfa0'), Math.max(0, -y) * 1.6);
      const bar = Math.abs(Math.sin((x + 0.15) * 4.6)) > 0.88 && y > -0.2 && x > -0.8 && x < 0.7;
      c.copy(bar ? new THREE.Color('#2f3a1a') : base);
      if (y > 0.3) c.lerp(new THREE.Color('#5d6a25'), 0.5);
    });
    const body = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45 }));
    g.add(body);
    const finMat = mat('#c46a2a', { side: THREE.DoubleSide, roughness: 0.6, transparent: true, opacity: 0.92 });
    const dorsal = new THREE.Mesh(finShape([[-0.7, 0], [-0.5, 0.35], [0.1, 0.42], [0.55, 0.12], [0.6, 0]]), finMat);
    dorsal.position.y = 0.42;
    const tail = new THREE.Mesh(finShape([[0, 0], [-0.55, 0.42], [-0.45, 0], [-0.55, -0.42]]), finMat);
    tail.position.x = -1.05;
    const spot = new THREE.Mesh(new THREE.CircleGeometry(0.1, 20), mat('#121212'));
    spot.position.set(-1.25, 0.05, 0.012);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.14, 20), mat('#f3a43a'));
    ring.position.copy(spot.position);
    const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.18, 18, 12), mat('#e8dca0'));
    jaw.scale.set(1.2, 0.45, 0.9);
    jaw.position.set(1.0, -0.2, 0);
    g.add(dorsal, tail, spot, ring, jaw);
    eyeFor(g, 0.78, 0.12, 0.2, 0.075);
    return {
      group: g,
      hotspots: [
        { id: 'lip', pos: V(1.18, -0.22, 0), target: true, kind: 'safe', title: 'Lower lip — thumb grip', text: 'Hold the lower jaw between thumb and finger (or use a lip-grip tool). Peacock bass have no sharp teeth.' },
        { id: 'belly', pos: V(-0.1, -0.45, 0), target: true, kind: 'safe', title: 'Belly — support the weight', text: 'For bigger fish, support the belly with your other hand so the jaw is not taking all the weight.' },
        { id: 'gills', pos: V(0.6, 0.0, 0.26), target: false, kind: 'avoid', title: 'Not the gills', text: 'Never put fingers in or under the gills — it damages the fish and is how it breathes.' },
      ],
    };
  }

  /* ---------- Marine catfish ---------- */
  function buildCatfish() {
    const g = new THREE.Group();
    const geo = new THREE.SphereGeometry(0.5, 48, 32);
    geo.scale(2.9, 0.75, 0.62);
    paintBody(geo, (_x, y, _z, c) => c.set('#7d8a93').lerp(new THREE.Color('#dfe5e8'), Math.max(0, -y) * 2.2));
    g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.15 })));
    const finMat = mat('#6c7880', { side: THREE.DoubleSide, roughness: 0.5 });
    const tail = new THREE.Mesh(finShape([[0, 0], [-0.5, 0.38], [-0.32, 0], [-0.5, -0.38]]), finMat);
    tail.position.x = -1.38;
    g.add(tail);
    const spineMat = mat('#e8d9b5', { roughness: 0.4 });
    const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.55, 8), spineMat);
    dorsal.position.set(0.45, 0.6, 0);
    dorsal.rotation.z = -0.35;
    const dorsalFin = new THREE.Mesh(finShape([[0, 0], [0.22, 0.48], [0.45, 0]]), finMat);
    dorsalFin.position.set(0.25, 0.32, 0);
    g.add(dorsal, dorsalFin);
    [1, -1].forEach((s) => {
      const pec = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.5, 8), spineMat);
      pec.position.set(0.72, -0.15, s * 0.42);
      pec.rotation.set(s * 1.25, 0, -0.5);
      g.add(pec);
    });
    const barbelMat = mat('#4c555c', { roughness: 0.6 });
    [[0.08, 0.6, 0.18], [0.08, -0.6, 0.18], [-0.08, 0.5, 0.12], [-0.08, -0.5, 0.12], [-0.12, 0.35, 0.05], [-0.12, -0.35, 0.05]].forEach(([y, z, droop]) => {
      const curve = new THREE.CatmullRomCurve3([V(1.4, y, z * 0.2), V(1.65, y - droop, z * 0.6), V(1.8, y - droop * 2.2, z)]);
      g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.014, 6, false), barbelMat));
    });
    eyeFor(g, 1.08, 0.12, 0.24, 0.06);
    return {
      group: g,
      hotspots: [
        { id: 'dorsal', pos: V(0.55, 0.85, 0), target: true, kind: 'danger', title: 'Dorsal spine', text: 'Serrated and venomous. It locks upright — never grip across the back.' },
        { id: 'pecL', pos: V(0.85, -0.22, 0.62), target: true, kind: 'danger', title: 'Pectoral spine (near side)', text: 'Sticks out sideways behind the head. This is the spine that catches most hands.' },
        { id: 'pecR', pos: V(0.85, -0.22, -0.62), target: true, kind: 'danger', title: 'Pectoral spine (far side)', text: 'There is one on each side. Pin the fish with a wet towel and unhook with long-nose pliers.' },
        { id: 'barbels', pos: V(1.7, -0.05, 0.3), target: false, kind: 'info', title: 'Barbels (whiskers)', text: 'Harmless sensory whiskers — but a sure sign you have a catfish. Watch the spines.' },
      ],
    };
  }

  /* ---------- Stingray ---------- */
  function buildRay() {
    const g = new THREE.Group();
    const geo = new THREE.SphereGeometry(0.5, 48, 24);
    geo.scale(2.6, 0.32, 2.3);
    paintBody(geo, (x, y, z, c) => {
      c.set(y > 0 ? '#6b5236' : '#efe6da');
      if (y > 0 && Math.sin(x * 9) * Math.cos(z * 9) > 0.7) c.lerp(new THREE.Color('#4b3824'), 0.5);
    });
    const disc = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }));
    disc.position.y = 0.2;
    g.add(disc);
    const tailCurve = new THREE.CatmullRomCurve3([V(-1.15, 0.2, 0), V(-1.9, 0.22, 0.05), V(-2.7, 0.18, 0.2), V(-3.4, 0.15, 0.45)]);
    const tailGeo = new THREE.TubeGeometry(tailCurve, 40, 0.06, 8, false);
    const tp = tailGeo.attributes.position;
    for (let i = 0; i < tp.count; i += 1) {
      // taper the tail toward its tip
      const ring = Math.floor(i / 9);
      const k = 1 - (ring / 40) * 0.8;
      const center = tailCurve.getPointAt(Math.min(1, ring / 40));
      tp.setXYZ(i, center.x + (tp.getX(i) - center.x) * k, center.y + (tp.getY(i) - center.y) * k, center.z + (tp.getZ(i) - center.z) * k);
    }
    g.add(new THREE.Mesh(tailGeo, mat('#5a4430')));
    const barb = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.38, 8), mat('#d8c9a4', { roughness: 0.3 }));
    barb.position.set(-2.05, 0.3, 0.07);
    barb.rotation.z = Math.PI / 2 + 0.3;
    g.add(barb);
    [0.28, -0.28].forEach((z) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), mat('#2a1d10', { roughness: 0.2 }));
      eye.position.set(0.55, 0.36, z);
      g.add(eye);
    });
    return {
      group: g,
      hotspots: [
        { id: 'barb', pos: V(-2.05, 0.33, 0.07), target: true, kind: 'danger', title: 'Venomous tail barb', text: 'A serrated barb on the tail. Keep everyone clear of the tail. If you cannot unhook safely, cut the line close to the hook. A barb wound is a medical emergency.' },
        { id: 'tail', pos: V(-3.1, 0.17, 0.35), target: false, kind: 'avoid', title: 'Never lift by the tail', text: 'Lifting by the tail swings the barb toward you. Leave the ray in the water if you can.' },
      ],
    };
  }

  /* ---------- Pufferfish ---------- */
  function buildPuffer() {
    const g = new THREE.Group();
    const geo = new THREE.SphereGeometry(0.75, 48, 32);
    geo.scale(1.15, 1, 0.95);
    paintBody(geo, (x, y, z, c) => {
      c.set(y > -0.1 ? '#8a8a5a' : '#f2efe2');
      if (y > -0.1 && Math.sin(x * 14) * Math.sin(z * 14 + y * 6) > 0.75) c.set('#2d2a1c');
    });
    const body = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 }));
    body.position.y = 0.75;
    g.add(body);
    const spineGeo = new THREE.ConeGeometry(0.02, 0.1, 5);
    const spineMat = mat('#d8d2b2');
    const n = 120;
    const inst = new THREE.InstancedMesh(spineGeo, spineMat, n);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    for (let i = 0; i < n; i += 1) {
      const y = 1 - (i / (n - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = i * 2.399963;
      const dir = V(Math.cos(th) * r, y, Math.sin(th) * r);
      const p = V(dir.x * 0.86, dir.y * 0.75 + 0.75, dir.z * 0.72);
      q.setFromUnitVectors(V(0, 1, 0), dir);
      m4.compose(p, q, V(1, 1, 1));
      inst.setMatrixAt(i, m4);
    }
    g.add(inst);
    const beakMat = mat('#f7f5ee', { roughness: 0.3 });
    [0.06, -0.06].forEach((y) => {
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.18), beakMat);
      tooth.position.set(0.88, 0.7 + y, 0);
      g.add(tooth);
    });
    const finMat = mat('#c9c08a', { side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
    const tail = new THREE.Mesh(finShape([[0, 0], [-0.4, 0.3], [-0.4, -0.3]]), finMat);
    tail.position.set(-0.82, 0.75, 0);
    g.add(tail);
    eyeFor(g, 0.55, 1.0, 0.36, 0.09);
    return {
      group: g,
      hotspots: [
        { id: 'beak', pos: V(0.95, 0.7, 0), target: true, kind: 'danger', title: 'Beak-like teeth', text: 'Fused teeth that bite through line — and fingers. Unhook with long-nose pliers.' },
        { id: 'toxin', pos: V(0.0, 0.75, 0.75), target: true, kind: 'danger', title: 'Toxic flesh — never eat', text: 'Many pufferfish carry tetrodotoxin, a potentially fatal toxin. Never eat one. Do not squeeze it to make it puff up; return it quickly.' },
      ],
    };
  }

  const builders = [buildBass, buildCatfish, buildRay, buildPuffer];
  const fish = builders.map((b) => {
    const f = b();
    stage.shadowAll(f.group, true, false);
    f.group.visible = false;
    scene.add(f.group);
    f.found = new Set();
    f.misses = 0;
    return f;
  });

  // Markers for found hotspots
  const markerGeo = new THREE.SphereGeometry(0.07, 16, 12);
  const markerColors = { safe: '#16c79a', danger: '#e5484d', avoid: '#f2a541', info: '#4ea8de' };
  const markers = [];
  const hintRing = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.02, 8, 32), new THREE.MeshBasicMaterial({ color: '#ffd166', transparent: true, opacity: 0 }));
  scene.add(hintRing);
  let hintT = -1;

  const st = { idx: 0, turntable: true, lastInfo: null };

  function worldPos(f, h) {
    return h.pos.clone().applyMatrix4(f.group.matrixWorld);
  }

  function show(i) {
    st.idx = Math.max(0, Math.min(fish.length - 1, i));
    fish.forEach((f, k) => { f.group.visible = k === st.idx; });
    markers.forEach((m) => { m.mesh.visible = m.fish === st.idx; m.label.visible = m.fish === st.idx; });
    api.setStep(st.idx);
    st.lastInfo = null;
    renderPanel();
  }

  function addMarker(fi, h) {
    const f = fish[fi];
    f.group.updateMatrixWorld();
    const mesh = new THREE.Mesh(markerGeo, new THREE.MeshBasicMaterial({ color: markerColors[h.kind] }));
    mesh.position.copy(h.pos);
    f.group.add(mesh);
    const label = stage.addLabel(h.title, mesh, `is-${h.kind === 'safe' ? 'teal' : h.kind === 'danger' ? 'red' : 'amber'}`);
    markers.push({ fish: fi, mesh, label, id: h.id });
  }

  stage.onPick((ray) => {
    const f = fish[st.idx];
    f.group.updateMatrixWorld();
    const hit = ray.intersectObject(f.group, true)[0];
    if (!hit) return;
    let best = null;
    let bestD = Infinity;
    f.hotspots.forEach((h) => {
      const d = worldPos(f, h).distanceTo(hit.point);
      if (d < bestD) { bestD = d; best = h; }
    });
    const radius = best && best.target ? 0.42 : 0.32;
    if (best && bestD < radius) {
      if (!f.found.has(best.id)) {
        f.found.add(best.id);
        addMarker(st.idx, best);
      }
      st.lastInfo = best;
      f.misses = 0;
    } else {
      f.misses += 1;
      st.lastInfo = { miss: true };
      if (f.misses >= 2) {
        const remaining = f.hotspots.find((h) => h.target && !f.found.has(h.id));
        if (remaining) {
          hintRing.position.copy(worldPos(f, remaining));
          hintT = 0;
        }
      }
    }
    renderPanel();
    if (fish.every((x) => x.hotspots.filter((h) => h.target).every((h) => x.found.has(h.id)))) {
      api.complete({ fish: fish.length });
    }
  });

  stage.onHover((ray) => {
    const hit = ray.intersectObject(fish[st.idx].group, true)[0];
    stage.renderer.domElement.style.cursor = hit ? 'crosshair' : '';
  });

  stage.onFrame((dt, t) => {
    const f = fish[st.idx];
    if (st.turntable) f.group.rotation.y += dt * 0.25;
    f.group.position.y = (st.idx <= 1 ? 0.62 : 0.02) + Math.sin(t * 1.5) * 0.015;
    if (hintT >= 0) {
      hintT += dt;
      hintRing.lookAt(stage.camera.position);
      const s = 1 + Math.sin(hintT * 8) * 0.25;
      hintRing.scale.set(s, s, s);
      hintRing.material.opacity = Math.max(0, 1 - hintT / 3);
      if (hintT > 3) hintT = -1;
    }
  });

  function renderPanel() {
    const f = fish[st.idx];
    const targets = f.hotspots.filter((h) => h.target);
    const foundTargets = targets.filter((h) => f.found.has(h.id)).length;
    const info = st.lastInfo;
    let infoHTML = '';
    if (info?.miss) {
      infoHTML = `<div class="notice" style="margin-top:.6rem"><div>${f.misses >= 2 ? 'Look where the glowing ring appears.' : 'Not there — rotate the fish and look closely.'}</div></div>`;
    } else if (info) {
      const tone = info.kind === 'safe' ? 'teal' : info.kind === 'danger' ? 'red' : 'amber';
      infoHTML = `<div class="notice notice-${tone}" style="margin-top:.6rem"><div><strong>${info.title}</strong><br>${info.text}</div></div>`;
    }
    const all = fish.reduce((n, x) => n + x.hotspots.filter((h) => h.target && x.found.has(h.id)).length, 0);
    const total = fish.reduce((n, x) => n + x.hotspots.filter((h) => h.target).length, 0);
    api.setPanel(`
      <h3 class="p3d-panel-title">${meta.steps[st.idx].title}</h3>
      <p class="small">${meta.steps[st.idx].text}</p>
      <div class="score-row"><span>Found on this fish</span><b>${foundTargets} / ${targets.length}</b></div>
      ${infoHTML}
      <ul class="found-list">${f.hotspots.filter((h) => f.found.has(h.id)).map((h) => `<li class="k-${h.kind}"><b>${h.title}</b></li>`).join('')}</ul>
      ${foundTargets === targets.length && st.idx < fish.length - 1 ? '<button class="btn btn-primary btn-block" type="button" id="hd-next">Next fish</button>' : ''}
      <div class="p3d-toggles"><label class="switch"><input type="checkbox" id="hd-turn" ${st.turntable ? 'checked' : ''} /><span>Turntable</span></label></div>
      <p class="small muted">All fish: ${all} / ${total} points found</p>
    `, (panel) => {
      panel.querySelector('#hd-next')?.addEventListener('click', () => show(st.idx + 1));
      panel.querySelector('#hd-turn').addEventListener('change', (e) => { st.turntable = e.target.checked; });
    });
  }

  show(0);

  const CAMS = {
    side: { label: 'Side', pos: [0.2, 1.2, 5.2], target: [0, 0.55, 0] },
    above: { label: 'Above', pos: [0.1, 6, 1.2], target: [0, 0.4, 0] },
    angle: { label: 'Angle', pos: [3.6, 2.6, 3.8], target: [0, 0.55, 0] },
  };
  return {
    cameras: CAMS,
    setCamera(id) { const c = CAMS[id]; if (c) stage.moveCamera(c.pos, c.target, 0.9); },
    goto(i) { show(i); },
    setPlaying(on) { st.turntable = on; },
    setSpeed() {},
    restart() {
      markers.forEach((m) => { m.mesh.parent.remove(m.mesh); m.label.remove(); });
      markers.length = 0;
      fish.forEach((f) => { f.found.clear(); f.misses = 0; });
      show(0);
    },
    interactive: true,
  };
}
