// terra.pura · NASA Space Apps Challenge 2026. Code generated with Super Intelligence (SI): Claude by Anthropic;
// designed, reviewed and tested by the terra.pura team.
import { initUI, icons, store } from './ui.js';
import { cropPrices, money, nearbySupermarkets, withDeadline } from './data.js';
import { CROPS, byId } from './crops.js';
import { inputs, evaluate, bestNow } from './model.js';
import { sellLikelihood, contractLikelihood, balanceFor, PROCESSES, processing, fmtKt } from './market.js';
import { processingLines } from './costs-report.js';
import { openLabourEditor } from './labour-editor.js';

initUI();
document.querySelectorAll('[data-icon]').forEach(el => (el.outerHTML = icons[el.dataset.icon]));
const $ = id => document.getElementById(id);
let s = store.get();
const [prices, market] = await Promise.all([cropPrices().catch(() => null), fetch('assets/data/market.json').then(r => r.json()).catch(() => null)]);
let I = inputs(s, prices);
const fmt = (v, dp = 0) => money(v, I.cur, dp);
const MONTH_START = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
const evals = new Map();
const evalFor = crop => { if (!evals.has(crop.id)) evals.set(crop.id, evaluate(crop, I, MONTH_START[(crop.sow[0] || 3) - 1])); return evals.get(crop.id); };
const country = s.region?.geo?.country || 'your country';
$('lede').textContent = `How much of each crop ${country} grows, imports and uses — and what that means for selling yours. Your harvest estimates come from your dashboard (${Math.round(I.area).toLocaleString()} m², each crop sown in its usual month).`;

const qs = new URLSearchParams(location.search);
let crop = byId[qs.get('crop')] || bestNow(I)[0].crop;
const ui = { ...(s.marketUI || {}) };

/* ---------------- crop chips ---------------- */
$('chips').innerHTML = CROPS.map(c => `<button data-id="${c.id}" style="--c:${c.color}" aria-pressed="${c.id === crop.id}"><i></i>${c.name}</button>`).join('');
$('chips').onclick = e => {
  const b = e.target.closest('button'); if (!b) return;
  crop = byId[b.dataset.id];
  $('chips').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
  history.replaceState(null, '', '?crop=' + crop.id);
  renderAll();
};

/* ---------------- helpers ---------------- */
function gauge(svg, p, color) {
  const r = 38, c = 2 * Math.PI * r;
  svg.innerHTML = `<circle cx="46" cy="46" r="${r}" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="8"/>
    <circle cx="46" cy="46" r="${r}" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round" transform="rotate(-90 46 46)"
      stroke-dasharray="${c}" stroke-dashoffset="${c}" style="transition:stroke-dashoffset 1.1s cubic-bezier(.22,.8,.24,1)"/>`;
  requestAnimationFrame(() => requestAnimationFrame(() => (svg.lastElementChild.style.strokeDashoffset = c * (1 - p))));
}
const colorFor = p => p >= 0.6 ? '#cfe0c9' : p >= 0.35 ? '#e0b456' : '#e07856';
const whyList = (el, reasons) => (el.innerHTML = reasons.map(([k, t]) => `<li class="${k === '+' ? 'p' : k === '−' ? 'm' : 'n'}"><b>${k}</b><span>${t}</span></li>`).join(''));

/* ---------------- demand & supply ---------------- */
function renderDS() {
  const e = evalFor(crop), b = balanceFor(crop, I.cc, market);
  $('dsTitle').textContent = `${crop.name}: demand & supply in ${country}`;
  if (!b) { $('dsSub').textContent = 'FAOSTAT has no food balance for this crop in your country.'; $('flow').innerHTML = ''; $('facts').innerHTML = ''; return; }
  $('dsSub').textContent = `FAOSTAT Food Balance Sheet, ${b.year}${b.aggregate ? ' — shown for "other vegetables" combined (FAOSTAT doesn’t split them)' : ''}.`;
  const prod = b.prod || 0, imp = b.imp || 0, exp = b.exp || 0;
  const uses = [['Food', b.food || 0, '#e0b456'], ['Animal feed', b.feed || 0, '#c9a24f'], ['Processing', b.proc || 0, '#e07856'], ['Losses', b.loss || 0, '#6f6d68'], ['Exports', exp, '#9cc4ff']];
  const other = Math.max(0, (b.supply || 0) - (b.food || 0) - (b.feed || 0) - (b.proc || 0) - (b.loss || 0));
  if (other > 0.5) uses.splice(4, 0, ['Seed, stocks & other', other, '#9b9892']);
  const totalIn = prod + imp, totalOut = uses.reduce((a, u) => a + u[1], 0), max = Math.max(totalIn, totalOut, 1);
  const seg = (v, col, label, i) => v > 0 ? `<span style="width:${v / max * 100}%;background:${col};animation-delay:${i * 80}ms" title="${label}: ${fmtKt(v)}">${v / max > 0.12 ? label : ''}</span>` : '';
  $('flow').innerHTML = `
    <div><div class="lab"><span>Where it comes from</span><span>${fmtKt(totalIn)}</span></div>
      <div class="bar">${seg(prod, '#cfe0c9', 'Grown here', 0)}${seg(imp, '#7eb3ff', 'Imported', 1)}</div>
      <div class="legend"><span><i style="background:#cfe0c9"></i>Grown here ${fmtKt(prod)}</span><span><i style="background:#7eb3ff"></i>Imported ${fmtKt(imp)}</span></div></div>
    <div><div class="lab"><span>Where it goes</span><span>${fmtKt(totalOut)}</span></div>
      <div class="bar">${uses.map((u, i) => seg(u[1], u[2], u[0], i + 2)).join('')}</div>
      <div class="legend">${uses.filter(u => u[1] > 0).map(u => `<span><i style="background:${u[2]}"></i>${u[0]} ${fmtKt(u[1])}</span>`).join('')}</div></div>`;
  const share = prod > 0 ? (e.tonnes / 1000) / prod : null;
  $('facts').innerHTML = `
    <div><b>${b.perCapita != null ? b.perCapita.toFixed(1) + ' kg' : '—'}</b>eaten per person a year</div>
    <div><b>${prod && b.supply ? Math.round(prod / b.supply * 100) + '%' : '—'}</b>self-sufficiency</div>
    <div><b>${e.tonnes.toFixed(1)} t</b>your harvest${share != null ? ` · ${share < 0.0001 ? '<0.01' : (share * 100).toFixed(2)}% of national` : ''}</div>`;
}

/* ---------------- sell likelihood ---------------- */
function renderSell() {
  const e = evalFor(crop), r = sellLikelihood(crop, I.cc, e.tonnes, market, I.storage);
  $('sellSub').textContent = `${e.tonnes.toFixed(1)} t of ${crop.name.toLowerCase()} a year at about ${fmt(e.priceKg, 3)}/kg (${e.priceScope === 'local' ? 'FAOSTAT farm-gate ' + e.priceYear : 'world median'}).`;
  $('sellPct').textContent = Math.round(r.p * 100) + '%';
  gauge($('sellG'), r.p, colorFor(r.p));
  whyList($('sellWhy'), r.reasons);
}

/* ---------------- supermarket contract ---------------- */
let chains = null;
async function loadChains() {
  const key = 'tp.chains.' + s.center.map(v => v.toFixed(3)).join(',');
  try { const c = sessionStorage.getItem(key); if (c) return JSON.parse(c); } catch {}
  const list = await withDeadline(nearbySupermarkets(s.center[0], s.center[1]).catch(() => null), 15000, null);
  if (list) try { sessionStorage.setItem(key, JSON.stringify(list)); } catch {}
  return list;
}
document.querySelectorAll('[data-t]').forEach(inp => {
  inp.checked = !!ui[inp.dataset.t];
  inp.onchange = () => { ui[inp.dataset.t] = inp.checked; store.set({ marketUI: ui }); renderContract(); };
});
function renderContract() {
  const e = evalFor(crop), cycles = Math.max(1, Math.floor(365 / Math.max(60, e.days)));
  const r = contractLikelihood(crop, e.tonnes * (crop.form === 'grain' ? 1 : cycles), { ...ui, chains: Array.isArray(chains) ? chains : null });
  $('chains').innerHTML = chains === null ? '<span>Looking for supermarket chains within 30 km…</span>'
    : chains === false ? '<span>OpenStreetMap is busy — couldn’t check nearby chains.</span> <button class="btn ghost" id="retryChains" style="height:28px;min-width:0;font-size:12px;padding:0 12px">Retry</button>'
    : chains.length ? chains.slice(0, 10).map(c => `<span><b>${c.brand}</b> · ${c.stores} store${c.stores > 1 ? 's' : ''}${isFinite(c.nearestKm) ? ` · ${c.nearestKm.toFixed(0)} km` : ''}</span>`).join('')
    : '<span>No supermarket chains mapped within 30 km.</span>';
  $('retryChains')?.addEventListener('click', () => { chains = null; renderContract(); loadChains().then(list => { chains = list === null ? false : list; renderContract(); }); });
  $('conPct').textContent = Math.round(r.p * 100) + '%';
  gauge($('conG'), r.p, colorFor(r.p));
  whyList($('conWhy'), r.reasons);
}

/* ---------------- refinery (processing) ---------------- */
const procState = { mode: 'premium', prices: {}, labour: null };
const PROC_CROPS = [...new Set(Object.values(PROCESSES).flatMap(p => p.crops))].map(id => byId[id]).filter(Boolean);
let procCrop = null;
function renderProc() {
  // follow the page's crop when it can be processed; otherwise keep the last one (or the biggest earner)
  if (PROC_CROPS.includes(crop)) procCrop = crop;
  procCrop ||= PROC_CROPS.slice().sort((a, b) => evalFor(b).revenue - evalFor(a).revenue)[0];
  const pc = procCrop;
  $('procCrops').innerHTML = PROC_CROPS.map(c => `<button data-c="${c.id}" style="--c:${c.color}" aria-pressed="${c.id === pc.id}"><i></i>${c.name}</button>`).join('');
  $('procCrops').onclick = ev => { const b = ev.target.closest('button'); if (!b) return; procCrop = byId[b.dataset.c]; renderProc(); };
  const options = Object.entries(PROCESSES).filter(([, p]) => p.crops.includes(pc.id));
  const [pid, P] = options.find(([id]) => id === procState.pid) || options[0];
  procState.pid = pid;
  const e = evalFor(pc);
  if (procState.crop !== pc.id) { procState.crop = pc.id; procState.tonnes = Math.max(1, Math.round(e.tonnes)); procState.prices = {}; procState.capex = null; }
  const fx = I.fx;
  const labourRate = procState.labour ?? +(I.labour.rate).toFixed(2);
  const opts = { mode: procState.mode, rawPricePerT: e.pricePerT, energyPrice: I.energy || 0.25 * fx, labourPerH: labourRate, fx, market, capex: procState.capex ?? undefined, productPrices: procState.prices };
  const r = processing(pid, pc, procState.tonnes, opts);
  const lines = processingLines(r, opts, fmt);
  const t = Math.max(1e-9, r.tonnes), dep = r.capex / 10, afterDep = r.extra - dep;
  // price the main product needs for processing to match selling raw (other products at their price)
  const main = r.products[0], otherRev = r.revenue - main.revenue;
  const bePrice = main.t > 0 ? (r.rawValue + r.opCost - otherRev) / main.t : null;
  const labSrc = procState.labour != null ? 'your figure for this calculator' : I.labour.staffRate ? 'your staff average' : I.labour.custom ? 'your seasonal rate' : 'national average';
  const priceNote = o => procState.prices[o.id] != null ? ' (your price)'
    : o.commodity ? ` (World Bank ${market?.commodities?.[o.commodity]?.period || ''} bulk price${procState.mode === 'premium' && o.premiumX > 1 ? ` × ${o.premiumX} for retail` : ''})`
    : ` (${pc.name.toLowerCase()} price × ${procState.mode === 'premium' ? (o.premiumX || o.bulkX || 1) : (o.bulkX || 1)})`;
  $('procSub').textContent = `${P.name} for ${pc.name.toLowerCase()}, making ${r.products.map(o => o.name.toLowerCase()).join(' + ')}. ${P.note}`;
  $('procBody').innerHTML = `
    <div class="pgrid"><div>
    <div class="row2">
      <label class="f">Tonnes of ${pc.name.toLowerCase()} a year<input type="number" min="0" step="1" id="pT" value="${procState.tonnes}"></label>
      <label class="f">Equipment cost (${I.cur})<input type="number" min="0" step="500" id="pCap" value="${Math.round(r.capex)}"></label>
      <div class="f" style="display:grid;gap:5px;font-size:12px;color:var(--ink-dim)"><label for="pLab">Labour cost per hour</label><input type="number" min="0" step="0.5" id="pLab" value="${labourRate}" style="height:34px;border:1px solid var(--line-soft);border-radius:6px;background:var(--bg);color:var(--ink);padding:0 10px;font:inherit;font-size:13px"><span class="labnote">${labSrc} · <button id="pWages">Edit staff &amp; wages</button>${procState.labour != null ? ' · <button id="pLabReset">use my wages</button>' : ''}</span></div>
      <label class="f">How you sell it<span class="seg" id="pMode"><button data-m="bulk" aria-pressed="${procState.mode === 'bulk'}">Bulk / wholesale</button><button data-m="premium" aria-pressed="${procState.mode === 'premium'}">Own brand / premium</button></span></label>
    </div>
    <div class="prods">${r.products.map(o => `<p class="row"><span>${o.name} · ${o.t.toFixed(1)} t (${Math.round(o.yield * 100)}% of the crop)</span><span>${fmt(o.revenue)} at <input type="number" step="1" data-pp="${o.id}" value="${Math.round(o.pricePerT)}" aria-label="${o.name} price per tonne"> /t</span></p>`).join('')}</div>
    <div class="kp">
      <div><b style="color:${r.extra >= 0 ? 'var(--gain)' : 'var(--cost)'}">${r.extra >= 0 ? '+' : ''}${fmt(r.extra)}</b>extra profit a year vs selling raw</div>
      <div><b>${r.payback ? (r.payback < 1 ? '< 1 year' : r.payback.toFixed(1) + ' years') : 'never'}</b>to pay back the equipment</div>
      <div><b>${Math.round(r.hours).toLocaleString()} h</b>machine time a year</div>
    </div>
    ${r.hours > 2000 ? `<p class="warn">That's more than one shift all year (${Math.round(r.hours)} h). You'd need a bigger machine or a second one.</p>` : ''}
    ${procState.mode === 'premium' && (main.t > 15) ? `<p class="warn">This assumes you can sell ${main.t.toFixed(0)} t of ${main.name.toLowerCase()} a year under your own label. Most farm brands sell 2–15 t a year through shops, bakeries and markets. Try fewer tonnes and sell the rest raw or in bulk.</p>` : ''}
    <svg id="pchart" role="img" aria-label="Cumulative gain from processing over 10 years"></svg>
    </div><div>
    <h3>Yearly profit &amp; loss vs selling raw</h3>
    <table class="rep"><tbody>
      ${r.products.map(o => `<tr><td>${o.name}<small>${o.t.toFixed(1)} t × ${fmt(o.pricePerT)}/t${priceNote(o)}</small></td><td class="g">+${fmt(o.revenue)}</td></tr>`).join('')}
      ${lines.map(l => `<tr><td>${l.label}<small>${l.how}</small></td><td class="c">−${fmt(l.cost)}</td></tr>`).join('')}
      <tr class="t"><td><b style="font-weight:500">Extra cash profit a year</b><small>products − raw crop value − running costs</small></td><td class="${r.extra >= 0 ? 'g' : 'c'}">${r.extra >= 0 ? '+' : ''}${fmt(r.extra)}</td></tr>
      <tr><td>Equipment depreciation<small>${fmt(r.capex)} spread over a 10-year life</small></td><td class="c">−${fmt(dep)}</td></tr>
      <tr class="t"><td><b style="font-weight:500">Extra profit after depreciation</b></td><td class="${afterDep >= 0 ? 'g' : 'c'}">${afterDep >= 0 ? '+' : ''}${fmt(afterDep)}</td></tr>
    </tbody></table>
    <table class="rep" style="margin-top:14px"><tbody>
      <tr><td>Running cost per tonne processed<small>electricity, labour, packaging, maintenance</small></td><td>${fmt(r.opCost / t)}/t</td></tr>
      <tr><td>Value added per tonne<small>products sold − raw crop value</small></td><td>${fmt((r.revenue - r.rawValue) / t)}/t</td></tr>
      <tr><td>Break-even ${main.name.toLowerCase()} price<small>lowest price at which processing still beats selling raw</small></td><td>${bePrice != null ? fmt(Math.max(0, bePrice)) + '/t · ' + fmt(Math.max(0, bePrice) / 1000, 2) + '/kg' : '—'}</td></tr>
      <tr><td>Labour needed<small>${P.labourHPerT} h per tonne</small></td><td>${Math.round(t * P.labourHPerT).toLocaleString()} h · ${(t * P.labourHPerT / 1840).toFixed(2)} full-time</td></tr>
    </tbody></table>
    <details class="assume"><summary>What this assumes</summary><ul>
      <li>Equipment: a typical small farm ${P.name.toLowerCase()} costing about US$${P.capexUSD.toLocaleString()}, handling ${P.tPerHour} t of crop an hour and using ${P.kwhPerT} kWh per tonne. Buildings, permits and food-hygiene registration are not included.</li>
      <li>Product yields: ${r.products.map(o => `${Math.round(o.yield * 100)}% ${o.name.toLowerCase()}`).join(', ')} by weight of the crop.</li>
      <li>${pid === 'mill' ? 'No public flour price exists for most countries, so bulk flour is priced at 1.45× the grain price and premium stone-ground flour at 4× (typical farm-shop bag prices). Replace them with real quotes.' : 'Bulk oil and cake follow World Bank monthly prices; own-brand cold-pressed oil sells at about 3–3.5× the bulk oil price once bottled.'}</li>
      <li>Packaging: bulk bags US$${P.packUSDPerT}/t; ${pid === 'mill' ? `retail flour bags US$${P.premiumPackUSDPerT}/t` : `bottles, caps and labels US$${P.oilBottleUSDPerT}/t of oil`} when selling under your own label.</li>
      <li>Labour ${P.labourHPerT} h per tonne at ${fmt(labourRate, 2)}/h (${labSrc}); maintenance 4% of the equipment cost a year; electricity at your provider's ${fmt(opts.energyPrice, 4)}/kWh.</li>
      <li>Everything you make sells at the stated price. Selling own-brand products takes marketing time and outlets, which aren't costed.</li>
    </ul></details>
    </div></div>`;
  drawProc(r);
  $('pT').onchange = ev => { procState.tonnes = Math.max(0, Number(ev.target.value)); renderProc(); };
  $('pCap').onchange = ev => { procState.capex = Math.max(0, Number(ev.target.value)); renderProc(); };
  $('pLab').onchange = ev => { procState.labour = Math.max(0, Number(ev.target.value)); renderProc(); };
  $('pWages').onclick = () => openLabourEditor({ onSave: () => { s = store.get(); I = inputs(s, prices); evals.clear(); procState.labour = null; renderAll(); } });
  $('pLabReset')?.addEventListener('click', () => { procState.labour = null; renderProc(); });
  $('pMode').onclick = ev => { const b = ev.target.closest('button'); if (!b) return; procState.mode = b.dataset.m; procState.prices = {}; renderProc(); };
  document.querySelectorAll('[data-pp]').forEach(inp => (inp.onchange = () => { procState.prices[inp.dataset.pp] = Math.max(0, Number(inp.value)); renderProc(); }));
}
function drawProc(r) {
  const svg = $('pchart'), W = svg.clientWidth || 500, H = 200, pl = 64, pb = 22, pt = 8, Y10 = 10;
  const pts = Array.from({ length: Y10 + 1 }, (_, y) => [y, -r.capex + r.extra * y]);
  let lo = Math.min(0, ...pts.map(p => p[1])), hi = Math.max(0, ...pts.map(p => p[1]));
  if (hi - lo < 1) hi = lo + 1; const pad = (hi - lo) * 0.1; lo -= pad; hi += pad;
  const X = y => pl + y / Y10 * (W - pl - 8), Y = v => pt + (1 - (v - lo) / (hi - lo)) * (H - pt - pb);
  let g = `<line x1="${pl}" x2="${W - 8}" y1="${Y(0)}" y2="${Y(0)}" stroke="rgba(255,255,255,.35)" stroke-dasharray="3 4"/><text x="${pl - 8}" y="${Y(0) + 3}" text-anchor="end">selling raw</text>`;
  [lo + pad, hi - pad].forEach(v => (g += `<text x="${pl - 8}" y="${Y(v) + 3}" text-anchor="end">${fmt(v)}</text>`));
  for (let y = 0; y <= Y10; y += 2) g += `<text x="${X(y)}" y="${H - 5}" text-anchor="middle">${y ? 'year ' + y : 'today'}</text>`;
  g += `<polyline points="${pts.map(([y, v]) => `${X(y)},${Y(v)}`).join(' ')}" fill="none" stroke="${r.extra >= 0 ? '#cfe0c9' : '#e07856'}" stroke-width="2.2"/>`;
  if (r.payback && r.payback <= Y10) g += `<circle cx="${X(r.payback)}" cy="${Y(0)}" r="5" fill="#cfe0c9"/><text x="${X(r.payback) + 8}" y="${Y(0) - 8}" style="fill:#cfe0c9">pays back</text>`;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = g;
}

function renderAll() { renderDS(); renderSell(); renderContract(); renderProc(); }
renderAll();
loadChains().then(list => { chains = list === null ? false : list; renderContract(); });
if (location.hash) requestAnimationFrame(() => document.querySelector(location.hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
