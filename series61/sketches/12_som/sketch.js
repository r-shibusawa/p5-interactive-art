// ============================================
// 12 自己組織化マップ（SOM）─ 10 × 10 の格子にならんだニューロンが、データに合わせて広がって「地図」になる
//   ① データを 1 つ選ぶ ② いちばん似ているニューロン（BMU）を探す ③ BMU と、格子の上でその近くのニューロンを、データのほうへ少し動かす
//   動かす量 = 学習率 α(t) × 近傍 h = exp(−(格子の距離)² / 2σ(t)²)。α と σ はだんだん小さくする（はじめは大きく全体を、あとで細かく）
//   格子でとなりのニューロンが似たものを表す → 色なら「色の地図」、2 次元の点なら網がデータの形に広がる
//   k-means の中心どうしには「となり」がない。SOM は中心に格子のつながりをつけたもの
// 1 色の地図 / 2 点の網 / D データの形（2）/ スライダ 学習率 α0・近傍半径 σ0 / スペース 一時停止 / ↑↓ 速さ / R 最初から
// ============================================

const GW = 10, GH = 10, TMAX = 4000;   // ★ 格子の大きさ、学習の回数
const SHAPES = ['正方形', '輪', '3 つのかたまり'];
let modeNo = 1, shapeNo = 0, dataPts = [], neurons = [], tStep = 0, paused = false, speed = 10, qeHist = [], seedS = 121, sAlpha, sSigma;

function setup() {
  createCanvas(windowWidth, windowHeight); textWrap(CHAR);
  sAlpha = makeSlider(width - 360, 150, 300, 0.05, 1, 0.5, '学習率 α0', 2); sSigma = makeSlider(width - 360, 215, 300, 0.5, 6, 4, '近傍の半径 σ0（格子のマス）', 1);
  selfTest(); reset();
}
function makeData(mode, shape, n, seed) {
  seedRng(seed);
  if (mode === 1) return Array.from({ length: n }, () => [rnd(), rnd(), rnd()]);                      // ランダムな色 (r, g, b)
  if (shape === 1) return Array.from({ length: n }, () => { let a = rnd() * TWO_PI, r = 0.7 + 0.25 * rnd(); return [r * Math.cos(a), r * Math.sin(a)]; });
  if (shape === 2) return Array.from({ length: n }, (_, i) => { let a = (TWO_PI * (i % 3)) / 3; return [0.6 * Math.cos(a) + 0.12 * gauss(), 0.6 * Math.sin(a) + 0.12 * gauss()]; });
  return Array.from({ length: n }, () => [-1 + 2 * rnd(), -1 + 2 * rnd()]);
}
function initNeurons(dim, seed) { seedRng(seed); return Array.from({ length: GW * GH }, () => Array.from({ length: dim }, () => (dim === 3 ? 0.4 + 0.2 * rnd() : -0.1 + 0.2 * rnd()))); }
function reset() { dataPts = makeData(modeNo, shapeNo, 400, seedS); neurons = initNeurons(dataPts[0].length, seedS + 1); tStep = 0; qeHist = [[0, quantErr(neurons, dataPts)]]; seedRng(seedS + 2); }

// ★ 学習率と近傍の半径のスケジュール（t = 0 → TMAX で小さくなる）
function alphaAt(t, a0) { return a0 * Math.pow(0.02, t / TMAX); }
function sigmaAt(t, s0) { return s0 * Math.pow(0.4 / s0, t / TMAX); }
function bmuOf(ws, x) { let b = 0, bd = Infinity; for (let i = 0; i < ws.length; i++) { let d = sqd(ws[i], x); if (d < bd) { bd = d; b = i; } } return b; }
function neigh(i, j, sg) { let dx = (i % GW) - (j % GW), dy = Math.floor(i / GW) - Math.floor(j / GW); return Math.exp(-(dx * dx + dy * dy) / (2 * sg * sg)); }
// ★ 1 回の学習
function trainStep(ws, x, t, a0, s0) {
  let b = bmuOf(ws, x), al = alphaAt(t, a0), sg = sigmaAt(t, s0);
  for (let i = 0; i < ws.length; i++) { let f = al * neigh(i, b, sg); if (f < 1e-6) continue; for (let d = 0; d < x.length; d++) ws[i][d] += f * (x[d] - ws[i][d]); }
}
function quantErr(ws, pts) { return meanOf(pts.map((x) => edist(x, ws[bmuOf(ws, x)]))); }   // 量子化誤差 = データと BMU の平均距離
function topoErr(ws, pts) {            // 位相誤差 = 1 番目と 2 番目に近いニューロンが格子でとなりでない割合
  return meanOf(pts.map((x) => { let o = ws.map((w, i) => [sqd(w, x), i]).sort((a, b) => a[0] - b[0]), a = o[0][1], b = o[1][1]; return Math.abs((a % GW) - (b % GW)) + Math.abs(Math.floor(a / GW) - Math.floor(b / GW)) === 1 ? 0 : 1; }));
}

function draw() {
  background(22, 24, 34);
  if (!paused) for (let s = 0; s < speed && tStep < TMAX; s++) { trainStep(neurons, dataPts[Math.floor(rnd() * dataPts.length)], tStep, sAlpha.val, sSigma.val); tStep++; if (tStep % 100 === 0) qeHist.push([tStep, quantErr(neurons, dataPts)]); }
  let side = Math.min(width - 480, height - 190), ox = 40, oy = 100;
  if (modeNo === 1) {                  // ---- 色の地図
    let c = side / GW; noStroke();
    for (let i = 0; i < neurons.length; i++) { let w = neurons[i]; fill(255 * clampv(w[0], 0, 1), 255 * clampv(w[1], 0, 1), 255 * clampv(w[2], 0, 1)); rect(ox + (i % GW) * c, oy + Math.floor(i / GW) * c, c - 2, c - 2, 4); }
  } else {                             // ---- 点の網
    let v = fitView(ox, oy, side, side, 0, 0, 2.4);
    noFill(); stroke(80); rect(v.x, v.y, v.w, v.h);
    noStroke(); fill(150, 150, 170); for (let p of dataPts) circle(gX(v, p[0]), gY(v, p[1]), 4);
    stroke(176, 140, 255); strokeWeight(1.5);
    for (let i = 0; i < neurons.length; i++) { let a = neurons[i]; if (i % GW < GW - 1) { let b = neurons[i + 1]; line(gX(v, a[0]), gY(v, a[1]), gX(v, b[0]), gY(v, b[1])); } if (i + GW < neurons.length) { let b = neurons[i + GW]; line(gX(v, a[0]), gY(v, a[1]), gX(v, b[0]), gY(v, b[1])); } }
    noStroke(); fill(255, 220, 120); for (let a of neurons) circle(gX(v, a[0]), gY(v, a[1]), 6);
  }
  // ---- 右
  drawSlider(sAlpha); drawSlider(sSigma);
  let bx = width - 360, al = alphaAt(tStep, sAlpha.val), sg = sigmaAt(tStep, sSigma.val);
  noStroke(); fill(220); textSize(15); textAlign(LEFT, BASELINE);
  text('学習 ' + tStep + ' / ' + TMAX + ' 回\nいまの α = ' + al.toFixed(3) + '　σ = ' + sg.toFixed(2) + ' マス', bx, 270);
  let g = { x: bx, y: 340, w: 300, h: Math.max(80, height - 600), x0: 0, x1: TMAX, y0: 0, y1: Math.max(...qeHist.map((q) => q[1])) * 1.05 };
  plotAxes(g, '学習の回数', '量子化誤差（データと BMU の平均距離）', [0, TMAX], [0, +g.y1.toPrecision(2)]);
  stroke(110, 230, 190); strokeWeight(2); polyline(qeHist.map((q) => [gX(g, q[0]), gY(g, q[1])]));
  // 近傍 h の形（格子の距離 0〜6）
  noStroke(); fill(205); textSize(13); text('近傍 h（格子の距離 0〜6 マス）', bx, height - 200);
  for (let dd = 0; dd <= 6; dd++) { let hv = Math.exp(-(dd * dd) / (2 * sg * sg)); fill(176, 140, 255); rect(bx + dd * 42, height - 100 - 70 * hv, 32, 70 * hv); fill(170); textAlign(CENTER, TOP); text(dd, bx + dd * 42 + 16, height - 96); textAlign(LEFT, BASELINE); }
  // ---- 文字
  fill(240); textSize(20);
  text('自己組織化マップ　' + (modeNo === 1 ? '1 色の地図（ランダムな色 400 個）' : '2 点の網（' + SHAPES[shapeNo] + '）') + '　量子化誤差 ' + qeHist[qeHist.length - 1][1].toFixed(4) + (tStep >= TMAX ? '　学習おわり' : ''), 40, 40);
  fill(170); textSize(15); text('1 色の地図　2 点の網　D データの形　スライダ α0・σ0（R で反映）　スペース 一時停止' + (paused ? '中' : '') + '　↑↓ 速さ ' + speed + '　R 最初から', 40, 66);
  drawSelfTest(width - 170, height - 12);
}

function mousePressed() { sliderPress(sAlpha, mouseX, mouseY) || sliderPress(sSigma, mouseX, mouseY); }
function mouseDragged() { sliderDrag(sAlpha, mouseX); sliderDrag(sSigma, mouseX); }
function mouseReleased() { if (sAlpha.drag || sSigma.drag) { sAlpha.drag = sSigma.drag = false; reset(); } }
function keyPressed() {
  if (key === '1' || key === '2') { modeNo = +key; reset(); }
  if (key === 'd' || key === 'D') { shapeNo = (shapeNo + 1) % SHAPES.length; if (modeNo === 1) modeNo = 2; reset(); }
  if (key === ' ') paused = !paused;
  if (key === UP_ARROW) speed = Math.min(100, speed * 2);
  if (key === DOWN_ARROW) speed = Math.max(1, Math.floor(speed / 2));
  if (key === 'r' || key === 'R') { seedS++; reset(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let pts = makeData(2, 0, 300, 5), ws = initNeurons(2, 6), bmuOk = true;
  seedRng(7);
  for (let t = 0; t < 100; t++) { let x = [-1 + 2 * rnd(), -1 + 2 * rnd()], b = bmuOf(ws, x); if (ws.some((w) => sqd(w, x) < sqd(ws[b], x))) bmuOk = false; }
  check('BMU = いちばん近いニューロン（全部と比べる、100 回）', bmuOk);
  let hOk = neigh(34, 34, 2) === 1 && near(neigh(34, 35, 2), neigh(35, 34, 2), 1e-15) && neigh(34, 35, 2) > neigh(34, 36, 2) && neigh(34, 36, 2) > neigh(34, 56, 2);
  check('近傍 h：BMU 自身で 1、対称、格子の距離が遠いほど小さい', hOk);
  let qe0 = quantErr(ws, pts), mid = 0, inside = true;
  for (let t = 0; t < TMAX; t++) { trainStep(ws, pts[Math.floor(rnd() * pts.length)], t, 0.5, 4); if (t === TMAX / 2) mid = quantErr(ws, pts); if (ws.some((w) => Math.abs(w[0]) > 1 || Math.abs(w[1]) > 1)) inside = false; }
  let qe1 = quantErr(ws, pts);
  check('量子化誤差が減る：' + qe0.toFixed(3) + ' → ' + mid.toFixed(3) + ' → ' + qe1.toFixed(3), qe1 < mid && mid < qe0 && qe1 < 0.5 * qe0);
  check('重みはデータの四角 [−1, 1]² の外に出ない（動かす割合 α·h ≤ 1 なので、いつも内分点）', inside);
  let te = topoErr(ws, pts);
  check('正方形のデータで学習すると網がねじれない：位相誤差 ' + te.toFixed(3) + ' < 0.1', te < 0.1);
  let cs = makeData(1, 0, 300, 8), wc = initNeurons(3, 9); seedRng(10);
  for (let t = 0; t < TMAX; t += 2) trainStep(wc, cs[Math.floor(rnd() * cs.length)], t, 0.5, 4);
  let nb = [], rp = []; for (let i = 0; i < wc.length; i++) { if (i % GW < GW - 1) nb.push(edist(wc[i], wc[i + 1])); rp.push(edist(wc[i], wc[(i * 37 + 11) % wc.length])); }
  check('色の地図：となりのニューロンの色の差 ' + meanOf(nb).toFixed(3) + ' < ばらばらな組の差 ' + meanOf(rp).toFixed(3) + ' の半分', meanOf(nb) < 0.5 * meanOf(rp));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 1（色の地図）で学習を見よう。はじめはばらばらの色が、なめらかなグラデーションの地図になる
// 2. σ0 を 0.5 にすると（R で反映）？ となりを動かさないので地図がまだらになる。これはほぼ k-means
// 3. 2 → D で「輪」に。10 × 10 の網は輪の形にどう広がる？ 穴のところのニューロンはどうなる？
// 4. α0 を 1 にすると最初の動きが大きすぎる？ 0.05 だと学習が終わっても広がりきらない？
// 5. 13 のベクトル量子化（色を減らす）と比べよう。SOM の色の地図はパレットを「並べて」くれる

// ==================================================
// ここから下は「クラスタリングの道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 共通：値をはさむ・クラスタの色・距離（点は [x, y] や [r, g, b] のような配列）
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
const PAL = [[176, 140, 255], [110, 230, 190], [255, 190, 80], [110, 180, 255], [255, 120, 130], [200, 240, 110], [255, 150, 220], [90, 210, 220], [255, 150, 70], [190, 190, 255]];
function palC(k, a) {                  // クラスタ k の色（k < 0 = ノイズ = 灰色）
  let al = a === undefined ? 255 : a;
  if (k < 0) return color(120, 120, 135, al);
  let c = PAL[k % PAL.length]; return color(c[0], c[1], c[2], al);
}
function sqd(a, b) { let s = 0; for (let i = 0; i < a.length; i++) { let d = a[i] - b[i]; s += d * d; } return s; }   // 距離の 2 乗
function edist(a, b) { return Math.sqrt(sqd(a, b)); }                                                              // ユークリッド距離
function meanOf(arr) { if (!arr.length) return 0; let s = 0; for (let v of arr) s += v; return s / arr.length; }
// ---- 種つきの乱数（同じ種なら毎回同じ列）
let rngState = 1, gaussSpare = null;
function seedRng(s) { rngState = (s >>> 0) || 1; gaussSpare = null; }
function rnd() {                       // 0〜1 の一様乱数（mulberry32）
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rndInt(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
function gauss() {                     // 標準正規分布（ボックス-ミュラー法）
  if (gaussSpare !== null) { let g = gaussSpare; gaussSpare = null; return g; }
  let u = 1 - rnd(), v = rnd(), r = Math.sqrt(-2 * Math.log(u));
  gaussSpare = r * Math.sin(2 * Math.PI * v); return r * Math.cos(2 * Math.PI * v);
}
// ---- グラフと図の道具：g = { x, y, w, h, x0, x1, y0, y1 }（画面の四角とデータの範囲）
function gX(g, v) { return g.x + clampv((v - g.x0) / (g.x1 - g.x0), -0.02, 1.02) * g.w; }
function gY(g, v) { return g.y + g.h - clampv((v - g.y0) / (g.y1 - g.y0), -0.02, 1.02) * g.h; }
function invX(g, px) { return g.x0 + ((px - g.x) / g.w) * (g.x1 - g.x0); }
function invY(g, py) { return g.y0 + ((g.y + g.h - py) / g.h) * (g.y1 - g.y0); }
function inBox(g, px, py) { return px >= g.x && px <= g.x + g.w && py >= g.y && py <= g.y + g.h; }
function fitView(x, y, w, h, cx, cy, span) {   // 縦横の縮尺をそろえる（span = 短い辺に入るデータの幅）
  let s = Math.min(w, h) / span; return { x, y, w, h, x0: cx - w / 2 / s, x1: cx + w / 2 / s, y0: cy - h / 2 / s, y1: cy + h / 2 / s };
}
function plotAxes(g, xl, yl, xt, yt) {
  stroke(95); strokeWeight(1); noFill(); rect(g.x, g.y, g.w, g.h);
  noStroke(); fill(165); textSize(12); textAlign(CENTER, TOP);
  for (let v of xt) text(+v.toPrecision(3), gX(g, v), g.y + g.h + 4);
  textAlign(RIGHT, CENTER);
  for (let v of yt) text(+v.toPrecision(3), g.x - 5, gY(g, v));
  textAlign(LEFT, BASELINE); fill(205); textSize(13);
  text(xl, g.x + g.w - textWidth(xl), g.y + g.h + 30); text(yl, g.x, g.y - 8);
}
function polyline(pts) {               // 点が 2 つ以上あるときだけ折れ線を描く
  if (pts.length < 2) return;
  noFill(); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape();
}
function drawPts(g, pts, labels, r, al) {   // クラスタの色で点を描く（labels がなければ白）
  noStroke();
  for (let i = 0; i < pts.length; i++) { fill(labels ? palC(labels[i], al) : color(230, 230, 240, al === undefined ? 255 : al)); circle(gX(g, pts[i][0]), gY(g, pts[i][1]), r); }
}
// ---- かんたんなスライダ（ドラッグで値を変える）
function makeSlider(x, y, w, lo, hi, val, name, digits) { return { x, y, w, lo, hi, val, name, digits: digits === undefined ? 2 : digits, drag: false }; }
function drawSlider(s) {
  let u = (s.val - s.lo) / (s.hi - s.lo);
  stroke(90); strokeWeight(4); line(s.x, s.y, s.x + s.w, s.y);
  stroke(176, 140, 255); line(s.x, s.y, s.x + u * s.w, s.y);
  noStroke(); fill(s.drag ? 255 : 220); circle(s.x + u * s.w, s.y, 16);
  fill(200); textSize(14); textAlign(LEFT, BASELINE); text(s.name + ' = ' + s.val.toFixed(s.digits), s.x, s.y - 12);
}
function sliderPress(s, mx, my) { if (Math.abs(my - s.y) < 14 && mx > s.x - 10 && mx < s.x + s.w + 10) { s.drag = true; sliderDrag(s, mx); return true; } return false; }
function sliderDrag(s, mx) { if (!s.drag) return false; let v = s.lo + clampv((mx - s.x) / s.w, 0, 1) * (s.hi - s.lo); if (s.digits === 0) v = Math.round(v); s.val = v; return true; }
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) ? v.every(noNaN) : !(typeof v === 'number' && v !== v); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(120, 210, 150) : color(255, 90, 90)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
