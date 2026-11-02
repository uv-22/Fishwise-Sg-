/**
 * Lesson Studio — lesson management.
 *   #/studio          my lessons: drafts and published, with actions
 *   #/studio/<id>     editor: details, content blocks, quiz builder, live preview
 *
 * Drafts are saved on this device (and synced privately). Publishing writes
 * the lesson to Supabase (fw_lessons) so every visitor sees it in the Academy.
 */

import { icon } from '../icons.js';
import { esc, toast, confirmDialog, formatDateShort } from '../ui.js';
import { TRACKS, POINTS } from '../data/courses.js';
import {
  getMyLessons, saveMyLesson, deleteMyLesson, publishMyLesson, unpublishMyLesson, newLessonDraft, validateLesson, getLearning,
} from '../progress.js';
import { pageHead, renderLessonBlocks, emptyState } from '../components.js';
import { cloudConfigured } from '../config.js';
import { shared } from '../services/cloud.js';

const BLOCKS = [
  ['p', 'Paragraph'], ['h', 'Heading'], ['list', 'Bullet list'], ['steps', 'Numbered steps'], ['tip', 'Tip'], ['warn', 'Warning'],
];

let draft = null; // editor working copy
let dirty = false;

const blockType = (b) => Object.keys(b)[0];
const blockText = (b) => {
  const t = blockType(b);
  return t === 'list' || t === 'steps' ? b[t].join('\n') : b[t];
};

/* ------------------------------------------------------------------
   List
   ------------------------------------------------------------------ */

function list() {
  const mine = getMyLessons();
  const learning = getLearning();
  return `
  ${pageHead({
    eyebrow: 'Lesson Studio',
    title: 'Manage your lessons',
    lede: `Write lessons from your own experience. Drafts stay private; published lessons appear for every FishWise user under Community lessons. Each published lesson earns ${POINTS.publish} points.`,
    actions: `<a class="btn btn-secondary" href="#/academy">${icon('academy', 16)} Academy</a><button class="btn btn-primary" type="button" id="new-lesson">${icon('plus', 16)} New lesson</button>`,
  })}
  ${cloudConfigured() ? '' : `<div class="notice notice-amber" style="margin-bottom:1rem">${icon('cloudOff', 16)}<div><strong>Cloud sync is not connected yet.</strong> Published lessons will show on this device only until the Supabase key is added.</div></div>`}
  <div class="studio-stats">
    <div class="card card-pad"><b>${mine.length}</b><span>Your lessons</span></div>
    <div class="card card-pad"><b>${mine.filter((l) => l.status === 'published').length}</b><span>Published</span></div>
    <div class="card card-pad"><b>${mine.filter((l) => l.status === 'draft').length}</b><span>Drafts</span></div>
    <div class="card card-pad"><b>${shared.loaded ? shared.lessons.length : '—'}</b><span>Community lessons</span></div>
  </div>
  <section class="card">
    <div class="card-head"><h2>Your lessons</h2><span class="sub">Newest first</span></div>
    ${mine.length ? `<div class="studio-table" role="table" aria-label="Your lessons">
      <div class="st-row st-head" role="row"><span role="columnheader">Lesson</span><span role="columnheader">Track</span><span role="columnheader">Status</span><span role="columnheader">Updated</span><span role="columnheader"><span class="sr-only">Actions</span></span></div>
      ${mine.map((l) => `
        <div class="st-row" role="row">
          <span role="cell" class="st-title"><b>${esc(l.title || 'Untitled lesson')}</b><span class="small muted">${l.body.length} blocks · ${l.quiz.length} quiz questions · ${l.minutes} min</span></span>
          <span role="cell">${esc(TRACKS.find((t) => t.id === l.track)?.title || '')}</span>
          <span role="cell">${l.status === 'published' ? `<span class="badge badge-completed">${icon('checkCircle', 12)} Published</span>` : `<span class="badge badge-planned">${icon('pen', 12)} Draft</span>`}</span>
          <span role="cell" class="small muted">${formatDateShort(l.updatedAt.slice(0, 10))}</span>
          <span role="cell" class="st-actions">
            <a class="btn-icon" href="#/studio/${l.id}" aria-label="Edit ${esc(l.title || 'lesson')}">${icon('edit', 17)}</a>
            <a class="btn-icon" href="#/academy/${l.status === 'published' ? `c-${l.id}` : `draft-${l.id}`}" aria-label="Preview ${esc(l.title || 'lesson')}">${icon('book', 17)}</a>
            ${l.status === 'published'
              ? `<button class="btn btn-secondary btn-sm" type="button" data-unpublish="${l.id}">Unpublish</button>`
              : `<button class="btn btn-primary btn-sm" type="button" data-publish="${l.id}">Publish</button>`}
            <button class="btn-icon is-danger" type="button" data-delete="${l.id}" aria-label="Delete ${esc(l.title || 'lesson')}">${icon('trash', 17)}</button>
          </span>
        </div>`).join('')}
    </div>` : emptyState({ iconName: 'pen', title: 'No lessons yet', text: 'Share a technique, a spot tip or a safety lesson. Start with a short draft — you can preview before publishing.', action: `<button class="btn btn-primary btn-sm" type="button" data-new>${icon('plus', 15)} New lesson</button>` })}
  </section>
  <p class="small muted" style="margin-top:.8rem">Learners’ progress on your lessons counts toward their points; completing your own lessons does not earn you points. ${Object.keys(learning.completed).filter((k) => k.startsWith('c-')).length} community lessons completed on this device.</p>`;
}

/* ------------------------------------------------------------------
   Editor
   ------------------------------------------------------------------ */

function blockEditor(b, i, n) {
  const t = blockType(b);
  const multi = t === 'list' || t === 'steps';
  return `
  <div class="blk" data-blk="${i}">
    <div class="blk-head">
      <label class="sr-only" for="blk-type-${i}">Block type</label>
      <select class="select select-sm" id="blk-type-${i}" data-blk-type="${i}">${BLOCKS.map(([k, l]) => `<option value="${k}" ${k === t ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <span class="blk-tools">
        <button class="btn-icon" type="button" data-blk-up="${i}" aria-label="Move block up" ${i === 0 ? 'disabled' : ''}>${icon('arrowUp', 15)}</button>
        <button class="btn-icon" type="button" data-blk-down="${i}" aria-label="Move block down" ${i === n - 1 ? 'disabled' : ''}>${icon('arrowDown', 15)}</button>
        <button class="btn-icon is-danger" type="button" data-blk-del="${i}" aria-label="Delete block">${icon('trash', 15)}</button>
      </span>
    </div>
    <label class="sr-only" for="blk-text-${i}">Block text</label>
    <textarea class="textarea" id="blk-text-${i}" data-blk-text="${i}" rows="${multi ? 4 : t === 'h' ? 1 : 3}" maxlength="2000" placeholder="${multi ? 'One item per line' : t === 'h' ? 'Section heading' : 'Write here…'}">${esc(blockText(b))}</textarea>
  </div>`;
}

function quizEditor(q, i) {
  return `
  <fieldset class="qz" data-qz="${i}">
    <legend class="sr-only">Question ${i + 1}</legend>
    <div class="blk-head"><b class="small">Question ${i + 1}</b><button class="btn-icon is-danger" type="button" data-qz-del="${i}" aria-label="Delete question ${i + 1}">${icon('trash', 15)}</button></div>
    <label class="sr-only" for="qz-q-${i}">Question text</label>
    <input class="input" id="qz-q-${i}" data-qz-q="${i}" maxlength="300" placeholder="Question" value="${esc(q.q)}" />
    <div class="qz-opts">
      ${q.options.map((o, oi) => `
        <div class="qz-opt">
          <input type="radio" name="qz-ans-${i}" data-qz-ans="${i}" value="${oi}" ${q.answer === oi ? 'checked' : ''} aria-label="Mark option ${oi + 1} correct" />
          <label class="sr-only" for="qz-o-${i}-${oi}">Option ${oi + 1}</label>
          <input class="input" id="qz-o-${i}-${oi}" data-qz-opt="${i}:${oi}" maxlength="200" placeholder="Option ${oi + 1}" value="${esc(o)}" />
          <button class="btn-icon" type="button" data-qz-optdel="${i}:${oi}" aria-label="Remove option ${oi + 1}" ${q.options.length <= 2 ? 'disabled' : ''}>${icon('close', 14)}</button>
        </div>`).join('')}
    </div>
    ${q.options.length < 5 ? `<button class="link-btn small" type="button" data-qz-optadd="${i}">+ Add option</button>` : ''}
    <label class="sr-only" for="qz-why-${i}">Explanation</label>
    <input class="input" id="qz-why-${i}" data-qz-why="${i}" maxlength="400" placeholder="Why is that the answer? (shown after checking)" value="${esc(q.why)}" style="margin-top:.4rem" />
  </fieldset>`;
}

function editor(id) {
  return `
  <a class="btn btn-ghost btn-sm back-link" href="#/studio">${icon('arrowLeft', 15)} All lessons</a>
  ${pageHead({
    eyebrow: 'Lesson Studio',
    title: draft.title ? esc(draft.title) : 'New lesson',
    lede: draft.status === 'published' ? 'Published — saving updates the live lesson.' : 'Draft — only you can see it until you publish.',
    actions: `
      <span class="save-state small muted" id="save-state">${dirty ? 'Unsaved changes' : 'All changes saved'}</span>
      <a class="btn btn-secondary" href="#/academy/draft-${id}" id="ed-preview">${icon('book', 16)} Preview</a>
      <button class="btn btn-secondary" type="button" id="ed-save">${icon('check', 16)} Save</button>
      <button class="btn btn-primary" type="button" id="ed-publish">${icon('send', 16)} ${draft.status === 'published' ? 'Update live lesson' : 'Publish'}</button>`,
  })}
  <div class="form-summary" id="ed-errors" role="alert">${icon('alert', 17)}<div></div></div>
  <div class="studio-layout">
    <div class="dash-col">
      <section class="card card-pad">
        <h2 class="card-title">${icon('settings', 17)} Details</h2>
        <div class="form-grid" style="margin-top:.8rem">
          <div class="field span-2">
            <label for="ed-title">Title <span class="req" aria-hidden="true">*</span></label>
            <input class="input" id="ed-title" maxlength="90" value="${esc(draft.title)}" placeholder="e.g. Finding fish at Kranji Fishing Ground A" />
          </div>
          <div class="field">
            <label for="ed-track">Track</label>
            <select class="select" id="ed-track">${TRACKS.map((t) => `<option value="${t.id}" ${draft.track === t.id ? 'selected' : ''}>${t.title}</option>`).join('')}</select>
          </div>
          <div class="field">
            <label for="ed-min">Reading time (minutes)</label>
            <input class="input" id="ed-min" type="number" min="1" max="60" value="${draft.minutes}" />
          </div>
          <div class="field span-2">
            <label for="ed-summary">Summary <span class="opt">(optional)</span></label>
            <input class="input" id="ed-summary" maxlength="200" value="${esc(draft.summary)}" placeholder="One line shown on the lesson card" />
          </div>
        </div>
      </section>

      <section class="card card-pad">
        <h2 class="card-title">${icon('note', 17)} Content</h2>
        <div id="ed-blocks" class="blk-list">${draft.body.map((b, i) => blockEditor(b, i, draft.body.length)).join('')}</div>
        <div class="add-row">${BLOCKS.map(([k, l]) => `<button class="btn btn-ghost btn-sm" type="button" data-add-blk="${k}">+ ${l}</button>`).join('')}</div>
      </section>

      <section class="card card-pad">
        <h2 class="card-title">${icon('help', 17)} Quiz <span class="opt small">(optional, up to 10 questions)</span></h2>
        <div id="ed-quiz">${draft.quiz.map(quizEditor).join('')}</div>
        ${draft.quiz.length < 10 ? `<button class="btn btn-secondary btn-sm" type="button" id="qz-add" style="margin-top:.7rem">${icon('plus', 14)} Add question</button>` : ''}
      </section>

      <div class="studio-danger">
        <button class="btn btn-danger-quiet btn-sm" type="button" id="ed-delete">${icon('trash', 15)} Delete lesson</button>
      </div>
    </div>

    <aside class="card studio-preview" aria-label="Live preview">
      <div class="card-head"><h2>Live preview</h2><span class="sub">${esc(TRACKS.find((t) => t.id === draft.track)?.title || '')}</span></div>
      <div class="card-pad">
        <h3 class="pv-title" id="pv-title">${esc(draft.title || 'Untitled lesson')}</h3>
        <div class="prose" id="pv-body">${renderLessonBlocks(cleanBody())}</div>
      </div>
    </aside>
  </div>`;
}

function cleanBody() {
  return draft.body.map((b) => {
    const t = blockType(b);
    if (t === 'list' || t === 'steps') {
      const items = b[t].map((x) => x.trim()).filter(Boolean);
      return items.length ? { [t]: items } : null;
    }
    return b[t].trim() ? { [t]: b[t].trim() } : null;
  }).filter(Boolean);
}

function cleanQuiz() {
  return draft.quiz.map((q) => ({ ...q, q: q.q.trim(), options: q.options.map((o) => o.trim()), why: q.why.trim() }));
}

function payload() {
  return { ...draft, title: draft.title.trim(), summary: draft.summary.trim(), body: cleanBody(), quiz: cleanQuiz() };
}

/* ------------------------------------------------------------------
   View API
   ------------------------------------------------------------------ */

export function render(ctx, param) {
  if (!param) {
    draft = null;
    return list();
  }
  if (!draft || draft.id !== param) {
    const found = getMyLessons().find((l) => l.id === param);
    if (!found) {
      return `<a class="btn btn-ghost btn-sm back-link" href="#/studio">${icon('arrowLeft', 15)} All lessons</a><div class="card">${emptyState({ iconName: 'help', title: 'Lesson not found', text: 'It may have been deleted.' })}</div>`;
    }
    draft = JSON.parse(JSON.stringify(found));
    draft.body = draft.body.map((b) => {
      const t = blockType(b);
      return t === 'list' || t === 'steps' ? { [t]: [...b[t]] } : { [t]: b[t] };
    });
    if (!draft.body.length) draft.body = [{ p: '' }];
    dirty = false;
  }
  return editor(param);
}

export function mount(root, ctx, param) {
  if (!param) {
    const create = () => {
      const d = saveMyLesson(newLessonDraft());
      ctx.navigate(`#/studio/${d.id}`);
    };
    root.querySelector('#new-lesson')?.addEventListener('click', create);
    root.querySelector('[data-new]')?.addEventListener('click', create);
    root.querySelectorAll('[data-publish]').forEach((b) => b.addEventListener('click', async () => {
      b.disabled = true;
      const res = await publishMyLesson(b.dataset.publish);
      if (res.ok) toast(res.local ? 'Published on this device' : `Lesson published · +${POINTS.publish} points`, 'send');
      else toast(res.reason || 'Could not publish — check cloud sync.', 'alert');
      ctx.refresh();
    }));
    root.querySelectorAll('[data-unpublish]').forEach((b) => b.addEventListener('click', () => {
      confirmDialog({
        title: 'Unpublish this lesson?',
        body: 'It will be removed from Community lessons for everyone. You keep it as a draft.',
        confirmLabel: 'Unpublish',
        async onConfirm() {
          await unpublishMyLesson(b.dataset.unpublish);
          toast('Lesson unpublished', 'close');
          ctx.refresh();
        },
      });
    }));
    root.querySelectorAll('[data-delete]').forEach((b) => b.addEventListener('click', () => confirmLessonDelete(b.dataset.delete, ctx)));
    return undefined;
  }
  if (!draft) return undefined;

  const state = root.querySelector('#save-state');
  const pvTitle = root.querySelector('#pv-title');
  const pvBody = root.querySelector('#pv-body');
  const markDirty = () => {
    dirty = true;
    state.textContent = 'Unsaved changes';
    pvTitle.textContent = draft.title || 'Untitled lesson';
    pvBody.innerHTML = renderLessonBlocks(cleanBody());
  };
  const rerender = () => ctx.refresh();

  root.querySelector('#ed-title').addEventListener('input', (e) => { draft.title = e.target.value; markDirty(); });
  root.querySelector('#ed-summary').addEventListener('input', (e) => { draft.summary = e.target.value; markDirty(); });
  root.querySelector('#ed-min').addEventListener('input', (e) => { draft.minutes = Number(e.target.value) || 5; markDirty(); });
  root.querySelector('#ed-track').addEventListener('change', (e) => { draft.track = e.target.value; markDirty(); });

  root.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.blkText !== undefined) {
      const i = Number(t.dataset.blkText);
      const type = blockType(draft.body[i]);
      draft.body[i] = { [type]: type === 'list' || type === 'steps' ? t.value.split('\n') : t.value };
      markDirty();
    } else if (t.dataset.qzQ !== undefined) {
      draft.quiz[Number(t.dataset.qzQ)].q = t.value; markDirty();
    } else if (t.dataset.qzWhy !== undefined) {
      draft.quiz[Number(t.dataset.qzWhy)].why = t.value; markDirty();
    } else if (t.dataset.qzOpt !== undefined) {
      const [qi, oi] = t.dataset.qzOpt.split(':').map(Number);
      draft.quiz[qi].options[oi] = t.value; markDirty();
    }
  });
  root.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.blkType !== undefined) {
      const i = Number(t.dataset.blkType);
      const text = blockText(draft.body[i]);
      draft.body[i] = { [t.value]: t.value === 'list' || t.value === 'steps' ? text.split('\n') : text };
      dirty = true;
      rerender();
    } else if (t.dataset.qzAns !== undefined) {
      draft.quiz[Number(t.dataset.qzAns)].answer = Number(t.value); markDirty();
    }
  });
  root.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const d = b.dataset;
    const move = (i, j) => { const [x] = draft.body.splice(i, 1); draft.body.splice(j, 0, x); dirty = true; rerender(); };
    if (d.addBlk) { draft.body.push({ [d.addBlk]: d.addBlk === 'list' || d.addBlk === 'steps' ? [''] : '' }); dirty = true; rerender(); }
    else if (d.blkUp !== undefined) move(Number(d.blkUp), Number(d.blkUp) - 1);
    else if (d.blkDown !== undefined) move(Number(d.blkDown), Number(d.blkDown) + 1);
    else if (d.blkDel !== undefined) { draft.body.splice(Number(d.blkDel), 1); if (!draft.body.length) draft.body.push({ p: '' }); dirty = true; rerender(); }
    else if (d.qzDel !== undefined) { draft.quiz.splice(Number(d.qzDel), 1); dirty = true; rerender(); }
    else if (d.qzOptadd !== undefined) { draft.quiz[Number(d.qzOptadd)].options.push(''); dirty = true; rerender(); }
    else if (d.qzOptdel !== undefined) {
      const [qi, oi] = d.qzOptdel.split(':').map(Number);
      const q = draft.quiz[qi];
      q.options.splice(oi, 1);
      if (q.answer >= q.options.length) q.answer = 0;
      dirty = true; rerender();
    } else if (b.id === 'qz-add') { draft.quiz.push({ q: '', options: ['', ''], answer: 0, why: '' }); dirty = true; rerender(); }
  });

  const errBox = root.querySelector('#ed-errors');
  const showErrors = (errors) => {
    const msgs = Object.values(errors);
    errBox.classList.toggle('is-shown', msgs.length > 0);
    errBox.querySelector('div').innerHTML = msgs.length ? `<strong>Before publishing:</strong><ul>${msgs.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>` : '';
    if (msgs.length) errBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  const save = () => {
    const saved = saveMyLesson({ ...payload(), status: draft.status });
    if (saved) {
      dirty = false;
      state.textContent = 'All changes saved';
    }
    return saved;
  };

  root.querySelector('#ed-save').addEventListener('click', async () => {
    save();
    if (draft.status === 'published') {
      const errors = validateLesson(payload());
      if (Object.keys(errors).length) return showErrors(errors);
      await publishMyLesson(draft.id);
    }
    toast('Lesson saved', 'check');
  });
  root.querySelector('#ed-preview').addEventListener('click', () => { save(); });
  root.querySelector('#ed-publish').addEventListener('click', async (e) => {
    const errors = validateLesson(payload());
    if (Object.keys(errors).length) return showErrors(errors);
    showErrors({});
    save();
    const btn = e.currentTarget;
    btn.disabled = true;
    const wasPublished = draft.status === 'published';
    const res = await publishMyLesson(draft.id);
    btn.disabled = false;
    if (res.ok) {
      draft.status = 'published';
      toast(res.local ? 'Published on this device (cloud not connected)' : wasPublished ? 'Live lesson updated' : `Lesson published · +${POINTS.publish} points`, 'send');
      ctx.navigate('#/studio');
    } else {
      toast(res.reason || 'Could not publish — check cloud sync.', 'alert');
    }
  });
  root.querySelector('#ed-delete').addEventListener('click', () => confirmLessonDelete(draft.id, ctx, true));

  return () => {
    if (dirty && draft) {
      saveMyLesson({ ...payload(), status: draft.status });
      dirty = false;
    }
  };
}

function confirmLessonDelete(id, ctx, fromEditor = false) {
  const l = getMyLessons().find((x) => x.id === id);
  confirmDialog({
    title: 'Delete this lesson?',
    body: `“${esc(l?.title || 'Untitled lesson')}” will be deleted${l?.status === 'published' ? ' and removed from Community lessons' : ''}. This cannot be undone.`,
    confirmLabel: 'Delete lesson',
    onConfirm() {
      deleteMyLesson(id);
      draft = null;
      dirty = false;
      toast('Lesson deleted', 'trash');
      if (fromEditor) ctx.navigate('#/studio');
      else ctx.refresh();
    },
  });
}
