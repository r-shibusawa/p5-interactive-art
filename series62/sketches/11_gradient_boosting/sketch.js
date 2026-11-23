// ============================================
// 11 勾配ブースティング ─ 「いまの予測のまちがい（残差）」に小さな回帰木をあてはめて、少しずつ足していく
// F₀ = 平均。くり返し：残差 r = y − F(x) → 深さの小さい回帰木 h を r にあてはめる → F ← F + ν·h（ν = 学習率、縮小）
//   2 乗誤差の「勾配」がちょうど残差なので、これは関数の世界での勾配降下法
//   ν が小さいとゆっくり近づき（木がたくさん要る）、大きいと速いがノイズまでなぞりやすい（テスト誤差が上がる）
// スペース 一時停止 / ↑↓ 学習率 ν / ← → 木の深さ / R やり直す
// ============================================

const NUS = [0.02, 0.05, 0.1, 0.2, 0.5, 1];
let nuIdx = 2, depthT = 2, nTrain = 50, noiseS = 0.25, seedD = 6, paused = false;   // ★ noiseS = ノイズの大きさ
const M_MAX = 300;                    // ★ 木の本数の上限
let Xtr = [], Ytr = [], Xte = [], Yte = [], gbm, hist = [], testFit = [];
function hidden(x) { return Math.sin(7 * x) + 0.5 * Math.cos(19 * x) * x + (x > 0.7 ? 0.6 : 0); }   // ★ 本当の関数

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); selfTest(); newData(); }
function newData() {
  seedRng(seedD); Xtr = []; Ytr = []; Xte = []; Yte = [];
  for (let i = 0; i < nTrain; i++) { let x = rnd(); Xtr.push([x]); Ytr.push(hidden(x) + noiseS * rndGauss()); }
  for (let i = 0; i < 300; i++) { let x = rnd(); Xte.push([x]); Yte.push(hidden(x) + noiseS * rndGauss()); }
  restart();
}
function restart() { gbm = makeGBM(Xtr, Ytr, NUS[nuIdx], depthT); hist = []; testFit = Xte.map(() => gbm.f0); paused = false; }
// ★ 1 本足す：残差に回帰木 → 予測を更新（テストの予測も同じ木で更新）
function addOne() {
  let t = gbmAdd(gbm);
  testFit = testFit.map((v, i) => v + gbm.nu * regPredict(t, Xte[i]));
  hist.push({ tr: mseOf(gbm.fit, Ytr), te: mseOf(testFit, Yte) });
}

function draw() {
  background(...BG_COL);
  if (!paused) for (let k = 0; k < 2 && gbm.trees.length < M_MAX; k++) addOne();   // 1 フレームに 2 本
  let m = gbm.trees.length;
  // ---- データと予測
  let g = { x: 70, y: 110, w: width * 0.52, h: height * 0.5, x0: 0, x1: 1, y0: -1.8, y1: 2 };
  plotAxes(g, 'x', 'y（白 = 本当の関数、黄 = F_m(x)、縦の線 = 残差）', [0, 0.5, 1], [-1, 0, 1, 2]);
  stroke(255, 255, 255, 80); strokeWeight(1.5); let a = []; for (let q = 0; q <= 200; q++) a.push([gX(g, q / 200), gY(g, hidden(q / 200))]); polyline(a);
  for (let i = 0; i < Xtr.length; i++) { stroke(245, 140, 75, 150); strokeWeight(1); line(gX(g, Xtr[i][0]), gY(g, Ytr[i]), gX(g, Xtr[i][0]), gY(g, gbm.fit[i])); }
  noStroke(); fill(85, 175, 240); for (let i = 0; i < Xtr.length; i++) circle(gX(g, Xtr[i][0]), gY(g, Ytr[i]), 7);
  stroke(255, 225, 110); strokeWeight(2.5); let f = []; for (let q = 0; q <= 300; q++) f.push([gX(g, q / 300), gY(g, gbmPredict(gbm, [q / 300]))]); polyline(f);
  // ---- 最後に足した木 ν·h(x)
  let g2 = { x: 70, y: g.y + g.h + 70, w: g.w, h: height - g.y - g.h - 150, x0: 0, x1: 1, y0: -0.6, y1: 0.6 };
  plotAxes(g2, 'x', '最後に足した木 ν·h_m(x)（残差にあてはめた小さな回帰木）', [0, 0.5, 1], [-0.5, 0, 0.5]);
  if (m > 0) { stroke(175, 225, 95); strokeWeight(2.5); let h = []; for (let q = 0; q <= 300; q++) h.push([gX(g2, q / 300), gY(g2, gbm.nu * regPredict(gbm.trees[m - 1], [q / 300]))]); polyline(h); }
  // ---- 誤差のグラフ
  let gx = g.x + g.w + 70, g3 = { x: gx, y: 130, w: width - gx - 50, h: height * 0.42, x0: 0, x1: M_MAX, y0: 0, y1: 0.6 };
  plotAxes(g3, '木の本数 m', '平均 2 乗誤差（オレンジ = 訓練、緑 = テスト）', [0, 100, 200, 300], [0, 0.2, 0.4, 0.6]);
  stroke(245, 160, 80); strokeWeight(2.5); polyline(hist.map((h, k) => [gX(g3, k + 1), gY(g3, h.tr)]));
  stroke(175, 225, 95); strokeWeight(2.5); polyline(hist.map((h, k) => [gX(g3, k + 1), gY(g3, h.te)]));
  stroke(255, 255, 255, 60); line(g3.x, gY(g3, noiseS * noiseS), g3.x + g3.w, gY(g3, noiseS * noiseS));
  let best = hist.length ? argMaxArr(hist.map((h) => -h.te)) : 0;
  if (hist.length) { noStroke(); fill(255, 240, 150); circle(gX(g3, best + 1), gY(g3, hist[best].te), 10); }
  // ---- 文字
  textAlign(LEFT, BASELINE); noStroke(); fill(240); textSize(20);
  text('勾配ブースティング　学習率 ν = ' + gbm.nu + '　木の深さ ' + depthT + '　木 ' + m + ' / ' + M_MAX + ' 本' + (paused ? '（一時停止）' : ''), 40, 40);
  fill(170); textSize(15); text('スペース 一時停止　↑↓ 学習率 ν　← → 木の深さ　R やり直す', 40, 66);
  let ty = g3.y + g3.h + 60; fill(225); textSize(16);
  if (hist.length) {
    text('訓練 ' + fmtNum(hist[m - 1].tr, 4) + '　テスト ' + fmtNum(hist[m - 1].te, 4), gx, ty);
    fill(255, 240, 150); text('テストがいちばん小さいのは ' + (best + 1) + ' 本目（' + fmtNum(hist[best].te, 4) + '）', gx, ty + 26);
  }
  fill(160); textSize(14);
  text('白い横線 = ノイズの分散 σ²（これより下のテスト誤差はふつう無理）。ν を小さく・木を増やすと、ゆっくりだがテスト誤差が低いところまで行きやすい（縮小の効果）', gx, ty + 70, g3.w);
  drawSelfTest(width - 170, height - 12);
}
function keyPressed() {
  if (key === ' ') paused = !paused;
  if (key === UP_ARROW) { nuIdx = Math.min(NUS.length - 1, nuIdx + 1); restart(); }
  if (key === DOWN_ARROW) { nuIdx = Math.max(0, nuIdx - 1); restart(); }
  if (key === RIGHT_ARROW) { depthT = Math.min(4, depthT + 1); restart(); }
  if (key === LEFT_ARROW) { depthT = Math.max(1, depthT - 1); restart(); }
  if (key === 'r' || key === 'R') { seedD++; newData(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(23); let X = [], y = [], Xt = [], yt = [];
  for (let i = 0; i < 50; i++) { let x = rnd(); X.push([x]); y.push(hidden(x) + 0.25 * rndGauss()); }
  for (let i = 0; i < 300; i++) { let x = rnd(); Xt.push([x]); yt.push(hidden(x) + 0.25 * rndGauss()); }
  let G = makeGBM(X, y, 0.1, 2), prev = mseOf(G.fit, y), mono = true, zero = true;
  check('F₀ = y の平均', near(G.f0, sumArr(y) / y.length) && G.fit.every((v) => v === G.f0));
  let r0 = y.map((v) => v - G.f0), t1 = gbmAdd(G), okLeaf = true;
  for (let q of treeNodes(t1)) if (q.leaf) { let ids = X.map((_, i) => i).filter((i) => leafOf(t1, X[i]) === q); if (Math.abs(q.value - sumArr(ids.map((i) => r0[i])) / ids.length) > 1e-12) okLeaf = false; }
  check('1 本目の木の葉の値 = その葉に入った点の残差 y − F₀ の平均', okLeaf);
  for (let k = 0; k < 150; k++) { gbmAdd(G); let e = mseOf(G.fit, y); if (e > prev + 1e-12) mono = false; prev = e; if (Math.abs(sumArr(y.map((v, i) => v - G.fit[i]))) > 1e-8) zero = false; }
  check('ν = 0.1：訓練の 2 乗誤差は 1 本ごとに減るか同じ（150 本）', mono);
  check('残差の合計はいつも 0（葉の値が平均だから）', zero);
  check('まとめて計算した予測 F(x) = 1 本ずつ足してきた予測（全部の点）', X.every((x, i) => near(gbmPredict(G, x), G.fit[i], 1e-9)));
  let S = makeGBM(X, y, 1, 1), st = growReg(X, y, { maxDepth: 1 }); gbmAdd(S);
  check('ν = 1・深さ 1 の 1 本目 = y にそのまま回帰の切り株をあてはめた予測', X.every((x, i) => near(S.fit[i], regPredict(st, x), 1e-9)));
  let H = makeGBM(X, y, 1, 3), tes = [];
  for (let k = 0; k < 60; k++) { gbmAdd(H); tes.push(mseOf(Xt.map((x) => gbmPredict(H, x)), yt)); }
  check('ν = 1・深さ 3 では過学習：60 本目のテスト誤差 ' + fmtNum(tes[59], 3) + ' > 途中の最小 ' + fmtNum(Math.min(...tes), 3), tes[59] > Math.min(...tes) + 1e-6);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. ↑↓ で ν を 0.02 と 1 にして、黄の曲線の近づき方とテスト誤差を比べよう
// 2. ← → で木の深さを 1（切り株）と 4 に。深さ 1 でも、たくさん足すと曲線を表せる？
// 3. 縦の線（残差）がだんだん短くなる。最後に足した木（下のグラフ）はどこを直している？
// 4. テスト誤差がいちばん小さい本数で止めるのが「早期打ち切り」。ν を小さくすると何本目になる？
// 5. 表形式のデータの勝負では、この方法（XGBoost・LightGBM など）がとても強い

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
// ---- 回帰木：葉の値 = 平均、分割は 2 乗誤差（SSE）がいちばん減るところ。SSE = Σy² − (Σy)²/n
function sseOf(sum, sum2, n) { return n > 0 ? Math.max(0, sum2 - (sum * sum) / n) : 0; }
function growReg(X, y, o) {
  o = o || {};
  let ctx = { X, y, maxDepth: o.maxDepth === undefined ? 40 : o.maxDepth, minLeaf: Math.max(1, o.minLeaf || 1), d: X.length ? X[0].length : 0 };
  return growRegNode(ctx, o.idx ? o.idx.slice() : X.map((_, i) => i), 0);
}
function growRegNode(ctx, idx, depth) {
  let { X, y } = ctx, s = 0, s2 = 0;
  for (let i of idx) { s += y[i]; s2 += y[i] * y[i]; }
  let n = idx.length, node = { leaf: true, value: n ? s / n : 0, n, sse: sseOf(s, s2, n), depth, id: nodeCounter++, dec: 0 };
  if (depth >= ctx.maxDepth || n < 2 * ctx.minLeaf || node.sse < 1e-12) return node;
  let best = null;
  for (let f = 0; f < ctx.d; f++) {
    let ord = idx.slice().sort((a, b) => X[a][f] - X[b][f]), ls = 0, ls2 = 0;
    for (let k = 0; k < n - 1; k++) {
      let v = y[ord[k]]; ls += v; ls2 += v * v;
      let v0 = X[ord[k]][f], v1 = X[ord[k + 1]][f];
      if (!(v1 > v0) || k + 1 < ctx.minLeaf || n - k - 1 < ctx.minLeaf) continue;
      let dec = node.sse - sseOf(ls, ls2, k + 1) - sseOf(s - ls, s2 - ls2, n - k - 1);
      if (!best || dec > best.dec + 1e-12) best = { feat: f, thr: (v0 + v1) / 2, dec };
    }
  }
  if (!best) return node;
  let L = [], R = [];
  for (let i of idx) (X[i][best.feat] <= best.thr ? L : R).push(i);
  node.leaf = false; node.feat = best.feat; node.thr = best.thr; node.dec = best.dec;
  node.left = growRegNode(ctx, L, depth + 1); node.right = growRegNode(ctx, R, depth + 1);
  return node;
}
function regPredict(root, x, dLim) { return leafOf(root, x, dLim).value; }
function mseOf(pred, y) { let s = 0; for (let i = 0; i < y.length; i++) s += (pred[i] - y[i]) ** 2; return y.length ? s / y.length : 0; }
// ---- 勾配ブースティング（2 乗誤差）：残差 r = y − F(x) に小さな回帰木をあてはめ、F ← F + ν·木（ν = 学習率）
function makeGBM(X, y, nu, maxDepth) { let f0 = y.length ? sumArr(y) / y.length : 0; return { X, y, nu, maxDepth, f0, trees: [], fit: y.map(() => f0) }; }
function gbmAdd(G) {
  let r = G.y.map((v, i) => v - G.fit[i]), t = growReg(G.X, r, { maxDepth: G.maxDepth });
  G.fit = G.fit.map((v, i) => v + G.nu * regPredict(t, G.X[i])); G.trees.push(t);
  return t;
}
function gbmPredict(G, x, m) { let s = G.f0, M = Math.min(m === undefined ? G.trees.length : m, G.trees.length); for (let k = 0; k < M; k++) s += G.nu * regPredict(G.trees[k], x); return s; }
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
