// terra.pura · NASA Space Apps Challenge 2026. Code generated with Super Intelligence (SI): Claude by Anthropic;
// designed, reviewed and tested by the terra.pura team.
//
// Market model: national supply & demand (FAOSTAT Food Balance Sheets), how likely a harvest is to sell,
// how likely a supermarket contract is, and whether on-farm processing (flour mill, oil press) pays.
// All scores are transparent heuristics built from the data — each returns its reasons.

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// how quickly a crop must be sold after harvest (0 = keeps for months, 1 = days)
const PERISH = { leafy: 0.9, fruit: 0.75, root: 0.4, bulb: 0.25, tuber: 0.3, grain: 0.05, legume: 0.1 };
const FRESH = ['leafy', 'fruit', 'root', 'bulb', 'tuber'];

export function balanceFor(crop, cc, market) {
  const item = market?.items?.[crop.id];
  const b = market?.balances?.[cc]?.[item];
  if (!b) return null;
  const pop = market.balances[cc]?.Population?.pop; // thousands
  return { item, aggregate: item === 'Vegetables, other', ...b, perCapita: pop && b.food != null ? (b.food * 1e6) / (pop * 1e3) : null };
}

/** Likelihood (0–1) of selling the whole harvest at a fair price, with reasons. */
export function sellLikelihood(crop, cc, tonnes, market, storage = {}) {
  const b = balanceFor(crop, cc, market);
  const reasons = [];
  let p = 0.72;
  if (b && b.supply > 0) {
    const importDep = (b.imp || 0) / b.supply, selfSuff = (b.prod || 0) / b.supply;
    if (importDep > 0.15) { p += Math.min(0.2, importDep * 0.4); reasons.push(['+', `${Math.round(importDep * 100)}% of ${b.aggregate ? 'these vegetables' : crop.name.toLowerCase()} eaten or used here is imported, so buyers want local supply`]); }
    if (selfSuff > 1.15) { p -= Math.min(0.25, (selfSuff - 1) * 0.3); reasons.push(['−', `the country grows ${Math.round(selfSuff * 100)}% of what it uses, so the surplus competes on export markets`]); }
    else if (selfSuff >= 0.85) reasons.push(['·', `the country is roughly self-sufficient (${Math.round(selfSuff * 100)}%)`]);
    if (b.prod > 0) {
      const share = (tonnes / 1000) / b.prod;
      if (share > 0.002) { p -= Math.min(0.3, share * 40); reasons.push(['−', `your harvest would be ${(share * 100).toFixed(2)}% of national production — a noticeable volume to place`]); }
      else reasons.push(['+', `your harvest is a tiny share of the ${fmtKt(b.prod)} national crop, so it won't move the market`]);
    }
  } else reasons.push(['·', 'no national food-balance data for this crop here — using a neutral estimate']);
  let perish = PERISH[crop.form] ?? 0.3;
  if (storage.id === 'cold' && FRESH.includes(crop.form)) { perish *= 0.5; reasons.push(['+', 'cold storage lets you sell over months instead of days']); }
  else if (storage.id && storage.id !== 'none' && !FRESH.includes(crop.form)) reasons.push(['+', 'it stores well, so you can wait for a better price']);
  if (perish > 0.5) reasons.push(['−', 'it has to be sold within days of harvest']);
  p -= perish * 0.15;
  return { p: clamp(p, 0.05, 0.97), reasons, balance: b };
}

/** Likelihood (0–1) of landing a supermarket supply contract, with reasons. */
export function contractLikelihood(crop, tonnesPerYear, { certified = false, packing = false, organic = false, yearRound = false, chains = [] } = {}) {
  const fresh = FRESH.includes(crop.form);
  const reasons = [];
  let p = fresh ? 0.25 : 0.04;
  reasons.push([fresh ? '+' : '−', fresh ? 'supermarkets buy fresh produce from growers' : `${crop.name} is usually sold to merchants, mills or processors rather than straight to supermarkets`]);
  if (tonnesPerYear >= 200) { p += 0.2; reasons.push(['+', `${Math.round(tonnesPerYear)} t a year is enough for a regional supply contract`]); }
  else if (tonnesPerYear >= 40) { p += 0.1; reasons.push(['+', `${Math.round(tonnesPerYear)} t a year suits local or regional ranges`]); }
  else { p -= 0.05; reasons.push(['−', `${Math.round(tonnesPerYear)} t a year is small for a supermarket — farm shops, markets or a co-op may suit better`]); }
  if (certified) { p += 0.2; reasons.push(['+', 'certified (e.g. GLOBALG.A.P.) — most supermarkets require it']); }
  else reasons.push(['−', 'no food-safety certification yet — almost every supermarket requires one']);
  if (packing) { p += fresh ? 0.1 : 0.03; reasons.push(['+', 'you can wash, grade and pack to spec']); }
  if (yearRound) { p += 0.08; reasons.push(['+', 'you can supply steadily across the year']); }
  if (organic) { p += 0.04; reasons.push(['+', 'organic lines pay a premium and have fewer suppliers']); }
  if (chains == null) { reasons.push(['·', 'couldn’t check which supermarket chains trade nearby (OpenStreetMap busy)']); return { p: clamp(p, 0.02, 0.7), reasons, brands: [] }; }
  const brands = [...new Set(chains.map(c => c.brand))];
  if (brands.length >= 4) { p += 0.08; reasons.push(['+', `${brands.length} supermarket chains trade within 30 km`]); }
  else if (brands.length) { p += 0.03; reasons.push(['·', `${brands.length} supermarket chain${brands.length > 1 ? 's' : ''} nearby`]); }
  else reasons.push(['·', 'no supermarket chains found nearby on OpenStreetMap']);
  // grain & pulses go to merchants/mills: keep supermarket odds low whatever the setup
  return { p: clamp(p, 0.02, fresh ? 0.7 : 0.2), reasons, brands }; // even well-prepared growers rarely beat 70%
}

/* ---------------- on-farm processing ---------------- */
// Equipment figures are typical small-scale (farm) installations; capex in USD.
export const PROCESSES = {
  mill: {
    name: 'Small stone flour mill', crops: ['wheat', 'oats', 'maize', 'barley', 'rice'], capexUSD: 35000, tPerHour: 0.5, kwhPerT: 60, labourHPerT: 2.5, packUSDPerT: 45, premiumPackUSDPerT: 320,
    outputs: crop => [{ id: 'flour', name: crop.id === 'oats' ? 'Oat flour' : crop.id === 'maize' ? 'Cornmeal' : 'Flour', yield: 0.75, bulkX: 1.45, premiumX: 4 },
      { id: 'bran', name: 'Bran (feed)', yield: 0.24, bulkX: 0.7, premiumX: 0.7 }],
    note: 'Stone-ground flour sells at a premium to bakeries and farm shops (but only as much as they can take); bulk flour sells near mill-door prices.',
  },
  press: {
    name: 'Cold oil press', crops: ['rapeseed', 'soy'], capexUSD: 25000, tPerHour: 0.2, kwhPerT: 70, labourHPerT: 3, packUSDPerT: 30, premiumPackUSDPerT: 30, oilBottleUSDPerT: 650,
    outputs: crop => crop.id === 'soy'
      ? [{ id: 'oil', name: 'Soybean oil', yield: 0.12, commodity: 'soyoil', premiumX: 3 }, { id: 'meal', name: 'Soybean cake (feed)', yield: 0.85, commodity: 'soymeal', premiumX: 1 }]
      : [{ id: 'oil', name: 'Cold-pressed rapeseed oil', yield: 0.33, commodity: 'rapeoil', premiumX: 3.5 }, { id: 'cake', name: 'Rapeseed cake (feed)', yield: 0.65, commodity: 'soymeal', commodityX: 0.75, premiumX: 1 }],
    note: 'Cold-pressed oil bottled under your own label sells for several times the bulk oil price.',
  },
};
export { LABOUR_USD } from './labour.js';

/**
 * Annual economics of processing `tonnes` of a crop instead of selling it raw.
 * opts: { mode: 'bulk'|'premium', rawPricePerT, energyPrice, labourPerH, fx, market, capex, productPrices: {id: perT} }
 */
export function processing(processId, crop, tonnes, opts) {
  const P = PROCESSES[processId];
  const fx = opts.fx || 1;
  const capex = opts.capex ?? P.capexUSD * fx;
  const products = P.outputs(crop).map(o => {
    let bulk;
    if (o.commodity && opts.market?.commodities?.[o.commodity]) bulk = opts.market.commodities[o.commodity].usdPerT * (o.commodityX || 1) * fx;
    else bulk = opts.rawPricePerT * (o.bulkX || 1);
    const auto = opts.mode !== 'premium' ? bulk : o.commodity ? bulk * (o.premiumX || 1) : opts.rawPricePerT * (o.premiumX || o.bulkX || 1);
    const price = opts.productPrices?.[o.id] ?? auto;
    return { ...o, t: tonnes * o.yield, pricePerT: price, autoPrice: auto, revenue: tonnes * o.yield * price };
  });
  const revenue = products.reduce((a, o) => a + o.revenue, 0);
  const rawValue = tonnes * opts.rawPricePerT; // what you'd have earned selling the crop as harvested
  const hours = tonnes / P.tPerHour;
  const energy = tonnes * P.kwhPerT * opts.energyPrice;
  const labour = tonnes * P.labourHPerT * opts.labourPerH;
  const oilT = products.find(o => o.id === 'oil')?.t || 0;
  // premium = small retail bags / bottles under your own label (bags, labels, bottles, caps, cartons)
  const flourT = products.find(o => o.id === 'flour')?.t || 0;
  const packing = (opts.mode === 'premium'
    ? (tonnes - flourT - oilT) * P.packUSDPerT + flourT * P.premiumPackUSDPerT + oilT * (P.oilBottleUSDPerT || 0)
    : tonnes * P.packUSDPerT) * fx;
  const upkeep = capex * 0.04;
  const opCost = energy + labour + packing + upkeep;
  const extra = revenue - rawValue - opCost; // gain vs selling raw, per year
  return { P, tonnes, capex, products, revenue, rawValue, hours, energy, labour, packing, upkeep, opCost, extra, payback: extra > 0 ? capex / extra : null };
}

export const fmtKt = kt => kt >= 1000 ? (kt / 1000).toFixed(1) + ' Mt' : kt >= 1 ? Math.round(kt).toLocaleString() + ' kt' : Math.round(kt * 1000).toLocaleString() + ' t';
