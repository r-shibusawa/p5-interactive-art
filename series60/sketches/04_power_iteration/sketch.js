// ============================================
// 04 べき乗法とデフレーション ─ 「C を掛けて長さ 1 にもどす」をくり返すと第 1 主成分に近づく
// v ← C v / ‖C v‖。v を固有ベクトルで分けると、k 回で λ_i^k 倍 → いちばん大きい λ1 の成分だけが残る
//   ずれの角 θ_k は tan θ_k ≤ tan θ_0 · (λ2/λ1)^k。λ2/λ1 が 1 に近いほど遅い（片対数グラフで直線）
//   デフレーション：C2 = C − λ1 v1 v1ᵀ（第 1 成分を引く）にまたべき乗法 → 第 2 主成分。これは固有値の計算法で、最適化ではない
// スペース 1 回掛ける（左）/ A 自動 / D デフレーション（左）/ ↑↓ λ2/λ1（右）/ R 新しい始まり
// ============================================

const DIM = 8;                         // ★ 右のグラフの次元
const KMAX = 60;                       // ★ 右のグラフの反復回数
let ratio = 0.8, seedV = 2, C2d = null, v2d = [1, 0], hist2d = [], deflated = false, auto = true, lastT = 0, curves = null;   // ★ ratio = λ2/λ1

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); selfTest(); C2d = covFromAxes(2, 1.1, 35); restart2d(); buildCurves(); }
// ★ べき乗法の 1 回：v ← C v / ‖C v‖
function powerStep(C, v) { return unitv(matVec(C, v)); }
function tanTo(v, q) { let u = unitv(q), w = unitv(v), c = dotv(w, u), r = 0; for (let i = 0; i < u.length; i++) r += (w[i] - c * u[i]) ** 2; return Math.sqrt(r) / Math.max(Math.abs(c), 1e-300); }   // tan θ（θ = v と q の角）
function rayleigh(C, v) { return dotv(v, matVec(C, v)) / Math.max(dotv(v, v), 1e-300); }   // λ の見積もり vᵀ C v
function deflate(C, lam, v) { return C.map((r, i) => r.map((x, j) => x - lam * v[i] * v[j])); }   // C − λ v vᵀ
// 固有値 vals をもつ d×d の対称行列（向きは乱数）
function matWithEigen(vals) { let Q = orthonormalize(vals.map(() => vals.map(() => gaussRnd()))), C = zerosMat(vals.length, vals.length); vals.forEach((l, k) => { for (let i = 0; i < C.length; i++) for (let j = 0; j < C.length; j++) C[i][j] += l * Q[k][i] * Q[k][j]; }); return { C, Q }; }
function restart2d() { seedRng(seedV); let a = rnd() * Math.PI; v2d = [Math.cos(a), Math.sin(a)]; hist2d = [v2d]; deflated = false; }
// 右：d 次元でべき乗法 → デフレーション → べき乗法。角度のずれを記録
function buildCurves() {
  seedRng(40 + seedV); let vals = [4, 4 * ratio]; for (let k = 2; k < DIM; k++) vals.push(vals[k - 1] * 0.7);
  let { C, Q } = matWithEigen(vals), v = unitv(vals.map(() => gaussRnd())), e1 = [], e2 = [];
  for (let k = 0; k <= KMAX; k++) { e1.push(angleBetween(v, Q[0])); v = powerStep(C, v); }
  for (let k = 0, dv = 1; k < 20000 && dv > 1e-14; k++) { let w = powerStep(C, v); dv = angleBetween(v, w); v = w; }   // デフレーションの前に v1 を十分に収束させる（変化が 1e-14° 未満まで）
  let l1 = rayleigh(C, v), Cd = deflate(C, l1, v), w = unitv(vals.map(() => gaussRnd()));
  for (let k = 0; k <= KMAX; k++) { e2.push(angleBetween(w, Q[1])); w = powerStep(Cd, w); }
  curves = { e1, e2, vals, l1, l2: rayleigh(C, w) };
}

function draw() {
  background(24, 30, 38);
  if (auto && millis() - lastT > 600) { lastT = millis(); doStep(); }
  let e = eig2sym(C2d[0][0], C2d[0][1], C2d[1][1]), s = Math.min(width * 0.075, height * 0.1), cx = width * 0.24, cy = height * 0.52, Cm = deflated ? deflate(C2d, e.l1, e.v1) : C2d;
  // ---- 左：2D でべき乗法
  stroke(90, 165, 240, 160); strokeWeight(1.5); for (let k of [1, 2]) polyline(covEllipsePts([0, 0], C2d, k).map((p) => [cx + p[0] * s, cy - p[1] * s]));
  stroke(90, 165, 240, 90); line(cx - e.v1[0] * 4 * s, cy + e.v1[1] * 4 * s, cx + e.v1[0] * 4 * s, cy - e.v1[1] * 4 * s); line(cx - e.v2[0] * 3 * s, cy + e.v2[1] * 3 * s, cx + e.v2[0] * 3 * s, cy - e.v2[1] * 3 * s);
  hist2d.forEach((v, i) => { let a = 60 + (195 * (i + 1)) / hist2d.length; stroke(255, 225, 140, a); fill(255, 225, 140, a); strokeWeight(i === hist2d.length - 1 ? 3 : 1.2); arrow2(cx, cy, cx + v[0] * 3 * s, cy - v[1] * 3 * s, 9); });
  let target = deflated ? e.v2 : e.v1, vk = hist2d[hist2d.length - 1];
  noStroke(); fill(220); textSize(15); textAlign(LEFT, BASELINE);
  text((deflated ? 'デフレーション後 C2 = C − λ1 v1 v1ᵀ：' : 'C そのまま：') + '反復 ' + (hist2d.length - 1) + ' 回　ずれ ' + fmtN(angleBetween(vk, target), 4) + '°', 40, cy + 4.3 * s);
  text('vᵀ C v = ' + fmtN(rayleigh(Cm, vk), 4) + '　（' + (deflated ? 'λ2' : 'λ1') + ' = ' + fmtN(deflated ? e.l2 : e.l1, 4) + '）　λ2/λ1 = ' + fmtN(e.l2 / e.l1, 3), 40, cy + 4.3 * s + 24);
  // ---- 右：片対数グラフ
  let g = { x: width * 0.52, y: 130, w: width * 0.44, h: height * 0.45, x0: 0, x1: KMAX, y0: -12, y1: 2.2 };
  plotAxes(g, '反復 k', 'log10（ずれの角 °）', [0, 20, 40, 60], [-12, -8, -4, 0, 2]);
  let lg = (d) => Math.log10(Math.max(d, 1e-12));
  stroke(255, 225, 140); strokeWeight(2.5); polyline(curves.e1.map((d, k) => [gX(g, k), gY(g, lg(d))]));
  stroke(255, 125, 105); polyline(curves.e2.map((d, k) => [gX(g, k), gY(g, lg(d))]));
  stroke(255, 225, 140, 120); strokeWeight(1); drawingContext.setLineDash([6, 6]);
  let t0 = lg(curves.e1[0]); line(gX(g, 0), gY(g, t0), gX(g, KMAX), gY(g, t0 + KMAX * Math.log10(ratio)));
  stroke(255, 125, 105, 120); let r2 = curves.vals[2] / curves.vals[1], t2 = lg(curves.e2[0]); line(gX(g, 0), gY(g, t2), gX(g, KMAX), gY(g, t2 + KMAX * Math.log10(r2))); drawingContext.setLineDash([]);
  // ---- 文字
  noStroke(); fill(240); textSize(22); text('べき乗法とデフレーション', 40, 44);
  fill(165, 175, 190); textSize(15); text('スペース 1 回掛ける　A 自動（' + (auto ? 'ON' : 'OFF') + '）　D デフレーション（' + (deflated ? 'ON' : 'OFF') + '）　↑↓ λ2/λ1（右）　R 新しい始まり', 40, 72);
  let x = g.x, y = g.y + g.h + 60;
  fill(255, 225, 140); textSize(16); text('黄：第 1 主成分へのずれ。破線 = 傾き log10(λ2/λ1) = log10(' + fmtN(ratio, 2) + ')', x, y);
  fill(255, 125, 105); text('コーラル：デフレーション後、第 2 主成分へのずれ。破線 = log10(λ3/λ2)', x, y + 26);
  fill(220); text(DIM + ' 次元、固有値 ' + curves.vals.map((v) => fmtN(v, 2)).join(', '), x, y + 56);
  text('べき乗法の λ1 = ' + fmtN(curves.l1, 6) + '　デフレーション後の λ2 = ' + fmtN(curves.l2, 6), x, y + 80);
  fill(165, 175, 190); textSize(14); text('デフレーションには、変化がなくなるまでまわした正確な v1 を使う（v1 がずれていると、そのずれが v2 にも残る）。λ2/λ1 を 0.98 にすると 60 回でもほとんど進まない', x, y + 110, g.w);
  drawSelfTest(width - 190, height - 14);
}

function doStep() {
  let e = eig2sym(C2d[0][0], C2d[0][1], C2d[1][1]), Cm = deflated ? deflate(C2d, e.l1, e.v1) : C2d;
  if (hist2d.length > 30) hist2d.shift();
  hist2d.push(powerStep(Cm, hist2d[hist2d.length - 1]));
}
function keyPressed() {
  if (key === ' ') doStep();
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'd' || key === 'D') { let v0 = hist2d[0]; deflated = !deflated; hist2d = [v0]; }
  if (key === UP_ARROW || key === DOWN_ARROW) { ratio = clampv(Math.round((ratio + (key === UP_ARROW ? 0.05 : -0.05)) * 100) / 100, 0.1, 0.98); buildCurves(); }
  if (key === 'r' || key === 'R') { seedV++; restart2d(); buildCurves(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(104);
  let okV = true, okL = true, okAll = true, okBound = true, okRate = true;
  for (let t = 0; t < 10; t++) {
    let vals = Array.from({ length: 8 }, (_, k) => 5 * Math.pow(0.7, k) + 0.01 * t), { C } = matWithEigen(vals), J = jacobiEigen(C);
    let v = unitv(vals.map(() => gaussRnd())); for (let k = 0; k < 300; k++) v = powerStep(C, v);
    if (angleBetween(v, J.vecs[0]) > 1e-6) okV = false;
    if (!near(rayleigh(C, v), J.vals[0], 1e-10 * J.vals[0])) okL = false;
    let Cd = C, found = [];                                            // 全部をデフレーションで
    for (let i = 0; i < 8; i++) { let w = unitv(vals.map(() => gaussRnd())); for (let k = 0; k < 400; k++) w = powerStep(Cd, w); let l = rayleigh(Cd, w); found.push(l); if (angleBetween(w, J.vecs[i]) > 1e-4) okAll = false; Cd = deflate(Cd, l, w); }
    if (!found.every((l, i) => near(l, J.vals[i], 1e-8 * J.vals[0]))) okAll = false;
  }
  check('べき乗法（300 回）→ ヤコビ法の第 1 固有ベクトル（1e-6° 以内）', okV);
  check('レイリー商 vᵀ C v → λ1（1e-10）', okL);
  check('デフレーションをくり返すと 8 個すべての固有値・固有ベクトルがヤコビ法と一致', okAll);
  for (let r of [0.5, 0.8, 0.95]) {
    let vals = [4, 4 * r, 4 * r * 0.6, 1, 0.5, 0.3], { C, Q } = matWithEigen(vals), v = unitv(vals.map(() => gaussRnd())), tan0 = tanTo(v, Q[0]), rates = [];
    for (let k = 1; k <= 40; k++) { let prev = tanTo(v, Q[0]); v = powerStep(C, v); let tk = tanTo(v, Q[0]); if (tk > tan0 * Math.pow(r, k) * (1 + 1e-9) + 1e-12) okBound = false; if (k > 30 && prev > 1e-10) rates.push(tk / prev); }
    if (rates.length && !rates.every((q) => Math.abs(q - r) < 0.02)) okRate = false;
  }
  check('tan θ_k ≤ tan θ_0 · (λ2/λ1)^k（λ2/λ1 = 0.5, 0.8, 0.95）', okBound);
  check('十分あとの 1 回ごとの縮み tan θ_(k+1) / tan θ_k ≈ λ2/λ1（±0.02）', okRate);
  let D = deflate([[3, 1], [1, 2]], ...((e) => [e.l1, e.v1])(eig2sym(3, 1, 2)));
  check('2×2 のデフレーション後の行列は v1 を 0 に、v2 を λ2 v2 に写す', ((e) => vlen(matVec(D, e.v1)) < 1e-12 && near(rayleigh(D, e.v2), e.l2, 1e-12))(eig2sym(3, 1, 2)));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. スペースで 1 回ずつ掛け、黄色の矢印が長い軸に吸いよせられる様子を見よう。何回で 1° 以内？
// 2. ↑↓ で λ2/λ1 を 0.5 と 0.95 にして、右のグラフの傾きを比べよう
// 3. D でデフレーション。2 次元では 1 回で v2 になるのはなぜ？
// 4. 始まりの v がちょうど v2 の向きだと、べき乗法はどうなる？（丸め誤差が助けてくれる）
// 5. 100 次元のデータでも、上の数個だけならべき乗法は速い（08 の固有顔で使う）

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
