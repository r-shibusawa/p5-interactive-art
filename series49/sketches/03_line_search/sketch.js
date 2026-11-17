// ============================================
// 03 直線探索 ── アルミホの条件とウルフの条件
// 点 x から下り坂の向き d = −∇f(x) に進む。どこまで進むか（ステップ幅 t）を、1 次元の断面 φ(t) = f(x + t d) で決める
//   アルミホ：φ(t) ≤ φ(0) + c₁ t φ'(0)（十分に下がる）　ウルフ：φ'(t) ≥ c₂ φ'(0)（坂がゆるむまで進む）
// 1〜3 = 関数 / クリック = 点 x / ↑↓ = c₁ / ←→ = c₂ / B = β / スペース = その t で 1 歩すすむ / R = 最初から
// ============================================

const C1S = [1e-4, 0.1, 0.3, 0.5], C2S = [0.1, 0.5, 0.9], BETAS = [0.5, 0.2, 0.8];   // ★ c₁・c₂・β の候補
const T0 = 1;                                  // ★ 最初に試すステップ幅
let fi = 0, c1i = 2, c2i = 2, bi = 0, F, V, CI, FNS, x, LS, path = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  FNS = [ROSEN, HIMMEL, quadFn(10)];
  selfTest();
  pick(0);
}
function pick(i) { fi = i; F = FNS[i]; V = makeView(16, 74, width * 0.45, height - 124, F.view); CI = contourImage(V, F.f); x = F.start.slice(); path = [x]; analyse(); }
// 断面 φ(t) と、その微分 φ'(t) = ∇f(x + t d)·d
function lineOf(F, p, d) { return { phi: (t) => F.f(p[0] + t * d[0], p[1] + t * d[1]), dphi: (t) => vdot(F.g(p[0] + t * d[0], p[1] + t * d[1]), d) }; }
// t を 0〜tm で N 等分して、3 つの条件を満たすかを調べる
function scanSets(ln, tm, c1, c2, N) {
  let p0 = ln.phi(0), s0 = ln.dphi(0), S = { t: [], arm: [], weak: [], strong: [], both: [] };
  for (let i = 0; i <= N; i++) {
    let t = (tm * i) / N, p = ln.phi(t), s = ln.dphi(t), a = p <= p0 + c1 * t * s0, w = s >= c2 * s0;
    S.t.push(t); S.arm.push(a); S.weak.push(w); S.strong.push(Math.abs(s) <= c2 * Math.abs(s0)); S.both.push(a && w);
  }
  return S;
}
function intervals(S, key) {
  let out = [], a = null;
  S[key].forEach((v, i) => { if (v && a === null) a = S.t[i]; if (!v && a !== null) { out.push([a, S.t[i - 1]]); a = null; } });
  if (a !== null) out.push([a, S.t[S.t.length - 1]]);
  return out;
}
// ウルフ探索（2 分法）：下がりすぎなら上限 hi、坂がまだ急なら下限 lo を更新
function wolfeSearch(ln, c1, c2, t = 1) {
  let lo = 0, hi = Infinity, p0 = ln.phi(0), s0 = ln.dphi(0), tries = [];
  for (let k = 0; k < 80; k++) {
    tries.push(t);
    if (!(ln.phi(t) <= p0 + c1 * t * s0)) hi = t;
    else if (ln.dphi(t) < c2 * s0) lo = t;
    else return { t, tries, ok: true };
    t = hi < Infinity ? (lo + hi) / 2 : 2 * t;
  }
  return { t, tries, ok: false };
}
function analyse() {
  let g = F.g(...x), d = [-g[0], -g[1]], ln = lineOf(F, x, d), c1 = C1S[c1i], c2 = C2S[c2i];
  let p0 = ln.phi(0), s0 = ln.dphi(0), tm = 1e-9;
  if (!(s0 < -1e-24)) { LS = null; return; }
  while (tm < 1e6 && ln.phi(tm) < p0) tm *= 1.5;   // φ(t) が φ(0) より上に戻るところまで
  tm *= 1.3;
  LS = { d, ln, p0, s0, tm, S: scanSets(ln, tm, c1, c2, 400), bt: armijo(F, x, d, c1, BETAS[bi], T0), wo: wolfeSearch(ln, c1, c2, T0) };
}

function draw() {
  background(PAL.bg);
  image(CI, V.px, V.py);
  drawPath(V, path, PAL.vi, 2);
  let c1 = C1S[c1i], c2 = C2S[c2i];
  hud([['直線探索 ── ' + F.name + '　x = (' + fmt(x[0]) + ', ' + fmt(x[1]) + ')　f − f* = ' + fmt(F.f(...x) - F.fs), PAL.ink],
    ['1〜3 関数　クリック 点　↑↓ c₁ = ' + c1 + '　←→ c₂ = ' + c2 + '　B β = ' + BETAS[bi] + '　スペース 1 歩　R 最初から' + (c1 >= c2 ? '　※ c₁ < c₂ が必要' : ''), c1 >= c2 ? PAL.rd : PAL.dim]], 16, 14, 16);
  let X0 = width * 0.5, w = width - X0 - 24, y0 = 96, h = height * 0.36;
  if (!LS) { hud([['∇f = 0：ここは停留点。進む向きがない', PAL.gr]], X0, y0, 18); drawSelfTest(); return; }
  let { ln, p0, s0, tm, S, bt, wo, d } = LS;
  // 等高線の上：進む直線と、試した点
  let a = V.toS(...x), b = V.toS(x[0] + tm * d[0], x[1] + tm * d[1]);
  stroke(255, 255, 255, 90); strokeWeight(1.5); line(a[0], a[1], b[0], b[1]);
  noStroke(); fill(PAL.pk); for (let [t] of bt.tries) if (t <= tm) { let s = V.toS(x[0] + t * d[0], x[1] + t * d[1]); circle(s[0], s[1], 6); }
  let q = V.toS(x[0] + wo.t * d[0], x[1] + wo.t * d[1]); stroke(255); fill(PAL.vi); circle(q[0], q[1], 11);
  // φ(t) のグラフ
  let ys = S.t.map((t) => ln.phi(t)), lo = Math.min(...ys), hi = p0 + 0.35 * (p0 - lo) + 1e-300;
  let TX = (t) => X0 + (w * t) / tm, TY = (v) => y0 + h - (h * (Math.min(hi, Math.max(lo, v)) - lo)) / (hi - lo);
  fill(8, 26, 50, 230); stroke(PAL.line); strokeWeight(1); rect(X0, y0, w, h);
  noFill(); stroke(PAL.cy); strokeWeight(2.5); beginShape(); S.t.forEach((t, i) => vertex(TX(t), TY(ys[i]))); endShape();
  strokeWeight(1.5); stroke(PAL.dim); drawingContext.setLineDash([5, 5]); beginShape(); for (let i = 0; i <= 40; i++) { let t = (tm * i) / 40; vertex(TX(t), TY(p0 + t * s0)); } endShape(); drawingContext.setLineDash([]);
  stroke(PAL.or); beginShape(); for (let i = 0; i <= 40; i++) { let t = (tm * i) / 40; vertex(TX(t), TY(p0 + c1 * t * s0)); } endShape();
  noStroke(); bt.tries.forEach(([t, f], i) => { if (t <= tm) { fill(PAL.pk); circle(TX(t), TY(f), i === bt.tries.length - 1 ? 13 : 8); } });
  fill(PAL.vi); wo.tries.forEach((t) => { if (t <= tm) circle(TX(t), y0 + h - 6, 6); }); stroke(255); circle(TX(wo.t), TY(ln.phi(wo.t)), 12); noStroke();
  hud([['φ(t) = f(x + t d)', PAL.cy], ['φ(0) + c₁ t φ\'(0)（アルミホの線）', PAL.or], ['φ(0) + t φ\'(0)（接線）', PAL.dim]], X0 + 8, y0 + 6, 13);
  textAlign(CENTER, TOP); fill(PAL.dim); textSize(12); text('0', X0, y0 + h + 3); text(fmt(tm), X0 + w, y0 + h + 3); text('t', X0 + w / 2, y0 + h + 3);
  // 条件を満たす t の区間（帯）
  [['arm', 'アルミホ', PAL.or], ['weak', '弱ウルフ φ\'(t) ≥ c₂φ\'(0)', PAL.ye], ['strong', '強ウルフ |φ\'(t)| ≤ c₂|φ\'(0)|', PAL.gr], ['both', 'アルミホ ＋ 弱ウルフ', PAL.vi]].forEach(([k, nm, c], r) => {
    let yy = y0 + h + 22 + r * 22;
    fill(30, 60, 95); rect(X0, yy, w, 14);
    fill(c); for (let [u, v] of intervals(S, k)) rect(TX(u), yy, Math.max(2, TX(v) - TX(u)), 14);
    textAlign(LEFT, CENTER); textSize(12); fill(PAL.ink); stroke(0); strokeWeight(3); text(nm, X0 + 4, yy + 7); noStroke();
  });
  let yt = y0 + h + 116, bl = bt.tries.map(([t]) => fmt(t)), last = bt.tries[bt.tries.length - 1];
  hud([['バックトラック（t₀ = ' + T0 + ' から β 倍）：' + (bl.length > 5 ? bl.slice(0, 2).join(' → ') + ' → … → ' + bl.slice(-1) : bl.join(' → ')) + '　✓ ' + bl.length + ' 回目', PAL.pk],
    ['   採用 t = ' + fmt(last[0], 4) + '：φ = ' + fmt(last[1], 5) + ' ≤ ' + fmt(p0 + c1 * last[0] * s0, 5), PAL.dim],
    ['ウルフ探索（2 分法）：' + wo.tries.length + ' 回試して t = ' + fmt(wo.t, 4) + (wo.ok ? '　アルミホ ✓ 弱ウルフ ✓' + (Math.abs(ln.dphi(wo.t)) <= c2 * Math.abs(s0) ? ' 強ウルフ ✓' : ' 強ウルフ ✗') : '　見つからない'), PAL.vi]], X0, yt, 14);
  let fv = path.map((p) => F.f(...p) - F.fs), gn = path.map((p) => vlen(F.g(...p)));
  logPlot(X0 + 34, yt + 96, w - 40, height - yt - 146, [{ v: fv, c: PAL.vi, name: 'f − f*' }, { v: gn, c: PAL.cy, name: '‖∇f‖', dash: true }], { kmax: Math.max(5, path.length - 1), title: 'スペースで進んだ点の f − f* と ‖∇f‖（ウルフの t で最急降下）' });
  drawSelfTest();
}

function mousePressed() { if (V.inside(mouseX, mouseY)) { x = V.toW(mouseX, mouseY); path = [x]; analyse(); } }
function keyPressed() {
  if (key >= '1' && key <= '3') pick(+key - 1);
  if (key === UP_ARROW) c1i = (c1i + 1) % C1S.length;
  if (key === DOWN_ARROW) c1i = (c1i + C1S.length - 1) % C1S.length;
  if (key === RIGHT_ARROW) c2i = (c2i + 1) % C2S.length;
  if (key === LEFT_ARROW) c2i = (c2i + C2S.length - 1) % C2S.length;
  if (key === 'b' || key === 'B') bi = (bi + 1) % BETAS.length;
  if (key === ' ' && LS && LS.wo.ok) { let n = [x[0] + LS.wo.t * LS.d[0], x[1] + LS.wo.t * LS.d[1]]; if (!bad(F.f(...n))) { x = n; path.push(x); } }
  if (key === 'r' || key === 'R') { x = F.start.slice(); path = [x]; }
  analyse();
}

function selfTest() {
  let rnd = rngSeed(3), Q = quadFn(10), ok1 = true, ok2 = true, ok3 = true, ok4 = true, ok5 = true, maxe = 0;
  for (let F of [ROSEN, HIMMEL, Q]) for (let n = 0; n < 4; n++) {
    let p = [F.view[0] + (rnd() - 0.5) * F.view[2], F.view[1] + (rnd() - 0.5) * F.view[2]], g = F.g(...p), d = [-g[0], -g[1]], ln = lineOf(F, p, d), t = 0.3 * rnd() / (1 + vlen(g)), h = 1e-6 / (1 + vlen(g));
    maxe = Math.max(maxe, Math.abs(ln.dphi(t) - (ln.phi(t + h) - ln.phi(t - h)) / (2 * h)) / Math.max(1, Math.abs(ln.dphi(t))));
  }
  stOk('φ\'(t) = ∇f(x + t d)·d が差分と一致（3 関数 × 4 点）', maxe < 1e-5, '相対誤差 ' + fmt(maxe));
  for (let n = 0; n < 12; n++) {   // 2 次関数：φ = φ₀ + tφ'₀ + ½at²、t* = −φ'₀ / a
    let p = [4 * rnd() - 2, 4 * rnd() - 2], g = Q.g(...p), d = [-g[0], -g[1]], ln = lineOf(Q, p, d), H = Q.H();
    let aa = vdot(d, [H[0][0] * d[0] + H[0][1] * d[1], H[1][0] * d[0] + H[1][1] * d[1]]), ts = -ln.dphi(0) / aa;
    let c1 = [1e-4, 0.1, 0.3][n % 3], c2 = [0.5, 0.9, 0.7][n % 3], beta = [0.5, 0.2, 0.8][n % 3], tm = 2.5 * ts, N = 2000, dt = 1.01 * tm / N, S = scanSets(ln, tm, c1, c2, N);
    let A = intervals(S, 'arm'), W = intervals(S, 'weak'), SW = intervals(S, 'strong');
    ok1 = ok1 && A.length === 1 && A[0][0] === 0 && Math.abs(A[0][1] - 2 * (1 - c1) * ts) <= dt;
    ok2 = ok2 && W.length === 1 && Math.abs(W[0][0] - (1 - c2) * ts) <= dt && W[0][1] === tm && SW.length === 1 && Math.abs(SW[0][0] - (1 - c2) * ts) <= dt && Math.abs(SW[0][1] - Math.min(tm, (1 + c2) * ts)) <= dt;
    let bt = armijo(Q, p, d, c1, beta, 10), tb = bt.t, ub = 2 * (1 - c1) * ts;
    ok3 = ok3 && tb <= ub * (1 + 1e-12) && tb > beta * ub * (1 - 1e-12);
  }
  stOk('2 次関数：アルミホの区間 = [0, 2(1−c₁)t*]（走査した区間と比較、12 通り）', ok1);
  stOk('2 次関数：弱ウルフ = [(1−c₂)t*, ∞)、強ウルフ = [(1−c₂)t*, (1+c₂)t*]', ok2);
  stOk('2 次関数：バックトラックの t ∈ (β·2(1−c₁)t*, 2(1−c₁)t*]（t₀ = 10）', ok3);
  for (let F of [ROSEN, HIMMEL]) for (let n = 0; n < 8; n++) {
    let p = [F.view[0] + (rnd() - 0.5) * F.view[2], F.view[1] + (rnd() - 0.5) * F.view[2]], g = F.g(...p), d = [-g[0], -g[1]], ln = lineOf(F, p, d);
    if (vlen(g) < 1e-8) continue;
    let wo = wolfeSearch(ln, 1e-4, 0.9, 1), t = wo.t;
    ok4 = ok4 && wo.ok && ln.phi(t) <= ln.phi(0) + 1e-4 * t * ln.dphi(0) && ln.dphi(t) >= 0.9 * ln.dphi(0);
    let bt = armijo(F, p, d, 1e-4, 0.5, 1); ok5 = ok5 && F.f(p[0] + bt.t * d[0], p[1] + bt.t * d[1]) <= ln.phi(0) + 1e-4 * bt.t * ln.dphi(0);
  }
  stOk('ローゼンブロック・ヒンメルブラウ（16 点）：ウルフ探索の t がアルミホと弱ウルフを両方満たす', ok4);
  stOk('同じ 16 点：バックトラックの t がアルミホを満たす', ok5);
  let R = ROSEN, p = R.start.slice(), it = 0;
  for (; it < 20000 && vlen(R.g(...p)) > 1e-6; it++) { let g = R.g(...p), d = [-g[0], -g[1]], wo = wolfeSearch(lineOf(R, p, d), 1e-4, 0.9, 1); p = [p[0] + wo.t * d[0], p[1] + wo.t * d[1]]; }
  stOk('ウルフの t で最急降下：ローゼンブロックでも (1, 1) に着く（遅いけれど）', errTo(R, p) < 1e-3, it + ' 回、誤差 ' + fmt(errTo(R, p)));
  stReport();
}

// ---------- やってみよう ----------
// 1. ローゼンブロックでは ∇f が大きいので t は 0.001 くらい。t₀ = 1 からのバックトラックは何回縮める？
// 2. c₁ を 0.5 にすると、2 次関数ではちょうど t* までしか許されない（2(1−c₁)t* = t*）
// 3. c₂ を 0.1 にすると強ウルフの区間がせまくなり、ほぼ「正確な直線探索」になる
// 4. スペースを何回も押して、ローゼンブロックの谷をジグザグに進むのを見よう（06・07 の方法と比べる）
// 5. c₁ ≥ c₂ にすると、両方の条件を満たす t がなくなることがある（帯の紫が消える）

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
