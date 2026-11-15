// terra.pura · NASA Space Apps Challenge 2026. Code generated with Super Intelligence (SI): Claude by Anthropic;
// designed, reviewed and tested by the terra.pura team.
import { initUI, icons, store } from './ui.js';
import { LAYERS, gibsTemplate, ESRI_IMAGERY, ndviSeries, ndviSummary, ndviWord, clearHlsDates, iso } from './satellite.js';

initUI();
document.querySelectorAll('[data-icon]').forEach(el => (el.outerHTML = icons[el.dataset.icon]));
const $ = id => document.getElementById(id);
const s = store.get();
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const nice = d => new Date(d + 'T00:00:00Z').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/* ---------------- map ---------------- */
const map = L.map('satMap', { zoomControl: false, scrollWheelZoom: true });
L.control.zoom({ position: 'topright' }).addTo(map);
const poly = L.polygon(s.land, { color: '#ffd84a', weight: 2.5, fill: false, dashArray: '6 5' });
const base = {
  photo: L.tileLayer(ESRI_IMAGERY, { maxZoom: 19, attribution: 'Imagery © Esri, Maxar, Earthstar Geographics' }),
  map: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap contributors' }),
};
map.fitBounds(L.polygon(s.land).getBounds(), { padding: [70, 70], maxZoom: 16 });
base.photo.addTo(map); poly.addTo(map);
setTimeout(() => map.invalidateSize(), 900);

let current = 'photo', overlay = null, hlsDates = null, hlsIdx = 0, ndviDate = null;
const gibs = (L_, date) => L.tileLayer(gibsTemplate(L_, date), { maxNativeZoom: L_.zoom, maxZoom: 19, opacity: 1, attribution: 'NASA GIBS / EOSDIS', bounds: [[-85, -180], [85, 180]] });

async function show(kind) {
  current = kind;
  $('layers').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.l === kind));
  if (overlay) { map.removeLayer(overlay); overlay = null; }
  map.removeLayer(base.photo); map.removeLayer(base.map);
  (kind === 'map' ? base.map : base.photo).addTo(map);
  $('legend').hidden = kind !== 'ndvi';
  $('datebar').hidden = !(kind === 'hls' || kind === 'ndvi');
  if ((kind === 'hls' || kind === 'ndvi') && map.getZoom() > (kind === 'hls' ? 14 : 12)) map.setView(L.polygon(s.land).getBounds().getCenter(), kind === 'hls' ? 14 : 12);
  if (kind === 'hls') {
    $('dLabel').textContent = 'Finding a clear day…'; $('dPrev').disabled = $('dNext').disabled = true;
    hlsDates ||= await clearHlsDates(s.center).catch(() => []);
    if (current !== 'hls') return;
    if (!hlsDates.length) { $('dLabel').textContent = 'No clear image in the last 60 days'; return; }
    paintHls();
  } else if (kind === 'ndvi') {
    ndviDate ||= series?.length ? series[series.length - 1].date : iso(new Date(Date.now() - 30 * 864e5));
    overlay = gibs(LAYERS.ndvi, ndviDate).setOpacity(0.85).addTo(map);
    paintNdviDate();
  }
  poly.bringToFront();
}
function paintHls() {
  const d = hlsDates[hlsIdx];
  if (overlay) map.removeLayer(overlay);
  overlay = gibs(LAYERS[d.layer], d.date).addTo(map);
  poly.bringToFront();
  $('dLabel').textContent = `${nice(d.date)} · ${d.layer === 'hls' ? 'Sentinel-2' : 'Landsat'}`;
  $('dPrev').disabled = hlsIdx >= hlsDates.length - 1; $('dNext').disabled = hlsIdx === 0;
}
function paintNdviDate() {
  const i = series ? series.findIndex(p => p.date === ndviDate) : -1;
  $('dLabel').textContent = `16 days from ${nice(ndviDate)}${i >= 0 ? ` · NDVI ${series[i].ndvi.toFixed(2)}` : ''}`;
  $('dPrev').disabled = !series || i <= 0; $('dNext').disabled = !series || i < 0 || i >= series.length - 1;
}
$('layers').onclick = ev => { const b = ev.target.closest('button'); if (b && b.dataset.l !== current) show(b.dataset.l); };
$('dPrev').onclick = () => step(1); $('dNext').onclick = () => step(-1);
function step(dir) {
  if (current === 'hls' && hlsDates?.length) { hlsIdx = Math.max(0, Math.min(hlsDates.length - 1, hlsIdx + dir)); paintHls(); }
  if (current === 'ndvi' && series?.length) {
    const i = series.findIndex(p => p.date === ndviDate), j = Math.max(0, Math.min(series.length - 1, i - dir));
    ndviDate = series[j].date; map.removeLayer(overlay); overlay = gibs(LAYERS.ndvi, ndviDate).setOpacity(0.85).addTo(map); poly.bringToFront(); paintNdviDate();
  }
}

/* ---------------- crop health ---------------- */
let series = null;
const fromYear = new Date().getFullYear() - 3;
ndviSeries(s.land, s.center, fromYear).then(sr => {
  series = sr;
  if (!sr.length) { $('hBody').innerHTML = '<p class="verdict">NASA has no clear greenness readings for this spot yet (it may be water, built-up or often cloudy). Try the true-colour layer on the map.</p>'; return; }
  const sum = ndviSummary(sr), d = sum.diff;
  $('hSub').textContent = `NASA MODIS Terra, 16-day greenness for your field, ${sr[0].date.slice(0, 4)}–${sum.latest.date.slice(0, 4)} (${sr.length} readings).`;
  const verdict = d == null ? '' : Math.abs(d) < 0.05 ? 'about the same as usual for this time of year' : d > 0 ? `<b style="color:var(--gain)">greener than usual</b> for this time of year (+${d.toFixed(2)})` : `<b style="color:var(--cost)">browner than usual</b> for this time of year (${d.toFixed(2)})`;
  $('hBody').innerHTML = `
    <div class="kpis">
      <div><b>${sum.latest.ndvi.toFixed(2)}</b>greenness now · ${ndviWord(sum.latest.ndvi)}</div>
      <div><b>${sum.usual != null ? sum.usual.toFixed(2) : '—'}</b>usual for ${nice(sum.latest.date).replace(/ \d{4}$/, '')}</div>
      <div><b>${sum.peak ? sum.peak.ndvi.toFixed(2) : '—'}</b>this year's peak${sum.peak ? ` · ${nice(sum.peak.date).replace(/ \d{4}$/, '')}` : ''}</div>
      <div><b>${nice(sum.latest.date)}</b>latest reading (16-day window)</div>
    </div>
    <p class="verdict">Your land is ${verdict || 'shown below'}. ${sum.latest.ndvi < 0.3 && d != null && d < -0.05 ? 'If a crop should be growing now, check for drought, pests or a failed establishment.' : ''}</p>
    <svg id="ndviChart" role="img" aria-label="Greenness of your field by month, one line per year"></svg>
    <div class="keys" id="keys"></div>`;
  drawChart(sr);
  if (current === 'ndvi') { ndviDate = sr[sr.length - 1].date; show('ndvi'); }
}).catch(err => { console.warn(err); $('hBody').innerHTML = '<p class="verdict">Couldn’t reach NASA GIBS just now. Refresh to try again.</p>'; });

function drawChart(sr) {
  const svg = $('ndviChart'), W = svg.clientWidth || 460, H = 230, pl = 34, pr = 8, pt = 8, pb = 22;
  const years = [...new Set(sr.map(p => p.date.slice(0, 4)))].sort();
  const cur = years[years.length - 1];
  const lo = Math.min(0, ...sr.map(p => p.ndvi)), hi = Math.max(0.9, ...sr.map(p => p.ndvi));
  const doy = d => { const x = new Date(d + 'T00:00:00Z'); return (x - Date.UTC(x.getUTCFullYear(), 0, 1)) / 864e5; };
  const X = v => pl + v / 365 * (W - pl - pr), Y = v => pt + (1 - (v - lo) / (hi - lo)) * (H - pt - pb);
  const col = y => y === cur ? '#cfe0c9' : y === years[years.length - 2] ? '#7eb3ff' : 'rgba(255,255,255,.28)';
  let g = '';
  for (let v = 0; v <= hi + 1e-9; v += 0.2) g += `<line x1="${pl}" x2="${W - pr}" y1="${Y(v)}" y2="${Y(v)}" stroke="rgba(255,255,255,.08)"/><text x="${pl - 6}" y="${Y(v) + 3}" text-anchor="end">${v.toFixed(1)}</text>`;
  MONTHS.forEach((m, i) => (g += `<text x="${X(i * 30.4 + 15)}" y="${H - 6}" text-anchor="middle">${m}</text>`));
  years.forEach(y => {
    const pts = sr.filter(p => p.date.startsWith(y)).map(p => `${X(doy(p.date)).toFixed(1)},${Y(p.ndvi).toFixed(1)}`);
    g += `<polyline points="${pts.join(' ')}" fill="none" stroke="${col(y)}" stroke-width="${y === cur ? 2.4 : 1.5}" stroke-linejoin="round"/>`;
  });
  const last = sr[sr.length - 1];
  g += `<circle cx="${X(doy(last.date))}" cy="${Y(last.ndvi)}" r="4.5" fill="#cfe0c9"/>`;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.innerHTML = g;
  $('keys').innerHTML = years.slice().reverse().map(y => `<span><i style="background:${col(y)}"></i>${y}</span>`).join('');
}
