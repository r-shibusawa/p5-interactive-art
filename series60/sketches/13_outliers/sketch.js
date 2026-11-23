// ============================================
// 13 外れ値に弱い ─ たった 1 つの変な点で、第 1 主成分が大きく回ってしまう
// 分散は「ずれの 2 乗」の平均なので、遠い点ほど 2 乗で効く。外れ値（ピンクの ●）をドラッグして試そう
//   工夫：① 平均のかわりに中央値で中心をとる ② 中心からの距離（マハラノビス距離 d）が大きい点の重みを w = 1/(1 + (d/2)²) に下げる
//   ③ 重みつきの共分散で主成分を求め直す → ② にもどる（20 回くり返す）。点の大きさ = 重み
// ドラッグ 外れ値 / ↑↓ 外れ値の数 / O 外れ値 ON/OFF / R 新しいデータ
// ============================================

const NPTS = 40;                       // ★ ふつうの点の数
let base = [], outl = [[-3, 5]], nOut = 1, useOut = true, seedP = 31, dragI = -1;

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); selfTest(); rebuild(); }
function rebuild() { seedRng(seedP); base = gaussCloud(NPTS, [0, 0], covFromAxes(2, 0.6, 30)); }
function allPts() { return useOut ? base.concat(outl.slice(0, nOut)) : base.slice(); }
function geo() { let s = Math.min(width * 0.05, height * 0.06); return { s, cx: width * 0.32, cy: height * 0.52 }; }
function toScr(p) { let g = geo(); return [g.cx + p[0] * g.s, g.cy - p[1] * g.s]; }
function lineThrough(mu, v, col, dash) {
  let a = toScr([mu[0] - v[0] * 9, mu[1] - v[1] * 9]), b = toScr([mu[0] + v[0] * 9, mu[1] + v[1] * 9]);
  stroke(...col); strokeWeight(2.5); if (dash) drawingContext.setLineDash([8, 6]); line(a[0], a[1], b[0], b[1]); drawingContext.setLineDash([]);
}

function draw() {
  background(24, 30, 38);
  let P = allPts(), C = covMatrix(P), e = eig2sym(C[0][0], C[0][1], C[1][1]), mu = colMeans(P);
  let C0 = covMatrix(base), e0 = eig2sym(C0[0][0], C0[0][1], C0[1][1]), mu0 = colMeans(base), rb = robustPCA2(P, 20);
  let g = geo();
  stroke(45, 55, 68); strokeWeight(1); line(g.cx - 9 * g.s, g.cy, g.cx + 9 * g.s, g.cy); line(g.cx, g.cy - 7 * g.s, g.cx, g.cy + 7 * g.s);
  lineThrough(mu0, e0.v1, [150, 160, 175], true);
  lineThrough(mu, e.v1, [255, 125, 105], false);
  lineThrough(rb.mu, rb.eg.v1, [150, 220, 160], false);
  P.forEach((p, i) => { let q = toScr(p), isOut = i >= NPTS; noStroke(); fill(isOut ? color(255, 120, 200) : color(225, 232, 242)); circle(q[0], q[1], 4 + 10 * rb.w[i]); if (isOut) { noFill(); stroke(255, 120, 200); strokeWeight(1.5); circle(q[0], q[1], 22); } });
  let m = toScr(mu), mr = toScr(rb.mu); noStroke(); fill(255, 125, 105); circle(m[0], m[1], 10); fill(150, 220, 160); circle(mr[0], mr[1], 10);
  // ---- 数字
  let x = width * 0.64, y = 140, rot = angleBetween(e.v1, e0.v1), rotR = angleBetween(rb.eg.v1, e0.v1);
  noStroke(); textAlign(LEFT, BASELINE); fill(240); textSize(22); text('外れ値に弱い', 40, 44);
  fill(165, 175, 190); textSize(15); text('ドラッグ 外れ値（ピンク）　↑↓ 外れ値の数（' + nOut + '）　O 外れ値（' + (useOut ? 'ON' : 'OFF') + '）　R 新しいデータ', 40, 72);
  fill(150, 160, 175); textSize(16); text('破線：外れ値なしの PC1（本当の向き）', x, y);
  fill(255, 125, 105); text('コーラル：ふつうの PCA の PC1　ずれ ' + fmtN(rot, 2) + '°', x, y + 30);
  fill(150, 220, 160); text('緑：中央値 + 重みを下げる反復の PC1　ずれ ' + fmtN(rotR, 2) + '°', x, y + 60);
  fill(220); textSize(15);
  text('平均 = ' + fmtVec(mu, 2) + '　（外れ値なし ' + fmtVec(mu0, 2) + '）', x, y + 100);
  text('重みつきの中心 = ' + fmtVec(rb.mu, 2), x, y + 124);
  text('λ1 = ' + fmtN(e.l1, 2) + '（外れ値なし ' + fmtN(e0.l1, 2) + '）', x, y + 148);
  if (useOut) text('外れ値の重み w = ' + outl.slice(0, nOut).map((_, k) => fmtN(rb.w[NPTS + k], 3)).join(', '), x, y + 172);
  fill(165, 175, 190); textSize(14);
  text('外れ値が中心から距離 r だけ離れていると、共分散への影響は r² に比例する。中央値は半分近くの点が動かないかぎり大きく動かない。重みを下げるやり方は「M 推定」の一種で、10 の標準化（平均と標準偏差を使う）も外れ値に弱い', x, y + 210, width - x - 30);
  drawSelfTest(width - 190, height - 14);
}

function mousePressed() { dragI = -1; if (!useOut) return; for (let k = 0; k < nOut; k++) { let q = toScr(outl[k]); if (Math.hypot(mouseX - q[0], mouseY - q[1]) < 16) dragI = k; } }
function mouseDragged() { if (dragI < 0) return; let g = geo(); outl[dragI] = [clampv((mouseX - g.cx) / g.s, -9, 9), clampv(-(mouseY - g.cy) / g.s, -7, 7)]; }
function mouseReleased() { dragI = -1; }
function keyPressed() {
  if (key === UP_ARROW && nOut < 5) { nOut++; if (outl.length < nOut) outl.push([outl[0][0] + 0.4 * nOut, outl[0][1] - 0.3 * nOut]); }
  if (key === DOWN_ARROW) nOut = Math.max(1, nOut - 1);
  if (key === 'o' || key === 'O') useOut = !useOut;
  if (key === 'r' || key === 'R') { seedP++; rebuild(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(31); let X = gaussCloud(NPTS, [0, 0], covFromAxes(2, 0.6, 30)), Xo = X.concat([[-2, 14]]);
  let v0 = jacobiEigen(covMatrix(X)).vecs[0], v1 = jacobiEigen(covMatrix(Xo)).vecs[0], rb = robustPCA2(Xo, 30), rb0 = robustPCA2(X, 30);
  check('外れ値 1 個（中心から約 14）で、ふつうの PCA の PC1 が 20° 以上回る', angleBetween(v0, v1) > 20);
  check('中央値 + 重みを下げる反復なら、ずれは 3° 未満', angleBetween(v0, rb.eg.v1) < 3);
  check('外れ値がないときは、ふつうの PCA とほぼ同じ向き（3° 未満）', angleBetween(v0, rb0.eg.v1) < 3);
  check('外れ値の重みは 0.05 未満、ふつうの点の重みの中央値は 0.5 以上', rb.w[NPTS] < 0.05 && medianOf(rb.w.slice(0, NPTS)) > 0.5);
  let w1 = X.map(() => 1), Cw = weightedCov(X, w1, colMeans(X)), Cn = covMatrix(X);
  check('重みが全部 1 なら 重みつき共分散 = 共分散 × (n − 1)/n', maxAbsDiff(Cw, Cn.map((r) => r.map((v) => (v * (NPTS - 1)) / NPTS))) < 1e-12);
  let mx = colMeans(Xo)[1] - colMeans(X)[1], md = medianOf(Xo.map((p) => p[1])) - medianOf(X.map((p) => p[1]));
  check('外れ値で平均は大きく動く（> 0.3）が、中央値はほとんど動かない（< 0.15）', Math.abs(mx) > 0.3 && Math.abs(md) < 0.15);
  check('全部同じ点・2 点だけでも NaN にならない', noNaN(robustPCA2([[1, 1], [1, 1], [1, 1]], 5).eg.v1) && noNaN(robustPCA2([[0, 0], [1, 2]], 5).eg.v1));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 外れ値を楕円の長い軸の上に置くと、PC1 は回る？ 短い軸の上なら？
// 2. ↑ で外れ値を 5 個にすると、緑の線も負けてしまう？ どのくらいから？
// 3. 外れ値を中心に近づけていくと、重み w はどう変わる？
// 4. robustPCA2 の (d/2)² の 2 を 1 や 4 にすると？（小さいほど厳しく重みを下げる）
// 5. 本物のデータでは、外れ値は「入力のまちがい」か「大事な発見」か。消す前に見てみよう

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
// ---- 外れ値に強くする工夫：中央値で中心化 → 距離が大きい点ほど重みを下げてくり返す（重みつき共分散）
function medianOf(a) { let s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
function weightedCov(X, w, mu) {
  let d = mu.length, C = zerosMat(d, d), ws = 0;
  X.forEach((r, n) => { ws += w[n]; for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) C[i][j] += w[n] * (r[i] - mu[i]) * (r[j] - mu[j]); });
  return C.map((r) => r.map((v) => v / Math.max(ws, 1e-12)));
}
function robustPCA2(X, iters) {        // 2 次元用。マハラノビス距離 d で重み w = 1 / (1 + (d/2)²)
  let mu = [medianOf(X.map((r) => r[0])), medianOf(X.map((r) => r[1]))], w = X.map(() => 1), C = weightedCov(X, w, mu);
  for (let it = 0; it < (iters || 20); it++) {
    let e = eig2sym(C[0][0], C[0][1], C[1][1]), l1 = Math.max(e.l1, 1e-9), l2 = Math.max(e.l2, 1e-9);
    w = X.map((r) => { let a = (r[0] - mu[0]) * e.v1[0] + (r[1] - mu[1]) * e.v1[1], b = (r[0] - mu[0]) * e.v2[0] + (r[1] - mu[1]) * e.v2[1], dd = Math.sqrt((a * a) / l1 + (b * b) / l2); return 1 / (1 + (dd / 2) ** 2); });
    let ws = w.reduce((s, v) => s + v, 0); mu = [0, 1].map((j) => X.reduce((s, r, n) => s + w[n] * r[j], 0) / ws);
    C = weightedCov(X, w, mu);
  }
  return { mu, C, w, eg: eig2sym(C[0][0], C[0][1], C[1][1]) };
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
