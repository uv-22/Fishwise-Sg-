/**
 * 3D place viewer for a fishing spot.
 *
 * MapLibre GL (loaded lazily from jsDelivr) renders OpenFreeMap vector tiles
 * with OpenStreetMap buildings extruded to their mapped heights, recoloured
 * to the FishWise palette. A satellite layer can be switched on underneath
 * the buildings. The camera flies in, then orbits slowly until the user
 * takes over.
 */

import { icon } from '../icons.js';
import { esc } from '../ui.js';
import { SPOT_TYPES, spotBadge } from '../components.js';

const ML = 'https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl';
const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

let libPromise = null;
let stylePromise = null;
let active = null;

function loadMapLibre() {
  if (window.maplibregl) return Promise.resolve(window.maplibregl);
  if (libPromise) return libPromise;
  libPromise = new Promise((resolve, reject) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = `${ML}.css`;
    document.head.appendChild(css);
    const s = document.createElement('script');
    s.src = `${ML}.js`;
    s.async = true;
    s.onload = () => (window.maplibregl ? resolve(window.maplibregl) : reject(new Error('The 3D map library did not start.')));
    s.onerror = () => { libPromise = null; reject(new Error('Could not load the 3D map library. Check your connection.')); };
    document.head.appendChild(s);
  });
  return libPromise;
}

function loadStyle() {
  if (!stylePromise) {
    stylePromise = fetch(STYLE_URL)
      .then((r) => { if (!r.ok) throw new Error('The 3D map style is unavailable right now.'); return r.json(); })
      .catch((e) => { stylePromise = null; throw e; });
  }
  return stylePromise.then((s) => JSON.parse(JSON.stringify(s)));
}

function themeStyle(style) {
  const vector = Object.keys(style.sources).find((k) => style.sources[k].type === 'vector');
  // Night-water palette to match the app: dark land, navy water, light-blue towers.
  for (const l of style.layers) {
    const paint = (l.paint ||= {});
    if (l.id === 'background') paint['background-color'] = '#070D19';
    else if (l.type === 'fill' && l.id === 'water') paint['fill-color'] = '#0B2350';
    else if (l.type === 'line' && l.id === 'waterway') paint['line-color'] = '#0E2C63';
    else if (l.type === 'fill' && (l.id === 'park' || l.id === 'landcover_wood')) { paint['fill-color'] = '#0C2230'; paint['fill-opacity'] = 0.9; }
    else if (l.id === 'building') (l.layout ||= {}).visibility = 'none';
    else if (l.type === 'fill') { paint['fill-color'] = '#0B1424'; paint['fill-opacity'] = 0.6; }
    else if (l.type === 'line') paint['line-color'] = /rail/.test(l.id) ? '#22385F' : '#1C2E50';
    else if (l.type === 'symbol') { paint['text-color'] = '#8FA0BA'; paint['text-halo-color'] = '#04070D'; }
  }
  style.sources.esri = { type: 'raster', tiles: [ESRI], tileSize: 256, maxzoom: 19, attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics' };
  const firstSymbol = style.layers.findIndex((l) => l.type === 'symbol');
  const at = firstSymbol < 0 ? style.layers.length : firstSymbol;
  const h = ['coalesce', ['get', 'render_height'], 6];
  style.layers.splice(at, 0,
    { id: 'fw-sat', type: 'raster', source: 'esri', layout: { visibility: 'none' }, paint: { 'raster-fade-duration': 250 } },
    {
      id: 'fw-buildings', type: 'fill-extrusion', source: vector, 'source-layer': 'building', minzoom: 13,
      paint: {
        'fill-extrusion-color': ['interpolate', ['linear'], h, 0, '#16284A', 25, '#24447A', 70, '#3E6FB8', 160, '#7CC4FF'],
        'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 13, 0, 14.6, h],
        'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
        'fill-extrusion-opacity': 0.93,
        'fill-extrusion-vertical-gradient': true,
      },
    });
  return style;
}

export function closeSpot3D() {
  if (!active) return;
  const { el, map, stopOrbit, onKey, restore } = active;
  active = null;
  stopOrbit();
  document.removeEventListener('keydown', onKey);
  window.removeEventListener('hashchange', closeSpot3D);
  el.classList.add('is-closing');
  document.body.style.overflow = '';
  setTimeout(() => { try { map?.remove(); } catch { /* already gone */ } el.remove(); }, 280);
  if (restore?.isConnected) restore.focus({ preventScroll: true });
}

export function openSpot3D(spot) {
  if (!spot) return;
  closeSpot3D();
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const el = document.createElement('div');
  el.className = 's3d';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', `3D view of ${spot.name}`);
  el.innerHTML = `
    <div class="s3d-bar">
      <span class="brand-mark">${icon('cube3d', 18)}</span>
      <div class="grow"><h2>${esc(spot.name)}</h2><p>3D view · drag to rotate · scroll to zoom · right-drag or two fingers to tilt</p></div>
      <button class="btn btn-secondary btn-sm" type="button" data-close>${icon('close', 15)} Close</button>
    </div>
    <div class="s3d-stage">
      <div class="s3d-map"></div>
      <div class="s3d-loading"><span class="spinner"></span><span>Building the 3D scene…</span></div>
      <div class="s3d-legend">Buildings from OpenStreetMap, shaded by height</div>
      <aside class="s3d-info">
        <div class="badge-row">${spotBadge(spot.status)}</div>
        <p>${esc(spot.note)}</p>
        <dl>
          <dt>Type</dt><dd>${esc(SPOT_TYPES[spot.type] || spot.type)}</dd>
          <dt>Area</dt><dd>${esc(spot.area)}</dd>
          <dt>Location</dt><dd>${spot.lat.toFixed(4)}, ${spot.lng.toFixed(4)}</dd>
        </dl>
      </aside>
      <div class="s3d-tools" role="group" aria-label="3D view controls">
        <button class="btn btn-sm" type="button" data-t="orbit" aria-pressed="${!reduce}">${icon('rotate', 15)} Orbit</button>
        <button class="btn btn-sm" type="button" data-t="sat" aria-pressed="false">${icon('layers', 15)} Satellite</button>
        <button class="btn btn-sm" type="button" data-t="top" aria-pressed="false">${icon('map', 15)} Top-down</button>
        <button class="btn btn-sm" type="button" data-t="reset">${icon('crosshair', 15)} Recenter</button>
      </div>
    </div>`;
  document.body.appendChild(el);
  document.body.style.overflow = 'hidden';
  const loading = el.querySelector('.s3d-loading');
  const tools = el.querySelector('.s3d-tools');
  const center = [spot.lng, spot.lat];
  const VIEW = { center, zoom: 17.1, pitch: 62, bearing: -30 };

  let map = null;
  let raf = 0;
  let orbiting = !reduce;
  const press = (t, on) => tools.querySelector(`[data-t="${t}"]`)?.setAttribute('aria-pressed', String(on));
  const spin = () => {
    raf = 0;
    if (!orbiting || !map) return;
    map.setBearing(map.getBearing() + 0.05);
    raf = requestAnimationFrame(spin);
  };
  const startOrbit = () => { orbiting = true; press('orbit', true); if (!raf) raf = requestAnimationFrame(spin); };
  const stopOrbit = () => { orbiting = false; press('orbit', false); cancelAnimationFrame(raf); raf = 0; };
  const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); closeSpot3D(); } };

  active = { el, map: null, stopOrbit, onKey, restore: document.activeElement };
  document.addEventListener('keydown', onKey);
  window.addEventListener('hashchange', closeSpot3D);
  el.querySelector('[data-close]').addEventListener('click', closeSpot3D);
  el.querySelector('[data-close]').focus();

  tools.addEventListener('click', (e) => {
    const b = e.target.closest('[data-t]');
    if (!b || !map) return;
    const t = b.dataset.t;
    if (t === 'orbit') (orbiting ? stopOrbit : startOrbit)();
    if (t === 'sat') {
      const on = b.getAttribute('aria-pressed') !== 'true';
      press('sat', on);
      map.setLayoutProperty('fw-sat', 'visibility', on ? 'visible' : 'none');
      map.setPaintProperty('fw-buildings', 'fill-extrusion-opacity', on ? 0.55 : 0.93);
    }
    if (t === 'top') {
      const on = b.getAttribute('aria-pressed') !== 'true';
      press('top', on);
      stopOrbit();
      map.easeTo({ pitch: on ? 0 : VIEW.pitch, bearing: on ? 0 : VIEW.bearing, zoom: on ? 16.4 : VIEW.zoom, duration: reduce ? 0 : 1200 });
    }
    if (t === 'reset') {
      press('top', false);
      map.flyTo({ ...VIEW, duration: reduce ? 0 : 1600, essential: true });
      if (!reduce) map.once('moveend', startOrbit);
    }
  });

  Promise.all([loadMapLibre(), loadStyle()])
    .then(([ml, style]) => {
      if (!el.isConnected) return;
      map = new ml.Map({
        container: el.querySelector('.s3d-map'),
        style: themeStyle(style),
        center,
        zoom: 13.4,
        pitch: 0,
        bearing: 0,
        maxPitch: 78,
        antialias: true,
        attributionControl: { compact: true },
      });
      active && (active.map = map);
      map.addControl(new ml.NavigationControl({ visualizePitch: true }), 'bottom-right');
      const pin = document.createElement('div');
      pin.className = 's3d-pin';
      pin.innerHTML = `<i></i><b>${esc(spot.name)}</b>`;
      new ml.Marker({ element: pin, anchor: 'center' }).setLngLat(center).addTo(map);
      ['mousedown', 'touchstart', 'wheel'].forEach((ev) => map.on(ev, () => { if (orbiting) stopOrbit(); }));
      map.once('load', () => {
        loading.classList.add('is-done');
        map.flyTo({ ...VIEW, duration: reduce ? 0 : 4200, curve: 1.25, essential: true });
        if (!reduce) map.once('moveend', () => { if (orbiting) startOrbit(); });
      });
      map.on('error', (e) => console.warn('3D map:', e?.error?.message || e));
    })
    .catch((err) => {
      loading.innerHTML = `<span>${icon('alert', 18)}</span><span>${esc(err.message)}</span><button class="btn btn-secondary btn-sm" type="button" id="s3d-retry">Try again</button>`;
      loading.querySelector('#s3d-retry').addEventListener('click', () => openSpot3D(spot));
    });
}
