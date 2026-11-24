// ============================================
// 02 バイアスとバリアンス ─ sin の曲線 + ノイズから訓練データを 100 回作り直し、そのたびに多項式をあてはめる
// うすい線 = 100 本の当てはめ、金 = その平均、白 = 本当の曲線。期待誤差 = バイアス² + バリアンス + ノイズ
//   バイアス² = 平均の曲線と本当の曲線のずれ、バリアンス = 100 本のばらつき、ノイズ = σ²（どんなモデルでも消せない）
//   次数が低いとバイアスが大きく、高いとバリアンスが大きい。B でバギング（ブートストラップ 25 回の平均）を重ねる
//   バギングが効くのは「不安定な」モデル（次数 11〜12）。安定なモデルではかえって悪くなることも（深い木の例は series62/08）
// ← → 多項式の次数 / B バギング / ↑↓ 点の数 / R やり直す
// ============================================

const M_SETS = 100, B_BAG = 25, NOISE_SD = 0.3, RIDGE = 1e-3;   // ★ 訓練データを作る回数、バギングの回数、ノイズ、ごく小さな正則化
let deg = 3, nPts = 20, bagOn = false, seedD = 1;             // ★ deg = 多項式の次数、nPts = 1 回の点の数
const GX = Array.from({ length: 101 }, (_, i) => i / 100);    // 誤差を測る x（0〜1 を 100 等分）
let sets = [], degStats = [], degWork = 0;
function ftrue(x) { return Math.sin(2 * Math.PI * x); }        // ★ 本当の関数

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); pixelDensity(1); selfTest(); restart(); }
function restart() { sets = []; degStats = []; degWork = 0; }
// ★ 訓練データを 1 組作って当てはめる（bag = true ならバギングも）。testNoise = 誤差を測るための新しいノイズ
function makeSet(k, d, n, bag) {
  seedRng(seedD * 100003 + k * 7 + n);
  let xs = [], ys = [];
  for (let i = 0; i < n; i++) { let x = rnd(); xs.push(x); ys.push(ftrue(x) + NOISE_SD * rndGauss()); }
  let f = polyFit(xs, ys, d, RIDGE), s = { xs, ys, fit: GX.map((x) => polyEval(f, x)), testNoise: GX.map(() => NOISE_SD * rndGauss()), bag: null };
  if (bag) {
    s.bag = GX.map(() => 0);
    for (let b = 0; b < B_BAG; b++) {
      let bx = [], by = [];
      for (let i = 0; i < n; i++) { let j = Math.floor(rnd() * n); bx.push(xs[j]); by.push(ys[j]); }
      let g = polyFit(bx, by, d, RIDGE); GX.forEach((x, q) => (s.bag[q] += polyEval(g, x) / B_BAG));
    }
  }
  return s;
}
// ★ バイアス²・バリアンス・期待誤差（F = 当てはめの列、それぞれ GX の上の値）
function bvStats(F, noiseArr) {
  let M = F.length, mean = GX.map((_, q) => { let s = 0; for (let f of F) s += f[q]; return s / M; }), b2 = 0, v = 0, mse = 0, mseNF = 0;
  GX.forEach((x, q) => { b2 += (mean[q] - ftrue(x)) ** 2; for (let m = 0; m < M; m++) { v += (F[m][q] - mean[q]) ** 2; mseNF += (F[m][q] - ftrue(x)) ** 2; if (noiseArr) mse += (F[m][q] - ftrue(x) - noiseArr[m][q]) ** 2; } });
  let G = GX.length; return { mean, b2: b2 / G, v: v / (G * M), mseNF: mseNF / (G * M), mse: mse / (G * M) };
}

function draw() {
  background(...BG_COL);
  let t0 = performance.now();               // 1 フレームに 6 ミリ秒だけ計算（画面は止まらない）
  while (sets.length < M_SETS && performance.now() - t0 < 6) sets.push(makeSet(sets.length, deg, nPts, bagOn));
  while (sets.length >= M_SETS && degWork <= 12 && performance.now() - t0 < 6) {   // 次数ごとの比較（裏で 40 組ずつ）
    let F = [], nz = []; for (let k = 0; k < 40; k++) { let s = makeSet(k, degWork, nPts, false); F.push(s.fit); nz.push(s.testNoise); }
    degStats[degWork] = bvStats(F, nz); degWork++;
  }
  let st = sets.length ? bvStats(sets.map((s) => s.fit), sets.map((s) => s.testNoise)) : null;
  let sb = bagOn && sets.length && sets[0].bag ? bvStats(sets.map((s) => s.bag), sets.map((s) => s.testNoise)) : null;
  // ---- 左：当てはめの束
  let side = Math.min(height - 190, width * 0.48), g = { x: 60, y: 110, w: side, h: side * 0.82, x0: 0, x1: 1, y0: -2, y1: 2 };
  plotAxes(g, 'x', 'うすい線 = ' + sets.length + ' 本の当てはめ、金 = 平均、白 = 本当の sin' + (bagOn ? '、青緑 = バギングの平均' : ''), [0, 0.5, 1], [-2, -1, 0, 1, 2]);
  strokeWeight(1); stroke(...TEAL, bagOn ? 18 : 40);
  for (let s of sets) polyline(GX.map((x, q) => [gX(g, x), gY(g, s.fit[q])]));
  if (sb) { stroke(...TEAL, 30); for (let s of sets) polyline(GX.map((x, q) => [gX(g, x), gY(g, s.bag[q])])); }
  stroke(...INK); strokeWeight(2.5); polyline(GX.map((x) => [gX(g, x), gY(g, ftrue(x))]));
  if (st) { stroke(...GOLD); strokeWeight(3); polyline(GX.map((x, q) => [gX(g, x), gY(g, st.mean[q])])); }
  if (sb) { stroke(...TEAL); strokeWeight(3); drawingContext.setLineDash([7, 5]); polyline(GX.map((x, q) => [gX(g, x), gY(g, sb.mean[q])])); drawingContext.setLineDash([]); }
  if (sets.length) { noStroke(); fill(...WINE); sets[0].xs.forEach((x, i) => circle(gX(g, x), gY(g, sets[0].ys[i]), 7)); }
  // ---- 右上：棒グラフ（バイアス² + バリアンス + ノイズ と 測った期待誤差）
  let rx = g.x + g.w + 90, rw = width - rx - 40;
  if (st) {
    let rows = [['バイアス²', st.b2, GOLD], ['バリアンス', st.v, TEAL], ['ノイズ σ²', NOISE_SD ** 2, [150, 130, 130]], ['3 つの和', st.b2 + st.v + NOISE_SD ** 2, INK], ['測った期待誤差', st.mse, WINE]];
    if (sb) rows.push(['バギング：バイアス²', sb.b2, GOLD], ['バギング：バリアンス', sb.v, TEAL], ['バギング：期待誤差', sb.mse, WINE]);
    let top = Math.max(0.5, ...rows.map((r) => r[1])), bw = (rw - 230) / top;
    rows.forEach(([nm, v, c], k) => {
      let yy = 110 + 28 * k; noStroke(); fill(...c); rect(rx + 160, yy, Math.max(1, Math.min(rw - 230, v * bw)), 18);
      fill(220, 210, 195); textSize(13); textAlign(RIGHT, CENTER); text(nm, rx + 150, yy + 9); textAlign(LEFT, CENTER); text(fmtNum(v, 4), rx + 166 + Math.min(rw - 230, v * bw), yy + 9);
    });
  }
  // ---- 右下：次数とバイアス²・バリアンス
  let g2 = { x: rx, y: 110 + 28 * 8 + 50, w: rw - 20, h: Math.max(80, height - 110 - 28 * 8 - 140), x0: 0, x1: 12, y0: 0, y1: 0.8 };
  plotAxes(g2, '多項式の次数', '次数ごと（40 組ずつ）：金 = バイアス²、青緑 = バリアンス、白 = 期待誤差', [0, 3, 6, 9, 12], [0, 0.4, 0.8]);
  let dd = degStats.map((s, d) => [d, s]);
  stroke(...GOLD); strokeWeight(2.5); polyline(dd.map(([d, s]) => [gX(g2, d), gY(g2, s.b2)]));
  stroke(...TEAL); polyline(dd.map(([d, s]) => [gX(g2, d), gY(g2, s.v)]));
  stroke(...INK); polyline(dd.map(([d, s]) => [gX(g2, d), gY(g2, s.mse)]));
  stroke(...WINE); strokeWeight(1); line(gX(g2, deg), g2.y, gX(g2, deg), g2.y + g2.h);
  // ---- 文字
  noStroke(); fill(...INK); textSize(20); textAlign(LEFT, BASELINE);
  text('バイアスとバリアンス　次数 ' + deg + '　点の数 ' + nPts + '　' + (bagOn ? 'バギング ON（' + B_BAG + ' 回の平均）' : 'バギング OFF'), 40, 40);
  fill(170, 155, 145); textSize(15); text('← → 次数　B バギング　↑↓ 点の数　R やり直す', 40, 66);
  if (st) { fill(200, 185, 170); textSize(14); text('ノイズなしの誤差 ' + fmtNum(st.mseNF, 5) + ' = バイアス² + バリアンス ' + fmtNum(st.b2 + st.v, 5) + '（いつもぴったり）', g.x, g.y + g.h + 50); }
  drawSelfTest(width - 170, height - 12);
}
function keyPressed() {
  if (key === RIGHT_ARROW) { deg = Math.min(12, deg + 1); sets = []; }
  if (key === LEFT_ARROW) { deg = Math.max(0, deg - 1); sets = []; }
  if (key === UP_ARROW) { nPts = Math.min(60, nPts + 5); restart(); }
  if (key === DOWN_ARROW) { nPts = Math.max(15, nPts - 5); restart(); }
  if (key === 'b' || key === 'B') { bagOn = !bagOn; sets = []; }
  if (key === 'r' || key === 'R') { seedD++; restart(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let F = [], nz = [];
  for (let k = 0; k < 60; k++) { let s = makeSet(k, 5, 20, false); F.push(s.fit); nz.push(s.testNoise); }
  let s5 = bvStats(F, nz);
  check('ノイズなしの誤差 = バイアス² + バリアンス（次数 5、60 組、1e-9 の恒等式）', near(s5.mseNF, s5.b2 + s5.v, 1e-9));
  check('バイアス² + バリアンス + σ² ' + fmtNum(s5.b2 + s5.v + 0.09, 4) + ' ≈ 新しいノイズで測った期待誤差 ' + fmtNum(s5.mse, 4) + '（8% 以内）', Math.abs(s5.mse / (s5.b2 + s5.v + 0.09) - 1) < 0.08);
  let Fs = [], Fb = [];
  for (let k = 0; k < 60; k++) { let s = makeSet(k, 12, 20, true); Fs.push(s.fit); Fb.push(s.bag); }
  let a = bvStats(Fs), b = bvStats(Fb);
  check('次数 12・20 点（不安定）：バギングでバリアンス ' + fmtNum(a.v, 3) + ' → ' + fmtNum(b.v, 3) + '（半分未満）', b.v < 0.5 * a.v);
  let F0 = []; for (let k = 0; k < 60; k++) F0.push(makeSet(k, 0, 20, false).fit);
  check('次数 0（定数）：バイアス² ≈ sin² の平均 ≈ 0.5（' + fmtNum(bvStats(F0).b2, 3) + '）', Math.abs(bvStats(F0).b2 - 0.495) < 0.03);
  let s0 = makeSet(3, 0, 20, false), mono = true, prev = Infinity;
  for (let d = 0; d <= 12; d++) { let f = polyFit(s0.xs, s0.ys, d, RIDGE), e = meanOf(s0.xs.map((x, i) => (polyEval(f, x) - s0.ys[i]) ** 2)); if (e > prev + 1e-3) mono = false; prev = e; }
  check('同じ訓練データなら、次数を上げるほど訓練誤差は下がる（0〜12）', mono);
  let xs = [0.1, 0.3, 0.45, 0.6, 0.8, 0.95], cub = (x) => 2 * x ** 3 - x + 0.5, fc = polyFit(xs, xs.map(cub), 3, 0);
  check('ノイズのない 3 次式は次数 3 でぴったり当たる（チェビシェフ多項式の最小 2 乗法）', [0, 0.37, 1].every((x) => near(polyEval(fc, x), cub(x), 1e-9)));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. ← → で次数を 0 から 12 まで動かそう。うすい線の束が「細くずれている」→「太くまとまって合っている」→「暴れる」
// 2. 右下のグラフで期待誤差（白）がいちばん小さい次数は？ ↑↓ で点の数を増やすと、その次数はどう変わる？
// 3. 次数 12 で B を押そう。バギングの平均（青緑の点線）はおとなしくなる。次数 6 だと？（バリアンスが増えることも）
// 4. NOISE_SD を 0 にすると、ノイズの棒は消える。バイアスとバリアンスは？
// 5. 03 で「平均してもばらつきが消えないとき」を調べる。バギングの木どうしは似ている（相関がある）

// ==================================================
// ここから下は「アンサンブル学習の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 小さな道具：はさむ・合計・平均・いちばん大きい番号・数の表示
function clampv(v, a, b) { return v < a ? a : v > b ? b : v !== v ? a : v; }     // NaN なら a に戻す
function sumArr(a) { let s = 0; for (let v of a) s += v; return s; }
function meanOf(a) { return a.length ? sumArr(a) / a.length : 0; }
function varOf(a) { let m = meanOf(a), s = 0; for (let v of a) s += (v - m) * (v - m); return a.length ? s / a.length : 0; }   // ÷n の分散
function argMaxArr(a) { let b = 0; for (let i = 1; i < a.length; i++) if (a[i] > a[b]) b = i; return b; }   // 同点なら小さい番号
function sigm(z) { return 1 / (1 + Math.exp(-clampv(z, -40, 40))); }
function fmtNum(v, d) { if (typeof v !== 'number' || !isFinite(v)) return '?'; let s = (+v.toFixed(d === undefined ? 2 : d)).toString(); return s === '-0' ? '0' : s; }
function pctStr(v) { return fmtNum(100 * v, 1) + '%'; }
// ---- 種つきの乱数（同じ種なら毎回同じ列）
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
function rndGauss() { let u = Math.max(1e-12, rnd()), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }   // 標準正規分布
function shuffleArr(a) { for (let i = a.length - 1; i > 0; i--) { let j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
// ---- 連立 1 次方程式 A w = b（部分ピボットつきのガウスの消去法）。ridge = 対角に足す小さな数（解けないのを防ぐ）
function solveLin(A, b, ridge) {
  let n = b.length, M = A.map((r, i) => r.slice().concat([b[i]]));
  for (let i = 0; i < n; i++) M[i][i] += ridge || 0;
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-14) continue;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) if (r !== c) { let f = M[r][c] / M[c][c]; if (f !== 0) for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  return M.map((r, i) => (Math.abs(r[i]) < 1e-14 ? 0 : r[n] / r[i]));
}
// ---- 多項式の最小 2 乗法。x ∈ [0, 1] を [−1, 1] に直し、チェビシェフ多項式 T0, T1, … を特徴量にする（次数が高くても計算が安定）
function chebFeat(x, deg) { let t = 2 * x - 1, f = [1]; if (deg >= 1) f.push(t); for (let k = 2; k <= deg; k++) f.push(2 * t * f[k - 1] - f[k - 2]); return f; }
function polyFit(xs, ys, deg, ridge) {   // (ΦᵀΦ + λI) c = Φᵀy
  let d = deg + 1, A = Array.from({ length: d }, () => new Array(d).fill(0)), b = new Array(d).fill(0);
  for (let i = 0; i < xs.length; i++) { let f = chebFeat(xs[i], deg); for (let p = 0; p < d; p++) { b[p] += f[p] * ys[i]; for (let q = 0; q < d; q++) A[p][q] += f[p] * f[q]; } }
  return { deg, c: solveLin(A, b, ridge === undefined ? 1e-9 : ridge) };
}
function polyEval(m, x) { let f = chebFeat(x, m.deg), s = 0; for (let k = 0; k <= m.deg; k++) s += m.c[k] * f[k]; return s; }
// ---- 描く道具：色（オーケストラ：えんじ色の黒、象牙色、金管の金、弦の青緑）、領域の絵、点
const BG_COL = [24, 11, 16];                                     // 背景（えんじ色の黒）
const INK = [242, 233, 214], GOLD = [226, 176, 74], TEAL = [64, 186, 176], WINE = [196, 72, 96];
const CLS_COL = [[226, 170, 70], [60, 182, 176]];                // ★ クラス 0（金）・クラス 1（青緑）の色
function probCol(p, k) {             // クラス 1 の確率 → 背景と混ぜた色（k = 濃さ）
  let c = [], a = clampv(k === undefined ? 0.55 : k, 0, 1) * Math.abs(2 * p - 1) + 0.12;
  for (let q = 0; q < 3; q++) c.push(BG_COL[q] + ((p > 0.5 ? CLS_COL[1][q] : CLS_COL[0][q]) - BG_COL[q]) * a);
  return c;
}
// img の全部の画素に fn(u, v) → [r, g, b] を塗る（u は右向き、v は上向き、どちらも 0〜1）
function paintImage(img, fn) {
  img.loadPixels();
  let W = img.width, H = img.height;
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
    let c = fn((px + 0.5) / W, 1 - (py + 0.5) / H), i = 4 * (px + W * py);
    img.pixels[i] = c[0]; img.pixels[i + 1] = c[1]; img.pixels[i + 2] = c[2]; img.pixels[i + 3] = 255;
  }
  img.updatePixels();
}
function toPx(bx, u, v) { return [bx.x + u * bx.w, bx.y + (1 - v) * bx.h]; }   // [0,1]² → 画面
function fromPx(bx, px, py) { return [(px - bx.x) / bx.w, 1 - (py - bx.y) / bx.h]; }
function drawPoints(bx, X, y, r) {
  stroke(10); strokeWeight(1);
  for (let i = 0; i < X.length; i++) { let p = toPx(bx, X[i][0], X[i][1]); fill(...CLS_COL[y[i]]); circle(p[0], p[1], r); }
}
function frameBox(bx, col) { noFill(); stroke(...(col || [110, 80, 85])); strokeWeight(1); rect(bx.x, bx.y, bx.w, bx.h); }
// ---- グラフの道具：g = { x, y, w, h, x0, x1, y0, y1 }
function gX(g, v) { return g.x + clampv((v - g.x0) / (g.x1 - g.x0), -0.02, 1.02) * g.w; }
function gY(g, v) { return g.y + g.h - clampv((v - g.y0) / (g.y1 - g.y0), -0.02, 1.02) * g.h; }
function plotAxes(g, xl, yl, xt, yt) {
  stroke(95, 70, 75); strokeWeight(1); noFill(); rect(g.x, g.y, g.w, g.h);
  noStroke(); fill(175, 160, 150); textSize(12); textAlign(CENTER, TOP);
  for (let v of xt) text(+v.toPrecision(3), gX(g, v), g.y + g.h + 4);
  textAlign(RIGHT, CENTER);
  for (let v of yt) text(+v.toPrecision(3), g.x - 5, gY(g, v));
  textAlign(LEFT, BASELINE); fill(215, 205, 190); textSize(13);
  text(xl, g.x + g.w - textWidth(xl), g.y + g.h + 32); text(yl, g.x, g.y - 8);
}
function polyline(pts) {               // 点が 2 つ以上あるときだけ折れ線を描く（空の beginShape を作らない）
  if (pts.length < 2) return;
  noFill(); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape();
}
function legend(x, y, items) {         // items = [[色, 名前], …]
  textSize(13); textAlign(LEFT, CENTER); noStroke();
  items.forEach(([c, s], k) => { fill(...c); rect(x, y + 20 * k - 5, 14, 10, 2); fill(220, 210, 195); text(s, x + 22, y + 20 * k); });
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) || ArrayBuffer.isView(v) ? Array.from(v).every(noNaN) : !(typeof v === 'number' && !isFinite(v)); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(140, 215, 170) : color(255, 90, 110)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
