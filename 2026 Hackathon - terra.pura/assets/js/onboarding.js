// terra.pura · NASA Space Apps Challenge 2026. Code generated with Super Intelligence (SI): Claude by Anthropic;
// designed, reviewed and tested by the terra.pura team.
import { initUI, icons, store } from './ui.js';
import { providerOptions, fxRates, symbol, money } from './data.js';
import { MACHINES, fleetYear, STORAGE, storageById } from './farm.js';

document.querySelectorAll('[data-icon]').forEach(el => (el.outerHTML = icons[el.dataset.icon]));
initUI();

const state = store.get();
const steps = [...document.querySelectorAll('.step')];
const TOTAL = steps.length;
const qs = new URLSearchParams(location.search);
const EDIT = { land: 1, energy: 2, water: 3, sewage: 4, machinery: 5, storage: 6 }[qs.get('edit')] || 0;
let current = 1;

if (EDIT) {
  document.body.classList.add('edit-mode');
  steps.forEach(s => {
    const back = s.querySelector('[data-back]'); if (back) back.remove();
    const next = s.querySelector('[data-next]'); next.innerHTML = 'Save ' + icons.check.replace('<svg', '<svg class="arrow"');
  });
}

/* ---------------- step navigation ---------------- */
function go(n) {
  steps.forEach(s => {
    const i = Number(s.dataset.step);
    s.classList.toggle('active', i === n);
    s.classList.toggle('prev', i < n);
    s.inert = i !== n;
  });
  document.querySelectorAll('.progress .bars i').forEach((b, i) => b.classList.toggle('on', i < n));
  document.getElementById('stepLabel').textContent = `Step ${n} of ${TOTAL}`;
  current = n;
  if (n === 1) setTimeout(() => map.invalidateSize(), 50);
  else if (n <= 4) renderProviders(steps[n - 1]);
  else if (n === 5) renderMachines();
  else if (n === 6) renderStorage();
  if (!EDIT) history.replaceState(null, '', '#step' + n);
  scrollTo({ top: 0, behavior: 'smooth' });
}
document.querySelectorAll('[data-next]').forEach(b => b.addEventListener('click', () => {
  if (EDIT) { store.set({ editedAt: Date.now() }); location.href = qs.get('return') || 'settings.html'; return; }
  if (current === 1) loadRegion();
  if (current < TOTAL) go(current + 1);
  else { store.set({ onboardedAt: Date.now() }); location.href = 'complete.html'; }
}));
document.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', () => go(current - 1)));

/* ---------------- region-specific providers (fetched once land is chosen) ---------------- */
let regionPromise = null;
function loadRegion(force) {
  const s = store.get();
  if (!s.center) return null;
  const key = s.center.map(v => v.toFixed(3)).join(',');
  if (!force && regionPromise && regionPromise.key === key) return regionPromise;
  regionPromise = (async () => {
    const fx = await fxRates().catch(() => null);
    const opts = await providerOptions(s.center, fx);
    store.set({ fx, region: { cc: opts.cc, currency: opts.currency, geo: opts.geo, postcode: opts.postcode || null }, providers: opts });
    // if the region changed, drop provider picks that no longer exist there
    const cur = store.get();
    for (const k of ['energy', 'water', 'sewage']) {
      const pick = cur[k];
      if (pick?.id && pick.id !== 'other' && !opts[k].some(o => o.id === pick.id)) store.set({ [k]: { own: pick.own || 0 } });
      if (pick?.id === 'other' && pick.currency !== symbol(opts.currency)) store.set({ [k]: { own: pick.own || 0 } });
    }
    return opts;
  })();
  regionPromise.key = key;
  return regionPromise;
}

const KIND = {
  energy: { unit: 'kWh', dp: 4, otherLabel: 'Other energy provider', icon: 'plug' },
  water: { unit: 'L', dp: 5, otherLabel: 'Other water provider', icon: 'glass' },
  sewage: { unit: 'L', dp: 5, otherLabel: 'Other sewage provider', icon: 'toilet' },
};
// provider logos: bundled pack (Wikidata / Wikimedia Commons), else the provider's website icon
let LOGOS = {};
const logosReady = fetch('assets/data/logos.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : {}).then(j => (LOGOS = j)).catch(() => {});
// logos already shipped with the site, matched by brand in any country (EDF France, Octopus Energy NZ…)
const BUILT_IN = [[/^edf\b/i, 'assets/img/edf.png'], [/^octopus energy/i, 'assets/img/octopus.png'], [/^e\.on next/i, 'assets/img/eon-next.png'], [/^british gas/i, 'assets/img/british-gas.png'], [/^ovo\b/i, 'assets/img/ovo.png'], [/^anglian water/i, 'assets/img/anglian-water.png']];
const logoFor = p => p.logo || BUILT_IN.find(([re]) => re.test(p.name))?.[1] || LOGOS[p.name]?.logo || LOGOS[p.name.replace(/\s*\(.*\)\s*$/, '')]?.logo
  || (p.website ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(p.website.replace(/^https?:\/\//, '').split('/')[0])}&sz=128` : null);
// Logos for names not in the bundled pack (OSM / EPA / US utilities): look the company up on Wikidata
// in the browser, accept it only if its description says it's an energy/water utility, cache the answer.
const UTILITY_RE = /electric|energy|power|utilit|water|sewer|wastewater|sanitation|hydro|grid|distribution|supplier|gas company|cooperative|co-op/i;
const NOT_RE = /film|song|album|band|ride|taxi|mobility|scooter|software|bank|football|politician|village|river|lake|species|genus|television|video game/i;
async function wikidataLogo(name) {
  const key = 'tp.logo.' + name;
  try { const c = localStorage.getItem(key); if (c !== null) return c || null; } catch {}
  let url = '';
  try {
    const q = name.replace(/\s*\(.*\)\s*$/, '').replace(/\b(co|inc|llc|corp)\.?$/i, '').trim();
    const sr = await (await fetch(`https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&limit=6&origin=*&search=${encodeURIComponent(q)}`)).json();
    const hit = (sr.search || []).find(r => UTILITY_RE.test(r.description || '') && !NOT_RE.test(r.description || ''));
    if (hit) {
      const ent = await (await fetch(`https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims&origin=*&ids=${hit.id}`)).json();
      const logos = ent.entities?.[hit.id]?.claims?.P154 || [];
      // current logo: 'preferred' rank, else one without an end date (P582), else the last listed
      const cur = logos.find(c => c.rank === 'preferred') || logos.find(c => !c.qualifiers?.P582) || logos[logos.length - 1];
      const file = cur?.mainsnak?.datavalue?.value;
      if (file) url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file.replace(/ /g, '_'))}?width=240`;
      else { // no logo on Wikidata: use the icon of its official website (P856)
        const site = ent.entities?.[hit.id]?.claims?.P856?.[0]?.mainsnak?.datavalue?.value;
        if (site) url = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(new URL(site).hostname)}&sz=128`;
      }
    }
  } catch { return null; } // network trouble: don't cache, try again next time
  try { localStorage.setItem(key, url); } catch {}
  return url || null;
}
function enhanceLogos(root) {
  root.querySelectorAll('.noimg[data-name]').forEach(async el => {
    const n = el.dataset.name, base = n.replace(/\s*\(.*\)\s*$/, '');
    if (LOGOS[n]?.blocked || LOGOS[base]?.blocked) return; // known wrong Wikidata match: keep the initials
    const url = await wikidataLogo(n);
    if (!url || !el.isConnected) return;
    const img = new Image(); img.alt = el.dataset.name + ' logo'; // not lazy: a detached lazy image never loads
    img.onload = () => el.isConnected && el.replaceWith(img);
    img.src = url;
  });
}
const initials = n => n.split(/\s+/).filter(w => /^[A-ZĐŴ]/i.test(w)).slice(0, 3).map(w => w[0]).join('').toUpperCase();

async function renderProviders(section) {
  const kind = section.dataset.kind, k = KIND[kind], grid = section.querySelector('[data-grid]');
  grid.innerHTML = [0, 1, 2].map(i => `<div class="card loading skeleton rise" style="--i:${i}"></div>`).join('');
  section.querySelector('[data-note]').textContent = 'Finding providers for your area…';
  let opts;
  try { opts = await (loadRegion() || Promise.reject(new Error('Select your land first'))); }
  catch (e) { opts = { currency: 'USD', energy: [], water: [], sewage: [], notes: { [kind]: 'Couldn’t reach the provider services — enter your price under "Other".' } }; }
  await logosReady;
  const cur = symbol(opts.currency);
  const list = opts[kind];
  const saved = store.get()[kind] || {};
  const logoHTML = p => logoFor(p)
    ? `<img src="${logoFor(p)}" alt="${p.name} logo" loading="lazy" data-name="${p.name.replace(/"/g, '&quot;')}" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'noimg',textContent:'${initials(p.name).replace(/'/g, '')}'}))">`
    : `<span class="noimg" aria-hidden="true" data-name="${p.name.replace(/"/g, '&quot;')}">${initials(p.name)}</span>`;
  grid.innerHTML = list.map((p, i) => p.price == null ? `
    <div class="card ask rise" style="--i:${i}" data-id="${p.id}" aria-pressed="${saved.id === p.id}">
      <span class="tick">${icons.check}</span>
      ${logoHTML(p)}
      <span><span class="name">${p.name}</span><br>
        <label class="mini rate"><span>${cur}</span><input type="number" min="0" step="0.0001" placeholder="your rate" value="${saved.id === p.id && saved.price ? saved.price : ''}" aria-label="${p.name} unit rate per ${k.unit}"></label><span class="unit">/${k.unit}</span>
        ${p.tag ? `<br><span class="tag">${p.tag}</span>` : ''}</span>
    </div>` : `
    <button class="card rise" style="--i:${i}" data-id="${p.id}" aria-pressed="${saved.id === p.id}">
      <span class="tick">${icons.check}</span>
      ${logoHTML(p)}
      <span><span class="name">${p.name}</span><br><span class="price">${cur}${p.price.toFixed(k.dp)}/${k.unit}</span>${p.tag ? `<br><span class="tag">${p.tag}</span>` : ''}</span>
    </button>`).join('') + `
    <div class="card other rise" style="--i:${list.length}" data-id="other" aria-pressed="${saved.id === 'other'}">
      <span class="tick">${icons.check}</span>
      ${icons[k.icon]}
      <div><div>${k.otherLabel}</div>
        <label class="mini" style="display:inline-flex"><span>${cur}</span><input type="number" min="0" step="0.0001" placeholder="${(0).toFixed(k.dp)}" value="${saved.id === 'other' ? saved.price : ''}" aria-label="${k.otherLabel} price per ${k.unit}"></label><span class="unit">/${k.unit}</span>
      </div>
    </div>`;
  section.querySelector('[data-note]').textContent = opts.notes?.[kind] || '';
  const own = section.querySelector('[data-own]');
  own.value = saved.own || 0;

  const validate = () => {
    const s = store.get()[kind] || {};
    section.querySelector('[data-next]').disabled = !((s.id && Number(s.price) > 0) || Number(s.own) > 0);
  };
  const select = (id, price, name) => {
    grid.querySelectorAll('[data-id]').forEach(c => c.setAttribute('aria-pressed', c.dataset.id === id));
    store.set({ [kind]: { ...(store.get()[kind] || {}), id, price, name, unit: k.unit, currency: cur, code: opts.currency } });
    validate();
  };
  grid.querySelectorAll('button.card').forEach(c => c.onclick = () => { const p = list.find(x => x.id === c.dataset.id); select(p.id, p.price, p.name); });
  grid.querySelectorAll('.card.ask').forEach(c => {
    const p = list.find(x => x.id === c.dataset.id), inp = c.querySelector('input');
    c.onclick = e => { if (e.target !== inp) inp.focus(); };
    inp.oninput = () => inp.value === '' ? select(null) : select(p.id, Number(inp.value), p.name);
  });
  // a single local monopoly (e.g. UK water) is selected for you
  if (list.length === 1 && !saved.id && list[0].price != null) select(list[0].id, list[0].price, list[0].name);
  enhanceLogos(grid);
  const otherInput = grid.querySelector('.other input');
  otherInput.oninput = () => otherInput.value === '' ? select(null) : select('other', Number(otherInput.value), k.otherLabel);
  own.oninput = () => { store.set({ [kind]: { ...(store.get()[kind] || {}), own: Number(own.value) || 0 } }); validate(); };
  validate();
}

/* ---------------- step 5: machinery ---------------- */
function renderMachines() {
  const host = document.getElementById('machines');
  const fleet = store.get().fleet || [];
  const get = id => fleet.find(f => f.id === id) || { id, count: 0 };
  host.innerHTML = MACHINES.map((m, i) => {
    const f = get(m.id);
    return `<div class="mrow rise ${f.count ? 'on' : ''}" style="--i:${i}" data-id="${m.id}">
      <div><div class="nm">${m.name}</div><div class="nt">${[m.note, `${m.rate} ${m.fuel === 'electric' ? 'kWh' : 'L ' + m.fuel}/h`].filter(Boolean).join(' · ')}</div></div>
      <div class="step-ctl"><button data-d="-1" aria-label="Fewer ${m.name}">−</button><output>${f.count}</output><button data-d="1" aria-label="More ${m.name}">+</button></div>
      <label class="hrs">Hours used per year (each) <input type="number" min="0" step="10" value="${f.hours ?? m.hours}"></label>
    </div>`;
  }).join('');
  const save = () => {
    const next = [...host.querySelectorAll('.mrow')].map(r => ({ id: r.dataset.id, count: Number(r.querySelector('output').value), hours: Number(r.querySelector('.hrs input').value) || 0 })).filter(f => f.count > 0);
    store.set({ fleet: next });
    total(next);
  };
  host.onclick = e => {
    const b = e.target.closest('button[data-d]'); if (!b) return;
    const row = b.closest('.mrow'), out = row.querySelector('output');
    out.value = Math.max(0, Math.min(99, Number(out.value) + Number(b.dataset.d)));
    row.classList.toggle('on', out.value > 0);
    out.animate([{ transform: 'scale(1.35)' }, { transform: 'none' }], { duration: 250, easing: 'ease-out' });
    save();
  };
  host.oninput = save;
  total(fleet);
}
function total(fleet) {
  const y = fleetYear(fleet, 0.3);
  document.getElementById('fleetTotal').innerHTML = fleet.length
    ? `<b>${(y.co2 / 1000).toFixed(1)} t</b>CO₂e a year · ${Math.round(y.diesel).toLocaleString()} L diesel${y.petrol ? ` · ${Math.round(y.petrol)} L petrol` : ''}${y.kwh ? ` · ${Math.round(y.kwh).toLocaleString()} kWh` : ''} <span class="muted">(electric share refined with your country's grid once your data loads)</span>`
    : 'No machinery — zero fuel emissions.';
}

/* ---------------- step 6: storage ---------------- */
async function renderStorage() {
  const host = document.getElementById('storage');
  const s = store.get();
  const fx = s.fx?.rates?.[s.region?.currency] || 1, cur = s.region?.currency || 'USD';
  document.querySelectorAll('[data-cur]').forEach(el => (el.textContent = symbol(cur)));
  const saved = s.storage || {};
  host.innerHTML = STORAGE.map((o, i) => `
    <button class="card store rise" style="--i:${i}" data-id="${o.id}" aria-pressed="${saved.id === o.id}">
      <span class="tick">${icons.check}</span>
      <span class="name">${o.name}</span><span class="desc">${o.note}</span>
      <span class="price">${o.usd ? money(o.usd * fx, cur) + ' / t / month' : 'Free'}</span>
    </button>`).join('');
  const months = document.getElementById('months'), mv = document.getElementById('monthsV'), rate = document.getElementById('storeRate');
  const wrap = document.getElementById('storeMonths'), next = steps[5].querySelector('[data-next]');
  const sync = () => {
    const st = store.get().storage || {};
    wrap.style.display = st.id && st.id !== 'none' ? '' : 'none';
    next.disabled = !st.id;
  };
  months.value = saved.months || 3; mv.textContent = months.value + (months.value == 1 ? ' month' : ' months');
  rate.value = saved.rate ?? '';
  host.onclick = e => {
    const c = e.target.closest('.card'); if (!c) return;
    const o = storageById[c.dataset.id];
    host.querySelectorAll('.card').forEach(x => x.setAttribute('aria-pressed', x === c));
    rate.value = (o.usd * fx).toFixed(2);
    store.set({ storage: { id: o.id, months: Number(months.value), rate: o.usd * fx, kwh: o.kwh, currency: cur } });
    sync();
  };
  months.oninput = () => { mv.textContent = months.value + (months.value == 1 ? ' month' : ' months'); store.set({ storage: { ...(store.get().storage || {}), months: Number(months.value) } }); };
  rate.oninput = () => store.set({ storage: { ...(store.get().storage || {}), rate: Number(rate.value) || 0 } });
  sync();
}

/* ---------------- step 1: map ---------------- */
const map = L.map('map', { zoomControl: true, attributionControl: true }).setView(state.center || [52.2, 0.12], state.center ? 15 : 6);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

const pinIcon = L.divIcon({ className: '', html: '<div class="tp-pin"></div>', iconSize: [16, 16], iconAnchor: [8, 8] });
let pins = [];
const poly = L.polygon([], { color: '#1f1f1f', weight: 2, fillColor: '#cfe0c9', fillOpacity: .35, dashArray: '6 6' }).addTo(map);

function addPin(latlng) {
  const m = L.marker(latlng, { icon: pinIcon, draggable: true }).addTo(map);
  m.on('drag', redraw);
  m.on('contextmenu', () => { map.removeLayer(m); pins = pins.filter(p => p !== m); redraw(); });
  pins.push(m);
  redraw();
}
function ringArea(latlngs) {
  const R = 6378137, rad = Math.PI / 180;
  let a = 0;
  for (let i = 0; i < latlngs.length; i++) {
    const p1 = latlngs[i], p2 = latlngs[(i + 1) % latlngs.length];
    a += (p2.lng - p1.lng) * rad * (2 + Math.sin(p1.lat * rad) + Math.sin(p2.lat * rad));
  }
  return Math.abs(a * R * R / 2);
}
function fmtArea(m2) { return m2 >= 1e6 ? (m2 / 1e6).toFixed(2) + ' km²' : m2 >= 1e4 ? (m2 / 1e4).toFixed(2) + ' ha' : Math.round(m2).toLocaleString() + ' m²'; }

function redraw() {
  const ll = pins.map(p => p.getLatLng());
  poly.setLatLngs(ll);
  const area = ll.length >= 3 ? ringArea(ll) : 0;
  document.getElementById('pinCount').textContent = ll.length;
  document.getElementById('area').textContent = fmtArea(area);
  document.getElementById('undo').disabled = document.getElementById('clear').disabled = !ll.length;
  document.getElementById('pinMsg').textContent = ll.length >= 3 ? 'Looks good — drag pins to fine-tune, right-click to remove.' : `Click the map to add ${3 - ll.length} more pin${3 - ll.length === 1 ? '' : 's'}.`;
  document.getElementById('maphint').classList.toggle('hide', ll.length > 0);
  steps[0].querySelector('[data-next]').disabled = ll.length < 3;
  if (ll.length >= 3 && !restoring) {
    const c = poly.getBounds().getCenter();
    const land = ll.map(p => [p.lat, p.lng]);
    const changed = JSON.stringify(land) !== JSON.stringify(store.get().land);
    store.set({ land, area, center: [c.lat, c.lng], ...(changed ? { dataFor: null } : {}) });
  }
}
map.on('click', e => addPin(e.latlng));
document.getElementById('undo').onclick = () => { const m = pins.pop(); if (m) map.removeLayer(m); redraw(); };
document.getElementById('clear').onclick = () => { pins.forEach(m => map.removeLayer(m)); pins = []; redraw(); };
// restore saved pins without treating the half-restored outline as a change (that would wipe the analysis)
let restoring = false;
if (state.land?.length) { restoring = true; state.land.forEach(([lat, lng]) => addPin({ lat, lng })); restoring = false; map.fitBounds(poly.getBounds(), { padding: [60, 60] }); }

/* search: OpenStreetMap Nominatim (max 1 request/sec per usage policy) */
const q = document.getElementById('q'), results = document.getElementById('results');
let timer, lastReq = 0, hits = [], sel = -1;
const coordRe = /^\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/;
q.addEventListener('input', () => {
  clearTimeout(timer);
  const v = q.value.trim();
  if (v.length < 3) { results.hidden = true; return; }
  const m = v.match(coordRe);
  if (m) { hits = [{ display_name: `Co-ordinates ${m[1]}, ${m[2]}`, lat: m[1], lon: m[2] }]; return showHits(); }
  timer = setTimeout(async () => {
    const wait = Math.max(0, 1000 - (Date.now() - lastReq));
    await new Promise(r => setTimeout(r, wait));
    lastReq = Date.now();
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&addressdetails=1&q=${encodeURIComponent(v)}`, { headers: { 'Accept-Language': navigator.language } });
      hits = await r.json();
      showHits();
    } catch { results.innerHTML = '<li>Search is unavailable right now — pan the map instead.</li>'; results.hidden = false; }
  }, 450);
});
function showHits() {
  sel = -1;
  results.innerHTML = hits.length ? hits.map((h, i) => {
    const [head, ...rest] = h.display_name.split(', ');
    return `<li role="option" data-i="${i}">${head}<small>${rest.join(', ')}</small></li>`;
  }).join('') : '<li>No matches</li>';
  results.hidden = false;
}
results.addEventListener('click', e => { const li = e.target.closest('li[data-i]'); if (li) pick(Number(li.dataset.i)); });
q.addEventListener('keydown', e => {
  if (results.hidden || !hits.length) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + hits.length) % hits.length;
    results.querySelectorAll('li').forEach((li, i) => li.setAttribute('aria-selected', i === sel));
  } else if (e.key === 'Enter') { e.preventDefault(); pick(Math.max(sel, 0)); }
  else if (e.key === 'Escape') results.hidden = true;
});
document.addEventListener('click', e => { if (!e.target.closest('.search')) results.hidden = true; });
function pick(i) {
  const h = hits[i];
  results.hidden = true;
  q.value = h.display_name.split(', ').slice(0, 3).join(', ');
  store.set({ place: h.display_name });
  if (h.boundingbox) map.flyToBounds([[h.boundingbox[0], h.boundingbox[2]], [h.boundingbox[1], h.boundingbox[3]]], { duration: 1.2, maxZoom: 17 });
  else map.flyTo([h.lat, h.lon], 17, { duration: 1.2 });
}

/* ---------------- start ---------------- */
if (EDIT) { if (EDIT > 1) loadRegion(); go(EDIT); }
else {
  const start = Number((location.hash.match(/step(\d)/) || [])[1]) || 1;
  if (start > 1 && state.land?.length >= 3) loadRegion();
  go(start > 1 && state.land?.length >= 3 ? start : 1);
}
