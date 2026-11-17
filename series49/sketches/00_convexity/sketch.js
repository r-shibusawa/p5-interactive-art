// ============================================
// 00 凸関数と凸集合
// 凸関数 ⇔ グラフの上の部分（エピグラフ）が凸集合 ⇔ どの 2 点を結ぶ弦もグラフより上 ⇔ f'' ≥ 0（2 次元ならヘッセ行列が半正定値）
//   凸なら「局所最小 ＝ 大域最小」。たくさんの初期点から坂を下ると、全部同じ場所に着く
// D = 1 次元 / 2 次元 / ←→ = 関数 / ドラッグ = 2 点 a・b を動かす / G = 坂を下る点 / T = 接線
// ============================================

let FNS2, dim = 1, fi = 0, A = -2.2, B = 1.6, A2, B2, drag = -1;
let P1 = [40, 600], showGD = true, showTan = true, V, CI, NEG, mins = [], scan = null;
const NTH = 120;                       // ★ 弦の上で調べる点の数
const FNS1 = [                         // 1 次元の関数：f, d1 = f', d2 = f''
  { name: 'x²', f: (x) => x * x, d1: (x) => 2 * x, d2: () => 2 },
  { name: '|x|（とがっている）', f: Math.abs, d1: Math.sign, d2: () => 0, kink: true },
  { name: 'eˣ / 5', f: (x) => Math.exp(x) / 5, d1: (x) => Math.exp(x) / 5, d2: (x) => Math.exp(x) / 5 },
  { name: 'log(1 + eˣ)', f: (x) => Math.log1p(Math.exp(x)), d1: (x) => 1 / (1 + Math.exp(-x)), d2: (x) => { let s = 1 / (1 + Math.exp(-x)); return s * (1 - s); } },
  { name: 'x⁴/4 − x²', f: (x) => x ** 4 / 4 - x * x, d1: (x) => x ** 3 - 2 * x, d2: (x) => 3 * x * x - 2 },
  { name: 'x²/4 + sin(3x)/2', f: (x) => x * x / 4 + Math.sin(3 * x) / 2, d1: (x) => x / 2 + 1.5 * Math.cos(3 * x), d2: (x) => 0.5 - 4.5 * Math.sin(3 * x) },
  { name: 'x³/6（最小点がない）', f: (x) => x ** 3 / 6, d1: (x) => x * x / 2, d2: (x) => x },
];

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  rebuild();
}
function rebuild() {
  if (dim === 1) { let F = FNS1[fi]; scan = scan1(F, 400, rngSeed(1)); mins = localMins1(F); return; }
  let F = FNS2[fi];
  if (CI) { CI.remove(); NEG.remove(); }
  V = makeView(16, 74, width * 0.55, height - 124, F.view); CI = contourImage(V, F.f);
  NEG = createGraphics(V.pw, V.ph); let nc = NEG.drawingContext; nc.fillStyle = 'rgba(255,80,120,0.28)';   // λ_min(H) < 0 の場所（凸でない場所）をピンクに
  for (let sy = 0; sy < V.ph; sy += 3) for (let sx = 0; sx < V.pw; sx += 3) { let p = V.toW(V.px + sx + 1.5, V.py + sy + 1.5); if (eig2(F.H(p[0], p[1])).l[0] < 0) nc.fillRect(sx, sy, 3, 3); }
  A2 = [F.view[0] - F.view[2] * 0.6, F.view[1] - F.view[2] * 0.3]; B2 = [F.view[0] + F.view[2] * 0.5, F.view[1] + F.view[2] * 0.35];
  scan = scan2(F, 400, rngSeed(1)); mins = localMins2(F);
}
// 弦と関数の差：max_θ f(θa + (1−θ)b) − (θf(a) + (1−θ)f(b))。正なら弦がグラフより下 → 凸でない
function jensenGap(f) {
  let worst = -Infinity, at = 0;
  for (let i = 0; i <= NTH; i++) { let t = i / NTH, g = f(t) - ((1 - t) * f(0) + t * f(1)); if (g > worst) { worst = g; at = t; } }
  return { gap: worst, at };
}
function scan1(F, n, rnd) { let g = -Infinity, d2 = Infinity; for (let k = 0; k < n; k++) { let a = 6 * rnd() - 3, b = 6 * rnd() - 3; g = Math.max(g, jensenGap((t) => F.f(a + t * (b - a))).gap); d2 = Math.min(d2, F.d2(-3 + (6 * k) / (n - 1))); } return { gap: g, d2 }; }
function scan2(F, n, rnd) {
  let g = -Infinity, l = Infinity, [cx, cy, hw] = F.view;
  for (let k = 0; k < n; k++) {
    let a = [cx + hw * (2 * rnd() - 1), cy + hw * 0.6 * (2 * rnd() - 1)], b = [cx + hw * (2 * rnd() - 1), cy + hw * 0.6 * (2 * rnd() - 1)];
    g = Math.max(g, jensenGap((t) => F.f(a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]))).gap); l = Math.min(l, eig2(F.H(...a)).l[0]);
  }
  return { gap: g, d2: l };
}
// 坂を下る（1 次元：x ← x − t f'(x)、t は半分ずつ縮めて f が十分下がるまで）。|x| > 50 なら「発散」
function descend1(F, x) {
  for (let k = 0; k < 2000; k++) {
    let d = F.d1(x), t = 1; if (Math.abs(d) < 1e-12) break;
    while (t > 1e-14 && F.f(x - t * d) > F.f(x) - 0.5 * t * d * d) t /= 2;
    x -= t * d; if (Math.abs(x) > 50) return NaN;
  }
  return x;
}
function localMins1(F) { let r = []; for (let s = -3; s <= 3.001; s += 0.5) r.push([s, descend1(F, s)]); return r; }
// 2 次元：H が正定値ならニュートン方向、そうでなければ −∇f。どちらもアルミホで
function descend2(F, p) {
  for (let k = 0; k < 400; k++) {
    let g = F.g(...p), H = F.H(...p), e = eig2(H), d = e.l[0] > 1e-8 ? solve2(H, g).map((v) => -v) : [-g[0], -g[1]];
    if (vlen(g) < 1e-12) break;
    let t = armijo(F, p, d).t; p = [p[0] + t * d[0], p[1] + t * d[1]];
  }
  return p;
}
function localMins2(F) { let r = [], [cx, cy, hw] = F.view; for (let i = -3; i <= 3; i++) for (let j = -2; j <= 2; j++) { let s = [cx + (hw * i) / 3.5, cy + (hw * j) / 4]; r.push([s, descend2(F, s)]); } return r; }

function draw() {
  background(PAL.bg);
  let F = dim === 1 ? FNS1[fi] : FNS2[fi], info;
  if (dim === 1) info = draw1(F); else info = draw2(F);
  let isConvex = scan.gap <= 1e-12, ends = mins.map((m) => (dim === 1 ? [m[1]] : m[1])).filter((p) => isFinite(p[0]));
  let distinct = []; for (let p of ends) if (!distinct.some((q) => Math.hypot(...q.map((v, i) => v - p[i])) < 1e-4)) distinct.push(p);
  let x = width * 0.6, y = 90;
  hud([['凸関数と凸集合 ── ' + F.name, PAL.ink], ['D ' + (dim === 1 ? '1 次元' : '2 次元') + '　←→ 関数　ドラッグ a・b　G 坂を下る点　T 接線', PAL.dim]], 16, 14, 16);
  hud([['弦の検査：a と b を結ぶ弦がグラフより上か', PAL.ink],
    ['いまの a, b で max（グラフ − 弦）= ' + fmt(info.gap), info.gap > 1e-12 ? PAL.pk : PAL.gr],
    [info.gap > 1e-12 ? '→ 弦がグラフより下になる所がある（赤い点）：凸でない証拠' : '→ 弦はグラフより上（等しいところもある）', PAL.dim],
    ['', PAL.ink],
    ['ランダムな 400 組の a, b で max（グラフ − 弦）= ' + fmt(scan.gap), PAL.ink],
    [(dim === 1 ? "f'' の最小値 = " : 'ヘッセ行列の最小固有値の最小 = ') + fmt(scan.d2) + (dim === 2 ? '（ピンク = 負の場所）' : ''), PAL.ink],
    ['判定：' + (isConvex ? '凸（弦はいつも上、曲がり方 ≥ 0）' : '凸でない'), isConvex ? PAL.gr : PAL.pk],
    ['', PAL.ink],
    ['坂を下った行き先：' + (ends.length < mins.length ? '発散 ' + (mins.length - ends.length) + ' 個、' : '') + 'ちがう点が ' + distinct.length + ' 個', PAL.ye],
    [distinct.slice(0, 4).map((p) => '(' + p.map((v) => fmt(v, 4)).join(', ') + ')').join('  '), PAL.dim],
    [isConvex ? '凸なので、局所最小はどれも大域最小（行き先は 1 か所）' : distinct.length > 1 ? '凸でないと、初期点によって別の谷に止まる' : '凸でないが、この関数は谷が 1 つ（凸は十分条件）', PAL.dim],
    ['', PAL.ink]].concat(dim === 1 ? [['定義：0 ≤ θ ≤ 1 で f(θa + (1−θ)b) ≤ θf(a) + (1−θ)f(b)', PAL.cy],
    ['凸集合：中の 2 点を結ぶ線分が、また中に入っている集合', PAL.cy], ['f が凸 ⇔ エピグラフ {(x, z) : z ≥ f(x)} が凸集合', PAL.cy],
    ['1 次の条件：f(y) ≥ f(x) + f′(x)(y − x)（接線が下）', PAL.cy]] : [['2 次元：凸 ⇔ どの線分の上の断面 φ(θ) も凸 ⇔ ヘッセ行列が半正定値', PAL.cy]]), x, y, 15);
  drawSelfTest();
}
function draw1(F) {
  let px = 40, py = 80, pw = width * 0.55, ph = height - 150, lo = Infinity, hi = -Infinity;
  for (let i = 0; i <= 200; i++) { let v = F.f(-3 + (6 * i) / 200); lo = Math.min(lo, v); hi = Math.max(hi, v); }
  let pad = (hi - lo) * 0.15 + 0.1, X = (x) => px + ((x + 3) / 6) * pw, Y = (v) => py + ph - ((v - lo + pad) / (hi - lo + 2 * pad)) * ph;
  noStroke(); fill(95, 215, 240, 40); beginShape(); vertex(px, py); for (let i = 0; i <= 200; i++) { let x = -3 + (6 * i) / 200; vertex(X(x), Math.max(py, Y(F.f(x)))); } vertex(px + pw, py); endShape(CLOSE);
  stroke(PAL.line); noFill(); rect(px, py, pw, ph); line(X(0), py, X(0), py + ph);
  for (let i = 0; i < 200; i++) { let x0 = -3 + (6 * i) / 200, x1 = x0 + 0.03; stroke(F.d2((x0 + x1) / 2) < 0 ? PAL.pk : PAL.cy); strokeWeight(3); line(X(x0), Y(F.f(x0)), X(x1), Y(F.f(x1))); }
  noStroke(); fill(PAL.dim); textSize(13); text('エピグラフ（グラフの上）＝ 水色の部分。ピンクの所は f″ < 0', px + 8, py + 18);
  if (showTan) { let s = F.d1(A), c = drawingContext; c.save(); c.beginPath(); c.rect(px, py, pw, ph); c.clip(); stroke(PAL.ye); strokeWeight(1.5); line(X(-3), Y(F.f(A) + s * (-3 - A)), X(3), Y(F.f(A) + s * (3 - A))); c.restore(); }
  stroke(PAL.or); strokeWeight(2.5); line(X(A), Y(F.f(A)), X(B), Y(F.f(B)));
  let J = jensenGap((t) => F.f(A + t * (B - A)));
  for (let i = 0; i <= 40; i++) { let t = i / 40, x = A + t * (B - A), c = (1 - t) * F.f(A) + t * F.f(B); if (F.f(x) > c + 1e-12) { noStroke(); fill(PAL.rd); circle(X(x), Y(F.f(x)), 7); } }
  for (let [x, nm] of [[A, 'a'], [B, 'b']]) { stroke(255); fill(PAL.or); circle(X(x), Y(F.f(x)), 14); noStroke(); fill(PAL.ink); text(nm, X(x) + 9, Y(F.f(x)) - 8); }
  if (showGD) for (let [s, e] of mins) {
    stroke(PAL.gr); strokeWeight(1); if (isFinite(e)) line(X(s), py + ph - 6, X(e), Y(F.f(e)));
    noStroke(); fill(PAL.gr); circle(X(s), py + ph - 6, 6); if (isFinite(e)) circle(X(e), Y(F.f(e)), 9);
  }
  if (mins.some((m) => !isFinite(m[1]))) { noStroke(); fill(PAL.pk); text('発散（どこまでも下がる）', px + 8, py + ph - 14); }
  P1 = [px, pw];
  return J;
}
function draw2(F) {
  image(CI, V.px, V.py); image(NEG, V.px, V.py);
  let a = V.toS(...A2), b = V.toS(...B2), phi = (t) => F.f(A2[0] + t * (B2[0] - A2[0]), A2[1] + t * (B2[1] - A2[1])), J = jensenGap(phi);
  stroke(PAL.or); strokeWeight(2.5); line(a[0], a[1], b[0], b[1]);
  if (showGD) for (let [s, e] of mins) { let p = V.toS(...s), q = V.toS(...e); stroke(PAL.gr); strokeWeight(1); line(p[0], p[1], q[0], q[1]); noStroke(); fill(PAL.gr); circle(p[0], p[1], 5); circle(q[0], q[1], 10); }
  for (let [p, nm] of [[a, 'a'], [b, 'b']]) { stroke(255); fill(PAL.or); circle(p[0], p[1], 14); noStroke(); fill(PAL.ink); text(nm, p[0] + 9, p[1] - 8); }
  // 線分の上の 1 次元の断面 φ(θ) と弦（凸 ⇔ どの断面も凸）
  let gx = width * 0.6, gy = height * 0.62, gw = width * 0.36, gh = height * 0.26, v = [];
  for (let i = 0; i <= 100; i++) v.push(phi(i / 100));
  let lo = Math.min(...v), hi = Math.max(...v) + 1e-9, Y = (z) => gy + gh - ((z - lo) / (hi - lo)) * gh;
  noFill(); stroke(PAL.line); rect(gx, gy, gw, gh);
  stroke(PAL.cy); strokeWeight(2); beginShape(); v.forEach((z, i) => vertex(gx + (gw * i) / 100, Y(z))); endShape();
  stroke(PAL.or); line(gx, Y(v[0]), gx + gw, Y(v[100]));
  v.forEach((z, i) => { if (z > v[0] + ((v[100] - v[0]) * i) / 100 + 1e-12 && i % 3 === 0) { noStroke(); fill(PAL.rd); circle(gx + (gw * i) / 100, Y(z), 6); } });
  noStroke(); fill(PAL.ink); textSize(13); text('線分 a→b の上の断面 φ(θ) = f(a + θ(b − a)) と弦', gx, gy - 8);
  return J;
}

function pick(mx, my) {
  if (dim === 1) { let [px, pw] = P1, xw = -3 + ((mx - px) / pw) * 6; return Math.abs(xw - A) < Math.abs(xw - B) ? 0 : 1; }
  let a = V.toS(...A2), b = V.toS(...B2); return Math.hypot(mx - a[0], my - a[1]) < Math.hypot(mx - b[0], my - b[1]) ? 0 : 1;
}
function mousePressed() { drag = pick(mouseX, mouseY); mouseDragged(); }
function mouseDragged() {
  if (drag < 0) return;
  if (dim === 1) { let [px, pw] = P1, x = Math.max(-3, Math.min(3, -3 + ((mouseX - px) / pw) * 6)); if (drag === 0) A = x; else B = x; }
  else if (V.inside(mouseX, mouseY)) { let p = V.toW(mouseX, mouseY); if (drag === 0) A2 = p; else B2 = p; }
}
function mouseReleased() { drag = -1; }
function keyPressed() {
  let n = (dim === 1 ? FNS1 : FNS2).length;
  if (key === RIGHT_ARROW) { fi = (fi + 1) % n; rebuild(); }
  if (key === LEFT_ARROW) { fi = (fi + n - 1) % n; rebuild(); }
  if (key === 'd' || key === 'D') { dim = 3 - dim; fi = 0; rebuild(); }
  if (key === 'g' || key === 'G') showGD = !showGD;
  if (key === 't' || key === 'T') showTan = !showTan;
}

function selfTest() {
  FNS2 = [quadFn(5), LSE, ROSEN, HIMMEL];
  let convex1 = [true, true, true, true, false, false, false];
  FNS1.forEach((F, i) => {
    let e = 0; for (let x of [-2.3, -0.7, 0.4, 1.9]) { let h = 1e-5; e = Math.max(e, Math.abs(F.d1(x) - (F.f(x + h) - F.f(x - h)) / (2 * h)), Math.abs(F.d2(x) - (F.d1(x + h) - F.d1(x - h)) / (2 * h))); }
    let sc = scan1(F, 200, rngSeed(5)), tang = true, rnd = rngSeed(9);
    for (let k = 0; k < 200; k++) { let x = 6 * rnd() - 3, y = 6 * rnd() - 3; if (F.kink && Math.abs(x) < 1e-9) continue; tang = tang && F.f(y) >= F.f(x) + F.d1(x) * (y - x) - 1e-12; }
    stOk(F.name + "：f', f'' = 差分", e < 1e-6, fmt(e));
    stOk(F.name + '：弦の検査で ' + (convex1[i] ? '凸（破れなし）、接線はいつも下' : '凸でない（破れる組がある）') + "、f'' の符号と一致", (sc.gap <= 1e-12) === convex1[i] && (sc.d2 >= 0) === convex1[i] && (!convex1[i] || tang), 'max(グラフ−弦) ' + fmt(sc.gap));
  });
  let m1 = localMins1(FNS1[0]).every((m) => Math.abs(m[1]) < 1e-6), m4 = localMins1(FNS1[4]).map((m) => m[1]);
  stOk('x²：13 個の初期点がすべて 0 へ（局所最小 = 大域最小）', m1);
  stOk('x⁴/4 − x²：行き先は ±√2 の 2 か所に分かれる', m4.some((v) => Math.abs(v - Math.SQRT2) < 1e-6) && m4.some((v) => Math.abs(v + Math.SQRT2) < 1e-6));
  stOk('x³/6：下がり続けて発散（最小点がない）', localMins1(FNS1[6]).some((m) => !isFinite(m[1])));
  let convex2 = [true, true, false, false];
  FNS2.forEach((F, i) => {
    let e = derivErr(F, [[0.3, -0.4], [-1.1, 0.8], [1.7, 1.2]]), sc = scan2(F, 200, rngSeed(3));
    stOk(F.name + '：勾配・ヘッセ行列 = 差分', e.g < 1e-5 && e.H < 1e-5, 'g ' + fmt(e.g) + ', H ' + fmt(e.H));
    stOk(F.name + '：' + (convex2[i] ? '凸（弦の破れなし・λ_min(H) ≥ 0）' : '凸でない（弦の破れ・λ_min(H) < 0 がある）'), (sc.gap <= 1e-10) === convex2[i] && (sc.d2 >= -1e-12) === convex2[i], 'max(グラフ−弦) ' + fmt(sc.gap) + ', λ_min ' + fmt(sc.d2));
  });
  let lm = localMins2(LSE).every((m) => Math.hypot(m[1][0] + Math.LN2 / 2, m[1][1]) < 1e-6);
  stOk('log-sum-exp：35 個の初期点がすべて (−ln2/2, 0) へ、f* = (3/2)ln2 − 0.1', lm && Math.abs(LSE.f(-Math.LN2 / 2, 0) - LSE.fs) < 1e-14);
  let hm = localMins2(HIMMEL).map((m) => m[1]), hit = HIMMEL.xs.filter((q) => hm.some((p) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 1e-6)).length;
  stOk('ヒンメルブラウ：行き先は 4 つの最小点に分かれる（局所最小が 4 つ）', hit === 4, hit + ' / 4');
  stOk('ローゼンブロック：(0, 1) のヘッセ行列は正と負の固有値（凸でない）', eig2(ROSEN.H(0, 1)).l[0] < 0 && eig2(ROSEN.H(0, 1)).l[1] > 0);
  stReport();
}

// ---------- やってみよう ----------
// 1. x⁴/4 − x² で a と b を ±2 にすると弦は上。a = −1.5, b = 1.5 にすると？ 「どの 2 点でも」が大事
// 2. |x| はとがっていて f'' が定義できない点があるが凸。弦の検査は微分を使わないので、そのまま使える
// 3. T の接線（黄色）：凸なら接線はいつもグラフの下（1 次の条件 f(y) ≥ f(x) + f'(x)(y − x)）
// 4. 2 次元のローゼンブロックはピンク（ヘッセ行列が負の固有値をもつ所）がある → 凸ではないが、局所最小は 1 つだけ
// 5. 自分の関数を FNS1 に足してみよう（f, d1 = f', d2 = f'' を書く。自己テストが微分をチェックしてくれる）

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
