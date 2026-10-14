// ============================================
// 05 ストレンジ・アトラクター画集
// 2つの数 (x, y) を、sin と cos だけの式でくり返し更新して点を打つ。
// 何十万回打っても、点は決まった「かたち（アトラクター）」の上にしか落ちない
// マウス = 式のパラメータ a, b を変える / 1〜3 キーで式の種類 / S で保存
// ============================================

let layer;
let a = -1.4, b = 1.6, c = 1.0, d = 0.7; // パラメータ
let x = 0.1, y = 0.1;
let type = 1;
let names = ['', 'クリフォード', 'デ・ヨング', 'スヴェンソン'];

function setup() {
  createCanvas(windowWidth, windowHeight);
  layer = createGraphics(width, height);
  layer.colorMode(HSB, 360, 100, 100, 100);
  layer.background(0, 0, 5);
}

function draw() {
  // マウスで a, b を決める（動いたら描き直す）
  let na = map(mouseX, 0, width, -2.5, 2.5, true);
  let nb = map(mouseY, 0, height, -2.5, 2.5, true);
  if (abs(na - a) > 0.004 || abs(nb - b) > 0.004) {
    a = na;
    b = nb;
    layer.background(0, 0, 5);
  }

  let s = min(width, height) * 0.2; // 縮尺
  for (let i = 0; i < 6000; i++) {
    let nx, ny;
    // ★ 式はこれだけ。sin と cos が点を「折りたたむ」
    if (type === 1) {
      nx = sin(a * y) + c * cos(a * x);
      ny = sin(b * x) + d * cos(b * y);
    } else if (type === 2) {
      nx = sin(a * y) - cos(b * x);
      ny = sin(c * x) - cos(d * y);
    } else {
      nx = d * sin(a * x) - sin(b * y);
      ny = c * cos(a * x) + cos(b * y);
    }
    x = nx;
    y = ny;
    // 点の「向き」で色を変える
    layer.stroke((atan2(ny, nx) * 60 + 200) % 360, 60, 100, 12);
    layer.point(width / 2 + x * s, height / 2 + y * s);
  }

  image(layer, 0, 0);
  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text(names[type] + '・アトラクター　a = ' + nf(a, 1, 2) + '  b = ' + nf(b, 1, 2) + '（マウス）　1〜3 で式を変える　S で保存', 20, 40);
}

function keyPressed() {
  if (key >= '1' && key <= '3') {
    type = int(key);
    layer.background(0, 0, 5);
  }
  if (key === 's' || key === 'S') saveCanvas('attractor', 'png');
}

// ---------- やってみよう ----------
// 1. マウスをゆっくり動かして、お気に入りの形を見つけたら S で保存
// 2. c, d も変えてみよう（固定されている値）
// 3. 色を「向き」ではなく「何回目の点か」で変えると？
