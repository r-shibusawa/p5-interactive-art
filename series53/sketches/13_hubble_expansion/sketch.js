// ============================================
// 13 宇宙の膨張 ─ どの銀河から見ても、遠い銀河ほど速く遠ざかる
// ぶどうパン模型：パン（空間）がふくらむと、すべての間の距離が同じ割合 a(t) で伸びる → 速さ v = (ȧ/a) × 距離
// ハッブルの法則 v = H₀ d。銀河の距離と後退速度のグラフに、原点を通る直線を最小二乗で当てはめる：H₀ = Σvd / Σd²
// 宇宙の年齢の目安 = 1/H₀（ずっと同じ速さで広がったとしたら、何年前に全部が 1 点にいたか）
// クリック = 自分の銀河を選ぶ / ↑↓ = 銀河の固有の動き（ばらつき）/ ←→ = 本当の H₀ / R = 新しい銀河 / スペース = 再生/停止
// ============================================

const C_KMS = 299792.458;              // 光の速さ [km/s]
const GYR_PER_INV_H = 977.79;          // 1/H₀ [10 億年] = 977.79 ÷ H₀ [km/s/Mpc]
let H0true = 70, sigmaV = 300, lattice = [], sample = [], me = 0, tt = 0, playing = true, fit = null;   // ★ 本当の H₀ と、ばらつき [km/s]

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  seedRng(11);
  for (let j = 0; j < 9; j++) for (let i = 0; i < 13; i++) lattice.push([i - 6 + 0.35 * (rnd() - 0.5), j - 4 + 0.35 * (rnd() - 0.5)]);
  me = lattice.length >> 1;
  newSample(Date.now());
}
function scaleA(t) { return 1 + 0.6 * t; }               // ぶどうパンの大きさ（1 → 1.6 をくり返す）
function newSample(seed) {
  seedRng(seed); sample = [];
  for (let i = 0; i < 25; i++) { let d = 5 + 395 * rnd(); sample.push([d, H0true * d + sigmaV * rndNormal()]); }
  fit = fitThroughOrigin(sample);
}
function fitThroughOrigin(pts) { let sxy = 0, sxx = 0; for (let [x, y] of pts) { sxy += x * y; sxx += x * x; } return sxx > 0 ? sxy / sxx : 0; }

function draw() {
  background(6, 8, 24);
  if (playing) { tt += 1 / 240; if (tt > 1) tt = 0; }
  // ---- ぶどうパン（自分の銀河が中心）
  let a = scaleA(tt), adot = 0.6, cx = width * 0.27, cy = height * 0.55, sc = Math.min(width * 0.022, height * 0.035);
  let o = lattice[me];
  noStroke(); fill(70, 50, 30, 120); rect(cx - (o[0] + 6.7) * a * sc, cy - (o[1] + 4.7) * a * sc, 13.4 * a * sc, 9.4 * a * sc, 20);   // パン
  for (let k = 0; k < lattice.length; k++) {
    let p = lattice[k], dx = (p[0] - o[0]) * a * sc, dy = (p[1] - o[1]) * a * sc;
    if (k !== me) { stroke(140, 190, 255, 160); let vx = (p[0] - o[0]) * adot * sc * 0.9, vy = (p[1] - o[1]) * adot * sc * 0.9; line(cx + dx, cy + dy, cx + dx + vx, cy + dy + vy); }
    noStroke(); fill(k === me ? color(255, 130, 110) : color(255, 230, 170)); circle(cx + dx, cy + dy, k === me ? 12 : 7);
  }
  noStroke(); fill(200, 205, 225); textSize(13); textAlign(CENTER);
  text('ぶどうパン模型：大きさ a = ' + a.toFixed(2) + '（赤 = 自分。クリックで変えられる）', cx, cy + 4.6 * 1.6 * sc + 40);
  text('矢印 = 自分から見た速さ（遠いほど長い）。どれを選んでも同じ形', cx, cy + 4.6 * 1.6 * sc + 58); textAlign(LEFT, BASELINE);
  // ---- ハッブル図
  let g = { x: width * 0.55, y: 110, w: width * 0.41, h: height * 0.55, x0: 0, x1: 400, y0: 0, y1: 32000 };
  plotAxes(g, '距離 d [Mpc]', '後退速度 v [km/s]', [0, 100, 200, 300, 400], [0, 10000, 20000, 30000]);
  stroke(140, 230, 180, 120); line(gX(g, 0), gY(g, 0), gX(g, 400), gY(g, H0true * 400));
  stroke(250, 225, 140); strokeWeight(2); line(gX(g, 0), gY(g, 0), gX(g, 400), gY(g, fit * 400)); strokeWeight(1);
  noStroke(); fill(255, 240, 210); for (let [d, v] of sample) circle(gX(g, d), gY(g, v), 8);
  let y0 = g.y + g.h + 56;
  fill(250, 225, 140); textSize(16);
  text('当てはめ：H₀ = Σvd / Σd² = ' + fit.toFixed(2) + ' km/s/Mpc', g.x, y0); fill(200, 205, 225); textSize(14); text('（本当は ' + H0true + '、ばらつき ' + sigmaV + ' km/s）', g.x + 380, y0);
  fill(220, 225, 240); textSize(15);
  text('宇宙の年齢の目安 1/H₀ = 977.8 ÷ H₀ = ' + (GYR_PER_INV_H / fit).toFixed(2) + ' × 10 億年', g.x, y0 + 26);
  text('100 Mpc の銀河：v = ' + (fit * 100).toFixed(0) + ' km/s、赤方偏移 z ≈ v/c = ' + ((fit * 100) / C_KMS).toFixed(4), g.x, y0 + 50);
  fill(170, 175, 200); textSize(13);
  text('緑の線 = 本当の H₀、黄の線 = データから当てはめた H₀', g.x, y0 + 76); text('今の測定は 67〜73 くらいで、測り方で少しずれる（ハッブル張力）', g.x, y0 + 94);
  noStroke(); fill(240, 236, 215); textSize(18);
  text('宇宙の膨張　｜ クリック 自分の銀河　↑↓ ばらつき　←→ 本当の H₀　R 新しい銀河　スペース 再生/停止', 20, 34);
  drawSelfTest(20, height - 12);
}

function mousePressed() {
  let a = scaleA(tt), cx = width * 0.27, cy = height * 0.55, sc = Math.min(width * 0.022, height * 0.035), o = lattice[me], best = -1, bd = 20;
  lattice.forEach((p, k) => { let d = Math.hypot(cx + (p[0] - o[0]) * a * sc - mouseX, cy + (p[1] - o[1]) * a * sc - mouseY); if (d < bd) { bd = d; best = k; } });
  if (best >= 0) me = best;
}
function keyPressed() {
  if (key === UP_ARROW) sigmaV = Math.min(3000, sigmaV + 100);
  if (key === DOWN_ARROW) sigmaV = Math.max(0, sigmaV - 100);
  if (key === RIGHT_ARROW) H0true = Math.min(150, H0true + 5);
  if (key === LEFT_ARROW) H0true = Math.max(20, H0true - 5);
  if (key === ' ') playing = !playing;
  if (key === 'r' || key === 'R' || key === UP_ARROW || key === DOWN_ARROW || key === LEFT_ARROW || key === RIGHT_ARROW) newSample(Date.now());
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let pts = [10, 50, 120, 300].map((d) => [d, 70 * d]);
  check('ばらつきのないデータからは H₀ = 70 がぴったり求まる', near(fitThroughOrigin(pts), 70, 1e-9));
  check('H₀ = 70 km/s/Mpc → 1/H₀ = 139.7 億年', near(GYR_PER_INV_H / 70, 13.97, 0.01));
  check('1/H₀ の換算：1 Mpc ÷ 1 km/s = 977.8 × 10 億年', near((3.0857e19 / 1) / (3.15576e16), 977.8, 0.1));
  let L = [[0, 0], [3, 1], [-2, 4], [5, -3]], t = 0.4, dt = 1e-6, ok = true;
  for (let A of [0, 1]) for (let k = 0; k < L.length; k++) {
    if (k === A) continue;
    let d0 = Math.hypot(L[k][0] - L[A][0], L[k][1] - L[A][1]), v = (d0 * (scaleA(t + dt) - scaleA(t))) / dt;
    if (!near(v / (d0 * scaleA(t)), 0.6 / scaleA(t), 1e-6)) ok = false;
  }
  check('ぶどうパン：どの銀河から見ても v / 距離 = ȧ/a（同じ値）', ok);
  seedRng(5); let s = []; for (let i = 0; i < 25; i++) { let d = 5 + 395 * rnd(); s.push([d, 70 * d + 300 * rndNormal()]); }
  check('ばらつき 300 km/s、25 個の銀河でも H₀ は 5% 以内', near(fitThroughOrigin(s) / 70, 1, 0.05));
  check('100 Mpc で v = 7000 km/s → z ≈ 0.0233', near((70 * 100) / C_KMS, 0.02335, 0.0001));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. ぶどうパンで、いろいろな銀河をクリックして自分にしよう。矢印の形は変わる？
// 2. ↑↓ でばらつきを 2000 km/s に。R を何回か押すと、H₀ の推定はどれくらいぶれる？
// 3. 近い銀河（10 Mpc 以内）だけで当てはめると？ 固有の動きのせいで誤差が大きい
// 4. ハッブルが 1929 年に出した H₀ は約 500 だった。そのときの宇宙の年齢の目安は？
// 5. 1/H₀ は「ずっと同じ速さ」の目安。本当の年齢（約 138 億年）とのちがいを調べよう


// ==================================================
// ここから下は「天文の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
const DEG = Math.PI / 180;             // 度 → ラジアン
function wrap360(a) { return ((a % 360) + 360) % 360; }
function wrap180(a) { return wrap360(a + 180) - 180; }
// ---- 種つきの乱数（同じ種なら毎回同じ列）
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
// ---- グラフの道具：g = { x, y, w, h, x0, x1, y0, y1, logx, logy }
function gX(g, v) { let t = g.logx ? (Math.log(v) - Math.log(g.x0)) / (Math.log(g.x1) - Math.log(g.x0)) : (v - g.x0) / (g.x1 - g.x0); return g.x + clampv(isFinite(t) ? t : 0, -0.02, 1.02) * g.w; }
function gY(g, v) { let t = g.logy ? (Math.log(v) - Math.log(g.y0)) / (Math.log(g.y1) - Math.log(g.y0)) : (v - g.y0) / (g.y1 - g.y0); return g.y + g.h - clampv(isFinite(t) ? t : 0, -0.02, 1.02) * g.h; }
function plotAxes(g, xl, yl, xt, yt) {
  stroke(80, 90, 120); strokeWeight(1); noFill(); rect(g.x, g.y, g.w, g.h);
  noStroke(); fill(160, 170, 195); textSize(12); textAlign(CENTER, TOP);
  for (let v of xt) text(+v.toPrecision(3), gX(g, v), g.y + g.h + 4);
  textAlign(RIGHT, CENTER);
  for (let v of yt) text(+v.toPrecision(3), g.x - 5, gY(g, v));
  textAlign(LEFT, BASELINE); fill(205, 210, 225); textSize(13);
  text(xl, g.x + g.w - textWidth(xl), g.y + g.h + 32); text(yl, g.x, g.y - 8);
}
function polyline(pts, closed) {       // 点が 2 つ以上あるときだけ折れ線を描く（空の beginShape はエラーになるため）
  if (!pts || pts.length < 2) return;
  noFill(); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape(closed ? CLOSE : undefined);
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); textSize(13); textAlign(LEFT, BASELINE); fill(selfTestResults.every((r) => r.ok) ? color(130, 215, 160) : color(255, 95, 95)); text(selfTestLine(), x, y); }
