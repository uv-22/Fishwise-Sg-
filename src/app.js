/**
 * FishWise SG — app shell and hash router.
 *
 * Routes look like  #/<view>/<param>?<query>
 * Each view module exports render(ctx, param, query) → HTML and optionally
 * mount(root, ctx, param, query) → cleanup fn, and update(param, query) for
 * in-place changes (the map uses this so it is not rebuilt per spot).
 *
 * There is no login: the app opens straight to the dashboard. Data is saved
 * on the device and synced to Supabase by services/cloud.js.
 */

import { icon } from './icons.js';
import { esc, toast, confirmDialog, openModal, closeModal, initials, isModalOpen } from './ui.js';
import {
  ensureSeeded, getTrips, getProfile, saveProfile, addTrip, updateTrip, deleteTrip, getTrip, resetDemoData,
} from './store.js';
import { getPoints, getLearning, resetProgress } from './progress.js';
import { openTripForm } from './components.js';
import { POINTS } from './data/courses.js';
import { cloudConfigured } from './config.js';
import {
  initCloud, syncNow, cloudStatus, onCloudStatus, onCloudData, deviceId, useSyncCode, refreshShared,
} from './services/cloud.js';

import * as dashboard from './views/dashboard.js';
import * as trips from './views/trips.js';
import * as map from './views/map.js';
import * as academy from './views/academy.js';
import * as studio from './views/studio.js';
import * as fishid from './views/fishid.js';
import * as species from './views/species.js';
import * as weather from './views/weather.js';
import * as community from './views/community.js';
import * as events from './views/events.js';
import * as trainer from './views/trainer.js';

const VIEWS = { dashboard, trips, map, academy, studio, fishid, species, weather, community, events, trainer };

const NAV = [
  { group: 'Me', items: [['dashboard', 'Dashboard', 'dashboard'], ['trips', 'My trips', 'trips']] },
  { group: 'Explore', items: [['map', 'Spot map', 'map'], ['weather', 'Weather', 'cloud'], ['species', 'Species guide', 'fish']] },
  { group: 'Learn', items: [['academy', 'Academy', 'academy'], ['trainer', '3D lessons', 'cube'], ['studio', 'Lesson Studio', 'pen'], ['fishid', 'Fish ID', 'camera']] },
  { group: 'Community', items: [['community', 'Community', 'community'], ['events', 'Events', 'calendar']] },
];
const TITLES = Object.fromEntries(NAV.flatMap((g) => g.items.map(([k, l]) => [k, l])));
const MOBILE_NAV = [['dashboard', 'Home', 'home'], ['map', 'Map', 'map'], ['academy', 'Learn', 'academy'], ['trainer', '3D', 'cube']];

const app = document.getElementById('app');

let current = { name: null, param: null, cleanup: null, module: null };

/* ------------------------------------------------------------------
   Routing
   ------------------------------------------------------------------ */

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, qs = ''] = raw.split('?');
  const [name, param = null] = path.split('/').filter(Boolean);
  return { name: name || 'dashboard', param: param ? decodeURIComponent(param) : null, query: new URLSearchParams(qs) };
}

function navigate(hash) {
  if (location.hash === hash) renderView(true);
  else location.hash = hash;
}

function buildCtx() {
  return {
    profile: getProfile(),
    trips: getTrips() ?? [],
    points: getPoints(),
    learning: getLearning(),
    navigate,
    refresh: () => renderView(true),
    refreshChrome,
    toast,
    logTrip,
  };
}

/* ------------------------------------------------------------------
   Shell
   ------------------------------------------------------------------ */

function shellHTML() {
  return `
  <div class="shell">
    <aside class="sidebar" aria-label="Main navigation">
      <a class="brand" href="#/dashboard">
        <span class="brand-mark">${icon('fish', 19)}</span>
        <span><span class="brand-name">FishWise SG</span><span class="brand-tag">Prototype</span></span>
      </a>
      <nav class="nav" id="side-nav">
        ${NAV.map((g) => `
          <p class="nav-group">${g.group}</p>
          ${g.items.map(([k, l, ic]) => `<a class="nav-item" href="#/${k}" data-nav="${k}">${icon(ic, 18)}<span>${l}</span></a>`).join('')}`).join('')}
      </nav>
      <div class="sidebar-foot">
        <button class="sync-pill" type="button" data-action="settings" id="sync-pill"></button>
        <button class="sidebar-user" type="button" data-action="settings" id="side-user" aria-label="Profile and sync settings"></button>
      </div>
    </aside>

    <div class="main">
      <header class="topbar">
        <a class="brand" href="#/dashboard" style="padding:0">
          <span class="brand-mark" style="width:30px;height:30px">${icon('fish', 16)}</span>
          <span class="brand-name" style="color:var(--navy-900)">FishWise SG</span>
        </a>
        <span style="display:flex;gap:.4rem;align-items:center">
          <a class="points-chip" id="top-points" href="#/community/leaders"></a>
          <button class="btn-icon" type="button" data-action="settings" aria-label="Settings">${icon('settings', 18)}</button>
        </span>
      </header>
      <main id="main-content" class="content" tabindex="-1"></main>
    </div>

    <nav class="mobile-nav" aria-label="Main navigation">
      ${MOBILE_NAV.map(([k, l, ic]) => `<a href="#/${k}" data-nav="${k}">${icon(ic, 20)}<span>${l}</span></a>`).join('')}
      <button type="button" data-action="more-menu" aria-haspopup="dialog">${icon('more', 20)}<span>More</span></button>
    </nav>
  </div>`;
}

function syncLabel(s = cloudStatus()) {
  if (s.status === 'off') return { cls: 'is-off', ic: 'cloudOff', text: 'Saved on this device' };
  if (s.status === 'syncing') return { cls: 'is-busy', ic: 'refresh', text: 'Syncing…' };
  if (s.status === 'error') return { cls: 'is-error', ic: 'alert', text: 'Sync problem' };
  if (s.status === 'synced') return { cls: 'is-ok', ic: 'cloudSync', text: 'Synced to cloud' };
  return { cls: 'is-off', ic: 'cloud', text: 'Connecting…' };
}

function refreshChrome() {
  const profile = getProfile();
  const pts = getPoints();
  const user = document.getElementById('side-user');
  if (user) {
    user.innerHTML = `
      <span class="avatar">${esc(initials(profile.displayName))}</span>
      <span class="who"><b>${esc(profile.displayName)}</b><span>${pts.level.current.name} · ${pts.balance} pts</span></span>
      ${icon('settings', 15)}`;
  }
  const pill = document.getElementById('sync-pill');
  if (pill) {
    const l = syncLabel();
    pill.className = `sync-pill ${l.cls}`;
    pill.innerHTML = `${icon(l.ic, 14)}<span>${l.text}</span>`;
    pill.title = cloudStatus().error || '';
  }
  const top = document.getElementById('top-points');
  if (top) top.innerHTML = `${icon('star', 14)} ${pts.balance} pts`;
  const { name } = parseHash();
  document.querySelectorAll('[data-nav]').forEach((a) => {
    if (a.dataset.nav === name) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

/* ------------------------------------------------------------------
   Rendering
   ------------------------------------------------------------------ */

function route() {
  ensureSeeded();
  if (!document.getElementById('main-content')) {
    current = { name: null, param: null, cleanup: null, module: null };
    app.innerHTML = shellHTML();
  }
  renderView(false);
}

function renderView(forceFull) {
  const { name, param, query } = parseHash();
  const module = VIEWS[name];
  if (!module) {
    navigate('#/dashboard');
    return;
  }
  if (isModalOpen() && !forceFull) closeModal({ silent: true });

  if (!forceFull && current.name === name && module.update && current.param !== param) {
    current.param = param;
    module.update(param, query);
    refreshChrome();
    document.title = `${TITLES[name]} · FishWise SG`;
    return;
  }

  const sameRoute = current.name === name && current.param === param;
  const scrollY = forceFull && sameRoute ? window.scrollY : 0;

  if (current.cleanup) current.cleanup();
  const main = document.getElementById('main-content');
  const root = document.createElement('div');
  root.className = `view view-${name}`;
  const ctx = buildCtx();
  root.innerHTML = module.render(ctx, param, query);
  main.replaceChildren(root);
  current = { name, param, module, cleanup: module.mount ? module.mount(root, ctx, param, query) || null : null };

  refreshChrome();
  document.title = `${TITLES[name]} · FishWise SG`;
  window.scrollTo(0, scrollY);
  if (!sameRoute) {
    const h = root.querySelector('#page-title');
    (h || main).focus({ preventScroll: true });
  }
}

/** Re-render after cloud data arrives — but never under someone who is typing or in a 3D lesson. */
function refreshFromCloud(kind) {
  refreshChrome();
  if (isModalOpen()) return;
  const active = document.activeElement;
  if (active && active.matches?.('input, textarea, select') && document.getElementById('main-content')?.contains(active)) return;
  const { name, param } = parseHash();
  if (name === 'trainer' || name === 'map' || (name === 'studio' && param) || (name === 'academy' && param)) return;
  if (kind === 'shared' && !['community', 'events', 'academy', 'studio'].includes(name)) return;
  renderView(true);
}

/* ------------------------------------------------------------------
   Trip actions (used from several screens)
   ------------------------------------------------------------------ */

function logTrip({ spotId, status, species } = {}) {
  openTripForm({
    spotId,
    status,
    species,
    onSave(values) {
      const saved = addTrip(values);
      if (!saved) return toast('Could not save that trip.', 'alert');
      toast(saved.status === 'completed' ? `Trip logged · +${POINTS.trip} points` : 'Trip planned', 'checkCircle');
      renderView(true);
    },
  });
}

function editTrip(id, completing = false) {
  if (!getTrip(id)) return toast('That trip no longer exists.', 'alert');
  openTripForm({
    tripId: id,
    completing,
    onSave(values, tripId) {
      const saved = updateTrip(tripId, values);
      if (!saved) return toast('Could not save changes.', 'alert');
      toast(completing ? `Trip completed · +${POINTS.trip} points` : 'Trip updated', 'checkCircle');
      renderView(true);
    },
  });
}

function removeTrip(id) {
  const trip = getTrip(id);
  if (!trip) return;
  confirmDialog({
    title: 'Delete this trip?',
    body: `Your ${trip.status} trip to <strong>${esc(trip.location)}</strong> will be removed. Your statistics will update straight away. This cannot be undone.`,
    confirmLabel: 'Delete trip',
    onConfirm() {
      deleteTrip(id);
      toast('Trip deleted', 'trash');
      renderView(true);
    },
  });
}

/* ------------------------------------------------------------------
   Settings: profile, cloud sync, sync code, reset
   ------------------------------------------------------------------ */

function settings() {
  const s = cloudStatus();
  const l = syncLabel(s);
  const profile = getProfile();
  openModal({
    labelledBy: 'settings-title',
    html: `
    <div class="modal-head"><div><h2 id="settings-title">Profile & sync</h2><p>No account needed — your data lives on this device and syncs to the cloud.</p></div>
      <button class="btn-icon" type="button" data-close aria-label="Close">${icon('close', 18)}</button></div>
    <div class="modal-body settings-body">
      <form class="field" id="set-name-form" novalidate>
        <label for="set-name">Display name</label>
        <div class="inline-row">
          <input class="input" id="set-name" maxlength="40" value="${esc(profile.displayName)}" aria-describedby="set-name-err" />
          <button class="btn btn-secondary" type="submit">Save</button>
        </div>
        <span class="field-error" id="set-name-err">${icon('alert', 13)}<span>Enter a name between 1 and 40 characters.</span></span>
        <span class="hint">Shown on your community posts and published lessons.</span>
      </form>

      <section class="set-sec">
        <h3>Cloud sync</h3>
        <div class="sync-pill ${l.cls}" style="width:max-content">${icon(l.ic, 14)}<span>${l.text}</span></div>
        ${s.error ? `<p class="small" style="color:var(--red-700);margin-top:.4rem">${esc(s.error)}</p>` : ''}
        ${cloudConfigured()
          ? `<button class="btn btn-secondary btn-sm" type="button" id="set-sync" style="margin-top:.6rem">${icon('refresh', 14)} Sync now</button>`
          : '<p class="small muted" style="margin-top:.4rem">The Supabase anon key has not been added to <code>src/config.js</code> yet, so everything is saved on this device only.</p>'}
      </section>

      <section class="set-sec">
        <h3>Your sync code</h3>
        <p class="small muted">Use this code on another phone or computer to load the same trips, lessons and progress. Keep it private — anyone with it can see your data.</p>
        <div class="inline-row">
          <input class="input mono" id="set-code" value="${esc(deviceId())}" readonly aria-label="Your sync code" />
          <button class="btn btn-secondary" type="button" id="set-copy">${icon('copy', 15)} Copy</button>
        </div>
        <form id="set-use-form" class="field" style="margin-top:.8rem" novalidate>
          <label for="set-use">Load data from another device</label>
          <div class="inline-row">
            <input class="input mono" id="set-use" placeholder="Paste a sync code" autocomplete="off" />
            <button class="btn btn-primary" type="submit" ${cloudConfigured() ? '' : 'disabled'}>Load</button>
          </div>
          <span class="field-error" id="set-use-err">${icon('alert', 13)}<span></span></span>
        </form>
      </section>

      <section class="set-sec">
        <h3>Demo data</h3>
        <button class="btn btn-danger-quiet btn-sm" type="button" id="set-reset">${icon('refresh', 14)} Reset demo data</button>
      </section>
    </div>`,
    onMount(panel) {
      panel.querySelector('[data-close]').addEventListener('click', () => closeModal());
      panel.querySelector('#set-name-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const input = panel.querySelector('#set-name');
        const v = input.value.trim();
        const err = panel.querySelector('#set-name-err');
        if (!v || v.length > 40) {
          err.classList.add('is-shown');
          input.setAttribute('aria-invalid', 'true');
          return;
        }
        err.classList.remove('is-shown');
        input.removeAttribute('aria-invalid');
        saveProfile({ displayName: v });
        toast('Display name saved');
        refreshChrome();
      });
      panel.querySelector('#set-sync')?.addEventListener('click', async (e) => {
        e.currentTarget.disabled = true;
        await syncNow();
        closeModal({ silent: true });
        settings();
      });
      panel.querySelector('#set-copy').addEventListener('click', async () => {
        const code = panel.querySelector('#set-code');
        try {
          await navigator.clipboard.writeText(code.value);
        } catch {
          code.select();
          document.execCommand?.('copy');
        }
        toast('Sync code copied', 'copy');
      });
      panel.querySelector('#set-use-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const err = panel.querySelector('#set-use-err');
        const input = panel.querySelector('#set-use');
        if (input.value.trim().toLowerCase() === deviceId()) {
          err.querySelector('span').textContent = 'That is this device’s own code.';
          err.classList.add('is-shown');
          return;
        }
        try {
          await useSyncCode(input.value);
          closeModal({ silent: true });
          toast('Data loaded from your other device', 'cloudSync');
          renderView(true);
        } catch (ex) {
          err.querySelector('span').textContent = ex.message;
          err.classList.add('is-shown');
          input.setAttribute('aria-invalid', 'true');
        }
      });
      panel.querySelector('#set-reset').addEventListener('click', () => { closeModal({ silent: true }); resetDemo(); });
    },
  });
}

function moreMenu() {
  const items = NAV.flatMap((g) => g.items);
  openModal({
    labelledBy: 'more-title',
    html: `
    <div class="modal-head"><h2 id="more-title">All sections</h2>
      <button class="btn-icon" type="button" data-close aria-label="Close menu">${icon('close', 18)}</button></div>
    <div class="modal-body">
      <nav class="more-grid">
        ${items.map(([k, l, ic]) => `<a class="more-item" href="#/${k}">${icon(ic, 20)}<span>${l}</span></a>`).join('')}
      </nav>
      <div class="more-foot">
        <button class="btn btn-secondary btn-block" type="button" data-more="settings">${icon('settings', 16)} Profile & sync</button>
      </div>
    </div>`,
    onMount(panel) {
      panel.querySelector('[data-close]').addEventListener('click', () => closeModal());
      panel.querySelectorAll('.more-item').forEach((a) => a.addEventListener('click', () => closeModal({ silent: true })));
      panel.querySelector('[data-more="settings"]').addEventListener('click', () => { closeModal({ silent: true }); settings(); });
    },
  });
}

function resetDemo() {
  confirmDialog({
    title: 'Reset all demo data?',
    body: 'This replaces your trips and display name with the original sample data and clears lesson progress, notes, your Studio lessons, posts, bookings, rewards and identifications.',
    confirmLabel: 'Reset demo data',
    onConfirm() {
      resetDemoData();
      resetProgress();
      toast('Demo data reset', 'refresh');
      navigate('#/dashboard');
      renderView(true);
    },
  });
}

/* ------------------------------------------------------------------
   Global delegated actions
   ------------------------------------------------------------------ */

document.addEventListener('click', (event) => {
  if (event.target.closest('.skip-link')) {
    event.preventDefault();
    document.getElementById('main-content')?.focus();
    return;
  }
  const el = event.target.closest('[data-action]');
  if (!el || !app.contains(el)) return;
  const { action, id, spot, species: sp } = el.dataset;
  switch (action) {
    case 'log-trip': logTrip({ spotId: spot, species: sp ? [sp] : undefined }); break;
    case 'plan-trip': logTrip({ spotId: spot, status: 'planned' }); break;
    case 'edit-trip': editTrip(id); break;
    case 'complete-trip': editTrip(id, true); break;
    case 'delete-trip': removeTrip(id); break;
    case 'reset-demo': resetDemo(); break;
    case 'settings': settings(); break;
    case 'more-menu': moreMenu(); break;
    default: return;
  }
  event.preventDefault();
});

window.addEventListener('hashchange', route);
onCloudStatus(() => refreshChrome());
onCloudData((kind) => refreshFromCloud(kind));

route();
initCloud();
// Keep shared data (community, seats, lessons) fresh while the tab is open.
setInterval(() => {
  if (cloudConfigured() && document.visibilityState === 'visible') {
    refreshShared().then(() => refreshFromCloud('shared')).catch(() => {});
  }
}, 60000);
