// ============================================
// 07 二重被覆とベルトのトリック ─ 360° ではもどらず、720° でもどる
// 壁と物体をベルトでつなぐ。ベルトの各点の向きを単位四元数 q(s)（s = 0 壁 → 1 物体）で表す
// 物体を 360° 回すと物体の q は −1（向きは元どおり）。ベルトのねじれは、物体を動かしても（向きは変えずに）取れない
// 720° 回すと q = +1 にもどり、ベルトを物体のまわりにくぐらせるとねじれが取れる。q と −q は同じ回転（S³ → SO(3) は 2 対 1）
// 1：360° / 2：720° / スペース：再生/停止 / ← → 少しずつ / R：最初から
// ============================================

let beltMode = 2;                          // 1 = 360°、2 = 720°
let phase = 0, playing = true;         // phase：0〜1 回す、1〜2 ベルトを動かす
const SPEED = 0.004;                   // ★ 再生の速さ
const NSEG = 64;                       // ★ ベルトの分割数
const BELT_LEN = 5.2, BELT_W = 0.32;   // ★ ベルトの長さと幅
const VIEW = qMul(qAxisAngle([1, 0, 0], 0.45), qAxisAngle([0, 1, 0], -0.35));
let sc;

function setup() { createCanvas(windowWidth, windowHeight, WEBGL); hudMake(); selfTest(); }
function swing(u) { return [Math.cos(Math.PI * u), Math.sin(Math.PI * u), 0]; }   // b(u)：i → j → −i
function expV(v, a) { return qExp([0, v[0] * a, v[1] * a, v[2] * a]); }         // exp(a·v)（v は単位の純四元数）
function beltQ(md, s, ph) {            // ベルトの点 s の向き（md = 1：360°、2：720°）
  if (ph <= 1) return expV([1, 0, 0], md * Math.PI * s * ph);                      // 物体を x 軸まわりに回す（ねじれが増える）
  let u = ph - 1;
  if (md === 1) return expV(swing(u), Math.PI * s);                               // 端は exp(π b) = −1 のまま
  return qMul(expV([1, 0, 0], Math.PI * s), expV(swing(u), Math.PI * s));         // 端は (−1)(−1) = +1、u = 1 で全部 1
}
function beltShape(md, ph) {           // ベルトの中心線 = 各点の接線 R(q)·e_x をつないだもの（物体は動いてよい）
  let c = [-BELT_LEN / 2, 0, 0], out = [];
  for (let n = 0; n <= NSEG; n++) {
    let q = beltQ(md, n / NSEG, ph);
    out.push({ c, q });
    c = v3Add(c, v3Scl(qRot(q, [1, 0, 0]), BELT_LEN / NSEG));
  }
  return out;
}

function draw() {
  background(16, 18, 34);
  sc = Math.min(width, height) * 0.13;
  if (playing) phase = (phase + SPEED) % 2;
  let V = (v) => qRot(VIEW, v), B = beltShape(beltMode, phase);
  // 壁
  noStroke(); fill(90, 96, 120);
  beginShape(); for (let c of [[-1, -1.3], [-1, 1.3], [1, 1.3], [1, -1.3]]) glV(V([-BELT_LEN / 2 - 0.05, c[0] * 1.3, c[1]]), sc); endShape(CLOSE);
  // ベルト：表（金）と裏（青）で色を変える
  for (let n = 0; n < NSEG; n++) {
    let a = B[n], b = B[n + 1], wa = v3Scl(qRot(a.q, [0, 0, 1]), BELT_W), wb = v3Scl(qRot(b.q, [0, 0, 1]), BELT_W);
    let nrm = qRot(VIEW, qRot(a.q, [0, 1, 0])), front = nrm[2] > 0;
    fill(front ? color(255, 200, 80) : color(80, 150, 255)); noStroke();
    beginShape(); glV(V(v3Add(a.c, wa)), sc); glV(V(v3Add(b.c, wb)), sc); glV(V(v3Sub(b.c, wb)), sc); glV(V(v3Sub(a.c, wa)), sc); endShape(CLOSE);
  }
  // 物体（立方体に印）
  let end = B[NSEG], qEnd = end.q;
  let cube = [{ c: [0.45, 0, 0], h: [0.45, 0.45, 0.45], col: [235, 235, 240] }, { c: [0.45, 0.5, 0], h: [0.12, 0.08, 0.12], col: [240, 110, 90] }];
  glParts(cube, (v) => V(v3Add(end.c, qRot(qEnd, v))), sc);
  if (frameCount % 2 === 1) drawHud(qEnd);
  hudShow();
}

function drawHud(qEnd) {
  let g = hud; g.clear(); g.noStroke(); g.textAlign(LEFT, BASELINE);
  let deg = beltMode * 360 * Math.min(1, phase);
  g.fill(240); g.textSize(20); g.text('二重被覆とベルトのトリック　' + (beltMode === 1 ? '360°' : '720°') + ' 回した場合', 20, 34);
  g.fill(175); g.textSize(15);
  g.text('1：360°　2：720°　スペース：再生/停止　← → 少しずつ　R：最初から', 20, 60);
  g.text('金 = ベルトの表、青 = 裏。ベルトの各点の向き = 単位四元数 q(s)。壁の端はいつも q = 1', 20, 84);
  let x = 20, y = 140;
  g.fill(255, 210, 110); g.textSize(17);
  g.text(phase <= 1 ? '① 物体を x 軸まわりに回す：' + deg.toFixed(0) + '°' : '② 物体の向きは変えずに、ベルトを物体のまわりにくぐらせる', x, y);
  g.fill(230); g.textSize(15);
  g.text('物体の q = ' + qStr(qEnd, 3), x, y + 28);
  let R = qToMat(qEnd), isI = matDiff(R, [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) < 1e-9;
  g.text('物体の回転行列 = ' + (isI ? '単位行列（元の向き）' : '回っている'), x, y + 52);
  if (phase > 1) {
    g.fill(beltMode === 1 ? g.color(255, 140, 140) : g.color(130, 230, 150));
    g.text(beltMode === 1 ? 'q = −1 のまま動かせない → ねじれは取れない' : (phase > 1.97 ? 'q = +1、ベルトはまっすぐにもどった！' : 'q = +1 のまま、ねじれがほどけていく'), x, y + 80);
  }
  g.fill(200); g.textSize(14);
  ['q と −q は同じ回転を表す（回転行列は同じ）。', '360° 回すと q = 1 → −1 へ。S³ の上では閉じていない道。', '720° 回すと q = 1 → −1 → 1：S³ の上で 1 周して閉じる。', 'この道は S³ の中で縮められる → ベルトのねじれは取れる。',
   '電子のスピン（1/2）は 360° 回すと符号が変わる（シリーズ 25 のブロッホ球）'].forEach((s, n) => g.text(s, x, y + 120 + n * 22));
  // 物体の q の w 成分の道のり（S³ の上で 1 → −1 → 1）
  let gx = width - 330, gy = 140, gw = 300, gh = 120;
  g.stroke(90); g.noFill(); g.rect(gx, gy, gw, gh); g.line(gx, gy + gh / 2, gx + gw, gy + gh / 2);
  g.stroke(255, 200, 80); g.strokeWeight(2); g.beginShape();
  for (let n = 0; n <= 100; n++) { let ph = (2 * n) / 100, w = beltQ(beltMode, 1, ph)[0]; g.vertex(gx + (gw * n) / 100, gy + gh / 2 - (w * gh) / 2.2); }
  g.endShape(); g.strokeWeight(1);
  g.stroke(255); g.line(gx + (gw * phase) / 2, gy, gx + (gw * phase) / 2, gy + gh);
  g.noStroke(); g.fill(180); g.textSize(12); g.text('物体の q の w 成分（+1 / −1）', gx, gy - 8); g.text('① 回す', gx + 4, gy + gh + 16); g.text('② くぐらせる', gx + gw / 2 + 4, gy + gh + 16);
  drawSelfTest(width - 170, height - 12, g);
}

function keyPressed() {
  if (key === '1') { beltMode = 1; phase = 0; }
  if (key === '2') { beltMode = 2; phase = 0; }
  if (key === ' ') playing = !playing;
  if (key === RIGHT_ARROW) phase = Math.min(2, phase + 0.05);
  if (key === LEFT_ARROW) phase = Math.max(0, phase - 0.05);
  if (key === 'r' || key === 'R') { phase = 0; playing = true; }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = []; seedRng(7);
  let unit = 0, wall = 0, end720 = 0, end360 = 0, join = 0;
  for (let md = 1; md <= 2; md++) for (let a = 0; a <= 40; a++) for (let b = 0; b <= 20; b++) {
    let ph = (2 * a) / 40, s = b / 20, q = beltQ(md, s, ph);
    unit = Math.max(unit, Math.abs(qNorm(q) - 1));
    if (b === 0) wall = Math.max(wall, qDist(q, [1, 0, 0, 0]));
    if (b === 20 && ph >= 1) { if (md === 2) end720 = Math.max(end720, qDist(q, [1, 0, 0, 0])); else end360 = Math.max(end360, qDist(q, [-1, 0, 0, 0])); }
    join = Math.max(join, qDist(beltQ(md, s, 1), beltQ(md, s, 1 + 1e-12)));
  }
  check('ベルトのすべての点で |q| = 1、壁の端はいつも q = 1', unit < 1e-14 && wall < 1e-15);
  check('720°：回した直後も、くぐらせている間も、物体の q = +1', end720 < 1e-14);
  let flat = 0; for (let b = 0; b <= 20; b++) flat = Math.max(flat, qDist(beltQ(2, b / 20, 2), [1, 0, 0, 0]));
  check('720°：最後はベルトの全部の点で q = 1（ねじれゼロ）', flat < 1e-14);
  check('360°：物体の q = −1 のまま（でも回転行列は単位行列）', end360 < 1e-14 && matDiff(qToMat([-1, 0, 0, 0]), [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) === 0);
  check('① と ② のつなぎ目でベルトは連続', join < 1e-9);
  let e = 0; for (let t = 0; t < 100; t++) { let q = qRandom(); e = Math.max(e, matDiff(qToMat(q), qToMat(qScl(q, -1)))); }
  check('q と −q は同じ回転行列（2 対 1）', e === 0);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 2（720°）で再生。② でベルトはどう動く？ 物体の向き（赤い印）は変わっている？
// 2. 1（360°）で再生。② でベルトの形は変わるのに、ねじれ（金と青の入れかわり）は残る。何回入れかわる？
// 3. 本物のベルトやリボンと本（または手のひらにのせたコップ）でやってみよう（「皿のトリック」）
// 4. swing の i → j → −i を i → k → −i（[cos, 0, sin]）にすると、② の形はどう変わる？
// 5. シリーズ 25 のブロッホ球：スピン 1/2 は 2π 回すと状態に −1 がつき、4π でもどる。同じ「二重被覆」


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
