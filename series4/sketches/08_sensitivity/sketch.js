// ============================================
// 08 初期値敏感性（バタフライ効果を数で見る）
// 同じ式を、最初の値が 0.000001 だけちがう 2つで計算する
// 規則的な r では差はずっと小さいまま。カオスの r では、差が毎回「倍」になって爆発する
// マウス左右 = r / クリックで最初の値を変える
// ============================================

let r = 3.9;
let x0 = 0.3;
let eps = 0.000001; // 最初の差
let N = 60;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(230, 40, 10);
  r = map(mouseX, 0, width, 2.8, 4.0, true);

  // 2つの系列を計算
  let a = [x0], b = [x0 + eps];
  for (let i = 1; i < N; i++) {
    a.push(r * a[i - 1] * (1 - a[i - 1]));
    b.push(r * b[i - 1] * (1 - b[i - 1]));
  }

  let left = 80, right = width - 60;
  // ---- 上：2つの系列 ----
  let top1 = 110, bot1 = height * 0.5;
  drawSeries(a, left, right, top1, bot1, 170);
  drawSeries(b, left, right, top1, bot1, 20);
  // 2つが離れた最初の年を探す
  let split = N;
  for (let i = 0; i < N; i++) if (abs(a[i] - b[i]) > 0.01) { split = i; break; }
  if (split < N) {
    let sx = map(split, 0, N - 1, left, right);
    stroke(40, 90, 100);
    strokeWeight(2);
    line(sx, top1, sx, bot1);
    noStroke();
    fill(40, 90, 100);
    textSize(16);
    text('ここで別れる（' + split + ' 年目）', sx + 8, top1 + 20);
  }

  // ---- 下：差の大きさ（対数目盛）----
  let top2 = height * 0.58, bot2 = height - 60;
  stroke(0, 0, 40);
  strokeWeight(1);
  line(left, bot2, right, bot2);
  for (let e = -6; e <= 0; e++) {
    let y = map(e, -6, 0, bot2, top2);
    stroke(0, 0, 25);
    line(left, y, right, y);
    noStroke();
    fill(0, 0, 60);
    textSize(12);
    text('10^' + e, left - 50, y + 4);
  }
  noFill();
  stroke(40, 90, 100);
  strokeWeight(2.5);
  beginShape();
  for (let i = 0; i < N; i++) {
    let d = max(abs(a[i] - b[i]), 1e-7);
    vertex(map(i, 0, N - 1, left, right), map(log(d) / log(10), -6, 0, bot2, top2));
  }
  endShape();

  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text('r = ' + nf(r, 1, 3) + '（マウス左右）　最初の差 = 0.000001　クリックで最初の値を変える', 20, 40);
  textSize(16);
  fill(0, 0, 70);
  text('上：2つの系列（青 と 赤）　　下：2つの差（対数目盛）。まっすぐ右上に伸びる ＝ 毎年同じ倍率で増える ＝ カオス', 20, 70);
}

function drawSeries(xs, left, right, top, bot, hue) {
  noFill();
  stroke(hue, 70, 100);
  strokeWeight(2);
  beginShape();
  for (let i = 0; i < xs.length; i++) vertex(map(i, 0, xs.length - 1, left, right), map(xs[i], 0, 1, bot, top));
  endShape();
}

function mousePressed() {
  x0 = random(0.05, 0.95);
}

// ---------- やってみよう ----------
// 1. r = 3.0（規則的）では、下のグラフは下に張りついたまま。r = 3.9 では右上へ一直線
// 2. 最初の差 eps を 0.0000000001 にすると、別れるのは何年遅れる？（たった数年！）
// 3. 下のグラフの傾きが「リアプノフ指数」。天気予報が2週間以上当たらない理由
