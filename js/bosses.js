'use strict';
// Boss fights. Each attack is a generator that yields seconds to wait.
const Bosses = (() => {
  const W = World;
  const P = () => W.p;
  const cx = (x) => clamp(x, W.B.x0 + 30, W.B.x1 - 30);
  const cy = (y) => clamp(y, W.B.y0 + 40, W.B.y1 - 10);
  const head = (b) => ({ x: b.x, y: b.y - b.r * 1.05 });

  const S = {};

  // ── 스누즈 대왕 ────────────────────────────────────
  S.alarmKing = {
    order: ['rings', 'spiral', 'summon', 'snooze', 'spiral', 'rings', 'snooze'],
    *rings(b) {
      b.move = 'still'; b.tele = 0.85; Sfx.play.ring(); yield 0.85; b.tele = 0;
      const n = b.phase > 1 ? 4 : 3;
      for (let i = 0; i < n; i++) { const h = head(b); W.wave(h.x, h.y, 260 + i * 18, 22, 1000, { col: '#ffb02e' }); Sfx.play.ring(); W.shake(4); yield 0.45; }
      b.move = 'follow'; yield 0.9;
    },
    *spiral(b) {
      b.move = 'still';
      let a = rand(TAU); const arms = b.phase > 1 ? 3 : 2, dir = chance(0.5) ? 1 : -1, end = W.T + 2.7;
      while (W.T < end) { const h = head(b); for (let k = 0; k < arms; k++) W.fire(h.x, h.y, a + (k * TAU) / arms, 170, 'note'); a += 0.26 * dir; Sfx.play.bossShot(); yield 0.09; }
      b.move = 'follow'; yield 0.8;
    },
    *snooze(b) {
      const times = b.phase > 1 ? 2 : 1;
      for (let i = 0; i < times; i++) {
        b.invuln = true; b.move = 'still';
        for (let k = 0; k <= 10; k++) { b.alpha = 1 - k / 10; yield 0.03; }
        const p = P(), tx = cx(p.x + p.vx * 0.3), ty = cy(p.y + p.vy * 0.3);
        W.zone(tx, ty, 118, 1.0, { col: '#ff4a5a', label: '5분만 더' });
        W.text(tx, ty - 136, '5분만 더…', '#ffd0d0', 18, 1, { stroke: '#4a1010' });
        Sfx.play.telegraph();
        yield 1.0;
        b.x = tx; b.y = ty; b.alpha = 1; b.invuln = false;
        W.shake(13); W.burst(b.x, b.y, 24, ['#ffd23f', '#ffffff', '#e8b13a'], 380, 5, 0.6);
        const h = head(b); for (let k = 0; k < 14; k++) W.fire(h.x, h.y, (k / 14) * TAU, 190, 'note');
        yield 0.75;
      }
      b.move = 'follow'; yield 0.6;
    },
    *summon(b) {
      b.move = 'still'; b.tele = 0.5; yield 0.5; b.tele = 0;
      const n = b.phase > 1 ? 4 : 3;
      for (let i = 0; i < n; i++) { const a = (i / n) * TAU; W.queueSpawn('alarm', b.x + Math.cos(a) * 140, b.y + Math.sin(a) * 100, 0.6); }
      W.text(b.x, b.y - 140, '기상!!', '#ffb02e', 22, 1, { stroke: '#4a2a00' });
      Sfx.play.ring();
      yield 1.2; b.move = 'follow';
    },
  };

  // ── 분노의 라면냄비 ────────────────────────────────
  S.ramenPot = {
    order: ['noodles', 'splash', 'dash', 'eggs', 'noodles', 'dash', 'splash'],
    *noodles(b) {
      b.move = 'still';
      const arms = b.phase > 1 ? 4 : 3, dir = chance(0.5) ? 1 : -1, end = W.T + 3;
      let a = rand(TAU);
      while (W.T < end) { const h = head(b); for (let k = 0; k < arms; k++) W.fire(h.x, h.y, a + (k * TAU) / arms, 160, 'noodle', { curve: 0.45 * dir }); a += 0.21 * dir; Sfx.play.bossShot(); yield 0.1; }
      b.move = 'follow'; yield 0.8;
    },
    *splash(b) {
      b.tele = 0.4; yield 0.3;
      const n = b.phase > 1 ? 9 : 6, p = P();
      for (let i = 0; i < n; i++) { W.zone(cx(p.x + rand(-150, 150)), cy(p.y + rand(-120, 120)), 72, 1.0, { col: '#ff7a2e', label: '보글' }); yield 0.16; }
      b.tele = 0; yield 1.1;
    },
    *dash(b) {
      const n = b.phase > 1 ? 3 : 2;
      for (let i = 0; i < n; i++) {
        b.move = 'still'; b.state = 'aim'; b.tele = 0.75; b.aim = angTo(b.x, b.y, P().x, P().y);
        Sfx.play.telegraph(); W.text(b.x, b.y - 150, '부글부글…', '#ffb07a', 16, 0.7, { stroke: '#4a1a00' });
        yield 0.75;
        b.tele = 0; b.state = 'rush'; b.rushSpd = 720; yield 0.62;
        b.state = 'idle'; W.shake(6); yield 0.35;
      }
      b.move = 'follow'; yield 0.6;
    },
    *eggs(b) {
      b.move = 'still'; b.tele = 0.4; yield 0.4; b.tele = 0;
      const n = b.phase > 1 ? 5 : 3, p = P(), h = head(b);
      for (let i = 0; i < n; i++) {
        const tx = cx(p.x + rand(-130, 130)), ty = cy(p.y + rand(-100, 100));
        W.ebul.push({ lob: true, sx: h.x, sy: h.y - 30, tx, ty, lt: 0, ldur: 1.0, x: h.x, y: h.y, r: 10, type: 'egg', life: 5, h: 0, rot: 0, vx: 0, vy: 0, grazed: true });
        W.zone(tx, ty, 56, 1.0, { col: '#ffd23f', label: null });
        yield 0.18;
      }
      yield 1.4; b.move = 'follow';
    },
  };

  // ── 부장님 ─────────────────────────────────────────
  S.bujang = {
    order: ['docFan', 'shout', 'rush', 'meeting', 'docFan', 'rain', 'shout', 'rush'],
    *docFan(b) {
      b.move = 'still';
      const vol = b.phase > 1 ? 4 : 3, n = b.phase > 1 ? 9 : 7;
      for (let v = 0; v < vol; v++) {
        const h = head(b), a = angTo(h.x, h.y, P().x, P().y - 14);
        for (let i = 0; i < n; i++) W.fire(h.x - 20 * b.face, h.y + 10, a + (i - (n - 1) / 2) * 0.15, 205, 'doc');
        Sfx.play.card(); yield 0.55;
      }
      b.move = 'follow'; yield 0.7;
    },
    *shout(b) {
      b.move = 'still'; b.state = 'shout'; b.tele = 0.7;
      W.text(b.x, b.y - 170, '김민첩 씨!!', '#ff7a8a', 26, 1.2, { stroke: '#4a0a1a', pop: 1.6 });
      Sfx.play.shout(); yield 0.7;
      const h = head(b);
      W.wave(h.x, h.y, 330, 28, 1200, { col: '#ff5a7a' }); W.shake(8);
      if (b.phase > 1) { yield 0.4; W.wave(h.x, h.y, 330, 28, 1200, { col: '#ff5a7a' }); W.shake(6); }
      b.tele = 0; yield 0.6; b.state = 'idle'; b.move = 'follow'; yield 0.5;
    },
    *rush(b) {
      W.text(b.x, b.y - 160, '잠깐 얘기 좀 할까?', '#ffd0d8', 16, 1.1, { stroke: '#3a0a1a' });
      const n = b.phase > 1 ? 4 : 3;
      for (let i = 0; i < n; i++) {
        b.move = 'still'; b.state = 'aim'; b.tele = 0.55; b.aim = angTo(b.x, b.y, P().x, P().y);
        Sfx.play.telegraph(); yield 0.55;
        b.state = 'rush'; b.rushSpd = 760; b.tele = 0; yield 0.5;
        b.state = 'idle'; yield 0.25;
      }
      b.move = 'follow'; yield 0.6;
    },
    *meeting(b) {
      b.move = 'still'; b.state = 'shout'; yield 0.3;
      const p = P(), n = b.phase > 1 ? 4 : 3;
      for (let i = 0; i < n; i++) { const a = (i / n) * TAU + rand(1); W.queueSpawn('calendar', p.x + Math.cos(a) * 200, p.y + Math.sin(a) * 160, 0.7); }
      W.text(b.x, b.y - 160, '회의실로 다 모여!', '#ff8a7a', 18, 1, { stroke: '#4a1010' });
      b.state = 'idle'; yield 1.3; b.move = 'follow';
    },
    *rain(b) {
      if (b.phase < 2) { yield 0.1; return; }
      b.move = 'still'; b.state = 'shout';
      W.text(b.x, b.y - 160, '이것도 오늘까지!', '#ffd23f', 18, 1, { stroke: '#3a2a00' });
      for (let i = 0; i < 14; i++) { W.zone(rand(W.B.x0 + 60, W.B.x1 - 60), rand(W.B.y0 + 60, W.B.y1 - 30), 62, 1.15, { col: '#ffd23f', label: '결재' }); yield 0.08; }
      b.state = 'idle'; yield 1.3; b.move = 'follow';
    },
  };

  // ── 야근 마왕 ──────────────────────────────────────
  S.demon = {
    order: ['lasers', 'ringGap', 'cables', 'wisps', 'bursts', 'lasers', 'cables', 'ringGap'],
    *lasers(b) {
      b.move = 'still'; b.state = 'laser';
      const cnt = b.phase >= 3 ? 4 : b.phase >= 2 ? 3 : 2, base = angTo(b.x, b.y, P().x, P().y) + Math.PI / cnt, dir = chance(0.5) ? 1 : -1;
      for (let k = 0; k < cnt; k++) W.beam(b.x, b.y - b.r * 1.1, base + (k * TAU) / cnt, { warn: 1.0, dur: 2.7, av: dir * (b.phase >= 3 ? 0.85 : 0.65), w: 26, follow: b });
      Sfx.play.laserCharge(); yield 1.0;
      Sfx.play.laser(); W.shake(5); yield 1.4; Sfx.play.laser(); yield 1.3;
      b.state = 'idle'; b.move = 'follow'; yield 0.6;
    },
    *ringGap(b) {
      b.move = 'still';
      const rings = b.phase >= 3 ? 6 : 5;
      for (let i = 0; i < rings; i++) {
        const h = head(b), gap = angTo(h.x, h.y, P().x, P().y) + rand(-0.5, 0.5), n = 32;
        for (let k = 0; k < n; k++) { const a = (k / n) * TAU; if (Math.abs(angDiff(a, gap)) < 0.32) continue; W.fire(h.x, h.y, a, 150 + b.phase * 12, 'orb', { col: '#8f7bff' }); }
        Sfx.play.bossShot(); yield b.phase >= 3 ? 0.42 : 0.5;
      }
      b.move = 'follow'; yield 0.7;
    },
    *cables(b) {
      b.tele = 0.4; yield 0.3;
      const reps = b.phase >= 2 ? 2 : 1;
      for (let r = 0; r < reps; r++) {
        const p = P(), a = angTo(b.x, b.y, p.x, p.y), d = dist(b.x, b.y, p.x, p.y) + 120;
        for (let i = 1; i <= 7; i++) { const k = (i / 7) * d; W.zone(cx(b.x + Math.cos(a) * k), cy(b.y + Math.sin(a) * k), 58, 0.7 + i * 0.09, { col: '#a06bff', label: null }); }
        yield 0.9;
      }
      b.tele = 0; yield 0.8;
    },
    *wisps(b) {
      b.move = 'still'; b.state = 'laser'; yield 0.3;
      const n = b.phase >= 3 ? 8 : 6;
      for (let i = 0; i < n; i++) { const a = (i / n) * TAU; W.queueSpawn('wisp', b.x + Math.cos(a) * 160, b.y + Math.sin(a) * 120, 0.6); }
      W.text(b.x, b.y - 190, '야근 수당은 없다', '#bfa8ff', 18, 1.1, { stroke: '#1a0a3a' });
      b.state = 'idle'; yield 1.2; b.move = 'follow';
    },
    *bursts(b) {
      b.move = 'still';
      for (let v = 0; v < 3; v++) {
        const h = head(b), a = angTo(h.x, h.y, P().x, P().y - 14);
        for (let i = 0; i < 13; i++) W.fire(h.x, h.y, a + (i - 6) * 0.075, 230 + Math.abs(i - 6) * 8, 'orb', { col: '#ff3b7a' });
        Sfx.play.bossShot(); yield 0.6;
      }
      b.move = 'follow'; yield 0.7;
    },
  };

  function create(key) {
    const d = BOSSES[key];
    const b = {
      boss: true, key, art: d.art, name: d.name, title: d.title, x: ARENA.w / 2, y: ARENA.h * 0.34, r: d.r, hp: d.hp, maxHp: d.hp, vx: 0, vy: 0, t: 0,
      face: 1, flash: 0, phase: 1, alpha: 1, invuln: false, state: 'idle', tele: 0, co: null, waitT: 1.2, move: 'follow', spd: d.spd, d: {}, xp: 0, idx: 0, aim: 0, rushSpd: 0, enter: 1,
    };
    return b;
  }

  function update(b, dt) {
    const p = W.p, sc = S[b.key];
    b.t += dt; b.flash -= dt;
    if (b.enter > 0) { b.enter -= dt; }
    // phase transitions
    const frac = b.hp / b.maxHp;
    const target = b.key === 'demon' ? (frac < 0.33 ? 3 : frac < 0.66 ? 2 : 1) : (frac < 0.5 ? 2 : 1);
    if (target > b.phase) {
      b.phase = target;
      W.shake(14); W.flashR = 0.3;
      const msg = b.key === 'demon' ? (b.phase === 3 ? '새벽 3시' : '자정을 넘겼습니다') : '분노!';
      W.text(b.x, b.y - b.r * 2.6, msg, '#ff5a7a', 28, 1.4, { stroke: '#2a0010', pop: 2 });
      Sfx.play.warn();
      W.events.push({ type: 'bossPhase', phase: b.phase });
    }
    // movement
    if (b.state === 'rush') {
      b.x += Math.cos(b.aim) * b.rushSpd * dt; b.y += Math.sin(b.aim) * b.rushSpd * dt;
      if (Math.random() < 0.8) W.part({ x: b.x + rand(-b.r, b.r) * 0.6, y: b.y - rand(0, b.r), vx: rand(-30, 30), vy: rand(-60, -10), type: 'puff', col: b.key === 'ramenPot' ? '#ffffff' : '#bdb2d6', size: rand(6, 12), life: 0.6 });
      if (b.x < W.B.x0 + 30 || b.x > W.B.x1 - 30 || b.y < W.B.y0 + 40 || b.y > W.B.y1) { b.state = 'idle'; W.shake(8); }
    } else if (b.move === 'follow') {
      const dd = dist(b.x, b.y, p.x, p.y), a = angTo(b.x, b.y, p.x, p.y);
      const want = dd > 250 ? 1 : dd < 170 ? -0.5 : 0;
      b.x += Math.cos(a) * b.spd * want * dt + Math.cos(a + Math.PI / 2) * Math.sin(b.t * 0.7) * 30 * dt;
      b.y += Math.sin(a) * b.spd * want * dt + Math.sin(a + Math.PI / 2) * Math.sin(b.t * 0.7) * 30 * dt;
    }
    b.x = cx(b.x); b.y = cy(b.y);
    if (b.state !== 'rush' && b.state !== 'aim') b.face = p.x > b.x ? 1 : -1;
    else b.face = Math.cos(b.aim) > 0 ? 1 : -1;
    // attack script
    if (b.enter <= 0) {
      if (b.waitT > 0) b.waitT -= dt;
      else {
        if (!b.co) { const name = sc.order[b.idx++ % sc.order.length]; b.co = sc[name](b); }
        const r = b.co.next();
        if (r.done) { b.co = null; b.waitT = 0.25; } else b.waitT = r.value || 0;
      }
    }
    // contact
    if (b.alpha > 0.6 && d2(b.x, b.y - b.r, p.x, p.y - 14) < (b.r * 0.8 + W.PR) ** 2) W.hurtPlayer(b.x, b.y, 1);
  }

  return { create, update };
})();
