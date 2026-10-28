// ============================================
// 05 クラインの壺と射影平面（3D）
// 正方形の辺を矢印どおりに貼り合わせると曲面ができる：向きをそろえて貼るとトーラス、片方を逆にするとクラインの壺
//   右の正方形の中を歩くと、辺から出たとき貼り合わせた相手の辺から入ってくる。左は同じ点を 3D で見たもの
// 1 = トーラス / 2 = クラインの壺 / 3 = 射影平面 / 4 = 球面 / ←→ = 向きを変える / ↑↓ = 速さ / A = 自動で歩く / C = 跡を消す / ドラッグ = 視点
// ============================================

let surf = 1;
let wx = 0.3, wy = 0.4, head = 0.5, speed = 0.004;   // ★ 歩く人の位置・向き・速さ
let autoWalk = true;
let trail = [];
let rotX = -0.5, rotY = 0.4;
let hud, sqImg;                 // HUD と、正方形の色見本
let S3;                      // 3D の大きさ
let names = ['', 'トーラス', 'クラインの壺', '射影平面', '球面'];
let words = ['', 'a b a⁻¹ b⁻¹', 'a b a b⁻¹', 'a b a b', 'a a⁻¹ b b⁻¹'];
// 各辺の矢印 [辺, 向き(+1/−1), 文字]
let arrows = {
  1: [['B', 1, 'a'], ['T', 1, 'a'], ['L', 1, 'b'], ['R', 1, 'b']],
  2: [['B', 1, 'a'], ['T', 1, 'a'], ['L', 1, 'b'], ['R', -1, 'b']],
  3: [['B', 1, 'a'], ['T', -1, 'a'], ['L', 1, 'b'], ['R', -1, 'b']],
  4: [['L', 1, 'a'], ['B', 1, 'a'], ['R', 1, 'b'], ['T', 1, 'b']],
};

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  hud = createGraphics(width, height);
  S3 = min(width, height) * 0.2;
  sqImg = createGraphics(64, 64);
  sqImg.noStroke();
  for (let i = 0; i < 64; i++) for (let j = 0; j < 64; j++) { let c = squareColor(i / 63, 1 - j / 63); sqImg.fill(c[0], c[1], c[2]); sqImg.rect(i, j, 1, 1); }
}
function squareColor(x, y) { return [60 + 190 * x, 60 + 170 * y, 220 - 120 * x * y]; }

// ★ 正方形の点 (x, y)（0〜1）→ 3D の点
function surfPoint(x, y) {
  let u = x * TWO_PI, v = y * TWO_PI;
  if (surf === 1) { let r = 0.45; return [(1 + r * Math.cos(v)) * Math.cos(u), r * Math.sin(v), (1 + r * Math.cos(v)) * Math.sin(u)]; }
  if (surf === 2) {   // クラインの壺の「8 の字」型のはめこみ（自分と交わる）
    let q = Math.cos(u / 2) * Math.sin(v) - Math.sin(u / 2) * Math.sin(2 * v);
    return [((2 + q) * Math.cos(u)) / 2.6, (Math.sin(u / 2) * Math.sin(v) + Math.cos(u / 2) * Math.sin(2 * v)) / 2.6, ((2 + q) * Math.sin(u)) / 2.6];
  }
  if (surf === 3) {   // 射影平面：正方形 → 半球 → ローマ曲面 (yz, xz, xy)
    let px = 2 * x - 1, py = 2 * y - 1, m = Math.max(Math.abs(px), Math.abs(py)), rr = Math.hypot(px, py);
    let dx = rr > 1e-9 ? (px * m) / rr : 0, dy = rr > 1e-9 ? (py * m) / rr : 0;
    let dz = Math.sqrt(Math.max(0, 1 - dx * dx - dy * dy));
    return [dy * dz * 2.2, dx * dy * 2.2, dx * dz * 2.2];
  }
  // 球面：となりあう辺どうしを貼る（左＝下、右＝上）
  let s = x + y, d = x - y, m = Math.min(s, 2 - s);
  let phi = m > 1e-6 ? (Math.PI * d) / m : 0, th = (Math.PI * s) / 2;
  return [Math.sin(th) * Math.cos(phi), -Math.cos(th), Math.sin(th) * Math.sin(phi)];
}

// ★ 辺から出たら、貼り合わせた相手の辺から入る
function wrap() {
  let out = false;
  if (surf === 4) {
    let vx = Math.cos(head), vy = Math.sin(head), t;
    if (wx < 0) { t = wx; wx = wy; wy = -t; [vx, vy] = [vy, -vx]; out = true; }
    else if (wy < 0) { t = wx; wx = -wy; wy = t; [vx, vy] = [-vy, vx]; out = true; }
    else if (wx > 1) { t = wx; wx = wy; wy = 2 - t; [vx, vy] = [vy, -vx]; out = true; }
    else if (wy > 1) { t = wy; wy = wx; wx = 2 - t; [vx, vy] = [-vy, vx]; out = true; }
    head = Math.atan2(vy, vx);
  } else {
    let flipY = surf === 2 || surf === 3, flipX = surf === 3;
    if (wx < 0 || wx > 1) { wx -= Math.floor(wx); if (flipY) { wy = 1 - wy; head = -head; } out = true; }
    if (wy < 0 || wy > 1) { wy -= Math.floor(wy); if (flipX) { wx = 1 - wx; head = Math.PI - head; } out = true; }
  }
  wx = constrain(wx, 0, 1); wy = constrain(wy, 0, 1);
  return out;
}

function draw() {
  background(14, 18, 30);
  if (mouseIsPressed && mouseX < width * 0.55) { rotY += movedX * 0.01; rotX = constrain(rotX - movedY * 0.01, -1.5, 1.5); }
  if (keyIsDown(LEFT_ARROW)) head += 0.04;
  if (keyIsDown(RIGHT_ARROW)) head -= 0.04;
  if (autoWalk) head += (noise(frameCount * 0.01) - 0.5) * 0.06;
  for (let k = 0; k < 2; k++) {
    wx += Math.cos(head) * speed; wy += Math.sin(head) * speed;
    if (wrap()) trail.push(null);
    trail.push([wx, wy]);
  }
  if (trail.length > 1500) trail.splice(0, trail.length - 1500);

  push();
  translate(-width * 0.2, 30, 0);
  rotateX(rotX); rotateY(rotY);
  ambientLight(120); directionalLight(255, 255, 255, 0.4, 0.6, -0.7);
  noStroke();
  let nx = 48, ny = 32;
  for (let j = 0; j < ny; j++) {
    beginShape(TRIANGLE_STRIP);
    for (let i = 0; i <= nx; i++) for (let jj of [j, j + 1]) {
      let x = i / nx, y = jj / ny, c = squareColor(x, y), p = surfPoint(x, y);
      fill(c[0], c[1], c[2]); vertex(p[0] * S3, p[1] * S3, p[2] * S3);
    }
    endShape();
  }
  // 跡と歩く人
  noFill(); stroke(255, 60, 60); strokeWeight(3);
  let run = [];
  for (let q of trail.concat([null])) {
    if (q) { let p = surfPoint(q[0], q[1]); run.push([p[0] * S3, p[1] * S3, p[2] * S3]); continue; }
    if (run.length > 1) { beginShape(); for (let v of run) vertex(...v); endShape(); }
    run = [];
  }
  let p = surfPoint(wx, wy);
  noStroke(); fill(255, 230, 60);
  push(); translate(p[0] * S3, p[1] * S3, p[2] * S3); sphere(9); pop();
  pop();

  drawHud();
  drawingContext.clear(drawingContext.DEPTH_BUFFER_BIT);
  image(hud, -width / 2, -height / 2);
}

function drawHud() {
  hud.clear(); hud.noStroke(); hud.fill(255); hud.textSize(18);
  hud.text('1：トーラス　2：クラインの壺　3：射影平面　4：球面　←→：向き　↑↓：速さ　A：自動 ' + (autoWalk ? 'ON' : 'off') + '　C：跡を消す　ドラッグ：視点', 20, 40);
  hud.fill(170); hud.textSize(15);
  hud.text('同じ文字の辺を、矢印の向きがそろうように貼り合わせる。色は正方形の場所の目印（左の 3D と同じ色）', 20, 68);
  let Q = min(width * 0.34, height * 0.58), X0 = width - Q - 70, Y0 = 150;
  hud.image(sqImg, X0, Y0, Q, Q);
  // 跡
  hud.stroke(255, 60, 60); hud.strokeWeight(2); hud.noFill();
  let prev = null;
  for (let q of trail) { if (!q) { prev = null; continue; } let c = [X0 + q[0] * Q, Y0 + (1 - q[1]) * Q]; if (prev) hud.line(prev[0], prev[1], c[0], c[1]); prev = c; }
  hud.noStroke(); hud.fill(255, 230, 60); hud.circle(X0 + wx * Q, Y0 + (1 - wy) * Q, 14);
  // 辺の矢印
  for (let [e, d, lab] of arrows[surf]) {
    let col = lab === 'a' ? [255, 150, 60] : [90, 220, 255];
    let x1, y1, x2, y2;
    if (e === 'B') { x1 = X0; y1 = Y0 + Q; x2 = X0 + Q; y2 = Y0 + Q; }
    if (e === 'T') { x1 = X0; y1 = Y0; x2 = X0 + Q; y2 = Y0; }
    if (e === 'L') { x1 = X0; y1 = Y0 + Q; x2 = X0; y2 = Y0; }
    if (e === 'R') { x1 = X0 + Q; y1 = Y0 + Q; x2 = X0 + Q; y2 = Y0; }
    if (d < 0) [x1, y1, x2, y2] = [x2, y2, x1, y1];
    hud.stroke(...col); hud.strokeWeight(6); hud.line(x1, y1, x2, y2);
    let mx = (x1 + x2) / 2, my = (y1 + y2) / 2, ang = Math.atan2(y2 - y1, x2 - x1), n = lab === 'a' ? 1 : 2;
    for (let k = 0; k < n; k++) {
      let cx = mx + Math.cos(ang) * k * 16, cy = my + Math.sin(ang) * k * 16;
      hud.line(cx, cy, cx - 16 * Math.cos(ang - 0.6), cy - 16 * Math.sin(ang - 0.6));
      hud.line(cx, cy, cx - 16 * Math.cos(ang + 0.6), cy - 16 * Math.sin(ang + 0.6));
    }
    hud.noStroke(); hud.fill(...col); hud.textSize(22);
    hud.text(lab, mx + (e === 'L' ? -34 : e === 'R' ? 18 : 6), my + (e === 'T' ? -14 : e === 'B' ? 30 : 6));
  }
  hud.noStroke(); hud.fill(255, 230, 120); hud.textSize(30);
  hud.text(names[surf], X0, Y0 + Q + 56);
  hud.fill(255); hud.textSize(18);
  hud.text('辺の読み方（左下から反時計回り）：' + words[surf], X0, Y0 + Q + 88);
  let notes = ['', '向きが保たれる。穴 1 つのドーナツ', '左右の辺は上下さかさまに貼る → 3D では自分と交わる', '左右も上下もさかさま → 向きのない閉じた曲面', 'となりあう辺どうしを貼る → 封筒を閉じると風船（球）'];
  hud.fill(170); hud.textSize(15);
  hud.text(notes[surf], X0, Y0 + Q + 116);
}

function keyPressed() {
  if ('1234'.includes(key) && key.length === 1) { surf = int(key); trail = []; }
  if (key === 'a' || key === 'A') autoWalk = !autoWalk;
  if (key === 'c' || key === 'C') trail = [];
  if (key === UP_ARROW) speed = min(0.02, speed + 0.001);
  if (key === DOWN_ARROW) speed = max(0, speed - 0.001);
}

// ---------- やってみよう ----------
// 1. クラインの壺で、まっすぐ右へ歩き続けると、上下がさかさまになって戻ってくる。跡で確かめよう
// 2. トーラスで向きを「右に 1、上に 2」の傾きにすると跡が閉じる。無理数の傾きだと？
// 3. 射影平面の正方形で、中心を通ってまっすぐ歩くと何回で元に戻る？
// 4. arrows に自分の貼り方（たとえば上下だけ逆）を追加して、どの曲面になるか考えよう
