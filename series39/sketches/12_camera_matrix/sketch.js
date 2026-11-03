// ============================================
// 12 ピンホールカメラの射影（3D → 2D）
// 3 次元の点 X = [X, Y, Z, 1] は、カメラ行列 P = K [R | t]（3×4）で画像の点 x = P X（同次座標）に写る
//   K = 内部パラメータ（焦点距離 f、画像の中心）、R, t = カメラの向きと位置。x = [u, v, w] → 画像の (u/w, v/w)
//   左：世界（立方体・格子・カメラと画像面）。右上：カメラが撮った 2D 画像（自前で計算して描く）
// ドラッグ = 世界の視点を回す / ←→ = カメラを回す / W S = カメラの高さ / ↑↓ = 焦点距離 f / O = 自動で回る / R = リセット
// ============================================

let yaw = 0.6, pitch = 0.35;    // カメラの向き（原点を見る）
let camR = 420;                 // ★ カメラから原点までの距離
let focal = 300;                // ★ 焦点距離（px）
let IW = 360, IH = 270;         // ★ 画像の大きさ（px）
let rotX = -0.5, rotY = 0.5;    // 世界を見る視点（マウスで回す）
let autoRot = false;
let hud, img;                   // 2D の重ね描き用と画像用のバッファ
let segs = [];                  // 世界の線分 [x1,y1,z1,x2,y2,z2, hue]

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  hud = createGraphics(width, height);
  img = createGraphics(IW, IH);
  hud.colorMode(HSB, 360, 100, 100, 100); img.colorMode(HSB, 360, 100, 100, 100);
  buildWorld();
}
// ★ 世界：立方体（辺 120）、地面の格子、小さな三角錐
function buildWorld() {
  segs = [];
  let s = 60, c = [[-s, -s, -s], [s, -s, -s], [s, s, -s], [-s, s, -s], [-s, -s, s], [s, -s, s], [s, s, s], [-s, s, s]];
  for (let [a, b] of [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]) segs.push([...c[a], ...c[b], 200]);
  for (let i = -3; i <= 3; i++) { segs.push([i * 60, 90, -180, i * 60, 90, 180, 45]); segs.push([-180, 90, i * 60, 180, 90, i * 60, 45]); }
  let t = [[150, 90, -100], [210, 90, -100], [180, 90, -50], [180, 10, -85]];
  for (let [a, b] of [[0, 1], [1, 2], [2, 0], [0, 3], [1, 3], [2, 3]]) segs.push([...t[a], ...t[b], 15]);
}

// ★ カメラ行列 P = K [R | t] を作る
function cameraMatrix() {
  let C = [camR * Math.cos(pitch) * Math.sin(yaw), -camR * Math.sin(pitch), camR * Math.cos(pitch) * Math.cos(yaw)];   // カメラの位置（y は下向き）
  let z = unit3([-C[0], -C[1], -C[2]]);                 // 前（原点を見る）
  let x = unit3(cross3([0, 1, 0], z));                  // 右
  let y = cross3(z, x);                                 // 下
  let R = [x, y, z];                                    // 行 = カメラの軸（世界 → カメラの回転）
  let t = [-dot3(x, C), -dot3(y, C), -dot3(z, C)];      // t = −R C
  let K = [[focal, 0, IW / 2], [0, focal, IH / 2], [0, 0, 1]];
  let Rt = R.map((r, i) => [...r, t[i]]);               // 3×4
  let P = K.map((krow) => [0, 1, 2, 3].map((j) => krow[0] * Rt[0][j] + krow[1] * Rt[1][j] + krow[2] * Rt[2][j]));
  return { P, K, R, t, C };
}
// 3D の点を画像に写す → {u, v, w}
function projectPt(P, X) {
  let h = [X[0], X[1], X[2], 1];
  let r = P.map((row) => row[0] * h[0] + row[1] * h[1] + row[2] * h[2] + row[3] * h[3]);
  return { u: r[0] / r[2], v: r[1] / r[2], w: r[2] };
}
// 画像の点 (u, v) を、カメラから距離 d の画像面の上の世界の点に戻す（画像面を 3D に描くため）
function imageToWorld(cam, u, v, d) {
  let dir = [(u - IW / 2) / focal, (v - IH / 2) / focal, 1];        // K⁻¹ [u, v, 1]
  let w = [0, 1, 2].map((i) => cam.R[0][i] * dir[0] + cam.R[1][i] * dir[1] + cam.R[2][i] * dir[2]);   // Rᵀ dir
  return [cam.C[0] + w[0] * d, cam.C[1] + w[1] * d, cam.C[2] + w[2] * d];
}

function draw() {
  background(30, 35, 11);
  if (autoRot) yaw += 0.008;
  let cam = cameraMatrix();
  let d = 110;   // 画像面までの距離（表示用）

  // ---- 画像（2D バッファに自前で描く）
  img.background(30, 20, 18);
  img.stroke(0, 0, 100, 20); img.strokeWeight(1); img.line(0, IH / 2, IW, IH / 2); img.line(IW / 2, 0, IW / 2, IH);
  img.strokeWeight(2);
  for (let s of segs) {
    let a = projectPt(cam.P, [s[0], s[1], s[2]]), b = projectPt(cam.P, [s[3], s[4], s[5]]);
    if (a.w > 1 && b.w > 1) { img.stroke(s[6], 70, 100); img.line(a.u, a.v, b.u, b.v); }
  }

  // ---- 3D の世界
  push();
  rotateX(rotX); rotateY(rotY);
  strokeWeight(2);
  for (let s of segs) { stroke(s[6], 60, 90); line(s[0], s[1], s[2], s[3], s[4], s[5]); }
  // カメラ（点）と画像面（4 隅）と光線
  let corners = [[0, 0], [IW, 0], [IW, IH], [0, IH]].map(([u, v]) => imageToWorld(cam, u, v, d));
  stroke(45, 90, 100); strokeWeight(2);
  for (let i = 0; i < 4; i++) { let a = corners[i], b = corners[(i + 1) % 4]; line(...a, ...b); line(...cam.C, ...a); }
  push(); translate(...cam.C); noStroke(); fill(45, 90, 100); sphere(6); pop();
  // 画像面の上に像を描く（投影した線分を画像面の位置に置く）
  strokeWeight(1.5);
  for (let s of segs) {
    let a = projectPt(cam.P, [s[0], s[1], s[2]]), b = projectPt(cam.P, [s[3], s[4], s[5]]);
    if (a.w > 1 && b.w > 1 && inImg(a) && inImg(b)) { stroke(s[6], 70, 100); line(...imageToWorld(cam, a.u, a.v, d), ...imageToWorld(cam, b.u, b.v, d)); }
  }
  // 原点から画像面を通ってカメラへ向かう光線（立方体の頂点 1 つ分）
  stroke(0, 0, 100, 40); strokeWeight(1); line(60, -60, 60, ...cam.C);
  pop();

  // ---- HUD（2D）
  drawHud(cam);
  drawingContext.clear(drawingContext.DEPTH_BUFFER_BIT);
  image(hud, -width / 2, -height / 2);
}
function inImg(a) { return a.u > -IW && a.u < 2 * IW && a.v > -IH && a.v < 2 * IH; }

function drawHud(cam) {
  hud.clear();
  // 右上に画像
  let px = width - IW - 24, py = 96;
  hud.image(img, px, py);
  hud.noFill(); hud.stroke(45, 90, 100); hud.strokeWeight(2); hud.rect(px, py, IW, IH);
  hud.noStroke(); hud.fill(45, 90, 100); hud.textSize(14); hud.text('カメラの画像（' + IW + '×' + IH + ' px）= P X を w で割ったもの', px, py - 8);
  // 行列
  hud.fill(0, 0, 100, 8); hud.rect(px - 10, py + IH + 14, IW + 20, 190, 8);
  hud.fill(0, 0, 100); hud.textSize(13); hud.textFont('monospace');
  let y0 = py + IH + 36;
  hud.text('K = [ ' + row3(cam.K[0], 0) + ' ]', px, y0); hud.text('    [ ' + row3(cam.K[1], 0) + ' ]', px, y0 + 16); hud.text('    [ ' + row3(cam.K[2], 0) + ' ]', px, y0 + 32);
  for (let i = 0; i < 3; i++) hud.text((i === 0 ? '[R|t]=' : '      ') + '[ ' + row3(cam.R[i], 2) + ' | ' + nf(cam.t[i], 1, 0).padStart(5) + ' ]', px, y0 + 56 + i * 16);
  for (let i = 0; i < 3; i++) hud.text((i === 0 ? 'P = K[R|t] = ' : '             ') + '[' + cam.P[i].map((v) => nf(v, 1, 0).padStart(7)).join('') + ']', px, y0 + 112 + i * 16);
  hud.textFont('sans-serif');
  hud.fill(0, 0, 100); hud.textSize(18);
  hud.text('f = ' + focal + ' px（↑↓）　カメラ：←→ 回る　W/S 高さ　距離 ' + camR + '　O：自動 ' + (autoRot ? 'ON' : 'off') + '　ドラッグ：世界の視点　R：リセット', 20, 40);
  hud.fill(0, 0, 65); hud.textSize(15);
  hud.text('黄色の四角 = 画像面（焦点距離 f だけ前）。3D の点から光線がカメラの穴を通って画像面に当たる所が像。f を大きくすると望遠（像が大きく、遠近感が弱い）', 20, 68);
}
function row3(r, d) { return r.map((v) => nf(v, 1, d).padStart(d ? 6 : 4)).join(' '); }

// 3 次元ベクトルの道具
function cross3(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function dot3(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function unit3(a) { let m = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / m, a[1] / m, a[2] / m]; }

function mouseDragged() { rotY += (mouseX - pmouseX) * 0.01; rotX = constrain(rotX + (mouseY - pmouseY) * 0.01, -1.5, 1.5); }
function keyPressed() {
  if (key === LEFT_ARROW) yaw -= 0.1;
  if (key === RIGHT_ARROW) yaw += 0.1;
  if (key === 'w' || key === 'W') pitch = min(1.3, pitch + 0.08);
  if (key === 's' || key === 'S') pitch = max(-0.3, pitch - 0.08);
  if (key === UP_ARROW) focal = min(1200, focal + 30);
  if (key === DOWN_ARROW) focal = max(80, focal - 30);
  if (key === 'o' || key === 'O') autoRot = !autoRot;
  if (key === 'r' || key === 'R') { yaw = 0.6; pitch = 0.35; focal = 300; rotX = -0.5; rotY = 0.5; autoRot = false; }
}

// ---------- やってみよう ----------
// 1. f を 80 にすると超広角：格子の遠くが急に小さくなる。f = 1200 なら望遠：ほぼ平行投影。P の数値もくらべよう
// 2. 地面の格子の平行線は画像の中でどこに集まる？（消失点 = 方向 [1, 0, 0, 0] の像 = P の 1 列目！）
// 3. camR を変えずに f を変えるのと、f を変えずに camR を変えるのでは、画像はどう違う？（ドリーズーム）
// 4. 立方体の 1 つの面（4 点）は画像でも四角形。その 4 点の対応からホモグラフィ（03）が作れる = 平面のカメラ画像はホモグラフィ
