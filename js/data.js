'use strict';
// Seoul subway line colors carry through the whole game: each stage is a "station".
const LINE = { g: '#00a84d', o: '#ef7c1c', b: '#00a5de', p: '#996cac', pink: '#e6186c', navy: '#0052a4', olive: '#747f00' };
const ARENA = { w: 1400, h: 1000, pad: 70 };

const NPCS = {
  sua: { name: '수아', role: '편의점 야간 알바', color: LINE.g },
  guard: { name: '김 반장님', role: '아파트 경비실', color: LINE.navy },
  barista: { name: '준', role: '1층 카페 바리스타', color: '#a86b3a' },
  auntie: { name: '정 여사님', role: '빌딩 미화팀', color: LINE.pink },
  daeri: { name: '박 대리', role: '옆자리 동료', color: LINE.p },
  bus: { name: '버스 기사님', role: '7016번 버스', color: LINE.b },
  cat: { name: '치즈', role: '골목 고양이', color: LINE.o },
  fortune: { name: '???', role: '골목 끝 점집', color: '#c13cff' },
};

const RARITY = {
  common: { label: '일반', color: '#8c95a8', w: 64 },
  rare: { label: '희귀', color: LINE.b, w: 28 },
  epic: { label: '영웅', color: LINE.p, w: 8 },
  curse: { label: '저주', color: LINE.pink, w: 0 },
};

// Each greeting is literal magic. apply(s) mutates player stats.
const GREETINGS = [
  { id: 'agile', text: '민첩한 하루 되세요', npc: 'sua', r: 'common', max: 6, desc: '이동 속도 +10%\n대시 충전 -12%', apply: (s) => { s.speed *= 1.1; s.dashCd *= 0.88; } },
  { id: 'healthy', text: '건강한 하루 되세요', npc: 'guard', r: 'common', max: 5, desc: '최대 배터리 +2\n배터리 2칸 충전', apply: (s, p) => { s.maxHp += 2; p.hp = Math.min(p.hp + 2, s.maxHp); } },
  { id: 'strong', text: '힘찬 하루 되세요', npc: 'bus', r: 'common', max: 8, desc: '인사 위력 +18%', apply: (s) => { s.dmg *= 1.18; } },
  { id: 'diligent', text: '부지런한 하루 되세요', npc: 'auntie', r: 'common', max: 8, desc: '인사 속도 +14%', apply: (s) => { s.fireInt *= 0.877; } },
  { id: 'relaxed', text: '여유로운 하루 되세요', npc: 'cat', r: 'common', max: 4, desc: '커피 자석 범위 +45%\n경험치 +10%', apply: (s) => { s.magnet *= 1.45; s.xpMul *= 1.1; } },
  { id: 'sturdy', text: '든든한 하루 되세요', npc: 'guard', r: 'common', max: 4, desc: '최대 배터리 +1\n피격 후 무적 +0.2초', apply: (s, p) => { s.maxHp += 1; p.hp += 1; s.iframe += 0.2; } },
  { id: 'fresh', text: '상쾌한 하루 되세요', npc: 'barista', r: 'common', max: 4, desc: '18초마다 배터리 1칸 충전\n(중첩 시 주기 단축)', apply: (s) => { s.regen = s.regen ? s.regen * 0.75 : 18; } },
  { id: 'loud', text: '우렁찬 하루 되세요', npc: 'bus', r: 'common', max: 4, desc: '인사 사거리 +20%\n말풍선 속도 +20%', apply: (s) => { s.range *= 1.2; s.shotSpd *= 1.2; } },
  { id: 'lively', text: '활기찬 하루 되세요', npc: 'daeri', r: 'rare', max: 4, desc: '말풍선 +1개', apply: (s) => { s.shots += 1; } },
  { id: 'bright', text: '빛나는 하루 되세요', npc: 'sua', r: 'rare', max: 3, desc: '말풍선 관통 +1', apply: (s) => { s.pierce += 1; } },
  { id: 'warm', text: '따뜻한 하루 되세요', npc: 'auntie', r: 'rare', max: 4, desc: '주변의 적에게 지속 피해\n(반경·피해 증가)', apply: (s) => { s.auraR = s.auraR ? s.auraR + 16 : 72; s.auraDmg = s.auraDmg ? s.auraDmg + 9 : 14; } },
  { id: 'nimble', text: '날쌘 하루 되세요', npc: 'cat', r: 'rare', max: 2, desc: '대시 횟수 +1', apply: (s) => { s.dashCharges += 1; } },
  { id: 'thrill', text: '통쾌한 하루 되세요', npc: 'daeri', r: 'rare', max: 4, desc: '치명타 확률 +12%\n치명타 배율 +0.3', apply: (s) => { s.crit += 0.12; s.critMul += 0.3; } },
  { id: 'unstoppable', text: '거침없는 하루 되세요', npc: 'bus', r: 'rare', max: 3, desc: '대시로 부딪힌 적에게 피해\n(위력의 3배, 중첩 +2배)', apply: (s) => { s.dashDmg = s.dashDmg ? s.dashDmg + 2 : 3; } },
  { id: 'cool', text: '시원한 하루 되세요', npc: 'barista', r: 'rare', max: 3, desc: '말풍선에 맞은 적 감속\n(35%, 중첩 시 지속 증가)', apply: (s) => { s.slow = s.slow ? s.slow + 0.6 : 1.2; } },
  { id: 'careful', text: '꼼꼼한 하루 되세요', npc: 'guard', r: 'rare', max: 3, desc: '퍼펙트 회피 판정 +40%\n민첩 지수 유지 +50%', apply: (s) => { s.perfectWin *= 1.4; s.agiHold *= 1.5; } },
  { id: 'lightning', text: '번개같은 하루 되세요', npc: 'sua', r: 'epic', max: 3, desc: '퍼펙트 회피 시 주변 적\n5명에게 연쇄 번개', apply: (s) => { s.chain += 1; } },
  { id: 'double', text: '두 배로 좋은 하루 되세요', npc: 'daeri', r: 'epic', max: 2, desc: '말풍선이 적을 처치하면\n두 갈래로 분열', apply: (s) => { s.split += 1; } },
  { id: 'unshaken', text: '끄떡없는 하루 되세요', npc: 'guard', r: 'epic', max: 3, desc: '구간마다 피해를 1회 막는\n보호막 +1', apply: (s, p) => { s.shield += 1; p.shieldNow = s.shield; } },
  { id: 'full', text: '꽉 찬 하루 되세요', npc: 'auntie', r: 'epic', max: 2, desc: '말풍선 크기 +35%\n명중 시 작은 폭발', apply: (s) => { s.shotSize *= 1.35; s.splash += 1; } },
  { id: 'sparkle', text: '반짝이는 하루 되세요', npc: 'barista', r: 'epic', max: 2, desc: '6번째 인사마다 큰 인사\n(5배 위력, 무한 관통)', apply: (s) => { s.bigEvery = s.bigEvery ? Math.max(3, s.bigEvery - 2) : 6; } },
  // cursed offers only come from the fortune teller
  { id: 'monday', text: '월요일 같은 하루 되세요', npc: 'fortune', r: 'curse', max: 1, desc: '인사 위력 +55%\n이동 속도 -12%', apply: (s) => { s.dmg *= 1.55; s.speed *= 0.88; } },
  { id: 'busy', text: '바쁜 하루 되세요', npc: 'fortune', r: 'curse', max: 1, desc: '적 출현 +35%\n경험치 +60%', apply: (s) => { s.spawnMul *= 1.35; s.xpMul *= 1.6; } },
  { id: 'tired', text: '피곤한 하루 되세요', npc: 'fortune', r: 'curse', max: 1, desc: '최대 배터리 -3\n대시 충전 -40%, 대시 +1', apply: (s, p) => { s.maxHp = Math.max(3, s.maxHp - 3); p.hp = Math.min(p.hp, s.maxHp); s.dashCd *= 0.6; s.dashCharges += 1; } },
  { id: 'edge', text: '아슬아슬한 하루 되세요', npc: 'fortune', r: 'curse', max: 1, desc: '최대 배터리 -2\n배터리 3칸 이하일 때\n위력 +100%, 이동 +20%', apply: (s, p) => { s.maxHp = Math.max(3, s.maxHp - 2); p.hp = Math.min(p.hp, s.maxHp); s.edge = 1; } },
  { id: 'overtime', text: '야근하는 하루 되세요', npc: 'fortune', r: 'curse', max: 1, desc: '인사 속도 +45%\n구간 시간 +8초', apply: (s) => { s.fireInt *= 0.69; s.waveExtra += 8; } },
];
const G_BY_ID = Object.fromEntries(GREETINGS.map((g) => [g.id, g]));

function baseStats() {
  return {
    maxHp: 10, speed: 215, dmg: 10, fireInt: 0.46, shots: 1, pierce: 0, shotSize: 1, shotSpd: 470, range: 430,
    dashCd: 1.15, dashCharges: 1, dashDmg: 0, crit: 0.05, critMul: 2, magnet: 70, regen: 0, iframe: 0.9,
    auraR: 0, auraDmg: 0, slow: 0, perfectWin: 0.2, agiHold: 1, chain: 0, split: 0, shield: 0, splash: 0,
    bigEvery: 0, spawnMul: 1, xpMul: 1, edge: 0, waveExtra: 0,
  };
}

// Enemy definitions. hp scales with stage multiplier.
const ENEMIES = {
  pigeon: { hp: 14, r: 13, spd: 118, dmg: 1, xp: 1, ai: 'chase', wobble: 1 },
  alarm: { hp: 34, r: 15, spd: 52, dmg: 1, xp: 2, ai: 'ringer' },
  scooter: { hp: 26, r: 14, spd: 70, dmg: 1, xp: 2, ai: 'charger', chargeSpd: 520 },
  bike: { hp: 40, r: 16, spd: 80, dmg: 1, xp: 3, ai: 'charger', chargeSpd: 640, chains: 2 },
  tteok: { hp: 44, r: 15, spd: 72, dmg: 1, xp: 2, ai: 'chase', splits: 'tteokMini' },
  tteokMini: { hp: 12, r: 9, spd: 125, dmg: 1, xp: 1, ai: 'chase', art: 'tteok' },
  ghost: { hp: 30, r: 14, spd: 55, dmg: 1, xp: 3, ai: 'shooter', shot: 'q', ghost: true },
  spam: { hp: 12, r: 12, spd: 150, dmg: 1, xp: 1, ai: 'chase', wobble: 0.6, group: 5 },
  calendar: { hp: 36, r: 14, spd: 60, dmg: 1, xp: 3, ai: 'blinker' },
  printer: { hp: 70, r: 18, spd: 26, dmg: 1, xp: 4, ai: 'turret', shot: 'paper' },
  sticky: { hp: 30, r: 12, spd: 96, dmg: 1, xp: 2, ai: 'chase', sticky: true },
  wisp: { hp: 18, r: 10, spd: 165, dmg: 1, xp: 1, ai: 'chase', wobble: 1.4, group: 4 },
};

const BOSSES = {
  alarmKing: { name: '스누즈 대왕', title: '5분만 더… 를 지배하는 자', hp: 1500, r: 56, art: 'alarmKing', spd: 70 },
  ramenPot: { name: '분노의 라면냄비', title: '점심 웨이팅 40분의 원흉', hp: 2500, r: 60, art: 'ramenPot', spd: 60 },
  bujang: { name: '부장님', title: '"잠깐 얘기 좀 할까?"', hp: 3600, r: 50, art: 'bujang', spd: 95 },
  demon: { name: '야근 마왕', title: '꺼지지 않는 모니터의 군주', hp: 5600, r: 70, art: 'demon', spd: 50 },
};

// Each stage is a station on the 민첩선 line.
const STAGES = [
  { id: 'commute', name: '출근길', eng: 'Commute', start: [7, 40], end: [8, 59], line: LINE.g, music: 'stage1', hpMul: 1,
    death: '지각 처리되었습니다', deathSub: '출근 도장을 못 찍었어요.',
    waves: [
      { dur: 38, pool: [['pigeon', 6], ['alarm', 2], ['scooter', 1, 15]], rate: [1.05, 0.62], cap: 40 },
      { dur: 46, pool: [['pigeon', 5], ['alarm', 3], ['scooter', 3]], rate: [0.8, 0.45], cap: 60 },
    ], boss: 'alarmKing', bossAdds: [['pigeon', 1]] },
  { id: 'lunch', name: '점심시간', eng: 'Lunch Rush', start: [12, 10], end: [12, 59], line: LINE.o, music: 'stage2', hpMul: 1.7,
    death: '점심을 놓쳤습니다', deathSub: '배고픔에 쓰러졌어요.',
    waves: [
      { dur: 42, pool: [['tteok', 4], ['bike', 2], ['pigeon', 3], ['ghost', 1, 12]], rate: [0.85, 0.5], cap: 60 },
      { dur: 50, pool: [['tteok', 4], ['bike', 3], ['ghost', 3], ['pigeon', 2]], rate: [0.7, 0.38], cap: 80 },
    ], boss: 'ramenPot', bossAdds: [['tteokMini', 1]] },
  { id: 'office', name: '오후 업무', eng: 'Afternoon', start: [15, 0], end: [18, 59], line: LINE.b, music: 'stage3', hpMul: 2.7,
    death: '부장님께 불려갔습니다', deathSub: '보고서는 내일까지래요.',
    waves: [
      { dur: 44, pool: [['spam', 5], ['calendar', 2], ['printer', 1, 10]], rate: [0.95, 0.55], cap: 75 },
      { dur: 52, pool: [['spam', 5], ['calendar', 3], ['printer', 2], ['sticky', 2]], rate: [0.8, 0.42], cap: 95 },
    ], boss: 'bujang', bossAdds: [['spam', 1]] },
  { id: 'night', name: '야근', eng: 'Overtime', start: [22, 0], end: [23, 59], line: LINE.p, music: 'stage4', hpMul: 3.9,
    death: '야근에 삼켜졌습니다', deathSub: '모니터 불빛만 남았어요.', dark: true,
    waves: [
      { dur: 46, pool: [['wisp', 5], ['sticky', 3], ['printer', 1], ['calendar', 1]], rate: [0.85, 0.48], cap: 95 },
      { dur: 54, pool: [['wisp', 5], ['sticky', 3], ['printer', 2], ['spam', 2], ['calendar', 2]], rate: [0.7, 0.36], cap: 120 },
    ], boss: 'demon', bossAdds: [['wisp', 1]] },
];

const SHOT_WORDS = ['안녕!', '하이!', '좋은 아침!', '안녕하세요', '수고하세요!', '반가워요!', '굿모닝!', '오셨어요?'];
const SHOT_WORDS_BY_STAGE = [
  ['안녕!', '좋은 아침!', '굿모닝!', '안녕하세요', '하이!'],
  ['맛점!', '냠냠!', '안녕!', '반가워요!', '하이!'],
  ['넵!', '확인!', '수고하세요', '감사합니다', '안녕하세요'],
  ['수고!', '넵!', '힘내요!', '내일 봬요', '퇴근!'],
];
