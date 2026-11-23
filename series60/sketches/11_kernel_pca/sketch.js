// ============================================
// 11 カーネル PCA ─ まっすぐな軸では分けられないデータを、「似ている度」の行列で PCA する
// 同心円（内側と外側）は、どの直線に射影しても混ざってしまう → ふつうの PCA では分かれない
//   RBF カーネル k(x, y) = exp(−γ ‖x − y‖²)（近いほど 1、遠いほど 0）で n×n のグラム行列 K を作り、
//   特徴空間で中心化 Kc = K − 1K − K1 + 1K1 してから固有ベクトル α を求める（部分空間反復法）。第 k 成分の得点 = √λ_k α_k
//   γ がちょうどよいと、第 1 成分だけで内側と外側が分かれる。背景の色 = 平面の各点の第 1 成分の値
// ← → γ（カーネルの幅）/ 1 同心円 2 三日月 / R 新しいデータ / スペース 背景の表示
// ============================================

const NPTS = 200;                      // ★ 点の数（グラム行列は NPTS×NPTS）
let rowMeanK = [], gam = 5, dataKind = 1, seedD = 11, pts = [], labs = [], kp = null, linS = [], bgImg = null, showBg = true, accK = 0, accL = 0;   // ★ gam = γ

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); pixelDensity(1); selfTest(); rebuild(); }
function rebuild() {
  seedRng(seedD); let D = dataKind === 1 ? makeCircles(NPTS, 0.05) : makeMoons(NPTS, 0.06); pts = D.map((d) => d.p); labs = D.map((d) => d.lab);
  let lin = jacobiEigen(covMatrix(pts)); linS = projectData(pts, colMeans(pts), lin.vecs, 1).map((s) => s[0]);
  recompute();
}
// ★ γ を変えたら計算し直す（毎フレームではなく）
function recompute() {
  kp = kernelPCA(pts, gam, 2); rowMeanK = rbfGram(pts, gam).map((r) => r.reduce((a, b) => a + b, 0) / r.length); accK = signAccuracy(kp.comps[0], labs); accL = splitAccuracy(linS, labs);
  bgImg = makeBg(70, 56);
}
// 新しい点 x の第 1 成分 = Σ_i α_i k~(x, x_i) / √λ（k~ = 中心化したカーネル）
function kpcaScore(x, comp) {
  let n = pts.length, kx = pts.map((p) => Math.exp(-gam * ((p[0] - x[0]) ** 2 + (p[1] - x[1]) ** 2))), mx = kx.reduce((s, v) => s + v, 0) / n;
  let sq = Math.sqrt(Math.max(kp.vals[comp], 1e-300)), s = 0;
  for (let i = 0; i < n; i++) s += (kp.comps[comp][i] / sq) * (kx[i] - mx - rowMeanK[i]);   // k~ = k − (x の行の平均) − (x_i の行の平均) + 全体の平均（最後の項は Σα = 0 で消える）
  return s / sq;
}
function makeBg(gw, gh) {
  let img = createImage(gw, gh), vals = [], m = 1e-9; img.loadPixels();
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) { let v = kpcaScore([-1.6 + (3.2 * i) / (gw - 1), 1.3 - (2.6 * j) / (gh - 1)], 0); vals.push(v); m = Math.max(m, Math.abs(v)); }
  vals.forEach((v, k) => { let t = clampv(v / m, -1, 1); img.pixels[4 * k] = t > 0 ? 40 + 60 * t : 40; img.pixels[4 * k + 1] = 50 + 30 * Math.abs(t); img.pixels[4 * k + 2] = t < 0 ? 60 - 70 * t : 60; img.pixels[4 * k + 3] = 255; });
  img.updatePixels(); return img;
}
function strip(vals, x, y, w, title, acc) {   // 1 次元に並べて、ラベルの色で
  let m = Math.max(...vals.map(Math.abs), 1e-12);
  stroke(70, 82, 98); strokeWeight(1); line(x, y, x + w, y); line(x + w / 2, y - 30, x + w / 2, y + 30);
  noStroke(); vals.forEach((v, i) => { fill(labs[i] ? color(255, 125, 105, 200) : color(90, 165, 240, 200)); circle(x + w / 2 + (v / m) * (w / 2) * 0.95, y + (labs[i] ? 10 : -10) + ((i * 7) % 9) - 4, 6); });
  fill(205, 212, 222); textSize(14); textAlign(LEFT, BASELINE); text(title + '　分かれ方 ' + fmtN(100 * acc, 1) + '%', x, y - 40);
}

function draw() {
  background(24, 30, 38);
  let s = Math.min(width * 0.12, height * 0.2), cx = 40 + 1.6 * s, cy = 140 + 1.3 * s;
  if (showBg && bgImg) { noSmooth(); image(bgImg, cx - 1.6 * s, cy - 1.3 * s, 3.2 * s, 2.6 * s); smooth(); }
  stroke(60, 72, 88); noFill(); rect(cx - 1.6 * s, cy - 1.3 * s, 3.2 * s, 2.6 * s);
  noStroke(); pts.forEach((p, i) => { fill(labs[i] ? color(255, 125, 105) : color(90, 165, 240)); circle(cx + p[0] * s, cy - p[1] * s, 6); });
  fill(205, 212, 222); textSize(14); textAlign(LEFT, BASELINE); text('データ（色 = 本当の組。背景 = カーネル PCA の第 1 成分の値）', cx - 1.6 * s, cy - 1.3 * s - 10);
  // ---- 1 次元に射影して比べる
  let x = width * 0.5, w = width * 0.44;
  strip(linS, x, 170, w, 'ふつうの PCA の第 1 成分（いちばん良いしきい値で）', accL);
  strip(kp.comps[0], x, 290, w, 'カーネル PCA の第 1 成分（0 で分ける）', accK);
  // ---- カーネル PCA の第 1・第 2 成分
  let g = { x: x, y: 370, w: w * 0.5, h: Math.min(w * 0.5, height - 430) }, m1 = Math.max(...kp.comps[0].map(Math.abs), 1e-12), m2 = Math.max(...kp.comps[1].map(Math.abs), 1e-12);
  stroke(60, 72, 88); noFill(); rect(g.x, g.y, g.w, g.h);
  noStroke(); pts.forEach((_, i) => { fill(labs[i] ? color(255, 125, 105) : color(90, 165, 240)); circle(g.x + g.w / 2 + (kp.comps[0][i] / m1) * g.w * 0.46, g.y + g.h / 2 - (kp.comps[1][i] / m2) * g.h * 0.46, 5); });
  fill(205, 212, 222); textSize(14); text('カーネル PCA の得点（横 第 1、縦 第 2）', g.x, g.y - 8);
  let tx = g.x + g.w + 30; fill(220); textSize(15);
  text('γ = ' + fmtN(gam, 2), tx, g.y + 20);
  text('λ1 = ' + fmtN(kp.vals[0], 3) + '、λ2 = ' + fmtN(kp.vals[1], 3), tx, g.y + 46);
  text('グラム行列 ' + NPTS + '×' + NPTS, tx, g.y + 72);
  fill(accK >= 0.95 ? color(150, 220, 160) : color(255, 225, 140)); text(accK >= 0.95 ? '第 1 成分で分かれた！' : 'まだ分かれない', tx, g.y + 104);
  fill(165, 175, 190); textSize(13); text('γ が小さすぎると全部が「似ている」、大きすぎると自分以外は「似ていない」になって、どちらも分かれない', tx, g.y + 134, width - tx - 30);
  fill(240); textSize(22); textAlign(LEFT, BASELINE); text('カーネル PCA', 40, 44);
  fill(165, 175, 190); textSize(15); text('← → γ　1 同心円 2 三日月（いま ' + (dataKind === 1 ? '同心円' : '三日月') + '）　R 新しいデータ　スペース 背景', 40, 72);
  drawSelfTest(width - 190, height - 14);
}

function keyPressed() {
  if (key === LEFT_ARROW || key === RIGHT_ARROW) { gam = clampv(gam * (key === RIGHT_ARROW ? 1.4 : 1 / 1.4), 0.1, 200); recompute(); }
  if (key === '1' || key === '2') { dataKind = +key; rebuild(); }
  if (key === 'r' || key === 'R') { seedD++; rebuild(); }
  if (key === ' ') showBg = !showBg;
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(11); let D = makeCircles(NPTS, 0.05), P = D.map((d) => d.p), L = D.map((d) => d.lab);
  let K = rbfGram(P, 5), Kc = centerGram(K);
  check('RBF のグラム行列：対角 = 1、成分は 0〜1、対称', K.every((r, i) => near(r[i], 1, 1e-15) && r.every((v, j) => v > 0 && v <= 1 && v === K[j][i])));
  check('中心化したグラム行列は行の和も列の和も 0（1e-12）', Kc.every((r) => Math.abs(r.reduce((s, v) => s + v, 0)) < 1e-12));
  let r = kernelPCA(P, 5, 2);
  check('Kc α = λ α（成分 1・2、1e-8 × λ1）', [0, 1].every((c) => { let a = unitv(r.comps[c]), Ka = matVec(r.Kc, a); return Ka.every((v, i) => Math.abs(v - r.vals[c] * a[i]) < 1e-8 * r.vals[0]); }));
  kp = r; pts = P; gam = 5; rowMeanK = K.map((row) => row.reduce((a, b) => a + b, 0) / row.length);
  check('新しい点の式で学習した点を計算すると、得点 √λ α と一致', P.slice(0, 20).every((p, i) => near(kpcaScore(p, 0), r.comps[0][i], 1e-8)));
  let lin = jacobiEigen(covMatrix(P)), ls = projectData(P, colMeans(P), lin.vecs, 1).map((s) => s[0]);
  check('同心円（γ = 5）：カーネル PCA の第 1 成分の符号で 95% 以上を正しく分ける', signAccuracy(r.comps[0], L) >= 0.95);
  check('同心円：ふつうの PCA の第 1 成分は、いちばん良いしきい値でも 80% 未満', splitAccuracy(ls, L) < 0.8);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. ← → で γ を変えて、第 1 成分で分かれる範囲を探そう。小さすぎ・大きすぎると何が起きる？
// 2. 背景の色の境目は、どんな形？（円になっていれば成功）
// 3. 2 で三日月にすると、第 1 成分だけでは分かれにくい。第 2 成分も見ると？
// 4. カーネルを k(x, y) = (x·y)² にすると、同心円は分かれる？（rbfGram を書きかえて試そう）
// 5. 点の数を 2 倍にすると、計算時間はどれくらい増える？（グラム行列は n×n）

// ==================================================
// ここから下は「主成分分析の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 数の表示と安全のための道具
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
function fin(v, fb) { return typeof v === 'number' && isFinite(v) ? v : fb === undefined ? 0 : fb; }   // NaN・∞ を fb に
function fmtN(v, d) {                                                  // 数を小数 d 桁で（NaN は「?」）
  if (typeof v !== 'number' || !isFinite(v)) return '?';
  let s = v.toFixed(d === undefined ? 2 : d);
  return /^-0(\.0*)?$/.test(s) ? s.slice(1) : s;
}
function fmtVec(v, d) { return '(' + v.map((x) => fmtN(x, d)).join(', ') + ')'; }
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
function rndRange(a, b) { return a + (b - a) * rnd(); }
function gaussRnd() {                  // 標準正規分布（ボックス-ミュラー法）
  let u = Math.max(1e-12, rnd()), v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
// ---- 行列の道具。データ X は「n 行 × d 列」（1 行 = 1 個のデータ）、ベクトルは配列
function zerosMat(n, m) { return Array.from({ length: n }, () => new Array(m).fill(0)); }
function eyeMat(n) { let I = zerosMat(n, n); for (let i = 0; i < n; i++) I[i][i] = 1; return I; }
function matT(A) { return A[0].map((_, j) => A.map((r) => r[j])); }
function matMul(A, B) {
  let n = A.length, q = B.length, m = B[0].length, C = zerosMat(n, m);
  for (let i = 0; i < n; i++) for (let k = 0; k < q; k++) { let a = A[i][k]; if (a === 0) continue; for (let j = 0; j < m; j++) C[i][j] += a * B[k][j]; }
  return C;
}
function matVec(A, x) { return A.map((r) => dotv(r, x)); }
function dotv(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }
function vlen(a) { return Math.sqrt(dotv(a, a)); }
function unitv(a) { let L = vlen(a); return L > 1e-300 ? a.map((x) => x / L) : a.map((_, i) => (i === 0 ? 1 : 0)); }
function maxAbsDiff(A, B) { let m = 0; for (let i = 0; i < A.length; i++) for (let j = 0; j < A[i].length; j++) m = Math.max(m, Math.abs(A[i][j] - B[i][j])); return m; }
function colMeans(X) {                 // 平均ベクトル（列ごとの平均）
  let d = X[0].length, mu = new Array(d).fill(0);
  for (let r of X) for (let j = 0; j < d; j++) mu[j] += r[j];
  return mu.map((s) => s / Math.max(1, X.length));
}
function centerCols(X, mu) { return X.map((r) => r.map((v, j) => v - mu[j])); }   // 平均を引く（中心化）
// ★ 共分散行列 C = Xcᵀ Xc / (n − 1)（n − 1 で割る「不偏」の約束。点が 1 個以下ならゼロ行列）
function covMatrix(X) {
  let n = X.length, d = X[0].length, mu = colMeans(X), C = zerosMat(d, d);
  if (n < 2) return C;
  for (let r of X) for (let i = 0; i < d; i++) { let a = r[i] - mu[i]; for (let j = i; j < d; j++) C[i][j] += a * (r[j] - mu[j]); }
  for (let i = 0; i < d; i++) for (let j = i; j < d; j++) { C[i][j] /= n - 1; C[j][i] = C[i][j]; }
  return C;
}
// ★ ヤコビ法（対称行列の固有値分解）：非対角を 1 つずつ回転で 0 にしていく。d ≤ 64 くらいまで
// 戻り値 vals = 固有値（大きい順）、vecs[k] = k 番目の固有ベクトル（長さ 1、いちばん大きい成分を正に）
function jacobiEigen(C, maxSweeps) {
  let d = C.length, A = C.map((r) => r.slice()), V = eyeMat(d);
  for (let sw = 0; sw < (maxSweeps || 80); sw++) {
    let off = 0, tot = 0;
    for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) { let a = A[i][j] * A[i][j]; tot += a; if (i !== j) off += a; }
    if (!(off > 1e-30 * tot)) break;
    for (let p = 0; p < d - 1; p++) for (let q = p + 1; q < d; q++) {
      let apq = A[p][q];
      if (Math.abs(apq) < 1e-300) continue;
      let th = (A[q][q] - A[p][p]) / (2 * apq);
      let t = th === 0 ? 1 : Math.sign(th) / (Math.abs(th) + Math.sqrt(th * th + 1));
      let c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < d; k++) { let akp = A[k][p], akq = A[k][q]; A[k][p] = c * akp - s * akq; A[k][q] = s * akp + c * akq; }
      for (let k = 0; k < d; k++) { let apk = A[p][k], aqk = A[q][k]; A[p][k] = c * apk - s * aqk; A[q][k] = s * apk + c * aqk; }
      for (let k = 0; k < d; k++) { let vkp = V[k][p], vkq = V[k][q]; V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq; }
    }
  }
  let idx = Array.from({ length: d }, (_, i) => i).sort((a, b) => A[b][b] - A[a][a]);
  let vecs = idx.map((k) => { let v = V.map((r) => r[k]), big = 0; for (let i = 0; i < d; i++) if (Math.abs(v[i]) > Math.abs(v[big]) + 1e-12) big = i; return v[big] < 0 ? v.map((x) => -x) : v; });
  return { vals: idx.map((k) => A[k][k]), vecs };
}
function traceOf(C) { let s = 0; for (let i = 0; i < C.length; i++) s += C[i][i]; return s; }
// C V = V Λ の残り（いちばん大きいずれ）と、固有ベクトルどうしの直交のずれ
function eigResidual(C, eg) { let m = 0; eg.vecs.forEach((v, k) => { let Cv = matVec(C, v); for (let i = 0; i < v.length; i++) m = Math.max(m, Math.abs(Cv[i] - eg.vals[k] * v[i])); }); return m; }
function orthoError(vecs) { let m = 0; for (let a = 0; a < vecs.length; a++) for (let b = 0; b < vecs.length; b++) m = Math.max(m, Math.abs(dotv(vecs[a], vecs[b]) - (a === b ? 1 : 0))); return m; }
// 射影（主成分得点）と復元：score = (x − μ)·v_k、x_hat = μ + Σ score_k v_k（k 個まで）
function projectData(X, mu, vecs, k) { return X.map((r) => vecs.slice(0, k).map((v) => { let s = 0; for (let j = 0; j < r.length; j++) s += (r[j] - mu[j]) * v[j]; return s; })); }
function reconstructRow(score, mu, vecs) { let x = mu.slice(); score.forEach((s, k) => { for (let j = 0; j < x.length; j++) x[j] += s * vecs[k][j]; }); return x; }
function angleBetween(u, v) {          // 向きのちがい（符号は無視、0〜90°）。小さい角も正確に：atan2(‖v − (v·u)u‖, |v·u|)
  let a = unitv(u), b = unitv(v), c = dotv(a, b), r = 0; for (let i = 0; i < a.length; i++) r += (b[i] - c * a[i]) ** 2;
  return (Math.atan2(Math.sqrt(r), Math.abs(c)) * 180) / Math.PI;
}
function corrOf(a, b) {                // 相関係数
  let n = a.length, ma = a.reduce((s, v) => s + v, 0) / n, mb = b.reduce((s, v) => s + v, 0) / n, sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; }
  return saa > 0 && sbb > 0 ? sab / Math.sqrt(saa * sbb) : 0;
}
// ★ 大きいほうから k 個の固有ベクトルだけを求める「部分空間反復法」（べき乗法を k 本まとめて回し、毎回直交化）
// applyM(v) = M v を返す関数（M を作らなくてよい）。最後に k×k の小さい行列をヤコビ法で（レイリー-リッツ）
function orthonormalize(Q) {           // グラム-シュミット（修正版）
  for (let a = 0; a < Q.length; a++) {
    for (let b = 0; b < a; b++) { let p = dotv(Q[a], Q[b]); for (let i = 0; i < Q[a].length; i++) Q[a][i] -= p * Q[b][i]; }
    let L = vlen(Q[a]);
    if (L < 1e-12) { Q[a] = Q[a].map(() => gaussRnd()); a--; continue; }
    for (let i = 0; i < Q[a].length; i++) Q[a][i] /= L;
  }
  return Q;
}
function subspaceEigen(applyM, dim, k, iters, tol) {
  let Q = orthonormalize(Array.from({ length: k }, () => Array.from({ length: dim }, () => gaussRnd())));
  for (let it = 0; it < iters; it++) {
    let Z = orthonormalize(Q.map((q) => applyM(q)));
    let diff = 0; for (let a = 0; a < k; a++) diff = Math.max(diff, 1 - Math.abs(dotv(Z[a], Q[a])));
    Q = Z; if (tol && diff < tol && it > 5) break;
  }
  let MQ = Q.map((q) => applyM(q)), T = Q.map((qa) => MQ.map((mb) => dotv(qa, mb)));
  for (let a = 0; a < k; a++) for (let b = 0; b < a; b++) T[a][b] = T[b][a] = (T[a][b] + T[b][a]) / 2;
  let eg = jacobiEigen(T);
  let vecs = eg.vecs.map((w) => { let v = new Array(dim).fill(0); w.forEach((c, a) => { for (let i = 0; i < dim; i++) v[i] += c * Q[a][i]; }); let big = 0; for (let i = 0; i < dim; i++) if (Math.abs(v[i]) > Math.abs(v[big]) + 1e-12) big = i; return v[big] < 0 ? v.map((x) => -x) : v; });
  return { vals: eg.vals, vecs };
}
// ★ 次元 d が点の数 n より大きいとき：グラム行列 G = Xc Xcᵀ / (n − 1)（n×n）の固有ベクトル u から
// 主成分 v = Xcᵀ u / ‖Xcᵀ u‖ を作る（G と C は 0 でない固有値が同じ）。u は部分空間反復法で上から k 個
function pcaGram(Xc, k, iters) {
  let n = Xc.length, d = Xc[0].length;
  let G = Xc.map((a) => Xc.map((b) => dotv(a, b) / Math.max(1, n - 1)));
  let eg = subspaceEigen((u) => matVec(G, u), n, Math.min(k + 2, n), iters || 120, 1e-13);   // 2 本多めに回すと k 本目までの収束が速い
  let vecs = eg.vecs.slice(0, k).map((u) => { let v = new Array(d).fill(0); for (let i = 0; i < n; i++) for (let j = 0; j < d; j++) v[j] += u[i] * Xc[i][j]; return unitv(v); });
  return { vals: eg.vals.slice(0, k).map((l) => Math.max(0, l)), vecs, gramTrace: traceOf(G) };
}
// ---- カーネル PCA：K_ij = exp(−γ ‖x_i − x_j‖²) を「特徴空間で中心化」して固有ベクトル α を求める
function rbfGram(P, gam) { return P.map((a) => P.map((b) => { let s = 0; for (let j = 0; j < a.length; j++) s += (a[j] - b[j]) ** 2; return Math.exp(-gam * s); })); }
function centerGram(K) {               // Kc = K − 1K − K1 + 1K1（1 = すべて 1/n の行列）
  let n = K.length, rm = K.map((r) => r.reduce((s, v) => s + v, 0) / n), all = rm.reduce((s, v) => s + v, 0) / n;
  return K.map((r, i) => r.map((v, j) => v - rm[i] - rm[j] + all));
}
// 第 k 成分の得点 = Kc α_k / √λ_k = √λ_k α_k（α_k は長さ 1 の固有ベクトル）
function kernelPCA(P, gam, k) {
  let Kc = centerGram(rbfGram(P, gam)), eg = subspaceEigen((a) => matVec(Kc, a), P.length, k + 2, 400, 1e-14);
  let comps = eg.vecs.slice(0, k).map((a, c) => a.map((x) => x * Math.sqrt(Math.max(0, eg.vals[c]))));
  return { vals: eg.vals.slice(0, k), comps, Kc };
}
// ---- 「普通の PCA では分かれない」データ：同心円と 2 つの三日月（ラベルつき）
function makeCircles(n, noise) { return Array.from({ length: n }, (_, i) => { let lab = i % 2, r = lab ? 0.35 : 1, t = rnd() * 2 * Math.PI; return { p: [r * Math.cos(t) + noise * gaussRnd(), r * Math.sin(t) + noise * gaussRnd()], lab }; }); }
function makeMoons(n, noise) { return Array.from({ length: n }, (_, i) => { let lab = i % 2, t = rnd() * Math.PI; let p = lab ? [1 - Math.cos(t), 0.5 - Math.sin(t)] : [Math.cos(t), Math.sin(t)]; return { p: [p[0] - 0.5 + noise * gaussRnd(), p[1] - 0.25 + noise * gaussRnd()], lab }; }); }
// 1 次元の値で 2 つのラベルをどれだけ分けられるか：いちばん良いしきい値での正解率（0.5〜1）
function splitAccuracy(vals, labs) {
  let idx = vals.map((v, i) => i).sort((a, b) => vals[a] - vals[b]), n = vals.length, tot1 = labs.reduce((s, l) => s + l, 0), c1 = 0, best = 0;
  for (let k = 0; k <= n; k++) { if (k > 0) c1 += labs[idx[k - 1]]; let acc = (k - c1 + (tot1 - c1)) / n; best = Math.max(best, acc, 1 - acc); }
  return best;
}
function signAccuracy(vals, labs) { let a = vals.filter((v, i) => (v > 0 ? 1 : 0) === labs[i]).length / vals.length; return Math.max(a, 1 - a); }
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) ? v.every(noNaN) : !(typeof v === 'number' && !isFinite(v)); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length && n > 0 ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function selfTestOk() { return selfTestResults.length > 0 && selfTestResults.every((r) => r.ok); }
function drawSelfTest(x, y) { noStroke(); fill(selfTestOk() ? color(120, 210, 170) : color(255, 90, 90)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
