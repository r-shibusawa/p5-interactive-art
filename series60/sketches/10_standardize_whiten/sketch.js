// ============================================
// 10 標準化と白色化 ─ 単位がちがう 2 つの量を、そのまま PCA してよい？
// 合成データ：身長（cm）と体重（kg）。U で身長を mm にすると、数が 10 倍 → 分散は 100 倍 → 共分散の PCA は身長だけを向く
//   標準化（各列を 平均 0・標準偏差 1）してから PCA = 相関行列の PCA。単位を変えても結果は同じ
//   2 変数の相関行列の固有値は 1 ± r、固有ベクトルはいつも (1, 1)/√2 と (1, −1)/√2
//   白色化：z = Λ^(−1/2) Vᵀ (x − μ)。共分散が単位行列 I になり、楕円が円になる（どの向きのばらつきも 1）
// U 身長の単位 cm ⇔ mm / ↑↓ 身長と体重の関係の強さ / R 新しいデータ
// ============================================

const NPTS = 250;                      // ★ 人数
let useMM = false, slope = 0.8, seedD = 1, raw = [], dataX = [];   // ★ slope = 身長 1 cm あたり体重が何 kg 増えるか

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); selfTest(); rebuild(); }
// ★ 合成データ：身長 h ~ 平均 168、標準偏差 8（cm）、体重 w = 62 + slope (h − 168) + ばらつき 7（kg）
function makePeople(n, sl) { return Array.from({ length: n }, () => { let h = 168 + 8 * gaussRnd(); return [h, 62 + sl * (h - 168) + 7 * gaussRnd()]; }); }
function rebuild() { seedRng(seedD); raw = makePeople(NPTS, slope); dataX = raw.map((p) => [useMM ? p[0] * 10 : p[0], p[1]]); }

// 点群と主軸を、縦横同じ縮尺で描く（中心 c、1 単位 = s ピクセル）
function cloud(P, cx, cy, s, col) { noStroke(); fill(...col, 150); for (let p of P) circle(cx + p[0] * s, cy - p[1] * s, 4); }
function axes(e, C, cx, cy, s) {
  e.vecs.forEach((v, k) => { let L = 2 * Math.sqrt(Math.max(0, e.vals[k])) * s; stroke(k ? color(255, 125, 105) : color(255, 225, 140)); fill(k ? color(255, 125, 105) : color(255, 225, 140)); strokeWeight(2.5); arrow2(cx, cy, cx + v[0] * L, cy - v[1] * L, 10); });
  stroke(90, 165, 240); strokeWeight(1.5); polyline(covEllipsePts([0, 0], C, 2).map((p) => [cx + p[0] * s, cy - p[1] * s]));
}
function panelBox(i) { let w = (width - 160) / 3; return { x: 40 + i * (w + 40), y: 130, w, h: Math.min(w, height * 0.5) }; }

function draw() {
  background(24, 30, 38);
  let mu = colMeans(dataX), Xc = centerCols(dataX, mu), C = covMatrix(dataX), e = jacobiEigen(C);
  let st = standardizeCols(dataX), R = covMatrix(st.Z), er = jacobiEigen(R), wh = whitenData(dataX), Cw = covMatrix(wh.Z);
  let titles = ['① そのまま（縦横同じ縮尺）：共分散の PCA', '② 標準化：相関行列の PCA', '③ 白色化：共分散 = I'];
  let sets = [[Xc, C, e], [st.Z, R, er], [wh.Z, Cw, jacobiEigen(Cw)]];
  sets.forEach(([P, Cm, ee], i) => {
    let b = panelBox(i), span = Math.max(...P.flat().map(Math.abs), 1e-9) * 1.05, s = Math.min(b.w, b.h) / 2 / span, cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    stroke(60, 72, 88); strokeWeight(1); noFill(); rect(b.x, b.y, b.w, b.h); line(b.x, cy, b.x + b.w, cy); line(cx, b.y, cx, b.y + b.h);
    cloud(P, cx, cy, s, [225, 232, 242]); axes(ee, Cm, cx, cy, s);
    noStroke(); fill(205, 212, 222); textSize(14); textAlign(LEFT, BASELINE); text(titles[i], b.x, b.y - 10);
    let y = b.y + b.h + 28; fill(220); textSize(14);
    text('行列 [[' + fmtN(Cm[0][0], 3) + ', ' + fmtN(Cm[0][1], 3) + '], [' + fmtN(Cm[1][0], 3) + ', ' + fmtN(Cm[1][1], 3) + ']]', b.x, y);
    fill(255, 225, 140); text('PC1 = ' + fmtVec(ee.vecs[0], 3) + '　λ1 = ' + fmtN(ee.vals[0], 3), b.x, y + 24);
    fill(255, 125, 105); text('PC2 = ' + fmtVec(ee.vecs[1], 3) + '　λ2 = ' + fmtN(ee.vals[1], 3), b.x, y + 46);
  });
  let unit = useMM ? 'mm' : 'cm', r = R[0][1], y = panelBox(0).y + panelBox(0).h + 110;
  noStroke(); fill(220); textSize(15); textAlign(LEFT, BASELINE);
  text('横 = 身長（' + unit + '）、縦 = 体重（kg）。身長の標準偏差 ' + fmtN(Math.sqrt(C[0][0]), 2) + ' ' + unit + '、体重 ' + fmtN(Math.sqrt(C[1][1]), 2) + ' kg、相関 r = ' + fmtN(r, 3), 40, y);
  fill(255, 225, 140); text('① の PC1 の角度 = ' + fmtN((Math.atan2(e.vecs[0][1], e.vecs[0][0]) * 180) / Math.PI, 2) + '°（単位で変わる）　② は 1 ± r = ' + fmtN(1 + r, 3) + ', ' + fmtN(1 - r, 3) + '、向きは 45°（単位で変わらない）', 40, y + 26);
  fill(165, 175, 190); textSize(14);
  text('単位を変えただけで「いちばんばらつく向き」が変わるのは、数の大きさを比べているから。単位のちがう量は標準化してから PCA するのがふつう。白色化は PCA で回してから各軸を √λ で割ったもの（12 の独立成分分析の前処理）', 40, y + 56, width - 80);
  fill(240); textSize(22); text('標準化と白色化', 40, 44);
  fill(165, 175, 190); textSize(15); text('U 身長の単位（いま ' + unit + '）　↑↓ 関係の強さ（' + fmtN(slope, 2) + ' kg/cm）　R 新しいデータ', 40, 72);
  drawSelfTest(width - 190, height - 14);
}

function keyPressed() {
  if (key === 'u' || key === 'U') { useMM = !useMM; rebuild(); }
  if (key === UP_ARROW || key === DOWN_ARROW) { slope = clampv(Math.round((slope + (key === UP_ARROW ? 0.1 : -0.1)) * 10) / 10, -1.5, 1.5); rebuild(); }
  if (key === 'r' || key === 'R') { seedD++; rebuild(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(110);
  let P = makePeople(300, 0.8), Pmm = P.map((p) => [10 * p[0], p[1]]), st = standardizeCols(P), Cz = covMatrix(st.Z);
  check('標準化した列は 平均 0・標準偏差 1（1e-12）', colMeans(st.Z).every((m) => Math.abs(m) < 1e-12) && near(Cz[0][0], 1, 1e-12) && near(Cz[1][1], 1, 1e-12));
  let ea = jacobiEigen(covMatrix(standardizeCols(P).Z)), eb = jacobiEigen(covMatrix(standardizeCols(Pmm).Z));
  check('相関行列の PCA は cm でも mm でも同じ（固有値・固有ベクトル 1e-12）', ea.vals.every((l, k) => near(l, eb.vals[k], 1e-12)) && ea.vecs.every((v, k) => angleBetween(v, eb.vecs[k]) < 1e-9));
  let ca = jacobiEigen(covMatrix(P)), cb = jacobiEigen(covMatrix(Pmm));
  check('共分散の PCA は単位で変わる：mm にすると PC1 が 30° 以上回り、身長の軸から 6° 以内に', angleBetween(ca.vecs[0], cb.vecs[0]) > 30 && angleBetween(cb.vecs[0], [1, 0]) < 6);
  let r = Cz[0][1];
  check('2 変数の相関行列：固有値 1 ± r、固有ベクトル (1, ±1)/√2', near(ea.vals[0], 1 + Math.abs(r), 1e-12) && near(ea.vals[1], 1 - Math.abs(r), 1e-12) && angleBetween(ea.vecs[0], [1, Math.sign(r)]) < 1e-9);
  let okW = true;
  for (let t = 0; t < 10; t++) { let d = 2 + (t % 4), Q = Array.from({ length: d }, (_, i) => Array.from({ length: d }, (_, j) => (i === j ? 1 + t : 0) + rndRange(-0.8, 0.8))), C = matMul(Q, matT(Q)), X = gaussCloud(200, new Array(d).fill(3), C), w = whitenData(X); if (maxAbsDiff(covMatrix(w.Z), eyeMat(d)) > 1e-9) okW = false; }
  check('白色化したデータの共分散 = 単位行列 I（2〜5 次元、1e-9）', okW);
  let flat = standardizeCols([[1, 5], [2, 5], [3, 5]]);
  check('ばらつきが 0 の列があっても NaN にならない', noNaN(flat.Z) && noNaN(whitenData([[1, 5], [2, 5], [3, 5]]).Z));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. U で cm ⇔ mm を切りかえ、① と ② の PC1 を比べよう。どちらが「単位に左右されない」？
// 2. ↑↓ で関係の強さを 0 にすると、② の固有値はどうなる？（r = 0 → 1 と 1）
// 3. ③ の白色化した点は、どの向きから見ても同じばらつき。PCA の向きは決まる？
// 4. 身長を m（メートル）にしたら、① の PC1 はどちらを向くと思う？（makePeople を書きかえて試そう）
// 5. 白色化は 12 の独立成分分析の前処理。白色化しただけでは、まだ「回転」が決まっていない

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
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) ? v.every(noNaN) : !(typeof v === 'number' && !isFinite(v)); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length && n > 0 ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function selfTestOk() { return selfTestResults.length > 0 && selfTestResults.every((r) => r.ok); }
function drawSelfTest(x, y) { noStroke(); fill(selfTestOk() ? color(120, 210, 170) : color(255, 90, 90)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
