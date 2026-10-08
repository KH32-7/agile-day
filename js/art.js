'use strict';
// Flat illustration drawn from primitives. Light comes from the upper left;
// every form gets a base tone, a shade tone on its lower right, and one highlight.
let TINT = null; // when set, every fill uses this color (hit flash, dash afterimage)
const C = (col) => TINT || col;
const FONT_D = '"Do Hyeon", "Black Han Sans", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';

const Art = {};
(() => {
  // ── primitives ─────────────────────────────────────
  const circ = (c, x, y, r, col) => { c.fillStyle = C(col); c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); };
  const ell = (c, x, y, rx, ry, col, rot = 0) => { c.fillStyle = C(col); c.beginPath(); c.ellipse(x, y, Math.max(rx, 0.01), Math.max(ry, 0.01), rot, 0, TAU); c.fill(); };
  const rr = (c, x, y, w, h, r, col) => { c.fillStyle = C(col); c.beginPath(); c.roundRect(x, y, w, h, r); c.fill(); };
  const poly = (c, pts, col) => { c.fillStyle = C(col); c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); c.fill(); };
  const line = (c, x1, y1, x2, y2, w, col, cap = 'round') => { c.strokeStyle = C(col); c.lineWidth = w; c.lineCap = cap; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); };
  const arcS = (c, x, y, r, a0, a1, w, col) => { c.strokeStyle = C(col); c.lineWidth = w; c.lineCap = 'round'; c.beginPath(); c.arc(x, y, r, a0, a1); c.stroke(); };
  const shadow = (c, x, y, rx, ry, a = 0.22) => { if (TINT) return; c.fillStyle = `rgba(20,18,40,${a})`; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill(); };
  Object.assign(Art, { circ, ell, rr, poly, line, arcS, shadow });

  // angry / smug / tired eye with brow
  function eye(c, x, y, s, mood = 'angry', look = 0, blink = 1) {
    ell(c, x, y, s, s * 1.1 * blink, '#ffffff');
    if (blink > 0.3) circ(c, x + look * s * 0.35, y + s * 0.15, s * 0.58, '#1c1b2b');
    if (blink > 0.3 && !TINT) circ(c, x + look * s * 0.35 - s * 0.2, y - s * 0.12, s * 0.18, '#ffffff');
    if (mood === 'angry') line(c, x - s * 1.1, y - s * 1.55, x + s * 1.0, y - s * 0.9, s * 0.55, '#1c1b2b');
    if (mood === 'angryL') line(c, x + s * 1.1, y - s * 1.55, x - s * 1.0, y - s * 0.9, s * 0.55, '#1c1b2b');
    if (mood === 'smug') { c.save(); c.beginPath(); c.rect(x - s * 1.3, y - s * 1.4, s * 2.6, s * 1.15); c.clip(); ell(c, x, y, s * 1.02, s * 1.12, '#e9e4f2'); c.restore(); }
  }
  Art.eye = eye;

  // ── player: office worker 민첩 ─────────────────────
  Art.player = (c, p, T) => {
    const run = p.moveAmt || 0, ph = p.runPhase || 0;
    c.save();
    c.translate(p.x, p.y);
    shadow(c, 0, 0, 14, 4.5);
    c.scale(p.face, 1);
    const sq = p.squash || 0;
    c.scale(1 + sq, 1 - sq);
    const bob = -Math.abs(Math.sin(ph)) * 3 * run;
    const lean = (p.dashT > 0 ? 0.38 : run * 0.13);
    const hipY = -14 + bob;
    const swing = Math.sin(ph) * 0.95 * run;
    // back arm + back leg
    const leg = (ang, col, shoe) => {
      const fx = Math.sin(ang) * 13, fy = Math.cos(ang) * 13;
      line(c, 0, hipY, fx, hipY + fy, 6.2, col);
      ell(c, fx + 2.2, hipY + fy + 1, 4.6, 2.6, shoe);
    };
    leg(-swing, '#20232e', '#d9dce6');
    c.save();
    c.translate(0, hipY); c.rotate(lean);
    // back arm
    const armA = swing * 1.1;
    line(c, -2, -14, -2 + Math.sin(armA) * 10, -14 + Math.cos(armA) * 10, 5, '#d9deeb');
    circ(c, -2 + Math.sin(armA) * 11, -14 + Math.cos(armA) * 11, 2.6, '#e8b48e');
    c.restore();
    leg(swing, '#2c3040', '#f4f6fb');
    c.save();
    c.translate(0, hipY); c.rotate(lean);
    // torso
    rr(c, -8, -19, 16, 20, 6, '#f2f4f9');
    rr(c, 2, -18, 6, 18, 4, '#d6dcea');
    rr(c, -8, -2, 16, 3.2, 1.5, '#1f2230');
    // lanyard + badge
    if (!TINT) { c.strokeStyle = '#1b6fd0'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-4, -18); c.lineTo(-3, -9); c.moveTo(3, -18); c.lineTo(-1, -9); c.stroke(); }
    rr(c, -5, -9.5, 6, 7.5, 1.2, '#ffffff');
    rr(c, -5, -9.5, 6, 2.4, 1.2, '#1b6fd0');
    // tie, flutters against velocity
    c.save();
    c.translate(1.5, -18);
    c.rotate(p.tieAng || 0);
    poly(c, [-2.2, 0, 2.2, 0, 1.6, 3, -1.6, 3], '#1e2f6b');
    poly(c, [-1.6, 3, 1.6, 3, 2.8, 12, 0, 15, -2.8, 12], '#243a85');
    if (!TINT) line(c, -2, 7, 2.4, 5, 1, '#5e78d6');
    c.restore();
    // front arm
    const fa = -swing * 1.1 + (p.dashT > 0 ? -1.2 : 0);
    line(c, 3, -15, 3 + Math.sin(fa) * 10, -15 + Math.cos(fa) * 10, 5.2, '#eef1f8');
    circ(c, 3 + Math.sin(fa) * 11.2, -15 + Math.cos(fa) * 11.2, 2.8, '#f2c39d');
    // head
    const hy = -29;
    circ(c, 1, hy, 10.5, '#f4c8a3');
    ell(c, 5, hy + 3, 6, 5, '#ebb68e');
    circ(c, -6.5, hy + 1, 2.6, '#eab28b');
    // hair: dome plus three swept tufts
    c.fillStyle = C('#1d1c28');
    c.beginPath();
    c.arc(0, hy - 1, 11, Math.PI * 0.95, Math.PI * 2.05);
    c.lineTo(11.5, hy - 2); c.lineTo(8, hy - 5); c.lineTo(5, hy - 1.5); c.lineTo(2, hy - 5.5); c.lineTo(-3, hy - 1); c.lineTo(-10, hy + 4); c.closePath(); c.fill();
    poly(c, [-6, hy - 10, -1, hy - 16, 2, hy - 10], '#1d1c28');
    poly(c, [1, hy - 10, 8, hy - 14.5, 8, hy - 8], '#1d1c28');
    // face
    const bl = p.blink != null ? p.blink : 1;
    if (p.hurtT > 0) {
      line(c, 4, hy + 0.5, 8, hy + 3, 1.6, '#1c1b2b'); line(c, 8, hy + 0.5, 4, hy + 3, 1.6, '#1c1b2b');
    } else {
      ell(c, 6.3, hy + 1.6, 1.7, 2.3 * bl, '#1c1b2b');
      if (!TINT && bl > 0.5) circ(c, 5.8, hy + 0.8, 0.6, '#fff');
      line(c, 4.2, hy - 2.6, 8.6, hy - 2.2, 1.3, '#1d1c28');
    }
    if (!TINT) ell(c, 4, hy + 5, 2.2, 1.2, 'rgba(240,120,120,0.45)');
    if (p.dashT > 0 || p.cheer > 0) { ell(c, 8.2, hy + 6, 2, 2.4, '#7a2b2b'); }
    else arcS(c, 7.6, hy + 4.6, 2.2, 0.2, 1.9, 1.2, '#7a2b2b');
    c.restore();
    c.restore();
  };

  // ── stage 1 enemies ────────────────────────────────
  Art.pigeon = (c, e, T) => {
    const s = e.r / 13;
    c.save(); c.translate(e.x, e.y); shadow(c, 0, 0, 12 * s, 4 * s); c.scale(e.face * s, s);
    const hop = Math.abs(Math.sin(e.t * 14)) * 2.5;
    const flap = Math.sin(e.t * 22) * 0.6;
    line(c, -3, -3 - hop, -4, 0, 1.6, '#d9748a'); line(c, 3, -3 - hop, 4, 0, 1.6, '#d9748a');
    c.translate(0, -hop);
    poly(c, [-10, -12, -19, -8, -17, -14], '#5c6273');
    ell(c, -1, -11, 12, 9, '#8b91a2');
    ell(c, 2, -8, 8, 6, '#a7acba');
    c.save(); c.translate(-2, -14); c.rotate(-0.4 + flap);
    ell(c, -4, 0, 10, 5, '#6c7284'); ell(c, -9, 1, 5, 3, '#585e70');
    c.restore();
    const hb = Math.sin(e.t * 14) * 2;
    ell(c, 8 + hb, -17, 5.5, 4.5, '#5f8f7e');
    ell(c, 9 + hb, -15.5, 4.5, 3, '#86669c');
    circ(c, 10 + hb, -22, 5.6, '#959bab');
    poly(c, [14.5 + hb, -23, 19.5 + hb, -21.5, 14.5 + hb, -20], '#3a3d4a');
    circ(c, 14.3 + hb, -23.6, 1.3, '#e9ebf0');
    circ(c, 11.5 + hb, -23, 2.1, '#f08a2b'); circ(c, 11.9 + hb, -23, 1.1, '#1c1b2b');
    line(c, 8.5 + hb, -26.5, 13.5 + hb, -24.5, 1.5, '#1c1b2b');
    c.restore();
  };

  function clockFace(c, r, T, angry = true, open = 0) {
    circ(c, 0, 0, r, '#fbf8f2');
    if (!TINT) for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; line(c, Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.82, Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.92, i % 3 ? 0.8 : 1.6, '#4a4658'); }
    const d = new Date();
    const hA = ((d.getHours() % 12) + d.getMinutes() / 60) / 12 * TAU - Math.PI / 2;
    const mA = (d.getMinutes() / 60) * TAU - Math.PI / 2;
    const sA = ((d.getSeconds() + d.getMilliseconds() / 1000) / 60) * TAU - Math.PI / 2;
    line(c, 0, 0, Math.cos(hA) * r * 0.45, Math.sin(hA) * r * 0.45, 2, '#2a2838');
    line(c, 0, 0, Math.cos(mA) * r * 0.7, Math.sin(mA) * r * 0.7, 1.4, '#2a2838');
    line(c, 0, 0, Math.cos(sA) * r * 0.78, Math.sin(sA) * r * 0.78, 0.7, '#e5463b');
    circ(c, 0, 0, 1.2, '#2a2838');
    eye(c, -r * 0.38, -r * 0.18, r * 0.17, angry ? 'angry' : 'smug', 0.5);
    eye(c, r * 0.38, -r * 0.18, r * 0.17, angry ? 'angryL' : 'smug', 0.5);
    if (open > 0) ell(c, 0, r * 0.45, r * 0.24, r * 0.16 * open + r * 0.04, '#8e2a33');
    else arcS(c, 0, r * 0.62, r * 0.22, -2.6, -0.5, 1.4, '#2a2838');
  }

  Art.alarm = (c, e, T) => {
    const s = e.r / 15;
    const tele = e.tele || 0;
    const jx = tele > 0 ? Math.sin(T * 90) * 1.6 : 0;
    c.save(); c.translate(e.x + jx, e.y); shadow(c, 0, 0, 13 * s, 4 * s); c.scale(s, s);
    const step = Math.sin(e.t * 12) * 2;
    line(c, -6, -6, -8 - step, 0, 2.2, '#3a2a30'); line(c, 6, -6, 8 + step, 0, 2.2, '#3a2a30');
    const ring = tele > 0 ? Math.sin(T * 80) * 0.25 : 0;
    c.save(); c.translate(0, -17);
    c.save(); c.rotate(-0.65 + ring); ell(c, 0, -15.5, 6.5, 5, '#f2b33d'); rr(c, -6.5, -12.5, 13, 2.2, 1, '#c98a1b'); c.restore();
    c.save(); c.rotate(0.65 - ring); ell(c, 0, -15.5, 6.5, 5, '#f2b33d'); rr(c, -6.5, -12.5, 13, 2.2, 1, '#c98a1b'); c.restore();
    line(c, 0, -14, ring * 18, -19, 1.8, '#3a2a30'); circ(c, ring * 18, -19.5, 2, '#3a2a30');
    circ(c, 0, 0, 14, '#c93a31'); circ(c, -1, -1, 13, '#e5463b');
    if (!TINT) ell(c, -6, -8, 4, 2.4, 'rgba(255,255,255,0.35)', -0.6);
    clockFace(c, 10.2, T, true, tele > 0 ? 1 : 0);
    c.restore();
    c.restore();
  };

  Art.scooter = (c, e, T) => {
    const s = e.r / 14;
    c.save(); c.translate(e.x, e.y); shadow(c, 0, 0, 16 * s, 4 * s); c.scale(e.face * s, s);
    const charging = e.state === 'charge';
    if (charging && !TINT) for (let i = 0; i < 3; i++) line(c, -22 - i * 4, -6 - i * 5, -30 - i * 8, -6 - i * 5, 1.5, 'rgba(255,255,255,0.6)');
    c.save(); if (charging) c.rotate(0.12);
    circ(c, -12, -4, 4.6, '#1d1f29'); circ(c, -12, -4, 1.8, '#8b90a0');
    circ(c, 12, -4, 4.6, '#1d1f29'); circ(c, 12, -4, 1.8, '#8b90a0');
    rr(c, -14, -9, 25, 4.5, 2, '#1ea583');
    rr(c, -13, -9.5, 22, 2.4, 1.2, '#2ed3a8');
    line(c, 10, -8, 7.5, -29, 3.4, '#1ea583');
    line(c, 3, -30, 12, -30, 2.6, '#2a2d3a');
    poly(c, [2, -30, -1, -36, 4, -31], '#2a2d3a'); poly(c, [12, -30, 16, -36, 13, -31], '#2a2d3a');
    circ(c, 8.6, -23, 4.4, '#2a2d3a');
    circ(c, 8.6, -23, 3.4, e.tele > 0 ? '#ff5a4a' : '#ffe066');
    circ(c, 9.4, -22.6, 1.6, '#1c1b2b');
    line(c, 5.2, -27.6, 11, -26, 1.4, '#1c1b2b');
    c.restore();
    c.restore();
  };

  // ── stage 2 enemies ────────────────────────────────
  Art.bike = (c, e, T) => {
    const s = e.r / 16;
    c.save(); c.translate(e.x, e.y); shadow(c, 0, 0, 18 * s, 4.5 * s); c.scale(e.face * s, s);
    const charging = e.state === 'charge';
    if (charging) c.rotate(0.1);
    circ(c, -11, -5, 5.5, '#1d1f29'); circ(c, -11, -5, 2.2, '#9aa0b0');
    circ(c, 13, -5, 5.5, '#1d1f29'); circ(c, 13, -5, 2.2, '#9aa0b0');
    poly(c, [-15, -10, 6, -10, 14, -14, 15, -6, -14, -6], '#b5302a');
    rr(c, -12, -18, 18, 9, 4, '#e2483d');
    rr(c, -10, -21, 11, 4, 2, '#2a2d3a');
    line(c, 11, -10, 14, -26, 3, '#2a2d3a');
    line(c, 10, -27, 17, -27, 2.4, '#2a2d3a');
    rr(c, -21, -38, 17, 17, 2.5, '#f05a4f');
    rr(c, -21, -38, 17, 4, 2, '#ffffff');
    rr(c, -15, -31, 5, 5, 1, '#ffffff');
    circ(c, 15.5, -19, 3.6, '#2a2d3a'); circ(c, 15.5, -19, 2.7, e.tele > 0 ? '#ff5a4a' : '#ffe066'); circ(c, 16.2, -18.8, 1.2, '#1c1b2b');
    line(c, 12.5, -23.2, 18, -21.5, 1.3, '#1c1b2b');
    c.restore();
  };

  Art.tteok = (c, e, T) => {
    const s = e.r / 15;
    c.save(); c.translate(e.x, e.y); shadow(c, 0, 0, 14 * s, 4.5 * s); c.scale(e.face * s, s);
    const sqz = Math.sin(e.t * 9) * 0.08;
    c.scale(1 + sqz, 1 - sqz);
    c.translate(0, -13);
    c.fillStyle = C('#c92f28'); c.beginPath();
    for (let i = 0; i <= 28; i++) { const a = (i / 28) * TAU; const rr2 = 14 * (1 + 0.07 * Math.sin(a * 5 + e.t * 5)); c.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2 * 0.92); }
    c.fill();
    ell(c, -2, -2, 12, 11, '#dc3a2f');
    if (!TINT) ell(c, -6, -7, 4.5, 2.6, 'rgba(255,190,170,0.6)', -0.5);
    const cake = (x, y, a) => { c.save(); c.translate(x, y); c.rotate(a); rr(c, -7, -2.6, 14, 5.2, 2.6, '#f3e5cf'); ell(c, 6.5, 0, 1.6, 2.6, '#dfc9a6'); rr(c, -7, -2.6, 6, 5.2, 2.6, '#d9443a'); c.restore(); };
    cake(-10, 4, -0.6); cake(11, 2, 0.5); cake(4, -12, -1.3);
    poly(c, [-13, -6, -6, -14, -4, -6], '#e8c38d');
    eye(c, -2, 0, 2.8, 'angry', 0.6); eye(c, 6, 0, 2.8, 'angryL', 0.6);
    arcS(c, 2, 7, 2.4, Math.PI + 0.4, -0.4, 1.4, '#5b1717');
    c.restore();
  };

  Art.ghost = (c, e, T) => {
    const s = e.r / 14;
    const fl = Math.sin(e.t * 3) * 3;
    c.save(); c.translate(e.x, e.y); shadow(c, 0, 0, 10 * s, 3 * s, 0.14); c.scale(e.face * s, s); c.translate(0, -20 + fl);
    c.globalAlpha *= 0.92;
    c.fillStyle = C('#c9c0f2'); c.beginPath();
    c.arc(0, -4, 13, Math.PI, 0);
    c.lineTo(13, 10);
    for (let i = 0; i <= 6; i++) { const x = 13 - (i / 6) * 26; c.lineTo(x, 10 + Math.sin(i * 1.7 + e.t * 7) * 3 + (i % 2 ? 3 : 0)); }
    c.closePath(); c.fill();
    ell(c, -3, -6, 7, 8, '#ddd7fb');
    c.globalAlpha /= 0.92;
    const spiral = (x, y) => { if (TINT) { circ(c, x, y, 2.5, '#fff'); return; } c.strokeStyle = '#4b3f8f'; c.lineWidth = 1; c.beginPath(); for (let i = 0; i < 26; i++) { const a = i * 0.55 + e.t * 4, r2 = i * 0.12; c.lineTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2); } c.stroke(); };
    spiral(-4, -4); spiral(5, -4);
    c.strokeStyle = C('#4b3f8f'); c.lineWidth = 1.2; c.beginPath();
    for (let i = 0; i <= 8; i++) c.lineTo(-3 + i * 0.9, 3 + Math.sin(i * 1.6 + e.t * 9) * 0.9); c.stroke();
    line(c, 12, 2, 16, -9, 1.6, '#b9bfcc'); ell(c, 16.5, -11, 2.4, 3.2, '#d8dce6', 0.3);
    c.restore();
  };

  // ── stage 3 enemies ────────────────────────────────
  Art.spam = (c, e, T) => {
    const s = e.r / 12;
    const fl = Math.sin(e.t * 4) * 2;
    c.save(); c.translate(e.x, e.y); shadow(c, 0, 0, 10 * s, 3 * s, 0.15); c.scale(e.face * s, s); c.translate(0, -18 + fl);
    const w = Math.sin(e.t * 26) * 0.6;
    c.save(); c.translate(-10, -2); c.rotate(-0.3 - w); poly(c, [0, 0, -14, -8, -10, 0, -13, 5], '#4b2f6e'); c.restore();
    c.save(); c.translate(10, -2); c.rotate(0.3 + w); poly(c, [0, 0, 14, -8, 10, 0, 13, 5], '#4b2f6e'); c.restore();
    rr(c, -11, -8, 22, 16, 2.5, '#f6f7fb');
    poly(c, [-11, 8, 0, 0, 11, 8], '#e2e5ee');
    const open = (Math.sin(e.t * 10) * 0.5 + 0.5) * 6;
    poly(c, [-11, -8, 11, -8, 0, 2 + open * 0.3], '#d5d9e4');
    if (open > 1) { poly(c, [-8, -6, 8, -6, 0, -6 + open], '#b4314a'); if (!TINT) { for (let i = 0; i < 4; i++) poly(c, [-6 + i * 3.6, -6, -4.2 + i * 3.6, -6, -5.1 + i * 3.6, -3.6], '#fff'); } }
    eye(c, -4.5, -1, 2, 'angry', 0.6); eye(c, 4.5, -1, 2, 'angryL', 0.6);
    circ(c, 10, -9, 4.5, '#e5263b');
    if (!TINT) { c.fillStyle = '#fff'; c.font = `bold 5.5px ${FONT_D}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(e.badge || '1', 10, -8.6); }
    c.restore();
  };

  Art.calendar = (c, e, T) => {
    const s = e.r / 14;
    const tele = e.tele || 0;
    c.save(); c.translate(e.x, e.y); shadow(c, 0, 0, 12 * s, 3.5 * s); c.scale(s, s);
    const hop = Math.abs(Math.sin(e.t * 8)) * 2;
    c.translate(0, -hop);
    line(c, -5, -4, -6, 0, 2, '#3a3d4a'); line(c, 5, -4, 6, 0, 2, '#3a3d4a');
    rr(c, -12, -32, 24, 28, 3, '#ffffff');
    rr(c, 6, -32, 6, 28, 2, '#e6e8ef');
    rr(c, -12, -32, 24, 8, 3, '#e5463b');
    circ(c, -6, -32, 2, '#3a3d4a'); circ(c, 6, -32, 2, '#3a3d4a');
    if (!TINT) {
      c.fillStyle = '#2b2a3a'; c.font = `17px ${FONT_D}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(String(e.dateNum || 13), 0, -14);
      c.strokeStyle = '#e5463b'; c.lineWidth = 1.4; c.beginPath(); c.ellipse(0, -14.5, 8, 6.8, 0.1, 0, TAU); c.stroke();
    }
    eye(c, -6, -21.5, 1.6, 'smug'); eye(c, 6, -21.5, 1.6, 'smug');
    if (tele > 0 && !TINT) { c.globalAlpha = 0.5 + Math.sin(T * 30) * 0.3; rr(c, -14, -34, 28, 32, 4, 'rgba(255,90,74,0.4)'); c.globalAlpha = 1; }
    c.restore();
  };

  Art.printer = (c, e, T) => {
    const s = e.r / 18;
    c.save(); c.translate(e.x, e.y); shadow(c, 0, 0, 20 * s, 5 * s); c.scale(s, s);
    const kick = e.kick || 0;
    c.translate(0, kick * 2);
    rr(c, -16, -6, 6, 5, 1.5, '#4a4d5a'); rr(c, 10, -6, 6, 5, 1.5, '#4a4d5a');
    rr(c, -19, -30, 38, 26, 4, '#e4dccb');
    rr(c, 6, -30, 13, 26, 4, '#cfc6b2');
    rr(c, -19, -30, 38, 7, 3, '#cdc4ae');
    rr(c, -14, -14, 28, 4, 1.5, '#3b3d48');
    const out = (e.paperOut || 0) * 10;
    if (out > 0) { rr(c, -10, -12, 20, 3 + out, 1, '#ffffff'); }
    rr(c, -13, -25, 16, 7, 1.5, '#2c3a3a');
    rr(c, -11, -23.5, 4, 4, 1, '#ffb347'); rr(c, -3, -23.5, 4, 4, 1, '#ffb347');
    line(c, -12, -26.5, -6, -24.5, 1.2, '#1c1b2b'); line(c, 2, -26.5, -4, -24.5, 1.2, '#1c1b2b');
    const blink = Math.sin(T * 8 + e.x) > 0;
    circ(c, 12, -34, 3, '#c75b12');
    circ(c, 12, -34, 2.3, blink ? '#ffa136' : '#d86f1c');
    c.restore();
  };

  Art.sticky = (c, e, T) => {
    const s = e.r / 12;
    c.save(); c.translate(e.x, e.y); shadow(c, 0, 0, 11 * s, 3.5 * s); c.scale(e.face * s, s);
    const wob = Math.sin(e.t * 10) * 0.08;
    c.translate(0, -13); c.rotate(wob);
    poly(c, [-11, -11, 11, -11, 11, 5, 5, 11, -11, 11], '#ffd84a');
    poly(c, [11, 5, 5, 11, 5.5, 5.5], '#e6b62c');
    rr(c, -11, -11, 22, 4, 1, '#f5c932');
    if (!TINT) { c.strokeStyle = '#4f7bd9'; c.lineWidth = 1; c.beginPath(); c.moveTo(-7, 6); for (let i = 0; i < 7; i++) c.lineTo(-7 + i * 2, 6 + (i % 2 ? -1.6 : 1.2)); c.stroke(); }
    eye(c, -4, -2, 2.1, 'angry', 0.4); eye(c, 4.5, -2, 2.1, 'angryL', 0.4);
    line(c, -2, 3, 2.5, 3, 1.2, '#5a4210');
    ell(c, -6, 12, 1.4, 2.4 + Math.sin(e.t * 3) * 0.8, '#f2c632');
    c.restore();
  };

  Art.wisp = (c, e, T) => {
    const s = e.r / 10;
    const fl = Math.sin(e.t * 5) * 2.5;
    c.save(); c.translate(e.x, e.y); shadow(c, 0, 0, 8 * s, 2.5 * s, 0.12); c.scale(e.face * s, s); c.translate(0, -16 + fl);
    if (!TINT) { const g = c.createRadialGradient(0, 0, 2, 0, 0, 20); g.addColorStop(0, 'rgba(110,180,255,0.35)'); g.addColorStop(1, 'rgba(110,180,255,0)'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, 20, 0, TAU); c.fill(); }
    const fh = 7 + Math.sin(e.t * 17) * 2;
    poly(c, [-4, -7, 0, -9 - fh, 4, -7], '#5aa8ff');
    poly(c, [-2, -7, 0.5, -7 - fh * 0.6, 2.5, -7], '#c4ecff');
    c.fillStyle = C('#2a2766'); c.beginPath(); c.arc(0, 0, 9.5, Math.PI, 0); c.quadraticCurveTo(9, 9, 2, 10); c.quadraticCurveTo(-3, 15 + Math.sin(e.t * 6) * 3, -6, 9); c.quadraticCurveTo(-10, 6, -9.5, 0); c.fill();
    ell(c, -2, -2, 6, 5, '#353283');
    ell(c, -3, 0, 2.4, 1.5, '#9ff7ff'); ell(c, 3.5, 0, 2.4, 1.5, '#9ff7ff');
    ell(c, -3, 2.4, 2.2, 0.9, '#1c1a46'); ell(c, 3.5, 2.4, 2.2, 0.9, '#1c1a46');
    c.restore();
  };

  // ── bosses ─────────────────────────────────────────
  Art.alarmKing = (c, e, T) => {
    const s = e.r / 56;
    const tele = e.tele || 0;
    const jx = tele > 0 ? Math.sin(T * 70) * 2.5 : 0;
    c.save(); c.translate(e.x + jx, e.y); shadow(c, 0, 0, 50 * s, 13 * s); c.scale(s, s);
    // cape
    c.fillStyle = C('#7c1f3a'); c.beginPath(); c.moveTo(-34, -70); c.quadraticCurveTo(-56, -20, -46, -2); c.lineTo(46, -2); c.quadraticCurveTo(56, -20, 34, -70); c.fill();
    const step = Math.sin(e.t * 6) * 4;
    line(c, -20, -16, -26 - step, 0, 7, '#3a2a30'); line(c, 20, -16, 26 + step, 0, 7, '#3a2a30');
    ell(c, -28 - step, 0, 9, 4, '#3a2a30'); ell(c, 28 + step, 0, 9, 4, '#3a2a30');
    c.save(); c.translate(0, -58);
    const ring = tele > 0 ? Math.sin(T * 60) * 0.22 : Math.sin(T * 2) * 0.04;
    c.save(); c.rotate(-0.62 + ring); ell(c, 0, -55, 22, 17, '#f4c046'); ell(c, -5, -60, 9, 5, '#ffe08a'); rr(c, -22, -44, 44, 7, 3, '#c98a1b'); c.restore();
    c.save(); c.rotate(0.62 - ring); ell(c, 0, -55, 22, 17, '#f4c046'); ell(c, -5, -60, 9, 5, '#ffe08a'); rr(c, -22, -44, 44, 7, 3, '#c98a1b'); c.restore();
    line(c, 0, -48, ring * 60, -64, 5, '#3a2a30'); circ(c, ring * 60, -66, 7, '#3a2a30');
    circ(c, 0, 0, 50, '#b8862a'); circ(c, -3, -3, 47, '#e8b13a');
    if (!TINT) ell(c, -22, -26, 14, 7, 'rgba(255,255,255,0.35)', -0.6);
    clockFace(c, 37, T, true, tele > 0 ? 1 : 0.3);
    // clock hand mustache
    c.save(); c.translate(0, 10);
    c.fillStyle = C('#2a2236'); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-14, -8, -26, 2); c.quadraticCurveTo(-14, 2, 0, 5); c.quadraticCurveTo(14, 2, 26, 2); c.quadraticCurveTo(14, -8, 0, 0); c.fill();
    c.restore();
    // crown
    c.save(); c.translate(0, -50);
    poly(c, [-20, 4, -24, -18, -11, -6, 0, -24, 11, -6, 24, -18, 20, 4], '#ffd23f');
    rr(c, -21, 0, 42, 7, 2, '#e3a91b');
    circ(c, 0, -10, 3.5, '#e5263b'); circ(c, -13, -4, 2.6, '#2aa8e0'); circ(c, 13, -4, 2.6, '#2aa8e0');
    c.restore();
    c.restore();
    c.restore();
  };

  Art.ramenPot = (c, e, T) => {
    const s = e.r / 60;
    const tele = e.tele || 0;
    c.save(); c.translate(e.x, e.y); shadow(c, 0, 0, 56 * s, 14 * s); c.scale(s, s);
    const boil = Math.sin(T * 8) * 1.5;
    const step = Math.sin(e.t * 5) * 3;
    rr(c, -34 - step, -10, 16, 10, 4, '#a2741b'); rr(c, 18 + step, -10, 16, 10, 4, '#a2741b');
    c.save(); c.translate(0, -50 + (tele > 0 ? Math.sin(T * 50) * 2 : 0));
    // handles
    rr(c, -70, -24, 22, 10, 5, '#2f2a2a'); rr(c, 48, -24, 22, 10, 5, '#2f2a2a');
    // pot body
    c.fillStyle = C('#c48b1d'); c.beginPath(); c.moveTo(-54, -30); c.lineTo(54, -30); c.quadraticCurveTo(52, 34, 36, 40); c.lineTo(-36, 40); c.quadraticCurveTo(-52, 34, -54, -30); c.fill();
    c.fillStyle = C('#e8b13a'); c.beginPath(); c.moveTo(-52, -30); c.lineTo(36, -30); c.quadraticCurveTo(34, 30, 22, 38); c.lineTo(-34, 38); c.quadraticCurveTo(-50, 32, -52, -30); c.fill();
    if (!TINT) { ell(c, -30, -8, 6, 14, 'rgba(255,240,190,0.5)', 0.1); ell(c, 20, 18, 7, 4, 'rgba(140,90,10,0.35)'); }
    // broth + noodles
    ell(c, 0, -32, 56, 13, '#9a6716');
    ell(c, 0, -33, 52, 11, '#e2722e');
    if (!TINT) {
      c.strokeStyle = '#f7d77a'; c.lineWidth = 3; c.lineCap = 'round';
      for (let i = 0; i < 9; i++) {
        c.beginPath();
        const x0 = -46 + i * 11, ph = i * 1.3 + T * 3;
        for (let k = 0; k < 10; k++) c.lineTo(x0 + Math.sin(ph + k) * 5, -36 + k * (i % 3 === 0 ? 6 : 2) - (k > 4 && i % 3 === 0 ? 0 : 0));
        c.stroke();
      }
      c.strokeStyle = '#f2c857'; c.lineWidth = 2.6;
      for (let i = 0; i < 5; i++) { c.beginPath(); const x0 = -36 + i * 18; for (let k = 0; k < 14; k++) c.lineTo(x0 + k * 1.8, -40 + Math.sin(k * 1.1 + i + T * 4) * 3 + boil); c.stroke(); }
    }
    ell(c, 18, -40, 11, 8, '#fbf7ee'); circ(c, 20, -40, 5, '#f5a623');
    for (let i = 0; i < 4; i++) { circ(c, -28 + i * 7, -42 + (i % 2) * 4, 3, '#4ca843'); circ(c, -28 + i * 7, -42 + (i % 2) * 4, 1.4, '#c4ef9a'); }
    line(c, -10, -36, -26, -84, 4.5, '#8a5a2b'); line(c, 2, -36, 8, -86, 4.5, '#9d6a35');
    // face
    eye(c, -20, 2, 7.5, 'angry', 0.6); eye(c, 12, 2, 7.5, 'angryL', 0.6);
    const mouth = tele > 0 ? 1 : 0.5;
    poly(c, [-18, 18, 10, 18, 6, 18 + 10 * mouth, -14, 18 + 10 * mouth], '#7c2026');
    if (!TINT) for (let i = 0; i < 4; i++) poly(c, [-16 + i * 7, 18, -10 + i * 7, 18, -13 + i * 7, 23], '#fff');
    c.restore();
    c.restore();
  };

  Art.bujang = (c, e, T) => {
    const s = e.r / 50;
    const rage = e.phase >= 2;
    c.save(); c.translate(e.x, e.y); shadow(c, 0, 0, 40 * s, 11 * s); c.scale(e.face * s, s);
    if (!TINT) {
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI + Math.PI, fh = 18 + Math.sin(T * 9 + i * 2) * 8;
        c.fillStyle = rage ? 'rgba(200,40,60,0.28)' : 'rgba(70,40,120,0.25)';
        c.beginPath(); c.ellipse(Math.cos(a) * 34, -6 - fh * 0.5, 7, fh, 0, 0, TAU); c.fill();
      }
    }
    const step = Math.sin(e.t * 7) * (e.state === 'rush' ? 8 : 3);
    line(c, -10, -34, -12 - step, -4, 11, '#2b2e38'); line(c, 10, -34, 12 + step, -4, 11, '#2b2e38');
    ell(c, -13 - step, -2, 10, 5, '#15161c'); ell(c, 13 + step, -2, 10, 5, '#15161c');
    // jacket
    c.fillStyle = C('#3b404d'); c.beginPath(); c.moveTo(-26, -80); c.quadraticCurveTo(-34, -40, -26, -30); c.lineTo(26, -30); c.quadraticCurveTo(34, -40, 26, -80); c.quadraticCurveTo(0, -88, -26, -80); c.fill();
    poly(c, [-8, -82, 8, -82, 0, -54], '#f1f2f6');
    poly(c, [-2.5, -80, 2.5, -80, 4, -58, 0, -52, -4, -58], '#8e1f35');
    poly(c, [-12, -82, -2, -60, -16, -66], '#2c303b'); poly(c, [12, -82, 2, -60, 16, -66], '#2c303b');
    circ(c, 0, -44, 2, '#14151a');
    // document arm (back)
    c.save(); c.translate(-26, -70);
    rr(c, -26, -8, 30, 24, 2, '#e8e8ee');
    for (let i = 0; i < 5; i++) rr(c, -26 + (i % 2), -10 - i * 3.2, 30, 3, 1, i % 2 ? '#ffffff' : '#f3f3f8');
    line(c, 2, 0, -10, 8, 10, '#3b404d');
    c.restore();
    // pointing arm
    const pa = e.state === 'shout' ? -0.5 : Math.sin(T * 3) * 0.08;
    c.save(); c.translate(24, -74); c.rotate(pa);
    line(c, 0, 0, 22, 8, 10, '#3b404d'); circ(c, 25, 9, 5.5, '#f0c39a'); line(c, 28, 9, 36, 7, 3.4, '#f0c39a');
    c.restore();
    // head
    c.save(); c.translate(2, -104);
    circ(c, 0, 0, 22, rage ? '#f19a86' : '#f2c49c');
    ell(c, 9, 6, 12, 10, rage ? '#e98a76' : '#e8b48a');
    circ(c, -20, 2, 5, '#e8b48a');
    c.fillStyle = C('#3a3a46'); c.beginPath(); c.arc(0, -3, 22.5, Math.PI * 1.02, Math.PI * 1.98); c.quadraticCurveTo(10, -16, -14, -10); c.closePath(); c.fill();
    if (!TINT) { c.strokeStyle = '#3a3a46'; c.lineWidth = 1.3; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-16 + i * 3, -14); c.quadraticCurveTo(0, -24 + i, 18, -12 + i); c.stroke(); } }
    // glasses
    rr(c, -6, -5, 14, 11, 3, '#1b1b22'); rr(c, 11, -5, 13, 11, 3, '#1b1b22');
    rr(c, -4, -3, 10, 7, 2, '#cfe3f2'); rr(c, 13, -3, 9, 7, 2, '#cfe3f2');
    line(c, 8, -1, 11, -1, 2, '#1b1b22');
    if (!TINT) { line(c, -2, -1, 1, -3, 1.4, '#fff'); }
    circ(c, 2, 0.5, 1.8, '#1c1b2b'); circ(c, 18, 0.5, 1.8, '#1c1b2b');
    line(c, -6, -10, 7, -6, 3.4, '#2a2a34'); line(c, 11, -6, 24, -10, 3.4, '#2a2a34');
    const shout = e.state === 'shout';
    if (shout) ell(c, 12, 13, 6, 5, '#6d1e24'); else line(c, 6, 14, 18, 12, 2.4, '#6d1e24');
    c.restore();
    c.restore();
  };

  Art.demon = (c, e, T) => {
    const s = e.r / 70;
    const ph = e.phase || 1;
    c.save(); c.translate(e.x, e.y); shadow(c, 0, 0, 60 * s, 15 * s, 0.3); c.scale(s, s);
    const fl = Math.sin(T * 1.8) * 5;
    if (!TINT) {
      const g = c.createRadialGradient(0, -70, 20, 0, -70, 140);
      g.addColorStop(0, ph >= 3 ? 'rgba(255,40,80,0.35)' : 'rgba(120,70,255,0.32)'); g.addColorStop(1, 'rgba(60,20,120,0)');
      c.fillStyle = g; c.beginPath(); c.arc(0, -70, 140, 0, TAU); c.fill();
    }
    // cables
    for (let i = 0; i < 6; i++) {
      const bx = -40 + i * 16, sw = Math.sin(T * 2.2 + i * 1.3);
      c.strokeStyle = C(i % 2 ? '#1a1a26' : '#262636'); c.lineWidth = 6; c.lineCap = 'round';
      c.beginPath(); c.moveTo(bx, -40 + fl); c.bezierCurveTo(bx + sw * 30, -10, bx - sw * 40 + (i - 2.5) * 20, 10, bx + (i - 2.5) * 34 + sw * 18, 18 + Math.cos(T * 3 + i) * 8); c.stroke();
      circ(c, bx + (i - 2.5) * 34 + sw * 18, 18 + Math.cos(T * 3 + i) * 8, 4, '#3d3d55');
    }
    c.translate(0, -78 + fl);
    // chair back
    rr(c, -46, -66, 92, 44, 16, '#15151f');
    // horns
    poly(c, [-44, -40, -66, -86, -30, -50], '#7a1530'); poly(c, [44, -40, 66, -86, 30, -50], '#7a1530');
    poly(c, [-48, -48, -60, -78, -38, -50], '#a51e40'); poly(c, [48, -48, 60, -78, 38, -50], '#a51e40');
    // monitor
    rr(c, -62, -52, 124, 98, 14, '#a9a397');
    rr(c, -60, -54, 118, 94, 13, '#d5cfc1');
    rr(c, -50, -44, 100, 70, 8, '#24242e');
    const scr = ph >= 3 ? '#c4103a' : '#1745d6';
    rr(c, -46, -40, 92, 62, 6, scr);
    if (!TINT) {
      c.fillStyle = 'rgba(255,255,255,0.06)'; for (let y = -40; y < 22; y += 3) c.fillRect(-46, y, 92, 1);
      c.fillStyle = 'rgba(255,255,255,0.12)'; c.beginPath(); c.ellipse(-24, -28, 20, 8, -0.3, 0, TAU); c.fill();
    }
    // pixel face
    const px = (x, y, w, h, col) => { c.fillStyle = C(col); c.fillRect(x, y, w, h); };
    const eyeC = ph >= 3 ? '#ffe14d' : '#ff3b5c';
    const bl = Math.sin(T * 0.9) > 0.97 ? 0.2 : 1;
    px(-32, -26, 18, 10 * bl, eyeC); px(14, -26, 18, 10 * bl, eyeC);
    px(-36, -32, 10, 4, '#0c1240'); px(26, -32, 10, 4, '#0c1240');
    px(-28, -36, 14, 4, '#0c1240'); px(14, -36, 14, 4, '#0c1240');
    const mo = e.state === 'laser' ? 1 : 0.4;
    px(-26, 0, 52, 6 + 8 * mo, '#0c1240');
    if (!TINT) for (let i = 0; i < 6; i++) px(-24 + i * 9, 0, 5, 4, '#ffffff');
    circ(c, 46, 36, 3, '#3bea6e');
    rr(c, -16, 46, 32, 10, 3, '#a9a397');
    c.restore();
  };

  // ── pickups & projectiles ─────────────────────────
  Art.coffee = (c, x, y, big, T) => {
    const s = big ? 1.5 : 1;
    const b = Math.sin(T * 5 + x) * 1.5;
    c.save(); c.translate(x, y); shadow(c, 0, 0, 5 * s, 1.8 * s, 0.18); c.scale(s, s); c.translate(0, -8 + b);
    if (!TINT) { c.fillStyle = big ? 'rgba(255,214,90,0.35)' : 'rgba(255,255,255,0.25)'; c.beginPath(); c.arc(0, 0, 9, 0, TAU); c.fill(); }
    poly(c, [-4.5, -5, 4.5, -5, 3.4, 6, -3.4, 6], '#fbfbfd');
    poly(c, [-4.1, -1, 4.1, -1, 3.8, 3, -3.8, 3], big ? '#00a84d' : '#a8693b');
    rr(c, -5.5, -7, 11, 2.6, 1.2, '#e9e3da');
    c.restore();
  };
  Art.gimbap = (c, x, y, T) => {
    const b = Math.sin(T * 5 + x) * 1.5;
    c.save(); c.translate(x, y); shadow(c, 0, 0, 7, 2.2, 0.18); c.translate(0, -9 + b);
    if (!TINT) { c.fillStyle = 'rgba(120,255,160,0.25)'; c.beginPath(); c.arc(0, 0, 12, 0, TAU); c.fill(); }
    circ(c, 0, 0, 8, '#1f2a1f'); circ(c, 0, 0, 6.4, '#fbf8f0');
    circ(c, -1.8, -1.5, 1.6, '#f2a72e'); circ(c, 1.8, -1.2, 1.5, '#4ca843'); circ(c, 0, 1.9, 1.6, '#e2504a'); circ(c, -2.2, 1.6, 1.1, '#f6d94d'); circ(c, 2.3, 1.8, 1.1, '#a86b3a');
    c.restore();
  };

  // speech-bubble sprites for the player's greetings, cached per label
  const bubbleCache = new Map();
  Art.bubble = (label, big) => {
    const key = label + (big ? '!' : '');
    if (bubbleCache.has(key)) return bubbleCache.get(key);
    const fs = big ? 20 : 12, padX = big ? 10 : 6, padY = big ? 7 : 4, k = 3;
    const cv = document.createElement('canvas');
    const mc = cv.getContext('2d');
    mc.font = `${fs}px ${FONT_D}`;
    const tw = Math.ceil(mc.measureText(label).width);
    const w = tw + padX * 2, h = fs + padY * 2;
    cv.width = (w + 8) * k; cv.height = (h + 10) * k;
    const g = cv.getContext('2d'); g.scale(k, k); g.translate(4, 3);
    g.fillStyle = 'rgba(20,18,40,0.25)'; g.beginPath(); g.roundRect(1.5, 2.5, w, h, h / 2); g.fill();
    g.fillStyle = big ? '#00a84d' : '#ffffff';
    g.beginPath(); g.roundRect(0, 0, w, h, h / 2); g.fill();
    g.beginPath(); g.moveTo(w * 0.22, h - 1); g.lineTo(w * 0.14, h + 6); g.lineTo(w * 0.38, h - 1); g.fill();
    g.fillStyle = big ? '#ffffff' : '#1f2a44';
    g.font = `${fs}px ${FONT_D}`; g.textBaseline = 'middle'; g.textAlign = 'center';
    g.fillText(label, w / 2, h / 2 + 1);
    const sp = { cv, w: w + 8, h: h + 10 };
    bubbleCache.set(key, sp);
    return sp;
  };
  Art.clearBubbles = () => bubbleCache.clear();

  // ── NPC portraits (for greeting cards) ─────────────
  // each draws into a 100×100 box
  function bust(c, shirt, shade) {
    c.fillStyle = shirt; c.beginPath(); c.moveTo(14, 100); c.quadraticCurveTo(16, 70, 50, 68); c.quadraticCurveTo(84, 70, 86, 100); c.fill();
    c.fillStyle = shade; c.beginPath(); c.moveTo(60, 70); c.quadraticCurveTo(84, 72, 86, 100); c.lineTo(66, 100); c.fill();
  }
  function head(c, skin, shade, x = 50, y = 46, r = 20) {
    rr(c, x - 6, y + 12, 12, 12, 4, shade);
    circ(c, x, y, r, skin);
    ell(c, x + r * 0.45, y + r * 0.3, r * 0.5, r * 0.45, shade);
    circ(c, x - r, y + 2, 4.5, skin); circ(c, x + r, y + 2, 4.5, shade);
  }
  function face(c, x = 50, y = 46, mood = 'smile', wink = false) {
    if (wink) arcS(c, x - 8, y + 1, 3.6, Math.PI + 0.3, -0.3, 2, '#1f1d2b');
    else { ell(c, x - 8, y + 1, 2.6, 3.4, '#1f1d2b'); circ(c, x - 8.8, y - 0.2, 0.9, '#fff'); }
    ell(c, x + 8, y + 1, 2.6, 3.4, '#1f1d2b'); circ(c, x + 7.2, y - 0.2, 0.9, '#fff');
    ell(c, x - 12, y + 8, 4, 2.2, 'rgba(240,120,120,0.45)'); ell(c, x + 12, y + 8, 4, 2.2, 'rgba(240,120,120,0.45)');
    if (mood === 'smile') { c.fillStyle = '#7a2b2b'; c.beginPath(); c.arc(x, y + 8, 5, 0, Math.PI); c.fill(); }
    else if (mood === 'grin') { c.fillStyle = '#7a2b2b'; c.beginPath(); c.arc(x, y + 7, 6.5, 0, Math.PI); c.fill(); rr(c, x - 5, y + 7, 10, 2.4, 1, '#fff'); }
    else if (mood === 'sly') arcS(c, x + 2, y + 6, 5, 0.3, 2.2, 2, '#7a2b2b');
  }
  const P = {};
  P.sua = (c) => { // convenience store part-timer
    circ(c, 50, 50, 50, '#cfeee0');
    bust(c, '#2f9e6f', '#23845b');
    for (let i = 0; i < 4; i++) rr(c, 22 + i * 15, 74, 6, 26, 2, '#3fbf88');
    rr(c, 58, 80, 16, 8, 2, '#ffffff');
    c.fillStyle = '#5a3424'; c.beginPath(); c.arc(50, 42, 24, Math.PI * 0.9, Math.PI * 2.1); c.lineTo(74, 62); c.lineTo(68, 62); c.lineTo(66, 40); c.lineTo(34, 40); c.lineTo(32, 62); c.lineTo(26, 62); c.closePath(); c.fill();
    head(c, '#f6cfae', '#eab995');
    c.fillStyle = '#5a3424'; c.beginPath(); c.moveTo(28, 40); c.quadraticCurveTo(40, 22, 72, 36); c.quadraticCurveTo(60, 30, 44, 38); c.lineTo(30, 46); c.fill();
    face(c, 50, 47, 'grin');
    line(c, 82, 52, 90, 38, 7, '#f6cfae');
  };
  P.guard = (c) => { // apartment security guard
    circ(c, 50, 50, 50, '#d9e1f2');
    bust(c, '#2c3d6b', '#22305a');
    rr(c, 30, 78, 10, 7, 2, '#e8c34a');
    head(c, '#efc39e', '#e0ad86');
    c.fillStyle = '#c9c9cf'; c.beginPath(); c.arc(50, 44, 21, Math.PI, Math.PI * 1.3); c.lineTo(30, 52); c.fill();
    c.beginPath(); c.arc(50, 44, 21, Math.PI * 1.7, 0); c.lineTo(70, 52); c.fill();
    rr(c, 26, 22, 48, 14, 6, '#2c3d6b'); rr(c, 20, 32, 60, 6, 3, '#1d2a4c'); circ(c, 50, 28, 4, '#e8c34a');
    arcS(c, 42, 47, 3.4, Math.PI + 0.4, -0.4, 2, '#1f1d2b'); arcS(c, 58, 47, 3.4, Math.PI + 0.4, -0.4, 2, '#1f1d2b');
    c.fillStyle = '#7a2b2b'; c.beginPath(); c.arc(50, 56, 5, 0, Math.PI); c.fill();
    line(c, 38, 41, 45, 40, 2.4, '#bfbfc6'); line(c, 55, 40, 62, 41, 2.4, '#bfbfc6');
  };
  P.barista = (c) => {
    circ(c, 50, 50, 50, '#f2dfcc');
    bust(c, '#efe9e0', '#d9d0c4');
    poly(c, [34, 74, 66, 74, 70, 100, 30, 100], '#7b4a2a');
    head(c, '#f0c6a0', '#e2b089');
    rr(c, 27, 24, 46, 20, 10, '#2b3b4f'); rr(c, 25, 36, 50, 7, 3, '#203044');
    face(c, 50, 48, 'smile', true);
    rr(c, 74, 46, 14, 22, 3, 'rgba(220,240,255,0.9)'); rr(c, 75, 52, 12, 15, 2, '#5b3420'); line(c, 81, 46, 84, 36, 2, '#1fa36a');
  };
  P.auntie = (c) => {
    circ(c, 50, 50, 50, '#f9dbe4');
    bust(c, '#f19bb5', '#dc839f');
    head(c, '#f2c7a3', '#e4b18b');
    for (let i = 0; i < 9; i++) circ(c, 30 + (i % 5) * 10, 26 + Math.floor(i / 5) * 8 + (i % 2) * 3, 8, '#3b2a2a');
    circ(c, 27, 40, 6, '#3b2a2a'); circ(c, 73, 40, 6, '#3b2a2a');
    face(c, 50, 48, 'grin');
    circ(c, 84, 60, 9, '#f6d34a'); rr(c, 78, 64, 12, 12, 3, '#f6d34a');
  };
  P.daeri = (c) => { // coworker 박대리
    circ(c, 50, 50, 50, '#e6e1f5');
    bust(c, '#d8c3a1', '#c4ad88');
    poly(c, [44, 70, 56, 70, 50, 86], '#ffffff');
    c.fillStyle = '#2a2230'; c.beginPath(); c.arc(50, 44, 23, Math.PI, 0); c.lineTo(73, 54); c.lineTo(27, 54); c.fill();
    head(c, '#f4cdaa', '#e6b892');
    c.fillStyle = '#2a2230'; c.beginPath(); c.moveTo(28, 44); c.quadraticCurveTo(46, 20, 72, 40); c.quadraticCurveTo(56, 32, 38, 42); c.fill();
    circ(c, 70, 26, 7, '#2a2230');
    rr(c, 34, 22, 14, 8, 3, 'rgba(30,30,40,0.0)');
    c.strokeStyle = '#3b3b48'; c.lineWidth = 2; c.beginPath(); c.roundRect(33, 26, 14, 8, 3); c.roundRect(53, 26, 14, 8, 3); c.stroke();
    face(c, 50, 47, 'smile');
    line(c, 14, 62, 20, 44, 7, '#f4cdaa'); line(c, 18, 44, 16, 36, 3, '#f4cdaa'); line(c, 22, 44, 23, 36, 3, '#f4cdaa');
  };
  P.bus = (c) => {
    circ(c, 50, 50, 50, '#d3ecf7');
    bust(c, '#8ac6e8', '#6fb1d8');
    poly(c, [44, 70, 56, 70, 50, 84], '#2c3d6b');
    head(c, '#ebbd96', '#dca67e');
    rr(c, 28, 22, 44, 14, 6, '#4c8fbf'); rr(c, 30, 32, 46, 5, 2.5, '#1f3c5a'); rr(c, 44, 24, 12, 6, 2, '#ffffff');
    face(c, 50, 46, 'grin');
    c.fillStyle = '#3a2a24'; c.beginPath(); c.moveTo(38, 52); c.quadraticCurveTo(50, 48, 62, 52); c.quadraticCurveTo(50, 56, 38, 52); c.fill();
    rr(c, 76, 40, 12, 14, 4, '#ffffff');
  };
  P.cat = (c) => {
    circ(c, 50, 50, 50, '#fde7c4');
    ell(c, 50, 92, 32, 22, '#f0a347');
    poly(c, [26, 30, 32, 10, 44, 26], '#f0a347'); poly(c, [74, 30, 68, 10, 56, 26], '#f0a347');
    poly(c, [30, 27, 33, 16, 40, 25], '#f7c7b5'); poly(c, [70, 27, 67, 16, 60, 25], '#f7c7b5');
    ell(c, 50, 48, 28, 24, '#f6b25a');
    ell(c, 50, 58, 15, 11, '#fff3e0');
    for (let i = 0; i < 3; i++) line(c, 44 + i * 6, 26, 44 + i * 6, 34, 3, '#d9822d');
    arcS(c, 39, 46, 4.5, Math.PI + 0.5, -0.5, 2.2, '#3a2418'); arcS(c, 61, 46, 4.5, Math.PI + 0.5, -0.5, 2.2, '#3a2418');
    poly(c, [47, 53, 53, 53, 50, 56], '#e17b8f');
    arcS(c, 47, 57, 3, 0, Math.PI * 0.9, 1.4, '#3a2418'); arcS(c, 53, 57, 3, Math.PI * 0.1, Math.PI, 1.4, '#3a2418');
    for (const sx of [-1, 1]) { line(c, 50 + sx * 14, 56, 50 + sx * 30, 52, 1, '#8a5a3a'); line(c, 50 + sx * 14, 59, 50 + sx * 30, 61, 1, '#8a5a3a'); }
    rr(c, 36, 68, 28, 5, 2.5, '#d83a4a'); circ(c, 50, 75, 4, '#f5c518');
    ell(c, 80, 64, 8, 11, '#f6b25a');
  };
  P.fortune = (c) => {
    circ(c, 50, 50, 50, '#2a1c44');
    if (!TINT) { const g = c.createRadialGradient(50, 86, 2, 50, 86, 30); g.addColorStop(0, 'rgba(255,90,220,0.7)'); g.addColorStop(1, 'rgba(255,90,220,0)'); c.fillStyle = g; c.beginPath(); c.arc(50, 86, 30, 0, TAU); c.fill(); }
    c.fillStyle = '#5b2a86'; c.beginPath(); c.moveTo(12, 100); c.quadraticCurveTo(14, 20, 50, 14); c.quadraticCurveTo(86, 20, 88, 100); c.fill();
    c.fillStyle = '#16102a'; c.beginPath(); c.ellipse(50, 50, 20, 24, 0, 0, TAU); c.fill();
    ell(c, 42, 48, 4, 2.2, '#ff5ad6'); ell(c, 58, 48, 4, 2.2, '#ff5ad6');
    arcS(c, 50, 58, 7, 0.2, Math.PI - 0.2, 2, '#ff9be9');
    circ(c, 50, 86, 11, '#c9a7ff'); circ(c, 46, 82, 3, '#f4ecff');
    circ(c, 30, 66, 3, '#f5c518'); circ(c, 70, 66, 3, '#f5c518');
  };
  Art.portrait = (c, id) => { (P[id] || P.sua)(c); };
})();
