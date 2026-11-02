/**
 * Shared three.js stage for the 3D lessons: renderer, sky dome, image-based
 * lighting, soft shadows, orbit camera with presets, animated water, HTML
 * labels anchored to 3D points, and click picking.
 */

let mods = null;

export async function loadThree() {
  if (!mods) {
    const [THREE, oc, re] = await Promise.all([
      import('three'),
      import('three/addons/controls/OrbitControls.js'),
      import('three/addons/environments/RoomEnvironment.js'),
    ]);
    mods = { THREE, OrbitControls: oc.OrbitControls, RoomEnvironment: re.RoomEnvironment };
  }
  return mods;
}

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    return false;
  }
}

/**
 * @param {HTMLElement} host    element that receives the canvas
 * @param {HTMLElement} labelLayer element for HTML labels
 */
export function createStage(host, labelLayer, opts = {}) {
  const { THREE, OrbitControls, RoomEnvironment } = mods;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = opts.exposure ?? 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;

  // Sky dome with a vertical gradient
  const skyTop = new THREE.Color(opts.skyTop || '#7fb6d6');
  const skyHorizon = new THREE.Color(opts.skyHorizon || '#e9f1ee');
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(400, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: { top: { value: skyTop }, horizon: { value: skyHorizon } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 horizon; varying vec3 vP; void main(){ float h = clamp(vP.y*1.6, 0.0, 1.0); gl_FragColor = vec4(mix(horizon, top, pow(h, 0.7)), 1.0); }',
    }),
  );
  scene.add(sky);
  if (opts.fog !== false) scene.fog = new THREE.Fog(skyHorizon, opts.fogNear ?? 40, opts.fogFar ?? 140);
  scene.background = skyHorizon;

  const baseFov = opts.fov ?? 40;
  const camera = new THREE.PerspectiveCamera(baseFov, 1, 0.05, 900);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = opts.maxPolar ?? Math.PI * 0.49;
  controls.minDistance = opts.minDistance ?? 1;
  controls.maxDistance = opts.maxDistance ?? 60;

  const hemi = new THREE.HemisphereLight('#ffffff', '#4a6a6e', 0.55);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff3dc', 2.1);
  sun.position.set(-12, 18, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = opts.shadowSize ?? 14;
  Object.assign(sun.shadow.camera, { left: -sc, right: sc, top: sc, bottom: -sc, near: 1, far: 70 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);
  scene.add(sun.target);

  /* ---------- frame loop ---------- */
  const frameFns = new Set();
  let raf = 0;
  let last = performance.now();
  let elapsed = 0;
  let running = true;
  const loop = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    elapsed += dt;
    frameFns.forEach((fn) => fn(dt, elapsed));
    controls.update();
    renderer.render(scene, camera);
    updateLabels();
    if (running) raf = requestAnimationFrame(loop);
  };

  /* ---------- resize ---------- */
  const resize = () => {
    const w = host.clientWidth || 1;
    const h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Portrait screens: widen the view so the whole scene still fits.
    camera.fov = camera.aspect < 1 ? Math.min(78, baseFov / Math.pow(camera.aspect, 0.6)) : baseFov;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  /* ---------- labels ---------- */
  const labels = new Set();
  const tmp = new THREE.Vector3();
  function addLabel(text, anchor, cls = '') {
    const el = document.createElement('div');
    el.className = `p3d-label ${cls}`;
    el.textContent = text;
    labelLayer.appendChild(el);
    const label = { el, anchor, visible: true };
    labels.add(label);
    return {
      set visible(v) { label.visible = v; el.hidden = !v; },
      setText(t) { el.textContent = t; },
      remove() { el.remove(); labels.delete(label); },
      el,
    };
  }
  function updateLabels() {
    if (!labels.size) return;
    const w = host.clientWidth;
    const h = host.clientHeight;
    for (const l of labels) {
      if (!l.visible) continue;
      if (l.anchor.isObject3D) l.anchor.getWorldPosition(tmp);
      else if (typeof l.anchor === 'function') tmp.copy(l.anchor());
      else tmp.copy(l.anchor);
      tmp.project(camera);
      const behind = tmp.z > 1;
      l.el.style.display = behind ? 'none' : '';
      l.el.style.transform = `translate(-50%, -100%) translate(${(tmp.x * 0.5 + 0.5) * w}px, ${(-tmp.y * 0.5 + 0.5) * h}px)`;
    }
  }

  /* ---------- picking (click, not drag) ---------- */
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const pickHandlers = new Set();
  const hoverHandlers = new Set();
  let downAt = null;
  const toNDC = (e) => {
    const r = renderer.domElement.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    camera.updateMatrixWorld();
    raycaster.setFromCamera(pointer, camera);
  };
  const onDown = (e) => { downAt = { x: e.clientX, y: e.clientY }; };
  const onUp = (e) => {
    if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 6) return;
    downAt = null;
    toNDC(e);
    pickHandlers.forEach((fn) => fn(raycaster));
  };
  const onMove = (e) => {
    if (!hoverHandlers.size || e.buttons) return;
    toNDC(e);
    hoverHandlers.forEach((fn) => fn(raycaster));
  };
  renderer.domElement.addEventListener('pointerdown', onDown);
  renderer.domElement.addEventListener('pointerup', onUp);
  renderer.domElement.addEventListener('pointermove', onMove);

  /* ---------- camera moves ---------- */
  let camTween = null;
  function moveCamera(pos, target, duration = 1.0) {
    const fromP = camera.position.clone();
    const fromT = controls.target.clone();
    const toP = new THREE.Vector3(...pos);
    const toT = new THREE.Vector3(...target);
    if (reduced || duration <= 0) {
      camera.position.copy(toP);
      controls.target.copy(toT);
      return;
    }
    camTween = { fromP, fromT, toP, toT, t: 0, d: duration };
  }
  frameFns.add((dt) => {
    if (!camTween) return;
    camTween.t = Math.min(1, camTween.t + dt / camTween.d);
    const k = 1 - (1 - camTween.t) ** 3;
    camera.position.lerpVectors(camTween.fromP, camTween.toP, k);
    controls.target.lerpVectors(camTween.fromT, camTween.toT, k);
    if (camTween.t >= 1) camTween = null;
  });
  controls.addEventListener('start', () => { camTween = null; });

  raf = requestAnimationFrame(loop);

  /* ---------- helpers ---------- */
  const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0, ...extra });

  function shadowAll(root, cast = true, receive = true) {
    root.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = cast;
        o.receiveShadow = receive;
      }
    });
  }

  function dispose() {
    running = false;
    cancelAnimationFrame(raf);
    ro.disconnect();
    controls.dispose();
    renderer.domElement.removeEventListener('pointerdown', onDown);
    renderer.domElement.removeEventListener('pointerup', onUp);
    renderer.domElement.removeEventListener('pointermove', onMove);
    labels.forEach((l) => l.el.remove());
    labels.clear();
    scene.traverse((o) => {
      o.geometry?.dispose?.();
      if (o.material) [].concat(o.material).forEach((m) => {
        Object.values(m).forEach((v) => v && v.isTexture && v.dispose());
        m.dispose();
      });
    });
    envTex.dispose();
    pmrem.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  }

  return {
    THREE, scene, camera, controls, renderer, sun, hemi, reduced,
    onFrame: (fn) => { frameFns.add(fn); return () => frameFns.delete(fn); },
    onPick: (fn) => { pickHandlers.add(fn); return () => pickHandlers.delete(fn); },
    onHover: (fn) => { hoverHandlers.add(fn); return () => hoverHandlers.delete(fn); },
    addLabel, moveCamera, mat, shadowAll, dispose,
    /** Advance the simulation manually (used by the ?debug3d test hook). */
    step(dt = 1 / 60, n = 1) {
      for (let i = 0; i < n; i += 1) {
        elapsed += dt;
        frameFns.forEach((fn) => fn(dt, elapsed));
      }
      controls.update();
      renderer.render(scene, camera);
      updateLabels();
    },
    get elapsed() { return elapsed; },
  };
}

/**
 * Animated water surface: CPU-displaced grid with recomputed normals so the
 * environment and sun produce moving highlights.
 */
export function createWater(stage, { width = 120, depth = 80, segX = 120, segZ = 80, color = '#1d7480', opacity = 0.92, amp = 1, x = 0, z = 0 } = {}) {
  const { THREE } = stage;
  const geo = new THREE.PlaneGeometry(width, depth, segX, segZ);
  geo.rotateX(-Math.PI / 2);
  const base = Float32Array.from(geo.attributes.position.array);
  const mat = new THREE.MeshStandardMaterial({
    color, roughness: 0.16, metalness: 0.05, transparent: opacity < 1, opacity, envMapIntensity: 0.9,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, 0, z);
  mesh.receiveShadow = true;
  stage.scene.add(mesh);
  let frame = 0;
  stage.onFrame((dt, t) => {
    frame += 1;
    const arr = geo.attributes.position.array;
    for (let i = 0; i < arr.length; i += 3) {
      const px = base[i];
      const pz = base[i + 2];
      arr[i + 1] = amp * (Math.sin(px * 0.45 + t * 1.2) * 0.045 + Math.cos(pz * 0.6 + t * 0.9) * 0.035 + Math.sin((px + pz) * 1.3 + t * 2.1) * 0.012);
    }
    geo.attributes.position.needsUpdate = true;
    if (frame % 2 === 0) geo.computeVertexNormals();
  });
  return mesh;
}

/** Simple verlet rope used for fishing line. */
export function createRope(THREE, count, segLen) {
  const pos = Array.from({ length: count }, (_, i) => new THREE.Vector3(0, -i * segLen, 0));
  const prev = pos.map((p) => p.clone());
  return {
    pos,
    prev,
    segLen,
    reset(start, dir = new THREE.Vector3(0, -1, 0)) {
      pos.forEach((p, i) => p.copy(start).addScaledVector(dir, i * this.segLen));
      prev.forEach((p, i) => p.copy(pos[i]));
    },
    step(dt, { gravity = -9.8, damping = 0.985, iterations = 14, pinStart, pinEnd, endWeight = 1, floor = null }) {
      const g = gravity * dt * dt;
      for (let i = 0; i < count; i += 1) {
        const p = pos[i];
        const vx = (p.x - prev[i].x) * damping;
        const vy = (p.y - prev[i].y) * damping;
        const vz = (p.z - prev[i].z) * damping;
        prev[i].copy(p);
        p.x += vx;
        p.y += vy + g;
        p.z += vz;
        if (floor !== null && p.y < floor) p.y = floor;
      }
      const d = new THREE.Vector3();
      for (let k = 0; k < iterations; k += 1) {
        if (pinStart) pos[0].copy(pinStart);
        if (pinEnd) pos[count - 1].copy(pinEnd);
        for (let i = 0; i < count - 1; i += 1) {
          const a = pos[i];
          const b = pos[i + 1];
          d.subVectors(b, a);
          const len = d.length() || 1e-6;
          const diff = (len - this.segLen) / len;
          let wa = i === 0 && pinStart ? 0 : 0.5;
          let wb = i + 1 === count - 1 ? (pinEnd ? 0 : 0.5 * endWeight) : 0.5;
          const sum = wa + wb || 1;
          wa /= sum;
          wb /= sum;
          a.addScaledVector(d, diff * wa);
          b.addScaledVector(d, -diff * wb);
        }
      }
      if (pinStart) pos[0].copy(pinStart);
      if (pinEnd) pos[count - 1].copy(pinEnd);
    },
  };
}
