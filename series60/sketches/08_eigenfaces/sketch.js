// ============================================
// 08 固有画像（固有顔）─ 24×24 = 576 次元の「顔」200 枚を PCA して、顔の「変わり方」を取り出す
// 顔はパラメータ（顔の幅・目の間隔・目の高さ・目の大きさ・口の曲がり・口の幅・明るさ・光の向き）を乱数で選んで描いた合成画像
//   576 次元の共分散行列（576×576）は大きすぎるので、グラム行列 G = Xc Xcᵀ/(n − 1)（200×200）の固有ベクトル u を
//   部分空間反復法（べき乗法を 12 本まとめて）で求め、主成分 v = Xcᵀ u / ‖Xcᵀ u‖ にする（G と C の 0 でない固有値は同じ）
//   新しい顔 = 平均顔 + Σ c_k √λ_k v_k。各主成分が「どのパラメータと一番相関するか」を数で表示
// 1〜5 主成分をえらぶ / ↑↓ その係数 c（σ 単位）/ ドラッグ スライダー / 0 係数を 0 に / R 新しい 200 人
// ============================================

const NFACE = 200, KPC = 12;           // ★ 顔の数、求める主成分の数
const PNAMES = { faceW: '顔の幅', eyeDist: '目の間隔', eyeY: '目の高さ', eyeSize: '目の大きさ', mouthCurve: '口の曲がり', mouthW: '口の幅', bright: '明るさ', light: '光の向き' };
let seedF = 8, faces = [], params = [], muF = null, pc = null, coef = [0, 0, 0, 0, 0], selK = 0, dragK = -1, meaning = [];

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); selfTest(); rebuild(); }
function buildFaces(seed) { seedRng(seed); let P = Array.from({ length: NFACE }, () => randomFaceParams()); return { P, F: P.map(makeFace) }; }
// ★ PCA（グラム行列のやり方）と、各主成分の意味（いちばん相関の強いパラメータ）
function analyse(P, F) {
  let mu = colMeans(F), Xc = centerCols(F, mu), r = pcaGram(Xc, KPC, 150), sc = projectData(F, mu, r.vecs, 6);
  let mean = sc[0].map((_, k) => { let best = Object.keys(PNAMES).map((p) => [p, corrOf(sc.map((s) => s[k]), P.map((q) => q[p]))]).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])); return best[0]; });
  return { mu, Xc, r, sc, mean };
}
function rebuild() { let b = buildFaces(seedF); params = b.P; faces = b.F; let a = analyse(params, faces); muF = a.mu; pc = a.r; meaning = a.mean; drawStatic(); }
function synth() { let x = muF.slice(); coef.forEach((c, k) => { let s = c * Math.sqrt(pc.vals[k]); for (let j = 0; j < x.length; j++) x[j] += s * pc.vecs[k][j]; }); return x; }
// 画像を描く（cv = 描く先。固有顔などは 1 度だけバッファに描いておき、毎フレームはそれを貼るだけ）
function drawImg(cv, v, x, y, s, signed) {
  let m = signed ? Math.max(...v.map(Math.abs)) || 1 : 1; cv.noStroke();
  for (let i = 0; i < v.length; i++) { let t = v[i] / m; if (signed) cv.fill(t > 0 ? 128 + 127 * t : 128 + 60 * t, t > 0 ? 128 + 70 * t : 128 - 10 * t, t > 0 ? 128 - 60 * t : 128 - 127 * t); else cv.fill(clampv(255 * v[i], 0, 255)); cv.rect(x + (i % FACE_N) * s, y + Math.floor(i / FACE_N) * s, s + 0.5, s + 0.5); }
}
let staticG = null;
function drawStatic() {
  if (!staticG || staticG.width !== width || staticG.height !== height) staticG = createGraphics(width, height);
  let h = staticG; h.clear(); h.textAlign(LEFT, BASELINE);
  let ey = 460, es = 3.6, step = FACE_N * es + 14;
  h.noStroke(); h.fill(205, 212, 222); h.textSize(14); h.text('平均顔', 40, ey - 8); drawImg(h, muF, 40, ey, es, false);
  h.fill(205, 212, 222); h.text('固有顔 v1〜v10（オレンジ = 正、青 = 負）と寄与率', 40 + step, ey - 8);
  for (let k = 0; k < 10; k++) { let x = 40 + step * (1 + (k % 5)), y = ey + Math.floor(k / 5) * (step + 14); drawImg(h, pc.vecs[k], x, y, es, true); h.fill(170); h.textSize(12); h.text('v' + (k + 1) + ' ' + fmtN((100 * pc.vals[k]) / pc.gramTrace, 1) + '%', x, y + FACE_N * es + 13); }
  let gx = width * 0.66, gs = 2.6, gstep = FACE_N * gs + 8;
  h.fill(205, 212, 222); h.textSize(14); h.text('もとの顔（パラメータで描いた合成画像）', gx, 120);
  for (let i = 0; i < 20; i++) drawImg(h, faces[i], gx + (i % 5) * gstep, 130 + Math.floor(i / 5) * gstep, gs, false);
}
function sliderGeo(k) { return { x: 40 + 300 + 40, y: 150 + k * 52, w: Math.min(330, width * 0.26) }; }

function draw() {
  background(24, 30, 38);
  // ---- 合成した顔（大）と平均顔
  textAlign(LEFT, BASELINE); noStroke(); fill(205, 212, 222); textSize(15); text('合成した顔 = 平均 + Σ c_k √λ_k v_k', 40, 120);
  if (!staticG || staticG.width !== width) drawStatic();
  image(staticG, 0, 0);
  drawImg(window, synth(), 40, 130, 12.5, false);
  // ---- スライダー
  for (let k = 0; k < 5; k++) {
    let g = sliderGeo(k), px = g.x + ((coef[k] + 3) / 6) * g.w;
    stroke(k === selK ? color(255, 225, 140) : color(80, 92, 108)); strokeWeight(3); line(g.x, g.y, g.x + g.w, g.y);
    noStroke(); fill(k === selK ? color(255, 225, 140) : 220); circle(px, g.y, 16);
    textSize(14); textAlign(LEFT, BASELINE); fill(220); text('PC' + (k + 1) + '　c = ' + fmtN(coef[k], 1) + '　' + (meaning[k] ? '≈ ' + PNAMES[meaning[k][0]] + '（相関 ' + fmtN(meaning[k][1], 2) + '）' : ''), g.x, g.y - 12);
  }
  // ---- 右：数字
  let gx = width * 0.66, gstep = FACE_N * 2.6 + 8, y = 130 + 4 * gstep + 30, cum = pc.vals.slice(0, 5).reduce((a, b) => a + b, 0) / pc.gramTrace;
  fill(220); textSize(15);
  text('576 次元、' + NFACE + ' 枚。全分散（トレース）= ' + fmtN(pc.gramTrace, 3), gx, y);
  text('λ1〜λ5 = ' + pc.vals.slice(0, 5).map((v) => fmtN(v, 3)).join(', '), gx, y + 24);
  text('5 本で累積寄与率 ' + fmtN(100 * cum, 1) + '%（576 個の数 → 5 個の係数）', gx, y + 48);
  fill(165, 175, 190); textSize(14); text('顔は 8 つのパラメータで作ったので、上位の主成分はほぼそれらに対応する（ただし 1 対 1 とは限らない：明るさと顔の幅は同じ「明るい面積」を変えるので混ざる）', gx, y + 80, width - gx - 30);
  noStroke(); fill(240); textSize(22); text('固有画像（固有顔）', 40, 44);
  fill(165, 175, 190); textSize(15); text('1〜5 主成分をえらぶ　↑↓ 係数　ドラッグ スライダー　0 全部 0 に　R 新しい 200 人', 40, 72);
  drawSelfTest(width - 190, height - 14);
}

function mousePressed() { dragK = -1; for (let k = 0; k < 5; k++) { let g = sliderGeo(k); if (mouseX > g.x - 10 && mouseX < g.x + g.w + 10 && Math.abs(mouseY - g.y) < 14) { dragK = k; selK = k; mouseDragged(); } } }
function mouseDragged() { if (dragK < 0) return; let g = sliderGeo(dragK); coef[dragK] = clampv(((mouseX - g.x) / g.w) * 6 - 3, -3, 3); }
function mouseReleased() { dragK = -1; }
function keyPressed() {
  for (let k = 1; k <= 5; k++) if (key === String(k)) selK = k - 1;
  if (key === UP_ARROW || key === DOWN_ARROW) coef[selK] = clampv(coef[selK] + (key === UP_ARROW ? 0.5 : -0.5), -3, 3);
  if (key === '0') coef = [0, 0, 0, 0, 0];
  if (key === 'r' || key === 'R') { seedF++; coef = [0, 0, 0, 0, 0]; rebuild(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let b = buildFaces(8), a = analyse(b.P, b.F), n = NFACE, Cv = (v) => { let t = a.Xc.map((r) => dotv(r, v)), out = new Array(v.length).fill(0); a.Xc.forEach((r, i) => { for (let j = 0; j < r.length; j++) out[j] += (t[i] * r[j]) / (n - 1); }); return out; };
  let tr = a.r.gramTrace, trC = a.Xc.reduce((s, r) => s + dotv(r, r), 0) / (n - 1);
  check('グラム行列のトレース = 共分散行列のトレース（全分散）', near(tr, trC, 1e-12 * trC));
  check('12 本の主成分は正規直交（1e-9）', orthoError(a.r.vecs) < 1e-9);
  check('C v = λ v（C は作らずに Xcᵀ(Xc v)/(n − 1) で確かめる。ずれ ≤ 1e-8 × トレース）', a.r.vecs.every((v, k) => { let w = Cv(v); return w.every((x, j) => Math.abs(x - a.r.vals[k] * v[j]) < 1e-8 * tr); }));
  seedRng(3); let v = unitv(b.F[0].map(() => gaussRnd())); for (let it = 0; it < 300; it++) v = unitv(Cv(v));
  check('576 次元で直接べき乗法（300 回）の λ1 と一致（1e-8）、向きも同じ', near(dotv(v, Cv(v)), a.r.vals[0], 1e-8 * tr) && angleBetween(v, a.r.vecs[0]) < 1e-3);
  let E = b.F.reduce((s, r, i) => { let xh = reconstructRow(projectData([r], a.mu, a.r.vecs, KPC)[0], a.mu, a.r.vecs); return s + r.reduce((q, x, j) => q + (x - xh[j]) ** 2, 0); }, 0) / (n - 1);
  check('12 本で復元した誤差 Σ‖x − x_hat‖²/(n − 1) = トレース − (λ1 + … + λ12)', near(E, tr - a.r.vals.reduce((s, l) => s + l, 0), 1e-9 * tr));
  check('上位 6 本の主成分は、それぞれどれかのパラメータと |相関| ≥ 0.6', a.mean.every((m) => Math.abs(m[1]) >= 0.6));
  check('「口の曲がり」と強く相関する（≥ 0.7）主成分が上位 6 本の中にある', a.mean.some((m) => m[0] === 'mouthCurve' && Math.abs(m[1]) >= 0.7));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. PC1〜PC5 の係数を 1 つずつ ±3 まで動かし、顔の何が変わるか言葉にしよう（表示の「≈」と合っている？）
// 2. 全部の係数を ±3 にすると、ありえない顔になる？ それはなぜ？
// 3. randomFaceParams の範囲を変えて（例：口の曲がりを 0 に固定）R を押すと、固有顔はどう変わる？
// 4. 寄与率を見て、何本あれば「だいたいの顔」が作れるか考えよう（07 の復元）
// 5. 本物の顔写真の固有顔は、位置合わせや明るさの影響を強く受ける。この合成データで「光の向き」の主成分を探そう

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
// ---- パラメータで描く 24×24 の「顔」（0〜1 の明るさ、ぼかした縁）。実在のデータではなく合成
const FACE_N = 24;
function soft(dd, w) { return clampv(0.5 - dd / w, 0, 1); }            // 縁をなめらかに（dd < 0 が内側）
function makeFace(p) {
  let img = new Array(FACE_N * FACE_N).fill(0), c = (FACE_N - 1) / 2;
  for (let y = 0; y < FACE_N; y++) for (let x = 0; x < FACE_N; x++) {
    let u = (x - c) / c, v = (y - c) / c;                              // −1〜1
    let fr = Math.hypot(u / p.faceW, v / 0.9) - 1, inFace = soft(fr * 6, 1);
    let shade = p.bright * (1 + 0.35 * p.light * u);                  // 光の向き（左右の明るさの差）
    let val = 0.12 + inFace * (shade - 0.12);
    for (let s of [-1, 1]) {                                          // 目
      let ex = u - s * p.eyeDist, ey = v - p.eyeY, er = Math.hypot(ex / 1.3, ey) - p.eyeSize;
      val -= inFace * soft(er * 14, 1) * shade * 0.85;
    }
    let mx = u / p.mouthW, my = v - (0.45 + p.mouthCurve * (0.2 - 0.2 * mx * mx));   // 口：放物線（mouthCurve > 0 で笑顔）
    if (Math.abs(mx) < 1) val -= inFace * soft((Math.abs(my) - 0.045) * 18, 1) * shade * 0.7;
    img[x + FACE_N * y] = clampv(val, 0, 1);
  }
  return img;
}
function randomFaceParams() {
  return { faceW: rndRange(0.62, 0.86), eyeDist: rndRange(0.25, 0.42), eyeY: rndRange(-0.32, -0.12), eyeSize: rndRange(0.08, 0.15),
    mouthCurve: rndRange(-1, 1), mouthW: rndRange(0.25, 0.45), bright: rndRange(0.55, 0.95), light: rndRange(-1, 1) };
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
