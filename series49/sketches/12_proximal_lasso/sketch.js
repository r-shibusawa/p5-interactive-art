// ============================================
// 12 劣勾配と近接勾配法（LASSO）
// F(x) = ½‖Ax − b‖² + λ‖x‖₁。|x| は 0 でとがっていて微分できない → 近接勾配法（ISTA）：勾配で 1 歩、そのあと「ソフト閾値」
//   S(v, k) = sign(v)·max(|v| − k, 0) で小さい係数はちょうど 0 になる。FISTA は慣性つきで O(1/k²)、劣勾配法は O(1/√k)
// ←→ = λ / クリック（左の図）= ISTA の初期点 / 1〜3 = 収束グラフの表示（劣勾配・ISTA・FISTA）
// ============================================

const M_ROWS = 40, N_COLS = 8;                     // ★ データの数 m と係数の数 n
const TRUTH = [3, -2, 0, 0, 1.5, 0, 0, 0];        // ★ 本当の係数（ほとんど 0 ＝ スパース）
const NOISE = 0.3, KIT = 300, NLAM = 50;           // ★ ノイズの大きさ、反復の回数、λ の段数
const CORR = 0.7;                                  // ★ 列どうしの相関（大きいほど AᵀA の条件数が大きく、遅くなる）
let A, bv, Lip, lamMax, lams, path, li = 18, V2, CI2, A2, x2s, st2 = [-1, 2.5], runs, xstar, Fstar, vis = [true, true, true], lam2, Lip2;

function setup() {
  createCanvas(windowWidth, windowHeight);
  makeData(); selfTest(); pickLam();
}
function makeData() {
  let rnd = rngSeed(12), gauss = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());
  A = []; for (let i = 0; i < M_ROWS; i++) { let h = gauss(); A.push([]); for (let j = 0; j < N_COLS; j++) A[i].push((Math.sqrt(1 - CORR) * gauss() + Math.sqrt(CORR) * h) / Math.sqrt(M_ROWS)); }
  bv = A.map((row) => vdot(row, TRUTH) + NOISE * gauss());
  Lip = lipOf(A); lamMax = Math.max(...atv(A, bv).map(Math.abs));
  lams = []; for (let j = 0; j < NLAM; j++) lams.push(lamMax * Math.pow(10, (-3 * j) / (NLAM - 1)));
  path = []; let x = new Array(N_COLS).fill(0);
  for (let l of lams) { x = cdSolve(A, bv, l, x); path.push(x); }
  A2 = A.map((r) => [r[0], r[1]]);
}
function axv(M, x) { return M.map((r) => vdot(r, x)); }
function atv(M, r) { let o = new Array(M[0].length).fill(0); M.forEach((row, i) => row.forEach((a, j) => (o[j] += a * r[i]))); return o; }
function softT(v, k) { return Math.sign(v) * Math.max(Math.abs(v) - k, 0); }
function smoothF(M, b, x) { let r = axv(M, x).map((v, i) => v - b[i]); return 0.5 * vdot(r, r); }
function smoothG(M, b, x) { return atv(M, axv(M, x).map((v, i) => v - b[i])); }
function Fobj(M, b, lam, x) { return smoothF(M, b, x) + lam * x.reduce((s, v) => s + Math.abs(v), 0); }
function lipOf(M) {                                 // ‖AᵀA‖ をべき乗法で（少しだけ大きめに）
  let v = new Array(M[0].length).fill(1), L = 0;
  for (let k = 0; k < 500; k++) { let w = atv(M, axv(M, v)); L = vlen(w) / vlen(v); v = w.map((x) => x / vlen(w)); }
  return L * (1 + 1e-9);
}
// 座標降下法：1 つずつ係数をソフト閾値で正確に最小化（λ を変えた解を高い精度で）
function cdSolve(M, b, lam, x0) {
  let x = x0.slice(), r = b.map((v, i) => v - vdot(M[i], x)), n = x.length, cn = [];
  for (let j = 0; j < n; j++) cn.push(M.reduce((s, row) => s + row[j] * row[j], 0));
  for (let sw = 0; sw < 20000; sw++) {
    let ch = 0;
    for (let j = 0; j < n; j++) {
      let z = x[j] + M.reduce((s, row, i) => s + row[j] * r[i], 0) / cn[j], nx = softT(z, lam / cn[j]), d = nx - x[j];
      if (d !== 0) { M.forEach((row, i) => (r[i] -= row[j] * d)); x[j] = nx; ch = Math.max(ch, Math.abs(d)); }
    }
    if (ch < 1e-15) break;
  }
  return x;
}
// ISTA（mom = false）と FISTA（mom = true）：x_{k+1} = S(y − ∇f(y)/L, λ/L)
function prox(M, b, lam, L, x0, K, mom) {
  let x = x0.slice(), y = x0.slice(), t = 1, P = [x], Fv = [Fobj(M, b, lam, x)];
  for (let k = 0; k < K; k++) {
    let g = smoothG(M, b, y), xn = y.map((v, j) => softT(v - g[j] / L, lam / L));
    let tn = mom ? (1 + Math.sqrt(1 + 4 * t * t)) / 2 : 1;
    y = mom ? xn.map((v, j) => v + ((t - 1) / tn) * (v - x[j])) : xn;
    x = xn; t = tn; P.push(x); Fv.push(Fobj(M, b, lam, x));
  }
  return { P, Fv };
}
// 劣勾配法：g ∈ ∂F（sign(0) = 0）、ステップ 1/(L√(k+1))。いちばん良い値 F_best を記録
function subgrad(M, b, lam, L, x0, K) {
  let x = x0.slice(), best = Fobj(M, b, lam, x), Fv = [best], ts = [], G = 0;
  for (let k = 0; k < K; k++) {
    let g = smoothG(M, b, x).map((v, j) => v + lam * Math.sign(x[j])), t = 1 / (L * Math.sqrt(k + 1));
    G = Math.max(G, vlen(g)); ts.push(t);
    x = x.map((v, j) => v - t * g[j]); best = Math.min(best, Fobj(M, b, lam, x)); Fv.push(best);
  }
  return { Fv, ts, G };
}
function pickLam() {
  let lam = lams[li]; xstar = path[li]; Fstar = Fobj(A, bv, lam, xstar);
  let x0 = new Array(N_COLS).fill(0);
  runs = [subgrad(A, bv, lam, Lip, x0, KIT), prox(A, bv, lam, Lip, x0, KIT, false), prox(A, bv, lam, Lip, x0, KIT, true)];
  Fstar = Math.min(Fstar, ...runs[1].Fv, ...runs[2].Fv);
  // 左の図：係数 2 つだけの問題（λ は同じ割合）
  let lm2 = Math.max(...atv(A2, bv).map(Math.abs)); lam2 = lam * (lm2 / lamMax);
  x2s = cdSolve(A2, bv, lam2, [0, 0]); Lip2 = lipOf(A2);
  V2 = makeView(16, 74, width * 0.4, height - 124, [1.2, -0.4, 3.6]);
  CI2 = contourImage(V2, (x, y) => Fobj(A2, bv, lam2, [x, y]));
}

function draw() {
  background(PAL.bg);
  image(CI2, V2.px, V2.py);
  let o = V2.toS(0, 0), r1 = Math.abs(x2s[0]) + Math.abs(x2s[1]), cx = drawingContext;
  cx.save(); cx.beginPath(); cx.rect(V2.px, V2.py, V2.pw, V2.ph); cx.clip();
  stroke(PAL.dim); strokeWeight(1); line(V2.px, o[1], V2.px + V2.pw, o[1]); line(o[0], V2.py, o[0], V2.py + V2.ph);
  noFill(); stroke(PAL.vi); strokeWeight(2); beginShape(); for (let [x, y] of [[r1, 0], [0, r1], [-r1, 0], [0, -r1]]) { let s = V2.toS(x, y); vertex(s[0], s[1]); } endShape(CLOSE);
  let ip = prox(A2, bv, lam2, Lip2, st2, 60, false).P;
  drawPath(V2, ip, PAL.or, 2); cx.restore();
  hud([['劣勾配と近接勾配法（LASSO）── λ = ' + fmt(lams[li], 4) + '（λ_max = ‖Aᵀb‖∞ = ' + fmt(lamMax, 4) + '）', PAL.ink],
    ['←→ λ　クリック（左）ISTA の初期点　1〜3 グラフの表示', PAL.dim]], 16, 14, 16);
  hud([['係数 2 つだけの問題：F(x) の等高線（軸の上でとがる）', PAL.ink], ['紫 = ‖x‖₁ = ‖x*‖₁ のひし形。ISTA（オレンジ）の行き先 x* = (' + fmt(x2s[0]) + ', ' + fmt(x2s[1]) + ')', PAL.dim]], V2.px + 8, V2.py + 6, 13);
  // 正則化パス
  let px = width * 0.45, pw = width - px - 30, py = 92, ph = height * 0.36;
  push(); fill(8, 26, 50, 230); stroke(PAL.line); rect(px, py, pw, ph);
  let cmax = Math.max(...path[NLAM - 1].map(Math.abs)) * 1.1, X = (j) => px + (pw * j) / (NLAM - 1), Y = (v) => py + ph / 2 - (v / cmax) * (ph / 2 - 6);
  stroke(PAL.line); line(px, Y(0), px + pw, Y(0));
  const CL = [PAL.or, PAL.cy, PAL.gr, PAL.ye, PAL.pk, PAL.vi, PAL.rd, PAL.ink];
  for (let c = 0; c < N_COLS; c++) { stroke(CL[c]); strokeWeight(2); noFill(); beginShape(); for (let j = 0; j < NLAM; j++) vertex(X(j), Y(path[j][c])); endShape(); }
  stroke(PAL.ink); strokeWeight(1); line(X(li), py, X(li), py + ph);
  noStroke(); fill(PAL.ink); textSize(13); textAlign(LEFT, BOTTOM);
  text('正則化パス：係数 x_j(λ)（左 λ = λ_max → 右 λ_max/1000、横は log λ）。0 の係数の数 = ' + xstar.filter((v) => v === 0).length + ' / ' + N_COLS, px, py - 4);
  textAlign(LEFT, TOP); textSize(12);
  for (let c = 0; c < N_COLS; c++) { fill(CL[c]); text('x' + (c + 1) + ' = ' + fmt(xstar[c]) + '（本当 ' + TRUTH[c] + '）', px + 8 + (c % 4) * (pw / 4), py + ph + 6 + Math.floor(c / 4) * 16); }
  pop();
  // 収束のグラフ
  let R = vlen(xstar), ks = runs[0].Fv.map((_, k) => k), sumT = [0]; runs[0].ts.forEach((t) => sumT.push(sumT[sumT.length - 1] + t));
  let se = [{ v: runs[0].Fv.map((v) => v - Fstar), c: PAL.vi, name: '劣勾配法（F_best）' }, { v: runs[1].Fv.map((v) => v - Fstar), c: PAL.or, name: 'ISTA' }, { v: runs[2].Fv.map((v) => v - Fstar), c: PAL.cy, name: 'FISTA' }];
  let bd = [{ v: ks.map((k) => (k ? (Lip * R * R) / (2 * k) : NaN)), c: PAL.or, dash: true, name: 'ISTA の上限 LR²/(2k)' }, { v: ks.map((k) => (k ? (2 * Lip * R * R) / ((k + 1) * (k + 1)) : NaN)), c: PAL.cy, dash: true, name: 'FISTA の上限 2LR²/(k+1)²' }];
  let sl = se.filter((_, i) => vis[i]).concat(bd.filter((_, i) => vis[i + 1]));
  let gy = py + ph + 76;
  logPlot(px + 34, gy, pw - 34, height - gy - 46, sl, { lo: -13, hi: 3, kmax: KIT, logx: true, title: 'F(x_k) − F*（両対数、x₀ = 0、R = ‖x₀ − x*‖、L = ‖AᵀA‖ = ' + fmt(Lip, 4) + '）' });
  drawSelfTest();
}

function mousePressed() { if (V2 && V2.inside(mouseX, mouseY)) st2 = V2.toW(mouseX, mouseY); }
function keyPressed() {
  if (key === RIGHT_ARROW && li < NLAM - 1) { li++; pickLam(); }
  if (key === LEFT_ARROW && li > 0) { li--; pickLam(); }
  if (key >= '1' && key <= '3') vis[+key - 1] = !vis[+key - 1];
}

function selfTest() {
  if (!A) makeData();
  stOk('ソフト閾値 S(3,1) = 2、S(−0.5,1) = 0、S(−3,1) = −2', softT(3, 1) === 2 && softT(-0.5, 1) === 0 && softT(-3, 1) === -2);
  let x = [0.3, -1, 2, 0.1, 0, 0.5, -0.2, 1], g = smoothG(A, bv, x), e = 0, h = 1e-6;
  for (let j = 0; j < N_COLS; j++) { let p = x.slice(), q = x.slice(); p[j] += h; q[j] -= h; e = Math.max(e, Math.abs((smoothF(A, bv, p) - smoothF(A, bv, q)) / (2 * h) - g[j])); }
  stOk('なめらかな部分 ½‖Ax−b‖² の勾配 Aᵀ(Ax−b) = 差分', e < 1e-7, fmt(e));
  let z = cdSolve(A, bv, lamMax * 1.0001, TRUTH), z1 = prox(A, bv, lamMax * 1.0001, Lip, new Array(N_COLS).fill(0), 5, false).P[5];
  stOk('λ ≥ ‖Aᵀb‖∞ なら解はちょうど x = 0', z.every((v) => v === 0) && z1.every((v) => v === 0) && path[0].every((v) => v === 0));
  let kktMax = 0, nz = 0;
  for (let j of [10, 25, 40]) {
    let xs = path[j], c = atv(A, bv.map((v, i) => v - vdot(A[i], xs)));
    xs.forEach((v, k) => { kktMax = Math.max(kktMax, v === 0 ? Math.max(0, Math.abs(c[k]) - lams[j]) : Math.abs(c[k] - lams[j] * Math.sign(v))); if (v === 0) nz++; });
  }
  stOk('KKT：x_j = 0 なら |A_jᵀ(b−Ax)| ≤ λ、x_j ≠ 0 なら = λ·sign(x_j)（3 つの λ）', kktMax < 1e-8 && nz > 0, '残差 ' + fmt(kktMax) + '、ちょうど 0 の係数 ' + nz + ' 個');
  // 正規直交な A（グラム・シュミット）なら解 = S_λ(Aᵀb)
  let Q = A.map((r) => r.slice());
  for (let j = 0; j < N_COLS; j++) { for (let k = 0; k < j; k++) { let d = Q.reduce((s, r) => s + r[j] * r[k], 0); Q.forEach((r) => (r[j] -= d * r[k])); } let n = Math.sqrt(Q.reduce((s, r) => s + r[j] * r[j], 0)); Q.forEach((r) => (r[j] /= n)); }
  let lq = 0.2, want = atv(Q, bv).map((v) => softT(v, lq)), got = cdSolve(Q, bv, lq, new Array(N_COLS).fill(0)), gf = prox(Q, bv, lq, lipOf(Q), new Array(N_COLS).fill(0), 300, true).P[300];
  stOk('AᵀA = I なら解は S_λ(Aᵀb)（座標降下・FISTA の両方）', Math.max(...want.map((v, j) => Math.abs(v - got[j]))) < 1e-12 && Math.max(...want.map((v, j) => Math.abs(v - gf[j]))) < 1e-9);
  let lam = lams[li], xs = path[li], Fs = Fobj(A, bv, lam, xs), x0 = new Array(N_COLS).fill(0), R = vlen(xs);
  let ri = prox(A, bv, lam, Lip, x0, KIT, false), rf = prox(A, bv, lam, Lip, x0, KIT, true), rs = subgrad(A, bv, lam, Lip, x0, KIT);
  stOk('F* は ISTA・FISTA のどの値よりも小さい（F* が十分正確）', Math.min(...ri.Fv, ...rf.Fv) >= Fs - 1e-13, 'F* = ' + Fs.toPrecision(15));
  stOk('ISTA：F(x_k) − F* ≤ L‖x₀−x*‖²/(2k)（全部の k）', ri.Fv.every((v, k) => k === 0 || v - Fs <= (Lip * R * R) / (2 * k) + 1e-12), 'k=100：' + fmt(ri.Fv[100] - Fs) + ' ≤ ' + fmt((Lip * R * R) / 200));
  stOk('FISTA：F(x_k) − F* ≤ 2L‖x₀−x*‖²/(k+1)²（全部の k）', rf.Fv.every((v, k) => k === 0 || v - Fs <= (2 * Lip * R * R) / ((k + 1) * (k + 1)) + 1e-12), 'k=30：' + fmt(rf.Fv[30] - Fs) + ' ≤ ' + fmt((2 * Lip * R * R) / 961));
  let sT = 0, sT2 = 0, okS = true;
  rs.ts.forEach((t, k) => { sT += t; sT2 += t * t; okS = okS && rs.Fv[k + 1] - Fs <= (R * R + rs.G * rs.G * sT2) / (2 * sT) + 1e-12; });
  stOk('劣勾配法：F_best − F* ≤ (R² + G²Σt²)/(2Σt)（全部の k）', okS, 'k=' + KIT + '：' + fmt(rs.Fv[KIT] - Fs));
  stReport();
}

// ---------- やってみよう ----------
// 1. ←→ で λ を大きくすると、正則化パスの係数が 1 つずつちょうど 0 になる（λ_max より大きいと全部 0）
// 2. 左の図：λ を大きくすると、ISTA の行き先が軸の上（片方がちょうど 0）に乗る。ひし形の角に当たるから
// 3. FISTA のグラフは O(1/k²) の上限の下。ISTA は O(1/k)、劣勾配法はずっと遅い（O(1/√k)）
// 4. TRUTH を変えて、本当に 0 の係数がパスでも 0 になるか確かめよう。NOISE を大きくすると？
// 5. 劣勾配法のステップ 1/(L√(k+1)) を一定にすると、F_best はある高さで止まる

// ==================================================
// ここから下は「最適化の道具」（中身は読まなくても OK。消さないでね）
// テスト関数（値・勾配・ヘッセ行列）、等高線、対数グラフ、2×2 行列、直線探索、自己テスト
// ==================================================
const PAL = { bg: '#0c2445', ink: '#e8f2fb', dim: '#8eb2cf', line: '#2c5a85', or: '#ff7a2f', cy: '#5fd8f0', gr: '#8de07a', ye: '#ffd24a', pk: '#ff6fa8', vi: '#b79cff', rd: '#ff5a5a' };

// ---- テスト関数 { f 値, g 勾配, H ヘッセ行列, xs 最小点, fs 最小値, view [中心x, 中心y, 横の半幅] }
function quadFn(kap, th = 0.5) {     // f = ½ xᵀAx、A の固有値は μ = 1 と L = κ（θ だけ回転）
  let c = Math.cos(th), s = Math.sin(th), a = c * c + kap * s * s, b = (1 - kap) * c * s, d = s * s + kap * c * c;
  return { name: '2 次関数 κ = ' + fmt(kap), f: (x, y) => 0.5 * (a * x * x + 2 * b * x * y + d * y * y), g: (x, y) => [a * x + b * y, b * x + d * y],
    H: () => [[a, b], [b, d]], mu: 1, L: kap, xs: [[0, 0]], fs: 0, view: [0, 0, 3.2], start: [-2.6, 1.6], convex: true, th };
}
const ROSEN = { name: 'ローゼンブロック', f: (x, y) => (1 - x) ** 2 + 100 * (y - x * x) ** 2,
  g: (x, y) => [-2 * (1 - x) - 400 * x * (y - x * x), 200 * (y - x * x)],
  H: (x, y) => [[2 - 400 * (y - x * x) + 800 * x * x, -400 * x], [-400 * x, 200]], xs: [[1, 1]], fs: 0, view: [-0.2, 0.9, 2.1], start: [-1.2, 1] };
const HIMMEL = { name: 'ヒンメルブラウ', f: (x, y) => (x * x + y - 11) ** 2 + (x + y * y - 7) ** 2,
  g: (x, y) => [4 * x * (x * x + y - 11) + 2 * (x + y * y - 7), 2 * (x * x + y - 11) + 4 * y * (x + y * y - 7)],
  H: (x, y) => [[12 * x * x + 4 * y - 42, 4 * x + 4 * y], [4 * x + 4 * y, 4 * x + 12 * y * y - 26]],
  xs: [[3, 2], [-2.8051, 3.1313], [-3.7793, -3.2832], [3.5844, -1.8481]], fs: 0, view: [0, 0, 6.2], start: [-0.3, -0.9] };
const BEALE = (() => {
  let C = [1.5, 2.25, 2.625], each = (x, y, fn) => C.forEach((c, i) => { let n = i + 1; fn(c - x + x * y ** n, y ** n - 1, n * x * y ** (n - 1), n * y ** (n - 1), n > 1 ? n * (n - 1) * x * y ** (n - 2) : 0); });
  return { name: 'ビール', f: (x, y) => { let s = 0; each(x, y, (r) => (s += r * r)); return s; },
    g: (x, y) => { let p = [0, 0]; each(x, y, (r, rx, ry) => { p[0] += 2 * r * rx; p[1] += 2 * r * ry; }); return p; },
    H: (x, y) => { let a = 0, b = 0, d = 0; each(x, y, (r, rx, ry, rxy, ryy) => { a += 2 * rx * rx; b += 2 * (rx * ry + r * rxy); d += 2 * (ry * ry + r * ryy); }); return [[a, b], [b, d]]; },
    xs: [[3, 0.5]], fs: 0, view: [0.6, 0, 4.6], start: [-1.5, 1.8] };
})();
HIMMEL.xs = HIMMEL.xs.map((p) => criticalPoint(HIMMEL, p));   // 4 つの最小点を ∇f = 0 のニュートン法で精密に
const LSE = (() => {                  // log(e^(x+3y−0.1) + e^(x−3y−0.1) + e^(−x−0.1))：凸。最小点 (−ln2 / 2, 0)、最小値 (3/2)ln2 − 0.1
  let pr = (x, y) => { let z = [x + 3 * y - 0.1, x - 3 * y - 0.1, -x - 0.1], m = Math.max(...z), e = z.map((v) => Math.exp(v - m)), s = e[0] + e[1] + e[2]; return [m + Math.log(s), e.map((v) => v / s)]; };
  return { name: 'log-sum-exp', f: (x, y) => pr(x, y)[0], g: (x, y) => { let p = pr(x, y)[1]; return [p[0] + p[1] - p[2], 3 * p[0] - 3 * p[1]]; },
    H: (x, y) => { let p = pr(x, y)[1], g0 = p[0] + p[1] - p[2], g1 = 3 * p[0] - 3 * p[1]; return [[1 - g0 * g0, g1 - g0 * g1], [g1 - g0 * g1, 9 * (p[0] + p[1]) - g1 * g1]]; },
    xs: [[-Math.LN2 / 2, 0]], fs: 1.5 * Math.LN2 - 0.1, view: [-0.4, 0, 2.4], start: [-2, 1.1], convex: true, L: 10 };
})();

// ---- 2×2 の行列とベクトル
function eig2(M) {                    // 対称行列の固有値（小さい順）と固有ベクトル
  let a = M[0][0], b = M[0][1], d = M[1][1], t = (a + d) / 2, r = Math.hypot((a - d) / 2, b), l1 = t - r;
  let v = Math.abs(b) > 1e-14 * (Math.abs(a) + Math.abs(d) + 1) ? [l1 - d, b] : a <= d ? [1, 0] : [0, 1], n = Math.hypot(v[0], v[1]);
  v = [v[0] / n, v[1] / n];
  return { l: [l1, t + r], v: [v, [-v[1], v[0]]] };
}
function solve2(M, r) { let det = M[0][0] * M[1][1] - M[0][1] * M[1][0]; return [(M[1][1] * r[0] - M[0][1] * r[1]) / det, (M[0][0] * r[1] - M[1][0] * r[0]) / det]; }
function vlen(v) { return Math.hypot(...v); }
function vdot(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }
function vaxpy(a, x, y) { return y.map((yi, i) => yi + a * x[i]); }   // a·x + y
function bad(v) { return !isFinite(v) || Math.abs(v) > 1e12; }
function errTo(F, p) { return Math.min(...F.xs.map((q) => Math.hypot(p[0] - q[0], p[1] - q[1]))); }

// ---- 微分のチェック（中心差分）。H は「解析的な勾配」の差分と比べる
function fdGrad(fn, x, y, h = 1e-6) { return [(fn(x + h, y) - fn(x - h, y)) / (2 * h), (fn(x, y + h) - fn(x, y - h)) / (2 * h)]; }
function derivErr(F, pts) {
  let eg = 0, eh = 0, rel = (a, b) => Math.abs(a - b) / Math.max(1, Math.abs(b));
  for (let [x, y] of pts) {
    let g = F.g(x, y), n = fdGrad(F.f, x, y), H = F.H(x, y), h = 1e-6;
    let gx1 = F.g(x + h, y), gx0 = F.g(x - h, y), gy1 = F.g(x, y + h), gy0 = F.g(x, y - h);
    let N = [[(gx1[0] - gx0[0]) / (2 * h), (gy1[0] - gy0[0]) / (2 * h)], [(gx1[1] - gx0[1]) / (2 * h), (gy1[1] - gy0[1]) / (2 * h)]];
    eg = Math.max(eg, rel(g[0], n[0]), rel(g[1], n[1]));
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) eh = Math.max(eh, rel(H[i][j], N[i][j]));
  }
  return { g: eg, H: eh };
}
// ∇f = 0 をニュートン法で解く（停留点を探す）
function criticalPoint(F, p, it = 60) {
  for (let k = 0; k < it; k++) { let d = solve2(F.H(p[0], p[1]), F.g(p[0], p[1])); if (!isFinite(d[0] + d[1])) return null; p = [p[0] - d[0], p[1] - d[1]]; if (vlen(d) < 1e-14) break; }
  return vlen(F.g(p[0], p[1])) < 1e-8 ? p : null;
}
// アルミホの条件 f(x + t d) ≤ f(x) + c₁ t ∇fᵀd になるまで t を β 倍（試した点も返す）
function armijo(F, p, d, c1 = 1e-4, beta = 0.5, t = 1) {
  let f0 = F.f(p[0], p[1]), sl = vdot(F.g(p[0], p[1]), d), tries = [];
  for (let k = 0; k < 60; k++) { let fq = F.f(p[0] + t * d[0], p[1] + t * d[1]); tries.push([t, fq]); if (fq <= f0 + c1 * t * sl) break; t *= beta; }
  return { t, tries, slope: sl };
}

// ---- 画面と世界の座標（縦横の縮尺は同じ）
function makeView(px, py, pw, ph, v) {
  let V = { px, py, pw: Math.round(pw), ph: Math.round(ph), cx: v[0], cy: v[1], hw: v[2] };
  V.sc = V.pw / (2 * V.hw); V.hh = V.ph / (2 * V.sc);
  V.toS = (x, y) => [V.px + V.pw / 2 + (x - V.cx) * V.sc, V.py + V.ph / 2 - (y - V.cy) * V.sc];
  V.toW = (sx, sy) => [V.cx + (sx - V.px - V.pw / 2) / V.sc, V.cy - (sy - V.py - V.ph / 2) / V.sc];
  V.inside = (sx, sy) => sx >= V.px && sx <= V.px + V.pw && sy >= V.py && sy <= V.py + V.ph;
  return V;
}
// 等高線の画像：格子で値を計算 → 分位点で段を決め、色ぬり ＋ マーチングスクエアで線（関数を変えたときだけ呼ぶ）
function contourImage(V, fz, nLev = 18) {
  let cs = 5, nx = Math.ceil(V.pw / cs) + 1, ny = Math.ceil(V.ph / cs) + 1, Z = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { let [x, y] = V.toW(V.px + i * cs, V.py + j * cs), z = fz(x, y); Z[j * nx + i] = isFinite(z) ? z : 1e300; }
  let srt = Array.from(Z).filter((z) => z < 1e300).sort((a, b) => a - b), lev = [];
  for (let k = 1; k <= nLev; k++) lev.push(srt[Math.min(srt.length - 1, Math.floor(srt.length * Math.pow(k / (nLev + 1), 1.7)))]);
  let G = createGraphics(V.pw, V.ph); G.pixelDensity(1);
  let ctx = G.drawingContext, img = ctx.createImageData(V.pw, V.ph), band = new Uint8Array(nx * ny);
  for (let q = 0; q < Z.length; q++) { let b = 0; while (b < nLev && Z[q] > lev[b]) b++; band[q] = Z[q] >= 1e300 ? 255 : b; }
  for (let py = 0; py < V.ph; py++) for (let px = 0; px < V.pw; px++) {
    let b = band[Math.round(py / cs) * nx + Math.round(px / cs)], t = b === 255 ? 1.25 : b / nLev, o = 4 * (py * V.pw + px);
    img.data[o] = 14 + 34 * (1 - t); img.data[o + 1] = 40 + 62 * (1 - t); img.data[o + 2] = 72 + 70 * (1 - t); img.data[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  // 方眼（製図用紙）
  let gs = Math.pow(10, Math.floor(Math.log10(V.hw / 2))); if (V.hw / gs > 10) gs *= 2; if (V.hw / gs > 10) gs *= 2.5;
  ctx.strokeStyle = 'rgba(120,200,240,0.12)'; ctx.lineWidth = 1; ctx.beginPath();
  for (let x = Math.ceil((V.cx - V.hw) / gs) * gs; x < V.cx + V.hw; x += gs) { let s = V.toS(x, 0)[0] - V.px; ctx.moveTo(s, 0); ctx.lineTo(s, V.ph); }
  for (let y = Math.ceil((V.cy - V.hh) / gs) * gs; y < V.cy + V.hh; y += gs) { let s = V.toS(0, y)[1] - V.py; ctx.moveTo(0, s); ctx.lineTo(V.pw, s); }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(110,215,250,0.55)';
  for (let L of lev) {
    ctx.beginPath();
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      let a = Z[j * nx + i], b = Z[j * nx + i + 1], c = Z[(j + 1) * nx + i + 1], d = Z[(j + 1) * nx + i], P = [];
      if (a > L !== b > L) P.push(i + (L - a) / (b - a), j);
      if (b > L !== c > L) P.push(i + 1, j + (L - b) / (c - b));
      if (d > L !== c > L) P.push(i + (L - d) / (c - d), j + 1);
      if (a > L !== d > L) P.push(i, j + (L - a) / (d - a));
      for (let q = 0; q + 3 < P.length; q += 4) { ctx.moveTo(P[q] * cs, P[q + 1] * cs); ctx.lineTo(P[q + 2] * cs, P[q + 3] * cs); }
    }
    ctx.stroke();
  }
  G.levels = lev;
  return G;
}

// ---- 対数グラフ：series = [{ v: 値の配列, c: 色, name, dash }]。0 以下・NaN は描かない。opt = { lo, hi, logx, title, kmax }
function logPlot(x, y, w, h, series, opt = {}) {
  let lo = opt.lo, hi = opt.hi, kmax = opt.kmax || 1, mn = Infinity, mx = -Infinity;
  for (let s of series) { if (!opt.kmax) kmax = Math.max(kmax, s.v.length - 1); for (let v of s.v) if (v > 0 && isFinite(v)) { mn = Math.min(mn, Math.log10(v)); mx = Math.max(mx, Math.log10(v)); } }
  if (lo === undefined) lo = isFinite(mn) ? Math.max(-17, Math.floor(mn)) : -16;
  if (hi === undefined) hi = isFinite(mx) ? Math.ceil(mx) : 2;
  if (hi <= lo) hi = lo + 1;
  let X = (k) => x + w * (opt.logx ? Math.log(1 + k) / Math.log(1 + kmax) : k / kmax), Y = (v) => y + h - (h * (Math.log10(v) - lo)) / (hi - lo);
  push();
  fill(8, 26, 50, 230); stroke(PAL.line); strokeWeight(1); rect(x, y, w, h);
  textSize(11); textAlign(RIGHT, CENTER);
  let de = Math.max(1, Math.ceil((hi - lo) / 8));
  for (let e = lo; e <= hi; e += de) { let yy = Y(Math.pow(10, e)); stroke(40, 80, 120); line(x, yy, x + w, yy); noStroke(); fill(PAL.dim); text('10' + sup(e), x - 4, yy); }
  textAlign(CENTER, TOP); noStroke(); fill(PAL.dim);
  let kt = opt.logx ? [1, 10, 100, 1000, 10000].filter((k) => k <= kmax) : [0, Math.round(kmax / 2), kmax];
  for (let k of kt) text(k, X(k), y + h + 3);
  text(opt.xlabel || '反復 k', x + w / 2, y + h + 16);
  for (let s of series) {
    stroke(s.c); strokeWeight(s.wt || 2); noFill();
    if (s.dash) drawingContext.setLineDash([6, 5]);
    let pts = [];
    let flush = () => { if (pts.length >= 2) { beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape(); } else if (pts.length === 1) point(pts[0][0], pts[0][1]); pts = []; };
    for (let k = 0; k < s.v.length && k <= kmax; k++) { let v = s.v[k]; if (v > 0 && isFinite(v)) pts.push([X(k), Math.max(y, Math.min(y + h, Y(v)))]); else flush(); }
    flush(); drawingContext.setLineDash([]);
  }
  noStroke(); textAlign(RIGHT, TOP); textSize(12);
  series.filter((s) => s.name).forEach((s, i) => { let yy = y + 6 + 15 * i; noStroke(); fill(s.c); text(s.name, x + w - 34, yy); stroke(s.c); strokeWeight(2); if (s.dash) drawingContext.setLineDash([4, 3]); line(x + w - 28, yy + 7, x + w - 8, yy + 7); drawingContext.setLineDash([]); });
  if (opt.title) { noStroke(); fill(PAL.ink); textSize(13); textAlign(LEFT, BOTTOM); text(opt.title, x, y - 4); }
  pop();
}

// ---- 描く道具
function arrow(x1, y1, x2, y2, c, w = 2) {
  let a = Math.atan2(y2 - y1, x2 - x1), L = Math.hypot(x2 - x1, y2 - y1), hd = Math.min(12, L * 0.4);
  push(); stroke(c); fill(c); strokeWeight(w); line(x1, y1, x2, y2);
  if (L > 2) triangle(x2, y2, x2 - hd * Math.cos(a - 0.4), y2 - hd * Math.sin(a - 0.4), x2 - hd * Math.cos(a + 0.4), y2 - hd * Math.sin(a + 0.4));
  pop();
}
function drawPath(V, P, c, w = 2, dots = true) {   // 反復点の列を折れ線と点で
  if (P.length === 0) return;
  push(); stroke(c); strokeWeight(w); noFill();
  if (P.length >= 2) { beginShape(); for (let p of P) { let s = V.toS(p[0], p[1]); vertex(s[0], s[1]); } endShape(); }
  if (dots) { noStroke(); fill(c); for (let i = 0; i < P.length; i += Math.max(1, Math.floor(P.length / 60))) { let s = V.toS(P[i][0], P[i][1]); circle(s[0], s[1], 5); } }
  let s = V.toS(P[P.length - 1][0], P[P.length - 1][1]); stroke(255); strokeWeight(1.5); fill(c); circle(s[0], s[1], 11);
  pop();
}
function hud(lines, x, y, sz = 15, lh = 1.45) {   // 文字の列（[文字, 色] または 文字）
  push(); noStroke(); textSize(sz); textAlign(LEFT, TOP);
  lines.forEach((L, i) => { let [s, c] = Array.isArray(L) ? L : [L, PAL.ink]; fill(c); text(s, x, y + i * sz * lh); });
  pop();
}
const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
function sup(n) { return String(n).split('').map((ch) => SUP[ch] || ch).join(''); }
function fmt(v, d = 3) {             // 数の表示（発散・とても小さい数も）
  if (!isFinite(v) || Math.abs(v) > 1e12) return '発散';
  if (v === 0) return '0';
  let a = Math.abs(v);
  if (a < 1e-3 || a >= 1e5) { let e = Math.floor(Math.log10(a)), m = v / Math.pow(10, e); return m.toFixed(d - 1) + '×10' + sup(e); }
  return String(+v.toPrecision(d));
}
function rngSeed(s) { return () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---- 自己テスト（起動時に、知られている答えと照合する）
let selfTestResults = [];
function stOk(name, cond, info = '') { selfTestResults.push({ name, ok: !!cond, info }); }
function stReport() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name + (r.info ? '  [' + r.info + ']' : '')); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest() { push(); noStroke(); textSize(14); textAlign(LEFT, BOTTOM); fill(selfTestResults.every((r) => r.ok) ? PAL.gr : PAL.rd); text(selfTestLine(), 16, height - 12); pop(); }
