// ============================================
// 08 共役勾配法（CG）
// Ax = b（A は対称・正定値）を、f = ½xᵀAx − bᵀx の最小化として解く。前の方向と「A について直交」（dᵢᵀAdⱼ = 0）な方向へ進む
//   左：2 次元なら CG はちょうど 2 回で解に着く（最急降下法はジグザグ）
//   右：100×100 の格子のポアソン方程式（未知数 1 万個）。誤差 ‖e‖_A の理論の上限 2((√κ−1)/(√κ+1))^k と比べる
// ↑↓ = κ（左）/ クリック = 初期点（左）/ 1〜3 = 正解の絵 / ←→ = 1 フレームの反復回数 / スペース = 止める / R = 最初から
// ============================================

const N = 100;              // ★ 格子の大きさ（未知数は N × N 個）
const KMAX = 1500;          // ★ 反復の最大回数
let perFrame = 4;           // ★ 1 フレームあたりの反復回数
const KAPS = [2, 5, 10, 30, 100];   // ★ 左の 2 次関数の κ
let ki = 2, F, V, CI, x0 = [-2.4, 1.2], cgP, gdP, pat = 1, run = true;
let xTrue, bvec, CG, SD, hist, img, kap, qcg, qsd;

function setup() {
  createCanvas(windowWidth, windowHeight);
  img = createImage(N, N);
  kap = Math.sin((N * Math.PI) / (2 * (N + 1))) ** 2 / Math.sin(Math.PI / (2 * (N + 1))) ** 2;
  qcg = (Math.sqrt(kap) - 1) / (Math.sqrt(kap) + 1); qsd = (kap - 1) / (kap + 1);
  selfTest();
  rebuild2d(true); restart();
}
// ---- 左：2 次元
function rebuild2d(newFn) {
  F = quadFn(KAPS[ki]);
  if (newFn) { V = makeView(16, 74, width * 0.42, height * 0.56, F.view); CI = contourImage(V, F.f); }
  let A = F.H(), Av = (v) => [A[0][0] * v[0] + A[0][1] * v[1], A[1][0] * v[0] + A[1][1] * v[1]];
  cgP = solvePath(Av, x0, true); gdP = solvePath(Av, x0, false);
}
function solvePath(Av, p, conj) {     // b = 0（解は原点）。CG か 最急降下法（正確な直線探索）の点の列と方向
  let S = cgInit(Av, [0, 0], p.slice()), P = [p.slice()], D = [], rr0 = S.rr;
  for (let k = 0; k < 60 && S.rr > 1e-24 * rr0; k++) { D.push(Array.from(conj ? S.d : S.r)); conj ? cgStep(S, Av) : sdStep(S, Av); P.push(Array.from(S.x)); }
  return { P, D };
}
// ---- CG と最急降下法の 1 回分（x, r = b − Ax, d をその場で書きかえる）
function cgInit(Av, b, x) { let Ax = Av(x), r = b.map((v, i) => v - Ax[i]); return { x, r, d: r.slice(), rr: vdot(r, r), k: 0 }; }
function cgStep(S, Av) {
  let Ad = Av(S.d), a = S.rr / vdot(S.d, Ad), n = S.x.length;
  for (let i = 0; i < n; i++) { S.x[i] += a * S.d[i]; S.r[i] -= a * Ad[i]; }
  let rr = vdot(S.r, S.r), be = rr / S.rr;
  for (let i = 0; i < n; i++) S.d[i] = S.r[i] + be * S.d[i];
  S.rr = rr; S.k++;
}
function sdStep(S, Av) {
  let Ar = Av(S.r), a = S.rr / vdot(S.r, Ar), n = S.x.length;
  for (let i = 0; i < n; i++) { S.x[i] += a * S.r[i]; S.r[i] -= a * Ar[i]; }
  S.rr = vdot(S.r, S.r); S.k++;
}
// ---- 右：5 点差分のラプラシアン（4 − 上下左右）。行列は作らず、かけ算だけ
function lapMul(n, v, out) {
  out = out || new Float64Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    let q = j * n + i, s = 4 * v[q];
    if (i > 0) s -= v[q - 1]; if (i < n - 1) s -= v[q + 1]; if (j > 0) s -= v[q - n]; if (j < n - 1) s -= v[q + n];
    out[q] = s;
  }
  return out;
}
function pattern(n, which) {
  let x = new Float64Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    let u = (i + 1) / (n + 1), v = (j + 1) / (n + 1), s = Math.sin(Math.PI * u) * Math.sin(Math.PI * v);
    x[j * n + i] = which === 1 ? s * Math.exp(-((u - 0.4) ** 2 + (v - 0.55) ** 2) * 6) : which === 2 ? s * Math.sin(9 * u * Math.PI) * Math.sin(7 * v * Math.PI) : s * ((Math.floor(u * 6) + Math.floor(v * 6)) % 2 ? 1 : -0.5);
  }
  return x;
}
function restart() {
  xTrue = pattern(N, pat); bvec = lapMul(N, xTrue);
  let Av = (v) => lapMul(N, v);
  CG = cgInit(Av, bvec, new Float64Array(N * N)); SD = cgInit(Av, bvec, new Float64Array(N * N));
  CG.e0 = Math.sqrt(errA(CG)); CG.r0 = Math.sqrt(CG.rr);
  hist = { cg: [1], sd: [1], res: [1], bcg: [1], bsd: [1] };
}
function errA(S) { let s = 0; for (let i = 0; i < S.x.length; i++) s += (S.x[i] - xTrue[i]) * S.r[i]; return Math.max(0, -s); }   // ‖e‖_A² = eᵀAe = −eᵀr

function draw() {
  background(PAL.bg);
  let Av = (v) => lapMul(N, v);
  if (run) for (let t = 0; t < perFrame && SD.k < KMAX; t++) {
    if (hist.cg[CG.k] > 1e-14) cgStep(CG, Av); sdStep(SD, Av);
    let k = SD.k;
    hist.cg[k] = hist.cg[k - 1] > 1e-14 ? Math.sqrt(errA(CG)) / CG.e0 : 0; hist.res[k] = hist.cg[k] ? Math.sqrt(CG.rr) / CG.r0 : 0;
    hist.sd[k] = Math.sqrt(errA(SD)) / CG.e0; hist.bcg[k] = 2 * qcg ** k; hist.bsd[k] = qsd ** k;
  }
  // 左：2 次元
  image(CI, V.px, V.py);
  drawPath(V, gdP.P, PAL.cy, 2); drawPath(V, cgP.P, PAL.or, 3);
  let A = F.H(), d0 = cgP.D[0], d1 = cgP.D[1] || [0, 0], Ad1 = [A[0][0] * d1[0] + A[0][1] * d1[1], A[1][0] * d1[0] + A[1][1] * d1[1]];
  let cosA = vdot(d0, Ad1) / Math.max(1e-300, Math.sqrt(vdot(d0, [A[0][0] * d0[0] + A[0][1] * d0[1], A[1][0] * d0[0] + A[1][1] * d0[1]]) * vdot(d1, Ad1)));
  hud([['共役勾配法 ── 左：' + F.name + '　右：ポアソン方程式 ' + N + '×' + N + '（未知数 ' + N * N + '）', PAL.ink],
    ['↑↓ κ　クリック 初期点　1〜3 正解の絵　←→ 1 フレーム ' + perFrame + ' 回　スペース ' + (run ? '止める' : '動かす') + '　R 最初から', PAL.dim]], 16, 14, 16);
  hud([['CG（橙）：' + (cgP.P.length - 1) + ' 回で解に着く（2 次元なら 2 回）', PAL.or], ['最急降下法（水色・正確な直線探索）：' + (gdP.P.length - 1) + ' 回で ‖r‖/‖r₀‖ < 10⁻¹²', PAL.cy],
    ['CG の 2 つの方向：d₀ᵀAd₁ / (‖d₀‖_A‖d₁‖_A) = ' + fmt(cosA) + '（A について直交）', PAL.ye],
    ['ふつうの内積 d₀·d₁ / (‖d₀‖‖d₁‖) = ' + fmt(vdot(d0, d1) / Math.max(1e-300, vlen(d0) * vlen(d1))) + '（直交ではない）', PAL.dim],
    ['n 次元なら、厳密な計算で n 回以内に必ず解ける', PAL.ink]], 16, V.py + V.ph + 12, 14);
  // 右：画像（正解・CG・最急降下法）
  let x = width * 0.46, w = width - x - 20, cell = Math.min(w / 3 - 10, height * 0.26);
  [[xTrue, '正解 x*'], [CG.x, 'CG  k = ' + CG.k], [SD.x, '最急降下法  k = ' + SD.k]].forEach(([v, t], i) => {
    drawField(v); image(img, x + i * (cell + 10), 92, cell, cell);
    noStroke(); fill(PAL.ink); textSize(13); textAlign(LEFT, BOTTOM); text(t, x + i * (cell + 10), 88);
  });
  let kp = hist.cg.findIndex((v) => v < 1e-8), pred = Math.ceil(Math.log(1e-8 / 2) / Math.log(qcg));
  hud([['κ = sin²(Nπ/2(N+1)) / sin²(π/2(N+1)) = ' + fmt(kap, 5) + '、√κ = ' + fmt(Math.sqrt(kap), 4), PAL.ink],
    ['‖e‖_A/‖e₀‖_A < 10⁻⁸ まで：CG の実測 ' + (kp < 0 ? '…' : kp + ' 回') + ' ／ 上限の式 ' + pred + ' 回（上限より速い）', PAL.ye],
    ['最急降下法の上限は ((κ−1)/(κ+1))^k → 同じ精度に約 ' + fmt(Math.log(1e-8) / Math.log(qsd), 3) + ' 回', PAL.dim]], x, 100 + cell, 14);
  let top = 100 + cell + 76;
  logPlot(x + 34, top, w - 40, height - top - 46, [
    { v: hist.cg, c: PAL.or, name: 'CG ‖e‖_A/‖e₀‖_A' }, { v: hist.bcg, c: PAL.or, name: '上限 2((√κ−1)/(√κ+1))^k', dash: true },
    { v: hist.res, c: PAL.ye, name: 'CG の残差 ‖r‖/‖r₀‖（上限の対象ではない）', wt: 1 },
    { v: hist.sd, c: PAL.cy, name: '最急降下法 ‖e‖_A/‖e₀‖_A' }, { v: hist.bsd, c: PAL.cy, name: '上限 ((κ−1)/(κ+1))^k', dash: true }],
    { lo: -14, hi: 4, kmax: Math.max(50, SD.k), title: 'A ノルムの誤差（縦は対数）' });
  drawSelfTest();
}
function drawField(v) {
  img.loadPixels();
  for (let q = 0; q < N * N; q++) {
    let t = Math.max(-1, Math.min(1, v[q] / 0.9)), o = 4 * (q % N + (N - 1 - Math.floor(q / N)) * N);
    img.pixels[o] = t > 0 ? 20 + 235 * t : 20; img.pixels[o + 1] = 40 + 90 * Math.abs(t); img.pixels[o + 2] = t < 0 ? 70 + 185 * -t : 70 + 30 * t; img.pixels[o + 3] = 255;
  }
  img.updatePixels();
}

function mousePressed() { if (V.inside(mouseX, mouseY)) { x0 = V.toW(mouseX, mouseY); rebuild2d(false); } }
function keyPressed() {
  if (key === UP_ARROW && ki < KAPS.length - 1) { ki++; rebuild2d(true); }
  if (key === DOWN_ARROW && ki > 0) { ki--; rebuild2d(true); }
  if (key >= '1' && key <= '3') { pat = +key; restart(); }
  if (key === RIGHT_ARROW) perFrame = Math.min(16, perFrame * 2);
  if (key === LEFT_ARROW) perFrame = Math.max(1, perFrame / 2);
  if (key === ' ') run = !run;
  if (key === 'r' || key === 'R') restart();
}

function selfTest() {
  let rnd = rngSeed(11), dense = (A) => (v) => A.map((r) => vdot(r, v));
  let orth = (n) => { let Q = []; for (let i = 0; i < n; i++) { let v = [...Array(n)].map(() => 2 * rnd() - 1); for (let q of Q) v = vaxpy(-vdot(v, q), q, v); let l = vlen(v); Q.push(v.map((t) => t / l)); } return Q; };
  let fromEig = (lams) => { let Q = orth(lams.length); return lams.map((_, i) => lams.map((_, j) => lams.reduce((s, l, m) => s + Q[m][i] * l * Q[m][j], 0))); };
  let solveCG = (A, b) => { let Av = dense(A), S = cgInit(Av, b, b.map(() => 0)), D = [], r0 = Math.sqrt(S.rr); while (Math.sqrt(S.rr) > 1e-10 * r0 && S.k < 3 * b.length) { D.push(S.d.slice()); cgStep(S, Av); } return { S, D, Av }; };
  for (let n of [2, 5, 10]) {
    let A = fromEig([...Array(n)].map(() => 1 + 9 * rnd())), b = [...Array(n)].map(() => rnd() - 0.5), { S, D, Av } = solveCG(A, b), c = 0;
    for (let i = 0; i < D.length; i++) for (let j = 0; j < i; j++) c = Math.max(c, Math.abs(vdot(D[i], Av(D[j]))) / Math.sqrt(vdot(D[i], Av(D[i])) * vdot(D[j], Av(D[j]))));
    stOk('n = ' + n + '：CG が ' + S.k + ' 回（≤ n）で解ける・方向が A 直交', S.k <= n && c < 1e-8, 'max |dᵢᵀAdⱼ| (正規化) ' + fmt(c));
  }
  let A3 = fromEig([1, 1, 1, 1, 3, 3, 3, 7, 7, 7]), r3 = solveCG(A3, [...Array(10)].map(() => rnd()));
  stOk('10×10 で固有値が 3 種類だけ → CG は 3 回で終わる', r3.S.k === 3, r3.S.k + ' 回');
  let Q2 = quadFn(30), A2 = Q2.H(), p2 = solvePath((v) => [A2[0][0] * v[0] + A2[0][1] * v[1], A2[1][0] * v[0] + A2[1][1] * v[1]], [-2, 1], true);
  stOk('2 次元（κ = 30）：CG は 2 回で原点（誤差 < 10⁻¹²）', p2.P.length === 3 && vlen(p2.P[2]) < 1e-12 * vlen(p2.P[0]), '誤差 ' + fmt(vlen(p2.P[p2.P.length - 1])));
  for (let n of [30, 100]) {
    let kp = Math.sin((n * Math.PI) / (2 * (n + 1))) ** 2 / Math.sin(Math.PI / (2 * (n + 1))) ** 2, q = (Math.sqrt(kp) - 1) / (Math.sqrt(kp) + 1);
    let ev = (j) => { let v = new Float64Array(n * n); for (let b = 0; b < n; b++) for (let a = 0; a < n; a++) v[b * n + a] = Math.sin((j * (a + 1) * Math.PI) / (n + 1)) * Math.sin((j * (b + 1) * Math.PI) / (n + 1)); return v; };
    let res = (j) => { let v = ev(j), Av = lapMul(n, v), l = 8 * Math.sin((j * Math.PI) / (2 * (n + 1))) ** 2, e = 0; for (let i = 0; i < v.length; i++) e = Math.max(e, Math.abs(Av[i] - l * v[i])); return [l, e]; };
    let [l1, e1] = res(1), [ln, en] = res(n);
    stOk('N = ' + n + '：固有ベクトル sin·sin で Av = λv、λ_max/λ_min = κ の式', e1 < 1e-12 && en < 1e-12 && Math.abs(ln / l1 / kp - 1) < 1e-12, 'κ = ' + fmt(kp, 6));
    let xt = new Float64Array(n * n).map((_, i) => Math.sin(i * 0.37) + ((i * 7) % 13) / 13), b = lapMul(n, xt), Av = (v) => lapMul(n, v), S = cgInit(Av, b, new Float64Array(n * n));
    let eA = () => { let s = 0; for (let i = 0; i < xt.length; i++) s += (S.x[i] - xt[i]) * S.r[i]; return Math.sqrt(Math.max(0, -s)); }, e0 = eA(), okb = true, worst = 0;
    while (S.k < 2000) { cgStep(S, Av); let r = eA() / e0; if (r < 1e-12) break; okb = okb && r <= 2 * q ** S.k; worst = Math.max(worst, r / (2 * q ** S.k)); }
    stOk('N = ' + n + '：CG の ‖e_k‖_A/‖e₀‖_A ≤ 2((√κ−1)/(√κ+1))^k（毎回）', okb, S.k + ' 回で 10⁻¹²、実測 / 上限 の最大 ' + fmt(worst));
  }
  stReport();
}

// ---------- やってみよう ----------
// 1. ↑↓ で κ を変えても、CG（橙）はいつも 2 回。最急降下法（水色）の回数は κ とともに増える
// 2. 正解の絵 2（細かいしま）と 1（なめらかな山）で、CG の誤差の減り方を比べよう。上限は同じ
// 3. CG は ‖e‖_A を減らす方法。残差 ‖r‖（黄）はときどき増えることもある
// 4. N を 50 や 200 にすると κ ≈ (2(N+1)/π)² が変わり、必要な回数は約 N に比例する（√κ に比例）
// 5. 最急降下法は 1500 回でもほとんど進まない。κ ≈ 4000 では (κ−1)/(κ+1) ≈ 0.9995

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
