// ============================================
// 05 ジェネラティブアート
// コンピュータがランダムに作品をつくる
// クリックするたびに新しい作品が生まれる / S で保存
// ============================================

let step = 50; // マス目の大きさ

function setup() {
  createCanvas(600, 600);
  colorMode(HSB, 360, 100, 100, 100);
  rectMode(CENTER); // rect の (x, y) を中心にする
  noLoop(); // draw() を1回だけ実行する（くり返さない）
}

function draw() {
  background(40, 10, 97);

  let baseHue = random(360); // 今回のテーマカラーをランダムに決める

  // 2重の for 文で、マス目を全部まわる
  for (let x = step / 2; x < width; x += step) {
    for (let y = step / 2; y < height; y += step) {
      // テーマカラーの近くの色を選ぶ
      let h = (baseHue + random(-40, 40) + 360) % 360;
      fill(h, random(50, 90), random(70, 100), 85);
      noStroke();

      let size = random(10, step * 1.2);
      let r = random(); // 0〜1 のランダムな数

      // r の値で、描く図形を変える
      if (r < 0.3) {
        circle(x, y, size);
      } else if (r < 0.6) {
        rect(x, y, size, size, 6);
      } else if (r < 0.85) {
        triangle(x, y - size / 2, x - size / 2, y + size / 2, x + size / 2, y + size / 2);
      } else {
        // 線だけの円
        noFill();
        stroke(h, 80, 60);
        strokeWeight(3);
        circle(x, y, size * 0.8);
      }
    }
  }
}

function mousePressed() {
  redraw(); // draw() をもう1回実行する
}

function keyPressed() {
  if (key === 's' || key === 'S') saveCanvas('generative', 'png');
}

// ---------- やってみよう ----------
// 1. step を 20 や 100 にすると？
// 2. random(-40, 40) を random(-180, 180) にすると色はどうなる？
// 3. 好きな図形を追加して、自分だけのルールをつくろう
