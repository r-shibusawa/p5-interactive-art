// ============================================
// 11 ペナルティ法と内点法（対数障壁）
// 制約つきの問題 min f(x) = ½(x−c)ᵀQ(x−c)  s.t. aᵢᵀx ≤ bᵢ（4 本の半平面）を、制約なしの問題の列で解く
//   ペナルティ法 f + (1/2μ)Σ max(0, gᵢ)² … 外側から近づく ／ 内点法 f − μΣ log(−gᵢ) … 内側から近づく（中心パス）
//   μ → 0 で x(μ) → x*。誤差は O(μ)（x* で効いている制約の乗数が正 ＝ 狭義相補性 のとき）。各 x(μ) はニュートン法で解く
// ↑↓ = μ / 1 = ペナルティの等高線 / 2 = 障壁の等高線 / 3 = もとの f / クリック = 中心 c を動かす / R = c を戻す
// ============================================

const QM = [[2, 0.5], [0.5, 1]];                                  // ★ f の行列 Q（正定値）
const C0 = [2.5, 2];                                              // ★ f の中心 c（制約がなければここが最小）
const AB = [[1, 1, 2], [-1, 2, 2], [0, -1, 1], [-1, 0, 1]];       // ★ 制約 a₁x + a₂y ≤ b を [a₁, a₂, b] で
const MUS = []; for (let k = 0; k <= 24; k++) MUS.push(4 * Math.pow(2, -k));   // μ の列（半分ずつ小さく）
let CC = C0.slice(), mi = 6, view = 1, V, CI, sol, xb, xp, lamB, logB;
const XIN = [0.3, 0];                                             // 内点法のスタート（制約の内側）

function setup() {
  createCanvas(windowWidth, windowHeight);
  V = makeView(16, 74, width * 0.52, height - 124, [0.9, 0.4, 2.8]);
  selfTest();
  solveAll(); redraw2();
}
function fq(x) { let d = [x[0] - CC[0], x[1] - CC[1]]; return 0.5 * (QM[0][0] * d[0] * d[0] + 2 * QM[0][1] * d[0] * d[1] + QM[1][1] * d[1] * d[1]); }
function gcon(i, x) { return AB[i][0] * x[0] + AB[i][1] * x[1] - AB[i][2]; }
// 障壁つき（'bar'）・ペナルティつき（'pen'）の関数：値 v、勾配 G、ヘッセ行列 H
function merit(kind, mu, x) {
  let d = [x[0] - CC[0], x[1] - CC[1]], v = fq(x), G = [QM[0][0] * d[0] + QM[0][1] * d[1], QM[1][0] * d[0] + QM[1][1] * d[1]], H = [QM[0].slice(), QM[1].slice()];
  for (let i = 0; i < AB.length; i++) {
    let a = AB[i], gi = gcon(i, x), w, h;
    if (kind === 'bar') { if (gi >= 0) return { v: Infinity, G, H }; v -= mu * Math.log(-gi); w = mu / -gi; h = mu / (gi * gi); }
    else if (kind === 'pen') { if (gi <= 0) continue; v += (gi * gi) / (2 * mu); w = gi / mu; h = 1 / mu; }
    else continue;
    G[0] += w * a[0]; G[1] += w * a[1]; H[0][0] += h * a[0] * a[0]; H[0][1] += h * a[0] * a[1]; H[1][0] += h * a[0] * a[1]; H[1][1] += h * a[1] * a[1];
  }
  return { v, G, H };
}
// ダンプ付きニュートン法（障壁では、外に出る点や増える点は t を半分に）。log に通った点をためる
function argmin(kind, mu, x, log) {
  for (let it = 0; it < 200; it++) {
    let M = merit(kind, mu, x), d = solve2(M.H, M.G), dec = vdot(M.G, d), t = 1;
    if (!(dec > 1e-28)) break;
    while (t > 1e-14) {
      let y = [x[0] - t * d[0], x[1] - t * d[1]], vy = merit(kind, mu, y).v;
      if (isFinite(vy) && (dec < 1e-10 || vy <= M.v - 0.25 * t * dec)) break;
      t *= 0.5;
    }
    x = [x[0] - t * d[0], x[1] - t * d[1]];
    if (log) log.push(x);
  }
  return x;
}
// 正確な解：有効な制約の組（0〜2 本）を全部ためし、KKT 条件をみたすものを選ぶ
function exactSol() {
  let m = AB.length, sets = [[]], best = null;
  for (let i = 0; i < m; i++) { sets.push([i]); for (let j = i + 1; j < m; j++) sets.push([i, j]); }
  for (let S of sets) {
    let M = [[QM[0][0], QM[0][1], ...S.map((i) => AB[i][0])], [QM[1][0], QM[1][1], ...S.map((i) => AB[i][1])], ...S.map((i) => [AB[i][0], AB[i][1], ...S.map(() => 0)])];
    let r = [QM[0][0] * CC[0] + QM[0][1] * CC[1], QM[1][0] * CC[0] + QM[1][1] * CC[1], ...S.map((i) => AB[i][2])], s = gaussSolve(M, r);
    if (!s) continue;
    let x = [s[0], s[1]], lam = AB.map(() => 0); S.forEach((i, k) => (lam[i] = s[2 + k]));
    if (lam.some((l) => l < -1e-12) || AB.some((_, i) => gcon(i, x) > 1e-12)) continue;
    if (!best || fq(x) < best.v) best = { x, lam, v: fq(x), S };
  }
  return best;
}
function gaussSolve(M, r) {
  let n = r.length, A = M.map((row, i) => [...row, r[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let i = c + 1; i < n; i++) if (Math.abs(A[i][c]) > Math.abs(A[p][c])) p = i;
    if (Math.abs(A[p][c]) < 1e-12) return null;
    [A[c], A[p]] = [A[p], A[c]];
    for (let i = 0; i < n; i++) if (i !== c) { let f = A[i][c] / A[c][c]; for (let j = c; j <= n; j++) A[i][j] -= f * A[c][j]; }
  }
  return A.map((row, i) => row[n] / row[i]);
}
// 双対関数 q(λ) = min_x f(x) + Σλᵢgᵢ(x)：x̂ = c − Q⁻¹Aᵀλ を入れる
function dualQ(lam) {
  let s = [0, 0]; AB.forEach((a, i) => { s[0] += lam[i] * a[0]; s[1] += lam[i] * a[1]; });
  let d = solve2(QM, s), x = [CC[0] - d[0], CC[1] - d[1]];
  return fq(x) + AB.reduce((t, _, i) => t + lam[i] * gcon(i, x), 0);
}
function solveAll() {
  sol = exactSol(); xb = []; xp = []; lamB = []; logB = [];
  let b = XIN, p = CC.slice();
  for (let mu of MUS) { b = argmin('bar', mu, b, logB); p = argmin('pen', mu, p); xb.push(b); xp.push(p); lamB.push(AB.map((_, i) => mu / -gcon(i, b))); }
}
function redraw2() { let mu = MUS[mi]; CI = contourImage(V, (x, y) => merit(['pen', 'bar', 'f'][view - 1], mu, [x, y]).v); }
function errOf(P) { return P.map((x) => Math.hypot(x[0] - sol.x[0], x[1] - sol.x[1])); }

function draw() {
  background(PAL.bg);
  image(CI, V.px, V.py);
  // 制約の線と、許される領域のふち
  let poly = feasPoly();
  push(); stroke(PAL.ink); strokeWeight(2); fill(255, 255, 255, 18); beginShape(); for (let q of poly) { let s = V.toS(...q); vertex(s[0], s[1]); } endShape(CLOSE); pop();
  drawPath(V, xp.slice(0, mi + 1), PAL.or, 2); drawPath(V, xb.slice(0, mi + 1), PAL.cy, 2);
  let s = V.toS(...sol.x); noFill(); stroke(PAL.gr); strokeWeight(2.5); circle(s[0], s[1], 18);
  s = V.toS(...CC); fill(PAL.ye); noStroke(); circle(s[0], s[1], 10); hud([['c', PAL.ye]], s[0] + 8, s[1] - 8, 14);
  let mu = MUS[mi], ep = errOf(xp), eb = errOf(xb), gap = fq(xb[mi]) - dualQ(lamB[mi]), lp = AB.map((_, i) => Math.max(0, gcon(i, xp[mi])) / mu);
  hud([['ペナルティ法と内点法 ── 等高線：' + ['ペナルティつき f + (1/2μ)Σmax(0,gᵢ)²', '障壁つき f − μΣlog(−gᵢ)（外側は ∞）', 'もとの f'][view - 1], PAL.ink],
    ['↑↓ μ　1 ペナルティ　2 障壁　3 もとの f　クリック 中心 c を動かす　R 戻す', PAL.dim]], 16, 14, 16);
  let x = width * 0.55, w = width - x - 24, L = (v) => v.map((u) => fmt(u)).join(', ');
  hud([['μ = ' + fmt(mu, 4) + '（↑↓ で半分ずつ）', PAL.ink], ['正確な解（有効制約の組を全部ためす）x* = (' + L(sol.x) + ')　λ* = (' + L(sol.lam) + ')', PAL.gr],
    ['● ペナルティ（外側から）x(μ) = (' + L(xp[mi]) + ')　‖x − x*‖ = ' + fmt(ep[mi]), PAL.or],
    ['　乗数の推定 max(0,gᵢ)/μ = (' + L(lp) + ') → λ*', PAL.dim],
    ['● 内点法（内側から）x(μ) = (' + L(xb[mi]) + ')　‖x − x*‖ = ' + fmt(eb[mi]), PAL.cy],
    ['　乗数 λᵢ = μ/(−gᵢ) = (' + L(lamB[mi]) + ')', PAL.dim], ['　双対ギャップ f − q(λ) = ' + fmt(gap, 6) + '（理論 mμ = ' + fmt(AB.length * mu, 6) + '、m = 4）', PAL.dim],
    ['μ を半分にすると誤差は：ペナルティ ×' + (mi ? fmt(ep[mi] / ep[mi - 1], 4) : '—') + '　障壁 ×' + (mi ? fmt(eb[mi] / eb[mi - 1], 4) : '—') + '（O(μ) なら → 0.5）', PAL.ye],
    ['前提：f が強凸、x* で効く制約の乗数 λ* > 0（狭義相補性）', PAL.dim], ['（c を λ* = 0 の境目に動かすと、近づき方が遅くなる）', PAL.dim]], x, 80, 13);
  let ref = MUS.map((m) => (m * ep[ep.length - 1]) / MUS[MUS.length - 1]);
  logPlot(x + 34, 330, w - 40, height - 410, [{ v: ep.slice(0, mi + 1), c: PAL.or, name: 'ペナルティ' }, { v: eb.slice(0, mi + 1), c: PAL.cy, name: '内点法（障壁）' }, { v: ref, c: PAL.dim, name: 'μ に比例（参考）', dash: true }],
    { lo: -8, hi: 1, kmax: MUS.length - 1, xlabel: 'μ = 4·2⁻ᵏ の k（右へ行くほど μ が小さい）', title: '‖x(μ) − x*‖（縦は対数）' });
  drawSelfTest();
}
// 見えている長方形を半平面で切りとる（許される領域の多角形）
function feasPoly() {
  let [x0, y0] = V.toW(V.px, V.py + V.ph), [x1, y1] = V.toW(V.px + V.pw, V.py), P = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  for (let i = 0; i < AB.length; i++) {
    let Q = [];
    for (let k = 0; k < P.length; k++) {
      let a = P[k], b = P[(k + 1) % P.length], ga = gcon(i, a), gb = gcon(i, b);
      if (ga <= 0) Q.push(a);
      if (ga <= 0 !== gb <= 0) { let t = ga / (ga - gb); Q.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]); }
    }
    P = Q;
  }
  return P;
}

function mousePressed() { if (V.inside(mouseX, mouseY)) { CC = V.toW(mouseX, mouseY); solveAll(); redraw2(); } }
function keyPressed() {
  if (key === UP_ARROW && mi > 0) { mi--; redraw2(); }
  if (key === DOWN_ARROW && mi < MUS.length - 1) { mi++; redraw2(); }
  if (key >= '1' && key <= '3') { view = +key; redraw2(); }
  if (key === 'r' || key === 'R') { CC = C0.slice(); solveAll(); redraw2(); }
}

function selfTest() {
  CC = C0.slice(); solveAll();
  let mk = (kind) => ({ f: (x, y) => merit(kind, 0.1, [x, y]).v, g: (x, y) => merit(kind, 0.1, [x, y]).G, H: (x, y) => merit(kind, 0.1, [x, y]).H });
  let eB = derivErr(mk('bar'), [[0, 0], [0.5, 0.6], [-0.5, -0.4]]), eP = derivErr(mk('pen'), [[2.5, 1], [0, 0], [1.5, -1.6]]);
  stOk('障壁・ペナルティつき関数の勾配とヘッセ行列 = 差分', eB.g < 1e-6 && eB.H < 1e-5 && eP.g < 1e-6 && eP.H < 1e-5, '障壁 ' + fmt(eB.g) + ' / ペナルティ ' + fmt(eP.g));
  let kkt = Math.max(...AB.map((_, i) => Math.abs(sol.lam[i] * gcon(i, sol.x)))), st = merit('f', 1, sol.x).G;
  AB.forEach((a, i) => { st[0] += sol.lam[i] * a[0]; st[1] += sol.lam[i] * a[1]; });
  stOk('正確な解 x* = (1.875, 0.125)、λ* = (2.1875, 0, 0, 0)、KKT の残差 ≈ 0', Math.hypot(sol.x[0] - 1.875, sol.x[1] - 0.125) < 1e-12 && Math.abs(sol.lam[0] - 2.1875) < 1e-12 && kkt < 1e-12 && vlen(st) < 1e-12, '相補性 ' + fmt(kkt));
  let gapOk = MUS.every((mu, k) => Math.abs(fq(xb[k]) - dualQ(lamB[k]) - AB.length * mu) < 1e-9 * AB.length * mu);
  stOk('内点法：双対ギャップ f(x(μ)) − q(λ(μ)) = mμ（全部の μ で）', gapOk, 'μ=' + fmt(MUS[8]) + '：' + fmt(fq(xb[8]) - dualQ(lamB[8]), 8) + ' / ' + fmt(4 * MUS[8], 8));
  stOk('内点法：ニュートン法の全部の点が制約の内側（gᵢ < 0）', logB.every((x) => AB.every((_, i) => gcon(i, x) < 0)), logB.length + ' 点');
  let a = AB[0].slice(0, 2), s = vdot(a, solve2(QM, a)), okL = true, okR = true;
  MUS.forEach((mu, k) => { okL = okL && Math.abs(gcon(0, xp[k]) / mu - (2.1875 * s) / (s + mu)) < 1e-9; if (k) okR = okR && Math.abs(errOf(xp)[k] / errOf(xp)[k - 1] - (s + 2 * mu) / (2 * s + 2 * mu)) < 1e-6; });
  let n = MUS.length - 1, ep = errOf(xp), eb = errOf(xb);
  stOk('ペナルティ：乗数の推定 g₁/μ = λ* s/(s+μ)（s = aᵀQ⁻¹a）→ λ*', okL && Math.abs(gcon(0, xp[n]) / MUS[n] - 2.1875) < 1e-5, '最小の μ で ' + fmt(gcon(0, xp[n]) / MUS[n], 8));
  stOk('ペナルティ：2μ → μ で誤差 ×(s+2μ)/(2s+2μ) → 0.5', okR && Math.abs(ep[n] / ep[n - 1] - 0.5) < 1e-3, '実測 ' + fmt(ep[n] / ep[n - 1], 6));
  stOk('内点法：μ を半分 → 誤差 ×0.5（O(μ)）', Math.abs(eb[n] / eb[n - 1] - 0.5) < 0.01, '実測 ' + fmt(eb[n] / eb[n - 1], 6));
  stOk('内点法：λᵢ = μ/(−gᵢ) → λ* = (2.1875, 0, 0, 0)', lamB[n].every((l, i) => Math.abs(l - sol.lam[i]) < 1e-4), fmt(lamB[n][0], 8));
  stReport();
}

// ---------- やってみよう ----------
// 1. ↓ で μ を小さくすると、オレンジ（ペナルティ）は外側から、水色（内点法）は内側から x* に近づく
// 2. 2 の等高線：μ が小さいほど、障壁は制約のふちぎりぎりまで平らになる（壁がうすくなる）
// 3. 双対ギャップ f − q(λ) がいつもちょうど mμ（m = 4）。「あと mμ 以内」と保証つきで止められる
// 4. c を許される領域の中にクリックすると、制約は効かない（λ* = 0）。x(μ) はどう近づく？
// 5. c をちょうど λ* = 0 の境目に置くと狭義相補性がくずれ、障壁の誤差は O(√μ) くらいに遅くなる

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
