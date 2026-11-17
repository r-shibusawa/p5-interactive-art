// ============================================
// 10 KKT 条件（不等式制約）
// f = ½(x − c)ᵀQ(x − c) を、4 本の直線の制約 gᵢ(x) = aᵢᵀx − bᵢ ≤ 0 の中で最小にする
//   最小点では −∇f = Σ λᵢ∇gᵢ、λᵢ ≥ 0、λᵢgᵢ = 0（相補性：効いていない制約の λ は 0）
//   解き方：「どの制約が等号か（有効制約）」を全部ためして、KKT 条件を満たすものを選ぶ
// ドラッグ = 目標 c（制約がなければの最小点）/ 1〜4 = 制約をえらぶ / ←→ = 回す / ↑↓ = 平行に動かす
// ============================================

const Q = [[2, 0.6], [0.6, 1]];          // ★ f の形（対称・正定値）
let cons = [[20, 1.6], [110, 1.3], [200, 1.8], [290, 1.2]];   // ★ 制約：法線の角度（度）と bᵢ
let tgt = [2.6, 1.8], sel = 0, V, sol, region;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  V = makeView(16, 74, width * 0.56, height - 124, [0, 0, 4.2]);
  update();
}
function consAB(cs) { return cs.map(([d, b]) => [[Math.cos((d * Math.PI) / 180), Math.sin((d * Math.PI) / 180)], b]); }
function update() { let AB = consAB(cons); sol = solveKKT(AB, tgt); region = polygon(AB); }
const Qi = () => { let d = Q[0][0] * Q[1][1] - Q[0][1] * Q[1][0]; return [[Q[1][1] / d, -Q[0][1] / d], [-Q[1][0] / d, Q[0][0] / d]]; };
const mv = (M, v) => [M[0][0] * v[0] + M[0][1] * v[1], M[1][0] * v[0] + M[1][1] * v[1]];
// 有効制約の組 S（0〜2 本）を全部ためす：S の制約を等号にして解き、実行可能かつ λ ≥ 0 なら KKT 点
function solveKKT(AB, c) {
  let m = AB.length, sets = [[]], best = null, Qv = Qi();
  for (let i = 0; i < m; i++) { sets.push([i]); for (let j = i + 1; j < m; j++) sets.push([i, j]); }
  for (let S of sets) {
    let lam = Array(m).fill(0), x;
    if (S.length === 0) x = c.slice();
    else if (S.length === 1) { let [a, b] = AB[S[0]], Qa = mv(Qv, a); lam[S[0]] = (vdot(a, c) - b) / vdot(a, Qa); x = [c[0] - lam[S[0]] * Qa[0], c[1] - lam[S[0]] * Qa[1]]; }
    else {
      let [a1, b1] = AB[S[0]], [a2, b2] = AB[S[1]], q1 = mv(Qv, a1), q2 = mv(Qv, a2), M = [[vdot(a1, q1), vdot(a1, q2)], [vdot(a2, q1), vdot(a2, q2)]];
      if (Math.abs(M[0][0] * M[1][1] - M[0][1] * M[1][0]) < 1e-12) continue;   // 平行な 2 本
      let l = solve2(M, [vdot(a1, c) - b1, vdot(a2, c) - b2]); lam[S[0]] = l[0]; lam[S[1]] = l[1];
      x = [c[0] - l[0] * q1[0] - l[1] * q2[0], c[1] - l[0] * q1[1] - l[1] * q2[1]];
    }
    let g = AB.map(([a, b]) => vdot(a, x) - b);
    if (Math.max(...g) > 1e-10 || Math.min(...lam) < -1e-10) continue;
    let f = fval(x, c);
    if (!best || f < best.f - 1e-14) best = { x, lam, g, f, S };
  }
  return best;   // null なら実行可能な点がない
}
function fval(x, c) { let d = [x[0] - c[0], x[1] - c[1]]; return 0.5 * vdot(d, mv(Q, d)); }
// 実行可能領域の多角形（大きな正方形を半平面で切っていく）
function polygon(AB, R = 12) {
  let P = [[-R, -R], [R, -R], [R, R], [-R, R]];
  for (let [a, b] of AB) {
    let out = [];
    for (let i = 0; i < P.length; i++) {
      let p = P[i], q = P[(i + 1) % P.length], gp = vdot(a, p) - b, gq = vdot(a, q) - b;
      if (gp <= 0) out.push(p);
      if (gp * gq < 0) { let t = gp / (gp - gq); out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]); }
    }
    P = out; if (!P.length) break;
  }
  return P;
}
// 別の方法（自己テスト用）：c が外なら、多角形の辺の上で f を最小に（各辺は 1 次元の 2 次関数）
function projectByEdges(P, c) {
  if (P.length < 3) return null;
  let inside = P.every((p, i) => { let q = P[(i + 1) % P.length]; return (q[0] - p[0]) * (c[1] - p[1]) - (q[1] - p[1]) * (c[0] - p[0]) >= 0; });
  if (inside) return c.slice();
  let best = null;
  P.forEach((p, i) => { let q = P[(i + 1) % P.length], e = [q[0] - p[0], q[1] - p[1]], Qe = mv(Q, e), s = Math.max(0, Math.min(1, -vdot([p[0] - c[0], p[1] - c[1]], Qe) / vdot(e, Qe))), x = [p[0] + s * e[0], p[1] + s * e[1]];
    if (!best || fval(x, c) < fval(best, c)) best = x; });
  return best;
}

function draw() {
  background(PAL.bg);
  let cx = drawingContext; cx.save(); cx.beginPath(); cx.rect(V.px, V.py, V.pw, V.ph); cx.clip();
  fill(8, 26, 50); noStroke(); rect(V.px, V.py, V.pw, V.ph);
  // 方眼と f の等高線（2 次関数なので楕円をそのまま描く）
  stroke(120, 200, 240, 30); strokeWeight(1);
  for (let k = -4; k <= 4; k++) { let a = V.toS(k, -4), b = V.toS(k, 4), c = V.toS(-6, k), d = V.toS(6, k); line(a[0], V.py, a[0], V.py + V.ph); line(V.px, c[1], V.px + V.pw, c[1]); }
  let e = eig2(Q); noFill();
  for (let lv = 1; lv <= 14; lv++) {
    let r = 0.32 * lv; stroke(110, 215, 250, 120); beginShape();
    for (let i = 0; i <= 72; i++) { let t = (i / 72) * 2 * Math.PI, u = (r * Math.cos(t)) / Math.sqrt(e.l[0]), v = (r * Math.sin(t)) / Math.sqrt(e.l[1]); let s = V.toS(tgt[0] + u * e.v[0][0] + v * e.v[1][0], tgt[1] + u * e.v[0][1] + v * e.v[1][1]); vertex(s[0], s[1]); }
    endShape();
  }
  // 実行可能領域と制約の直線
  if (region.length >= 3) { fill(255, 210, 74, 55); stroke(PAL.ye); strokeWeight(1); beginShape(); for (let p of region) { let s = V.toS(...p); vertex(s[0], s[1]); } endShape(CLOSE); }
  let AB = consAB(cons);
  AB.forEach(([a, b], i) => {
    let p0 = [a[0] * b, a[1] * b], t = [-a[1], a[0]], s1 = V.toS(p0[0] - 9 * t[0], p0[1] - 9 * t[1]), s2 = V.toS(p0[0] + 9 * t[0], p0[1] + 9 * t[1]);
    let act = sol && sol.lam[i] > 1e-9, col = act ? PAL.or : i === sel ? PAL.ink : PAL.dim;
    stroke(col); strokeWeight(i === sel ? 3 : 1.5); line(s1[0], s1[1], s2[0], s2[1]);
    let m = V.toS(p0[0] + 1.2 * t[0], p0[1] + 1.2 * t[1]); noStroke(); fill(col); textSize(16); text('g' + (i + 1), m[0] + 6, m[1] - 6);
  });
  let cs = V.toS(...tgt); noStroke(); fill(PAL.pk); circle(cs[0], cs[1], 12); text('c', cs[0] + 8, cs[1] - 8);
  if (sol) {
    let xs = V.toS(...sol.x), gf = mv(Q, [sol.x[0] - tgt[0], sol.x[1] - tgt[1]]), K = 50;
    arrow(xs[0], xs[1], xs[0] - gf[0] * K, xs[1] + gf[1] * K, PAL.pk, 7);   // −∇f（太いピンク）
    let px = xs[0], py = xs[1];
    sol.S.forEach((i) => { if (sol.lam[i] <= 1e-9) return; let a = AB[i][0], l = sol.lam[i]; arrow(px, py, px + a[0] * l * K, py - a[1] * l * K, PAL.or, 2); px += a[0] * l * K; py -= a[1] * l * K; });
    noStroke(); fill(255); circle(xs[0], xs[1], 12);
  }
  cx.restore();
  hud([['KKT 条件 ── f = ½(x − c)ᵀQ(x − c)、制約 gᵢ = aᵢᵀx − bᵢ ≤ 0（黄色の領域が実行可能）', PAL.ink],
    ['ドラッグ 目標 c　1〜4 制約をえらぶ（いま g' + (sel + 1) + '）　←→ 回す　↑↓ 平行に動かす', PAL.dim]], 16, 14, 16);
  let x = width * 0.6, y = 90;
  if (!sol) { hud([['実行可能な点がない（制約どうしが矛盾）', PAL.rd]], x, y, 16); drawSelfTest(); return; }
  hud([['最小点 x* = (' + fmt(sol.x[0], 5) + ', ' + fmt(sol.x[1], 5) + ')、f(x*) = ' + fmt(sol.f, 5), PAL.ink], ['ピンク −∇f(x*)、橙 λᵢ∇gᵢ を順につなぐ → 先がぴったり重なる', PAL.dim]], x, y, 15);
  let rows = [['i', 'gᵢ(x*)', 'λᵢ', 'λᵢ·gᵢ', '']].concat(AB.map(([a, b], i) => [String(i + 1), fmt(sol.g[i], 4), fmt(sol.lam[i], 4), fmt(sol.lam[i] * sol.g[i], 2), sol.lam[i] > 1e-9 ? '有効（等号・λ > 0）' : sol.g[i] > -1e-9 ? '等号だが λ = 0' : '効いていない（λ = 0）']));
  rows.forEach((r, j) => r.forEach((s, k) => { noStroke(); fill(j === 0 ? PAL.dim : sol.lam[j - 1] > 1e-9 ? PAL.or : PAL.ink); textSize(15); textAlign(LEFT, TOP); text(s, x + [0, 30, 130, 220, 310][k], y + 60 + j * 24); }));
  let gf = mv(Q, [sol.x[0] - tgt[0], sol.x[1] - tgt[1]]), st = [gf[0], gf[1]];
  AB.forEach(([a], i) => { st[0] += sol.lam[i] * a[0]; st[1] += sol.lam[i] * a[1]; });
  hud([['KKT 条件の残差', PAL.ye], ['① 停留：|∇f + Σλᵢ∇gᵢ| = ' + fmt(vlen(st)), PAL.ink], ['② 主実行可能：max gᵢ = ' + fmt(Math.max(...sol.g)) + ' ≤ 0', PAL.ink],
    ['③ 双対実行可能：min λᵢ = ' + fmt(Math.min(...sol.lam)) + ' ≥ 0', PAL.ink], ['④ 相補性：max |λᵢgᵢ| = ' + fmt(Math.max(...sol.lam.map((l, i) => Math.abs(l * sol.g[i])))), PAL.ink],
    ['f が凸・制約が 1 次なので、KKT 条件 ⇔ 最小点', PAL.gr], ['λᵢ = 制約 i を緩めた（bᵢ を増やした）ときの f* の減り方 −df*/dbᵢ', PAL.dim]], x, y + 200, 15);
  drawSelfTest();
}

function mousePressed() { if (V.inside(mouseX, mouseY)) { tgt = V.toW(mouseX, mouseY); update(); } }
function mouseDragged() { mousePressed(); }
function keyPressed() {
  if (key >= '1' && key <= '4') sel = +key - 1;
  if (key === LEFT_ARROW) cons[sel][0] += 5;
  if (key === RIGHT_ARROW) cons[sel][0] -= 5;
  if (key === UP_ARROW) cons[sel][1] = Math.min(4, cons[sel][1] + 0.1);
  if (key === DOWN_ARROW) cons[sel][1] = Math.max(-3, cons[sel][1] - 0.1);
  update();
}

function selfTest() {
  let rnd = rngSeed(5), saveQ = Q.map((r) => r.slice());
  Q[0] = [1, 0]; Q[1] = [0, 1];   // Q = I：(2, 2) を x + y ≤ 1 に射影 → (0.5, 0.5)、λ = 1.5
  let s1 = solveKKT([[[1, 1], 1]], [2, 2]);
  stOk('Q = I、(2,2) を x + y ≤ 1 に射影：x* = (0.5, 0.5)、λ = 1.5', Math.hypot(s1.x[0] - 0.5, s1.x[1] - 0.5) < 1e-14 && Math.abs(s1.lam[0] - 1.5) < 1e-14, 'λ = ' + fmt(s1.lam[0], 6));
  Q[0] = saveQ[0]; Q[1] = saveQ[1];
  let AB = consAB(cons), P = polygon(AB), worst = 0, wdiff = 0, cnt = [0, 0, 0], okLip = true, prev = null;
  for (let n = 0; n < 300; n++) {
    let c = [8 * rnd() - 4, 8 * rnd() - 4], s = solveKKT(AB, c), gf = mv(Q, [s.x[0] - c[0], s.x[1] - c[1]]);
    AB.forEach(([a], i) => { gf[0] += s.lam[i] * a[0]; gf[1] += s.lam[i] * a[1]; });
    worst = Math.max(worst, vlen(gf), Math.max(0, ...s.g), Math.max(0, ...s.lam.map((l) => -l)), ...s.lam.map((l, i) => Math.abs(l * s.g[i])));
    let y = projectByEdges(P, c); wdiff = Math.max(wdiff, Math.hypot(y[0] - s.x[0], y[1] - s.x[1]));
    cnt[s.lam.filter((l) => l > 1e-9).length]++;
  }
  stOk('ランダムな 300 個の c：KKT の 4 条件の残差 ≈ 0', worst < 1e-12, '最大 ' + fmt(worst) + '、有効制約 0/1/2 本 = ' + cnt.join('/'));
  stOk('別の方法（多角形の辺の上で最小化）と一致', wdiff < 1e-9, '最大の差 ' + fmt(wdiff));
  stOk('有効制約が 0 本・1 本・2 本の場合がどれも出る', cnt.every((v) => v > 0));
  for (let k = 0; k <= 200; k++) {   // c を円の上で動かす：有効制約が変わっても x* は連続（‖Δx*‖_Q ≤ ‖Δc‖_Q）
    let t = (k / 200) * 2 * Math.PI, c = [3.5 * Math.cos(t), 3.5 * Math.sin(t)], s = solveKKT(AB, c);
    if (prev) { let dx = [s.x[0] - prev[0][0], s.x[1] - prev[0][1]], dc = [c[0] - prev[1][0], c[1] - prev[1][1]]; okLip = okLip && vdot(dx, mv(Q, dx)) <= vdot(dc, mv(Q, dc)) * (1 + 1e-9); }
    prev = [s.x, c];
  }
  let ws = 0;
  for (let c of [[2.6, 1.8], [-3, 0.5], [0.5, -3.2], [3, -3]]) {   // df*/dbᵢ = −λᵢ（bᵢ を ±h 動かして解き直した差分）
    let s = solveKKT(AB, c), h = 1e-6;
    AB.forEach((_, i) => { let Ap = AB.map(([a, b], j) => [a, b + (i === j ? h : 0)]), Am = AB.map(([a, b], j) => [a, b - (i === j ? h : 0)]); ws = Math.max(ws, Math.abs((solveKKT(Ap, c).f - solveKKT(Am, c).f) / (2 * h) + s.lam[i])); });
  }
  stOk('λᵢ = −df*/dbᵢ（制約を緩めたときの最小値の変化、差分と比べる）', ws < 1e-6, '最大の差 ' + fmt(ws));
  stOk('c を動かすと有効制約が入れかわるが、x* は連続に動く（‖Δx*‖_Q ≤ ‖Δc‖_Q）', okLip);
  stReport();
}

// ---------- やってみよう ----------
// 1. c を領域の中にドラッグ：x* = c、λ は全部 0。外に出すと、どれかの制約が有効になる
// 2. 角（2 本の直線の交点）に x* が来るとき、−∇f は 2 本の法線の間（錐）に入る。λ が 2 つとも正
// 3. ↑↓ で有効な制約の bᵢ を 0.1 動かすと、f* は約 λᵢ × 0.1 だけ変わる（ラグランジュの λ と同じ意味）
// 4. 制約を動かして領域を空にすると「実行可能な点がない」
// 5. Q を [[1, 0], [0, 1]] にすると、x* は c から領域へのふつうの最短点（射影）になる

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
