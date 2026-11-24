// ============================================
// 08 マージンで見るブースティング ─ 切り株を 1 本ずつ足す AdaBoost を、「マージン」で観察する（series62/10 の続き）
// 点 i のマージン = yᵢ·F(xᵢ) / Σα（y = ±1、F = Σ α_t·切り株 t の答え）。−1〜1 で、正なら正解、大きいほど「票差が大きい」
//   訓練誤差が 0 になったあとも学習を続けると、いちばん小さいマージンが広がり続ける → テスト誤差は下がるか、ほとんど上がらない
//   右上 = マージンの累積分布（そのマージン以下の点の割合）：5・20・100・500 ラウンドの線を残す。右へ動くほど「自信のある正解」
//   重み ∝ exp(−yᵢF(xᵢ))：マージンの小さい点ほど重くなり、次の切り株はその点を当てにいく
// スペース 一時停止 / ← → データの形（ノイズなし）/ R データを作り直す
// ============================================

let kind = 2, nTrain = 200, nTest = 2000, seedD = 1, paused = false;   // ★ データの形・点の数
const MAX_R = 500, SNAPS = [5, 20, 100, 500], CELLS = 70;              // ★ ラウンドの上限、残す分布のラウンド
let trainD, testD, ys, yt, F, Ft, alphaSum, rounds, hist, snaps, grid, regionImg, firstZero;

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); pixelDensity(1); regionImg = createImage(CELLS, CELLS); selfTest(); restart(); }
function restart() {
  paused = false;
  trainD = makeData2D(kind, nTrain, 0, seedD); testD = makeData2D(kind, nTest, 0, seedD + 500);
  ys = trainD.y.map((v) => 2 * v - 1); yt = testD.y.map((v) => 2 * v - 1);
  F = new Array(nTrain).fill(0); Ft = new Array(nTest).fill(0); alphaSum = 0; rounds = []; hist = []; snaps = {}; firstZero = -1;
  grid = new Float32Array(CELLS * CELLS);
}
function boostWeights() { let mn = Math.min(...F.map((f, i) => ys[i] * f)), w = F.map((f, i) => Math.exp(-(ys[i] * f - mn))), s = sumArr(w); return w.map((v) => v / s); }   // 大きな数にならないよう mn を引く
// ★ 1 ラウンド：重み → 重みつき誤りが最小の切り株 → γ = 1 − 2ε、α = ½ ln((1 + γ)/(1 − γ)) → F に足す
function boostRound(fillGrid) {
  let w = boostWeights(), st = fitStump(trainD.X, trainD.y, w), h = trainD.X.map((x) => (stumpProb(st, x) > 0.5 ? 1 : -1)), eps = 0;
  h.forEach((v, i) => { if (v !== ys[i]) eps += w[i]; });
  eps = clampv(eps, 1e-10, 0.5 - 1e-10);
  let gam = 1 - 2 * eps, al = 0.5 * Math.log((1 + gam) / (1 - gam));
  F = F.map((f, i) => f + al * h[i]); testD.X.forEach((x, i) => (Ft[i] += al * (stumpProb(st, x) > 0.5 ? 1 : -1))); alphaSum += al;
  if (fillGrid) for (let j = 0; j < CELLS; j++) for (let i = 0; i < CELLS; i++) grid[i + CELLS * j] += al * (stumpProb(st, [(i + 0.5) / CELLS, 1 - (j + 0.5) / CELLS]) > 0.5 ? 1 : -1);
  let mar = F.map((f, i) => (ys[i] * f) / alphaSum), r = { st, w, eps, gam, al };
  rounds.push(r);
  hist.push({ tr: mar.filter((m) => m <= 0).length / nTrain, te: Ft.filter((f, i) => yt[i] * f <= 0).length / nTest, mn: Math.min(...mar) });
  if (firstZero < 0 && hist[hist.length - 1].tr === 0) firstZero = rounds.length;
  if (SNAPS.includes(rounds.length)) snaps[rounds.length] = mar.slice().sort((a, b) => a - b);
  return r;
}
function margins() { return F.map((f, i) => (alphaSum > 0 ? (ys[i] * f) / alphaSum : 0)); }

function draw() {
  background(...BG_COL);
  if (!paused && rounds.length < MAX_R) for (let q = 0; q < 2 && rounds.length < MAX_R; q++) boostRound(true);
  { paintImage(regionImg, (u, v) => { let s = grid[Math.min(CELLS - 1, Math.floor(u * CELLS)) + CELLS * Math.min(CELLS - 1, Math.floor((1 - v) * CELLS))] / (alphaSum || 1); return probCol(0.5 + 0.5 * clampv(3 * s, -1, 1), 0.8); }); }
  let mar = margins(), side = Math.min(height - 190, width * 0.4), bx = { x: 40, y: 110, w: side, h: side };
  noSmooth(); image(regionImg, bx.x, bx.y, side, side); smooth(); frameBox(bx);
  let w = rounds.length ? boostWeights() : null, iMin = argMaxArr(mar.map((m) => -m));
  stroke(10); strokeWeight(1);
  trainD.X.forEach((x, i) => { let p = toPx(bx, x[0], x[1]); fill(...CLS_COL[trainD.y[i]]); circle(p[0], p[1], w ? clampv(Math.sqrt(w[i] * nTrain) * 7, 3, 22) : 7); });
  if (rounds.length) { let p = toPx(bx, trainD.X[iMin][0], trainD.X[iMin][1]); noFill(); stroke(255); strokeWeight(2); circle(p[0], p[1], 26); }
  noStroke(); fill(200, 185, 170); textSize(13); textAlign(LEFT, BASELINE);
  text('色の濃さ = |F| / Σα、点の大きさ = いまの重み、白い輪 = マージンが最小の点', bx.x, bx.y + side + 22, side);
  // ---- 右上：マージンの累積分布
  let rx = bx.x + side + 70, g = { x: rx, y: 110, w: width - rx - 50, h: height * 0.33, x0: -1, x1: 1, y0: 0, y1: 1 };
  plotAxes(g, 'マージン y·F(x)/Σα', 'マージンの累積分布（その値以下の訓練点の割合）', [-1, -0.5, 0, 0.5, 1], [0, 0.5, 1]);
  stroke(110, 80, 85); line(gX(g, 0), g.y, gX(g, 0), g.y + g.h);
  let cdf = (arr) => { let pts = [[gX(g, -1), gY(g, 0)]]; arr.forEach((m, k) => { pts.push([gX(g, m), gY(g, k / arr.length)], [gX(g, m), gY(g, (k + 1) / arr.length)]); }); pts.push([gX(g, 1), gY(g, 1)]); return pts; };
  SNAPS.forEach((r, q) => { if (!snaps[r]) return; let c = [[150, 130, 130], [196, 72, 96], [110, 165, 240], [64, 186, 176]][q]; stroke(...c); strokeWeight(1.5); polyline(cdf(snaps[r])); noStroke(); fill(...c); textSize(12); textAlign(LEFT, CENTER); text(r + ' 回', gX(g, snaps[r][Math.floor(nTrain / 2)]) + 6, gY(g, 0.5) + 14 * q - 20); });
  if (rounds.length) { stroke(...GOLD); strokeWeight(3); polyline(cdf(mar.slice().sort((a, b) => a - b))); }
  // ---- 右下：誤差と最小マージン（横軸は対数）
  let g2 = { x: rx, y: g.y + g.h + 70, w: g.w, h: height - g.y - g.h - 170, x0: 0, x1: Math.log10(MAX_R), y0: -0.05, y1: 0.25 };
  plotAxes(g2, 'ラウンド（対数目盛り：1, 10, 100, 500）', '赤 = 訓練誤差、青緑 = テスト誤差、金 = 最小マージン', [0, 1, 2, Math.log10(MAX_R)], [0, 0.1, 0.2]);
  stroke(110, 80, 85); strokeWeight(1); line(g2.x, gY(g2, 0), g2.x + g2.w, gY(g2, 0));
  for (let [key2, c] of [['tr', WINE], ['te', TEAL], ['mn', GOLD]]) { stroke(...c); strokeWeight(2.2); polyline(hist.map((h, k) => [gX(g2, Math.log10(k + 1)), gY(g2, h[key2])])); }
  if (firstZero > 0) { stroke(255, 120); drawingContext.setLineDash([4, 4]); line(gX(g2, Math.log10(firstZero)), g2.y, gX(g2, Math.log10(firstZero)), g2.y + g2.h); drawingContext.setLineDash([]); }
  // ---- 文字
  let last = hist[hist.length - 1];
  noStroke(); fill(...INK); textSize(20); textAlign(LEFT, BASELINE);
  text('マージンで見るブースティング　データ：' + SHAPES[kind] + '　ラウンド ' + rounds.length + (paused ? '（一時停止）' : ''), 40, 40);
  fill(170, 155, 145); textSize(15); text('スペース 一時停止　← → データの形　R データを作り直す', 40, 66);
  if (last) { fill(220, 210, 195); textSize(14); text('訓練誤差 ' + pctStr(last.tr) + '　テスト誤差 ' + pctStr(last.te) + '　最小マージン ' + fmtNum(last.mn, 3) + (firstZero > 0 ? '　（訓練誤差 0 になったのは ' + firstZero + ' 回目：点線）' : ''), rx, height - 40); }
  drawSelfTest(width - 170, height - 12);
}
function keyPressed() {
  if (key === ' ') paused = !paused;
  if (key === RIGHT_ARROW) { kind = (kind + 1) % SHAPES.length; restart(); }
  if (key === LEFT_ARROW) { kind = (kind + SHAPES.length - 1) % SHAPES.length; restart(); }
  if (key === 'r' || key === 'R') { seedD++; restart(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  kind = 2; seedD = 1; restart();
  let okBest = true, okW = true, okId = true, prod = 1;
  for (let t = 0; t < MAX_R; t++) {
    let r = boostRound(false);
    if (Math.abs(sumArr(r.w) - 1) > 1e-9) okW = false;
    prod *= Math.sqrt(1 - r.gam * r.gam);
    let ex = meanOf(F.map((f, i) => Math.exp(-ys[i] * f)));
    if (Math.abs(ex / prod - 1) > 1e-9) okId = false;
    if (t < 20) {                       // 総当たり：全部の特徴量 × 全部の中点のしきい値で、左右を多数決にしたときの重みつき誤り
      let best = Infinity;
      for (let f = 0; f < 2; f++) { let vals = [...new Set(trainD.X.map((x) => x[f]))].sort((a, b) => a - b); for (let q = 0; q + 1 < vals.length; q++) { let th = (vals[q] + vals[q + 1]) / 2, wl = [0, 0], wr = [0, 0]; trainD.X.forEach((x, i) => ((x[f] <= th ? wl : wr)[trainD.y[i]] += r.w[i])); best = Math.min(best, Math.min(...wl) + Math.min(...wr)); } }
      if (Math.abs(best - r.eps) > 1e-9) okBest = false;
    }
  }
  check('選んだ切り株の重みつき誤り ε = 総当たりの最小（最初の 20 ラウンド）、重みの合計はいつも 1', okBest && okW);
  check('指数損失の恒等式：(1/n) Σ exp(−yᵢF(xᵢ)) = Π √(1 − γ_t²)（500 ラウンド、相対 1e-9）→ 訓練誤差の上限', okId && hist[MAX_R - 1].tr <= prod + 1e-12);
  let m = margins();
  check('マージンはすべて −1〜1（Σ|α·h| = Σα で割っているから）', m.every((v) => v >= -1 - 1e-12 && v <= 1 + 1e-12));
  let z = firstZero, cps = [z, Math.max(z + 1, 100), 250, 500].map((r) => hist[r - 1].mn);
  check('円：訓練誤差 0 は ' + z + ' 回目。その後も最小マージンは増え続ける（' + cps.map((v) => fmtNum(v, 3)).join(' → ') + '）', z > 0 && z < 250 && cps[0] < cps[1] && cps[1] < cps[2] && cps[2] < cps[3]);
  check('訓練誤差 0 のあと 500 回まで続けても、テスト誤差はほとんど上がらない（' + pctStr(hist[z - 1].te) + ' → ' + pctStr(hist[MAX_R - 1].te) + '）', hist[MAX_R - 1].te <= hist[z - 1].te + 0.02);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 白い輪（マージン最小の点）はどこにある？ 境界のすぐそば？ その点の大きさ（重み）は？
// 2. 累積分布の線が、ラウンドとともに右へ動くのを見よう。訓練誤差 0（線が 0 の左にない）のあとも動き続ける
// 3. ← → で XOR やしまのデータにすると、訓練誤差 0 までに何ラウンドかかる？ マージンはどこまで広がる？
// 4. series62/10 の AdaBoost は α = ln((1 − ε)/ε)。ここは ½ がつくが、マージンは Σα で割るので同じ形になる
// 5. ノイズ（まちがったラベル）があると、その点のマージンを広げようとして重みが集中する。makeData2D の 0 を 0.05 に

// ==================================================
// ここから下は「アンサンブル学習の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 小さな道具：はさむ・合計・平均・いちばん大きい番号・数の表示
function clampv(v, a, b) { return v < a ? a : v > b ? b : v !== v ? a : v; }     // NaN なら a に戻す
function sumArr(a) { let s = 0; for (let v of a) s += v; return s; }
function meanOf(a) { return a.length ? sumArr(a) / a.length : 0; }
function varOf(a) { let m = meanOf(a), s = 0; for (let v of a) s += (v - m) * (v - m); return a.length ? s / a.length : 0; }   // ÷n の分散
function argMaxArr(a) { let b = 0; for (let i = 1; i < a.length; i++) if (a[i] > a[b]) b = i; return b; }   // 同点なら小さい番号
function sigm(z) { return 1 / (1 + Math.exp(-clampv(z, -40, 40))); }
function fmtNum(v, d) { if (typeof v !== 'number' || !isFinite(v)) return '?'; let s = (+v.toFixed(d === undefined ? 2 : d)).toString(); return s === '-0' ? '0' : s; }
function pctStr(v) { return fmtNum(100 * v, 1) + '%'; }
// ---- 種つきの乱数（同じ種なら毎回同じ列）
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
function rndGauss() { let u = Math.max(1e-12, rnd()), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }   // 標準正規分布
function shuffleArr(a) { for (let i = a.length - 1; i > 0; i--) { let j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
// ---- 合成データ（[0, 1]² の 2 次元、2 クラス、種つき）。kind = 0 かたまり / 1 斜め / 2 円 / 3 XOR / 4 三日月 / 5 しま
const SHAPES = ['かたまり', '斜め', '円', 'XOR', '三日月', 'しま'];
function trueLabel(kind, u, v) {
  if (kind === 0) return (u - 0.32) ** 2 + (v - 0.36) ** 2 < (u - 0.68) ** 2 + (v - 0.64) ** 2 + 0.03 * Math.sin(9 * u) ? 0 : 1;
  if (kind === 1) return u + 0.8 * v > 0.9 ? 1 : 0;
  if (kind === 2) return (u - 0.5) ** 2 + (v - 0.5) ** 2 < 0.09 ? 1 : 0;
  if (kind === 3) return (u > 0.5) !== (v > 0.5) ? 1 : 0;
  if (kind === 4) return v > 0.5 + 0.28 * Math.cos(Math.PI * (1.6 * u - 0.3)) - 0.18 ? 1 : 0;
  return Math.sin(10 * u + 3 * v) > 0 ? 1 : 0;
}
// n 個、flip = ラベルをわざと入れかえる割合（ノイズ）
function makeData2D(kind, n, flip, seed) {
  seedRng(seed);
  let X = [], y = [];
  for (let i = 0; i < n; i++) {
    let u = 0.02 + 0.96 * rnd(), v = 0.02 + 0.96 * rnd(), c = trueLabel(kind, u, v);
    if (rnd() < flip) c = 1 - c;
    X.push([u, v]); y.push(c);
  }
  return { X, y };
}
// ---- 切り株（深さ 1 の木）：特徴量 1 つ × しきい値 1 つ。重み w つき。左右の葉 = クラス 1 の重みの割合（確率）
function fitStump(X, y, w) {
  let n = X.length, W = 0, W1 = 0, best = null;
  for (let i = 0; i < n; i++) { let wi = w ? w[i] : 1; W += wi; if (y[i]) W1 += wi; }
  for (let f = 0; f < 2; f++) {
    let ord = X.map((_, i) => i).sort((a, b) => X[a][f] - X[b][f]), lw = 0, l1 = 0;
    for (let q = 0; q < n - 1; q++) {
      let i = ord[q], wi = w ? w[i] : 1; lw += wi; if (y[i]) l1 += wi;
      let v0 = X[i][f], v1 = X[ord[q + 1]][f]; if (!(v1 > v0)) continue;
      let err = Math.min(l1, lw - l1) + Math.min(W1 - l1, W - lw - (W1 - l1));   // 左右それぞれ多数決にしたときの重みつき誤り
      if (!best || err < best.err - 1e-12) best = { feat: f, thr: (v0 + v1) / 2, lw, l1, err };
    }
  }
  if (!best) return { type: 'stump', feat: 0, thr: 2, pl: (W1 + 1) / (W + 2), pr: 0.5, err: Math.min(W1, W - W1) };
  return { type: 'stump', feat: best.feat, thr: best.thr, pl: (best.l1 + 0.5) / (best.lw + 1), pr: (W1 - best.l1 + 0.5) / (W - best.lw + 1), err: best.err };
}
function stumpProb(m, x) { return x[m.feat] <= m.thr ? m.pl : m.pr; }
// ---- 描く道具：色（オーケストラ：えんじ色の黒、象牙色、金管の金、弦の青緑）、領域の絵、点
const BG_COL = [24, 11, 16];                                     // 背景（えんじ色の黒）
const INK = [242, 233, 214], GOLD = [226, 176, 74], TEAL = [64, 186, 176], WINE = [196, 72, 96];
const CLS_COL = [[226, 170, 70], [60, 182, 176]];                // ★ クラス 0（金）・クラス 1（青緑）の色
function probCol(p, k) {             // クラス 1 の確率 → 背景と混ぜた色（k = 濃さ）
  let c = [], a = clampv(k === undefined ? 0.55 : k, 0, 1) * Math.abs(2 * p - 1) + 0.12;
  for (let q = 0; q < 3; q++) c.push(BG_COL[q] + ((p > 0.5 ? CLS_COL[1][q] : CLS_COL[0][q]) - BG_COL[q]) * a);
  return c;
}
// img の全部の画素に fn(u, v) → [r, g, b] を塗る（u は右向き、v は上向き、どちらも 0〜1）
function paintImage(img, fn) {
  img.loadPixels();
  let W = img.width, H = img.height;
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
    let c = fn((px + 0.5) / W, 1 - (py + 0.5) / H), i = 4 * (px + W * py);
    img.pixels[i] = c[0]; img.pixels[i + 1] = c[1]; img.pixels[i + 2] = c[2]; img.pixels[i + 3] = 255;
  }
  img.updatePixels();
}
function toPx(bx, u, v) { return [bx.x + u * bx.w, bx.y + (1 - v) * bx.h]; }   // [0,1]² → 画面
function fromPx(bx, px, py) { return [(px - bx.x) / bx.w, 1 - (py - bx.y) / bx.h]; }
function drawPoints(bx, X, y, r) {
  stroke(10); strokeWeight(1);
  for (let i = 0; i < X.length; i++) { let p = toPx(bx, X[i][0], X[i][1]); fill(...CLS_COL[y[i]]); circle(p[0], p[1], r); }
}
function frameBox(bx, col) { noFill(); stroke(...(col || [110, 80, 85])); strokeWeight(1); rect(bx.x, bx.y, bx.w, bx.h); }
// ---- グラフの道具：g = { x, y, w, h, x0, x1, y0, y1 }
function gX(g, v) { return g.x + clampv((v - g.x0) / (g.x1 - g.x0), -0.02, 1.02) * g.w; }
function gY(g, v) { return g.y + g.h - clampv((v - g.y0) / (g.y1 - g.y0), -0.02, 1.02) * g.h; }
function plotAxes(g, xl, yl, xt, yt) {
  stroke(95, 70, 75); strokeWeight(1); noFill(); rect(g.x, g.y, g.w, g.h);
  noStroke(); fill(175, 160, 150); textSize(12); textAlign(CENTER, TOP);
  for (let v of xt) text(+v.toPrecision(3), gX(g, v), g.y + g.h + 4);
  textAlign(RIGHT, CENTER);
  for (let v of yt) text(+v.toPrecision(3), g.x - 5, gY(g, v));
  textAlign(LEFT, BASELINE); fill(215, 205, 190); textSize(13);
  text(xl, g.x + g.w - textWidth(xl), g.y + g.h + 32); text(yl, g.x, g.y - 8);
}
function polyline(pts) {               // 点が 2 つ以上あるときだけ折れ線を描く（空の beginShape を作らない）
  if (pts.length < 2) return;
  noFill(); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape();
}
function legend(x, y, items) {         // items = [[色, 名前], …]
  textSize(13); textAlign(LEFT, CENTER); noStroke();
  items.forEach(([c, s], k) => { fill(...c); rect(x, y + 20 * k - 5, 14, 10, 2); fill(220, 210, 195); text(s, x + 22, y + 20 * k); });
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) || ArrayBuffer.isView(v) ? Array.from(v).every(noNaN) : !(typeof v === 'number' && !isFinite(v)); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(140, 215, 170) : color(255, 90, 110)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
