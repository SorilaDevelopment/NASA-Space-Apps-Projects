// terra.pura · NASA Space Apps Challenge 2026. Code generated with Super Intelligence (SI): Claude by Anthropic;
// designed, reviewed and tested by the terra.pura team.
//
// Satellite imagery and crop health from NASA GIBS (Global Imagery Browse Services), no key needed:
//  · HLS true colour: Harmonized Landsat 8/9 + Sentinel-2 surface reflectance, 30 m, every 2–3 days
//  · MODIS Terra NDVI: 16-day vegetation index, 250 m, since 2000
// NDVI values are read straight from GIBS map tiles: each colour in the GIBS colour map stands for one NDVI band.

const GIBS = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best';
export const LAYERS = {
  hls: { id: 'HLS_S30_Nadir_BRDF_Adjusted_Reflectance', matrix: 'GoogleMapsCompatible_Level12', ext: 'png', zoom: 12, name: 'NASA HLS true colour (Sentinel-2, 30 m)' },
  hlsL: { id: 'HLS_L30_Nadir_BRDF_Adjusted_Reflectance', matrix: 'GoogleMapsCompatible_Level12', ext: 'png', zoom: 12, name: 'NASA HLS true colour (Landsat, 30 m)' },
  ndvi: { id: 'MODIS_Terra_L3_NDVI_16Day', matrix: 'GoogleMapsCompatible_Level9', ext: 'png', zoom: 9, name: 'NASA MODIS vegetation index (NDVI, 250 m)' },
};
export const gibsTemplate = (L, date) => `${GIBS}/${L.id}/default/${date}/${L.matrix}/{z}/{y}/{x}.${L.ext}`;
export const ESRI_IMAGERY = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

export const iso = d => d.toISOString().slice(0, 10);
const addDays = (d, n) => new Date(d.getTime() + n * 864e5);

function tileOf(lat, lon, z) {
  const n = 2 ** z, x = (lon + 180) / 360 * n, r = lat * Math.PI / 180;
  const y = (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n;
  return { tx: Math.floor(x), ty: Math.floor(y), px: Math.min(255, Math.floor((x % 1) * 256)), py: Math.min(255, Math.floor((y % 1) * 256)) };
}

/** Pixels of the field inside one tile: every pixel whose centre is inside the polygon, or the centroid pixel. */
function fieldPixels(land, center, z) {
  const c = tileOf(center[0], center[1], z), out = new Set([c.py * 256 + c.px]);
  const inside = (lat, lon) => { let k = false; for (let i = 0, j = land.length - 1; i < land.length; j = i++) { const [yi, xi] = land[i], [yj, xj] = land[j]; if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) k = !k; } return k; };
  const lats = land.map(p => p[0]), lons = land.map(p => p[1]);
  const a = tileOf(Math.max(...lats), Math.min(...lons), z), b = tileOf(Math.min(...lats), Math.max(...lons), z);
  if (a.tx === c.tx && b.tx === c.tx && a.ty === c.ty && b.ty === c.ty && (b.px - a.px + 1) * (b.py - a.py + 1) < 4000) {
    const n = 2 ** z;
    for (let py = a.py; py <= b.py; py++) for (let px = a.px; px <= b.px; px++) {
      const x = c.tx + (px + 0.5) / 256, y = c.ty + (py + 0.5) / 256;
      const lon = x / n * 360 - 180, lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n))) * 180 / Math.PI;
      if (inside(lat, lon)) out.add(py * 256 + px);
    }
  }
  return { ...c, pixels: [...out] };
}

const canvas = () => { const c = document.createElement('canvas'); c.width = c.height = 256; return c.getContext('2d', { willReadFrequently: true }); };
function loadImage(url, ms = 15000) {
  return new Promise((res, rej) => {
    const img = new Image(); img.crossOrigin = 'anonymous';
    const t = setTimeout(() => { img.src = ''; rej(new Error('timeout')); }, ms);
    img.onload = () => { clearTimeout(t); res(img); };
    img.onerror = () => { clearTimeout(t); rej(new Error('tile')); };
    img.src = url;
  });
}
async function readPixels(url, pixels) {
  const img = await loadImage(url), ctx = canvas();
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, 256, 256).data;
  return pixels.map(i => [d[i * 4], d[i * 4 + 1], d[i * 4 + 2], d[i * 4 + 3]]);
}
async function pool(items, n, fn) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]).catch(() => null); } }));
  return out;
}

let cmap = null;
const colormap = () => (cmap ||= fetch('assets/data/ndvi-colormap.json').then(r => r.json()).then(m => {
  const entries = Object.entries(m).map(([k, v]) => [k.split(',').map(Number), v]);
  return { exact: m, entries };
}));
function ndviOf([r, g, b, a], cm) {
  if (a < 128) return null; // no data, water or cloud-masked
  const v = cm.exact[`${r},${g},${b}`];
  if (v != null) return v;
  let best = null, bd = 1e9; // nearest colour (browsers can shift colours by a step)
  for (const [[R, G, B], val] of cm.entries) { const dd = (R - r) ** 2 + (G - g) ** 2 + (B - b) ** 2; if (dd < bd) { bd = dd; best = val; } }
  return bd <= 12 ? best : null;
}

/** 16-day MODIS NDVI for the field since `fromYear` (cached for a week). [{date, ndvi}] */
export async function ndviSeries(land, center, fromYear = new Date().getFullYear() - 3) {
  const key = 'tp.ndvi.' + center.map(v => v.toFixed(4)).join(',') + '.' + fromYear;
  try { const c = JSON.parse(localStorage.getItem(key)); if (c && Date.now() - c.at < 7 * 864e5) return c.series; } catch {}
  const cm = await colormap(), L = LAYERS.ndvi, f = fieldPixels(land, center, L.zoom);
  const dates = [], last = addDays(new Date(), -20);
  for (let y = fromYear; y <= last.getFullYear(); y++) for (let k = 0; k < 23; k++) { const d = addDays(new Date(Date.UTC(y, 0, 1)), 16 * k); if (d <= last) dates.push(iso(d)); }
  const url = date => `${GIBS}/${L.id}/default/${date}/${L.matrix}/${L.zoom}/${f.ty}/${f.tx}.png`;
  const vals = await pool(dates, 8, async date => {
    const px = await readPixels(url(date), f.pixels);
    const v = px.map(p => ndviOf(p, cm)).filter(x => x != null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  });
  const series = dates.map((date, i) => ({ date, ndvi: vals[i] })).filter(p => p.ndvi != null);
  if (series.length > 5) try { localStorage.setItem(key, JSON.stringify({ at: Date.now(), series, pixels: f.pixels.length })); } catch {}
  return series;
}

/**
 * Most recent HLS (Landsat/Sentinel-2) days with a clear view of the field, newest first.
 * A day counts as clear when the field pixels have data and aren't cloud-white.
 */
export async function clearHlsDates(center, { days = 60, want = 6 } = {}) {
  const key = 'tp.hls2.' + center.map(v => v.toFixed(4)).join(',');
  try { const c = JSON.parse(localStorage.getItem(key)); if (c && Date.now() - c.at < 864e5) return c.dates; } catch {}
  const found = [];
  for (const layer of [LAYERS.hls, LAYERS.hlsL]) {
    const t = tileOf(center[0], center[1], layer.zoom), pix = [];
    for (let dy = -6; dy <= 6; dy += 2) for (let dx = -6; dx <= 6; dx += 2) pix.push(Math.max(0, Math.min(255, t.py + dy)) * 256 + Math.max(0, Math.min(255, t.px + dx)));
    const dates = Array.from({ length: days }, (_, i) => iso(addDays(new Date(), -1 - i)));
    const res = await pool(dates, 6, async date => {
      const px = await readPixels(`${GIBS}/${layer.id}/default/${date}/${layer.matrix}/${layer.zoom}/${t.ty}/${t.tx}.png`, pix);
      const valid = px.filter(p => p[3] > 200);
      if (valid.length < pix.length * 0.8) return null; // no overpass that day
      // cloud and haze: bright and grey. Clear farmland is darker and more saturated.
      const cloudy = valid.filter(([r, g, b]) => (r + g + b) / 3 > 125 && Math.max(r, g, b) - Math.min(r, g, b) < 45).length;
      return cloudy / valid.length < 0.08 ? { date, layer: layer === LAYERS.hls ? 'hls' : 'hlsL' } : null;
    });
    found.push(...res.filter(Boolean));
  }
  const dates = found.sort((a, b) => b.date.localeCompare(a.date)).slice(0, want);
  try { localStorage.setItem(key, JSON.stringify({ at: Date.now(), dates })); } catch {}
  return dates;
}

/** Summarise a series: this season vs the same time in earlier years. */
export function ndviSummary(series) {
  if (!series.length) return null;
  const latest = series[series.length - 1], d = new Date(latest.date), doy = Math.floor((d - Date.UTC(d.getUTCFullYear(), 0, 0)) / 864e5);
  const same = series.filter(p => { const x = new Date(p.date); const dd = Math.floor((x - Date.UTC(x.getUTCFullYear(), 0, 0)) / 864e5); return x.getUTCFullYear() !== d.getUTCFullYear() && Math.abs(dd - doy) <= 12; });
  const usual = same.length ? same.reduce((a, p) => a + p.ndvi, 0) / same.length : null;
  const yr = series.filter(p => p.date.startsWith(String(d.getUTCFullYear())));
  const peak = yr.reduce((m, p) => (p.ndvi > (m?.ndvi ?? -1) ? p : m), null);
  return { latest, usual, diff: usual != null ? latest.ndvi - usual : null, peak };
}

export const ndviWord = v => v == null ? '—' : v < 0.15 ? 'bare soil or water' : v < 0.3 ? 'sparse or stubble' : v < 0.5 ? 'moderate growth' : v < 0.7 ? 'healthy growth' : 'dense, vigorous growth';
