/**
 * My trips — the personal fishing log, plus catch records by species.
 * "Tracking" here means a personal log, not live GPS.
 */

import { icon } from '../icons.js';
import { esc, parseDate, monthLabel, formatHours, plural, daysFromToday } from '../ui.js';
import { sortForList, completedTrips } from '../store.js';
import { pageHead, emptyState, speciesChips, getSpot, spotBadge } from '../components.js';
import { SPECIES } from '../data/species.js';

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
      <span class="stat-ico" style="width:32px;height:32px">${icon('fish', 15)}</span>
      <div class="row-main">
        <div class="row-title">${esc(r.s.name)}</div>
        <div class="row-meta"><span>${r.trips} ${plural(r.trips, 'trip')}</span><span>${esc(r.spots.slice(0, 2).join(', '))}${r.spots.length > 2 ? '…' : ''}</span></div>
      </div>
      ${icon('chevronRight', 17)}
    </a>`).join('')}</div>`;
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

  return `
  ${pageHead({
    eyebrow: 'Personal log',
    title: 'My trips',
    lede: 'Plan trips, record how they went and see which species you meet. Planned trips never count toward your statistics.',
    actions: `<button class="btn btn-primary" type="button" data-action="log-trip">${icon('plus', 16)} Log a trip</button>`,
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
  </div>`;
}

export function mount(root, ctx) {
  root.querySelectorAll('[data-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const f = btn.dataset.filter;
      ctx.navigate(f === 'all' ? '#/trips' : `#/trips?filter=${f}`);
    });
  });
}
