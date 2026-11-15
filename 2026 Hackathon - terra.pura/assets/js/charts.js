// terra.pura · NASA Space Apps Challenge 2026. Code generated with Super Intelligence (SI): Claude by Anthropic;
// designed, reviewed and tested by the terra.pura team.
// terra.pura — small, readable monthly charts (SVG, responsive, hover readout).
const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const NS = 'http://www.w3.org/2000/svg';

function niceTicks(lo, hi, count = 3) {
  const span = hi - lo || 1, raw = span / count, mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) || raw;
  const start = Math.floor(lo / step) * step, out = [];
  for (let v = start; v <= hi + step * 0.001; v += step) out.push(+v.toFixed(6));
  return out;
}

/**
 * monthlyChart(host, { type:'bars'|'range', values | {min,max,mean}, unit, color, decimals })
 * host gets an <svg> plus a hover readout; redraws on resize.
 */
export function monthlyChart(host, opts) {
  const { unit = '', color = '#7eb3ff', decimals = 0 } = opts;
  host.classList.add('mchart');
  host.innerHTML = '<svg role="img"></svg><div class="mchart-tip" aria-live="polite"></div>';
  const svg = host.querySelector('svg'), tip = host.querySelector('.mchart-tip');
  const fmt = v => v.toFixed(decimals) + unit;
  const data = opts.type === 'bars' ? { hi: Math.max(...opts.values), lo: 0 } : { hi: Math.max(...opts.max), lo: Math.min(0, ...opts.min) };
  svg.setAttribute('aria-label', opts.type === 'bars'
    ? `Monthly values: ${opts.values.map((v, i) => M[i] + ' ' + fmt(v)).join(', ')}`
    : `Monthly average temperature: ${opts.mean.map((v, i) => M[i] + ' ' + fmt(v)).join(', ')}`);
  let animated = false;

  function render() {
    const W = host.clientWidth, H = host.clientHeight || 150;
    if (!W) return;
    const padL = 30, padR = 4, padT = 8, padB = 18;
    const ticks = niceTicks(data.lo, data.hi * 1.08);
    const lo = ticks[0], hi = ticks[ticks.length - 1];
    const cw = (W - padL - padR) / 12;
    const X = i => padL + cw * (i + 0.5), Y = v => padT + (1 - (v - lo) / (hi - lo)) * (H - padT - padB);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', W); svg.setAttribute('height', H);
    let s = '';
    for (const t of ticks) s += `<line x1="${padL}" x2="${W - padR}" y1="${Y(t)}" y2="${Y(t)}" stroke="rgba(255,255,255,${t === 0 ? .3 : .09})"/><text x="${padL - 6}" y="${Y(t) + 3.5}" text-anchor="end">${t}</text>`;
    M.forEach((m, i) => (s += `<text x="${X(i)}" y="${H - 4}" text-anchor="middle">${m[0]}</text>`));
    if (opts.type === 'bars') {
      opts.values.forEach((v, i) => {
        const bw = Math.min(18, cw * 0.62);
        s += `<rect class="${animated ? '' : 'grow'}" style="--i:${i}" x="${X(i) - bw / 2}" y="${Y(v)}" width="${bw}" height="${Y(0) - Y(v)}" rx="2" fill="${color}"/>`;
      });
    } else {
      const band = opts.max.map((v, i) => `${X(i)},${Y(v)}`).concat(opts.min.map((v, i) => `${X(i)},${Y(v)}`).reverse()).join(' ');
      s += `<polygon class="${animated ? '' : 'fadein'}" points="${band}" fill="${color}" opacity=".22"/>`;
      s += `<polyline class="${animated ? '' : 'draw'}" pathLength="1" points="${opts.mean.map((v, i) => `${X(i)},${Y(v)}`).join(' ')}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
      opts.mean.forEach((v, i) => (s += `<circle cx="${X(i)}" cy="${Y(v)}" r="2.5" fill="${color}" class="${animated ? '' : 'fadein'}"/>`));
    }
    s += `<line class="cursor" y1="${padT}" y2="${H - padB}" stroke="rgba(255,255,255,.5)" opacity="0"/>`;
    svg.innerHTML = s;
    animated = true;
    svg.onpointermove = e => {
      const b = svg.getBoundingClientRect(), i = Math.max(0, Math.min(11, Math.floor((e.clientX - b.left - padL) / cw)));
      const c = svg.querySelector('.cursor'); c.setAttribute('x1', X(i)); c.setAttribute('x2', X(i)); c.setAttribute('opacity', 1);
      tip.innerHTML = opts.type === 'bars' ? `<b>${M[i]}</b> ${fmt(opts.values[i])}` : `<b>${M[i]}</b> avg ${fmt(opts.mean[i])} · ${fmt(opts.min[i])} to ${fmt(opts.max[i])}`;
      tip.classList.add('on');
    };
    svg.onpointerleave = () => { svg.querySelector('.cursor').setAttribute('opacity', 0); tip.classList.remove('on'); };
  }
  new ResizeObserver(render).observe(host);
  render();
}

export const chartCSS = `
.mchart{position:relative;width:100%;height:100%;min-height:120px}
.mchart svg{display:block;overflow:visible;cursor:crosshair}
.mchart text{font:10px Inter,sans-serif;fill:#9b9892}
.mchart .grow{transform-box:fill-box;transform-origin:bottom;transform:scaleY(0);animation:mc-grow .9s cubic-bezier(.22,.8,.24,1) forwards;animation-delay:calc(var(--i) * 45ms + 500ms)}
.mchart .draw{stroke-dasharray:1;stroke-dashoffset:1;animation:mc-draw 1.5s cubic-bezier(.22,.8,.24,1) .6s forwards}
.mchart .fadein{opacity:0;animation:mc-fade .8s ease 1.2s forwards}
.mchart polygon.fadein{animation-name:mc-fade-band}
@keyframes mc-grow{to{transform:none}}
@keyframes mc-draw{to{stroke-dashoffset:0}}
@keyframes mc-fade{to{opacity:1}}
@keyframes mc-fade-band{to{opacity:.22}}
.mchart-tip{position:absolute;top:-24px;right:0;font-size:12px;color:#d9d6d0;opacity:0;transition:opacity .15s}
.mchart-tip.on{opacity:1}
.mchart-tip b{font-weight:500;color:#fff;margin-right:4px}
@media (prefers-reduced-motion:reduce){.mchart .grow,.mchart .draw,.mchart .fadein{animation:none;transform:none;stroke-dashoffset:0;opacity:1}.mchart polygon.fadein{opacity:.22}}
`;
