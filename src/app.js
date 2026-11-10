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
import { initFx, enter, leave, placeIndicators, finishBoot } from './fx.js';

import * as dashboard from './views/dashboard.js';
import * as trips from './views/trips.js';
import * as map from './views/map.js';
import * as academy from './views/academy.js';
import * as store from './views/store.js';
import * as fishid from './views/fishid.js';
import * as species from './views/species.js';
import * as weather from './views/weather.js';
import * as community from './views/community.js';
import * as events from './views/events.js';
import * as trainer from './views/trainer.js';
import * as plan from './views/planner.js';

const VIEWS = { dashboard, trips, plan, map, academy, store, fishid, species, weather, community, events, trainer };

const NAV = [
  { group: 'Me', items: [['dashboard', 'Dashboard', 'dashboard'], ['trips', 'My trips', 'trips'], ['plan', 'Should I go?', 'route']] },
  { group: 'Explore', items: [['map', 'Spot map', 'map'], ['weather', 'Weather lab', 'cloud'], ['species', 'Species guide', 'fish']] },
  { group: 'Learn', items: [['academy', 'Academy', 'academy'], ['trainer', '3D lessons', 'cube'], ['fishid', 'Fish ID', 'camera']] },
  { group: 'Gear', items: [['store', 'Gear Match & advisor', 'bag']] },
  { group: 'Community', items: [['community', 'Community', 'community'], ['events', 'Events', 'calendar']] },
];
const TITLES = Object.fromEntries(NAV.flatMap((g) => g.items.map(([k, l]) => [k, l])));
const TOP_LINKS = [['dashboard', 'Dashboard'], ['trips', 'My trips'], ['map', 'Spot map'], ['store', 'Gear Match']];
const TOP_GROUPS = [
  { id: 'learn', label: 'Learn', items: [
    ['academy', 'Academy', 'academy', '22 lessons across three tracks'],
    ['trainer', '3D lessons', 'cube', 'Knots, casting, rigs, tides, lightning and more'],
    ['fishid', 'Fish ID', 'camera', 'Identify a catch from a photo'],
  ] },
  { id: 'explore', label: 'Explore', items: [
    ['plan', 'Should I go?', 'route', 'One answer for a spot and time: rules, weather, gear'],
    ['weather', 'Weather lab', 'cloud', 'Live wind, rain and heat maps with advice'],
    ['species', 'Species guide', 'fish', '12 local fish with real photos'],
  ] },
  { id: 'community', label: 'Community', items: [
    ['community', 'Community', 'community', 'Questions, answers and rewards'],
    ['events', 'Events', 'calendar', 'FishWise Local sessions, gear provided'],
  ] },
];
const PUB_URL = 'https://www.pub.gov.sg/Public/Places-of-Interest/Our-Reservoirs-and-Waterways/ABC-Waters/PUB-Fishing';

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

function brandHTML(id = '') {
  return `<a class="brand" href="#/dashboard" aria-label="FishWise SG home"${id}>
    <span class="brand-mark">${icon('fish', 18)}</span><span class="brand-name">FishWise<span>SG</span></span></a>`;
}

function shellHTML() {
  return `
  <div class="scroll-prog" aria-hidden="true"></div>
  <header class="site-header" id="site-header">
    <div class="sh-inner">
      ${brandHTML()}
      <nav class="topnav" id="top-nav" aria-label="Main navigation">
        <span class="tn-ind" aria-hidden="true"></span>
        ${TOP_LINKS.map(([k, l]) => `<a class="tn-link" href="#/${k}" data-nav="${k}">${l}</a>`).join('')}
        ${TOP_GROUPS.map((g) => `
        <div class="tn-group" data-navs="${g.items.map((i) => i[0]).join(' ')}">
          <button class="tn-link tn-trigger" type="button" aria-expanded="false" aria-controls="tn-${g.id}">${g.label} ${icon('chevronDown', 14)}</button>
          <div class="tn-menu" id="tn-${g.id}">
            ${g.items.map(([k, l, ic, d]) => `
            <a class="tn-item" href="#/${k}" data-nav="${k}"><span class="ico">${icon(ic, 18)}</span><span><b>${l}</b><span>${d}</span></span></a>`).join('')}
          </div>
        </div>`).join('')}
      </nav>
      <div class="sh-actions">
        <button class="sync-dot" type="button" data-action="settings" id="sync-pill"></button>
        <a class="points-chip" id="top-points" href="#/community/leaders"></a>
        <button class="btn btn-primary btn-sm sh-log" type="button" data-action="log-trip" aria-label="Log a trip">${icon('plus', 15)}<span>Log trip</span></button>
        <button class="avatar-btn" type="button" data-action="settings" id="side-user" aria-label="Profile and sync settings"></button>
        <button class="menu-btn" type="button" data-action="more-menu" aria-label="Open menu" aria-haspopup="dialog">${icon('menu', 22)}</button>
      </div>
    </div>
  </header>
  <main id="main-content" class="content" tabindex="-1"></main>
  ${footerHTML()}
  <nav class="tabbar" aria-label="Quick navigation">
    <a href="#/dashboard" data-nav="dashboard">${icon('home', 20)}<span>Home</span></a>
    <a href="#/map" data-nav="map">${icon('map', 20)}<span>Map</span></a>
    <a href="#/plan" data-nav="plan" class="tb-main">${icon('route', 22)}<span>Go?</span></a>
    <a href="#/store" data-nav="store">${icon('bag', 20)}<span>Gear</span></a>
    <button type="button" data-action="more-menu" aria-haspopup="dialog">${icon('menu', 20)}<span>More</span></button>
  </nav>`;
}

function footerHTML() {
  const col = (title, links) => `
    <div class="sf-col"><p>${title}</p>${links.map(([h, l, ext]) => `<a href="${h}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ''}>${l}</a>`).join('')}</div>`;
  return `
  <footer class="site-footer">
    <div class="sf-inner">
      <div class="sf-brand">${brandHTML()}
        <p>Singapore's casual-fishing companion: where you may fish, how to fish well, and a record of every trip.</p>
      </div>
      ${col('Explore', [['#/map', 'Spot map'], ['#/weather', 'Weather lab'], ['#/species', 'Species guide']])}
      ${col('Learn', [['#/academy', 'Academy'], ['#/trainer', '3D lessons'], ['#/fishid', 'Fish ID'], ['#/store', 'Gear Match']])}
      ${col('Community', [['#/community', 'Community'], ['#/events', 'Events'], ['#/community/leaders', 'Leaderboard']])}
      ${col('Official rules', [[PUB_URL, 'PUB fishing', 1], ['https://www.nparks.gov.sg/visit/activities/fishing', 'NParks fishing', 1], ['https://data.gov.sg', 'data.gov.sg', 1]])}
    </div>
    <div class="sf-base">
      <span>&copy; 2026 FishWise SG · University project prototype · Not affiliated with PUB or NParks</span>
      <span>Imagery Esri · Map data &copy; OpenStreetMap · Weather NEA</span>
    </div>
  </footer>`;
}

/* Top navigation dropdowns: hover on desktop, click anywhere. */
function initTopNav() {
  const nav = document.getElementById('top-nav');
  if (!nav) return;
  const groups = [...nav.querySelectorAll('.tn-group')];
  const setOpen = (g, open) => {
    g.classList.toggle('is-open', open);
    g.querySelector('.tn-trigger').setAttribute('aria-expanded', String(open));
  };
  const closeAll = (except) => groups.forEach((g) => { if (g !== except) setOpen(g, false); });
  const hover = matchMedia('(hover: hover)');
  groups.forEach((g) => {
    let t = 0;
    g.querySelector('.tn-trigger').addEventListener('click', () => { closeAll(g); setOpen(g, !g.classList.contains('is-open')); });
    g.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'mouse' || !hover.matches) return; clearTimeout(t); closeAll(g); setOpen(g, true); });
    g.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'mouse') return; t = setTimeout(() => setOpen(g, false), 140); });
    g.addEventListener('click', (e) => { if (e.target.closest('.tn-item')) setOpen(g, false); });
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('.tn-group')) closeAll(); });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const open = groups.find((g) => g.classList.contains('is-open'));
    if (open) { setOpen(open, false); open.querySelector('.tn-trigger').focus(); }
  });
  window.addEventListener('hashchange', () => closeAll());
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
    user.innerHTML = `<span class="avatar">${esc(initials(profile.displayName))}</span>`;
    user.title = `${profile.displayName} · ${pts.level.current.name} · ${pts.balance} pts`;
  }
  const pill = document.getElementById('sync-pill');
  if (pill) {
    const l = syncLabel();
    pill.className = `sync-dot ${l.cls}`;
    pill.innerHTML = `<i></i><span>${l.text}</span>`;
    pill.title = cloudStatus().error || l.text;
  }
  const top = document.getElementById('top-points');
  if (top) top.innerHTML = `${icon('star', 14)} ${pts.balance} pts`;
  const { name } = parseHash();
  document.querySelectorAll('[data-nav]').forEach((a) => {
    if (a.dataset.nav === name) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  document.querySelectorAll('.tn-group').forEach((g) => g.classList.toggle('is-active', g.dataset.navs.split(' ').includes(name)));
  placeIndicators();
}

/* ------------------------------------------------------------------
   Rendering
   ------------------------------------------------------------------ */

let leaveTimer = 0;

function route() {
  ensureSeeded();
  clearTimeout(leaveTimer);
  if (!document.getElementById('main-content')) {
    current = { name: null, param: null, cleanup: null, module: null };
    app.innerHTML = shellHTML();
    initTopNav();
    renderView(false);
    return;
  }
  // Play a short exit on the old page before swapping in the new one.
  const { name, param } = parseHash();
  const inPlace = current.name === name && VIEWS[name]?.update && current.param !== param;
  const changing = current.name && (current.name !== name || current.param !== param);
  const view = document.getElementById('main-content').firstElementChild;
  const ms = !inPlace && changing && VIEWS[name] ? leave(view) : 0;
  if (ms) {
    refreshChrome();
    leaveTimer = setTimeout(() => renderView(false), ms);
  } else renderView(false);
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
  document.body.dataset.view = name;
  const ctx = buildCtx();
  root.innerHTML = module.render(ctx, param, query);
  main.replaceChildren(root);
  current = { name, param, module, cleanup: module.mount ? module.mount(root, ctx, param, query) || null : null };
  enter(root, { animate: !(forceFull && sameRoute) });

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
  if (name === 'trainer' || name === 'map' || name === 'store' || (name === 'academy' && param)) return;
  if (kind === 'shared' && !['community', 'events', 'academy'].includes(name)) return;
  renderView(true);
}

/* ------------------------------------------------------------------
   Trip actions (used from several screens)
   ------------------------------------------------------------------ */

function logTrip({ spotId, status, species, date } = {}) {
  openTripForm({
    spotId,
    status,
    species,
    date,
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
  const { name } = parseHash();
  let i = 0;
  openModal({
    labelledBy: 'mm-title',
    html: `
    <div class="mm-head">
      <span class="brand"><span class="brand-mark">${icon('fish', 18)}</span><span class="brand-name" id="mm-title">FishWise<span>SG</span></span></span>
      <button class="btn-icon" type="button" data-close aria-label="Close menu">${icon('close', 22)}</button>
    </div>
    <nav class="mm-nav" aria-label="All sections">
      ${NAV.map((g) => `<p class="mm-group">${g.group}</p>${g.items.map(([k, l, ic]) => `
        <a class="mm-link" href="#/${k}" style="--i:${i++}"${k === name ? ' aria-current="page"' : ''}>${icon(ic, 20)}<span>${l}</span>${icon('chevronRight', 18)}</a>`).join('')}`).join('')}
    </nav>
    <div class="mm-foot">
      <button class="btn btn-secondary" type="button" data-more="settings">${icon('settings', 16)} Profile & sync</button>
      <button class="btn btn-primary" type="button" data-more="log">${icon('plus', 16)} Log a trip</button>
    </div>`,
    onMount(panel) {
      panel.classList.add('is-menu');
      panel.parentElement.classList.add('is-menu-overlay');
      panel.querySelector('[data-close]').addEventListener('click', () => closeModal());
      panel.querySelectorAll('.mm-link').forEach((a) => a.addEventListener('click', () => closeModal({ silent: true })));
      panel.querySelector('[data-more="settings"]').addEventListener('click', () => { closeModal({ silent: true }); settings(); });
      panel.querySelector('[data-more="log"]').addEventListener('click', () => { closeModal({ silent: true }); logTrip(); });
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
  const { action, id, spot, species: sp, date } = el.dataset;
  switch (action) {
    case 'log-trip': logTrip({ spotId: spot, species: sp ? [sp] : undefined }); break;
    case 'plan-trip': logTrip({ spotId: spot, status: 'planned', date }); break;
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

initFx();
route();
finishBoot();
initCloud();
// Keep shared data (community, seats, lessons) fresh while the tab is open.
setInterval(() => {
  if (cloudConfigured() && document.visibilityState === 'visible') {
    refreshShared().then(() => refreshFromCloud('shared')).catch(() => {});
  }
}, 60000);
