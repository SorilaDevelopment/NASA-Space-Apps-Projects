// terra.pura · NASA Space Apps Challenge 2026. Code generated with Super Intelligence (SI): Claude by Anthropic;
// designed, reviewed and tested by the terra.pura team.
//
// Solar planner: NASA POWER irradiance -> generation; your tariff -> savings; panel cost per watt -> spend;
// land taken out of farming -> crop sales lost. Cumulative 25-year cash flow with a payback year.
import { initUI, icons, store, countTo } from './ui.js';
import { cropPrices, money, symbol } from './data.js';
import { inputs, bestNow, rotation } from './model.js';
import { monthlyChart, chartCSS } from './charts.js';

initUI();
document.querySelectorAll('[data-icon]').forEach(el => (el.outerHTML = icons[el.dataset.icon]));
const st = document.createElement('style'); st.textContent = chartCSS; document.head.append(st);
const $ = id => document.getElementById(id);
const s = store.get();
const prices = await cropPrices().catch(() => null);
const I = inputs(s, prices);
const fmt = (v, dp = 0) => money(v, I.cur, dp);
const DAYS = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const YEARS = 25;

// ---- farm context from the main model ----
const plan = rotation(I);
const best = bestNow(I)[0];
const yearRev = plan.length ? plan.reduce((a, e) => a + e.revenue, 0) : best.revenue * 365 / best.days;
const yearProfit = plan.length ? plan.reduce((a, e) => a + e.profit, 0) : best.profit * 365 / best.days;
const revPerM2 = yearRev / Math.max(1, I.area), profitPerM2 = Math.max(0, yearProfit) / Math.max(1, I.area);
const farmKwh = plan.length ? plan.reduce((a, e) => a + e.kwh, 0) : best.kwh * 365 / best.days;
// NASA POWER's AG community reports irradiance in MJ/m²/day; 1 kWh = 3.6 MJ -> kWh/m²/day = peak sun hours
const sun = s.climate?.solar ? s.climate.solar.map(v => v / 3.6) : [0.7, 1.4, 2.5, 3.7, 4.7, 5.1, 5.0, 4.2, 3.1, 1.8, 0.9, 0.6];
const usdToLocal = I.fx;

const MOUNTS = {
  roof: { label: 'Roof / barn', usdW: 1.25, landPerM2: 0, yieldLoss: 0, note: 'No farmland used.' },
  ground: { label: 'Ground-mounted', usdW: 0.95, landPerM2: 2.5, yieldLoss: 1, note: 'Rows need spacing: about 2.5 m² of land per m² of panel, taken out of farming.' },
  agri: { label: 'Agrivoltaic (raised over crops)', usdW: 1.5, landPerM2: 2.5, yieldLoss: 0.15, note: 'Panels on tall frames above the crop: you keep farming, losing about 15% of yield under the array.' },
};
const cfg = {
  mount: 'ground', watts: 450, panels: 20, efficiency: 0.215,
  costW: null, price: I.energy || 0.25 * usdToLocal, exportShare: 0.35, escalate: 3, demand: Math.round(farmKwh),
};
cfg.costW = +(MOUNTS[cfg.mount].usdW * usdToLocal).toFixed(2);
cfg.exportPrice = +(cfg.price * cfg.exportShare).toFixed(4);

/* ---------------- controls ---------------- */
const cur = symbol(I.cur);
document.querySelectorAll('[data-cur]').forEach(e => (e.textContent = cur));
$('mounts').innerHTML = Object.entries(MOUNTS).map(([k, m]) => `<button data-k="${k}" aria-pressed="${k === cfg.mount}">${m.label}</button>`).join('');
$('mounts').onclick = e => {
  const b = e.target.closest('button'); if (!b) return;
  cfg.mount = b.dataset.k;
  $('mounts').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
  cfg.costW = +(MOUNTS[cfg.mount].usdW * usdToLocal).toFixed(2); $('costW').value = cfg.costW;
  run();
};
function bind(id, key, fmtOut, num = Number) {
  const el = $(id), out = $(id + 'V');
  const paint = () => { if (el.type === 'range') el.style.setProperty('--p', ((el.value - el.min) / (el.max - el.min) * 100) + '%'); if (out) out.textContent = fmtOut(num(el.value)); };
  el.value = cfg[key]; paint();
  el.oninput = () => { cfg[key] = num(el.value); paint(); run(); };
}
bind('watts', 'watts', v => v + ' W per panel');
bind('panels', 'panels', v => v + (v === 1 ? ' panel' : ' panels'));
bind('costW', 'costW', v => `${cur}${v.toFixed(2)} per watt`);
bind('price', 'price', v => `${cur}${v.toFixed(3)}/kWh`);
bind('exportPrice', 'exportPrice', v => `${cur}${v.toFixed(3)}/kWh`);
bind('escalate', 'escalate', v => `${v}% a year`);
bind('demand', 'demand', v => `${Math.round(v).toLocaleString()} kWh/yr`);
$('fit').onclick = () => { // size the array to cover the farm's yearly electricity use
  const perPanel = genYear1(cfg.watts, 1);
  cfg.panels = Math.max(1, Math.min(2000, Math.ceil(cfg.demand / perPanel)));
  $('panels').max = Math.max(Number($('panels').max), cfg.panels); $('panels').value = cfg.panels; $('panels').oninput();
};
$('ctx').innerHTML = `Your farm: <b>${Math.round(I.area).toLocaleString()} m²</b> earning about <b>${fmt(revPerM2, 2)}/m²</b> a year in crop sales (${fmt(profitPerM2, 2)}/m² profit), using about <b>${Math.round(farmKwh).toLocaleString()} kWh</b> of electricity a year. Electricity: <b>${s.energy?.name || 'your tariff'}</b>. Sunlight: <b>${s.climate ? 'NASA POWER' : 'sample data'}</b>, ${(sun.reduce((a, b, i) => a + b * DAYS[i], 0)).toFixed(0)} kWh/m² a year.`;

/* ---------------- model ---------------- */
const PR = 0.8, TILT = 1.1, DEGRADE = 0.005, OM = 0.01, INVERTER_YEAR = 12, INVERTER_SHARE = 0.1;
function monthlyGen(watts, panels) { const kWp = watts * panels / 1000; return sun.map((h, m) => kWp * h * TILT * PR * DAYS[m]); }
function genYear1(watts, panels) { return monthlyGen(watts, panels).reduce((a, b) => a + b, 0); }
function simulate() {
  const m = MOUNTS[cfg.mount];
  const kWp = cfg.watts * cfg.panels / 1000;
  const panelArea = cfg.watts / (cfg.efficiency * 1000) * cfg.panels;
  const land = Math.min(I.area, panelArea * m.landPerM2);
  const capex = cfg.watts * cfg.panels * cfg.costW;
  const monthly = monthlyGen(cfg.watts, cfg.panels), year1 = monthly.reduce((a, b) => a + b, 0);
  // self-consumption: month by month, you use what you need, the rest is exported
  const demandM = DAYS.map(d => cfg.demand * d / 365);
  const selfShare = year1 ? monthly.reduce((a, g, i) => a + Math.min(g, demandM[i]), 0) / year1 : 0;
  const lostSales = land * revPerM2 * m.yieldLoss, lostProfit = land * profitPerM2 * m.yieldLoss;
  const rows = []; let cumSave = 0, cumCost = capex, cumLost = 0, payback = null;
  for (let y = 1; y <= YEARS; y++) {
    const gen = year1 * Math.pow(1 - DEGRADE, y - 1), esc = Math.pow(1 + cfg.escalate / 100, y - 1);
    const save = gen * selfShare * cfg.price * esc + gen * (1 - selfShare) * cfg.exportPrice * esc;
    const cost = capex * OM + (y === INVERTER_YEAR ? capex * INVERTER_SHARE : 0);
    cumSave += save; cumCost += cost; cumLost += lostProfit;
    const net = cumSave - cumCost - cumLost;
    if (payback === null && net >= 0) payback = y;
    rows.push({ y, gen, save, cumSave, cumCost, cumLost, net });
  }
  return { kWp, panelArea, land, capex, monthly, year1, selfShare, lostSales, lostProfit, rows, payback, mount: m };
}

/* ---------------- render ---------------- */
let genKey = '';
function run() {
  const r = simulate(), last = r.rows[YEARS - 1];
  countTo($('kKwp'), r.kWp, { decimals: 1, suffix: ' kWp' });
  countTo($('kGen'), r.year1, { suffix: ' kWh' });
  countTo($('kCost'), r.capex, { format: v => fmt(v) });
  countTo($('kLand'), r.land, { suffix: ' m²' });
  countTo($('kLost'), r.lostSales, { format: v => fmt(v) + '/yr' });
  countTo($('kNet'), last.net, { format: v => fmt(v) });
  $('kNet').style.color = last.net >= 0 ? 'var(--gain)' : 'var(--cost)';
  $('kPay').textContent = r.payback ? `Pays for itself in year ${r.payback}` : `Doesn’t pay back within ${YEARS} years`;
  $('kPay').className = 'pay ' + (r.payback ? 'ok' : 'no');
  $('mountNote').textContent = r.mount.note;
  $('detail').innerHTML = `
    <p class="row">Panel area <b>${r.panelArea.toFixed(0)} m² (${cfg.panels} × ${(cfg.watts / (cfg.efficiency * 1000)).toFixed(2)} m²)</b></p>
    <p class="row">Used on the farm / exported <b>${Math.round(r.selfShare * 100)}% / ${Math.round((1 - r.selfShare) * 100)}%</b></p>
    <p class="row">Year-1 savings <b>${fmt(r.rows[0].save)}</b></p>
    <p class="row">Crop sales lost <b>${fmt(r.lostSales)}/yr (${fmt(r.lostProfit)} profit)</b></p>
    <p class="row">Upkeep + inverter (25 yrs) <b>${fmt(last.cumCost - r.capex)}</b></p>
    <p class="row">Saved over 25 years <b style="color:var(--gain)">${fmt(last.cumSave)}</b></p>
    <p class="row">Spent over 25 years <b style="color:var(--cost)">${fmt(last.cumCost)}</b></p>
    <p class="row">Crop profit lost over 25 years <b style="color:var(--sky)">${fmt(last.cumLost)}</b></p>`;
  drawCash(r);
  const key = cfg.watts + 'x' + cfg.panels; // the bar chart only depends on system size
  if (key !== genKey) { genKey = key; monthlyChart($('genChart'), { type: 'bars', values: r.monthly.map(v => Math.round(v)), unit: ' kWh', color: '#e0b456' }); }
}

function drawCash(r) {
  const svg = $('cash'), W = svg.clientWidth || 800, H = 300, pl = 70, pr = 10, pt = 10, pb = 26;
  const series = [
    { k: 'cumSave', c: '#cfe0c9', l: 'Electricity saved' },
    { k: 'cumCost', c: '#e07856', l: 'Spent on panels & upkeep' },
    { k: 'cumLost', c: '#7eb3ff', l: 'Crop profit lost' },
    { k: 'net', c: '#ffffff', l: 'Net position', w: 2.5 },
  ];
  const all = r.rows.flatMap(x => series.map(s => x[s.k])).concat([0]);
  let lo = Math.min(...all), hi = Math.max(...all); if (hi - lo < 1) hi = lo + 1;
  const pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
  const X = y => pl + (y / YEARS) * (W - pl - pr), Y = v => pt + (1 - (v - lo) / (hi - lo)) * (H - pt - pb);
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const step = (() => { const raw = (hi - lo) / 4, mag = 10 ** Math.floor(Math.log10(raw)); return [1, 2, 5, 10].map(x => x * mag).find(x => x >= raw); })();
  let g = '';
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) g += `<line x1="${pl}" x2="${W - pr}" y1="${Y(v)}" y2="${Y(v)}" stroke="rgba(255,255,255,${Math.abs(v) < step / 2 ? .35 : .08})"/><text x="${pl - 8}" y="${Y(v) + 3}" text-anchor="end">${fmt(v)}</text>`;
  for (let y = 0; y <= YEARS; y += 5) g += `<text x="${X(y)}" y="${H - 6}" text-anchor="middle">${y === 0 ? 'today' : 'year ' + y}</text>`;
  for (const s of series) {
    const pts = [[0, s.k === 'cumCost' ? r.capex : 0], ...r.rows.map(x => [x.y, x[s.k]])];
    if (s.k === 'net') pts[0][1] = -r.capex;
    g += `<polyline class="ln" pathLength="1" points="${pts.map(([y, v]) => `${X(y)},${Y(v)}`).join(' ')}" fill="none" stroke="${s.c}" stroke-width="${s.w || 1.6}" stroke-linejoin="round"/>`;
  }
  if (r.payback) g += `<line x1="${X(r.payback)}" x2="${X(r.payback)}" y1="${pt}" y2="${H - pb}" stroke="#cfe0c9" stroke-dasharray="3 4"/><circle cx="${X(r.payback)}" cy="${Y(r.rows[r.payback - 1].net)}" r="5" fill="#cfe0c9"/><text x="${X(r.payback) + 8}" y="${pt + 12}" style="fill:#cfe0c9">pays back</text>`;
  svg.innerHTML = g;
  $('legend').innerHTML = series.map(s => `<span><i style="background:${s.c}"></i>${s.l}</span>`).join('');
}
let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => drawCash(simulate()), 150); });
run();
