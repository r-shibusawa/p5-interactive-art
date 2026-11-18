// ============================================
// 00 温度は分子の運動 ─ 箱の中の剛体円板と、マクスウェル-ボルツマン分布
// はじめは全部の粒子が「同じ速さ・ばらばらの向き」。ぶつかり合ううちに速さがばらつき、
// 速さのヒストグラムが 2 次元のマクスウェル-ボルツマン分布 f(v) = (mv/kT)·e^(−mv²/2kT) に近づく
// 温度 = 1 粒子あたりの平均運動エネルギー（2 次元では ⟨½mv²⟩ = kT。換算単位 k = m = 1）
// ↑ 加熱　↓ 冷却 / スペース 一時停止 / C 色（速さ ⇔ 1 色）/ クリック 近くの粒子を追いかける / R やり直し
// ============================================

const N_PART = 320;                    // ★ 粒子の数
const RAD = 4;                         // ★ 粒子の半径 [px]
const V0 = 1.5;                        // ★ はじめの速さ（全員同じ）
const TIME_PER_FRAME = 2;              // ★ 1 コマで進める時間
const BINS = 32;                       // ★ ヒストグラムの区間の数
let gas, hist = new Float64Array(BINS), vMaxPlot = 6, paused = false, colorBySpeed = true, tracked = -1, devHist = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  resetGas(1);
}
function resetGas(seed) {
  seedRng(seed);
  gas = makeGas(N_PART, Math.floor(width * 0.5), height - 150, RAD, 1, 1);
  for (let i = 0; i < gas.n; i++) { let a = rnd() * 2 * Math.PI; gas.vx[i] = V0 * Math.cos(a); gas.vy[i] = V0 * Math.sin(a); }   // 同じ速さ
  hist.fill(0); devHist = []; tracked = -1;
}
// いまの速さの分布（区間ごとの割合 ÷ 区間の幅 = 確率密度）
function speedHist(g, nb, vmax) {
  let h = new Float64Array(nb), dv = vmax / nb;
  for (let i = 0; i < g.n; i++) { let b = Math.floor(Math.hypot(g.vx[i], g.vy[i]) / dv); if (b < nb) h[b] += 1 / (g.n * dv); }
  return h;
}
// 分布のずれ = Σ |ヒストグラム − 理論| × 幅（0 なら完全に一致、最大 2）
function mbDeviation(h, kT, vmax) { let dv = vmax / h.length, s = 0; for (let b = 0; b < h.length; b++) s += Math.abs(h[b] - mb2d((b + 0.5) * dv, kT, 1)) * dv; return s; }

function draw() {
  background(24, 22, 28);
  if (!paused) gasAdvance(gas, TIME_PER_FRAME);
  let kT = gasTemp(gas);
  vMaxPlot = 4.2 * Math.sqrt(kT);
  let now = speedHist(gas, BINS, vMaxPlot);
  for (let b = 0; b < BINS; b++) hist[b] = 0.96 * hist[b] + 0.04 * now[b];          // 少しずつ平均（ゆれを小さく）
  if (!paused && frameCount % 3 === 0) { devHist.push(mbDeviation(now, kT, vMaxPlot)); if (devHist.length > 200) devHist.shift(); }

  // ---- 箱と粒子
  let bx = 20, by = 110;
  noFill(); stroke(150); strokeWeight(2); rect(bx, by, gas.W, gas.H);
  noStroke();
  let vRef = Math.sqrt(2 * kT);
  for (let i = 0; i < gas.n; i++) {
    let s = Math.hypot(gas.vx[i], gas.vy[i]) / (2 * vRef);
    if (colorBySpeed) fill(lerpColor(color(80, 150, 255), color(255, 90, 40), clampv(s, 0, 1))); else fill(200, 200, 210);
    circle(bx + gas.x[i], by + gas.y[i], 2 * gas.r[i]);
  }
  if (tracked >= 0) { noFill(); stroke(255, 240, 120); strokeWeight(2); circle(bx + gas.x[tracked], by + gas.y[tracked], 22); }

  // ---- 速さのヒストグラムと理論曲線
  let g = { x: bx + gas.W + 70, y: 120, w: width - gas.W - 120, h: height * 0.4, x0: 0, x1: vMaxPlot, y0: 0, y1: 1.1 / Math.sqrt(kT) * 0.62 + 0.05 };
  plotAxes(g, '速さ v', '確率密度', [0, vMaxPlot / 2, vMaxPlot], [0, g.y1 / 2, g.y1]);
  noStroke(); fill(255, 150, 80, 170);
  let dv = vMaxPlot / BINS;
  for (let b = 0; b < BINS; b++) { let y = gY(g, Math.min(hist[b], g.y1)); rect(gX(g, b * dv) + 1, y, g.w / BINS - 2, g.y + g.h - y); }
  stroke(130, 200, 255); strokeWeight(2.5);
  polyline(Array.from({ length: 121 }, (_, k) => { let v = (k / 120) * vMaxPlot; return [gX(g, v), gY(g, mb2d(v, kT, 1))]; }));
  stroke(255, 255, 255, 120); strokeWeight(1); let vp = Math.sqrt(kT); line(gX(g, vp), g.y, gX(g, vp), g.y + g.h);

  // ---- ずれのグラフ
  let g2 = { x: g.x, y: g.y + g.h + 80, w: g.w, h: height - (g.y + g.h + 80) - 80, x0: 0, x1: 200, y0: 0, y1: 1.6 };
  plotAxes(g2, '時間 →', '理論とのずれ Σ|f − f_MB|Δv', [], [0, 0.8, 1.6]);
  stroke(255, 210, 120); strokeWeight(2); polyline(devHist.map((d, k) => [gX(g2, k), gY(g2, d)]));

  // ---- 文字
  noStroke(); fill(240); textSize(18); textAlign(LEFT, BASELINE);
  text('温度 kT = ⟨½mv²⟩ = ' + kT.toFixed(3) + '（換算単位、1 ≈ 300 K とすると ' + (kT * 300).toFixed(0) + ' K）　全エネルギー ' + gasKE(gas).toFixed(1), 20, 36);
  fill(175); textSize(15);
  text('↑ 加熱　↓ 冷却　スペース 一時停止　C 色　クリック 粒子を追う　R やり直し（全員同じ速さから）', 20, 62);
  let mean = 0; for (let i = 0; i < gas.n; i++) mean += Math.hypot(gas.vx[i], gas.vy[i]) / gas.n;
  text('平均の速さ ' + mean.toFixed(3) + '（理論 √(πkT/2m) = ' + Math.sqrt((Math.PI * kT) / 2).toFixed(3) + '）　いちばん多い速さ √(kT/m) = ' + vp.toFixed(3) + '（白い線）', 20, 86);
  fill(130, 200, 255); text('青い線 = 理論 f(v) = (mv/kT)e^(−mv²/2kT)　橙 = 測ったヒストグラム', g.x, g.y + g.h + 52);
  if (tracked >= 0) { fill(255, 240, 120); text('追いかけている粒子の速さ ' + Math.hypot(gas.vx[tracked], gas.vy[tracked]).toFixed(2) + '（ぶつかるたびに変わる）', bx, by + gas.H + 26); }
  drawSelfTest(width - 170, height - 12);
}

function keyPressed() {
  if (key === UP_ARROW) gasSetTemp(gas, Math.min(6, gasTemp(gas) * 1.15));
  if (key === DOWN_ARROW) gasSetTemp(gas, Math.max(0.05, gasTemp(gas) / 1.15));
  if (key === ' ') paused = !paused;
  if (key === 'c' || key === 'C') colorBySpeed = !colorBySpeed;
  if (key === 'r' || key === 'R') resetGas(Date.now() % 100000);
  return false;
}
function mousePressed() {
  let best = 900, mx = mouseX - 20, my = mouseY - 110;
  tracked = -1;
  for (let i = 0; i < gas.n; i++) { let d = (gas.x[i] - mx) ** 2 + (gas.y[i] - my) ** 2; if (d < best) { best = d; tracked = i; } }
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(55);
  let g = makeGas(2, 100, 100, 5, 1, 1);
  g.x[0] = 40; g.y[0] = 50; g.vx[0] = 1; g.vy[0] = 0; g.x[1] = 49; g.y[1] = 50; g.vx[1] = -0.5; g.vy[1] = 0;
  gasPair(g, 0, 1);
  check('正面衝突（同じ質量）：速度が入れかわる', near(g.vx[0], -0.5, 1e-12) && near(g.vx[1], 1, 1e-12));
  let h = makeGas(2, 100, 100, 5, 1, 1); h.m[1] = 3; h.x[0] = 40; h.y[0] = 50; h.vx[0] = 1.2; h.vy[0] = 0.3; h.x[1] = 47; h.y[1] = 56; h.vx[1] = -0.4; h.vy[1] = 0.1;
  let e0 = gasKE(h), p0 = gasMomentum(h); gasPair(h, 0, 1); let p1 = gasMomentum(h);
  check('ななめの衝突（質量 1 と 3）：運動エネルギーと運動量が保存', near(gasKE(h), e0, 1e-12) && near(p1[0], p0[0], 1e-12) && near(p1[1], p0[1], 1e-12) && h.vx[0] !== 1.2);
  let w = makeGas(120, 260, 260, 4, 1, 1), ew = gasKE(w);
  for (let k = 0; k < 600; k++) gasStep(w, 0.5);
  check('120 粒子を 600 回進めても全エネルギーは一定（相対誤差 1e-9）', Math.abs(gasKE(w) / ew - 1) < 1e-9);
  let I = 0, V2 = 0, dv = 0.001;
  for (let v = dv / 2; v < 20; v += dv) { I += mb2d(v, 1.3, 1) * dv; V2 += v * v * mb2d(v, 1.3, 1) * dv; }
  check('理論の分布：面積 = 1、⟨v²⟩ = 2kT/m（kT = 1.3）', near(I, 1, 1e-6) && near(V2, 2.6, 1e-4));
  seedRng(7);
  let q = makeGas(150, 300, 300, 4, 1, 1);
  for (let i = 0; i < q.n; i++) { let a = rnd() * 2 * Math.PI; q.vx[i] = Math.cos(a); q.vy[i] = Math.sin(a); }
  let kq = gasTemp(q), d0 = mbDeviation(speedHist(q, 16, 4.2 * Math.sqrt(kq)), kq, 4.2 * Math.sqrt(kq)), acc = new Float64Array(16);
  for (let k = 0; k < 900; k++) { gasStep(q, 0.5); if (k >= 300 && k % 10 === 0) { let hh = speedHist(q, 16, 4.2 * Math.sqrt(kq)); for (let b = 0; b < 16; b++) acc[b] += hh[b] / 60; } }
  let d1 = mbDeviation(acc, kq, 4.2 * Math.sqrt(kq));
  check('全員同じ速さ（ずれ ' + d0.toFixed(2) + '）→ ぶつかり合うとマクスウェル分布に（ずれ ' + d1.toFixed(3) + ' < 0.16）', d0 > 1 && d1 < 0.16);
  gasSetTemp(q, 2);
  check('加熱：速さを √(2/kT) 倍にすると ⟨½mv²⟩ = kT = 2', near(gasTemp(q), 2, 1e-12));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. R を押して、はじめの「全員同じ速さ」の山が、何秒でなめらかな分布になるか見よう
// 2. ↑ で加熱すると、分布の山はどう動く？ 横に広がる？ 高さは？
// 3. 粒子を 1 つクリックして追いかけよう。1 つの粒子の速さはどれくらい変わる？
// 4. N_PART を 60 や 800 に。分布はなめらかになる？ ずれのグラフはどう変わる？
// 5. RAD を 1 にすると衝突が減る。分布に近づくまでの時間はどう変わる？


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
// ---- 剛体円板の気体（2 次元、換算単位 k = 1）。粒子どうしは弾性衝突、壁ではね返る
// 近くのペアだけ調べる「セルリスト」：箱をマス目に分け、同じマスととなりのマスの粒子とだけ比べる
function makeGas(n, W, H, r, kT, m) {
  let g = { n, W, H, wallX: W, wallU: 0, wallMin: 4 * r, x: new Float64Array(n), y: new Float64Array(n), vx: new Float64Array(n), vy: new Float64Array(n),
    r: new Float64Array(n).fill(r), m: new Float64Array(n).fill(m || 1), imp: 0, impX: 0, meterT: 0, time: 0, onHit: null, barrier: null, big: [] };
  let cols = Math.max(1, Math.ceil(Math.sqrt((n * W) / H))), rows = Math.ceil(n / cols);
  for (let i = 0; i < n; i++) {        // 格子に少しずらして並べる（重ならない）
    g.x[i] = ((i % cols) + 0.5 + 0.2 * (rnd() - 0.5)) * (W / cols); g.y[i] = (Math.floor(i / cols) + 0.5 + 0.2 * (rnd() - 0.5)) * (H / rows);
    let s = Math.sqrt(kT / g.m[i]); g.vx[i] = s * rndNormal(); g.vy[i] = s * rndNormal();
  }
  gasCells(g); return g;
}
function gasCells(g) {                 // マス目の大きさ = ふつうの粒子の直径の最大（大きな粒子は別あつかい）
  let rs = 0; g.big = [];
  for (let i = 0; i < g.n; i++) { if (g.r[i] > 2 * g.r[0]) g.big.push(i); else rs = Math.max(rs, g.r[i]); }
  g.cs = 2 * rs + 1e-9; g.nx = Math.max(1, Math.floor(g.W / g.cs)); g.ny = Math.max(1, Math.floor(g.H / g.cs));
  g.head = new Int32Array(g.nx * g.ny); g.next = new Int32Array(g.n); g.isBig = new Uint8Array(g.n); for (let b of g.big) g.isBig[b] = 1;
}
function gasPair(g, i, j) {            // 重なっていて近づいている 2 粒子を弾性衝突させる（運動量とエネルギーを保存）
  let dx = g.x[j] - g.x[i], dy = g.y[j] - g.y[i], R = g.r[i] + g.r[j], d2 = dx * dx + dy * dy;
  if (d2 >= R * R || d2 === 0) return;
  let d = Math.sqrt(d2), nx = dx / d, ny = dy / d, mi = g.m[i], mj = g.m[j];
  let vn = (g.vx[i] - g.vx[j]) * nx + (g.vy[i] - g.vy[j]) * ny;
  if (vn > 0) { let J = ((2 * mi * mj) / (mi + mj)) * vn; g.vx[i] -= (J / mi) * nx; g.vy[i] -= (J / mi) * ny; g.vx[j] += (J / mj) * nx; g.vy[j] += (J / mj) * ny; }
  let ov = R - d, wi = mj / (mi + mj), wj = mi / (mi + mj);   // 重なりを押しもどす（速度は変えない）
  g.x[i] -= nx * ov * wi; g.y[i] -= ny * ov * wi; g.x[j] += nx * ov * wj; g.y[j] += ny * ov * wj;
}
function gasCollide(g) {
  let { nx, ny, cs, head, next } = g; head.fill(-1);
  for (let i = 0; i < g.n; i++) {
    if (g.isBig[i]) continue;
    let c = clampv(Math.floor(g.x[i] / cs), 0, nx - 1) + nx * clampv(Math.floor(g.y[i] / cs), 0, ny - 1);
    next[i] = head[c]; head[c] = i;
  }
  for (let cy = 0; cy < ny; cy++) for (let cx = 0; cx < nx; cx++) {
    for (let i = head[cx + nx * cy]; i >= 0; i = next[i]) {
      for (let j = next[i]; j >= 0; j = next[j]) gasPair(g, i, j);          // 同じマス
      for (let [ox, oy] of NEIGH) {                                         // となりのマス（半分だけ = 二重に数えない）
        let ax = cx + ox, ay = cy + oy; if (ax < 0 || ax >= nx || ay >= ny) continue;
        for (let j = head[ax + nx * ay]; j >= 0; j = next[j]) gasPair(g, i, j);
      }
    }
  }
  for (let b of g.big) for (let j = 0; j < g.n; j++) if (j !== b) gasPair(g, b, j);
}
const NEIGH = [[1, 0], [-1, 1], [0, 1], [1, 1]];
function gasWalls(g, i, xOld) {        // 壁ではね返る。壁が受けた力積（運動量の変化）を数えて圧力にする
  let ri = g.r[i], mi = g.m[i], xr = g.wallX - ri, hit = 0;
  if (g.x[i] < ri) { g.x[i] = Math.min(2 * ri - g.x[i], xr); if (g.vx[i] < 0) { hit = -2 * g.vx[i]; g.vx[i] = -g.vx[i]; } }
  if (g.x[i] > xr) {                   // 右の壁はピストン（速さ wallU で動く。動く壁ではね返ると気体は仕事をする / される）
    g.x[i] = Math.max(2 * xr - g.x[i], ri);
    if (g.vx[i] > g.wallU) { let nv = 2 * g.wallU - g.vx[i]; hit = g.vx[i] - nv; g.impX += mi * hit; g.vx[i] = nv; }
  }
  if (g.y[i] < ri) { g.y[i] = Math.min(2 * ri - g.y[i], g.H - ri); if (g.vy[i] < 0) { hit = -2 * g.vy[i]; g.vy[i] = -g.vy[i]; } }
  if (g.y[i] > g.H - ri) { g.y[i] = Math.max(2 * (g.H - ri) - g.y[i], ri); if (g.vy[i] > 0) { hit = 2 * g.vy[i]; g.vy[i] = -g.vy[i]; } }
  if (hit > 0) { g.imp += mi * hit; if (g.onHit) g.onHit(i, hit / 2); }
  if (g.barrier) g.barrier(g, i, xOld);
}
function gasStep(g, dt) {
  g.wallX = clampv(g.wallX + g.wallU * dt, g.wallMin, g.W);
  for (let i = 0; i < g.n; i++) { let xo = g.x[i]; g.x[i] += g.vx[i] * dt; g.y[i] += g.vy[i] * dt; gasWalls(g, i, xo); }
  gasCollide(g); if (g.after) g.after(g);
  g.time += dt; g.meterT += dt;
}
// 1 コマ分（時間 tt）を進める。いちばん速い粒子でも 1 回に半径の 1/3 しか動かないように細かく分ける
function gasAdvance(g, tt) {
  let v2 = 0, rmin = Infinity;
  for (let i = 0; i < g.n; i++) { v2 = Math.max(v2, g.vx[i] * g.vx[i] + g.vy[i] * g.vy[i]); rmin = Math.min(rmin, g.r[i]); }
  let nsub = clampv(Math.ceil(((Math.sqrt(v2) + Math.abs(g.wallU)) * tt) / (0.33 * rmin)), 1, 60);
  for (let k = 0; k < nsub; k++) gasStep(g, tt / nsub);
}
function gasKE(g) { let e = 0; for (let i = 0; i < g.n; i++) e += 0.5 * g.m[i] * (g.vx[i] * g.vx[i] + g.vy[i] * g.vy[i]); return e; }
function gasTemp(g) { return gasKE(g) / Math.max(1, g.n); }                 // 2 次元：平均運動エネルギー ⟨½mv²⟩ = kT
function gasMomentum(g) { let px = 0, py = 0; for (let i = 0; i < g.n; i++) { px += g.m[i] * g.vx[i]; py += g.m[i] * g.vy[i]; } return [px, py]; }
function gasSetTemp(g, kT) { let f = Math.sqrt(clampv(kT, 1e-6, 1e6) / Math.max(1e-12, gasTemp(g))); for (let i = 0; i < g.n; i++) { g.vx[i] *= f; g.vy[i] *= f; } }
function gasPressure(g) { return g.imp / Math.max(1e-9, 2 * (g.wallX + g.H) * g.meterT); }   // 力積 ÷（壁の長さ × 時間）
function gasResetMeter(g) { g.imp = 0; g.impX = 0; g.meterT = 0; }
function mb2d(v, kT, m) { m = m || 1; return ((m * v) / kT) * Math.exp((-m * v * v) / (2 * kT)); }   // 2 次元のマクスウェル-ボルツマン分布（速さ）
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
