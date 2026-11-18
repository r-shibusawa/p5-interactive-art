// ============================================
// 14 熱の音 ─ 分子が壁に当たる音を聞く。音の数 = 衝突の頻度 = 圧力
// 分子が壁に当たるたびに（一部を選んで）小さな「コツ」を鳴らす。速くぶつかるほど高い音
// 温度を上げると音が細かく・高くなる。C でピストンを動かしカルノーサイクルを回すと、4 つの過程で持続音の音色が変わる
// 2 次元の分子の気体は γ = 2 なので、断熱の過程では T × 面積 が一定
// クリックで音 ON / ↑↓ 温度 / ← → 音の数（間引きの割合）/ C カルノーサイクル / M 消音 / R やり直し
// 音量は小さめから。ヘッドホンは特に注意（全体の音量 MASTER は 0.2 以下）
// ============================================

const N_PART = 160;                    // ★ 分子の数
const RAD = 4;
const MAX_CLICK = 4;                   // ★ 1 コマに鳴らす音の上限
const TH = 2, TC = 1;                  // ★ カルノーサイクルの高温・低温（kT）
let gas, clickP = 0.5, targetT = 1, carnot = false, leg = 0, muted = false, hitsFrame = [], logPA = [], rate = 0, A1 = 0;
const LEGS = ['等温膨張（Th）', '断熱膨張', '等温圧縮（Tc）', '断熱圧縮'];
const WAVES = ['sine', 'triangle', 'sine', 'square'];

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); resetGas(); }
function resetGas() {
  seedRng(14);
  gas = makeGas(N_PART, Math.floor(width * 0.5), height - 230, RAD, targetT, 1);
  gas.wallMin = gas.W * 0.25; for (let i = 0; i < gas.n; i++) gas.x[i] *= 0.45; gas.wallX = gas.W * 0.45; A1 = gas.wallX;
  gas.onHit = (i, vn) => hitsFrame.push(vn);
  carnot = false; leg = 0; logPA = [];
}
// 何個の衝突を鳴らすか：それぞれ確率 p で選び、上限 MAX_CLICK（大きな音にならないように）
function pickClicks(hits, p, maxc) { let out = []; for (let v of hits) if (rnd() < p && out.length < maxc) out.push(v); return out; }
// カルノーサイクル（面積 A = ピストンの位置）：Th で A1 → A2、断熱で Tc まで（T·A 一定 → A3 = A2·Th/Tc）、Tc で A4 = A1·Th/Tc まで、断熱で A1 へ
function carnotTargets(a1, a2, th, tc) { return { a2, a3: (a2 * th) / tc, a4: (a1 * th) / tc }; }

function draw() {
  background(20, 20, 26);
  hitsFrame = [];
  // ---- ピストンと熱浴（カルノーモード）
  gas.wallU = 0; let bath = true, tBath = targetT;
  if (carnot) {
    let a2 = Math.min(gas.W * 0.95 * TC / TH, A1 * 1.6), tg = carnotTargets(A1, a2, TH, TC), x = gas.wallX, kT = gasTemp(gas);
    if (leg === 0) { tBath = TH; gas.wallU = 0.25; if (x >= tg.a2) leg = 1; }
    else if (leg === 1) { bath = false; gas.wallU = 0.25; if (kT <= TC || x >= tg.a3 || x >= gas.W - 1) leg = 2; }
    else if (leg === 2) { tBath = TC; gas.wallU = -0.25; if (x <= tg.a4) leg = 3; }
    else { bath = false; gas.wallU = -0.25; if (x <= A1) leg = 0; }
  }
  gasAdvance(gas, 2);
  if (bath) gasSetTemp(gas, carnot ? tBath : targetT);
  if (!bath && gasTemp(gas) > 6) gasSetTemp(gas, 6);
  rate = 0.95 * rate + 0.05 * hitsFrame.length;
  let P = gasPressure(gas); if (frameCount % 10 === 0) { logPA.push([gas.wallX * gas.H, P, gasTemp(gas)]); if (logPA.length > 200) logPA.shift(); gasResetMeter(gas); }
  // ---- 音
  if (audioCtx && !muted) {
    for (let v of pickClicks(hitsFrame, clickP, MAX_CLICK)) click(250 + 220 * v, 0.25 * Math.min(1, v / 2));
    drone(carnot, 80 + 70 * gasTemp(gas), WAVES[leg]);
  }

  // ---- 箱
  let bx = 20, by = 110, kT = gasTemp(gas);
  noFill(); stroke(150); strokeWeight(2); line(bx, by, bx + gas.W, by); line(bx, by + gas.H, bx + gas.W, by + gas.H); line(bx, by, bx, by + gas.H);
  if (bath) { noStroke(); fill(carnot && tBath === TC ? color(80, 150, 255) : color(255, 110, 60)); rect(bx - 12, by, 8, gas.H); }
  noStroke(); fill(255, 160, 90);
  for (let i = 0; i < gas.n; i++) circle(bx + gas.x[i], by + gas.y[i], 2 * RAD);
  fill(180, 185, 200); rect(bx + gas.wallX, by + 2, 12, gas.H - 4);
  // 鳴った衝突の印
  fill(255, 255, 255, 120); for (let k = 0; k < Math.min(30, hitsFrame.length); k++) circle(bx + gas.W + 30 + (k % 10) * 10, by + 10 + Math.floor(k / 10) * 10, 6);

  // ---- PA 図（カルノー）と温度
  let gx = bx + gas.W + 150, gw = width - gx - 30, gh = (height - 270) / 2;
  let g1 = { x: gx, y: by, w: gw, h: gh, x0: 0, x1: gas.W * gas.H, y0: 0, y1: (N_PART * TH) / (gas.W * 0.25 * gas.H) * 1.3 };
  plotAxes(g1, '面積 A', '圧力 P（測定）', [], []);
  noStroke(); for (let k = 0; k < logPA.length; k++) { let q = logPA[k]; fill(lerpColor(color(80, 150, 255), color(255, 110, 60), clampv((q[2] - 0.8) / 1.4, 0, 1))); circle(gX(g1, q[0]), gY(g1, q[1]), 6); }
  stroke(255, 255, 255, 50); strokeWeight(1); for (let t of [TC, TH]) polyline(Array.from({ length: 60 }, (_, k) => { let A = g1.x1 * (0.2 + (0.8 * k) / 59); return [gX(g1, A), gY(g1, (N_PART * t) / A)]; }));
  let g2 = { x: gx, y: g1.y + gh + 70, w: gw, h: gh, x0: 0, x1: 200, y0: 0, y1: 3 };
  plotAxes(g2, '時間 →', '温度 kT', [], [0, 1, 2, 3]);
  stroke(255, 200, 100); strokeWeight(2); polyline(logPA.map((q, k) => [gX(g2, k), gY(g2, q[2])]));

  // ---- 文字
  noStroke(); fill(240); textSize(18); textAlign(LEFT, BASELINE);
  text('熱の音　kT = ' + kT.toFixed(2) + '　壁への衝突 ' + (rate * 60).toFixed(0) + ' 回/秒（鳴らすのはその ' + Math.round(clickP * 100) + '%）' + (carnot ? '　カルノー：' + LEGS[leg] : ''), 20, 36);
  fill(175); textSize(15);
  text((audioCtx ? (muted ? '消音中（M）' : '音 ON') : 'クリックで音 ON') + '　↑↓ 温度　← → 音の数　C カルノーサイクル ' + (carnot ? 'ON' : 'OFF') + '　M 消音　R やり直し', 20, 62);
  text('白い線 = 理想気体の等温線 P = NkT/A（Tc と Th）。点の色 = 温度。断熱では T·A が一定（2 次元、γ = 2）', 20, 86);
  drawSelfTest(width - 170, height - 12);
}

function keyPressed() {
  startAudio();
  if (key === UP_ARROW && !carnot) targetT = Math.min(4, targetT * 1.25);
  if (key === DOWN_ARROW && !carnot) targetT = Math.max(0.2, targetT / 1.25);
  if (key === RIGHT_ARROW) clickP = Math.min(1, clickP + 0.1);
  if (key === LEFT_ARROW) clickP = Math.max(0.1, clickP - 0.1);
  if (key === 'c' || key === 'C') { carnot = !carnot; leg = 0; if (carnot) { gas.wallX = A1 = gas.W * 0.3; for (let i = 0; i < gas.n; i++) gas.x[i] = Math.min(gas.x[i], A1 - RAD - 1); } }
  if (key === 'm' || key === 'M') { muted = !muted; if (muted) drone(false); }
  if (key === 'r' || key === 'R') resetGas();
  return false;
}
function mousePressed() { startAudio(); }

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(140);
  let g = makeGas(100, 300, 300, 4, 1, 1), e0 = gasKE(g), hits = 0; g.onHit = () => hits++;
  for (let k = 0; k < 800; k++) gasStep(g, 0.5);
  check('壁と分子の衝突：800 ステップで全エネルギーは一定', Math.abs(gasKE(g) / e0 - 1) < 1e-9);
  let h1 = hits; hits = 0; gasSetTemp(g, 4 * gasTemp(g)); for (let k = 0; k < 800; k++) gasStep(g, 0.5);
  check('温度を 4 倍 → 速さは 2 倍 → 壁に当たる回数もほぼ 2 倍（' + (hits / h1).toFixed(2) + '、±15%）', Math.abs(hits / h1 / 2 - 1) < 0.15);
  check('音の数の上限：衝突が 100 回でも鳴らすのは ' + MAX_CLICK + ' 回まで', pickClicks(new Array(100).fill(1), 1, MAX_CLICK).length === MAX_CLICK);
  let t = carnotTargets(100, 150, 2, 1);
  check('2 次元のカルノー：断熱で T·A 一定 → 2 つの等温の過程の面積の比が等しい（A2/A1 = A3/A4）', near(t.a2 / 100, t.a3 / t.a4, 1e-12) && near(2 * t.a2, 1 * t.a3, 1e-12));
  check('音量の上限：全体 MASTER ≤ 0.2', MASTER <= 0.2);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. ↑ で温度を上げよう。音の細かさ（回数）と高さはどう変わる？ 回数は √T に比例するはず
// 2. C でカルノーサイクルを回し、4 つの過程の音色のちがいを聞こう。断熱のときは温度（音の高さ）が変わる
// 3. PA 図の点は、Th と Tc の等温線の間を 1 周する？
// 4. N_PART を 2 倍にすると、衝突の回数（= 圧力）は何倍？
// 5. 音の高さの式 250 + 220·v を変えて、自分の「気体の音」を作ろう


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
// ---- 音の道具（Web Audio）。音量の上限：全体の音量 MASTER は 0.2 以下
const MASTER = 0.12;                   // ★ 全体の音量（0.2 以下にしておく）
let audioCtx = null, masterOut = null, droneOsc = null, droneGain = null;
function startAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    masterOut = audioCtx.createGain(); masterOut.gain.value = Math.min(0.2, MASTER); masterOut.connect(audioCtx.destination);
  }
  audioCtx.resume();
}
function click(freq, vol) {            // 短い「コツ」（15 ms）
  if (!audioCtx) return;
  let t0 = audioCtx.currentTime + Math.random() * 0.016, o = audioCtx.createOscillator(), gn = audioCtx.createGain();
  o.type = 'sine'; o.frequency.value = clampv(freq, 100, 3000);
  gn.gain.setValueAtTime(0, t0); gn.gain.linearRampToValueAtTime(clampv(vol, 0, 1) * 0.5, t0 + 0.002); gn.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.015);
  o.connect(gn); gn.connect(masterOut); o.start(t0); o.stop(t0 + 0.03);
}
function drone(on, freq, wave) {       // カルノーサイクル中の持続音（過程ごとに音色）
  if (!audioCtx) return;
  if (!droneOsc) {
    droneOsc = audioCtx.createOscillator(); droneGain = audioCtx.createGain(); let lp = audioCtx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 900; droneGain.gain.value = 0;
    droneOsc.connect(lp); lp.connect(droneGain); droneGain.connect(masterOut); droneOsc.start();
  }
  if (wave && droneOsc.type !== wave) droneOsc.type = wave;
  if (freq) droneOsc.frequency.setTargetAtTime(clampv(freq, 50, 800), audioCtx.currentTime, 0.05);
  droneGain.gain.setTargetAtTime(on ? 0.12 : 0, audioCtx.currentTime, 0.1);
}
