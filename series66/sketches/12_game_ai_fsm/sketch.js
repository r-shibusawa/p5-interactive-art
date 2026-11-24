// ============================================
// 12 ゲームの敵キャラの状態機械 ─ 敵の頭の中は「いまの状態」と「何が起きたら次はどれ」の表
// 通常モードの中に 巡回 → 発見 → 追跡 → 見失う → 探索 → 巡回 の小さな状態機械があり、その外側に「逃走」がある（階層的な状態機械）。
// 体力が 30 を切ると、中でどの状態にいても外側の規則が優先して逃走へ。回復したら通常モードの入口（巡回）から再開。
// マウス = あなた（見つかると追いかけられる）/ クリック = 近くの敵に攻撃（体力 −25）/ 壁のうしろは見えない
// V 視界を表示 / R 敵を元にもどす
// ============================================

const SUBS = ['巡回', '発見', '追跡', '見失う', '探索'];      // 通常モードの中の状態
const VIEW = 230, FOV = Math.PI / 2;    // ★ 見える距離と視野の角度
const SPEED = { 巡回: 1.2, 発見: 0, 追跡: 2.4, 見失う: 1.8, 探索: 1.0, 逃走: 2.6 };   // ★ 状態ごとの速さ
const TIME = { 発見: 30, 見失う: 90, 探索: 200 };   // ★ フレーム数のしきい値
const LOW_HP = 30, OK_HP = 80;          // ★ 逃走に入る体力・通常にもどる体力
const ENEMY_COLS = [[255, 170, 50], [70, 215, 230], [185, 150, 255]];
let walls = [], enemies = [], player = { x: 200, y: 400 }, showView = true, arena, hits = 0, caught = 0, fsmPos = [], fsmMach;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  buildWorld();
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); buildWorld(); }
function buildWorld(w, h) {             // w, h を渡すとその大きさで（自己テストは画面の大きさによらず 1280 × 800）
  w = w || width; h = h || height;
  arena = { x: 30, y: 90, w: w * 0.58, h: h - 130 };
  let A = arena;
  walls = [[0.25, 0.2, 0.06, 0.35], [0.55, 0.55, 0.3, 0.06], [0.6, 0.12, 0.06, 0.25], [0.15, 0.75, 0.25, 0.05]].map(([x, y, w, h]) => ({ x: A.x + x * A.w, y: A.y + y * A.h, w: w * A.w, h: h * A.h }));
  enemies = [0, 1, 2].map((k) => makeEnemy(k, A));
  let fx = w * 0.62, fw = w * 0.36;
  fsmPos = circleLayout(5, fx + fw * 0.5, 300, Math.min(fw * 0.3, 140), Math.PI);
  fsmPos.push({ x: fx + fw * 0.5, y: 560, loop: Math.PI / 2 });
  fsmMach = { n: 6, acc: [false, false, false, false, false, false], start: 0, tr: [{ 見つけた: 1 }, { '0.5 秒': 2, 見えない: 0 }, { 見えない: 3 }, { 見えた: 2, '1.5 秒': 4 }, { 見つけた: 1, '3 秒': 0 }, { '体力 ≥ 80': 0 }] };
}
function makeEnemy(k, A) {
  let way = [[0.1, 0.1], [0.9, 0.1], [0.9, 0.45], [0.1, 0.45]].map(([x, y]) => ({ x: A.x + x * A.w, y: A.y + (y + k * 0.25) * A.h }));
  return { x: way[0].x, y: way[0].y, dir: 0, hp: 100, top: '通常', sub: '巡回', t: 0, way, wi: 0, last: null, col: ENEMY_COLS[k] };
}
// ★ 状態遷移の表（純粋な関数：いまの状態 + できごと → 次の状態）。外側（逃走）の規則を先に調べる
function nextState(st, ev) {
  if (st.top === '通常' && ev.hp < LOW_HP) return { top: '逃走', sub: null };
  if (st.top === '逃走') return ev.hp >= OK_HP ? { top: '通常', sub: '巡回' } : st;
  let s = st.sub, t = st.t;
  if (s === '巡回' && ev.sees) return { top: '通常', sub: '発見' };
  if (s === '発見') { if (!ev.sees) return { top: '通常', sub: '巡回' }; if (t >= TIME.発見) return { top: '通常', sub: '追跡' }; }
  if (s === '追跡' && !ev.sees) return { top: '通常', sub: '見失う' };
  if (s === '見失う') { if (ev.sees) return { top: '通常', sub: '追跡' }; if (t >= TIME.見失う || ev.arrived) return { top: '通常', sub: '探索' }; }
  if (s === '探索') { if (ev.sees) return { top: '通常', sub: '発見' }; if (t >= TIME.探索) return { top: '通常', sub: '巡回' }; }
  return st;
}
// ---- 見えるか：距離・視野の角度・壁でさえぎられないか
function segHitsRect(x1, y1, x2, y2, r) {
  for (let k = 0; k <= 24; k++) { let x = x1 + ((x2 - x1) * k) / 24, y = y1 + ((y2 - y1) * k) / 24; if (x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h) return true; }
  return false;
}
function canSee(e, p, chasing) {
  let dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy);
  if (d > VIEW) return false;
  let da = Math.atan2(dy, dx) - e.dir; da = Math.atan2(Math.sin(da), Math.cos(da));
  if (!chasing && Math.abs(da) > FOV / 2) return false;          // 追跡中はぐるりと見回せる
  return !walls.some((w) => segHitsRect(e.x, e.y, p.x, p.y, w));
}
function inWall(x, y) { return walls.some((w) => x > w.x - 8 && x < w.x + w.w + 8 && y > w.y - 8 && y < w.y + w.h + 8); }
function moveToward(e, tx, ty, sp) {
  let dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
  if (d < 1e-6 || sp <= 0) return d;
  let want = Math.atan2(dy, dx), da = Math.atan2(Math.sin(want - e.dir), Math.cos(want - e.dir));
  e.dir += clampv(da, -0.15, 0.15);
  let nx = e.x + Math.cos(e.dir) * sp, ny = e.y + Math.sin(e.dir) * sp;
  if (!inWall(nx, e.y)) e.x = nx; if (!inWall(e.x, ny)) e.y = ny;        // 壁にぶつかったらその向きは動かない
  if (inWall(e.x + Math.cos(e.dir) * 12, e.y + Math.sin(e.dir) * 12)) e.dir += 0.6;   // 壁ぞいに向きを変える
  e.x = clampv(e.x, arena.x + 10, arena.x + arena.w - 10); e.y = clampv(e.y, arena.y + 10, arena.y + arena.h - 10);
  return d;
}
function updateEnemy(e, p) {
  let chasing = e.sub === '追跡' || e.sub === '見失う', sees = canSee(e, p, chasing), arrived = false;
  if (sees) e.last = { x: p.x, y: p.y };
  let name = e.top === '逃走' ? '逃走' : e.sub, sp = SPEED[name];
  if (name === '巡回') { let w = e.way[e.wi]; if (moveToward(e, w.x, w.y, sp) < 12) e.wi = (e.wi + 1) % e.way.length; }
  if (name === '発見') { let da = Math.atan2(p.y - e.y, p.x - e.x) - e.dir; e.dir += clampv(Math.atan2(Math.sin(da), Math.cos(da)), -0.1, 0.1); }
  if (name === '追跡') moveToward(e, p.x, p.y, sp);
  if (name === '見失う' && e.last) arrived = moveToward(e, e.last.x, e.last.y, sp) < 10;
  if (name === '探索') { e.dir += 0.04; moveToward(e, e.x + Math.cos(e.dir) * 30, e.y + Math.sin(e.dir) * 30, sp); }
  if (name === '逃走') { moveToward(e, 2 * e.x - p.x, 2 * e.y - p.y, sp); e.hp = Math.min(100, e.hp + 0.25); }
  let ns = nextState(e, { sees, hp: e.hp, arrived });
  if (ns.top !== e.top || ns.sub !== e.sub) { e.top = ns.top; e.sub = ns.sub; e.t = 0; } else e.t++;
  if (e.cool > 0) e.cool--;
  if (e.top === '通常' && e.sub === '追跡' && Math.hypot(p.x - e.x, p.y - e.y) < 16 && !(e.cool > 0)) { e.cool = 90; return true; }   // つかまえた（1.5 秒に 1 回だけ数える）
  return false;
}
function attack(x, y) {                // クリック：近くの敵に −25
  for (let e of enemies) if (Math.hypot(e.x - x, e.y - y) < 60) { e.hp = Math.max(0, e.hp - 25); hits++; }
}

function draw() {
  background(...BG);
  hudTitle('ゲームの敵キャラの状態機械（階層的）', 'マウス = あなた　クリック = 近くの敵に攻撃（体力 −25）　V 視界　R 元にもどす　　攻撃 ' + hits + ' 回　つかまった ' + caught + ' 回');
  if (mouseX > arena.x && mouseX < arena.x + arena.w && mouseY > arena.y && mouseY < arena.y + arena.h) player = { x: mouseX, y: mouseY };
  for (let e of enemies) if (updateEnemy(e, player)) caught++;
  // ---- 世界
  noStroke(); fill(14, 30, 22); rect(arena.x, arena.y, arena.w, arena.h, 8);
  fill(...WIRE); for (let w of walls) rect(w.x, w.y, w.w, w.h, 4);
  for (let e of enemies) {
    let name = e.top === '逃走' ? '逃走' : e.sub;
    if (showView) { noStroke(); fill(...e.col, name === '追跡' ? 40 : 22); let ch = name === '追跡' || name === '見失う';
      if (ch) circle(e.x, e.y, VIEW * 2); else arc(e.x, e.y, VIEW * 2, VIEW * 2, e.dir - FOV / 2, e.dir + FOV / 2, PIE); }
    if (e.last && (name === '見失う')) { stroke(...e.col); strokeWeight(1); noFill(); circle(e.last.x, e.last.y, 18); line(e.last.x - 6, e.last.y, e.last.x + 6, e.last.y); }
    noStroke(); fill(...e.col); circle(e.x, e.y, 24); fill(10, 20, 15); circle(e.x + Math.cos(e.dir) * 7, e.y + Math.sin(e.dir) * 7, 7);
    fill(60, 20, 20); rect(e.x - 16, e.y - 24, 32, 5); fill(...(e.hp < LOW_HP ? ROSE : LIME)); rect(e.x - 16, e.y - 24, 32 * e.hp / 100, 5);
    fill(...INK); textSize(12); textAlign(CENTER, BASELINE); text(name, e.x, e.y - 30);
  }
  fill(255); stroke(...ROSE); strokeWeight(2); circle(player.x, player.y, 16);
  // ---- 階層的な状態機械の図
  let fx = width * 0.62, fw = width * 0.36;
  noFill(); stroke(...DIMC); strokeWeight(1.5); rect(fx + 10, 130, fw - 20, 360, 18);
  noStroke(); fill(...DIMC); textSize(15); textAlign(LEFT, BASELINE); text('通常モード', fx + 26, 154); text('入口 = 巡回', fx + 26, 476);
  let hi = {}; enemies.forEach((e) => { let i = e.top === '逃走' ? 5 : SUBS.indexOf(e.sub); if (!hi[i]) hi[i] = e.col; });
  drawMachine(fsmMach, fsmPos, { r: 30, names: SUBS.concat(['逃走']), hi, labelSize: 12, nameSize: 13 });
  // 外側の規則（通常のどこからでも → 逃走）
  stroke(...ROSE); strokeWeight(2.5); arrowLine([[fx + fw * 0.5 + 60, 490], [fx + fw * 0.5 + 60, 520], [fsmPos[5].x + 28, fsmPos[5].y - 12]], ROSE, 2.5);
  noStroke(); fill(...ROSE); textSize(13); textAlign(LEFT, CENTER); text('体力 < 30（中のどこからでも）', fx + fw * 0.5 + 70, 505);
  enemies.forEach((e, k) => { let i = e.top === '逃走' ? 5 : SUBS.indexOf(e.sub), p = fsmPos[i]; noStroke(); fill(...e.col); circle(p.x - 20 + k * 20, p.y + 40, 12); });
  // 敵の一覧
  enemies.forEach((e, k) => { fill(...e.col); textSize(14); textAlign(LEFT, BASELINE); text('敵 ' + (k + 1) + '：' + e.top + (e.sub && e.top === '通常' ? ' / ' + e.sub : '') + '　体力 ' + Math.round(e.hp) + '　この状態 ' + e.t + ' フレーム', fx + 10, 640 + k * 24); });
  drawSelfTest(width - 180, height - 14);
}

function mousePressed() { attack(mouseX, mouseY); }
function keyPressed() {
  if (key === 'v' || key === 'V') showView = !showView;
  if (key === 'r' || key === 'R') { enemies = [0, 1, 2].map((k) => makeEnemy(k, arena)); hits = 0; caught = 0; }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let S0 = (sub, t) => ({ top: '通常', sub, t: t || 0 }), ok = (st, ev, top, sub) => { let n = nextState(st, Object.assign({ sees: false, hp: 100, arrived: false }, ev)); return n.top === top && n.sub === sub; };
  check('巡回 + 見つけた → 発見、発見 + 30 フレーム見え続けた → 追跡、発見 + 見えない → 巡回', ok(S0('巡回'), { sees: true }, '通常', '発見') && ok(S0('発見', 30), { sees: true }, '通常', '追跡') && ok(S0('発見', 5), {}, '通常', '巡回'));
  check('追跡 + 見えない → 見失う、見失う + 90 フレーム → 探索、探索 + 200 フレーム → 巡回、探索 + 見つけた → 発見', ok(S0('追跡'), {}, '通常', '見失う') && ok(S0('見失う', 90), {}, '通常', '探索') && ok(S0('探索', 200), {}, '通常', '巡回') && ok(S0('探索', 3), { sees: true }, '通常', '発見'));
  check('体力 < 30 なら、中の 5 つのどの状態からでも逃走（外側の規則が優先）', SUBS.every((s) => ok(S0(s, 50), { hp: 20, sees: true }, '逃走', null)));
  check('逃走 + 体力 ≥ 80 → 通常の入口（巡回）、体力 < 80 なら逃走のまま', ok({ top: '逃走', sub: null, t: 0 }, { hp: 85 }, '通常', '巡回') && ok({ top: '逃走', sub: null, t: 0 }, { hp: 50 }, '逃走', null));
  // 2400 フレームの模擬プレイ（プレイヤーは円を描いて動き、ときどき攻撃）
  buildWorld(1280, 800); let seen = new Set(), okPos = true;
  for (let f = 0; f < 2400; f++) {
    let p = { x: arena.x + arena.w * (0.5 + 0.35 * Math.cos(f * 0.01)), y: arena.y + arena.h * (0.5 + 0.35 * Math.sin(f * 0.013)) };
    if (f % 200 === 100) attack(enemies[(f / 200) % 3 | 0].x, enemies[(f / 200) % 3 | 0].y);
    for (let e of enemies) { updateEnemy(e, p); seen.add(e.top === '逃走' ? '逃走' : e.sub); if (!isFinite(e.x) || !isFinite(e.y) || e.x < arena.x || e.x > arena.x + arena.w || e.y < arena.y || e.y > arena.y + arena.h || e.hp < 0 || e.hp > 100) okPos = false; }
  }
  check('模擬プレイ 2400 フレーム：位置と体力はいつも範囲内（NaN なし）', okPos);
  check('模擬プレイで 6 つの状態を全部通った（' + [...seen].join('・') + '）', seen.size === 6);
  let w0 = walls[0];
  check('壁の向こうは見えない：壁をはさんだ 2 点の線は壁に当たる', segHitsRect(w0.x - 40, w0.y + w0.h / 2, w0.x + w0.w + 40, w0.y + w0.h / 2, w0) && !segHitsRect(w0.x - 40, w0.y - 20, w0.x + w0.w + 40, w0.y - 20, w0));
  hits = 0; buildWorld(); reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 敵のうしろからそっと近づいてクリックで攻撃しよう。視野の外なら見つからない（V で視界を表示）
// 2. 体力を減らすと、追跡中でも逃走に切りかわる。逃げ切って回復すると巡回から再開する（入口）
// 3. 「逃走から戻ったら、前にいた状態から再開」（履歴つきの階層）にするには nextState をどう変える？
// 4. 新しい状態「援軍を呼ぶ」を足そう：発見したとき近くの仲間も発見にする
// 5. 状態機械は 00 の自動販売機と同じしくみ。表（nextState）を変えるだけで、キャラクターの性格が変わる

// ==================================================
// ここから下は「オートマトンの道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 色と小さな道具
const BG = [9, 20, 15];                 // 背景（回路基板の黒緑）
const INK = [226, 240, 228];            // 文字（蛍光の白）
const AMBER = [255, 170, 50], CYAN = [70, 215, 230], LIME = [140, 230, 120], ROSE = [255, 100, 120], VIOLET = [185, 150, 255];
const DIMC = [125, 155, 138], PANEL = [18, 36, 28], WIRE = [44, 74, 58];
function clampv(v, a, b) { return v < a ? a : v > b ? b : v !== v ? a : v; }     // NaN なら a に戻す
function fmtN(v, d) { if (typeof v !== 'number' || v !== v) return '?'; return v.toFixed(d === undefined ? 2 : d); }
function hudTitle(t, sub) {              // 左上のタイトルと操作の説明
  noStroke(); fill(...INK); textSize(22); textAlign(LEFT, BASELINE); text(t, 30, 38);
  fill(...DIMC); textSize(14); textLeading(19); text(sub, 30, 62);
}
function typeInto(s, ch, allowed, maxLen) {   // 文字の入力：allowed に入っている 1 文字だけ足す（長さの上限つき）
  if (typeof ch !== 'string' || ch.length !== 1 || allowed.indexOf(ch) < 0) return s;
  return s.length < (maxLen || 40) ? s + ch : s;
}
// ---- 種つきの乱数（同じ種なら毎回同じ列 → 実験をくり返せる）
let rngState = 1;
function seedRng(s) { rngState = (s >>> 0) || 1; }
function rnd() {                       // 0〜1 の一様乱数（mulberry32）
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rndInt(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
function rndPick(arr) { return arr[Math.floor(rnd() * arr.length)]; }
function rndString(alpha, len) { let s = ''; for (let i = 0; i < len; i++) s += alpha[Math.floor(rnd() * alpha.length)]; return s; }
// ---- 状態遷移図を描く道具（円 = 状態、二重丸 = 受理、矢印 = 遷移。曲線は折れ線で描く）
function bezPts(x0, y0, cx, cy, x1, y1, n) {   // 2 次ベジェ曲線 → 折れ線の点
  let out = [];
  for (let i = 0; i <= n; i++) { let t = i / n, u = 1 - t; out.push([u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1]); }
  return out;
}
function cubicPts(p0, p1, p2, p3, n) {          // 3 次ベジェ曲線 → 折れ線の点（自己ループ用）
  let out = [];
  for (let i = 0; i <= n; i++) { let t = i / n, u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    out.push([a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]); }
  return out;
}
function arrowLine(pts, col, w, dashed) {      // 折れ線 + 先の三角
  if (!pts || pts.length < 2) return;
  noFill(); stroke(...col); strokeWeight(w || 2);
  if (dashed) { for (let i = 0; i + 1 < pts.length; i += 2) line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]); }
  else { beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape(); }
  let [x1, y1] = pts[pts.length - 1], [x0, y0] = pts[pts.length - 2], L = Math.hypot(x1 - x0, y1 - y0) || 1, ux = (x1 - x0) / L, uy = (y1 - y0) / L, s = 7 + (w || 2) * 1.5;
  noStroke(); fill(...col);
  triangle(x1, y1, x1 - ux * s - uy * s * 0.5, y1 - uy * s + ux * s * 0.5, x1 - ux * s + uy * s * 0.5, y1 - uy * s - ux * s * 0.5);
}
function edgeList(m) {                  // DFA / NFA → 辺のリスト [{from, to, label}]（同じ向きの辺はラベルをまとめる）
  let map = new Map();
  for (let q = 0; q < m.n; q++) for (let c in m.tr[q] || {}) {
    let ts = m.tr[q][c]; ts = Array.isArray(ts) ? ts : [ts];
    for (let t of ts) { if (t < 0 || t >= m.n) continue; let k = q + '>' + t; if (!map.has(k)) map.set(k, { from: q, to: t, syms: [] }); map.get(k).syms.push(c === '' ? 'ε' : c); }
  }
  return [...map.values()].map((e) => ({ from: e.from, to: e.to, label: e.syms.sort().join(','), syms: e.syms }));
}
function edgeGeometry(e, pos, r, both) {        // 1 本の辺の折れ線の点とラベルの位置
  let a = pos[e.from], b = pos[e.to];
  if (e.from === e.to) {                        // 自己ループ：中心から外向き（または上）に輪
    let ang = a.loop !== undefined ? a.loop : -Math.PI / 2, ux = Math.cos(ang), uy = Math.sin(ang), px = -uy, py = ux;
    let s0 = [a.x + (ux * 0.6 + px * 0.8) * r, a.y + (uy * 0.6 + py * 0.8) * r], s1 = [a.x + (ux * 0.6 - px * 0.8) * r, a.y + (uy * 0.6 - py * 0.8) * r];
    let pts = cubicPts(s0, [s0[0] + (ux * 2.2 + px * 0.9) * r, s0[1] + (uy * 2.2 + py * 0.9) * r], [s1[0] + (ux * 2.2 - px * 0.9) * r, s1[1] + (uy * 2.2 - py * 0.9) * r], s1, 18);
    return { pts, lx: a.x + ux * 2.35 * r, ly: a.y + uy * 2.35 * r };
  }
  let dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, bend = both ? 0.22 * L : (e.bend || 0) * L;
  let mx = (a.x + b.x) / 2 - uy * bend, my = (a.y + b.y) / 2 + ux * bend;
  let d0x = mx - a.x, d0y = my - a.y, l0 = Math.hypot(d0x, d0y) || 1, d1x = mx - b.x, d1y = my - b.y, l1 = Math.hypot(d1x, d1y) || 1;
  let pts = bezPts(a.x + (d0x / l0) * r, a.y + (d0y / l0) * r, mx, my, b.x + (d1x / l1) * (r + 2), b.y + (d1y / l1) * (r + 2), 16);
  let mid = pts[8];
  return { pts, lx: mid[0] - uy * 13, ly: mid[1] + ux * 13 };
}
// m = DFA/NFA、pos = [{x, y, loop?}]、opt = { r, names, hi: {状態: 色}, edgeHi: (e) => 色 or null, start: true, labelSize }
function drawMachine(m, pos, opt) {
  opt = opt || {};
  let r = opt.r || 22, edges = opt.edges || edgeList(m), has = new Set(edges.map((e) => e.from + '>' + e.to));
  textAlign(CENTER, CENTER);
  for (let e of edges) {
    if (!pos[e.from] || !pos[e.to]) continue;
    let g = edgeGeometry(e, pos, r, e.from !== e.to && has.has(e.to + '>' + e.from));
    let hc = opt.edgeHi ? opt.edgeHi(e) : null;
    arrowLine(g.pts, hc || opt.edgeCol || [120, 160, 140], hc ? 3.5 : 1.8, e.label === 'ε' && !hc);
    if (opt.labels !== false || hc) { noStroke(); fill(...(hc || opt.labelCol || [200, 225, 210])); textSize(opt.labelSize || 14); text(e.label, g.lx, g.ly); }
  }
  if (opt.start !== false && pos[m.start]) {   // 開始の矢印（左から）
    let p = pos[m.start], sa = opt.startAng !== undefined ? opt.startAng : p.loop !== undefined && Math.cos(p.loop) < -0.5 ? -2.2 : Math.PI;
    let ux = Math.cos(sa), uy = Math.sin(sa);   // 自己ループと重ならない向きから
    arrowLine([[p.x + ux * (r + 34), p.y + uy * (r + 34)], [p.x + ux * (r + 2), p.y + uy * (r + 2)]], opt.startCol || INK, 2);
  }
  for (let q = 0; q < m.n; q++) {
    let p = pos[q]; if (!p) continue;
    let hc = opt.hi && opt.hi[q];
    stroke(...(hc || [150, 190, 170])); strokeWeight(hc ? 3.5 : 2); fill(...(hc ? hc.map((v) => v * 0.35) : PANEL));
    circle(p.x, p.y, 2 * r);
    if (m.acc[q]) { noFill(); circle(p.x, p.y, 2 * r - 9); }
    noStroke(); fill(...(hc ? [255, 255, 255] : INK)); textSize(opt.nameSize || Math.min(16, r * 0.75));
    text(opt.names ? opt.names[q] : 'q' + q, p.x, p.y + 1);
  }
}
function circleLayout(n, cx, cy, rad, a0) {    // 円の上に並べる（自己ループは外向き）
  let out = [];
  for (let i = 0; i < n; i++) { let a = (a0 === undefined ? Math.PI : a0) + (2 * Math.PI * i) / Math.max(1, n); out.push({ x: cx + rad * Math.cos(a), y: cy + rad * Math.sin(a), loop: a }); }
  return out;
}
function layerLayout(m, x, y, w, h) {          // スタートからの距離（幅優先）で左 → 右に並べる
  let depth = new Array(m.n).fill(-1), order = [m.start]; depth[m.start] = 0;
  for (let i = 0; i < order.length; i++) for (let e of edgeList(m)) if (e.from === order[i] && depth[e.to] < 0) { depth[e.to] = depth[order[i]] + 1; order.push(e.to); }
  let maxD = Math.max(0, ...depth); for (let q = 0; q < m.n; q++) if (depth[q] < 0) { depth[q] = maxD + 1; order.push(q); }
  maxD = Math.max(...depth);
  let cols = []; for (let q of order) (cols[depth[q]] = cols[depth[q]] || []).push(q);
  let pos = [];
  cols.forEach((col, d) => col.forEach((q, k) => { pos[q] = { x: x + (maxD ? (d / maxD) * w : w / 2), y: y + ((k + 1) / (col.length + 1)) * h, loop: -Math.PI / 2 }; }));
  return pos;
}
function hitState(pos, x, y, r) { for (let q = pos.length - 1; q >= 0; q--) if (pos[q] && Math.hypot(pos[q].x - x, pos[q].y - y) < r) return q; return -1; }
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(...(selfTestResults.every((r) => r.ok) ? LIME : ROSE)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
