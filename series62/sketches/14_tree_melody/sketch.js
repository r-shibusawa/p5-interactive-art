// ============================================
// 14 木をたどる音 ─ 点をクリックすると、根から葉までの「質問の答え」がメロディになる
// 質問に「はい（≤、左）」なら音階を 1 つ下へ、「いいえ（>、右）」なら 1 つ上へ。葉に着いたら、そのクラスの和音
//   A（オレンジ）= 長三和音（明るい）、B（青）= 短三和音（くらい）、C（緑）= sus4（宙ぶらりん）
//   深い所にある葉ほどメロディが長い。境界の近くは質問が多い → 長いメロディになりやすい
// クリック 点をえらんで鳴らす / スペース ランダムな点 / ↑↓ 木の深さ / M 消音 / R 新しいデータ
// 音量は小さめから。ヘッドホンは特に注意（全体の音量 MASTER は 0.2 以下）
// ============================================

const SCALE = [0, 2, 4, 7, 9];        // ★ 音階（ペンタトニック：ド レ ミ ソ ラ）
const BASE_HZ = 261.63;               // ド（C4）
const NOTE_SEC = 0.2;                 // ★ 1 音の長さ（秒）
const CHORDS = [[0, 4, 7], [0, 3, 7], [0, 5, 7]];   // 長三和音・短三和音・sus4（半音の数）
let nPts = 150, maxDepth = 5, seedD = 14, muted = false;   // ★ maxDepth = 木の深さ
let data, treeRoot, regionImg, plotBox, probe = null, melody = null, playT0 = 0;

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); pixelDensity(1); regionImg = createImage(120, 120); selfTest(); newData(); }
// 3 クラスのデータ：中心のまわりを 3 つの扇形に分ける（少しノイズ）
function make3(n, seed) {
  seedRng(seed); let X = [], y = [];
  for (let i = 0; i < n; i++) {
    let u = 0.02 + 0.96 * rnd(), v = 0.02 + 0.96 * rnd(), a = Math.atan2(v - 0.45, u - 0.5) + Math.PI + 0.4 * Math.sin(6 * u);
    let c = Math.floor((a / (2 * Math.PI)) * 3 + 3) % 3; if (rnd() < 0.05) c = (c + 1) % 3;
    X.push([u, v]); y.push(c);
  }
  return { X, y };
}
function newData() { data = make3(nPts, seedD); retrain(); }
function retrain() { treeRoot = growTree(data.X, data.y, { maxDepth, nClass: 3 }); paintImage(regionImg, (u, v) => { let t = leafOf(treeRoot, [u, v]); return mixCol(t.counts, 0.3 + 0.3 * (1 - t.imp)); }); probe = null; melody = null; }
// ★ 根から葉まで：たどったノードと、はい（左）/いいえ（右）の列
function pathOf(root, x) { let nodes = [root], dirs = [], t = root; while (!t.leaf) { let left = x[t.feat] <= t.thr; dirs.push(left ? -1 : 1); t = left ? t.left : t.right; nodes.push(t); } return { nodes, dirs, leaf: t }; }
function degreeHz(d) { let o = Math.floor(d / SCALE.length), k = ((d % SCALE.length) + SCALE.length) % SCALE.length; return BASE_HZ * Math.pow(2, o + SCALE[k] / 12); }
// ★ メロディ：はじめは 5 番目の音（1 オクターブ上のド）。左なら −1、右なら +1。最後に葉のクラスの和音
function makeMelody(p) {
  let d = 5, notes = [degreeHz(d)];
  for (let s of p.dirs) { d += s; notes.push(degreeHz(d)); }
  let root = notes[notes.length - 1] / 2;
  return { notes, chord: CHORDS[p.leaf.pred].map((h) => root * Math.pow(2, h / 12)), cls: p.leaf.pred };
}
function playProbe(x) {
  probe = { x, p: pathOf(treeRoot, x) }; melody = makeMelody(probe.p); playT0 = millis();
  if (!audioCtx || muted) return;
  let t0 = audioCtx.currentTime + 0.05;
  melody.notes.forEach((f, k) => playNote(f, t0 + k * NOTE_SEC, NOTE_SEC * 0.95, 0.5));
  melody.chord.forEach((f) => playNote(f, t0 + melody.notes.length * NOTE_SEC, 1.2, 0.3, 'sine'));
}

function draw() {
  background(...BG_COL);
  let side = Math.min(height - 200, width * 0.4);
  plotBox = { x: 40, y: 100, w: side, h: side };
  noSmooth(); image(regionImg, plotBox.x, plotBox.y, side, side); smooth();
  drawPoints(plotBox, data.X, data.y, 7);
  noFill(); stroke(90, 120, 100); strokeWeight(1); rect(plotBox.x, plotBox.y, side, side);
  let stepN = melody ? Math.floor((millis() - playT0) / 1000 / NOTE_SEC) : -1, hl = new Set();
  if (probe) {
    probe.p.nodes.forEach((t, k) => { if (k <= stepN) hl.add(t.id); });
    let p = toPx(plotBox, probe.x[0], probe.x[1]); stroke(255, 240, 150); strokeWeight(3); noFill(); circle(p[0], p[1], 22 + 6 * Math.sin(millis() / 120));
  }
  // ---- 木の図（たどった所が光る）
  let tb = { x: plotBox.x + side + 40, y: 100, w: width - side - 120, h: height * 0.5 };
  drawTree(treeRoot, tb, { hl, text: (t, leaf) => [leaf ? ['A', 'B', 'C'][t.pred] + ' [' + t.counts.join('|') + ']' : 'x' + (t.feat + 1) + ' ≤ ' + fmtNum(t.thr, 2), leaf ? '' : 'n=' + t.n] });
  // ---- 楽譜（音の高さの階段）
  let sy = tb.y + tb.h + 50, sh = height - sy - 70;
  noStroke(); fill(205); textSize(14); textAlign(LEFT, BASELINE);
  text('メロディ（横 = 時間、縦 = 音の高さ。はい（左）↓、いいえ（右）↑、最後 = 和音）', tb.x, sy - 10);
  stroke(80, 100, 90); noFill(); rect(tb.x, sy, tb.w, sh);
  if (melody) {
    let N = melody.notes.length + 2, cw = tb.w / Math.max(8, N), lo = Math.log2(BASE_HZ / 2), hi = Math.log2(BASE_HZ * 8);
    let Y = (f) => sy + sh - ((Math.log2(f) - lo) / (hi - lo)) * sh;
    melody.notes.forEach((f, k) => { noStroke(); fill(k <= stepN ? color(255, 240, 150) : color(120, 140, 125)); rect(tb.x + k * cw + 3, Y(f) - 5, cw - 6, 10, 3); });
    let kx = melody.notes.length;
    melody.chord.forEach((f) => { noStroke(); fill(...CLS_COL[melody.cls], kx <= stepN ? 255 : 90); rect(tb.x + kx * cw + 3, Y(f) - 5, cw * 1.8, 10, 3); });
  }
  // ---- 文字
  textAlign(LEFT, BASELINE); noStroke(); fill(240); textSize(20);
  text('木をたどる音　深さの上限 ' + maxDepth + '（木の深さ ' + treeDepth(treeRoot) + '、葉 ' + countLeaves(treeRoot) + ' 枚）' + (muted ? '　消音中' : ''), 40, 40);
  fill(170); textSize(15); text('クリック 点をえらんで鳴らす　スペース ランダムな点　↑↓ 木の深さ　M 消音　R 新しいデータ', 40, 66);
  if (probe) { fill(225); textSize(15); text('質問 ' + probe.p.dirs.length + ' 回：' + probe.p.dirs.map((s) => (s < 0 ? 'はい' : 'いいえ')).join(' → ') + ' → 葉 ' + ['A（長三和音）', 'B（短三和音）', 'C（sus4）'][probe.p.leaf.pred], 40, plotBox.y + side + 30, side + 40); }
  else { fill(160); textSize(14); text('左の平面をクリックしてね（最初の 1 回で音が出るようになる）', 40, plotBox.y + side + 30); }
  drawSelfTest(width - 170, height - 12);
}
function mousePressed() {
  startAudio();
  if (!plotBox) return;
  let [u, v] = fromPx(plotBox, mouseX, mouseY);
  if (u >= 0 && u <= 1 && v >= 0 && v <= 1) playProbe([u, v]);
}
function keyPressed() {
  startAudio();
  if (key === ' ') playProbe([Math.random(), Math.random()]);
  if (key === UP_ARROW) { maxDepth = Math.min(10, maxDepth + 1); retrain(); }
  if (key === DOWN_ARROW) { maxDepth = Math.max(1, maxDepth - 1); retrain(); }
  if (key === 'm' || key === 'M') muted = !muted;
  if (key === 'r' || key === 'R') { seedD++; newData(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let D = make3(150, 41), T = growTree(D.X, D.y, { maxDepth: 5, nClass: 3 }), okP = true, okC = true, okN = true, okL = true;
  seedRng(2);
  for (let k = 0; k < 200; k++) {
    let x = [rnd(), rnd()], p = pathOf(T, x), m = makeMelody(p);
    if (p.leaf !== leafOf(T, x) || p.dirs.length !== p.leaf.depth || p.nodes.length !== p.leaf.depth + 1) okP = false;
    p.nodes.slice(0, -1).forEach((t, q) => { if ((x[t.feat] <= t.thr) !== (p.dirs[q] < 0)) okC = false; });
    if (m.notes.length !== p.dirs.length + 1 || !m.notes.concat(m.chord).every((f) => isFinite(f) && f > 60 && f < 3000)) okN = false;
    if (m.cls !== treePredict(T, x)) okL = false;
  }
  check('たどった道の長さ = 葉の深さ、道の最後 = その点の葉（200 点）', okP);
  check('道の「はい / いいえ」は、どのノードでも x ≤ しきい値 の答えと一致', okC);
  check('音の数 = 質問の数 + 1、どの周波数も 60〜3000 Hz で NaN なし', okN);
  check('最後の和音のクラス = 木の予測', okL);
  check('3 クラスでも最後まで育てると訓練 100%', accuracyOf((x) => treePredict(growTree(D.X, D.y, { nClass: 3 }), x), D.X, D.y) === 1);
  check('全体の音量 MASTER ≤ 0.2、音階の 5 音で 1 オクターブ上がる（ド → 次のド = 2 倍）', MASTER <= 0.2 && near(degreeHz(5) / degreeHz(0), 2, 1e-12));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 色の境界の近くと、真ん中の点をクリックして、メロディの長さを比べよう
// 2. ↓ で深さを 1 にすると、メロディは何音？ ↑ で深くすると？
// 3. SCALE を [0, 2, 4, 5, 7, 9, 11]（ドレミファソラシ）や [0, 3, 5, 7, 10] に変えてみよう
// 4. CHORDS を変えて、クラスごとの「最後の気分」を作ろう
// 5. 木の「はい/いいえ」の列は、葉ごとにちがう 2 進数の名前（00 の 20 の質問と同じ）

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
// ---- 音の道具（Web Audio）。音量の上限：全体の音量 MASTER は 0.2 以下
const MASTER = 0.12;                   // ★ 全体の音量（0.2 以下にしておく）
let audioCtx = null;
let masterOut = null;
function startAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    masterOut = audioCtx.createGain(); masterOut.gain.value = Math.min(0.2, MASTER); masterOut.connect(audioCtx.destination);
  }
  audioCtx.resume();
}
function playNote(freq, when, dur, vol, wave) {   // when = 鳴らす時刻（audioCtx.currentTime 基準）
  if (!audioCtx || !(freq > 20 && freq < 8000)) return;
  let o = audioCtx.createOscillator(), gn = audioCtx.createGain();
  o.type = wave || 'triangle'; o.frequency.value = freq;
  gn.gain.setValueAtTime(0.0001, when); gn.gain.exponentialRampToValueAtTime(Math.min(1, vol || 0.5), when + 0.02);
  gn.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  o.connect(gn); gn.connect(masterOut); o.start(when); o.stop(when + dur + 0.05);
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) ? v.every(noNaN) : !(typeof v === 'number' && v !== v); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(120, 210, 150) : color(255, 90, 90)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
