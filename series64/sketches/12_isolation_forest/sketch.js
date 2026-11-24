// ============================================
// 12 Isolation Forest で異常検知 ─ ランダムに縦か横に切っていくと、ほかから離れた点ほど早く 1 つだけになる（孤立する）
// 1 本の木：ランダムな特徴量を、[最小, 最大] の一様乱数の位置で切る、をくり返す（深さの上限 ⌈log₂ ψ⌉）
//   点の経路長 h = 根から葉までの切った回数（+ 葉に残った点の数の補正 c(size)）。100 本の木の平均 E[h]
//   異常スコア s = 2^(−E[h]/c(ψ))、c(n) = 2H(n − 1) − 2(n − 1)/n（H = 調和数）。s が 1 に近いほど異常、0.5 よりずっと小さければふつう
//   背景 = スコアの地図（明るい = 異常）。マウスの下の点を、← → で選んだ木が孤立させるまでの箱を描く
// クリック 点を足す / C 足した点を消す / ← → 木の番号 / ↑↓ 木の本数 / R データを作り直す
// ============================================

let nTrees = 100, psi = 256, seedD = 2, treeNo = 0;   // ★ 木の本数、1 本の木に使う点の数 ψ
const CELLS = 80;
let base = [], added = [], forest, scoreImg, scoreGrid, rowsDone = 0, plotBox;

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); pixelDensity(1); scoreImg = createImage(CELLS, CELLS); selfTest(); restart(); }
function makeBlobs(seed) {             // かたまり 2 つ + 外れた点を少し
  seedRng(seed); let X = [];
  for (let i = 0; i < 160; i++) X.push([clampv(0.32 + 0.07 * rndGauss(), 0, 1), clampv(0.62 + 0.07 * rndGauss(), 0, 1)]);
  for (let i = 0; i < 110; i++) X.push([clampv(0.68 + 0.05 * rndGauss(), 0, 1), clampv(0.3 + 0.09 * rndGauss(), 0, 1)]);
  for (let i = 0; i < 8; i++) X.push([0.05 + 0.9 * rnd(), 0.05 + 0.9 * rnd()]);
  return X;
}
function allPts() { return base.concat(added); }
function rebuild() { forest = iForest(allPts(), nTrees, psi, seedD * 101 + added.length); scoreGrid = new Float32Array(CELLS * CELLS); rowsDone = 0; }
function restart() { base = makeBlobs(seedD); added = []; rebuild(); }
function scoreCol(s) { let t = clampv((s - 0.35) / 0.4, 0, 1); return [BG_COL[0] + t * (WINE[0] + 40 - BG_COL[0]), BG_COL[1] + t * (GOLD[1] - 30 - BG_COL[1]), BG_COL[2] + t * (70 - BG_COL[2])]; }

function draw() {
  background(...BG_COL);
  let t0 = performance.now();               // スコアの地図は 1 行ずつ計算（1 フレーム 6 ミリ秒まで）
  while (rowsDone < CELLS && performance.now() - t0 < 6) { let j = rowsDone++; for (let i = 0; i < CELLS; i++) scoreGrid[i + CELLS * j] = anomalyScore(forest, [(i + 0.5) / CELLS, 1 - (j + 0.5) / CELLS]); }
  scoreImg.loadPixels();
  for (let q = 0; q < CELLS * CELLS; q++) { let c = Math.floor(q / CELLS) < rowsDone ? scoreCol(scoreGrid[q]) : BG_COL; scoreImg.pixels[4 * q] = c[0]; scoreImg.pixels[4 * q + 1] = c[1]; scoreImg.pixels[4 * q + 2] = c[2]; scoreImg.pixels[4 * q + 3] = 255; }
  scoreImg.updatePixels();
  let side = Math.min(height - 170, width * 0.5); plotBox = { x: 40, y: 100, w: side, h: side };
  noSmooth(); image(scoreImg, plotBox.x, plotBox.y, side, side); smooth(); frameBox(plotBox);
  let pts = allPts(), sc = pts.map((x) => anomalyScore(forest, x)), order = sc.map((s, i) => i).sort((a, b) => sc[b] - sc[a]);
  noStroke(); pts.forEach((x, i) => { let p = toPx(plotBox, x[0], x[1]); fill(...(i >= base.length ? TEAL : INK), 220); circle(p[0], p[1], i >= base.length ? 9 : 5); });
  order.slice(0, 5).forEach((i, r) => { let p = toPx(plotBox, pts[i][0], pts[i][1]); noFill(); stroke(...GOLD); strokeWeight(2); circle(p[0], p[1], 18); noStroke(); fill(...GOLD); textSize(12); textAlign(LEFT, CENTER); text(r + 1, p[0] + 11, p[1] - 9); });
  // ---- マウスの下の点を、木 treeNo がどう切って孤立させるか
  let m = fromPx(plotBox, mouseX, mouseY), inside = m[0] >= 0 && m[0] <= 1 && m[1] >= 0 && m[1] <= 1, rx = plotBox.x + side + 60;
  if (inside) {
    let t = forest.trees[treeNo % forest.trees.length], box = [0, 1, 0, 1], d = 0;
    while (!t.leaf) {
      let goL = m[t.f] < t.thr; stroke(255, 255, 255, 200); strokeWeight(1);
      if (t.f === 0) { let xx = toPx(plotBox, t.thr, 0)[0]; line(xx, toPx(plotBox, 0, box[3])[1], xx, toPx(plotBox, 0, box[2])[1]); if (goL) box[1] = t.thr; else box[0] = t.thr; }
      else { let yy = toPx(plotBox, 0, t.thr)[1]; line(toPx(plotBox, box[0], 0)[0], yy, toPx(plotBox, box[1], 0)[0], yy); if (goL) box[3] = t.thr; else box[2] = t.thr; }
      t = goL ? t.left : t.right; d++;
    }
    let a = toPx(plotBox, box[0], box[3]), b = toPx(plotBox, box[1], box[2]); noFill(); stroke(...GOLD); strokeWeight(2.5); rect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
    let s = anomalyScore(forest, m), eh = avgPath(forest, m);
    noStroke(); fill(...INK); textSize(16); textAlign(LEFT, BASELINE);
    text('マウスの位置：木 ' + (treeNo % forest.trees.length + 1) + ' では ' + d + ' 回で葉（残り ' + t.size + ' 点、+c = ' + fmtNum(cFactor(t.size), 2) + '）', rx, 130);
    text('E[h] = ' + fmtNum(eh, 2) + '、c(ψ) = ' + fmtNum(cFactor(forest.psi), 2) + ' → s = 2^(−' + fmtNum(eh / cFactor(forest.psi), 3) + ') = ' + fmtNum(s, 3), rx, 156);
  } else { noStroke(); fill(200, 185, 170); textSize(15); textAlign(LEFT, BASELINE); text('マウスを左の図の上に置くと、木が切っていく様子が見える', rx, 130); }
  // ---- 右：スコアのヒストグラムと上位 5 つ
  let g = { x: rx + 10, y: 210, w: width - rx - 60, h: height * 0.3, x0: 0.3, x1: 0.8, y0: 0, y1: 1 };
  let bins = new Array(25).fill(0); sc.forEach((s) => bins[clampv(Math.floor((s - 0.3) / 0.02), 0, 24)]++); g.y1 = Math.max(5, ...bins);
  plotAxes(g, '異常スコア s', '全部の点のスコア（右の端ほど異常）', [0.3, 0.4, 0.5, 0.6, 0.7, 0.8], [0, g.y1]);
  noStroke(); bins.forEach((c, k) => { fill(...scoreCol(0.31 + 0.02 * k)); rect(gX(g, 0.3 + 0.02 * k) + 1, gY(g, c), g.w / 25 - 2, g.y + g.h - gY(g, c)); });
  stroke(...INK); strokeWeight(1); drawingContext.setLineDash([4, 4]); line(gX(g, 0.5), g.y, gX(g, 0.5), g.y + g.h); drawingContext.setLineDash([]);
  noStroke(); fill(...INK); textSize(15); textAlign(LEFT, BASELINE); let ty = g.y + g.h + 60; text('スコアの上位 5 つ（金の輪）', rx, ty);
  order.slice(0, 5).forEach((i, r) => { fill(220, 210, 195); textSize(14); text((r + 1) + '.　s = ' + fmtNum(sc[i], 3) + '　E[h] = ' + fmtNum(avgPath(forest, pts[i]), 2) + '　(' + fmtNum(pts[i][0], 2) + ', ' + fmtNum(pts[i][1], 2) + ')' + (i >= base.length ? '　← 足した点' : ''), rx, ty + 26 + 22 * r); });
  // ---- 文字
  fill(...INK); textSize(20); text('Isolation Forest　木 ' + forest.trees.length + ' 本、ψ = ' + forest.psi + '、深さの上限 ' + forest.limit + (rowsDone < CELLS ? '　（地図を計算中…）' : ''), 40, 40);
  fill(170, 155, 145); textSize(15); text('クリック 点を足す　C 足した点を消す　← → 木の番号　↑↓ 木の本数　R データを作り直す', 40, 66);
  drawSelfTest(width - 170, height - 12);
}
function mousePressed() { if (!plotBox) return; let m = fromPx(plotBox, mouseX, mouseY); if (m[0] >= 0 && m[0] <= 1 && m[1] >= 0 && m[1] <= 1 && added.length < 200) { added.push(m); rebuild(); } }
function keyPressed() {
  if (key === 'c' || key === 'C') { added = []; rebuild(); }
  if (key === RIGHT_ARROW) treeNo = (treeNo + 1) % nTrees;
  if (key === LEFT_ARROW) treeNo = (treeNo + nTrees - 1) % nTrees;
  if (key === UP_ARROW) { nTrees = Math.min(300, nTrees + 20); rebuild(); }
  if (key === DOWN_ARROW) { nTrees = Math.max(1, nTrees - 20); rebuild(); }
  if (key === 'r' || key === 'R') { seedD++; restart(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let okC = true; for (let n = 3; n <= 600; n++) { let h = 0; for (let i = 1; i <= n - 1; i++) h += 1 / i; if (Math.abs(cFactor(n) - (2 * h - (2 * (n - 1)) / n)) > 1e-9) okC = false; }
  check('c(n) = 2H(n − 1) − 2(n − 1)/n（H をそのまま足して比べる、n = 3〜600）、c(1) = 0、c(2) = 1', okC && cFactor(1) === 0 && cFactor(2) === 1);
  let approx = 2 * (Math.log(255) + 0.5772156649) - (2 * 255) / 256;
  check('c(256) = ' + fmtNum(cFactor(256), 4) + '：近似 2(ln 255 + 0.5772) − 2·255/256 と 0.1% 以内。n = 3 では近似は 10% 以上ずれる', Math.abs(approx / cFactor(256) - 1) < 1e-3 && Math.abs((2 * (Math.log(2) + 0.5772156649) - 4 / 3) / cFactor(3) - 1) > 0.1);
  let X = makeBlobs(2), F = iForest(X, 100, 256, 7), sOut = anomalyScore(F, [0.97, 0.03]), sIn = anomalyScore(F, [0.32, 0.62]);
  check('はっきりした外れ値 (0.97, 0.03) のスコア ' + fmtNum(sOut, 3) + ' > 0.6、かたまりの中心 (0.32, 0.62) は ' + fmtNum(sIn, 3) + ' < 0.5', sOut > 0.6 && sIn < 0.5);
  check('外れ値の平均の経路長 ' + fmtNum(avgPath(F, [0.97, 0.03]), 2) + ' < 中心 ' + fmtNum(avgPath(F, [0.32, 0.62]), 2) + '（早く孤立する）', avgPath(F, [0.97, 0.03]) < avgPath(F, [0.32, 0.62]));
  let okB = true; seedRng(3);
  for (let q = 0; q < 200; q++) { let x = [rnd(), rnd()], s = anomalyScore(F, x); if (!(s > 0 && s <= 1)) okB = false; for (let t of F.trees.slice(0, 10)) if (pathLen(t, x) > F.limit + cFactor(F.psi) + 1e-9) okB = false; }
  check('どの点もスコアは 0〜1、経路長 ≤ 深さの上限 + c(ψ)。E[h] = c(ψ) ならちょうど s = 0.5', okB && near(Math.pow(2, -cFactor(256) / cFactor(256)), 0.5, 1e-15));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. かたまりから少し離れた所をクリックしよう。足した点の順位は？ 何個も同じ所に足すと（小さなかたまりになると）？
// 2. マウスを外れ値とかたまりの中に置き、← → で木を変えよう。外れ値は何回の切り口で箱が 1 点だけになる？
// 3. ↓ で木を 1 本にすると、地図がカクカクになる（1 本の木はでたらめ）。100 本の平均でなめらかに
// 4. psi を 16 にすると？ Isolation Forest は小さな部分標本でも動くのが長所
// 5. 13 では、アンサンブルの「ばらつき」を、異常ではなく「自信のなさ」に使う

// ==================================================
// ここから下は「アンサンブル学習の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 小さな道具：はさむ・合計・平均・いちばん大きい番号・数の表示
function clampv(v, a, b) { return v < a ? a : v > b ? b : v !== v ? a : v; }     // NaN なら a に戻す
function sumArr(a) { let s = 0; for (let v of a) s += v; return s; }
function meanOf(a) { return a.length ? sumArr(a) / a.length : 0; }
function varOf(a) { let m = meanOf(a), s = 0; for (let v of a) s += (v - m) * (v - m); return a.length ? s / a.length : 0; }   // ÷n の分散
function argMaxArr(a) { let b = 0; for (let i = 1; i < a.length; i++) if (a[i] > a[b]) b = i; return b; }   // 同点なら小さい番号
function sigm(z) { return 1 / (1 + Math.exp(-clampv(z, -40, 40))); }
function fmtNum(v, d) { if (typeof v !== 'number' || !isFinite(v)) return '?'; let s = (+v.toFixed(d === undefined ? 2 : d)).toString(); return s === '-0' ? '0' : s; }
function pctStr(v) { return fmtNum(100 * v, 1) + '%'; }
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
function rndGauss() { let u = Math.max(1e-12, rnd()), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }   // 標準正規分布
function shuffleArr(a) { for (let i = a.length - 1; i > 0; i--) { let j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
// ---- Isolation Forest：ランダムな特徴量を、[最小, 最大] の一様乱数のしきい値で切っていく木。早く孤立する点ほど「外れ値」
const harmCache = [0];
function harmonic(k) { while (harmCache.length <= k) harmCache.push(harmCache[harmCache.length - 1] + 1 / harmCache.length); return harmCache[k]; }   // H(k) = 1 + 1/2 + … + 1/k（ぴったりの和）
function cFactor(n) { return n <= 1 ? 0 : n === 2 ? 1 : 2 * harmonic(n - 1) - (2 * (n - 1)) / n; }   // n 点の木の平均の経路長 c(n)
function iTree(X, idx, depth, limit) {
  if (depth >= limit || idx.length <= 1) return { leaf: true, size: idx.length };
  let f = Math.floor(rnd() * X[0].length), lo = Infinity, hi = -Infinity;
  for (let i of idx) { lo = Math.min(lo, X[i][f]); hi = Math.max(hi, X[i][f]); }
  if (!(hi > lo)) return { leaf: true, size: idx.length };
  let thr = lo + rnd() * (hi - lo), L = [], R = [];
  for (let i of idx) (X[i][f] < thr ? L : R).push(i);
  return { leaf: false, f, thr, lo, hi, left: iTree(X, L, depth + 1, limit), right: iTree(X, R, depth + 1, limit) };
}
function pathLen(t, x) { let d = 0; while (!t.leaf) { t = x[t.f] < t.thr ? t.left : t.right; d++; } return d + cFactor(t.size); }   // 葉に残った点の数のぶん c(size) を足す
function iForest(X, nTrees, psi, seed) {
  seedRng(seed); let m = Math.min(psi, X.length), trees = [], limit = Math.ceil(Math.log2(Math.max(2, m)));
  for (let k = 0; k < nTrees; k++) { let idx = shuffleArr(X.map((_, i) => i)).slice(0, m); trees.push(iTree(X, idx, 0, limit)); }
  return { trees, psi: m, limit };
}
function avgPath(F, x) { let s = 0; for (let t of F.trees) s += pathLen(t, x); return s / F.trees.length; }
function anomalyScore(F, x) { return Math.pow(2, -avgPath(F, x) / cFactor(F.psi)); }   // s = 2^(−E[h]/c(ψ))
// ---- 描く道具：色（オーケストラ：えんじ色の黒、象牙色、金管の金、弦の青緑）、領域の絵、点
const BG_COL = [24, 11, 16];                                     // 背景（えんじ色の黒）
const INK = [242, 233, 214], GOLD = [226, 176, 74], TEAL = [64, 186, 176], WINE = [196, 72, 96];
const CLS_COL = [[226, 170, 70], [60, 182, 176]];                // ★ クラス 0（金）・クラス 1（青緑）の色
function probCol(p, k) {             // クラス 1 の確率 → 背景と混ぜた色（k = 濃さ）
  let c = [], a = clampv(k === undefined ? 0.55 : k, 0, 1) * Math.abs(2 * p - 1) + 0.12;
  for (let q = 0; q < 3; q++) c.push(BG_COL[q] + ((p > 0.5 ? CLS_COL[1][q] : CLS_COL[0][q]) - BG_COL[q]) * a);
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
function drawPoints(bx, X, y, r) {
  stroke(10); strokeWeight(1);
  for (let i = 0; i < X.length; i++) { let p = toPx(bx, X[i][0], X[i][1]); fill(...CLS_COL[y[i]]); circle(p[0], p[1], r); }
}
function frameBox(bx, col) { noFill(); stroke(...(col || [110, 80, 85])); strokeWeight(1); rect(bx.x, bx.y, bx.w, bx.h); }
// ---- グラフの道具：g = { x, y, w, h, x0, x1, y0, y1 }
function gX(g, v) { return g.x + clampv((v - g.x0) / (g.x1 - g.x0), -0.02, 1.02) * g.w; }
function gY(g, v) { return g.y + g.h - clampv((v - g.y0) / (g.y1 - g.y0), -0.02, 1.02) * g.h; }
function plotAxes(g, xl, yl, xt, yt) {
  stroke(95, 70, 75); strokeWeight(1); noFill(); rect(g.x, g.y, g.w, g.h);
  noStroke(); fill(175, 160, 150); textSize(12); textAlign(CENTER, TOP);
  for (let v of xt) text(+v.toPrecision(3), gX(g, v), g.y + g.h + 4);
  textAlign(RIGHT, CENTER);
  for (let v of yt) text(+v.toPrecision(3), g.x - 5, gY(g, v));
  textAlign(LEFT, BASELINE); fill(215, 205, 190); textSize(13);
  text(xl, g.x + g.w - textWidth(xl), g.y + g.h + 32); text(yl, g.x, g.y - 8);
}
function polyline(pts) {               // 点が 2 つ以上あるときだけ折れ線を描く（空の beginShape を作らない）
  if (pts.length < 2) return;
  noFill(); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape();
}
function legend(x, y, items) {         // items = [[色, 名前], …]
  textSize(13); textAlign(LEFT, CENTER); noStroke();
  items.forEach(([c, s], k) => { fill(...c); rect(x, y + 20 * k - 5, 14, 10, 2); fill(220, 210, 195); text(s, x + 22, y + 20 * k); });
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) || ArrayBuffer.isView(v) ? Array.from(v).every(noNaN) : !(typeof v === 'number' && !isFinite(v)); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(140, 215, 170) : color(255, 90, 110)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
