// terra.pura · NASA Space Apps Challenge 2026. Code generated with Super Intelligence (SI): Claude by Anthropic;
// designed, reviewed and tested by the terra.pura team.
// terra.pura — economics: turns climate + soil + prices + the farmer's answers into per-crop
// cost / revenue / profit / emissions, a "best to grow now" ranking and a year-round rotation.
import { CROPS } from './crops.js';
import { risk, SAMPLE_CLIMATE } from './sim.js';
import { fleetYear } from './farm.js';
import { GRID_CO2, DIESEL_USD } from './data.js';
import { labourFor, IMPLICIT_USD_PER_H } from './labour.js';

const MONTH_START = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
export const doyOf = d => Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5);
export const PUMP_KWH_PER_M3 = 0.4;   // typical irrigation pumping energy
export const RETURN_TO_SEWER = 0.1;   // share of mains water charged as sewage (field irrigation mostly isn't returned)

/** Gather every input (with the farmer's overrides applied). */
export function inputs(s, prices) {
  const o = s.overrides || {};
  const cur = s.region?.currency || 'USD', cc = s.region?.cc || '';
  const fx = s.fx?.rates?.[cur] || 1;
  let climate = s.climate || { ...SAMPLE_CLIMATE, lat: s.center?.[0] ?? SAMPLE_CLIMATE.lat };
  const basePrecip = climate.p.reduce((a, b) => a + b, 0), baseT = climate.t.reduce((a, b) => a + b, 0) / 12;
  const rainPct = o.rainfall ? (o.rainfall / basePrecip) * 100 : 100;
  const tempOffset = o.temp != null ? o.temp - baseT : 0;
  const area = o.area ?? s.landUse?.growable ?? s.area ?? 10000;
  const ph = o.ph ?? s.soil?.ph ?? 6.5;
  const perUnit = k => (s[k]?.id ? s[k].price : 0) || 0; // currency per kWh / per L
  return {
    s, prices, cur, cc, fx, climate, basePrecip, baseT, rainPct, tempOffset, area, ph,
    fertility: o.fertility ?? s.soil?.fertility ?? 50,
    energy: perUnit('energy'), water: perUnit('water') * 1000, sewage: perUnit('sewage') * 1000, // per kWh, per m³
    ownKwhMonth: s.energy?.own || 0, ownWaterM3Month: (s.water?.own || 0) / 1000,
    diesel: (o.diesel ?? (DIESEL_USD[cc] ?? 1.3) * fx),
    grid: GRID_CO2[cc] ?? 0.45,
    fleet: s.fleet || [], storage: s.storage || { id: 'none' },
    seedsScale: o.seedsPerM2 ? o.seedsPerM2 : null,
    forecast: s.forecast || null,
    labour: labourFor(s, cc, fx),
  };
}

export function priceUSD(crop, cc, prices) {
  const local = prices?.countries?.[cc]?.[crop.fao];
  if (local) return { usd: local[0], year: local[1], scope: 'local' };
  const w = prices?.world?.[crop.fao];
  return w ? { usd: w, year: null, scope: 'world median' } : { usd: 300, year: null, scope: 'fallback' };
}

const riskCache = new Map();
function cachedRisk(crop, I, doy, useForecast) {
  const key = [crop.id, doy, I.ph, I.rainPct.toFixed(1), I.tempOffset.toFixed(2), useForecast, I.climate.source, I.climate.lat].join('|');
  if (!riskCache.has(key)) riskCache.set(key, risk(crop, I.climate, doy, { ph: I.ph, irrigate: crop.irrigated && (I.water > 0 || I.ownWaterM3Month > 0), tempOffset: I.tempOffset, rainPct: I.rainPct, days: 330, forecast: useForecast ? I.forecast : null }, 24));
  return riskCache.get(key);
}

/** Full economics for one crop sown on day-of-year `doy`. */
export function evaluate(crop, I, doy, useForecast = false) {
  const r = cachedRisk(crop, I, doy, useForecast);
  const ha = I.area / 10000, days = r.days || 200, months = days / 30.4;
  const fert = 0.75 + 0.5 * (I.fertility / 100); // 0.75–1.25 yield factor from soil fertility
  const tonnes = crop.yield * ha * r.harvest * Math.min(1, r.size || 0) * fert * crop.sellable;
  const p = priceUSD(crop, I.cc, I.prices);
  const pricePerT = p.usd * I.fx;
  const revenue = tonnes * pricePerT;

  const waterM3 = r.irrigation * I.area / 1000;
  const billableWater = Math.max(0, waterM3 - I.ownWaterM3Month * months);
  const waterCost = billableWater * I.water;
  const sewageCost = billableWater * RETURN_TO_SEWER * I.sewage;

  const fleet = fleetYear(I.fleet, I.grid), share = days / 365;
  const st = I.storage, stMonths = st.id && st.id !== 'none' ? st.months || 0 : 0;
  const storeKwh = tonnes * stMonths * (st.kwh || 0);
  const kwh = waterM3 * PUMP_KWH_PER_M3 + fleet.kwh * share + storeKwh;
  const billableKwh = Math.max(0, kwh - I.ownKwhMonth * months);
  const energyCost = billableKwh * I.energy;

  const seedKg = crop.seed * ha * (I.seedsScale ? I.seedsScale / crop.spacing : 1);
  const seedPrice = crop.seedUSD * I.fx;
  const seedCost = seedKg * seedPrice;
  const fuelL = (fleet.diesel + fleet.petrol) * share;
  const fuelCost = fuelL * I.diesel;
  const storageCost = tonnes * stMonths * (st.rate || 0);
  const co2 = (fleet.co2 * share + (waterM3 * PUMP_KWH_PER_M3 + storeKwh) * I.grid) / 1000; // t CO2e

  // fertiliser, sprays, packing: the crop's typical "other" costs minus the labour part, which is charged at your own rates
  const workFactor = 0.4 + 0.6 * r.harvest; // a failed crop still needs most of the inputs but little harvest work
  const otherPerHaUSD = Math.max(crop.otherUSD * 0.3, crop.otherUSD - (crop.labourH || 0) * IMPLICIT_USD_PER_H);
  const otherCost = otherPerHaUSD * ha * I.fx * workFactor;
  const labourH = (crop.labourH || 0) * ha * workFactor;
  const lab = I.labour ? I.labour.split(labourH, days) : { staffH: 0, seasonalH: labourH, cost: labourH * 15 * I.fx };
  const labourCost = lab.cost;
  const cost = energyCost + waterCost + sewageCost + seedCost + fuelCost + storageCost + otherCost + labourCost;
  const profit = revenue - cost;
  return {
    crop, doy, risk: r, days, tonnes, revenue, pricePerT, priceKg: pricePerT / 1000, priceScope: p.scope, priceYear: p.year,
    waterM3, kwh, seedKg, seedPrice, fuelL, co2,
    costs: { energy: energyCost, water: waterCost, sewage: sewageCost, seeds: seedCost, fuel: fuelCost, storage: storageCost, other: otherCost, labour: labourCost },
    detail: {
      ha, workFactor, otherPerHaUSD, labourH, lab,
      pumpKwh: waterM3 * PUMP_KWH_PER_M3, fleetKwh: fleet.kwh * share, storeKwh, billableKwh, ownKwh: I.ownKwhMonth * months,
      billableWater, ownWater: I.ownWaterM3Month * months, sewerM3: billableWater * RETURN_TO_SEWER,
      stMonths, fleetShare: share, fleetCo2: fleet.co2 * share / 1000, gridCo2: (waterM3 * PUMP_KWH_PER_M3 + storeKwh) * I.grid / 1000,
    },
    cost, profit, margin: cost > 0 ? profit / cost : 0,
    perDay: profit / days,
    viable: r.harvest >= 0.35 && tonnes > 0,
  };
}

/** Ranking for sowing today (uses the live forecast for the first 16 days). */
export function bestNow(I, today = new Date()) {
  const doy = doyOf(today);
  return CROPS.map(c => evaluate(c, I, doy, true))
    .sort((a, b) => (b.viable - a.viable) || (b.perDay * (1 - b.risk.death) - a.perDay * (1 - a.risk.death)));
}

/** Greedy year plan: from today, keep picking the most profitable-per-day crop that fits. */
export function rotation(I, today = new Date(), maxCycles = 3) {
  const start = doyOf(today), plan = [];
  let day = 0;
  while (plan.length < maxCycles && day < 330) {
    const doy = ((start + day - 1) % 365) + 1;
    const snapped = MONTH_START.reduce((b, m) => Math.abs(m - doy) < Math.abs(b - doy) ? m : b, MONTH_START[0]); // cache by month
    const options = CROPS.map(c => evaluate(c, I, snapped, day === 0))
      .filter(e => e.viable && e.profit > 0 && day + e.days <= 365 && !plan.some(p => p.crop.id === e.crop.id));
    if (!options.length) { day += 30; continue; }
    const best = options.sort((a, b) => b.perDay - a.perDay)[0];
    plan.push({ ...best, startDay: day });
    day += best.days + 10; // ~10 days between harvest and next sowing
  }
  return plan;
}

/** Plain-language reason for a recommendation. */
export function reason(e, I, fmt) {
  const c = e.crop, bits = [];
  const fc = I.forecast;
  if (fc) {
    const rain = fc.rain.reduce((a, b) => a + (b || 0), 0), frost = fc.tmin.filter(t => t < 0).length;
    const normal = I.climate.p[new Date().getMonth()] / 30.4 * fc.rain.length;
    bits.push(`The next ${fc.rain.length} days bring ${Math.round(rain)} mm of rain (${rain < normal * 0.8 ? 'drier' : rain > normal * 1.2 ? 'wetter' : 'about normal'} for the season)${frost ? ` and ${frost} frosty night${frost > 1 ? 's' : ''}, which ${c.tKill <= -5 ? 'it shrugs off' : 'it is sensitive to'}` : ''}.`);
  }
  const phOk = I.ph >= c.ph[0] && I.ph <= c.ph[1];
  bits.push(phOk ? `Your soil pH of ${I.ph.toFixed(1)} sits inside its ideal ${c.ph[0]}–${c.ph[1]} range.` : `Your soil pH of ${I.ph.toFixed(1)} is outside its ideal ${c.ph[0]}–${c.ph[1]}, which costs some yield${I.ph < c.ph[0] ? ' (liming would help)' : ''}.`);
  bits.push(`In our simulation ${Math.round(e.risk.harvest * 100)}% of plants reach harvest in about ${e.days} days${e.risk.death > 0.05 && e.risk.cause ? `; the main risk is ${e.risk.cause === 'ph' ? 'soil pH' : e.risk.cause}` : ''}.`);
  bits.push(`One cycle costs about ${fmt(e.cost)} (energy, water, seeds${e.costs.fuel ? ', fuel' : ''}${e.costs.storage ? ', storage' : ''}, plus typical fertiliser and spray costs and the labour at your wage rates), and sells for ${fmt(e.priceKg, 3)}/kg${e.priceScope === 'local' ? ` (FAOSTAT ${e.priceYear} farm-gate price)` : ' (world median price)'}, for an estimated ${e.margin >= 0 ? Math.round(e.margin * 100) + '% profit' : Math.round(-e.margin * 100) + '% loss'}.`);
  return bits.join(' ');
}
