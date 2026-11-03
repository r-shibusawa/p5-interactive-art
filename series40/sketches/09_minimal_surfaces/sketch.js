// ============================================
// 09 極小曲面 ─ シャボン膜は面積を最小にする
// 針金の枠（境界）を固定して、曲面を「平均曲率 H に比例して法線方向へ動かす」（平均曲率流）と面積がどんどん減り、
//   H = 0 の曲面 = 極小曲面（シャボン膜）に落ち着く。メッシュでは cot 重みのラプラシアンで H n を近似する
//   2 つの輪 → カテノイド。ただし輪の間隔が半径の約 1.33 倍を超えると膜は存在せず、くびれて切れる
// 1〜3 = 枠（2 つの輪・ねじれた四角・波打つ輪）/ ↑↓ = 枠の形（輪の間隔・ねじれ・波の高さ）/ スペース = 一時停止 / W = ワイヤー / R = 最初から / ドラッグ = 視点を回す
// ============================================

let frameNo = 1, param = 60;        // param：輪の半間隔 d（1）、ねじれの高さ（2）、波の高さ（3）
let R0 = 120;                       // ★ 輪の半径（px）
let iters = 3, lambda = 0.5;        // ★ 1 フレームの流れの回数と 1 回の強さ（0〜1）
let P = [], fixed = [], faces = [], nbrs = [], Hval = [];
let nu, nv, wrapU, paused = false, wire = false, broken = false, hud, geo, stepCount = 0;

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  colorMode(HSB, 360, 100, 100, 100);
  hud = createGraphics(width, height); hud.colorMode(HSB, 360, 100, 100, 100);
  buildFrame();
}

// ★ 枠と最初の曲面（P = 頂点の配列、fixed = 境界なら true）
function buildFrame() {
  P = []; fixed = []; faces = []; broken = false; stepCount = 0;
  if (frameNo === 1) {                                   // 2 つの輪：最初は円柱
    nu = 40; nv = 24; wrapU = true;
    for (let i = 0; i < nu; i++) for (let j = 0; j <= nv; j++) { let a = (i / nu) * TWO_PI, z = -param + (2 * param * j) / nv; P.push([R0 * Math.cos(a), z, R0 * Math.sin(a)]); fixed.push(j === 0 || j === nv); }
  } else if (frameNo === 2) {                            // ねじれた四角：角が上下交互、辺はまっすぐ
    nu = 30; nv = 30; wrapU = false; let L = 150;
    for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) { let u = -1 + (2 * i) / nu, v = -1 + (2 * j) / nv; P.push([L * u, -param * u * v, L * v]); fixed.push(i === 0 || i === nu || j === 0 || j === nv); }
  } else {                                               // 波打つ輪：円板、境界の高さが sin 3θ
    nu = 30; nv = 30; wrapU = false;
    for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) { let u = -1 + (2 * i) / nu, v = -1 + (2 * j) / nv; let x = u * Math.sqrt(1 - v * v / 2), y = v * Math.sqrt(1 - u * u / 2), r = Math.hypot(x, y), th = Math.atan2(y, x); P.push([1.3 * R0 * x, -param * Math.sin(3 * th) * r * r * r, 1.3 * R0 * y]); fixed.push(i === 0 || i === nu || j === 0 || j === nv); }
  }
  let NU = wrapU ? nu : nu + 1, id = (i, j) => (i % NU) * (nv + 1) + j;
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) faces.push([id(i, j), id(i + 1, j), id(i, j + 1)], [id(i + 1, j), id(i + 1, j + 1), id(i, j + 1)]);
  Hval = P.map(() => 0);
}

// 平均曲率流の 1 歩（cot 重みのラプラシアン：Σ w_ij (p_j − p_i) ≈ −2 A H n）
function flowStep() {
  let n = P.length, acc = P.map(() => [0, 0, 0]), wsum = new Array(n).fill(0), area = new Array(n).fill(0);
  for (let [a, b, c] of faces) {
    let A = 0.5 * len3(cross3(sub3(P[b], P[a]), sub3(P[c], P[a])));
    for (let [i, j, k] of [[a, b, c], [b, c, a], [c, a, b]]) {          // 辺 (i, j) の向かいの角 k
      let u = sub3(P[i], P[k]), v = sub3(P[j], P[k]);
      let cot = dot3(u, v) / (len3(cross3(u, v)) + 1e-9);
      let w = constrain(cot, 0.02, 30);                                 // ★ 鈍角での暴走を防ぐ
      for (let t = 0; t < 3; t++) { acc[i][t] += w * (P[j][t] - P[i][t]); acc[j][t] += w * (P[i][t] - P[j][t]); }
      wsum[i] += w; wsum[j] += w;
    }
    for (let i of [a, b, c]) area[i] += A / 3;
  }
  for (let i = 0; i < n; i++) {
    Hval[i] = len3(acc[i]) / (2 * area[i] + 1e-9);                       // |H| の近似
    if (fixed[i] || wsum[i] === 0) continue;
    for (let t = 0; t < 3; t++) P[i][t] += (lambda * acc[i][t]) / wsum[i];
  }
  stepCount++;
}
function totalArea() { let s = 0; for (let [a, b, c] of faces) s += 0.5 * len3(cross3(sub3(P[b], P[a]), sub3(P[c], P[a]))); return s; }
function neckRadius() { let m = Infinity; for (let i = 0; i < P.length; i++) if (!fixed[i]) m = Math.min(m, Math.hypot(P[i][0], P[i][2])); return m; }
// 2 つの輪にかかるカテノイドの理論解 R(z) = c cosh(z/c)（R0 = c cosh(d/c) を満たす大きい方の c）
function catenoidC(d) { let lo = d / 1.2, hi = R0, f = (c) => c * Math.cosh(d / c) - R0; if (f(lo) > 0) return null; for (let k = 0; k < 50; k++) { let m = (lo + hi) / 2; if (f(m) > 0) hi = m; else lo = m; } return (lo + hi) / 2; }

function draw() {
  background(200, 30, 9);
  if (keyIsDown(UP_ARROW)) { param = Math.min(frameNo === 1 ? 160 : 160, param + 1.5); buildFrame(); }
  if (keyIsDown(DOWN_ARROW)) { param = Math.max(frameNo === 1 ? 20 : 0, param - 1.5); buildFrame(); }
  if (!paused && !broken) for (let k = 0; k < iters; k++) flowStep();
  if (frameNo === 1 && neckRadius() < 7) broken = true;
  let hmax = 0; for (let h of Hval) hmax = Math.max(hmax, h);
  let C = P.map((p, i) => { let t = Math.min(1, Hval[i] * 60); return [0.75 + 0.25 * t, 0.85 - 0.55 * t, 1 - 0.7 * t]; });
  if (geo) freeGeometry(geo);
  geo = flatMesh(P, C, faces);

  ambientLight(85); directionalLight(190, 190, 190, -0.4, 0.6, -1); directionalLight(80, 80, 80, 0.5, -0.4, 0.5);
  push(); rotateX(rotX); rotateY(rotY);
  if (!wire) { noStroke(); model(geo); }
  // 格子線（ワイヤー、または薄く）
  noFill(); strokeWeight(wire ? 1.2 : 0.8); stroke(0, 0, 100, wire ? 80 : 25);
  let NU = wrapU ? nu : nu + 1, id = (i, j) => (i % NU) * (nv + 1) + j;
  for (let i = 0; i < NU; i += 2) { beginShape(); for (let j = 0; j <= nv; j++) { let p = P[id(i, j)]; vertex(p[0], p[1], p[2]); } endShape(); }
  for (let j = 0; j <= nv; j += 2) { beginShape(); for (let i = 0; i <= nu; i++) { let p = P[id(i, j)]; vertex(p[0], p[1], p[2]); } endShape(); }
  // 固定した枠（針金）
  stroke(45, 90, 100); strokeWeight(3);
  for (let [a, b] of frameEdges()) line(P[a][0], P[a][1], P[a][2], P[b][0], P[b][1], P[b][2]);
  // 理論解のカテノイドの断面（存在するとき）
  if (frameNo === 1) { let c = catenoidC(param); if (c) { stroke(130, 80, 100, 80); strokeWeight(2); for (let a of [0, Math.PI]) { beginShape(); for (let j = 0; j <= 40; j++) { let z = -param + (2 * param * j) / 40, r = c * Math.cosh(z / c); vertex(r * Math.cos(a), z, r * Math.sin(a)); } endShape(); } } }
  pop();

  hud.clear(); hud.noStroke();
  hud.fill(0, 0, 100); hud.textSize(18);
  hud.text('1〜3：枠（' + ['2 つの輪', 'ねじれた四角', '波打つ輪'][frameNo - 1] + '）　↑↓：' + ['輪の半間隔 d = ' + nf(param, 1, 0) + ' px', 'ねじれの高さ ' + nf(param, 1, 0), '波の高さ ' + nf(param, 1, 0)][frameNo - 1] + '　スペース：' + (paused ? '再開' : '一時停止') + '　W：ワイヤー　R：最初から　ドラッグ：視点', 20, 40);
  hud.fill(0, 0, 65); hud.textSize(15);
  hud.text('黄色 = 固定した針金の枠　色 = |H|（白 = 0、赤 = 大）　流れの回数 ' + stepCount + '　面積 = ' + nf(totalArea() / 1000, 1, 1) + ' ×10³ px²　平均 |H| = ' + nf(Hval.reduce((s, h) => s + h, 0) / Hval.length * 1000, 1, 2) + ' ×10⁻³', 20, 66);
  if (frameNo === 1) {
    let c = catenoidC(param);
    hud.fill(0, 0, 65);
    hud.text('緑 = 理論解 R(z) = c cosh(z/c)' + (c ? '（c = ' + nf(c, 1, 1) + '）' : '　→ この間隔（2d/R0 = ' + nf((2 * param) / R0, 1, 2) + ' > 1.33）では存在しない！') + '　くびれの半径 ' + nf(neckRadius(), 1, 1) + ' px', 20, 90);
    if (broken) { hud.fill(0, 85, 100); hud.textSize(26); hud.text('切れた！ 2 枚の円板のほうが面積が小さい（輪を近づけて R）', 20, 130); }
  }
  showHud();
}

function frameEdges() {
  let NU = wrapU ? nu : nu + 1, id = (i, j) => (i % NU) * (nv + 1) + j, e = [];
  for (let i = 0; i < nu; i++) { e.push([id(i, 0), id(i + 1, 0)], [id(i, nv), id(i + 1, nv)]); }
  if (!wrapU) for (let j = 0; j < nv; j++) e.push([id(0, j), id(0, j + 1)], [id(nu, j), id(nu, j + 1)]);
  return e;
}
function keyPressed() {
  if (key >= '1' && key <= '3') { frameNo = +key; param = [60, 60, 60][frameNo - 1]; buildFrame(); }
  if (key === ' ') paused = !paused;
  if (key === 'w' || key === 'W') wire = !wire;
  if (key === 'r' || key === 'R') buildFrame();
}
function mouseDragged() { rotY += (mouseX - pmouseX) * 0.01; rotX = constrain(rotX + (mouseY - pmouseY) * 0.01, -1.6, 1.6); }

// ---------- やってみよう ----------
// 1. 2 つの輪（1）：d を少しずつ大きくして、膜が切れる境目を探そう。理論値は 2d/R0 ≈ 1.33（d ≈ 80 px）
// 2. ねじれた四角（2）はシェルクの曲面の一部に似た鞍になる。ねじれを 0 にすると平面。確かめよう
// 3. 波打つ輪（3）の sin(3θ) を sin(2θ) や sin(4θ) に変えると？（エンネパー曲面との関係）
// 4. lambda を 1.0 にすると速いが暴れる。iters を 10 にして収束の速さを見よう。面積がどう減るか記録してみよう

// ==================================================
// ここから下は「3D の道具」です（ベクトル・視点の回転・メッシュ・HUD）
// （中身は読まなくても OK。消さないでね）
// ==================================================
let rotX = -0.35, rotY = 0.5;
function sub3(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function dot3(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross3(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function len3(a) { return Math.sqrt(dot3(a, a)); }
// 頂点の配列と三角形の配列から p5.Geometry（両面）
function flatMesh(P, C, faces) {
  let g = new p5.Geometry(), n = P.length;
  for (let side = 0; side < 2; side++) {
    for (let i = 0; i < n; i++) { g.vertices.push(new p5.Vector(P[i][0], P[i][1], P[i][2])); g.vertexColors.push(C[i][0], C[i][1], C[i][2], 1); }
    let off = side * n;
    for (let [a, b, c] of faces) g.faces.push(side === 0 ? [a + off, b + off, c + off] : [a + off, c + off, b + off]);
  }
  g.computeNormals();
  return g;
}
function showHud() { drawingContext.clear(drawingContext.DEPTH_BUFFER_BIT); image(hud, -width / 2, -height / 2); }
