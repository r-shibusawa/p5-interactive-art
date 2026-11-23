// ============================================
// 02 共分散行列と固有ベクトル ─ C v = λ v。掛けても向きが変わらないベクトルが「データの軸」
// 2×2 の共分散行列 C = [[a, b], [b, c]] の固有値は λ = (a + c)/2 ± √(((a − c)/2)² + b²)（解の公式）
//   固有ベクトル v1・v2 は直角。楕円の半径 = k √λ（k = 1, 2 で 1σ・2σ の楕円）
//   M：円の上のベクトル v に C を掛けるアニメーション。ほとんどの矢印は向きが変わるが、v1・v2 の向きだけはのびるだけ
// 黄色い ● をドラッグ 長い軸 / ↑↓ 短い軸 / M 掛けるアニメーション / R 新しい点 / スペース 点の表示
// ============================================

let s1 = 2.2, s2 = 0.8, angDeg = 30, covC = null, pts = [], seedP = 5, anim = 0, animOn = true, showPts = true, dragging = false;   // ★ s1, s2 = 軸の標準偏差
const NPTS = 400;                      // ★ 点の数

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); selfTest(); rebuild(); }
function rebuild() { covC = covFromAxes(s1, s2, angDeg); seedRng(seedP); pts = gaussCloud(NPTS, [0, 0], covC); }
function scl() { return Math.min(width * 0.06, height * 0.085); }
function ctr() { return [width * 0.3, height * 0.54]; }
function toScr(p) { let s = scl(), c = ctr(); return [c[0] + p[0] * s, c[1] - p[1] * s]; }

function draw() {
  background(24, 30, 38);
  let e = eig2sym(covC[0][0], covC[0][1], covC[1][1]), s = scl(), C0 = covMatrix(pts);
  if (animOn) anim = (anim + 0.006) % 1.6;
  let t = clampv(anim, 0, 1), tt = t * t * (3 - 2 * t);
  // ---- 点・楕円・軸
  if (showPts) { noStroke(); fill(225, 232, 242, 120); for (let p of pts) { let q = toScr(p); circle(q[0], q[1], 4); } }
  for (let k of [1, 2]) { stroke(90, 165, 240, k === 1 ? 255 : 150); strokeWeight(2); polyline(covEllipsePts([0, 0], covC, k).map(toScr)); }
  let inside = [1, 2].map((k) => pts.filter((p) => { let a = dotv(p, e.v1), b = dotv(p, e.v2); return (a * a) / e.l1 + (b * b) / Math.max(e.l2, 1e-12) <= k * k; }).length / pts.length);
  stroke(255, 225, 140); fill(255, 225, 140); strokeWeight(3);
  let h = toScr([e.v1[0] * 2 * Math.sqrt(e.l1), e.v1[1] * 2 * Math.sqrt(e.l1)]), o = toScr([0, 0]);
  arrow2(o[0], o[1], h[0], h[1], 14); stroke(255, 125, 105); fill(255, 125, 105);
  let h2 = toScr([e.v2[0] * 2 * Math.sqrt(e.l2), e.v2[1] * 2 * Math.sqrt(e.l2)]); arrow2(o[0], o[1], h2[0], h2[1], 12);
  noStroke(); fill(255, 225, 140); circle(h[0], h[1], 18);
  // ---- 掛けるアニメーション：v → (1 − t) v + t C v（右の図）
  let R = Math.min(width * 0.19, height * 0.24), cx = width * 0.76, cy = height * 0.4, sc = R / Math.max(e.l1, 1e-9);
  stroke(60, 72, 88); strokeWeight(1); noFill(); circle(cx, cy, 2 * R / Math.max(e.l1, 1e-9));
  polyline(covEllipsePts([0, 0], matMul(covC, covC), 1).map((p) => [cx + p[0] * sc, cy - p[1] * sc]));
  for (let i = 0; i < 24; i++) {
    let a = (i * Math.PI) / 12, v = [Math.cos(a), Math.sin(a)], Cv = matVec(covC, v), w = [(1 - tt) * v[0] + tt * Cv[0], (1 - tt) * v[1] + tt * Cv[1]];
    let onAxis = Math.abs(v[0] * Cv[1] - v[1] * Cv[0]) < 1e-9 * e.l1;
    stroke(160, 175, 195, 110); strokeWeight(1); line(cx, cy, cx + v[0] * sc, cy - v[1] * sc);
    stroke(220, 228, 240); fill(220, 228, 240); strokeWeight(1.5); arrow2(cx, cy, cx + w[0] * sc, cy - w[1] * sc, 7);
  }
  for (let [v, l, col] of [[e.v1, e.l1, [255, 225, 140]], [e.v2, e.l2, [255, 125, 105]], [[-e.v1[0], -e.v1[1]], e.l1, [255, 225, 140]], [[-e.v2[0], -e.v2[1]], e.l2, [255, 125, 105]]]) {
    let f = (1 - tt) + tt * l; stroke(...col); fill(...col); strokeWeight(3); arrow2(cx, cy, cx + v[0] * f * sc, cy - v[1] * f * sc, 10);
  }
  // ---- 文字
  textAlign(LEFT, BASELINE); noStroke(); fill(240); textSize(22); text('共分散行列と固有ベクトル　C v = λ v', 40, 44);
  fill(165, 175, 190); textSize(15); text('● ドラッグ 長い軸　↑↓ 短い軸　M アニメーション（' + (animOn ? 'ON' : 'OFF') + '）　R 新しい点　スペース 点の表示', 40, 72);
  let x = width * 0.58, y = cy + R + 60;
  fill(220); textSize(17);
  text('C = [[' + fmtN(covC[0][0], 3) + ', ' + fmtN(covC[0][1], 3) + '], [' + fmtN(covC[1][0], 3) + ', ' + fmtN(covC[1][1], 3) + ']]', x, y);
  fill(255, 225, 140); text('λ1 = ' + fmtN(e.l1, 3) + '　v1 = ' + fmtVec(e.v1, 3) + '　C v1 = ' + fmtVec(matVec(covC, e.v1), 3), x, y + 28);
  fill(255, 125, 105); text('λ2 = ' + fmtN(e.l2, 3) + '　v2 = ' + fmtVec(e.v2, 3) + '　C v2 = ' + fmtVec(matVec(covC, e.v2), 3), x, y + 54);
  fill(220); text('λ1 + λ2 = ' + fmtN(e.l1 + e.l2, 3) + ' = a + c　　λ1 λ2 = ' + fmtN(e.l1 * e.l2, 3) + ' = ac − b²', x, y + 82);
  fill(90, 165, 240); text('点の共分散（' + NPTS + ' 点から計算）[[' + fmtN(C0[0][0], 2) + ', ' + fmtN(C0[0][1], 2) + '], [' + fmtN(C0[1][0], 2) + ', ' + fmtN(C0[1][1], 2) + ']]', x, y + 110);
  text('楕円の内側：1σ ' + fmtN(100 * inside[0], 1) + '%（理論 39.3%）　2σ ' + fmtN(100 * inside[1], 1) + '%（理論 86.5%）', x, y + 136);
  fill(165, 175, 190); textSize(14); text('右：円の上の矢印 v に C を掛けると（白）たいてい向きが変わる。黄色・コーラルの固有ベクトルだけは λ 倍にのびる', x, cy - R - 30, width - x - 30);
  drawSelfTest(width - 190, height - 14);
}

function mousePressed() { let e = eig2sym(covC[0][0], covC[0][1], covC[1][1]), h = toScr([e.v1[0] * 2 * s1, e.v1[1] * 2 * s1]); dragging = Math.hypot(mouseX - h[0], mouseY - h[1]) < 20; }
function mouseDragged() {
  if (!dragging) return;
  let c = ctr(), s = scl(), dx = (mouseX - c[0]) / s, dy = -(mouseY - c[1]) / s;
  s1 = clampv(Math.hypot(dx, dy) / 2, Math.max(s2, 0.2), 4); angDeg = (Math.atan2(dy, dx) * 180) / Math.PI; rebuild();
}
function mouseReleased() { dragging = false; }
function keyPressed() {
  if (key === UP_ARROW || key === DOWN_ARROW) { s2 = clampv(s2 + (key === UP_ARROW ? 0.1 : -0.1), 0.1, s1); rebuild(); }
  if (key === 'm' || key === 'M') animOn = !animOn;
  if (key === 'r' || key === 'R') { seedP++; rebuild(); }
  if (key === ' ') showPts = !showPts;
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(102);
  let mats = [[[2, 0], [0, 1]], [[1, 0], [0, 3]], [[2, 0], [0, 2]], [[1, 1], [1, 1]], [[1e-6, 0], [0, 0]]];
  for (let t = 0; t < 40; t++) { let a = rndRange(0.1, 5), c = rndRange(0.1, 5), b = rndRange(-1, 1) * Math.sqrt(a * c); mats.push([[a, b], [b, c]]); }
  let okEig = true, okOrth = true, okTr = true, okJac = true;
  for (let C of mats) {
    let e = eig2sym(C[0][0], C[0][1], C[1][1]), sc = Math.max(1, Math.abs(e.l1));
    for (let [v, l] of [[e.v1, e.l1], [e.v2, e.l2]]) { let Cv = matVec(C, v); if (Math.abs(Cv[0] - l * v[0]) > 1e-12 * sc || Math.abs(Cv[1] - l * v[1]) > 1e-12 * sc || !near(vlen(v), 1, 1e-12)) okEig = false; }
    if (Math.abs(dotv(e.v1, e.v2)) > 1e-12 || e.l1 < e.l2) okOrth = false;
    if (!near(e.l1 + e.l2, C[0][0] + C[1][1], 1e-12 * sc) || !near(e.l1 * e.l2, C[0][0] * C[1][1] - C[0][1] ** 2, 1e-11 * sc * sc)) okTr = false;
    let j = jacobiEigen(C); if (!near(j.vals[0], e.l1, 1e-12 * sc) || !near(j.vals[1], e.l2, 1e-12 * sc)) okJac = false;
  }
  check('解の公式の固有対は C v = λ v（対角・重解・ランク 1 を含む 45 個、1e-12）', okEig);
  check('v1 ⊥ v2、λ1 ≥ λ2', okOrth);
  check('λ1 + λ2 = トレース、λ1 λ2 = 行列式', okTr);
  check('ヤコビ法の固有値と一致', okJac);
  let okAx = true;
  for (let t = 0; t < 20; t++) { let a1 = rndRange(0.5, 3), a2 = rndRange(0.1, 0.45), d = rndRange(-89, 89), Cx = covFromAxes(a1, a2, d), e = eig2sym(Cx[0][0], Cx[0][1], Cx[1][1]);
    let dd = Math.abs(e.angle - d) % 180; if (!near(e.l1, a1 * a1, 1e-12) || !near(e.l2, a2 * a2, 1e-12) || Math.min(dd, 180 - dd) > 1e-9) okAx = false; }
  check('軸 (s1, s2, 角度) から作った C の固有値 = s1², s2²、PC1 の角度 = 指定の角度', okAx);
  seedRng(9); let C = covFromAxes(2, 0.7, 40), e = eig2sym(C[0][0], C[0][1], C[1][1]), P = gaussCloud(20000, [0, 0], C);
  let frac = [1, 2].map((k) => P.filter((p) => { let a = dotv(p, e.v1), b = dotv(p, e.v2); return (a * a) / e.l1 + (b * b) / e.l2 <= k * k; }).length / P.length);
  check('20000 点のうち 1σ・2σ の楕円の内側 = 1 − e^(−k²/2)（39.3%・86.5%、±1%）', near(frac[0], 1 - Math.exp(-0.5), 0.01) && near(frac[1], 1 - Math.exp(-2), 0.01));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. ↓ で短い軸を細くしていくと λ2 → 0。そのとき点群は何次元に見える？
// 2. s1 = s2（丸い点群）にすると、どの向きも固有ベクトルになる。右のアニメーションで確かめよう
// 3. 楕円の内側の割合は 1D の「±1σ に 68%」と同じ？ ちがうのはなぜ？（2 次元のカイ 2 乗分布）
// 4. 右の灰色の楕円 = 円を C で写した形（半径 λ1, λ2）。左の 1σ の楕円（半径 √λ）とくらべよう
// 5. 3 次元ではヤコビ法で同じことをする → 03

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
