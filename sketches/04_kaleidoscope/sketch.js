// ============================================
// 04 万華鏡ペイント
// 描いた線が回転＆反転してコピーされる
// 数字キー 2〜9 で分割数を変更 / C で消す / S で保存
// ============================================

let symmetry = 8; // いくつに分けてコピーするか
let hue = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  background(0, 0, 8);
}

function draw() {
  if (mouseIsPressed) {
    // 画面の中心を原点 (0, 0) に移動する
    translate(width / 2, height / 2);

    // 中心から見たマウスの位置
    let x = mouseX - width / 2;
    let y = mouseY - height / 2;
    let px = pmouseX - width / 2;
    let py = pmouseY - height / 2;

    let speed = dist(px, py, x, y);
    stroke(hue, 70, 100, 70);
    strokeWeight(map(speed, 0, 40, 2, 12, true));

    // for 文：同じことを symmetry 回くり返す
    for (let i = 0; i < symmetry; i++) {
      rotate(TWO_PI / symmetry); // 360° ÷ 分割数 だけ回す
      line(px, py, x, y);

      push(); // 今の状態を保存
      scale(1, -1); // 上下反転（鏡）
      line(px, py, x, y);
      pop(); // 保存した状態に戻す
    }

    hue = (hue + 1) % 360; // % は「割った余り」→ 360 を超えると 0 に戻る
  }
}

function keyPressed() {
  if (key >= '2' && key <= '9') {
    symmetry = int(key); // 文字を数字に変換
    background(0, 0, 8);
  }
  if (key === 'c' || key === 'C') background(0, 0, 8);
  if (key === 's' || key === 'S') saveCanvas('kaleidoscope', 'png');
}

// ---------- やってみよう ----------
// 1. 数字キーで分割数を変えて、模様の違いを見てみよう
// 2. line の代わりに circle(x, y, 10) にすると？
// 3. 背景を白 background(0, 0, 100) にして描いてみよう
