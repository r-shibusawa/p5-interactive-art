// ============================================
// 07 専門家の混合（Mixture of Experts）─ 場所によって規則が変わるデータ。左は上り坂、まん中は下り坂、右は 2 次曲線
// 専門家 k = 直線 a_k + b_k·x。ゲート = ソフトマックス（c_k + d_k·x）→ 「この x はどの専門家に任せるか」の確率 g_k(x)
//   予測 = Σ g_k(x)·専門家 k(x)。学習は勾配降下法：損失 = −log Σ g_k·exp(−(y − 専門家 k)² / 2s²)
//   各点の「担当の度合い」h_k を計算すると、専門家は自分の担当の点だけを、ゲートは g_k を h_k に近づけるように学ぶ
//   背景の色 = ゲートの確率（専門家の色）。1 本の直線や 2 次式より、ずっと小さな誤差になる
// ← → 専門家の数 / スペース 一時停止 / R 初期値を変えてやり直す
// ============================================

let nExp = 3, nPts = 150, noiseS = 0.04, seedInit = 1, paused = false;   // ★ 専門家の数・点の数・ノイズ
const S2 = 0.05, LR = 1.0, MAX_IT = 4000;        // ★ s²（担当の分け方のするどさ）、学習率、学習の回数
const EXP_COL = [[240, 120, 100], [110, 165, 240], [150, 210, 95], [190, 135, 235], [236, 214, 160]];
let trainD, testD, moe, its = 0, lossHist = [], single1, single2;
function ftrue(x) { return x < 0.4 ? 0.2 + 1.2 * x : x < 0.7 ? 0.68 - 1.5 * (x - 0.4) : 0.23 + 6 * (x - 0.7) ** 2 - 0.5 * (x - 0.7); }   // ★ 場所で変わる規則

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); pixelDensity(1); selfTest(); restart(); }
function makeReg(n, seed) { seedRng(seed); let xs = [], ys = []; for (let i = 0; i < n; i++) { let x = rnd(); xs.push(x); ys.push(ftrue(x) + noiseS * rndGauss()); } return { xs, ys }; }
// ★ はじめは「左から順に担当」をゆるく決め、少しだけ乱数でずらす
function makeMoE(K, seed) {
  seedRng(seed); let m = { K, a: [], b: [], c: [], d: [] }, cc = 0;
  for (let k = 0; k < K; k++) { m.a.push(0.5 + 0.2 * rndGauss()); m.b.push(0.3 * rndGauss()); m.d.push(3 * k + rndGauss()); }
  m.c.push(0); for (let k = 1; k < K; k++) { cc -= (m.d[k] - m.d[k - 1]) * (-0.5 + k / K); m.c.push(cc); }
  return m;
}
function gateOf(m, x) { let z = [], t = x - 0.5; for (let k = 0; k < m.K; k++) z.push(m.c[k] + m.d[k] * t); let mx = Math.max(...z), e = z.map((v) => Math.exp(v - mx)), s = sumArr(e); return e.map((v) => v / s); }
function expertOf(m, k, x) { return m.a[k] + m.b[k] * (x - 0.5); }
function moePredict(m, x) { let g = gateOf(m, x), s = 0; for (let k = 0; k < m.K; k++) s += g[k] * expertOf(m, k, x); return s; }
function moeLoss(m, D) {
  let L = 0;
  for (let i = 0; i < D.xs.length; i++) { let g = gateOf(m, D.xs[i]), s = 0; for (let k = 0; k < m.K; k++) s += g[k] * Math.exp(-((D.ys[i] - expertOf(m, k, D.xs[i])) ** 2) / (2 * S2)); L -= Math.log(Math.max(1e-300, s)); }
  return L / D.xs.length;
}
// ★ 勾配：h_k = 担当の度合い（事後確率）。専門家 ← h_k·(y − 予測)、ゲート ← (g_k − h_k)
function moeGrad(m, D) {
  let G = { a: new Array(m.K).fill(0), b: new Array(m.K).fill(0), c: new Array(m.K).fill(0), d: new Array(m.K).fill(0) }, n = D.xs.length;
  for (let i = 0; i < n; i++) {
    let x = D.xs[i], y = D.ys[i], t = x - 0.5, g = gateOf(m, x), l = g.map((gk, k) => Math.log(Math.max(1e-300, gk)) - ((y - expertOf(m, k, x)) ** 2) / (2 * S2));
    let mx = Math.max(...l), h = l.map((v) => Math.exp(v - mx)), s = sumArr(h);
    for (let k = 0; k < m.K; k++) { let hk = h[k] / s, r = (y - expertOf(m, k, x)) / S2; G.a[k] -= (hk * r) / n; G.b[k] -= (hk * r * t) / n; G.c[k] += (g[k] - hk) / n; G.d[k] += ((g[k] - hk) * t) / n; }
  }
  return G;
}
function moeTrain(m, D, iters) {      // パラメータごとに歩幅を変えた勾配降下法
  for (let q = 0; q < iters; q++) {
    let G = moeGrad(m, D);
    for (let k = 0; k < m.K; k++) { m.a[k] -= LR * S2 * G.a[k]; m.b[k] -= 4 * LR * S2 * G.b[k]; m.c[k] = clampv(m.c[k] - 4 * LR * G.c[k], -200, 200); m.d[k] = clampv(m.d[k] - 20 * LR * G.d[k], -400, 400); }
  }
}
function restart() {
  paused = false;
  trainD = makeReg(nPts, 3); testD = makeReg(400, 77);
  moe = makeMoE(nExp, seedInit); its = 0; lossHist = [moeLoss(moe, trainD)];
  single1 = polyFit(trainD.xs, trainD.ys, 1); single2 = polyFit(trainD.xs, trainD.ys, 2);
}
function mseOn(fn, D) { return meanOf(D.xs.map((x, i) => (fn(x) - D.ys[i]) ** 2)); }

function draw() {
  background(...BG_COL);
  if (!paused && its < MAX_IT) { moeTrain(moe, trainD, 20); its += 20; if (its % 100 === 0) lossHist.push(moeLoss(moe, trainD)); }
  let g = { x: 60, y: 110, w: width * 0.56, h: height * 0.5, x0: 0, x1: 1, y0: -0.1, y1: 1 };
  // 背景：ゲートの確率を縦の帯で
  noStroke(); let cols = 160;
  for (let q = 0; q < cols; q++) { let x = (q + 0.5) / cols, gt = gateOf(moe, x), c = [0, 0, 0]; gt.forEach((p, k) => { for (let j = 0; j < 3; j++) c[j] += p * EXP_COL[k][j]; }); fill(BG_COL[0] + 0.25 * (c[0] - BG_COL[0]), BG_COL[1] + 0.25 * (c[1] - BG_COL[1]), BG_COL[2] + 0.25 * (c[2] - BG_COL[2])); rect(g.x + (q / cols) * g.w, g.y, g.w / cols + 1, g.h); }
  plotAxes(g, 'x', '点 = 訓練データ、色つきの線 = 各専門家、金 = 混合の予測（背景 = ゲートの確率）', [0, 0.5, 1], [0, 0.5, 1]);
  let xsG = Array.from({ length: 101 }, (_, i) => i / 100);
  for (let k = 0; k < moe.K; k++) { stroke(...EXP_COL[k], 90); strokeWeight(1); polyline(xsG.map((x) => [gX(g, x), gY(g, expertOf(moe, k, x))])); }
  for (let k = 0; k < moe.K; k++) { stroke(...EXP_COL[k]); strokeWeight(4); for (let q = 0; q < 100; q++) { let x0 = xsG[q], x1 = xsG[q + 1]; if (gateOf(moe, (x0 + x1) / 2)[k] > 0.5) line(gX(g, x0), gY(g, expertOf(moe, k, x0)), gX(g, x1), gY(g, expertOf(moe, k, x1))); } }
  noStroke(); fill(220, 210, 195, 170); trainD.xs.forEach((x, i) => circle(gX(g, x), gY(g, trainD.ys[i]), 5));
  stroke(...GOLD); strokeWeight(2.5); polyline(xsG.map((x) => [gX(g, x), gY(g, moePredict(moe, x))]));
  // ---- 下：ゲートの確率
  let g2 = { x: 60, y: g.y + g.h + 50, w: g.w, h: Math.max(60, height - g.y - g.h - 120), x0: 0, x1: 1, y0: 0, y1: 1 };
  plotAxes(g2, 'x', 'ゲートの確率 g_k(x)（合計はいつも 1）', [0, 0.5, 1], [0, 0.5, 1]);
  for (let k = 0; k < moe.K; k++) { stroke(...EXP_COL[k]); strokeWeight(2.5); polyline(xsG.map((x) => [gX(g2, x), gY(g2, gateOf(moe, x)[k])])); }
  // ---- 右：損失と誤差の表
  let rx = g.x + g.w + 70, g3 = { x: rx, y: 110, w: width - rx - 50, h: height * 0.3, x0: 0, x1: MAX_IT, y0: Math.min(...lossHist) - 0.1, y1: Math.max(...lossHist) + 0.1 };
  plotAxes(g3, '学習の回数', '訓練の損失（負の対数尤度）', [0, MAX_IT / 2, MAX_IT], [+g3.y0.toFixed(1), +g3.y1.toFixed(1)]);
  stroke(...GOLD); strokeWeight(2); polyline(lossHist.map((v, q) => [gX(g3, q * 100), gY(g3, v)]));
  let ty = g3.y + g3.h + 60, rows = [['1 本の直線', mseOn((x) => polyEval(single1, x), testD)], ['1 つの 2 次式', mseOn((x) => polyEval(single2, x), testD)], ['専門家の混合（' + moe.K + ' 人）', mseOn((x) => moePredict(moe, x), testD)]];
  noStroke(); fill(...INK); textSize(15); textAlign(LEFT, BASELINE); text('テストの 2 乗誤差（小さいほど良い）', rx, ty);
  rows.forEach(([nm, v], q) => { fill(...(q === 2 ? GOLD : [220, 210, 195])); textSize(14); text(nm, rx, ty + 28 + 24 * q); textAlign(RIGHT, BASELINE); text(fmtNum(v, 5), rx + 300, ty + 28 + 24 * q); textAlign(LEFT, BASELINE); });
  fill(170, 155, 145); textSize(13); text('ノイズの分散 ' + fmtNum(noiseS * noiseS, 5) + ' より小さくはならない', rx, ty + 28 + 24 * 3);
  // ---- 文字
  fill(...INK); textSize(20); text('専門家の混合　専門家 ' + moe.K + ' 人、ゲートはソフトマックス　学習 ' + its + ' 回' + (paused ? '（一時停止）' : ''), 40, 40);
  fill(170, 155, 145); textSize(15); text('← → 専門家の数　スペース 一時停止　R 初期値を変えてやり直す', 40, 66);
  drawSelfTest(width - 170, height - 12);
}
function keyPressed() {
  if (key === RIGHT_ARROW) { nExp = Math.min(5, nExp + 1); restart(); }
  if (key === LEFT_ARROW) { nExp = Math.max(1, nExp - 1); restart(); }
  if (key === ' ') paused = !paused;
  if (key === 'r' || key === 'R') { seedInit++; restart(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let m = makeMoE(3, 5), okG = true;
  for (let q = 0; q <= 100; q++) { let g = gateOf(m, q / 100); if (Math.abs(sumArr(g) - 1) > 1e-12 || g.some((v) => !(v >= 0 && v <= 1))) okG = false; }
  let big = { K: 2, a: [0, 0], b: [0, 0], c: [500, -500], d: [0, 0] }, gb = gateOf(big, 0.3);
  check('ゲートの確率はどの x でも 0〜1 で合計 1。ロジットが ±500 でも NaN にならない', okG && noNaN(gb) && near(gb[0], 1, 1e-12));
  let D = makeReg(40, 9), G = moeGrad(m, D), okN = true, worst = 0;
  for (let pn of ['a', 'b', 'c', 'd']) for (let k = 0; k < 3; k++) {
    let v = m[pn][k], h = 1e-5; m[pn][k] = v + h; let lp = moeLoss(m, D); m[pn][k] = v - h; let lm = moeLoss(m, D); m[pn][k] = v;
    let num = (lp - lm) / (2 * h), err = Math.abs(num - G[pn][k]) / Math.max(1e-3, Math.abs(num)); worst = Math.max(worst, err); if (err > 1e-4) okN = false;
  }
  check('勾配の式 = 数値微分（専門家とゲートの 12 個のパラメータ、相対誤差 ' + worst.toExponential(1) + '）', okN);
  let tr = makeReg(150, 3), te = makeReg(400, 77), mm = makeMoE(3, 1), L0 = moeLoss(mm, tr);
  moeTrain(mm, tr, 2000);
  let e = mseOn((x) => moePredict(mm, x), te), e1 = mseOn((x) => polyEval(polyFit(tr.xs, tr.ys, 1), x), te), e2 = mseOn((x) => polyEval(polyFit(tr.xs, tr.ys, 2), x), te);
  check('2000 回の学習で損失が 1/4 未満に下がる（' + fmtNum(L0, 3) + ' → ' + fmtNum(moeLoss(mm, tr), 3) + '）', moeLoss(mm, tr) < L0 / 4);
  check('テストの誤差：専門家の混合 ' + fmtNum(e, 4) + ' < 1 つの 2 次式 ' + fmtNum(e2, 4) + ' < 1 本の直線 ' + fmtNum(e1, 4), e < 0.5 * e2 && e2 < e1);
  let owner = [0.15, 0.55, 0.9].map((x) => argMaxArr(gateOf(mm, x)));
  check('3 つの区間（x = 0.15, 0.55, 0.9）をそれぞれ別の専門家が担当する（' + owner.join(', ') + '）', new Set(owner).size === 3);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. ← で専門家を 1 人にすると、ただの直線。2 人、3 人、4 人で誤差はどう変わる？
// 2. R で初期値を変えると、2 人の専門家が同じ区間を取り合い、1 人が「さぼる」ことがある（局所解）
// 3. S2 を 0.5 にすると担当の分け方がぼやける。0.01 にするとするどくなる
// 4. 大きな言語モデルにも「専門家の混合」を使うものがある。ゲートが単語ごとに専門家を選ぶ
// 5. 08 からはブースティング：前のモデルのまちがいを、次のモデルが担当する

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
