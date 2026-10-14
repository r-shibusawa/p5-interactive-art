// ============================================
// 03 レインボーブラシ
// 色がどんどん変わる＆速く動かすと太くなる筆
// C キーで消す / S キーで保存
// ============================================

let hue = 0; // 色相（色の種類）を覚えておく変数

function setup() {
  createCanvas(windowWidth, windowHeight);
  // HSB モード：色相(0〜360), 彩度(0〜100), 明るさ(0〜100), 透明度(0〜100)
  colorMode(HSB, 360, 100, 100, 100);
  background(0, 0, 10);
}

function draw() {
  if (mouseIsPressed) {
    // マウスの速さ = 前のフレームからの移動距離
    let speed = dist(pmouseX, pmouseY, mouseX, mouseY);
    // 速さ 0〜50 を 太さ 4〜40 に変換（true で範囲外を切り捨て）
    let weight = map(speed, 0, 50, 4, 40, true);

    stroke(hue, 80, 100, 80);
    strokeWeight(weight);
    line(pmouseX, pmouseY, mouseX, mouseY);

    hue = hue + 2; // 少しずつ色を変える
    if (hue > 360) {
      hue = 0; // 一周したら最初に戻る
    }
  }
}

function keyPressed() {
  if (key === 'c' || key === 'C') background(0, 0, 10);
  if (key === 's' || key === 'S') saveCanvas('rainbow', 'png');
}

// ---------- やってみよう ----------
// 1. hue + 2 の 2 を 10 にすると？
// 2. 太さの関係を逆にしてみよう（速いと細い）→ map(speed, 0, 50, 40, 4, true)
// 3. 彩度 80 を 30 にすると、パステルカラーになる
