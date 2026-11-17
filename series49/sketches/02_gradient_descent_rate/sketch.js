// ============================================
// 02 最急降下法と条件数
// 2 次関数 f = ½ xᵀAx（A の固有値は μ = 1 と L = κ）を、4 通りのステップ幅で x ← x − t∇f(x)
//   固定 1/L、固定 2/(L+μ)、正確な直線探索、アルミホのバックトラック。κ が大きいほどジグザグになって遅い
//   右の表：1 回の反復で f − f* が何倍になるか（理論の値と、実際に計った値）
// ↑↓ = κ / クリック = 初期点 / W = ワーストケースの初期点 / 1〜4 = 表示 / スペース = 自動 / → = 1 回 / R = 最初から
// ============================================

const KAPS = [1, 2, 3, 5, 10, 20, 50, 100];   // ★ 条件数 κ = L / μ の候補
let ki = 4, F, V, CI, x0 = null, useWorst = true;
const C1 = 0.3, BETA = 0.5;                   // ★ アルミホの定数 c₁（0〜0.5）と、縮める倍率 β
const KMAX = 300;                             // ★ 反復の最大回数
let runs = [], shown = 0, auto = true, vis = [true, true, true, true];
let RULES;

function setup() {
  createCanvas(windowWidth, windowHeight);
  RULES = [{ name: '固定 t = 1/L', col: PAL.cy }, { name: '固定 t = 2/(L+μ)', col: PAL.ye }, { name: '正確な直線探索', col: PAL.or }, { name: 'アルミホ c₁=' + C1 + ' β=' + BETA, col: PAL.pk }];
  selfTest();
  rebuild(true);
}
function rebuild(newFn) {
  F = quadFn(KAPS[ki]);
  if (newFn) { if (CI) CI.remove(); V = makeView(16, 74, width * 0.5, height - 124, F.view); CI = contourImage(V, F.f); }
  if (useWorst || !x0) x0 = worstStart(F, 2.6);
  runs = RULES.map((r, i) => runGD(F, x0, i, KMAX));
  shown = 0;
}
// ワーストケース：固有ベクトルの座標で x₀ ∝ (1/μ, 1/L)。このとき ∇f が 2 つの固有ベクトルと 45°
function worstStart(F, r) {
  let e1 = [Math.cos(F.th), Math.sin(F.th)], e2 = [-e1[1], e1[0]], p = [e1[0] / F.mu + e2[0] / F.L, e1[1] / F.mu + e2[1] / F.L], n = vlen(p);
  return [-r * p[0] / n, -r * p[1] / n];
}
// 最急降下法を K 回（f − f* が 1e−30 より小さくなったら止める）
function runGD(F, p, rule, K) {
  let P = [p], fv = [F.f(...p) - F.fs], gn = [vlen(F.g(...p))];
  for (let k = 0; k < K && fv[k] > 1e-30; k++) {
    let g = F.g(...p), d = [-g[0], -g[1]], t;
    if (rule === 0) t = 1 / F.L;
    else if (rule === 1) t = 2 / (F.L + F.mu);
    else if (rule === 2) { let H = F.H(), Ag = [H[0][0] * g[0] + H[0][1] * g[1], H[1][0] * g[0] + H[1][1] * g[1]]; t = vdot(g, g) / vdot(g, Ag); }   // φ'(t) = 0
    else t = armijo(F, p, d, C1, BETA, 1).t;
    p = [p[0] + t * d[0], p[1] + t * d[1]];
    let f = F.f(...p) - F.fs;
    if (bad(f) || bad(p[0])) { fv.push(NaN); break; }
    P.push(p); fv.push(f); gn.push(vlen(F.g(...p)));
  }
  return { P, fv, gn };
}
// 理論：f(x_{k+1}) − f* ≤ q (f(x_k) − f*) の q と、その前提
function theory(rule, kap) {
  let q = (kap - 1) / (kap + 1);
  return [[(1 - 1 / kap) ** 2, '(1 − 1/κ)²', 'k ≥ 1 で毎回 等号'], [q * q, '((κ−1)/(κ+1))²', '毎回 等号'],
    [q * q, '((κ−1)/(κ+1))²', '上限。W の初期点で等号'], [1 - Math.min(2 * C1, (2 * BETA * C1) / kap), '1 − min(2μc₁, 2βc₁μ/L)', '上限（t₀ = 1 から縮める）']][rule];
}
// 実測：最後の 10 回の比の幾何平均（f − f* が 0 になったら 0）
function measured(fv) {
  let n = fv.length - 1;
  if (n < 1 || !isFinite(fv[n])) return NaN;
  if (fv[n] === 0 || n === 1) return fv[1] / fv[0];
  let a = Math.max(1, n - 10);
  return Math.pow(fv[n] / fv[a], 1 / (n - a));
}
function itersTo(fv, tol) { let k = fv.findIndex((v) => v < tol); return k < 0 ? '> ' + (fv.length - 1) : k; }

function draw() {
  background(PAL.bg);
  image(CI, V.px, V.py);
  let L = Math.max(...runs.map((r) => r.P.length));
  if (auto && frameCount % 2 === 0 && shown < L) shown++;
  runs.forEach((r, i) => { if (vis[i]) drawPath(V, r.P.slice(0, shown + 1), RULES[i].col, 2); });
  let s = V.toS(0, 0); noFill(); stroke(PAL.gr); strokeWeight(2); circle(s[0], s[1], 14);
  // 固有ベクトルの向き（等高線の楕円の軸）
  let e1 = [Math.cos(F.th), Math.sin(F.th)];
  for (let [e, lam] of [[e1, F.mu], [[-e1[1], e1[0]], F.L]]) { let r = 1.2 / Math.sqrt(lam); let a = V.toS(e[0] * r, e[1] * r), b = V.toS(-e[0] * r, -e[1] * r); stroke(255, 255, 255, 60); line(a[0], a[1], b[0], b[1]); }

  hud([['最急降下法と条件数 ── ' + F.name + '（μ = 1, L = ' + F.L + '）', PAL.ink],
    ['↑↓ κ　クリック 初期点　W ワーストケース' + (useWorst ? '（いま）' : '') + '　1〜4 表示　スペース 自動 ' + (auto ? 'ON' : 'off') + '　→ 1 回　R 最初から', PAL.dim]], 16, 14, 16);

  let x = width * 0.53, y = 84, w = width - x - 24;
  hud([['1 回あたり f − f* が何倍か：理論の q と 実測（最後の 10 回の比の平均）', PAL.ink]], x, y, 15);
  runs.forEach((r, i) => {
    let [q, form, note] = theory(i, F.L), m = measured(r.fv), yy = y + 30 + i * 46;
    fill(vis[i] ? RULES[i].col : PAL.line); noStroke(); textSize(15); textAlign(LEFT, TOP);
    text((i + 1) + '. ' + RULES[i].name, x, yy);
    fill(PAL.ink); text('理論 q = ' + form + ' = ' + fmt(q, 4) + '（' + note + '）', x + 12, yy + 20);
    fill(PAL.ye); textAlign(RIGHT, TOP); text('実測 ' + fmt(m, 4) + '　1e−10 まで ' + itersTo(r.fv, 1e-10) + ' 回', x + w, yy);
    textAlign(LEFT, TOP);
  });
  let q = (F.L - 1) / (F.L + 1);
  hud([['‖x − x*‖ で見ると 2/(L+μ) は毎回ちょうど (κ−1)/(κ+1) = ' + fmt(q, 4) + ' 倍。f は 2 乗で効く', PAL.dim]], x, y + 216, 13);
  let sl = (key) => runs.map((r, i) => ({ v: r[key].slice(0, shown + 1), c: RULES[i].col, name: vis[i] ? RULES[i].name : '' })).filter((sr, i) => vis[i]);
  let top = y + 262, ph = (height - top - 40 - 56) / 2;
  logPlot(x + 34, top, w - 40, ph, sl('fv'), { lo: -30, hi: 2, kmax: L - 1, title: 'f(x_k) − f*（縦は対数）' });
  logPlot(x + 34, top + ph + 56, w - 40, ph, sl('gn'), { lo: -15, hi: 2, kmax: L - 1, title: '‖∇f(x_k)‖' });
  drawSelfTest();
}

function mousePressed() {
  if (!V.inside(mouseX, mouseY)) return;
  x0 = V.toW(mouseX, mouseY); useWorst = false; rebuild(false);
}
function keyPressed() {
  if (key === UP_ARROW && ki < KAPS.length - 1) { ki++; rebuild(true); }
  if (key === DOWN_ARROW && ki > 0) { ki--; rebuild(true); }
  if (key === 'w' || key === 'W') { useWorst = true; rebuild(false); }
  if (key >= '1' && key <= '4') vis[+key - 1] = !vis[+key - 1];
  if (key === ' ') auto = !auto;
  if (key === RIGHT_ARROW) shown++;
  if (key === 'r' || key === 'R') shown = 0;
}

function selfTest() {
  let rnd = rngSeed(2), rel = (a, b) => Math.abs(a - b) / Math.max(1e-300, Math.abs(b));
  for (let kap of [4, 10, 50]) {
    let Q = quadFn(kap), q = (kap - 1) / (kap + 1), p0 = [1.3, -0.7];
    let e = derivErr(Q, [[0.3, -1], [2, 1.5]]);
    let r1 = runGD(Q, p0, 1, 40), ok1 = true, okx = true;
    for (let k = 0; k + 1 < r1.fv.length; k++) { ok1 = ok1 && rel(r1.fv[k + 1] / r1.fv[k], q * q) < 1e-9; okx = okx && rel(vlen(r1.P[k + 1]) / vlen(r1.P[k]), q) < 1e-9; }
    let r0 = runGD(Q, p0, 0, 40), ok0 = true;
    for (let k = 1; k + 1 < r0.fv.length; k++) ok0 = ok0 && rel(r0.fv[k + 1] / r0.fv[k], (1 - 1 / kap) ** 2) < 1e-9;
    let rw = runGD(Q, worstStart(Q, 2), 2, 30), okw = true, orth = true;
    for (let k = 0; k + 1 < rw.fv.length; k++) { okw = okw && rel(rw.fv[k + 1] / rw.fv[k], q * q) < 1e-9; let g0 = Q.g(...rw.P[k]), g1 = Q.g(...rw.P[k + 1]); orth = orth && Math.abs(vdot(g0, g1)) < 1e-9 * vlen(g0) * vlen(g1); }
    let okr = true, oka = true, qa = 1 - Math.min(2 * C1, (2 * BETA * C1) / kap);
    for (let n = 0; n < 30; n++) {
      let p = [4 * rnd() - 2, 4 * rnd() - 2], re = runGD(Q, p, 2, 25), ra = runGD(Q, p, 3, 25);
      for (let k = 0; k + 1 < re.fv.length; k++) okr = okr && re.fv[k + 1] / re.fv[k] <= q * q * (1 + 1e-9);
      for (let k = 0; k + 1 < ra.fv.length; k++) oka = oka && ra.fv[k + 1] / ra.fv[k] <= qa * (1 + 1e-9);
    }
    stOk('κ=' + kap + '：勾配・ヘッセ行列 = 差分', e.g < 1e-6 && e.H < 1e-6, 'g ' + fmt(e.g) + ', H ' + fmt(e.H));
    stOk('κ=' + kap + '：t=2/(L+μ) で f の比 = ((κ−1)/(κ+1))²、‖x‖ の比 = (κ−1)/(κ+1)（毎回）', ok1 && okx, '予測 ' + fmt(q * q, 6) + ' 実測 ' + fmt(measured(r1.fv), 6));
    stOk('κ=' + kap + '：t=1/L で f の比 = (1−1/κ)²（k ≥ 1）', ok0, '予測 ' + fmt((1 - 1 / kap) ** 2, 6) + ' 実測 ' + fmt(measured(r0.fv), 6));
    stOk('κ=' + kap + '：正確な直線探索、ワーストケースで比 = ((κ−1)/(κ+1))²・続く勾配が直交', okw && orth, '実測 ' + fmt(measured(rw.fv), 6));
    stOk('κ=' + kap + '：正確な直線探索（30 個の初期点）で比 ≤ ((κ−1)/(κ+1))²', okr);
    stOk('κ=' + kap + '：アルミホで比 ≤ 1 − min(2μc₁, 2βc₁μ/L)（30 個の初期点）', oka, '上限 ' + fmt(qa, 4));
  }
  let Q1 = quadFn(1), ok1 = [0, 1, 2, 3].every((rule) => { let r = runGD(Q1, [1.5, 0.8], rule, 5); return r.fv.length === 2 && r.fv[1] < 1e-28; });
  stOk('κ = 1（等高線が円）ならどの規則も 1 回で最小点', ok1);
  stReport();
}

// ---------- やってみよう ----------
// 1. κ を 1 → 100 にすると、t = 2/(L+μ) の q は 0 → 0.96。1e−10 までの回数は約 κ/4·ln(10¹⁰) に比例して増える
// 2. W（ワーストケース）で正確な直線探索の実測が理論の上限にぴったり一致する。クリックで別の初期点にすると速くなる
// 3. 固有ベクトルの軸（白い線）の上をクリックすると、ジグザグしないで一直線に進む。なぜ？
// 4. C1 と BETA を変えて、アルミホの実測と上限を比べよう（上限はかなり悲観的）
// 5. t を 2/L より大きくすると発散する（runGD の rule 0 を t = 2.1 / F.L にしてみよう）

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
