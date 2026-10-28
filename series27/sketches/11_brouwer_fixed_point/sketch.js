// ============================================
// 11 ブラウワーの不動点定理（2 次元のイメージ）
// 円板を自分自身の中へ連続に（ちぎらずに）写すと、必ずどこか 1 点は動かない（不動点）
//   色 = 各点が動く向き。すべての色が集まる点が不動点。矢印 = 点がどこへ行くか
// ドラッグ = 縮める中心 q を動かす / ←→ = 回転 / ↑↓ = 縮める割合 k / S = うずまき ON/OFF / クリック（Shift） = その点から写像をくり返す / A = 矢印
// ============================================

let theta = 0.9;             // ★ 回転の角度
let k = 0.8;                 // ★ 縮める割合（1 = 縮めない）
let swirl = 2.5;             // ★ うずまきの強さ（中心ほど多く回る）
let q = { x: 0.3, y: -0.2 }; // 縮める中心
let showArrows = true;
let colorG, dirty = true;
let iter = null;
let fixedPt = null;
let Rd, cx, cy;
let dragging = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  Rd = min(width * 0.3, height * 0.38); cx = width * 0.08 + Rd; cy = height * 0.55;
  colorG = createGraphics(140, 140);
  colorG.pixelDensity(1);
}

// ★ 写像 f：回転（中心ほど多く回るうずまき）してから、点 q へ向かって k 倍に縮める。円板の中に収まる
function f(x, y) {
  let a = theta + swirl * (1 - (x * x + y * y));
  let rx = x * Math.cos(a) - y * Math.sin(a), ry = x * Math.sin(a) + y * Math.cos(a);
  return { x: q.x + k * (rx - q.x), y: q.y + k * (ry - q.y) };
}

// 不動点さがし：粗く |f(p) − p| が最小の所を探し、細かく詰める
function findFixed() {
  let best = null, bd = 1e9;
  for (let i = 0; i <= 60; i++) for (let j = 0; j <= 60; j++) {
    let x = -1 + (2 * i) / 60, y = -1 + (2 * j) / 60;
    if (x * x + y * y > 1) continue;
    let p = f(x, y), d = Math.hypot(p.x - x, p.y - y);
    if (d < bd) { bd = d; best = { x, y }; }
  }
  let h = 0.03;
  for (let it = 0; it < 200 && h > 1e-7; it++) {
    let improved = false;
    for (let [dx, dy] of [[h, 0], [-h, 0], [0, h], [0, -h]]) {
      let x = best.x + dx, y = best.y + dy, p = f(x, y), d = Math.hypot(p.x - x, p.y - y);
      if (d < bd) { bd = d; best = { x, y }; improved = true; }
    }
    if (!improved) h /= 2;
  }
  return { x: best.x, y: best.y, err: bd };
}

function makeColors() {
  let n = colorG.width;
  colorG.loadPixels();
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    let x = -1 + (2 * (i + 0.5)) / n, y = 1 - (2 * (j + 0.5)) / n, o = 4 * (i + j * n);
    if (x * x + y * y > 1) { colorG.pixels[o + 3] = 0; continue; }
    let p = f(x, y), dx = p.x - x, dy = p.y - y, m = Math.hypot(dx, dy);
    let c = hsb2rgb(((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360, 0.7, 0.3 + 0.6 * Math.min(1, m * 3));
    colorG.pixels[o] = c[0]; colorG.pixels[o + 1] = c[1]; colorG.pixels[o + 2] = c[2]; colorG.pixels[o + 3] = 255;
  }
  colorG.updatePixels();
  fixedPt = findFixed();
  dirty = false;
}
// 色相（0〜360）・彩度・明るさ（0〜1）→ RGB（0〜255）
function hsb2rgb(h, s, v) {
  let c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c, r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0]; else if (h < 120) [r, g, b] = [x, c, 0]; else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c]; else if (h < 300) [r, g, b] = [x, 0, c]; else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

function draw() {
  background(260, 25, 11);
  if (keyIsDown(LEFT_ARROW)) { theta -= 0.02; dirty = true; }
  if (keyIsDown(RIGHT_ARROW)) { theta += 0.02; dirty = true; }
  if (keyIsDown(UP_ARROW)) { k = min(1, k + 0.005); dirty = true; }
  if (keyIsDown(DOWN_ARROW)) { k = max(0.1, k - 0.005); dirty = true; }
  if (dragging) {
    let x = (mouseX - cx) / Rd, y = -(mouseY - cy) / Rd, m = Math.hypot(x, y);
    if (m > 0.95) { x *= 0.95 / m; y *= 0.95 / m; }
    q = { x, y }; dirty = true;
  }
  if (dirty) makeColors();
  image(colorG, cx - Rd, cy - Rd, Rd * 2, Rd * 2);
  noFill(); stroke(0, 0, 100); strokeWeight(2); circle(cx, cy, Rd * 2);
  // 矢印：p → f(p)
  if (showArrows) {
    stroke(0, 0, 100, 70); strokeWeight(1.5);
    for (let i = -7; i <= 7; i++) for (let j = -7; j <= 7; j++) {
      let x = i / 7.5, y = j / 7.5;
      if (x * x + y * y > 0.98) continue;
      let p = f(x, y), ax = cx + x * Rd, ay = cy - y * Rd, bx = cx + p.x * Rd, by = cy - p.y * Rd;
      let L = Math.hypot(bx - ax, by - ay), s = min(1, 22 / (L || 1));
      let ex = ax + (bx - ax) * s, ey = ay + (by - ay) * s;
      line(ax, ay, ex, ey); noStroke(); fill(0, 0, 100, 70); circle(ex, ey, 4); stroke(0, 0, 100, 70);
    }
  }
  // くり返しの軌跡
  if (iter) {
    let p = iter; noFill(); stroke(50, 90, 100); strokeWeight(2);
    beginShape(); vertex(cx + p.x * Rd, cy - p.y * Rd);
    for (let i = 0; i < 60; i++) { p = f(p.x, p.y); vertex(cx + p.x * Rd, cy - p.y * Rd); }
    endShape();
  }
  // q と不動点
  noStroke(); fill(0, 0, 100); circle(cx + q.x * Rd, cy - q.y * Rd, 12);
  if (fixedPt) {
    stroke(0, 0, 0); strokeWeight(3); fill(55, 90, 100);
    star(cx + fixedPt.x * Rd, cy - fixedPt.y * Rd, 9, 20);
  }
  let x0 = cx + Rd + 60;
  noStroke(); fill(0, 0, 100); textSize(22);
  text('不動点 x* = (' + nf(fixedPt.x, 1, 3) + ', ' + nf(fixedPt.y, 1, 3) + ')', x0, height * 0.3);
  textSize(18); text('|f(x*) − x*| = ' + fixedPt.err.toExponential(1), x0, height * 0.3 + 34);
  text('回転 ' + nf(theta, 1, 2) + '　k = ' + nf(k, 1, 2) + '　うずまき ' + (swirl ? 'ON' : 'off'), x0, height * 0.3 + 68);
  fill(0, 0, 65); textSize(15);
  let lines = ['色 = 点が動く向き。暗い = ほとんど動かない',
    'すべての色が集まる 1 点 ＝ 動かない点（星）',
    '黄色い線：Shift+クリックした点から f を 60 回',
    'k が小さいと不動点に吸いこまれる（縮小写像）',
    'k = 1 だと回り続けることもある',
    'コーヒーを静かにかき混ぜて止まったとき、',
    'どこか 1 点は元の場所にある'];
  lines.forEach((s, i) => text(s, x0, height * 0.3 + 120 + i * 26));
  fill(0, 0, 100); textSize(18);
  text('ドラッグ：q を動かす　←→：回転　↑↓：k　S：うずまき　Shift+クリック：くり返し　A：矢印', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('円板 → 円板 の連続写像には必ず不動点がある（ブラウワー）。白丸 = q。どこへ動かしても星は消えない', 20, 68);
}

function star(x, y, r1, r2) {
  beginShape();
  for (let i = 0; i < 10; i++) { let a = -HALF_PI + (i * PI) / 5, r0 = i % 2 ? r1 : r2; vertex(x + r0 * cos(a), y + r0 * sin(a)); }
  endShape(CLOSE);
}

function mousePressed() {
  let x = (mouseX - cx) / Rd, y = -(mouseY - cy) / Rd;
  if (x * x + y * y > 1) return;
  if (keyIsDown(SHIFT)) iter = { x, y }; else dragging = true;
}
function mouseReleased() { dragging = false; }
function keyPressed() {
  if (key === 's' || key === 'S') { swirl = swirl ? 0 : 2.5; dirty = true; }
  if (key === 'a' || key === 'A') showArrows = !showArrows;
}

// ---------- やってみよう ----------
// 1. q をどこへ動かしても、回転をどう変えても星は消えない。円板の外へ出す写像（k > 1）にすると？
// 2. 円板のかわりに「ドーナツ形（輪）」だと不動点のない写像がある。どんな写像？（ヒント：回転だけ）
// 3. f() を自分の式に変えてみよう。円板の中に収まっていれば、必ず色が全部集まる点がある
// 4. 1 次元版：[0, 1] → [0, 1] の連続関数のグラフは必ず y = x と交わる。紙に描いて確かめよう
