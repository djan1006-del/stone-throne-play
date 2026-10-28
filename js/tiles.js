// 타일·테마 플레이스홀더. Unity Tilemap / 브롤급 아틀라스 교체 시 ID만 유지하면 됨.
// ASSET: assets/tiles/{themeId}/{tileId}_{variant}.png
// block: true 면 칸을 막는다. draw 키는 캔버스 자리표시자. 에셋은 assets/props/{id}.png 로 교체.
// block 는 나중 충돌용. 지금은 전부 통과. 기둥에 막히면 자동 이동이 복도에서 멈춘다.
const PROP_DEF = {
  p_stalag:  { name: '종유석', block: false, draw: 'stalag' },
  p_rubble:  { name: '바위더미', block: false, draw: 'rubble' },
  p_crate:   { name: '나무상자', block: false, draw: 'crate' },
  p_barrel:  { name: '나무통', block: false, draw: 'barrel' },
  p_pillar:  { name: '석주', block: false, draw: 'pillar' },
  p_urn:     { name: '항아리', block: false, draw: 'urn' },
  p_crystal: { name: '수정', block: false, draw: 'crystal' },
  p_altar:   { name: '제단', block: false, draw: 'altar' },
  p_torch:   { name: '횃불', block: false,   draw: 'torch' },
  p_bones:   { name: '해골', block: false,   draw: 'bones' },
  p_mushroom:{ name: '버섯', block: false,   draw: 'shroom' },
  p_banner:  { name: '깃발', block: false,   draw: 'banner' },
  p_chain:   { name: '사슬', block: false,   draw: 'chain' },
  p_spike:   { name: '바닥가시', block: false, draw: 'spike' },
  d_moss:    { name: '이끼', block: false,   draw: 'moss' },
  d_crack:   { name: '균열', block: false,   draw: 'crack' },
  d_web:     { name: '거미줄', block: false, draw: 'web' },
  d_puddle:  { name: '물웅덩이', block: false, draw: 'puddle' },
  d_arch:    { name: '아치 문양', block: false, draw: 'arch' },
  d_relief:  { name: '부조', block: false,   draw: 'relief' },
  d_glow:    { name: '심연 빛', block: false, draw: 'glow' },
  d_rift:    { name: '균열빛', block: false,  draw: 'rift' },
};
// 방마다 한 세트를 집어 분위기가 갈라지게. 막히는 소품은 모서리, 시작방은 막지 않음.
const ROOM_KITS = {
  grotto: [
    ['p_crate', 'p_torch', 'p_barrel', 'p_bones'],
    ['p_stalag', 'd_moss', 'p_bones', 'd_web', 'p_mushroom'],
    ['p_rubble', 'd_crack', 'd_puddle', 'p_mushroom', 'p_torch'],
  ],
  corridor: [
    ['p_pillar', 'p_banner', 'd_arch', 'd_relief'],
    ['p_urn', 'p_crate', 'p_torch', 'p_bones'],
    ['p_barrel', 'p_banner', 'd_relief', 'p_pillar'],
  ],
  abyss: [
    ['p_crystal', 'd_glow', 'p_chain', 'p_spike'],
    ['p_altar', 'd_rift', 'p_crystal', 'd_glow'],
    ['p_rubble', 'p_bones', 'p_chain', 'd_rift', 'p_spike'],
  ],
};
const BOSS_KIT = {
  grotto: ['p_altar', 'p_stalag', 'p_bones', 'p_torch', 'd_crack'],
  corridor: ['p_altar', 'p_pillar', 'p_banner', 'p_urn', 'd_arch'],
  abyss: ['p_altar', 'p_crystal', 'd_rift', 'd_glow', 'p_chain'],
};
const TILE_THEMES = {
  grotto:  { name: '석굴', floor: ['f_stone_a', 'f_stone_b', 'f_gravel'], wall: ['w_rock_a', 'w_rock_b'], prop: ['p_stalag', 'p_crate', 'p_torch'], deco: ['d_crack', 'd_moss'] },
  corridor:{ name: '회랑', floor: ['f_tile_a', 'f_tile_b', 'f_rune'], wall: ['w_brick_a', 'w_brick_b'], prop: ['p_pillar', 'p_banner', 'p_urn'], deco: ['d_arch', 'd_relief'] },
  abyss:   { name: '심연', floor: ['f_void_a', 'f_void_b', 'f_obsidian'], wall: ['w_void_a', 'w_crystal'], prop: ['p_crystal', 'p_altar', 'p_chain'], deco: ['d_glow', 'd_rift'] },
};
const THEME_BY_DUNGEON = { base: 'grotto', evo: 'corridor', awk: 'abyss' };

function mulberry32(a) {
  return function () {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * 원본 genMap과 같은 길이의 지그재그 다방 맵.
 * - 일반 층: 시작 + 전투방 5 (원본 5~6블럭 분량)
 * - 보스 층: 시작 + 전투방 2 + 보스방
 * seed만 바꾸면 방 배치·타일 변주.
 */
function genFloorMap(opts) {
  opts = opts || {};
  const seed = opts.seed != null ? opts.seed : (Date.now() % 1e9);
  const rndf = mulberry32(seed);
  const rndn = n => Math.floor(rndf() * n);
  const themeId = opts.themeId || 'grotto';
  const theme = TILE_THEMES[themeId] || TILE_THEMES.grotto;
  const bossFloor = !!opts.boss;
  const MW = opts.MW || 44, MH = opts.MH || 44;

  // 원본 규모: 일반 5전투, 보스층은 2전투+보스
  const combatN = bossFloor ? 2 : 5;
  const totalRooms = combatN + 2; // start + combat(+boss)
  const g = Array.from({ length: MH }, () => Array(MW).fill(0));
  const tileIds = Array.from({ length: MH }, () => Array(MW).fill(null));
  const propIds = Array.from({ length: MH }, () => Array(MW).fill(null));
  const inRoom = Array.from({ length: MH }, () => Array(MW).fill(-1));
  const hall = Array.from({ length: MH }, () => Array(MW).fill(0));
  const rooms = [];

  const perRow = 4;
  const rw = 7, rh = 7, bossW = 10, bossH = 10;
  // 시드에 따른 살짝의 오프셋으로 같은 던전도 다르게
  const padX = 2 + rndn(2), padY = 2 + rndn(2);
  const stepX = rw + 3, stepY = rh + 4;

  for (let i = 0; i < totalRooms; i++) {
    const isBoss = bossFloor && i === totalRooms - 1;
    const isStart = i === 0;
    const row = Math.floor(i / perRow), colIn = i % perRow;
    const col = row % 2 === 0 ? colIn : (perRow - 1 - colIn);
    // 방 크기 약간 변주
    const jitter = rndn(2);
    const w = isBoss ? bossW : rw + (jitter === 0 ? 0 : 1);
    const h = isBoss ? bossH : rh + (rndn(2) === 0 ? 0 : 1);
    const r = {
      w, h, boss: isBoss, start: isStart,
      // seg: 층 안 진행 순서 (시작=-1, 전투 0.., 보스=combatN)
      seg: isStart ? -1 : (isBoss ? combatN : i - 1),
      x: Math.max(1, Math.min(MW - w - 1, padX + col * stepX + (rndn(3) - 1))),
      y: Math.max(1, Math.min(MH - h - 1, padY + row * stepY + (rndn(3) - 1))),
    };
    r.cx = Math.floor(r.x + r.w / 2);
    r.cy = Math.floor(r.y + r.h / 2);
    rooms.push(r);
  }

  rooms.forEach((r, ri) => {
    for (let j = r.y; j < r.y + r.h; j++) {
      for (let i = r.x; i < r.x + r.w; i++) {
        if (j < 0 || i < 0 || j >= MH || i >= MW) continue;
        g[j][i] = 1;
        tileIds[j][i] = theme.floor[rndn(theme.floor.length)];
        inRoom[j][i] = ri;
      }
    }
  });

  const corridor = (a, b) => {
    const xs = Math.min(a.cx, b.cx), xe = Math.max(a.cx, b.cx);
    for (let i = xs; i <= xe; i++) {
      g[a.cy][i] = 1; tileIds[a.cy][i] = tileIds[a.cy][i] || theme.floor[rndn(theme.floor.length)]; hall[a.cy][i] = 1;
      if (a.cy + 1 < MH) { g[a.cy + 1][i] = 1; tileIds[a.cy + 1][i] = tileIds[a.cy + 1][i] || theme.floor[rndn(theme.floor.length)]; hall[a.cy + 1][i] = 1; }
    }
    const ys = Math.min(a.cy, b.cy), ye = Math.max(a.cy, b.cy);
    for (let j = ys; j <= ye; j++) {
      g[j][b.cx] = 1; tileIds[j][b.cx] = tileIds[j][b.cx] || theme.floor[rndn(theme.floor.length)]; hall[j][b.cx] = 1;
      if (b.cx + 1 < MW) { g[j][b.cx + 1] = 1; tileIds[j][b.cx + 1] = tileIds[j][b.cx + 1] || theme.floor[rndn(theme.floor.length)]; hall[j][b.cx + 1] = 1; }
    }
  };
  for (let i = 0; i < rooms.length - 1; i++) corridor(rooms[i], rooms[i + 1]);
  placeRoomDress(rooms, g, propIds, inRoom, hall, themeId, rndn, MW, MH);

  for (let i = 0; i < MW; i++) { g[0][i] = 0; g[MH - 1][i] = 0; tileIds[0][i] = null; tileIds[MH - 1][i] = null; propIds[0][i] = null; propIds[MH - 1][i] = null; }
  for (let j = 0; j < MH; j++) { g[j][0] = 0; g[j][MW - 1] = 0; tileIds[j][0] = null; tileIds[j][MW - 1] = null; propIds[j][0] = null; propIds[j][MW - 1] = null; }

  for (let j = 0; j < MH; j++) for (let i = 0; i < MW; i++) {
    if (g[j][i]) continue;
    const near = (j > 0 && g[j - 1][i]) || (j < MH - 1 && g[j + 1][i]) || (i > 0 && g[j][i - 1]) || (i < MW - 1 && g[j][i + 1]);
    if (near) tileIds[j][i] = theme.wall[rndn(theme.wall.length)];
  }

  return {
    g, rooms,
    boss: rooms[rooms.length - 1],
    start: rooms[0],
    tileIds, propIds, seed, themeId, theme,
    combatN, nFloors: opts.nFloors || 7,
  };
}

function placeRoomDress(rooms, g, propIds, inRoom, hall, themeId, rndn, MW, MH) {
  const kits = ROOM_KITS[themeId] || ROOM_KITS.grotto;
  const bossKit = BOSS_KIT[themeId] || BOSS_KIT.grotto;
  rooms.forEach((r, ri) => {
    const kit = r.boss ? bossKit : kits[(ri + rndn(kits.length)) % kits.length];
    const spots = [];
    for (let j = r.y; j < r.y + r.h; j++) for (let i = r.x; i < r.x + r.w; i++) {
      if (j <= 0 || i <= 0 || j >= MH - 1 || i >= MW - 1) continue;
      if (inRoom[j][i] !== ri || hall[j][i] || !g[j][i]) continue;
      if (Math.abs(i - r.cx) <= 1 || Math.abs(j - r.cy) <= 1) continue;
      const edge = i <= r.x + 1 || j <= r.y + 1 || i >= r.x + r.w - 2 || j >= r.y + r.h - 2;
      if (!edge) continue;
      spots.push([i, j]);
    }
    for (let k = spots.length - 1; k > 0; k--) {
      const s = rndn(k + 1);
      const tmp = spots[k]; spots[k] = spots[s]; spots[s] = tmp;
    }
    const want = r.start ? 2 : r.boss ? 5 : 2 + rndn(2);
    const used = [];
    let placed = 0;
    for (let s = 0; s < spots.length && placed < want; s++) {
      const i = spots[s][0], j = spots[s][1];
      const id = kit[rndn(kit.length)];
      const def = PROP_DEF[id];
      if (!def) continue;
      if (r.start && def.block) continue;
      if (def.block && used.some(p => Math.abs(p[0] - i) <= 1 && Math.abs(p[1] - j) <= 1)) continue;
      if (def.block && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => hall[j + dy] && hall[j + dy][i + dx])) continue;
      if (def.block) {
        g[j][i] = 0;
        if (!roomStaysOpen(r, ri, g, inRoom)) { g[j][i] = 1; continue; }
      }
      propIds[j][i] = id;
      used.push([i, j]);
      placed++;
    }
  });
}

function roomStaysOpen(r, ri, g, inRoom) {
  const seen = new Uint8Array(64 * 64);
  const q = [r.cy * 64 + r.cx];
  seen[q[0]] = 1;
  for (let qi = 0; qi < q.length; qi++) {
    const c = q[qi], x = c % 64, y = (c / 64) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < r.x || ny < r.y || nx >= r.x + r.w || ny >= r.y + r.h || !g[ny] || !g[ny][nx]) continue;
      const n = ny * 64 + nx;
      if (seen[n]) continue;
      seen[n] = 1;
      q.push(n);
    }
  }
  for (let j = r.y; j < r.y + r.h; j++) for (let i = r.x; i < r.x + r.w; i++) {
    if (inRoom[j][i] === ri && g[j][i] && !seen[j * 64 + i]) return false;
  }
  return true;
}

function tileColor(tileId, C) {
  if (!tileId) return C.void;
  if (tileId.startsWith('f_')) return C.floor;
  if (tileId.startsWith('w_')) return C.wall;
  if (tileId.startsWith('p_')) return C.grid;
  if (tileId.startsWith('d_')) return C.line;
  return C.floor;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TILE_THEMES, THEME_BY_DUNGEON, PROP_DEF, ROOM_KITS, genFloorMap, tileColor, mulberry32 };
}
