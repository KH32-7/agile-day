'use strict';
const Render = (() => {
  const W = World;
  let cv, ctx, dpr = 1, vw = 0, vh = 0;
  let dark = null, dctx = null;

  function init(canvas) {
    cv = canvas; ctx = cv.getContext('2d');
    dark = document.createElement('canvas'); dctx = dark.getContext('2d');
    resize();
    addEventListener('resize', resize);
  }
  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    vw = innerWidth; vh = innerHeight;
    cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr);
    dark.width = Math.ceil(vw / 2); dark.height = Math.ceil(vh / 2);
  }

  function camera(dt, follow = true) {
    const cam = W.cam, p = W.p;
    const base = clamp(Math.min(vw / (vw < 700 ? 500 : 740), vh / 540), 0.6, 1.8);
    cam.punch = damp(cam.punch, 0, 6, dt);
    // never show past the arena edges, even on ultrawide screens
    cam.zoom = Math.max(base, vw / ARENA.w, vh / ARENA.h) * (1 + cam.punch);
    cam.vw = vw / cam.zoom; cam.vh = vh / cam.zoom;
    if (follow && p) {
      // on the title screen the hero runs in the right half, clear of the logo
      const off = W.demo && vw > 640 ? -cam.vw * 0.2 : W.demo ? 0 : 0;
      const offY = W.demo && vw <= 640 ? cam.vh * 0.18 : 0;
      const tx = p.x + p.vx * 0.12 + off, ty = p.y - 20 + p.vy * 0.12 + offY;
      cam.x = damp(cam.x, tx, 6, dt); cam.y = damp(cam.y, ty, 6, dt);
    }
    const hw = cam.vw / 2, hh = cam.vh / 2;
    cam.x = cam.vw >= ARENA.w ? ARENA.w / 2 : clamp(cam.x, hw, ARENA.w - hw);
    cam.y = cam.vh >= ARENA.h ? ARENA.h / 2 : clamp(cam.y, hh, ARENA.h - hh);
    cam.shake = damp(cam.shake, 0, 9, dt);
  }
  const toScreen = (x, y) => { const c = W.cam; return [(x - c.x) * c.zoom + vw / 2, (y - c.y) * c.zoom + vh / 2]; };

  function draw(realDt, opts = {}) {
    const c = ctx, cam = W.cam, T = W.T;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#141826'; c.fillRect(0, 0, cv.width, cv.height);
    const sx = (Math.random() - 0.5) * cam.shake * 2, sy = (Math.random() - 0.5) * cam.shake * 2;
    c.setTransform(dpr * cam.zoom, 0, 0, dpr * cam.zoom, dpr * (vw / 2 - (cam.x + sx) * cam.zoom), dpr * (vh / 2 - (cam.y + sy) * cam.zoom));
    // floor
    const bg = BG.get(W.stage);
    c.imageSmoothingEnabled = true;
    c.drawImage(bg, 0, 0, ARENA.w, ARENA.h);
    // arena edge
    c.strokeStyle = 'rgba(10,12,30,0.35)'; c.lineWidth = 6; c.setLineDash([18, 14]);
    c.strokeRect(W.B.x0 - 14, W.B.y0 - 14, W.B.x1 - W.B.x0 + 28, W.B.y1 - W.B.y0 + 28); c.setLineDash([]);

    drawZones(c, T);
    drawSpawns(c, T);
    drawAimLines(c, T);
    for (const k of W.pickups) { if (k.type === 'xp') Art.coffee(c, k.x, k.y, k.big, T); else Art.gimbap(c, k.x, k.y, T); }
    const p = W.p;
    if (p && p.s.auraR > 0) drawAura(c, p, T);

    // y-sorted bodies
    const list = W.enemies.slice();
    if (W.boss) list.push(W.boss);
    if (p) list.push(p);
    list.sort((a, b) => a.y - b.y);
    for (const e of list) {
      if (e === p) { drawPlayer(c, p, T); continue; }
      c.globalAlpha = e.alpha != null ? e.alpha : 1;
      if (e.boss && e.enter > 0) c.globalAlpha *= 1 - e.enter;
      Art[e.art](c, e, T);
      if (e.flash > 0) { const a = c.globalAlpha; c.globalAlpha = a * 0.7; TINT = '#ffffff'; Art[e.art](c, e, T); TINT = null; c.globalAlpha = a; }
      if (e.slowT > 0 && !e.boss) { c.fillStyle = 'rgba(120,200,255,0.25)'; c.beginPath(); c.ellipse(e.x, e.y - e.r, e.r * 1.1, e.r * 1.1, 0, 0, TAU); c.fill(); }
      c.globalAlpha = 1;
    }
    drawBeams(c, T);
    drawEnemyBullets(c, T);
    drawShots(c, T);
    drawParts(c, T);
    drawTexts(c);

    // screen space
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (STAGES[W.stage] && STAGES[W.stage].dark) drawDarkness(c, T);
    drawScreenFx(c, realDt, T);
    if (Input.joy.active && !opts.noJoy) {
      const j = Input.joy;
      c.fillStyle = 'rgba(255,255,255,0.12)'; c.beginPath(); c.arc(j.ox, j.oy, 70, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 2; c.stroke();
      const dx = j.x - j.ox, dy = j.y - j.oy, m = Math.min(70, Math.hypot(dx, dy)), a = Math.atan2(dy, dx);
      c.fillStyle = 'rgba(255,255,255,0.75)'; c.beginPath(); c.arc(j.ox + Math.cos(a) * m, j.oy + Math.sin(a) * m, 28, 0, TAU); c.fill();
    }
  }

  function drawPlayer(c, p, T) {
    for (const g of p.ghosts) {
      c.globalAlpha = (g.life / 0.22) * 0.45; TINT = '#00c86a';
      Art.player(c, Object.assign({}, g, { squash: 0, blink: 1, hurtT: 0, cheer: 0 }), T);
    }
    TINT = null; c.globalAlpha = 1;
    if (p.iT > 0 && p.dashInv <= 0 && Math.floor(T * 18) % 2 === 0) c.globalAlpha = 0.35;
    if (p.hurtT > 0.2) TINT = '#ffffff';
    Art.player(c, p, T);
    TINT = null; c.globalAlpha = 1;
    if (p.shieldNow > 0) {
      c.strokeStyle = 'rgba(127,211,255,0.7)'; c.lineWidth = 2;
      c.beginPath(); c.ellipse(p.x, p.y - 20, 22, 28, 0, 0, TAU); c.stroke();
      c.fillStyle = 'rgba(127,211,255,0.12)'; c.fill();
    }
    if (p.slowT > 0) { c.fillStyle = 'rgba(255,216,74,0.5)'; for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(p.x - 8 + i * 8, p.y + 1, 4, 2, 0, 0, TAU); c.fill(); } }
    // dash charge pips under the feet
    if (!W.demo && p.s.dashCharges > 0) {
      const n = p.s.dashCharges;
      for (let i = 0; i < n; i++) {
        const x = p.x + (i - (n - 1) / 2) * 9, y = p.y + 9;
        c.fillStyle = 'rgba(10,14,30,0.45)'; c.beginPath(); c.arc(x, y, 3.4, 0, TAU); c.fill();
        if (i < p.charges) { c.fillStyle = '#00e07a'; c.beginPath(); c.arc(x, y, 2.6, 0, TAU); c.fill(); }
        else if (i === p.charges) { c.strokeStyle = '#00e07a'; c.lineWidth = 1.4; c.beginPath(); c.arc(x, y, 2.6, -Math.PI / 2, -Math.PI / 2 + TAU * (p.chargeT / p.s.dashCd)); c.stroke(); }
      }
    }
  }

  function drawAura(c, p, T) {
    const r = p.s.auraR;
    const g = c.createRadialGradient(p.x, p.y - 12, r * 0.2, p.x, p.y - 12, r);
    g.addColorStop(0, 'rgba(255,170,90,0)'); g.addColorStop(0.75, 'rgba(255,150,80,0.1)'); g.addColorStop(1, 'rgba(255,150,80,0.22)');
    c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y - 12, r, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(255,190,120,0.55)'; c.lineWidth = 2; c.setLineDash([6, 10]); c.lineDashOffset = -T * 30;
    c.beginPath(); c.arc(p.x, p.y - 12, r, 0, TAU); c.stroke(); c.setLineDash([]);
  }

  function drawZones(c, T) {
    for (const z of W.zones) {
      if (z.kind === 'circle') {
        if (!z.done) {
          const k = clamp(z.t / Math.max(z.delay, 0.001), 0, 1);
          c.fillStyle = hexA(z.col, 0.12 + k * 0.1); c.beginPath(); c.arc(z.x, z.y, z.r, 0, TAU); c.fill();
          c.fillStyle = hexA(z.col, 0.28); c.beginPath(); c.arc(z.x, z.y, z.r * k, 0, TAU); c.fill();
          c.strokeStyle = hexA(z.col, 0.85); c.lineWidth = 2.5; c.setLineDash([10, 6]); c.lineDashOffset = -T * 40;
          c.beginPath(); c.arc(z.x, z.y, z.r, 0, TAU); c.stroke(); c.setLineDash([]);
          if (z.label) { c.font = `14px ${FONT_D}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = hexA(z.col, 0.9); c.fillText(z.label, z.x, z.y); }
        } else {
          c.fillStyle = `rgba(255,255,255,${0.5 * (1 - z.boomT / 0.15)})`; c.beginPath(); c.arc(z.x, z.y, z.r, 0, TAU); c.fill();
        }
      } else if (z.kind === 'ring') {
        const a = 1 - z.r / z.maxR;
        c.strokeStyle = hexA(z.col, 0.25 * a + 0.1); c.lineWidth = z.width + 8; c.beginPath(); c.arc(z.x, z.y, z.r, 0, TAU); c.stroke();
        c.strokeStyle = hexA(z.col, 0.85 * a + 0.15); c.lineWidth = z.width * 0.55; c.beginPath(); c.arc(z.x, z.y, z.r, 0, TAU); c.stroke();
        c.strokeStyle = `rgba(255,255,255,${0.7 * a})`; c.lineWidth = 2; c.beginPath(); c.arc(z.x, z.y, z.r, 0, TAU); c.stroke();
      }
    }
  }

  function drawSpawns(c, T) {
    for (const s of W.spawns) {
      const k = 1 - s.t / s.max;
      c.strokeStyle = `rgba(255,255,255,${0.3 + k * 0.5})`; c.lineWidth = 2;
      c.beginPath(); c.ellipse(s.x, s.y, 18 * (1.4 - k * 0.6), 7 * (1.4 - k * 0.6), 0, 0, TAU); c.stroke();
      c.fillStyle = `rgba(255,255,255,${k * 0.25})`; c.fill();
    }
  }

  function drawAimLines(c, T) {
    const one = (x, y, a, len, w) => {
      c.save(); c.translate(x, y); c.rotate(a);
      const g = c.createLinearGradient(0, 0, len, 0); g.addColorStop(0, 'rgba(255,74,90,0.45)'); g.addColorStop(1, 'rgba(255,74,90,0)');
      c.fillStyle = g; c.fillRect(0, -w / 2, len, w);
      c.strokeStyle = 'rgba(255,90,100,0.8)'; c.lineWidth = 2; c.setLineDash([12, 8]); c.lineDashOffset = -T * 60;
      c.beginPath(); c.moveTo(0, 0); c.lineTo(len, 0); c.stroke(); c.setLineDash([]);
      c.restore();
    };
    for (const e of W.enemies) if (e.state === 'aim') one(e.x, e.y - e.r * 0.5, e.aim, 360, e.r * 1.6);
    const b = W.boss; if (b && b.state === 'aim') one(b.x, b.y - b.r * 0.5, b.aim, 900, b.r * 1.6);
  }

  function drawBeams(c, T) {
    for (const bm of W.beams) {
      c.save(); c.translate(bm.x, bm.y); c.rotate(bm.ang);
      if (bm.t < bm.warn) {
        const k = bm.t / bm.warn;
        c.strokeStyle = `rgba(255,70,110,${0.3 + 0.5 * k})`; c.lineWidth = 1.5 + k * 2; c.setLineDash([16, 10]); c.lineDashOffset = -T * 80;
        c.beginPath(); c.moveTo(0, 0); c.lineTo(bm.len, 0); c.stroke(); c.setLineDash([]);
        c.fillStyle = `rgba(255,70,110,${0.08 + 0.1 * k})`; c.fillRect(0, -bm.w / 2, bm.len, bm.w);
      } else {
        const fl = 1 + Math.sin(T * 50) * 0.08, w = bm.w * fl;
        c.fillStyle = 'rgba(120,170,255,0.25)'; c.fillRect(0, -w, bm.len, w * 2);
        c.fillStyle = 'rgba(160,210,255,0.7)'; c.fillRect(0, -w / 2, bm.len, w);
        c.fillStyle = '#ffffff'; c.fillRect(0, -w / 5, bm.len, w / 2.5);
        c.fillStyle = 'rgba(255,255,255,0.9)'; c.beginPath(); c.arc(0, 0, w * 0.9, 0, TAU); c.fill();
      }
      c.restore();
    }
  }

  function drawEnemyBullets(c, T) {
    for (const b of W.ebul) {
      if (b.lob) {
        c.fillStyle = 'rgba(20,18,40,0.25)'; c.beginPath(); c.ellipse(b.x, b.y, 9, 4, 0, 0, TAU); c.fill();
        c.save(); c.translate(b.x, b.y - b.h); c.rotate(b.lt * 8);
        Art.ell(c, 0, 0, 9, 11, '#fbf7ee'); Art.circ(c, 0, 1, 5, '#f5a623');
        c.restore(); continue;
      }
      c.save(); c.translate(b.x, b.y);
      switch (b.type) {
        case 'note': {
          c.fillStyle = 'rgba(255,176,46,0.3)'; c.beginPath(); c.arc(0, 0, 10, 0, TAU); c.fill();
          c.rotate(Math.sin(b.rot) * 0.3);
          Art.ell(c, -2, 3, 4.6, 3.6, '#ffb02e', -0.4); Art.line(c, 2, 2, 2, -8, 2, '#ffb02e'); Art.line(c, 2, -8, 6, -5, 2, '#ffb02e');
          break;
        }
        case 'paper': case 'doc': {
          const big = b.type === 'doc';
          c.rotate(b.rot * (big ? 0.6 : 1.4));
          const w = big ? 16 : 11, h = big ? 20 : 14;
          c.fillStyle = 'rgba(20,18,40,0.25)'; c.fillRect(-w / 2 + 2, -h / 2 + 2, w, h);
          c.fillStyle = big ? '#ffffff' : '#f7f7fb'; c.fillRect(-w / 2, -h / 2, w, h);
          c.fillStyle = big ? '#e5463b' : '#9aa3b8'; c.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, 2);
          c.fillStyle = '#b9bfcf'; for (let i = 0; i < 3; i++) c.fillRect(-w / 2 + 2, -h / 2 + 6 + i * 4, w - 4, 1.4);
          if (big) { c.strokeStyle = '#e5463b'; c.lineWidth = 1.4; c.beginPath(); c.arc(w / 2 - 5, h / 2 - 5, 3, 0, TAU); c.stroke(); }
          break;
        }
        case 'noodle': {
          c.rotate(Math.atan2(b.vy, b.vx));
          c.strokeStyle = 'rgba(247,215,122,0.35)'; c.lineWidth = 8; c.lineCap = 'round';
          c.beginPath(); for (let i = 0; i < 6; i++) c.lineTo(-i * 3, Math.sin(i * 1.4 + b.rot) * 3); c.stroke();
          c.strokeStyle = '#f7d77a'; c.lineWidth = 3.6;
          c.beginPath(); for (let i = 0; i < 6; i++) c.lineTo(-i * 3, Math.sin(i * 1.4 + b.rot) * 3); c.stroke();
          break;
        }
        case 'q': {
          c.fillStyle = 'rgba(201,192,242,0.35)'; c.beginPath(); c.arc(0, 0, 11, 0, TAU); c.fill();
          c.fillStyle = '#efeaff'; c.beginPath(); c.arc(0, 0, 7.5, 0, TAU); c.fill();
          c.fillStyle = '#4b3f8f'; c.font = `12px ${FONT_D}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', 0, 1);
          break;
        }
        default: {
          const col = b.col || '#ff5a7a';
          c.fillStyle = hexA(col, 0.3); c.beginPath(); c.arc(0, 0, b.r * 1.9, 0, TAU); c.fill();
          c.fillStyle = col; c.beginPath(); c.arc(0, 0, b.r * 1.15, 0, TAU); c.fill();
          c.fillStyle = '#ffffff'; c.beginPath(); c.arc(0, 0, b.r * 0.6, 0, TAU); c.fill();
        }
      }
      c.restore();
    }
  }

  function drawShots(c, T) {
    for (const s of W.shots) {
      const sp = s.spr, sc = (s.r / (s.big ? 20 : 9)) * (s.big ? 1 : 0.95);
      const pop = Math.min(1, s.t * 10);
      const w = sp.w * sc * pop, h = sp.h * sc * pop;
      c.save(); c.translate(s.x, s.y); c.rotate(Math.sin(s.t * 14 + s.x) * 0.08);
      c.drawImage(sp.cv, -w / 2, -h / 2, w, h);
      c.restore();
    }
  }

  function drawParts(c, T) {
    for (const q of W.parts) {
      const k = q.life / q.max;
      c.globalAlpha = clamp(k * 1.4, 0, 1);
      switch (q.type) {
        case 'ring':
          c.strokeStyle = q.col; c.lineWidth = (q.w || 3) * k; c.beginPath(); c.arc(q.x, q.y, q.size * (1 - k * 0.7), 0, TAU); c.stroke(); break;
        case 'puff':
          c.fillStyle = q.col; c.beginPath(); c.arc(q.x, q.y, q.size * (1.6 - k * 0.6), 0, TAU); c.fill(); break;
        case 'spark':
          c.strokeStyle = q.col; c.lineWidth = q.size * 0.6; c.lineCap = 'round';
          c.beginPath(); c.moveTo(q.x, q.y); c.lineTo(q.x - q.vx * 0.03, q.y - q.vy * 0.03); c.stroke(); break;
        case 'paper':
          c.save(); c.translate(q.x, q.y); c.rotate(q.rot); c.fillStyle = q.col; c.fillRect(-q.size / 2, -q.size * 0.65, q.size, q.size * 1.3); c.restore(); break;
        case 'feather':
          c.save(); c.translate(q.x, q.y); c.rotate(q.rot); c.fillStyle = q.col; c.beginPath(); c.ellipse(0, 0, q.size, q.size * 0.35, 0, 0, TAU); c.fill(); c.restore(); break;
        case 'bolt': {
          c.strokeStyle = q.col; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(q.x, q.y);
          for (let i = 1; i <= 6; i++) { const t = i / 6; c.lineTo(lerp(q.x, q.x2, t) + (i < 6 ? rand(-10, 10) : 0), lerp(q.y, q.y2, t) + (i < 6 ? rand(-10, 10) : 0)); }
          c.stroke(); break;
        }
        default:
          c.fillStyle = q.col; c.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size);
      }
    }
    c.globalAlpha = 1;
  }

  function drawTexts(c) {
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    for (const t of W.texts) {
      const age = 1 - t.life / t.max;
      const sc = age < 0.15 ? lerp(t.pop || 1, 1, Ease.outCubic(age / 0.15)) * (t.pop > 1 ? 1 : 1) : 1;
      c.globalAlpha = clamp(t.life / (t.max * 0.35), 0, 1);
      c.font = `${Math.round(t.size * (age < 0.15 ? (t.pop > 1 ? sc : 1 + (1 - age / 0.15) * 0.4) : 1))}px ${FONT_D}`;
      if (t.stroke !== undefined) { c.strokeStyle = t.stroke; c.lineWidth = Math.max(3, t.size * 0.22); c.strokeText(t.txt, t.x, t.y); }
      else { c.strokeStyle = 'rgba(20,20,40,0.6)'; c.lineWidth = 3; c.strokeText(t.txt, t.x, t.y); }
      c.fillStyle = t.col; c.fillText(t.txt, t.x, t.y);
    }
    c.globalAlpha = 1;
  }

  function drawDarkness(c, T) {
    const d = dctx, cam = W.cam, s = 0.5;
    d.globalCompositeOperation = 'source-over';
    d.clearRect(0, 0, dark.width, dark.height);
    d.fillStyle = 'rgba(6,8,30,0.74)'; d.fillRect(0, 0, dark.width, dark.height);
    d.globalCompositeOperation = 'destination-out';
    const hole = (x, y, r, a = 1) => {
      const [sx, sy] = toScreen(x, y); const rr = r * cam.zoom * s;
      const g = d.createRadialGradient(sx * s, sy * s, 0, sx * s, sy * s, rr);
      g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(0.55, `rgba(0,0,0,${a * 0.7})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = g; d.beginPath(); d.arc(sx * s, sy * s, rr, 0, TAU); d.fill();
    };
    const p = W.p;
    if (p) hole(p.x, p.y - 16, 250 + Math.sin(T * 3) * 6);
    for (const [x, y] of BG.glows) hole(x, y, 110, 0.7);
    for (const sh of W.shots) hole(sh.x, sh.y, 40, 0.6);
    for (const e of W.enemies) if (e.art === 'wisp') hole(e.x, e.y - 16, 46, 0.5);
    if (W.boss) hole(W.boss.x, W.boss.y - W.boss.r, 200, 0.8);
    for (const bm of W.beams) if (bm.t > bm.warn) for (let k = 0; k < 8; k++) hole(bm.x + Math.cos(bm.ang) * k * 120, bm.y + Math.sin(bm.ang) * k * 120, 80, 0.7);
    for (const z of W.zones) if (z.kind === 'circle') hole(z.x, z.y, z.r * 1.2, 0.55);
    d.globalCompositeOperation = 'source-over';
    c.imageSmoothingEnabled = true;
    c.drawImage(dark, 0, 0, vw, vh);
  }

  function drawScreenFx(c, dt, T) {
    W.flashR = Math.max(0, W.flashR - dt * 1.8);
    W.flashG = Math.max(0, W.flashG - dt * 1.2);
    const edge = (col, a) => {
      const g = c.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.35, vw / 2, vh / 2, Math.max(vw, vh) * 0.75);
      g.addColorStop(0, hexA(col, 0)); g.addColorStop(1, hexA(col, a));
      c.fillStyle = g; c.fillRect(0, 0, vw, vh);
    };
    if (W.flashR > 0) edge('#ff2a3a', W.flashR * 0.8);
    if (W.flashG > 0) edge('#00e07a', W.flashG * 0.7);
    const p = W.p;
    if (p && !W.demo && p.hp <= 3 && p.hp > 0) edge('#ff2a3a', 0.18 + Math.sin(T * 6) * 0.08);
    if (W.slowT > 0) {
      c.strokeStyle = 'rgba(200,255,225,0.18)'; c.lineWidth = 2;
      const [px, py] = p ? toScreen(p.x, p.y - 16) : [vw / 2, vh / 2];
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * TAU + T * 0.5, r0 = Math.max(vw, vh) * 0.32, r1 = Math.max(vw, vh) * 0.7;
        c.beginPath(); c.moveTo(px + Math.cos(a) * r0, py + Math.sin(a) * r0); c.lineTo(px + Math.cos(a) * r1, py + Math.sin(a) * r1); c.stroke();
      }
    }
  }

  const hexCache = {};
  function hexA(hex, a) {
    let rgb = hexCache[hex];
    if (!rgb) { const h = hex.replace('#', ''); rgb = hexCache[hex] = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
    return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
  }

  return { init, draw, camera, resize, get vw() { return vw; }, get vh() { return vh; }, hexA };
})();
