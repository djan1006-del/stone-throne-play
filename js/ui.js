// 석굴 군주의 옥좌 — UI
// localStorage, 버튼, rAF 루프, 캔버스 드로우. 엔진 전역(createGame, step, TUNE 등)에 의존한다.
(() => {
  const ROLE_ICON = { tank: '탱', healer: '힐', mage: '법', rogue: '도', hunter: '냥' };
  const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
  let VW = 360, VH = 520, SC = 2;
  function fitCanvas() {
    const r = cv.getBoundingClientRect(); if (!r.width || !r.height) return;
    const dpr = Math.min(2.5, window.devicePixelRatio || 1);
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    VW = 360; VH = Math.max(300, Math.round(VW * r.height / r.width)); SC = cv.width / VW;
  }
  fitCanvas();
  try { new ResizeObserver(() => { fitCanvas(); }).observe(cv); } catch (e) { addEventListener('resize', fitCanvas); }
  const ICON = {
    taunt: '<circle cx="10" cy="10" r="8"/><path d="M10 5v6M10 14v.5"/>',
    bash: '<path d="M10 2l7 3v5c0 4-3 7-7 8-4-1-7-4-7-8V5z"/>',
    clap: '<path d="M11 2L4 11h5l-1 7 7-9h-5z"/>',
    wall: '<path d="M10 2l7 4v8l-7 4-7-4V6z"/><path d="M10 7v6M7 10h6"/>',
    flash: '<path d="M10 3v14M3 10h14"/>',
    rain: '<path d="M6 3l-2 5a2 2 0 004 0zM14 3l-2 5a2 2 0 004 0zM10 10l-2 5a2 2 0 004 0z"/>',
    bubble: '<circle cx="10" cy="10" r="7.5"/><path d="M6 8a4 4 0 013-3"/>',
    dispel: '<path d="M10 2v5M10 13v5M2 10h5M13 10h5M5 5l2.5 2.5M12.5 12.5L15 15M15 5l-2.5 2.5M7.5 12.5L5 15"/>',
    fire: '<path d="M10 18c-4 0-6-3-5-6 1-2 3-3 3-7 3 2 7 5 7 9 0 2-2 4-5 4z"/>',
    bliz: '<path d="M10 2v16M3 6l14 8M17 6L3 14M8 3l2 2 2-2M8 17l2-2 2 2"/>',
    nova: '<path d="M10 1l2 6 6-2-4 5 4 5-6-2-2 6-2-6-6 2 4-5-4-5 6 2z"/>',
    blink: '<path d="M2 10h3M7 10h3M12 10h1"/><path d="M13 6l4 4-4 4"/>',
    kick: '<circle cx="10" cy="10" r="7.5"/><path d="M5 5l10 10"/>',
    evis: '<path d="M4 4l12 12M16 4L4 16"/>',
    fan: '<path d="M10 10L3 5M10 10l7-5M10 10v8"/><circle cx="10" cy="10" r="2"/>',
    vanish: '<path d="M5 14a3 3 0 010-6 4 4 0 017-1 3 3 0 013 5z"/><path d="M4 17h12"/>',
    shot: '<path d="M3 10h12M13 6l4 4-4 4"/><path d="M4 7v6"/>',
    volley: '<path d="M2 6h9M9 3l4 3-4 3M2 14h9M9 11l4 3-4 3"/>',
    trap: '<path d="M3 12l7-8 7 8"/><path d="M5 12h10"/><path d="M7 12v4M13 12v4"/>',
    disengage: '<path d="M16 10H7M9 6L5 10l4 4"/><path d="M16 6v8"/>',
    wave: '<path d="M3 10c2-3 4-3 6 0s4 3 6 0"/><path d="M3 14c2-3 4-3 6 0s4 3 6 0"/>',
    vow: '<path d="M10 2l7 4v6c0 4-3 7-7 8-4-1-7-4-7-8V6z"/>',
    riposte: '<path d="M4 16L16 4M12 4h4v4"/>',
    unbreak: '<path d="M10 2l7 3v5c0 4-3 7-7 8-4-1-7-4-7-8V5z"/><path d="M7 10h6"/>',
    bond: '<path d="M7 10a3 3 0 116 0 3 3 0 11-6 0"/><path d="M4 10h3M13 10h3"/>',
    well: '<path d="M6 4h8v4a4 4 0 01-8 0z"/><path d="M10 12v5"/>',
    sanctum: '<path d="M3 17V9l7-5 7 5v8z"/>',
    revive: '<path d="M10 3v14M3 10h14"/><circle cx="10" cy="10" r="7"/>',
    overload: '<path d="M11 2L5 11h5l-1 7 7-9h-5z"/>',
    rime: '<path d="M10 2v16M4 6l12 8M16 6L4 14"/>',
    meteor: '<path d="M14 2l4 4-8 8-4 1 1-4z"/><circle cx="7" cy="15" r="3"/>',
    rift: '<path d="M4 4l5 5M11 11l5 5M16 4l-5 5M9 11L4 16"/>',
    poison: '<path d="M10 3c-3 4-5 6-5 9a5 5 0 0010 0c0-3-2-5-5-9z"/>',
    smoke: '<path d="M5 14a3 3 0 010-6 4 4 0 017-1 3 3 0 013 5z"/>',
    mark: '<circle cx="10" cy="10" r="7"/><path d="M10 5v5l3 3"/>',
    clone: '<path d="M6 6h8v10H6z"/><path d="M10 4v2M8 16h4"/>',
    pierce: '<path d="M2 10h16M14 6l4 4-4 4"/>',
    beast: '<path d="M4 12c2-6 10-6 12 0"/><circle cx="7" cy="9" r="1.5"/><circle cx="13" cy="9" r="1.5"/>',
    focus: '<circle cx="10" cy="10" r="6"/><circle cx="10" cy="10" r="2"/>',
    field: '<path d="M3 14l7-9 7 9z"/><path d="M5 14h10"/>',
  };
  const svgIcon = id => `<svg viewBox="0 0 20 20" aria-hidden="true">${ICON[id]}</svg>`;
  const FONT = '"IBM Plex Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
  const $ = id => document.getElementById(id);
  const fmt = n => Math.round(n).toLocaleString('ko-KR');
  let C = {};
  function readColors() { const cs = getComputedStyle(document.documentElement); for (const k of ['floor','grid','wall','void','unit','enemy','boss','ink','muted','line','panel','bg','tape','tank','healer','mage','rogue','hunter','champ','hurt','dmg','heal','good','shadow','poison','eheal','r0','r1','r2','r3','gold','crit']) C[k] = cs.getPropertyValue('--' + k).trim(); }
  readColors();
  try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', readColors); } catch (e) {}
  new MutationObserver(readColors).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // ---------- 저장 ----------
  const load = (k, f) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v || f(); } catch (e) { return f(); } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  function slotCap(st) { return 4 + (st >= 1 ? 1 : 0) + (st >= 2 ? 1 : 0); }
  function syncCfgToStages() {
    for (const r of ROLE_ORDER) {
      const st = (P.stages && P.stages[r]) || 0;
      const cap = slotCap(st);
      if (!cfg[r] || !cfg[r].order) cfg[r] = defaultLoadout(r, st);
      else {
        const unlocked = skillsForStage(r, st);
        for (const s of unlocked) {
          if (cfg[r].on[s.id] == null) cfg[r].on[s.id] = false;
          if (!cfg[r].cond[s.id]) cfg[r].cond[s.id] = s.conds[0][0];
        }
        cfg[r].order = cfg[r].order.filter(id => unlocked.some(s => s.id === id)).slice(0, cap);
        while (cfg[r].order.length < cap) {
          const next = unlocked.find(s => !cfg[r].order.includes(s.id));
          if (!next) break; cfg[r].order.push(next.id); cfg[r].on[next.id] = true;
        }
        for (const id of cfg[r].order) cfg[r].on[id] = true;
      }
    }
  }
  let cfg = load('dungeon7-cfg', () => load('dungeon6-cfg', () => load('dungeon2-cfg', defaultConfig)));
  let P = load('dungeon7-progress', () => migrateProgress(load('dungeon6-progress', () => migrateProgress(load('dungeon5-progress', () => null)))));
  if (!P || P.v < 7 || !P.bag) P = migrateProgress(P);
  P = ensureRoles(P);
  syncCfgToStages();
  const saveP = () => save('dungeon7-progress', P);
  const persistCfg = () => save('dungeon7-cfg', cfg);
  function nextStageId() { return Math.min(WORLD_STAGES.length, (P.cleared || 0) + 1); }
  function stageOpen(id) { return id >= 1 && id <= nextStageId(); }
  let worldId = nextStageId();
  let floor = worldId;
  let mode = 'hunt', speed = 2, running = false, acc = 0, last = 0, seenResult = false;
  let autoUlt = load('dungeon3-auto', () => false);
  let mapOpen = false;
  let holdMap = false;
  let S = createGame(cfg, P, floor, mode, worldId); S.autoUlt = autoUlt; floor = S.floor;
  const cam = { x: 0, y: 0 };
  let shake = 0;
  function snapCam() { const hs = S.heroes.filter(h => h.alive); cam.x = hs.reduce((s, h) => s + h.x, 0) / hs.length; cam.y = hs.reduce((s, h) => s + h.y, 0) / hs.length; }
  snapCam();

  // ---------- 성장 줄 ----------
  let shownCP = partyCP(P);
  function cpStatus(cp, rec) { return cp >= rec ? ['ok', '여유'] : cp >= rec * 0.85 ? ['mid', '적정'] : ['bad', '위험']; }
  function updateStrip() {
    const cp = partyCP(P);
    const recStage = worldStageById(S && S.t > 0 && S.phase === 'explore' ? S.worldId : nextStageId());
    const rec = recCP(recStage.diff || floor);
    shownCP += (cp - shownCP) * 0.15; if (Math.abs(cp - shownCP) < 1) shownCP = cp;
    $('cpNum').textContent = fmt(shownCP);
    const [cls, word] = cpStatus(cp, rec);
    $('cpRec').innerHTML = `권장 ${fmt(rec)} · <b class="${cls}">${word}</b>`;
    if ($('fNum')) { $('fNum').textContent = floor + '층'; $('fMax').textContent = '최고 ' + P.maxFloor + '층'; }
    const locked = S.t > 0 && (S.phase === 'explore' || S.phase === 'pick');
    if ($('fDown')) { $('fDown').disabled = floor <= 1 || locked; $('fUp').disabled = floor >= P.maxFloor || locked; }
    $('gold').textContent = fmt(P.gold) + ' G';
    $('lvl').textContent = 'Lv ' + P.lvl;
    $('xp').style.width = Math.min(100, P.xp / xpNeed(P.lvl) * 100) + '%';
    const blk = $('blkHud'); if (blk) {
      const nf = S.nFloors || S.nBlocks || 7;
      const fi = (S.floorI != null ? S.floorI : S.blockI) || 0;
      const name = S.dungeon ? S.dungeon.name : '';
      blk.textContent = `스테이지 ${S.worldId || 1} ${name} · ${Math.min(fi + 1, nf)}/${nf}층`;
    }
    if (typeof renderHome === 'function') renderHome();
    const chips = $('augHud');
    if (chips) chips.innerHTML = (S.augments || []).map(id => { const a = AUGMENTS.find(x => x.id === id); return a ? `<i title="${a.desc}">${a.name}</i>` : ''; }).join('');
  }
  function cpToast(d) {
    if (d <= 0) return; const el = $('cpToast'); el.textContent = '+' + fmt(d);
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  }
  function changeFloor(f) {
    floor = Math.max(1, Math.min(P.maxFloor, f)); save('dungeon3-floor', floor); newRun(false);
  }
  if ($('fDown')) $('fDown').onclick = () => changeFloor(floor - 1);
  if ($('fUp')) $('fUp').onclick = () => changeFloor(floor + 1);

  // ---------- 배너 ----------
  const bannerQ = []; let bannerBusy = false;
  function pushBanner(b) { if (bannerQ.length > 3) bannerQ.shift(); bannerQ.push(b); if (!bannerBusy) nextBanner(); }
  function nextBanner() {
    const b = bannerQ.shift(), el = $('banner');
    if (!b) { bannerBusy = false; el.hidden = true; return; }
    bannerBusy = true; el.style.setProperty('--bc', `var(--${b.color || 'tape'})`);
    el.querySelector('b').textContent = b.text; el.querySelector('span').textContent = b.sub || '';
    el.hidden = false; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
    setTimeout(nextBanner, 1500 / Math.max(1, speed / 1.5));
  }
  function consumeEvents() {
    for (const e of S.ev) {
      if (e.t === 'shake') shake = Math.max(shake, e.m);
      else if (e.t === 'banner') pushBanner(e);
      else if (e.t === 'cp') { cpToast(e.to - e.from); resetLooks(); }
      else if (e.t === 'loot') { updateEqBadge(); if (e.up) { const b = $('eqBtn'); if (b) { b.classList.remove('ping'); void b.offsetWidth; b.classList.add('ping'); } } }
      else if (e.t === 'ult') { ultFx = { role: e.role, name: e.name, t0: performance.now() }; shake = Math.max(shake, 5); }
      else if (e.t === 'pick') showPick();
    }
    S.ev.length = 0;
  }

  // ---------- 영웅 카드 ----------
  const cards = {}, party = $('party');
  function rebuildHeroCard(r) {
    const st = (P.stages && P.stages[r]) || 0;
    const U = ultOf(r, st);
    const order = ((cfg[r] && cfg[r].order) || defaultLoadout(r, st).order).slice(0, 6);
    const skillSlots = Array.from({ length: 6 }, (_, i) => {
      const id = order[i];
      const s = id ? skillById(r, id) : null;
      const gate = i < 4 ? 0 : i === 4 ? 1 : 2;
      const locked = st < gate;
      if (s) return `<div class="sk" data-id="${s.id}" title="${s.name}: ${s.desc}"><i></i>${svgIcon(s.id)}</div>`;
      const mark = gate === 0 ? '+' : gate === 1 ? '진' : '각';
      const tip = gate === 0 ? '빈 슬롯' : gate === 1 ? '진화 슬롯' : '각성 슬롯';
      return `<div class="sk empty${locked ? ' lock' : ''}" title="${tip}${locked ? ' · 잠김' : ''}">${mark}</div>`;
    }).join('');
    let el = cards[r] && cards[r].el;
    if (!el) { el = document.createElement('div'); el.className = 'hero'; party.appendChild(el); }
    el.style.setProperty('--rc', `var(--${r})`);
    el.dataset.stage = st;
    el.innerHTML = `<div class="hname"><canvas width="78" height="78"></canvas><span class="nm">${roleName(r, st)}</span><em class="stg">${STAGE_NAME[st]}</em></div>
      <div class="bar hp"><i></i></div><div class="bar mp ${ROLE_INFO[r].mana ? '' : 'none'}"><i></i></div>
      <div class="skills">${skillSlots}</div>
      <button class="ult" title="${U.desc}"><i class="fill"></i><span>${U.name}</span></button>`;
    el.querySelector('.ult').onclick = () => useUlt(S, r);
    el.querySelector('.hname').onclick = () => openInv(r); el.querySelector('.hname').style.cursor = 'pointer';
    cards[r] = { el, hp: el.querySelector('.hp i'), mp: el.querySelector('.mp i'), pc: el.querySelector('canvas'), ult: el.querySelector('.ult'), fill: el.querySelector('.fill'),
      sk: Object.fromEntries([...el.querySelectorAll('.sk')].map(x => [x.dataset.id, { el: x, bar: x.querySelector('i') }])) };
  }
  for (const r of ROLE_ORDER) rebuildHeroCard(r);
  function updateCards() {
    for (const h of S.heroes) {
      const c = cards[h.role]; if (!c) continue;
      const st = h.stage || 0;
      if (+c.el.dataset.stage !== st) rebuildHeroCard(h.role);
      const c2 = cards[h.role];
      c2.el.classList.toggle('dead', !h.alive);
      const nm = c2.el.querySelector('.nm'); if (nm) nm.textContent = h.name;
      c2.hp.style.width = (h.hp / h.maxHp * 100) + '%';
      if (h.maxMana) c2.mp.style.width = (h.mana / h.maxMana * 100) + '%';
      for (const id of Object.keys(c2.sk)) {
        const s = skillById(h.role, id); if (!s) continue;
        const k = c2.sk[id], cd = Math.max(0, h.cds[id] || 0), max = s.cd / h.haste || 1;
        k.bar.style.height = (s.cd ? Math.min(1, cd / max) * 100 : 0) + '%';
        k.el.classList.toggle('off', !cfg[h.role].on[id]);
        k.el.classList.toggle('fired', !!(s.cd && cd > max - 0.5));
      }
      const rdy = h.alive && h.ult >= 100 && S.inCombat;
      c2.ult.classList.toggle('ready', rdy); c2.ult.disabled = !rdy; c2.fill.style.height = (h.alive ? h.ult : 0) + '%';
    }
  }

  // ---------- 기록 ----------
  const logEl = $('log'); let logSig = '';
  function updateLog() {
    const sig = S.log.length + ':' + (S.log.length ? S.log[S.log.length - 1].t : 0);
    if (sig === logSig) return; logSig = sig;
    logEl.innerHTML = S.log.slice().reverse().map(l => { const t = Math.floor(l.t); return `<li><time>${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}</time><span class="${l.kind}">${l.text}</span></li>`; }).join('');
  }

  // ---------- 영웅 · 스킬트리 · 전투 슬롯 ----------
  let ruleRole = 'tank';
  const chips = $('heroChips');
  for (const r of ROLE_ORDER) {
    const b = document.createElement('button'); b.className = 'chip'; b.textContent = ROLE_INFO[r].name; b.dataset.role = r; b.style.setProperty('--rc', `var(--${r})`);
    b.onclick = () => { ruleRole = r; renderHeroPanel(); }; chips.appendChild(b);
  }
  function renderRules() { renderHeroPanel(); }
  function renderHeroPanel() {
    if (chips) chips.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', c.dataset.role === ruleRole));
    const el = $('heroPanel'); if (!el) return;
    const st = (P.stages && P.stages[ruleRole]) || 0;
    const R = cfg[ruleRole];
    const unlocked = skillsForStage(ruleRole, st);
    const U = ultOf(ruleRole, st);
    let evoHtml = '';
    if (canEvolve(P, ruleRole)) {
      evoHtml = `<button class="btn primary" id="hpEvo">${st === 0 ? '진화 (Lv30+)' : '각성 (Lv70+)'}</button>`;
    } else if (st < 2) {
      evoHtml = `<span class="muted">다음 ${STAGE_NAME[st + 1]} · Lv ${STAGE_NEED[st + 1]} (현재 ${P.lvl})</span>`;
    } else evoHtml = '<span class="muted">각성 완료</span>';

    const cells = [];
    for (let i = 0; i < 6; i++) {
      const gate = i < 4 ? 0 : i === 4 ? 1 : 2;
      const locked = st < gate;
      const id = R.order[i];
      const s = !locked && id ? skillById(ruleRole, id) : null;
      if (!s) {
        const label = gate === 0 ? '빈 칸' : gate === 1 ? '진화' : '각성';
        cells.push(`<div class="tree-node lock"><b>${i + 1}</b><em>${label}${locked ? ' · 잠김' : ''}</em></div>`);
      } else {
        cells.push(`<div class="tree-node on">${svgIcon(s.id)}<b>${s.name}</b><em>${STAGE_NAME[s.tier]} · 활성</em></div>`);
      }
    }
    const rows = `<div class="tree-row">${cells.slice(0, 3).join('')}</div><div class="tree-row">${cells.slice(3, 6).join('')}</div>`;

    el.innerHTML = `
      <div class="evo-bar"><b>${roleName(ruleRole, st)}</b> · ${STAGE_NAME[st]} · 궁극 ${U.name} ${evoHtml}</div>
      <p class="note">스킬은 6칸입니다. 위 3·아래 3. 기본 4칸은 바로 넣고, 5칸은 진화, 6칸은 각성 때 열립니다.</p>
      <div class="tree">${rows}</div>
      <h3 style="margin:8px 0 4px;font-size:14px">전투 슬롯 6</h3>
      <ol class="slot-list" id="slotList"></ol>
      <div class="opts" id="heroOpts"></div>`;

    const optsEl = $('heroOpts');
    const dodge = document.createElement('button'); dodge.className = 'pill';
    dodge.setAttribute('aria-pressed', R.dodge); dodge.textContent = '장판 회피 ' + (R.dodge ? '켜짐' : '꺼짐');
    dodge.onclick = () => { R.dodge = !R.dodge; persistCfg(); renderHeroPanel(); }; optsEl.appendChild(dodge);
    if (ruleRole === 'mage' || ruleRole === 'rogue' || ruleRole === 'hunter') {
      const lab = document.createElement('label');
      lab.innerHTML = `대상 <select>${TARGETS.map(([v, l]) => `<option value="${v}" ${R.target === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
      lab.querySelector('select').onchange = e => { R.target = e.target.value; persistCfg(); }; optsEl.appendChild(lab);
    }
    const evoBtn = $('hpEvo');
    if (evoBtn) evoBtn.onclick = () => {
      if (!evolveHero(P, ruleRole)) return;
      saveP(); syncCfgToStages(); persistCfg(); rebuildHeroCard(ruleRole); resetLooks(); renderHeroPanel(); updateStrip();
      pushBanner({ text: roleName(ruleRole, P.stages[ruleRole]), sub: STAGE_NAME[P.stages[ruleRole]], color: 'tape' });
    };
    el.querySelectorAll('.tree-node[data-sid]').forEach(node => {
      node.onclick = () => {
        const id = node.dataset.sid; const s = skillById(ruleRole, id); if (!s || s.tier > st) return;
        if (R.order.includes(id)) return;
        const cap = slotCap(st);
        if (R.order.length >= cap) { const out = R.order.pop(); R.on[out] = false; }
        R.order.push(id); R.on[id] = true; if (!R.cond[id]) R.cond[id] = s.conds[0][0];
        persistCfg(); rebuildHeroCard(ruleRole); renderHeroPanel();
      };
    });
    const rulesEl = $('slotList');
    const cap = slotCap(st);
    for (let i = 0; i < 6; i++) {
      const id = R.order[i];
      const gate = i < 4 ? 0 : i === 4 ? 1 : 2;
      const locked = st < gate;
      const s = id ? skillById(ruleRole, id) : null;
      const li = document.createElement('li');
      li.className = 'rule' + (s ? '' : ' empty') + (locked ? ' lock' : '');
      if (!s) {
        const label = gate === 0 ? '빈 슬롯' : gate === 1 ? '빈 슬롯 · 진화' : '빈 슬롯 · 각성';
        li.innerHTML = `<span class="n">${i + 1}</span><div class="txt"><b>${label}</b><em>${locked ? '아직 열리지 않음' : '위 스킬을 눌러 넣기'}</em></div>`;
        rulesEl.appendChild(li);
        continue;
      }
      li.innerHTML = `<span class="n">${i + 1}</span><div class="txt"><b>${s.name}</b><em>${s.desc}</em>
        <select>${s.conds.map(([v, l]) => `<option value="${v}" ${R.cond[id] === v ? 'selected' : ''}>조건: ${l}</option>`).join('')}</select></div>
        <div class="ctl"><button ${i === 0 ? 'disabled' : ''}>▲</button><button ${i >= R.order.length - 1 ? 'disabled' : ''}>▼</button><button class="tog">빼기</button></div>`;
      const [up, down, out] = li.querySelectorAll('button');
      up.onclick = () => { [R.order[i - 1], R.order[i]] = [R.order[i], R.order[i - 1]]; persistCfg(); rebuildHeroCard(ruleRole); renderHeroPanel(); };
      down.onclick = () => { if (i + 1 >= cap || !R.order[i + 1]) return; [R.order[i + 1], R.order[i]] = [R.order[i], R.order[i + 1]]; persistCfg(); rebuildHeroCard(ruleRole); renderHeroPanel(); };
      out.onclick = () => { if (R.order.length <= 1) return; R.order = R.order.filter(x => x !== id); R.on[id] = false; persistCfg(); rebuildHeroCard(ruleRole); renderHeroPanel(); };
      li.querySelector('select').onchange = e => { R.cond[id] = e.target.value; persistCfg(); };
      rulesEl.appendChild(li);
    }
  }
  renderHeroPanel();

  // ---------- 탭/조작 ----------
  function showTab(name) { showNav(name === 'rules' ? 'heroes' : name === 'log' ? 'log' : name); }
  function showNav(name) {
    const map = { home: 'home', heroes: 'heroes', gear: 'gear', battle: 'battle', log: 'log', rules: 'heroes' };
    name = map[name] || name || 'home';
    document.querySelectorAll('.screen').forEach(s => { s.hidden = s.dataset.screen !== name; });
    document.querySelectorAll('.tabbtn').forEach(b => b.setAttribute('aria-selected', b.dataset.nav === name));
    if (name === 'heroes') renderHeroPanel();
    if (name === 'home') renderHome();
    if (name === 'battle') {
      fitCanvas();
      if (holdMap) closeMap();
      else if (S && S.phase === 'pick') closeMap();
      else openMap();
    }
    if (name !== 'battle') setRunning(false);
  }
  document.querySelectorAll('.tabbtn').forEach(b => b.onclick = () => {
    if (b.dataset.nav === 'gear') { openInv(); return; }
    showNav(b.dataset.nav);
  });
  const pauseBtn = $('pauseBtn');
  function setRunning(v) { running = v; pauseBtn.textContent = v ? '정지' : '계속'; }
  pauseBtn.onclick = () => { if (S.phase === 'win' || S.phase === 'lose' || S.phase === 'pick') return; if ($('intro')) $('intro').hidden = true; showNav('battle'); setRunning(!running); };
  $('speedBtn').onclick = () => { speed = speed === 1 ? 2 : speed === 2 ? 4 : 1; $('speedBtn').textContent = '속도 ' + speed + '×'; };
  function setMode(m) { mode = m; S.mode = m; S.goal = null; }
  const autoBtn = $('autoUlt');
  function setAuto(v) { autoUlt = v; S.autoUlt = v; autoBtn.setAttribute('aria-pressed', v); autoBtn.textContent = v ? '궁극기 자동' : '궁극기 수동'; save('dungeon3-auto', v); }
  autoBtn.onclick = () => setAuto(!autoUlt); setAuto(autoUlt);
  // ---------- 장비 화면 ----------
  const SLOT_ICON = {
    weapon: { tank: '<path d="M14 2l4 4-9 9-3 1 1-3z"/><path d="M5 13l2 2M3 17l2-2"/>', healer: '<path d="M4 18L13 9"/><circle cx="15" cy="6" r="3.5"/><path d="M15 2.5v7M11.5 6h7"/>', mage: '<path d="M4 18L14 8"/><path d="M15 2l1 2.5 2.5 1-2.5 1L15 9l-1-2.5-2.5-1 2.5-1z"/>', rogue: '<path d="M15 3l2 2-8 8-3 1 1-3z"/><path d="M6 12l2 2M4 16h3"/>', hunter: '<path d="M4 16c6-8 8-10 12-12"/><path d="M4 16c2-1 8 2 12-4"/><path d="M6 14l9-9"/>' },
    offhand: { tank: '<path d="M10 2l7 3v5c0 4-3 7-7 8-4-1-7-4-7-8V5z"/><path d="M10 6v8M7 9h6"/>', healer: '<path d="M4 4h9a3 3 0 013 3v10H7a3 3 0 01-3-3z"/><path d="M10 7v6M7.5 10h5"/>', mage: '<circle cx="10" cy="9" r="6"/><path d="M6 17h8"/><path d="M8 7a3 3 0 013-2"/>', rogue: '<path d="M13 4l2 2-6 6-2.5.5L7 10z"/><path d="M5 13l2 2"/>', hunter: '<path d="M6 4h8l-2 12H8z"/><path d="M8 8h4M8 11h4"/>' },
    helm: '<path d="M4 13a6 6 0 0112 0v3H4z"/><path d="M7 13h6M10 4v3"/>',
    chest: '<path d="M6 3l4 2 4-2 3 3-2 3v8H5V9L3 6z"/><path d="M10 5v12"/>',
    gloves: '<path d="M6 17V8a1.5 1.5 0 013 0V4a1.5 1.5 0 013 0v4-2a1.5 1.5 0 013 0v7a4 4 0 01-4 4z"/><path d="M6 11l-2-2"/>',
    boots: '<path d="M6 3h5v9l5 2a2 2 0 011 2v1H4v-4z"/><path d="M6 8h5"/>',
  };
  const slotSvg = (sl, role) => { const d = SLOT_ICON[sl]; return `<svg viewBox="0 0 20 20" aria-hidden="true">${typeof d === 'string' ? d : d[role]}</svg>`; };
  const LEFT = ['helm', 'chest', 'boots'], RIGHT = ['weapon', 'offhand', 'gloves'];
  let showAll = false, equipFlash = false;
  function previewItem() { if (!invSel || invSel.kind !== 'bag') return null; const it = P.bag.find(x => x.id === invSel.id); return it && it.role === invRole ? it : null; }
  function drawInvPortrait() {
    const cvp = $('iPort'); if (!cvp || $('inv').hidden) return;
    const c = cvp.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cvp.width, cvp.height);
    const pv = previewItem(); const stg = (P.stages && P.stages[invRole]) || 0;
    drawHero(c, invRole, 144, 176, 6.4, { face: 1, t: performance.now() / 1000, look: pv ? previewLook(invRole, pv) : lookOf(invRole), world: true, stage: stg });
  }
  const UQ_FX = { tank: '천둥벼락에 바위 파편이 튀어오릅니다', healer: '치유 이펙트가 주황빛으로 바뀌고 빛 날개가 펼쳐집니다', mage: '화염구가 별똥별로 바뀌고 별가루가 흩날립니다', rogue: '절개·소멸에 까마귀 깃털이 흩날립니다', hunter: '화살에 나뭇잎이 흩날립니다' };
  const UQ_LOOK = { helm: { tank: '군주의 뿔', healer: '이중 후광', mage: '빛나는 별 모자', rogue: '까마귀 가면', hunter: '매의 깃털 모자' }, chest: '등 뒤 망토', offhand: { tank: '방패 별 문장', healer: '빛나는 성표', mage: '떠다니는 구슬', rogue: '보조 단검 광채', hunter: '빛나는 화살통' } };
  function lookNote(it) {
    const parts = [];
    const rn = RARITY[it.rar].name;
    if (it.slot === 'weapon') {
      parts.push(it.rar ? `스킬·기본 공격 이펙트가 ${rn} 색으로, 크기 +${it.rar * 15}%` : '스킬 이펙트 기본 색');
      if (it.rar >= 2) parts.push('스킬마다 파편이 튐');
      if (it.rar === 3) parts.push(UQ_FX[it.role]);
    } else {
      const look = { helm: '투구', chest: '갑옷 띠·가슴 장식', offhand: '보조무기', gloves: '장갑', boots: '장화' }[it.slot];
      parts.push(`${look} 색이 ${rn} 색으로`);
      if (it.slot === 'chest' && it.rar >= 2) parts.push('어깨 갑옷');
      if (it.rar === 3) { const u = UQ_LOOK[it.slot]; if (u) parts.push(typeof u === 'string' ? u : u[it.role]); }
    }
    const st = it.stats || {};
    if (st.thorns >= 20) parts.push('몸에 가시');
    if (st.leech >= 3) parts.push('공격할 때 피 방울이 돌아옴');
    if (st.cdr >= 6) parts.push('시전할 때 룬 원');
    if (st.mf >= 20) parts.push('파란 반짝임');
    if (st.gold >= 30) parts.push('금화 반짝임');
    if (it.gearSkill) parts.push('특스: ' + it.gearSkill.name + ' — ' + it.gearSkill.desc);
    if (it.armorClass && ARMOR_CLASS_NAME) parts.push(ARMOR_CLASS_NAME[it.armorClass] || it.armorClass);
    return parts.join(' · ');
  }
  function allStatsHtml(m) {
    const rows = [['치명타 확률', Math.round(m.crit * 100) + '%'], ['치명타 피해', Math.round(m.critDmg * 100) + '%'], ['받는 피해 감소', Math.round(m.dr * 100) + '%'],
      ['재사용 대기시간 감소', Math.round(m.cdr * 100) + '%'], ['생명력 흡수', Math.round(m.leech * 100) + '%'], ['초당 체력 재생', (m.hpRegen * 100).toFixed(1) + '%'],
      ['치유량', '+' + Math.round(m.healMul * 100 - 100) + '%'], ['마나 재생', '+' + Math.round(m.regenMul * 100 - 100) + '%'], ['근접 피해 반사', Math.round(m.thorns * 100) + '%'],
      ['독 저항', Math.round(m.poisonRes * 100) + '%'], ['이동 속도', '+' + Math.round(m.move * 100) + '%']];
    return `<div class="allst">${rows.map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('')}</div>`;
  }
  let invRole = 'tank', invSel = null, invFilter = 'hero', invWasRunning = false, sellArmed = false;
  const upCount = r => P.bag.filter(it => (!r || it.role === r) && isUpgrade(P, it)).length;
  const stat3 = o => ({ pow: Math.round(o.pow * 100 - 100), hp: Math.round(o.hp * 100 - 100), haste: Math.round(o.haste * 100 - 100) });
  const statLine = it => [it.pow && `공격 +${it.pow}%`, it.hp && `체력 +${it.hp}%`, it.haste && `가속 +${it.haste}%`].filter(Boolean).join(' · ') || '능력치 없음';
  // 디아블로식 아이템 툴팁: 기본 능력치(회색) + 무작위 옵션(등급색, 굴림 범위 표시)
  function itemLines(it) {
    const base = Object.entries(it.base || {}).map(([k, v]) => `<div class="il base">${statText(k, v)}</div>`).join('');
    const aff = (it.affixes || []).map(a => {
      const top = a.v >= a.hi ? ' top' : '';
      const rng = a.stat === 'hpRegen' ? `${(a.lo / 10).toFixed(1)}-${(a.hi / 10).toFixed(1)}` : `${a.lo}-${a.hi}`;
      return `<div class="il aff r${it.rar}${top}">${statText(a.stat, a.v)} <small>[${rng}]</small></div>`;
    }).join('');
    return `<div class="tip">${base}${aff || (it.rar ? '' : '<div class="il base">추가 옵션 없음</div>')}</div>`;
  }
  function diffLine(it, cur) {
    const ks = new Set([...Object.keys(it.stats || {}), ...Object.keys((cur && cur.stats) || {})]);
    const out = [];
    for (const k of ks) { const v = ((it.stats || {})[k] || 0) - ((cur && cur.stats && cur.stats[k]) || 0); if (v) out.push(`<span class="${v > 0 ? 'p' : 'm'}">${k === 'hpRegen' ? STATS[k].name + ' ' + (v > 0 ? '+' : '') + (v / 10).toFixed(1) + '%' : STATS[k].name + ' ' + (v > 0 ? '+' : '') + v + STATS[k].unit}</span>`); }
    const sd = Math.round((itemScore(it) - itemScore(cur)) * 10) / 10;
    return { list: out.join(''), sd };
  }
  const enhLine = sl => Object.entries(ENH_EFF[sl]).map(([k, v]) => `${{ pow: '공격', hp: '체력', haste: '가속' }[k]} +${v}%`).join(', ');
  function updateEqBadge() { const n = upCount(); const d = $('eqDot'); d.hidden = !n; d.textContent = n; }
  function afterGearChange(before) {
    resetLooks();
    S.heroes.forEach(h => applyGear(S, h)); saveP(); updateEqBadge();
    const d = partyCP(P) - before; if (d) cpToast(d);
  }
  function openInv(role) {
    if (role) invRole = role; invSel = null; sellArmed = false;
    invWasRunning = running; setRunning(false);
    $('inv').hidden = false; document.body.style.overflow = 'hidden'; renderInv();
  }
  function closeInv() {
    $('inv').hidden = true; document.body.style.overflow = '';
    for (const it of P.bag) it.isNew = false; saveP(); updateEqBadge();
    if (invWasRunning && S.phase === 'explore') setRunning(true);
    if ($('intro') && !$('intro').hidden) renderIntro();
  }
  function cellHtml(it, opts) {
    opts = opts || {};
    if (!it) return `<button class="cell empty ${opts.sel ? 'sel' : ''}" data-k="${opts.key}" aria-label="${opts.label} 비어 있음">${slotSvg(opts.slot, invRole)}${opts.enh ? `<span class="en">+${opts.enh}</span>` : ''}</button>`;
    const lockedSt = (it.reqStage || 0) > ((P.stages && P.stages[it.role]) || 0);
    return `<button class="cell r${it.rar} ${opts.sel ? 'sel' : ''} ${lockedSt ? 'stage-lock' : ''}" data-k="${opts.key}" aria-label="${it.name}" style="--rc:var(--${it.role})">${slotSvg(it.slot, it.role)}
      <span class="lv">${it.ilvl}</span>${(it.reqStage || 0) ? `<span class="stg">${STAGE_NAME[it.reqStage][0]}</span>` : ''}${opts.enh ? `<span class="en">+${opts.enh}</span>` : ''}${opts.up ? '<span class="up">▲</span>' : ''}${opts.isNew ? '<span class="nw"></span>' : ''}${opts.roleDot ? '<span class="rd"></span>' : ''}${it.lock ? '<span class="lk">🔒</span>' : ''}</button>`;
  }
  function detailHtml() {
    if (!invSel) return `<p class="small">장비칸이나 가방 칸을 누르면 자세히 보고 장착·강화·판매할 수 있습니다. 칸 하나에 아이템 하나가 들어갑니다.</p>`;
    if (invSel.kind === 'slot') {
      const sl = invSel.slot, it = P.gear[invRole][sl], lv = P.enh[invRole][sl], cost = enhCost(lv), max = lv >= ENH_MAX;
      const cands = P.bag.filter(x => x.role === invRole && x.slot === sl).length;
      return `<div class="nm ${it ? 'r' + it.rar : ''}">${it ? it.name : SLOT_NAME[sl] + ' 비어 있음'}</div>
        <div class="sub">${ROLE_INFO[invRole].name} · ${SLOT_NAME[sl]}${it ? ` · Lv ${it.ilvl} ${RARITY[it.rar].name}` : ''} · 칸 강화 +${lv}</div>
        ${it ? itemLines(it) : ''}
        <div class="cmp">칸 강화 1단계마다 ${enhLine(sl)}. 강화는 칸에 붙어서 장비를 바꿔도 유지됩니다.${cands ? ` 가방에 이 칸 장비 ${cands}개.` : ''}</div>
        <div class="row"><button class="btn primary" id="iEnh" ${max || P.gold < cost ? 'disabled' : ''}>${max ? '강화 최대' : `강화 +${lv + 1} · ${fmt(cost)} G`}</button>${it ? `<button class="btn" id="iOff" ${P.bag.length >= BAG_MAX ? 'disabled' : ''}>해제</button>` : ''}</div>`;
    }
    const it = P.bag.find(x => x.id === invSel.id); if (!it) return '';
    const cur = P.gear[it.role][it.slot];
    const D = diffLine(it, cur);
    const need = it.reqStage || 0;
    const have = (P.stages && P.stages[it.role]) || 0;
    const can = need <= have;
    return `<div class="nm r${it.rar}">${it.name}</div>
      <div class="sub">${it.rar === 2 || it.rar === 3 ? it.baseName + ' · ' : ''}${ROLE_INFO[it.role].name} 전용 · ${SLOT_NAME[it.slot]} · Lv ${it.ilvl} ${RARITY[it.rar].name}${need ? ' · 요구 ' + STAGE_NAME[need] : ''}</div>
      ${itemLines(it)}
      <div class="looknote">외형 변화: ${lookNote(it)}</div>
      ${!can ? `<div class="cmp warn">${STAGE_NAME[need]} 캐릭만 장착 가능 (현재 ${STAGE_NAME[have]})</div>` : ''}
      <div class="cmp">${cur ? `착용 중인 <b class="r${cur.rar}">${cur.name}</b>과 비교` : '빈 칸에 장착'} · 전투 점수 <b class="${D.sd > 0 ? 'p' : D.sd < 0 ? 'm' : ''}">${D.sd > 0 ? '+' : ''}${D.sd}</b><div class="ln" style="margin-top:4px">${D.list || '<span>차이 없음</span>'}</div></div>
      <div class="row"><button class="btn primary" id="iOn" ${can ? '' : 'disabled'}>${ROLE_INFO[it.role].name}에게 장착</button><button class="btn" id="iSell" ${it.lock ? 'disabled' : ''}>판매 +${sellPrice(it)} G</button><button class="btn" id="iLock" aria-pressed="${!!it.lock}">${it.lock ? '잠금 해제' : '잠금'}</button></div>`;
  }
  function renderInv() {
    const stage = (P.stages && P.stages[invRole]) || 0;
    const el = $('inv'), m = heroMults(P, invRole, stage), st = stat3(m), pb = partyBonus(P);
    const slotCell = sl => `<div>${cellHtml(P.gear[invRole][sl], { key: 's:' + sl, slot: sl, label: SLOT_NAME[sl], enh: P.enh[invRole][sl], sel: invSel && invSel.kind === 'slot' && invSel.slot === sl })}</div><div class="slotlbl">${SLOT_NAME[sl]}</div>`;
    const list = P.bag.filter(it => invFilter === 'all' || it.role === invRole);
    const cells = list.map(it => cellHtml(it, { key: 'b:' + it.id, up: isUpgrade(P, it), isNew: it.isNew, roleDot: invFilter === 'all', sel: invSel && invSel.kind === 'bag' && invSel.id === it.id }));
    const blanks = Math.max(0, (invFilter === 'all' ? BAG_MAX : Math.max(12, Math.ceil(list.length / 6) * 6)) - list.length);
    el.innerHTML = `<div class="in">
      <div class="invtop"><h2>장비 · 진화</h2><span class="g">${fmt(P.gold)} G</span><button class="x" id="iClose" aria-label="닫기">✕</button></div>
      <div class="htabs" role="tablist">${ROLE_ORDER.map(r => { const rs = (P.stages && P.stages[r]) || 0; return `<button class="htab" role="tab" data-r="${r}" aria-selected="${r === invRole}" style="--rc:var(--${r})"><canvas width="102" height="102"></canvas>${roleName(r, rs)}<small>${STAGE_NAME[rs]}</small>${upCount(r) ? '<span class="dot"></span>' : ''}</button>`; }).join('')}</div>
      <div class="evo-bar">${roleName(invRole, stage)} · <b>${STAGE_NAME[stage]}</b> · 파티 Lv ${P.lvl} ${canEvolve(P, invRole) ? `<button class="btn primary" id="iEvo">${stage === 0 ? '진화 (Lv30+)' : '각성 (Lv70+)'}</button>` : (stage < 2 ? `<span class="muted">다음 ${STAGE_NAME[stage + 1]} · Lv ${STAGE_NEED[stage + 1]}</span>` : '<span class="muted">각성 완료</span>')}</div>
      <div class="doll" style="--rc:var(--${invRole})">
        <div class="col">${LEFT.map(slotCell).join('')}</div>
        <div class="center"><span class="prevtag" id="iPrevTag" ${previewItem() ? '' : 'hidden'}>착용 미리보기</span><canvas width="288" height="288" id="iPort"></canvas>
          <div class="cp">${fmt(heroCP(P, invRole))}<small>${roleName(invRole, stage)} 전투력</small></div>
          <div class="stats3"><div><b>+${st.pow}%</b>공격</div><div><b>+${st.hp}%</b>체력</div><div><b>+${st.haste}%</b>가속</div></div>
          <button class="more" id="iMore" aria-expanded="${showAll}">${showAll ? '능력치 접기' : '능력치 전체'}</button></div>
        <div class="col">${RIGHT.map(slotCell).join('')}</div>
      </div>
      ${showAll ? allStatsHtml(m) : ''}
      <div class="detail" id="iDetail">${detailHtml()}</div>
      <div class="bagbar"><h3>가방<small>${P.bag.length}/${BAG_MAX}</small></h3>
        <div class="seg"><button class="btn" data-f="hero" aria-pressed="${invFilter === 'hero'}">${ROLE_INFO[invRole].name}</button><button class="btn" data-f="all" aria-pressed="${invFilter === 'all'}">전체</button></div></div>
      <div class="pbonus">파티 파밍 보너스 · <b class="g">골드 +${pb.gold}%</b> · <b class="r1">매직 아이템 발견 +${pb.mf}%</b> · <b>경험치 +${pb.xp}%</b></div>
      <div class="row"><button class="btn primary" id="iBest" ${upCount(invRole) ? '' : 'disabled'}>최적 장착${upCount(invRole) ? ' (' + upCount(invRole) + ')' : ''}</button>
        <button class="btn" id="iJunk">${sellArmed ? '한 번 더 누르면 판매' : '일반·마법 일괄 판매'}</button></div>
      <div class="bag">${cells.join('')}${'<span class="cell blank"></span>'.repeat(blanks)}</div>
      <p class="small">▲ 표시는 지금 장비보다 전투 점수가 높은 아이템, 빨간 점은 새로 주운 아이템입니다. 옵션 옆 [범위]는 그 옵션이 나올 수 있는 수치이고, 최대치가 뜨면 '최대'가 붙습니다. 골드·매직 아이템 발견·경험치 옵션은 전투 점수에 들어가지 않으니 직접 골라 끼세요. 잠근 아이템은 팔리지 않습니다.</p>
      <label class="switch" for="iAuto"><span>던전에서 더 좋은 장비를 주우면 바로 자동 장착</span><input type="checkbox" id="iAuto" ${P.autoEquip ? 'checked' : ''}></label>
      <div class="row"><button class="btn" id="resetAll">${resetArmed ? '한 번 더 누르면 모든 진행 삭제' : '진행 초기화'}</button></div>
    </div>`;
    // 초상화
    el.querySelectorAll('.htab canvas').forEach((c, i) => { const r = ROLE_ORDER[i]; const x = c.getContext('2d'); drawHero(x, r, 51, 60, 2.4, { face: 1, t: 0, look: lookOf(r), stage: (P.stages && P.stages[r]) || 0 }); });
    drawInvPortrait();
    const iEvo = $('iEvo'); if (iEvo) iEvo.onclick = () => {
      if (!evolveHero(P, invRole)) return;
      saveP(); syncCfgToStages(); persistCfg(); rebuildHeroCard(invRole); resetLooks();
      S.heroes.forEach(h => applyGear(S, h)); renderInv(); renderRules(); updateStrip();
      pushBanner({ text: roleName(invRole, P.stages[invRole]), sub: STAGE_NAME[P.stages[invRole]] + ' 완료', color: 'tape' });
    };
    if (equipFlash) { const ce = el.querySelector('.center'); ce.classList.add('flash'); equipFlash = false; }
    // 이벤트
    $('iClose').onclick = closeInv;
    el.querySelectorAll('.htab').forEach(b => b.onclick = () => { invRole = b.dataset.r; invSel = null; renderInv(); });
    el.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { invFilter = b.dataset.f; renderInv(); });
    el.querySelectorAll('.cell[data-k]').forEach(b => b.onclick = () => {
      const [k, v] = b.dataset.k.split(':');
      invSel = k === 's' ? { kind: 'slot', slot: v } : { kind: 'bag', id: +v };
      if (k === 'b') { const it = P.bag.find(x => x.id === +v); if (it) { it.isNew = false; if (it.role !== invRole) invRole = it.role; } }
      renderInv(); $('iDetail').scrollIntoView({ block: 'nearest' });
    });
    const on = $('iOn'); if (on) on.onclick = () => { const b = partyCP(P); const it = P.bag.find(x => x.id === invSel.id); equipItem(P, invSel.id); invRole = it.role; invSel = { kind: 'slot', slot: it.slot }; afterGearChange(b); equipFlash = true;
      const h = S.heroes.find(x => x.role === it.role); if (h && h.alive) { S.fx.push({ type: 'ring', x: h.x, y: h.y, r: 34, color: 'r' + it.rar, life: 0.9, age: 0 }); S.fx.push({ type: 'label', text: it.name, x: h.x, y: h.y - 30, color: 'r' + it.rar, role: 'r' + it.rar, life: 1.4, age: 0 }); }
      renderInv(); };
    const sell = $('iSell'); if (sell) sell.onclick = () => { sellItem(P, invSel.id); invSel = null; saveP(); updateEqBadge(); renderInv(); };
    const enh = $('iEnh'); if (enh) enh.onclick = () => { const b = partyCP(P); if (enhance(P, invRole, invSel.slot)) { afterGearChange(b); renderInv(); } };
    const off = $('iOff'); if (off) off.onclick = () => { const b = partyCP(P); unequipItem(P, invRole, invSel.slot); afterGearChange(b); renderInv(); };
 const lk = $('iLock'); if (lk) lk.onclick = () => { const it = P.bag.find(x => x.id === invSel.id); if (it) { it.lock = !it.lock; saveP(); renderInv(); } };
    $('iMore').onclick = () => { showAll = !showAll; renderInv(); };
    $('iBest').onclick = () => { const b = partyCP(P); bestEquip(P, invRole); invSel = null; afterGearChange(b); renderInv(); };
    $('iJunk').onclick = () => {
      if (!sellArmed) { sellArmed = true; renderInv(); setTimeout(() => { if (sellArmed) { sellArmed = false; if (!$('inv').hidden) renderInv(); } }, 3000); return; }
      sellArmed = false; sellJunk(P, 1); invSel = null; saveP(); updateEqBadge(); renderInv();
    };
    $('iAuto').onchange = e => { P.autoEquip = e.target.checked; saveP(); };
    $('resetAll').onclick = () => {
      if (!resetArmed) { resetArmed = true; renderInv(); setTimeout(() => { resetArmed = false; if (!$('inv').hidden) renderInv(); }, 3000); return; }
      resetArmed = false; P = newProgress(); saveP(); worldId = 1; floor = 1; homeSig = ''; shownCP = partyCP(P); invSel = null; newRun(false); renderInv(); updateEqBadge();
    };
  }
  let resetArmed = false;
  if ($('eqBtn')) $('eqBtn').onclick = () => openInv();
  $('cpBox').onclick = null;
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('inv').hidden) closeInv(); if (e.key === 'Escape' && $('sheet') && !$('sheet').hidden) closeSheet(); });

  function newRun(go) {
    resetLooks();
    worldId = worldStageById(worldId).id;
    syncCfgToStages(); persistCfg(); saveP();
    S = createGame(cfg, P, worldId, mode, worldId); S.autoUlt = autoUlt; floor = S.floor; seenResult = false; logSig = ''; snapCam();
    for (const r of ROLE_ORDER) rebuildHeroCard(r);
    if ($('result')) $('result').hidden = true;
    if ($('pick')) $('pick').hidden = true;
    if ($('intro')) $('intro').hidden = true;
    if (go) { holdMap = true; closeMap(); showNav('battle'); holdMap = false; setRunning(true); }
    else setRunning(false);
    homeSig = '';
    updateStrip();
  }
  function renderIntro() { renderHome(); }

  const ATTEND = [200, 300, 400, 600, 800, 1000, 1500];
  const MISSIONS = [
    { id: 'm_clear1', name: '첫 석굴', desc: '스테이지 1 클리어', gold: 400, ok: () => (P.cleared || 0) >= 1 },
    { id: 'm_lv5', name: '파티 단련', desc: '파티 레벨 5', gold: 300, ok: () => P.lvl >= 5 },
    { id: 'm_clear3', name: '갱도 돌파', desc: '스테이지 3 클리어', gold: 800, ok: () => (P.cleared || 0) >= 3 },
    { id: 'm_lv15', name: '숙련 파티', desc: '파티 레벨 15', gold: 1000, ok: () => P.lvl >= 15 },
    { id: 'm_clear7', name: '심층 도달', desc: '스테이지 7 클리어', gold: 1500, ok: () => (P.cleared || 0) >= 7 },
  ];
  const dateKey = d => { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const yesterdayKey = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dateKey(d); };
  const weekKey = () => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return dateKey(d); };
  function attendState() {
    const today = dateKey(), last = (P.attendance && P.attendance.last) || '';
    if (last === today) return { day: P.attendance.streak || 1, claimed: true };
    let day = 1;
    if (last === yesterdayKey()) day = P.attendance.streak >= 7 ? 1 : (P.attendance.streak || 0) + 1;
    return { day, claimed: false };
  }
  function missionReady() { return MISSIONS.some(m => m.ok() && !P.claims[m.id]); }
  function weekReady() { return (P.cleared || 0) >= 1 && P.claims.week !== weekKey(); }
  let homeSig = '';
  let sheetKind = '';
  function closeSheet() { const s = $('sheet'); if (s) s.hidden = true; sheetKind = ''; }
  function openSheet(kind, extra) {
    sheetKind = kind;
    const card = $('sheetCard'), sheet = $('sheet');
    if (!card || !sheet) return;
    if (kind === 'attend') {
      const st = attendState();
      card.innerHTML = `<h2>7일 출석</h2><p>하루에 한 번. 하루를 거르면 1일차로 돌아갑니다.</p>
        <div class="attend">${ATTEND.map((g, i) => {
          const n = i + 1;
          const cls = 'aday' + (st.claimed && n <= st.day ? ' got' : '') + (!st.claimed && n === st.day ? ' now' : '');
          return `<div class="${cls}"><b>${n}</b><span>${fmt(g)} G</span></div>`;
        }).join('')}</div>
        <button class="btn primary" id="claimAttend" ${st.claimed ? 'disabled' : ''}>${st.claimed ? '오늘 받음' : st.day + '일차 받기'}</button>
        <button class="btn" id="sheetClose">닫기</button>`;
      card.querySelector('#claimAttend').onclick = () => {
        const now = attendState(); if (now.claimed) return;
        P.attendance.last = dateKey(); P.attendance.streak = now.day; P.gold += ATTEND[now.day - 1];
        saveP(); homeSig = ''; openSheet('attend'); updateStrip();
      };
    } else if (kind === 'week') {
      const ready = weekReady(), done = P.claims.week === weekKey();
      card.innerHTML = `<h2>잔향 토벌</h2><p>이번 주에 한 번. 스테이지 1을 클리어한 파티가 군주의 잔향을 정리하고 골드를 가져옵니다.</p>
        <p><b>2,000 G</b></p>
        <button class="btn primary" id="claimWeek" ${ready ? '' : 'disabled'}>${done ? '이번 주 받음' : (P.cleared || 0) < 1 ? '스테이지 1 필요' : '보상 받기'}</button>
        <button class="btn" id="sheetClose">닫기</button>`;
      const b = card.querySelector('#claimWeek');
      if (b) b.onclick = () => { if (!weekReady()) return; P.claims.week = weekKey(); P.gold += 2000; saveP(); homeSig = ''; openSheet('week'); updateStrip(); };
    } else if (kind === 'mission') {
      card.innerHTML = `<h2>성장 임무</h2><p>한 번씩 받는 성장 보상입니다.</p>
        ${MISSIONS.map(m => {
          const got = !!P.claims[m.id], ok = m.ok();
          return `<div class="mission"><div><b>${m.name}</b><em>${m.desc} · ${fmt(m.gold)} G</em></div><button class="btn" data-mid="${m.id}" ${ok && !got ? '' : 'disabled'}>${got ? '받음' : ok ? '받기' : '진행 중'}</button></div>`;
        }).join('')}
        <button class="btn" id="sheetClose">닫기</button>`;
      card.querySelectorAll('[data-mid]').forEach(btn => btn.onclick = () => {
        const m = MISSIONS.find(x => x.id === btn.dataset.mid); if (!m || !m.ok() || P.claims[m.id]) return;
        P.claims[m.id] = 1; P.gold += m.gold; saveP(); homeSig = ''; openSheet('mission'); updateStrip();
      });
    } else if (kind === 'shop') {
      const open = P.claims.shop !== dateKey();
      const got = extra && extra.name ? `<p>획득: <b>${extra.name}</b></p>` : '';
      card.innerHTML = `<h2>균열 상자</h2><p>하루에 한 번, ${fmt(SHOP_COST)} G. 기본 장비가 대부분이고 가끔 레어가 나옵니다.</p>${got}
        <button class="btn primary" id="buyChest" ${open && P.gold >= SHOP_COST && P.bag.length < BAG_MAX ? '' : 'disabled'}>${open ? '상자 열기' : '오늘은 끝'}</button>
        <button class="btn" id="sheetClose">닫기</button>`;
      const b = card.querySelector('#buyChest');
      if (b) b.onclick = () => {
        if (P.claims.shop === dateKey() || P.gold < SHOP_COST || P.bag.length >= BAG_MAX) return;
        const role = ROLE_ORDER[rnd(ROLE_ORDER.length)];
        const slot = SLOTS[rnd(SLOTS.length)][0];
        const it = makeItem(Math.max(1, Math.min(24, 4 + Math.floor(P.lvl / 2))), 0, role, slot, Math.random() < 0.14 ? 1 : 0, 0);
        it.isNew = true; P.bag.unshift(it); P.gold -= SHOP_COST; P.claims.shop = dateKey();
        saveP(); homeSig = ''; updateEqBadge(); openSheet('shop', it); updateStrip();
      };
    } else {
      card.innerHTML = `<h2>석굴 소식</h2>
        <p>스테이지는 1부터 순서대로 열립니다. 이긴 다음 칸만 고를 수 있고, 클리어한 칸은 다시 갈 수 있습니다.</p>
        <p>층마다 길이 달라집니다. 잡몹 장비는 거의 나오지 않고, 보스 장비가 본보상입니다.</p>
        <p>진화는 레벨 30, 각성은 레벨 70에 영웅 화면에서 합니다. 스테이지가 캐릭터를 대신 진화시키지 않습니다.</p>
        <button class="btn" id="sheetClose">닫기</button>`;
    }
    const close = card.querySelector('#sheetClose'); if (close) close.onclick = closeSheet;
    sheet.hidden = false;
  }
  const SHOP_COST = 400;
  function renderHome() {
    const nxt = worldStageById(nextStageId());
    const sig = [P.gold, P.lvl, P.cleared || 0, P.attendance && P.attendance.last, P.attendance && P.attendance.streak, JSON.stringify(P.claims), nxt.id].join('|');
    if (sig === homeSig) return; homeSig = sig;
    if ($('homeKicker')) $('homeKicker').textContent = (P.cleared || 0) >= nxt.id ? '모두 클리어' : '다음 스테이지 ' + nxt.id;
    if ($('homeTitle')) $('homeTitle').textContent = nxt.name;
    if ($('homeSub')) $('homeSub').textContent = `${nxt.floors}층 · ${nxt.blurb}`;
    const row = $('eventRow');
    if (row) {
      const icons = [
        { id: 'attend', name: '출석', path: '<rect x="4" y="5" width="12" height="11"/><path d="M4 8h12M7 3v3M13 3v3"/>', badge: !attendState().claimed },
        { id: 'week', name: '잔향', path: '<circle cx="10" cy="10" r="3"/><path d="M10 2v3M10 15v3M2 10h3M15 10h3M4.5 4.5l2 2M13.5 13.5l2 2M15.5 4.5l-2 2M6.5 13.5l-2 2"/>', badge: weekReady() },
        { id: 'mission', name: '임무', path: '<path d="M5 4h10v12H5z"/><path d="M7 8h6M7 11h6M7 14h3"/>', badge: missionReady() },
        { id: 'shop', name: '상자', path: '<path d="M3 8h14v8H3z"/><path d="M3 8l2-4h10l2 4M10 8v8"/>', badge: P.claims.shop !== dateKey() },
        { id: 'news', name: '소식', path: '<path d="M5 4h8l3 3v9H5z"/><path d="M13 4v3h3M7 10h6M7 13h4"/>', badge: false },
      ];
      row.innerHTML = icons.map(ic => `<button class="evicon" type="button" data-ev="${ic.id}">${ic.badge ? '<i class="badge"></i>' : ''}<svg viewBox="0 0 20 20" aria-hidden="true">${ic.path}</svg><span>${ic.name}</span></button>`).join('');
      row.querySelectorAll('[data-ev]').forEach(btn => btn.onclick = () => openSheet(btn.dataset.ev));
    }
    const party = $('homeParty');
    if (party) party.innerHTML = ROLE_ORDER.map(r => {
      const st = (P.stages && P.stages[r]) || 0;
      return `<div class="pchip" style="--rc:var(--${r})"><b>${ROLE_INFO[r].name}</b><em>${STAGE_NAME[st]}</em></div>`;
    }).join('');
  }
  function renderStageMap() {
    const path = $('stagePath'); if (!path) return;
    path.innerHTML = `<div class="cmap">${WORLD_STAGES.slice().reverse().map(st => {
      const open = stageOpen(st.id);
      const done = (P.cleared || 0) >= st.id;
      const next = st.id === nextStageId() && !done;
      const cls = 'cnode' + (done ? ' done' : '') + (next ? ' next' : '') + (open ? '' : ' lock');
      const mark = done ? '클리어' : open ? st.floors + '층' : '잠김';
      return `<button class="${cls}" type="button" data-id="${st.id}" ${open ? '' : 'disabled'}><i>${st.id}</i><b>${st.name}</b><em>${mark}</em></button>`;
    }).join('')}</div>`;
    path.querySelectorAll('.cnode').forEach(btn => btn.onclick = () => startStage(+btn.dataset.id));
    const focus = path.querySelector('.cnode.next') || path.querySelector('.cnode:not([disabled])');
    if (focus) focus.scrollIntoView({ block: 'center' });
  }
  function openMap() {
    mapOpen = true; setRunning(false);
    const screen = $('screen-battle'); if (screen) screen.classList.add('map-on');
    const map = $('stageMap'); if (map) map.hidden = false;
    if ($('result')) $('result').hidden = true;
    const resume = $('resumeRun');
    if (resume) resume.hidden = !(S && S.t > 0 && (S.phase === 'explore' || S.phase === 'pick'));
    renderStageMap();
  }
  function closeMap() {
    mapOpen = false;
    const screen = $('screen-battle'); if (screen) screen.classList.remove('map-on');
    const map = $('stageMap'); if (map) map.hidden = true;
  }
  function startStage(id) {
    if (!stageOpen(id)) return;
    worldId = id; newRun(true);
  }
  if ($('goPlay')) $('goPlay').onclick = () => showNav('battle');
  if ($('exitBattle')) $('exitBattle').onclick = () => { setRunning(false); showNav('home'); };
  if ($('toMap')) $('toMap').onclick = () => { if (S.phase === 'pick') return; openMap(); };
  if ($('resumeRun')) $('resumeRun').onclick = () => { closeMap(); if (S.phase === 'explore') setRunning(true); };
  if ($('sheet')) $('sheet').onclick = e => { if (e.target === $('sheet')) closeSheet(); };
  if ($('openGearFull')) $('openGearFull').onclick = () => openInv();
  renderHome(); showNav('home');

  function showPick() {
    const el = $('pick'), offer = S.offer || [];
    setRunning(false);
    el.innerHTML = `<span class="eyebrow">${(S.floorI || 0) + 1}/${S.nFloors || S.nBlocks}층 클리어</span><h2>런 강화</h2>
      <p>이번 던전 런에만 유지됩니다. 영구 스킬 해방이 아닙니다. 잡몹 장비는 극악 확률이고, 본보상은 보스입니다.</p>
      <div class="pick-cards">${offer.map(a => `<button class="pick-card" data-id="${a.id}"><span class="tag">${a.tag}</span><b>${a.name}</b><span>${a.desc}</span></button>`).join('')}</div>
      ${(S.augments || []).length ? `<div class="augchips">${S.augments.map(id => { const a = AUGMENTS.find(x => x.id === id); return a ? `<i>${a.name}</i>` : ''; }).join('')}</div>` : ''}`;
    el.hidden = false;
    el.querySelectorAll('.pick-card').forEach(btn => btn.onclick = () => {
      if (S.phase !== 'pick') return;
      applyAugment(S, btn.dataset.id);
      el.hidden = true;
      el.innerHTML = '';
      updateStrip();
      setRunning(true);
    });
  }

  function showResult() {
    const R = S.result, el = $('result'), t = Math.floor(R.time);
    const best = R.loot.slice().sort((a, b) => b.rar - a.rar || b.ilvl - a.ilvl).slice(0, 5);
    const where = R.win ? '' : R.bossReached ? (R.bossHp != null ? ` · 보스 남은 체력 ${Math.round(R.bossHp * 100)}%` : '') : ' · 보스에 닿기 전 전멸';
    const augs = (R.augments || []).map(id => AUGMENTS.find(x => x.id === id)).filter(Boolean);
    const wst = worldStageById(S.worldId || 1);
    const nextId = (R.win && wst.id < WORLD_STAGES.length) ? wst.id + 1 : 0;
    el.innerHTML = `<span class="eyebrow">스테이지 ${wst.id} ${wst.name}${R.win ? ' · 클리어' : ' · 패배'}</span><h2>${R.win ? '고르바크 처치' : '파티 전멸'}</h2>
      <div class="rewards"><div class="gold"><b>+${fmt(R.run.gold)}</b><span>골드</span></div><div><b>+${fmt(R.run.xp)}</b><span>경험치</span></div><div><b>${R.run.lvlUps ? '+' + R.run.lvlUps : '0'}</b><span>레벨 업</span></div><div><b>${R.loot.length}</b><span>장비</span></div></div>
      <div class="stat">시간 ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')} · 처치 ${R.kills} · 차단 ${R.interrupts}${where}<br>전투력 ${fmt(R.cp)} (권장 ${fmt(R.rec)})</div>
      ${augs.length ? `<div class="augchips">${augs.map(a => `<i title="${a.desc}">${a.name}</i>`).join('')}</div>` : ''}
      ${best.length ? `<div class="loot">${best.map(it => `<span class="r${it.rar}">${it.name}</span>`).join('')}</div>` : R.win ? '<p class="note">보스 장비와, 운 좋으면 잡몹 장비.</p>' : ''}
      ${R.win && R.tips.length === 1 && R.tips[0].sev === 'good' ? '' : `<ul class="tips">${R.tips.map(x => `<li class="${x.sev}"><b>${x.title}</b><span>${x.fix}</span></li>`).join('')}</ul>`}
      <div class="row">${nextId ? `<button class="btn primary" id="nextF">스테이지 ${nextId}</button>` : ''}<button class="btn" id="retry">다시</button><button class="btn" id="toMapBtn">맵</button>
        <button class="btn" id="toGear">장비${upCount() ? ' ▲' + upCount() : ''}</button>${R.win ? '' : '<button class="btn" id="toRules">전술 수정</button>'}</div>`;
    el.hidden = false;
    el.querySelector('#retry').onclick = () => newRun(true);
    if (el.querySelector('#nextF')) el.querySelector('#nextF').onclick = () => startStage(nextId);
    el.querySelector('#toMapBtn').onclick = () => { el.hidden = true; openMap(); };
    el.querySelector('#toGear').onclick = () => openInv();
    if (el.querySelector('#toRules')) el.querySelector('#toRules').onclick = () => showNav('heroes');
  }

  // ---------- 렌더링 ----------
  const circle = (x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); };
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // ---------- 장비에 따른 외형 (look) ----------
  // 칸마다 {rar, tier}; tier = 아이템 레벨 구간(0~3). fx = 무기 등급(스킬 이펙트 단계), uq = 고유 무기 여부, tr = 눈에 띄는 옵션
  const ilvTier = l => l >= 26 ? 3 : l >= 16 ? 2 : l >= 8 ? 1 : 0;
  function buildLook(gear, role) {
    const L = { n: 0, rarCnt: 0, uqCnt: 0, tr: {} };
    for (const [sl] of SLOTS) { const it = gear[role][sl]; if (!it) continue; L[sl] = { rar: it.rar, tier: ilvTier(it.ilvl) }; L.n++; if (it.rar >= 2) L.rarCnt++; if (it.rar === 3) L.uqCnt++; }
    const g = heroGearStats(gear, role); L.tr = g;
    L.fx = L.weapon ? L.weapon.rar : 0; L.uq = !!(L.weapon && L.weapon.rar === 3);
    return L;
  }
  const lookCache = {};
  function lookOf(role) { if (!lookCache[role]) lookCache[role] = buildLook(P.gear, role); return lookCache[role]; }
  function resetLooks() { for (const r of ROLE_ORDER) delete lookCache[r]; }
  function previewLook(role, it) { const g = {}; g[role] = Object.assign({}, P.gear[role]); g[role][it.slot] = it; return buildLook(g, role); }
  const rarCol = r => C['r' + r];
  const fxCol = (role, tier) => tier >= 1 ? C['r' + tier] : C[role];

  // ---------- 캐릭터 그리기 (역할 실루엣 + 장비) ----------
  function rrect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function star(c, x, y, r1, r2, n, rot) { c.beginPath(); for (let i = 0; i < n * 2; i++) { const a = rot + i * Math.PI / n, r = i % 2 ? r2 : r1; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } c.closePath(); }
  function hexagon(c, x, y, r) { c.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } c.closePath(); }
  function glow(c, col, a, x, y, r) { c.save(); c.globalAlpha *= a; c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); c.restore(); }
  function drawHero(c, role, x, y, s, o) {
    o = o || {};
    const L = o.look || { n: 0, tr: {} };
    const stage = o.stage != null ? o.stage : ((P.stages && P.stages[role]) || 0);
    const col = C[role], ink = C.void, f = o.face || 1, sw = o.swing || 0, t = o.t || 0;
    const bob = o.moving ? Math.sin(t * 14) * 1.2 : 0;
    const W = L.weapon, OH = L.offhand, HM = L.helm, CH = L.chest, GL = L.gloves, BT = L.boots;
    const scMul = 1 + stage * 0.06;
    c.save(); c.translate(x, y + bob); c.scale(s * scMul, s * scMul);
    c.lineJoin = 'round'; c.lineCap = 'round';
    // 발밑: 그림자 + 단계 오라
    c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(0, 13, 10 + stage, 3.2 + stage * 0.3, 0, 0, Math.PI * 2); c.fill();
    if (stage >= 1) {
      c.save(); c.globalAlpha *= 0.35 + 0.15 * Math.sin(t * 3);
      c.strokeStyle = stage >= 2 ? C.r3 : C.tape; c.lineWidth = 1.4;
      c.beginPath(); c.ellipse(0, 13, 14 + stage * 2, 4.5 + stage, 0, 0, Math.PI * 2); c.stroke();
      c.restore();
    }
    if (L.uqCnt) { c.save(); c.globalAlpha *= 0.55 + 0.25 * Math.sin(t * 3); c.strokeStyle = C.r3; c.lineWidth = 1.2; c.setLineDash([2, 2.5]); c.lineDashOffset = -t * 8; c.beginPath(); c.ellipse(0, 13, 13 + L.uqCnt, 4.4, 0, 0, Math.PI * 2); c.stroke(); c.restore(); }
    else if (L.rarCnt >= 3) { c.save(); c.globalAlpha *= 0.4; c.strokeStyle = C.r2; c.lineWidth = 1; c.beginPath(); c.ellipse(0, 13, 12, 4, 0, 0, Math.PI * 2); c.stroke(); c.restore(); }
    // 망토 (갑옷 고유) / 도적 망토 자락
    if (CH && CH.rar === 3) { c.fillStyle = ink; c.beginPath(); c.moveTo(-7, -3); c.quadraticCurveTo(-13 * f, 6 + Math.sin(t * 4) * 1.5, -9 * f, 14); c.lineTo(8 * -f + (f > 0 ? 6 : -6), 14); c.lineTo(7, -3); c.closePath(); c.fill(); c.strokeStyle = C.r3; c.lineWidth = 1; c.stroke(); }
    else if (role === 'rogue' || role === 'hunter') { c.fillStyle = ink; c.beginPath(); c.moveTo(-6, -2); c.lineTo(-11 * f, 10); c.lineTo(6, 4); c.closePath(); c.fill(); }
    // 뒤쪽 무기 (치유사 지팡이)
    if (role === 'healer') { const len = 16 + (W ? W.tier * 3 : 0); c.strokeStyle = W ? rarCol(W.rar) : C.muted; c.lineWidth = 2.2 + (W && W.rar >= 2 ? 0.6 : 0); c.beginPath(); c.moveTo(10 * f, 13); c.lineTo(10 * f, 13 - len - 16); c.stroke(); }
    // 장화
    if (BT) { c.fillStyle = rarCol(BT.rar); c.fillRect(-7, 10, 5, 3.5); c.fillRect(2, 10, 5, 3.5); if (BT.tier >= 2) { c.fillStyle = C.panel; c.fillRect(-7, 10, 5, 1); c.fillRect(2, 10, 5, 1); } }
    // 몸 + 갑옷
    c.fillStyle = col; rrect(c, -8, -3, 16, 15, 4); c.fill(); c.strokeStyle = ink; c.lineWidth = 1.2; c.stroke();
    if (CH) {
      const cc = rarCol(CH.rar);
      c.fillStyle = cc; c.fillRect(-8, 4, 16, 2.5); // 허리띠
      if (CH.tier >= 1) { c.strokeStyle = cc; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-5, -2); c.lineTo(0, 3); c.lineTo(5, -2); c.stroke(); } // 가슴 장식
      if (CH.rar >= 2) { c.fillStyle = cc; rrect(c, -11, -4, 6, 4.5, 2); c.fill(); rrect(c, 5, -4, 6, 4.5, 2); c.fill(); c.strokeStyle = ink; c.lineWidth = 0.8; rrect(c, -11, -4, 6, 4.5, 2); c.stroke(); rrect(c, 5, -4, 6, 4.5, 2); c.stroke(); } // 어깨 갑옷
    } else if (role === 'tank') { c.fillStyle = C.wall; c.fillRect(-8, 3, 16, 3); }
    if (role === 'healer') { c.fillStyle = C.panel; c.fillRect(-1.5, -2, 3, 13); c.fillRect(-5, 2, 10, 3); }
    // 가시 옵션: 몸에 가시
    if ((L.tr.thorns || 0) >= 20) { c.fillStyle = C.ink; for (const [px, py, a] of [[-8, 2, Math.PI], [8, 2, 0], [-6, 11, 2.4], [6, 11, 0.7]]) { c.beginPath(); c.moveTo(px + Math.cos(a - 0.5) * 1.5, py + Math.sin(a - 0.5) * 1.5); c.lineTo(px + Math.cos(a) * 4, py + Math.sin(a) * 4); c.lineTo(px + Math.cos(a + 0.5) * 1.5, py + Math.sin(a + 0.5) * 1.5); c.fill(); } }
    // 진화/각성 실루엣 장식
    if (stage >= 1) {
      c.strokeStyle = stage >= 2 ? C.r3 : C.tape; c.lineWidth = 1.2;
      if (role === 'tank') { c.fillStyle = stage >= 2 ? C.r3 : C.wall; c.beginPath(); c.moveTo(-10, -4); c.lineTo(-14, 2); c.lineTo(-9, 6); c.closePath(); c.fill(); c.beginPath(); c.moveTo(10, -4); c.lineTo(14, 2); c.lineTo(9, 6); c.closePath(); c.fill(); }
      if (role === 'healer') { glow(c, stage >= 2 ? C.r3 : C.heal, 0.45, 0, -20, 8 + stage * 2); }
      if (role === 'mage') { c.fillStyle = stage >= 2 ? C.r3 : C.shadow; star(c, -11, -6, 3.5, 1.4, 5, t); c.fill(); star(c, 11, -6, 3.5, 1.4, 5, t + 1); c.fill(); }
      if (role === 'rogue') { c.fillStyle = ink; c.globalAlpha *= 0.7; c.beginPath(); c.moveTo(-8, -2); c.quadraticCurveTo(-16 * f, 4, -12 * f, 12); c.lineTo(-4, 6); c.closePath(); c.fill(); c.globalAlpha /= 0.7; }
      if (role === 'hunter') { c.strokeStyle = stage >= 2 ? C.r3 : C.hunter; c.lineWidth = 1.5; c.beginPath(); c.arc(0, 2, 16 + stage * 2, -0.4, Math.PI + 0.4); c.stroke(); }
    }
    if (stage >= 2) {
      c.save(); c.globalAlpha *= 0.5 + 0.3 * Math.sin(t * 4);
      c.strokeStyle = C.r3; c.lineWidth = 1; hexagon(c, 0, 2, 18); c.stroke();
      c.restore();
    }
    // 머리
    c.fillStyle = C.unit; c.beginPath(); c.arc(0, -8, 6.5, 0, Math.PI * 2); c.fill(); c.strokeStyle = ink; c.lineWidth = 1.2; c.stroke();
    if (role === 'tank') {
      const hc = HM ? rarCol(HM.rar) : C.wall;
      c.fillStyle = hc; c.beginPath(); c.arc(0, -8, 7, Math.PI, 0); c.lineTo(7, -6); c.lineTo(-7, -6); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = ink; c.fillRect(-4 + f, -7, 8, 1.6);
      if (HM && HM.rar === 3) { c.fillStyle = C.r3; for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx * 5, -12); c.quadraticCurveTo(sx * 12, -15, sx * 11, -22); c.lineTo(sx * 7, -13); c.closePath(); c.fill(); } } // 군주의 뿔
      else if (HM && HM.tier >= 1) { c.fillStyle = col; c.beginPath(); c.moveTo(-1.5, -15); c.quadraticCurveTo(-8 * f, -22 - HM.tier * 2, -10 * f, -14); c.lineTo(1.5, -14); c.closePath(); c.fill(); } // 깃털 장식
      else { c.fillStyle = col; c.fillRect(-1, -16, 2, 4); }
    }
    if (role === 'healer') {
      const hc = HM ? rarCol(HM.rar) : C.tape, hw = 6 + (HM ? HM.tier : 0);
      c.strokeStyle = hc; c.lineWidth = 1.6; c.beginPath(); c.ellipse(0, -17, hw, 1.8, 0, 0, Math.PI * 2); c.stroke();
      if (HM && HM.rar === 3) { c.globalAlpha *= 0.6; c.beginPath(); c.ellipse(0, -20, hw + 3, 2.4, 0, 0, Math.PI * 2); c.stroke(); c.globalAlpha /= 0.6; }
      if (HM) { c.fillStyle = hc; c.beginPath(); c.arc(0, -8, 7, Math.PI * 1.1, Math.PI * 1.9); c.lineTo(4, -10); c.lineTo(-4, -10); c.closePath(); c.fill(); } // 두건
    }
    if (role === 'mage') {
      const hh = 17 + (HM ? HM.tier * 2.5 : 0);
      c.fillStyle = col; c.strokeStyle = ink; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(-9, -10); c.lineTo(9, -10); c.lineTo(4 * f, -10 - hh); c.closePath(); c.fill(); c.stroke();
      if (HM) { c.fillStyle = rarCol(HM.rar); c.fillRect(-8.5, -12.5, 17, 2.5); } // 모자 띠
      const sc = HM && HM.rar === 3 ? C.r3 : C.tape;
      if (HM && HM.rar >= 2) { glow(c, sc, 0.4 + 0.3 * Math.sin(t * 5), 4 * f, -10 - hh, 4); c.fillStyle = sc; star(c, 4 * f, -10 - hh, 3.2, 1.3, 5, t); c.fill(); }
      else { c.fillStyle = C.tape; c.beginPath(); c.arc(1.5 * f, -18, 1.5, 0, Math.PI * 2); c.fill(); }
    }
    if (role === 'rogue') {
      c.fillStyle = HM ? (HM.rar >= 2 ? rarCol(HM.rar) : ink) : ink;
      c.beginPath(); c.arc(0, -9, 7.5, Math.PI * 1.05, Math.PI * 1.95); c.lineTo(5, -3); c.lineTo(-5, -3); c.closePath(); c.fill();
      if (HM && HM.rar >= 1) { c.fillStyle = ink; c.fillRect(-6, -7.5, 12, 3); } // 복면
      if (HM && HM.rar === 3) { c.fillStyle = C.ink; c.beginPath(); c.moveTo(5 * f, -7); c.lineTo(11 * f, -5); c.lineTo(5 * f, -4); c.closePath(); c.fill(); } // 까마귀 부리 가면
      c.fillStyle = HM && HM.rar >= 2 ? C.r2 : col; c.fillRect(-3 + f * 1.5, -9, 2, 1.6); c.fillRect(1 + f * 1.5, -9, 2, 1.6);
    }
    if (role === 'hunter') {
      const hc = HM ? rarCol(HM.rar) : col;
      c.fillStyle = hc; c.beginPath(); c.arc(0, -9, 7.2, Math.PI * 1.05, Math.PI * 1.95); c.lineTo(6, -5); c.lineTo(-6, -5); c.closePath(); c.fill();
      c.fillStyle = ink; c.fillRect(-7, -8, 14, 2.2);
      c.fillStyle = HM && HM.rar >= 2 ? rarCol(HM.rar) : C.tape;
      c.beginPath(); c.moveTo(5 * f, -12); c.quadraticCurveTo(12 * f, -18 - (HM ? HM.tier : 0), 10 * f, -8); c.lineTo(4 * f, -10); c.closePath(); c.fill();
      if (HM && HM.rar === 3) { c.fillStyle = C.r3; c.beginPath(); c.arc(0, -14, 2.2, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = col; c.fillRect(-3 + f, -8.5, 2, 1.5); c.fillRect(1 + f, -8.5, 2, 1.5);
    }
    // 장갑 (손)
    const hand = GL ? rarCol(GL.rar) : C.unit;
    // 앞쪽 무기·보조무기
    if (role === 'tank') {
      const len = 16 + (W ? W.tier * 3 : 0), bc = W ? rarCol(W.rar) : C.ink;
      c.save(); c.translate(9 * f, 3); c.rotate(f * (-0.9 + sw * 2.0));
      if (W && W.rar >= 2) { c.save(); c.globalAlpha *= 0.35; c.strokeStyle = bc; c.lineWidth = 6; c.beginPath(); c.moveTo(0, -3); c.lineTo(0, -len); c.stroke(); c.restore(); }
      c.strokeStyle = bc; c.lineWidth = 2.6 + (W ? W.tier * 0.4 : 0); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -len); c.stroke();
      c.strokeStyle = C.ink; c.lineWidth = 2; c.beginPath(); c.moveTo(-3.5 - (W ? W.tier : 0), -2); c.lineTo(3.5 + (W ? W.tier : 0), -2); c.stroke();
      c.fillStyle = hand; c.beginPath(); c.arc(0, 0, 2.4, 0, Math.PI * 2); c.fill(); c.restore();
      const shw = 10 + (OH ? OH.tier * 1.5 : 0), shh = 13 + (OH ? OH.tier * 1.5 : 0), sx = -15 * f - shw / 2;
      c.fillStyle = C.panel; c.strokeStyle = OH ? rarCol(OH.rar) : col; c.lineWidth = 2 + (OH && OH.rar >= 2 ? 0.8 : 0); rrect(c, sx, -3 - (shh - 13) / 2, shw, shh, 3); c.fill(); c.stroke();
      c.fillStyle = OH ? rarCol(OH.rar) : col; c.fillRect(-15 * f - 1, -1, 2, 9); c.fillRect(-15 * f - 4, 3, 8, 2);
      if (OH && OH.rar === 3) { c.fillStyle = C.r3; star(c, -15 * f, 3.5, 3, 1.4, 4, 0); c.fill(); }
    }
    if (role === 'healer') {
      const oc = W ? rarCol(W.rar) : C.heal, orr = 3 + (W ? W.tier * 0.6 : 0), oy = -18 - (W ? W.tier * 3 : 0);
      const g = 0.6 + 0.4 * Math.sin(t * 5);
      glow(c, oc, 0.35 * g, 10 * f, oy, orr * 2);
      c.fillStyle = oc; c.beginPath(); c.arc(10 * f, oy, orr, 0, Math.PI * 2); c.fill();
      if (W && W.rar === 3) { c.strokeStyle = C.r3; c.lineWidth = 1; for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(10 * f, oy); c.quadraticCurveTo(10 * f + sx * 9, oy - 6, 10 * f + sx * 11, oy + 2); c.stroke(); } } // 빛 날개
      // 보조무기: 성표/기도서
      if (OH) { c.fillStyle = rarCol(OH.rar); rrect(c, -13 * f - 3.5, 1, 7, 8, 1.5); c.fill(); c.fillStyle = C.panel; c.fillRect(-13 * f - 0.6, 2.5, 1.2, 5); c.fillRect(-13 * f - 2.2, 4, 4.4, 1.2); }
      c.fillStyle = hand; c.beginPath(); c.arc(9 * f, 4, 2.2, 0, Math.PI * 2); c.fill();
    }
    if (role === 'mage') {
      const oc = W ? rarCol(W.rar) : col, orr = 3.6 + (W ? W.tier * 0.7 : 0), g = 0.6 + 0.4 * Math.sin(t * 6);
      c.strokeStyle = C.ink; c.lineWidth = 1.6; c.beginPath(); c.moveTo(8 * f, 9); c.lineTo(12 * f, 2 + orr); c.stroke();
      glow(c, oc, 0.35 * g, 12 * f, 2, orr * 2);
      if (W && W.rar === 3) { c.fillStyle = C.r3; star(c, 12 * f, 2, orr + 1.5, orr * 0.5, 5, t * 2); c.fill(); }
      else { c.fillStyle = oc; c.beginPath(); c.arc(12 * f, 2, orr, 0, Math.PI * 2); c.fill(); c.strokeStyle = C.panel; c.lineWidth = 1; c.stroke(); }
      if (OH) { const a = t * 2; glow(c, rarCol(OH.rar), 0.5, -12 * f + Math.cos(a) * 2, -4 + Math.sin(a) * 2, 3); c.fillStyle = rarCol(OH.rar); c.beginPath(); c.arc(-12 * f + Math.cos(a) * 2, -4 + Math.sin(a) * 2, 2, 0, Math.PI * 2); c.fill(); } // 떠다니는 보조 구슬
      c.fillStyle = hand; c.beginPath(); c.arc(9 * f, 7, 2.2, 0, Math.PI * 2); c.fill();
    }
    if (role === 'rogue') {
      const items = [[1, W], [-1, OH]];
      for (const [side, it] of items) {
        const len = 10 + (it ? it.tier * 2.5 : 0);
        c.save(); c.translate(8 * side, 5); c.rotate(side * (0.6 - sw * 1.6));
        if (it && it.rar >= 2) { c.save(); c.globalAlpha *= 0.35; c.strokeStyle = rarCol(it.rar); c.lineWidth = 5; c.beginPath(); c.moveTo(0, -2); c.lineTo(0, -len); c.stroke(); c.restore(); }
        c.strokeStyle = it ? rarCol(it.rar) : C.panel; c.lineWidth = 2 + (it ? it.tier * 0.3 : 0); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -len); c.stroke();
        c.fillStyle = hand; c.beginPath(); c.arc(0, 0, 2.1, 0, Math.PI * 2); c.fill(); c.restore();
      }
    }
    // 옵션 반짝임: 매직 아이템 발견·골드
    if ((L.tr.mf || 0) >= 20 && o.world) { const k = (t * 1.3) % 1; c.save(); c.globalAlpha *= 1 - k; c.fillStyle = C.r1; star(c, -9 + 18 * ((t * 0.37) % 1), -14 - k * 8, 2.4, 0.8, 4, 0); c.fill(); c.restore(); }
    if ((L.tr.gold || 0) >= 30 && o.world) { const k = (t * 1.1 + 0.5) % 1; c.save(); c.globalAlpha *= 1 - k; c.fillStyle = C.gold; c.beginPath(); c.arc(8 - 16 * ((t * 0.29) % 1), -10 - k * 7, 1.6, 0, Math.PI * 2); c.fill(); c.restore(); }
    c.restore();
  }

  // ---------- 적 실루엣 (종류마다 다른 형태) ----------
  function mobBody(c, w, h, col, ink) {
    c.fillStyle = col; rrect(c, -w / 2, -h * 0.25, w, h, 4); c.fill();
    c.strokeStyle = ink; c.lineWidth = 1.2; c.stroke();
  }
  function mobHead(c, y, r, col, ink) {
    c.fillStyle = col; c.beginPath(); c.arc(0, y, r, 0, Math.PI * 2); c.fill();
    c.strokeStyle = ink; c.lineWidth = 1.2; c.stroke();
  }
  function drawEnemy(c, e, o) {
    o = o || {};
    const f = o.face || 1, t = o.t || 0, sw = o.swing || 0;
    const bob = o.moving ? Math.sin(t * 11 + (e.id || 0)) * 1.1 : 0;
    const ink = C.void, skin = C.wall;
    const body = o.flash ? C.panel : e.boss ? C.boss : C.enemy;
    const sc = Math.max(0.85, (e.r || 11) / 12);
    c.save();
    if (!e.alive) {
      c.globalAlpha = .32; c.translate(e.x, e.y + 8); c.rotate(-0.9 * f);
      c.fillStyle = body; rrect(c, -6, -4, 18, 11, 4); c.fill();
      c.strokeStyle = ink; c.lineWidth = 1.2; c.stroke();
      c.fillStyle = skin; c.beginPath(); c.arc(-8, -2, 5, 0, Math.PI * 2); c.fill(); c.stroke();
      c.restore(); return;
    }
    c.translate(e.x, e.y + bob); c.scale(sc, sc);
    c.lineJoin = 'round'; c.lineCap = 'round';
    c.fillStyle = 'rgba(0,0,0,.22)'; c.beginPath(); c.ellipse(0, 14, e.boss ? 16 : 10, e.boss ? 4.5 : 3.2, 0, 0, Math.PI * 2); c.fill();
    if (e.enraged) { c.save(); c.globalAlpha = 0.35 + 0.2 * Math.sin(t * 8); c.strokeStyle = C.hurt; c.lineWidth = 2; c.beginPath(); c.ellipse(0, 14, 18, 5.5, 0, 0, Math.PI * 2); c.stroke(); c.restore(); }
    const key = e.key;
    if (key === 'brute') {
      c.fillStyle = skin; c.fillRect(-6, 9, 5, 4); c.fillRect(2, 9, 5, 4);
      mobBody(c, 22, 16, body, ink);
      c.fillStyle = ink; c.beginPath(); c.moveTo(-11, -2); c.lineTo(-15, -8); c.lineTo(-8, -1); c.fill(); c.beginPath(); c.moveTo(11, -2); c.lineTo(15, -8); c.lineTo(8, -1); c.fill();
      mobHead(c, -9, 7.2, skin, ink);
      c.fillStyle = ink; c.fillRect(-4, -14, 8, 4);
      c.fillStyle = body; c.fillRect(-3.2 * f, -10, 2.2, 1.5); c.fillRect(1.2 * f, -10, 2.2, 1.5);
      c.save(); c.translate(14 * f, 8); c.rotate(f * (0.85 - sw * 1.1));
      c.fillStyle = C.ink; c.strokeStyle = C.void; c.lineWidth = 1.1;
      c.beginPath(); c.moveTo(-2.2, 3); c.lineTo(2.2, 3); c.lineTo(2.2, -11); c.lineTo(-2.2, -11); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.ellipse(0, -14, 6.2, 5, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      c.restore();
    } else if (key === 'caster' || key === 'mender') {
      const accent = key === 'mender' ? C.eheal : C.shadow;
      c.fillStyle = body; c.beginPath(); c.moveTo(-9, 13); c.lineTo(9, 13); c.lineTo(7, -4); c.lineTo(-7, -4); c.closePath(); c.fill();
      c.strokeStyle = ink; c.lineWidth = 1.2; c.stroke();
      mobHead(c, -8, 5.6, skin, ink);
      c.fillStyle = key === 'mender' ? C.eheal : ink;
      c.beginPath(); c.moveTo(-8, -8); c.lineTo(8, -8); c.lineTo(3 * f, -22); c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = accent; c.lineWidth = 2.2; c.beginPath(); c.moveTo(9 * f, 12); c.lineTo(9 * f, -14); c.stroke();
      const g = 0.55 + 0.45 * Math.sin(t * 5);
      glow(c, accent, 0.45 * g, 9 * f, -16, 6);
      c.fillStyle = accent; c.beginPath(); c.arc(9 * f, -16, 2.6, 0, Math.PI * 2); c.fill();
      if (key === 'mender') { c.strokeStyle = C.panel; c.lineWidth = 1.2; c.beginPath(); c.moveTo(9 * f, -18); c.lineTo(9 * f, -14); c.moveTo(7 * f, -16); c.lineTo(11 * f, -16); c.stroke(); }
    } else if (key === 'poisoner') {
      c.fillStyle = ink; c.beginPath(); c.moveTo(-5, -2); c.lineTo(-10 * f, 11); c.lineTo(5, 4); c.closePath(); c.fill();
      c.fillStyle = skin; c.fillRect(-5, 10, 4, 3); c.fillRect(2, 10, 4, 3);
      mobBody(c, 13, 13, body, ink);
      mobHead(c, -8, 5.4, skin, ink);
      c.fillStyle = ink; c.beginPath(); c.arc(0, -9, 6.2, Math.PI * 1.05, Math.PI * 1.95); c.lineTo(4, -4); c.lineTo(-4, -4); c.closePath(); c.fill();
      c.fillStyle = C.poison; c.fillRect(-2.4 + f, -9, 1.8, 1.4); c.fillRect(0.8 + f, -9, 1.8, 1.4);
      c.save(); c.translate(7 * f, 3); c.rotate(f * (0.15 - sw * 0.5));
      c.strokeStyle = C.ink; c.lineWidth = 2.2; c.beginPath(); c.arc(-2 * f, 2, 11, -1.2, 1.05); c.stroke();
      c.strokeStyle = C.poison; c.lineWidth = 1.8; c.beginPath(); c.moveTo(-2 * f, -8); c.lineTo(8 * f, -2); c.stroke();
      c.fillStyle = C.poison; c.beginPath(); c.moveTo(8 * f, -2); c.lineTo(5 * f, -4.2); c.lineTo(5.4 * f, 0.2); c.closePath(); c.fill();
      c.restore();
    } else if (key === 'add') {
      c.fillStyle = C.wall; c.strokeStyle = ink; c.lineWidth = 1.3;
      c.beginPath(); c.ellipse(0, 8, 10, 6, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      c.beginPath(); c.ellipse(-1, -1, 8, 7, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      c.beginPath(); c.ellipse(1, -9, 5.5, 5, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      c.strokeStyle = C.tape; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-3, 6); c.lineTo(1, 1); c.lineTo(-2, -6); c.stroke();
      c.fillStyle = C.tape; c.fillRect(-2, -10, 2, 2); c.fillRect(2, -10, 2, 2);
    } else if (key === 'boss') {
      c.fillStyle = skin; c.fillRect(-8, 10, 6, 5); c.fillRect(3, 10, 6, 5);
      mobBody(c, 26, 18, body, ink);
      c.fillStyle = C.wall; rrect(c, -16, -6, 8, 6, 2); c.fill(); rrect(c, 8, -6, 8, 6, 2); c.fill();
      c.strokeStyle = ink; c.lineWidth = 1; rrect(c, -16, -6, 8, 6, 2); c.stroke(); rrect(c, 8, -6, 8, 6, 2); c.stroke();
      mobHead(c, -12, 8, skin, ink);
      c.fillStyle = C.wall; c.beginPath(); c.arc(0, -13, 8.5, Math.PI, 0); c.lineTo(8.5, -10); c.lineTo(-8.5, -10); c.closePath(); c.fill(); c.strokeStyle = ink; c.stroke();
      c.fillStyle = C.ink; c.strokeStyle = C.void; c.lineWidth = 1;
      for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx * 4, -16); c.quadraticCurveTo(sx * 11, -20, sx * 9, -26); c.lineTo(sx * 5, -16); c.closePath(); c.fill(); c.stroke(); }
      c.fillStyle = e.enraged ? C.hurt : C.tape; c.fillRect(-4, -13, 3, 2); c.fillRect(1.5, -13, 3, 2);
      c.save(); c.translate(15 * f, 4); c.rotate(f * (-0.55 + sw * 1.3));
      c.fillStyle = C.ink; c.strokeStyle = C.void; c.lineWidth = 1.1;
      c.beginPath(); c.moveTo(-2.4, 4); c.lineTo(2.4, 4); c.lineTo(2.4, -16); c.lineTo(-2.4, -16); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(-9, -15); c.lineTo(9, -15); c.lineTo(7, -22); c.lineTo(-7, -22); c.closePath(); c.fill(); c.stroke();
      c.restore();
      if (e.strikeWarn > 0) { c.save(); c.globalAlpha = 0.85; c.strokeStyle = C.tape; c.lineWidth = 2; c.setLineDash([4, 3]); c.beginPath(); c.ellipse(0, 15, 22, 6, 0, 0, Math.PI * 2); c.stroke(); c.restore(); }
    } else {
      c.fillStyle = skin; c.fillRect(-5, 10, 4, 3); c.fillRect(2, 10, 4, 3);
      if (e.champ) { c.fillStyle = ink; c.beginPath(); c.moveTo(-6, -3); c.quadraticCurveTo(-12 * f, 8, -8 * f, 13); c.lineTo(4, 2); c.closePath(); c.fill(); }
      mobBody(c, 15, 14, body, ink);
      c.fillStyle = C.wall; c.fillRect(-7.5, 2, 15, 2.5);
      mobHead(c, -8, 5.8, skin, ink);
      c.fillStyle = ink; c.beginPath(); c.arc(0, -9, 6.4, Math.PI * 1.15, Math.PI * 1.85); c.lineTo(4, -6); c.lineTo(-4, -6); c.closePath(); c.fill();
      c.fillStyle = body; c.fillRect(-2.6 + f, -9, 1.8, 1.4); c.fillRect(1 + f, -9, 1.8, 1.4);
      c.save(); c.translate(9 * f, 6); c.rotate(f * (0.45 - sw * 1.35));
      c.fillStyle = C.ink; c.strokeStyle = C.void; c.lineWidth = 1;
      c.beginPath(); c.moveTo(-1.6, 2); c.lineTo(1.6, 2); c.lineTo(1.1, -12); c.lineTo(-1.1, -12); c.closePath(); c.fill(); c.stroke();
      c.fillRect(-3.4, -1.5, 6.8, 2.2);
      c.restore();
    }
    if (e.champ && key !== 'boss') { c.save(); c.globalAlpha = 0.9; c.strokeStyle = C.champ; c.lineWidth = 1.4; c.beginPath(); c.arc(0, 0, 16, 0, Math.PI * 2); c.stroke(); c.restore(); }
    c.restore();
  }
  // 카드 초상화
  function drawPortraits() {
    for (const r of ROLE_ORDER) { const cvp = cards[r] && cards[r].pc; if (!cvp) continue; const c = cvp.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cvp.width, cvp.height); drawHero(c, r, cvp.width / 2 + 2, cvp.height / 2 + 9, cvp.width / 46, { face: 1, t: performance.now() / 1000, look: lookOf(r), stage: (S.heroes.find(h => h.role === r) || {}).stage || (P.stages && P.stages[r]) || 0 }); }
  }
  let ultFx = null; // 화면 전체 궁극기 연출
  // ---------- 스킬 이펙트 (스킬마다 모양이 다르고, 무기 등급·고유 무기·옵션에 따라 달라짐) ----------
  // 무기 등급 0~3: 크기 ↑, 색이 등급색으로, 희귀부터 파편, 고유 무기는 전용 연출
  function sparks(c, x, y, n, r, k, col, seed) { c.fillStyle = col; for (let i = 0; i < n; i++) { const a = seed + i * 2.399, d = r * (0.4 + k * 0.9) + (i % 3) * 4, s = 3 * (1 - k) + 0.8; c.globalAlpha = (1 - k) * 0.9; star(c, x + Math.cos(a) * d, y + Math.sin(a) * d, s, s * 0.35, 4, a); c.fill(); } }
  function feather(c, x, y, a, len) { c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = C.void; c.beginPath(); c.ellipse(0, 0, len, len * 0.28, 0, 0, Math.PI * 2); c.fill(); c.strokeStyle = C.muted; c.lineWidth = 0.6; c.beginPath(); c.moveTo(-len, 0); c.lineTo(len, 0); c.stroke(); c.restore(); }
  function drawSkill(f, k, rc) {
    const c = ctx, fade = 1 - k, Lk = lookOf(f.role), T = Lk.fx, U = Lk.uq, sc = 1 + 0.15 * T;
    const tc = fxCol(f.role, T);
    const seed = f.seed || 1.3;
    const healC = U && f.role === 'healer' ? C.r3 : T >= 2 && f.role === 'healer' ? C.r2 : C.heal;
    const cx = f.tx != null ? f.tx : f.x, cy = f.ty != null ? f.ty : f.y;
    switch (f.id) {
      case 'taunt': {
        c.globalAlpha = fade; c.setLineDash([5, 4]); c.strokeStyle = tc; c.lineWidth = 2; c.beginPath(); c.moveTo(f.x, f.y); c.lineTo(f.tx, f.ty); c.stroke(); c.setLineDash([]);
        const s = (1 + Math.max(0, 0.3 - k) * 3) * sc; c.font = `900 ${Math.round(22 * s)}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.lineWidth = 4; c.strokeStyle = C.void; c.strokeText('!', f.tx, f.ty - 26); c.fillStyle = T >= 2 ? tc : C.hurt; c.fillText('!', f.tx, f.ty - 26); break; }
      case 'bash': {
        c.globalAlpha = fade; c.fillStyle = C.panel; star(c, f.tx, f.ty, (10 + k * 10) * sc, 4 * sc, 6 + T, k); c.fill(); c.strokeStyle = tc; c.lineWidth = 2; c.stroke();
        c.fillStyle = tc; rrect(c, f.tx - 5, f.ty - 7, 10, 13, 3); c.fill(); break; }
      case 'clap': {
        const R = f.r * sc * (U ? 1.25 : 1);
        c.globalAlpha = fade; c.strokeStyle = tc; c.lineWidth = (5 + T * 1.5) * fade + 1; circle(f.x, f.y + 6, R * (0.2 + 0.8 * k)); c.stroke();
        c.strokeStyle = T >= 1 ? tc : C.tape; c.lineWidth = 2;
        const n = 6 + T * 2;
        for (let i = 0; i < n; i++) { const a = seed + i * Math.PI * 2 / n, r0 = 12, r1 = R * (0.3 + 0.7 * k); c.beginPath(); c.moveTo(f.x + Math.cos(a) * r0, f.y + Math.sin(a) * r0);
          for (let j = 1; j <= 3; j++) { const rr = r0 + (r1 - r0) * j / 3, jit = (j % 2 ? 6 : -6); c.lineTo(f.x + Math.cos(a) * rr - Math.sin(a) * jit, f.y + Math.sin(a) * rr + Math.cos(a) * jit); } c.stroke(); }
        if (U) { // 산을 쪼개는 자: 바위 파편이 튀어오름
          c.fillStyle = C.wall; c.strokeStyle = C.void; c.lineWidth = 1;
          for (let i = 0; i < 9; i++) { const a = seed + i * 0.7, d = R * 0.9 * k, h = Math.sin(k * Math.PI) * (14 + (i % 3) * 6), s = 5 - (i % 3); c.globalAlpha = fade; c.save(); c.translate(f.x + Math.cos(a) * d, f.y + 6 + Math.sin(a) * d * 0.6 - h); c.rotate(a + k * 4); c.fillRect(-s, -s, s * 2, s * 2); c.strokeRect(-s, -s, s * 2, s * 2); c.restore(); }
        }
        break; }
      case 'wall': { c.globalAlpha = fade; hexagon(c, f.x, f.y, (21 + 14 * (1 - k)) * sc); c.strokeStyle = tc; c.lineWidth = 3; c.stroke(); if (T >= 2) { hexagon(c, f.x, f.y, (27 + 10 * (1 - k)) * sc); c.lineWidth = 1.2; c.stroke(); } break; }
      case 'flash': {
        if (k < 0.4) { c.globalAlpha = 1 - k / 0.4; c.strokeStyle = healC; c.lineWidth = 5 + T * 1.5; c.beginPath(); c.moveTo(f.x + 10, f.y - 18); c.lineTo(f.tx, f.ty); c.stroke(); c.strokeStyle = C.panel; c.lineWidth = 1.5; c.stroke(); }
        c.globalAlpha = fade; c.fillStyle = healC;
        const n = 3 + T;
        for (let i = 0; i < n; i++) { const px = f.tx + (i - (n - 1) / 2) * 8, py = f.ty - 6 - k * 26 - (i % 2) * 5; c.fillRect(px - 1.5, py - 5, 3, 10); c.fillRect(px - 5, py - 1.5, 10, 3); }
        if (U) { c.strokeStyle = C.r3; c.lineWidth = 1.5; for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(f.tx, f.ty - 8); c.quadraticCurveTo(f.tx + sx * 18, f.ty - 26 - k * 8, f.tx + sx * 24, f.ty - 6); c.stroke(); } } // 새벽의 지팡이: 빛 날개
        break; }
      case 'rain': {
        c.strokeStyle = healC; c.lineWidth = 2;
        for (const [px, py] of f.pts) { c.globalAlpha = Math.min(1, fade * 1.5) * 0.25; c.fillStyle = healC; c.beginPath(); c.ellipse(px, py - 30, 18 * sc, 6, 0, 0, Math.PI * 2); c.fill(); c.globalAlpha = Math.min(1, fade * 1.5);
          const n = 6 + T * 2;
          for (let i = 0; i < n; i++) { const ox = ((i * 37 + seed * 10) % (30 * sc)) - 15 * sc, ph = (k * 3 + i / n) % 1, yy = py - 26 + ph * 30; c.beginPath(); c.moveTo(px + ox, yy); c.lineTo(px + ox - 1, yy + 5); c.stroke(); } }
        break; }
      case 'bubble': { const s = k < 0.3 ? k / 0.3 : 1; c.globalAlpha = fade; circle(f.tx, f.ty, 22 * s * sc); c.strokeStyle = healC; c.lineWidth = 3; c.stroke(); c.globalAlpha = fade * 0.3; c.fillStyle = healC; c.fill(); break; }
      case 'dispel': { c.globalAlpha = fade; c.fillStyle = T >= 1 ? healC : C.tape; for (const [px, py] of f.pts) for (let i = 0; i < 4 + T; i++) { const a = seed + i * 1.7; star(c, px + Math.cos(a) * 12, py - 10 + Math.sin(a) * 8 - k * 18, 5, 1.5, 4, k * 2); c.fill(); } break; }
      case 'fire': {
        const p = Math.min(1, k / 0.45), px = f.x + (f.tx - f.x) * p, py = f.y - 4 + (f.ty - f.y + 4) * p;
        const core = U ? C.r1 : T >= 2 ? C.r2 : C.crit, trail = U ? C.r3 : C.hurt, size = 5 * sc;
        if (p < 1) {
          const tl = 5 + T * 2;
          for (let i = tl - 1; i >= 0; i--) { const q = Math.max(0, p - i * 0.04), tx = f.x + (f.tx - f.x) * q, ty = f.y - 4 + (f.ty - f.y + 4) * q; c.globalAlpha = 0.9 / tl * (tl - i); c.fillStyle = trail; circle(tx, ty, size * 0.6 + (tl - i) * 0.9); c.fill(); }
          c.globalAlpha = 1; c.fillStyle = core;
          if (U) { star(c, px, py, size + 2, size * 0.45, 5, k * 12); c.fill(); } else { circle(px, py, size); c.fill(); }
        } else {
          const e = (k - 0.45) / 0.55; c.globalAlpha = 1 - e; c.fillStyle = core; star(c, f.tx, f.ty, (8 + e * 16) * sc, (4 + e * 6) * sc, 8, e); c.fill(); c.fillStyle = trail; circle(f.tx, f.ty, (5 + e * 8) * sc); c.fill();
          if (U) sparks(c, f.tx, f.ty, 10, 22, e, C.r1, seed); // 별을 부르는 봉: 별가루
        }
        break; }
      case 'bliz': { c.globalAlpha = fade; c.strokeStyle = T >= 2 ? tc : C.r1; c.lineWidth = 2 + T * 0.5; const n = 8 + T * 4; for (let i = 0; i < n; i++) { const a = i * Math.PI * 2 / n, r = 70 * sc * (1 - k); c.beginPath(); c.moveTo(f.tx + Math.cos(a) * r, f.ty + Math.sin(a) * r - 30 * (1 - k)); c.lineTo(f.tx + Math.cos(a) * (r - 8), f.ty + Math.sin(a) * (r - 8) - 30 * (1 - k) + 6); c.stroke(); } break; }
      case 'nova': {
        c.globalAlpha = fade; c.fillStyle = U ? C.r3 : T >= 2 ? tc : C.r1; c.strokeStyle = C.panel; c.lineWidth = 1;
        const n = 10 + T * 2, len = 16 * sc;
        for (let i = 0; i < n; i++) { const a = seed + i * Math.PI * 2 / n, r = f.r * sc * (0.35 + 0.65 * k); c.beginPath(); c.moveTo(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r); c.lineTo(f.x + Math.cos(a + 0.12) * (r - len), f.y + Math.sin(a + 0.12) * (r - len)); c.lineTo(f.x + Math.cos(a - 0.12) * (r - len), f.y + Math.sin(a - 0.12) * (r - len)); c.closePath(); c.fill(); c.stroke(); }
        break; }
      case 'blink': {
        c.globalAlpha = fade * 0.6; drawHero(c, 'mage', f.fx, f.fy, 1, { face: 1, t: 0, look: Lk }); c.globalAlpha = fade; c.setLineDash([2, 4]); c.strokeStyle = tc; c.lineWidth = 2; c.beginPath(); c.moveTo(f.fx, f.fy); c.lineTo(f.x, f.y); c.stroke(); c.setLineDash([]);
        circle(f.x, f.y, (10 + k * 16) * sc); c.stroke(); break; }
      case 'kick': { c.globalAlpha = fade; c.fillStyle = T >= 1 ? tc : C.tape; star(c, f.tx, f.ty - 4, (14 + k * 6) * sc, 5, 5, -0.3); c.fill(); c.strokeStyle = C.void; c.lineWidth = 1.5; c.stroke();
        c.strokeStyle = tc; c.lineWidth = 3; c.beginPath(); c.moveTo(f.x, f.y); c.lineTo(f.x + (f.tx - f.x) * Math.min(1, k * 3), f.y + (f.ty - f.y) * Math.min(1, k * 3)); c.stroke(); break; }
      case 'evis': {
        const Lx = 18 * sc * Math.min(1, k * 4); c.globalAlpha = fade; c.strokeStyle = C.panel; c.lineWidth = 6 + T;
        c.beginPath(); c.moveTo(f.tx - Lx, f.ty - Lx); c.lineTo(f.tx + Lx, f.ty + Lx); c.moveTo(f.tx + Lx, f.ty - Lx); c.lineTo(f.tx - Lx, f.ty + Lx);
        if (T >= 2) { c.moveTo(f.tx - Lx * 1.1, f.ty); c.lineTo(f.tx + Lx * 1.1, f.ty); }
        c.stroke(); c.strokeStyle = tc; c.lineWidth = 2.5; c.stroke();
        if (U) for (let i = 0; i < 6; i++) { const a = seed + i * 1.1, d = 8 + k * 26; c.globalAlpha = fade; feather(c, f.tx + Math.cos(a) * d, f.ty + Math.sin(a) * d + k * 10, a + k * 3, 5); } // 밤까마귀의 부리: 깃털
        break; }
      case 'fan': {
        c.globalAlpha = fade; c.fillStyle = U ? C.void : C.panel; c.strokeStyle = tc; c.lineWidth = 1.5;
        const n = 6 + T * 2;
        for (let i = 0; i < n; i++) { const a = seed + i * Math.PI * 2 / n + k * 6, r = f.r * sc * (0.3 + 0.7 * k); c.save(); c.translate(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r); c.rotate(a + Math.PI / 2); c.beginPath(); c.moveTo(0, -7 * sc); c.lineTo(3, 3); c.lineTo(-3, 3); c.closePath(); c.fill(); c.stroke(); c.restore(); }
        break; }
      case 'vanish': { c.fillStyle = C.muted; for (let i = 0; i < 8; i++) { const a = seed + i * 0.8, r = 6 + k * 22; c.globalAlpha = fade * 0.55; circle(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r * 0.6, 7 + k * 6); c.fill(); } if (U) for (let i = 0; i < 5; i++) { const a = seed + i * 1.3; c.globalAlpha = fade; feather(c, f.x + Math.cos(a) * (6 + k * 26), f.y - k * 20 + Math.sin(a) * 6, a, 5); } break; }
      case 'ult': { c.globalAlpha = fade; c.strokeStyle = tc; c.lineWidth = 6 * fade + 1; circle(f.x, f.y, (20 + 180 * k) * sc); c.stroke(); c.lineWidth = 2; circle(f.x, f.y, (10 + 120 * k) * sc); c.stroke(); break; }
    }
    // 희귀 이상 무기: 스킬마다 등급색 파편
    if (T >= 2 && f.id !== 'blink' && f.id !== 'vanish') { c.save(); sparks(c, cx, cy - 4, 4 + T * 2, 14 * sc, k, tc, seed * 3); c.restore(); }
  }
  function drawProp(id, x, y, ts) {
    const s = TILE;
    ctx.save();
    ctx.translate(x, y);
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    const flick = 0.65 + 0.35 * Math.sin((ts || 0) / 90 + x * 0.02);
    if (id === 'p_stalag' || id === 'p_spike') {
      ctx.fillStyle = C.wall; ctx.strokeStyle = C.ink;
      ctx.beginPath(); ctx.moveTo(s * 0.5, 4); ctx.lineTo(s - 6, s - 4); ctx.lineTo(6, s - 4); ctx.closePath(); ctx.fill(); ctx.stroke();
      if (id === 'p_spike') { ctx.beginPath(); ctx.moveTo(10, 8); ctx.lineTo(16, s - 6); ctx.lineTo(6, s - 6); ctx.closePath(); ctx.stroke(); }
    } else if (id === 'p_rubble') {
      ctx.fillStyle = C.muted;
      circle(10, 20, 6); ctx.fill(); circle(20, 16, 8); ctx.fill(); circle(16, 24, 5); ctx.fill();
    } else if (id === 'p_crate' || id === 'p_barrel') {
      ctx.fillStyle = C.eheal || C.rogue; ctx.strokeStyle = C.ink;
      if (id === 'p_barrel') { ctx.beginPath(); ctx.ellipse(s / 2, s / 2, 8, 11, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
      else { ctx.fillRect(7, 8, 18, 16); ctx.strokeRect(7, 8, 18, 16); ctx.beginPath(); ctx.moveTo(7, 8); ctx.lineTo(25, 24); ctx.moveTo(25, 8); ctx.lineTo(7, 24); ctx.stroke(); }
    } else if (id === 'p_pillar') {
      ctx.fillStyle = C.wall; ctx.strokeStyle = C.ink;
      ctx.fillRect(12, 4, 8, 24); ctx.strokeRect(12, 4, 8, 24); ctx.fillRect(8, 26, 16, 3);
    } else if (id === 'p_urn') {
      ctx.fillStyle = C.tape; ctx.strokeStyle = C.ink;
      ctx.beginPath(); ctx.moveTo(10, 8); ctx.lineTo(22, 8); ctx.lineTo(20, 26); ctx.lineTo(12, 26); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (id === 'p_crystal') {
      ctx.globalAlpha = 0.35 + 0.4 * flick; ctx.fillStyle = C.mage;
      ctx.beginPath(); ctx.moveTo(s / 2, 4); ctx.lineTo(s - 8, s / 2); ctx.lineTo(s / 2, s - 4); ctx.lineTo(8, s / 2); ctx.closePath(); ctx.fill();
    } else if (id === 'p_altar') {
      ctx.fillStyle = C.wall; ctx.strokeStyle = C.gold;
      ctx.fillRect(4, 16, 24, 10); ctx.strokeRect(4, 16, 24, 10);
      ctx.fillStyle = C.gold; circle(s / 2, 12, 4); ctx.fill();
    } else if (id === 'p_torch') {
      ctx.strokeStyle = C.ink; ctx.beginPath(); ctx.moveTo(s / 2, 26); ctx.lineTo(s / 2, 12); ctx.stroke();
      ctx.globalAlpha = flick; ctx.fillStyle = C.tape; circle(s / 2, 10, 5); ctx.fill();
    } else if (id === 'p_bones') {
      ctx.strokeStyle = C.panel; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(8, 22); ctx.lineTo(24, 10); ctx.moveTo(10, 12); ctx.lineTo(22, 22); ctx.stroke();
    } else if (id === 'p_mushroom') {
      ctx.fillStyle = C.hurt; ctx.beginPath(); ctx.ellipse(s / 2, 12, 10, 6, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = C.panel; ctx.fillRect(14, 12, 4, 12);
    } else if (id === 'p_banner') {
      ctx.strokeStyle = C.ink; ctx.beginPath(); ctx.moveTo(8, 4); ctx.lineTo(8, 28); ctx.stroke();
      ctx.fillStyle = C.hurt; ctx.fillRect(8, 4, 16, 10);
    } else if (id === 'p_chain') {
      ctx.strokeStyle = C.muted; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(4, 6); ctx.quadraticCurveTo(16, 20, 28, 8); ctx.stroke();
    } else if (id === 'd_moss' || id === 'd_puddle') {
      ctx.globalAlpha = 0.55; ctx.fillStyle = id === 'd_moss' ? C.good : C.mage;
      ctx.beginPath(); ctx.ellipse(s / 2, s / 2 + 2, 11, 6, 0, 0, Math.PI * 2); ctx.fill();
    } else if (id === 'd_crack' || id === 'd_rift') {
      ctx.strokeStyle = id === 'd_rift' ? C.mage : C.ink; ctx.globalAlpha = id === 'd_rift' ? 0.5 + 0.4 * flick : 0.8;
      ctx.beginPath(); ctx.moveTo(6, 8); ctx.lineTo(14, 16); ctx.lineTo(10, 24); ctx.lineTo(22, 20); ctx.stroke();
    } else if (id === 'd_web') {
      ctx.strokeStyle = C.muted; ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.moveTo(2, 2); ctx.lineTo(s - 2, s - 2); ctx.moveTo(2, s / 2); ctx.lineTo(s / 2, 2); ctx.stroke();
    } else if (id === 'd_arch' || id === 'd_relief') {
      ctx.strokeStyle = C.gold; ctx.globalAlpha = 0.8;
      ctx.beginPath(); ctx.arc(s / 2, 22, 10, Math.PI, 0); ctx.stroke();
    } else if (id === 'd_glow') {
      ctx.globalAlpha = 0.25 + 0.35 * flick; ctx.fillStyle = C.mage; circle(s / 2, s / 2, 10); ctx.fill();
    }
    ctx.restore();
  }
  function draw(ts) {
    const hs = S.heroes.filter(h => h.alive);
    if (hs.length) { const tx = hs.reduce((s, h) => s + h.x, 0) / hs.length, ty = hs.reduce((s, h) => s + h.y, 0) / hs.length; cam.x += (tx - cam.x) * 0.12; cam.y += (ty - cam.y) * 0.12; }
    let ox = Math.max(0, Math.min(MW * TILE - VW, cam.x - VW / 2)), oy = Math.max(0, Math.min(MH * TILE - VH, cam.y - VH / 2 + 30));
    if (shake > 0.2 && !reduceMotion) { ox += (Math.random() - 0.5) * shake; oy += (Math.random() - 0.5) * shake; }
    shake *= 0.86;
    ctx.setTransform(SC, 0, 0, SC, 0, 0);
    ctx.fillStyle = C.void; ctx.fillRect(0, 0, VW, VH);
    ctx.save(); ctx.translate(-ox, -oy);
    const g = S.map.g, i0 = Math.floor(ox / TILE), j0 = Math.floor(oy / TILE), i1 = Math.ceil((ox + VW) / TILE), j1 = Math.ceil((oy + VH) / TILE);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      if (i < 0 || j < 0 || i >= MW || j >= MH || !S.seen[j * MW + i]) continue;
      if (g[j][i]) { ctx.fillStyle = C.floor; ctx.fillRect(i * TILE, j * TILE, TILE, TILE); ctx.strokeStyle = C.grid; ctx.lineWidth = 1; ctx.strokeRect(i * TILE + .5, j * TILE + .5, TILE - 1, TILE - 1); }
    }
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      if (i < 0 || j < 0 || i >= MW || j >= MH || g[j][i]) continue;
      let adj = false; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const a = i + dx, b = j + dy; if (a >= 0 && b >= 0 && a < MW && b < MH && g[b][a] && S.seen[b * MW + a]) { adj = true; break; } }
      if (adj) { ctx.fillStyle = C.wall; ctx.fillRect(i * TILE, j * TILE, TILE, TILE); }
    }
    const propGrid = S.map.propIds;
    if (propGrid) {
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        if (i < 0 || j < 0 || i >= MW || j >= MH || !S.seen[j * MW + i]) continue;
        const pid = propGrid[j][i];
        if (pid) drawProp(pid, i * TILE, j * TILE, ts);
      }
    }
    for (const p of S.pools) { ctx.save(); circle(p.x, p.y, p.r);
      if (p.warn > 0) { ctx.setLineDash([5, 4]); ctx.strokeStyle = C.hurt; ctx.lineWidth = 2; ctx.stroke(); }
      else { ctx.globalAlpha = .3; ctx.fillStyle = C.hurt; ctx.fill(); ctx.globalAlpha = .85; ctx.strokeStyle = C.hurt; ctx.lineWidth = 1.5; ctx.stroke(); ctx.clip(); ctx.globalAlpha = .35; ctx.beginPath(); for (let k = -p.r * 2; k < p.r * 2; k += 9) { ctx.moveTo(p.x + k, p.y - p.r); ctx.lineTo(p.x + k + p.r * 2, p.y + p.r); } ctx.stroke(); }
      ctx.restore(); }
    for (const z of S.zones) { ctx.save(); circle(z.x, z.y, z.r); ctx.globalAlpha = .16; ctx.fillStyle = C.mage; ctx.fill(); ctx.globalAlpha = .7; ctx.setLineDash([3, 5]); ctx.strokeStyle = C.mage; ctx.stroke(); ctx.restore(); }
    // 떨어진 장비 (희귀 이상은 빛기둥)
    const pulse = 0.55 + 0.45 * Math.sin((ts || 0) / 220);
    for (const d of S.drops) {
      if (!isSeen(S, d.x, d.y)) continue;
      const col = C['r' + d.item.rar];
      if (d.item.rar >= 1) {
        const hgt = d.item.rar >= 2 ? 90 : 34, w = d.item.rar === 3 ? 12 : 8;
        const gr = ctx.createLinearGradient(0, d.y - hgt, 0, d.y);
        gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, col);
        ctx.save(); ctx.globalAlpha = (d.item.rar >= 2 ? 0.55 : 0.3) * pulse; ctx.fillStyle = gr; ctx.fillRect(d.x - w / 2, d.y - hgt, w, hgt); ctx.restore();
      }
      ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(Math.PI / 4); ctx.fillStyle = col; ctx.fillRect(-4, -4, 8, 8); ctx.restore();
      ctx.font = `700 9px ${FONT}`; const w = ctx.measureText(d.item.name).width + 8;
      ctx.fillStyle = C.void; ctx.globalAlpha = .85; ctx.fillRect(d.x - w / 2, d.y - 20, w, 12); ctx.globalAlpha = 1;
      ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(d.item.name, d.x, d.y - 13.5);
    }
    // 적
    for (const e of S.enemies) {
      if (!e.active && !isSeen(S, e.x, e.y)) continue;
      const prev = e._px == null ? e.x : e._px, py = e._py == null ? e.y : e._py;
      const moving = e.alive && (Math.abs(e.x - prev) > 0.05 || Math.abs(e.y - py) > 0.05);
      const tg = e.target && e.target.alive ? e.target : null;
      if (tg) e._face = tg.x >= e.x ? 1 : -1;
      else if (Math.abs(e.x - prev) > 0.05) e._face = e.x > prev ? 1 : -1;
      e._px = e.x; e._py = e.y;
      const swing = e.alive && e.atkRate && e.atkT > e.atkRate * 0.7 ? (e.atkT / e.atkRate - 0.7) / 0.3 : 0;
      if (e.champ && e.alive) { ctx.save(); ctx.globalAlpha = .22 * pulse; circle(e.x, e.y, e.r + 10); ctx.fillStyle = C.champ; ctx.fill(); ctx.restore(); }
      drawEnemy(ctx, e, { face: e._face || -1, t: S.t, moving, swing, flash: e.flash > 0 });
      if (!e.alive) continue;
      const top = e.y - e.r - 10;
      if (!e.boss && e.hp < e.maxHp) { ctx.fillStyle = C.line; ctx.fillRect(e.x - e.r, top, e.r * 2, 3); ctx.fillStyle = C.hurt; ctx.fillRect(e.x - e.r, top, e.r * 2 * e.hp / e.maxHp, 3); }
      if (!e.active) { ctx.fillStyle = C.muted; ctx.font = `700 9px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillText('z', e.x + e.r, top); }
      if (e.casting) {
        const w = Math.max(44, e.r * 2.8), y = e.y + e.r + 6, k = 1 - e.casting.t / e.casting.total;
        ctx.fillStyle = C.panel; ctx.fillRect(e.x - w / 2, y, w, 12); ctx.fillStyle = e.casting.interruptible ? C.tape : C.muted; ctx.fillRect(e.x - w / 2, y, w * k, 12);
        ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.strokeRect(e.x - w / 2 + .5, y + .5, w - 1, 11);
        ctx.fillStyle = C.ink; ctx.font = `700 8.5px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(e.casting.name, e.x, y + 6.5);
      }
    }
    // 영웅
    const nowT = S.t;
    for (const h of S.heroes) {
      if (!h.alive) { ctx.save(); ctx.globalAlpha = .4; ctx.fillStyle = C[h.role]; ctx.fillRect(h.x - 9, h.y + 2, 18, 6); ctx.strokeStyle = C.void; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(h.x - 6, h.y - 6); ctx.lineTo(h.x + 6, h.y + 6); ctx.moveTo(h.x + 6, h.y - 6); ctx.lineTo(h.x - 6, h.y + 6); ctx.stroke(); ctx.restore(); continue; }
      const tg = h.target && h.target.alive ? h.target : null;
      const prev = h._px == null ? h.x : h._px; const moving = Math.abs(h.x - prev) > 0.05 || Math.abs(h.y - (h._py == null ? h.y : h._py)) > 0.05;
      if (tg) h._face = tg.x >= h.x ? 1 : -1; else if (Math.abs(h.x - prev) > 0.05) h._face = h.x > prev ? 1 : -1;
      h._px = h.x; h._py = h.y;
      const swing = h.swingT != null ? Math.max(0, 1 - (nowT - h.swingT) / 0.25) : 0;
      ctx.save(); if (h.buffs.evade > 0) ctx.globalAlpha = .4;
      if (h.buffs.storm > 0) { ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(nowT * 12); ctx.strokeStyle = C.rogue; ctx.lineWidth = 2.5; for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.arc(0, 0, 24, 0, 0.8); ctx.stroke(); } ctx.restore(); }
      const LK = lookOf(h.role);
      if (h.casting) {
        ctx.save(); ctx.globalAlpha = 0.25 + 0.2 * Math.sin(nowT * 18); ctx.fillStyle = fxCol(h.role, LK.fx); circle(h.x, h.y + 2, 17); ctx.fill(); ctx.restore();
        if ((LK.tr.cdr || 0) >= 6) { ctx.save(); ctx.translate(h.x, h.y + 10); ctx.scale(1, 0.38); ctx.rotate(nowT * 2.5); ctx.strokeStyle = C.r1; ctx.lineWidth = 2; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.stroke(); for (let i = 0; i < 6; i++) { ctx.rotate(Math.PI / 3); ctx.fillStyle = C.r1; ctx.fillRect(18, -2, 6, 4); } ctx.restore(); } // 재사용 대기 감소: 룬 원
      }
      if (moving && (LK.tr.haste || 0) + (LK.tr.move || 0) >= 25) { // 가속·이동 속도: 잔상
        const dx = h.x - prev, dy = h.y - (h._py0 == null ? h.y : h._py0);
        for (let i = 2; i >= 1; i--) { ctx.save(); ctx.globalAlpha = 0.12 * (3 - i); drawHero(ctx, h.role, h.x - (h.x - prev) * i * 5, h.y, 1, { face: h._face || 1, t: nowT, look: LK, stage: h.stage || 0 }); ctx.restore(); }
      }
      drawHero(ctx, h.role, h.x, h.y, 1, { face: h._face || 1, swing, t: nowT, moving, look: LK, world: true, stage: h.stage || 0 });
      if (h.buffs.wall > 0) { ctx.save(); hexagon(ctx, h.x, h.y, 21); ctx.globalAlpha = .18; ctx.fillStyle = C.tank; ctx.fill(); ctx.globalAlpha = .9; ctx.strokeStyle = C.tank; ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); }
      if (h.absorb > 0) { ctx.save(); circle(h.x, h.y, 19); ctx.globalAlpha = .16; ctx.fillStyle = C.heal; ctx.fill(); ctx.globalAlpha = .8; ctx.strokeStyle = C.heal; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore(); }
      if (S.partyDR > 0) { ctx.save(); ctx.setLineDash([3, 3]); circle(h.x, h.y, 23); ctx.strokeStyle = C.tank; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore(); }
      if (h.poison > 0) { circle(h.x + 9, h.y - 12, 3.5); ctx.fillStyle = C.poison; ctx.fill(); }
      ctx.fillStyle = C.void; ctx.fillRect(h.x - 13, h.y + 16, 26, 4); ctx.fillStyle = h.hp / h.maxHp < 0.3 ? C.hurt : C.heal; ctx.fillRect(h.x - 12.5, h.y + 16.5, 25 * h.hp / h.maxHp, 3);
      if (h.casting) { ctx.fillStyle = C[h.role]; ctx.fillRect(h.x - 13, h.y + 21, 26 * (1 - h.casting.t / h.casting.total), 2.5); }
      ctx.restore();
    }
    // 효과
    for (const f of S.fx) {
      const k = Math.min(1, f.age / f.life); ctx.save(); const col = C[f.color] || C.ink, rc = C[f.role] || col;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (f.type === 'num') {
        ctx.globalAlpha = 1 - k;
        const big = f.big || f.color === 'good' || /^r\d/.test(f.color);
        const sz = f.big ? 15 + (1 - Math.min(1, k * 4)) * 6 : big ? 12 : 10;
        ctx.font = `700 ${sz}px ${FONT}`; ctx.textAlign = 'center';
        if (f.big) { ctx.lineWidth = 3; ctx.strokeStyle = C.void; ctx.strokeText(f.text, f.x, f.y - k * 18); }
        ctx.fillStyle = col; ctx.fillText(f.text, f.x, f.y - k * (f.color === 'gold' ? 22 : 16));
      }
      else if (f.type === 'label') {
        ctx.globalAlpha = k < 0.75 ? 1 : (1 - k) * 4; const pop = 1 + Math.max(0, 0.25 - k) * 2;
        ctx.font = `700 ${Math.round(11.5 * pop)}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 3.5; ctx.strokeStyle = C.void; ctx.strokeText(f.text, f.x, f.y - k * 12); ctx.fillStyle = rc; ctx.fillText(f.text, f.x, f.y - k * 12);
      }
      else if (f.type === 'ring') { ctx.globalAlpha = 1 - k; circle(f.x, f.y, f.r * (0.6 + k * 0.4)); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke(); }
      else if (f.type === 'line' || f.type === 'bolt') { ctx.globalAlpha = 1 - k; ctx.strokeStyle = col; ctx.lineWidth = f.type === 'bolt' ? 2.5 : 1.5; if (f.type === 'line') ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x2, f.y2); ctx.stroke(); }
      else if (f.type === 'slash') { ctx.globalAlpha = 1 - k; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(f.x - 9, f.y - 9); ctx.lineTo(f.x + 9, f.y + 9); ctx.stroke(); }
      else if (f.type === 'puff') {
        ctx.globalAlpha = 1 - k; ctx.fillStyle = col; const n = f.color === 'boss' ? 16 : 9;
        for (let i = 0; i < n; i++) { const a = f.seed + i * 2.399, d = (f.r + 4) + k * (22 + (i % 3) * 10), sz = 5 * (1 - k) + 1; ctx.fillRect(f.x + Math.cos(a) * d - sz / 2, f.y + Math.sin(a) * d - sz / 2, sz, sz); }
      }
      else if (f.type === 'basic') {
        const a = Math.atan2(f.ty - f.y, f.tx - f.x), BL = lookOf(f.role), bt = BL.fx, bsc = 1 + 0.15 * bt;
        const rc = fxCol(f.role, bt);
        if ((BL.tr.leech || 0) >= 3 && f.role !== 'healer') { const q = Math.min(1, k * 1.4); ctx.save(); ctx.globalAlpha = 1 - k; ctx.fillStyle = C.hurt; for (let i = 0; i < 3; i++) { const qq = Math.max(0, q - i * 0.12); circle(f.tx + (f.x - f.tx) * qq, f.ty + (f.y - f.ty) * qq - Math.sin(qq * Math.PI) * 10, 1.8); ctx.fill(); } ctx.restore(); } // 생명력 흡수: 피 방울
        if (f.role === 'tank') { ctx.globalAlpha = 1 - k; ctx.strokeStyle = C.panel; ctx.lineWidth = 4; ctx.lineWidth = 4 + bt; ctx.beginPath(); ctx.arc(f.tx, f.ty, 14 * bsc, a + Math.PI - 1.2 - bt * 0.2 + k, a + Math.PI + 0.2 + k); ctx.stroke(); ctx.strokeStyle = rc; ctx.lineWidth = 1.5 + bt * 0.5; ctx.stroke(); }
        else if (f.role === 'rogue') { ctx.globalAlpha = 1 - k; ctx.strokeStyle = rc; ctx.lineWidth = 2 + bt * 0.5; for (const o of (bt >= 2 ? [-6, 0, 6] : [-4, 4])) { ctx.beginPath(); ctx.moveTo(f.tx - 8, f.ty - 8 + o); ctx.lineTo(f.tx + 8, f.ty + 6 + o); ctx.stroke(); } }
        else { const p = Math.min(1, k * 1.6), px = f.x + (f.tx - f.x) * p, py = f.y - 4 + (f.ty - f.y + 4) * p; const cc = bt >= 1 ? rc : f.role === 'healer' ? C.tape : rc;
          ctx.fillStyle = cc; ctx.globalAlpha = 0.35; circle(px, py, 6 * bsc); ctx.fill(); ctx.globalAlpha = 1; circle(px, py, 3 * bsc); ctx.fill(); if (p >= 1) { ctx.globalAlpha = 1 - k; star(ctx, f.tx, f.ty, 7 * bsc, 3, 4 + bt, 0); ctx.fill(); } }
      }
      else if (f.type === 'sk') drawSkill(f, k, rc);
      ctx.restore();
    }
    ctx.restore();

    // 미니맵
    const mm = 2, mx = VW - MW * mm - 8, my = 8;
    ctx.fillStyle = C.void; ctx.globalAlpha = .85; ctx.fillRect(mx - 3, my - 3, MW * mm + 6, MH * mm + 6); ctx.globalAlpha = 1;
    ctx.fillStyle = C.wall;
    for (let j = 0; j < MH; j++) for (let i = 0; i < MW; i++) if (g[j][i] && S.seen[j * MW + i]) ctx.fillRect(mx + i * mm, my + j * mm, mm, mm);
    for (const p of S.packs) { if (!isSeen(S, p.x, p.y) || !S.enemies.some(e => e.pack === p.id && e.alive)) continue; ctx.fillStyle = p.boss ? C.tape : p.champ ? C.champ : C.hurt; const s = p.boss ? 5 : 3; ctx.fillRect(mx + p.x / TILE * mm - s / 2, my + p.y / TILE * mm - s / 2, s, s); }
    for (const d of S.drops) if (isSeen(S, d.x, d.y)) { ctx.fillStyle = C['r' + d.item.rar]; ctx.fillRect(mx + d.x / TILE * mm - 1, my + d.y / TILE * mm - 1, 2, 2); }
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.strokeRect(mx + ox / TILE * mm, my + oy / TILE * mm, VW / TILE * mm, VH / TILE * mm);
    for (const h of hs) { ctx.fillStyle = C[h.role]; ctx.fillRect(mx + h.x / TILE * mm - 1.5, my + h.y / TILE * mm - 1.5, 3, 3); }

    // 보스 바 / 층 표시
    const b = S.enemies.find(e => e.boss);
    ctx.textBaseline = 'alphabetic';
    if (b && b.active && b.alive) {
      const bw = mx - 20;
      ctx.fillStyle = C.panel; ctx.fillRect(8, 8, bw, 22); ctx.fillStyle = C.hurt; ctx.fillRect(8, 8, bw * b.hp / b.maxHp, 22);
      ctx.strokeStyle = C.ink; ctx.strokeRect(8.5, 8.5, bw - 1, 21);
      ctx.fillStyle = C.ink; ctx.font = `700 10.5px ${FONT}`; ctx.textAlign = 'left'; ctx.fillText('고르바크' + (b.enraged ? ' · 광폭화' : ''), 13, 23);
      ctx.textAlign = 'right'; ctx.fillText(Math.round(b.hp / b.maxHp * 100) + '%', 8 + bw - 5, 23);
      ctx.textAlign = 'left'; ctx.fillStyle = C.bg; ctx.globalAlpha = .7; ctx.fillRect(8, 34, 92, 15); ctx.globalAlpha = 1;
      ctx.fillStyle = C.ink; ctx.font = `500 10px ${FONT}`; ctx.fillText('광폭화까지 ' + Math.max(0, Math.ceil(150 - b.engageT)) + '초', 12, 45);
    } else {
      const left = S.packs.filter(p => !p.boss && S.enemies.some(e => e.pack === p.id && e.alive)).length, tt = Math.floor(S.t);
      const st = S.phase === 'lose' ? '전멸' : S.phase === 'win' ? '클리어' : S.phase === 'pick' ? '강화 선택' : S.inCombat ? '전투 중' : '탐험 중';
      const blk = S.nBlocks ? `${Math.min(S.blockI + 1, S.nBlocks)}/${S.nBlocks}` : '-';
      const txt = `${S.floor}층 · 블럭 ${blk} · ${st} · 남은 무리 ${left} · ${Math.floor(tt / 60)}:${String(tt % 60).padStart(2, '0')}`;
      ctx.font = `700 10.5px ${FONT}`; const tw = ctx.measureText(txt).width;
      ctx.fillStyle = C.bg; ctx.globalAlpha = .8; ctx.fillRect(8, 8, tw + 12, 18); ctx.globalAlpha = 1;
      ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.fillText(txt, 14, 21);
    }
    if (ultFx) {
      const e = (performance.now() - ultFx.t0) / 1100;
      if (e >= 1) ultFx = null;
      else {
        ctx.save(); ctx.globalAlpha = 0.22 * (1 - e); ctx.fillStyle = C[ultFx.role]; ctx.fillRect(0, 0, VW, VH);
        ctx.globalAlpha = e < 0.8 ? 1 : (1 - e) * 5; const s = 1 + Math.max(0, 0.15 - e) * 3;
        ctx.font = `400 ${Math.round(28 * s)}px "Black Han Sans", ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 5; ctx.strokeStyle = C.void; ctx.strokeText(ultFx.name, VW / 2, VH * 0.3); ctx.fillStyle = C[ultFx.role]; ctx.fillText(ultFx.name, VW / 2, VH * 0.3);
        ctx.font = `700 11px ${FONT}`; ctx.lineWidth = 3; const who = ROLE_INFO[ultFx.role].name + ' 궁극기'; ctx.strokeText(who, VW / 2, VH * 0.3 - 24); ctx.fillStyle = C.panel; ctx.fillText(who, VW / 2, VH * 0.3 - 24);
        ctx.restore();
      }
    }
  }

  let saveT = 0, portraitN = 0;
  function frame(ts) {
    const dt = Math.min(0.1, (ts - last) / 1000 || 0); last = ts;
    if (running && S.phase !== 'win' && S.phase !== 'lose' && S.phase !== 'pick') { acc += dt * speed; let n = 0; while (acc >= DT && n++ < 200) { step(S); acc -= DT; } }
    consumeEvents();
    if ((saveT += dt) > 2 && S.t > 0) { saveT = 0; saveP(); }
    if ((S.phase === 'win' || S.phase === 'lose') && !seenResult) { seenResult = true; setRunning(false); saveP(); setTimeout(showResult, S.phase === 'win' ? 900 : 300); }
    draw(ts); updateCards(); updateLog(); updateStrip();
    if ((portraitN = (portraitN + 1) % 4) === 0) { drawPortraits(); drawInvPortrait(); }
    requestAnimationFrame(frame);
  }
  draw(0); updateCards(); updateStrip(); updateEqBadge();
  requestAnimationFrame(frame);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { saveP(); if (running) setRunning(false); } });
})();
