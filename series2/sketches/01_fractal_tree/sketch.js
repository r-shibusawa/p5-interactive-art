// ============================================
// 01 フラクタルツリー
// 枝の先からまた枝が生える、を再帰でくり返す
// 左右 = 枝の開く角度 / 上下 = 枝の縮む割合
// クリックで 2本枝 ⇄ 3本枝
// ============================================

let branches = 2; // 1本の枝から何本に分かれるか

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(210, 40, 12);

  let angle = map(mouseX, 0, width, 0, PI / 2); // 枝の角度 0°〜90°
  let ratio = map(mouseY, 0, height, 0.8, 0.5); // 枝がどれだけ短くなるか

  // 画面の下の中央から、上に向かって幹を描く
  translate(width / 2, height);
  branch(height * 0.28, angle, ratio, 0);

  // 説明
  resetMatrix();
  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text('角度 ' + round(degrees(angle)) + '°　縮む割合 ' + nf(ratio, 1, 2) + '　クリックで枝の数を変更（' + branches + '本）', 20, 30);
}

// 枝を1本描いて、その先に小さい枝を描く
function branch(len, angle, ratio, depth) {
  strokeWeight(map(depth, 0, 10, 14, 1, true));
  stroke(map(depth, 0, 10, 30, 130), 60, map(depth, 0, 10, 60, 100)); // 茶色 → 緑
  line(0, 0, 0, -len);
  translate(0, -len); // 枝の先まで移動

  // 枝が短くなりすぎたら終わり（終わる条件がないと無限に続いてしまう！）
  if (len < 5 || depth > 11) return;

  // 右の枝
  push();
  rotate(angle);
  branch(len * ratio, angle, ratio, depth + 1);
  pop();

  // 左の枝
  push();
  rotate(-angle);
  branch(len * ratio, angle, ratio, depth + 1);
  pop();

  // 3本モードなら、まっすぐの枝も
  if (branches === 3) {
    branch(len * ratio * 0.8, angle, ratio, depth + 1);
  }
}

function mousePressed() {
  branches = branches === 2 ? 3 : 2;
}

// ---------- やってみよう ----------
// 1. マウスを動かして、木・雪の結晶・シダのような形を探そう
// 2. 左右の角度をちがう値にすると？（rotate(angle) と rotate(-angle * 0.5)）
// 3. 枝の色を自分で決めよう（depth で変化させる）
