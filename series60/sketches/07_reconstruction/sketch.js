// ============================================
// 07 復元と誤差 ─ k 個の主成分だけで画像を作り直す：x_hat = μ + Σ_(j≤k) ((x − μ)·v_j) v_j
// データ = 8×8 マスの小さな模様（しま・ぼんやりした丸・明るさ）400 枚。d = 64 次元をヤコビ法で固有値分解
//   復元誤差の約束：E(k) = Σ_i ‖x_i − x_hat_i‖² / (n − 1)（共分散と同じく n − 1 で割る）→ E(k) = 捨てた固有値の和 λ_(k+1) + … + λ_64
//   同じ k 本なら、主成分の向きがいちばん誤差が小さい（ランダムな向きと比べる）
// ← → 使う成分の数 k / クリック 模様を選ぶ / R 新しいデータ / N ノイズ ON/OFF
// ============================================

const PN = 8, DIMP = PN * PN, NPTS = 400;   // ★ 模様の大きさ（8×8 = 64 次元）と枚数
let kUse = 4, seedD = 2, noiseOn = true, dataX = [], muX = null, eg = null, errCurve = [], sel = 0;

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); selfTest(); rebuild(); }
// ★ 模様の作り方：しま（向き・細かさはランダム）＋ ぼんやりした丸 ＋ 明るさ ＋ 少しのノイズ
function makePatch(noise) {
  let th = rnd() * Math.PI, f = rndRange(0.4, 1.4), ph = rnd() * 2 * Math.PI, a = rndRange(0, 0.5), b = rndRange(-0.6, 0.6), cx = rndRange(1, 6), cy = rndRange(1, 6), c0 = rndRange(-0.3, 0.3);
  return Array.from({ length: DIMP }, (_, i) => { let x = i % PN, y = Math.floor(i / PN); return c0 + a * Math.cos(f * (x * Math.cos(th) + y * Math.sin(th)) + ph) + b * Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / 6) + noise * gaussRnd(); });
}
function rebuild() {
  seedRng(seedD); dataX = Array.from({ length: NPTS }, () => makePatch(noiseOn ? 0.05 : 0));
  muX = colMeans(dataX); eg = jacobiEigen(covMatrix(dataX)); errCurve = reconErrors(dataX, muX, eg.vecs);
}
// k = 0〜d のすべてで復元誤差 E(k) を実際に作り直して計算
function reconErrors(X, mu, vecs) {
  let sc = projectData(X, mu, vecs, vecs.length);
  return Array.from({ length: vecs.length + 1 }, (_, k) => X.reduce((acc, r, i) => { let xh = reconstructRow(sc[i].slice(0, k), mu, vecs); return acc + r.reduce((q, v, j) => q + (v - xh[j]) ** 2, 0); }, 0) / (X.length - 1));
}
function drawPatch(v, x, y, s) { noStroke(); for (let i = 0; i < v.length; i++) { let g = clampv(128 + 160 * v[i], 0, 255); fill(g); rect(x + (i % PN) * s, y + Math.floor(i / PN) * s, s + 0.5, s + 0.5); } }
function drawEig(v, x, y, s) { let m = Math.max(...v.map(Math.abs)) || 1; noStroke(); for (let i = 0; i < v.length; i++) { let t = v[i] / m; fill(t > 0 ? color(128 + 127 * t, 128 + 60 * t, 128 - 80 * t) : color(128 + 80 * t, 128 - 20 * t, 128 - 127 * t)); rect(x + (i % PN) * s, y + Math.floor(i / PN) * s, s + 0.5, s + 0.5); } }

function draw() {
  background(24, 30, 38);
  let sc = projectData([dataX[sel]], muX, eg.vecs, kUse)[0], xh = reconstructRow(sc, muX, eg.vecs), tot = errCurve[0];
  // ---- 上：もとの模様と復元（8 枚）
  textAlign(LEFT, BASELINE); noStroke(); fill(205, 212, 222); textSize(15); text('もとの模様（クリックで選ぶ）', 40, 112); text('k = ' + kUse + ' 本で復元', 40, 220);
  let s = 9;
  for (let j = 0; j < 8; j++) {
    let x = 40 + j * (PN * s + 10), v = dataX[j], r = reconstructRow(projectData([v], muX, eg.vecs, kUse)[0], muX, eg.vecs);
    drawPatch(v, x, 122, s); drawPatch(r, x, 228, s);
    if (j === sel) { noFill(); stroke(255, 225, 140); strokeWeight(2); rect(x - 3, 119, PN * s + 6, PN * s + 6); }
  }
  // ---- 選んだ模様を大きく：もと・復元・差
  let bs = 18, by = 350;
  [['もと', dataX[sel]], ['復元 x_hat', xh], ['差 x − x_hat（×3）', dataX[sel].map((v, i) => 3 * (v - xh[i]))]].forEach(([t, v], i) => { let x = 40 + i * (PN * bs + 24); noStroke(); fill(205, 212, 222); textSize(14); text(t, x, by - 8); drawPatch(v, x, by, bs); });
  fill(220); textSize(15); text('この模様の誤差 ‖x − x_hat‖² = ' + fmtN(dataX[sel].reduce((q, v, j) => q + (v - xh[j]) ** 2, 0), 4), 40, by + PN * bs + 28);
  // ---- 固有画像（主成分 1〜16）
  fill(205, 212, 222); textSize(14); text('主成分 v1〜v16（オレンジ = 正、青 = 負）　使っている k 本を黄色の枠で', 40, by + PN * bs + 64);
  for (let k = 0; k < 16; k++) { let x = 40 + (k % 8) * (PN * 6 + 8), y = by + PN * bs + 76 + Math.floor(k / 8) * (PN * 6 + 8); drawEig(eg.vecs[k], x, y, 6); if (k < kUse) { noFill(); stroke(255, 225, 140); strokeWeight(1.5); rect(x - 2, y - 2, PN * 6 + 4, PN * 6 + 4); } }
  // ---- 誤差のグラフ
  let g = { x: width * 0.6, y: 130, w: width * 0.36, h: height * 0.42, x0: 0, x1: DIMP, y0: 0, y1: tot * 1.05 };
  plotAxes(g, '使う成分の数 k', '復元誤差 E(k)（点）と捨てた固有値の和（線）', [0, 16, 32, 48, 64], [0, +(tot / 2).toPrecision(3), +tot.toPrecision(3)]);
  let dropped = Array.from({ length: DIMP + 1 }, (_, k) => eg.vals.slice(k).reduce((a, b) => a + b, 0));
  stroke(90, 165, 240); strokeWeight(2.5); polyline(dropped.map((v, k) => [gX(g, k), gY(g, v)]));
  noStroke(); fill(255, 225, 140); errCurve.forEach((v, k) => { if (k % 2 === 0 || k < 12) circle(gX(g, k), gY(g, v), 5); });
  stroke(255, 125, 105); strokeWeight(1); line(gX(g, kUse), g.y, gX(g, kUse), g.y + g.h);
  // ---- 文字
  noStroke(); fill(240); textSize(22); text('復元と誤差', 40, 44);
  fill(165, 175, 190); textSize(15); text('← → 成分の数 k（' + kUse + '）　クリック 模様を選ぶ　R 新しいデータ　N ノイズ（' + (noiseOn ? 'ON' : 'OFF') + '）', 40, 72);
  let x = g.x, y = g.y + g.h + 66;
  fill(255, 225, 140); textSize(17); text('実際に作り直した誤差 E(' + kUse + ') = ' + fmtN(errCurve[kUse], 6), x, y);
  fill(90, 165, 240); text('捨てた固有値の和 λ' + (kUse + 1) + ' + … + λ64 = ' + fmtN(dropped[kUse], 6), x, y + 26);
  fill(220); text('残った割合（累積寄与率）= ' + fmtN(100 * (1 - errCurve[kUse] / tot), 2) + '%', x, y + 52); text('64 個の数を ' + kUse + ' 個の得点で表している', x, y + 76);
  fill(165, 175, 190); textSize(14); text('E(k) = Σ‖x − x_hat‖² / (n − 1)。k = 0 は全部を平均 μ で表したとき（= 全分散 = トレース）。k = 64 で誤差 0', x, y + 108, g.w);
  drawSelfTest(width - 190, height - 14);
}

function mousePressed() { for (let j = 0; j < 8; j++) { let x = 40 + j * (PN * 9 + 10); if (mouseX > x && mouseX < x + PN * 9 && mouseY > 122 && mouseY < 122 + PN * 9) sel = j; } }
function keyPressed() {
  if (key === LEFT_ARROW || key === RIGHT_ARROW) kUse = clampv(kUse + (key === RIGHT_ARROW ? 1 : -1), 0, DIMP);
  if (key === 'r' || key === 'R') { seedD++; rebuild(); }
  if (key === 'n' || key === 'N') { noiseOn = !noiseOn; rebuild(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(107);
  let X = Array.from({ length: 150 }, () => makePatch(0.05)), mu = colMeans(X), C = covMatrix(X), e = jacobiEigen(C), E = reconErrors(X, mu, e.vecs), tr = traceOf(C);
  check('ヤコビ法（64×64）：C V = V Λ（≤ 1e-9 × トレース）、正規直交', eigResidual(C, e) < 1e-9 * tr && orthoError(e.vecs) < 1e-9);
  check('すべての k = 0〜64 で E(k) = 捨てた固有値の和（相対 1e-9）', E.every((v, k) => near(v, e.vals.slice(k).reduce((a, b) => a + b, 0), 1e-9 * tr)));
  check('E(0) = トレース（全分散）、E(64) ≈ 0', near(E[0], tr, 1e-9 * tr) && E[64] < 1e-12 * tr);
  check('E(k) は k とともに減る', E.every((v, k) => k === 0 || v <= E[k - 1] + 1e-12 * tr));
  let okOpt = true;
  for (let t = 0; t < 20; t++) { let k = 1 + (t % 8), B = orthonormalize(Array.from({ length: k }, () => Array.from({ length: DIMP }, () => gaussRnd()))), Er = reconErrors(X, mu, B)[k]; if (Er < E[k] - 1e-9) okOpt = false; }
  check('ランダムな k 本の直交する向き（20 組）で復元すると、誤差はいつも主成分以上', okOpt);
  let r = reconstructRow(projectData([X[0]], mu, e.vecs, 64)[0], mu, e.vecs);
  check('64 本全部で復元すると元どおり（1e-12）、0 本なら平均', r.every((v, j) => near(v, X[0][j], 1e-12)) && reconstructRow([], mu, e.vecs).every((v, j) => v === mu[j]));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. k を 0 → 1 → 2 → … と増やすと、復元はどう変わる？ 何本で「ほぼ同じ」に見える？
// 2. N でノイズを消すと、誤差のグラフはどこで 0 になる？（模様を作る要素の数を考えよう）
// 3. 固有画像 v1, v2, … はどんな模様？ しまの向き？ 明るさ？
// 4. 同じ誤差なら、平均だけ（k = 0）の何 % の誤差まで下げたら十分？ 06 の寄与率と比べよう
// 5. 誤差 = 捨てた固有値の和 なのは「主成分どうしが直交していて、ピタゴラスの定理が使える」から

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
