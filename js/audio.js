'use strict';
// All sound is synthesized with WebAudio: no sample files.
const Sfx = (() => {
  let ac = null, master, sfxBus, musicBus, musicFilter, revSend, delaySend, noiseBuf;
  let muted = Store.get('muted', false);
  let musicVol = 0.55, sfxVol = 0.8;
  const last = {};

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
    master = ac.createGain(); master.gain.value = muted ? 0 : 0.9;
    master.connect(comp); comp.connect(ac.destination);
    sfxBus = ac.createGain(); sfxBus.gain.value = sfxVol; sfxBus.connect(master);
    musicFilter = ac.createBiquadFilter(); musicFilter.type = 'lowpass'; musicFilter.frequency.value = 18000; musicFilter.Q.value = 0.7;
    musicBus = ac.createGain(); musicBus.gain.value = musicVol;
    musicBus.connect(musicFilter); musicFilter.connect(master);
    // reverb
    const rev = ac.createConvolver();
    const len = ac.sampleRate * 2.2, ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    rev.buffer = ir;
    revSend = ac.createGain(); revSend.gain.value = 0.32;
    revSend.connect(rev); rev.connect(master);
    // tempo delay for music leads
    const dl = ac.createDelay(1); dl.delayTime.value = 0.36;
    const fb = ac.createGain(); fb.gain.value = 0.32;
    const dlf = ac.createBiquadFilter(); dlf.type = 'lowpass'; dlf.frequency.value = 2400;
    delaySend = ac.createGain(); delaySend.gain.value = 0.28;
    delaySend.connect(dl); dl.connect(dlf); dlf.connect(fb); fb.connect(dl); dlf.connect(musicBus);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    Music._onReady();
  }

  function env(g, t, a, peak, dur, rel = 0.05) {
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dur + rel);
  }
  function tone({ f = 440, f2 = null, type = 'sine', dur = 0.12, vol = 0.3, a = 0.004, t = 0, dest = null, rev = 0, detune = 0, curve = 'exp' }) {
    if (!ac) return;
    const now = ac.currentTime + t;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, now); o.detune.value = detune;
    if (f2) { if (curve === 'exp') o.frequency.exponentialRampToValueAtTime(Math.max(f2, 1), now + dur); else o.frequency.linearRampToValueAtTime(f2, now + dur); }
    env(g, now, a, vol, dur);
    o.connect(g); g.connect(dest || sfxBus);
    if (rev) { const s = ac.createGain(); s.gain.value = rev; g.connect(s); s.connect(revSend); }
    o.start(now); o.stop(now + a + dur + 0.1);
  }
  function noise({ dur = 0.1, vol = 0.3, type = 'bandpass', f = 2000, f2 = null, q = 1, a = 0.002, t = 0, dest = null, rev = 0 }) {
    if (!ac) return;
    const now = ac.currentTime + t;
    const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, now); fl.Q.value = q;
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, now + dur);
    const g = ac.createGain(); env(g, now, a, vol, dur);
    s.connect(fl); fl.connect(g); g.connect(dest || sfxBus);
    if (rev) { const r = ac.createGain(); r.gain.value = rev; g.connect(r); r.connect(revSend); }
    s.start(now, Math.random()); s.stop(now + a + dur + 0.1);
  }
  // throttle identical sounds so swarms don't clip
  function gate(name, ms) { const n = performance.now(); if (last[name] && n - last[name] < ms) return false; last[name] = n; return true; }

  const play = {
    shoot() { if (!gate('shoot', 40)) return; const f = rand(620, 760); tone({ f, f2: f * 1.5, type: 'triangle', dur: 0.06, vol: 0.09 }); noise({ dur: 0.03, vol: 0.03, f: 5000, q: 2 }); },
    bigShoot() { tone({ f: 330, f2: 990, type: 'square', dur: 0.18, vol: 0.12, rev: 0.3 }); tone({ f: 660, f2: 1320, type: 'triangle', dur: 0.2, vol: 0.12 }); },
    hit() { if (!gate('hit', 30)) return; noise({ dur: 0.05, vol: 0.12, f: rand(1500, 2600), q: 1.5 }); tone({ f: 180, f2: 90, type: 'sine', dur: 0.06, vol: 0.12 }); },
    crit() { if (!gate('crit', 50)) return; tone({ f: 1400, f2: 2200, type: 'square', dur: 0.05, vol: 0.06 }); noise({ dur: 0.07, vol: 0.14, f: 3000, q: 1 }); },
    pop() { if (!gate('pop', 35)) return; const f = rand(380, 520); tone({ f, f2: f * 0.35, type: 'sine', dur: 0.12, vol: 0.22 }); noise({ dur: 0.08, vol: 0.1, type: 'lowpass', f: 1800, f2: 300 }); },
    bigPop() { tone({ f: 220, f2: 40, type: 'sine', dur: 0.5, vol: 0.5 }); noise({ dur: 0.6, vol: 0.35, type: 'lowpass', f: 3000, f2: 120, rev: 0.4 }); },
    dash() { noise({ dur: 0.16, vol: 0.18, type: 'bandpass', f: 600, f2: 3800, q: 2.5 }); tone({ f: 260, f2: 520, type: 'sine', dur: 0.1, vol: 0.06 }); },
    perfect() {
      noise({ dur: 0.35, vol: 0.2, type: 'highpass', f: 1200, f2: 9000, rev: 0.4 });
      [1318.5, 1975.5, 2637].forEach((f, i) => tone({ f, type: 'sine', dur: 0.6, vol: 0.13, t: i * 0.045, rev: 0.6 }));
      tone({ f: 110, f2: 55, type: 'sine', dur: 0.4, vol: 0.35 });
    },
    graze() { if (!gate('graze', 70)) return; tone({ f: 2400, f2: 3200, type: 'sine', dur: 0.05, vol: 0.05 }); },
    pickup(n = 0) { if (!gate('pick', 28)) return; const f = 880 * Math.pow(2, Math.min(n, 14) / 12); tone({ f, type: 'triangle', dur: 0.06, vol: 0.07 }); tone({ f: f * 2, type: 'sine', dur: 0.05, vol: 0.03, t: 0.03 }); },
    heal() { [523, 659, 784].forEach((f, i) => tone({ f, type: 'triangle', dur: 0.18, vol: 0.12, t: i * 0.06, rev: 0.3 })); },
    hurt() { tone({ f: 300, f2: 70, type: 'square', dur: 0.22, vol: 0.16 }); noise({ dur: 0.18, vol: 0.25, type: 'lowpass', f: 2500, f2: 200 }); },
    shield() { tone({ f: 900, f2: 300, type: 'triangle', dur: 0.3, vol: 0.16, rev: 0.5 }); noise({ dur: 0.2, vol: 0.12, f: 4000, q: 4 }); },
    levelUp() { [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone({ f, type: 'square', dur: 0.12, vol: 0.06, t: i * 0.06, rev: 0.4 })); },
    card() { noise({ dur: 0.12, vol: 0.1, type: 'bandpass', f: 1800, f2: 4200, q: 1.2 }); },
    select() { tone({ f: 660, type: 'triangle', dur: 0.08, vol: 0.12 }); tone({ f: 990, type: 'triangle', dur: 0.14, vol: 0.12, t: 0.07, rev: 0.4 }); },
    hover() { if (!gate('hover', 50)) return; tone({ f: 1200, type: 'sine', dur: 0.025, vol: 0.04 }); },
    ring() {
      if (!gate('ring', 120)) return;
      for (let i = 0; i < 6; i++) { tone({ f: i % 2 ? 1560 : 1250, type: 'square', dur: 0.035, vol: 0.05, t: i * 0.045 }); }
    },
    telegraph() { if (!gate('tele', 90)) return; tone({ f: 520, f2: 760, type: 'sine', dur: 0.15, vol: 0.06 }); },
    boom() { if (!gate('boom', 60)) return; tone({ f: 140, f2: 35, type: 'sine', dur: 0.35, vol: 0.4 }); noise({ dur: 0.35, vol: 0.28, type: 'lowpass', f: 2200, f2: 150 }); },
    bossShot() { if (!gate('bshot', 60)) return; tone({ f: 420, f2: 260, type: 'sawtooth', dur: 0.08, vol: 0.05 }); },
    laserCharge() { tone({ f: 120, f2: 900, type: 'sawtooth', dur: 0.9, vol: 0.06, curve: 'lin' }); },
    laser() { noise({ dur: 0.9, vol: 0.12, type: 'bandpass', f: 900, q: 0.8 }); tone({ f: 80, type: 'sawtooth', dur: 0.9, vol: 0.12 }); },
    shout() { tone({ f: 180, f2: 120, type: 'sawtooth', dur: 0.4, vol: 0.14 }); tone({ f: 184, f2: 118, type: 'square', dur: 0.4, vol: 0.08 }); noise({ dur: 0.3, vol: 0.1, f: 900, q: 0.7 }); },
    warn() { for (let i = 0; i < 3; i++) { tone({ f: 880, f2: 660, type: 'square', dur: 0.22, vol: 0.08, t: i * 0.36 }); } },
    zap() { if (!gate('zap', 40)) return; noise({ dur: 0.12, vol: 0.18, type: 'highpass', f: 3000 }); tone({ f: 1800, f2: 200, type: 'sawtooth', dur: 0.12, vol: 0.07 }); },
    win() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone({ f, type: 'square', dur: 0.16, vol: 0.07, t: i * 0.11, rev: 0.5 })); },
    lose() { [392, 370, 349, 262].forEach((f, i) => tone({ f, type: 'triangle', dur: 0.32, vol: 0.14, t: i * 0.26, rev: 0.4 })); },
    door() { tone({ f: 784, type: 'sine', dur: 0.4, vol: 0.12, rev: 0.4 }); tone({ f: 659, type: 'sine', dur: 0.5, vol: 0.12, t: 0.3, rev: 0.4 }); },
  };

  return {
    init, play,
    get ac() { return ac; },
    get ready() { return !!ac; },
    get muted() { return muted; },
    bus: () => ({ musicBus, revSend, delaySend, noiseBuf }),
    toggleMute() { muted = !muted; Store.set('muted', muted); if (master) master.gain.setTargetAtTime(muted ? 0 : 0.9, ac.currentTime, 0.05); return muted; },
    slowmo(on) { if (!ac) return; musicFilter.frequency.cancelScheduledValues(ac.currentTime); musicFilter.frequency.setTargetAtTime(on ? 520 : 18000, ac.currentTime, on ? 0.04 : 0.25); },
    duck(on) { if (!ac) return; musicBus.gain.setTargetAtTime(on ? musicVol * 0.35 : musicVol, ac.currentTime, 0.15); },
  };
})();

// ── music: a small step sequencer with generated phrases ─
const Music = (() => {
  const N = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
  const Q = { maj: [0, 4, 7], min: [0, 3, 7], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], '7': [0, 4, 7, 10], '6': [0, 4, 7, 9], m9: [0, 3, 7, 10, 14], add9: [0, 4, 7, 14], sus: [0, 5, 7] };
  const ch = (s) => { const m = s.match(/^([A-G][#b]?)(.*)$/); return { root: N[m[1]], tones: Q[m[2] || 'maj'] }; };
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  const SONGS = {
    title: { bpm: 94, key: 5, chords: ['Fmaj7', 'Em7', 'Dm7', 'Cmaj7', 'Bbmaj7', 'Am7', 'Gm7', 'C7'].map(ch.bind(null)),
      kick: 'x.........x.....', snare: '....x.......x...', hat: '..x...x...x...x.', bass: 'r..r..o...r.f...', arp: 'soft', lead: 0.45, pad: 1, seed: 7, swing: 0.12 },
    stage1: { bpm: 124, chords: ['Gmaj7', 'A6', 'F#m7', 'Bm7'].map(ch), kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.xx', bass: 'r.ro..r.r.ro..fr', arp: 'up', lead: 0.7, pad: 0.6, seed: 21, swing: 0.06 },
    stage2: { bpm: 132, chords: ['Bbmaj7', 'C6', 'Am7', 'Dm7', 'Gm7', 'C7', 'Fmaj7', 'F6'].map(ch), kick: 'x..x..x...x..x..', snare: '....x.......x..x', hat: '.xx.xx.x.xx.xx.x', bass: 'r..r..r.o..o.f.r', arp: 'bounce', lead: 0.75, pad: 0.5, seed: 33, swing: 0.1 },
    stage3: { bpm: 138, chords: ['Am', 'F', 'C', 'G', 'Dm', 'Am', 'E7', 'E7'].map(ch), kick: 'x...x...x...x..x', snare: '....x.......x...', hat: 'xxxxxxxxxxxxxxxx', bass: 'rrrrrrrrrrrrrrrr', arp: 'stab', lead: 0.6, pad: 0.4, seed: 54, swing: 0 },
    stage4: { bpm: 104, chords: ['Cm9', 'Abmaj7', 'Ebmaj7', 'Bb6'].map(ch), kick: 'x.......x.x.....', snare: '........x.......', hat: '..x...x...x...x.', bass: 'r.......r..o....', arp: 'night', lead: 0.5, pad: 1, seed: 66, swing: 0.15 },
    boss: { bpm: 164, chords: ['Em', 'C', 'D', 'B7', 'Em', 'C', 'Am', 'B7'].map(ch), kick: 'x...x...x...x...', snare: '....x.......x.x.', hat: 'x.xxx.xxx.xxx.xx', bass: 'roroo.rorooroo.r', arp: 'drive', lead: 0.85, pad: 0.35, seed: 91, swing: 0 },
    final: { bpm: 172, chords: ['Cm', 'Ab', 'Bb', 'G7', 'Cm', 'Ab', 'Fm', 'G7'].map(ch), kick: 'x..xx...x..xx...', snare: '....x.......x.xx', hat: 'xxxxxxxxxxxxxxxx', bass: 'rorororororororo', arp: 'drive', lead: 0.9, pad: 0.4, seed: 113, swing: 0 },
    victory: { bpm: 108, chords: ['Fmaj7', 'G6', 'Em7', 'Am7', 'Dm7', 'G7', 'Cmaj7', 'Cmaj7'].map(ch), kick: 'x.....x...x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', bass: 'r..o..r...r.f...', arp: 'up', lead: 0.6, pad: 1, seed: 140, swing: 0.1 },
  };

  let cur = null, curName = null, step = 0, nextT = 0, timer = null, songGain = null, pending = null;

  function genLead(song) {
    // 2 phrases of 4 bars, built from chord tones with a seeded rhythm cell
    const r = seeded(song.seed);
    const cells = [[0, 3, 6, 10, 12], [0, 2, 4, 7, 10, 14], [2, 4, 6, 8, 11], [0, 6, 8, 12, 14], [0, 3, 4, 8, 11, 12]];
    const bars = song.chords.length;
    const phrase = [];
    let prev = 72;
    const cellA = cells[Math.floor(r() * cells.length)], cellB = cells[Math.floor(r() * cells.length)];
    for (let b = 0; b < Math.max(bars, 8); b++) {
      const c = song.chords[b % bars];
      const cell = (b % 4 === 3) ? [0, 4, 8] : (b % 2 ? cellB : cellA);
      const notes = [];
      for (const s of cell) {
        const pool = [];
        for (let o = 60; o <= 84; o += 12) for (const t of c.tones) pool.push(o + ((c.root + t) % 12));
        pool.sort((a, b2) => Math.abs(a - prev) - Math.abs(b2 - prev));
        let n = pool[Math.floor(r() * Math.min(3, pool.length))];
        if (r() < 0.2) n += r() < 0.5 ? 2 : -1;
        prev = n;
        notes.push({ s, n, len: (b % 4 === 3 && s === 8) ? 6 : 2 });
      }
      phrase.push(notes);
    }
    // answer phrase repeats the call, last bar resolves
    return phrase;
  }

  function onReady() { if (pending) { const p = pending; pending = null; play(p); } }

  function play(name) {
    if (curName === name) return;
    if (!Sfx.ready) { pending = name; return; }
    const ac = Sfx.ac, { musicBus } = Sfx.bus();
    if (songGain) { const g = songGain; g.gain.setTargetAtTime(0, ac.currentTime, 0.25); setTimeout(() => g.disconnect(), 1500); }
    curName = name;
    if (!name) { cur = null; return; }
    cur = Object.assign({}, SONGS[name]);
    cur.leadPhr = genLead(cur);
    songGain = ac.createGain(); songGain.gain.value = 0.0001; songGain.connect(musicBus);
    songGain.gain.setTargetAtTime(1, ac.currentTime, 0.3);
    step = 0; nextT = ac.currentTime + 0.08;
    if (!timer) timer = setInterval(tick, 25);
  }

  function tick() {
    if (!cur) return;
    const ac = Sfx.ac;
    const spb = 60 / cur.bpm / 4;
    while (nextT < ac.currentTime + 0.14) {
      const swing = (step % 2) ? spb * cur.swing : 0;
      schedule(step, nextT + swing, spb);
      nextT += spb; step++;
    }
  }

  function v(dest, t, { f, type = 'sawtooth', dur, vol, a = 0.005, cutoff = 2000, res = 1, det = 0, send = 0, dsend = 0, fenv = 0 }) {
    const ac = Sfx.ac, { revSend, delaySend } = Sfx.bus();
    const o = ac.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det;
    const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = res;
    fl.frequency.setValueAtTime(cutoff + fenv, t); fl.frequency.exponentialRampToValueAtTime(Math.max(cutoff, 60), t + Math.min(dur, 0.25));
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + a);
    g.gain.setValueAtTime(vol, t + Math.max(a, dur * 0.6)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.08);
    o.connect(fl); fl.connect(g); g.connect(dest);
    if (send) { const s = ac.createGain(); s.gain.value = send; g.connect(s); s.connect(revSend); }
    if (dsend) { const s = ac.createGain(); s.gain.value = dsend; g.connect(s); s.connect(delaySend); }
    o.start(t); o.stop(t + dur + 0.15);
  }
  function drum(t, kind, vel = 1) {
    const ac = Sfx.ac, { noiseBuf, revSend } = Sfx.bus(), dest = songGain;
    if (kind === 'k') {
      const o = ac.createOscillator(), g = ac.createGain();
      o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
      g.gain.setValueAtTime(0.85 * vel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
      o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.35);
    } else {
      const s = ac.createBufferSource(); s.buffer = noiseBuf;
      const fl = ac.createBiquadFilter(), g = ac.createGain();
      if (kind === 's') { fl.type = 'bandpass'; fl.frequency.value = 1900; fl.Q.value = 0.7; g.gain.setValueAtTime(0.32 * vel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        const o = ac.createOscillator(), og = ac.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.08);
        og.gain.setValueAtTime(0.25 * vel, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.1); o.connect(og); og.connect(dest); o.start(t); o.stop(t + 0.12);
        const r = ac.createGain(); r.gain.value = 0.25; g.connect(r); r.connect(revSend);
      } else { fl.type = 'highpass'; fl.frequency.value = 7500; g.gain.setValueAtTime(0.09 * vel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045); }
      s.connect(fl); fl.connect(g); g.connect(dest); s.start(t, Math.random() * 0.5); s.stop(t + 0.25);
    }
  }

  function schedule(st, t, spb) {
    const s = cur, sixteen = st % 16, bar = Math.floor(st / 16), c = s.chords[bar % s.chords.length], dest = songGain;
    const root = 36 + ((c.root + 12 - 0) % 12);
    // drums
    if (s.kick[sixteen] === 'x') drum(t, 'k');
    if (s.snare[sixteen] === 'x') drum(t, 's', bar % 4 === 3 && sixteen > 12 ? 0.8 : 1);
    if (s.hat[sixteen] === 'x') drum(t, 'h', sixteen % 4 === 2 ? 1.3 : 0.8);
    // bass
    const bp = s.bass[sixteen];
    if (bp !== '.') {
      const n = bp === 'o' ? root + 12 : bp === 'f' ? root + 7 : root;
      v(dest, t, { f: mtof(n), type: 'sawtooth', dur: spb * 1.6, vol: 0.2, cutoff: 380, fenv: 900, res: 4 });
      v(dest, t, { f: mtof(n - 12), type: 'sine', dur: spb * 1.6, vol: 0.18, cutoff: 400 });
    }
    // pad on bar start
    if (sixteen === 0 && s.pad > 0) {
      for (const tn of c.tones.slice(0, 4)) {
        let n = 52 + ((c.root + tn + 12 - 4) % 12);
        if (tn > 12) n += 12;
        v(dest, t, { f: mtof(n), type: 'sawtooth', dur: spb * 15, vol: 0.035 * s.pad, a: 0.25, cutoff: 1100, det: -8, send: 0.5 });
        v(dest, t, { f: mtof(n), type: 'sawtooth', dur: spb * 15, vol: 0.035 * s.pad, a: 0.25, cutoff: 1100, det: 9 });
      }
    }
    // arp / chord texture
    const tones = c.tones.map((tn) => 60 + ((c.root + tn) % 12));
    tones.sort((a, b) => a - b);
    const A = s.arp;
    if (A === 'up' && sixteen % 2 === 0) { const n = tones[(sixteen / 2) % tones.length] + (sixteen >= 8 ? 12 : 0); v(dest, t, { f: mtof(n), type: 'square', dur: spb * 0.8, vol: 0.035, cutoff: 2600, dsend: 0.4 }); }
    if (A === 'soft' && sixteen % 4 === 2) { const n = tones[(sixteen / 4 | 0) % tones.length] + 12; v(dest, t, { f: mtof(n), type: 'triangle', dur: spb * 2, vol: 0.05, cutoff: 3000, send: 0.5, dsend: 0.5 }); }
    if (A === 'bounce' && (sixteen % 4 === 2 || sixteen % 4 === 3)) { for (const n of tones) v(dest, t, { f: mtof(n + 12), type: 'square', dur: spb * 0.5, vol: 0.022, cutoff: 3200 }); }
    if (A === 'stab' && (sixteen === 0 || sixteen === 3 || sixteen === 6 || sixteen === 10)) { for (const n of tones) v(dest, t, { f: mtof(n), type: 'sawtooth', dur: spb * 0.7, vol: 0.03, cutoff: 1800, fenv: 2500, res: 3 }); }
    if (A === 'night' && sixteen % 2 === 0) { const seq = [0, 2, 1, 3, 2, 1, 3, 0]; const n = tones[seq[sixteen / 2] % tones.length] + 12; v(dest, t, { f: mtof(n), type: 'triangle', dur: spb * 1.5, vol: 0.04, cutoff: 1600, send: 0.5, dsend: 0.6 }); }
    if (A === 'drive' && sixteen % 2 === 0) { const n = tones[(sixteen / 2) % tones.length] + (bar % 2 ? 12 : 0); v(dest, t, { f: mtof(n), type: 'square', dur: spb * 0.6, vol: 0.028, cutoff: 3000, dsend: 0.25 }); }
    // lead melody, skipped in every other 8-bar section for breathing room
    if (s.lead > 0 && Math.floor(bar / 8) % 2 === 0) {
      const ph = s.leadPhr[bar % s.leadPhr.length];
      for (const nt of ph) if (nt.s === sixteen) {
        v(dest, t, { f: mtof(nt.n), type: 'square', dur: spb * nt.len, vol: 0.055 * s.lead, cutoff: 2400, a: 0.01, dsend: 0.45, send: 0.2 });
        v(dest, t, { f: mtof(nt.n + 12), type: 'sine', dur: spb * nt.len, vol: 0.03 * s.lead, a: 0.01 });
      }
    }
  }

  return { play, _onReady: onReady, get current() { return curName; } };
})();
