/**
 * Supabase data layer.
 *
 * No login: each browser gets a random device id (its "sync code"). It is sent
 * as the x-device-id header, and the Row Level Security policies in
 * supabase/fishwise_setup.sql only let a device read and write its own rows.
 * Public tables (posts, answers, votes, bookings, lessons) store a one-way hash
 * of the id instead, so the sync code is never exposed to other visitors.
 *
 *   fw_user_state  private  — one JSON document per localStorage key
 *   fw_posts       shared   — community questions
 *   fw_answers     shared   — community answers
 *   fw_helpful     shared   — "helpful" votes
 *   fw_bookings    shared   — FishWise Local seat bookings (for live seat counts)
 *   fw_lessons     shared   — lessons published from the Lesson Studio
 *
 * localStorage stays the source the UI reads from, so the app is instant and
 * still works offline; this module pulls on start-up and pushes after writes.
 */

import { CONFIG, cloudConfigured } from '../config.js';
import { readRaw, writeRaw, removeRaw, onStoreWrite, withoutSync } from '../store.js';

export const SYNC_KEYS = [
  'fishwise.profile',
  'fishwise.trips',
  'fishwise.learning',
  'fishwise.community',
  'fishwise.bookings',
  'fishwise.redemptions',
  'fishwise.scans',
  'fishwise.notes',
  'fishwise.mylessons',
];

const DEVICE_KEY = 'fishwise.device';
const META_KEY = 'fishwise.syncmeta';

/* ------------------------------------------------------------------
   Device id / sync code
   ------------------------------------------------------------------ */

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function deviceId() {
  let id = readRaw(DEVICE_KEY);
  if (!id || !UUID_RE.test(id)) {
    id = uuid();
    withoutSync(() => writeRaw(DEVICE_KEY, id));
  }
  return id;
}

export function newId() {
  return uuid();
}

/* ------------------------------------------------------------------
   Status
   ------------------------------------------------------------------ */

const state = { status: cloudConfigured() ? 'idle' : 'off', error: '', lastSync: null };
const statusListeners = new Set();
const dataListeners = new Set();

function setStatus(status, error = '') {
  state.status = status;
  state.error = error;
  if (status === 'synced') state.lastSync = new Date();
  statusListeners.forEach((fn) => fn({ ...state }));
}

export function cloudStatus() {
  return { ...state };
}

export function onCloudStatus(fn) {
  statusListeners.add(fn);
  return () => statusListeners.delete(fn);
}

/** Fired when data pulled from the cloud changed something the UI shows. */
export function onCloudData(fn) {
  dataListeners.add(fn);
  return () => dataListeners.delete(fn);
}

function emitData(what) {
  dataListeners.forEach((fn) => fn(what));
}

/* ------------------------------------------------------------------
   REST
   ------------------------------------------------------------------ */

async function rest(path, { method = 'GET', body, prefer } = {}) {
  const headers = {
    apikey: CONFIG.supabaseAnonKey,
    Authorization: `Bearer ${CONFIG.supabaseAnonKey}`,
    'x-device-id': deviceId(),
  };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (prefer) headers.Prefer = prefer;
  const res = await fetch(`${CONFIG.supabaseUrl.replace(/\/$/, '')}/rest/v1/${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    let msg = `${res.status}`;
    try {
      const j = await res.json();
      msg = j.message || j.hint || msg;
    } catch { /* ignore */ }
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function friendly(err) {
  if (err?.status === 404 || /relation|does not exist|schema cache/i.test(err?.message || '')) {
    return 'Supabase tables are missing — run supabase/fishwise_setup.sql in the SQL editor.';
  }
  if (err?.status === 401) return 'The Supabase anon key in src/config.js is not valid.';
  if (err instanceof TypeError) return 'Offline — changes are saved on this device and will sync later.';
  return err?.message || 'Sync failed.';
}

/* ------------------------------------------------------------------
   Private state sync
   ------------------------------------------------------------------ */

function readMeta() {
  try {
    const m = JSON.parse(readRaw(META_KEY) || '{}');
    return m && typeof m === 'object' ? m : {};
  } catch {
    return {};
  }
}

function writeMeta(meta) {
  withoutSync(() => writeRaw(META_KEY, JSON.stringify(meta)));
}

const dirty = new Set();
let pushTimer = null;
let started = false;

function markDirty(key) {
  if (!SYNC_KEYS.includes(key)) return;
  const meta = readMeta();
  meta[key] = new Date().toISOString();
  writeMeta(meta);
  dirty.add(key);
  if (state.status === 'off') return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(pushDirty, 700);
}

async function pushDirty() {
  if (!cloudConfigured() || !dirty.size) return;
  const keys = [...dirty];
  dirty.clear();
  const meta = readMeta();
  const upserts = [];
  const deletes = [];
  for (const key of keys) {
    const raw = readRaw(key);
    if (raw === null) {
      deletes.push(key);
      continue;
    }
    try {
      upserts.push({ device_id: deviceId(), key, value: JSON.parse(raw), updated_at: meta[key] || new Date().toISOString() });
    } catch {
      /* unparseable local value: skip */
    }
  }
  setStatus('syncing');
  try {
    if (upserts.length) {
      await rest('fw_user_state?on_conflict=device_id,key', { method: 'POST', body: upserts, prefer: 'resolution=merge-duplicates,return=minimal' });
    }
    for (const key of deletes) {
      await rest(`fw_user_state?key=eq.${encodeURIComponent(key)}`, { method: 'DELETE', prefer: 'return=minimal' });
    }
    setStatus('synced');
  } catch (err) {
    keys.forEach((k) => dirty.add(k));
    setStatus('error', friendly(err));
  }
}

async function pullState() {
  const rows = await rest('fw_user_state?select=key,value,updated_at');
  const meta = readMeta();
  const remote = new Map((rows || []).map((r) => [r.key, r]));
  let changed = false;
  withoutSync(() => {
    for (const key of SYNC_KEYS) {
      const row = remote.get(key);
      const localAt = meta[key] || '';
      if (row && (!localAt || row.updated_at > localAt || readRaw(key) === null)) {
        writeRaw(key, JSON.stringify(row.value));
        meta[key] = row.updated_at;
        changed = true;
      } else if (readRaw(key) !== null && (!row || localAt > row.updated_at)) {
        dirty.add(key);
      }
    }
  });
  writeMeta(meta);
  return changed;
}

/** Start syncing. Safe to call more than once. */
export async function initCloud() {
  deviceId();
  if (!started) {
    started = true;
    onStoreWrite(markDirty);
    window.addEventListener('online', () => syncNow());
  }
  if (!cloudConfigured()) {
    setStatus('off');
    return;
  }
  await syncNow();
}

export async function syncNow() {
  if (!cloudConfigured()) return;
  setStatus('syncing');
  try {
    const changed = await pullState();
    await refreshShared();
    if (dirty.size) await pushDirty();
    setStatus('synced');
    emitData(changed ? 'state' : 'shared');
  } catch (err) {
    setStatus('error', friendly(err));
  }
}

/** Switch this browser to another device's sync code and load its data. */
export async function useSyncCode(code) {
  const clean = String(code || '').trim().toLowerCase();
  if (!UUID_RE.test(clean)) throw new Error('That is not a valid sync code.');
  if (!cloudConfigured()) throw new Error('Cloud sync is not connected yet.');
  withoutSync(() => {
    writeRaw(DEVICE_KEY, clean);
    writeMeta({});
  });
  const rows = await rest('fw_user_state?select=key,value,updated_at');
  if (!rows?.length) throw new Error('No saved data was found for that sync code.');
  withoutSync(() => {
    const meta = {};
    for (const key of SYNC_KEYS) {
      const row = rows.find((r) => r.key === key);
      if (row) {
        writeRaw(key, JSON.stringify(row.value));
        meta[key] = row.updated_at;
      } else {
        removeRaw(key);
      }
    }
    writeMeta(meta);
  });
  await refreshShared();
  emitData('state');
}

/* ------------------------------------------------------------------
   Shared tables (cached in memory, refreshed on demand)
   ------------------------------------------------------------------ */

export const shared = {
  posts: [],
  answers: [],
  helpful: new Map(), // answer_key -> count
  bookings: new Map(), // session_id -> count
  lessons: [],
  loaded: false,
};

export async function refreshShared() {
  if (!cloudConfigured()) return false;
  const [posts, answers, votes, bookings, lessons] = await Promise.all([
    rest('fw_posts?select=id,author_name,title,body,tags,created_at&order=created_at.desc&limit=200'),
    rest('fw_answers?select=id,post_id,author_name,body,created_at&order=created_at.asc&limit=1000'),
    rest('fw_helpful?select=answer_key&limit=5000'),
    rest('fw_bookings?select=session_id&limit=5000'),
    rest('fw_lessons?select=id,author_name,track,title,summary,minutes,body,quiz,created_at,updated_at&order=updated_at.desc&limit=200'),
  ]);
  shared.posts = posts || [];
  shared.answers = answers || [];
  shared.helpful = countBy(votes || [], 'answer_key');
  shared.bookings = countBy(bookings || [], 'session_id');
  shared.lessons = lessons || [];
  shared.loaded = true;
  return true;
}

function countBy(rows, field) {
  const m = new Map();
  rows.forEach((r) => m.set(r[field], (m.get(r[field]) || 0) + 1));
  return m;
}

/** Run a shared-table write; failures are reported through the status, never thrown at the UI. */
async function sharedWrite(fn) {
  if (!cloudConfigured()) return false;
  try {
    await fn();
    await refreshShared();
    setStatus('synced');
    emitData('shared');
    return true;
  } catch (err) {
    setStatus('error', friendly(err));
    return false;
  }
}

export const cloud = {
  createPost: (p) => sharedWrite(() => rest('fw_posts', { method: 'POST', body: p, prefer: 'return=minimal' })),
  createAnswer: (a) => sharedWrite(() => rest('fw_answers', { method: 'POST', body: a, prefer: 'return=minimal' })),
  // Deletes below only ever touch this device's rows: RLS limits them to owner = fw_owner().
  setHelpful: (key, on) => sharedWrite(() => (on
    ? rest('fw_helpful?on_conflict=answer_key,owner', { method: 'POST', body: { answer_key: key }, prefer: 'resolution=ignore-duplicates,return=minimal' })
    : rest(`fw_helpful?answer_key=eq.${encodeURIComponent(key)}`, { method: 'DELETE', prefer: 'return=minimal' }))),
  book: (sessionId) => sharedWrite(() => rest('fw_bookings', { method: 'POST', body: { session_id: sessionId }, prefer: 'resolution=ignore-duplicates,return=minimal' })),
  unbook: (sessionId) => sharedWrite(() => rest(`fw_bookings?session_id=eq.${encodeURIComponent(sessionId)}`, { method: 'DELETE', prefer: 'return=minimal' })),
  publishLesson: (lesson) => sharedWrite(() => rest('fw_lessons?on_conflict=id', { method: 'POST', body: lesson, prefer: 'resolution=merge-duplicates,return=minimal' })),
  unpublishLesson: (id) => sharedWrite(() => rest(`fw_lessons?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', prefer: 'return=minimal' })),
};
