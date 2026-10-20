// ============================================
// 08 移動平均フィルタ（ノイズを取る）
// ノイズだらけの信号を「近くの何点かの平均」に置きかえると、なめらかになる
// でも窓を大きくしすぎると、本当の変化まで消えて、遅れが出る
// マウス左右 = 窓の大きさ / 上下 = ノイズの強さ / クリックで信号を作り直す
// ============================================

let N = 400;
let clean = [], noisy = [];
let windowSize = 5;
let noiseAmp = 0.3;
let seed = 1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  makeSignal();
}

function makeSignal() {
  randomSeed(seed);
  clean = [];
  for (let i = 0; i < N; i++) {
    let t = i / N;
    // 本当の信号：ゆっくりした波 ＋ 途中で段差
    clean.push(0.5 * sin(TWO_PI * 2 * t) + (t > 0.6 && t < 0.75 ? 0.6 : 0));
  }
}

function draw() {
  background(220, 40, 10);
  windowSize = floor(map(mouseX, 0, width, 1, 60, true));
  noiseAmp = map(mouseY, 0, height, 0.8, 0, true);

  randomSeed(seed + 99);
  noisy = clean.map((v) => v + random(-noiseAmp, noiseAmp));

  // ★ 移動平均：各点を「前後 windowSize 個の平均」に置きかえる
  let filtered = [];
  for (let i = 0; i < N; i++) {
    let sum = 0, cnt = 0;
    for (let k = i - windowSize + 1; k <= i; k++) {
      if (k >= 0) {
        sum += noisy[k];
        cnt++;
      }
    }
    filtered.push(sum / cnt);
  }

  let left = 60, right = width - 60;
  drawSeries(noisy, left, right, height * 0.3, height * 0.18, 0, 0, 70, 1, 'ノイズつき信号');
  drawSeries(clean, left, right, height * 0.3, height * 0.18, 120, 70, 100, 2, '');
  drawSeries(filtered, left, right, height * 0.72, height * 0.18, 40, 90, 100, 3, '移動平均のあと');
  drawSeries(clean, left, right, height * 0.72, height * 0.18, 120, 70, 100, 1, '');

  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text('窓の大きさ ' + windowSize + ' 点（マウス左右）　ノイズ ' + nf(noiseAmp, 1, 2) + '（上下）　緑 = 本当の信号　クリックで作り直す', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('窓が大きい → ノイズは減るが、段差がなまって遅れる（トレードオフ）', 20, 68);
}

function drawSeries(arr, left, right, mid, h, hue, sat, bri, w, label) {
  noFill();
  stroke(hue, sat, bri, label ? 100 : 60);
  strokeWeight(w);
  beginShape();
  for (let i = 0; i < arr.length; i++) vertex(map(i, 0, arr.length - 1, left, right), mid - arr[i] * h);
  endShape();
  if (label) {
    noStroke();
    fill(hue, sat, bri);
    textSize(14);
    text(label, left, mid - h - 14);
  }
}

function mousePressed() {
  seed = floor(random(10000));
  makeSignal();
}

// ---------- やってみよう ----------
// 1. 窓 1（何もしない）→ 5 → 20 → 60 と変えて、ノイズと遅れのバランスを見る
// 2. 平均の代わりに「中央値」にすると、段差が残りやすい（メディアンフィルタ）
// 3. 窓の中で「真ん中ほど重く」平均する（重みつき）と、どう変わる？
