// terra.pura · NASA Space Apps Challenge 2026. Code generated with Super Intelligence (SI): Claude by Anthropic;
// designed, reviewed and tested by the terra.pura team.
// terra.pura — crop parameters used by the growth simulator and the dashboard ranking.
// Values are agronomic rules of thumb (FAO Ecocrop / FAO-56 crop coefficients / extension
// guides), simplified for a hackathon model — good enough to compare crops, not to farm by.
//
// tBase   base temperature for growing-degree-days (°C)
// tOpt    optimal mean-temperature band (°C)
// tMax    daily max above which heat stress starts (°C)
// tKill   daily min that causes frost damage (°C)
// gdd     degree-days (above tBase) from sowing to harvest
// ph      tolerated soil pH band
// kc      mid-season crop coefficient (FAO-56)
// drought / waterlog  tolerance 0 (none) … 1 (very tolerant)
// yield   typical yield (t/ha), seed  sowing rate (kg/ha)
// spacing plants per m² (for the seeds/m² estimate)
// sow     months (1-12) it's usually sown in temperate climates (used as a hint only)
// form    drawing/3D style   fao  FAOSTAT item name for producer prices (raw goods only)
// otherUSD typical other variable costs per ha (fertiliser, sprays, labour, packing) — farm-business-survey ballpark
// labourH typical hours of work per ha per crop (field work, hand weeding, harvest, grading) — extension-guide ballpark;
// the labour part of otherUSD (labourH × US$15/h) is taken out and charged at YOUR wage rates instead (see labour.js)
// sellable share of the harvest that's marketable after grading   irrigated  normally irrigated when water is available
// seedUSD approx. seed price per kg (certified seed / seed potatoes / hybrid vegetable seed)
export const CROPS = [
  { id: 'wheat',    name: 'Winter wheat', form: 'grain',  color: '#d9b55a', tBase: 0,  tOpt: [12, 24], tMax: 34, tKill: -18, gdd: 2200, ph: [6.0, 7.5], kc: 1.15, drought: .5,  waterlog: .3, yield: 8,  seed: 180,  spacing: 300, sow: [9, 10, 11], seedUSD: 0.6, otherUSD: 650, labourH: 7, sellable: 0.97, irrigated: false, fao: 'Wheat' },
  { id: 'barley',   name: 'Spring barley', form: 'grain', color: '#e3c77a', tBase: 0,  tOpt: [12, 22], tMax: 32, tKill: -8,  gdd: 1500, ph: [6.0, 7.8], kc: 1.15, drought: .6,  waterlog: .25, yield: 6, seed: 160,  spacing: 300, sow: [2, 3, 4], seedUSD: 0.6, otherUSD: 550, labourH: 6, sellable: 0.97, irrigated: false, fao: 'Barley' },
  { id: 'oats',     name: 'Oats',         form: 'grain',  color: '#cdb98a', tBase: 0,  tOpt: [12, 20], tMax: 30, tKill: -6,  gdd: 1500, ph: [5.5, 7.0], kc: 1.15, drought: .45, waterlog: .35, yield: 5, seed: 150,  spacing: 300, sow: [2, 3, 4], seedUSD: 0.6, otherUSD: 450, labourH: 6, sellable: 0.97, irrigated: false, fao: 'Oats' },
  { id: 'maize',    name: 'Maize',        form: 'grain',  color: '#f0c94a', tBase: 8,  tOpt: [20, 30], tMax: 38, tKill: -1,  gdd: 1150, ph: [5.8, 7.0], kc: 1.2,  drought: .4,  waterlog: .2, yield: 9,  seed: 25,   spacing: 9,   sow: [4, 5], seedUSD: 6, otherUSD: 800, labourH: 9, sellable: 0.95, irrigated: false, fao: 'Maize (corn)' },
  { id: 'rice',     name: 'Rice',         form: 'grain',  color: '#c9c27a', tBase: 10, tOpt: [25, 32], tMax: 38, tKill: 2,   gdd: 1600, ph: [5.5, 6.5], kc: 1.2,  drought: .1,  waterlog: 1,  yield: 5,  seed: 80,   spacing: 25,  sow: [5, 6], seedUSD: 1.2, otherUSD: 1100, labourH: 40, sellable: 0.95, irrigated: true, fao: 'Rice' },
  { id: 'potato',   name: 'Potato',       form: 'tuber',  color: '#c9a46b', tBase: 4,  tOpt: [15, 20], tMax: 29, tKill: -2,  gdd: 1450, ph: [5.0, 6.5], kc: 1.15, drought: .3,  waterlog: .2, yield: 40, seed: 2500, spacing: 4,   sow: [3, 4, 5], seedUSD: 0.6, otherUSD: 6500, labourH: 55, sellable: 0.85, irrigated: true, fao: 'Potatoes' },
  { id: 'carrot',   name: 'Carrot',       form: 'root',   color: '#e07a2e', tBase: 4,  tOpt: [16, 21], tMax: 30, tKill: -6,  gdd: 1100, ph: [6.0, 6.8], kc: 1.05, drought: .45, waterlog: .2, yield: 50, seed: 3,    spacing: 80,  sow: [3, 4, 5, 6, 7], seedUSD: 120, otherUSD: 11000, labourH: 140, sellable: 0.7, irrigated: true, fao: 'Carrots and turnips' },
  { id: 'beet',     name: 'Sugar beet',   form: 'root',   color: '#b0476b', tBase: 3,  tOpt: [18, 25], tMax: 32, tKill: -4,  gdd: 2200, ph: [6.5, 8.0], kc: 1.2,  drought: .5,  waterlog: .25, yield: 70, seed: 3,  spacing: 10,  sow: [3, 4], seedUSD: 400, otherUSD: 1500, labourH: 18, sellable: 0.95, irrigated: false, fao: 'Sugar beet' },
  { id: 'onion',    name: 'Onion',        form: 'bulb',   color: '#c98b4f', tBase: 5,  tOpt: [13, 24], tMax: 32, tKill: -7,  gdd: 1500, ph: [6.0, 7.0], kc: 1.05, drought: .35, waterlog: .2, yield: 40, seed: 4,    spacing: 50,  sow: [3, 4, 9], seedUSD: 150, otherUSD: 9000, labourH: 110, sellable: 0.8, irrigated: true, fao: 'Onions and shallots, dry (excluding dehydrated)' },
  { id: 'cabbage',  name: 'Cabbage',      form: 'leafy',  color: '#8fbf7a', tBase: 4,  tOpt: [15, 20], tMax: 28, tKill: -9,  gdd: 1300, ph: [6.0, 7.5], kc: 1.05, drought: .4,  waterlog: .3, yield: 50, seed: 0.5,  spacing: 4,   sow: [3, 4, 5, 6, 7], seedUSD: 400, otherUSD: 14000, labourH: 220, sellable: 0.65, irrigated: true, fao: 'Cabbages' },
  { id: 'lettuce',  name: 'Lettuce',      form: 'leafy',  color: '#a9d68a', tBase: 4,  tOpt: [15, 20], tMax: 27, tKill: -3,  gdd: 700,  ph: [6.0, 7.0], kc: 1.0,  drought: .25, waterlog: .25, yield: 30, seed: 1,  spacing: 10,  sow: [3, 4, 5, 6, 7, 8], seedUSD: 250, otherUSD: 17000, labourH: 380, sellable: 0.6, irrigated: true, fao: 'Lettuce and chicory' },
  { id: 'spinach',  name: 'Spinach',      form: 'leafy',  color: '#5f9e5a', tBase: 2,  tOpt: [10, 20], tMax: 26, tKill: -9,  gdd: 600,  ph: [6.5, 7.5], kc: 1.0,  drought: .3,  waterlog: .3, yield: 15, seed: 25,   spacing: 40,  sow: [2, 3, 4, 8, 9], seedUSD: 25, otherUSD: 9000, labourH: 160, sellable: 0.7, irrigated: true, fao: 'Spinach' },
  { id: 'tomato',   name: 'Tomato',       form: 'fruit',  color: '#d9483b', tBase: 10, tOpt: [21, 27], tMax: 35, tKill: 0,   gdd: 850, ph: [6.0, 6.8], kc: 1.15, drought: .35, waterlog: .15, yield: 60, seed: 0.2, spacing: 3,   sow: [4, 5], seedUSD: 3000, otherUSD: 30000, labourH: 900, sellable: 0.75, irrigated: true, fao: 'Tomatoes' },
  { id: 'pumpkin',  name: 'Pumpkin',      form: 'fruit',  color: '#e08a2e', tBase: 10, tOpt: [20, 30], tMax: 35, tKill: 0,   gdd: 850, ph: [6.0, 7.5], kc: 1.0,  drought: .4,  waterlog: .2, yield: 25, seed: 3,    spacing: 1,   sow: [5, 6], seedUSD: 60, otherUSD: 7000, labourH: 180, sellable: 0.75, irrigated: true, fao: 'Pumpkins, squash and gourds' },
  { id: 'peas',     name: 'Peas',         form: 'legume', color: '#7fb85a', tBase: 4.5, tOpt: [13, 18], tMax: 28, tKill: -4, gdd: 1100, ph: [6.0, 7.5], kc: 1.1,  drought: .4,  waterlog: .2, yield: 4,  seed: 220,  spacing: 80,  sow: [3, 4], seedUSD: 1.0, otherUSD: 450, labourH: 8, sellable: 0.95, irrigated: false, fao: 'Peas, dry' },
  { id: 'beans',    name: 'Dry beans',    form: 'legume', color: '#9a6b4a', tBase: 8,  tOpt: [18, 25], tMax: 32, tKill: 0,   gdd: 950, ph: [6.0, 7.0], kc: 1.1,  drought: .4,  waterlog: .2, yield: 2.5, seed: 100, spacing: 25,  sow: [5, 6], seedUSD: 2.0, otherUSD: 600, labourH: 12, sellable: 0.95, irrigated: false, fao: 'Beans, dry' },
  { id: 'soy',      name: 'Soybeans',     form: 'legume', color: '#b5a35a', tBase: 8,  tOpt: [20, 30], tMax: 36, tKill: -1,  gdd: 1150, ph: [6.0, 7.0], kc: 1.15, drought: .45, waterlog: .25, yield: 3, seed: 70,  spacing: 35,  sow: [5], seedUSD: 1.2, otherUSD: 550, labourH: 7, sellable: 0.95, irrigated: false, fao: 'Soya beans' },
  { id: 'rapeseed', name: 'Rapeseed',     form: 'legume', color: '#e8d34a', tBase: 0,  tOpt: [10, 22], tMax: 32, tKill: -15, gdd: 2000, ph: [6.0, 7.5], kc: 1.1,  drought: .45, waterlog: .3, yield: 3.5, seed: 4,  spacing: 50,  sow: [8, 9], seedUSD: 20, otherUSD: 700, labourH: 7, sellable: 0.95, irrigated: false, fao: 'Rape or colza seed' },
];

export const byId = Object.fromEntries(CROPS.map(c => [c.id, c]));
