/**
 * Trip planner — "Should I go?"
 *
 * Pick a spot, a day and a time window. FishWise combines the official
 * status of the spot, the NEA forecast for that window (2-hour nowcast,
 * 24-hour regional forecast or 4-day outlook, whichever covers it), the
 * lightning risk, heat, getting there and what to bring into one verdict:
 * Go, Go with care, or Don't go.
 */

import { icon } from '../icons.js';
import { esc } from '../ui.js';
import { SPOTS } from '../data/spots.js';
import { getSpecies } from '../data/species.js';
import { ACCESS } from '../data/access.js';
import { SPOT_STATUS, SPOT_TYPES, spotBadge, getSpot, pageHead } from '../components.js';
import { getTwoHour, getTwentyFour, getFourDay, nearest, fishingRisk, distanceKm } from '../services/weather.js';
import { SALT_BRING, FRESH_BRING } from './map.js';

const WINDOWS = {
  dawn: { label: 'Dawn', hours: [6, 9], note: '6–9 am' },
  morning: { label: 'Morning', hours: [9, 12], note: '9 am–12 pm' },
  afternoon: { label: 'Afternoon', hours: [12, 16], note: '12–4 pm' },
  evening: { label: 'Evening', hours: [16, 19], note: '4–7 pm' },
  night: { label: 'Night', hours: [19, 23], note: '7–11 pm' },
};
const COASTAL = ['jetty', 'beach', 'shore', 'island'];
const sel = { spot: 'bedok-jetty', day: 0, win: null, kids: false };

function defaultWindow() {
  const h = new Date().getHours();
  return Object.entries(WINDOWS).find(([, w]) => h < w.hours[1])?.[0] || 'dawn';
}

function dayDate(offset) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d;
}
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayName = (o) => (o === 0 ? 'Today' : o === 1 ? 'Tomorrow' : dayDate(o).toLocaleDateString('en-SG', { weekday: 'long' }));

function regionOf(s) {
  if (s.lat > 1.4) return 'north';
  if (s.lng > 103.9) return 'east';
  if (s.lng < 103.76) return 'west';
  if (s.lat < 1.29) return 'south';
  return 'central';
}

/** Find the NEA forecast that covers the chosen window. */
async function forecastFor(spot, day, win) {
  const [h0, h1] = WINDOWS[win].hours;
  const start = dayDate(day); start.setHours(h0);
  const end = dayDate(day); end.setHours(h1);
  const now = new Date();
  if (end <= now) return { passed: true };
  if (start.getTime() - now.getTime() < 2 * 3600e3 && day === 0) {
    const two = await getTwoHour().catch(() => null);
    const area = two && nearest(two.areas, spot.lat, spot.lng);
    if (area) return { text: area.forecast, source: `NEA 2-hour forecast · ${area.name}`, when: two.validText };
  }
  const t24 = await getTwentyFour().catch(() => null);
  if (t24) {
    const region = regionOf(spot);
    const p = t24.periods.find((q) => {
      const a = new Date(q.timePeriod?.start), b = new Date(q.timePeriod?.end);
      return a < end && b > start;
    });
    const r = p?.regions?.[region];
    if (r?.text) return { text: r.text, source: `NEA 24-hour forecast · ${region[0].toUpperCase()}${region.slice(1)} region`, when: p.timePeriod?.text || '', temp: t24.general?.temperature };
  }
  const four = await getFourDay().catch(() => null);
  const d = four?.days.find((x) => (x.timestamp || '').slice(0, 10) === iso(dayDate(day)));
  if (d) return { text: d.forecast?.text || d.forecast?.summary || '', source: 'NEA 4-day outlook · whole island', when: d.day || '', temp: d.temperature };
  return { none: true };
}

const RANK = { go: 0, care: 1, no: 2 };
const VERDICT = {
  go: { word: 'Go', tone: 'teal', icon: 'checkCircle', sub: 'Conditions and rules look good for this trip.' },
  care: { word: 'Go with care', tone: 'amber', icon: 'alert', sub: 'You can go, but read the points below first.' },
  no: { word: 'Don’t go', tone: 'red', icon: 'ban', sub: 'Pick another spot or time. Alternatives are below.' },
};

function spotOptions() {
  const groups = [['listed', 'Listed on PUB / NParks pages'], ['paid', 'Paid ponds'], ['check', 'Check first'], ['excluded', 'Fishing not allowed']];
  return groups.map(([k, label]) => `<optgroup label="${label}">${SPOTS.filter((s) => s.status === k).sort((a, b) => a.name.localeCompare(b.name))
    .map((s) => `<option value="${s.id}" ${s.id === sel.spot ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</optgroup>`).join('');
}

export function render(ctx, param, query) {
  const q = query?.get('spot');
  if (q && getSpot(q)) sel.spot = q;
  if (!sel.win) sel.win = defaultWindow();
  return `
  ${pageHead({
    eyebrow: 'Trip planner',
    title: 'Should I <em style="font-style:normal;color:var(--sky)">go?</em>',
    lede: 'Pick a spot and a time. FishWise checks the official rules, the NEA forecast for that window, lightning and heat, how to get there and what to bring — and gives you one answer.',
  })}
  <div class="plan-layout">
    <form class="plan-form card" id="plan-form" aria-label="Trip details">
      <div class="field">
        <label for="pl-spot">Where</label>
        <select class="select" id="pl-spot">${spotOptions()}</select>
      </div>
      <div class="field">
        <span class="lbl">When</span>
        <div class="segmented plan-seg" role="group" aria-label="Day" data-native-scroll>
          ${[0, 1, 2, 3].map((o) => `<button class="seg" type="button" data-day="${o}" aria-pressed="${sel.day === o}">${dayName(o)}</button>`).join('')}
        </div>
      </div>
      <div class="field">
        <span class="lbl">Time</span>
        <div class="plan-wins" role="group" aria-label="Time of day">
          ${Object.entries(WINDOWS).map(([k, w]) => `<button type="button" class="plan-win" data-win="${k}" aria-pressed="${sel.win === k}"><b>${w.label}</b><span>${w.note}</span></button>`).join('')}
        </div>
      </div>
      <label class="plan-check"><input type="checkbox" id="pl-kids" ${sel.kids ? 'checked' : ''} /> Bringing children</label>
      <p class="small muted">Forecasts come from NEA via data.gov.sg and update through the day. Always follow the signs on site.</p>
    </form>
    <section class="plan-result" id="plan-result" aria-live="polite"></section>
  </div>`;
}

function row(ic, tone, title, body) {
  return `<li class="plan-row tone-${tone}"><span class="pr-ico">${icon(ic, 18)}</span><div><b>${title}</b><p>${body}</p></div></li>`;
}

function resultHTML(spot, fc) {
  const w = WINDOWS[sel.win];
  const acc = ACCESS[spot.id];
  const pub = spot.sources?.includes('PUB fishing page');
  const fresh = ['reservoir', 'pond', 'canal', 'river'].includes(spot.type);
  let verdict = 'go';
  let wxStop = false;
  const worse = (v) => { if (RANK[v] > RANK[verdict]) verdict = v; };
  const rows = [];

  // 1. Rules
  if (spot.status === 'excluded') { worse('no'); rows.push(row('ban', 'red', 'Fishing is not allowed here', esc(spot.note))); }
  else if (spot.status === 'check') { worse('care'); rows.push(row('help', 'amber', 'Not on the official lists', `${esc(spot.note)} Read the signs before you cast.`)); }
  else if (spot.status === 'paid') rows.push(row('ticket', 'teal', 'Paid pond — legal with a ticket', 'Pay at the counter and follow the pond’s own rules. Call ahead to confirm opening hours.'));
  else rows.push(row('checkCircle', 'teal', 'Listed on the official page', pub ? 'Fish only inside the zone marked by fishing-zone signs and blue railings. PUB: artificial bait only, no fly fishing.' : 'Fish only where there are no “No fishing” signs. NParks asks for micro-barb or barbless hooks at reservoirs and waterways.'));

  // 2. Weather
  if (!fc) rows.push(row('cloud', 'plain', 'Checking the NEA forecast…', '<span class="spinner"></span>'));
  else if (fc.passed) { worse('care'); rows.push(row('clock', 'amber', 'That time has passed today', 'Pick a later window or another day.')); }
  else if (fc.none) rows.push(row('cloud', 'plain', 'No forecast yet for that day', 'NEA forecasts cover the next 4 days. Check again closer to the trip.'));
  else {
    const risk = fishingRisk(fc.text);
    if (risk.level === 'stop') { worse('no'); wxStop = true; } else if (risk.level === 'caution') worse('care');
    rows.push(row(risk.icon, risk.tone, `${esc(fc.text)}${fc.temp?.high ? ` · ${fc.temp.low}–${fc.temp.high}°C` : ''}`, `${esc(risk.advice)} <span class="muted">${esc(fc.source)}${fc.when ? ` · ${esc(fc.when)}` : ''}</span>`));
    if (risk.level === 'stop') rows.push(row('bolt', 'red', 'Lightning: leave at 30 seconds', 'If the gap between flash and thunder is 30 seconds or less, get into a building or hard-top car. <a href="#/trainer/storm">Practise it in 3D</a>.'));
  }

  // 3. Heat, light and people
  if (sel.win === 'afternoon') rows.push(row('sun', 'amber', 'Hottest part of the day', 'UV is usually very high around midday. Bring at least 1.5 L of water, a hat and sunscreen, and take shade breaks.'));
  if (sel.win === 'dawn' || sel.win === 'night') rows.push(row('moon', 'plain', sel.win === 'dawn' ? 'Starting before sunrise' : 'Fishing after dark', 'Bring a headlamp, stay in lit, marked areas and tell someone where you are going.'));
  if (sel.kids) rows.push(row('users', 'plain', 'With children', `Keep them back from edges and use barbless hooks.${pub ? ' PUB says children must be accompanied by adults.' : ''}`));

  // 4. Tide
  if (COASTAL.includes(spot.type) && spot.status !== 'excluded') rows.push(row('tide', 'plain', 'Check the tide', 'Coastal fishing changes with the tide. Look up high and low times in the MPA tide table; jetty predators often feed in the last two hours of the rising tide. <a href="#/trainer/tide">Tide lesson</a>.'));

  // 5. Getting there
  if (acc) {
    const late = sel.win === 'night' && acc.walkMin > 25;
    rows.push(row('train', late ? 'amber' : 'plain', `${esc(acc.station)} ${acc.lrt ? 'LRT' : 'MRT'} (${acc.codes.join(' / ')}) · ${acc.walkKm} km walk, about ${acc.walkMin} min`, `${esc(acc.far || acc.entry || '')}${late ? ' It is a long walk back in the dark — consider a cab home.' : ''} <a href="#/map/${spot.id}">Step-by-step directions</a>.`));
  }

  const v = VERDICT[verdict];
  const alts = spot.status === 'excluded' || spot.status === 'check'
    ? SPOTS.filter((s) => (s.status === 'listed' || s.status === 'paid') && s.id !== spot.id)
      .map((s) => ({ s, km: distanceKm(spot.lat, spot.lng, s.lat, s.lng) })).sort((a, b) => a.km - b.km).slice(0, 3)
    : [];
  const bring = spot.status === 'excluded' ? [] : [...(fresh ? FRESH_BRING : SALT_BRING), ...(sel.win === 'afternoon' ? ['Hat & sunscreen'] : []), ...(sel.kids ? ['Barbless hooks', 'First-aid kit'] : [])];
  const fish = spot.species.map(getSpecies).filter(Boolean);
  const date = iso(dayDate(sel.day));

  return `
    <div class="plan-verdict tone-${v.tone}">
      <span class="pv-ico">${icon(v.icon, 30)}</span>
      <div>
        <p class="pv-k">${esc(dayName(sel.day))} · ${w.label} (${w.note}) · ${esc(spot.name)}</p>
        <h2 class="pv-word">${v.word}</h2>
        <p class="pv-sub">${v.sub}</p>
      </div>
      <div class="pv-badge">${spotBadge(spot.status)}<span class="small muted">${esc(SPOT_TYPES[spot.type] || spot.type)} · ${esc(spot.area)}</span></div>
    </div>
    <ul class="plan-rows">${rows.join('')}</ul>
    ${alts.length ? `<div class="plan-box"><h3>${icon('locations', 16)} Legal spots nearby</h3><div class="alt-list">${alts.map(({ s, km }) => `
      <button type="button" class="alt-row" data-alt="${s.id}"><span class="spot-dot" style="--pin:${SPOT_STATUS[s.status].color}"></span><span class="who"><b>${esc(s.name)}</b><span>${km.toFixed(1)} km away · ${esc(SPOT_TYPES[s.type] || s.type)}</span></span>${icon('chevronRight', 16)}</button>`).join('')}</div></div>` : ''}
    ${wxStop ? `<div class="plan-box"><h3>${icon('clock', 16)} Try another time</h3><div class="kit-items">${[[1, 'dawn'], [1, 'morning'], [1, 'evening'], [2, 'morning'], [2, 'evening']]
      .filter(([d, w]) => !(d === sel.day && w === sel.win)).map(([d, w]) => `<button type="button" class="plan-try" data-try="${d}|${w}">${esc(dayName(d))} ${WINDOWS[w].label.toLowerCase()}</button>`).join('')}</div></div>` : ''}
    <div class="plan-grid">
      ${bring.length ? `<div class="plan-box"><h3>${icon('bag', 16)} What to bring</h3><div class="kit-items">${bring.map((b) => `<span>${esc(b)}</span>`).join('')}</div>
        <a class="btn btn-ghost btn-sm" style="margin-top:.7rem" href="#/store?spot=${spot.id}">${icon('sparkles', 15)} Build the full kit in Gear Match</a></div>` : ''}
      ${fish.length ? `<div class="plan-box"><h3>${icon('fish', 16)} What you may catch</h3><div class="plan-fish">${fish.map((f) => `<a href="#/species/${f.id}"><img src="${esc(f.photo?.src || '')}" alt="" loading="lazy" /><span>${esc(f.name.split(' (')[0])}</span></a>`).join('')}</div></div>` : ''}
    </div>
    <div class="plan-actions">
      ${verdict !== 'no' ? `<button class="btn btn-primary" type="button" data-action="plan-trip" data-spot="${spot.id}" data-date="${date}">${icon('calendar', 16)} Save as a planned trip</button>` : ''}
      <a class="btn btn-secondary" href="#/map/${spot.id}">${icon('map', 16)} Open on the map</a>
      <a class="btn btn-ghost" href="#/weather">${icon('cloud', 16)} Weather lab</a>
    </div>`;
}

export function mount(root) {
  const form = root.querySelector('#plan-form');
  const out = root.querySelector('#plan-result');
  let token = 0;

  const update = async () => {
    const spot = getSpot(sel.spot) || SPOTS[0];
    const my = ++token;
    out.innerHTML = resultHTML(spot, null);
    const fc = await forecastFor(spot, sel.day, sel.win).catch(() => ({ none: true }));
    if (my !== token || !out.isConnected) return;
    out.innerHTML = resultHTML(spot, fc);
  };

  form.addEventListener('change', (e) => {
    if (e.target.id === 'pl-spot') sel.spot = e.target.value;
    if (e.target.id === 'pl-kids') sel.kids = e.target.checked;
    update();
  });
  form.addEventListener('click', (e) => {
    const d = e.target.closest('[data-day]');
    const w = e.target.closest('[data-win]');
    if (d) { sel.day = Number(d.dataset.day); form.querySelectorAll('[data-day]').forEach((b) => b.setAttribute('aria-pressed', String(b === d))); update(); }
    if (w) { sel.win = w.dataset.win; form.querySelectorAll('[data-win]').forEach((b) => b.setAttribute('aria-pressed', String(b === w))); update(); }
  });
  out.addEventListener('click', (e) => {
    const t = e.target.closest('[data-try]');
    if (t) {
      const [d, w] = t.dataset.try.split('|');
      sel.day = Number(d); sel.win = w;
      form.querySelectorAll('[data-day]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.day) === sel.day)));
      form.querySelectorAll('[data-win]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.win === sel.win)));
      update();
      return;
    }
    const a = e.target.closest('[data-alt]');
    if (!a) return;
    sel.spot = a.dataset.alt;
    form.querySelector('#pl-spot').value = sel.spot;
    update();
    root.querySelector('.plan-verdict')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  update();
}
