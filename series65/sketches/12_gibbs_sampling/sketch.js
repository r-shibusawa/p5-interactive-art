// ============================================
// 12 ギブスサンプリング ─ 変数を 1 つずつ、「ほかを固定したときの分布（条件付き分布）」から引き直す
// 2 変数の正規分布（相関 ρ）なら、x | y は 平均 ρy・分散 1 − ρ² の正規分布。x を引き、次に y を引く…をくり返す。
// 動きは必ず軸に平行（階段）。相関が強いと細長い谷を小さな階段でしか進めず、ゆっくりになる（x の 1 つずれの自己相関 = ρ²）
// M で 2 つ目の例：ノイズの入った白黒の画像。「となりどうしは同じ色になりやすい」（イジング事前分布）と
// 「観測した色に近い」を合わせた条件付き確率で、画素を 1 つずつ引き直すとノイズが消えていく
// M 例を切りかえ / ↑↓ 相関 ρ（例 1）・← → となりの結びつき J（例 2）/ N ノイズを作り直す / F 速さ / スペース 一時停止 / R やり直し
// ============================================

let rho = 0.8;                           // ★ 相関（−0.99〜0.99）
let couplingJ = 0.8;                     // ★ となりの画素の結びつき J（0 = 事前分布なし）
const FLIP = 0.15;                       // ★ ノイズ：画素が反転している割合
const IMG_W = 64, IMG_H = 40;            // 画像の大きさ
const SPEEDS = ['ゆっくり', '1 歩/フレーム', '全力'];
let demo = 0, speedIdx = 1, paused = false;
// 例 1：正規分布
let gp = [3, -3], stairs = [], gxs = [], gn = 0, sxy = [0, 0, 0, 0, 0], dotBuf = null, plotSq = null;
// 例 2：画像
let clean, noisy, spins, postSum, nSweeps = 0, imgBufs = {};

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  seedRng(12); resetNormal(); makeImages();
}

// ---- 例 1：2 変数の正規分布
function resetNormal() { gp = [3, -3]; stairs = [gp.slice()]; gxs = []; gn = 0; sxy = [0, 0, 0, 0, 0]; if (dotBuf) dotBuf.clear(); }
// ★ ギブスの 1 回 = x | y を引いて、y | x を引く
function gibbsNormal(p, r) {
  let sd = Math.sqrt(1 - r * r);
  let x = r * p[1] + sd * randn();
  let y = r * x + sd * randn();
  return [x, y];
}
function normalStep() {
  let q = gibbsNormal(gp, rho);
  stairs.push([q[0], gp[1]], q.slice()); if (stairs.length > 80) stairs.splice(0, stairs.length - 80);
  gp = q; gn++; gxs.push(q[0]); if (gxs.length > 20000) gxs.splice(0, gxs.length - 20000);
  sxy[0] += q[0]; sxy[1] += q[1]; sxy[2] += q[0] * q[0]; sxy[3] += q[1] * q[1]; sxy[4] += q[0] * q[1];
  if (dotBuf && plotSq) { let s = toSq(q); dotBuf.noStroke(); dotBuf.fill(DICE[0], DICE[1], DICE[2], 70); dotBuf.circle(s[0] - plotSq.x, s[1] - plotSq.y, 3); }
}
function sampleCorr(s, n) {              // 相関係数（合計から）
  if (n < 2) return 0;
  let mx = s[0] / n, my = s[1] / n, vx = s[2] / n - mx * mx, vy = s[3] / n - my * my;
  return vx > 0 && vy > 0 ? (s[4] / n - mx * my) / Math.sqrt(vx * vy) : 0;
}
function lagCorr(xs, k) {                // ずれ k の自己相関
  let n = xs.length, m = meanOf(xs), v = 0, c = 0;
  if (n <= k + 2) return 0;
  for (let x of xs) v += (x - m) * (x - m);
  for (let i = 0; i + k < n; i++) c += (xs[i] - m) * (xs[i + k] - m);
  return v > 0 ? c / v : 0;
}
function toSq(p) { return [plotSq.x + ((p[0] + 3.5) / 7) * plotSq.w, plotSq.y + ((3.5 - p[1]) / 7) * plotSq.w]; }

// ---- 例 2：ノイズ除去（値は +1 = 白、−1 = 黒）
function cleanPixel(i, j) {              // ★ 元の絵（自作の図形：丸、四角、斜めの帯）
  let x = i / IMG_W, y = j / IMG_H;
  if ((x - 0.25) ** 2 * 2.5 + (y - 0.5) ** 2 < 0.07) return 1;
  if (x > 0.5 && x < 0.9 && y > 0.18 && y < 0.42) return 1;
  if (x > 0.5 && Math.abs(y - 0.75 - (x - 0.7) * 0.6) < 0.08) return 1;
  return -1;
}
function makeImages() {
  clean = new Int8Array(IMG_W * IMG_H); noisy = new Int8Array(IMG_W * IMG_H);
  for (let j = 0; j < IMG_H; j++) for (let i = 0; i < IMG_W; i++) { let k = j * IMG_W + i; clean[k] = cleanPixel(i, j); noisy[k] = rnd() < FLIP ? -clean[k] : clean[k]; }
  resetSpins();
}
function resetSpins() { spins = Int8Array.from(noisy); postSum = new Float64Array(IMG_W * IMG_H); nSweeps = 0; }
// ★ 画素 k の条件付き確率 P(白 | となり, 観測) = 1 / (1 + exp(−2 (J Σ となり + h y_k)))、h = ½ ln((1 − ノイズ)/ノイズ)
function gibbsSweep(sp, obs, cj, w, h) {
  let hb = 0.5 * Math.log((1 - FLIP) / FLIP);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    let k = j * w + i, nb = 0;
    if (i > 0) nb += sp[k - 1]; if (i < w - 1) nb += sp[k + 1]; if (j > 0) nb += sp[k - w]; if (j < h - 1) nb += sp[k + w];
    sp[k] = rnd() < 1 / (1 + Math.exp(-2 * (cj * nb + hb * obs[k]))) ? 1 : -1;
  }
}
function imageSweep() { gibbsSweep(spins, noisy, couplingJ, IMG_W, IMG_H); nSweeps++; if (nSweeps > 5) for (let k = 0; k < spins.length; k++) postSum[k] += spins[k]; }
function errRate(a) { let e = 0; for (let k = 0; k < clean.length; k++) if (a[k] !== clean[k]) e++; return e / clean.length; }
function postMeanImage() { let n = Math.max(1, nSweeps - 5); return Int8Array.from(postSum, (v) => (nSweeps > 5 ? (v / n >= 0 ? 1 : -1) : 0)); }

function draw() {
  background(...BG);
  if (!paused) {
    let reps = speedIdx === 0 ? (frameCount % 6 === 0 ? 1 : 0) : speedIdx === 1 ? 1 : 0, t0 = performance.now();
    if (speedIdx === 2) { while (performance.now() - t0 < 6) { if (demo === 0) for (let k = 0; k < 20; k++) normalStep(); else imageSweep(); } }
    else for (let k = 0; k < reps; k++) demo === 0 ? normalStep() : imageSweep();
  }
  if (demo === 0) drawNormal(); else drawImages();
  drawSelfTest(width - 180, height - 14);
}

function drawNormal() {
  hudTitle('ギブスサンプリング（例 1：2 変数の正規分布）：' + gn + ' 回　相関 ρ = ' + fmtN(rho, 2),
    'M 例を切りかえ　↑↓ ρ　F 速さ（' + SPEEDS[speedIdx] + '）　スペース ' + (paused ? '再開' : '一時停止') + '　R やり直し');
  let side = Math.min(height - 140, width * 0.5); plotSq = { x: 40, y: 96, w: side };
  if (!dotBuf || dotBuf.width !== Math.round(side)) { dotBuf = createGraphics(Math.round(side), Math.round(side)); dotBuf.pixelDensity(1); }
  noStroke(); fill(42, 38, 35); rect(plotSq.x, plotSq.y, side, side);
  stroke(70, 64, 58); strokeWeight(1); let o = toSq([0, 0]); line(plotSq.x, o[1], plotSq.x + side, o[1]); line(o[0], plotSq.y, o[0], plotSq.y + side);
  image(dotBuf, plotSq.x, plotSq.y);
  for (let rr of [1, 2]) {                // 等高線：1σ・2σ の楕円（主軸は 45°）
    let pts = []; for (let k = 0; k <= 80; k++) { let t = (k / 80) * 2 * Math.PI, a = rr * Math.sqrt(1 + rho) * Math.cos(t), b = rr * Math.sqrt(1 - rho) * Math.sin(t); pts.push(toSq([(a + b) / Math.SQRT2, (a - b) / Math.SQRT2])); }
    stroke(...CREAM, 160); strokeWeight(1.5); polyline(pts);
  }
  stroke(...MUSTARD); strokeWeight(2); polyline(stairs.map(toSq));
  let c = toSq(gp); noStroke(); fill(...TEAL); circle(c[0], c[1], 12);

  let rx = plotSq.x + side + 60, rw = width - rx - 40;
  let g1 = { x: rx, y: 110, w: rw, h: 130, x0: 0, x1: 300, y0: -3.5, y1: 3.5 };
  plotAxes(g1, '最近の 300 回', 'x のトレース（ρ が大きいとゆっくり波打つ）', [0, 300], [-2, 0, 2]);
  let tail = gxs.slice(-300); drawCurve(g1, tail, TEAL, 1.5, 300 - tail.length);
  let n = Math.max(1, gn), ty = 310, r1 = frameCount % 20 === 0 || !drawNormal.r1 ? (drawNormal.r1 = lagCorr(gxs.slice(-5000), 1)) : drawNormal.r1;
  noStroke(); fill(...CREAM); textSize(15); textAlign(LEFT, BASELINE);
  text('サンプルの相関 = ' + fmtN(sampleCorr(sxy, gn), 3) + '　（目標 ρ = ' + fmtN(rho, 3) + '）', rx, ty);
  text('平均 (x, y) = (' + fmtN(sxy[0] / n, 2) + ', ' + fmtN(sxy[1] / n, 2) + ')　分散 x = ' + fmtN(sxy[2] / n - (sxy[0] / n) ** 2, 2), rx, ty + 26);
  fill(...MUSTARD); text('x の 1 つずれの自己相関 = ' + fmtN(r1, 3) + '　（理論 ρ² = ' + fmtN(rho * rho, 3) + '）', rx, ty + 58);
  text('有効サンプル数の割合 ≈ (1 − ρ²)/(1 + ρ²) = ' + fmtN((1 - rho * rho) / (1 + rho * rho), 3), rx, ty + 84);
  fill(...SUB); textSize(13);
  text('条件付き分布：x | y ~ 正規(ρ y, 1 − ρ²)、y | x ~ 正規(ρ x, 1 − ρ²)', rx, ty + 120);
  text('階段の 1 段は、楕円の短い方向の幅 √(1 − ρ²) くらいしか進めない', rx, ty + 142);
  text('→ ρ = 0.99 では細長い谷をのろのろ。ρ = 0 なら 1 回で独立なサンプル', rx, ty + 162);
}

function drawImages() {
  hudTitle('ギブスサンプリング（例 2：画像のノイズ除去）：' + nSweeps + ' スイープ　J = ' + fmtN(couplingJ, 2) + '　ノイズ ' + Math.round(FLIP * 100) + '%',
    'M 例を切りかえ　← → J　N ノイズを作り直す　F 速さ（' + SPEEDS[speedIdx] + '）　スペース ' + (paused ? '再開' : '一時停止') + '　R やり直し');
  let pm = postMeanImage(), panels = [['元の絵（答え）', clean], ['観測（ノイズ入り）', noisy], ['いまのサンプル', spins], ['平均して多数決（事後平均）', pm]];
  let pw = Math.min((width - 120) / 2, ((height - 230) / 2) * (IMG_W / IMG_H)), ph = pw * (IMG_H / IMG_W);
  drawingContext.imageSmoothingEnabled = false;
  panels.forEach(([name, arr], k) => {
    let x = 40 + (k % 2) * (pw + 40), y = 110 + Math.floor(k / 2) * (ph + 50);
    if (!imgBufs[k]) { imgBufs[k] = createGraphics(IMG_W, IMG_H); imgBufs[k].pixelDensity(1); }
    let b = imgBufs[k]; b.loadPixels();
    for (let q = 0; q < arr.length; q++) { let v = arr[q] > 0 ? 240 : arr[q] < 0 ? 36 : 110; b.pixels[4 * q] = v; b.pixels[4 * q + 1] = v * 0.95; b.pixels[4 * q + 2] = v * 0.85; b.pixels[4 * q + 3] = 255; }
    b.updatePixels(); image(b, x, y, pw, ph);
    noStroke(); fill(...CREAM); textSize(15); textAlign(LEFT, BASELINE);
    text(name + (k > 0 && (k < 3 || nSweeps > 5) ? '　まちがい ' + fmtN(100 * errRate(arr), 1) + '%' : ''), x, y - 8);
  });
  drawingContext.imageSmoothingEnabled = true;
  fill(...SUB); textSize(13); textAlign(LEFT, BASELINE);
  text('白 = +1、黒 = −1。P(白 | となり, 観測) = 1 / (1 + exp(−2 (J × となりの合計 + h × 観測)))。J = 0 だと観測をなぞるだけ、J が大きすぎると細部が消える', 40, height - 40);
}

function keyPressed() {
  if (key === 'm' || key === 'M') demo = 1 - demo;
  if (key === UP_ARROW && demo === 0) { rho = Math.min(0.99, Math.round((rho + 0.1) * 100) / 100); if (rho > 0.9) rho = 0.99; resetNormal(); }
  if (key === DOWN_ARROW && demo === 0) { rho = rho >= 0.99 ? 0.9 : Math.max(-0.9, Math.round((rho - 0.1) * 100) / 100); resetNormal(); }
  if (key === RIGHT_ARROW && demo === 1) { couplingJ = Math.min(2, Math.round((couplingJ + 0.1) * 10) / 10); resetSpins(); }
  if (key === LEFT_ARROW && demo === 1) { couplingJ = Math.max(0, Math.round((couplingJ - 0.1) * 10) / 10); resetSpins(); }
  if (key === 'n' || key === 'N') makeImages();
  if (key === 'f' || key === 'F') speedIdx = (speedIdx + 1) % SPEEDS.length;
  if (key === ' ') paused = !paused;
  if (key === 'r' || key === 'R') { resetNormal(); resetSpins(); }
  return false;
}

// ============================================
// やってみよう
// ・ρ = 0、0.8、0.99 で、階段の形とトレースの波打ち方を比べる。自己相関はいつも ρ² になっている？
// ・ρ = −0.8 にすると楕円の向きは？ 自己相関 ρ² は正のまま？
// ・例 2 で J = 0、0.8、2 を比べる。まちがいがいちばん少ない J は？
// ・FLIP を 0.3 に上げる。cleanPixel を書きかえて自分の絵（文字や模様）でも試す
// ============================================

// ---- 自己テスト
function normPdf2(x, y, r) { return Math.exp(-(x * x - 2 * r * x * y + y * y) / (2 * (1 - r * r))) / (2 * Math.PI * Math.sqrt(1 - r * r)); }
function normPdf1(x, m, v) { return Math.exp(-((x - m) ** 2) / (2 * v)) / Math.sqrt(2 * Math.PI * v); }
function selfTest() {
  selfTestResults = [];
  let worst = 0;
  for (let [x, y] of [[0.3, -1.2], [2, 1.5], [-0.7, 0.4]]) worst = Math.max(worst, Math.abs(normPdf2(x, y, 0.8) / normPdf1(y, 0, 1) - normPdf1(x, 0.8 * y, 1 - 0.64)));
  check('条件付き分布：p(x, y)/p(y) = 正規(ρy, 1 − ρ²)（ずれ ' + worst.toExponential(1) + '）', worst < 1e-12);
  seedRng(1201); let p = [0, 0], xs = [], s = [0, 0, 0, 0, 0], nT = 40000;
  for (let t = 0; t < nT; t++) { p = gibbsNormal(p, 0.8); xs.push(p[0]); s[0] += p[0]; s[1] += p[1]; s[2] += p[0] * p[0]; s[3] += p[1] * p[1]; s[4] += p[0] * p[1]; }
  let ess = (nT * (1 - 0.64)) / (1 + 0.64), rc = sampleCorr(s, nT);
  check('ρ = 0.8：サンプルの相関 ' + fmtN(rc, 4) + ' ≈ 0.8', Math.abs(rc - 0.8) < Math.max(0.02, (4 * (1 - 0.64)) / Math.sqrt(ess)));
  check('平均 ≈ 0、分散 ≈ 1（許容 4 SE）', Math.abs(s[0] / nT) < 4 / Math.sqrt(ess) && Math.abs(s[2] / nT - 1) < 0.06);
  let r1 = lagCorr(xs, 1);
  check('x の 1 つずれの自己相関 ' + fmtN(r1, 3) + ' ≈ ρ² = 0.64', Math.abs(r1 - 0.64) < 0.03);
  seedRng(1202); let p2 = [0, 0], x99 = [];
  for (let t = 0; t < 20000; t++) { p2 = gibbsNormal(p2, 0.99); x99.push(p2[0]); }
  let r99 = lagCorr(x99, 1);
  check('ρ = 0.99 は遅い：自己相関 ' + fmtN(r99, 3) + ' ≈ 0.98', r99 > 0.95);
  // 2 × 2 の画像（4 画素）：ランダムに 1 画素えらぶギブスの遷移行列 16 × 16 を正確に作り、定常分布 = ボルツマン分布
  let obs = [1, -1, 1, 1], cj = 0.7, hb = 0.4, edges = [[0, 1], [2, 3], [0, 2], [1, 3]], nbrs = [[1, 2], [0, 3], [0, 3], [1, 2]];
  let spinOf = (st, i) => ((st >> i) & 1 ? 1 : -1), boltz = [];
  for (let st = 0; st < 16; st++) { let e = 0; for (let [a, b] of edges) e += cj * spinOf(st, a) * spinOf(st, b); for (let i = 0; i < 4; i++) e += hb * obs[i] * spinOf(st, i); boltz.push(Math.exp(e)); }
  let zb = sumOf(boltz), piB = boltz.map((v) => v / zb), km = zerosMat(16);
  for (let st = 0; st < 16; st++) for (let i = 0; i < 4; i++) {
    let nb = nbrs[i].reduce((acc, j) => acc + spinOf(st, j), 0), pUp = 1 / (1 + Math.exp(-2 * (cj * nb + hb * obs[i])));
    km[st][st | (1 << i)] += 0.25 * pUp; km[st][st & ~(1 << i)] += 0.25 * (1 - pUp);
  }
  check('4 画素のギブス：行の合計 = 1、π P = π（π = ボルツマン分布）', rowSumErr(km) < 1e-12 && maxAbsDiff(vecMat(piB, km), piB) < 1e-14 && maxAbsDiff(stationaryExact(km), piB) < 1e-12);
  // ノイズ除去：事後平均の多数決は、観測よりずっとまちがいが少ない
  seedRng(1203); makeImages(); let eNoisy = errRate(noisy);
  for (let t = 0; t < 40; t++) imageSweep();
  let eMean = errRate(postMeanImage());
  check('ノイズ除去：まちがい ' + fmtN(100 * eNoisy, 1) + '% → ' + fmtN(100 * eMean, 1) + '%（半分未満）', eMean < eNoisy / 2);
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
