// ============================================
// 12 PCA と独立成分分析（ICA）─ 2 つの音が混ざった録音から、元の音を取り出せる？
// 元の信号 s1, s2（のこぎり波・正弦波など）を行列 A で混ぜた観測 x = A s だけを使う
//   PCA：x を回して「無相関」にするところまで（白色化 10）。でも無相関にする回し方はいくらでもある → 元にはもどらない
//   FastICA：白色化したあと、出力が「いちばん正規分布らしくない」回転を探す（非線形 g = tanh、両方同時に求めて対称に直交化）
//   取り出した信号の「順番」と「符号（上下）」と「大きさ」は決まらない（どれでも x = A s をみたす）
// ← → 混ぜ方 / 1 のこぎり＋正弦 2 矩形＋正弦 3 のこぎり＋矩形 / R ICA をやり直す（はじめの向きを変える）
// ============================================

const NS = 600;                        // ★ 時間のサンプル数
let mixT = 0.6, pairK = 1, seedI = 21, src = [], obs = [], pcaOut = [], icaOut = [], icaIters = 0, corrP = [], corrI = [];   // ★ mixT = 混ぜ方

// ★ 元の信号（音のような周期的な波）
function makeSources(k) {
  let saw = (t) => 2 * ((t * 1.3) % 1) - 1, sq = (t) => (Math.sin(2 * Math.PI * 0.7 * t) >= 0 ? 1 : -1), sn = (t) => Math.sin(2 * Math.PI * 0.9 * t + 0.3);
  let f = k === 1 ? [saw, sn] : k === 2 ? [sq, sn] : [saw, sq];
  return Array.from({ length: NS }, (_, i) => { let t = (i / NS) * 8; return [f[0](t), f[1](t)]; });
}
function mixMatrix(t) { return [[1, t], [0.4 + 0.5 * t, 1]]; }
function absCorrTable(Y, S) { return [0, 1].map((k) => [0, 1].map((j) => Math.abs(corrOf(Y.map((y) => y[k]), S.map((s) => s[j]))))); }
function bestMatch(T) { return Math.max(Math.min(T[0][0], T[1][1]), Math.min(T[0][1], T[1][0])); }   // 順番の入れかえを許した「元との相関」の小さいほう
// ★ 全部の計算：混ぜる → PCA → 白色化 → FastICA
function rebuild() {
  src = makeSources(pairK); let Am = mixMatrix(mixT); obs = src.map((s) => matVec(Am, s));
  let mu = colMeans(obs), e = jacobiEigen(covMatrix(obs)); pcaOut = projectData(obs, mu, e.vecs, 2);
  let w = whitenData(obs); seedRng(seedI); let r = fastICA(w.Z, 300); icaIters = r.iters; icaOut = w.Z.map((z) => matVec(r.Wm, z));
  corrP = absCorrTable(pcaOut, src); corrI = absCorrTable(icaOut, src);
}
function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); selfTest(); rebuild(); }

function wave(Y, k, x, y, w, h, col, title) {
  let m = Math.max(...Y.map((v) => Math.abs(v[k])), 1e-12);
  stroke(55, 66, 80); strokeWeight(1); line(x, y + h / 2, x + w, y + h / 2);
  stroke(...col); strokeWeight(1.5); polyline(Y.slice(0, 300).map((v, i) => [x + (i / 299) * w, y + h / 2 - (v[k] / m) * h * 0.45]));
  noStroke(); fill(190, 198, 210); textSize(12); textAlign(LEFT, BASELINE); text(title, x, y + 2);
}
function scatter(Y, x, y, s, title) {
  let m = Math.max(...Y.flat().map(Math.abs), 1e-12);
  stroke(60, 72, 88); strokeWeight(1); noFill(); rect(x, y, s, s);
  noStroke(); fill(225, 232, 242, 120); for (let v of Y) circle(x + s / 2 + (v[0] / m) * s * 0.46, y + s / 2 - (v[1] / m) * s * 0.46, 3);
  fill(205, 212, 222); textSize(13); textAlign(LEFT, BASELINE); text(title, x, y - 6);
}

function draw() {
  background(24, 30, 38);
  let cols = ['元の信号 s', '観測 x = A s', 'PCA の出力', 'ICA の出力'], sets = [src, obs, pcaOut, icaOut];
  let cw = (width - 80 - 3 * 24) / 4, sz = Math.min(cw, height * 0.3);
  sets.forEach((Y, c) => {
    let x = 40 + c * (cw + 24);
    scatter(Y, x, 120, sz, cols[c] + '（散布図）');
    wave(Y, 0, x, 160 + sz, cw, 70, [255, 225, 140], '1 本目');
    wave(Y, 1, x, 250 + sz, cw, 70, [90, 165, 240], '2 本目');
  });
  let y = 350 + sz, x = 40, Am = mixMatrix(mixT);
  noStroke(); fill(220); textSize(15); textAlign(LEFT, BASELINE);
  text('A = [[' + Am[0].map((v) => fmtN(v, 2)).join(', ') + '], [' + Am[1].map((v) => fmtN(v, 2)).join(', ') + ']]', x, y);
  let pc = covMatrix(pcaOut), ic = covMatrix(icaOut);
  text('PCA の出力どうしの相関 ' + fmtN(pc[0][1] / Math.sqrt(pc[0][0] * pc[1][1]), 4) + '（無相関）　ICA の出力どうしの相関 ' + fmtN(ic[0][1] / Math.sqrt(ic[0][0] * ic[1][1]), 4), x, y + 26);
  fill(255, 125, 105); text('元の信号との |相関|（順番は入れかえて良い方）　PCA：' + fmtN(bestMatch(corrP), 3), x, y + 56);
  fill(150, 220, 160); text('ICA：' + fmtN(bestMatch(corrI), 3) + '（FastICA ' + icaIters + ' 回で収束）', x + 470, y + 56);
  fill(165, 175, 190); textSize(14);
  text('PCA は「ばらつきの大きい順」に直交する軸をとるだけ。混ぜ方の軸は直交とは限らないので、PCA の出力はまだ 2 つの信号が混ざっている。ICA は「独立」（片方を知っても、もう片方が分からない）を目標にするので、散布図の平行四辺形が軸にそろう', x, y + 86, width - 80);
  fill(240); textSize(22); text('PCA と独立成分分析', 40, 44);
  fill(165, 175, 190); textSize(15); text('← → 混ぜ方（' + fmtN(mixT, 2) + '）　1 のこぎり＋正弦　2 矩形＋正弦　3 のこぎり＋矩形　R ICA をやり直す', 40, 72);
  drawSelfTest(width - 190, height - 14);
}

function keyPressed() {
  if (key === LEFT_ARROW || key === RIGHT_ARROW) { mixT = clampv(Math.round((mixT + (key === RIGHT_ARROW ? 0.1 : -0.1)) * 10) / 10, -0.9, 0.9); rebuild(); }
  for (let k = 1; k <= 3; k++) if (key === String(k)) { pairK = k; rebuild(); }
  if (key === 'r' || key === 'R') { seedI++; rebuild(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let okW = true, okICA = true, okOrth = true, okPCAunc = true, worstP = 1;
  for (let k = 1; k <= 3; k++) for (let t of [-0.6, 0.2, 0.7]) {
    let S = makeSources(k), X = S.map((s) => matVec(mixMatrix(t), s)), w = whitenData(X);
    if (maxAbsDiff(covMatrix(w.Z), eyeMat(2)) > 1e-9) okW = false;
    seedRng(200 + k); let r = fastICA(w.Z, 300), Y = w.Z.map((z) => matVec(r.Wm, z));
    if (bestMatch(absCorrTable(Y, S)) < 0.98) okICA = false;
    if (maxAbsDiff(matMul(r.Wm, matT(r.Wm)), eyeMat(2)) > 1e-9) okOrth = false;
    let e = jacobiEigen(covMatrix(X)), P = projectData(X, colMeans(X), e.vecs, 2), Cp = covMatrix(P);
    if (Math.abs(Cp[0][1]) > 1e-9 * Cp[0][0]) okPCAunc = false;
    worstP = Math.min(worstP, bestMatch(absCorrTable(P, S)));
  }
  check('白色化した観測の共分散 = I（3 組 × 3 つの混ぜ方、1e-9）', okW);
  check('FastICA は元の信号を取り出す（順番を入れかえて |相関| ≥ 0.98、9 通りすべて）', okICA);
  check('FastICA の分離行列 W は直交（W Wᵀ = I、1e-9）', okOrth);
  check('PCA の出力は無相関（共分散の非対角 ≈ 0）', okPCAunc);
  check('でも PCA の出力は元の信号にもどらない例がある（いちばん悪い例で |相関| < 0.95）', worstP < 0.95);
  let S = makeSources(1), cs = covMatrix(S);
  check('元の 2 つの信号はほとんど無相関（|相関| < 0.1）＝ 混ぜなければ PCA でも ICA でもそのまま', Math.abs(cs[0][1] / Math.sqrt(cs[0][0] * cs[1][1])) < 0.1);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. ← → で混ぜ方を変えよう。PCA の出力が元にもどるのはどんな混ぜ方のとき？
// 2. ICA の出力の順番や上下は、R を押すたびに変わることがある。なぜ決まらない？
// 3. 散布図の形に注目：元の信号（四角っぽい）→ 観測（平行四辺形）→ PCA（回った平行四辺形）→ ICA（四角）
// 4. 2 つとも正規分布の雑音だったら ICA でも分けられない。なぜ？（どの回転でも同じ丸い雲）
// 5. 3 つの信号を 3 つのマイクで録音したら？ fastICA は何次元でも同じ式で動く

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
// ---- 2×2 対称行列 [[a, b], [b, c]] の固有値・固有ベクトル（解の公式）
function eig2sym(a, b, c) {
  let tr = a + c, h = Math.sqrt(((a - c) / 2) ** 2 + b * b), l1 = tr / 2 + h, l2 = tr / 2 - h;
  let v1 = Math.abs(b) > 1e-14 * (Math.abs(a) + Math.abs(c) + 1e-300) ? unitv([l1 - c, b]) : a >= c ? [1, 0] : [0, 1];
  if (v1[0] < 0 || (v1[0] === 0 && v1[1] < 0)) v1 = [-v1[0], -v1[1]];
  return { l1, l2, v1, v2: [-v1[1], v1[0]], angle: (Math.atan2(v1[1], v1[0]) * 180) / Math.PI };
}
// ---- グラフと図の道具：g = { x, y, w, h, x0, x1, y0, y1 }
function gX(g, v) { return g.x + clampv((v - g.x0) / (g.x1 - g.x0), -0.02, 1.02) * g.w; }
function gY(g, v) { return g.y + g.h - clampv((v - g.y0) / (g.y1 - g.y0), -0.02, 1.02) * g.h; }
function plotAxes(g, xl, yl, xt, yt) {
  stroke(80, 92, 108); strokeWeight(1); noFill(); rect(g.x, g.y, g.w, g.h);
  noStroke(); fill(160, 170, 185); textSize(12); textAlign(CENTER, TOP);
  for (let v of xt) text(+(+v).toPrecision(3), gX(g, v), g.y + g.h + 4);
  textAlign(RIGHT, CENTER);
  for (let v of yt) text(+(+v).toPrecision(3), g.x - 5, gY(g, v));
  textAlign(LEFT, BASELINE); fill(205, 212, 222); textSize(13);
  text(xl, g.x + g.w - textWidth(xl), g.y + g.h + 32); text(yl, g.x, g.y - 8);
}
function polyline(pts, closed) {       // 点が 2 つ以上あるときだけ折れ線を描く
  if (pts.length < 2) return;
  noFill(); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape(closed ? CLOSE : undefined);
}
// 共分散 C の「k σ の楕円」の点（データの単位）。中心 μ、長さ 1 の 2×2 固有分解で作る
function covEllipsePts(mu, C, k, segs) {
  let e = eig2sym(C[0][0], C[0][1], C[1][1]), a = k * Math.sqrt(Math.max(0, e.l1)), b = k * Math.sqrt(Math.max(0, e.l2)), out = [];
  for (let i = 0; i <= (segs || 72); i++) { let t = (2 * Math.PI * i) / (segs || 72), u = a * Math.cos(t), w = b * Math.sin(t); out.push([mu[0] + u * e.v1[0] + w * e.v2[0], mu[1] + u * e.v1[1] + w * e.v2[1]]); }
  return out;
}
function arrow2(x1, y1, x2, y2, hs) {  // 矢印（hs = 矢じりの大きさ）
  line(x1, y1, x2, y2);
  let a = Math.atan2(y2 - y1, x2 - x1), h = hs || 10;
  noStroke(); triangle(x2, y2, x2 - h * Math.cos(a - 0.4), y2 - h * Math.sin(a - 0.4), x2 - h * Math.cos(a + 0.4), y2 - h * Math.sin(a + 0.4));
}
// ---- 標準化と白色化
function standardizeCols(X) {          // 各列を平均 0・標準偏差 1 に（標準偏差 0 の列は 0 のまま）
  let mu = colMeans(X), C = covMatrix(X), sd = C.map((r, i) => Math.sqrt(Math.max(0, r[i])));
  return { Z: X.map((r) => r.map((v, j) => (sd[j] > 1e-12 ? (v - mu[j]) / sd[j] : 0))), mu, sd };
}
// ★ 白色化（PCA 白色化）：z = Λ^(−1/2) Vᵀ (x − μ)。共分散が単位行列 I になる（eps で 0 割りを防ぐ）
function whitenData(X, eps) {
  let mu = colMeans(X), eg = jacobiEigen(covMatrix(X)), e = eps === undefined ? 1e-12 : eps;
  let Wm = eg.vecs.map((v, k) => v.map((x) => x / Math.sqrt(Math.max(eg.vals[k], 0) + e)));
  return { Z: X.map((r) => matVec(Wm, r.map((v, j) => v - mu[j]))), Wm, mu, eg };
}
// ---- FastICA（非線形 g = tanh、全部の成分を同時に求めて「対称な直交化」W ← (W Wᵀ)^(−1/2) W）
// Z は白色化したデータ（n 行 × m 列）。戻り値 W（行 = 分離の向き）と反復回数
function symDecorrelate(Wm) {
  let eg = jacobiEigen(matMul(Wm, matT(Wm))), m = Wm.length, Mh = zerosMat(m, m);
  eg.vecs.forEach((e, k) => { let s = 1 / Math.sqrt(Math.max(eg.vals[k], 1e-15)); for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) Mh[i][j] += s * e[i] * e[j]; });
  return matMul(Mh, Wm);
}
function fastICA(Z, iters) {
  let n = Z.length, m = Z[0].length, Wm = symDecorrelate(Array.from({ length: m }, () => Array.from({ length: m }, () => gaussRnd()))), it = 0;
  for (it = 0; it < (iters || 200); it++) {
    let Wn = Wm.map((w) => {
      let acc = new Array(m).fill(0), gp = 0;
      for (let r of Z) { let y = Math.tanh(dotv(w, r)); gp += 1 - y * y; for (let j = 0; j < m; j++) acc[j] += r[j] * y; }
      return acc.map((a, j) => a / n - (gp / n) * w[j]);
    });
    Wn = symDecorrelate(Wn);
    let lim = 0; for (let i = 0; i < m; i++) lim = Math.max(lim, Math.abs(Math.abs(dotv(Wn[i], Wm[i])) - 1));
    Wm = Wn; if (lim < 1e-12) break;
  }
  return { Wm, iters: it };
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) ? v.every(noNaN) : !(typeof v === 'number' && !isFinite(v)); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length && n > 0 ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function selfTestOk() { return selfTestResults.length > 0 && selfTestResults.every((r) => r.ok); }
function drawSelfTest(x, y) { noStroke(); fill(selfTestOk() ? color(120, 210, 170) : color(255, 90, 90)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
