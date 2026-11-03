// ============================================
// 04 母関数で数える
// 「コインで金額 n をつくる方法の数」は、多項式のかけ算で全部まとめて出せる
//   (1 + x + x^2 + …)(1 + x^5 + x^10 + …)… の x^n の係数 = n 円のつくり方
// 1〜6 = コインの種類を ON/OFF（1, 2, 5, 10, 20, 50）/ P = 分割数モード（1〜N 全部の数）/ スペース = もう一度アニメ / ↑↓ = 最大金額
// ============================================

let N = 40;                         // ★ 最大の金額（x^N まで計算）
let coinKinds = [1, 2, 5, 10, 20, 50];
let on = [true, true, true, false, false, false];   // ★ 最初に使うコイン
let partitionMode = false;
let factors = [];                   // 使うコインの額面（順にかけていく）
let poly = [];                      // いまの多項式の係数 poly[n]
let stage = 0;                      // いくつ目の因子までかけたか
let t = 0;                          // アニメの時間

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  rebuild();
}

function rebuild() {
  factors = [];
  if (partitionMode) { for (let c = 1; c <= N; c++) factors.push(c); }
  else coinKinds.forEach((c, i) => { if (on[i]) factors.push(c); });
  poly = new Array(N + 1).fill(0);
  poly[0] = 1;              // 何もかけていない状態 = 1
  stage = 0;
  t = 0;
}

// ★ 1 つの因子 1/(1 − x^c) = 1 + x^c + x^2c + … をかける
//   係数の配列 poly に対して poly[n] += poly[n − c]（小さい n から順に）
function multiplyFactor(c) {
  for (let i = c; i <= N; i++) poly[i] += poly[i - c];
}

function draw() {
  background(230, 28, 11);
  // 0.5 秒ごとに次の因子をかける
  if (stage < factors.length) {
    t += deltaTime / 1000;
    let interval = partitionMode ? 0.12 : 0.9;
    if (t > interval) { t = 0; multiplyFactor(factors[stage]); stage++; }
  }

  // 棒グラフ
  let x0 = 60, y0 = height - 90, w = (width - 120) / (N + 1);
  let maxV = Math.max(1, ...poly);
  let hMax = height - 320;
  noStroke();
  for (let i = 0; i <= N; i++) {
    let hgt = (Math.log(poly[i] + 1) / Math.log(maxV + 1)) * hMax;   // 対数で高さを決める（大きい数も見える）
    let last = stage > 0 ? factors[stage - 1] : 0;
    let fresh = last > 0 && i >= last;
    fill(fresh ? 40 : 190, 70, poly[i] > 0 ? 95 : 25);
    rect(x0 + i * w, y0 - hgt, w - 2, hgt);
    fill(0, 0, 75);
    textAlign(CENTER, BASELINE);
    textSize(w > 22 ? 11 : 9);
    if (poly[i] > 0) text(poly[i], x0 + i * w + w / 2, y0 - hgt - 4);
    if (i % 5 === 0) { fill(0, 0, 55); text(i, x0 + i * w + w / 2, y0 + 18); }
  }
  textAlign(LEFT, BASELINE);
  stroke(0, 0, 40);
  line(x0, y0, x0 + (N + 1) * w, y0);
  noStroke();

  // 多項式の説明
  let px = 40, py = 130;
  fill(0, 0, 100);
  textSize(16);
  if (partitionMode) {
    text('分割数 p(n)：1 円, 2 円, 3 円, … 全部のコインを使う → 母関数 Π 1/(1 − x^k)', px, py);
    text('かけた因子：' + stage + ' / ' + factors.length + '（k = 1 … ' + stage + '）', px, py + 24);
    text('p(' + N + ') = ' + poly[N] + '　（p(5)=7, p(10)=42, p(20)=627, p(100)=190,569,292）', px, py + 48);
  } else {
    let fs = factors.map((c, i) => (i < stage ? '[' : '') + '1/(1−x^' + c + ')' + (i < stage ? ']' : ''));
    text('コイン：' + (factors.length ? factors.join(', ') : '（なし：1〜6 で選ぶ）') + ' 円　母関数 = ' + (fs.join(' · ') || '1'), px, py);
    text('かけた因子：' + stage + ' / ' + factors.length + '　［　］= かけ終わった因子', px, py + 24);
    text(N + ' 円のつくり方：' + poly[N] + ' 通り　（係数を読むだけ！）', px, py + 48);
  }
  // 直前の操作の式
  if (stage > 0) {
    let c = factors[stage - 1];
    fill(40, 70, 95);
    text('直前：(1 + x^' + c + ' + x^' + (2 * c) + ' + …) をかけた → 係数[n] += 係数[n − ' + c + ']（黄色の棒が変わった所）', px, py + 76);
  }

  fill(0, 0, 100);
  textSize(18);
  let onStr = coinKinds.map((c, i) => (on[i] ? '●' : '○') + c).join(' ');
  text((partitionMode ? '分割数モード（P で戻る）' : 'コイン（1〜6）：' + onStr) + '　N = ' + N + '（↑↓）　スペース：もう一度', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('棒の高さは対数。因子を 1 つかけるたびに「そのコインを使える」ようになり、つくり方の数が増える', 20, 68);
  fill(0, 0, 55);
  textSize(13);
  text('金額 n →', x0, y0 + 40);
}

function keyPressed() {
  if (key >= '1' && key <= '6') { on[Number(key) - 1] = !on[Number(key) - 1]; partitionMode = false; rebuild(); }
  if (key === 'p' || key === 'P') { partitionMode = !partitionMode; rebuild(); }
  if (key === ' ') rebuild();
  if (key === UP_ARROW && N < 80) { N += 10; rebuild(); }
  if (key === DOWN_ARROW && N > 10) { N -= 10; rebuild(); }
}

// ---------- やってみよう ----------
// 1. 1 円と 2 円だけなら、n 円のつくり方は floor(n/2)+1。グラフで確かめよう
// 2. 1, 5, 10 円で 30 円のつくり方は？ 手で数えてから係数と比べよう
// 3. 「各コインは 1 回まで」にするには因子を (1 + x^c) に変える：multiplyFactor を i を大きい方から回す形に
// 4. 分割数 p(n) は「奇数だけの分割」と「相異なる数の分割」が同じ数（オイラー）。因子を変えて確かめよう
