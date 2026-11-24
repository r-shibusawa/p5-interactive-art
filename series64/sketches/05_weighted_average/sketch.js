// ============================================
// 05 重み付き平均 ─ 3 つのモデルの予測を w₁·A + w₂·B + w₃·C で混ぜる。重みは「和 = 1、どれも ≥ 0」
// 重みを決めるのは「検証データ」（学習に使っていない点）。検証の 2 乗誤差がいちばん小さい重みを、射影勾配法で探す
//   射影勾配法：勾配の向きに 1 歩 → 「和 = 1、≥ 0」の三角形（単体）の上のいちばん近い点に戻す、をくり返す
//   右の三角形 = 重みの全部の組合せ。色 = 検証の誤差（明るいほど小さい）、白い線 = 射影勾配法の道、金の点 = 最適な重み
//   D でモデル B のコピーを入れる（4 つ）→ 2 つのコピーの重みの「和」が、コピーなしのときの B の重みと同じになる
// スペース もう一度探す / 三角形をクリック そこから探す / D コピーを入れる / R データを作り直す
// ============================================

let nTrain = 40, nVal = 40, noiseS = 0.25, seedD = 4, dupOn = false;   // ★ 点の数とノイズ
const NAMES3 = ['A：直線（多項式 1 次）', 'B：k 近傍法（k = 2）', 'C：多項式 8 次'];
const COL3 = [[236, 214, 160], [240, 120, 100], [190, 135, 235]];   // ★ A・B・C の色
let trainD, valD, testD, base3 = [], wts, path = [], pgIters = 0, triImg, triBox, lossQ, optW, predV, predT;
function ftrue(x) { return 0.6 * Math.sin(2 * Math.PI * x) * x + 0.8 * x - 0.3; }   // ★ 本当の関数

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); pixelDensity(1); triImg = createImage(180, 156); selfTest(); restart(); }
function makeReg(n, seed) { seedRng(seed); let xs = [], ys = []; for (let i = 0; i < n; i++) { let x = rnd(); xs.push(x); ys.push(ftrue(x) + noiseS * rndGauss()); } return { xs, ys }; }
function knnReg(xs, ys, x, k) { let d = xs.map((v, i) => [Math.abs(v - x), ys[i]]).sort((a, b) => a[0] - b[0]); return meanOf(d.slice(0, k).map((q) => q[1])); }
function fitThree(D) {
  let a = polyFit(D.xs, D.ys, 1), c = polyFit(D.xs, D.ys, 8, 1e-6);
  return [(x) => polyEval(a, x), (x) => knnReg(D.xs, D.ys, x, 2), (x) => polyEval(c, x)];
}
function restart() {
  trainD = makeReg(nTrain, seedD); valD = makeReg(nVal, seedD + 50); testD = makeReg(400, seedD + 99);
  base3 = fitThree(trainD); predV = preds(base3, valD); predT = preds(base3, testD); setupLoss(); startPG(null);
}
function preds(fs, D) { return D.xs.map((x) => fs.map((f) => f(x))); }    // P[i][k] = モデル k の点 i での予測
function members() { return dupOn ? [base3[0], base3[1], base3[1], base3[2]] : base3; }
// ★ 検証の 2 乗誤差 L(w) = wᵀAw − 2bᵀw + c（A = PᵀP/n、b = Pᵀy/n）を先に計算しておく
function lossOf(P, y) {
  let K = P[0].length, n = y.length, A = Array.from({ length: K }, () => new Array(K).fill(0)), b = new Array(K).fill(0), c = 0;
  P.forEach((p, i) => { for (let a = 0; a < K; a++) { b[a] += (p[a] * y[i]) / n; for (let q = 0; q < K; q++) A[a][q] += (p[a] * p[q]) / n; } c += (y[i] * y[i]) / n; });
  return { A, b, c, K, f: (w) => { let s = c; for (let a = 0; a < K; a++) { s -= 2 * b[a] * w[a]; for (let q = 0; q < K; q++) s += w[a] * A[a][q] * w[q]; } return Math.max(0, s); } };
}
function setupLoss() { lossQ = lossOf(preds(members(), valD), valD.ys); optW = runPG(lossQ, new Array(lossQ.K).fill(1 / lossQ.K), 3000); if (!dupOn) paintTriangle(); }
// ★ 単体への射影：和 = 1・≥ 0 の中でいちばん近い点（並べ替えて、引く量 θ を決める）
function projSimplex(v) {
  let u = v.slice().sort((a, b) => b - a), css = 0, theta = 0;
  for (let j = 0; j < u.length; j++) { css += u[j]; let t = (css - 1) / (j + 1); if (u[j] - t > 0) theta = t; }
  return v.map((x) => Math.max(0, x - theta));
}
function pgStep(Q, w) {               // 1 歩：w ← 射影(w − η∇L)、η = 1 / (2·A の対角の和)（大きすぎない歩幅）
  let tr = 0; for (let a = 0; a < Q.K; a++) tr += Q.A[a][a];
  let eta = 1 / (2 * tr + 1e-12), g = w.map((_, a) => { let s = -2 * Q.b[a]; for (let q = 0; q < Q.K; q++) s += 2 * Q.A[a][q] * w[q]; return s; });
  return projSimplex(w.map((x, a) => x - eta * g[a]));
}
function runPG(Q, w0, iters) { let w = w0.slice(); for (let t = 0; t < iters; t++) w = pgStep(Q, w); return w; }
function startPG(w0) { let K = lossQ.K; wts = w0 || new Array(K).fill(1 / K); path = [wts.slice()]; pgIters = 0; }
function paintTriangle() {             // 三角形の各画素 → 重み（重心座標）→ 検証の誤差の色
  let lo = Infinity, hi = 0, W = triImg.width, H = triImg.height, vals = [];
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) { let w = baryAt(px / W, py / H); let L = w ? lossQ.f(w) : -1; vals.push(L); if (w) { lo = Math.min(lo, L); hi = Math.max(hi, L); } }
  triImg.loadPixels();
  vals.forEach((L, i) => { let t = L < 0 ? 0 : 1 - Math.pow((L - lo) / (hi - lo + 1e-12), 0.35), c = L < 0 ? BG_COL : [BG_COL[0] + t * 200, BG_COL[1] + t * 160, BG_COL[2] + t * 70]; triImg.pixels[4 * i] = c[0]; triImg.pixels[4 * i + 1] = c[1]; triImg.pixels[4 * i + 2] = c[2]; triImg.pixels[4 * i + 3] = 255; });
  triImg.updatePixels();
}
// 三角形：上 = A、左下 = B、右下 = C。(u, v) ∈ [0,1]² の位置 → 重み（三角形の外なら null）
const TRI = [[0.5, 0], [0, 1], [1, 1]];
function baryAt(u, v) {
  let [p, q, r] = TRI, d = (q[1] - r[1]) * (p[0] - r[0]) + (r[0] - q[0]) * (p[1] - r[1]);
  let a = ((q[1] - r[1]) * (u - r[0]) + (r[0] - q[0]) * (v - r[1])) / d, b = ((r[1] - p[1]) * (u - r[0]) + (p[0] - r[0]) * (v - r[1])) / d, c = 1 - a - b;
  return a < -1e-9 || b < -1e-9 || c < -1e-9 ? null : [a, b, c];
}
function triPos(w) { return [triBox.x + (w[0] * TRI[0][0] + w[1] * TRI[1][0] + w[2] * TRI[2][0]) * triBox.w, triBox.y + (w[0] * TRI[0][1] + w[1] * TRI[1][1] + w[2] * TRI[2][1]) * triBox.h]; }
function mixPred(fs, w, x) { let s = 0; fs.forEach((f, k) => (s += w[k] * f(x))); return s; }
function mseOn(fn, D) { return meanOf(D.xs.map((x, i) => (fn(x) - D.ys[i]) ** 2)); }

function draw() {
  background(...BG_COL);
  if (pgIters < 400 && frameCount % 2 === 0) { for (let t = 0; t < 4; t++) wts = pgStep(lossQ, wts); pgIters += 4; path.push(wts.slice()); }
  let ms = members();
  // ---- 左：データとモデル
  let g = { x: 60, y: 110, w: Math.min(560, width * 0.45), h: height - 330, x0: 0, x1: 1, y0: -1, y1: 1.4 };
  plotAxes(g, 'x', '点：○ 訓練、● 検証。線：3 つのモデルと、金 = 重み付き平均', [0, 0.5, 1], [-1, 0, 1]);
  let xsG = Array.from({ length: 121 }, (_, i) => i / 120);
  base3.forEach((f, k) => { stroke(...COL3[k], 170); strokeWeight(1.5); polyline(xsG.map((x) => [gX(g, x), gY(g, f(x))])); });
  stroke(...GOLD); strokeWeight(3.5); polyline(xsG.map((x) => [gX(g, x), gY(g, mixPred(ms, wts, x))]));
  noFill(); stroke(200, 190, 175); strokeWeight(1); trainD.xs.forEach((x, i) => circle(gX(g, x), gY(g, trainD.ys[i]), 7));
  noStroke(); fill(...WINE); valD.xs.forEach((x, i) => circle(gX(g, x), gY(g, valD.ys[i]), 7));
  // ---- 右上：三角形
  let rx = g.x + g.w + 80; triBox = { x: rx, y: 120, w: Math.min(360, width - rx - 330), h: 0 }; triBox.h = triBox.w * 0.866;
  if (!dupOn) {
    noSmooth(); image(triImg, triBox.x, triBox.y, triBox.w, triBox.h); smooth();
    stroke(255); strokeWeight(1.5); polyline(path.map(triPos));
    noStroke(); fill(...GOLD); let o = triPos(optW); circle(o[0], o[1], 14); fill(255); let c = triPos(wts); circle(c[0], c[1], 7);
    fill(...COL3[0]); textSize(13); textAlign(CENTER, BOTTOM); text('A', triBox.x + triBox.w / 2, triBox.y - 4);
    fill(...COL3[1]); textAlign(RIGHT, TOP); text('B', triBox.x - 4, triBox.y + triBox.h);
    fill(...COL3[2]); textAlign(LEFT, TOP); text('C', triBox.x + triBox.w + 4, triBox.y + triBox.h);
  } else { noStroke(); fill(200, 185, 170); textSize(15); textAlign(LEFT, TOP); text('いまは 4 つ（B が 2 つ）なので三角形は描けない。下の棒で重みを見よう', triBox.x, triBox.y, triBox.w + 200); }
  // ---- 右：重みの棒と誤差の表
  let names = dupOn ? ['A', 'B', 'B のコピー', 'C'] : ['A', 'B', 'C'], cols = dupOn ? [COL3[0], COL3[1], COL3[1], COL3[2]] : COL3, bx = triBox.x + triBox.w + 50;
  noStroke(); fill(...INK); textSize(15); textAlign(LEFT, BASELINE); text('重み（和 = ' + fmtNum(sumArr(wts), 6) + '）', bx, 130);
  wts.forEach((w, k) => { let yy = 150 + 30 * k; fill(...cols[k]); rect(bx + 90, yy, Math.max(1, w * 160), 20); fill(220, 210, 195); textSize(13); textAlign(RIGHT, CENTER); text(names[k], bx + 82, yy + 10); textAlign(LEFT, CENTER); text(fmtNum(w, 3), bx + 96 + w * 160, yy + 10); });
  let ty = Math.max(triBox.y + triBox.h + 50, 330), eq = new Array(ms.length).fill(1 / ms.length), idx = dupOn ? [0, 1, 1, 2] : [0, 1, 2];
  let mixErr = (P, D, w) => meanOf(P.map((p, i) => (idx.reduce((s, k, a) => s + w[a] * p[k], 0) - D.ys[i]) ** 2));   // 予測は restart で計算ずみ
  let rows = [['', '検証', 'テスト']].concat(base3.map((f, k) => [NAMES3[k], mixErr(predV, valD, idx.map((q) => (q === k ? 1 / idx.filter((z) => z === k).length : 0))), mixErr(predT, testD, idx.map((q) => (q === k ? 1 / idx.filter((z) => z === k).length : 0)))]),
    [['等しい重み 1/' + ms.length, mixErr(predV, valD, eq), mixErr(predT, testD, eq)], ['射影勾配法の重み', mixErr(predV, valD, wts), mixErr(predT, testD, wts)]]);
  rows.forEach((r, q) => { fill(q === rows.length - 1 ? color(...GOLD) : color(220, 210, 195)); textSize(14); textAlign(LEFT, BASELINE); text(r[0], rx, ty + 24 * q); textAlign(RIGHT, BASELINE); text(q ? fmtNum(r[1], 4) : r[1], rx + 330, ty + 24 * q); text(q ? fmtNum(r[2], 4) : r[2], rx + 420, ty + 24 * q); });
  noStroke(); fill(170, 155, 145); textSize(13); textAlign(LEFT, BASELINE); text('2 乗誤差の平均（小さいほど良い）。射影勾配法 ' + pgIters + ' 回', rx, ty + 24 * rows.length + 6);
  // ---- 文字
  fill(...INK); textSize(20); text('重み付き平均　重みは検証データで決める（和 = 1、≥ 0）' + (dupOn ? '　B のコピー入り' : ''), 40, 40);
  fill(170, 155, 145); textSize(15); text('スペース もう一度探す　三角形をクリック そこから探す　D コピーを入れる　R データを作り直す', 40, 66);
  drawSelfTest(width - 170, height - 12);
}
function mousePressed() {
  if (dupOn || !triBox) return;
  let w = baryAt((mouseX - triBox.x) / triBox.w, (mouseY - triBox.y) / triBox.h);
  if (w) startPG(w);
}
function keyPressed() {
  if (key === ' ') startPG(null);
  if (key === 'd' || key === 'D') { dupOn = !dupOn; setupLoss(); startPG(null); }
  if (key === 'r' || key === 'R') { seedD++; restart(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(12); let okP = true;
  for (let t = 0; t < 100; t++) {
    let v = [0, 0, 0, 0].map(() => 3 * rndGauss()), p = projSimplex(v), pp = projSimplex(p);
    if (Math.abs(sumArr(p) - 1) > 1e-12 || p.some((x) => x < 0) || pp.some((x, a) => Math.abs(x - p[a]) > 1e-12)) okP = false;
    let dp = sumArr(p.map((x, a) => (x - v[a]) ** 2));          // ほかの単体の点（でたらめに 200 個）より近い
    for (let q = 0; q < 200; q++) { let e = [rnd(), rnd(), rnd(), rnd()].map((x) => -Math.log(x + 1e-12)), s = sumArr(e), r = e.map((x) => x / s); if (sumArr(r.map((x, a) => (x - v[a]) ** 2)) < dp - 1e-12) okP = false; }
  }
  check('単体への射影：和 = 1・≥ 0、2 回やっても同じ、単体のどの点よりも近い（100 個のベクトル）', okP);
  let tr = makeReg(40, 4), va = makeReg(40, 54), fs = fitThree(tr), Q = lossOf(preds(fs, va), va.ys), w = runPG(Q, [1 / 3, 1 / 3, 1 / 3], 3000);
  let best = Infinity;
  for (let i = 0; i <= 100; i++) for (let j = 0; i + j <= 100; j++) best = Math.min(best, Q.f([i / 100, j / 100, (100 - i - j) / 100]));
  check('射影勾配法の重み（' + w.map((x) => fmtNum(x, 3)).join(', ') + '）は単体の上の点、検証の誤差 ≤ 0.01 刻みの総当たりの最小', near(sumArr(w), 1, 1e-12) && w.every((x) => x >= 0) && Q.f(w) <= best + 1e-12 && best - Q.f(w) < 1e-3);
  check('最適な重みの検証の誤差 ' + fmtNum(Q.f(w), 4) + ' < 等しい重み ' + fmtNum(Q.f([1 / 3, 1 / 3, 1 / 3]), 4) + '、≤ どの 1 つのモデル', Q.f(w) < Q.f([1 / 3, 1 / 3, 1 / 3]) && [0, 1, 2].every((k) => Q.f(w) <= Q.f([0, 1, 2].map((a) => (a === k ? 1 : 0))) + 1e-12));
  let fd = [fs[0], fs[1], fs[1], fs[2]], Qd = lossOf(preds(fd, va), va.ys), wd = runPG(Qd, [0.25, 0.25, 0.25, 0.25], 3000);
  check('B のコピーを入れると、コピー 2 つの重みの和 ' + fmtNum(wd[1] + wd[2], 3) + ' = コピーなしの B の重み ' + fmtNum(w[1], 3) + '、誤差も同じ', Math.abs(wd[1] + wd[2] - w[1]) < 2e-3 && Math.abs(Qd.f(wd) - Q.f(w)) < 1e-6);
  let L = lossOf(preds(fs, va), va.ys).f([0.2, 0.5, 0.3]), direct = mseOn((x) => mixPred(fs, [0.2, 0.5, 0.3], x), va);
  check('先に計算した式 wᵀAw − 2bᵀw + c = 直接計算した検証の誤差（1e-12）', near(L, direct, 1e-12));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 三角形のいろいろな所をクリックして、射影勾配法がいつも同じ金の点に着くことを確かめよう（誤差の地形は 1 つの谷）
// 2. 最適な重みで、検証では良くなった。テストでも良くなっている？ 検証データが少ないと（nVal = 10）？
// 3. D でコピーを入れると、2 つのコピーで重みを分け合う。分け方は決まらないが、和は決まる
// 4. 「重み ≥ 0」をやめたらどうなる？ projSimplex を「和 = 1 だけ」にしてみよう（重みが負やとても大きくなることも）
// 5. 06 のスタッキングでは、重みの代わりに「メタ学習器」というモデルを学習する

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
