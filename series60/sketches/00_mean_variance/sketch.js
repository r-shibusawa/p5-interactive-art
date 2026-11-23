// ============================================
// 00 平均・分散・共分散 ─ 点の集まりの「真ん中」と「ばらつき」を数で表す
// 平均（重心）μ、x と y の分散 = 平均からのずれの 2 乗の平均、共分散 = (x のずれ) × (y のずれ) の平均
//   長方形 = 各点の (x − μx)(y − μy)。右上・左下（青）は正、左上・右下（コーラル）は負 → 合計 / (n − 1) が共分散
//   相関係数 r = 共分散 / (σx σy) は −1〜1。n − 1 で割る（不偏分散）約束はこのシリーズ全部で同じ
// クリック 点を追加 / ドラッグ 点を動かす / X 近くの点を消す / R 新しい点群 / ← → 相関の強さ / C 全部消す
// ============================================

let pts = [], dragI = -1, corrTarget = 0.6, seedP = 1, showRects = true;   // ★ corrTarget = R で作る点群の相関
const VIEW = { x0: -5, x1: 5, y0: -4, y1: 4 };   // ★ 画面に映すデータの範囲

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); selfTest(); newCloud(); }
function newCloud() {
  seedRng(seedP); let r = corrTarget;
  pts = gaussCloud(30, [0.5, 0.2], [[2.2, r * Math.sqrt(2.2 * 1.3)], [r * Math.sqrt(2.2 * 1.3), 1.3]]).map((p) => [clampv(p[0], VIEW.x0, VIEW.x1), clampv(p[1], VIEW.y0, VIEW.y1)]);
}
// ★ 平均・分散・共分散・相関を計算（点が 2 個未満なら 0）
function stats(P) {
  if (P.length < 1) return { mu: [0, 0], vx: 0, vy: 0, cxy: 0, r: 0, n: 0 };
  let C = covMatrix(P), mu = colMeans(P), r = C[0][0] > 1e-12 && C[1][1] > 1e-12 ? C[0][1] / Math.sqrt(C[0][0] * C[1][1]) : 0;
  return { mu, vx: C[0][0], vy: C[1][1], cxy: C[0][1], r: clampv(r, -1, 1), n: P.length, C };
}
function plotBox() { let s = Math.min((width * 0.58) / (VIEW.x1 - VIEW.x0), (height - 170) / (VIEW.y1 - VIEW.y0)); return { s, ox: 40 + (s * (VIEW.x1 - VIEW.x0)) / 2, oy: 110 + (s * (VIEW.y1 - VIEW.y0)) / 2 }; }
function toScr(p) { let b = plotBox(); return [b.ox + p[0] * b.s, b.oy - p[1] * b.s]; }
function toData(x, y) { let b = plotBox(); return [clampv((x - b.ox) / b.s, VIEW.x0, VIEW.x1), clampv((b.oy - y) / b.s, VIEW.y0, VIEW.y1)]; }

function draw() {
  background(24, 30, 38);
  let st = stats(pts), b = plotBox(), m = toScr(st.mu);
  // ---- 座標と枠
  stroke(50, 60, 74); strokeWeight(1); noFill(); rect(b.ox + VIEW.x0 * b.s, b.oy - VIEW.y1 * b.s, (VIEW.x1 - VIEW.x0) * b.s, (VIEW.y1 - VIEW.y0) * b.s);
  for (let gx = VIEW.x0; gx <= VIEW.x1; gx++) line(b.ox + gx * b.s, b.oy - VIEW.y1 * b.s, b.ox + gx * b.s, b.oy - VIEW.y0 * b.s);
  for (let gy = VIEW.y0; gy <= VIEW.y1; gy++) line(b.ox + VIEW.x0 * b.s, b.oy - gy * b.s, b.ox + VIEW.x1 * b.s, b.oy - gy * b.s);
  // ---- 偏差の長方形（正 = 青、負 = コーラル）
  let pos = 0, neg = 0;
  for (let p of pts) {
    let a = (p[0] - st.mu[0]) * (p[1] - st.mu[1]), q = toScr(p);
    if (a >= 0) pos += a; else neg += a;
    if (!showRects) continue;
    noStroke(); fill(a >= 0 ? color(90, 165, 240, 40) : color(255, 125, 105, 40)); rect(Math.min(m[0], q[0]), Math.min(m[1], q[1]), Math.abs(q[0] - m[0]), Math.abs(q[1] - m[1]));
  }
  // ---- 平均の十字と点
  stroke(255, 225, 140); strokeWeight(1.5); line(m[0], b.oy - VIEW.y1 * b.s, m[0], b.oy - VIEW.y0 * b.s); line(b.ox + VIEW.x0 * b.s, m[1], b.ox + VIEW.x1 * b.s, m[1]);
  pts.forEach((p, i) => { let q = toScr(p); noStroke(); fill(i === dragI ? color(255, 225, 140) : color(235, 240, 248)); circle(q[0], q[1], 11); });
  fill(255, 225, 140); circle(m[0], m[1], 16); fill(24, 30, 38); circle(m[0], m[1], 6);
  // ---- 数字
  let px = b.ox + VIEW.x1 * b.s + 40, y = 130;
  textAlign(LEFT, BASELINE); noStroke(); fill(240); textSize(22); text('平均・分散・共分散', 40, 44);
  fill(165, 175, 190); textSize(15); text('クリック 追加　ドラッグ 移動　X 近くの点を消す　R 新しい点群　← → 相関（いま ' + fmtN(corrTarget, 1) + '）　C 全部消す　V 長方形の表示', 40, 72);
  let rows = [
    ['点の数 n', String(st.n)],
    ['平均 μ = (μx, μy)', fmtVec(st.mu, 3)],
    ['x の分散 σx² = Σ(x − μx)² / (n − 1)', fmtN(st.vx, 3)],
    ['y の分散 σy²', fmtN(st.vy, 3)],
    ['共分散 σxy = Σ(x − μx)(y − μy) / (n − 1)', fmtN(st.cxy, 3)],
    ['相関係数 r = σxy / (σx σy)', fmtN(st.r, 3)],
  ];
  for (let [k, v] of rows) { fill(170, 180, 195); textSize(15); text(k, px, y); fill(240); textSize(22); text(v, px, y + 26); y += 62; }
  fill(90, 165, 240); textSize(16); text('青の面積の合計（正）  ' + fmtN(pos, 2), px, y + 4);
  fill(255, 125, 105); text('コーラルの面積の合計（負）  ' + fmtN(neg, 2), px, y + 28);
  fill(240); text('（正 + 負）/ (n − 1) = ' + fmtN(st.n > 1 ? (pos + neg) / (st.n - 1) : 0, 3) + '  = 共分散', px, y + 52);
  fill(165, 175, 190); textSize(14);
  text('共分散行列 C = [[σx², σxy], [σxy, σy²]] は対称で、どの向き u でも uᵀ C u = 「u の向きのばらつき」≥ 0。この向きを回して探すのが次の 01', px, y + 90, width - px - 30);
  drawSelfTest(width - 190, height - 14);
}

function nearest(x, y) { let best = -1, bd = 14; pts.forEach((p, i) => { let q = toScr(p), dd = Math.hypot(q[0] - x, q[1] - y); if (dd < bd) { bd = dd; best = i; } }); return best; }
function inPlot(x, y) { let b = plotBox(); return x > b.ox + VIEW.x0 * b.s && x < b.ox + VIEW.x1 * b.s && y > b.oy - VIEW.y1 * b.s && y < b.oy - VIEW.y0 * b.s; }
function mousePressed() { dragI = nearest(mouseX, mouseY); if (dragI < 0 && inPlot(mouseX, mouseY) && pts.length < 200) { pts.push(toData(mouseX, mouseY)); dragI = pts.length - 1; } }
function mouseDragged() { if (dragI >= 0 && pts[dragI]) pts[dragI] = toData(mouseX, mouseY); }
function mouseReleased() { dragI = -1; }
function keyPressed() {
  if (key === 'x' || key === 'X') { let i = nearest(mouseX, mouseY); if (i >= 0) pts.splice(i, 1); }
  if (key === 'r' || key === 'R') { seedP++; newCloud(); }
  if (key === 'c' || key === 'C') pts = [];
  if (key === 'v' || key === 'V') showRects = !showRects;
  if (key === LEFT_ARROW || key === RIGHT_ARROW) { corrTarget = clampv(Math.round((corrTarget + (key === RIGHT_ARROW ? 0.1 : -0.1)) * 10) / 10, -0.9, 0.9); newCloud(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(100);
  let okSym = true, okPsd = true, okAlt = true, okR = true, okShift = true;
  for (let t = 0; t < 30; t++) {
    let P = Array.from({ length: 5 + t }, () => [gaussRnd() * 3, gaussRnd() + 0.4 * t]), C = covMatrix(P), st = stats(P), n = P.length;
    if (C[0][1] !== C[1][0]) okSym = false;
    let e = eig2sym(C[0][0], C[0][1], C[1][1]); if (e.l2 < -1e-12 * (C[0][0] + C[1][1])) okPsd = false;
    let sxy = P.reduce((s, p) => s + p[0] * p[1], 0) / n;                     // 別の式：(Σxy/n − μx μy)·n/(n − 1)
    if (!near(C[0][1], ((sxy - st.mu[0] * st.mu[1]) * n) / (n - 1), 1e-9 * (1 + Math.abs(sxy)))) okAlt = false;
    if (!(st.r >= -1 && st.r <= 1)) okR = false;
    let C2 = covMatrix(P.map((p) => [p[0] + 7, 2 * p[1] - 3]));              // ずらしても同じ、2 倍すると 2 倍・4 倍
    if (!(near(C2[0][0], C[0][0], 1e-9) && near(C2[0][1], 2 * C[0][1], 1e-9) && near(C2[1][1], 4 * C[1][1], 1e-8))) okShift = false;
  }
  check('共分散行列は対称（30 個の点群）', okSym);
  check('共分散行列は半正定値（2×2 の小さいほうの固有値 ≥ 0）', okPsd);
  check('σxy = (Σxy/n − μx μy)·n/(n − 1) と一致', okAlt);
  check('相関係数は −1〜1', okR);
  check('平行移動で変わらない、y を 2 倍すると σxy は 2 倍・σy² は 4 倍', okShift);
  let L = [[0, 1], [1, 3], [2, 5], [3, 7]], Ln = L.map((p) => [p[0], -p[1]]);
  check('一直線の点は r = 1（傾きが負なら −1）', near(stats(L).r, 1, 1e-12) && near(stats(Ln).r, -1, 1e-12));
  seedRng(7); let big = gaussCloud(20000, [1, -2], [[2, 0.9], [0.9, 1]]), Cb = covMatrix(big);
  check('コレスキーで作った 20000 点の共分散 ≈ 指定した [[2, 0.9], [0.9, 1]]（±0.06）', maxAbsDiff(Cb, [[2, 0.9], [0.9, 1]]) < 0.06);
  let one = stats([[1, 2]]), none = stats([]);
  check('点が 0〜1 個でも NaN にならない', noNaN([one.vx, one.cxy, one.r, none.vx, none.r]) && one.vx === 0);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 右上に点を 1 つ足すと共分散はどう変わる？ 平均の真上に足したら？（長方形の面積 0）
// 2. ← → で相関を −0.9〜0.9 に変え、青とコーラルの面積の比べ方を見よう
// 3. 点を 1 列に並べると r = ±1 になる？ 縦一列だと？（σx = 0 のときは r を 0 と表示）
// 4. 全部の点を右へ 2 ずらしても、分散・共分散は変わらない。なぜ？
// 5. 「x の向き」「y の向き」以外の向きのばらつきは？ → 01 で直線を回して調べる

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
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) ? v.every(noNaN) : !(typeof v === 'number' && !isFinite(v)); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length && n > 0 ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function selfTestOk() { return selfTestResults.length > 0 && selfTestResults.every((r) => r.ok); }
function drawSelfTest(x, y) { noStroke(); fill(selfTestOk() ? color(120, 210, 170) : color(255, 90, 90)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
