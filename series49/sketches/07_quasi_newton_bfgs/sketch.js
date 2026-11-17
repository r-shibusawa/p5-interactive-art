// ============================================
// 07 準ニュートン法 BFGS
// ヘッセ行列を計算しないで、勾配の変化 y = ∇f(x₊) − ∇f(x) と移動 s = x₊ − x から「近似のヘッセ行列」B を育てる
//   B₊ s = y（セカント条件）を満たすように毎回すこしだけ直す。右下の楕円：B（橙）と本物の ∇²f（水色）
//   同じ関数で 最急降下法（アルミホ）・減衰ニュートン法・BFGS を競走させる
// ←→ = 関数 / クリック = 初期点 / スペース = 自動 / R = 最初から / E = 最後まで
// ============================================

const KMAX = 3000;          // ★ 反復の最大回数
const GTOL = 1e-10;         // ★ ‖∇f‖ がこれより小さくなったら止める
const C1 = 1e-4, BETA = 0.5; // ★ アルミホの定数（3 つの方法で共通）
const STARTS = [[-1.2, 1], [2, 2], [-0.3, -0.9], [-2.6, 1.6]];   // ★ 関数ごとの初期点
let FNS, fi = 0, F, V, CI, x0, runs = [], shown = 0, auto = true, METH;

function setup() {
  createCanvas(windowWidth, windowHeight);
  FNS = [ROSEN, BEALE, HIMMEL, quadFn(20)];
  METH = [{ name: '最急降下法', col: PAL.cy }, { name: '減衰ニュートン法', col: PAL.gr }, { name: 'BFGS', col: PAL.or }];
  selfTest();
  rebuild(true);
}
function rebuild(newFn) {
  F = FNS[fi];
  if (newFn) { V = makeView(16, 74, width * 0.5, height - 124, F.view); CI = contourImage(V, F.f); x0 = STARTS[fi]; }
  runs = METH.map((m, i) => runMethod(F, x0, i));
  shown = 0;
}
// 逆行列の形の BFGS 更新：H₊ = (I − ρsyᵀ) H (I − ρysᵀ) + ρssᵀ、ρ = 1/(yᵀs)（n 次元）
function bfgsInv(H, s, y) {
  let r = 1 / vdot(y, s), Hy = H.map((row) => vdot(row, y)), yHy = vdot(y, Hy);
  return H.map((row, i) => row.map((h, j) => h - r * (Hy[i] * s[j] + s[i] * Hy[j]) + (r * r * yHy + r) * s[i] * s[j]));
}
function inv2(M) { let d = M[0][0] * M[1][1] - M[0][1] * M[1][0]; return [[M[1][1] / d, -M[0][1] / d], [-M[1][0] / d, M[0][0] / d]]; }
// m = 0 最急降下、1 減衰ニュートン（∇²f が正定値でなければ対角をずらす）、2 BFGS。どれもアルミホで t を決める
function runMethod(F, p, m) {
  let g = F.g(...p), Hi = [[1, 0], [0, 1]], P = [p], fv = [F.f(...p) - F.fs], gn = [vlen(g)], Hs = [Hi], nf = 1, ng = 1, nh = 0;
  for (let k = 0; k < KMAX && gn[k] > GTOL; k++) {
    let d;
    if (m === 0) d = [-g[0], -g[1]];
    else if (m === 1) {
      let H = F.H(...p), e = eig2(H), sh = e.l[0] > 1e-8 * Math.max(1, Math.abs(e.l[1])) ? 0 : -e.l[0] + 1e-3 * (1 + Math.abs(e.l[1]));
      d = solve2([[H[0][0] + sh, H[0][1]], [H[1][0], H[1][1] + sh]], g).map((v) => -v); nh++;
    } else d = [-(Hi[0][0] * g[0] + Hi[0][1] * g[1]), -(Hi[1][0] * g[0] + Hi[1][1] * g[1])];
    let A = armijo(F, p, d, C1, BETA, 1); nf += A.tries.length;
    let q = [p[0] + A.t * d[0], p[1] + A.t * d[1]], g2 = F.g(...q); ng++;
    if (m === 2) { let s = [q[0] - p[0], q[1] - p[1]], y = [g2[0] - g[0], g2[1] - g[1]]; if (vdot(s, y) > 1e-12 * vlen(s) * vlen(y)) Hi = bfgsInv(Hi, s, y); }   // sᵀy ≤ 0 なら更新しない
    p = q; g = g2;
    let f = F.f(...p) - F.fs;
    if (bad(f) || bad(p[0]) || bad(p[1])) { fv.push(NaN); break; }
    P.push(p); fv.push(Math.max(f, 0)); gn.push(vlen(g)); Hs.push(Hi);
  }
  return { P, fv, gn, Hs, nf, ng, nh };
}
// 楕円 { d : dᵀ M d = 1 } の点（M が正定値のときだけ）
function ellipsePts(M) {
  let e = eig2(M); if (!(e.l[0] > 0)) return null;
  let pts = [];
  for (let i = 0; i <= 64; i++) { let a = (i / 64) * 2 * Math.PI, c = Math.cos(a) / Math.sqrt(e.l[0]), s = Math.sin(a) / Math.sqrt(e.l[1]); pts.push([c * e.v[0][0] + s * e.v[1][0], c * e.v[0][1] + s * e.v[1][1]]); }
  return pts;
}

function draw() {
  background(PAL.bg);
  image(CI, V.px, V.py);
  let L = Math.max(...runs.map((r) => r.P.length));
  if (auto && frameCount % 3 === 0 && shown < L) shown += Math.max(1, Math.floor(shown * 0.04));
  runs.forEach((r, i) => drawPath(V, r.P.slice(0, shown + 1), METH[i].col, 2));
  for (let q of F.xs) { let s = V.toS(...q); noFill(); stroke(PAL.gr); strokeWeight(2); circle(s[0], s[1], 14); }
  hud([['準ニュートン法 BFGS ── ' + F.name + '（f* = ' + fmt(F.fs) + '）', PAL.ink],
    ['←→ 関数　クリック 初期点　スペース 自動 ' + (auto ? 'ON' : 'off') + '　R 最初から　E 最後まで　（どれもアルミホ c₁=' + C1 + ', β=' + BETA + '、t₀ = 1）', PAL.dim]], 16, 14, 16);

  let x = width * 0.53, y = 84, w = width - x - 24;
  hud([['‖∇f‖ < ' + fmt(GTOL) + ' までの回数（f の計算回数 / 勾配 / ヘッセ行列）', PAL.ink]], x, y, 15);
  runs.forEach((r, i) => {
    let n = r.P.length - 1, done = r.gn[n] <= GTOL, yy = y + 26 + i * 22, last = r.P[n];
    fill(METH[i].col); noStroke(); textSize(15); textAlign(LEFT, TOP);
    text(METH[i].name + '：' + (isFinite(r.fv[r.fv.length - 1]) ? (done ? n + ' 回' : '> ' + n + ' 回') : '発散') + '（' + r.nf + ' / ' + r.ng + ' / ' + r.nh + '）　→ (' + fmt(last[0], 4) + ', ' + fmt(last[1], 4) + ')', x, yy);
  });
  // BFGS の近似ヘッセ行列 B = H⁻¹ と本物の ∇²f を楕円で
  let b = runs[2], j = Math.min(shown, b.P.length - 1), B = inv2(b.Hs[j]), T = F.H(...b.P[j]);
  let eB = ellipsePts(B), eT = ellipsePts(T), cx = x + 90, cy = y + 175, R = 0;
  for (let E of [eB, eT]) if (E) for (let p of E) R = Math.max(R, vlen(p));
  let sc = R > 0 ? 80 / R : 1;
  noFill(); stroke(PAL.line); rect(x, y + 95, 180, 160);
  for (let [E, c] of [[eT, PAL.cy], [eB, PAL.or]]) if (E) { stroke(c); strokeWeight(2); beginShape(); for (let p of E) vertex(cx + p[0] * sc, cy - p[1] * sc); endShape(); }
  let dif = Math.hypot(B[0][0] - T[0][0], B[0][1] - T[0][1], B[1][0] - T[1][0], B[1][1] - T[1][1]) / Math.max(1e-300, Math.hypot(...T[0], ...T[1]));
  let ratio = j >= 2 && b.fv[j - 1] > 0 ? errTo(F, b.P[j]) / errTo(F, b.P[j - 1]) : NaN;
  hud([['BFGS の反復 k = ' + j, PAL.or], ['楕円 { d : dᵀMd = 1 }（同じ縮尺）', PAL.dim], ['橙 = B_k（近似）　水色 = ∇²f(x_k)', PAL.ink],
    [eT ? '' : '∇²f は正定値でない → 水色の楕円なし', PAL.pk], ['‖B_k − ∇²f‖ / ‖∇²f‖ = ' + fmt(dif), PAL.ye],
    ['誤差の比 e_k / e_(k−1) = ' + fmt(ratio) + '（超 1 次なら → 0）', PAL.ye], ['B_k が ∇²f に近づく保証はない（方向 s_k の上だけ）', PAL.dim]], x + 196, y + 98, 14);
  let top = y + 290, ph = (height - top - 40 - 56) / 2, sl = (k) => runs.map((r, i) => ({ v: r[k].slice(0, shown + 1), c: METH[i].col, name: METH[i].name }));
  logPlot(x + 34, top, w - 40, ph, sl('fv'), { lo: -20, kmax: Math.max(10, L - 1), logx: true, title: 'f(x_k) − f*（横も縦も対数）' });
  logPlot(x + 34, top + ph + 56, w - 40, ph, sl('gn'), { lo: -12, kmax: Math.max(10, L - 1), logx: true, title: '‖∇f(x_k)‖' });
  drawSelfTest();
}

function mousePressed() { if (V.inside(mouseX, mouseY)) { x0 = V.toW(mouseX, mouseY); rebuild(false); } }
function keyPressed() {
  if (key === RIGHT_ARROW) { fi = (fi + 1) % FNS.length; rebuild(true); }
  if (key === LEFT_ARROW) { fi = (fi + FNS.length - 1) % FNS.length; rebuild(true); }
  if (key === ' ') auto = !auto;
  if (key === 'r' || key === 'R') shown = 0;
  if (key === 'e' || key === 'E') shown = Math.max(...runs.map((r) => r.P.length));
}

function selfTest() {
  let rnd = rngSeed(7);
  for (let G of [ROSEN, BEALE, HIMMEL]) { let e = derivErr(G, [[-1.2, 1], [0.5, -0.3], [2, 1.5]]); stOk(G.name + '：勾配・ヘッセ行列 = 差分', e.g < 1e-6 && e.H < 1e-6, 'g ' + fmt(e.g) + ', H ' + fmt(e.H)); }
  // セカント条件：H₊y = s と B₊s = y（B₊ = H₊⁻¹）
  let H0 = [[2, 0.3], [0.3, 0.7]], s = [0.4, -1.1], y = [1.3, -0.5], H1 = bfgsInv(H0, s, y), B1 = inv2(H1), Bs = [B1[0][0] * s[0] + B1[0][1] * s[1], B1[1][0] * s[0] + B1[1][1] * s[1]];
  stOk('セカント条件 B₊s = y（ちょうど）', vlen([Bs[0] - y[0], Bs[1] - y[1]]) < 1e-12 * vlen(y), '誤差 ' + fmt(vlen([Bs[0] - y[0], Bs[1] - y[1]])));
  // n 次元 2 次関数 ½xᵀAx − bᵀx を正確な直線探索で：n 回以内に終わり、H_n = A⁻¹
  for (let n of [2, 5, 8]) {
    let M = [...Array(n)].map(() => [...Array(n)].map(() => 2 * rnd() - 1)), A = M.map((r, i) => r.map((_, j) => vdot(M.map((q) => q[i]), M.map((q) => q[j])) + (i === j ? 0.5 : 0)));
    let b = [...Array(n)].map(() => rnd()), xx = Array(n).fill(0), Ax = (v) => A.map((r) => vdot(r, v)), g = Ax(xx).map((v, i) => v - b[i]), g0 = vlen(g);
    let H = A.map((r, i) => r.map((_, j) => (i === j ? 1 : 0))), its = 0;
    while (vlen(g) > 1e-11 * g0 && its < n + 3) {
      let d = H.map((r) => -vdot(r, g)), t = -vdot(g, d) / vdot(d, Ax(d)), sv = d.map((v) => t * v);
      xx = xx.map((v, i) => v + sv[i]); let g2 = Ax(xx).map((v, i) => v - b[i]), yv = g2.map((v, i) => v - g[i]);
      H = bfgsInv(H, sv, yv); g = g2; its++;
    }
    let E = 0; A.forEach((r, i) => H[0].forEach((_, j) => (E = Math.max(E, Math.abs(vdot(r, H.map((q) => q[j])) - (i === j ? 1 : 0))))));
    stOk('n = ' + n + ' の 2 次関数・正確な直線探索：' + its + ' 回（≤ n）で解け、A·H_n = I', its <= n && E < 1e-7, '‖A H_n − I‖max ' + fmt(E));
  }
  let rs = [0, 1, 2].map((i) => runMethod(ROSEN, [-1.2, 1], i)), rb = rs[2], nb = rb.P.length - 1;
  stOk('ローゼンブロック (−1.2, 1)：BFGS が (1, 1) に到達（誤差 < 1e−8）', errTo(ROSEN, rb.P[nb]) < 1e-8, nb + ' 回、誤差 ' + fmt(errTo(ROSEN, rb.P[nb])));
  stOk('ローゼンブロック：減衰ニュートン法も (1, 1)、BFGS は最急降下法より 10 倍以上少ない回数', errTo(ROSEN, rs[1].P[rs[1].P.length - 1]) < 1e-8 && 10 * nb < rs[0].P.length - 1, 'GD > ' + (rs[0].P.length - 1) + ' / Newton ' + (rs[1].P.length - 1) + ' / BFGS ' + nb);
  let rat = []; for (let k = nb - 4; k <= nb; k++) rat.push(errTo(ROSEN, rb.P[k]) / errTo(ROSEN, rb.P[k - 1]));
  stOk('BFGS の最後の数回で誤差の比 e_k/e_(k−1) < 0.1（超 1 次収束のしるし）', Math.min(...rat) < 0.1, '比 ' + rat.map((v) => fmt(v, 2)).join(', '));
  stOk('ヒンメルブラウ・ビールでも BFGS が最小点に到達', [[HIMMEL, 2], [BEALE, 1]].every(([G, i]) => { let r = runMethod(G, STARTS[i], 2); return errTo(G, r.P[r.P.length - 1]) < 1e-7; }));
  stReport();
}

// ---------- やってみよう ----------
// 1. ローゼンブロックの谷の中をクリック。最急降下法は数千回、BFGS は数十回。グラフの横軸は対数
// 2. E で最後まで進め、楕円が重なっていくか見よう。近づくのは「通った方向 s_k の上の曲がり方」だけ
// 3. 2 次関数（κ = 20）では BFGS が数回で終わる。正確な直線探索なら n = 2 回で必ず終わる（自己テスト）
// 4. ヒンメルブラウで初期点を変えると、3 つの方法が別々の最小点へ行くことがある
// 5. bfgsInv の更新をやめる（Hi をずっと単位行列）と、BFGS はただの最急降下法になる

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
