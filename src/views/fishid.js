/**
 * Fish ID.
 *
 *  - AI photo ID: photo → Supabase Edge Function → Claude vision → structured result.
 *  - Guided ID: three questions matched against the species guide. Works offline,
 *    and is what the photo flow hands over to when the AI backend is not connected.
 */

import { icon } from '../icons.js';
import { esc, toast, formatDateShort } from '../ui.js';
import { getSpecies, GUIDED_QUESTIONS, guidedMatches, DANGER } from '../data/species.js';
import { POINTS } from '../data/courses.js';
import { recordScan, getScans } from '../progress.js';
import { pageHead } from '../components.js';
import { aiConnected, checkImageFile, prepareImage, identifyFish } from '../services/ai.js';

let photo = null; // { dataUrl, base64, mediaType } — kept only in memory, never stored

function dangerBadge(level) {
  const d = DANGER[level] || DANGER.caution;
  const cls = d.tone === 'red' ? 'badge-restricted' : d.tone === 'amber' ? 'badge-verify' : 'badge-designated';
  return `<span class="badge ${cls}">${icon(d.tone === 'teal' ? 'checkCircle' : 'alert', 12)} ${d.label}</span>`;
}

function speciesResultCard(s, { heading, confidence, extra = '' } = {}) {
  return `
  <div class="result-card">
    <div class="result-head">
      <span class="stat-ico" style="width:40px;height:40px">${icon('fish', 20)}</span>
      <div>
        <p class="eyebrow">${heading}</p>
        <h3>${esc(s.name)}</h3>
        <p class="muted small"><i>${esc(s.scientific)}</i></p>
      </div>
    </div>
    <div class="badge-row">${dangerBadge(s.danger)} ${confidence ? `<span class="badge badge-planned">Confidence: ${esc(confidence)}</span>` : ''}</div>
    <p class="small">${esc(s.looks)}</p>
    ${extra}
    <h4>How to handle it</h4>
    <ul class="guide-list">${s.handling.map((h) => `<li>${icon('hook', 15)}<span>${esc(h)}</span></li>`).join('')}</ul>
    <div class="detail-actions">
      <a class="btn btn-secondary btn-sm" href="#/species/${s.id}">${icon('book', 15)} Full guide</a>
      <button class="btn btn-primary btn-sm" type="button" data-log-species="${s.id}">${icon('plus', 15)} Log this catch</button>
    </div>
  </div>`;
}

function aiResultCard(r) {
  const guide = r.matched_guide_id && r.matched_guide_id !== 'none' ? getSpecies(r.matched_guide_id) : null;
  if (!r.is_fish) {
    return `<div class="notice notice-amber">${icon('help', 17)}<div><strong>No fish found in this photo.</strong> ${esc(r.notes || 'Try a clearer, side-on photo of the whole fish.')}</div></div>`;
  }
  return `
  <div class="result-card">
    <div class="result-head">
      <span class="stat-ico" style="width:40px;height:40px">${icon('sparkles', 20)}</span>
      <div>
        <p class="eyebrow">AI identification</p>
        <h3>${esc(r.common_name)}</h3>
        <p class="muted small"><i>${esc(r.scientific_name)}</i></p>
      </div>
    </div>
    <div class="badge-row">${dangerBadge(r.danger)} <span class="badge badge-planned">Confidence: ${esc(r.confidence)}</span></div>
    ${r.key_features?.length ? `<h4>What gave it away</h4><ul class="small plain-list">${r.key_features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
    <h4>How to handle it</h4>
    <ul class="guide-list">${(r.handling || []).map((h) => `<li>${icon('hook', 15)}<span>${esc(h)}</span></li>`).join('')}</ul>
    ${r.edible_warning ? `<div class="notice notice-amber">${icon('alert', 16)}<div>${esc(r.edible_warning)}</div></div>` : ''}
    ${r.look_alikes?.length ? `<p class="small muted" style="margin-top:.6rem">Often confused with: ${r.look_alikes.map(esc).join(', ')}</p>` : ''}
    ${r.notes ? `<p class="small muted">${esc(r.notes)}</p>` : ''}
    <p class="small muted">AI can be wrong. If a fish might be venomous, do not touch it — cut the line.</p>
    <div class="detail-actions">
      ${guide ? `<a class="btn btn-secondary btn-sm" href="#/species/${guide.id}">${icon('book', 15)} FishWise guide</a>` : ''}
      <button class="btn btn-primary btn-sm" type="button" data-log-species="${guide ? guide.id : ''}">${icon('plus', 15)} Log this catch</button>
    </div>
  </div>`;
}

export function render(ctx, param, query) {
  const mode = query.get('mode') === 'guided' ? 'guided' : 'photo';
  const connected = aiConnected();
  const scans = getScans().slice(0, 5);

  return `
  ${pageHead({
    eyebrow: 'Fish ID',
    title: 'What did I catch?',
    lede: `Identify a fish, then learn how to handle it safely. Each identification earns ${POINTS.scan} points.`,
  })}

  <div class="segmented" role="tablist" aria-label="Identification method" style="margin-bottom:1rem">
    <button class="seg" role="tab" type="button" data-mode="photo" aria-selected="${mode === 'photo'}" aria-pressed="${mode === 'photo'}">${icon('camera', 15)} Photo ID</button>
    <button class="seg" role="tab" type="button" data-mode="guided" aria-selected="${mode === 'guided'}" aria-pressed="${mode === 'guided'}">${icon('help', 15)} Guided ID</button>
  </div>

  <div class="fishid-layout">
    <section class="card card-pad">
      ${mode === 'photo' ? `
        <div class="notice ${connected ? 'notice-teal' : 'notice-amber'}" style="margin-bottom:1rem">
          ${icon(connected ? 'sparkles' : 'info', 17)}
          <div>${connected
            ? '<strong>AI connected.</strong> Photos are sent to your FishWise backend, identified by Claude, and not stored.'
            : '<strong>AI backend not connected.</strong> You can still pick a photo — FishWise will walk you through Guided ID beside it. AI photo ID switches on once the <code>identify-fish</code> Edge Function is deployed to Supabase with an Anthropic API key (see README).'}</div>
        </div>
        <label class="dropzone" id="dropzone" for="photo-input">
          <input type="file" id="photo-input" accept="image/*" capture="environment" class="sr-only" />
          <div id="photo-preview" class="${photo ? 'has-photo' : ''}">
            ${photo ? `<img src="${photo.dataUrl}" alt="Your fish photo" />` : `
              <span class="empty-ico">${icon('camera', 22)}</span>
              <b>Take or choose a photo</b>
              <span class="small muted">Side-on, whole fish, good light. JPG, PNG or HEIC.</span>`}
          </div>
        </label>
        <p class="field-error" id="photo-err">${icon('alert', 13)}<span></span></p>
        <div class="detail-actions">
          ${connected
            ? `<button class="btn btn-primary" type="button" id="identify" ${photo ? '' : 'disabled'}>${icon('sparkles', 16)} Identify fish</button>`
            : `<button class="btn btn-primary" type="button" id="to-guided" ${photo ? '' : 'disabled'}>${icon('help', 16)} Identify with Guided ID</button>`}
          ${photo ? `<button class="btn btn-ghost" type="button" id="clear-photo">${icon('close', 15)} Remove photo</button>` : ''}
        </div>
        <div id="ai-out" aria-live="polite"></div>
      ` : `
        ${photo ? `<div class="guided-photo"><img src="${photo.dataUrl}" alt="Your fish photo" /></div>` : ''}
        <form id="guided-form" class="guided" novalidate>
          ${GUIDED_QUESTIONS.map((q, qi) => `
            <fieldset class="guided-q">
              <legend><span class="q-num">${qi + 1}</span> ${esc(q.label)}</legend>
              <div class="option-chips">
                ${q.options.map((o, oi) => `<label class="option-chip"><input type="radio" name="${q.id}" value="${oi}" /><span>${esc(o.label)}</span></label>`).join('')}
              </div>
            </fieldset>`).join('')}
          <p class="field-error" id="guided-err">${icon('alert', 13)}<span>Answer the body-shape question at least.</span></p>
          <div class="detail-actions"><button class="btn btn-primary" type="submit">${icon('search', 15)} Show matches</button><button class="btn btn-ghost" type="reset">Start over</button></div>
        </form>
        <div id="guided-out" aria-live="polite"></div>
      `}
    </section>

    <aside class="dash-col">
      <section class="card card-pad">
        <h2 class="card-title">${icon('shield', 17)} Safety first</h2>
        <ul class="guide-list" style="margin-top:.7rem">
          <li>${icon('alert', 15)}<span>Stingrays, catfish and scorpionfish carry <b>venomous spines</b>. If unsure, cut the line close to the hook.</span></li>
          <li>${icon('ban', 15)}<span><b>Never eat pufferfish.</b> Many carry a potentially fatal toxin.</span></li>
          <li>${icon('leaf', 15)}<span>NParks asks you to <b>release protected species</b>.</span></li>
        </ul>
      </section>
      <section class="card">
        <div class="card-head"><h2>Recent identifications</h2></div>
        ${scans.length ? `<div class="row-list">${scans.map((s) => `
          <div class="row">
            <span class="stat-ico" style="width:30px;height:30px">${icon(s.mode === 'ai' ? 'sparkles' : 'help', 14)}</span>
            <div class="row-main"><div class="row-title">${s.speciesId ? `<a href="#/species/${s.speciesId}">${esc(s.name)}</a>` : esc(s.name)}</div>
            <div class="row-meta"><span>${s.mode === 'ai' ? 'AI photo' : 'Guided'}</span><span>${formatDateShort(s.at.slice(0, 10))}</span></div></div>
          </div>`).join('')}</div>` : `<div class="empty"><p>Your identifications will appear here.</p></div>`}
      </section>
    </aside>
  </div>`;
}

export function mount(root, ctx, param, query) {
  root.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => {
    ctx.navigate(b.dataset.mode === 'guided' ? '#/fishid?mode=guided' : '#/fishid');
  }));

  root.addEventListener('click', (e) => {
    const log = e.target.closest('[data-log-species]');
    if (log) ctx.logTrip({ species: log.dataset.logSpecies ? [log.dataset.logSpecies] : [] });
  });

  // Photo mode
  const input = root.querySelector('#photo-input');
  if (input) {
    const err = root.querySelector('#photo-err');
    const showErr = (msg) => {
      err.querySelector('span').textContent = msg;
      err.classList.toggle('is-shown', !!msg);
    };
    const accept = async (file) => {
      const problem = checkImageFile(file);
      if (problem) return showErr(problem);
      showErr('');
      try {
        photo = await prepareImage(file);
        ctx.refresh();
      } catch (ex) {
        showErr(ex.message);
      }
    };
    input.addEventListener('change', () => input.files[0] && accept(input.files[0]));

    const zone = root.querySelector('#dropzone');
    ['dragenter', 'dragover'].forEach((t) => zone.addEventListener(t, (e) => { e.preventDefault(); zone.classList.add('is-drag'); }));
    ['dragleave', 'drop'].forEach((t) => zone.addEventListener(t, () => zone.classList.remove('is-drag')));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      const f = e.dataTransfer.files[0];
      if (f) accept(f);
    });

    root.querySelector('#clear-photo')?.addEventListener('click', () => {
      photo = null;
      ctx.refresh();
    });
    root.querySelector('#to-guided')?.addEventListener('click', () => ctx.navigate('#/fishid?mode=guided'));

    const identifyBtn = root.querySelector('#identify');
    identifyBtn?.addEventListener('click', async () => {
      const out = root.querySelector('#ai-out');
      identifyBtn.disabled = true;
      identifyBtn.innerHTML = `<span class="spinner spinner-sm"></span> Identifying…`;
      out.innerHTML = `<div class="result-skeleton"><span></span><span></span><span></span></div>`;
      try {
        const r = await identifyFish(photo);
        out.innerHTML = aiResultCard(r);
        if (r.is_fish) {
          recordScan({ name: r.common_name, speciesId: r.matched_guide_id !== 'none' ? r.matched_guide_id : null, mode: 'ai', confidence: r.confidence });
          toast(`Identified · +${POINTS.scan} points`, 'sparkles');
          ctx.refreshChrome();
        }
      } catch (ex) {
        out.innerHTML = `<div class="notice notice-red">${icon('alert', 17)}<div><strong>Identification failed.</strong> ${esc(ex.message)} <a href="#/fishid?mode=guided">Use Guided ID instead</a>.</div></div>`;
      } finally {
        identifyBtn.disabled = false;
        identifyBtn.innerHTML = `${icon('sparkles', 16)} Identify again`;
      }
    });
  }

  // Guided mode
  const form = root.querySelector('#guided-form');
  if (form) {
    const out = root.querySelector('#guided-out');
    form.addEventListener('reset', () => {
      out.innerHTML = '';
      root.querySelector('#guided-err').classList.remove('is-shown');
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const tags = [];
      let answeredShape = false;
      for (const q of GUIDED_QUESTIONS) {
        const picked = form.querySelector(`input[name="${q.id}"]:checked`);
        if (picked) {
          tags.push(...q.options[Number(picked.value)].tags);
          if (q.id === 'shape') answeredShape = true;
        }
      }
      const err = root.querySelector('#guided-err');
      if (!answeredShape) {
        err.classList.add('is-shown');
        form.querySelector('input[name="shape"]').focus();
        return;
      }
      err.classList.remove('is-shown');
      const matches = guidedMatches(tags);
      if (!matches.length) {
        out.innerHTML = `<div class="notice notice-amber" style="margin-top:1rem">${icon('help', 17)}<div><strong>No close match in the FishWise guide.</strong> Ask a mentor in <a href="#/community">Community</a> — post a description and where you caught it.</div></div>`;
        return;
      }
      const top = matches[0].score;
      out.innerHTML = `
        <h3 class="results-title">Closest matches</h3>
        <div class="match-list">
          ${matches.map((m, i) => `
            <div class="match">
              ${speciesResultCard(m.species, { heading: i === 0 ? 'Best match' : 'Also possible', confidence: m.score === top && i === 0 ? (top >= 3 ? 'good' : 'fair') : 'lower' })}
              <button class="btn btn-secondary btn-sm btn-block" type="button" data-confirm="${m.species.id}">${icon('check', 15)} Yes, this is my fish</button>
            </div>`).join('')}
        </div>`;
      out.querySelectorAll('[data-confirm]').forEach((b) => b.addEventListener('click', () => {
        const s = getSpecies(b.dataset.confirm);
        recordScan({ name: s.name, speciesId: s.id, mode: 'guided', confidence: '' });
        toast(`Saved as ${s.name} · +${POINTS.scan} points`, 'checkCircle');
        b.disabled = true;
        b.innerHTML = `${icon('checkCircle', 15)} Saved to your identifications`;
        ctx.refreshChrome();
      }));
    });
  }
}

