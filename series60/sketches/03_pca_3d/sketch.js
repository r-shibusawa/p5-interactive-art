// ============================================
// 03 3 次元の点群 ─ 3×3 の共分散行列をヤコビ法で固有値分解して、3 本の主軸を描く
// ヤコビ法：非対角の成分を 1 つずつ「回転」で 0 にしていくと、対角に固有値、回転の積に固有ベクトルが残る
//   第 1・第 2 主成分の平面へ射影すると、3D の点群を「いちばん情報が残る 2D」で見られる（右下の図）
//   捨てた第 3 成分の分散 λ3 = 平面からの距離²の平均。λ3 が小さい（板・棒）ほど 2D で十分
// ドラッグ 視点を回す / 1 棒 2 板 3 球 4 雲 / R 向きを変える / P 平面へ押しつぶす / スペース 自動回転
// ============================================

const NPTS = 500;                      // ★ 点の数
const SHAPES = [
  { name: '棒', s: [3, 0.45, 0.3] },
  { name: '板', s: [2.6, 1.8, 0.22] },
  { name: '球', s: [1.5, 1.5, 1.5] },
  { name: '雲', s: [2.6, 1.3, 0.6] },
];                                     // ★ 3 本の軸の標準偏差
let ptGeom = null, ptGeomKey = '', hudDirty = true, shapeK = 1, seedR = 4, pts = [], eg = null, muP = null, flat = 0, flatOn = false, spin = true, rotY = 0, hud;

function setup() { createCanvas(windowWidth, windowHeight, WEBGL); hud = createGraphics(width, height); selfTest(); rebuild(); }
// 好きな向き（ランダムな回転 Q）と軸の長さ s で共分散 C = Q diag(s²) Qᵀ を作る
function randomRotation() { return orthonormalize([0, 1, 2].map(() => [gaussRnd(), gaussRnd(), gaussRnd()])); }
function covFromRot(Q, s) { let C = zerosMat(3, 3); for (let k = 0; k < 3; k++) for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) C[i][j] += s[k] * s[k] * Q[k][i] * Q[k][j]; return C; }
function rebuild() {
  seedRng(seedR); let Q = randomRotation(), C = covFromRot(Q, SHAPES[shapeK].s);
  pts = gaussCloud(NPTS, [0, 0, 0], C); muP = colMeans(pts); eg = jacobiEigen(covMatrix(pts)); hudDirty = true; ptGeomKey = '';
}

function draw() {
  background(24, 30, 38);
  orbitControl(); if (spin) rotY += 0.004; rotateY(rotY);
  flat = clampv(flat + (flatOn ? 0.03 : -0.03), 0, 1);
  let sc = Math.min(width, height) * 0.06, PC = eg.vecs, sc3 = projectData(pts, muP, PC, 3);
  // ---- 点（P で第 3 成分を 0 に近づける = 平面へ射影）
  // 点は形（ジオメトリ）として 1 度だけ作り、押しつぶし中や作り直したときだけ作り直す（毎フレーム作ると重い）
  if (!ptGeom || ptGeomKey !== flat + '/' + sc) {
    if (ptGeom) freeGeometry(ptGeom);
    ptGeom = buildGeometry(() => {
      noStroke();
      for (let i = 0; i < pts.length; i++) {                     // 点 = 小さな立方体（色つき）
        let s3 = sc3[i][2] * (1 - flat), q = [0, 1, 2].map((j) => muP[j] + sc3[i][0] * PC[0][j] + sc3[i][1] * PC[1][j] + s3 * PC[2][j]);
        fill(150 + 60 * Math.tanh(sc3[i][0] / 2), 200, 255 - 60 * Math.tanh(sc3[i][1] / 2));
        push(); translate(q[0] * sc, -q[1] * sc, q[2] * sc); box(4); pop();
      }
    });
    ptGeomKey = flat + '/' + sc;
  }
  noStroke(); model(ptGeom);
  // ---- 3 本の主軸（長さ 2√λ）と PC1-PC2 の平面
  let cols = [[255, 225, 140], [90, 165, 240], [255, 125, 105]];
  push(); translate(muP[0] * sc, -muP[1] * sc, muP[2] * sc);
  for (let k = 0; k < 3; k++) {
    let L = 2 * Math.sqrt(Math.max(0, eg.vals[k])) * sc, v = PC[k];
    stroke(...cols[k]); strokeWeight(3); line(-v[0] * L, v[1] * L, -v[2] * L, v[0] * L, -v[1] * L, v[2] * L);
  }
  let a = PC[0].map((x) => x * 2.2 * Math.sqrt(eg.vals[0]) * sc), b = PC[1].map((x) => x * 2.2 * Math.sqrt(eg.vals[1]) * sc);
  noStroke(); fill(90, 165, 240, 40); beginShape();
  for (let [p, q] of [[1, 1], [1, -1], [-1, -1], [-1, 1]]) vertex(p * a[0] + q * b[0], -(p * a[1] + q * b[1]), p * a[2] + q * b[2]);
  endShape(CLOSE); pop();
  drawHud(sc3);
}

// ---- 画面に重ねる文字と 2D の図（2D のバッファに描いて最後に貼る）
function drawHud(sc3) {
  let h = hud, tot = eg.vals.reduce((s, v) => s + v, 0);
  if (!hudDirty) { hudShow(); return; }                       // 文字と 2D の図は、変わったときだけ描き直す（軽くするため）
  hudDirty = false;
  h.clear(); h.noStroke(); h.fill(240); h.textSize(22); h.textAlign(LEFT, BASELINE);
  h.text('3 次元の点群とヤコビ法の主軸　形：' + SHAPES[shapeK].name, 40, 44);
  h.fill(165, 175, 190); h.textSize(15); h.text('ドラッグ 視点　1 棒 2 板 3 球 4 雲　R 向き　P 平面へ押しつぶす（' + (flatOn ? 'ON' : 'OFF') + '）　スペース 自動回転', 40, 72);
  let cols = [[255, 225, 140], [90, 165, 240], [255, 125, 105]];
  for (let k = 0; k < 3; k++) {
    let y = 120 + k * 56; h.fill(...cols[k]); h.textSize(17);
    h.text('λ' + (k + 1) + ' = ' + fmtN(eg.vals[k], 3) + '　（' + fmtN((100 * eg.vals[k]) / tot, 1) + '%）　v' + (k + 1) + ' = ' + fmtVec(eg.vecs[k], 3), 40, y);
    h.rect(40, y + 8, (300 * eg.vals[k]) / Math.max(eg.vals[0], 1e-9), 10);
  }
  h.fill(220); h.textSize(15);
  h.text('λ1 : λ2 : λ3 = 1 : ' + fmtN(eg.vals[1] / eg.vals[0], 3) + ' : ' + fmtN(eg.vals[2] / eg.vals[0], 3) + '　　λ1 + λ2 + λ3 = ' + fmtN(tot, 3) + ' = トレース', 40, 300);
  h.text('平面からの距離²の平均 = ' + fmtN(sc3.reduce((s, r) => s + r[2] * r[2], 0) / (sc3.length - 1), 3) + ' = λ3（捨てた分散）', 40, 324);
  // 右下：PC1-PC2 平面への射影（2D）
  let w = Math.min(340, width * 0.3), x0 = width - w - 40, y0 = height - w - 60, s = w / (4.4 * Math.sqrt(eg.vals[0]) + 1e-9);
  h.stroke(70, 82, 98); h.noFill(); h.rect(x0, y0, w, w); h.line(x0, y0 + w / 2, x0 + w, y0 + w / 2); h.line(x0 + w / 2, y0, x0 + w / 2, y0 + w);
  h.noStroke();
  for (let r of sc3) { h.fill(150 + 60 * Math.tanh(r[0] / 2), 200, 255 - 60 * Math.tanh(r[1] / 2), 200); h.circle(x0 + w / 2 + clampv(r[0] * s, -w / 2, w / 2), y0 + w / 2 - clampv(r[1] * s, -w / 2, w / 2), 4); }
  h.fill(220); h.textSize(14); h.text('PC1-PC2 平面に射影（横 PC1、縦 PC2）', x0, y0 - 10);
  h.fill(selfTestOk() ? color(120, 210, 170) : color(255, 90, 90)); h.text(selfTestLine(), width - 190, height - 14);
  hudShow();
}
function hudShow() { drawingContext.clear(drawingContext.DEPTH_BUFFER_BIT); push(); resetMatrix(); noStroke(); image(hud, -width / 2, -height / 2, width, height); pop(); }

function keyPressed() {
  for (let k = 1; k <= 4; k++) if (key === String(k)) { shapeK = k - 1; rebuild(); }
  if (key === 'r' || key === 'R') { seedR++; rebuild(); }
  if (key === 'p' || key === 'P') flatOn = !flatOn;
  if (key === ' ') spin = !spin;
  hudDirty = true;
  return false;
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); hud = createGraphics(width, height); hudDirty = true; }

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(103);
  let okOrth = true, okRes = true, okTr = true;
  for (let t = 0; t < 30; t++) {
    let C = covFromRot(randomRotation(), [rndRange(0.1, 3), rndRange(0.1, 3), rndRange(0.05, 3)]), e = jacobiEigen(C), sc = traceOf(C);
    if (orthoError(e.vecs) > 1e-12) okOrth = false;
    if (eigResidual(C, e) > 1e-9 * sc) okRes = false;
    if (!near(e.vals.reduce((s, v) => s + v, 0), sc, 1e-12 * sc) || e.vals[0] < e.vals[1] || e.vals[1] < e.vals[2]) okTr = false;
  }
  check('ヤコビ法の固有ベクトルは正規直交（30 個の 3×3、1e-12）', okOrth);
  check('C V = V Λ（ずれ ≤ 1e-9 × トレース）', okRes);
  check('固有値の和 = トレース、大きい順', okTr);
  let Q = randomRotation(), s = [3, 1.6, 0.4], e = jacobiEigen(covFromRot(Q, s));
  check('Q diag(s²) Qᵀ の固有値 = s²、固有ベクトル = Q の行（向きのちがい < 1e-6°）', e.vals.every((l, k) => near(l, s[k] * s[k], 1e-10)) && e.vecs.every((v, k) => angleBetween(v, Q[k]) < 1e-6));
  let P = gaussCloud(20000, [0, 0, 0], covFromRot(Q, s)), mu = colMeans(P), ep = jacobiEigen(covMatrix(P));
  check('20000 点から求めた主軸 ≈ 作るときの向き（2° 以内）', ep.vecs.every((v, k) => angleBetween(v, Q[k]) < 2));
  let sc3 = projectData(P, mu, ep.vecs, 3), Cs = covMatrix(sc3);
  check('主成分得点の共分散 = diag(λ1, λ2, λ3)（無相関になる、1e-9）', maxAbsDiff(Cs, [[ep.vals[0], 0, 0], [0, ep.vals[1], 0], [0, 0, ep.vals[2]]]) < 1e-9);
  let dist2 = P.reduce((acc, r, i) => { let x = reconstructRow(sc3[i].slice(0, 2), mu, ep.vecs); return acc + r.reduce((q, v, j) => q + (v - x[j]) ** 2, 0); }, 0) / (P.length - 1);
  check('PC1-PC2 平面までの距離²の和 / (n − 1) = λ3', near(dist2, ep.vals[2], 1e-9 * traceOf(covMatrix(P))));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 1〜4 で形を変え、λ1 : λ2 : λ3 の比を予想してから確かめよう。棒は？ 板は？
// 2. P で平面へ押しつぶすと、どの形がいちばん「変わらない」？ λ3 と比べよう
// 3. 球（3）の主軸の向きは R のたびにばらばら。なぜ？（固有値がほぼ同じだと向きが決まらない）
// 4. SHAPES の s を変えて、自分の形を作ろう（例：[2, 2, 0.1] = 円盤）
// 5. 次元がもっと多いと、ヤコビ法は重くなる → 04 のべき乗法、05 の特異値分解

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
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) ? v.every(noNaN) : !(typeof v === 'number' && !isFinite(v)); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length && n > 0 ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function selfTestOk() { return selfTestResults.length > 0 && selfTestResults.every((r) => r.ok); }
function drawSelfTest(x, y) { noStroke(); fill(selfTestOk() ? color(120, 210, 170) : color(255, 90, 90)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
