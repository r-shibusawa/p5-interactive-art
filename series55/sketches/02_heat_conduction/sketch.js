// ============================================
// 02 熱伝導 ─ 2 次元の板の温度を、拡散方程式 ∂T/∂t = ∇·(k∇T) で計算する
// マス目ごとの温度を、となりとの温度差 × 熱伝導率 k だけ毎回やり取りする（陽解法の差分）
// 熱の流れ q = −k·(温度の傾き)（フーリエの法則）。周りは断熱なので、熱の合計は変わらずに一様になっていく
// 安定の条件：r = k·Δt/Δx² ≤ 1/4（2 次元）。ここでは r = 0.24 × k
// マウス：ドラッグで塗る（1 加熱　2 冷却　3 銅　4 鉄　5 断熱材）/ F 両はしを 100 °C と 0 °C に固定 / ↑↓ 速さ / スペース 停止 / C 初期化
// ============================================

const NX = 160, NY = 100;              // ★ マス目の数
const R_MAX = 0.24;                    // ★ r = k·Δt/Δx²（1/4 をこえると不安定！ 0.3 にしてみよう）
const MAT = { 3: { name: '銅', k: 1 }, 4: { name: '鉄', k: 0.2 }, 5: { name: '断熱材', k: 0 } };   // ★ 熱伝導率（銅 = 1 とした比。本物は銅 400、鉄 80 W/(m·K)）
let temp, spare, kap, fixedT, img, brush = 1, iters = 20, paused = false, fourier = false, heatLog = [], sx = 20, sy = 100, cell = 5;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  img = createImage(NX, NY);
  cell = Math.max(2, Math.floor(Math.min((width * 0.62) / NX, (height - 170) / NY)));
  selfTest();
  initPlate();
}
function initPlate() {
  temp = new Float64Array(NX * NY); spare = new Float64Array(NX * NY); kap = new Float64Array(NX * NY).fill(0.2); fixedT = new Float64Array(NX * NY).fill(NaN);
  for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++) {
    let i = x + NX * y;
    temp[i] = x < NX / 2 ? 80 : 20;                                       // 左が熱い、右が冷たい
    if (y > 20 && y < 30 && x > 20 && x < 140) kap[i] = 1;               // 銅の棒
    if (x === 110 && (y < 45 || y > 75)) kap[i] = 0;                     // すき間のある断熱の壁
  }
  heatLog = [];
}
// 熱の 1 ステップ：面ごとの熱伝導率は両側の調和平均（どちらかが 0 なら流れない）
function faceK(a, b) { return a + b > 0 ? (2 * a * b) / (a + b) : 0; }
function heatStep(T, K, nx, ny, r, fix, out) {
  out = out || new Float64Array(T.length);
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
    let i = x + nx * y, d = 0;
    if (x > 0) d += faceK(K[i], K[i - 1]) * (T[i - 1] - T[i]);
    if (x < nx - 1) d += faceK(K[i], K[i + 1]) * (T[i + 1] - T[i]);
    if (y > 0) d += faceK(K[i], K[i - nx]) * (T[i - nx] - T[i]);
    if (y < ny - 1) d += faceK(K[i], K[i + nx]) * (T[i + nx] - T[i]);
    out[i] = fix && !isNaN(fix[i]) ? fix[i] : T[i] + r * d;
  }
  return out;
}
function totalHeat(T) { let s = 0; for (let v of T) s += v; return s; }

function draw() {
  background(20, 20, 26);
  // ---- マウスで塗る
  let mx = Math.floor((mouseX - sx) / cell), my = Math.floor((mouseY - sy) / cell);
  if (mouseIsPressed && mx >= 0 && my >= 0 && mx < NX && my < NY) {
    for (let y = my - 3; y <= my + 3; y++) for (let x = mx - 3; x <= mx + 3; x++) {
      if (x < 0 || y < 0 || x >= NX || y >= NY || (x - mx) ** 2 + (y - my) ** 2 > 9) continue;
      let i = x + NX * y;
      if (brush === 1) temp[i] = 100; else if (brush === 2) temp[i] = 0; else kap[i] = MAT[brush].k;
    }
  }
  fixedT.fill(NaN);
  if (fourier) for (let y = 0; y < NY; y++) { fixedT[NX * y] = 100; fixedT[NX * y + NX - 1] = 0; }
  if (!paused) for (let k = 0; k < iters; k++) { let o = heatStep(temp, kap, NX, NY, R_MAX, fixedT, spare); spare = temp; temp = o; }
  if (frameCount % 4 === 0) { heatLog.push(totalHeat(temp) / (NX * NY)); if (heatLog.length > 200) heatLog.shift(); }

  // ---- 温度を色に
  img.loadPixels();
  for (let i = 0; i < NX * NY; i++) {
    let c = heatColor(temp[i]), o = 4 * i;
    if (kap[i] === 0) c = [90, 90, 96]; else if (kap[i] >= 1) c = [Math.min(255, c[0] + 25), c[1] + 10, c[2]];
    img.pixels[o] = c[0]; img.pixels[o + 1] = c[1]; img.pixels[o + 2] = c[2]; img.pixels[o + 3] = 255;
  }
  img.updatePixels(); noSmooth(); image(img, sx, sy, NX * cell, NY * cell); smooth();
  // マウスの行に白い線
  strokeWeight(1);
  if (mx >= 0 && my >= 0 && mx < NX && my < NY) { stroke(255); line(sx, sy + (my + 0.5) * cell, sx + NX * cell, sy + (my + 0.5) * cell); }

  // ---- グラフ：マウスの行の温度の分布、熱の合計
  let gx = sx + NX * cell + 70, gw = width - gx - 30;
  let g1 = { x: gx, y: sy + 10, w: gw, h: (NY * cell) / 2 - 50, x0: 0, x1: NX - 1, y0: 0, y1: 100 };
  plotAxes(g1, '位置 x（マウスの行）', '温度 [°C]', [0, 80, 159], [0, 50, 100]);
  let row = clampv(my, 0, NY - 1);
  stroke(255, 170, 90); strokeWeight(2); polyline(Array.from({ length: NX }, (_, x) => [gX(g1, x), gY(g1, temp[x + NX * row])]));
  let g2 = { x: gx, y: g1.y + g1.h + 80, w: gw, h: g1.h, x0: 0, x1: 200, y0: 0, y1: 100 };
  plotAxes(g2, '時間 →', '平均の温度（= 熱の合計 ÷ マス数）', [], [0, 50, 100]);
  stroke(130, 200, 255); polyline(heatLog.map((v, k) => [gX(g2, k), gY(g2, v)]));

  noStroke(); fill(240); textSize(18); textAlign(LEFT, BASELINE);
  text('熱伝導：∂T/∂t = ∇·(k∇T)　r = kΔt/Δx² = ' + R_MAX + '（≤ 1/4 で安定）　1 コマ ' + iters + ' ステップ', 20, 36);
  fill(175); textSize(15);
  text('ドラッグで塗る：1 加熱　2 冷却　3 銅（k = 1）　4 鉄（k = 0.2）　5 断熱材（k = 0）　いま「' + ['', '加熱', '冷却', '銅', '鉄', '断熱材'][brush] + '」　F 両はし固定 ' + (fourier ? 'ON' : 'OFF') + '　↑↓ 速さ　スペース 停止　C 初期化', 20, 62);
  let msg = '平均の温度 ' + (totalHeat(temp) / (NX * NY)).toFixed(3) + ' °C（断熱の箱なので塗らなければ一定）';
  if (fourier) { let q = 0; for (let y = 0; y < NY; y++) { let i = NX / 2 + NX * y; q += -faceK(kap[i], kap[i - 1]) * (temp[i] - temp[i - 1]); } msg = 'F：まん中を流れる熱 q = −k ΔT/Δx の合計 = ' + q.toFixed(2) + '（定常になると、どの断面でも同じ）'; }
  text(msg, 20, 86);
  drawSelfTest(width - 170, height - 12);
}
// 温度 → 色（0 °C 氷の青 → 50 °C 暗い赤 → 100 °C 白っぽい橙）
function heatColor(t) {
  let u = clampv(t / 100, 0, 1);
  if (u < 0.5) { let s = u / 0.5; return [40 + 120 * s, 120 - 90 * s, 230 - 190 * s]; }
  let s = (u - 0.5) / 0.5; return [160 + 95 * s, 30 + 200 * s, 40 + 150 * s];
}

function keyPressed() {
  if (key >= '1' && key <= '5') brush = +key;
  if (key === 'f' || key === 'F') fourier = !fourier;
  if (key === UP_ARROW) iters = Math.min(80, iters * 2);
  if (key === DOWN_ARROW) iters = Math.max(1, Math.floor(iters / 2));
  if (key === ' ') paused = !paused;
  if (key === 'c' || key === 'C') initPlate();
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  check('安定の条件 r = ' + R_MAX + ' ≤ 1/4（2 次元の陽解法）', R_MAX <= 0.25);
  seedRng(2);
  let n = 30, T = new Float64Array(n * n), K = new Float64Array(n * n);
  for (let i = 0; i < n * n; i++) { T[i] = 100 * rnd(); K[i] = rnd() < 0.2 ? 0 : 0.2 + 0.8 * rnd(); }
  let h0 = totalHeat(T); for (let k = 0; k < 300; k++) T = heatStep(T, K, n, n, R_MAX, null);
  check('周りが断熱なら熱の合計は変わらない（材質ばらばら、300 ステップで相対 1e-12）', Math.abs(totalHeat(T) / h0 - 1) < 1e-12);
  let C = new Float64Array(n * n).map((_, i) => ((i % n) + Math.floor(i / n)) % 2 ? 1 : -1), ones = new Float64Array(n * n).fill(1);
  let a = C, b = C; for (let k = 0; k < 20; k++) { a = heatStep(a, ones, n, n, 0.24, null); b = heatStep(b, ones, n, n, 0.3, null); }
  check('市松模様：r = 0.24 なら減衰（最大 ' + Math.max(...a).toFixed(3) + '）、r = 0.3 なら爆発（' + Math.max(...b).toFixed(0) + '）', Math.max(...a) < 1 && Math.max(...b) > 100);
  let L = 20, bar = new Float64Array(L), kb = new Float64Array(L).fill(1), fx = new Float64Array(L).fill(NaN); fx[0] = 100; fx[L - 1] = 0;
  for (let k = 0; k < 6000; k++) bar = heatStep(bar, kb, L, 1, 0.24, fx);
  check('両はし 100 °C と 0 °C の棒：定常状態は直線（フーリエの法則、誤差 1e-3）', bar.every((v, x) => near(v, 100 - (100 * x) / (L - 1), 1e-3)));
  let ks = new Float64Array(L).map((_, x) => (x < L / 2 ? 1 : 0.25)), bs = new Float64Array(L);
  for (let k = 0; k < 20000; k++) bs = heatStep(bs, ks, L, 1, 0.24, fx);
  let flux = [], Rsum = 0; for (let x = 1; x < L; x++) { let kf = faceK(ks[x], ks[x - 1]); flux.push(-kf * (bs[x] - bs[x - 1])); Rsum += 1 / kf; }
  check('銅 + 鉄をつないだ棒：どの面でも熱の流れが同じで、q = ΔT ÷ Σ(1/k) = ' + (100 / Rsum).toFixed(3), flux.every((q) => near(q, 100 / Rsum, 1e-4)));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 銅の棒と鉄の板で、熱が伝わる速さを比べよう。断熱の壁のすき間から熱がもれていく様子も
// 2. 3（銅）で板の上に線を描き、1 で片方のはしを温める。熱の「道」ができる？
// 3. F で両はしを固定すると、やがて温度は直線（一様な板）になる。q はどの断面でも同じ？
// 4. R_MAX を 0.3 にしてみよう（1/4 をこえる）。何が起きる？ なぜ？
// 5. MAT の k を変えて、自分の材質（ガラス・木など）を作ろう


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
