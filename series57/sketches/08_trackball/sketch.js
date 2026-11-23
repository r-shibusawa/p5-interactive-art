// ============================================
// 08 3D の物体操作（アークボール）─ 回転を四元数で積み重ねる
// ドラッグの 2 点を球面に写し、a を b に重ねる回転 dq = (1 + a·b, a × b)/|…| を作って q ← dq q と積み重ねる
// 同じ回転を「行列を掛け続ける」方法でも積み重ねて、誤差（直交からのずれ）を比べる
//   1：正確な小回転を float32 で掛ける（ずれは小さいが増えていく）　2：小さい角の近似 M ← M + [ω]×M Δt（ずれが目に見える）
// ドラッグ：回す / スペース：自動で回し続ける（1 フレームに 200 回）/ 1 2：更新のしかた / N：四元数の正規化 ON/OFF / R：最初から
// ============================================

let qAcc = [1, 0, 0, 0], mAcc, steps = 0, method = 1, normOn = true, autoSpin = false;
let dragFrom = null, errHist = [];
const PER_FRAME = 200;                 // ★ 自動回転で 1 フレームに積み重ねる回数
const OMEGA_DT = 0.01;                 // ★ 1 回の小さな回転の角（ラジアン）
const VIEW = qAxisAngle([1, 0, 0], 0.25);
let sc;

function setup() { createCanvas(windowWidth, windowHeight, WEBGL); hudMake(); selfTest(); resetAll(); }
function resetAll() { qAcc = [1, 0, 0, 0]; mAcc = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]; steps = 0; errHist = []; }
function f32m(m) { return m.map((r) => r.map(Math.fround)); }   // 行列の成分を float32 に丸める（GPU やゲームでよく使う精度）
function skewMul(w, m) {               // [ω]× M（ω × 各列）
  let cols = [0, 1, 2].map((c) => v3Cross(w, [m[0][c], m[1][c], m[2][c]]));
  return [0, 1, 2].map((r) => [0, 1, 2].map((c) => cols[c][r]));
}
// 角速度ベクトル w（= 軸 × 角）の小さな回転を 1 回積み重ねる
function applyStep(w) {
  if (method === 1) {
    let dq = qAxisAngle(w, v3Len(w));
    qAcc = qMul(dq, qAcc); mAcc = f32m(matMul(qToMat(dq), mAcc));
  } else {
    qAcc = qAdd(qAcc, qScl(qMul([0, ...w], qAcc), 0.5));                 // q ← q + ½ ω q Δt（1 次の近似）
    mAcc = f32m([0, 1, 2].map((r) => [0, 1, 2].map((c) => mAcc[r][c] + skewMul(w, mAcc)[r][c])));
  }
  if (normOn) qAcc = qUnit(qAcc);
  steps++;
}

function draw() {
  background(15, 18, 32);
  sc = Math.min(width, height) * 0.12;
  if (matOrthoErr(mAcc) > 3 || qNorm(qAcc) > 4) autoSpin = false;   // ずれすぎたら止める（R でやり直し）
  if (autoSpin) for (let n = 0; n < PER_FRAME; n++) { let t = steps * 0.002; applyStep(v3Scl(v3Unit([Math.sin(t), Math.cos(1.3 * t), 0.6]), OMEGA_DT)); }
  if (mouseIsPressed && dragFrom) {
    let to = arcballVec(mouseX, mouseY), dq = arcballQ(dragFrom, to), ang = 2 * Math.acos(clampv(dq[0], -1, 1));
    if (ang > 1e-6 && matOrthoErr(mAcc) < 3 && qNorm(qAcc) < 4) applyStep(v3Scl(v3Unit(dq.slice(1)), ang));
    dragFrom = to;
  }
  if (frameCount % 3 === 0) { errHist.push([steps, Math.max(1e-17, matOrthoErr(qToMat(qUnit(qAcc))), Math.abs(qNorm(qAcc) - 1)), Math.max(1e-17, matOrthoErr(mAcc))]); if (errHist.length > 400) errHist.shift(); }
  let V = (v) => qRot(VIEW, v), d = width * 0.22 / sc;
  let cube = [{ c: [0, 0, 0], h: [0.9, 0.9, 0.9], col: [230, 230, 235] }, { c: [0, 0, 0.95], h: [0.3, 0.3, 0.08], col: [240, 110, 90] }, { c: [0.95, 0, 0], h: [0.08, 0.3, 0.3], col: [90, 200, 235] }, { c: [0, 0.95, 0], h: [0.3, 0.08, 0.3], col: [245, 200, 80] }];
  glParts(cube, (v) => V(qRot(qAcc, v)), sc, [-d, -0.1, 0]);
  glParts(cube, (v) => V(matVec(mAcc, v)), sc, [d, -0.1, 0]);
  if (frameCount % 2 === 1) drawHud();
  hudShow();
}

function drawHud() {
  let g = hud; g.clear(); g.noStroke(); g.textAlign(LEFT, BASELINE);
  g.fill(240); g.textSize(20); g.text('アークボールと誤差　' + (method === 1 ? '1：正確な小回転を float32 の行列で' : '2：小さい角の近似で更新'), 20, 34);
  g.fill(175); g.textSize(15);
  g.text('ドラッグ：回す　スペース：自動で回し続ける（1 フレーム ' + PER_FRAME + ' 回）　1 2：更新のしかた　N：四元数の正規化 ' + (normOn ? 'ON' : 'OFF') + '　R：最初から', 20, 60);
  let qn = qNorm(qAcc), oe = matOrthoErr(mAcc);
  g.textAlign(CENTER, BASELINE); g.textSize(17);
  g.fill(130, 230, 150); g.text(normOn ? '四元数 q で積み重ね（毎回 |q| = 1 にもどす）' : '四元数 q で積み重ね（もどさない）', width * 0.28, height - 170);
  g.fill(255, 170, 120); g.text('回転行列 M を掛け続ける（もどさない）', width * 0.72, height - 170);
  g.textSize(15); g.fill(220);
  g.text('|q| − 1 = ' + (qn - 1).toExponential(2), width * 0.28, height - 144);
  g.text('|MᵀM − I| = ' + oe.toExponential(2) + '　det M = ' + matDet(mAcc).toFixed(6), width * 0.72, height - 144);
  g.textAlign(LEFT, BASELINE);
  // 誤差のグラフ（片対数）
  let gr = { x: width - 380, y: 120, w: 340, h: 150, x0: errHist.length ? errHist[0][0] : 0, x1: Math.max(1, steps, (errHist.length ? errHist[0][0] : 0) + 1), y0: 1e-17, y1: 10, logy: true };
  plotAxes(gr, '積み重ねた回数', '誤差（対数）', [gr.x0, gr.x1], [1e-16, 1e-8, 1], g);
  g.strokeWeight(2);
  g.stroke(130, 230, 150); polyline(errHist.map((e) => [gX(gr, e[0]), gY(gr, e[1])]), g);
  g.stroke(255, 170, 120); polyline(errHist.map((e) => [gX(gr, e[0]), gY(gr, e[2])]), g);
  g.noStroke(); g.fill(200); g.textSize(14);
  g.text('回数 = ' + steps + (matOrthoErr(mAcc) > 3 || qNorm(qAcc) > 4 ? '　ずれが大きすぎるので止めた → R でやり直し' : ''), 20, 100);
  g.text(method === 1 ? '正確な回転でも、float32 の丸め誤差が積もって M は少しずつ回転でなくなる' : '近似の更新では 1 回ごとに (1 + (ωΔt)²) 倍のびる → 物体がふくらむ・ゆがむ', 20, 124);
  g.text('四元数は 4 つの数を割り算 1 回で |q| = 1 にもどせる（行列は 9 つの数を直交化しないといけない）', 20, 148);
  drawSelfTest(width - 170, height - 12, g);
}

function mousePressed() { dragFrom = arcballVec(mouseX, mouseY); }
function mouseReleased() { dragFrom = null; }
function keyPressed() {
  if (key === ' ') autoSpin = !autoSpin;
  if (key === '1') { method = 1; resetAll(); }
  if (key === '2') { method = 2; resetAll(); }
  if (key === 'n' || key === 'N') normOn = !normOn;
  if (key === 'r' || key === 'R') resetAll();
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = []; seedRng(8);
  let e1 = 0;
  for (let t = 0; t < 100; t++) { let a = v3Unit([rndNormal(), rndNormal(), rndNormal()]), b = v3Unit([rndNormal(), rndNormal(), rndNormal()]); if (v3Dot(a, b) > -0.99) e1 = Math.max(e1, v3Dist(qRot(arcballQ(a, b), a), b)); }
  check('アークボールの dq は点 a を点 b に重ねる', e1 < 1e-12);
  let q = [1, 0, 0, 0], m64 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], m32 = m64, ws = [];
  for (let t = 0; t < 20000; t++) ws.push(v3Scl(v3Unit([rndNormal(), rndNormal(), rndNormal()]), OMEGA_DT));
  for (let w of ws) { let dq = qAxisAngle(w, v3Len(w)); q = qUnit(qMul(dq, q)); m64 = matMul(qToMat(dq), m64); m32 = f32m(matMul(qToMat(dq), m32)); }
  check('積み重ねた q の行列 = 積み重ねた行列（float64、20000 回で差 ' + matDiff(qToMat(q), m64).toExponential(1) + '）', matDiff(qToMat(q), m64) < 1e-10);
  check('float64 で正確な小回転なら行列のずれは小さい（' + matOrthoErr(m64).toExponential(1) + '）、float32 だと大きい（' + matOrthoErr(m32).toExponential(1) + '）', matOrthoErr(m64) < 1e-11 && matOrthoErr(m32) > 100 * matOrthoErr(m64));
  let qa = [1, 0, 0, 0], ma = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  for (let w of ws.slice(0, 10000)) { qa = qUnit(qAdd(qa, qScl(qMul([0, ...w], qa), 0.5))); ma = ma.map((r, ri) => r.map((v, ci) => v + skewMul(w, ma)[ri][ci])); }
  check('近似の更新 10000 回：行列は大きくずれる（' + matOrthoErr(ma).toExponential(1) + '）が、正規化した q は回転のまま', matOrthoErr(ma) > 0.1 && matOrthoErr(qToMat(qa)) < 1e-14 && Math.abs(qNorm(qa) - 1) < 1e-15);
  let qb = [1, 0, 0, 0]; for (let w of ws.slice(0, 10000)) qb = qAdd(qb, qScl(qMul([0, ...w], qb), 0.5));
  check('正規化しないと |q| ものびる：|q| = ' + qNorm(qb).toFixed(3) + ' = (1 + (ωΔt/2)²)^(n/2)', near(qNorm(qb), Math.pow(1 + (OMEGA_DT * OMEGA_DT) / 4, 5000), 1e-9));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 2 を押してからスペース。右の箱はどうなる？ 左の箱は？ グラフのオレンジ線は？
// 2. N で四元数の正規化を OFF にすると、左の箱はどうなる？（|q| がのびると q v q* は |q|² 倍にのびる）
// 3. 1 にもどしてスペース。float32 のずれはどのくらいの速さで増える？（回数を 10 倍にすると誤差は？）
// 4. 行列を直交化する（グラム-シュミット）コードを書いて、右の箱にも使ってみよう
// 5. arcballQ の (1 + a·b, a × b) は「a から b への回転の半分の角」の四元数。なぜ 1 + a·b なのか考えよう


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
