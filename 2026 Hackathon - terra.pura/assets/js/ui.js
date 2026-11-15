// terra.pura · NASA Space Apps Challenge 2026. Code generated with Super Intelligence (SI): Claude by Anthropic;
// designed, reviewed and tested by the terra.pura team.
// terra.pura — shared UI motion helpers (no dependencies).
export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Split an element's text into animated words: <h1 data-words>…</h1>
export function splitWords(root = document) {
  root.querySelectorAll('[data-words]').forEach(el => {
    const base = Number(el.dataset.delay || 0);
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    el.classList.add('words');
    el.setAttribute('aria-label', words.join(' '));
    words.forEach((w, i) => {
      const s = document.createElement('span');
      s.className = 'w';
      s.setAttribute('aria-hidden', 'true');
      s.style.setProperty('--i', i);
      s.style.setProperty('--d', base + 'ms');
      s.textContent = w;
      el.append(s, ' ');
    });
  });
}

// Give each child of [data-stagger] an index for the .rise animation.
export function stagger(root = document) {
  root.querySelectorAll('[data-stagger]').forEach(group => {
    const base = Number(group.dataset.stagger || 0);
    [...group.children].forEach((c, i) => {
      c.classList.add('rise');
      c.style.setProperty('--i', i);
      c.style.setProperty('--d', base + 'ms');
    });
  });
}

// Animate a number from its current value to `to`.
export function countTo(el, to, { decimals = 0, prefix = '', suffix = '', duration = 1100, format } = {}) {
  const from = Number(el.dataset.v || 0);
  el.dataset.v = to;
  const fmt = format || (v => prefix + v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix);
  if (reduced || !isFinite(to)) { el.textContent = fmt(to); return; }
  let t0 = null;
  const tick = now => {
    if (t0 === null) t0 = now; // start the clock on the first frame
    const p = Math.max(0, Math.min(1, (now - t0) / duration));
    const e = 1 - Math.pow(1 - p, 4);
    el.textContent = fmt(from + (to - from) * e);
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// Fallback page fade for browsers without cross-document view transitions.
export function pageTransitions() {
  if ('onpagereveal' in window) return; // native view transitions handle it
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a || a.target || e.metaKey || e.ctrlKey || a.origin !== location.origin || a.hash && a.pathname === location.pathname) return;
    e.preventDefault();
    document.body.style.transition = 'opacity .28s ease';
    document.body.style.opacity = '0';
    setTimeout(() => (location.href = a.href), reduced ? 0 : 260);
  });
  addEventListener('pageshow', () => (document.body.style.opacity = '1'));
}

export function initUI() {
  // the logo takes onboarded farmers to their dashboard, everyone else to the homepage
  const s = store.get();
  const home = s.onboardedAt && s.land?.length >= 3 ? 'dash.html' : 'index.html';
  document.querySelectorAll('a.brand').forEach(a => (a.href = home));
  splitWords();
  stagger();
  pageTransitions();
}

export const icons = {
  arrow: '<svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>',
  back: '<svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>',
  pushpin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>',
  plug: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M15.295 19.562 16 22"/><path d="m17 16 3.758 2.098"/><path d="m19 12.5 3.026-.598"/><path d="M7.61 6.3a3 3 0 0 0-3.92 1.3l-1.38 2.79a3 3 0 0 0 1.3 3.91l6.89 3.597a1 1 0 0 0 1.342-.447l3.106-6.211a1 1 0 0 0-.447-1.341z"/><path d="M8 9V2"/></svg>',
  glass: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M5.116 4.104A1 1 0 0 1 6.11 3h11.78a1 1 0 0 1 .994 1.105L17.19 20.21A2 2 0 0 1 15.2 22H8.8a2 2 0 0 1-2-1.79z"/><path d="M6 12a5 5 0 0 1 6 0 5 5 0 0 0 6 0"/></svg>',
  toilet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M7 12h13a1 1 0 0 1 1 1 5 5 0 0 1-5 5h-.598a.5.5 0 0 0-.424.765l1.544 2.47a.5.5 0 0 1-.424.765H5.402a.5.5 0 0 1-.424-.765L7 18"/><path d="M8 18a5 5 0 0 1-5-5V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="#e07856" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="#cfe0c9" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
};

// Shared app state (persisted locally in the visitor's browser only).
const KEY = 'terrapura.v1';
export const store = {
  get() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } },
  set(patch) { const s = { ...store.get(), ...patch }; try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} return s; },
};
