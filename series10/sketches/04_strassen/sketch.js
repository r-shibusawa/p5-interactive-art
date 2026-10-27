// ============================================
// 04 行列のかけ算とシュトラッセン法
// n×n の行列の積は、ふつうに計算すると n³ 回のかけ算。
// 半分ずつ 4 つのブロックに分けると 8 回の小さな積。シュトラッセン（1969）は工夫して 7 回にした
// 1 回へらすだけで、くり返すと n^2.81 に。グラフで差が広がっていくのを見よう
// ←→：行列の大きさ n（2 のべき乗）　1：ふつう　2：分割統治（8 回）　3：シュトラッセン（7 回）
// ============================================

let k = 3;              // ★ n = 2^k
let method = 3;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

// かけ算の回数を再帰で数える（T(n) = 8T(n/2) または 7T(n/2)、ブロックが 1×1 になったら 1 回）
function mults(n, m) {
  if (m === 1) return n * n * n;
  if (n === 1) return 1;
  return (m === 2 ? 8 : 7) * mults(n / 2, m);
}

function draw() {
  background(270, 30, 10);
  let n = Math.pow(2, k);
  // 左：再帰の木。深さ d には (分かれ方)^d 個の小さな積がある
  let S = min(height - 220, width * 0.42);
  let x0 = 60, y0 = 150;
  let br = method === 1 ? 1 : method === 2 ? 8 : 7;
  let levels = method === 1 ? 1 : k + 1;
  let rowH = min(70, (height - y0 - 60) / max(1, levels));
  for (let d = 0; d < levels; d++) {
    let count = Math.pow(br, d), size = n / Math.pow(2, d);
    let y = y0 + d * rowH;
    noStroke(); fill(0, 0, 80); textSize(13); textAlign(LEFT, TOP);
    text('深さ ' + d + '：' + count.toLocaleString() + ' 個の ' + size + '×' + size + ' の積', x0, y);
    let cell = max(2, min(14, (S - 10) / min(count, 60)));
    let shown = min(count, 60 * max(1, floor((rowH - 22) / cell)));
    for (let i = 0; i < shown; i++) {
      fill((d * 70 + (i % br) * 30) % 360, 55, 90);
      rect(x0 + (i % 60) * cell, y + 18 + floor(i / 60) * cell, cell - 1, cell - 1);
    }
    if (count > shown) { fill(0, 0, 60); text('…ほか ' + (count - shown).toLocaleString() + ' 個', x0 + 60 * cell + 6, y + 18); }
  }
  fill(0, 0, 70); noStroke(); textSize(14); textAlign(LEFT, TOP);
  text(method === 1 ? '三重ループで n³ 回' : '最後の段は 1×1 の積 = かけ算 1 回。その個数が答え', x0, height - 40);

  // 右上：7 つの積（シュトラッセン）
  let rx = x0 + S + 60;
  textSize(15); fill(0, 0, 90);
  let lines = method === 3 ? [
    'M1 = (A11 + A22)(B11 + B22)', 'M2 = (A21 + A22) B11', 'M3 = A11 (B12 − B22)', 'M4 = A22 (B21 − B11)',
    'M5 = (A11 + A12) B22', 'M6 = (A21 − A11)(B11 + B12)', 'M7 = (A12 − A22)(B21 + B22)',
    'C11 = M1 + M4 − M5 + M7', 'C12 = M3 + M5', 'C21 = M2 + M4', 'C22 = M1 − M2 + M3 + M6'] :
    method === 2 ? ['C11 = A11·B11 + A12·B21', 'C12 = A11·B12 + A12·B22', 'C21 = A21·B11 + A22·B21', 'C22 = A21·B12 + A22·B22', '→ 小さな積が 8 回'] :
    ['C[i][j] = Σ A[i][k] · B[k][j]', '→ i, j, k の三重ループで n³ 回'];
  for (let i = 0; i < lines.length; i++) { fill(i < 7 && method === 3 ? color(i * 45, 60, 100) : color(0, 0, 85)); text(lines[i], rx, y0 + i * 24); }

  // 右下：回数のグラフ（対数）
  let gx = rx, gy = y0 + 300, gw = width - rx - 60, gh = height - gy - 70;
  if (gh > 80) {
    stroke(0, 0, 35); line(gx, gy + gh, gx + gw, gy + gh); line(gx, gy, gx, gy + gh);
    let maxV = Math.log2(mults(Math.pow(2, 10), 1));
    for (let m = 1; m <= 3; m++) {
      noFill(); stroke([0, 0, 200, 140][m], 70, 100); strokeWeight(m === method ? 4 : 2);
      beginShape();
      for (let e = 0; e <= 10; e++) vertex(gx + e / 10 * gw, gy + gh - Math.log2(mults(Math.pow(2, e), m)) / maxV * gh);
      endShape();
    }
    stroke(0, 0, 70); strokeWeight(1); line(gx + k / 10 * gw, gy, gx + k / 10 * gw, gy + gh);
    noStroke(); fill(0, 0, 60); textSize(12);
    text('縦：かけ算の回数（対数目盛）　横：n = 1, 2, 4, … 1024', gx, gy + gh + 8);
    fill(0, 70, 100); text('赤：n³', gx + 10, gy + 4); fill(200, 70, 100); text('青：8 回分割（やはり n³）', gx + 10, gy + 22); fill(140, 70, 100); text('緑：シュトラッセン n^log₂7 ≈ n^2.81', gx + 10, gy + 40);
  }

  let names = ['', 'ふつうの計算', '分割統治（8 回）', 'シュトラッセン（7 回）'];
  noStroke(); fill(0, 0, 100); textSize(22); textAlign(LEFT, BASELINE);
  text('行列の積　n = ' + n + '　' + names[method] + '：かけ算 ' + mults(n, method).toLocaleString() + ' 回（n³ = ' + (n * n * n).toLocaleString() + '）', 20, 40);
  fill(0, 0, 65); textSize(15);
  text('←→：n を変える　1 ふつう　2 分割統治　3 シュトラッセン', 20, 68);
  text('T(n) = 7T(n/2) + Θ(n²) → マスター定理で Θ(n^log₂7)。足し算は増えるが、かけ算の回数が支配的になる', 20, 92);
}

function keyPressed() {
  if (key === RIGHT_ARROW) k = min(7, k + 1);
  if (key === LEFT_ARROW) k = max(0, k - 1);
  if (key >= '1' && key <= '3') method = int(key);
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. n = 128 で、ふつうとシュトラッセンのかけ算の回数は何倍ちがう？
// 2. 「8 回」の分割統治が n³ から速くならない理由を、T(n) = 8T(n/2) から考えよう
// 3. 実際の計算機では小さいブロックはふつうに計算したほうが速い。mults を「n ≤ 8 ならふつう」に変えよう
