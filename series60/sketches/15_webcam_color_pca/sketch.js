// ============================================
// 15 カメラ映像の色の主成分 ─ 画素の色 (R, G, B) を 3 次元の点群とみなして PCA する
// 160×120 = 19200 個の点の 3×3 共分散行列を、毎フレーム ヤコビ法で固有値分解
//   第 1 主成分だけで復元すると、色が 1 本の直線の上にのる → ほとんど「白黒」（ただし灰色の向きとは限らない）
//   2 本で色の平面、3 本で元どおり。下の色の帯 = 平均の色から ±2√λ だけ主成分の向きに動かした色
//   復元誤差（1 画素あたり、n − 1 で割る）= 捨てた固有値の和
// 1 2 3 使う成分の数 / V カメラ ⇔ テスト画像 / S 保存 / スペース 映像を止める
// ============================================

const CW = 160, CH = 120;              // ★ 計算に使う映像の大きさ
let cap = null, testPix = null, useCam = true, kUse = 1, frozen = false, srcImg, recImg, egC = null, muC = [0, 0, 0], errNow = 0, rgbPts = [];

function setup() {
  createCanvas(windowWidth, windowHeight); pixelDensity(1); textWrap(CHAR);
  srcImg = createImage(CW, CH); recImg = createImage(CW, CH); testPix = makeTestImage();
  selfTest();
  cap = createCapture(VIDEO, { flipped: true }); cap.size(CW, CH); cap.hide();
}
// テスト画像：なめらかな色のグラデーションと、いくつかの色の丸（カメラがないとき用）
function makeTestImage() {
  let px = new Uint8ClampedArray(CW * CH * 4);
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    let i = 4 * (x + CW * y), u = x / CW, v = y / CH, r = 60 + 150 * u, g = 70 + 120 * v, b = 170 - 90 * u + 40 * Math.sin(6 * v);
    for (let [cx, cy, cr, col] of [[40, 40, 22, [240, 200, 60]], [110, 70, 30, [60, 160, 230]], [70, 95, 18, [230, 80, 90]]]) { let d = Math.hypot(x - cx, y - cy); if (d < cr) { let t = clampv((cr - d) / 4, 0, 1); r += t * (col[0] - r); g += t * (col[1] - g); b += t * (col[2] - b); } }
    px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255;
  }
  return px;
}
function camReady() { return useCam && cap && cap.width > 0 && cap.elt.readyState >= 2 && cap.elt.videoWidth > 0; }
// ★ 画素 → 点群 → 平均と共分散 → ヤコビ法 → k 本で復元
function colorPCA(px, k, out) {
  let n = CW * CH, P = new Array(n);
  for (let i = 0; i < n; i++) P[i] = [px[4 * i], px[4 * i + 1], px[4 * i + 2]];
  let mu = colMeans(P), C = covMatrix(P), e = jacobiEigen(C), err = 0;
  for (let i = 0; i < n; i++) {
    let d = [P[i][0] - mu[0], P[i][1] - mu[1], P[i][2] - mu[2]], x = mu.slice();
    for (let c = 0; c < k; c++) { let s = dotv(d, e.vecs[c]); for (let j = 0; j < 3; j++) x[j] += s * e.vecs[c][j]; }
    for (let j = 0; j < 3; j++) { err += (P[i][j] - x[j]) ** 2; if (out) out[4 * i + j] = clampv(x[j], 0, 255); }
    if (out) out[4 * i + 3] = 255;
  }
  return { mu, C, e, P, err: err / (n - 1) };
}

function draw() {
  background(24, 30, 38);
  if (!frozen) {
    let px = testPix;
    if (camReady()) { cap.loadPixels(); if (cap.pixels.length >= CW * CH * 4) px = cap.pixels; }
    srcImg.loadPixels(); for (let i = 0; i < CW * CH * 4; i++) srcImg.pixels[i] = px[i]; srcImg.updatePixels();
    recImg.loadPixels(); let r = colorPCA(px, kUse, recImg.pixels); recImg.updatePixels();
    egC = r.e; muC = r.mu; errNow = r.err; rgbPts = r.P.filter((_, i) => i % 13 === 0);
  }
  let w = Math.min((width - 160) / 2.75, (height - 320) * 4 / 3), h = (w * 3) / 4;
  noSmooth(); image(srcImg, 40, 120, w, h); image(recImg, 80 + w, 120, w, h); smooth();
  noStroke(); fill(205, 212, 222); textSize(15); textAlign(LEFT, BASELINE);
  text('元の映像' + (camReady() ? '（カメラ）' : '（テスト画像）'), 40, 110); text('主成分 ' + kUse + ' 本で復元', 80 + w, 110);
  // ---- 右：PC1-PC2 平面の点群（各点の色で）
  let px0 = 120 + 2 * w, pw = Math.min(h, width - px0 - 40), pc = egC, R = 2.6 * Math.sqrt(Math.max(pc.vals[0], 1));
  if (pw > 100) {
    stroke(60, 72, 88); strokeWeight(1); noFill(); rect(px0, 120, pw, pw);
    noStroke(); for (let p of rgbPts) { let d = [p[0] - muC[0], p[1] - muC[1], p[2] - muC[2]], a = dotv(d, pc.vecs[0]), b = dotv(d, pc.vecs[1]); fill(p[0], p[1], p[2]); circle(px0 + pw / 2 + clampv(a / R, -0.5, 0.5) * pw, 120 + pw / 2 - clampv(b / R, -0.5, 0.5) * pw, 3); }
    fill(205, 212, 222); text('色の点群（PC1 横・PC2 縦）', px0, 110);
  }
  // ---- 主成分の色の帯
  let y = 150 + h, tot = pc.vals.reduce((s, v) => s + v, 0);
  for (let k = 0; k < 3; k++) {
    let x = 40 + k * Math.max(320, (width - 80) / 3), sd = 2 * Math.sqrt(Math.max(0, pc.vals[k])), lo = muC.map((m, j) => clampv(m - sd * pc.vecs[k][j], 0, 255)), hi = muC.map((m, j) => clampv(m + sd * pc.vecs[k][j], 0, 255));
    for (let t = 0; t <= 20; t++) { noStroke(); fill(...lo.map((v, j) => v + (hi[j] - v) * (t / 20))); rect(x + t * 11, y, 11, 26); }
    stroke(k < kUse ? color(255, 225, 140) : color(80, 92, 108)); strokeWeight(2); noFill(); rect(x, y, 231, 26);
    noStroke(); fill(k < kUse ? 240 : 150); textSize(14);
    text('PC' + (k + 1) + ' = ' + fmtVec(pc.vecs[k], 2), x, y + 46); text('λ = ' + fmtN(pc.vals[k], 1) + '（' + fmtN((100 * pc.vals[k]) / Math.max(tot, 1e-9), 1) + '%）', x, y + 66);
  }
  fill(220); textSize(15);
  text('平均の色 = ' + fmtVec(muC, 1) + '　復元誤差（1 画素あたり）= ' + fmtN(errNow, 2) + '　捨てた固有値の和 = ' + fmtN(pc.vals.slice(kUse).reduce((s, v) => s + v, 0), 2), 40, y + 100);
  fill(165, 175, 190); textSize(14);
  text('灰色の向き (1, 1, 1)/√3 と PC1 の角度 = ' + fmtN(angleBetween(pc.vecs[0], [1, 1, 1]), 1) + '°。白黒写真は「灰色の向き」への射影、PC1 だけの復元は「この映像でいちばん色が変わる向き」への射影', 40, y + 126, width - 80);
  fill(240); textSize(22); text('カメラ映像の色の主成分', 40, 44);
  fill(165, 175, 190); textSize(15); text('1 2 3 使う成分の数　V カメラ ⇔ テスト画像（いま ' + (useCam ? 'カメラ' : 'テスト画像') + '）　S 保存　スペース 止める（' + (frozen ? 'ON' : 'OFF') + '）　📷 カメラがなければテスト画像', 40, 72);
  drawSelfTest(width - 190, height - 14);
}

function keyPressed() {
  for (let k = 1; k <= 3; k++) if (key === String(k)) kUse = k;
  if (key === 'v' || key === 'V') useCam = !useCam;
  if (key === 's' || key === 'S') saveCanvas('color_pca', 'png');
  if (key === ' ') frozen = !frozen;
  return false;
}

// ---- 自己テスト（テスト画像で）
function selfTest() {
  selfTestResults = [];
  let r3 = colorPCA(testPix, 3, null), C = r3.C, e = r3.e, tr = traceOf(C);
  check('色の共分散行列は対称・半正定値（最小の固有値 ≥ 0）', C[0][1] === C[1][0] && C[0][2] === C[2][0] && C[1][2] === C[2][1] && e.vals[2] > -1e-9 * tr);
  check('ヤコビ法：C V = V Λ（≤ 1e-9 × トレース）、正規直交', eigResidual(C, e) < 1e-9 * tr && orthoError(e.vecs) < 1e-12);
  check('3 本で復元すると元どおり（誤差 ≈ 0）', r3.err < 1e-12 * tr);
  let okE = true; for (let k = 0; k <= 2; k++) { let r = colorPCA(testPix, k, null); if (!near(r.err, e.vals.slice(k).reduce((s, v) => s + v, 0), 1e-9 * tr)) okE = false; }
  check('k = 0, 1, 2 の復元誤差 Σ‖x − x_hat‖²/(n − 1) = 捨てた固有値の和（0〜255 にそろえる前）', okE);
  let out = new Uint8ClampedArray(CW * CH * 4); colorPCA(testPix, 1, out);
  let P1 = []; for (let i = 0; i < CW * CH; i += 7) P1.push([out[4 * i], out[4 * i + 1], out[4 * i + 2]]);
  let e1 = jacobiEigen(covMatrix(P1));
  check('1 本で復元した色は 1 本の直線の上（λ2/λ1 < 0.01。0〜255 で切った分だけずれる）', e1.vals[1] / e1.vals[0] < 0.01);
  let gray = new Uint8ClampedArray(CW * CH * 4); for (let i = 0; i < CW * CH; i++) { let v = (i * 37) % 256; gray[4 * i] = gray[4 * i + 1] = gray[4 * i + 2] = v; gray[4 * i + 3] = 255; }
  let rg = colorPCA(gray, 1, null);
  check('白黒の画像なら PC1 = 灰色の向き (1, 1, 1)/√3、λ2 = λ3 = 0', angleBetween(rg.e.vecs[0], [1, 1, 1]) < 1e-6 && rg.e.vals[1] < 1e-9 * rg.e.vals[0]);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 1 → 2 → 3 で復元を比べよう。1 本だけでも「白黒」よりきれいに見える？
// 2. 赤い服・青い空など、色の多い場面と、白い壁の前で、PC1 の向きはどう変わる？
// 3. PC1 が灰色の向きから大きくずれるのはどんな映像？
// 4. 2 本だけ使うと、どの色がうまく出ない？（捨てた PC3 の色の帯を見よう）
// 5. PC1 の得点だけを白黒で表示する「自分の映像専用の白黒写真」を作ってみよう

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
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) ? v.every(noNaN) : !(typeof v === 'number' && !isFinite(v)); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length && n > 0 ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function selfTestOk() { return selfTestResults.length > 0 && selfTestResults.every((r) => r.ok); }
function drawSelfTest(x, y) { noStroke(); fill(selfTestOk() ? color(120, 210, 170) : color(255, 90, 90)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
