/**
 * Events — FishWise Local one-day sessions (equipment provided) and
 * official information sources. Sessions are sample content; booking is
 * stored locally and involves no payment.
 */

import { icon } from '../icons.js';
import { esc, toast, confirmDialog, formatDateLong, relativeDayLabel, toISODate } from '../ui.js';
import { SESSIONS, OFFICIAL_LINKS, getMentor } from '../data/community.js';
import { POINTS } from '../data/courses.js';
import { isBooked, bookSession, cancelBooking, seatsLeft, getBookings } from '../progress.js';
import { pageHead, getSpot, spotBadge, sampleChip } from '../components.js';

function sessionDate(s) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + s.dayOffset);
  return toISODate(d);
}

function sessionCard(s) {
  const spot = getSpot(s.spotId);
  const booked = isBooked(s.id);
  const left = seatsLeft(s);
  const lead = getMentor(s.leadId);
  const date = sessionDate(s);
  const pct = Math.round(((s.capacity - left) / s.capacity) * 100);
  return `
  <article class="card session ${booked ? 'is-booked' : ''}">
    <div class="session-date" aria-hidden="true">
      <b>${new Date(date + 'T00:00').getDate()}</b>
      <span>${new Date(date + 'T00:00').toLocaleDateString('en-SG', { month: 'short' })}</span>
    </div>
    <div class="session-main">
      <div class="row-title">${esc(s.title)} ${sampleChip()} ${booked ? `<span class="badge badge-completed">${icon('checkCircle', 12)} Booked</span>` : ''}</div>
      <div class="row-meta">
        <span>${icon('calendar', 13)} ${formatDateLong(date)} · ${relativeDayLabel(date)}</span>
        <span>${icon('clock', 13)} ${esc(s.time)}</span>
        <span>${icon('academy', 13)} ${esc(s.level)}</span>
      </div>
      <p class="small" style="margin-top:.5rem">${esc(s.summary)}</p>
      <div class="badge-row" style="margin-top:.5rem">
        <span class="badge badge-designated">${icon('hook', 12)} Equipment provided</span>
        ${spot ? `<a href="#/map/${spot.id}" class="badge badge-planned">${icon('locations', 12)} ${esc(spot.name)}</a>` : ''}
        ${spot ? spotBadge(spot.status, true) : ''}
      </div>
      <details class="agenda">
        <summary>Agenda & session lead</summary>
        <ol>${s.agenda.map((a) => `<li>${esc(a)}</li>`).join('')}</ol>
        ${lead ? `<p class="small muted">Led by ${esc(lead.name)} (sample mentor) · ${lead.years} years · ${esc(lead.specialty)}</p>` : ''}
      </details>
    </div>
    <div class="session-side">
      <div class="seats"><b>${left}</b> of ${s.capacity} seats left</div>
      <div class="meter meter-sm" aria-hidden="true"><span style="width:${pct}%"></span></div>
      ${booked
        ? `<button class="btn btn-danger-quiet btn-sm btn-block" type="button" data-cancel="${s.id}">${icon('close', 14)} Cancel booking</button>`
        : left > 0
          ? `<button class="btn btn-primary btn-sm btn-block" type="button" data-book="${s.id}">${icon('ticket', 14)} Book a seat</button>`
          : `<button class="btn btn-secondary btn-sm btn-block" type="button" disabled>Fully booked</button>`}
    </div>
  </article>`;
}

export function render() {
  const bookings = getBookings();
  return `
  ${pageHead({
    eyebrow: 'Events & sessions',
    title: 'FishWise Local',
    lede: 'One-day sessions where experienced anglers teach safe, legal fishing — with rods and tackle provided. Booking is free in this prototype.',
  })}
  <div class="notice notice-amber" style="margin-bottom:1rem">${icon('info', 16)}<div><strong>Sample schedule.</strong> These sessions show how FishWise Local would work; they are not real events. You have ${bookings.length} booking${bookings.length === 1 ? '' : 's'}.</div></div>
  <div class="session-list">${SESSIONS.map(sessionCard).join('')}</div>

  <section class="card" style="margin-top:1.25rem" aria-labelledby="info-title">
    <div class="card-head"><h2 id="info-title">Official information</h2><span class="sub">Always check before you go</span></div>
    <div class="link-list card-pad">
      ${OFFICIAL_LINKS.map((l) => `
        <a class="link-row" href="${l.url}" target="_blank" rel="noopener noreferrer">
          ${icon('shield', 18)}
          <span class="who"><b>${esc(l.org)}</b><span>${esc(l.note)}</span></span>
          ${icon('external', 16)}
        </a>`).join('')}
    </div>
  </section>`;
}

export function mount(root, ctx) {
  root.querySelectorAll('[data-book]').forEach((b) => b.addEventListener('click', () => {
    const s = SESSIONS.find((x) => x.id === b.dataset.book);
    confirmDialog({
      title: 'Book this session?',
      body: `<strong>${esc(s.title)}</strong><br>${formatDateLong(sessionDate(s))}, ${esc(s.time)}.<br>Equipment is provided. No payment is taken in this prototype.`,
      confirmLabel: 'Book seat',
      tone: 'primary',
      onConfirm() {
        if (bookSession(s.id)) toast(`Seat booked · +${POINTS.booking} points`, 'ticket');
        ctx.refresh();
      },
    });
  }));
  root.querySelectorAll('[data-cancel]').forEach((b) => b.addEventListener('click', () => {
    const s = SESSIONS.find((x) => x.id === b.dataset.cancel);
    confirmDialog({
      title: 'Cancel your booking?',
      body: `Your seat at <strong>${esc(s.title)}</strong> will be released and the booking points removed.`,
      confirmLabel: 'Cancel booking',
      cancelLabel: 'Keep booking',
      onConfirm() {
        cancelBooking(s.id);
        toast('Booking cancelled', 'close');
        ctx.refresh();
      },
    });
  }));
}
