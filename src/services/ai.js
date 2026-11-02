/**
 * AI client.
 *
 * The browser never talks to Anthropic directly and never holds an API key.
 * It calls two Supabase Edge Functions (see /supabase/functions), which add
 * the key server-side and call Claude:
 *
 *   identify-fish  — photo in, structured species identification out
 *   ask-coach      — question in, short grounded answer out
 *
 * When no backend is configured, the UI uses offline fallbacks instead
 * (Guided ID, and offlineAnswer() below).
 */

import { CONFIG, aiConnected } from '../config.js';
import { allLessons } from '../data/courses.js';
import { SPECIES } from '../data/species.js';
import { SPOTS } from '../data/spots.js';

const MAX_EDGE = 1280;      // px — plenty for species ID, keeps uploads small
const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

export { aiConnected };

/** Validate the picked file before doing any work. Returns an error string or ''. */
export function checkImageFile(file) {
  if (!file) return 'Choose a photo first.';
  if (file.type && !ACCEPTED.includes(file.type)) return 'Use a JPG, PNG, WebP or HEIC photo.';
  if (file.size > MAX_BYTES * 3) return 'That photo is very large. Try one under 24 MB.';
  return '';
}

/** Downscale to JPEG in the browser so uploads are fast and under API limits. */
export async function prepareImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('This photo could not be read. Try a JPG or PNG.'));
      el.src = url;
    });
    const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    return { dataUrl, base64: dataUrl.split(',')[1], mediaType: 'image/jpeg' };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function callFunction(name, body) {
  if (!aiConnected()) throw new Error('AI backend is not connected.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90000);
  try {
    const res = await fetch(`${CONFIG.supabaseUrl.replace(/\/$/, '')}/functions/v1/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CONFIG.supabaseAnonKey}`,
        apikey: CONFIG.supabaseAnonKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `The AI service returned an error (${res.status}).`);
    return data;
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('The AI service took too long to respond. Try again.');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** @returns {Promise<object>} the structured result from identify-fish */
export async function identifyFish(prepared) {
  const data = await callFunction('identify-fish', {
    image: prepared.base64,
    mediaType: prepared.mediaType,
  });
  if (!data.result) throw new Error('The AI service returned no result.');
  return data.result;
}

/** @returns {Promise<string>} */
export async function askCoach(question) {
  const data = await callFunction('ask-coach', { question });
  if (!data.answer) throw new Error('The AI coach returned no answer.');
  return data.answer;
}

/* ------------------------------------------------------------------
   Offline answers — keyword search over FishWise's own guides
   ------------------------------------------------------------------ */

const STOP = new Set('a an the is are can i do does to of in on at for and or my me how what where when which with you your it be should there'.split(' '));

function words(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
}

function blockText(block) {
  return block.p || block.tip || block.warn || block.h || (block.list || block.steps || []).join(' ');
}

let index = null;
function buildIndex() {
  const docs = [];
  for (const lesson of allLessons()) {
    const text = lesson.body.map(blockText).join(' ');
    docs.push({ kind: 'Lesson', title: lesson.title, route: `#/academy/${lesson.id}`, text, snippetFrom: lesson.body.filter((b) => b.p || b.tip || b.warn).map(blockText) });
  }
  for (const s of SPECIES) {
    const text = [s.name, s.looks, s.where, ...s.catchHow, ...s.handling].join(' ');
    docs.push({ kind: 'Species', title: s.name, route: `#/species/${s.id}`, text, snippetFrom: [s.where, ...s.handling, ...s.catchHow] });
  }
  for (const spot of SPOTS) {
    docs.push({ kind: 'Spot', title: spot.name, route: `#/map/${spot.id}`, text: `${spot.name} ${spot.area} ${spot.type} ${spot.note}`, snippetFrom: [spot.note] });
  }
  return docs.map((d) => ({ ...d, terms: words(d.text + ' ' + d.title + ' ' + d.title) }));
}

/** Top matches with the single best sentence from each. */
export function offlineAnswer(question) {
  index ||= buildIndex();
  const q = words(question);
  if (!q.length) return [];
  return index
    .map((doc) => {
      let score = 0;
      for (const w of q) {
        const hits = doc.terms.filter((t) => t === w || t.startsWith(w) || w.startsWith(t)).length;
        score += Math.min(hits, 4);
      }
      return { doc, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ doc }) => {
      const best = doc.snippetFrom
        .map((s) => ({ s, n: words(s).filter((w) => q.some((x) => w.startsWith(x) || x.startsWith(w))).length }))
        .sort((a, b) => b.n - a.n)[0];
      return { kind: doc.kind, title: doc.title, route: doc.route, snippet: best ? best.s : '' };
    });
}
