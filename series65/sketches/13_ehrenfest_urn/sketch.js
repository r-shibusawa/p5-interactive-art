// ============================================
// 13 エーレンフェストの壺 ─ 2 つの壺 A・B に玉が全部で N 個。毎回、N 個の中から 1 個をでたらめに選んで、反対の壺へ移す
// 状態 k = A の玉の数。A が多いほど A から出やすいので、k は半分（N/2）に引き戻される。平均は (1 − 2/N) 倍ずつ N/2 に近づく。
// 定常分布は 2 項分布 π_k = C(N, k) / 2^N（玉 1 個ずつが半々でどちらかにいる）。
// カックの公式：状態 k に戻るまでの平均の時間 = 1/π_k。全部が A に集まった状態（k = N）に戻るには平均 2^N 回！
// k は毎回 ±1 なので偶奇が交互（周期 2）。n 回後の分布は収束せず振動するが、時間平均の割合は 2 項分布に近づく
// ↑↓ 玉の数 N / F 速さ / スペース 一時停止 / R 全部 A から
// （熱の逆戻りしない向き・エントロピーの話はシリーズ 55 へ。混ざった気体がひとりでに分かれないのは、戻る時間が天文学的だから）
// ============================================

let nBalls = 20;                         // ★ 玉の数 N（2〜60、偶数）
const SPEEDS = ['ゆっくり（動きが見える）', '1 回/フレーム', '100 回/フレーム', '全力'];
const ANIM = 16;                         // ★ ゆっくりのとき、玉が移る時間（フレーム）
let speedIdx = 0, paused = false;
let urnA = [], urnB = [], kNow = 0, tNow = 0, kTrace = [], occ = [], pExact = [], moving = null, returnsMid = [], lastMidT = -1, ehrP = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  seedRng(13); restart();
}
function restart() {
  urnA = []; urnB = []; for (let i = 0; i < nBalls; i++) urnA.push(i);
  kNow = nBalls; tNow = 0; kTrace = [kNow]; occ = new Array(nBalls + 1).fill(0); moving = null; returnsMid = []; lastMidT = -1;
  ehrP = ehrenfestMatrix(nBalls); pExact = new Array(nBalls + 1).fill(0); pExact[nBalls] = 1;
}
// ★ 遷移行列：k → k − 1 は確率 k/N（A の玉が選ばれる）、k → k + 1 は (N − k)/N
function ehrenfestMatrix(n) {
  let m = zerosMat(n + 1);
  for (let k = 0; k <= n; k++) { if (k > 0) m[k][k - 1] = k / n; if (k < n) m[k][k + 1] = (n - k) / n; }
  return m;
}
function binomPmf(n) {                   // C(n, k) / 2^n を対数で（大きな N でもあふれない）
  let out = [], lc = 0;
  for (let k = 0; k <= n; k++) { if (k > 0) lc += Math.log(n - k + 1) - Math.log(k); out.push(Math.exp(lc - n * Math.LN2)); }
  return out;
}
function ehrStep(k, n) { return rnd() < k / n ? k - 1 : k + 1; }   // 1 回（玉の番号は気にしない版）

function moveOne() {                     // 玉を 1 個選んで反対へ
  let id = rndInt(0, nBalls - 1), fromA = urnA.includes(id), before = ballPos(id);
  if (fromA) { urnA.splice(urnA.indexOf(id), 1); urnB.push(id); kNow--; } else { urnB.splice(urnB.indexOf(id), 1); urnA.push(id); kNow++; }
  tNow++; occ[kNow]++; kTrace.push(kNow); if (kTrace.length > 2000) kTrace.shift();
  if (kNow === nBalls / 2) { if (lastMidT >= 0) returnsMid.push(tNow - lastMidT); lastMidT = tNow; }
  if (tNow <= 3000) pExact = vecMat(pExact, ehrP);
  if (speedIdx === 0) moving = { id, from: before, t: 0 };
}
let urnBox = null;
function ballPos(id) {                   // 玉の場所（壺の中の何番目か）
  if (!urnBox) return [0, 0];
  let inA = urnA.indexOf(id), list = inA >= 0 ? 0 : 1, slot = inA >= 0 ? inA : urnB.indexOf(id), u = urnBox[list], cols = 6, cell = u.w / cols;
  return [u.x + (slot % cols) * cell + cell / 2, u.y + u.h - cell / 2 - Math.floor(slot / cols) * cell];
}

function draw() {
  background(...BG);
  if (!paused) {
    if (speedIdx === 0) { if (!moving) moveOne(); else if (++moving.t >= ANIM) moving = null; }
    else if (speedIdx === 1) moveOne();
    else if (speedIdx === 2) for (let k = 0; k < 100; k++) moveOne();
    else { let t0 = performance.now(); while (performance.now() - t0 < 6) for (let k = 0; k < 100; k++) moveOne(); }
  }
  hudTitle('エーレンフェストの壺：N = ' + nBalls + '　' + tNow + ' 回目　A の玉 k = ' + kNow, '↑↓ 玉の数 N　F 速さ（' + SPEEDS[speedIdx] + '）　スペース ' + (paused ? '再開' : '一時停止') + '　R 全部 A から');

  // ---- 2 つの壺と玉
  let lw = width * 0.5, uw = Math.min(200, lw * 0.36), uh = (uw / 6) * 10 + 10;
  urnBox = [{ x: 60, y: 100, w: uw, h: uh }, { x: 60 + uw + 90, y: 100, w: uw, h: uh }];
  for (let s = 0; s < 2; s++) {
    let u = urnBox[s]; stroke(...CREAM); strokeWeight(3); noFill();
    polyline([[u.x - 6, u.y], [u.x - 6, u.y + u.h + 6], [u.x + u.w + 6, u.y + u.h + 6], [u.x + u.w + 6, u.y]]);
    noStroke(); fill(...CREAM); textSize(18); textAlign(CENTER, BASELINE); text((s ? 'B' : 'A') + '：' + (s ? nBalls - kNow : kNow) + ' 個', u.x + u.w / 2, u.y + u.h + 32);
  }
  let rb = (uw / 6) * 0.8;
  for (let i = 0; i < nBalls; i++) {
    let p = ballPos(i);
    if (moving && moving.id === i) { let t = moving.t / ANIM; p = [moving.from[0] + (p[0] - moving.from[0]) * t, moving.from[1] + (p[1] - moving.from[1]) * t - Math.sin(Math.PI * t) * 80]; }
    noStroke(); fill(...(i % 2 ? TEAL : DICE)); circle(p[0], p[1], rb);
  }

  // ---- k の時間変化
  let g = { x: 60, y: urnBox[0].y + uh + 80, w: lw - 80, h: height - (urnBox[0].y + uh + 80) - 60, x0: 0, x1: 600, y0: 0, y1: nBalls };
  plotAxes(g, '最近の 600 回', 'A の玉の数 k（点線 = N/2、黄 = 平均の理論 N/2 + (N − N/2)(1 − 2/N)^t）', [0, 300, 600], [0, nBalls / 2, nBalls]);
  stroke(...SUB); strokeWeight(1); drawingContext.setLineDash([4, 4]); line(g.x, gY(g, nBalls / 2), g.x + g.w, gY(g, nBalls / 2)); drawingContext.setLineDash([]);
  let tail = kTrace.slice(-600), t0 = tNow - (tail.length - 1);
  if (t0 === 0) { let th = []; for (let t = 0; t < tail.length; t++) th.push(nBalls / 2 + (nBalls / 2) * Math.pow(1 - 2 / nBalls, t)); drawCurve(g, th, MUSTARD, 2); }
  drawCurve(g, tail, TEAL, 1.5);

  // ---- 右：時間平均の割合 と 2 項分布、n 回後の分布（正確）
  let rx = lw + 30, rw = width - rx - 40, pi = binomPmf(nBalls), top = Math.max(...pi) * 1.25;
  noStroke(); fill(...CREAM); textSize(15); textAlign(LEFT, BASELINE);
  text('時間平均：k にいた割合（' + tNow + ' 回）　線 = 2 項分布 C(N, k)/2^N', rx, 110);
  let tot = Math.max(1, sumOf(occ)), bw = rw / (nBalls + 1);
  drawBars(rx, 120, rw, 150, occ.map((v) => v / tot), [DICE], top);
  stroke(...CREAM); strokeWeight(2); polyline(pi.map((v, k) => [rx + (k + 0.5) * bw, 120 + 150 - clampv(v / top, 0, 1) * 150]));
  noStroke(); fill(...CREAM); textSize(15); textAlign(LEFT, BASELINE);
  let tShow = Math.min(tNow, 3000);
  text('n = ' + tShow + ' 回後の分布（全部 A から、行列で正確に）：偶奇で交互', rx, 310);
  drawBars(rx, 320, rw, 110, pExact, [TEAL], top * 2);
  fill(...SUB); textSize(12); textAlign(LEFT, TOP); text('k = 0', rx, 434); textAlign(RIGHT, TOP); text('k = N', rx + rw, 434);

  // ---- カックの公式
  let ky = 480, back = Math.pow(2, nBalls), mid = 1 / pi[nBalls / 2];
  textAlign(LEFT, BASELINE); fill(...MUSTARD); textSize(16);
  text('全部 A（k = N）に戻るまでの平均 = 1/π_N = 2^' + nBalls + ' = ' + (back < 1e9 ? Math.round(back).toLocaleString() : back.toExponential(2)) + ' 回', rx, ky);
  fill(...CREAM); textSize(15);
  text('1 秒に 1 回なら ' + humanTime(back), rx, ky + 26);
  text('半分（k = N/2）に戻るまでの平均 = 1/π_(N/2) = ' + fmtN(mid, 2) + ' 回', rx, ky + 56);
  text('　シミュレーション：' + (returnsMid.length ? fmtN(meanOf(returnsMid), 2) + '（' + returnsMid.length + ' 回の平均）' : '—'), rx, ky + 80);
  fill(...SUB); textSize(13);
  text('「元に戻る」ことはいつかは必ず起きるが、N = 60 ならその間に宇宙が何度も終わる', rx, ky + 108);
  drawSelfTest(width - 180, height - 14);
}
function humanTime(sec) {                // 秒をわかりやすく
  if (sec < 120) return Math.round(sec) + ' 秒';
  if (sec < 7200) return fmtN(sec / 60, 1) + ' 分';
  if (sec < 172800) return fmtN(sec / 3600, 1) + ' 時間';
  let yr = sec / (365.25 * 86400);
  if (yr < 1) return fmtN(sec / 86400, 1) + ' 日';
  return (yr < 1e6 ? fmtN(yr, 1) : yr.toExponential(2)) + ' 年' + (yr > 1.38e10 ? '（宇宙の年齢 138 億年より長い）' : '');
}

function keyPressed() {
  if (key === UP_ARROW) { nBalls = Math.min(60, nBalls + 2); restart(); }
  if (key === DOWN_ARROW) { nBalls = Math.max(2, nBalls - 2); restart(); }
  if (key === 'f' || key === 'F') { speedIdx = (speedIdx + 1) % SPEEDS.length; moving = null; }
  if (key === ' ') paused = !paused;
  if (key === 'r' || key === 'R') restart();
  return false;
}

// ============================================
// やってみよう
// ・N = 4 にして全力で回す。全部 A に戻るのは平均 16 回に 1 回。N = 10 なら 1024 回、N = 20 なら？
// ・「n 回後の分布」の棒が 1 つおきになるのはなぜ？（k の偶奇は毎回入れかわる）
// ・時間平均の棒と 2 項分布の線、N が大きいほど山が細くなる（幅は √N、割合 k/N で見ると 1/√N）
// ・ehrStep を「半分の確率で何もしない」（怠惰な連鎖）に変えると、n 回後の分布も収束する。試してみよう
// ============================================

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let n = 20, m = ehrenfestMatrix(n), pi = binomPmf(n);
  check('遷移行列の各行の合計 = 1（N = 20）', rowSumErr(m) < 1e-12);
  check('定常分布 = 2 項分布 C(20, k)/2^20：π P = π、連立方程式の解と一致', maxAbsDiff(vecMat(pi, m), pi) < 1e-15 && maxAbsDiff(stationaryExact(m), pi) < 1e-10);
  let cl = classifyChain(m);
  check('既約で周期 2（タージャン + gcd）', cl.irreducible && cl.classes[0].period === 2);
  check('カック：全部 A に戻るまでの平均 1/π_N = 2^20 = 1,048,576（ぴったり）', 1 / pi[n] === 1048576 && 1 / pi[0] === 1048576);
  // n 回後の分布は振動（収束しない）、時間平均（チェザロ平均）は 2 項分布へ
  let p = new Array(n + 1).fill(0), avg = new Array(n + 1).fill(0), T = 4000, okMean = true; p[n] = 1;
  for (let t = 1; t <= T; t++) {
    p = vecMat(p, m); for (let k = 0; k <= n; k++) avg[k] += p[k] / T;
    if (t <= 60) { let mean = p.reduce((s, v, k) => s + v * k, 0); if (Math.abs(mean - (n / 2 + (n / 2) * Math.pow(1 - 2 / n, t))) > 1e-9) okMean = false; }
  }
  check('平均 E[k_t] = N/2 + (N/2)(1 − 2/N)^t（60 回まで 1e-9）', okMean);
  check('n 回後の分布は 1 つおき（全変動距離 ' + fmtN(tvDist(p, pi), 2) + ' のまま）、時間平均は 2 項分布へ（' + tvDist(avg, pi).toExponential(1) + '）', tvDist(p, pi) > 0.4 && tvDist(avg, pi) < 0.01);
  // シミュレーション：N = 6 で k = 0 に戻るまでの平均 ≈ 2^6 = 64、N = 10 の時間平均 ≈ 2 項分布
  seedRng(1301); let k = 0, last = 0, rets = [];
  for (let t = 1; t <= 400000; t++) { k = ehrStep(k, 6); if (k === 0) { rets.push(t - last); last = t; } }
  let mr = meanOf(rets), sd = Math.sqrt(meanOf(rets.map((v) => (v - mr) ** 2))), se = sd / Math.sqrt(rets.length);
  check('N = 6：空の壺 A（k = 0）に戻るまでの平均 ' + fmtN(mr, 2) + ' ≈ 64（' + rets.length + ' 回、許容 4 SE）', Math.abs(mr - 64) < 4 * se);
  let oc = new Array(11).fill(0); k = 10;
  for (let t = 0; t < 200000; t++) { k = ehrStep(k, 10); oc[k]++; }
  check('N = 10：時間平均の割合 ≈ 2 項分布（全変動距離 < 0.02）', tvDist(oc.map((v) => v / 200000), binomPmf(10)) < 0.02);
  check('N = 60 でも π に NaN なし、合計 = 1', noNaN(binomPmf(60)) && near(sumOf(binomPmf(60)), 1, 1e-12));
  reportSelfTest();
}

// ==================================================
// ここから下は「マルコフ連鎖の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 色と小さな道具
const BG = [32, 28, 26];                // 背景（あたたかい炭色）
const CREAM = [246, 236, 214], DICE = [236, 96, 58], TEAL = [44, 178, 166], MUSTARD = [236, 190, 82], PLUM = [190, 130, 200], SUB = [190, 178, 160];
const STATE_COLS = [[236, 96, 58], [44, 178, 166], [236, 190, 82], [190, 130, 200], [120, 190, 240], [150, 210, 110], [240, 140, 170], [200, 170, 130]];
function clampv(v, a, b) { return v < a ? a : v > b ? b : v !== v ? a : v; }     // NaN なら a に戻す
function sumOf(a) { let s = 0; for (let v of a) s += v; return s; }
function meanOf(a) { return a.length ? sumOf(a) / a.length : 0; }
function sampleFrom(p) { let u = rnd() * sumOf(p), c = 0; for (let i = 0; i < p.length; i++) { c += p[i]; if (u < c) return i; } return p.length - 1; }   // 確率 p[i] で i を返す
function fmtN(v, d) { if (typeof v !== 'number' || v !== v) return '?'; if (!isFinite(v)) return '∞'; let s = v.toFixed(d === undefined ? 2 : d); return /^-0\.?0*$/.test(s) ? s.slice(1) : s; }
function hudTitle(t, sub) {            // 左上の見出しと操作の説明
  noStroke(); fill(...CREAM); textSize(22); textAlign(LEFT, BASELINE); text(t, 40, 42);
  fill(...SUB); textSize(15); text(sub, 40, 68);
}
// ---- 種つきの乱数（同じ種なら毎回同じ列 → 実験をくり返せる）
let rngState = 1;
function seedRng(s) { rngState = (s >>> 0) || 1; }
function rnd() {                       // 0〜1 の一様乱数（mulberry32）
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rndInt(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
function randn() { let u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }   // 標準正規分布
// ---- 行列の道具（行列 = 配列の配列。遷移行列 transP[i][j] = i の次に j へ行く確率、行の和 = 1）
function zerosMat(n, m) { let a = []; for (let i = 0; i < n; i++) a.push(new Array(m === undefined ? n : m).fill(0)); return a; }
function eyeMat(n) { let a = zerosMat(n); for (let i = 0; i < n; i++) a[i][i] = 1; return a; }
function copyMat(a) { return a.map((r) => r.slice()); }
function matMul(a, b) {                // 行列の積 (a b)[i][j] = Σ_k a[i][k] b[k][j]
  let n = a.length, m = b[0].length, kk = b.length, c = zerosMat(n, m);
  for (let i = 0; i < n; i++) for (let k = 0; k < kk; k++) { let v = a[i][k]; if (v !== 0) for (let j = 0; j < m; j++) c[i][j] += v * b[k][j]; }
  return c;
}
function vecMat(v, a) {                // 横ベクトル × 行列：次の時刻の分布 = いまの分布 × P
  let out = new Array(a[0].length).fill(0);
  for (let i = 0; i < v.length; i++) if (v[i] !== 0) for (let j = 0; j < out.length; j++) out[j] += v[i] * a[i][j];
  return out;
}
function matPow(a, k) { let r = eyeMat(a.length); for (let t = 0; t < k; t++) r = matMul(r, a); return r; }   // P^k（k 回かけるだけ）
function maxAbsDiff(a, b) {            // 2 つの行列（またはベクトル）のいちばん大きなずれ
  let d = 0;
  for (let i = 0; i < a.length; i++) { if (Array.isArray(a[i])) d = Math.max(d, maxAbsDiff(a[i], b[i])); else d = Math.max(d, Math.abs(a[i] - b[i])); }
  return d;
}
function rowSumErr(a, target) { let d = 0; for (let r of a) d = Math.max(d, Math.abs(sumOf(r) - (target === undefined ? 1 : target))); return d; }
function fixRows(a) {                  // 行の和を 1 に。全部 0 の行は「その場にとどまる」にする（NaN を出さない）
  return a.map((r, i) => { let s = sumOf(r); if (!(s > 1e-12)) { let z = r.map(() => 0); z[i] = 1; return z; } return r.map((v) => v / s); });
}
function solveLinear(a, b) {           // ガウスの消去法（部分ピボット）で a x = b。解けなければ null
  let n = a.length, m = a.map((r, i) => r.concat([b[i]]));
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    if (Math.abs(m[p][c]) < 1e-13) return null;
    [m[c], m[p]] = [m[p], m[c]];
    for (let r = 0; r < n; r++) { if (r === c) continue; let f = m[r][c] / m[c][c]; if (f !== 0) for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k]; }
  }
  return m.map((r, i) => r[n] / r[i]);
}
function matInv(a) {                   // 逆行列（ガウス-ジョルダン）。逆がなければ null
  let n = a.length, cols = [];
  for (let j = 0; j < n; j++) { let e = new Array(n).fill(0); e[j] = 1; let x = solveLinear(a, e); if (!x) return null; cols.push(x); }
  return a.map((_, i) => cols.map((c) => c[i]));
}
// 定常分布：π P = π と Σ π = 1 を連立方程式として解く（(P^T − I) π = 0 の最後の式を Σ π = 1 に置きかえる）
function stationaryExact(a) {
  let n = a.length, m = zerosMat(n), b = new Array(n).fill(0);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) m[i][j] = a[j][i] - (i === j ? 1 : 0);
  for (let j = 0; j < n; j++) m[n - 1][j] = 1; b[n - 1] = 1;
  return solveLinear(m, b);
}
function stationaryPower(a, tol, maxIt, start) {   // べき乗法：π ← π P を変化が tol 未満になるまで
  let n = a.length, v = start ? start.slice() : new Array(n).fill(1 / n), its = 0, d = Infinity;
  while (d > (tol || 1e-13) && its < (maxIt || 100000)) { let w = vecMat(v, a); d = maxAbsDiff(w, v); v = w; its++; }
  return { pi: v, its };
}
function tvDist(p, q) { let s = 0; for (let i = 0; i < p.length; i++) s += Math.abs(p[i] - q[i]); return s / 2; }   // 全変動距離
function entropyRate(a, pi) {          // エントロピー率 H = −Σ_i π_i Σ_j P_ij log₂ P_ij（1 歩あたりの情報量、ビット）
  let h = 0;
  for (let i = 0; i < a.length; i++) for (let v of a[i]) if (v > 0) h -= pi[i] * v * Math.log2(v);
  return h;
}
// ---- 状態の分類：強連結成分（タージャンの方法）と周期
function adjOf(a) { return a.map((r) => r.map((v, j) => (v > 1e-12 ? j : -1)).filter((j) => j >= 0)); }   // 確率 > 0 の矢印
function sccTarjan(adj) {              // 戻り値：comp[i] = 状態 i のクラスの番号（行ったり来たりできる状態どうしが同じ番号）
  let n = adj.length, idx = new Array(n).fill(-1), low = new Array(n).fill(0), onSt = new Array(n).fill(false), st = [], comp = new Array(n).fill(-1), counter = 0, nc = 0;
  function visit(v) {
    idx[v] = low[v] = counter++; st.push(v); onSt[v] = true;
    for (let w of adj[v]) {
      if (idx[w] < 0) { visit(w); low[v] = Math.min(low[v], low[w]); }
      else if (onSt[w]) low[v] = Math.min(low[v], idx[w]);
    }
    if (low[v] === idx[v]) { let w; do { w = st.pop(); onSt[w] = false; comp[w] = nc; } while (w !== v); nc++; }
  }
  for (let v = 0; v < n; v++) if (idx[v] < 0) visit(v);
  return comp;
}
function gcdInt(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; }
function classPeriod(adj, members) {   // クラスの周期：BFS の深さ lev で、クラスの中の矢印 u→v ごとに gcd(lev u + 1 − lev v)
  let inC = new Set(members), lev = new Map([[members[0], 0]]), q = [members[0]], g = 0;
  while (q.length) { let u = q.shift(); for (let v of adj[u]) if (inC.has(v) && !lev.has(v)) { lev.set(v, lev.get(u) + 1); q.push(v); } }
  for (let u of members) for (let v of adj[u]) if (inC.has(v)) g = gcdInt(g, lev.get(u) + 1 - lev.get(v));
  return g;                            // 0 = クラスの中に矢印がない（1 回きりの状態）
}
function classifyChain(a) {            // クラスごとに：メンバー、閉じている（外へ出ない）か、周期
  let adj = adjOf(a), comp = sccTarjan(adj), nc = Math.max(-1, ...comp) + 1, classes = [];
  for (let c = 0; c < nc; c++) {
    let mem = []; comp.forEach((k, i) => { if (k === c) mem.push(i); });
    let closed = mem.every((u) => adj[u].every((v) => comp[v] === c));
    classes.push({ members: mem, closed, period: classPeriod(adj, mem), absorbing: mem.length === 1 && a[mem[0]][mem[0]] > 1 - 1e-12 });
  }
  return { comp, classes, irreducible: nc === 1 };
}
// ---- グラフの道具：g = { x, y, w, h, x0, x1, y0, y1 }
function gX(g, v) { return g.x + clampv((v - g.x0) / (g.x1 - g.x0), -0.02, 1.02) * g.w; }
function gY(g, v) { return g.y + g.h - clampv((v - g.y0) / (g.y1 - g.y0), -0.02, 1.02) * g.h; }
function plotAxes(g, xl, yl, xt, yt) {
  stroke(84, 76, 70); strokeWeight(1); noFill(); rect(g.x, g.y, g.w, g.h);
  noStroke(); fill(...SUB); textSize(12); textAlign(CENTER, TOP);
  for (let v of xt) text(+v.toPrecision(3), gX(g, v), g.y + g.h + 4);
  textAlign(RIGHT, CENTER);
  for (let v of yt) text(+v.toPrecision(3), g.x - 5, gY(g, v));
  textAlign(LEFT, BASELINE); fill(...CREAM); textSize(13);
  text(xl, g.x + g.w - textWidth(xl), g.y + g.h + 30); text(yl, g.x, g.y - 8);
}
function polyline(pts) {               // 点が 2 つ以上あるときだけ折れ線を描く（空の beginShape を作らない）
  if (pts.length < 2) return;
  noFill(); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape();
}
function drawCurve(g, arr, col, sw, xOff) {   // arr[i] を x = i (+ xOff) に。長いときは間引いて 600 点まで
  let n = arr.length, stride = Math.max(1, Math.ceil(n / 600)), pts = [];
  for (let i = 0; i < n; i += stride) pts.push([gX(g, i + (xOff || 0)), gY(g, arr[i])]);
  if (n > 1 && (n - 1) % stride) pts.push([gX(g, n - 1 + (xOff || 0)), gY(g, arr[n - 1])]);
  stroke(...col); strokeWeight(sw || 2); polyline(pts);
}
function legend(x, y, items) {         // items = [[色, 名前], …]
  textSize(13); textAlign(LEFT, CENTER);
  for (let [c, s] of items) { noStroke(); fill(...c); rect(x, y - 5, 16, 10); fill(...CREAM); text(s, x + 22, y); y += 20; }
}
function drawBars(x, y, w, h, vals, cols, top, names) {   // 棒グラフ（top = 縦軸の上限）
  let n = vals.length, bw = w / n;
  stroke(84, 76, 70); strokeWeight(1); line(x, y + h, x + w, y + h); noStroke();
  for (let i = 0; i < n; i++) {
    let c = cols[i % cols.length], hh = clampv(vals[i] / (top || 1), 0, 1) * h; fill(...c); rect(x + i * bw + bw * 0.12, y + h - hh, bw * 0.76, hh, 3);
    if (names) { fill(...SUB); textSize(12); textAlign(CENTER, TOP); text(names[i], x + i * bw + bw / 2, y + h + 4); }
  }
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) || ArrayBuffer.isView(v) ? Array.from(v).every(noNaN) : !(typeof v === 'number' && !isFinite(v)); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(120, 220, 190) : color(255, 90, 90)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
