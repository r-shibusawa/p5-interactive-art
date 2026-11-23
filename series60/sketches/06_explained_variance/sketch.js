// ============================================
// 06 寄与率とスクリープロット ─ d 次元のデータは、本当は何次元？
// 隠れた k 個の要因 z を d 次元に混ぜて、少しノイズを足したデータを作る（k は秘密。H で答え）
//   固有値 λ1 ≥ λ2 ≥ … を棒グラフに（スクリープロット）。寄与率 = λ_i / Σλ、累積寄与率が 80% をこえる成分の数 = 「80% ルール」
//   ノイズが小さいと k 本目のあとでガクッと落ちる「ひじ」が見える。ノイズを大きくすると、ひじが見えにくくなる
// ← → 次元 d / ↑↓ ノイズ / H 答え（隠れた次元）/ R 新しいデータ / 1〜8 隠れた次元を決める
// ============================================

const NPTS = 300;                      // ★ 点の数
let dimD = 16, noiseS = 0.15, kTrue = 4, seedD = 3, showAns = false, eg = null, total = 0;   // ★ noiseS = ノイズの標準偏差

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); selfTest(); seedRng(77); kTrue = 2 + Math.floor(rnd() * 5); rebuild(); }
// ★ 合成データ：x = W z + ノイズ。W の列は d 次元の直交するベクトル、z の標準偏差は 2, 1.76, 1.55, …（分散 4, 3.1, 2.4, …）
function makeData(d, k, noise, n) {
  let Wc = orthonormalize(Array.from({ length: k }, () => Array.from({ length: d }, () => gaussRnd())));
  let sds = Array.from({ length: k }, (_, i) => 2 * Math.pow(0.88, i));
  return Array.from({ length: n }, () => { let x = Array.from({ length: d }, () => noise * gaussRnd()); for (let i = 0; i < k; i++) { let z = sds[i] * gaussRnd(); for (let j = 0; j < d; j++) x[j] += z * Wc[i][j]; } return x; });
}
function rebuild() { seedRng(seedD); let X = makeData(dimD, kTrue, noiseS, NPTS); eg = jacobiEigen(covMatrix(X)); total = eg.vals.reduce((s, v) => s + v, 0); }
function cumRatios(vals) { let tot = vals.reduce((s, v) => s + v, 0), c = 0; return vals.map((v) => (c += v) / Math.max(tot, 1e-300)); }
function k80(vals) { let c = cumRatios(vals); for (let i = 0; i < c.length; i++) if (c[i] >= 0.8) return i + 1; return c.length; }

function draw() {
  background(24, 30, 38);
  let cum = cumRatios(eg.vals), kk = k80(eg.vals), vmax = eg.vals[0] * 1.1;
  let g = { x: 90, y: 130, w: width * 0.56, h: height * 0.6, x0: 0, x1: dimD, y0: 0, y1: vmax };
  plotAxes(g, '成分の番号', '固有値 λ（棒）', [], [0, +(vmax / 2).toFixed(2), +vmax.toFixed(2)]);
  let bw = g.w / dimD;
  eg.vals.forEach((v, i) => {
    noStroke(); fill(i < kk ? color(90, 165, 240) : color(90, 110, 135)); if (showAns && i < kTrue) fill(255, 225, 140);
    rect(g.x + i * bw + bw * 0.15, gY(g, v), bw * 0.7, g.y + g.h - gY(g, v));
    fill(170); textSize(11); textAlign(CENTER, TOP); text(i + 1, g.x + (i + 0.5) * bw, g.y + g.h + 4);
  });
  // 累積寄与率（右の目盛り 0〜100%）
  let cy = (c) => g.y + g.h - c * g.h;
  stroke(255, 125, 105); strokeWeight(2.5); polyline(cum.map((c, i) => [g.x + (i + 0.5) * bw, cy(c)]));
  noStroke(); fill(255, 125, 105); cum.forEach((c, i) => circle(g.x + (i + 0.5) * bw, cy(c), 7));
  stroke(255, 125, 105, 150); strokeWeight(1); drawingContext.setLineDash([6, 6]); line(g.x, cy(0.8), g.x + g.w, cy(0.8)); drawingContext.setLineDash([]);
  noStroke(); fill(255, 125, 105); textSize(12); textAlign(LEFT, CENTER); for (let p of [0, 0.5, 0.8, 1]) text(Math.round(100 * p) + '%', g.x + g.w + 6, cy(p));
  // ---- 文字
  textAlign(LEFT, BASELINE); fill(240); textSize(22); text('寄与率とスクリープロット', 40, 44);
  fill(165, 175, 190); textSize(15); text('← → 次元 d（' + dimD + '）　↑↓ ノイズ（' + fmtN(noiseS, 2) + '）　H 答え　R 新しいデータ　1〜8 隠れた次元を決める', 40, 72);
  let x = g.x + g.w + 60, y = 140;
  fill(220); textSize(15); text('d = ' + dimD + '、n = ' + NPTS + '、Σλ = ' + fmtN(total, 3) + '（= トレース）', x, y); textSize(15);
  for (let i = 0; i < Math.min(8, dimD); i++) { fill(i < kk ? color(90, 165, 240) : 170); text('λ' + (i + 1) + ' = ' + fmtN(eg.vals[i], 3) + '　' + fmtN((100 * eg.vals[i]) / total, 1) + '%　累積 ' + fmtN(100 * cum[i], 1) + '%', x, y + 30 + i * 24); }
  y += 30 + 8 * 24 + 20;
  fill(255, 125, 105); textSize(18); text('80% ルール → ' + kk + ' 次元', x, y);
  let ratios = eg.vals.slice(0, -1).map((v, i) => v / Math.max(eg.vals[i + 1], 1e-300)), elbow = 1 + ratios.indexOf(Math.max(...ratios.slice(0, Math.min(10, ratios.length))));
  fill(90, 165, 240); text('ひじ（λ_i / λ_(i+1) 最大）→ ' + elbow + ' 次元', x, y + 28);
  fill(255, 225, 140); text(showAns ? '答え：隠れた次元 k = ' + kTrue : 'H で答えを見る', x, y + 56);
  fill(165, 175, 190); textSize(14);
  text('ノイズだけの成分の固有値は、どれも ノイズの分散 ' + fmtN(noiseS * noiseS, 4) + ' のまわりに集まる（灰色の低い棒）。ひじより後ろは「ノイズの床」', x, y + 90, width - x - 30);
  drawSelfTest(width - 190, height - 14);
}

function keyPressed() {
  if (key === LEFT_ARROW || key === RIGHT_ARROW) { dimD = clampv(dimD + (key === RIGHT_ARROW ? 2 : -2), 10, 30); rebuild(); }
  if (key === UP_ARROW || key === DOWN_ARROW) { noiseS = clampv(Math.round((noiseS + (key === UP_ARROW ? 0.05 : -0.05)) * 100) / 100, 0, 1.5); rebuild(); }
  if (key === 'h' || key === 'H') showAns = !showAns;
  if (key === 'r' || key === 'R') { seedD++; rebuild(); }
  for (let k = 1; k <= 8; k++) if (key === String(k)) { kTrue = k; rebuild(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(106);
  let okTr = true, okDim = true, okK80 = true, okFloor = true;
  for (let t = 0; t < 8; t++) {
    let d = 10 + 2 * t, k = 2 + (t % 5), X = makeData(d, k, 0.05, NPTS), C = covMatrix(X), e = jacobiEigen(C), cum = cumRatios(e.vals);
    if (!near(e.vals.reduce((s, v) => s + v, 0), traceOf(C), 1e-10 * traceOf(C)) || !near(cum[d - 1], 1, 1e-12) || !cum.every((c, i) => i === 0 || c >= cum[i - 1] - 1e-15)) okTr = false;
    if (!(cum[k - 1] > 0.99 && e.vals[k - 1] > 20 * e.vals[k])) okDim = false;                           // k 本でほぼ全部、k 本目のあとにはっきりしたひじ
    if (!(k80(e.vals) <= k)) okK80 = false;
    let tail = e.vals.slice(k), tm = tail.reduce((s, v) => s + v, 0) / tail.length;
    if (!near(tm, 0.05 * 0.05, 0.25 * 0.0025)) okFloor = false;
  }
  check('固有値の和 = トレース、累積寄与率は増えていき最後は 100%（d = 10〜24）', okTr);
  check('ノイズ 0.05：隠れた k 本で累積 99% 超、λ_k / λ_(k+1) > 20（ひじ = 本当の次元）', okDim);
  check('ノイズ 0.05：80% ルールの次元 ≤ 本当の次元', okK80);
  check('ノイズだけの成分の固有値の平均 ≈ ノイズの分散（±25%）', okFloor);
  seedRng(5); let lo = jacobiEigen(covMatrix(makeData(20, 3, 0.05, NPTS))).vals, hi = jacobiEigen(covMatrix(makeData(20, 3, 1.2, NPTS))).vals;
  check('ノイズを大きくすると ひじの段差 λ3/λ4 が小さくなり、80% ルールの次元が増える', lo[2] / lo[3] > 5 * (hi[2] / hi[3]) && k80(hi) > k80(lo));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. H を押す前に、棒グラフから隠れた次元を当てよう。80% ルールとひじ、どちらが当たる？
// 2. ↑ でノイズを 0.6 くらいにすると、ひじはどこ？ 80% ルールの答えはどう変わる？
// 3. ← → で次元 d を 30 にすると、同じノイズでも 80% ルールの答えが変わるのはなぜ？（ノイズの床の面積）
// 4. 1〜8 で隠れた次元を変えて試そう。8 だと 80% ルールは何と言う？
// 5. makeData の 0.88（要因の大きさの減り方）を 0.5 にすると、スクリープロットはどうなる？

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
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) ? v.every(noNaN) : !(typeof v === 'number' && !isFinite(v)); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length && n > 0 ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function selfTestOk() { return selfTestResults.length > 0 && selfTestResults.every((r) => r.ok); }
function drawSelfTest(x, y) { noStroke(); fill(selfTestOk() ? color(120, 210, 170) : color(255, 90, 90)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
