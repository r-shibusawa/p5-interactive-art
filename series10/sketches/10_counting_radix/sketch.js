// ============================================
// 10 計数ソートと基数ソート
// 比べずに並べる！ 値が 0〜k の整数なら「各値が何個あるか」を数えれば、置き場所が決まる（計数ソート）
// Θ(n + k) なので、09 の下界 n log n より速い（比較をしないから下界が当てはまらない）
// 基数ソート：3 けたの数を「1 の位 → 10 の位 → 100 の位」の順に、安定な計数ソートで並べる
// スペース：再生／停止　→：1 手　1：計数ソート　2：基数ソート　R：新しい数列　↑↓ 速さ
// ============================================

let n = 16, k = 9;        // ★ 計数ソートの個数と最大値
let speed = 4;
let algo = 1, A = [], C = [], Bout = [], gen, playing = true, acc = 0, done = false, ops = 0;
let hl = { a: -1, c: -1, b: -1 }, phase = '', digitPos = 0, buckets = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  reset();
}

function reset() {
  A = [];
  for (let i = 0; i < n; i++) A.push(algo === 1 ? floor(random(k + 1)) : floor(random(100, 1000)));
  C = []; Bout = new Array(n).fill(null); buckets = []; ops = 0; done = false; hl = { a: -1, c: -1, b: -1 };
  gen = algo === 1 ? countingSort() : radixSort();
}

// 計数ソート：数える → 累積する → 後ろから置く
function* countingSort() {
  C = new Array(k + 1).fill(0);
  phase = '① 数える：C[A[j]] を 1 増やす';
  for (let j = 0; j < A.length; j++) { C[A[j]]++; ops++; hl = { a: j, c: A[j], b: -1 }; yield; }
  phase = '② 足し合わせる：C[i] = 「i 以下の個数」';
  for (let i = 1; i <= k; i++) { C[i] += C[i - 1]; ops++; hl = { a: -1, c: i, b: -1 }; yield; }
  phase = '③ 右から順に、C[A[j]] 番目に置く（安定）';
  for (let j = A.length - 1; j >= 0; j--) {
    C[A[j]]--; Bout[C[A[j]]] = A[j]; ops++;
    hl = { a: j, c: A[j], b: C[A[j]] }; yield;
  }
  phase = '完成！'; done = true; hl = { a: -1, c: -1, b: -1 };
}

// 基数ソート（各けたは 10 個のバケツで安定に分ける）
function* radixSort() {
  for (digitPos = 0; digitPos < 3; digitPos++) {
    let pw = Math.pow(10, digitPos);
    phase = ['1', '10', '100'][digitPos] + ' の位で分ける';
    buckets = Array.from({ length: 10 }, () => []);
    for (let j = 0; j < A.length; j++) { buckets[floor(A[j] / pw) % 10].push(A[j]); ops++; hl = { a: j, c: floor(A[j] / pw) % 10, b: -1 }; yield; }
    phase = ['1', '10', '100'][digitPos] + ' の位の順に集める（同じけたなら前の順番のまま）';
    let out = [];
    for (let d = 0; d < 10; d++) for (let v of buckets[d]) { out.push(v); ops++; }
    A = out; hl = { a: -1, c: -1, b: -1 }; yield; yield;
    buckets = [];
  }
  phase = '完成！'; done = true;
}

function advance() { if (!done) gen.next(); }

function cell(x, y, w, h, v, c, label) {
  noStroke(); fill(c); rect(x + 2, y, w - 4, h, 6);
  fill(0, 0, 100); textAlign(CENTER, CENTER); textSize(min(18, w * 0.4)); text(v === null || v === undefined ? '' : v, x + w / 2, y + h / 2);
  if (label !== undefined) { fill(0, 0, 50); textSize(11); text(label, x + w / 2, y + h + 10); }
}

function draw() {
  background(120, 25, 9);
  if (playing && !done) { acc += speed / 60; while (acc >= 1) { advance(); acc--; } }
  let L = 60, W = width - 120;
  if (algo === 1) {
    let w = W / max(1, A.length);
    fill(0, 0, 80); noStroke(); textAlign(LEFT, BASELINE); textSize(15);
    text('A（入力）', L, 150);
    for (let j = 0; j < A.length; j++) cell(L + j * w, 160, w, 44, A[j], j === hl.a ? color(45, 90, 90) : color(A[j] * 36, 50, 55), j);
    text('C（数えた表）', L, 270);
    let cw = W / (k + 1);
    for (let i = 0; i <= k; i++) cell(L + i * cw, 280, cw, 44, C.length ? C[i] : '', i === hl.c ? color(330, 70, 90) : color(i * 36, 40, 35), '値 ' + i);
    text('B（出力）', L, 390);
    for (let j = 0; j < Bout.length; j++) cell(L + j * w, 400, w, 44, Bout[j], j === hl.b ? color(140, 80, 85) : Bout[j] === null ? color(0, 0, 18) : color(Bout[j] * 36, 50, 55), j);
    if (hl.a >= 0 && hl.b >= 0) { stroke(140, 80, 100); strokeWeight(2); line(L + hl.a * w + w / 2, 204, L + hl.b * w + w / 2, 400); }
  } else {
    let w = W / max(1, A.length);
    fill(0, 0, 80); noStroke(); textAlign(LEFT, BASELINE); textSize(15);
    text('A（いまの並び）', L, 150);
    for (let j = 0; j < A.length; j++) {
      let s = String(A[j]);
      noStroke(); fill(j === hl.a ? color(45, 90, 90) : color(200, 30, 35)); rect(L + j * w + 2, 160, w - 4, 44, 6);
      textAlign(CENTER, CENTER); textSize(min(18, w * 0.32));
      for (let q = 0; q < 3; q++) { fill(2 - q === digitPos && !done ? color(45, 90, 100) : color(0, 0, 95)); text(s[q], L + j * w + w / 2 + (q - 1) * w * 0.22, 182); }
    }
    text('', L, 260);
    let bw = W / 10;
    for (let d = 0; d < 10; d++) {
      noStroke(); fill(d === hl.c ? color(330, 60, 50) : color(200, 20, 20)); rect(L + d * bw + 4, 250, bw - 8, height - 400, 8);
      fill(0, 0, 80); textAlign(CENTER, TOP); textSize(16); text(d, L + d * bw + bw / 2, 256);
      if (buckets[d]) for (let i = 0; i < buckets[d].length; i++) { fill(0, 0, 95); textSize(15); text(buckets[d][i], L + d * bw + bw / 2, 286 + i * 22); }
    }
  }
  noStroke(); fill(0, 0, 100); textAlign(LEFT, BASELINE); textSize(22);
  text((algo === 1 ? '計数ソート Θ(n + k)' : '基数ソート Θ(d(n + 10))') + '　' + phase + '　操作 ' + ops + ' 回', 20, 40);
  fill(0, 0, 65); textSize(15);
  text('スペース：' + (playing ? '停止' : '再生') + '　→：1手　1 計数ソート　2 基数ソート　R：新しい数列　↑↓ 速さ ' + speed, 20, 68);
  text(algo === 1 ? '同じ値どうしは元の順番を保つ（安定）。だから基数ソートの部品に使える' : '下の位から並べるのがポイント。上の位から並べると、前の結果が崩れてしまう', 20, 92);
}

function keyPressed() {
  if (key === ' ') playing = !playing;
  if (key === RIGHT_ARROW) { playing = false; advance(); }
  if (key === '1' || key === '2') { algo = int(key); reset(); }
  if (key === 'r' || key === 'R') reset();
  if (key === UP_ARROW) speed = min(120, speed * 2);
  if (key === DOWN_ARROW) speed = max(1, speed / 2);
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. k を 99 にすると表 C が大きくなる。k が n よりずっと大きいと計数ソートは得か？
// 2. ③ を「左から」にすると安定でなくなる。同じ値に色をつけて確かめよう
// 3. 基数ソートを上の位（100 の位）から始めると、どうなる？
