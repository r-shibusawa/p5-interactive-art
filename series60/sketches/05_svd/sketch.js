// ============================================
// 05 特異値分解 ─ どんな行列も「回転 → 伸び縮み → 回転」：X = U Σ Vᵀ
// このスケッチの計算法：XᵀX（d×d）をヤコビ法で固有値分解 → V と σ_k = √(固有値)、U の列 = X v_k / σ_k（σ ≈ 0 の列は作らない）
//   上：2×2 の行列 A が単位円を楕円に写す様子を 3 段に分ける（Vᵀ で回す → Σ で縦横にのばす → U で回す）
//   下：中心化したデータ行列 Xc（n×2）の SVD。V の列 = 主成分、σ²/(n − 1) = 共分散行列の固有値 λ
// 右上の図の ● をドラッグ A の列（A e1・A e2）/ R 新しいデータ / ↑↓ データの細さ / スペース 円の点を動かす
// ============================================

let matA = [[1.4, 0.6], [0.3, 0.9]], dragCol = -1, pts = [], seedP = 6, thin = 0.4, phase = 0, moving = true;   // ★ matA = 上の 2×2 行列
// ★ 特異値分解（XᵀX の固有値分解から）。X は n 行 × d 列。U は n×r、sig は r 個、V は d 個のベクトル
function svdViaEig(X) {
  let G = matMul(matT(X), X), eg = jacobiEigen(G), sig = eg.vals.map((l) => Math.sqrt(Math.max(0, l))), tol = 1e-7 * Math.max(sig[0], 1e-300), U = [];
  eg.vecs.forEach((v, k) => { if (sig[k] > tol) U.push(X.map((r) => dotv(r, v) / sig[k])); });   // U の列 k（長さ n）
  return { U, sig, V: eg.vecs, rank: U.length };
}
function rebuild() { seedRng(seedP); pts = gaussCloud(40, [0, 0], covFromAxes(1.8, 1.8 * thin, 20 + 60 * rnd())); }
function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); selfTest(); rebuild(); }

// 小さな座標の枠に、点の列を写して描く
function panel(x, y, w, title) { stroke(60, 72, 88); noFill(); rect(x, y, w, w); line(x, y + w / 2, x + w, y + w / 2); line(x + w / 2, y, x + w / 2, y + w); noStroke(); fill(205, 212, 222); textSize(15); textAlign(LEFT, BASELINE); text(title, x, y - 10); }
function drawShape(x, y, w, sc, M) {   // 単位円と e1・e2（M で写したもの）
  let P = (p) => [x + w / 2 + p[0] * sc, y + w / 2 - p[1] * sc], circ = Array.from({ length: 73 }, (_, i) => { let t = (i * Math.PI) / 36; return matVec(M, [Math.cos(t), Math.sin(t)]); });
  noStroke(); fill(90, 165, 240, 40); beginShape(); for (let p of circ) { let q = P(p); vertex(q[0], q[1]); } endShape(CLOSE);
  stroke(90, 165, 240); strokeWeight(2); polyline(circ.map(P));
  let o = P([0, 0]), a = P(matVec(M, [1, 0])), b = P(matVec(M, [0, 1])), t = P(matVec(M, [Math.cos(phase), Math.sin(phase)]));
  stroke(255, 225, 140); fill(255, 225, 140); arrow2(o[0], o[1], a[0], a[1], 9); stroke(255, 125, 105); fill(255, 125, 105); arrow2(o[0], o[1], b[0], b[1], 9);
  noStroke(); fill(240); circle(t[0], t[1], 9);
  return { a, b };
}
function diag2(s) { return [[s[0], 0], [0, s[1]]]; }
function svd2(A) { let r = svdViaEig(A), Um = r.rank === 2 ? matT(r.U) : null; if (!Um) { let u0 = r.U[0] || [1, 0]; Um = [[u0[0], -u0[1]], [u0[1], u0[0]]]; } return { Um, sig: r.sig, Vt: r.V }; }   // Um の列 = U の列

function draw() {
  background(24, 30, 38);
  if (moving) phase += 0.02;
  // ---- 上：A = U Σ Vᵀ を 3 段で
  let sv = svd2(matA), Vt = sv.Vt, Sg = diag2(sv.sig), w = Math.min((width - 140) / 4, height * 0.33), y0 = 120, sc = w / 2 / Math.max(2.2, sv.sig[0] * 1.1), steps = [eyeMat(2), Vt, matMul(Sg, Vt), matMul(sv.Um, matMul(Sg, Vt))];
  let names = ['単位円', '① Vᵀ（回転か折り返し）', '② Σ でのばす', '③ U で回す = A'];
  steps.forEach((M, i) => { let x = 40 + i * (w + 20); panel(x, y0, w, names[i]); let r = drawShape(x, y0, w, sc, M); if (i === 3) { noStroke(); fill(255, 225, 140); circle(r.a[0], r.a[1], 16); fill(255, 125, 105); circle(r.b[0], r.b[1], 16); } });
  // ---- 下：データ行列の SVD
  let Xc = centerCols(pts, colMeans(pts)), sd = svdViaEig(Xc), C = covMatrix(pts), ec = jacobiEigen(C), n = pts.length;
  let by = y0 + w + 60, bw = Math.min(height - by - 40, width * 0.3), s2 = bw / 2 / 4.2, cx = 40 + bw / 2, cy = by + bw / 2;
  panel(40, by, bw, 'データ Xc（' + n + ' 点）と V の列 × σ/√(n − 1)');
  noStroke(); fill(225, 232, 242, 190); for (let r of Xc) circle(cx + r[0] * s2, cy - r[1] * s2, 6);
  sd.V.forEach((v, k) => { let L = (2 * sd.sig[k]) / Math.sqrt(n - 1); stroke(k ? color(255, 125, 105) : color(255, 225, 140)); fill(k ? color(255, 125, 105) : color(255, 225, 140)); strokeWeight(2.5); arrow2(cx, cy, cx + v[0] * L * s2, cy - v[1] * L * s2, 10); });
  // ---- 数字
  let x = 80 + bw, y = by + 10;
  noStroke(); textAlign(LEFT, BASELINE); fill(240); textSize(22); text('特異値分解　X = U Σ Vᵀ', 40, 44);
  fill(165, 175, 190); textSize(15); text('右上の ● ドラッグ A の列　R 新しいデータ　↑↓ 細さ（' + fmtN(thin, 2) + '）　スペース 点を動かす', 40, 72);
  fill(220); textSize(16);
  text('A = [[' + matA[0].map((v) => fmtN(v, 2)).join(', ') + '], [' + matA[1].map((v) => fmtN(v, 2)).join(', ') + ']]　特異値 σ = ' + sv.sig.map((v) => fmtN(v, 3)).join(', ') + '　|det A| = ' + fmtN(Math.abs(matA[0][0] * matA[1][1] - matA[0][1] * matA[1][0]), 3) + ' = σ1 σ2', x, y);
  let rec = 0; Xc.forEach((r, i) => r.forEach((v, j) => { let s = 0; for (let k = 0; k < sd.rank; k++) s += sd.U[k][i] * sd.sig[k] * sd.V[k][j]; rec = Math.max(rec, Math.abs(s - v)); }));
  fill(255, 225, 140); text('データ：σ1 = ' + fmtN(sd.sig[0], 4) + '　σ1²/(n − 1) = ' + fmtN(sd.sig[0] ** 2 / (n - 1), 5) + '　共分散の λ1 = ' + fmtN(ec.vals[0], 5), x, y + 34);
  fill(255, 125, 105); text('　　　　σ2 = ' + fmtN(sd.sig[1], 4) + '　σ2²/(n − 1) = ' + fmtN(sd.sig[1] ** 2 / (n - 1), 5) + '　共分散の λ2 = ' + fmtN(ec.vals[1], 5), x, y + 60);
  fill(220); text('V の列 = ' + sd.V.map((v) => fmtVec(v, 3)).join('、') + '　（共分散の固有ベクトルと同じ）', x, y + 92);
  text('U は ' + n + '×2（各点の「長さ 1 にそろえた主成分得点」）　UᵀU = I のずれ ' + (orthoError(sd.U)).toExponential(1) + '　U Σ Vᵀ と Xc のずれ ' + rec.toExponential(1), x, y + 118, width - x - 30);
  fill(165, 175, 190); textSize(14);
  text('PCA は「Xc の SVD」と同じ。主成分得点 = U Σ = Xc V。ここでは XᵀX の固有値分解から作った（小さい σ は 2 乗で精度が落ちるので、本格的な計算ではゴルブ-カハン法などで直接 SVD を求める）', x, y + 170, width - x - 30);
  drawSelfTest(width - 190, height - 14);
}

function panel4() { let w = Math.min((width - 140) / 4, height * 0.33); return { x: 40 + 3 * (w + 20), y: 120, w, sc: w / 2 / Math.max(2.2, svd2(matA).sig[0] * 1.1) }; }
function mousePressed() {
  let p = panel4(); dragCol = -1;
  for (let j = 0; j < 2; j++) { let q = [p.x + p.w / 2 + matA[0][j] * p.sc, p.y + p.w / 2 - matA[1][j] * p.sc]; if (Math.hypot(mouseX - q[0], mouseY - q[1]) < 14) dragCol = j; }
}
function mouseDragged() { if (dragCol < 0) return; let p = panel4(); matA[0][dragCol] = clampv((mouseX - p.x - p.w / 2) / p.sc, -2.5, 2.5); matA[1][dragCol] = clampv(-(mouseY - p.y - p.w / 2) / p.sc, -2.5, 2.5); }
function mouseReleased() { dragCol = -1; }
function keyPressed() {
  if (key === 'r' || key === 'R') { seedP++; rebuild(); }
  if (key === UP_ARROW || key === DOWN_ARROW) { thin = clampv(thin + (key === UP_ARROW ? 0.1 : -0.1), 0, 1); rebuild(); }
  if (key === ' ') moving = !moving;
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(105);
  let okRec = true, okU = true, okLam = true, okV = true;
  for (let t = 0; t < 10; t++) {
    let n = 20 + 5 * t, d = 2 + (t % 5), X = Array.from({ length: n }, () => Array.from({ length: d }, (_, j) => gaussRnd() * (1 + j))), mu = colMeans(X), Xc = centerCols(X, mu), r = svdViaEig(Xc), sc = r.sig[0];
    let err = 0; Xc.forEach((row, i) => row.forEach((v, j) => { let s = 0; for (let k = 0; k < r.rank; k++) s += r.U[k][i] * r.sig[k] * r.V[k][j]; err = Math.max(err, Math.abs(s - v)); }));
    if (err > 1e-9 * sc) okRec = false;
    if (orthoError(r.U) > 1e-9 || orthoError(r.V) > 1e-12) okU = false;
    let ec = jacobiEigen(covMatrix(X));
    if (!ec.vals.every((l, k) => near(r.sig[k] ** 2 / (n - 1), l, 1e-9 * ec.vals[0]))) okLam = false;
    if (!ec.vecs.every((v, k) => angleBetween(v, r.V[k]) < 1e-6)) okV = false;
  }
  check('U Σ Vᵀ = Xc（10 個のデータ行列、ずれ ≤ 1e-9 × σ1）', okRec);
  check('U の列も V の列も正規直交', okU);
  check('σ_k²/(n − 1) = 共分散行列の固有値 λ_k', okLam);
  check('V の列 = 共分散行列の固有ベクトル（向き 1e-6° 以内）', okV);
  let okA = true;
  for (let t = 0; t < 30; t++) {
    let A = [[rndRange(-2, 2), rndRange(-2, 2)], [rndRange(-2, 2), rndRange(-2, 2)]], s = svd2(A), B = matMul(s.Um, matMul(diag2(s.sig), s.Vt));
    if (maxAbsDiff(A, B) > 1e-12 || !near(s.sig[0] * s.sig[1], Math.abs(A[0][0] * A[1][1] - A[0][1] * A[1][0]), 1e-12)) okA = false;
    let mx = 0; for (let i = 0; i < 720; i++) { let a = (i * Math.PI) / 360; mx = Math.max(mx, vlen(matVec(A, [Math.cos(a), Math.sin(a)]))); }
    if (!near(mx, s.sig[0], 1e-4 * s.sig[0])) okA = false;
  }
  check('2×2：A = U Σ Vᵀ、σ1 σ2 = |det A|、σ1 = 単位円の像のいちばん長い半径', okA);
  let Rk = svdViaEig([[1, 2], [2, 4], [3, 6], [-6, -12]]);
  check('ランク 1 の行列は σ2 ≈ 0 で U を 1 列だけ作る（0 割りなし、NaN なし）', Rk.rank === 1 && noNaN(Rk.U) && Rk.sig[1] < 1e-6);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 右上の ● を動かし、A を回転行列（例 [[0, −1], [1, 0]]）にしてみよう。Σ はどうなる？
// 2. A e1 と A e2 を同じ向きにそろえると（ランク 1）、② の楕円はどうなる？ σ2 は？
// 3. ↓ でデータを細くすると σ2 → 0。そのとき U の 2 列目は何を表している？
// 4. σ1 σ2 = |det A| なのはなぜ？（面積の倍率）
// 5. 画像の行列を SVD して大きい σ だけ残すと画像の圧縮になる → 07 の復元と同じ考え

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
// ---- 好きな共分散の正規分布の点群：x = μ + L z（C = L Lᵀ、コレスキー分解）
function cholesky(C) {
  let d = C.length, L = zerosMat(d, d);
  for (let i = 0; i < d; i++) for (let j = 0; j <= i; j++) {
    let s = C[i][j]; for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
    L[i][j] = i === j ? Math.sqrt(Math.max(s, 1e-15)) : s / L[j][j];
  }
  return L;
}
function gaussCloud(n, mu, C) { let L = cholesky(C); return Array.from({ length: n }, () => { let z = mu.map(() => gaussRnd()); return mu.map((m, i) => m + dotv(L[i], z)); }); }
function covFromAxes(s1, s2, deg) {    // 長軸の標準偏差 s1、短軸 s2、長軸の角度 deg（度）の 2×2 共分散
  let t = (deg * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t);
  return [[c * c * s1 * s1 + s * s * s2 * s2, c * s * (s1 * s1 - s2 * s2)], [c * s * (s1 * s1 - s2 * s2), s * s * s1 * s1 + c * c * s2 * s2]];
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
