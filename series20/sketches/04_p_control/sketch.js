// ============================================
// 04 P 制御（比例制御）
// 台車を目標の位置まで動かす。「ずれ（誤差）に比例した力」を出すだけの制御
//   u = Kp × (目標 − いまの位置)
//   風（一定の外乱）が吹くと、ずれが残ったまま止まる = 定常偏差
// クリック = 目標の位置 / 左右キー = Kp / 上下キー = 風の強さ
// ============================================

let Kp = 2.0; // ★ 比例ゲイン
let wind = 0; // ★ 一定の外乱（風の力）
let m = 1, c = 1.5; // 台車の質量と摩擦
let umax = 20; // ★ モーターの最大の力

let x = 0, v = 0, r = 2, u = 0;
let HIST = 600, dt = 1 / 60;
let hX = [], hR = [], hU = [];
let railY, railX0, railX1, scaleX;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(230, 30, 10);
  railY = height * 0.5; railX0 = width * 0.05; railX1 = width * 0.47; scaleX = (railX1 - railX0) / 10;

  // ★ P 制御：誤差に比例した力
  let e = r - x;
  u = constrain(Kp * e, -umax, umax);
  // 台車の運動：m x'' = u − c x' + 風
  for (let k = 0; k < 2; k++) {
    let a = (u - c * v + wind) / m;
    v += a * dt / 2;
    x += v * dt / 2;
  }
  x = constrain(x, -5, 5); v = constrain(v, -50, 50);
  pushHist(hX, x); pushHist(hR, r); pushHist(hU, u);

  // ---- レールと台車
  stroke(0, 0, 50); strokeWeight(4); line(railX0, railY + 30, railX1, railY + 30);
  stroke(0, 0, 30); strokeWeight(1);
  for (let i = -5; i <= 5; i++) { line(wx(i), railY + 30, wx(i), railY + 40); }
  noStroke(); fill(0, 0, 60); textSize(12); textAlign(CENTER);
  for (let i = -4; i <= 4; i += 2) text(i, wx(i), railY + 54);
  // 目標
  stroke(45, 90, 100); strokeWeight(2); line(wx(r), railY - 80, wx(r), railY + 30);
  noStroke(); fill(45, 90, 100); textSize(14); text('目標 r = ' + nf(r, 1, 2), wx(r), railY - 90);
  // 風
  if (abs(wind) > 0.01) {
    stroke(200, 50, 100, 70); strokeWeight(2);
    for (let i = 0; i < 4; i++) {
      let yy = railY - 60 + i * 25, len = wind * 12;
      let x0 = wind > 0 ? railX0 + 20 + i * 15 : railX1 - 20 - i * 15;
      line(x0, yy, x0 + len, yy);
      line(x0 + len, yy, x0 + len - 6 * Math.sign(wind), yy - 5);
      line(x0 + len, yy, x0 + len - 6 * Math.sign(wind), yy + 5);
    }
  }
  // 台車
  let cx = wx(x);
  noStroke(); fill(30, 80, 100);
  rect(cx - 40, railY - 30, 80, 50, 8);
  fill(0, 0, 30); circle(cx - 22, railY + 24, 20); circle(cx + 22, railY + 24, 20);
  // 力の矢印
  stroke(u > 0 ? 120 : 0, 80, 100); strokeWeight(5);
  line(cx, railY - 5, cx + u * 5, railY - 5);
  noStroke(); fill(0, 0, 100); textSize(14); textAlign(CENTER);
  text('x = ' + nf(x, 1, 2), cx, railY - 40);
  textAlign(LEFT, BASELINE);

  // ---- グラフ
  let gx = width * 0.52, gw = width * 0.44;
  drawPlot(gx, height * 0.18, gw, height * 0.36, [{ data: hR, hue: 45, sat: 90, name: '目標 r' }, { data: hX, hue: 30, name: '位置 x' }], -5, 5, '位置');
  drawPlot(gx, height * 0.6, gw, height * 0.25, [{ data: hU, hue: 120, name: '力 u' }], -umax, umax, '制御入力 u = Kp (r − x)');

  let ess = -wind / Kp;
  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text('Kp = ' + nf(Kp, 1, 2) + '（左右キー）　風 = ' + nf(wind, 1, 1) + '（上下キー）　クリックで目標　いまの誤差 ' + nf(e, 1, 2), 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('u = Kp × 誤差。目標に近づくほど力が弱くなる。風があると「風とつり合う力を出すには誤差が必要」→ 定常偏差 e = −風/Kp = ' + nf(ess, 1, 2), 20, 68);
  text('Kp を大きくすると偏差は減るが、勢いがついてゆれる（02 の ζ が小さくなるのと同じ）。偏差をゼロにするには → 05 の I（積分）', 20, height - 30);
}

function wx(xw) { return map(xw, -5, 5, railX0, railX1); }

function mousePressed() {
  if (mouseX < railX1 + 20 && mouseY > railY - 150 && mouseY < railY + 80) r = constrain(map(mouseX, railX0, railX1, -5, 5), -4.5, 4.5);
}
function keyPressed() {
  if (key === RIGHT_ARROW) Kp = min(Kp * 1.3, 50);
  if (key === LEFT_ARROW) Kp = max(Kp / 1.3, 0.2);
  if (key === UP_ARROW) wind = min(wind + 1, 5);
  if (key === DOWN_ARROW) wind = max(wind - 1, -5);
}

// ---------- やってみよう ----------
// 1. 風 0 で Kp を 0.5 → 2 → 10 → 30 と上げる。速くなる？ ゆれる？
// 2. 風を 3 にする。Kp を上げると偏差は減るが、ゼロにはならないことを確かめる
// 3. umax（力の上限）を 3 にすると何が起きる？（飽和）
// 4. 摩擦 c を 0 にすると、Kp をどう選んでもゆれ続ける（減衰なし → D 制御が必要）


// ==================================================
// ここから下は「グラフを描く道具」です
// ==================================================
function pushHist(arr, v) {
  arr.push(isFinite(v) ? v : 0);
  if (arr.length > HIST) arr.shift();
}
// 時間プロット：枠 (x, y, w, h) に series = [{data, hue, name}] を描く（縦の範囲 lo〜hi）
function drawPlot(x, y, w, h, series, lo, hi, title) {
  noStroke(); fill(0, 0, 14); rect(x, y, w, h, 6);
  stroke(0, 0, 30); strokeWeight(1);
  let y0 = map(0, lo, hi, y + h, y);
  if (y0 > y && y0 < y + h) line(x, y0, x + w, y0);
  for (let s of series) {
    stroke(s.hue, s.sat === undefined ? 70 : s.sat, 100); strokeWeight(s.weight || 2); noFill();
    beginShape();
    for (let i = 0; i < s.data.length; i++) vertex(map(i, 0, HIST - 1, x, x + w), map(constrain(s.data[i], lo, hi), lo, hi, y + h, y));
    endShape();
  }
  noStroke(); fill(0, 0, 70); textSize(13); textAlign(LEFT, TOP);
  text(title, x + 8, y + 6);
  let lx = x + w - 8; textAlign(RIGHT, TOP);
  for (let s of series) { fill(s.hue, s.sat === undefined ? 70 : s.sat, 100); text(s.name, lx, y + 6); lx -= textWidth(s.name) + 14; }
  textAlign(LEFT, BASELINE);
}
