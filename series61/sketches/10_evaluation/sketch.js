// ============================================
// 10 正解との一致を測る ─ 正解のラベルがあるとき、クラスタリングの結果がどれくらい合っているかを数にする
//   分割表 n_ij = 「結果のクラスタ i」かつ「正解のグループ j」の点の数。クラスタの番号は勝手につくので、番号どうしを比べてはだめ
//   純度 = 各クラスタでいちばん多い正解の数の合計 / n（1 点ずつばらばらにすると 1 になってしまう弱点）
//   調整ランド指数 ARI = 「2 点の組が、両方で同じ／両方で別」の一致を、でたらめのときの期待値で調整（1 = 完全一致、≈ 0 = でたらめ）
//   正規化相互情報量 NMI = 2·I(結果; 正解) / (H(結果) + H(正解))（0〜1）。どれも番号を入れかえても同じ値
// 1〜7 方法 / L 番号を入れかえる / R 新しいデータ / スペース でたらめ（6）をやり直す
// ============================================

const NPTS = 240;                      // ★ 点の数
const METHODS = ['k-means', '混合ガウス', 'DBSCAN', '単連結', 'ウォード法', 'でたらめ', '1 点ずつ'];
let data, preds = [], scores = [], methodNo = 0, perm = null, seedD = 101, seedR = 1, view;

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); selfTest(); newData(); }
function newData() {
  data = makeDataset('noise', NPTS, seedD);
  let pts = data.pts, n = pts.length;
  seedRng(1); let km = kmeansBest(pts, 3, 10, true, 100);
  seedRng(2); let gf = null; for (let r = 0; r < 3; r++) { let f = gmmFit(pts, 3, 150); if (!gf || f.ll > gf.ll) gf = f; }
  let db = dbscan(pts, 0.25, 6);
  preds = [km.labels, gf.resp.map((r) => r.indexOf(Math.max(...r))), db.labels, cutTreeK(agglomerate(pts, 0), n, 3), cutTreeK(agglomerate(pts, 3), n, 3), null, pts.map((_, i) => i)];
  randomPred(); perm = null;
}
function randomPred() { seedRng(700 + seedR); preds[5] = data.pts.map(() => rndInt(0, 2)); scores = preds.map((p) => ({ pur: purityScore(p, data.truth), ari: ariScore(p, data.truth), nmi: nmiScore(p, data.truth) })); }
function shownPred() { let p = preds[methodNo]; return perm ? p.map((l) => (l < 0 ? l : l < 10 ? perm[l] : l + 100)) : p; }   // 0〜9 だけ入れかえる（10 以上はずらすだけ）

function draw() {
  background(22, 24, 34);
  let pred = shownPred(), ct = contingency(pred, data.truth), sc = { pur: purityScore(pred, data.truth), ari: ariScore(pred, data.truth), nmi: nmiScore(pred, data.truth) };
  view = fitView(40, 100, width * 0.38, height * 0.5, 0, 0, 4.0);
  noFill(); stroke(80); rect(view.x, view.y, view.w, view.h);
  drawPts(view, data.pts, methodNo === 6 ? pred.map((v) => v % 10) : pred, 7);
  // 正解は形で：●（グループ）と ×（外れ値）
  stroke(255, 255, 255, 120); strokeWeight(1);
  data.pts.forEach((p, i) => { if (data.truth[i] < 0) { let x = gX(view, p[0]), y = gY(view, p[1]); line(x - 6, y - 6, x + 6, y + 6); line(x - 6, y + 6, x + 6, y - 6); } });
  // ---- 分割表
  let tx = view.x + view.w + 60, ty = 130, rows = Math.min(ct.ra.length, 12), cw = 70, rh = 26, mx = 1;
  ct.M.forEach((r) => r.forEach((v) => (mx = Math.max(mx, v))));
  noStroke(); fill(205); textSize(14); textAlign(LEFT, BASELINE); text('分割表（行 = 結果のクラスタ、列 = 正解のグループ、−1 = ノイズ・外れ値）', tx, ty - 22);
  textAlign(CENTER, CENTER); textSize(13);
  ct.cb.forEach((c, j) => { fill(180); text('正解 ' + c, tx + 80 + j * cw + cw / 2, ty + rh / 2); });
  for (let i = 0; i < rows; i++) {
    let y = ty + (i + 1) * rh; fill(ct.ra[i] < 0 ? color(150) : palC(ct.ra[i])); text(methodNo === 6 ? '…' : '結果 ' + ct.ra[i], tx + 40, y + rh / 2);
    ct.M[i].forEach((v, j) => { fill(60 + 150 * (v / mx), 50 + 100 * (v / mx), 110 + 120 * (v / mx)); rect(tx + 80 + j * cw + 2, y + 2, cw - 4, rh - 4, 4); fill(240); text(v, tx + 80 + j * cw + cw / 2, y + rh / 2); });
  }
  if (ct.ra.length > rows) { fill(150); textAlign(LEFT, CENTER); text('… ほか ' + (ct.ra.length - rows) + ' 行（1 点ずつのクラスタ）', tx + 80, ty + (rows + 1.5) * rh); }
  // ---- いまの方法の数
  let sy = ty + (rows + 2.5) * rh + 10;
  textAlign(LEFT, BASELINE); textSize(17); fill(230);
  text('純度 ' + sc.pur.toFixed(3) + '　　ARI ' + sc.ari.toFixed(3) + '　　NMI ' + sc.nmi.toFixed(3), tx, sy);
  if (perm) { fill(255, 210, 130); textSize(14); text('番号を入れかえた：0→' + perm[0] + '、1→' + perm[1] + '、2→' + perm[2] + '。分割表の行が入れかわるだけで、3 つの数は同じ', tx, sy + 26, width - tx - 40); }
  // ---- 全部の方法の表
  let by = view.y + view.h + 40;
  fill(205); textSize(14); text('方法　　　　　純度　　ARI　　 NMI', 40, by);
  scores.forEach((s, m) => {
    let y = by + 24 + m * 22; fill(m === methodNo ? color(200, 180, 255) : 190);
    text((m + 1) + ' ' + METHODS[m], 40, y); text(s.pur.toFixed(3), 170, y); text(s.ari.toFixed(3), 240, y); text(s.nmi.toFixed(3), 310, y);
    fill(m === methodNo ? color(176, 140, 255) : color(90, 95, 120)); rect(380, y - 12, Math.max(0, s.ari) * 200, 12);
  });
  // ---- 文字
  fill(240); textSize(20);
  text('正解との一致を測る　' + (methodNo + 1) + '. ' + METHODS[methodNo] + '　ARI ' + sc.ari.toFixed(3), 40, 40);
  fill(170); textSize(15); text('1〜7 方法　L 番号を入れかえる' + (perm ? '（入れかえ中）' : '') + '　スペース でたらめをやり直す　R 新しいデータ', 40, 66);
  fill(150); textSize(13); text('× = 正解では外れ値。7（1 点ずつ）は純度 1 なのに ARI ≈ 0 → 純度だけで比べてはいけない。6（でたらめ）は ARI ≈ 0', tx, height - 60, width - tx - 40);
  drawSelfTest(width - 170, height - 12);
}

function keyPressed() {
  if (key.length === 1 && '1234567'.includes(key)) { methodNo = +key - 1; perm = null; }
  if (key === 'l' || key === 'L') { seedRng(300 + frameCount); let p = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]; for (let i = 9; i > 0; i--) { let j = rndInt(0, i); [p[i], p[j]] = [p[j], p[i]]; } perm = p; }
  if (key === ' ') { seedR++; randomPred(); }
  if (key === 'r' || key === 'R') { seedD++; newData(); }
  return false;
}

// ---- 自己テスト
function ariPairs(a, b) {              // 答え合わせ用：全部の 2 点の組を数える（O(n²)）
  let n11 = 0, n10 = 0, n01 = 0, n00 = 0;
  for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) { let sa = a[i] === a[j], sb = b[i] === b[j]; if (sa && sb) n11++; else if (sa) n10++; else if (sb) n01++; else n00++; }
  let den = (n00 + n01) * (n01 + n11) + (n00 + n10) * (n10 + n11);
  return den === 0 ? 1 : (2 * (n00 * n11 - n01 * n10)) / den;
}
function selfTest() {
  selfTestResults = [];
  seedRng(11);
  let a = Array.from({ length: 150 }, () => rndInt(0, 4)), relOk = true;
  for (let t = 0; t < 10; t++) { let p = [0, 1, 2, 3, 4].sort(() => rnd() - 0.5).map((v) => v * 7 + 3), b = a.map((l) => p[l]); if (!near(ariScore(a, b), 1, 1e-12) || !near(nmiScore(a, b), 1, 1e-12) || !near(purityScore(b, a), 1, 1e-12)) relOk = false; }
  check('同じ分け方なら、番号をどう入れかえても ARI = NMI = 純度 = 1', relOk);
  let ar = []; for (let t = 0; t < 40; t++) { let x = Array.from({ length: 400 }, () => rndInt(0, 3)), y = Array.from({ length: 400 }, () => rndInt(0, 3)); ar.push(ariScore(x, y)); }
  check('でたらめどうしの ARI の平均 ≈ 0（' + meanOf(ar).toFixed(4) + '、40 回）', Math.abs(meanOf(ar)) < 0.01);
  let pairOk = true, symOk = true, rangeOk = true;
  for (let t = 0; t < 20; t++) {
    let x = Array.from({ length: 80 }, () => rndInt(-1, 3)), y = x.map((v) => (rnd() < 0.6 ? v : rndInt(0, 4)));
    if (!near(ariScore(x, y), ariPairs(x, y), 1e-12)) pairOk = false;
    if (!near(ariScore(x, y), ariScore(y, x), 1e-12) || !near(nmiScore(x, y), nmiScore(y, x), 1e-12)) symOk = false;
    let nm = nmiScore(x, y), pu = purityScore(x, y); if (!(nm >= 0 && nm <= 1 && pu > 0 && pu <= 1)) rangeOk = false;
  }
  check('分割表から計算した ARI = 全部の 2 点の組を数えた ARI（20 通り）', pairOk);
  check('ARI と NMI は対称（結果と正解を入れかえても同じ）、NMI と純度は 0〜1', symOk && rangeOk);
  let d = makeDataset('noise', 200, 12), single = d.pts.map((_, i) => i);
  check('1 点ずつばらばら：純度 = ' + purityScore(single, d.truth).toFixed(2) + ' なのに ARI = ' + ariScore(single, d.truth).toFixed(3) + '（≈ 0）', purityScore(single, d.truth) === 1 && Math.abs(ariScore(single, d.truth)) < 0.01);
  let ct = contingency(a, a.map((v) => (v + 1) % 3)), tot = ct.M.reduce((s, r) => s + r.reduce((q, v) => q + v, 0), 0);
  check('分割表の合計 = n、行の合計 = 各クラスタの大きさ', tot === a.length && ct.M.every((r, i) => r.reduce((q, v) => q + v, 0) === a.filter((v) => v === ct.ra[i]).length));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 1〜5 を切りかえて、ARI がいちばん高い方法はどれ？ 外れ値（×）をうまくあつかえるのは？
// 2. L で番号を入れかえても、分割表の行が入れかわるだけで 3 つの数は変わらないことを確かめよう
// 3. 6（でたらめ）でスペースを何回も押そう。ARI は 0 のまわりでゆれる。NMI は 0 より少し大きくなりがち（偏りがある）
// 4. 7（1 点ずつ）は純度 1。なぜ？ ARI と NMI はどうなっている？
// 5. 正解がないとき（ふつうはこっち）は、02 のシルエットのような「内部の指標」を使う

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
// ---- 凝集型クラスタリング（ランス-ウィリアムズの更新式）。merges[t] = { a, b（合体した 2 つの番号）, h（高さ）, size }
//   葉 = 0〜n−1、t 番目の合体でできたクラスタ = n + t。ウォード法は距離² で更新し、高さ = √（更新した値）
const LINK_JA = ['単連結', '完全連結', '群平均', 'ウォード法'];
function agglomerate(pts, method) {    // method: 0 単連結 / 1 完全連結 / 2 群平均 / 3 ウォード法
  let n = pts.length, Dm = new Float64Array(n * n), size = new Array(n).fill(1), id = pts.map((_, i) => i), act = new Array(n).fill(true), merges = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) Dm[i * n + j] = method === 3 ? sqd(pts[i], pts[j]) : edist(pts[i], pts[j]);
  for (let t = 0; t < n - 1; t++) {
    let bi = -1, bj = -1, bd = Infinity;
    for (let i = 0; i < n; i++) if (act[i]) for (let j = i + 1; j < n; j++) if (act[j] && Dm[i * n + j] < bd) { bd = Dm[i * n + j]; bi = i; bj = j; }
    let ni = size[bi], nj = size[bj];
    merges.push({ a: id[bi], b: id[bj], h: method === 3 ? Math.sqrt(Math.max(0, bd)) : bd, size: ni + nj });
    for (let k = 0; k < n; k++) {
      if (!act[k] || k === bi || k === bj) continue;
      let dik = Dm[bi * n + k], djk = Dm[bj * n + k], nk = size[k], v;
      if (method === 0) v = Math.min(dik, djk);
      else if (method === 1) v = Math.max(dik, djk);
      else if (method === 2) v = (ni * dik + nj * djk) / (ni + nj);
      else v = ((ni + nk) * dik + (nj + nk) * djk - nk * bd) / (ni + nj + nk);
      Dm[bi * n + k] = Dm[k * n + bi] = v;
    }
    size[bi] = ni + nj; act[bj] = false; id[bi] = n + t;
  }
  return merges;
}
function membersOf(merges, n) {        // 番号 → 中の点のリスト
  let mem = []; for (let i = 0; i < n; i++) mem.push([i]);
  for (let m of merges) mem.push(mem[m.a].concat(mem[m.b]));
  return mem;
}
function labelsAfter(merges, n, count) { // はじめの count 回だけ合体したときのラベル（0, 1, 2… 小さい点の番号順）
  let mem = membersOf(merges, n), alive = new Set(); for (let i = 0; i < n; i++) alive.add(i);
  for (let t = 0; t < count; t++) { alive.delete(merges[t].a); alive.delete(merges[t].b); alive.add(n + t); }
  let groups = [...alive].map((c) => mem[c]).sort((p, q) => Math.min(...p) - Math.min(...q)), lab = new Array(n).fill(0);
  groups.forEach((g, k) => g.forEach((i) => (lab[i] = k)));
  return lab;
}
function cutTreeK(merges, n, k) { return labelsAfter(merges, n, clampv(n - k, 0, n - 1)); }
function cutTreeH(merges, n, h) { let c = 0; while (c < merges.length && merges[c].h <= h) c++; return labelsAfter(merges, n, c); }
function leafOrder(merges, n) {        // デンドログラムの葉の並び（枝が交差しない順）
  if (n === 1) return [0];
  let out = [], st = [2 * n - 2];
  while (st.length) { let v = st.pop(); if (v < n) out.push(v); else { let m = merges[v - n]; st.push(m.b); st.push(m.a); } }
  return out;
}
function copheneticMatrix(merges, n) { // c_ij = i と j が初めて同じクラスタになった高さ
  let mem = membersOf(merges, n), C = new Float64Array(n * n);
  merges.forEach((m) => { for (let x of mem[m.a]) for (let y of mem[m.b]) C[x * n + y] = C[y * n + x] = m.h; });
  return C;
}
function pearson(xs, ys) {
  let n = xs.length, mx = meanOf(xs), my = meanOf(ys), sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { let a = xs[i] - mx, b = ys[i] - my; sxy += a * b; sxx += a * a; syy += b * b; }
  return sxx > 0 && syy > 0 ? clampv(sxy / Math.sqrt(sxx * syy), -1, 1) : 0;
}
function copheneticCorr(pts, merges) {  // もとの距離とコーフェン距離の相関
  let n = pts.length, C = copheneticMatrix(merges, n), xs = [], ys = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { xs.push(edist(pts[i], pts[j])); ys.push(C[i * n + j]); }
  return pearson(xs, ys);
}
// ---- DBSCAN：半径 eps の中に minPts 個以上（自分も数える）ある点 = コア点。コア点どうしが eps でつながって 1 つのクラスタ
//   ラベル −1 = ノイズ。近くの点は「eps の大きさのマス目」で探す（周り 3 × 3 マスだけ見ればよい）
function gridKey(cx, cy) { return cx * 100003 + cy; }
function buildGrid(pts, eps) {
  let g = new Map();
  pts.forEach((p, i) => { let key = gridKey(Math.floor(p[0] / eps), Math.floor(p[1] / eps)); if (!g.has(key)) g.set(key, []); g.get(key).push(i); });
  return g;
}
function neighborsGrid(g, pts, i, eps) {
  let p = pts[i], cx = Math.floor(p[0] / eps), cy = Math.floor(p[1] / eps), out = [];
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { let c = g.get(gridKey(cx + dx, cy + dy)); if (c) for (let j of c) if (sqd(p, pts[j]) <= eps * eps) out.push(j); }
  return out.sort((a, b) => a - b);
}
function dbscan(pts, eps, minPts) {    // order = 広がっていく順（アニメーション用）
  let n = pts.length, e = Math.max(1e-6, eps), g = buildGrid(pts, e), nb = pts.map((_, i) => neighborsGrid(g, pts, i, e));
  let core = nb.map((l) => l.length >= minPts), labels = new Array(n).fill(-2), order = [], c = 0;
  for (let i = 0; i < n; i++) {
    if (labels[i] !== -2 || !core[i]) continue;
    labels[i] = c; order.push(i); let q = [i];
    for (let h = 0; h < q.length; h++) for (let j of nb[q[h]]) {
      if (labels[j] >= 0) continue;
      labels[j] = c; order.push(j); if (core[j]) q.push(j);
    }
    c++;
  }
  for (let i = 0; i < n; i++) if (labels[i] === -2) labels[i] = -1;
  return { labels, core, order, nClusters: c, nb };
}
// ---- 混合ガウス分布（2 次元、共分散は全部）。cv = [s_xx, s_xy, s_yy]。gm = { w: 重み, mu: 平均, cv: 共分散 }
const COV_FLOOR = 1e-4;                // 共分散の固有値の下限（1 点に縮んで尤度が ∞ になるのを防ぐ）
function logGauss2(p, mu, cv) {
  let det = cv[0] * cv[2] - cv[1] * cv[1], dx = p[0] - mu[0], dy = p[1] - mu[1];
  let q = (cv[2] * dx * dx - 2 * cv[1] * dx * dy + cv[0] * dy * dy) / det;
  return -Math.log(2 * Math.PI) - 0.5 * Math.log(det) - 0.5 * q;
}
function logSumExp(arr) { let m = -Infinity; for (let v of arr) if (v > m) m = v; if (m === -Infinity) return -Infinity; let s = 0; for (let v of arr) s += Math.exp(v - m); return m + Math.log(s); }
function gmmE(pts, gm) {               // E ステップ：所属確率 r_ik（各点で合計 1）と対数尤度
  let ll = 0, resp = pts.map((p) => {
    let lg = gm.w.map((w, k) => Math.log(Math.max(w, 1e-300)) + logGauss2(p, gm.mu[k], gm.cv[k])), lse = logSumExp(lg);
    ll += lse; return lg.map((v) => Math.exp(v - lse));
  });
  return { resp, ll };
}
function floorCov(cv) {                // 固有値が COV_FLOOR より小さければ持ち上げる（ふだんは何もしない）
  let a = cv[0], b = cv[1], c = cv[2], tr = (a + c) / 2, df = Math.sqrt(((a - c) / 2) ** 2 + b * b), l1 = tr + df, l2 = tr - df;
  if (l2 >= COV_FLOOR && isFinite(l1)) return cv;
  let th = 0.5 * Math.atan2(2 * b, a - c), co = Math.cos(th), si = Math.sin(th);
  l1 = Math.max(isFinite(l1) ? l1 : 1, COV_FLOOR); l2 = Math.max(isFinite(l2) ? l2 : COV_FLOOR, COV_FLOOR);
  return [l1 * co * co + l2 * si * si, (l1 - l2) * co * si, l1 * si * si + l2 * co * co];
}
function gmmM(pts, resp, old) {        // M ステップ：重み・平均・共分散を所属確率の重みつきで計算しなおす
  let k = resp[0].length, n = pts.length, gm = { w: [], mu: [], cv: [] };
  for (let j = 0; j < k; j++) {
    let nk = 0, mx = 0, my = 0; for (let i = 0; i < n; i++) { let r = resp[i][j]; nk += r; mx += r * pts[i][0]; my += r * pts[i][1]; }
    if (nk < 1e-8) { gm.w.push(1e-8); gm.mu.push(old ? old.mu[j].slice() : pts[j % n].slice()); gm.cv.push(old ? old.cv[j].slice() : [1, 0, 1]); continue; }
    mx /= nk; my /= nk;
    let a = 0, b = 0, c = 0; for (let i = 0; i < n; i++) { let r = resp[i][j], dx = pts[i][0] - mx, dy = pts[i][1] - my; a += r * dx * dx; b += r * dx * dy; c += r * dy * dy; }
    gm.w.push(nk / n); gm.mu.push([mx, my]); gm.cv.push(floorCov([a / nk, b / nk, c / nk]));
  }
  let sw = gm.w.reduce((s, v) => s + v, 0); gm.w = gm.w.map((v) => v / sw);
  return gm;
}
function gmmInit(pts, k) {             // k-means++ の中心から始めて、近い点を仲間にして M ステップ 1 回
  let cs = initPlusPlus(pts, k), lab = assignLabels(pts, cs);
  return gmmM(pts, lab.map((l) => cs.map((_, j) => (j === l ? 1 : 0))), { mu: cs, cv: cs.map(() => [0.3, 0, 0.3]) });
}
function gmmFit(pts, k, iters) {       // EM をくり返す。llHist = 対数尤度の記録（必ず増えるか同じ）
  let gm = gmmInit(pts, k), llHist = [], e = gmmE(pts, gm);
  for (let t = 0; t < iters; t++) { llHist.push(e.ll); gm = gmmM(pts, e.resp, gm); e = gmmE(pts, gm); if (t > 3 && Math.abs(e.ll - llHist[t]) < 1e-9 * Math.abs(e.ll)) break; }
  llHist.push(e.ll);
  return { gm, ll: e.ll, resp: e.resp, llHist };
}
function gmmBIC(ll, k, n) { return -2 * ll + (6 * k - 1) * Math.log(n); }   // 母数の数 = 平均 2k + 共分散 3k + 重み (k − 1)
function covAxes(cv) {                 // 共分散の楕円：長い軸・短い軸の標準偏差と傾き
  let a = cv[0], b = cv[1], c = cv[2], tr = (a + c) / 2, df = Math.sqrt(((a - c) / 2) ** 2 + b * b);
  return { s1: Math.sqrt(Math.max(0, tr + df)), s2: Math.sqrt(Math.max(0, tr - df)), ang: 0.5 * Math.atan2(2 * b, a - c) };
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
