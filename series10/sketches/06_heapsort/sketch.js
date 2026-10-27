// ============================================
// 06 ヒープとヒープソート
// 配列を「上のほうが大きい」木（最大ヒープ）として見る。i の子は 2i+1 と 2i+2（0 始まり）
// ① BUILD-MAX-HEAP：下の親から順に MAX-HEAPIFY（大きい子と入れかえて沈める）→ Θ(n)
// ② 根（最大）を末尾と交換して、ヒープを 1 つ小さくして MAX-HEAPIFY、をくり返す → Θ(n log n)
// スペース：再生／停止　→：1 手　R：新しい数列　1：ランダム　2：整列済み　3：逆順　↑↓ 速さ
// ============================================

let n = 15;              // ★ 要素数（15 = 4 段のきれいな木）
let speed = 3;
let a = [], gen, playing = true, acc = 0, done = false;
let heapSize = 0, phase = '', hl = [], swapPair = [], comparisons = 0, swaps = 0, mode = 1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  reset(1);
}

function reset(m) {
  mode = m;
  a = [];
  for (let i = 0; i < n; i++) a.push(floor(random(1, 100)));
  if (mode === 2) a.sort((x, y) => x - y);
  if (mode === 3) a.sort((x, y) => y - x);
  heapSize = a.length; comparisons = 0; swaps = 0; done = false; hl = []; swapPair = [];
  gen = heapSort();
}

function* maxHeapify(i) {
  while (true) {
    let l = 2 * i + 1, r = 2 * i + 2, largest = i;
    hl = [i, l, r].filter(k => k < heapSize);
    if (l < heapSize) { comparisons++; if (a[l] > a[largest]) largest = l; }
    if (r < heapSize) { comparisons++; if (a[r] > a[largest]) largest = r; }
    yield;
    if (largest === i) return;
    [a[i], a[largest]] = [a[largest], a[i]]; swaps++;
    swapPair = [i, largest];
    yield;
    swapPair = [];
    i = largest;
  }
}

function* heapSort() {
  phase = '① BUILD-MAX-HEAP';
  for (let i = floor(a.length / 2) - 1; i >= 0; i--) yield* maxHeapify(i);
  phase = '② 根を取り出して並べる';
  for (let end = a.length - 1; end > 0; end--) {
    [a[0], a[end]] = [a[end], a[0]]; swaps++;
    swapPair = [0, end]; hl = [];
    yield;
    swapPair = [];
    heapSize--;
    yield* maxHeapify(0);
  }
  heapSize = 0; hl = []; phase = '完成！'; done = true;
}

function advance() { if (!done) gen.next(); }

function nodePos(i) {
  let depth = floor(Math.log2(i + 1));
  let idx = i - (Math.pow(2, depth) - 1);
  let cnt = Math.pow(2, depth);
  let W = width - 120;
  return { x: 60 + W * (idx + 0.5) / cnt, y: 150 + depth * min(90, (height * 0.55 - 150) / 4) };
}

function draw() {
  background(20, 30, 10);
  if (playing && !done) { acc += speed / 60; while (acc >= 1) { advance(); acc--; } }
  // 木
  for (let i = 1; i < a.length; i++) {
    let p = nodePos(floor((i - 1) / 2)), c = nodePos(i);
    stroke(0, 0, i < heapSize ? 45 : 18); strokeWeight(2);
    line(p.x, p.y, c.x, c.y);
  }
  let r = min(44, (width - 120) / 9);
  for (let i = 0; i < a.length; i++) {
    let p = nodePos(i);
    let inHeap = i < heapSize;
    noStroke();
    fill(inHeap ? color(20 + a[i] * 0.4, 70, 40 + a[i] * 0.6) : color(150, 50, 30));
    if (hl.includes(i)) fill(45, 90, 100);
    if (swapPair.includes(i)) fill(330, 80, 100);
    circle(p.x, p.y, r);
    fill(inHeap || done ? 0 : 60, 0, inHeap ? 10 : 70); textAlign(CENTER, CENTER); textSize(r * 0.38);
    text(a[i], p.x, p.y);
  }
  // 配列
  let bw = (width - 120) / max(1, a.length), by = height - 110;
  for (let i = 0; i < a.length; i++) {
    let inHeap = i < heapSize;
    noStroke();
    fill(inHeap ? color(20, 50, 45) : color(150, 60, 70));
    if (hl.includes(i)) fill(45, 90, 100);
    if (swapPair.includes(i)) fill(330, 80, 100);
    rect(60 + i * bw + 2, by, bw - 4, 46, 6);
    fill(0, 0, 100); textSize(16); text(a[i], 60 + i * bw + bw / 2, by + 23);
    fill(0, 0, 50); textSize(11); text(i, 60 + i * bw + bw / 2, by + 60);
  }
  noStroke(); fill(0, 0, 70); textAlign(LEFT, BASELINE); textSize(13);
  text('配列（左から heapSize 個がヒープ、右の緑は並べ終わった部分）', 60, by - 10);

  fill(0, 0, 100); textSize(22);
  text('ヒープソート　' + phase + '　比較 ' + comparisons + '　交換 ' + swaps, 20, 40);
  fill(0, 0, 65); textSize(15);
  text('スペース：' + (playing ? '停止' : '再生') + '　→：1手　R：やり直し　1 ランダム　2 整列済み　3 逆順　↑↓ 速さ ' + speed, 20, 68);
  text('黄色 = 親と子を比べている　ピンク = 入れかえ。親 ≥ 子（ヒープ性質）が崩れたところだけ直す', 20, 92);
}

function keyPressed() {
  if (key === ' ') playing = !playing;
  if (key === RIGHT_ARROW) { playing = false; advance(); }
  if (key === 'r' || key === 'R') reset(mode);
  if (key >= '1' && key <= '3') reset(int(key));
  if (key === UP_ARROW) speed = min(120, speed * 2);
  if (key === DOWN_ARROW) speed = max(1, speed / 2);
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. ① の BUILD-MAX-HEAP の交換回数は n に比例する（n log n ではない）。n = 15, 31 で確かめよう
// 2. 不等号を逆にすると「最小ヒープ」になり、降順に並ぶ
// 3. 整列済みの入力でもヒープソートは速くならない。挿入ソートとの違いは？
