// ============================================
// 04 回転は q v q* ─ 単位四元数で 3D の物体を回す
// 軸 n（単位ベクトル）と角度 θ から q = cos(θ/2) + sin(θ/2) n を作り、物体の全部の頂点を v → q v q* で回す
// 同じ q から作った回転行列 R で回した結果（水色の針金）と、数値でぴったり一致することを確かめる
// ドラッグ：回転軸の向き / ← → 角度 ±15° / スペース：回し続ける / 1 2 3：軸を x y z に / M：行列の針金 / R：最初から
// ============================================

let axisN = [0.3, 1, 0.2];             // ★ 回転軸（長さは自動で 1 に）
let theta = Math.PI / 3;               // ★ 回転角（ラジアン）
let spinning = false, showMat = true;
const SPIN_SPEED = 0.012;              // ★ スペースで回すときの速さ（1 フレームあたりのラジアン）
const VIEW = qMul(qAxisAngle([1, 0, 0], 0.38), qAxisAngle([0, 1, 0], -0.55));   // 斜めから見る向き（これも四元数）
let sc, lastDiff = 0;

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  hudMake(); selfTest();
}

function draw() {
  background(14, 18, 34);
  sc = Math.min(width, height) * 0.26;
  if (spinning) theta = (theta + SPIN_SPEED) % (4 * Math.PI);
  if (mouseIsPressed && mouseY > 110) axisN = qRot(qConj(VIEW), arcballVec(mouseX, mouseY));   // 画面の点 → 見ている向きを戻して軸に
  let n = v3Unit(axisN), q = qAxisAngle(n, theta), R = qToMat(q);
  let viewF = (v) => qRot(VIEW, v);
  // 座標軸（x 赤・y 緑・z 青）と回転軸 n（金色、両側に伸ばす）
  let cols = [[230, 90, 90], [110, 210, 120], [100, 150, 255]];
  for (let a = 0; a < 3; a++) { let e = [0, 0, 0]; e[a] = 1.6; glArrow([0, 0, 0], viewF(e), sc, cols[a], 1.5); }
  stroke(255, 200, 80); strokeWeight(3); glLine(viewF(v3Scl(n, -1.7)), viewF(v3Scl(n, 1.7)), sc);
  glArrow([0, 0, 0], viewF(v3Scl(n, 1.7)), sc, [255, 200, 80], 4);
  // 元の物体（うすく）と、q v q* で回した物体
  glParts(PLANE_PARTS, viewF, sc, [0, 0, 0], 50);
  glParts(PLANE_PARTS, (v) => qRot(VIEW, qRot(q, v)), sc);
  // 同じ q から作った回転行列 R で回した針金（ぴったり重なる）
  if (showMat) glWire(PLANE_PARTS, (v) => qRot(VIEW, matVec(R, v)), sc, [80, 230, 255]);
  // 機首の先の点 v が、θ を 0 → 2π と変えたときに通る円
  let tip = [0, 0.02, 1.01];
  stroke(255, 200, 80, 150); strokeWeight(1.5); noFill();
  beginShape(); for (let s = 0; s <= 64; s++) glV(viewF(qRot(qAxisAngle(n, (s / 64) * 2 * Math.PI), tip)), sc); endShape();
  // すべての頂点で q v q* と R v の差を測る
  lastDiff = 0;
  for (let P of PLANE_PARTS) for (let c of CUBE_CORNERS) { let v = [P.c[0] + c[0] * P.h[0], P.c[1] + c[1] * P.h[1], P.c[2] + c[2] * P.h[2]]; lastDiff = Math.max(lastDiff, v3Dist(qRot(q, v), matVec(R, v))); }
  if (frameCount % 2 === 1) drawHud(n, q, R, tip);
  hudShow();
}

function drawHud(n, q, R, tip) {
  let g = hud; g.clear(); g.noStroke(); g.textAlign(LEFT, BASELINE);
  g.fill(240); g.textSize(20); g.text('回転は q v q*　θ = ' + (theta * 180 / Math.PI).toFixed(1) + '°　軸 n = (' + n.map((v) => v.toFixed(2)).join(', ') + ')', 20, 34);
  g.fill(175); g.textSize(15);
  g.text('ドラッグ：軸の向き　← → 角度 ±15°　スペース：回し続ける　1 2 3：軸を x y z　M：行列の針金　R：最初から', 20, 60);
  g.text('白い物体 = 全部の頂点を q v q* で回したもの、水色の針金 = 同じ q から作った回転行列 R で回したもの', 20, 84);
  let x = 20, y = 140;
  g.fill(255, 210, 110); g.textSize(17); g.text('q = cos(θ/2) + sin(θ/2) n', x, y);
  g.fill(230); g.textSize(15); g.text('= ' + qStr(q, 4) + '　|q| = ' + qNorm(q).toFixed(6), x, y + 24);
  g.text('回転行列 R（q から作る）', x, y + 60);
  for (let r = 0; r < 3; r++) g.text(R[r].map((v) => (v >= 0 ? ' ' : '') + v.toFixed(3)).join('   '), x + 10, y + 84 + r * 20);
  let qv = qRot(q, tip), rv = matVec(R, tip);
  g.text('機首の点 v = (0, 0.02, 1.01)', x, y + 160);
  g.text('q v q* = (' + qv.map((v) => v.toFixed(4)).join(', ') + ')', x, y + 182);
  g.text('R v     = (' + rv.map((v) => v.toFixed(4)).join(', ') + ')', x, y + 204);
  g.text('|v| = ' + v3Len(tip).toFixed(6) + '　→　|q v q*| = ' + v3Len(qv).toFixed(6), x, y + 226);
  g.fill(120, 220, 160); g.text('全頂点での差の最大 |q v q* − R v| = ' + lastDiff.toExponential(1), x, y + 254);
  // 半分の角：単位円の上の (cos θ/2, sin θ/2)
  let cx = width - 170, cy = 200, rr = 90;
  g.noFill(); g.stroke(120); g.strokeWeight(1); g.circle(cx, cy, rr * 2); g.line(cx - rr - 10, cy, cx + rr + 10, cy); g.line(cx, cy - rr - 10, cx, cy + rr + 10);
  g.stroke(255, 200, 80); g.strokeWeight(3); g.line(cx, cy, cx + rr * Math.cos(theta / 2), cy - rr * Math.sin(theta / 2));
  g.stroke(255, 120, 120, 160); g.strokeWeight(2); g.line(cx, cy, cx + rr * Math.cos(theta), cy - rr * Math.sin(theta));
  g.noStroke(); g.fill(255, 200, 80); g.textSize(14);
  g.text('q の角 θ/2 = ' + (theta * 90 / Math.PI).toFixed(1) + '°', cx - 80, cy + rr + 30);
  g.fill(255, 140, 140); g.text('回転の角 θ = ' + (theta * 180 / Math.PI).toFixed(1) + '°', cx - 80, cy + rr + 50);
  g.fill(175); g.textSize(13);
  g.text('θ = 360° で q = −1、720° で q = +1', cx - 80, cy + rr + 74);
  g.text('（q と −q は同じ回転 → 07）', cx - 80, cy + rr + 92);
  drawSelfTest(width - 170, height - 12, g);
}

function keyPressed() {
  if (key === RIGHT_ARROW) theta = (theta + Math.PI / 12) % (4 * Math.PI);
  if (key === LEFT_ARROW) theta = (theta - Math.PI / 12 + 4 * Math.PI) % (4 * Math.PI);
  if (key === ' ') spinning = !spinning;
  if (key === '1') axisN = [1, 0, 0];
  if (key === '2') axisN = [0, 1, 0];
  if (key === '3') axisN = [0, 0, 1];
  if (key === 'm' || key === 'M') showMat = !showMat;
  if (key === 'r' || key === 'R') { axisN = [0.3, 1, 0.2]; theta = Math.PI / 3; spinning = false; }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = []; seedRng(4);
  let e1 = 0, e2 = 0, e3 = 0, e4 = 0, e5 = 0;
  for (let t = 0; t < 200; t++) {
    let q = qRandom(), q2 = qRandom(), v = [rndNormal(), rndNormal(), rndNormal()];
    e1 = Math.max(e1, v3Dist(qRot(q, v), matVec(qToMat(q), v)));
    e2 = Math.max(e2, Math.abs(v3Len(qRot(q, v)) - v3Len(v)));
    e3 = Math.max(e3, v3Dist(qRot(q, v), qRot(qScl(q, -1), v)));
    e4 = Math.max(e4, v3Dist(qRot(qMul(q2, q), v), qRot(q2, qRot(q, v))), matDiff(qToMat(qMul(q2, q)), matMul(qToMat(q2), qToMat(q))));
    e5 = Math.max(e5, matOrthoErr(qToMat(q)), Math.abs(matDet(qToMat(q)) - 1));
  }
  check('q v q* = R v（同じ q から作った行列）：200 組で差 ' + e1.toExponential(1), e1 < 1e-12);
  check('q v q* は長さを変えない |q v q*| = |v|', e2 < 1e-12);
  check('q と −q は同じ回転', e3 < 1e-12);
  check('回転の合成 = 四元数の積：(q₂q₁) v (q₂q₁)* = q₂(q₁ v q₁*)q₂*、R(q₂q₁) = R(q₂)R(q₁)', e4 < 1e-12);
  check('R は回転行列：RᵀR = I、det R = 1', e5 < 1e-12);
  let qz = qAxisAngle([0, 0, 1], Math.PI / 2), n = v3Unit([1, 2, 3]);
  check('z 軸まわりに 90°：x → y（右手系）、軸 n はそのまま', v3Dist(qRot(qz, [1, 0, 0]), [0, 1, 0]) < 1e-15 && v3Dist(qRot(qAxisAngle(n, 1.234), n), n) < 1e-15);
  check('θ = 360° で q = −1（でも回転は恒等）、720° で q = +1', qDist(qAxisAngle(n, 2 * Math.PI), [-1, 0, 0, 0]) < 1e-15 && qDist(qAxisAngle(n, 4 * Math.PI), [1, 0, 0, 0]) < 1e-15 && matDiff(qToMat(qAxisAngle(n, 2 * Math.PI)), [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) < 1e-15);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 1（x 軸）にして ← → で 90° ずつ回そう。機首はどちらへ向く？（右手の親指を軸に、指の曲がる向き）
// 2. θ = 360° のとき q はいくつ？ 物体の向きは？ 720° では？（右上の円を見る）
// 3. q = cos(θ) + sin(θ) n（半分にしない）にすると、q v q* は何度回す？ qAxisAngle の th / 2 を th にして確かめよう
// 4. q v q* の代わりに q v（片側だけ）にすると、結果は純四元数（スカラー部 0）にならない。qRot を書きかえて表示してみよう
// 5. 軸をゆっくりドラッグしながらスペースで回すと、黄色の円（機首の通り道）はどう変わる？


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
