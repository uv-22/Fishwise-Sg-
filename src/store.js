/**
 * Demo data store.
 *
 * Everything is saved in localStorage first, so the app works offline.
 * services/cloud.js mirrors these keys to Supabase when it is configured:
 *
 *   fishwise.profile  — display name
 *   fishwise.trips    — the fishing log
 *
 * Anything unreadable or structurally wrong is discarded rather than trusted,
 * so a corrupted key degrades to a fresh seed instead of a broken screen.
 */

import { todayISO, toISODate, parseDate } from './ui.js';

const KEY_PROFILE = 'fishwise.profile';
const KEY_TRIPS = 'fishwise.trips';

export const STATUSES = ['planned', 'completed'];

/* ------------------------------------------------------------------
   localStorage access that never throws
   ------------------------------------------------------------------ */

let storageWarned = false;
/** In-memory fallback if localStorage is unavailable (private mode, etc.). */
const memoryStore = new Map();

export function readRaw(key) {
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? (memoryStore.get(key) ?? null) : value;
  } catch {
    if (!storageWarned) {
      console.warn('FishWise SG: localStorage is unavailable; this session will not persist.');
      storageWarned = true;
    }
    return memoryStore.get(key) ?? null;
  }
}

const writeListeners = new Set();
let silentWrites = 0;

/** Subscribe to every local write (used by the cloud sync). Returns an unsubscribe fn. */
export function onStoreWrite(fn) {
  writeListeners.add(fn);
  return () => writeListeners.delete(fn);
}

/** Run fn without notifying write listeners (used when applying cloud data). */
export function withoutSync(fn) {
  silentWrites += 1;
  try {
    return fn();
  } finally {
    silentWrites -= 1;
  }
}

function notify(key) {
  if (silentWrites) return;
  writeListeners.forEach((fn) => {
    try {
      fn(key);
    } catch (err) {
      console.warn('FishWise SG: write listener failed', err);
    }
  });
}

export function writeRaw(key, value) {
  memoryStore.set(key, value);
  try {
    window.localStorage.setItem(key, value);
  } catch {
    if (!storageWarned) {
      console.warn('FishWise SG: localStorage is unavailable; this session will not persist.');
      storageWarned = true;
    }
  }
  notify(key);
}

export function removeRaw(key) {
  memoryStore.delete(key);
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* nothing useful to do */
  }
  notify(key);
}

export function readJSON(key) {
  const raw = readRaw(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    console.warn(`FishWise SG: "${key}" held invalid JSON and was discarded.`);
    removeRaw(key);
    return null;
  }
}

export function writeJSON(key, value) {
  writeRaw(key, JSON.stringify(value));
}

/* ------------------------------------------------------------------
   Seed data — ~8 completed trips across the last six months, plus one
   planned trip so the dashboard shows a populated "next trip".
   Dates are generated relative to today so the demo never looks stale.
   ------------------------------------------------------------------ */

// Sample trips reference real spot ids from data/spots.js; the trips themselves are demo data.
const SEED_BLUEPRINT = [
  { back: 143, spotId: 'pasir-ris-town-park', location: 'Pasir Ris Town Park pond', hours: 3, caught: 4, released: 3, species: ['tilapia'], notes: 'First outing. Spent most of it learning to cast without tangling the line.' },
  { back: 131, spotId: 'changi-beach', location: 'Changi Beach Park', hours: 2.5, caught: 0, released: 0, species: [], notes: 'Quiet morning, nothing biting. Still worth it for the walk out.' },
  { back: 112, spotId: 'lower-seletar-jetty', location: 'Lower Seletar Reservoir jetty', hours: 4, caught: 6, released: 6, species: ['peacock-bass', 'peacock-cichlid'], notes: 'Found the blue railings first. Released everything.' },
  { back: 96, spotId: 'bedok-jetty', location: 'Bedok Jetty', hours: 2, caught: 2, released: 2, species: ['javelin-grunter', 'pufferfish'], notes: 'Pufferfish stole two baits. Used pliers to unhook it.' },
  { back: 74, spotId: 'lower-seletar-jetty', location: 'Lower Seletar Reservoir jetty', hours: 5, caught: 7, released: 7, species: ['peacock-bass', 'snakehead'], notes: 'Long afternoon with the group. Brought a bag for the line offcuts.' },
  { back: 52, spotId: 'woodlands-jetty', location: 'Woodlands Waterfront Jetty', hours: 3.5, caught: 3, released: 1, species: ['barramundi'] },
  { back: 30, spotId: 'punggol-park', location: 'Punggol Park lake', hours: 2, caught: 1, released: 1, species: ['tilapia'], notes: 'Short evening session after class.' },
  { back: 12, spotId: 'kranji', location: 'Kranji Reservoir Park', hours: 4.5, caught: 5, released: 5, species: ['peacock-bass'], notes: 'Fishing Ground A, rocky bank near carpark A.' },
];

const SEED_PLANNED = { forward: 9, spotId: 'sembawang-jetty', location: 'Sembawang Park Jetty', notes: 'Bringing a friend who has never fished before.' };

const SPECIES_ID = /^[a-z0-9-]{2,40}$/;

function cleanSpecies(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((v) => typeof v === 'string' && SPECIES_ID.test(v)))].slice(0, 8);
}

function cleanSpotId(value) {
  return typeof value === 'string' && SPECIES_ID.test(value) ? value : null;
}

function shiftDays(offset) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return toISODate(d);
}

let idCounter = 0;
function newId() {
  idCounter += 1;
  return `trip-${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

export const DEFAULT_PROFILE = Object.freeze({
  displayName: 'Wei Ling',
  email: 'demo.angler@fishwise.example',
});

function buildSeedTrips() {
  const trips = SEED_BLUEPRINT.map((s) => ({
    id: newId(),
    spotId: s.spotId,
    location: s.location,
    date: shiftDays(-s.back),
    status: 'completed',
    durationHours: s.hours,
    fishCaught: s.caught,
    fishReleased: s.released,
    species: s.species,
    notes: s.notes ?? '',
    isSeed: true,
  }));

  trips.push({
    id: newId(),
    spotId: SEED_PLANNED.spotId,
    species: [],
    location: SEED_PLANNED.location,
    date: shiftDays(SEED_PLANNED.forward),
    status: 'planned',
    durationHours: null,
    fishCaught: null,
    fishReleased: null,
    notes: SEED_PLANNED.notes,
    isSeed: true,
  });

  return trips;
}

/* ------------------------------------------------------------------
   Sanitising what comes back out of storage
   ------------------------------------------------------------------ */

function cleanInt(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

function cleanHours(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
}

/** Returns a valid trip object, or null if the record is beyond repair. */
function sanitiseTrip(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const location = typeof raw.location === 'string' ? raw.location.trim().slice(0, 80) : '';
  if (!location) return null;

  const date = typeof raw.date === 'string' && parseDate(raw.date) ? raw.date : null;
  if (!date) return null;

  const status = STATUSES.includes(raw.status) ? raw.status : 'planned';
  const notes = typeof raw.notes === 'string' ? raw.notes.slice(0, 400) : '';
  const id = typeof raw.id === 'string' && raw.id ? raw.id : newId();
  const spotId = cleanSpotId(raw.spotId);

  if (status === 'completed') {
    const caught = cleanInt(raw.fishCaught);
    // A released count above the caught count is impossible; clamp rather than drop the trip.
    const released = Math.min(cleanInt(raw.fishReleased), caught);
    return {
      id,
      spotId,
      location,
      date,
      status,
      durationHours: cleanHours(raw.durationHours),
      fishCaught: caught,
      fishReleased: released,
      species: caught > 0 ? cleanSpecies(raw.species) : [],
      notes,
      isSeed: raw.isSeed === true,
    };
  }

  return {
    id,
    spotId,
    location,
    date,
    status: 'planned',
    durationHours: null,
    fishCaught: null,
    fishReleased: null,
    species: [],
    notes,
    isSeed: raw.isSeed === true,
  };
}

function sanitiseProfile(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const name = typeof source.displayName === 'string' ? source.displayName.trim().slice(0, 40) : '';
  const email = typeof source.email === 'string' ? source.email.trim().slice(0, 80) : '';
  return {
    displayName: name || DEFAULT_PROFILE.displayName,
    email: email || DEFAULT_PROFILE.email,
  };
}

/* ------------------------------------------------------------------
   Public read / write API
   ------------------------------------------------------------------ */

export function getTrips() {
  const raw = readJSON(KEY_TRIPS);
  if (!Array.isArray(raw)) {
    if (raw !== null) {
      console.warn('FishWise SG: saved trips were not a list and were discarded.');
      removeRaw(KEY_TRIPS);
    }
    return null;
  }
  return raw.map(sanitiseTrip).filter(Boolean);
}

function saveTrips(trips) {
  writeRaw(KEY_TRIPS, JSON.stringify(trips));
}

export function getProfile() {
  return sanitiseProfile(readJSON(KEY_PROFILE));
}

export function saveProfile(patch) {
  const next = sanitiseProfile({ ...getProfile(), ...patch });
  writeRaw(KEY_PROFILE, JSON.stringify(next));
  return next;
}

/** Create the seeded demo account if there is nothing usable stored yet. */
export function ensureSeeded() {
  if (!readJSON(KEY_PROFILE)) {
    writeRaw(KEY_PROFILE, JSON.stringify({ ...DEFAULT_PROFILE }));
  }
  if (getTrips() === null) {
    saveTrips(buildSeedTrips());
  }
}

/** Wipe trips and profile back to the shipped demo content. Session untouched. */
export function resetDemoData() {
  writeRaw(KEY_PROFILE, JSON.stringify({ ...DEFAULT_PROFILE }));
  saveTrips(buildSeedTrips());
}

/* ------------------------------------------------------------------
   Mutations
   ------------------------------------------------------------------ */

export function addTrip(values) {
  const trips = getTrips() ?? [];
  const trip = sanitiseTrip({ ...values, id: newId(), isSeed: false });
  if (!trip) return null;
  trips.push(trip);
  saveTrips(trips);
  return trip;
}

export function updateTrip(id, values) {
  const trips = getTrips() ?? [];
  const index = trips.findIndex((t) => t.id === id);
  if (index === -1) return null;
  const merged = sanitiseTrip({ ...values, id, isSeed: trips[index].isSeed });
  if (!merged) return null;
  trips[index] = merged;
  saveTrips(trips);
  return merged;
}

export function deleteTrip(id) {
  const trips = getTrips() ?? [];
  const next = trips.filter((t) => t.id !== id);
  if (next.length === trips.length) return false;
  saveTrips(next);
  return true;
}

export function getTrip(id) {
  return (getTrips() ?? []).find((t) => t.id === id) || null;
}

/* ------------------------------------------------------------------
   Validation — the single source of truth for the trip form
   ------------------------------------------------------------------ */

/** Nonnegative integer, entered as text. */
function parseCount(raw) {
  const text = String(raw ?? '').trim();
  if (text === '') return { ok: false, reason: 'empty' };
  if (!/^\d+$/.test(text)) return { ok: false, reason: 'shape' };
  const n = Number(text);
  if (!Number.isFinite(n) || n > 9999) return { ok: false, reason: 'range' };
  return { ok: true, value: n };
}

/**
 * Validate raw form strings.
 * @returns {{ errors: Record<string,string>, values: object|null }}
 */
export function validateTrip(input) {
  const errors = {};

  const location = String(input.location ?? '').trim();
  if (!location) {
    errors.location = 'Enter a location so you can recognise this trip later.';
  } else if (location.length > 80) {
    errors.location = 'Keep the location under 80 characters.';
  }

  const date = String(input.date ?? '').trim();
  if (!date) {
    errors.date = 'Pick a date for this trip.';
  } else if (!parseDate(date)) {
    errors.date = 'Use a valid date in the format YYYY-MM-DD.';
  }

  const status = STATUSES.includes(input.status) ? input.status : null;
  if (!status) errors.status = 'Choose whether this trip is planned or completed.';

  const notes = String(input.notes ?? '').trim();
  if (notes.length > 300) errors.notes = 'Notes are limited to 300 characters.';

  // Duration and catch counts are only required when the trip is completed.
  let durationHours = null;
  let fishCaught = null;
  let fishReleased = null;

  if (status === 'completed') {
    const rawDuration = String(input.durationHours ?? '').trim();
    if (rawDuration === '') {
      errors.durationHours = 'Enter how long the trip lasted.';
    } else {
      const hours = Number(rawDuration);
      if (!Number.isFinite(hours)) {
        errors.durationHours = 'Enter the duration as a number of hours, for example 2.5.';
      } else if (hours <= 0) {
        errors.durationHours = 'Duration must be greater than zero.';
      } else if (hours > 24) {
        errors.durationHours = 'Duration cannot be more than 24 hours.';
      } else {
        durationHours = Math.round(hours * 100) / 100;
      }
    }

    const caught = parseCount(input.fishCaught);
    if (!caught.ok) {
      errors.fishCaught =
        caught.reason === 'empty'
          ? 'Enter how many fish you caught. Zero is a valid answer.'
          : 'Fish caught must be a whole number of 0 or more.';
    } else {
      fishCaught = caught.value;
    }

    const released = parseCount(input.fishReleased);
    if (!released.ok) {
      errors.fishReleased =
        released.reason === 'empty'
          ? 'Enter how many fish you released. Zero is a valid answer.'
          : 'Fish released must be a whole number of 0 or more.';
    } else {
      fishReleased = released.value;
    }

    if (fishCaught !== null && fishReleased !== null && fishReleased > fishCaught) {
      errors.fishReleased = `You cannot release more fish than you caught (${fishCaught}).`;
    }
  }

  if (Object.keys(errors).length) return { errors, values: null };

  const spotId = cleanSpotId(input.spotId);
  const species = status === 'completed' && fishCaught > 0 ? cleanSpecies(input.species) : [];

  return {
    errors: {},
    values: { spotId, location, date, status, durationHours, fishCaught, fishReleased, species, notes },
  };
}

/* ------------------------------------------------------------------
   Derived statistics — always computed from the stored trips, never
   stored alongside them. Planned trips are excluded throughout.
   ------------------------------------------------------------------ */

export function completedTrips(trips) {
  return trips.filter((t) => t.status === 'completed');
}

export function plannedTrips(trips) {
  return trips.filter((t) => t.status === 'planned');
}

export function getStats(trips) {
  const done = completedTrips(trips);
  const totals = done.reduce(
    (acc, t) => {
      acc.hours += t.durationHours || 0;
      acc.caught += t.fishCaught || 0;
      acc.released += t.fishReleased || 0;
      return acc;
    },
    { hours: 0, caught: 0, released: 0 },
  );

  const releaseRate = totals.caught > 0 ? Math.round((totals.released / totals.caught) * 100) : null;

  return {
    completedCount: done.length,
    plannedCount: trips.length - done.length,
    totalHours: Math.round(totals.hours * 100) / 100,
    fishCaught: totals.caught,
    fishReleased: totals.released,
    releaseRate,
    avgHours: done.length ? Math.round((totals.hours / done.length) * 10) / 10 : 0,
  };
}

/** Completed trips per month for the last six months, oldest first. */
export function monthlyCompleted(trips) {
  const now = new Date();
  const buckets = [];

  for (let offset = 5; offset >= 0; offset -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    buckets.push({ year: d.getFullYear(), month: d.getMonth(), count: 0 });
  }

  completedTrips(trips).forEach((trip) => {
    const d = parseDate(trip.date);
    if (!d) return;
    const bucket = buckets.find((b) => b.year === d.getFullYear() && b.month === d.getMonth());
    if (bucket) bucket.count += 1;
  });

  return buckets;
}

/** Most recent completed trips first. */
export function recentCompleted(trips, limit = 4) {
  return completedTrips(trips)
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}

/** The soonest planned trip that has not already passed. */
export function nextPlanned(trips) {
  const today = todayISO();
  return (
    plannedTrips(trips)
      .filter((t) => t.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))[0] || null
  );
}

/** Planned trips whose date has already passed — worth nudging the user about. */
export function overduePlanned(trips) {
  const today = todayISO();
  return plannedTrips(trips)
    .filter((t) => t.date < today)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** Newest first for the trip list; planned trips sort by soonest date. */
export function sortForList(trips) {
  return trips.slice().sort((a, b) => {
    if (a.status !== b.status) return a.status === 'planned' ? -1 : 1;
    return a.status === 'planned' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date);
  });
}
