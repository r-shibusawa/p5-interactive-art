// ============================================
// 00 ロジスティック写像（1行の式が暴れだす）
// 来年の個体数 = r × 今年の個体数 × (1 − 今年の個体数)
// r を少し変えるだけで、落ち着く → 2つを行ったり来たり → 4つ → … → カオス
// マウス左右 = r（2.5〜4.0） / クリックで最初の値をランダムに
// ============================================

let r = 3.2;
let x0 = 0.3; // 最初の値
let N = 120; // 何年ぶん計算するか

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(230, 40, 10);
  r = map(mouseX, 0, width, 2.5, 4.0, true);

  // ---- 計算：x を N 回更新する ----
  let xs = [x0];
  for (let i = 1; i < N; i++) {
    let x = xs[i - 1];
    xs.push(r * x * (1 - x)); // ★ これが全部
  }

  // ---- グラフを描く ----
  let left = 80, right = width - 60, top = 120, bottom = height - 80;
  stroke(0, 0, 40);
  strokeWeight(1);
  line(left, bottom, right, bottom);
  line(left, top, left, bottom);

  noFill();
  stroke(170, 80, 100);
  strokeWeight(2.5);
  beginShape();
  for (let i = 0; i < N; i++) {
    vertex(map(i, 0, N - 1, left, right), map(xs[i], 0, 1, bottom, top));
  }
  endShape();
  noStroke();
  fill(170, 80, 100);
  for (let i = 0; i < N; i++) circle(map(i, 0, N - 1, left, right), map(xs[i], 0, 1, bottom, top), 5);

  // 最後の 40 年の値が、いくつの値に落ち着いているか（周期）
  let tail = xs.slice(-40).map((v) => round(v * 1000));
  let distinct = new Set(tail).size;
  let state = distinct === 1 ? '1つの値に落ち着く' : distinct <= 2 ? '2つの値を行ったり来たり（周期2）' : distinct <= 4 ? '周期4' : distinct <= 8 ? '周期8' : 'カオス（同じ値に戻らない）';

  fill(0, 0, 100);
  textSize(18);
  text('x(来年) = r × x(今年) × (1 − x(今年))　　r = ' + nf(r, 1, 3) + '（マウス左右）　最初の値 x0 = ' + nf(x0, 1, 3) + '（クリックで変更）', 20, 40);
  textSize(24);
  fill(40, 80, 100);
  text(state, 20, 80);
  fill(0, 0, 60);
  textSize(14);
  text('年 →', right - 40, bottom + 30);
  text('個体数（0〜1）', left - 70, top - 16);
}

function mousePressed() {
  x0 = random(0.01, 0.99);
}

// ---------- やってみよう ----------
// 1. r をゆっくり右へ。2.5 → 3.0（落ち着く）→ 3.2（周期2）→ 3.5（周期4）→ 3.57…（カオス）
// 2. r = 3.83 付近に、カオスの中に「周期3」の窓がある。探してみよう
// 3. カオスのとき、クリックで x0 を変えると、グラフは全然違う形になる（初期値敏感性）
