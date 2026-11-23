// ============================================
// 09 ランダムフォレスト ─ バギング（08）＋「分割ごとに、ランダムに選んだ mtry 個の特徴量だけを見る」
// データは d 次元：x1, x2 だけが役に立つ（円の内側かどうか）、残りは関係のない「ただの乱数」の特徴量
//   mtry を小さくすると木どうしが似なくなる（相関が下がる）→ 多数決がよく効く。でも小さすぎると役に立たない特徴量ばかりで切る
//   OOB（袋の外）誤差：その点を学習に使わなかった木だけの多数決で当てる → テストデータなしで誤差がわかる
//   右下の棒は mtry = 1〜d のフォレスト（40 本ずつ）を、裏で少しずつ育てて比べたもの
// ↑↓ mtry / ← → 関係のない特徴量の数 / R やり直す
// ============================================

let nNoise = 4, mtry = 2, nTrain = 300, nTest = 600, flipP = 0.08, seedD = 3;   // ★ nNoise = 関係のない特徴量の数
const N_TREES = 100, N_SWEEP = 40;    // ★ メインの木の本数、比べる用の木の本数
let dim, trainD, testD, forest, oobHist = [], testHist = [], testVotes, sweep, regionImg, cellVotes, plotBox;
const CELLS = 60;

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); pixelDensity(1); regionImg = createImage(CELLS, CELLS); selfTest(); restart(); }
function makeHD(n, d, seed) {          // x1, x2 で円、残りは関係ない乱数
  seedRng(seed); let X = [], y = [];
  for (let i = 0; i < n; i++) { let x = []; for (let f = 0; f < d; f++) x.push(rnd()); let c = trueLabel(2, x[0], x[1]); if (rnd() < flipP) c = 1 - c; X.push(x); y.push(c); }
  return { X, y };
}
function restart() {
  dim = 2 + nNoise; mtry = Math.min(mtry, dim);
  trainD = makeHD(nTrain, dim, seedD); testD = makeHD(nTest, dim, seedD + 50);
  seedRng(seedD * 13); forest = makeForest(trainD.X, trainD.y, { mtry, nClass: 2 });
  oobHist = []; testHist = []; testVotes = testD.X.map(() => [0, 0]); cellVotes = new Uint16Array(CELLS * CELLS);
  sweep = { m: 1, F: null, res: [] };
  paintImage(regionImg, () => BG_COL);
}
// ★ 1 フレームに少しずつ：メインの木を 1 本、比べる用の木を 1 本
function work() {
  if (forest.trees.length < N_TREES) {
    let t = forestAdd(forest);
    testD.X.forEach((x, i) => testVotes[i][treePredict(t, x)]++);
    oobHist.push(oobError(forest)); testHist.push(testVotes.filter((v, i) => argMaxArr(v) !== testD.y[i]).length / nTest);
    for (let j = 0; j < CELLS; j++) for (let i = 0; i < CELLS; i++) { let x = new Array(dim).fill(0.5); x[0] = (i + 0.5) / CELLS; x[1] = 1 - (j + 0.5) / CELLS; cellVotes[i + CELLS * j] += treePredict(t, x); }
    let m = forest.trees.length;
    paintImage(regionImg, (u, v) => { let b = cellVotes[Math.min(CELLS - 1, Math.floor(u * CELLS)) + CELLS * Math.min(CELLS - 1, Math.floor((1 - v) * CELLS))] / m; return mixCol([1 - b, b], 0.15 + 0.6 * Math.abs(2 * b - 1)); });
  }
  if (sweep.m <= dim) {
    if (!sweep.F) { seedRng(seedD * 31 + sweep.m); sweep.F = makeForest(trainD.X, trainD.y, { mtry: sweep.m, nClass: 2 }); }
    forestAdd(sweep.F);
    if (sweep.F.trees.length >= N_SWEEP) {
      let F = sweep.F;
      sweep.res.push({ m: sweep.m, oob: oobError(F), test: 1 - accuracyOf((x) => forestPredict(F, x), testD.X, testD.y), corr: treeCorr(F.trees, testD.X.slice(0, 150)) });
      sweep.m++; sweep.F = null;
    }
  }
}
// 木どうしの相関：テストの点での 0/1 の答えの相関係数を、全部の組で平均
function treeCorr(trees, Xs) {
  let P = trees.map((t) => Xs.map((x) => treePredict(t, x))), s = 0, c = 0;
  for (let a = 0; a < P.length; a++) for (let b = a + 1; b < P.length; b++) {
    let pa = P[a], pb = P[b], n = pa.length, ma = sumArr(pa) / n, mb = sumArr(pb) / n, sab = 0, saa = 0, sbb = 0;
    for (let i = 0; i < n; i++) { sab += (pa[i] - ma) * (pb[i] - mb); saa += (pa[i] - ma) ** 2; sbb += (pb[i] - mb) ** 2; }
    s += saa > 0 && sbb > 0 ? sab / Math.sqrt(saa * sbb) : 1; c++;
  }
  return c ? s / c : 1;
}

function draw() {
  background(...BG_COL);
  work();
  let side = Math.min(height - 300, width * 0.33);
  plotBox = { x: 40, y: 100, w: side, h: side };
  noSmooth(); image(regionImg, plotBox.x, plotBox.y, side, side); smooth();
  stroke(15); strokeWeight(1);
  trainD.X.forEach((x, i) => { let p = toPx(plotBox, x[0], x[1]); fill(...CLS_COL[trainD.y[i]]); circle(p[0], p[1], 6); });
  noFill(); stroke(90, 120, 100); rect(plotBox.x, plotBox.y, side, side);
  noStroke(); fill(170); textSize(13); textAlign(LEFT, BASELINE);
  text('x1 × x2 の平面（ほかの特徴量は 0.5 にして多数決）', plotBox.x, plotBox.y + side + 20, side);
  // ---- OOB とテストの誤差（木の本数）
  let gx = plotBox.x + side + 70, g = { x: gx, y: 120, w: width - gx - 50, h: height * 0.3, x0: 0, x1: N_TREES, y0: 0, y1: 0.4 };
  plotAxes(g, '木の本数', '誤差（緑 = OOB、白 = テスト）mtry = ' + mtry + ' / d = ' + dim, [0, 50, 100], [0, 0.1, 0.2, 0.3, 0.4]);
  stroke(175, 225, 95); strokeWeight(2.5); polyline(oobHist.map((e, k) => [gX(g, k + 1), gY(g, e)]));
  stroke(235); strokeWeight(1.5); polyline(testHist.map((e, k) => [gX(g, k + 1), gY(g, e)]));
  // ---- mtry ごとの比較（棒）
  let g2 = { x: gx, y: g.y + g.h + 80, w: g.w, h: height - g.y - g.h - 220 }, bw = g2.w / dim;
  noStroke(); fill(205); textSize(13); text('mtry ごと（' + N_SWEEP + ' 本ずつ）：棒 = OOB 誤差、白の点 = テスト誤差、黄の線 = 木どうしの相関', g2.x, g2.y - 10);
  stroke(80, 100, 90); noFill(); rect(g2.x, g2.y, g2.w, g2.h);
  for (let r of sweep.res) {
    let x = g2.x + (r.m - 1) * bw, hh = (r.oob / 0.4) * g2.h;
    noStroke(); fill(r.m === mtry ? color(175, 225, 95) : color(85, 175, 240)); rect(x + bw * 0.2, g2.y + g2.h - Math.min(g2.h, hh), bw * 0.6, Math.min(g2.h, hh));
    fill(240); circle(x + bw / 2, g2.y + g2.h - Math.min(g2.h, (r.test / 0.4) * g2.h), 8);
  }
  stroke(255, 225, 110); strokeWeight(2); polyline(sweep.res.map((r) => [g2.x + (r.m - 0.5) * bw, g2.y + g2.h - clampv(r.corr, 0, 1) * g2.h]));
  noStroke(); fill(255, 225, 110); textSize(12); textAlign(CENTER, TOP);
  for (let r of sweep.res) text(fmtNum(r.corr, 2), g2.x + (r.m - 0.5) * bw, g2.y + g2.h - clampv(r.corr, 0, 1) * g2.h - 18);
  fill(170); for (let m = 1; m <= dim; m++) text(m, g2.x + (m - 0.5) * bw, g2.y + g2.h + 4);
  if (sweep.m <= dim) { textAlign(LEFT, TOP); text('計算中… mtry = ' + sweep.m, g2.x + 6, g2.y + 6); }
  // ---- 文字
  textAlign(LEFT, BASELINE); noStroke(); fill(240); textSize(20);
  let n = forest.trees.length;
  text('ランダムフォレスト　d = ' + dim + '（役に立つのは x1, x2 だけ）　mtry = ' + mtry + '　木 ' + n + ' 本', 40, 40);
  fill(170); textSize(15); text('↑↓ mtry　← → 関係のない特徴量の数（' + nNoise + '）　R やり直す', 40, 66);
  if (n > 0) { fill(225); textSize(15); text('OOB 誤差 ' + fmtNum(oobHist[n - 1] * 100, 1) + '%　テスト誤差 ' + fmtNum(testHist[n - 1] * 100, 1) + '%（OOB はテストなしで見積もれる）', 40, plotBox.y + side + 56, side + 20); }
  fill(160); textSize(13);
  text('mtry = d はバギング（08）と同じ。mtry = √d くらいがよく使われる目安', 40, plotBox.y + side + 110, side + 20);
  drawSelfTest(width - 170, height - 12);
}
function keyPressed() {
  if (key === UP_ARROW) { mtry = Math.min(dim, mtry + 1); restart(); }
  if (key === DOWN_ARROW) { mtry = Math.max(1, mtry - 1); restart(); }
  if (key === RIGHT_ARROW) { nNoise = Math.min(10, nNoise + 1); restart(); }
  if (key === LEFT_ARROW) { nNoise = Math.max(0, nNoise - 1); restart(); }
  if (key === 'r' || key === 'R') { seedD++; restart(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let tr = makeHD(300, 6, 3), te = makeHD(600, 6, 53);
  seedRng(9); let F = makeForest(tr.X, tr.y, { mtry: 2, nClass: 2 });
  for (let k = 0; k < 60; k++) forestAdd(F);
  let oob = oobError(F), tst = 1 - accuracyOf((x) => forestPredict(F, x), te.X, te.y);
  check('OOB 誤差 ' + fmtNum(oob, 3) + ' ≈ テスト誤差 ' + fmtNum(tst, 3) + '（±0.05、60 本、mtry = 2）', Math.abs(oob - tst) <= 0.05);
  let votes = sumArr(F.oob.map(sumArr)), outs = sumArr(F.trees.map((t) => tr.X.length - t.inb.reduce((a, b) => a + b, 0)));
  check('OOB の票の合計 = 各木の「袋の外」の点の数の合計', votes === outs);
  let small = makeHD(150, 6, 7);
  seedRng(4); let A = makeForest(small.X, small.y, { mtry: 6, nClass: 2 }); for (let k = 0; k < 5; k++) forestAdd(A);
  seedRng(4); let B = makeForest(small.X, small.y, { nClass: 2 }); for (let k = 0; k < 5; k++) forestAdd(B);
  check('mtry = d のフォレスト = バギング（同じ乱数なら同じ木、予測が全部一致）', te.X.slice(0, 200).every((x) => forestPredict(A, x) === forestPredict(B, x)));
  seedRng(5); let C1 = makeForest(small.X, small.y, { mtry: 1, nClass: 2 }); for (let k = 0; k < 15; k++) forestAdd(C1);
  seedRng(5); let C6 = makeForest(small.X, small.y, { mtry: 6, nClass: 2 }); for (let k = 0; k < 15; k++) forestAdd(C6);
  let r1 = treeCorr(C1.trees, te.X.slice(0, 120)), r6 = treeCorr(C6.trees, te.X.slice(0, 120));
  check('木どうしの相関：mtry = 1 の ' + fmtNum(r1, 2) + ' < mtry = d の ' + fmtNum(r6, 2), r1 < r6);
  check('mtry = 1 では根で使う特徴量がばらける（3 種類以上）、mtry = d では x1 か x2 だけ', new Set(C1.trees.map((t) => t.feat)).size >= 3 && C6.trees.every((t) => t.feat <= 1));
  check('OOB 誤差は 0〜1 で NaN なし', oob >= 0 && oob <= 1 && noNaN(F.oob.flat()));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 緑（OOB）と白（テスト）の線は近い？ 木が増えるとどうなる？
// 2. ↑↓ で mtry を 1 から d まで変える。右下の棒で、いちばん誤差が小さい mtry は？
// 3. 黄の線（木どうしの相関）は mtry とどんな関係？ 相関が低いと多数決が効くのはなぜ？
// 4. → で関係のない特徴量を 10 個に。mtry = 1 はどうなる？（役に立たない特徴量ばかり引く）
// 5. 12 では、フォレストから「どの特徴量が大事だったか」を読み取る

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
