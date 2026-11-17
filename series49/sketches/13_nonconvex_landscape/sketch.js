// ============================================
// 13 非凸と鞍点
// 谷がいくつもある関数では、勾配法の行き先は初期点しだい。各点から最急降下（アルミホ）を走らせ、どの極小点に着くかで色分け（引き込み領域）
//   停留点（∇f = 0）はニュートン法で全部さがし、ヘッセ行列の固有値の符号で 極小・鞍点・極大 に分ける
//   鞍点にぴったり置くと勾配 0 で止まる。ゆらぎ（N）を入れると転がり落ちる（ゆらぎつき勾配法）
// 1 2 = 関数 / クリック = 粒を落とす / N = ゆらぎ ON/OFF / T = 鞍点に置く / B = 色分け / C = 消す
// ============================================

const T0 = 0.05;            // ★ 直線探索の最初のステップ幅
const MAXSTEP = 0.1;        // ★ 1 歩で動く長さの上限（勾配の流れに沿わせる）
const GTOL = 1e-6;          // ★ ‖∇f‖ がこれより小さければ「止まった」とみなす
const RAD = 0.05;           // ★ ゆらぎの半径（鞍点から逃げるために、ランダムに少し動かす）
const CELL = 6;             // ★ 色分けのます目（px）
let FNS, fi = 0, F, V, CI, BG, crit, mins, cellQ = 0, showB = true, noiseOn = false, parts = [], sadI = 0, rnd;

function setup() {
  createCanvas(windowWidth, windowHeight);
  rnd = rngSeed(13);
  FNS = [HIMMEL, camelFn()];
  selfTest();
  pick(0);
}
// 六こぶラクダ関数 (4 − 2.1x² + x⁴/3)x² + xy + (−4 + 4y²)y²
function camelFn() {
  return { name: '六こぶラクダ', f: (x, y) => (4 - 2.1 * x * x + (x ** 4) / 3) * x * x + x * y + (-4 + 4 * y * y) * y * y,
    g: (x, y) => [8 * x - 8.4 * x ** 3 + 2 * x ** 5 + y, x - 8 * y + 16 * y ** 3], H: (x, y) => [[8 - 25.2 * x * x + 10 * x ** 4, 1], [1, -8 + 48 * y * y]],
    fs: -1.031628453, view: [0, 0, 2.3] };
}
// 停留点を全部さがす：格子の各点からニュートン法、同じ点はまとめ、固有値の符号で分類
function findCritical(F) {
  let out = [], [cx, cy, hw] = F.view;
  for (let i = 0; i <= 30; i++) for (let j = 0; j <= 30; j++) {
    let p = criticalPoint(F, [cx - hw + (2 * hw * i) / 30, cy - hw + (2 * hw * j) / 30]);
    if (!p || Math.abs(p[0] - cx) > hw || Math.abs(p[1] - cy) > hw || out.some((q) => Math.hypot(q.p[0] - p[0], q.p[1] - p[1]) < 1e-5)) continue;
    let e = eig2(F.H(p[0], p[1])).l;
    out.push({ p, f: F.f(p[0], p[1]), l: e, type: e[0] > 0 ? '極小' : e[1] < 0 ? '極大' : '鞍点' });
  }
  return out.sort((a, b) => a.f - b.f);
}
// 最急降下 1 回：t = min(T0, MAXSTEP/‖∇f‖) からアルミホの条件まで半分に
function gdStep(F, p) {
  let g = F.g(p[0], p[1]), gg = g[0] * g[0] + g[1] * g[1], f0 = F.f(p[0], p[1]);
  for (let t = Math.min(T0, MAXSTEP / Math.sqrt(gg)); t > 1e-14; t *= 0.5) { let q = [p[0] - t * g[0], p[1] - t * g[1]]; if (F.f(q[0], q[1]) <= f0 - 1e-4 * t * gg) return q; }
  return p;
}
function descend(F, p, K = 500) { for (let k = 0; k < K; k++) { let g = F.g(p[0], p[1]); if (Math.hypot(g[0], g[1]) < GTOL) break; p = gdStep(F, p); } return p; }
function whichMin(p) { let k = mins.findIndex((m) => Math.hypot(m.p[0] - p[0], m.p[1] - p[1]) < 0.02); return k; }
// ゆらぎつき勾配法の 1 回：勾配がほぼ 0 なら、ゆらす。ゆらしても f が下がらなければ「極小」で終わり
function pgdStep(F, P, useNoise, rr) {
  if (P.done) return;
  let g = F.g(P.p[0], P.p[1]);
  if (Math.hypot(g[0], g[1]) < GTOL) {
    if (!useNoise) { P.done = '止まった'; return; }
    let fp = F.f(P.p[0], P.p[1]);
    if (P.fRef !== undefined && fp > P.fRef - 1e-6) { P.done = '極小'; return; }
    let a = 2 * Math.PI * rr(), r = RAD * Math.sqrt(rr());
    P.fRef = fp; P.p = [P.p[0] + r * Math.cos(a), P.p[1] + r * Math.sin(a)]; P.kicks = (P.kicks || 0) + 1; return;
  }
  P.p = gdStep(F, P.p);
}
function pick(i) {
  fi = i; F = FNS[i]; crit = findCritical(F); mins = crit.filter((c) => c.type === '極小');
  V = makeView(16, 74, width * 0.6, height - 124, F.view); CI = contourImage(V, F.f);
  BG = createGraphics(V.pw, V.ph); BG.pixelDensity(1); BG.noStroke(); cellQ = 0; parts = []; sadI = 0;
}
const BCOL = ['#ff7a2f', '#5fd8f0', '#8de07a', '#ffd24a', '#ff6fa8', '#b79cff'];

function draw() {
  background(PAL.bg);
  // 引き込み領域を少しずつ計算（1 フレーム 6ms まで）
  let nx = Math.ceil(V.pw / CELL), ny = Math.ceil(V.ph / CELL), t0 = millis();
  while (cellQ < nx * ny && millis() - t0 < 6) {
    let i = cellQ % nx, j = Math.floor(cellQ / nx), k = whichMin(descend(F, V.toW(V.px + (i + 0.5) * CELL, V.py + (j + 0.5) * CELL)));
    BG.fill(k < 0 ? '#444' : BCOL[k % BCOL.length]); BG.rect(i * CELL, j * CELL, CELL, CELL); cellQ++;
  }
  image(CI, V.px, V.py);
  if (showB) { tint(255, 85); image(BG, V.px, V.py); noTint(); }
  for (let P of parts) {
    for (let s = 0; s < 2; s++) pgdStep(F, P, noiseOn, rnd);
    P.tr.push(P.p); if (P.tr.length > 300) P.tr.shift();
    drawPath(V, P.tr, P.done === '止まった' ? PAL.rd : PAL.ink, 1.2, false);
  }
  for (let c of crit) {
    let s = V.toS(c.p[0], c.p[1]); stroke(0); strokeWeight(1.5);
    if (c.type === '極小') { fill(BCOL[mins.indexOf(c) % BCOL.length]); stroke(255); strokeWeight(2.5); circle(s[0], s[1], 15); } else if (c.type === '極大') { fill(PAL.rd); triangle(s[0], s[1] - 9, s[0] - 8, s[1] + 6, s[0] + 8, s[1] + 6); } else { fill(PAL.ye); rect(s[0] - 6, s[1] - 6, 12, 12); }
  }
  let nMin = mins.length, nSad = crit.filter((c) => c.type === '鞍点').length, nMax = crit.filter((c) => c.type === '極大').length;
  hud([['非凸と鞍点 ── ' + F.name + '　色 = 最急降下でどの極小点に着くか（計算ずみ ' + Math.floor((100 * cellQ) / (nx * ny)) + '%）', PAL.ink],
    ['1 2 関数　クリック 粒を落とす　N ゆらぎ ' + (noiseOn ? "ON" : "OFF") + '　T 鞍点に置く　B 色分け　C 消す', PAL.dim]], 16, 14, 16);
  let x = width * 0.63, L = [['停留点（∇f = 0 をニュートン法で）：極小 ' + nMin + '・鞍点 ' + nSad + '・極大 ' + nMax, PAL.ink],
    ['極小 − 鞍点 + 極大 = ' + (nMin - nSad + nMax) + '（f が遠くで大きくなる関数なら必ず 1）', PAL.dim], ['種類　位置　f　ヘッセ行列の固有値', PAL.dim]];
  for (let c of crit) L.push([c.type + '　(' + fmt(c.p[0], 4) + ', ' + fmt(c.p[1], 4) + ')　f = ' + fmt(c.f, 5) + '　λ = ' + fmt(c.l[0], 3) + ', ' + fmt(c.l[1], 3), c.type === '極小' ? PAL.gr : c.type === '極大' ? PAL.rd : PAL.ye]);
  let nStop = parts.filter((P) => P.done === '止まった').length, nMinP = parts.filter((P) => P.done === '極小').length;
  L.push(['', PAL.ink], ['粒 ' + parts.length + ' 個：止まった（∇f ≈ 0、ゆらぎなし）' + nStop + '　極小に落ち着いた ' + nMinP, PAL.ink]);
  L.push(['鞍点では ∇f = 0 なので、勾配法は止まってしまう。', PAL.dim], ['少しゆらすと、下り坂（負の固有値の向き）へ転がり落ちる。', PAL.dim]);
  hud(L, x, 80, 14);
  drawSelfTest();
}
function addParts(p, n, spread) { for (let k = 0; k < n && parts.length < 300; k++) { let q = [p[0] + spread * (rnd() - 0.5), p[1] + spread * (rnd() - 0.5)]; parts.push({ p: q, tr: [q] }); } }
function mousePressed() { if (V.inside(mouseX, mouseY)) addParts(V.toW(mouseX, mouseY), 12, 0.3); }
function keyPressed() {
  if (key === '1' || key === '2') pick(+key - 1);
  if (key === 'n' || key === 'N') { noiseOn = !noiseOn; for (let P of parts) if (P.done === '止まった') P.done = undefined; }
  if (key === 't' || key === 'T') { let S2 = crit.filter((c) => c.type === '鞍点'); if (S2.length) { addParts(S2[sadI % S2.length].p, 12, 0); sadI++; } }
  if (key === 'b' || key === 'B') showB = !showB;
  if (key === 'c' || key === 'C') parts = [];
}

function selfTest() {
  let H = HIMMEL, C = camelFn();
  let e1 = derivErr(H, [[1, 2], [-3, 0.5], [2.5, -2]]), e2 = derivErr(C, [[0.3, -0.7], [-1.5, 0.4], [1.8, 1]]);
  stOk('勾配・ヘッセ行列 = 差分（ヒンメルブラウ・ラクダ）', Math.max(e1.g, e1.H, e2.g, e2.H) < 1e-5, fmt(Math.max(e1.g, e1.H, e2.g, e2.H)));
  let cH = findCritical(H), cnt = (cs, t) => cs.filter((c) => c.type === t).length;
  let mx = cH.find((c) => c.type === '極大');
  stOk('ヒンメルブラウ：停留点 9 個 = 極小 4（f = 0）・鞍点 4・極大 1', cH.length === 9 && cnt(cH, '極小') === 4 && cnt(cH, '鞍点') === 4 && cnt(cH, '極大') === 1 && cH.filter((c) => c.type === '極小').every((c) => c.f < 1e-20));
  stOk('ヒンメルブラウの極大点 ≈ (−0.270845, −0.923039)、f ≈ 181.617', mx && Math.hypot(mx.p[0] + 0.270845, mx.p[1] + 0.923039) < 1e-5 && Math.abs(mx.f - 181.617) < 1e-3, mx ? '(' + mx.p.map((v) => v.toFixed(6)) + ')' : '');
  let cC = findCritical(C), gm = cC.filter((c) => c.type === '極小' && Math.abs(c.f + 1.0316285) < 1e-6);
  stOk('ラクダ：最小値 −1.0316 が ±(0.0898, −0.7126) の 2 点', gm.length === 2 && gm.every((c) => Math.abs(Math.abs(c.p[0]) - 0.0898) < 1e-4 && Math.abs(Math.abs(c.p[1]) - 0.7126) < 1e-4), '停留点 ' + cC.length + ' 個');
  stOk('極小 − 鞍点 + 極大 = 1（両方の関数）', cnt(cH, '極小') - cnt(cH, '鞍点') + cnt(cH, '極大') === 1 && cnt(cC, '極小') - cnt(cC, '鞍点') + cnt(cC, '極大') === 1, 'ラクダ ' + cnt(cC, '極小') + ' − ' + cnt(cC, '鞍点') + ' + ' + cnt(cC, '極大'));
  let mH = cH.filter((c) => c.type === '極小');
  stOk('極小点の近くから始めた最急降下は、その極小点に着く（4 つとも）', mH.every((m) => { let q = descend(H, [m.p[0] + 0.05, m.p[1] - 0.03], 2000); return Math.hypot(q[0] - m.p[0], q[1] - m.p[1]) < 1e-6; }));
  let rr = rngSeed(7), okStay = true, okEsc = true;
  for (let s of cH.filter((c) => c.type === '鞍点')) {
    let P = { p: s.p.slice() }; for (let k = 0; k < 100; k++) pgdStep(H, P, false, rr);
    okStay = okStay && P.p[0] === s.p[0] && P.p[1] === s.p[1] && P.done === '止まった';
    for (let n = 0; n < 5; n++) { let Q = { p: s.p.slice() }; for (let k = 0; k < 3000 && !Q.done; k++) pgdStep(H, Q, true, rr); okEsc = okEsc && Q.done === '極小' && H.f(...Q.p) < 1e-10 && H.f(...Q.p) < s.f; }
  }
  stOk('鞍点にぴったり置くと、ふつうの勾配法は 1 歩も動かない（∇f ≈ 0 で停止）', okStay);
  stOk('ゆらぎつき勾配法なら 4 つの鞍点から 5 回ずつ逃げて、極小点（f < 1e−10）に着く', okEsc);
  stReport();
}

// ---------- やってみよう ----------
// 1. 色の境目の近くに粒を落とすと、少しの差で行き先が変わる。境目には鞍点がある
// 2. T で鞍点に粒を置くと赤く止まる。N でゆらぎを入れると 2 つの谷に分かれて落ちていく
// 3. 2 の六こぶラクダで、極小 − 鞍点 + 極大 を数えよう（やっぱり 1）
// 4. T0 を大きく（0.3 など）すると、色分けの模様が変わる。行き先は「ステップ幅の選び方」にもよる
// 5. 極大点のまわりはどの色？ 極大点に置いた粒は、ゆらぎでどこへ行く？

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
