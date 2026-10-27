// ============================================
// 13 ソートを聞く（自由制作のベース）
// 比べた・動かした数を「音の高さ」にすると、アルゴリズムごとにちがう音楽になる
// 挿入ソートはなめらかに上がり、マージソートは小さな山がつながり、ヒープソートは上下に跳ねる
// 6 番の mySort に自分のソートを書いて、見た目と音を作ろう
// クリック：音を出す（最初に 1 回）　1〜6：ソートを選ぶ　スペース：再生／停止　R：混ぜる
// C：棒 ↔ 円の表示　S：音階（なめらか ↔ ペンタトニック）　↑↓ 速さ
// ============================================

let n = 64;              // ★ 要素数
let speed = 12;          // ★ 1 フレームあたりの手数（速いと音が重なる）
let a = [], gen, algo = 1, playing = false, done = false, circleView = false, penta = true;
let mark = [], counter = 0;
let names = ['', '挿入ソート', 'マージソート', 'ヒープソート', 'クイックソート', '基数ソート（2 進数）', 'mySort（自分で書く）'];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  shuffleAll();
}

function shuffleAll() {
  a = []; for (let i = 1; i <= n; i++) a.push(i);
  a = shuffle(a);
  restart();
}

function restart() {
  done = false; counter = 0; mark = [];
  let G = [null, insertion, mergeSort, heapSort, quick, radix, mySort][algo];
  gen = G();
}

// どのソートも、見る・動かすたびに yield [添字…] で知らせる → 音と光になる
function* insertion() {
  for (let j = 1; j < a.length; j++) {
    let i = j;
    while (i > 0 && a[i - 1] > a[i]) { [a[i - 1], a[i]] = [a[i], a[i - 1]]; i--; yield [i]; }
  }
}
function* mergeSort(lo = 0, hi = a.length - 1) {
  if (lo >= hi) return;
  let mid = floor((lo + hi) / 2);
  yield* mergeSort(lo, mid); yield* mergeSort(mid + 1, hi);
  let L = a.slice(lo, mid + 1), R = a.slice(mid + 1, hi + 1), i = 0, j = 0, k = lo;
  while (i < L.length || j < R.length) {
    a[k] = j >= R.length || (i < L.length && L[i] <= R[j]) ? L[i++] : R[j++];
    yield [k++];
  }
}
function* heapSort() {
  let size = a.length;
  function* sift(i) {
    while (true) {
      let l = 2 * i + 1, r = l + 1, m = i;
      if (l < size && a[l] > a[m]) m = l;
      if (r < size && a[r] > a[m]) m = r;
      if (m === i) return;
      [a[i], a[m]] = [a[m], a[i]]; yield [m]; i = m;
    }
  }
  for (let i = floor(size / 2) - 1; i >= 0; i--) yield* sift(i);
  while (size > 1) { size--; [a[0], a[size]] = [a[size], a[0]]; yield [size]; yield* sift(0); }
}
function* quick(lo = 0, hi = a.length - 1) {
  if (lo >= hi) return;
  let x = a[hi], i = lo - 1;
  for (let j = lo; j < hi; j++) if (a[j] <= x) { i++; [a[i], a[j]] = [a[j], a[i]]; yield [i, j]; }
  [a[i + 1], a[hi]] = [a[hi], a[i + 1]]; yield [i + 1];
  yield* quick(lo, i); yield* quick(i + 2, hi);
}
function* radix() {
  for (let bit = 0; (1 << bit) <= n; bit++) {
    let zeros = a.filter(v => !((v >> bit) & 1)), ones = a.filter(v => (v >> bit) & 1), b = zeros.concat(ones);
    for (let k = 0; k < a.length; k++) { a[k] = b[k]; yield [k]; }
  }
}
// ★ ここに自分のソートを書いてみよう（いまは「バブルソート」：となり同士を比べて入れかえる）
function* mySort() {
  for (let end = a.length - 1; end > 0; end--) {
    for (let i = 0; i < end; i++) {
      if (a[i] > a[i + 1]) { [a[i], a[i + 1]] = [a[i + 1], a[i]]; yield [i + 1]; }
    }
  }
}

let scale = [0, 2, 4, 7, 9];
function freqOf(v) {
  if (!penta) return 180 + v / n * 900;
  let step = floor(v / n * 20), oct = floor(step / 5);
  return 220 * Math.pow(2, (oct * 12 + scale[step % 5]) / 12);
}

function draw() {
  background(250, 30, 8, 100);
  if (playing && !done) {
    let played = 0;
    for (let s = 0; s < speed; s++) {
      let r = gen.next();
      if (r.done) { done = true; playing = false; finale(); break; }
      counter++;
      mark = r.value || [];
      if (played < 1 && mark.length) { playNote(freqOf(a[mark[0]]), 0.12, 0.09, 'triangle'); played++; }
    }
  }
  let N = a.length;
  if (circleView) {
    let R = min(width, height) * 0.36, cx = width / 2, cy = height / 2 + 40;
    for (let k = 0; k < N; k++) {
      let ang = TWO_PI * k / N - HALF_PI, r = R * (0.25 + 0.75 * a[k] / n);
      stroke(a[k] / n * 330, 70, mark.includes(k) ? 100 : 85); strokeWeight(mark.includes(k) ? 6 : 3);
      line(cx, cy, cx + cos(ang) * r, cy + sin(ang) * r);
    }
  } else {
    let w = (width - 80) / max(1, N), H = height - 200;
    for (let k = 0; k < N; k++) {
      noStroke(); fill(a[k] / n * 330, mark.includes(k) ? 20 : 70, mark.includes(k) ? 100 : 90);
      rect(40 + k * w, height - 40 - a[k] / n * H, w - 1, a[k] / n * H, 2);
    }
  }
  noStroke(); fill(0, 0, 100); textAlign(LEFT, BASELINE); textSize(22);
  text('ソートを聞く　' + names[algo] + '　' + counter + ' 手' + (done ? '　完成！' : ''), 20, 40);
  fill(0, 0, 65); textSize(15);
  text('クリック：音 ON　1〜6 ソート　スペース：' + (playing ? '停止' : '再生') + '　R：混ぜる　C：表示（' + (circleView ? '円' : '棒') + '）　S：音階（' + (penta ? 'ペンタトニック' : 'なめらか') + '）　↑↓ 速さ ' + speed, 20, 68);
}

function finale() {   // 完成したら下から上へ駆け上がる
  if (!audioCtx) return;
  for (let k = 0; k < a.length; k += 2) playNote(freqOf(a[k]), 0.08, 0.12, 'sine', audioCtx.currentTime + k * 0.012);
}

function mousePressed() { startAudio(); if (!playing && !done) playing = true; }
function keyPressed() {
  startAudio();
  if (key === ' ') { if (done) shuffleAll(); playing = !playing; }
  if (key >= '1' && key <= '6') { algo = int(key); shuffleAll(); playing = true; }
  if (key === 'r' || key === 'R') { shuffleAll(); }
  if (key === 'c' || key === 'C') circleView = !circleView;
  if (key === 's' || key === 'S') penta = !penta;
  if (key === UP_ARROW) speed = min(200, speed * 2);
  if (key === DOWN_ARROW) speed = max(1, floor(speed / 2));
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. mySort を「選択ソート」（残りの最小を探して先頭と交換）に書きかえる
// 2. 音色 'triangle' を 'square' や 'sawtooth' に。比べたときにも音を出すには？
// 3. 円の表示で、色が虹のように並んだら完成。自分だけの「完成の演出」を作ろう


// ==================================================
// ここから下は「音を鳴らすための道具」です
// ==================================================
let audioCtx, masterOut;
function startAudio() {
  if (!audioCtx) { audioCtx = new AudioContext(); masterOut = audioCtx.createDynamicsCompressor(); masterOut.connect(audioCtx.destination); }
  audioCtx.resume();
}
function playNote(freqHz, volume = 0.3, duration = 0.3, type = 'triangle', when) {
  if (!audioCtx) return;
  let t = when === undefined ? audioCtx.currentTime : when;
  let osc = audioCtx.createOscillator(), amp = audioCtx.createGain();
  osc.type = type; osc.frequency.value = freqHz;
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(volume, t + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(amp); amp.connect(masterOut); osc.start(t); osc.stop(t + duration + 0.05);
}
