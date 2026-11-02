/**
 * Spot map — Esri World Imagery satellite tiles (zoom to individual
 * buildings), OneMap street tiles as an alternative, and the 30 real spots
 * from data/spots.js.
 *
 * Leaflet is loaded lazily from jsDelivr the first time the map opens.
 * Selecting a spot updates the URL (#/map/<id>) without rebuilding the map.
 */

import { icon } from '../icons.js';
import { esc } from '../ui.js';
import { SPOTS, SPOTS_CHECKED_ON } from '../data/spots.js';
import { getSpecies } from '../data/species.js';
import { SPOT_STATUS, SPOT_TYPES, spotBadge, speciesChips, photoCredit, getSpot } from '../components.js';
import { getTwoHour, nearest, fishingRisk, distanceKm } from '../services/weather.js';

const LEAFLET_JS = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js';
const LEAFLET_CSS = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css';

const SG_BOUNDS = [[1.13, 103.55], [1.5, 104.12]];

const TILES = {
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    options: { maxNativeZoom: 19, maxZoom: 20, attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics, GIS User Community' },
  },
  labels: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    options: { maxNativeZoom: 19, maxZoom: 20, pane: 'labels' },
  },
  street: {
    url: 'https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png',
    options: { minZoom: 11, maxNativeZoom: 19, maxZoom: 20, attribution: '<a href="https://www.onemap.gov.sg/" target="_blank" rel="noopener noreferrer">OneMap</a> &copy; contributors | <a href="https://www.sla.gov.sg/" target="_blank" rel="noopener noreferrer">Singapore Land Authority</a>' },
  },
};

let leafletPromise = null;
function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = LEAFLET_CSS;
    document.head.appendChild(css);
    const s = document.createElement('script');
    s.src = LEAFLET_JS;
    s.onload = () => resolve(window.L);
    s.onerror = () => {
      leafletPromise = null;
      s.remove();
      reject(new Error('The map library could not load. Check your internet connection and try again.'));
    };
    document.head.appendChild(s);
  });
  return leafletPromise;
}

/** Static satellite close-up straight from Esri's export endpoint — an actual image of the spot. */
function satelliteSnapshot(lat, lng, w = 640, h = 320) {
  const dx = 0.0017;
  const dy = (dx * h) / w;
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${lng - dx},${lat - dy},${lng + dx},${lat + dy}&bboxSR=4326&imageSR=3857&size=${w},${h}&format=jpg&f=image`;
}

/* ------------------------------------------------------------------
   Module state (lives as long as the map view is mounted)
   ------------------------------------------------------------------ */

const filters = { listed: true, check: true, excluded: true, type: 'all', q: '' };
let state = null; // { map, L, markers, layers, ctx, root, selected, userPos }

function filteredSpots() {
  const q = filters.q.trim().toLowerCase();
  let list = SPOTS.filter((s) => filters[s.status] && (filters.type === 'all' || s.type === filters.type) &&
    (!q || `${s.name} ${s.area} ${s.type}`.toLowerCase().includes(q)));
  if (state?.userPos) {
    list = list.map((s) => ({ ...s, km: distanceKm(state.userPos.lat, state.userPos.lng, s.lat, s.lng) })).sort((a, b) => a.km - b.km);
  } else {
    list = list.slice().sort((a, b) => a.name.localeCompare(b.name));
  }
  return list;
}

function pinHTML(spot, selected) {
  const s = SPOT_STATUS[spot.status];
  const glyph = spot.status === 'excluded' ? 'ban' : spot.type === 'jetty' ? 'anchor' : spot.type === 'beach' ? 'waves' : 'fish';
  return `<div class="pin ${selected ? 'is-selected' : ''}" style="--pin:${s.color}">${icon(glyph, 14)}</div>`;
}

/* ------------------------------------------------------------------
   Panel markup
   ------------------------------------------------------------------ */

function listPanel() {
  const list = filteredSpots();
  const counts = { listed: 0, check: 0, excluded: 0 };
  SPOTS.forEach((s) => (counts[s.status] += 1));
  return `
  <div class="panel-head">
    <h1 id="page-title" tabindex="-1">Spot map</h1>
    <p class="muted small">${SPOTS.length} real Singapore spots. Status from the PUB &amp; NParks fishing pages, checked ${SPOTS_CHECKED_ON}.</p>
  </div>
  <div class="panel-tools">
    <div class="search-box">
      ${icon('search', 16)}
      <label class="sr-only" for="spot-q">Search spots</label>
      <input class="input" id="spot-q" placeholder="Search jetty, park, reservoir…" value="${esc(filters.q)}" autocomplete="off" />
    </div>
    <div class="filter-row" role="group" aria-label="Filter by status">
      ${Object.entries(SPOT_STATUS).map(([k, s]) => `
        <button class="filter-chip" type="button" data-status="${k}" aria-pressed="${filters[k]}" style="--chip:${s.color}">
          <span class="dot"></span>${s.short}<span class="count">${counts[k]}</span>
        </button>`).join('')}
    </div>
    <label class="sr-only" for="spot-type">Filter by type</label>
    <select class="select select-sm" id="spot-type">
      <option value="all">All types</option>
      ${Object.entries(SPOT_TYPES).map(([k, v]) => `<option value="${k}" ${filters.type === k ? 'selected' : ''}>${v}</option>`).join('')}
    </select>
  </div>
  <div class="spot-list" role="list">
    ${list.length ? list.map((s) => `
      <a class="spot-row" role="listitem" href="#/map/${s.id}">
        <span class="spot-dot" style="--pin:${SPOT_STATUS[s.status].color}"></span>
        <span class="spot-row-main">
          <b>${esc(s.name)}</b>
          <span>${SPOT_TYPES[s.type]} · ${esc(s.area)}${s.km !== undefined ? ` · ${s.km.toFixed(1)} km` : ''}</span>
        </span>
        ${icon('chevronRight', 16)}
      </a>`).join('') : `<p class="muted small" style="padding:1rem">No spots match. <button class="link-btn" type="button" id="clear-filters">Clear filters</button></p>`}
  </div>
  <p class="panel-foot small muted">Spot coordinates &copy; OpenStreetMap contributors. A marker is a reference point, not a fishing boundary.</p>`;
}

function detailPanel(spot) {
  const st = SPOT_STATUS[spot.status];
  const allowedToPlan = spot.status === 'listed';
  const alternatives = SPOTS.filter((s) => s.status === 'listed' && s.id !== spot.id)
    .map((s) => ({ ...s, km: distanceKm(spot.lat, spot.lng, s.lat, s.lng) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, 3);
  const speciesHere = spot.species.map(getSpecies).filter(Boolean);

  return `
  <div class="detail-scroll">
    <a class="btn btn-ghost btn-sm back-link" href="#/map">${icon('arrowLeft', 15)} All spots</a>

    <figure class="spot-media">
      <div class="media-tabs" role="tablist" aria-label="Spot imagery">
        ${spot.photo ? `<button role="tab" type="button" class="media-tab" data-media="photo" aria-selected="true">${icon('image', 14)} Photo</button>` : ''}
        <button role="tab" type="button" class="media-tab" data-media="sat" aria-selected="${spot.photo ? 'false' : 'true'}">${icon('layers', 14)} Satellite close-up</button>
      </div>
      <div class="media-frame">
        ${spot.photo ? `<img data-media-img="photo" src="${esc(spot.photo.src)}" alt="Photo of ${esc(spot.name)}" loading="lazy" />` : ''}
        <img data-media-img="sat" src="${satelliteSnapshot(spot.lat, spot.lng)}" alt="Satellite view of ${esc(spot.name)}" loading="lazy" ${spot.photo ? 'hidden' : ''} />
        <span class="media-skeleton" aria-hidden="true"></span>
      </div>
      <figcaption class="small muted" data-caption="photo" ${spot.photo ? '' : 'hidden'}>${photoCredit(spot.photo)}</figcaption>
      <figcaption class="small muted" data-caption="sat" ${spot.photo ? 'hidden' : ''}>Satellite imagery &copy; Esri, Maxar, Earthstar Geographics.</figcaption>
    </figure>

    <div class="detail-title">
      <h1 id="page-title" tabindex="-1">${esc(spot.name)}</h1>
      <p class="muted">${SPOT_TYPES[spot.type]} · ${esc(spot.area)}</p>
      <div class="badge-row">${spotBadge(spot.status)}</div>
    </div>

    <div class="notice ${st.badge === 'badge-designated' ? 'notice-teal' : spot.status === 'excluded' ? 'notice-red' : 'notice-amber'}">
      ${icon(st.icon, 17)}
      <div>
        <strong>${spot.sources.length ? `Source: ${spot.sources.map(esc).join(' + ')}` : 'Not on the official lists'}</strong><br>
        ${esc(spot.note)}
      </div>
    </div>

    <div class="wx-inline" id="spot-wx">${icon('cloud', 15)} <span>Checking the NEA 2-hour forecast…</span></div>

    <div class="detail-actions">
      <button class="btn btn-secondary btn-sm" type="button" id="zoom-buildings">${icon('zoomIn', 15)} Zoom to buildings</button>
      ${allowedToPlan ? `<button class="btn btn-primary btn-sm" type="button" data-action="plan-trip" data-spot="${spot.id}">${icon('calendar', 15)} Plan a trip here</button>` : ''}
      <a class="btn btn-ghost btn-sm" href="https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}" target="_blank" rel="noopener noreferrer">${icon('navigation', 15)} Directions</a>
    </div>

    ${allowedToPlan ? '' : `
    <section class="detail-sec">
      <h2>${spot.status === 'excluded' ? 'Why you cannot fish here' : 'Why we say “check first”'}</h2>
      <p class="muted">${spot.status === 'excluded'
        ? 'An official page names this area as off limits. FishWise will not help you plan a trip here.'
        : 'This spot is not named on the PUB or NParks fishing pages, or a notice limits fishing to certain stretches. Confirm the signage on site — or pick a listed spot nearby.'}</p>
      <div class="alt-list">
        ${alternatives.map((a) => `
          <a class="alt-row" href="#/map/${a.id}">
            <span class="spot-dot" style="--pin:${SPOT_STATUS.listed.color}"></span>
            <span class="who"><b>${esc(a.name)}</b><span>${a.km.toFixed(1)} km away · ${SPOT_TYPES[a.type]}</span></span>
            ${icon('chevronRight', 16)}
          </a>`).join('')}
      </div>
    </section>`}

    <section class="detail-sec">
      <h2>Before you cast</h2>
      <ul class="guide-list">
        <li>${icon('sign', 16)}<span><b>Find the sign.</b> A listed site is not open end to end. Fish only where signage marks the zone — at PUB waters, look for blue railings.</span></li>
        <li>${icon('hook', 16)}<span><b>Right gear.</b> PUB waters: artificial bait only, no fly fishing. NParks: carbon steel micro-barb or barbless hooks at reservoirs and waterways.</span></li>
        <li>${icon('trashLitter', 16)}<span><b>Leave nothing.</b> Line, hooks and bait go in a bin — never across paths or in the water.</span></li>
        <li>${icon('scale', 16)}<span><b>Penalties are real.</b> PUB and NParks both state fines of up to $3,000 for breaking fishing rules.</span></li>
      </ul>
    </section>

    ${speciesHere.length ? `
    <section class="detail-sec">
      <h2>Species you may meet</h2>
      <div class="chip-row">${speciesChips(spot.species)}</div>
    </section>` : ''}
  </div>`;
}

/* ------------------------------------------------------------------
   View API
   ------------------------------------------------------------------ */

export function render() {
  return `
  <div class="map-layout">
    <aside class="map-panel" id="map-panel" aria-label="Spots"></aside>
    <div class="map-wrap">
      <div id="map" class="map" role="application" aria-label="Satellite map of Singapore fishing spots"></div>
      <div class="map-loading" id="map-loading"><span class="spinner"></span> Loading satellite map…</div>
      <div class="map-controls">
        <div class="segmented seg-dark" role="group" aria-label="Base map">
          <button class="seg" type="button" data-base="satellite" aria-pressed="true">${icon('layers', 14)} Satellite</button>
          <button class="seg" type="button" data-base="street" aria-pressed="false">${icon('map', 14)} Street</button>
        </div>
        <button class="btn btn-secondary btn-sm" type="button" id="locate">${icon('crosshair', 15)} Near me</button>
        <button class="btn btn-secondary btn-sm" type="button" id="fit-all">${icon('rotate', 15)} All spots</button>
      </div>
      <div class="map-legend" aria-hidden="true">
        ${Object.values(SPOT_STATUS).map((s) => `<span><i style="background:${s.color}"></i>${s.short}</span>`).join('')}
      </div>
    </div>
  </div>`;
}

export function mount(root, ctx, param) {
  state = { root, ctx, map: null, L: null, markers: new Map(), layers: {}, selected: null, userPos: state?.userPos || null };
  const panel = root.querySelector('#map-panel');

  renderPanel(param);

  panel.addEventListener('input', (e) => {
    if (e.target.id === 'spot-q') {
      filters.q = e.target.value;
      refreshList();
    }
  });
  panel.addEventListener('change', (e) => {
    if (e.target.id === 'spot-type') {
      filters.type = e.target.value;
      refreshList();
    }
  });
  panel.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-status]');
    if (chip) {
      filters[chip.dataset.status] = !filters[chip.dataset.status];
      refreshList();
      return;
    }
    if (e.target.closest('#clear-filters')) {
      Object.assign(filters, { listed: true, check: true, excluded: true, type: 'all', q: '' });
      refreshList();
      return;
    }
    const tab = e.target.closest('[data-media]');
    if (tab) switchMedia(tab.dataset.media);
    if (e.target.closest('#zoom-buildings') && state.selected && state.map) {
      const s = getSpot(state.selected);
      state.map.flyTo([s.lat, s.lng], 19, { duration: 1.2 });
      root.querySelector('.map-wrap').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });

  root.querySelectorAll('[data-base]').forEach((b) => b.addEventListener('click', () => setBase(b.dataset.base)));
  root.querySelector('#fit-all').addEventListener('click', () => {
    if (state.map) state.map.flyToBounds(SPOTS.map((s) => [s.lat, s.lng]), { padding: [30, 30], duration: 0.8 });
  });
  root.querySelector('#locate').addEventListener('click', locateMe);

  loadLeaflet()
    .then((L) => {
      if (!state || state.root !== root || !root.isConnected) return;
      initMap(L, root);
      if (param) selectSpot(param, false);
    })
    .catch((err) => {
      const loading = root.querySelector('#map-loading');
      loading.innerHTML = `${icon('alert', 16)} ${esc(err.message)} <button class="btn btn-secondary btn-sm" type="button" id="map-retry">Retry</button>`;
      loading.querySelector('#map-retry').addEventListener('click', () => ctx.refresh());
    });

  return () => {
    if (state?.map) state.map.remove();
    state = null;
  };
}

/** Called by the router when only the spot id changes. */
export function update(param) {
  if (!state) return;
  renderPanel(param);
  if (param) selectSpot(param, true);
  else {
    highlight(null);
    state.selected = null;
  }
}

function renderPanel(param) {
  const panel = state.root.querySelector('#map-panel');
  const spot = param ? getSpot(param) : null;
  if (param && !spot) {
    panel.innerHTML = `<div class="detail-scroll"><a class="btn btn-ghost btn-sm" href="#/map">${icon('arrowLeft', 15)} All spots</a>
      <div class="empty"><span class="empty-ico">${icon('help', 20)}</span><h3>Spot not found</h3><p>That link does not match a spot on the map.</p></div></div>`;
    return;
  }
  panel.innerHTML = spot ? detailPanel(spot) : listPanel();
  panel.scrollTop = 0;
  panel.classList.toggle('is-detail', !!spot);
  if (spot) {
    wireMediaLoading(panel);
    loadSpotWeather(spot);
  }
}

function refreshList() {
  const panel = state.root.querySelector('#map-panel');
  const active = document.activeElement?.id;
  const caret = active === 'spot-q' ? document.activeElement.selectionStart : null;
  panel.innerHTML = listPanel();
  if (active) {
    const el = panel.querySelector(`#${active}`);
    if (el) {
      el.focus();
      if (caret !== null) el.setSelectionRange(caret, caret);
    }
  }
  syncMarkers();
}

function wireMediaLoading(panel) {
  panel.querySelectorAll('[data-media-img]').forEach((img) => {
    const done = () => panel.querySelector('.media-skeleton')?.classList.add('is-done');
    if (img.complete) done();
    img.addEventListener('load', done);
    img.addEventListener('error', () => {
      img.replaceWith(Object.assign(document.createElement('div'), { className: 'media-error', textContent: 'Image unavailable offline.' }));
      done();
    });
  });
}

function switchMedia(kind) {
  const panel = state.root.querySelector('#map-panel');
  panel.querySelectorAll('[data-media]').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.media === kind)));
  panel.querySelectorAll('[data-media-img]').forEach((i) => (i.hidden = i.dataset.mediaImg !== kind));
  panel.querySelectorAll('[data-caption]').forEach((c) => (c.hidden = c.dataset.caption !== kind));
}

function loadSpotWeather(spot) {
  getTwoHour()
    .then((data) => {
      const el = state?.root.querySelector('#spot-wx');
      if (!el) return;
      const area = nearest(data.areas, spot.lat, spot.lng);
      const risk = fishingRisk(area.forecast);
      el.className = `wx-inline tone-${risk.tone}`;
      el.innerHTML = `${icon(risk.icon, 16)} <span><b>${esc(area.forecast)}</b> near ${esc(area.name)} (${esc(data.validText)}). ${esc(risk.advice)}</span>`;
    })
    .catch((err) => {
      const el = state?.root.querySelector('#spot-wx');
      if (el) el.innerHTML = `${icon('cloud', 15)} <span>${esc(err.message)}</span>`;
    });
}

/* ------------------------------------------------------------------
   Leaflet
   ------------------------------------------------------------------ */

function initMap(L, root) {
  const map = L.map(root.querySelector('#map'), {
    zoomControl: false,
    maxBounds: SG_BOUNDS,
    maxBoundsViscosity: 0.8,
    minZoom: 11,
    worldCopyJump: false,
  });
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  map.createPane('labels');
  map.getPane('labels').style.zIndex = 450;
  map.getPane('labels').style.pointerEvents = 'none';

  state.L = L;
  state.map = map;
  state.layers.satellite = L.tileLayer(TILES.satellite.url, TILES.satellite.options);
  state.layers.labels = L.tileLayer(TILES.labels.url, TILES.labels.options);
  state.layers.street = L.tileLayer(TILES.street.url, TILES.street.options);
  state.base = 'satellite';
  state.layers.satellite.addTo(map);
  state.layers.labels.addTo(map);

  state.layers.satellite.once('load', () => root.querySelector('#map-loading')?.classList.add('is-hidden'));
  setTimeout(() => root.querySelector('#map-loading')?.classList.add('is-hidden'), 6000);

  map.attributionControl.addAttribution('Spots &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>');

  for (const spot of SPOTS) {
    const marker = L.marker([spot.lat, spot.lng], {
      icon: L.divIcon({ className: 'pin-wrap', html: pinHTML(spot, false), iconSize: [30, 38], iconAnchor: [15, 36] }),
      title: spot.name,
      alt: `${spot.name}, ${SPOT_STATUS[spot.status].label}`,
      keyboard: true,
      riseOnHover: true,
    });
    marker.bindTooltip(`<b>${esc(spot.name)}</b><br>${SPOT_STATUS[spot.status].short}`, { direction: 'top', offset: [0, -34] });
    marker.on('click', () => state.ctx.navigate(`#/map/${spot.id}`));
    marker.addTo(map);
    state.markers.set(spot.id, marker);
  }
  map.fitBounds(SPOTS.map((s) => [s.lat, s.lng]), { padding: [30, 30] });
  syncMarkers();
}

function syncMarkers() {
  if (!state?.map) return;
  const visible = new Set(filteredSpots().map((s) => s.id));
  for (const [id, marker] of state.markers) {
    const on = visible.has(id) || id === state.selected;
    if (on && !state.map.hasLayer(marker)) marker.addTo(state.map);
    if (!on && state.map.hasLayer(marker)) marker.remove();
  }
}

function highlight(id) {
  for (const [sid, marker] of state.markers) {
    const spot = getSpot(sid);
    marker.setIcon(state.L.divIcon({ className: 'pin-wrap', html: pinHTML(spot, sid === id), iconSize: [30, 38], iconAnchor: [15, 36] }));
    marker.setZIndexOffset(sid === id ? 1000 : 0);
  }
}

function selectSpot(id, animate) {
  const spot = getSpot(id);
  if (!spot || !state?.map) return;
  state.selected = id;
  highlight(id);
  syncMarkers();
  const z = Math.max(state.map.getZoom(), 16);
  if (animate) state.map.flyTo([spot.lat, spot.lng], z, { duration: 0.9 });
  else state.map.setView([spot.lat, spot.lng], 16);
}

function setBase(kind) {
  if (!state?.map || kind === state.base) return;
  const { map, layers } = state;
  if (kind === 'street') {
    map.removeLayer(layers.satellite);
    map.removeLayer(layers.labels);
    layers.street.addTo(map);
  } else {
    map.removeLayer(layers.street);
    layers.satellite.addTo(map);
    layers.labels.addTo(map);
  }
  state.base = kind;
  state.root.querySelectorAll('[data-base]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.base === kind)));
}

function locateMe() {
  const btn = state.root.querySelector('#locate');
  if (!navigator.geolocation) {
    btn.textContent = 'Location unavailable';
    return;
  }
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner spinner-sm"></span> Locating…`;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      if (!state) return;
      const { latitude: lat, longitude: lng } = pos.coords;
      btn.disabled = false;
      btn.innerHTML = `${icon('crosshair', 15)} Near me`;
      const inSG = lat > SG_BOUNDS[0][0] && lat < SG_BOUNDS[1][0] && lng > SG_BOUNDS[0][1] && lng < SG_BOUNDS[1][1];
      if (!inSG) {
        state.ctx.toast('You appear to be outside Singapore — showing all spots instead.', 'info');
        return;
      }
      state.userPos = { lat, lng };
      if (state.map) {
        state.userMarker?.remove();
        state.userMarker = state.L.circleMarker([lat, lng], { radius: 8, color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }).addTo(state.map).bindTooltip('You are here');
        state.map.flyTo([lat, lng], 14, { duration: 0.8 });
      }
      if (!state.selected) refreshList();
      const n = filteredSpots().filter((s) => s.status === 'listed')[0];
      if (n) state.ctx.toast(`Nearest listed spot: ${n.name} (${n.km.toFixed(1)} km)`, 'locations');
    },
    (err) => {
      if (!state) return;
      btn.disabled = false;
      btn.innerHTML = `${icon('crosshair', 15)} Near me`;
      state.ctx.toast(err.code === 1 ? 'Location permission was declined.' : 'Could not get your location.', 'alert');
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
  );
}

