// 스킬트리 · 월드 스테이지
// 만렙 100 / 스테이지 10: 초반은 촘촘(약 8레벨), 진화(Lv30)는 4스테, 각성(Lv70)은 8스테에 닿게 벌림.
// 층 수: 낮은 스테 5~8, 높은 스테 7~10. 매 도전마다 그 범위에서 랜덤, 마지막 층이 보스.

const MAX_LEVEL = 100;
const activeCap = stage => 4 + (stage >= 1 ? 1 : 0) + (stage >= 2 ? 1 : 0);

const WORLD_STAGES = [
  { id: 1,  name: '세포 관문',   recLv: 1,  gear: 0, theme: 'grotto',   floorMin: 5, floorMax: 7,  blurb: '입문. 기본 장비.' },
  { id: 2,  name: '균열 회랑',   recLv: 8,  gear: 0, theme: 'grotto',   floorMin: 5, floorMax: 8,  blurb: '기본 구간.' },
  { id: 3,  name: '독소 갱도',   recLv: 16, gear: 0, theme: 'grotto',   floorMin: 6, floorMax: 8,  blurb: '진화 직전.' },
  { id: 4,  name: '진화 전초',   recLv: 28, gear: 1, theme: 'corridor', floorMin: 6, floorMax: 9,  blurb: 'Lv30 진화 권장. 진화 장비.' },
  { id: 5,  name: '변이 실험실', recLv: 38, gear: 1, theme: 'corridor', floorMin: 6, floorMax: 9,  blurb: '진화 구간.' },
  { id: 6,  name: '항체 요새',   recLv: 48, gear: 1, theme: 'corridor', floorMin: 7, floorMax: 9,  blurb: '중반.' },
  { id: 7,  name: '심층 핵',     recLv: 58, gear: 1, theme: 'corridor', floorMin: 7, floorMax: 10, blurb: '각성 직전.' },
  { id: 8,  name: '각성 심연',   recLv: 70, gear: 2, theme: 'abyss',    floorMin: 7, floorMax: 10, blurb: 'Lv70 각성 권장. 각성 장비.' },
  { id: 9,  name: '군주 전야',   recLv: 82, gear: 2, theme: 'abyss',    floorMin: 8, floorMax: 10, blurb: '후반.' },
  { id: 10, name: '옥좌',        recLv: 92, gear: 2, theme: 'abyss',    floorMin: 8, floorMax: 10, blurb: '만렙 100 직전 최종.' },
];

function rollStageFloors(st) {
  const a = st.floorMin, b = st.floorMax;
  return a + Math.floor(Math.random() * (b - a + 1));
}

// actives: 앞에서 4 기본, 다음 2 진화, 마지막 2 각성. 전투 함수는 기존 SKILL id.
// passives: 트리 선택 + 해방 단계면 자동 적용 (슬롯 안 씀).
const TREE_SPEC = {
  tank: [
    { id: 'guard', name: '수호', blurb: '막기·위협', actives: ['taunt', 'wall', 'bash', 'clap', 'wave', 'vow', 'riposte', 'unbreak'],
      passives: [
        { id: 'tg_hp', name: '육중', tier: 0, desc: '체력 +8%', mods: { hp: 0.08 } },
        { id: 'tg_dr', name: '판금 숙련', tier: 0, desc: '피해 감소 +4%', mods: { dr: 0.04 } },
        { id: 'tg_pow', name: '방패 압박', tier: 1, desc: '공격력 +6%', mods: { pow: 0.06 } },
        { id: 'tg_end', name: '불굴의 심장', tier: 2, desc: '체력 +10%', mods: { hp: 0.1 } },
      ] },
    { id: 'rush', name: '돌격', blurb: '들이치기', actives: ['bash', 'clap', 'taunt', 'wall', 'wave', 'riposte', 'unbreak', 'vow'],
      passives: [
        { id: 'tr_pow', name: '돌진', tier: 0, desc: '공격력 +8%', mods: { pow: 0.08 } },
        { id: 'tr_haste', name: '질주', tier: 0, desc: '가속 +6%', mods: { haste: 0.06 } },
        { id: 'tr_crit', name: '강타 숙련', tier: 1, desc: '치명 +4%p', mods: { crit: 0.04 } },
        { id: 'tr_exe', name: '파쇄', tier: 2, desc: '공격력 +10%', mods: { pow: 0.1 } },
      ] },
    { id: 'oath', name: '서약', blurb: '아군 보호', actives: ['wall', 'vow', 'taunt', 'bash', 'wave', 'unbreak', 'clap', 'riposte'],
      passives: [
        { id: 'to_dr', name: '서약의 갑', tier: 0, desc: '피해 감소 +6%', mods: { dr: 0.06 } },
        { id: 'to_hp', name: '수호 체질', tier: 0, desc: '체력 +6%', mods: { hp: 0.06 } },
        { id: 'to_cdr', name: '빠른 방벽', tier: 1, desc: '쿨감 +6%', mods: { cdr: 0.06 } },
        { id: 'to_thorn', name: '가시 서약', tier: 2, desc: '반사 +8%', mods: { thorns: 0.08 } },
      ] },
  ],
  healer: [
    { id: 'grace', name: '은총', blurb: '단일 치유', actives: ['flash', 'bubble', 'dispel', 'rain', 'bond', 'well', 'sanctum', 'revive'],
      passives: [
        { id: 'hg_heal', name: '손길', tier: 0, desc: '치유 +10%', mods: { heal: 0.1 } },
        { id: 'hg_mana', name: '맑은 마나', tier: 0, desc: '마나 재생 +12%', mods: { mana: 0.12 } },
        { id: 'hg_cdr', name: '기도 숙련', tier: 1, desc: '쿨감 +5%', mods: { cdr: 0.05 } },
        { id: 'hg_end', name: '끝없는 찬가', tier: 2, desc: '치유 +12%', mods: { heal: 0.12 } },
      ] },
    { id: 'hymn', name: '찬가', blurb: '광역 치유', actives: ['rain', 'flash', 'bubble', 'dispel', 'sanctum', 'bond', 'well', 'revive'],
      passives: [
        { id: 'hh_heal', name: '화음', tier: 0, desc: '치유 +8%', mods: { heal: 0.08 } },
        { id: 'hh_hp', name: '생명력', tier: 0, desc: '체력 +8%', mods: { hp: 0.08 } },
        { id: 'hh_haste', name: '빠른 찬가', tier: 1, desc: '가속 +8%', mods: { haste: 0.08 } },
        { id: 'hh_dr', name: '성역 체질', tier: 2, desc: '피해 감소 +5%', mods: { dr: 0.05 } },
      ] },
    { id: 'ward', name: '수호성', blurb: '보호막·정화', actives: ['bubble', 'dispel', 'flash', 'rain', 'well', 'bond', 'revive', 'sanctum'],
      passives: [
        { id: 'hw_dr', name: '보호막 숙련', tier: 0, desc: '피해 감소 +5%', mods: { dr: 0.05 } },
        { id: 'hw_mana', name: '정화의 샘', tier: 0, desc: '마나 재생 +10%', mods: { mana: 0.1 } },
        { id: 'hw_hp', name: '버팀', tier: 1, desc: '체력 +10%', mods: { hp: 0.1 } },
        { id: 'hw_heal', name: '최후의 축복', tier: 2, desc: '치유 +10%', mods: { heal: 0.1 } },
      ] },
  ],
  mage: [
    { id: 'pyre', name: '화염', blurb: '단일 화력', actives: ['fire', 'bliz', 'nova', 'blink', 'overload', 'meteor', 'rift', 'rime'],
      passives: [
        { id: 'mp_pow', name: '화염 친화', tier: 0, desc: '공격력 +8%', mods: { pow: 0.08 } },
        { id: 'mp_crit', name: '점화', tier: 0, desc: '치명 +4%p', mods: { crit: 0.04 } },
        { id: 'mp_cdmg', name: '폭열', tier: 1, desc: '치명 피해 +15%', mods: { critDmg: 0.15 } },
        { id: 'mp_end', name: '태양핵', tier: 2, desc: '공격력 +10%', mods: { pow: 0.1 } },
      ] },
    { id: 'frost', name: '서리', blurb: '감속·광역', actives: ['bliz', 'nova', 'fire', 'blink', 'rime', 'meteor', 'overload', 'rift'],
      passives: [
        { id: 'mf_pow', name: '냉기', tier: 0, desc: '공격력 +6%', mods: { pow: 0.06 } },
        { id: 'mf_cdr', name: '순환', tier: 0, desc: '쿨감 +6%', mods: { cdr: 0.06 } },
        { id: 'mf_haste', name: '눈보라 숙련', tier: 1, desc: '가속 +8%', mods: { haste: 0.08 } },
        { id: 'mf_mana', name: '영구동토', tier: 2, desc: '마나 재생 +15%', mods: { mana: 0.15 } },
      ] },
    { id: 'void', name: '공허', blurb: '생존·점멸', actives: ['blink', 'nova', 'fire', 'bliz', 'rift', 'rime', 'overload', 'meteor'],
      passives: [
        { id: 'mv_dr', name: '위상', tier: 0, desc: '피해 감소 +5%', mods: { dr: 0.05 } },
        { id: 'mv_move', name: '잔상', tier: 0, desc: '이속 +8%', mods: { move: 0.08 } },
        { id: 'mv_pow', name: '균열 학', tier: 1, desc: '공격력 +8%', mods: { pow: 0.08 } },
        { id: 'mv_hp', name: '공허 육신', tier: 2, desc: '체력 +12%', mods: { hp: 0.12 } },
      ] },
  ],
  rogue: [
    { id: 'blade', name: '칼날', blurb: '단일 암살', actives: ['evis', 'kick', 'fan', 'vanish', 'poison', 'mark', 'clone', 'smoke'],
      passives: [
        { id: 'rb_pow', name: '예리', tier: 0, desc: '공격력 +8%', mods: { pow: 0.08 } },
        { id: 'rb_crit', name: '급소', tier: 0, desc: '치명 +5%p', mods: { crit: 0.05 } },
        { id: 'rb_cdmg', name: '절개 숙련', tier: 1, desc: '치명 피해 +20%', mods: { critDmg: 0.2 } },
        { id: 'rb_lee', name: '피맛', tier: 2, desc: '흡혈 +4%', mods: { leech: 0.04 } },
      ] },
    { id: 'shadow', name: '그림자', blurb: '생존·교란', actives: ['vanish', 'kick', 'smoke', 'evis', 'clone', 'fan', 'poison', 'mark'],
      passives: [
        { id: 'rs_dr', name: '잔영', tier: 0, desc: '피해 감소 +5%', mods: { dr: 0.05 } },
        { id: 'rs_move', name: '발소리 없음', tier: 0, desc: '이속 +10%', mods: { move: 0.1 } },
        { id: 'rs_haste', name: '암전', tier: 1, desc: '가속 +8%', mods: { haste: 0.08 } },
        { id: 'rs_hp', name: '밤의 체력', tier: 2, desc: '체력 +10%', mods: { hp: 0.1 } },
      ] },
    { id: 'venom', name: '독', blurb: '지속 피해', actives: ['poison', 'fan', 'evis', 'kick', 'mark', 'smoke', 'vanish', 'clone'],
      passives: [
        { id: 'rv_pow', name: '독날', tier: 0, desc: '공격력 +6%', mods: { pow: 0.06 } },
        { id: 'rv_haste', name: '연속 베기', tier: 0, desc: '가속 +8%', mods: { haste: 0.08 } },
        { id: 'rv_crit', name: '중독', tier: 1, desc: '치명 +4%p', mods: { crit: 0.04 } },
        { id: 'rv_lee', name: '부식', tier: 2, desc: '흡혈 +5%', mods: { leech: 0.05 } },
      ] },
  ],
  hunter: [
    { id: 'mark', name: '저격', blurb: '단일 사격', actives: ['shot', 'focus', 'volley', 'disengage', 'pierce', 'beast', 'field', 'trap'],
      passives: [
        { id: 'hk_pow', name: '조준', tier: 0, desc: '공격력 +8%', mods: { pow: 0.08 } },
        { id: 'hk_crit', name: '급소 사격', tier: 0, desc: '치명 +5%p', mods: { crit: 0.05 } },
        { id: 'hk_cdmg', name: '관통탄', tier: 1, desc: '치명 피해 +18%', mods: { critDmg: 0.18 } },
        { id: 'hk_end', name: '일격', tier: 2, desc: '공격력 +10%', mods: { pow: 0.1 } },
      ] },
    { id: 'pack', name: '야생', blurb: '광역·동료', actives: ['volley', 'beast', 'shot', 'trap', 'pierce', 'field', 'focus', 'disengage'],
      passives: [
        { id: 'hp_pow', name: '무리', tier: 0, desc: '공격력 +6%', mods: { pow: 0.06 } },
        { id: 'hp_haste', name: '연사', tier: 0, desc: '가속 +8%', mods: { haste: 0.08 } },
        { id: 'hp_move', name: '추적', tier: 1, desc: '이속 +8%', mods: { move: 0.08 } },
        { id: 'hp_crit', name: '포식', tier: 2, desc: '치명 +5%p', mods: { crit: 0.05 } },
      ] },
    { id: 'trapper', name: '덫', blurb: '제어·후퇴', actives: ['trap', 'disengage', 'field', 'shot', 'volley', 'pierce', 'beast', 'focus'],
      passives: [
        { id: 'ht_cdr', name: '설치 숙련', tier: 0, desc: '쿨감 +6%', mods: { cdr: 0.06 } },
        { id: 'ht_dr', name: '엄폐', tier: 0, desc: '피해 감소 +5%', mods: { dr: 0.05 } },
        { id: 'ht_move', name: '후퇴 보법', tier: 1, desc: '이속 +10%', mods: { move: 0.1 } },
        { id: 'ht_hp', name: '야영', tier: 2, desc: '체력 +12%', mods: { hp: 0.12 } },
      ] },
  ],
};

function expandTree(role, spec) {
  const actives = spec.actives.map((id, i) => ({
    id, kind: 'active', tier: i < 4 ? 0 : i < 6 ? 1 : 2,
  }));
  const passives = spec.passives.map(p => Object.assign({ kind: 'passive' }, p));
  return { id: spec.id, role, name: spec.name, blurb: spec.blurb, actives, passives };
}
const TREES = {};
for (const role of Object.keys(TREE_SPEC)) TREES[role] = TREE_SPEC[role].map(s => expandTree(role, s));

function treeOf(P, role) {
  const list = TREES[role] || [];
  const id = P && P.trees && P.trees[role];
  return list.find(t => t.id === id) || list[0] || null;
}
function treeActives(P, role, stage) {
  const t = treeOf(P, role); if (!t) return [];
  return t.actives.filter(a => a.tier <= (stage || 0));
}
function treePassives(P, role, stage) {
  const t = treeOf(P, role); if (!t) return [];
  return t.passives.filter(p => p.tier <= (stage || 0));
}
function passiveMods(P, role, stage) {
  const o = {};
  for (const p of treePassives(P, role, stage)) {
    for (const [k, v] of Object.entries(p.mods || {})) o[k] = (o[k] || 0) + v;
  }
  return o;
}
function defaultTreeIds() {
  const o = {};
  for (const role of Object.keys(TREES)) o[role] = TREES[role][0].id;
  return o;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MAX_LEVEL, WORLD_STAGES, TREES, activeCap, rollStageFloors, treeOf, treeActives, treePassives, passiveMods, defaultTreeIds };
}
