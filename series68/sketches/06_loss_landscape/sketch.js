// ============================================
// 06 損失の地形 ─ 隠れ 3 個（tanh）の小さな回帰ネットの重みは 10 個 → 損失は 10 次元の山と谷
// 10 次元は見えないので、学習で着いた点 θ* を通る「平面」で切った断面を、等高線（左）と 3D（右）で描く：L(θ* + a d1 + b d2)
//   1 ランダムな 2 方向　2 学習の軌跡の主成分（いちばん動いた 2 方向）＋軌跡　3 隠れニューロンの入れかえ：θ* と、1 番と 2 番を入れかえた πθ*
// 入れかえても関数はまったく同じ → 損失も同じ。だから谷は必ず何個もあり、まっすぐ結ぶと途中に峠ができる
// 1 2 3 断面 / D 方向を引き直す / R 別の種で学習し直す / ← → 3D を回す / スペース 回転を止める / T 軌跡のアニメ
// ============================================

const HID = 3, NPTS = 16, RES = 120;      // ★ 隠れ層の数、データの点の数、等高線の細かさ
const SLICE = ['ランダムな 2 方向', '軌跡の主成分', '入れかえの対称性'];
let dataX = [], dataY = [], thetaStar = null, thetaInit = null, traj = [], seedL = 1, sliceMode = 1, dirs = null, lossGrid = null, lossRow = 0, conBuf = null;
let rotA = 0.6, spin = true, trajT = 0, ranges = [1, 1], lossInit = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  conBuf = createGraphics(RES, RES); conBuf.pixelDensity(1);
  retrain();
}

// ---- データとネット（θ = [w1 ×3, b1 ×3, w2 ×3, b2]、出力 = b2 + Σ w2_j tanh(w1_j x + b1_j)）
function makeData(seed) { seedRng(seed); dataX = []; dataY = []; for (let i = 0; i < NPTS; i++) { let x = -1.5 + (3 * i) / (NPTS - 1); dataX.push(x); dataY.push(Math.sin(2.2 * x) + 0.1 * randn()); } }
function netOut(th, x) { let o = th[3 * HID]; for (let j = 0; j < HID; j++) o += th[2 * HID + j] * Math.tanh(th[j] * x + th[HID + j]); return o; }
function lossOf(th) { let s = 0; for (let i = 0; i < NPTS; i++) { let e = netOut(th, dataX[i]) - dataY[i]; s += e * e; } return s / (2 * NPTS); }
function gradOf(th) {
  let g = new Array(th.length).fill(0);
  for (let i = 0; i < NPTS; i++) {
    let x = dataX[i], hs = [], o = th[3 * HID];
    for (let j = 0; j < HID; j++) { hs.push(Math.tanh(th[j] * x + th[HID + j])); o += th[2 * HID + j] * hs[j]; }
    let d = (o - dataY[i]) / NPTS;
    g[3 * HID] += d;
    for (let j = 0; j < HID; j++) { g[2 * HID + j] += d * hs[j]; let dz = d * th[2 * HID + j] * (1 - hs[j] * hs[j]); g[HID + j] += dz; g[j] += dz * x; }
  }
  return g;
}
// 隠れニューロン i と j を入れかえる（π）、ニューロン j の符号を全部反転（tanh は奇関数）
function permuteHidden(th, i, j) { let t = th.slice(); for (let blk = 0; blk < 3; blk++) { t[blk * HID + i] = th[blk * HID + j]; t[blk * HID + j] = th[blk * HID + i]; } return t; }
function flipHidden(th, j) { let t = th.slice(); for (let blk = 0; blk < 3; blk++) t[blk * HID + j] = -th[blk * HID + j]; return t; }
function trainAdam(th, iters, lr, every) {   // Adam で学習し、every 歩ごとに軌跡を記録
  let m = th.map(() => 0), v = th.map(() => 0), path = [th.slice()];
  for (let t = 1; t <= iters; t++) {
    let g = gradOf(th);
    for (let q = 0; q < th.length; q++) { m[q] = 0.9 * m[q] + 0.1 * g[q]; v[q] = 0.999 * v[q] + 0.001 * g[q] * g[q]; th[q] = clampv(th[q] - (lr * m[q]) / (1 - Math.pow(0.9, t)) / (Math.sqrt(v[q] / (1 - Math.pow(0.999, t))) + 1e-8), -30, 30); }
    if (t % every === 0) path.push(th.slice());
  }
  return path;
}
function retrain() {
  makeData(60 + seedL); seedRng(600 + seedL);
  thetaInit = []; for (let q = 0; q < 3 * HID + 1; q++) thetaInit.push(0.8 * randn());
  lossInit = lossOf(thetaInit);
  traj = trainAdam(thetaInit.slice(), 3000, 0.03, 10); thetaStar = traj[traj.length - 1];
  makeDirs();
}
// ★ 主成分：軌跡 (θ_t − θ*) の共分散行列の固有ベクトルを、べき乗法（＋ 1 本目を引いてもう 1 回）で
function principalDirs(path, center) {
  let n = center.length, cov = zerosMat(n);
  for (let p of path) { let d = p.map((v, q) => v - center[q]); for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) cov[a][b] += d[a] * d[b]; }
  let out = [], lams = [], tr = 0; for (let a = 0; a < n; a++) tr += cov[a][a];
  for (let k = 0; k < 2; k++) {
    let v = new Array(n).fill(0).map((_, q) => Math.sin(q + 1 + k));
    for (let it = 0; it < 500; it++) { let w = matVec(cov, v); for (let o of out) { let c = dotV(w, o); w = w.map((x, q) => x - c * o[q]); } let nw = normV(w); if (!(nw > 0)) break; v = w.map((x) => x / nw); }
    out.push(v); lams.push(dotV(v, matVec(cov, v)));
  }
  return { dirs: out, explained: (lams[0] + lams[1]) / Math.max(1e-300, tr) };
}
function makeDirs() {
  let n = thetaStar.length, sc = normV(thetaStar);
  if (sliceMode === 0) { dirs = [0, 1].map(() => { let d = []; for (let q = 0; q < n; q++) d.push(randn()); let nd = normV(d); return d.map((v) => (v / nd) * sc * 0.6); }); ranges = [1, 1]; }
  else if (sliceMode === 1) {
    let pc = principalDirs(traj, thetaStar).dirs, ext = [0, 1].map((k) => Math.max(...traj.map((p) => Math.abs(dotV(pc[k], p.map((v, q) => v - thetaStar[q]))))));
    dirs = pc; ranges = ext.map((e) => Math.max(0.3, e * 1.2));
  } else {
    let d1 = permuteHidden(thetaStar, 0, 1).map((v, q) => v - thetaStar[q]), r = []; for (let q = 0; q < n; q++) r.push(randn());
    let c = dotV(r, d1) / Math.max(1e-12, dotV(d1, d1)); r = r.map((v, q) => v - c * d1[q]); let nr = normV(r);
    dirs = [d1, r.map((v) => (v / nr) * normV(d1) * 0.5)]; ranges = [1.5, 1];
  }
  lossGrid = new Float64Array(RES * RES); lossRow = 0;
}
function sliceAB(i, j) { return [(-1 + (2 * (i + 0.5)) / RES) * ranges[0] + (sliceMode === 2 ? 0.25 : 0), (1 - (2 * (j + 0.5)) / RES) * ranges[1]]; }
function pointAt(a, b) { return thetaStar.map((v, q) => v + a * dirs[0][q] + b * dirs[1][q]); }
function projectAB(th) {                 // 軌跡の点を平面の座標 (a, b) に（2 × 2 の最小 2 乗）
  let d = th.map((v, q) => v - thetaStar[q]), g11 = dotV(dirs[0], dirs[0]), g12 = dotV(dirs[0], dirs[1]), g22 = dotV(dirs[1], dirs[1]), r1 = dotV(d, dirs[0]), r2 = dotV(d, dirs[1]), det = g11 * g22 - g12 * g12;
  return det > 1e-300 ? [(r1 * g22 - r2 * g12) / det, (r2 * g11 - r1 * g12) / det] : [0, 0];
}
function lossCol(lg, band) { let t = clampv((lg + 3) / 4, 0, 1); let c = t < 0.5 ? mixCol([20, 70, 90], LIME, t * 2) : mixCol(LIME, MAG, (t - 0.5) * 2); return band ? c.map((v) => v * 0.55) : c; }

function draw() {
  background(...BG);
  let t0 = performance.now();
  while (lossRow < RES && performance.now() - t0 < 6) { for (let i = 0; i < RES; i++) { let ab = sliceAB(i, lossRow); lossGrid[lossRow * RES + i] = Math.log10(Math.max(1e-6, lossOf(pointAt(ab[0], ab[1])))); } lossRow++; }
  if (lossRow === RES && !conBuf.done) paintContours();
  if (spin) rotA += 0.004;
  trajT = (trajT + 2) % (traj.length + 60);
  hudTitle('損失の地形：' + SLICE[sliceMode] + '　L(θ*) = ' + fmtE(lossOf(thetaStar)) + '（はじめ ' + fmtN(lossInit, 3) + '）',
    '1 2 3 断面をえらぶ　D 方向を引き直す　R 別の種で学習　← → 3D を回す　スペース 回転 ' + (spin ? 'ON' : 'OFF') + '　（重み 10 個、データ ' + NPTS + ' 点、Adam 3000 歩）');
  let sz = Math.min(width * 0.42, height - 210), bx = { x: 40, y: 100, w: sz };
  if (conBuf.done) { image(conBuf, bx.x, bx.y, sz, sz); }
  else { noStroke(); fill(...PANEL); rect(bx.x, bx.y, sz, sz); fill(...SUB); textSize(14); text('計算中… ' + lossRow + ' / ' + RES, bx.x + 20, bx.y + 30); }
  let toS = (ab) => [bx.x + ((ab[0] - (sliceMode === 2 ? 0.25 : 0)) / ranges[0] + 1) / 2 * sz, bx.y + (1 - (ab[1] / ranges[1] + 1) / 2) * sz];
  if (sliceMode !== 2) {
    let pts = traj.map((p) => toS(projectAB(p))).filter((p) => p[0] > bx.x - 20 && p[0] < bx.x + sz + 20);
    stroke(...INK, 200); strokeWeight(1.5); polyline(pts);
    let k = Math.min(traj.length - 1, trajT), q = toS(projectAB(traj[k])); noStroke(); fill(...AMBER); circle(q[0], q[1], 11);
  }
  let s0 = toS([0, 0]); noFill(); stroke(...INK); strokeWeight(2); circle(s0[0], s0[1], 14);
  noStroke(); fill(...INK); textSize(13); textAlign(LEFT, BASELINE); text('θ*', s0[0] + 10, s0[1] - 8);
  if (sliceMode === 2) { let s1 = toS([1, 0]); noFill(); stroke(...INK); circle(s1[0], s1[1], 14); noStroke(); fill(...INK); text('πθ*（入れかえ）', s1[0] + 10, s1[1] - 8); }
  fill(...SUB); textSize(13);
  let note = sliceMode === 0 ? 'ランダムな方向では、たいてい「お椀」に見える（10 次元のごく一部しか見ていない）' : sliceMode === 1 ? '白 = 学習の軌跡を平面に写したもの、オレンジ = いまの位置（はじめは遠くから谷へ）' : '同じ深さの谷が 2 つ。まっすぐ結ぶと途中に山 → 損失の地形は凸ではない';
  text(note, bx.x, bx.y + sz + 22);
  text('色：濃い青 = 低い、ライム → マゼンタ = 高い（log₁₀ の帯 = 等高線）', bx.x, bx.y + sz + 42);
  // ---- 右：3D のワイヤーフレーム（2D の画面に自分で射影）
  let cx = bx.x + sz + (width - bx.x - sz) / 2, cy = bx.y + sz * 0.5, sc3 = Math.min(width - bx.x - sz - 60, sz) * 0.42;
  if (lossRow === RES) drawWire(cx, cy, sc3);
  if (sliceMode === 2 && lossRow === RES) {
    let line1 = []; for (let i = 0; i < RES; i++) { let ab = sliceAB(i, Math.floor(RES / 2)); if (ab[0] >= 0 && ab[0] <= 1) line1.push(lossOf(pointAt(ab[0], 0))); }
    fill(...INK); textSize(14); text('θ* → πθ* の直線上で、いちばん高い所 L = ' + fmtN(Math.max(...line1), 4) + '（両はし ' + fmtE(lossOf(thetaStar)) + '）', bx.x + sz + 40, height - 60);
  }
  drawSelfTest(width - 180, height - 14);
}
function paintContours() {
  conBuf.loadPixels();
  for (let j = 0; j < RES; j++) for (let i = 0; i < RES; i++) {
    let v = lossGrid[j * RES + i], bnd = Math.floor(v * 3), edge = (i + 1 < RES && Math.floor(lossGrid[j * RES + i + 1] * 3) !== bnd) || (j + 1 < RES && Math.floor(lossGrid[(j + 1) * RES + i] * 3) !== bnd);
    let c = lossCol(v, edge), k = 4 * (j * RES + i); conBuf.pixels[k] = c[0]; conBuf.pixels[k + 1] = c[1]; conBuf.pixels[k + 2] = c[2]; conBuf.pixels[k + 3] = 255;
  }
  conBuf.updatePixels(); conBuf.done = true;
}
function drawWire(cx, cy, sc) {          // 高さ = log₁₀ L。30 × 30 の網を回して斜めから見る
  let n = 40, step3 = RES / n, ca = Math.cos(rotA), sa = Math.sin(rotA), proj = (u, v, h) => { let x = u * ca - v * sa, y = u * sa + v * ca; return [cx + x * sc, cy + y * sc * 0.45 - h * sc * 0.35]; };
  let H = (i, j) => clampv((lossGrid[Math.min(RES - 1, Math.round(j * step3)) * RES + Math.min(RES - 1, Math.round(i * step3))] + 1) / 2, -1.5, 1.5);
  strokeWeight(1);
  for (let j = 0; j <= n; j++) { let pts = []; for (let i = 0; i <= n; i++) pts.push(proj(i / n * 2 - 1, j / n * 2 - 1, H(i, j))); stroke(...lossCol(lossGrid[Math.min(RES - 1, Math.round(j * step3)) * RES + Math.floor(RES / 2)]), 200); polyline(pts); }
  for (let i = 0; i <= n; i++) { let pts = []; for (let j = 0; j <= n; j++) pts.push(proj(i / n * 2 - 1, j / n * 2 - 1, H(i, j))); stroke(...WIRE, 220); polyline(pts); }
  let c0 = proj(sliceMode === 2 ? -0.25 / ranges[0] * 1 : 0, 0, clampv((Math.log10(Math.max(1e-6, lossOf(thetaStar))) + 1) / 2, -1.5, 1.5)); noStroke(); fill(...INK); circle(c0[0], c0[1], 10);
}

function keyPressed() {
  if (key >= '1' && key <= '3') { sliceMode = +key - 1; seedRng(700 + frameCount); makeDirs(); conBuf.done = false; }
  if (key === 'd' || key === 'D') { seedRng(800 + frameCount); makeDirs(); conBuf.done = false; }
  if (key === 'r' || key === 'R') { seedL++; retrain(); conBuf.done = false; }
  if (key === RIGHT_ARROW) rotA += 0.2;
  if (key === LEFT_ARROW) rotA -= 0.2;
  if (key === ' ') spin = !spin;
  if (key === 't' || key === 'T') trajT = 0;
  return false;
}

// ============================================
// やってみよう
// ・1 で D を何回か押す。どの方向で切っても θ* は谷底に見える？
// ・2 の軌跡：まっすぐ谷へ向かう？ 途中で平らな所（ゆっくり進む所）はある？
// ・3 で、2 つの谷の深さが本当に同じか確かめる。HID を 2 や 6 にすると入れかえ方は何通り？（ヒント：HID! × 2^HID）
// ・NPTS を 6 に減らすと、谷は広くなる？ 細くなる？
// ============================================

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  makeData(61); seedRng(601);
  let th0 = []; for (let q = 0; q < 3 * HID + 1; q++) th0.push(0.8 * randn());
  let g = gradOf(th0), worst = 0;
  for (let q = 0; q < th0.length; q++) { let a = th0.slice(), b = th0.slice(); a[q] += 1e-6; b[q] -= 1e-6; worst = Math.max(worst, Math.abs(g[q] - (lossOf(a) - lossOf(b)) / 2e-6) / Math.max(1e-6, Math.abs(g[q]))); }
  check('勾配 = 中心差分（相対誤差 ' + fmtE(worst) + '）', worst < 1e-6);
  let path = trainAdam(th0.slice(), 3000, 0.03, 10), ts = path[path.length - 1], L0 = lossOf(th0), L1 = lossOf(ts);
  check('Adam 3000 歩で損失が 1/10 以下（' + fmtN(L0, 3) + ' → ' + fmtE(L1) + '）、着いた所の勾配は小さい', L1 < L0 / 10 && normV(gradOf(ts)) < 1e-3);
  let dp = Math.abs(lossOf(permuteHidden(ts, 0, 1)) - L1), df = Math.abs(lossOf(flipHidden(ts, 2)) - L1);
  check('隠れニューロンの入れかえ・符号の反転で損失は変わらない（ずれ ' + fmtE(Math.max(dp, df)) + '）', dp < 1e-12 && df < 1e-12);
  let mid = ts.map((v, q) => (v + permuteHidden(ts, 0, 1)[q]) / 2);
  check('θ* と πθ* の真ん中は谷より高い（峠：' + fmtN(lossOf(mid), 3) + ' > ' + fmtE(L1) + '）', lossOf(mid) > 2 * L1);
  let pc = principalDirs(path, ts);
  check('主成分の 2 方向は長さ 1 で直交、軌跡の動きの ' + fmtN(100 * pc.explained, 0) + '% を説明', near(normV(pc.dirs[0]), 1, 1e-9) && near(normV(pc.dirs[1]), 1, 1e-9) && Math.abs(dotV(pc.dirs[0], pc.dirs[1])) < 1e-6 && pc.explained > 0.6);
  reportSelfTest();
}

// ==================================================
// ここから下は「神経回路網の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 色と小さな道具（神経細胞：深い青緑の黒、あたたかい白、シナプスのマゼンタ、軸索のライム）
const BG = [8, 22, 24];                  // 背景（深い青緑の黒）
const INK = [246, 238, 224];             // 文字（あたたかい白）
const MAG = [232, 72, 160], LIME = [184, 232, 76], AMBER = [250, 186, 72], SKY = [96, 196, 236], VIOLET = [168, 140, 250];
const SUB = [150, 178, 172], PANEL = [16, 38, 40], WIRE = [44, 76, 76];
function clampv(v, a, b) { return v < a ? a : v > b ? b : v !== v ? a : v; }     // NaN なら a に戻す
function sumOf(a) { let s = 0; for (let v of a) s += v; return s; }
function meanOf(a) { return a.length ? sumOf(a) / a.length : 0; }
function fmtN(v, d) { if (typeof v !== 'number' || v !== v) return '?'; if (!isFinite(v)) return v > 0 ? '∞' : '−∞'; let s = v.toFixed(d === undefined ? 2 : d); return /^-0\.?0*$/.test(s) ? s.slice(1) : s; }
function fmtE(v) { if (typeof v !== 'number' || !isFinite(v)) return '?'; return v === 0 ? '0' : v.toExponential(1); }
function hudTitle(t, sub) {              // 左上のタイトルと操作の説明
  noStroke(); fill(...INK); textSize(22); textAlign(LEFT, BASELINE); text(t, 30, 38);
  fill(...SUB); textSize(14); text(sub, 30, 62);
}
function sigm(z) { return 1 / (1 + Math.exp(-clampv(z, -40, 40))); }
// ---- 種つきの乱数（同じ種なら毎回同じ列 → 実験をくり返せる）
let rngState = 1;
function seedRng(s) { rngState = (s >>> 0) || 1; }
function rnd() {                         // 0〜1 の一様乱数（mulberry32）
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rndInt(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
function randn() { let u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }   // 標準正規分布
function shuffleArr(a) { for (let i = a.length - 1; i > 0; i--) { let j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
// ---- 行列の道具
function zerosMat(n, m) { let a = []; for (let i = 0; i < n; i++) a.push(new Array(m === undefined ? n : m).fill(0)); return a; }
function dotV(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }
function normV(a) { return Math.sqrt(dotV(a, a)); }
function matVec(a, v) { return a.map((r) => dotV(r, v)); }
function transposeM(a) { return a[0].map((_, j) => a.map((r) => r[j])); }
function solveLinear(a, b) {             // ガウスの消去法（部分ピボット）で a x = b。解けなければ null
  let n = b.length, m = a.map((r, i) => r.concat([b[i]]));
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    if (Math.abs(m[p][c]) < 1e-300) return null;
    [m[c], m[p]] = [m[p], m[c]];
    for (let r = c + 1; r < n; r++) { let f = m[r][c] / m[c][c]; if (f !== 0) for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k]; }
  }
  let x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) { let s = m[i][n]; for (let k = i + 1; k < n; k++) s -= m[i][k] * x[k]; x[i] = s / m[i][i]; }
  return x.every((v) => isFinite(v)) ? x : null;
}
// リッジ回帰 (ΦᵀΦ + λI) w = Φᵀ y。phi = 行がデータ、列が特徴
function ridgeSolve(phi, y, lam) {
  let p = phi[0].length, a = zerosMat(p), b = new Array(p).fill(0);
  for (let i = 0; i < phi.length; i++) { let f = phi[i]; for (let j = 0; j < p; j++) { b[j] += f[j] * y[i]; for (let k = j; k < p; k++) a[j][k] += f[j] * f[k]; } }
  for (let j = 0; j < p; j++) { a[j][j] += lam; for (let k = 0; k < j; k++) a[j][k] = a[k][j]; }
  return solveLinear(a, b) || new Array(p).fill(0);
}
// ---- 画像の道具：img の全部の画素に fn(u, v) → [r, g, b] を塗る（u は右向き、v は上向き、どちらも 0〜1）
function paintImage(img, fn) {
  img.loadPixels();
  let w = img.width, h = img.height, d = img.pixelDensity ? img.pixelDensity() : 1;
  for (let py = 0; py < h * d; py++) for (let px = 0; px < w * d; px++) {
    let c = fn((px + 0.5) / (w * d), 1 - (py + 0.5) / (h * d)), i = 4 * (px + w * d * py);
    img.pixels[i] = c[0]; img.pixels[i + 1] = c[1]; img.pixels[i + 2] = c[2]; img.pixels[i + 3] = 255;
  }
  img.updatePixels();
}
function mixCol(a, b, t) { t = clampv(t, 0, 1); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
function divCol(v) { return v >= 0 ? mixCol(PANEL, MAG, v) : mixCol(PANEL, LIME, -v); }   // −1〜1 → ライム・暗い・マゼンタ
// ---- グラフの道具：g = { x, y, w, h, x0, x1, y0, y1 }
function gX(g, v) { return g.x + clampv((v - g.x0) / (g.x1 - g.x0), -0.02, 1.02) * g.w; }
function gY(g, v) { return g.y + g.h - clampv((v - g.y0) / (g.y1 - g.y0), -0.02, 1.02) * g.h; }
function plotAxes(g, xl, yl, xt, yt) {
  stroke(...WIRE); strokeWeight(1); noFill(); rect(g.x, g.y, g.w, g.h);
  noStroke(); fill(...SUB); textSize(12); textAlign(CENTER, TOP);
  for (let v of xt) text(+v.toPrecision(3), gX(g, v), g.y + g.h + 4);
  textAlign(RIGHT, CENTER);
  for (let v of yt) text(+v.toPrecision(3), g.x - 5, gY(g, v));
  textAlign(LEFT, BASELINE); fill(...INK); textSize(13);
  text(xl, g.x + g.w - textWidth(xl), g.y + g.h + 30); text(yl, g.x, g.y - 8);
}
function polyline(pts) {                 // 点が 2 つ以上あるときだけ折れ線を描く（空の beginShape を作らない）
  if (pts.length < 2) return;
  noFill(); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape();
}
function plotXY(g, xs, ys, col, sw) {    // (xs[i], ys[i]) を折れ線で（有限の値だけ）
  let pts = []; for (let i = 0; i < xs.length; i++) if (isFinite(ys[i])) pts.push([gX(g, xs[i]), gY(g, ys[i])]);
  stroke(...col); strokeWeight(sw || 2); polyline(pts);
}
function legend(x, y, items) {           // items = [[色, 名前], …]
  textSize(13); textAlign(LEFT, CENTER);
  for (let [c, s] of items) { noStroke(); fill(...c); rect(x, y - 5, 16, 10); fill(...INK); text(s, x + 22, y); y += 20; }
  textAlign(LEFT, BASELINE);
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function relErr(a, b) { return Math.abs(a - b) / Math.max(1e-12, Math.abs(a) + Math.abs(b)); }
function noNaN(v) { return Array.isArray(v) || ArrayBuffer.isView(v) ? Array.from(v).every(noNaN) : !(typeof v === 'number' && !isFinite(v)); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(150, 230, 170) : color(255, 90, 110)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
