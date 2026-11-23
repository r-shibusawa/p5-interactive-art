// ============================================
// 05 深さと過学習 ─ 木を深くすると訓練の正解率は 100% まで上がる。でも新しいデータ（テスト）では？
// ラベルにわざとノイズ（まちがい）を混ぜたデータで、深さ 1〜15 の訓練とテストの正解率をグラフにする
//   深すぎる木は、ノイズの点 1 個のために小さな長方形を作る（= データを「暗記」している）。これが過学習
//   テストの正解率がいちばん高い深さ = ちょうどよい深さ。ただしテストを見て選ぶのは反則 → 06 の交差検証
// ← → 深さ / ↑↓ ノイズ / 1〜6 データの形 / T 訓練の点 ⇔ テストの点 / R 新しいデータ
// ============================================

let kind = 2, nTrain = 200, nTest = 500, flipP = 0.15, seedD = 21, dSel = 3;   // ★ flipP = ノイズの割合
const D_MAX = 15;
let trainD, testD, treeRoot, accTr = [], accTe = [], leavesAt = [], regionImg, showTest = false, dirty = true, plotBox;

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); pixelDensity(1); regionImg = createImage(150, 150); selfTest(); newData(); }
function newData() {
  trainD = makeData2D(kind, nTrain, flipP, seedD); testD = makeData2D(kind, nTest, flipP, seedD + 1000);
  treeRoot = growTree(trainD.X, trainD.y);                      // 最後まで育てる（深さ d の木 = この木を d で切ったもの）
  accTr = []; accTe = []; leavesAt = [];
  for (let d = 0; d <= D_MAX; d++) {
    accTr.push(accuracyOf((x) => treePredict(treeRoot, x, d), trainD.X, trainD.y));
    accTe.push(accuracyOf((x) => treePredict(treeRoot, x, d), testD.X, testD.y));
    leavesAt.push(countLeaves(treeRoot, d));
  }
  dirty = true;
}

function draw() {
  background(...BG_COL);
  let side = Math.min(height - 210, width * 0.42);
  plotBox = { x: 40, y: 100, w: side, h: side };
  if (dirty) { paintImage(regionImg, (u, v) => { let t = leafOf(treeRoot, [u, v], dSel); return mixCol(t.counts, 0.3 + 0.35 * (1 - 2 * t.imp)); }); dirty = false; }
  noSmooth(); image(regionImg, plotBox.x, plotBox.y, side, side); smooth();
  let D = showTest ? testD : trainD;
  drawPoints(plotBox, D.X, D.y, showTest ? 6 : 8);
  // ノイズの点（本当の境界とラベルがちがう点）に × 印
  stroke(255, 255, 255, 170); strokeWeight(1.5);
  D.X.forEach((x, i) => { if (trueLabel(kind, x[0], x[1]) !== D.y[i]) { let p = toPx(plotBox, x[0], x[1]); line(p[0] - 4, p[1] - 4, p[0] + 4, p[1] + 4); line(p[0] - 4, p[1] + 4, p[0] + 4, p[1] - 4); } });
  noFill(); stroke(90, 120, 100); strokeWeight(1); rect(plotBox.x, plotBox.y, side, side);
  // ---- 正解率のグラフ
  let gx = plotBox.x + side + 80, g = { x: gx, y: 130, w: width - gx - 50, h: height * 0.45, x0: 0, x1: D_MAX, y0: 0.5, y1: 1 };
  plotAxes(g, '深さ', '正解率（オレンジ = 訓練、緑 = テスト）', [0, 5, 10, 15], [0.5, 0.6, 0.7, 0.8, 0.9, 1]);
  stroke(255, 255, 255, 60); line(gX(g, 0), gY(g, 1 - flipP), gX(g, D_MAX), gY(g, 1 - flipP));
  stroke(245, 160, 80); strokeWeight(2.5); polyline(accTr.map((a, d) => [gX(g, d), gY(g, a)]));
  stroke(175, 225, 95); strokeWeight(2.5); polyline(accTe.map((a, d) => [gX(g, d), gY(g, a)]));
  let best = argMaxArr(accTe);
  noStroke(); fill(255, 240, 150); circle(gX(g, dSel), gY(g, accTe[dSel]), 12); fill(245, 160, 80); circle(gX(g, dSel), gY(g, accTr[dSel]), 10);
  stroke(255, 255, 255, 120); strokeWeight(1); drawingContext.setLineDash([4, 4]); line(gX(g, best), g.y, gX(g, best), g.y + g.h); drawingContext.setLineDash([]);
  noStroke(); fill(170); textSize(12); textAlign(LEFT, BASELINE); text('白い横線 = 1 − ノイズ（どんな分類器でもふつうはこれ以上は無理）', g.x + 6, gY(g, 1 - flipP) - 6);
  // ---- 文字
  textAlign(LEFT, BASELINE); noStroke(); fill(240); textSize(20);
  text('深さと過学習　データ：' + SHAPES[kind] + '　ノイズ ' + Math.round(flipP * 100) + '%　深さ ' + dSel + '（葉 ' + leavesAt[dSel] + ' 枚）', 40, 40);
  fill(170); textSize(15); text('← → 深さ　↑↓ ノイズ　1〜6 データの形　T 訓練 ⇔ テストの点（いま ' + (showTest ? 'テスト' : '訓練') + '）　R 新しいデータ', 40, 66);
  let ty = g.y + g.h + 60; fill(225); textSize(16);
  text('深さ ' + dSel + '：訓練 ' + fmtNum(accTr[dSel] * 100, 1) + '%　テスト ' + fmtNum(accTe[dSel] * 100, 1) + '%　差 ' + fmtNum((accTr[dSel] - accTe[dSel]) * 100, 1) + ' ポイント', gx, ty);
  fill(255, 240, 150); text('テストがいちばんよい深さ ' + best + '（' + fmtNum(accTe[best] * 100, 1) + '%）、最後まで育てると（深さ ' + treeDepth(treeRoot) + '）テスト ' + fmtNum(accTe[D_MAX] * 100, 1) + '%', gx, ty + 26, g.w);
  fill(160); textSize(14);
  text('× = ノイズの点（本当の境界の反対側のラベル）。深い木はこの × のまわりにも小さな長方形を作る。訓練の正解率は深さとともに増えるだけ（減らない）なので、深さ選びには使えない', gx, ty + 74, g.w);
  drawSelfTest(width - 170, height - 12);
}
function keyPressed() {
  if (key === RIGHT_ARROW) { dSel = Math.min(D_MAX, dSel + 1); dirty = true; }
  if (key === LEFT_ARROW) { dSel = Math.max(0, dSel - 1); dirty = true; }
  if (key === UP_ARROW) { flipP = Math.min(0.4, +(flipP + 0.05).toFixed(2)); newData(); }
  if (key === DOWN_ARROW) { flipP = Math.max(0, +(flipP - 0.05).toFixed(2)); newData(); }
  for (let k = 1; k <= 6; k++) if (key === String(k)) { kind = k - 1; newData(); }
  if (key === 't' || key === 'T') showTest = !showTest;
  if (key === 'r' || key === 'R') { seedD++; newData(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let okM = true, okF = true, okL = true, gapOK = 0;
  for (let s = 0; s < 3; s++) {
    let tr = makeData2D(s + 1, 200, 0.2, 40 + s), te = makeData2D(s + 1, 800, 0.2, 90 + s), t = growTree(tr.X, tr.y), prev = -1, te15 = 0, bestTe = 0;
    for (let d = 0; d <= 15; d++) {
      let a = accuracyOf((x) => treePredict(t, x, d), tr.X, tr.y), b = accuracyOf((x) => treePredict(t, x, d), te.X, te.y);
      if (a < prev - 1e-12) okM = false; prev = a;
      if (countLeaves(t, d) > Math.pow(2, d)) okL = false;
      bestTe = Math.max(bestTe, b); if (d === 15) te15 = b;
    }
    if (accuracyOf((x) => treePredict(t, x), tr.X, tr.y) !== 1) okF = false;
    if (bestTe - te15 >= 0.03) gapOK++;
  }
  check('訓練の正解率は深さ 0〜15 でいつも増えるか同じ（葉を割っても多数決の正解は減らない）', okM);
  check('最後まで育てると訓練は 100%（ノイズ 20% でも）', okF);
  check('深さ d の木の葉は 2^d 枚以下', okL);
  check('ノイズ 20% の 3 つのデータすべてで、いちばんよい深さのテスト正解率が深さ 15 より 3 ポイント以上高い', gapOK === 3);
  let tr = makeData2D(2, 150, 0.1, 5), t = growTree(tr.X, tr.y), t4 = growTree(tr.X, tr.y, { maxDepth: 4 });
  check('深さ 4 で止めて育てた木 = 育てた木を深さ 4 で切った木（予測がすべて一致）', makeData2D(0, 300, 0, 6).X.every((x) => treePredict(t, x, 4) === treePredict(t4, x)));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. ← → で深さを 1 から 15 まで動かし、領域の形と 2 本のグラフを見比べよう
// 2. ↓ でノイズを 0 にすると、過学習はおきる？ ↑ で 30% にすると？
// 3. T でテストの点を表示。深さ 15 の小さな長方形は、テストの点に当たっている？
// 4. いちばんよい深さはデータの形（1〜6）でどう変わる？ 円・XOR・しま で比べよう
// 5. テストの点を見て深さを選ぶと、テストの成績が「本番」より良く見えてしまう。06 の交差検証が答え

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
