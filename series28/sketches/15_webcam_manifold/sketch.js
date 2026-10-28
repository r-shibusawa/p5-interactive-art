// ============================================
// 15 カメラ映像を球に貼る（おまけ）
// 平らなカメラ映像を、球面・トーラス・双曲円板に貼る。「どう貼るか」（写像）を変えると、同じ映像がまったくちがって見える
//   1 = 球面（正距円筒で巻く）2 = トーラス 3 = 球面（立体射影：北極から映像を投げる）4 = 双曲円板（ふちへ向かって無限にくり返す）
// 1〜4 = 形と貼り方 / ←→ = 映像をずらす / ↑↓ = 映像の大きさ / スペース = 自動回転 / ドラッグ = 視点 / S = 保存
// カメラが使えないときは、自動でつくった模様を貼る（カメラの許可が必要）
// ============================================

let cap, pg;
let vw = 320, vh = 240;        // ★ カメラ映像の大きさ
let kind = 1;
let zoom = 1;                  // ★ 映像の大きさ（3・4 で効く）
let shift = 0;                 // 映像のずれ
let spin = true;
let SC, geo = null;

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  setupView();
  SC = min(width, height) * 0.32;
  cap = createCapture(VIDEO, { flipped: true });
  cap.size(vw, vh);
  cap.hide();
  pg = createGraphics(vw, vh);
  textureMode(NORMAL);
  textureWrap(MIRROR);         // 0〜1 の外は鏡に映したようにくり返す
  rebuild();
}
function camReady() { return cap && cap.width > 0 && cap.elt.readyState >= 2; }
// カメラがないときの模様（市松模様と動く円）
function fallback() {
  pg.background(30, 40, 70);
  pg.noStroke();
  for (let i = 0; i < 8; i++) for (let j = 0; j < 6; j++) { pg.fill((i + j) % 2 ? [240, 200, 90] : [80, 140, 230]); pg.rect(i * 40, j * 40, 40, 40); }
  pg.fill(255, 80, 120); pg.circle(160 + 100 * Math.cos(frameCount * 0.03), 120 + 60 * Math.sin(frameCount * 0.05), 50);
  pg.fill(255); pg.textSize(28); pg.textAlign(CENTER, CENTER); pg.text('NO CAMERA', 160, 120);
  return pg;
}

// ★ 4 つの「貼り方」：面の点 (x, y, z) と、映像のどこ (s, t) を貼るか
function shapeAt(i, j, n) {
  let a = i / n, b = j / n;
  if (kind === 1) { let u = a * TWO_PI, v = (b - 0.5) * PI; return { p: [Math.cos(v) * Math.cos(u), Math.cos(v) * Math.sin(u), Math.sin(v)], s: a, t: 1 - b }; }
  if (kind === 2) { let u = a * TWO_PI, v = b * TWO_PI; return { p: [(1 + 0.45 * Math.cos(v)) * Math.cos(u), (1 + 0.45 * Math.cos(v)) * Math.sin(u), 0.45 * Math.sin(v)], s: a * 2, t: b }; }
  if (kind === 3) {
    // 球面の点を北極から平面に投げた位置 = 立体射影（01 の φN）で映像を読む
    let u = a * TWO_PI, v = (b - 0.5) * (PI - 0.02), p = [Math.cos(v) * Math.cos(u), Math.cos(v) * Math.sin(u), Math.sin(v)];
    let w = [p[0] / (1 - p[2]), p[1] / (1 - p[2])];
    return { p, s: 0.5 + (w[0] / 2) * zoom, t: 0.5 - (w[1] / 2) * zoom };
  }
  // 双曲円板：円板の点 z を、双曲距離に比例した大きさの平面へ（ふちに近いほど映像が細かくくり返す）
  let r = 0.995 * (1 - (1 - a) ** 2), th = b * TWO_PI;   // ふちの近くほど細かく
  let d = 2 * Math.atanh(r);                                     // 中心からの双曲距離
  let z = [r * Math.cos(th), r * Math.sin(th)];
  let k = (d / Math.max(r, 1e-6)) * 0.35 * zoom;
  return { p: [z[0] * 1.3, z[1] * 1.3, 0], s: 0.5 + z[0] * k, t: 0.5 - z[1] * k };
}
function rebuild() {
  if (geo) freeGeometry(geo);
  let n = kind === 4 ? 140 : 80;
  geo = buildGeometry(() => {
    noStroke(); beginShape(TRIANGLES);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let [a, b] of [[0, 0], [1, 0], [1, 1], [0, 0], [1, 1], [0, 1]]) {
      let q = shapeAt(i + a, j + b, n), P = toP(q.p);
      vertex(P[0], P[1], P[2], q.s, q.t);
    }
    endShape();
  });
}

function draw() {
  background(12, 12, 20);
  dragView();
  if (spin && !mouseIsPressed) rotY += 0.005;
  if (keyIsDown(LEFT_ARROW)) shift -= 0.01;
  if (keyIsDown(RIGHT_ARROW)) shift += 0.01;
  let src = camReady() ? cap : fallback();
  push();
  rotateX(kind === 4 ? rotX * 0.4 - 0.9 : rotX); rotateY(rotY);
  rotateY(shift);
  noStroke(); texture(src); model(geo);
  pop();
  hud.clear();
  hud.noStroke(); hud.fill(255); hud.textSize(18);
  hud.text('1：球面（巻く）　2：トーラス　3：球面（立体射影）　4：双曲円板　←→：ずらす　↑↓：大きさ ' + nf(zoom, 1, 2) + '　スペース：回転　S：保存', 20, 40);
  hud.fill(170); hud.textSize(15);
  hud.text(['', '長方形の映像を巻きつける（正距円筒図法の逆）。北極・南極では映像の上下の辺が 1 点につぶれる',
    'トーラス：映像の左右と上下を貼る（02）。横に 2 枚並べて 1 周', '北極から映像を投げると、北極のまわりで映像がどこまでも大きくなる（01・10 の平射）',
    '双曲円板（09）：どこも同じ大きさのはずの映像が、ふちに近づくほど小さく無限にくり返す'][kind], 20, 68);
  hud.text(camReady() ? '📷 カメラ映像' : 'カメラ待ち（または許可なし）→ 模様を表示中', 20, height - 24);
  showHud();
}

function mousePressed() { dragging = true; }
function mouseReleased() { dragging = false; }
function keyPressed() {
  if ('1234'.includes(key) && key.length === 1) { kind = int(key); rebuild(); }
  if (key === UP_ARROW) { zoom = min(4, zoom * 1.2); rebuild(); }
  if (key === DOWN_ARROW) { zoom = max(0.2, zoom / 1.2); rebuild(); }
  if (key === ' ') spin = !spin;
  if (key === 's' || key === 'S') saveCanvas('webcam_manifold', 'png');
}

// ---------- やってみよう ----------
// 1. 1 と 3 で自分の顔がどう変わるか比べよう。3 の北極（上）では何が起きている？
// 2. 4 の双曲円板で ↑↓。ふちの小さな映像は、双曲平面の中ではどれも中心と同じ大きさ（09 のタイル）
// 3. shapeAt の s, t の式を変えて、自分だけの「貼り方」をつくろう（例：s = a * 3 で 3 回くり返す）
// 4. 2 のトーラスで s = a * 2 を s = a に。左右のつなぎ目は見える？ 消すにはどうする？


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
