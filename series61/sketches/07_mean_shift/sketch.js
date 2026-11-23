// ============================================
// 07 平均値シフト ─ 各点を「近くの点の重みつき平均」の位置へ動かす、をくり返すと、密度の山のてっぺん（モード）に集まる
//   重み = ガウス核 exp(−|x − x_i|² / 2h²)。h = カーネル幅（どれくらい遠くまで見るか）
//   動く量 m(x) − x は、密度 f（カーネル密度推定）の坂の向き ∇f に比例する → 山登り。同じ山に登った点 = 1 つのクラスタ
//   k を決めなくてよい。h が小さいと山がたくさん、大きいと山がなだらかに合わさって数が減る。背景 = 密度 f の等高線
// スライダ / ← → カーネル幅 h / スペース やり直す / D データ / R 新しいデータ / クリック 点を足す
// ============================================

const NPTS = 240;                      // ★ 点の数
const DKINDS = ['blobs', 'density', 'sizes', 'moons'];
let data, walkers = [], iter = 0, done = false, modes = [], labels = [], dataNo = 0, seedD = 71, view, sBw, heat = null, heatDirty = true;

function setup() {
  createCanvas(windowWidth, windowHeight); textWrap(CHAR);
  sBw = makeSlider(width - 340, 150, 280, 0.08, 1.2, 0.3, 'カーネル幅 h', 2);
  selfTest(); newData();
}
function newData() { data = makeDataset(DKINDS[dataNo], NPTS, seedD); restart(); }
function restart() { walkers = data.pts.map((p) => p.slice()); iter = 0; done = false; modes = []; labels = data.pts.map(() => -1); heatDirty = true; }

// ★ カーネル密度推定 f(x) = 1/(n·2πh²) Σ exp(−|x − x_i|² / 2h²)
function kde(x, pts, h) { let s = 0; for (let p of pts) s += Math.exp(-sqd(x, p) / (2 * h * h)); return s / (pts.length * 2 * Math.PI * h * h); }
// ★ 平均値シフトの 1 歩：重みつき平均へ
function msStep(x, pts, h) {
  let w = 0, sx = 0, sy = 0;
  for (let p of pts) { let k = Math.exp(-sqd(x, p) / (2 * h * h)); w += k; sx += k * p[0]; sy += k * p[1]; }
  return w > 1e-300 ? [sx / w, sy / w] : x.slice();
}
function runToEnd(pts, h, maxIt) {     // 全部の点を止まるまで動かす
  let ws = pts.map((p) => p.slice());
  for (let t = 0; t < (maxIt || 500); t++) { let mv = 0; ws = ws.map((x) => { let y = msStep(x, pts, h); mv = Math.max(mv, edist(x, y)); return y; }); if (mv < 1e-5 * h) break; }
  return ws;
}
function groupModes(ws, h) {           // h/2 より近くに止まった点は同じ山
  let ms = [], lab = ws.map((x) => { for (let j = 0; j < ms.length; j++) if (edist(x, ms[j]) < h / 2) return j; ms.push(x.slice()); return ms.length - 1; });
  return { modes: ms, labels: lab };
}

function draw() {
  background(22, 24, 34);
  let h = sBw.val;
  view = fitView(40, 100, width - 440, height - 190, 0, 0, 4.4);
  if (heatDirty && !sBw.drag) drawHeat();
  if (heat) image(heat, view.x, view.y, view.w, view.h);
  noFill(); stroke(80); rect(view.x, view.y, view.w, view.h);
  // ---- 1 フレームに 1 歩
  if (!done) {
    let mv = 0; walkers = walkers.map((x) => { let y = msStep(x, data.pts, h); mv = Math.max(mv, edist(x, y)); return y; }); iter++;
    if (mv < 1e-4 * h || iter > 400) { done = true; let g = groupModes(walkers, h); modes = g.modes; labels = g.labels; }
  }
  stroke(255, 255, 255, 40); strokeWeight(1);
  for (let i = 0; i < data.pts.length; i++) line(gX(view, data.pts[i][0]), gY(view, data.pts[i][1]), gX(view, walkers[i][0]), gY(view, walkers[i][1]));
  drawPts(view, data.pts, done ? labels : null, 6, done ? 255 : 150);
  noStroke(); fill(255, 240, 150); for (let w of walkers) circle(gX(view, w[0]), gY(view, w[1]), 5);
  modes.forEach((m, j) => { stroke(20); strokeWeight(2); fill(palC(j)); triangle(gX(view, m[0]), gY(view, m[1]) - 11, gX(view, m[0]) - 9, gY(view, m[1]) + 6, gX(view, m[0]) + 9, gY(view, m[1]) + 6); });
  // カーネル幅の円（マウスの位置）
  if (inBox(view, mouseX, mouseY)) { noFill(); stroke(255, 255, 255, 80); circle(mouseX, mouseY, 2 * h * (gX(view, 1) - gX(view, 0))); circle(mouseX, mouseY, 4 * h * (gX(view, 1) - gX(view, 0))); }
  // ---- 右
  drawSlider(sBw);
  let bx = width - 340; noStroke(); fill(220); textSize(15); textAlign(LEFT, BASELINE);
  text(done ? '止まった：' + iter + ' 歩\n山（モード）の数 = ' + modes.length + '\nARI（正解と）= ' + ariScore(labels, data.truth).toFixed(3) : '山登り中… ' + iter + ' 歩', bx, 210);
  fill(150); textSize(13);
  text('黄色の点 = 動いている点、線 = もとの位置からの道のり、▲ = 山のてっぺん（モード）。背景の明るさ = 密度 f、しま = 等高線。白い円 = マウスの位置の h と 2h（重みが効く範囲）', bx, 320, 300);
  text('いちばん近い山 = 1 つのクラスタ。m(x) − x = h²·∇f(x) / f(x) なので、点は密度の坂をまっすぐ登る（自己テストで確認）', bx, 470, 300);
  // ---- 文字
  fill(240); textSize(20);
  text('平均値シフト　h = ' + h.toFixed(2) + '　→ 山 ' + (done ? modes.length : '?') + ' 個　' + DATA_JA[DKINDS[dataNo]], 40, 40);
  fill(170); textSize(15); text('スライダ または ← → カーネル幅 h　スペース やり直す　D データ　R 新しいデータ　クリック 点を足す', 40, 66);
  drawSelfTest(width - 170, height - 12);
}
function drawHeat() {                  // 密度 f の等高線（4 ピクセルに 1 回だけ計算）
  let w = Math.ceil(view.w / 4), hh = Math.ceil(view.h / 4), h = sBw.val, vals = new Float64Array(w * hh), mx = 1e-12;
  if (!heat || heat.width !== w || heat.height !== hh) { heat = createGraphics(w, hh); heat.pixelDensity(1); }
  for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) { let v = kde([view.x0 + ((x + 0.5) / w) * (view.x1 - view.x0), view.y1 - ((y + 0.5) / hh) * (view.y1 - view.y0)], data.pts, h); vals[x + w * y] = v; mx = Math.max(mx, v); }
  heat.loadPixels();
  for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) {
    let u = vals[x + w * y] / mx, lv = Math.floor(u * 10), edge = (x + 1 < w && Math.floor((vals[x + 1 + w * y] / mx) * 10) !== lv) || (y + 1 < hh && Math.floor((vals[x + w * (y + 1)] / mx) * 10) !== lv), i = 4 * (x + w * y);
    heat.pixels[i] = 22 + 60 * u + (edge ? 50 : 0); heat.pixels[i + 1] = 24 + 40 * u + (edge ? 40 : 0); heat.pixels[i + 2] = 34 + 110 * u + (edge ? 50 : 0); heat.pixels[i + 3] = 255;
  }
  heat.updatePixels(); heatDirty = false;
}

function mousePressed() {
  if (sliderPress(sBw, mouseX, mouseY)) return;
  if (view && inBox(view, mouseX, mouseY)) { data.pts.push([invX(view, mouseX), invY(view, mouseY)]); data.truth.push(0); restart(); }
}
function mouseDragged() { sliderDrag(sBw, mouseX); }
function mouseReleased() { if (sBw.drag) { sBw.drag = false; restart(); } }
function keyPressed() {
  if (key === RIGHT_ARROW || key === LEFT_ARROW) { sBw.val = clampv(sBw.val + (key === RIGHT_ARROW ? 0.02 : -0.02), sBw.lo, sBw.hi); restart(); }
  if (key === ' ') restart();
  if (key === 'd' || key === 'D') { dataNo = (dataNo + 1) % DKINDS.length; newData(); }
  if (key === 'r' || key === 'R') { seedD++; newData(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let d = makeDataset('blobs', 90, 77), h = 0.3, up = true;
  seedRng(3);
  for (let t = 0; t < 40; t++) { let x = [-2 + 4 * rnd(), -2 + 4 * rnd()]; for (let s = 0; s < 25; s++) { let y = msStep(x, d.pts, h); if (kde(y, d.pts, h) < kde(x, d.pts, h) * (1 - 1e-12)) up = false; x = y; } }
  check('平均値シフトの 1 歩で、密度 f は決して下がらない（40 点 × 25 歩）', up);
  let gradOk = true, e = 1e-5;
  for (let t = 0; t < 20; t++) {
    let x = [-2 + 4 * rnd(), -2 + 4 * rnd()], f = kde(x, d.pts, h), gx = (kde([x[0] + e, x[1]], d.pts, h) - kde([x[0] - e, x[1]], d.pts, h)) / (2 * e), gy = (kde([x[0], x[1] + e], d.pts, h) - kde([x[0], x[1] - e], d.pts, h)) / (2 * e), m = msStep(x, d.pts, h);
    if (f > 1e-6 && (Math.abs(m[0] - x[0] - (h * h * gx) / f) > 1e-5 || Math.abs(m[1] - x[1] - (h * h * gy) / f) > 1e-5)) gradOk = false;
  }
  check('動く量 m(x) − x = h²·∇f(x) / f(x)（数値微分と比べる、20 点）', gradOk);
  let ws = runToEnd(d.pts, h), g = groupModes(ws, h), still = true, peak = true;
  for (let m of g.modes) {
    if (edist(msStep(m, d.pts, h), m) > 1e-4 * h) still = false;
    let fm = kde(m, d.pts, h); for (let a = 0; a < 8; a++) if (kde([m[0] + 0.05 * h * Math.cos(a), m[1] + 0.05 * h * Math.sin(a)], d.pts, h) > fm * (1 + 1e-9)) peak = false;
  }
  check('止まった点（モード）では m(x) ≈ x（坂の傾き ≈ 0）', still);
  check('モードは密度の山のてっぺん：周りの 8 方向より f が大きい', peak);
  let ari = ariScore(g.labels, d.truth);
  check('離れた 3 つのかたまり（h = 0.3）で山はちょうど 3 個、ARI = ' + ari.toFixed(3) + ' ≥ 0.95', g.modes.length === 3 && ari >= 0.95);
  let cnt = [0.15, 0.3, 0.6, 1.2, 2.4].map((hh) => groupModes(runToEnd(d.pts, hh, 150), hh).modes.length);
  check('h を大きくすると山の数は減っていく：' + cnt.join(' → '), cnt.every((v, i) => i === 0 || v <= cnt[i - 1]) && cnt[cnt.length - 1] === 1);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. スライダで h をゆっくり大きくして、山の数が 多い → 3 → 1 と変わるところを探そう（手を離すと計算しなおす）
// 2. 「密度がちがう」（D）では、h をどうすれば 3 つに分かれる？ 1 つの h では難しいことも
// 3. 三日月（D）では、山は三日月の上に何個できる？ 平均値シフトも「丸い山」を探している
// 4. 何もないところをクリックして点を 1 つ足すと、その点だけの小さな山ができる？（h しだい）
// 5. 05 の木の高さと同じように、h は「どれくらいの細かさで見るか」の目盛り

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
// ---- 正解との一致：分割表、純度、調整ランド指数（ARI）、正規化相互情報量（NMI）。ラベル −1（ノイズ）も 1 つのグループとして数える
function contingency(a, b) {
  let ra = [...new Set(a)].sort((x, y) => x - y), cb = [...new Set(b)].sort((x, y) => x - y), ia = new Map(ra.map((v, i) => [v, i])), ib = new Map(cb.map((v, i) => [v, i]));
  let M = ra.map(() => new Array(cb.length).fill(0));
  for (let i = 0; i < a.length; i++) M[ia.get(a[i])][ib.get(b[i])]++;
  return { M, ra, cb };
}
function comb2(x) { return (x * (x - 1)) / 2; }
function ariScore(a, b) {
  let { M } = contingency(a, b), n = a.length, sij = 0, sa = 0, sb = 0, colS = new Array(M[0].length).fill(0);
  for (let r of M) { let rs = 0; r.forEach((v, j) => { sij += comb2(v); rs += v; colS[j] += v; }); sa += comb2(rs); }
  for (let v of colS) sb += comb2(v);
  let expv = (sa * sb) / Math.max(1, comb2(n)), maxv = (sa + sb) / 2;
  return maxv - expv === 0 ? 1 : (sij - expv) / (maxv - expv);
}
function nmiScore(a, b) {              // NMI = 2·I(A; B) / (H(A) + H(B))
  let { M } = contingency(a, b), n = a.length, rs = M.map((r) => r.reduce((s, v) => s + v, 0)), cs = M[0].map((_, j) => M.reduce((s, r) => s + r[j], 0));
  let H = (arr) => -arr.reduce((s, v) => s + (v > 0 ? (v / n) * Math.log(v / n) : 0), 0), mi = 0;
  M.forEach((r, i) => r.forEach((v, j) => { if (v > 0) mi += (v / n) * Math.log((n * v) / (rs[i] * cs[j])); }));
  let hs = H(rs) + H(cs); return hs === 0 ? 1 : clampv((2 * mi) / hs, 0, 1);
}
function purityScore(pred, truth) { let { M } = contingency(pred, truth); return M.reduce((s, r) => s + Math.max(...r), 0) / pred.length; }
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
