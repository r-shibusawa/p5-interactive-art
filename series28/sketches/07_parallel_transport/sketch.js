// ============================================
// 07 平行移動とホロノミー
// 矢印を「向きを変えないように」面に沿って運ぶ（平行移動）。平面なら 1 周しても元どおり
//   でも球面では、1 周して戻ると矢印が回っている！ 回った角度 = 囲んだ面積 × 曲率（半径 1 なら面積そのもの）
// 1 = 緯線をまわる 2 = 測地三角形（北極 → 赤道 → 赤道 → 北極）/ ↑↓ = ループの大きさ / ←→ = 最初の矢印の向き / スペース = もう一度 / ドラッグ = 視点
// ============================================

let loopType = 2;
let colat = 0.9;            // ★ 緯線ループ：北極からの角度 θ0
let sweep = 1.2;            // ★ 三角形ループ：赤道に沿って進む角度 α
let v0Angle = 0.3;          // ★ 最初の矢印の向き
let prog = 0, speedP = 3;   // ★ アニメーションの速さ（1 フレームに進む点の数）
let path = [], vecs = [], holo = 0, area = 0;
let SC, sphereModel, gridModel, capModel, pathModel;

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  setupView();
  rotX = -0.6; rotY = -0.9;
  SC = min(width, height) * 0.33;
  sphereModel = makeSurface(sph, 0, TWO_PI, 0.001, PI - 0.001, 64, 40, () => [70, 90, 130]);
  gridModel = makeGrid(sph, 0, TWO_PI, 0.001, PI - 0.001, 12, 12, [130, 150, 200]);
  rebuild();
}
// 球面の点：u = 経度、v = 北極からの角度
function sph(u, v) { return [Math.sin(v) * Math.cos(u), Math.sin(v) * Math.sin(u), Math.cos(v)]; }

// ループの点の列をつくる
function makePath() {
  let pts = [];
  if (loopType === 1) {
    for (let i = 0; i <= 720; i++) pts.push(sph((i / 720) * TWO_PI, colat));
  } else {
    // 北極 → 経度 0 の子午線を赤道まで → 赤道を α まで → 子午線 α を北極まで（3 本とも大円 = 測地線）
    for (let i = 0; i <= 240; i++) pts.push(sph(0, 0.0001 + (i / 240) * (HALF_PI - 0.0001)));
    for (let i = 1; i <= 240; i++) pts.push(sph((i / 240) * sweep, HALF_PI));
    for (let i = 1; i <= 240; i++) pts.push(sph(sweep, HALF_PI - (i / 240) * (HALF_PI - 0.0001)));
  }
  return pts;
}
function rebuild() {
  path = makePath();
  // ★ 平行移動（離散版）：次の点の接平面に矢印を射影して、長さを 1 にもどす
  let p0 = path[0];
  let e1 = vunit(vsub(path[3], p0)), e2 = vcross(p0, e1);
  let v = vadd(vmul(e1, Math.cos(v0Angle)), vmul(e2, Math.sin(v0Angle)));
  vecs = [v];
  for (let k = 1; k < path.length; k++) {
    let n = path[k];
    v = vunit(vsub(v, vmul(n, vdot(v, n))));
    vecs.push(v);
  }
  let vf = vecs[vecs.length - 1], vi = vecs[0];
  holo = Math.atan2(vdot(vcross(vi, vf), p0), vdot(vi, vf));   // 回った角度（法線まわり）
  area = loopType === 1 ? TWO_PI * (1 - Math.cos(colat)) : sweep;   // 囲んだ面積（半径 1）
  // 囲んだ部分を色ぬり
  if (capModel) freeGeometry(capModel);
  let lifted = (u, w) => vmul(sph(u, w), 1.004);
  capModel = loopType === 1 ? makeSurface(lifted, 0, TWO_PI, 0.001, colat, 48, 16, () => [255, 200, 90, 90])
    : makeSurface(lifted, 0, sweep, 0.001, HALF_PI, 32, 20, () => [255, 200, 90, 90]);
  if (pathModel) freeGeometry(pathModel);
  pathModel = buildGeometry(() => { noFill(); beginShape(); for (let p of path) vtx(vmul(p, 1.006)); endShape(); });
  pathModel.lineColor = [255, 230, 120];
  prog = 0;
}

function draw() {
  background(14, 16, 26);
  dragView();
  prog = min(path.length - 1, prog + speedP);
  ambientLight(120); directionalLight(255, 255, 255, 0.3, 0.6, -1);
  push();
  rotateX(rotX); rotateY(rotY);
  model(sphereModel); showLines(gridModel);
  model(capModel);
  showLines(pathModel, 3);
  // 運ばれた矢印（あと）
  for (let k = 0; k <= prog; k += 30) arrow(path[k], vecs[k], 0.18, [120, 220, 255], 2);
  arrow(path[0], vecs[0], 0.3, [255, 255, 255], 3);                 // 最初の矢印（白）
  arrow(path[prog], vecs[prog], 0.3, [255, 90, 120], 5);           // 今の矢印（赤）
  pop();
  drawHud();
  showHud();
}
function arrow(p, v, L, c, w) {
  let a = vmul(p, 1.01), b = vadd(a, vmul(v, L));
  stroke(...c); strokeWeight(w); seg(a, b);
  let q = toP(b);
  push(); translate(q[0], q[1], q[2]); noStroke(); fill(...c); sphere(w + 2); pop();
}

function drawHud() {
  hud.clear();
  hud.noStroke(); hud.fill(255); hud.textSize(18);
  hud.text('1：緯線ループ　2：測地三角形　↑↓：大きさ　←→：最初の向き　スペース：もう一度　ドラッグ：視点', 20, 40);
  hud.fill(170); hud.textSize(15);
  hud.text('白 = 出発時の矢印、赤 = 運んでいる矢印、水色 = 運んだあと。矢印は「その場の接平面の中で、できるだけ向きを変えない」ように運ぶ', 20, 68);
  let done = prog >= path.length - 1;
  let x = 20, y = height - 190;
  hud.fill(0, 0, 0, 160); hud.rect(x - 10, y - 30, 560, 170, 10);
  hud.textSize(17); hud.fill(255);
  hud.text(loopType === 1 ? '緯線ループ：北極からの角度 θ0 = ' + nf(degrees(colat), 1, 0) + '°' : '測地三角形：赤道を進む角度 α = ' + nf(degrees(sweep), 1, 0) + '°（角の和 = 180° + α）', x, y);
  hud.fill(255, 90, 120);
  hud.text('1 周して回った角度 = ' + (done ? nf(degrees(holo), 1, 1) + '°' : '（運んでいる途中…）'), x, y + 32);
  hud.fill(255, 200, 90);
  let am = ((degrees(area) + 180) % 360 + 360) % 360 - 180;
  hud.text('囲んだ面積 ÷ R² = ' + nf(area, 1, 3) + ' rad = ' + nf(degrees(area), 1, 1) + '°' + (loopType === 1 ? '（−180〜180° に直すと ' + nf(am, 1, 1) + '°）' : ''), x, y + 60);
  hud.fill(200); hud.textSize(14);
  hud.text(loopType === 1 ? '緯線の面積 = 2π(1 − cos θ0)。赤道（θ0 = 90°）なら 2π = 1 回転 → 元どおりに見える' : '三角形の面積 = 角の和 − 180°（08 のガウス＝ボネ）。α = 90° なら球面の 1/8', x, y + 90);
  hud.text('ホロノミー：回った角度 = ∬ K dA（囲んだ部分の曲率の合計）。平面なら K = 0 で回らない', x, y + 114);
}

function mousePressed() { dragging = true; }
function mouseReleased() { dragging = false; }
function keyPressed() {
  if (key === '1' || key === '2') { loopType = int(key); rebuild(); }
  if (key === UP_ARROW) { if (loopType === 1) colat = min(PI - 0.1, colat + 0.1); else sweep = min(TWO_PI - 0.2, sweep + 0.1); rebuild(); }
  if (key === DOWN_ARROW) { if (loopType === 1) colat = max(0.1, colat - 0.1); else sweep = max(0.1, sweep - 0.1); rebuild(); }
  if (key === LEFT_ARROW) { v0Angle -= 0.3; rebuild(); }
  if (key === RIGHT_ARROW) { v0Angle += 0.3; rebuild(); }
  if (key === ' ') prog = 0;
}

// ---------- やってみよう ----------
// 1. 三角形で α = 90° にする。矢印は何度回る？ 球面の 1/8 の面積（4π/8 = π/2）と比べよう
// 2. 緯線ループで θ0 を小さく（北極のまわりの小さな円）。回る角度 ≈ 面積 = π θ0²（平らに近い）
// 3. 最初の向き（←→）を変えても回る角度は同じ。回る角度はループだけで決まる
// 4. 赤道（θ0 = 90°）は測地線。赤道に沿って運ぶと矢印は赤道に対して一定の角度を保つ。北の緯線では？


// ==================================================
// ここから下は「3D の道具」（視点・ベクトル計算・面をつくる・画面への投影）
// ==================================================
let rotX = -0.5, rotY = 0.5, EZ, hud, dragging = false;
function setupView() {
  EZ = height / 2 / Math.tan(PI / 6);
  perspective(PI / 3, width / height, EZ / 20, EZ * 20);
  camera(0, 0, EZ, 0, 0, 0, 0, 1, 0);
  hud = createGraphics(width, height);
}
function dragView() { if (mouseIsPressed && dragging) { rotY += movedX * 0.01; rotX = constrain(rotX - movedY * 0.01, -1.5, 1.5); } }
function showHud() { drawingContext.clear(drawingContext.DEPTH_BUFFER_BIT); noLights(); image(hud, -width / 2, -height / 2); }
// 数学の座標（z が上）→ p5 の座標（y が下）に SC 倍
function toP(p) { return [p[0] * SC, -p[2] * SC, p[1] * SC]; }
function vtx(p) { let q = toP(p); vertex(q[0], q[1], q[2]); }
function seg(a, b) { let p = toP(a), q = toP(b); line(p[0], p[1], p[2], q[0], q[1], q[2]); }
function vadd(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function vsub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function vmul(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
function vdot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function vcross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function vlen(a) { return Math.sqrt(vdot(a, a)); }
function vunit(a) { let l = vlen(a) || 1; return vmul(a, 1 / l); }
// 面 f(u, v) を三角形でつくる（col(u, v) → [r, g, b] で色）
function makeSurface(f, u0, u1, v0, v1, nu, nv, col) {
  return buildGeometry(() => {
    noStroke();
    beginShape(TRIANGLES);
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      for (let [a, b] of [[0, 0], [1, 0], [1, 1], [0, 0], [1, 1], [0, 1]]) {
        let u = u0 + ((u1 - u0) * (i + a)) / nu, v = v0 + ((v1 - v0) * (j + b)) / nv, e = 0.001;
        let n = vunit(vcross(vsub(f(u + e, v), f(u - e, v)), vsub(f(u, v + e), f(u, v - e))));
        fill(...col(u, v)); normal(n[0], -n[2], n[1]); vtx(f(u, v));
      }
    }
    endShape();
  });
}
// 面の網目（u 一定の線と v 一定の線）。線の色は showLines で描くときに決まる
function makeGrid(f, u0, u1, v0, v1, nu, nv, c) {
  let geo = buildGeometry(() => {
    noFill();
    for (let side of [1, -1]) {   // 面の表と裏に少し浮かせて 2 回（面にうもれないように）
      let g = (u, v) => { let e = 0.001, n = vunit(vcross(vsub(f(u + e, v), f(u - e, v)), vsub(f(u, v + e), f(u, v - e)))); return vadd(f(u, v), vmul(n, 0.005 * side)); };
      for (let i = 0; i <= nu; i++) { beginShape(); for (let k = 0; k <= 60; k++) vtx(g(u0 + ((u1 - u0) * i) / nu, v0 + ((v1 - v0) * k) / 60)); endShape(); }
      for (let j = 0; j <= nv; j++) { beginShape(); for (let k = 0; k <= 90; k++) vtx(g(u0 + ((u1 - u0) * k) / 90, v0 + ((v1 - v0) * j) / nv)); endShape(); }
    }
  });
  geo.lineColor = c;
  return geo;
}
// buildGeometry でつくった線は、model() の直前の stroke の色で描かれる
function showLines(geo, w) { stroke(...geo.lineColor); strokeWeight(w || 1); model(geo); }
