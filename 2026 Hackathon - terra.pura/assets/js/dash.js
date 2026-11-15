// terra.pura · NASA Space Apps Challenge 2026. Code generated with Super Intelligence (SI): Claude by Anthropic;
// designed, reviewed and tested by the terra.pura team.
import { initUI, icons, store, countTo } from './ui.js';
import { monthlyChart, chartCSS } from './charts.js';
import { cropPrices, money, symbol, hazards, soilMoisture } from './data.js';
import { inputs, bestNow, rotation, reason } from './model.js';
import { sellLikelihood } from './market.js';
import { costLines } from './costs-report.js';
import { ESRI_IMAGERY } from './satellite.js';
import { openLabourEditor } from './labour-editor.js';
const market = await fetch('assets/data/market.json').then(r => r.json()).catch(() => null);

// 3D crops load lazily so the dashboard renders even if the 3D library is slow or WebGL is off
let plants3d = null;
const load3d = () => (plants3d ||= import('./plants3d.js').then(m => {
  const st3 = document.createElement('style'); st3.textContent = m.modalCSS; document.head.append(st3); return m;
}).catch(e => { console.warn('3D unavailable', e); return null; }));
const viewers = new Map(); // slot element -> viewer
async function mount3d(slot, e, opts = {}) {
  const m = await load3d(); if (!m || !slot.isConnected) return;
  viewers.get(slot)?.dispose();
  const subtitle = `${Math.round(e.risk.harvest * 100)}% of plants reach harvest in about ${e.days} days · ${e.tonnes.toFixed(1)} t expected · sells for ${fmt(e.priceKg, 3)}/kg.`;
  viewers.set(slot, m.mount(slot, e.crop.id, { label: e.crop.name, onClick: () => m.openLarge(e.crop.id, { title: e.crop.name, subtitle }), ...opts }));
}
function disposeIn(host) { for (const [slot, v] of viewers) if (!slot.isConnected || host.contains(slot)) { v.dispose(); viewers.delete(slot); } }

initUI();
const st = document.createElement('style'); st.textContent = chartCSS; document.head.append(st);
const $ = id => document.getElementById(id);
const prices = await cropPrices().catch(() => null);
let s = store.get();
let I, ranked, plan, chosen = 0;
const fmt = (v, dp = 0) => money(v, I.cur, dp);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* ---------------- land ---------------- */
const map = L.map('miniMap', { zoomControl: false, attributionControl: true, scrollWheelZoom: false });
const osmLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
const satLayer = L.tileLayer(ESRI_IMAGERY, { maxZoom: 19, attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics' });
$('mapSat').onclick = () => {
  const on = !map.hasLayer(satLayer);
  if (on) { map.removeLayer(osmLayer); satLayer.addTo(map); } else { map.removeLayer(satLayer); osmLayer.addTo(map); }
  $('miniMap').classList.toggle('sat', on); $('mapSat').setAttribute('aria-pressed', on);
  poly.setStyle(on ? { color: '#ffd84a', fillOpacity: .12 } : { color: '#1f1f1f', fillOpacity: .45 });
};
const poly = L.polygon(s.land, { color: '#1f1f1f', weight: 2, fillColor: '#cfe0c9', fillOpacity: .45 }).addTo(map);
map.fitBounds(poly.getBounds(), { padding: [30, 30] });
setTimeout(() => { map.invalidateSize(); map.fitBounds(poly.getBounds(), { padding: [30, 30] }); }, 1100);
$('coords').textContent = s.center.map(v => v.toFixed(5)).join(', ');
$('place').textContent = [s.region?.geo?.place, s.region?.geo?.county, s.region?.geo?.country].filter(Boolean).join(', ') + (s.region?.postcode ? ` · ${s.region.postcode.postcode}` : '');

/* ---------------- editable estimates ---------------- */
const FIELDS = [
  { k: 'area', label: 'Land on which you can grow crops', unit: ' m²', dp: 0, step: 10, pred: () => s.landUse?.growable ?? s.area, src: () => s.landUse?.nBuildings != null ? `OSM: ${s.landUse.nBuildings} buildings, roads & water removed` : 'area you drew' },
  { k: 'ph', label: 'pH of soil (based on local data)', unit: ' pH', dp: 1, step: 0.1, pred: () => s.soil?.ph ?? 6.5, src: () => s.soil ? 'SoilGrids 0–30 cm' : 'default' },
  { k: 'fertility', label: 'Soil fertility (0–100)', unit: '', dp: 0, step: 1, pred: () => s.soil?.fertility ?? 50, src: () => s.soil ? `${s.soil.fertilityLabel} · C ${s.soil.soc?.toFixed(0)} g/kg · N ${s.soil.nitrogen?.toFixed(1)} g/kg` : 'default' },
  { k: 'seedsPerM2', label: 'Seeds per m² of land', unit: '', dp: 0, step: 1, pred: () => ranked?.[chosen]?.crop.spacing ?? 0, src: () => `for ${ranked?.[chosen]?.crop.name || 'top pick'}` },
  { k: 'rainfall', label: 'Rainfall per year', unit: ' mm', dp: 0, step: 10, pred: () => Math.round(I?.basePrecip ?? 0), src: () => s.climate ? 'NASA POWER' : 'sample' },
  { k: 'temp', label: 'Average temperature', unit: ' °C', dp: 1, step: 0.1, pred: () => I?.baseT ?? 0, src: () => s.climate ? 'NASA POWER' : 'sample' },
];
let editing = false;
const editBtn = $('editBtn');
const paintEditBtn = () => { editBtn.innerHTML = editing ? icons.check + 'Done' : icons.edit; editBtn.setAttribute('aria-pressed', editing); };
paintEditBtn();
editBtn.onclick = () => { editing = !editing; paintEditBtn(); renderEstimates(); };
$('reset').onclick = () => { store.set({ overrides: {} }); s = store.get(); recompute(); };

function renderEstimates() {
  const o = s.overrides || {};
  $('reset').hidden = !Object.keys(o).length;
  $('estRows').innerHTML = FIELDS.map(f => {
    const v = o[f.k] ?? f.pred();
    const val = editing
      ? `<input type="number" step="${f.step}" value="${(+v).toFixed(f.dp)}" data-k="${f.k}" aria-label="${f.label}">`
      : `<b data-n="${v}" data-dp="${f.dp}" data-suf="${f.unit}">${(+v).toFixed(f.dp)}${f.unit}</b>`;
    return `<p class="row ${o[f.k] != null ? 'edited' : ''}"><span>${f.label}<span class="src">${o[f.k] != null ? 'your value · predicted ' + (+f.pred()).toFixed(f.dp) + f.unit : f.src()}</span></span>${val}</p>`;
  }).join('');
  if (editing) {
    let t;
    $('estRows').querySelectorAll('input').forEach(inp => inp.oninput = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const ov = { ...(store.get().overrides || {}) };
        if (inp.value === '') delete ov[inp.dataset.k]; else ov[inp.dataset.k] = Number(inp.value);
        store.set({ overrides: ov }); s = store.get(); recompute(true);
      }, 350);
    });
  }
}

/* ---------------- charts ---------------- */
function renderCharts() {
  const c = I.climate, rs = I.rainPct / 100;
  const p = c.p.map(v => v * rs), t = c.t.map(v => v + I.tempOffset), tmin = c.tmin.map(v => v + I.tempOffset), tmax = c.tmax.map(v => v + I.tempOffset);
  monthlyChart($('precip'), { type: 'bars', values: p, unit: ' mm', color: '#7eb3ff' });
  monthlyChart($('temp'), { type: 'range', min: tmin, max: tmax, mean: t, unit: ' °C', decimals: 1, color: '#e07856' });
  countTo($('rainTotal'), p.reduce((a, b) => a + b, 0));
  countTo($('tempAvg'), t.reduce((a, b) => a + b, 0) / 12, { decimals: 1, suffix: ' °C' });
  const src = [s.climate ? 'Climate: NASA POWER' : 'Climate: sample (NASA POWER unavailable)', s.soil ? 'Soil: ISRIC SoilGrids' : null, s.forecast ? 'Forecast: Open-Meteo' : null, 'Map & land use: OpenStreetMap', 'Prices: FAOSTAT'];
  $('sources').textContent = src.filter(Boolean).join(' · ');
}

/* ---------------- costs ---------------- */
const openRows = new Set();
$('costRows').addEventListener('click', ev => {
  if (ev.target.closest('[data-edit-labour]')) { ev.stopPropagation(); openLabourEditor({ onSave: () => { s = store.get(); recompute(); } }); return; }
  const row = ev.target.closest('.crow'); if (!row || !ev.target.closest('button')) return;
  const k = row.dataset.k; openRows.has(k) ? openRows.delete(k) : openRows.add(k);
  row.classList.toggle('open', openRows.has(k)); row.firstElementChild.setAttribute('aria-expanded', openRows.has(k));
});
function renderCosts() {
  const e = ranked[chosen], days = e.days, a = Math.max(1, I.area);
  const perM2Day = v => {
    const d = v / a / days, dp = d === 0 ? 2 : Math.min(6, Math.max(2, 1 - Math.floor(Math.log10(d)) + 1));
    return `${fmt(v)} <span class="muted" style="font-size:11px">· ${fmt(d, dp)}/m²/day</span>`;
  };
  $('costFor').textContent = `for ${e.crop.name} · ${Math.round(e.days)}-day rotation on ${Math.round(I.area).toLocaleString()} m²`;
  const lines = costLines(e, I, fmt).filter(l => l.k !== 'sewage' || l.cost > 0);
  const qty = l => l.k === 'energy' || l.k === 'water' ? perM2Day(l.cost) : `${fmt(l.cost)} <span class="muted" style="font-size:11px">· ${l.qty}</span>`;
  $('costRows').innerHTML = lines.map(l => `<div class="crow${openRows.has(l.k) ? ' open' : ''}" data-k="${l.k}">
    <button aria-expanded="${openRows.has(l.k)}"><span class="l"><i>▶</i>${l.label}${l.k === 'labour' ? `<span class="edbtn" data-edit-labour>Edit wages</span>` : ''}</span><b>${qty(l)}</b></button>
    <div class="x"><div><ul>${l.how.map(h => `<li>${h}</li>`).join('')}</ul>${l.assume.map(a => `<div class="as">${a}</div>`).join('')}
      ${l.edit ? (l.edit.action ? `<button class="ed" data-edit-labour>${l.edit.text}</button>` : `<a href="${l.edit.href}">${l.edit.text}</a>`) : ''}</div></div></div>`).join('');
  $('reportLink').href = 'report.html?crop=' + e.crop.id;
  $('cCo2').textContent = `${e.co2.toFixed(2)} t CO₂e`;
  countTo($('cTotal'), e.cost, { format: v => fmt(v, 2) });
}

/* ---------------- best now ---------------- */
function renderPick() {
  const e = ranked[chosen];
  disposeIn($('pick'));
  $('pick').innerHTML = `<span style="font-size:16px">${chosen + 1}.</span>
    <div class="stage3d pick-in" data-crop="${e.crop.id}">${e.crop.name}</div>
    <div class="pick-in"><p class="name">${e.crop.name}<em>${Math.round(sellLikelihood(e.crop, I.cc, e.tonnes, market, I.storage).p * 100)}% likely to sell · <a href="market.html?crop=${e.crop.id}" style="color:inherit">market</a> · ${Math.round(e.risk.death * 100)}% risk of losing plants · ${(e.tonnes).toFixed(1)} t expected</em></p>
    <p class="why">${reason(e, I, fmt)}</p></div>`;
  mount3d($('pick').querySelector('.stage3d'), e);
  $('list').innerHTML = ranked.slice(0, 6).map((r, i) => i === chosen ? '' : `
    <li class="rise" style="--i:${i};--d:200ms" data-i="${i}" tabindex="0"><span class="n">${i + 1}.</span><span>${r.crop.name}<span class="risk">${r.viable ? Math.round(r.risk.death * 100) + '% risk · ' + Math.round(sellLikelihood(r.crop, I.cc, r.tonnes, market, I.storage).p * 100) + '% likely to sell' : 'unlikely to finish'}</span></span>
      <span class="money">${icons.down}<span class="c">${fmt(r.cost)}</span>${icons.up}<span class="${r.profit < 0 ? 'neg' : 'g'}">${fmt(r.revenue)} / ${Math.round(r.margin * 100)}%</span></span></li>`).join('');
  $('list').querySelectorAll('li').forEach(li => {
    const go = () => { chosen = Number(li.dataset.i); renderPick(); renderCosts(); if (!editing) renderEstimates(); };
    li.onclick = go; li.onkeydown = ev => (ev.key === 'Enter' || ev.key === ' ') && (ev.preventDefault(), go());
  });
}

/* ---------------- year-round ---------------- */
function renderYear() {
  const host = $('timeline');
  disposeIn(host);
  if (!plan.length) { host.innerHTML = '<p class="empty">No crop is likely to be profitable over the next year with these settings. Try editing the estimates, providers or machinery.</p>'; $('yearTotal').innerHTML = ''; return; }
  const today = new Date(), cols = ['var(--cost)', 'var(--gain)', 'var(--sky)'], hex = ['#e07856', '#cfe0c9', '#7eb3ff'];
  const X = d => (d / 365) * 100;
  const label = d => { const x = new Date(today); x.setDate(x.getDate() + d); return MONTHS[x.getMonth()]; };
  const months = Array.from({ length: 13 }, (_, i) => { const x = new Date(today.getFullYear(), today.getMonth() + i, 1); return `<i>${MONTHS[x.getMonth()][0]}</i>`; }).join('');
  host.innerHTML = `
    <svg class="axis" viewBox="0 0 652 16" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 8H652" stroke="#fff" stroke-width="2" stroke-linecap="round" pathLength="1" class="seg" style="animation-delay:.6s"/>
      ${plan.map((e, i) => `<path d="M${X(e.startDay) * 6.52} ${i % 2 ? 14 : 2}H${X(e.startDay + e.days) * 6.52}" stroke="${hex[i]}" stroke-width="2" stroke-linecap="round" pathLength="1" class="seg" style="animation-delay:${1 + i * .4}s"/>`).join('')}
    </svg>
    <div class="mticks">${months}</div>
    ${plan.map((e, i) => `<div class="cycle ${i % 2 ? 'down' : ''}" style="left:${Math.min(X(e.startDay), 69)}%;${i % 2 ? '' : 'top:0;'}animation-delay:${1.1 + i * .4}s">
      ${i % 2 ? `<div class="stage3d" style="margin-bottom:10px">${e.crop.name}</div>` : ''}
      <h3 style="color:${cols[i]}">Cycle ${i + 1} · ${e.crop.name}</h3><p>(est ${label(e.startDay)} – ${label(e.startDay + e.days)})</p>
      ${i % 2 ? '' : `<div class="stage3d">${e.crop.name}</div>`}</div>`).join('')}`;
  host.querySelectorAll('.stage3d').forEach((slot, i) => mount3d(slot, plan[i], { autoRotate: 0.25, tilt: 0.25 }));
  const cost = plan.reduce((a, e) => a + e.cost, 0), rev = plan.reduce((a, e) => a + e.revenue, 0), co2 = plan.reduce((a, e) => a + e.co2, 0);
  $('yearTotal').innerHTML = `${icons.down}<span style="color:var(--cost)">${fmt(cost)}</span>
    <span style="margin-left:14px">${icons.up}</span><span style="color:var(--gain)">${fmt(rev)} / ${Math.round((rev - cost) / cost * 100)}%</span>
    <span class="muted" style="margin-left:14px">${co2.toFixed(1)} t CO₂e a year</span>`;
}

/* ---------------- compute ---------------- */
function recompute(fromEdit) {
  I = inputs(s, prices);
  ranked = bestNow(I);
  plan = rotation(I);
  chosen = Math.min(chosen, ranked.length - 1);
  if (!fromEdit) renderEstimates(); else { $('reset').hidden = !Object.keys(s.overrides || {}).length; }
  renderCharts(); renderCosts(); renderPick(); renderYear();
}
recompute();

/* ---------------- alerts: NASA EONET hazards + forecast warnings ---------------- */
const HAZ_ICON = { wildfires: '🔥', severeStorms: '🌀', floods: '🌊', volcanoes: '🌋', drought: '☀', dustHaze: '🌫', landslides: '⛰', snow: '❄', tempExtremes: '🌡', seaLakeIce: '🧊', earthquakes: '〰' };
function forecastAlerts(fc) {
  if (!fc) return [];
  const out = [], day = i => new Date(fc.dates[i]).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  const frost = fc.tmin.map((t, i) => [t, i]).filter(([t]) => t != null && t < 0);
  if (frost.length) { const [t, i] = frost.reduce((a, b) => (b[0] < a[0] ? b : a)); out.push({ icon: '❄', title: `Frost: ${frost.length} night${frost.length > 1 ? 's' : ''} below 0 °C`, sub: `Coldest ${t.toFixed(1)} °C on ${day(i)} — protect tender crops`, when: day(frost[0][1]) }); }
  const heat = fc.tmax.map((t, i) => [t, i]).filter(([t]) => t != null && t >= 30);
  if (heat.length) { const [t, i] = heat.reduce((a, b) => (b[0] > a[0] ? b : a)); out.push({ icon: '🌡', title: `Heat: ${heat.length} day${heat.length > 1 ? 's' : ''} above 30 °C`, sub: `Up to ${t.toFixed(1)} °C on ${day(i)} — plan irrigation`, when: day(heat[0][1]) }); }
  const wet = fc.rain.map((r, i) => [r, i]).filter(([r]) => r != null && r >= 20);
  if (wet.length) { const [r, i] = wet.reduce((a, b) => (b[0] > a[0] ? b : a)); out.push({ icon: '🌧', title: `Heavy rain: ${r.toFixed(0)} mm in a day`, sub: `${day(i)} — risk of waterlogging and soil run-off`, when: day(wet[0][1]) }); }
  return out;
}
async function renderAlerts() {
  const host = $('alerts'), [lat, lon] = s.center;
  const fcA = forecastAlerts(s.forecast);
  let haz = null;
  try { haz = await hazards(lat, lon, 300); } catch (e) { console.warn('EONET', e); }
  const rows = [
    ...(haz || []).slice(0, 5).map(h => ({ icon: HAZ_ICON[h.catId] || '⚠', title: `<a href="${h.link}" target="_blank" rel="noopener">${h.title}</a>`, sub: `${h.category}${h.magnitude ? ' · ' + h.magnitude : ''} · NASA EONET`, when: h.dist != null ? `${Math.round(h.dist)} km away` : '', hz: true })),
    ...fcA.map(a => ({ ...a, hz: false })),
  ];
  host.innerHTML = rows.length
    ? rows.map((r, i) => `<li style="--i:${i}"><span class="ic ${r.hz ? '' : 'w'}" aria-hidden="true">${r.icon}</span><span class="t">${r.title}<small>${r.sub}</small></span><span class="d">${r.when || ''}</span></li>`).join('')
    : '<li class="ok">No active natural hazards within 300 km and no frost, heat or heavy-rain warnings in the next 16 days.</li>';
  if (haz === null) host.insertAdjacentHTML('beforeend', '<li class="muted" style="font-size:12px">NASA EONET is unreachable right now — hazard check skipped.</li>');
}

/* ---------------- soil moisture: NASA POWER daily root-zone wetness ---------------- */
async function renderSoil() {
  const svg = $('smChart'), [lat, lon] = s.center;
  let d;
  try { d = await soilMoisture(lat, lon); } catch (e) { $('smNow').textContent = '—'; $('smVs').textContent = 'NASA POWER is unreachable right now.'; return; }
  if (!d.days.length) return;
  const normalFor = date => { const m = new Date(date).getMonth(); return s.climate?.rootWetness?.[m]; };
  const last = d.root[d.root.length - 1], norm = normalFor(d.days[d.days.length - 1]);
  $('smNow').textContent = Math.round(last * 100) + '%';
  if (norm != null) {
    const diff = last - norm;
    $('smVs').textContent = `${Math.abs(diff) < 0.05 ? 'about normal' : diff < 0 ? Math.round(-diff * 100) + ' points drier than normal' : Math.round(diff * 100) + ' points wetter than normal'} · ${new Date(d.days[d.days.length - 1]).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`;
  }
  const W = svg.clientWidth || 600, H = 170, pl = 32, pb = 18, n = d.root.length;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const X = i => pl + (i / (n - 1)) * (W - pl - 4), Y = v => 6 + (1 - v) * (H - pb - 6);
  const maxRain = Math.max(10, ...d.rain);
  let g = [0, 0.25, 0.5, 0.75, 1].map(v => `<line x1="${pl}" x2="${W}" y1="${Y(v)}" y2="${Y(v)}" stroke="rgba(255,255,255,${v === 0 ? .3 : .08})"/><text x="${pl - 6}" y="${Y(v) + 3}" text-anchor="end">${v * 100}%</text>`).join('');
  g += d.rain.map((r, i) => r > 0.2 ? `<rect x="${X(i) - 1.5}" y="${Y(0) - (r / maxRain) * 40}" width="3" height="${(r / maxRain) * 40}" fill="rgba(126,179,255,.55)"/>` : '').join('');
  const normPts = d.days.map((day, i) => normalFor(day) != null ? `${X(i)},${Y(normalFor(day))}` : null).filter(Boolean).join(' ');
  if (normPts) g += `<polyline points="${normPts}" fill="none" stroke="rgba(255,255,255,.45)" stroke-dasharray="4 4"/>`;
  g += `<polyline class="ln" pathLength="1" points="${d.root.map((v, i) => `${X(i)},${Y(v)}`).join(' ')}" fill="none" stroke="#cfe0c9" stroke-width="2" stroke-linejoin="round"/>`;
  g += `<polyline points="${d.top.map((v, i) => `${X(i)},${Y(v)}`).join(' ')}" fill="none" stroke="rgba(207,224,201,.35)" stroke-width="1"/>`;
  [0, Math.floor(n / 2), n - 1].forEach(i => (g += `<text x="${X(i)}" y="${H - 3}" text-anchor="${i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}">${new Date(d.days[i]).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</text>`));
  svg.innerHTML = g;
  $('smSrc').textContent = 'NASA POWER daily soil wetness (MERRA-2): bright line = root zone, faint line = topsoil, blue bars = daily rain. Normal = NASA POWER long-term average.';
}
renderAlerts(); renderSoil();

