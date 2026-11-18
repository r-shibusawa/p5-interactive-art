// ============================================
// 15 カメラ映像を熱源に ─ 明るい所が温め続け、熱伝導の方程式で広がる「サーモグラフィ風」の絵
// 映像の明るさ B が しきい値より大きいマスは、温度 100·B に向かって温められる（熱源）
// 熱はとなりのマスへ拡散（02 と同じ陽解法、r = 0.2 ≤ 1/4）し、まわりの空気へ少しずつ逃げる（ニュートンの冷却）
// ↑↓ 1 コマの計算回数 / ← → 熱源のしきい値 / 1 鉄の色　2 虹色 / C 熱を消す / V カメラ ⇔ テスト画像 / S 保存
// ============================================

const CW = 160, CH = 120;              // カメラとマス目の大きさ
const R_DIFF = 0.2;                    // ★ r = DΔt/Δx²（1/4 以下で安定）
const HEAT_RATE = 0.08;                // ★ 熱源が温める速さ
const COOL = 0.002;                    // ★ まわりへ逃げる速さ（ニュートンの冷却）
let cap, test, testImg, out, temp, spare, bright, iters = 6, thr = 0.6, cmap = 1, useCam = true;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  cap = createCapture(VIDEO, { flipped: true }); cap.size(CW, CH); cap.hide();
  out = createImage(CW, CH); test = makeTestImage();
  testImg = createImage(CW, CH); testImg.loadPixels(); testImg.pixels.set(test); testImg.updatePixels();
  temp = new Float64Array(CW * CH); spare = new Float64Array(CW * CH); bright = new Float64Array(CW * CH);
  selfTest();
}
// 熱の 1 ステップ：拡散（周りは断熱）＋ 熱源 ＋ 冷却
function heatStep(T, out, nx, ny, r, src, th, rate, cool) {
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
    let i = x + nx * y, d = 0;
    if (x > 0) d += T[i - 1] - T[i]; if (x < nx - 1) d += T[i + 1] - T[i];
    if (y > 0) d += T[i - nx] - T[i]; if (y < ny - 1) d += T[i + nx] - T[i];
    let v = T[i] + r * d - cool * T[i];
    if (src && src[i] > th) v += rate * (100 * src[i] - v);
    out[i] = clampv(v, 0, 100);
  }
}
// 温度 0〜100 → 色（1：鉄の色 黒→紫→赤→橙→黄→白、2：虹色 青→緑→赤）
function heatColor(t, m) {
  let u = clampv(t / 100, 0, 1);
  if (m === 2) return [255 * clampv(2 * u - 0.6, 0, 1), 255 * (1 - Math.abs(2 * u - 1)), 255 * clampv(1 - 2 * u + 0.2, 0, 1)];
  let stops = [[0, 0, 0], [70, 0, 110], [200, 30, 60], [255, 120, 0], [255, 220, 40], [255, 255, 255]], s = u * 5, k = Math.min(4, Math.floor(s)), f = s - k;
  return stops[k].map((c, j) => c + (stops[k + 1][j] - c) * f);
}

function draw() {
  background(18, 16, 20);
  let live = useCam && cap && cap.width > 0 && cap.elt.readyState >= 2 && cap.elt.videoWidth > 0, src = test;
  if (live) { cap.loadPixels(); if (cap.pixels.length >= CW * CH * 4) src = cap.pixels; }
  for (let i = 0; i < CW * CH; i++) bright[i] = (0.299 * src[4 * i] + 0.587 * src[4 * i + 1] + 0.114 * src[4 * i + 2]) / 255;
  for (let k = 0; k < iters; k++) { heatStep(temp, spare, CW, CH, R_DIFF, bright, thr, HEAT_RATE, COOL); let t = temp; temp = spare; spare = t; }
  out.loadPixels();
  let mx = 0, mean = 0;
  for (let i = 0; i < CW * CH; i++) { let c = heatColor(temp[i], cmap), o = 4 * i; out.pixels[o] = c[0]; out.pixels[o + 1] = c[1]; out.pixels[o + 2] = c[2]; out.pixels[o + 3] = 255; mx = Math.max(mx, temp[i]); mean += temp[i] / (CW * CH); }
  out.updatePixels();
  let sc = Math.min((width * 0.7) / CW, (height - 170) / CH), x0 = 20, y0 = 100;
  image(out, x0, y0, CW * sc, CH * sc);
  // 小さく元の映像（熱源になっている所に印）
  let tx = x0 + CW * sc + 30, tw = width - tx - 30, th2 = (tw * CH) / CW;
  if (live) image(cap, tx, y0, tw, th2); else image(testImg, tx, y0, tw, th2);
  noStroke(); fill(170); textSize(13); text(live ? 'カメラ映像' : 'テスト画像（V でカメラ）', tx, y0 + th2 + 18);
  // 色の目盛り
  for (let k = 0; k < 100; k++) { let c = heatColor(k, cmap); fill(c[0], c[1], c[2]); rect(tx + (k / 100) * tw, y0 + th2 + 40, tw / 100 + 1, 16); }
  fill(200); text('0', tx, y0 + th2 + 74); text('100', tx + tw - 24, y0 + th2 + 74);
  let ns = 0; for (let i = 0; i < CW * CH; i++) if (bright[i] > thr) ns++;
  fill(235); textSize(15);
  ['いちばん熱い所 ' + mx.toFixed(1), '平均 ' + mean.toFixed(2), '熱源のマス ' + ns + '（明るさ > ' + thr.toFixed(2) + '）', '1 コマ ' + iters + ' ステップ'].forEach((s, k) => text(s, tx, y0 + th2 + 110 + 24 * k));

  fill(240); textSize(18);
  text('カメラ映像を熱源に：明るい所が温め、熱は拡散方程式で広がる　r = ' + R_DIFF + '（≤ 1/4）', 20, 36);
  fill(175); textSize(15);
  text('↑↓ 計算回数　← → しきい値　1 鉄の色　2 虹色　C 熱を消す　V カメラ ⇔ テスト画像　S 保存', 20, 62);
  drawSelfTest(width - 170, height - 12);
}

function keyPressed() {
  if (key === UP_ARROW) iters = Math.min(30, iters + 2);
  if (key === DOWN_ARROW) iters = Math.max(1, iters - 2);
  if (key === RIGHT_ARROW) thr = Math.min(0.95, thr + 0.05);
  if (key === LEFT_ARROW) thr = Math.max(0.1, thr - 0.05);
  if (key === '1' || key === '2') cmap = +key;
  if (key === 'c' || key === 'C') temp.fill(0);
  if (key === 'v' || key === 'V') useCam = !useCam;
  if (key === 's' || key === 'S') saveCanvas('thermo_camera', 'png');
  return false;
}

// テスト画像：暗い背景に、明るい円（ろうそく）と、明るさの横じま
function makeTestImage() {
  let a = new Uint8ClampedArray(CW * CH * 4);
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    let v = 30 + 20 * Math.sin(x * 0.1);
    if (Math.hypot(x - 45, y - 60) < 12) v = 250;
    if (Math.hypot(x - 115, y - 40) < 7) v = 230;
    if (y > 95 && y < 102 && x > 80) v = 200;
    let o = 4 * (y * CW + x); a[o] = a[o + 1] = a[o + 2] = v; a[o + 3] = 255;
  }
  return a;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  check('安定の条件 r = ' + R_DIFF + ' ≤ 1/4', R_DIFF <= 0.25);
  seedRng(15);
  let n = 40, A = new Float64Array(n * n).map(() => 50 * rnd()), B = new Float64Array(n * n), h0 = A.reduce((s, v) => s + v, 0);
  for (let k = 0; k < 200; k++) { heatStep(A, B, n, n, R_DIFF, null, 1, 0, 0); let t = A; A = B; B = t; }
  check('熱源も冷却もなければ、熱の合計は一定（200 ステップ、相対 1e-12）', Math.abs(A.reduce((s, v) => s + v, 0) / h0 - 1) < 1e-12);
  let m = 81, P = new Float64Array(m * m), Q = new Float64Array(m * m); P[40 + m * 40] = 1;
  for (let k = 0; k < 50; k++) { heatStep(P, Q, m, m, R_DIFF, null, 1, 0, 0); let t = P; P = Q; Q = t; }
  let vx = 0; for (let y = 0; y < m; y++) for (let x = 0; x < m; x++) vx += P[x + m * y] * (x - 40) ** 2;
  check('1 点の熱の広がり：x 方向の分散 = 2r × ステップ数 = ' + (2 * R_DIFF * 50) + '（' + vx.toFixed(4) + '）', near(vx, 2 * R_DIFF * 50, 1e-6));
  let c0 = heatColor(0, 1), c1 = heatColor(100, 1);
  check('色：0 は黒、100 は白（鉄の色）', c0.every((v) => v === 0) && c1.every((v) => v === 255));
  let S = new Float64Array(9 * 9), Sb = new Float64Array(81), src = new Float64Array(81); src[40] = 1;
  for (let k = 0; k < 3000; k++) { heatStep(S, Sb, 9, 9, R_DIFF, src, 0.5, HEAT_RATE, COOL); let t = S; S = Sb; Sb = t; }
  check('明るい 1 マスを熱源に：定常になると中心がいちばん熱く、0〜100 の範囲', S[40] === Math.max(...S) && S[40] <= 100 && S[0] > 0);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 手やスマホの画面をカメラに向けよう。明るい所から熱が広がる
// 2. ← → でしきい値を変えると、熱源になる所はどう変わる？
// 3. 動くと、通ったあとに熱の「尾」が残る。COOL を 0 にすると？ 0.02 にすると？
// 4. R_DIFF を 0.3 にすると何が起きる？（1/4 をこえると不安定。02 と同じ）
// 5. S で保存して、自分のサーモグラフィ風の写真を作ろう


// ==================================================
// ここから下は「熱力学の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 種つきの乱数（同じ種なら毎回同じ列）。シミュレーションと自己テストで使う
let rngState = 1;
function seedRng(s) { rngState = (s >>> 0) || 1; }
function rnd() {                       // 0〜1 の一様乱数（mulberry32）
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rndNormal() { let u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }   // 標準正規分布
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
// ---- グラフの道具：g = { x, y, w, h, x0, x1, y0, y1, logx, logy }
function gX(g, v) { let t = g.logx ? (Math.log(v) - Math.log(g.x0)) / (Math.log(g.x1) - Math.log(g.x0)) : (v - g.x0) / (g.x1 - g.x0); return g.x + clampv(t, -0.02, 1.02) * g.w; }
function gY(g, v) { let t = g.logy ? (Math.log(v) - Math.log(g.y0)) / (Math.log(g.y1) - Math.log(g.y0)) : (v - g.y0) / (g.y1 - g.y0); return g.y + g.h - clampv(t, -0.02, 1.02) * g.h; }
function plotAxes(g, xl, yl, xt, yt) {
  stroke(95); strokeWeight(1); noFill(); rect(g.x, g.y, g.w, g.h);
  noStroke(); fill(165); textSize(12); textAlign(CENTER, TOP);
  for (let v of xt) text(+v.toPrecision(3), gX(g, v), g.y + g.h + 4);
  textAlign(RIGHT, CENTER);
  for (let v of yt) text(+v.toPrecision(3), g.x - 5, gY(g, v));
  textAlign(LEFT, BASELINE); fill(205); textSize(13);
  text(xl, g.x + g.w - textWidth(xl), g.y + g.h + 32); text(yl, g.x, g.y - 8);
}
function polyline(pts) {               // 点が 2 つ以上あるときだけ折れ線を描く
  if (pts.length < 2) return;
  noFill(); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape();
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(120, 210, 150) : color(255, 90, 90)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
