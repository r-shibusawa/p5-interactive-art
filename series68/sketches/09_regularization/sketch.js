// ============================================
// 09 正則化 ─ 少ないデータ（30 点、ラベルに少しまちがいあり）に、大きめのネット（隠れ 32 個）をそのまま学ばせると、
// まちがいの点まで丸く囲む「過学習」になる。3 つのふせぎ方を同時に学習して並べる：
//   ① 重み減衰：損失に (λ/2)‖w‖² を足す → 重みが小さく、境界がなめらか
//   ② 早期終了：正則化なしで学習し、検証用の別のデータの誤差がいちばん小さかった時点で止める（その時の重みを保存）
//   ③ ドロップアウト：学習のたびに隠れニューロンを確率 p で休ませる（残りは 1/(1 − p) 倍）→ 1 つの素子に頼れない
// 下のグラフ：訓練データの損失（細い）とテストデータの損失（太い）。テストの損失が上がり始めたら過学習
// （同じ形の小さなネットを「道具」として使う例：Q 学習 series63/11、アンサンブルで自信を測る series64/13）
// ↑↓ 重み減衰 λ / ← → ドロップアウト p / E 早期終了の重み ⇔ 最後の重み / N 新しいデータ / スペース 一時停止 / R やり直す
// ============================================

const N_TR = 30, N_VAL = 30, N_TE = 400, HIDDEN = 32;   // ★ 訓練・検証・テストの数、隠れ層の大きさ
const FLIP_P = 0.1, MAX_STEPS = 4000, STEPS_PER_FRAME = 8, LR_R = 0.005;   // ★ ラベルのまちがいの割合、学習の長さ
const WD_LIST = [0.001, 0.002, 0.003, 0.004, 0.005, 0.01, 0.03], DROP_LIST = [0.2, 0.35, 0.5, 0.65];
let wdIdx = 3, dropIdx = 2, dataSeedR = 2, trainSet, valSet, testSet, trio = null, hist = null, nStep = 0, best = null, showBest = true, pausedR = false, bufs = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  for (let k = 0; k < 3; k++) { bufs.push(createGraphics(64, 64)); bufs[k].pixelDensity(1); }
  newData(); restartNets();
}

// 2 つの三日月（[−1, 1]² の中）。flip の割合でラベルを入れかえる
function moons(n, flip) {
  let xs = [], ys = [];
  for (let i = 0; i < n; i++) {
    let c = i % 2, t = Math.PI * rnd(), x = c ? 1 - Math.cos(t) : Math.cos(t), y = c ? 0.5 - Math.sin(t) : Math.sin(t);
    x = (x - 0.5) * 0.65 + 0.08 * randn(); y = (y - 0.25) * 0.75 + 0.08 * randn();
    xs.push([x, y]); ys.push(rnd() < flip ? 1 - c : c);
  }
  return { xs, ys };
}
function newData() { seedRng(90 + dataSeedR); trainSet = moons(N_TR, FLIP_P); valSet = moons(N_VAL, FLIP_P); testSet = moons(N_TE, FLIP_P); }
function restartNets() {
  trio = [makeMLP(2, HIDDEN, 9, 1), makeMLP(2, HIDDEN, 9, 1), makeMLP(2, HIDDEN, 9, 1)];   // 3 つとも同じ初期値から
  hist = [[], [], []]; nStep = 0; best = { val: Infinity, step: 0, net: copyMLP(trio[1]) }; seedRng(1234);
}
function trainChunk(k) {
  mlpTrain(trio[0], trainSet.xs, trainSet.ys, k, LR_R, WD_LIST[wdIdx], 0);
  mlpTrain(trio[1], trainSet.xs, trainSet.ys, k, LR_R, 0, 0);
  mlpTrain(trio[2], trainSet.xs, trainSet.ys, k, LR_R, 0, DROP_LIST[dropIdx]);
  nStep += k;
  let v = mlpLoss(trio[1], valSet.xs, valSet.ys);
  if (v < best.val) best = { val: v, step: nStep, net: copyMLP(trio[1]) };
  for (let q = 0; q < 3; q++) hist[q].push([nStep, mlpLoss(trio[q], trainSet.xs, trainSet.ys), mlpLoss(trio[q], testSet.xs, testSet.ys)]);
}
function accOf(m, set) { let ok = 0; set.xs.forEach((x, i) => { if ((mlpOut(m, x) > 0.5 ? 1 : 0) === set.ys[i]) ok++; }); return ok / set.xs.length; }
function weightNorm(m) { let s = 0; for (let r of m.w1) for (let v of r) s += v * v; for (let v of m.w2) s += v * v; return Math.sqrt(s); }

function draw() {
  background(...BG);
  if (!pausedR && nStep < MAX_STEPS) trainChunk(STEPS_PER_FRAME);
  let shown = [trio[0], showBest ? best.net : trio[1], trio[2]];
  hudTitle('正則化：' + nStep + ' / ' + MAX_STEPS + ' 歩（訓練 ' + N_TR + ' 点、ラベルの ' + Math.round(FLIP_P * 100) + '% はまちがい、隠れ ' + HIDDEN + ' 個）',
    '↑↓ 重み減衰 λ = ' + WD_LIST[wdIdx] + '　← → ドロップアウト p = ' + DROP_LIST[dropIdx] + '　E 早期終了の重み ⇔ 最後の重み（' + (showBest ? '早期終了' : '最後') + '）　N 新しいデータ　スペース ' + (pausedR ? '再開' : '一時停止') + '　R やり直す');
  let pw = (width - 120) / 3, sz = Math.min(pw, height * 0.45), titles = ['① 重み減衰 λ = ' + WD_LIST[wdIdx], '② 早期終了（正則化なし）', '③ ドロップアウト p = ' + DROP_LIST[dropIdx]];
  for (let k = 0; k < 3; k++) {
    let x0 = 40 + k * (pw + 20), y0 = 100, m = shown[k];
    if (frameCount % 10 === k || !bufs[k].ok) { paintImage(bufs[k], (u, v) => { let p = mlpOut(m, [-1.2 + 2.4 * u, -1.2 + 2.4 * v]), t = 2 * p - 1; return t >= 0 ? mixCol(PANEL, MAG, 0.1 + 0.45 * t) : mixCol(PANEL, LIME, 0.1 - 0.45 * t); }); bufs[k].ok = true; }
    image(bufs[k], x0, y0, sz, sz);
    trainSet.xs.forEach((x, i) => { stroke(10); strokeWeight(1.5); fill(...(trainSet.ys[i] ? MAG : LIME)); circle(x0 + ((x[0] + 1.2) / 2.4) * sz, y0 + (1 - (x[1] + 1.2) / 2.4) * sz, 10); });
    noStroke(); fill(...INK); textSize(15); textAlign(LEFT, BASELINE); text(titles[k], x0, y0 - 8);
    fill(...SUB); textSize(13);
    text('テストの正解率 ' + fmtN(100 * accOf(m, testSet), 1) + '%　訓練 ' + fmtN(100 * accOf(m, trainSet), 0) + '%　‖w‖ = ' + fmtN(weightNorm(m), 1), x0, y0 + sz + 20);
    if (k === 1) text(showBest ? '表示：' + best.step + ' 歩目（検証の損失が最小）の重み' : '表示：いまの重み（止めなかった場合）', x0, y0 + sz + 40);
    // 損失のグラフ
    let g = { x: x0 + 30, y: y0 + sz + 70, w: sz - 40, h: height - (y0 + sz + 70) - 70, x0: 0, x1: MAX_STEPS, y0: -1.6, y1: 0.7 };
    if (g.h < 60) continue;
    plotAxes(g, '歩数', 'log₁₀ 損失', [0, MAX_STEPS], [-1, 0]);
    let hs = hist[k]; if (hs.length > 1) {
      plotXY(g, hs.map((h) => h[0]), hs.map((h) => Math.log10(Math.max(1e-4, h[1]))), [...SKY, 200], 1.5);
      plotXY(g, hs.map((h) => h[0]), hs.map((h) => Math.log10(Math.max(1e-4, h[2]))), AMBER, 3);
    }
    if (k === 1 && best.step > 0) { stroke(...INK, 150); strokeWeight(1); line(gX(g, best.step), g.y, gX(g, best.step), g.y + g.h); }
  }
  legend(width - 300, 110 + Math.min(pw, height * 0.45) + 76, [[SKY, '訓練の損失'], [AMBER, 'テストの損失']]);
  drawSelfTest(width - 180, height - 14);
}

function keyPressed() {
  if (key === UP_ARROW) { wdIdx = Math.min(WD_LIST.length - 1, wdIdx + 1); restartNets(); }
  if (key === DOWN_ARROW) { wdIdx = Math.max(0, wdIdx - 1); restartNets(); }
  if (key === RIGHT_ARROW) { dropIdx = Math.min(DROP_LIST.length - 1, dropIdx + 1); restartNets(); }
  if (key === LEFT_ARROW) { dropIdx = Math.max(0, dropIdx - 1); restartNets(); }
  if (key === 'e' || key === 'E') { showBest = !showBest; bufs[1].ok = false; }
  if (key === 'n' || key === 'N') { dataSeedR++; newData(); restartNets(); }
  if (key === ' ') pausedR = !pausedR;
  if (key === 'r' || key === 'R') restartNets();
  return false;
}

// ============================================
// やってみよう
// ・最後まで学習させて、② で E を押す。止めなかったネットの境界はどんな形？
// ・λ を 0.001 → 0.03 と変える。境界と ‖w‖ はどう変わる？ 大きすぎると何が起きる？
// ・FLIP_P を 0 にすると、正則化の効き目はどうなる？ N_TR を 200 にしたら？
// ・ドロップアウトの p を大きくすると、訓練の損失（細い線）はどうなる？
// ============================================

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(91); let tr = moons(N_TR, FLIP_P), te = moons(N_TE, FLIP_P);
  let m = makeMLP(2, 8, 5, 2.5), g = mlpGrad(m, tr.xs, tr.ys, 0), p = mlpParams(m), lam = 0.05, worst = 0;
  let regLoss = (q) => { let mm = copyMLP(m); mlpSetParams(mm, q); return mlpLoss(mm, tr.xs, tr.ys) + (lam / 2) * dotV(q, q); };
  let gp = mlpParams(g);
  for (let i = 0; i < p.length; i += 3) { let a = p.slice(), b = p.slice(); a[i] += 1e-6; b[i] -= 1e-6; worst = Math.max(worst, relErr(gp[i] + lam * p[i], (regLoss(a) - regLoss(b)) / 2e-6)); }
  check('重み減衰つきの勾配 ∇L + λw = 差分（相対誤差 ' + fmtE(worst) + '）', worst < 1e-6);
  seedRng(5); let g0 = mlpParams(mlpGrad(m, tr.xs, tr.ys, 0)), gd = mlpParams(mlpGrad(m, tr.xs, tr.ys, 1e-300));
  check('ドロップアウト p → 0 の勾配は、ふつうの勾配と同じ', g0.every((v, i) => near(v, gd[i], 1e-15)));
  seedRng(6); let s = 0, cnt = 20000, keep = 0.5; for (let i = 0; i < cnt; i++) s += rnd() < keep ? 1 / keep : 0;
  check('ドロップアウトのマスク（残すと 1/(1 − p) 倍）の平均 = 1（' + fmtN(s / cnt, 3) + '）', Math.abs(s / cnt - 1) < 0.03);
  let a = makeMLP(2, HIDDEN, 9, 1), b = makeMLP(2, HIDDEN, 9, 1);
  mlpTrain(a, tr.xs, tr.ys, 3000, LR_R, 0, 0); mlpTrain(b, tr.xs, tr.ys, 3000, LR_R, 0.03, 0);
  let ltr = mlpLoss(a, tr.xs, tr.ys), lte = mlpLoss(a, te.xs, te.ys);
  check('正則化なし 3000 歩：訓練の損失 ' + fmtN(ltr, 3) + ' ≪ テストの損失 ' + fmtN(lte, 2) + '（過学習）', ltr < 0.1 && lte > 3 * ltr);
  check('重み減衰（λ = 0.03）で重みが小さく（‖w‖ ' + fmtN(weightNorm(b), 1) + ' < ' + fmtN(weightNorm(a), 1) + '）、テストの損失も下がる', weightNorm(b) < weightNorm(a) && mlpLoss(b, te.xs, te.ys) < lte);
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
// ---- 隠れ層 1 層のニューラルネット（隠れ層 tanh、出力はシグモイド = 分類、交差エントロピーの損失）
// mlp = { nIn, nH, w1[j][k], b1[j], w2[j], b2 }。学習はフルバッチの Adam。1 フレームに少しずつ呼べば画面は止まらない
function makeMLP(nIn, nH, seed, scale) {   // 注意：ここで乱数の種を決め直す
  seedRng(seed);
  let s1 = (scale || 1.5) / Math.sqrt(nIn), m = { nIn, nH, w1: [], b1: [], w2: [], b2: 0, t: 0, ad: null };
  for (let j = 0; j < nH; j++) { m.w1.push(Array.from({ length: nIn }, () => s1 * randn())); m.b1.push(0.5 * randn()); m.w2.push(randn() / Math.sqrt(nH)); }
  return m;
}
function mlpHidden(m, x) { let h = []; for (let j = 0; j < m.nH; j++) { let z = m.b1[j]; for (let k = 0; k < m.nIn; k++) z += m.w1[j][k] * x[k]; h.push(Math.tanh(z)); } return h; }
function mlpOut(m, x) { let h = mlpHidden(m, x), o = m.b2; for (let j = 0; j < m.nH; j++) o += m.w2[j] * h[j]; return sigm(o); }
function mlpLoss(m, xs, ys) {            // 交差エントロピーの平均
  let s = 0; for (let i = 0; i < xs.length; i++) { let p = clampv(mlpOut(m, xs[i]), 1e-12, 1 - 1e-12); s -= ys[i] ? Math.log(p) : Math.log(1 - p); }
  return xs.length ? s / xs.length : 0;
}
// 誤差逆伝播：平均の損失の勾配。pDrop > 0 なら隠れ層のドロップアウト（残した素子は 1/(1 − p) 倍）
function mlpGrad(m, xs, ys, pDrop) {
  let g = { w1: m.w1.map((r) => r.map(() => 0)), b1: m.b1.map(() => 0), w2: m.w2.map(() => 0), b2: 0 }, n = xs.length || 1, keep = 1 - (pDrop || 0);
  for (let i = 0; i < xs.length; i++) {
    let x = xs[i], h = mlpHidden(m, x), mask = h.map(() => (pDrop > 0 ? (rnd() < keep ? 1 / keep : 0) : 1)), o = m.b2;
    for (let j = 0; j < m.nH; j++) o += m.w2[j] * h[j] * mask[j];
    let d = (sigm(o) - ys[i]) / n;       // シグモイド + 交差エントロピーなら、出力の誤差は (予測 − 正解)
    g.b2 += d;
    for (let j = 0; j < m.nH; j++) { g.w2[j] += d * h[j] * mask[j]; let dz = d * m.w2[j] * mask[j] * (1 - h[j] * h[j]); g.b1[j] += dz; for (let k = 0; k < m.nIn; k++) g.w1[j][k] += dz * x[k]; }
  }
  return g;
}
function mlpParams(o) { return [].concat(...o.w1, o.b1, o.w2, [o.b2]); }   // 全部のパラメータを 1 列に
function mlpSetParams(m, p) { let q = 0; for (let j = 0; j < m.nH; j++) for (let k = 0; k < m.nIn; k++) m.w1[j][k] = p[q++]; for (let j = 0; j < m.nH; j++) m.b1[j] = p[q++]; for (let j = 0; j < m.nH; j++) m.w2[j] = p[q++]; m.b2 = p[q++]; }
function mlpTrain(m, xs, ys, iters, lr, wd, pDrop) {   // Adam（β1 = 0.9, β2 = 0.999）、wd = 重み減衰（損失に wd/2 × ‖重み‖² を足す）
  let p = mlpParams(m);
  if (!m.ad) m.ad = { m: p.map(() => 0), v: p.map(() => 0) };
  for (let it = 0; it < iters; it++) {
    let g = mlpParams(mlpGrad(m, xs, ys, pDrop)); m.t++;
    let c1 = 1 - Math.pow(0.9, m.t), c2 = 1 - Math.pow(0.999, m.t);
    for (let q = 0; q < p.length; q++) {
      let gq = g[q] + (wd || 0) * p[q];
      m.ad.m[q] = 0.9 * m.ad.m[q] + 0.1 * gq; m.ad.v[q] = 0.999 * m.ad.v[q] + 0.001 * gq * gq;
      p[q] = clampv(p[q] - (lr || 0.02) * (m.ad.m[q] / c1) / (Math.sqrt(m.ad.v[q] / c2) + 1e-8), -50, 50);
    }
    mlpSetParams(m, p);
  }
}
function copyMLP(m) { return { nIn: m.nIn, nH: m.nH, w1: m.w1.map((r) => r.slice()), b1: m.b1.slice(), w2: m.w2.slice(), b2: m.b2, t: 0, ad: null }; }
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
