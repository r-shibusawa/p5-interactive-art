// ============================================
// 06 球面線形補間（slerp）─ 2 つの姿勢の間をなめらかに
// lerp：q₀ と q₁ をまっすぐ結んでから長さを 1 にもどす（nlerp）。slerp：S³ の大円の上を一定の速さで進む
//   slerp(q₀, q₁, t) = [sin((1−t)Ω) q₀ + sin(tΩ) q₁] / sin Ω = q₀ (q₀⁻¹q₁)^t
// スペース：再生/停止 / ← → t を動かす / ↑↓ 2 つの姿勢の間の角 / N：近い方の道（q と −q）/ K：4 つのキー姿勢をつなぐ / R：ランダム
// ============================================

let angleDeg = 150;                    // ★ 2 つの姿勢の間の回転角（度）
let axis = v3Unit([0.3, 1, 0.5]);     // ★ 回転軸
let tt = 0, playing = true, shortest = true, keyMode = false, keys4 = [];
const NS = 120;                        // ★ グラフの分割数
const SPEED = 0.004;                   // ★ 再生の速さ
const VIEW = qMul(qAxisAngle([1, 0, 0], 0.5), qAxisAngle([0, 1, 0], -1.1));   // 斜め横から見る

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); seedRng(66); newKeys(); }
function newKeys() { keys4 = [[1, 0, 0, 0]]; for (let n = 1; n < 4; n++) keys4.push(qUnit(qMul(keys4[n - 1], qAxisAngle([rndNormal(), rndNormal(), rndNormal()], 1.2 + rnd())))); }
function poses() { let q0 = qAxisAngle([1, 0, 0], -0.3), q1 = qMul(qAxisAngle(axis, (angleDeg * Math.PI) / 180), q0); return [q0, q1]; }
function speeds(fn) {                  // 角速度（1 あたりの回転角）を数値微分で
  let out = [], prev = fn(0);
  for (let s = 1; s <= NS; s++) { let cur = fn(s / NS); out.push([(s - 0.5) / NS, qAngle(prev, cur) * NS]); prev = cur; }
  return out;
}
function keyPose(u) {                  // K：キー姿勢 0→1→2→3→0 を slerp でつなぐ
  let n = Math.floor(u * 4) % 4, f = u * 4 - Math.floor(u * 4);
  return qSlerp(keys4[n], keys4[(n + 1) % 4], f, true);
}

function draw() {
  background(16, 19, 36);
  if (playing) tt = (tt + SPEED) % 1;
  let [q0, q1] = poses(), sl = (t) => qSlerp(q0, q1, t, shortest), nl = (t) => qNlerp(q0, q1, t, shortest);
  let cols = [[255, 150, 90], [110, 200, 255]], fns = keyMode ? [keyPose, keyPose] : [nl, sl], names = ['lerp（正規化）', 'slerp'];
  for (let m = 0; m < 2; m++) {
    if (keyMode && m === 0) continue;
    let view = { x: keyMode ? width * 0.28 : width * (0.15 + 0.27 * m), y: height * 0.5, s: Math.min(width, height) * (keyMode ? 0.2 : 0.14), d: 8 };
    let toView = (q) => qMul(VIEW, q);
    // 機首の先が通る点（t を等間隔に 24 個）：間隔がそろっていれば速さが一定
    for (let s = 0; s <= 24; s++) { let p = projP(qRot(toView(fns[m](s / 24)), [0, 0, 1.05]), view); noStroke(); fill(...cols[m], 170); circle(p[0], p[1], 7); }
    if (!keyMode) { drawParts2D(PLANE_PARTS, toView(q0), view, 50); drawParts2D(PLANE_PARTS, toView(q1), view, 50); }
    drawParts2D(PLANE_PARTS, toView(fns[m](tt)), view);
    fill(...cols[m]); noStroke(); textSize(18); textAlign(CENTER, BASELINE); text(keyMode ? 'キー姿勢 4 つを slerp でつなぐ' : names[m], view.x, height * 0.5 + view.s * 2.4); textAlign(LEFT, BASELINE);
  }
  // ---- 角速度のグラフ
  let g = { x: width * 0.6, y: 150, w: width * 0.36, h: height * 0.36, x0: 0, x1: 1, y0: 0, y1: 0 };
  let sp = [speeds(nl), speeds(sl)], kp = keyMode ? speeds(keyPose) : null;
  g.y1 = Math.max(...(keyMode ? kp : sp[0].concat(sp[1])).map((p) => p[1])) * 1.25 + 1e-6;
  plotAxes(g, 't', '角速度 dθ/dt [rad / 単位時間]', [0, 0.25, 0.5, 0.75, 1], [0, g.y1 / 2, g.y1]);
  strokeWeight(3);
  if (keyMode) { stroke(...cols[1]); polyline(kp.map((p) => [gX(g, p[0]), gY(g, p[1])])); }
  else for (let m = 0; m < 2; m++) { stroke(...cols[m]); polyline(sp[m].map((p) => [gX(g, p[0]), gY(g, p[1])])); }
  stroke(255, 255, 255, 120); strokeWeight(1); line(gX(g, tt), g.y, gX(g, tt), g.y + g.h);
  // ---- 数値
  let tx = g.x, ty = g.y + g.h + 70, om = Math.acos(clampv(Math.abs(qDot(q0, q1)), 0, 1)), dotv = qDot(q0, q1);
  fill(230); noStroke(); textSize(15);
  if (!keyMode) {
    let vs = sp[1].map((p) => p[1]), vn = sp[0].map((p) => p[1]);
    text('2 つの姿勢の間の回転角 = ' + angleDeg + '°　q₀·q₁ = ' + dotv.toFixed(3) + (dotv < 0 ? '（負 → ' + (shortest ? '−q₁ を使う：近い方の道' : 'そのまま：遠い方の道') + '）' : ''), tx, ty, width - tx - 20, 50);
    fill(...cols[1]); text('slerp：最大 ' + Math.max(...vs).toFixed(4) + '　最小 ' + Math.min(...vs).toFixed(4) + '（一定 = 回転角）', tx, ty + 50);
    fill(...cols[0]); text('lerp ：最大 ' + Math.max(...vn).toFixed(4) + '　最小 ' + Math.min(...vn).toFixed(4) + '（まん中で速い）', tx, ty + 74);
    fill(200); text('t = ' + tt.toFixed(3) + '　slerp の S³ 上の角 Ω = ' + ((om * 180) / Math.PI).toFixed(1) + '°（回転角の半分）', tx, ty + 104);
  } else { fill(200); text('キーの間では一定の速さ。キーのところで向きと速さが急に変わる（もっとなめらかにするには squad などの曲線）', tx, ty, width - tx - 20, 60); }

  fill(240); textSize(20);
  text('球面線形補間 slerp　まっすぐ結ぶ lerp と、大円の上を一定の速さで進む slerp', 20, 36);
  fill(175); textSize(15);
  text('スペース：再生/停止　← → t　↑↓ 姿勢の間の角 ±30°　N：近い方の道 ON/OFF（q と −q）　K：キー姿勢 4 つ　R：ランダム', 20, 62);
  text('点 = 機首の先の通り道（t を等間隔に 24 個）。うすい物体 = はじめと終わりの姿勢', 20, 86);
  drawSelfTest(width - 170, height - 12);
}

function keyPressed() {
  if (key === ' ') playing = !playing;
  if (key === RIGHT_ARROW) tt = Math.min(1, tt + 0.05);
  if (key === LEFT_ARROW) tt = Math.max(0, tt - 0.05);
  if (key === UP_ARROW) angleDeg = Math.min(330, angleDeg + 30);
  if (key === DOWN_ARROW) angleDeg = Math.max(30, angleDeg - 30);
  if (key === 'n' || key === 'N') shortest = !shortest;
  if (key === 'k' || key === 'K') keyMode = !keyMode;
  if (key === 'r' || key === 'R') { axis = v3Unit([Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5]); newKeys(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = []; seedRng(6);
  let e1 = 0, e2 = 0, e3 = 0, e4 = 0;
  for (let t = 0; t < 100; t++) {
    let a = qRandom(), b = qRandom(), om = qAngle(a, b);
    e1 = Math.max(e1, qDist(qSlerp(a, b, 0, true), a), Math.min(qDist(qSlerp(a, b, 1, true), b), qDist(qSlerp(a, b, 1, true), qScl(b, -1))));
    for (let s = 0; s <= 10; s++) {
      let u = s / 10, m = qSlerp(a, b, u, true);
      e2 = Math.max(e2, Math.abs(qAngle(a, m) - u * om));
      e3 = Math.max(e3, Math.abs(qNorm(m) - 1));
      let bb = qDot(a, b) < 0 ? qScl(b, -1) : b; e4 = Math.max(e4, qDist(m, qMul(a, qExp(qScl(qLog(qMul(qConj(a), bb)), u)))));
    }
  }
  check('slerp の両はし：t = 0 で q₀、t = 1 で q₁（または −q₁）', e1 < 1e-12);
  check('slerp は一定の角速度：回転角(q₀, slerp(t)) = t × 回転角(q₀, q₁)', e2 < 1e-7);
  check('slerp の結果はいつも単位四元数', e3 < 1e-12);
  check('slerp(q₀, q₁, t) = q₀ exp(t log(q₀⁻¹q₁))', e4 < 1e-12);
  let q0 = [1, 0, 0, 0], q1 = qAxisAngle([0, 1, 0], (150 * Math.PI) / 180), vn = speeds((u) => qNlerp(q0, q1, u, true)).map((p) => p[1]);
  check('lerp（正規化）は速さが一定でない：150° で最大/最小 = ' + (Math.max(...vn) / Math.min(...vn)).toFixed(2), Math.max(...vn) / Math.min(...vn) > 1.5);
  let qa = qAxisAngle([0, 0, 1], 0.2), qb = qScl(qAxisAngle([0, 0, 1], 0.5), -1);
  check('近い方の道：q₀·q₁ < 0 なら −q₁ を使うと、回る角は 0.3 rad（遠い道なら 2π − 0.3）', near(qAngle(qa, qSlerp(qa, qb, 1, true)), 0.3, 1e-12) && near(2 * Math.acos(qDot(qa, qSlerp(qa, qb, 1, false))), 2 * Math.PI - 0.3, 1e-9));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. ↑↓ で角を 30° にしよう。lerp と slerp のグラフの差は？ 150° にすると？（小さい角なら lerp でも十分）
// 2. 角を 210° 以上にして N を押そう。遠い方の道では、機体はどちらに回る？
// 3. K で 4 つのキー姿勢をつなごう。グラフのキーのところでどうなっている？
// 4. 回転行列の成分をそのまま lerp するとどうなる？（行列が回転でなくなり、物体がつぶれる）
// 5. ゲームやアニメのカメラ・キャラクターの向きの補間には slerp（とその仲間）が使われている


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
