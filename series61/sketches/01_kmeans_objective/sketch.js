// ============================================
// 01 k-means は「最小化」─ 目的関数 = 慣性（各点と自分の中心の距離² の合計）J = Σ |x_i − c(i)|²
//   ① 割り当て（中心を固定して、各点をいちばん近い中心へ）② 更新（仲間を固定して、中心を平均へ）。どちらも J を減らすか同じにする
//   → J は必ず止まる。ただし「いちばん小さい J」とは限らない（初めの中心しだい）→ k-means++ と「10 回やり直して最良」
//   背景の色 = いちばん近い中心の領域 = ボロノイ図（シリーズ 22）。基本の k-means はシリーズ 17 の 10。ここはその発展
// スペース 半ステップ / A 自動 / I ランダム初期化 / P k-means++ 初期化 / B 10 回ずつやり直して比べる / ↑↓ k / クリック 点を足す / R 新しいデータ
// ============================================

const NPTS = 300;                      // ★ 点の数
let data, centers = [], labels = [], hist = [], nextAssign = false, kNum = 6, auto = false, seedD = 11, seedI = 1;
let restarts = null, view, cellBuf = null, cellDirty = true, initName = '', timer = 0;

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); selfTest(); newData(); }
function blobs6(seed) {                // 6 つのかたまり（2 つずつ近い）
  seedRng(seed);
  let sp = [];
  for (let j = 0; j < 6; j++) { let a = (TWO_PI * Math.floor(j / 2)) / 3 + 0.5, r = 1.25; sp.push({ n: NPTS / 6, c: [r * Math.cos(a) + (j % 2 ? 0.28 : -0.28) * Math.sin(a), r * Math.sin(a) - (j % 2 ? 0.28 : -0.28) * Math.cos(a)], sd: [0.12, 0.12] }); }
  return makeBlobs(sp);
}
function newData() { data = blobs6(seedD); restarts = null; initCenters(true); }
// ★ 初期化：usePP = true なら k-means++、false ならランダム
function initCenters(usePP) {
  seedRng(1000 + seedI++);
  centers = usePP ? initPlusPlus(data.pts, kNum) : initRandomCenters(data.pts, kNum);
  labels = assignLabels(data.pts, centers); hist = [inertiaOf(data.pts, centers, labels)]; nextAssign = false;
  initName = usePP ? 'k-means++' : 'ランダム'; cellDirty = true;
}
// ★ 半ステップ：更新 → 割り当て → 更新 … J を記録
function halfStep() {
  if (nextAssign) labels = assignLabels(data.pts, centers); else centers = updateCenters(data.pts, labels, centers);
  nextAssign = !nextAssign; hist.push(inertiaOf(data.pts, centers, labels)); cellDirty = true;
  if (hist.length > 200) hist.splice(1, 1);
}
function runRestarts() {               // ランダム初期化と k-means++ をそれぞれ 10 回
  seedRng(500 + seedD);
  let rr = [], pp = [];
  for (let r = 0; r < 10; r++) rr.push(lloyd(data.pts, initRandomCenters(data.pts, kNum), 100));
  for (let r = 0; r < 10; r++) pp.push(lloyd(data.pts, initPlusPlus(data.pts, kNum), 100));
  restarts = { rr: rr.map((x) => x.inertia), pp: pp.map((x) => x.inertia) };
  let best = pp.concat(rr).reduce((a, b) => (b.inertia < a.inertia ? b : a));
  centers = best.centers; labels = best.labels; hist = [best.inertia]; nextAssign = false; initName = '20 回の中の最良'; cellDirty = true;
}

function draw() {
  background(22, 24, 34);
  view = fitView(40, 100, width * 0.58, height - 170, 0, 0, 3.6);
  if (auto && ++timer % 20 === 0) halfStep();
  if (cellDirty) drawCells();
  image(cellBuf, view.x, view.y, view.w, view.h);
  noFill(); stroke(80); rect(view.x, view.y, view.w, view.h);
  // 点 → 中心の線、点、中心
  stroke(255, 255, 255, 30); strokeWeight(1);
  for (let i = 0; i < data.pts.length; i++) line(gX(view, data.pts[i][0]), gY(view, data.pts[i][1]), gX(view, centers[labels[i]][0]), gY(view, centers[labels[i]][1]));
  drawPts(view, data.pts, labels, 7);
  centers.forEach((c, j) => { stroke(20); strokeWeight(2); fill(palC(j)); rect(gX(view, c[0]) - 8, gY(view, c[1]) - 8, 16, 16); });
  // ---- 右：J のグラフ
  let gx = view.x + view.w + 70, gw = width - gx - 40, J = hist[hist.length - 1];
  let g1 = { x: gx, y: 130, w: gw, h: 210, x0: 0, x1: Math.max(10, hist.length - 1), y0: 0, y1: Math.max(...hist) * 1.05 };
  plotAxes(g1, '半ステップ', '慣性 J（目的関数）', [0, g1.x1], [0, +g1.y1.toPrecision(2)]);
  stroke(255, 220, 120); strokeWeight(2); polyline(hist.map((v, i) => [gX(g1, i), gY(g1, v)]));
  noStroke(); hist.forEach((v, i) => { if (i > 0) { fill(i % 2 ? color(255, 170, 70) : color(110, 180, 255)); circle(gX(g1, i), gY(g1, v), 6); } });
  // ---- 右下：やり直しの比較
  let g2 = { x: gx, y: 420, w: gw, h: 170 };
  fill(205); textSize(13); textAlign(LEFT, BASELINE);
  if (restarts) {
    let all = restarts.rr.concat(restarts.pp), lo = Math.min(...all), hi = Math.max(...all), bw = g2.w / 22;
    text('B：10 回ずつやり直した最後の J（低いほどよい）', g2.x, g2.y - 8);
    all.forEach((v, i) => { let x = g2.x + (i < 10 ? i : i + 2) * bw, h = 20 + ((v - lo) / Math.max(1e-9, hi - lo)) * (g2.h - 30); fill(i < 10 ? color(255, 120, 130) : color(110, 230, 190)); rect(x, g2.y + g2.h - h, bw - 3, h); });
    fill(255, 140, 150); text('ランダム 平均 ' + meanOf(restarts.rr).toFixed(2), g2.x, g2.y + g2.h + 20);
    fill(130, 235, 200); text('k-means++ 平均 ' + meanOf(restarts.pp).toFixed(2), g2.x + g2.w / 2, g2.y + g2.h + 20);
    fill(200); text('いちばん小さい J = ' + lo.toFixed(3) + '（同じ値が何回出た？）', g2.x, g2.y + g2.h + 42);
  } else { fill(150); text('B を押すと、ランダム初期化と k-means++ を 10 回ずつ最後まで回して比べる', g2.x, g2.y, g2.w); }
  // ---- 文字
  textAlign(LEFT, BASELINE); fill(240); textSize(20);
  text('k-means は最小化　k = ' + kNum + '　J = ' + J.toFixed(3) + '　初期化：' + initName + '　次は ' + (nextAssign ? '① 割り当て（青）' : '② 更新（オレンジ）'), 40, 40);
  fill(170); textSize(15); text('スペース 半ステップ　A 自動' + (auto ? '（再生中）' : '') + '　I ランダム　P k-means++　B やり直しを比べる　↑↓ k　クリック 点を足す　R 新しいデータ', 40, 66);
  fill(150); textSize(13);
  text('背景の色 = いちばん近い中心の領域（ボロノイ図）。境界は 2 つの中心の垂直二等分線なので、k-means の「仲間の形」はいつも凸', 40, height - 48, view.w);
  drawSelfTest(width - 170, height - 12);
}
function drawCells() {                 // ボロノイ図（4 ピクセルに 1 回だけ計算）
  let w = Math.ceil(view.w / 4), h = Math.ceil(view.h / 4);
  if (!cellBuf || cellBuf.width !== w || cellBuf.height !== h) { cellBuf = createGraphics(w, h); cellBuf.pixelDensity(1); }
  cellBuf.loadPixels();
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let p = [view.x0 + ((x + 0.5) / w) * (view.x1 - view.x0), view.y1 - ((y + 0.5) / h) * (view.y1 - view.y0)], c = PAL[nearestCenter(p, centers) % PAL.length], i = 4 * (x + w * y);
    cellBuf.pixels[i] = 22 + c[0] * 0.16; cellBuf.pixels[i + 1] = 24 + c[1] * 0.16; cellBuf.pixels[i + 2] = 34 + c[2] * 0.16; cellBuf.pixels[i + 3] = 255;
  }
  cellBuf.updatePixels(); cellDirty = false;
}

function mousePressed() {
  if (view && inBox(view, mouseX, mouseY)) { data.pts.push([invX(view, mouseX), invY(view, mouseY)]); data.truth.push(0); labels = assignLabels(data.pts, centers); hist.push(inertiaOf(data.pts, centers, labels)); nextAssign = false; cellDirty = true; }
}
function keyPressed() {
  if (key === ' ') halfStep();
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'i' || key === 'I') initCenters(false);
  if (key === 'p' || key === 'P') initCenters(true);
  if (key === 'b' || key === 'B') runRestarts();
  if (key === UP_ARROW || key === DOWN_ARROW) { kNum = clampv(kNum + (key === UP_ARROW ? 1 : -1), 2, 10); restarts = null; initCenters(true); }
  if (key === 'r' || key === 'R') { seedD++; newData(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let d = blobs6(77), mono = true, assignOpt = true, stops = true, jr = [], jp = [];
  seedRng(7);
  for (let t = 0; t < 30; t++) {
    let k = 3 + (t % 6), res = lloyd(d.pts, initRandomCenters(d.pts, k), 100);
    if (!res.hist.every((v, i) => i === 0 || v <= res.hist[i - 1] + 1e-9)) mono = false;
    if (res.iters >= 100) stops = false;
    d.pts.forEach((p, i) => { if (res.centers.some((c) => sqd(p, c) < sqd(p, res.centers[res.labels[i]]) - 1e-12)) assignOpt = false; });
  }
  check('ロイドの J は半ステップごとに決して増えない（30 回、k = 3〜8）', mono);
  check('割り当てのあと、どの点も「いちばん近い中心」の仲間（ほかの中心のほうが近い点は 0 個）', assignOpt);
  let pts = d.pts.slice(0, 50), cen = pts.reduce((s, p) => [s[0] + p[0] / 50, s[1] + p[1] / 50], [0, 0]), sse = (c) => pts.reduce((s, p) => s + sqd(p, c), 0), idOk = true;
  for (let t = 0; t < 20; t++) { let dl = [gauss() * 0.3, gauss() * 0.3]; if (!near(sse([cen[0] + dl[0], cen[1] + dl[1]]), sse(cen) + 50 * (dl[0] ** 2 + dl[1] ** 2), 1e-9)) idOk = false; }
  check('平均がいちばん良い中心：J(平均 + δ) = J(平均) + n·|δ|²（ずらすと必ず増える）', idOk);
  seedRng(8);
  for (let t = 0; t < 30; t++) { jr.push(lloyd(d.pts, initRandomCenters(d.pts, 6), 100).inertia); jp.push(lloyd(d.pts, initPlusPlus(d.pts, 6), 100).inertia); }
  check('k-means++ の J の平均 ' + meanOf(jp).toFixed(2) + ' ≤ ランダム初期化の平均 ' + meanOf(jr).toFixed(2) + '（30 回ずつ、k = 6）', meanOf(jp) <= meanOf(jr));
  check('ロイドは有限回で止まる（ラベルが変わらなくなる、30 回とも 100 回以内）', stops);
  let cs = initPlusPlus(d.pts, 5), convex = true;
  for (let t = 0; t < 300; t++) { let a = [-2 + 4 * rnd(), -2 + 4 * rnd()], b = [-2 + 4 * rnd(), -2 + 4 * rnd()]; if (nearestCenter(a, cs) === nearestCenter(b, cs) && nearestCenter([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], cs) !== nearestCenter(a, cs)) convex = false; }
  check('ボロノイの領域は凸：同じ領域の 2 点の中点も同じ領域（300 組）', convex);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. I（ランダム）で始めてスペースを何回も押し、J のグラフが階段のように下がって止まるのを見よう
// 2. I を何回か押してから A で自動再生。2 つのかたまりを 1 つの中心が取ってしまう「悪い止まり方」を探そう
// 3. B で 10 回ずつ比べる。k-means++ のほうが平均の J が小さいのはなぜ？（遠い点から順に中心を選ぶ）
// 4. ↑↓ で k を変えると J はどうなる？ k を増やすと J は小さくなる一方 → k は J だけでは選べない（02）
// 5. 背景のボロノイ図の境界は、2 つの中心の垂直二等分線。シリーズ 22 のボロノイ図と同じもの

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
// ---- 合成データ（種つき）。どれも { pts, truth（正解のグループ番号）, k（正解のグループ数）} を返す
// blob = { n, c: [中心 x, y], sd: [長い向きの標準偏差, 短い向き], rot: 傾き（ラジアン）}
function makeBlobs(specs) {
  let pts = [], truth = [];
  specs.forEach((s, k) => {
    let cr = Math.cos(s.rot || 0), sr = Math.sin(s.rot || 0);
    for (let i = 0; i < s.n; i++) { let a = gauss() * s.sd[0], b = gauss() * s.sd[1]; pts.push([s.c[0] + cr * a - sr * b, s.c[1] + sr * a + cr * b]); truth.push(k); }
  });
  return { pts, truth, k: specs.length };
}
function makeMoons(n, noise) {         // 2 つの三日月（かみ合った半円）
  let pts = [], truth = [];
  for (let i = 0; i < n; i++) {
    let k = i % 2, t = rnd() * Math.PI, x = k ? 1 - Math.cos(t) : Math.cos(t), y = k ? 0.5 - Math.sin(t) : Math.sin(t);
    pts.push([(x - 0.5) * 1.6 + gauss() * noise, (y - 0.25) * 1.6 + gauss() * noise]); truth.push(k);
  }
  return { pts, truth, k: 2 };
}
function makeCircles(n, noise, inner) { // 同心円（外の輪と内の輪。点の数は輪の長さに比例）
  let pts = [], truth = [], nOut = Math.round((n * 1.3) / (1.3 + inner));
  for (let i = 0; i < n; i++) { let k = i < nOut ? 0 : 1, t = rnd() * 2 * Math.PI, r = k ? inner : 1.3; pts.push([r * Math.cos(t) + gauss() * noise, r * Math.sin(t) + gauss() * noise]); truth.push(k); }
  return { pts, truth, k: 2 };
}
const DATA_JA = { blobs: 'かたまり', moons: '三日月', circles: '同心円', aniso: '細長い', density: '密度がちがう', sizes: '大きさがちがう', noise: 'かたまり + 外れ値', chain: '鎖でつながる' };
function makeDataset(kind, n, seed) {
  seedRng(seed);
  if (kind === 'moons') return makeMoons(n, 0.07);
  if (kind === 'circles') return makeCircles(n, 0.05, 0.55);
  if (kind === 'aniso') { let m = Math.floor(n / 3); return makeBlobs([{ n: m, c: [-0.6, 0.9], sd: [0.9, 0.1], rot: 0.5 }, { n: m, c: [0, 0], sd: [0.9, 0.1], rot: 0.5 }, { n: n - 2 * m, c: [0.6, -0.9], sd: [0.9, 0.1], rot: 0.5 }]); }
  if (kind === 'density') { let m = Math.floor(n * 0.45); return makeBlobs([{ n: m, c: [-0.9, 0.3], sd: [0.12, 0.12] }, { n: m, c: [-0.3, 0.3], sd: [0.12, 0.12] }, { n: n - 2 * m, c: [0.9, -0.2], sd: [0.65, 0.65] }]); }
  if (kind === 'sizes') { let m = Math.floor(n * 0.12); return makeBlobs([{ n: n - 2 * m, c: [-0.5, 0], sd: [0.6, 0.6] }, { n: m, c: [0.85, 0.75], sd: [0.1, 0.1] }, { n: m, c: [0.85, -0.75], sd: [0.1, 0.1] }]); }
  if (kind === 'chain') {
    let m = Math.floor(n * 0.4), d = makeBlobs([{ n: m, c: [-1.2, 0], sd: [0.25, 0.25] }, { n: m, c: [1.2, 0], sd: [0.25, 0.25] }]), rest = n - 2 * m;
    for (let i = 0; i < rest; i++) { d.pts.push([-0.8 + (1.6 * (i + 0.5)) / rest, 0.04 * gauss()]); d.truth.push(i < rest / 2 ? 0 : 1); }
    return d;
  }
  let m = Math.floor(n / 3), d = makeBlobs([{ n: m, c: [-1, 0.7], sd: [0.25, 0.25] }, { n: m, c: [1, 0.6], sd: [0.3, 0.22], rot: 0.4 }, { n: n - 2 * m, c: [0, -0.9], sd: [0.28, 0.28] }]);
  if (kind === 'noise') { let q = Math.floor(n * 0.08); for (let i = 0; i < q; i++) { d.pts.push([-2 + 4 * rnd(), -1.8 + 3.6 * rnd()]); d.truth.push(-1); } }
  return d;
}
// ---- k-means（ロイドのアルゴリズム）。目的関数 = 慣性 = Σ |x_i − 中心|²
function nearestCenter(p, centers) { let best = 0, bd = Infinity; for (let j = 0; j < centers.length; j++) { let d = sqd(p, centers[j]); if (d < bd) { bd = d; best = j; } } return best; }
function assignLabels(pts, centers) { return pts.map((p) => nearestCenter(p, centers)); }        // ① 割り当て
function inertiaOf(pts, centers, labels) { let s = 0; for (let i = 0; i < pts.length; i++) s += sqd(pts[i], centers[labels[i]]); return s; }
function updateCenters(pts, labels, centers) {                                                     // ② 更新（仲間の平均。仲間 0 なら動かさない）
  let k = centers.length, dim = centers[0].length, sum = centers.map(() => new Array(dim).fill(0)), cnt = new Array(k).fill(0);
  for (let i = 0; i < pts.length; i++) { let l = labels[i]; cnt[l]++; for (let d = 0; d < dim; d++) sum[l][d] += pts[i][d]; }
  return sum.map((s, j) => (cnt[j] ? s.map((v) => v / cnt[j]) : centers[j].slice()));
}
function initRandomCenters(pts, k) {   // ランダムに k 点えらぶ（重ならないように）
  if (!pts.length) return Array.from({ length: k }, () => [0, 0]);
  let idx = pts.map((_, i) => i), out = [];
  for (let j = 0; j < Math.min(k, pts.length); j++) { let r = j + Math.floor(rnd() * (idx.length - j)); [idx[j], idx[r]] = [idx[r], idx[j]]; out.push(pts[idx[j]].slice()); }
  while (out.length < k) out.push(pts[0].slice());
  return out;
}
function initPlusPlus(pts, k) {        // k-means++：今ある中心から遠い点ほど（距離² に比例して）えらばれやすい
  if (!pts.length) return Array.from({ length: k }, () => [0, 0]);
  let out = [pts[Math.floor(rnd() * pts.length)].slice()], d2 = pts.map((p) => sqd(p, out[0]));
  while (out.length < k) {
    let tot = 0; for (let v of d2) tot += v;
    let r = rnd() * tot, pick = pts.length - 1;
    if (tot > 0) { for (let i = 0; i < pts.length; i++) { r -= d2[i]; if (r <= 0) { pick = i; break; } } } else pick = Math.floor(rnd() * pts.length);
    out.push(pts[pick].slice());
    for (let i = 0; i < pts.length; i++) d2[i] = Math.min(d2[i], sqd(pts[i], pts[pick]));
  }
  return out;
}
// 最後まで回す。hist = 半ステップ（割り当て・更新）ごとの慣性
function lloyd(pts, centers0, maxIter) {
  let centers = centers0.map((c) => c.slice()), labels = assignLabels(pts, centers), hist = [inertiaOf(pts, centers, labels)], iters = 0;
  for (let it = 0; it < (maxIter || 100); it++) {
    let nc = updateCenters(pts, labels, centers); hist.push(inertiaOf(pts, nc, labels));
    let nl = assignLabels(pts, nc); hist.push(inertiaOf(pts, nc, nl));
    centers = nc; iters++;
    let same = nl.every((v, i) => v === labels[i]); labels = nl;
    if (same) break;
  }
  return { centers, labels, inertia: hist[hist.length - 1], hist, iters };
}
function kmeansBest(pts, k, restarts, usePP, maxIter) {   // restarts 回やり直して慣性がいちばん小さいものを選ぶ
  let best = null, all = [];
  for (let r = 0; r < restarts; r++) { let res = lloyd(pts, usePP ? initPlusPlus(pts, k) : initRandomCenters(pts, k), maxIter); all.push(res.inertia); if (!best || res.inertia < best.inertia) best = res; }
  best.all = all; return best;
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
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) ? v.every(noNaN) : !(typeof v === 'number' && v !== v); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(120, 210, 150) : color(255, 90, 90)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
