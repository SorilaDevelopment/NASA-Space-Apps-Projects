// terra.pura · NASA Space Apps Challenge 2026. Code generated with Super Intelligence (SI): Claude by Anthropic;
// designed, reviewed and tested by the terra.pura team.
//
// "Welcome back" chooser shown from Get started when this browser already has a farm:
// continue with it, or start a new one (which replaces it; everything is stored locally).
import { store } from './ui.js';

const CSS = `
dialog.pick{width:min(560px,calc(100vw - 32px));max-height:calc(100vh - 40px);padding:0;border:1px solid var(--line);border-radius:var(--r);background:var(--bg);color:var(--ink);overflow:auto}
dialog.pick::backdrop{background:rgba(0,0,0,.6);backdrop-filter:blur(3px)}
dialog.pick[open]{animation:pickin .35s var(--ease) both}
@keyframes pickin{from{opacity:0;transform:translateY(14px) scale(.98)}}
.pick .in{padding:28px 30px}
.pick h2{margin:0 0 4px;font:400 26px/1.25 var(--display)}
.pick .sub{margin:0 0 20px;font-size:13.5px;color:var(--ink-dim);line-height:1.5}
.pick h3{margin:18px 0 8px;font:500 11px/1 var(--body);letter-spacing:.08em;text-transform:uppercase;color:var(--ink-mute)}
.pick .opt{all:unset;box-sizing:border-box;width:100%;display:flex;align-items:center;justify-content:space-between;gap:14px;padding:14px 16px;margin:0 0 8px;border:1px solid var(--line-soft);border-radius:12px;cursor:pointer;transition:border-color .2s,background .2s,transform .25s var(--ease)}
.pick .opt:hover,.pick .opt:focus-visible{border-color:var(--ink);background:rgba(255,255,255,.03);transform:translateY(-1px)}
.pick .opt b{display:block;font:400 18px/1.3 var(--display)}
.pick .opt small{display:block;font-size:12px;color:var(--ink-mute);margin-top:2px}
.pick .opt .go{font-size:13px;color:var(--gain);white-space:nowrap}
.pick .opt.new{border-style:dashed}
.pick .opt.cur{border-color:var(--gain)}
.pick .warn{display:none;margin:4px 0 10px;padding:12px 14px;border-radius:10px;background:rgba(224,180,86,.1);font-size:13px;line-height:1.5;color:var(--ink-dim)}
.pick .warn.on{display:block}
.pick .warn .row{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.pick .warn button,.pick .foot button{height:34px;padding:0 14px;border-radius:99px;border:1px solid var(--line-soft);background:none;color:var(--ink);font-size:12.5px;cursor:pointer}
.pick .warn button.pri{background:var(--ink);color:var(--dark-ink);border-color:var(--ink)}
.pick .foot{display:flex;justify-content:flex-end;margin-top:16px}
`;
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const area = a => !a ? '' : a >= 1e4 ? (a / 1e4).toFixed(1) + ' ha' : Math.round(a).toLocaleString() + ' m²';

/** Returns true if the picker was shown (caller should not navigate). */
export function maybeShowFarmPicker() {
  const s = store.get();
  if (!(s.onboardedAt && s.land?.length >= 3)) return false;

  if (!document.getElementById('pickCss')) { const st = document.createElement('style'); st.id = 'pickCss'; st.textContent = CSS; document.head.append(st); }
  const name = s.region?.geo?.place || 'Your farm';
  const place = [s.region?.geo?.country, area(s.landUse?.growable ?? s.area)].filter(Boolean).join(' · ');
  const dlg = document.createElement('dialog');
  dlg.className = 'pick'; dlg.setAttribute('aria-labelledby', 'pickTitle');
  dlg.innerHTML = `<div class="in">
    <h2 id="pickTitle">Welcome back</h2>
    <p class="sub">Pick up where you left off, or set up a new farm.</p>
    <h3>Saved in this browser</h3>
    <button class="opt cur" data-a="continue"><span><b>${esc(name)}</b><small>${esc(place)}</small></span><span class="go">Continue →</span></button>
    <h3>Or</h3>
    <button class="opt new" data-a="new"><span><b>Create a new farm</b><small>Draw new land and answer a few questions</small></span><span class="go">Start →</span></button>
    <div class="warn" id="pickWarn" role="alert"><b>${esc(name)}</b> is saved only in this browser and will be replaced by the new farm.
      <div class="row"><button class="pri" data-w="replace">Replace it</button><button data-w="cancel">Keep it</button></div></div>
    <div class="foot"><button data-a="close">Cancel</button></div>
  </div>`;
  document.body.append(dlg);
  const warn = dlg.querySelector('#pickWarn');
  dlg.onclick = ev => {
    if (ev.target === dlg) return dlg.close(); // click on the backdrop
    const w = ev.target.closest('[data-w]');
    if (w) {
      if (w.dataset.w === 'cancel') return warn.classList.remove('on');
      try { localStorage.removeItem('terrapura.v1'); } catch {}
      location.href = 'onboarding.html';
      return;
    }
    const b = ev.target.closest('[data-a]'); if (!b) return;
    if (b.dataset.a === 'close') return dlg.close();
    if (b.dataset.a === 'continue') location.href = 'dash.html';
    if (b.dataset.a === 'new') warn.classList.add('on');
  };
  dlg.addEventListener('close', () => dlg.remove());
  dlg.showModal();
  return true;
}
