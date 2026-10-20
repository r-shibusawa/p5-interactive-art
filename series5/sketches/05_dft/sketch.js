// ============================================
// 05 フーリエ変換（波を周波数に分解する）
// 2つの正弦波を混ぜた信号を、フーリエ変換で「どの周波数がどれだけ」に分解する
// 01 の逆：足した波から、材料をとり出す
// マウス左右 = 2つ目の波の周波数 / 上下 = その大きさ / N キーでノイズを足す
// ============================================

let N = 256; // 信号の点の数
let signal = [];
let f1 = 5, f2 = 20, a2 = 0.5;
let noiseOn = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(220, 40, 10);
  f2 = floor(map(mouseX, 0, width, 1, 60, true));
  a2 = map(mouseY, 0, height, 1, 0, true);

  // ---- 信号をつくる ----
  signal = [];
  for (let i = 0; i < N; i++) {
    let t = i / N;
    let v = sin(TWO_PI * f1 * t) + a2 * sin(TWO_PI * f2 * t);
    if (noiseOn) v += random(-0.8, 0.8);
    signal.push(v);
  }

  // ---- フーリエ変換（DFT）----
  let spectrum = dft(signal);

  // ---- 上：信号 ----
  let left = 60, right = width - 60;
  let mid = height * 0.27, h = height * 0.17;
  stroke(0, 0, 30);
  line(left, mid, right, mid);
  noFill();
  stroke(170, 80, 100);
  strokeWeight(2);
  beginShape();
  for (let i = 0; i < N; i++) vertex(map(i, 0, N - 1, left, right), mid - (signal[i] / 2.5) * h);
  endShape();
  noStroke();
  fill(0, 0, 60);
  textSize(14);
  text('信号（時間）', left, mid - h - 10);

  // ---- 下：スペクトル（周波数ごとの大きさ）----
  let base = height - 80, sh = height * 0.3;
  stroke(0, 0, 30);
  line(left, base, right, base);
  noStroke();
  for (let k = 0; k < 64; k++) {
    let x = map(k, 0, 64, left, right);
    let mag = spectrum[k];
    fill(k === f1 || k === f2 ? 40 : 170, 80, 100);
    rect(x, base - mag * sh, (right - left) / 64 - 2, mag * sh);
  }
  fill(0, 0, 60);
  text('スペクトル（周波数 0〜63）', left, base - sh - 10);
  for (let k = 0; k < 64; k += 10) text(k, map(k, 0, 64, left, right), base + 20);

  fill(0, 0, 100);
  textSize(18);
  text('信号 = sin(' + f1 + 'Hz) + ' + nf(a2, 1, 2) + ' × sin(' + f2 + 'Hz)　（マウスで 2つ目を変更）　N：ノイズ ' + (noiseOn ? 'ON' : 'OFF'), 20, 40);
}

// ★ 離散フーリエ変換：周波数 k の成分の大きさを、全部の k について求める
function dft(x) {
  let out = [];
  let n = x.length;
  for (let k = 0; k < n / 2; k++) {
    let re = 0, im = 0;
    for (let i = 0; i < n; i++) {
      // 周波数 k の正弦波・余弦波と、どれだけ「似ているか」を足し合わせる
      let ang = (TWO_PI * k * i) / n;
      re += x[i] * cos(ang);
      im -= x[i] * sin(ang);
    }
    out.push((2 * sqrt(re * re + im * im)) / n); // 大きさ（0〜1 くらい）
  }
  return out;
}

function keyPressed() {
  if (key === 'n' || key === 'N') noiseOn = !noiseOn;
}

// ---------- やってみよう ----------
// 1. マウスを動かして、スペクトルの山が 2つ目の周波数についてくるのを確認
// 2. N でノイズを足しても、山ははっきり見える（ノイズは全周波数に薄く広がる）
// 3. 信号を 3つの波の和にして、山が 3つ出るか確かめよう
