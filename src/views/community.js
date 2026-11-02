/**
 * Community — beginners ask, experienced anglers answer and earn points.
 * #/community           Q&A
 * #/community/leaders   leaderboard + how points work
 * #/community/rewards   spend points
 *
 * Sample people and posts are labelled. Without a backend, your posts are
 * stored only in this browser (see README for the Supabase plan).
 */

import { icon } from '../icons.js';
import { esc, toast, confirmDialog, initials } from '../ui.js';
import { allPosts, addPost, addAnswer, toggleHelpful, leaderboard, getPoints, getRedemptions, redeem } from '../progress.js';
import { REWARDS } from '../data/community.js';
import { POINTS } from '../data/courses.js';
import { pageHead, sampleChip } from '../components.js';

const TAGS = ['rules', 'gear', 'technique', 'handling', 'safety', 'spots', 'beginner'];

function ago(iso) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    return mins < 60 ? `${Math.max(1, mins)} min ago` : `${Math.floor(mins / 60)} h ago`;
  }
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

function avatar(author) {
  const txt = author.initials || initials(author.name);
  return `<span class="avatar ${author.isYou ? 'is-you' : ''}" aria-hidden="true">${esc(txt)}</span>`;
}

function tabs(active) {
  const t = [['', 'Questions', 'community'], ['leaders', 'Leaderboard', 'trophy'], ['rewards', 'Rewards', 'gift']];
  return `<nav class="segmented" aria-label="Community sections" style="margin-bottom:1rem">
    ${t.map(([k, l, ic]) => `<a class="seg" href="#/community${k ? '/' + k : ''}" aria-pressed="${active === k}" ${active === k ? 'aria-current="page"' : ''}>${icon(ic, 14)} ${l}</a>`).join('')}
  </nav>`;
}

function questions(ctx) {
  const posts = allPosts(ctx.profile.displayName);
  return `
  <div class="community-layout">
    <section class="post-list">
      ${posts.map((p) => `
        <article class="card post" id="post-${p.id}">
          <header class="post-head">
            ${avatar(p.author)}
            <div>
              <b>${esc(p.author.name)}</b> ${p.author.isYou ? '<span class="badge badge-completed">You</span>' : `<span class="badge badge-planned">${esc(p.author.badge || '')}</span>`}
              <span class="small muted"> · ${ago(p.at)}</span> ${p.isSample ? sampleChip() : ''}
            </div>
          </header>
          <h2 class="post-title">${esc(p.title)}</h2>
          <p class="post-body">${esc(p.body)}</p>
          <div class="chip-row">${p.tags.map((t) => `<span class="chip">#${esc(t)}</span>`).join('')}</div>
          <div class="answers">
            ${p.answers.map((a) => `
              <div class="answer">
                ${avatar(a.author)}
                <div class="answer-main">
                  <div class="small"><b>${esc(a.author.name)}</b> ${a.author.badge ? `<span class="muted">· ${esc(a.author.badge)}${a.author.years ? `, ${a.author.years} yrs` : ''}</span>` : ''} <span class="muted">· ${ago(a.at)}</span></div>
                  <p>${esc(a.body)}</p>
                  <button class="helpful ${a.markedHelpful ? 'is-on' : ''}" type="button" data-helpful="${esc(a.key)}" aria-pressed="${a.markedHelpful}">
                    ${icon('thumbsUp', 14)} Helpful${a.helpfulCount ? ` · ${a.helpfulCount}` : ''}
                  </button>
                </div>
              </div>`).join('') || '<p class="small muted">No answers yet — be the first.</p>'}
          </div>
          <form class="answer-form" data-answer-for="${p.id}" novalidate>
            <label class="sr-only" for="ans-${p.id}">Your answer</label>
            <textarea class="textarea" id="ans-${p.id}" rows="2" maxlength="1000" placeholder="Share what you know… (+${POINTS.answer} points)"></textarea>
            <p class="field-error">${icon('alert', 13)}<span>Write at least 10 characters.</span></p>
            <button class="btn btn-secondary btn-sm" type="submit">${icon('send', 14)} Post answer</button>
          </form>
        </article>`).join('')}
    </section>

    <aside class="dash-col">
      <form class="card card-pad ask-card" id="ask-q" novalidate>
        <h2 class="card-title">${icon('community', 17)} Ask the community</h2>
        <p class="small muted" style="margin:.3rem 0 .8rem">Mentors answer questions and earn points for helping. +${POINTS.question} points for asking.</p>
        <div class="field">
          <label for="q-title">Question</label>
          <input class="input" id="q-title" maxlength="140" placeholder="e.g. Best lure for Kranji?" aria-describedby="q-title-err" />
          <span class="field-error" id="q-title-err">${icon('alert', 13)}<span>Write a question of at least 8 characters.</span></span>
        </div>
        <div class="field" style="margin-top:.7rem">
          <label for="q-body">Details <span class="opt">(optional)</span></label>
          <textarea class="textarea" id="q-body" maxlength="1000" rows="3" placeholder="Where, when, what you tried"></textarea>
        </div>
        <div class="field" style="margin-top:.7rem">
          <label for="q-tag">Topic</label>
          <select class="select" id="q-tag">${TAGS.map((t) => `<option value="${t}">${t}</option>`).join('')}</select>
        </div>
        <button class="btn btn-primary btn-block" type="submit" style="margin-top:.9rem">${icon('send', 15)} Post question</button>
        <p class="small muted" style="margin-top:.6rem">Prototype: your posts are saved in this browser only.</p>
      </form>
    </aside>
  </div>`;
}

function leaders(ctx) {
  const board = leaderboard(ctx.profile.displayName);
  const pts = getPoints();
  return `
  <div class="community-layout">
    <section class="card">
      <div class="card-head"><h2>Leaderboard</h2><span class="sub">Sample mentors + you</span></div>
      <ol class="leader-list">
        ${board.map((r, i) => `
          <li class="leader ${r.isYou ? 'is-you' : ''}">
            <span class="rank">${i + 1}</span>
            ${avatar(r)}
            <span class="leader-main"><b>${esc(r.name)}</b> ${r.isYou ? '<span class="badge badge-completed">You</span>' : sampleChip()}<span class="small muted">${esc(r.badge)}</span></span>
            <span class="leader-pts">${r.points.toLocaleString()}<small> pts</small></span>
          </li>`).join('')}
      </ol>
    </section>
    <aside class="card">
      <div class="card-head"><h2>Your points</h2><span class="sub">${pts.earned} earned</span></div>
      <table class="pts-table">
        <thead><tr><th scope="col">Activity</th><th scope="col">Count</th><th scope="col">Points</th></tr></thead>
        <tbody>
          ${pts.items.map((i) => `<tr><td>${esc(i.label)} <span class="muted small">(${i.each} each)</span></td><td>${i.count}</td><td>${i.total}</td></tr>`).join('')}
          <tr class="pts-spent"><td>Spent on rewards</td><td></td><td>−${pts.spent}</td></tr>
        </tbody>
        <tfoot><tr><th scope="row">Balance</th><td></td><td>${pts.balance}</td></tr></tfoot>
      </table>
    </aside>
  </div>`;
}

function rewards() {
  const pts = getPoints();
  const mine = getRedemptions().slice().reverse();
  return `
  <div class="balance-strip card card-pad">
    ${icon('star', 22)} <div><b>${pts.balance} points</b> available <span class="muted small">· ${pts.earned} earned all-time, ${pts.spent} spent</span></div>
  </div>
  <div class="reward-grid">
    ${REWARDS.map((r) => {
      const short = r.cost - pts.balance;
      return `
      <article class="card card-pad reward">
        <span class="track-ico">${icon('gift', 20)}</span>
        <h2>${esc(r.title)}</h2>
        <p class="small muted">${esc(r.description)}</p>
        <div class="reward-foot">
          <b>${r.cost} pts</b>
          <button class="btn ${short > 0 ? 'btn-secondary' : 'btn-primary'} btn-sm" type="button" data-redeem="${r.id}" ${short > 0 ? 'disabled' : ''}>
            ${short > 0 ? `${icon('lock', 14)} ${short} more needed` : `${icon('gift', 14)} Redeem`}
          </button>
        </div>
      </article>`;
    }).join('')}
  </div>
  <section class="card" style="margin-top:1rem">
    <div class="card-head"><h2>Your redemptions</h2><span class="sub">Demo codes — not valid anywhere</span></div>
    ${mine.length ? `<div class="row-list">${mine.map((m) => {
      const r = REWARDS.find((x) => x.id === m.rewardId);
      return `<div class="row"><span class="stat-ico">${icon('ticket', 15)}</span><div class="row-main"><div class="row-title">${esc(r.title)}</div><div class="row-meta"><span>Code <code>${esc(m.code)}</code></span></div></div></div>`;
    }).join('')}</div>` : `<div class="empty"><p>Earn points by logging trips, finishing lessons and answering questions.</p></div>`}
  </section>`;
}

export function render(ctx, param) {
  const tab = ['leaders', 'rewards'].includes(param) ? param : '';
  return `
  ${pageHead({
    eyebrow: 'Community',
    title: 'Anglers helping anglers',
    lede: 'Ask questions, learn from experienced mentors and earn points for helping newcomers fish safely and legally.',
  })}
  <div class="notice" style="margin-bottom:1rem">${icon('info', 16)}<div>Mentors, posts and leaderboard entries marked <b>Sample</b> are invented demo content.</div></div>
  ${tabs(tab)}
  ${tab === 'leaders' ? leaders(ctx) : tab === 'rewards' ? rewards() : questions(ctx)}`;
}

export function mount(root, ctx) {
  // Ask a question
  const ask = root.querySelector('#ask-q');
  ask?.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = root.querySelector('#q-title');
    const err = root.querySelector('#q-title-err');
    if (title.value.trim().length < 8) {
      err.classList.add('is-shown');
      title.setAttribute('aria-invalid', 'true');
      title.focus();
      return;
    }
    const body = root.querySelector('#q-body').value.trim() || title.value.trim();
    addPost({ title: title.value, body, tags: [root.querySelector('#q-tag').value] });
    toast(`Question posted · +${POINTS.question} points`, 'send');
    ctx.refresh();
  });

  // Answers
  root.querySelectorAll('[data-answer-for]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const ta = form.querySelector('textarea');
      const err = form.querySelector('.field-error');
      if (ta.value.trim().length < 10) {
        err.classList.add('is-shown');
        ta.setAttribute('aria-invalid', 'true');
        ta.focus();
        return;
      }
      addAnswer(form.dataset.answerFor, ta.value);
      toast(`Answer posted · +${POINTS.answer} points`, 'trophy');
      ctx.refresh();
    });
  });

  root.querySelectorAll('[data-helpful]').forEach((b) => b.addEventListener('click', () => {
    toggleHelpful(b.dataset.helpful);
    ctx.refresh();
  }));

  root.querySelectorAll('[data-redeem]').forEach((b) => b.addEventListener('click', () => {
    const reward = REWARDS.find((r) => r.id === b.dataset.redeem);
    confirmDialog({
      title: 'Redeem this reward?',
      body: `Spend <strong>${reward.cost} points</strong> on “${esc(reward.title)}”. This is a prototype — the code you get is a demo code.`,
      confirmLabel: 'Redeem',
      tone: 'primary',
      onConfirm() {
        const res = redeem(reward.id);
        if (res.ok) toast(`Redeemed · code ${res.code}`, 'gift');
        else toast(res.reason, 'alert');
        ctx.refresh();
      },
    });
  }));
}
