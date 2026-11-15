// terra.pura · NASA Space Apps Challenge 2026. Code generated with Super Intelligence (SI): Claude by Anthropic;
// designed, reviewed and tested by the terra.pura team.
import { initUI, icons, store, reduced } from './ui.js';
import { CROPS, byId } from './crops.js';
import { weather, simulateCrop, risk, rng, doyToDate, CAUSES, SAMPLE_CLIMATE } from './sim.js';

document.querySelectorAll('[data-icon]').forEach(el => (el.outerHTML = icons[el.dataset.icon]));
initUI();

const saved = store.get();
const MAX_DAYS = 330, PLANTS = 12;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_START = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];

// Climate: real NASA POWER normals arrive in segment 3 (saved.climate); until then a labelled sample.
const climate = saved.climate || { ...SAMPLE_CLIMATE, lat: saved.center ? saved.center[0] : SAMPLE_CLIMATE.lat };
document.getElementById('src').textContent = climate.source === 'sample'
  ? 'Climate: sample temperate normals (SE England). Your land\'s NASA POWER climate is wired in next. Model: daily weather generator, FAO-56 soil water balance, growing-degree-day development, per-plant stress damage.'
  : `Climate: ${climate.source}. Model: daily weather generator, FAO-56 soil water balance, growing-degree-day development, per-plant stress damage.`;

const cfg = {
  crops: saved.simCrops || ['wheat', 'potato', 'carrot', 'lettuce', 'tomato', 'maize'],
  month: new Date().getMonth(), temp: 0, rain: 100,
  ph: saved.soil?.ph ? Math.round(saved.soil.ph * 10) / 10 : 6.5,
  irrigate: false, year: 1, speed: 8,
};
const qs = new URLSearchParams(location.search);
if (qs.has('month')) cfg.month = Math.max(0, Math.min(11, Number(qs.get('month')) - 1));
let rows = [], wx = null, day = 0, playing = false, focus = 0, lastT = 0;

/* ---------------- controls ---------------- */
const chips = document.getElementById('chips');
chips.innerHTML = CROPS.map(c => `<button data-id="${c.id}" style="--c:${c.color}" aria-pressed="${cfg.crops.includes(c.id)}"><i></i>${c.name}</button>`).join('');
chips.onclick = e => {
  const b = e.target.closest('button'); if (!b) return;
  const on = b.getAttribute('aria-pressed') !== 'true';
  if (on && cfg.crops.length >= 8) { b.animate([{ transform: 'translateX(-3px)' }, { transform: 'translateX(3px)' }, { transform: 'none' }], 240); return; }
  if (!on && cfg.crops.length <= 1) return;
  b.setAttribute('aria-pressed', on);
  cfg.crops = on ? [...cfg.crops, b.dataset.id] : cfg.crops.filter(x => x !== b.dataset.id);
  store.set({ simCrops: cfg.crops });
  run(false);
};
const month = document.getElementById('month');
month.innerHTML = MONTHS.map((m, i) => `<option value="${i}" ${i === cfg.month ? 'selected' : ''}>${m}${i === new Date().getMonth() ? ' (now)' : ''}</option>`).join('');
month.onchange = () => { cfg.month = Number(month.value); run(true); };

function slider(id, key, fmt) {
  const el = document.getElementById(id), out = document.getElementById('v' + id[0].toUpperCase() + id.slice(1));
  const paint = () => { el.style.setProperty('--p', ((el.value - el.min) / (el.max - el.min) * 100) + '%'); out.textContent = fmt(Number(el.value)); };
  el.value = cfg[key]; paint();
  let t; el.oninput = () => { cfg[key] = Number(el.value); paint(); clearTimeout(t); t = setTimeout(() => run(true), 120); };
}
slider('temp', 'temp', v => (v >= 0 ? '+' : '') + v.toFixed(1) + ' °C');
slider('rain', 'rain', v => v + '%');
slider('ph', 'ph', v => v.toFixed(1));
document.getElementById('irr').onchange = e => { cfg.irrigate = e.target.checked; run(true); };
document.getElementById('reroll').onclick = () => { cfg.year++; run(false); };

const playBtn = document.getElementById('play');
const setPlaying = p => { playing = p; playBtn.innerHTML = p ? '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>' : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>'; playBtn.setAttribute('aria-label', p ? 'Pause' : 'Play'); };
setPlaying(false);
playBtn.onclick = () => { if (!playing && day >= maxDay()) day = 0; setPlaying(!playing); lastT = performance.now(); };
document.getElementById('speed').onclick = e => { const b = e.target.closest('button'); if (!b) return; cfg.speed = Number(b.dataset.s); document.querySelectorAll('#speed button').forEach(x => x.setAttribute('aria-pressed', x === b)); };
const scrub = document.getElementById('scrub');
scrub.oninput = () => { day = Number(scrub.value); setPlaying(false); draw(); };
addEventListener('keydown', e => { if (e.code === 'Space' && !e.target.closest('input,select,button')) { e.preventDefault(); playBtn.click(); } });

/* ---------------- simulation ---------------- */
const startDoy = () => MONTH_START[cfg.month];
const maxDay = () => Math.max(30, ...rows.map(r => r.lastDay + 5));
function run(keepDay) {
  wx = weather(climate, startDoy(), MAX_DAYS, cfg.year * 104729, { tempOffset: cfg.temp, rainPct: cfg.rain });
  rows = cfg.crops.map(id => simulateCrop(byId[id], wx, { ph: cfg.ph, irrigate: cfg.irrigate, plants: PLANTS, seed: cfg.year }));
  focus = Math.min(focus, rows.length - 1);
  scrub.max = maxDay();
  if (!keepDay) day = 0;
  day = Math.min(day, maxDay());
  buildEvents();
  resize();
  scheduleRisk();
}

// Monte Carlo risk for every crop, computed in small chunks so the UI stays responsive.
let riskJob = 0;
function scheduleRisk() {
  const job = ++riskJob, list = [], todo = [...CROPS];
  document.getElementById('calc').textContent = 'Simulating 60 weather-years per crop…';
  const step = () => {
    if (job !== riskJob) return;
    const t0 = performance.now();
    while (todo.length && performance.now() - t0 < 24) {
      list.push(risk(todo.shift(), climate, startDoy(), { ph: cfg.ph, irrigate: cfg.irrigate, tempOffset: cfg.temp, rainPct: cfg.rain, days: MAX_DAYS }, 60));
    }
    if (todo.length) return setTimeout(step, 0);
    renderRisk(list);
  };
  setTimeout(step, 30);
}
function renderRisk(list) {
  list.sort((a, b) => b.death - a.death || a.harvest - b.harvest);
  document.getElementById('calc').textContent = `Sown in ${MONTHS[cfg.month]} · 60 simulated weather-years per crop.`;
  document.getElementById('risk').innerHTML = list.map((r, i) => {
    const pct = Math.round(r.death * 100), col = pct >= 50 ? 'var(--cost)' : pct >= 20 ? '#e0b456' : 'var(--gain)';
    const why = r.death > 0.02 && r.cause ? `mostly ${CAUSES[r.cause].toLowerCase()}` : r.harvest > 0.5 ? `harvest in ~${r.days} days` : 'grows too slowly to finish';
    return `<li style="--i:${i}" class="${cfg.crops.includes(r.crop.id) ? 'sel' : ''}"><span class="nm">${r.crop.name}</span><span class="pct" style="color:${col}">${pct}%</span><span class="bar"><i style="--w:${Math.max(2, pct)}%;--col:${col}"></i></span><span class="why">${why}</span></li>`;
  }).join('');
}

let events = [];
function buildEvents() {
  events = [];
  for (const r of rows) {
    const deaths = {}, ready = {};
    r.plants.forEach(p => {
      if (p.diedOn >= 0) { const k = p.diedOn + '|' + p.cause; deaths[k] = (deaths[k] || 0) + 1; }
      if (p.maturedOn >= 0) ready[p.maturedOn] = (ready[p.maturedOn] || 0) + 1;
    });
    for (const k in deaths) { const [d, c] = k.split('|'); events.push({ day: +d, html: `<b>${r.crop.name}</b> — <span class="d">${deaths[k]} died</span> (${CAUSES[c].toLowerCase()})` }); }
    const firstReady = Math.min(...Object.keys(ready).map(Number));
    if (isFinite(firstReady)) events.push({ day: firstReady, html: `<b>${r.crop.name}</b> — <span class="h">first plants ready to harvest</span>` });
  }
  events.sort((a, b) => a.day - b.day);
}

/* ---------------- drawing ---------------- */
const field = document.getElementById('field'), fx = field.getContext('2d');
const chart = document.getElementById('chart'), cx = chart.getContext('2d');
const ROW_H = 118, LABEL_W = 150;
let W = 0, dpr = 1;
function resize() {
  dpr = Math.min(2, devicePixelRatio || 1);
  W = field.clientWidth || field.parentElement.clientWidth;
  const H = rows.length * ROW_H;
  field.width = W * dpr; field.height = H * dpr; field.style.height = H + 'px';
  chart.width = chart.clientWidth * dpr; chart.height = 150 * dpr;
  draw();
}
new ResizeObserver(() => resize()).observe(document.getElementById('fieldWrap'));

const mix = (a, b, t) => { const p = x => [1, 3, 5].map(i => parseInt(x.slice(i, i + 2), 16)); const A = p(a), B = p(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`; };
const leafCol = (h, dev) => h <= 0 ? '#6b4a2f' : dev > 0.92 ? mix('#7fb069', '#c7b86a', (dev - 0.92) / 0.08 * 0.7) : mix('#c9a24f', '#7fb069', Math.min(1, h * 1.25));

function plant(ctx, x, y, crop, s, dev, h, dead, seed) {
  const r = rng(seed), k = Math.max(0.06, s);
  const col = dead ? '#6b4a2f' : leafCol(h, dev);
  ctx.save();
  ctx.translate(x, y);
  if (dead) { ctx.rotate((r() - 0.5) * 0.5); ctx.scale(1, 0.55); ctx.globalAlpha = 0.75; }
  ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const H = 82 * k;
  switch (crop.form) {
    case 'grain': {
      for (let i = 0; i < 5; i++) {
        const lean = (i - 2) * 3.2 + (r() - 0.5) * 3, hh = H * (0.82 + r() * 0.25);
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(lean * 0.2, 0); ctx.quadraticCurveTo(lean * 0.4, -hh * 0.5, lean, -hh); ctx.stroke();
        if (dev > 0.55 && !dead) {
          ctx.fillStyle = dev > 0.85 ? crop.color : mix('#7fb069', crop.color, (dev - 0.55) / 0.3);
          ctx.beginPath(); ctx.ellipse(lean, -hh - 5 * k, 2.2, 7 * Math.min(1, k * 1.3), lean * 0.03, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = col;
        }
        ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(lean * 0.3, -hh * 0.35); ctx.quadraticCurveTo(lean + (i < 2 ? -9 : 9) * k, -hh * 0.45, lean + (i < 2 ? -13 : 13) * k, -hh * 0.3); ctx.stroke();
      }
      break;
    }
    case 'leafy': {
      const L = 8 + 26 * k, n = 9;
      for (let layer = 0; layer < 2; layer++) for (let i = 0; i < n; i++) {
        // fan of leaves pointing up and outwards, inner layer shorter and lighter
        const a = Math.PI + 0.25 + (i / (n - 1)) * (Math.PI - 0.5) + (layer ? 0.15 : 0);
        const len = L * (layer ? 0.62 : 1) * (0.85 + r() * 0.25);
        ctx.fillStyle = layer && !dead ? mix('#7fb069', '#d4e8c4', 0.35 * h) : col;
        ctx.beginPath(); ctx.ellipse(Math.cos(a) * len * 0.5, Math.sin(a) * len * 0.5 - 1, len * 0.52, len * 0.22, a, 0, Math.PI * 2); ctx.fill();
      }
      if (crop.id === 'cabbage' && dev > 0.45 && !dead) { ctx.fillStyle = mix('#a9d68a', '#d4e8c4', 0.4); ctx.beginPath(); ctx.arc(0, -L * 0.35, L * 0.36 * Math.min(1, (dev - 0.3) * 1.6), 0, Math.PI * 2); ctx.fill(); }
      break;
    }
    case 'root': {
      ctx.lineWidth = 1.3;
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i - 2.5) * 0.28, len = H * 0.75 * (0.8 + r() * 0.3);
        const ex = Math.cos(a) * len, ey = Math.sin(a) * len;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(ex * 0.3, ey * 0.6, ex, ey); ctx.stroke();
        for (let j = 1; j < 4; j++) { const t = j / 4; ctx.beginPath(); ctx.arc(ex * t, ey * t, 1.6 + 2.2 * k, 0, Math.PI * 2); ctx.fill(); }
      }
      if (!dead) { // root shoulder in the soil
        const rw = 3 + 5 * k * Math.min(1, dev * 1.4), rl = 6 + 22 * k * dev;
        ctx.fillStyle = crop.color; ctx.beginPath(); ctx.moveTo(-rw, 1); ctx.quadraticCurveTo(-rw * 0.7, rl * 0.6, 0, rl); ctx.quadraticCurveTo(rw * 0.7, rl * 0.6, rw, 1); ctx.closePath(); ctx.fill();
      }
      break;
    }
    case 'tuber': {
      const blobs = 6;
      for (let i = 0; i < blobs; i++) {
        const bx = (r() - 0.5) * 30 * k, by = -H * (0.25 + r() * 0.6), br = 5 + 9 * k * (0.7 + r() * 0.4);
        ctx.globalAlpha = (dead ? 0.75 : 1) * (0.75 + r() * 0.25);
        ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = dead ? 0.75 : 1; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -H * 0.4); ctx.stroke();
      if (dev > 0.4 && dev < 0.75 && !dead) { ctx.fillStyle = '#f4f1ea'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc((r() - 0.5) * 22 * k, -H * (0.75 + r() * 0.3), 2.2, 0, Math.PI * 2); ctx.fill(); } }
      break;
    }
    case 'bulb': {
      ctx.lineWidth = 2.6;
      for (let i = 0; i < 5; i++) { const lean = (i - 2) * 5 * k; ctx.beginPath(); ctx.moveTo(0, -2); ctx.quadraticCurveTo(lean * 0.3, -H * 0.6, lean * (dev > 0.9 ? 2.6 : 1), -H * (dev > 0.9 ? 0.6 : 1)); ctx.stroke(); }
      if (dev > 0.35 && !dead) { const br = 3 + 9 * k * (dev - 0.3); ctx.fillStyle = crop.color; ctx.beginPath(); ctx.ellipse(0, -br * 0.6, br, br * 0.85, 0, 0, Math.PI * 2); ctx.fill(); }
      break;
    }
    case 'fruit': {
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(4, -H * 0.5, -2, -H); ctx.stroke();
      for (let i = 1; i < 6; i++) {
        const t = i / 6, side = i % 2 ? 1 : -1, ly = -H * t;
        ctx.beginPath(); ctx.ellipse(side * (6 + 5 * k), ly, 4 + 6 * k, 2.4 + 3 * k, side * 0.5, 0, Math.PI * 2); ctx.fill();
      }
      if (dev > 0.6 && !dead) {
        const ripe = Math.min(1, (dev - 0.6) / 0.3);
        ctx.fillStyle = mix('#8cbf5a', crop.color, ripe);
        const n = crop.id === 'pumpkin' ? 1 : 4;
        for (let i = 0; i < n; i++) { const fr = crop.id === 'pumpkin' ? 6 + 10 * k * ripe : 2.5 + 3 * k; ctx.beginPath(); ctx.arc(crop.id === 'pumpkin' ? 14 : (r() - 0.5) * 18, crop.id === 'pumpkin' ? -fr : -H * (0.3 + r() * 0.5), fr, 0, Math.PI * 2); ctx.fill(); }
      }
      break;
    }
    default: { // legume / oilseed
      ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, 0);
      for (let i = 1; i <= 6; i++) ctx.lineTo((i % 2 ? 3 : -3) * k, -H * i / 6);
      ctx.stroke();
      for (let i = 1; i <= 6; i++) { const ly = -H * i / 6; ctx.beginPath(); ctx.arc(-6 * k - 2, ly, 2 + 3 * k, 0, Math.PI * 2); ctx.arc(6 * k + 2, ly + 2, 2 + 3 * k, 0, Math.PI * 2); ctx.fill(); }
      if (!dead && dev > 0.35 && dev < 0.65) { ctx.fillStyle = crop.id === 'rapeseed' ? crop.color : '#f4f1ea'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc((r() - 0.5) * 16 * k, -H * (0.5 + r() * 0.5), 2.3, 0, Math.PI * 2); ctx.fill(); } }
      if (!dead && dev >= 0.6) { ctx.fillStyle = dev > 0.9 ? '#cbb27a' : '#9cc46f'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse((r() - 0.5) * 14 * k, -H * (0.3 + r() * 0.5), 1.8, 5 * k + 2, 0.3, 0, Math.PI * 2); ctx.fill(); } }
    }
  }
  ctx.restore();
}

function drawField() {
  const H = rows.length * ROW_H;
  fx.setTransform(dpr, 0, 0, dpr, 0, 0);
  fx.clearRect(0, 0, W, H);
  let alive = 0, dead = 0, ready = 0;
  rows.forEach((row, ri) => {
    const y0 = ri * ROW_H, ground = y0 + ROW_H - 26;
    const f = row.soil[Math.min(day, row.days - 1)];
    // soil strip, darker when wet
    fx.fillStyle = mix('#8b5e3c', '#3d2618', Math.min(1, f));
    fx.globalAlpha = ri === focus ? 1 : 0.75;
    fx.fillRect(LABEL_W, ground, W - LABEL_W, 16);
    fx.globalAlpha = 1;
    if (ri) { fx.fillStyle = 'rgba(255,255,255,.08)'; fx.fillRect(0, y0, W, 1); }
    // label
    const counts = { a: 0, d: 0, r: 0 };
    row.plants.forEach(p => { if (p.diedOn >= 0 && p.diedOn <= day) counts.d++; else if (p.maturedOn >= 0 && p.maturedOn <= day) counts.r++; else counts.a++; });
    alive += counts.a; dead += counts.d; ready += counts.r;
    fx.fillStyle = row.crop.color; fx.beginPath(); fx.arc(8, y0 + 30, 4, 0, Math.PI * 2); fx.fill();
    fx.fillStyle = ri === focus ? '#fff' : '#d9d6d0'; fx.font = '500 14px Inter, sans-serif'; fx.fillText(row.crop.name, 20, y0 + 35);
    fx.font = '12px Inter, sans-serif';
    fx.fillStyle = '#9b9892'; fx.fillText(`${counts.a} growing`, 20, y0 + 56);
    if (counts.d) { fx.fillStyle = '#e07856'; fx.fillText(`${counts.d} died`, 20, y0 + 74); }
    if (counts.r) { fx.fillStyle = '#cfe0c9'; fx.fillText(`${counts.r} ready`, counts.d ? 72 : 20, y0 + 74); }
    // plants
    const gap = (W - LABEL_W - 20) / PLANTS;
    row.plants.forEach((p, i) => {
      const x = LABEL_W + 10 + gap * (i + 0.5);
      const isDead = p.diedOn >= 0 && p.diedOn <= day;
      const isReady = p.maturedOn >= 0 && p.maturedOn <= day;
      const d = Math.min(day, row.days - 1);
      const s = p.size[d], dv = p.dev[d], h = isDead ? 0 : p.health[d];
      fx.save();
      fx.beginPath(); fx.rect(LABEL_W, y0, W - LABEL_W, ROW_H); fx.clip();
      plant(fx, x, ground + 1, row.crop, isDead ? Math.max(0.12, p.size[p.diedOn] || 0.1) : s, dv, h, isDead, ri * 100 + i + 1);
      fx.restore();
      if (isReady) { // pulse marker for harvest-ready plants
        const t = (performance.now() / 600 + i) % (Math.PI * 2);
        fx.fillStyle = `rgba(207,224,201,${0.55 + Math.sin(t) * 0.35})`;
        fx.beginPath(); fx.arc(x, y0 + 12, 3, 0, Math.PI * 2); fx.fill();
      }
      if (isDead && day - p.diedOn < 6) { // brief red flash when a plant dies
        fx.strokeStyle = `rgba(224,120,86,${1 - (day - p.diedOn) / 6})`; fx.lineWidth = 2;
        fx.beginPath(); fx.arc(x, ground - 18, 16 + (day - p.diedOn) * 3, 0, Math.PI * 2); fx.stroke();
      }
    });
  });
  return { alive, dead, ready };
}

function drawChart() {
  const w = chart.width / dpr, h = 150, n = maxDay();
  cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cx.clearRect(0, 0, w, h);
  if (!wx) return;
  const X = d => (d / n) * w;
  let lo = Infinity, hi = -Infinity;
  for (let d = 0; d < n; d++) { lo = Math.min(lo, wx.tmin[d]); hi = Math.max(hi, wx.tmax[d]); }
  lo = Math.min(lo, -2); hi = Math.max(hi, 10);
  const Y = t => 8 + (1 - (t - lo) / (hi - lo)) * (h - 48);
  // temperature gridlines every 10 °C (left axis) + soil moisture % (right axis)
  cx.font = '10px Inter, sans-serif';
  for (let t = Math.ceil(lo / 10) * 10; t <= hi; t += 10) {
    cx.strokeStyle = `rgba(255,255,255,${t === 0 ? .3 : .08})`; cx.setLineDash(t === 0 ? [3, 4] : []);
    cx.beginPath(); cx.moveTo(0, Y(t)); cx.lineTo(w, Y(t)); cx.stroke();
    cx.fillStyle = 'rgba(255,255,255,.45)'; cx.textAlign = 'left'; cx.fillText(t + ' °C', 2, Y(t) - 3);
  }
  cx.setLineDash([]);
  cx.fillStyle = 'rgba(207,224,201,.7)'; cx.textAlign = 'right';
  cx.fillText('soil 100%', w - 2, 18); cx.fillText('0%', w - 2, h - 42);
  cx.fillStyle = 'rgba(126,179,255,.8)'; cx.fillText('rain', w - 2, h - 26);
  cx.textAlign = 'left';
  // temp band
  cx.fillStyle = 'rgba(224,120,86,.35)'; cx.beginPath();
  for (let d = 0; d < n; d++) cx.lineTo(X(d), Y(wx.tmax[d]));
  for (let d = n - 1; d >= 0; d--) cx.lineTo(X(d), Y(wx.tmin[d]));
  cx.fill();
  // rain bars (bottom)
  cx.fillStyle = 'rgba(126,179,255,.8)';
  for (let d = 0; d < n; d++) if (wx.rain[d] > 0.2) cx.fillRect(X(d), h - Math.min(34, wx.rain[d] * 1.6), Math.max(1, w / n - 0.5), Math.min(34, wx.rain[d] * 1.6));
  // frost ticks
  cx.fillStyle = '#fff';
  for (let d = 0; d < n; d++) if (wx.tmin[d] < 0) cx.fillRect(X(d), 0, 1, 4);
  // soil moisture of focused row
  const row = rows[focus];
  if (row) {
    cx.strokeStyle = '#cfe0c9'; cx.lineWidth = 1.5; cx.beginPath();
    for (let d = 0; d < n; d++) cx.lineTo(X(d), 8 + (1 - Math.min(1, row.soil[Math.min(d, row.days - 1)])) * (h - 48));
    cx.stroke();
    document.getElementById('soilFor').textContent = row.crop.name;
  }
  // past/future shading + playhead
  cx.fillStyle = 'rgba(31,31,31,.55)'; cx.fillRect(X(day), 0, w - X(day), h);
  cx.fillStyle = '#fff'; cx.fillRect(X(day) - 1, 0, 2, h);
}

function draw() {
  const { alive, dead, ready } = drawField();
  drawChart();
  document.getElementById('sDay').textContent = Math.floor(day);
  document.getElementById('sAlive').textContent = alive;
  document.getElementById('sDead').textContent = dead;
  document.getElementById('sReady').textContent = ready;
  const date = doyToDate(startDoy() + Math.floor(day));
  document.getElementById('date').textContent = `Day ${Math.floor(day)} · ${date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`;
  scrub.value = Math.floor(day);
  scrub.style.setProperty('--p', (day / maxDay() * 100) + '%');
  const log = document.getElementById('log'), shown = events.filter(e => e.day <= day).slice(-12).reverse();
  const sig = shown.map(e => e.day + e.html).join();
  if (log.dataset.sig !== sig) {
    log.dataset.sig = sig;
    log.innerHTML = shown.length ? shown.map(e => `<li>Day ${e.day} · ${e.html}</li>`).join('') : '<li>Nothing has happened yet.</li>';
  }
}

function loop(t) {
  if (playing) {
    day = Math.max(0, Math.min(maxDay(), day + Math.max(0, t - lastT) / 1000 * cfg.speed));
    if (day >= maxDay()) setPlaying(false);
  }
  lastT = t;
  if (playing || rows.some(r => r.plants.some(p => p.maturedOn >= 0 && p.maturedOn <= day))) draw();
  requestAnimationFrame(loop);
}

/* hover + focus */
const tip = document.getElementById('tip');
field.addEventListener('mousemove', e => {
  const b = field.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top;
  const ri = Math.floor(y / ROW_H), row = rows[ri];
  const gap = (W - LABEL_W - 20) / PLANTS, i = Math.floor((x - LABEL_W - 10) / gap);
  if (!row || i < 0 || i >= PLANTS) { tip.classList.remove('on'); return; }
  const p = row.plants[i], d = Math.min(Math.floor(day), row.days - 1);
  const status = p.diedOn >= 0 && p.diedOn <= day ? `<span style="color:#c4532f">Died day ${p.diedOn} — ${CAUSES[p.cause].toLowerCase()}</span>`
    : p.maturedOn >= 0 && p.maturedOn <= day ? `<span style="color:#3f7a3a">Ready to harvest (day ${p.maturedOn})</span>`
    : `Health ${Math.round(p.health[d] * 100)}% · ${Math.round(p.dev[d] * 100)}% to harvest`;
  tip.innerHTML = `<b>${row.crop.name} #${i + 1}</b><br>${status}<br>Tolerance ${p.tol >= 1 ? 'above' : 'below'} average (${Math.round(p.tol * 100)}%)`;
  tip.style.left = Math.min(x + 14, W - 230) + 'px'; tip.style.top = (y + 14) + 'px';
  tip.classList.add('on');
});
field.addEventListener('mouseleave', () => tip.classList.remove('on'));
field.addEventListener('click', e => { const ri = Math.floor((e.clientY - field.getBoundingClientRect().top) / ROW_H); if (rows[ri]) { focus = ri; draw(); } });
let dragging = false;
const scrubChart = e => { const b = chart.getBoundingClientRect(); day = Math.max(0, Math.min(maxDay(), (e.clientX - b.left) / b.width * maxDay())); setPlaying(false); draw(); };
chart.addEventListener('pointerdown', e => { dragging = true; chart.setPointerCapture(e.pointerId); scrubChart(e); });
chart.addEventListener('pointermove', e => dragging && scrubChart(e));
chart.addEventListener('pointerup', () => (dragging = false));

run(false);
if (qs.has('day')) day = Math.min(maxDay(), Number(qs.get('day')) || 0);
requestAnimationFrame(t => { lastT = t; loop(t); });
// autoplay once the page has settled (not for reduced-motion visitors)
if (!reduced && !qs.has('day')) setTimeout(() => { if (!playing && day === 0) { setPlaying(true); lastT = performance.now(); } }, 1400);
