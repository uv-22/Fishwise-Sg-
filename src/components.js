/**
 * Reusable UI pieces shared by several screens.
 */

import { icon } from './icons.js';
import { esc, openModal, closeModal, todayISO, formatDateShort } from './ui.js';
import { validateTrip, getTrip } from './store.js';
import { SPOTS } from './data/spots.js';
import { SPECIES, getSpecies } from './data/species.js';

/* ------------------------------------------------------------------
   Spot status
   ------------------------------------------------------------------ */

export const SPOT_STATUS = {
  listed: { label: 'Listed on official page', short: 'Listed', badge: 'badge-designated', icon: 'checkCircle', color: '#0F7A76' },
  check: { label: 'Check before fishing', short: 'Check first', badge: 'badge-verify', icon: 'help', color: '#B45309' },
  excluded: { label: 'Fishing not allowed', short: 'Not allowed', badge: 'badge-restricted', icon: 'ban', color: '#B42318' },
};

export const SPOT_TYPES = {
  jetty: 'Jetty',
  beach: 'Beach',
  reservoir: 'Reservoir',
  canal: 'Canal',
  river: 'River',
  pond: 'Pond',
  island: 'Island coast',
  wetland: 'Wetland',
};

export function spotBadge(status, short = false) {
  const s = SPOT_STATUS[status] || SPOT_STATUS.check;
  return `<span class="badge ${s.badge}">${icon(s.icon, 13)} ${short ? s.short : s.label}</span>`;
}

export function getSpot(id) {
  return SPOTS.find((s) => s.id === id) || null;
}

/* ------------------------------------------------------------------
   Layout helpers
   ------------------------------------------------------------------ */

export function pageHead({ eyebrow, title, lede, actions = '' }) {
  return `
  <header class="page-head">
    <div>
      ${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ''}
      <h1 id="page-title" tabindex="-1">${title}</h1>
      ${lede ? `<p class="lede">${lede}</p>` : ''}
    </div>
    ${actions ? `<div class="head-actions">${actions}</div>` : ''}
  </header>`;
}

export function emptyState({ iconName = 'empty', title, text, action = '' }) {
  return `
  <div class="empty">
    <span class="empty-ico">${icon(iconName, 20)}</span>
    <h3>${esc(title)}</h3>
    <p>${text}</p>
    ${action}
  </div>`;
}

export function sampleChip(label = 'Sample') {
  return `<span class="demo-chip">${esc(label)}</span>`;
}

export function speciesChips(ids) {
  return ids
    .map((id) => getSpecies(id))
    .filter(Boolean)
    .map((s) => `<a class="chip" href="#/species/${s.id}">${icon('fish', 12)} ${esc(s.name)}</a>`)
    .join('');
}

/** Render lesson body blocks ({p}, {h}, {list}, {steps}, {tip}, {warn}) as safe HTML. */
export function renderLessonBlocks(body) {
  return (body || []).map((b) => {
    if (b.h) return `<h2>${esc(b.h)}</h2>`;
    if (b.p) return `<p>${esc(b.p)}</p>`;
    if (b.list) return `<ul>${b.list.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
    if (b.steps) return `<ol class="steps">${b.steps.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>`;
    if (b.tip) return `<div class="notice notice-teal">${icon('info', 16)}<div><strong>Tip.</strong> ${esc(b.tip)}</div></div>`;
    if (b.warn) return `<div class="notice notice-amber">${icon('alert', 16)}<div>${esc(b.warn)}</div></div>`;
    return '';
  }).join('');
}

export function photoCredit(photo) {
  if (!photo) return '';
  return `Photo: <a href="${esc(photo.page)}" target="_blank" rel="noopener noreferrer">${esc(photo.author)}</a>, ${esc(photo.license)}, via Wikimedia Commons`;
}

/* ------------------------------------------------------------------
   Trip form modal
   ------------------------------------------------------------------ */

function spotOptions(selectedId) {
  const groups = { listed: [], check: [] };
  for (const s of SPOTS) if (groups[s.status]) groups[s.status].push(s);
  const opt = (s) => `<option value="${s.id}" ${s.id === selectedId ? 'selected' : ''}>${esc(s.name)}</option>`;
  return `
    <option value="">Choose a spot…</option>
    <optgroup label="Listed on PUB / NParks pages">${groups.listed.map(opt).join('')}</optgroup>
    <optgroup label="Check before fishing">${groups.check.map(opt).join('')}</optgroup>
    <option value="__other" ${selectedId === '__other' ? 'selected' : ''}>Somewhere else…</option>`;
}

const FIELD_IDS = ['spot', 'location', 'date', 'status', 'durationHours', 'fishCaught', 'fishReleased', 'notes'];

/**
 * Open the add / edit trip form.
 * @param {object} opts
 * @param {string} [opts.tripId]     edit an existing trip
 * @param {string} [opts.spotId]     preselect a spot
 * @param {'planned'|'completed'} [opts.status]
 * @param {boolean} [opts.completing] open an existing planned trip to mark it complete
 * @param {string[]} [opts.species]  preselect species (e.g. from Fish ID)
 * @param {(values, tripId) => void} opts.onSave
 */
export function openTripForm({ tripId, spotId, status, species, completing = false, onSave }) {
  const existing = tripId ? getTrip(tripId) : null;
  const trip = existing
    ? { ...existing, status: completing ? 'completed' : existing.status }
    : { spotId: spotId || '', location: '', date: todayISO(), status: status || 'completed', durationHours: '', fishCaught: species?.length ? '1' : '', fishReleased: '', species: species || [], notes: '' };

  const knownSpot = trip.spotId && getSpot(trip.spotId);
  const selected = knownSpot ? trip.spotId : (existing ? '__other' : (trip.spotId || ''));
  const title = completing ? 'Complete your trip' : existing ? 'Edit trip' : 'Log a trip';
  const sub = completing
    ? 'Add how it went. Zero catches is a perfectly good answer.'
    : 'Planned trips need a place and a date. Completed trips also need duration and catch.';

  const val = (v) => (v === null || v === undefined ? '' : esc(v));

  openModal({
    labelledBy: 'trip-form-title',
    html: `
    <div class="modal-head">
      <div>
        <h2 id="trip-form-title">${title}</h2>
        <p>${sub}</p>
      </div>
      <button class="btn-icon" type="button" data-close aria-label="Close dialog">${icon('close', 18)}</button>
    </div>
    <form id="trip-form" novalidate>
      <div class="modal-body">
        <div class="form-summary" id="trip-form-summary" role="alert">
          ${icon('alert', 17)}<div><strong>Please fix the highlighted fields.</strong></div>
        </div>

        <div class="form-grid">
          <div class="field span-2">
            <label for="f-spot">Spot <span class="req" aria-hidden="true">*</span></label>
            <select class="select" id="f-spot" name="spotId" aria-describedby="err-spot" ${completing ? '' : 'data-autofocus'}>${spotOptions(selected)}</select>
            <span class="field-error" id="err-spot">${icon('alert', 13)}<span></span></span>
          </div>

          <div class="field span-2" id="f-location-wrap" ${selected === '__other' ? '' : 'hidden'}>
            <label for="f-location">Location name <span class="req" aria-hidden="true">*</span></label>
            <input class="input" id="f-location" name="location" maxlength="80" value="${selected === '__other' ? val(trip.location) : ''}" aria-describedby="err-location" placeholder="e.g. Friend's boat, Batam trip" />
            <span class="hint">Only fish where it is permitted. Check the official pages if unsure.</span>
            <span class="field-error" id="err-location">${icon('alert', 13)}<span></span></span>
          </div>

          <div class="field">
            <label for="f-date">Date <span class="req" aria-hidden="true">*</span></label>
            <input class="input" type="date" id="f-date" name="date" value="${val(trip.date)}" aria-describedby="err-date" />
            <span class="field-error" id="err-date">${icon('alert', 13)}<span></span></span>
          </div>

          <fieldset class="field" style="border:0;padding:0;margin:0">
            <legend class="field-label">Status <span class="req" aria-hidden="true">*</span></legend>
            <div class="radio-row" style="margin-top:.32rem">
              <label class="radio-card"><input type="radio" name="status" value="planned" ${trip.status === 'planned' ? 'checked' : ''} ${completing ? 'disabled' : ''} /><span><b>Planned</b><span>Upcoming</span></span></label>
              <label class="radio-card"><input type="radio" name="status" value="completed" ${trip.status === 'completed' ? 'checked' : ''} /><span><b>Completed</b><span>Already went</span></span></label>
            </div>
            <span class="field-error" id="err-status">${icon('alert', 13)}<span></span></span>
          </fieldset>

          <div class="span-2 completed-only form-grid" style="grid-template-columns:repeat(3,1fr)">
            <div class="field">
              <label for="f-duration">Hours <span class="req" aria-hidden="true">*</span></label>
              <input class="input" id="f-duration" name="durationHours" inputmode="decimal" value="${val(trip.durationHours)}" placeholder="2.5" aria-describedby="err-durationHours" ${completing ? 'data-autofocus' : ''} />
              <span class="field-error" id="err-durationHours">${icon('alert', 13)}<span></span></span>
            </div>
            <div class="field">
              <label for="f-caught">Fish caught <span class="req" aria-hidden="true">*</span></label>
              <input class="input" id="f-caught" name="fishCaught" inputmode="numeric" value="${val(trip.fishCaught)}" placeholder="0" aria-describedby="err-fishCaught" />
              <span class="field-error" id="err-fishCaught">${icon('alert', 13)}<span></span></span>
            </div>
            <div class="field">
              <label for="f-released">Released <span class="req" aria-hidden="true">*</span></label>
              <input class="input" id="f-released" name="fishReleased" inputmode="numeric" value="${val(trip.fishReleased)}" placeholder="0" aria-describedby="err-fishReleased" />
              <span class="field-error" id="err-fishReleased">${icon('alert', 13)}<span></span></span>
            </div>
          </div>

          <fieldset class="field span-2 species-field" style="border:0;padding:0;margin:0">
            <legend class="field-label">Species caught <span class="opt">(optional)</span></legend>
            <div class="chip-picker">
              ${SPECIES.map((s) => `<label class="chip-check"><input type="checkbox" name="species" value="${s.id}" ${trip.species?.includes(s.id) ? 'checked' : ''} /><span>${esc(s.name)}</span></label>`).join('')}
            </div>
          </fieldset>

          <div class="field span-2">
            <label for="f-notes">Notes <span class="opt">(optional)</span></label>
            <textarea class="textarea" id="f-notes" name="notes" maxlength="300" aria-describedby="err-notes" placeholder="Conditions, what worked, who you went with">${val(trip.notes)}</textarea>
            <span class="field-error" id="err-notes">${icon('alert', 13)}<span></span></span>
          </div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-secondary" type="button" data-close>Cancel</button>
        <button class="btn btn-primary" type="submit">${icon('check', 16)} ${completing ? 'Mark completed' : existing ? 'Save changes' : 'Save trip'}</button>
      </div>
    </form>`,
    onMount(panel) {
      const form = panel.querySelector('#trip-form');
      const spotSel = form.querySelector('#f-spot');
      const locWrap = form.querySelector('#f-location-wrap');
      const completedOnly = form.querySelector('.completed-only');
      const speciesField = form.querySelector('.species-field');

      const statusValue = () => form.querySelector('input[name="status"]:checked')?.value;

      const sync = () => {
        locWrap.hidden = spotSel.value !== '__other';
        const done = statusValue() === 'completed';
        completedOnly.hidden = !done;
        const caught = Number(form.fishCaught.value);
        speciesField.hidden = !done || !(caught > 0);
      };
      sync();
      spotSel.addEventListener('change', sync);
      form.addEventListener('change', sync);
      form.fishCaught.addEventListener('input', sync);

      panel.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => closeModal()));

      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const spotId = spotSel.value;
        const spot = getSpot(spotId);
        const input = {
          spotId: spot ? spotId : null,
          location: spot ? spot.name : spotId === '__other' ? form.location.value : '',
          date: form.date.value,
          status: completing ? 'completed' : statusValue(),
          durationHours: form.durationHours.value,
          fishCaught: form.fishCaught.value,
          fishReleased: form.fishReleased.value,
          species: [...form.querySelectorAll('input[name="species"]:checked')].map((c) => c.value),
          notes: form.notes.value,
        };
        const { errors, values } = validateTrip(input);

        if (!spotId) {
          delete errors.location;
          errors.spot = 'Choose a spot, or pick “Somewhere else…” and type a name.';
        }

        for (const key of FIELD_IDS) {
          const err = panel.querySelector(`#err-${key}`);
          const field = key === 'spot' ? spotSel : form.elements[key];
          if (!err) continue;
          if (errors[key]) {
            err.querySelector('span').textContent = errors[key];
            err.classList.add('is-shown');
            if (field && field.setAttribute) field.setAttribute('aria-invalid', 'true');
          } else {
            err.classList.remove('is-shown');
            if (field && field.removeAttribute) field.removeAttribute('aria-invalid');
          }
        }

        const summary = panel.querySelector('#trip-form-summary');
        if (Object.keys(errors).length) {
          summary.classList.add('is-shown');
          const first = panel.querySelector('[aria-invalid="true"]');
          if (first) first.focus();
          return;
        }
        summary.classList.remove('is-shown');
        closeModal({ silent: true });
        onSave(values, existing ? existing.id : null);
      });
    },
  });
}

export function tripSummaryLine(trip) {
  if (trip.status === 'planned') return `Planned for ${formatDateShort(trip.date)}`;
  return `${trip.durationHours} h · ${trip.fishCaught} caught · ${trip.fishReleased} released`;
}
