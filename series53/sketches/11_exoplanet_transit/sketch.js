// ============================================
// 11 系外惑星を見つける ─ 星のかすかな暗くなり（トランジット）と、星のふらつき（視線速度）
// 惑星が星の前を通ると、隠れた面積の分だけ暗くなる：減光率 = (Rp/R*)²（星の明るさは一様とする近似）
// ノイズのある 30 日分の観測データを、周期 P で折りたたむ（位相 = 時刻 ÷ P の小数部分）と、くぼみが重なって見える
// 視線速度の振幅 K = (2πG/P)^(1/3) × Mp sin i ÷ M*^(2/3)（円軌道、Mp ≪ M*）
// ←→ = ためす周期（Shift で細かく）/ B = 周期を自動で探す / ↑↓ = 惑星の質量 / R = 新しい星 / 星は太陽と同じ（1 M☉、1 R☉）
// ============================================

const DAYS = 30, CADENCE = 1 / 72;     // ★ 観測日数と間隔（20 分）
const SIGMA_N = 0.0012;                // ★ 明るさの測定ノイズ（1 = 星の明るさ）
const GRAV = 6.674e-11, M_SUN = 1.989e30, M_JUP = 1.898e27, M_EARTH = 5.972e24, R_SUN_RE = 109.1, R_SUN_RJ = 9.73;   // 太陽の半径 = 地球の 109.1 倍 = 木星の 9.73 倍
const AU_RSUN = 215.03;                // 1 AU = 太陽の半径の 215 倍
let truth, data = [], trialP = 3.0, found = null, mpJ = 1.0, spec = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  newStar(Date.now());
}
// 半径 1 の星と、半径 k の惑星（中心の距離 z）の重なりの面積
function overlap(z, k) {
  if (z >= 1 + k) return 0;
  if (z <= 1 - k) return Math.PI * k * k;
  if (z <= k - 1) return Math.PI;
  let a = Math.acos(clampv((z * z + k * k - 1) / (2 * z * k), -1, 1)), b = Math.acos(clampv((z * z + 1 - k * k) / (2 * z), -1, 1));
  return k * k * a + b - 0.5 * Math.sqrt(Math.max(0, (-z + k + 1) * (z + k - 1) * (z - k + 1) * (z + k + 1)));
}
function aOverR(P) { return Math.pow(P / 365.25, 2 / 3) * AU_RSUN; }       // ケプラーの第 3 法則（M* = 1 M☉）
// 時刻 t の惑星の空の上の位置（星の半径 = 1）と、明るさ
function skyPos(t, tr) { let ph = (2 * Math.PI * (t - tr.t0)) / tr.P, a = aOverR(tr.P); return { x: a * Math.sin(ph), y: tr.b * Math.cos(ph), front: Math.cos(ph) > 0 }; }
function fluxAt(t, tr) { let s = skyPos(t, tr); return s.front ? 1 - overlap(Math.hypot(s.x, s.y), tr.k) / Math.PI : 1; }
function rvK(P, mp) { return Math.pow((2 * Math.PI * GRAV) / (P * 86400), 1 / 3) * mp / Math.pow(M_SUN, 2 / 3); }   // [m/s]
function newStar(seed) {
  seedRng(seed);
  truth = { P: 2 + 6 * rnd(), k: 0.06 + 0.08 * rnd(), b: 0.5 * rnd(), t0: rnd() * 2 };
  data = []; for (let t = 0; t < DAYS; t += CADENCE) data.push([t, fluxAt(t, truth) + SIGMA_N * rndNormal()]);
  found = null; spec = null;
}
// 折りたたんで 200 区間の平均。くぼみの深さ = 1 − （となり 5 区間の平均のいちばん小さい値）
function fold(d, P) {
  let N = 200, s = new Float64Array(N), n = new Float64Array(N);
  for (let [t, f] of d) { let i = Math.floor((((t / P) % 1) + 1) % 1 * N) % N; s[i] += f; n[i]++; }
  let best = 1e9, bi = 0, bn = 0;
  for (let i = 0; i < N; i++) { let ss = 0, nn = 0; for (let j = -2; j <= 2; j++) { let q = (i + j + N) % N; ss += s[q]; nn += n[q]; } if (nn > 0 && ss / nn < best) { best = ss / nn; bi = i; bn = nn; } }
  return { depth: 1 - best, phase: bi / N, snr: ((1 - best) * Math.sqrt(bn)) / SIGMA_N };
}
// 周期を 1〜10 日で調べて、くぼみがいちばんはっきりする周期（箱型の当てはめの簡単版）
function searchPeriod(d) {
  let out = [], best = null;
  for (let i = 0; i <= 900; i++) { let P = 1 + (9 * i) / 900, f = fold(d, P); out.push([P, f.snr]); if (!best || f.snr > best.snr) best = { P, ...f }; }
  // まわりを細かく
  for (let i = -50; i <= 50; i++) { let P = best.P + i * 0.0002, f = fold(d, P); if (f.snr > best.snr) best = { P, ...f }; }
  return { spec: out, best };
}

function draw() {
  background(6, 10, 28);
  let t = (millis() / 1000) * 0.5 % DAYS;
  // ---- 星と惑星（空の上）
  let sx = 150, sy = 165, sr = 60, sp = skyPos(t, truth);
  noStroke(); fill(255, 235, 200); circle(sx, sy, 2 * sr);
  if (sp.front && Math.abs(sp.x) < 3) { fill(10); circle(sx + sp.x * sr, sy + sp.y * sr, 2 * truth.k * sr); }
  fill(200, 205, 225); textSize(12); textAlign(CENTER); text('星の前を通るときだけ見える', sx, sy + sr + 22); text('（' + t.toFixed(1) + ' 日目）', sx, sy + sr + 38); textAlign(LEFT, BASELINE);
  // ---- 観測データ（30 日）
  let g1 = { x: 320, y: 100, w: width - 360, h: height * 0.2, x0: 0, x1: DAYS, y0: 1 - 0.03, y1: 1 + 0.006 };
  plotAxes(g1, '時刻 [日]', '明るさ（観測データ、30 日分）', [0, 5, 10, 15, 20, 25, 30], [0.97, 0.98, 0.99, 1]);
  noStroke(); fill(250, 225, 140, 140); for (let [tt, f] of data) rect(gX(g1, tt), gY(g1, f), 1.5, 1.5);
  stroke(255, 120); line(gX(g1, t), g1.y, gX(g1, t), g1.y + g1.h);
  // ---- 折りたたんだ図
  let fd = fold(data, trialP), g2 = { x: 70, y: g1.y + g1.h + 70, w: width * 0.45, h: height * 0.3, x0: 0, x1: 1, y0: 1 - 0.03, y1: 1 + 0.006 };
  plotAxes(g2, '位相（時刻 ÷ P の小数部分）', 'P = ' + trialP.toFixed(4) + ' 日で折りたたむ', [0, 0.25, 0.5, 0.75, 1], [0.97, 0.98, 0.99, 1]);
  noStroke(); fill(140, 190, 255, 150);
  for (let [tt, f] of data) { let ph = ((tt / trialP) % 1 + 1) % 1; rect(gX(g2, ph), gY(g2, f), 1.5, 1.5); }
  stroke(255, 140, 110); line(g2.x, gY(g2, 1 - fd.depth), g2.x + g2.w, gY(g2, 1 - fd.depth));
  let k = Math.sqrt(Math.max(0, fd.depth));
  // ---- 周期の探索の結果
  let g3 = { x: g2.x + g2.w + 70, y: g2.y, w: width - g2.x - g2.w - 110, h: height * 0.13, x0: 1, x1: 10, y0: 0, y1: spec ? Math.max(...spec.map((q) => q[1])) * 1.1 : 1 };
  plotAxes(g3, '周期 [日]', 'くぼみのはっきりさ（B で計算）', [1, 4, 7, 10], []);
  if (spec) { stroke(220, 140, 255); polyline(spec.map((q) => [gX(g3, q[0]), gY(g3, q[1])])); }
  stroke(255, 120); line(gX(g3, trialP), g3.y, gX(g3, trialP), g3.y + g3.h);
  // ---- 視線速度
  let K = rvK(truth.P, mpJ * M_JUP), g4 = { x: g3.x, y: g3.y + g3.h + 70, w: g3.w, h: height * 0.13, x0: 0, x1: 1, y0: -1.3 * K, y1: 1.3 * K };
  plotAxes(g4, '位相', '星の視線速度 [m/s]', [0, 0.5, 1], [-K, 0, K].map((v) => +v.toFixed(1)));
  let rv = []; for (let i = 0; i <= 100; i++) rv.push([gX(g4, i / 100), gY(g4, -K * Math.sin(2 * Math.PI * (i / 100)))]);
  stroke(140, 230, 180); strokeWeight(2); polyline(rv); strokeWeight(1);
  // ---- 数字
  noStroke(); fill(250, 225, 140); textSize(15);
  let y0 = Math.max(g2.y + g2.h, g4.y + g4.h) + 56;
  text('ためす周期 P = ' + trialP.toFixed(4) + ' 日　くぼみの深さ = ' + (fd.depth * 100).toFixed(3) + '%　→ Rp/R* = √深さ = ' + k.toFixed(3) + '　→ Rp = ' + (k * R_SUN_RE).toFixed(1) + ' 地球半径 = ' + (k * R_SUN_RJ).toFixed(2) + ' 木星半径', 20, y0);
  fill(220, 225, 240);
  text('軌道の半径 a = (P/365.25)^(2/3) AU = ' + (aOverR(trialP) / AU_RSUN).toFixed(4) + ' AU = ' + aOverR(trialP).toFixed(1) + ' R*　惑星の質量 ' + mpJ.toFixed(2) + ' 木星質量 → K = ' + K.toFixed(1) + ' m/s', 20, y0 + 24);
  if (found) { fill(140, 230, 180); text('自動の探索：P = ' + found.P.toFixed(4) + ' 日、深さ ' + (found.depth * 100).toFixed(3) + '%（はっきりさ ' + found.snr.toFixed(0) + '）　答え合わせ：P = ' + truth.P.toFixed(4) + '、Rp/R* = ' + truth.k.toFixed(3), 20, y0 + 48); }
  noStroke(); fill(240, 236, 215); textSize(18);
  text('系外惑星を見つける　｜ ←→ ためす周期（Shift で細かく）　B 自動で探す　↑↓ 惑星の質量　R 新しい星', 20, 34);
  fill(180, 185, 210); textSize(14);
  text('折りたたんだ図で点がそろって 1 本のくぼみになったら、その周期が正解', 20, 60);
  drawSelfTest(20, height - 12);
}

function keyPressed() {
  let st = keyIsDown(SHIFT) ? 0.002 : 0.02;
  if (key === RIGHT_ARROW) trialP = Math.min(10, trialP + st);
  if (key === LEFT_ARROW) trialP = Math.max(1, trialP - st);
  if (key === UP_ARROW) mpJ = Math.min(20, mpJ * 1.25);
  if (key === DOWN_ARROW) mpJ = Math.max(0.003, mpJ / 1.25);
  if (key === 'b' || key === 'B') { let r = searchPeriod(data); spec = r.spec; found = r.best; trialP = r.best.P; }
  if (key === 'r' || key === 'R') newStar(Date.now());
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  check('惑星が全部星の前にあるとき、減光率 = 面積の比 k²', near(overlap(0, 0.1) / Math.PI, 0.01, 1e-12) && near(overlap(0.5, 0.1) / Math.PI, 0.01, 1e-12));
  check('離れていれば 0、星のふちのまん中ならおよそ半分', overlap(1.2, 0.1) === 0 && near(overlap(1, 0.1) / (Math.PI * 0.01), 0.5, 0.05));
  check('1 AU = 215 R☉（a/R* の計算で P = 1 年なら 215）', near(aOverR(365.25), 215.03, 1e-9));
  check('木星が太陽をゆらす速さ K ≈ 12.5 m/s、地球なら 0.09 m/s', near(rvK(11.862 * 365.25, M_JUP), 12.5, 0.15) && near(rvK(365.25, M_EARTH), 0.0894, 0.002));
  let tr = { P: 3.7, k: 0.1, b: 0.0, t0: 0.3 }, d = []; for (let t = 0; t < DAYS; t += CADENCE) d.push([t, fluxAt(t, tr)]);
  let r = searchPeriod(d);
  check('ノイズのないデータから周期を見つけられる（P = 3.7 日、0.5% 以内）', near(r.best.P / 3.7, 1, 0.005));
  check('折りたたんだくぼみの深さから Rp/R* = 0.1 が求まる（10% 以内）', near(Math.sqrt(r.best.depth), 0.1, 0.01));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. ←→ で周期を変えて、折りたたんだ図の点がそろう周期を自分で探そう。B の答えと比べよう
// 2. 周期の 2 倍や半分でもくぼみが見えることがある。それはなぜ？
// 3. SIGMA_N を 0.005 にすると、地球くらいの惑星（Rp/R* ≈ 0.009）は見つかる？
// 4. ↑↓ で質量を変えて K を見よう。地球の質量（0.00315 木星質量）だと何 m/s？
// 5. 減光率と K の両方がわかると、惑星の半径と質量 → 密度（岩石か、ガスか）がわかる


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
