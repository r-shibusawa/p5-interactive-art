// ============================================
// 04 ギャンブラーの破産 ─ 所持金 i から 1 回ごとに確率 p で +1、1 − p で −1。0 になったら破産、目標 goal で終わり
// 0 と goal は吸収状態（03 の例 2）。破産する確率と、終わるまでの平均の回数を 3 つの方法で求める
//   ① 公式（p ≠ 1/2 と p = 1/2 で形がちがう）② 基本行列 N = (I − Q)⁻¹（05 と同じ方法）③ 1 万回のシミュレーション
// p = 0.5 から少し不利になるだけで、目標が遠いと破産がほぼ確実になる
// ← → 勝つ確率 p / ↑↓ はじめの所持金 / T 目標（10・20・50）/ スペース シミュレーションをやり直す
// ============================================

let pWin = 48;                           // ★ 勝つ確率（%、整数で持つ → 0.48）
let start = 10, goal = 20;               // ★ はじめの所持金と目標
const GAMES = 10000;                     // ★ シミュレーションの回数
let exact = null, simRuin = 0, simLen = 0, simDone = 0, paths = [], lenHist = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  seedRng(4); recompute();
}
// ★ ① 公式：r = q/p として、破産の確率 = (r^i − r^N) / (1 − r^N)、p = 1/2 なら 1 − i/N
function ruinFormula(p, i, nG) {
  if (Math.abs(p - 0.5) < 1e-6) return 1 - i / nG;
  let r = (1 - p) / p; return (Math.pow(r, i) - Math.pow(r, nG)) / (1 - Math.pow(r, nG));
}
// 平均の回数：p = 1/2 なら i (N − i)、そうでなければ i/(q − p) − N/(q − p) × (1 − r^i)/(1 − r^N)
function durationFormula(p, i, nG) {
  if (Math.abs(p - 0.5) < 1e-6) return i * (nG - i);
  let q = 1 - p, r = q / p; return i / (q - p) - (nG / (q - p)) * (1 - Math.pow(r, i)) / (1 - Math.pow(r, nG));
}
// ★ ② 基本行列：一時的な状態 1..N−1 の間の遷移 Q、N = (I − Q)⁻¹。平均回数 = N 1、破産確率 = N × (状態 1 から 0 へ行く確率 q)
function fundamental(p, nG) {
  let m = nG - 1, iq = eyeMat(m);
  for (let k = 0; k < m; k++) { if (k + 1 < m) iq[k][k + 1] -= p; if (k - 1 >= 0) iq[k][k - 1] -= 1 - p; }
  let fm = matInv(iq); if (!fm) return null;
  return { fm, steps: fm.map((r) => sumOf(r)), ruin: fm.map((r) => r[0] * (1 - p)) };
}
function playGame(p, i, nG, keep) {      // 1 ゲーム：戻り値 [破産したか, 回数]
  let x = i, t = 0, path = keep ? [x] : null;
  while (x > 0 && x < nG && t < 1e6) { x += rnd() < p ? 1 : -1; t++; if (keep && t < 2000) path.push(x); }
  if (keep) paths.push(path);
  return [x === 0, t];
}
function recompute() {
  let p = pWin / 100; start = clampv(start, 1, goal - 1);
  exact = { ruin: ruinFormula(p, start, goal), len: durationFormula(p, start, goal), fund: fundamental(p, goal) };
  simRuin = 0; simLen = 0; simDone = 0; paths = []; lenHist = new Array(30).fill(0);
}

function draw() {
  background(...BG);
  let p = pWin / 100, t0 = performance.now();
  while (simDone < GAMES && performance.now() - t0 < 6) {   // 1 フレームに 6 ミリ秒ずつ
    let [ru, len] = playGame(p, start, goal, paths.length < 40); simRuin += ru ? 1 : 0; simLen += len; simDone++;
    lenHist[Math.min(29, Math.floor(len / (goal * goal / 10)))]++;
  }
  hudTitle('ギャンブラーの破産：p = ' + p.toFixed(2) + '　所持金 ' + start + ' から　目標 ' + goal, '← → p　↑↓ はじめの所持金　T 目標　スペース もう一度シミュレーション（' + simDone + ' / ' + GAMES + ' 回）');

  // ---- 所持金の道のり（最初の 40 ゲーム）
  let g = { x: 70, y: 110, w: width * 0.5, h: height * 0.38, x0: 0, x1: Math.max(50, Math.min(2000, Math.ceil(exact.len * 2.5))), y0: 0, y1: goal };
  plotAxes(g, '回数', '所持金（赤 = 破産、緑 = 目標に到達）', [0, Math.round(g.x1 / 2), g.x1], [0, start, goal]);
  for (let path of paths) { let col = path[path.length - 1] <= 0 ? DICE : path[path.length - 1] >= goal ? TEAL : SUB; stroke(col[0], col[1], col[2], 120); strokeWeight(1.5); let pts = []; for (let k = 0; k < path.length; k += Math.max(1, Math.floor(path.length / 300))) pts.push([gX(g, k), gY(g, path[k])]); pts.push([gX(g, path.length - 1), gY(g, path[path.length - 1])]); polyline(pts); }

  // ---- 3 つの方法の表
  let tx = g.x + g.w + 60, ty = 130, f = exact.fund, idx = start - 1;
  noStroke(); fill(...CREAM); textSize(16); textAlign(LEFT, BASELINE); text('所持金 ' + start + ' からの答え', tx, ty);
  let rowsT = [['', '破産の確率', '平均の回数'],
    ['① 公式', fmtN(exact.ruin, 4), fmtN(exact.len, 1)],
    ['② 基本行列', f ? fmtN(f.ruin[idx], 4) : '—', f ? fmtN(f.steps[idx], 1) : '—'],
    ['③ シミュレーション', simDone ? fmtN(simRuin / simDone, 4) : '…', simDone ? fmtN(simLen / simDone, 1) : '…']];
  rowsT.forEach((r, k) => { fill(...(k === 0 ? SUB : [MUSTARD, TEAL, DICE][k - 1])); textSize(15); text(r[0], tx, ty + 34 + k * 28); fill(...CREAM); text(r[1], tx + 160, ty + 34 + k * 28); text(r[2], tx + 270, ty + 34 + k * 28); });

  // ---- 破産の確率 と はじめの所持金（p をいくつか）
  let g2 = { x: tx, y: ty + 190, w: Math.min(400, width - tx - 50), h: height * 0.26, x0: 0, x1: goal, y0: 0, y1: 1 };
  plotAxes(g2, 'はじめの所持金 i', '破産の確率（公式）', [0, goal / 2, goal], [0, 0.5, 1]);
  [[0.5, SUB], [0.45, PLUM], [p, MUSTARD]].forEach(([pp, col]) => { let pts = []; for (let i = 0; i <= goal; i++) pts.push([gX(g2, i), gY(g2, ruinFormula(pp, i, goal))]); stroke(...col); strokeWeight(pp === p ? 3 : 1.5); polyline(pts); });
  noStroke(); fill(...DICE); if (simDone) circle(gX(g2, start), gY(g2, simRuin / simDone), 10);
  legend(g2.x + 10, g2.y + g2.h + 50, [[MUSTARD, 'p = ' + p.toFixed(2) + '（いま）'], [SUB, 'p = 0.50'], [PLUM, 'p = 0.45']]);

  // ---- 少し不利なだけで
  let by = g.y + g.h + 70;
  fill(...CREAM); textSize(16); textAlign(LEFT, BASELINE); text('少し不利なだけで…（所持金 100 で、200 にしたい）', 70, by);
  [0.5, 0.49, 0.48, 0.45].forEach((pp, k) => { let r = ruinFormula(pp, 100, 200); fill(...SUB); textSize(15); text('p = ' + pp.toFixed(2), 70, by + 30 + k * 26); fill(...DICE); rect(160, by + 18 + k * 26, r * 300, 16, 3); fill(...CREAM); text('破産 ' + fmtN(100 * r, 2) + '%', 470, by + 30 + k * 26); });
  drawSelfTest(width - 180, height - 14);
}

function keyPressed() {
  if (key === RIGHT_ARROW) pWin = Math.min(70, pWin + 1);
  if (key === LEFT_ARROW) pWin = Math.max(30, pWin - 1);
  if (key === UP_ARROW) start = Math.min(goal - 1, start + 1);
  if (key === DOWN_ARROW) start = Math.max(1, start - 1);
  if (key === 't' || key === 'T') { goal = goal === 10 ? 20 : goal === 20 ? 50 : 10; start = Math.round(goal / 2); }
  recompute();
  return false;
}

// ============================================
// やってみよう
// 1. p = 0.50 と 0.49 で、目標 50 の破産の確率をくらべよう。差はたった 0.01 なのに？
// 2. p > 0.5（有利）にすると、破産の確率の曲線はどんな形？
// 3. p = 0.5 のときの平均の回数 i (N − i) は、真ん中から始めると最大。なぜ？
// 4. カジノは「目標を持たずに続ける人」に強い。goal を大きくすると破産の確率は 1 に近づく
// ============================================

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let worstR = 0, worstT = 0;
  for (let pp of [0.3, 0.45, 0.49, 0.5, 0.51, 0.6]) for (let nG of [5, 10, 20]) {
    let fd = fundamental(pp, nG);
    for (let i = 1; i < nG; i++) { worstR = Math.max(worstR, Math.abs(fd.ruin[i - 1] - ruinFormula(pp, i, nG))); worstT = Math.max(worstT, Math.abs(fd.steps[i - 1] - durationFormula(pp, i, nG)) / durationFormula(pp, i, nG)); }
  }
  check('破産の確率：公式 = 基本行列（p 6 通り × 目標 3 通り、ずれ ' + worstR.toExponential(1) + '）', worstR < 1e-9);
  check('平均の回数：公式 = 基本行列（相対ずれ ' + worstT.toExponential(1) + '）', worstT < 1e-9);
  check('p = 0.5 + 10⁻⁷ でも公式は p = 0.5 の値につながる（0/0 にならない）', near(ruinFormula(0.5 + 1e-7, 3, 10), 0.7, 1e-5) && near(durationFormula(0.5 + 1e-7, 3, 10), 21, 1e-3));
  check('p = 0.5：破産 = 1 − i/N、平均の回数 = i (N − i)', near(ruinFormula(0.5, 10, 20), 0.5) && near(durationFormula(0.5, 10, 20), 100));
  seedRng(41); let ru = 0, len = 0, nGm = 20000;
  for (let k = 0; k < nGm; k++) { let [a, b] = playGame(0.48, 10, 20, false); ru += a ? 1 : 0; len += b; }
  check('シミュレーション 2 万回（p = 0.48）：破産の確率 ' + fmtN(ru / nGm, 3) + ' ≈ 公式 ' + fmtN(ruinFormula(0.48, 10, 20), 3) + '（2% 以内）', Math.abs(ru / nGm - ruinFormula(0.48, 10, 20)) < 0.02);
  check('シミュレーション：平均の回数 ' + fmtN(len / nGm, 1) + ' ≈ ' + fmtN(durationFormula(0.48, 10, 20), 1) + '（3% 以内）', Math.abs(len / nGm / durationFormula(0.48, 10, 20) - 1) < 0.03);
  check('少し不利（p = 0.49）で 100 → 200：破産の確率 > 98%', ruinFormula(0.49, 100, 200) > 0.98);
  paths = [];
  reportSelfTest();
}

// ==================================================
// ここから下は「マルコフ連鎖の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 色と小さな道具
const BG = [32, 28, 26];                // 背景（あたたかい炭色）
const CREAM = [246, 236, 214], DICE = [236, 96, 58], TEAL = [44, 178, 166], MUSTARD = [236, 190, 82], PLUM = [190, 130, 200], SUB = [190, 178, 160];
const STATE_COLS = [[236, 96, 58], [44, 178, 166], [236, 190, 82], [190, 130, 200], [120, 190, 240], [150, 210, 110], [240, 140, 170], [200, 170, 130]];
function clampv(v, a, b) { return v < a ? a : v > b ? b : v !== v ? a : v; }     // NaN なら a に戻す
function sumOf(a) { let s = 0; for (let v of a) s += v; return s; }
function meanOf(a) { return a.length ? sumOf(a) / a.length : 0; }
function sampleFrom(p) { let u = rnd() * sumOf(p), c = 0; for (let i = 0; i < p.length; i++) { c += p[i]; if (u < c) return i; } return p.length - 1; }   // 確率 p[i] で i を返す
function fmtN(v, d) { if (typeof v !== 'number' || v !== v) return '?'; if (!isFinite(v)) return '∞'; let s = v.toFixed(d === undefined ? 2 : d); return /^-0\.?0*$/.test(s) ? s.slice(1) : s; }
function hudTitle(t, sub) {            // 左上の見出しと操作の説明
  noStroke(); fill(...CREAM); textSize(22); textAlign(LEFT, BASELINE); text(t, 40, 42);
  fill(...SUB); textSize(15); text(sub, 40, 68);
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
function randn() { let u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }   // 標準正規分布
// ---- 行列の道具（行列 = 配列の配列。遷移行列 transP[i][j] = i の次に j へ行く確率、行の和 = 1）
function zerosMat(n, m) { let a = []; for (let i = 0; i < n; i++) a.push(new Array(m === undefined ? n : m).fill(0)); return a; }
function eyeMat(n) { let a = zerosMat(n); for (let i = 0; i < n; i++) a[i][i] = 1; return a; }
function copyMat(a) { return a.map((r) => r.slice()); }
function matMul(a, b) {                // 行列の積 (a b)[i][j] = Σ_k a[i][k] b[k][j]
  let n = a.length, m = b[0].length, kk = b.length, c = zerosMat(n, m);
  for (let i = 0; i < n; i++) for (let k = 0; k < kk; k++) { let v = a[i][k]; if (v !== 0) for (let j = 0; j < m; j++) c[i][j] += v * b[k][j]; }
  return c;
}
function vecMat(v, a) {                // 横ベクトル × 行列：次の時刻の分布 = いまの分布 × P
  let out = new Array(a[0].length).fill(0);
  for (let i = 0; i < v.length; i++) if (v[i] !== 0) for (let j = 0; j < out.length; j++) out[j] += v[i] * a[i][j];
  return out;
}
function matPow(a, k) { let r = eyeMat(a.length); for (let t = 0; t < k; t++) r = matMul(r, a); return r; }   // P^k（k 回かけるだけ）
function maxAbsDiff(a, b) {            // 2 つの行列（またはベクトル）のいちばん大きなずれ
  let d = 0;
  for (let i = 0; i < a.length; i++) { if (Array.isArray(a[i])) d = Math.max(d, maxAbsDiff(a[i], b[i])); else d = Math.max(d, Math.abs(a[i] - b[i])); }
  return d;
}
function rowSumErr(a, target) { let d = 0; for (let r of a) d = Math.max(d, Math.abs(sumOf(r) - (target === undefined ? 1 : target))); return d; }
function fixRows(a) {                  // 行の和を 1 に。全部 0 の行は「その場にとどまる」にする（NaN を出さない）
  return a.map((r, i) => { let s = sumOf(r); if (!(s > 1e-12)) { let z = r.map(() => 0); z[i] = 1; return z; } return r.map((v) => v / s); });
}
function solveLinear(a, b) {           // ガウスの消去法（部分ピボット）で a x = b。解けなければ null
  let n = a.length, m = a.map((r, i) => r.concat([b[i]]));
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    if (Math.abs(m[p][c]) < 1e-13) return null;
    [m[c], m[p]] = [m[p], m[c]];
    for (let r = 0; r < n; r++) { if (r === c) continue; let f = m[r][c] / m[c][c]; if (f !== 0) for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k]; }
  }
  return m.map((r, i) => r[n] / r[i]);
}
function matInv(a) {                   // 逆行列（ガウス-ジョルダン）。逆がなければ null
  let n = a.length, cols = [];
  for (let j = 0; j < n; j++) { let e = new Array(n).fill(0); e[j] = 1; let x = solveLinear(a, e); if (!x) return null; cols.push(x); }
  return a.map((_, i) => cols.map((c) => c[i]));
}
// 定常分布：π P = π と Σ π = 1 を連立方程式として解く（(P^T − I) π = 0 の最後の式を Σ π = 1 に置きかえる）
function stationaryExact(a) {
  let n = a.length, m = zerosMat(n), b = new Array(n).fill(0);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) m[i][j] = a[j][i] - (i === j ? 1 : 0);
  for (let j = 0; j < n; j++) m[n - 1][j] = 1; b[n - 1] = 1;
  return solveLinear(m, b);
}
function stationaryPower(a, tol, maxIt, start) {   // べき乗法：π ← π P を変化が tol 未満になるまで
  let n = a.length, v = start ? start.slice() : new Array(n).fill(1 / n), its = 0, d = Infinity;
  while (d > (tol || 1e-13) && its < (maxIt || 100000)) { let w = vecMat(v, a); d = maxAbsDiff(w, v); v = w; its++; }
  return { pi: v, its };
}
function tvDist(p, q) { let s = 0; for (let i = 0; i < p.length; i++) s += Math.abs(p[i] - q[i]); return s / 2; }   // 全変動距離
function entropyRate(a, pi) {          // エントロピー率 H = −Σ_i π_i Σ_j P_ij log₂ P_ij（1 歩あたりの情報量、ビット）
  let h = 0;
  for (let i = 0; i < a.length; i++) for (let v of a[i]) if (v > 0) h -= pi[i] * v * Math.log2(v);
  return h;
}
// ---- グラフの道具：g = { x, y, w, h, x0, x1, y0, y1 }
function gX(g, v) { return g.x + clampv((v - g.x0) / (g.x1 - g.x0), -0.02, 1.02) * g.w; }
function gY(g, v) { return g.y + g.h - clampv((v - g.y0) / (g.y1 - g.y0), -0.02, 1.02) * g.h; }
function plotAxes(g, xl, yl, xt, yt) {
  stroke(84, 76, 70); strokeWeight(1); noFill(); rect(g.x, g.y, g.w, g.h);
  noStroke(); fill(...SUB); textSize(12); textAlign(CENTER, TOP);
  for (let v of xt) text(+v.toPrecision(3), gX(g, v), g.y + g.h + 4);
  textAlign(RIGHT, CENTER);
  for (let v of yt) text(+v.toPrecision(3), g.x - 5, gY(g, v));
  textAlign(LEFT, BASELINE); fill(...CREAM); textSize(13);
  text(xl, g.x + g.w - textWidth(xl), g.y + g.h + 30); text(yl, g.x, g.y - 8);
}
function polyline(pts) {               // 点が 2 つ以上あるときだけ折れ線を描く（空の beginShape を作らない）
  if (pts.length < 2) return;
  noFill(); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape();
}
function drawCurve(g, arr, col, sw, xOff) {   // arr[i] を x = i (+ xOff) に。長いときは間引いて 600 点まで
  let n = arr.length, stride = Math.max(1, Math.ceil(n / 600)), pts = [];
  for (let i = 0; i < n; i += stride) pts.push([gX(g, i + (xOff || 0)), gY(g, arr[i])]);
  if (n > 1 && (n - 1) % stride) pts.push([gX(g, n - 1 + (xOff || 0)), gY(g, arr[n - 1])]);
  stroke(...col); strokeWeight(sw || 2); polyline(pts);
}
function legend(x, y, items) {         // items = [[色, 名前], …]
  textSize(13); textAlign(LEFT, CENTER);
  for (let [c, s] of items) { noStroke(); fill(...c); rect(x, y - 5, 16, 10); fill(...CREAM); text(s, x + 22, y); y += 20; }
}
function drawBars(x, y, w, h, vals, cols, top, names) {   // 棒グラフ（top = 縦軸の上限）
  let n = vals.length, bw = w / n;
  stroke(84, 76, 70); strokeWeight(1); line(x, y + h, x + w, y + h); noStroke();
  for (let i = 0; i < n; i++) {
    let c = cols[i % cols.length], hh = clampv(vals[i] / (top || 1), 0, 1) * h; fill(...c); rect(x + i * bw + bw * 0.12, y + h - hh, bw * 0.76, hh, 3);
    if (names) { fill(...SUB); textSize(12); textAlign(CENTER, TOP); text(names[i], x + i * bw + bw / 2, y + h + 4); }
  }
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) || ArrayBuffer.isView(v) ? Array.from(v).every(noNaN) : !(typeof v === 'number' && !isFinite(v)); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(120, 220, 190) : color(255, 90, 90)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
