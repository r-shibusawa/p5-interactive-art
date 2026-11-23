// ============================================
// 01 射影した分散が最大の向き ─ 直線を回して、点の「影」がいちばんばらつく向きを探す
// 向き u（長さ 1）への射影 = (x − μ)·u。その分散は uᵀ C u（C = 共分散行列）→ 角度の関数としてグラフに
//   最大の向き = 第 1 主成分（PC1）、最小の向き = 第 2 主成分（PC2）。2 つはいつも直角
//   PCA の直線は「直線までの垂直な距離²の和」が最小。最小 2 乗の回帰直線は「縦の距離²の和」が最小（シリーズ 17 の 15）
// ドラッグ 直線の向き / ← → 1° ずつ / P いちばんの向きへ / L 回帰直線と比べる / ↑↓ 細さ / R 新しい点群
// ============================================

let pts = [], theta = 0, seedP = 3, thin = 0.45, showLS = true, covC = null, muP = null, curve360 = [];   // ★ thin = 短い軸 / 長い軸
const NPTS = 60;                       // ★ 点の数

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); selfTest(); newCloud(); }
function newCloud() {
  seedRng(seedP);
  pts = gaussCloud(NPTS, [0, 0], covFromAxes(2, 2 * thin, 25 + 40 * rnd()));
  covC = covMatrix(pts); muP = colMeans(pts);
  curve360 = Array.from({ length: 361 }, (_, i) => projVar(covC, (i * Math.PI) / 360));   // 0〜180° を 0.5° きざみ
}
// ★ 向き t（ラジアン）への射影の分散 = uᵀ C u
function projVar(C, t) { let u = [Math.cos(t), Math.sin(t)]; return dotv(u, matVec(C, u)); }
// 最小 2 乗（y を x で予測）：傾き b = σxy / σx²
function lsLine(C, mu) { let b = C[0][0] > 1e-12 ? C[0][1] / C[0][0] : 0; return { b, a: mu[1] - b * mu[0] }; }
// 直線（点 mu を通り向き u）までの距離²の和：垂直（perp）と縦（vert）
function residSS(P, mu, t) {
  let u = [Math.cos(t), Math.sin(t)], perp = 0, vert = 0;
  for (let p of P) {
    let dx = p[0] - mu[0], dy = p[1] - mu[1], c = dx * u[0] + dy * u[1];
    perp += dx * dx + dy * dy - c * c;
    vert += Math.abs(u[0]) > 1e-9 ? (dy - (u[1] / u[0]) * dx) ** 2 : Infinity;
  }
  return { perp, vert };
}

function draw() {
  background(24, 30, 38);
  let e = eig2sym(covC[0][0], covC[0][1], covC[1][1]), s = Math.min(width * 0.055, height * 0.085), cx = width * 0.27, cy = height * 0.53;
  let P = (p) => [cx + p[0] * s, cy - p[1] * s], u = [Math.cos(theta), Math.sin(theta)], m = P(muP);
  // ---- 点群・直線・射影
  stroke(45, 55, 68); strokeWeight(1); line(cx - 5 * s, cy, cx + 5 * s, cy); line(cx, cy - 5 * s, cx, cy + 5 * s);
  stroke(255, 225, 140); strokeWeight(2.5); line(m[0] - u[0] * 4.6 * s, m[1] + u[1] * 4.6 * s, m[0] + u[0] * 4.6 * s, m[1] - u[1] * 4.6 * s);
  for (let p of pts) {
    let c = (p[0] - muP[0]) * u[0] + (p[1] - muP[1]) * u[1], f = P([muP[0] + c * u[0], muP[1] + c * u[1]]), q = P(p);
    stroke(255, 225, 140, 90); strokeWeight(1); line(q[0], q[1], f[0], f[1]);
    noStroke(); fill(255, 225, 140); circle(f[0], f[1], 5); fill(225, 232, 242); circle(q[0], q[1], 8);
  }
  let ls = lsLine(covC, muP);
  if (showLS) {
    stroke(255, 125, 105); strokeWeight(2); drawingContext.setLineDash([7, 6]);
    let a = P([-5, ls.a - 5 * ls.b]), b2 = P([5, ls.a + 5 * ls.b]); line(a[0], a[1], b2[0], b2[1]); drawingContext.setLineDash([]);
  }
  stroke(90, 165, 240); strokeWeight(2); line(m[0], m[1], m[0] + e.v1[0] * 2 * Math.sqrt(e.l1) * s, m[1] - e.v1[1] * 2 * Math.sqrt(e.l1) * s);
  line(m[0], m[1], m[0] + e.v2[0] * 2 * Math.sqrt(Math.max(0, e.l2)) * s, m[1] - e.v2[1] * 2 * Math.sqrt(Math.max(0, e.l2)) * s);
  // ---- 角度と分散のグラフ
  let deg = (((theta * 180) / Math.PI) % 180 + 180) % 180, vmax = Math.max(...curve360) * 1.1;
  let g = { x: width * 0.56, y: 130, w: width * 0.4, h: height * 0.36, x0: 0, x1: 180, y0: 0, y1: vmax };
  plotAxes(g, '直線の角度 θ（度）', '射影の分散 uᵀ C u', [0, 45, 90, 135, 180], [0, +(vmax / 2).toFixed(2), +vmax.toFixed(2)]);
  stroke(90, 165, 240); strokeWeight(2.5); polyline(curve360.map((v, i) => [gX(g, i / 2), gY(g, v)]));
  let d1 = ((e.angle % 180) + 180) % 180, d2 = (d1 + 90) % 180;
  stroke(90, 165, 240, 120); strokeWeight(1); line(gX(g, d1), g.y, gX(g, d1), g.y + g.h); line(gX(g, d2), g.y, gX(g, d2), g.y + g.h);
  noStroke(); fill(255, 225, 140); circle(gX(g, deg), gY(g, projVar(covC, theta)), 12);
  fill(90, 165, 240); textSize(13); textAlign(CENTER, BOTTOM); text('PC1 ' + fmtN(d1, 1) + '°', gX(g, d1), g.y - 2); text('PC2 ' + fmtN(d2, 1) + '°', gX(g, d2), g.y + 14);
  // ---- 数字
  let rs = residSS(pts, muP, theta), rp = residSS(pts, muP, (d1 * Math.PI) / 180), rl = residSS(pts, [0, ls.a], Math.atan(ls.b));
  textAlign(LEFT, BASELINE); fill(240); textSize(22); text('射影した分散が最大の向き', 40, 44);
  fill(165, 175, 190); textSize(15); text('ドラッグ 直線の向き　← → 1°　P PC1 へ　L 回帰直線（いま ' + (showLS ? 'ON' : 'OFF') + '）　↑↓ 細さ（' + fmtN(thin, 2) + '）　R 新しい点群', 40, 72);
  let y = g.y + g.h + 66, x = g.x;
  fill(255, 225, 140); textSize(18); text('いまの直線 θ = ' + fmtN(deg, 1) + '°　射影の分散 = ' + fmtN(projVar(covC, theta), 3), x, y);
  fill(90, 165, 240); text('最大 λ1 = ' + fmtN(e.l1, 3) + '（PC1）　最小 λ2 = ' + fmtN(e.l2, 3) + '（PC2）', x, y + 28); fill(165, 175, 190); textSize(15); text('λ1 + λ2 = ' + fmtN(e.l1 + e.l2, 3) + ' = σx² + σy²（どの直角な 2 つの向きでも和は同じ）', x, y + 50);
  fill(220); textSize(15);
  text('距離²の和　　　　　垂直（⊥）　　縦（|）', x, y + 80);
  text('いまの直線　　　　' + fmtN(rs.perp, 2) + '　　　' + fmtN(rs.vert, 2), x, y + 104);
  fill(90, 165, 240); text('PCA の直線（PC1）' + fmtN(rp.perp, 2) + '　　　' + fmtN(rp.vert, 2) + '　← 垂直が最小', x, y + 128);
  fill(255, 125, 105); text('回帰直線（破線）　' + fmtN(rl.perp, 2) + '　　　' + fmtN(rl.vert, 2) + '　← 縦が最小', x, y + 152);
  fill(165, 175, 190); textSize(14);
  text('回帰は「x から y を予測」なので縦のずれだけを見る（シリーズ 17 の 15）。PCA は x と y を対等に見て、垂直なずれを最小にする。傾き：回帰 ' + fmtN(ls.b, 3) + '、PCA ' + fmtN(Math.abs(e.v1[0]) > 1e-9 ? e.v1[1] / e.v1[0] : Infinity, 3), x, y + 184, g.w);
  drawSelfTest(width - 190, height - 14);
}

function setFromMouse() { let s = Math.min(width * 0.055, height * 0.085), dx = mouseX - (width * 0.27 + muP[0] * s), dy = -(mouseY - (height * 0.53 - muP[1] * s)); if (Math.hypot(dx, dy) > 5) theta = Math.atan2(dy, dx); }
function mouseDragged() { if (mouseX < width * 0.52) setFromMouse(); }
function mousePressed() { if (mouseX < width * 0.52) setFromMouse(); }
function keyPressed() {
  if (key === LEFT_ARROW || key === RIGHT_ARROW) theta += ((key === RIGHT_ARROW ? 1 : -1) * Math.PI) / 180;
  if (key === 'p' || key === 'P') theta = (eig2sym(covC[0][0], covC[0][1], covC[1][1]).angle * Math.PI) / 180;
  if (key === 'l' || key === 'L') showLS = !showLS;
  if (key === UP_ARROW || key === DOWN_ARROW) { thin = clampv(thin + (key === UP_ARROW ? 0.05 : -0.05), 0.05, 1); newCloud(); }
  if (key === 'r' || key === 'R') { seedP++; newCloud(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(101);
  let okMax = true, okVal = true, okDirect = true, okTr = true, okPerp = true, okLS = true, okSlope = true;
  for (let t = 0; t < 20; t++) {
    let P = gaussCloud(40, [rndRange(-1, 1), rndRange(-1, 1)], covFromAxes(rndRange(1, 2.5), rndRange(0.2, 0.9), rndRange(0, 180))), C = covMatrix(P), mu = colMeans(P), e = eig2sym(C[0][0], C[0][1], C[1][1]);
    let bi = 0, bv = -1, mi = 0, mv = Infinity;
    for (let i = 0; i < 3600; i++) { let v = projVar(C, (i * Math.PI) / 3600); if (v > bv) { bv = v; bi = i; } if (v < mv) { mv = v; mi = i; } }
    let dAng = (a, b) => { let d = Math.abs(a - b) % 180; return Math.min(d, 180 - d); };
    if (dAng(bi / 20, e.angle) > 0.1 || dAng(mi / 20, e.angle + 90) > 0.1) okMax = false;
    if (!near(bv, e.l1, 1e-6 * e.l1) || !near(mv, e.l2, 1e-6 * e.l1)) okVal = false;
    let th = rndRange(0, Math.PI), pr = P.map((p) => (p[0] - mu[0]) * Math.cos(th) + (p[1] - mu[1]) * Math.sin(th));
    if (!near(pr.reduce((s, v) => s + v * v, 0) / (P.length - 1), projVar(C, th), 1e-9)) okDirect = false;
    if (!near(projVar(C, th) + projVar(C, th + Math.PI / 2), C[0][0] + C[1][1], 1e-9)) okTr = false;
    let pc = residSS(P, mu, (e.angle * Math.PI) / 180);
    if (!near(pc.perp, (P.length - 1) * e.l2, 1e-8)) okPerp = false;
    for (let i = 0; i < 180; i++) if (residSS(P, mu, (i * Math.PI) / 180).perp < pc.perp - 1e-9) okPerp = false;
    let l = lsLine(C, mu), vLS = residSS(P, [0, l.a], Math.atan(l.b)).vert;
    for (let db = -0.5; db <= 0.5; db += 0.05) if (residSS(P, [0, l.a + 0.01], Math.atan(l.b + db)).vert < vLS - 1e-9) okLS = false;
    if (C[0][1] > 0 && !(l.b <= e.v1[1] / e.v1[0] + 1e-12)) okSlope = false;
  }
  check('3600 本の向きの総当たりで最大の角度 = 第 1 固有ベクトルの角度（0.1° 以内）、最小 = その +90°', okMax);
  check('射影の分散の最大 = λ1、最小 = λ2', okVal);
  check('uᵀ C u = 射影した値を実際に 2 乗して (n − 1) で割ったもの', okDirect);
  check('直角な 2 つの向きの分散の和 = トレース σx² + σy²', okTr);
  check('PCA の直線の垂直な距離²の和 = (n − 1) λ2 で、180 本のどの向きより小さい', okPerp);
  check('回帰直線は縦の距離²の和が最小（傾きと切片をずらすと増える）', okLS);
  check('正の相関では 回帰の傾き ≤ PCA の傾き（回帰は傾きを小さく見る）', okSlope);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 直線を回しながら、黄色い点（影）の広がりとグラフの山を見比べよう。山と谷はなぜ 90° 離れている？
// 2. ↑ で丸い点群（細さ 1）にすると、グラフはどうなる？ PC1 の向きは決まる？
// 3. 回帰直線（破線）と PCA の直線は、細い点群ほど近づく？ 丸いほど離れる？
// 4. x と y を入れかえて回帰すると別の直線になるが、PCA は入れかえても同じ直線。なぜ？
// 5. グラフの曲線は a + b·cos(2θ − φ) の形。02 の固有値 λ1, λ2 で a と b を書いてみよう

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
