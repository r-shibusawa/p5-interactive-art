// ============================================
// 15 カメラ画像で最適化 📷
// 画像の明るさを関数 f(u, v) とみなし（ぼかした明るさの格子を双線形補間）、たくさんの粒子が勾配法で暗い所へ流れる
//   v ← βv − η∇f + ノイズ、x ← x + v（β = 慣性、04 の重い球）。軌跡が絵になる。カメラが使えないときはテスト画像
// ↑↓ = ステップ幅 η / M = 慣性 / N = ノイズ / V = 関数（明るさ）を表示 / T = テスト画像 / スペース = 止める / C = 消す / S = 保存
// ============================================

const GW = 96, GH = 72;                // ★ 明るさの格子（横・縦のます目）
const NP = 1600;                       // ★ 粒子の数
let ETA = 24, BETA = 0.85, noiseOn = true, showF = true, useTest = false, paused = false;
let cap = null, Bgrid = new Float64Array(GW * GH), BG, TR, parts = [], tt = 0, fMean = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  cap = createCapture(VIDEO, { flipped: true }); cap.size(160, 120); cap.hide();
  BG = createGraphics(GW, GH); BG.pixelDensity(1);
  TR = createGraphics(width, height);
  for (let i = 0; i < NP; i++) parts.push(spawn());
  updateGrid();
}
function spawn() { return { u: Math.random() * (GW - 1), v: Math.random() * (GH - 1), vu: 0, vv: 0 }; }
function camReady() { return !useTest && cap && cap.width > 0; }
// 明るさの格子をつくる：カメラ（なければテスト画像）→ 2 回ぼかす
function updateGrid() {
  let raw = new Float64Array(GW * GH), ok = false;
  if (camReady()) {
    cap.loadPixels(); let cw = cap.width, chh = cap.height, px = cap.pixels;
    if (px && px.length >= 4 * cw * chh) {
      let d = px.length / (4 * cw * chh), W = Math.round(cw * Math.sqrt(d));
      for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
        let x = Math.floor(((GW - 1 - i) / GW) * W), y = Math.floor((j / GH) * (px.length / 4 / W)), o = 4 * (y * W + x);
        raw[j * GW + i] = (0.299 * px[o] + 0.587 * px[o + 1] + 0.114 * px[o + 2]) / 255;
      }
      ok = raw.some((b) => b > 0.02);
    }
  }
  if (!ok) for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) raw[j * GW + i] = testImage(i, j, tt);
  Bgrid = boxBlur(boxBlur(raw, GW, GH), GW, GH);
  BG.loadPixels();
  for (let q = 0; q < GW * GH; q++) { let b = Bgrid[q]; BG.pixels[4 * q] = 20 + 120 * b; BG.pixels[4 * q + 1] = 45 + 150 * b; BG.pixels[4 * q + 2] = 80 + 160 * b; BG.pixels[4 * q + 3] = 255; }
  BG.updatePixels();
  return ok;
}
function testImage(i, j, t) {         // テスト画像：ゆっくり動くしま模様 ＋ 暗い穴 2 つ
  return 0.55 + 0.3 * Math.sin(i * 0.16 + t) * Math.cos(j * 0.13 - 0.7 * t) - 0.4 * Math.exp(-((i - 30 - 10 * Math.cos(t)) ** 2 + (j - 36) ** 2) / 120) - 0.35 * Math.exp(-((i - 70) ** 2 + (j - 30 - 8 * Math.sin(t)) ** 2) / 90);
}
function boxBlur(A, w, h) {           // 3×3 の平均（端は内側だけで平均）
  let out = new Float64Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    let s = 0, n = 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { let a = i + di, b = j + dj; if (a >= 0 && a < w && b >= 0 && b < h) { s += A[b * w + a]; n++; } }
    out[j * w + i] = s / n;
  }
  return out;
}
// 双線形補間の値と勾配（ます目の中では本当の勾配）
function bil(G, w, h, u, v) {
  u = Math.max(0, Math.min(w - 1, u)); v = Math.max(0, Math.min(h - 1, v));
  let i = Math.min(w - 2, Math.floor(u)), j = Math.min(h - 2, Math.floor(v)), s = u - i, t = v - j, a = G[j * w + i], b = G[j * w + i + 1], c = G[(j + 1) * w + i], d = G[(j + 1) * w + i + 1];
  return { f: (1 - s) * (1 - t) * a + s * (1 - t) * b + (1 - s) * t * c + s * t * d, gu: (1 - t) * (b - a) + t * (d - c), gv: (1 - s) * (c - a) + s * (d - b) };
}
function move(p, eta, beta, noise, rnd) {
  let q = bil(Bgrid, GW, GH, p.u, p.v);
  p.vu = beta * p.vu - eta * q.gu + noise * (rnd() - 0.5); p.vv = beta * p.vv - eta * q.gv + noise * (rnd() - 0.5);
  let sp = Math.hypot(p.vu, p.vv); if (!(sp <= 2)) { let k = sp > 0 && isFinite(sp) ? 2 / sp : 0; p.vu *= k; p.vv *= k; }   // 1 回に 2 ます以内
  p.u = Math.max(0, Math.min(GW - 1, p.u + p.vu)); p.v = Math.max(0, Math.min(GH - 1, p.v + p.vv));
  return q.f;
}

function draw() {
  background(PAL.bg);
  if (frameCount % 3 === 0) { tt += 0.03; updateGrid(); }
  if (showF) { tint(255, 150); image(BG, 0, 0, width, height); noTint(); }
  let ctx = TR.drawingContext, sx = width / (GW - 1), sy = height / (GH - 1), sum = 0;
  ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = 'rgba(0,0,0,0.035)'; ctx.fillRect(0, 0, width, height); ctx.restore();
  if (!paused) {
    let paths = [new Path2D(), new Path2D(), new Path2D()];
    for (let p of parts) {
      let u0 = p.u, v0 = p.v; sum += move(p, ETA, BETA, noiseOn ? 0.25 : 0, Math.random);
      let k = Math.min(2, Math.floor(Math.hypot(p.vu, p.vv) * 2.2)); paths[k].moveTo(u0 * sx, v0 * sy); paths[k].lineTo(p.u * sx, p.v * sy);
      if (Math.random() < 0.004) Object.assign(p, spawn());
    }
    ctx.lineWidth = 1.6; ['rgba(95,216,240,0.5)', 'rgba(255,210,74,0.6)', 'rgba(255,122,47,0.75)'].forEach((c, k) => { ctx.strokeStyle = c; ctx.stroke(paths[k]); });
    fMean.push(sum / NP); if (fMean.length > 300) fMean.shift();
  }
  image(TR, 0, 0, width, height);
  noStroke(); fill(12, 36, 69, 200); rect(10, 8, 640, 74, 8);
  hud([['カメラ画像で最適化 ── 明るさ f を勾配法で下る（' + (camReady() ? 'カメラ' : 'テスト画像') + '）', PAL.ink],
    ['↑↓ η = ' + fmt(ETA) + '　M 慣性 β = ' + BETA + '　N ノイズ ' + (noiseOn ? 'ON' : 'off') + '　V 関数 ' + (showF ? 'ON' : 'off') + '　T テスト画像　スペース 止める　C 消す　S 保存', PAL.dim],
    ['粒子の f の平均 = ' + fmt(fMean[fMean.length - 1] || 0, 3) + '（画面全体の平均 ' + fmt(Bgrid.reduce((a, b) => a + b, 0) / Bgrid.length, 3) + '）← 下がっていれば暗い所へ集まっている', PAL.ye]], 20, 14, 14);
  fill(12, 36, 69, 200); rect(8, height - 34, 150, 28, 6);
  drawSelfTest();
}

function keyPressed() {
  if (key === UP_ARROW) ETA = Math.min(400, ETA * 1.5);
  if (key === DOWN_ARROW) ETA = Math.max(1, ETA / 1.5);
  if (key === 'm' || key === 'M') BETA = BETA > 0 ? 0 : 0.85;
  if (key === 'n' || key === 'N') noiseOn = !noiseOn;
  if (key === 'v' || key === 'V') showF = !showF;
  if (key === 't' || key === 'T') useTest = !useTest;
  if (key === ' ') paused = !paused;
  if (key === 'c' || key === 'C') TR.clear();
  if (key === 's' || key === 'S') saveCanvas('optimize_brush', 'png');
}

function selfTest() {
  let w = 60, h = 50, Q = new Float64Array(w * h), q = (u, v) => ((u - 30) ** 2 + 2 * (v - 21) ** 2) / 1000, rnd = rngSeed(4);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) Q[j * w + i] = q(i, j);
  let F = { f: (u, v) => bil(Q, w, h, u, v).f, g: (u, v) => { let r = bil(Q, w, h, u, v); return [r.gu, r.gv]; } };
  let eFD = 0, eTrue = 0, eNode = 0;
  for (let k = 0; k < 200; k++) {
    let u = Math.floor(rnd() * (w - 2)) + 0.1 + 0.8 * rnd(), v = Math.floor(rnd() * (h - 2)) + 0.1 + 0.8 * rnd(), g = F.g(u, v), n = fdGrad(F.f, u, v, 1e-5);   // ます目の内側だけで比べる
    eFD = Math.max(eFD, Math.abs(g[0] - n[0]), Math.abs(g[1] - n[1]));
    eTrue = Math.max(eTrue, Math.abs(g[0] - (2 * (u - 30)) / 1000), Math.abs(g[1] - (4 * (v - 21)) / 1000));
    let i = Math.floor(rnd() * w), j = Math.floor(rnd() * h); eNode = Math.max(eNode, Math.abs(bil(Q, w, h, i, j).f - q(i, j)));
  }
  stOk('双線形補間の勾配 = 差分（ます目の内側）', eFD < 1e-8, fmt(eFD));
  stOk('格子点では補間 = 元の値', eNode < 1e-15);
  stOk('2 次関数の格子：補間の勾配と本当の勾配の差 ≤ ½·max|∂²f|·（ます目 1）', eTrue <= 0.5 * (4 / 1000) + 1e-12, fmt(eTrue));
  let okGD = true, mono = true;
  for (let k = 0; k < 20; k++) {
    let p = [2 + rnd() * (w - 4), 2 + rnd() * (h - 4)], last = F.f(...p);
    for (let it = 0; it < 500; it++) { let g = F.g(...p); if (vlen(g) < 1e-12) break; let t = armijo(F, p, [-g[0], -g[1]], 1e-4, 0.5, 400).t; if (t * vlen(g) < 1e-9) break; p = [p[0] - t * g[0], p[1] - t * g[1]]; let fv = F.f(...p); mono = mono && fv <= last + 1e-15; last = fv; }
    okGD = okGD && Math.hypot(p[0] - 30, p[1] - 21) < 0.5;
  }
  stOk('勾配法（アルミホ）で f は毎回下がり、20 個の初期点すべてが最も暗い格子点 (30, 21) の半ます以内へ', okGD && mono);
  let C = new Float64Array(w * h).fill(0.37), Cb = boxBlur(C, w, h);
  stOk('ぼかしても一様な画像は変わらない', Cb.every((b) => Math.abs(b - 0.37) < 1e-15));
  let save = Bgrid, ps = { u: 10, v: 10, vu: 0, vv: 0 }, okClamp = true; Bgrid = new Float64Array(GW * GH).map((_, k) => testImage(k % GW, Math.floor(k / GW), 0));
  for (let k = 0; k < 300; k++) { move(ps, 1e9, 0.99, 50, rnd); okClamp = okClamp && isFinite(ps.u + ps.v) && ps.u >= 0 && ps.u <= GW - 1 && ps.v >= 0 && ps.v <= GH - 1; }
  Bgrid = save;
  stOk('η = 10⁹ でも粒子は画面の中・有限（1 回 2 ます以内に制限）', okClamp);
  stReport();
}

// ---------- やってみよう ----------
// 1. 顔を近づけたり手をかざしたりすると、暗い所（目・髪・影）へ粒子が流れこむ
// 2. M で慣性を切ると（β = 0：ふつうの勾配法）、粒子はすぐ止まる。慣性ありだと谷を行き過ぎて戻る（04 の重い球）
// 3. ↑ で η を大きくすると谷を飛び越えて落ち着かない。↓ で小さくすると細かい模様に沿う
// 4. move の −eta を +eta にすると明るい所へ（勾配上昇法）。色を変えて「光に集まる虫」に
// 5. N のノイズを消すと、粒子は一番近い谷で止まる（局所最小）。ノイズは別の谷へ移るきっかけ（13）

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
