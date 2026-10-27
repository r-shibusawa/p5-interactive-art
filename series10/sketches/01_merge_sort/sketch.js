// ============================================
// 01 マージソート
// 半分に分けて、それぞれ並べて、2 つの並んだ山を「小さいほうから取る」で合わせる（分割統治）
// 下の段ほど細かく分かれる。段の数は log₂n、各段の仕事は n なので全体は n log n
// スペース：再生／一時停止　→：1 手　R：新しい数列　1：ランダム　2：逆順　3：ほぼ整列　↑↓ 速さ
// ============================================

let n = 32;            // ★ 並べる数（2 のべき乗だと木がきれい）
let speed = 6;
let a = [], gen, playing = true, acc = 0, done = false;
let comparisons = 0, writes = 0;
let cur = { lo: -1, hi: -1, mid: -1, i: -1, j: -1, k: -1 };
let ranges = [];       // 処理中の区間（再帰の深さつき）
let mode = 1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  reset(1);
}

function reset(m) {
  mode = m;
  a = [];
  for (let i = 0; i < n; i++) a.push(floor(random(5, 100)));
  if (mode === 2) a.sort((x, y) => y - x);
  if (mode === 3) { a.sort((x, y) => x - y); [a[3], a[n - 4]] = [a[n - 4], a[3]]; }
  comparisons = 0; writes = 0; done = false; ranges = [];
  cur = { lo: -1, hi: -1, mid: -1, i: -1, j: -1, k: -1 };
  gen = mergeSort(0, n - 1, 0);
}

function* mergeSort(lo, hi, depth) {
  if (lo >= hi) return;
  let mid = floor((lo + hi) / 2);
  ranges.push({ lo, hi, depth, state: 'split' });
  cur = { lo, hi, mid, i: -1, j: -1, k: -1 };
  yield;
  yield* mergeSort(lo, mid, depth + 1);
  yield* mergeSort(mid + 1, hi, depth + 1);
  yield* merge(lo, mid, hi);
  let r = ranges.find(r => r.lo === lo && r.hi === hi);
  if (r) r.state = 'merged';
  if (depth === 0) done = true;
}

// 合わせる処理。左の山 L と右の山 R の先頭を比べて小さいほうを戻す
function* merge(lo, mid, hi) {
  let L = a.slice(lo, mid + 1), R = a.slice(mid + 1, hi + 1);
  let i = 0, j = 0, k = lo;
  while (i < L.length && j < R.length) {
    comparisons++;
    cur = { lo, hi, mid, i: lo + i, j: mid + 1 + j, k };
    yield;
    if (L[i] <= R[j]) a[k++] = L[i++]; else a[k++] = R[j++];
    writes++;
  }
  while (i < L.length) { a[k++] = L[i++]; writes++; cur.k = k; yield; }
  while (j < R.length) { a[k++] = R[j++]; writes++; cur.k = k; yield; }
}

function advance() { if (!done) { let r = gen.next(); if (r.done) done = true; } }

function draw() {
  background(250, 30, 10);
  if (playing && !done) { acc += speed / 60; while (acc >= 1) { advance(); acc--; } }
  let w = (width - 120) / n;
  let top = 130, barH = height * 0.38;
  let baseY = top + barH;
  // 棒グラフ
  for (let k = 0; k < n; k++) {
    let h = a[k] * barH / 100;
    let inRange = k >= cur.lo && k <= cur.hi;
    let c = done ? color(150, 60, 85) : inRange ? color(200, 50, 80) : color(220, 15, 45);
    if (!done && (k === cur.i || k === cur.j)) c = color(45, 90, 100);
    if (!done && k === cur.k - 1) c = color(330, 70, 100);
    noStroke(); fill(c);
    rect(60 + k * w + 1, baseY - h, w - 2, h, 3);
  }
  // 分割の木（区間を深さごとに帯で描く）
  let levels = ceil(log(n) / log(2)) + 1;
  let ty = baseY + 40, lh = min(36, (height - ty - 30) / levels);
  for (let r of ranges) {
    let x1 = 60 + r.lo * w, x2 = 60 + (r.hi + 1) * w;
    let y = ty + r.depth * lh;
    fill(r.state === 'merged' ? color(150, 60, 70) : color(200, 40, 40));
    rect(x1 + 2, y, x2 - x1 - 4, lh - 6, 4);
  }
  for (let k = 0; k < n; k++) { // 最下段 = 1 個ずつ
    fill(150, 30, 40); rect(60 + k * w + 2, ty + (levels - 1) * lh, w - 4, lh - 6, 3);
  }
  fill(0, 0, 70); textSize(13); textAlign(RIGHT, TOP);
  for (let d = 0; d < levels; d++) text('深さ ' + d, 55, ty + d * lh + 4);

  textAlign(LEFT, BASELINE); fill(0, 0, 100); textSize(22);
  text('マージソート　比較 ' + comparisons + ' 回　書きこみ ' + writes + ' 回' + (done ? '　完成！' : ''), 20, 40);
  fill(0, 0, 65); textSize(15);
  text('スペース：' + (playing ? '一時停止' : '再生') + '　→：1手　R：やり直し　1 ランダム　2 逆順　3 ほぼ整列　↑↓ 速さ ' + speed, 20, 68);
  text('n log₂ n ≈ ' + round(n * log(n) / log(2)) + '　n²/2 = ' + n * n / 2 + '　（黄色 = 比べている 2 つ、ピンク = 書きこんだ場所）', 20, 92);
}

function keyPressed() {
  if (key === ' ') playing = !playing;
  if (key === RIGHT_ARROW) { playing = false; advance(); }
  if (key === 'r' || key === 'R') reset(mode);
  if (key >= '1' && key <= '3') reset(int(key));
  if (key === UP_ARROW) speed = min(240, speed * 2);
  if (key === DOWN_ARROW) speed = max(1, speed / 2);
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. 逆順（2）でも比較回数があまり変わらないことを確かめる（挿入ソートとの違い）
// 2. n を 64、128 にして、比較回数と n log₂ n を比べる
// 3. 区間が小さい（例：8 個以下）ときは挿入ソートに切りかえると速くなる。やってみよう
