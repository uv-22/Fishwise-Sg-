/**
 * FishWise Academy
 *   #/academy              dashboard: progress, search & filters, tracks, community lessons
 *   #/academy/<lessonId>   lesson reader (+ embedded 3D lesson), quiz, notes
 */

import { icon } from '../icons.js';
import { esc, toast, openModal, closeModal, formatDateShort, todayISO } from '../ui.js';
import { TRACKS, POINTS, QUIZ_PASS_RATIO } from '../data/courses.js';
import {
  getLearning, markLessonComplete, recordQuiz, trackProgress, lessonStatus, learningSummary,
  resolveLesson, communityLessons, getNotes, saveNote, toggleSaved, recordScene, nextLesson,
} from '../progress.js';
import { pageHead, renderLessonBlocks } from '../components.js';
import { playerHTML, mountPlayer } from '../three/player.js';
import { getProfile } from '../store.js';

const TRACK_ICON = { beginner: 'compass', amateur: 'target', advanced: 'trophy' };
const filters = { q: '', type: 'all', status: 'any' };

/* ------------------------------------------------------------------
   Overview
   ------------------------------------------------------------------ */

function ring(pct) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return `<svg class="ring" viewBox="0 0 84 84" role="img" aria-label="${pct}% of lessons complete">
    <circle cx="42" cy="42" r="${r}" class="ring-bg"/>
    <circle cx="42" cy="42" r="${r}" class="ring-fg" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct / 100)}"/>
    <text x="42" y="47" text-anchor="middle" class="ring-txt">${pct}%</text></svg>`;
}

const STATUS_LABEL = { new: 'Not started', started: 'In progress', done: 'Complete' };

function matches(lesson, learning, saved) {
  const q = filters.q.trim().toLowerCase();
  if (q) {
    const text = `${lesson.title} ${lesson.summary || ''} ${lesson.body.map((b) => Object.values(b).flat().join(' ')).join(' ')}`.toLowerCase();
    if (!text.includes(q)) return false;
  }
  if (filters.type === '3d' && lesson.kind !== '3d') return false;
  if (filters.type === 'read' && lesson.kind === '3d') return false;
  if (filters.type === 'saved' && !saved.includes(lesson.id)) return false;
  if (filters.status !== 'any' && lessonStatus(lesson, learning) !== filters.status) return false;
  return true;
}

function lessonRow(l, i, learning, saved) {
  const s = lessonStatus(l, learning);
  const quiz = learning.quizzes[l.id];
  return `
  <li>
    <a class="lesson-row is-${s}" href="#/academy/${l.id}">
      <span class="lesson-num">${s === 'done' ? icon('check', 14) : i + 1}</span>
      <span class="lesson-row-main">
        <b>${esc(l.title)} ${saved.includes(l.id) ? `<span class="saved-dot" title="Saved">${icon('bookmark', 11)}</span>` : ''}</b>
        <span>${l.kind === '3d' ? `<span class="kind-3d">${icon('cube', 11)} 3D</span>` : ''}${icon('clock', 11)} ${l.minutes} min · ${STATUS_LABEL[s]}${quiz ? ` · quiz ${quiz.score}/${quiz.total}` : ''}</span>
      </span>
      ${icon('chevronRight', 16)}
    </a>
  </li>`;
}

function lessonsRegion(ctx) {
  const learning = ctx.learning;
  const { saved } = getNotes();
  let shownTotal = 0;
  const tracks = TRACKS.map((track) => {
    const p = trackProgress(track, learning);
    const pct = Math.round(((p.done + p.passed) / (p.total * 2)) * 100);
    const visible = track.lessons.map((l, i) => ({ l, i })).filter(({ l }) => matches(l, learning, saved));
    shownTotal += visible.length;
    if (!visible.length) return '';
    return `
    <section class="card track-card track-${track.id}" aria-labelledby="t-${track.id}">
      <header class="track-head">
        <span class="track-ico">${icon(TRACK_ICON[track.id], 20)}</span>
        <div>
          <h2 id="t-${track.id}">${esc(track.title)}</h2>
          <p class="muted small">${esc(track.subtitle)}</p>
        </div>
        ${p.complete ? `<button class="badge badge-completed cert-btn" type="button" data-cert="${track.id}">${icon('certificate', 12)} Certificate</button>` : ''}
      </header>
      <div class="meter" role="progressbar" aria-label="${esc(track.title)} progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span style="width:${pct}%"></span></div>
      <p class="small muted" style="margin:.4rem 0 .2rem">${p.done}/${p.total} lessons · ${p.passed} quizzes passed · ${track.lessons.filter((l) => l.kind === '3d').length} in 3D</p>
      <ol class="lesson-list">${visible.map(({ l, i }) => lessonRow(l, i, learning, saved)).join('')}</ol>
    </section>`;
  }).join('');

  const community = communityLessons().filter((l) => matches(l, learning, saved));
  shownTotal += community.length;
  const communityHTML = `
  <section class="community-lessons" aria-labelledby="cl-title">
    <div class="section-head">
      <h2 id="cl-title">${icon('community', 18)} Community lessons</h2>
      <a class="btn btn-secondary btn-sm" href="#/studio">${icon('pen', 15)} Write a lesson</a>
    </div>
    ${community.length ? `<div class="cl-grid">${community.map((l) => {
      const s = lessonStatus(l, learning);
      return `<a class="card cl-card" href="#/academy/${l.id}">
        <span class="badge badge-planned">${esc(TRACKS.find((t) => t.id === l.track)?.title || 'Lesson')}</span>
        <h3>${esc(l.title)}</h3>
        <p class="small muted">${esc(l.summary || '')}</p>
        <span class="small muted">${icon('user', 12)} ${esc(l.author)}${l.own ? ' (you)' : ''} · ${l.minutes} min · ${STATUS_LABEL[s]}</span>
      </a>`;
    }).join('')}</div>` : `<div class="card"><div class="empty"><span class="empty-ico">${icon('pen', 20)}</span><h3>No community lessons ${filters.q || filters.type !== 'all' || filters.status !== 'any' ? 'match these filters' : 'yet'}</h3><p>Experienced anglers can share what they know in the Lesson Studio.</p></div></div>`}
  </section>`;

  return `
    <p class="small muted results-count">${shownTotal} lesson${shownTotal === 1 ? '' : 's'} shown</p>
    <div class="track-grid">${tracks || `<div class="card" style="grid-column:1/-1"><div class="empty"><span class="empty-ico">${icon('search', 20)}</span><h3>No lessons match</h3><p>Try a different search or filter.</p><button class="btn btn-secondary btn-sm" type="button" id="clear-lesson-filters">Clear filters</button></div></div>`}</div>
    ${communityHTML}`;
}

function overview(ctx) {
  const sum = learningSummary(ctx.learning);
  const next = nextLesson(ctx.learning);
  return `
  ${pageHead({
    eyebrow: 'FishWise Academy',
    title: 'Learn to fish, step by step',
    lede: `Three tracks from your first cast to mentoring others — with interactive 3D lessons, quizzes and certificates. Lessons earn ${POINTS.lesson} points, passed quizzes ${POINTS.quiz}, finished tracks ${POINTS.track}.`,
    actions: `<a class="btn btn-secondary" href="#/trainer">${icon('cube', 16)} 3D lessons</a><a class="btn btn-primary" href="#/studio">${icon('pen', 16)} Lesson Studio</a>`,
  })}

  <section class="card learn-summary" aria-label="Your learning progress">
    ${ring(sum.pct)}
    <div class="ls-stats">
      <div><b>${sum.done}<small>/${sum.total}</small></b><span>Lessons complete</span></div>
      <div><b>${sum.quizzesPassed}</b><span>Quizzes passed</span></div>
      <div><b>${sum.threeDDone}<small>/${sum.threeDTotal}</small></b><span>3D lessons</span></div>
      <div><b>${sum.certificates.length}<small>/3</small></b><span>Certificates</span></div>
    </div>
    ${next ? `<a class="lesson-link ls-next" href="#/academy/${next.lesson.id}"><span><span class="eyebrow">Up next · ${esc(next.track.title)}</span><b>${esc(next.lesson.title)}</b><span>${next.lesson.kind === '3d' ? '3D lesson · ' : ''}${next.lesson.minutes} min</span></span>${icon('arrowRight', 18)}</a>` : `<div class="ls-next notice notice-teal">${icon('trophy', 16)}<div><strong>All tracks complete!</strong> Share what you know in the Lesson Studio.</div></div>`}
  </section>

  <div class="toolbar lesson-tools">
    <div class="search-box" style="flex:1;min-width:14rem;max-width:26rem">
      ${icon('search', 16)}
      <label class="sr-only" for="lesson-q">Search lessons</label>
      <input class="input" id="lesson-q" placeholder="Search lessons — knots, tides, snakehead…" value="${esc(filters.q)}" autocomplete="off" />
    </div>
    <div class="segmented" role="group" aria-label="Lesson type">
      ${[['all', 'All'], ['read', 'Reading'], ['3d', '3D'], ['saved', 'Saved']].map(([k, l]) => `<button class="seg" type="button" data-ltype="${k}" aria-pressed="${filters.type === k}">${l}</button>`).join('')}
    </div>
    <label class="sr-only" for="lesson-status">Status</label>
    <select class="select select-sm" id="lesson-status" style="width:auto">
      ${[['any', 'Any status'], ['new', 'Not started'], ['started', 'In progress'], ['done', 'Complete']].map(([k, l]) => `<option value="${k}" ${filters.status === k ? 'selected' : ''}>${l}</option>`).join('')}
    </select>
  </div>
  <div id="lessons-region">${lessonsRegion(ctx)}</div>`;
}

function certificate(trackId) {
  const track = TRACKS.find((t) => t.id === trackId);
  const learning = getLearning();
  const dates = track.lessons.map((l) => learning.quizzes[l.id]?.at || learning.completed[l.id]).filter(Boolean).sort();
  const date = dates.length ? dates[dates.length - 1].slice(0, 10) : todayISO();
  openModal({
    labelledBy: 'cert-title',
    html: `
    <div class="modal-head"><h2 id="cert-title">${esc(track.title)} certificate</h2>
      <button class="btn-icon" type="button" data-close aria-label="Close">${icon('close', 18)}</button></div>
    <div class="modal-body">
      <div class="certificate" id="certificate">
        <div class="cert-mark">${icon('fish', 26)}</div>
        <p class="cert-eyebrow">FishWise Academy</p>
        <h3>Certificate of completion</h3>
        <p class="cert-line">This certifies that</p>
        <p class="cert-name">${esc(getProfile().displayName)}</p>
        <p class="cert-line">has completed every lesson and quiz in the</p>
        <p class="cert-track">${esc(track.title)} track · ${track.lessons.length} lessons</p>
        <p class="cert-sub">${esc(track.subtitle)}</p>
        <p class="cert-date">${formatDateShort(date)}</p>
        <p class="cert-note">Prototype certificate — not an official qualification.</p>
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-secondary" type="button" data-close>Close</button>
      <button class="btn btn-primary" type="button" id="cert-print">${icon('print', 15)} Print</button>
    </div>`,
    onMount(panel) {
      panel.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => closeModal()));
      panel.querySelector('#cert-print').addEventListener('click', () => {
        document.body.classList.add('printing-cert');
        window.print();
        setTimeout(() => document.body.classList.remove('printing-cert'), 500);
      });
    },
  });
}

/* ------------------------------------------------------------------
   Lesson page
   ------------------------------------------------------------------ */

function lessonPage(ctx, found) {
  const { track, lesson, source } = found;
  const learning = ctx.learning;
  const done = !!learning.completed[lesson.id];
  const quiz = learning.quizzes[lesson.id];
  const { notes, saved } = getNotes();
  const isSaved = saved.includes(lesson.id);
  const isCore = source === 'core';
  const isDraft = source === 'draft';
  const flat = TRACKS.flatMap((t) => t.lessons);
  const idx = isCore ? track.lessons.indexOf(lesson) : -1;
  const next = isCore ? flat[flat.indexOf(lesson) + 1] : null;
  const prev = isCore ? flat[flat.indexOf(lesson) - 1] : null;
  const need = Math.ceil(lesson.quiz.length * QUIZ_PASS_RATIO);
  const sceneDone = lesson.kind === '3d' && learning.scenes[lesson.scene];

  return `
  <nav class="crumbs small" aria-label="Breadcrumb">
    <a href="#/academy">Academy</a> ${icon('chevronRight', 12)} <span>${esc(isCore ? track.title : isDraft ? 'Draft preview' : 'Community')}</span> ${icon('chevronRight', 12)} <span aria-current="page">${isCore ? `Lesson ${idx + 1}` : esc(lesson.title)}</span>
  </nav>
  ${isDraft ? `<div class="notice notice-amber" style="margin-bottom:1rem">${icon('info', 16)}<div><strong>Draft preview.</strong> Only you can see this. <a href="#/studio/${lesson.uuid}">Back to the editor</a></div></div>` : ''}

  <header class="lesson-top">
    <div>
      <p class="eyebrow">${esc(track.title)}${isCore ? ` · Lesson ${idx + 1} of ${track.lessons.length}` : ''} · ${lesson.minutes} min ${lesson.kind === '3d' ? `· <span class="kind-3d">${icon('cube', 11)} 3D lesson</span>` : ''}</p>
      <h1 id="page-title" tabindex="-1">${esc(lesson.title)}</h1>
      ${lesson.community ? `<p class="muted small">${icon('user', 12)} Community lesson by ${esc(lesson.author)}${lesson.own ? ` · <a href="#/studio/${lesson.uuid}">Edit in Studio</a>` : ''}</p>` : ''}
    </div>
    ${isDraft ? '' : `<button class="btn btn-secondary btn-sm ${isSaved ? 'is-saved' : ''}" type="button" id="save-lesson" aria-pressed="${isSaved}">${icon('bookmark', 15)} ${isSaved ? 'Saved' : 'Save'}</button>`}
  </header>

  ${lesson.kind === '3d' ? `<div class="lesson-3d">${playerHTML(lesson.scene, { embedded: true })}</div>` : ''}

  <div class="lesson-layout">
    <article class="card lesson-card">
      <div class="prose">${renderLessonBlocks(lesson.body)}</div>
      ${isDraft ? '' : `<footer class="lesson-foot">
        ${done
          ? `<span class="badge badge-completed">${icon('checkCircle', 13)} Lesson complete${isCore || !lesson.own ? ` · +${POINTS.lesson} points` : ''}</span>`
          : `<button class="btn btn-primary" type="button" id="mark-read">${icon('check', 16)} ${lesson.kind === '3d' ? 'Mark as done' : 'Mark lesson as read'}${isCore || !lesson.own ? ` (+${POINTS.lesson})` : ''}</button>`}
        ${lesson.kind === '3d' ? `<span class="small muted">${sceneDone ? 'You finished the 3D activity.' : 'Finishing the 3D activity above also completes this lesson.'}</span>` : ''}
      </footer>`}
    </article>

    <div class="dash-col">
      ${lesson.quiz.length ? `
      <aside class="card quiz-card" aria-labelledby="quiz-title">
        <div class="card-head"><h2 id="quiz-title">Quick quiz</h2><span class="sub">Pass with ${need}/${lesson.quiz.length}${isCore || !lesson.own ? ` · +${POINTS.quiz}` : ''}</span></div>
        ${quiz ? `<div class="notice ${quiz.passed ? 'notice-teal' : 'notice-amber'}" style="margin:1rem 1.25rem 0">${icon(quiz.passed ? 'checkCircle' : 'rotate', 16)}<div>Best score: <strong>${quiz.score}/${quiz.total}</strong> ${quiz.passed ? '— passed.' : '— not passed yet.'}</div></div>` : ''}
        <form id="quiz-form" class="quiz" novalidate>
          ${lesson.quiz.map((q, qi) => `
            <fieldset class="quiz-q" data-q="${qi}">
              <legend><span class="q-num">${qi + 1}</span> ${esc(q.q)}</legend>
              ${q.options.map((o, oi) => `<label class="quiz-opt"><input type="radio" name="q${qi}" value="${oi}" /> <span>${esc(o)}</span></label>`).join('')}
              <p class="quiz-why" hidden></p>
            </fieldset>`).join('')}
          <p class="field-error" id="quiz-err">${icon('alert', 13)}<span>Answer every question before checking.</span></p>
          <div class="quiz-actions">
            <button class="btn btn-primary" type="submit">Check answers</button>
            <button class="btn btn-secondary" type="button" id="quiz-retry" hidden>${icon('rotate', 15)} Try again</button>
          </div>
          <div id="quiz-result" aria-live="polite"></div>
        </form>
      </aside>` : ''}

      ${isDraft ? '' : `
      <section class="card card-pad notes-card" aria-labelledby="notes-title">
        <h2 class="card-title" id="notes-title">${icon('note', 17)} My notes</h2>
        <label class="sr-only" for="lesson-notes">Notes for this lesson</label>
        <textarea class="textarea" id="lesson-notes" rows="4" maxlength="2000" placeholder="Jot down what you want to remember — saved automatically.">${esc(notes[lesson.id] || '')}</textarea>
        <p class="small muted" id="notes-status">${notes[lesson.id] ? 'Saved.' : 'Notes save automatically and sync with your data.'}</p>
      </section>`}
    </div>
  </div>
  ${isCore ? `<nav class="lesson-nav" aria-label="Lesson navigation">
    ${prev ? `<a class="btn btn-ghost" href="#/academy/${prev.id}">${icon('arrowLeft', 15)} ${esc(prev.title)}</a>` : '<span></span>'}
    ${next ? `<a class="btn btn-secondary" href="#/academy/${next.id}">${esc(next.title)} ${icon('arrowRight', 15)}</a>` : `<a class="btn btn-secondary" href="#/academy">Back to Academy</a>`}
  </nav>` : ''}`;
}

export function render(ctx, param) {
  if (!param) return overview(ctx);
  const found = resolveLesson(param);
  if (!found) {
    return `${pageHead({ eyebrow: 'Academy', title: 'Lesson not found' })}
      <div class="card"><div class="empty"><span class="empty-ico">${icon('help', 20)}</span><h3>That lesson is not available</h3><p>It may have been unpublished, or the cloud data has not loaded yet.</p><a class="btn btn-primary btn-sm" href="#/academy">Browse lessons</a></div></div>`;
  }
  return lessonPage(ctx, found);
}

export function mount(root, ctx, param) {
  if (!param) {
    mountOverview(root, ctx);
    return undefined;
  }
  const found = resolveLesson(param);
  if (!found) return undefined;
  return mountLesson(root, ctx, found);
}

function mountOverview(root, ctx) {
  const region = root.querySelector('#lessons-region');
  const rerender = () => { region.innerHTML = lessonsRegion(ctx); };
  root.querySelector('#lesson-q').addEventListener('input', (e) => { filters.q = e.target.value; rerender(); });
  root.querySelector('#lesson-status').addEventListener('change', (e) => { filters.status = e.target.value; rerender(); });
  root.querySelectorAll('[data-ltype]').forEach((b) => b.addEventListener('click', () => {
    filters.type = b.dataset.ltype;
    root.querySelectorAll('[data-ltype]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    rerender();
  }));
  root.addEventListener('click', (e) => {
    const cert = e.target.closest('[data-cert]');
    if (cert) certificate(cert.dataset.cert);
    if (e.target.closest('#clear-lesson-filters')) {
      Object.assign(filters, { q: '', type: 'all', status: 'any' });
      ctx.refresh();
    }
  });
}

function mountLesson(root, ctx, found) {
  const { lesson, track, source } = found;
  const countsForPoints = source === 'core' || !lesson.own;
  let cleanupPlayer = null;

  const trackWasComplete = source === 'core' && trackProgress(track, getLearning()).complete;
  const celebrate = () => {
    if (source === 'core' && !trackWasComplete && trackProgress(track, getLearning()).complete) {
      toast(`${track.title} track complete! +${POINTS.track} bonus — certificate unlocked`, 'trophy');
    }
  };

  if (lesson.kind === '3d') {
    cleanupPlayer = mountPlayer(root, lesson.scene, {
      completed: !!getLearning().scenes[lesson.scene],
      onComplete(sceneId, result) {
        const wasDone = !!getLearning().completed[lesson.id];
        recordScene(sceneId, lesson.id, result);
        if (!wasDone) {
          toast(`3D lesson complete · +${POINTS.lesson} points`, 'cube');
          celebrate();
          const foot = root.querySelector('.lesson-foot');
          if (foot) foot.innerHTML = `<span class="badge badge-completed">${icon('checkCircle', 13)} Lesson complete · +${POINTS.lesson} points</span><span class="small muted">You finished the 3D activity.</span>`;
        }
        ctx.refreshChrome();
      },
    });
  }

  root.querySelector('#save-lesson')?.addEventListener('click', (e) => {
    const on = toggleSaved(lesson.id);
    const b = e.currentTarget;
    b.setAttribute('aria-pressed', String(on));
    b.classList.toggle('is-saved', on);
    b.innerHTML = `${icon('bookmark', 15)} ${on ? 'Saved' : 'Save'}`;
    toast(on ? 'Lesson saved' : 'Removed from saved', 'bookmark');
  });

  const notes = root.querySelector('#lesson-notes');
  if (notes) {
    let t = null;
    const status = root.querySelector('#notes-status');
    notes.addEventListener('input', () => {
      status.textContent = 'Saving…';
      clearTimeout(t);
      t = setTimeout(() => {
        saveNote(lesson.id, notes.value);
        status.textContent = 'Saved.';
      }, 600);
    });
  }

  root.querySelector('#mark-read')?.addEventListener('click', () => {
    if (markLessonComplete(lesson.id)) {
      toast(countsForPoints ? `Lesson complete · +${POINTS.lesson} points` : 'Lesson complete', 'checkCircle');
      celebrate();
    }
    ctx.refresh();
  });

  const form = root.querySelector('#quiz-form');
  if (form) {
    const err = root.querySelector('#quiz-err');
    const result = root.querySelector('#quiz-result');
    const retry = root.querySelector('#quiz-retry');
    const submit = form.querySelector('button[type="submit"]');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const answers = lesson.quiz.map((_, qi) => form.querySelector(`input[name="q${qi}"]:checked`));
      if (answers.some((a) => !a)) {
        err.classList.add('is-shown');
        form.querySelector(`[data-q="${answers.findIndex((a) => !a)}"] input`)?.focus();
        return;
      }
      err.classList.remove('is-shown');
      let score = 0;
      lesson.quiz.forEach((q, qi) => {
        const fs = form.querySelector(`[data-q="${qi}"]`);
        const right = Number(answers[qi].value) === q.answer;
        if (right) score += 1;
        fs.classList.add(right ? 'is-right' : 'is-wrong');
        fs.querySelectorAll('input').forEach((i) => (i.disabled = true));
        fs.querySelectorAll('.quiz-opt')[q.answer].classList.add('is-answer');
        const why = fs.querySelector('.quiz-why');
        why.hidden = false;
        why.innerHTML = `${icon(right ? 'checkCircle' : 'info', 14)} ${right ? 'Correct.' : 'Not quite.'} ${esc(q.why || '')}`;
      });
      if (source === 'draft') {
        result.innerHTML = `<div class="notice notice-teal">${icon('info', 17)}<div><strong>${score}/${lesson.quiz.length}</strong> — preview only, nothing is recorded.</div></div>`;
      } else {
        const before = getLearning();
        const wasPassed = before.quizzes[lesson.id]?.passed;
        const wasRead = !!before.completed[lesson.id];
        const { passed } = recordQuiz(lesson.id, score);
        const firstPass = passed && !wasPassed;
        result.innerHTML = `<div class="notice ${passed ? 'notice-teal' : 'notice-amber'}">${icon(passed ? 'trophy' : 'rotate', 17)}<div>
          <strong>${score}/${lesson.quiz.length} — ${passed ? 'passed!' : 'not passed yet.'}</strong>
          ${firstPass && countsForPoints ? ` +${POINTS.quiz} points${!wasRead ? ` and +${POINTS.lesson} for completing the lesson` : ''}.` : passed ? '' : ' Re-read the lesson and try again.'}
        </div></div>`;
        if (firstPass) {
          if (countsForPoints) toast(`Quiz passed · +${POINTS.quiz} points`, 'trophy');
          celebrate();
        }
        ctx.refreshChrome();
      }
      root.querySelector('.quiz-card > .notice')?.remove();
      submit.hidden = true;
      retry.hidden = false;
    });
    retry.addEventListener('click', () => ctx.refresh());
  }

  return () => cleanupPlayer?.();
}
