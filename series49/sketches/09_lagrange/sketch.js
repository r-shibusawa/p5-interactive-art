// ============================================
// 09 ラグランジュの未定乗数法
// 曲線 g(x, y) = c の上で f を最小にする。最小点では ∇f と ∇g が平行：∇f = λ∇g（ラグランジュ関数 L = f − λ(g − c)）
//   点を曲線に沿ってドラッグすると、∇f の「曲線に沿った成分」（ピンク）が 0 になる所が最小点
//   λ の意味：制約の値 c を動かしたときの最小値の変化 df*/dc = λ（右のグラフの接線の傾き）
// 1〜4 = 制約の曲線 / F = 関数 f / ↑↓ = c / ドラッグ = 曲線上の点 / スペース = 曲線に沿って下る
// ============================================

let fi = 0, ci = 0, cval, V, CI, tP = 0.5, sliding = false, sol, curvePts = [], fstarGraph = [];
const NS = 600;              // ★ 曲線を何点で調べるか
// 関数 f（値・勾配・ヘッセ行列）と、制約の曲線 g = c（par(t, c) は曲線のパラメータ表示）
const FS = [{ name: 'f = (x−2)² + 2(y−1)² + 0.8xy', f: (x, y) => (x - 2) ** 2 + 2 * (y - 1) ** 2 + 0.8 * x * y, g: (x, y) => [2 * (x - 2) + 0.8 * y, 4 * (y - 1) + 0.8 * x], H: () => [[2, 0.8], [0.8, 4]] },
    { name: 'f = x + 2y', f: (x, y) => x + 2 * y, g: () => [1, 2], H: () => [[0, 0], [0, 0]] }];
const CONS = [
    { name: '円 x² + y² = c', f: (x, y) => x * x + y * y, g: (x, y) => [2 * x, 2 * y], H: () => [[2, 0], [0, 2]], par: (t, c) => [Math.sqrt(c) * Math.cos(t), Math.sqrt(c) * Math.sin(t)], tr: [0, 2 * Math.PI], c0: 4, cmin: 0.1 },
    { name: '楕円 x²/4 + y² = c', f: (x, y) => x * x / 4 + y * y, g: (x, y) => [x / 2, 2 * y], H: () => [[0.5, 0], [0, 2]], par: (t, c) => [2 * Math.sqrt(c) * Math.cos(t), Math.sqrt(c) * Math.sin(t)], tr: [0, 2 * Math.PI], c0: 1, cmin: 0.05 },
    { name: '直線 x + y = c', f: (x, y) => x + y, g: () => [1, 1], H: () => [[0, 0], [0, 0]], par: (t, c) => [t, c - t], tr: [-6, 6], c0: 1, cmin: -4 },
    { name: '波 y − sin x = c', f: (x, y) => y - Math.sin(x), g: (x) => [-Math.cos(x), 1], H: (x) => [[Math.sin(x), 0], [0, 0]], par: (t, c) => [t, Math.sin(t) + c], tr: [-6, 6], c0: 0.5, cmin: -3 }];

function setup() {
  createCanvas(windowWidth, windowHeight);
  cval = CONS[0].c0;
  selfTest();
  rebuild(true);
}
function rebuild(newF) {
  if (newF) { V = makeView(16, 74, width * 0.56, height - 124, [0, 0, 4.5]); CI = contourImage(V, FS[fi].f); }
  let G = CONS[ci];
  curvePts = []; for (let i = 0; i <= NS; i++) curvePts.push(G.par(G.tr[0] + ((G.tr[1] - G.tr[0]) * i) / NS, cval));
  sol = solveLagrange(FS[fi], G, cval);
  fstarGraph = [];
  for (let i = -20; i <= 20; i++) { let c = cval + i * 0.05; if (c < G.cmin) continue; let s = solveLagrange(FS[fi], G, c, sol && sol.z); if (s) fstarGraph.push([c, s.fs]); }
}
// 3×3 の連立方程式（ガウスの消去法）
function solve3(M, r) {
  let A = M.map((row, i) => [...row, r[i]]);
  for (let k = 0; k < 3; k++) {
    let p = k; for (let i = k + 1; i < 3; i++) if (Math.abs(A[i][k]) > Math.abs(A[p][k])) p = i;
    [A[k], A[p]] = [A[p], A[k]];
    for (let i = k + 1; i < 3; i++) { let m = A[i][k] / A[k][k]; for (let j = k; j < 4; j++) A[i][j] -= m * A[k][j]; }
  }
  let x = [0, 0, 0]; for (let i = 2; i >= 0; i--) { let s = A[i][3]; for (let j = i + 1; j < 3; j++) s -= A[i][j] * x[j]; x[i] = s / A[i][i]; }
  return x;
}
// ∇f − λ∇g = 0, g = c を (x, y, λ) のニュートン法で。初期値：曲線を細かく調べて f が最小の点（z0 があればそこから）
function solveLagrange(Fn, G, c, z0) {
  let z = z0;
  if (!z) {
    let best = null;
    for (let i = 0; i <= NS; i++) { let t = G.tr[0] + ((G.tr[1] - G.tr[0]) * i) / NS, p = G.par(t, c), v = Fn.f(...p); if (!best || v < best.v) best = { v, p, i }; }
    if (G.tr[0] < 0 && (best.i < 3 || best.i > NS - 3)) return null;   // 端で最小 → 曲線の上で下限なし
    let gf = Fn.g(...best.p), gg = G.g(...best.p);
    z = [...best.p, vdot(gf, gg) / vdot(gg, gg)];
  }
  for (let k = 0; k < 40; k++) {
    let [x, y, l] = z, gf = Fn.g(x, y), gg = G.g(x, y), Hf = Fn.H(x, y), Hg = G.H(x, y);
    let R = [gf[0] - l * gg[0], gf[1] - l * gg[1], G.f(x, y) - c];
    let J = [[Hf[0][0] - l * Hg[0][0], Hf[0][1] - l * Hg[0][1], -gg[0]], [Hf[1][0] - l * Hg[1][0], Hf[1][1] - l * Hg[1][1], -gg[1]], [gg[0], gg[1], 0]];
    let d = solve3(J, R); z = [x - d[0], y - d[1], l - d[2]];
    if (!z.every(isFinite)) return null;
    if (vlen(d) < 1e-15 * (1 + vlen(z))) break;
  }
  let [x, y, l] = z, gg = G.g(x, y), gf = Fn.g(x, y), Hf = Fn.H(x, y), Hg = G.H(x, y), n = vlen(gg), t = [-gg[1] / n, gg[0] / n];
  let W = [[Hf[0][0] - l * Hg[0][0], Hf[0][1] - l * Hg[0][1]], [Hf[1][0] - l * Hg[1][0], Hf[1][1] - l * Hg[1][1]]];
  let res = Math.hypot(gf[0] - l * gg[0], gf[1] - l * gg[1], G.f(x, y) - c);
  return { z, fs: Fn.f(x, y), res, curv: t[0] * (W[0][0] * t[0] + W[0][1] * t[1]) + t[1] * (W[1][0] * t[0] + W[1][1] * t[1]) };
}
function fstarAt(c, z0) { let s = solveLagrange(FS[fi], CONS[ci], c, z0); return s ? s.fs : NaN; }

function draw() {
  background(PAL.bg);
  image(CI, V.px, V.py);
  let Fn = FS[fi], G = CONS[ci];
  // 曲線
  stroke(PAL.cy); strokeWeight(3); noFill(); beginShape();
  for (let p of curvePts) { let s = V.toS(...p); vertex(Math.max(V.px, Math.min(V.px + V.pw, s[0])), Math.max(V.py, Math.min(V.py + V.ph, s[1]))); }
  endShape();
  // 動かす点
  if (sliding) { let h = 1e-5, a = G.par(tP - h, cval), b = G.par(tP + h, cval), dp = [(b[0] - a[0]) / (2 * h), (b[1] - a[1]) / (2 * h)], p = G.par(tP, cval), gf = Fn.g(...p); tP -= (0.02 * vdot(gf, dp)) / Math.max(1, vdot(dp, dp)); }
  tP = Math.max(G.tr[0], Math.min(G.tr[1], tP));
  let p = G.par(tP, cval), s = V.toS(...p), gf = Fn.g(...p), gg = G.g(...p), n = [gg[0] / vlen(gg), gg[1] / vlen(gg)], gn = vdot(gf, n), tan = [gf[0] - gn * n[0], gf[1] - gn * n[1]];
  let sc = (v) => { let l = vlen(v); return l < 1e-12 ? [0, 0] : [(v[0] / l) * 70, (v[1] / l) * 70]; };
  for (let [v, c] of [[gf, PAL.or], [gg, PAL.cy], [tan, PAL.pk]]) { let a = sc(v); arrow(s[0], s[1], s[0] + a[0], s[1] - a[1], c, 3); }
  noStroke(); fill(255); circle(s[0], s[1], 12);
  if (sol) { let q = V.toS(sol.z[0], sol.z[1]); noFill(); stroke(PAL.gr); strokeWeight(3); circle(q[0], q[1], 22); }
  hud([['ラグランジュの未定乗数法 ── ' + Fn.name + '　制約 ' + G.name + '、c = ' + fmt(cval), PAL.ink],
    ['1〜4 制約　F 関数　↑↓ c　ドラッグ 曲線上の点　スペース 曲線に沿って下る ' + (sliding ? 'ON' : 'off'), PAL.dim]], 16, 14, 16);
  let x = width * 0.6, y = 84;
  hud([['白い点 (' + fmt(p[0]) + ', ' + fmt(p[1]) + ')：f = ' + fmt(Fn.f(...p), 4), PAL.ink], ['橙 ∇f、水色 ∇g（曲線に垂直）、ピンク ∇f の曲線に沿った成分', PAL.dim],
    ['沿った成分の大きさ = ' + fmt(vlen(tan)) + '（0 になる所が候補）', PAL.pk], ['∇f = λ∇g なら λ = ∇f·∇g / |∇g|² = ' + fmt(vdot(gf, gg) / vdot(gg, gg), 4), PAL.ink]], x, y, 15);
  if (sol) {
    let h = 1e-4, fd = (fstarAt(cval + h, sol.z) - fstarAt(cval - h, sol.z)) / (2 * h);
    hud([['ニュートン法で解いた最小点（緑の円）', PAL.gr], ['x* = (' + fmt(sol.z[0], 5) + ', ' + fmt(sol.z[1], 5) + ')、f* = ' + fmt(sol.fs, 6), PAL.ink],
      ['λ = ' + fmt(sol.z[2], 6) + '（L = f − λ(g − c) の約束）', PAL.ye], ['df*/dc（c を ±0.0001 動かして解き直した差分）= ' + fmt(fd, 6), PAL.ye],
      ['残差 |∇f − λ∇g| + |g − c| = ' + fmt(sol.res), PAL.dim], ['2 次の条件：接線方向の ∇²L = ' + fmt(sol.curv, 4) + (sol.curv > 0 ? ' > 0 → 極小' : ' ≤ 0 → 極小ではない'), sol.curv > 0 ? PAL.gr : PAL.rd]], x, y + 100, 15);
    drawFstar(x + 30, y + 330, width - x - 60, height - y - 400);
  } else hud([['この曲線の上では f がどこまでも小さくなる（最小値なし）', PAL.rd]], x, y + 100, 16);
  drawSelfTest();
}
// f*(c) のグラフと、傾き λ の接線
function drawFstar(x, y, w, h) {
  if (fstarGraph.length < 2) return;
  let cs = fstarGraph.map((q) => q[0]), fs = fstarGraph.map((q) => q[1]), c0 = Math.min(...cs), c1 = Math.max(...cs), f0 = Math.min(...fs), f1 = Math.max(...fs) + 1e-9;
  let X = (c) => x + ((c - c0) / (c1 - c0 || 1)) * w, Y = (f) => y + h - ((f - f0) / (f1 - f0)) * h;
  noFill(); stroke(PAL.line); rect(x, y, w, h);
  stroke(PAL.or); strokeWeight(2); beginShape(); for (let [c, f] of fstarGraph) vertex(X(c), Y(f)); endShape();
  let l = sol.z[2], d = (c1 - c0) * 0.3, cx = drawingContext; cx.save(); cx.beginPath(); cx.rect(x, y, w, h); cx.clip();
  stroke(PAL.ye); strokeWeight(1.5); line(X(cval - d), Y(sol.fs - l * d), X(cval + d), Y(sol.fs + l * d)); cx.restore();
  noStroke(); fill(PAL.ye); circle(X(cval), Y(sol.fs), 9);
  fill(PAL.ink); textSize(13); textAlign(LEFT, BOTTOM); text('最小値 f*(c)（橙）と、傾き λ の接線（黄）', x, y - 4);
  textAlign(CENTER, TOP); fill(PAL.dim); text('c', x + w / 2, y + h + 4);
}

function nearestT(mx, my) {
  let G = CONS[ci], best = 1e18, bt = tP;
  for (let i = 0; i <= NS; i++) { let t = G.tr[0] + ((G.tr[1] - G.tr[0]) * i) / NS, s = V.toS(...G.par(t, cval)), d = (s[0] - mx) ** 2 + (s[1] - my) ** 2; if (d < best) { best = d; bt = t; } }
  return bt;
}
function mousePressed() { if (V.inside(mouseX, mouseY)) { tP = nearestT(mouseX, mouseY); sliding = false; } }
function mouseDragged() { if (V.inside(mouseX, mouseY)) tP = nearestT(mouseX, mouseY); }
function keyPressed() {
  if (key >= '1' && key <= '4') { ci = +key - 1; cval = CONS[ci].c0; tP = CONS[ci].tr[0] + 0.3 * (CONS[ci].tr[1] - CONS[ci].tr[0]); rebuild(false); }
  if (key === 'f' || key === 'F') { fi = 1 - fi; rebuild(true); }
  if (key === UP_ARROW) { cval += 0.1; rebuild(false); }
  if (key === DOWN_ARROW) { cval = Math.max(CONS[ci].cmin, cval - 0.1); rebuild(false); }
  if (key === ' ') sliding = !sliding;
}

function selfTest() {
  let save = [fi, ci];
  for (let G of [...FS, ...CONS]) { let e = derivErr(G, [[0.7, -1.2], [-1.5, 0.4]]); stOk(G.name + '：勾配・ヘッセ行列 = 差分', e.g < 1e-6 && e.H < 1e-6, 'g ' + fmt(e.g) + ', H ' + fmt(e.H)); }
  // 閉じた形：x + 2y を x² + y² = r² の上で最小 → x* = −r(1, 2)/√5、λ = −√5/(2r)、f* = −√5 r、df*/dc = λ（c = r²）
  for (let r of [1, 2, 3]) {
    let s = solveLagrange(FS[1], CONS[0], r * r), lam = -Math.sqrt(5) / (2 * r);
    let ok = Math.hypot(s.z[0] + r / Math.sqrt(5), s.z[1] + (2 * r) / Math.sqrt(5)) < 1e-12 && Math.abs(s.z[2] - lam) < 1e-12 && Math.abs(s.fs + Math.sqrt(5) * r) < 1e-12;
    stOk('x + 2y、円 r = ' + r + '：x* = −r(1,2)/√5、λ = −√5/(2r)、f* = −√5r', ok, 'λ 予測 ' + fmt(lam, 6) + ' 計算 ' + fmt(s.z[2], 6));
  }
  // どの制約でも df*/dc（解き直しの差分）= λ、2 次の条件 > 0、∇f ∥ ∇g
  for (let [a, b] of [[0, 0], [0, 1], [0, 2], [0, 3], [1, 0], [1, 1]]) {
    let G = CONS[b], c = G.c0, s = solveLagrange(FS[a], G, c), h = 1e-4;
    fi = a; ci = b;
    let fd = (fstarAt(c + h, s.z) - fstarAt(c - h, s.z)) / (2 * h), gf = FS[a].g(s.z[0], s.z[1]), gg = G.g(s.z[0], s.z[1]), cr = Math.abs(gf[0] * gg[1] - gf[1] * gg[0]) / (vlen(gf) * vlen(gg) + 1e-300);
    stOk(FS[a].name + '、' + G.name + '：df*/dc = λ・∇f ∥ ∇g・接線方向の ∇²L > 0', Math.abs(fd - s.z[2]) < 1e-6 * (1 + Math.abs(s.z[2])) && s.res < 1e-10 && cr < 1e-10 && s.curv > 0, 'λ ' + fmt(s.z[2], 6) + ' 差分 ' + fmt(fd, 6));
  }
  [fi, ci] = save;
  stOk('x + 2y を直線の上で → 最小値なしと判定', solveLagrange(FS[1], CONS[2], 1) === null);
  stReport();
}

// ---------- やってみよう ----------
// 1. 点をドラッグして、ピンクの矢印が消える所を探そう。そこで橙（∇f）と水色（∇g）が同じ直線の上に並ぶ
// 2. ↑↓ で c を 0.1 ずつ動かし、f* の変化 ÷ 0.1 が λ にほぼ等しいことを確かめよう（経済学では「影の価格」）
// 3. 円の上で f = x + 2y（F）：最大点でも ∇f ∥ ∇g。2 次の条件で極小と極大を見分ける
// 4. 波の曲線（4）では ∇f ∥ ∇g になる点がいくつもある。スペースで下ると、どの点に止まるかは始めた場所しだい
// 5. 制約を 2 つ（g₁ = c₁、g₂ = c₂）にすると ∇f = λ₁∇g₁ + λ₂∇g₂。3 次元で考えてみよう

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
