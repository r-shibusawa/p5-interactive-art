// ============================================
// 00 円の中に円（はじめての再帰）
// 「自分自身を呼び出す」関数で、同じ形がどこまでも続く
// マウスを左右に動かすと、くり返しの深さが変わる
// ============================================

let maxDepth = 4; // どこまで深くくり返すか
let count = 0; // 描いた円の数

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  noFill();
  strokeWeight(2);
}

function draw() {
  background(230, 30, 10);

  // マウスの x 位置 → 深さ（1〜8）
  maxDepth = floor(map(mouseX, 0, width, 1, 9, true));
  count = 0;

  // 最初の大きな円から始める
  drawCircle(width / 2, height / 2, min(width, height) * 0.42, 0);

  // 説明
  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text('深さ ' + maxDepth + '　円の数 ' + count + '　（マウスを左右に動かそう）', 20, 30);
}

// 円を描いて、その中にもっと小さい円を描く関数
// depth = 今なんばん目の深さか
function drawCircle(x, y, r, depth) {
  stroke((depth * 40) % 360, 70, 100);
  circle(x, y, r * 2);
  count = count + 1;

  // まだ深さが残っていたら、半分の大きさの円を左右に描く
  // ★ ここで「自分自身」を呼んでいる = 再帰
  if (depth < maxDepth) {
    drawCircle(x - r / 2, y, r / 2, depth + 1);
    drawCircle(x + r / 2, y, r / 2, depth + 1);
  }
}

// ---------- やってみよう ----------
// 1. 左右だけでなく、上下にも円を描いてみよう
//    drawCircle(x, y - r / 2, r / 2, depth + 1);
//    drawCircle(x, y + r / 2, r / 2, depth + 1);
// 2. r / 2 を r / 3 にすると？
// 3. 円の数は深さが1増えるごとに何倍になる？
