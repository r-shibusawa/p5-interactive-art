// ============================================
// 02 手で木を作る ─ マウスで縦・横の線を引いて平面を分け、自分の「決定木」を作る
// 1 本の線 = 1 つの質問「x₁ ≤ ○？」（縦）か「x₂ ≤ ○？」（横）。線はクリックした長方形の中だけに引かれる（= その葉を 2 つに分ける）
//   各長方形の色 = 多数決のクラス、数字 = 件数 [A|B] とジニ。下の表示：訓練の正解率と、ジニの重みつき合計（小さいほどよい）
//   A を押すと、同じ葉の数で CART（毎回いちばんジニが減る葉を割る）が引く線を破線で重ねる。勝てるかな？
// クリック 線を引く / V 縦 ⇔ 横 / Z 1 本戻す / C 全部消す / A CART を重ねる / 1〜6 データの形 / R 新しいデータ
// ============================================

let kind = 4, nPts = 120, flipP = 0.04, seedD = 2;   // ★ kind = データの形（4 = 箱）
let data, userRoot, undoStack = [], vertical = true, showCart = false, cartRoot = null, plotBox, uid = 0;

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); selfTest(); newData(); }
function newData() { data = makeData2D(kind, nPts, flipP, seedD); clearAll(); }
function clearAll() { uid = 0; userRoot = makeLeaf(data, data.X.map((_, i) => i), { u0: 0, u1: 1, v0: 0, v1: 1 }, 0); undoStack = []; updateCart(); }
function makeLeaf(D, idx, box, depth) { let counts = [0, 0]; for (let i of idx) counts[D.y[i]]++; return { leaf: true, idx, box, depth, id: uid++, counts, n: idx.length, imp: giniOf(counts), pred: argMaxArr(counts) }; }
// ★ 葉 t を、特徴量 f のしきい値 th で 2 つに分ける（左 = th 以下）
function splitLeaf(D, t, f, th) {
  let L = t.idx.filter((i) => D.X[i][f] <= th), R = t.idx.filter((i) => D.X[i][f] > th), b = t.box;
  t.leaf = false; t.feat = f; t.thr = th;
  t.left = makeLeaf(D, L, f === 0 ? { u0: b.u0, u1: th, v0: b.v0, v1: b.v1 } : { u0: b.u0, u1: b.u1, v0: b.v0, v1: th }, t.depth + 1);
  t.right = makeLeaf(D, R, f === 0 ? { u0: th, u1: b.u1, v0: b.v0, v1: b.v1 } : { u0: b.u0, u1: b.u1, v0: th, v1: b.v1 }, t.depth + 1);
}
function leavesOf(t) { return t.leaf ? [t] : leavesOf(t.left).concat(leavesOf(t.right)); }
function findLeaf(t, u, v) { while (!t.leaf) t = (t.feat === 0 ? u : v) <= t.thr ? t.left : t.right; return t; }
function weightedGini(t) { let L = leavesOf(t), N = sumArr(L.map((l) => l.n)) || 1; return sumArr(L.map((l) => (l.n / N) * l.imp)); }
function handAcc(t, D) { return accuracyOf((x) => findLeaf(t, x[0], x[1]).pred, D.X, D.y); }
// ★ CART の「よいほうから」：葉の数が k になるまで、ジニがいちばん減る葉を割る
function cartBestFirst(D, k) {
  let r = makeLeaf(D, D.X.map((_, i) => i), { u0: 0, u1: 1, v0: 0, v1: 1 }, 0);
  while (leavesOf(r).length < k) {
    let best = null;
    for (let l of leavesOf(r)) { let s = growTree(D.X, D.y, { maxDepth: 1, idx: l.idx, nClass: 2 }); if (!s.leaf && (!best || s.dec > best.s.dec + 1e-12)) best = { l, s }; }
    if (!best) break;
    splitLeaf(D, best.l, best.s.feat, best.s.thr);
  }
  return r;
}
function updateCart() { cartRoot = cartBestFirst(data, leavesOf(userRoot).length); }

function draw() {
  background(...BG_COL);
  let side = Math.min(height - 200, width * 0.5);
  plotBox = { x: 40, y: 100, w: side, h: side };
  // 葉ごとの長方形
  for (let l of leavesOf(userRoot)) {
    let a = toPx(plotBox, l.box.u0, l.box.v1), b = toPx(plotBox, l.box.u1, l.box.v0), c = l.n ? mixCol(l.counts, 0.2 + 0.45 * (1 - 2 * l.imp)) : BG_COL;
    noStroke(); fill(...c); rect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
    if (b[0] - a[0] > 70 && b[1] - a[1] > 34) { fill(255, 255, 255, 200); textSize(12); textAlign(CENTER, CENTER); text('[' + l.counts.join('|') + '] ' + fmtNum(l.imp, 2), (a[0] + b[0]) / 2, a[1] + 14); }
  }
  // 自分の線、CART の線（破線）
  drawLines(userRoot, color(255, 240, 150), 3);
  if (showCart) { drawingContext.setLineDash([8, 6]); drawLines(cartRoot, color(255, 255, 255, 200), 2); drawingContext.setLineDash([]); }
  drawPoints(plotBox, data.X, data.y, 9);
  noFill(); stroke(90, 120, 100); strokeWeight(1); rect(plotBox.x, plotBox.y, side, side);
  // マウスの位置に予告の線
  let [u, v] = fromPx(plotBox, mouseX, mouseY);
  if (u > 0 && u < 1 && v > 0 && v < 1) {
    let l = findLeaf(userRoot, u, v), a = toPx(plotBox, l.box.u0, l.box.v0), b = toPx(plotBox, l.box.u1, l.box.v1);
    stroke(255, 255, 255, 120); strokeWeight(1.5);
    if (vertical) line(mouseX, a[1], mouseX, b[1]); else line(a[0], mouseY, b[0], mouseY);
  }
  // ---- 文字
  let px = plotBox.x + side + 50, pw = width - px - 40, L = leavesOf(userRoot), wg = weightedGini(userRoot), acc = handAcc(userRoot, data);
  textAlign(LEFT, BASELINE); noStroke(); fill(240); textSize(20);
  text('手で木を作る　データ：' + SHAPES[kind] + '　線の向き：' + (vertical ? '縦（x₁ ≤ ○？）' : '横（x₂ ≤ ○？）'), 40, 40);
  fill(170); textSize(15); text('クリック 線を引く　V 縦 ⇔ 横　Z 戻す　C 全部消す　A CART を重ねる' + (showCart ? '（ON）' : '') + '　1〜6 データの形　R 新しいデータ', 40, 66);
  fill(35, 52, 44); rect(px, 100, pw, 190, 12);
  fill(255, 240, 150); textSize(22); text('あなたの木：葉 ' + L.length + ' 枚', px + 20, 136);
  fill(230); textSize(17);
  text('訓練の正解率 ' + fmtNum(acc * 100, 1) + '%', px + 20, 170);
  text('ジニの重みつき合計 Σ (n_葉 / N)·ジニ = ' + fmtNum(wg, 4), px + 20, 198);
  let cAcc = handAcc(cartRoot, data), cg = weightedGini(cartRoot);
  fill(200); text('CART（同じ葉の数）：正解率 ' + fmtNum(cAcc * 100, 1) + '%、ジニ ' + fmtNum(cg, 4) + (wg <= cg + 1e-12 ? '　→ あなたの勝ち（か引き分け）！' : ''), px + 20, 230, pw - 30);
  // 自分の木を文字で（深さ 4 まで）
  fill(200); textSize(14); let lines = []; listTree(userRoot, '', lines);
  lines.slice(0, 15).forEach((s, k) => text(s, px + 10, 320 + k * 20));
  if (lines.length > 15) text('…', px + 10, 320 + 15 * 20);
  fill(160); text('葉を割ると、ジニの合計は必ず減るか同じ（増えない）。でも葉を増やしすぎると、ノイズの点 1 個のための長方形ができる（05）', px, height - 60, pw);
  drawSelfTest(width - 170, height - 12);
}
function drawLines(t, c, w) {
  if (t.leaf) return;
  let b = t.box; stroke(c); strokeWeight(w);
  if (t.feat === 0) { let p = toPx(plotBox, t.thr, b.v0), q = toPx(plotBox, t.thr, b.v1); line(p[0], p[1], q[0], q[1]); }
  else { let p = toPx(plotBox, b.u0, t.thr), q = toPx(plotBox, b.u1, t.thr); line(p[0], p[1], q[0], q[1]); }
  drawLines(t.left, c, w); drawLines(t.right, c, w);
}
function listTree(t, ind, out) {
  if (t.leaf) { out.push(ind + '→ ' + (t.pred ? 'B' : 'A') + '  [' + t.counts.join('|') + ']'); return; }
  out.push(ind + 'x' + (t.feat + 1) + ' ≤ ' + fmtNum(t.thr, 2) + ' ?'); listTree(t.left, ind + '　', out); listTree(t.right, ind + '　', out);
}
function mousePressed() {
  if (!plotBox) return;
  let [u, v] = fromPx(plotBox, mouseX, mouseY);
  if (u <= 0 || u >= 1 || v <= 0 || v >= 1) return;
  let l = findLeaf(userRoot, u, v);
  splitLeaf(data, l, vertical ? 0 : 1, vertical ? u : v); undoStack.push(l); updateCart();
}
function keyPressed() {
  if (key === 'v' || key === 'V') vertical = !vertical;
  if ((key === 'z' || key === 'Z') && undoStack.length) { let l = undoStack.pop(); l.leaf = true; delete l.left; delete l.right; updateCart(); }
  if (key === 'c' || key === 'C') clearAll();
  if (key === 'a' || key === 'A') showCart = !showCart;
  for (let k = 1; k <= 6; k++) if (key === String(k)) { kind = k - 1; newData(); }
  if (key === 'r' || key === 'R') { seedD++; newData(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let D = makeData2D(4, 120, 0.04, 77), r = makeLeaf(D, D.X.map((_, i) => i), { u0: 0, u1: 1, v0: 0, v1: 1 }, 0), okC = true, okM = true, prevG = weightedGini(r);
  seedRng(9);
  for (let k = 0; k < 12; k++) {                // ランダムに 12 回割る
    let L = leavesOf(r), l = L[Math.floor(rnd() * L.length)], f = rnd() < 0.5 ? 0 : 1, b = l.box, th = f === 0 ? b.u0 + rnd() * (b.u1 - b.u0) : b.v0 + rnd() * (b.v1 - b.v0);
    splitLeaf(D, l, f, th);
    if (l.left.n + l.right.n !== l.n || l.left.counts[1] + l.right.counts[1] !== l.counts[1]) okC = false;
    let g = weightedGini(r); if (g > prevG + 1e-12) okM = false; prevG = g;
  }
  check('割った 2 つの葉の件数の合計 = もとの葉の件数（12 回）', okC);
  check('葉を割るたびに、ジニの重みつき合計は増えない', okM);
  let byLeaf = sumArr(leavesOf(r).map((l) => l.counts[l.pred])) / D.X.length;
  check('正解率 = 葉ごとの多数決の個数の合計 / N（1 点ずつ数えた値と一致）', near(byLeaf, handAcc(r, D)));
  let c2 = cartBestFirst(D, 2), bestHand = Infinity;
  for (let t = 0; t < 400; t++) { let q = makeLeaf(D, D.X.map((_, i) => i), { u0: 0, u1: 1, v0: 0, v1: 1 }, 0); splitLeaf(D, q, t % 2, rnd()); bestHand = Math.min(bestHand, weightedGini(q)); }
  check('CART の 1 本目のジニ ' + fmtNum(weightedGini(c2), 4) + ' ≤ ランダムな 400 本のどれよりも小さいか同じ', weightedGini(c2) <= bestHand + 1e-12);
  let xs = D.X.map((x) => x[0]).sort((a, b) => a - b), a = makeLeaf(D, D.X.map((_, i) => i), { u0: 0, u1: 1, v0: 0, v1: 1 }, 0), b2 = makeLeaf(D, D.X.map((_, i) => i), { u0: 0, u1: 1, v0: 0, v1: 1 }, 0);
  splitLeaf(D, a, 0, xs[50] + 0.1 * (xs[51] - xs[50])); splitLeaf(D, b2, 0, (xs[50] + xs[51]) / 2);
  check('となりの 2 点の間なら、どこで切っても中点で切っても同じ分け方', a.left.n === b2.left.n && near(weightedGini(a), weightedGini(b2)));
  check('CART を葉 8 枚まで育てると、訓練の正解率 ≥ 1 枚（全部を多数決）のとき', handAcc(cartBestFirst(D, 8), D) >= handAcc(cartBestFirst(D, 1), D));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 5（箱）のデータで、線 4 本以内に正解率 95% 以上をめざそう
// 2. A で CART の線を重ねる。CART は「いま、いちばんジニが減る線」を選ぶだけ。先を読むと勝てることもある？
// 3. 2（斜め）を手で分けると、線は何本くらい要る？ 斜めの線が引ければ 1 本なのに…（13）
// 4. ノイズの点 1 個を囲むように線を引くと、正解率は上がる。でも新しいデータでは？（05）
// 5. 右の木の表示（x1 ≤ … ?）は、そのまま if 文になる。自分の木を if 文で書いてみよう

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
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) ? v.every(noNaN) : !(typeof v === 'number' && v !== v); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(120, 210, 150) : color(255, 90, 90)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
