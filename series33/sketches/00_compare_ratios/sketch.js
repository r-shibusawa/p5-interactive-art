// ============================================
// 00 比をくらべる ─ 黄金比・白銀比・青銅比
// 短い辺を 1 にそろえて、長い辺が「何倍か」を並べてくらべる
//   貴金属比 φn = (n + √(n² + 4)) / 2   n=1 黄金比 / n=2 白銀比 / n=3 青銅比
// 日本で「白銀比」と呼ばれる √2（A 判の紙・大和比）は別もの。名前の混乱に注意！
// 右下の自由な長方形の右端をドラッグ / 1〜5 = その比を強調 / O = 重ねて比べる / R = リセット
// ============================================

const RATIOS = [
  { name: '白銀比（大和比）', expr: '√2', v: Math.SQRT2, hue: 200, ex: 'A4 の紙 210×297 mm、法隆寺、アニメキャラの顔' },
  { name: '黄金比（n=1）', expr: '(1+√5)/2', v: (1 + Math.sqrt(5)) / 2, hue: 45, ex: 'クレジットカード 54×85.6 mm、名刺' },
  { name: '白銀比（貴金属比 n=2）', expr: '1+√2', v: 1 + Math.SQRT2, hue: 210, ex: '正八角形の対角線 / 辺' },
  { name: '第2白銀比', expr: '1+√3', v: 1 + Math.sqrt(3), hue: 280, ex: '正十二角形の対角線 / 辺' },
  { name: '青銅比（n=3）', expr: '(3+√13)/2', v: (3 + Math.sqrt(13)) / 2, hue: 25, ex: '正方形を 3 枚取ると相似が残る' },
];

let unit = 120;          // ★ 短い辺の長さ（px）
let freeRatio = 1.3;     // 自由な長方形の比（ドラッグで変わる）
let dragging = false;
let picked = -1;         // 強調している比（-1 = なし）
let overlay = false;     // 重ねて比べるモード

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  textFont('sans-serif');
}

function draw() {
  background(230, 25, 12);
  unit = constrain(min(width / 9, (height - 260) / 7.5), 40, 140);
  let x0 = 40, y0 = 120;

  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text('短い辺を 1 にそろえて長い辺をくらべる　1〜5：強調　O：重ねる ' + (overlay ? 'ON' : 'off') + '　右下の長方形の右端をドラッグ　R：リセット', 20, 40);
  fill(0, 0, 65);
  textSize(15);
  text('「白銀比」は 2 種類ある：日本の伝統的な √2 ≈ 1.414 と、貴金属比の 1+√2 ≈ 2.414。どちらも正しい呼び名なので文脈で区別する', 20, 68);

  // 名前つきの長方形を並べる
  for (let i = 0; i < RATIOS.length; i++) {
    let r = RATIOS[i];
    let y = overlay ? y0 : y0 + i * (unit * 0.62 + 20);
    let h = overlay ? unit * 2 : unit * 0.62;
    let w = h * r.v;
    let on = picked < 0 || picked === i;
    stroke(r.hue, 70, 100, on ? 100 : 25);
    strokeWeight(picked === i ? 4 : 2);
    fill(r.hue, 60, 80, overlay ? 8 : (on ? 30 : 8));
    rect(x0, y, w, h);
    if (!overlay) {
      // 正方形の区切りを薄く（何枚の正方形が入るか）
      stroke(r.hue, 40, 100, on ? 40 : 10);
      strokeWeight(1);
      for (let k = 1; k < r.v; k++) line(x0 + k * h, y, x0 + k * h, y + h);
      noStroke();
      fill(0, 0, 100, on ? 100 : 40);
      textSize(16);
      text((i + 1) + '  ' + r.name + '　1 : ' + r.expr + ' = ' + nf(r.v, 1, 4), x0 + w + 16, y + h * 0.42);
      fill(0, 0, 70, on ? 100 : 40);
      textSize(13);
      text(r.ex, x0 + w + 16, y + h * 0.42 + 20);
    } else {
      noStroke();
      fill(r.hue, 70, 100, on ? 100 : 40);
      textSize(14);
      text(r.expr, x0 + w - 60, y + h + 18 + i * 18);
    }
  }

  // 自由な長方形（ドラッグで比を変える）
  let fy = height - unit * 1.3 - 40, fh = unit * 1.1, fw = fh * freeRatio;
  if (dragging) freeRatio = constrain((mouseX - x0) / fh, 1, 4);
  let near = nearest(freeRatio);
  stroke(0, 0, 100);
  strokeWeight(2);
  fill(0, 0, 100, 10);
  rect(x0, fy, fw, fh);
  // 右端のつまみ
  fill(dragging ? color(50, 90, 100) : color(0, 0, 100));
  noStroke();
  circle(x0 + fw, fy + fh / 2, 18);
  // 近い比の長方形を点線で重ねる
  drawingContext.setLineDash([6, 6]);
  noFill();
  stroke(RATIOS[near].hue, 70, 100);
  rect(x0, fy, fh * RATIOS[near].v, fh);
  drawingContext.setLineDash([]);
  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text('あなたの長方形　1 : ' + nf(freeRatio, 1, 3), x0 + max(fw, fh * RATIOS[near].v) + 20, fy + fh * 0.4);
  fill(RATIOS[near].hue, 60, 100);
  textSize(15);
  text('いちばん近いのは ' + RATIOS[near].name + '（差 ' + nf(abs(freeRatio - RATIOS[near].v), 1, 3) + '）', x0 + max(fw, fh * RATIOS[near].v) + 20, fy + fh * 0.4 + 26);

  drawFormulaPanel();
}

// 貴金属比の式と数値の表（右上）
function drawFormulaPanel() {
  let px = width - 400, py = 120;
  if (px < unit * 5) return; // 画面がせまいときは省略
  noStroke();
  fill(0, 0, 100, 7);
  rect(px - 16, py - 30, 380, 230, 10);
  fill(0, 0, 100);
  textSize(16);
  text('貴金属比　φn = (n + √(n² + 4)) / 2', px, py);
  textSize(14);
  for (let n = 1; n <= 6; n++) {
    let v = metallic(n);
    fill(n === 1 ? 45 : n === 2 ? 210 : n === 3 ? 25 : 0, n <= 3 ? 60 : 0, n <= 3 ? 100 : 80);
    text('n = ' + n + '　φ = ' + nf(v, 1, 5) + '　1/φ = ' + nf(1 / v, 1, 5), px, py + 26 + n * 22);
  }
  fill(0, 0, 65);
  textSize(13);
  text('どれも φ − 1/φ = n（小数部分が同じ！）', px, py + 190);
}

function nearest(v) {
  let best = 0;
  for (let i = 1; i < RATIOS.length; i++) if (abs(RATIOS[i].v - v) < abs(RATIOS[best].v - v)) best = i;
  return best;
}

function mousePressed() {
  let fy = height - unit * 1.3 - 40, fh = unit * 1.1;
  if (mouseY > fy - 20 && mouseY < fy + fh + 20 && abs(mouseX - (40 + fh * freeRatio)) < 40) dragging = true;
}
function mouseReleased() { dragging = false; }

function keyPressed() {
  if (key >= '1' && key <= '5') { let i = int(key) - 1; picked = picked === i ? -1 : i; }
  if (key === 'o' || key === 'O') overlay = !overlay;
  if (key === 'r' || key === 'R') { freeRatio = 1.3; picked = -1; overlay = false; }
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. 定規で手元の紙・カード・スマホの縦横を測って、どの比に近いか自由な長方形で確かめよう
// 2. 表の 1/φ の小数部分と φ の小数部分を見くらべよう。なぜ同じになる？（φ² = nφ + 1 を φ で割る）
// 3. RATIOS に「1 : 1.5（3:2 の写真）」「1 : 16/9（テレビ）」を足してみよう
// 4. n = 4, 5 の貴金属比の長方形も並べてみよう（metallic(4) を使う）

// ---------- 道具 ----------
// n 番目の貴金属比
function metallic(n) { return (n + Math.sqrt(n * n + 4)) / 2; }
