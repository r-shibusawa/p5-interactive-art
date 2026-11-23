// ============================================
// 05 オイラー角とジンバルロック ─ 3 つの角では自由度が 1 つ消える場所がある
// 姿勢 R = Ry(ヨー ψ) · Rx(ピッチ θ) · Rz(ロール φ)。3 つのリング（ジンバル）がそれぞれの角を表す
// ピッチ = ±90° でヨーの軸とロールの軸が重なり、角を変えても回れない向きができる（ヤコビアンの階数 3 → 2）
// ← → ヨー / ↑↓ ピッチ / A D ロール / 9：ピッチ 90° / Q：四元数モード（機体の軸で直接回す）/ R：最初から
// ============================================

let yaw = 0.5, pitch = 0.4, roll = 0.3; // ★ 最初のオイラー角（ラジアン）
let quatMode = false, qBody = [1, 0, 0, 0];
const STEP_ANG = Math.PI / 36;         // ★ キー 1 回で回す角（5°）
const VIEW = qMul(qAxisAngle([1, 0, 0], 0.42), qAxisAngle([0, 1, 0], -0.7));
const RING_COL = [[255, 200, 80], [110, 210, 120], [240, 100, 100]];   // ヨー（金）・ピッチ（緑）・ロール（赤）
let sc;

function setup() { createCanvas(windowWidth, windowHeight, WEBGL); hudMake(); selfTest(); qBody = eulerQ(yaw, pitch, roll); }
function eulerQ(ps, th, ph) { return qMul(qMul(qAxisAngle([0, 1, 0], ps), qAxisAngle([1, 0, 0], th)), qAxisAngle([0, 0, 1], ph)); }
function eulerFromQ(q) {               // 行列から角を読み取る（ピッチ ±90° では ψ と φ が決まらない）
  let R = qToMat(q), th = Math.asin(clampv(-R[1][2], -1, 1));
  return [Math.atan2(R[0][2], R[2][2]), th, Math.atan2(R[1][0], R[1][1])];
}
function jacobian(ps, th) {            // 角の速さ (ψ', θ', φ') → 角速度 ω の 3 本の列
  let qy = qAxisAngle([0, 1, 0], ps), qyx = qMul(qy, qAxisAngle([1, 0, 0], th));
  return [[0, 1, 0], qRot(qy, [1, 0, 0]), qRot(qyx, [0, 0, 1])];
}
function singVals(cols) {              // 特異値 = √(JᵀJ の固有値)（ヤコビ法）
  let A = [0, 1, 2].map((r) => [0, 1, 2].map((c) => v3Dot(cols[r], cols[c])));
  for (let sweep = 0; sweep < 30; sweep++) for (let [r, c] of [[0, 1], [0, 2], [1, 2]]) {
    if (Math.abs(A[r][c]) < 1e-300) continue;
    let ph = 0.5 * Math.atan2(2 * A[r][c], A[c][c] - A[r][r]), cs = Math.cos(ph), sn = Math.sin(ph);
    for (let t = 0; t < 3; t++) { let a = A[t][r], b = A[t][c]; A[t][r] = cs * a - sn * b; A[t][c] = sn * a + cs * b; }
    for (let t = 0; t < 3; t++) { let a = A[r][t], b = A[c][t]; A[r][t] = cs * a - sn * b; A[c][t] = sn * a + cs * b; }
  }
  return [A[0][0], A[1][1], A[2][2]].map((v) => Math.sqrt(Math.max(0, v))).sort((a, b) => b - a);
}

function draw() {
  background(14, 18, 34);
  sc = Math.min(width, height) * 0.16;
  if (quatMode) [yaw, pitch, roll] = eulerFromQ(qBody);
  let qy = qAxisAngle([0, 1, 0], yaw), qyx = qMul(qy, qAxisAngle([1, 0, 0], pitch)), qAll = quatMode ? qBody : eulerQ(yaw, pitch, roll);
  let V = (v) => qRot(VIEW, v);
  // 3 つのリング：外（ヨー、xy 面）・中（ピッチ、xz 面）・内（ロール、yz 面）
  let rings = [[qy, 2.5, [1, 0, 0], [0, 1, 0]], [qyx, 2.2, [1, 0, 0], [0, 0, 1]], [qMul(qyx, qAxisAngle([0, 0, 1], roll)), 1.9, [0, 1, 0], [0, 0, 1]]];
  rings.forEach(([qr, r, u, w], n) => {
    stroke(...RING_COL[n]); strokeWeight(7); noFill();
    beginShape(); for (let s = 0; s <= 72; s++) { let a = (s / 72) * 2 * Math.PI; glV(V(qRot(qr, v3Add(v3Scl(u, r * Math.cos(a)), v3Scl(w, r * Math.sin(a))))), sc); } endShape();
  });
  // 回転軸（ヤコビアンの列）：この向きのまわりにしか回れない
  let J = jacobian(yaw, pitch);
  J.forEach((ax, n) => { stroke(...RING_COL[n], 200); strokeWeight(2); glLine(V(v3Scl(ax, -3)), V(v3Scl(ax, 3)), sc); });
  glParts(PLANE_PARTS, (v) => V(qRot(qAll, v)), sc);
  if (frameCount % 2 === 1) drawHud(J);
  hudShow();
}

function drawHud(J) {
  let g = hud, sv = singVals(J), det = matDet(J), rank = sv.filter((s) => s > 1e-6).length;
  g.clear(); g.noStroke(); g.textAlign(LEFT, BASELINE);
  g.fill(240); g.textSize(20); g.text('オイラー角とジンバルロック　' + (quatMode ? '四元数モード（機体の軸で直接回す）' : 'オイラー角モード'), 20, 34);
  g.fill(175); g.textSize(15);
  g.text('← → ヨー ψ　↑↓ ピッチ θ　A D ロール φ　9：ピッチ 90°　Q：四元数モード ⇔ オイラー角モード　R：最初から', 20, 60);
  g.text('R = Ry(ψ) Rx(θ) Rz(φ)。金 = ヨーのリング、緑 = ピッチ、赤 = ロール。細い線 = それぞれの回転軸', 20, 84);
  let x = 20, y = 140, d = (v) => (v * 180 / Math.PI).toFixed(1) + '°';
  g.textSize(17);
  [['ヨー ψ', yaw], ['ピッチ θ', pitch], ['ロール φ', roll]].forEach(([nm, v], n) => { g.fill(...RING_COL[n]); g.text(nm + ' = ' + d(v), x, y + n * 26); });
  g.fill(230); g.textSize(15);
  g.text('ヤコビアン J（列 = 3 つの回転軸）', x, y + 100);
  for (let r = 0; r < 3; r++) g.text(J.map((c) => (c[r] >= 0 ? ' ' : '') + c[r].toFixed(3)).join('    '), x + 10, y + 124 + r * 20);
  g.text('det J = ' + det.toFixed(4) + '　（= −cos θ = ' + (-Math.cos(pitch)).toFixed(4) + '）', x, y + 200);
  g.text('特異値 = ' + sv.map((s) => s.toFixed(4)).join(', '), x, y + 224);
  let lock = rank < 3;
  g.fill(lock ? g.color(255, 110, 110) : g.color(130, 230, 150)); g.textSize(18);
  g.text('階数 rank J = ' + rank + (lock ? '　ジンバルロック！ 自由度が 1 つ消えた' : '　（3 方向に回れる）'), x, y + 256);
  g.fill(200); g.textSize(14);
  if (Math.abs(Math.cos(pitch)) < 0.02) g.text('いま ψ と φ を同じだけ増やしても姿勢は変わらない（ψ − φ だけが効く）', x, y + 282);
  g.text('近づくだけでも危ない：θ を 90° に近づけると最小の特異値 → 0、角の速さ = J⁻¹ω が ∞ に（09）', x, y + 304);
  if (quatMode) { g.fill(255, 210, 110); g.text('四元数モード：q ← q · (機体の軸まわりの小さな回転)。どの向きでも 3 方向に回れる。上の角は q から読み直した値', x, y + 330); }
  drawSelfTest(width - 170, height - 12, g);
}

function keyPressed() {
  let axes = { [LEFT_ARROW]: [[0, 1, 0], -1], [RIGHT_ARROW]: [[0, 1, 0], 1], [UP_ARROW]: [[1, 0, 0], -1], [DOWN_ARROW]: [[1, 0, 0], 1], a: [[0, 0, 1], -1], d: [[0, 0, 1], 1], A: [[0, 0, 1], -1], D: [[0, 0, 1], 1] };
  if (axes[key]) {
    let [ax, sg] = axes[key];
    if (quatMode) qBody = qUnit(qMul(qBody, qAxisAngle(ax, sg * STEP_ANG)));   // 機体の軸で回す（いつでも 3 方向）
    else if (ax[1]) yaw += sg * STEP_ANG; else if (ax[0]) pitch = clampv(pitch + sg * STEP_ANG, -Math.PI / 2, Math.PI / 2); else roll += sg * STEP_ANG;
  }
  if (key === '9') { pitch = Math.PI / 2; qBody = eulerQ(yaw, pitch, roll); }
  if (key === 'q' || key === 'Q') { quatMode = !quatMode; qBody = eulerQ(yaw, pitch, roll); }
  if (key === 'r' || key === 'R') { yaw = 0.5; pitch = 0.4; roll = 0.3; qBody = eulerQ(yaw, pitch, roll); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = []; seedRng(5);
  let Rm = (ax, a) => qToMat(qAxisAngle(ax, a)), e1 = 0, e2 = 0, e3 = 0;
  for (let t = 0; t < 200; t++) {
    let ps = (rnd() * 2 - 1) * Math.PI, th = (rnd() * 2 - 1) * 1.5, ph = (rnd() * 2 - 1) * Math.PI;
    e1 = Math.max(e1, matDiff(qToMat(eulerQ(ps, th, ph)), matMul(Rm([0, 1, 0], ps), matMul(Rm([1, 0, 0], th), Rm([0, 0, 1], ph)))));
    e2 = Math.max(e2, Math.abs(matDet(jacobian(ps, th)) + Math.cos(th)));
    let back = eulerFromQ(eulerQ(ps, th, ph)); e3 = Math.max(e3, Math.abs(back[0] - ps), Math.abs(back[1] - th), Math.abs(back[2] - ph));
  }
  check('オイラー角 → 四元数の積 = 回転行列の積 Ry Rx Rz（200 組）', e1 < 1e-12);
  check('det J = −cos θ（ヤコビアンの行列式）', e2 < 1e-12);
  check('θ ≠ ±90° なら行列から角を読みもどせる', e3 < 1e-9);
  let sv = singVals(jacobian(0.7, Math.PI / 2)), sv0 = singVals(jacobian(0.7, 0.3));
  check('θ = 90° で J の階数 = 2（最小の特異値 ' + sv[2].toExponential(1) + '）、θ = 0.3 では 3', sv[2] < 1e-7 && sv[1] > 0.5 && sv0[2] > 0.5);
  let base = qToMat(eulerQ(0.3, Math.PI / 2, 0.5)), d1 = matDiff(base, qToMat(eulerQ(0.3 + 0.4, Math.PI / 2, 0.5 + 0.4))), d2 = matDiff(base, qToMat(eulerQ(0.3 + 0.4, Math.PI / 2, 0.5)));
  check('θ = 90° では ψ と φ を同じだけ増やしても同じ姿勢（2 つの角が 1 つになる）', d1 < 1e-12 && d2 > 0.1);
  let q = [1, 0, 0, 0], axes = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  for (let t = 0; t < 10000; t++) q = qUnit(qMul(q, qAxisAngle(axes[t % 3], (rnd() - 0.5) * 0.2)));
  check('四元数で 10000 回回しても |q| = 1、行列は直交（どこでも 3 方向に回れる）', Math.abs(qNorm(q) - 1) < 1e-14 && matOrthoErr(qToMat(q)) < 1e-14);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 9 でピッチを 90° にしてから、← → と A D を押そう。同じ動きになっていない？ 金と赤の細い線は？
// 2. ピッチ 90° のまま、機首を「左右」（今のヨーの軸と直角）に振る方法はある？
// 3. Q で四元数モードにして同じことをしよう。どの向きにも回れる？ 上の角の表示はどうなる？
// 4. ピッチを 85°、89°、89.9° と近づけて、最小の特異値と det J を見よう（STEP_ANG を小さくする）
// 5. アポロ宇宙船の姿勢を測る装置もジンバル式で、中のジンバルの角が大きくなると警告が出た。ゲームのカメラではどんなときに困る？


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
