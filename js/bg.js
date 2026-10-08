'use strict';
// Arena floors, painted once per stage into an offscreen canvas.
const BG = (() => {
  const K = 1.5;
  const cache = {};
  const { w: W, h: H, pad: PAD } = ARENA;

  function mk() {
    const cv = document.createElement('canvas');
    cv.width = W * K; cv.height = H * K;
    const c = cv.getContext('2d'); c.scale(K, K);
    return { cv, c };
  }
  const R = seeded(4242);
  const rr = (a, b) => a + R() * (b - a);
  function speckle(c, n, cols, x0 = 0, y0 = 0, w = W, h = H, sz = [1, 2.5]) {
    for (let i = 0; i < n; i++) { c.fillStyle = cols[Math.floor(R() * cols.length)]; const s = rr(sz[0], sz[1]); c.fillRect(x0 + R() * w, y0 + R() * h, s, s); }
  }
  function softShadow(c, x, y, w, h, r, a = 0.18) { c.fillStyle = `rgba(16,14,36,${a})`; c.beginPath(); c.roundRect(x + 6, y + 8, w, h, r); c.fill(); }

  // ── 출근길: crosswalk intersection, 07:40 ─────────
  function commute() {
    const { cv, c } = mk();
    c.fillStyle = '#434a5a'; c.fillRect(0, 0, W, H);
    speckle(c, 9000, ['#4b5364', '#3c4252', '#505869', '#394050']);
    // road wear patches
    for (let i = 0; i < 18; i++) { c.fillStyle = `rgba(30,32,44,${rr(0.05, 0.12)})`; c.beginPath(); c.ellipse(rr(150, W - 150), rr(150, H - 150), rr(40, 140), rr(20, 70), rr(0, 3), 0, TAU); c.fill(); }
    // sidewalks along top and bottom; brick bands
    const side = (y0, h) => {
      c.fillStyle = '#c7b8a6'; c.fillRect(0, y0, W, h);
      const bw = 26, bh = 13;
      for (let y = y0; y < y0 + h; y += bh) for (let x = (Math.floor((y - y0) / bh) % 2) * -bw / 2; x < W; x += bw) {
        const t = R();
        c.fillStyle = t < 0.55 ? '#b4604e' : t < 0.85 ? '#c27a64' : '#d8b29b';
        c.fillRect(x + 1, y + 1, bw - 2, bh - 2);
      }
    };
    side(0, 128); side(H - 128, 128);
    c.fillStyle = '#d4d6dc'; c.fillRect(0, 128, W, 9); c.fillRect(0, H - 137, W, 9);
    c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(0, 137, W, 4); c.fillRect(0, H - 128, W, 3);
    // tactile paving at the crosswalk ends
    const tactile = (x, y) => { c.fillStyle = '#f0c01e'; c.fillRect(x, y, 120, 30); c.fillStyle = '#d6a510'; for (let i = 0; i < 12; i++) for (let j = 0; j < 3; j++) { c.beginPath(); c.arc(x + 6 + i * 10, y + 5 + j * 10, 2.4, 0, TAU); c.fill(); } };
    tactile(W / 2 - 60, 92); tactile(W / 2 - 60, H - 122);
    // crosswalk (vertical stripes spanning the road)
    for (let x = W / 2 - 165; x < W / 2 + 165; x += 56) {
      c.fillStyle = 'rgba(214,218,226,0.5)'; c.fillRect(x, 160, 30, H - 320);
      c.fillStyle = 'rgba(67,74,90,0.35)'; for (let k = 0; k < 6; k++) c.fillRect(x + rr(0, 24), rr(170, H - 190), rr(3, 9), rr(6, 22));
    }
    // lane lines
    c.fillStyle = '#f2c230'; c.fillRect(0, H / 2 - 7, W / 2 - 290, 4); c.fillRect(0, H / 2 + 3, W / 2 - 290, 4);
    c.fillRect(W / 2 + 290, H / 2 - 7, W / 2 - 290, 4); c.fillRect(W / 2 + 290, H / 2 + 3, W / 2 - 290, 4);
    c.fillStyle = 'rgba(232,234,238,0.8)';
    for (let x = 10; x < W / 2 - 300; x += 70) { c.fillRect(x, H / 2 - 165, 38, 4); c.fillRect(x, H / 2 + 165, 38, 4); }
    for (let x = W / 2 + 310; x < W; x += 70) { c.fillRect(x, H / 2 - 165, 38, 4); c.fillRect(x, H / 2 + 165, 38, 4); }
    // stop lines
    c.fillRect(W / 2 - 205, 160, 8, H / 2 - 170); c.fillRect(W / 2 + 197, H / 2 + 10, 8, H / 2 - 170);
    // painted road text, the way Korean intersections mark slow zones
    c.save(); c.fillStyle = 'rgba(232,234,238,0.55)'; c.font = `bold 46px ${FONT_D}`; c.textAlign = 'center';
    c.translate(220, H / 2 - 80); c.fillText('천천히', 0, 0); c.restore();
    c.save(); c.fillStyle = 'rgba(232,234,238,0.55)'; c.font = `bold 46px ${FONT_D}`; c.textAlign = 'center';
    c.translate(W - 230, H / 2 + 110); c.fillText('어린이 보호', 0, 0); c.restore();
    // manhole
    const mh = (x, y) => { c.fillStyle = '#353a47'; c.beginPath(); c.arc(x, y, 26, 0, TAU); c.fill(); c.strokeStyle = '#5a6172'; c.lineWidth = 2; for (let r = 8; r < 26; r += 6) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke(); } };
    mh(250, 330); mh(W - 260, 700);
    // street trees on the sidewalks, with ginkgo leaves
    const tree = (x, y) => {
      c.fillStyle = 'rgba(16,14,36,0.22)'; c.beginPath(); c.ellipse(x + 26, y + 22, 58, 46, 0.4, 0, TAU); c.fill();
      c.fillStyle = '#6d5a3c'; c.fillRect(x - 22, y - 22, 44, 44);
      c.fillStyle = '#4a3b26'; c.fillRect(x - 18, y - 18, 36, 36);
      const cols = ['#e8b419', '#f4c92b', '#d99b12', '#ffd84f'];
      for (let i = 0; i < 26; i++) { const a = rr(0, TAU), d = rr(0, 38); c.fillStyle = cols[i % 4]; c.beginPath(); c.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, rr(14, 22), 0, TAU); c.fill(); }
      c.fillStyle = 'rgba(255,255,255,0.18)'; c.beginPath(); c.arc(x - 14, y - 16, 16, 0, TAU); c.fill();
    };
    for (const x of [130, 450, 950, 1270]) { tree(x, 50); tree(x + 60, H - 52); }
    const leaf = (x, y, a) => { c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = pick(['#f5c518', '#e8ad12', '#ffd84f']); c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 7, -2.4, -0.7); c.closePath(); c.fill(); c.restore(); };
    for (let i = 0; i < 160; i++) leaf(rr(20, W - 20), R() < 0.6 ? rr(110, 230) * (R() < 0.5 ? 1 : 0) + (R() < 0.5 ? 0 : H - 240) : rr(150, H - 150), rr(0, TAU));
    // morning light: warm from the left, long building shadows from the right
    const g = c.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, 'rgba(255,196,120,0.22)'); g.addColorStop(0.5, 'rgba(255,196,120,0.04)'); g.addColorStop(1, 'rgba(40,40,90,0.14)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(30,28,70,0.13)';
    c.beginPath(); c.moveTo(W, 0); c.lineTo(W - 180, 0); c.lineTo(W - 520, H); c.lineTo(W, H); c.fill();
    return cv;
  }

  // ── 점심시간: food alley, 12:10 ─────────────────────
  function lunch() {
    const { cv, c } = mk();
    c.fillStyle = '#b9a687'; c.fillRect(0, 0, W, H);
    const ts = 50;
    for (let y = 0; y < H; y += ts) for (let x = (y / ts % 2) * 25 - 25; x < W; x += ts) {
      const t = R(); c.fillStyle = t < 0.4 ? '#d8c6a6' : t < 0.75 ? '#cfbb98' : t < 0.92 ? '#e0d0b3' : '#c2ad8b';
      c.fillRect(x + 1.5, y + 1.5, ts - 3, ts - 3);
    }
    speckle(c, 5000, ['rgba(120,100,70,0.25)', 'rgba(255,255,255,0.18)']);
    // drain channel down the middle
    c.fillStyle = '#8f8574'; c.fillRect(W / 2 - 14, 120, 28, H - 240);
    c.fillStyle = '#6d6556'; for (let y = 124; y < H - 124; y += 10) c.fillRect(W / 2 - 11, y, 22, 4);
    // shopfronts with striped awnings top and bottom
    const awn = ['#e2483d', '#2f9e6f', '#ef7c1c', '#1b6fd0', '#e6186c', '#f2b33d'];
    for (let i = 0; i < 7; i++) {
      const x = i * 200, col = awn[i % awn.length];
      for (const top of [true, false]) {
        const y = top ? 0 : H - 96;
        c.fillStyle = top ? '#5b4b42' : '#5b4b42'; c.fillRect(x, top ? 0 : H - 40, 200, 40);
        c.fillStyle = 'rgba(16,14,36,0.25)'; c.fillRect(x, top ? 96 : H - 116, 200, 20);
        for (let s = 0; s < 8; s++) { c.fillStyle = s % 2 ? '#fbf7ee' : col; c.fillRect(x + s * 25, top ? 36 : H - 96, 25, 60); }
        c.fillStyle = col;
        for (let s = 0; s < 8; s++) { c.beginPath(); c.arc(x + s * 25 + 12.5, top ? 96 : H - 96, 12.5, top ? 0 : Math.PI, top ? Math.PI : TAU); c.fill(); }
      }
    }
    // steel tables + red plastic stools
    const table = (x, y) => {
      c.fillStyle = 'rgba(16,14,36,0.2)'; c.beginPath(); c.ellipse(x + 6, y + 8, 32, 30, 0, 0, TAU); c.fill();
      for (let k = 0; k < 4; k++) { const a = k * TAU / 4 + 0.4; c.fillStyle = 'rgba(16,14,36,0.18)'; c.beginPath(); c.arc(x + Math.cos(a) * 46 + 4, y + Math.sin(a) * 46 + 5, 13, 0, TAU); c.fill(); c.fillStyle = '#d63a34'; c.beginPath(); c.arc(x + Math.cos(a) * 46, y + Math.sin(a) * 46, 12, 0, TAU); c.fill(); c.fillStyle = '#b92c27'; c.beginPath(); c.arc(x + Math.cos(a) * 46, y + Math.sin(a) * 46, 6, 0, TAU); c.fill(); }
      c.fillStyle = '#9da4b0'; c.beginPath(); c.arc(x, y, 30, 0, TAU); c.fill();
      c.fillStyle = '#c9ced8'; c.beginPath(); c.arc(x, y, 26, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.ellipse(x - 8, y - 9, 12, 5, -0.5, 0, TAU); c.fill();
      c.fillStyle = '#2f8c4a'; c.beginPath(); c.arc(x + 9, y - 4, 4, 0, TAU); c.fill();
      c.fillStyle = '#f3efe6'; c.beginPath(); c.arc(x - 6, y + 7, 6, 0, TAU); c.fill();
    };
    for (const [x, y] of [[110, 200], [110, 520], [110, 800], [W - 110, 260], [W - 110, 560], [W - 110, 820]]) table(x, y);
    // green soju caps and spilled bean sprouts
    for (let i = 0; i < 40; i++) { c.fillStyle = '#2f8c4a'; c.beginPath(); c.arc(rr(60, W - 60), rr(130, H - 130), 3, 0, TAU); c.fill(); }
    c.strokeStyle = '#f4ecc8'; c.lineWidth = 1.6; c.lineCap = 'round';
    for (let i = 0; i < 50; i++) { const x = rr(200, W - 200), y = rr(150, H - 150), a = rr(0, TAU); c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(a) * 5, y + Math.sin(a) * 5 - 3, x + Math.cos(a) * 9, y + Math.sin(a) * 9); c.stroke(); }
    // puddle
    c.fillStyle = 'rgba(150,190,220,0.35)'; c.beginPath(); c.ellipse(420, 640, 70, 26, 0.2, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.3)'; c.beginPath(); c.ellipse(400, 632, 26, 6, 0.2, 0, TAU); c.fill();
    const g = c.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, 800);
    g.addColorStop(0, 'rgba(255,240,200,0.16)'); g.addColorStop(1, 'rgba(90,50,20,0.16)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    return cv;
  }

  // ── 오후 업무 / 야근: open-plan office ─────────────
  function office(night) {
    const { cv, c } = mk();
    const A = night ? '#262c4a' : '#8b98ae', B = night ? '#2c3354' : '#7f8ea6';
    const ts = 64;
    for (let y = 0; y < H; y += ts) for (let x = 0; x < W; x += ts) {
      const alt = ((x + y) / ts) % 2;
      c.fillStyle = alt ? A : B; c.fillRect(x, y, ts, ts);
      c.strokeStyle = night ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.08)'; c.lineWidth = 1;
      for (let k = 6; k < ts; k += 7) { c.beginPath(); if (alt) { c.moveTo(x + k, y + 2); c.lineTo(x + k, y + ts - 2); } else { c.moveTo(x + 2, y + k); c.lineTo(x + ts - 2, y + k); } c.stroke(); }
    }
    speckle(c, 4000, night ? ['rgba(0,0,0,0.25)', 'rgba(120,140,255,0.06)'] : ['rgba(0,0,0,0.1)', 'rgba(255,255,255,0.1)']);
    const desk = night ? '#3a4366' : '#f2f3f6', deskS = night ? '#2f3655' : '#d9dce4';
    const monOn = night ? '#79d6ff' : '#3a4a6a';
    const glows = [];
    const deskUnit = (x, y, flip) => {
      softShadow(c, x, y, 120, 58, 4, night ? 0.35 : 0.16);
      c.fillStyle = desk; c.beginPath(); c.roundRect(x, y, 120, 58, 4); c.fill();
      c.fillStyle = deskS; c.fillRect(x, flip ? y : y + 52, 120, 6);
      const my = flip ? y + 40 : y + 6;
      c.fillStyle = '#20232e'; c.fillRect(x + 30, my, 60, 10);
      c.fillStyle = monOn; c.fillRect(x + 32, my + 2, 56, 6);
      if (night && R() < 0.75) glows.push([x + 60, my + 5]);
      c.fillStyle = night ? '#4b5478' : '#c9ccd6'; c.fillRect(x + 36, flip ? y + 22 : y + 26, 46, 10);
      c.fillStyle = night ? '#5b6590' : '#ffffff'; c.beginPath(); c.arc(x + 98, flip ? y + 28 : y + 30, 7, 0, TAU); c.fill();
      c.fillStyle = night ? '#d34b4b' : '#7b4a2a'; c.beginPath(); c.arc(x + 98, flip ? y + 28 : y + 30, 4.5, 0, TAU); c.fill();
      for (let k = 0; k < 3; k++) { c.fillStyle = night ? '#6a74a0' : '#ffffff'; c.save(); c.translate(x + 14, y + 29); c.rotate(rr(-0.3, 0.3)); c.fillRect(-9, -11, 18, 22); c.restore(); }
      // chair
      const cy = flip ? y - 22 : y + 80;
      c.fillStyle = 'rgba(16,14,36,0.25)'; c.beginPath(); c.arc(x + 64, cy + 4, 20, 0, TAU); c.fill();
      c.fillStyle = night ? '#141626' : '#2d3040'; c.beginPath(); c.arc(x + 60, cy, 18, 0, TAU); c.fill();
      c.fillStyle = night ? '#1e2136' : '#3d4155'; c.beginPath(); c.roundRect(x + 42, flip ? cy - 22 : cy + 10, 36, 12, 5); c.fill();
    };
    for (let i = 0; i < 9; i++) { deskUnit(30 + i * 150, 6, false); deskUnit(30 + i * 150, H - 64, true); }
    // plants and a water cooler on the sides
    const plant = (x, y) => {
      c.fillStyle = 'rgba(16,14,36,0.25)'; c.beginPath(); c.ellipse(x + 8, y + 10, 30, 26, 0, 0, TAU); c.fill();
      c.fillStyle = night ? '#5a4a3a' : '#c47d4a'; c.beginPath(); c.arc(x, y, 20, 0, TAU); c.fill();
      const cols = night ? ['#1f4a3a', '#275a45', '#18402f'] : ['#3f9a52', '#4cb262', '#2f8443'];
      for (let k = 0; k < 9; k++) { const a = k * TAU / 9; c.fillStyle = cols[k % 3]; c.beginPath(); c.ellipse(x + Math.cos(a) * 13, y + Math.sin(a) * 13, 14, 7, a, 0, TAU); c.fill(); }
    };
    for (const y of [220, 520, 800]) { plant(36, y); plant(W - 36, y + 40); }
    c.fillStyle = 'rgba(16,14,36,0.25)'; c.beginPath(); c.arc(42, 380, 24, 0, TAU); c.fill();
    c.fillStyle = '#e8ecf3'; c.beginPath(); c.arc(36, 372, 22, 0, TAU); c.fill();
    c.fillStyle = '#5fb6ea'; c.beginPath(); c.arc(36, 372, 13, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.arc(32, 368, 5, 0, TAU); c.fill();
    // scattered papers
    for (let i = 0; i < 26; i++) { c.save(); c.translate(rr(120, W - 120), rr(130, H - 130)); c.rotate(rr(0, TAU)); c.fillStyle = night ? 'rgba(160,170,220,0.4)' : 'rgba(255,255,255,0.85)'; c.fillRect(-10, -13, 20, 26); c.fillStyle = night ? 'rgba(90,100,150,0.4)' : 'rgba(140,150,170,0.6)'; for (let k = 0; k < 4; k++) c.fillRect(-7, -9 + k * 5, 14, 1.5); c.restore(); }
    if (night) {
      // cup noodles and energy drink cans
      for (let i = 0; i < 14; i++) { const x = rr(150, W - 150), y = rr(140, H - 140); if (R() < 0.5) { c.fillStyle = '#f2f2f5'; c.beginPath(); c.arc(x, y, 9, 0, TAU); c.fill(); c.fillStyle = '#d63a34'; c.beginPath(); c.arc(x, y, 6, 0, TAU); c.fill(); } else { c.fillStyle = '#23c4a0'; c.beginPath(); c.arc(x, y, 5, 0, TAU); c.fill(); c.fillStyle = '#c8d0dc'; c.beginPath(); c.arc(x, y, 3, 0, TAU); c.fill(); } }
      for (const [x, y] of glows) { const g = c.createRadialGradient(x, y, 4, x, y, 90); g.addColorStop(0, 'rgba(120,210,255,0.28)'); g.addColorStop(1, 'rgba(120,210,255,0)'); c.fillStyle = g; c.fillRect(x - 90, y - 90, 180, 180); }
    } else {
      // ceiling light reflections
      for (let y = 220; y < H - 160; y += 260) for (let x = 200; x < W - 100; x += 300) { c.fillStyle = 'rgba(255,255,255,0.07)'; c.fillRect(x, y, 140, 34); }
    }
    if (night) BG.glows = glows;
    return cv;
  }

  return {
    K,
    glows: [],
    get(i) {
      if (!cache[i]) cache[i] = [commute, lunch, () => office(false), () => office(true)][i]();
      return cache[i];
    },
  };
})();
