// ============================================
// 04 バーンズリーのシダ（点を打つだけで葉ができる）
// 4つの「縮めて動かす」変換をランダムに選んで、点を何万個も打つ
// マウスを左右に動かすと、葉の形が変わる（変換の角度を変えている）
// ============================================

let x = 0;
let y = 0;
let layer; // 点を描きためるキャンバス
let twist = 0; // 葉のねじれ（マウスで変える）

function setup() {
  createCanvas(windowWidth, windowHeight);
  layer = createGraphics(width, height);
  layer.colorMode(HSB, 360, 100, 100, 100);
  layer.background(140, 30, 6);
}

function draw() {
  // マウスが動いたら、形を変えて描き直す
  let t = map(mouseX, 0, width, -0.25, 0.25, true);
  if (abs(t - twist) > 0.002) {
    twist = t;
    layer.background(140, 30, 6);
  }

  // 1フレームに 3000 個の点を打つ
  for (let i = 0; i < 3000; i++) {
    let r = random(); // 0〜1 のサイコロで、どの変換を使うか決める
    let nx, ny;
    if (r < 0.01) {
      // 1%：茎
      nx = 0;
      ny = 0.16 * y;
    } else if (r < 0.86) {
      // 85%：葉全体を少し縮めて上へ（ここをマウスでねじる）
      let a = -0.04 + twist;
      nx = 0.85 * x + a * y;
      ny = -a * x + 0.85 * y + 1.6;
    } else if (r < 0.93) {
      // 7%：左の小葉
      nx = 0.2 * x - 0.26 * y;
      ny = 0.23 * x + 0.22 * y + 1.6;
    } else {
      // 7%：右の小葉
      nx = -0.15 * x + 0.28 * y;
      ny = 0.26 * x + 0.24 * y + 0.44;
    }
    x = nx;
    y = ny;

    // 数学の座標（x: -2.2〜2.7, y: 0〜10）→ 画面の座標
    let px = map(x, -3, 3, width / 2 - height * 0.3, width / 2 + height * 0.3);
    let py = map(y, 0, 10, height - 20, 20);
    layer.stroke(map(y, 0, 10, 90, 150), 60, 100, 40);
    layer.point(px, py);
  }

  image(layer, 0, 0);

  noStroke();
  fill(0, 0, 100);
  textSize(16);
  text('マウスを左右に動かすと葉の形が変わる　点の数 ' + frameCount * 3000, 20, 30);
}

// ---------- やってみよう ----------
// 1. 0.85 を 0.8 や 0.9 にすると、葉の長さが変わる
// 2. 確率（0.01 / 0.86 / 0.93）を変えると、点の集まり方が変わる
// 3. 色を y ではなく、どの変換を使ったかで変えてみよう
