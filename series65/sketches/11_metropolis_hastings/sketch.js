// ============================================
// 11 メトロポリス-ヘイスティングス法 ─ 「山が 2 つある分布」から、マルコフ連鎖でサンプルを作る
// いまの点 x から、ずれ幅 σ の正規分布で次の候補 x′ を出す（提案）。
// 目標の高さ f が上がるなら必ず移り、下がるなら確率 f(x′)/f(x) で移る（だめならその場にとどまる = 同じ点をもう 1 回数える）。
// こうして作った連鎖の定常分布はちょうど目標の分布 → 長く歩くとヒストグラムが等高線に近づく
// 幅が小さすぎると少しずつしか動けず、山から山へ渡れない。大きすぎるとほとんど断られる。自己相関と有効サンプル数（ESS）で比べる
// ↑↓ 提案の幅 σ / F 速さ / クリック そこから歩き直す / H ヒストグラム ⇔ 目標の色 / スペース 一時停止 / R やり直し
// （同じメトロポリス法でスピンを 1 つずつ反転するのが、シリーズ 55 の 11 イジング模型）
// ============================================

// ★ 目標の分布：2 つの正規分布の山の混ぜ合わせ（重み、中心、広がり）
const PEAKS = [
  { w: 0.45, mx: -1.4, my: -0.4, sd: 0.55 },
  { w: 0.55, mx: 1.5, my: 0.6, sd: 0.8 },
];
const WIDTHS = [0.05, 0.2, 0.5, 1, 2, 5, 15];   // ★ 提案の幅 σ の候補
const SPEEDS = ['ゆっくり', '1 歩/フレーム', '50 歩/フレーム', '全力'];
const XR = [-4, 4], YR = [-3, 3];               // 描く範囲
const BINS_X = 80, BINS_Y = 60, KEEP = 20000;  // ヒストグラムの細かさ、自己相関に使う最近のサンプル数
let wIdx = 3, speedIdx = 1, paused = false, showHist = true;
let cur = [-3, 2.5], nSteps = 0, nAcc = 0, hist, recentX = [], trail = [], sumX = 0, sumY = 0, sumXX = 0;
let bgBuf = null, histBuf = null, acf = [], essNow = 0, plotBox = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  seedRng(11); restart(cur);
}
function restart(p) {
  cur = p.slice(); nSteps = 0; nAcc = 0; hist = new Float64Array(BINS_X * BINS_Y); recentX = []; trail = [cur.slice()];
  sumX = sumY = sumXX = 0; acf = []; essNow = 0;
}

// ---- 目標の密度（合計 1 になるように正規化した形）
function targetDensity(x, y) {
  let f = 0;
  for (let p of PEAKS) { let r2 = (x - p.mx) ** 2 + (y - p.my) ** 2; f += (p.w / (2 * Math.PI * p.sd * p.sd)) * Math.exp(-r2 / (2 * p.sd * p.sd)); }
  return f;
}
function targetMoments() {              // 混ぜ合わせの平均と分散（式で正確に）
  let mx = 0, my = 0, ex2 = 0;
  for (let p of PEAKS) { mx += p.w * p.mx; my += p.w * p.my; ex2 += p.w * (p.sd * p.sd + p.mx * p.mx); }
  return { mx, my, vx: ex2 - mx * mx };
}
// ★ メトロポリス-ヘイスティングスの 1 歩（提案は左右対称な正規分布なので q の比は 1）
function mhStep(p, sig) {
  let q = [p[0] + sig * randn(), p[1] + sig * randn()];
  let ratio = targetDensity(q[0], q[1]) / Math.max(targetDensity(p[0], p[1]), 1e-300);
  if (rnd() < ratio) return { p: q, acc: true };
  return { p, acc: false };
}
// 自己相関 ρ_k と有効サンプル数 ESS = n / (1 + 2 Σ ρ_k)（ρ_k が 0 以下になったところで打ち切り）
function autocorr(xs, maxLag) {
  let n = xs.length, m = meanOf(xs), v = 0, out = [];
  for (let x of xs) v += (x - m) * (x - m);
  if (n < 3 || v <= 0) return [1];
  for (let k = 0; k <= Math.min(maxLag, n - 2); k++) { let s = 0; for (let i = 0; i + k < n; i++) s += (xs[i] - m) * (xs[i + k] - m); out.push(s / v); }
  return out;
}
function essOf(xs, maxLag) {            // ずれ k を 1 つずつ計算し、ρ_k ≤ 0 になったら止める
  let n = xs.length, m = meanOf(xs), v = 0, s = 0;
  for (let x of xs) v += (x - m) * (x - m);
  if (n < 3 || v <= 0) return n;
  for (let k = 1; k < Math.min(maxLag || 1000, n - 1); k++) {
    let c = 0; for (let i = 0; i + k < n; i++) c += (xs[i] - m) * (xs[i + k] - m);
    if (c <= 0) break; s += c / v;
  }
  return n / (1 + 2 * s);
}

function oneStep() {
  let r = mhStep(cur, WIDTHS[wIdx]); cur = r.p; nSteps++; if (r.acc) nAcc++;
  sumX += cur[0]; sumY += cur[1]; sumXX += cur[0] * cur[0];
  let bx = Math.floor(((cur[0] - XR[0]) / (XR[1] - XR[0])) * BINS_X), by = Math.floor(((YR[1] - cur[1]) / (YR[1] - YR[0])) * BINS_Y);
  if (bx >= 0 && by >= 0 && bx < BINS_X && by < BINS_Y) hist[by * BINS_X + bx]++;
  recentX.push(cur[0]); if (recentX.length > KEEP) recentX.splice(0, recentX.length - KEEP);
  trail.push(cur.slice()); if (trail.length > 300) trail.shift();
}

function draw() {
  background(...BG);
  if (!paused) {
    if (speedIdx === 0) { if (frameCount % 8 === 0) oneStep(); }
    else if (speedIdx === 1) oneStep();
    else if (speedIdx === 2) for (let k = 0; k < 50; k++) oneStep();
    else { let t0 = performance.now(); while (performance.now() - t0 < 6) for (let k = 0; k < 50; k++) oneStep(); }
  }
  if (frameCount % 30 === 1 && recentX.length > 50) { acf = autocorr(recentX.slice(-4000), 60); essNow = essOf(recentX.slice(-4000), 400) * (recentX.length / Math.min(4000, recentX.length)); }
  hudTitle('メトロポリス-ヘイスティングス：' + nSteps + ' 歩　提案の幅 σ = ' + WIDTHS[wIdx] + '　採択率 ' + (nSteps ? Math.round((100 * nAcc) / nSteps) : 0) + '%',
    '↑↓ σ　F 速さ（' + SPEEDS[speedIdx] + '）　クリック そこから歩き直す　H ' + (showHist ? 'ヒストグラム' : '目標の色') + '　スペース ' + (paused ? '再開' : '一時停止') + '　R やり直し');

  // ---- 平面：目標の色と等高線（バッファに 1 回だけ描く）＋ ヒストグラム ＋ 軌跡
  let ph = Math.min(height - 150, (width * 0.56) * 0.75), pw = ph * 4 / 3, px = 40, py = 96;
  plotBox = { x: px, y: py, w: pw, h: ph };
  if (!bgBuf || bgBuf.width !== Math.round(pw)) makeBackground(Math.round(pw), Math.round(ph));
  image(bgBuf, px, py, pw, ph);
  if (showHist && nSteps > 0) { if (frameCount % 10 === 1 || !histBuf) makeHistImage(); image(histBuf, px, py, pw, ph); }
  let toS = (p) => [px + ((p[0] - XR[0]) / (XR[1] - XR[0])) * pw, py + ((YR[1] - p[1]) / (YR[1] - YR[0])) * ph];
  stroke(...MUSTARD, 170); strokeWeight(1.2); polyline(trail.slice(-120).map(toS));
  let cs = toS(cur); noStroke(); fill(...DICE); circle(cs[0], cs[1], 12);
  noFill(); stroke(...CREAM, 120); strokeWeight(1); circle(cs[0], cs[1], (2 * WIDTHS[wIdx] / (XR[1] - XR[0])) * pw);   // 提案の幅（1σ）

  // ---- 右側：x 座標の軌跡（トレース）、自己相関、数値
  let rx = px + pw + 60, rw = width - rx - 40;
  let g1 = { x: rx, y: 110, w: rw, h: 120, x0: 0, x1: 500, y0: -4, y1: 4 };
  plotAxes(g1, '最近の 500 歩', 'x 座標のトレース（山 2 つの間を行き来できている？）', [0, 500], [-2, 0, 2]);
  let tail = recentX.slice(-500); drawCurve(g1, tail, TEAL, 1.5, 500 - tail.length);
  let g2 = { x: rx, y: 290, w: rw, h: 120, x0: 0, x1: 60, y0: -0.2, y1: 1 };
  plotAxes(g2, 'ずれ k', '自己相関 ρ_k（早く 0 になるほど良い）', [0, 30, 60], [0, 0.5, 1]);
  stroke(84, 76, 70); line(g2.x, gY(g2, 0), g2.x + g2.w, gY(g2, 0));
  if (acf.length > 1) drawCurve(g2, acf, DICE, 2.5);
  let mom = targetMoments(), n = Math.max(1, nSteps), ty = 470;
  noStroke(); fill(...CREAM); textSize(15); textAlign(LEFT, BASELINE);
  text('サンプルの平均 x = ' + fmtN(sumX / n, 3) + '　（目標 ' + fmtN(mom.mx, 3) + '）', rx, ty);
  text('サンプルの平均 y = ' + fmtN(sumY / n, 3) + '　（目標 ' + fmtN(mom.my, 3) + '）', rx, ty + 24);
  text('x の分散 = ' + fmtN(sumXX / n - (sumX / n) ** 2, 3) + '　（目標 ' + fmtN(mom.vx, 3) + '）', rx, ty + 48);
  fill(...MUSTARD); text('有効サンプル数 ESS ≈ ' + (recentX.length > 50 ? Math.round(essNow) : '—') + '（' + nSteps + ' 歩のうち）', rx, ty + 80);
  fill(...SUB); textSize(13);
  text('ESS = 独立なサンプルなら何個ぶんの情報か。σ が小さいと 1 歩が小さく、', rx, ty + 106);
  text('大きいと断られて同じ点にとどまる → どちらも ESS が小さい', rx, ty + 124);
  drawSelfTest(width - 180, height - 14);
}

function makeBackground(w, h) {          // 目標の密度を色で、等高線をクリーム色の点で
  bgBuf = createGraphics(w, h); bgBuf.pixelDensity(1); bgBuf.loadPixels();
  let fmax = 0, vals = new Float64Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { let v = targetDensity(XR[0] + ((i + 0.5) / w) * (XR[1] - XR[0]), YR[1] - ((j + 0.5) / h) * (YR[1] - YR[0])); vals[j * w + i] = v; fmax = Math.max(fmax, v); }
  let band = (v) => Math.floor((v / fmax) * 8);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    let v = vals[j * w + i], t = Math.sqrt(v / fmax), k = 4 * (j * w + i);
    let edge = i > 0 && j > 0 && (band(v) !== band(vals[j * w + i - 1]) || band(v) !== band(vals[(j - 1) * w + i]));
    bgBuf.pixels[k] = edge ? 200 : 38 + t * 30; bgBuf.pixels[k + 1] = edge ? 190 : 34 + t * 70; bgBuf.pixels[k + 2] = edge ? 170 : 32 + t * 66; bgBuf.pixels[k + 3] = 255;
  }
  bgBuf.updatePixels();
}
function makeHistImage() {               // ヒストグラム（濃い = たくさん）を小さな画像に
  if (!histBuf) { histBuf = createGraphics(BINS_X, BINS_Y); histBuf.pixelDensity(1); }
  let hmax = Math.max(1, ...hist); histBuf.loadPixels();
  for (let i = 0; i < hist.length; i++) { let t = Math.sqrt(hist[i] / hmax), k = 4 * i; histBuf.pixels[k] = DICE[0]; histBuf.pixels[k + 1] = DICE[1]; histBuf.pixels[k + 2] = DICE[2]; histBuf.pixels[k + 3] = 220 * t; }
  histBuf.updatePixels();
}

function mousePressed() {
  if (!plotBox) return;
  let u = (mouseX - plotBox.x) / plotBox.w, v = (mouseY - plotBox.y) / plotBox.h;
  if (u < 0 || v < 0 || u > 1 || v > 1) return;
  restart([XR[0] + u * (XR[1] - XR[0]), YR[1] - v * (YR[1] - YR[0])]);
}
function keyPressed() {
  if (key === UP_ARROW) { wIdx = Math.min(WIDTHS.length - 1, wIdx + 1); restart(cur); }
  if (key === DOWN_ARROW) { wIdx = Math.max(0, wIdx - 1); restart(cur); }
  if (key === 'f' || key === 'F') speedIdx = (speedIdx + 1) % SPEEDS.length;
  if (key === 'h' || key === 'H') showHist = !showHist;
  if (key === ' ') paused = !paused;
  if (key === 'r' || key === 'R') restart([-3, 2.5]);
  return false;
}

// ============================================
// やってみよう
// ・σ = 0.05 と σ = 15 で、トレースと自己相関の形を見比べる。採択率がいくつくらいのとき ESS が最大？
// ・PEAKS の 2 つの山を遠くに離す（mx = ±3）。σ = 1 でも山を渡れなくなる → 「混ざらない」連鎖
// ・クリックで右の山の中から歩き直す。最初の何百歩か（バーンイン）を捨てるべき理由が見える
// ・targetDensity を自分の好きな形（輪っか、バナナ形）にしてみる。正規化の定数は要らない（比しか使わない）
// ============================================

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  // (1) 離散の場合：5 状態の目標 w にメトロポリス法の遷移行列を正確に作り、定常分布 = 目標と詳細つり合いを確認
  let wt = [1, 3, 2, 5, 4], z = sumOf(wt), tgt = wt.map((v) => v / z), nS = 5, km = zerosMat(nS);
  for (let i = 0; i < nS; i++) { for (let j of [i - 1, i + 1]) if (j >= 0 && j < nS) km[i][j] = 0.5 * Math.min(1, wt[j] / wt[i]); km[i][i] = 1 - sumOf(km[i]); }
  check('離散のメトロポリス：行の合計 = 1、定常分布 = 目標（連立方程式）', rowSumErr(km) < 1e-12 && maxAbsDiff(stationaryExact(km), tgt) < 1e-12);
  let db = 0; for (let i = 0; i < nS; i++) for (let j = 0; j < nS; j++) db = Math.max(db, Math.abs(tgt[i] * km[i][j] - tgt[j] * km[j][i]));
  check('詳細つり合い π_i P_ij = π_j P_ji（ずれ ' + db.toExponential(1) + '）', db < 1e-14);
  // (2) 2 次元：σ = 1 で 6 万歩。平均と分散が目標に近い（許容 = 4 × 標準誤差、ESS で計算）
  seedRng(101); let p = [0, 0], xs = [], ys = [], acc = 0, nT = 60000;
  for (let t = 0; t < 2000; t++) p = mhStep(p, 1).p;               // バーンイン
  for (let t = 0; t < nT; t++) { let r = mhStep(p, 1); p = r.p; if (r.acc) acc++; xs.push(p[0]); ys.push(p[1]); }
  let mom = targetMoments(), ess = essOf(xs, 2000), se = Math.sqrt(mom.vx / ess), mx = meanOf(xs), vx = meanOf(xs.map((v) => (v - mx) ** 2));
  check('σ = 1：平均 x ' + fmtN(mx, 3) + ' ≈ ' + fmtN(mom.mx, 3) + '（ESS ' + Math.round(ess) + '、許容 4 SE）', Math.abs(mx - mom.mx) < 4 * se);
  check('σ = 1：平均 y ≈ ' + fmtN(mom.my, 3) + '、x の分散 ≈ ' + fmtN(mom.vx, 3), Math.abs(meanOf(ys) - mom.my) < 4 * Math.sqrt(1 / ess) && Math.abs(vx - mom.vx) < 0.12 * mom.vx);
  // (3) 幅を変えると：採択率は σ が大きいほど下がる。σ = 0.05 と σ = 15 は σ = 1 より ESS が小さい
  let rate = [], essW = [];
  for (let sg of [0.05, 1, 15]) {
    seedRng(202); let q = [0, 0], a = 0, xx = [];
    for (let t = 0; t < 15000; t++) { let r = mhStep(q, sg); q = r.p; if (r.acc) a++; xx.push(q[0]); }
    rate.push(a / 15000); essW.push(essOf(xx, 3000));
  }
  check('採択率は σ = 0.05 → 1 → 15 で下がる（' + rate.map((v) => Math.round(100 * v) + '%').join(' → ') + '）', rate[0] > rate[1] && rate[1] > rate[2]);
  check('ESS は σ = 1 が最大（' + essW.map((v) => Math.round(v)).join(', ') + '）', essW[1] > essW[0] && essW[1] > essW[2]);
  // (4) ESS の計算の確認：独立な正規乱数なら ≈ n、ρ = 0.9 の AR(1) なら ≈ n (1 − ρ)/(1 + ρ)
  seedRng(303); let iid = [], ar = [], v = 0;
  for (let t = 0; t < 20000; t++) { iid.push(randn()); v = 0.9 * v + Math.sqrt(1 - 0.81) * randn(); ar.push(v); }
  let e1 = essOf(iid, 2000), e2 = essOf(ar, 2000), e2t = (20000 * 0.1) / 1.9;
  check('ESS の式：独立なら ≈ n（' + Math.round(e1) + '）、AR(1) ρ = 0.9 なら ≈ ' + Math.round(e2t) + '（' + Math.round(e2) + '）', e1 > 15000 && Math.abs(e2 / e2t - 1) < 0.3);
  check('密度の値に NaN なし（遠くでも）', noNaN([targetDensity(1e6, -1e6), targetDensity(0, 0)]) && targetDensity(0, 0) > 0);
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
