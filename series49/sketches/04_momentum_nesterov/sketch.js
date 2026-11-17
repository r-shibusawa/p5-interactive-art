// ============================================
// 04 慣性項とネステロフの加速
// 最急降下法（GD）に「勢い」をつける。重い球（ヘビーボール）：x ← x − α∇f(x) + β(x − 前の x)
//   ネステロフ：先に勢いで進んだ点 y で勾配を計算する。2 次関数では 1 回あたりの縮み方が 1 − 1/κ → 1 − 1/√κ に
//   3 = たくさんの変数の「鎖」の 2 次関数で、f − f* の上限 O(1/k)（GD）と O(1/k²)（ネステロフ）を比べる
// 1 = 2 次関数 / 2 = log-sum-exp / 3 = 鎖（n 次元）/ ↑↓ = κ / クリック = 初期点 / スペース = 自動 / R = 最初から
// ============================================

const KAPS = [2, 5, 10, 30, 100, 300];   // ★ 条件数 κ の候補
const KMAX = 600;                        // ★ 2 次元での反復回数
const NCH = 150, KCH = 3000;             // ★ 鎖の次元 n と反復回数
let ki = 3, which = 0, F, V, CI, x0, runs = [], shown = 0, auto = true, MC, CH;

function setup() {
  createCanvas(windowWidth, windowHeight);
  MC = [{ name: 'GD（t = 1/L）', col: PAL.cy }, { name: '重い球（ヘビーボール）', col: PAL.pk }, { name: 'ネステロフ', col: PAL.or }];
  selfTest();
  rebuild(true);
}
function rebuild(newFn) {
  if (which === 2) { CH = chainStart(NCH); return; }
  if (newFn) { F = which === 0 ? quadFn(KAPS[ki]) : LSE; V = makeView(16, 74, width * 0.48, height - 124, F.view); CI = contourImage(V, F.f); x0 = which === 0 ? [-2.6 * Math.cos(F.th) - 0.5 * Math.sin(F.th), -2.6 * Math.sin(F.th) + 0.5 * Math.cos(F.th)] : F.start.slice(); }   // 2 次関数：ゆるい谷の向きから
  runs = race(F, x0, KMAX); shown = 0;
}
// μ と L：2 次関数はちょうど 1 と κ。log-sum-exp は L ≤ 10、μ は最小点でのヘッセ行列の小さい固有値（局所的な値）
function muL(F) { return F.mu ? [F.mu, F.L] : [eig2(F.H(...F.xs[0])).l[0], F.L]; }
function params(F) {
  let [mu, L] = muL(F), sk = Math.sqrt(L / mu), q = (sk - 1) / (sk + 1);
  return { mu, L, alpha: 4 / (Math.sqrt(L) + Math.sqrt(mu)) ** 2, beta: q * q, bn: q };
}
// 3 つの方法を同じ初期点から
function race(F, p0, K) {
  let P = params(F), xs = F.xs[0];
  return [0, 1, 2].map((m) => {
    let x = p0.slice(), xp = p0.slice(), R = { P: [x], fv: [F.f(...x) - F.fs], gn: [vlen(F.g(...x))], en: [errTo(F, x)] };
    for (let k = 0; k < K && R.fv[k] > 1e-300; k++) {   // 1e−300 まで（遅い成分の速さを長く測る）
      let xn;
      if (m === 0) { let g = F.g(...x); xn = [x[0] - g[0] / P.L, x[1] - g[1] / P.L]; }
      else if (m === 1) { let g = F.g(...x); xn = [x[0] - P.alpha * g[0] + P.beta * (x[0] - xp[0]), x[1] - P.alpha * g[1] + P.beta * (x[1] - xp[1])]; }
      else { let y = [x[0] + P.bn * (x[0] - xp[0]), x[1] + P.bn * (x[1] - xp[1])], g = F.g(...y); xn = [y[0] - g[0] / P.L, y[1] - g[1] / P.L]; }
      let f = F.f(...xn) - F.fs;
      if (bad(f)) { R.fv.push(NaN); break; }
      xp = x; x = xn; R.P.push(x); R.fv.push(f); R.gn.push(vlen(F.g(...x))); R.en.push(Math.hypot(x[0] - xs[0], x[1] - xs[1]));
    }
    return R;
  });
}
// 反復行列の固有値：x_{k+1} = a x_k − b x_{k−1}（固有値 λ の成分ごと）→ z² − a z + b = 0 の根の絶対値の大きいほう
function rootR(a, b) { let D = a * a - 4 * b; return D >= 0 ? Math.max(Math.abs(a + Math.sqrt(D)), Math.abs(a - Math.sqrt(D))) / 2 : Math.sqrt(b); }
function specRad(m, P, lams) {
  return Math.max(...lams.map((l) => (m === 0 ? Math.abs(1 - l / P.L) : m === 1 ? rootR(1 + P.beta - P.alpha * l, P.beta) : rootR((1 - l / P.L) * (1 + P.bn), (1 - l / P.L) * P.bn))));
}
function closedForm(m, P) { let k = P.L / P.mu, s = Math.sqrt(k); return [[1 - 1 / k, '1 − 1/κ'], [(s - 1) / (s + 1), '(√κ−1)/(√κ+1)'], [1 - 1 / s, '1 − 1/√κ']][m]; }
function lateRate(en, w = 50) { let n = en.length - 1; while (n > 0 && !(en[n] > 1e-250)) n--; w = Math.min(w, Math.floor(n / 2)); return w < 1 ? NaN : Math.pow(en[n] / en[n - w], 1 / w); }

// ---- 鎖の 2 次関数 f(x) = ½ xᵀTx − x₁（T = 三重対角 2, −1）。L = 4、x*ᵢ = 1 − i/(n+1)
function chainGrad(x) { let n = x.length; return x.map((v, i) => 2 * v - (i > 0 ? x[i - 1] : 0) - (i < n - 1 ? x[i + 1] : 0) - (i === 0 ? 1 : 0)); }
function chainGap(x, xs) { let e = x.map((v, i) => v - xs[i]), s = 0; for (let i = 0; i < e.length; i++) s += e[i] * (2 * e[i] - (i > 0 ? e[i - 1] : 0) - (i < e.length - 1 ? e[i + 1] : 0)); return s / 2; }   // f − f* = ½ eᵀTe
function chainStart(n) {
  let xs = Array.from({ length: n }, (_, i) => 1 - (i + 1) / (n + 1)), R2 = vdot(xs, xs), z = new Array(n).fill(0);
  return { n, xs, R2, L: 4, k: 0, gd: z.slice(), x: z.slice(), xp: z.slice(), fg: [chainGap(z, xs)], fn: [chainGap(z, xs)] };
}
function chainIter(C) {   // GD：x ← x − ∇f/L　ネステロフ：y = x_k + (k−1)/(k+2)(x_k − x_{k−1})、x_{k+1} = y − ∇f(y)/L
  let g = chainGrad(C.gd); C.gd = C.gd.map((v, i) => v - g[i] / C.L);
  let k = C.k, m = k >= 1 ? (k - 1) / (k + 2) : 0, y = C.x.map((v, i) => v + m * (v - C.xp[i])), gy = chainGrad(y);
  C.xp = C.x; C.x = y.map((v, i) => v - gy[i] / C.L); C.k++;
  C.fg.push(chainGap(C.gd, C.xs)); C.fn.push(chainGap(C.x, C.xs));
}

function draw() {
  background(PAL.bg);
  hud([[[(F && which === 0 ? F.name : '2 次関数'), 'log-sum-exp（凸）', '鎖の 2 次関数（n = ' + NCH + '、L = 4、x₀ = 0）'][which] + '　── 慣性項とネステロフの加速', PAL.ink],
    ['1 2 次関数　2 log-sum-exp　3 鎖　↑↓ κ　クリック 初期点　スペース 自動 ' + (auto ? 'ON' : 'off') + '　R 最初から', PAL.dim]], 16, 14, 16);
  if (which === 2) { drawChain(); drawSelfTest(); return; }
  image(CI, V.px, V.py);
  let n = Math.max(...runs.map((r) => r.P.length));
  if (auto && shown < n - 1) shown++;
  let cx = drawingContext; cx.save(); cx.beginPath(); cx.rect(V.px, V.py, V.pw, V.ph); cx.clip();   // 枠の外は描かない（重い球は最初に大きく飛び出す）
  runs.forEach((r, i) => drawPath(V, r.P.slice(0, shown + 1), MC[i].col, 2));
  let r = runs[1], k = Math.min(shown, r.P.length - 1);   // 重い球の「速度」 x_k − x_{k−1}
  if (k > 0) { let a = V.toS(...r.P[k]), b = V.toS(r.P[k][0] + 4 * (r.P[k][0] - r.P[k - 1][0]), r.P[k][1] + 4 * (r.P[k][1] - r.P[k - 1][1])); arrow(a[0], a[1], b[0], b[1], PAL.ye, 2); noStroke(); fill(PAL.pk); circle(a[0], a[1], 18); }
  cx.restore();
  let P = params(F), x = width * 0.51, y = 86, w = width - x - 24, lams = which === 0 ? [P.mu, P.L] : null;
  hud([['μ = ' + fmt(P.mu, 4) + (which === 1 ? '（局所）' : '') + '　L = ' + fmt(P.L) + '　κ = ' + fmt(P.L / P.mu, 4) + '　重い球 α = 4/(√L+√μ)² = ' + fmt(P.alpha, 3) + ' β = ' + fmt(P.beta, 3) + '　ネステロフ勢い ' + fmt(P.bn, 3), PAL.dim],
    ['‖x − x*‖ が 1 回に何倍か：式 ／ 反復行列の固有値の絶対値 ／ 実測（最後の 50 回）', PAL.ink]], x, y, 13);
  runs.forEach((R, i) => {
    let [c, s] = closedForm(i, P), yy = y + 46 + i * 24;
    fill(MC[i].col); noStroke(); textSize(14); textAlign(LEFT, TOP); text(MC[i].name, x, yy);
    fill(PAL.ink); text(s + ' = ' + fmt(c, 4) + '　／　' + (lams ? fmt(specRad(i, P, lams), 4) : '（2 次関数でない）') + '　／　実測 ' + fmt(lateRate(R.en), 4), x + 170, yy);
  });
  hud([[which === 0 ? '前提：f は 2 次関数、α・β は μ と L から決めた最適値。重根なので誤差 ∝ k·ρᵏ（実測は少し大きめ）' : '2 次関数ではないので重い球の速さは保証されない（最小点の近くでは 2 次関数に近い）', PAL.dim]], x, y + 122, 12);
  let ph = (height - y - 210) / 2 - 24, sl = (key) => runs.map((R, i) => ({ v: R[key].slice(0, shown + 1), c: MC[i].col, name: MC[i].name }));
  logPlot(x + 34, y + 164, w - 40, ph, sl('fv'), { lo: -80, hi: 4, kmax: n - 1, title: 'f(x_k) − f*' });
  logPlot(x + 34, y + 164 + ph + 48, w - 40, ph, sl('gn'), { lo: -40, hi: 3, kmax: n - 1, title: '‖∇f(x_k)‖' });
  drawSelfTest();
}
function drawChain() {
  let C = CH;
  if (auto) for (let i = 0; i < 10 && C.k < KCH; i++) chainIter(C);
  let x0 = 16, y0 = 120, w = width * 0.46, h = height - 220, bw = w / C.n;
  fill(8, 26, 50, 230); stroke(PAL.line); rect(x0, y0, w, h); noStroke();
  for (let i = 0; i < C.n; i++) {
    let X = x0 + i * bw;
    fill(255, 255, 255, 40); rect(X, y0 + h * (1 - C.xs[i]), bw, h * C.xs[i]);
    fill(PAL.cy); rect(X, y0 + h * (1 - C.gd[i]), bw * 0.45, h * C.gd[i]);
    fill(PAL.or); rect(X + bw * 0.5, y0 + h * (1 - Math.min(1.2, C.x[i])), bw * 0.45, h * Math.min(1.2, C.x[i]));
  }
  hud([['成分 x₁ … x_n（白 = 答え x*、水色 = GD、橙 = ネステロフ）　k = ' + C.k, PAL.ink], ['勾配は隣の成分にしか伝わらない：k 回では x_(k+1) から先がまだ 0（どんな勾配法でも）', PAL.dim]], x0, y0 + h + 10, 13);
  let x = width * 0.51, y = 120, wd = width - x - 30, ks = Array.from({ length: C.k + 1 }, (_, k) => k), B = (fn) => ks.map((k) => (k === 0 ? NaN : fn(k)));
  logPlot(x + 34, y, wd - 40, height - y - 120, [
    { v: C.fg, c: PAL.cy, name: 'GD f − f*' }, { v: C.fn, c: PAL.or, name: 'ネステロフ (k−1)/(k+2)' },
    { v: B((k) => (C.L * C.R2) / (2 * k)), c: PAL.cy, name: '上限 L‖x₀−x*‖²/(2k)', dash: true }, { v: B((k) => (2 * C.L * C.R2) / (k + 1) ** 2), c: PAL.or, name: '上限 2L‖x₀−x*‖²/(k+1)²', dash: true }],
    { logx: true, kmax: KCH, lo: -8, hi: 3, title: '両対数グラフ：f(x_k) − f*（凸・L-平滑なら、どの k でも上限以下）' });
  hud([['前提：f は凸で ∇f が L-リプシッツ（強凸は仮定しない）。2 次元の強凸な例では上限は見えない', PAL.dim]], x, height - 70, 12);
}

function mousePressed() { if (which < 2 && V.inside(mouseX, mouseY)) { x0 = V.toW(mouseX, mouseY); rebuild(false); } }
function keyPressed() {
  if (key >= '1' && key <= '3') { which = +key - 1; rebuild(true); }
  if (key === UP_ARROW && ki < KAPS.length - 1) { ki++; if (which === 0) rebuild(true); }
  if (key === DOWN_ARROW && ki > 0) { ki--; if (which === 0) rebuild(true); }
  if (key === ' ') auto = !auto;
  if (key === 'r' || key === 'R') rebuild(false);
}

function selfTest() {
  let rel = (a, b) => Math.abs(a - b) / b;
  for (let F of [quadFn(10), LSE]) { let e = derivErr(F, [[0.4, -0.3], [-1.1, 0.8], [1.5, 0.2]]); stOk(F.name + '：勾配・ヘッセ行列 = 差分', e.g < 1e-6 && e.H < 1e-5, 'g ' + fmt(e.g) + ', H ' + fmt(e.H)); }
  for (let kap of [10, 100]) {
    let Q = quadFn(kap), P = params(Q), R = race(Q, [-2.2, 1.7], 1500), lams = [1, kap];
    let txt = [], okc = true, okm = true;
    for (let m = 0; m < 3; m++) {
      let c = closedForm(m, P)[0], sr = specRad(m, P, lams), me = lateRate(R[m].en);
      okc = okc && rel(sr, c) < 1e-6; okm = okm && rel(me, sr) < (m === 0 ? 1e-9 : 0.01);
      txt.push(['GD', '重い球', 'ネステロフ'][m] + ' 式 ' + fmt(c, 5) + ' 固有値 ' + fmt(sr, 5) + ' 実測 ' + fmt(me, 5));
    }
    stOk('κ=' + kap + '：式 = 反復行列の固有値の絶対値（1−1/κ、(√κ−1)/(√κ+1)、1−1/√κ）', okc);
    stOk('κ=' + kap + '：実測の ‖x‖ の比 = 固有値の絶対値（GD 1e−9、重根の 2 つは 1%）', okm, txt.join('; '));
    let q = 1 - 1 / Math.sqrt(kap), c0 = R[2].fv[0] + 0.5 * Math.hypot(-2.2, 1.7) ** 2, okb = R[2].fv.every((v, k) => v <= q ** k * c0 * (1 + 1e-9) + 1e-300);
    stOk('κ=' + kap + '：ネステロフ f − f* ≤ (1−1/√κ)ᵏ (f₀ − f* + μ/2‖x₀−x*‖²)（どの k でも）', okb);
  }
  let C = chainStart(NCH), okg = true, okn = true;
  for (let k = 1; k <= 1000; k++) { chainIter(C); okg = okg && C.fg[k] <= (C.L * C.R2) / (2 * k); okn = okn && C.fn[k] <= (2 * C.L * C.R2) / (k + 1) ** 2; }
  let gx = chainGrad(C.xs);
  stOk('鎖：x*ᵢ = 1 − i/(n+1) で ∇f = 0', Math.max(...gx.map(Math.abs)) < 1e-12);
  stOk('鎖（n = ' + NCH + '）：GD f − f* ≤ L‖x₀−x*‖²/(2k)（k = 1…1000）', okg, 'k=1000: ' + fmt(C.fg[1000]) + ' ≤ ' + fmt((C.L * C.R2) / 2000));
  stOk('鎖：ネステロフ f − f* ≤ 2L‖x₀−x*‖²/(k+1)²（k = 1…1000）', okn, 'k=1000: ' + fmt(C.fn[1000]) + ' ≤ ' + fmt((2 * C.L * C.R2) / 1001 ** 2));
  let C2 = chainStart(NCH); for (let k = 0; k < 20; k++) chainIter(C2);
  stOk('鎖：20 回では x₂₁ から先はまだ 0（勾配は 1 回に 1 つ隣にしか伝わらない）', C2.gd.slice(20).every((v) => v === 0) && C2.x.slice(20).every((v) => v === 0));
  let L = race(LSE, LSE.start, 600);
  stOk('log-sum-exp：3 つとも最小点 (−ln2/2, 0) に着く', L.every((r) => r.en[r.en.length - 1] < 1e-8));
  stReport();
}

// ---------- やってみよう ----------
// 1. κ = 300 にすると、GD はほとんど進まないのに重い球とネステロフは速い。1−1/κ と 1−1/√κ の差
// 2. 黄色の矢印は重い球の速度。谷底を行ったり来たり（振動）しながら進む
// 3. 2（log-sum-exp）では μ は局所的な値なので、理論の保証はない。それでも速い？
// 4. 3（鎖）は「どんな勾配法でもこれ以上速くできない」ネステロフの例。上限の点線と実測を比べよう
// 5. params の beta を 0.99 にすると重い球はどうなる？（大きすぎる勢いは振動して遅くなる）

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
