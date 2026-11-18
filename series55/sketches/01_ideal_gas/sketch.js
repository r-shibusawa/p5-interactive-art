// ============================================
// 01 理想気体の状態方程式 ─ 壁にぶつかる分子から圧力を測る
// 圧力 = 壁が受けた力積（運動量の変化の合計）÷（壁の長さ × 時間）。2 次元なので「体積」は面積 A
// 1.5 秒ごとに P を測って点を打つ。理想気体なら PA = NkT（PA/(NkT) = 1）。粒子に大きさがあるぶん少しだけ 1 より大きい
// ← → / ドラッグ ピストンを動かす / ↑ ↓ 温度 / N 粒子 +20  M 粒子 −20 / H 熱浴 ON/OFF / P 定圧モード / C グラフを消す
// 熱浴 ON = 温度を一定に保つ（ボイルの法則）。OFF でピストンを押し込むと、気体が仕事をされて温まる（断熱圧縮）
// ============================================

const RAD = 3;                         // ★ 粒子の半径
const WINDOW = 90;                     // ★ 何コマごとに圧力を測るか（60 コマ ≈ 1 秒）
let nPart = 150, targetT = 1, bath = true, constP = false, pSet = 0, gas, points = [], last = null, pEst = 0, impPrev = 0, frameT = 2;
let bx = 20, by = 120;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  seedRng(3); makeBox(0.7);
}
function makeBox(frac) {
  gas = makeGas(nPart, Math.floor(width * 0.45), height - 220, RAD, targetT, 1);
  gas.wallMin = gas.W * 0.2;
  for (let i = 0; i < gas.n; i++) gas.x[i] *= frac;               // ピストンの内側にまとめる
  gas.wallX = gas.W * frac; gasResetMeter(gas); impPrev = 0; pEst = (nPart * targetT) / (gas.wallX * gas.H);
}

function draw() {
  background(22, 24, 30);
  // ---- ピストンの動き：キー・ドラッグ・定圧モード
  gas.wallU = 0;
  if (keyIsDown(LEFT_ARROW)) gas.wallU = -0.4;
  if (keyIsDown(RIGHT_ARROW)) gas.wallU = 0.4;
  if (mouseIsPressed && mouseX > bx && mouseX < bx + gas.W + 30 && mouseY > by && mouseY < by + gas.H) gas.wallU = clampv((mouseX - bx - gas.wallX) * 0.02, -0.4, 0.4);
  if (constP) gas.wallU = clampv(2 * (pEst / pSet - 1), -0.3, 0.3);   // 圧力が高すぎたら広げ、低すぎたら縮める
  gasAdvance(gas, frameT);
  if (bath) gasSetTemp(gas, targetT);
  let dImp = gas.imp - impPrev; impPrev = gas.imp;                       // その場の圧力（なめらかに）
  pEst = 0.95 * pEst + 0.05 * (dImp / (2 * (gas.wallX + gas.H) * frameT));
  if (frameCount % WINDOW === 0) {
    let P = gasPressure(gas), A = gas.wallX * gas.H, kT = gasTemp(gas);
    last = { P, A, N: gas.n, kT, Z: (P * A) / (gas.n * kT) };
    points.push(last); if (points.length > 120) points.shift();
    gasResetMeter(gas); impPrev = 0;
  }

  // ---- 箱・粒子・ピストン
  noFill(); stroke(150); strokeWeight(2); line(bx, by, bx + gas.W + 20, by); line(bx, by + gas.H, bx + gas.W + 20, by + gas.H); line(bx, by, bx, by + gas.H);
  noStroke(); fill(255, 150, 90);
  for (let i = 0; i < gas.n; i++) circle(bx + gas.x[i], by + gas.y[i], 2 * gas.r[i]);
  fill(170, 180, 200); rect(bx + gas.wallX, by + 2, 12, gas.H - 4); rect(bx + gas.wallX + 12, by + gas.H / 2 - 6, gas.W - gas.wallX + 30, 12);
  if (bath) { fill(255, 120, 60, 60); rect(bx - 12, by, 8, gas.H); }

  // ---- グラフ 1：P と A（ボイルの法則）、グラフ 2：PA/N と kT（傾き 1 の直線）
  let gx = bx + gas.W + 110, gw = width - gx - 40, gh = (height - 260) / 2;
  let g1 = { x: gx, y: by, w: gw, h: gh, x0: 0, x1: gas.W * gas.H, y0: 0, y1: Math.max(0.004, (3 * gas.n * targetT) / (gas.W * gas.H)) };
  plotAxes(g1, '面積 A', '圧力 P', [0, g1.x1 / 2, g1.x1], [0, g1.y1 / 2, g1.y1].map((v) => +v.toPrecision(2)));
  stroke(130, 200, 255); strokeWeight(2);
  polyline(Array.from({ length: 80 }, (_, k) => { let A = g1.x1 * (0.08 + (0.92 * k) / 79); return [gX(g1, A), gY(g1, (gas.n * targetT) / A)]; }));
  let g2 = { x: gx, y: by + gh + 70, w: gw, h: gh, x0: 0, x1: 3, y0: 0, y1: 3.6 };
  plotAxes(g2, '温度 kT', 'PA / N', [0, 1, 2, 3], [0, 1, 2, 3]);
  stroke(130, 200, 255); line(gX(g2, 0), gY(g2, 0), gX(g2, 3), gY(g2, 3));
  noStroke();
  for (let p of points) {
    fill(lerpColor(color(90, 160, 255), color(255, 90, 50), clampv(p.kT / 3, 0, 1)));
    circle(gX(g1, p.A), gY(g1, p.P), 8); circle(gX(g2, p.kT), gY(g2, (p.P * p.A) / p.N), 8);
  }

  // ---- 文字と表
  fill(240); textSize(18);
  text('理想気体 PA = NkT を、分子の衝突から確かめる　（2 次元、換算単位 k = m = 1）', 20, 36);
  fill(175); textSize(15);
  text('← → / ドラッグ ピストン　↑↓ 温度　N / M 粒子 ±20　H 熱浴 ' + (bath ? 'ON（等温）' : 'OFF（断熱）') + '　P 定圧 ' + (constP ? 'ON' : 'OFF') + '　C 消す', 20, 62);
  text('青い線 = 理論 P = NkT/A（いまの N と温度）。点の色 = 温度（青 低い → 赤 高い）', 20, 86);
  if (last) {
    let rows = [['P（測定）', last.P.toExponential(3)], ['A', last.A.toFixed(0)], ['N', last.N], ['kT', last.kT.toFixed(3)], ['PA / (NkT)', last.Z.toFixed(3)]];
    textSize(15);
    fill(235); text('最新の測定：' + rows.slice(0, 4).map((r) => r[0] + ' = ' + r[1]).join('　'), bx, by + gas.H + 28);
    let eta = (gas.n * Math.PI * RAD * RAD) / last.A;
    fill(255, 210, 120); text('PA / (NkT) = ' + last.Z.toFixed(3) + '　（粒子が占める割合 η = ' + (eta * 100).toFixed(1) + '%、1 + 2η = ' + (1 + 2 * eta).toFixed(3) + '）', bx, by + gas.H + 50);
    fill(170); textSize(13); text('粒子に大きさがあるぶん 1 より少し大きい。体積を小さくするほどずれる', bx, by + gas.H + 70);
  }
  drawSelfTest(width - 170, height - 12);
}

function keyPressed() {
  if (key === UP_ARROW) targetT = Math.min(3, targetT + 0.25);
  if (key === DOWN_ARROW) targetT = Math.max(0.25, targetT - 0.25);
  if (key === 'n' || key === 'N') { nPart = Math.min(400, nPart + 20); makeBox(gas.wallX / gas.W); }
  if (key === 'm' || key === 'M') { nPart = Math.max(20, nPart - 20); makeBox(gas.wallX / gas.W); }
  if (key === 'h' || key === 'H') { bath = !bath; if (bath) targetT = clampv(Math.round(gasTemp(gas) * 4) / 4, 0.25, 3); }
  if (key === 'p' || key === 'P') { constP = !constP; pSet = Math.max(1e-5, pEst); }
  if (key === 'c' || key === 'C') points = [];
  if (!bath && gasTemp(gas) > 4) gasSetTemp(gas, 4);
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(11);
  let g = makeGas(1, 100, 50, 0.5, 1, 1); g.x[0] = 30; g.y[0] = 25; g.vx[0] = 2; g.vy[0] = 0;
  for (let k = 0; k < 20000; k++) gasStep(g, 0.25);
  check('1 粒子が左右の壁を往復：右の壁の圧力 = mv²/((L − 2r)·H)（1%）', near(g.impX / (g.H * g.time) / (4 / (99 * 50)), 1, 0.01));
  let w = makeGas(100, 400, 400, 3, 1, 1);
  for (let k = 0; k < 400; k++) gasStep(w, 0.5);
  gasResetMeter(w); for (let k = 0; k < 1600; k++) gasStep(w, 0.5);
  let Z1 = (gasPressure(w) * 400 * 400) / (100 * gasTemp(w)), eta = (100 * Math.PI * 9) / 160000;
  check('100 粒子の測定：PA/(NkT) = ' + Z1.toFixed(3) + '（1 + 2η = ' + (1 + 2 * eta).toFixed(3) + ' に 6% 以内）', Math.abs(Z1 / (1 + 2 * eta) - 1) < 0.06);
  let P1 = gasPressure(w), T1 = gasTemp(w); gasSetTemp(w, 2 * T1); gasResetMeter(w); for (let k = 0; k < 1600; k++) gasStep(w, 0.5);
  check('温度を 2 倍 → 圧力もほぼ 2 倍（比 ' + (gasPressure(w) / P1).toFixed(2) + '、±12%）', Math.abs(gasPressure(w) / P1 / 2 - 1) < 0.12);
  let m = makeGas(1, 100, 50, 0.5, 1, 1); m.x[0] = 99.7; m.vx[0] = 1; m.vy[0] = 0; m.wallU = -0.5; gasWalls(m, 0, 99);
  check('近づくピストン（速さ 0.5）ではね返ると速さ 1 → 2（壁の上で見れば弾性衝突）', near(m.vx[0], -2, 1e-12));
  let a = makeGas(60, 300, 300, 2, 1, 1), TA0 = gasTemp(a) * 300 * 300;
  for (let k = 0; k < 400; k++) gasStep(a, 0.5);
  TA0 = gasTemp(a) * a.wallX * a.H; a.wallU = -0.03;
  while (a.wallX > 150.5) gasStep(a, 0.5);
  a.wallU = 0; let TA1 = gasTemp(a) * a.wallX * a.H;
  check('熱浴なしでゆっくり半分に圧縮：2 次元の気体（γ = 2）は T·A が一定（比 ' + (TA1 / TA0).toFixed(3) + '、±8%）', Math.abs(TA1 / TA0 - 1) < 0.08 && gasTemp(a) > 1.5);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 熱浴 ON のまま、ピストンを少しずつ動かして点を打とう。点は青い曲線 P = NkT/A に乗る？（ボイルの法則）
// 2. ↑ で温度を上げると、点は下のグラフの直線（傾き 1）の上を右へ動く？
// 3. P で定圧モードにして ↑ で加熱。ピストンはどう動く？ A と T の関係は？（シャルルの法則）
// 4. H で熱浴を切り、ピストンを押し込むと温度は上がる？ 自転車の空気入れが熱くなるのと同じ
// 5. N で粒子を 400 にして小さく押し込むと、PA/(NkT) は 1 からどれくらいずれる？


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
