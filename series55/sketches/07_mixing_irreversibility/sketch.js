// ============================================
// 07 混合と不可逆性 ─ 仕切りをとると 2 種類の分子は混ざり、もう元にはもどらない
// 分子はやわらかい円板（ばね状の反発）で、運動方程式を「速度ベルレ法」で解く。この解き方は時間を逆にしても同じ式
// → 速度を全部反対にすると（V）、本当に元の分かれた状態にもどる。でも 1 粒子を 100 万分の 1 だけずらすと（P）もどらない
// 全部の赤が左にもどる確率は (1/2)^N。混合エントロピー ΔS = 2N k ln 2
// スペース 仕切りをとる / V 時間を逆回し / P 少しずらして逆回し / 1 2 3 粒子の数 / ↑↓ 速さ / R 最初から
// ============================================

const SIGMA = 10;                      // ★ 粒子の直径 [px]
const EPS = 30;                        // ★ 粒子どうしの反発の強さ（kT = 1 の何倍か）
const EPS_WALL = 80;                   // ★ 壁・仕切りの反発の強さ
const DT = 0.05;                       // ★ 1 ステップの時間
const SIZES = [4, 20, 150];            // ★ 1 〜 3 で選ぶ、片側の粒子の数
let sizeIdx = 2, sim, stepsPerFrame = 20, logL = [], countHist = [], reversedAt = -1, msg = '';

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); resetSim(); }
function resetSim() { seedRng(5); sim = makeMix(SIZES[sizeIdx], Math.floor(width * 0.48), height - 220); logL = []; countHist = new Array(SIZES[sizeIdx] + 1).fill(0); reversedAt = -1; msg = ''; }

// 左に赤 n 個、右に青 n 個
function makeMix(n, W, H) {
  let s = { n: 2 * n, W, H, wall: true, x: new Float64Array(2 * n), y: new Float64Array(2 * n), vx: new Float64Array(2 * n), vy: new Float64Array(2 * n), ax: new Float64Array(2 * n), ay: new Float64Array(2 * n), steps: 0 };
  let cols = Math.max(1, Math.ceil(Math.sqrt((n * W) / 2 / H))), rows = Math.ceil(n / cols);
  for (let i = 0; i < 2 * n; i++) {
    let k = i % n, side = i < n ? 0 : 1;
    s.x[i] = side * (W / 2) + ((k % cols) + 0.5) * (W / 2 / cols); s.y[i] = (Math.floor(k / cols) + 0.5) * (H / rows);
    s.vx[i] = rndNormal(); s.vy[i] = rndNormal();
  }
  forces(s); return s;
}
// 力：粒子どうしは U = ε(1 − r/σ)²（r < σ のときだけ）、壁と仕切りも同じ形
function wallF(d, e) { let rr = SIGMA / 2; return d < rr ? ((2 * e) / rr) * (1 - Math.max(d, 0) / rr) : 0; }
function forces(s) {
  s.ax.fill(0); s.ay.fill(0);
  let cs = SIGMA, nx = Math.max(1, Math.floor(s.W / cs)), ny = Math.max(1, Math.floor(s.H / cs)), head = new Int32Array(nx * ny).fill(-1), next = new Int32Array(s.n);
  for (let i = 0; i < s.n; i++) { let c = clampv(Math.floor(s.x[i] / cs), 0, nx - 1) + nx * clampv(Math.floor(s.y[i] / cs), 0, ny - 1); next[i] = head[c]; head[c] = i; }
  for (let cy = 0; cy < ny; cy++) for (let cx = 0; cx < nx; cx++) for (let i = head[cx + nx * cy]; i >= 0; i = next[i]) {
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      let ax = cx + ox, ay = cy + oy; if (ax < 0 || ay < 0 || ax >= nx || ay >= ny) continue;
      for (let j = head[ax + nx * ay]; j >= 0; j = next[j]) {
        if (j <= i) continue;
        let dx = s.x[j] - s.x[i], dy = s.y[j] - s.y[i], r2 = dx * dx + dy * dy;
        if (r2 >= SIGMA * SIGMA || r2 === 0) continue;
        let r = Math.sqrt(r2), f = ((2 * EPS) / SIGMA) * (1 - r / SIGMA);
        s.ax[i] -= (f * dx) / r; s.ay[i] -= (f * dy) / r; s.ax[j] += (f * dx) / r; s.ay[j] += (f * dy) / r;
      }
    }
  }
  for (let i = 0; i < s.n; i++) {
    s.ax[i] += wallF(s.x[i], EPS_WALL) - wallF(s.W - s.x[i], EPS_WALL); s.ay[i] += wallF(s.y[i], EPS_WALL) - wallF(s.H - s.y[i], EPS_WALL);
    if (s.wall) { let left = i < s.n / 2; s.ax[i] += left ? -wallF(s.W / 2 - s.x[i], EPS_WALL) : wallF(s.x[i] - s.W / 2, EPS_WALL); }   // 仕切り
  }
}
function verlet(s) {                   // 速度ベルレ法（時間を逆にしても同じ手順）
  for (let i = 0; i < s.n; i++) { s.vx[i] += 0.5 * DT * s.ax[i]; s.vy[i] += 0.5 * DT * s.ay[i]; s.x[i] += DT * s.vx[i]; s.y[i] += DT * s.vy[i]; }
  forces(s);
  for (let i = 0; i < s.n; i++) { s.vx[i] += 0.5 * DT * s.ax[i]; s.vy[i] += 0.5 * DT * s.ay[i]; }
  s.steps++;
}
function energy(s) {
  let e = 0;
  for (let i = 0; i < s.n; i++) {
    e += 0.5 * (s.vx[i] ** 2 + s.vy[i] ** 2);
    for (let d of [s.x[i], s.W - s.x[i], s.y[i], s.H - s.y[i]].concat(s.wall ? [Math.abs(s.x[i] - s.W / 2)] : [])) if (d < SIGMA / 2) e += EPS_WALL * (1 - d / (SIGMA / 2)) ** 2;
    for (let j = i + 1; j < s.n; j++) { let r = Math.hypot(s.x[j] - s.x[i], s.y[j] - s.y[i]); if (r < SIGMA) e += EPS * (1 - r / SIGMA) ** 2; }
  }
  return e;
}
function reverse(s) { for (let i = 0; i < s.n; i++) { s.vx[i] = -s.vx[i]; s.vy[i] = -s.vy[i]; } }
function redLeft(s) { let c = 0; for (let i = 0; i < s.n / 2; i++) if (s.x[i] < s.W / 2) c++; return c; }
function lnChoose(n, k) { return lnFact(n) - lnFact(k) - lnFact(n - k); }
function lnFact(n) { let s = 0; for (let k = 2; k <= n; k++) s += Math.log(k); return s; }

function draw() {
  background(22, 22, 28);
  for (let k = 0; k < stepsPerFrame; k++) verlet(sim);
  let nh = sim.n / 2, nl = redLeft(sim), bl = 0; for (let i = nh; i < sim.n; i++) if (sim.x[i] < sim.W / 2) bl++;
  logL.push(nl); if (logL.length > 400) logL.shift();
  if (!sim.wall) countHist[nl]++;
  // ---- 箱
  let bx = 20, by = 120;
  noFill(); stroke(150); strokeWeight(2); rect(bx, by, sim.W, sim.H);
  if (sim.wall) { stroke(230); strokeWeight(4); line(bx + sim.W / 2, by, bx + sim.W / 2, by + sim.H); }
  else { stroke(255, 255, 255, 40); strokeWeight(1); line(bx + sim.W / 2, by, bx + sim.W / 2, by + sim.H); }
  noStroke();
  for (let i = 0; i < sim.n; i++) { fill(i < nh ? color(255, 100, 70) : color(80, 160, 255)); circle(bx + sim.x[i], by + sim.y[i], SIGMA * 0.9); }

  // ---- グラフ 1：左にいる赤の数
  let gx = bx + sim.W + 70, gw = width - gx - 30;
  let g1 = { x: gx, y: by, w: gw, h: (sim.H - 80) / 2, x0: 0, x1: 400, y0: 0, y1: nh };
  plotAxes(g1, '時間 →', '左にいる赤の数', [], [0, nh / 2, nh]);
  stroke(255, 120, 80); strokeWeight(2); polyline(logL.map((v, k) => [gX(g1, k), gY(g1, v)]));
  stroke(255, 255, 255, 60); strokeWeight(1); line(g1.x, gY(g1, nh / 2), g1.x + g1.w, gY(g1, nh / 2));
  // ---- グラフ 2：その分布（理論 = 二項分布 C(N, k)/2^N）
  let tot = countHist.reduce((a, b) => a + b, 0), pmax = Math.exp(lnChoose(nh, Math.floor(nh / 2)) - nh * Math.LN2);
  let g2 = { x: gx, y: g1.y + g1.h + 80, w: gw, h: g1.h, x0: -0.5, x1: nh + 0.5, y0: 0, y1: pmax * 1.4 };
  plotAxes(g2, '左にいる赤の数 k', '割合', [0, nh / 2, nh], [0, +(pmax * 1.4).toPrecision(2)]);
  noStroke(); fill(255, 150, 80, 160);
  if (tot > 0) for (let k = 0; k <= nh; k++) { let y = gY(g2, countHist[k] / tot); rect(gX(g2, k - 0.4), y, Math.max(1, gX(g2, k + 0.4) - gX(g2, k - 0.4)), g2.y + g2.h - y); }
  stroke(130, 200, 255); strokeWeight(2); polyline(Array.from({ length: nh + 1 }, (_, k) => [gX(g2, k), gY(g2, Math.exp(lnChoose(nh, k) - nh * Math.LN2))]));

  // ---- 文字
  let sCount = lnChoose(nh, nl) + lnChoose(nh, bl), sMax = 2 * lnChoose(nh, Math.floor(nh / 2));
  noStroke(); fill(240); textSize(18); textAlign(LEFT, BASELINE);
  text('混合と不可逆性　片側 N = ' + nh + ' 個　' + (sim.wall ? '仕切りあり（スペースでとる）' : '仕切りなし') + '　ステップ ' + sim.steps + '　エネルギー ' + energy(sim).toFixed(2), 20, 36);
  fill(175); textSize(15);
  text('スペース 仕切りをとる　V 逆回し　P 1 粒子を 10⁻⁶ ずらして逆回し　1 2 3 粒子の数（4 / 20 / 150）　↑↓ 速さ　R 最初から', 20, 62);
  fill(255, 200, 120);
  text('全部の赤が左にもどる確率 (1/2)^N = ' + Math.pow(0.5, nh).toExponential(2) + '　混合エントロピー ΔS = 2N ln 2 = ' + (2 * nh * Math.LN2).toFixed(1) + ' k　いまの並べ方の数 ln W = ' + sCount.toFixed(1) + '（最大 ' + sMax.toFixed(1) + '）　' + msg, 20, 86);
  fill(130, 200, 255); textSize(13); text('青い線 = 二項分布 C(N,k)/2^N（ばらばらに左右へ入れたとき）', g2.x, g2.y + g2.h + 48);
  drawSelfTest(width - 170, height - 12);
}

function keyPressed() {
  if (key === ' ') { if (sim.wall) { sim.wall = false; forces(sim); msg = ''; countHist.fill(0); } }
  if (key === 'v' || key === 'V') { reverse(sim); forces(sim); msg = '逆回し中：ステップ ' + sim.steps + ' で反転'; }
  if (key === 'p' || key === 'P') { sim.x[0] += 1e-6; reverse(sim); forces(sim); msg = '10⁻⁶ ずらして逆回し：ステップ ' + sim.steps; }
  if (key === '1' || key === '2' || key === '3') { sizeIdx = +key - 1; resetSim(); }
  if (key === UP_ARROW) stepsPerFrame = Math.min(160, stepsPerFrame * 2);
  if (key === DOWN_ARROW) stepsPerFrame = Math.max(5, stepsPerFrame / 2);
  if (key === 'r' || key === 'R') resetSim();
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(21);
  let s = makeMix(30, 200, 160); s.wall = false; forces(s);
  let e0 = energy(s); for (let k = 0; k < 1500; k++) verlet(s);
  check('速度ベルレ法：1500 ステップでエネルギーの変化 < 0.5%', Math.abs(energy(s) / e0 - 1) < 5e-3);
  let x0 = Float64Array.from(s.x), y0 = Float64Array.from(s.y);
  for (let k = 0; k < 2800; k++) verlet(s);
  let t = makeMix(30, 200, 160); t.wall = false; for (let q of ['x', 'y', 'vx', 'vy']) t[q] = Float64Array.from(s[q]); forces(t);
  reverse(s); forces(s); for (let k = 0; k < 2800; k++) verlet(s);
  let err = 0; for (let i = 0; i < s.n; i++) err = Math.max(err, Math.hypot(s.x[i] - x0[i], s.y[i] - y0[i]));
  check('2800 ステップ進めて速度を反対に → 2800 ステップで元の位置へ（ずれ ' + err.toExponential(1) + ' < 10⁻³ px）', err < 1e-3);
  t.x[0] += 1e-6; reverse(t); forces(t); for (let k = 0; k < 2800; k++) verlet(t);
  let errP = 0; for (let i = 0; i < t.n; i++) errP = Math.max(errP, Math.hypot(t.x[i] - x0[i], t.y[i] - y0[i]));
  check('1 粒子を 10⁻⁶ px ずらして逆回し → ずれが ' + errP.toFixed(1) + ' px に広がる（もどらない）', errP > 1);
  check('二項分布の合計 = 1、N = 20 で全部左の確率 = 2⁻²⁰ = 9.54 × 10⁻⁷', near(Array.from({ length: 21 }, (_, k) => Math.exp(lnChoose(20, k))).reduce((a, b) => a + b) / 2 ** 20, 1, 1e-9) && near(Math.exp(lnChoose(20, 20) - 20 * Math.LN2), 9.5367e-7, 1e-10));
  check('並べ方の数：ln C(2N, N) ≈ 2N ln 2 − ½ ln(πN)（N = 150、スターリングの近似）', near(lnChoose(300, 150), 300 * Math.LN2 - 0.5 * Math.log(Math.PI * 150), 0.01));
  let m = makeMix(20, 160, 160); m.wall = false; forces(m); let sum = 0, cnt = 0;
  for (let k = 0; k < 6000; k++) { verlet(m); if (k > 2000 && k % 20 === 0) { sum += redLeft(m) / 20; cnt++; } }
  check('仕切りをとって十分たつと、左にいる赤の割合の平均 ≈ 1/2（' + (sum / cnt).toFixed(2) + '）', Math.abs(sum / cnt - 0.5) < 0.12);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. スペースで混ぜてから、すぐ V を押そう。本当に分かれた状態にもどる？ 長く待ってから V では？（計算の丸め誤差も広がる）
// 2. P（少しずらして逆回し）では？ 10⁻⁶ のずれが、衝突のたびに何倍にもなる（カオス）
// 3. 1 で粒子を 4 個ずつにすると、全部の赤が左にもどることがある。何回に 1 回くらい？ (1/2)^4 = 1/16
// 4. 150 個ずつでは 2⁻¹⁵⁰ ≈ 7 × 10⁻⁴⁶。宇宙の年齢の間に一度も起きないくらい小さい
// 5. 下の分布は二項分布に近い？ 粒子の数を増やすと、山は細くなる？


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
