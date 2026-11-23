// ============================================
// 11 次元の呪い ─ 次元 d が大きくなると「近い」「遠い」の差がなくなっていく
//   左：d 次元の立方体 [0, 1]^d にランダムな点を 200 個。ある点からの距離の分布は、d が大きいと平均のまわりに集まり、
//   いちばん遠い点 ÷ いちばん近い点 → 1。距離で「似たもの」を探すクラスタリングには困ったこと（平均距離 ≈ √(d/6)）
//   右：2 次元の 3 つのかたまりに、意味のない「ノイズの次元」を m 個足す → k-means の ARI が下がる
//   PCA（主成分分析、シリーズ 60）でばらつきの大きい 2 方向だけ残してから k-means すると、また分けられる
// ↑↓ 次元 d（左）/ ← → ノイズの次元 m（右）/ R 新しい乱数
// ============================================

const DIMS = [1, 2, 3, 5, 10, 20, 50, 100, 200, 500, 1000];   // ★ 調べる次元
const MS = [0, 50, 100, 200, 300, 400, 600];                  // ★ 足すノイズの次元の数
const NP = 200, NQ = 5, NOISE_SD = 0.5, BLOB_R = 1.3;          // ★ 点の数、基準点の数、ノイズの大きさ、かたまりの離れ具合
let conc = [], noiseRes = [], dSel = 5, mSel = 5, seedC = 1, seedN = 5;

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); selfTest(); recompute(); }
function recompute() { conc = DIMS.map((d) => concentration(d, NP, NQ, 1000 * seedC + d)); noiseRes = []; }
// ★ d 次元の一様な点で、基準点から全部の点までの距離を調べる
function concentration(d, n, q, seed) {
  seedRng(seed);
  let pts = Array.from({ length: n }, () => Array.from({ length: d }, rnd)), dists = [], ratios = [];
  for (let a = 0; a < q; a++) {
    let ds = []; for (let i = 0; i < n; i++) if (i !== a) ds.push(edist(pts[a], pts[i]));
    ratios.push(Math.max(...ds) / Math.max(1e-12, Math.min(...ds))); dists.push(...ds);
  }
  let mean = meanOf(dists), sd = Math.sqrt(meanOf(dists.map((v) => (v - mean) ** 2)));
  return { d, dists, ratio: meanOf(ratios), mean, sd };
}
// ★ 3 つのかたまり（2 次元）+ ノイズの次元 m 個
function noisyBlobs(n, m, seed) {
  seedRng(seed);
  let pts = [], truth = [];
  for (let i = 0; i < n; i++) { let k = i % 3, a = (TWO_PI * k) / 3, p = [BLOB_R * Math.cos(a) + 0.3 * gauss(), BLOB_R * Math.sin(a) + 0.3 * gauss()]; for (let j = 0; j < m; j++) p.push(NOISE_SD * gauss()); pts.push(p); truth.push(k); }
  return { pts, truth };
}
// ★ PCA：共分散がいちばん大きい方向をべき乗法で 1 本ずつ（前の方向を引いてから）。dims 本の座標を返す
function pcaProject(pts, dims, iters) {
  let n = pts.length, D = pts[0].length, mu = new Array(D).fill(0);
  for (let p of pts) for (let j = 0; j < D; j++) mu[j] += p[j] / n;
  let X = pts.map((p) => p.map((v, j) => v - mu[j])), vs = [], lams = [];
  for (let c = 0; c < dims; c++) {
    let v = Array.from({ length: D }, (_, j) => Math.sin(1.3 * j + c) + 0.5), lam = 0;
    for (let it = 0; it < (iters || 100); it++) {
      let s = X.map((x) => { let t = 0; for (let j = 0; j < D; j++) t += x[j] * v[j]; return t; }), w = new Array(D).fill(0);
      X.forEach((x, i) => { for (let j = 0; j < D; j++) w[j] += (x[j] * s[i]) / n; });
      for (let u of vs) { let dd = 0; for (let j = 0; j < D; j++) dd += w[j] * u[j]; for (let j = 0; j < D; j++) w[j] -= dd * u[j]; }
      lam = Math.hypot(...w); v = w.map((x) => x / Math.max(1e-300, lam));
    }
    vs.push(v); lams.push(lam);
  }
  return { proj: X.map((x) => vs.map((v) => { let t = 0; for (let j = 0; j < D; j++) t += x[j] * v[j]; return t; })), vecs: vs, lams, X };
}
function noiseExperiment(m, seed) {
  let d = noisyBlobs(300, m, seed); seedRng(1); let km = kmeansBest(d.pts, 3, 3, true, 60), pc = pcaProject(d.pts, 2, 60); seedRng(1); let kp = kmeansBest(pc.proj, 3, 3, true, 60);
  return { m, d, km, kp, proj: pc.proj, ariK: ariScore(km.labels, d.truth), ariP: ariScore(kp.labels, d.truth) };
}

function draw() {
  background(22, 24, 34);
  if (noiseRes.length < MS.length && frameCount % 2 === 0) noiseRes.push(noiseExperiment(MS[noiseRes.length], seedN));   // 1 つずつ（重いので）
  let c = conc[dSel], half = width / 2 - 60, hh = (height - 330) * 0.5, y2 = 130 + hh + 80;
  // ---- 距離の分布（平均で割った値）
  let g1 = { x: 60, y: 130, w: half - 40, h: hh, x0: 0, x1: 2, y0: 0, y1: 1 }, bins = new Array(40).fill(0);
  for (let v of c.dists) bins[clampv(Math.floor((v / c.mean) * 20), 0, 39)]++;
  let bm = Math.max(...bins); g1.y1 = 1;
  plotAxes(g1, '距離 ÷ 平均距離', 'd = ' + c.d + ' での距離の分布（基準点 ' + NQ + ' 個 × 点 ' + (NP - 1) + ' 個）', [0, 0.5, 1, 1.5, 2], []);
  noStroke(); fill(176, 140, 255); bins.forEach((b, i) => rect(gX(g1, i / 20), gY(g1, b / bm), g1.w / 40 - 1, g1.y + g1.h - gY(g1, b / bm)));
  // ---- 最大 ÷ 最小 のグラフ（横は log d）
  let g2 = { x: 60, y: y2, w: half - 40, h: hh, x0: 0, x1: 3, y0: 0, y1: Math.log10(Math.max(...conc.map((e) => e.ratio))) * 1.05 };
  plotAxes(g2, 'log10 d', 'log10（いちばん遠い ÷ いちばん近い）→ 0 = 比が 1', [0, 1, 2, 3], [0, +g2.y1.toFixed(1)]);
  stroke(255, 190, 80); strokeWeight(2); polyline(conc.map((e) => [gX(g2, Math.log10(e.d)), gY(g2, Math.log10(e.ratio))]));
  noStroke(); conc.forEach((e, i) => { fill(i === dSel ? 255 : color(255, 190, 80)); circle(gX(g2, Math.log10(e.d)), gY(g2, Math.log10(e.ratio)), i === dSel ? 12 : 6); });
  fill(220); textSize(15); textAlign(LEFT, BASELINE);
  text('d = ' + c.d + '：最大 ÷ 最小 = ' + c.ratio.toFixed(3) + '　平均距離 ' + c.mean.toFixed(3) + '（√(d/6) = ' + Math.sqrt(c.d / 6).toFixed(3) + '）　ばらつき ÷ 平均 = ' + (c.sd / c.mean).toFixed(3), 60, height - 70, half);
  // ---- 右：ノイズの次元と k-means
  let rx = width / 2 + 40, rw = width / 2 - 80;
  let g3 = { x: rx, y: 130, w: rw, h: hh, x0: 0, x1: MS[MS.length - 1], y0: -0.1, y1: 1.05 };
  plotAxes(g3, 'ノイズの次元 m', 'ARI（正解と）：赤 = そのまま k-means、緑 = PCA で 2 次元にしてから', [0, 200, 400, 600], [0, 0.5, 1]);
  if (noiseRes.length) {
    stroke(255, 120, 130); strokeWeight(2); polyline(noiseRes.map((e) => [gX(g3, e.m), gY(g3, e.ariK)]));
    stroke(110, 230, 190); polyline(noiseRes.map((e) => [gX(g3, e.m), gY(g3, e.ariP)]));
    noStroke(); noiseRes.forEach((e, i) => { fill(255, 120, 130); circle(gX(g3, e.m), gY(g3, e.ariK), i === mSel ? 12 : 6); fill(110, 230, 190); circle(gX(g3, e.m), gY(g3, e.ariP), i === mSel ? 12 : 6); });
  }
  let e = noiseRes[Math.min(mSel, noiseRes.length - 1)];
  if (e) {
    let vA = fitView(rx, y2, rw / 2 - 20, hh, 0, 0, 4.0), vB = fitView(rx + rw / 2 + 20, y2, rw / 2 - 20, hh, 0, 0, Math.max(1, 2.2 * Math.max(...e.proj.map((p) => Math.abs(p[0])))));
    for (let v of [vA, vB]) { noFill(); stroke(70); strokeWeight(1); rect(v.x, v.y, v.w, v.h); }
    drawPts(vA, e.d.pts.map((p) => [p[0], p[1]]), e.km.labels, 5); drawPts(vB, e.proj, e.kp.labels, 5);
    noStroke(); fill(200); textSize(13); textAlign(LEFT, BASELINE);
    text((2 + e.m) + ' 次元のまま k-means　ARI ' + e.ariK.toFixed(2), vA.x, vA.y - 8);
    text('PCA → k-means　ARI ' + e.ariP.toFixed(2), vB.x, vB.y - 8);
  } else { noStroke(); fill(150); textSize(14); text('計算中…', rx, y2 + 20); }
  // ---- 文字
  noStroke(); textAlign(LEFT, BASELINE); fill(240); textSize(20);
  text('次元の呪い　d = ' + c.d + '：最大 ÷ 最小 = ' + c.ratio.toFixed(2) + '　｜　ノイズの次元 m = ' + MS[mSel] + (e && e.m === MS[mSel] ? '：k-means ARI ' + e.ariK.toFixed(2) + ' → PCA の後 ' + e.ariP.toFixed(2) : ''), 40, 40);
  fill(170); textSize(15); text('↑↓ 次元 d（左）　← → ノイズの次元 m（右）　R 新しい乱数', 40, 66);
  fill(150); textSize(13); text('ノイズの次元はどれも小さい（標準偏差 ' + NOISE_SD + '）けれど、m 個たまると距離の差をかき消す。PCA はばらつきの大きい向き（ここでは最初の 2 次元）を見つけて残す。左下の図 = はじめの 2 次元に色をつけたもの、右下 = PCA の 2 方向', rx, height - 84, rw - 40);
  drawSelfTest(width - 170, height - 12);
}

function keyPressed() {
  if (key === UP_ARROW) dSel = Math.min(DIMS.length - 1, dSel + 1);
  if (key === DOWN_ARROW) dSel = Math.max(0, dSel - 1);
  if (key === RIGHT_ARROW) mSel = Math.min(MS.length - 1, mSel + 1);
  if (key === LEFT_ARROW) mSel = Math.max(0, mSel - 1);
  if (key === 'r' || key === 'R') { seedC++; seedN++; recompute(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let cs = [2, 10, 100, 1000].map((d) => concentration(d, 150, 3, 50 + d));
  check('最大 ÷ 最小 は d とともに 1 へ近づく：' + cs.map((e) => e.ratio.toFixed(2)).join(' → '), cs.every((e, i) => i === 0 || e.ratio < cs[i - 1].ratio) && cs[3].ratio < 1.3 && cs[0].ratio > 5);
  check('平均距離 ≈ √(d/6)（d = 100, 1000 で 3% 以内）', cs.slice(2).every((e) => Math.abs(e.mean / Math.sqrt(e.d / 6) - 1) < 0.03));
  check('ばらつき ÷ 平均 は d = 1000 で 0.05 未満（距離がほとんど同じ）', cs[3].sd / cs[3].mean < 0.05);
  let e0 = noiseExperiment(0, 5), e4 = noiseExperiment(400, 5);
  check('ノイズなし：k-means の ARI ' + e0.ariK.toFixed(2) + ' ≥ 0.95。ノイズの次元 400：ARI ' + e4.ariK.toFixed(2) + ' < 0.6', e0.ariK >= 0.95 && e4.ariK < 0.6);
  check('PCA で 2 次元にしてからなら回復：ARI ' + e4.ariP.toFixed(2) + ' ≥ 0.85', e4.ariP >= 0.85);
  seedRng(3);
  let small = Array.from({ length: 60 }, () => [gauss() * 2, gauss(), gauss() * 0.5]), pc = pcaProject(small, 1, 300), v = pc.vecs[0], cv = [0, 1, 2].map((a) => [0, 1, 2].reduce((s, b) => s + (meanOf(pc.X.map((x) => x[a] * x[b])) * v[b]), 0));
  check('べき乗法の向き v は共分散 C の固有ベクトル：|C·v − λ·v| < 1e-9', cv.every((x, a) => Math.abs(x - pc.lams[0] * v[a]) < 1e-9));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. ↑↓ で d を 1 → 1000 に。距離の分布（左上）はどんどん細くなる。「いちばん近い点」に意味はある？
// 2. ← → で m を変えて、右下の 2 つの図を比べよう。m = 600 ではそのままの k-means はほぼでたらめ
// 3. NOISE_SD を 0.3 や 0.8 に変えると？ PCA でも回復できなくなるのはどんなとき？
// 4. 02 のシルエットも距離で計算する。高い次元では a と b の差が小さくなって 0 に近づく
// 5. シリーズ 60（PCA）で、主成分がばらつきの大きい向きになることをくわしく見よう

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
