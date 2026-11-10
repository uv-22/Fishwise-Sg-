/**
 * Home dashboard: a live, guided tour of everything in FishWise, plus the
 * personal numbers. Every stat is computed from stored records; the fish
 * photos are real (Wikimedia Commons) and the conditions are live NEA data.
 */

import { icon } from '../icons.js';
import { esc, formatDateLong, formatDateShort, relativeDayLabel, monthLabel, formatHours, plural, toast, todayISO } from '../ui.js';
import { getStats, monthlyCompleted, recentCompleted, nextPlanned, overduePlanned, saveProfile, completedTrips } from '../store.js';
import { nextLesson, learningSummary, getDaily, recordDaily, dailyStreak } from '../progress.js';
import { emptyState, spotBadge, getSpot, fishPhoto, photoCredit, SPOT_TYPES } from '../components.js';
import { aiConnected, askCoach, offlineAnswer } from '../services/ai.js';
import { getTwoHour, nearest, fishingRisk } from '../services/weather.js';
import { SPOTS } from '../data/spots.js';
import { SPECIES, DANGER, photoSmall } from '../data/species.js';
import { SESSIONS } from '../data/community.js';
import { maybeWelcome } from '../welcome.js';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Stable pseudo-random number for a date string (same fish all day). */
function seed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function dailyPick(today) {
  const s = seed(today);
  const answer = SPECIES[s % SPECIES.length];
  // Never offer two near-identical fish together (the two peacock cichlids).
  const twin = { 'peacock-bass': 'peacock-cichlid', 'peacock-cichlid': 'peacock-bass' }[answer.id];
  const others = SPECIES.filter((x) => x.id !== answer.id && x.id !== twin);
  const opts = [answer];
  let k = s;
  while (opts.length < 4) {
    k = Math.imul(k ^ (k >>> 15), 2246822507) >>> 0;
    const o = others[k % others.length];
    if (!opts.includes(o)) opts.push(o);
  }
  // shuffle deterministically
  return { answer, options: opts.map((o, i) => ({ o, r: seed(today + o.id + i) })).sort((a, b) => a.r - b.r).map((x) => x.o) };
}

function satellite(lat, lng, dx = 0.012, w = 900, h = 700) {
  const dy = (dx * h) / w;
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${lng - dx},${lat - dy},${lng + dx},${lat + dy}&bboxSR=4326&imageSR=3857&size=${w},${h}&format=jpg&f=image`;
}

function chart(trips) {
  const months = monthlyCompleted(trips);
  const max = Math.max(3, ...months.map((m) => m.count));
  const W = 520, H = 190, padL = 26, padB = 26, padT = 14;
  const plotW = W - padL - 6, plotH = H - padB - padT;
  const slot = plotW / months.length;
  const barW = Math.min(46, slot * 0.56);
  const y = (v) => padT + plotH - (v / max) * plotH;
  const ticks = [0, Math.ceil(max / 2), max];
  const grid = ticks.map((t) => `
    <line class="${t === 0 ? 'zero-line' : 'grid-line'}" x1="${padL}" x2="${W - 6}" y1="${y(t)}" y2="${y(t)}"/>
    <text class="y-tick" x="${padL - 8}" y="${y(t) + 3.5}" text-anchor="end">${t}</text>`).join('');
  const bars = months.map((m, i) => {
    const cx = padL + slot * i + slot / 2;
    const h = Math.max(m.count ? 4 : 2, (m.count / max) * plotH);
    const label = `${monthLabel(m.month)} ${m.year}: ${m.count} completed ${plural(m.count, 'trip')}`;
    return `
    <g class="bar-hit" role="listitem" aria-label="${label}">
      <title>${label}</title>
      <rect class="bar ${m.count ? '' : 'bar-zero'}" x="${cx - barW / 2}" y="${padT + plotH - h}" width="${barW}" height="${h}" rx="6"/>
      ${m.count ? `<text class="bar-val" x="${cx}" y="${padT + plotH - h - 6}" text-anchor="middle">${m.count}</text>` : ''}
      <text class="x-tick" x="${cx}" y="${H - 7}" text-anchor="middle">${monthLabel(m.month)}</text>
    </g>`;
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="list" aria-label="Completed trips per month, last six months">${grid}${bars}</svg>`;
}

function recentRow(trip) {
  const spot = trip.spotId ? getSpot(trip.spotId) : null;
  return `
  <div class="row">
    <span class="stat-ico" style="width:36px;height:36px">${icon('fish', 16)}</span>
    <div class="row-main">
      <div class="row-title">${esc(trip.location)} ${trip.isSeed ? '<span class="demo-chip">Sample</span>' : ''}</div>
      <div class="row-meta">
        <span>${icon('calendar', 13)} ${formatDateShort(trip.date)}</span>
        <span>${icon('clock', 13)} ${formatHours(trip.durationHours)} h</span>
        <span>${icon('target', 13)} ${trip.fishCaught} caught</span>
      </div>
    </div>
    ${spot ? `<a class="btn-icon" href="#/map/${spot.id}" aria-label="Show ${esc(spot.name)} on the map">${icon('map', 17)}</a>` : ''}
  </div>`;
}

function statItem(iconName, label, value, foot) {
  return `
  <div class="sb-item">
    <p class="sb-label">${icon(iconName, 14)}<span>${label}</span></p>
    <p class="stat-value">${value}</p>
    <p class="sb-foot">${foot}</p>
  </div>`;
}

/* ---------- slide art ---------- */

function windArt() {
  let arrows = '';
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 7; c++) {
      const x = 30 + c * 52 + (r % 2) * 18, y = 30 + r * 52;
      const a = -25 + Math.sin(r * 0.9 + c * 0.6) * 35;
      const len = 14 + ((r * 7 + c * 3) % 5) * 3;
      const col = ['#2B7FE8', '#4FA3FF', '#7CC4FF', '#A8D8FF'][(r + c) % 4];
      arrows += `<g transform="translate(${x} ${y}) rotate(${a.toFixed(1)})"><line x1="${-len}" y1="0" x2="${len}" y2="0" stroke="${col}" stroke-width="2.2" stroke-linecap="round"/><path d="M${len} 0 l-6 -4 v8 z" fill="${col}"/></g>`;
    }
  }
  return `<svg class="sl-svg" viewBox="0 0 400 320" aria-hidden="true">
    <defs><radialGradient id="hg" cx="60%" cy="45%" r="60%"><stop offset="0" stop-color="#F5B455" stop-opacity=".55"/><stop offset=".45" stop-color="#4FA3FF" stop-opacity=".25"/><stop offset="1" stop-color="#071733" stop-opacity="0"/></radialGradient></defs>
    <rect width="400" height="320" rx="18" fill="url(#hg)"/>${arrows}</svg>`;
}

function ringArt(pct) {
  const r = 92, c = 2 * Math.PI * r;
  return `<svg class="sl-svg" viewBox="0 0 260 260" aria-hidden="true">
    <circle cx="130" cy="130" r="${r}" fill="none" stroke="rgba(124,164,220,.14)" stroke-width="16"/>
    <circle class="ring-fg" cx="130" cy="130" r="${r}" fill="none" stroke="#7CC4FF" stroke-width="16" stroke-linecap="round"
      stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - pct / 100)).toFixed(1)}" transform="rotate(-90 130 130)"/>
    <text x="130" y="128" text-anchor="middle" font-family="Sora, sans-serif" font-size="46" font-weight="700" fill="#F2F6FC">${pct}%</text>
    <text x="130" y="156" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" letter-spacing="2" fill="#8FA0BA">COMPLETE</text></svg>`;
}

function castArt() {
  return `<svg class="sl-svg" viewBox="0 0 400 300" aria-hidden="true">
    <path d="M40 250 Q 150 40 360 70" fill="none" stroke="#7CC4FF" stroke-width="2.5" stroke-dasharray="6 7"/>
    <path d="M40 250 L 120 120" stroke="#F2F6FC" stroke-width="5" stroke-linecap="round"/>
    <circle cx="360" cy="70" r="7" fill="#7CC4FF"/><circle cx="360" cy="70" r="18" fill="none" stroke="#7CC4FF" stroke-opacity=".35"/>
    <path d="M0 270 C 60 255 120 285 200 270 S 340 255 400 270 V300 H0Z" fill="#0A2552"/>
    <g font-family="JetBrains Mono, monospace" font-size="11" fill="#8FA0BA" letter-spacing="1.5"><text x="210" y="40">CAST ARC</text><text x="60" y="210">ROD 2.1 M</text></g></svg>`;
}

function gearArt() {
  return `<svg class="sl-svg" viewBox="0 0 400 300" aria-hidden="true">
    <path d="M40 260 L 330 40" stroke="#C5D1E3" stroke-width="5" stroke-linecap="round"/>
    <circle cx="120" cy="200" r="22" fill="#0B2350" stroke="#7CC4FF" stroke-width="3"/><circle cx="120" cy="200" r="6" fill="#7CC4FF"/>
    <path d="M330 40 Q 360 120 345 190" fill="none" stroke="#7CC4FF" stroke-width="1.5"/>
    <path d="M345 190 q 8 14 -2 22 q -9 6 -14 -3" fill="none" stroke="#F2F6FC" stroke-width="2.5" stroke-linecap="round"/>
    <rect x="200" y="200" width="170" height="64" rx="18" fill="#7CC4FF"/><path d="M220 264 l-8 18 l26 -18z" fill="#7CC4FF"/>
    <text x="285" y="238" text-anchor="middle" font-family="Manrope, sans-serif" font-weight="800" font-size="16" fill="#04101F">What rod for Bedok?</text></svg>`;
}

function crowdArt() {
  const people = ['WL', 'AK', 'JT', 'RS', 'MN', 'DY', 'HC', 'PL'];
  return `<svg class="sl-svg" viewBox="0 0 400 300" aria-hidden="true">${people.map((p, i) => {
    const x = 70 + (i % 4) * 85, y = 90 + Math.floor(i / 4) * 110 + (i % 2) * 14;
    return `<g><circle cx="${x}" cy="${y}" r="32" fill="${['#0B2350', '#123a7a', '#16284A', '#0A2552'][i % 4]}" stroke="#7CC4FF" stroke-opacity=".45"/><text x="${x}" y="${y + 6}" text-anchor="middle" font-family="Sora, sans-serif" font-weight="700" font-size="17" fill="#F2F6FC">${p}</text></g>`;
  }).join('')}</svg>`;
}

function slide(n, { href, title, text, stats, art, cursor }) {
  return `
  <a class="slide" href="${href}" data-cursor="${esc(cursor)}">
    <div class="sl-copy">
      <span class="sl-num">${String(n).padStart(2, '0')} / 07</span>
      <h3>${title}</h3>
      <p>${text}</p>
      <div class="sl-stats">${stats.map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join('')}</div>
      <span class="sl-go">Open ${icon('arrowRight', 16)}</span>
    </div>
    ${art}
  </a>`;
}

export function render(ctx) {
  const { profile, trips, points } = ctx;
  const stats = getStats(trips);
  const recent = recentCompleted(trips, 4);
  const next = nextPlanned(trips);
  const overdue = overduePlanned(trips);
  const learn = nextLesson(ctx.learning);
  const lsum = learningSummary(ctx.learning);
  const lvl = points.level;
  const nextSpot = next?.spotId ? getSpot(next.spotId) : null;
  const today = todayISO();
  const todayLong = new Date().toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long' });
  const listed = SPOTS.filter((s) => s.status === 'listed').length;
  const caught = new Set(completedTrips(trips).flatMap((t) => t.species || []));
  const daily = dailyPick(today);
  const answered = getDaily().find((d) => d.date === today);
  const streak = dailyStreak(today);
  const fod = SPECIES[(seed(today) + 5) % SPECIES.length] === daily.answer ? SPECIES[(seed(today) + 6) % SPECIES.length] : SPECIES[(seed(today) + 5) % SPECIES.length];
  const bedok = getSpot('bedok-jetty');
  const fourFish = ['barramundi', 'peacock-bass', 'mangrove-jack', 'snakehead'].map((id) => SPECIES.find((s) => s.id === id));

  return `
  <section class="dash-hero" aria-label="Welcome">
    <canvas class="fx-field" data-field="words" aria-hidden="true"></canvas>
    <canvas class="fx-fish" aria-hidden="true"></canvas>
    <div class="dh-inner">
      <div class="dh-copy">
        <p class="eyebrow">${esc(todayLong)} · Singapore</p>
        <h1 id="page-title" tabindex="-1"><span class="greet"><span id="greet-text">${greeting()}, <span class="hl">${esc(profile.displayName)}</span></span>
          <button class="btn-icon" type="button" id="edit-name" aria-label="Edit display name">${icon('edit', 17)}</button></span></h1>
        <p class="lede">Where to fish, what's biting, what the sky is doing and what to bring — all of FishWise, in one place. Scroll for the tour.</p>
        <div class="dh-actions">
          <button class="btn btn-primary btn-lg" type="button" data-action="log-trip">${icon('plus', 16)} Log a trip</button>
          <a class="btn btn-outline-white btn-lg" href="#/plan">${icon('route', 16)} Should I go?</a>
        </div>
        <div class="dh-ticker" aria-label="At a glance">
          <span class="live" id="live-chip"><i></i> Live · checking NEA…</span>
          <span><b>${SPOTS.length}</b> spots mapped</span>
          <span><b>${SPECIES.length}</b> species</span>
          <span><b>${caught.size}</b>/${SPECIES.length} caught by you</span>
        </div>
      </div>
      <aside class="dh-level" aria-label="Points and level">
        <div class="dh-level-top">
          <span class="level-badge">${icon('trophy', 18)}</span>
          <div><p class="dh-k">Current level</p><b>${lvl.current.name}</b></div>
        </div>
        <p class="dh-pts"><span data-count>${points.balance}</span><small>points to spend</small></p>
        <div class="meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${lvl.pct}" aria-label="Progress to next level"><span style="width:${lvl.pct}%"></span></div>
        <p class="dh-foot">${lvl.next ? `${lvl.next.min - points.earned} points to <b>${lvl.next.name}</b>` : 'Top level reached'} · ${points.earned} earned</p>
        <a class="dh-link" href="#/community/rewards">${icon('gift', 15)} Browse rewards ${icon('chevronRight', 15)}</a>
      </aside>
    </div>
  </section>

  <form class="name-form" id="name-form" hidden>
    <div class="field" style="flex:1;min-width:12rem">
      <label for="name-input">Display name</label>
      <input class="input" id="name-input" maxlength="40" value="${esc(profile.displayName)}" aria-describedby="name-err" />
      <span class="field-error" id="name-err">${icon('alert', 13)}<span>Enter a name between 1 and 40 characters.</span></span>
    </div>
    <div style="display:flex;gap:.45rem;align-self:flex-end">
      <button class="btn btn-secondary" type="button" id="name-cancel">Cancel</button>
      <button class="btn btn-primary" type="submit">Save</button>
    </div>
  </form>

  <section class="stats-band" aria-label="Trip statistics">
    ${statItem('calendarCheck', 'Completed trips', stats.completedCount, `${stats.plannedCount} planned`)}
    ${statItem('clock', 'Fishing hours', `${formatHours(stats.totalHours)}<small> h</small>`, `${formatHours(stats.avgHours)} h average`)}
    ${statItem('target', 'Fish caught', stats.fishCaught, 'Across completed trips')}
    ${statItem('release', 'Released', stats.fishReleased, stats.releaseRate === null ? 'No catches yet' : `${stats.releaseRate}% release rate`)}
  </section>

  <section class="showcase" id="showcase" aria-label="Everything in FishWise" aria-roledescription="carousel">
    <div class="sc-sticky">
      <div class="sc-head">
        <div><p class="sec-kicker">The whole of FishWise</p><h2>Seven ways to <em>fish smarter</em>.<br>Swipe, drag or use the arrows.</h2></div>
        <div class="sc-nav">
          <p class="sc-count"><b id="sc-now">01</b> / 07</p>
          <button class="sc-btn" type="button" id="sc-prev" aria-label="Previous section" disabled>${icon('arrowLeft', 18)}</button>
          <button class="sc-btn" type="button" id="sc-next" aria-label="Next section">${icon('arrowRight', 18)}</button>
        </div>
      </div>
      <div class="sc-track" id="sc-track" tabindex="0" aria-label="Sections — use arrow keys to move">
        ${slide(1, { href: '#/map', cursor: 'Open map', title: 'Every legal spot, mapped', text: 'Satellite map of every jetty, beach and reservoir on the PUB and NParks lists — with step-by-step directions from the MRT and a 3D view of each place.', stats: [[SPOTS.length, 'spots'], [listed, 'listed'], ['3D', 'per spot']], art: `<div class="sl-art"><img src="${satellite(bedok.lat, bedok.lng)}" alt="" loading="lazy" /></div>` })}
        ${slide(2, { href: '#/species', cursor: 'Meet the fish', title: 'Real fish, real photos', text: 'Know what is on the end of your line: how to recognise it, where it lives, how to catch it and how to handle it safely.', stats: [[SPECIES.length, 'species'], [SPECIES.filter((s) => s.danger === 'danger').length, 'dangerous'], [caught.size, 'you caught']], art: `<div class="sl-art is-stack">${fourFish.map((s) => `<figure><img src="${esc(photoSmall(s.photo))}" alt="" loading="lazy" /><figcaption>${esc(s.name.split(' (')[0])}</figcaption></figure>`).join('')}</div>` })}
        ${slide(3, { href: '#/weather', cursor: 'See the sky', title: 'A weather lab for anglers', text: 'Live wind, rain and heat maps from NEA stations, a four-day outlook and plain advice on when to go — and when thunder means stop.', stats: [['Live', 'NEA data'], ['4', 'day outlook'], ['5', 'map layers']], art: `<div class="sl-art is-vis">${windArt()}</div>` })}
        ${slide(4, { href: '#/academy', cursor: 'Start learning', title: 'Learn it properly', text: 'Short lessons with quizzes across three tracks — rules, rigs, reading water, handling and safety. Points and certificates as you go.', stats: [[lsum.total, 'lessons'], [lsum.done, 'done'], ['3', 'tracks']], art: `<div class="sl-art is-vis">${ringArt(lsum.pct)}</div>` })}
        ${slide(5, { href: '#/trainer', cursor: 'Try in 3D', title: 'Practise in 3D first', text: 'Tie knots, time a cast, read the water and handle a fish in interactive 3D scenes before you try it on a jetty.', stats: [[lsum.threeDTotal, '3D lessons'], [lsum.threeDDone, 'done']], art: `<div class="sl-art is-vis">${castArt()}</div>` })}
        ${slide(6, { href: '#/store', cursor: 'Gear up', title: 'Gear Match + advisor', text: 'We do not sell gear — we match you to it. Tell the advisor where, what and your budget; get a legal gear list and the shops that stock it.', stats: [['1:1', 'advice'], ['PUB', 'compliant lists']], art: `<div class="sl-art is-vis">${gearArt()}</div>` })}
        ${slide(7, { href: '#/community', cursor: 'Join in', title: 'Community & events', text: 'Ask questions, share answers, climb the leaderboard and book a FishWise Local session with gear provided.', stats: [[SESSIONS.length, 'sessions'], [points.earned, 'your points']], art: `<div class="sl-art is-vis">${crowdArt()}</div>` })}
      </div>
      <div class="sc-prog" aria-hidden="true"><i></i></div>
    </div>
  </section>

  <section class="sec" aria-labelledby="quiz-title">
    <div class="quiz-band" id="quiz">
      <div class="qb-photo ${answered ? 'is-revealed' : ''}" id="qb-photo">
        <span class="qb-badge">Daily challenge</span>
        <img src="${esc(photoSmall(daily.answer.photo))}" alt="${answered ? `Photo of ${esc(daily.answer.name)}` : 'Mystery fish photo'}" onerror="if(!this.dataset.f){this.dataset.f=1;this.src='${esc(daily.answer.photo.src)}'}" />
      </div>
      <div>
        <p class="sec-kicker">Name that fish · +5 points</p>
        <h2 class="qb-q" id="quiz-title">${answered ? (answered.correct ? 'Nailed it.' : 'Not this time.') : 'Can you name today\'s fish?'}</h2>
        <p class="qb-sub">${answered ? `It's the <b>${esc(daily.answer.name)}</b>. New fish tomorrow.` : 'One guess a day. Get it right to earn points and grow your streak.'}</p>
        <div class="qb-opts" role="group" aria-label="Choose the species">
          ${daily.options.map((o) => `<button class="qb-opt ${answered ? (o.id === daily.answer.id ? 'is-right' : (o.id === answered.speciesId && !answered.correct ? 'is-wrong' : '')) : ''}" type="button" data-guess="${o.id}" ${answered ? 'disabled' : ''}>${esc(o.name)}</button>`).join('')}
        </div>
        <p class="qb-result" id="qb-result" aria-live="polite">${answered ? `<a href="#/species/${daily.answer.id}">Learn about the ${esc(daily.answer.name)} ${icon('arrowRight', 14)}</a>` : `<button class="link-btn" type="button" id="qb-hint">${icon('help', 14)} Show a hint</button>`}</p>
        <div class="qb-meta"><span>Streak <b>${streak}</b> ${plural(streak, 'day')}</span><span>Named <b>${getDaily().filter((d) => d.correct).length}</b> fish</span></div>
      </div>
    </div>
  </section>

  <section class="sec" aria-labelledby="fod-title">
    <div class="fod">
      <div>
        <a href="#/species/${fod.id}" data-cursor="Read more" style="display:block">${fishPhoto(fod, { small: false, tag: 'Fish of the day' })}</a>
        <p class="photo-credit">${photoCredit(fod.photo)}</p>
      </div>
      <div>
        <p class="sec-kicker">Fish of the day</p>
        <h2 id="fod-title" style="font-size:clamp(1.8rem,3.2vw,2.6rem);letter-spacing:-.04em">${esc(fod.name)}</h2>
        <p class="muted" style="font-family:var(--mono);font-size:.8rem;margin-top:.3rem"><i>${esc(fod.scientific)}</i></p>
        <p style="margin-top:1rem;line-height:1.65">${esc(fod.looks)}</p>
        <dl class="fod-facts">
          <div><dt>Size</dt><dd>${esc(fod.size)}</dd></div>
          <div><dt>Handling</dt><dd>${esc(DANGER[fod.danger].label)}</dd></div>
          <div><dt>Best tip</dt><dd>${esc(fod.catchHow[0].split('.')[0])}</dd></div>
          <div><dt>Where</dt><dd>${fod.spots.slice(0, 2).map((id) => esc(getSpot(id)?.name || '')).join(', ')}</dd></div>
        </dl>
        <div class="dh-actions" style="margin-top:1.4rem">
          <a class="btn btn-primary" href="#/species/${fod.id}">${icon('fish', 16)} Full species guide</a>
          ${fod.spots[0] ? `<a class="btn btn-secondary" href="#/map/${fod.spots[0]}">${icon('map', 16)} Where to find it</a>` : ''}
        </div>
      </div>
    </div>
  </section>

  <div class="sec" style="padding-top:3.5rem">
    <div class="sec-head"><div><p class="sec-kicker">Your fishing</p><h2>Trips, plans and <em>progress</em></h2></div></div>
  </div>
  <div class="dsec-grid" style="padding-top:0">
    <section class="dsec" aria-labelledby="chart-title">
      <header class="dsec-head"><h2 id="chart-title">Completed trips</h2><span class="sub">Last six months</span></header>
      <div class="chart-wrap">
        ${stats.completedCount ? chart(trips) : emptyState({ iconName: 'chart', title: 'No completed trips yet', text: 'Log your first trip and your monthly chart appears here.' })}
        <div class="chart-legend"><span class="swatch"></span> Completed trips per month · planned trips are not counted</div>
      </div>
    </section>

    <section class="dsec dsec-bold" aria-labelledby="next-title">
      <header class="dsec-head"><h2 id="next-title">Next planned trip</h2><a class="sub" href="#/trips?filter=planned">All planned</a></header>
      ${next ? `
      <div class="next-trip">
        <p class="nt-date">${formatDateLong(next.date)}</p>
        <span class="countdown">${relativeDayLabel(next.date)}</span>
        <div class="where">${icon('locations', 15)} ${esc(next.location)} ${nextSpot ? spotBadge(nextSpot.status, true) : ''}</div>
        ${nextSpot ? `<div class="wx-inline" id="next-wx" data-lat="${nextSpot.lat}" data-lng="${nextSpot.lng}">${icon('cloud', 15)} <span>Checking the NEA forecast…</span></div>` : ''}
        <div class="next-trip-actions">
          <button class="btn btn-white btn-sm" type="button" data-action="complete-trip" data-id="${next.id}">${icon('check', 15)} Mark completed</button>
          <button class="btn btn-outline-white btn-sm" type="button" data-action="edit-trip" data-id="${next.id}">${icon('edit', 15)} Edit</button>
          ${nextSpot ? `<a class="btn btn-outline-white btn-sm" href="#/map/${nextSpot.id}">${icon('route', 15)} How to get there</a>` : ''}
        </div>
      </div>` : emptyState({ iconName: 'calendar', title: 'No trip planned', text: 'Pick a listed spot on the map and plan your next outing.', action: `<button class="btn btn-white btn-sm" type="button" data-action="plan-trip">${icon('plus', 15)} Plan a trip</button>` })}
      ${overdue.length ? `<div class="notice notice-amber" style="margin-top:1rem">${icon('alert', 16)}<div>${overdue.length} planned ${plural(overdue.length, 'trip')} already passed. <a href="#/trips?filter=planned">Mark ${plural(overdue.length, 'it', 'them')} completed</a> or delete.</div></div>` : ''}
    </section>
  </div>

  <div class="dsec-grid">
    <section class="dsec" aria-labelledby="recent-title">
      <header class="dsec-head"><h2 id="recent-title">Recent trips</h2><a class="sub" href="#/trips">View all</a></header>
      <div class="row-list">
        ${recent.length ? recent.map(recentRow).join('') : emptyState({ iconName: 'fish', title: 'Nothing logged yet', text: 'Completed trips show up here.', action: `<button class="btn btn-primary btn-sm" type="button" data-action="log-trip">${icon('plus', 15)} Log a trip</button>` })}
      </div>
    </section>

    <section class="dsec dsec-tint" aria-labelledby="learn-title">
      <header class="dsec-head"><h2 id="learn-title">Continue learning</h2><a class="sub" href="#/academy">Academy</a></header>
      ${learn ? `
        <p class="muted" style="margin-bottom:.8rem">${esc(learn.track.title)} track · ${learn.lesson.minutes} min</p>
        <a class="lesson-link" href="#/academy/${learn.lesson.id}">
          <span><b>${esc(learn.lesson.title)}</b><span>Lesson + quiz · up to 50 points</span></span>${icon('chevronRight', 18)}
        </a>` : `<p class="muted">All three tracks complete. Share what you know in <a href="#/community">Community</a>.</p>`}

      <h3 class="dsec-sub" id="coach-title">${icon('sparkles', 16)} Ask FishWise</h3>
      <p class="muted small" style="margin:.2rem 0 .7rem">${aiConnected() ? 'AI coach powered by Claude, grounded in official rules.' : 'Searching FishWise guides offline. Connect the AI backend for full answers.'}</p>
      <form class="ask-form" id="ask-form">
        <label class="sr-only" for="ask-input">Your question</label>
        <input class="input" id="ask-input" maxlength="300" placeholder="e.g. What bait can I use at reservoirs?" autocomplete="off" />
        <button class="btn btn-primary" type="submit" aria-label="Ask">${icon('send', 16)}</button>
      </form>
      <div id="ask-out" class="ask-out" aria-live="polite"></div>
    </section>
  </div>

  <section class="sec" aria-labelledby="ql-title">
    <div class="sec-head"><div><p class="sec-kicker">Jump in</p><h2 id="ql-title">Where to next?</h2></div></div>
    <div class="qlinks stagger">
      <a class="qlink" href="#/weather"><span class="ico">${icon('wind', 20)}</span><b>Check the weather</b><span>Wind, rain and heat maps</span></a>
      <a class="qlink" href="#/fishid"><span class="ico">${icon('camera', 20)}</span><b>Identify a catch</b><span>From a photo, in seconds</span></a>
      <a class="qlink" href="#/store"><span class="ico">${icon('bag', 20)}</span><b>Build a starter kit</b><span>Chat with the gear advisor</span></a>
      <a class="qlink" href="#/events"><span class="ico">${icon('calendar', 20)}</span><b>Book a session</b><span>Gear provided, coach on site</span></a>
    </div>
  </section>

  <a class="resp-strip" href="#/academy/b5-safety">
    <span class="rs-title">${icon('shield', 18)} Fish responsibly</span>
    <span class="rs-item">${icon('check', 14)} Only fish at signed, designated areas</span>
    <span class="rs-item">${icon('check', 14)} Take every hook and line offcut home</span>
    <span class="rs-item">${icon('check', 14)} Thunder means stop</span>
    <span class="rs-go">${icon('chevronRight', 18)}</span>
  </a>`;
}

/* Swipeable "seven sections" carousel: native horizontal scrolling (touch,
   trackpad, shift+wheel, keyboard) plus mouse drag and arrow buttons.
   Vertical scrolling over it always scrolls the page. */
function initShowcase(root) {
  const sec = root.querySelector('#showcase');
  const track = root.querySelector('#sc-track');
  if (!sec || !track) return () => {};
  const slides = [...track.querySelectorAll('.slide')];
  const prev = root.querySelector('#sc-prev');
  const next = root.querySelector('#sc-next');
  const now = root.querySelector('#sc-now');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let raf = 0;
  const pad = () => parseFloat(getComputedStyle(track).paddingLeft) || 0;
  const current = () => {
    const x = track.getBoundingClientRect().left + pad();
    let best = 0, bd = Infinity;
    slides.forEach((s, i) => { const d = Math.abs(s.getBoundingClientRect().left - x); if (d < bd) { bd = d; best = i; } });
    return best;
  };
  const update = () => {
    raf = 0;
    const max = track.scrollWidth - track.clientWidth;
    const p = max > 0 ? track.scrollLeft / max : 0;
    sec.style.setProperty('--hs-p', p.toFixed(4));
    const x = track.getBoundingClientRect().left + pad();
    slides.forEach((s) => {
      const r = s.getBoundingClientRect();
      s.style.setProperty('--d', Math.min(1, Math.abs(r.left - x) / r.width).toFixed(3));
    });
    const i = current();
    now.textContent = String(i + 1).padStart(2, '0');
    prev.disabled = track.scrollLeft < 4;
    next.disabled = track.scrollLeft > max - 4;
  };
  const queue = () => { if (!raf) raf = requestAnimationFrame(update); };
  const go = (i) => {
    const t = slides[Math.max(0, Math.min(slides.length - 1, i))];
    track.scrollTo({ left: t.offsetLeft - pad(), behavior: reduce ? 'auto' : 'smooth' });
  };
  prev.addEventListener('click', () => go(current() - 1));
  next.addEventListener('click', () => go(current() + 1));
  track.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);

  // Mouse drag (touch and pens already scroll natively).
  let drag = null, moved = false;
  track.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    drag = { x: e.clientX, left: track.scrollLeft, t: performance.now(), i: current() };
    moved = false;
  });
  window.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!moved && Math.abs(dx) > 6) { moved = true; track.classList.add('is-drag'); }
    if (moved) { track.scrollLeft = drag.left - dx; e.preventDefault(); }
  });
  const end = (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const fast = Math.abs(dx) / Math.max(1, performance.now() - drag.t) > 0.5;
    const drag0 = drag.i;
    drag = null;
    if (!moved) return;
    track.classList.remove('is-drag');
    go(fast && Math.abs(dx) > 30 ? drag0 + (dx < 0 ? 1 : -1) : current());
  };
  window.addEventListener('pointerup', end);
  // Swallow the click that ends a drag so it does not open the slide.
  track.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
  track.addEventListener('dragstart', (e) => e.preventDefault());
  update();
  return () => {
    window.removeEventListener('resize', queue);
    window.removeEventListener('pointerup', end);
    cancelAnimationFrame(raf);
  };
}

export function mount(root, ctx) {
  const offShowcase = initShowcase(root);
  maybeWelcome();
  // Display name editing
  const form = root.querySelector('#name-form');
  const input = root.querySelector('#name-input');
  const err = root.querySelector('#name-err');
  root.querySelector('#edit-name').addEventListener('click', () => {
    form.hidden = false;
    input.focus();
    input.select();
  });
  root.querySelector('#name-cancel').addEventListener('click', () => {
    form.hidden = true;
    input.value = ctx.profile.displayName;
    err.classList.remove('is-shown');
    input.removeAttribute('aria-invalid');
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = input.value.trim();
    if (!name || name.length > 40) {
      err.classList.add('is-shown');
      input.setAttribute('aria-invalid', 'true');
      input.focus();
      return;
    }
    saveProfile({ displayName: name });
    toast('Display name updated');
    ctx.refresh();
  });

  // Live conditions: hero chip + next trip
  const live = root.querySelector('#live-chip');
  const wx = root.querySelector('#next-wx');
  getTwoHour()
    .then((data) => {
      const b = getSpot('bedok-jetty');
      const a = nearest(data.areas, b.lat, b.lng);
      if (live?.isConnected) live.innerHTML = `<i></i> Live · ${esc(a.forecast)} at ${esc(a.name)}`;
      if (wx?.isConnected) {
        const area = nearest(data.areas, Number(wx.dataset.lat), Number(wx.dataset.lng));
        const risk = fishingRisk(area.forecast);
        wx.className = `wx-inline tone-${risk.tone}`;
        wx.innerHTML = `${icon(risk.icon, 15)} <span><b>${esc(area.forecast)}</b> now near ${esc(area.name)} · <a href="#/weather">Weather lab</a></span>`;
      }
    })
    .catch(() => {
      if (live?.isConnected) live.innerHTML = '<i></i> Live weather unavailable';
      if (wx?.isConnected) wx.innerHTML = `${icon('cloud', 15)} <span>Live forecast unavailable right now. <a href="#/weather">Retry</a></span>`;
    });

  // Daily "Name that fish"
  const today = todayISO();
  const daily = dailyPick(today);
  const photo = root.querySelector('#qb-photo');
  const result = root.querySelector('#qb-result');
  root.querySelector('#qb-hint')?.addEventListener('click', (e) => {
    photo.classList.add('is-hinted');
    e.currentTarget.outerHTML = `<span>${icon('info', 14)} Hint: ${esc(daily.answer.looks.split('.')[0])}.</span>`;
  });
  root.querySelectorAll('[data-guess]').forEach((b) => b.addEventListener('click', () => {
    if (getDaily().some((d) => d.date === today)) return;
    const correct = b.dataset.guess === daily.answer.id;
    recordDaily(today, b.dataset.guess, correct);
    root.querySelectorAll('[data-guess]').forEach((x) => {
      x.disabled = true;
      if (x.dataset.guess === daily.answer.id) x.classList.add('is-right');
    });
    if (!correct) b.classList.add('is-wrong');
    photo.classList.add('is-revealed');
    photo.querySelector('img').alt = `Photo of ${daily.answer.name}`;
    root.querySelector('#quiz-title').textContent = correct ? 'Nailed it.' : 'Not this time.';
    result.innerHTML = correct
      ? `<b>+5 points.</b> It's the ${esc(daily.answer.name)}. <a href="#/species/${daily.answer.id}">Learn more ${icon('arrowRight', 14)}</a>`
      : `It's the <b>${esc(daily.answer.name)}</b>. <a href="#/species/${daily.answer.id}">See how to recognise it ${icon('arrowRight', 14)}</a>`;
    if (correct) toast('+5 points — fish named!', 'star');
    ctx.refreshChrome();
  }));

  // Ask FishWise
  const askForm = root.querySelector('#ask-form');
  const askInput = root.querySelector('#ask-input');
  const out = root.querySelector('#ask-out');
  askForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = askInput.value.trim();
    if (q.length < 3) {
      out.innerHTML = `<p class="field-error is-shown">${icon('alert', 13)}<span>Type a question of at least 3 characters.</span></p>`;
      return;
    }
    if (aiConnected()) {
      const btn = askForm.querySelector('button');
      btn.disabled = true;
      out.innerHTML = `<p class="loading-line"><span class="spinner"></span> Thinking…</p>`;
      try {
        const answer = await askCoach(q);
        out.innerHTML = `<div class="ai-answer">${esc(answer).replace(/\n/g, '<br>')}</div>`;
      } catch (error) {
        out.innerHTML = `<div class="notice notice-amber">${icon('alert', 16)}<div>${esc(error.message)} Showing offline results instead.</div></div>` + offlineHTML(q);
      } finally {
        btn.disabled = false;
      }
      return;
    }
    out.innerHTML = offlineHTML(q);
  });
  return offShowcase;
}

function offlineHTML(q) {
  const hits = offlineAnswer(q);
  if (!hits.length) {
    return `<p class="muted">No guide matched that. Try words like “bait”, “hooks”, “Changi” or “stingray”, or ask in <a href="#/community">Community</a>.</p>`;
  }
  return `<ul class="hit-list">${hits.map((h) => `
    <li><a href="${h.route}"><span class="hit-kind">${h.kind}</span><b>${esc(h.title)}</b>${h.snippet ? `<span>${esc(h.snippet)}</span>` : ''}</a></li>`).join('')}</ul>`;
}
