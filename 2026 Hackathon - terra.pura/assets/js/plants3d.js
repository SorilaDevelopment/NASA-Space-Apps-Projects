// terra.pura · NASA Space Apps Challenge 2026. Code generated with Super Intelligence (SI): Claude by Anthropic;
// designed, reviewed and tested by the terra.pura team.
// terra.pura — interactive 3D crop viewer. Drag (or arrow keys) to spin, momentum + idle auto-turn.
// Renders only while visible and moving; one WebGL context per viewer (dashboard uses ≤ 5).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildCrop } from './plant-models.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let shadowTex;
function contactShadow() {
  if (!shadowTex) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(0.5, 'rgba(0,0,0,.22)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    shadowTex = new THREE.CanvasTexture(c);
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = -1.01;
  return m;
}

export function webglOK() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

/**
 * mount(el, cropId, { label, onClick, autoRotate, intro })
 * Returns { dispose() }. The element keeps its own size; the canvas fills it.
 */
export function mount(el, cropId, { label = cropId, onClick, autoRotate = 0.35, intro = true, tilt = 0.18 } = {}) {
  if (!webglOK()) return { dispose() {} };
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const canvas = renderer.domElement;
  canvas.className = 'plant3d';
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', `SI-generated 3D model of ${label}. Drag or use the arrow keys to rotate${onClick ? ', press Enter to enlarge' : ''}.`);
  Object.assign(canvas.style, { width: '100%', height: '100%', display: 'block', cursor: 'grab', touchAction: 'pan-y', outline: 'none' });

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  scene.environmentIntensity = 0.55;
  scene.add(new THREE.HemisphereLight('#fff4e0', '#3a3a2c', 0.9));
  const key = new THREE.DirectionalLight('#fff1dc', 2.2); key.position.set(3, 5, 4); scene.add(key);
  const rim = new THREE.DirectionalLight('#cfe0ff', 1.4); rim.position.set(-4, 2.5, -3); scene.add(rim);

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  camera.position.set(0, 0.55, 4.9);
  camera.lookAt(0, 0, 0);

  const pivot = new THREE.Group();
  const model = buildCrop(cropId);
  pivot.add(model);
  pivot.add(contactShadow());
  scene.add(pivot);
  el.append(canvas);
  el.classList.add('has3d');

  // ---- state ----
  let rotY = -0.6, rotX = tilt, velY = 0, velX = 0, dragging = false, lastX = 0, lastY = 0, moved = 0, idleAt = 0;
  let hover = 0, hoverTarget = 0, t0 = performance.now(), visible = true, raf = 0, disposed = false;
  const introDur = intro && !reduced ? 1300 : 0;

  function size() {
    const w = el.clientWidth || 150, h = el.clientHeight || 150;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    kick();
  }
  const ro = new ResizeObserver(size); ro.observe(el);
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); }, { rootMargin: '80px' });
  io.observe(el);

  function frame(now) {
    raf = 0;
    if (disposed) return;
    const p = introDur ? Math.min(1, (now - t0) / introDur) : 1, e = 1 - Math.pow(1 - p, 3);
    if (!dragging) {
      rotY += velY; rotX += velX;
      velY *= 0.93; velX *= 0.88;
      if (autoRotate && !reduced && now - idleAt > 1600 && Math.abs(velY) < 0.002) rotY += autoRotate * 0.01;
      rotX += (tilt - rotX) * 0.04; // ease back to a gentle tilt
    }
    hover += (hoverTarget - hover) * 0.15;
    pivot.rotation.set(rotX, rotY + (1 - e) * -Math.PI * 1.2, 0);
    const s = (0.55 + 0.45 * e) * (1 + hover * 0.04);
    pivot.scale.setScalar(s);
    pivot.position.y = hover * 0.04;
    renderer.render(scene, camera);
    const moving = p < 1 || dragging || Math.abs(velY) > 0.0005 || Math.abs(hover - hoverTarget) > 0.002 || (autoRotate && !reduced);
    if (visible && moving && !document.hidden) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf && !disposed) raf = requestAnimationFrame(frame); }
  document.addEventListener('visibilitychange', kick);

  // ---- input ----
  canvas.addEventListener('pointerdown', e => {
    dragging = true; moved = 0; lastX = e.clientX; lastY = e.clientY; velY = velX = 0;
    canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing'; kick();
  });
  canvas.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    moved += Math.abs(dx) + Math.abs(dy);
    const k = 3.2 / Math.max(120, el.clientWidth);
    velY = dx * k; velX = dy * k * 0.6;
    rotY += velY; rotX = Math.max(-0.5, Math.min(0.9, rotX + velX));
    lastX = e.clientX; lastY = e.clientY;
  });
  const end = () => {
    if (!dragging) return;
    dragging = false; idleAt = performance.now(); canvas.style.cursor = 'grab';
    if (moved < 5 && onClick) onClick();
    kick();
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerenter', () => { hoverTarget = 1; kick(); });
  canvas.addEventListener('pointerleave', () => { hoverTarget = 0; kick(); });
  canvas.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { velY = (e.key === 'ArrowLeft' ? -1 : 1) * 0.08; idleAt = performance.now(); e.preventDefault(); kick(); }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { rotX = Math.max(-0.5, Math.min(0.9, rotX + (e.key === 'ArrowUp' ? -0.15 : 0.15))); e.preventDefault(); kick(); }
    else if ((e.key === 'Enter' || e.key === ' ') && onClick) { e.preventDefault(); onClick(); }
  });

  size();
  return {
    dispose() {
      disposed = true; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      document.removeEventListener('visibilitychange', kick);
      scene.traverse(o => { o.geometry?.dispose(); if (o.material) [].concat(o.material).forEach(m => m.dispose()); });
      env.dispose(); pmrem.dispose(); renderer.dispose(); renderer.forceContextLoss?.();
      canvas.remove(); el.classList.remove('has3d');
    },
  };
}

/** Full-screen viewer for a closer look. */
export function openLarge(cropId, { title, subtitle = '' } = {}) {
  const prev = document.activeElement;
  const wrap = document.createElement('div');
  wrap.className = 'plant-modal';
  wrap.setAttribute('role', 'dialog');
  wrap.setAttribute('aria-modal', 'true');
  wrap.setAttribute('aria-label', `${title} 3D model`);
  wrap.innerHTML = `<div class="pm-card"><button class="pm-close" aria-label="Close">×</button><div class="pm-stage"></div>
    <div class="pm-text"><h2>${title}</h2><p>${subtitle}</p><p class="pm-hint">Drag to spin · arrow keys work too</p></div></div>`;
  document.body.append(wrap);
  requestAnimationFrame(() => wrap.classList.add('on'));
  const v = mount(wrap.querySelector('.pm-stage'), cropId, { label: title, autoRotate: 0.25 });
  const close = () => {
    wrap.classList.remove('on');
    setTimeout(() => { v.dispose(); wrap.remove(); prev?.focus?.(); }, 300);
    removeEventListener('keydown', esc);
  };
  const esc = e => e.key === 'Escape' && close();
  addEventListener('keydown', esc);
  wrap.addEventListener('click', e => { if (e.target === wrap) close(); });
  wrap.querySelector('.pm-close').onclick = close;
  setTimeout(() => wrap.querySelector('canvas')?.focus(), 50);
}

export const modalCSS = `
.stage3d.has3d{border-color:transparent;background:radial-gradient(circle at 50% 62%,rgba(207,224,201,.10),transparent 68%);color:transparent;overflow:hidden}
.plant3d:focus-visible{outline:2px solid #cfe0c9;outline-offset:2px;border-radius:10px}
.plant-modal{position:fixed;inset:0;z-index:3000;display:grid;place-items:center;padding:16px;background:rgba(15,15,15,.6);backdrop-filter:blur(10px);opacity:0;transition:opacity .3s}
.plant-modal.on{opacity:1}
.pm-card{position:relative;display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:10px;width:min(980px,100%);max-height:calc(100vh - 32px);background:#1f1f1f;border:1px solid rgba(255,255,255,.9);border-radius:10px;overflow:hidden;transform:translateY(16px) scale(.98);transition:transform .45s cubic-bezier(.22,.8,.24,1)}
.plant-modal.on .pm-card{transform:none}
.pm-stage{height:min(70vh,620px);background:radial-gradient(circle at 50% 60%,rgba(207,224,201,.12),transparent 65%)}
.pm-text{padding:34px 30px 30px 10px;display:flex;flex-direction:column;gap:10px}
.pm-text h2{margin:0;font:400 32px/1.1 'Space Grotesk',sans-serif}
.pm-text p{margin:0;font-size:14px;line-height:1.55;color:#d9d6d0}
.pm-text .pm-hint{margin-top:auto;font-size:12px;color:#9b9892}
.pm-close{position:absolute;top:10px;right:12px;z-index:2;width:36px;height:36px;border-radius:50%;border:1px solid rgba(255,255,255,.3);background:#1f1f1f;color:#fff;font-size:22px;line-height:1;cursor:pointer;transition:transform .25s}
.pm-close:hover{transform:rotate(90deg)}
@media (max-width:760px){.pm-card{grid-template-columns:1fr}.pm-stage{height:52vh}.pm-text{padding:10px 22px 24px}}
`;
