// ============================================
// 07 回帰木 ─ 数（連続の値）を当てる木。葉の答え = その葉に入った点の平均 → 区分的に一定（階段）の関数になる
// 分割は「2 乗誤差の合計 SSE がいちばん減るしきい値」。SSE = Σ(y − 平均)²。減り = SSE(親) − SSE(左) − SSE(右)
//   深さ（↑↓）と、葉に残す最小の点の数（← →）で、階段の細かさが変わる。細かすぎるとノイズまでなぞる
//   V で 2 次元：本当の関数（左）と、深さ d の回帰木（右）を色で比べる
// ↑↓ 深さ / ← → 葉の最小の点の数 / クリック 点を足す（1 次元）/ V 1 次元 ⇔ 2 次元 / R 新しいデータ
// ============================================

let nPts = 80, noiseS = 0.15, maxDepth = 3, minLeaf = 3, seedD = 4, twoD = false;   // ★ noiseS = ノイズの大きさ
let sseCurve = [];
let X1 = [], Y1 = [], tree1, tree2, X2 = [], Y2 = [], img2t, img2f, dirty2 = true, plotG;
function hidden1(x) { return 0.6 * Math.sin(8 * x) + (x > 0.62 ? 0.7 : 0) + 0.3 * x; }   // ★ 本当の関数（ここを変えてみよう）
function hidden2(u, v) { return Math.sin(5 * u) * Math.cos(4 * v) + (u + v > 1.2 ? 0.6 : 0); }

function setup() {
  createCanvas(windowWidth, windowHeight); textWrap(CHAR); pixelDensity(1);
  img2t = createImage(120, 120); img2f = createImage(120, 120); selfTest(); newData();
}
function newData() {
  seedRng(seedD); X1 = []; Y1 = []; X2 = []; Y2 = [];
  for (let i = 0; i < nPts; i++) { let x = rnd(); X1.push([x]); Y1.push(hidden1(x) + noiseS * rndGauss()); }
  for (let i = 0; i < 500; i++) { let u = rnd(), v = rnd(); X2.push([u, v]); Y2.push(hidden2(u, v) + noiseS * rndGauss()); }
  retrain();
}
function retrain() {
  tree1 = growReg(X1, Y1, { maxDepth, minLeaf }); tree2 = growReg(X2, Y2, { maxDepth: maxDepth + 3, minLeaf }); dirty2 = true;
  let full = growReg(X1, Y1, { minLeaf });                       // 深さと SSE のグラフ用（最後まで育てて深さ d で切る）
  sseCurve = []; for (let d = 0; d <= 10; d++) sseCurve.push(sumArr(X1.map((x, i) => (regPredict(full, x, d) - Y1[i]) ** 2)));
}
function heat(v) { let q = clampv((v + 1.5) / 3.2, 0, 1); return [40 + 210 * q, 70 + 120 * Math.sin(q * Math.PI), 200 - 170 * q]; }

function draw() {
  background(...BG_COL);
  textAlign(LEFT, BASELINE); noStroke(); fill(240); textSize(20);
  text('回帰木　' + (twoD ? '2 次元' : '1 次元') + '　深さ ' + maxDepth + (twoD ? '（2 次元は +3）' : '') + '　葉の最小の点の数 ' + minLeaf, 40, 40);
  fill(170); textSize(15); text('↑↓ 深さ　← → 葉の最小の点の数　クリック 点を足す（1 次元）　V 1 次元 ⇔ 2 次元　R 新しいデータ', 40, 66);
  if (twoD) draw2D(); else draw1D();
  drawSelfTest(width - 170, height - 12);
}
function draw1D() {
  let g = { x: 70, y: 110, w: width * 0.56, h: height - 240, x0: 0, x1: 1, y0: -1.2, y1: 1.8 };
  plotG = g;
  plotAxes(g, 'x', 'y（白 = 本当の関数、黄 = 回帰木）', [0, 0.25, 0.5, 0.75, 1], [-1, 0, 1]);
  stroke(255, 255, 255, 90); strokeWeight(1.5); let a = []; for (let q = 0; q <= 200; q++) a.push([gX(g, q / 200), gY(g, hidden1(q / 200))]); polyline(a);
  // 分割の線
  for (let t of treeNodes(tree1)) if (!t.leaf) { stroke(255, 240, 150, 60 + 120 / (t.depth + 1)); strokeWeight(1); line(gX(g, t.thr), g.y, gX(g, t.thr), g.y + g.h); }
  noStroke(); fill(85, 175, 240); for (let i = 0; i < X1.length; i++) circle(gX(g, X1[i][0]), gY(g, Y1[i]), 7);
  // 階段（x を細かく動かして葉の値をつなぐ）
  stroke(255, 225, 110); strokeWeight(3); let s = [];
  for (let q = 0; q <= 400; q++) { let x = q / 400, v = regPredict(tree1, [x]); if (s.length && Math.abs(s[s.length - 1][1] - gY(g, v)) > 0.5) s.push([gX(g, x), s[s.length - 1][1]]); s.push([gX(g, x), gY(g, v)]); }
  polyline(s);
  // ---- 分割の一覧（SSE の減り）
  let px = g.x + g.w + 50, pw = width - px - 30, list = treeNodes(tree1).filter((t) => !t.leaf).sort((p, q) => p.depth - q.depth || p.thr - q.thr);
  let sse = mseOf(X1.map((x) => regPredict(tree1, x)), Y1) * X1.length;
  noStroke(); fill(230); textSize(16); textAlign(LEFT, BASELINE);
  text('根の SSE ' + fmtNum(tree1.sse, 2) + ' → 木の SSE ' + fmtNum(sse, 2) + '（葉 ' + countLeaves(tree1) + ' 枚）', px, 120, pw);
  fill(200); textSize(13);
  list.slice(0, 15).forEach((t, k) => text('深さ ' + t.depth + '：x ≤ ' + fmtNum(t.thr, 3) + '　SSE ' + fmtNum(t.sse, 2) + ' → ' + fmtNum(t.left.sse, 2) + ' + ' + fmtNum(t.right.sse, 2) + '（−' + fmtNum(t.dec, 2) + '）', px, 156 + k * 19));
  if (list.length > 15) text('… ほか ' + (list.length - 15) + ' 個', px, 156 + 15 * 19);
  // 深さと SSE のグラフ
  let g2 = { x: px + 10, y: height - 260, w: pw - 30, h: 150, x0: 0, x1: 10, y0: 0, y1: Math.max(1e-6, sseCurve[0] || 1) };
  plotAxes(g2, '深さ', '訓練の SSE（いまの最小の点の数で）', [0, 5, 10], [0, Math.round(g2.y1)]);
  let pts = sseCurve.map((e, d) => [gX(g2, d), gY(g2, e)]);
  stroke(255, 225, 110); strokeWeight(2); polyline(pts); noStroke(); fill(255, 240, 150); circle(pts[Math.min(10, maxDepth)][0], pts[Math.min(10, maxDepth)][1], 10);
  fill(160); textSize(13); text('葉の値 = 平均、だから 1 つの葉の中では「平均からのずれの 2 乗の合計」= SSE が最小', g.x, height - 60, g.w);
}
function draw2D() {
  if (dirty2) { paintImage(img2t, (u, v) => heat(hidden2(u, v))); paintImage(img2f, (u, v) => heat(regPredict(tree2, [u, v]))); dirty2 = false; }
  let side = Math.min((width - 160) / 2, height - 230);
  noSmooth(); image(img2t, 40, 110, side, side); image(img2f, 80 + side, 110, side, side); smooth();
  noStroke(); fill(220); textSize(15); textAlign(LEFT, BASELINE);
  let mse = mseOf(X2.map((x) => regPredict(tree2, x)), Y2);
  text('本当の関数 sin(5u)·cos(4v) + 段差', 40, 105 + side + 30);
  text('回帰木（深さ ' + (maxDepth + 3) + '、葉 ' + countLeaves(tree2) + ' 枚）訓練の平均 2 乗誤差 ' + fmtNum(mse, 4), 80 + side, 105 + side + 30);
  fill(160); textSize(13); text('長方形の中は 1 色（一定）。斜めの段差 u + v > 1.2 は階段で近似するしかない', 80 + side, 105 + side + 56);
}
function mousePressed() {
  if (twoD || !plotG) return;
  let x = (mouseX - plotG.x) / plotG.w, yv = plotG.y1 - ((mouseY - plotG.y) / plotG.h) * (plotG.y1 - plotG.y0);
  if (x < 0 || x > 1 || mouseY < plotG.y || mouseY > plotG.y + plotG.h) return;
  X1.push([x]); Y1.push(yv); retrain();
}
function keyPressed() {
  if (key === UP_ARROW) { maxDepth = Math.min(10, maxDepth + 1); retrain(); }
  if (key === DOWN_ARROW) { maxDepth = Math.max(0, maxDepth - 1); retrain(); }
  if (key === RIGHT_ARROW) { minLeaf = Math.min(20, minLeaf + 1); retrain(); }
  if (key === LEFT_ARROW) { minLeaf = Math.max(1, minLeaf - 1); retrain(); }
  if (key === 'v' || key === 'V') twoD = !twoD;
  if (key === 'r' || key === 'R') { seedD++; newData(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(71); let X = [], y = [];
  for (let i = 0; i < 60; i++) { let x = rnd(); X.push([x]); y.push(hidden1(x) + 0.2 * rndGauss()); }
  let sseDirect = (ids) => { let m = sumArr(ids.map((i) => y[i])) / (ids.length || 1); return sumArr(ids.map((i) => (y[i] - m) ** 2)); };
  let t = growReg(X, y, { maxDepth: 4 }), okD = true, okM = true;
  let walk = (q, ids) => {
    if (Math.abs(q.sse - sseDirect(ids)) > 1e-9 || Math.abs(q.value - sumArr(ids.map((i) => y[i])) / ids.length) > 1e-12) okM = false;
    if (q.leaf) return;
    let L = ids.filter((i) => X[i][0] <= q.thr), R = ids.filter((i) => X[i][0] > q.thr);
    if (Math.abs(q.dec - (sseDirect(ids) - sseDirect(L) - sseDirect(R))) > 1e-9) okD = false;
    walk(q.left, L); walk(q.right, R);
  };
  walk(t, X.map((_, i) => i));
  check('どの分割でも、記録した SSE の減り = SSE(親) − SSE(左) − SSE(右)（点から計算し直した値）', okD);
  check('どのノードの値も、そこに入った点の平均。SSE も一致', okM);
  let xs = X.map((x) => x[0]).sort((a, b) => a - b), best = -1, all = X.map((_, i) => i);
  for (let k = 0; k + 1 < xs.length; k++) { let th = (xs[k] + xs[k + 1]) / 2; best = Math.max(best, sseDirect(all) - sseDirect(all.filter((i) => X[i][0] <= th)) - sseDirect(all.filter((i) => X[i][0] > th))); }
  check('根の分割の減り = 全部の中点を総当たりした最大', near(t.dec, best, 1e-9));
  let full = growReg(X, y);
  check('最後まで育てる（葉に 1 点）と訓練の SSE = 0（x がぜんぶちがうとき）', near(sumArr(X.map((x, i) => (regPredict(full, x) - y[i]) ** 2)), 0, 1e-12));
  let prev = Infinity, okN = true, okP = true;
  for (let d = 0; d <= 8; d++) {
    let e = sumArr(X.map((x, i) => (regPredict(full, x, d) - y[i]) ** 2)); if (e > prev + 1e-9) okN = false; prev = e;
    let vals = new Set(); for (let q = 0; q <= 1000; q++) vals.add(regPredict(full, [q / 1000], d)); if (vals.size > Math.pow(2, d)) okP = false;
  }
  check('深さを増やすと訓練の SSE は増えない（深さ 0〜8）', okN);
  check('深さ d の回帰木は、たかだか 2^d 段の階段', okP);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. ↑↓ で深さを 0 から 10 まで。深さ 0 は「全部の平均」の横一直線
// 2. ← → で葉の最小の点の数を 1 と 15 にして比べよう。どちらがノイズをなぞる？
// 3. 右の一覧で、最初の分割（深さ 0）の SSE の減りがいちばん大きい？ いつもそう？
// 4. hidden1 を別の関数（たとえば x * x）に変えてみよう。段差のある関数とない関数、どちらが得意？
// 5. 11 の勾配ブースティングは、この小さな回帰木を「残差」にあてはめて足していく

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
