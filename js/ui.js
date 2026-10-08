'use strict';
const UI = (() => {
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const fmtClock = (m) => `${pad(Math.floor(m / 60) % 24)}:${pad(Math.floor(m % 60))}`;
  const ROUTE = STAGES.map((s) => ({ name: s.name, time: fmtClock(s.start[0] * 60 + s.start[1]), col: s.line })).concat([{ name: '퇴근', time: '24:00', col: '#ffd23f', end: true }]);

  function route(box, reached = -1) {
    box.innerHTML = '';
    const n = ROUTE.length;
    for (let i = 0; i < n - 1; i++) {
      const seg = el('div', 'seg');
      seg.style.left = `calc(${(i + 0.5) * (100 / n)}% + 6px)`; seg.style.width = `calc(${100 / n}% - 12px)`; seg.style.background = ROUTE[i].col;
      box.appendChild(seg);
    }
    ROUTE.forEach((r, i) => {
      const s = el('div', 'station' + (i <= reached ? ' reached' : ''));
      s.style.setProperty('--c', r.col);
      s.innerHTML = `<div class="dot${r.end ? ' end' : ''}"></div><b>${esc(r.name)}</b><span>${r.time}</span>`;
      box.appendChild(s);
    });
  }

  // ── HUD ────────────────────────────────────────────
  const hud = { battCells: -1 };
  function setHud(d) {
    const b = $('battery');
    if (hud.battCells !== d.maxHp) {
      b.innerHTML = ''; for (let i = 0; i < d.maxHp; i++) b.appendChild(el('i'));
      hud.battCells = d.maxHp;
    }
    if (hud.hp !== d.hp || hud.max !== d.maxHp) {
      [...b.children].forEach((c, i) => c.classList.toggle('off', i >= d.hp));
      b.classList.toggle('low', d.hp <= 3); b.classList.toggle('mid', d.hp > 3 && d.hp <= d.maxHp * 0.5);
      $('battNum').textContent = Math.round((d.hp / d.maxHp) * 100) + '%';
      hud.hp = d.hp; hud.max = d.maxHp;
    }
    $('xpBar').firstElementChild.style.width = (d.xp * 100).toFixed(1) + '%';
    if (hud.lv !== d.lv) { $('lv').textContent = 'Lv ' + d.lv; hud.lv = d.lv; }
    $('agiBar').firstElementChild.style.width = d.agi.toFixed(1) + '%';
    const ag = Math.round(d.agi);
    if (hud.agi !== ag) { $('agiNum').textContent = ag; $('agiRow').classList.toggle('hot', ag >= 50); hud.agi = ag; }
    if (hud.clock !== d.clock) { $('clock').textContent = d.clock; hud.clock = d.clock; }
    $('clock').classList.toggle('urgent', !!d.urgent);
    if (hud.sub !== d.sub) { $('stSub').textContent = d.sub; hud.sub = d.sub; }
    if (hud.stage !== d.stage) {
      const s = STAGES[d.stage];
      $('stName').textContent = s.name; $('lineBadge').textContent = d.stage + 1;
      $('lineBadge').style.background = s.line; hud.stage = d.stage;
    }
    const bb = $('bossBar');
    if (d.boss) {
      bb.hidden = false;
      if (hud.bossName !== d.boss.name) { $('bbName').textContent = d.boss.name; $('bbTitle').textContent = d.boss.title; hud.bossName = d.boss.name; }
      $('bbFill').style.width = Math.max(0, (d.boss.hp / d.boss.maxHp) * 100).toFixed(1) + '%';
    } else bb.hidden = true;
    const db = $('dashBtn');
    db.classList.toggle('empty', d.charges <= 0);
  }

  function toast(main, sub) {
    const t = $('toast');
    t.innerHTML = esc(main) + (sub ? `<small>${esc(sub)}</small>` : '');
    t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
  }

  // ── station sign ───────────────────────────────────
  function station(i, cb) {
    const s = STAGES[i], scr = $('station');
    const prev = i > 0 ? STAGES[i - 1].name : '우리집';
    const next = i < STAGES.length - 1 ? STAGES[i + 1].name : '퇴근';
    scr.innerHTML = '';
    const w = el('div', 'sign-wrap');
    w.innerHTML = `<div class="sign-time">${fmtClock(s.start[0] * 60 + s.start[1])}</div>
      <div class="sign" style="--line:${s.line}">
        <div class="side prev">◀ ${esc(prev)}</div>
        <div class="mid"><div class="name"><span class="num">${i + 1}</span>${esc(s.name)}</div><div class="eng">${esc(s.eng)}</div></div>
        <div class="side next">${esc(next)} ▶</div>
      </div>
      <div class="sign-sub">${['지각하기 전에 회사까지', '점심시간이 끝나기 전에', '퇴근 시간까지 버티기', '막차 전에 끝내기'][i]}</div>`;
    scr.appendChild(w);
    scr.hidden = false;
    Sfx.play.door();
    setTimeout(() => { w.classList.add('out'); }, 2100);
    setTimeout(() => { scr.hidden = true; cb && cb(); }, 2450);
  }

  // ── greeting cards ─────────────────────────────────
  let pickKeys = null;
  function pick(cards, info, onChoose, onReroll) {
    const scr = $('pick');
    scr.innerHTML = '';
    const wrap = el('div', 'pick-wrap');
    const head = el('div', 'pick-head');
    head.innerHTML = `<h2>${esc(info.title)}</h2><p>${esc(info.sub)}</p>`;
    wrap.appendChild(head);
    const row = el('div', 'cards');
    cards.forEach((g, i) => {
      const n = NPCS[g.npc], r = RARITY[g.r];
      const b = el('button', 'card' + (g.r === 'curse' ? ' curse' : ''));
      b.style.setProperty('--rc', r.color); b.style.setProperty('--i', i);
      const have = info.taken[g.id] || 0;
      b.innerHTML = `<div class="band"><span>${r.label}</span><kbd>${i + 1}</kbd></div>
        <div class="who"><canvas width="116" height="116"></canvas><div><b>${esc(n.name)}</b><span>${esc(n.role)}</span></div></div>
        <div class="say">${esc(g.text)}</div>
        <div class="eff">${esc(g.desc)}</div>
        <div class="stack"><span>${have ? `보유 ${have}` : '새 인사'}</span><span>${have + 1} / ${g.max}</span></div>`;
      const cv = b.querySelector('canvas'), c = cv.getContext('2d');
      c.scale(1.16, 1.16);
      c.save(); c.beginPath(); c.arc(50, 50, 50, 0, TAU); c.clip(); Art.portrait(c, g.npc); c.restore();
      b.addEventListener('click', () => choose(i));
      b.addEventListener('mouseenter', () => Sfx.play.hover());
      row.appendChild(b);
    });
    wrap.appendChild(row);
    const foot = el('div', 'pick-foot');
    if (onReroll) {
      const rb = el('button', 'btn ghost', `다른 사람 만나기 <kbd>R</kbd> <span style="font-family:var(--f-led);font-size:14px">${info.rerolls}</span>`);
      rb.disabled = info.rerolls <= 0; if (rb.disabled) rb.style.opacity = 0.4;
      rb.addEventListener('click', () => { if (info.rerolls > 0) { cleanup(); onReroll(); } });
      foot.appendChild(rb);
    }
    wrap.appendChild(foot);
    scr.appendChild(wrap);
    scr.hidden = false;
    Sfx.play.card();
    let chosen = false;
    function choose(i) { if (chosen) return; chosen = true; cleanup(); scr.hidden = true; onChoose(cards[i]); }
    function cleanup() { if (pickKeys) removeEventListener('keydown', pickKeys); pickKeys = null; }
    cleanup();
    pickKeys = (e) => {
      const k = parseInt(e.key, 10);
      if (k >= 1 && k <= cards.length) { e.preventDefault(); choose(k - 1); }
      if ((e.key === 'r' || e.key === 'R') && onReroll && info.rerolls > 0) { cleanup(); onReroll(); }
    };
    setTimeout(() => { if (pickKeys) addEventListener('keydown', pickKeys); }, 250);
  }

  function bossIntro(b, cb) {
    const scr = $('bossIntro');
    scr.innerHTML = `<div class="alert"><div class="alert-inner"><div class="alert-kicker">⚠ 긴급 일정 ⚠</div><div class="alert-name">${esc(b.name)}</div><div class="alert-title">${esc(b.title)}</div></div></div>`;
    scr.hidden = false;
    Sfx.play.warn();
    setTimeout(() => { scr.hidden = true; cb && cb(); }, 2300);
  }

  function chipsHtml(taken) {
    const ids = Object.keys(taken).filter((k) => taken[k] > 0);
    if (!ids.length) return '<div class="chips-empty">아직 받은 인사가 없어요.</div>';
    return '<div class="chips">' + ids.map((id) => { const g = G_BY_ID[id]; return `<span class="chip" style="--rc:${RARITY[g.r].color}">${esc(g.text)}<i>×${taken[id]}</i></span>`; }).join('') + '</div>';
  }
  function statsHtml(st) {
    return '<div class="stats">' + st.map(([k, v]) => `<div class="stat"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('') + '</div>';
  }

  function pause(show, d, h) {
    const scr = $('pause');
    if (!show) { scr.hidden = true; return; }
    scr.innerHTML = `<div class="sheet"><h2>잠깐 숨 돌리기</h2><p class="sub">${esc(STAGES[d.stage].name)} · ${esc(d.clock)}</p>
      ${statsHtml(d.stats)}
      <div><div class="meter-label" style="margin-bottom:8px">받은 인사</div>${chipsHtml(d.taken)}</div>
      <div class="sheet-actions"><button class="btn primary" data-a="resume">계속하기 <kbd>Esc</kbd></button><button class="btn ghost" data-a="restart">처음부터</button><button class="btn ghost" data-a="quit">타이틀로</button></div></div>`;
    scr.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => h[b.dataset.a]()));
    scr.hidden = false;
  }

  function result(d, h) {
    const scr = $('result');
    scr.innerHTML = `<div class="sheet ${d.win ? 'result-win' : ''}"><h2>${esc(d.title)}</h2><p class="sub">${esc(d.sub)}</p>
      ${statsHtml(d.stats)}
      <div class="route" id="resRoute"></div>
      <div><div class="meter-label" style="margin-bottom:8px">받은 인사</div>${chipsHtml(d.taken)}</div>
      <div class="sheet-actions"><button class="btn primary" data-a="restart">다시 출근하기 <kbd>Enter</kbd></button><button class="btn ghost" data-a="quit">타이틀로</button></div></div>`;
    route(scr.querySelector('#resRoute'), d.reached);
    scr.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => h[b.dataset.a]()));
    scr.hidden = false;
  }

  function hideAll() { ['station', 'pick', 'bossIntro', 'pause', 'result'].forEach((i) => ($(i).hidden = true)); }

  return { $, route, setHud, toast, station, pick, bossIntro, pause, result, hideAll, fmtClock };
})();
