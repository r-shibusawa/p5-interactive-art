// ============================================
// 01 同次座標：[x, y, w] と無限遠点
// 平面の点 (X, Y) を 3 つの数 [x, y, w]（X = x/w, Y = y/w）で表す。[x, y, w] と [2x, 2y, 2w] は同じ点（スケール倍は同一視）
//   w → 0 にすると点は方向 (x, y) に飛んでいき、w = 0 で「無限遠点」になる。w が負になると反対側から帰ってくる！
//   右：射影平面の球面モデル。原点を通る直線（= 1 点）が球と交わる 2 点（対蹠点）を同じ点とみなす。赤道 = 無限遠直線
// 左の図でドラッグ = (x, y) を決める / ←→ = w を変える / 0 = w を 0 に / 1 = w を 1 に / M = スケール倍を表示 / R = リセット
// ============================================

let hx = 1.4, hy = 0.9, hw = 1;   // ★ 同次座標 [x, y, w]
let showMult = true;
let U;                            // 1 単位 = U px
let trail = [];
let holdT = 0;                    // ←→ を押し続けているフレーム数

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  U = min(width / 3, height) * 0.16;
}

// 3 つの図の枠（左：平面 w=1、中：x–w 断面、右：球面モデル）
function panels() {
  let w = width / 3, top = 100, h = height - 150;
  return [[0, top, w - 10, top + h], [w, top, 2 * w - 10, top + h], [2 * w, top, 3 * w - 10, top + h]];
}

function draw() {
  background(30, 35, 11);
  let [L, M, Rp] = panels();
  // ←→ は押し続けると少しずつ w が動く（keyPressed は押し続けても 1 回しか呼ばれない）
  holdT = keyIsDown(LEFT_ARROW) || keyIsDown(RIGHT_ARROW) ? holdT + 1 : 0;
  if (holdT >= 20 && holdT % 2 === 0) hw = keyIsDown(LEFT_ARROW) ? max(-2, hw - 0.04) : min(2, hw + 0.04);
  if (mouseIsPressed && mouseX < L[2] && mouseY > L[1]) {
    let c = center(L);
    hx = constrain((mouseX - c.x) / U, -6, 6); hy = constrain((c.y - mouseY) / U, -6, 6);
  }
  let px = toPlane(hx, hy, hw);
  if (px) { trail.push(px); if (trail.length > 150) trail.shift(); }

  drawPlane(L, px);
  drawSection(M);
  drawSphere(Rp);

  noStroke(); fill(0, 0, 100); textSize(18);
  text('[x, y, w] = [' + nf(hx, 1, 2) + ', ' + nf(hy, 1, 2) + ', ' + nf(hw, 1, 2) + ']　→　' +
       (px ? '(X, Y) = (x/w, y/w) = (' + nf(px.x, 1, 2) + ', ' + nf(px.y, 1, 2) + ')' : '無限遠点（方向 (' + nf(hx, 1, 2) + ', ' + nf(hy, 1, 2) + ')）') +
       '　　←→：w　0/1：w = 0, 1　M：スケール倍　ドラッグ：(x, y)', 20, 40);
  fill(0, 0, 65); textSize(15);
  text('w を小さくすると点は遠くへ。w = 0 で無限遠（矢印）。w を負にすると反対側から戻ってくる ─ 射影平面では「無限遠の向こう」がつながっている', 20, 68);
}

// 左：ふつうの平面（w = 1 の切り口）。点 (x/w, y/w)
function drawPlane(b, px) {
  let c = center(b);
  frame(b, '平面（w = 1 の断面）');
  clipTo(b);
  stroke(0, 0, 100, 15); strokeWeight(1);
  for (let i = -20; i <= 20; i++) { line(c.x + i * U, b[1], c.x + i * U, b[3]); line(b[0], c.y + i * U, b[2], c.y + i * U); }
  drawingContext.restore();
  stroke(0, 0, 100, 40); line(c.x, b[1], c.x, b[3]); line(b[0], c.y, b[2], c.y);
  // 軌跡
  noFill(); stroke(200, 60, 95, 40); strokeWeight(2);
  beginShape(); for (let p of trail) { let s = toScreen(p, c); if (inside(s, b)) vertex(s.x, s.y); } endShape();
  // (x, y) そのもの（薄い矢印）
  stroke(45, 80, 100, 60); strokeWeight(2);
  line(c.x, c.y, c.x + hx * U, c.y - hy * U);
  noStroke(); fill(45, 80, 100, 60); circle(c.x + hx * U, c.y - hy * U, 10);
  fill(45, 80, 100); textSize(13); text('(x, y)', c.x + hx * U + 8, c.y - hy * U - 8);
  // 点 P
  if (px) {
    let s = toScreen(px, c);
    if (inside(s, b)) { noStroke(); fill(15, 80, 100); circle(s.x, s.y, 16); fill(0, 0, 100); textSize(16); text('P = (x/w, y/w)', s.x + 12, s.y - 10); }
    else drawEdgeArrow(b, px.x, px.y, c, '遠くへ');
  } else drawEdgeArrow(b, hx, hy, c, '無限遠点');
  if (showMult) {
    fill(0, 0, 80); textSize(14);
    let ks = [2, 0.5, -1];
    text('同じ点を表す同次座標（スケール倍）：', b[0] + 16, b[3] - 70);
    for (let i = 0; i < ks.length; i++) text('[' + nf(hx * ks[i], 1, 2) + ', ' + nf(hy * ks[i], 1, 2) + ', ' + nf(hw * ks[i], 1, 2) + ']', b[0] + 16 + i * 150, b[3] - 46);
    text('どれも X = x/w, Y = y/w は同じ', b[0] + 16, b[3] - 22);
  }
}

// 中：x–w 断面。原点からの直線が「画面 w = 1」に当たる所が X = x/w
function drawSection(b) {
  let c = { x: (b[0] + b[2]) / 2, y: b[3] - 80 };     // 原点（w = 0）
  frame(b, 'x–w 断面：原点を通る直線 = 1 つの点');
  stroke(0, 0, 100, 40); strokeWeight(1);
  line(b[0], c.y, b[2], c.y); line(c.x, b[1], c.x, b[3]);
  stroke(200, 60, 95); strokeWeight(2); line(b[0], c.y - U, b[2], c.y - U);   // 画面 w = 1
  noStroke(); fill(200, 60, 95); textSize(14); text('w = 1（画面）', b[0] + 10, c.y - U - 8);
  fill(0, 0, 70); text('w = 0', c.x + 8, c.y + 18); text('x', b[2] - 20, c.y - 8); text('w', c.x + 8, b[1] + 20);
  // 原点を通る直線（方向 (x, w)）
  let dx = hx, dw = hw, m = Math.hypot(dx, dw) || 1; dx /= m; dw /= m;
  clipTo(b);
  stroke(45, 80, 100, 70); strokeWeight(2);
  line(c.x - dx * 2000, c.y + dw * 2000, c.x + dx * 2000, c.y - dw * 2000);
  drawingContext.restore();
  stroke(45, 80, 100); strokeWeight(4); line(c.x, c.y, c.x + hx * U, c.y - hw * U);
  noStroke(); fill(45, 80, 100); circle(c.x + hx * U, c.y - hw * U, 10);
  textSize(13); text('(x, w)', c.x + hx * U + 8, c.y - hw * U - 6);
  if (Math.abs(hw) > 1e-6) {
    let X = hx / hw, sx = c.x + X * U;
    if (sx > b[0] && sx < b[2]) { fill(15, 80, 100); circle(sx, c.y - U, 14); fill(0, 0, 100); text('X = x/w = ' + nf(X, 1, 2), sx + 10, c.y - U - 12); }
    else { fill(15, 80, 100); text('交点は枠の外（X = ' + nf(X, 1, 1) + '）', b[0] + 10, c.y - U + 22); }
  } else { fill(15, 80, 100); textSize(14); text('直線は画面と平行 → 交わらない = 無限遠点', b[0] + 10, c.y - U + 22); }
  fill(0, 0, 70); textSize(13);
  text('同じ直線上の (x, w), (2x, 2w), (−x, −w) は', b[0] + 16, b[3] - 40);
  text('画面 w = 1 と同じ所で交わる → 同じ点', b[0] + 16, b[3] - 22);
}

// 右：球面モデル（上から見た図）。方向 (x, y, w) と球の交点とその対蹠点
function drawSphere(b) {
  let c = center(b), R = min(b[2] - b[0], b[3] - b[1]) * 0.36;
  frame(b, '球面モデル：対蹠点を同一視、赤道 = 無限遠直線');
  noFill(); stroke(0, 0, 100, 50); strokeWeight(2); circle(c.x, c.y, R * 2);
  stroke(0, 0, 100, 15); for (let k = 1; k < 4; k++) ellipse(c.x, c.y, R * 2 * Math.sin((k * Math.PI) / 8), R * 2 * Math.sin((k * Math.PI) / 8));
  let m = Math.hypot(hx, hy, hw) || 1, nx = hx / m, ny = hy / m, nw = hw / m;
  // 北半球側（w > 0）を実線の点、南半球側（w < 0）を白抜き。上から見ているので (nx, ny) の位置
  let s = { x: c.x + nx * R, y: c.y - ny * R }, a = { x: c.x - nx * R, y: c.y + ny * R };
  stroke(45, 80, 100, 50); strokeWeight(1); line(s.x, s.y, a.x, a.y);
  noStroke();
  fill(15, 80, 100); circle(nw >= 0 ? s.x : a.x, nw >= 0 ? s.y : a.y, 16);
  noFill(); stroke(15, 80, 100); strokeWeight(3); circle(nw >= 0 ? a.x : s.x, nw >= 0 ? a.y : s.y, 16);
  noStroke(); fill(0, 0, 100); textSize(13);
  text('w = ' + nf(nw, 1, 2) + '（上半球）', s.x + 10, s.y - 8);
  text('対蹠点（同じ点）', a.x + 10, a.y + 18);
  fill(0, 0, 70);
  text('赤道（w = 0）= 無限遠直線', c.x - R, c.y + R + 24);
  text('|w| が小さいほど赤道に近い：中心からの距離 = ' + nf(Math.hypot(nx, ny), 1, 2), b[0] + 16, b[3] - 40);
  text('無限遠点でも球の上ではふつうの点。「向こう側」とつながっている', b[0] + 16, b[3] - 22);
}

// ---- 小さな道具
function center(b) { return { x: (b[0] + b[2]) / 2, y: (b[1] + b[3]) / 2 }; }
function toPlane(x, y, w) { return Math.abs(w) < 1e-6 ? null : { x: x / w, y: y / w }; }
function toScreen(p, c) { return { x: c.x + p.x * U, y: c.y - p.y * U }; }
function inside(s, b) { return s.x > b[0] && s.x < b[2] && s.y > b[1] && s.y < b[3]; }
// これから描く線を枠 b の中だけに切り抜く（描いたら drawingContext.restore() で戻す）
function clipTo(b) { drawingContext.save(); drawingContext.beginPath(); drawingContext.rect(b[0], b[1], b[2] - b[0], b[3] - b[1]); drawingContext.clip(); }
function frame(b, title) {
  noFill(); stroke(0, 0, 100, 30); strokeWeight(1); rect(b[0], b[1], b[2] - b[0], b[3] - b[1]);
  noStroke(); fill(45, 80, 100); textSize(15); text(title, b[0] + 12, b[1] - 10);
}
// 枠のふちに方向の矢印
function drawEdgeArrow(b, dx, dy, c, label) {
  let m = Math.hypot(dx, dy) || 1; dx /= m; dy = -dy / m;
  let t = Infinity;
  if (dx > 1e-9) t = Math.min(t, (b[2] - 30 - c.x) / dx); if (dx < -1e-9) t = Math.min(t, (b[0] + 30 - c.x) / dx);
  if (dy > 1e-9) t = Math.min(t, (b[3] - 30 - c.y) / dy); if (dy < -1e-9) t = Math.min(t, (b[1] + 30 - c.y) / dy);
  let x = c.x + dx * t, y = c.y + dy * t;
  stroke(15, 80, 100); strokeWeight(3);
  push(); translate(x, y); rotate(Math.atan2(dy, dx)); line(-30, 0, 10, 0); line(10, 0, 0, -8); line(10, 0, 0, 8); pop();
  noStroke(); fill(15, 80, 100); textSize(14); text(label, x - 40, y - 14);
}

function keyPressed() {
  if (key === LEFT_ARROW) hw = max(-2, hw - 0.04);
  if (key === RIGHT_ARROW) hw = min(2, hw + 0.04);
  if (key === '0') hw = 0;
  if (key === '1') hw = 1;
  if (key === 'm' || key === 'M') showMult = !showMult;
  if (key === 'r' || key === 'R') { hx = 1.4; hy = 0.9; hw = 1; trail = []; }
}

// ---------- やってみよう ----------
// 1. ← を押し続けて w を 1 → 0 → −1 にする。P はどう動く？ 球面モデルの点はどこを通る？
// 2. (x, y) = (1, 0) で w = 0 のときの無限遠点と、(x, y) = (−1, 0) で w = 0 の無限遠点は同じ？（矢印と対蹠点を見る）
// 3. 「同じ点の同次座標」は何通りある？ 0 倍だけはダメなのはなぜ？
// 4. 直線 ax + by + c = 0 も [a, b, c] と書ける（02）。点 [x, y, w] が直線の上にある条件を内積で書いてみよう
