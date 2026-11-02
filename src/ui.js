/**
 * Small shared UI primitives: escaping, date/number formatting, toasts,
 * a focus-trapping modal host, and a confirmation dialog.
 */

import { icon } from './icons.js';

/* ------------------------------------------------------------------
   Escaping & formatting
   ------------------------------------------------------------------ */

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escape any user-supplied string before it goes into an HTML template. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** 'YYYY-MM-DD' -> local Date at midnight (avoids UTC parsing drift). */
export function parseDate(iso) {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? ''));
  if (!parts) return null;
  const d = new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Date -> 'YYYY-MM-DD' in local time. */
export function toISODate(date) {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

export function todayISO() {
  return toISODate(new Date());
}

/** '2026-09-12' -> 'Sat, 12 Sep 2026' */
export function formatDateLong(iso) {
  const d = parseDate(iso);
  if (!d) return 'Unknown date';
  return `${DAYS_SHORT[d.getDay()]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/** '2026-09-12' -> '12 Sep 2026' */
export function formatDateShort(iso) {
  const d = parseDate(iso);
  if (!d) return 'Unknown date';
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

export function monthLabel(monthIndex) {
  return MONTHS_SHORT[monthIndex];
}

/** Whole days from today to `iso` (negative = past). */
export function daysFromToday(iso) {
  const target = parseDate(iso);
  if (!target) return null;
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - base) / 86400000);
}

/** Friendly relative wording used on the "next trip" card. */
export function relativeDayLabel(iso) {
  const diff = daysFromToday(iso);
  if (diff === null) return '';
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff > 1 && diff < 7) return `In ${diff} days`;
  if (diff >= 7 && diff < 14) return 'Next week';
  if (diff >= 14) return `In ${Math.round(diff / 7)} weeks`;
  if (diff === -1) return 'Yesterday';
  return `${Math.abs(diff)} days ago`;
}

/** 3 -> '3', 2.5 -> '2.5' (no trailing '.0'). */
export function formatHours(value) {
  const n = Number(value) || 0;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function plural(count, singular, pluralForm) {
  return Number(count) === 1 ? singular : (pluralForm ?? `${singular}s`);
}

export function initials(name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/* ------------------------------------------------------------------
   Toasts
   ------------------------------------------------------------------ */

const toastRoot = () => document.getElementById('toast-root');

export function toast(message, iconName = 'checkCircle') {
  const root = toastRoot();
  if (!root) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `${icon(iconName, 17)}<span>${esc(message)}</span>`;
  root.appendChild(el);
  window.setTimeout(() => {
    el.classList.add('is-out');
    window.setTimeout(() => el.remove(), 280);
  }, 2600);
}

/* ------------------------------------------------------------------
   Modal host — one modal at a time, focus trapped, Esc to close
   ------------------------------------------------------------------ */

const modalRoot = () => document.getElementById('modal-root');

let activeModal = null;

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), ' +
  'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Render a modal into #modal-root.
 * @param {object} options
 * @param {string} options.html       modal markup (without the overlay)
 * @param {Function} [options.onMount] receives the modal element
 * @param {Function} [options.onClose]
 * @param {string} [options.labelledBy] id of the modal heading
 */
export function openModal({ html, onMount, onClose, labelledBy }) {
  closeModal({ silent: true });

  const root = modalRoot();
  if (!root) return;

  const restoreFocusTo = document.activeElement;

  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML =
    `<div class="modal" role="dialog" aria-modal="true"` +
    (labelledBy ? ` aria-labelledby="${labelledBy}"` : '') +
    `>${html}</div>`;

  const panel = overlay.querySelector('.modal');

  const dismiss = () => closeModal();

  overlay.addEventListener('mousedown', (event) => {
    if (event.target === overlay) dismiss();
  });

  overlay.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      dismiss();
      return;
    }
    if (event.key !== 'Tab') return;
    const items = [...panel.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  root.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  activeModal = { overlay, onClose, restoreFocusTo };

  const autofocus = panel.querySelector('[data-autofocus]') || panel.querySelector(FOCUSABLE);
  if (autofocus) autofocus.focus();

  if (onMount) onMount(panel);
}

export function closeModal({ silent = false } = {}) {
  if (!activeModal) return;
  const { overlay, onClose, restoreFocusTo } = activeModal;
  activeModal = null;
  overlay.remove();
  document.body.style.overflow = '';
  if (restoreFocusTo && typeof restoreFocusTo.focus === 'function' && restoreFocusTo.isConnected) {
    restoreFocusTo.focus();
  }
  if (!silent && onClose) onClose();
}

export function isModalOpen() {
  return activeModal !== null;
}

/* ------------------------------------------------------------------
   Confirmation dialog
   ------------------------------------------------------------------ */

/**
 * @param {object} options
 * @param {string} options.title
 * @param {string} options.body            plain text or safe markup
 * @param {string} [options.confirmLabel]
 * @param {'danger'|'primary'} [options.tone]
 * @param {Function} options.onConfirm
 */
export function confirmDialog({
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  onConfirm,
}) {
  const headingId = 'confirm-title';
  const toneClass = tone === 'danger' ? 'btn-danger' : 'btn-primary';
  const toneIcon = tone === 'danger' ? 'alert' : 'info';
  const noticeClass = tone === 'danger' ? 'notice-red' : 'notice-teal';

  openModal({
    labelledBy: headingId,
    html: `
      <div class="modal-head">
        <div>
          <h2 id="${headingId}">${esc(title)}</h2>
        </div>
        <button class="btn-icon" type="button" data-confirm-cancel aria-label="Close dialog">
          ${icon('close', 18)}
        </button>
      </div>
      <div class="modal-body">
        <div class="notice ${noticeClass}">
          ${icon(toneIcon, 17)}
          <div>${body}</div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-secondary" type="button" data-confirm-cancel>${esc(cancelLabel)}</button>
        <button class="btn ${toneClass}" type="button" data-confirm-ok data-autofocus>${esc(confirmLabel)}</button>
      </div>`,
    onMount(panel) {
      panel.querySelectorAll('[data-confirm-cancel]').forEach((btn) => {
        btn.addEventListener('click', () => closeModal());
      });
      panel.querySelector('[data-confirm-ok]').addEventListener('click', () => {
        closeModal({ silent: true });
        onConfirm();
      });
    },
  });
}
