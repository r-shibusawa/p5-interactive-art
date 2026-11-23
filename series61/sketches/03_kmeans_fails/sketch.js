// ============================================
// 03 k-means が苦手な形 ─ k-means は「中心からの距離」だけで分ける → 仲間の形はいつも凸（ボロノイの領域）で、丸くて同じ大きさが前提
//   三日月・同心円・細長い・密度がちがう・大きさがちがう、の 5 つで k-means（k = 本当の数、k-means++ で 10 回の最良）を試す
//   左 = 正解、右 = k-means。調整ランド指数 ARI（1 = 完全に一致、0 = でたらめと同じ）で比べる（測り方は 10）
//   おもしろいところ：k-means の J は、正解の分け方の J より小さい！ k-means は「自分の目的」では正しく、目的がちがうだけ
// 1〜6 データ / スペース やり直し / クリック 点を足す / R 新しいデータ
// ============================================

const KINDS = ['moons', 'circles', 'aniso', 'density', 'sizes', 'blobs'];
const WHY = {
  moons: '三日月は凸でない。中心からの距離で切ると、片方の先が反対の三日月に取られる → 密度でつなぐ（06 DBSCAN）か、グラフで考える（09）',
  circles: '内の輪と外の輪は中心が同じ。中心からの距離では分けられない → 近い点どうしのつながり（04 単連結、06、09）',
  aniso: '細長いかたまりの端どうしは、となりのかたまりの中心のほうが近い → 共分散（楕円）を持つ混合ガウス分布（08）',
  density: '密度がちがうと、まばらな大きいかたまりの点が密なほうに取られやすい → 08 の混合ガウス分布や、密度を見る 06・07',
  sizes: '大きさ（点の広がり）がちがうと、境界がまん中に引かれて、大きいかたまりが削られる → 08 の混合ガウス分布',
  blobs: '丸くて同じくらいの大きさのかたまりは得意。これが k-means の前提'
};
const NPTS = 300;                      // ★ 点の数
let kindNo = 0, data, km, seedD = 31, seedK = 1, viewL, viewR, cellBuf = null, cellDirty = true;

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); selfTest(); newData(); }
function newData() { data = makeDataset(KINDS[kindNo], NPTS, seedD); runKm(); }
function runKm() { seedRng(seedK); km = kmeansBest(data.pts, data.k, 10, true, 100); cellDirty = true; }
function truthJ(d) {                   // 正解の分け方で、その中心（平均）からの J
  let cs = Array.from({ length: d.k }, () => [0, 0]);
  return inertiaOf(d.pts, updateCenters(d.pts, d.truth, cs), d.truth);
}

function draw() {
  background(22, 24, 34);
  let w = (width - 120) / 2, h = height - 260;
  viewL = fitView(40, 100, w, h, 0, 0, 5.0); viewR = fitView(80 + w, 100, w, h, 0, 0, 5.0);
  if (cellDirty) drawCells();
  image(cellBuf, viewR.x, viewR.y, viewR.w, viewR.h);
  for (let v of [viewL, viewR]) { noFill(); stroke(80); rect(v.x, v.y, v.w, v.h); }
  drawPts(viewL, data.pts, data.truth, 7);
  drawPts(viewR, data.pts, km.labels, 7);
  km.centers.forEach((c, j) => { stroke(20); strokeWeight(2); fill(palC(j)); rect(gX(viewR, c[0]) - 8, gY(viewR, c[1]) - 8, 16, 16); });
  let ari = ariScore(km.labels, data.truth), jt = truthJ(data);
  noStroke(); fill(230); textSize(17); textAlign(LEFT, BASELINE);
  text('正解（' + DATA_JA[KINDS[kindNo]] + '、' + data.k + ' グループ）　J = ' + jt.toFixed(2), viewL.x, viewL.y - 10);
  text('k-means（k = ' + data.k + '）　J = ' + km.inertia.toFixed(2) + '　ARI = ' + ari.toFixed(3), viewR.x, viewR.y - 10);
  // ---- 文字
  fill(240); textSize(20);
  text('k-means が苦手な形　' + (kindNo + 1) + '. ' + DATA_JA[KINDS[kindNo]] + '　' + (ari > 0.95 ? '✓ うまく分かれた' : '✗ 正解とずれる'), 40, 40);
  fill(170); textSize(15); text('1 三日月　2 同心円　3 細長い　4 密度がちがう　5 大きさがちがう　6 かたまり（得意）　スペース やり直し　クリック 点を足す　R 新しいデータ', 40, 66);
  let y0 = viewL.y + viewL.h + 34;
  fill(255, 210, 130); textSize(16); text('なぜ？　' + WHY[KINDS[kindNo]], 40, y0, width - 80);
  fill(180); textSize(14);
  text((km.inertia < jt - 1e-9 ? 'k-means の J（' + km.inertia.toFixed(2) + '）は正解の J（' + jt.toFixed(2) + '）より小さい → k-means は「J を小さくする」という自分の目的ではちゃんと勝っている。目的がこのデータに合っていないだけ' : 'このデータでは k-means の J と正解の J がほぼ同じ → 目的とデータの形が合っている') + '。右の背景 = ボロノイの領域（境界はいつも直線）', 40, y0 + 52, width - 80);
  drawSelfTest(width - 170, height - 12);
}
function drawCells() {
  let w = Math.ceil(viewR.w / 4), h = Math.ceil(viewR.h / 4);
  if (!cellBuf || cellBuf.width !== w || cellBuf.height !== h) { cellBuf = createGraphics(w, h); cellBuf.pixelDensity(1); }
  cellBuf.loadPixels();
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let p = [viewR.x0 + ((x + 0.5) / w) * (viewR.x1 - viewR.x0), viewR.y1 - ((y + 0.5) / h) * (viewR.y1 - viewR.y0)], c = PAL[nearestCenter(p, km.centers) % PAL.length], i = 4 * (x + w * y);
    cellBuf.pixels[i] = 22 + c[0] * 0.15; cellBuf.pixels[i + 1] = 24 + c[1] * 0.15; cellBuf.pixels[i + 2] = 34 + c[2] * 0.15; cellBuf.pixels[i + 3] = 255;
  }
  cellBuf.updatePixels(); cellDirty = false;
}

function mousePressed() {
  for (let v of [viewL, viewR]) if (v && inBox(v, mouseX, mouseY)) {
    let p = [invX(v, mouseX), invY(v, mouseY)]; data.pts.push(p);
    data.truth.push(data.truth[nearestCenter(p, data.pts.slice(0, -1).map((q) => q))] || 0); runKm();
  }
}
function keyPressed() {
  if (key.length === 1 && '123456'.includes(key)) { kindNo = +key - 1; newData(); }
  if (key === ' ') { seedK++; runKm(); }
  if (key === 'r' || key === 'R') { seedD++; newData(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let res = {};
  for (let kd of KINDS) { let d = makeDataset(kd, NPTS, 90); seedRng(4); let r = kmeansBest(d.pts, d.k, 10, true, 100); res[kd] = { d, r, ari: ariScore(r.labels, d.truth) }; }
  check('かたまり（丸い・同じ大きさ）では ARI ≥ 0.95：' + res.blobs.ari.toFixed(3), res.blobs.ari >= 0.95);
  check('三日月は ARI < 0.6（' + res.moons.ari.toFixed(3) + '）、同心円は ARI < 0.2（' + res.circles.ari.toFixed(3) + '）', res.moons.ari < 0.6 && res.circles.ari < 0.2);
  check('細長い・大きさがちがう でも失敗（ARI < 0.8）：' + res.aniso.ari.toFixed(3) + '、' + res.sizes.ari.toFixed(3), res.aniso.ari < 0.8 && res.sizes.ari < 0.8);
  check('三日月・同心円・細長いでは、k-means の J < 正解の分け方の J（k-means は自分の目的では勝っている）', ['moons', 'circles', 'aniso'].every((kd) => res[kd].r.inertia < truthJ(res[kd].d)));
  let sep = true;
  for (let kd of ['moons', 'aniso']) {
    let { d, r } = res[kd];
    for (let a = 0; a < d.k; a++) for (let b = a + 1; b < d.k; b++) {
      let ca = r.centers[a], cb = r.centers[b], nx = cb[0] - ca[0], ny = cb[1] - ca[1], mid = [(ca[0] + cb[0]) / 2, (ca[1] + cb[1]) / 2];
      d.pts.forEach((p, i) => { let s = (p[0] - mid[0]) * nx + (p[1] - mid[1]) * ny; if ((r.labels[i] === a && s > 1e-12) || (r.labels[i] === b && s < -1e-12)) sep = false; });
    }
  }
  check('k-means のどの 2 グループも、2 つの中心の垂直二等分線（直線）で分かれている', sep);
  check('ARI はどれも −1〜1 で NaN なし', KINDS.every((kd) => res[kd].ari >= -1 && res[kd].ari <= 1 && noNaN(res[kd].ari)));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 1〜5 を順に見て、k-means の右の図のどこがまちがっているか、なぜかを説明しよう
// 2. スペースで何回やり直しても、三日月は分かれない。初期化の問題ではなく「目的」の問題
// 3. 3（細長い）で、データの y を 5 倍に引きのばすと？（makeDataset の後で p[1] *= 5）。距離の測り方しだいで答えが変わる
// 4. 正解の J と k-means の J を比べよう。k-means の J のほうが小さいのはどのデータ？
// 5. この 5 つを、あとで DBSCAN（06）・混合ガウス分布（08）・スペクトラル（09）で解いてみよう

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
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) ? v.every(noNaN) : !(typeof v === 'number' && v !== v); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(120, 210, 150) : color(255, 90, 90)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
