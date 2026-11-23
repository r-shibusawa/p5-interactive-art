// ============================================
// 13 木の得意と苦手 ─ 同じデータで、決定木・k 近傍法・ロジスティック回帰の境界を並べて比べる
// 決定木は「x1 ≤ ○」「x2 ≤ ○」としか聞けない → 境界はいつも軸に平行な階段。斜めの境界は苦手、XOR や箱は得意
// k 近傍法 = いちばん近い k 個の訓練の点の多数決。ロジスティック回帰 = 直線 1 本（勾配法で自作）、XOR や円は表せない
//   ← → でデータを回転させると、ロジスティック回帰と k 近傍法は同じ形のまま回るが、木は形が変わる（回転に弱い）
//   XOR は「最初の 1 回」ではどこで切っても情報利得がほぼ 0 → 欲ばりな CART は最初の切り方をまちがえる（画面に実際の利得を表示）。H で手作りの深さ 2 の木と比べる
// 1 斜め / 2 円 / 3 XOR / 4 箱 / ← → 回転 / ↑↓ 木の深さ / K 近傍の数 k / H 手作りの XOR の木（深さ 2）/ R 新しいデータ
// ============================================

const KINDS = [1, 2, 3, 4];           // SHAPES の番号：斜め・円・XOR・箱
let kindI = 0, rotDeg = 0, depthT = 3, kNN = 5, nTrain = 200, nTest = 400, seedD = 13;   // ★ depthT = 木の深さ
const CELLS = 60;
let edgePts = [];
let handXor = false;
let rootGains = null;
let trainD, testD, treeRoot, logi, imgs = [], accs = [0, 0, 0], trainAcc = [0, 0, 0];

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); pixelDensity(1); for (let k = 0; k < 3; k++) imgs.push(createImage(CELLS, CELLS)); selfTest(); newData(); }
// ★ 回転したデータ：点を −θ 回してから、もとの形のルールでラベルをつける
function rotLabel(kind, u, v, deg) { let a = (-deg * Math.PI) / 180, du = u - 0.5, dv = v - 0.5; return trueLabel(kind, 0.5 + du * Math.cos(a) - dv * Math.sin(a), 0.5 + du * Math.sin(a) + dv * Math.cos(a)); }
function makeRot(kind, n, deg, seed) { seedRng(seed); let X = [], y = []; for (let i = 0; i < n; i++) { let u = 0.02 + 0.96 * rnd(), v = 0.02 + 0.96 * rnd(); X.push([u, v]); y.push(rotLabel(kind, u, v, deg)); } return { X, y }; }
function newData() {
  trainD = makeRot(KINDS[kindI], nTrain, rotDeg, seedD); testD = makeRot(KINDS[kindI], nTest, rotDeg, seedD + 1);
  logi = logisticTrain(trainD.X, trainD.y, 400, 8);
  edgePts = [];                                                // 本当の境界：細かいマスで、となりとラベルがちがう所
  for (let j = 0; j < 90; j++) for (let i = 0; i < 90; i++) {
    let u = (i + 0.5) / 90, v = (j + 0.5) / 90, c = rotLabel(KINDS[kindI], u, v, rotDeg);
    if ((i + j) % 2 === 0 && (rotLabel(KINDS[kindI], u + 1 / 90, v, rotDeg) !== c || rotLabel(KINDS[kindI], u, v + 1 / 90, rotDeg) !== c)) edgePts.push([u, v]);
  }
  rootGains = [bestGainFeat(trainD.X, trainD.y, 0), bestGainFeat(trainD.X, trainD.y, 1), gainAtCut(trainD.X, trainD.y, 0, 0.5)];
  retrainTree();
}
function retrainTree() {
  treeRoot = growTree(trainD.X, trainD.y, { maxDepth: depthT });
  let fns = models();
  fns.forEach((fn, k) => { accs[k] = accuracyOf(fn, testD.X, testD.y); trainAcc[k] = accuracyOf(fn, trainD.X, trainD.y); paintImage(imgs[k], (u, v) => mixCol(fn([u, v]) ? [0, 1] : [1, 0], 0.45)); });
}
// ★ 特徴量 f だけで切るときの、いちばん大きい情報利得（ビット）とそのしきい値（全部の中点）
function bestGainFeat(X, y, f) {
  let o = X.map((_, i) => i).sort((a, b) => X[a][f] - X[b][f]), P = [0, 0], L = [0, 0], best = { g: 0, t: 0.5 };
  y.forEach((c) => P[c]++);
  for (let k = 0; k + 1 < o.length; k++) {
    L[y[o[k]]]++; let a = X[o[k]][f], b = X[o[k + 1]][f];
    if (b > a) { let g = gainOf(P, L, [P[0] - L[0], P[1] - L[1]], 'entropy'); if (g > best.g) best = { g, t: (a + b) / 2 }; }
  }
  return best;
}
function gainAtCut(X, y, f, t) { let L = [0, 0], R = [0, 0]; X.forEach((x, i) => (x[f] <= t ? L : R)[y[i]]++); return gainOf([L[0] + R[0], L[1] + R[1]], L, R, 'entropy'); }
// 手作りの XOR の木（深さ 2）：x1 ≤ 0.5？ → x2 ≤ 0.5？
function xorHandTree() {
  let leaf = (c) => ({ leaf: true, pred: c, depth: 2 });
  return { leaf: false, feat: 0, thr: 0.5, depth: 0, left: { leaf: false, feat: 1, thr: 0.5, depth: 1, left: leaf(0), right: leaf(1) }, right: { leaf: false, feat: 1, thr: 0.5, depth: 1, left: leaf(1), right: leaf(0) } };
}
function isXor() { return KINDS[kindI] === 3; }
function models() { return [handXor && isXor() ? ((x) => treePredict(xorHandTree(), x)) : (x) => treePredict(treeRoot, x), (x) => knnPredict(trainD.X, trainD.y, x, kNN), (x) => (logisticProb(logi, x) > 0.5 ? 1 : 0)]; }

function draw() {
  background(...BG_COL);
  let side = Math.min((width - 160) / 3, height - 260), titles = [handXor && isXor() ? '手作りの木（深さ 2：x1 ≤ 0.5？→ x2 ≤ 0.5？）' : '決定木（CART、深さ ' + depthT + '）', 'k 近傍法（k = ' + kNN + '）', 'ロジスティック回帰（直線）'];
  for (let k = 0; k < 3; k++) {
    let bx = { x: 40 + k * (side + 40), y: 130, w: side, h: side };
    noSmooth(); image(imgs[k], bx.x, bx.y, side, side); smooth();
    stroke(15); strokeWeight(0.8);
    trainD.X.forEach((x, i) => { let p = toPx(bx, x[0], x[1]); fill(...CLS_COL[trainD.y[i]]); circle(p[0], p[1], 6); });
    // 本当の境界（白い点線）
    noStroke(); fill(255, 255, 255, 150);
    for (let [u, v] of edgePts) { let p = toPx(bx, u, v); rect(p[0], p[1], 1.6, 1.6); }
    noFill(); stroke(90, 120, 100); strokeWeight(1); rect(bx.x, bx.y, side, side);
    noStroke(); fill(240); textSize(17); textAlign(LEFT, BASELINE); text(titles[k], bx.x, bx.y - 12);
    fill(255, 240, 150); textSize(16); text('テスト ' + fmtNum(accs[k] * 100, 1) + '%　訓練 ' + fmtNum(trainAcc[k] * 100, 1) + '%', bx.x, bx.y + side + 28);
  }
  // ---- 文字
  textAlign(LEFT, BASELINE); noStroke(); fill(240); textSize(20);
  text('木の得意と苦手　データ：' + SHAPES[KINDS[kindI]] + '　回転 ' + rotDeg + '°', 40, 40);
  fill(170); textSize(15); text('1 斜め　2 円　3 XOR　4 箱　← → 回転（15° ずつ）　↑↓ 木の深さ　K 近傍の数 k　H 手作りの XOR の木　R 新しいデータ', 40, 66);
  let ty = 130 + side + 70; fill(200); textSize(14);
  if (isXor()) {                       // XOR：欲ばりな CART が迷う理由を、実際の利得で
    fill(255, 225, 110);
    text('なぜ XOR で木がふるわない？ CART は「いまの 1 回でいちばん得をする切り方」しか見ない（欲ばり法）。いまのデータで根の最良の情報利得は　x1：' + fmtNum(rootGains[0].g, 4) + ' ビット（x1 ≤ ' + fmtNum(rootGains[0].t, 3) + '）、x2：' + fmtNum(rootGains[1].g, 4) + ' ビット（x2 ≤ ' + fmtNum(rootGains[1].t, 3) + '）', 40, ty, width - 80);
    fill(200);
    text('正しい切り方 x1 ≤ 0.5 の利得も ' + fmtNum(rootGains[2], 4) + ' ビットしかない（左右どちらも A と B が半々のまま）。でも 2 回目に x2 ≤ 0.5 で切ると一気に純粋になる。1 回目の得だけで選ぶと、はしの方の意味のない線を選んでしまい、深さ 4 でも 6 割くらいになることがある。H で手作りの深さ 2 の木（' + (handXor ? 'いま表示中' : '100% 近く') + '）と比べよう', 40, ty + 48, width - 80);
  } else {
  text('決定木：軸に平行な線しか引けない。斜めの線は階段で近似 → 深さが要る。でも XOR や箱のような「場合分け」は少ない質問で表せる', 40, ty, width - 80);
  text('k 近傍法：形を選ばないが、訓練の点を全部覚えておく必要がある。ロジスティック回帰：直線 1 本なので、円や XOR は表せない。白い点線 = 本当の境界', 40, ty + 26, width - 80);
  fill(160); text('木の弱点の対策：特徴量を作る（x1 + x2 などを足す）、たくさんの木を混ぜる（08〜11）。回転すると木の成績が変わるのは、特徴量の「軸」に意味があるから', 40, ty + 60, width - 80);
  }
  drawSelfTest(width - 170, height - 12);
}
function keyPressed() {
  for (let k = 1; k <= 4; k++) if (key === String(k)) { kindI = k - 1; newData(); }
  if (key === RIGHT_ARROW) { rotDeg = (rotDeg + 15) % 360; newData(); }
  if (key === LEFT_ARROW) { rotDeg = (rotDeg + 345) % 360; newData(); }
  if (key === UP_ARROW) { depthT = Math.min(10, depthT + 1); retrainTree(); }
  if (key === DOWN_ARROW) { depthT = Math.max(1, depthT - 1); retrainTree(); }
  if (key === 'h' || key === 'H') { handXor = !handXor; retrainTree(); }
  if (key === 'k' || key === 'K') { kNN = kNN === 1 ? 5 : kNN === 5 ? 15 : 1; retrainTree(); }
  if (key === 'r' || key === 'R') { seedD++; newData(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let D = makeRot(1, 200, 0, 31), t3 = growTree(D.X, D.y, { maxDepth: 3 }), lg = logisticTrain(D.X, D.y, 400, 8);
  let aT = accuracyOf((x) => treePredict(t3, x), D.X, D.y), aL = accuracyOf((x) => (logisticProb(lg, x) > 0.5 ? 1 : 0), D.X, D.y);
  check('斜めの境界：深さ 3 の木は訓練でも 100% にならない（' + fmtNum(aT * 100, 1) + '%）、ロジスティック回帰は ≥ 98%（' + fmtNum(aL * 100, 1) + '%）', aT < 1 && aL >= 0.98);
  check('ロジスティック回帰の損失（交差エントロピー）は勾配法の 1 歩ごとに減る', lg.losses.every((v, i) => i === 0 || v <= lg.losses[i - 1] + 1e-12) && noNaN(lg.losses));
  check('k 近傍法で k = 1 なら訓練の点は 100% 当たる', accuracyOf((x) => knnPredict(D.X, D.y, x, 1), D.X, D.y) === 1);
  let B0 = makeRot(4, 200, 0, 32), B0t = makeRot(4, 400, 0, 33), B45 = makeRot(4, 200, 45, 32), B45t = makeRot(4, 400, 45, 33);
  let a0 = accuracyOf((x) => treePredict(growTree(B0.X, B0.y, { maxDepth: 4 }), x), B0t.X, B0t.y), a45 = accuracyOf((x) => treePredict(growTree(B45.X, B45.y, { maxDepth: 4 }), x), B45t.X, B45t.y);
  check('箱（軸に平行、辺が 4 本）：深さ 4 の木のテスト ' + fmtNum(a0 * 100, 1) + '% ≥ 95%、45° 回すと ' + fmtNum(a45 * 100, 1) + '% に下がる', a0 >= 0.95 && a45 < a0 - 0.03);
  let X0 = makeRot(3, 200, 0, 34), X0t = makeRot(3, 400, 0, 35), lx = logisticTrain(X0.X, X0.y, 400, 8);
  let aXT = accuracyOf((x) => treePredict(growTree(X0.X, X0.y, { maxDepth: 4 }), x), X0t.X, X0t.y), aXL = accuracyOf((x) => (logisticProb(lx, x) > 0.5 ? 1 : 0), X0t.X, X0t.y);
  check('XOR：深さ 4 の木 ' + fmtNum(aXT * 100, 1) + '% ≥ 90%、ロジスティック回帰 ' + fmtNum(aXL * 100, 1) + '% ≤ 65%（直線では無理）', aXT >= 0.9 && aXL <= 0.65);
  check('深さ 3 の木の葉は 8 枚以下、境界は軸に平行（どの分割も x1 か x2 のしきい値）', countLeaves(t3) <= 8 && treeNodes(t3).every((q) => q.leaf || q.feat === 0 || q.feat === 1));
  // 既定の XOR（種 13、回転 0°）：1 回目の分割の利得はほぼ 0。本物の XOR なら軸の 1 本の線の利得は理論上ちょうど 0 で、見える値は点の数が有限なことによるゆらぎだけ
  // → しきい値 0.05 ビット（正しく 1 回切ったあとの 2 回目の利得 ≈ 1 ビットの 5%）。種 34〜50 の 13 データでも最大 0.039
  let XD = makeRot(3, 200, 0, 13), g0 = bestGainFeat(XD.X, XD.y, 0).g, g1 = bestGainFeat(XD.X, XD.y, 1).g;
  let li = XD.X.map((_, i) => i).filter((i) => XD.X[i][0] <= 0.5), g2 = bestGainFeat(li.map((i) => XD.X[i]), li.map((i) => XD.y[i]), 1).g;
  check('既定の XOR：根の最良の情報利得 x1 ' + fmtNum(g0, 4) + '・x2 ' + fmtNum(g1, 4) + ' < 0.05 ビット、x1 ≤ 0.5 で切ったあとの 2 回目は ' + fmtNum(g2, 3) + ' > 0.9 ビット', g0 < 0.05 && g1 < 0.05 && g2 > 0.9);
  let XT = makeRot(3, 400, 0, 14), hand = xorHandTree();
  check('手作りの深さ 2 の木は既定の XOR の訓練・テストとも 100%（欲ばりな CART の深さ 4 より上）', accuracyOf((x) => treePredict(hand, x), XD.X, XD.y) === 1 && accuracyOf((x) => treePredict(hand, x), XT.X, XT.y) === 1 && accuracyOf((x) => treePredict(growTree(XD.X, XD.y, { maxDepth: 4 }), x), XT.X, XT.y) < 1);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 1（斜め）で ↑ を押して木を深くしていくと、階段はどうなる？ テストの成績は？
// 2. 4（箱）で → を 3 回（45°）押すと、木の成績はどれくらい下がる？ ほかの 2 つは？
// 3. 3（XOR）でロジスティック回帰はなぜ 50% くらい？ 木は深さ 2 で表せるのに、深さ 3 では足りないことがある。なぜ？（最初の分割ではジニがほとんど減らないので、欲ばりな CART は迷う）
// 4. K で k を 1・5・15 に。k = 1 の境界はなぜギザギザ？
// 5. 木に x1 + x2 という特徴量を足せば、斜めも 1 回で切れる。どこを変えればいい？
// 6. 深さ 2 で XOR を表せる木を、02 で手で作れる？（02 では 4 キーで XOR）。なぜ欲ばりな CART はそれを見つけられない？ H で手作りの木と比べよう

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
// ---- 比べる相手：k 近傍法と、ロジスティック回帰（勾配法で自作）
function knnPredict(X, y, x, k, K) {   // いちばん近い k 個を、並べかえずに挿入で集める
  let bd = [], bc = [], v = new Array(K || 2).fill(0);
  for (let i = 0; i < X.length; i++) {
    let d = (X[i][0] - x[0]) ** 2 + (X[i][1] - x[1]) ** 2;
    if (bd.length < k || d < bd[bd.length - 1]) {
      let q = bd.length < k ? bd.length : bd.length - 1;
      while (q > 0 && bd[q - 1] > d) { bd[q] = bd[q - 1]; bc[q] = bc[q - 1]; q--; }
      bd[q] = d; bc[q] = y[i];
    }
  }
  for (let c of bc) v[c]++;
  return argMaxArr(v);
}
function sigm(z) { return 1 / (1 + Math.exp(-clampv(z, -40, 40))); }
function logisticTrain(X, y, epochs, lr) {      // w·(x − 0.5) + b。交差エントロピーの勾配を全部の点で平均して下る
  let w = [0, 0], b = 0, losses = [];
  for (let e = 0; e < epochs; e++) {
    let g0 = 0, g1 = 0, gb = 0, L = 0;
    for (let i = 0; i < X.length; i++) {
      let u = X[i][0] - 0.5, v = X[i][1] - 0.5, p = sigm(w[0] * u + w[1] * v + b), r = p - y[i];
      g0 += r * u; g1 += r * v; gb += r; L -= y[i] ? Math.log(Math.max(1e-12, p)) : Math.log(Math.max(1e-12, 1 - p));
    }
    let n = X.length || 1; w[0] -= (lr * g0) / n; w[1] -= (lr * g1) / n; b -= (lr * gb) / n; losses.push(L / n);
  }
  return { w, b, losses };
}
function logisticProb(m, x) { return sigm(m.w[0] * (x[0] - 0.5) + m.w[1] * (x[1] - 0.5) + m.b); }
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
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) ? v.every(noNaN) : !(typeof v === 'number' && v !== v); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(120, 210, 150) : color(255, 90, 90)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
