// 석굴 군주의 옥좌 — 시뮬레이션 엔진
// 역할·스킬·아이템·맵·전투 AI·승패. UI는 js/ui.js.
// 밸런스를 바꿀 때는 아래 TUNE만 먼저 손본다.
const DT = 0.05, TILE = 32, MW = 44, MH = 44;
const VIEW_W = 360, VIEW_H = 520;
const rnd = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];

// ---------- 영웅 ----------
const ROLE_ORDER = ['tank', 'healer', 'mage', 'rogue', 'hunter'];
const ROLE_INFO = {
  tank:   { name: '전사',   names: ['전사', '수호 기사', '석굴 수호자'], hp: 1500, range: 34,  speed: 88, atk: 30, atkRate: 1.2, armor: 0.35 },
  healer: { name: '치유사', names: ['치유사', '성역 사제', '심연 성자'], hp: 760,  range: 190, speed: 88, atk: 16, atkRate: 1.5, armor: 0, mana: 1000, regen: 9 },
  mage:   { name: '마법사', names: ['마법사', '서리 현자', '공허 술사'], hp: 700,  range: 190, speed: 88, atk: 36, atkRate: 1.1, armor: 0, mana: 900, regen: 15 },
  rogue:  { name: '도적',   names: ['도적', '그림자 칼날', '밤의 암살자'], hp: 900,  range: 34,  speed: 92, atk: 42, atkRate: 1.0, armor: 0.1 },
  hunter: { name: '사냥꾼', names: ['사냥꾼', '야생 추적자', '폭풍 사수'], hp: 820,  range: 210, speed: 90, atk: 34, atkRate: 1.05, armor: 0.05 },
};
const ULTS = {
  tank:   [
    { name: '최후의 저항', desc: '5초간 파티 받는 피해 50% 감소' },
    { name: '철벽의 서약', desc: '6초간 파티 피해 55% 감소 · 탱커 보호막' },
    { name: '석굴의 심판', desc: '7초간 파티 피해 60% 감소 · 광역 위협' },
  ],
  healer: [
    { name: '신성한 찬가', desc: '파티 전원 450 치유' },
    { name: '성역의 찬가', desc: '파티 520 치유 · 짧은 재생' },
    { name: '심연의 축복', desc: '파티 600 치유 · 보호막' },
  ],
  mage: [
    { name: '유성 낙하', desc: '전투 중인 모든 적에게 600 피해' },
    { name: '쌍성 낙하', desc: '모든 적 720 피해 · 감속' },
    { name: '공허 유성', desc: '모든 적 900 피해 · DoT' },
  ],
  rogue: [
    { name: '칼날 폭풍', desc: '6초간 공격 속도 3배, 주변 적 모두 타격' },
    { name: '그림자 폭풍', desc: '7초간 공속 3.2배 · 치명 +10%' },
    { name: '학살의 춤', desc: '8초간 공속 3.5배 · 처형 피해' },
  ],
  hunter: [
    { name: '폭풍 화살', desc: '전투 중인 모든 적에게 화살비 420 피해' },
    { name: '야생 화살비', desc: '모든 적 520 피해 · 감속' },
    { name: '천둥 화살', desc: '모든 적 650 피해 · 속박' },
  ],
};

// tier 0 기본 4 · tier 1 진화 1칸 · tier 2 각성 1칸. 화면은 위 3, 아래 3.
const SKILLS = {
  tank: [
    { id: 'taunt', name: '도발', abbr: '도발', cd: 8, tier: 0, desc: '대상의 공격을 나에게 돌림',
      conds: [['other', '적이 다른 아군을 공격'], ['squishy', '적이 치유사·마법사·사냥꾼을 공격']] },
    { id: 'bash', name: '방패 강타', abbr: '강타', cd: 9, tier: 0, desc: '피해 + 시전 차단',
      conds: [['interrupt', '근처 적이 차단 가능 기술 시전'], ['always', '쿨마다 대상에게']] },
    { id: 'clap', name: '천둥벼락', abbr: '천둥', cd: 6, tier: 0, desc: '주변 광역 피해 + 위협 + 감속',
      conds: [['n2', '근처 적 2명 이상'], ['n3', '근처 적 3명 이상']] },
    { id: 'wall', name: '방패의 벽', abbr: '방벽', cd: 14, tier: 0, desc: '5초간 받는 피해 60% 감소',
      conds: [['hp40', '내 HP 40% 이하'], ['strike', '보스가 「대지 강타」 준비'], ['hp60', '내 HP 60% 이하']] },
    { id: 'vow', name: '수호의 맹세', abbr: '맹세', cd: 22, tier: 1, desc: '가장 다친 아군 2초 피해 70% 감소',
      conds: [['low35', '아군 HP 35% 이하'], ['strike', '보스 대지 강타 준비']] },
    { id: 'unbreak', name: '불굴', abbr: '불굴', cd: 30, tier: 2, desc: '치명적 피해 1회 무효 + 방벽 3초',
      conds: [['hp25', '내 HP 25% 이하'], ['strike', '보스 대지 강타 준비']] },
  ],
  healer: [
    { id: 'flash', name: '빠른 치유', abbr: '치유', cd: 0, tier: 0, desc: '1.2초 시전, 단일 190 치유 · 마나 55',
      conds: [['low70', '가장 다친 아군 HP 70% 이하'], ['tank80', '탱커 HP 80% 이하'], ['low50', '가장 다친 아군 HP 50% 이하']] },
    { id: 'rain', name: '치유의 비', abbr: '비', cd: 9, tier: 0, desc: '1.5초 시전, 전원 170 치유 · 마나 160',
      conds: [['n3', '아군 3명+ HP 75% 이하'], ['n2', '아군 2명+ HP 70% 이하']] },
    { id: 'bubble', name: '보호막', abbr: '보호', cd: 15, tier: 0, desc: '350 피해 흡수 · 마나 80',
      conds: [['low30', '아군 HP 30% 이하'], ['strike', '보스 「대지 강타」 준비 → 탱커'], ['blast', '「암흑 폭발」 시전 중 → 가장 약한 아군']] },
    { id: 'dispel', name: '정화', abbr: '정화', cd: 4, tier: 0, desc: '독 제거 · 마나 40',
      conds: [['any', '독에 걸린 아군 있음'], ['two', '독에 걸린 아군 2명+']] },
    { id: 'bond', name: '생명 고리', abbr: '고리', cd: 8, tier: 1, desc: '단일 치유 + 두 번째 대상 40%',
      conds: [['low70', '아군 HP 70% 이하'], ['tank80', '탱커 다침']] },
    { id: 'revive', name: '부활 축복', abbr: '부활', cd: 45, tier: 2, desc: '전투 중 쓰러진 아군 1명 35% HP 부활',
      conds: [['dead', '아군 사망'], ['boss', '보스전만']] },
  ],
  mage: [
    { id: 'fire', name: '화염구', abbr: '화염', cd: 0, tier: 0, desc: '1.5초 시전, 130 피해 · 마나 30',
      conds: [['m30', '마나 30% 이상'], ['always', '항상']] },
    { id: 'bliz', name: '눈보라', abbr: '눈보', cd: 10, tier: 0, desc: '4초간 지역 피해 + 감속 · 마나 110',
      conds: [['n3', '적 3명 이상'], ['n2', '적 2명 이상']] },
    { id: 'nova', name: '얼음 회오리', abbr: '회오', cd: 12, tier: 0, desc: '주변 피해 + 2초 속박 · 마나 60',
      conds: [['onme', '적이 나에게 붙음'], ['n2', '내 주변 적 2명+']] },
    { id: 'blink', name: '점멸', abbr: '점멸', cd: 7, tier: 0, desc: '짧은 순간이동',
      conds: [['onme', '적이 나에게 붙음'], ['pool', '장판 위에 서 있음']] },
    { id: 'overload', name: '마력 과부하', abbr: '과부', cd: 16, tier: 1, desc: '다음 스킬 피해 +50%',
      conds: [['always', '쿨마다'], ['boss', '보스전']] },
    { id: 'meteor', name: '운석 잔여', abbr: '잔여', cd: 20, tier: 2, desc: '대상 지점에 지속 화염 지대',
      conds: [['n2', '적 2명+'], ['boss', '보스 우선']] },
  ],
  rogue: [
    { id: 'kick', name: '발차기', abbr: '발차', cd: 10, tier: 0, desc: '적 시전 차단',
      conds: [['any', '차단 가능 시전 (보스 우선)'], ['boss', '보스 시전만 차단']] },
    { id: 'evis', name: '절개', abbr: '절개', cd: 7, tier: 0, desc: '단일 190 피해',
      conds: [['always', '쿨마다'], ['exec', '대상 HP 35% 이하 (마무리)']] },
    { id: 'fan', name: '칼날 부채', abbr: '부채', cd: 8, tier: 0, desc: '주변 광역 70 피해',
      conds: [['n3', '근처 적 3명 이상'], ['n2', '근처 적 2명 이상']] },
    { id: 'vanish', name: '소멸', abbr: '소멸', cd: 25, tier: 0, desc: '위협 초기화 + 3초 회피',
      conds: [['hp40', '내 HP 40% 이하'], ['onme', '적이 나를 공격']] },
    { id: 'poison', name: '독바르기', abbr: '독', cd: 10, tier: 1, desc: '대상에게 독 6초',
      conds: [['always', '쿨마다'], ['boss', '보스 우선']] },
    { id: 'mark', name: '암살 표식', abbr: '표식', cd: 12, tier: 2, desc: '표식 대상 받는 피해 +15%',
      conds: [['boss', '보스'], ['exec', 'HP 35% 이하']] },
  ],
  hunter: [
    { id: 'shot', name: '조준 사격', abbr: '사격', cd: 0, tier: 0, desc: '0.9초 조준, 단일 155 피해',
      conds: [['always', '항상'], ['exec', '대상 HP 35% 이하 (마무리)']] },
    { id: 'volley', name: '다중 사격', abbr: '다발', cd: 8, tier: 0, desc: '근처 적 여러 명에게 60 피해',
      conds: [['n3', '적 3명 이상'], ['n2', '적 2명 이상']] },
    { id: 'trap', name: '곰덫', abbr: '덫', cd: 12, tier: 0, desc: '근처 근접 적 속박 2.5초',
      conds: [['onme', '적이 나에게 붙음'], ['n2', '내 주변 적 2명+']] },
    { id: 'disengage', name: '후퇴', abbr: '후퇴', cd: 8, tier: 0, desc: '뒤로 뛰어 거리 확보',
      conds: [['onme', '적이 나에게 붙음'], ['pool', '장판 위에 서 있음']] },
    { id: 'pierce', name: '관통 사격', abbr: '관통', cd: 9, tier: 1, desc: '일직선 적에게 피해',
      conds: [['n2', '적 2명+'], ['always', '쿨마다']] },
    { id: 'focus', name: '집중 사격', abbr: '집중', cd: 14, tier: 2, desc: '보스 채널 고피해',
      conds: [['boss', '보스'], ['exec', 'HP 35% 이하']] },
  ],
};
const TARGETS = [['tank', '탱커의 대상'], ['weak', '체력 낮은 적'], ['caster', '시전형 적 우선']];

const STAGE_NEED = [1, 30, 70]; // 기본 / 진화 / 각성 요구 파티 레벨
const STAGE_NAME = ['기본', '진화', '각성'];
const NFLOORS = 7;
const TEST_DUNGEONS = [
  { id: 'base', name: '수련의 석굴', stage: 0, nFloors: NFLOORS, floor: 1, desc: '기본 캐릭 · 기본 장비', tag: '기본', theme: 'grotto' },
  { id: 'evo',  name: '진화의 회랑', stage: 1, nFloors: NFLOORS, floor: 3, desc: '진화 캐릭 · 진화 장비', tag: '진화', theme: 'corridor' },
  { id: 'awk',  name: '각성의 심연', stage: 2, nFloors: NFLOORS, floor: 5, desc: '각성 캐릭 · 각성 장비', tag: '각성', theme: 'abyss' },
];
// 유저 진행. gear 는 드롭 단계(0 기본 / 1 진화 / 2 각성)이고 캐릭터 진화를 강제하지 않는다.
// diff 는 전투 배율용 층. 1–2는 입문 난이도.
const WORLD_STAGES = [
  { id: 1,  name: '입구 석굴',   floors: 5, theme: 'grotto',   gear: 0, diff: 1, blurb: '첫 길. 기본 장비.' },
  { id: 2,  name: '이끼 동굴',   floors: 5, theme: 'grotto',   gear: 0, diff: 1, blurb: '같은 석굴, 조금 더 깊다.' },
  { id: 3,  name: '종유 갱도',   floors: 6, theme: 'grotto',   gear: 0, diff: 2, blurb: '길이 꺾이기 시작한다.' },
  { id: 4,  name: '균열 회랑',   floors: 6, theme: 'corridor', gear: 0, diff: 2, blurb: '회랑이 열린다.' },
  { id: 5,  name: '횃불 광장',   floors: 6, theme: 'corridor', gear: 1, diff: 3, blurb: '진화 장비가 떨어진다.' },
  { id: 6,  name: '무너진 제단', floors: 7, theme: 'corridor', gear: 1, diff: 3, blurb: '제단 잔해 사이.' },
  { id: 7,  name: '심층 사슬',   floors: 7, theme: 'abyss',    gear: 1, diff: 4, blurb: '사슬이 늘어선 심층.' },
  { id: 8,  name: '각성 나락',   floors: 7, theme: 'abyss',    gear: 2, diff: 5, blurb: '각성 장비가 떨어진다.' },
  { id: 9,  name: '군주의 계단', floors: 8, theme: 'abyss',    gear: 2, diff: 6, blurb: '옥좌로 올라가는 계단.' },
  { id: 10, name: '옥좌',        floors: 8, theme: 'abyss',    gear: 2, diff: 7, blurb: '석굴 군주.' },
];
function worldStageById(id) {
  const n = typeof id === 'number' ? id : parseInt(id, 10);
  return WORLD_STAGES.find(s => s.id === n) || WORLD_STAGES[0];
}
const roleName = (role, stage) => (ROLE_INFO[role].names && ROLE_INFO[role].names[stage]) || ROLE_INFO[role].name;
const ultOf = (role, stage) => (ULTS[role][stage] || ULTS[role][0]);
const skillsForStage = (role, stage) => SKILLS[role].filter(s => s.tier <= stage);
const skillById = (role, id) => SKILLS[role].find(s => s.id === id);

function activeCap(stage) { return 4 + (stage >= 1 ? 1 : 0) + (stage >= 2 ? 1 : 0); }
function defaultLoadout(role, stage) {
  const unlocked = skillsForStage(role, stage);
  const order = unlocked.filter(s => s.tier === 0).slice(0, 4).map(s => s.id);
  const evo = unlocked.find(s => s.tier === 1);
  const awk = unlocked.find(s => s.tier === 2);
  if (stage >= 1 && evo) order.push(evo.id);
  if (stage >= 2 && awk) order.push(awk.id);
  const on = {}, cond = {};
  for (const s of unlocked) { on[s.id] = order.includes(s.id); cond[s.id] = s.conds[0][0]; }
  return { order, on, cond, target: 'tank', dodge: role !== 'mage' };
}
function defaultConfig(stage) {
  stage = stage || 0;
  const c = {};
  for (const r of ROLE_ORDER) c[r] = defaultLoadout(r, stage);
  c.tank.cond.wall = 'strike';
  const healOrder = ['bubble', 'rain', 'dispel', 'flash'];
  if (stage >= 1) healOrder.push('bond');
  if (stage >= 2) healOrder.push('revive');
  c.healer.order = healOrder.filter(id => c.healer.on[id] != null);
  for (const id of c.healer.order) c.healer.on[id] = true;
  return c;
}
function emptyStages() { const o = {}; for (const r of ROLE_ORDER) o[r] = 0; return o; }
function canEvolve(P, role) {
  const st = (P.stages && P.stages[role]) || 0;
  if (st >= 2) return false;
  return P.lvl >= STAGE_NEED[st + 1];
}
function evolveHero(P, role) {
  if (!canEvolve(P, role)) return false;
  P.stages[role] = (P.stages[role] || 0) + 1;
  return true;
}
function effectiveStage(P, role, runStage) {
  const saved = (P.stages && P.stages[role]) || 0;
  return Math.max(saved, runStage == null ? 0 : runStage);
}


// ---------- 장비 (영웅당 6칸, 가방은 한 칸에 아이템 하나) ----------
// 디아블로2식: 기본 능력치(아이템 종류와 레벨로 정해짐) + 무작위 옵션(접두어·접미어, 아이템 레벨이 높을수록 높은 단계가 붙음)
const SLOTS = [['weapon', '무기'], ['offhand', '보조무기'], ['helm', '투구'], ['chest', '갑옷'], ['gloves', '장갑'], ['boots', '장화']];
const SLOT_NAME = Object.fromEntries(SLOTS);
const BAG_MAX = 60;
const RARITY = [
  { id: 'common', name: '기본' },
  { id: 'rare',   name: '레어' },
  { id: 'epic',   name: '에픽' },
  { id: 'legend', name: '전설' },
];
const ARMOR_CLASS = { tank: 'plate', healer: 'cloth', mage: 'cloth', rogue: 'leather', hunter: 'leather' };
const ARMOR_CLASS_NAME = { plate: '판금', leather: '가죽', cloth: '천' };
const DROP_WEIGHTS = {
  base: [62, 30, 7.5, 0.5],
  evo:  [45, 40, 13, 2],
  awk:  [30, 45, 20, 5],
};
// 잡몹. 층이 길어서 굴릴 횟수는 많지만 한 마리는 거의 안 준다.
// 일반 0.4% · 용사 1.8%. 한 층(약 30마리)에 아무것도 없을 때가 더 많다.
// 등급은 기본이 대부분. 에픽은 그 드랍 안에서도 희귀, 전설은 기적에 가깝다.
const TRASH_DROP = { normal: 0.004, champ: 0.018 };
const TRASH_DROP_CAP = { normal: 0.008, champ: 0.03 };
const TRASH_WEIGHTS = [92, 7.4, 0.58, 0.02];
const GEAR_SKILLS = {
  tank: [
    { id: 'g_threat_pulse', name: '위협 파동', desc: '피격 시 근처 적 위협 +200' },
    { id: 'g_wall_plus', name: '철벽 연장', desc: '방패의 벽 지속 +1초' },
    { id: 'g_strike_guard', name: '강타 수호', desc: '대지 강타 피해 25% 흡수' },
  ],
  healer: [
    { id: 'g_heal_bubble', name: '치유 보호', desc: '치유 시 대상에게 소량 보호막' },
    { id: 'g_mana_mercy', name: '마나 자비', desc: '마나 10% 이하 시 1회 무료 치유' },
    { id: 'g_pool_soft', name: '장판 완화', desc: '파티 장판 피해 −15%' },
  ],
  mage: [
    { id: 'g_fire_boom', name: '화염 확산', desc: '화염구 피해 +15%' },
    { id: 'g_blink_bang', name: '점멸 잔열', desc: '점멸 후 짧은 폭파' },
    { id: 'g_boss_spell', name: '심연 주문', desc: '보스 주문 피해 +12%' },
  ],
  rogue: [
    { id: 'g_evis_poison', name: '독 절개', desc: '절개 치명 시 독 부여' },
    { id: 'g_vanish_swift', name: '그림자 질주', desc: '소멸 중 이속 +20%' },
    { id: 'g_kick_energy', name: '차단 기세', desc: '차단 성공 시 단기 가속' },
  ],
  hunter: [
    { id: 'g_shot_pierce', name: '관통 조준', desc: '조준 사격이 약한 관통' },
    { id: 'g_trap_long', name: '덫 연장', desc: '곰덫 지속 +0.8초' },
    { id: 'g_boss_mark', name: '사냥 표식', desc: '보스에게 주는 피해 +10%' },
  ],
};
function rollWeighted(w) {
  const sum = w.reduce((a, b) => a + b, 0);
  let r = Math.random() * sum;
  for (let i = 0; i < w.length; i++) { r -= w[i]; if (r <= 0) return i; }
  return 0;
}
function rollRarity(dungeonId, luck) {
  const w = (DROP_WEIGHTS[dungeonId] || DROP_WEIGHTS.base).slice();
  if (luck) { w[1] *= 1 + luck; w[2] *= 1 + luck * 0.5; w[3] *= 1 + luck * 0.35; }
  return rollWeighted(w);
}
function rollTrashRarity() {
  return rollWeighted(TRASH_WEIGHTS);
}
function attachGearSkill(it) {
  const pool = GEAR_SKILLS[it.role] || [];
  if (!pool.length) return;
  if (it.rar === 3) {
    it.gearSkill = pool[it.id % pool.length];
  } else if (it.rar === 2 && Math.random() < 0.35) {
    it.gearSkill = pick(pool);
  }
}

// 능력치 정의: 이름, 표시 방식, 역할별 전투 가치(장비 비교에 사용)
const STATS = {
  pow:      { name: '공격력', unit: '%', w: { tank: 1, healer: 0.6, mage: 1.1, rogue: 1.1, hunter: 1.15 } },
  hp:       { name: '체력', unit: '%', w: { tank: 1.1, healer: 0.8, mage: 0.7, rogue: 0.8, hunter: 0.75 } },
  haste:    { name: '가속', unit: '%', w: { tank: 1.2, healer: 1.4, mage: 1.5, rogue: 1.4, hunter: 1.45 } },
  dr:       { name: '받는 피해 감소', unit: '%', w: { tank: 3, healer: 2, mage: 2, rogue: 2.2, hunter: 2 } },
  crit:     { name: '치명타 확률', unit: '%', w: { tank: 0.8, healer: 0.2, mage: 1.6, rogue: 1.6, hunter: 1.7 } },
  critDmg:  { name: '치명타 피해', unit: '%', w: { tank: 0.15, healer: 0, mage: 0.35, rogue: 0.4, hunter: 0.4 } },
  healPow:  { name: '치유량', unit: '%', w: { tank: 0, healer: 1.5, mage: 0, rogue: 0, hunter: 0 } },
  regen:    { name: '마나 재생', unit: '%', w: { tank: 0, healer: 0.5, mage: 0.4, rogue: 0, hunter: 0 } },
  cdr:      { name: '재사용 대기시간 감소', unit: '%', w: { tank: 2, healer: 1.5, mage: 1.8, rogue: 2, hunter: 1.8 } },
  leech:    { name: '생명력 흡수', unit: '%', w: { tank: 2, healer: 0, mage: 1.2, rogue: 2.5, hunter: 1.4 } },
  hpRegen:  { name: '초당 체력 재생', unit: '‰', w: { tank: 2.5, healer: 1.5, mage: 1.5, rogue: 2, hunter: 1.6 } },
  thorns:   { name: '근접 피해 반사', unit: '%', w: { tank: 0.5, healer: 0, mage: 0, rogue: 0.2, hunter: 0 } },
  poisonRes:{ name: '독 저항', unit: '%', w: { tank: 0.2, healer: 0.2, mage: 0.2, rogue: 0.2, hunter: 0.25 } },
  move:     { name: '이동 속도', unit: '%', w: { tank: 0.3, healer: 0.2, mage: 0.2, rogue: 0.3, hunter: 0.4 } },
  gold:     { name: '골드 획득', unit: '%', w: { tank: 0, healer: 0, mage: 0, rogue: 0, hunter: 0 } },
  mf:       { name: '매직 아이템 발견', unit: '%', w: { tank: 0, healer: 0, mage: 0, rogue: 0, hunter: 0 } },
  xp:       { name: '경험치 획득', unit: '%', w: { tank: 0, healer: 0, mage: 0, rogue: 0, hunter: 0 } },
};
const statText = (k, v) => k === 'hpRegen' ? `${STATS[k].name} ${(v / 10).toFixed(1)}%` : `${STATS[k].name} +${v}${STATS[k].unit}`;
// 기본 능력치 (아이템 종류): [기본, 레벨당]
const IMPLICIT = {
  weapon:  { pow: [2, 0.7] },
  offhand: { tank: { dr: [1, 0.08], hp: [1, 0.25] }, healer: { healPow: [3, 0.5] }, mage: { pow: [1, 0.35], regen: [5, 0.6] }, rogue: { pow: [1, 0.3], crit: [1, 0.07] }, hunter: { crit: [1, 0.08], haste: [1, 0.2] } },
  helm:    { hp: [1.5, 0.45] },
  chest:   { hp: [2, 0.65], dr: [0.5, 0.06] },
  gloves:  { haste: [1, 0.25] },
  boots:   { hp: [1, 0.25], move: [3, 0.15] },
};
// 무작위 옵션: [필요 아이템 레벨, 이름, 최소, 최대]. slots = 붙을 수 있는 칸, roles = 붙을 수 있는 직업
const AFFIXES = {
  pre: [
    { stat: 'pow', slots: ['weapon', 'offhand', 'gloves', 'helm'], mult: { weapon: 1.6 }, t: [[1, '잔혹한', 3, 6], [8, '흉포한', 7, 11], [16, '무자비한', 12, 17], [26, '파멸의', 18, 25], [38, '신살자의', 26, 34]] },
    { stat: 'hp', slots: ['helm', 'chest', 'boots', 'offhand', 'gloves'], mult: { chest: 1.5 }, t: [[1, '튼튼한', 3, 6], [8, '강건한', 7, 11], [16, '거인의', 12, 17], [26, '불멸의', 18, 25], [38, '태초의', 26, 34]] },
    { stat: 'dr', slots: ['helm', 'chest', 'offhand', 'boots'], t: [[1, '단단한', 1, 2], [10, '강철의', 3, 4], [20, '금강의', 5, 6], [32, '수호신의', 7, 8]] },
    { stat: 'crit', slots: ['weapon', 'gloves', 'helm'], roles: ['tank', 'mage', 'rogue', 'hunter'], t: [[1, '날카로운', 1, 3], [10, '예리한', 4, 6], [20, '치명적인', 7, 9], [32, '심장을 노리는', 10, 12]] },
    { stat: 'critDmg', slots: ['weapon', 'gloves'], roles: ['tank', 'mage', 'rogue', 'hunter'], t: [[5, '잔인한', 10, 20], [18, '처형자의', 21, 35], [30, '학살자의', 36, 50]] },
    { stat: 'healPow', slots: ['weapon', 'offhand', 'helm', 'chest'], roles: ['healer'], t: [[1, '축복받은', 4, 8], [12, '성스러운', 9, 15], [24, '천상의', 16, 24], [36, '신성한', 25, 33]] },
    { stat: 'regen', slots: ['offhand', 'helm', 'chest'], roles: ['healer', 'mage'], t: [[1, '샘물의', 10, 20], [14, '심연의', 21, 40], [28, '무한한', 41, 60]] },
  ],
  suf: [
    { stat: 'haste', slots: ['weapon', 'gloves', 'boots', 'offhand'], t: [[1, '바람의', 2, 4], [10, '폭풍의', 5, 8], [22, '번개의', 9, 13], [36, '시간을 가르는', 14, 18]] },
    { stat: 'leech', slots: ['weapon', 'gloves'], roles: ['tank', 'mage', 'rogue', 'hunter'], t: [[3, '흡혈귀의', 2, 4], [18, '피의 군주의', 5, 7], [32, '갈증의', 8, 10]] },
    { stat: 'cdr', slots: ['helm', 'offhand', 'gloves'], t: [[10, '명상의', 3, 5], [24, '초월의', 6, 9], [36, '영원의', 10, 12]] },
    { stat: 'hpRegen', slots: ['chest', 'helm', 'boots'], t: [[1, '재생의', 2, 4], [14, '트롤의', 5, 8], [28, '불사조의', 9, 12]] },
    { stat: 'thorns', slots: ['chest', 'offhand'], roles: ['tank', 'rogue'], t: [[1, '가시의', 10, 20], [16, '고슴도치의', 25, 45], [30, '철가시의', 50, 70]] },
    { stat: 'poisonRes', slots: ['helm', 'chest', 'boots', 'offhand'], t: [[1, '해독의', 15, 30], [12, '정화의', 31, 50], [26, '면역의', 51, 70]] },
    { stat: 'move', slots: ['boots'], t: [[1, '치타의', 5, 10], [15, '질풍의', 11, 18]] },
    { stat: 'gold', slots: ['weapon', 'offhand', 'helm', 'chest', 'gloves', 'boots'], t: [[1, '탐욕의', 8, 20], [15, '왕의', 21, 40], [30, '황금 용의', 41, 60]] },
    { stat: 'mf', slots: ['helm', 'chest', 'gloves', 'boots', 'offhand'], t: [[1, '행운의', 5, 12], [12, '운명의', 13, 25], [25, '기적의', 26, 40]] },
    { stat: 'xp', slots: ['helm', 'chest'], t: [[6, '지혜의', 3, 6], [20, '현자의', 7, 12]] },
  ],
};
const BASES = {
  tank:   { weapon: ['장검', '전투 도끼'], offhand: ['연 방패', '탑 방패'], helm: ['철 투구', '뿔 투구'], chest: ['사슬 갑옷', '판금 갑옷'], gloves: ['철 건틀릿', '가죽 장갑'], boots: ['판금 장화', '철갑 군화'] },
  healer: { weapon: ['참나무 지팡이', '성스러운 철퇴'], offhand: ['성표', '기도서'], helm: ['사제 두건', '은빛 관'], chest: ['사제복', '순례자 외투'], gloves: ['비단 장갑', '기도 장갑'], boots: ['순례자 신발', '천 신발'] },
  mage:   { weapon: ['마법봉', '룬 지팡이'], offhand: ['마도서', '서리 구슬'], helm: ['마법사 모자', '별무늬 모자'], chest: ['비단 로브', '마력 망토'], gloves: ['룬 장갑', '마력 장갑'], boots: ['비단 신발', '바람 신발'] },
  rogue:  { weapon: ['단검', '쌍날 비수'], offhand: ['보조 단검', '투척 단검'], helm: ['그림자 두건', '가죽 두건'], chest: ['가죽 조끼', '그림자 외투'], gloves: ['도둑 장갑', '독침 장갑'], boots: ['소리 없는 장화', '가죽 장화'] },
  hunter: { weapon: ['사냥 활', '복합 활'], offhand: ['가죽 화살통', '깃 화살통'], helm: ['사냥 모자', '깃털 두건'], chest: ['사냥 조끼', '숲 외투'], gloves: ['활시위 장갑', '가죽 장갑'], boots: ['추적 장화', '숲 장화'] },
};
const RARE_A = ['피의', '잿빛', '해골', '폭풍', '무덤', '영혼', '석양', '굶주린', '서리', '재앙'];
const RARE_B = ['송곳니', '맹세', '속삭임', '손톱', '수호', '갈퀴', '사냥꾼', '뼈', '눈물', '불꽃'];
// 고유 장비: 이름 + 고정 옵션 목록 (수치는 굴려서 정함, 일반 옵션보다 범위가 높음)
const UNIQUES = {
  tank:   { weapon: ['산을 쪼개는 자', ['pow', 'crit', 'leech', 'hp']], offhand: ['무너지지 않는 벽', ['dr', 'hp', 'thorns', 'cdr']], helm: ['군주의 뿔', ['hp', 'dr', 'mf']], chest: ['고르바크의 껍질', ['hp', 'dr', 'thorns', 'hpRegen']], gloves: ['돌주먹', ['pow', 'haste', 'leech']], boots: ['대지를 딛는 발', ['hp', 'dr', 'move', 'gold']] },
  healer: { weapon: ['새벽의 지팡이', ['healPow', 'haste', 'pow']], offhand: ['마지막 기도', ['healPow', 'regen', 'cdr']], helm: ['빛의 관', ['healPow', 'regen', 'mf']], chest: ['순백의 수의', ['hp', 'healPow', 'hpRegen', 'dr']], gloves: ['어루만지는 손', ['haste', 'healPow', 'cdr']], boots: ['순례의 끝', ['hp', 'move', 'regen', 'xp']] },
  mage:   { weapon: ['별을 부르는 봉', ['pow', 'crit', 'critDmg', 'haste']], offhand: ['불꽃 심장', ['pow', 'regen', 'cdr']], helm: ['천 개의 별 모자', ['crit', 'regen', 'mf', 'xp']], chest: ['얼어붙은 별의 로브', ['hp', 'dr', 'regen']], gloves: ['룬을 새긴 손', ['haste', 'crit', 'critDmg']], boots: ['허공 걷기', ['move', 'hp', 'mf']] },
  rogue:  { weapon: ['밤까마귀의 부리', ['pow', 'crit', 'critDmg', 'leech']], offhand: ['독사의 이빨', ['pow', 'crit', 'haste']], helm: ['얼굴 없는 두건', ['crit', 'cdr', 'mf']], chest: ['바람 없는 망토', ['hp', 'dr', 'thorns', 'poisonRes']], gloves: ['소매치기의 손', ['haste', 'leech', 'gold', 'mf']], boots: ['그림자 걸음', ['move', 'haste', 'gold']] },
  hunter: { weapon: ['바람의 활시위', ['pow', 'crit', 'critDmg', 'haste']], offhand: ['끝없는 화살통', ['crit', 'haste', 'cdr']], helm: ['매의 눈', ['crit', 'mf', 'xp']], chest: ['숲의 숨결', ['hp', 'dr', 'move', 'poisonRes']], gloves: ['시위를 당기는 손', ['haste', 'crit', 'leech']], boots: ['잎새 걸음', ['move', 'haste', 'gold']] },
};
let ITEM_ID = 1;
const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const affixOk = (a, role, slot) => a.slots.includes(slot) && (!a.roles || a.roles.includes(role));
function rollAffix(a, ilvl, slot, boost) {
  const tiers = a.t.filter(t => t[0] <= ilvl);
  if (!tiers.length) return null;
  // 높은 단계일수록 드묾: 마지막 단계 가중치가 가장 낮음
  let pickT;
  if (boost) pickT = tiers[tiers.length - 1];
  else { const ws = tiers.map((t, i) => 1 + i * 0.6), sum = ws.reduce((x, y) => x + y, 0); let r = Math.random() * sum; pickT = tiers[0]; for (let i = 0; i < tiers.length; i++) { r -= ws[i]; if (r <= 0) { pickT = tiers[i]; break; } } }
  const m = (a.mult && a.mult[slot]) || 1;
  const lo = Math.round(pickT[2] * m), hi = Math.round(pickT[3] * m);
  const v = boost ? rint(Math.round((lo + hi) / 2), Math.round(hi * 1.15)) : rint(lo, hi);
  return { stat: a.stat, v, lo, hi: boost ? Math.round(hi * 1.15) : hi, tier: a.t.indexOf(pickT) + 1, tn: pickT[1] };
}
function computeTotals(it) {
  const s = {};
  for (const [k, v] of Object.entries(it.base)) s[k] = (s[k] || 0) + v;
  for (const a of it.affixes) s[a.stat] = (s[a.stat] || 0) + a.v;
  it.stats = s;
  it.pow = s.pow || 0; it.hp = s.hp || 0; it.haste = s.haste || 0; // 이전 화면 코드 호환
}
function makeItem(ilvl, luck, role, slot, rar, reqStage) {
  role = role || pick(ROLE_ORDER);
  slot = slot || pick(SLOTS)[0];
  if (rar == null) { const roll = Math.random() + luck; rar = roll > 1.12 ? 3 : roll > 0.9 ? 2 : roll > 0.58 ? 1 : 0; }
  reqStage = reqStage == null ? 0 : reqStage;
  // 상위 단계 장비는 기본 수치·등급 보정
  const stageMul = 1 + reqStage * 0.18;
  const it = { id: Date.now() % 1e6 * 100 + (ITEM_ID++), role, slot, ilvl, rar, reqStage, isNew: true, affixes: [], base: {} };
  const imp = IMPLICIT[slot][role] || IMPLICIT[slot];
  const q = 0.9 + Math.random() * 0.2;
  for (const [k, [a, b]] of Object.entries(imp)) it.base[k] = Math.max(1, Math.round((a + ilvl * b) * q * (rar === 3 ? 1.25 : 1) * stageMul));
  const baseName = pick(BASES[role][slot]);
  if (rar === 3) {
    const [nm, list] = UNIQUES[role][slot];
    for (const st of list) {
      const a = AFFIXES.pre.concat(AFFIXES.suf).find(x => x.stat === st);
      const r = rollAffix(a, Math.max(ilvl + 8, a.t[0][0]), a.slots.includes(slot) ? slot : a.slots[0], true);
      if (r) it.affixes.push(r);
    }
    it.name = nm;
  } else if (rar >= 1) {
    const pre = AFFIXES.pre.filter(a => affixOk(a, role, slot)), suf = AFFIXES.suf.filter(a => affixOk(a, role, slot));
    let np, ns;
    if (rar === 1) { const r = Math.random(); np = r < 0.35 ? 1 : r < 0.6 ? 0 : 1; ns = np === 0 ? 1 : (r < 0.35 ? 0 : 1); }
    else { const total = rint(3, 5); np = Math.min(3, pre.length, rint(1, total - 1)); ns = Math.min(3, suf.length, total - np); }
    const take = (pool, n, kind) => { const p = pool.slice(); for (let i = 0; i < n && p.length; i++) { const a = p.splice(rnd(p.length), 1)[0]; const r = rollAffix(a, ilvl, slot, false); if (r) { r.kind = kind; it.affixes.push(r); } } };
    take(pre, np, 'pre'); take(suf, ns, 'suf');
    if (rar === 1) {
      const p = it.affixes.find(a => a.kind === 'pre'), s = it.affixes.find(a => a.kind === 'suf');
      it.name = `${p ? p.tn + ' ' : ''}${baseName}${s ? ' · ' + s.tn : ''}`;
    } else it.name = `${pick(RARE_A)} ${pick(RARE_B)}`;
  } else it.name = baseName;
  if (reqStage === 1) it.name = '[진화] ' + it.name;
  if (reqStage === 2) it.name = '[각성] ' + it.name;
  it.baseName = baseName;
  it.armorClass = ARMOR_CLASS[role];
  computeTotals(it);
  attachGearSkill(it);
  if (it.gearSkill) it.name = it.name + ' · ' + it.gearSkill.name;
  return it;
}
// 직업별 가치로 매긴 전투 점수 (▲ 표시와 최적 장착에 사용)
function itemScore(it, role) {
  if (!it) return 0;
  role = role || it.role; let s = 0;
  for (const [k, v] of Object.entries(it.stats || { pow: it.pow, hp: it.hp, haste: it.haste })) s += v * ((STATS[k] && STATS[k].w[role]) || 0) * (k === 'hpRegen' ? 0.1 : 1);
  s *= 1 + (it.reqStage || 0) * 0.12;
  if (it.gearSkill) s *= 1.15 + it.rar * 0.05;
  return Math.round(s * 10) / 10;
}
const sellPrice = it => Math.round((6 + it.ilvl * 2.5) * (1 + it.rar * 1.6) * (1 + (it.affixes ? it.affixes.length : 0) * 0.15));
function emptyGear() { const g = {}; for (const r of ROLE_ORDER) { g[r] = {}; for (const [sl] of SLOTS) g[r][sl] = null; } return g; }
function gearLevel(gear) {
  let s = 0; for (const r of ROLE_ORDER) for (const [sl] of SLOTS) { const it = gear[r][sl]; s += it ? it.ilvl * (1 + it.rar * 0.25) : 0; }
  return Math.round(s / (ROLE_ORDER.length * SLOTS.length) * 10) / 10;
}
function heroGearStats(gear, role) {
  const o = {}; for (const k in STATS) o[k] = 0;
  for (const [sl] of SLOTS) { const it = gear[role][sl]; if (it && it.stats) for (const [k, v] of Object.entries(it.stats)) o[k] += v; }
  return o;
}
function partyBonus(P) { // 파티 전체에 적용되는 파밍 옵션 합
  const o = { gold: 0, mf: 0, xp: 0 };
  for (const r of ROLE_ORDER) { const g = heroGearStats(P.gear, r); o.gold += g.gold; o.mf += g.mf; o.xp += g.xp; }
  return o;
}
const BOSS_REC = 7;
// ---------- 성장: 층·레벨·골드·강화·전투력 ----------
const floorScale = f => Math.pow(TUNE.floor, f - 1);
const ENH_MAX = 20;
const xpNeed = l => {
  const e = l < 30 ? 1.4 : l < 70 ? 1.55 : 1.7;
  return Math.round(70 * Math.pow(l, e));
};
const enhCost = l => Math.round(25 * Math.pow(1.42, l));
const ENH_EFF = { weapon: { pow: 3 }, offhand: { pow: 1.5, haste: 1 }, helm: { hp: 2.5 }, chest: { hp: 3 }, gloves: { pow: 1.5, haste: 1 }, boots: { hp: 2, haste: 0.5 } };
function emptyEnh() { const e = {}; for (const r of ROLE_ORDER) { e[r] = {}; for (const [sl] of SLOTS) e[r][sl] = 0; } return e; }
function newProgress() {
  return { v: 7, gear: emptyGear(), enh: emptyEnh(), bag: [], lvl: 1, xp: 0, gold: 0, maxFloor: 1, autoEquip: false,
    stages: emptyStages(), evoMat: 0, awkMat: 0, cleared: 0, attendance: { last: '', streak: 0 }, claims: {} };
}
// 이전 저장을 옮김: 장비는 같은 직업·칸·레벨·등급으로 옵션을 새로 굴림
function ensureRoles(P) {
  if (!P.gear) P.gear = emptyGear();
  if (!P.enh) P.enh = emptyEnh();
  if (!P.stages) P.stages = emptyStages();
  if (P.evoMat == null) P.evoMat = 0;
  if (P.awkMat == null) P.awkMat = 0;
  if (P.cleared == null) P.cleared = 0;
  if (!P.attendance) P.attendance = { last: '', streak: 0 };
  if (!P.claims) P.claims = {};
  if (P.v < 7) P.v = 7;
  for (const r of ROLE_ORDER) {
    if (!P.gear[r]) { P.gear[r] = {}; for (const [sl] of SLOTS) P.gear[r][sl] = null; }
    if (!P.enh[r]) { P.enh[r] = {}; for (const [sl] of SLOTS) P.enh[r][sl] = 0; }
    if (P.stages[r] == null) P.stages[r] = 0;
  }
  return P;
}
function migrateProgress(old) {
  const P = newProgress();
  if (!old) return P;
  for (const k of ['lvl', 'xp', 'gold', 'maxFloor', 'autoEquip', 'evoMat', 'awkMat']) if (old[k] != null) P[k] = old[k];
  if (old.stages) for (const r of ROLE_ORDER) if (old.stages[r] != null) P.stages[r] = old.stages[r];
  const conv = (it, slot) => { const n = makeItem(it.ilvl, 0, it.role, slot, it.rar); n.isNew = false; return n; };
  const map3 = { weapon: 'weapon', armor: 'chest', trinket: 'gloves' };
  for (const r of ROLE_ORDER) {
    const og = old.gear && old.gear[r], oe = old.enh && old.enh[r];
    if (!og) continue;
    for (const [sl] of SLOTS) { if (og[sl]) P.gear[r][sl] = og[sl].affixes ? og[sl] : conv(og[sl], sl); if (oe && oe[sl]) P.enh[r][sl] = oe[sl]; }
    for (const [o, n] of Object.entries(map3)) { if (og[o]) P.gear[r][n] = conv(og[o], n); if (oe && oe[o]) P.enh[r][n] = oe[o]; }
  }
  if (Array.isArray(old.bag)) P.bag = old.bag.map(it => it.affixes ? it : conv(it, it.slot)).slice(0, BAG_MAX);
  return ensureRoles(P);
}
function heroEnh(P, role) {
  const o = { pow: 0, hp: 0, haste: 0 };
  for (const [sl] of SLOTS) { const l = P.enh[role][sl] || 0, e = ENH_EFF[sl]; for (const k in e) o[k] += e[k] * l; }
  return o;
}
const BASE_CRIT = { tank: 0.1, healer: 0.1, mage: 0.15, rogue: 0.25, hunter: 0.2 };
function heroMults(P, role, stage) {
  stage = stage == null ? ((P.stages && P.stages[role]) || 0) : stage;
  const gs = heroGearStats(P.gear, role), en = heroEnh(P, role), L = P.lvl - 1;
  const stagePow = 1 + stage * 0.12, stageHp = 1 + stage * 0.1;
  const pow = (1 + L * TUNE.lvlPow) * (1 + (gs.pow + en.pow) / 100) * stagePow;
  const hp = (1 + L * TUNE.lvlHp) * (1 + (gs.hp + en.hp) / 100) * stageHp;
  const haste = 1 + (gs.haste + en.haste) / 100;
  const crit = (BASE_CRIT[role] || 0.1) + (gs.crit || 0) / 100;
  const critDmg = 2 + (gs.critDmg || 0) / 100;
  const healMul = 1 + (gs.heal || 0) / 100;
  const regenMul = 1 + (gs.mana || 0) / 100;
  const cdr = Math.min(0.4, (gs.cdr || 0) / 100);
  const leech = (gs.leech || 0) / 100;
  const hpRegen = (gs.hpRegen || 0) / 1000;
  const thorns = (gs.thorns || 0) / 100;
  const poisonRes = Math.min(0.75, (gs.poisonRes || 0) / 100);
  const dr = Math.min(0.5, (gs.dr || 0) / 100);
  const move = (gs.move || 0) / 100;
  return { pow, hp, haste, crit, critDmg, healMul, regenMul, cdr, leech, hpRegen, thorns, poisonRes, dr, move, stage };
}

const heroCP = (P, r) => {
  const st = (P.stages && P.stages[r]) || 0;
  const m = heroMults(P, r, st);
  const off = m.pow * m.haste * (1 + m.crit * (m.critDmg - 1)) / (1 + BASE_CRIT[r]) / (1 - m.cdr * 0.5) * (r === 'healer' ? m.healMul : 1) * (1 + st * 0.08);
  const def = m.hp / (1 - m.dr) * (1 + m.leech * 1.5 + m.hpRegen * 20) * (1 + st * 0.08);
  return Math.round(1000 * Math.sqrt(off * def));
};
function partyCP(P) { let s = 0; for (const r of ROLE_ORDER) s += heroCP(P, r); return s; }
let REC_BASE = 7700;
const recCP = f => Math.round(REC_BASE * Math.pow(TUNE.rec, f - 1) / 100) * 100;
function enhance(P, role, slot) {
  const l = P.enh[role][slot]; if (l >= ENH_MAX) return false;
  const c = enhCost(l); if (P.gold < c) return false;
  P.gold -= c; P.enh[role][slot]++; return true;
}
// ---- 가방·장착 ----
function equipItem(P, id) {
  const i = P.bag.findIndex(x => x.id === id); if (i < 0) return false;
  const it = P.bag[i];
  const st = (P.stages && P.stages[it.role]) || 0;
  if ((it.reqStage || 0) > st) return false;
  const cur = P.gear[it.role][it.slot];
  P.bag.splice(i, 1); it.isNew = false;
  P.gear[it.role][it.slot] = it;
  if (cur) P.bag.splice(i, 0, cur);
  return true;
}
function unequipItem(P, role, slot) {
  const it = P.gear[role][slot]; if (!it || P.bag.length >= BAG_MAX) return false;
  P.gear[role][slot] = null; P.bag.unshift(it); return true;
}
function sellItem(P, id) {
  const i = P.bag.findIndex(x => x.id === id); if (i < 0) return 0;
  const g = sellPrice(P.bag[i]); P.gold += g; P.bag.splice(i, 1); return g;
}
function isUpgrade(P, it) {
  const st = (P.stages && P.stages[it.role]) || 0;
  if ((it.reqStage || 0) > st) return false;
  const cur = P.gear[it.role] && P.gear[it.role][it.slot];
  return !cur || itemScore(it) > itemScore(cur);
}
function bestEquip(P, role) {
  let n = 0;
  const st = (P.stages && P.stages[role]) || 0;
  for (const [sl] of SLOTS) {
    const cands = P.bag.filter(x => x.role === role && x.slot === sl && (x.reqStage || 0) <= st && isUpgrade(P, x));
    if (!cands.length) continue;
    const best = cands.sort((a, b) => itemScore(b) - itemScore(a))[0];
    equipItem(P, best.id); n++;
  }
  return n;
}
function sellJunk(P, maxRar) {
  let g = 0, n = 0;
  for (const it of P.bag.slice()) if (it.rar <= maxRar && !isUpgrade(P, it) && !it.lock) { g += sellItem(P, it.id); n++; }
  return { g, n };
}
function addToBag(P, it) {
  if (P.bag.length >= BAG_MAX) {
    const cand = P.bag.filter(x => !x.lock).concat([it]);
    const worst = cand.sort((a, b) => (a.rar - b.rar) || (itemScore(a) - itemScore(b)))[0];
    const g = sellPrice(worst); P.gold += g;
    if (worst === it) return { sold: it, gold: g };
    P.bag.splice(P.bag.indexOf(worst), 1);
    P.bag.unshift(it); return { sold: worst, gold: g };
  }
  P.bag.unshift(it); return {};
}
// 첫 밸런스 손잡이. bossHp/bossDmg=보스 강함, drop=드롭, floor=층 스케일, rec=권장 전투력, lvl*=레벨 성장.
const TUNE = { bossHp: 3.1, bossDmg: 2.0, drop: 0.7, floor: 1.32, rec: 1.37, lvlPow: 0.04, lvlHp: 0.05 };

// ---------- 몹 ----------
const MOBS = {
  raider:  { name: '동굴 약탈자', hp: 600, atk: 30, atkRate: 1.6, range: 30, speed: 62, r: 11, mark: '근' },
  brute:   { name: '동굴 거한',   hp: 1150, atk: 48, atkRate: 2.2, range: 34, speed: 50, r: 15, mark: '거' },
  caster:  { name: '그림자 술사', hp: 460, atk: 0, atkRate: 3.2, range: 170, speed: 56, r: 10, cast: 'bolt', mark: '술' },
  mender:  { name: '부패 치유사', hp: 520, atk: 0, atkRate: 3.6, range: 160, speed: 56, r: 10, cast: 'mend', mark: '힐' },
  poisoner:{ name: '독침 사냥꾼', hp: 500, atk: 20, atkRate: 2.0, range: 150, speed: 60, r: 10, cast: 'poison', mark: '독' },
  add:     { name: '돌 정령',     hp: 800, atk: 38, atkRate: 1.6, range: 30, speed: 62, r: 12, mark: '정' },
  boss:    { name: '석굴 군주 고르바크', hp: 24000, atk: 135, atkRate: 2.0, range: 40, speed: 50, r: 24, boss: true, mark: '보스' },
};
const PACK_POOL = ['raider', 'raider', 'raider', 'brute', 'caster', 'caster', 'mender', 'poisoner'];

// ---------- 런 강화 (블럭 클리어 3택1, 이번 런만) ----------
const AUGMENTS = [
  { id: 'steel_skin', name: '강철 피부', desc: '파티가 받는 피해 12% 감소', tag: '방어' },
  { id: 'iron_wall', name: '철벽 훈련', desc: '방패의 벽 피해감소 75%, 쿨 −20%', tag: '전사' },
  { id: 'threat_aura', name: '위협의 기운', desc: '탱커 위협 +40%, 도발 위협 강화', tag: '전사' },
  { id: 'interrupt_edge', name: '차단의 칼날', desc: '차단 스킬 쿨 −25%, 차단 시 추가 피해', tag: '차단' },
  { id: 'focus_fire', name: '집중 포화', desc: '보스에게 주는 피해 +20%', tag: '보스' },
  { id: 'cleave_storm', name: '휩쓰는 칼날', desc: '광역 스킬 피해 +30%', tag: '광역' },
  { id: 'frostbite', name: '서리의 이빨', desc: '감속·속박 지속시간 +40%', tag: '제어' },
  { id: 'bloodlust', name: '피의 갈증', desc: '치명타율 +10%p, 치명타 피해 +25%', tag: '딜' },
  { id: 'haste_drums', name: '가속의 북', desc: '파티 가속 +15%', tag: '가속' },
  { id: 'deep_pockets', name: '마나샘', desc: '마나 재생 +40%', tag: '마나' },
  { id: 'holy_overflow', name: '성스러운 넘침', desc: '치유량 +20%, 보호막 +25%', tag: '치유' },
  { id: 'cleanse_wave', name: '정화의 물결', desc: '정화가 파티 전원, 독 저항 +30%', tag: '독' },
  { id: 'pool_walker', name: '장판 걸음', desc: '장판 피해 −50%', tag: '장판' },
  { id: 'blink_mastery', name: '순보 숙련', desc: '점멸·후퇴 쿨 −35%', tag: '이동' },
  { id: 'ult_resonance', name: '궁극 공명', desc: '궁극기 충전 속도 +40%', tag: '궁극' },
  { id: 'execute_mark', name: '처형 표식', desc: '적 HP 35% 이하 피해 +30%', tag: '처형' },
  { id: 'champion_bane', name: '용사 사냥', desc: '용사 피해 +35%, 골드 +20%', tag: '용사' },
  { id: 'stone_break', name: '돌 분쇄', desc: '돌 정령에게 피해 +40%', tag: '애드' },
];
const hasAug = (S, id) => !!(S && S.augments && S.augments.includes(id));
function applyRunBuffs(S) {
  S.runDr = hasAug(S, 'steel_skin') ? 0.12 : 0;
  S.runGold = hasAug(S, 'champion_bane') ? 0.2 : 0;
  for (const h of S.heroes) {
    applyGear(S, h);
    if (hasAug(S, 'bloodlust')) { h.crit += 0.10; h.critDmg = (h.critDmg || 2) + 0.25; }
    if (hasAug(S, 'haste_drums')) h.haste *= 1.15;
    if (hasAug(S, 'deep_pockets') && h.maxMana) h.regenMul = (h.regenMul || 1) * 1.4;
    if (hasAug(S, 'holy_overflow')) h.healMul = (h.healMul || 1) * (h.role === 'healer' ? 1.2 : 1);
    if (hasAug(S, 'cleanse_wave')) h.poisonRes = Math.min(0.9, (h.poisonRes || 0) + 0.3);
  }
}
function offerAugments(S) {
  const owned = new Set(S.augments || []);
  let pool = AUGMENTS.filter(a => !owned.has(a.id));
  if (pool.length < 3) pool = AUGMENTS.slice();
  const nearBoss = S.floorI >= (S.nFloors || 7) - 2;
  const w = a => {
    let n = 1;
    if (nearBoss && ['focus_fire', 'iron_wall', 'interrupt_edge', 'ult_resonance'].includes(a.id)) n += 2;
    if (S._pickBiasCaster && ['interrupt_edge', 'cleanse_wave'].includes(a.id)) n += 1.5;
    return n;
  };
  const picks = [];
  const bag = pool.map(a => ({ a, w: w(a) }));
  while (picks.length < 3 && bag.length) {
    const sum = bag.reduce((s, x) => s + x.w, 0); let r = Math.random() * sum, i = 0;
    for (; i < bag.length; i++) { r -= bag[i].w; if (r <= 0) break; }
    i = Math.min(i, bag.length - 1);
    picks.push(bag[i].a); bag.splice(i, 1);
  }
  S.offer = picks; S.phase = 'pick';
  S.ev.push({ t: 'pick' });
  log(S, `${S.floorI + 1}층 클리어 — 런 강화 선택`, 'room');
  return picks;
}
function applyAugment(S, id) {
  const a = AUGMENTS.find(x => x.id === id); if (!a) return false;
  if (!S.augments) S.augments = [];
  if (S.augments.includes(id)) return false;
  S.augments.push(id);
  S.offer = null;
  applyRunBuffs(S);
  log(S, `강화 획득: ${a.name}`, 'good');
  S.ev.push({ t: 'banner', text: a.name, sub: a.desc, color: 'tape' });
  advanceFloor(S);
  return true;
}
function blockPacksAlive(S, bi) {
  const b = S.blocks[bi]; if (!b) return false;
  return b.packs.some(pid => S.enemies.some(e => e.pack === pid && e.alive));
}
function enemySeg(S, e) {
  if (e.seg != null) return e.seg;
  const p = S.packs.find(x => x.id === e.pack);
  return p && p.seg != null ? p.seg : 0;
}
function floorCleared(S) {
  return !S.enemies.some(e => e.alive);
}
function advanceFloor(S) {
  if (S.blocks[S.floorI]) S.blocks[S.floorI].cleared = true;
  S.phase = 'explore';
  S.pools = []; S.zones = []; S.drops = [];
  if (S.floorI < S.nFloors - 1) {
    S.floorI++;
    loadFloor(S, S.floorI);
    const boss = S.floorI === S.nFloors - 1;
    log(S, boss ? `보스 층 진입 (${S.floorI + 1}/${S.nFloors})` : `${S.floorI + 1}/${S.nFloors}층 진입`, 'room');
    if (boss) S.ev.push({ t: 'banner', text: '보스 층', sub: '석굴 군주 고르바크', color: 'hurt' });
    else S.ev.push({ t: 'banner', text: `${S.floorI + 1}층`, sub: S.dungeon.name, color: 'tape' });
  }
  S.goal = null; S.blockI = S.floorI;
}


// ---------- 지도 (선형 블럭 던전) ----------
function genMap(nBlocks) {
  nBlocks = nBlocks || (5 + rnd(3)); // 5~7 (마지막은 보스)
  const g = Array.from({ length: MH }, () => new Uint8Array(MW));
  const rooms = [];
  const combatN = nBlocks - 1;
  const totalRooms = combatN + 2; // start + combat + boss
  // 지그재그: 한 줄에 최대 4방, 위로 올라가며 연결 (44맵에 맞춤)
  const perRow = 4;
  const rw = 7, rh = 7, bossW = 10, bossH = 10;
  const padX = 2, padY = 3, stepX = rw + 3, stepY = rh + 4;
  for (let i = 0; i < totalRooms; i++) {
    const isBoss = i === totalRooms - 1, isStart = i === 0;
    const row = Math.floor(i / perRow), colIn = i % perRow;
    const col = row % 2 === 0 ? colIn : (perRow - 1 - colIn);
    const w = isBoss ? bossW : rw, h = isBoss ? bossH : rh;
    const r = {
      w, h, boss: isBoss, start: isStart,
      block: isStart ? -1 : (isBoss ? combatN : i - 1),
      x: Math.max(1, Math.min(MW - w - 1, padX + col * stepX)),
      y: Math.max(1, Math.min(MH - h - 1, padY + row * stepY)),
    };
    r.cx = Math.floor(r.x + r.w / 2); r.cy = Math.floor(r.y + r.h / 2);
    rooms.push(r);
  }
  for (const r of rooms) for (let j = r.y; j < r.y + r.h; j++) for (let i = r.x; i < r.x + r.w; i++) if (j >= 0 && j < MH && i >= 0 && i < MW) g[j][i] = 1;
  const corridor = (a, b) => {
    const xs = Math.min(a.cx, b.cx), xe = Math.max(a.cx, b.cx);
    for (let i = xs; i <= xe; i++) { g[a.cy][i] = 1; if (a.cy + 1 < MH) g[a.cy + 1][i] = 1; }
    const ys = Math.min(a.cy, b.cy), ye = Math.max(a.cy, b.cy);
    for (let j = ys; j <= ye; j++) { g[j][b.cx] = 1; if (b.cx + 1 < MW) g[j][b.cx + 1] = 1; }
  };
  for (let i = 0; i < rooms.length - 1; i++) corridor(rooms[i], rooms[i + 1]);
  for (let i = 0; i < MW; i++) { g[0][i] = 0; g[MH - 1][i] = 0; } for (let j = 0; j < MH; j++) { g[j][0] = 0; g[j][MW - 1] = 0; }
  return { g, rooms, boss: rooms[rooms.length - 1], start: rooms[0], nBlocks };
}
function bfsDist(g, sx, sy) {
  const d = new Int32Array(MW * MH).fill(-1), q = [sy * MW + sx]; d[q[0]] = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const c = q[qi], x = c % MW, y = (c / MW) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= MW || ny >= MH || !g[ny][nx]) continue;
      const n = ny * MW + nx; if (d[n] < 0) { d[n] = d[c] + 1; q.push(n); }
    }
  }
  return d;
}


// ---------- 생성 ----------
let UID = 0;
const tc = i => (i + 0.5) * TILE;
function makeHero(role, P, runStage) {
  const stage = effectiveStage(P, role, runStage);
  const R = ROLE_INFO[role], m = heroMults(P, role, stage);
  const maxHp = Math.round(R.hp * m.hp * (1 + stage * 0.08));
  return {
    id: ++UID, team: 'hero', role, stage, name: roleName(role, stage), x: 0, y: 0, r: 12,
    baseHp: R.hp, hp: maxHp, maxHp, mana: R.mana || 0, maxMana: R.mana || 0, regen: R.regen || 0,
    range: R.range, baseSpeed: R.speed, speed: R.speed * (1 + m.move), atk: R.atk, atkRate: R.atkRate, baseArmor: R.armor, armor: 1 - (1 - R.armor) * (1 - m.dr),
    pow: m.pow, haste: m.haste, crit: m.crit, critDmg: m.critDmg, healMul: m.healMul, regenMul: m.regenMul, cdr: m.cdr, leech: m.leech, hpRegen: m.hpRegen, thorns: m.thorns, poisonRes: m.poisonRes,
    atkT: 0, gcd: 0, cds: {}, buffs: {}, absorb: 0, poison: 0, casting: null, moveTo: null,
    alive: true, ult: 0, target: null, dmgDone: 0, healDone: 0, path: null,
  };
}
function heroGearSkills(P, role) {
  const out = [];
  for (const [sl] of SLOTS) {
    const it = P.gear[role] && P.gear[role][sl];
    if (it && it.gearSkill) out.push(it.gearSkill.id);
  }
  return out;
}
function hasGearSkill(S, h, id) {
  return !!(h && heroGearSkills(S.P, h.role).includes(id));
}
function applyGear(S, h) {
  const stage = h.stage != null ? h.stage : effectiveStage(S.P, h.role, S.runStage);
  const m = heroMults(S.P, h.role, stage), ratio = h.hp / h.maxHp;
  h.stage = stage; h.name = roleName(h.role, stage);
  h.maxHp = Math.round(h.baseHp * m.hp * (1 + stage * 0.08)); if (h.alive) h.hp = h.maxHp * ratio;
  h.pow = m.pow; h.haste = m.haste; h.crit = m.crit; h.critDmg = m.critDmg; h.healMul = m.healMul; h.regenMul = m.regenMul; h.cdr = m.cdr; h.leech = m.leech; h.hpRegen = m.hpRegen; h.thorns = m.thorns; h.poisonRes = m.poisonRes;
  h.armor = 1 - (1 - h.baseArmor) * (1 - m.dr); h.speed = h.baseSpeed * (1 + m.move);
  S.bonus = partyBonus(S.P);
}
function makeMob(key, x, y, champ, pack, fs) {
  fs = fs || 1;
  const M = MOBS[key], hm = (champ ? 1.8 : 1) * fs, dm = (champ ? 1.3 : 1) * fs;
  return {
    id: ++UID, team: 'enemy', key, name: (champ ? '용사 ' : '') + M.name, boss: !!M.boss, champ, x, y, r: M.r + (champ ? 1 : 0), mark: M.mark,
    hp: M.hp * hm, maxHp: M.hp * hm, atk: M.atk * dm, atkRate: M.atkRate, range: M.range, speed: M.speed,
    atkT: 1 + Math.random(), castKind: M.cast || null, casting: null, threat: {}, alive: true,
    taunted: 0, buffs: {}, slow: 0, root: 0, pack, active: false, path: null,
  };
}

function createGame(cfg, P, floor, mode, stageId) {
  const gear = P.gear;
  UID = 0;
  const wst = worldStageById(stageId);
  const runStage = wst.gear;
  const nFloors = wst.floors || NFLOORS;
  floor = wst.diff || wst.id;
  const dun = { id: 's' + wst.id, name: wst.name, stage: runStage, nFloors, floor, tag: wst.id + '', theme: wst.theme, worldId: wst.id };
  const runCfg = cfg || defaultConfig(0);
  const themeId = wst.theme || 'grotto';
  const runSeed = (Date.now() ^ (Math.random() * 1e9)) | 0;
  const S = {
    t: 0, phase: 'explore', map: null, seen: new Uint8Array(MW * MH),
    heroes: ROLE_ORDER.map(r => makeHero(r, P, 0)), P, bonus: partyBonus(P), floor, fs: floorScale(floor), ev: [], run: { gold: 0, xp: 0, lvlUps: 0 }, autoUlt: false,
    enemies: [], packs: [], pools: [], zones: [], drops: [], fx: [], log: [],
    cfg: runCfg, gear, mode: 'hunt', bossMult: () => TUNE.bossDmg * S.fs, inCombat: false, partyDR: 0, winT: 0, goal: null, goalT: 0,
    nBlocks: nFloors, nFloors, blocks: [], blockI: 0, floorI: 0, augments: [], offer: null, runDr: 0, runGold: 0, _pickBiasCaster: false, pickDone: false,
    dungeon: dun, runStage, worldId: wst.id, themeId, runSeed,
    stats: { missed: {}, interrupts: 0, poolDmg: {}, busterRaw: 0, busterHits: 0, deaths: [], oom: 0, enraged: false,
      explosions: 0, explosionsTotal: 0, poisonDmg: 0, ultsUsed: 0, bossHp: null, bossReached: false, kills: 0, packsCleared: 0,
      loot: [], equipped: 0, bagged: 0, gearAtBoss: null, cpAtBoss: null, menderHeals: 0 },
    result: null,
  };
  for (let i = 0; i < nFloors; i++) S.blocks.push({ id: i, room: null, packs: [], boss: i === nFloors - 1, cleared: false });
  loadFloor(S, 0);
  log(S, `스테이지 ${wst.id} ${wst.name} · ${nFloors}층`, 'room');
  return S;
}

function loadFloor(S, floorI) {
  S.floorI = floorI;
  S.blockI = floorI;
  S.segI = 0; // 층 안 전투방 진행 (원본 block과 동일 역할)
  S.enemies = []; S.packs = []; S.pools = []; S.zones = []; S.drops = []; S.fx = [];
  S.seen = new Uint8Array(MW * MH);
  S.inCombat = false; S.winT = 0; S.goal = null;
  const bossFloor = floorI === S.nFloors - 1;
  const seed = (S.runSeed + floorI * 9973) >>> 0;
  const gen = (typeof genFloorMap === 'function')
    ? genFloorMap({ seed, themeId: S.themeId, boss: bossFloor, MW, MH, TILE, nFloors: S.nFloors })
    : null;
  if (gen) {
    S.map = gen;
  } else {
    S.map = genMap(bossFloor ? 3 : 5);
    S.map.themeId = S.themeId; S.map.seed = seed;
  }
  const rooms = S.map.rooms;
  const st = S.map.start || rooms[0];
  S.blocks[floorI].room = st;
  S.blocks[floorI].packs = [];
  S.heroes.forEach((h, i) => {
    h.x = tc(st.cx) + [0, -22, 22, -16, 16][i];
    h.y = tc(st.cy) + [-8, 20, 20, 38, 38][i];
    h.casting = null; h.moveTo = null; h.path = null; h.target = null;
    if (!h.alive) { h.alive = true; h.hp = h.maxHp * 0.5; }
    else h.hp = Math.min(h.maxHp, h.hp + h.maxHp * 0.2);
  });

  let pid = 0;
  const floorProg = floorI / Math.max(1, S.nFloors - 1);
  for (const r of rooms) {
    if (r.start) continue;
    const seg = r.seg != null ? r.seg : 0;
    if (r.boss) {
      const b = makeMob('boss', tc(r.cx), tc(r.cy), false, pid, S.fs);
      b.hp = b.maxHp = b.maxHp * TUNE.bossHp * (1 + S.runStage * 0.12);
      b.timers = { strike: 12, blast: 18, pool: 7 }; b.addsDone = false; b.strikeWarn = 0; b.enraged = false; b.engageT = 0;
      b.seg = seg;
      S.enemies.push(b);
      S.packs.push({ id: pid, x: b.x, y: b.y, boss: true, block: floorI, seg });
      S.blocks[floorI].packs.push(pid++);
      continue;
    }
    // 원본 밀도: 후반 방 2팩, 용사 확률↑
    const roomProg = seg / Math.max(1, (S.map.combatN || 5) - 1);
    const nPacks = roomProg > 0.5 || floorProg > 0.55 ? 2 : 1;
    const champChance = 0.15 + roomProg * 0.25 + floorProg * 0.1;
    const pool = roomProg > 0.55 || floorProg > 0.5
      ? ['raider', 'brute', 'caster', 'caster', 'mender', 'poisoner', 'poisoner']
      : PACK_POOL;
    for (let p = 0; p < nPacks; p++) {
      const champ = Math.random() < champChance, n = 2 + rnd(3);
      const cx = r.x + 1 + rnd(Math.max(1, r.w - 2));
      const cy = r.y + 1 + rnd(Math.max(1, r.h - 2));
      for (let k = 0; k < n; k++) {
        const ang = k / n * Math.PI * 2;
        let x = tc(cx) + Math.cos(ang) * 26, y = tc(cy) + Math.sin(ang) * 26;
        if (blocked(S, x, y, 11)) { x = tc(cx); y = tc(cy); }
        const m = makeMob(pick(pool), x, y, champ, pid, S.fs);
        m.seg = seg;
        S.enemies.push(m);
      }
      S.packs.push({ id: pid, x: tc(cx), y: tc(cy), champ, block: floorI, seg });
      S.blocks[floorI].packs.push(pid++);
    }
  }
  reveal(S);
  log(S, bossFloor
    ? `보스 층 맵 · 전투방 ${S.map.combatN || 2} + 보스`
    : `${floorI + 1}층 맵 · 전투방 ${S.map.combatN || 5} (시드 ${seed % 10000})`, 'room');
}

function seedTestGear(P, stage) {
  const has = P.bag.some(it => (it.reqStage || 0) === stage) || ROLE_ORDER.some(r => SLOTS.some(([sl]) => P.gear[r][sl] && (P.gear[r][sl].reqStage || 0) === stage));
  if (has) return;
  const ilvl = 8 + stage * 8;
  for (const r of ROLE_ORDER) {
    for (const sl of ['weapon', 'chest']) {
      const it = makeItem(ilvl, 0.5, r, sl, Math.min(1, stage), stage);
      it.isNew = false;
      if (!P.gear[r][sl] || (P.gear[r][sl].reqStage || 0) < stage) {
        if (P.gear[r][sl]) P.bag.unshift(P.gear[r][sl]);
        P.gear[r][sl] = it;
      } else P.bag.unshift(it);
    }
  }
}

// ---------- 공간 유틸 ----------
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function solidAt(S, x, y) { const i = Math.floor(x / TILE), j = Math.floor(y / TILE); return i < 0 || j < 0 || i >= MW || j >= MH || !S.map.g[j][i]; }
function blocked(S, x, y, r) { r *= 0.85; return solidAt(S, x - r, y - r) || solidAt(S, x + r, y - r) || solidAt(S, x - r, y + r) || solidAt(S, x + r, y + r); }
function los(S, x1, y1, x2, y2) {
  const d = Math.hypot(x2 - x1, y2 - y1), n = Math.ceil(d / 10);
  for (let i = 1; i < n; i++) { const t = i / n; if (solidAt(S, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t)) return false; }
  return true;
}
function wideLos(S, u, x2, y2) {
  const dx = x2 - u.x, dy = y2 - u.y, d = Math.hypot(dx, dy) || 1, px = -dy / d * u.r * 0.8, py = dx / d * u.r * 0.8;
  return los(S, u.x, u.y, x2, y2) && los(S, u.x + px, u.y + py, x2 + px, y2 + py) && los(S, u.x - px, u.y - py, x2 - px, y2 - py);
}
function findPath(S, sx, sy, tx, ty) {
  const g = S.map.g; let si = Math.floor(sx / TILE), sj = Math.floor(sy / TILE), ti = Math.floor(tx / TILE), tj = Math.floor(ty / TILE);
  if (!g[tj] || !g[tj][ti]) return null;
  const prev = new Int32Array(MW * MH).fill(-1), start = sj * MW + si, goal = tj * MW + ti, q = [start]; prev[start] = start;
  for (let qi = 0; qi < q.length; qi++) {
    const c = q[qi]; if (c === goal) break; const x = c % MW, y = (c / MW) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= MW || ny >= MH || !g[ny][nx]) continue;
      if (dx && dy && (!g[y][nx] || !g[ny][x])) continue;
      const n = ny * MW + nx; if (prev[n] < 0) { prev[n] = c; q.push(n); }
    }
  }
  if (prev[goal] < 0) return null;
  const path = []; for (let c = goal; c !== start; c = prev[c]) path.push({ x: tc(c % MW), y: tc((c / MW) | 0) });
  path.reverse(); path[path.length - 1] = { x: tx, y: ty };
  return path;
}
function slide(S, u, dx, dy) {
  if (!blocked(S, u.x + dx, u.y, u.r)) u.x += dx;
  if (!blocked(S, u.x, u.y + dy, u.r)) u.y += dy;
}
// 목표 지점까지 이동. stop 이내면 true
function goTo(S, u, tx, ty, stop) {
  const d = Math.hypot(tx - u.x, ty - u.y);
  if (d <= stop) { u.path = null; return true; }
  let wx = tx, wy = ty, final = true;
  if (!wideLos(S, u, tx, ty)) {
    const key = Math.floor(tx / TILE) + ',' + Math.floor(ty / TILE);
    u.pathT = (u.pathT || 0) - DT;
    if (!u.path || u.pathKey !== key || u.pathT <= 0) { u.path = findPath(S, u.x, u.y, tx, ty); u.pathKey = key; u.pathT = 1; }
    if (u.path && u.path.length) {
      while (u.path.length > 1 && wideLos(S, u, u.path[1].x, u.path[1].y)) u.path.shift();
      wx = u.path[0].x; wy = u.path[0].y; final = u.path.length === 1;
      if (Math.hypot(wx - u.x, wy - u.y) < 5 && u.path.length > 1) u.path.shift();
    }
  } else u.path = null;
  const dd = Math.hypot(wx - u.x, wy - u.y) || 1;
  const sp = u.speed * (u.slow > 0 ? 0.5 : 1) * DT;
  const stepLen = final ? Math.min(sp, Math.max(0, d - stop)) : Math.min(sp, dd);
  slide(S, u, (wx - u.x) / dd * stepLen, (wy - u.y) / dd * stepLen);
  return false;
}

function reveal(S) {
  const R = 6;
  for (const h of S.heroes) {
    if (!h.alive) continue;
    const hi = Math.floor(h.x / TILE), hj = Math.floor(h.y / TILE);
    for (let j = hj - R; j <= hj + R; j++) for (let i = hi - R; i <= hi + R; i++) {
      if (i < 0 || j < 0 || i >= MW || j >= MH) continue;
      if ((i - hi) ** 2 + (j - hj) ** 2 <= R * R) S.seen[j * MW + i] = 1;
    }
  }
}
const isSeen = (S, x, y) => S.seen[Math.floor(y / TILE) * MW + Math.floor(x / TILE)] === 1;

// ---------- 전투 공통 ----------
const aliveH = S => S.heroes.filter(h => h.alive);
const activeE = S => S.enemies.filter(e => e.alive && e.active);
const pct = e => e.hp / e.maxHp;
const tankOf = S => S.heroes.find(h => h.role === 'tank' && h.alive);
const ready = (h, k) => !(h.cds[k] > 0);
const setCd = (S, h, k, v) => {
  let cd = v / h.haste * (1 - (h.cdr || 0));
  if (S && hasAug(S, 'interrupt_edge') && (k === 'kick' || k === 'bash')) cd *= 0.75;
  if (S && hasAug(S, 'iron_wall') && k === 'wall') cd *= 0.8;
  if (S && hasAug(S, 'blink_mastery') && (k === 'blink' || k === 'disengage')) cd *= 0.65;
  h.cds[k] = cd;
};
const boss = S => S.enemies.find(e => e.boss);
function nearest(list, from) { let b = null, bd = 1e9; for (const e of list) { const d = dist(e, from); if (d < bd) { bd = d; b = e; } } return b; }
function inPool(S, h) { return S.pools.find(p => p.warn <= 0 && Math.hypot(h.x - p.x, h.y - p.y) < p.r + h.r * 0.5); }
function log(S, text, kind) { S.log.push({ t: S.t, text, kind: kind || '' }); if (S.log.length > 80) S.log.shift(); }
function fx(S, o) { o.life = o.life || 0.5; o.age = 0; S.fx.push(o); }
function addThreat(S, src, tgt, amt) { if (tgt.threat) tgt.threat[src.id] = (tgt.threat[src.id] || 0) + amt; }
function activatePack(S, pid) {
  const pack = S.packs.find(p => p.id === pid);
  if (pack && pack.block != null && pack.block > S.floorI) return false;
  if (pack && pack.seg != null && pack.seg > (S.segI || 0)) return false; // 층 안 앞방부터
  let any = false;
  for (const e of S.enemies) if (e.pack === pid && e.alive && !e.active) { e.active = true; any = true; if (e.boss) { S.stats.bossReached = true; S.stats.gearAtBoss = gearLevel(S.gear); S.stats.cpAtBoss = partyCP(S.P); log(S, '석굴 군주 고르바크가 깨어났습니다!', 'warn'); S.ev.push({ t: 'banner', text: '석굴 군주 고르바크', sub: `${S.floor}층 보스 · 권장 전투력 ${recCP(S.floor).toLocaleString()}`, color: 'hurt' }); S.ev.push({ t: 'shake', m: 6 }); } }
  return any;
}

function damage(S, src, tgt, amt, kind) {
  if (src && src.team === 'hero' && src.buffs && src.buffs.overload > 0) amt *= 1.5;
  if (tgt && tgt.buffs && tgt.buffs.marked > 0) amt *= 1.15;
  if (!tgt.alive) return 0;
  let a = amt;
  if (tgt.team === 'hero') {
    if (tgt.buffs.evade > 0 && kind === 'hit') return 0;
    a *= (1 - tgt.armor);
    if (tgt.buffs.wall > 0) a *= hasAug(S, 'iron_wall') ? 0.25 : 0.4;
  if (tgt.buffs && tgt.buffs.guard > 0) a *= 0.3;
  if (tgt.buffs && tgt.buffs.rime > 0) a *= 0.8;
  if (tgt.buffs && tgt.buffs.unbreak > 0 && a >= tgt.hp) { a = 0; tgt.buffs.unbreak = 0; tgt.buffs.wall = Math.max(tgt.buffs.wall || 0, 3); fx(S, { type: 'num', x: tgt.x, y: tgt.y - tgt.r - 18, text: '불굴', color: 'good', life: 1 }); }
    if (S.partyDR > 0) a *= 0.5;
    if (S.runDr) a *= (1 - S.runDr);
    if (tgt.buffs && tgt.buffs.sanctum > 0) a *= 0.75;
    if (hasAug(S, 'pool_walker') && kind === 'pool') a *= 0.5;
    if (tgt.absorb > 0) { const s = Math.min(tgt.absorb, a); tgt.absorb -= s; a -= s; }
    if (kind === 'hit' && src && src.team === 'enemy' && tgt.thorns > 0 && src.alive && !src.castKind) { const back = a * tgt.thorns; src.hp -= back; if (src.hp <= 0) { src.hp = 1; } src.flash = 0.08; }
    if (kind === 'pool') S.stats.poolDmg[tgt.role] = (S.stats.poolDmg[tgt.role] || 0) + a;
    if (kind === 'poison') S.stats.poisonDmg += a;
  } else {
    var crit = false;
    if (src && src.team === 'hero') {
      a *= src.pow;
      if (hasAug(S, 'focus_fire') && tgt.boss) a *= 1.2;
      if (hasAug(S, 'cleave_storm') && kind === 'aoe') a *= 1.3;
      if (hasAug(S, 'execute_mark') && pct(tgt) <= 0.35) a *= 1.3;
      if (hasAug(S, 'champion_bane') && tgt.champ) a *= 1.35;
      if (hasAug(S, 'stone_break') && tgt.key === 'add') a *= 1.4;
      if ((kind === 'hit' || kind === 'aoe' || kind === 'ult') && Math.random() < src.crit) { a *= src.critDmg || 2; crit = true; }
      if (src.leech && kind !== 'tick') src.hp = Math.min(src.maxHp, src.hp + a * src.leech);
      src.dmgDone += a; addThreat(S, src, tgt, a * (src.role === 'tank' ? (hasAug(S, 'threat_aura') ? 5.6 : 4) : 1));
    }
    if (!tgt.boss || crit) tgt.flash = 0.08;
    if (!tgt.active) activatePack(S, tgt.pack);
  }
  tgt.hp -= a;
  if (a >= 1 && kind !== 'pool' && kind !== 'poison' && kind !== 'tick')
    fx(S, { type: 'num', x: tgt.x + (Math.random() * 16 - 8), y: tgt.y - tgt.r - 4, text: crit ? Math.round(a) + '!' : Math.round(a), color: tgt.team === 'hero' ? 'hurt' : crit ? 'crit' : 'dmg', big: crit, life: crit ? 1 : 0.8 });
  if (tgt.team === 'hero' && a > tgt.maxHp * 0.18) S.ev.push({ t: 'shake', m: 4 });
  if (tgt.hp <= 0) {
    tgt.hp = 0; tgt.alive = false; tgt.casting = null;
    if (tgt.team === 'hero') {
      const cause = { pool: '바닥 장판', blast: '암흑 폭발', strike: '대지 강타', poison: '독', bolt: '그림자 화살' }[kind] || (src ? src.name + '의 공격' : '피해');
      S.stats.deaths.push({ role: tgt.role, name: tgt.name, cause, t: S.t, boss: !!(boss(S) && boss(S).active) });
      log(S, `${tgt.name} 사망 (${cause})`, 'death'); S.ev.push({ t: 'shake', m: 5 });
    } else {
      S.stats.kills++;
      reward(S, tgt);
      fx(S, { type: 'puff', x: tgt.x, y: tgt.y, r: tgt.r, color: tgt.champ ? 'champ' : tgt.boss ? 'boss' : 'enemy', life: 0.6, seed: Math.random() * 99 });
      dropLoot(S, tgt);
      if (tgt.boss) { log(S, '고르바크 처치!', 'good'); S.ev.push({ t: 'shake', m: 12 }); S.ev.push({ t: 'banner', text: '고르바크 처치!', sub: `${S.floor}층 클리어`, color: 'tape' }); }
      if (!S.enemies.some(e => e.pack === tgt.pack && e.alive)) S.stats.packsCleared++;
    }
  }
  return a;
}
function heal(S, src, tgt, amt) {
  if (!tgt.alive) return;
  amt *= src.pow * (src.healMul || 1);
  const before = tgt.hp; tgt.hp = Math.min(tgt.maxHp, tgt.hp + amt); const done = tgt.hp - before;
  src.healDone += done;
  const es = activeE(S); for (const e of es) addThreat(S, src, e, done * 0.35 / Math.max(1, es.length));
  fx(S, { type: 'num', x: tgt.x + 8, y: tgt.y - tgt.r - 10, text: '+' + Math.round(amt), color: 'heal', life: 0.8 });
}

// ---------- 보상 ----------
function reward(S, e) {
  const k = e.champ ? 3 : 1;
  const g = Math.round((e.boss ? 150 : (5 + rnd(8)) * k) * S.fs * (1 + S.bonus.gold / 100 + (S.runGold || 0))), x = Math.round((e.boss ? 220 : 12 * k) * S.fs * (1 + S.bonus.xp / 100));
  S.P.gold += g; S.run.gold += g; gainXp(S, x);
  fx(S, { type: 'num', x: e.x, y: e.y + 6, text: '+' + g + 'G', color: 'gold', life: 1.1 });
}
function gainXp(S, x) {
  const P = S.P; P.xp += x; S.run.xp += x;
  while (P.xp >= xpNeed(P.lvl)) {
    const before = partyCP(P);
    P.xp -= xpNeed(P.lvl); P.lvl++; S.run.lvlUps++;
    S.heroes.forEach(h => { applyGear(S, h); if (h.alive) h.hp = Math.min(h.maxHp, h.hp + h.maxHp * 0.3); fx(S, { type: 'ring', x: h.x, y: h.y, r: 28, color: 'tape', life: 0.9 }); });
    S.ev.push({ t: 'banner', text: `레벨 업! Lv ${P.lvl}`, sub: `파티 전원 공격 +${Math.round(TUNE.lvlPow * 100)}% · 체력 +${Math.round(TUNE.lvlHp * 100)}%`, color: 'tape' });
    S.ev.push({ t: 'cp', from: before, to: partyCP(P) });
    log(S, `파티 레벨 ${P.lvl} 달성`, 'good');
  }
}

// ---------- 전리품 ----------
function spawnDrop(S, e, it) {
  let x = e.x + (Math.random() * 30 - 15), y = e.y + (Math.random() * 30 - 15);
  if (blocked(S, x, y, 10)) { x = e.x; y = e.y; }
  S.drops.push({ x, y, item: it, t: 0 });
}
function dropLoot(S, e) {
  const reqStage = S.runStage || 0;
  const dunId = (S.dungeon && S.dungeon.id) || 'base';
  const base = (S.floor - 1) * 3;
  const mfLuck = 0.35 * (S.bonus.mf || 0) / ((S.bonus.mf || 0) + 150);
  if (e.boss) {
    const n = 4 + rnd(2);
    for (let i = 0; i < n; i++) {
      const ilvl = base + 9 + rnd(4) + reqStage * 4;
      spawnDrop(S, e, makeItem(ilvl, 0, null, null, rollRarity(dunId, mfLuck), reqStage));
    }
    return;
  }
  const cap = e.champ ? TRASH_DROP_CAP.champ : TRASH_DROP_CAP.normal;
  const p0 = e.champ ? TRASH_DROP.champ : TRASH_DROP.normal;
  if (Math.random() >= Math.min(cap, p0 * (1 + mfLuck))) return;
  const rar = rollTrashRarity();
  const ilvl = Math.max(1, base + (e.champ ? 3 : 1) + rnd(3) + reqStage * 2);
  spawnDrop(S, e, makeItem(ilvl, 0, null, null, rar, reqStage));
}
function pickUp(S, d) {
  const P = S.P, it = d.item, h = S.heroes.find(x => x.role === it.role);
  S.stats.loot.push(it);
  const up = isUpgrade(P, it);
  if (P.autoEquip && up) {
    const before = partyCP(P);
    P.bag.unshift(it); equipItem(P, it.id); S.stats.equipped++; applyGear(S, h);
    while (P.bag.length > BAG_MAX) { const w = P.bag.pop(); P.gold += sellPrice(w); }
    S.ev.push({ t: 'cp', from: before, to: partyCP(P) });
    log(S, `[${RARITY[it.rar].name}] ${it.name} → ${h.name} 자동 장착`, 'loot' + it.rar);
    fx(S, { type: 'num', x: d.x, y: d.y - 10, text: '장착!', color: 'r' + it.rar, life: 1.2 });
  } else {
    const r = addToBag(P, it);
    if (r.sold) log(S, `가방이 가득 차서 ${r.sold.name} 판매 (+${r.gold}G)`, 'muted');
    if (r.sold !== it) {
      S.stats.bagged++;
      log(S, `[${RARITY[it.rar].name}] ${it.name} 획득${up ? ' ▲ ' + h.name + ' 장비보다 좋음' : ''}`, up ? 'loot' + it.rar : 'muted');
      fx(S, { type: 'num', x: d.x, y: d.y - 10, text: up ? '▲ 획득' : '획득', color: 'r' + it.rar, life: 1.1 });
      S.ev.push({ t: 'loot', up });
    }
  }
  if (it.rar >= 2) S.ev.push({ t: 'banner', text: `${RARITY[it.rar].name} 장비 획득!`, sub: `${it.name} (${h.name} ${SLOT_NAME[it.slot]})`, color: 'r' + it.rar });
  if (it.rar === 3) S.ev.push({ t: 'shake', m: 4 });
}

// ---------- 스킬 실행 ----------
// 스킬 연출: 스킬별 이펙트(sk) + 시전자 머리 위 스킬 이름(label)
const QUIET = { fire: 1, flash: 1 };
function skFx(S, h, id, o) {
  o = o || {};
  fx(S, Object.assign({ type: 'sk', id, role: h.role, x: h.x, y: h.y, life: 0.6 }, o));
  if (!QUIET[id]) {
    const sk = SKILLS[h.role].find(x => x.id === id);
    fx(S, { type: 'label', text: sk ? sk.name : id, x: h.x, y: h.y - 30, color: h.role, life: 1.1 });
  }
  h.lastSkill = id; h.lastSkillT = S.t;
}
function startCast(h, name, time, onDone) { h.casting = { name, t: time / h.haste, total: time / h.haste, onDone }; }
function pickTarget(S, h) {
  const es = activeE(S); if (!es.length) return null;
  const mode = S.cfg[h.role].target;
  if (mode === 'weak') return es.slice().sort((a, b) => a.hp - b.hp)[0];
  if (mode === 'caster') { const c = es.filter(e => e.castKind); if (c.length) return nearest(c, h); }
  const t = tankOf(S);
  if (t && t.target && t.target.alive && t.target.active) return t.target;
  return es.find(e => e.boss) || nearest(es, h);
}
function moveOutOfPool(S, h, blink) {
  const p = inPool(S, h); if (!p) return false;
  let best = null;
  for (let k = 0; k < 12; k++) {
    const a = k / 12 * Math.PI * 2, tx = p.x + Math.cos(a) * (p.r + 22), ty = p.y + Math.sin(a) * (p.r + 22);
    if (blocked(S, tx, ty, h.r) || S.pools.some(q => q !== p && Math.hypot(tx - q.x, ty - q.y) < q.r + 10)) continue;
    const d = Math.hypot(tx - h.x, ty - h.y); if (!best || d < best[2]) best = [tx, ty, d];
  }
  if (!best) return false;
  h.casting = null;
  if (blink) { h.x = best[0]; h.y = best[1]; fx(S, { type: 'ring', x: h.x, y: h.y, r: 18, color: 'mage', life: 0.4 }); }
  else h.moveTo = { x: best[0], y: best[1] };
  return true;
}
const near = (S, h, r) => activeE(S).filter(e => dist(e, h) < r);
const enemyOnMe = (S, h) => activeE(S).some(e => e.target === h && dist(e, h) < e.r + h.r + 30 && !e.castKind);

const SKILL_FN = {
  tank: {
    taunt(S, h, c) {
      const e = activeE(S).find(e => e.target && e.target !== h && e.target.alive && (c === 'other' || e.target.role === 'healer' || e.target.role === 'mage' || e.target.role === 'hunter'));
      if (!e) return false;
      const top = Math.max(0, ...Object.values(e.threat)); e.threat[h.id] = top + (hasAug(S, 'threat_aura') ? 1260 : 900); e.taunted = 3; e.target = h; setCd(S, h, 'taunt', 8); skFx(S, h, 'taunt', { tx: e.x, ty: e.y, life: 0.9 });
      fx(S, { type: 'line', x: h.x, y: h.y, x2: e.x, y2: e.y, color: 'tank', life: 0.4 }); log(S, `전사: ${e.name} 도발`, 'skill'); return true;
    },
    bash(S, h, c) {
      let e;
      if (c === 'interrupt') e = activeE(S).find(e => e.casting && e.casting.interruptible && dist(e, h) < e.r + h.r + 26 && e.casting.total - e.casting.t > 0.3);
      else { e = h.target; if (!e || !e.alive || dist(e, h) > e.r + h.r + 26) e = null; }
      if (!e) return false;
      damage(S, h, e, 70, 'hit'); addThreat(S, h, e, 300); setCd(S, h, 'bash', 9); h.gcd = 0.6; skFx(S, h, 'bash', { tx: e.x, ty: e.y, life: 0.5 });
      if (e.casting && e.casting.interruptible) { log(S, `전사: ${e.name}의 「${e.casting.name}」 차단!`, 'good'); e.casting = null; e.atkT = 2; S.stats.interrupts++; if (hasAug(S, 'interrupt_edge')) damage(S, h, e, 120, 'hit'); fx(S, { type: 'num', x: e.x, y: e.y - e.r - 14, text: '차단', color: 'good', life: 1 }); }
      fx(S, { type: 'slash', x: e.x, y: e.y, color: 'tank', life: 0.3 }); return true;
    },
    clap(S, h, c) {
      const ns = near(S, h, 75); if (ns.length < (c === 'n3' ? 3 : 2)) return false;
      ns.forEach(e => { damage(S, h, e, 45, 'aoe'); addThreat(S, h, e, 240); e.slow = 3 * (hasAug(S, 'frostbite') ? 1.4 : 1); });
      setCd(S, h, 'clap', 6); h.gcd = 0.8; skFx(S, h, 'clap', { r: 75, life: 0.55, seed: Math.random() * 9 }); return true;
    },
    wall(S, h, c) {
      if (h.buffs.wall > 0) return false;
      const b = boss(S);
      const ok = c === 'strike' ? (b && b.active && b.alive && b.strikeWarn > 0) : pct(h) < (c === 'hp60' ? 0.6 : 0.4);
      if (!ok) return false;
      h.buffs.wall = 5 + (hasGearSkill(S, h, 'g_wall_plus') ? 1 : 0); setCd(S, h, 'wall', 14); log(S, '전사: 방패의 벽', 'skill'); skFx(S, h, 'wall', { life: 0.6 }); return true;
    },
    wave(S, h, c) {
      const ns = near(S, h, 90); if (!(c === 'squishy' ? activeE(S).some(e => e.target && e.target.role !== 'tank') : ns.length >= 2)) return false;
      ns.forEach(e => { const top = Math.max(0, ...Object.values(e.threat)); e.threat[h.id] = top + 1100; e.taunted = 2.5; e.target = h; });
      setCd(S, h, 'wave', 14); h.gcd = 0.7; skFx(S, h, 'wave', { r: 90, life: 0.6 }); log(S, '전사: 도발 파동', 'skill'); return true;
    },
    vow(S, h, c) {
      const b = boss(S);
      let t = aliveH(S).filter(x => x !== h).sort((a, b) => pct(a) - pct(b))[0];
      const ok = c === 'strike' ? (b && b.active && b.strikeWarn > 0) : (t && pct(t) < 0.35);
      if (!ok || !t) return false;
      t.buffs.guard = 2; setCd(S, h, 'vow', 22); skFx(S, h, 'vow', { tx: t.x, ty: t.y, life: 0.7 }); log(S, `전사: ${t.name} 수호의 맹세`, 'skill'); return true;
    },
    riposte(S, h, c) {
      if (!(h.buffs.wall > 0) && c === 'wall') return false;
      const ns = near(S, h, 80); if (ns.length < 2 && c === 'n2') return false;
      if (!ns.length) return false;
      ns.forEach(e => { damage(S, h, e, 90, 'aoe'); addThreat(S, h, e, 400); });
      setCd(S, h, 'riposte', 12); h.gcd = 0.6; skFx(S, h, 'riposte', { r: 80, life: 0.5 }); return true;
    },
    unbreak(S, h, c) {
      const b = boss(S);
      const ok = c === 'strike' ? (b && b.active && b.strikeWarn > 0) : pct(h) < 0.25;
      if (!ok) return false;
      h.buffs.unbreak = 8; h.buffs.wall = Math.max(h.buffs.wall || 0, 3); setCd(S, h, 'unbreak', 30);
      skFx(S, h, 'unbreak', { life: 0.8 }); log(S, '전사: 불굴', 'skill'); return true;
    },
  },
  healer: {
    flash(S, h, c) {
      if (h.mana < 55) return false;
      let t;
      if (c === 'tank80') { t = tankOf(S); if (!t || pct(t) >= 0.8) t = null; }
      else t = aliveH(S).filter(x => pct(x) < (c === 'low50' ? 0.5 : 0.7)).sort((a, b) => pct(a) - pct(b))[0];
      if (!t) return false;
      startCast(h, '빠른 치유', 1.2, () => { if (t.alive) { heal(S, h, t, 190); h.mana -= 55; skFx(S, h, 'flash', { tx: t.x, ty: t.y, tgt: t, life: 0.8 }); } }); return true;
    },
    rain(S, h, c) {
      if (h.mana < 160) return false;
      const hurt = aliveH(S).filter(x => pct(x) < (c === 'n2' ? 0.7 : 0.75));
      if (hurt.length < (c === 'n2' ? 2 : 3)) return false;
      startCast(h, '치유의 비', 1.5, () => { aliveH(S).forEach(x => heal(S, h, x, 170)); h.mana -= 160; setCd(S, h, 'rain', 9); skFx(S, h, 'rain', { pts: aliveH(S).map(x => [x.x, x.y]), life: 1.1, seed: Math.random() * 9 }); });
      return true;
    },
    bubble(S, h, c) {
      if (h.mana < 80) return false;
      let t = null; const b = boss(S);
      if (c === 'low30') t = aliveH(S).filter(x => pct(x) < 0.3 && x.absorb <= 0).sort((a, b) => pct(a) - pct(b))[0];
      else if (c === 'strike') { if (b && b.alive && b.active && b.strikeWarn > 0) t = tankOf(S); }
      else if (c === 'blast') { if (b && b.alive && b.casting && b.casting.name === '암흑 폭발') t = aliveH(S).filter(x => x.absorb <= 0).sort((a, b) => a.hp - b.hp)[0]; }
      if (!t || t.absorb > 0) return false;
      t.absorb = 350 * h.pow * (hasAug(S, 'holy_overflow') ? 1.25 : 1); h.mana -= 80; setCd(S, h, 'bubble', 15); h.gcd = 0.8; skFx(S, h, 'bubble', { tx: t.x, ty: t.y, life: 0.6 });
      fx(S, { type: 'ring', x: t.x, y: t.y, r: 20, color: 'heal', life: 0.6 }); log(S, `치유사: ${t.name}에게 보호막`, 'skill'); return true;
    },
    dispel(S, h, c) {
      if (h.mana < 40) return false;
      let ps = aliveH(S).filter(x => x.poison > 0); if (ps.length < (c === 'two' ? 2 : 1)) return false;
      if (hasAug(S, 'cleanse_wave')) ps = aliveH(S);
      ps.forEach(x => x.poison = 0); h.mana -= 40; setCd(S, h, 'dispel', 4); h.gcd = 0.8; skFx(S, h, 'dispel', { pts: ps.map(x => [x.x, x.y]), life: 0.7, seed: Math.random() * 9 });
      fx(S, { type: 'ring', x: ps[0].x, y: ps[0].y, r: 16, color: 'heal', life: 0.4 }); return true;
    },
    bond(S, h, c) {
      if (h.mana < 70) return false;
      let t = c === 'tank80' ? tankOf(S) : aliveH(S).filter(x => pct(x) < 0.7).sort((a, b) => pct(a) - pct(b))[0];
      if (!t || (c === 'tank80' && pct(t) >= 0.8)) return false;
      heal(S, h, t, 200); const other = aliveH(S).filter(x => x !== t).sort((a, b) => pct(a) - pct(b))[0];
      if (other) heal(S, h, other, 80); h.mana -= 70; setCd(S, h, 'bond', 8); h.gcd = 0.7;
      skFx(S, h, 'bond', { tx: t.x, ty: t.y, life: 0.7 }); return true;
    },
    well(S, h, c) {
      if (c === 'm30' && h.mana >= h.maxMana * 0.3) return false;
      h.mana = Math.min(h.maxMana, h.mana + 220); setCd(S, h, 'well', 20); h.gcd = 0.5;
      skFx(S, h, 'well', { life: 0.6 }); log(S, '치유사: 마나샘', 'skill'); return true;
    },
    sanctum(S, h, c) {
      const b = boss(S);
      const hurt = aliveH(S).filter(x => pct(x) < 0.75);
      if (c === 'strike' ? !(b && b.strikeWarn > 0) : hurt.length < 2) return false;
      if (h.mana < 100) return false;
      S.zones.push({ x: h.x, y: h.y, r: 90, t: 6, src: h, sanctum: true, seed: Math.random() * 9 });
      h.mana -= 100; setCd(S, h, 'sanctum', 18); skFx(S, h, 'sanctum', { r: 90, life: 0.7 }); return true;
    },
    revive(S, h, c) {
      const dead = S.heroes.filter(x => !x.alive);
      if (!dead.length) return false;
      if (c === 'boss' && !(boss(S) && boss(S).active)) return false;
      if (h.mana < 120) return false;
      const t = dead[0]; t.alive = true; t.hp = t.maxHp * 0.35; h.mana -= 120; setCd(S, h, 'revive', 45);
      skFx(S, h, 'revive', { tx: t.x, ty: t.y, life: 1 }); log(S, `치유사: ${t.name} 부활`, 'good'); return true;
    },
  },
  mage: {
    fire(S, h, c) {
      if (h.mana < 30 || (c === 'm30' && h.mana < h.maxMana * 0.3)) return false;
      const e = pickTarget(S, h); if (!e || dist(e, h) > h.range + e.r || !los(S, h.x, h.y, e.x, e.y)) return false;
      startCast(h, '화염구', 1.5, () => { if (!e.alive) return; h.mana -= 30; damage(S, h, e, 130 * (hasGearSkill(S, h, 'g_fire_boom') ? 1.15 : 1), 'hit'); skFx(S, h, 'fire', { tx: e.x, ty: e.y, life: 0.45 }); });
      return true;
    },
    bliz(S, h, c) {
      if (h.mana < 110) return false;
      const es = activeE(S).filter(e => dist(e, h) < h.range + 40); if (es.length < (c === 'n2' ? 2 : 3)) return false;
      const cx = es.reduce((s, e) => s + e.x, 0) / es.length, cy = es.reduce((s, e) => s + e.y, 0) / es.length;
      startCast(h, '눈보라', 1.0, () => { h.mana -= 110; setCd(S, h, 'bliz', 10); S.zones.push({ x: cx, y: cy, r: 75, t: 4, src: h, seed: Math.random() * 9 }); skFx(S, h, 'bliz', { tx: cx, ty: cy, life: 0.5 }); });
      return true;
    },
    nova(S, h, c) {
      if (h.mana < 60) return false;
      const ns = near(S, h, 80); if (!(c === 'onme' ? enemyOnMe(S, h) : ns.length >= 2)) return false;
      ns.forEach(e => { damage(S, h, e, 70, 'aoe'); if (!e.boss) e.root = 2 * (hasAug(S, 'frostbite') ? 1.4 : 1); });
      h.mana -= 60; setCd(S, h, 'nova', 12); h.gcd = 0.6; skFx(S, h, 'nova', { r: 80, life: 0.6, seed: Math.random() * 9 }); return true;
    },
    blink(S, h, c) {
      if (c === 'pool') { if (!inPool(S, h)) return false; const fx0 = h.x, fy0 = h.y; if (moveOutOfPool(S, h, true)) { setCd(S, h, 'blink', 7); skFx(S, h, 'blink', { fx: fx0, fy: fy0, life: 0.6 }); return true; } return false; }
      if (!enemyOnMe(S, h)) return false;
      const e = nearest(activeE(S), h), a = Math.atan2(h.y - e.y, h.x - e.x);
      for (const dd of [110, 80, 50]) { const tx = h.x + Math.cos(a) * dd, ty = h.y + Math.sin(a) * dd; if (!blocked(S, tx, ty, h.r) && los(S, h.x, h.y, tx, ty)) { h.casting = null; const fx0 = h.x, fy0 = h.y; h.x = tx; h.y = ty; setCd(S, h, 'blink', 7); skFx(S, h, 'blink', { fx: fx0, fy: fy0, life: 0.6 }); return true; } }
      return false;
    },
    overload(S, h, c) {
      if (c === 'boss' && !(boss(S) && boss(S).active)) return false;
      h.buffs.overload = 8; setCd(S, h, 'overload', 16); skFx(S, h, 'overload', { life: 0.6 }); log(S, '마법사: 마력 과부하', 'skill'); return true;
    },
    rime(S, h, c) {
      if (c === 'hp50' ? pct(h) >= 0.5 : !enemyOnMe(S, h)) return false;
      h.buffs.rime = 4; setCd(S, h, 'rime', 14); skFx(S, h, 'rime', { life: 0.55 }); return true;
    },
    meteor(S, h, c) {
      if (h.mana < 140) return false;
      let es = activeE(S).filter(e => dist(e, h) < h.range + 40);
      if (c === 'boss') { const b = boss(S); if (b && b.active) es = [b]; }
      if (es.length < (c === 'n2' ? 2 : 1)) return false;
      const tg = es[0];
      startCast(h, '운석 잔여', 1.2, () => {
        h.mana -= 140; setCd(S, h, 'meteor', 20);
        S.zones.push({ x: tg.x, y: tg.y, r: 70, t: 5, src: h, hot: true, seed: Math.random() * 9 });
        skFx(S, h, 'meteor', { tx: tg.x, ty: tg.y, life: 0.7 });
      }); return true;
    },
    rift(S, h, c) {
      if (c === 'pool' ? !inPool(S, h) : !enemyOnMe(S, h)) return false;
      const fx0 = h.x, fy0 = h.y;
      if (!moveOutOfPool(S, h, true) && c === 'pool') return false;
      if (c !== 'pool') {
        const e = nearest(activeE(S), h), a = Math.atan2(h.y - e.y, h.x - e.x);
        const tx = h.x + Math.cos(a) * 90, ty = h.y + Math.sin(a) * 90;
        if (blocked(S, tx, ty, h.r)) return false;
        h.x = tx; h.y = ty;
      }
      near(S, { x: fx0, y: fy0 }, 55).forEach(e => damage(S, h, e, 160, 'aoe'));
      setCd(S, h, 'rift', 12); skFx(S, h, 'rift', { fx: fx0, fy: fy0, life: 0.7 }); return true;
    },
  },
  rogue: {
    kick(S, h, c) {
      const e = activeE(S).filter(e => e.casting && e.casting.interruptible && (c === 'any' || e.boss) && e.casting.total - e.casting.t > 0.4)
        .sort((a, b) => (b.boss ? 1 : 0) - (a.boss ? 1 : 0))[0];
      if (!e) return false;
      log(S, `도적: ${e.name}의 「${e.casting.name}」 차단!`, 'good');
      e.casting = null; e.atkT = 2; setCd(S, h, 'kick', 10); S.stats.interrupts++; if (hasAug(S, 'interrupt_edge')) damage(S, h, e, 140, 'hit'); skFx(S, h, 'kick', { tx: e.x, ty: e.y, life: 0.6 });
      fx(S, { type: 'line', x: h.x, y: h.y, x2: e.x, y2: e.y, color: 'rogue', life: 0.4 });
      fx(S, { type: 'num', x: e.x, y: e.y - e.r - 14, text: '차단', color: 'good', life: 1 }); return true;
    },
    evis(S, h, c) {
      const e = h.target; if (!e || !e.alive || dist(h, e) > h.range + e.r + 6) return false;
      if (c === 'exec' && pct(e) > 0.35) return false;
      damage(S, h, e, 190, 'hit'); setCd(S, h, 'evis', 7); h.gcd = 0.8; skFx(S, h, 'evis', { tx: e.x, ty: e.y, life: 0.45 }); return true;
    },
    fan(S, h, c) {
      const ns = near(S, h, 70); if (ns.length < (c === 'n2' ? 2 : 3)) return false;
      ns.forEach(e => damage(S, h, e, 70, 'aoe')); setCd(S, h, 'fan', 8); h.gcd = 0.8; skFx(S, h, 'fan', { r: 70, life: 0.5, seed: Math.random() * 9 });
      fx(S, { type: 'ring', x: h.x, y: h.y, r: 70, color: 'rogue', life: 0.4 }); return true;
    },
    vanish(S, h, c) {
      const ok = c === 'hp40' ? pct(h) < 0.4 : activeE(S).some(e => e.target === h && !e.castKind);
      if (!ok) return false;
      activeE(S).forEach(e => { e.threat[h.id] = 0; if (e.target === h) e.target = null; });
      h.buffs.evade = 3; setCd(S, h, 'vanish', 25); log(S, '도적: 소멸', 'skill'); skFx(S, h, 'vanish', { life: 0.8, seed: Math.random() * 9 }); return true;
    },
    poison(S, h, c) {
      let e = h.target; if (c === 'boss') { const b = boss(S); if (b && b.active) e = b; }
      if (!e || !e.alive || dist(h, e) > h.range + e.r + 10) return false;
      e.poison = Math.max(e.poison || 0, 6); e.poisonDps = 40; setCd(S, h, 'poison', 10); h.gcd = 0.5;
      skFx(S, h, 'poison', { tx: e.x, ty: e.y, life: 0.5 }); return true;
    },
    smoke(S, h, c) {
      const ok = c === 'pool' ? S.pools.some(p => aliveH(S).some(x => Math.hypot(x.x - p.x, x.y - p.y) < p.r + 20)) : aliveH(S).filter(x => pct(x) < 0.7).length >= 2;
      if (!ok) return false;
      S.partyDR = Math.max(S.partyDR, 3); setCd(S, h, 'smoke', 18); skFx(S, h, 'smoke', { r: 100, life: 0.7 }); log(S, '도적: 연막', 'skill'); return true;
    },
    mark(S, h, c) {
      let e = c === 'boss' ? (boss(S) && boss(S).active ? boss(S) : null) : h.target;
      if (!e || !e.alive) return false;
      if (c === 'exec' && pct(e) > 0.35) return false;
      e.buffs = e.buffs || {}; e.buffs.marked = 8; setCd(S, h, 'mark', 12); skFx(S, h, 'mark', { tx: e.x, ty: e.y, life: 0.55 }); return true;
    },
    clone(S, h, c) {
      const ok = c === 'hp40' ? pct(h) < 0.4 : activeE(S).some(e => e.target === h);
      if (!ok) return false;
      activeE(S).forEach(e => { e.threat[h.id] = (e.threat[h.id] || 0) * 0.3; });
      const e = h.target; if (e && e.alive) damage(S, h, e, 120, 'hit');
      h.buffs.evade = Math.max(h.buffs.evade || 0, 2); setCd(S, h, 'clone', 22);
      skFx(S, h, 'clone', { life: 0.7 }); return true;
    },
  },
  hunter: {
    shot(S, h, c) {
      const e = pickTarget(S, h); if (!e || dist(e, h) > h.range + e.r || !los(S, h.x, h.y, e.x, e.y)) return false;
      if (c === 'exec' && pct(e) > 0.35) return false;
      startCast(h, '조준 사격', 0.9, () => { if (!e.alive) return; damage(S, h, e, 155, 'hit'); skFx(S, h, 'shot', { tx: e.x, ty: e.y, life: 0.4 }); });
      return true;
    },
    volley(S, h, c) {
      const es = activeE(S).filter(e => dist(e, h) < h.range + 20 && los(S, h.x, h.y, e.x, e.y));
      if (es.length < (c === 'n2' ? 2 : 3)) return false;
      const hits = es.slice().sort((a, b) => dist(a, h) - dist(b, h)).slice(0, 5);
      hits.forEach(e => damage(S, h, e, 60, 'aoe'));
      setCd(S, h, 'volley', 8); h.gcd = 0.7; skFx(S, h, 'volley', { pts: hits.map(e => [e.x, e.y]), life: 0.5, seed: Math.random() * 9 });
      return true;
    },
    trap(S, h, c) {
      const ns = near(S, h, 70); if (!(c === 'onme' ? enemyOnMe(S, h) : ns.length >= 2)) return false;
      ns.forEach(e => { const fm = hasAug(S, 'frostbite') ? 1.4 : 1; if (!e.boss) e.root = 2.5 * fm; e.slow = 3 * fm; damage(S, h, e, 35, 'aoe'); });
      setCd(S, h, 'trap', 12); h.gcd = 0.6; skFx(S, h, 'trap', { r: 70, life: 0.7, seed: Math.random() * 9 }); return true;
    },
    disengage(S, h, c) {
      if (c === 'pool') { if (!inPool(S, h)) return false; const fx0 = h.x, fy0 = h.y; if (moveOutOfPool(S, h, true)) { setCd(S, h, 'disengage', 8); skFx(S, h, 'disengage', { fx: fx0, fy: fy0, life: 0.55 }); return true; } return false; }
      if (!enemyOnMe(S, h)) return false;
      const e = nearest(activeE(S), h), a = Math.atan2(h.y - e.y, h.x - e.x);
      for (const dd of [120, 90, 60]) { const tx = h.x + Math.cos(a) * dd, ty = h.y + Math.sin(a) * dd; if (!blocked(S, tx, ty, h.r) && los(S, h.x, h.y, tx, ty)) { h.casting = null; const fx0 = h.x, fy0 = h.y; h.x = tx; h.y = ty; setCd(S, h, 'disengage', 8); skFx(S, h, 'disengage', { fx: fx0, fy: fy0, life: 0.55 }); return true; } }
      return false;
    },
    pierce(S, h, c) {
      const e = pickTarget(S, h); if (!e || dist(e, h) > h.range + e.r) return false;
      const a = Math.atan2(e.y - h.y, e.x - h.x);
      activeE(S).forEach(x => {
        const dx = x.x - h.x, dy = x.y - h.y, proj = dx * Math.cos(a) + dy * Math.sin(a);
        if (proj < 0 || proj > h.range + 40) return;
        const perp = Math.abs(dx * Math.sin(a) - dy * Math.cos(a));
        if (perp < 28) damage(S, h, x, 110, 'aoe');
      });
      setCd(S, h, 'pierce', 9); h.gcd = 0.7; skFx(S, h, 'pierce', { tx: e.x, ty: e.y, life: 0.45 }); return true;
    },
    beast(S, h, c) {
      if (c === 'boss' && !(boss(S) && boss(S).active)) return false;
      const e = pickTarget(S, h); if (!e) return false;
      damage(S, h, e, 140, 'hit'); setCd(S, h, 'beast', 16); h.gcd = 0.6;
      skFx(S, h, 'beast', { tx: e.x, ty: e.y, life: 0.7 }); return true;
    },
    focus(S, h, c) {
      let e = c === 'boss' ? (boss(S) && boss(S).active ? boss(S) : null) : pickTarget(S, h);
      if (!e || !e.alive) return false;
      if (c === 'exec' && pct(e) > 0.35) return false;
      startCast(h, '집중 사격', 1.4, () => { if (e.alive) { damage(S, h, e, 280, 'hit'); skFx(S, h, 'focus', { tx: e.x, ty: e.y, life: 0.5 }); } });
      setCd(S, h, 'focus', 14); return true;
    },
    field(S, h, c) {
      const ns = near(S, h, 100); if (!(c === 'onme' ? enemyOnMe(S, h) : ns.length >= 3)) return false;
      ns.forEach(e => { if (!e.boss) e.root = Math.max(e.root, 2); e.slow = Math.max(e.slow, 3); damage(S, h, e, 50, 'aoe'); });
      setCd(S, h, 'field', 18); skFx(S, h, 'field', { r: 100, life: 0.75 }); return true;
    },
  },
};

// ---------- 영웅 AI ----------
function heroTick(S, h) {
  for (const k in h.cds) if (h.cds[k] > 0) h.cds[k] -= DT;
  for (const k in h.buffs) if (h.buffs[k] > 0) h.buffs[k] -= DT;
  if (h.maxMana) { h.mana = Math.min(h.maxMana, h.mana + h.regen * (h.regenMul || 1) * DT * (S.inCombat ? 1 : 6)); if (h.role === 'healer' && S.inCombat && h.mana < h.maxMana * 0.05) S.stats.oom += DT; }
  if (!S.inCombat) { h.hp = Math.min(h.maxHp, h.hp + h.maxHp * 0.06 * DT); h.poison = 0; }
  if (S.inCombat && h.hpRegen > 0) h.hp = Math.min(h.maxHp, h.hp + h.maxHp * h.hpRegen * DT);
  if (h.poison > 0) { h.poison -= DT; damage(S, null, h, (h.poisonDps || 24) * (1 - (h.poisonRes || 0)) * DT, 'poison'); if (!h.alive) return; }
  if (S.inCombat && h.ult < 100) h.ult = Math.min(100, h.ult + DT * 100 / 30 * (hasAug(S, 'ult_resonance') ? 1.4 : 1));
}

function heroCombat(S, h) {
  if (h.moveTo) { h.moveT = (h.moveT || 0) + DT; if (goTo(S, h, h.moveTo.x, h.moveTo.y, 3) || h.moveT > 2) { h.moveTo = null; h.moveT = 0; } return; }
  if (h.casting) { h.casting.t -= DT; if (h.casting.t <= 0) { const c = h.casting; h.casting = null; c.onDone(); h.gcd = 0.25; } return; }
  if (h.gcd > 0) h.gcd -= DT;
  const C = S.cfg[h.role];
  if (C.dodge && h.role !== 'mage' && h.role !== 'hunter' && moveOutOfPool(S, h)) return;
  if (C.dodge && (h.role === 'mage' || h.role === 'hunter') && moveOutOfPool(S, h, false)) return;

  // 대상
  const es = activeE(S); if (!es.length) return;
  if (h.role === 'tank') {
    h.retarget = (h.retarget || 0) - DT;
    if (!h.target || !h.target.alive || !h.target.active || h.retarget <= 0) {
      const loose = es.filter(e => e.target && e.target !== h && !e.castKind);
      h.target = nearest(loose, h) || es.find(e => e.boss) || nearest(es.filter(e => !e.castKind), h) || nearest(es, h); h.retarget = 2.5;
    }
  } else if (!h.target || !h.target.alive || !h.target.active || h.role !== 'healer') {
    h.target = pickTarget(S, h);
  }

  if (h.gcd <= 0) {
    for (const id of C.order) {
      if (!C.on[id]) continue;
      const fn = SKILL_FN[h.role] && SKILL_FN[h.role][id];
      if (!fn) continue;
      if (fn(S, h, C.cond[id] || 'always')) return;
    }
  }

  const t = h.target; if (!t) return;
  if (h.role === 'tank' || h.role === 'rogue') {
    const reach = h.range + t.r;
    let ax = t.x, ay = t.y;
    const bad = S.pools.find(p => Math.hypot(t.x - p.x, t.y - p.y) < p.r + t.r + 20);
    if (bad) { const a = Math.atan2(t.y - bad.y, t.x - bad.x); ax = t.x + Math.cos(a) * (t.r + 14); ay = t.y + Math.sin(a) * (t.r + 14); }
    if (C.dodge && !inPool(S, h)) {
      const nx = h.x + Math.sign(ax - h.x) * 3, ny = h.y + Math.sign(ay - h.y) * 3;
      if (S.pools.some(p => p.warn <= 0 && Math.hypot(nx - p.x, ny - p.y) < p.r + h.r * 0.5)) return;
    }
    if (goTo(S, h, ax, ay, reach - 4)) {
      h.atkT -= DT * h.haste * (h.buffs.storm > 0 ? 3 : 1);
      if (h.atkT <= 0) {
        h.atkT = h.atkRate;
        if (h.buffs.storm > 0) es.filter(e => dist(e, h) < 65).forEach(e => damage(S, h, e, h.atk, 'hit'));
        else damage(S, h, t, h.atk, 'hit');
        fx(S, { type: 'basic', role: h.role, x: h.x, y: h.y, tx: t.x, ty: t.y, life: 0.25 }); h.swingT = S.t;
      }
    }
  } else {
    // 원거리: 탱커 뒤쪽 사거리 안
    const anchor = h.role === 'healer' ? (tankOf(S) || t) : t;
    const range = h.role === 'healer' ? 150 : h.range - 10;
    if (dist(h, anchor) > range || !los(S, h.x, h.y, anchor.x, anchor.y)) { goTo(S, h, anchor.x, anchor.y, range * 0.7); return; }
    if (h.role === 'healer' && h.mana < h.maxMana * 0.5) return;
    if (dist(h, t) > h.range + t.r || !los(S, h.x, h.y, t.x, t.y)) { goTo(S, h, t.x, t.y, h.range - 20); return; }
    h.atkT -= DT * h.haste;
    if (h.atkT <= 0) { h.atkT = h.atkRate; damage(S, h, t, h.atk, 'hit'); fx(S, { type: 'basic', role: h.role, x: h.x, y: h.y, tx: t.x, ty: t.y, life: 0.3 }); h.swingT = S.t; }
  }
}

// 탐험: 현재 블럭의 팩 → 보스 순
function chooseGoal(S, leader) {
  const ds = S.drops.filter(d => isSeen(S, d.x, d.y));
  if (ds.length) { const d = nearest(ds, leader); return { x: d.x, y: d.y, kind: 'loot' }; }
  const blk = S.blocks[S.blockI];
  if (blk) {
    const alive = S.packs.filter(p => blk.packs.includes(p.id) && S.enemies.some(e => e.pack === p.id && e.alive));
    if (alive.length) {
      const cur = S.segI || 0;
      const open = alive.filter(p => p.seg == null || p.seg <= cur);
      const pool = open.length ? open : alive;
      const seen = pool.filter(p => isSeen(S, p.x, p.y));
      const p = nearest(seen.length ? seen : pool, leader);
      return { x: p.x, y: p.y, kind: blk.boss ? 'boss' : 'pack' };
    }
  }
  const b = boss(S);
  if (b && b.alive) return { x: b.x, y: b.y, kind: 'boss' };
  const f = frontier(S, leader);
  if (f) return { x: f.x, y: f.y, kind: 'explore' };
  return null;
}
function frontier(S, from) {
  const g = S.map.g, si = Math.floor(from.x / TILE), sj = Math.floor(from.y / TILE);
  const seenQ = new Uint8Array(MW * MH), q = [sj * MW + si]; seenQ[q[0]] = 1;
  for (let qi = 0; qi < q.length; qi++) {
    const c = q[qi];
    if (!S.seen[c]) return { x: tc(c % MW), y: tc((c / MW) | 0) };
    const x = c % MW, y = (c / MW) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= MW || ny >= MH || !g[ny][nx]) continue;
      const n = ny * MW + nx; if (!seenQ[n]) { seenQ[n] = 1; q.push(n); }
    }
  }
  return null;
}
function unstick(S, u) {
  if (!blocked(S, u.x, u.y, u.r)) return;
  const i = Math.floor(u.x / TILE), j = Math.floor(u.y / TILE);
  for (let rad = 1; rad <= 5; rad++) {
    for (let y = j - rad; y <= j + rad; y++) for (let x = i - rad; x <= i + rad; x++) {
      const px = (x + 0.5) * TILE, py = (y + 0.5) * TILE;
      if (!blocked(S, px, py, u.r)) { u.x = px; u.y = py; u.path = null; return; }
    }
  }
}
function heroExplore(S, h, leader, idx) {
  unstick(S, h);
  h.casting = null; h.moveTo = null;
  if (h === leader) {
    S.goalT -= DT;
    if (!S.goal || S.goalT <= 0 || (S.goal.kind === 'explore' && isSeen(S, S.goal.x, S.goal.y) && Math.random() < 0.3)) { S.goal = chooseGoal(S, h); S.goalT = 1; }
    if (S.goal) { if (goTo(S, h, S.goal.x, S.goal.y, S.goal.kind === 'pack' || S.goal.kind === 'boss' ? 16 : 4)) S.goalT = 0; }
  } else {
    const off = [[0, 0], [-22, 28], [22, 28], [-16, 48], [16, 48]][idx];
    const lx = leader.x + off[0], ly = leader.y + off[1];
    const tx = blocked(S, lx, ly, h.r) ? leader.x : lx, ty = blocked(S, lx, ly, h.r) ? leader.y : ly;
    goTo(S, h, tx, ty, 8 + idx * 4);
  }
}

// ---------- 적 AI ----------
function enemyTick(S, e) {
  const hs = aliveH(S); if (!hs.length) return;
  if (!e.active) {
    if (S.t % 0.25 < DT) for (const h of hs) if (dist(h, e) < 48 || (dist(h, e) < (e.boss ? 130 : 210) && los(S, h.x, h.y, e.x, e.y))) { activatePack(S, e.pack); break; }
    return;
  }
  if (e.slow > 0) e.slow -= DT; if (e.root > 0) e.root -= DT; if (e.taunted > 0) e.taunted -= DT;
  if (!(e.taunted > 0)) {
    let best = null, bv = -1;
    for (const h of hs) { if (h.buffs.evade > 0) continue; const v = e.threat[h.id] || 0; if (v > bv) { bv = v; best = h; } }
    if (bv <= 0) best = nearest(hs, e);
    e.target = best;
  }
  if (!e.target || !e.target.alive) e.target = nearest(hs, e);
  if (e.boss) bossMechanics(S, e);
  if (!e.alive) return;
  if (e.casting) { e.casting.t -= DT; if (e.casting.t <= 0) { const c = e.casting; e.casting = null; c.onDone(); } return; }
  const t = e.target; if (!t) return;
  const canMove = !(e.root > 0);
  const mult = (e.enraged ? 3 : 1) * (e.boss || e.key === 'add' ? S.bossMult(e) : 1);
  if (e.castKind) {
    if (dist(e, t) > e.range || !los(S, e.x, e.y, t.x, t.y)) { if (canMove) goTo(S, e, t.x, t.y, e.range - 20); return; }
    e.atkT -= DT;
    if (e.atkT > 0) return;
    e.atkT = e.atkRate;
    if (e.castKind === 'bolt') e.casting = { name: '그림자 화살', t: 2, total: 2, interruptible: true, onDone: () => {
      const tg = e.target && e.target.alive ? e.target : nearest(aliveH(S), e); if (!tg) return;
      damage(S, e, tg, 150 * S.fs * (e.champ ? 1.3 : 1), 'bolt'); S.stats.missed['그림자 화살'] = (S.stats.missed['그림자 화살'] || 0) + 1;
      fx(S, { type: 'bolt', x: e.x, y: e.y, x2: tg.x, y2: tg.y, color: 'shadow', life: 0.3 }); } };
    else if (e.castKind === 'mend') e.casting = { name: '부패한 치유', t: 2.5, total: 2.5, interruptible: true, onDone: () => {
      const tg = activeE(S).sort((a, b) => pct(a) - pct(b))[0]; if (!tg) return;
      tg.hp = Math.min(tg.maxHp, tg.hp + 340 * S.fs); S.stats.menderHeals++; S.stats.missed['부패한 치유'] = (S.stats.missed['부패한 치유'] || 0) + 1;
      fx(S, { type: 'num', x: tg.x, y: tg.y - tg.r - 10, text: '+' + Math.round(340 * S.fs), color: 'eheal', life: 0.9 }); } };
    else { const tg = pick(hs); damage(S, e, tg, e.atk, 'hit'); tg.poison = 10; tg.poisonDps = 24 * S.fs; fx(S, { type: 'bolt', x: e.x, y: e.y, x2: tg.x, y2: tg.y, color: 'poison', life: 0.3 }); }
    return;
  }
  const arrived = canMove ? goTo(S, e, t.x, t.y, e.range + t.r - 4) : dist(e, t) <= e.range + t.r;
  if (arrived) { e.atkT -= DT; if (e.atkT <= 0) { e.atkT = e.atkRate; damage(S, e, t, e.atk * mult, 'hit'); } }
}

function bossMechanics(S, b) {
  const T = b.timers, M = S.bossMult(b);
  b.engageT += DT;
  for (const k in T) T[k] -= DT;
  if (b.strikeWarn > 0) b.strikeWarn -= DT;
  if (!b.enraged && b.engageT > 150) { b.enraged = true; S.stats.enraged = true; log(S, '고르바크가 광폭화합니다!', 'death'); }
  if (!b.addsDone && pct(b) < 0.5) {
    b.addsDone = true;
    for (const a of [-1, 1]) { let x = b.x + a * 110, y = b.y - 60; if (blocked(S, x, y, 12)) { x = b.x; y = b.y; } const m = makeMob('add', x, y, false, b.pack, S.fs); m.active = true; S.enemies.push(m); }
    log(S, '고르바크: 돌 정령 2마리 소환', 'warn');
  }
  if (T.strike <= 2 && T.strike > 0 && !(b.strikeWarn > 0)) { b.strikeWarn = 2; log(S, '고르바크가 「대지 강타」를 준비합니다', 'warn'); }
  if (T.strike <= 0) {
    T.strike = 14; const t = b.target;
    if (t && t.alive) { S.stats.busterHits++; if (!(t.buffs.wall > 0)) S.stats.busterRaw++; let strikeAmt = 640 * M; if (hasGearSkill(S, t, 'g_strike_guard')) strikeAmt *= 0.75; damage(S, b, t, strikeAmt, 'strike'); S.ev.push({ t: 'shake', m: 7 }); fx(S, { type: 'ring', x: t.x, y: t.y, r: 30, color: 'boss', life: 0.5 }); }
  }
  if (T.pool <= 0) {
    T.pool = 8; const hs = aliveH(S).filter(h => h.role !== 'tank'); const tg = pick(hs.length ? hs : aliveH(S));
    if (tg) S.pools.push({ x: tg.x, y: tg.y, r: 42, t: 9, warn: 1 });
  }
  if (T.blast <= 0 && !b.casting) {
    T.blast = 20; S.stats.explosionsTotal++;
    b.casting = { name: '암흑 폭발', t: 3, total: 3, interruptible: true, onDone: () => {
      S.stats.explosions++; log(S, '「암흑 폭발」이 터졌습니다!', 'death');
      aliveH(S).forEach(h => damage(S, b, h, 360 * M, 'blast')); S.ev.push({ t: 'shake', m: 11 });
      fx(S, { type: 'ring', x: b.x, y: b.y, r: 260, color: 'shadow', life: 0.7 }); } };
  }
}

// ---------- 궁극기 ----------
function useUlt(S, role) {
  const h = S.heroes.find(x => x.role === role);
  if (!h || !h.alive || h.ult < 100 || !S.inCombat || S.phase !== 'explore') return false;
  const st = h.stage || 0;
  const U = ultOf(role, st);
  h.ult = 0; S.stats.ultsUsed++;
  if (role === 'tank') {
    S.partyDR = 5 + st; if (st >= 1) h.absorb = Math.max(h.absorb, 200 * h.pow);
    if (st >= 2) activeE(S).forEach(e => addThreat(S, h, e, 800));
    fx(S, { type: 'ring', x: h.x, y: h.y, r: 200 + st * 20, color: 'tank', life: 0.8 });
  }
  if (role === 'healer') {
    const amt = 450 + st * 75;
    aliveH(S).forEach(x => { heal(S, h, x, amt); if (st >= 1) x.buffs.regen = Math.max(x.buffs.regen || 0, 4); if (st >= 2) x.absorb = Math.max(x.absorb, 180 * h.pow); });
    fx(S, { type: 'ring', x: h.x, y: h.y, r: 220, color: 'heal', life: 0.8 });
  }
  if (role === 'mage') activeE(S).forEach(e => {
    damage(S, h, e, 600 + st * 150, 'ult'); if (st >= 1) e.slow = Math.max(e.slow, 3); if (st >= 2) e.poison = Math.max(e.poison || 0, 5);
    fx(S, { type: 'ring', x: e.x, y: e.y, r: 34, color: 'mage', life: 0.6 });
  });
  if (role === 'rogue') { h.buffs.storm = 6 + st; if (st >= 1) h.crit = Math.min(0.9, h.crit + 0.1); }
  if (role === 'hunter') activeE(S).forEach(e => {
    damage(S, h, e, 420 + st * 115, 'ult'); if (st >= 1) e.slow = Math.max(e.slow, 2.5); if (st >= 2 && !e.boss) e.root = Math.max(e.root, 1.5);
    fx(S, { type: 'sk', id: 'shot', role, x: h.x, y: h.y, tx: e.x, ty: e.y, life: 0.55 });
  });
  fx(S, { type: 'sk', id: 'ult', role, x: h.x, y: h.y, life: 1.1 });
  S.ev.push({ t: 'ult', role, name: U.name });
  log(S, `${h.name}: ${U.name}!`, 'ult');
  return true;
}

// ---------- 메인 스텝 ----------
function step(S) {
  if (S.phase === 'win' || S.phase === 'lose' || S.phase === 'pick') return;
  S.t += DT;
    if (S.partyDR > 0) S.partyDR -= DT;
  const wasCombat = S.inCombat;
  S.inCombat = activeE(S).length > 0;
  if (wasCombat && !S.inCombat) {
    S.pools = []; S.zones = [];
    for (const h of S.heroes) { h.casting = null; h.moveTo = null; if (!h.alive) { h.alive = true; h.hp = h.maxHp * 0.3; log(S, `${h.name} 부활 (전투 종료)`, 'room'); } }
  }

  for (const p of S.pools) {
    if (p.warn > 0) { p.warn -= DT; continue; }
    p.t -= DT;
    for (const h of aliveH(S)) if (Math.hypot(h.x - p.x, h.y - p.y) < p.r + h.r * 0.5) damage(S, null, h, 120 * S.bossMult() * DT, 'pool');
  }
  S.pools = S.pools.filter(p => p.t > 0);
  for (const z of S.zones) {
    z.t -= DT;
    if (z.sanctum) { for (const h of aliveH(S)) if (Math.hypot(h.x - z.x, h.y - z.y) < z.r) h.buffs.sanctum = 0.2; }
    else if (z.hot) { for (const e of activeE(S)) if (Math.hypot(e.x - z.x, e.y - z.y) < z.r) damage(S, z.src, e, 70 * DT, 'tick'); }
    else { for (const e of activeE(S)) if (Math.hypot(e.x - z.x, e.y - z.y) < z.r) { damage(S, z.src, e, 55 * DT, 'tick'); e.slow = 0.5; } }
  }
  S.zones = S.zones.filter(z => z.t > 0);

  if (S.autoUlt && S.inCombat) {
    const bb = boss(S);
    if ((bb && bb.active && bb.alive) || activeE(S).length >= 4) for (const r of ROLE_ORDER) useUlt(S, r);
  }
  const hs = aliveH(S);
  const leader = tankOf(S) || hs[0];
  for (const h of S.heroes) {
    if (!h.alive) continue;
    heroTick(S, h); if (!h.alive) continue;
    if (S.inCombat) heroCombat(S, h);
    else heroExplore(S, h, leader, S.heroes.indexOf(h));
  }
  for (const e of S.enemies) if (e.alive) enemyTick(S, e);

  // 줍기
  for (const d of S.drops) { d.t += DT; if (!S.inCombat && (hs.some(h => dist(h, d) < 34) || d.t > 25)) { d.taken = true; pickUp(S, d); } }
  S.drops = S.drops.filter(d => !d.taken);

  // 겹침 방지
  const all = [...aliveH(S), ...S.enemies.filter(e => e.alive && e.active)];
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
    const a = all[i], b = all[j]; if (a.team === 'hero' && b.team === 'hero') continue; const d = dist(a, b), m = a.r + b.r;
    if (d > 0 && d < m) { const k = (m - d) / d / 2, dx = (b.x - a.x) * k, dy = (b.y - a.y) * k;
      if (!a.boss) slide(S, a, -dx, -dy); if (!b.boss) slide(S, b, dx, dy); }
  }
  if (S.t % 0.25 < DT) reveal(S);
  for (const e of S.enemies) if (e.flash > 0) e.flash -= DT;
  for (const f of S.fx) f.age += DT; S.fx = S.fx.filter(f => f.age < f.life);

  const b = boss(S);
  if (!aliveH(S).length) {
    S.phase = 'lose'; S.stats.bossHp = b && b.active ? pct(b) : null; S.result = analyze(S, false); log(S, '파티 전멸', 'death');
  } else if (b && !b.alive && !S.inCombat && !S.drops.length) {
    S.winT += DT; if (S.winT > 1) {
      S.phase = 'win';
      S.P.maxFloor = Math.max(S.P.maxFloor, S.floor + 1);
      if (S.worldId) S.P.cleared = Math.max(S.P.cleared || 0, S.worldId);
      S.result = analyze(S, true); log(S, '스테이지 클리어!', 'good');
    }
  } else if (!S.inCombat && S.phase === 'explore') {
    const blk = S.blocks[S.floorI];
    if (blk && !blk.cleared && !S.inCombat) {
      // 현재 seg 팩 클리어 → 다음 전투방 개방
      const curSeg = S.segI || 0;
      const segAlive = S.enemies.some(e => e.alive && enemySeg(S, e) === curSeg);
      const segHad = S.packs.some(p => p.seg === curSeg);
      if (segHad && !segAlive) {
        const maxSeg = Math.max(0, ...S.packs.map(p => p.seg != null ? p.seg : 0));
        if (curSeg < maxSeg) {
          S.segI = curSeg + 1;
          log(S, `전투방 ${S.segI + 1} 개방`, 'room');
        }
      }
      if (floorCleared(S)) {
        if (blk.boss) { /* 보스는 win 조건이 처리 */ }
        else {
          const casters = S.enemies.filter(e => e.castKind).length;
          S._pickBiasCaster = casters >= 2;
          offerAugments(S);
        }
      }
    }
  }
}

// ---------- 결과 분석 ----------
function analyze(S, win) {
  const st = S.stats, tips = [], C = S.cfg;
  const has = (r, id, cond) => C[r].on[id] && (!cond || C[r].cond[id] === cond);
  const gl = st.gearAtBoss != null ? st.gearAtBoss : gearLevel(S.gear);
  const cp = st.cpAtBoss != null ? st.cpAtBoss : partyCP(S.P), rec = recCP(S.floor);
  let cpTip = null;
  if (!win && st.bossReached && cp < rec) cpTip = ({ sev: cp < rec * 0.85 ? 'bad' : 'warn', title: `전투력 부족: ${cp.toLocaleString()} / 권장 ${rec.toLocaleString()}`,
    fix: `확실한 장비는 보스입니다. 잡몹 드랍은 극악이라 기대로 두면 안 됩니다. 메타 장비는 장비 화면에서 장착·강화하세요${S.floor > 1 ? '. 또는 아래 층에서 성장하세요' : ''}.` });
  if (cpTip && cpTip.sev === 'bad') tips.push(cpTip);
  const ups = S.P.bag.filter(it => isUpgrade(S.P, it)).length;
  if (!win && ups) tips.unshift({ sev: 'bad', title: `가방에 더 좋은 장비 ${ups}개`, fix: '장비 화면에서 장착하세요. 「최적 장착」 버튼을 누르면 영웅별로 가장 좋은 장비를 한 번에 낍니다.' });
  if (!win && !st.bossReached && cp < rec * 0.9) tips.push({ sev: 'bad', title: `보스 전에 전멸 (전투력 ${cp.toLocaleString()} / 권장 ${rec.toLocaleString()})`, fix: '이 층은 아직 버겁습니다. 아래 층에서 성장한 뒤 다시 오세요.' });
  if (st.explosions > 0) tips.push({ sev: 'bad', title: `「암흑 폭발」 차단 실패 ${st.explosions}/${st.explosionsTotal}회`, fix: has('rogue', 'kick') ? '도적의 「발차기」를 맨 위로 올리세요. 전사의 「방패 강타」를 「근처 적 시전」 조건으로 두면 두 번째 차단 수단이 됩니다.' : '도적의 「발차기」가 꺼져 있습니다.' });
  if (st.busterRaw > 0) tips.push({ sev: 'bad', title: `「대지 강타」를 맨몸으로 ${st.busterRaw}/${st.busterHits}회 받음`, fix: has('tank', 'wall', 'strike') ? '「방패의 벽」 순서를 위로 올리세요.' : '전사 「방패의 벽」 조건을 「보스가 대지 강타 준비」로 바꿔 보세요. 치유사 「보호막」도 같은 조건을 고를 수 있습니다.' });
  const pool = Object.entries(st.poolDmg).filter(([, v]) => v > 150).sort((a, b) => b[1] - a[1]);
  if (pool.length) tips.push({ sev: 'warn', title: `바닥 장판 피해: ${pool.map(([r, v]) => ROLE_INFO[r].name + ' ' + Math.round(v)).join(', ')}`, fix: '해당 영웅의 「장판 회피」를 켜세요. 마법사는 「점멸」 조건을 「장판 위」로 바꾸는 방법도 있습니다.' });
  if ((st.missed['부패한 치유'] || 0) >= 3) tips.push({ sev: 'warn', title: `적 치유사가 ${st.missed['부패한 치유']}번 치유 성공`, fix: '도적·마법사의 공격 대상을 「시전형 적 우선」으로 바꿔 보세요.' });
  if (st.poisonDmg > 600) tips.push({ sev: 'warn', title: `독 피해 ${Math.round(st.poisonDmg)}`, fix: '치유사 「정화」 순서를 올리세요.' });
  if (st.oom > 10) tips.push({ sev: 'warn', title: `치유사 마나 바닥 ${Math.round(st.oom)}초`, fix: '「빠른 치유」 조건을 「50% 이하」로 바꾸거나 「치유의 비」 조건을 높여 마나를 아끼세요.' });
  if (st.enraged) tips.push({ sev: 'bad', title: '보스 광폭화 (150초 초과)', fix: '딜이 부족합니다. 무기 장비를 맞추고, 마법사·도적 궁극기를 보스에 쓰세요.' });
  if (!win && st.ultsUsed === 0) tips.push({ sev: 'info', title: '궁극기를 쓰지 않음', fix: '영웅 카드의 궁극기 버튼이 차면 탭해서 발동하세요.' });
  if (cpTip && cpTip.sev === 'warn') tips.push(cpTip);
  if (win && !tips.length) tips.push({ sev: 'good', title: '깔끔한 공략', fix: '다른 강화 조합으로 다시 도전해 보세요.' });
  return { win, time: S.t, deaths: st.deaths, tips, bossHp: st.bossHp, bossReached: st.bossReached, interrupts: st.interrupts,
    kills: st.kills, loot: st.loot, equipped: st.equipped, gear: gearLevel(S.gear), gearAtBoss: gl, cpAtBoss: st.cpAtBoss, cp: partyCP(S.P), rec, floor: S.floor, run: S.run, lvl: S.P.lvl,
    augments: (S.augments || []).slice(), nBlocks: S.nFloors || S.nBlocks, blockI: S.floorI, floorI: S.floorI, nFloors: S.nFloors };
}

if (typeof module !== 'undefined' && module.exports) module.exports = { STATS, statText, partyBonus, heroMults, AFFIXES, TUNE, AUGMENTS, hasAug, offerAugments, applyAugment, applyRunBuffs, newProgress, migrateProgress, equipItem, unequipItem, sellItem, sellJunk, bestEquip, isUpgrade, BAG_MAX, heroCP, partyCP, recCP, enhance, enhCost, ENH_MAX, setRecBase: v => { REC_BASE = v; }, createGame, step, useUlt, defaultConfig, emptyGear, gearLevel, ROLE_ORDER, DT, BOSS_REC, makeItem, itemScore, SLOTS, TEST_DUNGEONS, WORLD_STAGES, worldStageById, STAGE_NEED, STAGE_NAME, evolveHero, canEvolve, effectiveStage, roleName, ultOf, skillsForStage, defaultLoadout, activeCap, seedTestGear, ensureRoles, NFLOORS, RARITY, ARMOR_CLASS, ARMOR_CLASS_NAME, GEAR_SKILLS, DROP_WEIGHTS, rollRarity, loadFloor, advanceFloor, floorCleared };

