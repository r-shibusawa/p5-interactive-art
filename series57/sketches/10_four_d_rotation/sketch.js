// ============================================
// 10 4 次元の回転 ─ x ↦ p x q（左右 2 つの単位四元数）
// 4 次元の点 x = (w, x, y, z) を四元数とみなすと、4 次元の回転はすべて x ↦ p x q（|p| = |q| = 1）で書ける
// テッセラクト（4 次元立方体）を回して、w 方向から 3 次元に透視投影する。H でホップ・ファイブレーションの円
// 1：左だけ（等傾回転）/ 2：右だけ / 3：単純な回転（1 つの平面だけ回る）/ 4：2 重回転 / H：テッセラクト ⇔ ホップの円 / スペース：停止 / ↑↓ 速さ
// ============================================

let rotMode = 1, hopfMode = false, paused = false, tAng = 0, speed = 0.01;
const AX_L = v3Unit([1, 0, 0]), AX_R = v3Unit([0, 1, 0]);   // ★ 左と右の回転の向き（純四元数）
const EYE_W = 3;                       // ★ 4 次元の目の位置（w = 3 から見る）
const VIEW = qMul(qAxisAngle([1, 0, 0], 0.4), qAxisAngle([0, 1, 0], -0.5));
let verts = [], edges = [], sc;

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL); hudMake(); selfTest();
  for (let n = 0; n < 16; n++) verts.push([0, 1, 2, 3].map((b) => ((n >> b) & 1 ? 1 : -1)));
  for (let a = 0; a < 16; a++) for (let b = 0; b < 4; b++) if (!((a >> b) & 1)) edges.push([a, a | (1 << b)]);
}
function pair(md, t) {                 // モードごとの左右の単位四元数 [p, q]
  let eL = (v, a) => qExp([0, v[0] * a, v[1] * a, v[2] * a]);
  if (md === 1) return [eL(AX_L, t), [1, 0, 0, 0]];
  if (md === 2) return [[1, 0, 0, 0], eL(AX_R, t)];
  if (md === 3) return [eL(AX_L, t / 2), eL(AX_L, t / 2)];       // (1, i) の平面だけ t 回る、(j, k) の平面は止まる
  return [eL(AX_L, t), eL(AX_R, 0.6 * t)];
}
function rot4(pr, x) { return qMul(qMul(pr[0], x), pr[1]); }
function mat4(pr) { return [0, 1, 2, 3].map((c) => rot4(pr, [0, 1, 2, 3].map((r) => (r === c ? 1 : 0)))); }   // 列 = 基底の行き先
function det4(cols) {                  // 4 × 4 の行列式（ガウスの消去法）
  let A = cols.map((c) => c.slice()), d = 1;
  for (let c = 0; c < 4; c++) {
    let piv = c; for (let r = c + 1; r < 4; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
    if (Math.abs(A[piv][c]) < 1e-300) return 0;
    if (piv !== c) { [A[piv], A[c]] = [A[c], A[piv]]; d = -d; }
    d *= A[c][c];
    for (let r = c + 1; r < 4; r++) { let f = A[r][c] / A[c][c]; for (let t = c; t < 4; t++) A[r][t] -= f * A[c][t]; }
  }
  return d;
}
function persp(x) { let f = 2 / Math.max(0.3, EYE_W - x[0]); return qRot(VIEW, [x[1] * f, x[2] * f, x[3] * f]); }        // w 方向からの透視投影
function stereo(x) { let f = 1 / Math.max(0.03, 1 - x[0]); return qRot(VIEW, [x[1] * f, x[2] * f, x[3] * f]); }           // S³ → 3D（w = 1 から）
function hopfPoint(q) { return qRot(q, [1, 0, 0]); }   // ホップ写像 q ↦ q i q*（S³ → S²）
function fiberBase(theta, phi) {       // S² の点（i から角 theta）に写る S³ の点を 1 つ
  let axis = v3Unit(v3Cross([1, 0, 0], [Math.cos(theta), Math.sin(theta) * Math.cos(phi), Math.sin(theta) * Math.sin(phi)]));
  return v3Len(axis) > 0 ? qAxisAngle(axis, theta) : [1, 0, 0, 0];
}

function draw() {
  background(12, 14, 30);
  sc = Math.min(width, height) * 0.2;
  if (!paused) tAng += speed;
  let pr = pair(rotMode, tAng);
  if (!hopfMode) {
    let P = verts.map((v) => rot4(pr, v));
    for (let [a, b] of edges) {
      let wm = (P[a][0] + P[b][0]) / 2;                         // 色 = w 座標（手前の w ほど金色）
      stroke(150 + 100 * (wm + 1.5) / 3, 160 + 40 * (wm + 1.5) / 3, 255 - 140 * (wm + 1.5) / 3); strokeWeight(2.5);
      glLine(persp(P[a]), persp(P[b]), sc);
    }
    noStroke(); fill(255);
    for (let x of P) { let s = persp(x); push(); translate(s[0] * sc, -s[1] * sc, s[2] * sc); sphere(4, 6, 4); pop(); }
  } else {
    // ホップの円：S² の同じ点に写る S³ の点の集まり（q e^{iφ}）。どの 2 つの円も 1 回ずつからみ合う
    for (let ring = 0; ring < 3; ring++) for (let m = 0; m < 8; m++) {
      let th = 1.4 + ring * 0.55, ph = (m / 8) * 2 * Math.PI, base = rot4([pr[0], [1, 0, 0, 0]], fiberBase(th, ph));   // 左から掛けるだけなら円は円のまま、極も通らない
      stroke(...hsvRgb(m / 8, 0.45 + 0.2 * ring)); strokeWeight(2); noFill();
      beginShape();
      for (let s = 0; s <= 48; s++) { let x = qMul(base, qAxisAngle([1, 0, 0], (s / 48) * 4 * Math.PI)); glV(stereo(x), sc * 0.6); }
      endShape();
    }
  }
  if (frameCount % 2 === 1) drawHud(pr);
  hudShow();
}
function hsvRgb(h, s) { let f = (n) => { let k = (n + h * 6) % 6; return 255 * (1 - s * Math.max(0, Math.min(k, 4 - k, 1))); }; return [f(5), f(3), f(1)]; }

function drawHud(pr) {
  let g = hud; g.clear(); g.noStroke(); g.textAlign(LEFT, BASELINE);
  let names = ['', '左だけ x ↦ p x（等傾回転）', '右だけ x ↦ x q（等傾回転、反対の向き）', '単純な回転 x ↦ p x p（1 つの平面だけ回る）', '2 重回転 x ↦ p x q（2 つの平面が別の速さ）'];
  g.fill(240); g.textSize(20); g.text('4 次元の回転　' + names[rotMode] + (hopfMode ? '　／ ホップの円' : '　／ テッセラクト'), 20, 34);
  g.fill(175); g.textSize(15);
  g.text('1 左だけ　2 右だけ　3 単純な回転　4 2 重回転　H：テッセラクト ⇔ ホップの円　スペース：停止　↑↓ 速さ', 20, 60);
  g.text(hopfMode ? '同じ色の円 = S² の近い点に写る円（S³ を w = 1 から立体射影）。どの 2 つの円も 1 回からみ合う。ここでは左の p だけで回す' : '辺の色 = w 座標（金 = 目に近い w）。4 次元の目（w = 3）からの透視投影なので、内側の立方体 = 遠い側の立方体', 20, 84);
  let M = mat4(pr), x = 20, y = 140;
  g.fill(255, 210, 110); g.textSize(16); g.text('p = ' + qStr(pr[0], 3) + '　q = ' + qStr(pr[1], 3), x, y);
  g.fill(220); g.textSize(14); g.text('4 × 4 の回転行列（x ↦ p x q）', x, y + 30);
  for (let r = 0; r < 4; r++) g.text(M.map((c) => (c[r] >= 0 ? ' ' : '') + c[r].toFixed(3)).join('   '), x + 10, y + 52 + r * 19);
  g.text('det = ' + det4(M).toFixed(6), x, y + 136);
  // 点 x と、回した点の間の角（等傾なら全部同じ）
  let samples = [[1, 0, 0, 0], [0, 0, 1, 0], [0.5, 0.5, 0.5, 0.5], qUnit([1, 2, -1, 0.5])];
  g.text('いくつかの点 x と回した点の間の角：', x, y + 170);
  g.text(samples.map((s) => ((Math.acos(clampv(qDot(s, rot4(pr, s)), -1, 1)) * 180) / Math.PI).toFixed(1) + '°').join('　'), x + 10, y + 192);
  g.fill(170);
  g.text(rotMode <= 2 ? '→ どの点も同じ角だけ回る（等傾回転：3 次元にはない回転）' : rotMode === 3 ? '→ 止まっている点がある（j, k の平面）' : '→ 点によって角がちがう', x, y + 214);
  drawSelfTest(width - 170, height - 12, g);
}

function keyPressed() {
  if (key >= '1' && key <= '4') rotMode = +key;
  if (key === 'h' || key === 'H') hopfMode = !hopfMode;
  if (key === ' ') paused = !paused;
  if (key === UP_ARROW) speed = Math.min(0.05, speed + 0.005);
  if (key === DOWN_ARROW) speed = Math.max(0, speed - 0.005);
  if (key === 'r' || key === 'R') { tAng = 0; rotMode = 1; }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = []; seedRng(10);
  let e1 = 0, e2 = 0, e3 = 0, e4 = 0;
  for (let t = 0; t < 100; t++) {
    let pr = [qRandom(), qRandom()], pr2 = [qRandom(), qRandom()], x = [rndNormal(), rndNormal(), rndNormal(), rndNormal()], M = mat4(pr);
    e1 = Math.max(e1, Math.abs(qNorm(rot4(pr, x)) - qNorm(x)));
    for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) e2 = Math.max(e2, Math.abs(qDot(M[a], M[b]) - (a === b ? 1 : 0)));
    e2 = Math.max(e2, Math.abs(det4(M) - 1));
    e3 = Math.max(e3, qDist(rot4(pr2, rot4(pr, x)), rot4([qMul(pr2[0], pr[0]), qMul(pr[1], pr2[1])], x)));
    let p = pr[0], ang = Math.acos(clampv(qDot(qUnit(x), qMul(p, qUnit(x))), -1, 1));
    e4 = Math.max(e4, Math.abs(ang - Math.acos(clampv(p[0], -1, 1))));
  }
  check('|p x q| = |x|（4 次元の長さを保つ、100 組）', e1 < 1e-12);
  check('x ↦ p x q の 4 × 4 行列は直交、det = +1', e2 < 1e-12);
  check('合成：p₂(p₁ x q₁)q₂ = (p₂p₁) x (q₁q₂)', e3 < 1e-12);
  check('左だけの回転は等傾：どの x も同じ角 arccos(p₀) だけ回る', e4 < 1e-7);
  let pr = pair(3, 0.9), fixed = qDist(rot4(pr, [0, 0, 1, 0]), [0, 0, 1, 0]) + qDist(rot4(pr, [0, 0, 0, 1]), [0, 0, 0, 1]), moved = qDot([1, 0, 0, 0], rot4(pr, [1, 0, 0, 0]));
  check('単純な回転 p x p：(j, k) の平面は止まり、(1, i) の平面は 0.9 rad 回る', fixed < 1e-15 && near(moved, Math.cos(0.9), 1e-15));
  let e6 = 0;
  for (let t = 0; t < 30; t++) {
    let b = fiberBase(rnd() * 3, rnd() * 6), u = qRandom(), h0 = hopfPoint(b);
    for (let s = 0; s < 12; s++) { let x = qMul(b, qAxisAngle([1, 0, 0], s)); e6 = Math.max(e6, v3Dist(hopfPoint(x), h0), v3Dist(hopfPoint(qMul(u, x)), hopfPoint(qMul(u, b)))); }
  }
  check('ホップ写像 q i q*：同じ円 q e^{iφ} の点は S² の同じ点へ。左から掛けても円は円へ', e6 < 1e-12);
  let len = 0; for (let n = 0; n < 16; n++) for (let b = 0; b < 4; b++) { let a = [0, 1, 2, 3].map((c) => ((n >> c) & 1 ? 1 : -1)), a2 = a.slice(); a2[b] = -a2[b]; let p2 = pair(4, 1.3); len = Math.max(len, Math.abs(qDist(rot4(p2, a), rot4(p2, a2)) - 2)); }
  check('テッセラクトの辺の長さ 2 は回しても 2', len < 1e-12);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 1（左だけ）と 3（単純な回転）を比べよう。左の「回った角」はどうちがう？
// 2. 3 次元の回転 q v q* は、p = q、q = q* とした 4 次元の回転。w 軸（実数の 1）が止まっている
// 3. H でホップの円。2 つの円を選んで目で追い、からみ合っていることを確かめよう（鎖の輪のように）
// 4. EYE_W を 2 や 5 に変えると、テッセラクトの見え方はどう変わる？
// 5. 4 次元の回転には「回転の平面」が 2 つある（3 次元は軸が 1 本）。4 のモードで速さの比 0.6 を変えよう


// ==================================================
// ここから下は「四元数の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 種つきの乱数（同じ種なら毎回同じ列）。自己テストで使う
let rngState = 1;
function seedRng(s) { rngState = (s >>> 0) || 1; }
function rnd() {                       // 0〜1 の一様乱数（mulberry32）
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rndNormal() { let u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
// ---- 四元数 [w, x, y, z] = w + xi + yj + zk（ふつうの配列）
function qMake(w, x, y, z) { return [w, x, y, z]; }
function qMul(a, b) {                  // ハミルトン積（i² = j² = k² = ijk = −1）
  return [a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
          a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
          a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
          a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0]];
}
function qConj(a) { return [a[0], -a[1], -a[2], -a[3]]; }               // 共役 q*
function qAdd(a, b) { return a.map((v, t) => v + b[t]); }
function qSub(a, b) { return a.map((v, t) => v - b[t]); }
function qScl(a, s) { return a.map((v) => v * s); }
function qDot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]; }
function qNorm(a) { return Math.sqrt(qDot(a, a)); }                     // |q|
function qUnit(a) { let n = qNorm(a); return n > 1e-300 ? qScl(a, 1 / n) : [1, 0, 0, 0]; }
function qInv(a) { let n2 = qDot(a, a); return n2 > 1e-300 ? qScl(qConj(a), 1 / n2) : [0, 0, 0, 0]; }   // q⁻¹ = q*/|q|²
function qDist(a, b) { return qNorm(qSub(a, b)); }
function qAxisAngle(n, th) {           // 軸 n（単位ベクトル）まわりに角度 th の回転：cos(th/2) + sin(th/2) n
  let u = v3Unit(n), s = Math.sin(th / 2);
  return [Math.cos(th / 2), u[0] * s, u[1] * s, u[2] * s];
}
function qRot(q, v) {                  // v を q v q* で回す（v は 3 次元ベクトル → 純四元数）
  let r = qMul(qMul(q, [0, v[0], v[1], v[2]]), qConj(q));
  return [r[1], r[2], r[3]];
}
function qToMat(q) {                   // 同じ q から作った 3×3 回転行列（単位四元数のとき）
  let [w, x, y, z] = q;
  return [[1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)],
          [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)],
          [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)]];
}
function qExp(a) {                     // exp(w + v) = e^w (cos|v| + sin|v| v/|v|)
  let vn = Math.hypot(a[1], a[2], a[3]), ew = Math.exp(a[0]), s = vn > 1e-12 ? Math.sin(vn) / vn : 1 - (vn * vn) / 6;
  return [ew * Math.cos(vn), ew * s * a[1], ew * s * a[2], ew * s * a[3]];
}
function qLog(a) {                     // log q = ln|q| + acos(w/|q|) v/|v|
  let n = qNorm(a), vn = Math.hypot(a[1], a[2], a[3]), th = Math.atan2(vn, a[0]), s = vn > 1e-12 ? th / vn : 1 / Math.max(n, 1e-300);
  return [Math.log(Math.max(n, 1e-300)), s * a[1], s * a[2], s * a[3]];
}
function qSlerp(a, b, t, shortest) {   // 球面線形補間。shortest = true なら −b と近い方の道
  let d = qDot(a, b);
  if (shortest && d < 0) { b = qScl(b, -1); d = -d; }
  d = clampv(d, -1, 1);
  let om = Math.acos(d), so = Math.sin(om);
  if (so < 1e-9) return qUnit(qAdd(qScl(a, 1 - t), qScl(b, t)));        // ほぼ同じ向き → lerp で十分
  return qAdd(qScl(a, Math.sin((1 - t) * om) / so), qScl(b, Math.sin(t * om) / so));
}
function qNlerp(a, b, t, shortest) {   // 正規化した線形補間（まっすぐ結んで |q| = 1 にもどす）
  if (shortest && qDot(a, b) < 0) b = qScl(b, -1);
  return qUnit(qAdd(qScl(a, 1 - t), qScl(b, t)));
}
function qAngle(a, b) {                // 2 つの姿勢の間の回転角（0〜π）。a⁻¹b の角を atan2 で（小さい角でも正確）
  let d = qMul(qConj(qUnit(a)), qUnit(b));
  return 2 * Math.atan2(Math.hypot(d[1], d[2], d[3]), Math.abs(d[0]));
}
function qRandom() {                   // 一様にランダムな単位四元数（S³ の上の点）
  return qUnit([rndNormal(), rndNormal(), rndNormal(), rndNormal()]);
}
function qStr(a, dg) { dg = dg === undefined ? 3 : dg; return '(' + a.map((v) => (Math.abs(v) < 0.5 * Math.pow(10, -dg) ? 0 : v).toFixed(dg)).join(', ') + ')'; }
// ---- 3 次元ベクトルと 3×3 行列
function v3Dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function v3Cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function v3Len(a) { return Math.hypot(a[0], a[1], a[2]); }
function v3Unit(a) { let n = v3Len(a); return n > 1e-300 ? [a[0] / n, a[1] / n, a[2] / n] : [0, 0, 1]; }
function v3Add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function v3Scl(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
function v3Dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); }
function matVec(m, v) { return [0, 1, 2].map((r) => m[r][0] * v[0] + m[r][1] * v[1] + m[r][2] * v[2]); }
function matMul(a, b) { return [0, 1, 2].map((r) => [0, 1, 2].map((c) => a[r][0] * b[0][c] + a[r][1] * b[1][c] + a[r][2] * b[2][c])); }
function matT(a) { return [0, 1, 2].map((r) => [0, 1, 2].map((c) => a[c][r])); }
function matDet(a) { return v3Dot(a[0], v3Cross(a[1], a[2])); }
function matOrthoErr(a) {              // |MᵀM − I| の最大成分（回転行列なら 0）
  let m = matMul(matT(a), a), e = 0;
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) e = Math.max(e, Math.abs(m[r][c] - (r === c ? 1 : 0)));
  return e;
}
function matDiff(a, b) { let e = 0; for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) e = Math.max(e, Math.abs(a[r][c] - b[r][c])); return e; }
// ---- 3D の道具（WEBGL）：回転は全部 q v q* で CPU で計算し、頂点を直接置く
//   数学の向き（x 右・y 上・z 手前、右手系）→ p5 の WEBGL（y が下向き）へは y だけ反転する
const LIGHT_DIR = v3Unit([0.4, 0.7, 0.8]);
function glV(v, s) { vertex(v[0] * s, -v[1] * s, v[2] * s); }
function glLine(a, b, s) { line(a[0] * s, -a[1] * s, a[2] * s, b[0] * s, -b[1] * s, b[2] * s); }
function glArrow(a, b, s, col, w) {    // a → b の矢印（線 + 先の 4 本のひげ）
  stroke(...col); strokeWeight(w || 3); glLine(a, b, s);
  let d = v3Sub(b, a), L = v3Len(d); if (L < 1e-9) return;
  let u = v3Scl(d, 1 / L), side = v3Unit(v3Cross(u, Math.abs(u[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])), up = v3Cross(u, side), h = Math.min(0.25, L * 0.3);
  for (let t of [side, up, v3Scl(side, -1), v3Scl(up, -1)]) glLine(b, v3Add(v3Add(b, v3Scl(u, -h)), v3Scl(t, h * 0.4)), s);
}
function v3Sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
const CUBE_FACES = [[[1, 0, 0], [1, 2, 6, 5]], [[-1, 0, 0], [0, 4, 7, 3]], [[0, 1, 0], [2, 3, 7, 6]], [[0, -1, 0], [0, 1, 5, 4]], [[0, 0, 1], [4, 5, 6, 7]], [[0, 0, -1], [0, 3, 2, 1]]];
const CUBE_CORNERS = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]];
// 箱を組み合わせた物体を、回転 rotFn（v → 回したv）で描く。parts = [{ c: 中心, h: 半分の大きさ, col: [r,g,b] }]
function glParts(parts, rotFn, s, offset, alphaV) {
  offset = offset || [0, 0, 0];
  noStroke();
  for (let P of parts) {
    let pts = CUBE_CORNERS.map((c) => v3Add(rotFn([P.c[0] + c[0] * P.h[0], P.c[1] + c[1] * P.h[1], P.c[2] + c[2] * P.h[2]]), offset));
    for (let [n, idx] of CUBE_FACES) {
      let b = 0.42 + 0.58 * Math.max(0, v3Dot(v3Unit(rotFn(n)), LIGHT_DIR));
      fill(P.col[0] * b, P.col[1] * b, P.col[2] * b, alphaV === undefined ? 255 : alphaV);
      beginShape(); for (let t of idx) glV(pts[t], s); endShape(CLOSE);
    }
  }
}
function glWire(parts, rotFn, s, col, offset) {   // 同じ物体を針金（辺だけ）で
  offset = offset || [0, 0, 0];
  stroke(...col); strokeWeight(1.5); noFill();
  const EDGES = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
  for (let P of parts) {
    let pts = CUBE_CORNERS.map((c) => v3Add(rotFn([P.c[0] + c[0] * P.h[0], P.c[1] + c[1] * P.h[1], P.c[2] + c[2] * P.h[2]]), offset));
    for (let [a, b] of EDGES) glLine(pts[a], pts[b], s);
  }
}
// 飛行機のような物体（向きが分かりやすい）。機首 = +z、上 = +y、右の翼 = +x
const PLANE_PARTS = [
  { c: [0, 0, 0], h: [0.18, 0.18, 0.9], col: [235, 235, 240] },
  { c: [0, 0, 0.05], h: [1.0, 0.04, 0.26], col: [90, 200, 235] },
  { c: [0, 0.28, -0.72], h: [0.04, 0.26, 0.16], col: [245, 200, 80] },
  { c: [0, 0, -0.75], h: [0.4, 0.03, 0.12], col: [90, 200, 235] },
  { c: [0, 0.02, 0.95], h: [0.1, 0.1, 0.06], col: [240, 110, 90] },
];
// ---- 画面に重ねる文字（HUD）：2D のバッファに描いて最後に貼る（深さをクリアして一番手前に）
let hud;
function hudMake() { hud = createGraphics(width, height); hud.textFont('sans-serif'); }
function hudShow() {
  drawingContext.clear(drawingContext.DEPTH_BUFFER_BIT);
  push(); resetMatrix(); noStroke(); image(hud, -width / 2, -height / 2, width, height); pop();
}
// ---- アークボール（仮想トラックボール）：画面の点 → 球面の点 → 2 点を結ぶ回転の四元数
function arcballVec(mx, my) {
  let rr = 0.42 * Math.min(width, height), x = (mx - width / 2) / rr, y = -(my - height / 2) / rr, d = x * x + y * y;
  return d < 1 ? [x, y, Math.sqrt(1 - d)] : v3Unit([x, y, 0]);
}
function arcballQ(a, b) { return qUnit([1 + v3Dot(a, b), ...v3Cross(a, b)]); }   // a を b に重ねる最小の回転（角度 = a と b の間）
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y, g) {       // g = 描く先（省略で画面、WEBGL では HUD のバッファ）
  g = g || window;
  g.noStroke(); g.fill(selfTestResults.every((r) => r.ok) ? g.color(120, 210, 150) : g.color(255, 90, 90));
  g.textSize(14); g.textAlign(LEFT, BASELINE); g.text(selfTestLine(), x, y);
}
