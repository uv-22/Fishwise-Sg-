/**
 * Personal dashboard. Every number is computed from stored records:
 * trip stats from the trip log, points from progress.js.
 */

import { icon } from '../icons.js';
import { esc, formatDateLong, formatDateShort, relativeDayLabel, monthLabel, formatHours, plural, toast } from '../ui.js';
import { getStats, monthlyCompleted, recentCompleted, nextPlanned, overduePlanned, saveProfile } from '../store.js';
import { nextLesson } from '../progress.js';
import { pageHead, emptyState, spotBadge, getSpot } from '../components.js';
import { aiConnected, askCoach, offlineAnswer } from '../services/ai.js';
import { getTwoHour, nearest, fishingRisk } from '../services/weather.js';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
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
      <rect class="bar ${m.count ? '' : 'bar-zero'}" x="${cx - barW / 2}" y="${padT + plotH - h}" width="${barW}" height="${h}" rx="5"/>
      ${m.count ? `<text class="bar-val" x="${cx}" y="${padT + plotH - h - 6}" text-anchor="middle">${m.count}</text>` : ''}
      <text class="x-tick" x="${cx}" y="${H - 7}" text-anchor="middle">${monthLabel(m.month)}</text>
    </g>`;
  }).join('');

  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="list" aria-label="Completed trips per month, last six months">${grid}${bars}</svg>`;
}

function statCard(iconName, label, value, foot) {
  return `
  <div class="stat">
    <div class="stat-top"><span class="stat-ico">${icon(iconName, 15)}</span><span class="stat-label">${label}</span></div>
    <div class="stat-value">${value}</div>
    <div class="stat-foot">${foot}</div>
  </div>`;
}

function recentRow(trip) {
  const spot = trip.spotId ? getSpot(trip.spotId) : null;
  return `
  <div class="row">
    <span class="stat-ico" style="width:34px;height:34px">${icon('fish', 16)}</span>
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

export function render(ctx) {
  const { profile, trips, points } = ctx;
  const stats = getStats(trips);
  const recent = recentCompleted(trips, 4);
  const next = nextPlanned(trips);
  const overdue = overduePlanned(trips);
  const learn = nextLesson(ctx.learning);
  const lvl = points.level;
  const nextSpot = next?.spotId ? getSpot(next.spotId) : null;

  return `
  ${pageHead({
    eyebrow: 'Your dashboard',
    title: `<span class="greet"><span id="greet-text">${greeting()}, ${esc(profile.displayName)}</span>
      <button class="btn-icon" type="button" id="edit-name" aria-label="Edit display name">${icon('edit', 16)}</button></span>`,
    lede: 'Your trips, progress and what to do next — all worked out from your own records.',
    actions: `
      <a class="btn btn-secondary" href="#/map">${icon('map', 16)} Find a spot</a>
      <button class="btn btn-primary" type="button" data-action="log-trip">${icon('plus', 16)} Log a trip</button>`,
  })}

  <form class="name-form card card-pad" id="name-form" hidden style="margin:-.4rem 0 1rem">
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

  <section class="card level-card" aria-label="Points and level">
    <div class="level-badge">${icon('trophy', 20)}</div>
    <div class="level-main">
      <div class="level-top">
        <b>${lvl.current.name}</b>
        <span>${points.balance} points to spend · ${points.earned} earned</span>
      </div>
      <div class="meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${lvl.pct}" aria-label="Progress to next level">
        <span style="width:${lvl.pct}%"></span>
      </div>
      <div class="level-foot">${lvl.next ? `${lvl.next.min - points.earned} points to <b>${lvl.next.name}</b>` : 'Top level reached — thank you for mentoring.'}</div>
    </div>
    <a class="btn btn-ghost btn-sm" href="#/community/rewards">${icon('gift', 15)} Rewards</a>
  </section>

  <section class="stat-grid" aria-label="Trip statistics">
    ${statCard('calendarCheck', 'Completed trips', stats.completedCount, `${stats.plannedCount} planned`)}
    ${statCard('clock', 'Fishing hours', `${formatHours(stats.totalHours)}<small> h</small>`, `${formatHours(stats.avgHours)} h average`)}
    ${statCard('target', 'Fish caught', stats.fishCaught, 'Across completed trips')}
    ${statCard('release', 'Released', stats.fishReleased, stats.releaseRate === null ? 'No catches yet' : `${stats.releaseRate}% release rate`)}
  </section>

  <div class="dash-grid">
    <div class="dash-col">
      <section class="card" aria-labelledby="chart-title">
        <div class="card-head"><h2 id="chart-title">Completed trips</h2><span class="sub">Last six months</span></div>
        <div class="chart-wrap">
          ${stats.completedCount ? chart(trips) : emptyState({ iconName: 'chart', title: 'No completed trips yet', text: 'Log your first trip and your monthly chart appears here.' })}
          <div class="chart-legend"><span class="swatch"></span> Completed trips per month · planned trips are not counted</div>
        </div>
      </section>

      <section class="card" aria-labelledby="recent-title">
        <div class="card-head"><h2 id="recent-title">Recent trips</h2><a class="sub" href="#/trips">View all</a></div>
        <div class="row-list">
          ${recent.length ? recent.map(recentRow).join('') : emptyState({ iconName: 'fish', title: 'Nothing logged yet', text: 'Completed trips show up here.', action: `<button class="btn btn-primary btn-sm" type="button" data-action="log-trip">${icon('plus', 15)} Log a trip</button>` })}
        </div>
      </section>
    </div>

    <div class="dash-col">
      <section class="card" aria-labelledby="next-title">
        <div class="card-head"><h2 id="next-title">Next planned trip</h2><a class="sub" href="#/trips?filter=planned">All planned</a></div>
        ${next ? `
        <div class="next-trip">
          <div class="when">${formatDateLong(next.date)} <span class="countdown">${relativeDayLabel(next.date)}</span></div>
          <div class="where">${icon('locations', 15)} ${esc(next.location)} ${nextSpot ? spotBadge(nextSpot.status, true) : ''}</div>
          ${nextSpot ? `<div class="wx-inline" id="next-wx" data-lat="${nextSpot.lat}" data-lng="${nextSpot.lng}">${icon('cloud', 15)} <span>Checking the NEA forecast…</span></div>` : ''}
          <div class="next-trip-actions">
            <button class="btn btn-primary btn-sm" type="button" data-action="complete-trip" data-id="${next.id}">${icon('check', 15)} Mark completed</button>
            <button class="btn btn-secondary btn-sm" type="button" data-action="edit-trip" data-id="${next.id}">${icon('edit', 15)} Edit</button>
            ${nextSpot ? `<a class="btn btn-ghost btn-sm" href="#/map/${nextSpot.id}">${icon('map', 15)} View spot</a>` : ''}
          </div>
        </div>` : emptyState({ iconName: 'calendar', title: 'No trip planned', text: 'Pick a listed spot on the map and plan your next outing.', action: `<button class="btn btn-primary btn-sm" type="button" data-action="plan-trip">${icon('plus', 15)} Plan a trip</button>` })}
        ${overdue.length ? `<div class="notice notice-amber" style="margin:0 1.25rem 1.1rem">${icon('alert', 16)}<div>${overdue.length} planned ${plural(overdue.length, 'trip')} already passed. <a href="#/trips?filter=planned">Mark ${plural(overdue.length, 'it', 'them')} completed</a> or delete.</div></div>` : ''}
      </section>

      <section class="card card-pad" aria-labelledby="learn-title">
        <h2 id="learn-title" class="card-title">${icon('academy', 18)} Continue learning</h2>
        ${learn ? `
          <p class="muted" style="margin:.4rem 0 .8rem">${esc(learn.track.title)} track · ${learn.lesson.minutes} min</p>
          <a class="lesson-link" href="#/academy/${learn.lesson.id}">
            <span><b>${esc(learn.lesson.title)}</b><span>Lesson + quiz · up to 50 points</span></span>${icon('chevronRight', 18)}
          </a>` : `<p class="muted" style="margin-top:.4rem">All three tracks complete. Share what you know in <a href="#/community">Community</a>.</p>`}
      </section>

      <section class="card card-pad" aria-labelledby="coach-title">
        <h2 id="coach-title" class="card-title">${icon('sparkles', 18)} Ask FishWise</h2>
        <p class="muted" style="margin:.35rem 0 .75rem">${aiConnected() ? 'AI coach powered by Claude, grounded in official rules.' : 'Searching FishWise guides offline. Connect the AI backend for full answers.'}</p>
        <form class="ask-form" id="ask-form">
          <label class="sr-only" for="ask-input">Your question</label>
          <input class="input" id="ask-input" maxlength="300" placeholder="e.g. What bait can I use at reservoirs?" autocomplete="off" />
          <button class="btn btn-primary" type="submit" aria-label="Ask">${icon('send', 16)}</button>
        </form>
        <div id="ask-out" class="ask-out" aria-live="polite"></div>
      </section>

      <a class="card reminder-card reminder-link" href="#/academy/b5-safety">
        <h3>${icon('shield', 17)} Fish responsibly</h3>
        <ul class="reminder-list">
          <li>${icon('check', 13)}<span>Only fish at signed, designated areas — never a whole reservoir.</span></li>
          <li>${icon('check', 13)}<span>Take every hook, line offcut and wrapper home.</span></li>
          <li>${icon('check', 13)}<span>Thunder means stop. A rod conducts lightning.</span></li>
        </ul>
      </a>
    </div>
  </div>`;
}

export function mount(root, ctx) {
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

  // Weather for the next trip's spot
  const wx = root.querySelector('#next-wx');
  if (wx) {
    getTwoHour()
      .then((data) => {
        const area = nearest(data.areas, Number(wx.dataset.lat), Number(wx.dataset.lng));
        const risk = fishingRisk(area.forecast);
        wx.className = `wx-inline tone-${risk.tone}`;
        wx.innerHTML = `${icon(risk.icon, 15)} <span><b>${esc(area.forecast)}</b> now near ${esc(area.name)} · <a href="#/weather">Weather</a></span>`;
      })
      .catch(() => {
        wx.innerHTML = `${icon('cloud', 15)} <span>Live forecast unavailable right now. <a href="#/weather">Retry</a></span>`;
      });
  }

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
}

function offlineHTML(q) {
  const hits = offlineAnswer(q);
  if (!hits.length) {
    return `<p class="muted">No guide matched that. Try words like “bait”, “hooks”, “Changi” or “stingray”, or ask in <a href="#/community">Community</a>.</p>`;
  }
  return `<ul class="hit-list">${hits.map((h) => `
    <li><a href="${h.route}"><span class="hit-kind">${h.kind}</span><b>${esc(h.title)}</b>${h.snippet ? `<span>${esc(h.snippet)}</span>` : ''}</a></li>`).join('')}</ul>`;
}
