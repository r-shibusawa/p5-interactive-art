// ============================================
// 14 フラクタル山脈（おまけ）
// 「真ん中を上下にずらす」を再帰でくり返すと、山の稜線になる（中点変位法）
// マウス左右 = 見る位置（手前の山が速く動く）/ クリックで新しい山 / 上下 = ギザギザ度
// ============================================

let layers = []; // 奥から手前へ、何枚かの山
let rough = 0.5; // ギザギザ度

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  makeMountains();
}

function makeMountains() {
  layers = [];
  for (let i = 0; i < 5; i++) {
    let pts = new Array(257).fill(0); // 2^8 + 1 個の高さ
    pts[0] = random(0.3, 0.7);
    pts[256] = random(0.3, 0.7);
    midpoint(pts, 0, 256, 0.5); // ★ 再帰で間を埋める
    layers.push(pts);
  }
}

// 区間 [a, b] の真ん中の高さを「両端の平均 ＋ ランダム」で決めて、左右に再帰
function midpoint(pts, a, b, amp) {
  let m = floor((a + b) / 2);
  if (m === a) return; // 間がなくなったら終わり
  pts[m] = (pts[a] + pts[b]) / 2 + random(-amp, amp);
  midpoint(pts, a, m, amp * rough); // 左半分（ずらす量は小さく）
  midpoint(pts, m, b, amp * rough); // 右半分
}

function draw() {
  // 空
  for (let y = 0; y < height; y += 4) {
    stroke(map(y, 0, height, 250, 20), 50, map(y, 0, height, 25, 80));
    line(0, y, width, y);
  }
  // 太陽
  noStroke();
  fill(40, 40, 100);
  circle(width * 0.75, height * 0.3, 90);

  // 山を奥から描く
  for (let i = 0; i < layers.length; i++) {
    let pts = layers[i];
    let depth = i / (layers.length - 1); // 0 = 奥, 1 = 手前
    let shift = map(mouseX, 0, width, -1, 1) * depth * 200; // 手前ほど大きく動く（視差）
    let base = height * (0.45 + depth * 0.5);
    let amp = height * (0.15 + depth * 0.2);

    fill(map(depth, 0, 1, 230, 140), map(depth, 0, 1, 25, 50), map(depth, 0, 1, 70, 15));
    beginShape();
    vertex(-10, height + 10);
    for (let k = 0; k < pts.length; k++) {
      let x = map(k, 0, pts.length - 1, -300, width + 300) + shift;
      vertex(x, base - pts[k] * amp);
    }
    vertex(width + 10, height + 10);
    endShape(CLOSE);
  }

  fill(0, 0, 100);
  textSize(16);
  text('マウス左右で視点が動く　クリックで新しい山　↑↓でギザギザ度（' + nf(rough, 1, 2) + '）', 20, 30);
}

function mousePressed() {
  makeMountains();
}

function keyPressed() {
  if (keyCode === UP_ARROW) rough = min(0.9, rough + 0.05);
  if (keyCode === DOWN_ARROW) rough = max(0.1, rough - 0.05);
  makeMountains();
  if (key === 's' || key === 'S') saveCanvas('mountains', 'png');
}

// ---------- やってみよう ----------
// 1. ギザギザ度 0.1（なめらかな丘）〜 0.9（険しい岩山）を比べよう
// 2. 山の色を、夕方や夜の色にしよう
// 3. 2D の線を 2 回使うと、2D の地形（高さの地図）もつくれる。調べてみよう：ダイヤモンド・スクエア法
