// ============================================
// 04 CART と領域分割 ─ 「x₁ ≤ しきい値？」の質問をくり返して、平面を軸に平行な長方形に分ける
// CART：全部の特徴量 × 全部のしきい値（並べた値のとなりどうしの中点）を調べ、ジニ不純度がいちばん減る分割を選ぶ → 左右でくり返す
//   左 = 領域（色 = その長方形の多数決のクラス、うすい = 不純）、右 = 木の図（しきい値・件数 [A|B]・ジニ）
//   深さを 1 ずつ増やすと、長方形が 2 つに割れていく。木は深さ d まで育てたものの「途中まで」を見せている
// 1〜6 データの形 / ← → 深さ / スペース 自動で深くする / クリック 点を足す（Shift + クリックで B）/ R 新しいデータ
// ============================================

let kind = 2, nPts = 160, seedD = 4;   // ★ kind = データの形（0〜5）、nPts = 点の数
let data, treeRoot, dShow = 1, auto = false, autoT = 0, regionImg, dirty = true, plotBox;

function setup() {
  createCanvas(windowWidth, windowHeight); textWrap(CHAR); pixelDensity(1);
  regionImg = createImage(150, 150); selfTest(); newData();
}
function newData() { data = makeData2D(kind, nPts, 0.03, seedD); retrain(); }
function retrain() { treeRoot = growTree(data.X, data.y, { crit: 'gini' }); dShow = Math.min(dShow, treeDepth(treeRoot)); dirty = true; }

function draw() {
  background(...BG_COL);
  let side = Math.min(height - 230, width * 0.42);
  plotBox = { x: 40, y: 110, w: side, h: side };
  let maxD = treeDepth(treeRoot);
  if (auto && millis() - autoT > 900) { autoT = millis(); dShow = dShow >= maxD ? 0 : dShow + 1; dirty = true; }
  if (dirty) { paintImage(regionImg, (u, v) => { let t = leafOf(treeRoot, [u, v], dShow); return mixCol(t.counts, 0.25 + 0.4 * (1 - 2 * t.imp)); }); dirty = false; }
  noSmooth(); image(regionImg, plotBox.x, plotBox.y, plotBox.w, plotBox.h); smooth();
  // 分割の線（見えている内側のノードだけ）：そのノードの長方形の中だけに引く
  drawSplitLines(treeRoot, 0, 1, 0, 1);
  drawPoints(plotBox, data.X, data.y, 8);
  noFill(); stroke(90, 120, 100); rect(plotBox.x, plotBox.y, plotBox.w, plotBox.h);
  // ---- 木の図
  let tb = { x: plotBox.x + side + 40, y: 120, w: width - side - 120, h: height - 320 };
  let info = drawTree(treeRoot, tb, { dLim: dShow, text: (t, leaf) => [leaf ? 'n=' + t.n + ' [' + t.counts.join('|') + ']' : 'x' + (t.feat + 1) + ' ≤ ' + fmtNum(t.thr, 3), leaf ? 'ジニ ' + fmtNum(t.imp, 3) : 'n=' + t.n + ' ジニ ' + fmtNum(t.imp, 2)] });
  // ---- 文字
  let acc = accuracyOf((x) => treePredict(treeRoot, x, dShow), data.X, data.y);
  textAlign(LEFT, BASELINE); noStroke(); fill(240); textSize(20);
  text('CART と領域分割　データ：' + SHAPES[kind] + '　深さ ' + dShow + ' / ' + maxD + '　葉 ' + info.leaves + '　訓練の正解率 ' + fmtNum(acc * 100, 1) + '%', 40, 40);
  fill(170); textSize(15); text('1〜6 データの形　← → 深さ　スペース 自動' + (auto ? '（いま ON）' : '') + '　クリック 点を足す（Shift で B）　R 新しいデータ', 40, 66);
  fill(200); textSize(14);
  text('右の木：内側のノード = 「x の何番 ≤ しきい値？」（はい = 左、いいえ = 右）、2 行目 = 件数とジニ不純度。葉 = [A|B] の件数と、そのジニ', tb.x, tb.y + tb.h + 30, tb.w);
  text('しきい値は「並べた値のとなりどうしの中点」だけを調べれば十分（その間ならどこで切っても同じ分け方）。深さ ' + maxD + ' まで育てると訓練の点は全部当たる（05 で見るように、テストではそうはいかない）', tb.x, tb.y + tb.h + 72, tb.w);
  drawSelfTest(width - 170, height - 12);
}
function drawSplitLines(t, u0, u1, v0, v1) {
  if (isCut(t, dShow)) return;
  let a = toPx(plotBox, u0, v0), b = toPx(plotBox, u1, v1), w = 3 - Math.min(2, t.depth * 0.5);
  stroke(255, 240, 150, 230 - t.depth * 25); strokeWeight(w);
  if (t.feat === 0) { let x = toPx(plotBox, t.thr, 0)[0]; line(x, a[1], x, b[1]); drawSplitLines(t.left, u0, t.thr, v0, v1); drawSplitLines(t.right, t.thr, u1, v0, v1); }
  else { let yy = toPx(plotBox, 0, t.thr)[1]; line(a[0], yy, b[0], yy); drawSplitLines(t.left, u0, u1, v0, t.thr); drawSplitLines(t.right, u0, u1, t.thr, v1); }
}
function mousePressed() {
  if (!plotBox) return;
  let [u, v] = fromPx(plotBox, mouseX, mouseY);
  if (u < 0 || u > 1 || v < 0 || v > 1) return;
  data.X.push([u, v]); data.y.push(keyIsDown(SHIFT) ? 1 : 0); retrain();
}
function keyPressed() {
  for (let k = 1; k <= 6; k++) if (key === String(k)) { kind = k - 1; newData(); }
  if (key === RIGHT_ARROW) { dShow = Math.min(treeDepth(treeRoot), dShow + 1); dirty = true; }
  if (key === LEFT_ARROW) { dShow = Math.max(0, dShow - 1); dirty = true; }
  if (key === ' ') { auto = !auto; autoT = millis(); }
  if (key === 'r' || key === 'R') { seedD++; newData(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let okB = true, okF = true, okT = true, okC = true, okI = true;
  for (let s = 1; s <= 12; s++) {
    let D = makeData2D(s % 6, 60, 0.1, 100 + s), root = growTree(D.X, D.y, { maxDepth: 1 }), best = -1;
    for (let f = 0; f < 2; f++) {                  // 総当たり：全部の中点で左右を数え直す
      let vals = [...new Set(D.X.map((x) => x[f]))].sort((a, b) => a - b);
      for (let k = 0; k + 1 < vals.length; k++) {
        let th = (vals[k] + vals[k + 1]) / 2, L = [0, 0], R = [0, 0];
        D.X.forEach((x, i) => (x[f] <= th ? L : R)[D.y[i]]++);
        best = Math.max(best, gainOf([L[0] + R[0], L[1] + R[1]], L, R, 'gini'));
      }
    }
    if (Math.abs(root.dec / 60 - best) > 1e-9) okB = false;
    let full = growTree(D.X, D.y);
    if (accuracyOf((x) => treePredict(full, x), D.X, D.y) !== 1) okF = false;
    for (let d = 1; d <= 4; d++) { let td = growTree(D.X, D.y, { maxDepth: d }); if (!D.X.every((x) => treePredict(td, x) === treePredict(full, x, d))) okT = false; }
    for (let t of treeNodes(full)) {
      if (t.leaf) continue;
      if (t.left.counts[0] + t.right.counts[0] !== t.counts[0] || t.left.n + t.right.n !== t.n) okC = false;
      let g = gainOf(t.counts, t.left.counts, t.right.counts, 'gini');
      if (g < -1e-12 || Math.abs(g * t.n - t.dec) > 1e-9) okI = false;
    }
  }
  check('根の分割 = 全部の中点を総当たりして数え直した最良の分割（12 データ）', okB);
  check('最後まで育てた木は訓練の点を 100% 当てる（同じ場所に別のクラスの点がないとき）', okF);
  check('深さ d で止めた木 = 育てた木を深さ d で切ったもの（d = 1〜4）', okT);
  check('子の件数の合計 = 親の件数', okC);
  check('どの分割でもジニの減り ≥ 0、記録した減り = 親 − 子の重みつき平均', okI);
  check('ジニ：純粋なら 0、[5|5] なら 0.5', giniOf([7, 0]) === 0 && near(giniOf([5, 5]), 0.5));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 3（円）で ← → を押し、深さ 1・2・3 で長方形がどう割れるか見よう。円をかこむには何回の質問が必要？
// 2. 2（斜め）にすると、斜めの境界が「階段」になる。点を増やす（nPts）と階段は細かくなる？（13）
// 3. 円の真ん中に Shift + クリックで B（青）の点を 1 つ足すと、木はどこまで深くなる？
// 4. crit を 'entropy' に変えると（retrain の中）、木の形は変わる？（01）
// 5. 4（XOR）の最初の分割は、なぜあまりよくない場所になる？（ジニがほとんど減らない）

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
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) ? v.every(noNaN) : !(typeof v === 'number' && v !== v); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(120, 210, 150) : color(255, 90, 90)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
