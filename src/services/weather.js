/**
 * Live weather from data.gov.sg (NEA / Meteorological Service Singapore).
 * Public endpoints, no API key, CORS enabled.
 *
 * The anonymous rate limit is tight, so responses are cached in
 * sessionStorage for five minutes and concurrent requests are de-duplicated.
 */

const BASE = 'https://api-open.data.gov.sg/v2/real-time/api';
const TTL = 5 * 60 * 1000;
const inflight = new Map();

function cacheGet(key) {
  try {
    const raw = sessionStorage.getItem(`fw.wx.${key}`);
    if (!raw) return null;
    const { at, data } = JSON.parse(raw);
    return Date.now() - at < TTL ? data : null;
  } catch {
    return null;
  }
}

function cacheSet(key, data) {
  try {
    sessionStorage.setItem(`fw.wx.${key}`, JSON.stringify({ at: Date.now(), data }));
  } catch {
    /* storage full or blocked: just skip caching */
  }
}

async function getJSON(path) {
  const cached = cacheGet(path);
  if (cached) return cached;
  if (inflight.has(path)) return inflight.get(path);
  const p = (async () => {
    const res = await fetch(`${BASE}/${path}`);
    if (res.status === 429) throw new Error('Weather service is busy — try again in a few seconds.');
    if (!res.ok) throw new Error(`Weather service error (${res.status}).`);
    const body = await res.json();
    if (body.code !== 0 || !body.data) throw new Error(body.errorMsg || 'Weather data unavailable.');
    cacheSet(path, body.data);
    return body.data;
  })();
  inflight.set(path, p);
  try {
    return await p;
  } finally {
    inflight.delete(path);
  }
}

/** Distance in km between two lat/lng points. */
export function distanceKm(aLat, aLng, bLat, bLng) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** 2-hour nowcast for 47 areas. */
export async function getTwoHour() {
  const data = await getJSON('two-hr-forecast');
  const item = data.items?.[0];
  if (!item) throw new Error('No 2-hour forecast published right now.');
  const byName = new Map(item.forecasts.map((f) => [f.area, f.forecast]));
  return {
    validText: item.valid_period?.text || '',
    updated: item.update_timestamp,
    areas: data.area_metadata.map((a) => ({
      name: a.name,
      lat: a.label_location.latitude,
      lng: a.label_location.longitude,
      forecast: byName.get(a.name) || 'Unknown',
    })),
  };
}

export async function getTwentyFour() {
  const data = await getJSON('twenty-four-hr-forecast');
  const rec = data.records?.[0];
  if (!rec) throw new Error('No 24-hour forecast published right now.');
  return {
    general: rec.general,
    periods: rec.periods || [],
    updated: rec.updatedTimestamp,
  };
}

export async function getTemperatures() {
  const data = await getJSON('air-temperature');
  const reading = data.readings?.[0];
  if (!reading) throw new Error('No temperature readings right now.');
  const values = new Map(reading.data.map((d) => [d.stationId, d.value]));
  return {
    at: reading.timestamp,
    stations: data.stations
      .filter((s) => values.has(s.id))
      .map((s) => ({ name: s.name, lat: s.location.latitude, lng: s.location.longitude, value: values.get(s.id) })),
  };
}

export function nearest(list, lat, lng) {
  let best = null;
  let bestD = Infinity;
  for (const item of list) {
    const d = distanceKm(lat, lng, item.lat, item.lng);
    if (d < bestD) {
      bestD = d;
      best = item;
    }
  }
  return best ? { ...best, km: bestD } : null;
}

/**
 * Turn a forecast phrase into fishing advice. NParks advises stopping and
 * sheltering in bad weather; lightning is the main danger with a rod.
 */
export function fishingRisk(forecast = '') {
  const f = forecast.toLowerCase();
  if (f.includes('thunder')) {
    return { level: 'stop', tone: 'red', icon: 'storm', label: 'Lightning risk', advice: 'Thundery showers forecast. Do not fish — a rod conducts lightning. Shelter indoors.' };
  }
  if (f.includes('heavy') || f.includes('shower') || f.includes('rain') || f.includes('drizzle')) {
    return { level: 'caution', tone: 'amber', icon: 'rain', label: 'Wet', advice: 'Rain expected. Slippery jetties — wear grippy shoes and watch for thunder.' };
  }
  if (f.includes('windy') || f.includes('hazy')) {
    return { level: 'caution', tone: 'amber', icon: 'cloud', label: 'Check conditions', advice: 'Wind or haze forecast. Take care on exposed jetties.' };
  }
  if (f.includes('night')) {
    return { level: 'good', tone: 'teal', icon: 'moon', label: 'Fair', advice: 'Fair conditions. Bring a headlamp and stay on lit, marked areas.' };
  }
  return { level: 'good', tone: 'teal', icon: 'sun', label: 'Fair', advice: 'Fair conditions. Bring water, sun protection and a hat.' };
}
