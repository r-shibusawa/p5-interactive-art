// ============================================
// 03 カスプのカタストロフィー（cusp）
// V(x) = x⁴ + a·x² + b·x。平衡点 V'(x) = 4x³ + 2a·x + b = 0 を (a, b, x) の空間に描くと「折りたたまれた布」になる
//   状態（黄の玉）はいまいる布の上をすべり、布の折り目（へり）まで来ると下の布へ「落ちる」
//   折り目を下の平面 (a, b) に映すと、とがった曲線（カスプ）8a³ + 27b² = 0。この内側では谷が 2 つある
// 左下の四角をドラッグ = コントロール点 (a, b) を動かす / それ以外をドラッグ = 視点 / ←→ = b / ↑↓ = a / A = 自動で回る / R = 視点を戻す
// ============================================

let a = -2, b = -2;          // コントロール（下の平面の点）
let x = -1;                  // 状態（布の上の高さ）
let SX = 95, SZ = 75, SY = 120, PLANE_Y = 240;   // ★ 見た目の拡大率（b → 横、a → 奥、x → 上）
let auto = true;
let t = 0;
let trail = [];
let flash = 0, jumpCount = 0;
let surf, inset;
let INS = 260;               // 左下の四角の大きさ

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  setupView();
  inset = createGraphics(INS + 40, INS + 70);
  // ★ 布（平衡点の面）：a と x を決めると b = −4x³ − 2a·x が決まる
  surf = makeSheet(-3, 1.5, -1.6, 1.6, 50, 160);
  surf.computeNormals();
}

function dV(xx) { return 4 * xx * xx * xx + 2 * a * xx + b; }

function draw() {
  background(12, 16, 32);
  dragView();
  if (auto) { t += 0.006; a = -1.3 + 1.1 * Math.sin(t * 0.7); b = 2.6 * Math.cos(t); }
  // 状態は坂を下る：dx/dt = −V'(x)（速いので小さな刻みで）
  let before = x;
  for (let k = 0; k < 20; k++) x -= 0.004 * dV(x);
  x = constrain(x, -1.8, 1.8);
  if (abs(x - before) > 0.05) { if (flash < 20) jumpCount++; flash = 40; }
  trail.push([a, b, x]); if (trail.length > 300) trail.shift();

  push();
  rotateX(rotX); rotateY(rotY);
  ambientLight(90); directionalLight(255, 255, 255, 0.3, 0.8, -0.5);
  noStroke(); model(surf);
  noLights();
  // 下の平面 (a, b)
  push(); translate(0, PLANE_Y, -0.75 * SZ); rotateX(HALF_PI); fill(40, 55, 90); plane(6 * SX, 4.5 * SZ); pop();
  // 折り目（布のへり）と、その影のカスプ曲線：a = −6s², b = 8s³, x = s
  strokeWeight(3); noFill();
  stroke(255, 120, 120); beginShape(); for (let s = -0.7; s <= 0.7; s += 0.02) { let aa = -6 * s * s; vertex(8 * s * s * s * SX, -s * SY, aa * SZ); } endShape();
  stroke(255, 220, 90); beginShape(); for (let s = -0.7; s <= 0.7; s += 0.02) { let aa = -6 * s * s; vertex(8 * s * s * s * SX, PLANE_Y - 1, aa * SZ); } endShape();
  // 軌跡
  stroke(120, 230, 255); strokeWeight(2);
  beginShape(); for (let p of trail) vertex(p[1] * SX, -p[2] * SY, p[0] * SZ); endShape();
  // 状態と、その影
  stroke(255, 255, 255, 120); strokeWeight(1); line(b * SX, -x * SY, a * SZ, b * SX, PLANE_Y, a * SZ);
  noStroke();
  push(); translate(b * SX, PLANE_Y - 2, a * SZ); fill(255, 220, 90); sphere(6); pop();
  push(); translate(b * SX, -x * SY, a * SZ); fill(255, 220, 90); sphere(11);
  if (flash > 0) { fill(255, 240, 150, flash * 4); sphere(14 + (40 - flash)); }
  pop();
  pop();
  if (flash > 0) flash--;

  drawHud();
  showHud();
  image(inset, -width / 2 + 20, height / 2 - INS - 90);
}

function drawHud() {
  hud.clear();
  hud.noStroke(); hud.fill(255); hud.textSize(18);
  hud.text('(a, b) = (' + nf(a, 1, 2) + ', ' + nf(b, 1, 2) + ')　x = ' + nf(x, 1, 2) + '　とんだ回数 ' + jumpCount + '　A：自動 ' + (auto ? 'ON' : 'off') + '　←→ b　↑↓ a　ドラッグ：視点　R：視点を戻す', 20, 40);
  hud.fill(170); hud.textSize(15);
  hud.text('上の布 = 平衡点 (a, b, x)。オレンジ = 上の谷、水色 = 下の谷、暗い赤 = 真ん中の山（不安定）。赤い線 = 折り目、黄の線 = その影（カスプ 8a³ + 27b² = 0）', 20, 68);
  // 左下：コントロール平面（横 = b、縦 = a）
  let g = inset;
  g.clear(); g.noStroke(); g.fill(0, 0, 0, 170); g.rect(0, 0, INS + 40, INS + 70, 10);
  let ox = 20, oy = 34;
  g.fill(255); g.textSize(14); g.text('コントロール (a, b)：ドラッグ', ox, 22);
  g.fill(40, 50, 80); g.rect(ox, oy, INS, INS);
  // カスプの内側（谷が 2 つ）
  g.fill(255, 220, 90, 60); g.stroke(255, 220, 90); g.strokeWeight(2);
  g.beginShape();
  for (let s = -0.7; s <= 0.701; s += 0.02) { let p = toInset(-6 * s * s, 8 * s * s * s); g.vertex(p[0], p[1]); }
  g.endShape(CLOSE);
  g.noStroke(); g.fill(120, 230, 255, 150);
  for (let i = 0; i < trail.length; i += 3) { let p = toInset(trail[i][0], trail[i][1]); g.circle(p[0], p[1], 3); }
  let p = toInset(a, b);
  g.fill(x > 0 ? color(255, 160, 80) : color(120, 200, 255)); g.circle(p[0], p[1], 14);
  g.fill(200); g.textSize(12);
  g.text('← b →', ox + INS / 2 - 18, oy + INS + 18);
  g.text('黄の内側 = 谷が 2 つ（どちらにいるかは歴史しだい）', ox, oy + INS + 34);
}
function toInset(aa, bb) { return [20 + (bb + 3) / 6 * INS, 34 + (1.5 - aa) / 4.5 * INS]; }
function inInset() { return mouseX > 40 && mouseX < 40 + INS && mouseY > height - INS - 56 && mouseY < height - 56; }

function mousePressed() {
  if (inInset()) { auto = false; dragging = false; setFromMouse(); } else dragging = true;
}
function mouseDragged() { if (!dragging && inInset()) setFromMouse(); }
function setFromMouse() {
  b = constrain((mouseX - 40) / INS * 6 - 3, -3, 3);
  a = constrain(1.5 - (mouseY - (height - INS - 56)) / INS * 4.5, -3, 1.5);
}
function keyPressed() {
  if (key === LEFT_ARROW) { auto = false; b = max(-3, b - 0.1); }
  if (key === RIGHT_ARROW) { auto = false; b = min(3, b + 0.1); }
  if (key === UP_ARROW) { auto = false; a = min(1.5, a + 0.1); }
  if (key === DOWN_ARROW) { auto = false; a = max(-3, a - 0.1); }
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'r' || key === 'R') { rotX = -0.45; rotY = -0.6; }
}

// ---------- やってみよう ----------
// 1. a = 0.5（カスプの外）で b を左右に動かすと x はなめらか。a = −2 だと？ 同じ b でも x が 2 つありうる
// 2. カスプのとがった点 (0, 0) のすぐ上を通る道と、すぐ下を通る道で、玉の動きを比べよう
// 3. 自動の道（a, b の式）を変えて、カスプの内側をぐるぐる回る道をつくると、とぶ回数は？
// 4. 布の色を「谷の深さ」で塗り分けてみよう（col 関数の中を変える）


// ==================================================
// ここから下は「3D の道具」（視点・面をつくる・画面に文字を出す）
// ==================================================
let rotX = -0.45, rotY = -0.6, EZ, hud, dragging = false;
function setupView() {
  EZ = height / 2 / Math.tan(PI / 6);
  perspective(PI / 3, width / height, EZ / 20, EZ * 20);
  camera(0, 0, EZ, 0, 0, 0, 0, 1, 0);
  hud = createGraphics(width, 90);
}
function dragView() { if (mouseIsPressed && dragging) { rotY += movedX * 0.01; rotX = constrain(rotX - movedY * 0.01, -1.5, 1.5); } }
function showHud() { drawingContext.clear(drawingContext.DEPTH_BUFFER_BIT); noLights(); image(hud, -width / 2, -height / 2); }
// 布の色：真ん中（V'' < 0）は暗い赤、上の谷はオレンジ、下の谷は水色
function col(aa, xx) {
  if (12 * xx * xx + 2 * aa < 0) return [130, 40, 60];
  return xx > 0 ? [255, 150 + xx * 40, 70] : [90, 170 - xx * 30, 255];
}
// (a, x) の格子から三角形をつくる。b が範囲の外の三角形は捨てる
function makeSheet(a0, a1, x0, x1, na, nx) {
  return buildGeometry(() => {
    noStroke();
    beginShape(TRIANGLES);
    for (let i = 0; i < na; i++) for (let j = 0; j < nx; j++) {
      let pts = [[0, 0], [1, 0], [1, 1], [0, 0], [1, 1], [0, 1]].map(([di, dj]) => {
        let aa = a0 + (a1 - a0) * (i + di) / na, xx = x0 + (x1 - x0) * (j + dj) / nx;
        return [aa, xx, -4 * xx * xx * xx - 2 * aa * xx];
      });
      for (let k = 0; k < 6; k += 3) {
        let tri = pts.slice(k, k + 3);
        if (tri.some((p) => Math.abs(p[2]) > 3)) continue;
        for (let p of tri) { fill(...col(p[0], p[1])); vertex(p[2] * SX, -p[1] * SY, p[0] * SZ); }
      }
    }
    endShape();
  });
}
