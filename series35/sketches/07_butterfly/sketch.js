// ============================================
// 07 蝶（butterfly）
// V(x) = x⁶ + t·x⁴ + a·x³ + b·x² + c·x。コントロールが 4 つ。t と a を固定して (b, c) の平面で切る
//   t < 0 にすると、カスプの中に小さな「ポケット」が現れる：そこでは谷が 3 つ（左・右・真ん中）
//   ジーマンはこれを「妥協のポケット」と呼んだ：賛成・反対の 2 つに割れた意見の間に、第 3 の中間の立場が生まれる
// マウス = (b, c) の点 / ↑↓ = t（蝶の因子） / ←→ = a（かたより） / G = 色 / R = 戻す
// ============================================

let tt = -1.5, a = 0;        // ★ 固定するコントロール
let bMin = -2, bMax = 3, cRange = 2.5;   // ★ 表示範囲
let bb = 0.8, cc = 0;
let field, lastKey = '';
let showColor = true;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  field = createGraphics(180, 135);
  field.pixelDensity(1);
}

function dV(x, b_, c_) { return 6 * x ** 5 + 4 * tt * x ** 3 + 3 * a * x * x + 2 * b_ * x + c_; }
function V(x) { return x ** 6 + tt * x ** 4 + a * x ** 3 + bb * x * x + cc * x; }
// 谷（V' が − から + に変わる所）の数
function countMinima(b_, c_, N) {
  let n = 0, prev = dV(-2.2, b_, c_);
  for (let i = 1; i <= N; i++) { let cur = dV(-2.2 + 4.4 * i / N, b_, c_); if (prev < 0 && cur >= 0) n++; prev = cur; }
  return n;
}
function rebuild() {
  let pal = { 1: [24, 30, 48], 2: [40, 90, 140], 3: [200, 90, 150] };   // ★ 谷 1・2・3 個の色
  field.loadPixels();
  for (let i = 0; i < 180; i++) for (let j = 0; j < 135; j++) {
    let b_ = bMin + (bMax - bMin) * (i + 0.5) / 180, c_ = cRange - 2 * cRange * (j + 0.5) / 135;
    let cl = pal[countMinima(b_, c_, 140)] || pal[1];
    let k = 4 * (j * 180 + i);
    field.pixels[k] = cl[0]; field.pixels[k + 1] = cl[1]; field.pixels[k + 2] = cl[2]; field.pixels[k + 3] = 255;
  }
  field.updatePixels();
}

function draw() {
  background(300, 25, 10);
  let k = tt + ',' + a;
  if (k !== lastKey) { rebuild(); lastKey = k; }

  let py = 110, ph = height - py - 40, pw = min(width * 0.58, ph * 4 / 3), px = 30;
  let toB = (v) => px + (v - bMin) / (bMax - bMin) * pw;
  let toC = (v) => py + (cRange - v) / (2 * cRange) * ph;
  if (showColor) { noSmooth(); image(field, px, py, pw, ph); smooth(); } else { noStroke(); fill(300, 20, 16); rect(px, py, pw, ph); }
  stroke(0, 0, 100, 20); strokeWeight(1); line(toB(0), py, toB(0), py + ph); line(px, toC(0), px + pw, toC(0));
  // ★ 分岐集合（V' = V'' = 0）：b = −15x⁴ − 6t·x² − 3a·x,  c = 24x⁵ + 8t·x³ + 3a·x²
  noFill(); stroke(50, 90, 100); strokeWeight(2.5);
  beginShape();
  for (let x = -1.6; x <= 1.6; x += 0.004) {
    let b_ = -15 * x ** 4 - 6 * tt * x * x - 3 * a * x, c_ = 24 * x ** 5 + 8 * tt * x ** 3 + 3 * a * x * x;
    if (b_ > bMin - 0.2 && b_ < bMax + 0.2 && abs(c_) < cRange + 0.2) vertex(toB(b_), toC(c_)); else { endShape(); beginShape(); }
  }
  endShape();
  noStroke(); fill(0, 0, 100); circle(toB(bb), toC(cc), 14);
  fill(0, 0, 90); textSize(14);
  text('横 = b、縦 = c。色 = 谷の数（暗 = 1、青 = 2、ピンク = 3 ＝ 妥協のポケット）', px + 12, py + 22);

  // ---- 右：V(x)
  let rx = px + pw + 30, rw = width - rx - 30;
  noStroke(); fill(300, 20, 16); rect(rx, py, rw, ph, 8);
  let toX = (x) => rx + (x + 1.8) / 3.6 * rw;
  let vals = [], vmin = 1e9;
  for (let i = 0; i <= 200; i++) { let v = V(-1.8 + 3.6 * i / 200); vals.push(v); vmin = min(vmin, v); }
  let toY = (v) => py + ph - 30 - (v - vmin) * ph * 0.12;
  noFill(); stroke(160, 60, 90); strokeWeight(3);
  beginShape(); for (let i = 0; i <= 200; i++) vertex(toX(-1.8 + 3.6 * i / 200), constrain(toY(vals[i]), py, py + ph)); endShape();
  let mins = 0, prev = dV(-1.8, bb, cc);
  for (let i = 1; i <= 400; i++) {
    let x = -1.8 + 3.6 * i / 400, cur = dV(x, bb, cc);
    if (prev * cur < 0) {
      let st = prev < 0; if (st) mins++;
      noStroke(); fill(st ? color(160, 70, 100) : color(0, 70, 100));
      circle(toX(x), constrain(toY(V(x)), py, py + ph), 14);
    }
    prev = cur;
  }
  noStroke(); fill(0, 0, 90); textSize(14);
  text('V(x)　谷（緑）の数 = ' + mins + (mins === 3 ? '　← 真ん中の谷 = 妥協の立場' : ''), rx + 12, py + 22);

  noStroke(); fill(0, 0, 100); textSize(18);
  text('t = ' + nf(tt, 1, 2) + '（↑↓）　a = ' + nf(a, 1, 2) + '（←→）　G：色　R：戻す　マウス = (b, c) = (' + nf(bb, 1, 2) + ', ' + nf(cc, 1, 2) + ')', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('t > 0：ただのカスプ（谷は最大 2 つ）。t < 0：カスプの先が割れてポケットが開く。a を 0 からずらすとポケットが傾いて片側へ寄る', 20, 68);
}

function mouseMoved() {
  let py = 110, ph = height - py - 40, pw = min(width * 0.58, ph * 4 / 3);
  if (mouseX > 30 && mouseX < 30 + pw && mouseY > py && mouseY < py + ph) {
    bb = bMin + (mouseX - 30) / pw * (bMax - bMin);
    cc = cRange - (mouseY - py) / ph * 2 * cRange;
  }
}
function mouseDragged() { mouseMoved(); }
function keyPressed() {
  if (key === UP_ARROW) tt = min(1.5, tt + 0.25);
  if (key === DOWN_ARROW) tt = max(-3, tt - 0.25);
  if (key === LEFT_ARROW) a = max(-1.5, a - 0.1);
  if (key === RIGHT_ARROW) a = min(1.5, a + 0.1);
  if (key === 'g' || key === 'G') showColor = !showColor;
  if (key === 'r' || key === 'R') { tt = -1.5; a = 0; }
}

// ---------- やってみよう ----------
// 1. t = 1 → 0 → −1 → −2 と下げて、ポケットが生まれる瞬間を見よう
// 2. ポケットの中に点を置き、右のグラフで谷が 3 つあることを確かめよう。真ん中の谷はいちばん浅い？
// 3. a を ±0.5 にすると、ポケットはどちらへ傾く？ 意見の「かたより」と考えるとどういう意味？
// 4. 03 のように状態 x が坂を下る動き（x -= 0.002 * dV(x)）を入れて、マウスで b, c を動かしたときのとび方を見よう
