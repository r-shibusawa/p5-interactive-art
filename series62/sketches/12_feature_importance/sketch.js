// ============================================
// 12 特徴量の重要度 ─ フォレストは「どの特徴量で判断した」？ 2 つの測り方を比べる
// 不純度の減少（MDI）：その特徴量で分けたノードのジニの減りを全部たす（学習のついでに計算できる）
// 並べ替え（パーミュテーション）：テストの点で 1 つの列だけをシャッフル → 正解率がどれだけ下がるか（下がらない = 使っていない）
//   答えのルール：y = [x1 + 0.6·x2 + ノイズ > 0.8]。x1 がいちばん大事、x2 が次。「乱数」の列は関係なし
//   C で x1 のコピー（x1 + 少しのずれ）を足すと、x1 の重要度が 2 つに分かれてしまう（相関のある特徴量の落とし穴）
// C x1 のコピーを足す / N 乱数の列の数 / R やり直す
// ============================================

let withCopy = false, nNoise = 2, nTrain = 300, nTest = 400, seedD = 12;   // ★ nNoise = 関係のない乱数の列の数
const N_TREES = 60, REPS = 3;         // ★ 木の本数、シャッフルのくり返し回数
let accT = 0;
let names = [], trainD, testD, forest, mdi = [], perm = [], permF = 0, phase = 0;

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); selfTest(); restart(); }
function makeImp(n, copy, noise, seed) {
  seedRng(seed); let X = [], y = [];
  for (let i = 0; i < n; i++) {
    let a = rnd(), b = rnd(), x = [a, b];
    if (copy) x.push(clampv(a + 0.05 * rndGauss(), 0, 1));
    for (let k = 0; k < noise; k++) x.push(rnd());
    X.push(x); y.push(a + 0.6 * b + 0.12 * rndGauss() > 0.8 ? 1 : 0);
  }
  return { X, y };
}
function featNames(copy, noise) { let s = ['x1', 'x2']; if (copy) s.push('x1 のコピー'); for (let k = 0; k < noise; k++) s.push('乱数 ' + (k + 1)); return s; }
function restart() {
  names = featNames(withCopy, nNoise);
  trainD = makeImp(nTrain, withCopy, nNoise, seedD); testD = makeImp(nTest, withCopy, nNoise, seedD + 99);
  seedRng(seedD * 5); forest = makeForest(trainD.X, trainD.y, { mtry: Math.max(1, Math.round(Math.sqrt(names.length))), nClass: 2 });
  accT = 0; mdi = names.map(() => 0); perm = names.map(() => null); permF = 0; phase = 0;
}
// ★ 少しずつ計算：まず木を育てる（1 フレームに 2 本）→ 1 フレームに 1 列ずつシャッフルして測る
function work() {
  if (phase === 0) {
    for (let k = 0; k < 2 && forest.trees.length < N_TREES; k++) forestAdd(forest);
    mdi = impurityImportance(forest.trees, names.length); accT = accuracyOf((x) => forestPredict(forest, x), testD.X, testD.y);
    if (forest.trees.length >= N_TREES) phase = 1;
  } else if (phase === 1) {
    seedRng(seedD * 7 + permF);
    perm[permF] = permutationImportance((x) => forestPredict(forest, x), testD.X, testD.y, permF, REPS);
    permF++; if (permF >= names.length) phase = 2;
  }
}

function draw() {
  background(...BG_COL);
  work();
  let bx = 220, bw = width * 0.5, rowH = Math.min(56, (height - 300) / names.length), y0 = 130;
  let maxP = Math.max(0.05, ...perm.filter((v) => v !== null));
  textAlign(LEFT, BASELINE); noStroke(); fill(205); textSize(14);
  text('青 = 不純度の減少（MDI、合計 1）　緑 = 並べ替えで下がった正解率（テストの点、' + REPS + ' 回の平均）', bx, y0 - 16);
  names.forEach((nm, f) => {
    let yy = y0 + f * rowH, wM = bw * mdi[f], p = perm[f];
    fill(nm.startsWith('乱数') ? color(150) : color(235)); textSize(15); textAlign(RIGHT, CENTER); text(nm, bx - 14, yy + rowH * 0.4);
    noStroke(); fill(85, 175, 240); rect(bx, yy, Math.max(1, wM), rowH * 0.35, 3);
    textAlign(LEFT, CENTER); fill(200); textSize(12); text(fmtNum(mdi[f], 3), bx + wM + 6, yy + rowH * 0.17);
    if (p !== null) {
      let wP = bw * 0.5 * clampv(p / maxP, -0.1, 1);
      fill(175, 225, 95); rect(bx, yy + rowH * 0.42, Math.max(1, wP), rowH * 0.35, 3);
      fill(200); text(fmtNum(p, 3), bx + Math.max(1, wP) + 6, yy + rowH * 0.6);
    }
  });
  // ---- 文字
  textAlign(LEFT, BASELINE); noStroke(); fill(240); textSize(20);
  let acc = accT;
  text('特徴量の重要度　木 ' + forest.trees.length + ' / ' + N_TREES + ' 本　テストの正解率 ' + fmtNum(acc * 100, 1) + '%' + (phase < 2 ? '　（計算中…）' : ''), 40, 40);
  fill(170); textSize(15); text('C x1 のコピー（いま ' + (withCopy ? 'あり' : 'なし') + '）　N 乱数の列の数（' + nNoise + '）　R やり直す', 40, 66);
  let tx = bx + bw + 60, tw = width - tx - 40; fill(220); textSize(15);
  text('答えのルール：y = 1 ⇔ x1 + 0.6·x2 + ノイズ > 0.8', tx, 130, tw);
  fill(190); textSize(14);
  text('MDI は「学習のときに何回・どれだけ使ったか」。深い木は乱数の列でもノイズに合わせて切るので、役に立たない列にも少し点が入る', tx, 180, tw);
  text('並べ替えは「テストで本当に効いているか」。乱数の列をシャッフルしても答えは変わらない → ほぼ 0', tx, 260, tw);
  text('x1 のコピーがあると、木は x1 とコピーのどちらでも切れる → 重要度が 2 つに分かれる。並べ替えでも、片方を壊してももう片方で当てられるので小さく出る', tx, 330, tw);
  fill(160); textSize(13);
  text('重要度は「モデルが何を使ったか」で、「原因」ではないことに注意', tx, 440, tw);
  drawSelfTest(width - 170, height - 12);
}
function keyPressed() {
  if (key === 'c' || key === 'C') { withCopy = !withCopy; restart(); }
  if (key === 'n' || key === 'N') { nNoise = nNoise >= 4 ? 0 : nNoise + 1; restart(); }
  if (key === 'r' || key === 'R') { seedD++; restart(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let tr = makeImp(250, false, 2, 41), te = makeImp(300, false, 2, 42);
  seedRng(3); let F = makeForest(tr.X, tr.y, { mtry: 2, nClass: 2 }); for (let k = 0; k < 30; k++) forestAdd(F);
  let m = impurityImportance(F.trees, 4), fn = (x) => forestPredict(F, x);
  seedRng(4); let p = [0, 1, 2, 3].map((f) => permutationImportance(fn, te.X, te.y, f, 3));
  check('MDI は全部 0 以上で合計 1', m.every((v) => v >= 0) && near(sumArr(m), 1));
  check('乱数の列の並べ替え重要度 ≈ 0（' + fmtNum(p[2], 3) + '、' + fmtNum(p[3], 3) + '、|・| < 0.02）', Math.abs(p[2]) < 0.02 && Math.abs(p[3]) < 0.02);
  check('並べ替えでいちばん大事なのは x1、次が x2', p[0] > p[1] && p[1] > Math.max(p[2], p[3]));
  check('深い木の MDI は乱数の列にも 0 でない点をつける（' + fmtNum(m[2], 3) + ' > 0.02）← MDI のくせ', m[2] > 0.02);
  let st = growTree(tr.X, tr.y, { maxDepth: 1 });
  seedRng(5); let p2 = permutationImportance((x) => treePredict(st, x), te.X, te.y, 1, 3);
  check('使っていない列（切り株が x' + (st.feat + 1) + ' で切るとき x2）をシャッフルしても、正解率はちょうど同じ', st.feat === 0 && p2 === 0);
  let trc = makeImp(250, true, 2, 41);
  seedRng(3); let Fc = makeForest(trc.X, trc.y, { mtry: 2, nClass: 2 }); for (let k = 0; k < 30; k++) forestAdd(Fc);
  let mc = impurityImportance(Fc.trees, 5);
  check('x1 のコピーを足すと、x1 の MDI が減る（' + fmtNum(m[0], 3) + ' → ' + fmtNum(mc[0], 3) + '）、コピーにも分かれる', mc[0] < m[0] && mc[2] > 0.1);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 青（MDI）と緑（並べ替え）で、乱数の列の長さを比べよう。どちらを信じる？
// 2. C で x1 のコピーを足すと、x1 の棒はどうなる？ 「x1 は大事じゃない」と読みまちがえないように
// 3. N で乱数の列を 4 本に。テストの正解率は下がる？ MDI の乱数の列の合計は？
// 4. 答えのルールの 0.6 を 0 にすると、x2 の重要度はどうなる？（makeImp の中）
// 5. 1 本の深い木（mtry なし、1 本）だと重要度はどう変わる？ N_TREES を 1 にしてみよう

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
// ---- 特徴量の重要度
// 不純度の減少（MDI）：その特徴量で分けたノードの「重みつきの不純度の減り」を全部たして、合計 1 にする
function impurityImportance(trees, d) {
  let imp = new Array(d).fill(0);
  for (let t of trees) { let W = sumArr(t.counts) || 1; for (let q of treeNodes(t)) if (!q.leaf) imp[q.feat] += q.dec / W; }
  let s = sumArr(imp); return imp.map((v) => (s > 0 ? v / s : 0));
}
// 並べ替え（パーミュテーション）：テストの点で 1 つの特徴量の列だけをシャッフル → 正解率がどれだけ下がるか（reps 回の平均）
function permutationImportance(fn, X, y, f, reps) {
  let base = accuracyOf(fn, X, y), drop = 0;
  for (let r = 0; r < reps; r++) {
    let col = shuffleArr(X.map((x) => x[f])), Xp = X.map((x, i) => { let z = x.slice(); z[f] = col[i]; return z; });
    drop += base - accuracyOf(fn, Xp, y);
  }
  return drop / reps;
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
