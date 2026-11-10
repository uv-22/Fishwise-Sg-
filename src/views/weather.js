/**
 * Weather lab — live NEA data from data.gov.sg turned into maps, charts and
 * plain advice for anglers: a heat / rain / humidity / wind-flow map built
 * from the station network, the 2-hour forecast by area, UV through the day,
 * a 4-day outlook, haze, and a guide to reading conditions.
 */

import { icon } from '../icons.js';
import { esc } from '../ui.js';
import { SPOTS } from '../data/spots.js';
import { pageHead, spotBadge } from '../components.js';
import { observeReveals } from '../fx.js';
import { loadLeaflet } from './map.js';
import {
  getTwoHour, getTwentyFour, getFourDay, getStations, getWind, getUV, getPSI, nearest, fishingRisk, clearWeatherCache,
} from '../services/weather.js';

const SG = { center: [1.3521, 103.8198], bounds: [[1.2, 103.6], [1.48, 104.05]] };
const DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

const LAYERS = {
  temp: { label: 'Heat', icon: 'thermo', unit: '°C', min: 24, max: 34, stops: ['#1d4ed8', '#22d3ee', '#a3e635', '#facc15', '#f97316', '#ef4444'] },
  rain: { label: 'Rain', icon: 'rain', unit: 'mm / 5 min', min: 0, max: 3, stops: ['rgba(124,196,255,0)', '#7CC4FF', '#4FA3FF', '#2B7FE8', '#7c3aed', '#c026d3'] },
  hum: { label: 'Humidity', icon: 'droplet', unit: '%', min: 55, max: 100, stops: ['#f59e0b', '#a3e635', '#22d3ee', '#4FA3FF', '#2B7FE8', '#1e3a8a'] },
  wind: { label: 'Wind flow', icon: 'wind', unit: 'km/h', min: 0, max: 30, stops: ['#7CC4FF', '#A8D8FF', '#F2F6FC', '#facc15', '#f97316', '#ef4444'] },
  now: { label: '2-hr forecast', icon: 'cloud' },
};

let st = null; // { root, map, L, canvas, ctx, layer, data, raf }

function time(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-SG', { hour: 'numeric', minute: '2-digit' });
}

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
const compass = (deg) => COMPASS[Math.round(((deg % 360) / 22.5)) % 16];

function forecastIcon(text = '') {
  const t = text.toLowerCase();
  if (t.includes('thunder')) return 'storm';
  if (t.includes('rain') || t.includes('shower')) return 'rain';
  if (t.includes('wind')) return 'wind';
  if (t.includes('night')) return 'moon';
  if (t.includes('cloud') || t.includes('hazy')) return 'cloud';
  return 'sun';
}

/* ------------------------------------------------------------------
   Markup
   ------------------------------------------------------------------ */

export function render() {
  return `
  ${pageHead({
    eyebrow: 'Live conditions · NEA',
    title: 'Weather lab',
    lede: 'Live readings from NEA\'s weather stations turned into heat, rain and wind maps — with a straight answer on whether to go, and what each condition means on a jetty or a reservoir bank.',
    actions: `<button class="btn btn-secondary" type="button" id="wx-refresh">${icon('refresh', 16)} Refresh</button><button class="btn btn-primary" type="button" data-scroll="wx-spots">${icon('map', 16)} Spot by spot</button>`,
  })}

  <div id="wx-verdict-slot"><div class="wx-verdict tone-teal"><span class="v-ico"><span class="spinner"></span></span><div><b>Reading the sky…</b><span>Fetching the latest NEA forecasts and station readings.</span></div></div></div>

  <dl class="wx-now" id="wx-now">
    ${[['thermo', 'Air temp'], ['droplet', 'Humidity'], ['wind', 'Wind'], ['rain', 'Rain now'], ['uv', 'UV index'], ['gauge', 'Haze · PSI']].map(([i, l]) => `
      <div><dt>${icon(i, 13)} ${l}</dt><dd>–</dd><p>Loading…</p></div>`).join('')}
  </dl>

  <div class="wx-lab">
    <section class="wx-map-card" aria-label="Live weather map of Singapore">
      <div class="wx-map" id="wx-map"></div>
      <canvas class="wx-canvas" id="wx-canvas" aria-hidden="true"></canvas>
      <div class="wx-map-tools">
        <div class="segmented seg-dark" role="group" aria-label="Map layer">
          ${Object.entries(LAYERS).map(([k, l], i) => `<button class="seg" type="button" data-layer="${k}" aria-pressed="${i === 0}">${icon(l.icon, 13)} ${l.label}</button>`).join('')}
        </div>
        <span class="wx-stamp" id="wx-stamp">Loading stations…</span>
      </div>
      <div class="wx-legend" id="wx-legend"></div>
    </section>
    <div class="wx-side">
      <section class="wx-panel" id="wx-24">
        <h3>${icon('clock', 16)} Next 24 hours</h3>
        <p class="sub">Loading…</p>
      </section>
      <section class="wx-panel" id="wx-uv">
        <h3>${icon('uv', 16)} UV through the day</h3>
        <p class="sub">Loading…</p>
      </section>
    </div>
  </div>

  <section class="sec" aria-labelledby="four-title">
    <div class="sec-head"><div><p class="sec-kicker">Plan ahead</p><h2 id="four-title">Four-day <em>outlook</em></h2><p>Temperature range, humidity and wind for the next four days, from NEA.</p></div></div>
    <div id="wx-four"><p class="muted">Loading the outlook…</p></div>
  </section>

  <section class="sec" id="wx-spots" aria-labelledby="spot-wx-title">
    <div class="sec-head"><div><p class="sec-kicker">Next two hours</p><h2 id="spot-wx-title">Spot by <em>spot</em></h2><p>Each spot matched to its nearest NEA forecast area.</p></div></div>
    <div id="wx-spot-table"><p class="muted">Loading…</p></div>
  </section>

  <section class="sec" aria-labelledby="edu-title">
    <div class="sec-head"><div><p class="sec-kicker">Learn the sky</p><h2 id="edu-title">Read the weather <em>like an angler</em></h2><p>What each condition means for your safety and your fishing — and what to do about it.</p></div></div>
    <div class="edu-grid stagger reveal">
      <article class="edu"><span class="ico">${icon('bolt', 20)}</span><h3>Thunder &amp; lightning</h3>
        <p>A carbon or graphite rod is a lightning conductor, and jetties and open banks are exposed. If you can hear thunder, you are close enough to be struck.</p>
        <ul><li>Stop at the first rumble, lower your rod and get off the jetty.</li><li>Shelter in a building or a car — not under a tree or a jetty shelter roof.</li><li>Wait 30 minutes after the last thunder before going back.</li></ul></article>
      <article class="edu"><span class="ico">${icon('wind', 20)}</span><h3>Wind</h3>
        <p>Light wind ruffles the surface and can help — fish feel safer under a ripple. Strong wind makes casting hard and throws spray over jetties.</p>
        <ul><li>Fish with the wind behind you for longer, easier casts.</li><li>Gusty? Pick a sheltered reservoir zone instead of an open jetty.</li><li>Use a heavier sinker or lure to hold bottom.</li></ul></article>
      <article class="edu"><span class="ico">${icon('rain', 20)}</span><h3>Rain</h3>
        <p>Light rain is fishable with grippy shoes. Heavy rain is different: water in canals and drains can rise very quickly.</p>
        <ul><li>Leave canal and drain banks as soon as heavy rain starts.</li><li>Wet planks and rocks are slippery — slow down.</li><li>Pack a dry bag for your phone.</li></ul></article>
      <article class="edu"><span class="ico">${icon('thermo', 20)}</span><h3>Heat</h3>
        <p>Midday sun on concrete and water is fierce, and long sessions add up. Fish usually feed more at dawn and dusk anyway.</p>
        <ul><li>Go early or late; take shade breaks.</li><li>Drink regularly, before you feel thirsty.</li><li>Watch for dizziness or headache — stop and cool down.</li></ul></article>
      <article class="edu"><span class="ico">${icon('uv', 20)}</span><h3>UV index</h3>
        <p>Singapore's UV often reaches very high levels around midday. Water reflects UV, so you burn faster by the shore.</p>
        <div class="scale"><span style="background:#3DDC97">0–2 Low</span><span style="background:#facc15">3–5 Mod</span><span style="background:#f97316">6–7 High</span><span style="background:#ef4444">8–10 V.high</span><span style="background:#c026d3;color:#fff">11+ Ext</span></div>
        <ul><li>High and above: hat, sunglasses, SPF 30+ sunscreen and shade.</li></ul></article>
      <article class="edu"><span class="ico">${icon('gauge', 20)}</span><h3>Haze (24-hr PSI)</h3>
        <p>NEA's PSI bands tell you how clean the air is. Long sessions outdoors in haze are hard on your lungs.</p>
        <div class="scale"><span style="background:#3DDC97">0–50 Good</span><span style="background:#facc15">51–100 Mod</span><span style="background:#f97316">101–200 Unhealthy</span><span style="background:#ef4444">201–300 V. unhealthy</span><span style="background:#7c3aed;color:#fff">300+</span></div>
        <ul><li>Above 100, cut down prolonged or strenuous outdoor activity.</li></ul></article>
      <article class="edu"><span class="ico">${icon('compass', 20)}</span><h3>Monsoon seasons</h3>
        <p>Singapore's year has four phases, and each changes what a fishing day looks like.</p>
        <ul><li><b>Northeast monsoon</b> (Dec–early Mar): wet spells in Dec–Jan, then a drier, breezier Feb.</li><li><b>Southwest monsoon</b> (Jun–Sep): drier, with early-morning squall lines.</li><li><b>Inter-monsoon</b> (Apr–May, Oct–Nov): light winds, afternoon and evening thunderstorms.</li></ul></article>
      <article class="edu"><span class="ico">${icon('tide', 20)}</span><h3>Tides</h3>
        <p>At jetties and beaches, fish often feed as the tide moves. Slack water is usually slower.</p>
        <ul><li>The couple of hours around high tide are a good bet on jetties.</li><li>Check a published tide table (MPA) before coastal trips.</li><li>Reservoirs and canals are not tidal.</li></ul></article>
      <article class="edu"><span class="ico">${icon('sun', 20)}</span><h3>Best time of day</h3>
        <p>Low light at dawn and dusk is when many predators hunt the shallows — and it is cooler for you too.</p>
        <ul><li>Dawn: calm water, few people.</li><li>Dusk: feeding spell; bring a headlamp for the walk back.</li><li>Overcast days can fish well all day.</li></ul></article>
    </div>
  </section>

  <section class="sec todo-wrap" aria-labelledby="todo-title">
    <div class="sec-head"><div><p class="sec-kicker">Quick reference</p><h2 id="todo-title">What to do <em>when…</em></h2></div></div>
    <div style="overflow-x:auto" data-native-scroll>
    <table class="todo-table">
      <thead><tr><th>Condition</th><th>What it means</th><th>What to do</th></tr></thead>
      <tbody>
        <tr><td>${icon('bolt', 14)} You hear thunder</td><td>Lightning can reach you</td><td>Stop, lower your rod, shelter indoors or in a car. Wait 30 minutes after the last thunder.</td></tr>
        <tr><td>${icon('storm', 14)} "Thundery showers" forecast</td><td>Storms likely in the next two hours</td><td>Don't start. Pick a dry window later or another day.</td></tr>
        <tr><td>${icon('rain', 14)} Heavy rain</td><td>Slippery surfaces; canals rise fast</td><td>Leave canal and drain banks right away. Wait it out under cover.</td></tr>
        <tr><td>${icon('wind', 14)} Wind above ~25 km/h</td><td>Hard casting, spray on jetties</td><td>Choose a sheltered reservoir zone, or cast with the wind behind you.</td></tr>
        <tr><td>${icon('uv', 14)} UV 8 or more</td><td>Very high sunburn risk</td><td>Hat, sunglasses, sunscreen, shade breaks; fish early or late.</td></tr>
        <tr><td>${icon('gauge', 14)} PSI above 100</td><td>Unhealthy air</td><td>Cut down long sessions outdoors, or reschedule.</td></tr>
        <tr><td>${icon('thermo', 14)} Hot and still</td><td>Heat stress builds up</td><td>Drink regularly, rest in the shade, stop if you feel unwell.</td></tr>
      </tbody>
    </table>
    </div>
  </section>

  <p class="small muted" style="margin-top:2rem">Source: <a href="https://data.gov.sg/" target="_blank" rel="noopener noreferrer">data.gov.sg</a> (NEA / Meteorological Service Singapore). Maps are interpolated between stations and are a guide, not a measurement at your exact spot. Official warnings: <a href="https://www.weather.gov.sg/" target="_blank" rel="noopener noreferrer">weather.gov.sg</a>.</p>`;
}

/* ------------------------------------------------------------------
   Mount
   ------------------------------------------------------------------ */

export function mount(root, ctx) {
  root.querySelector('#wx-refresh').addEventListener('click', () => {
    clearWeatherCache();
    ctx.refresh();
  });
  root.querySelectorAll('[data-layer]').forEach((b) => b.addEventListener('click', () => setLayer(b.dataset.layer)));
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-scroll]');
    if (b) root.querySelector(`#${b.dataset.scroll}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  st = { root, map: null, L: null, layer: 'temp', data: {}, raf: 0, particles: [] };
  initMap(root);
  load(root);
  return () => {
    cancelAnimationFrame(st?.raf || 0);
    clearTimeout(st?.ovT);
    st?.ro?.disconnect();
    try { st?.map?.stop(); st?.map?.remove(); } catch { /* already gone */ }
    st = null;
  };
}

async function load(root) {
  const alive = () => st && st.root === root && root.isConnected;
  const two = await getTwoHour().catch((e) => e);
  if (!alive()) return;
  if (!(two instanceof Error)) { st.data.two = two; verdict(root, two); spotTable(root, two); }
  else root.querySelector('#wx-verdict-slot').innerHTML = `<div class="notice notice-amber">${icon('alert', 17)}<div><strong>Live forecast unavailable.</strong> ${esc(two.message)} Try Refresh in a few seconds, or check <a href="https://www.weather.gov.sg/" target="_blank" rel="noopener noreferrer">weather.gov.sg</a>.</div></div>`;

  const temp = await getStations('air-temperature').catch((e) => e);
  if (!alive()) return;
  if (!(temp instanceof Error)) { st.data.temp = temp; draw(); }
  tile(root, 0, temp, (t) => {
    const v = t.stations.map((s) => s.value);
    const avg = v.reduce((a, b) => a + b, 0) / v.length;
    return [`${avg.toFixed(1)}<small>°C</small>`, `${Math.min(...v).toFixed(1)}–${Math.max(...v).toFixed(1)}°C · ${v.length} stations`];
  });

  const wind = await getWind().catch((e) => e);
  if (!alive()) return;
  if (!(wind instanceof Error)) { st.data.wind = wind; draw(); }
  tile(root, 2, wind, (w) => {
    const v = w.stations.map((s) => s.kmh);
    const avg = v.reduce((a, b) => a + b, 0) / v.length;
    const x = w.stations.reduce((a, s) => a + Math.sin((s.dir * Math.PI) / 180), 0);
    const y = w.stations.reduce((a, s) => a + Math.cos((s.dir * Math.PI) / 180), 0);
    const mean = (Math.atan2(x, y) * 180) / Math.PI + 360;
    return [`${avg.toFixed(0)}<small> km/h</small>`, `From the ${compass(mean)} · gusts to ${Math.max(...v).toFixed(0)} km/h at stations`];
  });

  const rain = await getStations('rainfall').catch((e) => e);
  if (!alive()) return;
  if (!(rain instanceof Error)) { st.data.rain = rain; draw(); }
  tile(root, 3, rain, (r) => {
    const wet = r.stations.filter((s) => s.value > 0);
    const max = Math.max(0, ...r.stations.map((s) => s.value));
    return [`${wet.length}<small>/${r.stations.length}</small>`, wet.length ? `Stations with rain · heaviest ${max.toFixed(1)} mm in 5 min` : 'Stations with rain · dry everywhere'];
  });

  const hum = await getStations('relative-humidity').catch((e) => e);
  if (!alive()) return;
  if (!(hum instanceof Error)) { st.data.hum = hum; draw(); }
  tile(root, 1, hum, (h) => {
    const v = h.stations.map((s) => s.value);
    const avg = v.reduce((a, b) => a + b, 0) / v.length;
    return [`${avg.toFixed(0)}<small>%</small>`, `${Math.min(...v).toFixed(0)}–${Math.max(...v).toFixed(0)}% across stations`];
  });

  const day = await getTwentyFour().catch((e) => e);
  if (!alive()) return;
  twentyFour(root, day);

  const uv = await getUV().catch((e) => e);
  if (!alive()) return;
  uvPanel(root, uv);
  tile(root, 4, uv, (u) => {
    const last = u.hours[u.hours.length - 1];
    const peak = Math.max(...u.hours.map((h) => h.value));
    return [`${last.value}`, `${uvBand(last.value)} now · peak today ${peak} (${uvBand(peak)})`];
  });

  const psi = await getPSI().catch((e) => e);
  if (!alive()) return;
  tile(root, 5, psi, (p) => {
    const vals = Object.values(p.psi);
    const max = Math.max(...vals);
    return [`${max}`, `${psiBand(max)} · highest of 5 regions`];
  });

  const four = await getFourDay().catch((e) => e);
  if (!alive()) return;
  fourDay(root, four);

  root.querySelector('#wx-stamp').textContent = st.data.temp ? `Stations · ${time(st.data.temp.at)}` : 'Station data unavailable';
  observeReveals(root);
}

function uvBand(v) { return v <= 2 ? 'Low' : v <= 5 ? 'Moderate' : v <= 7 ? 'High' : v <= 10 ? 'Very high' : 'Extreme'; }
function psiBand(v) { return v <= 50 ? 'Good' : v <= 100 ? 'Moderate' : v <= 200 ? 'Unhealthy' : v <= 300 ? 'Very unhealthy' : 'Hazardous'; }

function tile(root, i, res, fmt) {
  const el = root.querySelectorAll('#wx-now > div')[i];
  if (!el) return;
  if (res instanceof Error || !res) { el.querySelector('dd').textContent = '–'; el.querySelector('p').textContent = 'Unavailable right now'; return; }
  try {
    const [v, note] = fmt(res);
    el.querySelector('dd').innerHTML = v;
    el.querySelector('p').textContent = note;
  } catch { el.querySelector('p').textContent = 'Unavailable right now'; }
}

function verdict(root, two) {
  const risks = two.areas.map((a) => fishingRisk(a.forecast));
  const storms = risks.filter((r) => r.level === 'stop').length;
  const wet = risks.filter((r) => r.level === 'caution').length;
  let tone = 'teal', ic = 'checkCircle', title = 'Good to go — fair across Singapore', text = `No thundery or rainy forecasts in the next two hours (${esc(two.validText)}). Bring water and sun protection.`;
  if (storms) { tone = 'red'; ic = 'storm'; title = `Thunder in ${storms} of ${two.areas.length} areas — check your spot`; text = 'Do not fish anywhere with a thundery forecast. A rod conducts lightning. See which spots are clear below.'; }
  else if (wet) { tone = 'amber'; ic = 'rain'; title = `Showers in ${wet} of ${two.areas.length} areas`; text = 'Fishable with care: grippy shoes, a dry bag, and leave at the first sign of thunder.'; }
  root.querySelector('#wx-verdict-slot').innerHTML = `
    <div class="wx-verdict tone-${tone}">
      <span class="v-ico">${icon(ic, 26)}</span>
      <div><b>${title}</b><span>${text}</span></div>
      <button class="btn btn-secondary btn-sm" type="button" data-scroll="wx-spots">Spot by spot ${icon('arrowRight', 14)}</button>
    </div>`;
}

function spotTable(root, two) {
  const rows = SPOTS.filter((s) => s.status !== 'excluded').map((s) => {
    const area = nearest(two.areas, s.lat, s.lng);
    return { s, area, risk: fishingRisk(area.forecast) };
  });
  const order = { stop: 0, caution: 1, good: 2 };
  rows.sort((a, b) => order[a.risk.level] - order[b.risk.level] || a.s.name.localeCompare(b.s.name));
  root.querySelector('#wx-spot-table').innerHTML = `
    <section class="card" aria-label="Forecast by spot">
      <div class="card-head"><h2>${rows.length} spots · ${esc(two.validText)}</h2><span class="sub">NEA 2-hour forecast</span></div>
      <div class="wx-table" role="table" aria-label="Forecast by spot">
        <div class="wx-tr wx-th" role="row"><span role="columnheader">Spot</span><span role="columnheader">Forecast</span><span role="columnheader">Advice</span></div>
        ${rows.map((r) => `
          <a class="wx-tr" role="row" href="#/map/${r.s.id}" data-cursor="Open spot">
            <span role="cell"><b>${esc(r.s.name)}</b><span class="small muted">${esc(r.area.name)} area</span></span>
            <span role="cell" class="wx-cell tone-${r.risk.tone}">${icon(r.risk.icon, 16)} ${esc(r.area.forecast)}</span>
            <span role="cell">${spotBadge(r.s.status, true)} <span class="small">${esc(r.risk.label)}</span></span>
          </a>`).join('')}
      </div>
    </section>`;
}

function twentyFour(root, day) {
  const el = root.querySelector('#wx-24');
  if (day instanceof Error) { el.innerHTML = `<h3>${icon('clock', 16)} Next 24 hours</h3><p class="sub">Unavailable right now.</p>`; return; }
  const g = day.general;
  const risk = fishingRisk(g.forecast?.text);
  el.innerHTML = `
    <h3>${icon('clock', 16)} Next 24 hours</h3>
    <p class="sub">${esc(g.validPeriod?.text || '')}</p>
    <div style="display:flex;gap:.8rem;align-items:center;margin-top:.9rem">
      <span class="stat-ico" style="width:46px;height:46px;border-radius:14px">${icon(risk.icon, 22)}</span>
      <div><b style="font-family:var(--font-display);font-size:1.1rem">${esc(g.forecast?.text || '—')}</b>
      <p class="small muted">${g.temperature?.low ?? '–'}–${g.temperature?.high ?? '–'}°C · ${g.relativeHumidity?.low ?? '–'}–${g.relativeHumidity?.high ?? '–'}% RH · ${esc(g.wind?.direction || '')} ${g.wind?.speed?.low ?? ''}–${g.wind?.speed?.high ?? ''} km/h</p></div>
    </div>
    <div class="regions" style="grid-template-columns:repeat(${Math.min(3, day.periods.length || 1)},1fr);margin-top:1rem">
      ${day.periods.slice(0, 3).map((p) => `
        <div class="region"><b>${esc((p.timePeriod?.text || '').replace(/ to .*/, '…'))}</b>
          ${['north', 'south', 'east', 'west', 'central'].map((r) => `<p title="${esc(p.regions?.[r]?.text || '')}">${icon(forecastIcon(p.regions?.[r]?.text), 12)} <span class="small">${r[0].toUpperCase() + r.slice(1)}</span></p>`).join('')}
        </div>`).join('')}
    </div>
    <p class="small muted" style="margin-top:.8rem">${esc(risk.advice)}</p>`;
}

function uvPanel(root, uv) {
  const el = root.querySelector('#wx-uv');
  if (uv instanceof Error) { el.innerHTML = `<h3>${icon('uv', 16)} UV through the day</h3><p class="sub">Unavailable right now.</p>`; return; }
  const hrs = uv.hours;
  const W = 340, H = 150, pl = 22, pb = 22, pt = 10;
  const max = Math.max(11, ...hrs.map((h) => h.value));
  const x = (i) => pl + (i / Math.max(1, hrs.length - 1)) * (W - pl - 6);
  const y = (v) => pt + (H - pt - pb) * (1 - v / max);
  const pts = hrs.map((h, i) => [x(i), y(h.value)]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)} ${H - pb} L${pts[0][0].toFixed(1)} ${H - pb} Z`;
  const bands = [[0, 2, '#3DDC97'], [3, 5, '#facc15'], [6, 7, '#f97316'], [8, 10, '#ef4444'], [11, max, '#c026d3']];
  el.innerHTML = `
    <h3>${icon('uv', 16)} UV through the day</h3>
    <p class="sub">Hourly UV index · updated ${time(uv.at)}</p>
    <svg class="wx-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="UV index by hour today, peak ${Math.max(...hrs.map((h) => h.value))}">
      <defs><linearGradient id="uvg" x1="0" y1="1" x2="0" y2="0">${bands.map(([a, , c]) => `<stop offset="${(a / max).toFixed(2)}" stop-color="${c}"/>`).join('')}</linearGradient>
      <linearGradient id="uva" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7CC4FF" stop-opacity=".35"/><stop offset="1" stop-color="#7CC4FF" stop-opacity="0"/></linearGradient></defs>
      ${[0, 3, 6, 8, 11].map((v) => `<line class="grid" x1="${pl}" x2="${W - 6}" y1="${y(v)}" y2="${y(v)}"/><text x="${pl - 6}" y="${y(v) + 3}" text-anchor="end">${v}</text>`).join('')}
      <path d="${area}" fill="url(#uva)"/>
      <path class="draw" d="${line}" fill="none" stroke="url(#uvg)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" style="--len:900"/>
      ${pts.map((p, i) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3" fill="#04070D" stroke="#7CC4FF" stroke-width="1.5"><title>${new Date(hrs[i].hour).toLocaleTimeString('en-SG', { hour: 'numeric' })}: UV ${hrs[i].value}</title></circle>`).join('')}
      ${hrs.map((h, i) => (i % 2 ? '' : `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${new Date(h.hour).toLocaleTimeString('en-SG', { hour: 'numeric' }).replace(' ', '').toLowerCase()}</text>`)).join('')}
    </svg>`;
}

function fourDay(root, four) {
  const el = root.querySelector('#wx-four');
  if (four instanceof Error) { el.innerHTML = `<p class="muted">The 4-day outlook is unavailable right now.</p>`; return; }
  const days = four.days.slice(0, 4);
  const lo = Math.min(...days.map((d) => d.temperature.low)) - 1, hi = Math.max(...days.map((d) => d.temperature.high)) + 1;
  const W = 720, H = 210, pl = 34, pr = 34, pt = 18, pb = 30;
  const cx = (i) => pl + ((i + 0.5) / days.length) * (W - pl - pr);
  const ty = (v) => pt + (H - pt - pb) * (1 - (v - lo) / (hi - lo));
  el.innerHTML = `
    <div class="wx-panel">
      <svg class="wx-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Four-day temperature and humidity outlook">
        <defs><linearGradient id="tband" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#4FA3FF"/><stop offset="1" stop-color="#f97316"/></linearGradient></defs>
        ${[lo + 1, Math.round((lo + hi) / 2), hi - 1].map((v) => `<line class="grid" x1="${pl}" x2="${W - pr}" y1="${ty(v)}" y2="${ty(v)}"/><text x="${pl - 8}" y="${ty(v) + 3}" text-anchor="end">${v}°</text>`).join('')}
        ${days.map((d, i) => `
          <rect x="${cx(i) - 13}" y="${ty(d.temperature.high)}" width="26" height="${Math.max(6, ty(d.temperature.low) - ty(d.temperature.high))}" rx="13" fill="url(#tband)"/>
          <text x="${cx(i)}" y="${ty(d.temperature.high) - 7}" text-anchor="middle" style="fill:#F2F6FC;font-size:12px">${d.temperature.high}°</text>
          <text x="${cx(i)}" y="${ty(d.temperature.low) + 15}" text-anchor="middle">${d.temperature.low}°</text>
          <text x="${cx(i)}" y="${H - 8}" text-anchor="middle" style="fill:#C5D1E3;font-size:11px">${esc(d.day.slice(0, 3).toUpperCase())}</text>`).join('')}
      </svg>
      <p class="small muted" style="margin-top:.4rem">Bars show each day's low and high temperature.</p>
      <div class="days4">
        ${days.map((d) => {
          const r = fishingRisk(d.forecast?.text || d.forecast?.summary);
          return `
          <div class="day4">
            <span class="d">${esc(d.day)}</span>
            ${icon(forecastIcon(d.forecast?.text), 26)}
            <b>${esc(d.forecast?.summary || d.forecast?.text || '')}</b>
            <span class="t">${d.temperature.low}–${d.temperature.high}°</span>
            <span class="m">${esc(d.wind?.direction || '')} ${d.wind?.speed?.low ?? ''}–${d.wind?.speed?.high ?? ''} km/h · ${d.relativeHumidity.low}–${d.relativeHumidity.high}%</span>
            <span class="badge ${r.tone === 'red' ? 'badge-restricted' : r.tone === 'amber' ? 'badge-verify' : 'badge-designated'}" style="justify-self:start">${esc(r.label)}</span>
          </div>`;
        }).join('')}
      </div>
    </div>`;
}

/* ------------------------------------------------------------------
   Live map: Leaflet (OneMap night tiles) + canvas overlay
   ------------------------------------------------------------------ */

function initMap(root) {
  loadLeaflet().then((L) => {
    if (!st || st.root !== root || !root.isConnected) return;
    const map = L.map(root.querySelector('#wx-map'), {
      zoomControl: false, attributionControl: true, maxBounds: SG.bounds, maxBoundsViscosity: 0.8,
      minZoom: 10, maxZoom: 15, scrollWheelZoom: false,
    });
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer(DARK, { minZoom: 10, maxZoom: 15, subdomains: 'abcd', attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a> · Weather &copy; NEA' }).addTo(map);
    map.fitBounds([[1.22, 103.62], [1.47, 104.02]]);
    st.map = map;
    st.L = L;
    st.canvas = root.querySelector('#wx-canvas');
    st.ctx = st.canvas.getContext('2d');
    const redraw = () => { if (st?.map === map) { sizeCanvas(); draw(); } };
    map.on('move zoom resize', redraw);
    st.ro = new ResizeObserver(() => { if (st?.map === map) { map.invalidateSize(); redraw(); } });
    st.ro.observe(root.querySelector('.wx-map-card'));
    redraw();
  }).catch(() => {
    const card = root.querySelector('.wx-map-card');
    if (card) card.insertAdjacentHTML('beforeend', `<div class="map-loading">${icon('alert', 16)} The map could not load.</div>`);
  });
}

function sizeCanvas() {
  if (!st?.canvas) return;
  const r = st.canvas.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (st.canvas.width !== Math.round(r.width * dpr) || st.canvas.height !== Math.round(r.height * dpr)) {
    st.canvas.width = Math.round(r.width * dpr);
    st.canvas.height = Math.round(r.height * dpr);
  }
  st.w = r.width; st.h = r.height; st.dpr = dpr;
  st.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function setLayer(k) {
  if (!st) return;
  st.layer = k;
  st.root.querySelectorAll('[data-layer]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.layer === k)));
  draw();
}

function hexToRgb(c) {
  if (c.startsWith('rgba')) { const m = c.match(/[\d.]+/g).map(Number); return [m[0], m[1], m[2], m[3]]; }
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
}
function ramp(stops, t) {
  t = Math.max(0, Math.min(1, t));
  const f = t * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(f)), k = f - i;
  const a = hexToRgb(stops[i]), b = hexToRgb(stops[i + 1]);
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k, a[3] + (b[3] - a[3]) * k];
}

function legend(k) {
  const el = st.root.querySelector('#wx-legend');
  const L2 = LAYERS[k];
  if (k === 'now') {
    el.innerHTML = `<div>2-hour forecast by area</div><div style="display:flex;gap:.7rem;margin-top:.4rem"><span style="color:#3DDC97">● Fair</span><span style="color:#F5B455">● Wet</span><span style="color:#FF8A84">● Thunder</span></div>`;
    return;
  }
  el.innerHTML = `<div>${L2.label} · ${L2.unit}</div><div class="bar" style="background:linear-gradient(90deg,${L2.stops.join(',')})"></div><div class="ends"><span>${L2.min}</span><span>${L2.max}+</span></div>`;
}

function pts(list, valueOf) {
  const { map } = st;
  return list.map((s) => { const p = map.latLngToContainerPoint([s.lat, s.lng]); return { x: p.x, y: p.y, v: valueOf(s), s }; });
}

function idw(points, x, y) {
  let num = 0, den = 0, dmin = Infinity;
  for (const p of points) {
    const d2 = (p.x - x) ** 2 + (p.y - y) ** 2 + 1;
    const w = 1 / (d2 * d2);
    num += w * p.v; den += w;
    if (d2 < dmin) dmin = d2;
  }
  return { v: num / den, d: Math.sqrt(dmin) };
}

function draw() {
  if (!st?.map || !st.ctx) return;
  cancelAnimationFrame(st.raf);
  clearTimeout(st.ovT);
  st.raf = 0;
  const { ctx } = st;
  ctx.clearRect(0, 0, st.w, st.h);
  legend(st.layer);
  const k = st.layer;
  if (k === 'now') return drawForecast();
  if (k === 'wind') return drawWind();
  const src = k === 'temp' ? st.data.temp : k === 'rain' ? st.data.rain : st.data.hum;
  if (!src) return;
  const L2 = LAYERS[k];
  const P = pts(src.stations, (s) => s.value);
  const cell = 7;
  const reach = Math.max(st.w, st.h) * 0.22;
  for (let y = 0; y < st.h; y += cell) {
    for (let x = 0; x < st.w; x += cell) {
      const { v, d } = idw(P, x + cell / 2, y + cell / 2);
      const c = ramp(L2.stops, (v - L2.min) / (L2.max - L2.min));
      const a = c[3] * 0.5 * Math.max(0, 1 - d / reach);
      if (a < 0.02) continue;
      ctx.fillStyle = `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a.toFixed(3)})`;
      ctx.fillRect(x, y, cell, cell);
    }
  }
  // station dots + values
  ctx.font = '600 10px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  for (const p of P) {
    ctx.fillStyle = '#04070D';
    ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#F2F6FC'; ctx.lineWidth = 1.2; ctx.stroke();
    if (k !== 'rain' || p.v > 0) {
      const label = k === 'temp' ? `${p.v.toFixed(1)}°` : k === 'hum' ? `${Math.round(p.v)}%` : `${p.v.toFixed(1)}`;
      ctx.fillStyle = 'rgba(4,7,13,.75)';
      const w = ctx.measureText(label).width + 8;
      ctx.fillRect(p.x - w / 2, p.y - 19, w, 13);
      ctx.fillStyle = '#F2F6FC';
      ctx.fillText(label, p.x, p.y - 9.5);
    }
  }
}

function drawForecast() {
  const two = st.data.two;
  if (!two) return;
  const { ctx } = st;
  ctx.font = '600 10px "Manrope", sans-serif';
  ctx.textAlign = 'center';
  const P = pts(two.areas, () => 0);
  for (const p of P) {
    const r = fishingRisk(p.s.forecast);
    const col = r.tone === 'red' ? '#FF8A84' : r.tone === 'amber' ? '#F5B455' : '#3DDC97';
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.18;
    ctx.beginPath(); ctx.arc(p.x, p.y, 16, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
    if (st.map.getZoom() >= 11) {
      ctx.fillStyle = 'rgba(242,246,252,.85)';
      ctx.fillText(p.s.name.length > 14 ? `${p.s.name.slice(0, 13)}…` : p.s.name, p.x, p.y + 16);
    }
  }
}

function drawWind() {
  const wind = st.data.wind;
  if (!wind) return;
  const L2 = LAYERS.wind;
  const P = wind.stations.map((s) => {
    const p = st.map.latLngToContainerPoint([s.lat, s.lng]);
    const to = ((s.dir + 180) * Math.PI) / 180; // direction the air moves towards
    return { x: p.x, y: p.y, u: Math.sin(to) * s.kmh, v: -Math.cos(to) * s.kmh, s };
  });
  const field = (x, y) => {
    let nu = 0, nv = 0, den = 0;
    for (const p of P) { const d2 = (p.x - x) ** 2 + (p.y - y) ** 2 + 1; const w = 1 / (d2 * d2); nu += w * p.u; nv += w * p.v; den += w; }
    return [nu / den, nv / den];
  };
  const n = Math.round((st.w * st.h) / 900);
  st.particles = Array.from({ length: Math.min(1400, n) }, () => ({ x: Math.random() * st.w, y: Math.random() * st.h, age: Math.random() * 80 }));
  const { ctx } = st;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stationArrows = () => {
    ctx.font = '600 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    for (const p of P) {
      const ang = Math.atan2(p.v, p.u);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(ang);
      ctx.strokeStyle = '#F2F6FC'; ctx.fillStyle = '#F2F6FC'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(8, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(5, -4.5); ctx.lineTo(5, 4.5); ctx.closePath(); ctx.fill();
      ctx.restore();
      const label = `${Math.round(p.s.kmh)}`;
      ctx.fillStyle = 'rgba(4,7,13,.75)';
      ctx.fillRect(p.x - 10, p.y + 9, 20, 13);
      ctx.fillStyle = '#F2F6FC';
      ctx.fillText(label, p.x, p.y + 19);
    }
  };
  const step = () => {
    if (!st || st.layer !== 'wind') return;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,0.09)';
    ctx.fillRect(0, 0, st.w, st.h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineWidth = 1.3;
    for (const q of st.particles) {
      const [u, v] = field(q.x, q.y);
      const sp = Math.hypot(u, v);
      const k = 0.32 + 0.6 / (1 + sp); // keep light winds visibly moving
      const nx = q.x + u * k, ny = q.y + v * k;
      const c = ramp(L2.stops, sp / L2.max);
      ctx.strokeStyle = `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},.75)`;
      ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(nx, ny); ctx.stroke();
      q.x = nx; q.y = ny; q.age += 1;
      if (q.age > 90 || q.x < 0 || q.y < 0 || q.x > st.w || q.y > st.h) { q.x = Math.random() * st.w; q.y = Math.random() * st.h; q.age = 0; }
    }
    st.raf = requestAnimationFrame(step);
  };
  if (reduce) { stationArrows(); return; }
  step();
  // arrows on a separate pass each second so they stay crisp
  const overlay = () => { if (st?.layer === 'wind') { stationArrows(); st.ovT = setTimeout(overlay, 120); } };
  overlay();
}
