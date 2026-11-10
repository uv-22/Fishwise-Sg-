/**
 * Inline SVG icon set — one consistent 24x24 stroke family, no emoji and no
 * external icon dependency. Every icon returns a markup string.
 *
 *   icon('fish', 18)            -> decorative (aria-hidden)
 *   icon('fish', 18, 'Fish')    -> labelled for screen readers
 */

const PATHS = {
  // Navigation
  dashboard: '<path d="M3 13h8V3H3v10Z"/><path d="M13 21h8V11h-8v10Z"/><path d="M13 7h8V3h-8v4Z"/><path d="M3 21h8v-4H3v4Z"/>',
  trips: '<path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/><path d="m9 16 2 2 4-4"/>',
  locations: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',

  // Brand / theme
  fish: '<path d="M2 12c3.5-5.5 9.5-5.5 13 0-3.5 5.5-9.5 5.5-13 0Z"/><path d="m15 12 5-3.5v7L15 12Z"/><circle cx="6.5" cy="12" r=".7" fill="currentColor" stroke="none"/>',
  waves: '<path d="M2 6c1.6 0 2.4 1.2 4 1.2S8.4 6 10 6s2.4 1.2 4 1.2S16.4 6 18 6s2.4 1.2 4 1.2"/><path d="M2 12c1.6 0 2.4 1.2 4 1.2s2.4-1.2 4-1.2 2.4 1.2 4 1.2 2.4-1.2 4-1.2 2.4 1.2 4 1.2"/><path d="M2 18c1.6 0 2.4 1.2 4 1.2s2.4-1.2 4-1.2 2.4 1.2 4 1.2 2.4-1.2 4-1.2 2.4 1.2 4 1.2"/>',
  anchor: '<circle cx="12" cy="5" r="3"/><path d="M12 22V8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/>',

  // Stats
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/>',
  release: '<path d="M21 6H9a5 5 0 0 0 0 10h5"/><path d="m17 20 4-4-4-4"/>',
  calendarCheck: '<path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/><path d="m9 16 2 2 4-4"/>',
  chart: '<path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="6" rx="1"/><rect x="12" y="7" width="3" height="10" rx="1"/><rect x="17" y="13" width="3" height="4" rx="1"/>',

  // Actions
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  edit: '<path d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z"/>',
  trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5"/><path d="M14 11v5"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  close: '<path d="M18 6 6 18"/><path d="M6 6l12 12"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 15.3-6.4L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.3 6.4L3 16"/><path d="M3 21v-5h5"/>',
  arrowRight: '<path d="M5 12h14"/><path d="m13 5 7 7-7 7"/>',
  arrowLeft: '<path d="M19 12H5"/><path d="m11 19-7-7 7-7"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h10"/>',
  cube3d: '<path d="M12 2 3 7v10l9 5 9-5V7l-9-5Z"/><path d="m3 7 9 5 9-5M12 12v10"/>',
  external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  filter: '<path d="M3 5h18"/><path d="M7 12h10"/><path d="M11 19h2"/>',

  // Meaning / status
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="8" r=".9" fill="currentColor" stroke="none"/>',
  alert: '<path d="M12 3 2 20h20L12 3Z"/><path d="M12 9v5"/><circle cx="12" cy="17.2" r=".9" fill="currentColor" stroke="none"/>',
  ban: '<circle cx="12" cy="12" r="9"/><path d="m6 6 12 12"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.2 9.3A2.9 2.9 0 0 1 12 7.2c1.6 0 2.8 1 2.8 2.4 0 1.9-2.6 2-2.6 4"/><circle cx="12" cy="17" r=".9" fill="currentColor" stroke="none"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.4 8.3-8 9.6C7.4 20.3 4 17 4 12V6l8-3Z"/><path d="m9 12 2 2 4-4"/>',
  scale: '<path d="M12 3v18"/><path d="M7 21h10"/><path d="M5 7h14"/><path d="M5 7 2 13a3.2 3.2 0 0 0 6 0L5 7Z"/><path d="m19 7-3 6a3.2 3.2 0 0 0 6 0l-3-6Z"/>',
  leaf: '<path d="M4 20c0-8 5-14 16-15 0 11-6 16-13 16H4Z"/><path d="M8 20c1-5 4-8 8-9.5"/>',
  hook: '<path d="M14 3v9a5 5 0 0 1-10 0"/><path d="m11 6 3-3 3 3"/>',
  trashLitter: '<path d="M4 8h16"/><path d="M9 8V5h6v3"/><path d="M6 8l1 12h10l1-12"/>',
  users: '<circle cx="9" cy="8" r="3.4"/><path d="M2 20a7 7 0 0 1 14 0"/><path d="M16.5 5.2a3.4 3.4 0 0 1 0 6.6"/><path d="M18 20a7 7 0 0 0-3-5.7"/>',
  sign: '<path d="M12 3v18"/><path d="M5 6h11l3 3-3 3H5V6Z"/><path d="M9 21h6"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5.5-5.5 2 2-5.5 5.5-2Z"/>',
  note: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z"/><path d="M14 3v6h6"/><path d="M8 14h7"/><path d="M8 17h5"/>',
  empty: '<path d="M4 7h16l-1.5 12.2A2 2 0 0 1 16.5 21h-9a2 2 0 0 1-2-1.8L4 7Z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/>',

  // Platform sections
  map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z"/><path d="M9 4v14"/><path d="M15 6v14"/>',
  academy: '<path d="M2 9l10-5 10 5-10 5L2 9Z"/><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/><path d="M22 9v6"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13.5" r="3.5"/>',
  book: '<path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4V4Z"/><path d="M20 4h-6a3 3 0 0 0-1 .2"/><path d="M20 4v14h-7"/>',
  community: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12Z"/><path d="M8.5 11h7"/><path d="M8.5 14.5h4"/>',
  calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4"/><path d="M16 2v4"/><path d="M3 10h18"/>',
  cube: '<path d="M12 2 3 7v10l9 5 9-5V7l-9-5Z"/><path d="m3 7 9 5 9-5"/><path d="M12 12v10"/>',
  sparkles: '<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3Z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z"/>',
  home: '<path d="M3 11 12 3l9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
  more: '<circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none"/>',

  // Weather
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"/>',
  cloud: '<path d="M7 18h10a4 4 0 0 0 .6-8 6 6 0 0 0-11.4 1.6A3.3 3.3 0 0 0 7 18Z"/>',
  rain: '<path d="M7 15h10a4 4 0 0 0 .6-8 6 6 0 0 0-11.4 1.6A3.3 3.3 0 0 0 7 15Z"/><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3"/>',
  storm: '<path d="M7 15h10a4 4 0 0 0 .6-8 6 6 0 0 0-11.4 1.6A3.3 3.3 0 0 0 7 15Z"/><path d="m12.5 15-2 3.5h3l-2 3.5"/>',
  thermo: '<path d="M10 4a2 2 0 0 1 4 0v10a4 4 0 1 1-4 0V4Z"/><path d="M12 9v7"/>',
  wind: '<path d="M3 8h11a3 3 0 1 0-3-3"/><path d="M3 12h16a3 3 0 1 1-3 3"/><path d="M3 16h7"/>',
  droplet: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z"/>',

  // Map & media
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>',
  crosshair: '<circle cx="12" cy="12" r="8"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
  zoomIn: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/><path d="M11 8v6M8 11h6"/>',
  navigation: '<path d="m3 11 18-8-8 18-2-8-8-2Z"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 17-5-5-9 8"/>',
  upload: '<path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',

  // Rewards & social
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/><path d="M8 6H5a2 2 0 0 0 0 4h3"/><path d="M16 6h3a2 2 0 0 1 0 4h-3"/><path d="M12 13v4"/><path d="M8 21h8"/><path d="M9 17h6v4H9z"/>',
  gift: '<rect x="3" y="8" width="18" height="5" rx="1"/><path d="M5 13v8h14v-8"/><path d="M12 8v13"/><path d="M12 8c-2-4-6-4-6-1.5S9 8 12 8Zm0 0c2-4 6-4 6-1.5S15 8 12 8Z"/>',
  send: '<path d="m4 12 16-8-6 16-2.5-6.5L4 12Z"/><path d="m11.5 13.5 4-4"/>',
  thumbsUp: '<path d="M7 11v9H4v-9h3Z"/><path d="M7 11l4-7a2 2 0 0 1 2.8 2.4L13 10h5.5a2 2 0 0 1 2 2.4l-1.4 6A2 2 0 0 1 17.1 20H7"/>',
  ticket: '<path d="M3 8a2 2 0 0 0 0 4v0a2 2 0 0 0 0 4v2h18v-2a2 2 0 0 1 0-4 2 2 0 0 1 0-4V6H3v2Z"/><path d="M14 6v12" stroke-dasharray="2 2"/>',

  // Playback
  play: '<path d="M7 4v16l13-8L7 4Z"/>',
  pause: '<path d="M7 4h3v16H7zM14 4h3v16h-3z"/>',
  skipBack: '<path d="M19 20 9 12l10-8v16Z"/><path d="M5 19V5"/>',
  skipForward: '<path d="m5 4 10 8-10 8V4Z"/><path d="M19 5v14"/>',
  rotate: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  arrowUp: '<path d="M12 19V5"/><path d="m5 12 7-7 7 7"/>',
  arrowDown: '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
  expand: '<path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="m21 3-7 7"/><path d="m3 21 7-7"/>',
  bookmark: '<path d="M6 3h12v18l-6-4-6 4V3Z"/>',
  pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"/>',
  cloudSync: '<path d="M7 18h10a4 4 0 0 0 .6-8 6 6 0 0 0-11.4 1.6A3.3 3.3 0 0 0 7 18Z"/><path d="m9.5 13.5 2 2 3.5-3.5"/>',
  cloudOff: '<path d="M7 18h10a4 4 0 0 0 1.9-.5M20.6 13.4A4 4 0 0 0 17.6 10 6 6 0 0 0 9 6.3"/><path d="M6.2 11.6A3.3 3.3 0 0 0 7 18"/><path d="m3 3 18 18"/>',
  certificate: '<rect x="3" y="4" width="18" height="13" rx="2"/><circle cx="12" cy="17" r="3"/><path d="m10.5 19.5-1 2.5 2.5-1 2.5 1-1-2.5"/><path d="M7 8h10M7 11h6"/>',
  layersStack: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/><path d="m3 17 9 5 9-5"/>',
  print: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  bag: '<path d="M6 7h12l1 14H5L6 7Z"/><path d="M9 10V6a3 3 0 0 1 6 0v4"/>',
  cart: '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2.5 3h2.6l2.4 12.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L21 8H6"/>',
  train: '<rect x="5" y="3" width="14" height="13" rx="3"/><path d="M5 10h14"/><path d="M8 20l-2 2"/><path d="M16 20l2 2"/><circle cx="9" cy="13" r=".8"/><circle cx="15" cy="13" r=".8"/><path d="M8 16l-1 4h10l-1-4"/>',
  walk: '<circle cx="13" cy="4" r="1.8"/><path d="m9 21 2.5-6.5L14 17v4"/><path d="M8 11l3-3.5 3 1.5 2 3"/><path d="M11 8l1.2 4.8"/>',
  route: '<circle cx="6" cy="19" r="2.2"/><circle cx="18" cy="5" r="2.2"/><path d="M8 19h7.5a3.5 3.5 0 0 0 0-7h-7a3.5 3.5 0 0 1 0-7H16"/>',
  bus: '<rect x="4" y="3" width="16" height="15" rx="3"/><path d="M4 11h16"/><path d="M7 18v3"/><path d="M17 18v3"/><circle cx="8" cy="14.5" r=".8"/><circle cx="16" cy="14.5" r=".8"/>',
  ferry: '<path d="M3 17c2 1.5 4 1.5 6 0s4-1.5 6 0 4 1.5 6 0"/><path d="M5 14l1-5h12l1 5"/><path d="M9 9V5h6v4"/>',
  uv: '<circle cx="12" cy="12" r="3.5"/><path d="M12 2v2.5M12 19.5V22M4.2 4.2 6 6M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8 6 18M18 6l1.8-1.8"/>',
  gauge: '<path d="M4 18a8 8 0 1 1 16 0"/><path d="m12 18 4-6"/><circle cx="12" cy="18" r="1.3"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>',
  tide: '<path d="M2 12c2.5-3 5-3 7.5 0s5 3 7.5 0 3.5-2 5-1"/><path d="M2 18c2.5-3 5-3 7.5 0s5 3 7.5 0 3.5-2 5-1"/><path d="M12 2v6"/><path d="m9 5 3 3 3-3"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-5A8 8 0 1 1 21 12Z"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
};

const STROKE_2_4 = new Set(['check', 'plus', 'close']);

/**
 * @param {string} name  key from PATHS
 * @param {number} size  px
 * @param {string} [label] accessible name; omit to mark the icon decorative
 */
export function icon(name, size = 18, label) {
  const body = PATHS[name];
  if (!body) return '';
  const a11y = label
    ? `role="img" aria-label="${label.replace(/"/g, '&quot;')}"`
    : 'aria-hidden="true" focusable="false"';
  const width = STROKE_2_4.has(name) ? 2.4 : 1.8;
  return (
    `<svg ${a11y} width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" ` +
    `stroke="currentColor" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round">` +
    body +
    '</svg>'
  );
}
