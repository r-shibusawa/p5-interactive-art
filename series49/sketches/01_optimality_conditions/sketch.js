// ============================================
// 01 最適性条件 ─ 勾配とヘッセ行列
// 1 次の条件：最小点では ∇f = 0（停留点）。2 次の条件：ヘッセ行列 H の固有値が 両方 > 0 → 極小、両方 < 0 → 極大、正と負 → 鞍点
//   固有値に 0 があると 2 次の条件では決まらない。クリックした点の 2 次近似 m(d) = f + ∇fᵀd + ½dᵀHd を、本当の f と並べて描く
// クリック = 点を選ぶ / N = ニュートン法で ∇f = 0 へ 1 歩 / ←→ = 関数 / A = 停留点を全部表示
// ============================================

const SADDLE = { name: '鞍点 x² − y²', f: (x, y) => x * x - y * y, g: (x, y) => [2 * x, -2 * y], H: () => [[2, 0], [0, -2]], view: [0, 0, 2] };
const MONKEY = { name: 'モンキーサドル x³ − 3xy²', f: (x, y) => x ** 3 - 3 * x * y * y, g: (x, y) => [3 * x * x - 3 * y * y, -6 * x * y], H: (x, y) => [[6 * x, -6 * y], [-6 * y, -6 * x]], view: [0, 0, 1.4] };
const QUART = { name: 'x⁴ + y²', f: (x, y) => x ** 4 + y * y, g: (x, y) => [4 * x ** 3, 2 * y], H: (x) => [[12 * x * x, 0], [0, 2]], view: [0, 0, 1.4] };
let FNS, fi = 0, F, V, CI, P, path = [], crit = [], showAll = true, inset = [];
const ZOOM = 0.22;                     // ★ 右の 2 つの窓の広さ（全体の何倍か）

function setup() {
  createCanvas(windowWidth, windowHeight);
  FNS = [HIMMEL, ROSEN, SADDLE, MONKEY, QUART];
  selfTest();
  pickFn(0);
}
function pickFn(i) {
  fi = i; F = FNS[i];
  if (CI) CI.remove();
  V = makeView(16, 74, width * 0.52, height - 124, F.view); CI = contourImage(V, F.f);
  crit = allCritical(F);
  setPoint([F.view[0] + F.view[2] * 0.33, F.view[1] + F.view[2] * 0.21]);
}
function setPoint(p) {
  P = p; path = [p];
  for (let G of inset) G.remove();
  let s = Math.min(width * 0.2, height - 430), v = [P[0], P[1], F.view[2] * ZOOM], g0 = F.g(...P), H = F.H(...P), f0 = F.f(...P);
  let W1 = makeView(width * 0.55, 350, s, s, v), W2 = makeView(width * 0.55 + s + 24, 350, s, s, v);
  inset = [contourImage(W1, F.f, 14), contourImage(W2, (x, y) => quadModel(f0, g0, H, [x - P[0], y - P[1]]), 14)];
  inset.W = [W1, W2];
}
function quadModel(f0, g, H, d) { return f0 + g[0] * d[0] + g[1] * d[1] + 0.5 * (H[0][0] * d[0] * d[0] + 2 * H[0][1] * d[0] * d[1] + H[1][1] * d[1] * d[1]); }
// 固有値の符号で分類（0 に近い固有値があれば 2 次の条件では決まらない）
function classify(F, p) {
  let l = eig2(F.H(...p)).l, tol = 1e-6 * (1 + Math.abs(l[0]) + Math.abs(l[1]));
  if (Math.abs(l[0]) < tol || Math.abs(l[1]) < tol) return ['判定できない（固有値 0）', PAL.vi, 0];
  return l[0] > 0 ? ['極小', PAL.gr, 1] : l[1] < 0 ? ['極大', PAL.rd, 2] : ['鞍点', PAL.ye, 3];
}
// 格子の点からニュートン法で ∇f = 0 を解き、同じ点をまとめる
function allCritical(F) {
  let out = [], [cx, cy, hw] = F.view;
  for (let i = -6; i <= 6; i++) for (let j = -4; j <= 4; j++) {
    let p = criticalPoint(F, [cx + (hw * i) / 6.3, cy + (hw * 0.6 * j) / 4.2], 80);
    if (p && Math.abs(p[0] - cx) < hw && !out.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < 1e-5)) out.push(p);
  }
  return out;
}

function draw() {
  background(PAL.bg);
  image(CI, V.px, V.py);
  if (showAll) for (let c of crit) { let s = V.toS(...c), [, col] = classify(F, c); noFill(); stroke(col); strokeWeight(2.5); circle(s[0], s[1], 16); }
  drawPath(V, path, PAL.or, 2);
  let g = F.g(...P), H = F.H(...P), e = eig2(H), s = V.toS(...P), gl = vlen(g), [cls, ccol] = classify(F, P), stat = gl < 1e-8 * (1 + Math.abs(F.f(...P)));
  for (let i = 0; i < 2; i++) { let v = e.v[i], r = 46; stroke(e.l[i] > 0 ? PAL.gr : PAL.pk); strokeWeight(2); line(s[0] - v[0] * r, s[1] + v[1] * r, s[0] + v[0] * r, s[1] - v[1] * r); }
  if (!stat) { let r = 70 / gl; arrow(s[0], s[1], s[0] + g[0] * r, s[1] - g[1] * r, PAL.ye, 2.5); arrow(s[0], s[1], s[0] - g[0] * r, s[1] + g[1] * r, PAL.cy, 1.5); }
  hud([['最適性条件 ── ' + F.name, PAL.ink], ['クリック 点を選ぶ　N ニュートン法で ∇f = 0 へ 1 歩　←→ 関数　A 停留点を全部 ' + (showAll ? 'ON' : 'off'), PAL.dim]], 16, 14, 16);
  let x = width * 0.55;
  hud([['点 x = (' + fmt(P[0], 5) + ', ' + fmt(P[1], 5) + ')　f(x) = ' + fmt(F.f(...P), 5), PAL.ink],
    ['∇f = (' + fmt(g[0], 4) + ', ' + fmt(g[1], 4) + ')　‖∇f‖ = ' + fmt(gl, 3), PAL.ye], ['矢印：黄 = ∇f（上り）、水色 = −∇f（いちばん急な下り）', PAL.dim],
    ['H = [[' + fmt(H[0][0], 4) + ', ' + fmt(H[0][1], 4) + '], [' + fmt(H[1][0], 4) + ', ' + fmt(H[1][1], 4) + ']]', PAL.ink],
    ['固有値 λ₁ = ' + fmt(e.l[0], 4) + '、λ₂ = ' + fmt(e.l[1], 4), PAL.ink], ['線：固有ベクトル。緑 = 上に曲がる向き、ピンク = 下に曲がる向き', PAL.dim],
    [stat ? '∇f = 0 の停留点 → 2 次の条件で「' + cls + '」' : '∇f ≠ 0：停留点ではない。近くの形は ' + (cls === '極小' ? 'お椀（凸）' : cls === '極大' ? '山（凹）' : cls === '鞍点' ? '鞍' : '平ら'), stat ? ccol : PAL.dim],
    ['停留点 ' + crit.length + ' 個：' + ['極小', '鞍点', '極大', '判定できない'].map((nm, k) => nm + ' ' + crit.filter((c) => classify(F, c)[2] === [1, 3, 2, 0][k]).length).join('、'), PAL.ink],
    ['円：緑 = 極小、黄 = 鞍点、赤 = 極大、紫 = 判定できない', PAL.dim]], x, 80, 15, 1.38);
  if (inset.W) inset.W.forEach((W, i) => {
    image(inset[i], W.px, W.py); noFill(); stroke(PAL.line); rect(W.px, W.py, W.pw, W.ph);
    let c = W.toS(...P); stroke(PAL.or); strokeWeight(2); circle(c[0], c[1], 9);
    noStroke(); fill(PAL.ink); textSize(14); text(i === 0 ? '本当の f（点のまわり）' : '2 次近似 m(d) = f + ∇fᵀd + ½dᵀHd', W.px, W.py - 8);
  });
  if (inset.W) { let W = inset.W[0], d = W.hw * 0.8, err = Math.abs(F.f(P[0] + d * 0.6, P[1] + d * 0.8) - quadModel(F.f(...P), g, H, [d * 0.6, d * 0.8])); hud([['窓の端（距離 ' + fmt(d, 3) + '）での誤差 |f − m| = ' + fmt(err, 3) + '。距離を半分にすると約 1/8（3 次の項）', PAL.dim]], W.px, W.py + W.ph + 10, 13); }
  drawSelfTest();
}

function mousePressed() { if (V.inside(mouseX, mouseY)) setPoint(V.toW(mouseX, mouseY)); }
function keyPressed() {
  if (key === RIGHT_ARROW) pickFn((fi + 1) % FNS.length);
  if (key === LEFT_ARROW) pickFn((fi + FNS.length - 1) % FNS.length);
  if (key === 'a' || key === 'A') showAll = !showAll;
  if (key === 'n' || key === 'N') {      // ニュートン法：H d = −∇f を解いて x ← x + d（極小とはかぎらず、近くの停留点へ）
    let d = solve2(F.H(...P), F.g(...P)), q = [P[0] - d[0], P[1] - d[1]];
    if (isFinite(q[0] + q[1]) && Math.abs(q[0]) < 1e6 && Math.abs(q[1]) < 1e6) { let keep = path; setPoint(q); path = keep.concat([q]); }
  }
}

function selfTest() {
  FNS = [HIMMEL, ROSEN, SADDLE, MONKEY, QUART];
  for (let F of FNS) { let e = derivErr(F, [[0.37, -0.81], [1.3, 0.6], [-0.9, 1.1]]); stOk(F.name + '：勾配・ヘッセ行列 = 差分', e.g < 1e-6 && e.H < 1e-6, 'g ' + fmt(e.g) + ', H ' + fmt(e.H)); }
  let C = allCritical(HIMMEL), n = [1, 3, 2].map((t) => C.filter((c) => classify(HIMMEL, c)[2] === t).length);
  let mx = C.find((c) => classify(HIMMEL, c)[2] === 2) || [0, 0];
  stOk('ヒンメルブラウ：停留点 9 個 = 極小 4・鞍点 4・極大 1、極小 − 鞍点 + 極大 = 1', C.length === 9 && n[0] === 4 && n[1] === 4 && n[2] === 1 && n[0] - n[1] + n[2] === 1, n.join(' / '));
  stOk('ヒンメルブラウ：極小はすべて f = 0、極大 ≈ (−0.270845, −0.923039)、f ≈ 181.617', C.filter((c) => classify(HIMMEL, c)[2] === 1).every((c) => HIMMEL.f(...c) < 1e-20) && Math.hypot(mx[0] + 0.270845, mx[1] + 0.923039) < 1e-5 && Math.abs(HIMMEL.f(...mx) - 181.617) < 1e-3, '極大 f = ' + fmt(HIMMEL.f(...mx), 7));
  let R = allCritical(ROSEN), HR = ROSEN.H(1, 1);
  stOk('ローゼンブロック：停留点は (1, 1) だけで極小、H = [[802, −400], [−400, 200]]', R.length === 1 && Math.hypot(R[0][0] - 1, R[0][1] - 1) < 1e-9 && classify(ROSEN, R[0])[2] === 1 && HR[0][0] === 802 && HR[0][1] === -400 && HR[1][1] === 200);
  stOk('x² − y²：原点は鞍点', classify(SADDLE, [0, 0])[2] === 3 && allCritical(SADDLE).length === 1);
  let mk = allCritical(MONKEY);
  stOk('モンキーサドル：停留点は原点だけ、H = 0 で判定できない。f(−t, 0) < 0 < f(t, 0) なので極小ではない', mk.length === 1 && classify(MONKEY, mk[0])[2] === 0 && MONKEY.f(-0.1, 0) < 0 && MONKEY.f(0.1, 0) > 0);
  stOk('x⁴ + y²：原点は H = diag(0, 2) で判定できないが、f ≥ 0 = f(0) なので最小', classify(QUART, [0, 0])[2] === 0 && [[0.3, 0], [-0.2, 0.1], [0, -0.4]].every((p) => QUART.f(...p) > 0));
  let p = [1, 1], g = HIMMEL.g(...p), H = HIMMEL.H(...p), f0 = HIMMEL.f(...p), er = (h) => Math.abs(HIMMEL.f(1 + 0.6 * h, 1 + 0.8 * h) - quadModel(f0, g, H, [0.6 * h, 0.8 * h]));
  let ratio = er(0.025) / er(0.05);
  stOk('2 次近似の誤差は距離の 3 乗：距離を半分にすると誤差は約 1/8', Math.abs(ratio - 0.125) < 0.01, '比 ' + fmt(ratio, 4) + '（予測 0.125）');
  let q = solve2(H, g), gm = [g[0] - (H[0][0] * q[0] + H[0][1] * q[1]), g[1] - (H[1][0] * q[0] + H[1][1] * q[1])];
  stOk('ニュートンの 1 歩 d = −H⁻¹∇f は 2 次近似の停留点（∇m(d) = 0）', vlen(gm) < 1e-12 * (1 + vlen(g)));
  stReport();
}

// ---------- やってみよう ----------
// 1. ヒンメルブラウで N を何回か押す。どの停留点に着くかは出発点しだい。鞍点や極大にも着く（ニュートン法は ∇f = 0 を解くだけ）
// 2. 鞍点の近くをクリック：2 次近似の窓は双曲線（鞍）。極小の近くは楕円（お椀）
// 3. モンキーサドルと x⁴ + y² は、どちらも原点の H の固有値に 0 がある。片方は極小、片方はそうでない。2 次の条件だけでは決まらない
// 4. 右の窓の誤差：ZOOM を半分にすると誤差は約 1/8 になる（テイラー展開の 3 次の項）
// 5. ローゼンブロックの (1, 1) の固有値の比 λ₂/λ₁ は約 2500。谷がとても細長い（02 の条件数 κ）

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
