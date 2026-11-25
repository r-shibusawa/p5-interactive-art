// ============================================
// 10 最大エントロピー ─ サイコロの目の平均が 4.5 と分かっているとき、いちばん「偏りの少ない」分布は？（ジェインズのサイコロ）
// 平均の条件だけを守ってエントロピー H を最大にすると p_i ∝ exp(λ i)：指数型分布族（04）が自然に出てくる
// ラグランジュ乗数 λ は「平均 − 4.5 = 0」をニュートン法で解く（傾き = 分散）。ほかのどの候補 p よりも H が大きい
// しかも H(最大) − H(p) = D(p‖最大)：ピタゴラスの定理（06）の形。温度のある物理ではボルツマン分布（シリーズ 55 の 09）
// ← → 平均 / N 別の候補 / スペース 候補を自動で入れかえ / 1 平均 3.5（ふつうのサイコロ）/ 2 平均 4.5
// ============================================

const FACES = [1, 2, 3, 4, 5, 6];         // ★ サイコロの目
const N_CAND = 400;                       // ★ 比べる候補の数
let targetMean = 4.5, lamNow = 0, newtonLog = [], cands = [], candK = 0, autoC = true, tc = 0, hCurve = null;

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); seedRng(10); rebuild(); }
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
function gibbs(base, lam) { return normP(base.map((b, i) => b * Math.exp(lam * (FACES[i] - 3.5)))); }   // ★ p_i ∝ base_i · exp(λ i)（3.5 を引くのは桁あふれ防止、結果は同じ）
function meanOf(p) { return p.reduce((s, v, i) => s + v * FACES[i], 0); }
function varOf(p) { let m = meanOf(p); return p.reduce((s, v, i) => s + v * (FACES[i] - m) ** 2, 0); }
function newtonLambda(base, m, logIt) {    // ★ ニュートン法：λ ← λ − (平均 − m) / 分散（はさみうちで安全に）
  let lam = 0, lo = -60, hi = 60;
  for (let it = 0; it < 80; it++) {
    let p = gibbs(base, lam), f = meanOf(p) - m, v = varOf(p);
    if (logIt) logIt.push([it, lam, meanOf(p), f]);
    if (Math.abs(f) < 1e-14) break;
    if (f < 0) lo = lam; else hi = lam;
    let nx = lam - f / Math.max(v, 1e-300); if (!(nx > lo && nx < hi)) nx = (lo + hi) / 2;
    lam = nx;
  }
  return lam;
}
function uniform() { return FACES.map(() => 1 / FACES.length); }
function rebuild() {
  newtonLog = []; lamNow = newtonLambda(uniform(), targetMean, newtonLog);
  cands = [];                            // 候補：でたらめな分布を「平均がちょうど m」になるように傾けたもの
  for (let k = 0; k < N_CAND; k++) { let r = rndDist(6, 1e-4); cands.push(gibbs(r, newtonLambda(r, targetMean))); }
}

function draw() {
  background(...BG);
  hudTitle('最大エントロピー：平均 ' + fmtN(targetMean, 1) + ' のサイコロでいちばん偏りの少ない分布', '← → 平均　N 別の候補　スペース 候補の自動入れかえ ' + (autoC ? 'ON' : 'OFF') + '　1 平均 3.5　2 平均 4.5（ジェインズ）');
  if (autoC && ++tc % 50 === 0) candK = (candK + 1) % cands.length;
  let q = gibbs(uniform(), lamNow), cand = cands[candK], Hq = entropyH(q), Hc = entropyH(cand);
  // ---- 左上：最大エントロピーの分布（棒）と候補（白い枠）
  let bw = width * 0.42;
  drawBars(q, { x: 70, y: 130, w: bw, h: 200 }, { names: FACES.map((f) => f + ' の目'), ghost: cand, vmax: 0.6 });
  noStroke(); textAlign(LEFT, BASELINE); textSize(16); fill(...ORANGE); text('最大エントロピー：p_i ∝ exp(λ i)、λ = ' + fmtN(lamNow, 6), 70, 112);
  fill(...INK); text('H(最大) = ' + fmtN(Hq, 5) + ' ナット　平均 = ' + fmtN(meanOf(q), 10), 70, 380);
  fill(...SAND); text('白い枠 = 候補 #' + candK + '：平均 ' + fmtN(meanOf(cand), 10) + '、H = ' + fmtN(Hc, 5), 70, 406);
  fill(...LIME); text('H(最大) − H(候補) = ' + fmtN(Hq - Hc, 6) + ' = D(候補‖最大) = ' + fmtN(divKL(cand, q), 6), 70, 432);
  // ---- 左下：候補 400 個のエントロピー
  let b2 = plotBox(70, 490, bw, 90, Math.log(6) * 0.4, Math.log(6), 0, 1), Hs = cands.map(entropyH);
  b2.x0 = Math.min(...Hs) - 0.02; drawAxes(b2, 'エントロピー H（候補 ' + N_CAND + ' 個 = 点、オレンジの線 = 最大）', '');
  Hs.forEach((h, k) => { let [x] = toScr(b2, h, 0); noStroke(); fill(...(k === candK ? SAND : [...TEAL, 140])); circle(x, b2.y + 15 + (k % 7) * 10, k === candK ? 10 : 6); });
  let [qx] = toScr(b2, Hq, 0); stroke(...ORANGE); strokeWeight(3); line(qx, b2.y, qx, b2.y + b2.h);
  // ---- 右上：ニュートン法の表
  let rx = width * 0.56; noStroke(); fill(...INK); textSize(16); textAlign(LEFT, BASELINE); text('ニュートン法：f(λ) = 平均(λ) − ' + fmtN(targetMean, 1) + '、f′(λ) = 分散', rx, 112);
  textSize(14);
  newtonLog.slice(0, 9).forEach((r, i) => { fill(...(i === newtonLog.length - 1 ? LIME : DIMC)); text('#' + r[0] + '　λ = ' + fmtN(r[1], 10) + '　平均 = ' + fmtN(r[2], 10) + '　f = ' + r[3].toExponential(2), rx, 140 + i * 21); });
  fill(...DIMC); text('（3.5 を引いた λ。p_i ∝ exp(λ i) と同じ分布）　' + newtonLog.length + ' 回で収束：誤差が毎回ほぼ 2 乗に', rx, 140 + Math.min(9, newtonLog.length) * 21 + 6);
  // ---- 右下：平均 m と最大エントロピー H(m)
  let b3 = plotBox(rx, height * 0.58, width * 0.38, height * 0.27, 1, 6, 0, Math.log(6) + 0.1);
  if (!hCurve) { hCurve = []; for (let k = 1; k < 100; k++) { let m = 1 + (5 * k) / 100; hCurve.push([m, entropyH(gibbs(uniform(), newtonLambda(uniform(), m)))]); } }   // 1 回だけ計算
  drawAxes(b3, '平均 m', '最大エントロピー H(m)'); plotLine(b3, hCurve, ORANGE, 2.5);
  let [mx, my] = toScr(b3, targetMean, Hq); noStroke(); fill(...ORANGE); circle(mx, my, 12);
  fill(...DIMC); textSize(13); textAlign(LEFT, TOP); text('平均 3.5 で一様分布（log 6）。端に近いほど偏るしかない', b3.x, b3.y + b3.h + 32);
  drawSelfTest(width - 180, height - 14);
}
function keyPressed() {
  if (key === LEFT_ARROW) { targetMean = clampv(Math.round((targetMean - 0.1) * 10) / 10, 1.2, 5.8); rebuild(); }
  if (key === RIGHT_ARROW) { targetMean = clampv(Math.round((targetMean + 0.1) * 10) / 10, 1.2, 5.8); rebuild(); }
  if (key === '1') { targetMean = 3.5; rebuild(); }
  if (key === '2') { targetMean = 4.5; rebuild(); }
  if (key === 'n' || key === 'N') candK = (candK + 1) % cands.length;
  if (key === ' ') autoC = !autoC;
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let lam = newtonLambda(uniform(), 4.5), q = gibbs(uniform(), lam), lo = -10, hi = 10;
  for (let it = 0; it < 200; it++) { let m = (lo + hi) / 2; if (meanOf(gibbs(uniform(), m)) < 4.5) lo = m; else hi = m; }
  let qb = gibbs(uniform(), (lo + hi) / 2);
  check('ニュートン法の λ = 二分法の λ（誤差 1e-10）、平均はちょうど 4.5（誤差 1e-12）', Math.abs(lam - (lo + hi) / 2) < 1e-10 && Math.abs(meanOf(q) - 4.5) < 1e-12);
  check('エントロピーも二分法の答えと一致（誤差 1e-12）', Math.abs(entropyH(q) - entropyH(qb)) < 1e-12);
  let jay = [0.05435, 0.07877, 0.11416, 0.16545, 0.23977, 0.34749];
  check('ジェインズの答え p = (0.0544, 0.0788, 0.1142, 0.1654, 0.2398, 0.3475)（誤差 5e-5）', q.every((v, i) => Math.abs(v - jay[i]) < 5e-5));
  check('p_i ∝ exp(λ i) の λ（3.5 を引く前と同じ）≈ 0.3710', Math.abs(lam - 0.37105) < 1e-4 && Math.abs(Math.log(q[1] / q[0]) - lam) < 1e-12);
  seedRng(1010); let okBeat = true, okPy = true, nOk = 0;
  for (let k = 0; k < 2000; k++) {
    let r = rndDist(6, 1e-4), p = gibbs(r, newtonLambda(r, 4.5));
    if (Math.abs(meanOf(p) - 4.5) > 1e-10) continue; nOk++;
    if (entropyH(p) > entropyH(q) + 1e-12) okBeat = false;
    if (Math.abs(entropyH(q) - entropyH(p) - divKL(p, q)) > 1e-10) okPy = false;
  }
  check('平均 4.5 のでたらめな候補 ' + nOk + ' 個のどれよりもエントロピーが大きい', okBeat && nOk === 2000);
  check('どの候補でも H(最大) − H(候補) = D(候補‖最大)（ピタゴラスの形、誤差 1e-10）', okPy);
  check('平均 3.5 なら一様分布（H = log 6）', Math.abs(entropyH(gibbs(uniform(), newtonLambda(uniform(), 3.5))) - Math.log(6)) < 1e-12);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 平均を 6 に近づけると分布はどうなる？ λ は？ 1 に近づけると？
// 2. N で候補を見比べよう。エントロピーが最大に近い候補は、棒グラフも最大の分布に似ている？
// 3. 条件を「平均」から「2 乗の平均」に変えると、p_i ∝ exp(λ i²) になる。gibbs を書きかえて試そう
// 4. 目の値をエネルギー、λ = −1/温度 と読みかえると、ボルツマン分布（シリーズ 55 の 09）と同じ式
// 5. 平均と 2 乗の平均の両方を決めると？（λ が 2 つ。ニュートン法は 2×2 の連立方程式に）

// ==================================================
// ここから下は「情報幾何の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 色と小さな道具（等高線地図の色）
const BG = [22, 33, 52];                // 背景（深いスレートブルー）
const INK = [240, 236, 226];            // 文字（紙の白）
const ORANGE = [255, 150, 75], VIOLET = [170, 140, 255], TEAL = [95, 205, 190], ROSE = [255, 110, 125], LIME = [150, 225, 120], SAND = [235, 210, 150];
const DIMC = [140, 152, 175], PANEL = [32, 46, 70], WIRE = [62, 80, 110];
const OUTC = [[255, 150, 75], [95, 205, 190], [170, 140, 255], [235, 210, 150], [255, 110, 125], [150, 225, 120], [120, 175, 255], [230, 140, 210]];   // 結果ごとの色
function clampv(v, a, b) { return v < a ? a : v > b ? b : v !== v ? a : v; }     // NaN なら a に戻す
function fmtN(v, d) { if (typeof v !== 'number' || v !== v) return '?'; if (!isFinite(v)) return v > 0 ? '∞' : '−∞'; return v.toFixed(d === undefined ? 2 : d); }
function fmtP(p, d) { return '(' + p.map((v) => fmtN(v, d === undefined ? 2 : d)).join(', ') + ')'; }
function hudTitle(t, sub) {              // 左上のタイトルと操作の説明
  noStroke(); fill(...INK); textSize(22); textAlign(LEFT, BASELINE); text(t, 30, 38);
  fill(...DIMC); textSize(14); textLeading(19); text(sub, 30, 62);
}
function inRect(x, y, r) { return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; }
function drawField(f) { if (f) image(f.img, f.x, f.y, f.w, f.h); }   // 等高線の地図（画像）を描く
function freeField(f) { if (f && f.img) f.img.remove(); }
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
function gaussRnd() { let u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }   // 標準正規分布（ボックス-ミュラー法）
function rndDist(k, floor) {            // でたらめな確率分布（k 個、どれも floor 以上）
  let p = []; for (let i = 0; i < k; i++) p.push(-Math.log(1 - rnd()) + 1e-9);
  return mixFloor(normP(p), floor || 0);
}
function sampleIndex(p) { let u = rnd(), c = 0; for (let i = 0; i < p.length; i++) { c += p[i]; if (u < c) return i; } return p.length - 1; }
// ---- 情報の道具：確率分布 p = [p1, p2, ...]（合計 1）。log(0) は 0·log 0 = 0 として扱う
const TINY = 1e-300;
function normP(p) { let s = 0; for (let v of p) s += Math.max(0, v); if (!(s > 0)) return p.map(() => 1 / p.length); return p.map((v) => Math.max(0, v) / s); }
function mixFloor(p, f) { if (!f) return p; return normP(p.map((v) => Math.max(v, f))); }   // どの確率も f 以上に（0 を避ける）
function safeLog(v) { return Math.log(Math.max(v, TINY)); }
function entropyH(p) { let h = 0; for (let v of p) if (v > 0) h -= v * Math.log(v); return h; }           // エントロピー（ナット）
function divKL(p, q) {                  // KL ダイバージェンス D(p‖q)（ナット）。q が 0 で p > 0 なら ∞
  let d = 0;
  for (let i = 0; i < p.length; i++) { if (p[i] <= 0) continue; if (q[i] <= 0) return Infinity; d += p[i] * Math.log(p[i] / q[i]); }
  return Math.max(0, d);
}
function crossH(p, q) { let h = 0; for (let i = 0; i < p.length; i++) if (p[i] > 0) h -= p[i] * safeLog(q[i]); return h; }  // 交差エントロピー
function bhatta(p, q) { let s = 0; for (let i = 0; i < p.length; i++) s += Math.sqrt(Math.max(0, p[i] * q[i])); return Math.min(1, s); }
function fisherRao(p, q) { return 2 * Math.acos(clampv(bhatta(p, q), -1, 1)); }                          // フィッシャー-ラオ距離 = 球の大円の長さ
function hellingerSq(p, q) { let s = 0; for (let i = 0; i < p.length; i++) { let d = Math.sqrt(p[i]) - Math.sqrt(q[i]); s += d * d; } return s; }   // Σ(√p − √q)²
function tvDist(p, q) { let s = 0; for (let i = 0; i < p.length; i++) s += Math.abs(p[i] - q[i]); return s / 2; }
function alphaDiv(p, q, a) {            // α-ダイバージェンス（甘利の流儀）。α → −1 で D(p‖q)、α → +1 で D(q‖p)
  if (Math.abs(a + 1) < 1e-12) return divKL(p, q);
  if (Math.abs(a - 1) < 1e-12) return divKL(q, p);
  let s = 0, ea = (1 - a) / 2, eb = (1 + a) / 2;
  for (let i = 0; i < p.length; i++) s += Math.pow(Math.max(p[i], 0), ea) * Math.pow(Math.max(q[i], 0), eb);
  return Math.max(0, (4 / (1 - a * a)) * (1 - s));
}
function mixM(p, q, t) { return p.map((v, i) => (1 - t) * v + t * q[i]); }                       // m-測地線：確率をそのまま混ぜる
function mixE(p, q, t) { return normP(p.map((v, i) => Math.exp((1 - t) * safeLog(v) + t * safeLog(q[i])))); }   // e-測地線：対数で混ぜて正規化
function mixAlpha(p, q, t, a) {         // α-測地線：u^((1−α)/2) で混ぜて正規化（α = −1 は m、α = +1 は e）
  if (Math.abs(a - 1) < 1e-9) return mixE(p, q, t);
  let ex = (1 - a) / 2;
  return normP(p.map((v, i) => Math.pow((1 - t) * Math.pow(v, ex) + t * Math.pow(q[i], ex), 1 / ex)));
}
function bitsOf(nat) { return nat / Math.LN2; }
// ---- 棒グラフ（ドラッグで高さを変えられる）
function drawBars(p, r, opt) {          // r = {x, y, w, h}、opt = {cols, names, vmax, ghost（重ねて描く別の分布）}
  opt = opt || {};
  let k = p.length, bw = r.w / k, vmax = opt.vmax || 1;
  stroke(...WIRE); strokeWeight(1); line(r.x, r.y + r.h, r.x + r.w, r.y + r.h);
  for (let i = 0; i < k; i++) {
    let hh = (clampv(p[i], 0, vmax) / vmax) * r.h, col = (opt.cols || OUTC)[i % 8];
    noStroke(); fill(...col, 210); rect(r.x + i * bw + 3, r.y + r.h - hh, bw - 6, hh, 3);
    if (opt.ghost) { let gh = (clampv(opt.ghost[i], 0, vmax) / vmax) * r.h; noFill(); stroke(...INK); strokeWeight(1.5); rect(r.x + i * bw + 3, r.y + r.h - gh, bw - 6, gh, 3); }
    noStroke(); fill(...INK); textSize(12); textAlign(CENTER, BASELINE);
    if (bw >= 30) text(fmtN(p[i], 2), r.x + (i + 0.5) * bw, r.y + r.h - hh - 4);   // 細い棒では数字を省く
    fill(...DIMC); text(opt.names ? opt.names[i] : String(i + 1), r.x + (i + 0.5) * bw, r.y + r.h + 15);
  }
}
function barsDrag(p, r, mx, my, floor) {  // 棒をドラッグ：i 番目の高さを変えて、残りを比例で縮める（合計 1 のまま）
  let k = p.length, i = Math.floor((mx - r.x) / (r.w / k));
  if (i < 0 || i >= k || my < r.y - 30 || my > r.y + r.h + 20) return p;
  let v = clampv((r.y + r.h - my) / r.h, floor || 0.001, 1 - (floor || 0.001) * (k - 1)), rest = 1 - p[i], q = p.slice();
  for (let j = 0; j < k; j++) q[j] = j === i ? v : rest > 1e-9 ? (p[j] / rest) * (1 - v) : (1 - v) / (k - 1);
  return mixFloor(q, floor || 0.001);
}
// ---- 2 次元の図の枠（データ座標 ↔ 画面）
function plotBox(x, y, w, h, x0, x1, y0, y1) { return { x, y, w, h, x0, x1, y0, y1 }; }
function toScr(b, u, v) { return [b.x + ((u - b.x0) / (b.x1 - b.x0)) * b.w, b.y + b.h - ((v - b.y0) / (b.y1 - b.y0)) * b.h]; }
function fromScr(b, sx, sy) { return [b.x0 + ((sx - b.x) / b.w) * (b.x1 - b.x0), b.y0 + ((b.y + b.h - sy) / b.h) * (b.y1 - b.y0)]; }
function drawAxes(b, xl, yl) {
  noFill(); stroke(...WIRE); strokeWeight(1); rect(b.x, b.y, b.w, b.h);
  noStroke(); fill(...DIMC); textSize(12); textAlign(CENTER, TOP); text(xl, b.x + b.w / 2, b.y + b.h + 16);
  textAlign(LEFT, TOP); text(fmtN(b.x0, 1), b.x, b.y + b.h + 3); textAlign(RIGHT, TOP); text(fmtN(b.x1, 1), b.x + b.w, b.y + b.h + 3);
  textAlign(RIGHT, CENTER); text(fmtN(b.y0, 1), b.x - 4, b.y + b.h); text(fmtN(b.y1, 1), b.x - 4, b.y); textAlign(LEFT, BOTTOM); text(yl, b.x, b.y - 4);
}
function plotLine(b, pts, col, w) {      // データ座標の点列を折れ線に（枠の外の部分は枠のふちで切る）
  if (!pts || pts.length < 2) return;
  noFill(); stroke(...col); strokeWeight(w || 2);
  let run = [], x0 = b.x - 1, x1 = b.x + b.w + 1, y0 = b.y - 1, y1 = b.y + b.h + 1;
  let flush = () => { if (run.length >= 2) { beginShape(); for (let q of run) vertex(q[0], q[1]); endShape(); } run = []; };
  let clip = (a, c) => {                 // 線分 a→c の枠の中の部分 [t0, t1]（リャン-バースキー法）。なければ null
    let t0 = 0, t1 = 1, dx = c[0] - a[0], dy = c[1] - a[1];
    for (let [p, q] of [[-dx, a[0] - x0], [dx, x1 - a[0]], [-dy, a[1] - y0], [dy, y1 - a[1]]]) {
      if (p === 0) { if (q < 0) return null; continue; }
      let r = q / p; if (p < 0) t0 = Math.max(t0, r); else t1 = Math.min(t1, r);
    }
    return t0 <= t1 ? [t0, t1] : null;
  };
  let prev = null;
  for (let p of pts) {
    let s = toScr(b, p[0], p[1]);
    if (!(s[0] === s[0] && s[1] === s[1] && isFinite(s[0]) && isFinite(s[1]))) { flush(); prev = null; continue; }
    if (prev) {
      let c = clip(prev, s);
      if (!c) flush();
      else {
        let A = [prev[0] + c[0] * (s[0] - prev[0]), prev[1] + c[0] * (s[1] - prev[1])], B = [prev[0] + c[1] * (s[0] - prev[0]), prev[1] + c[1] * (s[1] - prev[1])];
        if (c[0] > 0) { flush(); run.push(A); } else if (!run.length) run.push(A);
        run.push(B);
        if (c[1] < 1) flush();
      }
    }
    prev = s;
  }
  flush(); noStroke();                  // あとの文字にふちがつかないように
}
function gridField(b, fn, opt) {        // 長方形の上の等高線の地図（fn(u, v)）
  opt = opt || {};
  let res = opt.res || 3, gw = Math.ceil(b.w / res), gh = Math.ceil(b.h / res), g = createGraphics(gw, gh); g.pixelDensity(1); g.loadPixels();
  let vals = new Float64Array(gw * gh), lv = opt.level || 0.1, vmin = opt.vmin || 0, vmax = opt.vmax || 1, c0 = opt.c0 || [40, 60, 95], c1 = opt.c1 || ORANGE;
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) { let [u, v] = fromScr(b, b.x + (i + 0.5) * res, b.y + (j + 0.5) * res); vals[j * gw + i] = fn(u, v); }
  let bandOf = (v) => Math.floor(clampv((v - vmin) / lv, -1e6, 1e6));
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    let k = j * gw + i, v = vals[k], o = 4 * k, band = bandOf(v), t = clampv((v - vmin) / (vmax - vmin), 0, 1), sh = band % 2 ? 0.9 : 1;
    let edge = v < (opt.cap || Infinity) && ((i + 1 < gw && bandOf(vals[k + 1]) !== band) || (j + 1 < gh && bandOf(vals[k + gw]) !== band));
    for (let c = 0; c < 3; c++) g.pixels[o + c] = edge ? 235 : (c0[c] + (c1[c] - c0[c]) * t) * sh;
    g.pixels[o + 3] = edge ? 170 : 255;
  }
  g.updatePixels();
  return { img: g, x: b.x, y: b.y, w: b.w, h: b.h };
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestOk() { return selfTestResults.every((r) => r.ok); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(...(selfTestOk() ? LIME : ROSE)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
