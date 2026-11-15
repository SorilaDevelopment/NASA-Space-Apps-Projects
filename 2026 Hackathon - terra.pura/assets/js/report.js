// terra.pura · NASA Space Apps Challenge 2026. Code generated with Super Intelligence (SI): Claude by Anthropic;
// designed, reviewed and tested by the terra.pura team.
//
// Cost report page: itemised, explained costs for one crop, all crops compared, and the full list of assumptions.
import { initUI, icons, store } from './ui.js';
import { cropPrices, money, DIESEL_USD } from './data.js';
import { CROPS, byId } from './crops.js';
import { inputs, evaluate, bestNow, doyOf, PUMP_KWH_PER_M3, RETURN_TO_SEWER } from './model.js';
import { costLines } from './costs-report.js';
import { openLabourEditor } from './labour-editor.js';
import { FULL_TIME_HOURS, IMPLICIT_USD_PER_H } from './labour.js';

initUI();
document.querySelectorAll('[data-icon]').forEach(el => (el.outerHTML = icons[el.dataset.icon]));
const $ = id => document.getElementById(id);
const prices = await cropPrices().catch(() => null);
let s = store.get(), I = inputs(s, prices);
const fmt = (v, dp = 0) => money(v, I.cur, dp);
const COLORS = { energy: '#f0c94a', water: '#7eb3ff', sewage: '#4f7fbf', seeds: '#a9d68a', fuel: '#e07856', storage: '#9b9892', other: '#c9a24f', labour: '#cfe0c9' };
const MONTH_START = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
const qs = new URLSearchParams(location.search);
let crop = byId[qs.get('crop')] || bestNow(I)[0].crop;
let when = qs.get('when') === 'usual' ? 'usual' : 'today';

// sown today (matches the dashboard) or in the crop's usual month
const evalOf = c => when === 'today' ? evaluate(c, I, doyOf(new Date()), true) : evaluate(c, I, MONTH_START[(c.sow[0] || 3) - 1]);

$('chips').innerHTML = `<span class="seg" style="display:inline-flex;border:1px solid var(--line-soft);border-radius:99px;padding:3px;margin-right:6px" id="when">
    <button data-w="today" style="height:26px;padding:0 12px;border:0;border-radius:99px;font-size:12px;cursor:pointer;background:none">Sown today</button>
    <button data-w="usual" style="height:26px;padding:0 12px;border:0;border-radius:99px;font-size:12px;cursor:pointer;background:none">Sown in its usual month</button></span>`
  + CROPS.map(c => `<button data-id="${c.id}" style="--c:${c.color}" aria-pressed="${c.id === crop.id}"><i></i>${c.name}</button>`).join('');
const paintWhen = () => $('when').querySelectorAll('button').forEach(b => { const on = b.dataset.w === when; b.style.background = on ? 'rgba(255,255,255,.14)' : 'none'; b.style.color = on ? 'var(--ink)' : 'var(--ink-dim)'; b.setAttribute('aria-pressed', on); });
paintWhen();
$('chips').onclick = ev => {
  const w = ev.target.closest('[data-w]');
  if (w) { when = w.dataset.w; paintWhen(); sync(); return render(); }
  const b = ev.target.closest('button[data-id]'); if (!b) return;
  crop = byId[b.dataset.id]; sync(); render();
};
const sync = () => {
  $('chips').querySelectorAll('button[data-id]').forEach(x => x.setAttribute('aria-pressed', x.dataset.id === crop.id));
  history.replaceState(null, '', `?crop=${crop.id}${when === 'usual' ? '&when=usual' : ''}`);
};
$('editWages').onclick = () => openLabourEditor({ onSave: () => { s = store.get(); I = inputs(s, prices); render(); } });
$('print').onclick = () => window.print();

function render() {
  const e = evalOf(crop), lines = costLines(e, I, fmt), ha = Math.max(1e-6, I.area / 10000);
  const total = e.cost, perT = e.tonnes > 0 ? total / e.tonnes : null;
  $('lede').textContent = `Every cost behind each crop on your ${Math.round(I.area).toLocaleString()} m² (${ha.toFixed(2)} ha), how we calculated it, and what we had to assume. All money in ${I.cur}.`;
  $('sumTitle').textContent = `${crop.name}: one growing cycle`;
  $('sumSub').textContent = `${when === 'today' ? 'Sown today' : `Sown in its usual month`} · about ${e.days} days to harvest · ${Math.round(e.risk.harvest * 100)}% of plants reach harvest in our simulation · sells for ${fmt(e.priceKg, 3)}/kg (${e.priceScope === 'local' ? 'FAOSTAT farm-gate ' + e.priceYear : 'world median'}).`;
  $('kpis').innerHTML = `
    <div><b class="neg">${fmt(total)}</b>total cost</div>
    <div><b>${fmt(e.revenue)}</b>expected sales (${e.tonnes.toFixed(1)} t)</div>
    <div><b class="${e.profit >= 0 ? 'pos' : 'neg'}">${e.profit >= 0 ? '+' : ''}${fmt(e.profit)}</b>profit (${Math.round(e.margin * 100)}% on cost)</div>
    <div><b>${perT != null ? fmt(perT) : '—'}</b>cost per tonne produced</div>
    <div><b>${perT != null ? fmt(perT / 1000, 3) + '/kg' : '—'}</b>break-even price (you get ${fmt(e.priceKg, 3)})</div>`;
  const shown = lines.filter(l => l.cost > 0.005);
  $('stack').innerHTML = shown.map((l, i) => `<span style="width:${l.cost / total * 100}%;background:${COLORS[l.k]};animation-delay:${i * 60}ms" title="${l.label}: ${fmt(l.cost)}"></span>`).join('');
  $('legend').innerHTML = shown.map(l => `<span><i style="background:${COLORS[l.k]}"></i>${l.label} ${Math.round(l.cost / total * 100)}%</span>`).join('');

  $('items').innerHTML = `<thead><tr><th>Item</th><th>Quantity</th><th>Cost</th><th>Per ha</th><th>Per tonne</th><th>Share</th></tr></thead><tbody>`
    + lines.map(l => `<tr><td><i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${COLORS[l.k]};margin-right:8px"></i>${l.label}</td><td>${l.qty}</td><td>${fmt(l.cost)}</td><td>${fmt(l.cost / ha)}</td><td>${e.tonnes > 0 ? fmt(l.cost / e.tonnes) : '—'}</td><td>${total > 0 ? Math.round(l.cost / total * 100) : 0}%</td></tr>
      <tr class="how"><td colspan="6"><ul>${l.how.map(h => `<li>${h}</li>`).join('')}</ul>${l.assume.map(a => `<div class="as">${a}</div>`).join('')}
        ${l.edit ? (l.edit.action ? `<button data-edit-labour>${l.edit.text}</button>` : `<a href="${l.edit.href}">${l.edit.text}</a>`) : ''}</td></tr>`).join('')
    + `<tr class="tot"><td>Total</td><td></td><td>${fmt(total)}</td><td>${fmt(total / ha)}</td><td>${perT != null ? fmt(perT) : '—'}</td><td>100%</td></tr>
       <tr><td>Emissions</td><td colspan="5" style="text-align:right">${e.co2.toFixed(2)} t CO₂e <span class="muted" style="font-size:11px">(machinery ${e.detail.fleetCo2.toFixed(2)} t + grid electricity ${e.detail.gridCo2.toFixed(2)} t)</span></td></tr></tbody>`;
  $('items').querySelectorAll('[data-edit-labour]').forEach(b => (b.onclick = () => $('editWages').click()));

  const all = CROPS.map(evalOf).sort((a, b) => b.profit - a.profit);
  $('cmpSub').textContent = `Same land, providers and wages, each crop ${when === 'today' ? 'sown today' : 'sown in its usual month'}. Click a row to open its report.`;
  $('cmp').innerHTML = `<thead><tr><th>Crop</th><th>Days</th><th>Harvest</th><th>Total cost</th><th>Labour</th><th>Cost / t</th><th>Sales</th><th>Profit</th><th>Break-even / kg</th><th>Price / kg</th></tr></thead><tbody>`
    + all.map(x => `<tr data-id="${x.crop.id}" class="${x.crop.id === crop.id ? 'sel' : ''}"><td><i style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${x.crop.color};margin-right:8px"></i>${x.crop.name}${x.viable ? '' : ' <span class="muted" style="font-size:11px">· unlikely to finish</span>'}</td>
      <td>${x.days}</td><td>${x.tonnes.toFixed(1)} t</td><td>${fmt(x.cost)}</td><td>${fmt(x.costs.labour)}</td><td>${x.tonnes > 0 ? fmt(x.cost / x.tonnes) : '—'}</td><td>${fmt(x.revenue)}</td>
      <td class="${x.profit >= 0 ? 'pos' : 'neg'}">${x.profit >= 0 ? '+' : ''}${fmt(x.profit)}</td><td>${x.tonnes > 0 ? fmt(x.cost / x.tonnes / 1000, 3) : '—'}</td><td>${fmt(x.priceKg, 3)}</td></tr>`).join('') + '</tbody>';
  $('cmp').querySelector('tbody').onclick = ev => { const tr = ev.target.closest('tr'); if (!tr) return; crop = byId[tr.dataset.id]; sync(); render(); scrollTo({ top: 0, behavior: 'smooth' }); };

  renderAssumptions();
}

function renderAssumptions() {
  const L = I.labour, c = s.climate;
  const items = [
    ['Weather', `NASA POWER ${c?.years || 'multi-year'} climatology for your exact location, turned into 24 simulated seasons (random daily weather around the averages). The first 16 days use the Open-Meteo forecast when sown today.`, 'Edit rainfall & temperature on the dashboard'],
    ['Soil', `pH ${I.ph.toFixed(1)} and fertility ${Math.round(I.fertility)}/100 from ISRIC SoilGrids (0–30 cm). Fertility scales yield between ×0.75 and ×1.25.`, 'Edit on the dashboard'],
    ['Yield', 'Typical good-practice yield per hectare × share of plants that reach harvest × plant size × soil fertility × the share that is good enough to sell. Real yields vary with variety and management.', null],
    ['Crop prices', `FAOSTAT producer (farm-gate) prices for your country where they exist, otherwise the world median. Converted at ${I.cur === 'USD' ? 'par' : `${I.fx.toFixed(3)} ${I.cur} per USD`} (today's exchange rate). Prices are annual averages, not today's market.`, 'See local prices'],
    ['Energy, water & sewage', `Your providers' unit prices (${fmt(I.energy, 4)}/kWh, ${fmt(I.water, 2)}/m³ water, ${fmt(I.sewage, 2)}/m³ sewage). Standing charges are not included. Pumping uses ${PUMP_KWH_PER_M3} kWh per m³; ${Math.round(RETURN_TO_SEWER * 100)}% of water is charged as sewage.`, 'Change in Settings'],
    ['Machinery & fuel', `Typical fuel use per hour and hours per year for each machine you listed. Diesel at ${fmt(I.diesel, 2)}/L (${DIESEL_USD[I.cc] ? 'national pump price, ex-duty where farm diesel is rebated' : 'world average'}). Fuel is split across crops by how long each one is in the ground.`, 'Change in Settings'],
    ['Labour', L.custom
      ? `Your staff: ${L.staff.length} role${L.staff.length === 1 ? '' : 's'}, wage bill ${fmt(L.wageBill)}/year incl. ${L.onCost}% on-costs over ${Math.round(L.staffHours).toLocaleString()} h → ${L.staffRate ? fmt(L.staffRate, 2) + '/h' : '—'}. Hours beyond your staff's go at the seasonal rate of ${fmt(L.seasonalRate, 2)}/h.`
      : `National average all-in farm labour cost of ${fmt(L.defaultRate, 2)}/h. A full-time worker is counted as ${FULL_TIME_HOURS.toLocaleString()} paid hours a year.`, 'Edit staff & wages'],
    ['Work hours per crop', `Typical hours per hectare, e.g. wheat ${byId.wheat.labourH} h, potatoes ${byId.potato.labourH} h, lettuce ${byId.lettuce.labourH} h. Grain is fully mechanised; vegetables include hand harvesting and grading. Failed crops need fewer harvest hours.`, null],
    ['Fertiliser, sprays & packing', `Farm-business-survey ballparks per hectare for conventional growing. The labour part (hours × US$${IMPLICIT_USD_PER_H}) has been taken out so labour is counted once, at your rates.`, null],
    ['Storage', `${I.storage.id && I.storage.id !== 'none' ? `${I.storage.months} months at ${fmt(I.storage.rate || 0, 2)} per tonne per month, plus ${I.storage.kwh || 0} kWh per tonne-month of electricity.` : 'You sell straight from the field.'}`, 'Change in Settings'],
    ['Emissions', 'Diesel 2.76 kg CO₂e/L and petrol 2.34 kg/L (UK DESNZ 2024 factors); electricity at your country\'s average grid intensity. Fertiliser and soil emissions are not included.', null],
    ['Not included', 'Land rent or mortgage, machinery purchase, depreciation and finance, insurance, overheads, taxes and subsidies. Add these from your own accounts to see full farm profit.', null],
  ];
  const link = t => t === 'Edit staff & wages' ? `<button class="ed" data-edit-labour style="color:var(--gain);background:none;border:0;padding:0;cursor:pointer;text-decoration:underline;font-size:12px">${t}</button>`
    : t?.startsWith('Change') ? `<a href="settings.html" style="color:var(--gain);font-size:12px">${t}</a>`
    : t?.startsWith('Edit') ? `<a href="dash.html#estimates" style="color:var(--gain);font-size:12px">${t}</a>`
    : t?.startsWith('See') ? `<a href="pricing.html" style="color:var(--gain);font-size:12px">${t}</a>` : '<small>fixed model value</small>';
  $('assume').innerHTML = items.map(([k, v, t]) => `<li><b>${k}</b>${v}<br>${link(t)}</li>`).join('');
  $('assume').querySelectorAll('[data-edit-labour]').forEach(b => (b.onclick = () => $('editWages').click()));
}

sync();
render();
