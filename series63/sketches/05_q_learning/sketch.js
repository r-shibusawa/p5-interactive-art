// ============================================
// 05 Q 学習 ─ 迷路で「マス × 向き」ごとの価値 Q(s, a) を表に覚える
// 1 歩ごとに Q(s,a) ← Q(s,a) + α (r + γ max_a′ Q(s′,a′) − Q(s,a))。次のマスでは「いちばん良い行動をとる」と仮定して更新するので、
// 探索のためにでたらめに動いていても、最短の道（最適方策）の価値を学べる（方策オフ）
// 各マスの 4 つの三角形 = 4 方向の Q の値（明るいほど良い）。F 速さ / スペース 一時停止 / ↑↓ ε / ← → α / R 表を消す / クリック 壁
// ============================================

let mapRows = [                          // ★ 迷路（S スタート、G ゴール、# 壁）
  'S.....#.....',
  '.####.#.###.',
  '.#....#...#.',
  '.#.####.#.#.',
  '.#......#.#.',
  '.######.#.#.',
  '........#..G',
  '.######.....',
];
let eps = 0.1, lr = 0.5;              // ★ 探索の割合 ε と学習率 α
const GAMMA = 0.95, STEP_R = -1, MAX_LEN = 2000;   // ★ 割引率、1 歩の報酬、1 エピソードの上限
let gw, agent, speed = 1, paused = false, gx = 40, gy = 110, cs = 50;
const SPEEDS = ['ゆっくり', 'ふつう', '速い'];

function setup() { createCanvas(windowWidth, windowHeight); gw = gridParse(mapRows); selfTest(); seedRng(5); agent = makeQAgent(gw); }

function makeQAgent(g) { return { Q: Array.from({ length: g.w * g.h }, () => [0, 0, 0, 0]), s: g.cell.indexOf('S'), len: 0, epLens: [] }; }
// ★ Q 学習の 1 歩
function qStep(ag, g, ep, al) {
  let s = ag.s, a = epsGreedy(ag.Q[s], ep), s2 = gridMove(g, s, a), done = g.cell[s2] === 'G';
  let target = done ? STEP_R : STEP_R + GAMMA * maxOf(ag.Q[s2]);   // ゴールに着いたら先の価値はない
  ag.Q[s][a] += al * (target - ag.Q[s][a]);
  ag.len++; ag.s = s2;
  if (done || ag.len >= MAX_LEN) { ag.epLens.push(ag.len); ag.len = 0; ag.s = g.cell.indexOf('S'); }
}
function greedyPath(ag, g) {             // 学習した表で、いちばん良い向きだけを選んで進む
  let s = g.cell.indexOf('S'), p = [s];
  for (let t = 0; t < 200 && g.cell[s] !== 'G'; t++) { s = gridMove(g, s, argmaxFirst(ag.Q[s])); p.push(s); }
  return p;
}

function draw() {
  background(...BG);
  let t0 = performance.now();
  if (!paused) {
    if (speed === 0) { if (frameCount % 4 === 0) qStep(agent, gw, eps, lr); }
    else if (speed === 1) qStep(agent, gw, eps, lr);
    else while (performance.now() - t0 < 6) qStep(agent, gw, eps, lr);
  }
  cs = Math.min(56, (width * 0.55 - 60) / gw.w, (height - 220) / gw.h);
  noStroke(); fill(240); textSize(22); textAlign(LEFT, BASELINE);
  text('Q 学習：エピソード ' + agent.epLens.length + (paused ? '（一時停止）' : ''), 40, 42);
  fill(170, 176, 210); textSize(15);
  text('F 速さ（' + SPEEDS[speed] + '）　スペース 一時停止　↑↓ ε = ' + eps.toFixed(2) + '　← → α = ' + lr.toFixed(2) + '　R 表を消す　クリック 壁', 40, 68);

  // ---- Q の三角形
  let lo = 0; for (let q of agent.Q) for (let v of q) lo = Math.min(lo, v);
  lo = Math.min(lo, -1);
  for (let s = 0; s < gw.w * gw.h; s++) {
    let [x, y] = cellXY(gw, s, gx, gy, cs), c = gw.cell[s], cx = x + cs / 2, cy = y + cs / 2;
    if (c === '#') { noStroke(); fill(70, 76, 120); rect(x + 1, y + 1, cs - 2, cs - 2, 3); continue; }
    if (c === 'G') { noStroke(); fill(...GOLD); rect(x + 1, y + 1, cs - 2, cs - 2, 3); fill(40, 30, 0); textAlign(CENTER, CENTER); textSize(cs * 0.4); text('G', cx, cy); continue; }
    let corners = [[x, y], [x + cs, y], [x + cs, y + cs], [x, y + cs]];
    for (let a = 0; a < 4; a++) {          // 上=上の辺、右=右の辺 … の三角形
      let p1 = corners[a], p2 = corners[(a + 1) % 4], v = agent.Q[s][a];
      let t = 1 - clampv(v / lo, 0, 1); stroke(14, 16, 34); strokeWeight(1);
      fill(30 + 60 * t + 160 * t * t, 34 + 150 * t, 80 + 40 * t); triangle(p1[0], p1[1], p2[0], p2[1], cx, cy);
    }
    if (c === 'S') { noStroke(); fill(255); textAlign(CENTER, CENTER); textSize(cs * 0.35); text('S', cx, cy); }
  }
  let gp = greedyPath(agent, gw);
  stroke(...PINK); strokeWeight(3); polyline(gp.map((s) => { let [x, y] = cellXY(gw, s, gx, gy, cs); return [x + cs / 2, y + cs / 2]; }));
  let [ax, ay] = cellXY(gw, agent.s, gx, gy, cs); noStroke(); fill(...CYAN); circle(ax + cs / 2, ay + cs / 2, cs * 0.5);

  // ---- エピソードごとの歩数
  let shortest = bfsDist(gw, gw.cell.indexOf('G'))[gw.cell.indexOf('S')], n = agent.epLens.length;
  let g = { x: gx + gw.w * cs + 60, y: 120, w: width - (gx + gw.w * cs + 60) - 40, h: 260, x0: 0, x1: Math.max(50, n), y0: 0, y1: 3.4 };
  plotAxes(g, 'エピソード', 'log₁₀（ゴールまでの歩数）', [0, Math.round(g.x1 / 2), g.x1], [0, 1, 2, 3]);
  if (isFinite(shortest)) { stroke(...LIME, 160); strokeWeight(1); line(g.x, gY(g, Math.log10(shortest)), g.x + g.w, gY(g, Math.log10(shortest))); }
  drawCurve(g, agent.epLens.map((v) => Math.log10(v)), CYAN, 2);
  noStroke(); fill(230); textSize(16); textAlign(LEFT, BASELINE);
  let py = g.y + g.h + 60, reach = gw.cell[gp[gp.length - 1]] === 'G';
  text('最短の道 = ' + (isFinite(shortest) ? shortest + ' 歩（緑の線）' : 'なし'), g.x, py);
  text('ピンクの道（貪欲方策）= ' + (reach ? gp.length - 1 + ' 歩' : 'まだゴールに着かない'), g.x, py + 26);
  text('直近のエピソード = ' + (n ? agent.epLens[n - 1] + ' 歩（ε のぶん寄り道する）' : '—'), g.x, py + 52);
  fill(170, 176, 210); textSize(14);
  text('はじめは Q = 0。歩くたびに −1 されるので、通ったマスほど暗くなる', g.x, py + 86);
  text('→ まだ行っていない向きが明るく見え、自然に探索がすすむ', g.x, py + 108);
  drawSelfTest(width - 180, height - 14);
}

function mousePressed() {
  let s = cellAt(gw, gx, gy, cs, mouseX, mouseY);
  if (s < 0 || gw.cell[s] === 'S' || gw.cell[s] === 'G' || s === agent.s) return;
  gw.cell[s] = gw.cell[s] === '#' ? '.' : '#';
}
function keyPressed() {
  if (key === 'f' || key === 'F') speed = (speed + 1) % 3;
  if (key === ' ') paused = !paused;
  if (key === UP_ARROW) eps = Math.min(1, Math.round((eps + 0.05) * 100) / 100);
  if (key === DOWN_ARROW) eps = Math.max(0, Math.round((eps - 0.05) * 100) / 100);
  if (key === RIGHT_ARROW) lr = Math.min(1, Math.round((lr + 0.1) * 10) / 10);
  if (key === LEFT_ARROW) lr = Math.max(0.1, Math.round((lr - 0.1) * 10) / 10);
  if (key === 'r' || key === 'R') agent = makeQAgent(gw);
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let g = gridParse(mapRows), L = bfsDist(g, g.cell.indexOf('G'))[g.cell.indexOf('S')];
  check('迷路はゴールまで行ける（最短 ' + L + ' 歩、幅優先探索）', isFinite(L) && L > 0);
  seedRng(12); let ag = makeQAgent(g);
  while (ag.epLens.length < 300) qStep(ag, g, 0.1, 0.5);
  let gp = greedyPath(ag, g);
  check('300 エピソード後の貪欲方策の道 = 最短の ' + L + ' 歩', g.cell[gp[gp.length - 1]] === 'G' && gp.length - 1 === L);
  check('歩数が減る：最後の 20 回の平均 ' + fmtN(meanOf(ag.epLens.slice(-20)), 1) + ' < 最初の 20 回の平均の 1/5', meanOf(ag.epLens.slice(-20)) < meanOf(ag.epLens.slice(0, 20)) / 5);
  // 手計算との照合：Q = 0 のマスで右に動いたら Q ← 0 + 0.5 (−1 + 0.95·0 − 0) = −0.5
  let toy = makeQAgent(g); seedRng(1); toy.Q[toy.s] = [-9, 0, -9, -9];
  qStep(toy, g, 0, 0.5);
  check('1 回の更新が式どおり：Q(S, 右) = 0 + 0.5 × (−1 + 0.95 × 0 − 0) = −0.5', near(toy.Q[g.cell.indexOf('S')][1], -0.5, 1e-12));
  check('Q の値は有限（NaN なし）', ag.Q.every((q) => noNaN(q)));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. ε を 0 にすると？ 0.5 にすると？（学習の速さと、直近のエピソードの歩数をくらべる）
// 2. 学習のあとで壁をクリックして道をふさごう。ピンクの道はどう変わる？ どのくらいで新しい道を見つける？
// 3. α を 0.1 と 1.0 でくらべよう（迷路は決定的なので α = 1 でもよい。06 の崖では？）
// 4. STEP_R を 0 にして、ゴールで +1 だけもらう形にすると？（07 の探索の話につながる）
// 5. 迷路を自分で作ろう（mapRows を書きかえる）

// ==================================================
// ここから下は「強化学習の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 色と小さな道具
const BG = [14, 16, 34];                // 背景（アーケードの紺）
const GOLD = [255, 196, 60], CYAN = [90, 215, 245], PINK = [245, 110, 170], LIME = [160, 230, 110], VIOLET = [175, 140, 255];
function clampv(v, a, b) { return v < a ? a : v > b ? b : v !== v ? a : v; }     // NaN なら a に戻す
function argmaxR(q) {                  // いちばん大きい値の番号（同点はランダムに 1 つ）
  let m = -Infinity, best = [];
  for (let i = 0; i < q.length; i++) {
    if (q[i] > m + 1e-12) { m = q[i]; best = [i]; } else if (Math.abs(q[i] - m) <= 1e-12) best.push(i);
  }
  return best.length ? best[Math.floor(rnd() * best.length)] : 0;
}
function argmaxFirst(q) { let b = 0; for (let i = 1; i < q.length; i++) if (q[i] > q[b]) b = i; return b; }   // 同点は若い番号
function maxOf(q) { let m = -Infinity; for (let v of q) if (v > m) m = v; return m; }
function epsGreedy(q, eps) { return rnd() < eps ? Math.floor(rnd() * q.length) : argmaxR(q); }   // ε の確率でランダム、ほかは貪欲
function softmaxArr(h, tau) {          // ボルツマン分布 exp(h/τ) / Σ（大きい数でもあふれないように最大値を引く）
  let m = maxOf(h), e = h.map((v) => Math.exp((v - m) / (tau || 1))), s = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / s);
}
function sampleFrom(p) { let u = rnd(), c = 0; for (let i = 0; i < p.length; i++) { c += p[i]; if (u < c) return i; } return p.length - 1; }
function meanOf(a) { return a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0; }
function fmtN(v, d) { if (typeof v !== 'number' || v !== v) return '?'; let s = v.toFixed(d === undefined ? 2 : d); return s === '-0.00' || s === '-0.0' || s === '-0' ? s.slice(1) : s; }
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
function randn() { let u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }   // 標準正規分布
// ---- グラフの道具：g = { x, y, w, h, x0, x1, y0, y1 }
function gX(g, v) { return g.x + clampv((v - g.x0) / (g.x1 - g.x0), -0.02, 1.02) * g.w; }
function gY(g, v) { return g.y + g.h - clampv((v - g.y0) / (g.y1 - g.y0), -0.02, 1.02) * g.h; }
function plotAxes(g, xl, yl, xt, yt) {
  stroke(70, 76, 110); strokeWeight(1); noFill(); rect(g.x, g.y, g.w, g.h);
  noStroke(); fill(150, 156, 190); textSize(12); textAlign(CENTER, TOP);
  for (let v of xt) text(+v.toPrecision(3), gX(g, v), g.y + g.h + 4);
  textAlign(RIGHT, CENTER);
  for (let v of yt) text(+v.toPrecision(3), g.x - 5, gY(g, v));
  textAlign(LEFT, BASELINE); fill(205, 210, 235); textSize(13);
  text(xl, g.x + g.w - textWidth(xl), g.y + g.h + 30); text(yl, g.x, g.y - 8);
}
function polyline(pts) {               // 点が 2 つ以上あるときだけ折れ線を描く（空の beginShape を作らない）
  if (pts.length < 2) return;
  noFill(); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape();
}
function smoothArr(a, k) {             // 直前 k 個の平均（ギザギザの学習曲線をならす）
  let out = [], s = 0;
  for (let i = 0; i < a.length; i++) { s += a[i]; if (i >= k) s -= a[i - k]; out.push(s / Math.min(i + 1, k)); }
  return out;
}
function drawCurve(g, arr, col, sw, xOff) {   // arr[i] を x = i (+ xOff) に。長いときは間引いて 600 点まで
  let n = arr.length, stride = Math.max(1, Math.ceil(n / 600)), pts = [];
  for (let i = 0; i < n; i += stride) pts.push([gX(g, i + (xOff || 0)), gY(g, arr[i])]);
  if (n > 1 && (n - 1) % stride) pts.push([gX(g, n - 1 + (xOff || 0)), gY(g, arr[n - 1])]);
  stroke(...col); strokeWeight(sw || 2); polyline(pts);
}
function legend(x, y, items) {         // items = [[色, 名前], …]
  textSize(13); textAlign(LEFT, CENTER);
  for (let [c, s] of items) { noStroke(); fill(...c); rect(x, y - 5, 16, 10); fill(220, 225, 245); text(s, x + 22, y); y += 20; }
}
// ---- グリッドワールド：文字の地図 '.' 床、'#' 壁、'S' スタート、'G' 宝（+1 で終わり）、'P' 落とし穴（−1 で終わり）
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];    // 行動 0 上、1 右、2 下、3 左
const DIR_NAMES = ['上', '右', '下', '左'];
function gridParse(rows) { return { w: rows[0].length, h: rows.length, cell: rows.join('').split('') }; }
function gridMove(gw, s, a) {          // 決まった向きに 1 マス。外や壁ならその場にとどまる
  let x = s % gw.w + DIRS[a][0], y = Math.floor(s / gw.w) + DIRS[a][1];
  if (x < 0 || y < 0 || x >= gw.w || y >= gw.h || gw.cell[y * gw.w + x] === '#') return s;
  return y * gw.w + x;
}
function isTerminalCell(c) { return c === 'G' || c === 'P'; }
function enterReward(c, stepR) { return c === 'G' ? 1 : c === 'P' ? -1 : stepR; }
// マルコフ決定過程を作る：P[s][a] = [{ s2, p, r }]。意図した向きに 1 − slip、左右の直角の向きに slip/2 ずつ
function buildMdp(gw, slip, stepR) {
  let nS = gw.w * gw.h, P = [], term = [];
  for (let s = 0; s < nS; s++) {
    let c = gw.cell[s]; term.push(isTerminalCell(c) || c === '#'); P.push([]);
    for (let a = 0; a < 4; a++) {
      if (term[s]) { P[s].push([{ s2: s, p: 1, r: 0 }]); continue; }       // 終わりのマス（と壁）はそこに留まり、報酬 0
      let outs = [[a, 1 - slip], [(a + 1) % 4, slip / 2], [(a + 3) % 4, slip / 2]], list = [];
      for (let [d, p] of outs) {
        if (p <= 0) continue;
        let s2 = gridMove(gw, s, d), r = enterReward(gw.cell[s2], stepR), e = list.find((o) => o.s2 === s2);
        if (e) e.p += p; else list.push({ s2, p, r });
      }
      P[s].push(list);
    }
  }
  return { nS, nA: 4, P, term, gw };
}
function qValue(mdp, V, gamma, s, a) { let q = 0; for (let o of mdp.P[s][a]) q += o.p * (o.r + gamma * V[o.s2]); return q; }
function viSweep(mdp, V, gamma) {      // 価値反復の 1 回：V(s) ← max_a Σ p (r + γ V(s'))。戻り値 = 最大の変化量
  let nv = V.slice(), d = 0;
  for (let s = 0; s < mdp.nS; s++) {
    if (mdp.term[s]) continue;
    let best = -Infinity; for (let a = 0; a < 4; a++) best = Math.max(best, qValue(mdp, V, gamma, s, a));
    nv[s] = best; d = Math.max(d, Math.abs(best - V[s]));
  }
  for (let s = 0; s < mdp.nS; s++) V[s] = nv[s];
  return d;
}
function valueIteration(mdp, gamma, tol, maxIt) {
  let V = new Array(mdp.nS).fill(0), its = 0, d = Infinity, deltas = [];
  while (d >= tol && its < (maxIt || 100000)) { d = viSweep(mdp, V, gamma); deltas.push(d); its++; }
  return { V, its, deltas };
}
function optimalActs(mdp, V, gamma, s, tol) {     // 最適な行動の集合（同点は全部）
  let q = [0, 1, 2, 3].map((a) => qValue(mdp, V, gamma, s, a)), m = maxOf(q);
  return [0, 1, 2, 3].filter((a) => q[a] >= m - (tol || 1e-9));
}
function evalPolicy(mdp, pi, gamma, tol, V0) {    // 方策評価：V(s) ← Σ p (r + γ V(s')) を、変化が tol 未満になるまで
  let V = V0 ? V0.slice() : new Array(mdp.nS).fill(0), sweeps = 0, d = Infinity;
  while (d >= tol && sweeps < 100000) {
    d = 0;
    for (let s = 0; s < mdp.nS; s++) {
      if (mdp.term[s]) continue;
      let v = qValue(mdp, V, gamma, s, pi[s]); d = Math.max(d, Math.abs(v - V[s])); V[s] = v;
    }
    sweeps++;
  }
  return { V, sweeps };
}
function cellXY(gw, s, gx, gy, cs) { return [gx + (s % gw.w) * cs, gy + Math.floor(s / gw.w) * cs]; }
function drawArrowIn(cx, cy, a, len) { // マスの中心から向き a に矢印
  let dx = DIRS[a][0], dy = DIRS[a][1], ex = cx + dx * len, ey = cy + dy * len;
  line(cx - dx * len * 0.4, cy - dy * len * 0.4, ex, ey);
  noStroke(); triangle(ex + dx * 5, ey + dy * 5, ex - dy * 5 - dx * 2, ey + dx * 5 - dy * 2, ex + dy * 5 - dx * 2, ey - dx * 5 - dy * 2);
}
function drawCells(gw, gx, gy, cs, skipFloor) {   // 壁・宝・落とし穴・スタートを描く
  textAlign(CENTER, CENTER); textSize(cs * 0.4);
  for (let s = 0; s < gw.w * gw.h; s++) {
    let c = gw.cell[s], [x, y] = cellXY(gw, s, gx, gy, cs);
    if (c === '.' && skipFloor) continue;
    noStroke();
    if (c === '#') fill(70, 76, 120); else if (c === 'G') fill(...GOLD); else if (c === 'P') fill(120, 30, 70); else fill(26, 30, 60);
    rect(x + 1, y + 1, cs - 2, cs - 2, 4);
    if (c === 'G') { fill(40, 30, 0); text('宝', x + cs / 2, y + cs / 2); }
    if (c === 'P') { fill(255, 150, 190); text('穴', x + cs / 2, y + cs / 2); }
    if (c === 'S') { fill(...CYAN); text('S', x + cs / 2, y + cs / 2); }
  }
}
function cellAt(gw, gx, gy, cs, mx, my) {         // マウスの下のマス（なければ −1）
  let x = Math.floor((mx - gx) / cs), y = Math.floor((my - gy) / cs);
  return x >= 0 && y >= 0 && x < gw.w && y < gw.h ? y * gw.w + x : -1;
}
function bfsDist(gw, goal) {           // 決定的に動くときの、各マスからゴールまでの最短の歩数（届かなければ Infinity）
  let d = new Array(gw.w * gw.h).fill(Infinity), q = [goal]; d[goal] = 0;
  while (q.length) {
    let s = q.shift();
    for (let a = 0; a < 4; a++) {
      let x = s % gw.w - DIRS[a][0], y = Math.floor(s / gw.w) - DIRS[a][1], p = y * gw.w + x;   // p から向き a で s に来られる？
      if (x < 0 || y < 0 || x >= gw.w || y >= gw.h || gw.cell[p] === '#' || d[p] < Infinity || isTerminalCell(gw.cell[p])) continue;
      if (gridMove(gw, p, a) === s) { d[p] = d[s] + 1; q.push(p); }
    }
  }
  return d;
}
function valueFill(v, lo, hi) {        // 低い = 紫、0 = 紺、高い = 金
  let t = clampv((v - lo) / (hi - lo || 1), 0, 1);
  if (t < 0.5) { let u = t / 0.5; fill(110 - 80 * u, 60 - 30 * u, 150 - 90 * u); }
  else { let u = (t - 0.5) / 0.5; fill(30 + 220 * u, 30 + 160 * u, 60 - 20 * u); }
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) || ArrayBuffer.isView(v) ? Array.from(v).every(noNaN) : !(typeof v === 'number' && !isFinite(v)); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(120, 225, 200) : color(255, 90, 120)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
