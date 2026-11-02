/**
 * Weather & conditions — live NEA data from data.gov.sg, translated into
 * plain fishing advice for every listed spot.
 */

import { icon } from '../icons.js';
import { esc } from '../ui.js';
import { SPOTS } from '../data/spots.js';
import { pageHead, spotBadge } from '../components.js';
import { getTwoHour, getTwentyFour, getTemperatures, nearest, fishingRisk } from '../services/weather.js';

function time(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-SG', { hour: 'numeric', minute: '2-digit' });
}

export function render() {
  return `
  ${pageHead({
    eyebrow: 'Live conditions',
    title: 'Weather for fishing',
    lede: 'Live forecasts from the National Environment Agency via data.gov.sg, matched to each spot. Thunder means stop — a rod conducts lightning.',
    actions: `<button class="btn btn-secondary" type="button" id="wx-refresh">${icon('refresh', 16)} Refresh</button>`,
  })}
  <div id="wx-body">
    <div class="wx-grid">
      <div class="card card-pad skeleton-card"><span></span><span></span><span></span></div>
      <div class="card card-pad skeleton-card"><span></span><span></span><span></span></div>
    </div>
    <div class="card card-pad skeleton-card" style="margin-top:1rem"><span></span><span></span><span></span><span></span></div>
  </div>
  <p class="small muted" style="margin-top:1rem">Source: <a href="https://data.gov.sg/" target="_blank" rel="noopener noreferrer">data.gov.sg</a> (NEA). Tide times are not included — check a published tide table before coastal trips. Official warnings: <a href="https://www.weather.gov.sg/" target="_blank" rel="noopener noreferrer">weather.gov.sg</a>.</p>`;
}

export function mount(root, ctx) {
  root.querySelector('#wx-refresh').addEventListener('click', () => {
    try {
      Object.keys(sessionStorage).filter((k) => k.startsWith('fw.wx.')).forEach((k) => sessionStorage.removeItem(k));
    } catch { /* ignore */ }
    ctx.refresh();
  });
  load(root);
}

async function load(root) {
  const body = root.querySelector('#wx-body');
  const [two, day, temps] = await Promise.allSettled([getTwoHour(), getTwentyFour(), getTemperatures()]);
  if (!body.isConnected) return;

  if (two.status === 'rejected' && day.status === 'rejected') {
    body.innerHTML = `<div class="notice notice-amber">${icon('alert', 17)}<div><strong>Live weather is unavailable right now.</strong> ${esc(two.reason?.message || '')} Try Refresh in a few seconds, or check <a href="https://www.weather.gov.sg/" target="_blank" rel="noopener noreferrer">weather.gov.sg</a>.</div></div>`;
    return;
  }

  let dayHTML = '';
  if (day.status === 'fulfilled') {
    const g = day.value.general;
    const risk = fishingRisk(g.forecast?.text);
    dayHTML = `
    <section class="card card-pad wx-day tone-${risk.tone}">
      <p class="eyebrow">Next 24 hours · ${esc(g.validPeriod?.text || '')}</p>
      <div class="wx-big">${icon(risk.icon, 34)}<div><b>${esc(g.forecast?.text || '—')}</b><span>${g.temperature?.low ?? '–'}–${g.temperature?.high ?? '–'}°C · Humidity ${g.relativeHumidity?.low ?? '–'}–${g.relativeHumidity?.high ?? '–'}% · Wind ${esc(g.wind?.direction || '')} ${g.wind?.speed?.low ?? ''}–${g.wind?.speed?.high ?? ''} km/h</span></div></div>
      <p class="wx-advice">${esc(risk.advice)}</p>
      <div class="period-row">
        ${day.value.periods.slice(0, 3).map((p) => `
          <div class="period"><span class="small muted">${esc(p.timePeriod?.text || '')}</span>
            ${['north', 'south', 'east', 'west', 'central'].map((r) => `<span class="period-region"><b>${r[0].toUpperCase() + r.slice(1)}</b> ${esc(p.regions?.[r]?.text || '—')}</span>`).join('')}
          </div>`).join('')}
      </div>
    </section>`;
  }

  let tempHTML = '';
  if (temps.status === 'fulfilled') {
    const vals = temps.value.stations.map((s) => s.value);
    const avg = vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
    tempHTML = `
    <section class="card card-pad">
      <p class="eyebrow">Air temperature now · ${time(temps.value.at)}</p>
      <div class="wx-big">${icon('thermo', 34)}<div><b>${avg.toFixed(1)}°C average</b><span>${Math.min(...vals).toFixed(1)}–${Math.max(...vals).toFixed(1)}°C across ${vals.length} stations</span></div></div>
      <p class="wx-advice">${avg >= 31 ? 'Hot. Bring at least a litre of water per person, a hat and sun protection.' : 'Bring water and sun protection — it still adds up over a long session.'}</p>
    </section>`;
  }

  let spotsHTML = '';
  if (two.status === 'fulfilled') {
    const rows = SPOTS.filter((s) => s.status !== 'excluded').map((s) => {
      const area = nearest(two.value.areas, s.lat, s.lng);
      return { s, area, risk: fishingRisk(area.forecast) };
    });
    const order = { stop: 0, caution: 1, good: 2 };
    rows.sort((a, b) => order[a.risk.level] - order[b.risk.level] || a.s.name.localeCompare(b.s.name));
    const stops = rows.filter((r) => r.risk.level === 'stop').length;
    spotsHTML = `
    <section class="card" style="margin-top:1rem" aria-labelledby="spot-wx-title">
      <div class="card-head"><h2 id="spot-wx-title">Spot by spot · next 2 hours</h2><span class="sub">${esc(two.value.validText)}</span></div>
      ${stops ? `<div class="notice notice-red" style="margin:1rem 1.25rem 0">${icon('storm', 17)}<div><strong>${stops} spot${stops === 1 ? '' : 's'} under a thundery forecast.</strong> Do not fish there now.</div></div>` : ''}
      <div class="wx-table" role="table" aria-label="Forecast by spot">
        <div class="wx-tr wx-th" role="row"><span role="columnheader">Spot</span><span role="columnheader">Forecast</span><span role="columnheader">Advice</span></div>
        ${rows.map((r) => `
          <a class="wx-tr" role="row" href="#/map/${r.s.id}">
            <span role="cell"><b>${esc(r.s.name)}</b><span class="small muted">${esc(r.area.name)} area</span></span>
            <span role="cell" class="wx-cell tone-${r.risk.tone}">${icon(r.risk.icon, 16)} ${esc(r.area.forecast)}</span>
            <span role="cell">${spotBadge(r.s.status, true)} <span class="small">${esc(r.risk.label)}</span></span>
          </a>`).join('')}
      </div>
    </section>`;
  } else {
    spotsHTML = `<div class="notice notice-amber" style="margin-top:1rem">${icon('alert', 17)}<div>Spot-by-spot forecast unavailable: ${esc(two.reason?.message || 'try again shortly')}.</div></div>`;
  }

  body.innerHTML = `<div class="wx-grid">${dayHTML}${tempHTML}</div>${spotsHTML}`;
}
