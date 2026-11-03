// ============================================
// 07 平行移動とホロノミー ─ 球面を一周すると矢印が回る
// 曲面の上でベクトルを「できるだけ向きを変えずに」運ぶ（平行移動）：一歩ごとに法線方向の成分を捨てるだけ
//   v_{k+1} = v_k − (v_k·n_{k+1}) n_{k+1}
//   平らな紙なら一周して戻ると元の向き。球面では戻ったとき回っている（ホロノミー）
//   回った角度 = 囲んだ領域の面積 / R²（= ∫K dA、球面過剰）。緯線なら 2π(1 − sin φ)、測地三角形なら内角の和 − π
// 1 = 緯線 / 2 = 測地三角形（北極と赤道の 2 点）/ ↑↓ = 緯度 φ / ←→ = 三角形の角 α / スペース = 一時停止 / R = 最初から / ドラッグ = 視点を回す
// ============================================

let R = 185;                       // ★ 球の半径（px）
let pathMode = 1, phi = 0.55, angA = 1.1;   // 緯度 φ（ラジアン）、三角形の経度差 α
let path = [], vecs = [], k = 0, paused = false;
let speed = 2;                     // ★ 1 フレームに進む歩数
let hud, geo, needRebuild = true;

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  colorMode(HSB, 360, 100, 100, 100);
  hud = createGraphics(width, height); hud.colorMode(HSB, 360, 100, 100, 100);
  rebuild();
}

// 球面の点（緯度 lat、経度 lon）→ p5 の座標（z を上に）
function sph(lat, lon) { return [R * Math.cos(lat) * Math.cos(lon), -R * Math.sin(lat), R * Math.cos(lat) * Math.sin(lon)]; }
// 大円の弧（2 点を slerp でつなぐ）
function arc3(a, b, n, out) { let w = Math.acos(constrain(dot3(a, b) / (R * R), -1, 1)); for (let i = 0; i < n; i++) { let t = i / n, s1 = Math.sin((1 - t) * w) / Math.sin(w), s2 = Math.sin(t * w) / Math.sin(w); out.push([0, 1, 2].map((j) => s1 * a[j] + s2 * b[j])); } }
// 領域の中かどうか（緯線：北側のキャップ、三角形：経度 0〜α の北半球）
function inside(lat, lon) { lon = ((lon % TWO_PI) + TWO_PI) % TWO_PI; return pathMode === 1 ? lat > phi : lat > 0 && lon < angA; }

function rebuild() {
  path = [];
  if (pathMode === 1) for (let i = 0; i < 600; i++) path.push(sph(phi, (i / 600) * TWO_PI));
  else { let P = sph(Math.PI / 2 - 1e-4, 0), A = sph(0, 0), B = sph(0, angA); arc3(A, B, 240, path); arc3(B, P, 200, path); arc3(P, A, 200, path); }
  // 平行移動を全部先に計算しておく
  let n0 = unit3(path[0]), t0 = unit3(sub3(path[1], path[0]));
  let v = t0.slice();
  vecs = [v];
  for (let i = 1; i <= path.length; i++) {
    let n = unit3(path[i % path.length]), d = dot3(v, n);
    v = unit3([0, 1, 2].map((j) => v[j] - d * n[j]));
    vecs.push(v);
  }
  // 球のメッシュ（囲んだ領域に色）
  let nu = 48, nv = 28, P = [], C = [];
  for (let i = 0; i <= nu; i++) { P.push([]); C.push([]); for (let j = 0; j <= nv; j++) { let lon = (i / nu) * TWO_PI, lat = -Math.PI / 2 + 0.005 + (Math.PI - 0.01) * j / nv; P[i].push(sph(lat, lon)); C[i].push(inside(lat, lon) ? [1, 0.78, 0.45] : [0.5, 0.58, 0.75]); } }
  if (geo) freeGeometry(geo);
  geo = gridMesh(P, C, true, false);
  k = 0; needRebuild = false;
}

function draw() {
  background(220, 30, 9);
  if (keyIsDown(UP_ARROW)) { phi = Math.min(1.4, phi + 0.01); needRebuild = true; }
  if (keyIsDown(DOWN_ARROW)) { phi = Math.max(-1.4, phi - 0.01); needRebuild = true; }
  if (keyIsDown(RIGHT_ARROW)) { angA = Math.min(3.0, angA + 0.02); needRebuild = true; }
  if (keyIsDown(LEFT_ARROW)) { angA = Math.max(0.2, angA - 0.02); needRebuild = true; }
  if (needRebuild) rebuild();
  if (!paused) k = Math.min(path.length, k + speed);

  ambientLight(85); directionalLight(190, 190, 190, -0.4, 0.6, -1); directionalLight(80, 80, 80, 0.5, -0.4, 0.5);
  push(); rotateX(rotX); rotateY(rotY);
  noStroke(); model(geo);
  // 経路
  noFill(); stroke(0, 0, 100, 80); strokeWeight(2.5);
  beginShape(); for (let i = 0; i <= path.length; i++) { let p = lift(path[i % path.length], 2); vertex(p[0], p[1], p[2]); } endShape();
  // これまで運んだ矢印の軌跡
  strokeWeight(1.5);
  for (let i = 0; i < k; i += 15) arrowAt(path[i], vecs[i], 34, 45, 55);
  // 最初の矢印（白）と今の矢印（黄）
  arrowAt(path[0], vecs[0], 48, 0, 0, 3);
  let ki = Math.min(k, path.length);
  arrowAt(path[ki % path.length], vecs[ki], 48, 45, 95, 3.5);
  pop();

  // ホロノミー（戻ってきた矢印と最初の矢印の角度）
  let n0 = unit3(path[0]), vf = vecs[path.length];
  let ang = Math.atan2(dot3(cross3(vecs[0], vf), n0), dot3(vecs[0], vf));
  let predicted = pathMode === 1 ? TWO_PI * (1 - Math.sin(phi)) : angA;        // 囲んだ領域の面積 / R²
  let measured = ((ang % TWO_PI) + TWO_PI) % TWO_PI;
  hud.clear(); hud.noStroke();
  hud.fill(0, 0, 100); hud.textSize(18);
  hud.text('1：緯線　2：測地三角形　' + (pathMode === 1 ? '↑↓：緯度 φ = ' + nf(degrees(phi), 1, 0) + '°' : '←→：角 α = ' + nf(degrees(angA), 1, 0) + '°') + '　スペース：' + (paused ? '再開' : '一時停止') + '　R：最初から　ドラッグ：視点', 20, 40);
  hud.fill(0, 0, 65); hud.textSize(15);
  hud.text('白 = 最初の矢印　黄 = 平行移動中の矢印（法線成分を捨てるだけ）　オレンジ = 囲んだ領域　進み具合 ' + nf((100 * Math.min(k, path.length)) / path.length, 1, 0) + '%', 20, 66);
  hud.fill(0, 0, 100, 8); hud.rect(20, height - 150, 640, 126, 10);
  hud.fill(0, 0, 100); hud.textSize(20);
  hud.text('一周して戻った矢印の回転角 = ' + nf(degrees(measured), 1, 1) + '°' + (k >= path.length ? '' : '（まだ途中）'), 36, height - 116);
  hud.text('囲んだ領域の面積 / R² = ' + (pathMode === 1 ? '2π(1 − sin φ) = ' : '内角の和 − π = π/2 + π/2 + α − π = α = ') + nf(predicted, 1, 3) + ' rad = ' + nf(degrees(predicted), 1, 1) + '°', 36, height - 86);
  hud.fill(0, 0, 65); hud.textSize(15);
  hud.text('ガウス＝ボネ：回転角 = ∫K dA = 面積 / R²（球面は K = 1/R²）。平らな紙なら 0°。曲がっている証拠が「一周したら向きが変わる」こと', 36, height - 52);
  showHud();
}

function lift(p, d) { let n = unit3(p); return [0, 1, 2].map((i) => p[i] + d * n[i]); }
function arrowAt(p, v, L, hue, sat, w = 1.5) {
  let q = lift(p, 3);
  stroke(hue, sat, 100); strokeWeight(w);
  line(q[0], q[1], q[2], q[0] + v[0] * L, q[1] + v[1] * L, q[2] + v[2] * L);
  push(); translate(q[0] + v[0] * L, q[1] + v[1] * L, q[2] + v[2] * L); noStroke(); fill(hue, sat, 100); sphere(w + 1.5); pop();
}
function keyPressed() {
  if (key === '1' || key === '2') { pathMode = +key; needRebuild = true; }
  if (key === ' ') paused = !paused;
  if (key === 'r' || key === 'R') k = 0;
}
function mouseDragged() { rotY += (mouseX - pmouseX) * 0.01; rotX = constrain(rotX + (mouseY - pmouseY) * 0.01, -1.6, 1.6); }

// ---------- やってみよう ----------
// 1. 緯線（1）で φ = 0（赤道）にすると回転角は 0°。赤道は測地線だから。φ を上げると回転角はどう増える？
// 2. 三角形（2）の α を 90° にすると、3 つの角がすべて直角の三角形。内角の和は 270°、回転角は 90°
// 3. R を変えても回転角は同じ（面積 / R² が同じ）。確かめよう
// 4. 平行移動の式 v − (v·n)n を「v をいつも経路の接線に合わせる」に変えると何が起きる？（それは平行移動ではない）

// ==================================================
// ここから下は「3D の道具」です（ベクトル・視点の回転・メッシュ・HUD）
// （中身は読まなくても OK。消さないでね）
// ==================================================
let rotX = -0.35, rotY = -0.7;
function sub3(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function dot3(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross3(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function unit3(a) { let l = Math.sqrt(dot3(a, a)) || 1; return a.map((x) => x / l); }
function gridMesh(P, C, wrapU, wrapV) {
  let g = new p5.Geometry(), nu = P.length - 1, nv = P[0].length - 1;
  let NU = wrapU ? nu : nu + 1, NV = wrapV ? nv : nv + 1;
  let idx = (i, j) => (i % NU) * NV + (j % NV);
  for (let side = 0; side < 2; side++) {
    for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { g.vertices.push(new p5.Vector(P[i][j][0], P[i][j][1], P[i][j][2])); let c = C ? C[i][j] : [0.8, 0.8, 0.8]; g.vertexColors.push(c[0], c[1], c[2], 1); }
    let off = side * NU * NV;
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      let a = idx(i, j) + off, b = idx(i + 1, j) + off, c = idx(i, j + 1) + off, d = idx(i + 1, j + 1) + off;
      if (side === 0) g.faces.push([a, b, c], [b, d, c]); else g.faces.push([a, c, b], [b, c, d]);
    }
  }
  g.computeNormals();
  return g;
}
function showHud() { drawingContext.clear(drawingContext.DEPTH_BUFFER_BIT); image(hud, -width / 2, -height / 2); }
