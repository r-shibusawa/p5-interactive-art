// ============================================
// 08 クイックソート
// 基準（ピボット）を 1 つ選び、それより小さいものを左、大きいものを右に分ける（PARTITION）
// 左右をそれぞれ同じように並べれば完成。平均 Θ(n log n)、しかも実際にとても速い
// でも、整列済みの入力で毎回端をピボットにすると Θ(n²)。ランダムに選べば防げる
// スペース：再生／停止　→：1 手　1：ロムート分割　2：ホーア分割　3：ランダム化
// 4：ランダム入力　5：整列済み入力　6：同じ値だらけ　R：やり直し　↑↓ 速さ
// ============================================

let n = 40;              // ★ 要素数
let speed = 8;
let a = [], gen, method = 1, input = 4, playing = true, acc = 0, done = false;
let comparisons = 0, swaps = 0, maxDepth = 0;
let hl = { lo: -1, hi: -1, p: -1, i: -1, j: -1 }, fixedPos = new Set(), stack = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  reset();
}

function reset() {
  a = [];
  for (let i = 0; i < n; i++) a.push(input === 6 ? 50 + floor(random(3)) : floor(random(5, 100)));
  if (input === 5) a.sort((x, y) => x - y);
  comparisons = 0; swaps = 0; maxDepth = 0; done = false; fixedPos = new Set(); stack = [];
  hl = { lo: -1, hi: -1, p: -1, i: -1, j: -1 };
  gen = quick(0, a.length - 1, 0);
}

function swap(i, j) { if (i !== j) { [a[i], a[j]] = [a[j], a[i]]; swaps++; } }

// ロムートの分割：最後の要素をピボットに、小さいものを左へ集める
function* lomuto(lo, hi) {
  if (method === 3) { swap(floor(random(lo, hi + 1)), hi); }   // ランダムに選んだピボットを末尾へ
  let x = a[hi], i = lo - 1;
  for (let j = lo; j < hi; j++) {
    comparisons++;
    hl = { lo, hi, p: hi, i, j }; yield;
    if (a[j] <= x) { i++; swap(i, j); }
  }
  swap(i + 1, hi);
  hl = { lo, hi, p: i + 1, i: -1, j: -1 }; yield;
  return i + 1;
}

// ホーアの分割：両端から近づいて、まちがった側にあるもの同士を交換
function* hoare(lo, hi) {
  let x = a[lo], i = lo - 1, j = hi + 1;
  while (true) {
    do { j--; comparisons++; hl = { lo, hi, p: -1, i, j, pv: x }; yield; } while (a[j] > x);
    do { i++; comparisons++; hl = { lo, hi, p: -1, i, j, pv: x }; yield; } while (a[i] < x);
    if (i < j) swap(i, j); else return j;
  }
}

function* quick(lo, hi, depth) {
  maxDepth = max(maxDepth, depth);
  if (lo > hi) return;
  if (lo === hi) { fixedPos.add(lo); return; }
  stack.push([lo, hi]);
  if (method === 2) {
    let q = yield* hoare(lo, hi);
    yield* quick(lo, q, depth + 1);
    yield* quick(q + 1, hi, depth + 1);
  } else {
    let q = yield* lomuto(lo, hi);
    fixedPos.add(q);                 // ピボットはもう最終位置
    yield* quick(lo, q - 1, depth + 1);
    yield* quick(q + 1, hi, depth + 1);
  }
  stack.pop();
  if (depth === 0) { done = true; hl = { lo: -1, hi: -1, p: -1, i: -1, j: -1 }; }
}

function advance() { if (!done) { let r = gen.next(); if (r.done) done = true; } }

function draw() {
  background(340, 30, 10);
  if (playing && !done) { acc += speed / 60; while (acc >= 1) { advance(); acc--; } }
  let w = (width - 120) / max(1, a.length), baseY = height - 150, H = height - 330;
  if (hl.lo >= 0) { noStroke(); fill(0, 0, 100, 6); rect(60 + hl.lo * w, baseY - H - 10, (hl.hi - hl.lo + 1) * w, H + 10); }
  for (let k = 0; k < a.length; k++) {
    let h = a[k] * H / 100, c;
    if (done || fixedPos.has(k)) c = color(150, 60, 80);
    else if (k >= hl.lo && k <= hl.hi) {
      if (method !== 2 && hl.i >= 0 && k >= hl.lo && k <= hl.i) c = color(200, 60, 85);       // ピボット以下
      else if (method !== 2 && hl.j >= 0 && k > hl.i && k < hl.j) c = color(20, 60, 85);    // ピボットより大
      else c = color(0, 0, 60);
    } else c = color(0, 0, 30);
    if (!done && k === hl.j) c = color(45, 90, 100);
    if (!done && method === 2 && k === hl.i) c = color(45, 90, 100);
    if (!done && k === hl.p) c = color(330, 80, 100);
    noStroke(); fill(c); rect(60 + k * w + 1, baseY - h, w - 2, h, 2);
  }
  if (method === 2 && hl.pv !== undefined && !done) { stroke(330, 80, 100); strokeWeight(1.5); let y = baseY - hl.pv * H / 100; line(60 + hl.lo * w, y, 60 + (hl.hi + 1) * w, y); }
  // 再帰の深さ
  noStroke(); fill(0, 0, 70); textSize(13); textAlign(LEFT, TOP);
  text('再帰の深さ（最大 ' + maxDepth + '、log₂n ≈ ' + round(Math.log2(max(2, n))) + '）', 60, baseY + 16);
  for (let d = 0; d < stack.length; d++) {
    let [lo, hi] = stack[d];
    fill(200 + d * 8, 50, 80); rect(60 + lo * w, baseY + 38 + d * 5, (hi - lo + 1) * w, 4);
  }

  let names = ['', 'ロムート分割（最後をピボット）', 'ホーア分割（最初をピボット）', 'ランダム化（ランダムにピボット）'];
  let ins = { 4: 'ランダム', 5: '整列済み', 6: '同じ値だらけ' };
  fill(0, 0, 100); textSize(22); textAlign(LEFT, BASELINE);
  text('クイックソート　' + names[method] + '　入力：' + ins[input] + '　比較 ' + comparisons + '　交換 ' + swaps + (done ? '　完成！' : ''), 20, 40);
  fill(0, 0, 65); textSize(15);
  text('スペース：' + (playing ? '停止' : '再生') + '　→：1手　1〜3 分割方法　4〜6 入力　R：やり直し　↑↓ 速さ ' + speed, 20, 68);
  text('ピンク = ピボット　青 = ピボット以下　オレンジ = ピボットより大　黄色 = 調べている　緑 = 位置が決まった', 20, 92);
  text('比べてみよう：n log₂n ≈ ' + round(n * Math.log2(n)) + '　n²/2 = ' + n * n / 2, 20, 116);
}

function keyPressed() {
  if (key === ' ') playing = !playing;
  if (key === RIGHT_ARROW) { playing = false; advance(); }
  if (key >= '1' && key <= '3') { method = int(key); reset(); }
  if (key >= '4' && key <= '6') { input = int(key); reset(); }
  if (key === 'r' || key === 'R') reset();
  if (key === UP_ARROW) speed = min(480, speed * 2);
  if (key === DOWN_ARROW) speed = max(1, speed / 2);
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. 整列済み（5）で、1（ロムート）と 3（ランダム化）の比較回数・再帰の深さを比べる
// 2. 同じ値だらけ（6）だとロムートは遅くなる。ホーア（2）はどう？
// 3. ピボットを「3 つの中央値」（最初・真ん中・最後）にしてみよう
