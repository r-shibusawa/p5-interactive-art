// ============================================
// 14 音色の主成分 ─ 倍音 12 個の強さで表した音色を PCA して、2 次元の「音色マップ」を作る
// 音色 = 基本の高さ f の 1〜12 倍の音（倍音）をどれだけ混ぜるか。のこぎり波・矩形波・三角波・フルート風・金管風の
//   5 つの「家族」を少しずつ変えた 150 個の音色（合成）→ 12 次元の点。ヤコビ法で PCA して、PC1・PC2 の平面に並べる
//   マップの上をマウスで押すと、その位置を逆に写した倍音 μ + s1 v1 + s2 v2（負は 0 にする）で音が鳴る
// 音量は小さめから（全体の音量 MASTER は 0.2 以下）。ヘッドホンは特に注意
// マップを押す・なぞる 音を鳴らす / スペース 鳴らしっぱなし ON/OFF / ↑↓ 音の高さ / R 新しい音色
// ============================================

const NH = 12, NT = 150;               // ★ 倍音の数、音色の数
const FAMS = ['のこぎり', '矩形', '三角', 'フルート風', '金管風'], FCOL = [[255, 225, 140], [90, 165, 240], [150, 220, 160], [220, 170, 255], [255, 125, 105]];
let timbres = [], fams = [], muT = null, eg = null, scores = [], seedT = 14, holdOn = false, f0 = 220, cur = [0, 0], curAmps = null;   // ★ f0 = 基本の高さ（Hz）

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); selfTest(); rebuild(); }
// ★ 家族ごとの倍音の形（k = 1〜12）に、傾きと山の位置のばらつきを足す。最大を 1 にそろえる
function makeTimbre(fam) {
  let tilt = rndRange(0.8, 1.2), pk = rndRange(4.6, 5.4), out = [];
  for (let k = 1; k <= NH; k++) {
    let a = fam === 0 ? 1 / Math.pow(k, tilt) : fam === 1 ? (k % 2 ? 1 / Math.pow(k, tilt) : 0.02) : fam === 2 ? (k % 2 ? 1 / Math.pow(k, 2 * tilt) : 0.01) : fam === 3 ? (k === 1 ? 1 : 0.35 * Math.exp(-(k - 2) * tilt)) : Math.exp(-((k - pk) ** 2) / 4) + 0.2 / k;
    out.push(Math.max(0, a * (1 + 0.08 * gaussRnd())));
  }
  let m = Math.max(...out, 1e-9); return out.map((a) => a / m);
}
function rebuild() {
  seedRng(seedT); fams = Array.from({ length: NT }, (_, i) => i % 5); timbres = fams.map(makeTimbre);
  muT = colMeans(timbres); eg = jacobiEigen(covMatrix(timbres)); scores = projectData(timbres, muT, eg.vecs, 2); curAmps = muT.slice();
}
// ★ マップの位置 (s1, s2) → 倍音（逆射影）。負の強さは 0 に
function backProject(s) { return reconstructRow(s, muT, eg.vecs).map((a) => Math.max(0, a)); }
function mapGeo() { let s = Math.min(width * 0.45, height - 220); return { x: 40, y: 120, s }; }
function mapRange() { return Math.max(...scores.flat().map(Math.abs), 1e-9) * 1.15; }
function toMap(sc) { let g = mapGeo(), R = mapRange(); return [g.x + g.s / 2 + (sc[0] / R) * g.s / 2, g.y + g.s / 2 - (sc[1] / R) * g.s / 2]; }
function fromMap(x, y) { let g = mapGeo(), R = mapRange(); return [((x - g.x - g.s / 2) / (g.s / 2)) * R, (-(y - g.y - g.s / 2) / (g.s / 2)) * R]; }

function draw() {
  background(24, 30, 38);
  let g = mapGeo(), inMap = mouseX > g.x && mouseX < g.x + g.s && mouseY > g.y && mouseY < g.y + g.s;
  if (mouseIsPressed && inMap) cur = fromMap(mouseX, mouseY);
  curAmps = backProject(cur);
  setPartials(curAmps, f0, holdOn || (mouseIsPressed && inMap));
  // ---- 音色マップ
  stroke(60, 72, 88); strokeWeight(1); noFill(); rect(g.x, g.y, g.s, g.s); line(g.x, g.y + g.s / 2, g.x + g.s, g.y + g.s / 2); line(g.x + g.s / 2, g.y, g.x + g.s / 2, g.y + g.s);
  noStroke(); scores.forEach((s, i) => { let q = toMap(s); fill(...FCOL[fams[i]], 200); circle(q[0], q[1], 8); });
  let q = toMap(cur); stroke(255); strokeWeight(2); noFill(); circle(q[0], q[1], 24); line(q[0] - 16, q[1], q[0] + 16, q[1]); line(q[0], q[1] - 16, q[0], q[1] + 16);
  FAMS.forEach((f, k) => { noStroke(); fill(...FCOL[k]); textSize(14); textAlign(LEFT, BASELINE); text('● ' + f, g.x + k * 96, g.y + g.s + 24); });
  // ---- いまの倍音（棒）と波形
  let bx = g.x + g.s + 50, bw = width - bx - 40, bh = 150, by = 140;
  noStroke(); fill(205, 212, 222); textSize(14); text('いまの倍音の強さ（1〜12 倍音）', bx, by - 10);
  curAmps.forEach((a, k) => { fill(255, 225, 140); let h = clampv(a, 0, 1.2) * bh / 1.2; rect(bx + (k * bw) / NH + 3, by + bh - h, bw / NH - 6, h); fill(170); textSize(11); textAlign(CENTER, TOP); text(k + 1, bx + ((k + 0.5) * bw) / NH, by + bh + 4); });
  let wy = by + bh + 60, tot = curAmps.reduce((s, a) => s + a, 0) || 1;
  textAlign(LEFT, BASELINE); fill(205, 212, 222); textSize(14); text('波形（2 周期）', bx, wy - 10);
  stroke(90, 165, 240); strokeWeight(2); polyline(Array.from({ length: 300 }, (_, i) => { let t = (i / 299) * 4 * Math.PI, v = curAmps.reduce((s, a, k) => s + a * Math.sin((k + 1) * t), 0) / tot; return [bx + (i / 299) * bw, wy + 60 - v * 55]; }));
  // ---- 主成分の形
  let py = wy + 145; noStroke(); fill(205, 212, 222); textSize(14); text('主成分 v1（黄）・v2（青）：倍音の強さの「変え方」', bx, py - 10);
  stroke(70, 82, 98); strokeWeight(1); line(bx, py + 50, bx + bw, py + 50);
  [[0, [255, 225, 140]], [1, [90, 165, 240]]].forEach(([k, c]) => { stroke(...c); strokeWeight(2.5); polyline(eg.vecs[k].map((v, j) => [bx + ((j + 0.5) * bw) / NH, py + 50 - v * 70])); });
  let tr = eg.vals.reduce((s, v) => s + v, 0), y = py + 128; noStroke(); fill(220); textSize(15);
  text('寄与率 PC1 ' + fmtN((100 * eg.vals[0]) / tr, 1) + '%、PC2 ' + fmtN((100 * eg.vals[1]) / tr, 1) + '%（2 本で ' + fmtN((100 * (eg.vals[0] + eg.vals[1])) / tr, 1) + '%）', bx, y);
  text('マップの位置 (s1, s2) = ' + fmtVec(cur, 2) + '　→ 倍音 = μ + s1 v1 + s2 v2', bx, y + 24);
  fill(240); textSize(22); text('音色の主成分', 40, 44);
  fill(165, 175, 190); textSize(15); text('マップを押す・なぞる 音を鳴らす　スペース 鳴らしっぱなし（' + (holdOn ? 'ON' : 'OFF') + '）　↑↓ 高さ（' + Math.round(f0) + ' Hz）　R 新しい音色　🔊 音量は小さめから', 40, 72);
  drawSelfTest(width - 190, height - 14);
}

function mousePressed() { startAudio(); }
function keyPressed() {
  startAudio();
  if (key === ' ') holdOn = !holdOn;
  if (key === UP_ARROW || key === DOWN_ARROW) f0 = clampv(f0 * (key === UP_ARROW ? Math.pow(2, 1 / 12) : Math.pow(2, -1 / 12)), 110, 880);
  if (key === 'r' || key === 'R') { seedT++; rebuild(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(14); let F = Array.from({ length: NT }, (_, i) => i % 5), X = F.map(makeTimbre), mu = colMeans(X), C = covMatrix(X), e = jacobiEigen(C), tr = traceOf(C);
  check('12×12 のヤコビ法：C V = V Λ、正規直交、固有値の和 = トレース', eigResidual(C, e) < 1e-9 * tr && orthoError(e.vecs) < 1e-12 && near(e.vals.reduce((s, v) => s + v, 0), tr, 1e-12 * tr));
  check('12 本全部で逆に写すと元の音色にもどる（1e-12）', X.slice(0, 10).every((x) => reconstructRow(projectData([x], mu, e.vecs, NH)[0], mu, e.vecs).every((v, j) => near(v, x[j], 1e-12))));
  let okRT = true; seedRng(5); for (let t = 0; t < 30; t++) { let s = [rndRange(-1, 1), rndRange(-1, 1)], x = reconstructRow(s, mu, e.vecs), s2 = projectData([x], mu, e.vecs, 2)[0]; if (!near(s2[0], s[0], 1e-12) || !near(s2[1], s[1], 1e-12)) okRT = false; }
  check('マップの位置 → 倍音 → 射影 で同じ位置にもどる（負を 0 にする前）', okRT);
  let sc = projectData(X, mu, e.vecs, 2), cent = [0, 1, 2, 3, 4].map((f) => { let m = sc.filter((_, i) => F[i] === f); return [m.reduce((s, v) => s + v[0], 0) / m.length, m.reduce((s, v) => s + v[1], 0) / m.length]; });
  let hit = sc.filter((s, i) => { let best = 0; cent.forEach((c, k) => { if (Math.hypot(s[0] - c[0], s[1] - c[1]) < Math.hypot(s[0] - cent[best][0], s[1] - cent[best][1])) best = k; }); return best === F[i]; }).length;
  check('2 次元のマップで、いちばん近い家族の中心が正しい割合 ≥ 80%', hit / NT >= 0.8);
  check('マップのどこを押しても倍音は 0 以上・NaN なし', [[-9, -9], [9, 9], [0, 0], [3, -7]].every((s) => { let a = reconstructRow(s, mu, e.vecs).map((v) => Math.max(0, v)); return noNaN(a) && a.every((v) => v >= 0); }));
  check('音量の上限：全体 MASTER ≤ 0.2', MASTER <= 0.2);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. マップの上を、のこぎり → 矩形 → 三角 となぞって、音色の変わり方を聞こう
// 2. 家族と家族の「あいだ」は、どんな音？ どこにも家族がいない所は？
// 3. 下の v1・v2 の折れ線を見て、PC1 が「何を変える向き」か言葉にしよう（高い倍音の量？ 偶数倍音？）
// 4. makeTimbre に新しい家族（例：偶数倍音だけ）を足して R。マップはどう変わる？
// 5. 倍音の強さを log（デシベル）にしてから PCA すると、マップは変わる？

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
// ---- 音の道具（Web Audio）。音量の上限：全体の音量 MASTER は 0.2 以下
const MASTER = 0.1;                    // ★ 全体の音量（0.2 以下にしておく）
let audioCtx = null, masterOut = null, partials = [];
function startAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    masterOut = audioCtx.createGain(); masterOut.gain.value = Math.min(0.2, MASTER); masterOut.connect(audioCtx.destination);
  }
  audioCtx.resume();
}
// 倍音 k = 1〜12 の強さ amps で音を鳴らし続ける（f0 = 基本の高さ）。on = false で消す
function setPartials(amps, f0, on) {
  if (!audioCtx) return;
  let now = audioCtx.currentTime, tot = amps.reduce((s, a) => s + Math.max(0, a), 0) || 1;
  amps.forEach((a, k) => {
    if (!partials[k]) { let o = audioCtx.createOscillator(), g = audioCtx.createGain(); g.gain.value = 0; o.connect(g); g.connect(masterOut); o.start(); partials[k] = { o, g }; }
    let f = f0 * (k + 1);
    partials[k].o.frequency.setTargetAtTime(Math.min(f, 18000), now, 0.02);
    partials[k].g.gain.setTargetAtTime(on && f < 18000 ? (0.8 * Math.max(0, a)) / tot : 0, now, 0.04);
  });
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
