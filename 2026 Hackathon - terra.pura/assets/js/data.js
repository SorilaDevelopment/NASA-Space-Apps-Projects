// terra.pura · NASA Space Apps Challenge 2026. Code generated with Super Intelligence (SI): Claude by Anthropic;
// designed, reviewed and tested by the terra.pura team.
// terra.pura — data layer. Every source is free, key-less and CORS-enabled, called from the browser.
//   NASA POWER (climate normals, root-zone soil wetness)  power.larc.nasa.gov
//   ISRIC SoilGrids 2.0 (pH, organic carbon, nitrogen, CEC) rest.isric.org
//   Open-Meteo (16-day forecast)                            api.open-meteo.com
//   OpenStreetMap: Nominatim (geocoding), Overpass (buildings, roads, utility operators)
//   postcodes.io (UK postcode area), Octopus Energy API (live UK regional unit rate)
//   FAOSTAT producer prices (bundled: assets/data/prices.json), open.er-api.com (FX)

const cache = new Map();
async function getJSON(url, { timeout = 25000, init } = {}) {
  const key = url + (init?.body || '');
  if (cache.has(key)) return cache.get(key);
  const p = (async () => {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), timeout);
    try {
      const r = await fetch(url, { ...init, signal: ctl.signal });
      if (!r.ok) throw new Error(`${r.status} ${url.split('?')[0]}`);
      return await r.json();
    } finally { clearTimeout(t); }
  })();
  cache.set(key, p);
  p.catch(() => cache.delete(key));
  return p;
}
const DAYS = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/* ---------------- location ---------------- */
export async function reverseGeocode(lat, lon) {
  const j = await getJSON(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&addressdetails=1&accept-language=en&lat=${lat}&lon=${lon}`);
  const a = j.address || {};
  return {
    countryCode: (a.country_code || '').toUpperCase(), country: a.country || '',
    region: a.state || a.region || '', county: a.county || a.state_district || '',
    place: a.city || a.town || a.village || a.municipality || a.county || '', display: j.display_name || '',
    stateCode: (a['ISO3166-2-lvl4'] || '').split('-')[1] || '',
    ukNation: a['ISO3166-2-lvl4'] ? { 'GB-ENG': 'England', 'GB-SCT': 'Scotland', 'GB-WLS': 'Wales', 'GB-NIR': 'Northern Ireland' }[a['ISO3166-2-lvl4']] : null,
  };
}
export async function ukPostcode(lat, lon) {
  const j = await getJSON(`https://api.postcodes.io/postcodes?lon=${lon}&lat=${lat}&limit=1&radius=2000`);
  const r = j.result?.[0];
  if (!r) return null;
  return { postcode: r.postcode, outcode: r.outcode, area: r.outcode.match(/^[A-Z]+/)[0], nation: r.country, region: r.region, district: r.admin_district };
}

/* ---------------- NASA POWER climate normals ---------------- */
export async function nasaClimate(lat, lon) {
  const url = `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=T2M,T2M_RANGE,T2M_MIN,T2M_MAX,PRECTOTCORR,ALLSKY_SFC_SW_DWN,GWETROOT,RH2M&community=AG&longitude=${lon.toFixed(4)}&latitude=${lat.toFixed(4)}&format=JSON`;
  const j = await getJSON(url, { timeout: 30000 });
  const P = j.properties.parameter, m = k => MON.map(x => P[k][x]);
  return {
    lat, source: 'NASA POWER climatology (MERRA-2 / CERES, ~0.5° grid)',
    // T2M_MIN/T2M_MAX in climatology are monthly *extremes*; the typical night low / day high
    // comes from the mean temperature ± half the average daily range (T2M_RANGE).
    t: m('T2M'), tmin: MON.map(x => +(P.T2M[x] - P.T2M_RANGE[x] / 2).toFixed(2)), tmax: MON.map(x => +(P.T2M[x] + P.T2M_RANGE[x] / 2).toFixed(2)),
    extremeMin: m('T2M_MIN'), extremeMax: m('T2M_MAX'),
    p: m('PRECTOTCORR').map((v, i) => Math.round(v * DAYS[i] * 10) / 10), // mm/day -> mm/month
    solar: m('ALLSKY_SFC_SW_DWN'), // MJ/m²/day (AG community units) rootWetness: m('GWETROOT'), humidity: m('RH2M'),
    annual: { t: P.T2M.ANN, p: Math.round(P.PRECTOTCORR.ANN * 365.25), solar: P.ALLSKY_SFC_SW_DWN.ANN, rootWetness: P.GWETROOT.ANN },
  };
}

/* ---------------- SoilGrids topsoil ---------------- */
export async function soil(lat, lon) {
  const url = `https://rest.isric.org/soilgrids/v2.0/properties/query?lon=${lon.toFixed(4)}&lat=${lat.toFixed(4)}&property=phh2o&property=soc&property=nitrogen&property=cec&property=clay&property=sand&depth=0-5cm&depth=5-15cm&depth=15-30cm&value=mean`;
  const j = await getJSON(url, { timeout: 30000 });
  const out = {};
  for (const layer of j.properties.layers) {
    const d = layer.unit_measure.d_factor || 1;
    const vals = layer.depths.map(x => x.values.mean).filter(v => v != null);
    out[layer.name] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length / d : null;
  }
  if (out.phh2o == null) throw new Error('No soil data here (water, urban or outside coverage)');
  // fertility score 0-100 from organic carbon (g/kg), nitrogen (g/kg) and CEC (cmol/kg)
  const sc = (v, lo, hi) => v == null ? 0.5 : Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
  const fert = Math.round((sc(out.soc, 5, 40) * 0.4 + sc(out.nitrogen, 0.5, 3) * 0.3 + sc(out.cec, 5, 30) * 0.3) * 100);
  return {
    ph: Math.round(out.phh2o * 10) / 10, soc: out.soc, nitrogen: out.nitrogen, cec: out.cec, clay: out.clay, sand: out.sand,
    fertility: fert, fertilityLabel: fert >= 66 ? 'high' : fert >= 40 ? 'moderate' : 'low',
    source: 'ISRIC SoilGrids 2.0, 0–30 cm mean',
  };
}

/* ---------------- Open-Meteo forecast ---------------- */
export async function forecast(lat, lon) {
  const j = await getJSON(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,et0_fao_evapotranspiration&forecast_days=16&timezone=auto`);
  const d = j.daily;
  return { dates: d.time, tmax: d.temperature_2m_max, tmin: d.temperature_2m_min, tmean: d.temperature_2m_mean, rain: d.precipitation_sum, et0: d.et0_fao_evapotranspiration, source: 'Open-Meteo forecast' };
}

/* ---------------- OpenStreetMap: what on the land can't be farmed ---------------- */
function inPoly([lat, lon], poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i], [yj, xj] = poly[j];
    if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function ringArea(ll) {
  const R = 6378137, rad = Math.PI / 180; let a = 0;
  for (let i = 0; i < ll.length; i++) { const [y1, x1] = ll[i], [y2, x2] = ll[(i + 1) % ll.length]; a += (x2 - x1) * rad * (2 + Math.sin(y1 * rad) + Math.sin(y2 * rad)); }
  return Math.abs(a * R * R / 2);
}
const hav = ([a, b], [c, d]) => { const r = Math.PI / 180, x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2; return 12742000 * Math.asin(Math.sqrt(x)); };
// Public Overpass servers are often overloaded, so ask several mirrors at once and take the first answer.
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
async function overpass(q, timeout = 15000) {
  const url = u => `${u}?data=${encodeURIComponent(q)}`;
  return Promise.any(OVERPASS.map(u => getJSON(url(u), { timeout }).then(j => { if (!j || !Array.isArray(j.elements)) throw new Error('bad'); return j; })));
}
export const withDeadline = (p, ms, fallback) => Promise.race([p, new Promise(r => setTimeout(() => r(fallback), ms))]);
export async function landUse(poly) {
  const total = ringArea(poly);
  if (total > 5e7) return { total, blocked: 0, growable: total, note: 'Area too large for a building survey; using the full area.' };
  const lats = poly.map(p => p[0]), lons = poly.map(p => p[1]);
  const bbox = [Math.min(...lats), Math.min(...lons), Math.max(...lats), Math.max(...lons)].join(',');
  const j = await overpass(`[out:json][timeout:20];(way["building"](${bbox});way["natural"="water"](${bbox});way["landuse"~"^(reservoir|basin|residential|industrial|commercial|railway)$"](${bbox});way["highway"](${bbox}););out geom;`, 22000);
  let buildings = 0, water = 0, roads = 0, built = 0, nB = 0;
  for (const el of j.elements) {
    const g = (el.geometry || []).map(p => [p.lat, p.lon]);
    if (!g.length) continue;
    const t = el.tags || {};
    if (t.highway) {
      const width = { motorway: 25, trunk: 18, primary: 12, secondary: 9, tertiary: 7, residential: 6, service: 4, track: 3, footway: 1.5, path: 1, cycleway: 2 }[t.highway] ?? 4;
      for (let i = 1; i < g.length; i++) if (inPoly(g[i], poly) && inPoly(g[i - 1], poly)) roads += hav(g[i - 1], g[i]) * width;
      continue;
    }
    const c = [g.reduce((a, p) => a + p[0], 0) / g.length, g.reduce((a, p) => a + p[1], 0) / g.length];
    if (!inPoly(c, poly)) continue;
    const a = Math.min(ringArea(g), total);
    if (t.building) { buildings += a; nB++; } else if (t.natural === 'water' || t.landuse === 'reservoir' || t.landuse === 'basin') water += a; else built += a;
  }
  const blocked = Math.min(total, buildings + water + roads + built * 0.5);
  return { total, blocked, growable: Math.max(0, total - blocked), buildings, water, roads, built, nBuildings: nB, source: 'OpenStreetMap via Overpass API' };
}

/* nearest utility operators mapped in OpenStreetMap */
export async function osmOperators(lat, lon) {
  const j = await overpass(`[out:json][timeout:12];(nwr(around:20000,${lat},${lon})["man_made"~"^(water_works|wastewater_plant)$"]["operator"];nwr(around:10000,${lat},${lon})["power"~"^(substation|plant)$"]["operator"];);out tags center 120;`, 12000);
  const groups = { water: new Map(), sewage: new Map(), energy: new Map() };
  for (const el of j.elements) {
    const t = el.tags, c = el.center || el, d = c.lat ? hav([lat, lon], [c.lat, c.lon]) : 1e9;
    const kind = t.power ? 'energy' : t.man_made === 'wastewater_plant' ? 'sewage' : 'water';
    for (const op of t.operator.split(';').map(s => s.trim()).filter(Boolean)) {
      const prev = groups[kind].get(op);
      if (!prev || d < prev.d) groups[kind].set(op, { name: op, d, n: (prev?.n || 0) + 1 });
      else prev.n++;
    }
  }
  const sorted = m => [...m.values()].sort((a, b) => a.d - b.d);
  return { water: sorted(groups.water), sewage: sorted(groups.sewage), energy: sorted(groups.energy) };
}

/* ---------------- money ---------------- */
export async function fxRates() {
  const j = await getJSON('https://open.er-api.com/v6/latest/USD');
  return { base: 'USD', rates: j.rates, updated: j.time_last_update_utc, source: 'ExchangeRate-API (open.er-api.com)' };
}
export async function cropPrices() { return getJSON('assets/data/prices.json'); }

import { electricityFor, waterFor, WATER, US_RETAIL_CHOICE } from './suppliers.js';
export const CURRENCY = {
  GB: 'GBP', IE: 'EUR', US: 'USD', CA: 'CAD', AU: 'AUD', NZ: 'NZD', IN: 'INR', CN: 'CNY', JP: 'JPY', KR: 'KRW', BR: 'BRL', AR: 'ARS', MX: 'MXN', CL: 'CLP', CO: 'COP', PE: 'PEN',
  ZA: 'ZAR', NG: 'NGN', KE: 'KES', EG: 'EGP', MA: 'MAD', GH: 'GHS', ET: 'ETB', TZ: 'TZS', UG: 'UGX', CH: 'CHF', NO: 'NOK', SE: 'SEK', DK: 'DKK', PL: 'PLN', CZ: 'CZK', HU: 'HUF',
  RO: 'RON', BG: 'BGN', UA: 'UAH', TR: 'TRY', RU: 'RUB', IL: 'ILS', SA: 'SAR', AE: 'AED', PK: 'PKR', BD: 'BDT', ID: 'IDR', TH: 'THB', VN: 'VND', PH: 'PHP', MY: 'MYR', SG: 'SGD',
  IS: 'ISK', RS: 'RSD', KZ: 'KZT', NP: 'NPR', LK: 'LKR', IR: 'IRR', IQ: 'IQD', DZ: 'DZD', TN: 'TND', ZM: 'ZMW', ZW: 'USD', MW: 'MWK', MZ: 'MZN', AO: 'AOA', SN: 'XOF', CI: 'XOF',
  CM: 'XAF', UY: 'UYU', PY: 'PYG', BO: 'BOB', EC: 'USD', VE: 'VES', GT: 'GTQ', CR: 'CRC', PA: 'USD', DO: 'DOP', CU: 'CUP', JM: 'JMD', HR: 'EUR',
};
['AT', 'BE', 'CY', 'DE', 'EE', 'ES', 'FI', 'FR', 'GR', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PT', 'SI', 'SK'].forEach(c => (CURRENCY[c] = 'EUR'));
export const currencyFor = cc => CURRENCY[cc] || 'USD';
export function money(v, cur, dp = 2) {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur, minimumFractionDigits: dp, maximumFractionDigits: dp }).format(v); }
  catch { return cur + ' ' + v.toFixed(dp); }
}
export function symbol(cur) {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur, currencyDisplay: 'narrowSymbol' }).formatToParts(0).find(p => p.type === 'currency').value; }
  catch { return cur + ' '; }
}

/* ---------------- utility reference prices (approximate, editable) ----------------
   Household electricity, USD/kWh, rough 2025 national averages (GlobalPetrolPrices / Eurostat / EIA).
   Grid carbon intensity kg CO2/kWh, rough 2024 values (Ember / IEA). */
export const ELECTRICITY_USD = { US: .17, CA: .13, MX: .08, BR: .16, AR: .07, CL: .2, CO: .19, PE: .18, DE: .4, FR: .28, IT: .38, ES: .28, PT: .25, NL: .33, BE: .38, IE: .42, AT: .33, CH: .33, PL: .25, CZ: .35, SE: .22, NO: .15, DK: .38, FI: .2, GR: .24, RO: .25, HU: .11, UA: .05, TR: .1, RU: .07, IN: .08, CN: .08, JP: .22, KR: .11, AU: .24, NZ: .22, ZA: .18, NG: .05, KE: .2, EG: .04, MA: .12, ID: .1, TH: .12, VN: .08, PH: .2, PK: .1, BD: .07, SA: .05, AE: .08, IL: .16, ET: .01, GH: .1, TZ: .1 };
export const GRID_CO2 = { GB: .15, US: .37, CA: .13, DE: .36, FR: .05, ES: .13, IT: .29, PL: .66, NL: .27, IE: .28, SE: .04, NO: .03, IN: .71, CN: .56, JP: .48, KR: .43, AU: .55, NZ: .1, BR: .1, MX: .4, ZA: .71, NG: .4, KE: .1, EG: .45 };
export const DIESEL_USD = { GB: .95, US: 1.0, CA: 1.25, DE: 1.75, FR: 1.8, ES: 1.6, IT: 1.85, NL: 1.9, IE: 1.75, PL: 1.6, IN: 1.05, CN: 1.0, AU: 1.3, NZ: 1.3, BR: 1.15, ZA: 1.25, NG: 1.05, KE: 1.3, JP: 1.2 };
// mains water and sewerage, USD/m³, very rough national defaults where no provider tariff is known
export const WATER_USD = { high: [1.8, 2.0], mid: [0.7, 0.6], low: [0.35, 0.2] };
const HIGH = 'US CA AU NZ JP KR SG IL AE SA CH NO SE DK FI IS IE GB DE FR NL BE LU AT IT ES PT GR CZ SI SK EE LT LV PL HU HR'.split(' ');
const LOW = 'IN PK BD NP ET NG KE TZ UG GH MW MZ ZM ZW SN CI CM AO EG MA DZ TN VN PH ID LK'.split(' ');
export const incomeBand = cc => HIGH.includes(cc) ? 'high' : LOW.includes(cc) ? 'low' : 'mid';

/* ---------------- UK water & sewerage by postcode area ----------------
   Statutory regional monopolies (Ofwat). Area-level, so boundaries are approximate; OSM operator
   tags are used to confirm. Prices = approximate 2025/26 metered volumetric charges, £/m³. */
const WASC = {
  anglian: ['Anglian Water', 2.3, 2.65], thames: ['Thames Water', 2.1, 1.35], severn: ['Severn Trent Water', 1.85, 1.75],
  united: ['United Utilities', 1.75, 1.9], yorkshire: ['Yorkshire Water', 1.9, 2.1], southern: ['Southern Water', 2.35, 2.95],
  southwest: ['South West Water', 2.75, 3.4], wessex: ['Wessex Water', 2.1, 2.6], northumbrian: ['Northumbrian Water', 1.75, 1.75],
  welsh: ['Dŵr Cymru Welsh Water', 2.35, 2.5], scottish: ['Scottish Water', 1.6, 1.9], ni: ['Northern Ireland Water', 1.2, 1.3],
};
const WOC = { cambridge: ['Cambridge Water', 1.4], portsmouth: ['Portsmouth Water', 1.15], bristol: ['Bristol Water', 1.95], essex: ['Essex & Suffolk Water', 2.1], staffs: ['South Staffs Water', 1.5], ses: ['SES Water', 1.3], southeast: ['South East Water', 2.3], affinity: ['Affinity Water', 1.75] };
const SEWER_AREA = {
  anglian: 'CB PE NR IP CO CM SS LN NN MK LU', thames: 'E EC N NW SE SW W WC EN HA UB TW KT SM CR BR DA RM IG WD HP SL RG OX GU SN AL SG RH',
  southern: 'BN PO SO CT ME TN', wessex: 'SP BH DT BA TA BS', southwest: 'EX PL TQ TR', severn: 'B CV WV WS DY ST DE NG LE WR GL TF',
  united: 'M L WA WN BL BB PR LA CA FY OL SK CH CW', yorkshire: 'LS BD HG HD HX WF YO HU DN S', northumbrian: 'NE DH SR TS DL',
  welsh: 'CF NP SA LD LL SY HR', scottish: 'AB DD DG EH FK G HS IV KA KW KY ML PA PH TD ZE', ni: 'BT',
};
const WATER_ONLY = { cambridge: 'CB', portsmouth: 'PO', bristol: 'BS', essex: 'CM SS RM', staffs: 'WS DY', ses: 'SM', southeast: 'TN', affinity: 'LU SG AL WD HP HA UB EN SL CO' };
const lookup = (table, area) => Object.keys(table).find(k => table[k].split(' ').includes(area));
export function ukWater(area) {
  const sk = lookup(SEWER_AREA, area) || 'thames', wk = lookup(WATER_ONLY, area);
  const sewer = WASC[sk];
  const water = wk ? WOC[wk] : sewer;
  return {
    water: { id: 'uk-' + (wk || sk), name: water[0], perM3: water[1] },
    sewage: { id: 'uk-' + sk, name: sewer[0], perM3: sewer[2] },
  };
}
export const knownSewerCompanies = Object.values(WASC).map(x => x[0]);

/* live UK electricity: Octopus "Flexible Octopus" standard unit rate for the postcode's region */
export async function octopusRate(postcode) {
  const g = await getJSON(`https://api.octopus.energy/v1/industry/grid-supply-points/?postcode=${encodeURIComponent(postcode.replace(/\s/g, ''))}`);
  const region = g.results?.[0]?.group_id?.replace('_', '');
  if (!region) throw new Error('No GSP region');
  const prods = await getJSON('https://api.octopus.energy/v1/products/?brand=OCTOPUS_ENERGY&is_variable=true&is_business=false');
  const code = prods.results.find(p => p.display_name === 'Flexible Octopus' && p.direction === 'IMPORT')?.code;
  const r = await getJSON(`https://api.octopus.energy/v1/products/${code}/electricity-tariffs/E-1R-${code}-${region}/standard-unit-rates/?page_size=6`);
  const rate = r.results.find(x => x.payment_method === 'DIRECT_DEBIT') || r.results[0];
  return { region, pPerKWh: rate.value_inc_vat, product: code, validFrom: rate.valid_from };
}

/* ---------- official regulated tariffs (EUR/kWh incl. taxes) ---------- */
// France: EDF Tarif Bleu (TRV), option Base ≤ 6 kVA, from 1 Aug 2026 — CRE délibération n° 2026-147.
// Spain: PVPC, live from Red Eléctrica (REE) open data; + 5.11% electricity tax and 21% VAT.
/* Romania: universal-service ("serviciu universal") household tariffs, published by each supplier and listed in
   ANRE's price comparator (POSF). Final price in lei/kWh incl. network tariffs, excise and VAT, no standing charge.
   Prices differ by distribution zone. Checked 14 Nov 2026 (offers valid to 31 Dec 2026). */
const RO_ZONES = [
  ['A', /bucure|bucharest|ilfov|giurgiu|timi|arad|cara|hunedoara|constan|tulcea|c[ăa]l[ăa]ra|ialomi/i, 'Rețele Electrice (Muntenia Sud, Banat, Dobrogea)'],
  ['O', /dolj|gorj|mehedin|olt|v[âa]lcea|arge|teleorman/i, 'Distribuție Energie Oltenia'],
  ['M', /ia[șs]i|suceava|boto[șs]ani|neam|bac[ăa]u|vaslui/i, 'Delgaz Grid (Moldova)'],
  ['N', /cluj|bihor|bistri|maramure|satu mare|s[ăa]laj|alba|bra[șs]ov|covasna|harghita|mure|sibiu|prahova|d[âa]mbovi|buz[ăa]u|br[ăa]ila|gala|vrancea/i, 'DEER (Transilvania, Muntenia Nord)'],
];
const RO_SU = { // [zone A, Oltenia, Moldova, DEER]
  hidro: { match: /hidroelectrica/i, lei: { A: 1.33, O: 1.35, M: 1.41, N: 1.37 }, offer: 'Serviciu Universal' },
  electrica: { match: /^electrica/i, lei: { A: 1.53, O: 1.55, M: 1.61, N: 1.57 }, offer: 'Serviciu Universal' },
  ppc: { match: /^ppc/i, lei: { A: 1.65, O: 1.67, M: 1.74, N: 1.70 }, offer: 'Serviciu Universal' },
};
export async function officialTariffs(cc, regionText = '', fx = null) {
  if (cc === 'RO') {
    const z = RO_ZONES.find(([, re]) => re.test(regionText));
    const leiPerEur = fx?.rates?.RON && fx?.rates?.EUR ? fx.rates.RON / fx.rates.EUR : 5.05;
    const zone = z ? z[0] : 'A';
    const out = Object.values(RO_SU).filter(t => t.lei[zone] != null).map(t => ({ match: t.match, eur: t.lei[zone] / leiPerEur, tag: `${t.offer} · ${z ? z[2].split(' (')[0] : 'zone estimate'}` }));
    out.push({ source: `Romanian prices: each supplier's published universal-service tariff for ${z ? 'the ' + z[2] + ' zone' : 'Muntenia Sud (your county wasn’t recognised)'}, from ANRE's price comparator (POSF), including grid fees and VAT, valid to 31 Dec 2026. Competitive offers can be cheaper (e.g. Hidroelectrica Viitor Hidro from 1.19 lei/kWh); compare at posf.ro. E.ON doesn’t list a universal-service price there and changes its offers every two weeks, so type the rate from your E.ON bill.` });
    return out;
  }
  if (cc === 'FR') return [{ match: /^EDF\b/i, eur: 0.2001, tag: 'Tarif Bleu · Base ≤ 6 kVA', source: 'EDF price: regulated Tarif Bleu (TRV), option Base up to 6 kVA, from 1 Aug 2026 (CRE decision 2026-147).' }];
  if (cc === 'ES') {
    const day = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    const j = await getJSON(`https://apidatos.ree.es/en/datos/mercados/precios-mercados-tiempo-real?start_date=${day}T00:00&end_date=${day}T23:59&time_trunc=hour`, { timeout: 15000 });
    const pv = j.included?.find(x => /pvpc/i.test(x.attributes?.title || ''))?.attributes?.values?.map(v => v.value) || [];
    if (!pv.length) return [];
    const eur = pv.reduce((a, b) => a + b, 0) / pv.length / 1000 * 1.0511 * 1.21;
    return [{ card: { id: 'es-pvpc', name: 'PVPC regulated tariff', tag: `live · Red Eléctrica · ${day}` }, eur,
      source: `PVPC: yesterday's average regulated price from Red Eléctrica, incl. electricity tax and VAT (excl. standing charge). Offered by each group's reference supplier: Energía XXI (Endesa), Curenergía (Iberdrola), Comercializadora Regulada (Naturgy), Régsiti (Repsol).` }];
  }
  return [];
}

/* ---------- US: electric service territories (DOE/PNNL, built from EIA-861) and EPA water systems ---------- */
const titleCase = n => n.toLowerCase().replace(/\b([a-z])/g, c => c.toUpperCase()).replace(/\b(Co|Inc|Llc|Rec|Emc|Pud|Ppd)\b/g, m => m.toUpperCase()).replace(/ - \(([a-z]{2})\)/i, (m, x) => ` (${x.toUpperCase()})`);
export async function usUtilities(lat, lon) {
  const q = `geometry=${lon}%2C${lat}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=id,name,type,state,customers,website&returnGeometry=false&f=json`;
  const j = await getJSON(`https://eedgis.pnnl.gov/arcgis/rest/services/Hosted/Electric_Service_Territories/FeatureServer/0/query?${q}`, { timeout: 15000 });
  const rank = { 'INVESTOR OWNED': 0, COOPERATIVE: 1, MUNICIPAL: 2, 'POLITICAL SUBDIVISION': 3, STATE: 4, FEDERAL: 5 };
  return (j.features || []).map(f => f.attributes).filter(a => a.name && a.name !== 'NOT AVAILABLE')
    .map(a => ({ id: a.id, name: a.name, type: a.type || 'utility', state: a.state, customers: a.customers > 0 ? a.customers : 0, website: a.website }))
    .sort((a, b) => (rank[a.type] ?? 9) - (rank[b.type] ?? 9) || b.customers - a.customers);
}
export async function usWaterSystems(lat, lon) {
  const q = `geometry=${lon}%2C${lat}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=PWSID,PWS_Name,Population_Served_Count,Service_Area_Type&returnGeometry=false&f=json`;
  const j = await getJSON(`https://services.arcgis.com/cJ9YHowT8TU7DUyn/arcgis/rest/services/Water_System_Boundaries/FeatureServer/0/query?${q}`, { timeout: 15000 });
  if (j.error) throw new Error(j.error.message);
  return (j.features || []).map(f => f.attributes).map(a => ({ id: a.PWSID, name: a.PWS_Name, pop: a.Population_Served_Count, type: a.Service_Area_Type }))
    .sort((a, b) => (b.pop || 0) - (a.pop || 0));
}

/* Provider options for onboarding, by region. Prices are in local currency per kWh / per L. */
export async function providerOptions(center, fx) {
  const [lat, lon] = center;
  const geo = await reverseGeocode(lat, lon).catch(() => ({ countryCode: '' }));
  const cc = geo.countryCode || 'US', cur = currencyFor(cc), rate = fx?.rates?.[cur] || 1;
  const none = { water: [], sewage: [], energy: [] };
  const opsP = cc === 'US' ? Promise.resolve(none) : osmOperators(lat, lon).catch(() => none);
  // UK only uses OSM to double-check the sewerage company, so don't wait long for it
  const ops = await withDeadline(opsP, cc === 'GB' ? 5000 : 8000, none);
  const out = { geo, cc, currency: cur, energy: [], water: [], sewage: [], notes: {} };

  if (cc === 'GB') {
    const pc = await ukPostcode(lat, lon).catch(() => null);
    out.postcode = pc;
    let live = null;
    if (pc) live = await octopusRate(pc.postcode).catch(() => null);
    const kwh = (live ? live.pPerKWh : 26.5) / 100;
    out.energy = [
      { id: 'octopus', name: 'Octopus Energy', price: kwh, logo: 'assets/img/octopus.png', tag: live ? 'live rate' : 'approx.' },
      { id: 'eon-next', name: 'E.ON Next', price: kwh, logo: 'assets/img/eon-next.png', tag: 'price-cap rate' },
      { id: 'edf', name: 'EDF Energy', price: kwh, logo: 'assets/img/edf.png', tag: 'price-cap rate' },
      { id: 'british-gas', name: 'British Gas', price: kwh, logo: 'assets/img/british-gas.png', tag: 'price-cap rate' },
      { id: 'ovo', name: 'OVO Energy', price: kwh, logo: 'assets/img/ovo.png', tag: 'price-cap rate' },
    ];
    out.notes.energy = live ? `Octopus: live Flexible Octopus unit rate for region ${live.region} (${pc.postcode}). Others: standard variable tariffs track the same Ofgem price cap.` : 'Approximate Ofgem price-cap unit rate.';
    const w = ukWater(pc?.area || '');
    // OpenStreetMap: if the nearest sewage works is run by a known sewerage company, trust it over the area table
    const osmSewer = ops.sewage.find(o => knownSewerCompanies.some(n => o.name.toLowerCase().includes(n.split(' ')[0].toLowerCase())));
    if (osmSewer && osmSewer.d < 15000) {
      const match = Object.values(WASC).find(x => osmSewer.name.toLowerCase().includes(x[0].split(' ')[0].toLowerCase()));
      if (match) w.sewage = { id: 'uk-osm', name: match[0], perM3: match[2] };
    }
    const logo = n => n === 'Anglian Water' ? 'assets/img/anglian-water.png' : null;
    out.water = [{ id: w.water.id, name: w.water.name, price: w.water.perM3 / 1000, logo: logo(w.water.name), tag: 'your area' }];
    out.sewage = [{ id: w.sewage.id, name: w.sewage.name, price: w.sewage.perM3 / 1000, logo: logo(w.sewage.name), tag: 'your area' }];
    out.notes.water = `Water in ${geo.ukNation || 'the UK'} is a regional monopoly, so only your area's company is shown (${pc ? 'postcode area ' + pc.area : 'location'}). Approx. 2025/26 metered tariff.`;
    out.notes.sewage = `Sewerage company for ${pc ? pc.outcode : 'your area'}${osmSewer ? ` — confirmed by OpenStreetMap (${osmSewer.name} runs a works ${(osmSewer.d / 1000).toFixed(1)} km away)` : ''}.`;
    return out;
  }

  const regionText = [geo.region, geo.county, geo.place, geo.display].filter(Boolean).join(' | ');
  const energy = await getJSON('assets/data/energy.json').catch(() => null);
  const slug = n => n.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const eurToLocal = (fx?.rates?.[cur] || 1) / (fx?.rates?.EUR || 0.9);
  const [wUSD, sUSD] = WATER_USD[incomeBand(cc)];

  /* ---------- United States: real service territories + EIA prices ---------- */
  if (cc === 'US') {
    const st = geo.stateCode;
    const [utils, systems] = await Promise.all([usUtilities(lat, lon).catch(() => []), usWaterSystems(lat, lon).catch(() => null)]);
    const statePrice = energy?.us?.states?.[st];
    out.energy = utils.map(u => {
      const pr = energy?.us?.utilities?.[`${u.id}|${u.state}`];
      const kwh = pr?.[1] ?? pr?.[2] ?? statePrice?.[0] ?? ELECTRICITY_USD.US; // pr = [name, residential, commercial]
      return { id: 'us-' + u.id, name: titleCase(u.name), website: u.website && u.website !== 'NOT AVAILABLE' ? u.website : null, price: kwh, tag: `${u.type.toLowerCase()} · ${pr?.[1] ? 'EIA 2025 avg.' : st + ' avg.'}` };
    });
    if (!out.energy.length) out.energy = [{ id: 'us-state', name: `${geo.region || 'State'} average utility`, price: statePrice?.[0] ?? ELECTRICITY_USD.US, tag: 'EIA state avg.' }];
    out.notes.energy = `Utilities whose service territory covers your land (U.S. DOE/PNNL map built from EIA-861), priced at each utility's 2025 average residential rate from EIA Form 861.${US_RETAIL_CHOICE.includes(st) ? ` ${geo.region} has retail choice, so you can also buy power from a competitive supplier — add its rate under "Other".` : ''}`;
    if (systems?.length) {
      out.water = systems.slice(0, 3).map(w => ({ id: 'us-w-' + w.id, name: titleCase(w.name), price: wUSD / 1000, tag: `${w.pop ? w.pop.toLocaleString() + ' people' : 'public system'} · EPA` }));
      out.sewage = systems.slice(0, 1).map(w => ({ id: 'us-s-' + w.id, name: titleCase(w.name) + ' (sewer)', price: sUSD / 1000, tag: 'if connected' }));
      out.notes.water = 'Public water system serving this spot (U.S. EPA service-area boundaries, 2026). Price is the US average; check your bill and use "Other" for your exact rate.';
      out.notes.sewage = 'Sewer service usually comes from the same city or district as your water. Most rural farms use a septic system — if so, choose "I have my own sewage system".';
    } else {
      out.notes.water = systems ? 'No public water system covers this spot (U.S. EPA service areas) — most farms here use a private well. Enter how much you pump under "I source my own water".' : 'Couldn’t reach the EPA water-system map — enter your water supplier under "Other".';
      out.notes.sewage = 'No public sewer is likely here — most rural farms use a septic system. Choose "I have my own sewage system" or enter a rate under "Other".';
    }
    return out;
  }

  /* ---------- everywhere else: supplier directory + Eurostat / national prices ---------- */
  // Reference price (country average) — shown for context only, never as a supplier's price,
  // because real tariffs differ a lot between suppliers and contracts.
  const eu = energy?.eu?.countries?.[cc];
  const ref = eu?.[0] ? { price: eu[0] * eurToLocal, label: `Eurostat ${energy.eu.period} household average` }
    : ELECTRICITY_USD[cc] ? { price: ELECTRICITY_USD[cc] * rate, label: 'approximate national household average (2025)' } : null;
  out.reference = ref;
  const dir = electricityFor(cc, regionText);
  const elecNames = dir?.names?.length ? dir.names : ops.energy.slice(0, 4).map(o => o.name);
  const names = elecNames.length ? elecNames : ['National grid supplier'];
  const monopoly = names.length === 1;
  const official = await officialTariffs(cc, regionText, fx).catch(() => []);
  out.energy = names.map(n => {
    const o = official.find(t => t.match?.test(n));
    if (o) return { id: 'e-' + slug(n), name: n, price: o.eur * eurToLocal, tag: o.tag };
    if (monopoly && ref) return { id: 'e-' + slug(n), name: n, price: ref.price, tag: 'approx. — check your bill' };
    return { id: 'e-' + slug(n), name: n, price: null, tag: 'enter your contract rate' };
  });
  official.filter(t => t.card).forEach(t => out.energy.unshift({ ...t.card, price: t.eur * eurToLocal }));
  out.notes.energy = [
    dir ? (dir.regional ? `Supplier(s) for ${geo.region || 'your region'}.` : `Major suppliers in ${geo.country || 'your country'} (not exhaustive — use "Other" for yours).`) : 'Operators of power infrastructure near you (OpenStreetMap).',
    dir?.note || '',
    !monopoly ? 'Tariffs differ a lot between suppliers, so type the unit rate from your bill or contract on your supplier’s card.' : '',
    official.length ? official.map(t => t.source).filter(Boolean).join(' ') : '',
    ref ? `For reference only: the ${ref.label} is ${money(ref.price, cur, 3)}/kWh.` : '',
  ].filter(Boolean).join(' ');
  const pick = (kind, osmList, usd, label, waterNames = []) => {
    const d = waterFor(cc, regionText, kind);
    let names = d?.names?.length ? d.names : osmList.slice(0, 3).map(o => o.name);
    // sewerage with nothing better: in most places the water company also runs the sewers
    const sameAsWater = !names.length && kind === 'sewage' && waterNames.length && WATER[cc]?.integrated !== false;
    if (sameAsWater) names = waterNames;
    const list = names.length ? names : [label];
    const tag = d?.both || sameAsWater ? 'also your water company' : d?.single ? 'your area' : d?.names?.length ? 'main operator' : names.length ? 'near you · OSM' : 'estimate';
    return {
      list: list.map(n => ({ id: kind[0] + '-' + slug(n), name: n, price: usd * rate / 1000, tag })),
      names,
      note: [d?.both || sameAsWater ? 'The same company runs your water and sewerage.' : d?.single ? 'The water body for your area.' : names.length ? 'Nearest operators mapped in OpenStreetMap.' : '', d?.note || '', 'Price is a rough national default. Enter yours under "Other" if you know it.'].filter(Boolean).join(' '),
    };
  };
  const w = pick('water', ops.water, wUSD, 'Local water utility'), sw = pick('sewage', ops.sewage, sUSD, 'Local sewerage utility', w.names);
  out.water = w.list; out.sewage = sw.list; out.notes.water = w.note; out.notes.sewage = sw.note;
  return out;
}

/* ---------------- NASA EONET: natural hazards near the land ---------------- */
const hav2 = ([a, b], [c, d]) => { const r = Math.PI / 180, x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); };
export async function hazards(lat, lon, radiusKm = 300) {
  const dLat = radiusKm / 111, dLon = radiusKm / (111 * Math.max(0.2, Math.cos(lat * Math.PI / 180)));
  const bbox = [lon - dLon, lat + dLat, lon + dLon, lat - dLat].map(v => v.toFixed(3)).join(',');
  const j = await getJSON(`https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=60&bbox=${bbox}`, { timeout: 20000 });
  return (j.events || []).map(e => {
    const pts = (e.geometry || []).flatMap(g => g.type === 'Point' ? [g.coordinates] : (g.coordinates?.[0] || []));
    const last = e.geometry?.[e.geometry.length - 1];
    const dist = pts.length ? Math.min(...pts.map(([x, y]) => hav2([lat, lon], [y, x]))) : null;
    return { id: e.id, title: e.title, category: e.categories?.[0]?.title || 'Event', catId: e.categories?.[0]?.id, date: last?.date, dist, link: e.sources?.[0]?.url || e.link, magnitude: last?.magnitudeValue != null ? `${last.magnitudeValue} ${last.magnitudeUnit || ''}`.trim() : null };
  }).filter(e => e.dist == null || e.dist <= radiusKm).sort((a, b) => (a.dist ?? 1e9) - (b.dist ?? 1e9));
}

/* ---------------- NASA POWER daily soil wetness (MERRA-2 / GEOS), last 90 days ---------------- */
export async function soilMoisture(lat, lon) {
  const ymd = d => d.toISOString().slice(0, 10).replace(/-/g, '');
  const end = new Date(), start = new Date(Date.now() - 95 * 864e5);
  const j = await getJSON(`https://power.larc.nasa.gov/api/temporal/daily/point?parameters=GWETTOP,GWETROOT,PRECTOTCORR&community=AG&longitude=${lon.toFixed(4)}&latitude=${lat.toFixed(4)}&start=${ymd(start)}&end=${ymd(end)}&format=JSON`, { timeout: 30000 });
  const P = j.properties.parameter, days = Object.keys(P.GWETROOT).filter(d => P.GWETROOT[d] !== -999);
  return {
    days: days.map(d => `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`),
    root: days.map(d => P.GWETROOT[d]), top: days.map(d => P.GWETTOP[d]), rain: days.map(d => Math.max(0, P.PRECTOTCORR[d])),
    source: 'NASA POWER daily (GWETROOT / GWETTOP, MERRA-2)',
  };
}

/* ---------------- supermarket chains near the land (OpenStreetMap) ---------------- */
const chainName = b => b.replace(/^the\s+/i, '').replace(/\bco-?operative\b(\s+food)?|\bco-op food\b/i, 'Co-op')
  .replace(/\s+(extra|express|metro|superstore|foodhall|food|local|city|market|xl|hyper|super)$/i, '').replace(/^m&s.*$/i, 'M&S').trim();
// Supermarket chains near the land. Nominatim (fast, reliable) first; Overpass as a fallback.
export async function nearbySupermarkets(lat, lon, radiusM = 30000) {
  const dLat = radiusM / 111000, dLon = radiusM / (111000 * Math.max(0.2, Math.cos(lat * Math.PI / 180)));
  let pts = [];
  try {
    const j = await getJSON(`https://nominatim.openstreetmap.org/search?q=supermarket&format=jsonv2&limit=50&extratags=1&bounded=1&viewbox=${lon - dLon},${lat + dLat},${lon + dLon},${lat - dLat}`, { timeout: 12000 });
    pts = j.map(x => ({ brand: x.extratags?.brand || x.name, tagged: !!(x.extratags?.brand || x.extratags?.['brand:wikidata']), lat: +x.lat, lon: +x.lon, wikidata: x.extratags?.['brand:wikidata'] })).filter(x => x.brand);
  } catch {}
  if (!pts.length) {
    const j = await overpass(`[out:json][timeout:12];nwr(around:${radiusM},${lat},${lon})["shop"="supermarket"]["brand"];out tags center 400;`, 12000);
    pts = j.elements.map(el => ({ brand: el.tags.brand.split(';')[0].trim(), tagged: true, lat: (el.center || el).lat, lon: (el.center || el).lon, wikidata: el.tags['brand:wikidata'] }));
  }
  const by = new Map();
  for (const x of pts) {
    const brand = chainName(x.brand), d = x.lat ? hav2([lat, lon], [x.lat, x.lon]) : Infinity;
    const e = by.get(brand) || { brand, stores: 0, nearestKm: Infinity, wikidata: x.wikidata, tagged: false };
    e.stores++; e.tagged ||= x.tagged; e.nearestKm = Math.min(e.nearestKm, d); by.set(brand, e);
  }
  // a chain = brand-tagged in OSM, or the same name at 2+ stores (single independents are left out)
  return [...by.values()].filter(e => e.tagged || e.stores >= 2).sort((a, b) => b.stores - a.stores);
}
