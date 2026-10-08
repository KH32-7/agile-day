'use strict';
// ── math ──────────────────────────────────────────────
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const chance = (p) => Math.random() < p;
const d2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
const dist = (ax, ay, bx, by) => Math.sqrt(d2(ax, ay, bx, by));
const angTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const approach = (v, target, step) => (v < target ? Math.min(v + step, target) : Math.max(v - step, target));
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
const Ease = {
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inCubic: (t) => t * t * t,
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outElastic: (t) => (t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1),
};
function seeded(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function weighted(list, wKey = 'w') {
  let s = 0; for (const it of list) s += it[wKey];
  let r = Math.random() * s;
  for (const it of list) { r -= it[wKey]; if (r <= 0) return it; }
  return list[list.length - 1];
}
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// ── storage (per-viewer convenience only) ─────────────
const Store = {
  get(k, def) { try { const v = localStorage.getItem('mincheop.' + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
  set(k, v) { try { localStorage.setItem('mincheop.' + k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } },
};

// ── input ─────────────────────────────────────────────
const Input = {
  keys: new Set(),
  pressed: new Set(),
  joy: { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0 },
  touchMode: false,
  dashQueued: false,
  pad: null,
  init(canvas) {
    addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
      if (['Space', 'ShiftLeft', 'ShiftRight', 'KeyK', 'KeyJ'].includes(e.code)) this.dashQueued = true;
      this.touchMode = false;
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('mousedown', (e) => { if (e.button === 2) this.dashQueued = true; });
    const j = this.joy;
    canvas.addEventListener('touchstart', (e) => {
      this.touchMode = true;
      for (const t of e.changedTouches) {
        if (!j.active && t.clientX < innerWidth * 0.62) {
          j.active = true; j.id = t.identifier; j.ox = j.x = t.clientX; j.oy = j.y = t.clientY;
        } else if (t.identifier !== j.id) {
          this.dashQueued = true;
        }
      }
      e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) if (t.identifier === j.id) {
        j.x = t.clientX; j.y = t.clientY;
        const dx = j.x - j.ox, dy = j.y - j.oy, m = Math.hypot(dx, dy), R = 70;
        if (m > R) { j.ox += (dx / m) * (m - R); j.oy += (dy / m) * (m - R); }
      }
      e.preventDefault();
    }, { passive: false });
    const end = (e) => { for (const t of e.changedTouches) if (t.identifier === j.id) { j.active = false; j.id = null; } };
    canvas.addEventListener('touchend', end);
    canvas.addEventListener('touchcancel', end);
  },
  move() {
    let x = 0, y = 0;
    const k = this.keys;
    if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
    if (k.has('KeyW') || k.has('ArrowUp')) y -= 1;
    if (k.has('KeyS') || k.has('ArrowDown')) y += 1;
    const j = this.joy;
    if (j.active) {
      const dx = j.x - j.ox, dy = j.y - j.oy, m = Math.hypot(dx, dy);
      if (m > 8) { x = dx / 70; y = dy / 70; }
    }
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (!p) continue;
      const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
      if (Math.hypot(ax, ay) > 0.2) { x = ax; y = ay; }
      const b = p.buttons;
      const dash = (b[0] && b[0].pressed) || (b[1] && b[1].pressed) || (b[5] && b[5].pressed) || (b[7] && b[7].pressed);
      if (dash && !this.padDash) this.dashQueued = true;
      this.padDash = dash;
      const start = b[9] && b[9].pressed;
      if (start && !this.padStart) this.pressed.add('Escape');
      this.padStart = start;
    }
    const m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    return { x, y };
  },
  consumeDash() { const d = this.dashQueued; this.dashQueued = false; return d; },
  hit(code) { return this.pressed.has(code); },
  endFrame() { this.pressed.clear(); },
};
