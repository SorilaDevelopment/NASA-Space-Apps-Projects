// terra.pura · NASA Space Apps Challenge 2026. Code generated with Super Intelligence (SI): Claude by Anthropic;
// designed, reviewed and tested by the terra.pura team.
// terra.pura — procedural 3D crop models (three.js). Style: physically-based materials with a
// little organic irregularity, colour gradients and soft sheen — between realistic and cartoony.
import * as THREE from 'three';

/* ---------------- helpers ---------------- */
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// smooth pseudo-noise from summed sines with random phases (cheap, good enough for organic wobble)
function noise3(seed = 1) {
  const r = rng(seed), w = Array.from({ length: 6 }, () => [r() * 6.28, r() * 6.28, r() * 6.28, 0.6 + r() * 1.4]);
  return (x, y, z) => w.reduce((s, [a, b, c, f]) => s + Math.sin(x * f * 1.7 + a) * Math.sin(y * f * 1.3 + b) * Math.sin(z * f * 1.9 + c), 0) / 3;
}
const C = c => new THREE.Color(c);

/** Paint vertex colours along an axis with optional noise mottling. */
function gradient(geo, stops, { axis = 'y', mottle = 0, seed = 3, fn } = {}) {
  const pos = geo.attributes.position, n = noise3(seed), cols = new Float32Array(pos.count * 3);
  geo.computeBoundingBox();
  const bb = geo.boundingBox, lo = bb.min[axis], hi = bb.max[axis];
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    let t = ({ x, y, z })[axis];
    t = (t - lo) / (hi - lo || 1);
    if (fn) t = fn(t, x, y, z);
    t = Math.max(0, Math.min(1, t));
    // piecewise stops: [[t, color], ...]
    let k = 0; while (k < stops.length - 2 && t > stops[k + 1][0]) k++;
    const [t0, c0] = stops[k], [t1, c1] = stops[k + 1];
    tmp.copy(C(c0)).lerp(C(c1), Math.max(0, Math.min(1, (t - t0) / (t1 - t0 || 1))));
    if (mottle) { const m = 1 + n(x * 6, y * 6, z * 6) * mottle; tmp.multiplyScalar(m); }
    cols.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return geo;
}
/** Push vertices along their normals with smooth noise. */
function wobble(geo, amp, freq = 3, seed = 7) {
  geo.computeVertexNormals();
  const pos = geo.attributes.position, nor = geo.attributes.normal, n = noise3(seed);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), d = n(x * freq, y * freq, z * freq) * amp;
    pos.setXYZ(i, x + nor.getX(i) * d, y + nor.getY(i) * d, z + nor.getZ(i) * d);
  }
  geo.computeVertexNormals();
  return geo;
}
function lathe(pts, seg = 48, samples = 60) {
  const curve = new THREE.SplineCurve(pts.map(([r, y]) => new THREE.Vector2(r, y)));
  const out = curve.getSpacedPoints(Math.max(samples, pts.length * 4)).map(v => new THREE.Vector2(Math.max(0, v.x), v.y));
  out[0].x = 0; out[out.length - 1].x = 0;
  return new THREE.LatheGeometry(out, seg);
}
const mat = (o = {}) => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.6, metalness: 0, side: THREE.FrontSide, ...o });
const leafMat = (o = {}) => mat({ side: THREE.DoubleSide, roughness: 0.55, sheen: 0.4, sheenColor: C('#e9ffd6'), sheenRoughness: 0.6, ...o });
function tube(points, radius, colorA, colorB, seg = 24, radial = 8, taper = 0.4) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const g = new THREE.TubeGeometry(curve, seg, radius, radial, false);
  // taper towards the end
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const ring = Math.floor(i / (radial + 1)), t = ring / seg, c = curve.getPointAt(Math.min(1, t));
    const k = 1 - t * (1 - taper);
    pos.setXYZ(i, c.x + (pos.getX(i) - c.x) * k, c.y + (pos.getY(i) - c.y) * k, c.z + (pos.getZ(i) - c.z) * k);
  }
  g.computeVertexNormals();
  return gradient(g, [[0, colorA], [1, colorB]]);
}
/**
 * Leaf blade: length L along +Y from the origin, width W.
 * shape(v) gives the half-width profile, fold = midrib V-fold, curl = backward bend, ruffle = wavy edges.
 */
function leaf({ L = 1, W = 0.4, shape = v => Math.pow(Math.sin(Math.PI * Math.min(1, v * 1.05)), 0.75), fold = 0.15, curl = 0.25, ruffle = 0, ruffleF = 14, base = '#4f8a35', tip = '#7fb455', rib = '#c8e3a5', seed = 5, segU = 10, segV = 22 } = {}) {
  const g = new THREE.PlaneGeometry(1, 1, segU, segV), pos = g.attributes.position, n = noise3(seed);
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) * 2, v = pos.getY(i) + 0.5; // u -1..1, v 0..1
    const half = shape(v) * W / 2, x = u * half;
    let z = -Math.abs(u) * fold * W + curl * v * v * L;
    z += ruffle * Math.sin(v * ruffleF + u * 3 + n(u, v, 0) * 2) * Math.abs(u) ** 1.5 * W;
    pos.setXYZ(i, x, v * L, z + n(u * 2, v * 3, 1) * 0.015 * L);
  }
  g.computeVertexNormals();
  return gradient(g, [[0, base], [1, tip]], { mottle: 0.06, seed, fn: (t, x) => t - Math.max(0, 0.18 - Math.abs(x) / W * 2) * 0 }), addRib(g, W, rib);
}
function addRib(g, W, rib) { // lighten the midrib
  const pos = g.attributes.position, col = g.attributes.color, c = new THREE.Color(), r = C(rib);
  for (let i = 0; i < pos.count; i++) {
    const k = Math.max(0, 1 - Math.abs(pos.getX(i)) / (W * 0.06));
    if (k > 0) { c.fromBufferAttribute(col, i).lerp(r, k * 0.6); col.setXYZ(i, c.r, c.g, c.b); }
  }
  return g;
}
const mesh = (g, m) => { const o = new THREE.Mesh(g, m); o.castShadow = true; return o; };
const place = (o, { p = [0, 0, 0], r = [0, 0, 0], s = 1 } = {}) => { o.position.set(...p); o.rotation.order = 'YXZ'; o.rotation.set(...r); typeof s === 'number' ? o.scale.setScalar(s) : o.scale.set(...s); return o; };

/* ---------------- crops ---------------- */
function carrot() {
  const g = new THREE.Group();
  const prof = []; for (let i = 0; i <= 30; i++) { const y = -1 + i / 30 * 1.55; prof.push([0.235 * Math.pow((y + 1) / 1.55, 0.62), y]); }
  prof.push([0.21, 0.6], [0.15, 0.645], [0.07, 0.665], [0, 0.67]);
  const root = lathe(prof, 56), pos = root.attributes.position, n = noise3(11);
  for (let i = 0; i < pos.count; i++) { // horizontal growth rings + slight irregularity
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), ring = Math.pow(Math.abs(Math.sin(y * 34 + n(x, y, z) * 2)), 12) * 0.035;
    const k = 1 - ring + n(x * 3, y * 2, z * 3) * 0.05;
    pos.setX(i, x * k); pos.setZ(i, z * k);
  }
  root.computeVertexNormals();
  gradient(root, [[0, '#c9561c'], [0.7, '#ec7b2c'], [0.95, '#f39444'], [1, '#9c7a2c']], { mottle: 0.08 });
  g.add(mesh(root, mat({ roughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.5 })));
  const r = rng(4);
  for (let s = 0; s < 7; s++) { // feathery tops
    const a = s / 7 * Math.PI * 2 + r() * 0.4, lean = 0.25 + r() * 0.3, h = 0.9 + r() * 0.35;
    const end = [Math.cos(a) * lean, 0.65 + h, Math.sin(a) * lean];
    const st = tube([[0, 0.64, 0], [end[0] * 0.3, 0.65 + h * 0.5, end[2] * 0.3], end], 0.022, '#6b8f3a', '#8db85a', 20, 6, 0.5);
    g.add(mesh(st, mat({ roughness: 0.6 })));
    for (let k = 0; k < 6; k++) {
      const t = 0.35 + k * 0.11, px = end[0] * t * t, py = 0.65 + h * t, pz = end[2] * t * t;
      for (const side of [-1, 1]) {
        const lf = leaf({ L: 0.24 - k * 0.018, W: 0.11, fold: 0.3, curl: 0.05, ruffle: 0.6, ruffleF: 22, base: '#4d7f2f', tip: '#79ad4b', seed: s * 20 + k });
        g.add(place(mesh(lf, leafMat()), { p: [px, py, pz], r: [0.5, a + side * 1.1, side * 0.9] }));
      }
    }
  }
  return g;
}
function beet() {
  const g = new THREE.Group();
  const prof = [[0, -1.05], [0.04, -0.85], [0.18, -0.6], [0.42, -0.3], [0.5, -0.05], [0.44, 0.2], [0.26, 0.34], [0.08, 0.38], [0, 0.39]];
  const root = wobble(lathe(prof, 48), 0.025, 4, 9);
  gradient(root, [[0, '#4a1023'], [0.6, '#7a1f3d'], [0.95, '#9c4a62'], [1, '#6f8a3a']], { mottle: 0.1 });
  g.add(mesh(root, mat({ roughness: 0.45, clearcoat: 0.3 })));
  const r = rng(8);
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2 + r() * 0.3, h = 0.55 + r() * 0.25;
    const end = [Math.cos(a) * 0.35, 0.38 + h, Math.sin(a) * 0.35];
    g.add(mesh(tube([[0, 0.36, 0], [end[0] * 0.4, 0.38 + h * 0.6, end[2] * 0.4], end], 0.03, '#a1244a', '#c2416a', 16, 6, 0.6), mat({ roughness: 0.4 })));
    const lf = leaf({ L: 0.8, W: 0.5, fold: 0.12, curl: 0.25, ruffle: 0.12, base: '#3f6b2a', tip: '#5d8f3a', rib: '#b8355c', seed: 30 + i });
    g.add(place(mesh(lf, leafMat()), { p: end, r: [0.45, a, 0], s: 0.9 + r() * 0.2 }));
  }
  return g;
}
function potato() {
  const g = new THREE.Group(), r = rng(12);
  const spots = [[0, 0, 0, 1], [-0.62, -0.18, 0.35, 0.72], [0.55, -0.22, -0.3, 0.66]];
  spots.forEach(([x, y, z, s], k) => {
    const geo = new THREE.SphereGeometry(1, 64, 44); geo.scale(0.6, 0.42, 0.45);
    wobble(geo, 0.05, 2.2, 20 + k);
    const pos = geo.attributes.position, eyes = Array.from({ length: 7 }, () => new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize());
    for (let i = 0; i < pos.count; i++) { // shallow eyes
      const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)), d = v.clone().normalize();
      let dent = 0; for (const e of eyes) dent += Math.exp(-d.distanceToSquared(e) * 140) * 0.035;
      v.multiplyScalar(1 - dent); pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    gradient(geo, [[0, '#9b7444'], [0.6, '#c49a63'], [1, '#d5b07a']], { mottle: 0.16, seed: 40 + k });
    g.add(place(mesh(geo, mat({ roughness: 0.82 })), { p: [x, y, z], r: [r() * 0.5, r() * 3, r() * 0.4], s }));
  });
  return g;
}
function onion() {
  const g = new THREE.Group();
  const prof = [[0, -0.62], [0.2, -0.6], [0.45, -0.45], [0.6, -0.15], [0.58, 0.12], [0.42, 0.38], [0.18, 0.58], [0.08, 0.72], [0.06, 0.9], [0, 0.92]];
  const bulb = lathe(prof, 64), pos = bulb.attributes.position;
  for (let i = 0; i < pos.count; i++) { // papery vertical veins
    const x = pos.getX(i), z = pos.getZ(i), a = Math.atan2(z, x), k = 1 + Math.sin(a * 22) * 0.006;
    pos.setX(i, x * k); pos.setZ(i, z * k);
  }
  bulb.computeVertexNormals();
  gradient(bulb, [[0, '#7a4a1e'], [0.25, '#b8733a'], [0.6, '#c98b4f'], [0.85, '#a8743f'], [1, '#8c6a3c']], { mottle: 0.12, fn: (t, x, y, z) => t + Math.sin(Math.atan2(z, x) * 22) * 0.04 });
  g.add(mesh(bulb, mat({ roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.35, sheen: 0.3, sheenColor: C('#ffd9a8') })));
  const r = rng(21);
  for (let i = 0; i < 22; i++) { // roots
    const a = r() * 6.28, l = 0.15 + r() * 0.25;
    g.add(mesh(tube([[Math.cos(a) * 0.08, -0.6, Math.sin(a) * 0.08], [Math.cos(a) * (0.12 + l * 0.4), -0.66 - l * 0.4, Math.sin(a) * (0.12 + l * 0.4)], [Math.cos(a) * (0.1 + l * 0.7), -0.7 - l, Math.sin(a) * (0.1 + l * 0.7)]], 0.008, '#d8c9a6', '#efe4c8', 10, 4, 0.5), mat({ roughness: 0.9 })));
  }
  for (let i = 0; i < 3; i++) g.add(mesh(tube([[0, 0.88, 0], [(r() - 0.5) * 0.15, 1.1, (r() - 0.5) * 0.15], [(r() - 0.5) * 0.3, 1.3, (r() - 0.5) * 0.3]], 0.03, '#8c6a3c', '#b9985e', 12, 6, 0.3), mat({ roughness: 0.8 })));
  return g;
}
function cabbage() {
  const g = new THREE.Group(), r = rng(31);
  const head = wobble(new THREE.SphereGeometry(0.62, 64, 48), 0.025, 3, 31);
  head.scale(1, 0.92, 1);
  gradient(head, [[0, '#a7c983'], [1, '#d9eeb8']], { mottle: 0.05 });
  g.add(mesh(head, mat({ roughness: 0.4, clearcoat: 0.4 })));
  const shell = (rad, phiLen, th0, th1, flare, cols, seed) => {
    const geo = new THREE.SphereGeometry(rad, 36, 28, 0, phiLen, th0, th1 - th0);
    const pos = geo.attributes.position, n = noise3(seed);
    for (let k = 0; k < pos.count; k++) {
      const x = pos.getX(k), y = pos.getY(k), z = pos.getZ(k);
      const top = Math.max(0, (y / rad - Math.cos(th0 + 0.35)) / 0.35);
      const f = 1 + flare * top * top + n(x * 6, y * 6, z * 6) * 0.025;
      pos.setXYZ(k, x * f, y - flare * 0.15 * top * top, z * f);
    }
    geo.computeVertexNormals();
    return gradient(geo, cols, { mottle: 0.08, seed, fn: (t, x, y, z) => t + Math.pow(Math.abs(Math.sin(Math.atan2(z, x) * 3)), 40) * 0.2 });
  };
  for (let i = 0; i < 5; i++) {
    const m = mesh(shell(0.645, 1.9, 0.18 * Math.PI, 0.8 * Math.PI, 0.12, [[0, '#9ec47a'], [1, '#cfe7a8']], 60 + i), leafMat({ side: THREE.DoubleSide, roughness: 0.45, clearcoat: 0.3 }));
    m.rotation.y = i * 1.3; g.add(m);
  }
  for (let i = 0; i < 7; i++) {
    const m = mesh(shell(0.72 + r() * 0.06, 1.6, 0.32 * Math.PI, 0.92 * Math.PI, 0.55, [[0, '#4a7a4a'], [0.5, '#64946a'], [1, '#97bf86']], 70 + i), leafMat({ side: THREE.DoubleSide, roughness: 0.5, clearcoat: 0.25 }));
    m.rotation.order = 'YXZ'; m.rotation.set(0.12 + r() * 0.1, i * 0.9 + r() * 0.2, 0); m.position.y = -0.05; g.add(m);
  }
  return g;
}
function lettuce() {
  const g = new THREE.Group(), r = rng(41);
  [[9, 0.95, 0.8, 0.85, '#5f9a3a', '#93c862'], [7, 0.8, 0.66, 0.5, '#7db04a', '#b5dc80'], [5, 0.6, 0.5, 0.22, '#a3cf6c', '#d4eea4']].forEach(([n, L, W, tilt, b, t], layer) => {
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + layer * 0.5 + r() * 0.15;
      const lf = leaf({ L, W, shape: v => Math.sqrt(Math.max(0, 1 - Math.pow((v - 0.58) / 0.6, 2))) * Math.min(1, v * 4 + 0.25), fold: -0.12, curl: -0.14, ruffle: 0.09, ruffleF: 13, base: b, tip: t, rib: '#eef7da', seed: layer * 20 + i, segU: 18, segV: 64 });
      g.add(place(mesh(lf, leafMat({ roughness: 0.5 })), { p: [0, -0.8, 0], r: [tilt * (0.9 + r() * 0.2), a, 0] }));
    }
  });
  return g;
}
function spinach() {
  const g = new THREE.Group(), r = rng(51);
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * Math.PI * 2 + r() * 0.3, lean = 0.35 + r() * 0.25, h = 0.4 + r() * 0.3;
    const end = [Math.cos(a) * lean, -0.9 + h, Math.sin(a) * lean];
    g.add(mesh(tube([[0, -1, 0], [end[0] * 0.5, -1 + h * 0.6, end[2] * 0.5], end], 0.022, '#7aa64e', '#5d8f3a', 12, 6, 0.8), mat({ roughness: 0.5 })));
    const lf = leaf({ L: 0.75, W: 0.5, shape: v => v < 0.25 ? Math.pow(v / 0.25, 0.6) : Math.pow(1 - (v - 0.25) / 0.75, 0.9), fold: 0.14, curl: 0.22, ruffle: 0.02, base: '#2b5f2a', tip: '#3d7a35', rib: '#9fc57f', seed: 70 + i });
    g.add(place(mesh(lf, leafMat({ roughness: 0.4, clearcoat: 0.25, clearcoatRoughness: 0.4 })), { p: end, r: [0.95 + r() * 0.3, a, 0] }));
  }
  return g;
}
function tomato() {
  const g = new THREE.Group(), r = rng(61);
  g.add(mesh(tube([[-0.8, 0.95, 0], [-0.2, 1.05, 0.05], [0.3, 0.9, -0.05], [0.8, 0.7, 0]], 0.035, '#4f7a2e', '#6b9a3e', 30, 8, 0.7), mat({ roughness: 0.6 })));
  [[-0.38, -0.05, 0.1, 1], [0.32, -0.25, -0.05, 0.92], [0, -0.55, 0.3, 0.82]].forEach(([x, y, z, s], k) => {
    const geo = new THREE.SphereGeometry(0.42, 64, 48), pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) { // lobes + flattened top
      const vx = pos.getX(i), vy = pos.getY(i), vz = pos.getZ(i), a = Math.atan2(vz, vx), up = Math.max(0, vy / 0.42);
      const f = 1 + Math.cos(a * 5) * 0.035 * up;
      pos.setXYZ(i, vx * f, vy * (vy > 0 ? 0.78 : 0.88) - Math.pow(Math.max(0, 1 - Math.hypot(vx, vz) / 0.12), 2) * 0.04 * (vy > 0), vz * f);
    }
    geo.computeVertexNormals();
    gradient(geo, [[0, '#b52a1c'], [0.7, '#d93a26'], [1, '#e86a3a']], { mottle: 0.05, seed: 80 + k });
    const fruit = place(mesh(geo, mat({ roughness: 0.25, clearcoat: 0.9, clearcoatRoughness: 0.15 })), { p: [x, y, z], s });
    g.add(fruit);
    for (let i = 0; i < 5; i++) { // calyx star
      const lf = leaf({ L: 0.2, W: 0.06, fold: 0.2, curl: -0.12, base: '#3e6b26', tip: '#5d8f3a', seed: 90 + i });
      g.add(place(mesh(lf, leafMat()), { p: [x, y + 0.33 * s, z], r: [Math.PI / 2 - 0.35, i / 5 * Math.PI * 2, 0], s }));
    }
    g.add(mesh(tube([[x, y + 0.33 * s, z], [x * 0.9, y + 0.7 * s, z * 0.5], [x * 0.8, 0.95, 0]], 0.02, '#4f7a2e', '#5d8f3a', 10, 6, 1), mat()));
  });
  return g;
}
function pumpkin() {
  const g = new THREE.Group();
  const geo = new THREE.SphereGeometry(1, 96, 64), pos = geo.attributes.position, n = noise3(71);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), a = Math.atan2(z, x);
    const rib = 1 - 0.07 * Math.pow(Math.abs(Math.cos(a * 5)), 6) * (1 - Math.abs(y));
    const pole = 1 - Math.pow(Math.max(0, Math.abs(y) - 0.75) / 0.25, 2) * 0.25;
    pos.setXYZ(i, x * rib, y * 0.68 * pole + n(x * 2, y * 2, z * 2) * 0.02, z * rib);
  }
  geo.computeVertexNormals();
  gradient(geo, [[0, '#b8561a'], [0.5, '#e07a1f'], [1, '#f0a03a']], { mottle: 0.07, fn: (t, x, y, z) => t - Math.pow(Math.abs(Math.cos(Math.atan2(z, x) * 5)), 8) * 0.35 });
  g.add(mesh(geo, mat({ roughness: 0.45, clearcoat: 0.35 })));
  g.add(mesh(tube([[0, 0.5, 0], [0.05, 0.75, 0.02], [0.18, 0.92, 0.05]], 0.09, '#5b5a2e', '#8a8450', 16, 7, 0.65), mat({ roughness: 0.85 })));
  return g;
}
function grainStalk(kind, seed) {
  const g = new THREE.Group(), r = rng(seed);
  const lean = (r() - 0.5) * 0.3, bend = kind === 'rice' ? 0.5 : kind === 'oats' ? 0.2 : 0.1;
  const top = [lean, 1.0, (r() - 0.5) * 0.2];
  const stem = tube([[0, -1, 0], [lean * 0.3, 0, top[2] * 0.3], top], 0.022, '#b99a4a', '#d9bd6a', 24, 6, 0.7);
  g.add(mesh(stem, mat({ roughness: 0.5 })));
  const grainCol = { wheat: ['#c99a3a', '#e8c873'], barley: ['#cfae5c', '#ead48e'], oats: ['#b9a86a', '#d9c98f'], rice: ['#b59f4f', '#d4c27a'] }[kind];
  const grainGeo = gradient(new THREE.SphereGeometry(1, 14, 10).scale(0.045, 0.085, 0.04), [[0, grainCol[0]], [1, grainCol[1]]]);
  const grainM = mat({ roughness: 0.5, sheen: 0.12, sheenColor: C('#fff3cc') });
  if (kind === 'wheat' || kind === 'barley') {
    for (let i = 0; i < 18; i++) {
      const t = i / 18, y = top[1] + t * 0.55, side = i % 2 ? 1 : -1;
      const p = [top[0] + lean * t * 0.3, y, top[2]];
      const gm = place(mesh(grainGeo, grainM), { p: [p[0] + side * 0.035, p[1], p[2] + 0.015 * side], r: [0.1, 0, side * 0.45] });
      g.add(gm);
      const gm2 = place(mesh(grainGeo, grainM), { p: [p[0] + side * 0.02, p[1] + 0.02, p[2] - 0.035], r: [-0.45, 0, side * 0.3] });
      g.add(gm2);
      if (kind === 'barley' || i > 13) { // awns
        const len = kind === 'barley' ? 0.45 : 0.12;
        g.add(mesh(tube([p, [p[0] + side * 0.05, p[1] + len * 0.5, p[2]], [p[0] + side * 0.09, p[1] + len, p[2]]], 0.004, grainCol[0], grainCol[1], 6, 3, 0.3), grainM));
      }
    }
  } else { // oats & rice: branching panicle with hanging grains
    const branches = kind === 'oats' ? 7 : 9;
    for (let b = 0; b < branches; b++) {
      const t = b / branches, a = b * 2.4, y = top[1] + t * 0.45;
      const len = (kind === 'oats' ? 0.32 : 0.38) * (1 - t * 0.5);
      const droop = kind === 'rice' ? 0.35 : 0.12;
      const end = [top[0] + Math.cos(a) * len, y - droop * len * 2, top[2] + Math.sin(a) * len];
      g.add(mesh(tube([[top[0], y, top[2]], [(top[0] + end[0]) / 2, y + 0.02, (top[2] + end[2]) / 2], end], 0.006, '#b9a35a', '#d4c27f', 8, 4, 0.6), mat()));
      const n = kind === 'oats' ? 3 : 6;
      for (let k = 1; k <= n; k++) {
        const s = k / n, px = top[0] + (end[0] - top[0]) * s, py = y + (end[1] - y) * s - 0.05, pz = top[2] + (end[2] - top[2]) * s;
        g.add(place(mesh(grainGeo, grainM), { p: [px, py - (kind === 'oats' ? 0.06 : 0), pz], r: [kind === 'oats' ? Math.PI : 0.9, a, 0], s: kind === 'oats' ? 1.15 : 0.85 }));
      }
    }
    if (kind === 'rice') g.rotation.z = -bend * 0.4;
  }
  // flag leaf
  const lf = leaf({ L: 0.9, W: 0.07, shape: v => 1 - v * 0.9, fold: 0.2, curl: 0.35, base: '#a8954a', tip: '#cdb86a', rib: '#e3d49a', seed: seed + 3 });
  g.add(place(mesh(lf, leafMat()), { p: [lean * 0.1, -0.2, 0], r: [0, r() * 6, -0.5] }));
  return g;
}
const grain = kind => () => { const g = new THREE.Group(); [-0.18, 0, 0.18].forEach((x, i) => g.add(place(grainStalk(kind, 100 + i * 7), { p: [x, 0, (i - 1) * 0.1], r: [0, i * 2, (i - 1) * -0.12] }))); return g; };
function maize() {
  const g = new THREE.Group();
  const rows = 16, along = 26, kernel = new THREE.SphereGeometry(1, 10, 8).scale(0.055, 0.045, 0.05);
  const inst = new THREE.InstancedMesh(kernel, new THREE.MeshPhysicalMaterial({ roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.3 }), rows * along);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), r = rng(9), col = new THREE.Color();
  let k = 0;
  for (let j = 0; j < along; j++) {
    const t = j / (along - 1), y = -0.85 + t * 1.6, rad = 0.26 * Math.pow(Math.sin(Math.PI * Math.min(1, 0.08 + t * 0.95)), 0.35);
    for (let i = 0; i < rows; i++) {
      const a = i / rows * Math.PI * 2 + (j % 2) * Math.PI / rows;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a);
      m.compose(new THREE.Vector3(Math.cos(a) * rad, y, Math.sin(a) * rad), q, new THREE.Vector3(1, 1, 1).multiplyScalar(0.75 + rad * 1.1));
      inst.setMatrixAt(k, m);
      inst.setColorAt(k++, col.set('#f2c230').offsetHSL((r() - 0.5) * 0.02, 0, (r() - 0.5) * 0.08));
    }
  }
  g.add(inst);
  for (let i = 0; i < 5; i++) { // husk leaves peeled back
    const lf = leaf({ L: 1.3, W: 0.42, fold: -0.2, curl: 0.5, base: '#a9b86a', tip: '#d8dba0', rib: '#eef0c8', seed: 120 + i });
    g.add(place(mesh(lf, leafMat()), { p: [0, -0.88, 0], r: [0.32 + i * 0.06, i / 5 * Math.PI * 2 + 0.3, 0] }));
  }
  const rr = rng(3);
  for (let i = 0; i < 14; i++) { const a = rr() * 6.28; g.add(mesh(tube([[0, 0.75, 0], [Math.cos(a) * 0.08, 0.95, Math.sin(a) * 0.08], [Math.cos(a) * 0.2, 1.1 + rr() * 0.1, Math.sin(a) * 0.2]], 0.006, '#9c6a3a', '#c9a86a', 8, 3, 0.4), mat({ roughness: 0.8 }))); }
  g.rotation.z = 0.12;
  return g;
}
function pod({ length = 1.6, rad = 0.17, shell = ['#5f9a3a', '#86bf55'], seeds = 6, seedCol = ['#7fb64c', '#a6d66d'], seedR = 0.12, open = true, seed = 1, bumps = 0 }) {
  const g = new THREE.Group();
  const prof = []; for (let i = 0; i <= 24; i++) { const t = i / 24, y = -length / 2 + t * length; prof.push([rad * Math.pow(Math.sin(Math.PI * t), 0.55) * (bumps ? 0.78 + 0.22 * Math.abs(Math.sin(t * Math.PI * bumps)) : 1), y]); }
  for (const half of open ? [0, 1] : [0]) {
    const geo = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 32, half * Math.PI, open ? Math.PI : Math.PI * 2);
    wobble(geo, 0.008, 6, seed + half);
    gradient(geo, [[0, shell[0]], [1, shell[1]]], { mottle: 0.06, seed });
    const m = mesh(geo, mat({ side: THREE.DoubleSide, roughness: 0.5, clearcoat: 0.3 }));
    if (open) m.rotation.y = half ? 0.5 : -0.5;
    g.add(m);
  }
  for (let i = 0; i < seeds; i++) {
    const y = -length / 2 + (i + 1) / (seeds + 1) * length;
    const sg = gradient(new THREE.SphereGeometry(seedR, 24, 18), [[0, seedCol[0]], [1, seedCol[1]]], { mottle: 0.05, seed: seed + i });
    g.add(place(mesh(sg, mat({ roughness: 0.35, clearcoat: 0.5 })), { p: [0, y, 0], s: [1, 0.95, 1] }));
  }
  return g;
}
function peas() {
  const g = new THREE.Group();
  const p = pod({ length: 1.7, rad: 0.2, seeds: 7, seedR: 0.115, open: true, seed: 3 });
  p.children[1].visible = false;           // keep one half-shell
  p.children[0].rotation.y = Math.PI / 2;  // open side facing the camera
  p.rotation.z = Math.PI / 2;              // lie it down
  const wrap = new THREE.Group(); wrap.add(p);
  wrap.rotation.set(-0.55, 0, 0.1);        // tip the opening upwards
  g.add(wrap);
  return g;
}
function beans() {
  const g = new THREE.Group(), r = rng(77);
  const bean = (k) => {
    const geo = new THREE.SphereGeometry(1, 32, 22); geo.scale(0.24, 0.14, 0.13);
    const pos = geo.attributes.position; // kidney bend
    for (let i = 0; i < pos.count; i++) pos.setY(i, pos.getY(i) - Math.pow(pos.getX(i) / 0.24, 2) * 0.05 + (Math.abs(pos.getX(i)) < 0.06 && pos.getY(i) > 0 ? -0.015 : 0));
    geo.computeVertexNormals();
    const n = noise3(k), cols = new Float32Array(pos.count * 3), a = C('#efe2c4'), b = C('#9e2f36'), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) { const v = n(pos.getX(i) * 18, pos.getY(i) * 18, pos.getZ(i) * 18); c.copy(a).lerp(b, v > 0.12 ? 0.9 : v > 0 ? 0.3 : 0); cols.set([c.r, c.g, c.b], i * 3); }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    return mesh(geo, mat({ roughness: 0.25, clearcoat: 0.8, clearcoatRoughness: 0.2 }));
  };
  const spots = [[0, 0], [0.42, 0.1], [-0.42, 0.05], [0.2, -0.38], [-0.22, -0.36], [0.05, 0.4], [-0.5, -0.3], [0.5, -0.3], [0, -0.05, 0.22], [0.25, 0.2, 0.2], [-0.25, 0.15, 0.2], [0.02, 0.2, 0.42]];
  spots.forEach(([x, z, y = 0], i) => g.add(place(bean(i + 1), { p: [x * 1.3, -0.86 + y, z * 1.3], r: [0.2 * (r() - 0.5), r() * 6, 0.3 * (r() - 0.5)], s: 1.5 })));
  return g;
}
function soy() {
  const g = new THREE.Group(), r = rng(88);
  g.add(mesh(tube([[0, -1, 0], [0.05, 0, 0], [0, 1, 0.05]], 0.03, '#8a7a3a', '#a59550', 20, 6, 0.6), mat({ roughness: 0.7 })));
  for (let i = 0; i < 6; i++) {
    const y = -0.5 + i * 0.27, a = i * 2.2;
    const p = pod({ length: 0.6, rad: 0.11, shell: ['#7f8a3c', '#a5a856'], seeds: 3, seedCol: ['#d9c98a', '#efe2ad'], seedR: 0.075, open: false, seed: 20 + i, bumps: 3 });
    p.traverse(o => o.material && (o.material.sheen = 0.35, o.material.sheenColor = C('#e8e0b0'), o.material.sheenRoughness = 0.9, o.material.roughness = 0.9, o.material.clearcoat = 0));
    g.add(place(p, { p: [Math.cos(a) * 0.22, y, Math.sin(a) * 0.22], r: [0.7, a, 0] }));
  }
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * Math.PI * 2;
    for (const off of [-0.5, 0, 0.5]) g.add(place(mesh(leaf({ L: 0.45, W: 0.24, fold: 0.1, curl: 0.15, base: '#4f7a33', tip: '#6c9a45', seed: 140 + i * 3 + Math.round(off * 2) }), leafMat()), { p: [0, 0.75, 0], r: [1.0, a + off, 0] }));
  }
  return g;
}
function rapeseed() {
  const g = new THREE.Group(), r = rng(99);
  g.add(mesh(tube([[0, -1, 0], [0.04, 0, 0], [0, 0.9, 0]], 0.03, '#5f8a3a', '#7aa64e', 20, 6, 0.6), mat()));
  for (let i = 0; i < 9; i++) { // pods lower down
    const y = -0.4 + i * 0.09, a = i * 2.4;
    g.add(mesh(tube([[0, y, 0], [Math.cos(a) * 0.15, y + 0.1, Math.sin(a) * 0.15], [Math.cos(a) * 0.22, y + 0.35, Math.sin(a) * 0.22]], 0.018, '#6f9a45', '#8fb85a', 10, 6, 0.5), mat({ roughness: 0.5 })));
  }
  const petal = gradient(new THREE.CircleGeometry(0.06, 12).scale(1, 1.3, 1), [[0, '#e8b800'], [1, '#f7d21e']]);
  for (let i = 0; i < 22; i++) { // flower raceme
    const t = i / 22, a = i * 2.4, rad = 0.2 * (1 - t), y = 0.75 + t * 0.3;
    const f = new THREE.Group();
    for (let p = 0; p < 4; p++) f.add(place(mesh(petal, leafMat({ roughness: 0.55, sheen: 0.1, sheenColor: C('#fff6b0') })), { p: [Math.cos(p * Math.PI / 2) * 0.06, 0, Math.sin(p * Math.PI / 2) * 0.06], r: [-Math.PI / 2 + 0.4, 0, 0] }));
    f.children.forEach((c, p) => (c.rotation.y = -p * Math.PI / 2));
    g.add(place(f, { p: [Math.cos(a) * rad, y, Math.sin(a) * rad], r: [0.3 * (r() - 0.5), a, 0.3], s: t > 0.8 ? 0.6 : 1 }));
  }
  const lf = leaf({ L: 0.7, W: 0.3, fold: 0.15, curl: 0.3, ruffle: 0.1, base: '#4f7a3a', tip: '#6f9a55', seed: 7 });
  g.add(place(mesh(lf, leafMat()), { p: [0, -0.6, 0], r: [-0.6, 1, 0] }));
  return g;
}

const BUILDERS = { carrot, beet, potato, onion, cabbage, lettuce, spinach, tomato, pumpkin, peas, beans, soy, rapeseed, maize, wheat: grain('wheat'), barley: grain('barley'), oats: grain('oats'), rice: grain('rice') };
export const MODEL_IDS = Object.keys(BUILDERS);

/** Build a crop model, centred, sitting on y = -1, about 2 units tall. */
export function buildCrop(id) {
  const g = (BUILDERS[id] || carrot)();
  const box = new THREE.Box3().setFromObject(g), size = box.getSize(new THREE.Vector3());
  const s = 2 / Math.max(size.y, size.x * 0.9, size.z * 0.9);
  g.scale.multiplyScalar(s);
  const b2 = new THREE.Box3().setFromObject(g), c = b2.getCenter(new THREE.Vector3());
  const wrap = new THREE.Group();
  g.position.set(-c.x, -b2.min.y - 1, -c.z);
  wrap.add(g);
  return wrap;
}
