// ============================================
// 09 自分で描いた文字の主成分 ─ 手書きの文字を 16×16 = 256 次元にして、2 次元の主成分平面に並べる
// 左の枠にマウスで文字を描く → 大きさと位置をそろえて 16×16 のマスに（線からの距離でぼかす）
//   お手本（0・1・2・7 を少しずつゆがめた 40 枚）＋ 自分の文字で PCA。点の数 n < 次元 256 なので
//   グラム行列（n×n）の固有ベクトルから主成分を作る（08 と同じやり方）。似た文字が近くに集まる？
// ドラッグ 描く / スペース 追加 / 0 1 2 7 ラベル / C 描き直す / Z 最後の追加を消す / R お手本を作り直す
// ============================================

const GN = 16, DIMG = GN * GN;          // ★ マスの大きさ（16×16）
const LABELS = [0, 1, 2, 7], LCOL = [[255, 225, 140], [90, 165, 240], [255, 125, 105], [150, 220, 160]];
let samples = [], strokesNow = [], curLabel = 2, seedS = 4, pcaRes = null, muS = null, scores = [];

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); selfTest(); makeSamples(); }
function makeSamples() { seedRng(seedS); samples = []; for (let i = 0; i < 40; i++) { let lab = LABELS[i % 4]; samples.push({ img: rasterStrokes(sampleGlyph(lab), GN), lab, mine: false }); } analyse(); }
// ★ PCA（グラム行列から上位 2 本）と、全部の点の得点
function analyse() {
  let X = samples.map((s) => s.img); muS = colMeans(X);
  pcaRes = X.length >= 3 ? pcaGram(centerCols(X, muS), 2, 300) : null;
  scores = pcaRes ? projectData(X, muS, pcaRes.vecs, 2) : X.map(() => [0, 0]);
}
function padGeo() { let s = Math.min(300, height * 0.4); return { x: 40, y: 120, s }; }
function plotGeo() { return { x: width * 0.42, y: 120, w: Math.min(width * 0.54, height - 200), h: Math.min(width * 0.54, height - 200) }; }
function drawGrid(img, x, y, s, signed) {
  let m = signed ? Math.max(...img.map(Math.abs)) || 1 : 1; noStroke();
  for (let i = 0; i < img.length; i++) { let t = img[i] / m; if (signed) fill(t > 0 ? color(128 + 127 * t, 128 + 70 * t, 128 - 60 * t) : color(128 + 60 * t, 128 - 10 * t, 128 - 127 * t)); else fill(30 + 225 * t); rect(x + (i % GN) * s, y + Math.floor(i / GN) * s, s + 0.4, s + 0.4); }
}

function draw() {
  background(24, 30, 38);
  // ---- 描く枠
  let p = padGeo();
  noFill(); stroke(80, 92, 108); strokeWeight(1); rect(p.x, p.y, p.s, p.s);
  stroke(240); strokeWeight(10); for (let st of strokesNow) { if (st.length === 1) point(st[0][0], st[0][1]); polyline(st); }
  let cur = rasterStrokes(strokesNow, GN), hasCur = strokesNow.some((s) => s.length > 0);
  noStroke(); fill(205, 212, 222); textSize(14); textAlign(LEFT, BASELINE);
  text('ここに描く（ラベル「' + curLabel + '」）', p.x, p.y - 10);
  text('16×16 にすると', p.x, p.y + p.s + 24); drawGrid(cur, p.x, p.y + p.s + 32, 6, false);
  if (pcaRes) {
    fill(205, 212, 222); text('平均', p.x + 116, p.y + p.s + 24); drawGrid(muS, p.x + 116, p.y + p.s + 32, 6, false);
    fill(205, 212, 222); text('PC1（オレンジ = 正、青 = 負）', p.x + 232, p.y + p.s + 24); drawGrid(pcaRes.vecs[0], p.x + 232, p.y + p.s + 32, 6, true);
  }
  // ---- 主成分平面
  let g = plotGeo(), all = scores.flat().map(Math.abs), R = Math.max(1e-9, ...all) * 1.15, P = (s) => [g.x + g.w / 2 + (s[0] / R) * g.w / 2, g.y + g.h / 2 - (s[1] / R) * g.h / 2];
  stroke(60, 72, 88); strokeWeight(1); noFill(); rect(g.x, g.y, g.w, g.h); line(g.x, g.y + g.h / 2, g.x + g.w, g.y + g.h / 2); line(g.x + g.w / 2, g.y, g.x + g.w / 2, g.y + g.h);
  samples.forEach((s, i) => { let q = P(scores[i]), c = LCOL[LABELS.indexOf(s.lab)]; if (s.mine) { stroke(...c); strokeWeight(2); noFill(); circle(q[0], q[1], 16); } noStroke(); fill(...c); textSize(s.mine ? 16 : 13); textAlign(CENTER, CENTER); text(s.lab, q[0], q[1]); });
  let near1 = null;
  if (pcaRes && hasCur) {
    let sc = projectData([cur], muS, pcaRes.vecs, 2)[0], q = P(sc), bd = Infinity;
    samples.forEach((s, i) => { let d2 = (scores[i][0] - sc[0]) ** 2 + (scores[i][1] - sc[1]) ** 2; if (d2 < bd) { bd = d2; near1 = s.lab; } });
    stroke(255); strokeWeight(2); noFill(); circle(q[0], q[1], 26); line(q[0] - 18, q[1], q[0] + 18, q[1]); line(q[0], q[1] - 18, q[0], q[1] + 18);
  }
  // ---- 文字
  textAlign(LEFT, BASELINE); noStroke(); fill(240); textSize(22); text('自分で描いた文字の主成分', 40, 44);
  fill(165, 175, 190); textSize(15); text('ドラッグ 描く　スペース 追加　0 1 2 7 ラベル　C 描き直す　Z 最後の追加を消す　R お手本を作り直す', 40, 72);
  fill(205, 212, 222); textSize(14); text('主成分平面（横 PC1、縦 PC2）。数字 = お手本、○ = 自分の文字、白い十字 = いま描いている文字', g.x, g.y - 10);
  let y = g.y + g.h + 26; fill(220); textSize(15);
  if (pcaRes) text(samples.length + ' 枚、256 次元。λ1 = ' + fmtN(pcaRes.vals[0], 3) + '（' + fmtN((100 * pcaRes.vals[0]) / pcaRes.gramTrace, 1) + '%）　λ2 = ' + fmtN(pcaRes.vals[1], 3) + '（' + fmtN((100 * pcaRes.vals[1]) / pcaRes.gramTrace, 1) + '%）', g.x, y);
  else text('3 枚以上あると PCA できる', g.x, y);
  if (near1 !== null) { fill(255, 225, 140); text('いまの文字に平面上でいちばん近いのは「' + near1 + '」', g.x, y + 24); }
  drawSelfTest(width - 190, height - 14);
}

function inPad(x, y) { let p = padGeo(); return x > p.x && x < p.x + p.s && y > p.y && y < p.y + p.s; }
function mousePressed() { if (inPad(mouseX, mouseY) && strokesNow.length < 20) strokesNow.push([[mouseX, mouseY]]); }
function mouseDragged() { if (inPad(mouseX, mouseY) && strokesNow.length) { let st = strokesNow[strokesNow.length - 1], l = st[st.length - 1]; if (Math.hypot(mouseX - l[0], mouseY - l[1]) > 3 && st.length < 400) st.push([mouseX, mouseY]); } }
function keyPressed() {
  if (key === ' ' && strokesNow.some((s) => s.length > 1)) { samples.push({ img: rasterStrokes(strokesNow, GN), lab: curLabel, mine: true }); strokesNow = []; analyse(); }
  for (let l of LABELS) if (key === String(l)) curLabel = l;
  if (key === 'c' || key === 'C') strokesNow = [];
  if (key === 'z' || key === 'Z') { for (let i = samples.length - 1; i >= 0; i--) if (samples[i].mine) { samples.splice(i, 1); analyse(); break; } }
  if (key === 'r' || key === 'R') { seedS++; let mine = samples.filter((s) => s.mine); makeSamples(); samples = samples.concat(mine); analyse(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(109);
  let S = Array.from({ length: 60 }, (_, i) => ({ img: rasterStrokes(sampleGlyph(LABELS[i % 4]), GN), lab: LABELS[i % 4] })), X = S.map((s) => s.img), mu = colMeans(X), Xc = centerCols(X, mu), n = X.length;
  let r = pcaGram(Xc, 2, 300), Cv = (v) => { let t = Xc.map((row) => dotv(row, v)), out = new Array(DIMG).fill(0); Xc.forEach((row, i) => { for (let j = 0; j < DIMG; j++) out[j] += (t[i] * row[j]) / (n - 1); }); return out; };
  let tr = r.gramTrace;
  check('グラム行列からの主成分は C v = λ v（C を作らずに確かめる、1e-8 × トレース）', r.vecs.every((v, k) => Cv(v).every((x, j) => Math.abs(x - r.vals[k] * v[j]) < 1e-8 * tr)));
  let d = subspaceEigen(Cv, DIMG, 2, 400, 1e-14);
  check('256 次元で直接（部分空間反復法）求めた上位 2 本と一致', d.vals.every((l, k) => near(l, r.vals[k], 1e-8 * tr)) && d.vecs.every((v, k) => angleBetween(v, r.vecs[k]) < 1e-3));
  let st = sampleGlyph(2)[0], a = rasterStrokes([st], GN), b = rasterStrokes([st.map((q) => [3 * q[0] + 50, 3 * q[1] - 7])], GN);
  check('16×16 にするとき、位置と大きさをそろえる（ずらして 3 倍にしても同じマス）', a.every((v, i) => near(v, b[i], 1e-12)));
  check('何も描いていない・点 1 つでも NaN にならない', noNaN(rasterStrokes([], GN)) && noNaN(rasterStrokes([[[5, 5]]], GN)));
  let sc = projectData(X, mu, r.vecs, 2), within = 0, nw = 0, between = 0, nb = 0, okNN = 0;
  for (let i = 0; i < n; i++) { let bd = Infinity, bl = -1; for (let j = 0; j < n; j++) { if (i === j) continue; let dd = Math.hypot(sc[i][0] - sc[j][0], sc[i][1] - sc[j][1]); if (S[i].lab === S[j].lab) { within += dd; nw++; } else { between += dd; nb++; } if (dd < bd) { bd = dd; bl = S[j].lab; } } if (bl === S[i].lab) okNN++; }
  check('主成分平面で同じ文字どうしの平均距離 < 違う文字どうしの平均距離', within / nw < between / nb);
  check('平面上でいちばん近いお手本のラベルが合う割合 ≥ 70%（1 つ抜き）', okNN / n >= 0.7);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 2 を 3 枚描いて追加しよう。お手本の 2 の近くに集まる？
// 2. わざと崩した文字（大きな 0、細い 0）を描くと、平面のどこに来る？
// 3. 平面で 1 と 7 が近いのはなぜ？ PC1・PC2 の画像を見て考えよう
// 4. お手本にない文字（例 4）をラベル 7 として追加すると、主成分はどう変わる？
// 5. 2 次元では分かれない文字も、3 次元目まで使うと分かれる？（pcaGram の 2 を 3 に）

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
// ---- 手書きの線を N×N のマスに（大きさと位置をそろえてから、線からの距離でぼかして塗る）
function rasterStrokes(strokes, N) {
  let pts = strokes.flat(), img = new Array(N * N).fill(0);
  if (pts.length < 1) return img;
  let x0 = Math.min(...pts.map((p) => p[0])), x1 = Math.max(...pts.map((p) => p[0])), y0 = Math.min(...pts.map((p) => p[1])), y1 = Math.max(...pts.map((p) => p[1]));
  let sc = Math.max(x1 - x0, y1 - y0, 1e-9), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  let segs = [];
  for (let st of strokes) {
    let q = st.map((p) => [(p[0] - cx) / sc * 0.8 * (N - 1) + (N - 1) / 2, (p[1] - cy) / sc * 0.8 * (N - 1) + (N - 1) / 2]);
    if (q.length === 1) segs.push([q[0], q[0]]);
    for (let i = 1; i < q.length; i++) segs.push([q[i - 1], q[i]]);
  }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let best = 1e9;
    for (let [a, b] of segs) {
      let dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy, t = L2 > 0 ? clampv(((x - a[0]) * dx + (y - a[1]) * dy) / L2, 0, 1) : 0;
      best = Math.min(best, Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy));
    }
    img[x + N * y] = clampv(1.6 - best, 0, 1);
  }
  return img;
}
// お手本の文字（0・1・2・7）を少しずつゆがめて作る。座標は 0〜1
function sampleGlyph(kind) {
  let j = () => (rnd() - 0.5) * 0.08, sl = (rnd() - 0.5) * 0.3, out = [];
  let P = (x, y) => [x + sl * (0.5 - y) + j() * 0.3, y + j() * 0.3];
  if (kind === 0) { let a = rndRange(0.22, 0.32), b = rndRange(0.36, 0.44); for (let i = 0; i <= 24; i++) { let t = (2 * Math.PI * i) / 24; out.push(P(0.5 + a * Math.sin(t), 0.5 - b * Math.cos(t))); } return [out]; }
  if (kind === 1) { let f = rnd() < 0.6; return [[...(f ? [P(0.38, 0.25)] : []), P(0.5, 0.1), P(0.5, 0.5), P(0.5, 0.9)]]; }
  if (kind === 2) { for (let i = 0; i <= 10; i++) { let t = Math.PI * (1.1 - 1.25 * i / 10); out.push(P(0.5 + 0.28 * Math.cos(t), 0.33 - 0.22 * Math.sin(t))); } out.push(P(0.25, 0.88)); out.push(P(0.78 + j(), 0.88)); return [out]; }
  return [[P(0.22, 0.12), P(0.78, 0.12), P(0.45 + j(), 0.9)]];
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
