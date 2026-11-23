// ============================================
// 10 AdaBoost ─ 弱い「切り株」（深さ 1 の木 = 線 1 本）を 1 本ずつ足し、まちがえた点をどんどん重くする
// 1 ラウンド：重みつきの誤り率 ε がいちばん小さい切り株を選ぶ → 木の重み α = ln((1 − ε)/ε) → まちがえた点の重みを e^α 倍して合計 1 に
//   全体の答え = Σ α_t·(切り株 t の答え ±1) の符号。点の大きさ = いまの重み、黄の線 = いま選んだ切り株
//   訓練誤差は Π 2√(ε_t(1 − ε_t)) 以下（下のグラフの点線）。ε < 0.5 のかぎり、この上限は毎回小さくなる
// スペース 1 本足す / A 自動 / 1〜6 データの形 / R 最初から
// ============================================

let kind = 2, nTrain = 150, nTest = 500, flipP = 0.03, seedD = 8;   // ★ データの形と点の数
const MAX_ROUNDS = 150;
let trainD, testD, boost, autoRun = true, hist = [], regionImg, plotBox, scoreGrid;
const CELLS = 80;

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); pixelDensity(1); regionImg = createImage(CELLS, CELLS); selfTest(); restart(); }
function restart() {
  trainD = makeData2D(kind, nTrain, flipP, seedD); testD = makeData2D(kind, nTest, flipP, seedD + 300);
  boost = makeBoost(trainD.X, trainD.y); hist = []; scoreGrid = new Float32Array(CELLS * CELLS); repaint();
}
// ★ 1 ラウンド進める（切り株を 1 本足す）
function oneRound() {
  if (boost.done || boost.rounds.length >= MAX_ROUNDS) return;
  let r = boostAdd(boost);
  if (!r) return;
  for (let j = 0; j < CELLS; j++) for (let i = 0; i < CELLS; i++) scoreGrid[i + CELLS * j] += r.alpha * (treePredict(r.stump, [(i + 0.5) / CELLS, 1 - (j + 0.5) / CELLS]) === 1 ? 1 : -1);
  hist.push({ tr: 1 - accuracyOf((x) => boostPredict(boost, x), trainD.X, trainD.y), te: 1 - accuracyOf((x) => boostPredict(boost, x), testD.X, testD.y), bound: r.bound, eps: r.eps, alpha: r.alpha });
  repaint();
}
function repaint() {
  let tot = sumArr(boost.rounds.map((r) => r.alpha)) || 1;
  paintImage(regionImg, (u, v) => { let s = scoreGrid[Math.min(CELLS - 1, Math.floor(u * CELLS)) + CELLS * Math.min(CELLS - 1, Math.floor((1 - v) * CELLS))] / tot; if (!boost.rounds.length) return BG_COL; let b = s > 0 ? 1 : 0; return mixCol([1 - b, b], 0.15 + 0.6 * Math.min(1, Math.abs(s) * 2)); });
}

function draw() {
  background(...BG_COL);
  if (autoRun && frameCount % 10 === 0) oneRound();
  let side = Math.min(height - 200, width * 0.45);
  plotBox = { x: 40, y: 100, w: side, h: side };
  noSmooth(); image(regionImg, plotBox.x, plotBox.y, side, side); smooth();
  // 点の大きさ = 重み（はじめは 1/n）
  let n = trainD.X.length, ws = boost.w.map((w) => clampv(Math.sqrt(w * n), 0.35, 4));
  drawPoints(plotBox, trainD.X, trainD.y, 9, ws);
  // いまの切り株
  let last = boost.rounds[boost.rounds.length - 1];
  if (last && !last.stump.leaf) {
    stroke(255, 240, 150); strokeWeight(3); let s = last.stump;
    if (s.feat === 0) { let x = toPx(plotBox, s.thr, 0)[0]; line(x, plotBox.y, x, plotBox.y + side); } else { let yy = toPx(plotBox, 0, s.thr)[1]; line(plotBox.x, yy, plotBox.x + side, yy); }
  }
  noFill(); stroke(90, 120, 100); strokeWeight(1); rect(plotBox.x, plotBox.y, side, side);
  // ---- 誤差のグラフ
  let gx = plotBox.x + side + 70, R = Math.max(20, hist.length), g = { x: gx, y: 130, w: width - gx - 50, h: height * 0.36, x0: 0, x1: R, y0: 0, y1: 0.6 };
  plotAxes(g, 'ラウンド', '誤差（オレンジ = 訓練、緑 = テスト、白の点線 = 上限 Π 2√(ε(1−ε))）', [0, Math.round(R / 2), R], [0, 0.2, 0.4, 0.6]);
  stroke(245, 160, 80); strokeWeight(2.5); polyline(hist.map((h, k) => [gX(g, k + 1), gY(g, h.tr)]));
  stroke(175, 225, 95); strokeWeight(2); polyline(hist.map((h, k) => [gX(g, k + 1), gY(g, h.te)]));
  stroke(255, 255, 255, 170); strokeWeight(1.5); drawingContext.setLineDash([4, 4]); polyline(hist.map((h, k) => [gX(g, k + 1), gY(g, h.bound)])); drawingContext.setLineDash([]);
  // ---- 最近のラウンドの表
  let ty = g.y + g.h + 60; noStroke(); fill(220); textSize(14); textAlign(LEFT, BASELINE);
  text('ラウンド　　ε（重みつき誤り）　α = ln((1−ε)/ε)　訓練誤差　上限', gx, ty);
  hist.slice(-8).forEach((h, q) => { let k = hist.length - Math.min(8, hist.length) + q + 1; fill(q === Math.min(8, hist.length) - 1 ? color(255, 240, 150) : 200); text(String(k).padStart(3, ' ') + '　　　' + fmtNum(h.eps, 4) + '　　　　' + fmtNum(h.alpha, 3) + '　　　　' + fmtNum(h.tr, 3) + '　　' + fmtNum(h.bound, 3), gx, ty + 22 + q * 20); });
  // ---- 文字
  textAlign(LEFT, BASELINE); noStroke(); fill(240); textSize(20);
  text('AdaBoost　データ：' + SHAPES[kind] + '　ラウンド ' + boost.rounds.length + (boost.done ? '（止まった：ε = 0 か 0.5 以上）' : ''), 40, 40);
  fill(170); textSize(15); text('スペース 1 本足す　A 自動' + (autoRun ? '（ON）' : '（OFF）') + '　1〜6 データの形　R 最初から', 40, 66);
  fill(160); textSize(13);
  text('点の大きさ = 重み。まちがえ続ける点ほど大きくなり、次の切り株はその点を当てにいく。色の濃さ = Σα·答え の大きさ（自信）', 40, plotBox.y + side + 26, side);
  drawSelfTest(width - 170, height - 12);
}
function keyPressed() {
  if (key === ' ') { autoRun = false; oneRound(); }
  if (key === 'a' || key === 'A') autoRun = !autoRun;
  for (let k = 1; k <= 6; k++) if (key === String(k)) { kind = k - 1; restart(); }
  if (key === 'r' || key === 'R') { seedD++; restart(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let D = makeData2D(2, 120, 0.03, 31), B = makeBoost(D.X, D.y), okBound = true, okEps = true, okW = true, okHalf = true, okA = true, okBest = true;
  for (let k = 0; k < 40; k++) {
    let wOld = B.w.slice(), r = boostAdd(B);
    if (!r) break;
    let best = Infinity;                          // 総当たりの切り株：全部の特徴量・中点で、左右を多数決にしたときの重みつき誤りの最小
    for (let f = 0; f < 2; f++) {
      let vals = [...new Set(D.X.map((x) => x[f]))].sort((a, b) => a - b);
      for (let q = 0; q + 1 < vals.length; q++) {
        let th = (vals[q] + vals[q + 1]) / 2, wl = [0, 0], wr = [0, 0];
        D.X.forEach((x, i) => { (x[f] <= th ? wl : wr)[D.y[i]] += wOld[i]; });
        best = Math.min(best, Math.min(...wl) + Math.min(...wr));      // 左右それぞれ多数決にしたときの誤り
      }
    }
    if (Math.abs(r.eps - best) > 1e-9) okBest = false;
    if (!(r.eps > 0 && r.eps < 0.5)) okEps = false;
    if (Math.abs(sumArr(B.w) - 1) > 1e-9) okW = false;
    if (Math.abs(r.alpha - Math.log((1 - r.eps) / r.eps)) > 1e-12) okA = false;
    let e2 = 0; D.X.forEach((x, i) => { if (treePredict(r.stump, x) !== D.y[i]) e2 += B.w[i]; });
    if (Math.abs(e2 - 0.5) > 1e-9) okHalf = false;
    if (1 - accuracyOf((x) => boostPredict(B, x), D.X, D.y) > B.bound + 1e-12) okBound = false;
  }
  check('毎ラウンド：訓練誤差 ≤ Π 2√(ε(1 − ε))（40 ラウンド）', okBound);
  check('選んだ切り株の ε = 全部のしきい値を総当たりした重みつき誤りの最小', okBest);
  check('どのラウンドでも 0 < ε < 0.5、α = ln((1 − ε)/ε) > 0', okEps && okA);
  check('重みの合計はいつも 1', okW);
  check('重みを更新すると、いま選んだ切り株の重みつき誤りはちょうど 0.5 になる', okHalf);
  check('上限は ' + B.rounds.length + ' ラウンドで ' + fmtNum(B.bound, 3) + ' まで下がった（< 1）', B.bound < 1 && noNaN(B.w));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. スペースで 1 本ずつ足し、点の大きさの変化を見よう。大きくなるのはどんな点？
// 2. 円（3）のデータを、線 1 本ずつの切り株で囲むには何ラウンドかかる？
// 3. 訓練誤差（オレンジ）が 0 になったあとも、テスト誤差（緑）は下がり続けることがある。確かめよう
// 4. flipP を 0.15 にすると、ノイズの点の重みはどうなる？ AdaBoost はノイズに弱い？
// 5. 11 の勾配ブースティングは「重み」の代わりに「残差」に次の木をあてはめる

// ==================================================
// ここから下は「決定木の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 小さな道具：はさむ・合計・いちばん大きい番号
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
function sumArr(a) { let s = 0; for (let v of a) s += v; return s; }
function argMaxArr(a) { let b = 0; for (let i = 1; i < a.length; i++) if (a[i] > a[b]) b = i; return b; }   // 同点なら小さい番号
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
function rndGauss() { let u = Math.max(1e-12, rnd()), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function shuffleArr(a) { for (let i = a.length - 1; i > 0; i--) { let j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
// ---- 不純度：counts = 各クラスの個数（重みつきでもよい）
function entropyP(p) { return p <= 0 || p >= 1 ? 0 : -p * Math.log2(p) - (1 - p) * Math.log2(1 - p); }   // 2 クラスのエントロピー（ビット）
function entropyOf(counts) {
  let n = sumArr(counts), h = 0; if (n <= 0) return 0;
  for (let c of counts) if (c > 0) { let q = c / n; h -= q * Math.log2(q); }
  return Math.max(0, h);
}
function giniOf(counts) { let n = sumArr(counts), s = 1; if (n <= 0) return 0; for (let c of counts) s -= (c / n) * (c / n); return Math.max(0, s); }
function errOf(counts) { let n = sumArr(counts); return n <= 0 ? 0 : Math.max(0, 1 - Math.max(...counts) / n); }   // 誤分類率
function impurityOf(counts, crit) { return crit === 'entropy' ? entropyOf(counts) : crit === 'error' ? errOf(counts) : giniOf(counts); }
// 分けたときの「不純度の減り」= 親 − (左の割合·左 + 右の割合·右)。crit = 'entropy' なら情報利得
function gainOf(parent, left, right, crit) {
  let n = sumArr(parent), nl = sumArr(left), nr = sumArr(right); if (n <= 0) return 0;
  return impurityOf(parent, crit) - (nl / n) * impurityOf(left, crit) - (nr / n) * impurityOf(right, crit);
}
// ---- CART（分類）：全部の特徴量 × 全部のしきい値（並べた値の中点）を調べて、不純度がいちばん減る分割を選ぶ
// o = { maxDepth, minLeaf, crit: 'gini' | 'entropy' | 'error', mtry（分割ごとに見る特徴量の数）, w（点の重み）, idx（使う点の番号）, nClass }
// ノード = { leaf, feat, thr, left, right, counts, n, imp, pred, dec（重みつきの不純度の減り）, depth, id }
let nodeCounter = 0;
function growTree(X, y, o) {
  o = o || {};
  let ctx = {
    X, y, K: o.nClass || Math.max(1, ...y.map((v) => v + 1)), d: X.length ? X[0].length : 0,
    w: o.w || null, crit: o.crit || 'gini', maxDepth: o.maxDepth === undefined ? 40 : o.maxDepth,
    minLeaf: Math.max(1, o.minLeaf || 1), mtry: o.mtry || 0,
  };
  return growNode(ctx, o.idx ? o.idx.slice() : X.map((_, i) => i), 0);
}
function growNode(ctx, idx, depth) {
  let { X, y, K, w, crit } = ctx, counts = new Array(K).fill(0);
  for (let i of idx) counts[y[i]] += w ? w[i] : 1;
  let node = { leaf: true, counts, n: idx.length, imp: impurityOf(counts, crit), pred: argMaxArr(counts), depth, id: nodeCounter++, dec: 0 };
  let kinds = counts.filter((c) => c > 0).length;
  if (depth >= ctx.maxDepth || idx.length < 2 * ctx.minLeaf || kinds <= 1) return node;
  let best = bestSplit(ctx, idx, counts);
  if (!best) return node;
  let L = [], R = [];
  for (let i of idx) (X[i][best.feat] <= best.thr ? L : R).push(i);
  node.leaf = false; node.feat = best.feat; node.thr = best.thr; node.dec = best.dec;
  node.left = growNode(ctx, L, depth + 1); node.right = growNode(ctx, R, depth + 1);
  return node;
}
// ★ いちばんよい分割：特徴量ごとに点を並べ、左から 1 つずつ動かしながら左右の個数を更新する
function bestSplit(ctx, idx, counts) {
  let feats = Array.from({ length: ctx.d }, (_, f) => f);
  if (ctx.mtry > 0 && ctx.mtry < ctx.d) shuffleArr(feats);     // ランダムフォレスト：前の mtry 個だけを見る
  let first = ctx.mtry > 0 ? Math.min(ctx.mtry, ctx.d) : ctx.d;
  let best = splitOver(ctx, idx, counts, feats.slice(0, first));
  if (!best && first < ctx.d) best = splitOver(ctx, idx, counts, feats.slice(first));   // 切れる特徴量が 1 つもないときだけ残りを見る
  return best;
}
function splitOver(ctx, idx, counts, feats) {
  let { X, y, K, w, crit, minLeaf } = ctx, W = sumArr(counts), pImp = impurityOf(counts, crit), best = null;
  let lc = new Array(K), rc = new Array(K);
  for (let f of feats) {
    let ord = idx.slice().sort((a, b) => X[a][f] - X[b][f]), lw = 0;
    lc.fill(0);
    for (let k = 0; k < ord.length - 1; k++) {
      let i = ord[k], wi = w ? w[i] : 1;
      lc[y[i]] += wi; lw += wi;
      let v0 = X[i][f], v1 = X[ord[k + 1]][f];
      if (!(v1 > v0) || k + 1 < minLeaf || ord.length - k - 1 < minLeaf) continue;   // 同じ値の間では切れない
      for (let j = 0; j < K; j++) rc[j] = counts[j] - lc[j];
      let dec = W * pImp - lw * impurityOf(lc, crit) - (W - lw) * impurityOf(rc, crit);
      if (!best || dec > best.dec + 1e-12) best = { feat: f, thr: (v0 + v1) / 2, dec };
    }
  }
  return best;
}
// 根から葉までたどる。dLim = 見せる深さ、aLim = 剪定の α（alphaCut ≤ α のノードは葉として扱う）
function leafOf(node, x, dLim, aLim) {
  let dl = dLim === undefined ? Infinity : dLim, al = aLim === undefined ? -Infinity : aLim;
  while (!node.leaf && node.depth < dl && !(al >= node.alphaCut)) node = x[node.feat] <= node.thr ? node.left : node.right;
  return node;
}
function treePredict(root, x, dLim, aLim) { return leafOf(root, x, dLim, aLim).pred; }
function isCut(t, dLim, aLim) { return t.leaf || t.depth >= (dLim === undefined ? Infinity : dLim) || (aLim !== undefined && aLim >= t.alphaCut); }
function treeNodes(root, dLim, aLim) {   // 見えているノードを全部（行きがけ順）
  let out = [], st = [root];
  while (st.length) { let t = st.pop(); out.push(t); if (!isCut(t, dLim, aLim)) st.push(t.right, t.left); }
  return out;
}
function countLeaves(root, dLim, aLim) { return treeNodes(root, dLim, aLim).filter((t) => isCut(t, dLim, aLim)).length; }
function treeDepth(root, dLim, aLim) { return Math.max(...treeNodes(root, dLim, aLim).map((t) => t.depth)); }
function accuracyOf(fn, X, y, idx) {     // fn(x) → クラス。idx を渡すとその点だけ
  let ids = idx || X.map((_, i) => i), ok = 0;
  for (let i of ids) if (fn(X[i]) === y[i]) ok++;
  return ids.length ? ok / ids.length : 0;
}
// ---- AdaBoost（2 クラスの SAMME）：切り株（深さ 1 の木）を、まちがえた点ほど重くして 1 本ずつ足す
// ε = 重みつきの誤り率、α = ln((1 − ε)/ε)、まちがえた点の重み × e^α → 合計 1 に。訓練誤差 ≤ Π 2√(ε(1 − ε))
function makeBoost(X, y) { let n = X.length; return { X, y, w: new Array(n).fill(1 / n), rounds: [], bound: 1, done: false }; }
function boostAdd(B) {
  if (B.done) return null;
  let st = growTree(B.X, B.y, { maxDepth: 1, w: B.w, crit: 'error', nClass: 2 }), eps = 0;
  let wrong = B.X.map((x, i) => treePredict(st, x) !== B.y[i]);
  wrong.forEach((b, i) => { if (b) eps += B.w[i]; });
  if (eps <= 1e-10 || eps >= 0.5 - 1e-10) { B.done = true; return null; }   // 完ぺき、または当てずっぽう以下なら止める
  let alpha = Math.log((1 - eps) / eps), s = 0;
  B.w = B.w.map((v, i) => (wrong[i] ? v * Math.exp(alpha) : v)); s = sumArr(B.w); B.w = B.w.map((v) => v / s);
  B.bound *= 2 * Math.sqrt(eps * (1 - eps));
  let r = { stump: st, eps, alpha, bound: B.bound }; B.rounds.push(r);
  return r;
}
function boostScore(B, x, m) { let s = 0, M = Math.min(m === undefined ? B.rounds.length : m, B.rounds.length); for (let k = 0; k < M; k++) s += B.rounds[k].alpha * (treePredict(B.rounds[k].stump, x) === 1 ? 1 : -1); return s; }
function boostPredict(B, x, m) { return boostScore(B, x, m) > 0 ? 1 : 0; }
// ---- 合成データ（[0, 1]² の 2 次元、種つき）。kind = 0 かたまり / 1 斜め / 2 円 / 3 XOR / 4 箱 / 5 しま
const SHAPES = ['かたまり', '斜め', '円', 'XOR', '箱', 'しま'];
function trueLabel(kind, u, v) {
  if (kind === 0) return (u - 0.32) ** 2 + (v - 0.36) ** 2 < (u - 0.68) ** 2 + (v - 0.64) ** 2 + 0.03 * Math.sin(9 * u) ? 0 : 1;
  if (kind === 1) return u + 0.8 * v > 0.9 ? 1 : 0;
  if (kind === 2) return (u - 0.5) ** 2 + (v - 0.5) ** 2 < 0.09 ? 1 : 0;
  if (kind === 3) return (u > 0.5) !== (v > 0.5) ? 1 : 0;
  if (kind === 4) return u > 0.25 && u < 0.7 && v > 0.3 && v < 0.8 ? 1 : 0;
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
// ---- 描く道具：クラスの色、領域の絵、木の図
const CLS_COL = [[245, 140, 75], [85, 175, 240], [175, 225, 95]];   // ★ クラス A・B・C の色
const BG_COL = [20, 30, 26];                                       // 背景（森の色）
function mixCol(probs, k) {           // クラスの割合 → 背景と混ぜた色（k = 色の濃さ）
  let c = BG_COL.slice(), s = sumArr(probs) || 1;
  probs.forEach((p, j) => { for (let q = 0; q < 3; q++) c[q] += (p / s) * (CLS_COL[j][q] - BG_COL[q]) * k; });
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
function drawPoints(bx, X, y, r, ws) {   // ws = 点の大きさの倍率（なければ 1）
  stroke(15); strokeWeight(1);
  for (let i = 0; i < X.length; i++) { let p = toPx(bx, X[i][0], X[i][1]); fill(...CLS_COL[y[i]]); circle(p[0], p[1], r * (ws ? ws[i] : 1)); }
}
function fmtNum(v, d) { if (!isFinite(v)) return '?'; let s = (+v.toFixed(d === undefined ? 2 : d)).toString(); return s === '-0' ? '0' : s; }
// ---- グラフの道具：g = { x, y, w, h, x0, x1, y0, y1 }
function gX(g, v) { return g.x + clampv((v - g.x0) / (g.x1 - g.x0), -0.02, 1.02) * g.w; }
function gY(g, v) { return g.y + g.h - clampv((v - g.y0) / (g.y1 - g.y0), -0.02, 1.02) * g.h; }
function plotAxes(g, xl, yl, xt, yt) {
  stroke(80, 100, 90); strokeWeight(1); noFill(); rect(g.x, g.y, g.w, g.h);
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
function noNaN(v) { return Array.isArray(v) ? v.every(noNaN) : !(typeof v === 'number' && v !== v); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(120, 210, 150) : color(255, 90, 90)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
