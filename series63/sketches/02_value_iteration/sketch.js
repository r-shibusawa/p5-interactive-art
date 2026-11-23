// ============================================
// 02 価値反復 ─ ベルマン最適方程式 V(s) = max_a Σ_s' P(s′|s,a) (r + γ V(s′)) をくり返して解く
// 1 回ごとに「1 歩先まで見た最善」を全部のマスで計算しなおす。最大の変化量は毎回 γ 倍以下に縮み、0 に近づく。
// 落ち着いた価値から、各マスで価値がいちばん大きくなる向き（矢印）= 最適方策。すべりやすいと穴のそばを避ける道に変わる
// スペース 1 回すすめる / A 自動 / ↑↓ γ / ← → すべり / クリック 床→壁→宝→穴 / R 価値を 0 に戻す
// ============================================

let mapRows = [                          // ★ 地図（. 床、# 壁、S スタート、G 宝 +1、P 落とし穴 −1）
  '..........',
  '.....#....',
  '..........',
  'S........G',
  '.PPPPPPPP.',
  '..........',
];
let gamma = 0.95, slip = 0.2;            // ★ 割引率とすべりやすさ
const STEP_R = -0.04;                    // ★ 1 歩ごとの報酬
const TOL = 1e-8;                        // ★ 収束の判定：最大の変化量がこれより小さくなったら終わり
let gw, mdp, vTable = [], deltas = [], iter = 0, auto = true, gx = 40, gy = 110, cs = 60;

function setup() {
  createCanvas(windowWidth, windowHeight);
  gw = gridParse(mapRows);
  selfTest();
  rebuild();
}
function rebuild() { mdp = buildMdp(gw, slip, STEP_R); resetV(); }
function resetV() { vTable = new Array(mdp.nS).fill(0); deltas = []; iter = 0; }
function sweepOnce() { if (deltas.length && deltas[deltas.length - 1] < TOL) return; deltas.push(viSweep(mdp, vTable, gamma)); iter++; }

// S から、各マスの最適な向き（同点なら最初のもの）に「意図どおり」進んだ道
function greedyRoute(m, V, gam) {
  let s = m.gw.cell.indexOf('S'), route = [s];
  for (let t = 0; t < 60 && !m.term[s]; t++) { let a = optimalActs(m, V, gam, s, 1e-9)[0]; s = gridMove(m.gw, s, a); if (route.includes(s)) break; route.push(s); }
  return route;
}

function draw() {
  background(...BG);
  if (auto && frameCount % 20 === 0) sweepOnce();
  cs = Math.min(66, (width * 0.56 - 60) / gw.w, (height - 230) / gw.h);
  noStroke(); fill(240); textSize(22); textAlign(LEFT, BASELINE);
  text('価値反復：' + iter + ' 回目　γ = ' + gamma.toFixed(2) + '　すべり = ' + slip.toFixed(1), 40, 42);
  fill(170, 176, 210); textSize(15);
  text('スペース 1 回　A 自動（' + (auto ? 'ON' : 'OFF') + '）　↑↓ γ　← → すべり　クリック 床→壁→宝→穴　R 価値を 0 に', 40, 68);

  // ---- マスの色 = 価値、数字 = V(s)、矢印 = 最適な向き
  for (let s = 0; s < mdp.nS; s++) {
    let [x, y] = cellXY(gw, s, gx, gy, cs), c = gw.cell[s];
    if (c === '#' || mdp.term[s]) continue;
    noStroke(); valueFill(vTable[s], -1, 1); rect(x + 1, y + 1, cs - 2, cs - 2, 4);
  }
  drawCells(gw, gx, gy, cs, true);
  for (let s = 0; s < mdp.nS; s++) {
    if (mdp.term[s]) continue;
    let [x, y] = cellXY(gw, s, gx, gy, cs);
    fill(235); noStroke(); textAlign(CENTER, TOP); textSize(Math.max(10, cs * 0.2)); text(fmtN(vTable[s]), x + cs / 2, y + 3);
    if (iter > 0) for (let a of optimalActs(mdp, vTable, gamma, s, 1e-9)) { stroke(255, 255, 255, 200); strokeWeight(2); fill(255, 255, 255, 200); drawArrowIn(x + cs / 2, y + cs * 0.6, a, cs * 0.22); }
  }
  if (iter > 0) {
    let route = greedyRoute(mdp, vTable, gamma);
    stroke(...CYAN); strokeWeight(4); polyline(route.map((s) => { let [x, y] = cellXY(gw, s, gx, gy, cs); return [x + cs / 2, y + cs * 0.6]; }));
  }

  // ---- 最大の変化量（対数）
  let g = { x: gx + gw.w * cs + 60, y: 120, w: Math.min(460, width - gx - gw.w * cs - 100), h: 230, x0: 0, x1: Math.max(20, iter), y0: -9, y1: 1 };
  plotAxes(g, 'くり返しの回数', 'log₁₀（最大の変化量）', [0, Math.round(g.x1 / 2), g.x1], [-8, -4, 0]);
  stroke(...GOLD, 120); strokeWeight(1); line(g.x, gY(g, -8), g.x + g.w, gY(g, -8));
  drawCurve(g, deltas.map((d) => Math.log10(Math.max(d, 1e-12))), CYAN, 2.5, 1);
  let last = deltas.length ? deltas[deltas.length - 1] : Infinity, py = g.y + g.h + 60;
  noStroke(); fill(230); textSize(16); textAlign(LEFT, BASELINE);
  text('最大の変化量 = ' + (isFinite(last) ? last.toExponential(2) : '—') + (last < TOL ? '　→ 収束（< 10⁻⁸）' : ''), g.x, py);
  text('V(S) = ' + fmtN(vTable[gw.cell.indexOf('S')], 4), g.x, py + 26);
  fill(170, 176, 210); textSize(14);
  text('理屈：1 回ごとに誤差は γ 倍以下に縮む（縮小写像）', g.x, py + 56);
  text('→ 10⁻⁸ まで多くても log(10⁻⁸) / log γ ≈ ' + Math.ceil(Math.log(1e-8) / Math.log(Math.max(gamma, 0.01))) + ' 回', g.x, py + 78);
  text('水色の線 = S から最適な向きに進んだ道', g.x, py + 108);
  text('すべり 0 → 穴のとなりを最短で。すべり 0.2 → 遠回り', g.x, py + 130);
  drawSelfTest(width - 180, height - 14);
}

function mousePressed() {
  let s = cellAt(gw, gx, gy, cs, mouseX, mouseY);
  if (s < 0 || gw.cell[s] === 'S') return;
  let order = ['.', '#', 'G', 'P']; gw.cell[s] = order[(order.indexOf(gw.cell[s]) + 1) % 4]; rebuild();
}
function keyPressed() {
  if (key === ' ') sweepOnce();
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'r' || key === 'R') resetV();
  if (key === UP_ARROW) { gamma = Math.min(0.99, Math.round((gamma + 0.05) * 100) / 100); rebuild(); }
  if (key === DOWN_ARROW) { gamma = Math.max(0.05, Math.round((gamma - 0.05) * 100) / 100); rebuild(); }
  if (key === RIGHT_ARROW) { slip = Math.min(0.8, Math.round((slip + 0.1) * 10) / 10); rebuild(); }
  if (key === LEFT_ARROW) { slip = Math.max(0, Math.round((slip - 0.1) * 10) / 10); rebuild(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let gwT = gridParse(mapRows);           // テスト用の地図（画面の地図とは別）
  let m = buildMdp(gwT, 0.2, STEP_R), r = valueIteration(m, 0.95, TOL, 5000);
  check('価値反復が収束：最大の変化量 < 10⁻⁸（' + r.its + ' 回）', r.deltas[r.deltas.length - 1] < TOL && r.its < 5000);
  let res = 0; for (let s = 0; s < m.nS; s++) if (!m.term[s]) res = Math.max(res, Math.abs(r.V[s] - maxOf([0, 1, 2, 3].map((a) => qValue(m, r.V, 0.95, s, a)))));
  check('結果はベルマン最適方程式を満たす：|V − max_a Q| ≤ ' + res.toExponential(1), res < 1e-7);
  let okC = true; for (let k = 1; k < r.deltas.length; k++) if (r.deltas[k] > 0.95 * r.deltas[k - 1] + 1e-12) okC = false;
  check('縮小：毎回の最大の変化量 ≤ γ × 前回', okC);
  // すべり 0：最短経路の長さ L から V(S) を手で計算
  let m0 = buildMdp(gwT, 0, STEP_R), r0 = valueIteration(m0, 0.95, 1e-12, 5000), st = gwT.cell.indexOf('S'), L = bfsDist(gwT, gwT.cell.indexOf('G'))[st];
  let hand = 0; for (let t = 0; t < L - 1; t++) hand += Math.pow(0.95, t) * STEP_R; hand += Math.pow(0.95, L - 1);
  check('すべり 0：V(S) = 最短 ' + L + ' 歩の割引つき報酬 ' + fmtN(hand, 6), near(r0.V[st], hand, 1e-9));
  // すべりで道が変わる：穴のとなりを通るか
  let besidePit = (route) => route.some((s) => !m.term[s] && [0, 1, 2, 3].some((a) => gwT.cell[gridMove(gwT, s, a)] === 'P'));
  let routeA = greedyRoute(m0, r0.V, 0.95), routeB = greedyRoute(m, r.V, 0.95);
  check('すべり 0 の道は穴のとなりを通る、すべり 0.2 の道は通らない（遠回り）', besidePit(routeA) && !besidePit(routeB) && routeB.length > routeA.length);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. スペースで 1 回ずつ進めて、宝の価値がどこまで「しみ出す」か見よう。何回で S に届く？
// 2. γ を 0.5 にすると、収束までの回数と道はどう変わる？（遠くの宝が見えにくくなる）
// 3. すべりを 0.1 ずつ上げて、道が遠回りに切りかわるのはどこ？
// 4. STEP_R を −0.5 にすると、穴に飛びこむほうが得なマスが出てくる。どこ？
// 5. 壁をクリックで置いて、迷路にしてみよう。矢印はどう変わる？

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
