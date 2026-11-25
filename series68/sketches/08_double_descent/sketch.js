// ============================================
// 08 二重降下（ダブルディセント）─ ランダムな特徴 p 個の線形回帰を、ノイズ入りのデータ n 個に当てはめる
// 特徴 = 折れ目の位置 t と向き s をランダムに決めた ReLU(s (x − t))（隠れ層を固定して、出力の重みだけ学ぶネット）
// グラフは 40 組のデータの平均（1 組の誤差は 10 で頭打ち）
//   p < n：最小 2 乗。p を増やすとテスト誤差が下がり、やがて上がる（ここまでは昔ながらの U 字）
//   p = n：データをちょうど通る解が 1 つだけ → ノイズまで無理に通すので、テスト誤差が跳ね上がる
//   p > n：通る解は無数 → いちばん重みが小さい解（最小ノルム解 w = Φᵀ(ΦΦᵀ)⁻¹y）をえらぶと、テスト誤差がまた下がる
// リッジ正則化（λ‖w‖² を足す）を入れると山が消える。U 字のバイアス-バリアンスの話（series64/02）の「その先」
// ← → 特徴の数 p / ↑↓ リッジの強さ λ / N 左のデータを作り直す / R 平均の種を変える
// ============================================

const N_TRAIN = 12, NOISE = 0.2, P_MAX = 200, N_SEEDS = 40;   // ★ データの数、ノイズ、特徴の最大数、平均する回数
const P_LIST = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 25, 30, 40, 50, 70, 100, 140, 200];
const LAMS = [1e-4, 1e-3, 1e-2, 1e-1];
let pIdx = 7, lamIdx = 2, dataSeed = 1, seedBase = 1, ddCurve = null, curveJob = 0, demo = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  makeDemo(); startCurve();
}

function trueF(x) { return Math.sin(Math.PI * x); }
// データ 1 組：x は少しずらした等間隔、y = sin(πx) + ノイズ。特徴（t, s）は P_MAX 個まとめて作り、前から p 個使う
function makeSet(seed) {
  seedRng(seed); let xs = [], ys = [], ts = [], ss = [];
  for (let i = 0; i < N_TRAIN; i++) { let x = -1 + (2 * (i + 0.5)) / N_TRAIN + (0.6 / N_TRAIN) * (2 * rnd() - 1); xs.push(x); ys.push(trueF(x) + NOISE * randn()); }
  for (let j = 0; j < P_MAX; j++) { ss.push(randn() > 0 ? 1 : -1); ts.push(0.9 * (-1 + 2 * rnd())); }
  return { xs, ys, ts, ss };
}
function feats(d, p, x) { let r = new Array(p); for (let j = 0; j < p; j++) { let v = d.ss[j] * (x - d.ts[j]); r[j] = v > 0 ? v : 0; } return r; }
// ★ 最小ノルム解（lam → 0）とリッジ解：p ≤ n なら (ΦᵀΦ + λI) w = Φᵀy、p > n なら w = Φᵀ (ΦΦᵀ + λI)⁻¹ y（どちらもリッジ解と同じ式）
function fitRF(d, p, lam) {
  let phi = d.xs.map((x) => feats(d, p, x)), n = phi.length;
  if (p <= n) return ridgeSolve(phi, d.ys, lam);
  let kk = zerosMat(n);
  for (let i = 0; i < n; i++) for (let k = i; k < n; k++) { let s = dotV(phi[i], phi[k]); kk[i][k] = s; kk[k][i] = s; }
  for (let i = 0; i < n; i++) kk[i][i] += lam;
  let al = solveLinear(kk, d.ys) || new Array(n).fill(0), w = new Array(p).fill(0);
  for (let i = 0; i < n; i++) for (let j = 0; j < p; j++) w[j] += phi[i][j] * al[i];
  return w;
}
function predictRF(d, w, x) { return dotV(w, feats(d, w.length, x)); }
function testErr(d, w) { let s = 0; for (let t = 0; t < 100; t++) { let x = -1 + (2 * (t + 0.5)) / 100, e = predictRF(d, w, x) - trueF(x); s += e * e; } return s / 100; }
function trainErr(d, w) { let s = 0; for (let i = 0; i < d.xs.length; i++) { let e = predictRF(d, w, d.xs[i]) - d.ys[i]; s += e * e; } return s / d.xs.length; }
const MIN_NORM = 1e-10;
const ERR_CAP = 10;                      // ★ 1 組の誤差は 10 で頭打ち（ひどく暴れた 1 組だけで平均が決まらないように）                   // 「λ → 0」の代わりのごく小さな λ（割り算 0 を防ぐだけ）
// 平均のテスト誤差の曲線：sets 組 × P_LIST。1 組ずつ計算できるように
function curveAdd(acc, d, k) {
  P_LIST.forEach((p, i) => {
    let w0 = fitRF(d, p, MIN_NORM), wr = fitRF(d, p, LAMS[lamIdx]);
    acc.mn[i] += (Math.min(ERR_CAP, testErr(d, w0)) - acc.mn[i]) / k; acc.rg[i] += (testErr(d, wr) - acc.rg[i]) / k; acc.tr[i] += (trainErr(d, w0) - acc.tr[i]) / k;
  });
}
function startCurve() { ddCurve = { mn: P_LIST.map(() => 0), rg: P_LIST.map(() => 0), tr: P_LIST.map(() => 0), k: 0 }; curveJob = 0; }
function makeDemo() { demo = makeSet(900 + dataSeed); }

function draw() {
  background(...BG);
  let t0 = performance.now();
  while (ddCurve.k < N_SEEDS && performance.now() - t0 < 8) { ddCurve.k++; curveAdd(ddCurve, makeSet(seedBase * 1000 + ddCurve.k), ddCurve.k); }
  let p = P_LIST[pIdx], lam = LAMS[lamIdx], w0 = fitRF(demo, p, MIN_NORM), wr = fitRF(demo, p, lam);
  hudTitle('二重降下：特徴 p = ' + p + '、データ n = ' + N_TRAIN + (p < N_TRAIN ? '（p < n：最小 2 乗）' : p === N_TRAIN ? '（p = n：ちょうど通る解が 1 つ）' : '（p > n：最小ノルム解）') + '　リッジ λ = ' + lam,
    '← → 特徴の数 p　↑↓ リッジの強さ λ　N 左のデータを作り直す　R 平均の種を変える　（平均 ' + ddCurve.k + ' / ' + N_SEEDS + ' 組）');
  // ---- 左：当てはめ
  let lw = width * 0.42, g = { x: 60, y: 110, w: lw - 60, h: height - 330, x0: -1, x1: 1, y0: -2.5, y1: 2.5 };
  plotAxes(g, 'x', '白 = 本当の関数 sin(πx)、マゼンタ = 最小ノルム解、ライム = リッジ', [-1, 0, 1], [-2, 0, 2]);
  let xs = []; for (let i = 0; i <= 300; i++) xs.push(-1 + i / 150);
  plotXY(g, xs, xs.map(trueF), [...INK, 150], 2);
  plotXY(g, xs, xs.map((x) => predictRF(demo, wr, x)), LIME, 2);
  plotXY(g, xs, xs.map((x) => predictRF(demo, w0, x)), MAG, 3);
  noStroke(); fill(...AMBER); demo.xs.forEach((x, i) => circle(gX(g, x), gY(g, demo.ys[i]), 10));
  fill(...SUB); textSize(12); textAlign(CENTER, TOP);
  for (let j = 0; j < Math.min(p, 60); j++) text('|', gX(g, demo.ts[j]), g.y + g.h - 14);
  textAlign(LEFT, BASELINE); fill(...INK); textSize(14);
  let ty = g.y + g.h + 56;
  text('このデータ：テスト誤差 ' + fmtN(testErr(demo, w0), 3) + '（リッジ ' + fmtN(testErr(demo, wr), 3) + '）', 60, ty);
  text('訓練誤差 ' + fmtE(trainErr(demo, w0)) + '　重みの大きさ ‖w‖ = ' + fmtN(normV(w0), 2), 60, ty + 20);
  fill(...SUB); textSize(13);
  text('オレンジ = 訓練データ（ノイズ入り）、下の | = 特徴の折れ目', 60, ty + 42);
  text('p = n の近くでは全部の点を通すのに大きな重みが要る → 点の間で暴れる', 60, ty + 62);
  // ---- 右：p とテスト誤差
  let rx = lw + 60, g2 = { x: rx, y: 110, w: width - rx - 40, h: height - 330, x0: 0, x1: Math.log10(P_MAX), y0: -2.5, y1: 1.5 };
  plotAxes(g2, '特徴の数 p（対数）', 'log₁₀ テスト誤差（' + ddCurve.k + ' 組の平均、1 組は 10 で頭打ち）', [], [-2, -1, 0, 1]);
  noStroke(); fill(...SUB); textSize(11); textAlign(CENTER, TOP);
  for (let v of [1, 2, 5, 12, 20, 50, 100, 200]) text(v, gX(g2, Math.log10(v)), g2.y + g2.h + 4);
  stroke(...AMBER, 160); strokeWeight(1); line(gX(g2, Math.log10(N_TRAIN)), g2.y, gX(g2, Math.log10(N_TRAIN)), g2.y + g2.h);
  noStroke(); fill(...AMBER); textAlign(LEFT, TOP); text('p = n = ' + N_TRAIN, gX(g2, Math.log10(N_TRAIN)) + 4, g2.y + 4);
  if (ddCurve.k > 0) {
    let lx = P_LIST.map((v) => Math.log10(v)), lg = (a) => a.map((v) => Math.log10(Math.max(1e-6, v)));
    plotXY(g2, lx, lg(ddCurve.tr), [...SUB, 160], 1.5);
    plotXY(g2, lx, lg(ddCurve.rg), LIME, 2.5);
    plotXY(g2, lx, lg(ddCurve.mn), MAG, 3);
    noStroke(); fill(...INK); circle(gX(g2, lx[pIdx]), gY(g2, Math.log10(Math.max(1e-6, ddCurve.mn[pIdx]))), 11);
  }
  legend(g2.x + g2.w - 220, g2.y + 30, [[MAG, '最小ノルム解（λ → 0）'], [LIME, 'リッジ λ = ' + lam], [SUB, '訓練誤差（p ≥ n で 0）']]);
  let im = 0; for (let i = 1; i < P_LIST.length; i++) if (ddCurve.mn[i] > ddCurve.mn[im]) im = i;
  noStroke(); fill(...INK); textSize(14); textAlign(LEFT, BASELINE);
  text('山のてっぺん p = ' + P_LIST[im] + '　誤差：p = 8 で ' + fmtN(ddCurve.mn[7], 3) + '、山で ' + fmtN(ddCurve.mn[im], 2) + '、p = 200 で ' + fmtN(ddCurve.mn[P_LIST.length - 1], 3), rx, ty);
  fill(...SUB); textSize(13);
  text('「多すぎると過学習」は p ≈ n の近くだけ。もっと増やすと、', rx, ty + 22);
  text('いちばん重みの小さい解（なめらか）が選ばれてまた良くなる', rx, ty + 42);
  text('リッジは重みが大きくなるのを止める → p = n でも暴れず、山が消える', rx, ty + 62);
  drawSelfTest(width - 180, height - 14);
}

function keyPressed() {
  if (key === RIGHT_ARROW) pIdx = Math.min(P_LIST.length - 1, pIdx + 1);
  if (key === LEFT_ARROW) pIdx = Math.max(0, pIdx - 1);
  if (key === UP_ARROW) { lamIdx = Math.min(LAMS.length - 1, lamIdx + 1); startCurve(); }
  if (key === DOWN_ARROW) { lamIdx = Math.max(0, lamIdx - 1); startCurve(); }
  if (key === 'n' || key === 'N') { dataSeed++; makeDemo(); }
  if (key === 'r' || key === 'R') { seedBase++; startCurve(); }
  return false;
}

// ============================================
// やってみよう
// ・← → で p を 8 → 12 → 200 と動かし、左の当てはめの暴れ方を見る。‖w‖ はどうなっている？
// ・NOISE を 0 にすると山はどうなる？ 0.5 にしたら？
// ・N_TRAIN を 20 にすると、山の位置は動く？
// ・λ を ↑↓ で変える。山を消すのにちょうどよい λ は？ 大きすぎると何が悪くなる？
// ============================================

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let acc = { mn: P_LIST.map(() => 0), rg: P_LIST.map(() => 0), tr: P_LIST.map(() => 0) }, keepLam = lamIdx;
  lamIdx = 2;
  for (let k = 1; k <= N_SEEDS; k++) curveAdd(acc, makeSet(5000 + k), k);
  lamIdx = keepLam;
  let im = 0; for (let i = 1; i < P_LIST.length; i++) if (acc.mn[i] > acc.mn[im]) im = i;
  let iN = P_LIST.indexOf(N_TRAIN), last = acc.mn[P_LIST.length - 1], low = Math.min(...acc.mn.slice(0, 8));
  check('最小ノルム解のテスト誤差の山は p ≈ n（p = ' + P_LIST[im] + '、n = ' + N_TRAIN + '）', Math.abs(P_LIST[im] - N_TRAIN) <= 2);
  check('山は両側の 5 倍以上（山 ' + fmtN(acc.mn[im], 2) + '、p ≤ 8 の最小 ' + fmtN(low, 3) + '、p = 200 で ' + fmtN(last, 3) + '）', acc.mn[im] > 5 * low && acc.mn[im] > 5 * last);
  check('二重降下：p = 200 は p ≤ 8 のいちばん良い所よりさらに良い', last < low);
  check('リッジ λ = 0.01 で山が消える（p = n で ' + fmtN(acc.rg[iN], 3) + ' < 最小ノルム解の 1/5）', acc.rg[iN] < acc.mn[iN] / 5 && Math.max(...acc.rg.slice(8)) < 2 * Math.min(...acc.rg));
  let d = makeSet(77), w = fitRF(d, 60, MIN_NORM), phi = d.xs.map((x) => feats(d, 60, x));
  seedRng(78); let v = []; for (let j = 0; j < 60; j++) v.push(randn());
  let kk = zerosMat(N_TRAIN); for (let i = 0; i < N_TRAIN; i++) for (let k = 0; k < N_TRAIN; k++) kk[i][k] = dotV(phi[i], phi[k]);
  let al = solveLinear(kk, phi.map((r) => dotV(r, v))), nul = v.map((x, j) => x - phi.reduce((s, r, i) => s + r[j] * al[i], 0));   // Φ nul = 0 の方向
  let w2 = w.map((x, j) => x + 0.3 * nul[j]);
  check('p = 60 > n：最小ノルム解は全部の点を通り、通る別の解 w + v（Φv = 0）より ‖w‖ が小さい', trainErr(d, w) < 1e-12 && trainErr(d, w2) < 1e-12 && normV(w) < normV(w2));
  reportSelfTest();
}

// ==================================================
// ここから下は「神経回路網の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 色と小さな道具（神経細胞：深い青緑の黒、あたたかい白、シナプスのマゼンタ、軸索のライム）
const BG = [8, 22, 24];                  // 背景（深い青緑の黒）
const INK = [246, 238, 224];             // 文字（あたたかい白）
const MAG = [232, 72, 160], LIME = [184, 232, 76], AMBER = [250, 186, 72], SKY = [96, 196, 236], VIOLET = [168, 140, 250];
const SUB = [150, 178, 172], PANEL = [16, 38, 40], WIRE = [44, 76, 76];
function clampv(v, a, b) { return v < a ? a : v > b ? b : v !== v ? a : v; }     // NaN なら a に戻す
function sumOf(a) { let s = 0; for (let v of a) s += v; return s; }
function meanOf(a) { return a.length ? sumOf(a) / a.length : 0; }
function fmtN(v, d) { if (typeof v !== 'number' || v !== v) return '?'; if (!isFinite(v)) return v > 0 ? '∞' : '−∞'; let s = v.toFixed(d === undefined ? 2 : d); return /^-0\.?0*$/.test(s) ? s.slice(1) : s; }
function fmtE(v) { if (typeof v !== 'number' || !isFinite(v)) return '?'; return v === 0 ? '0' : v.toExponential(1); }
function hudTitle(t, sub) {              // 左上のタイトルと操作の説明
  noStroke(); fill(...INK); textSize(22); textAlign(LEFT, BASELINE); text(t, 30, 38);
  fill(...SUB); textSize(14); text(sub, 30, 62);
}
function sigm(z) { return 1 / (1 + Math.exp(-clampv(z, -40, 40))); }
// ---- 種つきの乱数（同じ種なら毎回同じ列 → 実験をくり返せる）
let rngState = 1;
function seedRng(s) { rngState = (s >>> 0) || 1; }
function rnd() {                         // 0〜1 の一様乱数（mulberry32）
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rndInt(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
function randn() { let u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }   // 標準正規分布
function shuffleArr(a) { for (let i = a.length - 1; i > 0; i--) { let j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
// ---- 行列の道具
function zerosMat(n, m) { let a = []; for (let i = 0; i < n; i++) a.push(new Array(m === undefined ? n : m).fill(0)); return a; }
function dotV(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }
function normV(a) { return Math.sqrt(dotV(a, a)); }
function matVec(a, v) { return a.map((r) => dotV(r, v)); }
function transposeM(a) { return a[0].map((_, j) => a.map((r) => r[j])); }
function solveLinear(a, b) {             // ガウスの消去法（部分ピボット）で a x = b。解けなければ null
  let n = b.length, m = a.map((r, i) => r.concat([b[i]]));
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    if (Math.abs(m[p][c]) < 1e-300) return null;
    [m[c], m[p]] = [m[p], m[c]];
    for (let r = c + 1; r < n; r++) { let f = m[r][c] / m[c][c]; if (f !== 0) for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k]; }
  }
  let x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) { let s = m[i][n]; for (let k = i + 1; k < n; k++) s -= m[i][k] * x[k]; x[i] = s / m[i][i]; }
  return x.every((v) => isFinite(v)) ? x : null;
}
// リッジ回帰 (ΦᵀΦ + λI) w = Φᵀ y。phi = 行がデータ、列が特徴
function ridgeSolve(phi, y, lam) {
  let p = phi[0].length, a = zerosMat(p), b = new Array(p).fill(0);
  for (let i = 0; i < phi.length; i++) { let f = phi[i]; for (let j = 0; j < p; j++) { b[j] += f[j] * y[i]; for (let k = j; k < p; k++) a[j][k] += f[j] * f[k]; } }
  for (let j = 0; j < p; j++) { a[j][j] += lam; for (let k = 0; k < j; k++) a[j][k] = a[k][j]; }
  return solveLinear(a, b) || new Array(p).fill(0);
}
// ---- グラフの道具：g = { x, y, w, h, x0, x1, y0, y1 }
function gX(g, v) { return g.x + clampv((v - g.x0) / (g.x1 - g.x0), -0.02, 1.02) * g.w; }
function gY(g, v) { return g.y + g.h - clampv((v - g.y0) / (g.y1 - g.y0), -0.02, 1.02) * g.h; }
function plotAxes(g, xl, yl, xt, yt) {
  stroke(...WIRE); strokeWeight(1); noFill(); rect(g.x, g.y, g.w, g.h);
  noStroke(); fill(...SUB); textSize(12); textAlign(CENTER, TOP);
  for (let v of xt) text(+v.toPrecision(3), gX(g, v), g.y + g.h + 4);
  textAlign(RIGHT, CENTER);
  for (let v of yt) text(+v.toPrecision(3), g.x - 5, gY(g, v));
  textAlign(LEFT, BASELINE); fill(...INK); textSize(13);
  text(xl, g.x + g.w - textWidth(xl), g.y + g.h + 30); text(yl, g.x, g.y - 8);
}
function polyline(pts) {                 // 点が 2 つ以上あるときだけ折れ線を描く（空の beginShape を作らない）
  if (pts.length < 2) return;
  noFill(); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape();
}
function plotXY(g, xs, ys, col, sw) {    // (xs[i], ys[i]) を折れ線で（有限の値だけ）
  let pts = []; for (let i = 0; i < xs.length; i++) if (isFinite(ys[i])) pts.push([gX(g, xs[i]), gY(g, ys[i])]);
  stroke(...col); strokeWeight(sw || 2); polyline(pts);
}
function legend(x, y, items) {           // items = [[色, 名前], …]
  textSize(13); textAlign(LEFT, CENTER);
  for (let [c, s] of items) { noStroke(); fill(...c); rect(x, y - 5, 16, 10); fill(...INK); text(s, x + 22, y); y += 20; }
  textAlign(LEFT, BASELINE);
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function relErr(a, b) { return Math.abs(a - b) / Math.max(1e-12, Math.abs(a) + Math.abs(b)); }
function noNaN(v) { return Array.isArray(v) || ArrayBuffer.isView(v) ? Array.from(v).every(noNaN) : !(typeof v === 'number' && !isFinite(v)); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(150, 230, 170) : color(255, 90, 110)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
