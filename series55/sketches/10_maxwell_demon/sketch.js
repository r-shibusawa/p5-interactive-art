// ============================================
// 10 マクスウェルの悪魔 ─ 速い分子だけを右へ通すと、温度差が生まれる？
// 仕切りの扉の前に来た分子の速さを悪魔が測り、速い分子は左→右、遅い分子は右→左だけ通す（ほかははね返す）
// 右が熱く、左が冷たくなり、気体のエントロピーは減る。でも悪魔は 1 回測るごとに 1 ビットを記憶する
// 記憶を消すには 1 ビットあたり kT ln 2 の熱が出る（ランダウアーの原理）→ 合計のエントロピーは減らない（第二法則）
// スペース 悪魔 ON/OFF / A 自動 ⇔ 手動（手動はマウスを押している間だけ扉が開く）/ ↑↓ 速さのしきい値 / R 最初から
// ============================================

const N_PART = 220;                    // ★ 分子の数
const RAD = 3;                         // ★ 分子の半径
const DOOR = 70;                       // ★ 扉の高さ [px]
let gas, demonOn = true, auto = true, thr = 1, bits = 0, passed = 0, s0 = 0, logT = [], logS = [], T0 = 1;

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); resetDemon(4); }
function resetDemon(seed) {
  seedRng(seed);
  gas = makeDemonGas(N_PART, Math.floor(width * 0.5), height - 230);
  T0 = gasTemp(gas); s0 = gasEntropy(gas); bits = 0; passed = 0; logT = []; logS = [];
}
function makeDemonGas(n, W, H) {
  let g = makeGas(n, W, H, RAD, 1, 1);
  g.barrier = (g, i, xo) => {          // 仕切り（x = W/2）を横切ろうとしたら、扉の所だけ悪魔が判断する
    let mid = g.W / 2, x = g.x[i];
    if ((xo < mid) === (x < mid)) return;
    let inDoor = Math.abs(g.y[i] - g.H / 2) < DOOR / 2, open = false;
    if (inDoor && g.demon) {
      g.bits++;                        // 1 回測った = 1 ビット記憶
      let v = Math.hypot(g.vx[i], g.vy[i]), fast = v > g.thr;
      open = g.auto ? (xo < mid ? fast : !fast) : g.manualOpen;
    } else if (inDoor && g.free) open = true;
    if (open) { g.passed++; g.side[i] = x < mid ? 0 : 1; } else { g.x[i] = 2 * mid - x; g.vx[i] = -g.vx[i]; }
  };
  g.side = new Uint8Array(n); for (let i = 0; i < n; i++) g.side[i] = g.x[i] < W / 2 ? 0 : 1;
  g.after = (g) => {                   // 衝突の押しもどしで仕切りをすりぬけた分子は、元の側へもどす
    for (let i = 0; i < g.n; i++) if ((g.x[i] < g.W / 2 ? 0 : 1) !== g.side[i]) g.x[i] = g.W - g.x[i];
  };
  g.demon = true; g.auto = true; g.thr = 1.4; g.bits = 0; g.passed = 0; g.manualOpen = false; g.free = false;
  return g;
}
// 左右それぞれの数・温度と、2 次元の理想気体のエントロピー S = N[ln(A/N) + ln T]（k = 1、定数は省く）
function sides(g) {
  let n = [0, 0], e = [0, 0];
  for (let i = 0; i < g.n; i++) { let s = g.x[i] < g.W / 2 ? 0 : 1; n[s]++; e[s] += 0.5 * (g.vx[i] ** 2 + g.vy[i] ** 2); }
  return { n, t: [e[0] / Math.max(1, n[0]), e[1] / Math.max(1, n[1])] };
}
function sIdeal(N, A, T) { return N > 0 ? N * (Math.log(A / N) + Math.log(Math.max(T, 1e-9))) : 0; }
function gasEntropy(g) { let s = sides(g), A = (g.W / 2) * g.H; return sIdeal(s.n[0], A, s.t[0]) + sIdeal(s.n[1], A, s.t[1]); }

function draw() {
  background(22, 22, 28);
  gas.demon = demonOn; gas.auto = auto; gas.thr = thr * Math.sqrt(2 * T0) * 0.886; gas.manualOpen = mouseIsPressed;
  gasAdvance(gas, 2);
  let sd = sides(gas), dS = gasEntropy(gas) - s0;
  bits = gas.bits; passed = gas.passed;
  if (frameCount % 3 === 0) { logT.push([sd.t[0], sd.t[1]]); logS.push([-dS, bits * Math.LN2]); if (logT.length > 300) { logT.shift(); logS.shift(); } }

  // ---- 箱
  let bx = 20, by = 120, mid = bx + gas.W / 2, d0 = by + gas.H / 2 - DOOR / 2;
  noStroke(); fill(60, 90, 160, 50); rect(bx, by, gas.W / 2, gas.H); fill(200, 80, 50, 50); rect(mid, by, gas.W / 2, gas.H);
  noFill(); stroke(150); strokeWeight(2); rect(bx, by, gas.W, gas.H);
  stroke(230); strokeWeight(4); line(mid, by, mid, d0); line(mid, d0 + DOOR, mid, by + gas.H);
  if (!demonOn) line(mid, d0, mid, d0 + DOOR);
  noStroke();
  let vRef = Math.sqrt(2 * T0);
  for (let i = 0; i < gas.n; i++) { let s = Math.hypot(gas.vx[i], gas.vy[i]); fill(s > gas.thr ? color(255, 120, 70) : color(110, 170, 255)); circle(bx + gas.x[i], by + gas.y[i], 2 * RAD); }
  // 悪魔
  fill(170, 90, 220); circle(mid, d0 - 24, 26); triangle(mid - 12, d0 - 30, mid - 6, d0 - 34, mid - 14, d0 - 44); triangle(mid + 12, d0 - 30, mid + 6, d0 - 34, mid + 14, d0 - 44);
  fill(255); circle(mid - 5, d0 - 26, 6); circle(mid + 5, d0 - 26, 6); fill(240); textSize(13); text('悪魔', mid + 18, d0 - 20);

  // ---- グラフ：左右の温度、エントロピーの収支
  let gx = bx + gas.W + 70, gw = width - gx - 30, gh = (gas.H - 80) / 2;
  let g1 = { x: gx, y: by, w: gw, h: gh, x0: 0, x1: 300, y0: 0, y1: 2.5 * T0 };
  plotAxes(g1, '時間 →', '温度 kT（左 青・右 赤）', [], [0, T0, 2 * T0].map((v) => +v.toFixed(2)));
  strokeWeight(2); stroke(110, 170, 255); polyline(logT.map((v, k) => [gX(g1, k), gY(g1, v[0])])); stroke(255, 120, 70); polyline(logT.map((v, k) => [gX(g1, k), gY(g1, v[1])]));
  let smax = Math.max(5, ...logS.map((v) => Math.max(v[0], v[1])));
  let g2 = { x: gx, y: g1.y + gh + 80, w: gw, h: gh, x0: 0, x1: 300, y0: Math.min(0, ...logS.map((v) => v[0])), y1: smax * 1.1 };
  plotAxes(g2, '時間 →', 'エントロピー（k = 1）', [], [0, Math.round(smax)]);
  strokeWeight(2); stroke(255, 200, 100); polyline(logS.map((v, k) => [gX(g2, k), gY(g2, v[0])])); stroke(200, 140, 255); polyline(logS.map((v, k) => [gX(g2, k), gY(g2, v[1])]));
  noStroke(); textSize(13); fill(255, 200, 100); text('気体のエントロピーの減少 −ΔS_気体', g2.x + 8, g2.y + 16); fill(200, 140, 255); text('記憶を消すコスト ビット数 × ln 2', g2.x + 8, g2.y + 34);

  // ---- 文字
  fill(240); textSize(18);
  text('マクスウェルの悪魔　' + (demonOn ? (auto ? '自動（速い → 右、遅い → 左だけ通す）' : '手動（マウスを押すと扉が開く）') : '扉は閉じている（スペースで悪魔 ON）') + '　しきい値の速さ ' + gas.thr.toFixed(2), 20, 36);
  fill(175); textSize(15);
  text('スペース 悪魔 ON/OFF　A 自動 ⇔ 手動　↑↓ しきい値　R 最初から　｜ 赤い分子 = しきい値より速い、青 = 遅い', 20, 62);
  let total = -dS <= bits * Math.LN2;
  fill(255, 210, 120);
  text('左 ' + sd.n[0] + ' 個 kT = ' + sd.t[0].toFixed(3) + '　右 ' + sd.n[1] + ' 個 kT = ' + sd.t[1].toFixed(3) + '　ΔS_気体 = ' + dS.toFixed(2) + '　記憶 ' + bits + ' ビット → 消すと ' + (bits * Math.LN2).toFixed(1) + ' k　合計 ' + (dS + bits * Math.LN2).toFixed(1) + (total ? ' ≥ 0 ✓' : ''), 20, 86);
  fill(170); textSize(13); text('ビットとエントロピーの関係は「情報理論」のシリーズ 6 とつながる（1 ビット = ln 2）', bx, by + gas.H + 28);
  drawSelfTest(width - 170, height - 12);
}

function keyPressed() {
  if (key === ' ') demonOn = !demonOn;
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === UP_ARROW) thr = Math.min(2, thr + 0.1);
  if (key === DOWN_ARROW) thr = Math.max(0.3, thr - 0.1);
  if (key === 'r' || key === 'R') resetDemon(Date.now() % 1000);
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(10);
  let g = makeDemonGas(120, 300, 240); g.demon = false; let s = sides(g), e0 = gasKE(g);
  for (let k = 0; k < 1500; k++) gasStep(g, 0.5);
  let s2 = sides(g);
  check('扉を閉じたまま：左右の数は変わらず、全エネルギーも一定', s.n[0] === s2.n[0] && s.n[1] === s2.n[1] && Math.abs(gasKE(g) / e0 - 1) < 1e-9);
  check('エントロピーは示量的：S(2N, 2A, T) = 2·S(N, A, T)（同じ気体を半分に仕切っても ΔS = 0）、熱い側へ熱を移すと S は減る', near(sIdeal(200, 2000, 1.3), 2 * sIdeal(100, 1000, 1.3), 1e-9) && sIdeal(100, 1000, 0.8) + sIdeal(100, 1000, 1.2) < 2 * sIdeal(100, 1000, 1));
  let d = makeDemonGas(120, 300, 240), sd0 = gasEntropy(d), tt = gasTemp(d); d.thr = Math.sqrt(2 * tt) * 0.886;
  for (let k = 0; k < 6000; k++) gasStep(d, 0.5);
  let sd = sides(d), dS = gasEntropy(d) - sd0;
  check('自動の悪魔：右が熱く左が冷たくなる（右 ' + sd.t[1].toFixed(2) + ' / 左 ' + sd.t[0].toFixed(2) + ' > 1.15）', sd.t[1] / sd.t[0] > 1.15);
  check('気体のエントロピーは減る（ΔS = ' + dS.toFixed(2) + '）が、記憶 ' + d.bits + ' ビット × ln 2 = ' + (d.bits * Math.LN2).toFixed(1) + ' のほうが大きい', dS < 0 && d.bits * Math.LN2 >= -dS);
  check('ランダウアーの限界：300 K で kT ln 2 = 2.87 × 10⁻²¹ J', near(1.380649e-23 * 300 * Math.LN2, 2.871e-21, 1e-24));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. しばらく待って、左右の温度の差を見よう。冷蔵庫なしで温度差ができた！？
// 2. 下のグラフで、気体のエントロピーの減少と、記憶を消すコストを比べよう。どちらが大きい？
// 3. A で手動にして、自分で悪魔になろう（赤い分子が来たときだけマウスを押す）。うまく分けられる？
// 4. ↑↓ でしきい値を変えると、温度差のでき方は？ 測る回数（ビット）は？
// 5. 情報を消すとなぜ熱が出るのか、シリーズ 6（通信理論）のエントロピーとくらべて考えよう


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
