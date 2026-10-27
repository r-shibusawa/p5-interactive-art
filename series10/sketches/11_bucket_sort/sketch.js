// ============================================
// 11 バケットソート
// 0 以上 1 未満の数を、n 個のバケツ [0, 0.1), [0.1, 0.2), … に振り分け、
// バケツの中だけ挿入ソートして、左から順につなげる
// 数がばらけて（一様に）いれば、各バケツは平均 1 個ちょっと → 全体で平均 Θ(n)
// 偏っていると 1 つのバケツに集中して Θ(n²) に。入力の分布で速さが変わる
// スペース：再生／停止　→：1 手　1：一様な入力　2：偏った入力（正規分布）　3：最悪（全部同じバケツ）
// R：やり直し　↑↓ 速さ
// ============================================

let n = 20;              // ★ 個数（= バケツの数）
let speed = 6;
let A = [], B = [], out = [], gen, input = 1, playing = true, acc = 0, done = false, ops = 0, phase = '';
let hl = { a: -1, b: -1, i: -1 };

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  reset();
}

function reset() {
  A = [];
  for (let i = 0; i < n; i++) {
    let v;
    if (input === 1) v = random();
    if (input === 2) v = constrain(randomGaussian(0.5, 0.08), 0, 0.999);
    if (input === 3) v = random(0.3, 0.349);
    A.push(floor(v * 1000) / 1000);
  }
  B = Array.from({ length: n }, () => []); out = []; ops = 0; done = false; hl = { a: -1, b: -1, i: -1 };
  gen = bucketSort();
}

// バケットソート：振り分け → バケツごとに挿入ソート → つなげる
function* bucketSort() {
  phase = '① 振り分け：A[i] を バケツ ⌊n·A[i]⌋ に入れる';
  for (let i = 0; i < A.length; i++) { let b = floor(n * A[i]); B[b].push(A[i]); ops++; hl = { a: i, b, i: -1 }; yield; }
  phase = '② 各バケツの中を挿入ソート';
  for (let b = 0; b < n; b++) {
    let bk = B[b];
    for (let j = 1; j < bk.length; j++) {
      let key = bk[j], i = j - 1;
      while (i >= 0) { ops++; hl = { a: -1, b, i }; yield; if (bk[i] <= key) break; bk[i + 1] = bk[i]; i--; }
      bk[i + 1] = key;
    }
    if (bk.length) { hl = { a: -1, b, i: -1 }; yield; }
  }
  phase = '③ 左のバケツから順につなげる';
  for (let b = 0; b < n; b++) for (let v of B[b]) { out.push(v); ops++; hl = { a: -1, b, i: -1 }; yield; }
  phase = '完成！'; done = true; hl = { a: -1, b: -1, i: -1 };
}

function advance() { if (!done) gen.next(); }

function draw() {
  background(40, 25, 9);
  if (playing && !done) { acc += speed / 60; while (acc >= 1) { advance(); acc--; } }
  let L = 60, W = width - 120;
  // 入力を数直線の上に
  stroke(0, 0, 40); line(L, 160, L + W, 160);
  for (let i = 0; i < A.length; i++) {
    let x = L + A[i] * W;
    noStroke(); fill(i === hl.a ? color(45, 90, 100) : color(A[i] * 300, 60, 90));
    circle(x, 160, i === hl.a ? 16 : 10);
  }
  noStroke(); fill(0, 0, 60); textSize(12); textAlign(CENTER, TOP);
  for (let q = 0; q <= 10; q++) text((q / 10).toFixed(1), L + q / 10 * W, 172);
  // バケツ
  let bw = W / n, top = 220, bh = height - top - 170;
  let maxLen = max(4, ...B.map(b => b.length));
  for (let b = 0; b < n; b++) {
    noStroke(); fill(b === hl.b ? color(330, 50, 40) : color(40, 15, 18));
    rect(L + b * bw + 2, top, bw - 4, bh, 6);
    fill(0, 0, 50); textSize(10); textAlign(CENTER, TOP); text(b, L + b * bw + bw / 2, top + bh + 4);
    let ch = min(28, (bh - 10) / maxLen);
    for (let i = 0; i < B[b].length; i++) {
      let v = B[b][i];
      fill(b === hl.b && (i === hl.i || i === hl.i + 1) ? color(45, 90, 100) : color(v * 300, 55, 80));
      rect(L + b * bw + 5, top + bh - (i + 1) * ch, bw - 10, ch - 2, 4);
      if (ch > 14 && bw > 36) { fill(0, 0, 10); textSize(10); textAlign(CENTER, CENTER); text(v.toFixed(3).slice(1), L + b * bw + bw / 2, top + bh - (i + 0.5) * ch); }
    }
  }
  // 出力
  let ow = W / n;
  for (let i = 0; i < out.length; i++) {
    noStroke(); fill(out[i] * 300, 55, 80); rect(L + i * ow + 2, height - 120, ow - 4, 32, 4);
    if (ow > 34) { fill(0, 0, 10); textSize(10); textAlign(CENTER, CENTER); text(out[i].toFixed(3).slice(1), L + i * ow + ow / 2, height - 104); }
  }
  noStroke(); fill(0, 0, 60); textSize(13); textAlign(LEFT, BASELINE);
  text('出力', L, height - 128);

  let ins = ['', '一様', '偏り（正規分布）', '最悪（1 つのバケツに集中）'];
  fill(0, 0, 100); textSize(22);
  text('バケットソート　入力：' + ins[input] + '　' + phase + '　操作 ' + ops + ' 回', 20, 40);
  fill(0, 0, 65); textSize(15);
  text('スペース：' + (playing ? '停止' : '再生') + '　→：1手　1 一様　2 偏り　3 最悪　R：やり直し　↑↓ 速さ ' + speed, 20, 68);
  text('操作回数を 1・2・3 で比べよう。n = ' + n + ' なら、n は ' + n + '、n² は ' + n * n, 20, 92);
}

function keyPressed() {
  if (key === ' ') playing = !playing;
  if (key === RIGHT_ARROW) { playing = false; advance(); }
  if (key >= '1' && key <= '3') { input = int(key); reset(); }
  if (key === 'r' || key === 'R') reset();
  if (key === UP_ARROW) speed = min(240, speed * 2);
  if (key === DOWN_ARROW) speed = max(1, speed / 2);
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. 偏った入力（2）で、バケツの幅を「真ん中ほど細く」すると速くなる。どう変える？
// 2. バケツの数を n / 4 にすると、操作回数はどう変わる？
// 3. 点数（0〜100 点）のテスト結果を並べるなら、どのソートを使う？
