'use strict';
// The simulation: player, enemies, projectiles, hazards, pickups, particles.
const World = (() => {
  const PR = 12; // player hit radius
  const B = { x0: ARENA.pad, y0: ARENA.pad, x1: ARENA.w - ARENA.pad, y1: ARENA.h - ARENA.pad };
  const W = {
    T: 0, p: null, enemies: [], shots: [], ebul: [], zones: [], beams: [], pickups: [], parts: [], texts: [], spawns: [],
    boss: null, stage: 0, demo: false, hpMul: 1, events: [], kills: 0, perfects: 0, maxAgi: 0, picks: 0,
    ts: 1, slowT: 0, hitstop: 0, flashG: 0, flashR: 0, PR, B,
  };

  // ── player ─────────────────────────────────────────
  W.newPlayer = () => {
    const s = baseStats();
    W.p = {
      x: ARENA.w / 2, y: ARENA.h / 2 + 60, vx: 0, vy: 0, face: 1, s, hp: s.maxHp,
      dashT: 0, dashInv: 0, sinceDash: 9, charges: s.dashCharges, chargeT: 0, dashDX: 1, dashDY: 0, perfectUsed: true, dashHit: new Set(),
      iT: 0, hurtT: 0, runPhase: 0, moveAmt: 0, tieAng: 0, tieVel: 0, blink: 1, blinkT: 2, squash: 0, cheer: 0,
      fireT: 0.4, shotN: 0, slowT: 0, regenT: 0, shieldNow: 0, auraT: 0,
      lvl: 1, xp: 0, need: 8, agi: 0, agiT: 0, ghosts: [], pickN: 0, pickT: 0, stacks: {},
    };
    return W.p;
  };
  W.xpNeed = (lvl) => Math.round(6 + lvl * 4.5 + Math.pow(lvl, 1.6));

  W.reset = (stage) => {
    W.enemies.length = 0; W.shots.length = 0; W.ebul.length = 0; W.zones.length = 0; W.beams.length = 0;
    W.pickups.length = 0; W.parts.length = 0; W.texts.length = 0; W.spawns.length = 0; W.boss = null;
    W.stage = stage; W.hpMul = STAGES[stage] ? STAGES[stage].hpMul : 1;
    if (W.p) { W.p.x = ARENA.w / 2; W.p.y = ARENA.h / 2 + 60; W.p.vx = W.p.vy = 0; W.p.shieldNow = W.p.s.shield; }
  };

  // ── fx helpers ─────────────────────────────────────
  const part = (o) => { if (W.parts.length < 900) W.parts.push(Object.assign({ vx: 0, vy: 0, g: 0, life: 0.5, size: 3, col: '#fff', type: 'dot', rot: 0, vr: 0, drag: 2 }, o, { max: o.life || 0.5 })); };
  W.part = part;
  W.burst = (x, y, n, cols, spd = 160, size = 3, life = 0.5, type = 'dot') => {
    for (let i = 0; i < n; i++) { const a = rand(TAU), v = rand(spd * 0.3, spd); part({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, col: pick(cols), size: rand(size * 0.6, size * 1.3), life: rand(life * 0.6, life * 1.2), type, rot: rand(TAU), vr: rand(-10, 10) }); }
  };
  W.ring = (x, y, r, col, life = 0.35, w = 3) => part({ x, y, type: 'ring', size: r, col, life, w });
  W.text = (x, y, txt, col = '#fff', size = 14, life = 0.8, opts = {}) => { if (W.texts.length < 120) W.texts.push(Object.assign({ x, y, txt, col, size, life, max: life, vy: -40, pop: 1 }, opts)); };
  W.shake = (a) => { W.cam.shake = Math.max(W.cam.shake, a); };
  W.cam = { x: ARENA.w / 2, y: ARENA.h / 2, zoom: 1, shake: 0, punch: 0, vw: 800, vh: 600 };

  // ── enemies ────────────────────────────────────────
  W.spawnEnemy = (type, x, y, extra) => {
    const d = ENEMIES[type];
    const e = Object.assign({
      type, art: d.art || type, x, y, vx: 0, vy: 0, r: d.r, hp: d.hp * W.hpMul, maxHp: d.hp * W.hpMul, spd: d.spd * rand(0.9, 1.1), dmg: d.dmg, xp: d.xp,
      d, t: rand(3), face: 1, flash: 0, state: 'move', timer: rand(1.5, 3.5), tele: 0, slowT: 0, kb: 0, dateNum: randi(1, 28), badge: pick(['1', '3', '9', '99+']), wob: rand(TAU), alpha: 1,
    }, extra || {});
    W.enemies.push(e);
    return e;
  };
  W.queueSpawn = (type, x, y, delay = 0.7) => { W.spawns.push({ type, x: clamp(x, B.x0 + 20, B.x1 - 20), y: clamp(y, B.y0 + 20, B.y1 - 20), t: delay, max: delay }); };

  W.fire = (x, y, ang, spd, type = 'orb', o = {}) => {
    if (W.ebul.length > 700) return;
    W.ebul.push(Object.assign({ x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, r: type === 'doc' ? 9 : type === 'paper' ? 7 : 6, type, life: 6, rot: ang, grazed: false, acc: 0, col: null }, o));
  };
  W.zone = (x, y, r, delay, o = {}) => { W.zones.push(Object.assign({ kind: 'circle', x, y, r, t: 0, delay, dmg: 1, col: '#ff4a5a', done: false, label: null }, o)); };
  W.wave = (x, y, speed, width, maxR, o = {}) => { W.zones.push(Object.assign({ kind: 'ring', x, y, r: 6, speed, width, maxR, hit: false, col: '#ffb02e', t: 0 }, o)); };
  W.beam = (x, y, ang, o = {}) => { W.beams.push(Object.assign({ x, y, ang, av: 0, len: 1800, w: 28, warn: 1, dur: 2.4, t: 0, follow: null }, o)); };

  // ── damage to player ───────────────────────────────
  function hurtPlayer(sx, sy, dmg = 1) {
    const p = W.p;
    if (W.demo || W.god) return false;
    if (p.dashInv > 0) {
      if (!p.perfectUsed && p.sinceDash < p.s.perfectWin + 0.06) perfect();
      return false;
    }
    if (p.iT > 0) return false;
    if (p.shieldNow > 0) {
      p.shieldNow--; p.iT = 0.7; Sfx.play.shield();
      W.ring(p.x, p.y - 16, 30, '#7fd3ff', 0.4, 4); W.text(p.x, p.y - 50, '보호막!', '#7fd3ff', 16);
      return false;
    }
    p.hp -= dmg; p.iT = p.s.iframe; p.hurtT = 0.35;
    if (p.agi > 0) W.text(p.x, p.y - 60, '민첩 지수 초기화', '#ff8a8a', 12, 0.9);
    p.agi = 0;
    W.flashR = 0.5; W.shake(9); W.hitstop = 0.06;
    Sfx.play.hurt();
    const a = angTo(sx, sy, p.x, p.y);
    p.vx += Math.cos(a) * 260; p.vy += Math.sin(a) * 260;
    W.burst(p.x, p.y - 18, 14, ['#ff5a5a', '#ffffff', '#ffd0d0'], 220, 3, 0.45);
    W.text(p.x, p.y - 44, '-' + dmg, '#ff5a5a', 20, 0.9);
    if (p.hp <= 0) { p.hp = 0; W.events.push({ type: 'dead' }); }
    return true;
  }
  W.hurtPlayer = hurtPlayer;

  function perfect() {
    const p = W.p, s = p.s;
    p.perfectUsed = true; W.perfects++;
    W.slowT = 0.55; W.flashG = 0.6; W.cam.punch = 0.06;
    Sfx.play.perfect(); Sfx.slowmo(true);
    p.charges = Math.min(p.charges + 1, s.dashCharges);
    addAgi(26);
    W.text(p.x, p.y - 58, '민첩!', '#00e07a', 30, 1.1, { pop: 1.8, stroke: '#063b22' });
    W.ring(p.x, p.y - 14, 150, '#00e07a', 0.5, 6);
    W.ring(p.x, p.y - 14, 90, '#ffffff', 0.35, 3);
    W.burst(p.x, p.y - 14, 26, ['#00e07a', '#b9ffd9', '#ffffff'], 380, 3.5, 0.6, 'spark');
    const dm = s.dmg * 4 * dmgMul();
    for (const e of W.enemies) {
      if (d2(e.x, e.y, p.x, p.y) < 160 * 160) { damageEnemy(e, dm, angTo(p.x, p.y, e.x, e.y), 380, false); }
    }
    if (W.boss && d2(W.boss.x, W.boss.y, p.x, p.y) < (170 + W.boss.r) ** 2) damageEnemy(W.boss, dm, 0, 0, false);
    for (const b of W.ebul) if (d2(b.x, b.y, p.x, p.y) < 175 * 175) { b.life = 0; part({ x: b.x, y: b.y, type: 'spark', col: '#b9ffd9', size: 4, life: 0.4 }); }
    if (s.chain > 0) {
      const targets = W.enemies.filter((e) => e.hp > 0).sort((a, b) => d2(a.x, a.y, p.x, p.y) - d2(b.x, b.y, p.x, p.y)).slice(0, 5);
      if (W.boss) targets.push(W.boss);
      let lx = p.x, ly = p.y - 16;
      for (const e of targets) {
        W.parts.push({ type: 'bolt', x: lx, y: ly, x2: e.x, y2: e.y - e.r, life: 0.3, max: 0.3, col: '#c8f7ff', size: 2 });
        damageEnemy(e, s.dmg * 6 * s.chain * dmgMul(), 0, 0, false);
        lx = e.x; ly = e.y - e.r;
      }
      Sfx.play.zap();
    }
  }

  function addAgi(v) {
    const p = W.p;
    p.agi = clamp(p.agi + v, 0, 100); p.agiT = 2.2 * p.s.agiHold;
    W.maxAgi = Math.max(W.maxAgi, p.agi);
  }
  function dmgMul() {
    const p = W.p, s = p.s;
    let m = 1 + p.agi / 200;
    if (s.edge && p.hp <= 3) m *= 2;
    return m;
  }
  W.dmgMul = dmgMul;

  // ── damage to enemies ──────────────────────────────
  function damageEnemy(e, dmg, ang, kb, crit) {
    if (e.hp <= 0 || e.invuln) return;
    e.hp -= dmg; e.flash = 0.09;
    if (kb && !e.boss) { e.vx += Math.cos(ang) * kb; e.vy += Math.sin(ang) * kb; }
    const big = crit || dmg > W.p.s.dmg * 2.5;
    W.text(e.x + rand(-8, 8), e.y - e.r * 2 - 6, Math.round(dmg).toString(), crit ? '#ffd23f' : '#ffffff', crit ? 17 : big ? 15 : 12, 0.6, { vy: -70, stroke: '#1f2a44' });
    if (e.hp <= 0) killEnemy(e);
  }
  W.damageEnemy = damageEnemy;

  function killEnemy(e) {
    if (e.boss) { e.hp = 0; W.events.push({ type: 'bossDead', e }); return; }
    W.kills++;
    Sfx.play.pop();
    const cols = { pigeon: ['#8b91a2', '#a7acba', '#ffffff'], alarm: ['#e5463b', '#f2b33d', '#fff'], scooter: ['#2ed3a8', '#1d1f29', '#ffe066'], bike: ['#e2483d', '#fff', '#2a2d3a'], tteok: ['#d8342c', '#f3e5cf', '#ff8a6b'], ghost: ['#c9c0f2', '#fff'], spam: ['#ffffff', '#4b2f6e', '#e5263b'], calendar: ['#fff', '#e5463b'], printer: ['#e4dccb', '#fff', '#ffa136'], sticky: ['#ffd84a', '#f5c932'], wisp: ['#5aa8ff', '#9ff7ff', '#2a2766'] }[e.art] || ['#fff'];
    W.burst(e.x, e.y - e.r, 12, cols, 200, 3.2, 0.5);
    W.ring(e.x, e.y - e.r, e.r * 1.6, '#ffffff', 0.25, 2);
    if (e.art === 'spam' || e.art === 'printer' || e.art === 'calendar') for (let i = 0; i < 3; i++) part({ x: e.x, y: e.y - e.r, vx: rand(-80, 80), vy: rand(-140, -40), g: 220, type: 'paper', col: '#ffffff', size: 6, life: 0.9, rot: rand(TAU), vr: rand(-8, 8) });
    if (e.art === 'pigeon') for (let i = 0; i < 4; i++) part({ x: e.x, y: e.y - 12, vx: rand(-60, 60), vy: rand(-90, -20), g: 60, type: 'feather', col: '#c2c6d0', size: 5, life: 1.2, rot: rand(TAU), vr: rand(-4, 4), drag: 1.5 });
    W.text(e.x, e.y - e.r * 2, pick(['퍽!', '펑!', '뿅!', '팍!']), '#ffe9a8', 13, 0.5, { vy: -30, stroke: '#3a2a10' });
    // drops
    const xpv = e.xp * W.p.s.xpMul;
    if (xpv >= 4) W.pickups.push({ x: e.x, y: e.y, type: 'xp', big: true, val: xpv, vx: rand(-50, 50), vy: rand(-50, 50), mag: false, t: 0 });
    else for (let i = 0; i < Math.max(1, Math.round(xpv)); i++) W.pickups.push({ x: e.x + rand(-6, 6), y: e.y + rand(-6, 6), type: 'xp', big: false, val: xpv / Math.max(1, Math.round(xpv)), vx: rand(-60, 60), vy: rand(-60, 60), mag: false, t: 0 });
    if (chance(0.018)) W.pickups.push({ x: e.x, y: e.y, type: 'heal', vx: 0, vy: 0, mag: false, t: 0 });
    if (e.d.splits) for (let i = 0; i < 2; i++) { const m = W.spawnEnemy(e.d.splits, e.x + rand(-8, 8), e.y + rand(-8, 8)); m.vx = rand(-160, 160); m.vy = rand(-160, 160); }
    addAgi(0.6);
  }

  // ── player shots ───────────────────────────────────
  function nearestEnemy(range) {
    const p = W.p; let best = null, bd = range * range;
    for (const e of W.enemies) { if (e.hp <= 0 || e.alpha < 0.5) continue; const dd = d2(e.x, e.y - e.r, p.x, p.y - 16); if (dd < bd) { bd = dd; best = e; } }
    if (W.boss && W.boss.alpha > 0.5) { const dd = d2(W.boss.x, W.boss.y - W.boss.r, p.x, p.y - 16); if (dd < bd * 1.4) best = W.boss; }
    return best;
  }
  function shoot() {
    const p = W.p, s = p.s;
    const t = nearestEnemy(s.range);
    if (!t) return false;
    const base = angTo(p.x, p.y - 16, t.x + (t.vx || 0) * 0.08, t.y - t.r + (t.vy || 0) * 0.08);
    p.shotN++;
    const big = s.bigEvery && p.shotN % s.bigEvery === 0;
    const words = SHOT_WORDS_BY_STAGE[W.stage] || SHOT_WORDS;
    const n = s.shots;
    for (let i = 0; i < n; i++) {
      const a = base + (i - (n - 1) / 2) * 0.17;
      const label = big ? '안녕하세요!!' : pick(words);
      const crit = chance(s.crit);
      W.shots.push({
        x: p.x + Math.cos(a) * 10, y: p.y - 18 + Math.sin(a) * 10, vx: Math.cos(a) * s.shotSpd * (big ? 0.8 : 1), vy: Math.sin(a) * s.shotSpd * (big ? 0.8 : 1),
        r: (big ? 20 : 9) * s.shotSize, dmg: s.dmg * (big ? 5 : 1) * (crit ? s.critMul : 1), crit, pierce: big ? 999 : s.pierce, hit: new Set(),
        life: (s.range / s.shotSpd) * (big ? 1.6 : 1.15), max: 0, spr: Art.bubble(label, big), big, t: 0, child: false,
      });
    }
    if (big) Sfx.play.bigShoot(); else Sfx.play.shoot();
    p.cheer = 0.12;
    if (Math.abs(Math.cos(base)) > 0.2) p.face = Math.cos(base) > 0 ? 1 : -1;
    return true;
  }

  // ── update ─────────────────────────────────────────
  W.update = (dt, input) => {
    W.T += dt;
    const p = W.p, s = p.s;
    updatePlayer(dt, input);
    // shooting
    p.fireT -= dt;
    if (p.fireT <= 0) { if (shoot()) p.fireT = s.fireInt; else p.fireT = 0.05; }
    // aura
    if (s.auraR > 0) {
      p.auraT -= dt;
      if (p.auraT <= 0) {
        p.auraT = 0.25;
        const R2 = s.auraR * s.auraR, dm = s.auraDmg * 0.25 * dmgMul();
        for (const e of W.enemies) if (d2(e.x, e.y, p.x, p.y) < R2) damageEnemy(e, dm, 0, 0, false);
        if (W.boss && d2(W.boss.x, W.boss.y, p.x, p.y) < (s.auraR + W.boss.r) ** 2) damageEnemy(W.boss, dm, 0, 0, false);
      }
    }
    updateSpawns(dt);
    updateEnemies(dt);
    updateShots(dt);
    updateBullets(dt);
    updateZones(dt);
    updatePickups(dt);
    updateFx(dt);
  };

  function updatePlayer(dt, input) {
    const p = W.p, s = p.s;
    const mv = input.move;
    let spd = s.speed * (p.slowT > 0 ? 0.6 : 1) * (s.edge && p.hp <= 3 ? 1.2 : 1);
    p.slowT -= dt;
    // dash charges
    if (p.charges < s.dashCharges) { p.chargeT += dt; if (p.chargeT >= s.dashCd) { p.chargeT = 0; p.charges++; if (!W.demo) W.ring(p.x, p.y - 16, 22, '#00e07a', 0.25, 2); } }
    else p.chargeT = 0;
    if (input.dash && p.charges > 0 && p.dashT <= 0) {
      p.charges--; p.dashT = 0.17; p.dashInv = 0.3; p.sinceDash = 0; p.perfectUsed = false; p.dashHit.clear();
      let dx = mv.x, dy = mv.y; const m = Math.hypot(dx, dy);
      if (m < 0.1) { dx = p.face; dy = 0; } else { dx /= m; dy /= m; }
      p.dashDX = dx; p.dashDY = dy;
      p.squash = -0.18;
      Sfx.play.dash();
      W.burst(p.x, p.y - 4, 8, ['#ffffff', '#d7dde8'], 120, 3, 0.35, 'puff');
    }
    p.sinceDash += dt;
    if (p.dashT > 0) {
      p.dashT -= dt;
      const ds = Math.max(s.speed * 3.4, 640);
      p.vx = p.dashDX * ds; p.vy = p.dashDY * ds;
      if (Math.random() < 0.9) p.ghosts.push({ x: p.x, y: p.y, face: p.face, runPhase: p.runPhase, moveAmt: 1, dashT: 1, life: 0.22, tieAng: p.tieAng });
      if (s.dashDmg) for (const e of W.enemies) if (!p.dashHit.has(e) && d2(e.x, e.y, p.x, p.y) < (e.r + 20) ** 2) { p.dashHit.add(e); damageEnemy(e, s.dmg * s.dashDmg * dmgMul(), Math.atan2(p.dashDY, p.dashDX), 420, false); W.shake(3); }
      if (p.dashT <= 0) { p.vx *= 0.25; p.vy *= 0.25; p.squash = 0.12; }
    } else {
      const tx = mv.x * spd, ty = mv.y * spd;
      p.vx = damp(p.vx, tx, 14, dt); p.vy = damp(p.vy, ty, 14, dt);
    }
    p.dashInv -= dt;
    p.x = clamp(p.x + p.vx * dt, B.x0, B.x1);
    p.y = clamp(p.y + p.vy * dt, B.y0 + 10, B.y1);
    const sp = Math.hypot(p.vx, p.vy);
    p.moveAmt = damp(p.moveAmt, clamp(sp / 200, 0, 1), 10, dt);
    p.runPhase += dt * (6 + sp * 0.045);
    if (Math.abs(p.vx) > 25 && p.cheer <= 0) p.face = p.vx > 0 ? 1 : -1;
    // tie: damped spring that trails velocity
    const tgt = clamp(-p.vx * p.face * 0.0035, -1.1, 0.3) + Math.sin(W.T * 9) * 0.06 * p.moveAmt;
    p.tieVel += (tgt - p.tieAng) * 160 * dt; p.tieVel *= Math.exp(-9 * dt); p.tieAng += p.tieVel * dt;
    p.squash = damp(p.squash, 0, 10, dt);
    p.iT -= dt; p.hurtT -= dt; p.cheer -= dt;
    p.blinkT -= dt; if (p.blinkT < 0) { p.blinkT = rand(2, 4.5); } p.blink = p.blinkT < 0.12 ? 0.1 : 1;
    for (const g of p.ghosts) g.life -= dt;
    while (p.ghosts.length && p.ghosts[0].life <= 0) p.ghosts.shift();
    // agility index decays after the hold time
    p.agiT -= dt; if (p.agiT <= 0) p.agi = Math.max(0, p.agi - 9 * dt);
    // regen
    if (s.regen > 0 && p.hp < s.maxHp) { p.regenT += dt; if (p.regenT >= s.regen) { p.regenT = 0; p.hp++; Sfx.play.heal(); W.text(p.x, p.y - 50, '+1', '#6dff9e', 16); } }
    if (p.pickT > 0) p.pickT -= dt; else p.pickN = 0;
  }

  function updateSpawns(dt) {
    for (const sp of W.spawns) {
      sp.t -= dt;
      if (sp.t <= 0) { W.spawnEnemy(sp.type, sp.x, sp.y); W.burst(sp.x, sp.y - 6, 8, ['#ffffff', '#d7dde8'], 90, 4, 0.4, 'puff'); }
    }
    for (let i = W.spawns.length - 1; i >= 0; i--) if (W.spawns[i].t <= 0) W.spawns.splice(i, 1);
  }

  // spatial grid for enemy separation
  const grid = new Map(), CS = 48;
  function updateEnemies(dt) {
    const p = W.p;
    grid.clear();
    for (const e of W.enemies) { const k = ((e.x / CS) | 0) * 1000 + ((e.y / CS) | 0); let a = grid.get(k); if (!a) grid.set(k, (a = [])); a.push(e); }
    for (const e of W.enemies) {
      if (e.hp <= 0) continue;
      e.t += dt; e.flash -= dt; e.slowT -= dt;
      const sm = e.slowT > 0 ? 0.65 : 1;
      AI[e.d.ai](e, dt, sm);
      // separation
      if (!e.d.ghost && e.state !== 'charge') {
        const gx = (e.x / CS) | 0, gy = (e.y / CS) | 0;
        for (let ix = gx - 1; ix <= gx + 1; ix++) for (let iy = gy - 1; iy <= gy + 1; iy++) {
          const a = grid.get(ix * 1000 + iy); if (!a) continue;
          for (const o of a) {
            if (o === e || o.d.ghost) continue;
            const dx = e.x - o.x, dy = e.y - o.y, rr2 = e.r + o.r, dd = dx * dx + dy * dy;
            if (dd < rr2 * rr2 && dd > 0.01) { const dd2 = Math.sqrt(dd), push = (rr2 - dd2) * 0.5; e.x += (dx / dd2) * push * 0.5; e.y += (dy / dd2) * push * 0.5; }
          }
        }
      }
      e.vx *= Math.exp(-6 * dt); e.vy *= Math.exp(-6 * dt);
      e.x += e.vx * dt; e.y += e.vy * dt;
      e.x = clamp(e.x, B.x0 - 10, B.x1 + 10); e.y = clamp(e.y, B.y0, B.y1 + 10);
      // contact
      if (e.alpha > 0.6 && d2(e.x, e.y - e.r * 0.8, p.x, p.y - 14) < (e.r * 0.85 + PR) ** 2) {
        if (hurtPlayer(e.x, e.y, e.dmg) && e.d.sticky) { p.slowT = 1.6; W.text(p.x, p.y - 64, '끈적!', '#ffd84a', 14); }
      }
    }
    for (let i = W.enemies.length - 1; i >= 0; i--) if (W.enemies[i].hp <= 0) W.enemies.splice(i, 1);
  }

  // enemy behaviours
  const AI = {
    chase(e, dt, sm) {
      const p = W.p, a = angTo(e.x, e.y, p.x, p.y);
      let ax = Math.cos(a), ay = Math.sin(a);
      if (e.d.wobble) { const w = Math.sin(e.t * 3 + e.wob) * e.d.wobble * 0.7; ax += -ay * w; ay += ax * w; }
      e.x += ax * e.spd * sm * dt; e.y += ay * e.spd * sm * dt;
      e.face = p.x > e.x ? 1 : -1;
    },
    ringer(e, dt, sm) {
      const p = W.p;
      e.timer -= dt;
      if (e.tele > 0) {
        e.tele -= dt;
        if (e.tele <= 0) { W.wave(e.x, e.y - 10, 250, 16, 190, { col: '#ffb02e', label: '따르릉' }); W.text(e.x, e.y - 46, '따르릉!', '#ffb02e', 14, 0.7, { stroke: '#4a2a00' }); e.timer = rand(3.2, 4.4); }
        return;
      }
      if (e.timer <= 0 && d2(e.x, e.y, p.x, p.y) < 360 * 360) { e.tele = 0.7; Sfx.play.ring(); return; }
      AI.chase(e, dt, sm);
    },
    charger(e, dt, sm) {
      const p = W.p;
      e.timer -= dt;
      if (e.state === 'move') {
        AI.chase(e, dt, sm * 0.8);
        if (e.timer <= 0 && d2(e.x, e.y, p.x, p.y) < 380 * 380) { e.state = 'aim'; e.tele = 0.62; e.aim = angTo(e.x, e.y, p.x, p.y); e.chainsLeft = e.d.chains || 1; Sfx.play.telegraph(); }
      } else if (e.state === 'aim') {
        e.tele -= dt;
        e.aim += angDiff(e.aim, angTo(e.x, e.y, p.x, p.y)) * Math.min(1, dt * 1.5);
        e.face = Math.cos(e.aim) > 0 ? 1 : -1;
        if (e.tele <= 0) { e.state = 'charge'; e.timer = 0.55; }
      } else if (e.state === 'charge') {
        e.x += Math.cos(e.aim) * e.d.chargeSpd * sm * dt; e.y += Math.sin(e.aim) * e.d.chargeSpd * sm * dt;
        if (Math.random() < 0.5) part({ x: e.x - Math.cos(e.aim) * 14, y: e.y - 4, vx: rand(-20, 20), vy: rand(-20, 0), type: 'puff', col: '#e8ecf2', size: rand(3, 6), life: 0.4 });
        const out = e.x < B.x0 || e.x > B.x1 || e.y < B.y0 || e.y > B.y1;
        if (e.timer <= 0 || out) {
          e.chainsLeft--;
          if (e.chainsLeft > 0) { e.state = 'aim'; e.tele = 0.35; e.aim = angTo(e.x, e.y, p.x, p.y); }
          else { e.state = 'move'; e.timer = rand(1.8, 3); }
        }
      }
    },
    shooter(e, dt, sm) {
      const p = W.p, dd = dist(e.x, e.y, p.x, p.y), a = angTo(e.x, e.y, p.x, p.y);
      const want = dd > 240 ? 1 : dd < 170 ? -0.6 : 0.15;
      e.x += Math.cos(a) * e.spd * want * sm * dt + Math.cos(a + Math.PI / 2) * Math.sin(e.t) * 30 * dt;
      e.y += Math.sin(a) * e.spd * want * sm * dt + Math.sin(a + Math.PI / 2) * Math.sin(e.t) * 30 * dt;
      e.face = p.x > e.x ? 1 : -1;
      e.timer -= dt;
      if (e.timer <= 0 && dd < 460) { e.timer = rand(2.4, 3.2); for (let i = -1; i <= 1; i++) W.fire(e.x, e.y - 22, a + i * 0.32, 150, 'q'); }
    },
    blinker(e, dt, sm) {
      const p = W.p;
      e.timer -= dt;
      if (e.state === 'move') {
        AI.chase(e, dt, sm);
        if (e.timer <= 0 && d2(e.x, e.y, p.x, p.y) < 520 * 520) { e.state = 'fade'; e.tele = 0.45; }
      } else if (e.state === 'fade') {
        e.tele -= dt; e.alpha = clamp(e.tele / 0.45, 0, 1);
        if (e.tele <= 0) {
          const a = rand(TAU), r = rand(50, 90);
          e.x = clamp(p.x + Math.cos(a) * r, B.x0, B.x1); e.y = clamp(p.y + Math.sin(a) * r, B.y0, B.y1);
          e.state = 'arm'; e.tele = 1.05; e.alpha = 1;
          W.zone(e.x, e.y - 10, 66, 1.05, { col: '#ff5a4a', label: '회의 소집' });
          W.text(e.x, e.y - 44, '회의 소집!', '#ff8a7a', 13, 0.8, { stroke: '#4a1010' });
          Sfx.play.telegraph();
        }
      } else if (e.state === 'arm') {
        e.tele -= dt;
        if (e.tele <= 0) { e.state = 'move'; e.timer = rand(3.5, 5); }
      }
    },
    turret(e, dt, sm) {
      const p = W.p, dd = dist(e.x, e.y, p.x, p.y);
      if (dd > 280) AI.chase(e, dt, sm);
      e.timer -= dt; e.paperOut = Math.max(0, (e.paperOut || 0) - dt * 3); e.kick = Math.max(0, (e.kick || 0) - dt * 6);
      if (e.timer <= 0 && dd < 520) {
        e.burst = (e.burst || 0) + 1;
        const a = angTo(e.x, e.y - 18, p.x, p.y - 14);
        W.fire(e.x, e.y - 18, a + rand(-0.06, 0.06), 230, 'paper');
        e.paperOut = 1; e.kick = 1; Sfx.play.bossShot();
        if (e.burst >= 3) { e.burst = 0; e.timer = rand(2.2, 3); } else e.timer = 0.14;
      }
    },
  };

  function updateShots(dt) {
    const s = W.p.s;
    const targets = W.boss ? W.enemies.concat([W.boss]) : W.enemies;
    for (const sh of W.shots) {
      sh.t += dt; sh.life -= dt;
      sh.x += sh.vx * dt; sh.y += sh.vy * dt;
      if (sh.life <= 0) continue;
      for (const e of targets) {
        if (e.hp <= 0 || sh.hit.has(e) || e.alpha < 0.5 || e.invuln) continue;
        if (d2(sh.x, sh.y, e.x, e.y - e.r) < (sh.r + e.r) ** 2) {
          sh.hit.add(e);
          const ang = Math.atan2(sh.vy, sh.vx);
          const killed = e.hp - sh.dmg * dmgMul() <= 0;
          damageEnemy(e, sh.dmg * dmgMul(), ang, e.boss ? 0 : 120, sh.crit);
          if (sh.crit) Sfx.play.crit(); else Sfx.play.hit();
          if (s.slow) e.slowT = s.slow;
          W.burst(sh.x, sh.y, 4, ['#ffffff', '#cfe8ff'], 120, 2.4, 0.25);
          if (s.splash) { W.ring(sh.x, sh.y, 44 * s.splash, '#ffffff', 0.25, 3); for (const o of W.enemies) if (o !== e && d2(o.x, o.y - o.r, sh.x, sh.y) < (46 * s.splash) ** 2) damageEnemy(o, sh.dmg * 0.45 * dmgMul(), 0, 60, false); }
          if (killed && s.split && !sh.child) {
            for (const da of [-0.55, 0.55]) {
              const a = ang + da, v = Math.hypot(sh.vx, sh.vy);
              W.shots.push(Object.assign({}, sh, { vx: Math.cos(a) * v, vy: Math.sin(a) * v, dmg: sh.dmg * 0.6, life: 0.5, hit: new Set([e]), child: true, pierce: 0, r: sh.r * 0.85 }));
            }
          }
          if (sh.pierce-- <= 0) { sh.life = 0; break; }
        }
      }
    }
    for (let i = W.shots.length - 1; i >= 0; i--) { const sh = W.shots[i]; if (sh.life <= 0) { W.shots.splice(i, 1); W.burst(sh.x, sh.y, 3, ['#ffffff'], 60, 2, 0.2); } }
  }

  function updateBullets(dt) {
    const p = W.p;
    for (const b of W.ebul) {
      b.life -= dt;
      if (b.acc) { const v = Math.hypot(b.vx, b.vy), nv = Math.max(20, v + b.acc * dt); b.vx *= nv / v; b.vy *= nv / v; }
      if (b.curve) { const a = Math.atan2(b.vy, b.vx) + b.curve * dt, v = Math.hypot(b.vx, b.vy); b.vx = Math.cos(a) * v; b.vy = Math.sin(a) * v; }
      if (b.lob) {
        b.lt += dt; const k = b.lt / b.ldur;
        b.x = lerp(b.sx, b.tx, k); b.y = lerp(b.sy, b.ty, k); b.h = Math.sin(Math.PI * k) * 120;
        if (k >= 1) { b.life = 0; for (let i = 0; i < 10; i++) W.fire(b.tx, b.ty, (i / 10) * TAU + 0.3, 160, 'orb', { col: '#ffd23f' }); }
        continue;
      }
      b.x += b.vx * dt; b.y += b.vy * dt; b.rot += dt * 6;
      if (b.x < -40 || b.y < -40 || b.x > ARENA.w + 40 || b.y > ARENA.h + 40) b.life = 0;
      const dd = d2(b.x, b.y, p.x, p.y - 14);
      if (dd < (b.r + PR) ** 2) { if (hurtPlayer(b.x, b.y, b.dmg || 1)) b.life = 0; else if (p.dashInv <= 0 && p.iT > 0) { /* passes */ } }
      else if (!b.grazed && dd < (b.r + PR + 18) ** 2 && !W.demo) {
        b.grazed = true; addAgi(3.5); Sfx.play.graze();
        if (Math.random() < 0.35) W.text(p.x + rand(-10, 10), p.y - 46, '휙', '#b9ffd9', 12, 0.45, { vy: -50 });
      }
    }
    for (let i = W.ebul.length - 1; i >= 0; i--) if (W.ebul[i].life <= 0) W.ebul.splice(i, 1);
  }

  function updateZones(dt) {
    const p = W.p;
    for (const z of W.zones) {
      z.t += dt;
      if (z.kind === 'circle') {
        if (!z.done && z.t >= z.delay) {
          z.done = true; z.boomT = 0;
          if (d2(z.x, z.y, p.x, p.y - 10) < (z.r + PR * 0.5) ** 2) hurtPlayer(z.x, z.y, z.dmg);
          W.burst(z.x, z.y, 16, [z.col, '#ffffff', '#ffd0a0'], z.r * 3.2, 4, 0.45);
          W.ring(z.x, z.y, z.r * 1.15, z.col, 0.3, 5);
          Sfx.play.boom(); W.shake(Math.min(8, z.r / 12));
        }
        if (z.done) z.boomT += dt;
      } else if (z.kind === 'ring') {
        z.r += z.speed * dt;
        const dd = dist(z.x, z.y, p.x, p.y - 12);
        if (!z.hit && Math.abs(dd - z.r) < z.width / 2 + PR * 0.6) { if (hurtPlayer(z.x, z.y, 1)) z.hit = true; else if (p.dashInv > 0) z.hit = true; }
      }
    }
    for (let i = W.zones.length - 1; i >= 0; i--) { const z = W.zones[i]; if ((z.kind === 'circle' && z.done && z.boomT > 0.15) || (z.kind === 'ring' && z.r > z.maxR)) W.zones.splice(i, 1); }
    // beams
    for (const bm of W.beams) {
      bm.t += dt;
      if (bm.follow) { bm.x = bm.follow.x; bm.y = bm.follow.y - bm.follow.r * 1.1; }
      if (bm.t > bm.warn) {
        bm.ang += bm.av * dt;
        const ex = bm.x + Math.cos(bm.ang) * bm.len, ey = bm.y + Math.sin(bm.ang) * bm.len;
        const dd = segDist(p.x, p.y - 14, bm.x, bm.y, ex, ey);
        if (dd < bm.w / 2 + PR * 0.4) hurtPlayer(p.x - Math.cos(bm.ang + Math.PI / 2) * 10, p.y, 1);
        if (Math.random() < 0.6) { const k = rand(0.1, 1); part({ x: bm.x + Math.cos(bm.ang) * bm.len * k * 0.5, y: bm.y + Math.sin(bm.ang) * bm.len * k * 0.5, vx: rand(-40, 40), vy: rand(-80, -20), type: 'spark', col: '#bfe9ff', size: 3, life: 0.4 }); }
      } else bm.ang += (bm.warnAv || 0) * dt;
    }
    for (let i = W.beams.length - 1; i >= 0; i--) if (W.beams[i].t > W.beams[i].warn + W.beams[i].dur) W.beams.splice(i, 1);
  }
  function segDist(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
    const t = clamp(((px - x1) * dx + (py - y1) * dy) / l2, 0, 1);
    return dist(px, py, x1 + dx * t, y1 + dy * t);
  }

  function updatePickups(dt) {
    const p = W.p, s = p.s;
    for (const k of W.pickups) {
      k.t += dt;
      const dd = d2(k.x, k.y, p.x, p.y);
      if (k.vacuum || dd < s.magnet * s.magnet) k.mag = true;
      if (k.mag) {
        const a = angTo(k.x, k.y, p.x, p.y), v = 360 + k.t * 400;
        k.vx = damp(k.vx, Math.cos(a) * v, 10, dt); k.vy = damp(k.vy, Math.sin(a) * v, 10, dt);
      } else { k.vx *= Math.exp(-5 * dt); k.vy *= Math.exp(-5 * dt); }
      k.x += k.vx * dt; k.y += k.vy * dt;
      if (dd < 18 * 18) {
        k.dead = true;
        if (k.type === 'xp') {
          p.xp += k.val; p.pickN++; p.pickT = 0.5; Sfx.play.pickup(p.pickN);
          while (p.xp >= p.need) { p.xp -= p.need; p.lvl++; p.need = W.xpNeed(p.lvl); W.events.push({ type: 'level' }); }
        } else if (k.type === 'heal') {
          p.hp = Math.min(s.maxHp, p.hp + 2); Sfx.play.heal(); W.text(p.x, p.y - 50, '김밥 +2', '#6dff9e', 15);
          W.burst(p.x, p.y - 16, 10, ['#6dff9e', '#ffffff'], 140, 3, 0.5);
        }
      }
    }
    for (let i = W.pickups.length - 1; i >= 0; i--) if (W.pickups[i].dead) W.pickups.splice(i, 1);
  }

  function updateFx(dt) {
    for (const q of W.parts) {
      q.life -= dt;
      if (q.type === 'bolt') continue;
      q.vy += q.g * dt; q.vx *= Math.exp(-q.drag * dt); q.vy *= Math.exp(-q.drag * dt * (q.g ? 0 : 1));
      q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.vr * dt;
    }
    for (let i = W.parts.length - 1; i >= 0; i--) if (W.parts[i].life <= 0) W.parts.splice(i, 1);
    for (const t of W.texts) { t.life -= dt; t.y += t.vy * dt; t.vy *= Math.exp(-3 * dt); }
    for (let i = W.texts.length - 1; i >= 0; i--) if (W.texts[i].life <= 0) W.texts.splice(i, 1);
  }

  W.vacuumAll = () => { for (const k of W.pickups) k.vacuum = true; };
  W.clearHostiles = () => {
    for (const e of W.enemies) { W.burst(e.x, e.y - e.r, 6, ['#ffffff', '#d7dde8'], 120, 3, 0.4, 'puff'); }
    W.enemies.length = 0; W.spawns.length = 0;
    for (const b of W.ebul) part({ x: b.x, y: b.y, type: 'spark', col: '#ffffff', size: 3, life: 0.3 });
    W.ebul.length = 0; W.zones.length = 0; W.beams.length = 0;
  };

  return W;
})();
