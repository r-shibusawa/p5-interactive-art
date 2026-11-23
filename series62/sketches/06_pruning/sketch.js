// ============================================
// 06 剪定と交差検証 ─ いったん最後まで育てた木の「弱い枝」から順に刈って、ちょうどよい大きさを選ぶ
// コスト複雑度：R_α(T) = 訓練の誤り R(T) + α·(葉の数)。α を 0 から増やすと、g(t) = (R(t) − R(T_t)) / (葉の数 − 1) が
//   いちばん小さい枝（= 葉を 1 枚へらしても誤りがほとんど増えない枝）から刈られ、α の列と木の列ができる
//   どの α がよいかは「5 分割交差検証」：データを 5 つに分け、4 つで木を育てて剪定し、残り 1 つで誤りを数える × 5 回
// ← → 剪定の列を動かす / B 交差検証でいちばんよい α へ / 1〜6 データの形 / ↑↓ ノイズ / R 新しいデータ
// ============================================

let kind = 2, nTrain = 240, nTest = 600, flipP = 0.15, seedD = 5, K_FOLD = 5;   // ★ K_FOLD = 何分割の交差検証か
let trainD, testD, treeRoot, seq = [], cvErr = [], testErr = [], kSel = 0, kBest = 0, regionImg, dirty = true;

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); pixelDensity(1); regionImg = createImage(140, 140); selfTest(); newData(); }
function newData() {
  trainD = makeData2D(kind, nTrain, flipP, seedD); testD = makeData2D(kind, nTest, flipP, seedD + 777);
  treeRoot = growTree(trainD.X, trainD.y);
  seq = pruneSequence(treeRoot);                                // ★ α の列（弱い枝から刈る）
  cvErr = cvPrune(trainD.X, trainD.y, {}, seq, K_FOLD, seedD);  // ★ 交差検証の誤り（α ごと）
  testErr = seq.map((s) => 1 - accuracyOf((x) => treePredict(treeRoot, x, undefined, s.alpha), testD.X, testD.y));
  let m = Math.min(...cvErr); kBest = 0; cvErr.forEach((e, k) => { if (e <= m + 1e-12) kBest = k; });   // 同点なら小さい木
  kSel = 0; dirty = true;
}

function draw() {
  background(...BG_COL);
  let a = seq[kSel].alpha, side = Math.min(height - 320, width * 0.36);
  let pb = { x: 40, y: 100, w: side, h: side };
  if (dirty) { paintImage(regionImg, (u, v) => { let t = leafOf(treeRoot, [u, v], undefined, a); return mixCol(t.counts, 0.3 + 0.35 * (1 - 2 * t.imp)); }); dirty = false; }
  noSmooth(); image(regionImg, pb.x, pb.y, side, side); smooth();
  drawPoints(pb, trainD.X, trainD.y, 7);
  noFill(); stroke(90, 120, 100); strokeWeight(1); rect(pb.x, pb.y, side, side);
  // ---- 木の図（刈った後）
  let tb = { x: pb.x + side + 40, y: 100, w: width - side - 120, h: height * 0.36 };
  drawTree(treeRoot, tb, { aLim: a, text: (t, leaf) => [leaf ? '[' + t.counts.join('|') + ']' : 'x' + (t.feat + 1) + ' ≤ ' + fmtNum(t.thr, 2), leaf ? '' : 'g = ' + fmtNum(t.alphaCut, 4)] });
  // ---- 誤りのグラフ（横 = 葉の数）
  let L0 = seq[0].leaves, g = { x: tb.x + 20, y: tb.y + tb.h + 60, w: tb.w - 40, h: height - tb.y - tb.h - 200, x0: 1, x1: L0, y0: 0, y1: 0.5 };
  plotAxes(g, '葉の数', '誤り（オレンジ = 訓練、緑 = ' + K_FOLD + ' 分割交差検証、白の点線 = テスト）', [1, Math.round(L0 / 2), L0], [0, 0.1, 0.2, 0.3, 0.4, 0.5]);
  stroke(245, 160, 80); strokeWeight(2.5); polyline(seq.map((s) => [gX(g, s.leaves), gY(g, s.err)]));
  stroke(175, 225, 95); strokeWeight(2.5); polyline(seq.map((s, k) => [gX(g, s.leaves), gY(g, cvErr[k])]));
  stroke(255, 255, 255, 150); strokeWeight(1.5); drawingContext.setLineDash([4, 4]); polyline(seq.map((s, k) => [gX(g, s.leaves), gY(g, testErr[k])])); drawingContext.setLineDash([]);
  noStroke(); fill(175, 225, 95); for (let k = 0; k < seq.length; k++) circle(gX(g, seq[k].leaves), gY(g, cvErr[k]), 5);
  fill(255, 240, 150); circle(gX(g, seq[kSel].leaves), gY(g, cvErr[kSel]), 13);
  stroke(175, 225, 95, 160); strokeWeight(1); line(gX(g, seq[kBest].leaves), g.y, gX(g, seq[kBest].leaves), g.y + g.h);
  // ---- 文字
  textAlign(LEFT, BASELINE); noStroke(); fill(240); textSize(20);
  text('剪定と交差検証　列の ' + (kSel + 1) + ' / ' + seq.length + ' 番目：α = ' + fmtNum(a, 4) + '　葉 ' + seq[kSel].leaves + ' 枚' + (kSel === kBest ? '　← 交差検証で最良' : ''), 40, 40);
  fill(170); textSize(15); text('← → 剪定の列　B 最良の α へ　1〜6 データの形（' + SHAPES[kind] + '）　↑↓ ノイズ ' + Math.round(flipP * 100) + '%　R 新しいデータ', 40, 66);
  let ty = pb.y + side + 34; fill(225); textSize(15);
  text('訓練の誤り ' + fmtNum(seq[kSel].err * 100, 1) + '%　交差検証 ' + fmtNum(cvErr[kSel] * 100, 1) + '%　テスト ' + fmtNum(testErr[kSel] * 100, 1) + '%', 40, ty);
  text('最良（交差検証）：葉 ' + seq[kBest].leaves + ' 枚、テスト ' + fmtNum(testErr[kBest] * 100, 1) + '%　／　刈る前（葉 ' + L0 + ' 枚）：テスト ' + fmtNum(testErr[0] * 100, 1) + '%', 40, ty + 24, side + 60);
  fill(160); textSize(13);
  text('α の列（α → 葉）：' + seq.slice(0, 12).map((s) => fmtNum(s.alpha, 3) + '→' + s.leaves).join('  ') + (seq.length > 12 ? ' …' : ''), 40, ty + 72, side + 60);
  text('木の g = その枝が刈られる α。交差検証は「テストを見ずに」選ぶ方法', 40, ty + 112, side + 60);
  drawSelfTest(width - 170, height - 12);
}
function keyPressed() {
  if (key === RIGHT_ARROW) { kSel = Math.min(seq.length - 1, kSel + 1); dirty = true; }
  if (key === LEFT_ARROW) { kSel = Math.max(0, kSel - 1); dirty = true; }
  if (key === 'b' || key === 'B') { kSel = kBest; dirty = true; }
  if (key === UP_ARROW) { flipP = Math.min(0.35, +(flipP + 0.05).toFixed(2)); newData(); }
  if (key === DOWN_ARROW) { flipP = Math.max(0, +(flipP - 0.05).toFixed(2)); newData(); }
  for (let k = 1; k <= 6; k++) if (key === String(k)) { kind = k - 1; newData(); }
  if (key === 'r' || key === 'R') { seedD++; newData(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let okA = true, okE = true, okOpt = true, okD = true, tr = null, sq = null, t = null;
  for (let s = 0; s < 4; s++) {
    tr = makeData2D(s % 6, 200, 0.15, 60 + s); t = growTree(tr.X, tr.y); sq = pruneSequence(t);
    for (let k = 1; k < sq.length; k++) if (sq[k].alpha < sq[k - 1].alpha || sq[k].leaves > sq[k - 1].leaves || sq[k].err < sq[k - 1].err - 1e-12) okA = false;
    if (sq[sq.length - 1].leaves !== 1) okA = false;
    for (let q of sq) if (Math.abs(q.err - (1 - accuracyOf((x) => treePredict(t, x, undefined, q.alpha), tr.X, tr.y))) > 1e-9) okE = false;
    for (let k = 0; k + 1 < sq.length; k++) {   // α_k と α_(k+1) の間では、T_k が R + α·葉 をいちばん小さくする
      let al = (sq[k].alpha + sq[k + 1].alpha) / 2, ck = sq[k].err + al * sq[k].leaves;
      if (sq.some((q) => q.err + al * q.leaves < ck - 1e-12)) okOpt = false;
    }
    for (let q of treeNodes(t)) if (!q.leaf && q.left.alphaCut !== undefined && q.left.alphaCut !== Infinity && q.left.alphaCut > q.alphaCut + 1e-12) okD = false;
  }
  check('α の列は増えるか同じ、葉の数は減るか同じ、最後は葉 1 枚（根だけ）', okA);
  check('列のどの木でも、訓練の誤り = その α で刈った木で 1 点ずつ数えた誤り', okE);
  check('α_k と α_(k+1) の間の α では、T_k が R(T) + α·葉の数 を最小にする（列の中で）', okOpt);
  check('子の枝は親より先に（小さい α で）刈られるか、同時', okD);
  let cv = cvPrune(tr.X, tr.y, {}, sq, 5, 3);
  check('5 分割の誤り率は 0〜1 で NaN なし（全部の点がちょうど 1 回ずつテストに使われる）', cv.every((e) => e >= 0 && e <= 1) && noNaN(cv));
  let D = makeData2D(2, 240, 0.15, 5), E = makeData2D(2, 600, 0.15, 782), T = growTree(D.X, D.y), S = pruneSequence(T), C = cvPrune(D.X, D.y, {}, S, 5, 5);
  let kb = 0, m = Math.min(...C); C.forEach((e, k) => { if (e <= m + 1e-12) kb = k; });
  let te0 = accuracyOf((x) => treePredict(T, x), E.X, E.y), teB = accuracyOf((x) => treePredict(T, x, undefined, S[kb].alpha), E.X, E.y);
  check('交差検証で選んだ木（葉 ' + S[kb].leaves + '）のテスト正解率 ' + fmtNum(teB, 3) + ' ≥ 刈る前（葉 ' + S[0].leaves + '）の ' + fmtNum(te0, 3), teB >= te0);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. → を押していくと、どの枝から刈られる？ 木の図の g の小さい順になっている？
// 2. 緑（交差検証）とテスト（点線）の曲線は似ている？ B で選んだ木の葉は何枚？
// 3. ↑ でノイズを増やすと、最良の葉の数は増える？ 減る？
// 4. K_FOLD を 2 や 10 に変えると、緑の曲線はどう変わる？
// 5. 05 の「深さで止める」と、ここの「育ててから刈る」はどちらがよい？ 同じ葉の数で比べよう

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
// ---- コスト複雑度剪定：R_α(T) = R(T) + α·(葉の数)。R = 訓練の誤分類の割合
// いちばん弱い枝 g(t) = (R(t) − R(T_t)) / (葉の数(T_t) − 1) が小さいノードから順に「葉にする」。node.alphaCut = 刈られる α
function pruneSequence(root) {
  let N = sumArr(root.counts) || 1, all = treeNodes(root);
  for (let t of all) if (!t.leaf) t.alphaCut = Infinity;
  let rOf = (t) => (sumArr(t.counts) - Math.max(...t.counts)) / N, alpha = 0;
  let seq = [{ alpha: 0, leaves: countLeaves(root), err: subtreeStat(root, rOf).r }];
  while (!root.leaf && root.alphaCut === Infinity) {
    let cand = [];
    subtreeStat(root, rOf, cand);
    let gmin = Math.min(...cand.map((c) => c.g));
    alpha = Math.max(alpha, gmin);
    for (let c of cand) if (c.g <= gmin + 1e-12) c.t.alphaCut = alpha;   // 同点はまとめて刈る
    seq.push({ alpha, leaves: countLeaves(root, undefined, alpha), err: subtreeStat(root, rOf).r });
  }
  return seq;
}
function subtreeStat(t, rOf, cand) {   // いまの（刈った後の）部分木の R と葉の数。cand に g(t) を集める
  if (t.leaf || t.alphaCut !== Infinity) return { r: rOf(t), l: 1 };
  let a = subtreeStat(t.left, rOf, cand), b = subtreeStat(t.right, rOf, cand), r = a.r + b.r, l = a.l + b.l;
  if (cand) cand.push({ t, g: Math.max(0, (rOf(t) - r) / (l - 1)) });
  return { r, l };
}
// k 分割交差検証：各 fold で木を育てて剪定の列を作り、本体の列の α_m と α_(m+1) の幾何平均で刈って、残りの点で誤差を数える
function cvPrune(X, y, o, seq, kf, seed) {
  seedRng(seed || 1);
  let n = X.length, order = shuffleArr(X.map((_, i) => i)), err = new Array(seq.length).fill(0);
  for (let f = 0; f < kf; f++) {
    let test = order.filter((_, q) => q % kf === f), train = order.filter((_, q) => q % kf !== f);
    let tr = growTree(X, y, Object.assign({}, o, { idx: train }));
    pruneSequence(tr);
    seq.forEach((s, m) => {
      let beta = m + 1 < seq.length ? Math.sqrt(s.alpha * seq[m + 1].alpha) : s.alpha;
      for (let i of test) if (treePredict(tr, X[i], undefined, beta) !== y[i]) err[m]++;
    });
  }
  return err.map((e) => e / n);
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
// 木の図：葉を左から順に並べ、親は子の真ん中。o = { dLim, aLim, text(t) → 行の配列, col(t) → 色, hl（光らせる id の集合）}
function drawTree(root, bx, o) {
  o = o || {};
  let vis = treeNodes(root, o.dLim, o.aLim), pos = {}, leafN = 0, maxD = 0;
  let place = (t) => {
    maxD = Math.max(maxD, t.depth);
    if (isCut(t, o.dLim, o.aLim)) { pos[t.id] = leafN++; return pos[t.id]; }
    let a = place(t.left), b = place(t.right); pos[t.id] = (a + b) / 2; return pos[t.id];
  };
  place(root);
  let cw = bx.w / Math.max(1, leafN), rh = Math.min(92, bx.h / (maxD + 1)), bw = Math.min(126, cw - 4), big = bw >= 74 && rh >= 50;
  let P = (t) => [bx.x + (pos[t.id] + 0.5) * cw, bx.y + (t.depth - root.depth) * rh + 18];
  stroke(120, 140, 125); strokeWeight(1.2);
  for (let t of vis) if (!isCut(t, o.dLim, o.aLim)) for (let c of [t.left, t.right]) { let a = P(t), b = P(c); line(a[0], a[1] + (big ? 16 : 4), b[0], b[1] - (big ? 16 : 4)); }
  textAlign(CENTER, CENTER);
  for (let t of vis) {
    let [x, yy] = P(t), leaf = isCut(t, o.dLim, o.aLim), col = o.col ? o.col(t) : CLS_COL[t.pred] || [200, 200, 200];
    let hl = o.hl && o.hl.has(t.id);
    if (big) {
      stroke(hl ? color(255, 240, 150) : leaf ? color(...col) : color(110, 130, 115)); strokeWeight(hl ? 3 : 1.5);
      fill(leaf ? color(col[0] * 0.35 + 14, col[1] * 0.35 + 20, col[2] * 0.35 + 17) : color(30, 44, 38)); rect(x - bw / 2, yy - 17, bw, 34, 6);
      noStroke(); fill(235); textSize(11);
      let lines = o.text ? o.text(t, leaf) : [];
      lines.slice(0, 2).forEach((s, q) => text(s, x, yy - 7 + q * 14));
    } else {
      stroke(hl ? color(255, 240, 150) : 15); strokeWeight(hl ? 3 : 1); fill(...col); circle(x, yy, Math.max(5, Math.min(14, cw * 0.6)));
    }
  }
  return { leaves: leafN, maxD, P, big };
}
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
