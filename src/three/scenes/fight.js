/**
 * 3D lesson: play and land a fish.
 *
 * Set the reel's drag, then fight a fish on 12 lb (≈5.4 kg) line. Hold
 * "Reel" to gain line while the fish rests; let go while it runs. The drag
 * slips before the line can break — set it too tight and the line snaps,
 * too loose and the fish strips all your line. Slack line lets the hook fall
 * out.
 */

import { createWater } from '../stage.js';

export const meta = {
  id: 'fight',
  title: 'Play and land a fish',
  subtitle: 'Drag, pressure and patience',
  minutes: 6,
  lessonId: 'a8-fight',
  goal: 'Set the drag, keep the line tight without breaking it, and bring the fish to the net.',
  steps: [
    { title: 'Set the drag', text: 'The drag lets line slip off the reel before it breaks. A good rule: set it to about a quarter to a third of the line’s strength. Your line breaks at 5.4 kg.' },
    { title: 'Fight the fish', text: 'Hold Reel (or the R key) while the fish rests. When it runs, let go and let the drag do the work. Keep the line tight — slack lets the hook fall out.' },
    { title: 'Land it', text: 'Once the fish is tired and close, lead it head-first into the net. Never lift a big fish by the line.' },
  ],
};

const LINE = 5.4; // kg breaking strain (12 lb)
const SPOOL = 90; // metres of line on the reel

export async function create(stage, api) {
  const { THREE, scene, mat } = stage;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  stage.camera.position.set(-5, 5, 8);
  stage.controls.target.set(6, 0.5, -4);
  stage.controls.maxDistance = 40;

  createWater(stage, { width: 140, depth: 120, segX: 90, segZ: 80, z: -30, color: '#1f7480', opacity: 0.9, amp: 1.1 });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(4, 0.25, 8), mat('#8b6a48', { roughness: 0.9 }));
  deck.position.set(-2, 1.5, 2);
  scene.add(deck);
  for (const [x, z] of [[-3.7, -1.6], [-0.3, -1.6], [-3.7, 5.6], [-0.3, 5.6]]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 4, 8), mat('#4c3826'));
    p.position.set(x, -0.5, z);
    scene.add(p);
  }

  /* ---------- Rod: a chain of segments that bends with tension ---------- */
  const butt = V(-1, 2.6, 0.6);
  const segs = [];
  const rodMat = mat('#1b2a3a', { roughness: 0.4 });
  for (let i = 0; i < 10; i += 1) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.045 - i * 0.0035, 0.05 - i * 0.0035, 0.32, 8), rodMat);
    scene.add(m);
    segs.push(m);
  }
  const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.12, 16), mat('#c9ced6', { metalness: 0.8, roughness: 0.3 }));
  scene.add(reel);
  const tipPos = V();
  const up = V(0, 1, 0);
  function bendRod(k) {
    // Rod points out over the water; k (0..1) bends the tip down toward the fish.
    let p = butt.clone();
    let ang = 0.95; // radians above horizontal
    const dir = V(0.82, 0, -0.57).normalize();
    for (let i = 0; i < segs.length; i += 1) {
      ang -= k * 0.16 * (i / segs.length + 0.25);
      const d = dir.clone().multiplyScalar(Math.cos(ang)).add(V(0, Math.sin(ang), 0)).normalize();
      const next = p.clone().addScaledVector(d, 0.32);
      segs[i].position.copy(p).lerp(next, 0.5);
      segs[i].quaternion.setFromUnitVectors(up, d);
      p = next;
    }
    tipPos.copy(p);
    reel.position.copy(butt).add(V(0.1, -0.18, -0.05));
  }

  /* ---------- Fish + line ---------- */
  const fish = new THREE.Group();
  const fb = new THREE.Mesh(new THREE.SphereGeometry(0.4, 18, 12), mat('#b9c4c9', { metalness: 0.3, roughness: 0.4 }));
  fb.scale.set(2.3, 0.8, 0.6);
  const ft = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.5, 4), fb.material);
  ft.rotation.z = Math.PI / 2;
  ft.position.x = -0.95;
  fish.add(fb, ft);
  scene.add(fish);
  const lineGeo = new THREE.BufferGeometry();
  const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: '#f4f8ff' }));
  scene.add(line);
  const splash = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.6, 24), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, side: THREE.DoubleSide }));
  splash.rotation.x = -Math.PI / 2;
  scene.add(splash);
  const net = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.04, 8, 24), mat('#16c79a'));
  net.visible = false;
  scene.add(net);

  const st = {};
  function reset() {
    Object.assign(st, { surge: 0, phase: 0, drag: 1.0, dist: 28, out: 28, tension: 0, reeling: false, fishPull: 0.6, running: false, runT: 0, rest: 2, stamina: 1, slack: 0, result: null, heading: 1, ang: -0.6, t: 0 });
  }
  reset();

  const dragAdvice = (d) => (d > LINE ? 'Tighter than the line itself — the line will snap before the drag slips.' : d >= LINE * 0.45 ? 'Very tight. A hard run could break the line.' : d >= LINE * 0.22 ? 'Good — roughly a quarter to a third of the line strength.' : d >= 0.7 ? 'A bit loose: the fish will take lots of line.' : 'Far too loose — the fish will strip the reel.');

  function panel() {
    if (st.phase === 0) {
      api.setPanel(`
        <h3 class="p3d-panel-title">Set the drag</h3>
        <label class="small" for="fg-drag">Drag: <b id="fg-dv">${st.drag.toFixed(1)} kg</b> · line breaks at ${LINE} kg</label>
        <input type="range" id="fg-drag" min="0.3" max="7" step="0.1" value="${st.drag}" style="width:100%" />
        <p class="small" id="fg-adv">${dragAdvice(st.drag)}</p>
        <button class="btn btn-primary btn-block" type="button" id="fg-start">Cast and hook a fish</button>`,
      (el) => {
        el.querySelector('#fg-drag').addEventListener('input', (e) => { st.drag = Number(e.target.value); el.querySelector('#fg-dv').textContent = `${st.drag.toFixed(1)} kg`; el.querySelector('#fg-adv').textContent = dragAdvice(st.drag); });
        el.querySelector('#fg-start').addEventListener('click', () => go(1));
      });
    } else if (st.phase === 1) {
      api.setPanel(`
        <h3 class="p3d-panel-title">Fish on!</h3>
        <button class="btn btn-primary btn-block fg-reel" type="button" id="fg-reel">Hold to reel</button>
        <p class="small muted">Or hold the <b>R</b> key. Let go when the fish runs.</p>
        <p class="small" id="fg-tip"></p>`,
      (el) => {
        const b = el.querySelector('#fg-reel');
        const on = (e) => { e.preventDefault(); st.reeling = true; b.classList.add('is-on'); };
        const off = () => { st.reeling = false; b.classList.remove('is-on'); };
        b.addEventListener('pointerdown', on);
        b.addEventListener('pointerup', off);
        b.addEventListener('pointerleave', off);
        b.addEventListener('pointercancel', off);
      });
    } else {
      const r = st.result;
      api.setPanel(`
        <h3 class="p3d-panel-title">${r.ok ? 'Landed!' : 'It got away'}</h3>
        <div class="notice notice-${r.ok ? 'teal' : 'red'}"><div>${r.msg}</div></div>
        <div class="score-row"><span>Fight time</span><b>${Math.round(st.t)} s</b><span class="muted small">drag ${st.drag.toFixed(1)} kg</span></div>
        <button class="btn btn-secondary btn-block btn-sm" type="button" id="fg-again">${r.ok ? 'Fight another' : 'Try again'}</button>`,
      (el) => el.querySelector('#fg-again').addEventListener('click', restart));
    }
  }

  function end(ok, msg) {
    st.phase = 2;
    st.reeling = false;
    st.result = { ok, msg };
    api.setStep(2);
    if (ok) api.complete({ score: Math.max(1, 10 - Math.floor(st.t / 15)), max: 10 });
    panel();
  }

  function go(i) {
    if (i === 2 && !st.result) i = st.phase;
    if (i === 1 && st.phase === 0) { st.phase = 1; api.setStep(1); panel(); return; }
    if (i === 0) { reset(); api.setStep(0); panel(); return; }
    api.setStep(st.phase);
  }
  function restart() { reset(); net.visible = false; api.setStep(0); panel(); }

  const onKey = (e) => {
    if (e.key === 'r' || e.key === 'R') { if (st.phase === 1) { st.reeling = e.type === 'keydown'; document.querySelector('#fg-reel')?.classList.toggle('is-on', st.reeling); } }
  };
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKey);

  stage.onFrame((dt, t) => {
    if (!stage.renderer.domElement.isConnected) { window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); return; }
    if (st.phase === 1) {
      st.t += dt;
      // Fish behaviour: runs and rests; runs shorten as it tires.
      if (st.running) {
        st.runT -= dt;
        st.stamina = Math.max(0.15, st.stamina - dt * 0.06);
        st.surge -= dt;
        if (st.runT <= 0) { st.running = false; st.rest = 1.2 + Math.random() * 2; }
      } else {
        st.rest -= dt;
        if (st.rest <= 0) { st.running = true; st.surge = 0.45; st.runT = (1.2 + Math.random() * 2.2) * st.stamina + 0.4; st.heading = Math.random() > 0.5 ? 1 : -1; }
      }
      // Each run starts with a hard surge; that is what snaps a line when the drag is locked up.
      st.fishPull = st.running ? (st.surge > 0 ? 6.5 * (0.6 + st.stamina * 0.4) : 3.0 * (0.55 + st.stamina * 0.6)) : 0.5 * st.stamina + 0.2;
      const pull = st.fishPull + (st.reeling ? 0.4 : 0);
      if (pull > st.drag) {
        // Drag slips: the fish takes line.
        st.tension = st.drag;
        st.dist += (pull - st.drag) * 1.8 * dt;
      } else {
        st.tension = pull;
        if (st.reeling) st.dist -= (st.running ? 0.8 : 3.5) * dt;
      }
      // Slack: not reeling while the fish swims towards you
      if (!st.reeling && !st.running) st.slack += dt * 0.5; else st.slack = Math.max(0, st.slack - dt * 2);
      if (st.drag < 0.8 && !st.reeling) st.slack += dt * 0.4;
      st.ang += st.heading * dt * (st.running ? 0.12 : 0.03);
      st.ang = Math.max(-1.2, Math.min(0.2, st.ang));

      if (st.tension > LINE) end(false, `<strong>Snap!</strong> The drag (${st.drag.toFixed(1)} kg) was set tighter than the line (${LINE} kg), so the line broke instead of slipping. Set the drag to about 1.3–1.8 kg for this line.`);
      else if (st.dist > SPOOL) end(false, '<strong>Spooled.</strong> The fish took all your line. The drag was too loose to slow it down — tighten it a little, and reel when the fish rests.');
      else if (st.slack > 3) end(false, '<strong>The hook fell out.</strong> The line went slack for too long. Keep gentle pressure on — reel in whenever the fish is not running.');
      else if (st.dist < 2.2) end(true, `<strong>Into the net.</strong> You kept the pressure on and let the drag handle the runs. Wet your hands, support the fish and release it quickly if you are not keeping it.`);
      const tip = document.querySelector('#fg-tip');
      if (tip) tip.textContent = st.running ? 'It’s running! Let go — let the drag work.' : st.slack > 1.5 ? 'Line going slack — reel!' : `${Math.round(st.dist)} m out · tension ${st.tension.toFixed(1)} kg`;
      api.setHud(`<div class="fg-hud"><span>Line tension</span><div class="fg-meter"><i style="width:${Math.min(100, (st.tension / LINE) * 100)}%;background:${st.tension > LINE * 0.8 ? '#F0605A' : st.tension > LINE * 0.18 ? '#3DDC97' : '#F5B455'}"></i><b style="left:${(st.drag / LINE) * 100}%"></b></div><span>${st.dist.toFixed(0)} m · ${Math.round(SPOOL - st.dist)} m left on the reel</span></div>`);
    } else if (st.phase === 0) {
      api.setHud('');
    }
    // Place fish and line
    const d = Math.max(1.6, st.dist);
    const fx = butt.x + Math.cos(st.ang) * d * 0.9;
    const fz = butt.z + Math.sin(st.ang) * d * 0.9 - 1;
    const fy = st.phase === 1 ? -0.35 + (st.running ? 0.15 * Math.sin(t * 12) : 0) : st.result?.ok ? 0.4 : -0.8;
    fish.position.set(fx, fy, fz);
    fish.rotation.y = -st.ang + (st.running ? (st.heading > 0 ? Math.PI : 0) : Math.PI);
    ft.rotation.y = Math.sin(t * (st.running ? 16 : 6)) * 0.5;
    fish.visible = st.phase >= 1 && !(st.phase === 2 && !st.result?.ok);
    splash.position.set(fx, 0.06, fz);
    splash.material.opacity = st.phase === 1 && st.running ? 0.5 + Math.sin(t * 20) * 0.2 : 0;
    net.visible = st.phase === 2 && st.result?.ok;
    net.position.set(fx, 0.25, fz);
    net.rotation.x = Math.PI / 2;
    bendRod(st.phase === 1 ? Math.min(1, st.tension / 3) : 0.05);
    const sag = st.phase === 1 ? Math.max(0, 1.2 - st.tension * 0.6) + st.slack * 0.4 : 0.6;
    const mid = tipPos.clone().lerp(fish.position, 0.5);
    mid.y -= sag;
    line.visible = st.phase === 1 || st.result?.ok;
    lineGeo.setFromPoints([tipPos.clone(), mid, fish.position.clone()]);
  });

  panel();
  api.setStep(0);

  const CAMS = {
    angler: { label: 'Angler view', pos: [-5, 5, 8], target: [6, 0.5, -4] },
    wide: { label: 'Wide', pos: [-14, 14, 22], target: [10, 0, -6] },
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
