// ============================================
// 01 エントロピー（情報の量を測る）
// 「表が出る確率 p」のコインを投げた結果は、何ビットの情報か？
// p = 0.5 なら 1 ビット（いちばん予測できない）。p = 1 なら 0 ビット（投げる前からわかる）
// マウス左右 = p / クリックでコインを 100 回投げる
// ============================================

let p = 0.5;
let results = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

// ★ エントロピー H = −Σ p log2 p（単位：ビット）
function entropy(probs) {
  let h = 0;
  for (let q of probs) if (q > 0) h -= q * (log(q) / log(2));
  return h;
}

function draw() {
  background(230, 40, 10);
  p = map(mouseX, 0, width, 0, 1, true);
  let H = entropy([p, 1 - p]);

  // ---- 左：H(p) の曲線 ----
  let left = 80, right = width * 0.55, base = height * 0.8, top = height * 0.2;
  stroke(0, 0, 30);
  line(left, base, right, base);
  line(left, base, left, top);
  noFill();
  stroke(170, 80, 100);
  strokeWeight(3);
  beginShape();
  for (let q = 0; q <= 1.0001; q += 0.01) vertex(map(q, 0, 1, left, right), map(entropy([q, 1 - q]), 0, 1, base, top));
  endShape();
  noStroke();
  fill(40, 90, 100);
  circle(map(p, 0, 1, left, right), map(H, 0, 1, base, top), 18);
  fill(0, 0, 60);
  textSize(14);
  text('p = 0', left - 10, base + 24);
  text('0.5', (left + right) / 2 - 10, base + 24);
  text('1', right - 5, base + 24);
  text('1 ビット', left - 70, top + 5);
  text('0', left - 20, base + 5);
  text('表が出る確率 p →', (left + right) / 2 - 60, base + 48);

  // ---- 右：投げた結果 ----
  let rx = width * 0.62;
  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text('コイン 100 回（クリック）', rx, height * 0.2);
  for (let i = 0; i < results.length; i++) {
    let x = rx + (i % 20) * 28, y = height * 0.25 + floor(i / 20) * 28;
    fill(results[i] ? 45 : 230, results[i] ? 90 : 30, results[i] ? 100 : 40);
    circle(x, y, 22);
  }
  if (results.length) {
    let heads = results.filter((r) => r).length;
    fill(0, 0, 60);
    textSize(15);
    text('表 ' + heads + ' 回　裏 ' + (100 - heads) + ' 回　→ 結果を伝えるのに必要なのは約 ' + nf(H * 100, 1, 0) + ' ビット（100 ビットではなく）', rx, height * 0.25 + 5 * 28 + 10);
  }

  fill(0, 0, 100);
  textSize(18);
  text('p = ' + nf(p, 1, 2) + '（マウス左右）　エントロピー H = ' + nf(H, 1, 3) + ' ビット／回', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('H = −p log₂ p − (1−p) log₂ (1−p)　　予測できないほど情報が多い。全部表なら伝える必要がない（0 ビット）', 20, 68);
}

function mousePressed() {
  results = [];
  for (let i = 0; i < 100; i++) results.push(random() < p);
}

// ---------- やってみよう ----------
// 1. p = 0.9 のとき、100 回の結果は何ビットで伝えられる？（裏の位置だけ教えればいい）
// 2. サイコロ（6通り、全部 1/6）のエントロピーは？ entropy([1/6,1/6,1/6,1/6,1/6,1/6])
// 3. 日本語の文章は 1 文字あたり何ビット？（文字の出やすさに偏りがあるので、意外と少ない）
