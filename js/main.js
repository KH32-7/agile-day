'use strict';
const Game = (() => {
  const W = World;
  let state = 'title'; // title | station | play | clearing | pick | boss | paused | result
  let prevState = null;
  let run = null;
  let last = performance.now();
  let demoSpawnT = 0;
  let autoPilot = false;
  const STAGE_SUB = ['출근까지', '점심 끝까지', '퇴근까지', '막차까지'];

  // ── run lifecycle ──────────────────────────────────
  function newRun() {
    W.newPlayer();
    run = { stage: 0, wave: 0, phase: 'wave', waveT: 0, waveDur: 30, spawnT: 0.6, taken: {}, rerolls: 3, pending: 0, startedAt: performance.now(), clearT: 0, addsT: 0 };
    W.kills = 0; W.perfects = 0; W.maxAgi = 0; W.demo = false;
  }

  function startStage(i) {
    run.stage = i; run.wave = 0;
    W.reset(i);
    W.cam.x = W.p.x; W.cam.y = W.p.y;
    Music.play(STAGES[i].music);
    setState('station');
    UI.station(i, () => startWave(0));
  }

  function startWave(k) {
    const st = STAGES[run.stage];
    run.wave = k; run.phase = 'wave'; run.waveT = 0; run.spawnT = 0.5;
    run.waveDur = st.waves[k].dur + W.p.s.waveExtra;
    W.p.shieldNow = W.p.s.shield;
    setState('play');
    if (k > 0) UI.toast(clockStr(), '다음 구간 시작');
    showHint(k === 0 && run.stage === 0);
  }

  function endWave() {
    W.clearHostiles(); W.vacuumAll();
    run.phase = 'clearing'; run.clearT = 1.3;
    UI.toast(['좋아요!', '순조로워요', '이대로만!'][run.wave % 3], '구간 통과');
    Sfx.play.select();
  }

  function startBoss() {
    const st = STAGES[run.stage];
    run.phase = 'boss'; run.addsT = 7;
    const b = Bosses.create(st.boss);
    const p = W.p;
    b.x = clamp(p.x + (p.x < ARENA.w / 2 ? 300 : -300), W.B.x0 + 80, W.B.x1 - 80); b.y = clamp(p.y - 120, W.B.y0 + 100, W.B.y1 - 40);
    setState('boss');
    Music.play(run.stage === 3 ? 'final' : 'boss');
    UI.bossIntro(b, () => { W.boss = b; W.shake(10); W.burst(b.x, b.y - b.r, 30, ['#ffffff', '#ff8a8a'], 300, 5, 0.6, 'puff'); setState('play'); });
  }

  function bossDefeated(b) {
    W.slowT = 1.1; Sfx.slowmo(true);
    W.shake(18); W.flashG = 0.5;
    Sfx.play.bigPop();
    for (let i = 0; i < 4; i++) setTimeout(() => { if (!W.boss) return; W.burst(b.x + rand(-b.r, b.r), b.y - rand(0, b.r * 2), 30, ['#ffffff', '#ffd23f', '#ff8a5a'], 420, 6, 0.8); Sfx.play.boom(); }, i * 180);
    W.text(b.x, b.y - b.r * 2.4, '퇴치!', '#ffd23f', 40, 1.8, { stroke: '#3a2a00', pop: 2 });
    for (let i = 0; i < 12; i++) W.pickups.push({ x: b.x + rand(-40, 40), y: b.y + rand(-30, 30), type: 'xp', big: true, val: 6 * W.p.s.xpMul, vx: rand(-200, 200), vy: rand(-200, 200), mag: false, t: 0 });
    W.pickups.push({ x: b.x, y: b.y, type: 'heal', vx: 0, vy: 0, mag: false, t: 0 });
    setTimeout(() => {
      W.boss = null; W.clearHostiles(); W.vacuumAll();
      run.phase = 'stageClear'; run.clearT = 1.6;
      UI.toast(['출근 완료!', '점심 클리어!', '업무 끝!', '퇴근!'][run.stage], ['도장 쾅. 지각 아님.', '배부르게 먹었어요.', '보고서 제출 완료.', '드디어 집에 갑니다.'][run.stage]);
    }, 900);
    Store.set('best', Math.max(Store.get('best', -1), run.stage));
  }

  function afterClearing() {
    if (run.phase === 'clearing') {
      openPick('wave', () => {
        const st = STAGES[run.stage];
        if (run.wave < st.waves.length - 1) startWave(run.wave + 1);
        else startBoss();
      });
    } else if (run.phase === 'stageClear') {
      if (run.stage >= STAGES.length - 1) return victory();
      W.p.hp = Math.min(W.p.s.maxHp, W.p.hp + 3);
      run.rerolls += 1;
      openPick('wave', () => startStage(run.stage + 1));
    }
  }

  // ── greetings ──────────────────────────────────────
  function buildCards(source) {
    const taken = run.taken, st = run.stage;
    const pool = GREETINGS.filter((g) => g.r !== 'curse' && (taken[g.id] || 0) < g.max);
    const wts = { common: 64 - st * 5, rare: 28 + st * 5, epic: 6 + st * 4 };
    const items = pool.map((g) => ({ g, w: wts[g.r] }));
    const out = [];
    while (out.length < 3 && items.length) { const it = weighted(items); out.push(it.g); items.splice(items.indexOf(it), 1); }
    if (source === 'wave' && !out.some((g) => g.r !== 'common')) {
      const better = pool.filter((g) => g.r !== 'common' && !out.includes(g));
      if (better.length) out[out.length - 1] = pick(better);
    }
    if (source === 'wave' && chance(0.42)) {
      const curses = GREETINGS.filter((g) => g.r === 'curse' && !(taken[g.id] > 0));
      if (curses.length) out.push(pick(curses));
    }
    return out;
  }

  function openPick(source, done) {
    setState('pick');
    Sfx.duck(true);
    const cards = buildCards(source);
    if (!cards.length) { Sfx.duck(false); done(); return; }
    const hasCurse = cards.some((g) => g.r === 'curse');
    const info = {
      title: source === 'level' ? `레벨 업! Lv ${W.p.lvl}` : (run.phase === 'stageClear' ? '역에 도착했어요' : '인사 타임'),
      sub: hasCurse ? '골목 끝 점집에서 수상한 인사가 들려옵니다…' : source === 'level' ? '카페인이 돌아요. 지나가던 이웃이 인사를 건넵니다.' : '잠깐 숨 돌리는 사이, 누군가 인사를 건넵니다.',
      taken: run.taken, rerolls: run.rerolls,
    };
    UI.pick(cards, info, (g) => {
      const p = W.p, s = p.s, prevCharges = s.dashCharges;
      g.apply(s, p);
      if (s.dashCharges > prevCharges) p.charges += s.dashCharges - prevCharges;
      run.taken[g.id] = (run.taken[g.id] || 0) + 1;
      W.picks++;
      Sfx.play.select(); Sfx.duck(false);
      p.cheer = 0.6;
      W.text(p.x, p.y - 64, g.text, g.r === 'curse' ? '#ff7ad9' : '#ffffff', 16, 1.4, { stroke: '#1f2a44', pop: 1.5 });
      W.ring(p.x, p.y - 16, 60, RARITY[g.r].color, 0.5, 4);
      W.burst(p.x, p.y - 16, 16, [RARITY[g.r].color, '#ffffff'], 200, 3, 0.6, 'spark');
      done();
    }, () => { run.rerolls--; openPick(source, done); });
  }

  function victory() {
    setState('result');
    Music.play('victory'); Sfx.play.win();
    Store.set('best', 4); Store.set('cleared', true);
    UI.result({ win: true, title: '퇴근했습니다', sub: '오늘도 정말 민첩한 하루였어요. 내일도 민첩한 하루 되세요.', stats: runStats(), taken: run.taken, reached: 4 }, resultHandlers);
  }
  function gameOver() {
    setState('result');
    Music.play(null); Sfx.play.lose();
    const st = STAGES[run.stage];
    UI.result({ win: false, title: st.death, sub: `${st.deathSub} ${clockStr()} ${st.name}에서 멈췄어요.`, stats: runStats(), taken: run.taken, reached: run.stage - 1 }, resultHandlers);
  }
  const resultHandlers = { restart: () => { UI.hideAll(); begin(); }, quit: toTitle };

  function runStats() {
    const sec = Math.floor((performance.now() - run.startedAt) / 1000);
    return [['플레이 시간', `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`], ['처치', W.kills], ['퍼펙트 회피', W.perfects], ['최고 민첩 지수', Math.round(W.maxAgi)], ['레벨', W.p.lvl], ['받은 인사', W.picks]];
  }

  // ── clock ──────────────────────────────────────────
  function clockMinutes() {
    const st = STAGES[run.stage];
    const s0 = st.start[0] * 60 + st.start[1], s1 = st.end[0] * 60 + st.end[1];
    const span = s1 - s0 - 4;
    const total = st.waves.reduce((a, w) => a + w.dur, 0);
    let done = 0; for (let i = 0; i < run.wave; i++) done += st.waves[i].dur;
    if (run.phase === 'boss' || run.phase === 'stageClear') return { m: s0 + span, left: s1 - (s0 + span) };
    const t = done + Math.min(run.waveT, run.waveDur) * (st.waves[run.wave].dur / run.waveDur);
    const m = s0 + (t / total) * span;
    return { m, left: s1 - m };
  }
  function clockStr() { return UI.fmtClock(clockMinutes().m); }

  // ── spawning ───────────────────────────────────────
  function spawnTick(dt) {
    const st = STAGES[run.stage], wv = st.waves[run.wave], p = W.p;
    run.spawnT -= dt;
    if (run.spawnT > 0) return;
    const k = clamp(run.waveT / run.waveDur, 0, 1);
    run.spawnT = lerp(wv.rate[0], wv.rate[1], k) / p.s.spawnMul;
    const alive = W.enemies.length + W.spawns.length;
    if (alive >= wv.cap * p.s.spawnMul) return;
    const opts = wv.pool.filter((e) => !e[2] || run.waveT >= e[2]).map((e) => ({ type: e[0], w: e[1] }));
    const choice = weighted(opts).type, d = ENEMIES[choice];
    const n = d.group || (chance(0.35 + k * 0.4) ? randi(2, 3) : 1);
    const a = rand(TAU), r = rand(380, 540);
    let x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
    x = clamp(x, W.B.x0 + 30, W.B.x1 - 30); y = clamp(y, W.B.y0 + 30, W.B.y1 - 20);
    if (d2(x, y, p.x, p.y) < 260 * 260) { x = clamp(p.x - Math.cos(a) * r, W.B.x0 + 30, W.B.x1 - 30); y = clamp(p.y - Math.sin(a) * r, W.B.y0 + 30, W.B.y1 - 20); }
    for (let i = 0; i < n; i++) W.queueSpawn(choice, x + rand(-30, 30), y + rand(-30, 30), 0.75 + i * 0.05);
  }

  // ── state ──────────────────────────────────────────
  function setState(s) {
    state = s;
    const inGame = ['play', 'clearing', 'pick', 'boss', 'station', 'paused'].includes(s);
    UI.$('hud').hidden = !inGame;
    UI.$('title').hidden = s !== 'title';
    document.body.classList.toggle('touch', Input.touchMode);
  }
  let hintTimer = null;
  function showHint(on) {
    const h = UI.$('hint');
    clearTimeout(hintTimer);
    h.style.opacity = on ? 1 : 0;
    if (on) hintTimer = setTimeout(() => (h.style.opacity = 0), 7000);
  }

  function begin() {
    Sfx.init();
    newRun();
    UI.hideAll();
    startStage(0);
  }
  function toTitle() {
    UI.hideAll();
    W.demo = true; W.newPlayer(); W.reset(0); W.p.s.fireInt = 0.38; W.p.s.range = 900;
    run = null;
    setState('title');
    Music.play('title');
    UI.route(UI.$('route'), Store.get('best', -1));
    const best = Store.get('best', -1);
    UI.$('best').textContent = Store.get('cleared', false) ? '퇴근 성공 기록 있음' : best >= 0 ? `최고 기록: ${STAGES[best].name} 클리어` : '';
  }
  function togglePause() {
    if (state === 'paused') {
      UI.pause(false); state = prevState; Sfx.duck(false);
    } else if (state === 'play') {
      prevState = state; state = 'paused'; Sfx.duck(true);
      UI.pause(true, { stage: run.stage, clock: clockStr(), stats: runStats(), taken: run.taken }, {
        resume: togglePause,
        restart: () => { UI.pause(false); Sfx.duck(false); begin(); },
        quit: () => { UI.pause(false); Sfx.duck(false); toTitle(); },
      });
    }
  }

  // ── per-frame ──────────────────────────────────────
  function demoAI(dt) {
    const p = W.p, t = W.T;
    const tx = ARENA.w / 2 + Math.cos(t * 0.5) * 300, ty = ARENA.h / 2 + Math.sin(t * 0.9) * 170;
    let mx = tx - p.x, my = ty - p.y; const m = Math.hypot(mx, my) || 1;
    mx /= m; my /= m;
    demoSpawnT -= dt;
    if (state === 'title' && demoSpawnT <= 0 && W.enemies.length < 9) {
      demoSpawnT = 0.9;
      const a = rand(TAU);
      W.spawnEnemy(pick(['pigeon', 'pigeon', 'alarm', 'scooter']), clamp(p.x + Math.cos(a) * 480, W.B.x0, W.B.x1), clamp(p.y + Math.sin(a) * 380, W.B.y0, W.B.y1));
    }
    let dash = false;
    for (const e of W.enemies) if (d2(e.x, e.y, p.x, p.y) < 70 * 70 && p.charges > 0 && chance(0.05)) dash = true;
    return { move: { x: mx * 0.75, y: my * 0.75 }, dash };
  }

  function frame(now) {
    const realDt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (Input.hit('Escape') || Input.hit('KeyP')) togglePause();
    if (state === 'title' && (Input.hit('Enter') || Input.hit('NumpadEnter'))) begin();
    else if (state === 'result' && (Input.hit('Enter') || Input.hit('NumpadEnter'))) { UI.hideAll(); begin(); }

    const active = (state === 'play' || state === 'title') && !frozen;
    if (active) {
      // time scale: perfect-dodge slow motion and hit stop
      let ts = 1;
      if (W.slowT > 0) { W.slowT -= realDt; ts = 0.22; if (W.slowT <= 0) Sfx.slowmo(false); }
      if (W.hitstop > 0) { W.hitstop -= realDt; ts = 0; }
      const dt = realDt * ts;
      const input = state === 'title' || autoPilot ? demoAI(dt) : { move: Input.move(), dash: Input.consumeDash() };
      W.update(dt, input);
      if (W.boss && W.boss.hp > 0) Bosses.update(W.boss, dt);
      else if (W.boss) { W.boss.flash = Math.sin(W.T * 40) > 0 ? 0.05 : 0; W.boss.r *= Math.exp(-0.4 * dt); }
      if (state === 'play') {
        if (run.phase === 'wave') { run.waveT += dt; spawnTick(dt); if (run.waveT >= run.waveDur) endWave(); }
        else if (run.phase === 'boss' && W.boss) {
          run.addsT -= dt;
          const adds = STAGES[run.stage].bossAdds;
          if (run.addsT <= 0 && W.enemies.length < 14) { run.addsT = 6; for (let i = 0; i < 3; i++) { const a = rand(TAU); W.queueSpawn(adds[0][0], W.p.x + Math.cos(a) * 420, W.p.y + Math.sin(a) * 320, 0.8); } }
        } else if (run.phase === 'clearing' || run.phase === 'stageClear') {
          run.clearT -= realDt;
          if (run.clearT <= 0 && W.pickups.length === 0) afterClearing();
        }
      }
      // events from the simulation
      while (W.events.length) {
        const ev = W.events.shift();
        if (state === 'title') continue;
        if (ev.type === 'dead') { W.slowT = 0; Sfx.slowmo(false); setTimeout(gameOver, 700); state = 'dying'; W.burst(W.p.x, W.p.y - 16, 30, ['#ff5a5a', '#ffffff'], 300, 4, 0.8); break; }
        if (ev.type === 'level') run.pending++;
        if (ev.type === 'bossDead') bossDefeated(ev.e);
      }
      if (state === 'play' && run && run.pending > 0 && run.phase !== 'clearing' && run.phase !== 'stageClear') {
        run.pending--; Sfx.play.levelUp();
        openPick('level', () => setState('play'));
      }
    } else if (state === 'dying') {
      W.update(realDt * 0.3, { move: { x: 0, y: 0 }, dash: false });
    }
    Render.camera(realDt, true);
    Render.draw(realDt, { noJoy: state !== 'play' });
    if (run && W.p && state !== 'title') {
      const cm = clockMinutes();
      UI.setHud({
        hp: W.p.hp, maxHp: W.p.s.maxHp, xp: W.p.xp / W.p.need, lv: W.p.lvl, agi: W.p.agi, clock: UI.fmtClock(cm.m),
        sub: run.phase === 'boss' ? '지금 아니면 늦어요!' : `${STAGE_SUB[run.stage]} ${Math.max(0, Math.ceil(cm.left))}분`,
        urgent: run.phase === 'boss', stage: run.stage, boss: W.boss, charges: W.p.charges,
      });
    }
    Input.endFrame();
    requestAnimationFrame(frame);
  }

  function boot() {
    const canvas = document.getElementById('game');
    Input.init(canvas);
    Render.init(canvas);
    UI.$('startBtn').addEventListener('click', begin);
    UI.$('pauseBtn').addEventListener('click', togglePause);
    const mute = UI.$('muteBtn');
    const syncMute = () => { const m = Sfx.muted; mute.querySelector('.wave').toggleAttribute('hidden', m); mute.querySelector('.x').toggleAttribute('hidden', !m); mute.setAttribute('aria-label', m ? '소리 켜기' : '소리 끄기'); };
    mute.addEventListener('click', () => { Sfx.init(); Sfx.toggleMute(); syncMute(); });
    syncMute();
    const dashBtn = UI.$('dashBtn');
    dashBtn.addEventListener('touchstart', (e) => { e.preventDefault(); Input.dashQueued = true; }, { passive: false });
    dashBtn.addEventListener('mousedown', () => { Input.dashQueued = true; });
    addEventListener('touchstart', () => { Input.touchMode = true; document.body.classList.add('touch'); Sfx.init(); }, { passive: true });
    addEventListener('keydown', () => { document.body.classList.remove('touch'); });
    addEventListener('pointerdown', () => Sfx.init(), { once: false });
    document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play') togglePause(); });
    toTitle();
    requestAnimationFrame((t) => { last = t; frame(t); });
    if (location.hash.startsWith('#shot')) setTimeout(() => scene(location.hash.slice(6)), 300);
  }

  // Staged scenes for screenshots and quick checks (#shot-play, #shot-pick, #shot-boss1 …)
  function scene(name) {
    if (name === 'title') {
      for (let i = 0; i < 260; i++) { const dt = 1 / 60; W.update(dt, demoAI(dt)); W.events.length = 0; Render.camera(dt, true); }
      frozen = true; return;
    }
    newRun(); UI.hideAll(); W.god = true; autoPilot = true;
    const p = W.p, s = p.s;
    const stage = { play: 0, pick: 0, boss1: 0, lunch: 1, boss2: 1, office: 2, boss3: 2, night: 3, boss4: 3, station: 1 }[name] ?? 0;
    W.reset(stage); run.stage = stage;
    s.shots = 3; s.auraR = 72; s.auraDmg = 14; p.lvl = 7; p.need = W.xpNeed(7); p.xp = p.need * 0.6; p.agi = 64; p.hp = 8;
    ['agile', 'agile', 'lively', 'lively', 'warm', 'strong', 'bright'].forEach((id) => (run.taken[id] = (run.taken[id] || 0) + 1));
    if (name === 'station') { autoPilot = false; Music.play(STAGES[stage].music); setState('station'); UI.station(stage, () => {}); return; }
    run.wave = 1; run.phase = 'wave'; run.waveT = 18; run.waveDur = 50;
    setState('play');
    const pool = STAGES[stage].waves[1].pool.map((e) => e[0]);
    for (let i = 0; i < 26; i++) { const a = rand(TAU), r = rand(140, 420); W.spawnEnemy(pick(pool), clamp(p.x + Math.cos(a) * r, W.B.x0, W.B.x1), clamp(p.y + Math.sin(a) * r * 0.7, W.B.y0, W.B.y1)); }
    for (let i = 0; i < 30; i++) W.pickups.push({ x: p.x + rand(-300, 300), y: p.y + rand(-200, 200), type: 'xp', big: chance(0.15), val: 1, vx: 0, vy: 0, mag: false, t: 0 });
    if (name.startsWith('boss')) {
      W.enemies.length = Math.min(W.enemies.length, 6);
      const b = Bosses.create(STAGES[stage].boss); b.enter = 0; b.waitT = 0.2; b.hp = b.maxHp * 0.62;
      if (innerWidth < 700) { b.x = p.x + 60; b.y = p.y - 170; } else { b.x = p.x + 260; b.y = p.y - 60; }
      W.boss = b; run.phase = 'boss';
    }
    // advance the simulation so the still frame has motion in it
    const steps = name.startsWith('boss') ? 200 : 150;
    for (let i = 0; i < steps; i++) {
      const dt = 1 / 60;
      W.update(dt, demoAI(dt));
      if (W.boss) Bosses.update(W.boss, dt);
      W.events.length = 0; W.slowT = 0; W.hitstop = 0;
      Render.camera(dt, true);
    }
    if (name === 'pick') { autoPilot = false; openPick('wave', () => setState('play')); }
    else { autoPilot = false; W.ts = 0; frozen = true; }
  }
  let frozen = false;

  return { boot, get state() { return state; }, get run() { return run; }, begin, _dbg: { startStage, startWave, startBoss, openPick, setState, endWave, newRun } };
})();

(document.fonts && document.fonts.load ? Promise.all([document.fonts.load('20px "Do Hyeon"'), document.fonts.load('20px "DotGothic16"')]).catch(() => {}) : Promise.resolve())
  .then(() => { Art.clearBubbles(); Game.boot(); });
