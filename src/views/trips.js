/**
 * My trips — the personal fishing log, plus catch records by species.
 * "Tracking" here means a personal log, not live GPS.
 */

import { icon } from '../icons.js';
import { esc, parseDate, monthLabel, formatHours, plural, daysFromToday } from '../ui.js';
import { sortForList, completedTrips, getStats } from '../store.js';
import { pageHead, emptyState, speciesChips, getSpot, spotBadge, fishPhoto } from '../components.js';
import { SPECIES, photoSmall } from '../data/species.js';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'planned', label: 'Planned' },
  { id: 'completed', label: 'Completed' },
];

function tripCard(trip) {
  const d = parseDate(trip.date);
  const planned = trip.status === 'planned';
  const overdue = planned && daysFromToday(trip.date) < 0;
  const spot = trip.spotId ? getSpot(trip.spotId) : null;
  return `
  <article class="trip-card" aria-label="${esc(trip.location)}, ${esc(trip.date)}">
    <div class="trip-stamp ${planned ? 'is-planned' : ''}" aria-hidden="true">
      <div class="mon">${d ? monthLabel(d.getMonth()) : '—'}</div>
      <div class="day">${d ? d.getDate() : '?'}</div>
      <div class="yr">${d ? d.getFullYear() : ''}</div>
    </div>
    <div class="row-main">
      <div class="row-title">
        ${esc(trip.location)}
        <span class="badge ${planned ? 'badge-planned' : 'badge-completed'}">${planned ? icon('calendar', 12) + ' Planned' : icon('checkCircle', 12) + ' Completed'}</span>
        ${overdue ? `<span class="badge badge-verify">${icon('alert', 12)} Date passed</span>` : ''}
        ${spot ? spotBadge(spot.status, true) : ''}
        ${trip.isSeed ? '<span class="demo-chip">Sample</span>' : ''}
      </div>
      ${planned ? '' : `
      <dl class="metrics">
        <div class="metric"><dt>Duration</dt><dd>${formatHours(trip.durationHours)} h</dd></div>
        <div class="metric"><dt>Caught</dt><dd>${trip.fishCaught}</dd></div>
        <div class="metric"><dt>Released</dt><dd>${trip.fishReleased}</dd></div>
      </dl>`}
      ${trip.species?.length ? `<div class="chip-row">${speciesChips(trip.species)}</div>` : ''}
      ${trip.notes ? `<p class="row-note">${esc(trip.notes)}</p>` : ''}
      ${planned ? `<div class="next-trip-actions" style="margin-top:.6rem"><button class="btn btn-primary btn-sm" type="button" data-action="complete-trip" data-id="${trip.id}">${icon('check', 15)} Mark completed</button></div>` : ''}
    </div>
    <div class="row-actions">
      ${spot ? `<a class="btn-icon" href="#/map/${spot.id}" aria-label="Show ${esc(spot.name)} on map">${icon('map', 17)}</a>` : ''}
      <button class="btn-icon" type="button" data-action="edit-trip" data-id="${trip.id}" aria-label="Edit trip to ${esc(trip.location)}">${icon('edit', 17)}</button>
      <button class="btn-icon is-danger" type="button" data-action="delete-trip" data-id="${trip.id}" aria-label="Delete trip to ${esc(trip.location)}">${icon('trash', 17)}</button>
    </div>
  </article>`;
}

function catchRecords(trips) {
  const done = completedTrips(trips);
  const rows = SPECIES.map((s) => {
    const withIt = done.filter((t) => t.species?.includes(s.id));
    const spots = [...new Set(withIt.map((t) => t.location))];
    return { s, trips: withIt.length, spots, last: withIt.map((t) => t.date).sort().pop() };
  }).filter((r) => r.trips > 0).sort((a, b) => b.trips - a.trips);

  if (!rows.length) {
    return emptyState({ iconName: 'fish', title: 'No species recorded', text: 'Tick the species you caught when logging a completed trip.' });
  }
  return `<div class="row-list">${rows.map((r) => `
    <a class="row row-link" href="#/species/${r.s.id}">
      <img class="thumb" src="${photoSmall(r.s.photo)}" alt="" loading="lazy" />
      <div class="row-main">
        <div class="row-title">${esc(r.s.name)}</div>
        <div class="row-meta"><span>${r.trips} ${plural(r.trips, 'trip')}</span><span>${esc(r.spots.slice(0, 2).join(', '))}${r.spots.length > 2 ? '…' : ''}</span></div>
      </div>
      ${icon('chevronRight', 17)}
    </a>`).join('')}</div>`;
}

function collection(trips) {
  const done = completedTrips(trips);
  const counts = new Map();
  done.forEach((t) => (t.species || []).forEach((id) => counts.set(id, (counts.get(id) || 0) + 1)));
  const got = SPECIES.filter((s) => counts.has(s.id)).length;
  const pct = Math.round((got / SPECIES.length) * 100);
  return `
  <section class="sec" aria-labelledby="col-title">
    <div class="sec-head">
      <div><p class="sec-kicker">Your catch collection</p><h2 id="col-title">Every fish you can meet in Singapore — <em>${got} of ${SPECIES.length}</em> caught</h2>
      <p>Real photos of each species. Tick the species you caught when you log a trip and it lights up here.</p></div>
      <button class="btn btn-primary" type="button" data-action="log-trip">${icon('plus', 16)} Log a catch</button>
    </div>
    <div class="col-progress"><b>${pct}%</b><div class="meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="Species collected"><span style="width:${pct}%"></span></div></div>
    <div class="collection stagger reveal">
      ${SPECIES.map((s) => {
        const n = counts.get(s.id) || 0;
        return `
        <a class="col-card ${n ? 'is-caught' : 'is-locked'}" href="#/species/${s.id}" data-cursor="${n ? 'Your catch' : 'Not yet'}">
          <span class="cc-pill">${n ? `${icon('check', 11)} Caught` : 'Not yet'}</span>
          ${fishPhoto(s)}
          <b>${esc(s.name)}</b>
          <span class="cc-meta">${n ? `${n} ${plural(n, 'trip')}` : esc(s.water === 'fresh' ? 'Freshwater' : s.water === 'salt' ? 'Saltwater' : 'Coastal')}</span>
        </a>`;
      }).join('')}
    </div>
  </section>`;
}

export function render(ctx, param, query) {
  const filter = FILTERS.some((f) => f.id === query.get('filter')) ? query.get('filter') : 'all';
  const counts = {
    all: ctx.trips.length,
    planned: ctx.trips.filter((t) => t.status === 'planned').length,
    completed: ctx.trips.filter((t) => t.status === 'completed').length,
  };
  const list = sortForList(ctx.trips).filter((t) => filter === 'all' || t.status === filter);

  const emptyCopy = {
    all: ['No trips yet', 'Log a trip you have taken, or plan one at a listed spot.'],
    planned: ['No planned trips', 'Plan your next outing — pick a spot from the map.'],
    completed: ['No completed trips', 'When you get back from fishing, log it here. Zero catches still count.'],
  }[filter];

  const st = getStats(ctx.trips);
  const caught = new Set(completedTrips(ctx.trips).flatMap((t) => t.species || [])).size;
  return `
  ${pageHead({
    eyebrow: 'Personal log',
    title: 'My trips',
    lede: 'Plan trips, record how they went and build your catch collection. Planned trips never count toward your statistics.',
    extra: `
      <div class="trips-hero-stats" style="margin-top:1.6rem">
        <div class="ths"><b class="stat-value">${st.completedCount}</b><span>Trips done</span></div>
        <div class="ths"><b class="stat-value">${formatHours(st.totalHours)}</b><span>Hours fished</span></div>
        <div class="ths"><b class="stat-value">${st.fishCaught}</b><span>Fish caught</span></div>
        <div class="ths"><b class="stat-value">${caught}</b><span>Species</span></div>
      </div>`,
    actions: `<button class="btn btn-secondary" type="button" data-action="plan-trip">${icon('calendar', 16)} Plan a trip</button><button class="btn btn-primary" type="button" data-action="log-trip">${icon('plus', 16)} Log a trip</button>`,
  })}

  <div class="trips-layout">
    <section>
      <div class="toolbar">
        <div class="segmented" role="group" aria-label="Filter trips by status">
          ${FILTERS.map((f) => `<button class="seg" type="button" data-filter="${f.id}" aria-pressed="${f.id === filter}">${f.label}<span class="count">${counts[f.id]}</span></button>`).join('')}
        </div>
        <span class="muted small">${list.length} ${plural(list.length, 'trip')} shown</span>
      </div>
      <div class="card">
        ${list.length ? list.map(tripCard).join('') : emptyState({ iconName: 'calendar', title: emptyCopy[0], text: emptyCopy[1], action: `<button class="btn btn-primary btn-sm" type="button" data-action="${filter === 'planned' ? 'plan-trip' : 'log-trip'}">${icon('plus', 15)} ${filter === 'planned' ? 'Plan a trip' : 'Log a trip'}</button>` })}
      </div>
    </section>

    <aside class="card" aria-labelledby="records-title">
      <div class="card-head"><h2 id="records-title">Catch records</h2><span class="sub">By species</span></div>
      ${catchRecords(ctx.trips)}
    </aside>
  </div>
  ${collection(ctx.trips)}`;
}

export function mount(root, ctx) {
  root.querySelectorAll('[data-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const f = btn.dataset.filter;
      ctx.navigate(f === 'all' ? '#/trips' : `#/trips?filter=${f}`);
    });
  });
}
