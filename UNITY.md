# Unity MCP 이관 메모

웹 프로토타입 → Unity 전환 시 **ID를 그대로** 맞춘다.

## 타일
- 테마: `grotto` | `corridor` | `abyss` (`js/tiles.js` `TILE_THEMES`)
- 런마다 `runSeed`, 층마다 `runSeed + floorI * 9973`
- 그리드: `tileIds[y][x]`, `propIds[y][x]` (문자열 ID)
- 에셋 경로 예: `assets/tiles/{theme}/{tileId}_{variant}.png`
- Unity: Tilemap + Rule Tile, 동일 ID로 ScriptableObject 매핑

## 영웅
- `role`: tank | healer | mage | rogue | hunter
- `stage`: 0 기본 / 1 진화 / 2 각성 → 스킨·이름·궁극기 인덱스
- 스킬 ID: `SKILLS[role][].id` (영구 해방은 stage만)
- 활성 로드아웃: `cfg[role].order` 길이 4

## 장비
- 등급: 0 기본 / 1 레어 / 2 에픽 / 3 전설 (`RARITY`)
- `armorClass`: plate | leather | cloth
- `gearSkill.id`: `g_*` (캐릭 액티브와 분리)
- `reqStage`: 0~2 장착 제한
- 드롭 가중: `DROP_WEIGHTS[dungeonId]`

## 런
- `nFloors = 7`, `floorI` 0..6
- 1~6층 클리어 → `AUGMENTS` 3택1 (런만)
- 7층 보스 → 장비 드롭
- JSON 상태: heroes, floorI, augments, dungeon.id, runSeed

## 화면
- 홈 / 영웅(트리) / 장비 / 전투 / 기록 — 하단 탭과 동일 정보 구조로 UI 이식
