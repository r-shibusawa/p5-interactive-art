// ============================================
// 09 角速度の積分 ─ ジャイロの値から姿勢を求める
// 機体の軸まわりの角速度 ω（ジャイロセンサーが測る量）から、姿勢 q を dq/dt = ½ q ω で積分する（RK4 + 毎回 |q| = 1 に）
// 同じ ω をオイラー角の微分方程式（角の速さ = J⁻¹ R ω、05 のヤコビアン）で積分したものと並べる。ω が一定なら答えは q₀ exp(½ωt)
// 1 2 3：ω の向き / ↑↓ 回る速さ / ← → 時間のきざみ Δt / スペース：一時停止 / R：最初から
// ============================================

const OMEGAS = [[1, 0.02, 0.01], [1, 0.3, 0], [0.1, 1, 0]];   // ★ 機体の軸での角速度の向き（1：ピッチ 90° のすぐ近くを通る 2：73° まで 3：ヨー中心）
let preset = 0, speed = 1.2, dt = 0.02, paused = false;
let tNow, qInt, angInt, hist;
const VIEW = qMul(qAxisAngle([1, 0, 0], 0.35), qAxisAngle([0, 1, 0], -0.6));
let sc;

function setup() { createCanvas(windowWidth, windowHeight, WEBGL); hudMake(); selfTest(); resetAll(); }
function omegaBody() { return v3Scl(v3Unit(OMEGAS[preset]), speed); }
function resetAll() { tNow = 0; qInt = [1, 0, 0, 0]; angInt = [0, 0, 0]; hist = []; }
function eulerQ(a) { return qMul(qMul(qAxisAngle([0, 1, 0], a[0]), qAxisAngle([1, 0, 0], a[1])), qAxisAngle([0, 0, 1], a[2])); }
// 四元数：dq/dt = ½ q ω（ω は機体の軸での純四元数）を RK4 で 1 きざみ
function quatRK4(q, w, h) {
  let f = (x) => qScl(qMul(x, [0, ...w]), 0.5);
  let k1 = f(q), k2 = f(qAdd(q, qScl(k1, h / 2))), k3 = f(qAdd(q, qScl(k2, h / 2))), k4 = f(qAdd(q, qScl(k3, h)));
  return qUnit(qAdd(q, qScl(qAdd(qAdd(k1, qScl(k2, 2)), qAdd(qScl(k3, 2), k4)), h / 6)));
}
// オイラー角：角の速さ = J⁻¹ (R ω)。J の列 = ヨー・ピッチ・ロールの軸（05 と同じ）。cos θ → 0 で割り算が爆発する
function eulerRates(a, w) {
  let qy = qAxisAngle([0, 1, 0], a[0]), cols = [[0, 1, 0], qRot(qy, [1, 0, 0]), qRot(qMul(qy, qAxisAngle([1, 0, 0], a[1])), [0, 0, 1])];
  let wW = qRot(eulerQ(a), w), det = v3Dot(cols[0], v3Cross(cols[1], cols[2]));
  if (Math.abs(det) < 1e-12) det = det < 0 ? -1e-12 : 1e-12;
  let r = [v3Dot(wW, v3Cross(cols[1], cols[2])) / det, v3Dot(cols[0], v3Cross(wW, cols[2])) / det, v3Dot(cols[0], v3Cross(cols[1], wW)) / det];   // クラメルの公式
  return r.map((v) => clampv(v, -1e4, 1e4));
}
function eulerRK4(a, w, h) {
  let k1 = eulerRates(a, w), k2 = eulerRates(v3Add(a, v3Scl(k1, h / 2)), w), k3 = eulerRates(v3Add(a, v3Scl(k2, h / 2)), w), k4 = eulerRates(v3Add(a, v3Scl(k3, h)), w);
  return v3Add(a, v3Scl(v3Add(v3Add(k1, v3Scl(k2, 2)), v3Add(v3Scl(k3, 2), k4)), h / 6)).map((v) => clampv(v, -1e6, 1e6));
}
function exactQ(t, w) { return qExp(qScl([0, ...w], t / 2)); }   // ω が一定なら q(t) = exp(½ω t)

function draw() {
  background(14, 17, 32);
  sc = Math.min(width, height) * 0.13;
  let w = omegaBody();
  if (!paused) {
    qInt = quatRK4(qInt, w, dt); angInt = eulerRK4(angInt, w, dt); tNow += dt;
    let qe = exactQ(tNow, w), pitch = Math.asin(clampv(-qToMat(qe)[1][2], -1, 1));
    hist.push([tNow, Math.max(1e-16, qAngle(qInt, qe)), Math.max(1e-16, qAngle(eulerQ(angInt), qe)), pitch]);
    if (hist.length > 600) hist.shift();
  }
  let V = (v) => qRot(VIEW, v), qe = exactQ(tNow, w), d = width * 0.2 / sc;
  glParts(PLANE_PARTS, (v) => V(qRot(qInt, v)), sc, [-d, -1.0, 0]);
  glParts(PLANE_PARTS, (v) => V(qRot(eulerQ(angInt), v)), sc, [d, -1.0, 0]);
  glWire(PLANE_PARTS, (v) => V(qRot(qe, v)), sc, [255, 255, 255], [-d, -1.0, 0]);
  glWire(PLANE_PARTS, (v) => V(qRot(qe, v)), sc, [255, 255, 255], [d, -1.0, 0]);
  // ω の矢印（機体の軸 → いまの姿勢で回して表示）
  glArrow([-d, -1.0, 0], v3Add([-d, -1.0, 0], V(qRot(qInt, v3Scl(v3Unit(w), 1.6)))), sc, [255, 200, 80], 3);
  if (frameCount % 2 === 1) drawHud(w);
  hudShow();
}

function drawHud(w) {
  let g = hud, last = hist[hist.length - 1] || [0, 1e-16, 1e-16, 0];
  g.clear(); g.noStroke(); g.textAlign(LEFT, BASELINE);
  g.fill(240); g.textSize(20); g.text('角速度の積分　dq/dt = ½ q ω（RK4）と、オイラー角の積分', 20, 34);
  g.fill(175); g.textSize(15);
  g.text('1 2 3：ω の向き　↑↓ 速さ |ω| = ' + speed.toFixed(1) + ' rad/s　← → Δt = ' + dt.toFixed(3) + ' s　スペース：一時停止　R：最初から', 20, 60);
  g.text('白い針金 = 正しい答え q₀ exp(½ωt)。金の矢印 = 角速度 ω（機体の軸で一定）', 20, 84);
  g.textAlign(CENTER, BASELINE); g.textSize(17);
  g.fill(130, 230, 150); g.text('四元数で積分', width * 0.3, height - 64);
  g.fill(255, 150, 120); g.text('オイラー角で積分', width * 0.7, height - 64);
  g.textSize(15); g.fill(220);
  g.text('誤差 ' + last[1].toExponential(1) + ' rad', width * 0.3, height - 40);
  g.text('誤差 ' + last[2].toExponential(1) + ' rad　角 = (' + angInt.map((v) => ((v * 180) / Math.PI).toFixed(0) + '°').join(', ') + ')', width * 0.7, height - 40);
  g.textAlign(LEFT, BASELINE);
  let gr = { x: width - 400, y: 125, w: 360, h: 140, x0: hist.length ? hist[0][0] : 0, x1: Math.max(tNow, 1e-3), y0: 1e-16, y1: 10, logy: true };
  plotAxes(gr, '時間 t [s]', '姿勢の誤差 [rad]（対数）', [gr.x0, gr.x1], [1e-16, 1e-8, 1], g);
  g.strokeWeight(2);
  g.stroke(130, 230, 150); polyline(hist.map((e) => [gX(gr, e[0]), gY(gr, e[1])]), g);
  g.stroke(255, 150, 120); polyline(hist.map((e) => [gX(gr, e[0]), gY(gr, e[2])]), g);
  // ピッチの角（±90° の近くが危ない）
  let gp = { x: width - 400, y: 310, w: 360, h: 70, x0: gr.x0, x1: gr.x1, y0: -Math.PI / 2, y1: Math.PI / 2 };
  g.noFill(); g.stroke(95); g.strokeWeight(1); g.rect(gp.x, gp.y, gp.w, gp.h);
  g.stroke(255, 200, 80); g.strokeWeight(2); polyline(hist.map((e) => [gX(gp, e[0]), gY(gp, e[3])]), g);
  g.noStroke(); g.fill(180); g.textSize(12); g.text('正しい姿勢のピッチ（上下のはし = ±90°）', gp.x, gp.y - 6);
  g.fill(200); g.textSize(14);
  ['ジャイロセンサー（スマホ・ドローン・宇宙機）は機体の軸まわりの ω を測る。', 'それを dq/dt = ½ q ω で積分して向きを求める（ずれは加速度・地磁気センサーで補正）。',
   'オイラー角の式は cos(ピッチ) で割るので、±90° の近くで誤差が大きくなる。'].forEach((s, n) => g.text(s, 20, 120 + n * 22));
  drawSelfTest(width - 170, height - 12, g);
}

function keyPressed() {
  if (key === '1' || key === '2' || key === '3') { preset = +key - 1; resetAll(); }
  if (key === UP_ARROW) { speed = Math.min(4, speed + 0.4); resetAll(); }
  if (key === DOWN_ARROW) { speed = Math.max(0.4, speed - 0.4); resetAll(); }
  if (key === RIGHT_ARROW) { dt = Math.min(0.1, dt * 1.5); resetAll(); }
  if (key === LEFT_ARROW) { dt = Math.max(0.002, dt / 1.5); resetAll(); }
  if (key === ' ') paused = !paused;
  if (key === 'r' || key === 'R') resetAll();
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = []; seedRng(9);
  let w = v3Scl(v3Unit(OMEGAS[0]), 1.2), q = [1, 0, 0, 0], a = [0, 0, 0], h = 0.01, eq = 0, ea = 0;
  for (let n = 1; n <= 1000; n++) { q = quatRK4(q, w, h); a = eulerRK4(a, w, h); eq = Math.max(eq, qAngle(q, exactQ(n * h, w))); ea = Math.max(ea, qAngle(eulerQ(a), exactQ(n * h, w))); }
  check('四元数の RK4（1000 きざみ）：|q| = 1、正しい答え exp(½ωt) との差 ' + eq.toExponential(1) + ' rad', Math.abs(qNorm(q) - 1) < 1e-14 && eq < 1e-9);
  check('同じ ω をオイラー角で積分：ピッチ 90° の近くを通ると誤差 ' + ea.toExponential(1) + ' rad（四元数の 1000 倍以上）', ea > 1000 * eq);
  let e3 = 0;
  for (let t = 0; t < 100; t++) {
    let ang = [(rnd() - 0.5) * 6, (rnd() - 0.5) * 2.8, (rnd() - 0.5) * 6], ww = [rndNormal(), rndNormal(), rndNormal()], r = eulerRates(ang, ww);
    let qy = qAxisAngle([0, 1, 0], ang[0]), cols = [[0, 1, 0], qRot(qy, [1, 0, 0]), qRot(qMul(qy, qAxisAngle([1, 0, 0], ang[1])), [0, 0, 1])];
    e3 = Math.max(e3, v3Dist(v3Add(v3Add(v3Scl(cols[0], r[0]), v3Scl(cols[1], r[1])), v3Scl(cols[2], r[2])), qRot(eulerQ(ang), ww)));
  }
  check('角の速さの式：J · (dψ/dt, dθ/dt, dφ/dt) = R ω（ピッチが ±90° から離れていれば）', e3 < 1e-10);
  let w3 = [0, 0.8, 0], a3 = [0, 0, 0]; for (let n = 1; n <= 1000; n++) a3 = eulerRK4(a3, w3, 0.01);
  check('ヨーだけ（ピッチ 0 のまま）ならオイラー角でも正確：ψ = 0.8 × 10 = 8 rad', near(a3[0], 8, 1e-9) && near(a3[1], 0, 1e-12));
  let e5 = 0; for (let t = 0; t < 50; t++) { let ww = [rndNormal(), rndNormal(), rndNormal()], tt = rnd() * 5; e5 = Math.max(e5, qDist(exactQ(tt, ww), qAxisAngle(ww, v3Len(ww) * tt))); }
  check('exp(½ωt) = 軸 ω/|ω| まわりに |ω|t 回す四元数', e5 < 1e-12);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 1 で再生。ピッチのグラフが ±90° に近づいたとき、オレンジの誤差はどうなる？ 右の飛行機は？
// 2. 3（ヨー中心）にすると、オイラー角でも誤差は小さい。なぜ？
// 3. ← → で Δt を変えよう。緑の誤差（RK4 の誤差）は Δt⁴ に比例する？
// 4. quatRK4 の qUnit を外すと |q| はどうなる？（ゆっくりずれる）
// 5. ω を時間で変えてみよう（omegaBody に Math.sin(tNow) を入れる）。そのときは正しい答えの式がない → 実際のジャイロと同じ


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
// ---- グラフの道具：g = { x, y, w, h, x0, x1, y0, y1, logy }、cv = 描く先（省略で画面）
function gX(g, v) { return g.x + clampv((v - g.x0) / (g.x1 - g.x0), -0.02, 1.02) * g.w; }
function gY(g, v) { let t = g.logy ? (Math.log10(Math.max(v, 1e-300)) - Math.log10(g.y0)) / (Math.log10(g.y1) - Math.log10(g.y0)) : (v - g.y0) / (g.y1 - g.y0); return g.y + g.h - clampv(t, -0.02, 1.02) * g.h; }
function plotAxes(g, xl, yl, xt, yt, cv) {
  cv = cv || window;
  cv.stroke(95); cv.strokeWeight(1); cv.noFill(); cv.rect(g.x, g.y, g.w, g.h);
  cv.noStroke(); cv.fill(165); cv.textSize(12); cv.textAlign(CENTER, TOP);
  for (let v of xt) cv.text(+v.toPrecision(3), gX(g, v), g.y + g.h + 4);
  cv.textAlign(RIGHT, CENTER);
  for (let v of yt) cv.text(g.logy ? '1e' + Math.round(Math.log10(v)) : +v.toPrecision(3), g.x - 5, gY(g, v));
  cv.textAlign(LEFT, BASELINE); cv.fill(205); cv.textSize(13);
  cv.text(xl, g.x + g.w - cv.textWidth(xl), g.y + g.h + 32); cv.text(yl, g.x, g.y - 8);
}
function polyline(pts, cv) {           // 点が 2 つ以上あるときだけ折れ線を描く
  cv = cv || window;
  if (pts.length < 2) return;
  cv.noFill(); cv.beginShape(); for (let p of pts) cv.vertex(p[0], p[1]); cv.endShape();
}
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
