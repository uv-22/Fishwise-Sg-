/**
 * FishWise Gear Match — one-on-one gear advisor + where to buy.
 *
 * FishWise is the middle man, not a shop: the advisor runs a guided
 * conversation (where, what, who, budget), builds a legal gear list and
 * points the angler to shops that carry each item. When the AI backend is
 * connected it hands the conversation to Claude via the gear-advisor Edge
 * Function; otherwise it answers with the built-in rules-based advisor.
 * The gear list lives on this device; nothing is sold or charged.
 */

import { icon } from '../icons.js';
import { esc, openModal, closeModal, toast } from '../ui.js';
import { pageHead, getSpot } from '../components.js';
import { aiConnected, askGearAdvisor } from '../services/ai.js';
import { observeReveals } from '../fx.js';
import { CATEGORIES, PRODUCTS, KITS, SHOPS, GEAR_PHOTOS, getProduct, getShop, rangeOf, midOf, kitTotal } from '../data/gear.js';

const CART_KEY = 'fishwise.cart';
let cat = 'all';

/* ------------------------------------------------------------------
   Cart (local only)
   ------------------------------------------------------------------ */

function readCart() {
  try {
    const c = JSON.parse(localStorage.getItem(CART_KEY) || '{}');
    return Object.fromEntries(Object.entries(c).filter(([id, q]) => getProduct(id) && Number.isInteger(q) && q > 0 && q < 100));
  } catch { return {}; }
}
function writeCart(c) {
  try { localStorage.setItem(CART_KEY, JSON.stringify(c)); } catch { /* storage blocked */ }
  updateFab();
}
function addToCart(ids) {
  const c = readCart();
  ids.forEach((id) => { c[id] = Math.min(99, (c[id] || 0) + 1); });
  writeCart(c);
}
function cartCount() { return Object.values(readCart()).reduce((a, b) => a + b, 0); }
function cartIds() { return Object.entries(readCart()).flatMap(([id, q]) => Array(q).fill(id)); }
const money = ([lo, hi]) => `$${lo}–${hi}`;
function updateFab() {
  const n = document.querySelector('#cart-n');
  if (n) n.textContent = String(cartCount());
}

/* ------------------------------------------------------------------
   Product art (simple line drawings in the theme colour)
   ------------------------------------------------------------------ */

const ART = {
  rod: '<path d="M14 92 L 96 12" stroke-width="3"/><circle cx="30" cy="76" r="7"/><path d="M96 12 Q 104 40 98 66" stroke-width="1"/><path d="M98 66 q3 6 -1 9 q-4 2 -6 -2" stroke-width="2"/>',
  reel: '<circle cx="54" cy="54" r="26"/><circle cx="54" cy="54" r="9"/><path d="M80 54 h14 M94 46 v16"/><path d="M54 80 v12 h-18"/>',
  spool: '<ellipse cx="54" cy="30" rx="30" ry="9"/><path d="M24 30 v44 M84 30 v44"/><ellipse cx="54" cy="74" rx="30" ry="9"/><path d="M28 42 h52 M28 52 h52 M28 62 h52" stroke-width="1"/>',
  hook: '<path d="M60 14 v54 a16 16 0 1 1 -32 0 v-6" stroke-width="3"/><path d="M28 62 l-6 8" stroke-width="3"/><circle cx="60" cy="12" r="4"/>',
  sinker: '<path d="M54 18 v10"/><circle cx="54" cy="46" r="18"/><path d="M30 80 q24 -12 48 0 q-24 12 -48 0Z"/>',
  softbait: '<path d="M16 54 q20 -18 48 -6 q14 6 22 -6 v24 q-8 -12 -22 -6 q-28 12 -48 -6Z"/><circle cx="26" cy="52" r="3"/><path d="M40 46 v14 M50 46 v14" stroke-width="1"/>',
  minnow: '<path d="M14 54 q30 -26 66 -4 l14 -10 v28 l-14 -10 q-36 22 -66 -4Z"/><circle cx="30" cy="50" r="4"/><path d="M14 54 l-6 8" stroke-width="3"/><path d="M50 70 l-4 10 M66 66 l4 10"/>',
  frog: '<ellipse cx="54" cy="56" rx="26" ry="18"/><circle cx="44" cy="40" r="6"/><circle cx="64" cy="40" r="6"/><path d="M30 66 l-14 10 M78 66 l14 10" stroke-width="3"/>',
  spoon: '<path d="M54 14 q22 16 14 52 q-6 22 -14 26 q-8 -4 -14 -26 q-8 -36 14 -52Z"/><path d="M54 92 v8"/>',
  grip: '<path d="M30 20 h20 v40 h-20Z"/><path d="M40 60 v30"/><path d="M50 26 q30 0 30 18 q0 14 -18 14"/>',
  pliers: '<path d="M54 50 L 30 12 M54 50 L 78 12" stroke-width="3"/><path d="M54 50 L 40 94 M54 50 L 68 94" stroke-width="5"/><circle cx="54" cy="50" r="4"/>',
  pouch: '<path d="M24 34 h60 l-6 54 h-48Z"/><path d="M40 34 q14 -18 28 0"/>',
  lamp: '<path d="M18 54 q36 -34 72 0"/><rect x="40" y="46" width="28" height="22" rx="6"/><path d="M54 68 l-20 26 M54 68 l20 26" stroke-width="1"/>',
  shoe: '<path d="M14 70 q10 -30 30 -30 q10 16 34 18 q14 2 16 12 v8 h-80Z"/><path d="M14 78 h80" stroke-width="3"/>',
  aid: '<rect x="20" y="30" width="68" height="52" rx="8"/><path d="M54 44 v24 M42 56 h24" stroke-width="4"/><path d="M42 30 v-8 h24 v8"/>',
  box: '<rect x="18" y="36" width="72" height="48" rx="6"/><path d="M18 52 h72"/><path d="M42 36 v-10 h24 v10"/><path d="M42 62 h24"/>',
};
function art(key) {
  return `<svg viewBox="0 0 108 108" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ART[key] || ART.box}</svg>`;
}

/** Real photo of the item type (Wikimedia Commons), or a drawing if none. */
function gearImage(p) {
  const ph = p.photo && GEAR_PHOTOS[p.photo];
  if (!ph) return `<span class="p-draw">${art(p.art)}</span><span class="p-credit">Illustration</span>`;
  const who = ph.author.length > 24 ? `${ph.author.slice(0, 22)}…` : ph.author;
  return `<img src="${esc(ph.src)}" alt="${esc(p.name)} (example photo)" loading="lazy" decoding="async" />
    <a class="p-credit" href="${esc(ph.page)}" target="_blank" rel="noopener noreferrer" title="Photo: ${esc(ph.author)}, ${esc(ph.license)}, via Wikimedia Commons">© ${esc(who)} · ${esc(ph.license)}</a>`;
}

const SHOP_SHORT = { decathlon: 'Decathlon', specialist: 'Specialist', tackle: 'Tackle shop', online: 'Online' };
function whereChips(p) {
  return `<div class="p-where" aria-label="Usually stocked at">${p.where.map((id) => `<span>${esc(SHOP_SHORT[id] || id)}</span>`).join('')}</div>`;
}

/* ------------------------------------------------------------------
   Markup
   ------------------------------------------------------------------ */

function productCard(p) {
  return `
  <article class="product" data-cursor="Add to list">
    <div class="p-art is-photo">${gearImage(p)}${p.compliant ? `<span class="tag-ok">${icon('check', 11)} ${esc(p.compliant)}</span>` : ''}</div>
    <div class="p-body">
      <h3>${esc(p.name)}</h3>
      <p class="mono" style="font-size:.7rem;color:var(--ink-4)">${esc(p.spec)}</p>
      <p>${esc(p.note)}</p>
      ${whereChips(p)}
      <div class="p-foot">
        <span class="p-price"><small>Typically</small>${money(p.range)}</span>
        <span style="display:flex;gap:.3rem">
          <button class="btn btn-ghost btn-sm" type="button" data-ask="${p.id}" aria-label="Ask the advisor about ${esc(p.name)}">${icon('chat', 14)}</button>
          <button class="btn btn-primary btn-sm" type="button" data-add="${p.id}">${icon('plus', 14)} Add to list</button>
        </span>
      </div>
    </div>
  </article>`;
}

function kitCard(k) {
  const t = kitTotal(k);
  return `
  <article class="kit-card">
    <p class="sec-kicker" style="margin-bottom:.4rem">Starter kit</p>
    <h3>${esc(k.name)}</h3>
    <p>${esc(k.blurb)}</p>
    <div class="kit-items">${k.items.map((id) => `<span>${esc(getProduct(id).name.split(' (')[0])}</span>`).join('')}</div>
    <div class="kit-row">
      <span class="price"><small class="kit-about">about</small>$${t.lo}–${t.hi}</span>
      <button class="btn btn-primary btn-sm" type="button" data-kit="${k.id}">${icon('plus', 14)} Add to list</button>
    </div>
  </article>`;
}

function catalogue() {
  const list = PRODUCTS.filter((p) => cat === 'all' || p.cat === cat);
  return list.map(productCard).join('');
}

export function render(ctx, param, query) {
  const spot = query?.get('spot') ? getSpot(query.get('spot')) : null;
  return `
  ${pageHead({
    eyebrow: 'FishWise Gear Match',
    title: 'The right gear, <em style="font-style:normal;color:var(--sky)">from the right shop</em>',
    lede: 'We don’t sell gear. We’re the middle man: tell the advisor where and what you’ll fish, get a gear list that follows PUB and NParks rules, then buy it from a shop that stocks it.',
    actions: `<button class="btn btn-secondary" type="button" data-open-cart>${icon('bag', 16)} My gear list</button><a class="btn btn-primary" href="#advisor">${icon('chat', 16)} Talk to the advisor</a>`,
  })}

  <section class="gm-how stagger reveal" aria-label="How Gear Match works">
    <div class="gm-step"><span>01</span><b>Tell us your trip</b><p>Where you’ll fish, what you want to catch, who’s coming and your budget.</p></div>
    <div class="gm-step"><span>02</span><b>Get a matched list</b><p>Every item is checked against the rules for that spot: no live bait at PUB waters, the right hooks for NParks.</p></div>
    <div class="gm-step"><span>03</span><b>Buy where it’s stocked</b><p>See which shops carry each item, then take the list in store or shop online.</p></div>
    <div class="gm-step is-note"><span>${icon('info', 15)}</span><b>How FishWise earns</b><p>In the full version, partner shops pay a referral fee. You never pay a mark-up, and the advice is the same whichever shop you pick. No shop partnerships exist yet in this prototype.</p></div>
  </section>

  <div class="store-top">
    <section class="advisor" id="advisor" aria-label="Gear advisor chat">
      <header class="adv-head">
        <span class="adv-av">${icon('sparkles', 20)}</span>
        <div><b>FishWise gear advisor</b><span>${aiConnected() ? 'One-on-one advice powered by Claude' : 'One-on-one advice · built-in advisor'}${spot ? ` · planning for ${esc(spot.name)}` : ''}</span></div>
        <button class="btn btn-ghost btn-sm" type="button" id="adv-reset" style="margin-left:auto">${icon('refresh', 14)} Start over</button>
      </header>
      <div class="adv-log" id="adv-log" aria-live="polite" data-native-scroll></div>
      <div class="adv-quick" id="adv-quick"></div>
      <form class="adv-form" id="adv-form">
        <label class="sr-only" for="adv-input">Message the gear advisor</label>
        <input class="input" id="adv-input" maxlength="300" autocomplete="off" placeholder="e.g. I want to catch peacock bass at Lower Seletar, budget $120" />
        <button class="btn btn-primary" type="submit" aria-label="Send">${icon('send', 16)}</button>
      </form>
    </section>
    <aside class="store-side" aria-label="Starter kits">
      ${KITS.slice(0, 3).map(kitCard).join('')}
    </aside>
  </div>

  <section class="sec" aria-labelledby="cat-title">
    <div class="sec-head"><div><p class="sec-kicker">The catalogue</p><h2 id="cat-title">What to look for, and <em>where to get it</em></h2><p>Typical Singapore prices to help you budget; the shop sets the real price. Photos show the type of item, not a brand we endorse. Green tags follow the PUB bait rule or NParks hook rule.</p></div></div>
    <div class="cat-tabs">
      <div class="segmented" role="group" aria-label="Category" data-native-scroll>
        ${[['all', 'All'], ...Object.entries(CATEGORIES)].map(([k, l]) => `<button class="seg" type="button" data-cat="${k}" aria-pressed="${cat === k}">${l}</button>`).join('')}
      </div>
    </div>
    <div class="products stagger reveal" id="products">${catalogue()}</div>
  </section>

  <section class="sec" aria-labelledby="kits-title">
    <div class="sec-head"><div><p class="sec-kicker">Ready-made lists</p><h2 id="kits-title">All four <em>starter kits</em></h2></div></div>
    <div class="products stagger reveal" style="grid-template-columns:repeat(auto-fill,minmax(260px,1fr))">${KITS.map(kitCard).join('')}</div>
  </section>

  <section class="sec" aria-labelledby="shops-title">
    <div class="sec-head"><div><p class="sec-kicker">Where to buy</p><h2 id="shops-title">Where FishWise <em>sends you</em></h2><p>Confirm opening hours and stock with the shop before you travel. FishWise is not affiliated with these shops.</p></div></div>
    <div class="shops stagger reveal" style="grid-template-columns:repeat(auto-fill,minmax(250px,1fr))">
      ${SHOPS.map((s) => `
        <article class="shop">
          <span class="kind">${esc(s.kind)}</span>
          <h3>${esc(s.name)}</h3>
          <p class="addr">${icon('locations', 14)} ${esc(s.addr)}</p>
          <p>${esc(s.text)}</p>
          ${s.link ? `<a class="dh-link" href="${esc(s.link)}"${s.ext ? ' target="_blank" rel="noopener noreferrer"' : ''}>${esc(s.linkText)} ${icon(s.ext ? 'external' : 'chevronRight', 14)}</a>` : ''}
        </article>`).join('')}
    </div>
  </section>

  <section class="sec" aria-labelledby="buy-title">
    <div class="sec-head"><div><p class="sec-kicker">Before you buy</p><h2 id="buy-title">Five checks that keep you <em>legal</em></h2></div></div>
    <ul class="expect-list reveal" style="max-width:760px">
      <li>${icon('check', 15)}<span><b>Fishing at a PUB reservoir or waterway?</b> Artificial bait only — lures and soft plastics, no live or dead bait — and no fly fishing.</span></li>
      <li>${icon('check', 15)}<span><b>Hooks:</b> NParks asks for carbon steel micro-barb or barbless hooks at reservoirs and waterways.</span></li>
      <li>${icon('check', 15)}<span><b>Rod length:</b> 1.8–2.1 m is easiest at reservoirs and canals; 2.4–2.7 m helps on jetties.</span></li>
      <li>${icon('check', 15)}<span><b>Bring a lip-grip and pliers</b> — catfish, scorpionfish and stingrays can injure you.</span></li>
      <li>${icon('check', 15)}<span><b>Leave nothing:</b> a small pouch for line offcuts keeps hooks and line out of the water.</span></li>
    </ul>
  </section>

  <button class="btn btn-primary btn-lg cart-fab" type="button" data-open-cart aria-label="Open my gear list">${icon('bag', 18)} My list <span class="n" id="cart-n">${cartCount()}</span></button>`;
}

/* ------------------------------------------------------------------
   Advisor
   ------------------------------------------------------------------ */

const WHERE = {
  reservoir: { label: 'Reservoir (PUB)', words: ['reservoir', 'pub', 'lake', 'seletar', 'kranji', 'macritchie', 'peirce', 'pandan', 'bedok reservoir', 'jurong', 'marina', 'serangoon'] },
  jetty: { label: 'Jetty or beach', words: ['jetty', 'beach', 'sea', 'pier', 'bedok jetty', 'changi', 'woodlands', 'sembawang', 'punggol', 'east coast', 'pasir ris', 'ubin'] },
  canal: { label: 'Canal or river', words: ['canal', 'river', 'drain', 'kallang', 'geylang', 'rochor', 'pelton', 'pang sua'] },
};
const TARGETS = {
  'peacock-bass': ['peacock'],
  snakehead: ['snakehead', 'toman'],
  barramundi: ['barramundi', 'siakap', 'sea bass', 'seabass'],
  'mangrove-jack': ['jack', 'snapper'],
  tilapia: ['tilapia'],
  any: ['anything', 'any', 'whatever', 'not sure', 'dunno'],
};

function parse(text, s) {
  const t = text.toLowerCase();
  for (const [k, v] of Object.entries(WHERE)) if (v.words.some((w) => t.includes(w))) { s.where = k; break; }
  for (const [k, v] of Object.entries(TARGETS)) if (v.some((w) => t.includes(w))) { s.target = k; break; }
  if (/\b(kid|kids|child|children|son|daughter|family)\b/.test(t)) s.kids = true;
  const m = t.match(/\$?\s?(\d{2,4})\s?(?:dollars|sgd|bucks)?/);
  if (m && /\$|budget|dollar|sgd|under|below|around|bucks/.test(t)) s.budget = Number(m[1]);
  if (/no limit|money no object|best|premium/.test(t)) s.budget = 999;
}

function faq(text) {
  const t = text.toLowerCase();
  if (/live bait|prawn|worm|bread|natural bait|bait/.test(t) && /pub|reservoir|allowed|can i|legal/.test(t)) return 'At PUB reservoirs and waterways the rule is <b>artificial bait only</b> — lures and soft plastics. No live or dead bait, and no fly fishing. At coastal NParks spots like Bedok Jetty, bait fishing is common, but always read the signs on site.';
  if (/knot/.test(t)) return 'Start with the <b>improved clinch knot</b> to tie line to a hook or swivel — it is in the Academy and the 3D knot lesson. Wet the knot before you pull it tight.';
  if (/braid|mono|line/.test(t) && /why|which|what|difference/.test(t)) return '<b>Braid</b> is thin, strong and has no stretch, so you feel bites and cast further. <b>Mono</b> stretches and is easier to tie — great for your first trips. With braid, add a short fluorocarbon <b>leader</b> to protect it from teeth and pylons.';
  if (/rod/.test(t) && /long|length|size|which/.test(t)) return 'For reservoirs and canals, a <b>1.8–2.1 m</b> light spinning rod is easiest. On jetties, <b>2.4–2.7 m</b> helps you reach past pylons and lift fish up.';
  if (/reel/.test(t) && /size|which|what/.test(t)) return 'A <b>2500-size</b> spinning reel suits reservoir lure fishing; step up to <b>4000</b> for jetties, barramundi and mangrove jack.';
  if (/hook/.test(t)) return 'NParks asks for <b>carbon steel micro-barb or barbless hooks</b> at reservoirs and waterways. They also make releasing fish quicker and kinder.';
  return '';
}

function buildKit(s) {
  let base;
  if (s.kids) base = KITS.find((k) => k.id === 'kit-family');
  else if (s.target === 'snakehead') base = KITS.find((k) => k.id === 'kit-snakehead');
  else if (s.where === 'jetty' || ['barramundi', 'mangrove-jack'].includes(s.target)) base = KITS.find((k) => k.id === 'kit-jetty');
  else base = KITS.find((k) => k.id === 'kit-reservoir');
  let items = [...base.items];
  const price = midOf;
  const budget = s.budget || 200;
  // Trim nice-to-haves first, keeping the rod, reel, line, hooks and a lure.
  const optional = ['headlamp', 'minnow-7', 'lipgrip', 'leader-20', 'swivels', 'sinkers', 'pouch', 'firstaid'];
  for (const o of optional) {
    if (price(items) <= budget) break;
    const i = items.indexOf(o);
    if (i >= 0) items.splice(i, 1);
  }
  if (price(items) > budget && items.includes('braid-15')) items[items.indexOf('braid-15')] = 'mono-12';
  if (s.where === 'jetty' && !items.includes('shoes') && price([...items, 'shoes']) <= budget) items.push('shoes');
  if (!items.includes('pouch') && price([...items, 'pouch']) <= budget) items.push('pouch');
  return { base, items, range: rangeOf(items) };
}

const REASON = {
  'rod-21': 'light and easy to cast small lures', 'rod-27': 'reach past pylons and lift fish up the jetty', 'rod-16': 'short and light for small hands',
  'reel-2500': 'balanced with the 2.1 m rod', 'reel-4000': 'stronger drag for barramundi and jacks', 'braid-15': 'feel every bite, cast further',
  'mono-12': 'cheap and easy to knot', 'leader-20': 'protects your line from teeth and pylons', 'hooks-mb': 'meets NParks\' hook guidance',
  'hooks-bl': 'quick, kind releases', sinkers: 'holds the bottom in current', swivels: 'change rigs fast', 'soft-3': 'catches almost everything here',
  'minnow-7': 'twitch-and-pause along structure', frog: 'weedless — walk it over lily pads', 'spoon-15': 'long casts into the wind',
  lipgrip: 'hold fish without touching spines', pliers: 'unhook safely', pouch: 'take every offcut home', headlamp: 'dusk sessions and the walk back',
  shoes: 'grip on wet planks', firstaid: 'for hook pricks', box: 'keeps it all together',
};

export function mount(root, ctx, param, query) {
  const log = root.querySelector('#adv-log');
  const quick = root.querySelector('#adv-quick');
  const form = root.querySelector('#adv-form');
  const input = root.querySelector('#adv-input');
  const spot = query?.get('spot') ? getSpot(query.get('spot')) : null;
  let s = {};
  let history = []; // for the AI backend: alternating user / assistant

  const bot = (html, chips = []) => {
    const el = document.createElement('div');
    el.className = 'msg bot';
    el.innerHTML = html;
    log.appendChild(el);
    quick.innerHTML = chips.map((c) => `<button type="button" data-q="${esc(c)}">${esc(c)}</button>`).join('');
    log.scrollTop = log.scrollHeight;
    history.push({ role: 'assistant', content: el.textContent });
  };
  const me = (text) => {
    const el = document.createElement('div');
    el.className = 'msg me';
    el.textContent = text;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
  };
  const typing = async (ms = 650) => {
    const el = document.createElement('div');
    el.className = 'msg bot';
    el.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    await new Promise((r) => setTimeout(r, ms));
    el.remove();
  };

  const recommend = () => {
    const k = buildKit(s);
    const lines = k.items.map((id) => {
      const p = getProduct(id);
      return `<a href="#products" data-jump="${p.cat}"><b>${esc(p.name)}</b><span>${money(p.range)}</span></a><p class="small muted" style="margin:-.15rem 0 .2rem .2rem">${esc(REASON[id] || p.note)}</p>`;
    }).join('');
    const rules = s.where === 'reservoir' || s.where === 'canal'
      ? '<p class="small" style="margin-top:.6rem">PUB waters: <b>artificial bait only</b>, no fly fishing — everything here is lure-based. Fish only inside the zone with blue railings.</p>'
      : '<p class="small" style="margin-top:.6rem">Read the signs on the jetty or beach, and keep clear of swimmers and boats.</p>';
    bot(`Here's your gear list${s.budget && s.budget < 999 ? ` for about <b>$${s.budget}</b>` : ''}, typically <b>${money(k.range)}</b> in Singapore shops:<div class="kit">${lines}</div>${rules}
      <div style="display:flex;gap:.4rem;margin-top:.7rem;flex-wrap:wrap"><button class="btn btn-primary btn-sm" type="button" data-add-kit="${k.items.join(',')}">${icon('plus', 14)} Save to my list</button><a class="btn btn-ghost btn-sm" href="#/map${spot ? `/${spot.id}` : ''}">${icon('map', 14)} ${spot ? 'Back to the spot' : 'Find a spot'}</a></div>
      <p class="small muted" style="margin-top:.6rem">FishWise doesn't sell gear. Open <b>My gear list</b> to see which shops stock each item.</p>`,
    ['Why braid?', 'What knot do I need?', 'Cheaper option', 'Can I use live bait?', 'Start over']);
  };

  const next = async () => {
    await typing();
    if (!s.where) return bot('Where will you be fishing?', ['Reservoir (PUB)', 'Jetty or beach', 'Canal or river', 'Not sure yet']);
    if (!s.target && !s.kids) return bot('Nice. What would you love to catch?', ['Peacock bass', 'Snakehead', 'Barramundi', 'Anything that bites', 'Fishing with kids']);
    if (!s.budget) return bot('Last one — what\'s your budget for the whole kit?', ['$60 or less', '$60–120', '$120–200', 'Money no object']);
    return recommend();
  };

  const handle = async (text) => {
    me(text);
    history.push({ role: 'user', content: text });
    input.value = '';
    quick.innerHTML = '';
    if (/start over|reset/i.test(text)) return start();
    if (/cheaper/i.test(text)) { s.budget = Math.max(40, Math.round((s.budget || 150) * 0.6)); await typing(); return recommend(); }
    if (/not sure yet/i.test(text)) s.where = 'reservoir';
    if (/60 or less/.test(text)) s.budget = 60;
    else if (/60–120/.test(text)) s.budget = 120;
    else if (/120–200/.test(text)) s.budget = 200;
    else if (/no object/i.test(text)) s.budget = 999;
    parse(text, s);

    if (aiConnected()) {
      await typing(300);
      const el = document.createElement('div');
      el.className = 'msg bot';
      el.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';
      log.appendChild(el);
      log.scrollTop = log.scrollHeight;
      try {
        // The API needs user-first alternation: drop the opening greeting.
        const turns = history.slice(history.findIndex((m) => m.role === 'user'));
        const answer = await askGearAdvisor(turns.slice(-15));
        el.innerHTML = esc(answer).replace(/\n/g, '<br>');
        history.push({ role: 'assistant', content: answer });
        quick.innerHTML = ['Build me a kit', 'Cheaper option', 'Start over'].map((c) => `<button type="button" data-q="${c}">${c}</button>`).join('');
        log.scrollTop = log.scrollHeight;
        return;
      } catch (err) {
        el.remove();
        bot(`<span class="small muted">${esc(err.message)} Switching to the built-in advisor.</span>`);
      }
    }
    const a = faq(text);
    if (a) { await typing(); return bot(a, s.where && (s.target || s.kids) && s.budget ? ['Show my kit again', 'Cheaper option', 'Start over'] : ['Build me a kit', 'Start over']); }
    if (/show my kit|build me a kit/i.test(text) && s.where && (s.target || s.kids) && s.budget) { await typing(); return recommend(); }
    return next();
  };

  const start = () => {
    log.innerHTML = '';
    history = [];
    s = {};
    if (spot) {
      s.where = ['reservoir', 'pond'].includes(spot.type) ? 'reservoir' : ['canal', 'river'].includes(spot.type) ? 'canal' : 'jetty';
      bot(`Hi! Planning a trip to <b>${esc(spot.name)}</b>? I'll put together a kit that suits it${s.where !== 'jetty' ? ' and follows PUB\'s artificial-bait rule' : ''}. What would you love to catch?`, ['Peacock bass', 'Snakehead', 'Barramundi', 'Anything that bites', 'Fishing with kids']);
    } else {
      bot('Hi! I\'m your FishWise gear advisor. Tell me where you\'ll fish, what you\'re after and your budget — I\'ll build a legal, beginner-proof gear list and tell you which shops stock it.', ['Reservoir (PUB)', 'Jetty or beach', 'Canal or river', 'Not sure yet']);
    }
  };

  quick.addEventListener('click', (e) => { const b = e.target.closest('[data-q]'); if (b) handle(b.dataset.q); });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const t = input.value.trim();
    if (t.length < 2) return;
    handle(t.slice(0, 300));
  });
  root.querySelector('#adv-reset').addEventListener('click', start);
  start();

  // Store interactions
  root.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add]');
    if (add) { addToCart([add.dataset.add]); toast(`Added to your list: ${getProduct(add.dataset.add).name}`, 'bag'); return; }
    const kit = e.target.closest('[data-kit]');
    if (kit) { const k = KITS.find((x) => x.id === kit.dataset.kit); addToCart(k.items); toast(`${k.name} saved to your list`, 'bag'); return; }
    const all = e.target.closest('[data-add-kit]');
    if (all) { addToCart(all.dataset.addKit.split(',')); toast('Gear list saved', 'bag'); return; }
    const ask = e.target.closest('[data-ask]');
    if (ask) {
      const p = getProduct(ask.dataset.ask);
      root.querySelector('#advisor').scrollIntoView({ behavior: 'smooth', block: 'center' });
      handle(`Is the ${p.name} right for me?`);
      return;
    }
    const jump = e.target.closest('[data-jump]');
    if (jump) {
      e.preventDefault();
      setCat(jump.dataset.jump);
      root.querySelector('#cat-title').scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (e.target.closest('[data-open-cart]')) openCart();
    const c = e.target.closest('[data-cat]');
    if (c) setCat(c.dataset.cat);
  });
  root.querySelectorAll('a[href="#advisor"]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    root.querySelector('#advisor').scrollIntoView({ behavior: 'smooth', block: 'center' });
    input.focus({ preventScroll: true });
  }));

  function setCat(k) {
    cat = k;
    root.querySelectorAll('[data-cat]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cat === k)));
    const grid = root.querySelector('#products');
    grid.innerHTML = catalogue();
    grid.classList.remove('rv-in');
    void grid.offsetWidth;
    grid.classList.add('rv-in');
    observeReveals(root);
  }
}

function listText() {
  const lines = Object.entries(readCart()).map(([id, q]) => {
    const p = getProduct(id);
    return `${q} x ${p.name} (${p.spec}), typically ${money(p.range)}`;
  });
  return ['My FishWise gear list', ...lines, `Typical total: ${money(rangeOf(cartIds()))}`,
    'PUB reservoirs: artificial bait only. NParks: micro-barb or barbless hooks.'].join('\n');
}

function openCart() {
  const draw = () => {
    const lines = Object.entries(readCart());
    if (!lines.length) return `<div class="empty"><span class="empty-ico">${icon('bag', 20)}</span><h3>Your gear list is empty</h3><p>Add a starter kit or ask the advisor to build one.</p></div>`;
    // Which shops cover the most items on the list
    const cover = SHOPS.map((sh) => ({ sh, n: lines.filter(([id]) => getProduct(id).where.includes(sh.id)).length }))
      .filter((x) => x.n).sort((a, b) => b.n - a.n);
    return `
      ${lines.map(([id, q]) => { const p = getProduct(id); return `
        <div class="cart-line"><div><b>${esc(p.name)}</b><p class="small muted">Typically ${money(p.range)} · ${p.where.map((w) => esc(getShop(w)?.name || '')).join(', ')}</p></div>
          <span class="qty"><button type="button" data-dec="${id}" aria-label="One fewer">−</button><span>${q}</span><button type="button" data-inc="${id}" aria-label="One more">+</button></span>
          <b>${money([p.range[0] * q, p.range[1] * q])}</b></div>`; }).join('')}
      <div class="cart-line" style="border-bottom:0"><b>Typical total</b><span></span><b style="font-size:1.2rem">${money(rangeOf(cartIds()))}</b></div>
      <h3 class="gm-cover-title">Best places for this list</h3>
      <div class="gm-cover">${cover.map(({ sh, n }) => `
        <div><b>${esc(sh.name)}</b><span>${n} of ${lines.length} items</span>${sh.link ? `<a href="${esc(sh.link)}" target="_blank" rel="noopener noreferrer">${esc(sh.linkText)} ${icon('external', 12)}</a>` : ''}</div>`).join('')}</div>
      <div class="notice notice-teal" style="margin-top:.8rem">${icon('info', 16)}<div><strong>FishWise doesn't sell gear.</strong> Copy this list and show it at the shop, or use it to shop online. In the full version, a partner shop could confirm stock and hold it for you.</div></div>`;
  };
  openModal({
    labelledBy: 'cart-title',
    html: `
      <div class="modal-head"><h2 id="cart-title">${icon('bag', 18)} My gear list</h2><p>Saved on this device · prices are typical; each shop sets its own</p></div>
      <div class="modal-body" id="cart-body">${draw()}</div>
      <div class="modal-foot"><button class="btn btn-ghost" type="button" data-close>Keep browsing</button><button class="btn btn-primary" type="button" id="cart-copy" ${cartCount() ? '' : 'disabled'}>${icon('check', 15)} Copy list</button></div>`,
    onMount(panel) {
      panel.querySelector('[data-close]').addEventListener('click', () => closeModal());
      panel.addEventListener('click', (e) => {
        const inc = e.target.closest('[data-inc]');
        const dec = e.target.closest('[data-dec]');
        if (!inc && !dec) return;
        const c = readCart();
        const id = (inc || dec).dataset[inc ? 'inc' : 'dec'];
        c[id] = (c[id] || 0) + (inc ? 1 : -1);
        if (c[id] <= 0) delete c[id];
        writeCart(c);
        panel.querySelector('#cart-body').innerHTML = draw();
        panel.querySelector('#cart-copy').disabled = !cartCount();
      });
      panel.querySelector('#cart-copy').addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(listText());
          toast('List copied. Paste it into a message or show it at the shop.', 'checkCircle');
        } catch {
          toast('Could not copy here. Try again from a regular browser tab.', 'alert');
        }
      });
    },
  });
}
