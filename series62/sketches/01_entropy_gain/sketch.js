// ============================================
// 01 エントロピーと情報利得 ─ 「どれくらい混ざっているか」を数にする 3 つの方法と、しきい値の選び方
// 左：クラス B の割合 p を変えると、エントロピー H(p) = −p log₂p − (1−p) log₂(1−p)、ジニ 2p(1−p)、誤分類率 min(p, 1−p) の上を点が動く
// 右：1 本のしきい値で点を左右に分ける。情報利得 = 親の H − (左の割合·左の H + 右の割合·右の H)。全部の中点で計算した曲線の山 = いちばんよい切り方
//   エントロピー（情報量）そのものはシリーズ 6 の 01 で。ここでは「質問のよさ」を測るものさしとして使う
// ← → p / ドラッグ しきい値を動かす / B いちばんよいしきい値へ / R 新しいデータ
// ============================================

let pB = 0.3, nPts = 40, seedD = 7, thr = 0.5;   // ★ pB = 左の袋のクラス B の割合、nPts = 右の点の数
let pts = [], cands = [], dragT = false, gStrip;

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); selfTest(); newData(); }
// 1 次元のデータ：x が大きいほど B が多い（ただしまざっている）
function newData() {
  seedRng(seedD); pts = [];
  for (let i = 0; i < nPts; i++) { let x = 0.03 + 0.94 * rnd(), pr = 1 / (1 + Math.exp(-(x - 0.55) * 12)); pts.push({ x, c: rnd() < pr ? 1 : 0 }); }
  let xs = pts.map((p) => p.x).sort((a, b) => a - b);
  cands = []; for (let k = 0; k + 1 < xs.length; k++) if (xs[k + 1] > xs[k]) cands.push((xs[k] + xs[k + 1]) / 2);   // 候補 = となりどうしの中点
  thr = cands[Math.floor(cands.length / 2)];
}
// ★ しきい値 t で分けたときの左右の個数と、情報利得・ジニの減り
function splitInfo(t) {
  let L = [0, 0], R = [0, 0];
  for (let p of pts) (p.x <= t ? L : R)[p.c]++;
  let P = [L[0] + R[0], L[1] + R[1]];
  return { L, R, P, ig: gainOf(P, L, R, 'entropy'), gg: gainOf(P, L, R, 'gini') };
}

function draw() {
  background(...BG_COL);
  // ---- 左：3 つの不純度の曲線
  let g = { x: 70, y: 130, w: width * 0.36, h: height * 0.42, x0: 0, x1: 1, y0: 0, y1: 1.05 };
  plotAxes(g, 'クラス B の割合 p', '不純度', [0, 0.25, 0.5, 0.75, 1], [0, 0.5, 1]);
  let fns = [[entropyP, [245, 200, 90], 'エントロピー H'], [(p) => giniOf([1 - p, p]), [85, 175, 240], 'ジニ 2p(1−p)'], [(p) => errOf([1 - p, p]), [235, 120, 120], '誤分類率 min(p, 1−p)']];
  fns.forEach(([f, c, name], k) => {
    stroke(...c); strokeWeight(2.5); let a = [];
    for (let q = 0; q <= 100; q++) a.push([gX(g, q / 100), gY(g, f(q / 100))]);
    polyline(a); noStroke(); fill(...c); circle(gX(g, pB), gY(g, f(pB)), 12);
    textSize(14); textAlign(LEFT, BASELINE); text(name + ' = ' + fmtNum(f(pB), 3), g.x + 10, g.y + g.h + 56 + k * 22);
  });
  stroke(255, 255, 255, 80); line(gX(g, pB), g.y, gX(g, pB), g.y + g.h);
  // 袋の絵（20 個）
  for (let i = 0; i < 20; i++) { noStroke(); fill(...CLS_COL[i < Math.round(pB * 20) ? 1 : 0]); circle(g.x + 20 + i * 18, g.y + g.h + 140, 14); }
  // ---- 右：1 次元の点としきい値
  let sx = g.x + g.w + 90, sw = width - sx - 50;
  gStrip = { x: sx, y: 130, w: sw, h: 80 };
  noFill(); stroke(80, 100, 90); rect(gStrip.x, gStrip.y, gStrip.w, gStrip.h);
  for (let p of pts) { noStroke(); fill(...CLS_COL[p.c]); circle(sx + p.x * sw, gStrip.y + (p.c ? 58 : 22), 12); }
  stroke(255, 240, 150); strokeWeight(3); line(sx + thr * sw, gStrip.y - 12, sx + thr * sw, gStrip.y + gStrip.h + 12);
  let si = splitInfo(thr);
  // 利得の曲線（候補の中点ごと）
  let g2 = { x: sx, y: gStrip.y + gStrip.h + 50, w: sw, h: height * 0.26, x0: 0, x1: 1, y0: 0, y1: 0.6 };
  plotAxes(g2, 'しきい値', '情報利得（黄）とジニの減り（青）', [0, 0.5, 1], [0, 0.2, 0.4, 0.6]);
  let gi = cands.map((t) => splitInfo(t)), bi = argMaxArr(gi.map((s) => s.ig));
  stroke(245, 200, 90); strokeWeight(2.5); polyline(cands.map((t, k) => [gX(g2, t), gY(g2, gi[k].ig)]));
  stroke(85, 175, 240); strokeWeight(2); polyline(cands.map((t, k) => [gX(g2, t), gY(g2, gi[k].gg)]));
  noStroke(); fill(245, 200, 90); for (let k = 0; k < cands.length; k++) circle(gX(g2, cands[k]), gY(g2, gi[k].ig), 4);
  fill(255, 240, 150); circle(gX(g2, thr), gY(g2, si.ig), 12);
  stroke(255, 255, 255, 120); strokeWeight(1); drawingContext.setLineDash([4, 4]); line(gX(g2, cands[bi]), g2.y, gX(g2, cands[bi]), g2.y + g2.h); drawingContext.setLineDash([]);
  // ---- 文字
  let n = pts.length, nl = si.L[0] + si.L[1], nr = n - nl, hP = entropyOf(si.P), hl = entropyOf(si.L), hr = entropyOf(si.R);
  textAlign(LEFT, BASELINE); noStroke(); fill(240); textSize(20);
  text('エントロピーと情報利得　p = ' + fmtNum(pB, 2) + '　しきい値 ' + fmtNum(thr, 3), 40, 40);
  fill(170); textSize(15); text('← → p　ドラッグ しきい値（白い帯の中）　B いちばんよいしきい値へ　R 新しいデータ', 40, 66);
  let ty = g2.y + g2.h + 50; fill(220); textSize(16);
  text('左 ' + nl + ' 個 [A ' + si.L[0] + ' | B ' + si.L[1] + '] H = ' + fmtNum(hl, 3) + '　右 ' + nr + ' 個 [A ' + si.R[0] + ' | B ' + si.R[1] + '] H = ' + fmtNum(hr, 3), sx, ty);
  text('情報利得 = ' + fmtNum(hP, 3) + ' − (' + nl + '/' + n + '·' + fmtNum(hl, 3) + ' + ' + nr + '/' + n + '·' + fmtNum(hr, 3) + ') = ' + fmtNum(si.ig, 4) + ' ビット', sx, ty + 26);
  fill(255, 240, 150); text('いちばんよいしきい値 ' + fmtNum(cands[bi], 3) + '（利得 ' + fmtNum(gi[bi].ig, 4) + '）。候補はとなりどうしの中点 ' + cands.length + ' 個だけ', sx, ty + 52, sw);
  fill(160); textSize(14);
  text('どの曲線も p = 0.5 でいちばん大きく、純粋（p = 0 か 1）で 0。利得は「分けたあと、どれだけ純粋になったか」。利得はいつも 0 以上（平均すると混ざり具合は増えない）', 40, height - 40, g.w + 120);
  drawSelfTest(width - 170, height - 12);
}
function setThrFromMouse() { if (!gStrip) return; let t = (mouseX - gStrip.x) / gStrip.w; thr = clampv(t, 0, 1); }
function mousePressed() { if (gStrip && mouseX > gStrip.x - 10 && mouseX < gStrip.x + gStrip.w + 10 && mouseY > gStrip.y - 20 && mouseY < gStrip.y + gStrip.h + 20) { dragT = true; setThrFromMouse(); } }
function mouseDragged() { if (dragT) setThrFromMouse(); }
function mouseReleased() { dragT = false; }
function keyPressed() {
  if (key === RIGHT_ARROW) pB = Math.min(1, +(pB + 0.05).toFixed(2));
  if (key === LEFT_ARROW) pB = Math.max(0, +(pB - 0.05).toFixed(2));
  if (key === 'b' || key === 'B') { let gi = cands.map((t) => splitInfo(t).ig); thr = cands[argMaxArr(gi)]; }
  if (key === 'r' || key === 'R') { seedD++; newData(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  check('H(0.5) = 1 ビット、H(0) = H(1) = 0', entropyP(0.5) === 1 && entropyP(0) === 0 && entropyP(1) === 0);
  let gm = 0, gp = 0, ord = true;
  for (let q = 0; q <= 1000; q++) {
    let p = q / 1000, c = [1 - p, p], gi = giniOf(c);
    if (gi > gm) { gm = gi; gp = p; }
    if (!(errOf(c) <= gi + 1e-12 && gi <= entropyOf(c) + 1e-12)) ord = false;
  }
  check('2 クラスのジニの最大は 0.5（p = 0.5 のとき）', near(gm, 0.5) && near(gp, 0.5));
  check('どの p でも 誤分類率 ≤ ジニ ≤ エントロピー', ord);
  check('4 クラスが同じ数なら H = log₂4 = 2 ビット、ジニ = 0.75', near(entropyOf([3, 3, 3, 3]), 2) && near(giniOf([3, 3, 3, 3]), 0.75));
  let okG = true, okB = true;
  for (let s = 1; s <= 30; s++) {
    seedRng(300 + s); let X = [], y = [];
    for (let i = 0; i < 30; i++) { X.push([rnd()]); y.push(rnd() < 0.4 + 0.3 * X[i][0] ? 1 : 0); }
    let xs = X.map((x) => x[0]).sort((a, b) => a - b), best = -1;
    for (let k = 0; k + 1 < xs.length; k++) {
      let t = (xs[k] + xs[k + 1]) / 2, L = [0, 0], R = [0, 0];
      X.forEach((x, i) => (x[0] <= t ? L : R)[y[i]]++);
      let P = [L[0] + R[0], L[1] + R[1]], ig = gainOf(P, L, R, 'entropy');
      if (ig < -1e-12 || gainOf(P, L, R, 'gini') < -1e-12) okG = false;
      best = Math.max(best, ig);
    }
    let root = growTree(X, y, { maxDepth: 1, crit: 'entropy' });
    if (!root.leaf && Math.abs(root.dec / 30 - best) > 1e-9) okB = false;
  }
  check('どのしきい値でも情報利得 ≥ 0、ジニの減り ≥ 0（30 データの全部の中点）', okG);
  check('CART のエントロピー版が選ぶ分割の利得 = 全部の中点の利得の最大', okB);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. ← → で p を動かし、3 つの曲線の高さを比べよう。どれがいちばん「とがって」いる？
// 2. しきい値をドラッグして、利得がいちばん大きいところを自分で探そう（B で答え合わせ）
// 3. 利得の曲線は、点と点の間では平ら。だから「中点だけ」調べれば十分なのはなぜ？
// 4. 黄（エントロピー）と青（ジニ）の山は同じ場所？ ちがうデータでは？（R）
// 5. 02 では、自分で平面を切って、ジニの合計を小さくしてみる

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
