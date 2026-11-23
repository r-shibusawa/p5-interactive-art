// ============================================
// 15 カメラ映像を 3D で回す ─ 物体の回転と「色の回転」
// 映像を立方体の面に貼り、ドラッグ（アークボール、08）で回す。さらに画素の色 (r, g, b) を純四元数とみなし、q (rgb) q* で色空間を回す
// 灰色の軸 (1, 1, 1) まわりに回すと、明るさはそのままで色相だけが回る（120° で 赤 → 緑 → 青）
// ドラッグ：立方体を回す / ← → 色の回転角 / ↑↓ 色の回転軸 / A：色を回し続ける / V：カメラ ⇔ テスト画像 / S：保存
// ============================================

const CAP_W = 160, CAP_H = 120;        // ★ 処理する映像の大きさ（小さいほど速い）
const AXES_C = [[[1, 1, 1], '灰色の軸 (1, 1, 1)：色相が回る'], [[1, 0, 0], '赤の軸'], [[0, 1, 0], '緑の軸'], [[0, 0, 1], '青の軸']];
let cap, useCam = true, buf, testImg, axisIdx = 0, colAng = Math.PI / 3, autoCol = false;
let qObj, dragFrom = null, sc;

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL); hudMake(); selfTest();
  qObj = qMul(qAxisAngle([1, 0, 0], 0.35), qAxisAngle([0, 1, 0], -0.6));
  buf = createGraphics(CAP_W, CAP_H); buf.pixelDensity(1);
  testImg = createGraphics(CAP_W, CAP_H); testImg.pixelDensity(1); makeTestImage();
  try { cap = createCapture(VIDEO, { flipped: true }); cap.size(CAP_W, CAP_H); cap.hide(); } catch (e) { cap = null; }
  textureMode(NORMAL);
}
function makeTestImage() {             // カメラがないときの画像：色相の輪と灰色の帯
  let g = testImg; g.noStroke(); g.colorMode(HSB, 360, 100, 100);
  for (let x = 0; x < CAP_W; x += 4) for (let y = 0; y < CAP_H * 0.75; y += 4) { g.fill((x / CAP_W) * 360, 30 + (y / CAP_H) * 90, 95); g.rect(x, y, 4, 4); }
  for (let x = 0; x < CAP_W; x += 4) { g.fill(0, 0, (x / CAP_W) * 100); g.rect(x, CAP_H * 0.75, 4, CAP_H * 0.25); }
  g.fill(0, 0, 100); g.circle(CAP_W * 0.5, CAP_H * 0.38, 26);
}
function colorMat() { return qToMat(qAxisAngle(AXES_C[axisIdx][0], colAng)); }   // 色を回す行列（q v q* と同じ、自己テストで確認）
function rotateColors() {
  let live = useCam && cap && cap.width > 0 && cap.elt.readyState >= 2 && cap.elt.videoWidth > 0, src = live ? cap : testImg;   // カメラの映像が届くまではテスト画像
  buf.image(src, 0, 0, CAP_W, CAP_H);
  buf.loadPixels();
  let M = colorMat(), px = buf.pixels;
  for (let o = 0; o < px.length; o += 4) {
    let r = px[o] / 255 - 0.5, g = px[o + 1] / 255 - 0.5, b = px[o + 2] / 255 - 0.5;   // 灰色 (0.5, 0.5, 0.5) を原点に
    px[o] = 255 * (M[0][0] * r + M[0][1] * g + M[0][2] * b + 0.5);
    px[o + 1] = 255 * (M[1][0] * r + M[1][1] * g + M[1][2] * b + 0.5);
    px[o + 2] = 255 * (M[2][0] * r + M[2][1] * g + M[2][2] * b + 0.5);
  }
  buf.updatePixels();
  return src === cap;
}

function draw() {
  background(14, 16, 30);
  sc = Math.min(width, height) * 0.2;
  if (autoCol) colAng = (colAng + 0.02) % (4 * Math.PI);
  if (mouseIsPressed && dragFrom) { let to = arcballVec(mouseX, mouseY); qObj = qUnit(qMul(arcballQ(dragFrom, to), qObj)); dragFrom = to; }
  let camOn = rotateColors();
  // 立方体の 6 面に映像を貼る（頂点は q v q* で回す）
  noStroke(); texture(buf);
  for (let [n, idx] of CUBE_FACES) {
    let uv = [[0, 1], [1, 1], [1, 0], [0, 0]];
    beginShape();
    idx.forEach((t, m) => { let v = qRot(qObj, CUBE_CORNERS[t]); vertex(v[0] * sc, -v[1] * sc, v[2] * sc, uv[m][0], uv[m][1]); });
    endShape(CLOSE);
  }
  if (frameCount % 3 === 1) drawHud(camOn);
  hudShow();
}

function drawHud(camOn) {
  let g = hud, M = colorMat(), q = qAxisAngle(AXES_C[axisIdx][0], colAng);
  g.clear(); g.noStroke(); g.textAlign(LEFT, BASELINE);
  g.fill(240); g.textSize(20); g.text('カメラ映像を 3D で回す　色の回転 q (rgb) q*　' + (camOn ? '📷 カメラ' : 'テスト画像'), 20, 34);
  g.fill(175); g.textSize(15);
  g.text('ドラッグ：立方体を回す　← → 色の回転角　↑↓ 色の回転軸　A：色を回し続ける　V：カメラ ⇔ テスト画像　S：保存', 20, 60);
  let x = 20, y = 120;
  g.fill(255, 210, 110); g.textSize(16); g.text(AXES_C[axisIdx][1] + '　角 ' + ((colAng * 180) / Math.PI).toFixed(0) + '°', x, y);
  g.fill(220); g.textSize(14); g.text('q = ' + qStr(q, 3), x, y + 24);
  g.text('色の回転行列（灰色 0.5 を中心に）', x, y + 52);
  for (let r = 0; r < 3; r++) g.text(M[r].map((v) => (v >= 0 ? ' ' : '') + v.toFixed(3)).join('   '), x + 10, y + 74 + r * 19);
  // 赤・緑・青・灰色がどこへ行くか
  [[255, 0, 0], [0, 255, 0], [0, 0, 255], [128, 128, 128], [255, 200, 80]].forEach((c, n) => {
    let v = [c[0] / 255 - 0.5, c[1] / 255 - 0.5, c[2] / 255 - 0.5], w = qRot(q, v).map((t) => clampv(255 * (t + 0.5), 0, 255));
    g.fill(...c); g.rect(x + n * 70, y + 150, 28, 28); g.fill(...w); g.rect(x + n * 70 + 30, y + 150, 28, 28);
  });
  g.fill(170); g.text('左 = 元の色、右 = 回した色（灰色は動かない）', x, y + 200);
  g.image(camOn ? cap : testImg, x, y + 220, 160, 120); g.image(buf, x + 170, y + 220, 160, 120);
  g.text('元の映像　　　　　　　　色を回した映像', x, y + 356);
  drawSelfTest(width - 170, height - 12, g);
}

function mousePressed() { dragFrom = arcballVec(mouseX, mouseY); }
function mouseReleased() { dragFrom = null; }
function keyPressed() {
  if (key === RIGHT_ARROW) colAng += Math.PI / 12;
  if (key === LEFT_ARROW) colAng -= Math.PI / 12;
  if (key === UP_ARROW) axisIdx = (axisIdx + 1) % AXES_C.length;
  if (key === DOWN_ARROW) axisIdx = (axisIdx + AXES_C.length - 1) % AXES_C.length;
  if (key === 'a' || key === 'A') autoCol = !autoCol;
  if (key === 'v' || key === 'V') useCam = !useCam;
  if (key === 's' || key === 'S') saveCanvas('quaternion_color', 'png');
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = []; seedRng(15);
  let gray = v3Unit([1, 1, 1]), e1 = 0, e2 = 0, e3 = 0, e4 = 0;
  for (let t = 0; t < 200; t++) {
    let ang = rnd() * 7, q = qAxisAngle(gray, ang), M = qToMat(q), v = [rnd() - 0.5, rnd() - 0.5, rnd() - 0.5], w = qRot(q, v);
    e1 = Math.max(e1, v3Dist(w, matVec(M, v)));
    e2 = Math.max(e2, Math.abs(w[0] + w[1] + w[2] - (v[0] + v[1] + v[2])));
    let sv = v3Len(v3Add(v, v3Scl(gray, -v3Dot(v, gray)))), sw = v3Len(v3Add(w, v3Scl(gray, -v3Dot(w, gray)))); e3 = Math.max(e3, Math.abs(sv - sw));
    let gr = [0.2, 0.2, 0.2]; e4 = Math.max(e4, v3Dist(qRot(q, gr), gr));
  }
  check('色の回転行列 = 画素ごとの q (rgb) q*（200 色）', e1 < 1e-12);
  check('灰色の軸まわり：明るさ r + g + b はそのまま', e2 < 1e-12);
  check('灰色の軸まわり：灰色からの離れ方（あざやかさ）もそのまま、灰色は動かない', e3 < 1e-12 && e4 < 1e-12);
  let q120 = qAxisAngle(gray, (2 * Math.PI) / 3), red = [0.5, -0.5, -0.5];
  check('灰色の軸まわりに 120°：赤 → 緑 → 青 → 赤', v3Dist(qRot(q120, red), [-0.5, 0.5, -0.5]) < 1e-12 && v3Dist(qRot(q120, qRot(q120, red)), [-0.5, -0.5, 0.5]) < 1e-12);
  check('360° 回すと元の色（q = −1 でも同じ）', v3Dist(qRot(qAxisAngle(gray, 2 * Math.PI), red), red) < 1e-12);
  let qa = [1, 0, 0, 0]; for (let t = 0; t < 1000; t++) qa = qUnit(qMul(arcballQ(v3Unit([rndNormal(), rndNormal(), rndNormal()]), v3Unit([rndNormal(), rndNormal(), rndNormal()])), qa));
  check('アークボールで 1000 回回しても |q| = 1', Math.abs(qNorm(qa) - 1) < 1e-14);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. ← → で色を 120° 回そう。赤い物は何色になる？ 240° では？
// 2. ↑↓ で軸を「赤の軸」にすると、赤はそのままで緑と青が混ざる。灰色の軸とどうちがう？
// 3. A で色を回し続けながら、立方体をドラッグで回そう。物体の回転と色の回転は同じ q v q*
// 4. 回した色が 0〜255 からはみ出すと切られる。どの軸・角でいちばん切られる？（灰色の軸では切られにくい理由は？）
// 5. S で保存して「色が回る自画像」を作ろう


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
