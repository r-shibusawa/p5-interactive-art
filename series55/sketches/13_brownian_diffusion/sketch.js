// ============================================
// 13 ブラウン運動と拡散 ─ 大きな粒子が、見えない小さな分子に押されてふらつく
// 左：大きな円板（花粉の粒のつもり）と、たくさんの小さな分子の剛体円板シミュレーション。大きな粒子の道すじを記録
// 右：ランダムウォーク（毎回ランダムな向きに 1 歩）400 人。平均二乗変位 MSD = ⟨r²⟩ は時間に比例：MSD = 2dDt（d = 2 次元）
// 直線を当てはめて拡散係数 D を求める。大きな粒子の MSD も、短い時間は t²（まっすぐ進む）、長い時間は t（拡散）
// ↑↓ 温度 / M 大きな粒子の重さ / T 道すじ表示 / スペース 一時停止 / R やり直し
// ============================================

const N_SMALL = 420;                   // ★ 小さな分子の数
const R_SMALL = 3, R_BIG = 16;         // ★ 半径
const MASSES = [5, 25, 100];           // ★ 大きな粒子の質量（小さな分子 = 1）
const WALK_SIGMA = 1.5;                // ★ ランダムウォークの 1 歩の大きさ（各方向の標準偏差 px）
const N_WALK = 400;
let gas, big, massIdx = 1, paused = false, trail = true, path = [], walkers, walkT = 0, wmsd = [], kT = 1;

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); resetAll(); }
function resetAll() {
  seedRng(13);
  gas = makeBrown(N_SMALL, Math.floor(width * 0.42), height - 230, MASSES[massIdx], kT);
  big = gas.n - 1; path = [];
  walkers = new Float64Array(2 * N_WALK); walkT = 0; wmsd = [];
}
function makeBrown(n, W, H, M, t) {
  let g = makeGas(n + 1, W, H, R_SMALL, t, 1);
  let b = n; g.r[b] = R_BIG; g.m[b] = M; g.x[b] = W / 2; g.y[b] = H / 2; g.vx[b] = 0; g.vy[b] = 0;
  for (let i = 0; i < n; i++) if (Math.hypot(g.x[i] - W / 2, g.y[i] - H / 2) < R_BIG + R_SMALL + 1) { g.x[i] = 10 + rnd() * 30; g.y[i] = 10 + rnd() * (H - 20); }   // 重なった分子はどける
  gasCells(g); return g;
}
// 平均二乗変位：道すじ pts（一定時間ごと）から、ずれ lag ごとの ⟨|r(t + lag) − r(t)|²⟩
function msdOfPath(pts, lag) { let s = 0, c = 0; for (let k = 0; k + lag < pts.length; k++) { s += (pts[k + lag][0] - pts[k][0]) ** 2 + (pts[k + lag][1] - pts[k][1]) ** 2; c++; } return c ? s / c : 0; }
function fitLine(xs, ys) { let n = xs.length, sx = 0, sy = 0, sxx = 0, sxy = 0; for (let k = 0; k < n; k++) { sx += xs[k]; sy += ys[k]; sxx += xs[k] ** 2; sxy += xs[k] * ys[k]; } let d = n * sxx - sx * sx; if (n < 2 || d === 0) return null; let b = (n * sxy - sx * sy) / d; return { a: (sy - b * sx) / n, b }; }
function walkStep(w, sg) { for (let k = 0; k < w.length; k++) w[k] += sg * rndNormal(); }
function walkMSD(w) { let s = 0; for (let k = 0; k < w.length; k += 2) s += w[k] ** 2 + w[k + 1] ** 2; return s / (w.length / 2); }

function draw() {
  background(22, 22, 28);
  if (!paused) {
    gasAdvance(gas, 2);
    path.push([gas.x[big], gas.y[big]]); if (path.length > 1500) path.shift();
    walkStep(walkers, WALK_SIGMA); walkT++; wmsd.push(walkMSD(walkers));
    if (walkT >= 300) { walkers.fill(0); walkT = 0; wmsd = []; }
  }
  // ---- 分子の箱
  let bx = 20, by = 110;
  noFill(); stroke(150); strokeWeight(2); rect(bx, by, gas.W, gas.H);
  noStroke(); fill(150, 160, 190, 150);
  for (let i = 0; i < big; i++) circle(bx + gas.x[i], by + gas.y[i], 2 * R_SMALL);
  if (trail) { stroke(255, 200, 100); strokeWeight(1.5); polyline(path.map((p) => [bx + p[0], by + p[1]])); }
  noStroke(); fill(255, 140, 70); circle(bx + gas.x[big], by + gas.y[big], 2 * R_BIG);

  // ---- ランダムウォーク
  let wx = bx + gas.W + 50, ww = width - wx - 30, wh = (height - 270) / 2, cx = wx + ww * 0.25, cy = by + wh / 2;
  noFill(); stroke(70); rect(wx, by, ww * 0.5, wh);
  noStroke(); fill(130, 200, 255, 160);
  for (let k = 0; k < walkers.length; k += 2) { let x = cx + walkers[k] * 0.6, y = cy + walkers[k + 1] * 0.6; if (Math.abs(x - cx) < ww * 0.25 && Math.abs(y - cy) < wh / 2) circle(x, y, 3); }
  noFill(); stroke(255, 255, 255, 90); circle(cx, cy, 2 * Math.sqrt(walkMSD(walkers)) * 0.6);
  // MSD のグラフ（ランダムウォーク）
  let gw = { x: wx + ww * 0.5 + 60, y: by, w: ww * 0.5 - 70, h: wh, x0: 0, x1: 300, y0: 0, y1: 4 * 0.5 * WALK_SIGMA ** 2 * 300 * 1.2 };
  plotAxes(gw, '歩数 t', 'MSD ⟨r²⟩ [px²]', [0, 150, 300], [0, Math.round(gw.y1 / 2), Math.round(gw.y1)]);
  stroke(130, 200, 255); strokeWeight(2); polyline(wmsd.map((v, k) => [gX(gw, k + 1), gY(gw, v)]));
  let fw = wmsd.length > 10 ? fitLine(wmsd.map((_, k) => k + 1), wmsd) : null;
  if (fw) { stroke(255, 230, 120); strokeWeight(1); line(gX(gw, 0), gY(gw, fw.a), gX(gw, 300), gY(gw, fw.a + fw.b * 300)); }
  // MSD のグラフ（大きな粒子、両対数）
  let lags = [], ms = [];
  for (let lag = 1; lag < Math.min(400, path.length / 3); lag = Math.ceil(lag * 1.25)) { lags.push(lag); ms.push(msdOfPath(path, lag)); }
  let gb = { x: wx + 60, y: by + wh + 80, w: ww - 70, h: wh, x0: 1, x1: 400, y0: 0.1, y1: 1e5, logx: true, logy: true };
  plotAxes(gb, 'ずれの時間 τ（コマ）', '大きな粒子の MSD [px²]（両対数）', [1, 10, 100, 400], [0.1, 10, 1000, 1e5]);
  let v2 = (2 * kT) / MASSES[massIdx];   // 2 次元：⟨v²⟩ = 2kT/M、1 コマ = 時間 2
  stroke(255, 255, 255, 70); strokeWeight(1); polyline([1, 400].map((t) => [gX(gb, t), gY(gb, v2 * (2 * t) ** 2)]));
  noStroke(); fill(255, 160, 80); for (let k = 0; k < lags.length; k++) if (ms[k] > 0) circle(gX(gb, lags[k]), gY(gb, ms[k]), 7);
  let mid = lags.map((l, k) => [l, ms[k]]).filter((q) => q[0] >= 20 && q[0] <= 120 && q[1] > 0), fb = mid.length >= 3 ? fitLine(mid.map((q) => q[0]), mid.map((q) => q[1])) : null;
  if (fb && fb.b > 0) { stroke(255, 230, 120); strokeWeight(1.5); polyline([10, 300].map((t) => [gX(gb, t), gY(gb, Math.max(0.1, fb.b * t))])); }

  // ---- 文字
  noStroke(); fill(240); textSize(18); textAlign(LEFT, BASELINE);
  text('ブラウン運動と拡散　温度 kT = ' + gasTemp(gas).toFixed(2) + '　大きな粒子の質量 ' + MASSES[massIdx] + '（分子の ' + MASSES[massIdx] + ' 倍）、半径 ' + R_BIG, 20, 36);
  fill(175); textSize(15);
  text('↑↓ 温度　M 重さ　T 道すじ　スペース 停止　R やり直し　｜ 白い線 = まっすぐ進んだ場合 ⟨v²⟩t²、黄 = 拡散の直線 MSD = 4Dτ', 20, 62);
  fill(255, 220, 120);
  text('ランダムウォーク：傾き ' + (fw ? fw.b.toFixed(3) : '…') + ' → D = 傾き/4 = ' + (fw ? (fw.b / 4).toFixed(3) : '…') + '（理論 σ²/2 = ' + (WALK_SIGMA ** 2 / 2).toFixed(3) + '）　大きな粒子：D ≈ ' + (fb && fb.b > 0 ? (fb.b / 4 / 2).toFixed(3) + ' px²/時間' : '計算中…'), 20, 86);
  drawSelfTest(width - 170, height - 12);
}

function keyPressed() {
  if (key === UP_ARROW) { kT = Math.min(4, kT * 1.4); gasSetTemp(gas, kT); }
  if (key === DOWN_ARROW) { kT = Math.max(0.1, kT / 1.4); gasSetTemp(gas, kT); }
  if (key === 'm' || key === 'M') { massIdx = (massIdx + 1) % MASSES.length; resetAll(); }
  if (key === 't' || key === 'T') trail = !trail;
  if (key === ' ') paused = !paused;
  if (key === 'r' || key === 'R') resetAll();
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(130);
  let g = makeGas(2, 100, 100, 3, 1, 1); g.r[1] = 16; g.m[1] = 25; gasCells(g);
  g.x[0] = 30; g.y[0] = 50; g.vx[0] = 2; g.vy[0] = 0.5; g.x[1] = 48; g.y[1] = 53; g.vx[1] = 0; g.vy[1] = 0;
  let e0 = gasKE(g), p0 = gasMomentum(g); gasCollide(g); let p1 = gasMomentum(g);
  check('分子（質量 1）が大きな粒子（25）にぶつかる：エネルギーと運動量が保存、大きな粒子が動き出す', near(gasKE(g), e0, 1e-12) && near(p1[0], p0[0], 1e-12) && near(p1[1], p0[1], 1e-12) && g.vx[1] > 0);
  let w = new Float64Array(2 * 2000), ts = [], ys = [];
  for (let t = 1; t <= 200; t++) { walkStep(w, 1); ts.push(t); ys.push(walkMSD(w)); }
  let f = fitLine(ts, ys);
  check('ランダムウォーク 2000 人 × 200 歩（σ = 1）：MSD = 2dDt、D = σ²/2 = 0.5（当てはめ D = ' + (f.b / 4).toFixed(3) + '、5%）', Math.abs(f.b / 4 / 0.5 - 1) < 0.05);
  let L = fitLine([1, 2, 3, 4], [3, 5, 7, 9]);
  check('最小二乗：y = 1 + 2x', near(L.a, 1, 1e-12) && near(L.b, 2, 1e-12));
  let q = makeGas(300, 240, 240, 3, 1, 1), n = q.n;
  for (let k = 0; k < 200; k++) gasStep(q, 0.5);
  let x0 = Float64Array.from(q.x), y0 = Float64Array.from(q.y), m = () => { let s = 0; for (let i = 0; i < n; i++) s += (q.x[i] - x0[i]) ** 2 + (q.y[i] - y0[i]) ** 2; return s / n; };
  let ms = {}, v2 = (2 * gasKE(q)) / n; for (let k = 1; k <= 200; k++) { gasStep(q, 0.5); if ([1, 2, 100, 200].includes(k)) ms[k] = m(); }
  check('分子の MSD：短い時間は t² で増え（比 ' + (ms[2] / ms[1]).toFixed(2) + ' ≈ 4）、長い時間は t（比 ' + (ms[200] / ms[100]).toFixed(2) + ' ≈ 2）', Math.abs(ms[2] / ms[1] - 4) < 0.3 && Math.abs(ms[200] / ms[100] - 2) < 0.35);
  check('衝突があるので、長い時間の MSD = ' + ms[200].toFixed(0) + ' は、まっすぐ進んだ場合 ⟨v²⟩t² = ' + (v2 * 100 * 100).toFixed(0) + ' よりずっと小さい', ms[200] < 0.3 * v2 * 100 * 100);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 大きな粒子の道すじを見よう。分子は小さくて速いのに、大きな粒子はゆっくりふらつく
// 2. 右下の両対数グラフ：短い τ では傾き 2（白い線に沿う）、長い τ では傾き 1 になる？
// 3. M で重くすると D はどう変わる？ ↑ で温度を上げると？（アインシュタインの関係 D = kT/γ）
// 4. ランダムウォークの WALK_SIGMA を 2 倍にすると D は何倍？
// 5. インクが水にじわじわ広がるのも同じ。広がりの半径は √t に比例する


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
