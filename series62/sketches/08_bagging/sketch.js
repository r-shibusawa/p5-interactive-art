// ============================================
// 08 バギング ─ 同じデータから「重複ありで n 個引いた」ブートストラップ標本を何回も作り、木を 1 本ずつ育てて多数決
// 1 本の深い木は、データが少し変わるだけで境界が大きく変わる（ばらつきが大きい）。たくさんの木の多数決でばらつきを平均する
//   うすい白い線 = 1 本ずつの木の境界、色 = 多数決（濃い = 票がそろっている）、右下 = テスト誤差（1 本の木の平均 vs 多数決）
//   ブートストラップ標本には、もとの点の約 1 − 1/e ≈ 63.2% しか入らない（残りが「袋の外」→ 09 の OOB 誤差）
// スペース 一時停止 / ↑↓ 木の本数 / 1〜6 データの形 / T 最後の 1 本だけ見る / R やり直す
// ============================================

let kind = 2, nTrain = 200, nTest = 600, flipP = 0.12, maxTrees = 25, seedD = 3;   // ★ flipP = ラベルのノイズ、maxTrees = 木の本数
const CELLS = 100;                     // 領域のマス目（CELLS × CELLS）
let trainD, testD, forest, cellVotes, testVotes, singleErr = [], ensErr = [], paused = false, showLast = false;
let regionImg, ghostImg, ghostA, plotBox, lastTree = null, lastInb = null;

function setup() {
  createCanvas(windowWidth, windowHeight); textWrap(CHAR); pixelDensity(1);
  regionImg = createImage(CELLS, CELLS); ghostImg = createImage(CELLS, CELLS); selfTest(); restart();
}
function restart() {
  trainD = makeData2D(kind, nTrain, flipP, seedD); testD = makeData2D(kind, nTest, flipP, seedD + 500);
  seedRng(seedD * 7 + 1); forest = makeForest(trainD.X, trainD.y, { nClass: 2 });   // mtry なし = 全部の特徴量（バギング）
  cellVotes = new Uint16Array(CELLS * CELLS); testVotes = testD.X.map(() => [0, 0]); ghostA = new Float32Array(CELLS * CELLS);
  singleErr = []; ensErr = []; lastTree = null; repaint();
}
// ★ 木を 1 本足す：ブートストラップ → 木 → マス目とテストの点に 1 票ずつ
function addTree() {
  let t = forestAdd(forest), pred = new Uint8Array(CELLS * CELLS), wrong = 0;
  for (let j = 0; j < CELLS; j++) for (let i = 0; i < CELLS; i++) { let c = treePredict(t, [(i + 0.5) / CELLS, 1 - (j + 0.5) / CELLS]); pred[i + CELLS * j] = c; cellVotes[i + CELLS * j] += c; }
  for (let j = 0; j < CELLS; j++) for (let i = 0; i < CELLS; i++) {   // 境界 = となりのマスと答えがちがう所
    let q = i + CELLS * j, c = pred[q];
    if ((i + 1 < CELLS && pred[q + 1] !== c) || (j + 1 < CELLS && pred[q + CELLS] !== c)) ghostA[q] = Math.min(160, ghostA[q] + 260 / maxTrees);
  }
  testD.X.forEach((x, i) => { let c = treePredict(t, x); testVotes[i][c]++; if (c !== testD.y[i]) wrong++; });
  singleErr.push(wrong / nTest);
  ensErr.push(testVotes.filter((v, i) => argMaxArr(v) !== testD.y[i]).length / nTest);
  lastTree = t; lastInb = t.inb; repaint();
}
function repaint() {
  let m = forest.trees.length;
  paintImage(regionImg, (u, v) => {
    if (m === 0) return BG_COL;
    if (showLast && lastTree) { let c = treePredict(lastTree, [u, v]); return mixCol(c ? [0, 1] : [1, 0], 0.5); }
    let i = Math.min(CELLS - 1, Math.floor(u * CELLS)), j = Math.min(CELLS - 1, Math.floor((1 - v) * CELLS)), b = cellVotes[i + CELLS * j] / m;
    return mixCol([1 - b, b], 0.15 + 0.6 * Math.abs(2 * b - 1));
  });
  ghostImg.loadPixels();
  for (let q = 0; q < CELLS * CELLS; q++) { ghostImg.pixels[4 * q] = 255; ghostImg.pixels[4 * q + 1] = 250; ghostImg.pixels[4 * q + 2] = 220; ghostImg.pixels[4 * q + 3] = showLast ? 0 : ghostA[q]; }
  ghostImg.updatePixels();
}

function draw() {
  background(...BG_COL);
  if (!paused && forest.trees.length < maxTrees && frameCount % 6 === 0) addTree();   // 6 フレームに 1 本（重くならないように少しずつ）
  let side = Math.min(height - 200, width * 0.45), m = forest.trees.length;
  plotBox = { x: 40, y: 100, w: side, h: side };
  noSmooth(); image(regionImg, plotBox.x, plotBox.y, side, side); smooth();
  noSmooth(); image(ghostImg, plotBox.x, plotBox.y, side, side); smooth();
  // 訓練の点（T のとき：最後の木のブートストラップに入った点 = 実線、入らなかった点 = うすい）
  stroke(15); strokeWeight(1);
  trainD.X.forEach((x, i) => { let p = toPx(plotBox, x[0], x[1]), inb = !showLast || !lastInb || lastInb[i]; fill(...CLS_COL[trainD.y[i]], inb ? 255 : 50); circle(p[0], p[1], 8); });
  noFill(); stroke(90, 120, 100); rect(plotBox.x, plotBox.y, side, side);
  // ---- テスト誤差のグラフ
  let gx = plotBox.x + side + 70, g = { x: gx, y: 130, w: width - gx - 50, h: height * 0.42, x0: 0, x1: maxTrees, y0: 0, y1: 0.5 };
  plotAxes(g, '木の本数 m', 'テスト誤差（オレンジ = 1 本ずつの平均、緑 = m 本の多数決）', [0, Math.round(maxTrees / 2), maxTrees], [0, 0.1, 0.2, 0.3, 0.4, 0.5]);
  let avg = [], s = 0; singleErr.forEach((e, k) => { s += e; avg.push(s / (k + 1)); });
  stroke(245, 160, 80); strokeWeight(2); polyline(avg.map((e, k) => [gX(g, k + 1), gY(g, e)]));
  stroke(175, 225, 95); strokeWeight(3); polyline(ensErr.map((e, k) => [gX(g, k + 1), gY(g, e)]));
  noStroke(); fill(245, 160, 80, 150); singleErr.forEach((e, k) => circle(gX(g, k + 1), gY(g, e), 4));
  // ---- 文字
  let uniq = lastInb ? lastInb.reduce((a, b) => a + b, 0) / nTrain : 0;
  textAlign(LEFT, BASELINE); noStroke(); fill(240); textSize(20);
  text('バギング　データ：' + SHAPES[kind] + '（ノイズ ' + Math.round(flipP * 100) + '%）　木 ' + m + ' / ' + maxTrees + ' 本' + (paused ? '（一時停止）' : ''), 40, 40);
  fill(170); textSize(15); text('スペース 一時停止　↑↓ 木の本数　1〜6 データの形　T 最後の 1 本だけ' + (showLast ? '（いま ON）' : '') + '　R やり直す', 40, 66);
  let ty = g.y + g.h + 60; fill(220); textSize(16);
  if (m > 0) {
    text('1 本の木のテスト誤差（平均）' + fmtNum(avg[m - 1] * 100, 1) + '%　→　' + m + ' 本の多数決 ' + fmtNum(ensErr[m - 1] * 100, 1) + '%', gx, ty);
    fill(200); text('最後の木のブートストラップ標本：' + nTrain + ' 回引いて、ちがう点は ' + Math.round(uniq * nTrain) + ' 個（' + fmtNum(uniq * 100, 1) + '%、理論 1 − (1 − 1/n)ⁿ ≈ 63.2%）', gx, ty + 28, g.w);
  }
  fill(160); textSize(14);
  text('どの木も深さの制限なし（訓練の点は 100% 当てる）。1 本ずつはギザギザにノイズに合わせるが、ノイズの位置は標本ごとにちがうので、多数決では打ち消しあう', gx, ty + 86, g.w);
  drawSelfTest(width - 170, height - 12);
}
function keyPressed() {
  if (key === ' ') paused = !paused;
  if (key === UP_ARROW) { maxTrees = Math.min(100, maxTrees + 5); }
  if (key === DOWN_ARROW) { maxTrees = Math.max(5, maxTrees - 5); restart(); }
  for (let k = 1; k <= 6; k++) if (key === String(k)) { kind = k - 1; restart(); }
  if (key === 't' || key === 'T') { showLast = !showLast; repaint(); }
  if (key === 'r' || key === 'R') { seedD++; restart(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(62);
  let u = 0, okO = true;
  for (let r = 0; r < 20; r++) { let b = bootstrapIdx(1000); u += b.inb.reduce((a, c) => a + c, 0) / 1000; for (let i = 0; i < 1000; i++) if ((b.inb[i] === 1) !== b.idx.includes(i)) okO = false; }
  check('ブートストラップに入るちがう点の割合 ≈ 1 − (1 − 1/n)ⁿ = ' + fmtNum(1 - Math.pow(1 - 1 / 1000, 1000), 4) + '（20 回の平均 ' + fmtNum(u / 20, 4) + '、±0.01）', Math.abs(u / 20 - (1 - Math.pow(0.999, 1000))) < 0.01);
  check('袋の中の印 inb = 引いた番号の集合（袋の外 = 1 回も引かれなかった点）', okO);
  let tr = makeData2D(0, 200, 0.12, 11), te = makeData2D(0, 600, 0.12, 12);
  seedRng(5); let F = makeForest(tr.X, tr.y, { nClass: 2 });
  for (let k = 0; k < 25; k++) forestAdd(F);
  check('木 1 本の多数決 = その木の答え', te.X.every((x) => forestPredict(F, x, 1) === treePredict(F.trees[0], x)));
  check('m 本の票の合計 = m（どの点でも）', te.X.slice(0, 50).every((x) => sumArr(forestVote(F, x, 17)) === 17));
  let single = sumArr(F.trees.map((t) => 1 - accuracyOf((x) => treePredict(t, x), te.X, te.y))) / 25, bag = 1 - accuracyOf((x) => forestPredict(F, x), te.X, te.y);
  check('25 本の多数決のテスト誤差 ' + fmtNum(bag, 3) + ' < 1 本ずつの平均 ' + fmtNum(single, 3), bag < single);
  check('どの木も自分の標本を 100% 当てる（深さの制限なし、ノイズありでも）', F.trees.every((t) => { let ids = []; t.inb.forEach((b, i) => { if (b) ids.push(i); }); return accuracyOf((x) => treePredict(t, x), tr.X, tr.y, ids) === 1; }));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 木が 1 本のときと 25 本のときで、境界（色の切れ目）のギザギザはどう変わる？
// 2. T で最後の 1 本だけを見る。うすい点（その木の標本に入らなかった点）はどこにある？
// 3. flipP を 0 にすると、バギングの効き目は大きくなる？ 小さくなる？
// 4. ↑ で木を 100 本に。テスト誤差はどこまで下がる？（下がり方はだんだんゆっくりに）
// 5. 09 では、分割ごとに見る特徴量もランダムにする（ランダムフォレスト）

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
// ---- バギング / ランダムフォレスト：ブートストラップ（n 個を重複ありで引く）で木を 1 本ずつ育てる
// 袋の外（OOB）の点 = その木の学習に使われなかった点 → その木の票を「テストの票」として集める
function bootstrapIdx(n) { let idx = [], inb = new Uint8Array(n); for (let k = 0; k < n; k++) { let j = Math.floor(rnd() * n); idx.push(j); inb[j] = 1; } return { idx, inb }; }
function makeForest(X, y, o) { let K = (o && o.nClass) || Math.max(...y) + 1; return { X, y, o: Object.assign({ nClass: K }, o), K, trees: [], oob: X.map(() => new Array(K).fill(0)) }; }
function forestAdd(F) {
  let b = bootstrapIdx(F.X.length), t = growTree(F.X, F.y, Object.assign({}, F.o, { idx: b.idx }));
  t.inb = b.inb; F.trees.push(t);
  for (let i = 0; i < F.X.length; i++) if (!b.inb[i]) F.oob[i][treePredict(t, F.X[i])]++;
  return t;
}
function forestVote(F, x, m) { let v = new Array(F.K).fill(0), M = Math.min(m === undefined ? F.trees.length : m, F.trees.length); for (let k = 0; k < M; k++) v[treePredict(F.trees[k], x)]++; return v; }
function forestPredict(F, x, m) { return argMaxArr(forestVote(F, x, m)); }
function oobError(F) { let n = 0, bad = 0; F.oob.forEach((v, i) => { if (sumArr(v) > 0) { n++; if (argMaxArr(v) !== F.y[i]) bad++; } }); return n ? bad / n : 0; }
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
