// ============================================
// 05 A 判の紙 ─ 半分に切っても同じ形（√2 の白銀比）
// A0 は面積 1 m²、縦横 1 : √2。半分に切ると A1、また半分で A2 … 形はずっと同じ
//   r / 2 = 1 / r  ⇔  r² = 2  ⇔  r = √2（半分にして相似になる比は √2 だけ）
// クリック / H = 半分に切る / B = B 判を重ねる / F = 比を自由に（←→）/ R = A0 に戻す
// ============================================

let cuts = 0;            // 何回切ったか
const MAXCUT = 10;       // ★
let anim = 1;            // 切るアニメーション（0→1）
let showB = false;
let freeMode = false;
let freeR = 1.6;         // F モードの比

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(40, 10, 14);
  anim = min(1, anim + 0.04);
  let r = freeMode ? freeR : Math.SQRT2;

  // 紙の大きさ（長辺 = 縦）
  let H = height - 190, W = H / r;
  let x0 = 40, y0 = 120;

  // 切った紙を順に並べる：k 回目に切った片は「残り」の半分
  let x = x0, y = y0, w = W, h = H;
  for (let k = 0; k < cuts; k++) {
    let t = k === cuts - 1 ? easeOut(anim) : 1;
    let piece;
    if (h >= w) { // 横に切る（長い辺を半分）
      piece = { x, y, w, h: h / 2 };
      y += h / 2; h /= 2;
    } else {      // 縦に切る
      piece = { x, y, w: w / 2, h };
      x += w / 2; w /= 2;
    }
    // 切り取った片をすこし浮かせて色をつける
    let off = 6 * t;
    noStroke();
    fill(0, 0, 0, 30);
    rect(piece.x + off + 3, piece.y + off + 3, piece.w, piece.h);
    fill((k * 33 + 190) % 360, 30 + 20 * t, 95);
    stroke(0, 0, 30);
    strokeWeight(1);
    rect(piece.x + off * 0, piece.y, piece.w, piece.h);
    noStroke();
    fill(0, 0, 20);
    let fs = constrain(min(piece.w, piece.h) * 0.25, 9, 40);
    textSize(fs);
    textAlign(CENTER, CENTER);
    text((freeMode ? '#' : 'A') + (k + 1), piece.x + piece.w / 2, piece.y + piece.h / 2);
    textAlign(LEFT, BASELINE);
  }
  // 残りの紙
  fill(0, 0, 100);
  stroke(0, 0, 30);
  rect(x, y, w, h);
  noStroke();
  fill(0, 0, 30);
  textAlign(CENTER, CENTER);
  textSize(constrain(min(w, h) * 0.25, 9, 40));
  text((freeMode ? '#' : 'A') + cuts, x + w / 2, y + h / 2);
  textAlign(LEFT, BASELINE);

  // B 判（日本の JIS）：面積が A 判の 1.5 倍 → 辺は √1.5 ≈ 1.22 倍。同じ √2 の形
  if (showB && !freeMode) {
    noFill();
    stroke(350, 70, 90);
    strokeWeight(2);
    drawingContext.setLineDash([8, 6]);
    let bh = Math.sqrt(1.5) * H / Math.SQRT2; // B1 の長辺 = A1 の長辺 × √1.5
    for (let k = 1; k <= 4; k++) {
      let bw = bh / Math.SQRT2;
      if (k % 2 === 1) rect(x0, y0, bh, bw); else rect(x0, y0, bw, bh);
      bh = bh / Math.SQRT2;
    }
    drawingContext.setLineDash([]);
  }
  noFill();
  stroke(0, 0, 100);
  strokeWeight(2);
  rect(x0, y0, W, H);

  // 文字
  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text('クリック / H：半分に切る（' + cuts + ' 回）　B：B 判 ' + (showB ? 'ON' : 'off') + '　F：自由な比 ' + (freeMode ? 'ON（←→）' : 'off') + '　R：A0 に戻す', 20, 40);
  fill(0, 0, 65);
  textSize(15);
  text('どこまで切っても、切った紙はすべて同じ形（相似）。コピー機の「A4 → A3 拡大 141%」は √2 倍のこと', 20, 68);

  drawPanel(x0 + W + 50, 130, r);
}

// 右側：寸法と比の表
function drawPanel(px, py, r) {
  fill(0, 0, 100);
  textSize(16);
  if (freeMode) {
    text('はじめの比　1 : ' + nf(r, 1, 3), px, py);
    let a = 1, b = r;
    for (let k = 0; k <= 8; k++) {
      let ratio = max(a, b) / min(a, b);
      fill(abs(ratio - r) < 0.001 ? color(120, 60, 100) : color(10, 70, 100));
      textSize(14);
      text('#' + k + '　1 : ' + nf(ratio, 1, 4) + (abs(ratio - r) < 0.001 ? '　同じ形' : '　ちがう形'), px, py + 30 + k * 22);
      if (a < b) b /= 2; else a /= 2;
    }
    fill(0, 0, 70);
    text('比は r と 2/r を行ったり来たり。r = 2/r になるのは r = √2 = 1.4142 だけ', px, py + 250);
    return;
  }
  text('A 判（mm）', px, py);
  text('B 判（mm）', px + 230, py);
  textSize(14);
  for (let k = 0; k <= 8; k++) {
    let a = paper('A', k), b = paper('B', k);
    fill(k === cuts ? color(50, 80, 100) : color(0, 0, 80));
    text('A' + k + '　' + a[0] + ' × ' + a[1], px, py + 28 + k * 22);
    fill(350, 40, 90);
    text('B' + k + '　' + b[0] + ' × ' + b[1], px + 230, py + 28 + k * 22);
  }
  fill(0, 0, 100);
  textSize(15);
  let yy = py + 240;
  text('A4 = 210 × 297 → 297 / 210 = ' + nf(297 / 210, 1, 4), px, yy);
  text('√2 = ' + nf(Math.SQRT2, 1, 4), px, yy + 24);
  fill(0, 0, 70);
  textSize(14);
  text('A0 の面積は 1 m²、B0 は 1.5 m²（日本の B 判）。', px, yy + 56);
  text('√2 の長方形から正方形を 1 枚取ると 1 : (1 + √2) が残る', px, yy + 78);
  text('→ 貴金属比の「白銀比」とつながる（01 の F で確かめよう）', px, yy + 100);
}

// k 番目の紙の寸法 [短辺, 長辺]（mm）。長辺を半分に切り捨てたものが次の短辺
function paper(type, k) {
  let s = type === 'A' ? 841 : 1030, l = type === 'A' ? 1189 : 1456;
  for (let i = 0; i < k; i++) { let ns = floor(l / 2); l = s; s = ns; }
  return [s, l];
}

function cut() { if (cuts < MAXCUT) { cuts++; anim = 0; } }
function mousePressed() { cut(); }

function keyPressed() {
  if (key === 'h' || key === 'H') cut();
  if (key === 'b' || key === 'B') showB = !showB;
  if (key === 'f' || key === 'F') freeMode = !freeMode;
  if (key === RIGHT_ARROW) freeR = min(3, freeR + 0.05);
  if (key === LEFT_ARROW) freeR = max(1.05, freeR - 0.05);
  if (key === 'r' || key === 'R') { cuts = 0; anim = 1; }
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. 表の A4 の寸法を、実際の A4 の紙を定規で測って確かめよう
// 2. F で比を 1.6（黄金比の近く）にして切ってみよう。形はどう変わる？
// 3. A4 2 枚 = A3、B5 と A4 の大きさの関係は？（JIS の B 判は面積 1.5 倍 → 辺は √1.5 ≈ 1.22 倍。国際規格の B 判は 2 の 4 乗根 ≈ 1.19 倍）
// 4. 切った片の色を「大きさの順」に虹色にして、ポスターを作ってみよう

// ---------- 道具 ----------
function easeOut(t) { return 1 - (1 - t) * (1 - t); }
