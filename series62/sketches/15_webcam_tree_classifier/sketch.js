// ============================================
// 15 カメラで色の分類器 ─ 映像の上をクリックして「A の色」「B の色」を教えると、決定木が全部の画素を塗り分ける
// 1 回のクリック = 訓練データ 1 個（その画素の R, G, B と、F なら位置 x, y も）。CART で学習 → 160 × 120 の全画素をたどって分類
//   木の図で「R ≤ 0.52？」のような質問が見える。深さ（↑↓）を上げると細かい色の差まで分ける
//   テスト画像のときは見本のクリックが入っている（C で消せる。カメラが映ると自動で消える）。カメラがなければテスト画像で動く
// 1 / 2 クリックで集めるクラス（A / B）/ クリック・ドラッグ 色を集める / ↑↓ 深さ / F 位置も使う / C 消す / V カメラ ⇔ テスト画像 / S 保存
// ============================================

const CW = 160, CH = 120;              // カメラの大きさ
let maxDepth = 4, useXY = false, curClass = 0, useCam = true;   // ★ maxDepth = 木の深さの上限
let camSeen = false;
let cap, testPix, srcImg, outImg, samples = [], treeRoot = null, dirty = true, vidBox, outBox, counts = [0, 0], lastAdd = 0;
const FEAT_NAMES = ['R', 'G', 'B', '横 x', '縦 y'];

function setup() {
  createCanvas(windowWidth, windowHeight); textWrap(CHAR); pixelDensity(1);
  cap = createCapture(VIDEO, { flipped: true }); cap.size(CW, CH); cap.hide();
  srcImg = createImage(CW, CH); outImg = createImage(CW, CH); testPix = makeTestImage();
  selfTest(); seedSamples();
}
function featOf(px, i, xy) { let f = [px[4 * i] / 255, px[4 * i + 1] / 255, px[4 * i + 2] / 255]; if (xy) f.push((i % CW) / CW, Math.floor(i / CW) / CH); return f; }
// ★ 集めた点から木を学習（1 クラスしかなければ「葉 1 枚」の木）
function retrain() {
  if (!samples.length) { treeRoot = null; return; }
  let X = samples.map((s) => (useXY ? s.f.concat([s.x, s.y]) : s.f)), y = samples.map((s) => s.c);
  treeRoot = growTree(X, y, { maxDepth, nClass: 2 });
}
function addSample(px, i, c, isSeed) { samples.push({ f: featOf(px, i, false), x: (i % CW) / CW, y: Math.floor(i / CW) / CH, c, seed: !!isSeed }); dirty = true; }
function seedSamples() {                // テスト画像の上の見本：A = 赤い円、B = 背景と緑
  samples = [];
  for (let k = 0; k < 8; k++) { let a = (k / 8) * Math.PI * 2; addSample(testPix, Math.round(50 + 10 * Math.cos(a)) + CW * Math.round(60 + 10 * Math.sin(a)), 0, true); }
  for (let [x, y] of [[10, 10], [150, 10], [100, 100], [130, 30], [120, 80], [20, 110], [90, 20], [140, 60]]) addSample(testPix, x + CW * y, 1, true);
}
function currentPixels() {
  let live = useCam && cap && cap.width > 0 && cap.elt.readyState >= 2 && cap.elt.videoWidth > 0;
  if (live) { cap.loadPixels(); if (cap.pixels.length >= CW * CH * 4) return { px: cap.pixels, live: true }; }
  return { px: testPix, live: false };
}
// ★ 全画素を木でたどって分類（counts = A と B の画素の数）
function classifyAll(px, root, xy, out) {
  let c = [0, 0];
  for (let i = 0; i < CW * CH; i++) { let k = root ? treePredict(root, featOf(px, i, xy)) : -1; if (out) out[i] = k; if (k >= 0) c[k]++; }
  return c;
}

function draw() {
  background(...BG_COL);
  if (dirty) { retrain(); dirty = false; }
  let { px, live } = currentPixels(), labels = new Int8Array(CW * CH);
  if (live && !camSeen) { camSeen = true; samples = samples.filter((q) => !q.seed); dirty = true; retrain(); dirty = false; }   // カメラが映ったら、テスト画像の見本は消す
  counts = classifyAll(px, treeRoot, useXY, labels);
  srcImg.loadPixels(); outImg.loadPixels();
  for (let i = 0; i < CW * CH; i++) {
    for (let q = 0; q < 3; q++) srcImg.pixels[4 * i + q] = px[4 * i + q];
    srcImg.pixels[4 * i + 3] = 255;
    let k = labels[i], g = (px[4 * i] + px[4 * i + 1] + px[4 * i + 2]) / 3;
    let col = k < 0 ? [g, g, g] : [CLS_COL[k][0] * 0.65 + g * 0.35, CLS_COL[k][1] * 0.65 + g * 0.35, CLS_COL[k][2] * 0.65 + g * 0.35];
    outImg.pixels[4 * i] = col[0]; outImg.pixels[4 * i + 1] = col[1]; outImg.pixels[4 * i + 2] = col[2]; outImg.pixels[4 * i + 3] = 255;
  }
  srcImg.updatePixels(); outImg.updatePixels();
  let s = Math.min((width - 140) / (2 * CW), (height - 380) / CH);
  vidBox = { x: 40, y: 100, w: CW * s, h: CH * s }; outBox = { x: 80 + CW * s, y: 100, w: CW * s, h: CH * s };
  image(srcImg, vidBox.x, vidBox.y, vidBox.w, vidBox.h);
  noSmooth(); image(outImg, outBox.x, outBox.y, outBox.w, outBox.h); smooth();
  // 集めた点
  for (let sm of samples) { stroke(255); strokeWeight(1.5); fill(...CLS_COL[sm.c]); circle(vidBox.x + sm.x * vidBox.w, vidBox.y + sm.y * vidBox.h, 10); }
  // ---- 木の図
  let tb = { x: 40, y: vidBox.y + vidBox.h + 50, w: width - 80, h: height - vidBox.y - vidBox.h - 90 };
  if (treeRoot) drawTree(treeRoot, tb, { text: (t, leaf) => [leaf ? (t.pred ? 'B' : 'A') + ' [' + t.counts.join('|') + ']' : FEAT_NAMES[t.feat] + ' ≤ ' + fmtNum(t.thr, 2), leaf ? '' : 'n=' + t.n] });
  // ---- 文字
  textAlign(LEFT, BASELINE); noStroke(); fill(240); textSize(20);
  text('カメラで色の分類器　' + (live ? 'カメラ' : 'テスト画像') + '　いま集めるクラス：' + (curClass ? 'B（青）' : 'A（オレンジ）') + '　深さの上限 ' + maxDepth + (useXY ? '　特徴量 R, G, B, x, y' : '　特徴量 R, G, B'), 40, 40);
  fill(170); textSize(15); text('1 / 2 クラス A / B　クリック・ドラッグ 色を集める　↑↓ 深さ　F 位置も使う　C 消す　V カメラ ⇔ テスト画像　S 保存', 40, 66);
  fill(220); textSize(15);
  let nA = samples.filter((q) => q.c === 0).length;
  text('訓練データ：A ' + nA + ' 個、B ' + (samples.length - nA) + ' 個' + (treeRoot ? '　→ 木の葉 ' + countLeaves(treeRoot) + ' 枚、画素 A ' + counts[0] + ' / B ' + counts[1] : '　→ まだ学習できない（クリックして集めよう）'), 40, vidBox.y + vidBox.h + 28);
  drawSelfTest(width - 170, height - 12);
}
function sampleAtMouse() {
  for (let b of [vidBox, outBox]) {
    if (!b) continue;
    let u = (mouseX - b.x) / b.w, v = (mouseY - b.y) / b.h;
    if (u >= 0 && u < 1 && v >= 0 && v < 1) { let i = Math.floor(u * CW) + CW * Math.floor(v * CH); addSample(currentPixels().px, i, curClass); return; }
  }
}
function mousePressed() { sampleAtMouse(); lastAdd = millis(); }
function mouseDragged() { if (millis() - lastAdd > 80 && samples.length < 400) { sampleAtMouse(); lastAdd = millis(); } }
function keyPressed() {
  if (key === '1') curClass = 0;
  if (key === '2') curClass = 1;
  if (key === UP_ARROW) { maxDepth = Math.min(10, maxDepth + 1); dirty = true; }
  if (key === DOWN_ARROW) { maxDepth = Math.max(1, maxDepth - 1); dirty = true; }
  if (key === 'f' || key === 'F') { useXY = !useXY; dirty = true; }
  if (key === 'c' || key === 'C') { samples = []; dirty = true; }
  if (key === 'v' || key === 'V') { useCam = !useCam; camSeen = false; if (!useCam && !samples.length) seedSamples(); }
  if (key === 's' || key === 'S') saveCanvas('tree_classifier', 'png');
  return false;
}
function makeTestImage() {             // カメラがないときのテスト画像（青い背景、赤い円、緑の箱、黄色の線）
  let p = new Uint8ClampedArray(CW * CH * 4);
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    let c = [40 + 0.4 * x, 70 + 0.3 * y, 140 + 0.3 * x];
    if ((x - 50) ** 2 + (y - 60) ** 2 < 22 ** 2) c = [215 - 0.6 * Math.abs(y - 60), 70, 55];
    if (x > 95 && x < 140 && y > 60 && y < 95) c = [70, 170, 80];
    if (Math.abs(y - 0.3 * x - 15) < 2 && x > 90) c = [235, 210, 60];
    let i = 4 * (x + CW * y); p[i] = c[0]; p[i + 1] = c[1]; p[i + 2] = c[2]; p[i + 3] = 255;
  }
  return p;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let tp = makeTestImage(), X = [], y = [];
  for (let k = 0; k < 10; k++) { X.push([0.8 + 0.01 * k, 0.2, 0.2]); y.push(0); X.push([0.2, 0.3 + 0.01 * k, 0.8]); y.push(1); }
  let t1 = growTree(X, y, { maxDepth: 1 });
  check('赤 と 青 の見本 20 個：深さ 1 の木で 100%、新しい赤 (0.9, 0.1, 0.1) → A、青 (0.1, 0.2, 0.9) → B', accuracyOf((x) => treePredict(t1, x), X, y) === 1 && treePredict(t1, [0.9, 0.1, 0.1]) === 0 && treePredict(t1, [0.1, 0.2, 0.9]) === 1);
  seedRng(15); let Xr = [], yr = [];
  for (let k = 0; k < 60; k++) { Xr.push([rnd(), rnd(), rnd()]); yr.push(rnd() < 0.5 ? 1 : 0); }
  let full = growTree(Xr, yr), d3 = growTree(Xr, yr, { maxDepth: 3 });
  check('ばらばらな色 60 個でも、最後まで育てると訓練 100%。深さの上限 3 なら木の深さ ≤ 3', accuracyOf((x) => treePredict(full, x), Xr, yr) === 1 && treeDepth(d3) <= 3);
  check('見本が 0 個なら分類しない（全部 −1、NaN もエラーもなし）', sumArr(classifyAll(tp, null, false)) === 0);
  let one = growTree([[0.5, 0.5, 0.5], [0.4, 0.4, 0.4]], [1, 1], { nClass: 2 }), c1 = classifyAll(tp, one, false);
  check('1 クラスしかない見本 → 葉 1 枚の木、全画素がそのクラス', one.leaf && c1[1] === CW * CH);
  let Xp = [[0.5, 0.5, 0.5, 0.1, 0.5], [0.5, 0.5, 0.5, 0.2, 0.5], [0.5, 0.5, 0.5, 0.8, 0.5], [0.5, 0.5, 0.5, 0.9, 0.5]], tpos = growTree(Xp, [0, 0, 1, 1]);
  check('色が同じでも、位置（横 x）を使えば左右で分けられる', tpos.feat === 3 && treePredict(tpos, [0.5, 0.5, 0.5, 0.05, 0.3]) === 0 && treePredict(tpos, [0.5, 0.5, 0.5, 0.95, 0.3]) === 1);
  let sv = samples; seedSamples(); retrain(); let ca = classifyAll(tp, treeRoot, false);
  check('テスト画像：見本の木で 160 × 120 の全画素を分類（A + B = 19200）、赤い円の中心は A', ca[0] + ca[1] === CW * CH && treePredict(treeRoot, featOf(tp, 50 + CW * 60, false)) === 0);
  samples = sv;
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 2 を押して自分の服の色を B に、1 を押して肌や背景を A に。何回クリックするとうまく分かれる？
// 2. ↑↓ で深さを 1 と 8 にして、塗り分けのちがいを見よう。深さ 1 は「R ≤ ○？」1 回だけ
// 3. F で位置も使うと、同じ色でも場所で分けられる。でもカメラを動かすと？
// 4. 明るさが変わると（電気を消すなど）分類はどうなる？ 色の特徴量の弱点
// 5. 木の図の質問を読んで、「この木は何を見て A と言っているか」を説明しよう。S で保存

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
