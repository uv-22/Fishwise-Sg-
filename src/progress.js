/**
 * Everything the user does outside the trip log: lessons, quizzes, notes,
 * the Lesson Studio, community posts, bookings, rewards and fish-ID scans.
 *
 * Local records live in localStorage (synced privately by services/cloud.js).
 * Shared data — other people's posts, answers, votes, bookings and published
 * lessons — comes from the cloud cache in `shared`.
 *
 * Points are never stored: they are recomputed from these records every time.
 */

import { readJSON, writeJSON, removeRaw, getTrips, completedTrips, getProfile } from './store.js';
import { POINTS, QUIZ_PASS_RATIO, TRACKS, findLesson as findCoreLesson } from './data/courses.js';
import { SEED_POSTS, MENTORS, REWARDS, SESSIONS } from './data/community.js';
import { shared, cloud, newId } from './services/cloud.js';
import { cloudConfigured } from './config.js';

const KEY_LEARNING = 'fishwise.learning';
const KEY_COMMUNITY = 'fishwise.community';
const KEY_BOOKINGS = 'fishwise.bookings';
const KEY_REDEMPTIONS = 'fishwise.redemptions';
const KEY_SCANS = 'fishwise.scans';
const KEY_NOTES = 'fishwise.notes';
const KEY_MYLESSONS = 'fishwise.mylessons';
const KEY_DAILY = 'fishwise.dailyfish';
const DAILY_POINTS = 5;

const ALL_KEYS = [KEY_LEARNING, KEY_COMMUNITY, KEY_BOOKINGS, KEY_REDEMPTIONS, KEY_SCANS, KEY_NOTES, KEY_MYLESSONS, KEY_DAILY];

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const isStr = (v, max = 2000) => typeof v === 'string' && v.length > 0 && v.length <= max;
const nowISO = () => new Date().toISOString();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* ------------------------------------------------------------------
   Lesson Studio (my lessons) + community lessons
   ------------------------------------------------------------------ */

const BLOCK_TYPES = ['p', 'h', 'tip', 'warn', 'list', 'steps'];

function sanitiseBlocks(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((b) => {
    if (!isObj(b)) return null;
    for (const t of BLOCK_TYPES) {
      if (t === 'list' || t === 'steps') {
        if (Array.isArray(b[t])) {
          const items = b[t].filter((x) => isStr(x, 400)).slice(0, 20);
          if (items.length) return { [t]: items };
        }
      } else if (isStr(b[t], 2000)) return { [t]: b[t] };
    }
    return null;
  }).filter(Boolean).slice(0, 40);
}

function sanitiseQuiz(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((q) => {
    if (!isObj(q) || !isStr(q.q, 300) || !Array.isArray(q.options)) return null;
    const options = q.options.filter((o) => isStr(o, 200)).slice(0, 5);
    const answer = Number(q.answer);
    if (options.length < 2 || !Number.isInteger(answer) || answer < 0 || answer >= options.length) return null;
    return { q: q.q, options, answer, why: isStr(q.why, 400) ? q.why : '' };
  }).filter(Boolean).slice(0, 10);
}

/** Drafts keep unfinished blocks and questions; only publishing is strict. */
function looseBlocks(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((b) => {
    if (!isObj(b)) return null;
    const t = BLOCK_TYPES.find((k) => k in b);
    if (!t) return null;
    if (t === 'list' || t === 'steps') return { [t]: (Array.isArray(b[t]) ? b[t] : []).filter((x) => typeof x === 'string').map((x) => x.slice(0, 400)).slice(0, 20) };
    return { [t]: typeof b[t] === 'string' ? b[t].slice(0, 2000) : '' };
  }).filter(Boolean).slice(0, 40);
}

function looseQuiz(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isObj).map((q) => {
    const options = (Array.isArray(q.options) ? q.options : []).map((o) => (typeof o === 'string' ? o.slice(0, 200) : '')).slice(0, 5);
    while (options.length < 2) options.push('');
    const answer = Math.max(0, Math.min(options.length - 1, Math.floor(Number(q.answer) || 0)));
    return { q: typeof q.q === 'string' ? q.q.slice(0, 300) : '', options, answer, why: typeof q.why === 'string' ? q.why.slice(0, 400) : '' };
  }).slice(0, 10);
}

function sanitiseMyLesson(l) {
  if (!isObj(l) || !UUID_RE.test(l.id || '')) return null;
  return {
    id: l.id,
    track: TRACKS.some((t) => t.id === l.track) ? l.track : 'beginner',
    title: typeof l.title === 'string' ? l.title.slice(0, 90) : '',
    summary: typeof l.summary === 'string' ? l.summary.slice(0, 200) : '',
    minutes: Math.max(1, Math.min(60, Math.round(Number(l.minutes) || 5))),
    body: looseBlocks(l.body),
    quiz: looseQuiz(l.quiz),
    status: l.status === 'published' ? 'published' : 'draft',
    updatedAt: isStr(l.updatedAt, 40) ? l.updatedAt : nowISO(),
  };
}

export function getMyLessons() {
  const raw = readJSON(KEY_MYLESSONS);
  return Array.isArray(raw) ? raw.map(sanitiseMyLesson).filter(Boolean) : [];
}

export function newLessonDraft() {
  return {
    id: newId(), track: 'beginner', title: '', summary: '', minutes: 5,
    body: [{ p: '' }], quiz: [{ q: '', options: ['', ''], answer: 0, why: '' }], status: 'draft', updatedAt: nowISO(),
  };
}

/** Validate a lesson for publishing. Returns a map of field → message. */
export function validateLesson(l) {
  const errors = {};
  if (!l.title || l.title.trim().length < 4) errors.title = 'Give the lesson a title of at least 4 characters.';
  if (l.title && l.title.length > 90) errors.title = 'Keep the title under 90 characters.';
  if (l.summary && l.summary.length > 200) errors.summary = 'Keep the summary under 200 characters.';
  const blocks = sanitiseBlocks(l.body);
  if (!blocks.length) errors.body = 'Add at least one block of content.';
  const quiz = sanitiseQuiz(l.quiz);
  if (Array.isArray(l.quiz) && l.quiz.length !== quiz.length) errors.quiz = 'Every quiz question needs a question, at least two options and a correct answer.';
  return errors;
}

export function saveMyLesson(lesson) {
  const clean = sanitiseMyLesson({ ...lesson, updatedAt: nowISO() });
  if (!clean) return null;
  const list = getMyLessons().filter((l) => l.id !== clean.id);
  list.unshift(clean);
  writeJSON(KEY_MYLESSONS, list.slice(0, 50));
  return clean;
}

export function deleteMyLesson(id) {
  const lesson = getMyLessons().find((l) => l.id === id);
  writeJSON(KEY_MYLESSONS, getMyLessons().filter((l) => l.id !== id));
  if (lesson?.status === 'published') cloud.unpublishLesson(id);
}

export async function publishMyLesson(id) {
  const lesson = getMyLessons().find((l) => l.id === id);
  if (!lesson) return { ok: false, reason: 'Lesson not found.' };
  const errors = validateLesson(lesson);
  if (Object.keys(errors).length) return { ok: false, reason: Object.values(errors)[0] };
  saveMyLesson({ ...lesson, status: 'published' });
  if (!cloudConfigured()) return { ok: true, local: true };
  const ok = await cloud.publishLesson({
    id: lesson.id, author_name: getProfile().displayName, track: lesson.track, title: lesson.title.trim(),
    summary: lesson.summary.trim(), minutes: lesson.minutes, body: sanitiseBlocks(lesson.body), quiz: sanitiseQuiz(lesson.quiz), updated_at: nowISO(),
  });
  return { ok, local: false };
}

export async function unpublishMyLesson(id) {
  const lesson = getMyLessons().find((l) => l.id === id);
  if (!lesson) return;
  saveMyLesson({ ...lesson, status: 'draft' });
  if (cloudConfigured()) await cloud.unpublishLesson(id);
}

function toCommunityLesson(l, own) {
  return {
    id: `c-${l.id}`,
    uuid: l.id,
    title: l.title,
    summary: l.summary || '',
    minutes: l.minutes || 5,
    body: sanitiseBlocks(l.body),
    quiz: sanitiseQuiz(l.quiz),
    track: l.track,
    author: own ? getProfile().displayName : (l.author_name || 'Community member'),
    own,
    community: true,
    kind: 'read',
    updatedAt: l.updated_at || l.updatedAt,
  };
}

/** Published lessons from everyone (cloud) plus my own published ones (works offline). */
export function communityLessons() {
  const mine = getMyLessons().filter((l) => l.status === 'published');
  const mineIds = new Set(mine.map((l) => l.id));
  return [
    ...mine.map((l) => toCommunityLesson(l, true)),
    ...shared.lessons.filter((l) => !mineIds.has(l.id)).map((l) => toCommunityLesson(l, false)),
  ];
}

/** Look up any lesson: core curriculum, community, or my draft preview. */
export function resolveLesson(id) {
  const core = findCoreLesson(id);
  if (core) return { ...core, source: 'core' };
  if (typeof id === 'string' && id.startsWith('c-')) {
    const lesson = communityLessons().find((l) => l.id === id);
    if (lesson) return { track: TRACKS.find((t) => t.id === lesson.track) || TRACKS[0], lesson, source: 'community' };
  }
  if (typeof id === 'string' && id.startsWith('draft-')) {
    const draft = getMyLessons().find((l) => `draft-${l.id}` === id);
    if (draft) return { track: TRACKS.find((t) => t.id === draft.track) || TRACKS[0], lesson: { ...toCommunityLesson(draft, true), id }, source: 'draft' };
  }
  return null;
}

/* ------------------------------------------------------------------
   Learning progress
   ------------------------------------------------------------------ */

const lessonIdOk = (id) => findCoreLesson(id) || /^c-[0-9a-f-]{36}$/i.test(id);

export function getLearning() {
  const raw = readJSON(KEY_LEARNING);
  const completed = {};
  const quizzes = {};
  const scenes = {};
  if (isObj(raw)) {
    if (isObj(raw.completed)) {
      for (const [id, at] of Object.entries(raw.completed)) if (lessonIdOk(id) && isStr(at, 40)) completed[id] = at;
    }
    if (isObj(raw.quizzes)) {
      for (const [id, q] of Object.entries(raw.quizzes)) {
        if (!lessonIdOk(id) || !isObj(q)) continue;
        const found = resolveLesson(id);
        const total = found ? found.lesson.quiz.length : Math.max(1, Math.floor(Number(q.total) || 1));
        const score = Math.max(0, Math.min(total, Math.floor(Number(q.score) || 0)));
        quizzes[id] = { score, total, passed: total > 0 && score / total >= QUIZ_PASS_RATIO, at: isStr(q.at, 40) ? q.at : nowISO() };
      }
    }
    if (isObj(raw.scenes)) {
      for (const [id, r] of Object.entries(raw.scenes)) if (/^[a-z]{3,12}$/.test(id) && isObj(r)) scenes[id] = { at: isStr(r.at, 40) ? r.at : nowISO(), result: isObj(r.result) ? r.result : {} };
    }
  }
  return { completed, quizzes, scenes };
}

export function markLessonComplete(lessonId) {
  const learning = getLearning();
  if (!lessonIdOk(lessonId) || learning.completed[lessonId]) return false;
  learning.completed[lessonId] = nowISO();
  writeJSON(KEY_LEARNING, learning);
  return true;
}

/** Record a finished 3D scene (and complete its lesson). Returns true the first time. */
export function recordScene(sceneId, lessonId, result = {}) {
  const learning = getLearning();
  const first = !learning.scenes[sceneId];
  learning.scenes[sceneId] = { at: nowISO(), result };
  if (lessonId && lessonIdOk(lessonId) && !learning.completed[lessonId]) learning.completed[lessonId] = nowISO();
  writeJSON(KEY_LEARNING, learning);
  return first;
}

/** Records the best score only. Returns { passed, improved }. */
export function recordQuiz(lessonId, score) {
  const found = resolveLesson(lessonId);
  if (!found || !lessonIdOk(lessonId)) return { passed: false, improved: false };
  const learning = getLearning();
  const total = found.lesson.quiz.length;
  const previous = learning.quizzes[lessonId];
  const passed = score / total >= QUIZ_PASS_RATIO;
  const improved = !previous || score > previous.score;
  if (improved) learning.quizzes[lessonId] = { score, total, passed, at: nowISO() };
  if (passed && !learning.completed[lessonId]) learning.completed[lessonId] = nowISO();
  writeJSON(KEY_LEARNING, learning);
  return { passed, improved };
}

export function lessonStatus(lesson, learning = getLearning()) {
  const read = !!learning.completed[lesson.id];
  const quiz = learning.quizzes[lesson.id];
  const hasQuiz = lesson.quiz.length > 0;
  if (read && (!hasQuiz || quiz?.passed)) return 'done';
  if (read || quiz) return 'started';
  return 'new';
}

export function trackProgress(track, learning = getLearning()) {
  const total = track.lessons.length;
  const done = track.lessons.filter((l) => learning.completed[l.id]).length;
  const passed = track.lessons.filter((l) => learning.quizzes[l.id]?.passed).length;
  return { total, done, passed, complete: done === total && passed === total };
}

export function nextLesson(learning = getLearning()) {
  for (const track of TRACKS) {
    const lesson = track.lessons.find((l) => !learning.completed[l.id] || !learning.quizzes[l.id]?.passed);
    if (lesson) return { track, lesson };
  }
  return null;
}

export function learningSummary(learning = getLearning()) {
  const all = TRACKS.flatMap((t) => t.lessons);
  const done = all.filter((l) => lessonStatus(l, learning) === 'done').length;
  const threeD = all.filter((l) => l.kind === '3d');
  return {
    total: all.length,
    done,
    pct: Math.round((done / all.length) * 100),
    quizzesPassed: all.filter((l) => learning.quizzes[l.id]?.passed).length,
    threeDTotal: threeD.length,
    threeDDone: threeD.filter((l) => learning.completed[l.id]).length,
    certificates: TRACKS.filter((t) => trackProgress(t, learning).complete).map((t) => t.id),
  };
}

/* ------------------------------------------------------------------
   Notes and saved lessons
   ------------------------------------------------------------------ */

export function getNotes() {
  const raw = readJSON(KEY_NOTES);
  const notes = {};
  let saved = [];
  if (isObj(raw)) {
    if (isObj(raw.notes)) for (const [k, v] of Object.entries(raw.notes)) if (typeof v === 'string' && k.length < 60) notes[k] = v.slice(0, 2000);
    if (Array.isArray(raw.saved)) saved = raw.saved.filter((x) => typeof x === 'string' && x.length < 60).slice(0, 100);
  }
  return { notes, saved };
}

export function saveNote(lessonId, text) {
  const n = getNotes();
  if (text.trim()) n.notes[lessonId] = text.slice(0, 2000);
  else delete n.notes[lessonId];
  writeJSON(KEY_NOTES, n);
}

export function toggleSaved(lessonId) {
  const n = getNotes();
  const on = !n.saved.includes(lessonId);
  n.saved = on ? [lessonId, ...n.saved] : n.saved.filter((x) => x !== lessonId);
  writeJSON(KEY_NOTES, n);
  return on;
}

/* ------------------------------------------------------------------
   Community
   ------------------------------------------------------------------ */

function sanitiseCommunity(raw) {
  const out = { posts: [], answers: [], helpful: {} };
  if (!isObj(raw)) return out;
  if (Array.isArray(raw.posts)) {
    out.posts = raw.posts
      .filter((p) => isObj(p) && isStr(p.id, 80) && isStr(p.title, 140) && isStr(p.body, 1200) && isStr(p.at, 40))
      .map((p) => ({ id: p.id, title: p.title, body: p.body, at: p.at, tags: Array.isArray(p.tags) ? p.tags.filter((t) => isStr(t, 24)).slice(0, 4) : [] }));
  }
  if (Array.isArray(raw.answers)) {
    out.answers = raw.answers
      .filter((a) => isObj(a) && isStr(a.id, 80) && isStr(a.postId, 80) && isStr(a.body, 1200) && isStr(a.at, 40))
      .map((a) => ({ id: a.id, postId: a.postId, body: a.body, at: a.at }));
  }
  if (isObj(raw.helpful)) for (const [k, v] of Object.entries(raw.helpful)) if (v === true && isStr(k, 120)) out.helpful[k] = true;
  return out;
}

export function getCommunity() {
  return sanitiseCommunity(readJSON(KEY_COMMUNITY));
}

export function addPost({ title, body, tags }) {
  const c = getCommunity();
  const post = { id: newId(), title: title.trim(), body: body.trim(), tags: tags || [], at: nowISO() };
  c.posts.unshift(post);
  writeJSON(KEY_COMMUNITY, c);
  cloud.createPost({ id: post.id, author_name: getProfile().displayName, title: post.title, body: post.body, tags: post.tags });
  return post;
}

export function addAnswer(postId, body) {
  const c = getCommunity();
  const answer = { id: newId(), postId, body: body.trim(), at: nowISO() };
  c.answers.push(answer);
  writeJSON(KEY_COMMUNITY, c);
  cloud.createAnswer({ id: answer.id, post_id: postId, author_name: getProfile().displayName, body: answer.body });
  return answer;
}

export function toggleHelpful(answerKey) {
  const c = getCommunity();
  const on = !c.helpful[answerKey];
  if (on) c.helpful[answerKey] = true;
  else delete c.helpful[answerKey];
  writeJSON(KEY_COMMUNITY, c);
  cloud.setHelpful(answerKey, on);
  return on;
}

/** Seeded posts + my posts + everyone else's shared posts, newest first, with answers merged in. */
export function allPosts(profileName) {
  const c = getCommunity();
  const now = Date.now();
  const myPostIds = new Set(c.posts.map((p) => p.id));
  const myAnswerIds = new Set(c.answers.map((a) => a.id));
  const useCloud = shared.loaded;

  const seeded = SEED_POSTS.map((p) => ({
    id: p.id, title: p.title, body: p.body, tags: p.tags,
    at: new Date(now - p.daysAgo * 86400000).toISOString(),
    author: MENTORS.find((m) => m.id === p.authorId),
    isSample: true,
    answers: p.answers.map((a, i) => ({
      key: `${p.id}#${i}`, body: a.body, at: new Date(now - a.daysAgo * 86400000).toISOString(),
      author: MENTORS.find((m) => m.id === a.authorId), helpful: a.helpful, isSample: true,
    })),
  }));
  const mine = c.posts.map((p) => ({ ...p, author: { name: profileName, isYou: true }, isSample: false, answers: [] }));
  const others = shared.posts.filter((p) => !myPostIds.has(p.id)).map((p) => ({
    id: p.id, title: p.title, body: p.body, tags: p.tags || [], at: p.created_at,
    author: { name: p.author_name, badge: 'Member' }, isSample: false, isShared: true, answers: [],
  }));
  const posts = [...mine, ...others, ...seeded];
  const byId = new Map(posts.map((p) => [p.id, p]));

  for (const a of c.answers) {
    byId.get(a.postId)?.answers.push({ key: a.id, body: a.body, at: a.at, author: { name: profileName, isYou: true }, helpful: 0, isSample: false });
  }
  for (const a of shared.answers) {
    if (myAnswerIds.has(a.id)) continue;
    byId.get(a.post_id)?.answers.push({ key: a.id, body: a.body, at: a.created_at, author: { name: a.author_name, badge: 'Member' }, helpful: 0, isSample: false });
  }
  for (const post of posts) {
    post.answers.sort((x, y) => (x.at || '').localeCompare(y.at || ''));
    for (const ans of post.answers) {
      ans.markedHelpful = !!c.helpful[ans.key];
      ans.helpfulCount = ans.helpful + (useCloud ? (shared.helpful.get(ans.key) || 0) : (ans.markedHelpful ? 1 : 0));
    }
  }
  return posts.sort((a, b) => (b.at || '').localeCompare(a.at || ''));
}

/* ------------------------------------------------------------------
   Sessions (FishWise Local bookings)
   ------------------------------------------------------------------ */

export function getBookings() {
  const raw = readJSON(KEY_BOOKINGS);
  if (!Array.isArray(raw)) return [];
  return raw.filter((b) => isObj(b) && SESSIONS.some((s) => s.id === b.sessionId) && isStr(b.at, 40))
    .map((b) => ({ sessionId: b.sessionId, at: b.at }));
}

export function isBooked(sessionId) {
  return getBookings().some((b) => b.sessionId === sessionId);
}

export function bookSession(sessionId) {
  const list = getBookings();
  if (list.some((b) => b.sessionId === sessionId)) return false;
  list.push({ sessionId, at: nowISO() });
  writeJSON(KEY_BOOKINGS, list);
  cloud.book(sessionId);
  return true;
}

export function cancelBooking(sessionId) {
  writeJSON(KEY_BOOKINGS, getBookings().filter((b) => b.sessionId !== sessionId));
  cloud.unbook(sessionId);
}

/** Live count when the cloud is connected (includes everyone's bookings). */
export function seatsLeft(session) {
  const booked = isBooked(session.id);
  const live = shared.loaded ? (shared.bookings.get(session.id) || 0) : 0;
  const others = shared.loaded ? Math.max(0, live - (booked ? 1 : 0)) : 0;
  return Math.max(0, session.capacity - session.seatsTaken - others - (booked ? 1 : 0));
}

/* ------------------------------------------------------------------
   Rewards
   ------------------------------------------------------------------ */

export function getRedemptions() {
  const raw = readJSON(KEY_REDEMPTIONS);
  if (!Array.isArray(raw)) return [];
  return raw.filter((r) => isObj(r) && REWARDS.some((w) => w.id === r.rewardId) && isStr(r.code, 40) && isStr(r.at, 40));
}

export function redeem(rewardId) {
  const reward = REWARDS.find((r) => r.id === rewardId);
  if (!reward) return { ok: false, reason: 'Unknown reward.' };
  const { balance } = getPoints();
  if (balance < reward.cost) return { ok: false, reason: `You need ${reward.cost - balance} more points.` };
  const code = `FW-${Math.random().toString(36).slice(2, 6).toUpperCase()}-DEMO`;
  const list = getRedemptions();
  list.push({ rewardId, code, at: nowISO() });
  writeJSON(KEY_REDEMPTIONS, list);
  return { ok: true, code, reward };
}

/* ------------------------------------------------------------------
   Fish-ID scans
   ------------------------------------------------------------------ */

export function getScans() {
  const raw = readJSON(KEY_SCANS);
  if (!Array.isArray(raw)) return [];
  return raw.filter((s) => isObj(s) && isStr(s.at, 40) && isStr(s.name, 80) && ['ai', 'guided'].includes(s.mode))
    .map((s) => ({ at: s.at, name: s.name, speciesId: typeof s.speciesId === 'string' ? s.speciesId : null, mode: s.mode, confidence: typeof s.confidence === 'string' ? s.confidence : '' }));
}

export function recordScan({ name, speciesId, mode, confidence }) {
  const list = getScans();
  list.unshift({ at: nowISO(), name, speciesId: speciesId || null, mode, confidence: confidence || '' });
  writeJSON(KEY_SCANS, list.slice(0, 50));
}

/* ------------------------------------------------------------------
   Daily "Name that fish" challenge
   ------------------------------------------------------------------ */

/** @returns {{date:string, speciesId:string, correct:boolean}[]} newest first */
export function getDaily() {
  const raw = readJSON(KEY_DAILY);
  if (!Array.isArray(raw)) return [];
  return raw.filter((d) => isObj(d) && isStr(d.date, 12) && isStr(d.speciesId, 60) && typeof d.correct === 'boolean');
}

export function recordDaily(date, speciesId, correct) {
  const list = getDaily().filter((d) => d.date !== date);
  list.unshift({ date, speciesId, correct });
  writeJSON(KEY_DAILY, list.slice(0, 400));
}

/** Consecutive days (ending today or yesterday) with a correct answer. */
export function dailyStreak(today) {
  const wins = new Set(getDaily().filter((d) => d.correct).map((d) => d.date));
  let n = 0;
  const d = new Date(`${today}T00:00:00`);
  if (!wins.has(today)) d.setDate(d.getDate() - 1);
  for (;;) {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!wins.has(iso)) break;
    n += 1;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

/* ------------------------------------------------------------------
   Points — derived, never stored
   ------------------------------------------------------------------ */

export const LEVELS = [
  { name: 'Novice', min: 0 },
  { name: 'Angler', min: 150 },
  { name: 'Skilled', min: 400 },
  { name: 'Mentor', min: 800 },
];

export function levelFor(points) {
  let current = LEVELS[0];
  for (const l of LEVELS) if (points >= l.min) current = l;
  const next = LEVELS[LEVELS.indexOf(current) + 1] || null;
  const span = next ? next.min - current.min : 1;
  const into = next ? points - current.min : 1;
  return { current, next, pct: Math.max(0, Math.min(100, Math.round((into / span) * 100))) };
}

export function getPoints() {
  const learning = getLearning();
  const community = getCommunity();
  const trips = completedTrips(getTrips() ?? []);
  const bookings = getBookings();
  const scans = getScans();
  const redemptions = getRedemptions();
  const myLessonIds = new Set(getMyLessons().map((l) => `c-${l.id}`));
  const published = getMyLessons().filter((l) => l.status === 'published').length;

  // No points for completing your own community lessons.
  const countable = (id) => !myLessonIds.has(id);
  const lessonsRead = Object.keys(learning.completed).filter(countable).length;
  const quizzesPassed = Object.entries(learning.quizzes).filter(([id, q]) => q.passed && countable(id)).length;
  const tracksDone = TRACKS.filter((t) => trackProgress(t, learning).complete).length;

  const items = [
    { label: 'Completed trips', count: trips.length, each: POINTS.trip },
    { label: 'Lessons completed', count: lessonsRead, each: POINTS.lesson },
    { label: 'Quizzes passed', count: quizzesPassed, each: POINTS.quiz },
    { label: 'Tracks completed', count: tracksDone, each: POINTS.track },
    { label: 'Lessons published', count: published, each: POINTS.publish },
    { label: 'Questions asked', count: community.posts.length, each: POINTS.question },
    { label: 'Answers given', count: community.answers.length, each: POINTS.answer },
    { label: 'Sessions booked', count: bookings.length, each: POINTS.booking },
    { label: 'Fish identified', count: scans.length, each: POINTS.scan },
    { label: 'Daily fish named', count: getDaily().filter((d) => d.correct).length, each: DAILY_POINTS },
  ].map((i) => ({ ...i, total: i.count * i.each }));

  const earned = items.reduce((n, i) => n + i.total, 0);
  const spent = redemptions.reduce((n, r) => n + (REWARDS.find((w) => w.id === r.rewardId)?.cost || 0), 0);
  return { earned, spent, balance: earned - spent, items, level: levelFor(earned) };
}

export function leaderboard(profileName) {
  const { earned } = getPoints();
  return [
    ...MENTORS.map((m) => ({ name: m.name, initials: m.initials, points: m.basePoints, badge: m.badge, isSample: true })),
    { name: profileName, initials: '', points: earned, badge: levelFor(earned).current.name, isYou: true },
  ].sort((a, b) => b.points - a.points);
}

/** Clear all progress records. Trips and profile are reset separately in store.js. */
export function resetProgress() {
  ALL_KEYS.forEach(removeRaw);
}
