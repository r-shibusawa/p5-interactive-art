// ============================================
// 09 スペクトラルクラスタリング ─ 点を「近さのグラフ」にしてから分ける。三日月や同心円もきれいに分かれる
//   ① 近さ W_ij = exp(−|x_i − x_j|² / 2σ²)（近いほど 1、遠いと 0）② 正規化ラプラシアン L = I − D^(−1/2) W D^(−1/2)（D = 各点の重みの合計）
//   ③ L の小さい固有値の固有ベクトル（ヤコビ法で計算）を並べて新しい座標にする → そこで k-means
//   2 番目の固有ベクトル = フィードラーベクトル。値の順に点を並べかえると、W の行列がブロック（グループ）に分かれて見える
//   グラフの「切れ目」を探すので、ネットワークのコミュニティ分け（シリーズ 8 の 09）と同じ考え方
// スライダ / ← → σ / D データ / K k-means とくらべる / R 新しいデータ / クリック 点を足す（120 点くらいまでが軽い）
// ============================================

const NPTS = 120;                      // ★ 点の数（ヤコビ法は n³ に比例して重くなる）
const DKINDS = ['moons', 'circles', 'blobs', 'aniso'];
let data, dataNo = 0, seedD = 91, sc, km, showKm = false, view, sSig, edgeBuf = null, matBuf = null, dirty = true, order = [];

function setup() {
  createCanvas(windowWidth, windowHeight); textWrap(CHAR);
  sSig = makeSlider(width - 360, 140, 300, 0.05, 0.8, 0.14, 'σ（近さの目盛り）', 2);
  selfTest(); newData();
}
function newData() { data = makeDataset(DKINDS[dataNo], NPTS, seedD); seedRng(5); km = kmeansBest(data.pts, data.k, 10, true, 100); rerun(); }
// ★ 固有ベクトルを計算してから k-means（種を固定して、毎回同じ答えに）
function rerun() {
  seedRng(17); sc = spectralCluster(data.pts, sSig.val, data.k);
  let fv = sc.emb.eig.vecs[1]; order = data.pts.map((_, i) => i).sort((a, b) => fv[a] - fv[b]); dirty = true;
}

function draw() {
  background(22, 24, 34);
  view = fitView(40, 100, width * 0.42, height * 0.6, 0, 0, 5.0);
  if (dirty) makeBuffers();
  image(edgeBuf, view.x, view.y, view.w, view.h);
  noFill(); stroke(80); rect(view.x, view.y, view.w, view.h);
  let lab = showKm ? km.labels : sc.labels;
  drawPts(view, data.pts, lab, 8);
  let eig = sc.emb.eig, fv = eig.vecs[1], n = data.pts.length;
  // ---- W を並べかえた行列
  let mx = view.x + view.w + 50, ms = Math.min(height * 0.36, width - mx - 420);
  image(matBuf, mx, 120, ms, ms); noFill(); stroke(80); rect(mx, 120, ms, ms);
  noStroke(); fill(205); textSize(13); textAlign(LEFT, BASELINE); text('W を u2 の順に並べかえ（明るさ = W^0.25）', mx, 112);
  // ---- フィードラーベクトル（小さい順）
  let lo = Math.min(...fv), hi = Math.max(...fv), g1 = { x: mx, y: 120 + ms + 50, w: ms, h: 120, x0: 0, x1: n - 1, y0: lo, y1: hi };
  plotAxes(g1, '並べかえた番号', 'フィードラーベクトル u2 の値', [0, n - 1], [+lo.toFixed(2), 0, +hi.toFixed(2)]);
  stroke(255, 255, 255, 50); line(g1.x, gY(g1, 0), g1.x + g1.w, gY(g1, 0));
  noStroke(); order.forEach((i, r) => { fill(palC(sc.labels[i])); circle(gX(g1, r), gY(g1, fv[i]), 5); });
  // ---- 固有ベクトルの空間（u2, u3）
  let u3 = eig.vecs[2], sx = width - 360, g2 = { x: sx, y: 330, w: 300, h: 230, x0: Math.min(...fv) * 1.1, x1: Math.max(...fv) * 1.1, y0: Math.min(...u3) * 1.1, y1: Math.max(...u3) * 1.1 };
  noFill(); stroke(80); rect(g2.x, g2.y, g2.w, g2.h);
  noStroke(); data.pts.forEach((_, i) => { fill(palC(sc.labels[i])); circle(gX(g2, fv[i]), gY(g2, u3[i]), 6); });
  fill(205); textSize(13); text('固有ベクトルの空間（横 u2、縦 u3）', g2.x, g2.y - 8);
  // ---- 固有値
  drawSlider(sSig);
  fill(205); textSize(14); text('L の小さい固有値（ヤコビ法）', sx, 200);
  let vmax = Math.max(1e-12, ...eig.vals.slice(0, 6));
  for (let m = 0; m < 6; m++) { let v = eig.vals[m]; fill(m < data.k ? color(255, 190, 80) : color(110, 120, 150)); rect(sx + m * 50, 280 - Math.max(2, (60 * v) / vmax), 36, Math.max(2, (60 * v) / vmax)); fill(180); textSize(11); textAlign(CENTER, TOP); text(v.toFixed(4), sx + m * 50 + 18, 284); textAlign(LEFT, BASELINE); }
  // ---- 文字
  let aS = ariScore(sc.labels, data.truth), aK = ariScore(km.labels, data.truth);
  fill(240); textSize(20);
  text('スペクトラルクラスタリング　' + DATA_JA[DKINDS[dataNo]] + '　σ = ' + sSig.val.toFixed(2) + '　ARI：スペクトラル ' + aS.toFixed(3) + '　k-means ' + aK.toFixed(3), 40, 40);
  fill(170); textSize(15); text('スライダ または ← → σ　D データ　K 左の図を k-means に' + (showKm ? '（いま k-means）' : '') + '　R 新しいデータ　クリック 点を足す', 40, 66);
  fill(150); textSize(13);
  text('左の線 = 近さのグラフ（W が 0.05 より大きい組、濃いほど近い）。固有値 0 に近いものが k 個あって、その次がはっきり大きい（すき間がある）とき、グラフは k 個にほぼ切れている。σ が小さすぎるとグラフがばらばら、大きすぎると全部つながってしまう', 40, view.y + view.h + 30, view.w + 20);
  drawSelfTest(width - 170, height - 12);
}
function makeBuffers() {
  let n = data.pts.length, W = sc.emb.W;
  if (!edgeBuf || edgeBuf.width !== Math.round(view.w)) edgeBuf = createGraphics(Math.round(view.w), Math.round(view.h));
  edgeBuf.clear(); edgeBuf.strokeWeight(1);
  let local = { x: 0, y: 0, w: view.w, h: view.h, x0: view.x0, x1: view.x1, y0: view.y0, y1: view.y1 };
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (W[i][j] > 0.05) { edgeBuf.stroke(150, 160, 200, 30 + 120 * W[i][j]); edgeBuf.line(gX(local, data.pts[i][0]), gY(local, data.pts[i][1]), gX(local, data.pts[j][0]), gY(local, data.pts[j][1])); }
  if (!matBuf || matBuf.width !== n) { if (matBuf) matBuf.remove(); matBuf = createGraphics(n, n); matBuf.pixelDensity(1); }
  matBuf.loadPixels();
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) { let w = r === c ? 1 : Math.pow(W[order[r]][order[c]], 0.25), q = 4 * (c + n * r); matBuf.pixels[q] = 22 + 200 * w; matBuf.pixels[q + 1] = 24 + 150 * w; matBuf.pixels[q + 2] = 34 + 220 * w; matBuf.pixels[q + 3] = 255; }
  matBuf.updatePixels(); dirty = false;
}

function mousePressed() {
  if (sliderPress(sSig, mouseX, mouseY)) return;
  if (view && inBox(view, mouseX, mouseY) && data.pts.length < 200) { let p = [invX(view, mouseX), invY(view, mouseY)]; data.pts.push(p); data.truth.push(0); km.labels.push(nearestCenter(p, km.centers)); rerun(); }
}
function mouseDragged() { sliderDrag(sSig, mouseX); }
function mouseReleased() { if (sSig.drag) { sSig.drag = false; rerun(); } }
function keyPressed() {
  if (key === RIGHT_ARROW || key === LEFT_ARROW) { sSig.val = clampv(sSig.val + (key === RIGHT_ARROW ? 0.02 : -0.02), sSig.lo, sSig.hi); rerun(); }
  if (key === 'd' || key === 'D') { dataNo = (dataNo + 1) % DKINDS.length; newData(); }
  if (key === 'k' || key === 'K') showKm = !showKm;
  if (key === 'r' || key === 'R') { seedD++; newData(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(9);
  let pts = Array.from({ length: 40 }, () => [rnd() * 2, rnd() * 2]), e = spectralEmbed(pts, 0.4), n = 40, res = 0, orth = 0;
  for (let m = 0; m < n; m++) { let v = e.eig.vecs[m]; for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < n; j++) s += e.L[i][j] * v[j]; res = Math.max(res, Math.abs(s - e.eig.vals[m] * v[i])); } for (let q = 0; q < n; q++) { let s = 0; for (let i = 0; i < n; i++) s += v[i] * e.eig.vecs[q][i]; orth = Math.max(orth, Math.abs(s - (m === q ? 1 : 0))); } }
  check('ヤコビ法：L·v = λ·v（誤差 ' + res.toExponential(1) + '）、固有ベクトルは正規直交（誤差 ' + orth.toExponential(1) + '）', res < 1e-9 && orth < 1e-9);
  let sq = e.deg.map(Math.sqrt), ln = Math.hypot(...sq), cosv = Math.abs(e.eig.vecs[0].reduce((s, v, i) => s + (v * sq[i]) / ln, 0));
  check('L の固有値は 0〜2、いちばん小さい固有値 ≈ 0 でその固有ベクトル ∝ √(重みの合計)', e.eig.vals.every((v) => v > -1e-9 && v < 2 + 1e-9) && Math.abs(e.eig.vals[0]) < 1e-9 && cosv > 1 - 1e-9);
  seedRng(10);
  let far = makeBlobs([{ n: 10, c: [0, 0], sd: [0.2, 0.2] }, { n: 10, c: [30, 0], sd: [0.2, 0.2] }, { n: 10, c: [0, 30], sd: [0.2, 0.2] }]), ef = spectralEmbed(far.pts, 0.5);
  check('3 つに完全に切れたグラフでは、固有値 0 がちょうど 3 個（4 番目 = ' + ef.eig.vals[3].toFixed(3) + '）', ef.eig.vals.filter((v) => Math.abs(v) < 1e-9).length === 3);
  let mo = makeDataset('moons', 100, 92); seedRng(3); let sm = spectralCluster(mo.pts, 0.14, 2); seedRng(3); let kmo = kmeansBest(mo.pts, 2, 10, true, 100);
  let aS = ariScore(sm.labels, mo.truth), aK = ariScore(kmo.labels, mo.truth);
  check('三日月：スペクトラル ARI ' + aS.toFixed(3) + ' ≥ 0.95、k-means ARI ' + aK.toFixed(3) + ' < 0.6', aS >= 0.95 && aK < 0.6);
  let sign = mo.pts.map((_, i) => (sm.emb.eig.vecs[1][i] > 0 ? 1 : 0));
  check('フィードラーベクトルの符号（+ か −）だけで分けても三日月が分かれる（ARI ' + ariScore(sign, mo.truth).toFixed(3) + ' ≥ 0.95）', ariScore(sign, mo.truth) >= 0.95);
  let ci = makeDataset('circles', 100, 93); seedRng(3); let scc = spectralCluster(ci.pts, 0.14, 2); seedRng(3); let kc = kmeansBest(ci.pts, 2, 10, true, 100);
  check('同心円：スペクトラル ARI ' + ariScore(scc.labels, ci.truth).toFixed(3) + ' ≥ 0.95、k-means は < 0.2', ariScore(scc.labels, ci.truth) >= 0.95 && ariScore(kc.labels, ci.truth) < 0.2);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. σ をスライダで小さく・大きくしてみよう。固有値の棒（オレンジ = 小さい k 個）とすき間はどう変わる？
// 2. 右上の W の行列が「四角いブロック」に分かれているとき、クラスタはうまく分かれている
// 3. K で k-means の結果とくらべよう。三日月・同心円では差がはっきり
// 4. 固有ベクトルの空間（右下）では、三日月が 2 つの「点のかたまり」になっている。だから最後の k-means がうまくいく
// 5. シリーズ 8 の 09（コミュニティ）のネットワークにも同じ方法が使える。W の代わりにつながりの行列

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
// ---- 対称行列の固有値・固有ベクトル（ヤコビ法）。A は n × n の配列の配列。小さい順に返す
function jacobiEigen(Ain, maxSweeps) {
  let n = Ain.length, A = Ain.map((r) => Float64Array.from(r)), V = Array.from({ length: n }, (_, i) => { let r = new Float64Array(n); r[i] = 1; return r; });
  let fro = 0; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) fro += A[i][j] * A[i][j];
  for (let sw = 0; sw < (maxSweeps || 60); sw++) {
    let off = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += A[i][j] * A[i][j];
    if (off <= 1e-26 * fro || off === 0) break;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
      let apq = A[p][q]; if (Math.abs(apq) < 1e-300) continue;
      let th = (A[q][q] - A[p][p]) / (2 * apq), t = (th >= 0 ? 1 : -1) / (Math.abs(th) + Math.sqrt(th * th + 1)), c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < n; k++) { let akp = A[k][p], akq = A[k][q]; A[k][p] = c * akp - s * akq; A[k][q] = s * akp + c * akq; }
      for (let k = 0; k < n; k++) { let apk = A[p][k], aqk = A[q][k]; A[p][k] = c * apk - s * aqk; A[q][k] = s * apk + c * aqk; }
      A[p][q] = A[q][p] = 0;
      for (let k = 0; k < n; k++) { let vkp = V[k][p], vkq = V[k][q]; V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq; }
    }
  }
  let idx = A.map((_, i) => i).sort((a, b) => A[a][a] - A[b][b]);
  return { vals: idx.map((i) => A[i][i]), vecs: idx.map((i) => V.map((r) => r[i])) };   // vecs[m] = m 番目の固有ベクトル
}
// ---- スペクトラルクラスタリング：近さのグラフ W_ij = exp(−|x_i − x_j|² / 2σ²) → 正規化ラプラシアン L = I − D^(−1/2) W D^(−1/2)
//   L の小さい固有値の固有ベクトル（2 番目 = フィードラーベクトル）を並べて新しい座標にし、そこで k-means
function spectralEmbed(pts, sigma) {
  let n = pts.length, W = pts.map(() => new Array(n).fill(0)), deg = new Array(n).fill(0), s2 = 2 * sigma * sigma;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { let w = Math.exp(-sqd(pts[i], pts[j]) / s2); W[i][j] = W[j][i] = w; deg[i] += w; deg[j] += w; }
  let isq = deg.map((d) => 1 / Math.sqrt(Math.max(d, 1e-12))), L = W.map((r, i) => r.map((w, j) => (i === j ? 1 : 0) - isq[i] * w * isq[j]));
  let eig = jacobiEigen(L);
  eig.vecs = eig.vecs.map((v) => { let m = 0; for (let x of v) if (Math.abs(x) > Math.abs(m)) m = x; return m < 0 ? v.map((x) => -x) : v; });   // 向き（±）をそろえる
  return { W, deg, L, eig };
}
function spectralCluster(pts, sigma, k, emb) {   // 行ごとに長さ 1 にそろえてから k-means（ン-ジョーダン-ワイス）
  let e = emb || spectralEmbed(pts, sigma), rows = pts.map((_, i) => { let r = []; for (let m = 0; m < k; m++) r.push(e.eig.vecs[m][i]); let l = Math.hypot(...r) || 1; return r.map((v) => v / l); });
  let km = kmeansBest(rows, k, 8, true, 100);
  return { labels: km.labels, rows, emb: e };
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
