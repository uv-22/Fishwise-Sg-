/**
 * 3D lesson: the overhead cast with a spinning reel.
 *
 * Articulated angler (two-bone arm IK), a rod that bends as it loads,
 * verlet-simulated fishing line, a 3D "clock" guide, camera presets, and a
 * practice mode where the learner chooses the release point.
 */

import { createWater, createRope } from '../stage.js';

const DEG = Math.PI / 180;
const ROD_LEN = 2.15;
const JETTY_END = 1.2;
const DECK_Y = 1.5;
const TARGET_X = JETTY_END + 17.5;

export const meta = {
  id: 'cast',
  title: 'The overhead cast',
  subtitle: 'Timing, not strength',
  minutes: 6,
  lessonId: 'b4-cast',
  goal: 'Make one good cast in practice mode (release between 11 and 9 o’clock, ideally 10).',
  steps: [
    { title: 'Grip and set up', text: 'Hold the rod with the reel stem between your middle fingers. Let about 30 cm of line hang from the tip. Rod starts at about 10 o’clock.' },
    { title: 'Pin the line, open the bail', text: 'Hook the line over your index finger, then flip the bail arm open. Only your finger is holding the line now.' },
    { title: 'Check behind you', text: 'Look over your shoulder. No people, trees or railings in the swing path — a hook in the back swing is the most common fishing injury.' },
    { title: 'Back swing to 1 o’clock', text: 'Lift the rod back smoothly and stop at about 1 o’clock. Watch the tip bend — the rod is storing energy.' },
    { title: 'Forward stroke and release', text: 'Accelerate forward in one smooth stroke and lift your finger as the rod passes about 10 o’clock.' },
    { title: 'Follow through', text: 'Keep the rod pointing toward the target while the lure flies. The line peels off the open spool.' },
    { title: 'Close the bail and retrieve', text: 'As the lure lands, close the bail by hand and wind in the slack so you stay in contact with the lure.' },
  ],
};

const clockLabel = (deg) => `${(12 - Math.round(deg / 30) + 12) % 12 || 12} o’clock`;

export function verdictFor(releaseDeg, distance) {
  if (distance < 0.5) return { tone: 'red', grade: 'miss', text: 'Too late — the lure hit the jetty. Release earlier, around 10 o’clock.' };
  if (releaseDeg < 45) return { tone: 'amber', grade: 'early', text: `Early release (${clockLabel(releaseDeg)}): the lure ballooned up and fell short at ${distance.toFixed(1)} m.` };
  if (releaseDeg > 75) return { tone: 'amber', grade: 'late', text: `Late release (${clockLabel(releaseDeg)}): the lure drove down and landed close in at ${distance.toFixed(1)} m.` };
  return { tone: 'teal', grade: 'good', text: `Good cast! Released at ${clockLabel(releaseDeg)} — a flat, controlled flight to ${distance.toFixed(1)} m.` };
}

export async function create(stage, api) {
  const { THREE, scene, mat } = stage;

  /* ================= World ================= */
  createWater(stage, { width: 160, depth: 110, x: 40, z: -10, segX: 140, segZ: 90 });

  // Seabed tint under the jetty so the shallows read
  const bed = new THREE.Mesh(new THREE.PlaneGeometry(160, 110), mat('#2b4b44'));
  bed.rotation.x = -Math.PI / 2;
  bed.position.set(40, -2.5, -10);
  scene.add(bed);

  // Jetty deck from planks
  const deck = new THREE.Group();
  const plankGeo = new THREE.BoxGeometry(0.28, 0.08, 3);
  for (let x = -11; x <= JETTY_END; x += 0.3) {
    const shade = 0.85 + Math.random() * 0.15;
    const plank = new THREE.Mesh(plankGeo, mat(new THREE.Color(0.55 * shade, 0.40 * shade, 0.27 * shade), { roughness: 0.9 }));
    plank.position.set(x, DECK_Y - 0.04, 0);
    deck.add(plank);
  }
  const beamGeo = new THREE.BoxGeometry(12.4, 0.18, 0.16);
  [-1.35, 1.35].forEach((z) => {
    const beam = new THREE.Mesh(beamGeo, mat('#5a412b'));
    beam.position.set(-4.9, DECK_Y - 0.17, z);
    deck.add(beam);
  });
  const pylonGeo = new THREE.CylinderGeometry(0.13, 0.15, 4.2, 12);
  for (let x = -10.5; x <= JETTY_END; x += 2.35) {
    [-1.35, 1.35].forEach((z) => {
      const p = new THREE.Mesh(pylonGeo, mat('#4c3826', { roughness: 0.95 }));
      p.position.set(x, DECK_Y - 2.2, z);
      deck.add(p);
    });
  }
  // Blue railing on the far side, as PUB marks designated fishing zones
  const railMat = mat('#1f5fbf', { roughness: 0.45, metalness: 0.2 });
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 12.2, 8), railMat);
  rail.rotation.z = Math.PI / 2;
  rail.position.set(-4.9, DECK_Y + 1.0, -1.42);
  deck.add(rail);
  const rail2 = rail.clone();
  rail2.position.y = DECK_Y + 0.55;
  deck.add(rail2);
  for (let x = -10.8; x <= JETTY_END; x += 1.2) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.0, 8), railMat);
    post.position.set(x, DECK_Y + 0.5, -1.42);
    deck.add(post);
  }
  // Fishing-zone sign
  const signCanvas = document.createElement('canvas');
  signCanvas.width = 256;
  signCanvas.height = 128;
  const sg = signCanvas.getContext('2d');
  sg.fillStyle = '#0f7a76';
  sg.fillRect(0, 0, 256, 128);
  sg.fillStyle = '#fff';
  sg.font = 'bold 30px Segoe UI, Arial';
  sg.textAlign = 'center';
  sg.fillText('FISHING ZONE', 128, 56);
  sg.font = '20px Segoe UI, Arial';
  sg.fillText('Artificial bait only', 128, 92);
  const signTex = new THREE.CanvasTexture(signCanvas);
  signTex.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.45), new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.6 }));
  sign.position.set(-3.2, DECK_Y + 1.35, -1.38);
  deck.add(sign);
  const signPost = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 8), mat('#777'));
  signPost.position.set(-3.2, DECK_Y + 0.7, -1.42);
  deck.add(signPost);
  stage.shadowAll(deck);
  scene.add(deck);

  // Far shore: mangroves and HDB blocks with lit windows
  const shore = new THREE.Mesh(new THREE.BoxGeometry(220, 1.4, 14), mat('#3f5e3e', { roughness: 1 }));
  shore.position.set(30, 0.3, -112);
  scene.add(shore);
  const treeMat = mat('#2f5a33', { roughness: 1 });
  for (let i = 0; i < 70; i += 1) {
    const t = new THREE.Mesh(new THREE.SphereGeometry(1.4 + Math.random() * 1.6, 10, 8), treeMat);
    t.position.set(-60 + i * 3.1 + Math.random() * 2, 1.6 + Math.random() * 0.8, -106 - Math.random() * 6);
    t.scale.y = 0.7;
    scene.add(t);
  }
  const winCanvas = document.createElement('canvas');
  winCanvas.width = 64;
  winCanvas.height = 128;
  const wg = winCanvas.getContext('2d');
  wg.fillStyle = '#ece6da';
  wg.fillRect(0, 0, 64, 128);
  for (let y = 6; y < 128; y += 10) for (let x = 6; x < 64; x += 12) {
    wg.fillStyle = Math.random() > 0.8 ? '#8fb3c9' : '#6f8796';
    wg.fillRect(x, y, 7, 5);
  }
  const winTex = new THREE.CanvasTexture(winCanvas);
  winTex.colorSpace = THREE.SRGBColorSpace;
  [[-30, 18], [-18, 26], [-6, 21], [8, 30], [20, 23], [34, 28], [48, 19], [62, 25], [76, 22]].forEach(([x, h]) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(7, h * 0.6, 6), new THREE.MeshStandardMaterial({ map: winTex, roughness: 0.8 }));
    b.position.set(x * 1.4, h * 0.3 + 1, -125);
    scene.add(b);
  });

  // Target buoy
  const buoy = new THREE.Group();
  const buoyBody = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 14), mat('#e2683c', { roughness: 0.4 }));
  const buoyBand = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.05, 8, 24), mat('#ffffff'));
  buoyBand.rotation.x = Math.PI / 2;
  buoy.add(buoyBody, buoyBand);
  buoy.position.set(TARGET_X, 0.08, 0);
  stage.shadowAll(buoy);
  scene.add(buoy);
  const targetRing = new THREE.Mesh(new THREE.RingGeometry(1.8, 2.0, 48), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
  targetRing.rotation.x = -Math.PI / 2;
  targetRing.position.set(TARGET_X, 0.06, 0);
  scene.add(targetRing);

  /* ================= Angler ================= */
  const skin = mat('#c48e66', { roughness: 0.6 });
  const shirt = mat('#123449', { roughness: 0.8 });
  const pants = mat('#3d4b5c', { roughness: 0.9 });
  const capMat = mat('#0f7a76', { roughness: 0.6 });

  const angler = new THREE.Group();
  angler.position.set(-0.25, DECK_Y, 0);
  scene.add(angler);

  const limb = (r, m) => {
    const g = new THREE.CylinderGeometry(r, r * 0.92, 1, 12);
    g.translate(0, 0.5, 0);
    const mesh = new THREE.Mesh(g, m);
    mesh.castShadow = true;
    return mesh;
  };
  const joint = (r, m) => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), m);
    s.castShadow = true;
    return s;
  };

  // legs
  [0.13, -0.13].forEach((z) => {
    const leg = limb(0.085, pants);
    leg.position.set(0, 0.06, z);
    leg.scale.y = 0.9;
    angler.add(leg);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.13), mat('#222', { roughness: 0.7 }));
    shoe.position.set(0.05, 0.05, z);
    shoe.castShadow = true;
    angler.add(shoe);
  });
  const hips = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.2, 0.38), pants);
  hips.position.set(0, 0.98, 0);
  hips.castShadow = true;
  angler.add(hips);

  const torso = new THREE.Group();
  torso.position.set(0, 1.0, 0);
  angler.add(torso);
  const chest = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.42, 6, 14), shirt);
  chest.position.y = 0.33;
  chest.scale.set(0.85, 1, 1.15);
  chest.castShadow = true;
  torso.add(chest);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.12, 10), skin);
  neck.position.y = 0.72;
  torso.add(neck);
  const head = new THREE.Group();
  head.position.y = 0.88;
  torso.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.135, 18, 14), skin);
  skull.castShadow = true;
  head.add(skull);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.142, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), capMat);
  cap.position.y = 0.02;
  head.add(cap);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.02, 16, 1, false, -Math.PI / 2, Math.PI), capMat);
  brim.position.set(0.09, 0.03, 0);
  brim.scale.set(1.3, 1, 1);
  head.add(brim);
  const sunglasses = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.035, 0.2), mat('#111', { roughness: 0.2, metalness: 0.5 }));
  sunglasses.position.set(0.125, 0.0, 0);
  head.add(sunglasses);

  const upperR = limb(0.055, shirt);
  const foreR = limb(0.045, skin);
  const elbowR = joint(0.055, shirt);
  const handR = joint(0.06, skin);
  const upperL = limb(0.055, shirt);
  const foreL = limb(0.045, skin);
  const elbowL = joint(0.055, shirt);
  const handL = joint(0.06, skin);
  [upperR, foreR, elbowR, handR, upperL, foreL, elbowL, handL].forEach((m) => scene.add(m));

  const UP = new THREE.Vector3(0, 1, 0);
  const placeLimb = (mesh, a, b) => {
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    mesh.position.copy(a);
    mesh.quaternion.setFromUnitVectors(UP, dir.normalize());
    mesh.scale.set(1, len, 1);
  };
  const ik = (S, H, a, b, pole) => {
    const toH = new THREE.Vector3().subVectors(H, S);
    const d = Math.min(toH.length(), a + b - 1e-3);
    const dir = toH.normalize();
    const cosA = (a * a + d * d - b * b) / (2 * a * d);
    const ang = Math.acos(Math.max(-1, Math.min(1, cosA)));
    const p = new THREE.Vector3().subVectors(pole, S);
    p.addScaledVector(dir, -p.dot(dir)).normalize();
    const E = S.clone().addScaledVector(dir, a * Math.cos(ang)).addScaledVector(p, a * Math.sin(ang));
    const Hc = S.clone().addScaledVector(dir, d);
    return { E, H: Hc };
  };

  /* ================= Rod (tapered tube updated in place) ================= */
  const ROD_SEG = 24;
  const ROD_RAD = 8;
  const rodPts = Array.from({ length: ROD_SEG + 1 }, () => new THREE.Vector3());
  const rodGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3(0, 1, 0)]), ROD_SEG, 0.022, ROD_RAD, false);
  const rod = new THREE.Mesh(rodGeo, mat('#1a1a1a', { roughness: 0.35, metalness: 0.3 }));
  rod.castShadow = true;
  rod.frustumCulled = false;
  scene.add(rod);
  const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.028, 0.42, 12), mat('#b88b5a', { roughness: 0.95 }));
  cork.castShadow = true;
  scene.add(cork);
  const reel = new THREE.Group();
  const reelBody = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.08, 20), mat('#9aa5b1', { metalness: 0.7, roughness: 0.3 }));
  reelBody.rotation.x = Math.PI / 2;
  const spool = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 20), mat('#2c6fad', { metalness: 0.4, roughness: 0.3 }));
  spool.rotation.x = Math.PI / 2;
  spool.position.z = 0.055;
  const bail = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.009, 8, 24, Math.PI), mat('#d9b44a', { metalness: 0.8, roughness: 0.25 }));
  bail.position.z = 0.055;
  reel.add(reelBody, spool, bail);
  scene.add(reel);

  const rodState = { phi: 60, bend: 0, bendVel: 0, prevPhi: 60, butt: new THREE.Vector3(), dir: new THREE.Vector3(), tip: new THREE.Vector3(), hand: new THREE.Vector3() };
  const shoulderR = new THREE.Vector3();
  const shoulderL = new THREE.Vector3();

  function updateRod(dt) {
    const phi = rodState.phi;
    const omega = dt > 0 ? (phi - rodState.prevPhi) / dt : 0; // deg/s, + = forward
    rodState.prevPhi = phi;
    // Damped spring: rod loads against the direction of motion, then springs back.
    const targetBend = Math.max(-0.42, Math.min(0.42, -omega * 0.0011));
    const k = 120;
    const c = 14;
    rodState.bendVel += (k * (targetBend - rodState.bend) - c * rodState.bendVel) * dt;
    rodState.bend += rodState.bendVel * dt;

    const d = rodState.dir.set(Math.sin(phi * DEG), Math.cos(phi * DEG), 0);
    const n = new THREE.Vector3(-Math.cos(phi * DEG), Math.sin(phi * DEG), 0); // "behind" the rod
    // Hand follows a small arc in front of the shoulder
    const base = angler.position;
    rodState.hand.set(base.x + 0.32 + 0.16 * Math.sin(phi * DEG), base.y + 1.28 + 0.24 * Math.cos(phi * DEG), 0.3);
    rodState.butt.copy(rodState.hand).addScaledVector(d, -0.32);
    for (let i = 0; i <= ROD_SEG; i += 1) {
      const s = i / ROD_SEG;
      rodPts[i].copy(rodState.butt).addScaledVector(d, ROD_LEN * s).addScaledVector(n, rodState.bend * ROD_LEN * 0.55 * s * s);
    }
    rodState.tip.copy(rodPts[ROD_SEG]);

    // write tube vertices (radius tapers toward the tip)
    const pos = rodGeo.attributes.position;
    const nor = rodGeo.attributes.normal;
    const T = new THREE.Vector3();
    const Z = new THREE.Vector3(0, 0, 1);
    const B = new THREE.Vector3();
    const v = new THREE.Vector3();
    for (let i = 0; i <= ROD_SEG; i += 1) {
      const a = rodPts[Math.max(0, i - 1)];
      const b = rodPts[Math.min(ROD_SEG, i + 1)];
      T.subVectors(b, a).normalize();
      B.crossVectors(T, Z).normalize();
      const r = 0.024 * (1 - 0.78 * (i / ROD_SEG));
      for (let j = 0; j <= ROD_RAD; j += 1) {
        const ang = (j / ROD_RAD) * Math.PI * 2;
        v.copy(Z).multiplyScalar(Math.cos(ang)).addScaledVector(B, Math.sin(ang));
        const idx = i * (ROD_RAD + 1) + j;
        nor.setXYZ(idx, v.x, v.y, v.z);
        pos.setXYZ(idx, rodPts[i].x + v.x * r, rodPts[i].y + v.y * r, rodPts[i].z + v.z * r);
      }
    }
    pos.needsUpdate = true;
    nor.needsUpdate = true;

    cork.position.copy(rodState.butt).addScaledVector(d, 0.22);
    cork.quaternion.setFromUnitVectors(UP, d);
    reel.position.copy(rodState.hand).addScaledVector(n, 0.09).addScaledVector(d, 0.02);
    reel.quaternion.setFromUnitVectors(UP, d);

    // Arms
    const tw = torso.matrixWorld;
    torso.updateWorldMatrix(true, false);
    shoulderR.set(0.02, 0.6, 0.23).applyMatrix4(tw);
    shoulderL.set(0.02, 0.6, -0.23).applyMatrix4(tw);
    const rArm = ik(shoulderR, rodState.hand, 0.3, 0.29, shoulderR.clone().add(new THREE.Vector3(-0.15, -0.35, 0.25)));
    placeLimb(upperR, shoulderR, rArm.E);
    placeLimb(foreR, rArm.E, rArm.H);
    elbowR.position.copy(rArm.E);
    handR.position.copy(rArm.H);
    const lTarget = rodState.butt.clone().addScaledVector(d, 0.04).add(new THREE.Vector3(0, 0, -0.04));
    const lArm = ik(shoulderL, lTarget, 0.3, 0.29, shoulderL.clone().add(new THREE.Vector3(-0.1, -0.4, -0.25)));
    placeLimb(upperL, shoulderL, lArm.E);
    placeLimb(foreL, lArm.E, lArm.H);
    elbowL.position.copy(lArm.E);
    handL.position.copy(lArm.H);

    torso.rotation.z = -(phi - 30) * 0.0025;
  }

  /* ================= Line + lure ================= */
  const lure = new THREE.Group();
  const lureBody = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 10), mat('#f4c430', { metalness: 0.6, roughness: 0.25 }));
  lureBody.scale.set(1.9, 0.75, 0.75);
  const lureTail = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.07, 8), mat('#e2683c'));
  lureTail.rotation.z = Math.PI / 2;
  lureTail.position.x = -0.11;
  lure.add(lureBody, lureTail);
  lure.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  scene.add(lure);

  const SHORT_N = 14;
  const LONG_N = 70;
  let rope = createRope(THREE, SHORT_N, 0.32 / (SHORT_N - 1));
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(LONG_N * 3), 3));
  const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: '#f6f3e6', transparent: true, opacity: 0.95 }));
  line.frustumCulled = false;
  scene.add(line);

  const splash = new THREE.Mesh(new THREE.RingGeometry(0.15, 0.24, 40), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
  splash.rotation.x = -Math.PI / 2;
  splash.position.y = 0.07;
  scene.add(splash);

  /* ================= Clock guide ================= */
  const guide = new THREE.Group();
  const ringPts = [];
  for (let a = -110; a <= 110; a += 4) ringPts.push(new THREE.Vector3(Math.sin(a * DEG) * 2.45, Math.cos(a * DEG) * 2.45, 0));
  guide.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ringPts), new THREE.LineDashedMaterial({ color: '#0b5f5c', dashSize: 0.1, gapSize: 0.07, transparent: true, opacity: 0.75 })));
  guide.children[0].computeLineDistances();
  const tick = (deg, color, len = 0.45) => {
    const g = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(Math.sin(deg * DEG) * (2.45 - len / 2), Math.cos(deg * DEG) * (2.45 - len / 2), 0),
      new THREE.Vector3(Math.sin(deg * DEG) * (2.45 + len / 2), Math.cos(deg * DEG) * (2.45 + len / 2), 0),
    ]);
    const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color }));
    guide.add(l);
    return l;
  };
  for (let h = -90; h <= 90; h += 30) tick(h, '#46617c', 0.22);
  tick(-30, '#f2a541', 0.55);
  tick(60, '#2dd4bf', 0.55);
  const releaseTick = tick(60, '#ff7a45', 0.8);
  scene.add(guide);
  const guideCenter = () => new THREE.Vector3(angler.position.x + 0.3, angler.position.y + 1.3, 0.32);
  const lblStop = stage.addLabel('1 o’clock · stop', () => guideCenter().add(new THREE.Vector3(Math.sin(-30 * DEG) * 2.75, Math.cos(-30 * DEG) * 2.75, 0)), 'is-amber');
  const lblRelease = stage.addLabel('10 o’clock · release', () => guideCenter().add(new THREE.Vector3(Math.sin(60 * DEG) * 2.8, Math.cos(60 * DEG) * 2.8, 0)), 'is-teal');
  const lblTarget = stage.addLabel('Target', () => new THREE.Vector3(TARGET_X, 0.9, 0), 'is-plain');

  /* ================= Simulation state ================= */
  const st = {
    step: 0,
    t: 0,
    playing: true,
    speed: 1,
    mode: 'auto', // or 'step'
    practice: false,
    releaseAt: 60,
    released: false,
    flying: false,
    landed: false,
    vel: new THREE.Vector3(),
    landX: 0,
    splashT: -1,
    retrieved: 0,
    headTurn: 0,
    camFollow: false,
    bailOpen: false,
  };

  function resetLine() {
    rope = createRope(THREE, SHORT_N, 0.32 / (SHORT_N - 1));
    rope.reset(rodState.tip.clone());
    lure.position.copy(rodState.tip).add(new THREE.Vector3(0, -0.32, 0));
    st.released = false;
    st.flying = false;
    st.landed = false;
    st.splashT = -1;
    st.retrieved = 0;
    splash.material.opacity = 0;
  }

  function launch() {
    const phi = st.releaseAt;
    // Instruction-faithful flight model: ~10 o'clock flies flat and far, early
    // release balloons high and short, late release drives the lure down.
    const alpha = 75 - 0.75 * phi - (phi > 70 ? (phi - 70) * 3 : 0);
    const speed = 13 * (1 - Math.abs(phi - 60) / 105);
    st.vel.set(Math.cos(alpha * DEG) * speed, Math.sin(alpha * DEG) * speed, (Math.random() - 0.5) * 0.4);
    lure.position.copy(rodState.tip);
    const n = Math.max(SHORT_N, LONG_N);
    const old = rope.pos.map((p) => p.clone());
    rope = createRope(THREE, n, 0.32 / (n - 1));
    for (let i = 0; i < n; i += 1) {
      const src = old[Math.min(old.length - 1, Math.floor((i / (n - 1)) * (old.length - 1)))];
      rope.pos[i].copy(src);
      rope.prev[i].copy(src);
    }
    st.released = true;
    st.flying = true;
  }

  function stepDuration(i) {
    return [2.2, 2.2, 2.0, 1.15, 0.55, 0, 3.4][i];
  }

  function enter(i, { play } = {}) {
    st.step = Math.max(0, Math.min(meta.steps.length - 1, i));
    st.t = 0;
    if (st.step <= 4) {
      if (st.step <= 3) rodState.phi = st.step === 3 ? 60 : 60;
      resetLine();
    }
    if (st.step === 5 && !st.released) {
      rodState.phi = st.releaseAt;
      launch();
    }
    if (st.step === 6 && !st.landed) {
      // jumping straight to the retrieve: place the lure where a good cast lands
      if (!st.released) launch();
    }
    st.bailOpen = st.step >= 1 && st.step <= 5;
    bail.rotation.z = st.bailOpen ? Math.PI : 0;
    bail.material.color.set(st.bailOpen ? '#ff9f43' : '#d9b44a');
    if (play !== undefined) st.playing = play;
    api.setStep(st.step);
    api.setHud(hudHTML());
  }

  function hudHTML() {
    return `<span class="hud-chip ${st.bailOpen ? 'is-open' : ''}">Bail: ${st.bailOpen ? 'open' : 'closed'}</span>
      <span class="hud-chip">Rod: ${clockLabel(rodState.phi)}</span>
      ${st.practice ? `<span class="hud-chip is-amber">Release at ${clockLabel(st.releaseAt)}</span>` : ''}`;
  }

  const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
  const easeIn = (x) => x * x * x;

  let hudTick = 0;
  stage.onFrame((rawDt) => {
    const dt = st.playing ? rawDt * st.speed : 0;
    st.t += dt;
    const dur = stepDuration(st.step);
    const k = dur ? Math.min(1, st.t / dur) : 0;

    switch (st.step) {
      case 0: case 1: rodState.phi = 60; break;
      case 2: rodState.phi = 60; break;
      case 3: rodState.phi = 60 + (-30 - 60) * ease(k); break;
      case 4:
        rodState.phi = -30 + 112 * easeIn(k);
        if (!st.released && rodState.phi >= st.releaseAt) launch();
        break;
      case 5: rodState.phi = Math.max(72, rodState.phi - rawDt * 30 * st.speed); break;
      case 6: rodState.phi = 72 - 12 * ease(k); break;
      default: break;
    }

    // head turns to check behind on step 2
    const wantTurn = st.step === 2 && k < 0.85 ? 1.25 : 0;
    st.headTurn += (wantTurn - st.headTurn) * Math.min(1, rawDt * 5);
    head.rotation.y = st.headTurn;

    updateRod(rawDt * (st.playing ? st.speed : 0) || 1 / 60);

    // Lure flight
    if (st.flying && dt > 0) {
      st.vel.y -= 9.8 * dt;
      st.vel.multiplyScalar(1 - 0.06 * dt);
      lure.position.addScaledVector(st.vel, dt);
      lure.rotation.z = Math.atan2(st.vel.y, st.vel.x);
      const hitDeck = lure.position.x < JETTY_END && lure.position.y <= DECK_Y + 0.05 && lure.position.x > -11;
      if (lure.position.y <= 0.04 || hitDeck) {
        lure.position.y = hitDeck ? DECK_Y + 0.05 : 0.04;
        lure.rotation.z = 0;
        st.flying = false;
        st.landed = true;
        st.landX = lure.position.x;
        if (!hitDeck) {
          st.splashT = 0;
          splash.position.x = lure.position.x;
          splash.position.z = lure.position.z;
        }
        const distance = Math.max(0, st.landX - JETTY_END);
        const v = verdictFor(st.releaseAt, distance);
        const fromTarget = Math.hypot(lure.position.x - TARGET_X, lure.position.z);
        api.result(v, { distance, fromTarget, release: st.releaseAt, practice: st.practice });
        enter(6);
      }
    }
    if (st.landed && st.step === 6 && dt > 0) {
      // bob and retrieve toward the jetty
      lure.position.y = 0.04 + Math.sin(stage.elapsed * 4) * 0.015;
      const speed = 1.6;
      if (lure.position.x > JETTY_END + 2) lure.position.x -= speed * dt;
    }

    // Line physics
    if (!st.released) {
      rope.step(rawDt > 0 && st.playing ? Math.min(rawDt * st.speed, 1 / 30) : 1 / 120, {
        pinStart: rodState.tip, endWeight: 0.35, damping: 0.975,
      });
      lure.position.copy(rope.pos[rope.pos.length - 1]);
    } else {
      const dist = rodState.tip.distanceTo(lure.position);
      rope.segLen = Math.max(dist * (st.flying ? 1.02 : 1.12), 0.32) / (rope.pos.length - 1);
      rope.step(Math.max(1 / 240, Math.min(dt || 1 / 240, 1 / 30)), {
        pinStart: rodState.tip, pinEnd: lure.position, damping: 0.96, iterations: 10, floor: 0.02,
      });
    }
    const arr = lineGeo.attributes.position.array;
    const n = rope.pos.length;
    for (let i = 0; i < LONG_N; i += 1) {
      const p = rope.pos[Math.min(n - 1, i)];
      arr[i * 3] = p.x;
      arr[i * 3 + 1] = p.y;
      arr[i * 3 + 2] = p.z;
    }
    lineGeo.attributes.position.needsUpdate = true;
    lineGeo.setDrawRange(0, n);

    // Splash
    if (st.splashT >= 0) {
      st.splashT += rawDt;
      const s = 1 + st.splashT * 5;
      splash.scale.set(s, s, s);
      splash.material.opacity = Math.max(0, 0.85 - st.splashT * 0.55);
      if (st.splashT > 1.6) st.splashT = -1;
    }

    // Guide follows the angler
    guide.position.copy(guideCenter());
    releaseTick.rotation.z = -(st.releaseAt - 60) * DEG;
    releaseTick.visible = st.practice;

    // Camera follow
    if (st.camFollow && (st.flying || st.landed)) {
      const tx = Math.max(2, Math.min(TARGET_X, lure.position.x * 0.8));
      stage.controls.target.x += (tx - stage.controls.target.x) * Math.min(1, rawDt * 2.2);
      stage.camera.position.x += (tx - 1 - stage.camera.position.x) * Math.min(1, rawDt * 2.2);
    }

    // Auto-advance
    if (st.playing && dur && st.t >= dur) {
      if (st.step < 4) {
        if (st.mode === 'step') {
          st.playing = false;
          api.setPlaying(false);
          st.t = dur;
        } else enter(st.step + 1);
      } else if (st.step === 4) {
        enter(5);
      } else if (st.step === 6) {
        if (!st.practice && st.mode === 'auto' && st.t > dur + 2.5) {
          st.releaseAt = 60;
          enter(0);
        }
      }
    }

    hudTick += rawDt;
    if (hudTick > 0.12) {
      hudTick = 0;
      api.setHud(hudHTML());
    }
  });

  /* ================= Camera presets ================= */
  const CAMS = {
    side: { label: 'Side', pos: [0.6, 2.9, 7.2], target: [0.9, 2.4, 0] },
    behind: { label: 'Behind', pos: [-4.6, 3.6, 2.1], target: [6, 1.4, -0.4] },
    wide: { label: 'Wide', pos: [6, 6.5, 19], target: [8, 1.2, 0] },
  };
  stage.camera.position.set(...CAMS.side.pos);
  stage.controls.target.set(...CAMS.side.target);
  stage.controls.maxDistance = 45;

  updateRod(1 / 60);
  resetLine();
  enter(0);

  /* ================= Panel ================= */
  const history = [];
  api.setPanel(`
    <h3 class="p3d-panel-title">Practise your release</h3>
    <p class="small muted">Choose when to lift your finger on the forward stroke, then cast. Land inside the white ring around the buoy for a bullseye.</p>
    <label class="field-label" for="cast-release">Release point: <b id="cast-release-out">10 o’clock</b></label>
    <input type="range" id="cast-release" class="range" min="10" max="88" step="1" value="60" />
    <div class="range-scale small muted"><span>Early · 12</span><span>Ideal · 10</span><span>Late · 9</span></div>
    <button class="btn btn-primary btn-block" type="button" id="cast-go" style="margin-top:.7rem">Cast with this release</button>
    <div class="p3d-toggles">
      <label class="switch"><input type="checkbox" id="cast-guide" checked /><span>Clock guide</span></label>
      <label class="switch"><input type="checkbox" id="cast-follow" /><span>Follow the lure</span></label>
      <label class="switch"><input type="checkbox" id="cast-stepmode" /><span>Pause after each step</span></label>
    </div>
    <h4 class="p3d-sub">Your casts</h4>
    <ol class="cast-history" id="cast-history"><li class="muted small">No casts yet.</li></ol>
  `, (panel) => {
    const range = panel.querySelector('#cast-release');
    const out = panel.querySelector('#cast-release-out');
    const sync = () => {
      out.textContent = `${clockLabel(Number(range.value))} (${range.value}°)`;
      if (!st.released) st.releaseAt = Number(range.value);
    };
    range.addEventListener('input', sync);
    sync();
    panel.querySelector('#cast-go').addEventListener('click', () => {
      st.practice = true;
      st.releaseAt = Number(range.value);
      st.mode = 'auto';
      panel.querySelector('#cast-stepmode').checked = false;
      api.clearResult();
      enter(3, { play: true });
      api.setPlaying(true);
    });
    panel.querySelector('#cast-guide').addEventListener('change', (e) => {
      guide.visible = e.target.checked;
      lblStop.visible = e.target.checked;
      lblRelease.visible = e.target.checked;
    });
    panel.querySelector('#cast-follow').addEventListener('change', (e) => {
      st.camFollow = e.target.checked;
      if (!st.camFollow) stage.moveCamera(CAMS.side.pos, CAMS.side.target, 0.8);
    });
    panel.querySelector('#cast-stepmode').addEventListener('change', (e) => {
      st.mode = e.target.checked ? 'step' : 'auto';
    });
  });

  return {
    cameras: CAMS,
    setCamera(id) {
      const c = CAMS[id];
      if (c) stage.moveCamera(c.pos, c.target, 0.9);
    },
    goto(i) {
      st.practice = false;
      api.clearResult();
      enter(i, { play: true });
      api.setPlaying(true);
    },
    setPlaying(on) {
      st.playing = on;
      if (on && st.mode === 'step' && st.t >= stepDuration(st.step) && st.step < 4) enter(st.step + 1);
    },
    setSpeed(s) { st.speed = s; },
    restart() {
      st.practice = false;
      st.releaseAt = 60;
      api.clearResult();
      stage.moveCamera(CAMS.side.pos, CAMS.side.target, 0.6);
      enter(0, { play: true });
      api.setPlaying(true);
    },
    recordCast(v, info) {
      history.unshift({ ...v, ...info });
      const list = document.getElementById('cast-history');
      if (list) {
        list.innerHTML = history.slice(0, 5).map((h) => `<li class="tone-${h.tone}"><b>${h.distance.toFixed(1)} m</b> · ${clockLabel(h.release)} · ${h.grade === 'good' ? (h.fromTarget < 2 ? 'Bullseye!' : 'Good') : h.grade}</li>`).join('');
      }
      return history;
    },
    lblTarget,
  };
}
