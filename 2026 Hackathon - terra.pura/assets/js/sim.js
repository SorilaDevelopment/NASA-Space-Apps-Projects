// terra.pura · NASA Space Apps Challenge 2026. Code generated with Super Intelligence (SI): Claude by Anthropic;
// designed, reviewed and tested by the terra.pura team.
// terra.pura — crop growth & survival simulator.
// Daily time step:
//   weather  monthly climate normals -> stochastic daily min/max/mean temp + rain
//   soil     single-bucket water balance, FAO-56 style ET (Hargreaves ET0 x crop Kc)
//   crop     growing-degree-day development, biomass growth scaled by stress
//   plant    individual health; frost / heat / drought / waterlogging / pH damage -> death
// Deterministic for a given seed, so the field replays identically when scrubbing.

export function rng(seed) { // mulberry32
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const gauss = r => { const u = 1 - r(), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

const MID = [15, 46, 74, 105, 135, 166, 196, 227, 258, 288, 319, 349]; // mid-month day-of-year
function monthly(arr, doy) { // linear interpolation between mid-month values, wraps the year
  doy = ((doy - 1) % 365 + 365) % 365 + 1;
  let i = MID.findIndex(m => m > doy) - 1;
  if (i === -2) i = 11; if (i === -1) i = 11;
  const j = (i + 1) % 12;
  let span = MID[j] - MID[i]; if (span <= 0) span += 365;
  let off = doy - MID[i]; if (off < 0) off += 365;
  return arr[i] + (arr[j] - arr[i]) * (off / span);
}
export const doyToDate = (doy, year = new Date().getFullYear()) => new Date(year, 0, doy);

function extraterrestrial(latDeg, doy) { // FAO-56 eq. 21, MJ/m²/day
  const phi = latDeg * Math.PI / 180, dr = 1 + 0.033 * Math.cos(2 * Math.PI * doy / 365);
  const d = 0.409 * Math.sin(2 * Math.PI * doy / 365 - 1.39);
  const ws = Math.acos(Math.max(-1, Math.min(1, -Math.tan(phi) * Math.tan(d))));
  return 24 * 60 / Math.PI * 0.082 * dr * (ws * Math.sin(phi) * Math.sin(d) + Math.cos(phi) * Math.cos(d) * Math.sin(ws));
}

/** climate: { lat, t:[12], tmin:[12], tmax:[12], p:[12 mm/month] } */
export function weather(climate, startDoy, days, seed, { tempOffset = 0, rainPct = 100, forecast = null } = {}) {
  const r = rng(seed), yearAnom = gauss(r) * 0.8;
  const out = { tmin: new Float32Array(days), tmax: new Float32Array(days), tmean: new Float32Array(days), rain: new Float32Array(days), et0: new Float32Array(days), doy: new Uint16Array(days) };
  let anom = 0, wetYesterday = false;
  for (let d = 0; d < days; d++) {
    const doy = ((startDoy - 1 + d) % 365) + 1;
    anom = 0.72 * anom + gauss(r) * 1.7;
    const tm = monthly(climate.t, doy) + anom + yearAnom + tempOffset;
    const dtr = Math.max(3, monthly(climate.tmax, doy) - monthly(climate.tmin, doy)) * (0.8 + r() * 0.4);
    const pm = monthly(climate.p, doy) * rainPct / 100; // mm/month
    const pWet = Math.min(0.85, 0.12 + pm / 140) * (wetYesterday ? 1.25 : 0.85);
    const wet = r() < pWet;
    const meanWet = pm / 30.4 / Math.max(0.12, Math.min(0.85, 0.12 + pm / 140));
    const rain = wet ? -Math.log(1 - r()) * meanWet : 0;
    wetYesterday = wet;
    out.doy[d] = doy;
    out.tmean[d] = tm;
    out.tmax[d] = tm + dtr / 2 - (wet ? 1 : 0);
    out.tmin[d] = tm - dtr / 2 + (wet ? 1 : 0);
    out.rain[d] = rain;
    const ra = extraterrestrial(climate.lat, doy) * 0.408; // mm/day equivalent
    out.et0[d] = Math.max(0, 0.85 * 0.0023 * ra * (tm + 17.8) * Math.sqrt(Math.max(0, out.tmax[d] - out.tmin[d])));
    // first days come from the real forecast when we have one (Open-Meteo)
    if (forecast && d < forecast.tmax.length && forecast.tmax[d] != null) {
      out.tmax[d] = forecast.tmax[d] + tempOffset; out.tmin[d] = forecast.tmin[d] + tempOffset;
      out.tmean[d] = (forecast.tmean?.[d] ?? (forecast.tmax[d] + forecast.tmin[d]) / 2) + tempOffset;
      out.rain[d] = (forecast.rain[d] || 0) * rainPct / 100;
      if (forecast.et0?.[d] != null) out.et0[d] = forecast.et0[d];
      anom = out.tmean[d] - monthly(climate.t, doy) - yearAnom - tempOffset;
    }
  }
  return out;
}

const kcAt = (crop, dev) => dev < 0.15 ? 0.4 : dev < 0.4 ? 0.4 + (crop.kc - 0.4) * (dev - 0.15) / 0.25 : dev < 0.8 ? crop.kc : crop.kc - (crop.kc * 0.3) * (dev - 0.8) / 0.2;
export const CAUSES = { frost: 'Frost', heat: 'Heat stress', drought: 'Drought', waterlog: 'Waterlogging', ph: 'Soil pH', cold: 'Too cold to grow' };

/**
 * Simulate one crop row.
 * returns { days, soil:Float32Array (0-1 fill), irrigation mm, plants:[{dev,size,health:Float32Array, diedOn, cause, maturedOn}] }
 */
const DRAIN = 18; // mm/day a typical loam drains once above field capacity
export function simulateCrop(crop, wx, { ph = 6.5, irrigate = false, plants = 12, seed = 1, capacity = 120 } = {}) {
  const days = wx.tmean.length, r = rng(seed * 7919 + crop.id.length * 131);
  const soil = new Float32Array(days);
  let water = capacity * 0.7, irrigation = 0;
  const phDelta = ph < crop.ph[0] ? crop.ph[0] - ph : ph > crop.ph[1] ? ph - crop.ph[1] : 0;
  const ps = Array.from({ length: plants }, () => ({
    tol: Math.max(0.55, 1 + gauss(r) * 0.18), rate: Math.max(0.8, 1 + gauss(r) * 0.05),
    dev: new Float32Array(days), size: new Float32Array(days), health: new Float32Array(days),
    d: 0, s: 0.02, h: 1, wetRun: 0, diedOn: -1, cause: null, maturedOn: -1, damage: {},
  }));
  let lastDay = days - 1;

  for (let t = 0; t < days; t++) {
    const tmean = wx.tmean[t], tmin = wx.tmin[t], tmax = wx.tmax[t];
    // canopy-weighted water use (average living plant development)
    const living = ps.filter(p => p.diedOn < 0 && p.maturedOn < 0);
    const devAvg = living.length ? living.reduce((a, p) => a + p.d, 0) / living.length : 0;
    // water = plant-available water (mm). Above `capacity` (field capacity) the surplus
    // drains at DRAIN mm/day; surplus that can't drain fast enough = standing water.
    let f = Math.min(1, water / capacity);
    const et = wx.et0[t] * (living.length ? kcAt(crop, devAvg) : 0.3) * (f < 0.5 ? f / 0.5 : 1);
    water += wx.rain[t] * 0.85 - et;
    if (irrigate && living.length && water / capacity < 0.45) { irrigation += capacity * 0.8 - water; water = capacity * 0.8; }
    water = Math.max(0, Math.min(capacity + 60, water));
    if (water > capacity) water -= Math.min(water - capacity, DRAIN);
    const surplus = Math.max(0, water - capacity);
    f = Math.min(1, water / capacity); soil[t] = f;

    for (const p of ps) {
      if (p.diedOn >= 0 || p.maturedOn >= 0) { p.dev[t] = p.d; p.size[t] = p.s; p.health[t] = p.diedOn >= 0 ? 0 : p.h; continue; }
      // ---- stresses (damage per day, before tolerance) ----
      const dmg = {};
      const young = p.d < 0.12 ? 1.6 : 1; // seedlings are fragile
      if (tmin < crop.tKill) dmg.frost = (0.3 + 0.12 * (crop.tKill - tmin)) * young;
      if (tmax > crop.tMax) dmg.heat = 0.05 * (tmax - crop.tMax);
      if (f < 0.2) dmg.drought = 0.035 * ((0.2 - f) / 0.2) * (1 - crop.drought) * young; // yield loss first, death only if prolonged
      p.wetRun = surplus > 12 ? p.wetRun + 1 : 0;
      if (p.wetRun > 3) dmg.waterlog = 0.035 * (1 - crop.waterlog);
      if (phDelta > 0) dmg.ph = 0.0035 * phDelta * phDelta + 0.002 * phDelta;
      if (tmean < crop.tBase - 4 && p.d < 0.12) dmg.cold = 0.01;
      let total = 0;
      for (const k in dmg) { const v = dmg[k] / p.tol; total += v; p.damage[k] = (p.damage[k] || 0) + v; }
      p.h = total > 0 ? p.h - total : Math.min(1, p.h + 0.012);
      if (p.h <= 0) {
        p.h = 0; p.diedOn = t;
        p.cause = Object.entries(p.damage).sort((a, b) => b[1] - a[1])[0]?.[0] || 'cold';
      } else {
        // ---- development & growth ----
        const gdd = Math.max(0, Math.min(tmean, crop.tOpt[1] + 4) - crop.tBase);
        p.d = Math.min(1, p.d + gdd / crop.gdd * p.rate);
        const tf = tmean < crop.tOpt[0] ? Math.max(0, (tmean - crop.tBase) / (crop.tOpt[0] - crop.tBase)) : tmean > crop.tOpt[1] ? Math.max(0, 1 - (tmean - crop.tOpt[1]) / (crop.tMax - crop.tOpt[1])) : 1;
        const wf = f < 0.3 ? f / 0.3 : 1;
        const phf = Math.max(0.2, 1 - phDelta * 0.35);
        p.s += (gdd / crop.gdd) * p.rate * Math.min(tf, wf, phf) * (0.5 + 0.5 * p.h) * 1.15;
        if (p.d >= 1) p.maturedOn = t;
      }
      p.dev[t] = p.d; p.size[t] = Math.min(1.15, p.s); p.health[t] = p.h;
    }
    if (ps.every(p => p.diedOn >= 0 || p.maturedOn >= 0)) { lastDay = t; for (let k = t + 1; k < days; k++) { soil[k] = f; for (const p of ps) { p.dev[k] = p.d; p.size[k] = p.s; p.health[k] = p.diedOn >= 0 ? 0 : p.h; } } break; }
  }
  return { crop, days, lastDay, soil, irrigation, plants: ps };
}

/** Monte Carlo over many weather-years: how likely is this crop to die if sown on startDoy? */
export function risk(crop, climate, startDoy, opts = {}, runs = 60) {
  let dead = 0, total = 0, matured = 0, daysToHarvest = 0, size = 0, irrigation = 0;
  const causes = {};
  for (let i = 0; i < runs; i++) {
    const wx = weather(climate, startDoy, opts.days || 330, 1000 + i, opts);
    const res = simulateCrop(crop, wx, { ...opts, plants: 8, seed: 50 + i });
    irrigation += res.irrigation;
    for (const p of res.plants) {
      total++;
      if (p.diedOn >= 0) { dead++; causes[p.cause] = (causes[p.cause] || 0) + 1; }
      else if (p.maturedOn >= 0) { matured++; daysToHarvest += p.maturedOn; size += Math.min(1, p.s); }
    }
  }
  const top = Object.entries(causes).sort((a, b) => b[1] - a[1])[0];
  return { crop, death: dead / total, harvest: matured / total, days: matured ? Math.round(daysToHarvest / matured) : null, cause: top ? top[0] : null, size: matured ? size / matured : 0, irrigation: irrigation / runs };
}

/** Sample temperate climate (SE England normals) used until real NASA POWER data is wired in. */
export const SAMPLE_CLIMATE = {
  lat: 52.2, source: 'sample',
  t:    [4.9, 5.1, 7.3, 9.5, 12.8, 15.8, 18.1, 17.9, 15.2, 11.6, 7.7, 5.2],
  tmin: [1.6, 1.4, 3.0, 4.5, 7.5, 10.5, 12.6, 12.5, 10.4, 7.8, 4.3, 2.0],
  tmax: [8.2, 8.9, 11.9, 14.8, 18.2, 21.2, 23.6, 23.2, 20.1, 15.5, 11.1, 8.4],
  p:    [52, 38, 40, 42, 46, 50, 48, 54, 50, 62, 60, 55],
};
