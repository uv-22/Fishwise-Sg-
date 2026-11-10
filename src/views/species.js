/**
 * Species guide — how to recognise, where to find, how to catch and
 * how to handle the fish beginners meet at Singapore's listed spots.
 */

import { icon } from '../icons.js';
import { esc } from '../ui.js';
import { SPECIES, getSpecies, DANGER } from '../data/species.js';
import { pageHead, getSpot, spotBadge, emptyState, fishPhoto, photoCredit } from '../components.js';

const WATER = { fresh: 'Freshwater', salt: 'Saltwater', brackish: 'Brackish & coastal' };
let filter = 'all';

function dangerBadge(level) {
  const d = DANGER[level];
  const cls = d.tone === 'red' ? 'badge-restricted' : d.tone === 'amber' ? 'badge-verify' : 'badge-designated';
  return `<span class="badge ${cls}">${icon(d.tone === 'teal' ? 'checkCircle' : 'alert', 12)} ${d.label}</span>`;
}

function list() {
  const shown = SPECIES.filter((s) => filter === 'all' || (filter === 'danger' ? s.danger === 'danger' : s.water === filter));
  return `
  ${pageHead({
    eyebrow: 'Species guide',
    title: 'Know your fish',
    lede: 'Real photos of the 12 fish you are most likely to meet in Singapore — how to recognise them, where they live, how to catch them and how to handle them safely.',
    actions: `<a class="btn btn-secondary" href="#/fishid">${icon('camera', 16)} Identify from a photo</a>`,
  })}
  <div class="toolbar">
    <div class="segmented" role="group" aria-label="Filter species">
      ${[['all', 'All'], ['fresh', 'Freshwater'], ['salt', 'Saltwater'], ['brackish', 'Coastal'], ['danger', 'Dangerous']].map(([k, l]) =>
        `<button class="seg" type="button" data-sp-filter="${k}" aria-pressed="${filter === k}">${l}</button>`).join('')}
    </div>
  </div>
  <div class="species-grid stagger reveal">
    ${shown.length ? shown.map((s) => `
      <a class="species-card" href="#/species/${s.id}" data-cursor="View fish">
        ${fishPhoto(s, { tag: WATER[s.water] })}
        <div>
          <h2>${esc(s.name)}</h2>
          <p class="sc-sci"><i>${esc(s.scientific)}</i></p>
        </div>
        <div class="badge-row">${dangerBadge(s.danger)}</div>
        <p class="small muted">${esc(s.looks)}</p>
        <span class="loc-open">Handling & where to find ${icon('arrowRight', 14)}</span>
      </a>`).join('') : emptyState({ title: 'No species in this filter', text: 'Try another filter.' })}
  </div>
  <p class="photo-credit" style="margin-top:1.5rem">Photos via Wikimedia Commons; credits on each species page. Where the guide covers a family, the photo shows one representative species.</p>`;
}

function detail(s) {
  const spots = s.spots.map(getSpot).filter(Boolean);
  return `
  <a class="btn btn-ghost btn-sm back-link" href="#/species">${icon('arrowLeft', 15)} All species</a>
  ${pageHead({ eyebrow: WATER[s.water], title: esc(s.name), lede: `<i>${esc(s.scientific)}</i> · ${esc(s.size)}` })}
  <div class="species-hero">
    <div>
      ${fishPhoto(s, { small: false, eager: true })}
      <p class="photo-credit">${photoCredit(s.photo)}${s.photo?.shows ? ` · Shows ${esc(s.photo.shows)}` : ''}</p>
    </div>
    <div>
      <div class="badge-row" style="margin-bottom:1rem">${dangerBadge(s.danger)}<span class="badge badge-planned">${WATER[s.water]}</span></div>
      <p class="sec-kicker">How to recognise it</p>
      <p style="font-size:1.05rem;line-height:1.7;color:var(--ink-2)">${esc(s.looks)}</p>
      <dl class="fod-facts">
        <div><dt>Size</dt><dd>${esc(s.size)}</dd></div>
        <div><dt>Handling</dt><dd>${esc(DANGER[s.danger].label)}</dd></div>
      </dl>
    </div>
  </div>
  <div class="species-detail">
    <section class="card card-pad">
      <h2 class="card-title">${icon('locations', 17)} Where to find it</h2>
      <p style="margin-top:.5rem">${esc(s.where)}</p>
      ${spots.length ? `<div class="alt-list" style="margin-top:.7rem">${spots.map((sp) => `
        <a class="alt-row" href="#/map/${sp.id}">
          <span class="who"><b>${esc(sp.name)}</b><span>${esc(sp.area)}</span></span>
          ${spotBadge(sp.status, true)} ${icon('chevronRight', 16)}
        </a>`).join('')}</div>` : ''}
    </section>
    <div class="dash-col">
      <section class="card card-pad">
        <h2 class="card-title">${icon('target', 17)} How to catch it</h2>
        <ul class="guide-list" style="margin-top:.7rem">${s.catchHow.map((c) => `<li>${icon('check', 14)}<span>${esc(c)}</span></li>`).join('')}</ul>
      </section>
      <section class="card card-pad handling-card tone-${DANGER[s.danger].tone}">
        <h2 class="card-title">${icon('hook', 17)} How to handle it</h2>
        <ul class="guide-list" style="margin-top:.7rem">${s.handling.map((h) => `<li>${icon(s.danger === 'safe' ? 'check' : 'alert', 14)}<span>${esc(h)}</span></li>`).join('')}</ul>
      </section>
      <button class="btn btn-primary" type="button" data-action="log-trip" data-species="${s.id}">${icon('plus', 16)} Log a catch of this species</button>
    </div>
  </div>
  <p class="small muted" style="margin-top:1rem">Handling advice is general safety guidance. If you are stung or spiked, seek medical help.</p>`;
}

export function render(ctx, param) {
  if (!param) return list();
  const s = getSpecies(param);
  if (!s) return `<a class="btn btn-ghost btn-sm back-link" href="#/species">${icon('arrowLeft', 15)} All species</a><div class="card">${emptyState({ iconName: 'help', title: 'Species not found', text: 'That link does not match a species in the guide.' })}</div>`;
  return detail(s);
}

export function mount(root, ctx) {
  root.querySelectorAll('[data-sp-filter]').forEach((b) => b.addEventListener('click', () => {
    filter = b.dataset.spFilter;
    ctx.refresh();
  }));
}
