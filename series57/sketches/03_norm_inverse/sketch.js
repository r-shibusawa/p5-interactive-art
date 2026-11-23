// ============================================
// 03 ノルムと逆元・単位四元数 ─ |pq| = |p||q|、q⁻¹ = q*/|q|²
// 長さ（ノルム）は掛け算と両立する。だから 0 でない四元数には必ず逆元がある（割り算ができる）
// |q| = 1 の四元数（単位四元数）は 4 次元の球面 S³ をつくる。(x, y, z) を 3D に、4 つ目の w を色にして描く
// R：新しい p, q / ↑↓ w の切り口 / M：全部の点に u を掛け続ける / E：オイラーの 4 平方恒等式の数を取りかえ / スペース：回す
// ============================================

const N_PTS = 1600;                    // ★ S³ の上の点の数
let pts = [], pq, ints, wCut = 0.5, mulOn = false, viewAng = 0, spinning = true;
const U_STEP = qAxisAngle(v3Unit([1, 1, 0]), 0.01);   // ★ M で掛け続ける単位四元数（少しだけ回す）

function setup() {
  createCanvas(windowWidth, windowHeight); selfTest();
  seedRng(31); for (let n = 0; n < N_PTS; n++) pts.push(qRandom());
  newPQ(); newInts();
}
function newPQ() { pq = [0, 1].map(() => [0, 1, 2, 3].map(() => Math.round((Math.random() * 6 - 3) * 10) / 10)); }
function newInts() { ints = [0, 1].map(() => [0, 1, 2, 3].map(() => Math.floor(Math.random() * 19) - 9)); }
function wColor(w) {                   // w = −1（青）→ 0（白）→ +1（金）
  return w < 0 ? [255 + w * 175, 255 + w * 105, 255 + w * 10] : [255, 255 - w * 55, 255 - w * 175];
}

function draw() {
  background(15, 18, 34);
  if (spinning) viewAng += 0.004;
  if (mulOn) pts = pts.map((x) => qMul(U_STEP, x));   // 単位四元数を掛けても S³ の上にのこる
  // ---- S³ を 3D（x, y, z）と色（w）で
  let view = { x: width * 0.42, y: height * 0.56, s: Math.min(width, height) * 0.27, d: 6 };
  let vq = qMul(qAxisAngle([1, 0, 0], 0.3), qAxisAngle([0, 1, 0], viewAng));
  let rr = Math.sqrt(Math.max(0, 1 - wCut * wCut)), maxN = 0;
  noFill(); stroke(255, 200, 80, 90); strokeWeight(1);
  let c0 = projP([0, 0, 0], view); circle(c0[0], c0[1], 2 * rr * view.s * view.d / view.d);
  strokeWeight(3);
  for (let x of pts) {
    maxN = Math.max(maxN, Math.abs(qNorm(x) - 1));
    let s = projP(qRot(vq, [x[1], x[2], x[3]]), view), col = wColor(x[0]), on = Math.abs(x[0] - wCut) < 0.04;
    stroke(col[0], col[1], col[2], on ? 255 : 150); strokeWeight(on ? 7 : 4); point(s[0], s[1]);
  }
  // ---- 左：p, q のノルムと逆元
  let [p, q] = pq, tx = 24, ty = 130, prod = qMul(p, q), qi = qInv(q);
  fill(240); noStroke(); textSize(16);
  text('p = ' + qStr(p, 2), tx, ty); text('q = ' + qStr(q, 2), tx, ty + 24);
  fill(210); textSize(15);
  text('|p| = ' + qNorm(p).toFixed(5) + '　|q| = ' + qNorm(q).toFixed(5), tx, ty + 56);
  fill(130, 230, 150);
  text('|pq| = ' + qNorm(prod).toFixed(5), tx, ty + 80); text('|p||q| = ' + (qNorm(p) * qNorm(q)).toFixed(5), tx, ty + 102);
  fill(210);
  text('q* = ' + qStr(qConj(q), 2), tx, ty + 140);
  text('q⁻¹ = q*/|q|² = ' + qStr(qi, 4), tx, ty + 164);
  text('q q⁻¹ = ' + qStr(qMul(q, qi), 4), tx, ty + 188);
  text('q⁻¹ q = ' + qStr(qMul(qi, q), 4), tx, ty + 212);
  fill(170); textSize(14);
  text('q q* = q₀² + q₁² + q₂² + q₃² = |q|²（実数）だから、|q|² で割れば逆元', tx, ty + 244, 360, 60);
  // ---- 右：オイラーの 4 平方恒等式（整数の四元数の積から）
  let [a, b] = ints, c = qMul(a, b), sa = a.reduce((s, v) => s + v * v, 0), sb = b.reduce((s, v) => s + v * v, 0), scc = c.reduce((s, v) => s + v * v, 0);
  let rx = width * 0.72, ry = 130;
  fill(255, 210, 110); textSize(16); text('オイラーの 4 平方恒等式（1748）', rx, ry);
  fill(220); textSize(15);
  text('(' + a.map(sqStr).join(' + ') + ')', rx, ry + 30);
  text('× (' + b.map(sqStr).join(' + ') + ')', rx, ry + 54);
  text('= ' + sa + ' × ' + sb + ' = ' + sa * sb, rx, ry + 78);
  fill(130, 230, 150);
  text('= ' + c.map(sqStr).join(' + '), rx, ry + 110);
  text('= ' + scc + (scc === sa * sb ? '　✓ 一致' : '　✗'), rx, ry + 134);
  fill(170); textSize(14);
  text('右の 4 つの数は、整数の四元数 a × b の 4 成分。|ab|² = |a|²|b|² を整数で書いたもの。4 つの平方数の和どうしを掛けると、また 4 つの平方数の和', rx, ry + 166, width - rx - 20, 100);
  fill(200); textSize(15);
  text('S³ の点 ' + N_PTS + ' 個：||x| − 1| の最大 = ' + maxN.toExponential(1), rx, ry + 290);
  text('金色の点 = w ≈ ' + wCut.toFixed(2) + ' の切り口（半径 √(1 − w²) = ' + rr.toFixed(3) + ' の球面）', rx, ry + 314, width - rx - 20, 60);

  fill(240); textSize(20);
  text('ノルムと逆元・単位四元数　|pq| = |p||q|、q⁻¹ = q*/|q|²、|q| = 1 の全体は 3 次元球面 S³', 20, 36);
  fill(175); textSize(15);
  text('R：新しい p, q　↑↓ w の切り口　M：全部の点に単位四元数を掛け続ける　E：整数を取りかえ　スペース：回す/止める', 20, 62);
  text('点の位置 = (x, y, z)、色 = w（青 −1 → 白 0 → 金 +1）。w を決めると、残りの (x, y, z) は球面になる', 20, 86);
  drawSelfTest(width - 170, height - 12);
}

function sqStr(v) { return v < 0 ? '(−' + -v + ')²' : v + '²'; }

function keyPressed() {
  if (key === 'r' || key === 'R') newPQ();
  if (key === 'e' || key === 'E') newInts();
  if (key === 'm' || key === 'M') mulOn = !mulOn;
  if (key === ' ') spinning = !spinning;
  if (key === UP_ARROW) wCut = Math.min(0.98, wCut + 0.1);
  if (key === DOWN_ARROW) wCut = Math.max(-0.98, wCut - 0.1);
  if (key === RIGHT_ARROW) viewAng += 0.2;
  if (key === LEFT_ARROW) viewAng -= 0.2;
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = []; seedRng(30);
  let e1 = 0, e2 = 0, e3 = 0, e4 = 0, e5 = 0;
  for (let t = 0; t < 200; t++) {
    let p = qScl(qRandom(), 0.1 + 3 * rnd()), q = qScl(qRandom(), 0.1 + 3 * rnd()), u = qRandom(), w = qRandom();
    e1 = Math.max(e1, Math.abs(qNorm(qMul(p, q)) / (qNorm(p) * qNorm(q)) - 1));
    e2 = Math.max(e2, qDist(qMul(q, qInv(q)), [1, 0, 0, 0]), qDist(qMul(qInv(q), q), [1, 0, 0, 0]));
    e3 = Math.max(e3, qDist(qInv(qMul(p, q)), qMul(qInv(q), qInv(p))) / qNorm(qInv(qMul(p, q))));
    e4 = Math.max(e4, qDist(qMul(q, qConj(q)), [qDot(q, q), 0, 0, 0]) / qDot(q, q));
    e5 = Math.max(e5, Math.abs(qNorm(qMul(u, w)) - 1));
  }
  check('|pq| = |p||q|（200 組、相対 1e-9）', e1 < 1e-9);
  check('q q⁻¹ = q⁻¹ q = 1', e2 < 1e-12);
  check('(pq)⁻¹ = q⁻¹ p⁻¹', e3 < 1e-12);
  check('q q* = |q|²（実数）', e4 < 1e-12);
  check('単位四元数どうしの積も単位四元数（S³ は掛け算で閉じている）', e5 < 1e-12);
  let ok4 = true;
  for (let t = 0; t < 500; t++) {
    let a = [0, 1, 2, 3].map(() => Math.floor(rnd() * 41) - 20), b = [0, 1, 2, 3].map(() => Math.floor(rnd() * 41) - 20), c = qMul(a, b);
    let lhs = a.reduce((s, v) => s + v * v, 0) * b.reduce((s, v) => s + v * v, 0), rhs = c.reduce((s, v) => s + v * v, 0);
    if (lhs !== rhs || !c.every(Number.isInteger)) ok4 = false;
  }
  check('オイラーの 4 平方恒等式：整数 500 組で (Σaᵢ²)(Σbᵢ²) = Σcᵢ² がぴったり', ok4);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. R を何回か押して、|pq| と |p||q| が毎回一致することを確かめよう
// 2. q = (0, 0, 0, 0) なら逆元は？ 0 以外ならいつでも逆元がある → 四元数は「割り算のできる数」（斜体）
// 3. ↑↓ で w の切り口を動かそう。w = ±1 に近づくと金色の球はどうなる？（S³ は球面を w 方向に積み重ねたもの）
// 4. M で全部の点に u を掛け続けると、点は S³ の上をすべる。色（w）も変わる？ |x| は？
// 5. E で整数を変えよう。2 = 1² + 1² + 0² + 0²、3 = 1² + 1² + 1² + 0² から、6 を 4 つの平方数の和で表そう


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
// ---- 3D を 2D の画面に描く道具（透視投影）。view = { x, y, s, d }（中心・拡大・目までの距離）
//   数学の向き：x 右・y 上・z 手前。回転は全部 q v q* で計算する
function projP(v, view) { let f = view.d / Math.max(0.2, view.d - v[2]); return [view.x + v[0] * view.s * f, view.y - v[1] * view.s * f, v[2]]; }
const BOX_FACES = [[[1, 0, 0], [1, 2, 6, 5]], [[-1, 0, 0], [0, 4, 7, 3]], [[0, 1, 0], [2, 3, 7, 6]], [[0, -1, 0], [0, 1, 5, 4]], [[0, 0, 1], [4, 5, 6, 7]], [[0, 0, -1], [0, 3, 2, 1]]];
const BOX_CORNERS = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]];
const LIGHT2 = v3Unit([0.4, 0.7, 0.8]);
// 箱を組み合わせた物体を、回転の四元数 q で回して描く（奥の面から順にぬる＝画家のアルゴリズム）
function drawParts2D(parts, q, view, alphaV) {
  let faces = [];
  for (let P of parts) {
    let pts = BOX_CORNERS.map((c) => qRot(q, [P.c[0] + c[0] * P.h[0], P.c[1] + c[1] * P.h[1], P.c[2] + c[2] * P.h[2]]));
    for (let [n, idx] of BOX_FACES) {
      let nw = qRot(q, n), fp = idx.map((t) => pts[t]), cz = fp.reduce((s, p) => s + p[2], 0) / 4;
      let ctr = fp.reduce((s, p) => v3Add(s, v3Scl(p, 0.25)), [0, 0, 0]);
      if (v3Dot(nw, v3Sub2([0, 0, view.d], ctr)) <= 0) continue;            // 裏を向いた面は描かない
      faces.push({ cz, fp, b: 0.42 + 0.58 * Math.max(0, v3Dot(nw, LIGHT2)), col: P.col });
    }
  }
  faces.sort((a, b) => a.cz - b.cz);
  stroke(20, 24, 40, alphaV === undefined ? 120 : alphaV * 0.5); strokeWeight(1);
  for (let f of faces) {
    fill(f.col[0] * f.b, f.col[1] * f.b, f.col[2] * f.b, alphaV === undefined ? 255 : alphaV);
    beginShape(); for (let p of f.fp) { let s = projP(p, view); vertex(s[0], s[1]); } endShape(CLOSE);
  }
}
function v3Sub2(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function line3(a, b, view) { let p = projP(a, view), r = projP(b, view); line(p[0], p[1], r[0], r[1]); }
function drawAxes2D(q, view, L) {      // 回した座標軸（x 赤、y 緑、z 青）
  let cols = [[240, 90, 90], [110, 220, 120], [100, 160, 255]];
  for (let a = 0; a < 3; a++) { let e = [0, 0, 0]; e[a] = L; stroke(...cols[a]); strokeWeight(2.5); line3([0, 0, 0], qRot(q, e), view); }
}
const PLANE_PARTS = [
  { c: [0, 0, 0], h: [0.18, 0.18, 0.9], col: [235, 235, 240] },
  { c: [0, 0, 0.05], h: [1.0, 0.04, 0.26], col: [90, 200, 235] },
  { c: [0, 0.28, -0.72], h: [0.04, 0.26, 0.16], col: [245, 200, 80] },
  { c: [0, 0, -0.75], h: [0.4, 0.03, 0.12], col: [90, 200, 235] },
  { c: [0, 0.02, 0.95], h: [0.1, 0.1, 0.06], col: [240, 110, 90] },
];
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
