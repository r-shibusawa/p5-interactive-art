// ============================================
// 12 Webカメラ・ドットアート（おまけ）
// カメラの映像を、色つきの丸の集まりで表現する
// 明るいところほど丸が大きくなる
// 1〜3 キーでモード切り替え（カメラの許可が必要）
// ============================================

let video;
let cols = 64; // 横の粒の数
let rows = 48; // 縦の粒の数
let mode = 1;

function setup() {
  createCanvas(640, 480);
  video = createCapture(VIDEO); // カメラを使う
  video.size(cols, rows); // 小さいサイズで取り込む（=粗いモザイク）
  video.hide(); // 元の映像は隠す
}

function draw() {
  background(10);
  video.loadPixels(); // 映像の色データを読み込む
  if (video.pixels.length === 0) return; // カメラの準備ができるまで待つ

  let cell = width / cols; // 1マスの大きさ

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      // pixels 配列は [R, G, B, A, R, G, B, A, ...] と並んでいる
      let index = (x + y * cols) * 4;
      let r = video.pixels[index];
      let g = video.pixels[index + 1];
      let b = video.pixels[index + 2];
      let bright = (r + g + b) / 3; // 明るさ

      // 鏡のように左右反転して描く
      let px = width - (x + 0.5) * cell;
      let py = (y + 0.5) * cell;
      noStroke();

      if (mode === 1) {
        // 色つきの丸（明るいほど大きい）
        fill(r, g, b);
        circle(px, py, map(bright, 0, 255, 1, cell * 1.3));
      } else if (mode === 2) {
        // 白黒の丸
        fill(255);
        circle(px, py, map(bright, 0, 255, 0, cell));
      } else {
        // 明るさで回転する線
        stroke(r, g, b);
        strokeWeight(2);
        let a = map(bright, 0, 255, 0, PI);
        line(px - cos(a) * cell / 2, py - sin(a) * cell / 2, px + cos(a) * cell / 2, py + sin(a) * cell / 2);
      }
    }
  }
}

function keyPressed() {
  if (key === '1') mode = 1;
  if (key === '2') mode = 2;
  if (key === '3') mode = 3;
  if (key === 's' || key === 'S') saveCanvas('webcam-art', 'png');
}

// ---------- やってみよう ----------
// 1. cols = 32, rows = 24 にすると？（もっと粗くなる）
// 2. 丸の代わりに rect や文字 text('★', px, py) にしてみよう
// 3. 自分だけのモード 4 をつくろう
