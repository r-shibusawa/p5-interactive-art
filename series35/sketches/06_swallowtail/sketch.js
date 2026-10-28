// ============================================
// 06 つばめの尾（swallowtail）
// V(x) = x⁵ + a·x³ + b·x² + c·x。コントロールが 3 つ (a, b, c) あるので、分岐集合は 3 次元の曲面
//   a を固定して (b, c) の平面で切ると、a < 0 のときツバメの尾のような形（2 つのカスプと交差）が現れる
//   色 = 平衡点（V' = 0）の数：0・2・4。尾の三角の内側だけ平衡点が 4 つ（谷が 2 つ）
// マウス = (b, c) の点（右に V(x) を表示） / ←→ = a / A = a を自動で動かす / G = 色の表示
// ============================================

let a = -2;                 // ★ 切る位置
let auto = false, showColor = true;
let bRange = 2.5, cRange = 2.5;  // ★ 表示する範囲
let bb = 0.0, cc = 0.4;     // マウスの点
let field;                  // 平衡点の数の絵
let lastA = null;
let t = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  field = createGraphics(160, 120);
  field.pixelDensity(1);
}

function dV(x, a_, b_, c_) { return 5 * x ** 4 + 3 * a_ * x * x + 2 * b_ * x + c_; }
function V(x) { return x ** 5 + a * x ** 3 + bb * x * x + cc * x; }
// V' = 0 の解の数（x を細かく調べて符号が変わる回数）
function countRoots(a_, b_, c_) {
  let n = 0, prev = dV(-2.5, a_, b_, c_);
  for (let i = 1; i <= 90; i++) { let cur = dV(-2.5 + 5 * i / 90, a_, b_, c_); if (prev * cur < 0) n++; prev = cur; }
  return n;
}
function rebuild() {
  // ★ 平衡点の数ごとの色（RGB）：0 = 暗い、2 = 青、4 = 明るい黄
  let pal = { 0: [22, 22, 38], 1: [40, 40, 60], 2: [40, 70, 130], 3: [60, 60, 90], 4: [150, 120, 40] };
  field.loadPixels();
  for (let i = 0; i < 160; i++) for (let j = 0; j < 120; j++) {
    let b_ = -bRange + 2 * bRange * (i + 0.5) / 160, c_ = cRange - 2 * cRange * (j + 0.5) / 120;
    let cl = pal[countRoots(a, b_, c_)] || pal[0];
    let k = 4 * (j * 160 + i);
    field.pixels[k] = cl[0]; field.pixels[k + 1] = cl[1]; field.pixels[k + 2] = cl[2]; field.pixels[k + 3] = 255;
  }
  field.updatePixels();
  lastA = a;
}

function draw() {
  background(230, 30, 10);
  if (auto) { t += 0.01; a = -1 + 1.8 * Math.sin(t); }
  if (a !== lastA && (frameCount % 5 === 0 || !auto)) rebuild();

  let py = 110, ph = height - py - 40, pw = min(width * 0.58, ph * 4 / 3);
  let px = 30;
  let toB = (v) => px + (v + bRange) / (2 * bRange) * pw;
  let toC = (v) => py + (cRange - v) / (2 * cRange) * ph;
  if (showColor) { noSmooth(); image(field, px, py, pw, ph); smooth(); } else { noStroke(); fill(230, 25, 16); rect(px, py, pw, ph); }
  stroke(0, 0, 100, 20); strokeWeight(1); line(toB(0), py, toB(0), py + ph); line(px, toC(0), px + pw, toC(0));
  // ★ 分岐集合：V' = 0 と V'' = 0 を同時にみたす (b, c)。x をパラメータにすると
  //   b = −10x³ − 3a·x,  c = 15x⁴ + 3a·x²
  noFill(); stroke(50, 90, 100); strokeWeight(3);
  beginShape();
  for (let x = -1.5; x <= 1.5; x += 0.005) {
    let b_ = -10 * x ** 3 - 3 * a * x, c_ = 15 * x ** 4 + 3 * a * x * x;
    if (abs(b_) < bRange * 1.05 && abs(c_) < cRange * 1.05) vertex(toB(b_), toC(c_)); else { endShape(); beginShape(); }
  }
  endShape();
  // マウスの点
  noStroke(); fill(0, 0, 100); circle(toB(bb), toC(cc), 14);
  fill(0, 0, 85); textSize(14);
  text('横 = b、縦 = c。色 = 平衡点の数（暗 = 0、青 = 2、明るい黄 = 4）。黄の線 = 分岐集合', px + 12, py + 22);

  // ---- 右：V(x) のグラフ
  let rx = px + pw + 30, rw = width - rx - 30;
  noStroke(); fill(230, 25, 16); rect(rx, py, rw, ph, 8);
  let toX = (x) => rx + (x + 1.8) / 3.6 * rw;
  let toY = (v) => py + ph / 2 - v * ph * 0.06;
  stroke(0, 0, 100, 15); line(rx, toY(0), rx + rw, toY(0));
  noFill(); stroke(160, 60, 90); strokeWeight(3);
  beginShape(); for (let i = 0; i <= 200; i++) { let x = -1.8 + 3.6 * i / 200; vertex(toX(x), constrain(toY(V(x)), py, py + ph)); } endShape();
  let mins = 0, n = 0, prev = dV(-1.8, a, bb, cc);
  for (let i = 1; i <= 400; i++) {
    let x = -1.8 + 3.6 * i / 400, cur = dV(x, a, bb, cc);
    if (prev * cur < 0) {
      n++;
      let st = prev < 0;           // − から + へ = 谷
      if (st) mins++;
      noStroke(); fill(st ? color(160, 70, 100) : color(0, 70, 100));
      circle(toX(x), constrain(toY(V(x)), py, py + ph), 14);
    }
    prev = cur;
  }
  noStroke(); fill(0, 0, 85); textSize(14);
  text('V(x)　平衡点 ' + n + ' 個（緑 = 谷 ' + mins + '、赤 = 山 ' + (n - mins) + '）', rx + 12, py + 22);
  text('x⁵ なので左端はいつも −∞ へ落ちる。谷があっても「とりあえずの安定」', rx + 12, py + 44);

  noStroke(); fill(0, 0, 100); textSize(18);
  text('a = ' + nf(a, 1, 2) + '（←→）　A：自動 ' + (auto ? 'ON' : 'off') + '　G：色 ' + (showColor ? 'ON' : 'off') + '　マウス = (b, c) = (' + nf(bb, 1, 2) + ', ' + nf(cc, 1, 2) + ')', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('a > 0 では尾がなく、ただの折り目の線。a < 0 にすると線が交差して尾ができ、2 つのカスプが生まれる。線をこえるたびに平衡点が 2 つ生まれる / 消える', 20, 68);
}

function mouseMoved() {
  let py = 110, ph = height - py - 40, pw = min(width * 0.58, ph * 4 / 3);
  if (mouseX > 30 && mouseX < 30 + pw && mouseY > py && mouseY < py + ph) {
    bb = (mouseX - 30) / pw * 2 * bRange - bRange;
    cc = cRange - (mouseY - py) / ph * 2 * cRange;
  }
}
function mouseDragged() { mouseMoved(); }
function keyPressed() {
  if (key === LEFT_ARROW) a = max(-3, a - 0.1);
  if (key === RIGHT_ARROW) a = min(1.5, a + 0.1);
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'g' || key === 'G') showColor = !showColor;
}

// ---------- やってみよう ----------
// 1. a = −2 で、尾の三角の内側・尾の下・外側にマウスを置き、右の V(x) の谷の数を数えよう
// 2. 2 つのカスプ（とがった点）の位置を式で求めてみよう（ヒント：V''' = 0 も足す → 60x² + 6a = 0）
// 3. a を 0 にすると尾が 1 点につぶれる。この点が「つばめの尾の点」
// 4. 03 のように (a, b, c) の 3D で分岐集合の曲面を描いてみよう（WEBGL）
